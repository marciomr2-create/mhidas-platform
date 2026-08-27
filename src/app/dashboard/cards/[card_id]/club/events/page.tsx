export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import ClubEventsManager, {
  type ClubEventItem,
  type ClubEventView,
  type ClubCheckInItem,
} from "./ClubEventsManager";

type CardRow = {
  card_id: string;
  user_id: string;
  label: string | null;
};

type ClubProfileRow = {
  next_events: string | null;
  next_events_dates: string | null;
  next_events_links: string | null;
  last_events: string | null;
  favorite_events: string | null;
};

type PageProps = {
  params: Promise<{ card_id: string }>;
  searchParams?: Promise<{ view?: string }>;
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function splitList(value: unknown): string[] {
  const text = cleanText(value);
  if (!text) return [];

  return text
    .split(/[,;\n]/)
    .map((item) => cleanText(item))
    .filter(Boolean);
}

function normalizeView(value: unknown): ClubEventView {
  const view = cleanText(value).toLowerCase();

  if (
    view === "upcoming" ||
    view === "previous" ||
    view === "favorites" ||
    view === "checkins"
  ) {
    return view;
  }

  return "upcoming";
}

function buildUpcomingItems(profile: ClubProfileRow | null): ClubEventItem[] {
  const names = splitList(profile?.next_events);
  const dates = splitList(profile?.next_events_dates);
  const links = splitList(profile?.next_events_links);

  return names.map((name, index) => ({
    name,
    date: dates[index] || "",
    officialUrl: links[index] || "",
    canonical: null,
  }));
}

function buildSimpleItems(value: unknown): ClubEventItem[] {
  return splitList(value).map((name) => ({
    name,
    date: "",
    officialUrl: "",
    canonical: null,
  }));
}

export default async function ClubEventsPage({ params, searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient();
  const { card_id: cardId } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const initialView = normalizeView(resolvedSearch?.view);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: cardData } = await supabase
    .from("cards")
    .select("card_id,user_id,label")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .single();

  if (!cardData) {
    return (
      <main className="events-shell">
        <style>{pageCss}</style>
        <section className="events-page events-empty">
          <p className="events-eyebrow">Perfil Clubber</p>
          <h1>Perfil não encontrado</h1>
          <p>Não foi possível abrir os eventos deste perfil ou o acesso não foi autorizado.</p>
          <Link href="/dashboard/cards" className="events-primary-action">
            Voltar aos meus perfis
          </Link>
        </section>
      </main>
    );
  }

  const card = cardData as CardRow;

  const { data: profileData } = await supabase
    .from("club_profiles")
    .select("next_events,next_events_dates,next_events_links,last_events,favorite_events")
    .eq("user_id", user.id)
    .maybeSingle();

  const profile = (profileData as ClubProfileRow | null) || null;

  const { data: checkInData } = await supabase
    .from("club_event_checkins")
    .select("event_name,event_key,event_slug,status,location_status,checked_in_at")
    .eq("card_id", card.card_id)
    .order("checked_in_at", { ascending: false })
    .limit(100);

  const checkIns: ClubCheckInItem[] = (checkInData || []).map((row: any) => ({
    eventName: cleanText(row.event_name) || cleanText(row.event_slug) || "Evento",
    eventKey: cleanText(row.event_key),
    eventSlug: cleanText(row.event_slug),
    status: cleanText(row.status).toLowerCase(),
    locationStatus: cleanText(row.location_status).toLowerCase(),
    checkedInAt: cleanText(row.checked_in_at),
  }));

  const overviewHref = `/dashboard/cards/${card.card_id}/club`;
  const profileName = cleanText(card.label) || "Meu Perfil Clubber";

  return (
    <main className="events-shell">
      <style>{pageCss}</style>

      <div className="events-page">
        <header className="events-topbar">
          <div>
            <p className="events-eyebrow">Perfil Clubber</p>
            <h1>Meus Eventos</h1>
          </div>

          <Link href={overviewHref} className="events-back-link">
            ← Voltar ao meu perfil
          </Link>
        </header>

        <section className="events-intro">
          <p className="events-eyebrow">Seu perfil</p>
          <h2>{profileName}</h2>
          <p>
            Organize os eventos que pretende frequentar, os eventos anteriores,
            seus favoritos e as presenças registradas pelo USECLUBBERS.
          </p>
        </section>

        <ClubEventsManager
          cardId={card.card_id}
          initialView={initialView}
          upcoming={buildUpcomingItems(profile)}
          previous={buildSimpleItems(profile?.last_events)}
          favorites={buildSimpleItems(profile?.favorite_events)}
          checkIns={checkIns}
        />

        <footer className="events-footer">
          <Link href={overviewHref} className="events-primary-action">
            Concluir e voltar ao Perfil Clubber
          </Link>
        </footer>
      </div>
    </main>
  );
}

const pageCss = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; }

  .events-shell {
    min-height: 100vh;
    padding: 30px 22px 110px;
    background: #050505;
    color: #F8FAFC;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .events-page {
    width: min(100%, 920px);
    margin: 0 auto;
    display: grid;
    gap: 22px;
  }

  .events-topbar {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 18px;
  }

  .events-topbar h1,
  .events-intro h2,
  .events-empty h1 {
    margin: 0;
  }

  .events-topbar h1 {
    margin-top: 5px;
    font-size: clamp(30px, 4vw, 42px);
    line-height: 1;
    letter-spacing: -0.035em;
    font-weight: 850;
  }

  .events-eyebrow {
    margin: 0;
    color: #2A8694;
    font-size: 11px;
    line-height: 1.2;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 850;
  }

  .events-back-link {
    color: #CBD5E1;
    text-decoration: none;
    font-size: 13px;
    font-weight: 760;
  }

  .events-back-link:hover {
    color: #F8FAFC;
  }

  .events-intro,
  .events-empty {
    padding: 22px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 18px;
    background: #0E0E0E;
  }

  .events-intro h2 {
    margin-top: 7px;
    font-size: clamp(23px, 3.6vw, 34px);
    line-height: 1.08;
    letter-spacing: -0.03em;
  }

  .events-intro p:not(.events-eyebrow),
  .events-empty p {
    max-width: 690px;
    margin: 10px 0 0;
    color: #CBD5E1;
    font-size: 14px;
    line-height: 1.65;
  }

  .events-footer {
    display: flex;
    justify-content: flex-end;
  }

  .events-primary-action {
    min-height: 46px;
    padding: 12px 17px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #2A8694;
    border-radius: 12px;
    background: #247C88;
    color: #F8FAFC;
    text-decoration: none;
    text-align: center;
    font-size: 14px;
    font-weight: 820;
  }

  .events-empty .events-primary-action {
    margin-top: 16px;
  }

  @media (max-width: 720px) {
    .events-shell {
      padding: 16px 14px 88px;
    }

    .events-page {
      gap: 18px;
    }

    .events-topbar {
      align-items: flex-start;
      flex-direction: column;
      gap: 10px;
    }

    .events-intro,
    .events-empty {
      padding: 18px;
    }

    .events-footer,
    .events-primary-action {
      width: 100%;
    }
  }
`;