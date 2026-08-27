"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type SocialLinkRow = {
  id: string;
  platform: string;
  url: string;
  label: string | null;
  is_active: boolean;
  sort_order: number;
  position: number;
  mode: string | null;
  updated_at: string;
};

type Props = {
  cardId: string;
};

type ChannelKey = "instagram" | "whatsapp" | "telegram" | "tiktok";

type ChannelDefinition = {
  key: ChannelKey;
  name: string;
  fieldLabel: string;
  placeholder: string;
};

const CHANNELS: ChannelDefinition[] = [
  {
    key: "instagram",
    name: "Instagram",
    fieldLabel: "Seu Instagram",
    placeholder: "@usuario ou link do Instagram",
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    fieldLabel: "Seu WhatsApp",
    placeholder: "Número com DDD",
  },
  {
    key: "telegram",
    name: "Telegram",
    fieldLabel: "Seu Telegram",
    placeholder: "@usuario ou link do Telegram",
  },
  {
    key: "tiktok",
    name: "TikTok",
    fieldLabel: "Seu TikTok",
    placeholder: "@usuario ou link do TikTok",
  },
];

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function platformKey(value: unknown): string {
  return cleanText(value).toLowerCase().replace(/\s+/g, "");
}

function findChannelRow(rows: SocialLinkRow[], channel: ChannelDefinition) {
  const expected = channel.key;
  return (
    rows.find((row) => platformKey(row.platform) === expected) ||
    rows.find((row) => platformKey(row.label) === expected) ||
    null
  );
}

function extractDigits(value: string): string {
  const phoneMatch = value.match(/phone=([0-9]+)/i);
  if (phoneMatch?.[1]) return phoneMatch[1];

  const waMatch = value.match(/wa\.me\/([0-9]+)/i);
  if (waMatch?.[1]) return waMatch[1];

  return value.replace(/\D/g, "");
}

function normalizeStandardUrl(raw: string): string {
  const value = cleanText(raw);
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (/^\/\//.test(value)) return `https:${value}`;
  return `https://${value}`;
}

function buildStoredUrl(channel: ChannelDefinition, raw: string): string {
  const value = cleanText(raw);
  if (!value) return "";

  if (channel.key === "whatsapp") {
    const digits = extractDigits(value);
    if (digits.length < 10) return "";
    return `https://wa.me/${digits}`;
  }

  if (value.startsWith("@")) {
    const handle = value.slice(1).trim();
    if (!handle) return "";

    if (channel.key === "instagram") {
      return `https://www.instagram.com/${handle}`;
    }

    if (channel.key === "telegram") {
      return `https://t.me/${handle}`;
    }

    if (channel.key === "tiktok") {
      return `https://www.tiktok.com/@${handle}`;
    }
  }

  return normalizeStandardUrl(value);
}

function getEditableValue(channel: ChannelDefinition, row: SocialLinkRow | null) {
  if (!row) return "";
  if (channel.key === "whatsapp") return extractDigits(row.url);
  return cleanText(row.url);
}

function getHandleFromUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const pieces = url.pathname.split("/").filter(Boolean);
    const value = pieces[0] || "";
    return value ? (value.startsWith("@") ? value : `@${value}`) : "";
  } catch {
    return "";
  }
}

function formatPhone(raw: string): string {
  const digits = extractDigits(raw);

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }

  return digits || raw;
}

function getDisplayValue(channel: ChannelDefinition, row: SocialLinkRow | null) {
  if (!row) return "Ainda não adicionado";

  if (channel.key === "whatsapp") {
    return formatPhone(row.url);
  }

  const handle = getHandleFromUrl(row.url);
  return handle || "Canal adicionado";
}

const css = `
  .club-contacts-manager {
    display: grid;
    gap: 14px;
  }

  .club-contacts-feedback {
    margin: 0;
    padding: 12px 14px;
    border: 1px solid rgba(42,134,148,0.38);
    background: rgba(42,134,148,0.10);
    border-radius: 12px;
    color: #F8FAFC;
    line-height: 1.5;
  }

  .club-contacts-error {
    border-color: rgba(255,255,255,0.18);
    background: #111111;
  }

  .club-contacts-loading {
    margin: 0;
    color: #CBD5E1;
  }

  .club-contacts-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .club-contact-card {
    position: relative;
    min-height: 200px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.09);
    border-top: 2px solid #2A8694;
    border-radius: 14px;
    background: #0E0E0E;
    padding: 20px;
    display: grid;
    align-content: space-between;
    gap: 24px;
  }

  .club-contact-head {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .club-contact-title {
    margin: 0;
    color: #F8FAFC;
    font-size: 20px;
    line-height: 1.15;
    font-weight: 900;
    letter-spacing: -0.02em;
  }

  .club-contact-value {
    margin: 5px 0 0;
    color: #CBD5E1;
    font-size: 14px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .club-contact-status {
    margin: 0;
    color: #CBD5E1;
    font-size: 12px;
    line-height: 1.4;
  }

  .club-contact-status[data-visible="true"] {
    color: #2A8694;
  }

  .club-contact-actions {
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
  }

  .club-contact-action {
    padding: 3px 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #CBD5E1;
    font: inherit;
    font-size: 13px;
    font-weight: 850;
    text-decoration: none;
    cursor: pointer;
  }

  .club-contact-action:hover:not(:disabled) {
    color: #F8FAFC;
  }

  .club-contact-action-primary {
    padding: 9px 14px;
    border: 1px solid rgba(42,134,148,0.66);
    border-radius: 8px;
    background: #247C88;
    color: #F8FAFC;
  }

  .club-contact-action:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .club-contact-editor {
    display: grid;
    gap: 10px;
  }

  .club-contact-field-label {
    color: #F8FAFC;
    font-size: 13px;
    font-weight: 800;
  }

  .club-contact-input {
    width: 100%;
    min-height: 46px;
    padding: 11px 12px;
    border: 1px solid rgba(255,255,255,0.13);
    border-radius: 11px;
    background: #111111;
    color: #F8FAFC;
    font: inherit;
    outline: none;
  }

  .club-contact-input:focus {
    border-color: rgba(42,134,148,0.72);
    box-shadow: 0 0 0 2px rgba(42,134,148,0.12);
  }

  .club-contact-help {
    margin: 0;
    color: #CBD5E1;
    font-size: 12px;
    line-height: 1.45;
  }

  @media (max-width: 720px) {
    .club-contacts-grid {
      grid-template-columns: 1fr;
    }

    .club-contact-card {
      min-height: 0;
      border-radius: 12px;
      padding: 17px;
    }

    .club-contact-actions {
      gap: 16px;
    }
  }
`;

export default function ClubContactsManager({ cardId }: Props) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [rows, setRows] = useState<SocialLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ChannelKey | null>(null);
  const [editingKey, setEditingKey] = useState<ChannelKey | null>(null);
  const [drafts, setDrafts] = useState<Record<ChannelKey, string>>({
    instagram: "",
    whatsapp: "",
    telegram: "",
    tiktok: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadLinks(clearMessages = true) {
    if (clearMessages) {
      setMessage("");
      setError("");
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) {
        throw new Error("Sua sessão expirou. Entre novamente para continuar.");
      }

      const { data, error: queryError } = await supabase
        .from("social_links")
        .select("id,platform,url,label,is_active,sort_order,position,mode,updated_at")
        .eq("user_id", userId)
        .eq("card_id", cardId)
        .in("mode", ["club", "both"])
        .order("sort_order", { ascending: true })
        .order("position", { ascending: true });

      if (queryError) throw queryError;

      const nextRows = (data ?? []) as SocialLinkRow[];
      setRows(nextRows);

      setDrafts((current) => {
        const next = { ...current };

        for (const channel of CHANNELS) {
          const row = findChannelRow(nextRows, channel);
          next[channel.key] = getEditableValue(channel, row);
        }

        return next;
      });
    } catch (caught: any) {
      setRows([]);
      setError(caught?.message ?? "Não foi possível carregar seus contatos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  function beginEdit(channel: ChannelDefinition, row: SocialLinkRow | null) {
    setMessage("");
    setError("");
    setDrafts((current) => ({
      ...current,
      [channel.key]: getEditableValue(channel, row),
    }));
    setEditingKey(channel.key);
  }

  function cancelEdit(channel: ChannelDefinition, row: SocialLinkRow | null) {
    setDrafts((current) => ({
      ...current,
      [channel.key]: getEditableValue(channel, row),
    }));
    setEditingKey(null);
    setError("");
  }

  async function saveChannel(channel: ChannelDefinition, row: SocialLinkRow | null) {
    const rawValue = drafts[channel.key];
    const storedUrl = buildStoredUrl(channel, rawValue);

    if (!storedUrl) {
      setError(
        channel.key === "whatsapp"
          ? "Digite um número de WhatsApp válido com DDD."
          : `Informe seu ${channel.name} para continuar.`
      );
      return;
    }

    setSavingKey(channel.key);
    setMessage("");
    setError("");

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) {
        throw new Error("Sua sessão expirou. Entre novamente para continuar.");
      }

      const now = new Date().toISOString();

      if (row) {
        const { error: updateError } = await supabase
          .from("social_links")
          .update({
            url: storedUrl,
            updated_at: now,
          })
          .eq("id", row.id)
          .eq("user_id", userId)
          .eq("card_id", cardId);

        if (updateError) throw updateError;
      } else {
        const index = CHANNELS.findIndex((item) => item.key === channel.key);

        const { error: upsertError } = await supabase
          .from("social_links")
          .upsert(
            {
              card_id: cardId,
              user_id: userId,
              platform: channel.key,
              url: storedUrl,
              label: channel.name,
              is_active: true,
              sort_order: index + 1,
              position: index + 1,
              mode: "club",
              updated_at: now,
            },
            {
              onConflict: "card_id,platform",
            }
          );

        if (upsertError) throw upsertError;
      }

      await loadLinks(false);
      setEditingKey(null);
      setMessage(`${channel.name} atualizado.`);
    } catch (caught: any) {
      setError(caught?.message ?? `Não foi possível salvar seu ${channel.name}.`);
    } finally {
      setSavingKey(null);
    }
  }

  async function toggleVisibility(channel: ChannelDefinition, row: SocialLinkRow) {
    setSavingKey(channel.key);
    setMessage("");
    setError("");

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) {
        throw new Error("Sua sessão expirou. Entre novamente para continuar.");
      }

      const { error: updateError } = await supabase
        .from("social_links")
        .update({
          is_active: !row.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("user_id", userId)
        .eq("card_id", cardId);

      if (updateError) throw updateError;

      await loadLinks(false);
      setMessage(
        row.is_active
          ? `${channel.name} foi ocultado do perfil.`
          : `${channel.name} agora aparece no perfil.`
      );
    } catch (caught: any) {
      setError(caught?.message ?? "Não foi possível alterar a visibilidade.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="club-contacts-manager">
      <style>{css}</style>

      {error ? (
        <p className="club-contacts-feedback club-contacts-error">{error}</p>
      ) : null}

      {message ? <p className="club-contacts-feedback">{message}</p> : null}

      {loading ? (
        <p className="club-contacts-loading">Carregando seus contatos...</p>
      ) : (
        <div className="club-contacts-grid">
          {CHANNELS.map((channel, index) => {
            const row = findChannelRow(rows, channel);
            const isEditing = editingKey === channel.key;
            const isSaving = savingKey === channel.key;
            const previewUrl = row ? cleanText(row.url) : "";
            const statusText = row
              ? row.is_active
                ? "Visível no perfil"
                : "Oculto do perfil"
              : "";

            return (
              <article className="club-contact-card" key={channel.key}>
                <div className="club-contact-head">
                  <div>
                    <h2 className="club-contact-title">{channel.name}</h2>
                    <p className="club-contact-value">
                      {getDisplayValue(channel, row)}
                    </p>
                  </div>
                </div>

                {isEditing ? (
                  <div className="club-contact-editor">
                    <label
                      className="club-contact-field-label"
                      htmlFor={`club-contact-${channel.key}`}
                    >
                      {channel.fieldLabel}
                    </label>

                    <input
                      id={`club-contact-${channel.key}`}
                      className="club-contact-input"
                      value={drafts[channel.key]}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [channel.key]: event.target.value,
                        }))
                      }
                      placeholder={channel.placeholder}
                      autoComplete="off"
                    />

                    <p className="club-contact-help">
                      {channel.key === "whatsapp"
                        ? "Digite apenas seu número; o link é preparado automaticamente."
                        : "Você pode informar seu @usuário ou colar o link completo."}
                    </p>

                    <div className="club-contact-actions">
                      <button
                        type="button"
                        className="club-contact-action club-contact-action-primary"
                        disabled={isSaving}
                        onClick={() => void saveChannel(channel, row)}
                      >
                        {isSaving ? "Salvando..." : "Salvar"}
                      </button>

                      <button
                        type="button"
                        className="club-contact-action"
                        disabled={isSaving}
                        onClick={() => cancelEdit(channel, row)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {row ? (
                      <p
                        className="club-contact-status"
                        data-visible={row.is_active ? "true" : "false"}
                      >
                        {statusText}
                      </p>
                    ) : null}

                    <div className="club-contact-actions" style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className={
                          row
                            ? "club-contact-action"
                            : "club-contact-action club-contact-action-primary"
                        }
                        onClick={() => beginEdit(channel, row)}
                      >
                        {row ? "Editar" : "Adicionar"}
                      </button>

                      {row ? (
                        <button
                          type="button"
                          className="club-contact-action"
                          disabled={isSaving}
                          onClick={() => void toggleVisibility(channel, row)}
                        >
                          {isSaving
                            ? "Salvando..."
                            : row.is_active
                              ? "Ocultar"
                              : "Mostrar no perfil"}
                        </button>
                      ) : null}

                      {previewUrl ? (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="club-contact-action"
                        >
                          Abrir
                        </a>
                      ) : null}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
