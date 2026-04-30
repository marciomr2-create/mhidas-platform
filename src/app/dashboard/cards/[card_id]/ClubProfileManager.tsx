// src/app/dashboard/cards/[card_id]/ClubProfileManager.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";
import SpotifyArtistPicker from "@/components/SpotifyArtistPicker";

type ClubProfileRow = {
  user_id: string;
  club_tagline: string | null;
  city_base: string | null;
  favorite_genres: string | null;
  favorite_artists: string | null;
  favorite_events: string | null;
  last_events: string | null;
  next_events: string | null;
  next_events_dates: string | null;
  next_events_links: string | null;
  favorite_clubs: string | null;
  playlist_title: string | null;
  playlist_description: string | null;
  club_photo_url: string | null;
  club_photo_prompt: string | null;
  club_photo_style: string | null;

  spotify_url: string | null;
  soundcloud_url: string | null;
  youtube_url: string | null;
  beatport_url: string | null;
  mixcloud_url: string | null;
  apple_music_url: string | null;
  deezer_url: string | null;

  primary_streaming_platform: string | null;

  ride_status: string | null;
  ride_event_name: string | null;
  ride_event_date: string | null;
  ride_event_url: string | null;
  ride_origin: string | null;
  ride_destination: string | null;
  ride_seats: string | null;
  ride_notes: string | null;

  meet_status: string | null;
  meet_event_name: string | null;
  meet_event_date: string | null;
  meet_event_url: string | null;
  meet_meeting_point: string | null;
  meet_time: string | null;
  meet_notes: string | null;
};

type FormState = {
  club_tagline: string;
  city_base: string;
  favorite_genres: string;
  favorite_artists: string;
  favorite_events: string;
  last_events: string;
  next_events: string;
  next_events_dates: string;
  next_events_links: string;
  favorite_clubs: string;
  playlist_title: string;
  playlist_description: string;

  streaming_url: string;
  primary_streaming_platform: string;

  club_photo_url: string;
  club_photo_prompt: string;
  club_photo_style: string;

  spotify_url: string;
  soundcloud_url: string;
  youtube_url: string;
  beatport_url: string;
  mixcloud_url: string;
  apple_music_url: string;
  deezer_url: string;

  ride_status: string;
  ride_event_name: string;
  ride_event_date: string;
  ride_event_url: string;
  ride_origin: string;
  ride_destination: string;
  ride_seats: string;
  ride_notes: string;

  meet_status: string;
  meet_event_name: string;
  meet_event_date: string;
  meet_event_url: string;
  meet_meeting_point: string;
  meet_time: string;
  meet_notes: string;
};

const EMPTY_FORM: FormState = {
  club_tagline: "",
  city_base: "",
  favorite_genres: "",
  favorite_artists: "",
  favorite_events: "",
  last_events: "",
  next_events: "",
  next_events_dates: "",
  next_events_links: "",
  favorite_clubs: "",
  playlist_title: "",
  playlist_description: "",

  streaming_url: "",
  primary_streaming_platform: "",

  club_photo_url: "",
  club_photo_prompt: "",
  club_photo_style: "",

  spotify_url: "",
  soundcloud_url: "",
  youtube_url: "",
  beatport_url: "",
  mixcloud_url: "",
  apple_music_url: "",
  deezer_url: "",

  ride_status: "",
  ride_event_name: "",
  ride_event_date: "",
  ride_event_url: "",
  ride_origin: "",
  ride_destination: "",
  ride_seats: "",
  ride_notes: "",

  meet_status: "",
  meet_event_name: "",
  meet_event_date: "",
  meet_event_url: "",
  meet_meeting_point: "",
  meet_time: "",
  meet_notes: "",
};

function mapRowToForm(row: ClubProfileRow | null): FormState {
  if (!row) return { ...EMPTY_FORM };

  const detectedUrl =
    row.youtube_url ||
    row.spotify_url ||
    row.soundcloud_url ||
    row.apple_music_url ||
    row.deezer_url ||
    row.mixcloud_url ||
    row.beatport_url ||
    "";

  return {
    club_tagline: row.club_tagline ?? "",
    city_base: row.city_base ?? "",
    favorite_genres: row.favorite_genres ?? "",
    favorite_artists: row.favorite_artists ?? "",
    favorite_events: row.favorite_events ?? "",
    last_events: row.last_events ?? "",
    next_events: row.next_events ?? "",
    next_events_dates: row.next_events_dates ?? "",
    next_events_links: row.next_events_links ?? "",
    favorite_clubs: row.favorite_clubs ?? "",
    playlist_title: row.playlist_title ?? "",
    playlist_description: row.playlist_description ?? "",

    streaming_url: detectedUrl,
    primary_streaming_platform: row.primary_streaming_platform ?? "",

    club_photo_url: row.club_photo_url ?? "",
    club_photo_prompt: row.club_photo_prompt ?? "",
    club_photo_style: row.club_photo_style ?? "",

    spotify_url: row.spotify_url ?? "",
    soundcloud_url: row.soundcloud_url ?? "",
    youtube_url: row.youtube_url ?? "",
    beatport_url: row.beatport_url ?? "",
    mixcloud_url: row.mixcloud_url ?? "",
    apple_music_url: row.apple_music_url ?? "",
    deezer_url: row.deezer_url ?? "",

    ride_status: row.ride_status ?? "",
    ride_event_name: row.ride_event_name ?? "",
    ride_event_date: row.ride_event_date ?? "",
    ride_event_url: row.ride_event_url ?? "",
    ride_origin: row.ride_origin ?? "",
    ride_destination: row.ride_destination ?? "",
    ride_seats: row.ride_seats ?? "",
    ride_notes: row.ride_notes ?? "",

    meet_status: row.meet_status ?? "",
    meet_event_name: row.meet_event_name ?? "",
    meet_event_date: row.meet_event_date ?? "",
    meet_event_url: row.meet_event_url ?? "",
    meet_meeting_point: row.meet_meeting_point ?? "",
    meet_time: row.meet_time ?? "",
    meet_notes: row.meet_notes ?? "",
  };
}

function mapFormToPayload(form: FormState) {
  const platform = (form.primary_streaming_platform || "").toLowerCase();
  const url = form.streaming_url?.trim() || "";

  return {
    club_tagline: form.club_tagline || null,
    city_base: form.city_base || null,
    favorite_genres: form.favorite_genres || null,
    favorite_artists: form.favorite_artists || null,
    favorite_events: form.favorite_events || null,
    last_events: form.last_events || null,
    next_events: form.next_events || null,
    next_events_dates: form.next_events_dates || null,
    next_events_links: form.next_events_links || null,
    favorite_clubs: form.favorite_clubs || null,
    playlist_title: form.playlist_title || null,
    playlist_description: form.playlist_description || null,
    club_photo_url: form.club_photo_url || null,
    club_photo_prompt: form.club_photo_prompt || null,
    club_photo_style: form.club_photo_style || null,
    primary_streaming_platform: form.primary_streaming_platform || null,

    youtube_url: null,
    spotify_url: null,
    soundcloud_url: null,
    apple_music_url: null,
    deezer_url: null,
    mixcloud_url: null,
    beatport_url: null,

    ...(platform.includes("youtube") && { youtube_url: url }),
    ...(platform.includes("spotify") && { spotify_url: url }),
    ...(platform.includes("soundcloud") && { soundcloud_url: url }),
    ...(platform.includes("apple") && { apple_music_url: url }),
    ...(platform.includes("deezer") && { deezer_url: url }),
    ...(platform.includes("mixcloud") && { mixcloud_url: url }),
    ...(platform.includes("beatport") && { beatport_url: url }),

    ride_status: form.ride_status || null,
    ride_event_name: form.ride_event_name || null,
    ride_event_date: form.ride_event_date || null,
    ride_event_url: form.ride_event_url || null,
    ride_origin: form.ride_origin || null,
    ride_destination: form.ride_destination || null,
    ride_seats: form.ride_seats || null,
    ride_notes: form.ride_notes || null,

    meet_status: form.meet_status || null,
    meet_event_name: form.meet_event_name || null,
    meet_event_date: form.meet_event_date || null,
    meet_event_url: form.meet_event_url || null,
    meet_meeting_point: form.meet_meeting_point || null,
    meet_time: form.meet_time || null,
    meet_notes: form.meet_notes || null,
  };
}

type ClubProfileManagerProps = {
  clubPublicHref?: string;
  hasPublicSlug?: boolean;
  isPublished?: boolean;
};

type TokenFieldKey =
  | "favorite_genres"
  | "favorite_artists"
  | "favorite_events"
  | "favorite_clubs"
  | "last_events"
  | "next_events";

type CatalogItemType = "genre" | "artist" | "club" | "event";

type CatalogItem = {
  id: string;
  item_type: CatalogItemType;
  name: string;
  subtitle: string | null;
  country_code: string | null;
  city_label: string | null;
  popularity: number | null;
};

type ClubCatalogItemType = "club" | "festival" | "party" | "event" | "venue";

type ClubCatalogSuggestion = {
  id?: string;
  name: string;
  type: ClubCatalogItemType;
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

type BrazilCityItem = {
  id: string;
  city_name: string;
  state_code: string;
  display_name: string;
  sort_rank: number | null;
};

type PromptPreset = {
  id: string;
  title: string;
  subtitle: string;
  style: string;
  prompt: string;
};

const CLUB_BUCKET = "club-photos";

const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "artist-monochrome",
    title: "Artista monocromÃ¡tico",
    subtitle: "EstÃ©tica forte, preto e branco, presenÃ§a de artista",
    style: "monocromÃ¡tico artÃ­stico premium",
    prompt:
      "Use esta foto como base e preserve fielmente rosto, cabelo, barba e identidade visual real. Gere uma foto de perfil artÃ­stica voltada Ã  cena eletrÃ´nica, em preto e branco premium, iluminaÃ§Ã£o dramÃ¡tica, contraste alto, atmosfera elegante, expressÃ£o segura, enquadramento de retrato, aparÃªncia de artista ou clubber sofisticado, sem caricatura, sem perder autenticidade facial.",
  },
  {
    id: "festival-neon",
    title: "Festival neon",
    subtitle: "Energia de palco, festival e lifestyle eletrÃ´nico",
    style: "festival neon electronic scene",
    prompt:
      "Use esta foto como imagem base, mantendo identidade real da pessoa. Gere uma foto de perfil inspirada na cena eletrÃ´nica e festivais, com atmosfera premium, luzes neon discretas, sensaÃ§Ã£o noturna, estÃ©tica moderna, roupa alinhada ao lifestyle clubber, presenÃ§a forte e visual marcante, mantendo o rosto reconhecÃ­vel e realista.",
  },
  {
    id: "underground-shadow",
    title: "Underground shadow",
    subtitle: "Mais dark, sofisticado e club culture",
    style: "underground shadow club culture",
    prompt:
      "Use esta foto como base, preservando completamente a identidade facial. Gere um retrato de perfil com linguagem visual underground, sombra elegante, fundo escuro, iluminaÃ§Ã£o lateral refinada, estÃ©tica de club culture, ar misterioso e sofisticado, sem exagero artificial, com realismo elevado e presenÃ§a forte.",
  },
  {
    id: "dj-premium",
    title: "DJ premium",
    subtitle: "Foto com autoridade visual de artista da cena",
    style: "dj premium portrait",
    prompt:
      "Use esta foto como base e mantenha traÃ§os reais do rosto. Gere uma foto de perfil premium no estilo retrato de DJ ou artista da cena eletrÃ´nica, com visual contemporÃ¢neo, iluminaÃ§Ã£o bem trabalhada, postura segura, fundo limpo ou noturno sofisticado, percepÃ§Ã£o de alto valor e identidade visual forte.",
  },
  {
    id: "cinematic-clubber",
    title: "Cinematic clubber",
    subtitle: "Mais lifestyle e pertencimento",
    style: "cinematic clubber lifestyle",
    prompt:
      "Use esta foto como imagem base e preserve fielmente a identidade visual real. Gere uma foto de perfil cinematogrÃ¡fica voltada ao universo clubber e Ã  cena eletrÃ´nica, com profundidade, iluminaÃ§Ã£o refinada, visual moderno, atmosfera premium, tom emocional e sensaÃ§Ã£o de pertencimento Ã  cultura eletrÃ´nica.",
  },
];

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim();
}

function normalizeSearchText(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hasContent(value: string | null | undefined) {
  return normalizeText(value).length > 0;
}

function splitPreferences(value: string | null | undefined) {
  const text = normalizeText(value);
  if (!text) return [];

  return text
    .split(/,|â€¢|;|\|/)
    .map((part) => normalizeText(part))
    .filter(Boolean);
}

function firstPreference(value: string | null | undefined) {
  return splitPreferences(value)[0] || "";
}

function containsPreference(currentValue: string, valueToCheck: string) {
  const target = normalizeSearchText(valueToCheck);

  return splitPreferences(currentValue)
    .map((part) => normalizeSearchText(part))
    .includes(target);
}

function uniqueItems(items: string[]) {
  return Array.from(
    new Map(
      items
        .map((item) => normalizeText(item))
        .filter(Boolean)
        .map((item) => [normalizeSearchText(item), item])
    ).values()
  );
}

function parseCityBase(value: string) {
  const text = normalizeText(value);

  if (!text) {
    return { city: "", state: "" };
  }

  const match = text.match(/^(.*?)(?:\s*-\s*|\s*,\s*)([A-Z]{2})$/i);

  if (!match) {
    return { city: text, state: "" };
  }

  return {
    city: normalizeText(match[1]),
    state: normalizeText(match[2]).toUpperCase(),
  };
}

function buildGeneratedBelonging(form: FormState) {
  const city = normalizeText(form.city_base);
  const genre = firstPreference(form.favorite_genres);
  const artist = firstPreference(form.favorite_artists);
  const club = firstPreference(form.favorite_clubs);
  const event = firstPreference(form.favorite_events);

  if (artist && club && event && city) {
    return `FaÃ§o parte do universo ${artist}, me reconheÃ§o em ${club}, vivo experiÃªncias como ${event} e levo essa identidade comigo em ${city}.`;
  }

  if (artist && club && event) {
    return `FaÃ§o parte do universo ${artist}, me reconheÃ§o em ${club} e busco viver experiÃªncias como ${event}.`;
  }

  if (artist && club) {
    return `Me identifico com o universo ${artist} e com a energia de ${club}.`;
  }

  if (club && event) {
    return `Me sinto parte de ${club} e busco viver experiÃªncias como ${event}.`;
  }

  if (genre && club) {
    return `Minha identidade passa por ${genre} e por referÃªncias como ${club}.`;
  }

  if (artist) {
    return `Minha identidade na cena passa por referÃªncias como ${artist}.`;
  }

  return "";
}

function getRideStatusLabel(value: string) {
  if (value === "offer") return "Oferecendo carona";
  if (value === "need") return "Procurando carona";
  if (value === "both") return "Oferece e tambÃ©m procura";
  return "Ainda nÃ£o definido.";
}

function getMeetStatusLabel(value: string) {
  if (value === "host") return "Abrindo ponto de encontro";
  if (value === "join") return "Quer entrar em um encontro";
  if (value === "both") return "Pode abrir ou entrar";
  return "Ainda nÃ£o definido.";
}

function formatCatalogMeta(item: CatalogItem) {
  const parts = [
    normalizeText(item.subtitle),
    normalizeText(item.city_label),
    normalizeText(item.country_code),
  ].filter(Boolean);

  return parts.join(" â€¢ ");
}

function formatClubCatalogLocation(item: ClubCatalogSuggestion) {
  const parts = [
    normalizeText(item.city),
    normalizeText(item.state),
    normalizeText(item.country),
  ].filter(Boolean);

  return parts.join(" - ");
}

function getClubCatalogMainUrl(item: ClubCatalogSuggestion) {
  return (
    normalizeText(item.official_url) ||
    normalizeText(item.instagram_url) ||
    normalizeText(item.source_url)
  );
}

function getClubCatalogTypeLabel(value: ClubCatalogItemType) {
  if (value === "festival") return "Festival";
  if (value === "party") return "Festa";
  if (value === "event") return "Evento";
  if (value === "venue") return "Local";
  return "Club";
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9.\-_]/g, "")
    .toLowerCase();
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler imagem."));
    reader.readAsDataURL(file);
  });
}

function sectionStyle() {
  return {
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    display: "grid",
    gap: 14,
  } as const;
}

function inputStyle() {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    outline: "none",
  } as const;
}

function selectStyle() {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    outline: "none",
    colorScheme: "dark" as const,
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    MozAppearance: "none" as const,
  };
}

function selectOptionStyle() {
  return {
    background: "#111",
    color: "#fff",
  } as const;
}

function textareaStyle() {
  return {
    ...inputStyle(),
    minHeight: 90,
    resize: "vertical" as const,
  };
}

function labelTitleStyle() {
  return {
    display: "block",
    marginBottom: 8,
    fontWeight: 700,
    fontSize: 14,
  } as const;
}

function helperTextStyle() {
  return {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 1.55,
    opacity: 0.72,
  } as const;
}

function buttonStyle(disabled = false) {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: disabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 800,
    textDecoration: "none",
    opacity: disabled ? 0.55 : 1,
  } as const;
}

function primaryButtonStyle(disabled = false) {
  return {
    ...buttonStyle(disabled),
    border: disabled
      ? "1px solid rgba(255,255,255,0.12)"
      : "1px solid rgba(0,200,120,0.30)",
    background: disabled ? "rgba(255,255,255,0.03)" : "rgba(0,200,120,0.12)",
  } as const;
}

function presetCardStyle(active: boolean) {
  return {
    padding: 14,
    borderRadius: 14,
    border: active
      ? "1px solid rgba(0,200,120,0.28)"
      : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(0,200,120,0.08)" : "rgba(255,255,255,0.03)",
    display: "grid",
    gap: 10,
  } as const;
}

function searchBlockStyle() {
  return {
    display: "grid",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    marginTop: 10,
  } as const;
}

function selectedTokensWrapStyle() {
  return {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
    marginTop: 12,
  };
}

function selectedTokenStyle() {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
  } as const;
}

function tokenRemoveButtonStyle() {
  return {
    width: 18,
    height: 18,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    lineHeight: 1,
    padding: 0,
  } as const;
}

function suggestionButtonStyle(active = false) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 10px",
    borderRadius: 12,
    border: active
      ? "1px solid rgba(0,200,120,0.28)"
      : "1px solid rgba(255,255,255,0.10)",
    background: active ? "rgba(0,200,120,0.10)" : "rgba(255,255,255,0.04)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    textAlign: "left" as const,
  };
}

function previewCardStyle() {
  return {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    display: "grid",
    gap: 6,
  } as const;
}

function useDebouncedValue<T>(value: T, delay = 220) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function useCatalogSearch(
  supabase: ReturnType<typeof createBrowserClient>,
  itemType: CatalogItemType,
  query: string
) {
  const normalizedQuery = useDebouncedValue(normalizeSearchText(query), 220);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function run() {
      if (!normalizedQuery) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("catalog_items")
        .select("id, item_type, name, subtitle, country_code, city_label, popularity")
        .eq("item_type", itemType)
        .eq("is_active", true)
        .ilike("normalized_name", `%${normalizedQuery}%`)
        .order("popularity", { ascending: false })
        .order("name", { ascending: true })
        .limit(12);

      if (!active) return;

      setItems(error ? [] : ((data as CatalogItem[]) || []));
      setLoading(false);
    }

    void run();

    return () => {
      active = false;
    };
  }, [supabase, itemType, normalizedQuery]);

  return { items, loading };
}

function useBrazilCitySearch(
  supabase: ReturnType<typeof createBrowserClient>,
  query: string
) {
  const normalizedQuery = useDebouncedValue(normalizeSearchText(query), 220);
  const [items, setItems] = useState<BrazilCityItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function run() {
      if (!normalizedQuery) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("br_cities")
        .select("id, city_name, state_code, display_name, sort_rank")
        .eq("is_active", true)
        .ilike("search_name", `%${normalizedQuery}%`)
        .order("sort_rank", { ascending: false })
        .order("display_name", { ascending: true })
        .limit(12);

      if (!active) return;

      setItems(error ? [] : ((data as BrazilCityItem[]) || []));
      setLoading(false);
    }

    void run();

    return () => {
      active = false;
    };
  }, [supabase, normalizedQuery]);

  return { items, loading };
}

type CatalogTokenFieldProps = {
  label: string;
  helperText: string;
  placeholder: string;
  fieldKey: TokenFieldKey;
  formValue: string;
  draftValue: string;
  setDraftValue: (value: string) => void;
  suggestions: CatalogItem[];
  loading: boolean;
  onCommit: (key: TokenFieldKey, draftValue: string, clearDraft: () => void) => void;
  onRemove: (key: TokenFieldKey, value: string) => void;
  onToggleSuggestion: (key: TokenFieldKey, value: string) => void;
};

function CatalogTokenField({
  label,
  helperText,
  placeholder,
  fieldKey,
  formValue,
  draftValue,
  setDraftValue,
  suggestions,
  loading,
  onCommit,
  onRemove,
  onToggleSuggestion,
}: CatalogTokenFieldProps) {
  const selectedItems = uniqueItems(splitPreferences(formValue));

  return (
    <label>
      <span style={labelTitleStyle()}>{label}</span>

      <input
        value={draftValue}
        onChange={(e) => setDraftValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "," || e.key === ";") {
            e.preventDefault();
            onCommit(fieldKey, draftValue, () => setDraftValue(""));
          }
        }}
        onBlur={() => onCommit(fieldKey, draftValue, () => setDraftValue(""))}
        placeholder={placeholder}
        style={inputStyle()}
      />

      <div style={helperTextStyle()}>{helperText}</div>

      {selectedItems.length > 0 ? (
        <div style={selectedTokensWrapStyle()}>
          {selectedItems.map((item, index) => (
            <span key={`${fieldKey}-${normalizeSearchText(item)}-${index}`} style={selectedTokenStyle()}>
              {item}
              <button
                type="button"
                onClick={() => onRemove(fieldKey, item)}
                style={tokenRemoveButtonStyle()}
                aria-label={`Remover ${item}`}
              >
                Ã—
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div style={searchBlockStyle()}>
        <strong>SugestÃµes globais</strong>

        {loading ? (
          <div style={{ fontSize: 12, opacity: 0.74 }}>
            Buscando no catÃ¡logo global...
          </div>
        ) : suggestions.length > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggleSuggestion(fieldKey, item.name)}
                style={suggestionButtonStyle(containsPreference(formValue, item.name))}
              >
                <span>{item.name}</span>
                {formatCatalogMeta(item) ? (
                  <span style={{ fontSize: 11, opacity: 0.72 }}>
                    {formatCatalogMeta(item)}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.74 }}>
            Nada encontrado no catÃ¡logo global para este termo. Pode escrever manualmente e pressionar Enter.
          </div>
        )}
      </div>
    </label>
  );
}

type AssistedClubCatalogSearchProps = {
  cityBase: string;
  onUseSuggestion: (
    suggestion: ClubCatalogSuggestion,
    tokenName: string,
    forcedTargetKey?: TokenFieldKey
  ) => Promise<void> | void;
  onMessage: (message: string) => void;
  initialType?: ClubCatalogItemType;
  fixedTargetKey?: TokenFieldKey;
  title?: string;
  description?: string;
  placeholder?: string;
};

function AssistedClubCatalogSearch({
  cityBase,
  onUseSuggestion,
  onMessage,
  initialType = "club",
  fixedTargetKey,
  title = "Busca assistida de club, festa ou local com imagem",
  description = "Use quando quiser trazer imagem e fonte oficial para o catálogo interno. Depois usaremos estes dados para mostrar os itens com imagem na página pública.",
  placeholder = "Ex: Surreal Park, Green Valley, Laroc Club",
}: AssistedClubCatalogSearchProps) {
  const [query, setQuery] = useState("");
  const [itemType, setItemType] = useState<ClubCatalogItemType>(initialType);
  const [suggestions, setSuggestions] = useState<ClubCatalogSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [localMessage, setLocalMessage] = useState("");

  const parsedCity = parseCityBase(cityBase);

  async function searchOfficialClubCatalog() {
    const cleanQuery = normalizeText(query);

    if (cleanQuery.length < 2) {
      setLocalMessage("Digite pelo menos 2 caracteres para buscar.");
      return;
    }

    setLoading(true);
    setLocalMessage("");
    setSuggestions([]);

    try {
      const response = await fetch("/api/club-catalog/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: cleanQuery,
          type: itemType,
          city: parsedCity.city,
          state: parsedCity.state,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "NÃ£o foi possÃ­vel buscar agora.");
      }

      const nextSuggestions = Array.isArray(data.suggestions)
        ? (data.suggestions as ClubCatalogSuggestion[])
        : [];

      setSuggestions(nextSuggestions);

      if (nextSuggestions.length === 0) {
        setLocalMessage("Nenhuma sugestÃ£o encontrada. Tente o nome oficial ou o Instagram do local.");
      } else if (data.source === "catalog") {
        setLocalMessage("Resultado encontrado no catÃ¡logo interno.");
      } else {
        setLocalMessage("Resultado encontrado por busca assistida. Confirme o item correto para salvar no catÃ¡logo.");
      }
    } catch (error) {
      setLocalMessage(
        error instanceof Error ? error.message : "NÃ£o foi possÃ­vel buscar agora."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveSuggestion(item: ClubCatalogSuggestion, index: number) {
    const key = `${item.source_url || item.instagram_url || item.official_url || item.name}-${index}`;

    setSavingKey(key);
    setLocalMessage("");

    try {
      const payload = {
        name: item.name,
        type: item.type || itemType,
        city: item.city || parsedCity.city,
        state: item.state || parsedCity.state,
        country: item.country || "Brasil",
        image_url: item.image_url,
        official_url: item.official_url,
        instagram_url: item.instagram_url,
        source_url: item.source_url || item.official_url || item.instagram_url,
        source_name: item.source_name,
        source_provider: item.source_provider || "dashboard",
      };

      const response = await fetch("/api/club-catalog/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "NÃ£o foi possÃ­vel salvar este item no catÃ¡logo.");
      }

      const confirmedItem = (data.item || item) as ClubCatalogSuggestion;
      const tokenName = normalizeText(confirmedItem.name || item.name) || normalizeText(query);

      await onUseSuggestion(confirmedItem, tokenName, fixedTargetKey);

      const successMessage = `${tokenName || confirmedItem.name || item.name} foi salvo no catálogo e no Club Mode.`;
      setLocalMessage(successMessage);
      onMessage(successMessage);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "NÃ£o foi possÃ­vel salvar este item.";
      setLocalMessage(errorMessage);
      onMessage(errorMessage);
    } finally {
      setSavingKey("");
    }
  }

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(0,200,120,0.18)",
        background: "rgba(0,200,120,0.055)",
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <strong>{title}</strong>
        <div style={{ fontSize: 12, lineHeight: 1.55, opacity: 0.76 }}>
          {description}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 160px",
          gap: 10,
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void searchOfficialClubCatalog();
            }
          }}
          placeholder={placeholder}
          style={inputStyle()}
        />

        <select
          value={itemType}
          onChange={(e) => setItemType(e.target.value as ClubCatalogItemType)}
          style={selectStyle()}
        >
          <option value="club" style={selectOptionStyle()}>
            Club
          </option>
          <option value="festival" style={selectOptionStyle()}>
            Festival
          </option>
          <option value="party" style={selectOptionStyle()}>
            Festa
          </option>
          <option value="event" style={selectOptionStyle()}>
            Evento
          </option>
          <option value="venue" style={selectOptionStyle()}>
            Local
          </option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={searchOfficialClubCatalog}
          disabled={loading}
          style={primaryButtonStyle(loading)}
        >
          {loading ? "Buscando..." : "Buscar imagem e fonte oficial"}
        </button>
      </div>

      {localMessage ? (
        <div style={{ fontSize: 12, lineHeight: 1.55, opacity: 0.82 }}>
          {localMessage}
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <div style={{ display: "grid", gap: 12 }}>
          {suggestions.map((item, index) => {
            const mainUrl = getClubCatalogMainUrl(item);
            const key = `${item.source_url || item.instagram_url || item.official_url || item.name}-${index}`;
            const isSaving = savingKey === key;

            return (
              <div
                key={key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "96px minmax(0, 1fr)",
                  gap: 12,
                  padding: 12,
                  borderRadius: 14,
                  border: item.is_from_catalog
                    ? "1px solid rgba(0,200,120,0.24)"
                    : "1px solid rgba(255,255,255,0.12)",
                  background: item.is_from_catalog
                    ? "rgba(0,200,120,0.08)"
                    : "rgba(255,255,255,0.04)",
                }}
              >
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 11, opacity: 0.68, textAlign: "center" }}>
                      Sem imagem
                    </span>
                  )}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{item.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.72, marginTop: 3 }}>
                      {getClubCatalogTypeLabel(item.type)}
                      {formatClubCatalogLocation(item)
                        ? ` â€¢ ${formatClubCatalogLocation(item)}`
                        : ""}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.62, marginTop: 3 }}>
                      Fonte: {item.source_name || item.source_provider || "busca assistida"}
                      {item.is_from_catalog ? " â€¢ jÃ¡ estava no catÃ¡logo" : ""}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => saveSuggestion(item, index)}
                      disabled={isSaving}
                      style={primaryButtonStyle(isSaving)}
                    >
                      {isSaving ? "Salvando..." : "Usar este"}
                    </button>

                    {mainUrl ? (
                      <a
                        href={mainUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={buttonStyle()}
                      >
                        Abrir fonte
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function ClubProfileManager({
  clubPublicHref = "",
}: ClubProfileManagerProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [localPhotoPreview, setLocalPhotoPreview] = useState("");
  const [photoTouched, setPhotoTouched] = useState(false);

  const [genreDraft, setGenreDraft] = useState("");
  const [artistDraft, setArtistDraft] = useState("");
  const [clubDraft, setClubDraft] = useState("");
  const [favoriteEventDraft, setFavoriteEventDraft] = useState("");
  const [lastEventDraft, setLastEventDraft] = useState("");
  const [nextEventDraft, setNextEventDraft] = useState("");

  const citySearch = useBrazilCitySearch(supabase, form.city_base);
  const genreSearch = useCatalogSearch(supabase, "genre", genreDraft);
  const artistSearch = useCatalogSearch(supabase, "artist", artistDraft);
  const clubSearch = useCatalogSearch(supabase, "club", clubDraft);
  const favoriteEventSearch = useCatalogSearch(supabase, "event", favoriteEventDraft);
  const lastEventSearch = useCatalogSearch(supabase, "event", lastEventDraft);
  const nextEventSearch = useCatalogSearch(supabase, "event", nextEventDraft);

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("club_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setMessage("NÃ£o foi possÃ­vel carregar o Club Mode.");
      setLoading(false);
      return;
    }

    setForm(mapRowToForm((data as ClubProfileRow) || null));
    setLoading(false);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setTokenItems(key: TokenFieldKey, items: string[]) {
    setForm((prev) => ({
      ...prev,
      [key]: uniqueItems(items).join(", "),
    }));
  }

  function addTokenItem(key: TokenFieldKey, rawValue: string) {
    const nextValues = rawValue
      .split(/,|;|\n|\|/)
      .map((item) => normalizeText(item))
      .filter(Boolean);

    if (nextValues.length === 0) return;

    setTokenItems(key, [...splitPreferences(form[key]), ...nextValues]);
  }

  function removeTokenItem(key: TokenFieldKey, targetValue: string) {
    setTokenItems(
      key,
      splitPreferences(form[key]).filter(
        (item) => normalizeSearchText(item) !== normalizeSearchText(targetValue)
      )
    );
  }

  function toggleTokenItem(key: TokenFieldKey, value: string) {
    if (containsPreference(form[key], value)) {
      removeTokenItem(key, value);
      return;
    }

    addTokenItem(key, value);
  }

  function commitDraftToken(
    key: TokenFieldKey,
    draftValue: string,
    clearDraft: () => void
  ) {
    const normalized = normalizeText(draftValue);
    if (!normalized) return;

    addTokenItem(key, normalized);
    clearDraft();
  }

  async function saveTokenFieldImmediately(key: TokenFieldKey, items: string[]) {
    const nextValue = uniqueItems(items).join(", ");

    setForm((prev) => ({
      ...prev,
      [key]: nextValue,
    }));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Faça login novamente para salvar no Club Mode.");
    }

    const { data: updatedRows, error: updateError } = await supabase
      .from("club_profiles")
      .update({
        [key]: nextValue || null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("user_id");

    if (updateError) {
      throw new Error(`Não foi possível salvar no Club Mode. ${updateError.message}`);
    }

    if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
      const { error: insertError } = await supabase
        .from("club_profiles")
        .insert({
          user_id: user.id,
          ...mapFormToPayload({
            ...form,
            [key]: nextValue,
          }),
          [key]: nextValue || null,
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        throw new Error(`Não foi possível criar o Club Mode. ${insertError.message}`);
      }
    }

    const { error: syncError } = await supabase.rpc(
      "sync_event_groups_from_club_profile",
      { p_user_id: user.id }
    );

    if (syncError) {
      throw new Error(
        `Item salvo, mas não foi possível sincronizar os grupos vivos. ${syncError.message}`
      );
    }

    router.refresh();
  }

  async function handleUseClubCatalogSuggestion(
    item: ClubCatalogSuggestion,
    tokenName: string,
    forcedTargetKey?: TokenFieldKey
  ) {
    const cleanName = normalizeText(tokenName || item.name);

    if (!cleanName) return;

    const targetKey: TokenFieldKey =
      forcedTargetKey ||
      (item.type === "club" || item.type === "venue"
        ? "favorite_clubs"
        : "favorite_events");

    const nextItems = uniqueItems([...splitPreferences(form[targetKey]), cleanName]);

    await saveTokenFieldImmediately(targetKey, nextItems);

    setMessage(`${cleanName} foi salvo automaticamente no Club Mode.`);
  }

  function applyGeneratedBelonging() {
    const generated = buildGeneratedBelonging(form);

    if (!generated) {
      setMessage("Preencha artista, club ou festival de referÃªncia para gerar a frase.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      club_tagline: generated,
    }));
    setMessage("Frase automÃ¡tica de pertencimento aplicada.");
  }

  async function copyClubLink() {
    if (!clubPublicHref) {
      setMessage("Defina e publique um slug para liberar o link Club.");
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${clubPublicHref}`);
      setMessage("Link do Club copiado com sucesso.");
    } catch {
      setMessage("NÃ£o foi possÃ­vel copiar o link agora.");
    }
  }

  function applyPreset(preset: PromptPreset) {
    setForm((prev) => ({
      ...prev,
      club_photo_prompt: preset.prompt,
      club_photo_style: preset.style,
    }));
    setMessage(`Preset aplicado: ${preset.title}.`);
  }

  async function copyPromptText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Prompt copiado com sucesso.");
    } catch {
      setMessage("NÃ£o foi possÃ­vel copiar o prompt agora.");
    }
  }

  function openPhotoPicker() {
    fileInputRef.current?.click();
  }

  async function handlePhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setMessage("Selecione apenas arquivos de imagem.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setMessage("A imagem deve ter no mÃ¡ximo 5 MB.");
      event.target.value = "";
      return;
    }

    try {
      const preview = await fileToDataUrl(selectedFile);
      setSelectedPhotoFile(selectedFile);
      setLocalPhotoPreview(preview);
      setPhotoTouched(true);
      setMessage("Foto Club selecionada. Agora clique em Salvar.");
    } catch {
      setMessage("NÃ£o foi possÃ­vel preparar a imagem.");
    }

    event.target.value = "";
  }

  function removePhoto() {
    setSelectedPhotoFile(null);
    setLocalPhotoPreview("");
    setPhotoTouched(true);
    setForm((prev) => ({ ...prev, club_photo_url: "" }));
    setMessage("Foto removida do formulÃ¡rio. Agora clique em Salvar.");
  }

  async function uploadPendingPhotoIfNeeded(userId: string): Promise<string> {
    if (!photoTouched) {
      return normalizeText(form.club_photo_url);
    }

    if (!selectedPhotoFile) {
      return "";
    }

    const sanitizedName = sanitizeFileName(selectedPhotoFile.name || "club-photo");
    const fileExt = sanitizedName.includes(".") ? sanitizedName.split(".").pop() : "jpg";
    const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(CLUB_BUCKET)
      .upload(filePath, selectedPhotoFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `NÃ£o foi possÃ­vel enviar a foto do Club. Verifique se o bucket '${CLUB_BUCKET}' existe e se as permissÃµes estÃ£o corretas.`
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(CLUB_BUCKET)
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || "";
  }

  async function saveProfile() {
    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setMessage("FaÃ§a login novamente para salvar.");
      return;
    }

    try {
      const finalPhotoUrl = await uploadPendingPhotoIfNeeded(user.id);

      const basePayload = {
        ...mapFormToPayload(form),
        club_photo_url: finalPhotoUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedRows, error: updateError } = await supabase
        .from("club_profiles")
        .update(basePayload)
        .eq("user_id", user.id)
        .select("*");

      if (updateError) {
        setSaving(false);
        setMessage(`NÃ£o foi possÃ­vel atualizar agora. ${updateError.message}`);
        return;
      }

      let persistedRow: ClubProfileRow | null =
        Array.isArray(updatedRows) && updatedRows.length > 0
          ? (updatedRows[0] as ClubProfileRow)
          : null;

      if (!persistedRow) {
        const { data: insertedRow, error: insertError } = await supabase
          .from("club_profiles")
          .insert({
            user_id: user.id,
            ...basePayload,
          })
          .select("*")
          .single();

        if (insertError) {
          setSaving(false);
          setMessage(`NÃ£o foi possÃ­vel inserir agora. ${insertError.message}`);
          return;
        }

        persistedRow = insertedRow as ClubProfileRow;
      }

      const { error: syncError } = await supabase.rpc(
        "sync_event_groups_from_club_profile",
        { p_user_id: user.id }
      );

      if (syncError) {
        setSaving(false);
        setMessage(
          `Perfil salvo, mas nÃ£o foi possÃ­vel sincronizar os grupos vivos. ${syncError.message}`
        );
        return;
      }

      const { data: confirmedRow, error: confirmError } = await supabase
        .from("club_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (confirmError || !confirmedRow) {
        setSaving(false);
        setMessage(
          "O salvamento foi iniciado, mas nÃ£o foi possÃ­vel confirmar a persistÃªncia no banco."
        );
        return;
      }

      setForm(mapRowToForm(confirmedRow as ClubProfileRow));
      setSelectedPhotoFile(null);
      setLocalPhotoPreview("");
      setPhotoTouched(false);
      setSaving(false);
      setMessage("Club Mode salvo com sucesso e playlist sincronizada corretamente.");

      router.refresh();
    } catch (error) {
      setSaving(false);
      setMessage(
        error instanceof Error ? error.message : "NÃ£o foi possÃ­vel salvar o Club Mode."
      );
    }
  }

  const effectivePhotoPreview = localPhotoPreview || form.club_photo_url;

  const completenessItems = [
    hasContent(form.club_tagline),
    hasContent(form.city_base),
    hasContent(form.favorite_genres),
    hasContent(form.favorite_artists),
    hasContent(form.favorite_events),
    hasContent(form.favorite_clubs),
    hasContent(form.last_events),
    hasContent(form.next_events),
    hasContent(form.next_events_dates),
    hasContent(form.next_events_links),
    hasContent(effectivePhotoPreview),
    hasContent(form.playlist_title),
    hasContent(form.primary_streaming_platform),
    hasContent(form.streaming_url),
  ];

  const completenessCount = completenessItems.filter(Boolean).length;
  const completenessPercent = Math.round(
    (completenessCount / completenessItems.length) * 100
  );

  const previewBelonging = buildGeneratedBelonging(form) || "Ainda nÃ£o definido.";
  const missingPriorityFields = [
    !hasContent(form.city_base) ? "cidade e estado" : "",
    !hasContent(form.favorite_genres) ? "vertente principal" : "",
    !hasContent(form.favorite_artists) ? "artista de referÃªncia" : "",
    !hasContent(form.favorite_clubs) ? "club de referÃªncia" : "",
    !hasContent(form.favorite_events) ? "festival ou festa de referÃªncia" : "",
  ].filter(Boolean);

  if (loading) {
    return <p>Carregando Club Mode...</p>;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 6 }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>Estrutura cultural do Club</h3>
          <p style={{ margin: 0, opacity: 0.78 }}>
            Aqui nasce a identidade do usuÃ¡rio na cena eletrÃ´nica.
          </p>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span>Completude do Club</span>
            <strong>
              {completenessCount}/{completenessItems.length}
            </strong>
          </div>

          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${completenessPercent}%`,
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, #ffffff, #bdbdbd)",
              }}
            />
          </div>

          <div style={{ fontSize: 13, opacity: 0.76 }}>
            {completenessPercent}% concluÃ­do.
          </div>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {missingPriorityFields.length === 0
            ? "Os campos prioritÃ¡rios do topo do Club estÃ£o preenchidos."
            : `Faltam ${missingPriorityFields.length} campos-chave para o topo do Club ficar forte: ${missingPriorityFields.join(", ")}.`}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={copyClubLink} style={buttonStyle()}>
            Copiar link do Club
          </button>

          {clubPublicHref ? (
            <a
              href={clubPublicHref}
              target="_blank"
              rel="noopener noreferrer"
              style={buttonStyle()}
            >
              Abrir preview Club
            </a>
          ) : null}
        </div>
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>
            Preenchimento prioritÃ¡rio do topo pÃºblico
          </h3>
          <p style={{ margin: 0, opacity: 0.78 }}>
            Estes sÃ£o os campos que formam a identidade principal do Club pÃºblico.
          </p>
        </div>

        <label>
          <span style={labelTitleStyle()}>Cidade e estado</span>
          <input
            value={form.city_base}
            onChange={(e) => updateField("city_base", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && citySearch.items.length > 0) {
                e.preventDefault();
                updateField("city_base", citySearch.items[0].display_name);
              }
            }}
            placeholder="Digite a cidade e escolha a opÃ§Ã£o no formato Cidade - UF"
            style={inputStyle()}
          />

          <div style={helperTextStyle()}>
            Busca nacional focada no Brasil. O resultado final fica sempre no padrÃ£o Cidade - UF.
          </div>

          <div style={searchBlockStyle()}>
            <strong>Buscador nacional de cidade e estado</strong>

            {citySearch.loading ? (
              <div style={{ fontSize: 12, opacity: 0.74 }}>
                Buscando cidades do Brasil...
              </div>
            ) : citySearch.items.length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {citySearch.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateField("city_base", item.display_name)}
                    style={suggestionButtonStyle(
                      normalizeSearchText(form.city_base) ===
                        normalizeSearchText(item.display_name)
                    )}
                  >
                    <span>{item.display_name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.74 }}>
                Nenhuma cidade encontrada para este termo. Pode escrever manualmente.
              </div>
            )}
          </div>
        </label>

        <label>
          <span style={labelTitleStyle()}>Frase curta de pertencimento</span>
          <input
            value={form.club_tagline}
            onChange={(e) => updateField("club_tagline", e.target.value)}
            placeholder="Ex: FaÃ§o parte da energia do tech house, dos clubs intensos e das pistas que viram a madrugada."
            style={inputStyle()}
          />
          <div style={helperTextStyle()}>
            Campo livre. Pode apagar, corrigir e reescrever normalmente.
          </div>
        </label>

        <div
          style={{
            marginTop: 4,
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
            display: "grid",
            gap: 10,
          }}
        >
          <strong>Frase automÃ¡tica sugerida</strong>
          <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.84 }}>
            {previewBelonging}
          </div>

          <div>
            <button type="button" onClick={applyGeneratedBelonging} style={buttonStyle()}>
              Usar frase automÃ¡tica
            </button>
          </div>
        </div>

        <CatalogTokenField
          label="Vertente principal e secundÃ¡rias"
          helperText="Digite e pressione Enter para adicionar. Clique no x para remover. TambÃ©m pode clicar nas sugestÃµes globais."
          placeholder="Digite a vertente e pressione Enter"
          fieldKey="favorite_genres"
          formValue={form.favorite_genres}
          draftValue={genreDraft}
          setDraftValue={setGenreDraft}
          suggestions={genreSearch.items}
          loading={genreSearch.loading}
          onCommit={commitDraftToken}
          onRemove={removeTokenItem}
          onToggleSuggestion={toggleTokenItem}
        />

        <CatalogTokenField
          label="Artista de referÃªncia e outros artistas"
          helperText="Digite e pressione Enter para adicionar. Clique no x para remover. TambÃ©m pode clicar nas sugestÃµes globais."
          placeholder="Digite o artista e pressione Enter"
          fieldKey="favorite_artists"
          formValue={form.favorite_artists}
          draftValue={artistDraft}
          setDraftValue={setArtistDraft}
          suggestions={artistSearch.items}
          loading={artistSearch.loading}
          onCommit={commitDraftToken}
          onRemove={removeTokenItem}
          onToggleSuggestion={toggleTokenItem}
        />

        <SpotifyArtistPicker />

        <CatalogTokenField
          label="Club de referÃªncia, labels e experiÃªncias favoritas"
          helperText="Digite e pressione Enter para adicionar. Clique no x para remover. TambÃ©m pode clicar nas sugestÃµes globais."
          placeholder="Digite o club e pressione Enter"
          fieldKey="favorite_clubs"
          formValue={form.favorite_clubs}
          draftValue={clubDraft}
          setDraftValue={setClubDraft}
          suggestions={clubSearch.items}
          loading={clubSearch.loading}
          onCommit={commitDraftToken}
          onRemove={removeTokenItem}
          onToggleSuggestion={toggleTokenItem}
        />

        <AssistedClubCatalogSearch
          cityBase={form.city_base}
          onUseSuggestion={handleUseClubCatalogSuggestion}
          onMessage={setMessage}
        />

        <CatalogTokenField
          label="Festival ou festa de referÃªncia"
          helperText="Digite e pressione Enter para adicionar. Clique no x para remover. TambÃ©m pode clicar nas sugestÃµes globais."
          placeholder="Digite a festa ou festival e pressione Enter"
          fieldKey="favorite_events"
          formValue={form.favorite_events}
          draftValue={favoriteEventDraft}
          setDraftValue={setFavoriteEventDraft}
          suggestions={favoriteEventSearch.items}
          loading={favoriteEventSearch.loading}
          onCommit={commitDraftToken}
          onRemove={removeTokenItem}
          onToggleSuggestion={toggleTokenItem}
        />
        <AssistedClubCatalogSearch
          cityBase={form.city_base}
          initialType="festival"
          fixedTargetKey="favorite_events"
          title="Busca assistida de festival, festa ou evento com imagem"
          description="Use para buscar festival, festa ou evento oficial e salvar diretamente em Festivais e festas, com imagem e fonte na página pública."
          placeholder="Ex: X-Future, Warung Day Festival, Ame Laroc Festival"
          onUseSuggestion={handleUseClubCatalogSuggestion}
          onMessage={setMessage}
        />

        <CatalogTokenField
          label="Ãšltimos eventos frequentados"
          helperText="Registre os eventos recentes para dar contexto de vivÃªncia."
          placeholder="Digite o evento e pressione Enter"
          fieldKey="last_events"
          formValue={form.last_events}
          draftValue={lastEventDraft}
          setDraftValue={setLastEventDraft}
          suggestions={lastEventSearch.items}
          loading={lastEventSearch.loading}
          onCommit={commitDraftToken}
          onRemove={removeTokenItem}
          onToggleSuggestion={toggleTokenItem}
        />

        <CatalogTokenField
          label="PrÃ³ximos eventos"
          helperText="Eventos futuros ajudam a conectar com outras pessoas."
          placeholder="Digite o evento e pressione Enter"
          fieldKey="next_events"
          formValue={form.next_events}
          draftValue={nextEventDraft}
          setDraftValue={setNextEventDraft}
          suggestions={nextEventSearch.items}
          loading={nextEventSearch.loading}
          onCommit={commitDraftToken}
          onRemove={removeTokenItem}
          onToggleSuggestion={toggleTokenItem}
        />

        <label>
          <span style={labelTitleStyle()}>Datas dos prÃ³ximos eventos</span>
          <input
            value={form.next_events_dates}
            onChange={(e) => updateField("next_events_dates", e.target.value)}
            placeholder="Ex: 12/07/2026, 20/08/2026"
            style={inputStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Links oficiais dos eventos</span>
          <input
            value={form.next_events_links}
            onChange={(e) => updateField("next_events_links", e.target.value)}
            placeholder="Cole o link oficial do evento"
            style={inputStyle()}
          />
        </label>
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>Streaming e playlist principal</h3>
          <p style={{ margin: 0, opacity: 0.78 }}>
            Escolha a plataforma principal e cole o link especÃ­fico da playlist, vÃ­deo, faixa ou perfil.
          </p>
        </div>

        <label>
          <span style={labelTitleStyle()}>Plataforma principal</span>
          <select
            value={form.primary_streaming_platform}
            onChange={(e) => updateField("primary_streaming_platform", e.target.value)}
            style={selectStyle()}
          >
            <option value="" style={selectOptionStyle()}>
              Selecione a plataforma
            </option>
            <option value="spotify" style={selectOptionStyle()}>
              Spotify
            </option>
            <option value="soundcloud" style={selectOptionStyle()}>
              SoundCloud
            </option>
            <option value="youtube" style={selectOptionStyle()}>
              YouTube
            </option>
            <option value="apple_music" style={selectOptionStyle()}>
              Apple Music
            </option>
            <option value="deezer" style={selectOptionStyle()}>
              Deezer
            </option>
            <option value="mixcloud" style={selectOptionStyle()}>
              Mixcloud
            </option>
            <option value="beatport" style={selectOptionStyle()}>
              Beatport
            </option>
          </select>
        </label>

        <label>
          <span style={labelTitleStyle()}>Link da playlist principal</span>
          <input
            value={form.streaming_url}
            onChange={(e) => updateField("streaming_url", e.target.value)}
            placeholder="Cole aqui o link especÃ­fico da playlist, vÃ­deo ou faixa"
            style={inputStyle()}
          />
          <div style={helperTextStyle()}>
            Este campo salva automaticamente no lugar correto: YouTube, Spotify, SoundCloud, Apple Music, Deezer, Mixcloud ou Beatport.
          </div>
        </label>

        <label>
          <span style={labelTitleStyle()}>TÃ­tulo da playlist</span>
          <input
            value={form.playlist_title}
            onChange={(e) => updateField("playlist_title", e.target.value)}
            placeholder="Ex: Minha seleÃ§Ã£o principal"
            style={inputStyle()}
          />
          <div style={helperTextStyle()}>
            Use apenas texto. NÃ£o cole link neste campo.
          </div>
        </label>

        <label>
          <span style={labelTitleStyle()}>DescriÃ§Ã£o da playlist</span>
          <textarea
            value={form.playlist_description}
            onChange={(e) => updateField("playlist_description", e.target.value)}
            placeholder="Descreva a energia da sua seleÃ§Ã£o musical"
            style={textareaStyle()}
          />
        </label>
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>Foto Club e identidade visual</h3>
          <p style={{ margin: 0, opacity: 0.78 }}>
            Adicione uma imagem forte para o topo do perfil pÃºblico Club.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelected}
          style={{ display: "none" }}
        />

        <div style={previewCardStyle()}>
          {effectivePhotoPreview ? (
            <img
              src={effectivePhotoPreview}
              alt="PrÃ©via da foto Club"
              style={{
                width: "100%",
                maxHeight: 360,
                objectFit: "cover",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            />
          ) : (
            <div style={{ opacity: 0.74, fontSize: 13 }}>
              Nenhuma foto Club selecionada.
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={openPhotoPicker} style={buttonStyle()}>
              Selecionar foto Club
            </button>

            {effectivePhotoPreview ? (
              <button type="button" onClick={removePhoto} style={buttonStyle()}>
                Remover foto
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <strong>Prompts de imagem sugeridos</strong>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {PROMPT_PRESETS.map((preset) => (
              <div
                key={preset.id}
                style={presetCardStyle(form.club_photo_style === preset.style)}
              >
                <div>
                  <strong>{preset.title}</strong>
                  <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>
                    {preset.subtitle}
                  </div>
                </div>

                <button type="button" onClick={() => applyPreset(preset)} style={buttonStyle()}>
                  Usar preset
                </button>

                <button
                  type="button"
                  onClick={() => copyPromptText(preset.prompt)}
                  style={buttonStyle()}
                >
                  Copiar prompt
                </button>
              </div>
            ))}
          </div>
        </div>

        <label>
          <span style={labelTitleStyle()}>Prompt da foto Club</span>
          <textarea
            value={form.club_photo_prompt}
            onChange={(e) => updateField("club_photo_prompt", e.target.value)}
            placeholder="Prompt usado para criar a imagem Club"
            style={textareaStyle()}
          />
        </label>
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>Carona compartilhada</h3>
          <p style={{ margin: 0, opacity: 0.78 }}>
            Crie ou participe de uma carona para eventos.
          </p>
        </div>

        <label>
          <span style={labelTitleStyle()}>Status</span>
          <select
            value={form.ride_status}
            onChange={(e) => updateField("ride_status", e.target.value)}
            style={selectStyle()}
          >
            <option value="" style={selectOptionStyle()}>
              Selecione
            </option>
            <option value="offer" style={selectOptionStyle()}>
              Oferecer carona
            </option>
            <option value="need" style={selectOptionStyle()}>
              Procurar carona
            </option>
            <option value="both" style={selectOptionStyle()}>
              Ambos
            </option>
          </select>
        </label>

        <label>
          <span style={labelTitleStyle()}>Evento</span>
          <input
            value={form.ride_event_name}
            onChange={(e) => updateField("ride_event_name", e.target.value)}
            placeholder="Nome do evento"
            style={inputStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Data</span>
          <input
            value={form.ride_event_date}
            onChange={(e) => updateField("ride_event_date", e.target.value)}
            placeholder="DD/MM/AAAA"
            style={inputStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Link oficial do evento</span>
          <input
            value={form.ride_event_url}
            onChange={(e) => updateField("ride_event_url", e.target.value)}
            placeholder="Instagram ou site oficial"
            style={inputStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Origem</span>
          <input
            value={form.ride_origin}
            onChange={(e) => updateField("ride_origin", e.target.value)}
            placeholder="Cidade ou ponto de saÃ­da"
            style={inputStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Destino</span>
          <input
            value={form.ride_destination}
            onChange={(e) => updateField("ride_destination", e.target.value)}
            placeholder="Cidade ou local do evento"
            style={inputStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Vagas</span>
          <input
            value={form.ride_seats}
            onChange={(e) => updateField("ride_seats", e.target.value)}
            placeholder="Ex: 2 vagas"
            style={inputStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>ObservaÃ§Ãµes</span>
          <textarea
            value={form.ride_notes}
            onChange={(e) => updateField("ride_notes", e.target.value)}
            placeholder="Detalhes importantes da carona"
            style={textareaStyle()}
          />
        </label>
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>Encontro combinado</h3>
          <p style={{ margin: 0, opacity: 0.78 }}>
            Combine pontos de encontro dentro do evento.
          </p>
        </div>

        <label>
          <span style={labelTitleStyle()}>Status</span>
          <select
            value={form.meet_status}
            onChange={(e) => updateField("meet_status", e.target.value)}
            style={selectStyle()}
          >
            <option value="" style={selectOptionStyle()}>
              Selecione
            </option>
            <option value="host" style={selectOptionStyle()}>
              Criar encontro
            </option>
            <option value="join" style={selectOptionStyle()}>
              Participar
            </option>
            <option value="both" style={selectOptionStyle()}>
              Ambos
            </option>
          </select>
        </label>

        <label>
          <span style={labelTitleStyle()}>Evento</span>
          <input
            value={form.meet_event_name}
            onChange={(e) => updateField("meet_event_name", e.target.value)}
            placeholder="Nome do evento"
            style={inputStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Data</span>
          <input
            value={form.meet_event_date}
            onChange={(e) => updateField("meet_event_date", e.target.value)}
            placeholder="DD/MM/AAAA"
            style={inputStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Link oficial do evento</span>
          <input
            value={form.meet_event_url}
            onChange={(e) => updateField("meet_event_url", e.target.value)}
            placeholder="Instagram ou site oficial"
            style={inputStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Ponto de encontro</span>
          <input
            value={form.meet_meeting_point}
            onChange={(e) => updateField("meet_meeting_point", e.target.value)}
            placeholder="Ex: entrada principal, bar central, setor X"
            style={inputStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>HorÃ¡rio</span>
          <input
            value={form.meet_time}
            onChange={(e) => updateField("meet_time", e.target.value)}
            placeholder="Ex: 23:30"
            style={inputStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>ObservaÃ§Ãµes</span>
          <textarea
            value={form.meet_notes}
            onChange={(e) => updateField("meet_notes", e.target.value)}
            placeholder="Detalhes do encontro combinado"
            style={textareaStyle()}
          />
        </label>
      </section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={saveProfile}
          disabled={saving}
          style={buttonStyle(saving)}
        >
          {saving ? "Salvando..." : "Salvar Club Mode"}
        </button>

        {clubPublicHref ? (
          <a
            href={clubPublicHref}
            target="_blank"
            rel="noopener noreferrer"
            style={buttonStyle()}
          >
            Ver Club pÃºblico
          </a>
        ) : null}
      </div>

      {message ? (
        <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.55 }}>
          {message}
        </div>
      ) : null}
    </div>
  );
}







