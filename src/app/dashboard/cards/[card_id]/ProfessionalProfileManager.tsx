// src/components/dashboard/ProfessionalProfileManager.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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

function normalizeText(value: string | null | undefined): string {
  return String(value || "").trim();
}

function extractBrazilPhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("55")) {
    return digits.slice(2);
  }

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

export default function ProfessionalProfileManager() {
  const supabase = useMemo(() => createBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [message, setMessage] = useState("");

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
      setForm({
        profession: row.profession ?? "",
        company_name: row.company_name ?? "",
        industry: row.industry ?? "",
        city: row.city ?? "",
        services: row.services ?? "",
        looking_for: row.looking_for ?? "",
        business_instagram: row.business_instagram ?? "",
        website: row.website ?? "",
        portfolio: row.portfolio ?? "",
        linkedin: row.linkedin ?? "",
        whatsapp_business: extractBrazilPhoneDigits(row.whatsapp_business ?? ""),
        professional_email: row.professional_email ?? "",
        bio_text: row.bio_text ?? "",
        ai_summary: row.ai_summary ?? "",
        pro_photo_url: row.pro_photo_url ?? "",
        pro_photo_prompt: row.pro_photo_prompt ?? "",
        pro_photo_style: row.pro_photo_style ?? "",
        visible_in_network: row.visible_in_network ?? true,
        accepts_professional_contact:
          row.accepts_professional_contact ?? true,
      });
    }

    setLoading(false);
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

    const whatsappUrl = buildWhatsAppUrl(form.whatsapp_business);

    const payload = {
      user_id: user.id,
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
      pro_photo_url: normalizeText(form.pro_photo_url) || null,
      pro_photo_prompt: normalizeText(form.pro_photo_prompt) || null,
      pro_photo_style: normalizeText(form.pro_photo_style) || null,
      visible_in_network: form.visible_in_network,
      accepts_professional_contact: form.accepts_professional_contact,
    };

    const { error } = await supabase
      .from("professional_profiles")
      .upsert(payload, {
        onConflict: "user_id",
      });

    if (error) {
      setSaving(false);
      setMessage(`Não foi possível salvar agora. ${error.message}`);
      return;
    }

    const { data: refreshed, error: refreshError } = await supabase
      .from("professional_profiles")
      .select("id, whatsapp_business")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!refreshError && refreshed?.id) {
      setProfileId(String(refreshed.id));
    }

    setSaving(false);
    setMessage("Perfil profissional salvo com sucesso.");
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleWhatsAppChange(value: string) {
    const digits = extractBrazilPhoneDigits(value).slice(0, 11);
    updateField("whatsapp_business", digits);
  }

  if (loading) {
    return <p>Carregando...</p>;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
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
            <span style={labelTitleStyle()}>Cidade</span>
            <input
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="Ex: São Caetano do Sul"
              style={inputStyle()}
            />
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
              onChange={(e) =>
                updateField("professional_email", e.target.value)
              }
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
              onChange={(e) =>
                updateField("business_instagram", e.target.value)
              }
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
        <h3 style={{ margin: 0, fontWeight: 900 }}>Visibilidade</h3>

        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={form.visible_in_network}
            onChange={(e) =>
              updateField("visible_in_network", e.target.checked)
            }
          />
          <span>Mostrar este perfil na rede profissional</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={form.accepts_professional_contact}
            onChange={(e) =>
              updateField("accepts_professional_contact", e.target.checked)
            }
          />
          <span>Aceitar contatos profissionais</span>
        </label>
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
            fontWeight: 800,
          }}
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>

        {message ? (
          <p style={{ margin: 0, opacity: 0.88 }}>{message}</p>
        ) : null}

        {profileId ? (
          <p style={{ margin: 0, opacity: 0.55, fontSize: 12 }}>
            Perfil profissional carregado e pronto para edição.
          </p>
        ) : null}
      </div>
    </div>
  );
}