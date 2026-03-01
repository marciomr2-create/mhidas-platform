export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link';
import { createPublicClient } from '@/utils/supabase/public';

type CardPublicRow = {
  card_id: string;
  label: string | null;
  slug: string;
  status: string;
  is_published: boolean;
};

type SocialLinkPublicRow = {
  id: string;
  label: string;
  platform: string;
  url: string;
  sort_order: number;
  is_active: boolean;
};

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = createPublicClient();

  const { data: card, error: cardErr } = await supabase
    .from('cards')
    .select('card_id,label,slug,status,is_published')
    .eq('slug', slug)
    .eq('status', 'active')
    .eq('is_published', true)
    .single();

  if (cardErr || !card) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>MHIDAS CLUB</h1>
        <p style={{ marginTop: 12, opacity: 0.85 }}>Perfil não encontrado.</p>
        <p style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
          Este perfil pode estar despublicado ou indisponível.
        </p>
      </main>
    );
  }

  const cardRow = card as CardPublicRow;

  const { data: links } = await supabase
    .from('social_links')
    .select('id,label,platform,url,sort_order,is_active')
    .eq('card_id', cardRow.card_id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const items = (links ?? []) as SocialLinkPublicRow[];

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <header style={{ display: 'grid', gap: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>MHIDAS CLUB</h1>
        <div style={{ opacity: 0.9 }}>
          <div>
            <strong>slug:</strong> {cardRow.slug}
          </div>
          <div>
            <strong>label:</strong> {cardRow.label ?? '—'}
          </div>
        </div>
      </header>

      <section style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        {items.length === 0 ? (
          <p style={{ opacity: 0.85 }}>Nenhum link ativo disponível.</p>
        ) : (
          items.map((l) => (
            <Link
              key={l.id}
              href={`/r/${l.id}`}
              prefetch={false}
              style={{
                display: 'block',
                padding: 16,
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.04)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ fontWeight: 900 }}>{l.label}</div>
              <div style={{ opacity: 0.85, marginTop: 4, wordBreak: 'break-all' }}>{l.url}</div>
              <div style={{ opacity: 0.6, fontSize: 12, marginTop: 8 }}>{l.platform}</div>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}