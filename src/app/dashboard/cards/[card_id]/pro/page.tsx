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
      <main style={{ padding: 24 }}>
        <h1>USECLUBBERS</h1>
        <p>Perfil não encontrado ou acesso negado.</p>
        <Link href="/dashboard/cards">Voltar</Link>
      </main>
    );
  }

  const c = card as CardRow;
  const slug = c.slug ?? "";
  const hasPublicSlug = !!slug;
  const proPublicHref = hasPublicSlug ? `/pro/${slug}` : "";
  const proQrHref = hasPublicSlug ? `/api/qr/${slug}?mode=pro` : "";

  return (
    <main style={{ padding: 24, maxWidth: 920 }}>
      <h1 style={{ fontWeight: 900 }}>Pro Mode</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        <Link href={`/dashboard/cards/${c.card_id}`} style={buttonStyle()}>
          Voltar ao hub
        </Link>

        {hasPublicSlug ? (
          <>
            <a href={proQrHref} target="_blank" style={buttonStyle()}>
              Abrir QR Pro
            </a>

            <Link href={proPublicHref} target="_blank" style={buttonStyle()}>
              Abrir Pro público
            </Link>
          </>
        ) : null}
      </div>

      <section style={sectionStyle()}>
        <h2 style={{ margin: 0, fontWeight: 900 }}>Gestão do Pro</h2>

        <ProfessionalProfileManager
          proPublicHref={proPublicHref}
          hasPublicSlug={hasPublicSlug}
          isPublished={c.is_published}
        />
      </section>
    </main>
  );
}