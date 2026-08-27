export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type EventView = "upcoming" | "previous" | "favorites";

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeSearch(value: unknown): string {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeView(value: unknown): EventView {
  const view = cleanText(value).toLowerCase();
  if (view === "previous" || view === "favorites") return view;
  return "upcoming";
}

function safeHttpsUrl(value: unknown): string {
  const text = cleanText(value);
  if (!text) return "";

  try {
    const url = new URL(text);
    if (url.protocol !== "https:") return "";
    if (!url.hostname || url.username || url.password) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function getOfficialImageUrl(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";

  const image = (metadata as Record<string, unknown>).official_image;
  if (!image || typeof image !== "object" || Array.isArray(image)) return "";

  const record = image as Record<string, unknown>;
  const url = safeHttpsUrl(record.image_url);
  if (!url) return "";

  const usageScope = cleanText(record.usage_scope);
  const provenance = cleanText(record.provenance_status);
  const authorization = cleanText(record.authorization_status);

  if (usageScope !== "event_page_hero") return "";
  if (provenance !== "validated_source" && authorization !== "authorized") return "";

  return url;
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Configuração server-side indisponível.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cardId = cleanText(searchParams.get("cardId"));
    const query = cleanText(searchParams.get("q"));
    const normalizedQuery = normalizeSearch(query);
    const view = normalizeView(searchParams.get("view"));
    const exact = searchParams.get("exact") === "1";

    if (!cardId) {
      return NextResponse.json(
        { ok: false, message: "Perfil inválido." },
        { status: 400 }
      );
    }

    if (normalizedQuery.length < 2) {
      return NextResponse.json(
        { ok: false, message: "Digite pelo menos 2 caracteres para buscar." },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Faça login para buscar eventos." },
        { status: 401 }
      );
    }

    const { data: card } = await supabase
      .from("cards")
      .select("card_id")
      .eq("card_id", cardId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!card) {
      return NextResponse.json(
        { ok: false, message: "Você não tem acesso a este perfil." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    let documentQuery = admin
      .from("canonical_event_search_documents")
      .select("canonical_event_id,search_rank_score")
      .eq("is_publicly_searchable", true)
      .order("search_rank_score", { ascending: false })
      .limit(exact ? 8 : 24);

    documentQuery = exact
      ? documentQuery.ilike("normalized_title", `${normalizedQuery}%`)
      : documentQuery.ilike("normalized_title", `%${normalizedQuery}%`);

    const { data: documents, error: documentError } = await documentQuery;

    if (documentError) {
      throw documentError;
    }

    const ids = Array.from(
      new Set(
        (documents || [])
          .map((row: any) => cleanText(row.canonical_event_id))
          .filter(Boolean)
      )
    );

    if (ids.length === 0) {
      return NextResponse.json({ ok: true, events: [] });
    }

    let canonicalQuery = admin
      .from("canonical_events")
      .select(
        "id,slug,event_name,starts_at,ends_at,event_date_key,venue_name,city,state,country,official_url,ticket_url,metadata"
      )
      .in("id", ids);

    const nowIso = new Date().toISOString();

    if (view === "upcoming") {
      canonicalQuery = canonicalQuery.gte("starts_at", nowIso);
    } else if (view === "previous") {
      canonicalQuery = canonicalQuery.lt("starts_at", nowIso);
    }

    const { data: canonicalRows, error: canonicalError } = await canonicalQuery;

    if (canonicalError) {
      throw canonicalError;
    }

    const byId = new Map(
      (canonicalRows || []).map((row: any) => [cleanText(row.id), row])
    );

    const events = ids
      .map((id) => byId.get(id))
      .filter(
        (row: any) =>
          Boolean(row) &&
          (!exact || normalizeSearch(row.event_name) === normalizedQuery)
      )
      .slice(0, exact ? 1 : 12)
      .map((row: any) => ({
        id: cleanText(row.id),
        slug: cleanText(row.slug),
        eventName: cleanText(row.event_name),
        startsAt: cleanText(row.starts_at),
        endsAt: cleanText(row.ends_at),
        eventDateKey: cleanText(row.event_date_key),
        venueName: cleanText(row.venue_name),
        city: cleanText(row.city),
        state: cleanText(row.state),
        country: cleanText(row.country),
        officialUrl: safeHttpsUrl(row.official_url),
        ticketUrl: safeHttpsUrl(row.ticket_url),
        imageUrl: getOfficialImageUrl(row.metadata),
      }))
      .filter((event) => event.id && event.slug && event.eventName);

    return NextResponse.json({
      ok: true,
      mode: "canonical_event_search",
      view,
      exact,
      events,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível buscar eventos agora.",
      },
      { status: 500 }
    );
  }
}