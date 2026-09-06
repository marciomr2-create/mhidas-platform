// src/app/login/LoginClient.tsx

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";
import {
  getLoginErrorMessage,
  getOAuthErrorMessage,
} from "@/lib/auth/userFacingAuthError";
import {
  buildForgotPasswordPath,
  getSafeInternalNextPath,
} from "@/lib/navigation/safeInternalNextPath";

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "15px 16px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#111111",
  color: "#F8FAFC",
  outline: "none",
  fontSize: 16,
};

const secondaryButtonStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "15px 18px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#111111",
  color: "#F8FAFC",
  fontWeight: 850,
  fontSize: 16,
  cursor: "pointer",
};

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserClient(), []);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  const safeRedirectPath = useMemo(() => {
    const safeNextPath = getSafeInternalNextPath(searchParams.get("next"));

    if (safeNextPath) {
      return safeNextPath;
    }

    return getSafeInternalNextPath(searchParams.get("return_to"));
  }, [searchParams]);

  const redirectPath = safeRedirectPath || "/dashboard";
  const signupHref = safeRedirectPath
    ? `/signup?return_to=${encodeURIComponent(safeRedirectPath)}`
    : "/signup";
  const forgotPasswordHref = buildForgotPasswordPath(safeRedirectPath);
  const callbackError = searchParams.get("auth_error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    callbackError === "email_confirmation_failed"
      ? "Não foi possível confirmar este e-mail. Use o link mais recente e abra-o no mesmo navegador em que você criou sua conta."
      : callbackError === "callback_failed"
        ? "Não foi possível concluir o acesso. Tente novamente."
        : null
  );

  useEffect(() => {
    let isMounted = true;

    async function checkExistingSession() {
      try {
        const { data } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (data.session) {
          router.replace(redirectPath);
          router.refresh();
          return;
        }

        setIsCheckingSession(false);
      } catch {
        if (isMounted) setIsCheckingSession(false);
      }
    }

    void checkExistingSession();

    return () => {
      isMounted = false;
    };
  }, [redirectPath, router, supabase]);

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
        setErrorMsg(getLoginErrorMessage(error));
        return;
      }

      router.push(redirectPath);
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setErrorMsg(null);

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", redirectPath);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: { prompt: "select_account" },
        },
      });

      if (error) {
        setErrorMsg(getOAuthErrorMessage(error, "login"));
        setGoogleLoading(false);
        return;
      }
    } catch (err: unknown) {
      setErrorMsg(getOAuthErrorMessage(err, "login"));
      setGoogleLoading(false);
    }
  }

  if (isCheckingSession) {
    return (
      <div style={{ padding: "14px 0 2px" }}>
        <p style={{ margin: 0, color: "#CBD5E1" }}>
          Verificando acesso...
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleLogin}
      style={{ width: "100%", display: "grid", gap: 18, marginTop: 28 }}
    >
      {errorMsg ? (
        <div
          role="alert"
          style={{
            padding: 13,
            borderRadius: 14,
            border: "1px solid rgba(255,80,80,0.35)",
            background: "rgba(255,80,80,0.08)",
            color: "#F8FAFC",
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      {googleEnabled ? (
        <button
          type="button"
          disabled={googleLoading || loading}
          onClick={handleGoogleLogin}
          style={secondaryButtonStyle}
        >
          {googleLoading ? "Abrindo Google..." : "Continuar com Google"}
        </button>
      ) : null}

      {googleEnabled ? (
        <div
          aria-hidden="true"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 10,
            color: "#CBD5E1",
            fontSize: 12,
          }}
        >
          <span style={{ height: 1, background: "rgba(203,213,225,0.12)" }} />
          ou use seu e-mail
          <span style={{ height: 1, background: "rgba(203,213,225,0.12)" }} />
        </div>
      ) : null}

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontWeight: 700 }}>E-mail</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={inputStyle}
        />
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontWeight: 700 }}>Senha</span>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputStyle, paddingRight: 92 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            style={{
              position: "absolute",
              top: "50%",
              right: 12,
              transform: "translateY(-50%)",
              border: 0,
              background: "transparent",
              color: "#2A8694",
              fontWeight: 900,
              fontSize: 13,
              cursor: "pointer",
              padding: "8px 4px",
            }}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        <Link
          href={forgotPasswordHref}
          style={{
            justifySelf: "end",
            color: "#2A8694",
            fontSize: 13,
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          Esqueci minha senha
        </Link>
      </label>

      <button
        type="submit"
        disabled={loading || googleLoading}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "16px 18px",
          borderRadius: 14,
          border: "1px solid #2A8694",
          background: loading ? "rgba(42,134,148,0.28)" : "#2A8694",
          color: "#F8FAFC",
          fontWeight: 850,
          fontSize: 17,
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "none",
        }}
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <div style={{ display: "grid", gap: 8, textAlign: "center" }}>
        <span style={{ color: "#CBD5E1", fontSize: 14 }}>
          Ainda não tem uma conta?
        </span>
        <Link
          href={signupHref}
          style={{ color: "#2A8694", fontWeight: 900, textDecoration: "none" }}
        >
          Criar minha Conta USECLUBBERS
        </Link>
      </div>

      <p
        style={{
          margin: 0,
          color: "#CBD5E1",
          fontSize: 12,
          lineHeight: 1.5,
          textAlign: "center",
        }}
      >
        O NFC é opcional e poderá ser vinculado depois.
      </p>
    </form>
  );
}
