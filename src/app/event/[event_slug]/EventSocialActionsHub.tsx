"use client";

import { useState } from "react";
import EventPresenceStatusHub from "./EventPresenceStatusHub";
import EventReunionHub from "./EventReunionHub";
import EventTribeHub from "./EventTribeHub";
import StructuredRideMeetHub from "./StructuredRideMeetHub";

type EventSocialActionsHubProps = {
  eventGroupId: string;
  eventReturnTo: string;
  isAuthenticated: boolean;
  canonicalEventId?: string | null;
};

type ActiveView =
  | "presence"
  | "reunion"
  | "groups"
  | "rides"
  | "meetups"
  | null;

const actionStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 72,
  display: "grid",
  alignContent: "center",
  gap: 4,
  padding: "14px 16px",
  border:
    "1px solid var(--mhidas-border-strong)",
  borderRadius:
    "var(--mhidas-radius-md)",
  background:
    "var(--mhidas-card-secondary)",
  color:
    "var(--mhidas-text-primary)",
  textAlign: "left",
  cursor: "pointer",
};

export default function EventSocialActionsHub({
  eventGroupId,
  eventReturnTo,
  isAuthenticated,
  canonicalEventId = null,
}: EventSocialActionsHubProps) {
  const [
    activeView,
    setActiveView,
  ] = useState<ActiveView>(null);

  function toggleView(
    view: Exclude<
      ActiveView,
      null
    >
  ) {
    setActiveView((current) =>
      current === view
        ? null
        : view
    );
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
          border:
            "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          background: "#0E0E0E",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 5,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              color: "var(--mhidas-mode-action, var(--mhidas-clubber-action))",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing:
                "0.12em",
              textTransform:
                "uppercase",
            }}
          >
            Organize com outros Clubbers
          </span>

          <h2
            id="event-social-actions-title"
            style={{
              margin: 0,
              color: "#F8FAFC",
              fontSize:
                "clamp(22px, 3vw, 30px)",
              lineHeight: 1.05,
            }}
          >
            Escolha o que você quer fazer
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
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <button className="uc-ui-interactive"
            type="button"
            aria-pressed={
              activeView ===
              "presence"
            }
            onClick={() =>
              toggleView(
                "presence"
              )
            }
            style={actionStyle}
          >
            <strong
              style={{
                fontSize: 16,
              }}
            >
              Agora
            </strong>

            <span
              style={{
                color:
                  "#CBD5E1",
                fontSize: 12,
              }}
            >
              Status, ponto e segurança
            </span>
          </button>

          <button className="uc-ui-interactive"
            type="button"
            aria-pressed={
              activeView ===
              "reunion"
            }
            onClick={() =>
              toggleView(
                "reunion"
              )
            }
            style={actionStyle}
          >
            <strong
              style={{
                fontSize: 16,
              }}
            >
              ME PERDI!
            </strong>

            <span
              style={{
                color:
                  "#CBD5E1",
                fontSize: 12,
              }}
            >
              Encontre uma pessoa ou sua turma
            </span>
          </button>
          <button className="uc-ui-interactive"
            type="button"
            aria-pressed={
              activeView ===
              "groups"
            }
            onClick={() =>
              toggleView("groups")
            }
            style={actionStyle}
          >
            <strong
              style={{
                fontSize: 16,
              }}
            >
              Grupos
            </strong>

            <span
              style={{
                color:
                  "#CBD5E1",
                fontSize: 12,
              }}
            >
              Encontre ou crie um grupo
            </span>
          </button>

          <button className="uc-ui-interactive"
            type="button"
            aria-pressed={
              activeView ===
              "rides"
            }
            onClick={() =>
              toggleView("rides")
            }
            style={actionStyle}
          >
            <strong
              style={{
                fontSize: 16,
              }}
            >
              Caronas
            </strong>

            <span
              style={{
                color:
                  "#CBD5E1",
                fontSize: 12,
              }}
            >
              Ofereça ou procure uma carona
            </span>
          </button>

          <button className="uc-ui-interactive"
            type="button"
            aria-pressed={
              activeView ===
              "meetups"
            }
            onClick={() =>
              toggleView(
                "meetups"
              )
            }
            style={actionStyle}
          >
            <strong
              style={{
                fontSize: 16,
              }}
            >
              Encontros
            </strong>

            <span
              style={{
                color:
                  "#CBD5E1",
                fontSize: 12,
              }}
            >
              Combine um ponto de encontro
            </span>
          </button>
        </div>

        {activeView ? (
          <div
            style={{
              marginTop: 14,
              borderTop:
                "1px solid rgba(255,255,255,0.08)",
              paddingTop: 14,
            }}
          >
            {activeView ===
            "reunion" ? (
              <EventReunionHub
                eventGroupId={
                  eventGroupId
                }
                eventReturnTo={
                  eventReturnTo
                }
                isAuthenticated={
                  isAuthenticated
                }
              />
            ) : null}
            {activeView ===
            "presence" ? (
              <EventPresenceStatusHub
                eventGroupId={
                  eventGroupId
                }
                eventReturnTo={
                  eventReturnTo
                }
                isAuthenticated={
                  isAuthenticated
                }
                canonicalEventId={
                  canonicalEventId
                }
              />
            ) : null}

            {activeView ===
            "groups" ? (
              <EventTribeHub
                eventGroupId={
                  eventGroupId
                }
                eventReturnTo={
                  eventReturnTo
                }
                isAuthenticated={
                  isAuthenticated
                }
              />
            ) : null}

            {activeView ===
            "rides" ? (
              <StructuredRideMeetHub
                key="rides"
                eventGroupId={
                  eventGroupId
                }
                eventReturnTo={
                  eventReturnTo
                }
                isAuthenticated={
                  isAuthenticated
                }
                initialPanel="rides"
                focusedPanel="rides"
              />
            ) : null}

            {activeView ===
            "meetups" ? (
              <StructuredRideMeetHub
                key="meetups"
                eventGroupId={
                  eventGroupId
                }
                eventReturnTo={
                  eventReturnTo
                }
                isAuthenticated={
                  isAuthenticated
                }
                canonicalEventId={
                  canonicalEventId
                }
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