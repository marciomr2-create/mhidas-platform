// src/app/dashboard/cards/[card_id]/page.tsx

export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";

import QrBlock from "./QrBlock";
import SocialLinksManager from "./SocialLinksManager";
import ProfessionalProfileManager from "./ProfessionalProfileManager";

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

function buttonStyle() {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
    display: "inline-block",
  } as const;
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

function getClubPublicHref(slug: string) {
  return `/${slug}?mode=club`;
}

function getProPublicHref(slug: string) {
  return `/${slug}?mode=pro`;
}

function getProQrHref(slug: string) {
  return `/api/qr/${slug}?mode=pro`;
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

  // ======================
  // ANALYTICS BASE
  // ======================

  const { data: clickCounts } = await supabase
    .from("social_link_click_counts")
    .select("link_id, clicks")
    .eq("card_id", cardId)
    .order("clicks", { ascending: false });

  const metrics = (clickCounts as ClickCountRow[]) || [];
  const totalClicks = metrics.reduce((acc, m) => acc + Number(m.clicks), 0);

  // NOVO → métricas profissionais (base inicial)
  const whatsappClicks = metrics.find(m => m.link_id.includes("whatsapp"))?.clicks || 0;
  const websiteClicks = metrics.find(m => m.link_id.includes("website"))?.clicks || 0;
  const linkedinClicks = metrics.find(m => m.link_id.includes("linkedin"))?.clicks || 0;

  const slug = c.slug ?? "";
  const hasPublicSlug = !!slug;

  const clubPublicHref = hasPublicSlug ? getClubPublicHref(slug) : "";
  const proPublicHref = hasPublicSlug ? getProPublicHref(slug) : "";
  const proQrHref = hasPublicSlug ? getProQrHref(slug) : "";

  return (
    <main style={{ padding: 24, maxWidth: 920 }}>
      <h1 style={{ fontWeight: 900 }}>USECLUBBERS</h1>

      <div style={{ marginTop: 8, opacity: 0.8 }}>
        <div><strong>Perfil:</strong> {c.label ?? "Sem título"}</div>
        <div><strong>Link:</strong> {c.slug ?? "—"}</div>
        <div><strong>Status:</strong> {c.is_published ? "Publicado" : "Não publicado"}</div>
      </div>

      {/* ======================
         NOVO → ANALYTICS PRO MODE
      ====================== */}

      <section style={sectionStyle()}>
        <h2 style={{ margin: 0, fontWeight: 900 }}>Analytics do Pro Mode</h2>

        <div style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
        }}>
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

        <p style={{ margin: 0, opacity: 0.7 }}>
          Estas métricas mostram quais canais profissionais estão gerando mais interesse no seu perfil.
        </p>
      </section>

      {/* ======================
         CLUB MODE
      ====================== */}

      <section style={sectionStyle()}>
        <h2 style={{ margin: 0, fontWeight: 900 }}>Club Mode</h2>

        <QrBlock slug={slug} />

        {hasPublicSlug && (
          <Link href={clubPublicHref} target="_blank" style={buttonStyle()}>
            Abrir perfil Club
          </Link>
        )}

        <SocialLinksManager cardId={c.card_id} />
      </section>

      {/* ======================
         PRO MODE
      ====================== */}

      <section style={sectionStyle()}>
        <h2 style={{ margin: 0, fontWeight: 900 }}>Pro Mode</h2>

        {hasPublicSlug && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href={proQrHref} target="_blank" style={buttonStyle()}>
              Abrir QR
            </a>

            <Link href={proPublicHref} target="_blank" style={buttonStyle()}>
              Abrir perfil profissional
            </Link>
          </div>
        )}

        <ProfessionalProfileManager
          proPublicHref={proPublicHref}
          hasPublicSlug={hasPublicSlug}
          isPublished={c.is_published}
        />
      </section>
    </main>
  );
}