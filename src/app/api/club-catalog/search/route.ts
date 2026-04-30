// src/app/api/club-catalog/search/route.ts

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/utils/supabase/public";

type CatalogType = "club" | "festival" | "party" | "event" | "venue";

type SearchSuggestion = {
  id?: string;
  name: string;
  type: CatalogType;
  city: string;
  state: string;
  country: string;
  image_url: string;
  official_url: string;
  instagram_url: string;
  source_url: string;
  source_name: string;
  source_provider: string;
  is_verified: boolean;
  is_from_catalog: boolean;
};

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  raw_content?: string;
  score?: number;
};

type ClubCatalogRow = {
  id: string;
  name: string | null;
  type: CatalogType | null;
  city: string | null;
  state: string | null;
  country: string | null;
  image_url: string | null;
  official_url: string | null;
  instagram_url: string | null;
  source_url: string | null;
  source_name: string | null;
  source_provider: string | null;
  is_verified: boolean | null;
  usage_count: number | null;
  normalized_name: string | null;
};

type KnownLocation = {
  city: string;
  state: string;
};

const GENERIC_SEARCH_WORDS = new Set([
  "a",
  "as",
  "o",
  "os",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "e",
  "of",
  "the",
  "club",
  "clube",
  "clubs",
  "festival",
  "festivais",
  "festa",
  "festas",
  "party",
  "event",
  "evento",
  "eventos",
  "venue",
  "local",
  "park",
  "parque",
  "music",
  "brasil",
  "brazil",
  "oficial",
  "official",
  "instagram",
  "photos",
  "videos",
  "foto",
  "fotos",
  "video",
  "maior",
  "mundo",
  "home",
  "site",
]);

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeForSearch(value: unknown): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearch(value: unknown): string {
  return normalizeForSearch(value).replace(/\s+/g, "");
}

function sanitizeType(value: unknown): CatalogType {
  const raw = normalizeText(value).toLowerCase();

  if (
    raw === "club" ||
    raw === "festival" ||
    raw === "party" ||
    raw === "event" ||
    raw === "venue"
  ) {
    return raw;
  }

  return "club";
}

function normalizeUrl(value: unknown): string {
  const raw = normalizeText(value);

  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  if (raw.startsWith("www.")) {
    return `https://${raw}`;
  }

  return "";
}

function getHostLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isInstagramUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("instagram.com");
  } catch {
    return false;
  }
}

function normalizeInstagramProfileUrl(url: string): string {
  try {
    const parsed = new URL(url);

    if (!parsed.hostname.includes("instagram.com")) {
      return "";
    }

    const parts = parsed.pathname
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);

    if (!parts.length) return "";

    const blocked = new Set([
      "p",
      "reel",
      "reels",
      "stories",
      "explore",
      "tv",
      "accounts",
      "direct",
    ]);

    if (blocked.has(parts[0].toLowerCase())) {
      return "";
    }

    return `https://www.instagram.com/${parts[0]}/`;
  } catch {
    return "";
  }
}

function isGoodSourceUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (
      host.includes("google.") ||
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("facebook.com") ||
      host.includes("tiktok.com") ||
      host.includes("x.com") ||
      host.includes("twitter.com") ||
      host.includes("linkedin.com")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function getStrongSearchTokens(value: unknown): string[] {
  const normalized = normalizeForSearch(value);

  if (!normalized) return [];

  return Array.from(
    new Set(
      normalized
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
        .filter((token) => !GENERIC_SEARCH_WORDS.has(token))
    )
  );
}

function hasStrongTokenMatch(text: string, token: string): boolean {
  const normalizedText = normalizeForSearch(text);
  const compactText = compactSearch(text);

  return normalizedText.includes(token) || compactText.includes(token);
}

function inferKnownLocationFromQuery(query: string): KnownLocation | null {
  const normalized = normalizeForSearch(query);

  if (!normalized) return null;

  if (normalized.includes("laroc") || normalized.includes("ame")) {
    return {
      city: "Valinhos",
      state: "SP",
    };
  }

  if (normalized.includes("green valley") || normalized.includes("greenvalley")) {
    return {
      city: "Camboriú",
      state: "SC",
    };
  }

  if (normalized.includes("surreal")) {
    return {
      city: "Camboriú",
      state: "SC",
    };
  }

  if (normalized.includes("warung")) {
    return {
      city: "Itajaí",
      state: "SC",
    };
  }

  return null;
}

function inferCityFromText(text: string, fallbackCity = ""): string {
  const normalized = normalizeForSearch(text);

  if (normalized.includes("valinhos")) return "Valinhos";
  if (normalized.includes("campinas")) return "Campinas";
  if (normalized.includes("balneario camboriu")) return "Balneário Camboriú";
  if (normalized.includes("camboriu")) return "Camboriú";
  if (normalized.includes("itajai")) return "Itajaí";
  if (normalized.includes("sao paulo")) return "São Paulo";
  if (normalized.includes("rio de janeiro")) return "Rio de Janeiro";
  if (normalized.includes("curitiba")) return "Curitiba";
  if (normalized.includes("florianopolis")) return "Florianópolis";
  if (normalized.includes("belo horizonte")) return "Belo Horizonte";

  return fallbackCity;
}

function inferStateFromText(text: string, fallbackState = ""): string {
  const normalized = normalizeForSearch(` ${text} `);

  if (
    normalized.includes(" valinhos ") ||
    normalized.includes(" campinas ") ||
    normalized.includes(" sp ") ||
    normalized.includes("/sp") ||
    normalized.includes(" sao paulo")
  ) {
    return "SP";
  }

  if (
    normalized.includes(" sc ") ||
    normalized.includes("/sc") ||
    normalized.includes(" sc brasil") ||
    normalized.includes("santa catarina") ||
    normalized.includes("camboriu") ||
    normalized.includes("itajai")
  ) {
    return "SC";
  }

  if (
    normalized.includes(" rj ") ||
    normalized.includes("/rj") ||
    normalized.includes(" rio de janeiro")
  ) {
    return "RJ";
  }

  if (
    normalized.includes(" pr ") ||
    normalized.includes("/pr") ||
    normalized.includes(" curitiba")
  ) {
    return "PR";
  }

  if (
    normalized.includes(" mg ") ||
    normalized.includes("/mg") ||
    normalized.includes(" minas gerais")
  ) {
    return "MG";
  }

  return fallbackState;
}

function cleanResultTitle(title: string): string {
  return normalizeText(title)
    .replace(/\s*•\s*Instagram photos and videos\s*$/i, "")
    .replace(/\s*-\s*Instagram photos and videos\s*$/i, "")
    .replace(/\s*\|\s*Instagram photos and videos\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function resultLooksRelevant(result: TavilyResult, query: string): boolean {
  const strongTokens = getStrongSearchTokens(query);
  const text = normalizeForSearch(
    `${result.title || ""} ${result.url || ""} ${result.content || ""}`
  );

  if (!strongTokens.length || !text) return false;

  return strongTokens.every((token) => text.includes(token));
}

function getCatalogSearchText(row: ClubCatalogRow): string {
  return [
    row.name,
    row.normalized_name,
    row.city,
    row.state,
    row.official_url,
    row.instagram_url,
    row.source_url,
    row.source_name,
  ]
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .join(" ");
}

function scoreCatalogRow(
  row: ClubCatalogRow,
  query: string,
  city: string,
  state: string
): number {
  const q = normalizeForSearch(query);
  const qCompact = compactSearch(query);
  const cityNorm = normalizeForSearch(city);
  const stateNorm = normalizeForSearch(state);
  const strongTokens = getStrongSearchTokens(query);

  const rowName = normalizeForSearch(row.name);
  const rowNameCompact = compactSearch(row.name);
  const rowNormalizedName = normalizeForSearch(row.normalized_name);
  const rowNormalizedCompact = compactSearch(row.normalized_name);
  const rowCity = normalizeForSearch(row.city);
  const rowState = normalizeForSearch(row.state);
  const rowOfficial = normalizeText(row.official_url);
  const rowImage = normalizeText(row.image_url);
  const searchableText = getCatalogSearchText(row);

  if (!q || !qCompact) return 0;

  if (strongTokens.length > 0) {
    const matchedTokens = strongTokens.filter((token) =>
      hasStrongTokenMatch(searchableText, token)
    );

    if (matchedTokens.length !== strongTokens.length) {
      return 0;
    }
  } else if (
    rowName !== q &&
    !rowName.includes(q) &&
    !rowNameCompact.includes(qCompact) &&
    !rowNormalizedCompact.includes(qCompact)
  ) {
    return 0;
  }

  let score = 0;

  if (rowName === q) score += 160;
  if (rowName.includes(q)) score += 100;
  if (q.includes(rowName) && rowName.length >= 3) score += 60;

  if (rowNameCompact === qCompact) score += 150;
  if (rowNameCompact.includes(qCompact)) score += 110;
  if (rowNormalizedCompact.includes(qCompact)) score += 110;
  if (rowNormalizedName.includes(q)) score += 80;

  for (const token of strongTokens) {
    if (rowName.includes(token)) score += 35;
    if (rowNormalizedName.includes(token)) score += 35;
    if (rowNameCompact.includes(token)) score += 25;
    if (rowNormalizedCompact.includes(token)) score += 25;
  }

  if (cityNorm && rowCity && rowCity.includes(cityNorm)) score += 15;
  if (cityNorm && rowCity && cityNorm.includes(rowCity) && rowCity.length >= 3) {
    score += 8;
  }

  if (stateNorm && rowState === stateNorm) score += 8;

  if (rowOfficial) score += 12;
  if (rowImage) score += 12;
  if (row.is_verified) score += 25;

  score += Math.min(Number(row.usage_count || 0), 10);

  return score;
}

function rowToSuggestion(row: ClubCatalogRow): SearchSuggestion {
  const officialUrl = normalizeUrl(row.official_url);
  const instagramUrl = normalizeUrl(row.instagram_url);
  const sourceUrl = normalizeUrl(row.source_url) || officialUrl || instagramUrl;

  return {
    id: row.id,
    name: normalizeText(row.name),
    type: sanitizeType(row.type),
    city: normalizeText(row.city),
    state: normalizeText(row.state),
    country: normalizeText(row.country) || "Brasil",
    image_url: normalizeUrl(row.image_url),
    official_url: officialUrl,
    instagram_url: instagramUrl,
    source_url: sourceUrl,
    source_name: normalizeText(row.source_name) || getHostLabel(sourceUrl),
    source_provider: normalizeText(row.source_provider) || "catalog",
    is_verified: Boolean(row.is_verified),
    is_from_catalog: true,
  };
}

function tavilyResultToSuggestion(
  result: TavilyResult,
  query: string,
  type: CatalogType,
  knownLocation: KnownLocation | null
): SearchSuggestion | null {
  const originalTitle = normalizeText(result.title);
  const title = cleanResultTitle(originalTitle) || originalTitle;
  const url = normalizeUrl(result.url);
  const content = normalizeText(result.content);

  if (!title || !url || !isGoodSourceUrl(url)) {
    return null;
  }

  const instagramUrl = isInstagramUrl(url) ? normalizeInstagramProfileUrl(url) : "";
  const officialUrl = instagramUrl ? "" : url;
  const sourceUrl = instagramUrl || officialUrl || url;
  const sourceName = getHostLabel(sourceUrl);

  if (!sourceUrl) return null;

  const combinedText = `${title} ${content} ${url}`;
  const inferredCity =
    knownLocation?.city || inferCityFromText(combinedText, "");
  const inferredState =
    knownLocation?.state || inferStateFromText(combinedText, "");

  const maybeImage = normalizeUrl((result as { image_url?: unknown }).image_url);

  return {
    name: title || query,
    type,
    city: inferredCity,
    state: inferredState,
    country: "Brasil",
    image_url: maybeImage,
    official_url: officialUrl,
    instagram_url: instagramUrl,
    source_url: sourceUrl,
    source_name: sourceName,
    source_provider: "tavily",
    is_verified: false,
    is_from_catalog: false,
  };
}

function scoreSuggestion(item: SearchSuggestion, query: string): number {
  const strongTokens = getStrongSearchTokens(query);
  const text = normalizeForSearch(
    `${item.name} ${item.official_url} ${item.instagram_url} ${item.source_url} ${item.source_name}`
  );

  let score = 0;

  for (const token of strongTokens) {
    if (text.includes(token)) score += 35;
  }

  const queryCompact = compactSearch(query);
  const itemCompact = compactSearch(`${item.name} ${item.source_url}`);

  if (queryCompact && itemCompact.includes(queryCompact)) score += 90;

  if (item.is_from_catalog) score += 100;
  if (item.is_verified) score += 35;
  if (item.image_url) score += 25;
  if (item.official_url) score += 35;
  if (item.instagram_url) score += 10;
  if (item.source_name && !item.source_name.includes("instagram.com")) score += 20;
  if (item.city) score += 8;
  if (item.state) score += 8;

  return score;
}

function dedupeSuggestions(items: SearchSuggestion[]): SearchSuggestion[] {
  const map = new Map<string, SearchSuggestion>();

  for (const item of items) {
    const key =
      normalizeUrl(item.official_url) ||
      normalizeUrl(item.instagram_url) ||
      normalizeUrl(item.source_url) ||
      compactSearch(item.name);

    if (!key) continue;

    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      continue;
    }

    const existingScore =
      (existing.is_from_catalog ? 100 : 0) +
      (existing.is_verified ? 30 : 0) +
      (existing.image_url ? 20 : 0) +
      (existing.official_url ? 20 : 0) +
      (existing.source_name && !existing.source_name.includes("instagram.com")
        ? 10
        : 0);

    const currentScore =
      (item.is_from_catalog ? 100 : 0) +
      (item.is_verified ? 30 : 0) +
      (item.image_url ? 20 : 0) +
      (item.official_url ? 20 : 0) +
      (item.source_name && !item.source_name.includes("instagram.com") ? 10 : 0);

    if (currentScore > existingScore) {
      map.set(key, item);
    }
  }

  return Array.from(map.values()).slice(0, 6);
}

async function searchCatalog(params: {
  query: string;
  type: CatalogType;
  city: string;
  state: string;
}): Promise<SearchSuggestion[]> {
  const supabase = createPublicClient();

  const queryNorm = normalizeForSearch(params.query);
  const queryCompact = compactSearch(params.query);
  const strongTokens = getStrongSearchTokens(params.query);

  if (!queryNorm || !queryCompact) {
    return [];
  }

  const orParts = [
    `name.ilike.%${params.query}%`,
    `name.ilike.%${queryNorm}%`,
    `normalized_name.ilike.%${queryNorm}%`,
    `normalized_name.ilike.%${queryCompact}%`,
    ...strongTokens.slice(0, 4).flatMap((token) => [
      `name.ilike.%${token}%`,
      `normalized_name.ilike.%${token}%`,
      `official_url.ilike.%${token}%`,
      `instagram_url.ilike.%${token}%`,
      `source_url.ilike.%${token}%`,
    ]),
  ];

  const { data, error } = await supabase
    .from("club_event_catalog")
    .select(
      "id,name,type,city,state,country,image_url,official_url,instagram_url,source_url,source_name,source_provider,is_verified,usage_count,normalized_name"
    )
    .eq("type", params.type)
    .or(orParts.join(","))
    .limit(30);

  if (error) {
    console.error("[club-catalog/search] catalog search error:", error);
    return [];
  }

  const rows = ((data || []) as ClubCatalogRow[])
    .map((row) => ({
      row,
      score: scoreCatalogRow(row, params.query, params.city, params.state),
    }))
    .filter((item) => item.score >= 80)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.row);

  return dedupeSuggestions(rows.map(rowToSuggestion));
}

async function searchTavily(params: {
  query: string;
  type: CatalogType;
  city: string;
  state: string;
}): Promise<SearchSuggestion[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return [];
  }

  const knownLocation = inferKnownLocationFromQuery(params.query);

  const searchTerms = [
    params.query,
    knownLocation?.city || "",
    knownLocation?.state || "",
    params.type,
    "site oficial Instagram Brasil",
  ]
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .join(" ");

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: searchTerms,
        search_depth: "basic",
        include_answer: false,
        include_images: true,
        include_raw_content: false,
        max_results: 8,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[club-catalog/search] tavily error:", response.status, text);
      return [];
    }

    const data = (await response.json()) as {
      results?: TavilyResult[];
      images?: string[];
    };

    const imageFromTavily = Array.isArray(data.images)
      ? normalizeUrl(data.images[0])
      : "";

    const suggestions = (data.results || [])
      .filter((result) => resultLooksRelevant(result, params.query))
      .map((result) => {
        const suggestion = tavilyResultToSuggestion(
          result,
          params.query,
          params.type,
          knownLocation
        );

        if (!suggestion) return null;

        if (!suggestion.image_url && imageFromTavily) {
          suggestion.image_url = imageFromTavily;
        }

        return suggestion;
      })
      .filter(Boolean) as SearchSuggestion[];

    const sortedSuggestions = suggestions.sort(
      (a, b) => scoreSuggestion(b, params.query) - scoreSuggestion(a, params.query)
    );

    return dedupeSuggestions(sortedSuggestions);
  } catch (error) {
    console.error("[club-catalog/search] tavily exception:", error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      query?: unknown;
      type?: unknown;
      city?: unknown;
      state?: unknown;
    };

    const query = normalizeText(payload.query);
    const type = sanitizeType(payload.type);
    const city = normalizeText(payload.city);
    const state = normalizeText(payload.state);

    if (query.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          error: "Digite pelo menos 2 caracteres para buscar.",
          source: "validation",
          suggestions: [],
        },
        { status: 400 }
      );
    }

    const catalogSuggestions = await searchCatalog({
      query,
      type,
      city,
      state,
    });

    if (catalogSuggestions.length > 0) {
      return NextResponse.json({
        ok: true,
        source: "catalog",
        suggestions: catalogSuggestions,
      });
    }

    const tavilySuggestions = await searchTavily({
      query,
      type,
      city,
      state,
    });

    return NextResponse.json({
      ok: true,
      source: tavilySuggestions.length > 0 ? "tavily" : "empty",
      suggestions: tavilySuggestions,
    });
  } catch (error) {
    console.error("[club-catalog/search] fatal error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Erro interno ao buscar item do catálogo.",
        source: "error",
        suggestions: [],
      },
      { status: 500 }
    );
  }
}