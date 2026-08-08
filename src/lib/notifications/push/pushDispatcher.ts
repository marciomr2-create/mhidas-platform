// src/lib/notifications/push/pushDispatcher.ts
import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import * as webpush from "web-push";

const MAX_BATCH_SIZE = 25;
const DEFAULT_BATCH_SIZE = 10;
const PUSH_TIMEOUT_MS = 10_000;
const PUSH_TTL_SECONDS = 120;
const MAX_SAFE_ERROR_CODE = 120;

type PushJob = {
  job_id: string;
  notification_delivery_id: string;
  notification_id: string | null;
  recipient_user_id: string;
  attempt_number: number;
  max_attempts: number;
};

type PushSubscriptionRow = {
  push_subscription_id: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
  expiration_time: number | null;
  endpoint_fingerprint: string;
};

type DispatcherConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
};

type RpcErrorShape = {
  code?: string | null;
};

type RpcResult<T> = {
  data: T | null;
  error: RpcErrorShape | null;
};

type AdminSupabaseClient = ReturnType<typeof getAdminClient>;

type RpcClient = {
  rpc<T>(
    functionName: string,
    args?: Record<string, unknown>
  ): Promise<RpcResult<T>>;
};

function getRpcClient(client: AdminSupabaseClient): RpcClient {
  // V4.8.156 introduces RPCs that are not yet present in the project's
  // generated Supabase TypeScript schema. Keep the escape hatch isolated
  // at this boundary instead of weakening dispatcher types globally.
  return client as unknown as RpcClient;
}

async function callRpc<T>(
  client: AdminSupabaseClient,
  functionName: string,
  args?: Record<string, unknown>
): Promise<RpcResult<T>> {
  return getRpcClient(client).rpc<T>(functionName, args);
}

export type PushDispatchSummary = {
  ok: boolean;
  workerId: string;
  claimedJobs: number;
  processedJobs: number;
  deliveredJobs: number;
  retriedJobs: number;
  permanentlyFailedJobs: number;
  cancelledJobs: number;
  deliveredDevices: number;
  revokedSubscriptions: number;
  transientDeviceErrors: number;
  permanentDeviceErrors: number;
  errors: string[];
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function sanitizeCode(value: unknown, fallback: string): string {
  const normalized = normalizeText(value)
    .replace(/[^A-Za-z0-9_.:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_SAFE_ERROR_CODE);

  return normalized || fallback;
}

function getConfig(): DispatcherConfig {
  const supabaseUrl = normalizeText(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = normalizeText(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const vapidPublicKey = normalizeText(process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY);
  const vapidPrivateKey = normalizeText(process.env.VAPID_PRIVATE_KEY);
  const vapidSubject = normalizeText(process.env.VAPID_SUBJECT);

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!vapidPublicKey) missing.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  if (!vapidPrivateKey) missing.push("VAPID_PRIVATE_KEY");
  if (!vapidSubject) missing.push("VAPID_SUBJECT");

  if (missing.length > 0) {
    throw new Error(`missing_push_environment:${missing.join(",")}`);
  }

  if (!/^https:\/\//i.test(supabaseUrl)) {
    throw new Error("invalid_supabase_url");
  }

  if (!/^(mailto:|https:\/\/)/i.test(vapidSubject)) {
    throw new Error("invalid_vapid_subject");
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    vapidPublicKey,
    vapidPrivateKey,
    vapidSubject,
  };
}

function getAdminClient(config: DispatcherConfig) {
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function clampBatchSize(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_BATCH_SIZE;
  return Math.max(1, Math.min(MAX_BATCH_SIZE, Math.floor(parsed)));
}

function isSafePushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function endpointFingerprint(endpoint: string): string {
  return createHash("sha256").update(endpoint, "utf8").digest("hex");
}

function buildPayload(job: PushJob): string {
  return JSON.stringify({
    title: "USECLUBBERS",
    body: "Você tem uma nova notificação.",
    tag: `mhidas-${job.notification_delivery_id}`,
    data: {
      url: "/dashboard",
    },
  });
}

function buildTopic(job: PushJob): string {
  const compact = job.notification_delivery_id.replace(/[^A-Za-z0-9_-]/g, "");
  return compact.slice(-32) || "mhidas-notification";
}

function getHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const value = (error as { statusCode?: unknown }).statusCode;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 100 && parsed <= 599 ? parsed : null;
}

function getErrorClass(error: unknown): string {
  if (error instanceof Error) return sanitizeCode(error.name, "Error");
  return "UnknownError";
}

function classifyHttpStatus(status: number | null): "revoked" | "transient" | "permanent" {
  if (status === 404 || status === 410) return "revoked";
  if (status === 408 || status === 425 || status === 429) return "transient";
  if (status !== null && status >= 500) return "transient";
  return "permanent";
}

function calculateBackoffSeconds(attemptNumber: number): number {
  const exponent = Math.max(0, Math.min(5, attemptNumber - 1));
  return Math.min(1800, 30 * 2 ** exponent);
}

async function recordAttempt(params: {
  supabase: AdminSupabaseClient;
  job: PushJob;
  subscription: PushSubscriptionRow;
  result: "delivered" | "transient_error" | "permanent_error" | "subscription_revoked" | "skipped";
  httpStatus: number | null;
  providerCode: string | null;
  errorClass: string | null;
}) {
  const fingerprint = /^[a-f0-9]{64}$/i.test(params.subscription.endpoint_fingerprint)
    ? params.subscription.endpoint_fingerprint.toLowerCase()
    : endpointFingerprint(params.subscription.endpoint);

  const { error } = await callRpc<null>(params.supabase, "mhidas_record_notification_push_attempt", {
    p_push_job_id: params.job.job_id,
    p_push_subscription_id: params.subscription.push_subscription_id,
    p_attempt_number: params.job.attempt_number,
    p_result: params.result,
    p_http_status: params.httpStatus,
    p_provider_code: params.providerCode,
    p_error_class: params.errorClass,
    p_endpoint_fingerprint: fingerprint,
  });

  if (error) {
    throw new Error(`record_attempt_failed:${sanitizeCode(error.code, "rpc_error")}`);
  }
}

async function finishJob(params: {
  supabase: AdminSupabaseClient;
  jobId: string;
  outcome: "delivered" | "retry" | "failed_permanent" | "cancelled" | "expired";
  errorCode?: string | null;
  backoffSeconds?: number | null;
}) {
  const { error } = await callRpc<null>(params.supabase, "mhidas_finish_notification_push_job", {
    p_push_job_id: params.jobId,
    p_outcome: params.outcome,
    p_error_code: params.errorCode ? sanitizeCode(params.errorCode, "push_error") : null,
    p_backoff_seconds: params.backoffSeconds ?? null,
  });

  if (error) {
    throw new Error(`finish_job_failed:${sanitizeCode(error.code, "rpc_error")}`);
  }
}

async function processJob(params: {
  config: DispatcherConfig;
  supabase: AdminSupabaseClient;
  job: PushJob;
}) {
  const { config, supabase, job } = params;

  const { data, error } = await callRpc<PushSubscriptionRow[]>(
    supabase,
    "mhidas_get_active_notification_push_subscriptions",
    {
    p_recipient_user_id: job.recipient_user_id,
  });

  if (error) {
    throw new Error(`subscription_lookup_failed:${sanitizeCode(error.code, "rpc_error")}`);
  }

  const subscriptions = Array.isArray(data) ? (data as PushSubscriptionRow[]) : [];

  if (subscriptions.length === 0) {
    await finishJob({
      supabase,
      jobId: job.job_id,
      outcome: "cancelled",
      errorCode: "no_active_push_subscription",
    });

    return {
      outcome: "cancelled" as const,
      deliveredDevices: 0,
      revokedSubscriptions: 0,
      transientDeviceErrors: 0,
      permanentDeviceErrors: 0,
    };
  }

  const payload = buildPayload(job);
  let deliveredDevices = 0;
  let revokedSubscriptions = 0;
  let transientDeviceErrors = 0;
  let permanentDeviceErrors = 0;

  for (const subscription of subscriptions) {
    const endpoint = normalizeText(subscription.endpoint);
    const p256dh = normalizeText(subscription.p256dh);
    const auth = normalizeText(subscription.auth_secret);

    if (!subscription.push_subscription_id || !isSafePushEndpoint(endpoint) || !p256dh || !auth) {
      await recordAttempt({
        supabase,
        job,
        subscription,
        result: "skipped",
        httpStatus: null,
        providerCode: "invalid_subscription_shape",
        errorClass: "ValidationError",
      });
      permanentDeviceErrors += 1;
      continue;
    }

    try {
      const response = await webpush.sendNotification(
        {
          endpoint,
          keys: {
            p256dh,
            auth,
          },
        },
        payload,
        {
          TTL: PUSH_TTL_SECONDS,
          timeout: PUSH_TIMEOUT_MS,
          urgency: "normal",
          topic: buildTopic(job),
          vapidDetails: {
            subject: config.vapidSubject,
            publicKey: config.vapidPublicKey,
            privateKey: config.vapidPrivateKey,
          },
        }
      );

      await recordAttempt({
        supabase,
        job,
        subscription,
        result: "delivered",
        httpStatus: Number(response.statusCode) || 201,
        providerCode: "accepted_by_push_service",
        errorClass: null,
      });

      deliveredDevices += 1;
    } catch (error: unknown) {
      const status = getHttpStatus(error);
      const classification = classifyHttpStatus(status);
      const errorClass = getErrorClass(error);

      if (classification === "revoked") {
        const { error: revokeError } = await callRpc<null>(
          supabase,
          "mhidas_revoke_notification_push_subscription_by_id",
          { p_push_subscription_id: subscription.push_subscription_id }
        );

        if (revokeError) {
          throw new Error(`subscription_revoke_failed:${sanitizeCode(revokeError.code, "rpc_error")}`);
        }

        await recordAttempt({
          supabase,
          job,
          subscription,
          result: "subscription_revoked",
          httpStatus: status,
          providerCode: status === 404 ? "push_404" : "push_410",
          errorClass,
        });

        revokedSubscriptions += 1;
        continue;
      }

      if (classification === "transient") {
        await recordAttempt({
          supabase,
          job,
          subscription,
          result: "transient_error",
          httpStatus: status,
          providerCode: status ? `push_${status}` : "push_network_error",
          errorClass,
        });
        transientDeviceErrors += 1;
        continue;
      }

      await recordAttempt({
        supabase,
        job,
        subscription,
        result: "permanent_error",
        httpStatus: status,
        providerCode: status ? `push_${status}` : "push_permanent_error",
        errorClass,
      });
      permanentDeviceErrors += 1;
    }
  }

  if (deliveredDevices > 0) {
    await finishJob({
      supabase,
      jobId: job.job_id,
      outcome: "delivered",
    });

    return {
      outcome: "delivered" as const,
      deliveredDevices,
      revokedSubscriptions,
      transientDeviceErrors,
      permanentDeviceErrors,
    };
  }

  if (transientDeviceErrors > 0 && job.attempt_number < job.max_attempts) {
    await finishJob({
      supabase,
      jobId: job.job_id,
      outcome: "retry",
      errorCode: "transient_push_error",
      backoffSeconds: calculateBackoffSeconds(job.attempt_number),
    });

    return {
      outcome: "retry" as const,
      deliveredDevices,
      revokedSubscriptions,
      transientDeviceErrors,
      permanentDeviceErrors,
    };
  }

  await finishJob({
    supabase,
    jobId: job.job_id,
    outcome: "failed_permanent",
    errorCode:
      revokedSubscriptions > 0 && permanentDeviceErrors === 0
        ? "all_subscriptions_revoked"
        : "all_push_attempts_failed",
  });

  return {
    outcome: "failed_permanent" as const,
    deliveredDevices,
    revokedSubscriptions,
    transientDeviceErrors,
    permanentDeviceErrors,
  };
}

export async function dispatchPushBatch(input?: { batchSize?: number }): Promise<PushDispatchSummary> {
  const config = getConfig();
  const supabase = getAdminClient(config);
  const workerId = `push-${randomUUID()}`;
  const batchSize = clampBatchSize(input?.batchSize);

  const summary: PushDispatchSummary = {
    ok: true,
    workerId,
    claimedJobs: 0,
    processedJobs: 0,
    deliveredJobs: 0,
    retriedJobs: 0,
    permanentlyFailedJobs: 0,
    cancelledJobs: 0,
    deliveredDevices: 0,
    revokedSubscriptions: 0,
    transientDeviceErrors: 0,
    permanentDeviceErrors: 0,
    errors: [],
  };

  const { data, error } = await callRpc<PushJob[]>(
    supabase,
    "mhidas_claim_notification_push_jobs",
    {
    p_batch_size: batchSize,
    p_worker_id: workerId,
    p_lock_timeout_seconds: 300,
  });

  if (error) {
    throw new Error(`claim_push_jobs_failed:${sanitizeCode(error.code, "rpc_error")}`);
  }

  const jobs = Array.isArray(data) ? (data as PushJob[]) : [];
  summary.claimedJobs = jobs.length;

  for (const job of jobs) {
    try {
      const result = await processJob({ config, supabase, job });
      summary.processedJobs += 1;
      summary.deliveredDevices += result.deliveredDevices;
      summary.revokedSubscriptions += result.revokedSubscriptions;
      summary.transientDeviceErrors += result.transientDeviceErrors;
      summary.permanentDeviceErrors += result.permanentDeviceErrors;

      if (result.outcome === "delivered") summary.deliveredJobs += 1;
      if (result.outcome === "retry") summary.retriedJobs += 1;
      if (result.outcome === "failed_permanent") summary.permanentlyFailedJobs += 1;
      if (result.outcome === "cancelled") summary.cancelledJobs += 1;
    } catch (error: unknown) {
      summary.ok = false;
      summary.errors.push(
        error instanceof Error
          ? sanitizeCode(error.message, "push_job_processing_failed")
          : "push_job_processing_failed"
      );
    }
  }

  return summary;
}
