// src/app/login/LoginClient.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

const RESERVED_NEXT_SLUGS = new Set([
  "api",
  "clubbers",
  "dashboard",
  "event",
  "invalid",
  "login",
  "network",
  "pro",
  "r",
  "t",
  "u",
]);

function getSafeNextPath(value: string | null): string {
  const candidate = String(value || "").trim();

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(candidate)
  ) {
    return "";
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(candidate, "https://useclubbers.local");
  } catch {
    return "";
  }

  const pathname = parsedUrl.pathname;
  const search = parsedUrl.search;

  if (pathname === "/dashboard") {
    return "/dashboard";
  }

  if (pathname === "/dashboard/cards") {
    return "/dashboard/cards";
  }

  if (pathname === "/clubbers") {
    return "/clubbers";
  }

  if (/^\/event\/[a-z0-9][a-z0-9_-]*$/i.test(pathname)) {
    return `${pathname}${search}`;
  }

  if (/^\/[a-z0-9][a-z0-9_-]*$/i.test(pathname)) {
    const slug = pathname.slice(1).toLowerCase();

    if (RESERVED_NEXT_SLUGS.has(slug)) {
      return "";
    }

    const query = new URLSearchParams(search);

    if (query.size === 1 && query.get("mode") === "club") {
      return `${pathname}?mode=club`;
    }
  }

  return "";
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "15px 16px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.045)",
  color: "#ffffff",
  outline: "none",
  fontSize: 16,
};

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserClient(), []);

  const safeRedirectPath = useMemo(() => {
    const safeNextPath = getSafeNextPath(searchParams.get("next"));

    if (safeNextPath) {
      return safeNextPath;
    }

    return getSafeNextPath(searchParams.get("return_to"));
  }, [searchParams]);

  const redirectPath = safeRedirectPath || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkExistingSession() {
      try {
        const { data } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        if (data.session) {
          router.replace(redirectPath);
          router.refresh();
          return;
        }

        setIsCheckingSession(false);
      } catch {
        if (isMounted) {
          setIsCheckingSession(false);
        }
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
        throw new Error(error.message);
      }

      router.push(redirectPath);
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  if (isCheckingSession) {
    return (
      <div style={{ padding: "14px 0 2px" }}>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.72)" }}>
          Verificando acesso...
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleLogin}
      style={{
        width: "100%",
        display: "grid",
        gap: 18,
        marginTop: 28,
      }}
    >
      {errorMsg ? (
        <div
          role="alert"
          style={{
            padding: 13,
            borderRadius: 14,
            border: "1px solid rgba(255,80,80,0.35)",
            background: "rgba(255,80,80,0.08)",
            color: "#ffffff",
          }}
        >
          {errorMsg}
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
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={inputStyle}
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "16px 18px",
          borderRadius: 18,
          border: "1px solid rgba(45,212,191,0.48)",
          background: loading
            ? "rgba(45,212,191,0.22)"
            : "linear-gradient(135deg, #14b8a6 0%, #10b981 100%)",
          color: "#ffffff",
          fontWeight: 850,
          fontSize: 17,
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: loading ? "none" : "0 18px 45px rgba(20,184,166,0.18)",
        }}
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <p
        style={{
          margin: 0,
          color: "rgba(255,255,255,0.68)",
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        Depois de entrar, você volta para: {" "}
        <strong style={{ color: "rgba(255,255,255,0.94)" }}>
          {redirectPath}
        </strong>
      </p>
    </form>
  );
}
