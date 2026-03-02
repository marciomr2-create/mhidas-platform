// src/app/api/qr/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { createPublicClient } from "@/utils/supabase/public";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  if (!slug) return NextResponse.json({ error: "missing_slug" }, { status: 400 });

  const supabase = createPublicClient();

  const { data: card } = await supabase
    .from("cards")
    .select("slug, is_published")
    .eq("slug", String(slug).toLowerCase())
    .single();

  if (!card?.slug || !card.is_published) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const origin = req.nextUrl.origin;

  // ✅ Premium direto
  const url = `${origin}/${card.slug}`;

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