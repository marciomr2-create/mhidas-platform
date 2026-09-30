import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const QR_GUEST_SESSION_COOKIE =
  "mhidas_qr_guest_session_v1";

const PATTERN = /^[a-f0-9]{64}$/;

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidQrGuestSessionSecret(
  value: unknown
): value is string {
  return PATTERN.test(normalize(value));
}

export function hashQrGuestSessionSecret(
  secret: string
): string {
  const value = normalize(secret);

  if (!isValidQrGuestSessionSecret(value)) {
    throw new Error("invalid_qr_guest_session_secret");
  }

  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

export function getQrGuestSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  };
}

export async function recordQrGuestPending(params: {
  slug: string;
  currentSecret?: string | null;
}) {
  const current = normalize(params.currentSecret);

  const secret =
    isValidQrGuestSessionSecret(current)
      ? current
      : randomBytes(32).toString("hex");

  const guestHash =
    hashQrGuestSessionSecret(secret);

  const url = String(
    process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  ).trim();

  const key = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  ).trim();

  if (!url || !key) {
    throw new Error("qr_guest_server_config_missing");
  }

  const admin = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await admin.rpc(
    "mhidas_record_qr_guest_claim_v1",
    {
      p_slug: normalize(params.slug),
      p_guest_session_hash: guestHash,
    }
  );

  if (error || !Array.isArray(data) || !data[0]?.claim_id) {
    throw new Error("qr_guest_pending_failed");
  }

  return { secret };
}