// src/app/t/[token]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { createPublicClient } from "@/utils/supabase/public";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CardTokenProfileMode = "clubber" | "professional";

type ResolvedCardToken = {
  card_id: string;
  user_id: string;
  card_status: string;
  token_id: string;
  profile_mode: CardTokenProfileMode;
  slug: string;
};

function notFoundResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "not_found",
    },
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

function getResolvedRow(data: unknown): ResolvedCardToken | null {
  if (!Array.isArray(data) || data.length !== 1) {
    return null;
  }

  const row = data[0] as Partial<ResolvedCardToken> | null;

  if (!row) {
    return null;
  }

  const slug = String(row.slug || "").trim().toLowerCase();
  const profileMode = String(row.profile_mode || "").trim().toLowerCase();

  if (!slug) {
    return null;
  }

  if (profileMode !== "clubber" && profileMode !== "professional") {
    return null;
  }

  return {
    card_id: String(row.card_id || ""),
    user_id: String(row.user_id || ""),
    card_status: String(row.card_status || ""),
    token_id: String(row.token_id || ""),
    profile_mode: profileMode,
    slug,
  };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token: rawToken } = await ctx.params;
  const token = String(rawToken || "").trim();

  if (token.length < 10 || token.length > 512) {
    return notFoundResponse();
  }

  const supabase = createPublicClient();

  const { data, error } = await supabase.rpc(
    "mhidas_resolve_card_token_v2",
    {
      p_token: token,
    }
  );

  if (error) {
    return notFoundResponse();
  }

  const resolved = getResolvedRow(data);

  if (!resolved) {
    return notFoundResponse();
  }

  const safeSlug = encodeURIComponent(resolved.slug);

  const destination =
    resolved.profile_mode === "professional"
      ? `/pro/${safeSlug}`
      : `/${safeSlug}?mode=club`;

  const response = NextResponse.redirect(
    new URL(destination, req.nextUrl.origin),
    302
  );

  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}