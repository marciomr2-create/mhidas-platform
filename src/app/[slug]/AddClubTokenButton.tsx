"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

type TokenField =
  | "favorite_clubs"
  | "favorite_events"
  | "last_events"
  | "next_events";

type CatalogType = "club" | "festival" | "party" | "event" | "venue";

type CatalogSuggestion = {
  id?: string;
  name: string;
  type: CatalogType;
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

type AddClubTokenButtonProps = {
  cardId: string;
  ownerUserId: string;
  field: TokenField;
  type: CatalogType;
  label: string;
  title: string;
  placeholder: string;
  cityBase?: string;
  compact?: boolean;
  allowNextEventDetails?: boolean;
};

function normalizeText(value: any): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getSourceLabel(item: CatalogSuggestion): string {
  return (
    normalizeText(item.source_name) ||
    normalizeText(item.official_url) ||
    normalizeText(item.instagram_url) ||
    normalizeText(item.source_url) ||
    "catálogo"
  );
}

export default function AddClubTokenButton({
  cardId,
  ownerUserId,
  field,
  type,
  label,
  title,
  placeholder,
  cityBase = "",
  compact = false,
  allowNextEventDetails = false,
}: AddClubTokenButtonProps) {
  const router = useRouter();

  const [checked, setChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [nextEventDate, setNextEventDate] = useState("");
  const [nextEventLink, setNextEventLink] = useState("");

  const [suggestions, setSuggestions] = useState<CatalogSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const canSearch = useMemo(() => normalizeText(query).length >= 2, [query]);

  useEffect(() => {
    let mounted = true;

    async function checkOwner() {
      try {
        const supabase = createBrowserClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        setIsOwner(Boolean(user?.id && ownerUserId && user.id === ownerUserId));
      } catch {
        if (!mounted) return;
        setIsOwner(false);
      } finally {
        if (mounted) {
          setChecked(true);
        }
      }
    }

    checkOwner();

    return () => {
      mounted = false;
    };
  }, [ownerUserId]);

  async function searchCatalog(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const cleanQuery = normalizeText(query);

    if (cleanQuery.length < 2) {
      setMessage("Digite pelo menos 2 caracteres para buscar.");
      return;
    }

    setSearching(true);
    setMessage("");
    setSuggestions([]);

    try {
      const response = await fetch("/api/club-catalog/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: cleanQuery,
          type,
          city: cityBase,
          state: "",
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Não foi possível buscar no catálogo.");
      }

      setSuggestions(Array.isArray(result.suggestions) ? result.suggestions : []);

      if (!result.suggestions?.length) {
        setMessage("Nenhuma sugestão encontrada. Você pode adicionar manualmente.");
      }
    } catch (error: any) {
      setMessage(error?.message || "Erro ao buscar no catálogo.");
    } finally {
      setSearching(false);
    }
  }

  async function addToken(value: string) {
    const cleanValue = normalizeText(value);

    if (!cleanValue) {
      setMessage("Digite um nome válido.");
      return;
    }

    const response = await fetch("/api/club-profile/add-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cardId,
        field,
        value: cleanValue,
        nextEventDate: allowNextEventDetails ? nextEventDate : "",
        nextEventLink: allowNextEventDetails ? nextEventLink : "",
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.ok) {
      throw new Error(result?.message || "Não foi possível adicionar ao Club.");
    }

    return result;
  }

  async function saveSuggestionToCatalog(item: CatalogSuggestion) {
    const payload = {
      name: item.name,
      type: item.type || type,
      city: item.city,
      state: item.state,
      country: item.country || "Brasil",
      image_url: item.image_url,
      official_url: item.official_url,
      instagram_url: item.instagram_url,
      source_url: item.source_url || item.official_url || item.instagram_url,
      source_name: item.source_name,
      source_provider: item.source_provider || "public-club",
    };

    const response = await fetch("/api/club-catalog/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || "Não foi possível salvar no catálogo.");
    }

    return result.item || item;
  }

  async function handleUseSuggestion(item: CatalogSuggestion) {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const savedItem = await saveSuggestionToCatalog(item);
      const itemName = normalizeText(savedItem?.name || item.name);

      await addToken(itemName);

      setMessage(`${itemName} foi adicionado ao seu Club.`);
      setOpen(false);
      setQuery("");
      setNextEventDate("");
      setNextEventLink("");
      setSuggestions([]);
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || "Erro ao adicionar item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleManualAdd() {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const cleanQuery = normalizeText(query);

      await addToken(cleanQuery);

      setMessage(`${cleanQuery} foi adicionado ao seu Club.`);
      setOpen(false);
      setQuery("");
      setNextEventDate("");
      setNextEventLink("");
      setSuggestions([]);
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || "Erro ao adicionar item.");
    } finally {
      setSaving(false);
    }
  }

  if (!checked || !isOwner) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMessage("");
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: compact ? 34 : 38,
          padding: compact ? "8px 11px" : "10px 13px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.10)",
          color: "#fff",
          fontSize: compact ? 12 : 13,
          fontWeight: 850,
          cursor: "pointer",
          boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
        }}
      >
        <span style={{ fontSize: compact ? 15 : 16, lineHeight: 1 }}>+</span>
        {label}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            padding: 18,
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              maxHeight: "88vh",
              overflowY: "auto",
              borderRadius: 26,
              background:
                "linear-gradient(180deg, rgba(24,24,34,0.98), rgba(10,10,16,0.98))",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 28px 90px rgba(0,0,0,0.62)",
              padding: 18,
              color: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: 18,
                    letterSpacing: -0.3,
                    lineHeight: 1.2,
                  }}
                >
                  {title}
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 6,
                    fontSize: 13,
                    opacity: 0.68,
                    lineHeight: 1.4,
                  }}
                >
                  Busque no catálogo ou adicione manualmente ao seu Club.
                </span>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 900,
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={searchCatalog} style={{ marginTop: 18 }}>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                autoFocus
                style={{
                  width: "100%",
                  minHeight: 46,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.07)",
                  color: "#fff",
                  outline: "none",
                  padding: "0 14px",
                  fontSize: 15,
                  boxSizing: "border-box",
                }}
              />

              {allowNextEventDetails ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  <input
                    value={nextEventDate}
                    onChange={(event) => setNextEventDate(event.target.value)}
                    placeholder="Data do evento. Ex: 12/07/2026"
                    style={{
                      width: "100%",
                      minHeight: 42,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      outline: "none",
                      padding: "0 13px",
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />

                  <input
                    value={nextEventLink}
                    onChange={(event) => setNextEventLink(event.target.value)}
                    placeholder="Link oficial do evento, se tiver"
                    style={{
                      width: "100%",
                      minHeight: 42,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      outline: "none",
                      padding: "0 13px",
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 12,
                }}
              >
                <button
                  type="submit"
                  disabled={!canSearch || searching || saving}
                  style={{
                    minHeight: 40,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background:
                      !canSearch || searching || saving
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(255,255,255,0.18)",
                    color: "#fff",
                    padding: "0 15px",
                    fontWeight: 850,
                    cursor:
                      !canSearch || searching || saving ? "not-allowed" : "pointer",
                    opacity: !canSearch || searching || saving ? 0.6 : 1,
                  }}
                >
                  {searching ? "Buscando..." : "Buscar"}
                </button>

                <button
                  type="button"
                  onClick={handleManualAdd}
                  disabled={!canSearch || saving}
                  style={{
                    minHeight: 40,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    padding: "0 15px",
                    fontWeight: 800,
                    cursor: !canSearch || saving ? "not-allowed" : "pointer",
                    opacity: !canSearch || saving ? 0.6 : 1,
                  }}
                >
                  {saving ? "Salvando..." : "Adicionar manualmente"}
                </button>
              </div>
            </form>

            {message ? (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  fontSize: 13,
                  lineHeight: 1.4,
                  opacity: 0.86,
                }}
              >
                {message}
              </div>
            ) : null}

            {suggestions.length > 0 ? (
              <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                {suggestions.map((item, index) => (
                  <button
                    key={`${item.name}-${item.source_url}-${index}`}
                    type="button"
                    onClick={() => handleUseSuggestion(item)}
                    disabled={saving}
                    style={{
                      width: "100%",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.065)",
                      color: "#fff",
                      borderRadius: 18,
                      padding: 10,
                      display: "grid",
                      gridTemplateColumns: "64px 1fr",
                      gap: 12,
                      textAlign: "left",
                      cursor: saving ? "wait" : "pointer",
                      opacity: saving ? 0.68 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 14,
                        overflow: "hidden",
                        background: "rgba(255,255,255,0.08)",
                      }}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 22,
                            fontWeight: 900,
                            opacity: 0.72,
                          }}
                        >
                          +
                        </div>
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <strong
                        style={{
                          display: "block",
                          fontSize: 14,
                          lineHeight: 1.25,
                        }}
                      >
                        {item.name}
                      </strong>

                      <span
                        style={{
                          display: "block",
                          marginTop: 5,
                          fontSize: 12,
                          opacity: 0.66,
                          lineHeight: 1.35,
                          wordBreak: "break-word",
                        }}
                      >
                        {item.city || item.state
                          ? `${item.city}${item.city && item.state ? " - " : ""}${item.state}`
                          : getSourceLabel(item)}
                      </span>

                      <span
                        style={{
                          display: "inline-flex",
                          marginTop: 8,
                          fontSize: 11,
                          fontWeight: 850,
                          opacity: 0.72,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {item.is_from_catalog ? "Catálogo" : "Busca externa"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
