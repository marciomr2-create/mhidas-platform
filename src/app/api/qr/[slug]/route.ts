// src/app/api/qr/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { createPublicClient } from "@/utils/supabase/public";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;

  if (!slug) {
    return NextResponse.json({ error: "missing_slug" }, { status: 400 });
  }

  const supabase = createPublicClient();

  // Ajuste este select conforme seu schema real (mantive abordagem mínima)
  const { data: card, error } = await supabase
    .from("cards")
    .select("slug")
    .eq("slug", slug)
    .single();

  if (error || !card?.slug) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const origin = req.nextUrl.origin;
  const url = `${origin}/u/${card.slug}`;

  // QRCode.toBuffer retorna Buffer no Node; convertendo para Uint8Array para BodyInit
  const pngBuffer = await QRCode.toBuffer(url, {
    type: "png",
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  const body = new Uint8Array(pngBuffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}