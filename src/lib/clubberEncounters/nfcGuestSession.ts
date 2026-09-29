import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const NFC_GUEST_SESSION_COOKIE =
  "mhidas_nfc_guest_session_v1";

export const NFC_GUEST_SESSION_MAX_AGE_SECONDS =
  7 * 24 * 60 * 60;

const GUEST_SESSION_SECRET_PATTERN = /^[a-f0-9]{64}$/;

type GuestClaimRow = {
  claim_id: string;
  owner_user_id: string;
  outcome: string;
  expires_at: string | null;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

export function isValidNfcGuestSessionSecret(
  value: unknown
): value is string {
  return GUEST_SESSION_SECRET_PATTERN.test(
    normalizeText(value).toLowerCase()
  );
}

export function createNfcGuestSessionSecret(): string {
  return randomBytes(32).toString("hex");
}

export function hashNfcGuestSessionSecret(
  secret: string
): string {
  const normalized =
    normalizeText(secret).toLowerCase();

  if (!isValidNfcGuestSessionSecret(normalized)) {
    throw new Error(
      "invalid_nfc_guest_session_secret"
    );
  }

  return createHash("sha256")
    .update(normalized, "utf8")
    .digest("hex");
}

export function getNfcGuestSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax" as const,
    path: "/",
    maxAge: NFC_GUEST_SESSION_MAX_AGE_SECONDS,
  };
}

function createAdminSupabaseClient() {
  const supabaseUrl = normalizeText(
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );

  const serviceRoleKey = normalizeText(
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "nfc_guest_server_config_missing"
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function recordNfcGuestPending(params: {
  token: string;
  currentSecret?: string | null;
}): Promise<{
  secret: string;
  expiresAt: string | null;
}> {
  const currentSecret =
    normalizeText(
      params.currentSecret
    ).toLowerCase();

  const secret =
    isValidNfcGuestSessionSecret(currentSecret)
      ? currentSecret
      : createNfcGuestSessionSecret();

  const guestSessionHash =
    hashNfcGuestSessionSecret(secret);

  const adminSupabase =
    createAdminSupabaseClient();

  const { data, error } =
    await adminSupabase.rpc(
      "mhidas_record_nfc_guest_claim_v1",
      {
        p_token: params.token,
        p_guest_session_hash:
          guestSessionHash,
      }
    );

  if (error) {
    throw new Error(
      "nfc_guest_pending_rpc_failed"
    );
  }

  const rows = Array.isArray(data)
    ? (data as GuestClaimRow[])
    : [];

  const row = rows[0];

  if (
    !row?.claim_id ||
    row.outcome !== "pending"
  ) {
    throw new Error(
      "nfc_guest_pending_not_created"
    );
  }

  return {
    secret,
    expiresAt: row.expires_at ?? null,
  };
}