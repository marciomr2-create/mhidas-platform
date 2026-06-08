// src/app/dashboard/cards/[card_id]/pro/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";

import ProfessionalProfileManager from "../ProfessionalProfileManager";

type CardRow = {
  card_id: string;
  user_id: string;
  status: string;
  label: string | null;
  slug: string | null;
  is_published: boolean;
  published_at: string | null;
};

type PageProps = {
  params: Promise<{ card_id: string }>;
};

function pageContainerStyle() {
  return {
    minHeight: "100vh",
    padding: 24,
    background:
      "radial-gradient(circle at top left, rgba(37,99,235,0.18), transparent 34%), linear-gradient(180deg, #020617 0%, #05070d 48%, #080b13 100%)",
    color: "#f8fafc",
  } as const;
}

function contentStyle() {
  return {
    width: "100%",
    maxWidth: 980,
    margin: "0 auto",
    display: "grid",
    gap: 20,
  } as const;
}

function heroStyle() {
  return {
    border: "1px solid rgba(148,163,184,0.20)",
    borderRadius: 28,
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(17,24,39,0.96))",
    boxShadow: "0 28px 80px rgba(2,6,23,0.48)",
    padding: 22,
    display: "grid",
    gap: 16,
  } as const;
}

function sectionStyle() {
  return {
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 24,
    background: "rgba(15,23,42,0.92)",
    boxShadow: "0 24px 70px rgba(2,6,23,0.34)",
    padding: 18,
    display: "grid",
    gap: 14,
  } as const;
}

function buttonStyle(variant: "primary" | "secondary" = "secondary") {
  const isPrimary = variant === "primary";

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 15px",
    borderRadius: 14,
    border: isPrimary
      ? "1px solid rgba(20,184,166,0.36)"
      : "1px solid rgba(148,163,184,0.20)",
    background: isPrimary
      ? "linear-gradient(135deg, rgba(13,148,136,0.96), rgba(20,184,166,0.82))"
      : "rgba(15,23,42,0.78)",
    color: "#f8fafc",
    textDecoration: "none",
    fontWeight: 800,
    boxShadow: isPrimary ? "0 14px 34px rgba(13,148,136,0.18)" : "none",
  } as const;
}

function labelStyle() {
  return {
    display: "inline-block",
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  } as const;
}

export default async function CardProPage({ params }: PageProps) {
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
      <main style={pageContainerStyle()}>
        <div style={contentStyle()}>
          <section style={heroStyle()}>
            <span style={labelStyle()}>USECLUBBERS</span>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 950 }}>
              Perfil não encontrado
            </h1>
            <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.6 }}>
              Não encontramos este perfil profissional na sua conta ou o acesso não está liberado.
            </p>
            <div>
              <Link href="/dashboard/cards" style={buttonStyle("primary")}>
                Voltar aos meus perfis
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const c = card as CardRow;
  const slug = c.slug ?? "";
  const hasPublicSlug = !!slug;
  const proPublicHref = hasPublicSlug ? `/pro/${slug}` : "";
  const proQrHref = hasPublicSlug ? `/api/qr/${slug}?mode=pro` : "";

  return (
    <main style={pageContainerStyle()}>
      <div style={contentStyle()}>
        <section style={heroStyle()}>
          <span style={labelStyle()}>Área profissional</span>

          <div style={{ display: "grid", gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.05, fontWeight: 950 }}>
              Perfil profissional
            </h1>

            <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.65 }}>
              Organize sua apresentação profissional, canais de contato, foto e presença na rede de oportunidades.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={`/dashboard/cards/${c.card_id}`} style={buttonStyle()}>
              Voltar ao perfil
            </Link>

            {hasPublicSlug ? (
              <>
                <a href={proQrHref} target="_blank" rel="noopener noreferrer" style={buttonStyle()}>
                  Abrir QR profissional
                </a>

                <Link href={proPublicHref} target="_blank" style={buttonStyle("primary")}>
                  Ver perfil público
                </Link>
              </>
            ) : null}
          </div>
        </section>

        <section style={sectionStyle()}>
          <ProfessionalProfileManager
            proPublicHref={proPublicHref}
            hasPublicSlug={hasPublicSlug}
            isPublished={c.is_published}
          />
        </section>
      </div>
    </main>
  );
}
