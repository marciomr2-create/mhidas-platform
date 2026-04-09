// src/app/api/qr/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { createPublicClient } from "@/utils/supabase/public";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Mode = "club" | "pro";

function normalizeMode(value: string | null): Mode {
  const mode = String(value || "").trim().toLowerCase();
  return mode === "pro" ? "pro" : "club";
}

function normalizeBaseUrl(req: NextRequest): string {
  const envBase =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";

  const base = String(envBase || req.nextUrl.origin).trim();

  return base.replace(/\/+$/, "");
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;

  if (!slug) {
    return NextResponse.json({ error: "missing_slug" }, { status: 400 });
  }

  const mode = normalizeMode(req.nextUrl.searchParams.get("mode"));
  const safeSlug = String(slug).trim().toLowerCase();

  const supabase = createPublicClient();

  const { data: card } = await supabase
    .from("cards")
    .select("slug, is_published")
    .eq("slug", safeSlug)
    .single();

  if (!card?.slug || !card.is_published) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const baseUrl = normalizeBaseUrl(req);
  const url = `${baseUrl}/${card.slug}?mode=${mode}`;

  const pngBuffer = await QRCode.toBuffer(url, {
    type: "png",
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  return new NextResponse(new Uint8Array(pngBuffer), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}