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

type ProPhotoStyle =
  | ""
  | "corporativa-classica"
  | "moderna-profissional"
  | "criativa-profissional";

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

function rowToForm(row: ProfessionalProfileRow | null): FormState {
  if (!row) return EMPTY_FORM;

  return {
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
    whatsapp_business: row.whatsapp_business ?? "",
    professional_email: row.professional_email ?? "",
    bio_text: row.bio_text ?? "",
    ai_summary: row.ai_summary ?? "",
    pro_photo_url: row.pro_photo_url ?? "",
    pro_photo_prompt: row.pro_photo_prompt ?? "",
    pro_photo_style: row.pro_photo_style ?? "",
    visible_in_network: row.visible_in_network ?? true,
    accepts_professional_contact: row.accepts_professional_contact ?? true,
  };
}

function getProfessionalPhotoPrompt(style: ProPhotoStyle): string {
  switch (style) {
    case "corporativa-classica":
      return [
        "Use minha foto real como referência principal para gerar uma versão profissional de alta qualidade.",
        "Mantenha rigorosamente meu rosto, identidade facial, cabelo e barba sem alterações.",
        "Não mude meus traços, não troque formato do rosto, não altere cor de pele, não me transforme em outra pessoa.",
        "Permita apenas suavização muito leve de linhas de expressão, preservando aparência natural e realista.",
        "Gerar retrato profissional corporativo clássico, elegante e confiável, com iluminação equilibrada, fundo neutro ou ambiente executivo discreto, enquadramento do peito para cima, postura confiante, roupa profissional e acabamento premium.",
        "A imagem final deve parecer uma fotografia real de alto padrão, adequada para perfil profissional, sem exageros, sem filtros artificiais e sem descaracterização."
      ].join(" ");

    case "moderna-profissional":
      return [
        "Use minha foto real como referência principal para gerar uma versão profissional moderna e refinada.",
        "Preserve integralmente meu rosto, identidade facial, cabelo e barba.",
        "Não altere meus traços, não invente outro rosto, não mude meu estilo físico.",
        "Permita apenas ajustes muito leves de expressão e pequenas melhorias naturais de pele, mantendo realismo total.",
        "Gerar retrato profissional moderno, sofisticado e acessível, com iluminação natural ou de estúdio suave, fundo limpo ou ambiente contemporâneo, enquadramento do peito para cima, presença confiante, estética premium e adequada para perfil profissional.",
        "A imagem deve transmitir credibilidade, clareza e elegância, mantendo minha aparência real."
      ].join(" ");

    case "criativa-profissional":
      return [
        "Use minha foto real como referência principal para gerar uma versão profissional criativa, porém realista.",
        "Mantenha meu rosto, identidade facial, cabelo e barba sem alterações.",
        "Não transforme minha aparência, não modifique meus traços principais, não gere outro personagem.",
        "Permita apenas suavização muito leve de marcas de expressão, sem perder naturalidade.",
        "Gerar retrato profissional criativo, elegante e marcante, com iluminação refinada, composição moderna, fundo visualmente interessante porém limpo, enquadramento profissional, presença forte e estética de alto nível, ideal para profissionais criativos e empreendedores.",
        "A imagem final deve continuar parecendo uma fotografia real minha, apenas melhor apresentada, sem exageros e sem descaracterização."
      ].join(" ");

    default:
      return "";
  }
}

function getStyleLabel(style: string): string {
  switch (style as ProPhotoStyle) {
    case "corporativa-classica":
      return "Foto corporativa clássica";
    case "moderna-profissional":
      return "Foto moderna profissional";
    case "criativa-profissional":
      return "Foto criativa profissional";
    default:
      return "Não definido";
  }
}

export default function ProfessionalProfileManager() {
  const supabase = useMemo(() => createBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function loadProfile() {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setCopyMsg(null);

    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr) throw authErr;
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      const { data, error } = await supabase
        .from("professional_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      const row = (data as ProfessionalProfileRow | null) ?? null;

      setProfileId(row?.id ?? null);
      setForm(rowToForm(row));
    } catch (e: any) {
      setProfileId(null);
      setForm(EMPTY_FORM);
      setErrorMsg(e?.message ?? "Falha ao carregar o Pro Mode.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr) throw authErr;
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      const payload = {
        user_id: user.id,
        profession: form.profession.trim() || null,
        company_name: form.company_name.trim() || null,
        industry: form.industry.trim() || null,
        city: form.city.trim() || null,
        services: form.services.trim() || null,
        looking_for: form.looking_for.trim() || null,
        business_instagram: form.business_instagram.trim() || null,
        website: form.website.trim() || null,
        portfolio: form.portfolio.trim() || null,
        linkedin: form.linkedin.trim() || null,
        whatsapp_business: form.whatsapp_business.trim() || null,
        professional_email: form.professional_email.trim() || null,
        bio_text: form.bio_text.trim() || null,
        ai_summary: form.ai_summary.trim() || null,
        pro_photo_url: form.pro_photo_url.trim() || null,
        pro_photo_prompt: form.pro_photo_prompt.trim() || null,
        pro_photo_style: form.pro_photo_style.trim() || null,
        visible_in_network: form.visible_in_network,
        accepts_professional_contact: form.accepts_professional_contact,
      };

      const { data, error } = await supabase
        .from("professional_profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select("*")
        .single();

      if (error) throw error;

      const row = data as ProfessionalProfileRow;
      setProfileId(row.id);
      setForm(rowToForm(row));
      setSuccessMsg("Pro Mode salvo com sucesso.");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Falha ao salvar o Pro Mode.");
    } finally {
      setSaving(false);
    }
  }

  async function copyPrompt() {
    setCopyMsg(null);

    try {
      if (!form.pro_photo_prompt.trim()) {
        setCopyMsg("Nenhum prompt disponível para copiar.");
        return;
      }

      await navigator.clipboard.writeText(form.pro_photo_prompt);
      setCopyMsg("Prompt copiado com sucesso.");
      setTimeout(() => {
        setCopyMsg((current) => (current === "Prompt copiado com sucesso." ? null : current));
      }, 2500);
    } catch {
      setCopyMsg("Não foi possível copiar o prompt.");
      setTimeout(() => {
        setCopyMsg((current) => (current === "Não foi possível copiar o prompt." ? null : current));
      }, 2500);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleProfessionalStyleChange(value: string) {
    const nextStyle = value as ProPhotoStyle;
    const nextPrompt = getProfessionalPhotoPrompt(nextStyle);

    setForm((prev) => ({
      ...prev,
      pro_photo_style: nextStyle,
      pro_photo_prompt: nextPrompt,
    }));
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "inherit",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "grid",
    gap: 8,
  };

  const sectionStyle: React.CSSProperties = {
    padding: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    display: "grid",
    gap: 14,
  };

  const helperBoxStyle: React.CSSProperties = {
    padding: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    lineHeight: 1.55,
    opacity: 0.92,
  };

  const darkSelectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "white",
    cursor: "pointer",
  };

  if (loading) {
    return (
      <div style={{ marginTop: 12 }}>
        <p style={{ opacity: 0.8 }}>Carregando Pro Mode...</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, display: "grid", gap: 16 }}>
      {errorMsg ? (
        <div
          style={{
            padding: 10,
            border: "1px solid rgba(255,80,80,0.35)",
            background: "rgba(255,80,80,0.08)",
            borderRadius: 10,
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      {successMsg ? (
        <div
          style={{
            padding: 10,
            border: "1px solid rgba(0,180,120,0.35)",
            background: "rgba(0,180,120,0.08)",
            borderRadius: 10,
          }}
        >
          {successMsg}
        </div>
      ) : null}

      <div style={{ opacity: 0.72, fontSize: 13 }}>
        {profileId ? `Registro do Pro Mode: ${profileId}` : "Pro Mode ainda não salvo."}
      </div>

      <section style={sectionStyle}>
        <h3 style={{ margin: 0, fontWeight: 900 }}>Identidade profissional</h3>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <label style={labelStyle}>
            <span>Profissão principal</span>
            <input
              type="text"
              value={form.profession}
              onChange={(e) => updateField("profession", e.target.value)}
              style={inputStyle}
              placeholder="Ex.: Advogado, Designer, Empresário"
            />
          </label>

          <label style={labelStyle}>
            <span>Empresa ou marca</span>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => updateField("company_name", e.target.value)}
              style={inputStyle}
              placeholder="Ex.: Deep Technology"
            />
          </label>

          <label style={labelStyle}>
            <span>Área de atuação</span>
            <input
              type="text"
              value={form.industry}
              onChange={(e) => updateField("industry", e.target.value)}
              style={inputStyle}
              placeholder="Ex.: Tecnologia, Direito, Marketing"
            />
          </label>

          <label style={labelStyle}>
            <span>Cidade</span>
            <input
              type="text"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              style={inputStyle}
              placeholder="Ex.: São Paulo"
            />
          </label>
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={{ margin: 0, fontWeight: 900 }}>Atuação e oportunidades</h3>

        <label style={labelStyle}>
          <span>Serviços ou atividades que oferece</span>
          <textarea
            value={form.services}
            onChange={(e) => updateField("services", e.target.value)}
            style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
            placeholder="Descreva seus serviços, atividades ou competências."
          />
        </label>

        <label style={labelStyle}>
          <span>O que procura dentro da rede</span>
          <textarea
            value={form.looking_for}
            onChange={(e) => updateField("looking_for", e.target.value)}
            style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
            placeholder="Ex.: Novos clientes, parcerias, networking, fornecedores."
          />
        </label>
      </section>

      <section style={sectionStyle}>
        <h3 style={{ margin: 0, fontWeight: 900 }}>Canais profissionais</h3>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <label style={labelStyle}>
            <span>Instagram do negócio</span>
            <input
              type="text"
              value={form.business_instagram}
              onChange={(e) => updateField("business_instagram", e.target.value)}
              style={inputStyle}
              placeholder="https://instagram.com/seunegocio"
            />
          </label>

          <label style={labelStyle}>
            <span>Website</span>
            <input
              type="text"
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
              style={inputStyle}
              placeholder="https://seusite.com"
            />
          </label>

          <label style={labelStyle}>
            <span>Portfólio</span>
            <input
              type="text"
              value={form.portfolio}
              onChange={(e) => updateField("portfolio", e.target.value)}
              style={inputStyle}
              placeholder="https://portfolio.com"
            />
          </label>

          <label style={labelStyle}>
            <span>LinkedIn</span>
            <input
              type="text"
              value={form.linkedin}
              onChange={(e) => updateField("linkedin", e.target.value)}
              style={inputStyle}
              placeholder="https://linkedin.com/in/seuperfil"
            />
          </label>

          <label style={labelStyle}>
            <span>WhatsApp profissional</span>
            <input
              type="text"
              value={form.whatsapp_business}
              onChange={(e) => updateField("whatsapp_business", e.target.value)}
              style={inputStyle}
              placeholder="https://wa.me/5511999999999"
            />
          </label>

          <label style={labelStyle}>
            <span>E-mail profissional</span>
            <input
              type="email"
              value={form.professional_email}
              onChange={(e) => updateField("professional_email", e.target.value)}
              style={inputStyle}
              placeholder="voce@empresa.com"
            />
          </label>
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={{ margin: 0, fontWeight: 900 }}>Apresentação</h3>

        <label style={labelStyle}>
          <span>Texto profissional do usuário</span>
          <textarea
            value={form.bio_text}
            onChange={(e) => updateField("bio_text", e.target.value)}
            style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
            placeholder="Descreva sua atuação profissional."
          />
        </label>

        <label style={labelStyle}>
          <span>Resumo gerado por IA</span>
          <textarea
            value={form.ai_summary}
            onChange={(e) => updateField("ai_summary", e.target.value)}
            style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
            placeholder="Este campo será usado futuramente pela IA."
          />
        </label>
      </section>

      <section style={sectionStyle}>
        <h3 style={{ margin: 0, fontWeight: 900 }}>Foto profissional</h3>

        <div style={helperBoxStyle}>
          <strong>Como gerar sua foto profissional</strong>
          <div style={{ marginTop: 8 }}>
            Use uma ferramenta de IA como <strong>Gemini</strong> ou <strong>ChatGPT</strong> para gerar sua foto profissional.
            Escolha um estilo abaixo, copie o prompt sugerido e gere sua imagem usando uma foto sua como referência.
            A imagem deve preservar seu rosto, cabelo e barba, sem descaracterizar sua identidade.
            Depois envie a imagem final para o campo "URL da foto profissional".
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <label style={labelStyle}>
            <span>URL da foto profissional</span>
            <input
              type="text"
              value={form.pro_photo_url}
              onChange={(e) => updateField("pro_photo_url", e.target.value)}
              style={inputStyle}
              placeholder="https://..."
            />
          </label>

          <label style={labelStyle}>
            <span>Estilo da foto profissional</span>
            <select
              value={form.pro_photo_style}
              onChange={(e) => handleProfessionalStyleChange(e.target.value)}
              style={darkSelectStyle}
            >
              <option value="" style={{ background: "#0b0b0b", color: "white" }}>
                Selecione um estilo
              </option>
              <option value="corporativa-classica" style={{ background: "#0b0b0b", color: "white" }}>
                Foto corporativa clássica
              </option>
              <option value="moderna-profissional" style={{ background: "#0b0b0b", color: "white" }}>
                Foto moderna profissional
              </option>
              <option value="criativa-profissional" style={{ background: "#0b0b0b", color: "white" }}>
                Foto criativa profissional
              </option>
            </select>
          </label>
        </div>

        <div style={{ opacity: 0.72, fontSize: 13 }}>
          Estilo selecionado: <strong>{getStyleLabel(form.pro_photo_style)}</strong>
        </div>

        <label style={labelStyle}>
          <span>Prompt privado para foto profissional</span>
          <textarea
            value={form.pro_photo_prompt}
            onChange={(e) => updateField("pro_photo_prompt", e.target.value)}
            style={{ ...inputStyle, minHeight: 160, resize: "vertical" }}
            placeholder="Selecione um estilo para gerar automaticamente o prompt."
          />
        </label>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={copyPrompt}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Copiar Prompt
          </button>

          {copyMsg ? (
            <span
              style={{
                fontSize: 13,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgba(120,160,255,0.25)",
                background: "rgba(120,160,255,0.08)",
                color: "rgba(255,255,255,0.92)",
              }}
            >
              {copyMsg}
            </span>
          ) : null}
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={{ margin: 0, fontWeight: 900 }}>Visibilidade</h3>

        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={form.visible_in_network}
            onChange={(e) => updateField("visible_in_network", e.target.checked)}
          />
          <span>Mostrar este perfil no networking profissional</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={form.accepts_professional_contact}
            onChange={(e) => updateField("accepts_professional_contact", e.target.checked)}
          />
          <span>Aceitar contato profissional</span>
        </label>
      </section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={saveProfile}
          disabled={saving}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.06)",
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 800,
          }}
        >
          {saving ? "Salvando..." : "Salvar Pro Mode"}
        </button>

        <button
          type="button"
          onClick={loadProfile}
          disabled={saving}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.03)",
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 800,
          }}
        >
          Recarregar
        </button>
      </div>
    </div>
  );
}