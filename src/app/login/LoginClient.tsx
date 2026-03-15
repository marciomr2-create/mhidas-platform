"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

export default function LoginClient() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleLogin}
      style={{
        maxWidth: 660,
        display: "grid",
        gap: 18,
        marginTop: 24,
      }}
    >
      {errorMsg ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,80,80,0.35)",
            background: "rgba(255,80,80,0.08)",
            color: "#fff",
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      <label style={{ display: "grid", gap: 8 }}>
        <span>E-mail</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.04)",
            color: "#fff",
            outline: "none",
          }}
        />
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span>Senha</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.04)",
            color: "#fff",
            outline: "none",
          }}
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "16px 18px",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.06)",
          color: "#fff",
          fontWeight: 800,
          fontSize: 18,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <p style={{ margin: 0, opacity: 0.75 }}>
        Após autenticar, você será redirecionado para: <strong>/dashboard</strong>
      </p>
    </form>
  );
}
