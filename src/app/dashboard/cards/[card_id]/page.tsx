// src/app/dashboard/cards/[card_id]/page.tsx

export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";

import UseclubbersPageShell from "@/components/layout/UseclubbersPageShell";
import { createServerSupabaseClient } from "@/utils/supabase/server";

import CardNfcManager from "./CardNfcManager";

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

export default async function CardPage({
  params,
}: PageProps) {
  const supabase =
    await createServerSupabaseClient();

  const { card_id: cardId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: card } = await supabase
    .from("cards")
    .select(
      "card_id,user_id,status,label,slug,is_published,published_at"
    )
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .single();

  if (!card) {
    return (
      <UseclubbersPageShell
        title="Perfil não encontrado"
        description="Este perfil não está disponível para esta conta."
        backHref="/dashboard/cards"
        backLabel="Voltar aos perfis"
      >
        <section className="uc-ui-section">
          <div className="uc-ui-surface">
            <span className="uc-ui-label">
              ACESSO
            </span>

            <strong className="uc-ui-value">
              Perfil indisponível
            </strong>

            <p className="uc-ui-copy">
              Volte aos seus perfis para continuar.
            </p>
          </div>
        </section>
      </UseclubbersPageShell>
    );
  }

  const c = card as CardRow;

  const { data: clickCounts } = await supabase
    .from("social_link_click_counts")
    .select("link_id, clicks")
    .eq("card_id", cardId)
    .order("clicks", { ascending: false });

  const metrics =
    (clickCounts as ClickCountRow[]) || [];

  const totalClicks = metrics.reduce(
    (acc, metric) =>
      acc + Number(metric.clicks),
    0
  );

  const whatsappClicks =
    metrics.find((metric) =>
      metric.link_id
        .toLowerCase()
        .includes("whatsapp")
    )?.clicks || 0;

  const websiteClicks =
    metrics.find((metric) =>
      metric.link_id
        .toLowerCase()
        .includes("website")
    )?.clicks || 0;

  const linkedinClicks =
    metrics.find((metric) =>
      metric.link_id
        .toLowerCase()
        .includes("linkedin")
    )?.clicks || 0;

  const slug = c.slug ?? "";
  const hasPublicSlug = Boolean(slug);

  return (
    <UseclubbersPageShell
      title={c.label ?? "Meu perfil"}
      description="Gerencie sua identidade Clubber, seu Perfil profissional e seus NFCs no mesmo lugar."
      eyebrow="USECLUBBERS"
      backHref="/dashboard/cards"
      backLabel="Voltar aos perfis"
      mode="clubber"
    >
      <section className="uc-ui-section">
        <div className="uc-ui-grid uc-ui-grid--2">
          <div className="uc-ui-surface">
            <span className="uc-ui-label">
              STATUS DO PERFIL
            </span>

            <strong className="uc-ui-value">
              {c.is_published
                ? "Publicado"
                : "Ainda não publicado"}
            </strong>

            <p className="uc-ui-copy">
              Link público: {c.slug ?? "ainda não definido"}
            </p>
          </div>

          <div className="uc-ui-surface">
            <span className="uc-ui-label">
              IDENTIDADE
            </span>

            <strong className="uc-ui-value">
              Um card, duas experiências
            </strong>

            <p className="uc-ui-copy">
              Clubber e Professional usam a mesma conta,
              mantendo contextos públicos independentes.
            </p>
          </div>
        </div>
      </section>

      <section className="uc-ui-section">
        <div className="uc-ui-action">
          <div className="uc-ui-action-copy">
            <span className="uc-ui-label">
              VISÃO GERAL
            </span>

            <h2>Interações do perfil</h2>

            <p>
              Acompanhe os principais acessos gerados
              pelos seus canais públicos.
            </p>
          </div>
        </div>

        <div className="uc-ui-grid uc-ui-grid--2">
          <div className="uc-ui-surface uc-ui-surface--secondary">
            <span className="uc-ui-label">
              TOTAL
            </span>
            <strong className="uc-ui-value">
              {totalClicks}
            </strong>
          </div>

          <div className="uc-ui-surface uc-ui-surface--secondary">
            <span className="uc-ui-label">
              WHATSAPP
            </span>
            <strong className="uc-ui-value">
              {whatsappClicks}
            </strong>
          </div>

          <div className="uc-ui-surface uc-ui-surface--secondary">
            <span className="uc-ui-label">
              WEBSITE
            </span>
            <strong className="uc-ui-value">
              {websiteClicks}
            </strong>
          </div>

          <div className="uc-ui-surface uc-ui-surface--secondary">
            <span className="uc-ui-label">
              LINKEDIN
            </span>
            <strong className="uc-ui-value">
              {linkedinClicks}
            </strong>
          </div>
        </div>
      </section>

      <section className="uc-ui-section">
        <div className="uc-ui-action">
          <div className="uc-ui-action-copy">
            <span className="uc-ui-label">
              SEUS MODOS
            </span>

            <h2>Escolha o contexto</h2>

            <p>
              A identidade Clubber e o Perfil profissional
              permanecem separados dentro do mesmo card.
            </p>
          </div>
        </div>

        <div className="uc-ui-grid uc-ui-grid--2">
          <article
            className="uc-ui-surface"
            data-mhidas-mode="clubber"
          >
            <span className="uc-ui-label">
              CLUBBER
            </span>

            <strong className="uc-ui-value">
              Experiência Clubber
            </strong>

            <p className="uc-ui-copy">
              Música, eventos, caronas, encontros,
              artistas, pertencimento e descoberta.
            </p>

            <div className="uc-ui-stack">
              <Link
                href={`/dashboard/cards/${c.card_id}/club`}
                className="uc-ui-button"
              >
                Gerenciar Clubber
              </Link>

              {hasPublicSlug ? (
                <Link
                  href={`/${slug}?mode=club`}
                  target="_blank"
                  className="uc-ui-button"
                >
                  Abrir Perfil Clubber público
                </Link>
              ) : null}
            </div>
          </article>

          <article
            className="uc-ui-surface"
            data-mhidas-mode="pro"
          >
            <span className="uc-ui-label">
              PROFESSIONAL
            </span>

            <strong className="uc-ui-value">
              Perfil profissional
            </strong>

            <p className="uc-ui-copy">
              Networking, autoridade, contatos
              profissionais e oportunidades.
            </p>

            <div className="uc-ui-stack">
              <Link
                href={`/dashboard/cards/${c.card_id}/pro`}
                className="uc-ui-button"
              >
                Acessar Pro Mode
              </Link>

              {hasPublicSlug ? (
                <Link
                  href={`/pro/${slug}`}
                  target="_blank"
                  className="uc-ui-button"
                >
                  Abrir Pro público
                </Link>
              ) : null}
            </div>
          </article>
        </div>
      </section>

      <section className="uc-ui-section">
        <div className="uc-ui-action">
          <div className="uc-ui-action-copy">
            <span className="uc-ui-label">
              MEU NFC
            </span>

            <h2>Seus produtos físicos</h2>

            <p>
              NFC Clubber e NFC Professional são independentes.
              Ativar, trocar ou desativar um não altera o outro.
            </p>
          </div>
        </div>

        <CardNfcManager
          cardId={c.card_id}
          canActivate={Boolean(
            c.slug && c.is_published
          )}
        />
      </section>
    </UseclubbersPageShell>
  );
}