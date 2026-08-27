// src/app/dashboard/cards/[card_id]/club/edit/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import ClubProfileBasicsManager from "./ClubProfileBasicsManager";

type CardRow = {
  card_id: string;
  user_id: string;
  label: string | null;
  slug: string | null;
  is_published: boolean;
};

type ClubProfileRow = {
  club_photo_url: string | null;
};

type PageProps = {
  params: Promise<{ card_id: string }>;
};

export default async function CardClubEditPage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient();
  const { card_id: cardId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: cardData } = await supabase
    .from("cards")
    .select("card_id,user_id,label,slug,is_published")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .single();

  if (!cardData) {
    return (
      <main className="edit-shell">
        <style>{pageCss}</style>
        <section className="edit-page edit-empty">
          <h1>Perfil não encontrado</h1>
          <p>Não foi possível abrir este Perfil Clubber ou o acesso não foi autorizado.</p>
          <Link href="/dashboard/cards" className="edit-primary-button">
            Voltar aos meus perfis
          </Link>
        </section>
      </main>
    );
  }

  const card = cardData as CardRow;

  const { data: profileData } = await supabase
    .from("club_profiles")
    .select("club_photo_url")
    .eq("user_id", user.id)
    .maybeSingle();

  const profile = (profileData ?? null) as ClubProfileRow | null;

  const profileHref = `/dashboard/cards/${card.card_id}/club`;
  const publicHref = card.slug ? `/${card.slug}?mode=club` : "";

  const modules = [
    {
      eyebrow: "Minha identidade",
      title: "Cidade, descrição e música",
      description:
        "Atualize sua cidade, sua descrição na cena e as vertentes que mais representam você.",
      href: `/dashboard/cards/${card.card_id}/club/identity`,
    },
    {
      eyebrow: "Artistas",
      title: "Os artistas que fazem parte do meu som",
      description:
        "Escolha e organize os artistas que representam sua identidade musical.",
      href: `/dashboard/cards/${card.card_id}/club/artists`,
    },
    {
      eyebrow: "Meus eventos",
      title: "Eventos e presenças",
      description:
        "Organize seus próximos eventos e consulte check-ins e experiências registradas.",
      href: `/dashboard/cards/${card.card_id}/club/events?view=upcoming`,
    },
    {
      eyebrow: "Redes e contatos",
      title: "Como podem falar comigo",
      description:
        "Defina os canais que outras pessoas podem usar para manter contato com você.",
      href: `/dashboard/cards/${card.card_id}/club/contacts`,
    },
    {
      eyebrow: "Canais e conteúdo",
      title: "Onde minha experiência continua",
      description:
        "Organize streaming, playlists e outros canais ligados à sua experiência Clubber.",
      href: `/dashboard/cards/${card.card_id}/club/content`,
    },
    {
      eyebrow: "Clubes e lugares",
      title: "Lugares que fazem parte da minha história",
      description:
        "Escolha clubes e lugares importantes na sua relação com a cena eletrônica.",
      href: `/dashboard/cards/${card.card_id}/club/places`,
    },
  ];

  return (
    <main className="edit-shell">
      <style>{pageCss}</style>

      <div className="edit-page">
        <header className="edit-topbar">
          <div>
            <p className="edit-eyebrow">Perfil Clubber</p>
            <h1>Editar meu perfil</h1>
            <p className="edit-intro">
              Atualize sua apresentação e escolha qual parte da sua experiência Clubber
              você quer editar.
            </p>
          </div>

          <Link href={profileHref} className="edit-back">
            ← Meu perfil
          </Link>
        </header>

        <section className="edit-section">
          <div className="edit-section-heading">
            <div>
              <p className="edit-eyebrow">Minha apresentação</p>
              <h2>Foto e nome</h2>
              <p>
                Cuide de como você aparece primeiro para outras pessoas dentro do
                USECLUBBERS.
              </p>
            </div>
          </div>

          <ClubProfileBasicsManager
            cardId={card.card_id}
            initialLabel={card.label ?? ""}
            initialPhotoUrl={profile?.club_photo_url ?? ""}
          />
        </section>

        <section className="edit-section">
          <div className="edit-section-heading">
            <div>
              <p className="edit-eyebrow">Minha experiência</p>
              <h2>O que você quer editar?</h2>
              <p>
                Cada parte do Perfil Clubber tem seu próprio espaço para ficar simples,
                claro e fácil de manter.
              </p>
            </div>
          </div>

          <nav className="edit-module-grid" aria-label="Áreas de edição do Perfil Clubber">
            {modules.map((module) => (
              <Link key={module.eyebrow} href={module.href} className="edit-module-card">
                <span className="edit-module-eyebrow">{module.eyebrow}</span>
                <strong>{module.title}</strong>
                <span className="edit-module-description">{module.description}</span>
                <span className="edit-module-action">
                  Editar
                  <span aria-hidden="true">›</span>
                </span>
              </Link>
            ))}
          </nav>
        </section>

        <footer className="edit-footer">
          <Link href={profileHref} className="edit-secondary-link">
            Voltar ao meu perfil
          </Link>

          {card.slug && card.is_published ? (
            <Link href={publicHref} target="_blank" className="edit-secondary-link">
              Ver meu perfil público
            </Link>
          ) : (
            <span className="edit-muted">Perfil ainda não publicado</span>
          )}
        </footer>
      </div>
    </main>
  );
}

const pageCss = `
  :root {
    color-scheme: dark;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
  }

  .edit-shell {
    min-height: 100vh;
    padding: 30px 22px 96px;
    background: #050505;
    color: #f8fafc;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .edit-page {
    width: min(100%, 920px);
    margin: 0 auto;
    display: grid;
    gap: 24px;
  }

  .edit-topbar {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
  }

  .edit-topbar h1,
  .edit-section h2 {
    margin: 0;
  }

  .edit-topbar h1 {
    margin-top: 5px;
    font-size: clamp(36px, 6vw, 54px);
    line-height: 0.98;
    letter-spacing: -0.045em;
  }

  .edit-intro,
  .edit-section-heading p {
    margin: 8px 0 0;
    color: #cbd5e1;
    line-height: 1.6;
  }

  .edit-intro {
    max-width: 680px;
  }

  .edit-eyebrow,
  .edit-module-eyebrow {
    margin: 0;
    color: #2a8694;
    font-size: 11px;
    line-height: 1.2;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    font-weight: 900;
  }

  .edit-back,
  .edit-secondary-link {
    color: #f8fafc;
    text-decoration: none;
    font-weight: 800;
  }

  .edit-back:hover,
  .edit-secondary-link:hover {
    color: #2a8694;
  }

  .edit-section {
    padding: 24px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 20px;
    background: #0e0e0e;
    display: grid;
    gap: 20px;
  }

  .edit-section-heading {
    display: flex;
    justify-content: space-between;
    gap: 20px;
  }

  .edit-section-heading h2 {
    margin-top: 5px;
    font-size: clamp(25px, 4vw, 34px);
    letter-spacing: -0.03em;
  }

  .edit-basics-manager {
    display: grid;
    gap: 14px;
  }

  .edit-message {
    padding: 12px 14px;
    border-left: 3px solid #2a8694;
    background: #111111;
    color: #f8fafc;
    line-height: 1.5;
  }

  .edit-basics-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(240px, 0.85fr);
    gap: 22px;
    align-items: start;
  }

  .edit-photo-block,
  .edit-name-block,
  .edit-field {
    display: grid;
    gap: 10px;
  }

  .edit-field-label {
    margin: 0;
    color: #f8fafc;
    font-size: 13px;
    font-weight: 850;
  }

  .edit-photo-preview {
    width: 100%;
    aspect-ratio: 16 / 9;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 16px;
    overflow: hidden;
    background: #111111;
    display: grid;
    place-items: center;
    color: #94a3b8;
  }

  .edit-photo-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .edit-photo-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .edit-field input {
    width: 100%;
    min-height: 46px;
    padding: 12px 14px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 13px;
    background: #111111;
    color: #f8fafc;
    font: inherit;
    outline: none;
  }

  .edit-field input:focus {
    border-color: #2a8694;
  }

  .edit-helper {
    margin: 0;
    color: #94a3b8;
    font-size: 12px;
    line-height: 1.5;
  }

  .edit-primary-button,
  .edit-secondary-button {
    min-height: 44px;
    border-radius: 12px;
    font: inherit;
    font-weight: 850;
    cursor: pointer;
  }

  .edit-primary-button {
    padding: 11px 15px;
    border: 1px solid #2a8694;
    background: #247c88;
    color: #f8fafc;
  }

  .edit-secondary-button {
    padding: 10px 14px;
    border: 1px solid rgba(255,255,255,0.12);
    background: #111111;
    color: #f8fafc;
  }

  .edit-primary-button:disabled,
  .edit-secondary-button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .edit-module-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .edit-module-card {
    min-height: 178px;
    padding: 20px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 17px;
    background: #111111;
    color: #f8fafc;
    text-decoration: none;
    display: grid;
    align-content: start;
    gap: 9px;
    transition:
      border-color 150ms ease,
      transform 150ms ease,
      background 150ms ease;
  }

  .edit-module-card:hover {
    border-color: rgba(42,134,148,0.55);
    background: #111111;
    transform: translateY(-1px);
  }

  .edit-module-card strong {
    font-size: 20px;
    line-height: 1.15;
    letter-spacing: -0.025em;
  }

  .edit-module-description {
    color: #cbd5e1;
    font-size: 13px;
    line-height: 1.55;
  }

  .edit-module-action {
    margin-top: auto;
    padding-top: 8px;
    color: #f8fafc;
    font-size: 12px;
    font-weight: 850;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .edit-module-action span {
    color: #2a8694;
    font-size: 22px;
    line-height: 1;
  }

  .edit-footer {
    padding: 0 2px;
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
  }

  .edit-muted {
    color: #64748b;
    font-size: 13px;
    font-weight: 750;
  }

  .edit-empty {
    min-height: 55vh;
    align-content: center;
  }

  @media (max-width: 760px) {
    .edit-shell {
      padding: 18px 12px 72px;
    }

    .edit-page {
      gap: 18px;
    }

    .edit-topbar {
      align-items: flex-start;
    }

    .edit-topbar h1 {
      font-size: 36px;
    }

    .edit-back {
      white-space: nowrap;
      font-size: 12px;
    }

    .edit-section {
      padding: 18px;
      border-radius: 18px;
      gap: 18px;
    }

    .edit-basics-grid {
      grid-template-columns: 1fr;
    }

    .edit-module-grid {
      grid-template-columns: 1fr;
    }

    .edit-module-card {
      min-height: 150px;
      padding: 17px;
    }
  }
`;
