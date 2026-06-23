"use client";

import { useEffect, useState } from "react";

type ClubProfileOverviewActionsProps = {
  profileName: string;
  publicPath: string;
  qrPath: string;
  hasPublicProfile: boolean;
};

function getAbsoluteUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
}

async function copyText(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  textArea.style.pointerEvents = "none";

  document.body.appendChild(textArea);
  textArea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  return copied;
}

export default function ClubProfileOverviewActions({
  profileName,
  publicPath,
  qrPath,
  hasPublicProfile,
}: ClubProfileOverviewActionsProps) {
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!isQrOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsQrOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isQrOpen]);

  async function handleShare() {
    if (!hasPublicProfile) {
      setFeedback("Publique o perfil para liberar o compartilhamento.");
      return;
    }

    const absoluteUrl = getAbsoluteUrl(publicPath);

    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: profileName,
          text: "Conheça meu Perfil Clubber no USECLUBBERS.",
          url: absoluteUrl,
        });
        setFeedback("Perfil compartilhado.");
        return;
      }

      const copied = await copyText(absoluteUrl);
      setFeedback(
        copied
          ? "Link do perfil copiado."
          : "Não foi possível copiar o link agora."
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      try {
        const copied = await copyText(absoluteUrl);
        setFeedback(
          copied
            ? "Link do perfil copiado."
            : "Não foi possível compartilhar o perfil agora."
        );
      } catch {
        setFeedback("Não foi possível compartilhar o perfil agora.");
      }
    }
  }

  function handleOpenQr() {
    if (!hasPublicProfile) {
      setFeedback("Publique o perfil para liberar o QR Code.");
      return;
    }

    setFeedback("");
    setIsQrOpen(true);
  }

  return (
    <>
      <div className="club-nfc-actions">
        <button
          type="button"
          className="club-primary-button club-action-button"
          onClick={handleOpenQr}
          aria-haspopup="dialog"
          disabled={!hasPublicProfile}
        >
          Ver NFC e QR Code
        </button>

        {hasPublicProfile ? (
          <button
            type="button"
            className="club-secondary-link club-secondary-button"
            onClick={handleShare}
          >
            Compartilhar perfil
          </button>
        ) : null}

        {feedback ? (
          <p className="club-action-feedback" role="status" aria-live="polite">
            {feedback}
          </p>
        ) : null}
      </div>

      {isQrOpen ? (
        <div
          className="club-qr-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsQrOpen(false);
            }
          }}
        >
          <section
            className="club-qr-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="club-qr-dialog-title"
          >
            <div className="club-qr-dialog-header">
              <div>
                <p className="club-eyebrow">Meu acesso Clubber</p>
                <h2 id="club-qr-dialog-title">NFC e QR Code</h2>
              </div>

              <button
                type="button"
                className="club-qr-close"
                onClick={() => setIsQrOpen(false)}
                aria-label="Fechar QR Code"
              >
                ×
              </button>
            </div>

            <div className="club-qr-content">
              <div className="club-qr-image-wrap">
                <img src={qrPath} alt={`QR Code do perfil ${profileName}`} />
              </div>

              <div className="club-qr-copy">
                <p>
                  Aponte a câmera do celular para abrir o Perfil Clubber ou use o
                  compartilhamento pelo smartphone.
                </p>

                <div className="club-qr-dialog-actions">
                  <a
                    href={publicPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="club-primary-button"
                  >
                    Abrir perfil público
                  </a>

                  <button
                    type="button"
                    className="club-secondary-link club-secondary-button"
                    onClick={handleShare}
                  >
                    Compartilhar perfil
                  </button>
                </div>

                {feedback ? (
                  <p className="club-action-feedback" role="status" aria-live="polite">
                    {feedback}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
