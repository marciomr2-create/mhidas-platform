// src/app/api/club-catalog/save/route.ts

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type CatalogType = "club" | "festival" | "party" | "event" | "venue";

type SavePayload = {
  name?: unknown;
  type?: unknown;
  city?: unknown;
  state?: unknown;
  country?: unknown;
  image_url?: unknown;
  official_url?: unknown;
  instagram_url?: unknown;
  source_url?: unknown;
  source_name?: unknown;
  source_provider?: unknown;
};

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeCatalogText(value: unknown): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeType(value: unknown): CatalogType {
  const type = normalizeText(value).toLowerCase();

  if (type === "festival") return "festival";
  if (type === "party") return "party";
  if (type === "event") return "event";
  if (type === "venue") return "venue";

  return "club";
}

function normalizeUrl(value: unknown): string {
  const raw = normalizeText(value);

  if (!raw) return "";

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    url.hash = "";

    for (const key of Array.from(url.searchParams.keys())) {
      const lowerKey = key.toLowerCase();

      if (
        lowerKey.startsWith("utm_") ||
        lowerKey === "fbclid" ||
        lowerKey === "igshid" ||
        lowerKey === "ref"
      ) {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    return "";
  }
}

function getHostname(value: unknown): string {
  const url = normalizeUrl(value);

  if (!url) return "";

  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getSourceName(value: unknown): string {
  return getHostname(value);
}

function isInstagramUrl(value: unknown): boolean {
  const url = normalizeUrl(value);

  if (!url) return false;

  try {
    return new URL(url).hostname.toLowerCase().includes("instagram.com");
  } catch {
    return false;
  }
}

function isUsableCatalogImageUrl(value: unknown): boolean {
  const url = normalizeUrl(value);

  if (!url) return false;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const full = url.toLowerCase();

    if (host.includes("lookaside.instagram.com")) return false;
    if (full.includes("google_widget/crawler")) return false;
    if (path.includes("/seo/")) return false;
    if (host.includes("facebook.com")) return false;
    if (host.includes("fbcdn.net")) return false;
    if (host.includes("tiktok.com")) return false;

    return true;
  } catch {
    return false;
  }
}

function resolveUrl(baseUrl: string, maybeUrl: string): string {
  const raw = normalizeText(maybeUrl);

  if (!raw) return "";

  try {
    return normalizeUrl(new URL(raw, baseUrl).toString());
  } catch {
    return normalizeUrl(raw);
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMetaContent(html: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const content = normalizeText(match?.[1]);

    if (content) {
      return decodeHtmlEntities(content);
    }
  }

  return "";
}

async function fetchOgImageFromUrl(pageUrl: string): Promise<string> {
  const url = normalizeUrl(pageUrl);

  if (!url || isInstagramUrl(url)) {
    return "";
  }

  const host = getHostname(url);

  if (
    host.includes("facebook.com") ||
    host.includes("tiktok.com") ||
    host.includes("youtube.com") ||
    host.includes("youtu.be") ||
    host.includes("google.")
  ) {
    return "";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; USECLUBBERSBot/1.0; +https://useclubbers.com.br)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return "";
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("text/html")) {
      return "";
    }

    const html = await response.text();

    const ogImage = extractMetaContent(html, [
      /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image:secure_url["'][^>]*>/i,
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i,
    ]);

    const finalImageUrl = resolveUrl(url, ogImage);

    if (!isUsableCatalogImageUrl(finalImageUrl)) {
      return "";
    }

    return finalImageUrl;
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

async function getBestImageUrl(params: {
  incomingImageUrl: string;
  officialUrl: string;
  sourceUrl: string;
  instagramUrl: string;
}): Promise<string> {
  const incomingImageUrl = normalizeUrl(params.incomingImageUrl);
  const officialUrl = normalizeUrl(params.officialUrl);
  const sourceUrl = normalizeUrl(params.sourceUrl);
  const instagramUrl = normalizeUrl(params.instagramUrl);

  if (isUsableCatalogImageUrl(incomingImageUrl)) {
    return incomingImageUrl;
  }

  const urlsToTry = Array.from(
    new Set([officialUrl, sourceUrl, instagramUrl].map((item) => normalizeUrl(item)).filter(Boolean))
  );

  for (const url of urlsToTry) {
    const imageFromOg = await fetchOgImageFromUrl(url);

    if (isUsableCatalogImageUrl(imageFromOg)) {
      return imageFromOg;
    }
  }

  return "";
}

function cleanCatalogRow(row: Record<string, any>) {
  const imageUrl = normalizeUrl(row.image_url);

  return {
    id: row.id,
    name: normalizeText(row.name),
    type: sanitizeType(row.type),
    city: normalizeText(row.city),
    state: normalizeText(row.state),
    country: normalizeText(row.country) || "Brasil",
    image_url: isUsableCatalogImageUrl(imageUrl) ? imageUrl : "",
    official_url: normalizeUrl(row.official_url),
    instagram_url: normalizeUrl(row.instagram_url),
    source_url: normalizeUrl(row.source_url || row.official_url || row.instagram_url),
    source_name:
      normalizeText(row.source_name) ||
      getSourceName(row.source_url || row.official_url || row.instagram_url),
    source_provider: normalizeText(row.source_provider) || "catalog",
    is_verified: Boolean(row.is_verified),
    usage_count: Number(row.usage_count || 0),
    is_from_catalog: true,
  };
}

async function findExistingCatalogItem(params: {
  supabase: any;
  type: CatalogType;
  normalizedName: string;
  instagramUrl: string;
  officialUrl: string;
  sourceUrl: string;
}) {
  const { supabase, type, normalizedName, instagramUrl, officialUrl, sourceUrl } = params;

  const selectColumns =
    "id,name,type,city,state,country,image_url,official_url,instagram_url,source_url,source_name,source_provider,is_verified,usage_count,created_by_user_id,normalized_name";

  if (instagramUrl) {
    const result = await supabase
      .from("club_event_catalog")
      .select(selectColumns)
      .eq("type", type)
      .eq("instagram_url", instagramUrl)
      .maybeSingle();

    if (result.data) return result.data;
  }

  if (officialUrl) {
    const result = await supabase
      .from("club_event_catalog")
      .select(selectColumns)
      .eq("type", type)
      .eq("official_url", officialUrl)
      .maybeSingle();

    if (result.data) return result.data;
  }

  if (sourceUrl) {
    const result = await supabase
      .from("club_event_catalog")
      .select(selectColumns)
      .eq("type", type)
      .eq("source_url", sourceUrl)
      .maybeSingle();

    if (result.data) return result.data;
  }

  if (normalizedName) {
    const result = await supabase
      .from("club_event_catalog")
      .select(selectColumns)
      .eq("type", type)
      .eq("normalized_name", normalizedName)
      .maybeSingle();

    if (result.data) return result.data;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Usuário não autenticado. Faça login para salvar no catálogo.",
          item: null,
        },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as SavePayload;

    const name = normalizeText(body.name);
    const type = sanitizeType(body.type);
    const city = normalizeText(body.city);
    const state = normalizeText(body.state);
    const country = normalizeText(body.country) || "Brasil";
    const incomingImageUrl = normalizeUrl(body.image_url);
    const officialUrl = normalizeUrl(body.official_url);
    const instagramUrl = normalizeUrl(body.instagram_url);
    const sourceUrl = normalizeUrl(body.source_url || officialUrl || instagramUrl);
    const sourceName = normalizeText(body.source_name) || getSourceName(sourceUrl);
    const sourceProvider = normalizeText(body.source_provider) || "manual";
    const normalizedName = normalizeCatalogText(name);

    if (!name || name.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          error: "Nome inválido para salvar no catálogo.",
          item: null,
        },
        { status: 400 }
      );
    }

    if (!sourceUrl && !officialUrl && !instagramUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "Informe pelo menos uma URL de origem, site oficial ou Instagram.",
          item: null,
        },
        { status: 400 }
      );
    }

    const bestImageUrl = await getBestImageUrl({
      incomingImageUrl,
      officialUrl,
      sourceUrl,
      instagramUrl,
    });

    const existing = await findExistingCatalogItem({
      supabase,
      type,
      normalizedName,
      instagramUrl,
      officialUrl,
      sourceUrl,
    });

    if (existing) {
      const existingGoodImageUrl = isUsableCatalogImageUrl(existing.image_url)
        ? normalizeUrl(existing.image_url)
        : "";

      const updatePayload = {
        name: normalizeText(existing.name) || name,
        normalized_name: normalizeText(existing.normalized_name) || normalizedName,
        type,
        city: normalizeText(existing.city) || city,
        state: normalizeText(existing.state) || state,
        country: normalizeText(existing.country) || country,
        image_url: existingGoodImageUrl || bestImageUrl,
        official_url: normalizeUrl(existing.official_url) || officialUrl,
        instagram_url: normalizeUrl(existing.instagram_url) || instagramUrl,
        source_url: normalizeUrl(existing.source_url) || sourceUrl,
        source_name: normalizeText(existing.source_name) || sourceName,
        source_provider: normalizeText(existing.source_provider) || sourceProvider,
        usage_count: Number(existing.usage_count || 0) + 1,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("club_event_catalog")
        .update(updatePayload)
        .eq("id", existing.id)
        .select(
          "id,name,type,city,state,country,image_url,official_url,instagram_url,source_url,source_name,source_provider,is_verified,usage_count"
        )
        .single();

      if (error) {
        return NextResponse.json(
          {
            ok: false,
            error: error.message,
            item: null,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        action: "updated",
        item: cleanCatalogRow(data),
      });
    }

    const insertPayload = {
      name,
      normalized_name: normalizedName,
      type,
      city,
      state,
      country,
      image_url: bestImageUrl,
      official_url: officialUrl,
      instagram_url: instagramUrl,
      source_url: sourceUrl,
      source_name: sourceName,
      source_provider: sourceProvider,
      is_verified: false,
      usage_count: 1,
      created_by_user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("club_event_catalog")
      .insert(insertPayload)
      .select(
        "id,name,type,city,state,country,image_url,official_url,instagram_url,source_url,source_name,source_provider,is_verified,usage_count"
      )
      .single();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          item: null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      action: "created",
      item: cleanCatalogRow(data),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro inesperado ao salvar no catálogo.",
        item: null,
      },
      { status: 500 }
    );
  }
}