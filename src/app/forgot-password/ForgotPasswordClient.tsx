// src/app/forgot-password/ForgotPasswordClient.tsx

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";
import { getSafeRecoveryReturnPath } from "@/lib/navigation/safeInternalNextPath";

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

export default function ForgotPasswordClient() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserClient(), []);
  const safeReturnTo = useMemo(
    () => getSafeRecoveryReturnPath(searchParams.get("return_to")),
    [searchParams]
  );

  const loginHref = safeReturnTo
    ? `/login?next=${encodeURIComponent(safeReturnTo)}`
    : "/login";

  const recoveryError = searchParams.get("recovery_error");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    recoveryError
      ? "Não foi possível validar esse link de recuperação. Solicite um novo link e abra-o no mesmo navegador em que iniciou a recuperação."
      : null
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const callbackUrl = new URL(
        "/auth/recovery-callback",
        window.location.origin
      );

      if (safeReturnTo) {
        callbackUrl.searchParams.set("return_to", safeReturnTo);
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: callbackUrl.toString(),
        }
      );

      if (error) {
        setErrorMsg("Não foi possível solicitar a recuperação agora. Aguarde um momento e tente novamente.");
        return;
      }

      setSent(true);
    } catch {
      setErrorMsg("Não foi possível solicitar a recuperação agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div style={{ display: "grid", gap: 18, marginTop: 28 }}>
        <div
          role="status"
          style={{
            padding: "18px 0",
            borderTop: "1px solid rgba(42,134,148,0.44)",
            borderBottom: "1px solid rgba(42,134,148,0.18)",
          }}
        >
          <strong
            style={{
              display: "block",
              color: "#F8FAFC",
              fontSize: 20,
            }}
          >
            Verifique seu e-mail
          </strong>

          <p
            style={{
              margin: "10px 0 0",
              color: "#CBD5E1",
              lineHeight: 1.6,
            }}
          >
            Se existir uma Conta USECLUBBERS vinculada a este e-mail, você
            receberá um link para criar uma nova senha.
          </p>
        </div>

        <p
          style={{
            margin: 0,
            color: "#94A3B8",
            fontSize: 12,
            lineHeight: 1.55,
          }}
        >
          Por segurança, abra o link no mesmo navegador em que você solicitou a
          recuperação.
        </p>

        <Link
          href={loginHref}
          style={{
            color: "#2A8694",
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          Voltar para entrar
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "grid", gap: 18, marginTop: 28 }}
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

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ color: "#F8FAFC", fontWeight: 700 }}>E-mail</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
          borderRadius: 14,
          border: "1px solid #2A8694",
          background: loading ? "rgba(42,134,148,0.28)" : "#2A8694",
          color: "#F8FAFC",
          fontWeight: 850,
          fontSize: 17,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Enviando..." : "Enviar link de recuperação"}
      </button>

      <Link
        href={loginHref}
        style={{
          color: "#2A8694",
          fontWeight: 900,
          textAlign: "center",
          textDecoration: "none",
        }}
      >
        Voltar para entrar
      </Link>
    </form>
  );
}
