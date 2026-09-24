"use client";

import { useCallback, useEffect, useState } from "react";

type ProfileMode = "clubber" | "professional";
type LifecycleAction = "issue" | "rotate" | "revoke";

type NfcStatus = {
  profile_mode: ProfileMode;
  active: boolean;
  created_at: string | null;
  rotated_at: string | null;
  revoked_at: string | null;
};

type StatusResponse = {
  ok?: boolean;
  statuses?: NfcStatus[];
  message?: string;
};

type LifecycleResponse = {
  ok?: boolean;
  nfc_url?: string;
  message?: string;
};

type CardNfcManagerProps = {
  cardId: string;
  canActivate: boolean;
};

const MODES: Array<{
  id: ProfileMode;
  title: string;
  description: string;
}> = [
  {
    id: "clubber",
    title: "NFC Clubber",
    description:
      "Seu amuleto abre diretamente sua identidade Clubber pública.",
  },
  {
    id: "professional",
    title: "NFC Professional",
    description:
      "Seu NFC profissional abre seu perfil para networking e contatos.",
  },
];

function initialStatuses(): NfcStatus[] {
  return MODES.map((mode) => ({
    profile_mode: mode.id,
    active: false,
    created_at: null,
    rotated_at: null,
    revoked_at: null,
  }));
}

function formatDate(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

async function copyText(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  const textarea = document.createElement("textarea");

  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");

  document.body.removeChild(textarea);

  return copied;
}

export default function CardNfcManager({
  cardId,
  canActivate,
}: CardNfcManagerProps) {
  const [statuses, setStatuses] =
    useState<NfcStatus[]>(initialStatuses);

  const [loading, setLoading] = useState(true);

  const [busyMode, setBusyMode] =
    useState<ProfileMode | null>(null);

  const [feedback, setFeedback] = useState("");

  const [writeLink, setWriteLink] = useState<{
    profile_mode: ProfileMode;
    nfc_url: string;
  } | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/card-tokens?card_id=${encodeURIComponent(cardId)}`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const payload = (await response.json()) as StatusResponse;

      if (
        !response.ok ||
        !payload.ok ||
        !Array.isArray(payload.statuses)
      ) {
        throw new Error();
      }

      setStatuses(
        MODES.map((mode) => {
          const row = payload.statuses?.find(
            (item) => item.profile_mode === mode.id
          );

          return {
            profile_mode: mode.id,
            active: row?.active === true,
            created_at: row?.created_at ?? null,
            rotated_at: row?.rotated_at ?? null,
            revoked_at: row?.revoked_at ?? null,
          };
        })
      );
    } catch {
      setFeedback(
        "Não foi possível consultar o estado dos seus NFCs agora."
      );
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function runAction(
    profileMode: ProfileMode,
    action: LifecycleAction
  ) {
    if (!canActivate && action !== "revoke") {
      setFeedback(
        "Publique seu perfil antes de ativar um NFC."
      );
      return;
    }

    if (action === "rotate") {
      const confirmed = window.confirm(
        "Gerar um novo link desativa o link gravado no NFC atual. Continuar?"
      );

      if (!confirmed) return;
    }

    if (action === "revoke") {
      const confirmed = window.confirm(
        "Desativar este NFC fará o chip atual parar de abrir seu perfil. Continuar?"
      );

      if (!confirmed) return;
    }

    setBusyMode(profileMode);
    setFeedback("");

    try {
      const response = await fetch("/api/card-tokens", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          card_id: cardId,
          profile_mode: profileMode,
        }),
      });

      const payload =
        (await response.json()) as LifecycleResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.message ||
            "Não foi possível concluir a operação NFC."
        );
      }

      if (
        (action === "issue" || action === "rotate") &&
        typeof payload.nfc_url === "string" &&
        payload.nfc_url.length > 0
      ) {
        setWriteLink({
          profile_mode: profileMode,
          nfc_url: payload.nfc_url,
        });

        setFeedback(
          action === "issue"
            ? "NFC ativado. O link para gravar no chip foi gerado."
            : "Novo link gerado. O NFC anterior deixou de funcionar."
        );
      } else {
        setWriteLink((current) =>
          current?.profile_mode === profileMode
            ? null
            : current
        );

        setFeedback("NFC desativado.");
      }

      await loadStatus();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a operação NFC."
      );
    } finally {
      setBusyMode(null);
    }
  }

  async function handleCopyLink() {
    if (!writeLink?.nfc_url) return;

    try {
      const copied = await copyText(writeLink.nfc_url);

      setFeedback(
        copied
          ? "Link NFC copiado. Use-o somente para gravar seu chip."
          : "Não foi possível copiar o link NFC."
      );
    } catch {
      setFeedback("Não foi possível copiar o link NFC.");
    }
  }

  return (
    <div className="uc-ui-stack">
      {!canActivate ? (
        <div className="uc-ui-notice">
          Publique o perfil antes de ativar os NFCs. O destino público
          precisa estar disponível antes da gravação do chip.
        </div>
      ) : null}

      <div className="uc-ui-grid uc-ui-grid--2">
        {MODES.map((mode) => {
          const status =
            statuses.find(
              (item) => item.profile_mode === mode.id
            ) ?? {
              profile_mode: mode.id,
              active: false,
              created_at: null,
              rotated_at: null,
              revoked_at: null,
            };

          const busy = busyMode === mode.id;

          const lifecycleDate =
            formatDate(status.rotated_at) ||
            formatDate(status.created_at);

          const visualMode =
            mode.id === "professional"
              ? "pro"
              : "clubber";

          return (
            <article
              key={mode.id}
              className="uc-ui-surface"
              data-mhidas-mode={visualMode}
            >
              <span className="uc-ui-label">
                {mode.id === "clubber"
                  ? "IDENTIDADE CLUBBER"
                  : "PERFIL PROFISSIONAL"}
              </span>

              <strong className="uc-ui-value">
                {mode.title}
              </strong>

              <p className="uc-ui-copy">
                {mode.description}
              </p>

              <span
                className={
                  status.active
                    ? "uc-ui-status uc-ui-status--accent"
                    : "uc-ui-status"
                }
              >
                {loading
                  ? "Consultando..."
                  : status.active
                    ? "Ativo"
                    : "Não ativado"}
              </span>

              {!loading &&
              status.active &&
              lifecycleDate ? (
                <p className="uc-ui-copy">
                  Última ativação ou troca: {lifecycleDate}
                </p>
              ) : null}

              <div className="uc-ui-stack">
                {!status.active ? (
                  <button
                    type="button"
                    className="uc-ui-button"
                    disabled={
                      loading ||
                      busy ||
                      !canActivate
                    }
                    onClick={() =>
                      void runAction(mode.id, "issue")
                    }
                  >
                    {busy
                      ? "Ativando..."
                      : "Ativar NFC"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="uc-ui-button"
                      disabled={loading || busy}
                      onClick={() =>
                        void runAction(mode.id, "rotate")
                      }
                    >
                      {busy
                        ? "Processando..."
                        : "Gerar novo link"}
                    </button>

                    <button
                      type="button"
                      className="uc-ui-button"
                      disabled={loading || busy}
                      onClick={() =>
                        void runAction(mode.id, "revoke")
                      }
                    >
                      {busy
                        ? "Processando..."
                        : "Desativar NFC"}
                    </button>
                  </>
                )}
              </div>

              {writeLink?.profile_mode === mode.id ? (
                <div className="uc-ui-notice uc-ui-notice--success">
                  <strong>
                    Link pronto para gravar no chip
                  </strong>

                  <p className="uc-ui-copy">
                    Este link aparece somente nesta sessão.
                    Não o compartilhe publicamente.
                  </p>

                  <button
                    type="button"
                    className="uc-ui-button"
                    onClick={() => void handleCopyLink()}
                  >
                    Copiar link para gravar no NFC
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {feedback ? (
        <div
          className="uc-ui-notice"
          role="status"
          aria-live="polite"
        >
          {feedback}
        </div>
      ) : null}
    </div>
  );
}