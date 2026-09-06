// src/app/auth/email-change-confirm/EmailChangeConfirmClient.tsx

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

type ConfirmState = "idle" | "loading" | "error";

export default function EmailChangeConfirmClient() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [state, setState] = useState<ConfirmState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const tokenHash = searchParams.get("token_hash")?.trim() || "";
  const type = searchParams.get("type")?.trim() || "";
  const requestIsValid = Boolean(tokenHash) && type === "email_change";

  async function handleConfirm() {
    if (!requestIsValid || state === "loading") {
      return;
    }

    setState("loading");
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "email_change",
      });

      if (error) {
        setState("error");
        setErrorMsg(
          "Este link de confirmação é inválido, já foi utilizado ou expirou. Use somente os dois e-mails mais recentes recebidos."
        );
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.replace("/account/security?email_change=confirmed");
        return;
      }

      const pendingEmail =
        typeof user.new_email === "string" ? user.new_email.trim() : "";

      window.location.replace(
        pendingEmail
          ? "/account/security?email_change=awaiting_other"
          : "/account/security?email_change=confirmed"
      );
    } catch {
      setState("error");
      setErrorMsg(
        "Não foi possível confirmar esta alteração agora. Tente novamente usando o e-mail mais recente recebido."
      );
    }
  }

  return (
    <main className="uc-ui-shell">
      <div className="uc-ui-page">
        <header className="uc-ui-header">
          <span className="uc-ui-eyebrow">SEGURANÇA DA CONTA</span>
          <h1 className="uc-ui-title">Confirmar alteração de e-mail</h1>
          <p className="uc-ui-description">
            Abrir esta página não altera sua conta. A confirmação só acontece
            quando você usa o botão abaixo.
          </p>
        </header>

        <section className="uc-ui-surface uc-ui-section">
          {!requestIsValid ? (
            <>
              <div className="uc-ui-notice uc-ui-notice--error" role="alert">
                Este link de confirmação está incompleto ou inválido.
              </div>

              <div className="uc-ui-form-actions">
                <Link
                  href="/account/security"
                  className="uc-ui-button uc-ui-button--quiet"
                >
                  Voltar para Conta e segurança
                </Link>
              </div>
            </>
          ) : (
            <>
              <span className="uc-ui-label">Confirmação segura</span>
              <h2 className="uc-ui-subtitle">Autorizar esta confirmação</h2>
              <p className="uc-ui-copy">
                Se você solicitou a alteração do e-mail da sua Conta
                USECLUBBERS, confirme abaixo. Com a proteção dupla ativa, será
                necessário fazer o mesmo no segundo e-mail de segurança.
              </p>

              {errorMsg ? (
                <div className="uc-ui-notice uc-ui-notice--error" role="alert">
                  {errorMsg}
                </div>
              ) : null}

              <div className="uc-ui-form-actions">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={state === "loading"}
                  className="uc-ui-button uc-ui-button--primary"
                >
                  {state === "loading"
                    ? "Confirmando..."
                    : "Confirmar alteração de e-mail"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}