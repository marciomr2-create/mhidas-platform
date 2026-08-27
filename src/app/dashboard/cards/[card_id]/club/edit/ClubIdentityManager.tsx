"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

type Props = {
  cardId: string;
  initialLabel: string;
};

type FormState = {
  label: string;
  city_base: string;
  club_tagline: string;
  favorite_genres: string;
  club_photo_url: string;
};

type BrazilCityItem = {
  id: string;
  display_name: string;
};

type CatalogItem = {
  id: string;
  name: string;
};

const CLUB_BUCKET = "club-photos";

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

function splitGenres(value: string) {
  return Array.from(
    new Map(
      value
        .split(/,|;|\|/)
        .map((item) => normalizeText(item))
        .filter(Boolean)
        .map((item) => [normalizeSearchText(item), item])
    ).values()
  );
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

function inputStyle() {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.13)",
    background: "rgba(255,255,255,0.035)",
    color: "#fff",
    outline: "none",
  } as const;
}

function textareaStyle() {
  return {
    ...inputStyle(),
    minHeight: 96,
    resize: "vertical" as const,
  };
}

function fieldStyle() {
  return {
    display: "grid",
    gap: 8,
  } as const;
}

function helperStyle() {
  return {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.55,
    opacity: 0.68,
  } as const;
}

function buttonStyle(primary = false, disabled = false) {
  return {
    minHeight: 42,
    padding: "10px 15px",
    borderRadius: 12,
    border: primary
      ? "1px solid rgba(42,134,148,0.52)"
      : "1px solid rgba(255,255,255,0.14)",
    background: primary
      ? "var(--mhidas-clubber-action-strong)"
      : "rgba(255,255,255,0.055)",
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 850,
    opacity: disabled ? 0.55 : 1,
  } as const;
}

function suggestionStyle(active = false) {
  return {
    padding: "8px 10px",
    borderRadius: 999,
    border: active
      ? "1px solid rgba(42,134,148,0.52)"
      : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(42,134,148,0.12)" : "rgba(255,255,255,0.045)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 750,
  } as const;
}

export default function ClubIdentityManager({ cardId, initialLabel }: Props) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<FormState>({
    label: initialLabel,
    city_base: "",
    club_tagline: "",
    favorite_genres: "",
    club_photo_url: "",
  });
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [localPhotoPreview, setLocalPhotoPreview] = useState("");
  const [photoTouched, setPhotoTouched] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<BrazilCityItem[]>([]);
  const [genreSuggestions, setGenreSuggestions] = useState<CatalogItem[]>([]);
  const [genreDraft, setGenreDraft] = useState("");

  useEffect(() => {
    void loadCurrentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void searchCities(form.city_base);
    }, 220);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.city_base]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void searchGenres(genreDraft);
    }, 220);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genreDraft]);

  async function loadCurrentData() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      const [{ data: cardData, error: cardError }, { data: profileData, error: profileError }] =
        await Promise.all([
          supabase
            .from("cards")
            .select("label")
            .eq("card_id", cardId)
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("club_profiles")
            .select("city_base,club_tagline,favorite_genres,club_photo_url")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

      if (cardError) throw cardError;
      if (profileError) throw profileError;

      setForm({
        label: normalizeText(cardData?.label) || initialLabel,
        city_base: normalizeText(profileData?.city_base),
        club_tagline: normalizeText(profileData?.club_tagline),
        favorite_genres: normalizeText(profileData?.favorite_genres),
        club_photo_url: normalizeText(profileData?.club_photo_url),
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }

  async function searchCities(rawQuery: string) {
    const query = normalizeSearchText(rawQuery);

    if (query.length < 2) {
      setCitySuggestions([]);
      return;
    }

    const { data, error } = await supabase
      .from("br_cities")
      .select("id,display_name")
      .eq("is_active", true)
      .ilike("search_name", `%${query}%`)
      .order("sort_rank", { ascending: false })
      .order("display_name", { ascending: true })
      .limit(8);

    setCitySuggestions(error ? [] : ((data as BrazilCityItem[]) || []));
  }

  async function searchGenres(rawQuery: string) {
    const query = normalizeSearchText(rawQuery);

    if (query.length < 2) {
      setGenreSuggestions([]);
      return;
    }

    const { data, error } = await supabase
      .from("catalog_items")
      .select("id,name")
      .eq("item_type", "genre")
      .eq("is_active", true)
      .ilike("normalized_name", `%${query}%`)
      .order("popularity", { ascending: false })
      .order("name", { ascending: true })
      .limit(10);

    setGenreSuggestions(error ? [] : ((data as CatalogItem[]) || []));
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addGenre(rawValue: string) {
    const next = normalizeText(rawValue);
    if (!next) return;

    const current = splitGenres(form.favorite_genres);
    const exists = current.some(
      (item) => normalizeSearchText(item) === normalizeSearchText(next)
    );

    if (!exists) {
      updateField("favorite_genres", [...current, next].join(", "));
    }

    setGenreDraft("");
    setGenreSuggestions([]);
  }

  function removeGenre(target: string) {
    updateField(
      "favorite_genres",
      splitGenres(form.favorite_genres)
        .filter((item) => normalizeSearchText(item) !== normalizeSearchText(target))
        .join(", ")
    );
  }

  async function handlePhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Selecione uma imagem válida.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("A imagem deve ter no máximo 5 MB.");
      return;
    }

    try {
      const preview = await fileToDataUrl(file);
      setSelectedPhotoFile(file);
      setLocalPhotoPreview(preview);
      setPhotoTouched(true);
      setMessage("Nova foto selecionada. Salve para concluir.");
    } catch {
      setMessage("Não foi possível preparar a imagem.");
    }
  }

  function removePhoto() {
    setSelectedPhotoFile(null);
    setLocalPhotoPreview("");
    setPhotoTouched(true);
    updateField("club_photo_url", "");
    setMessage("Foto removida do formulário. Salve para concluir.");
  }

  async function uploadPhoto(userId: string) {
    if (!photoTouched) return normalizeText(form.club_photo_url);
    if (!selectedPhotoFile) return "";

    const sanitized = sanitizeFileName(selectedPhotoFile.name || "clubber-photo.jpg");
    const extension = sanitized.includes(".") ? sanitized.split(".").pop() : "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const { error } = await supabase.storage
      .from(CLUB_BUCKET)
      .upload(path, selectedPhotoFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw new Error(`Não foi possível enviar a foto. ${error.message}`);

    const { data } = supabase.storage.from(CLUB_BUCKET).getPublicUrl(path);
    return data?.publicUrl || "";
  }

  async function save() {
    const nextLabel = normalizeText(form.label);

    if (!nextLabel) {
      setMessage("Informe o nome do perfil.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      const finalPhotoUrl = await uploadPhoto(user.id);

      const { data: updatedCard, error: cardError } = await supabase
        .from("cards")
        .update({ label: nextLabel })
        .eq("card_id", cardId)
        .eq("user_id", user.id)
        .select("card_id")
        .single();

      if (cardError || !updatedCard) {
        throw new Error(cardError?.message || "Não foi possível atualizar o nome do perfil.");
      }

      const profilePayload = {
        city_base: normalizeText(form.city_base) || null,
        club_tagline: normalizeText(form.club_tagline) || null,
        favorite_genres: splitGenres(form.favorite_genres).join(", ") || null,
        club_photo_url: finalPhotoUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedProfiles, error: updateError } = await supabase
        .from("club_profiles")
        .update(profilePayload)
        .eq("user_id", user.id)
        .select("user_id");

      if (updateError) throw updateError;

      if (!Array.isArray(updatedProfiles) || updatedProfiles.length === 0) {
        const { error: insertError } = await supabase.from("club_profiles").insert({
          user_id: user.id,
          ...profilePayload,
        });

        if (insertError) throw insertError;
      }

      setForm((current) => ({
        ...current,
        label: nextLabel,
        favorite_genres: splitGenres(current.favorite_genres).join(", "),
        club_photo_url: finalPhotoUrl,
      }));
      setSelectedPhotoFile(null);
      setLocalPhotoPreview("");
      setPhotoTouched(false);
      setMessage("Alterações salvas com sucesso.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar agora.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p style={{ margin: 0, opacity: 0.74 }}>Carregando identidade...</p>;
  }

  const photoPreview = localPhotoPreview || form.club_photo_url;
  const selectedGenres = splitGenres(form.favorite_genres);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {message ? (
        <div
          style={{
            padding: "11px 13px",
            borderRadius: 12,
            border: "1px solid rgba(42,134,148,0.28)",
            background: "rgba(42,134,148,0.08)",
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <strong>Foto do perfil</strong>

          <div
            style={{
              width: "100%",
              aspectRatio: "16 / 10",
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.035)",
              display: "grid",
              placeItems: "center",
            }}
          >
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Foto do Perfil Clubber"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ opacity: 0.62 }}>Nenhuma foto selecionada</span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelected}
            style={{ display: "none" }}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={buttonStyle(false, saving)}
              disabled={saving}
            >
              Escolher foto
            </button>

            {photoPreview ? (
              <button
                type="button"
                onClick={removePhoto}
                style={buttonStyle(false, saving)}
                disabled={saving}
              >
                Remover foto
              </button>
            ) : null}
          </div>

          <p style={helperStyle()}>Formatos de imagem com até 5 MB.</p>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <label style={fieldStyle()}>
            <strong>Nome do perfil</strong>
            <input
              value={form.label}
              onChange={(event) => updateField("label", event.target.value)}
              maxLength={80}
              placeholder="Como você quer aparecer"
              style={inputStyle()}
            />
          </label>

          <label style={fieldStyle()}>
            <strong>Cidade e estado</strong>
            <input
              value={form.city_base}
              onChange={(event) => updateField("city_base", event.target.value)}
              placeholder="Ex: São Paulo - SP"
              style={inputStyle()}
            />

            {citySuggestions.length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {citySuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      updateField("city_base", item.display_name);
                      setCitySuggestions([]);
                    }}
                    style={suggestionStyle(
                      normalizeSearchText(form.city_base) ===
                        normalizeSearchText(item.display_name)
                    )}
                  >
                    {item.display_name}
                  </button>
                ))}
              </div>
            ) : null}
          </label>
        </div>
      </div>

      <label style={fieldStyle()}>
        <strong>Minha identidade na cena</strong>
        <textarea
          value={form.club_tagline}
          onChange={(event) => updateField("club_tagline", event.target.value)}
          maxLength={220}
          placeholder="Conte em uma frase como você se conecta com a cena eletrônica."
          style={textareaStyle()}
        />
        <p style={helperStyle()}>{form.club_tagline.length}/220 caracteres</p>
      </label>

      <div style={fieldStyle()}>
        <strong>Vertentes musicais</strong>

        <input
          value={genreDraft}
          onChange={(event) => setGenreDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "," || event.key === ";") {
              event.preventDefault();
              addGenre(genreDraft);
            }
          }}
          onBlur={() => addGenre(genreDraft)}
          placeholder="Digite uma vertente e pressione Enter"
          style={inputStyle()}
        />

        {selectedGenres.length > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {selectedGenres.map((genre) => (
              <span
                key={normalizeSearchText(genre)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 0",
                  borderRadius: 0,
                  border: "0",
                  background: "transparent",
                  color: "var(--mhidas-clubber-action)",
                  fontSize: 12,
                  fontWeight: 750,
                }}
              >
                {genre}
                <button
                  type="button"
                  onClick={() => removeGenre(genre)}
                  aria-label={`Remover ${genre}`}
                  style={{
                    width: 19,
                    height: 19,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {genreSuggestions.length > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {genreSuggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addGenre(item.name)}
                style={suggestionStyle(
                  selectedGenres.some(
                    (genre) => normalizeSearchText(genre) === normalizeSearchText(item.name)
                  )
                )}
              >
                {item.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        style={{ ...buttonStyle(true, saving), width: "100%" }}
      >
        {saving ? "Salvando..." : "Salvar alterações"}
      </button>
    </div>
  );
}
