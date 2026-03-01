export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/utils/supabase/public';

type SocialLinkRow = {
  id: string;
  card_id: string;
  url: string;
  is_active: boolean;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = createPublicClient();

  // 1) Buscar o link (apenas campos mínimos)
  const { data: link, error: linkErr } = await supabase
    .from('social_links')
    .select('id,card_id,url,is_active')
    .eq('id', id)
    .single();

  if (linkErr || !link) {
    return NextResponse.redirect(new URL('/', req.url), { status: 302 });
  }

  const row = link as SocialLinkRow;

  // Se estiver desativado, não registra e manda para perfil (ou home)
  if (!row.is_active) {
    return NextResponse.redirect(new URL('/', req.url), { status: 302 });
  }

  // 2) Registrar evento de clique (anon)
  // RLS já garante: link ativo + card published+active+slug
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null;

  const userAgent = req.headers.get('user-agent');
  const referer = req.headers.get('referer');

  await supabase.from('social_link_clicks').insert({
    card_id: row.card_id,
    link_id: row.id,
    ip,
    user_agent: userAgent,
    referer,
  });

  // 3) Redirecionar para URL final
  // Normalização: se vier sem protocolo, força https://
  let target = row.url?.trim() || '';
  if (target && !/^https?:\/\//i.test(target)) {
    target = `https://${target}`;
  }

  if (!target) {
    return NextResponse.redirect(new URL('/', req.url), { status: 302 });
  }

  return NextResponse.redirect(target, { status: 302 });
}