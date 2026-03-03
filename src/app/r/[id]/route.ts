export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/utils/supabase/public";

type SocialLinkRow = {
  id: string;
  card_id: string;
  url: string;
  is_active: boolean;
  clicks_count?: number;
};

function normalizeTargetUrl(raw: string): string {
  const t = String(raw || "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = createPublicClient();

  // 1) Buscar o link (mínimo) para decidir fluxo com segurança
  const { data: link, error: linkErr } = await supabase
    .from("social_links")
    .select("id,card_id,url,is_active")
    .eq("id", id)
    .single();

  if (linkErr || !link) {
    return NextResponse.redirect(new URL("/", req.url), { status: 302 });
  }

  const row = link as SocialLinkRow;

  // Se estiver desativado, não registra e não incrementa
  if (!row.is_active) {
    return NextResponse.redirect(new URL("/", req.url), { status: 302 });
  }

  // 2) Incremento atômico do contador agregado (não pode quebrar redirect)
  try {
    await supabase.rpc("increment_social_link_click", { p_id: row.id });
  } catch {
    // resiliente: segue fluxo mesmo se RPC falhar
  }

  // 3) Registrar evento de clique (anon) — mantém seu log existente
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

  // 4) Redirecionar para URL final
  const target = normalizeTargetUrl(row.url);

  if (!target) {
    return NextResponse.redirect(new URL("/", req.url), { status: 302 });
  }

  return NextResponse.redirect(target, { status: 302 });
}