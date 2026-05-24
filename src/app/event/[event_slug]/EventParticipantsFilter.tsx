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

type FilterMode = "all" | "hot" | "near" | "city" | "state" | "region" | "genre";

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
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isSandboxParticipant(member: EventParticipant): boolean {
  return (
    normalizeText(member.user_id).startsWith("TEST_SANDBOX_") ||
    normalizeText(member.slug).startsWith("sandbox-")
  );
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
    normalizeText(genre).toLowerCase()
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
      description: "Boa combinação de vertentes, localização e intenção social.",
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
  const left = a.map((item) => normalizeText(item).toLowerCase()).filter(Boolean);
  const right = b.map((item) => normalizeText(item).toLowerCase()).filter(Boolean);

  return left.filter((genre) => right.includes(genre));
}

function buildProximityMatch(
  selfParticipant: EventParticipant,
  candidate: EventParticipant
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
    candidate.favorite_genres || []
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

function getInitials(name: string): string {
  const parts = normalizeText(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "CL";

  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function ProfileAvatar({
  name,
  photoUrl,
  size = 52,
  accent = PREMIUM.radar,
}: {
  name: string;
  photoUrl?: string;
  size?: number;
  accent?: string;
}) {
  const photo = normalizeText(photoUrl);

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: "999px",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid rgba(255,255,255,0.14)",
        background:
          "linear-gradient(135deg, rgba(124,92,255,0.18), rgba(47,128,255,0.16), rgba(0,245,200,0.10))",
        boxShadow: `0 0 18px ${accent === PREMIUM.radar ? "rgba(0,245,200,0.10)" : "rgba(124,92,255,0.10)"}`,
        flexShrink: 0,
      }}
    >
      {photo ? (
        <img
          src={photo}
          alt={name}
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
            fontSize: Math.max(12, Math.round(size * 0.28)),
            fontWeight: 900,
            letterSpacing: 0.4,
          }}
        >
          {getInitials(name)}
        </span>
      )}
    </div>
  );
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
  sandboxParticipant: boolean
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

function carouselStyle(): CSSProperties {
  return {
    display: "flex",
    gap: 14,
    overflowX: "auto",
    paddingBottom: 8,
    scrollSnapType: "x mandatory",
  };
}

function profileCardStyle(): CSSProperties {
  return {
    minWidth: 292,
    maxWidth: 292,
    flex: "0 0 292px",
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,0.11)",
    background:
      "linear-gradient(180deg, rgba(24,24,39,0.76), rgba(12,12,20,0.94))",
    boxShadow: "0 18px 44px rgba(0,0,0,0.38)",
    overflow: "hidden",
    scrollSnapAlign: "start",
    backdropFilter: "blur(14px)",
  };
}

function actionButtonStyle(primary = false): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "11px 12px",
    borderRadius: 14,
    border: primary
      ? "1px solid rgba(124,92,255,0.34)"
      : "1px solid rgba(255,255,255,0.14)",
    background: primary
      ? "linear-gradient(135deg, rgba(124,92,255,0.18), rgba(47,128,255,0.12))"
      : "rgba(255,255,255,0.055)",
    color: "#fff",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 850,
  };
}

function disabledActionButtonStyle(primary = false): CSSProperties {
  return {
    ...actionButtonStyle(primary),
    opacity: 0.62,
    cursor: "not-allowed",
    color: "rgba(255,255,255,0.72)",
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

function socialBadgeStyle(): CSSProperties {
  return {
    display: "inline-flex",
    width: "fit-content",
    padding: "6px 9px",
    borderRadius: 999,
    border: "1px solid rgba(124,92,255,0.22)",
    background: "rgba(124,92,255,0.12)",
    color: "rgba(255,255,255,0.88)",
    fontSize: 11,
    fontWeight: 850,
  };
}

function sectionCardStyle(highlight = false): CSSProperties {
  return {
    display: "grid",
    gap: 8,
    padding: 12,
    borderRadius: 16,
    background: highlight
      ? "linear-gradient(135deg, rgba(124,92,255,0.10), rgba(47,128,255,0.05))"
      : "rgba(255,255,255,0.035)",
    border: highlight
      ? "1px solid rgba(124,92,255,0.18)"
      : "1px solid rgba(255,255,255,0.07)",
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

function visualTileStyle(active = false): CSSProperties {
  return {
    display: "grid",
    gap: 5,
    padding: 10,
    borderRadius: 16,
    border: active
      ? `1px solid ${PREMIUM.radarBorder}`
      : "1px solid rgba(255,255,255,0.10)",
    background: active
      ? "linear-gradient(135deg, rgba(0,245,200,0.10), rgba(124,92,255,0.10))"
      : "rgba(255,255,255,0.045)",
    minHeight: 74,
  };
}

function VisualInteractionGuide() {
  const steps = [
    {
      icon: "◎",
      title: "Encontrar",
      text: "afinidades",
    },
    {
      icon: "↗",
      title: "Conectar",
      text: "com aceite",
    },
    {
      icon: "✓",
      title: "Liberar",
      text: "contato",
    },
    {
      icon: "◇",
      title: "Combinar",
      text: "grupo ou encontro",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        marginBottom: 16,
        padding: 14,
        borderRadius: 22,
        border: "1px solid rgba(124,92,255,0.24)",
        background:
          "linear-gradient(135deg, rgba(124,92,255,0.13), rgba(47,128,255,0.08), rgba(0,245,200,0.045))",
        boxShadow: "0 0 28px rgba(124,92,255,0.10)",
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
          Como a conexão acontece
        </strong>

        <span
          style={{
            color: PREMIUM.textMuted,
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          Primeiro vem a afinidade. Depois vem o aceite. Só então os caminhos
          sociais são liberados.
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        {steps.map((step) => (
          <div key={step.title} style={visualTileStyle(step.title === "Conectar")}>
            <span
              style={{
                width: 30,
                height: 30,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.26)",
                color:
                  step.title === "Conectar"
                    ? PREMIUM.radar
                    : "rgba(255,255,255,0.84)",
                fontSize: 14,
                fontWeight: 950,
              }}
            >
              {step.icon}
            </span>

            <strong
              style={{
                color: "#fff",
                fontSize: 12,
                lineHeight: 1.15,
              }}
            >
              {step.title}
            </strong>

            <span
              style={{
                color: "rgba(255,255,255,0.66)",
                fontSize: 10,
                lineHeight: 1.25,
                fontWeight: 750,
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

function TribePill({
  tribe,
  compact = false,
}: {
  tribe: string;
  compact?: boolean;
}) {
  const visual = getTribeVisual(tribe);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: compact ? 8 : 10,
        alignItems: "center",
        padding: compact ? "8px 10px" : "12px",
        borderRadius: compact ? 16 : 18,
        border: visual.border,
        background: visual.gradient,
        boxShadow: visual.glow,
      }}
    >
      <span
        style={{
          width: compact ? 30 : 38,
          height: compact ? 30 : 38,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          background: "rgba(0,0,0,0.34)",
          border: "1px solid rgba(255,255,255,0.16)",
          fontSize: compact ? 15 : 18,
          flexShrink: 0,
        }}
      >
        {visual.icon}
      </span>

      <span
        style={{
          display: "grid",
          gap: compact ? 1 : 3,
          minWidth: 0,
        }}
      >
        <strong
          style={{
            color: "#fff",
            fontSize: compact ? 12 : 14,
            lineHeight: 1.1,
          }}
        >
          {visual.name}
        </strong>

        {!compact ? (
          <span
            style={{
              color: "rgba(255,255,255,0.76)",
              fontSize: 11,
              lineHeight: 1.35,
            }}
          >
            {visual.description}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function NearYouPanel({
  selfParticipant,
  matches,
  onSelectNear,
}: {
  selfParticipant?: EventParticipant;
  matches: ProximityMatch[];
  onSelectNear: () => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 11,
        marginBottom: 16,
        padding: 14,
        borderRadius: 22,
        border: "1px solid rgba(47,128,255,0.24)",
        background:
          "linear-gradient(135deg, rgba(47,128,255,0.11), rgba(124,92,255,0.11), rgba(0,245,200,0.045))",
        boxShadow: "0 0 28px rgba(47,128,255,0.10)",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 4,
        }}
      >
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
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          {selfParticipant
            ? `Radar baseado em ${selfParticipant.city_base || "sua presença no evento"}, tribo, região e som.`
            : "Detectando seu perfil no evento para sugerir clubbers por cidade, região, tribo e afinidade musical."}
        </span>
      </div>

      {selfParticipant && matches.length > 0 ? (
        <>
          <div
            style={{
              display: "flex",
              gap: 10,
              overflowX: "auto",
              paddingBottom: 4,
              scrollSnapType: "x mandatory",
            }}
          >
            {matches.map((match) => {
              const member = match.member;
              const tribe = getClubberTribe(member.favorite_genres || []);
              const visual = getTribeVisual(tribe);
              const sandbox = isSandboxParticipant(member);

              return (
                <button
                  key={`near-you-${member.user_id}-${member.slug}`}
                  type="button"
                  onClick={onSelectNear}
                  style={{
                    minWidth: 224,
                    maxWidth: 224,
                    flex: "0 0 224px",
                    display: "grid",
                    gap: 10,
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.055), rgba(47,128,255,0.08), rgba(124,92,255,0.08))",
                    color: "#fff",
                    cursor: "pointer",
                    scrollSnapAlign: "start",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <ProfileAvatar
                      name={member.label}
                      photoUrl={member.club_photo_url}
                      size={52}
                      accent={visual.accent}
                    />

                    <span
                      style={{
                        display: "grid",
                        gap: 4,
                        minWidth: 0,
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 13,
                          lineHeight: 1.2,
                        }}
                      >
                        {member.label}
                      </strong>

                      <small
                        style={{
                          color: "rgba(255,255,255,0.62)",
                          fontSize: 10,
                          lineHeight: 1.25,
                          fontWeight: 800,
                        }}
                      >
                        {sandbox ? "Perfil demonstrativo" : "Perfil real"}
                      </small>
                    </span>

                    <span
                      style={{
                        minWidth: 0,
                        height: 28,
                        padding: "0 10px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 999,
                        background: "rgba(0,0,0,0.30)",
                        border: "1px solid rgba(0,245,200,0.16)",
                        color: PREMIUM.radar,
                        fontSize: 11,
                        fontWeight: 950,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {match.score}%
                    </span>
                  </div>

                  <span
                    style={{
                      color: "rgba(255,255,255,0.72)",
                      fontSize: 11,
                      lineHeight: 1.35,
                    }}
                  >
                    {member.city_base || "Mesmo evento"}
                  </span>

                  <span
                    style={{
                      color: "rgba(255,255,255,0.70)",
                      fontSize: 11,
                      lineHeight: 1.35,
                      fontWeight: 750,
                    }}
                  >
                    {[visual.shortName, ...match.reasons.slice(0, 2)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onSelectNear}
            style={{
              ...actionButtonStyle(true),
              minHeight: 42,
              width: "100%",
            }}
          >
            Ver clubbers próximos no radar
          </button>
        </>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: 12,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.09)",
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <strong
            style={{
              color: "#fff",
              fontSize: 13,
              lineHeight: 1.25,
            }}
          >
            {selfParticipant
              ? "Ainda não há clubbers próximos suficientes neste evento"
              : "Ative seu perfil Club neste evento"}
          </strong>

          <span
            style={{
              color: "rgba(255,255,255,0.66)",
              fontSize: 11,
              lineHeight: 1.45,
            }}
          >
            {selfParticipant
              ? "À medida que mais pessoas entrarem no radar, o sistema destacará quem combina com sua cidade, região, tribo e som."
              : "Quando seu perfil for identificado no radar, o sistema poderá sugerir pessoas próximas por contexto social, sem usar GPS nesta fase."}
          </span>
        </div>
      )}
    </div>
  );
}

function HotConnectionCard({
  member,
  onSelectHot,
}: {
  member: EventParticipant;
  onSelectHot: () => void;
}) {
  const score = member.compatibilityScore || 0;
  const meta = getHotConnectionMeta(score);
  const tribe = getClubberTribe(member.favorite_genres || []);
  const visual = getTribeVisual(tribe);
  const sandboxParticipant = isSandboxParticipant(member);

  return (
    <button
      type="button"
      onClick={onSelectHot}
      style={{
        minWidth: 232,
        maxWidth: 232,
        flex: "0 0 232px",
        display: "grid",
        gap: 10,
        textAlign: "left",
        padding: 13,
        borderRadius: 22,
        border: meta.border,
        background: meta.background,
        boxShadow: meta.glow,
        color: "#fff",
        cursor: "pointer",
        scrollSnapAlign: "start",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 10,
        }}
      >
        <ProfileAvatar
          name={member.label}
          photoUrl={member.club_photo_url}
          size={54}
          accent={meta.color}
        />

        <div
          style={{
            display: "grid",
            gap: 4,
            minWidth: 0,
          }}
        >
          <strong
            style={{
              fontSize: 14,
              lineHeight: 1.2,
            }}
          >
            {member.label}
          </strong>

          <span
            style={{
              color: "rgba(255,255,255,0.68)",
              fontSize: 11,
              lineHeight: 1.35,
            }}
          >
            {sandboxParticipant ? "Perfil demonstrativo" : "Perfil real"}
          </span>
        </div>

        <span
          style={{
            minWidth: 0,
            height: 28,
            padding: "0 10px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            background: "rgba(0,0,0,0.34)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: meta.color,
            fontSize: 11,
            fontWeight: 950,
            whiteSpace: "nowrap",
          }}
        >
          {score}%
        </span>
      </div>

      <span
        style={{
          color: "rgba(255,255,255,0.70)",
          fontSize: 11,
          lineHeight: 1.35,
          fontWeight: 750,
        }}
      >
        {meta.shortLabel} · {visual.shortName}
      </span>

      <span
        style={{
          color: "rgba(255,255,255,0.76)",
          fontSize: 11,
          lineHeight: 1.45,
        }}
      >
        {meta.description}
      </span>
    </button>
  );
}

function HotConnectionPanel({
  score,
}: {
  score: number;
}) {
  const meta = getHotConnectionMeta(score);

  return (
    <div
      style={{
        display: "grid",
        gap: 7,
        padding: 12,
        borderRadius: 16,
        border: meta.border,
        background: meta.background,
        boxShadow: meta.glow,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
        }}
      >
        <span style={sectionTitleStyle()}>Conexão no radar</span>

        <strong
          style={{
            color: meta.color,
            fontSize: 11,
            fontWeight: 950,
            whiteSpace: "nowrap",
          }}
        >
          {score}%
        </strong>
      </div>

      <strong
        style={{
          color: "#fff",
          fontSize: 13,
          lineHeight: 1.2,
        }}
      >
        {meta.label}
      </strong>

      <span
        style={{
          color: "rgba(255,255,255,0.74)",
          fontSize: 11,
          lineHeight: 1.45,
        }}
      >
        {meta.description}
      </span>
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
      helper: unlocked ? "Contato liberado" : "Depois do aceite",
      symbol: "●",
      color: PREMIUM.radar,
    },
    {
      title: "Grupo",
      helper: unlocked ? "Pode combinar" : "Depois do aceite",
      symbol: "◇",
      color: PREMIUM.blue,
    },
    {
      title: "Carona",
      helper: unlocked ? "Organizar rota" : "Depois do aceite",
      symbol: "↗",
      color: PREMIUM.amber,
    },
    {
      title: "Encontro",
      helper: unlocked ? "Ponto no evento" : "Depois do aceite",
      symbol: "◎",
      color: PREMIUM.violet,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gap: 11,
        padding: 12,
        borderRadius: 18,
        border: unlocked
          ? `1px solid ${PREMIUM.radarBorder}`
          : "1px solid rgba(124,92,255,0.22)",
        background: unlocked
          ? "linear-gradient(135deg, rgba(0,245,200,0.10), rgba(47,128,255,0.08), rgba(124,92,255,0.10))"
          : "linear-gradient(135deg, rgba(124,92,255,0.10), rgba(47,128,255,0.07), rgba(0,245,200,0.045))",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 3,
        }}
      >
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
      </div>

      {sandboxParticipant ? (
        <span
          aria-disabled="true"
          title="Em perfis reais, este botão envia uma solicitação antes de liberar contato ou grupos."
          style={{
            ...disabledActionButtonStyle(true),
            width: "100%",
            minHeight: 46,
            fontSize: 11,
            fontWeight: 950,
            whiteSpace: "nowrap",
          }}
        >
          Exemplo de conexão
        </span>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          disabled={isConnectionButtonDisabled(connectionState)}
          style={connectionButtonStyle(connectionState)}
        >
          {getConnectionLabel(connectionState)}
        </button>
      )}

      <span
        style={{
          color: "rgba(255,255,255,0.68)",
          fontSize: 11,
          lineHeight: 1.45,
        }}
      >
        {sandboxParticipant
          ? "Em perfis reais, o usuário envia uma solicitação. Após a conexão aceita, poderá combinar conversa, grupo, carona ou encontro."
          : connectionFeedback}
      </span>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        {socialPaths.map((item) => (
          <div
            key={item.title}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 9px",
              borderRadius: 14,
              border: unlocked
                ? "1px solid rgba(0,245,200,0.18)"
                : "1px solid rgba(255,255,255,0.09)",
              background: unlocked
                ? "rgba(0,245,200,0.055)"
                : "rgba(0,0,0,0.20)",
              opacity:
                unlocked || connectionState === "self" || sandboxParticipant
                  ? 1
                  : 0.72,
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                background: "rgba(0,0,0,0.28)",
                border: unlocked
                  ? "1px solid rgba(0,245,200,0.20)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: unlocked ? PREMIUM.radar : item.color,
                fontSize: 11,
                fontWeight: 950,
              }}
            >
              {item.symbol}
            </span>

            <span
              style={{
                display: "grid",
                gap: 1,
              }}
            >
              <strong
                style={{
                  color: "#fff",
                  fontSize: 11,
                  lineHeight: 1.1,
                }}
              >
                {item.title}
              </strong>

              <small
                style={{
                  color: unlocked
                    ? PREMIUM.radar
                    : "rgba(255,255,255,0.54)",
                  fontSize: 9,
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                {unlocked ? item.helper : statusLabel}
              </small>
            </span>
          </div>
        ))}
      </div>
    </div>
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
  const secondGenre = genres[1] || "";
  const mainBadge = badges[0] || "Mesmo evento";

  const items = [
    {
      label: "Tribo",
      value: visual.shortName,
      sub: visual.name,
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
      sub: secondGenre || "Vertente principal",
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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
      }}
    >
      {items.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          style={{
            display: "grid",
            gap: 5,
            padding: 10,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.09)",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))",
            minHeight: 78,
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.52)",
              fontSize: 10,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {item.label}
          </span>

          <strong
            style={{
              color: item.accent,
              fontSize: 12,
              lineHeight: 1.15,
            }}
          >
            {item.value}
          </strong>

          <span
            style={{
              color: "rgba(255,255,255,0.58)",
              fontSize: 10,
              lineHeight: 1.25,
              fontWeight: 750,
            }}
          >
            {item.sub}
          </span>
        </div>
      ))}
    </div>
  );
}

function ParticipantCard({
  member,
  officialEventUrl,
  onSelfDetected,
}: {
  member: EventParticipant;
  officialEventUrl?: string;
  onSelfDetected?: (member: EventParticipant) => void;
}) {
  const [connectionState, setConnectionState] =
    useState<ConnectionUiState>("idle");
  const [connectionFeedback, setConnectionFeedback] = useState(
    getConnectionFeedback("idle")
  );

  const photo = normalizeText(member.club_photo_url);
  const genres = (member.favorite_genres || []).slice(0, 3);
  const tribe = getClubberTribe(member.favorite_genres || []);
  const tribeVisual = getTribeVisual(tribe);
  const state = getStateFromCityBase(member.city_base);
  const region = getRegionFromState(state);
  const socialMode = getSocialModeLabel(member.event_social_mode);
  const sandboxParticipant = isSandboxParticipant(member);
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
            member.user_id
          )}`,
          {
            method: "GET",
          }
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
    <article style={profileCardStyle()}>
      <div
        style={{
          height: 232,
          position: "relative",
          background: photo
            ? `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.84)), url(${photo})`
            : "linear-gradient(135deg, rgba(124,92,255,0.26), rgba(47,128,255,0.16))",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 18% 12%, rgba(0,245,200,0.12), transparent 28%), radial-gradient(circle at 84% 18%, rgba(124,92,255,0.22), transparent 26%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            right: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              border: tribeVisual.border,
              background: "rgba(0,0,0,0.52)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 900,
              boxShadow: tribeVisual.glow,
            }}
          >
            {tribeVisual.shortName}
          </span>

          {member.compatibilityScore ? (
            <span
              style={{
                padding: "7px 10px",
                borderRadius: 999,
                border: hotMeta.border,
                background: "rgba(0,0,0,0.55)",
                color: hotMeta.color,
                fontSize: 11,
                fontWeight: 900,
                boxShadow: hotMeta.glow,
              }}
            >
              {hotMeta.shortLabel}
            </span>
          ) : null}
        </div>

        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 16,
            display: "grid",
            gap: 7,
            color: "#fff",
          }}
        >
          <strong
            style={{
              fontSize: 20,
              lineHeight: 1.1,
            }}
          >
            {member.label}
          </strong>

          {member.city_base ? (
            <span
              style={{
                opacity: 0.88,
                fontSize: 12,
                fontWeight: 750,
              }}
            >
              {member.city_base}
            </span>
          ) : null}

          <span
            style={{
              width: "fit-content",
              padding: "6px 9px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.42)",
              color: "rgba(255,255,255,0.88)",
              fontSize: 11,
              fontWeight: 850,
            }}
          >
            {socialMode}
          </span>
        </div>
      </div>

      <div
        style={{
          padding: 16,
          display: "grid",
          gap: 13,
        }}
      >
        {score > 0 ? <HotConnectionPanel score={score} /> : null}

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

        {member.club_tagline ? (
          <p
            style={{
              margin: 0,
              lineHeight: 1.55,
              opacity: 0.82,
              fontSize: 13,
            }}
          >
            {member.club_tagline}
          </p>
        ) : null}

        <div style={sectionCardStyle(true)}>
          <div style={sectionTitleStyle()}>Tribo dominante</div>

          <TribePill tribe={tribe} compact />
        </div>

        {genres.length > 0 ? (
          <div
            style={{
              display: "flex",
              gap: 7,
              flexWrap: "wrap",
            }}
          >
            {genres.map((genre) => (
              <span key={genre} style={socialBadgeStyle()}>
                {genre}
              </span>
            ))}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginTop: 2,
          }}
        >
          {sandboxParticipant ? (
            <span
              aria-disabled="true"
              title="Perfil demonstrativo sem página pública cadastrada"
              style={disabledActionButtonStyle(true)}
            >
              Perfil demo
            </span>
          ) : (
            <Link
              href={`/${member.slug}?mode=club`}
              style={actionButtonStyle(true)}
            >
              Ver perfil
            </Link>
          )}

          {officialEventUrl ? (
            <a
              href={officialEventUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={actionButtonStyle()}
            >
              Evento
            </a>
          ) : (
            <span
              aria-disabled="true"
              title="Link oficial do evento não informado"
              style={disabledActionButtonStyle()}
            >
              Evento
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function EventParticipantsFilter({
  attendees,
  officialEventUrl,
}: {
  attendees: EventParticipant[];
  officialEventUrl?: string;
}) {
  const [mode, setMode] = useState<FilterMode>("all");
  const [value, setValue] = useState("");
  const [activeGroup, setActiveGroup] = useState<FilterGroup>("none");
  const [selfUserId, setSelfUserId] = useState("");

  const socialParticipants: EventParticipant[] = useMemo(
    () =>
      DEV_SOCIAL_SANDBOX ? [...attendees, ...MOCK_PARTICIPANTS] : attendees,
    [attendees]
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
            .filter(Boolean)
        )
      )
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .slice(0, 40),
    [socialParticipants]
  );

  const states = useMemo(
    () =>
      Array.from(
        new Set(
          socialParticipants
            .map((member) => getStateFromCityBase(member.city_base))
            .filter(Boolean)
        )
      )
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .slice(0, 27),
    [socialParticipants]
  );

  const regions = useMemo(
    () =>
      Array.from(
        new Set(
          states.map((state) => getRegionFromState(state)).filter(Boolean)
        )
      )
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .slice(0, 5),
    [states]
  );

  const genres = useMemo(
    () =>
      Array.from(
        new Set(
          socialParticipants
            .flatMap((member) => member.favorite_genres || [])
            .map((item) => normalizeText(item))
            .filter(Boolean)
        )
      )
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .slice(0, 40),
    [socialParticipants]
  );

  const enrichedAttendees = useMemo(() => {
    return socialParticipants.map((member) => {
      const memberGenres = (member.favorite_genres || []).map((item) =>
        normalizeText(item)
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
    [enrichedAttendees, selfUserId]
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
    [nearYouMatches]
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

  const filtered = useMemo(() => {
    return enrichedAttendees
      .filter((member) => {
        const city = normalizeText(member.city_base);
        const state = getStateFromCityBase(member.city_base);
        const region = getRegionFromState(state);
        const memberGenres = (member.favorite_genres || []).map((item) =>
          normalizeText(item)
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

        const networkingA = normalizeText(a.event_social_mode).includes("network");
        const networkingB = normalizeText(b.event_social_mode).includes("network");

        if (networkingA !== networkingB) return networkingB ? 1 : -1;

        const genresA = a.favorite_genres?.length || 0;
        const genresB = b.favorite_genres?.length || 0;

        return genresB - genresA;
      });
  }, [enrichedAttendees, mode, nearYouIds, value]);

  function selectFilter(nextMode: FilterMode, nextValue = "") {
    setMode(nextMode);
    setValue(nextValue);

    if (nextMode === "all" || nextMode === "hot" || nextMode === "near") {
      setActiveGroup("none");
    }
  }

  function selectAll() {
    setMode("all");
    setValue("");
    setActiveGroup("none");
  }

  function toggleGroup(group: FilterGroup) {
    setActiveGroup((current) => (current === group ? "none" : group));
  }

  return (
    <>
      <VisualInteractionGuide />

      <NearYouPanel
        selfParticipant={selfParticipant}
        matches={nearYouMatches}
        onSelectNear={() => selectFilter("near")}
      />

      {hotConnections.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 4,
            }}
          >
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
                color: "rgba(255,255,255,0.68)",
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              Clubbers com maior chance de afinidade neste evento.
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              overflowX: "auto",
              paddingBottom: 4,
              scrollSnapType: "x mandatory",
            }}
          >
            {hotConnections.map((member) => (
              <HotConnectionCard
                key={`hot-connection-${member.user_id}-${member.slug}`}
                member={member}
                onSelectHot={() => selectFilter("hot")}
              />
            ))}
          </div>
        </div>
      ) : null}

      {topTribes.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 4,
            }}
          >
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
                color: "rgba(255,255,255,0.68)",
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              Encontre clubbers por afinidade musical, região e presença social.
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              overflowX: "auto",
              paddingBottom: 4,
              scrollSnapType: "x mandatory",
            }}
          >
            {topTribes.map(({ tribe, count, visual }) => (
              <button
                key={`tribe-highlight-${tribe}`}
                type="button"
                onClick={() => {
                  setMode("all");
                  setValue("");
                  setActiveGroup("genres");
                }}
                style={{
                  minWidth: 210,
                  maxWidth: 210,
                  flex: "0 0 210px",
                  display: "grid",
                  gap: 10,
                  textAlign: "left",
                  padding: 12,
                  borderRadius: 20,
                  border: visual.border,
                  background: visual.gradient,
                  boxShadow: visual.glow,
                  color: "#fff",
                  cursor: "pointer",
                  scrollSnapAlign: "start",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 999,
                      background: "rgba(0,0,0,0.34)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      fontSize: 17,
                    }}
                  >
                    {visual.icon}
                  </span>

                  <span
                    style={{
                      padding: "6px 8px",
                      borderRadius: 999,
                      background: "rgba(0,0,0,0.30)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: visual.accent,
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    {count} {count === 1 ? "clubber" : "clubbers"}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <strong
                    style={{
                      fontSize: 14,
                      lineHeight: 1.2,
                    }}
                  >
                    {visual.name}
                  </strong>

                  <span
                    style={{
                      color: "rgba(255,255,255,0.74)",
                      fontSize: 11,
                      lineHeight: 1.35,
                    }}
                  >
                    {visual.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={selectAll} style={chipStyle(mode === "all")}>
            Todos
          </button>

          <button type="button" onClick={() => selectFilter("hot")} style={chipStyle(mode === "hot")}>
            Conexões quentes
          </button>

          <button type="button" onClick={() => selectFilter("near")} style={chipStyle(mode === "near")}>
            Clubbers próximos
          </button>

          <button type="button" onClick={() => toggleGroup("cities")} style={chipStyle(activeGroup === "cities")}>
            Cidades
          </button>

          <button type="button" onClick={() => toggleGroup("states")} style={chipStyle(activeGroup === "states")}>
            Estados
          </button>

          <button type="button" onClick={() => toggleGroup("regions")} style={chipStyle(activeGroup === "regions")}>
            Regiões
          </button>

          <button type="button" onClick={() => toggleGroup("genres")} style={chipStyle(activeGroup === "genres")}>
            Vertentes
          </button>
        </div>

        {activeGroup !== "none" ? (
          <div
            style={{
              display: "grid",
              gap: 9,
              padding: 12,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.035)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                opacity: 0.66,
                textTransform: "uppercase",
                letterSpacing: 0.5,
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
                      style={chipStyle(mode === "city" && value === city)}
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
                      style={chipStyle(mode === "state" && value === state)}
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
                      style={chipStyle(mode === "region" && value === region)}
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
                      style={chipStyle(mode === "genre" && value === genre)}
                    >
                      {genre}
                    </button>
                  ))
                : null}
            </div>
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
          ? `${filtered.length} Clubber${filtered.length === 1 ? "" : "s"} conectados pela vertente ${value}`
          : mode === "city" && value
          ? `${filtered.length} Clubber${filtered.length === 1 ? "" : "s"} da cidade ${value}`
          : mode === "state" && value
          ? `${filtered.length} Clubber${filtered.length === 1 ? "" : "s"} do estado ${value}`
          : mode === "region" && value
          ? `${filtered.length} Clubber${filtered.length === 1 ? "" : "s"} da região ${value}`
          : `${filtered.length} Clubber${filtered.length === 1 ? "" : "s"} conectados a este evento`}
      </div>

      <div style={carouselStyle()}>
        {filtered.map((member) => (
          <ParticipantCard
            key={`attendee-${member.user_id}-${member.slug}`}
            member={member}
            officialEventUrl={officialEventUrl}
            onSelfDetected={handleSelfDetected}
          />
        ))}
      </div>
    </>
  );
}