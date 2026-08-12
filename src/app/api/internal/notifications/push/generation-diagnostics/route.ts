import {
  createECDH,
  createHash,
  timingSafeEqual,
} from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import * as webpush from "web-push";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const DIAGNOSTIC_TOPIC = "mhidas-diagnostic";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SubscriptionRow = {
  subscription_id: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
  vapid_key_fingerprint: string;
  status: string;
  revoked_at: string | null;
  invalidated_at: string | null;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function secretsMatch(
  received: string,
  expected: string
): boolean {
  const receivedBuffer = Buffer.from(received, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (
    receivedBuffer.length === 0 ||
    receivedBuffer.length !== expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
}

function isAuthorized(request: NextRequest): boolean {
  const expected =
    normalizeText(process.env.PUSH_DISPATCHER_SECRET);

  const received =
    normalizeText(
      request.headers.get(
        "x-mhidas-push-dispatcher-secret"
      )
    );

  if (!expected || !received) {
    return false;
  }

  return secretsMatch(received, expected);
}

function decodeBase64Url(value: string): Buffer {
  const normalized = normalizeText(value);

  if (
    !normalized ||
    !/^[A-Za-z0-9_-]+={0,2}$/.test(normalized)
  ) {
    throw new Error("invalid_base64url_format");
  }

  const withoutPadding =
    normalized.replace(/=+$/g, "");

  let base64 =
    withoutPadding
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const remainder = base64.length % 4;

  if (remainder === 2) {
    base64 += "==";
  } else if (remainder === 3) {
    base64 += "=";
  } else if (remainder === 1) {
    throw new Error("invalid_base64url_length");
  }

  const decoded =
    Buffer.from(base64, "base64");

  if (decoded.length === 0) {
    throw new Error("empty_base64url_value");
  }

  return decoded;
}

function buffersMatch(
  left: Buffer,
  right: Buffer
): boolean {
  if (
    left.length === 0 ||
    left.length !== right.length
  ) {
    return false;
  }

  return timingSafeEqual(left, right);
}

function sha256Hex(value: Buffer): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function getEndpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).hostname;
  } catch {
    return "INVALID";
  }
}

function getHeader(
  headers: Record<string, string>,
  target: string
): string | null {
  const wanted = target.toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) {
      return normalizeText(value) || null;
    }
  }

  return null;
}

function classifyGenerationError(
  error: unknown
): string {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : "";

  if (message.includes("p256dh")) {
    return "subscription_p256dh_invalid";
  }

  if (message.includes("auth")) {
    return "subscription_auth_invalid";
  }

  if (
    message.includes("vapid") &&
    message.includes("public")
  ) {
    return "vapid_public_key_invalid";
  }

  if (
    message.includes("vapid") &&
    message.includes("private")
  ) {
    return "vapid_private_key_invalid";
  }

  if (message.includes("subject")) {
    return "vapid_subject_invalid";
  }

  if (message.includes("topic")) {
    return "topic_invalid";
  }

  if (message.includes("payload")) {
    return "payload_invalid";
  }

  return "generate_request_details_error";
}

function getErrorClass(error: unknown): string {
  if (error instanceof Error) {
    return normalizeText(error.name) || "Error";
  }

  return "UnknownError";
}

export async function POST(
  request: NextRequest
) {
  if (
    !normalizeText(
      process.env.PUSH_DISPATCHER_SECRET
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        scope: "push-generation-diagnostics",
        code: "dispatcher_secret_not_configured",
        sensitiveValuesReturned: false,
        networkRequestSent: false,
      },
      { status: 503 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "push-generation-diagnostics",
        code: "unauthorized",
        sensitiveValuesReturned: false,
        networkRequestSent: false,
      },
      { status: 401 }
    );
  }

  let body: {
    subscriptionId?: unknown;
  } = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        scope: "push-generation-diagnostics",
        code: "invalid_json",
        sensitiveValuesReturned: false,
        networkRequestSent: false,
      },
      { status: 400 }
    );
  }

  const subscriptionId =
    normalizeText(body.subscriptionId);

  if (!UUID_PATTERN.test(subscriptionId)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "push-generation-diagnostics",
        code: "invalid_subscription_id",
        sensitiveValuesReturned: false,
        networkRequestSent: false,
      },
      { status: 400 }
    );
  }

  const supabaseUrl =
    normalizeText(
      process.env.NEXT_PUBLIC_SUPABASE_URL
    );

  const serviceRoleKey =
    normalizeText(
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

  const vapidPublicKey =
    normalizeText(
      process.env
        .NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY
    );

  const vapidPrivateKey =
    normalizeText(
      process.env.VAPID_PRIVATE_KEY
    );

  const vapidSubject =
    normalizeText(
      process.env.VAPID_SUBJECT
    );

  const configStageOk =
    Boolean(
      supabaseUrl &&
        serviceRoleKey &&
        vapidPublicKey &&
        vapidPrivateKey &&
        vapidSubject
    );

  if (!configStageOk) {
    return NextResponse.json(
      {
        ok: false,
        scope: "push-generation-diagnostics",
        code: "push_environment_incomplete",
        configStageOk: false,
        sensitiveValuesReturned: false,
        networkRequestSent: false,
      },
      { status: 503 }
    );
  }

  let publicKeyBytes: Buffer;
  let privateKeyBytes: Buffer;

  try {
    publicKeyBytes =
      decodeBase64Url(vapidPublicKey);

    privateKeyBytes =
      decodeBase64Url(vapidPrivateKey);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        scope: "push-generation-diagnostics",
        code: "vapid_base64url_decode_failed",
        configStageOk: true,
        sensitiveValuesReturned: false,
        networkRequestSent: false,
      },
      { status: 200 }
    );
  }

  let derivedPublicKey: Buffer | null = null;
  let publicPrivateKeypairMatch = false;

  try {
    const ecdh =
      createECDH("prime256v1");

    ecdh.setPrivateKey(privateKeyBytes);

    derivedPublicKey =
      ecdh.getPublicKey();

    publicPrivateKeypairMatch =
      buffersMatch(
        publicKeyBytes,
        derivedPublicKey
      );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        scope: "push-generation-diagnostics",
        code: "vapid_private_key_derivation_failed",
        configStageOk: true,
        publicKeyBytes:
          publicKeyBytes.length,
        privateKeyBytes:
          privateKeyBytes.length,
        publicPrivateKeypairMatch: false,
        sensitiveValuesReturned: false,
        networkRequestSent: false,
      },
      { status: 200 }
    );
  }

  const publicKeyFingerprint =
    sha256Hex(publicKeyBytes);

  let subjectScheme:
    | "mailto"
    | "https"
    | "invalid" = "invalid";

  if (/^mailto:/i.test(vapidSubject)) {
    subjectScheme = "mailto";
  } else if (/^https:\/\//i.test(vapidSubject)) {
    subjectScheme = "https";
  }

  const vapidSubjectLocalhost =
    /(^|[/:@.])localhost([/:]|$)/i.test(
      vapidSubject
    ) ||
    /(^|[/:@.])127\.0\.0\.1([/:]|$)/i.test(
      vapidSubject
    );

  const supabase =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

  const {
    data: subscription,
    error: subscriptionError,
  } = await supabase
    .from("notification_push_subscriptions")
    .select(
      [
        "subscription_id",
        "endpoint",
        "p256dh",
        "auth_secret",
        "vapid_key_fingerprint",
        "status",
        "revoked_at",
        "invalidated_at",
      ].join(",")
    )
    .eq("subscription_id", subscriptionId)
    .maybeSingle<SubscriptionRow>();

  if (subscriptionError || !subscription) {
    return NextResponse.json(
      {
        ok: false,
        scope: "push-generation-diagnostics",
        code: subscriptionError
          ? "subscription_read_failed"
          : "subscription_not_found",
        configStageOk: true,
        publicPrivateKeypairMatch,
        subjectScheme,
        vapidSubjectLocalhost,
        sensitiveValuesReturned: false,
        networkRequestSent: false,
      },
      { status: 200 }
    );
  }

  const subscriptionActive =
    subscription.status === "active" &&
    subscription.revoked_at === null &&
    subscription.invalidated_at === null;

  const dbVapidFingerprintMatch =
    normalizeText(
      subscription.vapid_key_fingerprint
    ).toLowerCase() ===
    publicKeyFingerprint.toLowerCase();

  let p256dhBytes = 0;
  let authBytes = 0;
  let subscriptionKeysDecodeOk = false;

  try {
    p256dhBytes =
      decodeBase64Url(
        subscription.p256dh
      ).length;

    authBytes =
      decodeBase64Url(
        subscription.auth_secret
      ).length;

    subscriptionKeysDecodeOk = true;
  } catch {
    subscriptionKeysDecodeOk = false;
  }

  const payload =
    JSON.stringify({
      title: "USECLUBBERS",
      body: "Diagnóstico técnico sem envio.",
      tag: "mhidas-diagnostic",
      data: {
        url: "/dashboard",
      },
    });

  let generateRequestDetailsOk = false;
  let generationErrorCode = "NONE";
  let generationErrorClass = "NONE";

  let generatedMethod = "NONE";
  let generatedEndpointHost = "NONE";
  let authorizationPresent = false;
  let contentEncoding = "NONE";
  let generatedBodyLength = 0;

  if (subscriptionKeysDecodeOk) {
    try {
      const requestDetails =
        webpush.generateRequestDetails(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth_secret,
            },
          },
          payload,
          {
            TTL: 60,
            urgency: "normal",
            topic: DIAGNOSTIC_TOPIC,
            vapidDetails: {
              subject: vapidSubject,
              publicKey: vapidPublicKey,
              privateKey: vapidPrivateKey,
            },
          }
        );

      const headers =
        requestDetails.headers as
          Record<string, string>;

      generatedMethod =
        normalizeText(
          requestDetails.method
        ).toUpperCase() || "NONE";

      generatedEndpointHost =
        getEndpointHost(
          requestDetails.endpoint
        );

      authorizationPresent =
        Boolean(
          getHeader(
            headers,
            "authorization"
          )
        );

      contentEncoding =
        getHeader(
          headers,
          "content-encoding"
        ) || "NONE";

      if (requestDetails.body) {
        generatedBodyLength =
          Buffer.isBuffer(
            requestDetails.body
          )
            ? requestDetails.body.length
            : Buffer.byteLength(
                String(
                  requestDetails.body
                ),
                "utf8"
              );
      }

      generateRequestDetailsOk = true;
    } catch (error) {
      generationErrorCode =
        classifyGenerationError(error);

      generationErrorClass =
        getErrorClass(error);
    }
  } else {
    generationErrorCode =
      "subscription_key_decode_failed";
  }

  return NextResponse.json(
    {
      ok: true,
      scope: "push-generation-diagnostics",

      configStageOk: true,

      publicKeyBytes:
        publicKeyBytes.length,

      privateKeyBytes:
        privateKeyBytes.length,

      derivedPublicKeyBytes:
        derivedPublicKey?.length ?? 0,

      publicPrivateKeypairMatch,

      subjectScheme,
      vapidSubjectLocalhost,

      subscriptionFound: true,
      subscriptionActive,

      endpointHost:
        getEndpointHost(
          subscription.endpoint
        ),

      dbVapidFingerprintMatch,

      subscriptionKeysDecodeOk,
      p256dhBytes,
      authBytes,

      generateRequestDetailsOk,
      generationErrorCode,
      generationErrorClass,

      generatedMethod,
      generatedEndpointHost,
      authorizationPresent,
      contentEncoding,
      generatedBodyLength,

      networkRequestSent: false,
      pushNotificationSent: false,
      attemptConsumed: false,
      databaseChanged: false,
      sensitiveValuesReturned: false,
    },
    {
      status: 200,
      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    }
  );
}