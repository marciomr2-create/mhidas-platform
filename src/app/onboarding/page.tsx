// src/app/onboarding/page.tsx

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import OnboardingClient from "./OnboardingClient";
import {
  buildOnboardingPath,
  getSafePostOnboardingPath,
} from "@/lib/navigation/safeInternalNextPath";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function metadataText(
  metadata: Record<string, unknown>,
  keys: string[]
): string {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function usernameSuggestion(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

type OnboardingPageProps = {
  searchParams?: Promise<{
    return_to?: string;
  }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const returnTo = getSafePostOnboardingPath(sp?.return_to);
  const onboardingPath = buildOnboardingPath(returnTo);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(onboardingPath)}`);

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("card_id")
    .eq("user_id", user.id)
    .limit(2);

  if (cardsError) throw new Error(cardsError.message);
  if ((cards ?? []).length > 0) redirect(returnTo || "/dashboard/cards");

  const [{ data: profile }, { data: clubProfile }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name,avatar_url")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("club_profiles")
      .select("city_base")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const emailLocalPart =
    String(user.email ?? "clubber").split("@")[0] ?? "clubber";
  const emailUsernameSeed =
    emailLocalPart.split("+")[0]?.trim() || "clubber";
  const metadataName = metadataText(metadata, [
    "full_name",
    "name",
    "display_name",
  ]);
  const metadataUsername = metadataText(metadata, [
    "preferred_username",
    "user_name",
    "username",
  ]);
  const metadataAvatar = metadataText(metadata, ["avatar_url", "picture"]);

  const initialDisplayName =
    String(profile?.display_name ?? "").trim() || metadataName;
  const initialUsername = usernameSuggestion(
    metadataUsername || metadataName || emailUsernameSeed
  );
  const initialAvatarUrl =
    String(profile?.avatar_url ?? "").trim() || metadataAvatar;
  const initialCityBase = String(clubProfile?.city_base ?? "").trim();

  return (
    <main className="uc-onboarding-shell">
      <style>{pageCss}</style>

      <section className="uc-onboarding-card">
        <header className="uc-onboarding-header">
          <span className="uc-onboarding-eyebrow">
            SUA IDENTIDADE CLUBBER
          </span>

          <h1>Crie sua Identidade Clubber.</h1>

          <p>
            Seu perfil representa quem você é na cena. Comece pelo essencial:
            nome, @username e cidade. Depois você completa seu som, artistas,
            lugares, eventos e experiências.
          </p>

          {returnTo ? (
            <div className="uc-return-context">
              Depois de criar sua Identidade Clubber, você volta ao perfil que
              estava conhecendo.
            </div>
          ) : null}
        </header>

        <OnboardingClient
          email={user.email ?? ""}
          initialDisplayName={initialDisplayName}
          initialUsername={initialUsername}
          initialCityBase={initialCityBase}
          initialAvatarUrl={initialAvatarUrl}
          returnTo={returnTo}
        />

        <div className="uc-mobile-end-space" aria-hidden="true" />
      </section>
    </main>
  );
}

const pageCss = `
  * {
    box-sizing: border-box;
  }

  .uc-onboarding-shell {
    min-height: 100svh;
    padding: clamp(24px, 6vw, 72px) 16px;
    color: #f8fafc;
    background:
      radial-gradient(circle at 50% 0%, rgba(42, 134, 148, 0.10), transparent 30%),
      #050505;
  }

  .uc-onboarding-card {
    width: min(100%, 620px);
    margin: 0 auto;
    padding: clamp(24px, 5vw, 40px);
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 26px;
    background: #0e0e0e;
    box-shadow: 0 28px 72px rgba(0, 0, 0, 0.38);
  }

  .uc-onboarding-header {
    margin-bottom: 28px;
  }

  .uc-onboarding-eyebrow {
    display: block;
    color: #2a8694;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.13em;
  }

  .uc-onboarding-header h1 {
    margin: 12px 0 0;
    max-width: 520px;
    font-size: clamp(36px, 8vw, 54px);
    line-height: 0.98;
    letter-spacing: -0.05em;
    font-weight: 500;
  }

  .uc-onboarding-header p {
    margin: 18px 0 0;
    max-width: 540px;
    color: #cbd5e1;
    font-size: 15px;
    line-height: 1.6;
  }

  .uc-return-context {
    margin-top: 18px;
    padding: 12px 14px;
    border-left: 2px solid #2a8694;
    color: #cbd5e1;
    background: #111111;
    font-size: 13px;
    line-height: 1.45;
  }

  .uc-mobile-end-space {
    display: none;
  }

  @media (max-width: 560px) {
    .uc-onboarding-shell {
      height: 100dvh;
      min-height: 100dvh;
      overflow-x: hidden;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-y: contain;
      padding:
        max(18px, env(safe-area-inset-top))
        12px
        calc(24px + env(safe-area-inset-bottom));
    }

    .uc-onboarding-card {
      width: 100%;
      margin: 0 auto;
      padding: 24px 18px 24px;
      border-radius: 22px;
    }

    .uc-onboarding-header h1 {
      font-size: clamp(34px, 11vw, 46px);
    }

    .uc-mobile-end-space {
      display: block;
      width: 100%;
      height: calc(96px + env(safe-area-inset-bottom));
      pointer-events: none;
    }
  }
`;
