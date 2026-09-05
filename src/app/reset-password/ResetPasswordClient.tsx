// src/app/reset-password/ResetPasswordClient.tsx

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";
import {
  buildForgotPasswordPath,
  getSafeRecoveryReturnPath,
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

type ResetPasswordClientProps = {
  recoveryAuthorized: boolean;
};

export default function ResetPasswordClient({
  recoveryAuthorized,
}: ResetPasswordClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserClient(), []);
  const safeReturnTo = useMemo(
    () => getSafeRecoveryReturnPath(searchParams.get("return_to")),
    [searchParams]
  );

  const forgotPasswordHref = buildForgotPasswordPath(safeReturnTo);
  const continuePath = safeReturnTo || "/dashboard";

  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg(null);

    if (!recoveryAuthorized) {
      setErrorMsg("Este link de recuperação não está autorizado.");
      return;
    }

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
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw new Error(error.message);

      await fetch("/auth/recovery-complete", {
        method: "POST",
      });

      setPassword("");
      setPasswordConfirmation("");
      setSuccess(true);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar sua senha."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!recoveryAuthorized) {
    return (
      <div style={{ display: "grid", gap: 18, marginTop: 28 }}>
        <div
          role="alert"
          style={{
            padding: "18px 0",
            borderTop: "1px solid rgba(255,80,80,0.35)",
            borderBottom: "1px solid rgba(255,80,80,0.18)",
          }}
        >
          <strong style={{ display: "block", color: "#F8FAFC", fontSize: 20 }}>
            Link inválido, expirado ou aberto em outro navegador
          </strong>
          <p
            style={{
              margin: "10px 0 0",
              color: "#CBD5E1",
              lineHeight: 1.6,
            }}
          >
            Solicite um novo link e abra-o no mesmo navegador em que você
            iniciou a recuperação.
          </p>
        </div>

        <Link
          href={forgotPasswordHref}
          style={{
            color: "#2A8694",
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  if (success) {
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
          <strong style={{ display: "block", color: "#F8FAFC", fontSize: 20 }}>
            Senha atualizada
          </strong>
          <p
            style={{
              margin: "10px 0 0",
              color: "#CBD5E1",
              lineHeight: 1.6,
            }}
          >
            Sua nova senha foi salva. Você já pode continuar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            router.replace(continuePath);
            router.refresh();
          }}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "16px 18px",
            borderRadius: 14,
            border: "1px solid #2A8694",
            background: "#2A8694",
            color: "#F8FAFC",
            fontWeight: 850,
            fontSize: 17,
            cursor: "pointer",
          }}
        >
          Continuar
        </button>
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
        <span style={{ color: "#F8FAFC", fontWeight: 700 }}>Nova senha</span>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ color: "#F8FAFC", fontWeight: 700 }}>
          Confirme a nova senha
        </span>
        <div style={{ position: "relative" }}>
          <input
            type={showPasswordConfirmation ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            style={{ ...inputStyle, paddingRight: 92 }}
          />
          <button
            type="button"
            onClick={() =>
              setShowPasswordConfirmation((value) => !value)
            }
            aria-label={
              showPasswordConfirmation ? "Ocultar senha" : "Mostrar senha"
            }
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
            {showPasswordConfirmation ? "Ocultar" : "Mostrar"}
          </button>
        </div>
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
        {loading ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
