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

function modeInfoCardStyle() {
  return {
    padding: 16,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    display: "grid",
    gap: 10,
  } as const;
}

function qrPanelStyle() {
  return {
    padding: 16,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    display: "grid",
    gap: 12,
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

  const { data: clickCounts } = await supabase
    .from("social_link_click_counts")
    .select("link_id, clicks")
    .eq("card_id", cardId)
    .order("clicks", { ascending: false });

  const metrics = (clickCounts as ClickCountRow[]) || [];
  const totalClicks = metrics.reduce((acc, m) => acc + Number(m.clicks), 0);

  const slug = c.slug ?? "";
  const hasPublicSlug = !!slug;

  const clubPublicHref = hasPublicSlug ? getClubPublicHref(slug) : "";
  const proPublicHref = hasPublicSlug ? getProPublicHref(slug) : "";
  const proQrHref = hasPublicSlug ? getProQrHref(slug) : "";

  return (
    <main style={{ padding: 24, maxWidth: 920 }}>
      <h1 style={{ fontWeight: 900 }}>USECLUBBERS</h1>

      <div style={{ marginTop: 8, opacity: 0.8 }}>
        <div>
          <strong>Perfil:</strong> {c.label ?? "Sem título"}
        </div>
        <div>
          <strong>Link do perfil:</strong> {c.slug ?? "—"}
        </div>
        <div>
          <strong>Status do perfil:</strong> {c.is_published ? "Publicado" : "Não publicado"}
        </div>
      </div>

      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <strong>Total de cliques:</strong> {totalClicks}
      </div>

      {metrics.length > 0 && (
        <section style={{ marginBottom: 30 }}>
          <h2 style={{ fontWeight: 900 }}>Desempenho dos links</h2>
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
                <span>
                  #{index + 1} — {m.link_id}
                </span>
                <strong>{m.clicks} cliques</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={sectionStyle()}>
        <h2 style={{ margin: 0, fontWeight: 900 }}>Club Mode</h2>
        <p style={{ margin: 0, opacity: 0.78 }}>
          Aqui você gerencia a presença cultural do seu perfil, incluindo links sociais e acesso público.
        </p>

        <div style={modeInfoCardStyle()}>
          <strong>Acesso público Club</strong>
          <p style={{ margin: 0, opacity: 0.78 }}>
            Este QR Code leva para a experiência pública cultural do perfil.
          </p>
        </div>

        <QrBlock slug={slug} />

        {hasPublicSlug ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link href={clubPublicHref} target="_blank" style={buttonStyle()}>
              Abrir perfil Club
            </Link>
          </div>
        ) : (
          <div style={modeInfoCardStyle()}>
            <strong>Perfil público indisponível</strong>
            <p style={{ margin: 0, opacity: 0.78 }}>
              Defina e publique um slug para liberar o acesso público do Club Mode.
            </p>
          </div>
        )}

        <section style={{ marginTop: 10 }}>
          <h3 style={{ fontWeight: 900 }}>Links do perfil Club</h3>
          <SocialLinksManager cardId={c.card_id} />
        </section>
      </section>

      <section style={sectionStyle()}>
        <h2 style={{ margin: 0, fontWeight: 900 }}>Pro Mode</h2>
        <p style={{ margin: 0, opacity: 0.78 }}>
          Aqui você gerencia sua identidade profissional, contatos de negócio, apresentação e visibilidade no networking.
        </p>

        {hasPublicSlug ? (
          <section style={qrPanelStyle()}>
            <strong>Acesso público profissional</strong>

            <p style={{ margin: 0, opacity: 0.78 }}>
              Este QR Code leva direto para o seu perfil profissional público, ideal para networking, reuniões e apresentações.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                gap: 16,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "#fff",
                  padding: 10,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <img
                  src={proQrHref}
                  alt="QR Code do perfil profissional"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ opacity: 0.82 }}>
                  <strong>Perfil profissional:</strong>
                  <div style={{ marginTop: 4 }}>{proPublicHref}</div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <a
                    href={proQrHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={buttonStyle()}
                  >
                    Abrir QR do Pro Mode
                  </a>

                  <Link href={proPublicHref} target="_blank" style={buttonStyle()}>
                    Abrir perfil profissional
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div style={modeInfoCardStyle()}>
            <strong>Perfil profissional público indisponível</strong>
            <p style={{ margin: 0, opacity: 0.78 }}>
              Defina e publique um slug para liberar o QR Code e o link público do Pro Mode.
            </p>
          </div>
        )}

        <ProfessionalProfileManager />
      </section>
    </main>
  );
}