"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
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

type FilterMode = "all" | "city" | "state" | "region" | "genre";

type FilterGroup =
  | "none"
  | "cities"
  | "states"
  | "regions"
  | "genres";

const DEV_SOCIAL_SANDBOX = true;

const MOCK_PARTICIPANTS: EventParticipant[] = [
  {
    user_id: "TEST_SANDBOX_001",
    label: "Lia Santos",
    slug: "sandbox-lia-santos",
    city_base: "São Paulo - SP",
    club_tagline:
      "House, pista boa e conexões leves antes do evento.",
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
    club_tagline:
      "Progressive House, viagens de festival e energia boa.",
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
    club_tagline:
      "Busco minha tribo para after, carona e pista.",
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
  if (["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"].includes(uf)) return "Nordeste";
  if (["AM", "PA", "AC", "RO", "RR", "AP", "TO"].includes(uf)) return "Norte";

  return "";
}

function getClubberTribe(genres: string[]): string {
  const normalizedGenres = genres.map((genre) => normalizeText(genre).toLowerCase());

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

function chipStyle(active = false): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 11px",
    borderRadius: 999,
    border: active
      ? "1px solid rgba(0,255,190,0.55)"
      : "1px solid rgba(255,255,255,0.14)",
    background: active
      ? "linear-gradient(135deg, rgba(0,255,190,0.18), rgba(125,92,255,0.18))"
      : "rgba(255,255,255,0.055)",
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
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025))",
    boxShadow: "0 18px 44px rgba(0,0,0,0.34)",
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
      ? "1px solid rgba(0,255,190,0.34)"
      : "1px solid rgba(255,255,255,0.14)",
    background: primary
      ? "linear-gradient(135deg, rgba(0,255,190,0.20), rgba(125,92,255,0.18))"
      : "rgba(255,255,255,0.06)",
    color: "#fff",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 850,
  };
}

function socialBadgeStyle(): CSSProperties {
  return {
    display: "inline-flex",
    width: "fit-content",
    padding: "6px 9px",
    borderRadius: 999,
    border: "1px solid rgba(0,255,190,0.22)",
    background: "rgba(0,255,190,0.10)",
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
      ? "rgba(125,92,255,0.06)"
      : "rgba(255,255,255,0.03)",
    border: highlight
      ? "1px solid rgba(125,92,255,0.14)"
      : "1px solid rgba(255,255,255,0.06)",
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

function ParticipantCard({
  member,
  officialEventUrl,
}: {
  member: EventParticipant;
  officialEventUrl?: string;
}) {
  const photo = normalizeText(member.club_photo_url);
  const genres = (member.favorite_genres || []).slice(0, 3);
  const tribe = getClubberTribe(member.favorite_genres || []);
  const state = getStateFromCityBase(member.city_base);
  const region = getRegionFromState(state);

  return (
    <article style={profileCardStyle()}>
      <div
        style={{
          height: 215,
          position: "relative",
          background: photo
            ? `linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.82)), url(${photo})`
            : "linear-gradient(135deg, rgba(125,92,255,0.32), rgba(0,255,190,0.12))",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
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
              border: "1px solid rgba(0,255,190,0.30)",
              background: "rgba(0,0,0,0.48)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            Participante
          </span>

          {member.compatibilityScore ? (
            <span
              style={{
                padding: "7px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.55)",
                color: "#00ffbe",
                fontSize: 11,
                fontWeight: 900,
                boxShadow: "0 0 18px rgba(0,255,190,0.22)",
              }}
            >
              {`${member.compatibilityScore}% compatível`}
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
            gap: 5,
            color: "#fff",
          }}
        >
          <strong
            style={{
              fontSize: 19,
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
                fontWeight: 700,
              }}
            >
              {member.city_base}
            </span>
          ) : null}
        </div>
      </div>

      <div
        style={{
          padding: 16,
          display: "grid",
          gap: 14,
        }}
      >
        <div style={sectionCardStyle(true)}>
          <div style={sectionTitleStyle()}>
            Tribo
          </div>

          <span
            style={{
              ...socialBadgeStyle(),
              background:
                "linear-gradient(135deg, rgba(0,255,190,0.16), rgba(125,92,255,0.18))",
              border: "1px solid rgba(0,255,190,0.28)",
              boxShadow: "0 0 18px rgba(0,255,190,0.10)",
            }}
          >
            {tribe}
          </span>
        </div>

        {member.club_tagline ? (
          <p
            style={{
              margin: 0,
              lineHeight: 1.6,
              opacity: 0.88,
              fontSize: 13,
            }}
          >
            {member.club_tagline}
          </p>
        ) : null}

        <div style={sectionCardStyle()}>
          <div style={sectionTitleStyle()}>
            Localização
          </div>

          <div
            style={{
              display: "flex",
              gap: 7,
              flexWrap: "wrap",
            }}
          >
            {member.city_base ? (
              <span style={socialBadgeStyle()}>
                {member.city_base}
              </span>
            ) : null}

            {region ? (
              <span style={socialBadgeStyle()}>
                {region}
              </span>
            ) : null}
          </div>
        </div>

        <div style={sectionCardStyle(true)}>
          <div style={sectionTitleStyle()}>
            Afinidade social
          </div>

          <div
            style={{
              display: "flex",
              gap: 7,
              flexWrap: "wrap",
            }}
          >
            {member.compatibilityScore ? (
              <span
                style={{
                  ...socialBadgeStyle(),
                  background: "rgba(0,255,190,0.12)",
                  border: "1px solid rgba(0,255,190,0.22)",
                }}
              >
                {`${member.compatibilityScore}% compatível`}
              </span>
            ) : null}

            {member.compatibilityBadges?.map((badge) => (
              <span
                key={badge}
                style={{
                  ...socialBadgeStyle(),
                  background: "rgba(125,92,255,0.16)",
                  border: "1px solid rgba(125,92,255,0.22)",
                }}
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        {genres.length > 0 ? (
          <div style={sectionCardStyle()}>
            <div style={sectionTitleStyle()}>
              Vertentes
            </div>

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
          <Link
            href={`/${member.slug}?mode=club`}
            style={actionButtonStyle(true)}
          >
            Ver perfil
          </Link>

          <a
            href={officialEventUrl || `/${member.slug}?mode=club`}
            target={officialEventUrl ? "_blank" : undefined}
            rel={officialEventUrl ? "noopener noreferrer" : undefined}
            style={actionButtonStyle()}
          >
            Evento
          </a>
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

  const socialParticipants: EventParticipant[] = useMemo(
    () => (DEV_SOCIAL_SANDBOX ? [...attendees, ...MOCK_PARTICIPANTS] : attendees),
    [attendees]
  );

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
          states
            .map((state) => getRegionFromState(state))
            .filter(Boolean)
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

      return {
        ...member,
        compatibilityScore: Math.min(score, 100),
        compatibilityBadges: badges.slice(0, 3),
      };
    });
  }, [socialParticipants]);

  const filtered = useMemo(() => {
    return enrichedAttendees
      .filter((member) => {
        const city = normalizeText(member.city_base);
        const state = getStateFromCityBase(member.city_base);
        const region = getRegionFromState(state);
        const memberGenres = (member.favorite_genres || []).map((item) =>
          normalizeText(item)
        );

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
  }, [enrichedAttendees, mode, value]);

  function selectFilter(nextMode: FilterMode, nextValue = "") {
    setMode(nextMode);
    setValue(nextValue);
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
      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={selectAll} style={chipStyle(mode === "all")}>
            Todos
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
            <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.66, textTransform: "uppercase", letterSpacing: 0.5 }}>
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
                    <button key={`filter-city-${city}`} type="button" onClick={() => selectFilter("city", city)} style={chipStyle(mode === "city" && value === city)}>
                      {city}
                    </button>
                  ))
                : null}

              {activeGroup === "states"
                ? states.map((state) => (
                    <button key={`filter-state-${state}`} type="button" onClick={() => selectFilter("state", state)} style={chipStyle(mode === "state" && value === state)}>
                      {state}
                    </button>
                  ))
                : null}

              {activeGroup === "regions"
                ? regions.map((region) => (
                    <button key={`filter-region-${region}`} type="button" onClick={() => selectFilter("region", region)} style={chipStyle(mode === "region" && value === region)}>
                      {region}
                    </button>
                  ))
                : null}

              {activeGroup === "genres"
                ? genres.map((genre) => (
                    <button key={`filter-genre-${genre}`} type="button" onClick={() => selectFilter("genre", genre)} style={chipStyle(mode === "genre" && value === genre)}>
                      {genre}
                    </button>
                  ))
                : null}
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ marginBottom: 10, fontSize: 12, opacity: 0.82, fontWeight: 750 }}>
        {mode === "genre" && value
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
          />
        ))}
      </div>
    </>
  );
}