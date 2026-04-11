// src/app/dashboard/cards/[card_id]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";

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

function sectionStyle() {
  return {
    marginTop: 24,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    display: "grid",
    gap: 14,
  } as const;
}

function buttonStyle(primary = false) {
  return {
    padding: "12px 16px",
    borderRadius: 12,
    border: primary
      ? "1px solid rgba(255,255,255,0.28)"
      : "1px solid rgba(255,255,255,0.16)",
    background: primary ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 800,
    display: "inline-block",
    textAlign: "center" as const,
  };
}

function analyticsCardStyle() {
  return {
    padding: 16,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    display: "grid",
    gap: 10,
  } as const;
}

export default async function CardPage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient();
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
        <h1>USECLUBBERS</h1>
        <p>Perfil não encontrado ou acesso negado.</p>
        <Link href="/dashboard/cards">Voltar</Link>
      </main>
    );
  }

  const c = card as CardRow;

  const { data: clickCounts } = await supabase
    .from("social_link_click_counts")
    .select("link_id, clicks")
    .eq("card_id", cardId)
    .order("clicks", { ascending: false });

  const metrics = (clickCounts as ClickCountRow[]) || [];
  const totalClicks = metrics.reduce((acc, m) => acc + Number(m.clicks), 0);

  const whatsappClicks =
    metrics.find((m) => m.link_id.toLowerCase().includes("whatsapp"))?.clicks || 0;
  const websiteClicks =
    metrics.find((m) => m.link_id.toLowerCase().includes("website"))?.clicks || 0;
  const linkedinClicks =
    metrics.find((m) => m.link_id.toLowerCase().includes("linkedin"))?.clicks || 0;

  const slug = c.slug ?? "";
  const hasPublicSlug = !!slug;

  return (
    <main style={{ padding: 24, maxWidth: 920 }}>
      <h1 style={{ fontWeight: 900 }}>USECLUBBERS</h1>

      <div style={{ marginTop: 8, opacity: 0.8 }}>
        <div><strong>Perfil:</strong> {c.label ?? "Sem título"}</div>
        <div><strong>Link:</strong> {c.slug ?? "—"}</div>
        <div><strong>Status:</strong> {c.is_published ? "Publicado" : "Não publicado"}</div>
      </div>

      <section style={sectionStyle()}>
        <h2 style={{ margin: 0, fontWeight: 900 }}>Visão geral</h2>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <div style={analyticsCardStyle()}>
            <span>Total de interações</span>
            <strong style={{ fontSize: 22 }}>{totalClicks}</strong>
          </div>

          <div style={analyticsCardStyle()}>
            <span>Cliques WhatsApp</span>
            <strong style={{ fontSize: 22 }}>{whatsappClicks}</strong>
          </div>

          <div style={analyticsCardStyle()}>
            <span>Cliques Website</span>
            <strong style={{ fontSize: 22 }}>{websiteClicks}</strong>
          </div>

          <div style={analyticsCardStyle()}>
            <span>Cliques LinkedIn</span>
            <strong style={{ fontSize: 22 }}>{linkedinClicks}</strong>
          </div>
        </div>
      </section>

      <section style={sectionStyle()}>
        <h2 style={{ margin: 0, fontWeight: 900 }}>Escolha o módulo</h2>

        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          <div
            style={{
              padding: 18,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)",
              display: "grid",
              gap: 12,
            }}
          >
            <div>
              <strong style={{ fontSize: 18 }}>Club Mode</strong>
              <p style={{ margin: "8px 0 0 0", opacity: 0.82, lineHeight: 1.55 }}>
                Identidade cultural, artistas, eventos, playlists, streaming e presença na cena.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link
                href={`/dashboard/cards/${c.card_id}/club`}
                style={buttonStyle(true)}
              >
                Acessar Club Mode
              </Link>

              {hasPublicSlug ? (
                <Link
                  href={`/${slug}`}
                  target="_blank"
                  style={buttonStyle()}
                >
                  Abrir Club público
                </Link>
              ) : null}
            </div>
          </div>

          <div
            style={{
              padding: 18,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)",
              display: "grid",
              gap: 12,
            }}
          >
            <div>
              <strong style={{ fontSize: 18 }}>Pro Mode</strong>
              <p style={{ margin: "8px 0 0 0", opacity: 0.82, lineHeight: 1.55 }}>
                Networking, autoridade, contatos profissionais, QR Pro e perfil para negócios.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link
                href={`/dashboard/cards/${c.card_id}/pro`}
                style={buttonStyle(true)}
              >
                Acessar Pro Mode
              </Link>

              {hasPublicSlug ? (
                <Link
                  href={`/pro/${slug}`}
                  target="_blank"
                  style={buttonStyle()}
                >
                  Abrir Pro público
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}