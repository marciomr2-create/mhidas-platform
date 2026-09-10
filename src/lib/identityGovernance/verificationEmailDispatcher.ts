// src/lib/identityGovernance/verificationEmailDispatcher.ts
import "server-only";

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const MAX_BATCH_SIZE = 25;
const DEFAULT_BATCH_SIZE = 10;
const EMAIL_TIMEOUT_MS = 10_000;
const MAX_SAFE_ERROR_CODE = 120;

type EmailJob = {
  email_id: string;
  request_id: string;
  recipient_user_id: string;
  recipient_email: string;
  template_key: string;
  idempotency_key: string;
  attempt_number: number;
  max_attempts: number;
};

type VerificationRequestContext = {
  request_id: string;
  requested_display_name: string;
  decision_reason: string | null;
  status: string;
};

type DispatcherConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  resendApiKey: string;
  fromEmail: string;
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

export type VerificationEmailDispatchSummary = {
  ok: boolean;
  workerId: string;
  claimedJobs: number;
  processedJobs: number;
  deliveredJobs: number;
  retriedJobs: number;
  permanentlyFailedJobs: number;
  cancelledJobs: number;
  errors: string[];
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function sanitizeCode(value: unknown, fallback: string): string {
  const normalized = normalizeText(value)
    .replace(/[^A-Za-z0-9_.:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_SAFE_ERROR_CODE)
    .toLowerCase();

  return normalized || fallback;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getConfig(): DispatcherConfig {
  const supabaseUrl = normalizeText(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = normalizeText(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const resendApiKey = normalizeText(process.env.RESEND_API_KEY);
  const fromEmail = normalizeText(process.env.VERIFICATION_EMAIL_FROM);

  const missing: string[] = [];

  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!resendApiKey) missing.push("RESEND_API_KEY");
  if (!fromEmail) missing.push("VERIFICATION_EMAIL_FROM");

  if (missing.length > 0) {
    throw new Error(`missing_verification_email_environment:${missing.join(",")}`);
  }

  if (!/^https:\/\//i.test(supabaseUrl)) {
    throw new Error("invalid_supabase_url");
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    resendApiKey,
    fromEmail,
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

function getRpcClient(client: AdminSupabaseClient): RpcClient {
  return client as unknown as RpcClient;
}

async function callRpc<T>(
  client: AdminSupabaseClient,
  functionName: string,
  args?: Record<string, unknown>
): Promise<RpcResult<T>> {
  return getRpcClient(client).rpc<T>(functionName, args);
}

function clampBatchSize(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return DEFAULT_BATCH_SIZE;
  return Math.max(1, Math.min(MAX_BATCH_SIZE, Math.floor(parsed)));
}

function calculateBackoffSeconds(attemptNumber: number): number {
  const exponent = Math.max(0, Math.min(6, attemptNumber - 1));
  return Math.min(3600, 30 * 2 ** exponent);
}

function templateFor(
  job: EmailJob,
  context: VerificationRequestContext
): { subject: string; text: string; html: string } | null {
  const identity = normalizeText(context.requested_display_name) || "sua identidade";
  const reason = normalizeText(context.decision_reason);

  const templates: Record<string, { subject: string; lead: string }> = {
    "entity_verification.submitted": {
      subject: "Recebemos sua solicitação de verificação",
      lead: `Recebemos a solicitação de verificação de ${identity}.`,
    },
    "entity_verification.more_info_required": {
      subject: "Precisamos de mais informações para sua verificação",
      lead: `Precisamos de mais informações para continuar a análise de ${identity}.`,
    },
    "entity_verification.approved": {
      subject: "Sua identidade foi aprovada no USECLUBBERS",
      lead: `A solicitação de verificação de ${identity} foi aprovada.`,
    },
    "entity_verification.rejected": {
      subject: "Atualização sobre sua solicitação de verificação",
      lead: `A solicitação de verificação de ${identity} não foi aprovada.`,
    },
    "entity_verification.suspended": {
      subject: "Atualização importante sobre sua identidade",
      lead: `A verificação de ${identity} foi suspensa.`,
    },
    "entity_verification.revoked": {
      subject: "Atualização importante sobre sua verificação",
      lead: `A verificação de ${identity} foi revogada.`,
    },
  };

  const selected = templates[job.template_key];

  if (!selected) return null;

  const reasonText =
    reason &&
    [
      "entity_verification.more_info_required",
      "entity_verification.rejected",
      "entity_verification.suspended",
      "entity_verification.revoked",
    ].includes(job.template_key)
      ? `\n\nMotivo / orientação: ${reason}`
      : "";

  const text =
    `${selected.lead}${reasonText}\n\n` +
    "Acesse sua Conta USECLUBBERS e abra a Central de Verificação para acompanhar o processo.\n\n" +
    "USECLUBBERS";

  const htmlReason = reasonText
    ? `<p><strong>Motivo / orientação:</strong> ${escapeHtml(reason)}</p>`
    : "";

  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">',
    `<h2>${escapeHtml(selected.subject)}</h2>`,
    `<p>${escapeHtml(selected.lead)}</p>`,
    htmlReason,
    "<p>Acesse sua Conta USECLUBBERS e abra a Central de Verificação para acompanhar o processo.</p>",
    "<p><strong>USECLUBBERS</strong></p>",
    "</div>",
  ].join("");

  return {
    subject: selected.subject,
    text,
    html,
  };
}

async function finishJob(params: {
  supabase: AdminSupabaseClient;
  job: EmailJob;
  workerId: string;
  outcome: "sent" | "retry" | "failed_permanent" | "cancelled";
  providerMessageId?: string | null;
  errorCode?: string | null;
  backoffSeconds?: number | null;
}) {
  const { error } = await callRpc<null>(
    params.supabase,
    "mhidas_finish_verification_email_job_v1",
    {
      p_email_id: params.job.email_id,
      p_worker_id: params.workerId,
      p_outcome: params.outcome,
      p_provider_message_id: params.providerMessageId ?? null,
      p_error_code: params.errorCode
        ? sanitizeCode(params.errorCode, "email_delivery_error")
        : null,
      p_backoff_seconds: params.backoffSeconds ?? null,
    }
  );

  if (error) {
    throw new Error(
      `finish_verification_email_job_failed:${sanitizeCode(
        error.code,
        "rpc_error"
      )}`
    );
  }
}

async function loadRequestContext(
  supabase: AdminSupabaseClient,
  requestId: string
): Promise<VerificationRequestContext | null> {
  const { data, error } = await supabase
    .from("entity_verification_requests")
    .select("request_id,requested_display_name,decision_reason,status")
    .eq("request_id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `verification_request_lookup_failed:${sanitizeCode(
        error.code,
        "database_error"
      )}`
    );
  }

  return data as VerificationRequestContext | null;
}

function classifyStatus(status: number): "delivered" | "transient" | "permanent" {
  if (status >= 200 && status <= 299) return "delivered";
  if (status === 408 || status === 425 || status === 429 || status >= 500) {
    return "transient";
  }
  return "permanent";
}

async function processJob(params: {
  config: DispatcherConfig;
  supabase: AdminSupabaseClient;
  job: EmailJob;
  workerId: string;
}) {
  const { config, supabase, job, workerId } = params;

  const context = await loadRequestContext(supabase, job.request_id);

  if (!context) {
    await finishJob({
      supabase,
      job,
      workerId,
      outcome: "cancelled",
      errorCode: "verification_request_not_found",
    });
    return "cancelled" as const;
  }

  const content = templateFor(job, context);

  if (!content) {
    await finishJob({
      supabase,
      job,
      workerId,
      outcome: "failed_permanent",
      errorCode: "unsupported_verification_email_template",
    });
    return "failed_permanent" as const;
  }

  let response: Response;

  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": job.idempotency_key,
      },
      body: JSON.stringify({
        from: config.fromEmail,
        to: [job.recipient_email],
        subject: content.subject,
        text: content.text,
        html: content.html,
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
    });
  } catch (error: unknown) {
    if (job.attempt_number < job.max_attempts) {
      await finishJob({
        supabase,
        job,
        workerId,
        outcome: "retry",
        errorCode:
          error instanceof Error
            ? sanitizeCode(error.name, "email_network_error")
            : "email_network_error",
        backoffSeconds: calculateBackoffSeconds(job.attempt_number),
      });
      return "retry" as const;
    }

    await finishJob({
      supabase,
      job,
      workerId,
      outcome: "failed_permanent",
      errorCode: "email_network_attempts_exhausted",
    });
    return "failed_permanent" as const;
  }

  const classification = classifyStatus(response.status);
  const payload = (await response.json().catch(() => null)) as
    | { id?: unknown; name?: unknown }
    | null;

  if (classification === "delivered") {
    const providerMessageId = normalizeText(payload?.id);

    await finishJob({
      supabase,
      job,
      workerId,
      outcome: "sent",
      providerMessageId: providerMessageId || null,
    });

    return "sent" as const;
  }

  const providerCode = sanitizeCode(
    payload?.name || `resend_http_${response.status}`,
    `resend_http_${response.status}`
  );

  if (
    classification === "transient" &&
    job.attempt_number < job.max_attempts
  ) {
    await finishJob({
      supabase,
      job,
      workerId,
      outcome: "retry",
      errorCode: providerCode,
      backoffSeconds: calculateBackoffSeconds(job.attempt_number),
    });

    return "retry" as const;
  }

  await finishJob({
    supabase,
    job,
    workerId,
    outcome: "failed_permanent",
    errorCode: providerCode,
  });

  return "failed_permanent" as const;
}

export async function dispatchVerificationEmailBatch(input?: {
  batchSize?: number;
}): Promise<VerificationEmailDispatchSummary> {
  const config = getConfig();
  const supabase = getAdminClient(config);
  const workerId = `verification-email-${randomUUID()}`;
  const batchSize = clampBatchSize(input?.batchSize);

  const summary: VerificationEmailDispatchSummary = {
    ok: true,
    workerId,
    claimedJobs: 0,
    processedJobs: 0,
    deliveredJobs: 0,
    retriedJobs: 0,
    permanentlyFailedJobs: 0,
    cancelledJobs: 0,
    errors: [],
  };

  const { data, error } = await callRpc<EmailJob[]>(
    supabase,
    "mhidas_claim_verification_email_jobs_v1",
    {
      p_batch_size: batchSize,
      p_worker_id: workerId,
      p_lock_timeout_seconds: 300,
    }
  );

  if (error) {
    throw new Error(
      `claim_verification_email_jobs_failed:${sanitizeCode(
        error.code,
        "rpc_error"
      )}`
    );
  }

  const jobs = Array.isArray(data) ? data : [];
  summary.claimedJobs = jobs.length;

  for (const job of jobs) {
    try {
      const outcome = await processJob({
        config,
        supabase,
        job,
        workerId,
      });

      summary.processedJobs += 1;

      if (outcome === "sent") summary.deliveredJobs += 1;
      if (outcome === "retry") summary.retriedJobs += 1;
      if (outcome === "failed_permanent") {
        summary.permanentlyFailedJobs += 1;
      }
      if (outcome === "cancelled") summary.cancelledJobs += 1;
    } catch (error: unknown) {
      summary.ok = false;
      summary.errors.push(
        error instanceof Error
          ? sanitizeCode(error.message, "verification_email_job_failed")
          : "verification_email_job_failed"
      );
    }
  }

  return summary;
}
