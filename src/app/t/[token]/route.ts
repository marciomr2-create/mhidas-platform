// src/app/t/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { createSupabaseAuthServer } from "@/lib/supabaseServer";

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "";
}

function getUserAgent(req: NextRequest): string {
  return req.headers.get("user-agent") || "";
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  if (!token || token.length < 10) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });
  }

  const supabase = await createSupabaseAuthServer();

  // Exemplo de lookup do token na tabela (ajuste para o seu schema real)
  const { data: row, error: findErr } = await supabase
    .from("short_tokens")
    .select("id, url, card_id, link_id")
    .eq("token", token)
    .single();

  if (findErr || !row?.url) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // Log do evento (opcional e seguro)
  const ip = getClientIp(req);
  const ua = getUserAgent(req);
  const ipHash = ip ? crypto.createHash("sha256").update(ip).digest("hex") : null;

  // Se você já possui tracking implementado, mantenha apenas o insert correto na sua tabela existente.
  // Este bloco NÃO deve quebrar se a tabela não existir: em caso de erro, seguimos com redirect.
  try {
    await supabase.from("audit_events").insert({
      kind: "token_redirect",
      token,
      card_id: row.card_id ?? null,
      link_id: row.link_id ?? null,
      ip_hash: ipHash,
      user_agent: ua,
      referer: req.headers.get("referer") || null,
    });
  } catch {
    // Não interromper redirect por falha de logging
  }

  return NextResponse.redirect(row.url, 302);
}