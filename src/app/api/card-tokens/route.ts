// src/app/api/card-tokens/route.ts

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const ROUTE_VERSION = "mvp2-qr-nfc-lifecycle-v2";

const ALLOWED_ACTIONS = ["issue", "rotate", "revoke"] as const;
const ALLOWED_PROFILE_MODES = ["clubber", "professional"] as const;

type CardTokenAction = (typeof ALLOWED_ACTIONS)[number];
type CardTokenProfileMode = (typeof ALLOWED_PROFILE_MODES)[number];

type CardTokenPayload = {
  action?: unknown;
  card_id?: unknown;
  profile_mode?: unknown;
};

type CardTokenStatusRow = {
  profile_mode: string;
  active: boolean;
  created_at: string | null;
  rotated_at: string | null;
  revoked_at: string | null;
};

function normalizeText(value: unknown, maxLength = 256): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function getCanonicalNfcOrigin(): string | null {
  const configuredOrigin = normalizeText(
    process.env.MHIDAS_NFC_CANONICAL_ORIGIN,
    2048
  );

  if (!configuredOrigin) {
    return null;
  }

  try {
    const url = new URL(configuredOrigin);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isAllowedAction(value: string): value is CardTokenAction {
  return ALLOWED_ACTIONS.includes(value as CardTokenAction);
}

function isAllowedProfileMode(
  value: string
): value is CardTokenProfileMode {
  return ALLOWED_PROFILE_MODES.includes(
    value as CardTokenProfileMode
  );
}

function jsonNoStore(
  body: Record<string, unknown>,
  status = 200
) {
  const response = NextResponse.json(body, { status });

  response.headers.set(
    "Cache-Control",
    "no-store, max-age=0"
  );

  return response;
}

function errorResponse(
  code: string,
  message: string,
  status: number
) {
  return jsonNoStore(
    {
      ok: false,
      version: ROUTE_VERSION,
      scope: "card-tokens",
      error_code: code,
      message,
      database_write_performed: false,
    },
    status
  );
}

function generateRawToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function hashRawToken(rawToken: string): string {
  return crypto
    .createHash("sha256")
    .update(rawToken, "utf8")
    .digest("hex");
}

function getRpcFailure(
  message: string
): {
  code: string;
  message: string;
  status: number;
} {
  const normalized = message.toLowerCase();

  if (normalized.includes("nfc_auth_required")) {
    return {
      code: "AUTH_REQUIRED",
      message: "Authentication required.",
      status: 401,
    };
  }

  if (
    normalized.includes("nfc_card_not_owned") ||
    normalized.includes("nfc_card_not_owned_or_inactive")
  ) {
    return {
      code: "CARD_NOT_ALLOWED",
      message: "This card cannot be managed by the current user.",
      status: 403,
    };
  }

  if (normalized.includes("nfc_active_token_already_exists")) {
    return {
      code: "ACTIVE_TOKEN_EXISTS",
      message: "An active NFC already exists for this profile mode.",
      status: 409,
    };
  }

  if (normalized.includes("nfc_active_token_not_found")) {
    return {
      code: "ACTIVE_TOKEN_NOT_FOUND",
      message: "No active NFC was found for this profile mode.",
      status: 404,
    };
  }

  if (
    normalized.includes("nfc_profile_mode_invalid") ||
    normalized.includes("nfc_card_required") ||
    normalized.includes("nfc_token_hash_invalid")
  ) {
    return {
      code: "INVALID_REQUEST",
      message: "Invalid NFC lifecycle request.",
      status: 400,
    };
  }

  return {
    code: "NFC_OPERATION_FAILED",
    message: "Could not complete the NFC operation.",
    status: 500,
  };
}

export async function GET(request: NextRequest) {
  const cardId = normalizeText(
    request.nextUrl.searchParams.get("card_id"),
    64
  );

  if (!cardId || !isUuidLike(cardId)) {
    return errorResponse(
      "INVALID_CARD",
      "Valid card_id is required.",
      400
    );
  }

  const supabase =
    await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return errorResponse(
      "AUTH_REQUIRED",
      "Authentication required.",
      401
    );
  }

  const { data, error } = await supabase.rpc(
    "mhidas_read_card_token_status_v1",
    {
      p_card_id: cardId,
    }
  );

  if (error) {
    const failure = getRpcFailure(error.message);

    return errorResponse(
      failure.code,
      failure.message,
      failure.status
    );
  }

  const rows = Array.isArray(data)
    ? (data as CardTokenStatusRow[])
    : [];

  const statuses = ALLOWED_PROFILE_MODES.map((profileMode) => {
    const row = rows.find(
      (item) => item.profile_mode === profileMode
    );

    return {
      profile_mode: profileMode,
      active: row?.active === true,
      created_at: row?.created_at ?? null,
      rotated_at: row?.rotated_at ?? null,
      revoked_at: row?.revoked_at ?? null,
    };
  });

  return jsonNoStore({
    ok: true,
    version: ROUTE_VERSION,
    scope: "card-tokens",
    card_id: cardId,
    statuses,
    database_write_performed: false,
  });
}

export async function POST(request: NextRequest) {
  let payload: CardTokenPayload;

  try {
    payload = (await request.json()) as CardTokenPayload;
  } catch {
    return errorResponse(
      "INVALID_JSON",
      "Invalid JSON body.",
      400
    );
  }

  const action = normalizeText(
    payload.action,
    24
  ).toLowerCase();

  const cardId = normalizeText(
    payload.card_id,
    64
  );

  const profileMode = normalizeText(
    payload.profile_mode,
    32
  ).toLowerCase();

  if (!isAllowedAction(action)) {
    return errorResponse(
      "INVALID_ACTION",
      "Invalid NFC lifecycle action.",
      400
    );
  }

  if (!cardId || !isUuidLike(cardId)) {
    return errorResponse(
      "INVALID_CARD",
      "Valid card_id is required.",
      400
    );
  }

  if (!isAllowedProfileMode(profileMode)) {
    return errorResponse(
      "INVALID_PROFILE_MODE",
      "Profile mode must be clubber or professional.",
      400
    );
  }

  const supabase =
    await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return errorResponse(
      "AUTH_REQUIRED",
      "Authentication required.",
      401
    );
  }

  const { data: card, error: cardError } =
    await supabase
      .from("cards")
      .select(
        "card_id,user_id,status,is_published,slug"
      )
      .eq("card_id", cardId)
      .maybeSingle();

  if (cardError || !card?.card_id) {
    return errorResponse(
      "CARD_NOT_FOUND",
      "Card not found.",
      404
    );
  }

  if (card.user_id !== user.id) {
    return errorResponse(
      "CARD_NOT_ALLOWED",
      "This card cannot be managed by the current user.",
      403
    );
  }

  if (action === "revoke") {
    const { data, error } = await supabase.rpc(
      "mhidas_revoke_card_token_v1",
      {
        p_card_id: cardId,
        p_profile_mode: profileMode,
      }
    );

    if (error) {
      const failure = getRpcFailure(error.message);

      return errorResponse(
        failure.code,
        failure.message,
        failure.status
      );
    }

    return jsonNoStore({
      ok: true,
      version: ROUTE_VERSION,
      scope: "card-tokens",
      action,
      card_id: cardId,
      profile_mode: profileMode,
      changed: data === true,
      database_write_performed: data === true,
    });
  }

  if (
    card.status !== "issued" &&
    card.status !== "active"
  ) {
    return errorResponse(
      "CARD_INACTIVE",
      "The card must be issued or active before NFC activation.",
      409
    );
  }

  const nfcOrigin = getCanonicalNfcOrigin();

  if (!nfcOrigin) {
    return errorResponse(
      "NFC_CANONICAL_ORIGIN_INVALID",
      "NFC canonical origin is not configured correctly.",
      503
    );
  }

  const rawToken = generateRawToken();
  const tokenHash = hashRawToken(rawToken);

  const rpc =
    action === "rotate"
      ? "mhidas_rotate_card_token_v1"
      : "mhidas_issue_card_token_v1";

  const rpcArgs =
    action === "rotate"
      ? {
          p_card_id: cardId,
          p_profile_mode: profileMode,
          p_new_token_hash: tokenHash,
        }
      : {
          p_card_id: cardId,
          p_profile_mode: profileMode,
          p_token_hash: tokenHash,
        };

  const { data, error } = await supabase.rpc(
    rpc,
    rpcArgs
  );

  if (error) {
    const failure = getRpcFailure(error.message);

    return errorResponse(
      failure.code,
      failure.message,
      failure.status
    );
  }

  const resultRow =
    Array.isArray(data) && data.length > 0
      ? data[0]
      : null;

  const tokenPath = `/t/${rawToken}`;
  const nfcUrl = new URL(
    tokenPath,
    nfcOrigin
  ).toString();

  return jsonNoStore({
    ok: true,
    version: ROUTE_VERSION,
    scope: "card-tokens",
    action,
    card_id: cardId,
    profile_mode: profileMode,
    token_id: resultRow?.token_id ?? null,

    // Returned once so the authenticated activation flow can write
    // the physical NFC. The raw token is never persisted by this route.
    token: rawToken,
    token_path: tokenPath,
    nfc_url: nfcUrl,

    database_write_performed: true,
  });
}