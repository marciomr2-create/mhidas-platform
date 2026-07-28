// src/app/onboarding/page.tsx

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import OnboardingClient from "./OnboardingClient";

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

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/onboarding");

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("card_id")
    .eq("user_id", user.id)
    .limit(2);

  if (cardsError) throw new Error(cardsError.message);
  if ((cards ?? []).length > 0) redirect("/dashboard/cards");

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
    <main
      style={{
        minHeight: "100svh",
        padding: "clamp(22px, 5vw, 64px) 16px",
        boxSizing: "border-box",
        color: "#ffffff",
        background:
          "radial-gradient(circle at 10% 0%, rgba(20,184,166,0.20), transparent 34%), radial-gradient(circle at 100% 8%, rgba(124,58,237,0.20), transparent 32%), #050506",
      }}
    >
      <section
        style={{
          width: "min(100%, 720px)",
          margin: "0 auto",
          padding: "clamp(24px, 5vw, 44px)",
          boxSizing: "border-box",
          borderRadius: 30,
          border: "1px solid rgba(255,255,255,0.11)",
          background:
            "linear-gradient(145deg, rgba(15,20,25,0.98), rgba(5,12,14,0.98))",
          boxShadow: "0 28px 84px rgba(0,0,0,0.44)",
        }}
      >
        <span
          style={{
            color: "#5eead4",
            fontSize: 11,
            fontWeight: 950,
            letterSpacing: "0.13em",
          }}
        >
          SUA IDENTIDADE CLUBBER
        </span>

        <h1
          style={{
            margin: "12px 0 0",
            fontSize: "clamp(35px, 9vw, 58px)",
            lineHeight: 0.98,
            letterSpacing: "-0.055em",
          }}
        >
          Crie seu lugar na cena.
        </h1>

        <p
          style={{
            margin: "17px 0 30px",
            color: "rgba(255,255,255,0.70)",
            lineHeight: 1.6,
            maxWidth: 590,
          }}
        >
          Este é o perfil-base da sua conta. Depois você poderá completar sua
          experiência, ativar o perfil Pro e vincular seus produtos NFC.
        </p>

        <OnboardingClient
          email={user.email ?? ""}
          initialDisplayName={initialDisplayName}
          initialUsername={initialUsername}
          initialCityBase={initialCityBase}
          initialAvatarUrl={initialAvatarUrl}
        />
      </section>
    </main>
  );
}
