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

type Props = {
  cardId: string;
};

export default function SocialLinksManager({ cardId }: Props) {
  const supabase = useMemo(() => createBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [links, setLinks] = useState<SocialLinkRow[]>([]);

  async function loadLinks() {
    setErrorMsg(null);
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

      const { data, error } = await supabase
        .from("social_links")
        .select("id,platform,url,label,is_active,sort_order,position,clicks_count,updated_at")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
        .order("position", { ascending: true });

      if (error) throw error;

      setLinks((data as SocialLinkRow[]) ?? []);
    } catch (e: any) {
      setLinks([]);
      setErrorMsg(e?.message ?? "Falha ao carregar social links.");
    } finally {
      setLoading(false);
    }
  }

  async function setActive(linkId: string, nextActive: boolean) {
    setErrorMsg(null);
    setSavingId(linkId);

    setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, is_active: nextActive } : l)));

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const userId = authData.user?.id;
      if (!userId) throw new Error("Sessão expirada. Faça login novamente.");

      const { error } = await supabase
        .from("social_links")
        .update({ is_active: nextActive, updated_at: new Date().toISOString() })
        .eq("id", linkId)
        .eq("user_id", userId);

      if (error) throw error;

      await loadLinks();
    } catch (e: any) {
      setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, is_active: !nextActive } : l)));
      setErrorMsg(e?.message ?? "Falha ao atualizar o status do link.");
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

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

          {links.length === 0 ? (
            <p style={{ opacity: 0.8 }}>Nenhum social link cadastrado.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {links.map((l) => {
                const isSaving = savingId === l.id;

                return (
                  <div
                    key={l.id}
                    style={{
                      padding: 12,
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>{l.label?.trim() ? l.label : l.platform}</div>
                        <div style={{ fontSize: 13, opacity: 0.8, wordBreak: "break-word" }}>{l.url}</div>
                      </div>

                      <div style={{ textAlign: "right", minWidth: 140 }}>
                        <div style={{ fontSize: 13, opacity: 0.8 }}>Cliques</div>
                        <div style={{ fontSize: 18, fontWeight: 900 }}>{Number(l.clicks_count ?? 0)}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ fontSize: 13, opacity: 0.75 }}>
                        sort_order: {l.sort_order} | position: {l.position}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActive(l.id, !l.is_active)}
                        disabled={isSaving}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.16)",
                          background: l.is_active ? "rgba(0,160,90,0.18)" : "rgba(255,255,255,0.06)",
                          cursor: isSaving ? "not-allowed" : "pointer",
                          fontWeight: 800,
                        }}
                      >
                        {isSaving ? "Salvando..." : l.is_active ? "Ativo" : "Inativo"}
                      </button>
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.6 }}>ID: {l.id}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              onClick={loadLinks}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Recarregar
            </button>
          </div>
        </>
      )}
    </div>
  );
}