import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { createPublicClient } from "@/utils/supabase/public";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Mode = "club" | "pro";

function normalizeMode(value: string | null): Mode {
  return String(value || "").trim().toLowerCase() === "pro"
    ? "pro"
    : "club";
}

function normalizeBaseUrl(req: NextRequest): string {
  const envBase =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";

  return String(envBase || req.nextUrl.origin)
    .trim()
    .replace(/\/+$/, "");
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;

  if (!slug) {
    return NextResponse.json(
      { error: "missing_slug" },
      { status: 400 }
    );
  }

  const mode = normalizeMode(
    req.nextUrl.searchParams.get("mode")
  );

  const safeSlug = String(slug)
    .trim()
    .toLowerCase();

  const supabase = createPublicClient();

  const { data: card } = await supabase
    .from("cards")
    .select("slug, is_published")
    .eq("slug", safeSlug)
    .single();

  if (!card?.slug || !card.is_published) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404 }
    );
  }

  const base = normalizeBaseUrl(req);

  const url =
    mode === "club"
      ? `${base}/q/${encodeURIComponent(card.slug)}`
      : `${base}/${encodeURIComponent(card.slug)}?mode=pro`;

  const pngBuffer = await QRCode.toBuffer(url, {
    type: "png",
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  return new NextResponse(
    new Uint8Array(pngBuffer),
    {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}