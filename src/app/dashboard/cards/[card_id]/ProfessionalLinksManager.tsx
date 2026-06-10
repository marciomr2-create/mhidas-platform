// src/app/dashboard/cards/[card_id]/ProfessionalLinksManager.tsx
"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type ProfessionalLinkRow = {
  id: string;
  platform: string;
  url: string;
  label: string | null;
  is_active: boolean;
  sort_order: number;
  position: number;
  clicks_count: number;
  mode: string | null;
  updated_at: string;
};

type LinkDraft = {
  label: string;
  url: string;
  isActive: boolean;
};

type Props = {
  cardId: string;
};

const SLOT_COUNT = 6;

const SLOT_PLATFORMS = Array.from(
  { length: SLOT_COUNT },
  (_, index) => `pro_link_${index + 1}`,
);

const PRESETS = [
  "Website",
  "Portfólio",
  "LinkedIn",
  "Instagram profissional",
  "WhatsApp",
  "Ver produtos no marketplace",
  "Ver catálogo",
  "Currículo",
  "GitHub",
  "Agendar atendimento",
];

const PRO_BORDER = "rgba(148,163,184,0.22)";
const PRO_BORDER_STRONG = "rgba(59,130,246,0.34)";
const PRO_TEXT = "#F8FAFC";
const PRO_TEXT_SECONDARY = "#CBD5E1";

function emptyDraft(): LinkDraft {
  return {
    label: "",
    url: "",
    isActive: false,
  };
}

function createEmptyDrafts(): LinkDraft[] {
  return Array.from({ length: SLOT_COUNT }, emptyDraft);
}

function normalizeText(value: string | null | undefined): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(rawValue: string, label: string): string {
  const value = normalizeText(rawValue);

  if (!value) return "";

  const normalizedLabel = normalizeText(label).toLowerCase();

  if (normalizedLabel.includes("whatsapp") && /^[+\d\s().-]+$/.test(value)) {
    const digits = value.replace(/\D/g, "");

    if (digits.length >= 10) {
      return `https://wa.me/${digits}`;
    }
  }

  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) {
    return value;
  }

  if (/^\/\//.test(value)) {
    return `https:${value}`;
  }

  return `https://${value}`;
}

function isValidUrl(value: string): boolean {
  if (!value) return false;

  if (/^(mailto:|tel:)/i.test(value)) {
    return value.length > 7;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function buildDrafts(rows: ProfessionalLinkRow[]): LinkDraft[] {
  const byPlatform = new Map(rows.map((row) => [row.platform, row]));

  return SLOT_PLATFORMS.map((platform) => {
    const row = byPlatform.get(platform);

    if (!row) return emptyDraft();

    return {
      label: normalizeText(row.label),
      url: normalizeText(row.url),
      isActive: Boolean(row.is_active),
    };
  });
}

function serializeDrafts(drafts: LinkDraft[]): string {
  return JSON.stringify(
    drafts.map((draft) => ({
      label: normalizeText(draft.label),
      url: normalizeText(draft.url),
      isActive: draft.isActive,
    })),
  );
}

function sectionStyle(): CSSProperties {
  return {
    padding: 16,
    borderRadius: 18,
    border: `1px solid ${PRO_BORDER}`,
    background: "rgba(15,23,42,0.72)",
    boxShadow: "0 18px 44px rgba(2,6,23,0.20)",
    color: PRO_TEXT,
  };
}

function compactRowStyle(
  isActive: boolean,
  isExpanded: boolean,
): CSSProperties {
  return {
    borderRadius: 16,
    border: isActive
      ? "1px solid rgba(45,212,191,0.34)"
      : isExpanded
        ? `1px solid ${PRO_BORDER_STRONG}`
        : `1px solid ${PRO_BORDER}`,
    background: isActive
      ? "linear-gradient(135deg, rgba(13,148,136,0.10), rgba(15,23,42,0.72))"
      : "rgba(15,23,42,0.62)",
    overflow: "hidden",
  };
}

function inputStyle(): CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    padding: "11px 12px",
    borderRadius: 12,
    border: `1px solid ${PRO_BORDER}`,
    background: "rgba(2,6,23,0.34)",
    color: PRO_TEXT,
    outline: "none",
    boxSizing: "border-box",
  };
}

function selectStyle(): CSSProperties {
  return {
    ...inputStyle(),
    cursor: "pointer",
  };
}

function labelStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 7,
    color: PRO_TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: 750,
  };
}

function buttonStyle(options?: {
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}): CSSProperties {
  const primary = Boolean(options?.primary);
  const danger = Boolean(options?.danger);
  const disabled = Boolean(options?.disabled);

  let background = "rgba(15,23,42,0.8)";
  let border = `1px solid ${PRO_BORDER}`;

  if (primary) {
    background = "linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)";
    border = "1px solid rgba(45,212,191,0.34)";
  }

  if (danger) {
    background = "rgba(127,29,29,0.22)";
    border = "1px solid rgba(248,113,113,0.3)";
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "9px 13px",
    borderRadius: 12,
    border,
    background: disabled ? "rgba(15,23,42,0.45)" : background,
    color: PRO_TEXT,
    fontWeight: 850,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    textDecoration: "none",
  };
}

function switchStyle(active: boolean, disabled: boolean): CSSProperties {
  return {
    position: "relative",
    width: 54,
    height: 30,
    borderRadius: 999,
    border: active
      ? "1px solid rgba(45,212,191,0.44)"
      : `1px solid ${PRO_BORDER}`,
    background: active ? "#0D9488" : "rgba(51,65,85,0.8)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    padding: 0,
    flexShrink: 0,
  };
}

function switchKnobStyle(active: boolean): CSSProperties {
  return {
    position: "absolute",
    top: 3,
    left: active ? 27 : 3,
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#FFFFFF",
    boxShadow: "0 2px 8px rgba(2,6,23,0.35)",
    transition: "left 0.18s ease",
  };
}

function messageStyle(kind: "success" | "error"): CSSProperties {
  return {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    border:
      kind === "success"
        ? "1px solid rgba(45,212,191,0.3)"
        : "1px solid rgba(248,113,113,0.3)",
    background:
      kind === "success" ? "rgba(13,148,136,0.12)" : "rgba(127,29,29,0.18)",
    color: kind === "success" ? "#CCFBF1" : "#FECACA",
    lineHeight: 1.5,
  };
}

function getRowDescription(draft: LinkDraft): string {
  const label = normalizeText(draft.label);
  const url = normalizeText(draft.url);

  if (label) return label;
  if (url) return url;
  return "Ainda não configurado";
}

export default function ProfessionalLinksManager({ cardId }: Props) {
  const supabase = useMemo(() => createBrowserClient(), []);

  const [rows, setRows] = useState<ProfessionalLinkRow[]>([]);
  const [drafts, setDrafts] = useState<LinkDraft[]>(createEmptyDrafts);
  const [originalDrafts, setOriginalDrafts] =
    useState<LinkDraft[]>(createEmptyDrafts);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const hasChanges =
    serializeDrafts(drafts) !== serializeDrafts(originalDrafts);

  const activeCount = drafts.filter(
    (draft) =>
      draft.isActive && normalizeText(draft.label) && normalizeText(draft.url),
  ).length;

  async function fetchLinks(userId: string): Promise<ProfessionalLinkRow[]> {
    const { data, error } = await supabase
      .from("social_links")
      .select(
        "id,platform,url,label,is_active,sort_order,position,clicks_count,mode,updated_at",
      )
      .eq("user_id", userId)
      .eq("card_id", cardId)
      .eq("mode", "pro")
      .in("platform", SLOT_PLATFORMS)
      .order("position", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return (data ?? []) as ProfessionalLinkRow[];
  }

  async function loadLinks(resetMessages = true) {
    if (resetMessages) {
      setErrorMsg(null);
      setSuccessMsg(null);
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) throw error;

      const userId = data.user?.id;

      if (!userId) {
        throw new Error(
          "Sessão expirada. Entre novamente para editar os links.",
        );
      }

      if (!cardId) {
        throw new Error(
          "Perfil inválido para carregar os links profissionais.",
        );
      }

      const nextRows = await fetchLinks(userId);
      const nextDrafts = buildDrafts(nextRows);

      setRows(nextRows);
      setDrafts(nextDrafts);
      setOriginalDrafts(nextDrafts);
      setExpandedIndex(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os links profissionais.";

      const empty = createEmptyDrafts();
      setRows([]);
      setDrafts(empty);
      setOriginalDrafts(empty);
      setExpandedIndex(null);
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }

  function updateDraft<K extends keyof LinkDraft>(
    index: number,
    field: K,
    value: LinkDraft[K],
  ) {
    setDrafts((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index
          ? {
              ...draft,
              [field]: value,
            }
          : draft,
      ),
    );

    setSuccessMsg(null);
    setErrorMsg(null);
  }

  function applyPreset(index: number, preset: string) {
    if (!preset) return;
    updateDraft(index, "label", preset);
  }

  function clearSlot(index: number) {
    setDrafts((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index ? emptyDraft() : draft,
      ),
    );

    setSuccessMsg(null);
    setErrorMsg(null);
  }

  function moveSlot(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= SLOT_COUNT) return;

    setDrafts((current) => {
      const next = current.map((draft) => ({ ...draft }));
      const source = next[index];

      next[index] = next[targetIndex];
      next[targetIndex] = source;

      return next;
    });

    setExpandedIndex(targetIndex);
    setSuccessMsg(null);
    setErrorMsg(null);
  }

  function validateDrafts(): Array<{
    index: number;
    label: string;
    url: string;
    isActive: boolean;
  }> {
    const prepared: Array<{
      index: number;
      label: string;
      url: string;
      isActive: boolean;
    }> = [];

    drafts.forEach((draft, index) => {
      const label = normalizeText(draft.label);
      const rawUrl = normalizeText(draft.url);

      if (!label && !rawUrl && !draft.isActive) {
        return;
      }

      if (!label) {
        throw new Error(`Preencha o texto do link ${index + 1}.`);
      }

      if (!rawUrl) {
        throw new Error(`Preencha a URL do link ${index + 1}.`);
      }

      const url = normalizeUrl(rawUrl, label);

      if (!isValidUrl(url)) {
        throw new Error(`A URL do link ${index + 1} não é válida.`);
      }

      prepared.push({
        index,
        label,
        url,
        isActive: draft.isActive,
      });
    });

    return prepared;
  }

  async function saveAll() {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      if (!cardId) {
        throw new Error("Perfil inválido para salvar os links profissionais.");
      }

      const prepared = validateDrafts();

      const { data, error } = await supabase.auth.getUser();

      if (error) throw error;

      const userId = data.user?.id;

      if (!userId) {
        throw new Error(
          "Sessão expirada. Entre novamente para salvar os links.",
        );
      }

      const now = new Date().toISOString();

      const payload = prepared.map((item) => ({
        card_id: cardId,
        user_id: userId,
        platform: SLOT_PLATFORMS[item.index],
        url: item.url,
        label: item.label,
        is_active: item.isActive,
        sort_order: item.index + 1,
        position: item.index + 1,
        mode: "pro",
        updated_at: now,
      }));

      if (payload.length > 0) {
        const { error: upsertError } = await supabase
          .from("social_links")
          .upsert(payload, {
            onConflict: "card_id,platform",
          });

        if (upsertError) throw upsertError;
      }

      const filledPlatforms = new Set(
        prepared.map((item) => SLOT_PLATFORMS[item.index]),
      );

      const rowsToDelete = rows
        .filter((row) => !filledPlatforms.has(row.platform))
        .map((row) => row.id);

      if (rowsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("social_links")
          .delete()
          .in("id", rowsToDelete)
          .eq("user_id", userId)
          .eq("card_id", cardId);

        if (deleteError) throw deleteError;
      }

      const refreshedRows = await fetchLinks(userId);
      const refreshedDrafts = buildDrafts(refreshedRows);

      setRows(refreshedRows);
      setDrafts(refreshedDrafts);
      setOriginalDrafts(refreshedDrafts);
      setExpandedIndex(null);
      setSuccessMsg("Links profissionais salvos com sucesso.");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar os links profissionais.";

      setErrorMsg(message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  return (
    <section style={sectionStyle()}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 6, maxWidth: 720 }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>
            Seus caminhos profissionais
          </h3>

          <p
            style={{
              margin: 0,
              color: PRO_TEXT_SECONDARY,
              lineHeight: 1.55,
            }}
          >
            Configure até 6 links. Apenas os ativos e válidos aparecem no perfil
            público. Abra somente a linha que deseja editar.
          </p>
        </div>

        <div
          style={{
            color: PRO_TEXT_SECONDARY,
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {activeCount} de 6 ativos
        </div>
      </div>

      {errorMsg ? <div style={messageStyle("error")}>{errorMsg}</div> : null}
      {successMsg ? (
        <div style={messageStyle("success")}>{successMsg}</div>
      ) : null}

      {loading ? (
        <p style={{ color: PRO_TEXT_SECONDARY, marginBottom: 0 }}>
          Carregando links profissionais...
        </p>
      ) : (
        <>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {drafts.map((draft, index) => {
              const isExpanded = expandedIndex === index;
              const normalizedPreviewUrl = normalizeUrl(draft.url, draft.label);
              const canOpen = Boolean(
                normalizeText(draft.label) && isValidUrl(normalizedPreviewUrl),
              );
              const isConfigured = Boolean(
                normalizeText(draft.label) || normalizeText(draft.url),
              );

              return (
                <article
                  key={SLOT_PLATFORMS[index]}
                  style={compactRowStyle(draft.isActive, isExpanded)}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      padding: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                      <strong style={{ fontSize: 15 }}>
                        Link profissional {index + 1}
                      </strong>

                      <span
                        style={{
                          color: isConfigured ? PRO_TEXT_SECONDARY : "#94A3B8",
                          fontSize: 13,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 440,
                        }}
                      >
                        {getRowDescription(draft)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          color: draft.isActive
                            ? "#5EEAD4"
                            : PRO_TEXT_SECONDARY,
                          fontSize: 12,
                          fontWeight: 850,
                        }}
                      >
                        {draft.isActive ? "Ativo" : "Inativo"}
                      </span>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={draft.isActive}
                        aria-label={`${
                          draft.isActive ? "Desativar" : "Ativar"
                        } link profissional ${index + 1}`}
                        disabled={saving}
                        onClick={() =>
                          updateDraft(index, "isActive", !draft.isActive)
                        }
                        style={switchStyle(draft.isActive, saving)}
                      >
                        <span style={switchKnobStyle(draft.isActive)} />
                      </button>

                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        disabled={saving}
                        onClick={() =>
                          setExpandedIndex(isExpanded ? null : index)
                        }
                        style={buttonStyle({ disabled: saving })}
                      >
                        {isExpanded
                          ? "Fechar"
                          : isConfigured
                            ? "Editar"
                            : "Adicionar"}
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 14,
                        padding: "0 14px 14px",
                        borderTop: `1px solid ${PRO_BORDER}`,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: 12,
                          paddingTop: 14,
                        }}
                      >
                        <label style={labelStyle()}>
                          <span>Modelo opcional</span>
                          <select
                            value=""
                            disabled={saving}
                            onChange={(event) =>
                              applyPreset(index, event.target.value)
                            }
                            style={selectStyle()}
                          >
                            <option value="">Escolha um modelo</option>
                            {PRESETS.map((preset) => (
                              <option key={preset} value={preset}>
                                {preset}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label style={labelStyle()}>
                          <span>Texto do botão</span>
                          <input
                            value={draft.label}
                            disabled={saving}
                            onChange={(event) =>
                              updateDraft(index, "label", event.target.value)
                            }
                            placeholder="Ex: Ver produtos no marketplace"
                            maxLength={60}
                            style={inputStyle()}
                          />
                        </label>

                        <label style={labelStyle()}>
                          <span>URL de destino</span>
                          <input
                            value={draft.url}
                            disabled={saving}
                            onChange={(event) =>
                              updateDraft(index, "url", event.target.value)
                            }
                            placeholder="Ex: https://seusite.com"
                            inputMode="url"
                            style={inputStyle()}
                          />
                        </label>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            disabled={saving || index === 0}
                            onClick={() => moveSlot(index, -1)}
                            style={buttonStyle({
                              disabled: saving || index === 0,
                            })}
                          >
                            Mover acima
                          </button>

                          <button
                            type="button"
                            disabled={saving || index === SLOT_COUNT - 1}
                            onClick={() => moveSlot(index, 1)}
                            style={buttonStyle({
                              disabled: saving || index === SLOT_COUNT - 1,
                            })}
                          >
                            Mover abaixo
                          </button>

                          <button
                            type="button"
                            disabled={saving || !isConfigured}
                            onClick={() => clearSlot(index)}
                            style={buttonStyle({
                              danger: true,
                              disabled: saving || !isConfigured,
                            })}
                          >
                            Limpar linha
                          </button>
                        </div>

                        {canOpen ? (
                          <a
                            href={normalizedPreviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={buttonStyle()}
                          >
                            Abrir para testar
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 16,
            }}
          >
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                void loadLinks();
              }}
              style={buttonStyle({ disabled: saving })}
            >
              Recarregar
            </button>

            <button
              type="button"
              disabled={saving || !hasChanges}
              onClick={() => {
                void saveAll();
              }}
              style={buttonStyle({
                primary: true,
                disabled: saving || !hasChanges,
              })}
            >
              {saving ? "Salvando..." : "Salvar links profissionais"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
