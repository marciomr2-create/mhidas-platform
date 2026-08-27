"use client";

import { useState } from "react";
import EventTribeHub from "./EventTribeHub";
import StructuredRideMeetHub from "./StructuredRideMeetHub";

type EventSocialActionsHubProps = {
  eventGroupId: string;
  eventReturnTo: string;
  isAuthenticated: boolean;
};

type ActiveView = "groups" | "rides" | "meetups" | null;

const actionStyle = (active: boolean): React.CSSProperties => ({
  width: "100%",
  minHeight: 72,
  display: "grid",
  alignContent: "center",
  gap: 4,
  padding: "14px 16px",
  border: active
    ? "1px solid rgba(42,134,148,0.72)"
    : "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12,
  background: active ? "rgba(42,134,148,0.14)" : "#111111",
  color: "#F8FAFC",
  textAlign: "left",
  cursor: "pointer",
});

export default function EventSocialActionsHub({
  eventGroupId,
  eventReturnTo,
  isAuthenticated,
}: EventSocialActionsHubProps) {
  const [activeView, setActiveView] = useState<ActiveView>(null);

  function toggleView(view: Exclude<ActiveView, null>) {
    setActiveView((current) => (current === view ? null : view));
  }

  return (
    <>
      <style>{`
        .event-social-actions-hub {
          width: min(1120px, calc(100vw - 48px));
          max-width: none;
          box-sizing: border-box;
          margin-left: 50%;
          transform: translateX(-50%);
        }

        @media (max-width: 760px) {
          .event-social-actions-hub {
            width: 100%;
            min-width: 0;
            max-width: 100%;
            margin-left: 0;
            margin-right: 0;
            transform: none;
          }
        }
      `}</style>

      <section
        className="event-social-actions-hub"
        aria-labelledby="event-social-actions-title"
        style={{
          marginTop: 16,
          padding: 20,
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          background: "#0E0E0E",
        }}
      >
      <div style={{ display: "grid", gap: 5, marginBottom: 14 }}>
        <span
          style={{
            color: "#2A8694",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Organize com outros Clubbers
        </span>

        <h2
          id="event-social-actions-title"
          style={{
            margin: 0,
            color: "#F8FAFC",
            fontSize: "clamp(22px, 3vw, 30px)",
            lineHeight: 1.05,
          }}
        >
          Escolha o que você quer organizar
        </h2>

        <p
          style={{
            margin: 0,
            color: "#CBD5E1",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Abra somente a função que você precisa agora.
        </p>
      </div>

      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        <button
          type="button"
          aria-pressed={activeView === "groups"}
          onClick={() => toggleView("groups")}
          style={actionStyle(activeView === "groups")}
        >
          <strong style={{ fontSize: 16 }}>Grupos</strong>
          <span style={{ color: "#CBD5E1", fontSize: 12 }}>
            Encontre ou crie um grupo
          </span>
        </button>

        <button
          type="button"
          aria-pressed={activeView === "rides"}
          onClick={() => toggleView("rides")}
          style={actionStyle(activeView === "rides")}
        >
          <strong style={{ fontSize: 16 }}>Caronas</strong>
          <span style={{ color: "#CBD5E1", fontSize: 12 }}>
            Ofereça ou procure uma carona
          </span>
        </button>

        <button
          type="button"
          aria-pressed={activeView === "meetups"}
          onClick={() => toggleView("meetups")}
          style={actionStyle(activeView === "meetups")}
        >
          <strong style={{ fontSize: 16 }}>Encontros</strong>
          <span style={{ color: "#CBD5E1", fontSize: 12 }}>
            Combine um ponto de encontro
          </span>
        </button>
      </div>

      {activeView ? (
        <div
          style={{
            marginTop: 14,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 14,
          }}
        >
          {activeView === "groups" ? (
            <EventTribeHub
              eventGroupId={eventGroupId}
              eventReturnTo={eventReturnTo}
              isAuthenticated={isAuthenticated}
            />
          ) : null}

          {activeView === "rides" ? (
            <StructuredRideMeetHub
              key="rides"
              eventGroupId={eventGroupId}
              eventReturnTo={eventReturnTo}
              isAuthenticated={isAuthenticated}
              initialPanel="rides"
              focusedPanel="rides"
            />
          ) : null}

          {activeView === "meetups" ? (
            <StructuredRideMeetHub
              key="meetups"
              eventGroupId={eventGroupId}
              eventReturnTo={eventReturnTo}
              isAuthenticated={isAuthenticated}
              initialPanel="meetups"
              focusedPanel="meetups"
            />
          ) : null}
        </div>
      ) : null}
      </section>
    </>
  );
}