// src/app/dashboard/cards/[card_id]/ClubProfileManager.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

type ClubProfileRow = {
  user_id: string;
  club_tagline: string | null;
  city_base: string | null;
  favorite_genres: string | null;
  favorite_artists: string | null;
  favorite_events: string | null;
  last_events: string | null;
  next_events: string | null;
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
  ride_origin: string | null;
  ride_destination: string | null;
  ride_seats: string | null;
  ride_notes: string | null;
  meet_status: string | null;
  meet_event_name: string | null;
  meet_meeting_point: string | null;
  meet_time: string | null;
  meet_notes: string | null;
};

type ClubProfileManagerProps = {
  clubPublicHref?: string;
  hasPublicSlug?: boolean;
  isPublished?: boolean;
};

type FormState = {
  club_tagline: string;
  city_base: string;
  favorite_genres: string;
  favorite_artists: string;
  favorite_events: string;
  last_events: string;
  next_events: string;
  favorite_clubs: string;
  playlist_title: string;
  playlist_description: string;
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
  primary_streaming_platform: string;
  ride_status: string;
  ride_event_name: string;
  ride_origin: string;
  ride_destination: string;
  ride_seats: string;
  ride_notes: string;
  meet_status: string;
  meet_event_name: string;
  meet_meeting_point: string;
  meet_time: string;
  meet_notes: string;
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

const EMPTY_FORM: FormState = {
  club_tagline: "",
  city_base: "",
  favorite_genres: "",
  favorite_artists: "",
  favorite_events: "",
  last_events: "",
  next_events: "",
  favorite_clubs: "",
  playlist_title: "",
  playlist_description: "",
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
  primary_streaming_platform: "",
  ride_status: "",
  ride_event_name: "",
  ride_origin: "",
  ride_destination: "",
  ride_seats: "",
  ride_notes: "",
  meet_status: "",
  meet_event_name: "",
  meet_meeting_point: "",
  meet_time: "",
  meet_notes: "",
};

const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "artist-monochrome",
    title: "Artista monocromático",
    subtitle: "Estética forte, preto e branco, presença de artista",
    style: "monocromático artístico premium",
    prompt:
      "Use esta foto como base e preserve fielmente rosto, cabelo, barba e identidade visual real. Gere uma foto de perfil artística voltada à cena eletrônica, em preto e branco premium, iluminação dramática, contraste alto, atmosfera elegante, expressão segura, enquadramento de retrato, aparência de artista ou clubber sofisticado, sem caricatura, sem perder autenticidade facial.",
  },
  {
    id: "festival-neon",
    title: "Festival neon",
    subtitle: "Energia de palco, festival e lifestyle eletrônico",
    style: "festival neon eletronic scene",
    prompt:
      "Use esta foto como imagem base, mantendo identidade real da pessoa. Gere uma foto de perfil inspirada na cena eletrônica e festivais, com atmosfera premium, luzes neon discretas, sensação noturna, estética moderna, roupa alinhada ao lifestyle clubber, presença forte e visual marcante, mantendo o rosto reconhecível e realista.",
  },
  {
    id: "underground-shadow",
    title: "Underground shadow",
    subtitle: "Mais dark, sofisticado e club culture",
    style: "underground shadow club culture",
    prompt:
      "Use esta foto como base, preservando completamente a identidade facial. Gere um retrato de perfil com linguagem visual underground, sombra elegante, fundo escuro, iluminação lateral refinada, estética de club culture, ar misterioso e sofisticado, sem exagero artificial, com realismo elevado e presença forte.",
  },
  {
    id: "dj-premium",
    title: "DJ premium",
    subtitle: "Foto com autoridade visual de artista da cena",
    style: "dj premium portrait",
    prompt:
      "Use esta foto como base e mantenha traços reais do rosto. Gere uma foto de perfil premium no estilo retrato de DJ ou artista da cena eletrônica, com visual contemporâneo, iluminação bem trabalhada, postura segura, fundo limpo ou noturno sofisticado, percepção de alto valor e identidade visual forte.",
  },
  {
    id: "cinematic-clubber",
    title: "Cinematic clubber",
    subtitle: "Mais lifestyle e pertencimento",
    style: "cinematic clubber lifestyle",
    prompt:
      "Use esta foto como imagem base e preserve fielmente a identidade visual real. Gere uma foto de perfil cinematográfica voltada ao universo clubber e à cena eletrônica, com profundidade, iluminação refinada, visual moderno, atmosfera premium, tom emocional e sensação de pertencimento à cultura eletrônica.",
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
    .split(/,|•|;|\|/)
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

function buildGeneratedBelonging(form: FormState) {
  const city = normalizeText(form.city_base);
  const genre = firstPreference(form.favorite_genres);
  const artist = firstPreference(form.favorite_artists);
  const club = firstPreference(form.favorite_clubs);
  const event = firstPreference(form.favorite_events);

  if (artist && club && event && city) {
    return `Faço parte do universo ${artist}, me reconheço em ${club}, vivo experiências como ${event} e levo essa identidade comigo em ${city}.`;
  }

  if (artist && club && event) {
    return `Faço parte do universo ${artist}, me reconheço em ${club} e busco viver experiências como ${event}.`;
  }

  if (artist && club) {
    return `Me identifico com o universo ${artist} e com a energia de ${club}.`;
  }

  if (club && event) {
    return `Me sinto parte de ${club} e busco viver experiências como ${event}.`;
  }

  if (genre && club) {
    return `Minha identidade passa por ${genre} e por referências como ${club}.`;
  }

  if (artist) {
    return `Minha identidade na cena passa por referências como ${artist}.`;
  }

  return "";
}

function getRideStatusLabel(value: string) {
  if (value === "offer") return "Oferecendo carona";
  if (value === "need") return "Procurando carona";
  if (value === "both") return "Oferece e também procura";
  return "Ainda não definido.";
}

function getMeetStatusLabel(value: string) {
  if (value === "host") return "Abrindo ponto de encontro";
  if (value === "join") return "Quer entrar em um encontro";
  if (value === "both") return "Pode abrir ou entrar";
  return "Ainda não definido.";
}

function formatCatalogMeta(item: CatalogItem) {
  const parts = [
    normalizeText(item.subtitle),
    normalizeText(item.city_label),
    normalizeText(item.country_code),
  ].filter(Boolean);

  return parts.join(" • ");
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

function mapRowToForm(row: ClubProfileRow | null | undefined): FormState {
  return {
    club_tagline: row?.club_tagline ?? "",
    city_base: row?.city_base ?? "",
    favorite_genres: row?.favorite_genres ?? "",
    favorite_artists: row?.favorite_artists ?? "",
    favorite_events: row?.favorite_events ?? "",
    last_events: row?.last_events ?? "",
    next_events: row?.next_events ?? "",
    favorite_clubs: row?.favorite_clubs ?? "",
    playlist_title: row?.playlist_title ?? "",
    playlist_description: row?.playlist_description ?? "",
    club_photo_url: row?.club_photo_url ?? "",
    club_photo_prompt: row?.club_photo_prompt ?? "",
    club_photo_style: row?.club_photo_style ?? "",
    spotify_url: row?.spotify_url ?? "",
    soundcloud_url: row?.soundcloud_url ?? "",
    youtube_url: row?.youtube_url ?? "",
    beatport_url: row?.beatport_url ?? "",
    mixcloud_url: row?.mixcloud_url ?? "",
    apple_music_url: row?.apple_music_url ?? "",
    deezer_url: row?.deezer_url ?? "",
    primary_streaming_platform: row?.primary_streaming_platform ?? "",
    ride_status: row?.ride_status ?? "",
    ride_event_name: row?.ride_event_name ?? "",
    ride_origin: row?.ride_origin ?? "",
    ride_destination: row?.ride_destination ?? "",
    ride_seats: row?.ride_seats ?? "",
    ride_notes: row?.ride_notes ?? "",
    meet_status: row?.meet_status ?? "",
    meet_event_name: row?.meet_event_name ?? "",
    meet_meeting_point: row?.meet_meeting_point ?? "",
    meet_time: row?.meet_time ?? "",
    meet_notes: row?.meet_notes ?? "",
  };
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

function presetCardStyle(active: boolean) {
  return {
    padding: 14,
    borderRadius: 14,
    border: active
      ? "1px solid rgba(0,200,120,0.28)"
      : "1px solid rgba(255,255,255,0.12)",
    background: active
      ? "rgba(0,200,120,0.08)"
      : "rgba(255,255,255,0.03)",
    display: "grid",
    gap: 10,
  } as const;
}

function collapsibleStyle() {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  } as const;
}

function summaryStyle() {
  return {
    cursor: "pointer",
    listStyle: "none",
    padding: "14px 16px",
    fontWeight: 900,
    userSelect: "none" as const,
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

function tipCardStyle() {
  return {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.02)",
    display: "grid",
    gap: 6,
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
    background: active
      ? "rgba(0,200,120,0.10)"
      : "rgba(255,255,255,0.04)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    textAlign: "left" as const,
  };
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
  const selectedItems = splitPreferences(formValue);

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
          {selectedItems.map((item) => (
            <span key={`${fieldKey}-${item}`} style={selectedTokenStyle()}>
              {item}
              <button
                type="button"
                onClick={() => onRemove(fieldKey, item)}
                style={tokenRemoveButtonStyle()}
                aria-label={`Remover ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div style={searchBlockStyle()}>
        <strong>Sugestões globais</strong>

        {loading ? (
          <div style={{ fontSize: 12, opacity: 0.74 }}>Buscando no catálogo global...</div>
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
                  <span style={{ fontSize: 11, opacity: 0.72 }}>{formatCatalogMeta(item)}</span>
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.74 }}>
            Nada encontrado no catálogo global para este termo. Pode escrever manualmente e pressionar Enter.
          </div>
        )}
      </div>
    </label>
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
  const rideEventSearch = useCatalogSearch(supabase, "event", form.ride_event_name);
  const meetEventSearch = useCatalogSearch(supabase, "event", form.meet_event_name);

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
      setMessage("Não foi possível carregar o Club Mode.");
      setLoading(false);
      return;
    }

    if (data) {
      setForm(mapRowToForm(data as ClubProfileRow));
    } else {
      setForm(EMPTY_FORM);
    }

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

  function applyGeneratedBelonging() {
    const generated = buildGeneratedBelonging(form);

    if (!generated) {
      setMessage("Preencha artista, club ou festival de referência para gerar a frase.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      club_tagline: generated,
    }));
    setMessage("Frase automática de pertencimento aplicada.");
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
      setMessage("Não foi possível copiar o link agora.");
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
      setMessage("Não foi possível copiar o prompt agora.");
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
      setMessage("A imagem deve ter no máximo 5 MB.");
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
      setMessage("Não foi possível preparar a imagem.");
    }

    event.target.value = "";
  }

  function removePhoto() {
    setSelectedPhotoFile(null);
    setLocalPhotoPreview("");
    setPhotoTouched(true);
    setForm((prev) => ({ ...prev, club_photo_url: "" }));
    setMessage("Foto removida do formulário. Agora clique em Salvar.");
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
        `Não foi possível enviar a foto do Club. Verifique se o bucket '${CLUB_BUCKET}' existe e se as permissões estão corretas.`
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
      setMessage("Faça login novamente para salvar.");
      return;
    }

    try {
      const finalPhotoUrl = await uploadPendingPhotoIfNeeded(user.id);

      const basePayload = {
        club_tagline: normalizeText(form.club_tagline) || null,
        city_base: normalizeText(form.city_base) || null,
        favorite_genres: normalizeText(form.favorite_genres) || null,
        favorite_artists: normalizeText(form.favorite_artists) || null,
        favorite_events: normalizeText(form.favorite_events) || null,
        last_events: normalizeText(form.last_events) || null,
        next_events: normalizeText(form.next_events) || null,
        favorite_clubs: normalizeText(form.favorite_clubs) || null,
        playlist_title: normalizeText(form.playlist_title) || null,
        playlist_description: normalizeText(form.playlist_description) || null,
        club_photo_url: finalPhotoUrl || null,
        club_photo_prompt: normalizeText(form.club_photo_prompt) || null,
        club_photo_style: normalizeText(form.club_photo_style) || null,
        spotify_url: normalizeText(form.spotify_url) || null,
        soundcloud_url: normalizeText(form.soundcloud_url) || null,
        youtube_url: normalizeText(form.youtube_url) || null,
        beatport_url: normalizeText(form.beatport_url) || null,
        mixcloud_url: normalizeText(form.mixcloud_url) || null,
        apple_music_url: normalizeText(form.apple_music_url) || null,
        deezer_url: normalizeText(form.deezer_url) || null,
        primary_streaming_platform: normalizeText(form.primary_streaming_platform) || null,
        ride_status: normalizeText(form.ride_status) || null,
        ride_event_name: normalizeText(form.ride_event_name) || null,
        ride_origin: normalizeText(form.ride_origin) || null,
        ride_destination: normalizeText(form.ride_destination) || null,
        ride_seats: normalizeText(form.ride_seats) || null,
        ride_notes: normalizeText(form.ride_notes) || null,
        meet_status: normalizeText(form.meet_status) || null,
        meet_event_name: normalizeText(form.meet_event_name) || null,
        meet_meeting_point: normalizeText(form.meet_meeting_point) || null,
        meet_time: normalizeText(form.meet_time) || null,
        meet_notes: normalizeText(form.meet_notes) || null,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedRows, error: updateError } = await supabase
        .from("club_profiles")
        .update(basePayload)
        .eq("user_id", user.id)
        .select("*");

      if (updateError) {
        setSaving(false);
        setMessage(`Não foi possível atualizar agora. ${updateError.message}`);
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
          setMessage(`Não foi possível inserir agora. ${insertError.message}`);
          return;
        }

        persistedRow = insertedRow as ClubProfileRow;
      }

      const { data: confirmedRow, error: confirmError } = await supabase
        .from("club_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (confirmError || !confirmedRow) {
        setSaving(false);
        setMessage("O salvamento foi iniciado, mas não foi possível confirmar a persistência no banco.");
        return;
      }

      setForm(mapRowToForm(confirmedRow as ClubProfileRow));
      setSelectedPhotoFile(null);
      setLocalPhotoPreview("");
      setPhotoTouched(false);
      setSaving(false);
      setMessage("Club Mode salvo com sucesso e confirmado no banco.");

      router.refresh();
    } catch (error) {
      setSaving(false);
      setMessage(
        error instanceof Error ? error.message : "Não foi possível salvar o Club Mode."
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
    hasContent(effectivePhotoPreview),
    hasContent(form.playlist_title),
    hasContent(form.primary_streaming_platform),
    hasContent(form.spotify_url) ||
      hasContent(form.soundcloud_url) ||
      hasContent(form.youtube_url) ||
      hasContent(form.beatport_url) ||
      hasContent(form.mixcloud_url) ||
      hasContent(form.apple_music_url) ||
      hasContent(form.deezer_url),
  ];

  const completenessCount = completenessItems.filter(Boolean).length;
  const completenessPercent = Math.round(
    (completenessCount / completenessItems.length) * 100
  );

  const previewCity = normalizeText(form.city_base);
  const previewGenre = firstPreference(form.favorite_genres);
  const previewArtist = firstPreference(form.favorite_artists);
  const previewClub = firstPreference(form.favorite_clubs);
  const previewEvent = firstPreference(form.favorite_events);
  const previewBelonging = buildGeneratedBelonging(form) || "Ainda não definido.";

  const missingPriorityFields = [
    !hasContent(form.city_base) ? "cidade e estado" : "",
    !hasContent(form.favorite_genres) ? "vertente principal" : "",
    !hasContent(form.favorite_artists) ? "artista de referência" : "",
    !hasContent(form.favorite_clubs) ? "club de referência" : "",
    !hasContent(form.favorite_events) ? "festival ou festa de referência" : "",
  ].filter(Boolean);

  const ridePreviewStatus = getRideStatusLabel(form.ride_status);
  const rideReadyCount = [
    hasContent(form.ride_status),
    hasContent(form.ride_event_name),
    hasContent(form.ride_origin),
    hasContent(form.ride_destination),
    hasContent(form.ride_seats),
    hasContent(form.ride_notes),
  ].filter(Boolean).length;
  const rideReadyPercent = Math.round((rideReadyCount / 6) * 100);

  const meetPreviewStatus = getMeetStatusLabel(form.meet_status);
  const meetReadyCount = [
    hasContent(form.meet_status),
    hasContent(form.meet_event_name),
    hasContent(form.meet_meeting_point),
    hasContent(form.meet_time),
    hasContent(form.meet_notes),
  ].filter(Boolean).length;
  const meetReadyPercent = Math.round((meetReadyCount / 5) * 100);

  if (loading) {
    return <p>Carregando Club Mode...</p>;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 6 }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>Estrutura cultural do Club</h3>
          <p style={{ margin: 0, opacity: 0.78 }}>
            Aqui nasce a identidade do usuário na cena eletrônica.
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
            {completenessPercent}% concluído.
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
            ? "Os campos prioritários do topo do Club estão preenchidos."
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
            Preenchimento prioritário do topo público
          </h3>
          <p style={{ margin: 0, opacity: 0.78 }}>
            Estes são os campos que formam a identidade principal do Club público.
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
            placeholder="Digite a cidade e escolha a opção no formato Cidade - UF"
            style={inputStyle()}
          />

          <div style={helperTextStyle()}>
            Busca nacional focada no Brasil. O resultado final fica sempre no padrão Cidade - UF. Se preferir, o usuário também pode escrever manualmente.
          </div>

          <div style={searchBlockStyle()}>
            <strong>Buscador nacional de cidade e estado</strong>

            {citySearch.loading ? (
              <div style={{ fontSize: 12, opacity: 0.74 }}>Buscando cidades do Brasil...</div>
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
            placeholder="Ex: Faço parte da energia do tech house, dos clubs intensos e das pistas que viram a madrugada."
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
          <strong>Frase automática sugerida</strong>
          <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.84 }}>
            {previewBelonging}
          </div>

          <div>
            <button type="button" onClick={applyGeneratedBelonging} style={buttonStyle()}>
              Usar frase automática
            </button>
          </div>
        </div>

        <CatalogTokenField
          label="Vertente principal e secundárias"
          helperText="Digite e pressione Enter para adicionar. Clique no x para remover. Também pode clicar nas sugestões globais."
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
          label="Artista de referência e outros artistas"
          helperText="Digite e pressione Enter para adicionar. Clique no x para remover. Também pode clicar nas sugestões globais."
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

        <CatalogTokenField
          label="Club de referência, labels e experiências favoritas"
          helperText="Digite e pressione Enter para adicionar. Clique no x para remover. Também pode clicar nas sugestões globais."
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

        <CatalogTokenField
          label="Festival ou festa de referência"
          helperText="Digite e pressione Enter para adicionar. Clique no x para remover. Também pode clicar nas sugestões globais."
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
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>Leitura atual do topo do Club</h3>
          <p style={{ margin: 0, opacity: 0.78 }}>
            Este bloco mostra como o sistema está entendendo a identidade pública do usuário.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <div style={previewCardStyle()}>
            <strong>Cidade e estado</strong>
            <div style={{ opacity: 0.84 }}>{previewCity || "Ainda não definido."}</div>
          </div>

          <div style={previewCardStyle()}>
            <strong>Vertente principal</strong>
            <div style={{ opacity: 0.84 }}>{previewGenre || "Ainda não definido."}</div>
          </div>

          <div style={previewCardStyle()}>
            <strong>Artista de referência</strong>
            <div style={{ opacity: 0.84 }}>{previewArtist || "Ainda não definido."}</div>
          </div>

          <div style={previewCardStyle()}>
            <strong>Club de referência</strong>
            <div style={{ opacity: 0.84 }}>{previewClub || "Ainda não definido."}</div>
          </div>

          <div style={previewCardStyle()}>
            <strong>Festival ou festa de referência</strong>
            <div style={{ opacity: 0.84 }}>{previewEvent || "Ainda não definido."}</div>
          </div>

          <div style={previewCardStyle()}>
            <strong>Pertencimento que será comunicado</strong>
            <div style={{ opacity: 0.84, lineHeight: 1.55 }}>{previewBelonging}</div>
          </div>
        </div>
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>
            Como preencher para gerar pertencimento
          </h3>
          <p style={{ margin: 0, opacity: 0.78 }}>
            Cidade e estado agora têm buscador nacional próprio. Artistas, clubs, gêneros e eventos continuam com catálogo global e escrita manual livre.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <div style={tipCardStyle()}>
            <strong>1. Cidade no padrão correto</strong>
            <div style={{ fontSize: 13, opacity: 0.82, lineHeight: 1.55 }}>
              Ao escolher a cidade na busca nacional, o campo é preenchido no formato Cidade - UF.
            </div>
          </div>

          <div style={tipCardStyle()}>
            <strong>2. Facilidade no mobile</strong>
            <div style={{ fontSize: 13, opacity: 0.82, lineHeight: 1.55 }}>
              O usuário digita poucas letras, toca na opção sugerida e finaliza rapidamente o cadastro.
            </div>
          </div>

          <div style={tipCardStyle()}>
            <strong>3. Entrada manual mantida</strong>
            <div style={{ fontSize: 13, opacity: 0.82, lineHeight: 1.55 }}>
              Se não quiser usar a sugestão, o usuário pode escrever manualmente e corrigir quando quiser.
            </div>
          </div>

          <div style={tipCardStyle()}>
            <strong>4. Base escalável</strong>
            <div style={{ fontSize: 13, opacity: 0.82, lineHeight: 1.55 }}>
              A arquitetura da cidade agora está separada da base global de artistas, eventos e clubs.
            </div>
          </div>
        </div>
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>Foto do Club</h3>
          <p style={{ margin: 0, opacity: 0.78 }}>
            Foto cultural do perfil, com linguagem visual da cena eletrônica.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelected}
          style={{ display: "none" }}
        />

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "120px 1fr",
            alignItems: "start",
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              padding: 8,
              fontSize: 12,
            }}
          >
            {hasContent(effectivePhotoPreview) ? (
              <img
                src={effectivePhotoPreview}
                alt="Foto do Club"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <span>Sem foto Club</span>
            )}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={openPhotoPicker} style={buttonStyle()}>
                Selecionar foto Club
              </button>

              <button
                type="button"
                onClick={removePhoto}
                disabled={!hasContent(effectivePhotoPreview)}
                style={buttonStyle(!hasContent(effectivePhotoPreview))}
              >
                Remover foto
              </button>

              {hasContent(effectivePhotoPreview) ? (
                <a
                  href={effectivePhotoPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={buttonStyle()}
                >
                  Abrir foto
                </a>
              ) : null}
            </div>

            <label>
              <span style={labelTitleStyle()}>Foto Club URL</span>
              <input
                value={form.club_photo_url}
                onChange={(e) => {
                  setSelectedPhotoFile(null);
                  setLocalPhotoPreview("");
                  setPhotoTouched(false);
                  updateField("club_photo_url", e.target.value);
                }}
                placeholder="Ex: https://seusite.com/foto-club.jpg"
                style={inputStyle()}
              />
            </label>
          </div>
        </div>
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>Prompts de foto Club com IA</h3>
          <p style={{ margin: 0, opacity: 0.78 }}>
            Estilos pensados para artista, clubber, festival e estética monocromática.
          </p>
        </div>

        <div style={collapsibleStyle()}>
          <details>
            <summary style={summaryStyle()}>Abrir presets de foto Club</summary>

            <div style={{ padding: "0 16px 16px 16px", display: "grid", gap: 14 }}>
              {PROMPT_PRESETS.map((preset) => {
                const active =
                  normalizeText(form.club_photo_prompt) === normalizeText(preset.prompt) &&
                  normalizeText(form.club_photo_style) === normalizeText(preset.style);

                return (
                  <div key={preset.id} style={presetCardStyle(active)}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong>{preset.title}</strong>
                      <div style={{ fontSize: 13, opacity: 0.78 }}>{preset.subtitle}</div>
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.72 }}>
                      <strong>Estilo:</strong> {preset.style}
                    </div>

                    <div style={{ fontSize: 12, lineHeight: 1.55, opacity: 0.86 }}>
                      {preset.prompt}
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => applyPreset(preset)}
                        style={buttonStyle()}
                      >
                        Usar este prompt
                      </button>

                      <button
                        type="button"
                        onClick={() => copyPromptText(preset.prompt)}
                        style={buttonStyle()}
                      >
                        Copiar prompt
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </div>

        <label>
          <span style={labelTitleStyle()}>Prompt da foto Club</span>
          <textarea
            value={form.club_photo_prompt}
            onChange={(e) => updateField("club_photo_prompt", e.target.value)}
            placeholder="Cole aqui ou edite o prompt do Club."
            style={textareaStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Estilo visual da foto Club</span>
          <input
            value={form.club_photo_style}
            onChange={(e) => updateField("club_photo_style", e.target.value)}
            placeholder="Ex: monocromático artístico premium"
            style={inputStyle()}
          />
        </label>
      </section>

      <section style={sectionStyle()}>
        <h3 style={{ margin: 0, fontWeight: 900 }}>Eventos e presença</h3>

        <CatalogTokenField
          label="Últimos eventos em que foi"
          helperText="Digite e pressione Enter para adicionar. Clique no x para remover. Também pode usar as sugestões globais."
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
          label="Próximos eventos"
          helperText="Digite e pressione Enter para adicionar. Clique no x para remover. Também pode usar as sugestões globais."
          placeholder="Digite o próximo evento e pressione Enter"
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
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 6 }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>Carona compartilhada para eventos</h3>
          <p style={{ margin: 0, opacity: 0.78 }}>
            Primeira camada prática da comunidade para organizar ida ao evento, grupo e conexão entre membros.
          </p>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span>Completude da carona</span>
            <strong>
              {rideReadyCount}/6
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
                width: `${rideReadyPercent}%`,
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, rgba(0,200,120,0.90), rgba(255,255,255,0.90))",
              }}
            />
          </div>

          <div style={{ fontSize: 13, opacity: 0.76 }}>
            {rideReadyPercent}% concluído.
          </div>
        </div>

        <label>
          <span style={labelTitleStyle()}>Situação da carona</span>
          <select
            value={form.ride_status}
            onChange={(e) => updateField("ride_status", e.target.value)}
            style={selectStyle()}
          >
            <option value="" style={selectOptionStyle()}>
              Selecione
            </option>
            <option value="offer" style={selectOptionStyle()}>
              Estou oferecendo carona
            </option>
            <option value="need" style={selectOptionStyle()}>
              Estou procurando carona
            </option>
            <option value="both" style={selectOptionStyle()}>
              Posso oferecer e também procurar
            </option>
          </select>
          <div style={helperTextStyle()}>
            Este campo define como o usuário entra no fluxo de carona compartilhada.
          </div>
        </label>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <label>
            <span style={labelTitleStyle()}>Evento da carona</span>
            <input
              value={form.ride_event_name}
              onChange={(e) => updateField("ride_event_name", e.target.value)}
              placeholder="Ex: Time Warp Brasil"
              style={inputStyle()}
            />

            <div style={searchBlockStyle()}>
              <strong>Sugestões globais de evento</strong>
              {rideEventSearch.loading ? (
                <div style={{ fontSize: 12, opacity: 0.74 }}>Buscando eventos...</div>
              ) : rideEventSearch.items.length > 0 ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {rideEventSearch.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateField("ride_event_name", item.name)}
                      style={suggestionButtonStyle(
                        normalizeSearchText(form.ride_event_name) === normalizeSearchText(item.name)
                      )}
                    >
                      <span>{item.name}</span>
                      {formatCatalogMeta(item) ? (
                        <span style={{ fontSize: 11, opacity: 0.72 }}>{formatCatalogMeta(item)}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.74 }}>
                  Nada encontrado. Pode escrever manualmente.
                </div>
              )}
            </div>
          </label>

          <label>
            <span style={labelTitleStyle()}>Origem</span>
            <input
              value={form.ride_origin}
              onChange={(e) => updateField("ride_origin", e.target.value)}
              placeholder="Ex: Santo André - SP"
              style={inputStyle()}
            />
          </label>

          <label>
            <span style={labelTitleStyle()}>Destino ou ponto final</span>
            <input
              value={form.ride_destination}
              onChange={(e) => updateField("ride_destination", e.target.value)}
              placeholder="Ex: Autódromo de Interlagos"
              style={inputStyle()}
            />
          </label>

          <label>
            <span style={labelTitleStyle()}>Vagas</span>
            <input
              value={form.ride_seats}
              onChange={(e) => updateField("ride_seats", e.target.value)}
              placeholder="Ex: 3"
              style={inputStyle()}
            />
          </label>
        </div>

        <label>
          <span style={labelTitleStyle()}>Observações rápidas</span>
          <textarea
            value={form.ride_notes}
            onChange={(e) => updateField("ride_notes", e.target.value)}
            placeholder="Ex: Saída às 19h, aceito dividir combustível, retorno após o fechamento."
            style={textareaStyle()}
          />
          <div style={helperTextStyle()}>
            Use este campo para horário, ponto de encontro, divisão de custo, retorno ou observações do grupo.
          </div>
        </label>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <div style={previewCardStyle()}>
            <strong>Status da carona</strong>
            <div style={{ opacity: 0.84 }}>{ridePreviewStatus}</div>
          </div>

          <div style={previewCardStyle()}>
            <strong>Evento</strong>
            <div style={{ opacity: 0.84 }}>
              {normalizeText(form.ride_event_name) || "Ainda não definido."}
            </div>
          </div>

          <div style={previewCardStyle()}>
            <strong>Origem</strong>
            <div style={{ opacity: 0.84 }}>
              {normalizeText(form.ride_origin) || "Ainda não definido."}
            </div>
          </div>

          <div style={previewCardStyle()}>
            <strong>Destino</strong>
            <div style={{ opacity: 0.84 }}>
              {normalizeText(form.ride_destination) || "Ainda não definido."}
            </div>
          </div>

          <div style={previewCardStyle()}>
            <strong>Vagas</strong>
            <div style={{ opacity: 0.84 }}>
              {normalizeText(form.ride_seats) || "Ainda não definido."}
            </div>
          </div>

          <div style={previewCardStyle()}>
            <strong>Observações</strong>
            <div style={{ opacity: 0.84, lineHeight: 1.55 }}>
              {normalizeText(form.ride_notes) || "Ainda não definido."}
            </div>
          </div>
        </div>
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 6 }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>Encontros combinados no evento</h3>
          <p style={{ margin: 0, opacity: 0.78 }}>
            Segunda camada prática da comunidade para marcar ponto, horário e encontro entre membros dentro do evento.
          </p>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span>Completude do encontro</span>
            <strong>
              {meetReadyCount}/5
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
                width: `${meetReadyPercent}%`,
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, rgba(120,120,255,0.90), rgba(255,255,255,0.90))",
              }}
            />
          </div>

          <div style={{ fontSize: 13, opacity: 0.76 }}>
            {meetReadyPercent}% concluído.
          </div>
        </div>

        <label>
          <span style={labelTitleStyle()}>Situação do encontro</span>
          <select
            value={form.meet_status}
            onChange={(e) => updateField("meet_status", e.target.value)}
            style={selectStyle()}
          >
            <option value="" style={selectOptionStyle()}>
              Selecione
            </option>
            <option value="host" style={selectOptionStyle()}>
              Estou abrindo um ponto de encontro
            </option>
            <option value="join" style={selectOptionStyle()}>
              Quero entrar em um encontro
            </option>
            <option value="both" style={selectOptionStyle()}>
              Posso abrir ou entrar em um encontro
            </option>
          </select>
          <div style={helperTextStyle()}>
            Este campo define como o usuário entra no fluxo de encontro combinado dentro do evento.
          </div>
        </label>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <label>
            <span style={labelTitleStyle()}>Evento do encontro</span>
            <input
              value={form.meet_event_name}
              onChange={(e) => updateField("meet_event_name", e.target.value)}
              placeholder="Ex: Time Warp Brasil"
              style={inputStyle()}
            />

            <div style={searchBlockStyle()}>
              <strong>Sugestões globais de evento</strong>
              {meetEventSearch.loading ? (
                <div style={{ fontSize: 12, opacity: 0.74 }}>Buscando eventos...</div>
              ) : meetEventSearch.items.length > 0 ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {meetEventSearch.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateField("meet_event_name", item.name)}
                      style={suggestionButtonStyle(
                        normalizeSearchText(form.meet_event_name) === normalizeSearchText(item.name)
                      )}
                    >
                      <span>{item.name}</span>
                      {formatCatalogMeta(item) ? (
                        <span style={{ fontSize: 11, opacity: 0.72 }}>{formatCatalogMeta(item)}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.74 }}>
                  Nada encontrado. Pode escrever manualmente.
                </div>
              )}
            </div>
          </label>

          <label>
            <span style={labelTitleStyle()}>Ponto de encontro</span>
            <input
              value={form.meet_meeting_point}
              onChange={(e) => updateField("meet_meeting_point", e.target.value)}
              placeholder="Ex: Entrada principal, bar central, palco 2"
              style={inputStyle()}
            />
          </label>

          <label>
            <span style={labelTitleStyle()}>Horário</span>
            <input
              value={form.meet_time}
              onChange={(e) => updateField("meet_time", e.target.value)}
              placeholder="Ex: 22:30"
              style={inputStyle()}
            />
          </label>
        </div>

        <label>
          <span style={labelTitleStyle()}>Observações rápidas</span>
          <textarea
            value={form.meet_notes}
            onChange={(e) => updateField("meet_notes", e.target.value)}
            placeholder="Ex: Vamos encontrar perto do palco principal antes do set principal. Entrarei com mais dois amigos."
            style={textareaStyle()}
          />
          <div style={helperTextStyle()}>
            Use este campo para instruções curtas, referência visual, grupo, dress code ou observação do encontro.
          </div>
        </label>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <div style={previewCardStyle()}>
            <strong>Status do encontro</strong>
            <div style={{ opacity: 0.84 }}>{meetPreviewStatus}</div>
          </div>

          <div style={previewCardStyle()}>
            <strong>Evento</strong>
            <div style={{ opacity: 0.84 }}>
              {normalizeText(form.meet_event_name) || "Ainda não definido."}
            </div>
          </div>

          <div style={previewCardStyle()}>
            <strong>Ponto de encontro</strong>
            <div style={{ opacity: 0.84 }}>
              {normalizeText(form.meet_meeting_point) || "Ainda não definido."}
            </div>
          </div>

          <div style={previewCardStyle()}>
            <strong>Horário</strong>
            <div style={{ opacity: 0.84 }}>
              {normalizeText(form.meet_time) || "Ainda não definido."}
            </div>
          </div>

          <div style={previewCardStyle()}>
            <strong>Observações</strong>
            <div style={{ opacity: 0.84, lineHeight: 1.55 }}>
              {normalizeText(form.meet_notes) || "Ainda não definido."}
            </div>
          </div>
        </div>
      </section>

      <section style={sectionStyle()}>
        <h3 style={{ margin: 0, fontWeight: 900 }}>Playlist e streaming</h3>

        <label>
          <span style={labelTitleStyle()}>Nome da playlist principal</span>
          <input
            value={form.playlist_title}
            onChange={(e) => updateField("playlist_title", e.target.value)}
            placeholder="Ex: Warm Up para Warung"
            style={inputStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Descrição da playlist</span>
          <textarea
            value={form.playlist_description}
            onChange={(e) => updateField("playlist_description", e.target.value)}
            placeholder="Ex: seleção que representa meu som, minha energia e o tipo de pista em que me encontro."
            style={textareaStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Streaming principal do usuário</span>
          <select
            value={form.primary_streaming_platform}
            onChange={(e) => updateField("primary_streaming_platform", e.target.value)}
            style={selectStyle()}
          >
            <option value="" style={selectOptionStyle()}>
              Selecione o principal
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
            <option value="beatport" style={selectOptionStyle()}>
              Beatport
            </option>
            <option value="mixcloud" style={selectOptionStyle()}>
              Mixcloud
            </option>
          </select>
        </label>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <label>
            <span style={labelTitleStyle()}>Spotify</span>
            <input
              value={form.spotify_url}
              onChange={(e) => updateField("spotify_url", e.target.value)}
              placeholder="Cole o link"
              style={inputStyle()}
            />
          </label>

          <label>
            <span style={labelTitleStyle()}>SoundCloud</span>
            <input
              value={form.soundcloud_url}
              onChange={(e) => updateField("soundcloud_url", e.target.value)}
              placeholder="Cole o link"
              style={inputStyle()}
            />
          </label>

          <label>
            <span style={labelTitleStyle()}>YouTube</span>
            <input
              value={form.youtube_url}
              onChange={(e) => updateField("youtube_url", e.target.value)}
              placeholder="Cole o link"
              style={inputStyle()}
            />
          </label>

          <label>
            <span style={labelTitleStyle()}>Apple Music</span>
            <input
              value={form.apple_music_url}
              onChange={(e) => updateField("apple_music_url", e.target.value)}
              placeholder="Cole o link"
              style={inputStyle()}
            />
          </label>

          <label>
            <span style={labelTitleStyle()}>Deezer</span>
            <input
              value={form.deezer_url}
              onChange={(e) => updateField("deezer_url", e.target.value)}
              placeholder="Cole o link"
              style={inputStyle()}
            />
          </label>

          <label>
            <span style={labelTitleStyle()}>Beatport</span>
            <input
              value={form.beatport_url}
              onChange={(e) => updateField("beatport_url", e.target.value)}
              placeholder="Cole o link"
              style={inputStyle()}
            />
          </label>

          <label>
            <span style={labelTitleStyle()}>Mixcloud</span>
            <input
              value={form.mixcloud_url}
              onChange={(e) => updateField("mixcloud_url", e.target.value)}
              placeholder="Cole o link"
              style={inputStyle()}
            />
          </label>
        </div>
      </section>

      <div style={{ display: "grid", gap: 10 }}>
        <button
          type="button"
          onClick={saveProfile}
          disabled={saving}
          style={buttonStyle(saving)}
        >
          {saving ? "Salvando..." : "Salvar Club Mode"}
        </button>

        {message ? <p style={{ margin: 0, opacity: 0.88 }}>{message}</p> : null}
      </div>
    </div>
  );
}