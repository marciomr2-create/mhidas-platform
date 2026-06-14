// src/app/dashboard/cards/[card_id]/pro/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { CSSProperties } from "react";
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

function pageContainerStyle(): CSSProperties {
  return {
    minHeight: "100vh",
    color: "#f8fafc",
    background:
      "radial-gradient(circle at 18% 0%, rgba(37,99,235,0.24), transparent 30%), radial-gradient(circle at 82% 12%, rgba(20,184,166,0.14), transparent 26%), linear-gradient(180deg, #020617 0%, #050816 46%, #070b14 100%)",
  };
}

function contentStyle(): CSSProperties {
  return {
    width: "100%",
    maxWidth: 760,
    margin: "0 auto",
    display: "grid",
    gap: 14,
  };
}

function heroStyle(): CSSProperties {
  return {
    border: "1px solid rgba(148,163,184,0.20)",
    borderRadius: 22,
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(17,24,39,0.94))",
    boxShadow: "0 24px 70px rgba(2,6,23,0.44)",
    padding: 16,
    display: "grid",
    gap: 14,
  };
}

function sectionStyle(): CSSProperties {
  return {
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 22,
    background: "rgba(15,23,42,0.88)",
    boxShadow: "0 22px 64px rgba(2,6,23,0.34)",
    padding: 10,
    display: "grid",
    gap: 12,
    overflow: "hidden",
  };
}

function labelStyle(): CSSProperties {
  return {
    display: "inline-block",
    color: "#93c5fd",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  };
}

function buttonStyle(variant: "primary" | "secondary" = "secondary"): CSSProperties {
  const isPrimary = variant === "primary";

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 13px",
    borderRadius: 14,
    border: isPrimary
      ? "1px solid rgba(20,184,166,0.38)"
      : "1px solid rgba(148,163,184,0.22)",
    background: isPrimary
      ? "linear-gradient(135deg, rgba(13,148,136,0.98), rgba(20,184,166,0.86))"
      : "rgba(15,23,42,0.82)",
    color: "#f8fafc",
    textDecoration: "none",
    fontWeight: 850,
    boxShadow: isPrimary ? "0 14px 34px rgba(13,148,136,0.18)" : "none",
    whiteSpace: "nowrap",
  };
}

function mutedTextStyle(): CSSProperties {
  return {
    margin: 0,
    color: "#cbd5e1",
    lineHeight: 1.55,
    fontSize: 14,
  };
}

function notFoundCardStyle(): CSSProperties {
  return {
    ...heroStyle(),
    minHeight: 280,
    alignContent: "center",
  };
}

function MobileFirstCss() {
  return (
    <style>{`
      .pro-private-page {
        padding: 12px 10px 34px;
      }

      .pro-private-page * {
        box-sizing: border-box;
      }

      .pro-private-actions {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .pro-private-actions a {
        width: 100%;
      }

      .pro-private-manager {
        width: 100%;
        min-width: 0;
      }

      .pro-private-manager > * {
        max-width: 100%;
      }

      .pro-private-manager input,
      .pro-private-manager textarea,
      .pro-private-manager select,
      .pro-private-manager button {
        max-width: 100%;
      }

      .pro-private-manager textarea {
        min-height: 96px;
      }

      @media (min-width: 520px) {
        .pro-private-page {
          padding: 18px 14px 40px;
        }

        .pro-private-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-start;
        }

        .pro-private-actions a {
          width: auto;
        }
      }

      @media (min-width: 860px) {
        .pro-private-page {
          padding: 28px 18px 48px;
        }
      }
    `}</style>
  );
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
      <main className="pro-private-page" style={pageContainerStyle()}>
        <MobileFirstCss />
        <div style={contentStyle()}>
          <section style={notFoundCardStyle()}>
            <span style={labelStyle()}>USECLUBBERS PRO</span>
            <div style={{ display: "grid", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: "clamp(26px, 8vw, 42px)", letterSpacing: "-0.04em" }}>
                Perfil profissional não encontrado
              </h1>
              <p style={mutedTextStyle()}>
                Não encontramos este perfil profissional na sua conta ou o acesso não está liberado.
              </p>
            </div>
            <div className="pro-private-actions">
              <Link href="/dashboard" style={buttonStyle("secondary")}>
                Voltar aos meus perfis
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const currentCard = card as CardRow;
  const slug = currentCard.slug ?? "";
  const hasPublicSlug = slug.length > 0;
  const proPublicHref = hasPublicSlug ? `/pro/${slug}` : "";
  const proQrHref = hasPublicSlug ? `/api/qr/${slug}?mode=pro` : "";

  return (
    <main className="pro-private-page" style={pageContainerStyle()}>
      <MobileFirstCss />
      <div style={contentStyle()}>
        <section style={heroStyle()}>
          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              alignItems: "end",
            }}
          >
            <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
              <span style={labelStyle()}>Área profissional</span>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(28px, 8vw, 44px)",
                  lineHeight: 0.98,
                  letterSpacing: "-0.055em",
                }}
              >
                Perfil profissional
              </h1>
              <p style={mutedTextStyle()}>
                Organize sua apresentação profissional, canais de contato, foto e presença na rede de oportunidades.
              </p>
            </div>

            <div className="pro-private-actions">
              <Link href={`/dashboard/cards/${cardId}`} style={buttonStyle("secondary")}>
                Voltar ao perfil
              </Link>

              {hasPublicSlug ? (
                <>
                  <Link href={proQrHref} style={buttonStyle("secondary")}>
                    Abrir QR profissional
                  </Link>
                  <Link href={proPublicHref} style={buttonStyle("primary")}>
                    Ver perfil público
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <section style={sectionStyle()}>
          <div className="pro-private-manager">
            <ProfessionalProfileManager
              cardId={cardId}
              proPublicHref={proPublicHref}
              hasPublicSlug={hasPublicSlug}
              isPublished={Boolean(currentCard.is_published)}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
