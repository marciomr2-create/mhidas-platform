// src/app/dashboard/cards/[card_id]/ProfessionalProfileManager.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

type ProfessionalProfileRow = {
  id: string;
  user_id: string;
  profession: string | null;
  company_name: string | null;
  industry: string | null;
  city: string | null;
  services: string | null;
  looking_for: string | null;
  business_instagram: string | null;
  website: string | null;
  portfolio: string | null;
  linkedin: string | null;
  whatsapp_business: string | null;
  professional_email: string | null;
  bio_text: string | null;
  ai_summary: string | null;
  pro_photo_url: string | null;
  pro_photo_prompt: string | null;
  pro_photo_style: string | null;
  visible_in_network: boolean;
  accepts_professional_contact: boolean;
  created_at: string;
  updated_at: string;
};

type FormState = {
  profession: string;
  company_name: string;
  industry: string;
  city: string;
  services: string;
  looking_for: string;
  business_instagram: string;
  website: string;
  portfolio: string;
  linkedin: string;
  whatsapp_business: string;
  professional_email: string;
  bio_text: string;
  ai_summary: string;
  pro_photo_url: string;
  pro_photo_prompt: string;
  pro_photo_style: string;
  visible_in_network: boolean;
  accepts_professional_contact: boolean;
};

type ProfessionalProfileManagerProps = {
  proPublicHref?: string;
  hasPublicSlug?: boolean;
  isPublished?: boolean;
};

type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
};

type PromptPreset = {
  id: string;
  title: string;
  subtitle: string;
  style: string;
  prompt: string;
};

type BrazilCityItem = {
  id: string;
  city_name: string;
  state_code: string;
  display_name: string;
  sort_rank: number | null;
};

const STORAGE_BUCKET = "professional-photos";

const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "executivo-premium",
    title: "Executivo premium",
    subtitle: "Autoridade, credibilidade e posicionamento forte",
    style: "executivo premium clean",
    prompt:
      "Use esta foto como base, preservando fielmente rosto, cabelo, barba e identidade visual. Gere um retrato profissional premium, realista, com iluminação refinada, postura confiante, enquadramento de busto, roupa elegante, fundo limpo e sofisticado, estética corporativa moderna, alto valor percebido e aparência humana natural, sem exagerar retoques.",
  },
  {
    id: "corporativo-natural",
    title: "Corporativo natural",
    subtitle: "Humano, acessível e profissional",
    style: "retrato corporativo natural",
    prompt:
      "Use esta foto como imagem base, mantendo identidade facial real. Gere uma foto profissional corporativa natural, com expressão segura e simpática, boa luz, nitidez elevada, roupa discreta e elegante, fundo neutro, visual moderno e confiável, com leve refinamento de pele e luz, preservando autenticidade e textura natural.",
  },
  {
    id: "empreendedor-moderno",
    title: "Empreendedor moderno",
    subtitle: "Para founders, criadores e líderes",
    style: "empreendedor moderno high value",
    prompt:
      "Use esta foto como base e preserve a identidade real da pessoa. Gere um retrato profissional de empreendedor moderno, premium, sofisticado e atual, com boa direção de luz, expressão inteligente e segura, enquadramento forte, roupa alinhada ao universo de negócios, fundo limpo ou escritório elegante desfocado e percepção de alto valor.",
  },
  {
    id: "especialista-tecnologia",
    title: "Especialista em tecnologia",
    subtitle: "Para SaaS, IA, software e inovação",
    style: "tech professional premium",
    prompt:
      "Use esta foto como base, preservando rosto e identidade visual real. Gere uma foto profissional voltada para tecnologia e inovação, com atmosfera premium, iluminação limpa, look moderno, postura segura, fundo sofisticado e minimalista, estilo compatível com fundador de startup, especialista em software ou inteligência artificial.",
  },
  {
    id: "consultor-autoridade",
    title: "Consultor com autoridade",
    subtitle: "Para networking, vendas e apresentação comercial",
    style: "consultor de autoridade",
    prompt:
      "Use esta foto como base, mantendo a identidade facial totalmente reconhecível. Gere um retrato profissional de consultor de alto valor, com postura firme, expressão confiante, presença executiva, iluminação refinada, roupa bem escolhida, fundo elegante e discreto, aparência polida e respeitável, transmitindo clareza, maturidade e confiança comercial.",
  },
];

const EMPTY_FORM: FormState = {
  profession: "",
  company_name: "",
  industry: "",
  city: "",
  services: "",
  looking_for: "",
  business_instagram: "",
  website: "",
  portfolio: "",
  linkedin: "",
  whatsapp_business: "",
  professional_email: "",
  bio_text: "",
  ai_summary: "",
  pro_photo_url: "",
  pro_photo_prompt: "",
  pro_photo_style: "",
  visible_in_network: true,
  accepts_professional_contact: true,
};

function sectionStyle() {
  return {
    padding: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
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
    minHeight: 110,
    resize: "vertical" as const,
  };
}

function labelTitleStyle() {
  return {
    display: "block",
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 700,
  } as const;
}

function cardStyle() {
  return {
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.035)",
    display: "grid",
    gap: 12,
  } as const;
}

function actionButtonStyle(disabled = false) {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: disabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 800,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
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

function normalizeText(value: string | null | undefined): string {
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

function hasContent(value: string | null | undefined): boolean {
  return normalizeText(value).length > 0;
}

function extractBrazilPhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits.slice(2);
  return digits;
}

function buildWhatsAppUrl(value: string): string {
  const localDigits = extractBrazilPhoneDigits(value);
  if (!localDigits) return "";
  return `https://wa.me/55${localDigits}`;
}

function formatBrazilPhoneDisplay(value: string): string {
  const digits = extractBrazilPhoneDigits(value);
  if (!digits) return "+55 ";
  if (digits.length <= 2) return `+55 (${digits}`;
  if (digits.length <= 7) return `+55 (${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function getStatusMeta(status: "incomplete" | "ready" | "optimized") {
  if (status === "optimized") {
    return {
      label: "Publicado e otimizado",
      background: "rgba(0,200,120,0.12)",
      border: "1px solid rgba(0,200,120,0.32)",
      color: "#7dffbe",
    };
  }

  if (status === "ready") {
    return {
      label: "Pronto para networking",
      background: "rgba(255,184,0,0.12)",
      border: "1px solid rgba(255,184,0,0.32)",
      color: "#ffd76a",
    };
  }

  return {
    label: "Incompleto",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#fff",
  };
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

function mapRowToForm(row: ProfessionalProfileRow | null | undefined): FormState {
  return {
    profession: row?.profession ?? "",
    company_name: row?.company_name ?? "",
    industry: row?.industry ?? "",
    city: row?.city ?? "",
    services: row?.services ?? "",
    looking_for: row?.looking_for ?? "",
    business_instagram: row?.business_instagram ?? "",
    website: row?.website ?? "",
    portfolio: row?.portfolio ?? "",
    linkedin: row?.linkedin ?? "",
    whatsapp_business: extractBrazilPhoneDigits(row?.whatsapp_business ?? ""),
    professional_email: row?.professional_email ?? "",
    bio_text: row?.bio_text ?? "",
    ai_summary: row?.ai_summary ?? "",
    pro_photo_url: row?.pro_photo_url ?? "",
    pro_photo_prompt: row?.pro_photo_prompt ?? "",
    pro_photo_style: row?.pro_photo_style ?? "",
    visible_in_network: row?.visible_in_network ?? true,
    accepts_professional_contact: row?.accepts_professional_contact ?? true,
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

export default function ProfessionalProfileManager({
  proPublicHref = "",
  hasPublicSlug = false,
  isPublished = false,
}: ProfessionalProfileManagerProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [message, setMessage] = useState("");
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [localPhotoPreview, setLocalPhotoPreview] = useState("");
  const [photoTouched, setPhotoTouched] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  const citySearch = useBrazilCitySearch(supabase, form.city);

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
      .from("professional_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setLoading(false);
      setMessage("Não foi possível carregar o perfil profissional.");
      return;
    }

    if (data) {
      const row = data as ProfessionalProfileRow;
      setProfileId(row.id);
      setForm(mapRowToForm(row));
    } else {
      setProfileId(null);
      setForm(EMPTY_FORM);
    }

    setLoading(false);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleWhatsAppChange(value: string) {
    const digits = extractBrazilPhoneDigits(value).slice(0, 11);
    updateField("whatsapp_business", digits);
  }

  async function copyProLink() {
    if (!proPublicHref) {
      setMessage("Defina e publique um slug para liberar o link profissional.");
      return;
    }

    try {
      const absoluteUrl = `${window.location.origin}${proPublicHref}`;
      await navigator.clipboard.writeText(absoluteUrl);
      setMessage("Link do perfil profissional copiado com sucesso.");
    } catch {
      setMessage("Não foi possível copiar o link agora.");
    }
  }

  async function copyPromptText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Prompt copiado com sucesso.");
    } catch {
      setMessage("Não foi possível copiar o prompt agora.");
    }
  }

  function applyPreset(preset: PromptPreset) {
    setForm((prev) => ({
      ...prev,
      pro_photo_prompt: preset.prompt,
      pro_photo_style: preset.style,
    }));
    setMessage(`Preset aplicado: ${preset.title}.`);
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

    const maxSizeInBytes = 5 * 1024 * 1024;
    if (selectedFile.size > maxSizeInBytes) {
      setMessage("A imagem deve ter no máximo 5 MB.");
      event.target.value = "";
      return;
    }

    try {
      const preview = await fileToDataUrl(selectedFile);
      setSelectedPhotoFile(selectedFile);
      setLocalPhotoPreview(preview);
      setPhotoTouched(true);
      setMessage("Foto selecionada com sucesso. Agora clique em Salvar.");
    } catch {
      setMessage("Não foi possível preparar a pré-visualização da imagem.");
    }

    event.target.value = "";
  }

  function removePhoto() {
    setSelectedPhotoFile(null);
    setLocalPhotoPreview("");
    setPhotoTouched(true);
    setForm((prev) => ({
      ...prev,
      pro_photo_url: "",
    }));
    setShowPhotoViewer(false);
    setMessage("Foto removida do formulário. Agora clique em Salvar.");
  }

  async function uploadPendingPhotoIfNeeded(userId: string): Promise<string> {
    if (!photoTouched) {
      return normalizeText(form.pro_photo_url);
    }

    if (!selectedPhotoFile) {
      return "";
    }

    const sanitizedName = sanitizeFileName(selectedPhotoFile.name || "foto-profissional");
    const fileExt = sanitizedName.includes(".") ? sanitizedName.split(".").pop() : "jpg";
    const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, selectedPhotoFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `Não foi possível enviar a foto agora. Verifique se o bucket '${STORAGE_BUCKET}' existe e se as permissões estão corretas.`
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl || "";

    if (!publicUrl) {
      throw new Error("A foto foi enviada, mas não foi possível gerar a URL pública.");
    }

    return publicUrl;
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
      const whatsappUrl = buildWhatsAppUrl(form.whatsapp_business);
      const finalPhotoUrl = await uploadPendingPhotoIfNeeded(user.id);

      const basePayload = {
        profession: normalizeText(form.profession) || null,
        company_name: normalizeText(form.company_name) || null,
        industry: normalizeText(form.industry) || null,
        city: normalizeText(form.city) || null,
        services: normalizeText(form.services) || null,
        looking_for: normalizeText(form.looking_for) || null,
        business_instagram: normalizeText(form.business_instagram) || null,
        website: normalizeText(form.website) || null,
        portfolio: normalizeText(form.portfolio) || null,
        linkedin: normalizeText(form.linkedin) || null,
        whatsapp_business: whatsappUrl || null,
        professional_email: normalizeText(form.professional_email) || null,
        bio_text: normalizeText(form.bio_text) || null,
        ai_summary: normalizeText(form.ai_summary) || null,
        pro_photo_url: finalPhotoUrl || null,
        pro_photo_prompt: normalizeText(form.pro_photo_prompt) || null,
        pro_photo_style: normalizeText(form.pro_photo_style) || null,
        visible_in_network: form.visible_in_network,
        accepts_professional_contact: form.accepts_professional_contact,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedRows, error: updateError } = await supabase
        .from("professional_profiles")
        .update(basePayload)
        .eq("user_id", user.id)
        .select("*");

      if (updateError) {
        setSaving(false);
        setMessage(`Não foi possível atualizar agora. ${updateError.message}`);
        return;
      }

      let persistedRow: ProfessionalProfileRow | null =
        Array.isArray(updatedRows) && updatedRows.length > 0
          ? (updatedRows[0] as ProfessionalProfileRow)
          : null;

      if (!persistedRow) {
        const { data: insertedRow, error: insertError } = await supabase
          .from("professional_profiles")
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

        persistedRow = insertedRow as ProfessionalProfileRow;
      }

      const { data: confirmedRow, error: confirmError } = await supabase
        .from("professional_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (confirmError || !confirmedRow) {
        setSaving(false);
        setMessage("O salvamento foi iniciado, mas não foi possível confirmar a persistência no banco.");
        return;
      }

      const finalRow = confirmedRow as ProfessionalProfileRow;

      setProfileId(finalRow.id);
      setForm(mapRowToForm(finalRow));
      setSelectedPhotoFile(null);
      setLocalPhotoPreview("");
      setPhotoTouched(false);
      setSaving(false);
      setMessage("Perfil profissional salvo com sucesso e confirmado no banco.");

      router.refresh();
    } catch (error) {
      setSaving(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o perfil profissional."
      );
    }
  }

  const effectivePhotoPreview = localPhotoPreview || form.pro_photo_url;

  const checklist = useMemo<ChecklistItem[]>(() => {
    return [
      { key: "profession", label: "Atuação", done: hasContent(form.profession) },
      { key: "company_name", label: "Empresa ou marca", done: hasContent(form.company_name) },
      { key: "industry", label: "Área", done: hasContent(form.industry) },
      { key: "city", label: "Cidade e estado", done: hasContent(form.city) },
      { key: "services", label: "O que oferece", done: hasContent(form.services) },
      { key: "looking_for", label: "O que busca", done: hasContent(form.looking_for) },
      { key: "whatsapp_business", label: "WhatsApp", done: hasContent(form.whatsapp_business) },
      { key: "ai_summary", label: "Resumo", done: hasContent(form.ai_summary) },
      { key: "pro_photo_url", label: "Foto profissional", done: hasContent(effectivePhotoPreview) },
      {
        key: "visible_in_network",
        label: "Visibilidade no networking",
        done: Boolean(form.visible_in_network),
      },
    ];
  }, [form, effectivePhotoPreview]);

  const completedCount = checklist.filter((item) => item.done).length;
  const totalChecklistItems = checklist.length;
  const completionPercent = Math.round((completedCount / totalChecklistItems) * 100);
  const missingItems = checklist.filter((item) => !item.done);

  const readyForNetworking =
    hasContent(form.profession) &&
    hasContent(form.industry) &&
    hasContent(form.city) &&
    hasContent(form.services) &&
    hasContent(form.looking_for) &&
    hasContent(form.whatsapp_business) &&
    hasContent(form.ai_summary) &&
    Boolean(form.visible_in_network);

  const optimized =
    completedCount === totalChecklistItems &&
    hasPublicSlug &&
    isPublished;

  const profileStatus: "incomplete" | "ready" | "optimized" = optimized
    ? "optimized"
    : readyForNetworking
      ? "ready"
      : "incomplete";

  const statusMeta = getStatusMeta(profileStatus);
  const primaryContactLabel = hasContent(form.whatsapp_business)
    ? "WhatsApp é o canal principal deste perfil agora."
    : hasContent(form.professional_email)
      ? "WhatsApp ainda não foi preenchido. O e-mail será o fallback de contato."
      : "Preencha ao menos WhatsApp ou e-mail para abrir um canal claro de contato.";

  if (loading) {
    return <p>Carregando...</p>;
  }

  return (
    <>
      <div style={{ display: "grid", gap: 16 }}>
        <section style={cardStyle()}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0, fontWeight: 900 }}>Checklist do Pro Mode</h3>
              <p style={{ margin: 0, opacity: 0.78 }}>
                Fortaleça seu perfil profissional antes de competir na busca e no networking.
              </p>
            </div>

            <div
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background: statusMeta.background,
                border: statusMeta.border,
                color: statusMeta.color,
                fontWeight: 900,
                whiteSpace: "nowrap",
              }}
            >
              {statusMeta.label}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                fontSize: 14,
                opacity: 0.86,
              }}
            >
              <span>Completude do perfil profissional</span>
              <strong>
                {completedCount}/{totalChecklistItems} campos estratégicos
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
                  width: `${completionPercent}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: optimized
                    ? "linear-gradient(90deg, #00c878, #67f0aa)"
                    : readyForNetworking
                      ? "linear-gradient(90deg, #ffb800, #ffd86b)"
                      : "linear-gradient(90deg, #ffffff, #bdbdbd)",
                }}
              />
            </div>

            <div style={{ fontSize: 13, opacity: 0.78 }}>{completionPercent}% concluído.</div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            }}
          >
            {checklist.map((item) => (
              <div
                key={item.key}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: item.done
                    ? "1px solid rgba(0,200,120,0.28)"
                    : "1px solid rgba(255,255,255,0.12)",
                  background: item.done
                    ? "rgba(0,200,120,0.08)"
                    : "rgba(255,255,255,0.03)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <span>{item.label}</span>
                <strong style={{ opacity: 0.95 }}>{item.done ? "OK" : "Falta"}</strong>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              display: "grid",
              gap: 8,
            }}
          >
            <strong>O que falta para seu perfil ficar forte</strong>

            {missingItems.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {missingItems.map((item) => (
                  <span
                    key={item.key}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      fontSize: 13,
                    }}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, opacity: 0.82 }}>
                Seu perfil já está com todos os campos estratégicos preenchidos.
              </p>
            )}

            <p style={{ margin: 0, opacity: 0.72, fontSize: 13 }}>{primaryContactLabel}</p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" onClick={copyProLink} style={actionButtonStyle()}>
              Copiar link do perfil profissional
            </button>

            {proPublicHref ? (
              <a
                href={proPublicHref}
                target="_blank"
                rel="noopener noreferrer"
                style={actionButtonStyle()}
              >
                Abrir preview público
              </a>
            ) : null}
          </div>
        </section>

        <section style={cardStyle()}>
          <div style={{ display: "grid", gap: 4 }}>
            <h3 style={{ margin: 0, fontWeight: 900 }}>Preview rápido do perfil profissional</h3>
            <p style={{ margin: 0, opacity: 0.78 }}>
              Visão resumida do que hoje está mais forte no seu perfil público profissional.
            </p>
          </div>

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
                fontSize: 12,
                opacity: 0.78,
                textAlign: "center",
                padding: 10,
              }}
            >
              {hasContent(effectivePhotoPreview) ? (
                <img
                  src={effectivePhotoPreview}
                  alt="Foto profissional"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <span>Sem foto profissional</span>
              )}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <strong style={{ fontSize: 18 }}>
                  {hasContent(form.profession) ? form.profession : "Sua atuação ainda não foi preenchida"}
                </strong>
                <div style={{ marginTop: 4, opacity: 0.76 }}>
                  {hasContent(form.company_name) ? form.company_name : "Empresa ou marca não informada"}
                  {hasContent(form.city) ? ` • ${form.city}` : ""}
                </div>
              </div>

              <p style={{ margin: 0, opacity: 0.88 }}>
                {hasContent(form.ai_summary)
                  ? form.ai_summary
                  : "Preencha o resumo principal para melhorar sua clareza e autoridade no networking."}
              </p>
            </div>
          </div>
        </section>

        <section style={sectionStyle()}>
          <div style={{ display: "grid", gap: 4 }}>
            <h3 style={{ margin: 0, fontWeight: 900 }}>Identidade profissional</h3>
            <p style={{ margin: 0, opacity: 0.78 }}>
              Preencha os dados que fortalecem sua apresentação no perfil público.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <label>
              <span style={labelTitleStyle()}>Atuação</span>
              <input
                value={form.profession}
                onChange={(e) => updateField("profession", e.target.value)}
                placeholder="Ex: Empresário, Designer, DJ"
                style={inputStyle()}
              />
            </label>

            <label>
              <span style={labelTitleStyle()}>Empresa ou marca</span>
              <input
                value={form.company_name}
                onChange={(e) => updateField("company_name", e.target.value)}
                placeholder="Ex: Deep Technology"
                style={inputStyle()}
              />
            </label>

            <label>
              <span style={labelTitleStyle()}>Área de atuação</span>
              <input
                value={form.industry}
                onChange={(e) => updateField("industry", e.target.value)}
                placeholder="Ex: tecnologia de software"
                style={inputStyle()}
              />
            </label>

            <label>
              <span style={labelTitleStyle()}>Cidade e estado</span>
              <input
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && citySearch.items.length > 0) {
                    e.preventDefault();
                    updateField("city", citySearch.items[0].display_name);
                  }
                }}
                placeholder="Digite a cidade e escolha a opção no formato Cidade - UF"
                style={inputStyle()}
              />

              <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.55, opacity: 0.72 }}>
                Busca nacional focada no Brasil. O resultado final fica sempre no padrão Cidade - UF. Se preferir, você também pode escrever manualmente.
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
                        onClick={() => updateField("city", item.display_name)}
                        style={suggestionButtonStyle(
                          normalizeSearchText(form.city) === normalizeSearchText(item.display_name)
                        )}
                      >
                        {item.display_name}
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
          </div>

          <label>
            <span style={labelTitleStyle()}>O que oferece</span>
            <textarea
              value={form.services}
              onChange={(e) => updateField("services", e.target.value)}
              placeholder="Descreva de forma objetiva o que você entrega."
              style={textareaStyle()}
            />
          </label>

          <label>
            <span style={labelTitleStyle()}>O que busca</span>
            <textarea
              value={form.looking_for}
              onChange={(e) => updateField("looking_for", e.target.value)}
              placeholder="Ex: networking, clientes, parcerias, oportunidades"
              style={textareaStyle()}
            />
          </label>
        </section>

        <section style={sectionStyle()}>
          <div style={{ display: "grid", gap: 4 }}>
            <h3 style={{ margin: 0, fontWeight: 900 }}>Contato rápido</h3>
            <p style={{ margin: 0, opacity: 0.78 }}>
              O WhatsApp é o canal mais forte para resposta rápida. O código do Brasil já está definido.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <label>
              <span style={labelTitleStyle()}>WhatsApp profissional</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    padding: "12px 14px",
                    borderRight: "1px solid rgba(255,255,255,0.10)",
                    opacity: 0.88,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  +55
                </span>

                <input
                  value={form.whatsapp_business}
                  onChange={(e) => handleWhatsAppChange(e.target.value)}
                  placeholder="DDD + telefone"
                  inputMode="numeric"
                  style={{
                    ...inputStyle(),
                    border: "none",
                    borderRadius: 0,
                    background: "transparent",
                  }}
                />
              </div>

              <p style={{ margin: 0, opacity: 0.72, fontSize: 12 }}>
                Digite apenas DDD + telefone. Exemplo visual: {formatBrazilPhoneDisplay(form.whatsapp_business)}
              </p>
            </label>

            <label>
              <span style={labelTitleStyle()}>E-mail profissional</span>
              <input
                value={form.professional_email}
                onChange={(e) => updateField("professional_email", e.target.value)}
                placeholder="Ex: contato@suaempresa.com"
                style={inputStyle()}
              />
            </label>
          </div>
        </section>

        <section style={sectionStyle()}>
          <div style={{ display: "grid", gap: 4 }}>
            <h3 style={{ margin: 0, fontWeight: 900 }}>Canais profissionais</h3>
            <p style={{ margin: 0, opacity: 0.78 }}>
              Esses canais aparecem como acessos complementares no perfil profissional.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <label>
              <span style={labelTitleStyle()}>Website</span>
              <input
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
                placeholder="Ex: https://seusite.com"
                style={inputStyle()}
              />
            </label>

            <label>
              <span style={labelTitleStyle()}>Portfólio</span>
              <input
                value={form.portfolio}
                onChange={(e) => updateField("portfolio", e.target.value)}
                placeholder="Ex: https://portfolio.com"
                style={inputStyle()}
              />
            </label>

            <label>
              <span style={labelTitleStyle()}>LinkedIn</span>
              <input
                value={form.linkedin}
                onChange={(e) => updateField("linkedin", e.target.value)}
                placeholder="Ex: https://linkedin.com/in/seuperfil"
                style={inputStyle()}
              />
            </label>

            <label>
              <span style={labelTitleStyle()}>Instagram do negócio</span>
              <input
                value={form.business_instagram}
                onChange={(e) => updateField("business_instagram", e.target.value)}
                placeholder="Ex: https://instagram.com/suamarca"
                style={inputStyle()}
              />
            </label>
          </div>
        </section>

        <section style={sectionStyle()}>
          <div style={{ display: "grid", gap: 4 }}>
            <h3 style={{ margin: 0, fontWeight: 900 }}>Apresentação</h3>
            <p style={{ margin: 0, opacity: 0.78 }}>
              Use textos curtos, claros e voltados à ação.
            </p>
          </div>

          <label>
            <span style={labelTitleStyle()}>Resumo principal</span>
            <textarea
              value={form.ai_summary}
              onChange={(e) => updateField("ai_summary", e.target.value)}
              placeholder="Ex: Crio sistemas inteligentes para empresas e negócios."
              style={textareaStyle()}
            />
          </label>

          <label>
            <span style={labelTitleStyle()}>Texto complementar</span>
            <textarea
              value={form.bio_text}
              onChange={(e) => updateField("bio_text", e.target.value)}
              placeholder="Use este campo para detalhes adicionais sobre sua atuação."
              style={textareaStyle()}
            />
          </label>
        </section>

        <section style={sectionStyle()}>
          <div style={{ display: "grid", gap: 4 }}>
            <h3 style={{ margin: 0, fontWeight: 900 }}>Foto profissional</h3>
            <p style={{ margin: 0, opacity: 0.78 }}>
              A prévia aparece na hora. A foto pública só entra depois do salvar com sucesso.
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
              gridTemplateColumns: "90px 1fr",
              alignItems: "start",
            }}
          >
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                padding: 8,
                fontSize: 11,
                opacity: 0.82,
              }}
            >
              {hasContent(effectivePhotoPreview) ? (
                <img
                  src={effectivePhotoPreview}
                  alt="Preview da foto profissional"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <span>Sem foto</span>
              )}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button type="button" onClick={openPhotoPicker} style={actionButtonStyle(false)}>
                  Selecionar foto profissional
                </button>

                <button
                  type="button"
                  onClick={removePhoto}
                  disabled={!hasContent(effectivePhotoPreview)}
                  style={actionButtonStyle(!hasContent(effectivePhotoPreview))}
                >
                  Remover foto
                </button>

                <button
                  type="button"
                  onClick={() => setShowPhotoViewer(true)}
                  disabled={!hasContent(effectivePhotoPreview)}
                  style={actionButtonStyle(!hasContent(effectivePhotoPreview))}
                >
                  Abrir foto
                </button>
              </div>

              <label>
                <span style={labelTitleStyle()}>Foto profissional URL</span>
                <input
                  value={form.pro_photo_url}
                  onChange={(e) => {
                    setSelectedPhotoFile(null);
                    setLocalPhotoPreview("");
                    setPhotoTouched(false);
                    updateField("pro_photo_url", e.target.value);
                  }}
                  placeholder="Ex: https://seusite.com/foto-profissional.jpg"
                  style={inputStyle()}
                />
              </label>
            </div>
          </div>
        </section>

        <section style={sectionStyle()}>
          <div style={{ display: "grid", gap: 4 }}>
            <h3 style={{ margin: 0, fontWeight: 900 }}>Prompts de foto profissional com IA</h3>
            <p style={{ margin: 0, opacity: 0.78 }}>
              Os presets ficam recolhidos para ocupar menos espaço.
            </p>
          </div>

          <div style={collapsibleStyle()}>
            <details>
              <summary style={summaryStyle()}>Abrir presets de prompts profissionais</summary>

              <div style={{ padding: "0 16px 16px 16px", display: "grid", gap: 14 }}>
                <div
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.03)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <strong>Como usar</strong>
                  <div style={{ opacity: 0.82, lineHeight: 1.6 }}>
                    1. Selecione sua foto base no bloco acima.
                    <br />
                    2. Escolha um dos presets abaixo.
                    <br />
                    3. Clique em copiar prompt.
                    <br />
                    4. Envie sua foto base + prompt no Gemini ou ChatGPT.
                    <br />
                    5. Gere a imagem profissional final.
                    <br />
                    6. Volte ao MHIDAS, envie a nova foto e clique em Salvar.
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  }}
                >
                  {PROMPT_PRESETS.map((preset) => {
                    const active =
                      normalizeText(form.pro_photo_prompt) === normalizeText(preset.prompt) &&
                      normalizeText(form.pro_photo_style) === normalizeText(preset.style);

                    return (
                      <div key={preset.id} style={presetCardStyle(active)}>
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong>{preset.title}</strong>
                          <div style={{ fontSize: 13, opacity: 0.78 }}>{preset.subtitle}</div>
                        </div>

                        <div style={{ fontSize: 12, opacity: 0.72 }}>
                          <strong>Estilo:</strong> {preset.style}
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.86,
                            lineHeight: 1.55,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {preset.prompt}
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                          <button
                            type="button"
                            onClick={() => applyPreset(preset)}
                            style={actionButtonStyle()}
                          >
                            Usar este prompt
                          </button>

                          <button
                            type="button"
                            onClick={() => copyPromptText(preset.prompt)}
                            style={actionButtonStyle()}
                          >
                            Copiar prompt
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </details>
          </div>

          <label>
            <span style={labelTitleStyle()}>Prompt da foto profissional</span>
            <textarea
              value={form.pro_photo_prompt}
              onChange={(e) => updateField("pro_photo_prompt", e.target.value)}
              placeholder="Cole aqui ou edite o prompt selecionado."
              style={textareaStyle()}
            />
          </label>

          <label>
            <span style={labelTitleStyle()}>Estilo visual da foto profissional</span>
            <input
              value={form.pro_photo_style}
              onChange={(e) => updateField("pro_photo_style", e.target.value)}
              placeholder="Ex: executivo premium clean"
              style={inputStyle()}
            />
          </label>
        </section>

        <section style={sectionStyle()}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>Visibilidade</h3>

          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={form.visible_in_network}
              onChange={(e) => updateField("visible_in_network", e.target.checked)}
            />
            <span>Mostrar este perfil na rede profissional</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={form.accepts_professional_contact}
              onChange={(e) => updateField("accepts_professional_contact", e.target.checked)}
            />
            <span>Aceitar contatos profissionais</span>
          </label>
        </section>

        <section style={sectionStyle()}>
          <div style={{ display: "grid", gap: 4 }}>
            <h3 style={{ margin: 0, fontWeight: 900 }}>Leitura atual do Pro Mode</h3>
            <p style={{ margin: 0, opacity: 0.78 }}>
              Este bloco mostra como o sistema está entendendo a identidade pública profissional.
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
              <strong>Atuação</strong>
              <div style={{ opacity: 0.84 }}>{form.profession || "Ainda não definido."}</div>
            </div>

            <div style={previewCardStyle()}>
              <strong>Empresa ou marca</strong>
              <div style={{ opacity: 0.84 }}>{form.company_name || "Ainda não definido."}</div>
            </div>

            <div style={previewCardStyle()}>
              <strong>Área de atuação</strong>
              <div style={{ opacity: 0.84 }}>{form.industry || "Ainda não definido."}</div>
            </div>

            <div style={previewCardStyle()}>
              <strong>Cidade e estado</strong>
              <div style={{ opacity: 0.84 }}>{form.city || "Ainda não definido."}</div>
            </div>

            <div style={previewCardStyle()}>
              <strong>Canal principal</strong>
              <div style={{ opacity: 0.84 }}>
                {form.whatsapp_business
                  ? formatBrazilPhoneDisplay(form.whatsapp_business)
                  : form.professional_email || "Ainda não definido."}
              </div>
            </div>

            <div style={previewCardStyle()}>
              <strong>Resumo principal</strong>
              <div style={{ opacity: 0.84, lineHeight: 1.55 }}>
                {form.ai_summary || "Ainda não definido."}
              </div>
            </div>
          </div>
        </section>

        <div style={{ display: "grid", gap: 10 }}>
          <button
            onClick={saveProfile}
            disabled={saving}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>

          {message ? <p style={{ margin: 0, opacity: 0.88 }}>{message}</p> : null}

          {profileId ? (
            <p style={{ margin: 0, opacity: 0.55, fontSize: 12 }}>
              Perfil profissional carregado e pronto para edição.
            </p>
          ) : null}
        </div>
      </div>

      {showPhotoViewer && hasContent(effectivePhotoPreview) ? (
        <div
          onClick={() => setShowPhotoViewer(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.82)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 720,
              width: "100%",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowPhotoViewer(false)}
                style={actionButtonStyle()}
              >
                Fechar foto
              </button>
            </div>

            <div
              style={{
                background: "#111",
                borderRadius: 18,
                padding: 12,
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <img
                src={effectivePhotoPreview}
                alt="Foto profissional ampliada"
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "80vh",
                  objectFit: "contain",
                  display: "block",
                  borderRadius: 12,
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}