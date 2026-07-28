// src/app/signup/SignupClient.tsx

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "15px 0 13px",
  border: 0,
  borderBottom: "1px solid rgba(255,255,255,0.18)",
  background: "transparent",
  color: "#ffffff",
  outline: "none",
  fontSize: 16,
};

export default function SignupClient() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg("Use uma senha com pelo menos 8 caracteres.");
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMsg("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", "/onboarding");

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: callbackUrl.toString() },
      });

      if (error) throw new Error(error.message);

      if (data.session) {
        router.replace("/onboarding");
        router.refresh();
        return;
      }

      setConfirmationSent(true);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Não foi possível criar a conta."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true);
    setErrorMsg(null);

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", "/onboarding");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: { prompt: "select_account" },
        },
      });

      if (error) throw new Error(error.message);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Não foi possível continuar com Google."
      );
      setGoogleLoading(false);
    }
  }

  if (confirmationSent) {
    return (
      <div style={{ display: "grid", gap: 18, marginTop: 28 }}>
        <div
          style={{
            borderTop: "1px solid rgba(45,212,191,0.42)",
            borderBottom: "1px solid rgba(45,212,191,0.18)",
            padding: "20px 0",
          }}
        >
          <strong style={{ display: "block", fontSize: 21 }}>
            Confirme seu e-mail
          </strong>
          <p style={{ color: "rgba(255,255,255,0.70)", lineHeight: 1.6 }}>
            Enviamos uma confirmação para <strong>{email.trim()}</strong>. Depois
            de confirmar, você seguirá para criar seu perfil Clubber.
          </p>
        </div>

        <Link
          href="/login?next=/onboarding"
          style={{ color: "#5eead4", fontWeight: 900, textDecoration: "none" }}
        >
          Voltar para entrar
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSignup}
      style={{ display: "grid", gap: 20, marginTop: 28 }}
    >
      {errorMsg ? (
        <div
          role="alert"
          style={{
            borderTop: "1px solid rgba(248,113,113,0.46)",
            borderBottom: "1px solid rgba(248,113,113,0.20)",
            padding: "13px 0",
            color: "#ffffff",
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      {googleEnabled ? (
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
          style={{
            minHeight: 52,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.055)",
            color: "#ffffff",
            fontWeight: 900,
            fontSize: 16,
          }}
        >
          {googleLoading ? "Abrindo Google..." : "Continuar com Google"}
        </button>
      ) : null}

      <label style={{ display: "grid", gap: 5 }}>
        <span style={{ fontWeight: 800 }}>E-mail</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={{ display: "grid", gap: 5 }}>
        <span style={{ fontWeight: 800 }}>Crie uma senha</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={{ display: "grid", gap: 5 }}>
        <span style={{ fontWeight: 800 }}>Confirme a senha</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          style={inputStyle}
        />
      </label>

      <button
        type="submit"
        disabled={loading || googleLoading}
        style={{
          minHeight: 54,
          borderRadius: 18,
          border: "1px solid rgba(45,212,191,0.44)",
          background: loading
            ? "rgba(45,212,191,0.20)"
            : "linear-gradient(135deg, #14b8a6, #059669)",
          color: "#ffffff",
          fontWeight: 950,
          fontSize: 17,
        }}
      >
        {loading ? "Criando conta..." : "Criar conta gratuita"}
      </button>

      <p
        style={{
          margin: 0,
          color: "rgba(255,255,255,0.62)",
          fontSize: 13,
          lineHeight: 1.55,
          textAlign: "center",
        }}
      >
        Você não precisa ter cartão, pulseira, pingente ou tag NFC.
      </p>

      <Link
        href="/login"
        style={{ color: "#5eead4", fontWeight: 900, textAlign: "center", textDecoration: "none" }}
      >
        Já tenho uma conta
      </Link>
    </form>
  );
}
