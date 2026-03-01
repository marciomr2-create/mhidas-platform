// src/app/login/LoginClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

export default function LoginClient() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/dashboard/cards";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErr(error.message);
        return;
      }

      // redireciona mantendo o comportamento simples e estável
      window.location.href = next;
    } catch (e: any) {
      setErr(e?.message || "Falha ao autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Login</h1>

      <p style={{ marginTop: 10, opacity: 0.85, lineHeight: 1.5 }}>
        Acesse sua conta para gerenciar seu card.
      </p>

      {err ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.04)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <strong>Erro:</strong> {err}
        </div>
      ) : null}

      <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>E-mail</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
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
          <div style={{ fontSize: 12, opacity: 0.9 }}>Senha</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
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

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.06)",
            color: "inherit",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 900,
            marginTop: 6,
          }}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>

        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
          Após autenticar, você será redirecionado para: <strong>{next}</strong>
        </div>
      </form>
    </main>
  );
}