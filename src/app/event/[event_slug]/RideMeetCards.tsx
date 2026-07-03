// src/app/event/[event_slug]/RideMeetCards.tsx
"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
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
  meet_event_date?: string | null;
  meet_meeting_point?: string | null;
  meet_time?: string | null;
  meet_notes?: string | null;
  meet_event_url?: string | null;
};

type RideMeetCardsProps = {
  rideMembers: RideMeetEventMember[];
  meetMembers: RideMeetEventMember[];
  eventReturnTo: string;
  officialEventUrl?: string;
};

type ConnectionUiState =
  | "idle"
  | "checking"
  | "sending"
  | "outgoing_pending"
  | "incoming_pending"
  | "connected"
  | "unauthorized"
  | "blocked"
  | "suspended"
  | "self"
  | "error";

const EVENT_PALETTE = {
  surface: "rgba(12,12,20,0.94)",
  surfaceStrong: "rgba(18,18,29,0.92)",
  violet: "#7C5CFF",
  violetSoft: "rgba(124,92,255,0.16)",
  indigoBorder: "rgba(124,92,255,0.24)",
  teal: "#00F5C8",
  tealSoft: "rgba(0,245,200,0.12)",
  tealBorder: "rgba(0,245,200,0.28)",
  amber: "#FFBC58",
  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.15)",
  textMuted: "rgba(255,255,255,0.66)",
  textSoft: "rgba(255,255,255,0.80)",
};

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasContent(value: unknown): boolean {
  return normalizeText(value).length > 0;
}

function isSandboxMember(
  member: RideMeetEventMember,
): boolean {
  return (
    normalizeText(member.user_id).startsWith("TEST_SANDBOX_") ||
    normalizeText(member.slug).startsWith("sandbox-")
  );
}

function mapApiConnectionState(
  value: unknown,
): ConnectionUiState {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "self") return "self";
  if (normalized === "outgoing_pending") {
    return "outgoing_pending";
  }
  if (normalized === "incoming_pending") {
    return "incoming_pending";
  }
  if (normalized === "connected") return "connected";
  if (normalized === "blocked") return "blocked";
  if (normalized === "suspended") return "suspended";

  return "idle";
}

function getRideConnectionLabel(
  state: ConnectionUiState,
): string {
  if (state === "checking") return "Verificando conexão...";
  if (state === "sending") return "Enviando solicitação...";
  if (state === "outgoing_pending") {
    return "Solicitação enviada";
  }
  if (state === "incoming_pending") {
    return "Solicitação recebida";
  }
  if (state === "connected") {
    return "Conectados — combinar carona";
  }
  if (state === "unauthorized") {
    return "Entrar para conectar";
  }
  if (state === "blocked") return "Conexão bloqueada";
  if (state === "suspended") return "Conexão suspensa";
  if (state === "self") return "Sua carona";
  if (state === "error") return "Tentar novamente";

  return "Conectar para combinar";
}

function getRideConnectionFeedback(
  state: ConnectionUiState,
): string {
  if (state === "checking") {
    return "Consultando o relacionamento entre vocês.";
  }

  if (state === "sending") {
    return "Enviando a solicitação com segurança.";
  }

  if (state === "outgoing_pending") {
    return "Pedido enviado. O contato será liberado após o aceite.";
  }

  if (state === "incoming_pending") {
    return "Você recebeu uma solicitação desta pessoa. Revise em Conexões.";
  }

  if (state === "connected") {
    return "Conexão aprovada. Use o perfil Club para combinar os detalhes.";
  }

  if (state === "unauthorized") {
    return "Entre na sua conta para solicitar conexão.";
  }

  if (state === "blocked") {
    return "Não é possível conectar devido a um bloqueio.";
  }

  if (state === "suspended") {
    return "Esta conexão está suspensa no momento.";
  }

  if (state === "self") {
    return "Este anúncio de carona pertence ao seu perfil.";
  }

  if (state === "error") {
    return "Não foi possível concluir agora. Tente novamente.";
  }

  return "A conexão libera os caminhos sociais após o aceite.";
}

function isConnectionActionDisabled(
  state: ConnectionUiState,
): boolean {
  return [
    "checking",
    "sending",
    "outgoing_pending",
    "incoming_pending",
    "connected",
    "blocked",
    "suspended",
    "self",
  ].includes(state);
}

function getPublicClubberHref(
  member: RideMeetEventMember,
  eventReturnTo: string,
): string {
  const slug = normalizeText(member.slug).toLowerCase();
  const safeReturnTo = normalizeText(eventReturnTo);

  if (!slug || isSandboxMember(member)) {
    return "";
  }

  const search = new URLSearchParams({
    mode: "club",
    view: "public",
  });

  if (
    safeReturnTo.startsWith("/event/") &&
    !safeReturnTo.startsWith("//") &&
    !safeReturnTo.includes("\\")
  ) {
    search.set("return_to", safeReturnTo);
  }

  return `/${encodeURIComponent(slug)}?${search.toString()}`;
}

function getLoginHref(eventReturnTo: string): string {
  const safeReturnTo = normalizeText(eventReturnTo);

  if (
    safeReturnTo.startsWith("/event/") &&
    !safeReturnTo.startsWith("//") &&
    !safeReturnTo.includes("\\")
  ) {
    return `/login?return_to=${encodeURIComponent(
      safeReturnTo,
    )}`;
  }

  return "/login";
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

function formatMeetDate(value: unknown): string {
  const normalized = normalizeText(value);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) {
    return normalized;
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function getMeetConnectionLabel(
  state: ConnectionUiState,
): string {
  if (state === "checking") return "Verificando conexão...";
  if (state === "sending") return "Enviando solicitação...";
  if (state === "outgoing_pending") {
    return "Solicitação enviada";
  }
  if (state === "incoming_pending") {
    return "Solicitação recebida";
  }
  if (state === "connected") {
    return "Conectados — combinar encontro";
  }
  if (state === "unauthorized") {
    return "Entrar para conectar";
  }
  if (state === "blocked") return "Conexão bloqueada";
  if (state === "suspended") return "Conexão suspensa";
  if (state === "self") return "Seu encontro";
  if (state === "error") return "Tentar novamente";

  return "Conectar para combinar encontro";
}

function getMeetConnectionFeedback(
  state: ConnectionUiState,
): string {
  if (state === "checking") {
    return "Consultando o relacionamento entre vocês.";
  }

  if (state === "sending") {
    return "Enviando a solicitação com segurança.";
  }

  if (state === "outgoing_pending") {
    return "Pedido enviado. O contato será liberado após o aceite.";
  }

  if (state === "incoming_pending") {
    return "Você recebeu uma solicitação desta pessoa. Revise em Conexões.";
  }

  if (state === "connected") {
    return "Conexão aprovada. Use o perfil Club para combinar ponto e horário.";
  }

  if (state === "unauthorized") {
    return "Entre na sua conta para solicitar conexão.";
  }

  if (state === "blocked") {
    return "Não é possível conectar devido a um bloqueio.";
  }

  if (state === "suspended") {
    return "Esta conexão está suspensa no momento.";
  }

  if (state === "self") {
    return "Este encontro pertence ao seu perfil.";
  }

  if (state === "error") {
    return "Não foi possível concluir agora. Tente novamente.";
  }

  return "A conexão libera os caminhos sociais após o aceite.";
}

function sectionStyle(kind: "ride" | "meet"): CSSProperties {
  const isRide = kind === "ride";

  return {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    display: "grid",
    gap: isRide ? 18 : 14,
    padding: "clamp(18px, 2.4vw, 26px)",
    borderRadius: 24,
    border: `1px solid ${
      isRide
        ? EVENT_PALETTE.indigoBorder
        : EVENT_PALETTE.border
    }`,
    background:
      "linear-gradient(145deg, rgba(15,15,24,0.96), rgba(7,8,13,0.99))",
    boxShadow: "0 18px 46px rgba(0,0,0,0.24)",
    overflow: "hidden",
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

function meetCardStyle(): CSSProperties {
  return {
    minWidth: "100%",
    maxWidth: "100%",
    flex: "0 0 100%",
    display: "grid",
    padding: 0,
    scrollSnapAlign: "start",
    boxSizing: "border-box",
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

function rideCardStyle(): CSSProperties {
  return {
    minWidth: "100%",
    maxWidth: "100%",
    flex: "0 0 100%",
    display: "grid",
    padding: 0,
    scrollSnapAlign: "start",
    boxSizing: "border-box",
  };
}

function rideDetailsStyle(): CSSProperties {
  return {
    display: "grid",
    minWidth: 0,
  };
}

function rideDetailRowStyle(last = false): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "74px minmax(0, 1fr)",
    gap: 12,
    alignItems: "start",
    padding: "10px 0",
    borderBottom: last
      ? "none"
      : "1px solid rgba(255,255,255,0.065)",
  };
}

function meetDetailsStyle(): CSSProperties {
  return {
    display: "grid",
    minWidth: 0,
  };
}

function meetDetailRowStyle(last = false): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "74px minmax(0, 1fr)",
    gap: 12,
    alignItems: "start",
    padding: "10px 0",
    borderBottom: last
      ? "none"
      : "1px solid rgba(255,255,255,0.065)",
  };
}

function rideProfileActionStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    minHeight: 28,
    padding: "2px 0",
    borderBottom: "1px solid rgba(124,92,255,0.42)",
    color: EVENT_PALETTE.violet,
    textDecoration: "none",
    fontWeight: 850,
    fontSize: 12,
  };
}

function rideConnectionButtonStyle(
  state: ConnectionUiState,
): CSSProperties {
  const completed =
    state === "outgoing_pending" ||
    state === "connected";
  const error = state === "error";

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 44,
    padding: "11px 14px",
    borderRadius: 14,
    border: error
      ? "1px solid rgba(255,85,118,0.42)"
      : completed
        ? `1px solid ${EVENT_PALETTE.tealBorder}`
        : `1px solid ${EVENT_PALETTE.indigoBorder}`,
    background: error
      ? "linear-gradient(135deg, rgba(255,85,118,0.15), rgba(255,255,255,0.04))"
      : completed
        ? "linear-gradient(135deg, rgba(0,245,200,0.14), rgba(124,92,255,0.14))"
        : "linear-gradient(135deg, rgba(47,128,255,0.15), rgba(124,92,255,0.18))",
    color: completed ? EVENT_PALETTE.teal : "#fff",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 12,
    lineHeight: 1.25,
    textAlign: "center",
    cursor: isConnectionActionDisabled(state)
      ? "not-allowed"
      : "pointer",
    opacity:
      isConnectionActionDisabled(state) &&
      !completed
        ? 0.68
        : 1,
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
    border: `1px solid ${
      isRide
        ? EVENT_PALETTE.tealBorder
        : EVENT_PALETTE.indigoBorder
    }`,
    background:
      "linear-gradient(135deg, rgba(47,128,255,0.14), rgba(124,92,255,0.18))",
    boxShadow: "0 0 22px rgba(124,92,255,0.10)",
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

function statusBadgeStyle(kind: "ride" | "meet"): CSSProperties {
  const isRide = kind === "ride";

  return {
    display: "inline-flex",
    alignItems: "center",
    width: "auto",
    minHeight: 24,
    paddingTop: 2,
    color: isRide
      ? EVENT_PALETTE.teal
      : EVENT_PALETTE.amber,
    fontSize: 11,
    lineHeight: 1.35,
    fontWeight: 850,
    whiteSpace: "nowrap",
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

function RideDetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: unknown;
  last?: boolean;
}) {
  if (!hasContent(value)) return null;

  return (
    <div style={rideDetailRowStyle(last)}>
      <span
        style={{
          color: "rgba(255,255,255,0.46)",
          fontSize: 10,
          lineHeight: 1.35,
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
          lineHeight: 1.4,
          overflowWrap: "anywhere",
        }}
      >
        {String(value)}
      </strong>
    </div>
  );
}

function RideNotesLine({ value }: { value: unknown }) {
  if (!hasContent(value)) return null;

  return (
    <p
      style={{
        margin: 0,
        color: "rgba(255,255,255,0.72)",
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <strong
        style={{
          color: "rgba(255,255,255,0.48)",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 0.45,
          textTransform: "uppercase",
        }}
      >
        {"Observações"}
      </strong>
      <span aria-hidden="true"> · </span>
      {String(value)}
    </p>
  );
}

function MeetDetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: unknown;
  last?: boolean;
}) {
  if (!hasContent(value)) return null;

  return (
    <div style={meetDetailRowStyle(last)}>
      <span
        style={{
          color: "rgba(255,255,255,0.46)",
          fontSize: 10,
          lineHeight: 1.35,
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
          lineHeight: 1.4,
          overflowWrap: "anywhere",
        }}
      >
        {String(value)}
      </strong>
    </div>
  );
}

function MeetNotesLine({ value }: { value: unknown }) {
  if (!hasContent(value)) return null;

  return (
    <p
      style={{
        margin: 0,
        color: EVENT_PALETTE.textMuted,
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <strong
        style={{
          color: "rgba(255,255,255,0.48)",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 0.45,
          textTransform: "uppercase",
        }}
      >
        {"Observações"}
      </strong>
      <span aria-hidden="true"> · </span>
      {String(value)}
    </p>
  );
}

function useMeetConnectionState(
  member: RideMeetEventMember,
): {
  connectionState: ConnectionUiState;
  requestConnection: () => Promise<void>;
} {
  const [connectionState, setConnectionState] =
    useState<ConnectionUiState>("idle");

  const sandboxMember = isSandboxMember(member);

  useEffect(() => {
    if (sandboxMember || !normalizeText(member.user_id)) {
      return;
    }

    let ignore = false;

    async function loadConnectionStatus() {
      setConnectionState("checking");

      try {
        const response = await fetch(
          `/api/network/connections/status?targetUserId=${encodeURIComponent(
            member.user_id,
          )}`,
          {
            method: "GET",
          },
        );

        const data = await response.json().catch(() => null);

        if (ignore) {
          return;
        }

        const code = normalizeText(data?.code);
        const apiState = normalizeText(data?.state);

        if (
          response.status === 401 ||
          code === "UNAUTHORIZED"
        ) {
          setConnectionState("unauthorized");
          return;
        }

        if (data?.ok) {
          setConnectionState(
            mapApiConnectionState(apiState),
          );
          return;
        }

        setConnectionState("idle");
      } catch {
        if (!ignore) {
          setConnectionState("idle");
        }
      }
    }

    loadConnectionStatus();

    return () => {
      ignore = true;
    };
  }, [member.user_id, sandboxMember]);

  async function requestConnection() {
    if (
      sandboxMember ||
      isConnectionActionDisabled(connectionState)
    ) {
      return;
    }

    setConnectionState("sending");

    try {
      const response = await fetch(
        "/api/network/connections",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetUserId: member.user_id,
          }),
        },
      );

      const data = await response.json().catch(() => null);
      const code = normalizeText(data?.code);
      const apiState = normalizeText(data?.state);

      if (
        response.status === 401 ||
        code === "UNAUTHORIZED"
      ) {
        setConnectionState("unauthorized");
        return;
      }

      if (
        data?.ok &&
        apiState === "outgoing_pending"
      ) {
        setConnectionState("outgoing_pending");
        return;
      }

      if (code === "ALREADY_CONNECTED") {
        setConnectionState("connected");
        return;
      }

      if (code === "REQUEST_ALREADY_SENT") {
        setConnectionState("outgoing_pending");
        return;
      }

      if (code === "INCOMING_REQUEST_EXISTS") {
        setConnectionState("incoming_pending");
        return;
      }

      if (code === "RELATIONSHIP_BLOCKED") {
        setConnectionState("blocked");
        return;
      }

      if (code === "RELATIONSHIP_SUSPENDED") {
        setConnectionState("suspended");
        return;
      }

      if (code === "INVALID_TARGET") {
        setConnectionState("self");
        return;
      }

      setConnectionState("error");
    } catch {
      setConnectionState("error");
    }
  }

  return {
    connectionState,
    requestConnection,
  };
}

function RideEventOfficialAction({ href }: { href: string }) {
  const normalizedHref = normalizeText(href);

  if (!normalizedHref) {
    return (
      <span
        aria-disabled="true"
        title="Link oficial do evento ainda não confirmado"
        style={{
          color: "rgba(255,255,255,0.38)",
          fontSize: 12,
          lineHeight: 1.4,
          fontWeight: 800,
        }}
      >
        {"Evento indisponível"}
      </span>
    );
  }

  return (
    <a
      href={normalizedHref}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "rgba(0,255,190,0.88)",
        fontSize: 12,
        lineHeight: 1.4,
        fontWeight: 850,
        textDecoration: "none",
      }}
    >
      Abrir evento oficial ↗
    </a>
  );
}

function RideCard({
  member,
  eventReturnTo,
  officialEventUrl,
}: {
  member: RideMeetEventMember;
  eventReturnTo: string;
  officialEventUrl?: string;
}) {
  const [connectionState, setConnectionState] =
    useState<ConnectionUiState>("idle");

  const rideLabel = getRideStatusLabel(member.ride_status);
  const seatsLabel = hasContent(member.ride_seats)
    ? String(member.ride_seats) + " vagas"
    : "";
  const officialHref = normalizeText(
    officialEventUrl || member.ride_event_url,
  );
  const sandboxMember = isSandboxMember(member);
  const publicProfileHref = getPublicClubberHref(
    member,
    eventReturnTo,
  );

  const detailItems = [
    {
      label: "Evento",
      value: member.ride_event_name,
    },
    {
      label: "Origem",
      value: member.ride_origin,
    },
    {
      label: "Destino",
      value: member.ride_destination,
    },
  ].filter((item) => hasContent(item.value));

  useEffect(() => {
    if (sandboxMember || !normalizeText(member.user_id)) {
      return;
    }

    let ignore = false;

    async function loadConnectionStatus() {
      setConnectionState("checking");

      try {
        const response = await fetch(
          `/api/network/connections/status?targetUserId=${encodeURIComponent(
            member.user_id,
          )}`,
          {
            method: "GET",
          },
        );

        const data = await response.json().catch(() => null);

        if (ignore) {
          return;
        }

        const code = normalizeText(data?.code);
        const apiState = normalizeText(data?.state);

        if (
          response.status === 401 ||
          code === "UNAUTHORIZED"
        ) {
          setConnectionState("unauthorized");
          return;
        }

        if (data?.ok) {
          setConnectionState(
            mapApiConnectionState(apiState),
          );
          return;
        }

        setConnectionState("idle");
      } catch {
        if (!ignore) {
          setConnectionState("idle");
        }
      }
    }

    loadConnectionStatus();

    return () => {
      ignore = true;
    };
  }, [member.user_id, sandboxMember]);

  async function handleConnectionRequest() {
    if (
      sandboxMember ||
      isConnectionActionDisabled(connectionState)
    ) {
      return;
    }

    setConnectionState("sending");

    try {
      const response = await fetch(
        "/api/network/connections",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetUserId: member.user_id,
          }),
        },
      );

      const data = await response.json().catch(() => null);
      const code = normalizeText(data?.code);
      const apiState = normalizeText(data?.state);

      if (
        response.status === 401 ||
        code === "UNAUTHORIZED"
      ) {
        setConnectionState("unauthorized");
        return;
      }

      if (
        data?.ok &&
        apiState === "outgoing_pending"
      ) {
        setConnectionState("outgoing_pending");
        return;
      }

      if (code === "ALREADY_CONNECTED") {
        setConnectionState("connected");
        return;
      }

      if (code === "REQUEST_ALREADY_SENT") {
        setConnectionState("outgoing_pending");
        return;
      }

      if (code === "INCOMING_REQUEST_EXISTS") {
        setConnectionState("incoming_pending");
        return;
      }

      if (code === "RELATIONSHIP_BLOCKED") {
        setConnectionState("blocked");
        return;
      }

      if (code === "RELATIONSHIP_SUSPENDED") {
        setConnectionState("suspended");
        return;
      }

      if (code === "INVALID_TARGET") {
        setConnectionState("self");
        return;
      }

      setConnectionState("error");
    } catch {
      setConnectionState("error");
    }
  }

  const connectionLabel = sandboxMember
    ? "Perfil demonstrativo"
    : getRideConnectionLabel(connectionState);

  const connectionFeedback = sandboxMember
    ? "Este perfil demonstrativo não envia solicitações reais."
    : getRideConnectionFeedback(connectionState);

  return (
    <article
      className="event-ride-card"
      style={rideCardStyle()}
    >
      <div className="event-ride-card__identity">
        <ProfileAvatar member={member} kind="ride" />

        <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
          <strong
            style={{
              color: "#fff",
              fontSize: 19,
              lineHeight: 1.12,
              overflowWrap: "anywhere",
            }}
          >
            {member.label}
          </strong>

          {hasContent(member.city_base) ? (
            <span
              style={{
                color: EVENT_PALETTE.textMuted,
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
              color: EVENT_PALETTE.teal,
              fontSize: 11,
              lineHeight: 1.35,
              fontWeight: 850,
            }}
          >
            {[rideLabel, seatsLabel].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>

      {detailItems.length > 0 ? (
        <div
          className="event-ride-card__details"
          style={rideDetailsStyle()}
        >
          {detailItems.map((item, index) => (
            <RideDetailRow
              key={`ride-detail-${item.label}`}
              label={item.label}
              value={item.value}
              last={index === detailItems.length - 1}
            />
          ))}
        </div>
      ) : (
        <div
          className="event-ride-card__details"
          aria-hidden="true"
        />
      )}

      <div className="event-ride-card__footer">
        <RideNotesLine value={member.ride_notes} />

        <div className="event-ride-card__connection">
          {connectionState === "self" ? (
            <div
              aria-label="Sua carona"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                width: "fit-content",
                color: EVENT_PALETTE.textSoft,
                fontSize: 12,
                lineHeight: 1.35,
                fontWeight: 850,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  flex: "0 0 7px",
                  borderRadius: 999,
                  background: EVENT_PALETTE.teal,
                  boxShadow:
                    "0 0 14px rgba(0,245,200,0.34)",
                }}
              />
              <span>Sua carona</span>
            </div>
          ) : connectionState === "unauthorized" ? (
            <Link
              href={getLoginHref(eventReturnTo)}
              style={rideConnectionButtonStyle(
                connectionState,
              )}
            >
              {connectionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleConnectionRequest}
              disabled={
                sandboxMember ||
                isConnectionActionDisabled(
                  connectionState,
                )
              }
              style={rideConnectionButtonStyle(
                connectionState,
              )}
            >
              {connectionLabel}
            </button>
          )}

          <p
            style={{
              margin: 0,
              color: EVENT_PALETTE.textMuted,
              fontSize: 11,
              lineHeight: 1.45,
            }}
          >
            {connectionFeedback}
          </p>

          {connectionState === "incoming_pending" ? (
            <Link
              href="/network/connections"
              className="event-ride-card__review-link"
            >
              Revisar solicitação
            </Link>
          ) : null}
        </div>

        <div className="event-ride-card__secondary-actions">
          {publicProfileHref ? (
            <Link
              href={publicProfileHref}
              style={rideProfileActionStyle()}
            >
              Ver perfil Club
            </Link>
          ) : (
            <span
              aria-disabled="true"
              style={{
                color: "rgba(255,255,255,0.38)",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Perfil indisponível
            </span>
          )}

          <RideEventOfficialAction href={officialHref} />
        </div>
      </div>
    </article>
  );
}

function MeetCard({
  member,
  eventReturnTo,
  officialEventUrl,
}: {
  member: RideMeetEventMember;
  eventReturnTo: string;
  officialEventUrl?: string;
}) {
  const { connectionState, requestConnection } =
    useMeetConnectionState(member);

  const meetLabel = getMeetStatusLabel(member.meet_status);
  const officialHref = normalizeText(
    officialEventUrl || member.meet_event_url,
  );
  const sandboxMember = isSandboxMember(member);
  const publicProfileHref = getPublicClubberHref(
    member,
    eventReturnTo,
  );

  const detailItems = [
    {
      label: "Evento",
      value: member.meet_event_name,
    },
    {
      label: "Data",
      value: formatMeetDate(member.meet_event_date),
    },
    {
      label: "Ponto",
      value: member.meet_meeting_point,
    },
    {
      label: "Horário",
      value: member.meet_time,
    },
  ].filter((item) => hasContent(item.value));

  const connectionLabel = sandboxMember
    ? "Perfil demonstrativo"
    : getMeetConnectionLabel(connectionState);

  const connectionFeedback = sandboxMember
    ? "Este perfil demonstrativo não envia solicitações reais."
    : getMeetConnectionFeedback(connectionState);

  return (
    <article
      className="event-meet-card"
      style={meetCardStyle()}
    >
      <div className="event-meet-card__identity">
        <ProfileAvatar member={member} kind="meet" />

        <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
          <strong
            style={{
              color: "#fff",
              fontSize: 19,
              lineHeight: 1.12,
              overflowWrap: "anywhere",
            }}
          >
            {member.label}
          </strong>

          {hasContent(member.city_base) ? (
            <span
              style={{
                color: EVENT_PALETTE.textMuted,
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
              color: EVENT_PALETTE.amber,
              fontSize: 11,
              lineHeight: 1.35,
              fontWeight: 850,
            }}
          >
            {meetLabel}
          </span>
        </div>
      </div>

      <div className="event-meet-card__details">
        {detailItems.length > 0 ? (
          <div style={meetDetailsStyle()}>
            {detailItems.map((item, index) => (
              <MeetDetailRow
                key={`meet-detail-${item.label}`}
                label={item.label}
                value={item.value}
                last={index === detailItems.length - 1}
              />
            ))}
          </div>
        ) : null}

        <MeetNotesLine value={member.meet_notes} />
      </div>

      <div className="event-meet-card__footer">
        <div className="event-meet-card__connection">
          {connectionState === "self" ? (
            <div
              aria-label="Seu encontro"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                width: "fit-content",
                color: EVENT_PALETTE.textSoft,
                fontSize: 12,
                lineHeight: 1.35,
                fontWeight: 850,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  flex: "0 0 7px",
                  borderRadius: 999,
                  background: EVENT_PALETTE.amber,
                  boxShadow:
                    "0 0 14px rgba(255,188,88,0.30)",
                }}
              />
              <span>Seu encontro</span>
            </div>
          ) : connectionState === "unauthorized" ? (
            <Link
              href={getLoginHref(eventReturnTo)}
              style={rideConnectionButtonStyle(
                connectionState,
              )}
            >
              {connectionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={requestConnection}
              disabled={
                sandboxMember ||
                isConnectionActionDisabled(
                  connectionState,
                )
              }
              style={rideConnectionButtonStyle(
                connectionState,
              )}
            >
              {connectionLabel}
            </button>
          )}

          <p
            style={{
              margin: 0,
              color: EVENT_PALETTE.textMuted,
              fontSize: 11,
              lineHeight: 1.45,
            }}
          >
            {connectionFeedback}
          </p>

          {connectionState === "incoming_pending" ? (
            <Link
              href="/network/connections"
              className="event-meet-card__review-link"
            >
              Revisar solicitação
            </Link>
          ) : null}
        </div>

        <div className="event-meet-card__secondary-actions">
          {publicProfileHref ? (
            <Link
              href={publicProfileHref}
              style={rideProfileActionStyle()}
            >
              Ver perfil Club
            </Link>
          ) : (
            <span
              aria-disabled="true"
              style={{
                color: "rgba(255,255,255,0.38)",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Perfil indisponível
            </span>
          )}

          <RideEventOfficialAction href={officialHref} />
        </div>
      </div>
    </article>
  );
}

export default function RideMeetCards({
  rideMembers,
  meetMembers,
  eventReturnTo,
  officialEventUrl,
}: RideMeetCardsProps) {
  return (
    <div className="event-ride-meet-stack">
      <style>{`
        .event-ride-meet-stack {
          width: min(1120px, calc(100vw - 48px));
          min-width: 0;
          margin: 18px 0 0 50%;
          transform: translateX(-50%);
          display: grid;
          gap: 18px;
          box-sizing: border-box;
        }

        .event-ride-card {
          grid-template-columns:
            minmax(240px, 0.92fr)
            minmax(300px, 1.16fr)
            minmax(210px, 0.72fr);
          align-items: stretch;
          gap: 0;
        }

        .event-ride-card__identity {
          min-width: 0;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 14px;
          align-items: center;
          padding-right: 24px;
        }

        .event-ride-card__details {
          padding: 0 24px;
          border-left: 1px solid rgba(255,255,255,0.08);
          border-right: 1px solid rgba(255,255,255,0.08);
        }

        .event-ride-card__footer {
          min-width: 0;
          display: grid;
          align-content: center;
          gap: 14px;
          padding-left: 24px;
        }

        .event-ride-card__connection {
          display: grid;
          gap: 8px;
        }

        .event-ride-card__review-link {
          width: fit-content;
          color: ${"#7C5CFF"};
          font-size: 11px;
          line-height: 1.35;
          font-weight: 850;
          text-decoration: none;
          border-bottom: 1px solid rgba(124,92,255,0.40);
        }

        .event-ride-card__secondary-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .event-meet-card {
          grid-template-columns:
            minmax(240px, 0.92fr)
            minmax(300px, 1.16fr)
            minmax(210px, 0.72fr);
          align-items: stretch;
          gap: 0;
        }

        .event-meet-card__identity {
          min-width: 0;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 14px;
          align-items: center;
          padding-right: 24px;
        }

        .event-meet-card__details {
          min-width: 0;
          display: grid;
          align-content: center;
          gap: 12px;
          padding: 0 24px;
          border-left: 1px solid rgba(255,255,255,0.08);
          border-right: 1px solid rgba(255,255,255,0.08);
        }

        .event-meet-card__footer {
          min-width: 0;
          display: grid;
          align-content: center;
          gap: 14px;
          padding-left: 24px;
        }

        .event-meet-card__connection {
          display: grid;
          gap: 8px;
        }

        .event-meet-card__review-link {
          width: fit-content;
          color: #7C5CFF;
          font-size: 11px;
          line-height: 1.35;
          font-weight: 850;
          text-decoration: none;
          border-bottom: 1px solid rgba(124,92,255,0.40);
        }

        .event-meet-card__secondary-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        @media (max-width: 760px) {
          .event-ride-meet-stack {
            width: 100%;
            max-width: 100%;
            margin: 14px 0 0;
            transform: none;
            gap: 16px;
          }

          .event-ride-card {
            grid-template-columns: minmax(0, 1fr);
            gap: 16px;
          }

          .event-ride-card__identity {
            padding-right: 0;
          }

          .event-ride-card__details {
            padding: 0;
            border-left: 0;
            border-right: 0;
            border-top: 1px solid rgba(255,255,255,0.09);
            border-bottom: 1px solid rgba(255,255,255,0.09);
          }

          .event-ride-card__footer {
            gap: 13px;
            padding-left: 0;
          }

          .event-ride-card__secondary-actions {
            justify-content: space-between;
          }

          .event-meet-card {
            grid-template-columns: minmax(0, 1fr);
            gap: 16px;
          }

          .event-meet-card__identity {
            padding-right: 0;
          }

          .event-meet-card__details {
            gap: 12px;
            padding: 0;
            border-left: 0;
            border-right: 0;
            border-top: 1px solid rgba(255,255,255,0.09);
            border-bottom: 1px solid rgba(255,255,255,0.09);
          }

          .event-meet-card__footer {
            gap: 13px;
            padding-left: 0;
          }

          .event-meet-card__secondary-actions {
            justify-content: space-between;
          }
        }
      `}</style>

      <section style={sectionStyle("ride")}>
        <div style={sectionHeaderStyle()}>
          <div style={{ display: "grid", gap: 4 }}>
            <h2 style={sectionTitleStyle()}>Carona compartilhada</h2>
            <p style={sectionSubtitleStyle()}>
              Quem oferece e quem procura carona para este evento.
            </p>
          </div>

          <span style={statusBadgeStyle("ride")}>
            Radar ativo
          </span>
        </div>

        {rideMembers.length === 0 ? (
          <div style={emptyCardStyle()}>
            {"Ainda não há caronas mapeadas para este evento."}
          </div>
        ) : (
          <div style={carouselStyle()}>
            {rideMembers.map((member) => (
              <RideCard
                key={`ride-card-${member.user_id}-${member.slug}`}
                member={member}
                eventReturnTo={eventReturnTo}
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
              {"Pontos de encontro e horários que já foram marcados para este evento."}
            </p>
          </div>

          <span style={statusBadgeStyle("meet")}>Ponto ativo</span>
        </div>

        {meetMembers.length === 0 ? (
          <div style={emptyCardStyle()}>
            {"Ainda não há encontros ativos mapeados para este evento."}
          </div>
        ) : (
          <div style={carouselStyle()}>
            {meetMembers.map((member) => (
              <MeetCard
                key={`meet-card-${member.user_id}-${member.slug}`}
                member={member}
                eventReturnTo={eventReturnTo}
                officialEventUrl={officialEventUrl}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
