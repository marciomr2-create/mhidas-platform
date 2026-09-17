import "server-only";

import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { dispatchPushBatch } from "@/lib/notifications/push/pushDispatcher";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function secretsMatch(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

function isAuthorized(request: NextRequest): boolean {
  const configuredSecret = normalizeText(process.env.PUSH_DISPATCHER_SECRET);
  const receivedSecret = normalizeText(
    request.headers.get("x-mhidas-push-dispatcher-secret")
  );

  if (!configuredSecret || !receivedSecret) return false;
  return secretsMatch(receivedSecret, configuredSecret);
}

function configuredSupabaseProjectRef(): string | null {
  const configuredUrl = normalizeText(process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!configuredUrl) return null;

  try {
    const hostname = new URL(configuredUrl).hostname.toLowerCase();
    const suffix = ".supabase.co";

    if (!hostname.endsWith(suffix)) return null;

    const projectRef = hostname.slice(0, -suffix.length);

    if (!/^[a-z0-9]{8,64}$/.test(projectRef)) return null;

    return projectRef;
  } catch {
    return null;
  }
}

function expectedSupabaseProjectRef(request: NextRequest): string {
  return normalizeText(
    request.headers.get("x-mhidas-expected-supabase-project-ref")
  ).toLowerCase();
}

async function readBatchSize(request: NextRequest): Promise<number | undefined> {
  try {
    const body = (await request.json()) as { batchSize?: unknown };
    const parsed = Number(body?.batchSize);
    return Number.isFinite(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  if (!normalizeText(process.env.PUSH_DISPATCHER_SECRET)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "notification-push-dispatcher",
        code: "dispatcher_secret_not_configured",
        sensitiveValuesReturned: false,
      },
      { status: 503 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "notification-push-dispatcher",
        code: "unauthorized",
        sensitiveValuesReturned: false,
      },
      { status: 401 }
    );
  }

  const expectedProjectRef = expectedSupabaseProjectRef(request);

  if (expectedProjectRef) {
    if (!/^[a-z0-9]{8,64}$/.test(expectedProjectRef)) {
      return NextResponse.json(
        {
          ok: false,
          scope: "notification-push-dispatcher",
          code: "invalid_expected_project_ref",
          sensitiveValuesReturned: false,
        },
        { status: 400 }
      );
    }

    const configuredProjectRef = configuredSupabaseProjectRef();

    if (
      !configuredProjectRef ||
      configuredProjectRef !== expectedProjectRef
    ) {
      return NextResponse.json(
        {
          ok: false,
          scope: "notification-push-dispatcher",
          code: "dispatcher_environment_mismatch",
          sensitiveValuesReturned: false,
        },
        { status: 409 }
      );
    }
  }

  try {
    const batchSize = await readBatchSize(request);
    const result = await dispatchPushBatch({ batchSize });

    return NextResponse.json(
      {
        ok: result.ok,
        scope: "notification-push-dispatcher",
        claimedJobs: result.claimedJobs,
        processedJobs: result.processedJobs,
        deliveredJobs: result.deliveredJobs,
        retriedJobs: result.retriedJobs,
        permanentlyFailedJobs: result.permanentlyFailedJobs,
        cancelledJobs: result.cancelledJobs,
        deliveredDevices: result.deliveredDevices,
        revokedSubscriptions: result.revokedSubscriptions,
        transientDeviceErrors: result.transientDeviceErrors,
        permanentDeviceErrors: result.permanentDeviceErrors,
        errorCodes: result.errors,
        sensitiveValuesReturned: false,
      },
      { status: result.ok ? 200 : 207 }
    );
  } catch (error: unknown) {
    const code =
      error instanceof Error
        ? error.message.replace(/[^A-Za-z0-9_.:,-]+/g, "_").slice(0, 180)
        : "dispatcher_failed";

    return NextResponse.json(
      {
        ok: false,
        scope: "notification-push-dispatcher",
        code,
        sensitiveValuesReturned: false,
      },
      { status: 500 }
    );
  }
}