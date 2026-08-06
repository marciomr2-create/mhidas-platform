// src/app/api/notifications/push/route.ts
// MHIDAS / USECLUBBERS
// V4.8.155 - Authenticated Web Push subscription foundation.
// Scope: configuration, status, register/refresh and revoke. No push dispatch.

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie",
} as const;

const MAX_ENDPOINT_LENGTH = 1000;
const MAX_USER_AGENT_LENGTH = 500;

type JsonRecord = Record<string, unknown>;

type PushSettings = {
  pushEnabled: boolean;
  activeSubscriptionCount: number;
  currentEndpointActive: boolean;
};

type PushSubscriptionPayload = {
  endpoint?: unknown;
  expirationTime?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  } | null;
};

type PostPayload = {
  action?: unknown;
  endpoint?: unknown;
  subscription?: PushSubscriptionPayload | null;
  userAgent?: unknown;
};

type DeletePayload = {
  endpoint?: unknown;
};

function jsonResponse(
  body: JsonRecord,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function errorResponse(
  code: string,
  status: number
): NextResponse {
  return jsonResponse(
    {
      ok: false,
      code,
    },
    status
  );
}

function normalizeText(
  value: unknown,
  maxLength: number
): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isSafePushEndpoint(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  if (
    value.length < 16 ||
    value.length > MAX_ENDPOINT_LENGTH ||
    value !== value.trim() ||
    value.includes("\\") ||
    /[\u0000-\u0020\u007f]/.test(value)
  ) {
    return false;
  }

  try {
    const parsed = new URL(value);

    return (
      parsed.protocol === "https:" &&
      parsed.hostname.length > 0 &&
      parsed.pathname.length > 1 &&
      parsed.username === "" &&
      parsed.password === ""
    );
  } catch {
    return false;
  }
}

function isBase64UrlValue(
  value: unknown,
  minLength: number,
  maxLength: number
): value is string {
  return (
    typeof value === "string" &&
    value.length >= minLength &&
    value.length <= maxLength &&
    /^[A-Za-z0-9_-]+={0,2}$/.test(value)
  );
}

function normalizeExpirationTime(
  value: unknown
): number | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed <= 0
  ) {
    return undefined;
  }

  return parsed;
}

function normalizePushSettings(
  value: unknown
): PushSettings | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const record = value as JsonRecord;
  const count = Number(record.activeSubscriptionCount ?? 0);

  if (
    typeof record.pushEnabled !== "boolean" ||
    typeof record.currentEndpointActive !== "boolean" ||
    !Number.isSafeInteger(count) ||
    count < 0
  ) {
    return null;
  }

  return {
    pushEnabled: record.pushEnabled,
    activeSubscriptionCount: count,
    currentEndpointActive: record.currentEndpointActive,
  };
}

function getVapidConfiguration():
  | {
      configured: true;
      publicKey: string;
      fingerprint: string;
    }
  | {
      configured: false;
    } {
  const publicKey = normalizeText(
    process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY,
    160
  );

  if (!/^[A-Za-z0-9_-]{80,120}$/.test(publicKey)) {
    return {
      configured: false,
    };
  }

  try {
    const decoded = Buffer.from(publicKey, "base64url");

    if (
      decoded.length !== 65 ||
      decoded[0] !== 0x04
    ) {
      return {
        configured: false,
      };
    }

    return {
      configured: true,
      publicKey,
      fingerprint: createHash("sha256")
        .update(decoded)
        .digest("hex"),
    };
  } catch {
    return {
      configured: false,
    };
  }
}

async function getAuthenticatedContext() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user,
    error,
  };
}

async function readSettings(
  supabase: Awaited<
    ReturnType<typeof createServerSupabaseClient>
  >,
  endpoint: string | null
): Promise<PushSettings | null> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "mhidas_get_notification_push_settings",
    {
      p_endpoint: endpoint,
    }
  );

  if (error) {
    console.error(
      "[api/notifications/push] settings RPC error:",
      error
    );

    return null;
  }

  return normalizePushSettings(data);
}

export async function GET(): Promise<NextResponse> {
  try {
    const {
      supabase,
      user,
      error: authError,
    } = await getAuthenticatedContext();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", 401);
    }

    const settings = await readSettings(
      supabase,
      null
    );

    if (!settings) {
      return errorResponse(
        "PUSH_SETTINGS_READ_FAILED",
        500
      );
    }

    const vapid = getVapidConfiguration();

    return jsonResponse({
      ok: true,
      configured: vapid.configured,
      vapidPublicKey: vapid.configured
        ? vapid.publicKey
        : null,
      settings,
      dispatchEnabled: false,
    });
  } catch (error) {
    console.error(
      "[api/notifications/push] unexpected GET error:",
      error
    );

    return errorResponse("INTERNAL_ERROR", 500);
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const {
      supabase,
      user,
      error: authError,
    } = await getAuthenticatedContext();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", 401);
    }

    const body = (await request
      .json()
      .catch(() => null)) as PostPayload | null;

    if (!body) {
      return errorResponse("INVALID_BODY", 400);
    }

    const action = normalizeText(body.action, 24);

    if (action === "status") {
      if (!isSafePushEndpoint(body.endpoint)) {
        return errorResponse(
          "INVALID_PUSH_ENDPOINT",
          400
        );
      }

      const settings = await readSettings(
        supabase,
        body.endpoint
      );

      if (!settings) {
        return errorResponse(
          "PUSH_SETTINGS_READ_FAILED",
          500
        );
      }

      return jsonResponse({
        ok: true,
        action,
        settings,
        dispatchEnabled: false,
      });
    }

    if (action !== "register") {
      return errorResponse("INVALID_ACTION", 400);
    }

    const vapid = getVapidConfiguration();

    if (!vapid.configured) {
      return errorResponse(
        "VAPID_PUBLIC_KEY_NOT_CONFIGURED",
        503
      );
    }

    const subscription = body.subscription;

    if (
      !subscription ||
      typeof subscription !== "object" ||
      Array.isArray(subscription) ||
      !isSafePushEndpoint(subscription.endpoint) ||
      !subscription.keys ||
      typeof subscription.keys !== "object" ||
      !isBase64UrlValue(
        subscription.keys.p256dh,
        40,
        200
      ) ||
      !isBase64UrlValue(
        subscription.keys.auth,
        8,
        128
      )
    ) {
      return errorResponse(
        "INVALID_PUSH_SUBSCRIPTION",
        400
      );
    }

    const expirationTime = normalizeExpirationTime(
      subscription.expirationTime
    );

    if (expirationTime === undefined) {
      return errorResponse(
        "INVALID_EXPIRATION_TIME",
        400
      );
    }

    const userAgent = normalizeText(
      body.userAgent,
      MAX_USER_AGENT_LENGTH
    );

    const {
      data,
      error,
    } = await supabase.rpc(
      "mhidas_upsert_notification_push_subscription",
      {
        p_endpoint: subscription.endpoint,
        p_p256dh: subscription.keys.p256dh,
        p_auth_secret: subscription.keys.auth,
        p_expiration_time_ms: expirationTime,
        p_vapid_key_fingerprint: vapid.fingerprint,
        p_user_agent: userAgent || null,
      }
    );

    if (error) {
      console.error(
        "[api/notifications/push] register RPC error:",
        error
      );

      return errorResponse(
        "PUSH_SUBSCRIPTION_REGISTER_FAILED",
        500
      );
    }

    const settings = normalizePushSettings(data);

    if (!settings) {
      return errorResponse(
        "INVALID_PUSH_REGISTER_RESULT",
        500
      );
    }

    return jsonResponse({
      ok: true,
      action,
      settings,
      dispatchEnabled: false,
    });
  } catch (error) {
    console.error(
      "[api/notifications/push] unexpected POST error:",
      error
    );

    return errorResponse("INTERNAL_ERROR", 500);
  }
}

export async function DELETE(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const {
      supabase,
      user,
      error: authError,
    } = await getAuthenticatedContext();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", 401);
    }

    const body = (await request
      .json()
      .catch(() => null)) as DeletePayload | null;

    if (!body || !isSafePushEndpoint(body.endpoint)) {
      return errorResponse(
        "INVALID_PUSH_ENDPOINT",
        400
      );
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "mhidas_revoke_notification_push_subscription",
      {
        p_endpoint: body.endpoint,
      }
    );

    if (error) {
      console.error(
        "[api/notifications/push] revoke RPC error:",
        error
      );

      return errorResponse(
        "PUSH_SUBSCRIPTION_REVOKE_FAILED",
        500
      );
    }

    const settings = normalizePushSettings(data);

    if (!settings) {
      return errorResponse(
        "INVALID_PUSH_REVOKE_RESULT",
        500
      );
    }

    return jsonResponse({
      ok: true,
      action: "revoke",
      settings,
      dispatchEnabled: false,
    });
  } catch (error) {
    console.error(
      "[api/notifications/push] unexpected DELETE error:",
      error
    );

    return errorResponse("INTERNAL_ERROR", 500);
  }
}
