// src/app/dashboard/cards/[card_id]/page.tsx

export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

import QrBlock from "./QrBlock";
import SocialLinksManager from "./SocialLinksManager";

type CardRow = {
  card_id: string;
  user_id: string;
  status: string;
  label: string | null;
  slug: string | null;
  is_published: boolean;
  published_at: string | null;
};

type ClickCountRow = {
  link_id: string;
  clicks: number;
};

type PageProps = {
  params: Promise<{ card_id: string }>;
};

export default async function CardPage({ params }: PageProps) {
  const supabase = await createClient();
  const { card_id: cardId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: card } = await supabase
    .from("cards")
    .select("card_id,user_id,status,label,slug,is_published,published_at")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .single();

  if (!card) {
    return (
      <main style={{ padding: 24 }}>
        <h1>MHIDAS CLUB</h1>
        <p>Card não encontrado ou acesso negado.</p>
        <Link href="/dashboard/cards">Voltar</Link>
      </main>
    );
  }

  const c = card as CardRow;

  // 🔎 Buscar métricas agregadas
  const { data: clickCounts } = await supabase
    .from("social_link_click_counts")
    .select("link_id, clicks")
    .eq("card_id", cardId)
    .order("clicks", { ascending: false });

  const metrics = (clickCounts as ClickCountRow[]) || [];

  const totalClicks = metrics.reduce((acc, m) => acc + Number(m.clicks), 0);

  return (
    <main style={{ padding: 24, maxWidth: 920 }}>
      <h1 style={{ fontWeight: 900 }}>MHIDAS CLUB</h1>

      <div style={{ marginBottom: 20 }}>
        <strong>Total de cliques:</strong> {totalClicks}
      </div>

      {/* Ranking por link */}
      {metrics.length > 0 && (
        <section style={{ marginBottom: 30 }}>
          <h2 style={{ fontWeight: 900 }}>Ranking de Links</h2>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {metrics.map((m, index) => (
              <div
                key={m.link_id}
                style={{
                  padding: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>#{index + 1} — {m.link_id}</span>
                <strong>{m.clicks} cliques</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      <QrBlock slug={c.slug ?? ""} />

      <section style={{ marginTop: 30 }}>
        <h2 style={{ fontWeight: 900 }}>Social Links</h2>
        <SocialLinksManager cardId={c.card_id} />
      </section>
    </main>
  );
}