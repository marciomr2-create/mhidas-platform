// src/app/event/[event_slug]/EventParticipantsFilter.tsx
"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type EventParticipant = {
  user_id: string;
  label: string;
  slug: string;
  city_base: string;
  club_tagline: string;
  club_photo_url: string;
  favorite_genres: string[];
  event_social_mode: string;
  compatibilityScore?: number;
  compatibilityBadges?: string[];
};

type FilterMode =
  "all" | "hot" | "near" | "city" | "state" | "region" | "genre";

type RadarView = "for-you" | "hot" | "near" | "tribes";

type FilterGroup = "none" | "cities" | "states" | "regions" | "genres";

type TribeVisual = {
  icon: string;
  name: string;
  shortName: string;
  description: string;
  gradient: string;
  border: string;
  glow: string;
  accent: string;
};

type HotConnectionMeta = {
  label: string;
  shortLabel: string;
  description: string;
  border: string;
  background: string;
  color: string;
  glow: string;
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

type ProximityMatch = {
  member: EventParticipant;
  score: number;
  reasons: string[];
};

const DEV_SOCIAL_SANDBOX = true;

const PREMIUM = {
  bg: "#05050A",
  surface: "rgba(17,17,26,0.86)",
  surfaceStrong: "rgba(24,24,39,0.82)",
  violet: "#7C5CFF",
  violetSoft: "rgba(124,92,255,0.18)",
  blue: "#2F80FF",
  blueSoft: "rgba(47,128,255,0.16)",
  radar: "#00F5C8",
  radarSoft: "rgba(0,245,200,0.12)",
  radarBorder: "rgba(0,245,200,0.26)",
  amber: "#FFBC58",
  amberSoft: "rgba(255,188,88,0.14)",
  pink: "#FF5576",
  whiteBorder: "rgba(255,255,255,0.10)",
  whiteBorderStrong: "rgba(255,255,255,0.16)",
  textMuted: "rgba(255,255,255,0.68)",
  textSoft: "rgba(255,255,255,0.78)",
};

const MOCK_PARTICIPANTS: EventParticipant[] = [
  {
    user_id: "TEST_SANDBOX_001",
    label: "Lia Santos",
    slug: "sandbox-lia-santos",
    city_base: "São Paulo - SP",
    club_tagline: "House, pista boa e conexões leves antes do evento.",
    club_photo_url:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80",
    favorite_genres: ["House", "Tech House", "Deep House"],
    event_social_mode: "networking",
    compatibilityScore: 70,
    compatibilityBadges: ["Vertentes similares", "Estado SP"],
  },
  {
    user_id: "TEST_SANDBOX_002",
    label: "Rafa Nunes",
    slug: "sandbox-rafa-nunes",
    city_base: "Curitiba - PR",
    club_tagline: "Progressive House, viagens de festival e energia boa.",
    club_photo_url:
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=900&q=80",
    favorite_genres: ["Progressive House", "Melodic Techno", "House"],
    event_social_mode: "meet",
    compatibilityScore: 64,
    compatibilityBadges: ["Mesmo evento", "Sul"],
  },
  {
    user_id: "TEST_SANDBOX_003",
    label: "Bruno Costa",
    slug: "sandbox-bruno-costa",
    city_base: "Florianópolis - SC",
    club_tagline: "Busco minha tribo para after, carona e pista.",
    club_photo_url:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80",
    favorite_genres: ["Techno", "Melodic Techno", "Progressive House"],
    event_social_mode: "networking",
    compatibilityScore: 81,
    compatibilityBadges: ["Alta afinidade", "Techno"],
  },
  {
    user_id: "TEST_SANDBOX_004",
    label: "Maya Ribeiro",
    slug: "sandbox-maya-ribeiro",
    city_base: "Rio de Janeiro - RJ",
    club_tagline:
      "Gosto de festivais grandes, progressive e encontros seguros.",
    club_photo_url:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=80",
    favorite_genres: ["Progressive House", "Deep House", "Organic House"],
    event_social_mode: "meet",
    compatibilityScore: 77,
    compatibilityBadges: ["Sudeste", "Progressive"],
  },
];

function normalizeText(value: any): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSandboxParticipant(member: EventParticipant): boolean {
  return (
    normalizeText(member.user_id).startsWith("TEST_SANDBOX_") ||
    normalizeText(member.slug).startsWith("sandbox-")
  );
}

function getPublicClubberHref(
  member: EventParticipant,
  eventReturnTo: string,
): string {
  const slug = normalizeText(member.slug).toLowerCase();
  const safeReturnTo = normalizeText(eventReturnTo);

  if (!slug || isSandboxParticipant(member)) {
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

function getStateFromCityBase(value: string): string {
  const parts = normalizeText(value)
    .split("-")
    .map((item) => normalizeText(item));

  return (parts[1] || "").toUpperCase();
}

function getRegionFromState(state: string): string {
  const uf = normalizeText(state).toUpperCase();

  if (["PR", "SC", "RS"].includes(uf)) return "Sul";
  if (["SP", "RJ", "MG", "ES"].includes(uf)) return "Sudeste";
  if (["DF", "GO", "MT", "MS"].includes(uf)) return "Centro-Oeste";
  if (["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"].includes(uf)) {
    return "Nordeste";
  }
  if (["AM", "PA", "AC", "RO", "RR", "AP", "TO"].includes(uf)) return "Norte";

  return "";
}

function getClubberTribe(genres: string[]): string {
  const normalizedGenres = genres.map((genre) =>
    normalizeText(genre).toLowerCase(),
  );

  if (normalizedGenres.some((genre) => genre.includes("hard techno"))) {
    return "🏴 Hard Techno Tribe";
  }

  if (normalizedGenres.some((genre) => genre.includes("techno"))) {
    return "🏴 Techno Tribe";
  }

  if (normalizedGenres.some((genre) => genre.includes("progressive"))) {
    return "🌌 Progressive Family";
  }

  if (normalizedGenres.some((genre) => genre.includes("melodic"))) {
    return "🌙 Melodic Society";
  }

  if (normalizedGenres.some((genre) => genre.includes("house"))) {
    return "🎵 House Lovers";
  }

  if (normalizedGenres.some((genre) => genre.includes("deep"))) {
    return "🌊 Deep House Circle";
  }

  return "🔥 Festival Crew";
}

function getTribeVisual(tribe: string): TribeVisual {
  if (tribe.includes("Hard Techno")) {
    return {
      icon: "🏴",
      name: "Hard Techno Tribe",
      shortName: "Hard Techno",
      description: "Energia intensa, pista pesada e conexão de alta presença.",
      gradient:
        "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(12,12,20,0.92))",
      border: "1px solid rgba(255,255,255,0.18)",
      glow: "0 0 28px rgba(255,255,255,0.08)",
      accent: "#ffffff",
    };
  }

  if (tribe.includes("Techno")) {
    return {
      icon: "🏴",
      name: "Techno Tribe",
      shortName: "Techno",
      description: "Grave, atmosfera escura e identidade forte de pista.",
      gradient:
        "linear-gradient(135deg, rgba(47,128,255,0.18), rgba(124,92,255,0.18), rgba(9,10,18,0.90))",
      border: "1px solid rgba(124,92,255,0.34)",
      glow: "0 0 30px rgba(47,128,255,0.14)",
      accent: PREMIUM.radar,
    };
  }

  if (tribe.includes("Progressive")) {
    return {
      icon: "🌌",
      name: "Progressive Family",
      shortName: "Progressive",
      description: "Viagem melódica, conexão emocional e espírito de festival.",
      gradient:
        "linear-gradient(135deg, rgba(124,92,255,0.30), rgba(47,128,255,0.12), rgba(9,10,18,0.90))",
      border: "1px solid rgba(124,92,255,0.42)",
      glow: "0 0 30px rgba(124,92,255,0.18)",
      accent: "#9B7CFF",
    };
  }

  if (tribe.includes("Melodic")) {
    return {
      icon: "🌙",
      name: "Melodic Society",
      shortName: "Melodic",
      description:
        "Atmosfera emocional, synths profundos e encontro sensorial.",
      gradient:
        "linear-gradient(135deg, rgba(196,124,255,0.24), rgba(47,128,255,0.12), rgba(9,10,18,0.90))",
      border: "1px solid rgba(196,124,255,0.34)",
      glow: "0 0 30px rgba(196,124,255,0.16)",
      accent: "#C47CFF",
    };
  }

  if (tribe.includes("House")) {
    return {
      icon: "🎵",
      name: "House Lovers",
      shortName: "House",
      description: "Groove, alegria de pista e conexões sociais leves.",
      gradient:
        "linear-gradient(135deg, rgba(255,188,88,0.22), rgba(124,92,255,0.10), rgba(9,10,18,0.90))",
      border: "1px solid rgba(255,188,88,0.32)",
      glow: "0 0 28px rgba(255,188,88,0.12)",
      accent: PREMIUM.amber,
    };
  }

  if (tribe.includes("Deep")) {
    return {
      icon: "🌊",
      name: "Deep House Circle",
      shortName: "Deep",
      description:
        "Sons elegantes, conexão mais intimista e pista sofisticada.",
      gradient:
        "linear-gradient(135deg, rgba(47,128,255,0.22), rgba(124,92,255,0.12), rgba(9,10,18,0.90))",
      border: "1px solid rgba(47,128,255,0.34)",
      glow: "0 0 28px rgba(47,128,255,0.14)",
      accent: "#3EB0FF",
    };
  }

  return {
    icon: "🔥",
    name: "Festival Crew",
    shortName: "Festival",
    description: "Exploradores de eventos, encontros e novas experiências.",
    gradient:
      "linear-gradient(135deg, rgba(255,85,118,0.22), rgba(124,92,255,0.12), rgba(9,10,18,0.90))",
    border: "1px solid rgba(255,85,118,0.32)",
    glow: "0 0 28px rgba(255,85,118,0.12)",
    accent: PREMIUM.pink,
  };
}

function getSocialModeLabel(mode: string): string {
  const normalized = normalizeText(mode).toLowerCase();

  if (normalized.includes("network")) return "Aberto a conexões";
  if (normalized.includes("meet")) return "Aberto a encontros";
  if (normalized.includes("ride")) return "Aberto a caronas";
  if (normalized.includes("after")) return "A caminho do after";

  return "Presença social ativa";
}

function getHotConnectionMeta(score = 0): HotConnectionMeta {
  if (score >= 85) {
    return {
      label: "Conexão muito quente",
      shortLabel: "Muito quente",
      description:
        "Alta chance de afinidade real por música, região e presença social.",
      border: `1px solid ${PREMIUM.radarBorder}`,
      background:
        "linear-gradient(135deg, rgba(0,245,200,0.12), rgba(47,128,255,0.14), rgba(124,92,255,0.16))",
      color: PREMIUM.radar,
      glow: "0 0 26px rgba(0,245,200,0.14)",
    };
  }

  if (score >= 70) {
    return {
      label: "Conexão quente",
      shortLabel: "Quente",
      description:
        "Boa combinação de vertentes, localização e intenção social.",
      border: "1px solid rgba(255,188,88,0.34)",
      background:
        "linear-gradient(135deg, rgba(255,188,88,0.13), rgba(124,92,255,0.16), rgba(47,128,255,0.10))",
      color: PREMIUM.amber,
      glow: "0 0 24px rgba(255,188,88,0.12)",
    };
  }

  if (score >= 50) {
    return {
      label: "Boa afinidade",
      shortLabel: "Boa",
      description:
        "Existe potencial de conexão, principalmente pelo evento e preferências.",
      border: "1px solid rgba(124,92,255,0.32)",
      background:
        "linear-gradient(135deg, rgba(124,92,255,0.16), rgba(47,128,255,0.08), rgba(255,255,255,0.035))",
      color: "#B8A4FF",
      glow: "0 0 20px rgba(124,92,255,0.10)",
    };
  }

  return {
    label: "Afinidade inicial",
    shortLabel: "Inicial",
    description:
      "Conexão inicial pelo evento, ainda com poucos sinais de compatibilidade.",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.045)",
    color: "rgba(255,255,255,0.78)",
    glow: "none",
  };
}

function getSharedGenres(a: string[], b: string[]): string[] {
  const left = a
    .map((item) => normalizeText(item).toLowerCase())
    .filter(Boolean);
  const right = b
    .map((item) => normalizeText(item).toLowerCase())
    .filter(Boolean);

  return left.filter((genre) => right.includes(genre));
}

function buildProximityMatch(
  selfParticipant: EventParticipant,
  candidate: EventParticipant,
): ProximityMatch {
  const selfCity = normalizeText(selfParticipant.city_base);
  const candidateCity = normalizeText(candidate.city_base);

  const selfState = getStateFromCityBase(selfParticipant.city_base);
  const candidateState = getStateFromCityBase(candidate.city_base);

  const selfRegion = getRegionFromState(selfState);
  const candidateRegion = getRegionFromState(candidateState);

  const selfTribe = getClubberTribe(selfParticipant.favorite_genres || []);
  const candidateTribe = getClubberTribe(candidate.favorite_genres || []);

  const sharedGenres = getSharedGenres(
    selfParticipant.favorite_genres || [],
    candidate.favorite_genres || [],
  );

  let score = 10;
  const reasons: string[] = ["Mesmo evento"];

  if (selfCity && candidateCity && selfCity === candidateCity) {
    score += 42;
    reasons.push("Mesma cidade");
  } else if (selfState && candidateState && selfState === candidateState) {
    score += 28;
    reasons.push(`Estado ${selfState}`);
  } else if (selfRegion && candidateRegion && selfRegion === candidateRegion) {
    score += 18;
    reasons.push(selfRegion);
  }

  if (selfTribe && candidateTribe && selfTribe === candidateTribe) {
    score += 24;
    reasons.push("Mesma tribo");
  }

  if (sharedGenres.length > 0) {
    score += Math.min(sharedGenres.length * 10, 20);
    reasons.push("Som parecido");
  }

  if (candidate.compatibilityScore) {
    score += Math.round(candidate.compatibilityScore * 0.16);
  }

  return {
    member: candidate,
    score: Math.min(score, 100),
    reasons: Array.from(new Set(reasons)).slice(0, 4),
  };
}

function mapApiConnectionState(value: string): ConnectionUiState {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "self") return "self";
  if (normalized === "outgoing_pending") return "outgoing_pending";
  if (normalized === "incoming_pending") return "incoming_pending";
  if (normalized === "connected") return "connected";
  if (normalized === "blocked") return "blocked";
  if (normalized === "suspended") return "suspended";

  return "idle";
}

function getConnectionLabel(state: ConnectionUiState): string {
  if (state === "checking") return "Verificando...";
  if (state === "sending") return "Enviando...";
  if (state === "outgoing_pending") return "Solicitação enviada";
  if (state === "incoming_pending") return "Solicitação recebida";
  if (state === "connected") return "Já conectado";
  if (state === "unauthorized") return "Faça login para conectar";
  if (state === "blocked") return "Conexão bloqueada";
  if (state === "suspended") return "Conexão suspensa";
  if (state === "self") return "Você está neste evento";
  if (state === "error") return "Tentar novamente";

  return "Quero conectar";
}

function getConnectionFeedback(state: ConnectionUiState): string {
  if (state === "checking") {
    return "Verificando se já existe uma conexão entre vocês.";
  }

  if (state === "outgoing_pending") {
    return "Pedido enviado. Os caminhos sociais serão liberados após o aceite.";
  }

  if (state === "incoming_pending") {
    return "Esta pessoa já enviou uma solicitação. Aceite para liberar conversa, grupo, carona ou encontro.";
  }

  if (state === "connected") {
    return "Conexão aprovada. Os caminhos sociais entre vocês já podem ser combinados com mais segurança.";
  }

  if (state === "unauthorized") {
    return "Entre na sua conta para solicitar conexão com este clubber.";
  }

  if (state === "blocked") {
    return "Não é possível conectar devido a bloqueio de relacionamento.";
  }

  if (state === "suspended") {
    return "Esta conexão está suspensa no momento.";
  }

  if (state === "self") {
    return "Outros clubbers poderão encontrar você por afinidade neste evento.";
  }

  if (state === "error") {
    return "Não foi possível enviar agora. Tente novamente em instantes.";
  }

  return "Solicite conexão para liberar conversa, grupo, carona ou encontro após o aceite.";
}

function isConnectionButtonDisabled(state: ConnectionUiState): boolean {
  return [
    "checking",
    "sending",
    "outgoing_pending",
    "incoming_pending",
    "connected",
    "unauthorized",
    "blocked",
    "suspended",
    "self",
  ].includes(state);
}

function canUnlockSocialPaths(state: ConnectionUiState): boolean {
  return state === "connected";
}

function getSocialPathStatusLabel(state: ConnectionUiState): string {
  if (state === "connected") return "Liberado";
  if (state === "self") return "Para outros clubbers";
  if (state === "outgoing_pending") return "Aguardando aceite";
  if (state === "incoming_pending") return "Aceite para liberar";
  if (state === "checking") return "Verificando";
  if (state === "unauthorized") return "Login necessário";
  if (state === "blocked" || state === "suspended") return "Indisponível";

  return "Após conexão";
}

function getConnectionActionTitle(
  state: ConnectionUiState,
  sandboxParticipant: boolean,
): string {
  if (sandboxParticipant) return "Veja como a conexão funcionará";
  if (state === "connected") return "Caminhos sociais liberados";
  if (state === "outgoing_pending") return "Aguardando aceite";
  if (state === "incoming_pending") return "Solicitação recebida";
  if (state === "self") return "Seu perfil aparece no radar";
  if (state === "unauthorized") return "Entre para conectar";
  if (state === "blocked") return "Conexão bloqueada";
  if (state === "suspended") return "Conexão suspensa";
  if (state === "checking") return "Consultando status da conexão";

  return "Solicite conexão para liberar";
}

function chipStyle(active = false): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 11px",
    borderRadius: 999,
    border: active
      ? `1px solid ${PREMIUM.radarBorder}`
      : "1px solid rgba(255,255,255,0.13)",
    background: active
      ? "linear-gradient(135deg, rgba(0,245,200,0.12), rgba(124,92,255,0.16))"
      : "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 850,
    whiteSpace: "nowrap",
    cursor: "pointer",
  };
}

function actionButtonStyle(primary = false): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    minHeight: 28,
    padding: "2px 0",
    border: 0,
    borderRadius: 0,
    background: "transparent",
    color: primary ? PREMIUM.violet : "rgba(255,255,255,0.84)",
    textDecoration: "none",
    fontSize: 12,
    lineHeight: 1.35,
    fontWeight: 850,
    borderBottom: primary
      ? "1px solid rgba(124,92,255,0.42)"
      : "1px solid rgba(255,255,255,0.18)",
  };
}

function disabledActionButtonStyle(primary = false): CSSProperties {
  return {
    ...actionButtonStyle(primary),
    opacity: 0.48,
    cursor: "not-allowed",
    borderBottomColor: "transparent",
    color: "rgba(255,255,255,0.56)",
  };
}

function connectionButtonStyle(state: ConnectionUiState): CSSProperties {
  const disabled = isConnectionButtonDisabled(state);

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 46,
    padding: "12px 14px",
    borderRadius: 16,
    border:
      state === "outgoing_pending" || state === "connected"
        ? `1px solid ${PREMIUM.radarBorder}`
        : state === "error"
          ? "1px solid rgba(255,85,118,0.42)"
          : `1px solid ${PREMIUM.radarBorder}`,
    background:
      state === "checking"
        ? "linear-gradient(135deg, rgba(124,92,255,0.12), rgba(47,128,255,0.10))"
        : state === "outgoing_pending" || state === "connected"
          ? "linear-gradient(135deg, rgba(0,245,200,0.16), rgba(124,92,255,0.14))"
          : state === "error"
            ? "linear-gradient(135deg, rgba(255,85,118,0.16), rgba(255,255,255,0.04))"
            : "linear-gradient(135deg, rgba(0,245,200,0.15), rgba(47,128,255,0.12), rgba(124,92,255,0.14))",
    color:
      state === "outgoing_pending" || state === "connected"
        ? PREMIUM.radar
        : "#fff",
    textDecoration: "none",
    fontSize: 11,
    fontWeight: 950,
    whiteSpace: "nowrap",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity:
      disabled && state !== "outgoing_pending" && state !== "connected"
        ? 0.72
        : 1,
    boxShadow:
      state === "outgoing_pending" || state === "connected"
        ? "0 0 20px rgba(0,245,200,0.12)"
        : "0 0 18px rgba(124,92,255,0.10)",
  };
}

function sectionTitleStyle(): CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.7,
    opacity: 0.66,
    textTransform: "uppercase",
  };
}

function VisualInteractionGuide() {
  const steps = [
    {
      title: "Encontrar",
      text: "afinidades",
    },
    {
      title: "Conectar",
      text: "com aceite",
    },
    {
      title: "Liberar",
      text: "contato",
    },
    {
      title: "Combinar",
      text: "grupo ou encontro",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        marginBottom: 18,
        padding: "14px 0",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <strong
          style={{
            color: "#fff",
            fontSize: 14,
            lineHeight: 1.2,
          }}
        >
          Como a conexão funciona
        </strong>

        <span
          style={{
            color: PREMIUM.textMuted,
            fontSize: 11,
            lineHeight: 1.45,
          }}
        >
          A afinidade aproxima. O aceite libera os caminhos sociais.
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          alignItems: "stretch",
        }}
      >
        {steps.map((step, index) => (
          <div
            key={step.title}
            style={{
              minWidth: 0,
              display: "grid",
              alignContent: "start",
              gap: 3,
              padding: index === 0 ? "0 9px 0 0" : "0 9px",
              borderLeft:
                index === 0 ? "0" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span
              style={{
                color:
                  step.title === "Conectar"
                    ? PREMIUM.radar
                    : "rgba(255,255,255,0.46)",
                fontSize: 10,
                lineHeight: 1,
                fontWeight: 950,
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            <strong
              style={{
                color: "#fff",
                fontSize: 11,
                lineHeight: 1.15,
                overflowWrap: "anywhere",
              }}
            >
              {step.title}
            </strong>

            <span
              style={{
                color: "rgba(255,255,255,0.58)",
                fontSize: 9,
                lineHeight: 1.25,
                fontWeight: 750,
                overflowWrap: "anywhere",
              }}
            >
              {step.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectionActionPanel({
  sandboxParticipant,
  connectionState,
  connectionFeedback,
  onConnect,
}: {
  sandboxParticipant: boolean;
  connectionState: ConnectionUiState;
  connectionFeedback: string;
  onConnect: () => void;
}) {
  const unlocked = canUnlockSocialPaths(connectionState);
  const statusLabel = sandboxParticipant
    ? "Exemplo"
    : getSocialPathStatusLabel(connectionState);

  const socialPaths = [
    {
      title: "Conversa",
      helper: unlocked ? "Contato liberado" : "Após conexão",
      symbol: "●",
    },
    {
      title: "Grupo",
      helper: unlocked ? "Pode combinar" : "Após conexão",
      symbol: "◇",
    },
    {
      title: "Carona",
      helper: unlocked ? "Organizar rota" : "Após conexão",
      symbol: "↗",
    },
    {
      title: "Encontro",
      helper: unlocked ? "Ponto no evento" : "Após conexão",
      symbol: "◎",
    },
  ];

  return (
    <section
      style={{
        display: "grid",
        gap: 12,
        paddingTop: 16,
        borderTop: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          <span style={sectionTitleStyle()}>Caminhos sociais</span>

          <strong
            style={{
              color: "#fff",
              fontSize: 14,
              lineHeight: 1.25,
            }}
          >
            {getConnectionActionTitle(connectionState, sandboxParticipant)}
          </strong>

          <span
            style={{
              color: "rgba(255,255,255,0.66)",
              fontSize: 11,
              lineHeight: 1.5,
              maxWidth: 560,
            }}
          >
            {sandboxParticipant
              ? "Em perfis reais, o aceite libera conversa, grupo, carona e encontro."
              : connectionFeedback}
          </span>
        </div>

        {sandboxParticipant ? (
          <span
            aria-disabled="true"
            title="Perfil demonstrativo: a solicitação não é enviada."
            style={disabledActionButtonStyle(true)}
          >
            Perfil demonstrativo
          </span>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            disabled={isConnectionButtonDisabled(connectionState)}
            style={{
              ...connectionButtonStyle(connectionState),
              width: "auto",
              minWidth: 156,
              minHeight: 40,
            }}
          >
            {getConnectionLabel(connectionState)}
          </button>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px 22px",
          flexWrap: "wrap",
        }}
      >
        {socialPaths.map((item) => (
          <div
            key={item.title}
            style={{
              minWidth: 112,
              display: "grid",
              gridTemplateColumns: "14px minmax(0, 1fr)",
              gap: "2px 7px",
              alignItems: "start",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                gridRow: "1 / span 2",
                color: unlocked ? PREMIUM.radar : "rgba(255,255,255,0.48)",
                fontSize: 12,
                lineHeight: 1.2,
                fontWeight: 950,
              }}
            >
              {item.symbol}
            </span>

            <strong
              style={{
                color: "#fff",
                fontSize: 11,
                lineHeight: 1.2,
              }}
            >
              {item.title}
            </strong>

            <small
              style={{
                color: unlocked ? PREMIUM.radar : "rgba(255,255,255,0.48)",
                fontSize: 9,
                lineHeight: 1.25,
                fontWeight: 800,
              }}
            >
              {unlocked ? item.helper : statusLabel}
            </small>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompactAffinityGrid({
  tribe,
  city,
  region,
  genres,
  badges,
}: {
  tribe: string;
  city: string;
  region: string;
  genres: string[];
  badges: string[];
}) {
  const visual = getTribeVisual(tribe);
  const mainGenre = genres[0] || visual.shortName;
  const secondGenre = genres[1] || "Vertente principal";
  const mainBadge = badges[0] || "Mesmo evento";

  const items = [
    {
      label: "Tribo",
      value: visual.name,
      sub: visual.shortName,
      accent: visual.accent,
    },
    {
      label: "Base",
      value: city || region || "Evento",
      sub: region || "Presença no evento",
      accent: PREMIUM.radar,
    },
    {
      label: "Som",
      value: mainGenre,
      sub: secondGenre,
      accent: PREMIUM.violet,
    },
    {
      label: "Sinal",
      value: mainBadge,
      sub: "Afinidade social",
      accent: PREMIUM.amber,
    },
  ];

  return (
    <section
      style={{
        display: "grid",
        gap: 10,
        paddingTop: 16,
        borderTop: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <span style={sectionTitleStyle()}>Leitura da conexão</span>

      <dl
        style={{
          margin: 0,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "14px 28px",
        }}
      >
        {items.map((item) => (
          <div
            key={`${item.label}-${item.value}`}
            style={{
              minWidth: 0,
              display: "grid",
              gap: 3,
            }}
          >
            <dt
              style={{
                color: "rgba(255,255,255,0.46)",
                fontSize: 9,
                lineHeight: 1.25,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: 0.55,
              }}
            >
              {item.label}
            </dt>

            <dd
              style={{
                margin: 0,
                minWidth: 0,
                color: item.accent,
                fontSize: 12,
                lineHeight: 1.3,
                fontWeight: 900,
                overflowWrap: "anywhere",
              }}
            >
              {item.value}
            </dd>

            <dd
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.54)",
                fontSize: 9,
                lineHeight: 1.3,
                fontWeight: 750,
                overflowWrap: "anywhere",
              }}
            >
              {item.sub}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ParticipantCard({
  member,
  eventReturnTo,
  selected,
  onToggle,
  onSelfDetected,
}: {
  member: EventParticipant;
  eventReturnTo: string;
  selected: boolean;
  onToggle: () => void;
  onSelfDetected?: (member: EventParticipant) => void;
}) {
  const photo = normalizeText(member.club_photo_url);
  const genres = (member.favorite_genres || []).slice(0, 3);
  const tribe = getClubberTribe(member.favorite_genres || []);
  const tribeVisual = getTribeVisual(tribe);
  const socialMode = getSocialModeLabel(member.event_social_mode);
  const score = member.compatibilityScore || 0;
  const hotMeta = getHotConnectionMeta(score);
  const mainGenre = genres[0] || tribeVisual.shortName;
  const publicProfileHref = getPublicClubberHref(member, eventReturnTo);
  const affinityLabel =
    score >= 85
      ? "Afinidade muito alta"
      : score >= 70
        ? "Afinidade alta"
        : score >= 50
          ? "Boa afinidade"
          : "Afinidade inicial";

  useEffect(() => {
    if (isSandboxParticipant(member) || !member.user_id) {
      return;
    }

    let ignore = false;

    async function detectSelfParticipant() {
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

        if (ignore || !data?.ok) {
          return;
        }

        if (mapApiConnectionState(normalizeText(data?.state)) === "self") {
          onSelfDetected?.(member);
        }
      } catch {
        return;
      }
    }

    detectSelfParticipant();

    return () => {
      ignore = true;
    };
  }, [member, member.user_id, onSelfDetected]);

  return (
    <article
      className="event-radar-card"
      data-selected={selected ? "true" : "false"}
    >
      {publicProfileHref ? (
        <Link
          href={publicProfileHref}
          aria-label={`Abrir perfil público de ${member.label}`}
          title={`Abrir perfil público de ${member.label}`}
          className="event-radar-card__image"
          style={{
            display: "block",
            background: photo
              ? `url(${photo})`
              : "linear-gradient(135deg, rgba(124,92,255,0.24), rgba(47,128,255,0.14))",
            backgroundSize: "cover",
            backgroundPosition: "center",
            cursor: "pointer",
          }}
        />
      ) : (
        <div
          role="img"
          aria-label={`Imagem de ${member.label}`}
          className="event-radar-card__image"
          style={{
            background: photo
              ? `url(${photo})`
              : "linear-gradient(135deg, rgba(124,92,255,0.24), rgba(47,128,255,0.14))",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      <div className="event-radar-card__body">
        <header
          style={{
            display: "grid",
            gap: 4,
          }}
        >
          {publicProfileHref ? (
            <Link
              href={publicProfileHref}
              title={`Abrir perfil público de ${member.label}`}
              className="event-radar-card__profile-link"
              style={{
                width: "fit-content",
                fontSize: 18,
                lineHeight: 1.15,
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              {member.label}
            </Link>
          ) : (
            <strong
              style={{
                color: "#fff",
                fontSize: 18,
                lineHeight: 1.15,
              }}
            >
              {member.label}
            </strong>
          )}

          <span
            style={{
              color: "rgba(255,255,255,0.66)",
              fontSize: 11,
              lineHeight: 1.35,
              fontWeight: 700,
            }}
          >
            {member.city_base || "Presença confirmada no evento"}
          </span>
        </header>

        <dl
          style={{
            margin: 0,
            display: "grid",
            gap: 9,
            paddingTop: 13,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 0.72fr) minmax(0, 1.28fr)",
              gap: 12,
              alignItems: "baseline",
            }}
          >
            <dt
              style={{
                color: "rgba(255,255,255,0.46)",
                fontSize: 10,
                lineHeight: 1.3,
                fontWeight: 850,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Vertente
            </dt>

            <dd
              style={{
                margin: 0,
                minWidth: 0,
                color: "rgba(255,255,255,0.90)",
                fontSize: 11,
                lineHeight: 1.35,
                fontWeight: 850,
                overflowWrap: "anywhere",
              }}
            >
              {mainGenre}
            </dd>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 0.72fr) minmax(0, 1.28fr)",
              gap: 12,
              alignItems: "baseline",
            }}
          >
            <dt
              style={{
                color: "rgba(255,255,255,0.46)",
                fontSize: 10,
                lineHeight: 1.3,
                fontWeight: 850,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Afinidade
            </dt>

            <dd
              style={{
                margin: 0,
                minWidth: 0,
                color: score >= 70 ? hotMeta.color : "rgba(255,255,255,0.82)",
                fontSize: 11,
                lineHeight: 1.35,
                fontWeight: 900,
                overflowWrap: "anywhere",
              }}
            >
              {score > 0 ? `${affinityLabel} · ${score}%` : affinityLabel}
            </dd>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 0.72fr) minmax(0, 1.28fr)",
              gap: 12,
              alignItems: "baseline",
            }}
          >
            <dt
              style={{
                color: "rgba(255,255,255,0.46)",
                fontSize: 10,
                lineHeight: 1.3,
                fontWeight: 850,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Intenção
            </dt>

            <dd
              style={{
                margin: 0,
                minWidth: 0,
                color: "rgba(255,255,255,0.82)",
                fontSize: 11,
                lineHeight: 1.35,
                fontWeight: 800,
                overflowWrap: "anywhere",
              }}
            >
              {socialMode}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={selected}
          className="event-radar-card__toggle"
        >
          <span>{selected ? "Fechar conexão" : "Ver conexão"}</span>

          <span
            aria-hidden="true"
            style={{
              color: selected ? PREMIUM.radar : "rgba(255,255,255,0.76)",
              fontSize: 24,
              lineHeight: 1,
              fontWeight: 500,
            }}
          >
            {selected ? "−" : "+"}
          </span>
        </button>
      </div>
    </article>
  );
}

function ParticipantConnectionDetails({
  member,
  eventReturnTo,
  officialEventUrl,
  onClose,
  onSelfDetected,
}: {
  member: EventParticipant;
  eventReturnTo: string;
  officialEventUrl?: string;
  onClose: () => void;
  onSelfDetected?: (member: EventParticipant) => void;
}) {
  const [connectionState, setConnectionState] =
    useState<ConnectionUiState>("idle");
  const [connectionFeedback, setConnectionFeedback] = useState(
    getConnectionFeedback("idle"),
  );

  const genres = (member.favorite_genres || []).slice(0, 3);
  const tribe = getClubberTribe(member.favorite_genres || []);
  const state = getStateFromCityBase(member.city_base);
  const region = getRegionFromState(state);
  const sandboxParticipant = isSandboxParticipant(member);
  const publicProfileHref = getPublicClubberHref(member, eventReturnTo);
  const score = member.compatibilityScore || 0;
  const hotMeta = getHotConnectionMeta(score);
  const visibleAffinityBadges = (member.compatibilityBadges || [])
    .filter((badge) => {
      const normalized = normalizeText(badge).toLowerCase();

      if (!normalized) return false;
      if (normalized.includes("100")) return false;
      if (normalized.includes("compatível")) return false;

      return true;
    })
    .slice(0, 4);

  useEffect(() => {
    if (sandboxParticipant || !member.user_id) {
      return;
    }

    let ignore = false;

    async function loadConnectionStatus() {
      setConnectionState("checking");
      setConnectionFeedback(getConnectionFeedback("checking"));

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

        if (response.status === 401 || code === "UNAUTHORIZED") {
          setConnectionState("unauthorized");
          setConnectionFeedback(getConnectionFeedback("unauthorized"));
          return;
        }

        if (data?.ok) {
          const nextState = mapApiConnectionState(apiState);

          setConnectionState(nextState);
          setConnectionFeedback(getConnectionFeedback(nextState));

          if (nextState === "self") {
            onSelfDetected?.(member);
          }

          return;
        }

        setConnectionState("idle");
        setConnectionFeedback(getConnectionFeedback("idle"));
      } catch {
        if (!ignore) {
          setConnectionState("idle");
          setConnectionFeedback(getConnectionFeedback("idle"));
        }
      }
    }

    loadConnectionStatus();

    return () => {
      ignore = true;
    };
  }, [member, member.user_id, onSelfDetected, sandboxParticipant]);

  async function handleConnectionRequest() {
    if (sandboxParticipant || isConnectionButtonDisabled(connectionState)) {
      return;
    }

    setConnectionState("sending");
    setConnectionFeedback("Enviando solicitação de conexão...");

    try {
      const response = await fetch("/api/network/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: member.user_id,
        }),
      });

      const data = await response.json().catch(() => null);
      const code = normalizeText(data?.code);
      const apiState = normalizeText(data?.state);

      if (response.status === 401 || code === "UNAUTHORIZED") {
        setConnectionState("unauthorized");
        setConnectionFeedback(getConnectionFeedback("unauthorized"));
        return;
      }

      if (data?.ok && apiState === "outgoing_pending") {
        setConnectionState("outgoing_pending");
        setConnectionFeedback(getConnectionFeedback("outgoing_pending"));
        return;
      }

      if (code === "ALREADY_CONNECTED") {
        setConnectionState("connected");
        setConnectionFeedback(getConnectionFeedback("connected"));
        return;
      }

      if (code === "REQUEST_ALREADY_SENT") {
        setConnectionState("outgoing_pending");
        setConnectionFeedback(getConnectionFeedback("outgoing_pending"));
        return;
      }

      if (code === "INCOMING_REQUEST_EXISTS") {
        setConnectionState("incoming_pending");
        setConnectionFeedback(getConnectionFeedback("incoming_pending"));
        return;
      }

      if (code === "RELATIONSHIP_BLOCKED") {
        setConnectionState("blocked");
        setConnectionFeedback(getConnectionFeedback("blocked"));
        return;
      }

      if (code === "RELATIONSHIP_SUSPENDED") {
        setConnectionState("suspended");
        setConnectionFeedback(getConnectionFeedback("suspended"));
        return;
      }

      if (code === "INVALID_TARGET") {
        setConnectionState("self");
        setConnectionFeedback(getConnectionFeedback("self"));
        onSelfDetected?.(member);
        return;
      }

      setConnectionState("error");
      setConnectionFeedback(getConnectionFeedback("error"));
    } catch {
      setConnectionState("error");
      setConnectionFeedback(getConnectionFeedback("error"));
    }
  }

  return (
    <section
      className="event-radar-detail"
      aria-label={`Detalhes da conexão com ${member.label}`}
    >
      <header className="event-radar-detail__header">
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          <span style={sectionTitleStyle()}>Conexão selecionada</span>

          <strong
            style={{
              color: "#fff",
              fontSize: 20,
              lineHeight: 1.15,
            }}
          >
            Conexão com {member.label}
          </strong>

          <span
            style={{
              color: "rgba(255,255,255,0.64)",
              fontSize: 11,
              lineHeight: 1.45,
            }}
          >
            {member.city_base || "Presença confirmada no evento"}
            {score > 0 ? ` · ${score}% de afinidade` : ""}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="event-radar-detail__close"
        >
          Fechar detalhes
          <span aria-hidden="true">−</span>
        </button>
      </header>

      <section
        style={{
          display: "grid",
          gap: 6,
          paddingTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.09)",
        }}
      >
        <span style={sectionTitleStyle()}>Por que combina</span>

        <strong
          style={{
            color: "#fff",
            fontSize: 14,
            lineHeight: 1.25,
          }}
        >
          {hotMeta.label}
        </strong>

        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.68)",
            fontSize: 11,
            lineHeight: 1.55,
            maxWidth: 760,
          }}
        >
          {member.club_tagline || hotMeta.description}
        </p>
      </section>

      <ConnectionActionPanel
        sandboxParticipant={sandboxParticipant}
        connectionState={connectionState}
        connectionFeedback={connectionFeedback}
        onConnect={handleConnectionRequest}
      />

      <CompactAffinityGrid
        tribe={tribe}
        city={member.city_base}
        region={region}
        genres={genres}
        badges={visibleAffinityBadges}
      />

      {genres.length > 0 ? (
        <section
          style={{
            display: "grid",
            gap: 7,
            paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <span style={sectionTitleStyle()}>Vertentes</span>

          <p
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.78)",
              fontSize: 11,
              lineHeight: 1.55,
              fontWeight: 800,
            }}
          >
            {genres.join(" · ")}
          </p>
        </section>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px 22px",
          flexWrap: "wrap",
          paddingTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.09)",
        }}
      >
        {!publicProfileHref ? (
          <span
            aria-disabled="true"
            title="Perfil público ainda não disponível"
            style={disabledActionButtonStyle(true)}
          >
            Perfil indisponível
          </span>
        ) : (
          <Link
            href={publicProfileHref}
            style={actionButtonStyle(true)}
          >
            Ver perfil público
          </Link>
        )}

        {officialEventUrl ? (
          <a
            href={officialEventUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={actionButtonStyle()}
          >
            Abrir evento
          </a>
        ) : (
          <span
            aria-disabled="true"
            title="Link oficial do evento não informado"
            style={disabledActionButtonStyle()}
          >
            Evento indisponível
          </span>
        )}
      </div>
    </section>
  );
}

function ParticipantResults({
  members,
  eventReturnTo,
  officialEventUrl,
  expandedParticipantKey,
  onToggleParticipant,
  onSelfDetected,
  emptyTitle,
  emptyText,
}: {
  members: EventParticipant[];
  eventReturnTo: string;
  officialEventUrl?: string;
  expandedParticipantKey: string;
  onToggleParticipant: (key: string) => void;
  onSelfDetected?: (member: EventParticipant) => void;
  emptyTitle: string;
  emptyText: string;
}) {
  if (members.length === 0) {
    return (
      <div
        style={{
          display: "grid",
          gap: 5,
          padding: "16px 0",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <strong
          style={{
            color: "#fff",
            fontSize: 13,
            lineHeight: 1.3,
          }}
        >
          {emptyTitle}
        </strong>

        <span
          style={{
            color: "rgba(255,255,255,0.62)",
            fontSize: 11,
            lineHeight: 1.45,
          }}
        >
          {emptyText}
        </span>
      </div>
    );
  }

  const selectedMember =
    members.find(
      (member) =>
        `${member.user_id}-${member.slug}` === expandedParticipantKey,
    ) || null;

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      <div className="event-radar-results-shell">
        <div className="event-radar-results">
          {members.map((member) => {
            const key = `${member.user_id}-${member.slug}`;

            return (
              <ParticipantCard
                key={`participant-card-${key}`}
                member={member}
                eventReturnTo={eventReturnTo}
                selected={expandedParticipantKey === key}
                onToggle={() => onToggleParticipant(key)}
                onSelfDetected={onSelfDetected}
              />
            );
          })}
        </div>
      </div>

      {selectedMember ? (
        <ParticipantConnectionDetails
          key={`participant-details-${expandedParticipantKey}`}
          member={selectedMember}
          eventReturnTo={eventReturnTo}
          officialEventUrl={officialEventUrl}
          onClose={() => onToggleParticipant(expandedParticipantKey)}
          onSelfDetected={onSelfDetected}
        />
      ) : null}
    </div>
  );
}

export default function EventParticipantsFilter({
  attendees,
  eventReturnTo,
  officialEventUrl,
}: {
  attendees: EventParticipant[];
  eventReturnTo: string;
  officialEventUrl?: string;
}) {
  const [radarView, setRadarView] = useState<RadarView>("for-you");
  const [mode, setMode] = useState<FilterMode>("all");
  const [value, setValue] = useState("");
  const [activeGroup, setActiveGroup] = useState<FilterGroup>("none");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selfUserId, setSelfUserId] = useState("");
  const [expandedParticipantKey, setExpandedParticipantKey] = useState("");
  const [selectedTribe, setSelectedTribe] = useState("");

  const socialParticipants: EventParticipant[] = useMemo(
    () =>
      DEV_SOCIAL_SANDBOX ? [...attendees, ...MOCK_PARTICIPANTS] : attendees,
    [attendees],
  );

  const handleSelfDetected = useCallback((member: EventParticipant) => {
    setSelfUserId((current) => {
      if (current === member.user_id) return current;
      return member.user_id;
    });
  }, []);

  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          socialParticipants
            .map((member) => normalizeText(member.city_base))
            .filter(Boolean),
        ),
      )
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .slice(0, 40),
    [socialParticipants],
  );

  const states = useMemo(
    () =>
      Array.from(
        new Set(
          socialParticipants
            .map((member) => getStateFromCityBase(member.city_base))
            .filter(Boolean),
        ),
      )
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .slice(0, 27),
    [socialParticipants],
  );

  const regions = useMemo(
    () =>
      Array.from(
        new Set(
          states.map((state) => getRegionFromState(state)).filter(Boolean),
        ),
      )
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .slice(0, 5),
    [states],
  );

  const genres = useMemo(
    () =>
      Array.from(
        new Set(
          socialParticipants
            .flatMap((member) => member.favorite_genres || [])
            .map((item) => normalizeText(item))
            .filter(Boolean),
        ),
      )
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .slice(0, 40),
    [socialParticipants],
  );

  const enrichedAttendees = useMemo(() => {
    return socialParticipants.map((member) => {
      const memberGenres = (member.favorite_genres || []).map((item) =>
        normalizeText(item),
      );

      let score = member.compatibilityScore || 0;
      const badges: string[] = [...(member.compatibilityBadges || [])];

      if (memberGenres.length >= 2 && !badges.includes("Vertentes similares")) {
        score += 40;
        badges.push("Vertentes similares");
      }

      const state = getStateFromCityBase(member.city_base);
      const region = getRegionFromState(state);

      if (state && !badges.includes(`Estado ${state}`)) {
        score += 20;
        badges.push(`Estado ${state}`);
      }

      if (region && !badges.includes(region)) {
        score += 10;
        badges.push(region);
      }

      const socialMode = normalizeText(member.event_social_mode).toLowerCase();

      if (socialMode && !badges.includes("Presença social ativa")) {
        score += 10;
        badges.push("Presença social ativa");
      }

      return {
        ...member,
        compatibilityScore: Math.min(score, 100),
        compatibilityBadges: badges.slice(0, 4),
      };
    });
  }, [socialParticipants]);

  const selfParticipant = useMemo(
    () => enrichedAttendees.find((member) => member.user_id === selfUserId),
    [enrichedAttendees, selfUserId],
  );

  const nearYouMatches = useMemo(() => {
    if (!selfParticipant) return [];

    return enrichedAttendees
      .filter((member) => member.user_id !== selfParticipant.user_id)
      .map((member) => buildProximityMatch(selfParticipant, member))
      .filter((match) => match.score >= 25)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [enrichedAttendees, selfParticipant]);

  const nearYouIds = useMemo(
    () => new Set(nearYouMatches.map((match) => match.member.user_id)),
    [nearYouMatches],
  );

  const topTribes = useMemo(() => {
    const counts = new Map<string, number>();

    for (const member of enrichedAttendees) {
      const tribe = getClubberTribe(member.favorite_genres || []);
      counts.set(tribe, (counts.get(tribe) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([tribe, count]) => ({
        tribe,
        count,
        visual: getTribeVisual(tribe),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [enrichedAttendees]);

  const hotConnections = useMemo(() => {
    return [...enrichedAttendees]
      .filter((member) => (member.compatibilityScore || 0) >= 70)
      .sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0))
      .slice(0, 6);
  }, [enrichedAttendees]);

  const nearResults = useMemo(
    () =>
      nearYouMatches.map((match) => ({
        ...match.member,
        compatibilityScore: match.score,
        compatibilityBadges: match.reasons,
      })),
    [nearYouMatches],
  );

  const activeTribe = selectedTribe || topTribes[0]?.tribe || "";

  const tribeResults = useMemo(
    () =>
      activeTribe
        ? enrichedAttendees.filter(
            (member) =>
              getClubberTribe(member.favorite_genres || []) === activeTribe,
          )
        : [],
    [activeTribe, enrichedAttendees],
  );

  const filtered = useMemo(() => {
    return enrichedAttendees
      .filter((member) => {
        const city = normalizeText(member.city_base);
        const state = getStateFromCityBase(member.city_base);
        const region = getRegionFromState(state);
        const memberGenres = (member.favorite_genres || []).map((item) =>
          normalizeText(item),
        );

        if (mode === "hot") return (member.compatibilityScore || 0) >= 70;
        if (mode === "near") return nearYouIds.has(member.user_id);
        if (mode === "city") return city === value;
        if (mode === "state") return state === value;
        if (mode === "region") return region === value;
        if (mode === "genre") return memberGenres.includes(value);

        return true;
      })
      .sort((a, b) => {
        const scoreA = a.compatibilityScore || 0;
        const scoreB = b.compatibilityScore || 0;

        if (scoreA !== scoreB) return scoreB - scoreA;

        const networkingA = normalizeText(a.event_social_mode).includes(
          "network",
        );
        const networkingB = normalizeText(b.event_social_mode).includes(
          "network",
        );

        if (networkingA !== networkingB) return networkingB ? 1 : -1;

        const genresA = a.favorite_genres?.length || 0;
        const genresB = b.favorite_genres?.length || 0;

        return genresB - genresA;
      });
  }, [enrichedAttendees, mode, nearYouIds, value]);

  function selectFilter(nextMode: FilterMode, nextValue = "") {
    setExpandedParticipantKey("");
    setRadarView("for-you");
    setMode(nextMode);
    setValue(nextValue);

    if (nextMode === "all" || nextMode === "hot" || nextMode === "near") {
      setActiveGroup("none");
      setFiltersOpen(false);
    }
  }

  function selectRadarTab(nextView: RadarView) {
    setExpandedParticipantKey("");
    setRadarView(nextView);
    setValue("");
    setActiveGroup("none");
    setFiltersOpen(false);

    if (nextView === "hot") {
      setMode("hot");
      return;
    }

    if (nextView === "near") {
      setMode("near");
      return;
    }

    setMode("all");
  }

  function toggleGroup(group: FilterGroup) {
    setExpandedParticipantKey("");
    setRadarView("for-you");
    setFiltersOpen(true);
    setActiveGroup((current) => (current === group ? "none" : group));
  }

  function toggleParticipant(key: string) {
    setExpandedParticipantKey((current) => (current === key ? "" : key));
  }

  return (
    <>
      <style jsx global>{`
        .event-radar-results-shell {
          position: relative;
          width: 100%;
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
        }

        .event-radar-results {
          width: 100%;
          min-width: 0;
          max-width: 100%;
          display: flex;
          align-items: stretch;
          gap: 14px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 2px 0 8px;
          scroll-snap-type: x proximity;
          overscroll-behavior-inline: contain;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .event-radar-results::-webkit-scrollbar,
        .event-tribe-selector-list::-webkit-scrollbar {
          display: none;
        }

        .event-radar-card {
          min-width: 0;
          flex: 0 0 260px;
          width: 260px;
          max-width: calc(100vw - 64px);
          display: flex;
          flex-direction: column;
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(
            180deg,
            rgba(22, 22, 34, 0.82),
            rgba(10, 10, 17, 0.96)
          );
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          scroll-snap-align: start;
        }

        .event-radar-card[data-selected="true"] {
          border-color: rgba(0, 245, 200, 0.3);
          box-shadow:
            0 16px 36px rgba(0, 0, 0, 0.32),
            0 0 24px rgba(0, 245, 200, 0.08);
        }

        .event-radar-card__image {
          min-height: 168px;
          flex: 0 0 168px;
        }

        .event-radar-card__profile-link {
          color: #fff;
          transition:
            color 160ms ease,
            text-shadow 160ms ease;
        }

        @media (hover: hover) {
          .event-radar-card__profile-link:hover {
            color: #28e6c2;
            text-shadow: 0 0 18px rgba(40, 230, 194, 0.18);
          }
        }

        .event-radar-card__profile-link:focus-visible {
          color: #28e6c2;
          outline: none;
          text-decoration: underline;
          text-decoration-thickness: 1px;
          text-underline-offset: 4px;
        }

        .event-radar-card__profile-link:active {
          color: #28e6c2;
        }

        .event-radar-card__body {
          min-height: 272px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 16px;
        }

        .event-radar-card__toggle {
          min-height: 50px;
          width: 100%;
          margin-top: auto;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 12px 14px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.13);
          background: rgba(255,255,255,0.025);
          color: #fff;
          font-size: 13px;
          line-height: 1.2;
          font-weight: 950;
          cursor: pointer;
        }

        .event-radar-card[data-selected="true"] .event-radar-card__toggle {
          border-color: rgba(0,245,200,0.26);
          background:
            linear-gradient(
              135deg,
              rgba(0,245,200,0.08),
              rgba(124,92,255,0.08)
            );
        }

        .event-radar-detail {
          display: grid;
          gap: 16px;
          padding: 22px 0 6px;
          border-top: 1px solid rgba(0,245,200,0.18);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .event-radar-detail__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }

        .event-radar-detail__close {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 2px 0;
          border: 0;
          border-bottom: 1px solid rgba(0,245,200,0.34);
          background: transparent;
          color: rgba(255,255,255,0.82);
          font-size: 11px;
          line-height: 1.3;
          font-weight: 850;
          cursor: pointer;
        }

        .event-tribe-selector-list {
          display: flex;
          align-items: stretch;
          gap: 22px;
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: 2px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .event-tribe-selector {
          flex: 0 0 auto;
          min-width: 150px;
          display: grid;
          grid-template-columns: 8px minmax(0, 1fr);
          gap: 4px 9px;
          align-items: center;
          padding: 10px 0 11px;
          border: 0;
          border-bottom: 2px solid transparent;
          background: transparent;
          color: rgba(255,255,255,0.62);
          text-align: left;
          cursor: pointer;
        }

        .event-tribe-selector[data-active="true"] {
          color: #fff;
          border-bottom-color: #00f5c8;
        }

        .event-tribe-selector__dot {
          grid-row: 1 / span 2;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,0.22);
        }

        .event-tribe-selector[data-active="true"]
        .event-tribe-selector__dot {
          background: #00f5c8;
          box-shadow: 0 0 12px rgba(0,245,200,0.34);
        }

        .event-tribe-selector__name {
          color: inherit;
          font-size: 12px;
          line-height: 1.25;
          font-weight: 900;
          white-space: nowrap;
        }

        .event-tribe-selector__count {
          color: rgba(255,255,255,0.48);
          font-size: 10px;
          line-height: 1.25;
          font-weight: 750;
        }

        .event-tribe-selector[data-active="true"]
        .event-tribe-selector__count {
          color: rgba(0,245,200,0.82);
        }

        @media (max-width: 760px) {
          .event-radar-results {
            gap: 12px;
            padding-bottom: 6px;
            scroll-snap-type: x mandatory;
          }

          .event-radar-card {
            flex: 0 0 min(84vw, 310px);
            width: min(84vw, 310px);
            max-width: min(84vw, 310px);
          }

          .event-radar-card__body {
            min-height: 286px;
          }

          .event-radar-detail {
            padding-top: 18px;
          }

          .event-radar-detail__header {
            display: grid;
          }

          .event-tribe-selector-list {
            gap: 18px;
            scroll-snap-type: x proximity;
          }

          .event-tribe-selector {
            min-width: 148px;
            scroll-snap-align: start;
          }
        }
      `}</style>

      <VisualInteractionGuide />

      <div
        style={{
          display: "grid",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <strong
            style={{
              color: "#fff",
              fontSize: 15,
              lineHeight: 1.2,
            }}
          >
            Radar social do evento
          </strong>

          <span
            style={{
              color: "rgba(255,255,255,0.66)",
              fontSize: 11,
              lineHeight: 1.45,
            }}
          >
            Escolha uma visão. O radar mostra somente um grupo de resultados por
            vez.
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Visões do radar social"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {(
            [
              {
                key: "for-you",
                label: "Para você",
                count: socialParticipants.length,
              },
              {
                key: "hot",
                label: "Conexões quentes",
                count: hotConnections.length,
              },
              {
                key: "near",
                label: "Próximos",
                count: nearYouMatches.length,
              },
              {
                key: "tribes",
                label: "Tribos",
                count: topTribes.length,
              },
            ] as const
          ).map((tab, index) => {
            const active = radarView === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectRadarTab(tab.key)}
                style={{
                  minWidth: 0,
                  minHeight: 46,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "10px 11px",
                  border: 0,
                  borderRight:
                    index % 2 === 0 ? "1px solid rgba(255,255,255,0.08)" : "0",
                  borderBottom:
                    index < 2 ? "1px solid rgba(255,255,255,0.08)" : "0",
                  background: active
                    ? "linear-gradient(135deg, rgba(0,245,200,0.10), rgba(124,92,255,0.08))"
                    : "transparent",
                  boxShadow: active
                    ? "inset 0 -2px 0 rgba(0,245,200,0.82)"
                    : "none",
                  color: active ? "#fff" : "rgba(255,255,255,0.62)",
                  fontSize: 11,
                  lineHeight: 1.2,
                  fontWeight: active ? 950 : 800,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>{tab.label}</span>

                <span
                  style={{
                    color: active ? PREMIUM.radar : "rgba(255,255,255,0.40)",
                    fontSize: 10,
                    fontWeight: 950,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {radarView === "near" ? (
        <section
          style={{
            display: "grid",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <strong
              style={{
                color: "#fff",
                fontSize: 15,
                lineHeight: 1.2,
              }}
            >
              Clubbers próximos de você
            </strong>

            <span
              style={{
                color: PREMIUM.textMuted,
                fontSize: 11,
                lineHeight: 1.45,
              }}
            >
              {selfParticipant
                ? `Radar baseado em ${selfParticipant.city_base || "sua presença no evento"}, região, tribo e som.`
                : "Identificando seu perfil no evento para calcular proximidade cultural."}
            </span>
          </div>

          <ParticipantResults
            eventReturnTo={eventReturnTo}
            members={nearResults}
            officialEventUrl={officialEventUrl}
            expandedParticipantKey={expandedParticipantKey}
            onToggleParticipant={toggleParticipant}
            onSelfDetected={handleSelfDetected}
            emptyTitle="Ainda não há clubbers próximos suficientes"
            emptyText="À medida que mais pessoas entrarem no radar, o sistema destacará afinidades por cidade, região, tribo e som."
          />
        </section>
      ) : null}

      {radarView === "hot" ? (
        <section
          style={{
            display: "grid",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <strong
              style={{
                color: "#fff",
                fontSize: 15,
                lineHeight: 1.2,
              }}
            >
              Conexões quentes no radar
            </strong>

            <span
              style={{
                color: PREMIUM.textMuted,
                fontSize: 11,
                lineHeight: 1.45,
              }}
            >
              Clubbers com maior chance de afinidade neste evento.
            </span>
          </div>

          <ParticipantResults
            eventReturnTo={eventReturnTo}
            members={hotConnections}
            officialEventUrl={officialEventUrl}
            expandedParticipantKey={expandedParticipantKey}
            onToggleParticipant={toggleParticipant}
            onSelfDetected={handleSelfDetected}
            emptyTitle="Ainda não há conexões quentes suficientes"
            emptyText="O radar destacará novas conexões conforme os sinais de afinidade forem aumentando."
          />
        </section>
      ) : null}

      {radarView === "tribes" ? (
        <section
          style={{
            display: "grid",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <strong
              style={{
                color: "#fff",
                fontSize: 15,
                lineHeight: 1.2,
              }}
            >
              Tribos em destaque neste evento
            </strong>

            <span
              style={{
                color: PREMIUM.textMuted,
                fontSize: 11,
                lineHeight: 1.45,
              }}
            >
              Escolha uma tribo para ver os Clubbers relacionados.
            </span>
          </div>

          <div
            className="event-tribe-selector-list"
            aria-label="Seleção de tribos em destaque"
          >
            {topTribes.map(({ tribe, count, visual }) => {
              const active = activeTribe === tribe;

              return (
                <button
                  key={`tribe-selector-${tribe}`}
                  type="button"
                  className="event-tribe-selector"
                  data-active={active ? "true" : "false"}
                  onClick={() => {
                    setExpandedParticipantKey("");
                    setSelectedTribe(tribe);
                  }}
                >
                  <span
                    className="event-tribe-selector__dot"
                    aria-hidden="true"
                  />

                  <strong className="event-tribe-selector__name">
                    {visual.name}
                  </strong>

                  <span className="event-tribe-selector__count">
                    {count === 1 ? "1 Clubber" : `${count} Clubbers`}
                  </span>
                </button>
              );
            })}
          </div>

          <ParticipantResults
            eventReturnTo={eventReturnTo}
            members={tribeResults}
            officialEventUrl={officialEventUrl}
            expandedParticipantKey={expandedParticipantKey}
            onToggleParticipant={toggleParticipant}
            onSelfDetected={handleSelfDetected}
            emptyTitle="Nenhum Clubber nesta tribo"
            emptyText="Selecione outra tribo para continuar explorando o radar."
          />
        </section>
      ) : null}

      {radarView === "for-you" ? (
        <>
          <div
            style={{
              display: "grid",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setFiltersOpen((current) => {
                  const next = !current;

                  if (!next) {
                    setActiveGroup("none");
                  }

                  return next;
                });
              }}
              aria-expanded={filtersOpen}
              style={{
                width: "fit-content",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: 0,
                border: 0,
                background: "transparent",
                color: filtersOpen ? PREMIUM.radar : "rgba(255,255,255,0.76)",
                fontSize: 11,
                lineHeight: 1.2,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Filtrar resultados
              <span aria-hidden="true">{filtersOpen ? "−" : "+"}</span>
            </button>

            {filtersOpen ? (
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  paddingTop: 12,
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => toggleGroup("cities")}
                    style={chipStyle(activeGroup === "cities")}
                  >
                    Cidades
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleGroup("states")}
                    style={chipStyle(activeGroup === "states")}
                  >
                    Estados
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleGroup("regions")}
                    style={chipStyle(activeGroup === "regions")}
                  >
                    Regiões
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleGroup("genres")}
                    style={chipStyle(activeGroup === "genres")}
                  >
                    Vertentes
                  </button>
                </div>

                {activeGroup !== "none" ? (
                  <div
                    style={{
                      display: "grid",
                      gap: 9,
                      paddingTop: 10,
                      borderTop: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 900,
                        opacity: 0.62,
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                      }}
                    >
                      {activeGroup === "cities"
                        ? "Cidades"
                        : activeGroup === "states"
                          ? "Estados"
                          : activeGroup === "regions"
                            ? "Regiões"
                            : "Vertentes"}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {activeGroup === "cities"
                        ? cities.map((city) => (
                            <button
                              key={`filter-city-${city}`}
                              type="button"
                              onClick={() => selectFilter("city", city)}
                              style={chipStyle(
                                mode === "city" && value === city,
                              )}
                            >
                              {city}
                            </button>
                          ))
                        : null}

                      {activeGroup === "states"
                        ? states.map((state) => (
                            <button
                              key={`filter-state-${state}`}
                              type="button"
                              onClick={() => selectFilter("state", state)}
                              style={chipStyle(
                                mode === "state" && value === state,
                              )}
                            >
                              {state}
                            </button>
                          ))
                        : null}

                      {activeGroup === "regions"
                        ? regions.map((region) => (
                            <button
                              key={`filter-region-${region}`}
                              type="button"
                              onClick={() => selectFilter("region", region)}
                              style={chipStyle(
                                mode === "region" && value === region,
                              )}
                            >
                              {region}
                            </button>
                          ))
                        : null}

                      {activeGroup === "genres"
                        ? genres.map((genre) => (
                            <button
                              key={`filter-genre-${genre}`}
                              type="button"
                              onClick={() => selectFilter("genre", genre)}
                              style={chipStyle(
                                mode === "genre" && value === genre,
                              )}
                            >
                              {genre}
                            </button>
                          ))
                        : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div
            style={{
              marginBottom: 10,
              fontSize: 12,
              opacity: 0.82,
              fontWeight: 750,
            }}
          >
            {mode === "hot"
              ? filtered.length === 1
                ? "1 conexão quente no radar"
                : `${filtered.length} conexões quentes no radar`
              : mode === "near"
                ? filtered.length === 1
                  ? "1 clubber próximo de você"
                  : `${filtered.length} clubbers próximos de você`
                : mode === "genre" && value
                  ? `${filtered.length} Clubber${
                      filtered.length === 1 ? "" : "s"
                    } conectados pela vertente ${value}`
                  : mode === "city" && value
                    ? `${filtered.length} Clubber${
                        filtered.length === 1 ? "" : "s"
                      } da cidade ${value}`
                    : mode === "state" && value
                      ? `${filtered.length} Clubber${
                          filtered.length === 1 ? "" : "s"
                        } do estado ${value}`
                      : mode === "region" && value
                        ? `${filtered.length} Clubber${
                            filtered.length === 1 ? "" : "s"
                          } da região ${value}`
                        : `${filtered.length} Clubber${
                            filtered.length === 1 ? "" : "s"
                          } conectados a este evento`}
          </div>

          <ParticipantResults
            eventReturnTo={eventReturnTo}
            members={filtered}
            officialEventUrl={officialEventUrl}
            expandedParticipantKey={expandedParticipantKey}
            onToggleParticipant={toggleParticipant}
            onSelfDetected={handleSelfDetected}
            emptyTitle="Nenhum Clubber encontrado"
            emptyText="Ajuste os filtros ou volte para a visão geral do radar."
          />
        </>
      ) : null}
    </>
  );
}
