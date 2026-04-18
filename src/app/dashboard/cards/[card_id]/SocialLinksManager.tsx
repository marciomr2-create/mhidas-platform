// src/app/dashboard/cards/[card_id]/SocialLinksManager.tsx
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
  clicks_count: number;
  updated_at: string;
};

type LinkDraft = {
  label: string;
  url: string;
};

type Props = {
  cardId: string;
};

type LinkGroup = {
  key: "direct" | "streaming" | "complementary";
  title: string;
  description: string;
  links: SocialLinkRow[];
};

const DIRECT_CONTACT_PRIORITY = ["instagram", "whatsapp", "telegram", "tiktok"];
const STREAMING_PRIORITY = [
  "spotify",
  "soundcloud",
  "youtube",
  "apple music",
  "apple_music",
  "deezer",
  "beatport",
  "mixcloud",
];

const KNOWN_PLATFORM_NAMES: Record<string, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  tiktok: "TikTok",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  youtube: "YouTube",
  applemusic: "Apple Music",
  applemusicurl: "Apple Music",
  deezer: "Deezer",
  beatport: "Beatport",
  mixcloud: "Mixcloud",
};

const PLATFORM_ALIASES: Record<string, string> = {
  whataspp: "WhatsApp",
  watsapp: "WhatsApp",
  whatapp: "WhatsApp",
  whastapp: "WhatsApp",
};

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim();
}

function normalizeLookupKey(value: string | null | undefined) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, "");
}

function resolveKnownPlatformName(value: string | null | undefined) {
  const key = normalizeLookupKey(value);
  if (!key) return null;

  if (KNOWN_PLATFORM_NAMES[key]) return KNOWN_PLATFORM_NAMES[key];
  if (PLATFORM_ALIASES[key]) return PLATFORM_ALIASES[key];

  return null;
}

function getPlatformKey(link: SocialLinkRow) {
  return normalizeText(link.platform || link.label).toLowerCase();
}

function isWhatsappLink(link: SocialLinkRow) {
  return getPlatformKey(link).includes("whatsapp");
}

function isInstructionalValue(raw: string | null | undefined) {
  const value = normalizeText(raw).toUpperCase();

  if (!value) return false;

  return (
    value.includes("COLE_AQUI") ||
    value.includes("LINK_REAL") ||
    value.includes("DIGITE_AQUI") ||
    value.includes("EXEMPLO") ||
    value.includes("SEU_LINK_AQUI")
  );
}

function extractWhatsappDigits(raw: string) {
  const value = normalizeText(raw);
  if (!value) return "";

  const phoneMatch = value.match(/phone=([0-9]+)/i);
  if (phoneMatch?.[1]) return phoneMatch[1];

  const waMatch = value.match(/wa\.me\/([0-9]+)/i);
  if (waMatch?.[1]) return waMatch[1];

  return value.replace(/\D/g, "");
}

function getEditableUrlValue(link: SocialLinkRow) {
  if (isInstructionalValue(link.url)) {
    return "";
  }

  if (isWhatsappLink(link)) {
    return extractWhatsappDigits(link.url);
  }

  return normalizeText(link.url);
}

function getEditableLabelValue(link: SocialLinkRow) {
  if (isWhatsappLink(link)) {
    return "WhatsApp";
  }

  return normalizeText(link.label);
}

function normalizeStandardUrl(raw: string) {
  const value = normalizeText(raw);

  if (!value) return "";
  if (/^(mailto:|tel:)/i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^\/\//.test(value)) return `https:${value}`;

  return `https://${value}`;
}

function buildStoredUrl(link: SocialLinkRow, raw: string) {
  if (isWhatsappLink(link)) {
    const digits = extractWhatsappDigits(raw);
    if (!digits || digits.length < 10) return "";
    return `https://wa.me/${digits}`;
  }

  return normalizeStandardUrl(raw);
}

function buildPreviewUrl(link: SocialLinkRow, raw: string) {
  return buildStoredUrl(link, raw);
}

function getUrlPlaceholder(link: SocialLinkRow) {
  if (isWhatsappLink(link)) {
    return "Digite o número com DDI e DDD";
  }

  return "Cole aqui o link real";
}

function getUrlFieldLabel(link: SocialLinkRow) {
  if (isWhatsappLink(link)) {
    return "Número do WhatsApp";
  }

  return "URL do link";
}

function getDisplayName(link: SocialLinkRow) {
  const byPlatform = resolveKnownPlatformName(link.platform);
  if (byPlatform) return byPlatform;

  const byLabel = resolveKnownPlatformName(link.label);
  if (byLabel) return byLabel;

  const raw = normalizeText(link.label) || normalizeText(link.platform);
  return raw || "Link";
}

function getPlatformDisplayName(platform: string) {
  return resolveKnownPlatformName(platform) || normalizeText(platform) || "não informada";
}

function isDirectContact(link: SocialLinkRow) {
  const key = getPlatformKey(link);
  return DIRECT_CONTACT_PRIORITY.some((item) => key.includes(item));
}

function isStreaming(link: SocialLinkRow) {
  const key = getPlatformKey(link);
  return STREAMING_PRIORITY.some((item) => key.includes(item));
}

function sortDirectContact(a: SocialLinkRow, b: SocialLinkRow) {
  const aKey = getPlatformKey(a);
  const bKey = getPlatformKey(b);

  const aIndex = DIRECT_CONTACT_PRIORITY.findIndex((item) => aKey.includes(item));
  const bIndex = DIRECT_CONTACT_PRIORITY.findIndex((item) => bKey.includes(item));

  const safeA = aIndex === -1 ? 999 : aIndex;
  const safeB = bIndex === -1 ? 999 : bIndex;

  if (safeA !== safeB) return safeA - safeB;
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.position - b.position;
}

function sortStreaming(a: SocialLinkRow, b: SocialLinkRow) {
  const aKey = getPlatformKey(a);
  const bKey = getPlatformKey(b);

  const aIndex = STREAMING_PRIORITY.findIndex((item) => aKey.includes(item));
  const bIndex = STREAMING_PRIORITY.findIndex((item) => bKey.includes(item));

  const safeA = aIndex === -1 ? 999 : aIndex;
  const safeB = bIndex === -1 ? 999 : bIndex;

  if (safeA !== safeB) return safeA - safeB;
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.position - b.position;
}

function sortDefault(a: SocialLinkRow, b: SocialLinkRow) {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.position - b.position;
}

function sectionTitleStyle() {
  return {
    fontWeight: 900,
    fontSize: 15,
    margin: 0,
  } as const;
}

function sectionStyle() {
  return {
    display: "grid",
    gap: 12,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.02)",
  } as const;
}

function badgeStyle(active: boolean) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 10px",
    borderRadius: 999,
    border: active
      ? "1px solid rgba(0,200,120,0.25)"
      : "1px solid rgba(255,255,255,0.14)",
    background: active ? "rgba(0,160,90,0.18)" : "rgba(255,255,255,0.05)",
    fontWeight: 800,
    fontSize: 12,
    minWidth: 82,
  } as const;
}

function buttonStyle(disabled = false) {
  return {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: disabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 800,
    color: "#fff",
    opacity: disabled ? 0.6 : 1,
    textDecoration: "none",
  } as const;
}

function primaryButtonStyle(disabled = false) {
  return {
    ...buttonStyle(disabled),
    background: disabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.14)",
  } as const;
}

function inputStyle() {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    outline: "none",
  } as const;
}

function labelStyle() {
  return {
    display: "grid",
    gap: 6,
    fontSize: 13,
  } as const;
}

function cardStyle(groupKey: LinkGroup["key"]) {
  const accent =
    groupKey === "direct"
      ? "rgba(0,200,120,0.10)"
      : groupKey === "streaming"
        ? "rgba(80,160,255,0.10)"
        : "rgba(255,255,255,0.06)";

  return {
    padding: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    display: "grid",
    gap: 12,
    background: accent,
  } as const;
}

export default function SocialLinksManager({ cardId }: Props) {
  const supabase = useMemo(() => createBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [links, setLinks] = useState<SocialLinkRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, LinkDraft>>({});

  async function fetchLinks(userId: string) {
    const { data, error } = await supabase
      .from("social_links")
      .select("id,platform,url,label,is_active,sort_order,position,clicks_count,updated_at")
      .eq("user_id", userId)
      .eq("card_id", cardId)
      .order("sort_order", { ascending: true })
      .order("position", { ascending: true });

    if (error) throw error;
    return (data as SocialLinkRow[]) ?? [];
  }

  function hydrateDrafts(rows: SocialLinkRow[]) {
    const nextDrafts: Record<string, LinkDraft> = {};

    for (const row of rows) {
      nextDrafts[row.id] = {
        label: getEditableLabelValue(row),
        url: getEditableUrlValue(row),
      };
    }

    setDrafts(nextDrafts);
  }

  async function loadLinks(resetMessages = true) {
    if (resetMessages) {
      setErrorMsg(null);
      setSuccessMsg(null);
    }

    setLoading(true);

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const userId = authData.user?.id;
      if (!userId) {
        setLinks([]);
        setErrorMsg("Sessão expirada. Faça login novamente.");
        return;
      }

      if (!cardId) {
        setLinks([]);
        setErrorMsg("Card inválido para carregar os links.");
        return;
      }

      const rows = await fetchLinks(userId);
      setLinks(rows);
      hydrateDrafts(rows);
    } catch (e: any) {
      setLinks([]);
      setErrorMsg(e?.message ?? "Falha ao carregar social links.");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(linkId: string, field: keyof LinkDraft, value: string) {
    setDrafts((prev) => ({
      ...prev,
      [linkId]: {
        label: prev[linkId]?.label ?? "",
        url: prev[linkId]?.url ?? "",
        [field]: value,
      },
    }));
  }

  function hasChanges(link: SocialLinkRow) {
    const draft = drafts[link.id];
    if (!draft) return false;

    return (
      normalizeText(draft.label) !== getEditableLabelValue(link) ||
      normalizeText(draft.url) !== getEditableUrlValue(link)
    );
  }

  function resetDraft(link: SocialLinkRow) {
    setDrafts((prev) => ({
      ...prev,
      [link.id]: {
        label: getEditableLabelValue(link),
        url: getEditableUrlValue(link),
      },
    }));
  }

  async function saveLink(link: SocialLinkRow) {
    const draft = drafts[link.id];
    if (!draft) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setSavingId(link.id);

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const userId = authData.user?.id;
      if (!userId) throw new Error("Sessão expirada. Faça login novamente.");
      if (!cardId) throw new Error("Card inválido para salvar o link.");

      const nextUrl = buildStoredUrl(link, draft.url);
      if (!nextUrl) {
        throw new Error(
          isWhatsappLink(link)
            ? "Informe um número de WhatsApp válido com DDD e código do país."
            : "Informe uma URL válida para este link."
        );
      }

      const nextLabel = isWhatsappLink(link)
        ? "WhatsApp"
        : normalizeText(draft.label) || null;

      const nextIsActive = isWhatsappLink(link) ? true : link.is_active;

      const { error } = await supabase
        .from("social_links")
        .update({
          label: nextLabel,
          url: nextUrl,
          is_active: nextIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", link.id)
        .eq("user_id", userId)
        .eq("card_id", cardId);

      if (error) throw error;

      const rows = await fetchLinks(userId);
      setLinks(rows);
      hydrateDrafts(rows);

      if (isWhatsappLink(link)) {
        setSuccessMsg("WhatsApp salvo e ativado com sucesso.");
      } else {
        setSuccessMsg(`${getDisplayName(link)} salvo com sucesso.`);
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Falha ao salvar o link.");
    } finally {
      setSavingId(null);
    }
  }

  async function setActive(linkId: string, nextActive: boolean) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSavingId(linkId);

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const userId = authData.user?.id;
      if (!userId) throw new Error("Sessão expirada. Faça login novamente.");
      if (!cardId) throw new Error("Card inválido para atualizar o link.");

      const { error } = await supabase
        .from("social_links")
        .update({
          is_active: nextActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", linkId)
        .eq("user_id", userId)
        .eq("card_id", cardId);

      if (error) throw error;

      const rows = await fetchLinks(userId);
      setLinks(rows);
      hydrateDrafts(rows);
      setSuccessMsg(nextActive ? "Link ativado com sucesso." : "Link desativado com sucesso.");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Falha ao atualizar o status do link.");
    } finally {
      setSavingId(null);
    }
  }

  function handleToggleClick(
    e: React.MouseEvent<HTMLButtonElement>,
    linkId: string,
    nextActive: boolean
  ) {
    e.preventDefault();
    e.stopPropagation();
    void setActive(linkId, nextActive);
  }

  function handleResetClick(
    e: React.MouseEvent<HTMLButtonElement>,
    link: SocialLinkRow
  ) {
    e.preventDefault();
    e.stopPropagation();
    resetDraft(link);
  }

  function handleSaveClick(
    e: React.MouseEvent<HTMLButtonElement>,
    link: SocialLinkRow
  ) {
    e.preventDefault();
    e.stopPropagation();
    void saveLink(link);
  }

  useEffect(() => {
    void loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  const directContacts = links.filter(isDirectContact).sort(sortDirectContact);
  const streamingLinks = links
    .filter((link) => !isDirectContact(link) && isStreaming(link))
    .sort(sortStreaming);
  const complementaryLinks = links
    .filter((link) => !isDirectContact(link) && !isStreaming(link))
    .sort(sortDefault);

  const groups: LinkGroup[] = [
    {
      key: "direct",
      title: "Contato direto entre usuários",
      description:
        "Estes são os canais prioritários de conexão humana no Club. Prioridade: Instagram, WhatsApp, Telegram e TikTok.",
      links: directContacts,
    },
    {
      key: "streaming",
      title: "Streaming e música",
      description:
        "Aqui ficam Spotify, SoundCloud, YouTube, Apple Music, Deezer, Beatport e Mixcloud.",
      links: streamingLinks,
    },
    {
      key: "complementary",
      title: "Links complementares",
      description:
        "Acessos culturais adicionais que não são contato direto nem streaming principal.",
      links: complementaryLinks,
    },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      {loading ? (
        <p style={{ opacity: 0.8 }}>Carregando links...</p>
      ) : (
        <>
          {errorMsg ? (
            <div
              style={{
                padding: 10,
                border: "1px solid rgba(255,80,80,0.35)",
                background: "rgba(255,80,80,0.08)",
                borderRadius: 10,
                marginBottom: 12,
              }}
            >
              {errorMsg}
            </div>
          ) : null}

          {successMsg ? (
            <div
              style={{
                padding: 10,
                border: "1px solid rgba(0,200,120,0.28)",
                background: "rgba(0,200,120,0.08)",
                borderRadius: 10,
                marginBottom: 12,
              }}
            >
              {successMsg}
            </div>
          ) : null}

          {links.length === 0 ? (
            <p style={{ opacity: 0.8 }}>Nenhum social link cadastrado.</p>
          ) : (
            <div style={{ display: "grid", gap: 18 }}>
              {groups.map((group) => (
                <section key={group.title} style={sectionStyle()}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <h3 style={sectionTitleStyle()}>{group.title}</h3>
                    <p style={{ margin: 0, opacity: 0.76, lineHeight: 1.55 }}>
                      {group.description}
                    </p>
                  </div>

                  {group.links.length === 0 ? (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        border: "1px dashed rgba(255,255,255,0.14)",
                        opacity: 0.72,
                      }}
                    >
                      Nenhum link nesta categoria.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {group.links.map((l, index) => {
                        const isSaving = savingId === l.id;
                        const isDirty = hasChanges(l);
                        const draft = drafts[l.id] ?? {
                          label: getEditableLabelValue(l),
                          url: getEditableUrlValue(l),
                        };
                        const previewUrl = buildPreviewUrl(l, draft.url);

                        const isFirstDirect = group.key === "direct" && index === 0;
                        const isFirstStreaming = group.key === "streaming" && index === 0;

                        return (
                          <div key={l.id} style={cardStyle(group.key)}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                alignItems: "start",
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 6 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <div style={{ fontWeight: 900 }}>{getDisplayName(l)}</div>

                                  {isFirstDirect ? (
                                    <span
                                      style={{
                                        padding: "4px 8px",
                                        borderRadius: 999,
                                        fontSize: 11,
                                        fontWeight: 800,
                                        background: "rgba(0,200,120,0.18)",
                                        border: "1px solid rgba(0,200,120,0.25)",
                                      }}
                                    >
                                      Contato principal
                                    </span>
                                  ) : null}

                                  {isFirstStreaming ? (
                                    <span
                                      style={{
                                        padding: "4px 8px",
                                        borderRadius: 999,
                                        fontSize: 11,
                                        fontWeight: 800,
                                        background: "rgba(80,160,255,0.16)",
                                        border: "1px solid rgba(80,160,255,0.22)",
                                      }}
                                    >
                                      Streaming em destaque
                                    </span>
                                  ) : null}
                                </div>

                                <div style={{ fontSize: 12, opacity: 0.72 }}>
                                  Plataforma: {getPlatformDisplayName(l.platform)}
                                </div>
                              </div>

                              <div style={{ textAlign: "right", minWidth: 90 }}>
                                <div style={{ fontSize: 13, opacity: 0.8 }}>Cliques</div>
                                <div style={{ fontSize: 18, fontWeight: 900 }}>
                                  {Number(l.clicks_count ?? 0)}
                                </div>
                              </div>
                            </div>

                            <div
                              style={{
                                display: "grid",
                                gap: 12,
                                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                              }}
                            >
                              <label style={labelStyle()}>
                                <span>Label público</span>
                                <input
                                  value={draft.label}
                                  onChange={(e) => updateDraft(l.id, "label", e.target.value)}
                                  placeholder={`Ex: ${getDisplayName(l)}`}
                                  style={inputStyle()}
                                />
                              </label>

                              <label style={labelStyle()}>
                                <span>{getUrlFieldLabel(l)}</span>
                                <input
                                  value={draft.url}
                                  onChange={(e) => updateDraft(l.id, "url", e.target.value)}
                                  placeholder={getUrlPlaceholder(l)}
                                  style={inputStyle()}
                                />
                              </label>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                flexWrap: "wrap",
                                alignItems: "center",
                              }}
                            >
                              <div style={{ fontSize: 13, opacity: 0.75 }}>
                                sort_order: {l.sort_order} | position: {l.position}
                              </div>

                              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                <span style={badgeStyle(l.is_active)}>
                                  {l.is_active ? "Ativo" : "Inativo"}
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => handleToggleClick(e, l.id, !l.is_active)}
                                  disabled={isSaving}
                                  style={buttonStyle(isSaving)}
                                >
                                  {isSaving ? "Salvando..." : "Alternar"}
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => handleResetClick(e, l)}
                                  disabled={isSaving || !isDirty}
                                  style={buttonStyle(isSaving || !isDirty)}
                                >
                                  Desfazer
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => handleSaveClick(e, l)}
                                  disabled={isSaving || !isDirty}
                                  style={primaryButtonStyle(isSaving || !isDirty)}
                                >
                                  {isSaving ? "Salvando..." : "Salvar"}
                                </button>

                                {previewUrl ? (
                                  <a
                                    href={previewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={buttonStyle(false)}
                                  >
                                    Abrir link
                                  </a>
                                ) : null}
                              </div>
                            </div>

                            <div style={{ fontSize: 12, opacity: 0.6 }}>ID: {l.id}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              onClick={() => {
                void loadLinks();
              }}
              style={buttonStyle(false)}
            >
              Recarregar
            </button>
          </div>
        </>
      )}
    </div>
  );
}