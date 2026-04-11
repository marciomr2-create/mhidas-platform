// src/app/dashboard/cards/[card_id]/ClubProfileManager.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  created_at: string;
  updated_at: string;
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

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim();
}

function hasContent(value: string | null | undefined) {
  return normalizeText(value).length > 0;
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

export default function ClubProfileManager({
  clubPublicHref = "",
  hasPublicSlug = false,
  isPublished = false,
}: ClubProfileManagerProps) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [localPhotoPreview, setLocalPhotoPreview] = useState("");
  const [photoTouched, setPhotoTouched] = useState(false);

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
      const row = data as ClubProfileRow;
      setForm({
        club_tagline: row.club_tagline ?? "",
        city_base: row.city_base ?? "",
        favorite_genres: row.favorite_genres ?? "",
        favorite_artists: row.favorite_artists ?? "",
        favorite_events: row.favorite_events ?? "",
        last_events: row.last_events ?? "",
        next_events: row.next_events ?? "",
        favorite_clubs: row.favorite_clubs ?? "",
        playlist_title: row.playlist_title ?? "",
        playlist_description: row.playlist_description ?? "",
        club_photo_url: row.club_photo_url ?? "",
        club_photo_prompt: row.club_photo_prompt ?? "",
        club_photo_style: row.club_photo_style ?? "",
        spotify_url: row.spotify_url ?? "",
        soundcloud_url: row.soundcloud_url ?? "",
        youtube_url: row.youtube_url ?? "",
        beatport_url: row.beatport_url ?? "",
        mixcloud_url: row.mixcloud_url ?? "",
      });
    }

    setLoading(false);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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

      const payload = {
        user_id: user.id,
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
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("club_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (error) {
        setSaving(false);
        setMessage(`Não foi possível salvar agora. ${error.message}`);
        return;
      }

      setForm((prev) => ({ ...prev, club_photo_url: finalPhotoUrl }));
      setSelectedPhotoFile(null);
      setLocalPhotoPreview("");
      setPhotoTouched(false);
      setSaving(false);
      setMessage("Club Mode salvo com sucesso.");
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
    hasContent(form.favorite_genres),
    hasContent(form.favorite_artists),
    hasContent(form.favorite_events),
    hasContent(form.next_events),
    hasContent(form.favorite_clubs),
    hasContent(effectivePhotoPreview),
    hasContent(form.playlist_title),
    hasContent(form.spotify_url) ||
      hasContent(form.soundcloud_url) ||
      hasContent(form.youtube_url) ||
      hasContent(form.beatport_url) ||
      hasContent(form.mixcloud_url),
  ];

  const completenessCount = completenessItems.filter(Boolean).length;
  const completenessPercent = Math.round((completenessCount / completenessItems.length) * 100);

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
            <strong>{completenessCount}/{completenessItems.length}</strong>
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

          {hasPublicSlug && isPublished ? (
            <span style={{ ...buttonStyle(true), cursor: "default" }}>
              Link Club ativo
            </span>
          ) : null}
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
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
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
            <summary style={summaryStyle()}>
              Abrir presets de foto Club
            </summary>

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
                      <button type="button" onClick={() => applyPreset(preset)} style={buttonStyle()}>
                        Usar este prompt
                      </button>

                      <button type="button" onClick={() => copyPromptText(preset.prompt)} style={buttonStyle()}>
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
        <h3 style={{ margin: 0, fontWeight: 900 }}>Identidade da cena</h3>

        <label>
          <span style={labelTitleStyle()}>Frase do Club</span>
          <input
            value={form.club_tagline}
            onChange={(e) => updateField("club_tagline", e.target.value)}
            placeholder="Ex: Tech House • São Paulo • Warung vibes"
            style={inputStyle()}
          />
        </label>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <label>
            <span style={labelTitleStyle()}>Cidade / base cultural</span>
            <input
              value={form.city_base}
              onChange={(e) => updateField("city_base", e.target.value)}
              placeholder="Ex: São Paulo"
              style={inputStyle()}
            />
          </label>

          <label>
            <span style={labelTitleStyle()}>Vertentes preferidas</span>
            <input
              value={form.favorite_genres}
              onChange={(e) => updateField("favorite_genres", e.target.value)}
              placeholder="Ex: Tech House, Melodic Techno, House"
              style={inputStyle()}
            />
          </label>
        </div>

        <label>
          <span style={labelTitleStyle()}>Artistas prediletos</span>
          <textarea
            value={form.favorite_artists}
            onChange={(e) => updateField("favorite_artists", e.target.value)}
            placeholder="Ex: Vintage Culture, Solomun, Adriatique..."
            style={textareaStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Clubs, labels e experiências favoritas</span>
          <textarea
            value={form.favorite_clubs}
            onChange={(e) => updateField("favorite_clubs", e.target.value)}
            placeholder="Ex: Warung, Só Track Boa, Ame Club..."
            style={textareaStyle()}
          />
        </label>
      </section>

      <section style={sectionStyle()}>
        <h3 style={{ margin: 0, fontWeight: 900 }}>Eventos e presença</h3>

        <label>
          <span style={labelTitleStyle()}>Eventos e festivais prediletos</span>
          <textarea
            value={form.favorite_events}
            onChange={(e) => updateField("favorite_events", e.target.value)}
            placeholder="Ex: Tomorrowland Brasil, DGTL, Só Track Boa..."
            style={textareaStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Últimos eventos em que foi</span>
          <textarea
            value={form.last_events}
            onChange={(e) => updateField("last_events", e.target.value)}
            placeholder="Ex: Warung Day Festival 2025, Time Warp..."
            style={textareaStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Próximos eventos</span>
          <textarea
            value={form.next_events}
            onChange={(e) => updateField("next_events", e.target.value)}
            placeholder="Ex: Só Track Boa SP, Green Valley..."
            style={textareaStyle()}
          />
        </label>
      </section>

      <section style={sectionStyle()}>
        <h3 style={{ margin: 0, fontWeight: 900 }}>Playlist e streaming</h3>

        <label>
          <span style={labelTitleStyle()}>Título da playlist principal</span>
          <input
            value={form.playlist_title}
            onChange={(e) => updateField("playlist_title", e.target.value)}
            placeholder="Ex: Warm Up para Warung"
            style={inputStyle()}
          />
        </label>

        <label>
          <span style={labelTitleStyle()}>Descrição da playlist / destaque</span>
          <textarea
            value={form.playlist_description}
            onChange={(e) => updateField("playlist_description", e.target.value)}
            placeholder="Ex: seleção que representa meu som e minha energia na cena."
            style={textareaStyle()}
          />
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