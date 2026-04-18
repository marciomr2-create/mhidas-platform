// src/app/r/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/utils/supabase/public";

type SocialLinkRow = {
  id: string;
  card_id: string | null;
  url: string | null;
  is_active: boolean;
  clicks_count?: number | null;
  label?: string | null;
  platform?: string | null;
};

function cleanRawUrl(raw: string | null | undefined): string {
  return String(raw || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function buildTargetUrl(req: NextRequest, raw: string | null | undefined): string {
  const value = cleanRawUrl(raw);

  if (!value) return "";

  if (/^(mailto:|tel:)/i.test(value)) {
    return value;
  }

  if (/^\/\//.test(value)) {
    return `https:${value}`;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return new URL(value, req.nextUrl.origin).toString();
  }

  return `https://${value}`;
}

function isAllowedTarget(target: string): boolean {
  if (!target) return false;

  if (/^(mailto:|tel:)/i.test(target)) {
    return true;
  }

  try {
    const url = new URL(target);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function invalidRedirect(req: NextRequest) {
  return NextResponse.redirect(new URL("/invalid", req.url), { status: 302 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const linkId = String(id || "").trim();

  if (!linkId) {
    return invalidRedirect(req);
  }

  const supabase = createPublicClient();

  const { data: link, error: linkErr } = await supabase
    .from("social_links")
    .select("id, card_id, url, is_active, clicks_count, label, platform")
    .eq("id", linkId)
    .maybeSingle();

  if (linkErr || !link) {
    return invalidRedirect(req);
  }

  const row = link as SocialLinkRow;

  if (!row.is_active) {
    return invalidRedirect(req);
  }

  const target = buildTargetUrl(req, row.url);

  if (!isAllowedTarget(target)) {
    return invalidRedirect(req);
  }

  try {
    await supabase.rpc("increment_social_link_click", { p_id: row.id });
  } catch {
    try {
      await supabase
        .from("social_links")
        .update({ clicks_count: Number(row.clicks_count || 0) + 1 })
        .eq("id", row.id);
    } catch {
      // resiliente: não impede o redirect
    }
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const userAgent = req.headers.get("user-agent");
  const referer = req.headers.get("referer");

  try {
    await supabase.from("social_link_clicks").insert({
      card_id: row.card_id,
      link_id: row.id,
      ip,
      user_agent: userAgent,
      referer,
    });
  } catch {
    // resiliente: não impede o redirect
  }

  return NextResponse.redirect(target, { status: 302 });
}