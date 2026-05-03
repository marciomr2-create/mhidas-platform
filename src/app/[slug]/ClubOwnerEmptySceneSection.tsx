"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import ClubOwnerEmptyBlock from "./ClubOwnerEmptyBlock";

type ClubOwnerEmptySceneSectionProps = {
  cardId: string;
  ownerUserId: string;
  cityBase?: string;
};

export default function ClubOwnerEmptySceneSection({
  cardId,
  ownerUserId,
  cityBase = "",
}: ClubOwnerEmptySceneSectionProps) {
  const [checked, setChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

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
        if (mounted) {
          setChecked(true);
        }
      }
    }

    checkOwner();

    return () => {
      mounted = false;
    };
  }, [ownerUserId]);

  if (!checked || !isOwner) {
    return null;
  }

  return (
    <section
      className="uc-section"
      style={{
        background: "rgba(255,255,255,0.045)",
        borderRadius: 28,
        padding: 22,
        marginTop: 20,
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
      }}
    >
      <h2
        style={{
          margin: "0 0 8px 0",
          fontSize: 21,
          fontWeight: 900,
          letterSpacing: -0.35,
          color: "#fff",
        }}
      >
        Cena, clubes e eventos
      </h2>

      <p
        style={{
          margin: "0 0 16px 0",
          opacity: 0.72,
          lineHeight: 1.55,
          fontSize: 14,
          color: "#fff",
        }}
      >
        Comece adicionando clubes, festas e eventos para dar vida ao seu Club.
      </p>

      <ClubOwnerEmptyBlock
        cardId={cardId}
        ownerUserId={ownerUserId}
        title="Clubes favoritos"
        description="Adicione os clubs que representam sua presença na cena."
        kind="token"
        field="favorite_clubs"
        type="club"
        label="Adicionar club"
        modalTitle="Adicionar club favorito"
        placeholder="Ex: Surreal Park, Warung, Green Valley"
        cityBase={cityBase}
      />

      <ClubOwnerEmptyBlock
        cardId={cardId}
        ownerUserId={ownerUserId}
        title="Festivais e festas"
        description="Adicione festivais, festas e experiências que fazem parte da sua identidade."
        kind="token"
        field="favorite_events"
        type="festival"
        label="Adicionar festival"
        modalTitle="Adicionar festival ou festa"
        placeholder="Ex: Só Track Boa, X-Future, Warung Day Festival"
        cityBase={cityBase}
      />

      <ClubOwnerEmptyBlock
        cardId={cardId}
        ownerUserId={ownerUserId}
        title="Últimos eventos"
        description="Mostre eventos recentes que você viveu."
        kind="token"
        field="last_events"
        type="event"
        label="Adicionar último"
        modalTitle="Adicionar último evento frequentado"
        placeholder="Ex: Time Warp, Ame Laroc Festival"
        cityBase={cityBase}
      />

      <ClubOwnerEmptyBlock
        cardId={cardId}
        ownerUserId={ownerUserId}
        title="Próximos eventos"
        description="Adicione seu próximo rolê com data e link oficial, se tiver."
        kind="token"
        field="next_events"
        type="event"
        label="Adicionar próximo"
        modalTitle="Adicionar próximo evento"
        placeholder="Ex: Time Warp, Tomorrowland Brasil"
        cityBase={cityBase}
        allowNextEventDetails
      />
    </section>
  );
}
