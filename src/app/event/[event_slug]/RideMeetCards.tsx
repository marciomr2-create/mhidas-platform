// src/app/event/[event_slug]/RideMeetCards.tsx
import type { CSSProperties } from "react";
import Link from "next/link";

export type RideMeetEventMember = {
  user_id: string;
  slug: string;
  label: string;
  city_base?: string | null;
  club_photo_url?: string | null;

  ride_status?: string | null;
  ride_seats?: string | number | null;
  ride_event_name?: string | null;
  ride_origin?: string | null;
  ride_destination?: string | null;
  ride_notes?: string | null;
  ride_event_url?: string | null;

  meet_status?: string | null;
  meet_event_name?: string | null;
  meet_meeting_point?: string | null;
  meet_time?: string | null;
  meet_notes?: string | null;
  meet_event_url?: string | null;
};

type RideMeetCardsProps = {
  rideMembers: RideMeetEventMember[];
  meetMembers: RideMeetEventMember[];
  officialEventUrl?: string;
};

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasContent(value: unknown): boolean {
  return normalizeText(value).length > 0;
}

function getInitials(name: string): string {
  const initials = normalizeText(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "CL";
}

function getRideStatusLabel(value?: string | null): string {
  const normalized = normalizeText(value);

  if (normalized === "offer") return "Oferecendo carona";
  if (normalized === "need") return "Procurando carona";
  if (normalized === "both") return "Dispon\u00edvel para carona compartilhada";

  return "Carona compartilhada";
}

function getMeetStatusLabel(value?: string | null): string {
  const normalized = normalizeText(value);

  if (normalized === "host") return "Abrindo ponto de encontro";
  if (normalized === "join") return "Ponto de encontro ativo";
  if (normalized === "both") return "Pode abrir ou entrar";

  return "Encontro ativo";
}

function sectionStyle(kind: "ride" | "meet"): CSSProperties {
  const isRide = kind === "ride";

  return {
    display: "grid",
    gap: 12,
    padding: 14,
    borderRadius: 24,
    border: isRide
      ? "1px solid rgba(0,255,190,0.22)"
      : "1px solid rgba(255,196,0,0.22)",
    background: isRide
      ? "linear-gradient(180deg, rgba(0,255,190,0.055), rgba(255,255,255,0.025))"
      : "linear-gradient(180deg, rgba(255,196,0,0.055), rgba(255,255,255,0.025))",
    boxShadow: isRide
      ? "0 18px 46px rgba(0,255,190,0.06)"
      : "0 18px 46px rgba(255,196,0,0.06)",
  };
}

function sectionHeaderStyle(): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 12,
    alignItems: "start",
  };
}

function sectionTitleStyle(): CSSProperties {
  return {
    margin: 0,
    color: "#fff",
    fontSize: 20,
    lineHeight: 1.12,
    fontWeight: 950,
  };
}

function sectionSubtitleStyle(): CSSProperties {
  return {
    margin: 0,
    color: "rgba(255,255,255,0.70)",
    fontSize: 12,
    lineHeight: 1.45,
  };
}

function wideCardStyle(): CSSProperties {
  return {
    minWidth: 282,
    maxWidth: 282,
    flex: "0 0 282px",
    overflow: "hidden",
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(180deg, rgba(28,28,34,0.94), rgba(13,13,18,0.98))",
    boxShadow: "0 16px 40px rgba(0,0,0,0.30)",
    scrollSnapAlign: "start",
  };
}

function carouselStyle(): CSSProperties {
  return {
    display: "flex",
    gap: 12,
    overflowX: "auto",
    overflowY: "hidden",
    paddingBottom: 6,
    scrollSnapType: "x mandatory",
  };
}

function avatarStyle(kind: "ride" | "meet"): CSSProperties {
  const isRide = kind === "ride";

  return {
    width: 68,
    height: 68,
    minWidth: 68,
    borderRadius: 999,
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: isRide
      ? "1px solid rgba(0,255,190,0.22)"
      : "1px solid rgba(255,196,0,0.24)",
    background: isRide
      ? "linear-gradient(135deg, rgba(0,255,190,0.16), rgba(125,92,255,0.18))"
      : "linear-gradient(135deg, rgba(255,196,0,0.18), rgba(125,92,255,0.18))",
    boxShadow: isRide
      ? "0 0 22px rgba(0,255,190,0.10)"
      : "0 0 22px rgba(255,196,0,0.10)",
  };
}

function detailGridStyle(): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  };
}

function detailBoxStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 4,
    padding: 10,
    borderRadius: 15,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.035)",
    minHeight: 66,
  };
}

function actionButtonStyle(primary = false): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "11px 12px",
    borderRadius: 13,
    border: primary
      ? "1px solid rgba(255,255,255,0.20)"
      : "1px solid rgba(255,255,255,0.14)",
    background: primary
      ? "linear-gradient(135deg, rgba(125,34,255,1), rgba(125,92,255,0.72))"
      : "rgba(255,255,255,0.075)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 12,
    width: "100%",
  };
}

function emptyCardStyle(): CSSProperties {
  return {
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.035)",
    color: "rgba(255,255,255,0.76)",
    fontSize: 13,
    lineHeight: 1.6,
  };
}

function ProfileAvatar({
  member,
  kind,
}: {
  member: RideMeetEventMember;
  kind: "ride" | "meet";
}) {
  const photo = normalizeText(member.club_photo_url);

  return (
    <div style={avatarStyle(kind)}>
      {photo ? (
        <img
          src={photo}
          alt={member.label}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <span
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: 950,
            letterSpacing: 0.4,
          }}
        >
          {getInitials(member.label)}
        </span>
      )}
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: unknown }) {
  if (!hasContent(value)) return null;

  return (
    <div style={detailBoxStyle()}>
      <span
        style={{
          color: "rgba(255,255,255,0.52)",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color: "#fff",
          fontSize: 12,
          lineHeight: 1.25,
        }}
      >
        {String(value)}
      </strong>
    </div>
  );
}

function NotesBox({ value }: { value: unknown }) {
  if (!hasContent(value)) return null;

  return (
    <div
      style={{
        padding: 11,
        borderRadius: 15,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.18)",
        color: "rgba(255,255,255,0.74)",
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: "rgba(255,255,255,0.88)" }}>
        {"Observa\u00e7\u00f5es:"}
      </strong>{" "}
      {String(value)}
    </div>
  );
}

function RideCard({
  member,
  officialEventUrl,
}: {
  member: RideMeetEventMember;
  officialEventUrl?: string;
}) {
  const rideLabel = getRideStatusLabel(member.ride_status);
  const seatsLabel = hasContent(member.ride_seats)
    ? String(member.ride_seats) + " vagas"
    : "";

  return (
    <article style={wideCardStyle()}>
      <div style={{ padding: 15, display: "grid", gap: 13 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 12,
            alignItems: "center",
          }}
        >
          <ProfileAvatar member={member} kind="ride" />

          <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
            <strong style={{ fontSize: 19, lineHeight: 1.12 }}>
              {member.label}
            </strong>

            {hasContent(member.city_base) ? (
              <span
                style={{
                  color: "rgba(255,255,255,0.70)",
                  fontSize: 12,
                  lineHeight: 1.35,
                  fontWeight: 750,
                }}
              >
                {member.city_base}
              </span>
            ) : null}

            <span
              style={{
                color: "rgba(0,255,190,0.92)",
                fontSize: 11,
                lineHeight: 1.35,
                fontWeight: 850,
              }}
            >
              {[rideLabel, seatsLabel].filter(Boolean).join(" - ")}
            </span>
          </div>
        </div>

        <div style={detailGridStyle()}>
          <DetailBox label="Evento" value={member.ride_event_name} />
          <DetailBox label="Origem" value={member.ride_origin} />
          <DetailBox label="Destino" value={member.ride_destination} />
        </div>

        <NotesBox value={member.ride_notes} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Link href={`/${member.slug}?mode=club`} style={actionButtonStyle(true)}>
            Ver perfil Club
          </Link>

          <a
            href={
              member.ride_event_url ||
              officialEventUrl ||
              `/${member.slug}?mode=club`
            }
            target={member.ride_event_url || officialEventUrl ? "_blank" : undefined}
            rel={
              member.ride_event_url || officialEventUrl
                ? "noopener noreferrer"
                : undefined
            }
            style={actionButtonStyle()}
          >
            Evento oficial
          </a>
        </div>
      </div>
    </article>
  );
}

function MeetCard({
  member,
  officialEventUrl,
}: {
  member: RideMeetEventMember;
  officialEventUrl?: string;
}) {
  const meetLabel = getMeetStatusLabel(member.meet_status);

  return (
    <article style={wideCardStyle()}>
      <div style={{ padding: 15, display: "grid", gap: 13 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 12,
            alignItems: "center",
          }}
        >
          <ProfileAvatar member={member} kind="meet" />

          <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
            <strong style={{ fontSize: 19, lineHeight: 1.12 }}>
              {member.label}
            </strong>

            {hasContent(member.city_base) ? (
              <span
                style={{
                  color: "rgba(255,255,255,0.70)",
                  fontSize: 12,
                  lineHeight: 1.35,
                  fontWeight: 750,
                }}
              >
                {member.city_base}
              </span>
            ) : null}

            <span
              style={{
                color: "rgba(255,196,0,0.92)",
                fontSize: 11,
                lineHeight: 1.35,
                fontWeight: 850,
              }}
            >
              {meetLabel}
            </span>
          </div>
        </div>

        <div style={detailGridStyle()}>
          <DetailBox label="Evento" value={member.meet_event_name} />
          <DetailBox label="Ponto" value={member.meet_meeting_point} />
          <DetailBox label={"Hor\u00e1rio"} value={member.meet_time} />
        </div>

        <NotesBox value={member.meet_notes} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Link href={`/${member.slug}?mode=club`} style={actionButtonStyle(true)}>
            Ver perfil Club
          </Link>

          <a
            href={
              member.meet_event_url ||
              officialEventUrl ||
              `/${member.slug}?mode=club`
            }
            target={member.meet_event_url || officialEventUrl ? "_blank" : undefined}
            rel={
              member.meet_event_url || officialEventUrl
                ? "noopener noreferrer"
                : undefined
            }
            style={actionButtonStyle()}
          >
            Evento oficial
          </a>
        </div>
      </div>
    </article>
  );
}

export default function RideMeetCards({
  rideMembers,
  meetMembers,
  officialEventUrl,
}: RideMeetCardsProps) {
  return (
    <>
      <section style={sectionStyle("ride")}>
        <div style={sectionHeaderStyle()}>
          <div style={{ display: "grid", gap: 4 }}>
            <h2 style={sectionTitleStyle()}>Carona compartilhada</h2>
            <p style={sectionSubtitleStyle()}>
              Quem oferece e quem procura carona para este evento.
            </p>
          </div>

          <span
            style={{
              ...actionButtonStyle(false),
              width: "auto",
              minHeight: 34,
              padding: "8px 11px",
            }}
          >
            Ver todas
          </span>
        </div>

        {rideMembers.length === 0 ? (
          <div style={emptyCardStyle()}>
            {"Ainda n\u00e3o h\u00e1 caronas mapeadas para este evento."}
          </div>
        ) : (
          <div style={carouselStyle()}>
            {rideMembers.map((member) => (
              <RideCard
                key={`ride-card-${member.user_id}-${member.slug}`}
                member={member}
                officialEventUrl={officialEventUrl}
              />
            ))}
          </div>
        )}
      </section>

      <section style={sectionStyle("meet")}>
        <div style={sectionHeaderStyle()}>
          <div style={{ display: "grid", gap: 4 }}>
            <h2 style={sectionTitleStyle()}>Encontros combinados</h2>
            <p style={sectionSubtitleStyle()}>
              {"Pontos de encontro e hor\u00e1rios que j\u00e1 foram marcados para este evento."}
            </p>
          </div>
        </div>

        {meetMembers.length === 0 ? (
          <div style={emptyCardStyle()}>
            {"Ainda n\u00e3o h\u00e1 encontros ativos mapeados para este evento."}
          </div>
        ) : (
          <div style={carouselStyle()}>
            {meetMembers.map((member) => (
              <MeetCard
                key={`meet-card-${member.user_id}-${member.slug}`}
                member={member}
                officialEventUrl={officialEventUrl}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}