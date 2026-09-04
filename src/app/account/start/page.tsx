// src/app/account/start/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import {
  buildOnboardingPath,
  getSafePostOnboardingPath,
  isAccountEntryIntent,
  type AccountEntryIntent,
} from "@/lib/navigation/safeInternalNextPath";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type AccountStartPageProps = {
  searchParams?: Promise<{
    intent?: string;
    return_to?: string;
  }>;
};

const OFFICIAL_COPY: Record<
  Exclude<AccountEntryIntent, "clubber">,
  {
    eyebrow: string;
    title: string;
    body: string;
  }
> = {
  artist: {
    eyebrow: "CAMINHO ARTISTA",
    title: "Seu Universo Artista começa pela verificação.",
    body:
      "Você poderá criar ou reivindicar um Universo Artista. Identidades oficiais passam por verificação antes de receber qualquer status oficial.",
  },
  club: {
    eyebrow: "CAMINHO CLUB / VENUE",
    title: "O Universo do seu Club começa pela verificação.",
    body:
      "Você poderá criar ou reivindicar o Universo do seu Club. Perfis oficiais passam por verificação antes de receber qualquer status oficial.",
  },
  festival: {
    eyebrow: "CAMINHO FESTIVAL",
    title: "O Universo do seu Festival começa pela verificação.",
    body:
      "Você poderá criar ou reivindicar o Universo do seu Festival. Perfis oficiais passam por verificação antes de receber qualquer status oficial.",
  },
  organization: {
    eyebrow: "CAMINHO ORGANIZAÇÃO / PARCEIRO",
    title: "Sua Organização começa pela verificação.",
    body:
      "Produtoras, promoters, agências, ticketing, marcas e parceiros passam por verificação antes de receber qualquer status oficial.",
  },
};

async function persistEntryIntent(
  userId: string,
  intent: AccountEntryIntent
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { error: insertError } = await supabase
    .from("account_entry_intents")
    .upsert(
      {
        user_id: userId,
        initial_intent: intent,
        current_intent: intent,
      },
      {
        onConflict: "user_id",
        ignoreDuplicates: true,
      }
    );

  if (insertError) {
    throw new Error(`account_entry_intent_insert_failed:${insertError.message}`);
  }

  const { error: updateError } = await supabase
    .from("account_entry_intents")
    .update({
      current_intent: intent,
    })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(`account_entry_intent_update_failed:${updateError.message}`);
  }
}

export default async function AccountStartPage({
  searchParams,
}: AccountStartPageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const returnTo = getSafePostOnboardingPath(sp?.return_to);
  const requestedIntent = isAccountEntryIntent(sp?.intent)
    ? sp.intent
    : null;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const nextParams = new URLSearchParams();

    if (requestedIntent) {
      nextParams.set("intent", requestedIntent);
    }

    if (returnTo) {
      nextParams.set("return_to", returnTo);
    }

    const nextPath = nextParams.size
      ? `/account/start?${nextParams.toString()}`
      : "/account/start";

    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: existingIntent, error: existingIntentError } = await supabase
    .from("account_entry_intents")
    .select("initial_intent,current_intent")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingIntentError) {
    throw new Error(existingIntentError.message);
  }

  const storedIntent = isAccountEntryIntent(existingIntent?.current_intent)
    ? existingIntent.current_intent
    : null;
  const resolvedIntent = requestedIntent || storedIntent;

  if (!resolvedIntent) {
    return (
      <main className="uc-account-start-shell">
        <style>{pageCss}</style>

        <section className="uc-account-start-card">
          <span className="uc-account-start-eyebrow">SUA CONTA USECLUBBERS</span>
          <h1>Como você faz parte da cena?</h1>
          <p>
            Sua conta é única. Escolha apenas o caminho inicial que deseja
            continuar agora.
          </p>

          <div className="uc-account-start-choice-list">
            {(
              [
                ["clubber", "Clubber"],
                ["artist", "Artista / DJ / Projeto musical"],
                ["club", "Club / Venue"],
                ["festival", "Festival"],
                ["organization", "Organização / Parceiro"],
              ] as const
            ).map(([intent, label]) => {
              const query = new URLSearchParams({ intent });

              if (returnTo) {
                query.set("return_to", returnTo);
              }

              return (
                <Link
                  key={intent}
                  href={`/account/start?${query.toString()}`}
                  className="uc-account-start-choice"
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  await persistEntryIntent(user.id, resolvedIntent);

  if (resolvedIntent === "clubber") {
    redirect(buildOnboardingPath(returnTo));
  }

  const officialCopy = OFFICIAL_COPY[resolvedIntent];

  return (
    <main className="uc-account-start-shell">
      <style>{pageCss}</style>

      <section className="uc-account-start-card">
        <span className="uc-account-start-eyebrow">
          {officialCopy.eyebrow}
        </span>

        <h1>{officialCopy.title}</h1>

        <p>{officialCopy.body}</p>

        <div className="uc-account-start-trust">
          <strong>A conta confirma quem acessa.</strong>
          <span>
            A verificação confirma quem a identidade representa. Nenhum Universo,
            entidade, autorização ou badge foi criado nesta etapa.
          </span>
        </div>

        <div className="uc-account-start-email">
          <strong>Use seu e-mail profissional, se tiver.</strong>
          <span>
            E-mails vinculados ao domínio oficial podem ajudar a agilizar a
            verificação, mas não substituem a validação da identidade ou da
            propriedade da entidade.
          </span>
        </div>

        <div className="uc-account-start-next">
          <span>PRÓXIMA ETAPA</span>
          <p>
            A Central de Verificação será o ambiente oficial para iniciar,
            acompanhar e concluir a criação ou reivindicação do perfil.
          </p>
        </div>

        {returnTo ? (
          <p className="uc-account-start-social-note">
            Você chegou aqui a partir de um perfil Clubber. Conexões pessoais são
            sempre entre Clubbers. Para conectar com pessoas, sua conta também
            deverá possuir uma Identidade Clubber.
          </p>
        ) : null}

        <Link href="/clubbers" className="uc-account-start-link">
          Explorar a cena
        </Link>
      </section>
    </main>
  );
}

const pageCss = `
  * {
    box-sizing: border-box;
  }

  .uc-account-start-shell {
    min-height: 100svh;
    padding: clamp(24px, 6vw, 72px) 16px;
    color: #f8fafc;
    background:
      radial-gradient(circle at 50% 0%, rgba(42, 134, 148, 0.10), transparent 30%),
      #050505;
  }

  .uc-account-start-card {
    width: min(100%, 640px);
    margin: 0 auto;
    padding: clamp(24px, 5vw, 40px);
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 26px;
    background: #0e0e0e;
    box-shadow: 0 28px 72px rgba(0, 0, 0, 0.38);
  }

  .uc-account-start-eyebrow {
    display: block;
    color: #2a8694;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.13em;
  }

  .uc-account-start-card h1 {
    margin: 12px 0 0;
    max-width: 560px;
    font-size: clamp(36px, 8vw, 54px);
    line-height: 0.98;
    letter-spacing: -0.05em;
    font-weight: 500;
  }

  .uc-account-start-card > p {
    margin: 18px 0 0;
    color: #cbd5e1;
    font-size: 15px;
    line-height: 1.6;
  }

  .uc-account-start-trust,
  .uc-account-start-email,
  .uc-account-start-next {
    display: grid;
    gap: 6px;
    margin-top: 22px;
    padding: 16px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .uc-account-start-trust strong,
  .uc-account-start-email strong {
    color: #f8fafc;
    font-size: 14px;
  }

  .uc-account-start-trust span,
  .uc-account-start-email span,
  .uc-account-start-next p {
    margin: 0;
    color: #94a3b8;
    font-size: 13px;
    line-height: 1.55;
  }

  .uc-account-start-next > span {
    color: #2a8694;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.10em;
  }

  .uc-account-start-social-note {
    padding: 13px 14px;
    border-left: 2px solid #2a8694;
    background: #111111;
    color: #cbd5e1 !important;
    font-size: 13px !important;
  }

  .uc-account-start-choice-list {
    display: grid;
    gap: 10px;
    margin-top: 24px;
  }

  .uc-account-start-choice {
    display: block;
    padding: 14px 15px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 14px;
    background: #111111;
    color: #f8fafc;
    font-weight: 800;
    text-decoration: none;
  }

  .uc-account-start-choice:hover {
    border-color: rgba(42, 134, 148, 0.62);
  }

  .uc-account-start-link {
    display: inline-block;
    margin-top: 24px;
    color: #2a8694;
    font-weight: 900;
    text-decoration: none;
  }

  @media (max-width: 560px) {
    .uc-account-start-shell {
      padding: 18px 12px 32px;
    }

    .uc-account-start-card {
      padding: 24px 18px 28px;
      border-radius: 22px;
    }

    .uc-account-start-card h1 {
      font-size: clamp(34px, 11vw, 46px);
    }
  }
`;
