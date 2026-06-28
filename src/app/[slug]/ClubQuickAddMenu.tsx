"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import AddClubArtistButton from "./AddClubArtistButton";
import AddClubTokenButton from "./AddClubTokenButton";

type QuickAction =
  | "artist"
  | "favorite_club"
  | "favorite_event"
  | "next_event"
  | "last_event";

type ClubQuickAddMenuProps = {
  cardId: string;
  ownerUserId: string;
  cityBase?: string;
};

type ActionRowProps = {
  title: string;
  description: string;
  onClick: () => void;
  isLast?: boolean;
};

function ActionRow({
  title,
  description,
  onClick,
  isLast = false,
}: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        minHeight: 66,
        padding: "14px 2px",
        border: 0,
        borderBottom: isLast
          ? "none"
          : "1px solid rgba(255,255,255,0.09)",
        background: "transparent",
        color: "#fff",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <span style={{ minWidth: 0 }}>
        <strong
          style={{
            display: "block",
            fontSize: 15,
            lineHeight: 1.25,
            fontWeight: 860,
            letterSpacing: -0.1,
          }}
        >
          {title}
        </strong>

        <span
          style={{
            display: "block",
            marginTop: 5,
            fontSize: 12,
            lineHeight: 1.4,
            color: "rgba(255,255,255,0.58)",
          }}
        >
          {description}
        </span>
      </span>

      <span
        aria-hidden="true"
        style={{
          fontSize: 22,
          lineHeight: 1,
          fontWeight: 500,
          color: "rgba(255,255,255,0.62)",
        }}
      >
        ›
      </span>
    </button>
  );
}

export default function ClubQuickAddMenu({
  cardId,
  ownerUserId,
  cityBase = "",
}: ClubQuickAddMenuProps) {
  const [checked, setChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<QuickAction | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkOwner() {
      try {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        setIsOwner(Boolean(user?.id && ownerUserId && user.id === ownerUserId));
      } catch {
        if (!mounted) return;
        setIsOwner(false);
      } finally {
        if (mounted) setChecked(true);
      }
    }

    checkOwner();

    return () => {
      mounted = false;
    };
  }, [ownerUserId]);

  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function openAction(action: QuickAction) {
    setMenuOpen(false);
    setActiveAction(action);
  }

  function handleActionOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setActiveAction(null);
    }
  }

  if (!checked || !isOwner) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Adicionar ao seu Clubber"
        title="Adicionar ao seu Clubber"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(true)}
        style={{
          appearance: "none",
          border: 0,
          background: "transparent",
          color: "#fff",
          padding: "0 5px",
          minWidth: 34,
          minHeight: 42,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 38,
          fontWeight: 300,
          lineHeight: 1,
          cursor: "pointer",
          textShadow: "0 0 20px rgba(0,255,190,0.25)",
        }}
      >
        +
      </button>

      {menuOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Adicionar ao seu Clubber"
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9400,
            boxSizing: "border-box",
            padding:
              "max(18px, env(safe-area-inset-top)) 14px max(18px, env(safe-area-inset-bottom))",
            background: "rgba(0,0,0,0.74)",
            backdropFilter: "blur(10px)",
            display: "grid",
            placeItems: "center",
            overflowY: "auto",
            overscrollBehavior: "contain",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              maxHeight: "min(720px, calc(100dvh - 36px))",
              boxSizing: "border-box",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              borderRadius: 28,
              background:
                "linear-gradient(180deg, rgba(25,25,37,0.99), rgba(8,8,15,0.99))",
              border: "1px solid rgba(255,255,255,0.13)",
              boxShadow: "0 28px 90px rgba(0,0,0,0.62)",
              padding: "18px 18px 26px",
              color: "#fff",
              margin: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                paddingBottom: 13,
              }}
            >
              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: 20,
                    lineHeight: 1.18,
                    letterSpacing: -0.4,
                  }}
                >
                  Adicionar ao seu Clubber
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 6,
                    fontSize: 13,
                    lineHeight: 1.4,
                    color: "rgba(255,255,255,0.58)",
                  }}
                >
                  Escolha o que deseja incluir no perfil.
                </span>
              </div>

              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setMenuOpen(false)}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#fff",
                  padding: 0,
                  minWidth: 34,
                  minHeight: 34,
                  fontSize: 30,
                  fontWeight: 300,
                  lineHeight: 1,
                  cursor: "pointer",
                  opacity: 0.78,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 1.25,
                color: "rgba(0,255,190,0.72)",
              }}
            >
              MÚSICA
            </div>

            <ActionRow
              title="Artista de referência"
              description="Inclua um artista no seu ranking musical."
              onClick={() => openAction("artist")}
              isLast
            />

            <div
              style={{
                marginTop: 16,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 1.25,
                color: "rgba(125,92,255,0.82)",
              }}
            >
              CENA
            </div>

            <ActionRow
              title="Club favorito"
              description="Adicione um club que representa sua presença na cena."
              onClick={() => openAction("favorite_club")}
            />

            <ActionRow
              title="Festival ou festa"
              description="Inclua experiências e eventos que fazem parte da sua identidade."
              onClick={() => openAction("favorite_event")}
              isLast
            />

            <div
              style={{
                marginTop: 16,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 1.25,
                color: "rgba(0,220,255,0.78)",
              }}
            >
              AGENDA
            </div>

            <ActionRow
              title="Próximo evento"
              description="Registre seu próximo rolê com data e link oficial."
              onClick={() => openAction("next_event")}
            />

            <ActionRow
              title="Último evento"
              description="Adicione uma experiência recente ao seu histórico."
              onClick={() => openAction("last_event")}
              isLast
            />
          </div>
        </div>
      ) : null}

      <AddClubArtistButton
        cardId={cardId}
        ownerUserId={ownerUserId}
        hideTrigger
        open={activeAction === "artist"}
        onOpenChange={handleActionOpenChange}
      />

      <AddClubTokenButton
        cardId={cardId}
        ownerUserId={ownerUserId}
        field="favorite_clubs"
        type="club"
        label="Club favorito"
        title="Adicionar club favorito"
        placeholder="Ex: Surreal Park, Warung, Green Valley"
        cityBase={cityBase}
        hideTrigger
        open={activeAction === "favorite_club"}
        onOpenChange={handleActionOpenChange}
      />

      <AddClubTokenButton
        cardId={cardId}
        ownerUserId={ownerUserId}
        field="favorite_events"
        type="festival"
        label="Festival ou festa"
        title="Adicionar festival ou festa"
        placeholder="Ex: Só Track Boa, Time Warp, X-Future"
        cityBase={cityBase}
        hideTrigger
        open={activeAction === "favorite_event"}
        onOpenChange={handleActionOpenChange}
      />

      <AddClubTokenButton
        cardId={cardId}
        ownerUserId={ownerUserId}
        field="next_events"
        type="event"
        label="Próximo evento"
        title="Adicionar próximo evento"
        placeholder="Ex: Time Warp, Tomorrowland Brasil"
        cityBase={cityBase}
        allowNextEventDetails
        hideTrigger
        open={activeAction === "next_event"}
        onOpenChange={handleActionOpenChange}
      />

      <AddClubTokenButton
        cardId={cardId}
        ownerUserId={ownerUserId}
        field="last_events"
        type="event"
        label="Último evento"
        title="Adicionar último evento frequentado"
        placeholder="Ex: Ame Laroc Festival, Warung Day Festival"
        cityBase={cityBase}
        hideTrigger
        open={activeAction === "last_event"}
        onOpenChange={handleActionOpenChange}
      />
    </>
  );
}
