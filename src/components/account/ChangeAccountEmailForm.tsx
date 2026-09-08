// src/components/account/ChangeAccountEmailForm.tsx

"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type EmailChangeCallbackStatus =
  | "awaiting_other"
  | "confirmed"
  | "failed"
  | null;

type ChangeAccountEmailFormProps = {
  currentEmail: string;
  callbackStatus: EmailChangeCallbackStatus;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ChangeAccountEmailForm({
  currentEmail,
  callbackStatus,
}: ChangeAccountEmailFormProps) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg(null);
    setSentTo(null);

    const normalizedCurrentEmail = normalizeEmail(currentEmail);
    const normalizedNewEmail = normalizeEmail(newEmail);
    const normalizedConfirmation = normalizeEmail(confirmEmail);

    if (!looksLikeEmail(normalizedNewEmail)) {
      setErrorMsg("Digite um endereço de e-mail válido.");
      return;
    }

    if (normalizedNewEmail !== normalizedConfirmation) {
      setErrorMsg("Os endereços de e-mail não coincidem.");
      return;
    }

    if (normalizedNewEmail === normalizedCurrentEmail) {
      setErrorMsg("O novo e-mail deve ser diferente do e-mail atual.");
      return;
    }

    setLoading(true);

    try {
      const confirmUrl = new URL(
        "/auth/email-change-confirm",
        window.location.origin
      );

      const { error } = await supabase.auth.updateUser(
        { email: normalizedNewEmail },
        { emailRedirectTo: confirmUrl.toString() }
      );

      if (error) {
        setErrorMsg(
          "Não foi possível solicitar a alteração do e-mail agora. Verifique o endereço e tente novamente."
        );
        return;
      }

      setSentTo(normalizedNewEmail);
      setNewEmail("");
      setConfirmEmail("");
    } catch {
      setErrorMsg(
        "Não foi possível solicitar a alteração do e-mail agora. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="uc-ui-surface uc-ui-section">
      <span className="uc-ui-label">E-mail da conta</span>
      <h2 className="uc-ui-subtitle">Alterar e-mail</h2>
      <p className="uc-ui-copy">
        O e-mail da conta é usado para acesso e mensagens de segurança. Ele não
        altera nem verifica sua Identidade Clubber ou outras identidades que
        você administra.
      </p>

      {callbackStatus === "awaiting_other" ? (
        <div className="uc-ui-notice uc-ui-notice--success" role="status">
          Esta confirmação foi aceita. Agora confirme também o outro e-mail de
          segurança recebido para concluir a alteração.
        </div>
      ) : null}

      {callbackStatus === "confirmed" ? (
        <div className="uc-ui-notice uc-ui-notice--success" role="status">
          Alteração de e-mail concluída. Confira acima o endereço atualmente
          ativo na conta.
        </div>
      ) : null}

      {callbackStatus === "failed" ? (
        <div className="uc-ui-notice uc-ui-notice--error" role="alert">
          Não foi possível concluir esta confirmação. Use somente os dois
          e-mails mais recentes recebidos ou solicite uma nova alteração.
        </div>
      ) : null}

      {sentTo ? (
        <div className="uc-ui-notice uc-ui-notice--success" role="status">
          Solicitação enviada para <strong>{sentTo}</strong>. Abra os dois
          e-mails de segurança mais recentes. Em cada um, abra o USECLUBBERS e
          confirme a ação pelo botão exibido na plataforma.
        </div>
      ) : null}

      {errorMsg ? (
        <div className="uc-ui-notice uc-ui-notice--error" role="alert">
          {errorMsg}
        </div>
      ) : null}

      <form className="uc-ui-form" onSubmit={handleSubmit}>
        <div className="uc-ui-fields uc-ui-fields--2">
          <label className="uc-ui-field">
            <span>Novo e-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              className="uc-ui-input"
              placeholder="novo@email.com"
            />
          </label>

          <label className="uc-ui-field">
            <span>Confirme o novo e-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              className="uc-ui-input"
              placeholder="repita o novo e-mail"
            />
          </label>
        </div>

        <div className="uc-ui-form-actions">
          <button
            type="submit"
            disabled={loading}
            className="uc-ui-button uc-ui-button--quiet"
          >
            {loading ? "Enviando..." : "Enviar confirmação"}
          </button>
        </div>
      </form>
    </article>
  );
}