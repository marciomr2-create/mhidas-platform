"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type SocialLinkRow = {
  id: string;
  card_id: string;
  label: string;
  platform: string;
  url: string;
  position: number;
  is_active: boolean;
  created_at?: string;
};

export default function SocialLinksManager({ cardId }: { cardId: string }) {
  const supabase = useMemo(() => createBrowserClient(), []);

  const [label, setLabel] = useState("");
  const [platform, setPlatform] = useState("");
  const [url, setUrl] = useState("");

  const [links, setLinks] = useState<SocialLinkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [adding, setAdding] = useState(false);

  const [uiError, setUiError] = useState<string | null>(null);

  const normalizeError = (err: any) => {
    const message =
      err?.message ||
      err?.error_description ||
      err?.details ||
      err?.hint ||
      (typeof err === "string" ? err : null);

    const code = err?.code ? ` (code: ${err.code})` : "";
    return message ? `${message}${code}` : "Ocorreu um erro ao carregar os links.";
  };

  const loadLinks = useCallback(async () => {
    setLoading(true);
    setUiError(null);

    try {
      const { data, error } = await supabase
        .from("social_links")
        .select("id,card_id,label,platform,url,position,is_active,created_at")
        .eq("card_id", cardId)
        .order("position", { ascending: true });

      if (error) {
        setUiError(normalizeError(error));
        setLinks([]);
        return;
      }

      setLinks((data as SocialLinkRow[]) || []);
    } catch (err: any) {
      setUiError(normalizeError(err));
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, cardId]);

  useEffect(() => {
    if (!cardId) return;
    void loadLinks();
  }, [cardId, loadLinks]);

  const validateNewLink = () => {
    const l = label.trim();
    const p = platform.trim();
    const u = url.trim();

    if (!l || !p || !u) return "Preencha label, platform e url.";
    if (!u.includes(".")) return "A url parece inválida. Informe um endereço completo.";
    return null;
  };

  const onAdd = async () => {
    const validation = validateNewLink();
    if (validation) {
      setUiError(validation);
      return;
    }

    setAdding(true);
    setUiError(null);

    try {
      const nextPosition = links.length ? Math.max(...links.map((x) => x.position)) + 1 : 1;

      const { error } = await supabase.from("social_links").insert({
        card_id: cardId,
        label: label.trim(),
        platform: platform.trim(),
        url: url.trim(),
        position: nextPosition,
        is_active: true,
      });

      if (error) {
        setUiError(normalizeError(error));
        return;
      }

      setLabel("");
      setPlatform("");
      setUrl("");
      await loadLinks();
    } catch (err: any) {
      setUiError(normalizeError(err));
    } finally {
      setAdding(false);
    }
  };

  const onToggleActive = async (id: string, nextValue: boolean) => {
    setUiError(null);

    try {
      const { error } = await supabase
        .from("social_links")
        .update({ is_active: nextValue })
        .eq("id", id)
        .eq("card_id", cardId);

      if (error) {
        setUiError(normalizeError(error));
        return;
      }

      setLinks((prev) => prev.map((x) => (x.id === id ? { ...x, is_active: nextValue } : x)));
    } catch (err: any) {
      setUiError(normalizeError(err));
    }
  };

  const onDelete = async (id: string) => {
    setUiError(null);

    try {
      const { error } = await supabase
        .from("social_links")
        .delete()
        .eq("id", id)
        .eq("card_id", cardId);

      if (error) {
        setUiError(normalizeError(error));
        return;
      }

      setLinks((prev) => prev.filter((x) => x.id !== id));
    } catch (err: any) {
      setUiError(normalizeError(err));
    }
  };

  const [dragId, setDragId] = useState<string | null>(null);

  const onDragStart = (id: string) => setDragId(id);

  const onDropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;

    const fromIndex = links.findIndex((x) => x.id === dragId);
    const toIndex = links.findIndex((x) => x.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...links];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    const rePos = next.map((x, idx) => ({ ...x, position: idx + 1 }));
    setLinks(rePos);
    setDragId(null);
  };

  const onSaveOrder = async () => {
    setSavingOrder(true);
    setUiError(null);

    try {
      for (const x of links) {
        const { error } = await supabase
          .from("social_links")
          .update({ position: x.position })
          .eq("id", x.id)
          .eq("card_id", cardId);

        if (error) {
          setUiError(normalizeError(error));
          return;
        }
      }
    } catch (err: any) {
      setUiError(normalizeError(err));
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {uiError ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.04)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <strong>Falha:</strong> {uiError}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>label</div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex.: Instagram"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.03)",
              color: "inherit",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>platform</div>
          <input
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="Ex.: instagram"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.03)",
              color: "inherit",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>url</div>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="instagram.com/seuusuario"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.03)",
              color: "inherit",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
          <button
            type="button"
            onClick={onAdd}
            disabled={adding}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              color: "inherit",
              cursor: adding ? "not-allowed" : "pointer",
              fontWeight: 800,
            }}
          >
            {adding ? "Adicionando..." : "Adicionar"}
          </button>

          <button
            type="button"
            onClick={onSaveOrder}
            disabled={savingOrder || links.length < 2}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              color: "inherit",
              cursor: savingOrder ? "not-allowed" : "pointer",
              fontWeight: 800,
              opacity: links.length < 2 ? 0.6 : 1,
            }}
          >
            {savingOrder ? "Salvando..." : "Salvar ordem"}
          </button>

          <button
            type="button"
            onClick={() => void loadLinks()}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              color: "inherit",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 800,
            }}
          >
            {loading ? "Carregando..." : "Recarregar"}
          </button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
          Arraste e solte para reordenar. Depois clique em “Salvar ordem”.
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
        {links.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            {loading ? "Carregando links..." : "Nenhum link cadastrado."}
          </div>
        ) : (
          links.map((x) => (
            <div
              key={x.id}
              draggable
              onDragStart={() => onDragStart(x.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropOn(x.id)}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.03)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 2 }}>
                  <div style={{ fontWeight: 900 }}>
                    {x.label} <span style={{ opacity: 0.7, fontWeight: 700 }}>({x.platform})</span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{x.url}</div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, opacity: 0.9 }}>
                    <input
                      type="checkbox"
                      checked={x.is_active}
                      onChange={(e) => void onToggleActive(x.id, e.target.checked)}
                    />
                    Ativo
                  </label>

                  <button
                    type="button"
                    onClick={() => void onDelete(x.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: "rgba(255,255,255,0.04)",
                      color: "inherit",
                      cursor: "pointer",
                      fontWeight: 800,
                    }}
                  >
                    Remover
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75 }}>Posição: {x.position}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}