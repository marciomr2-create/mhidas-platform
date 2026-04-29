// src/app/event/[event_slug]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { ReactNode } from "react";
import Link from "next/link";
import { createPublicClient } from "@/utils/supabase/public";

type PageProps = {
  params: Promise<{ event_slug: string }>;
};

type CardRow = {
  card_id: string;
  user_id: string;
  label: string | null;
  slug: string;
  status: string;
  is_published: boolean;
};

type ClubProfileRow = {
  user_id: string;
  city_base: string | null;
  club_tagline: string | null;
  club_photo_url: string | null;
  next_events: string | null;
  next_events_links: string | null;
  ride_status: string | null;
  ride_event_name: string | null;
  ride_event_url: string | null;
  ride_origin: string | null;
  ride_destination: string | null;
  ride_seats: string | null;
  ride_notes: string | null;
  meet_status: string | null;
  meet_event_name: string | null;
  meet_event_url: string | null;
  meet_meeting_point: string | null;
  meet_time: string | null;
  meet_notes: string | null;
};

type EventMember = {
  user_id: string;
  label: string;
  slug: string;
  city_base: string;
  club_tagline: string;
  club_photo_url: string;
  next_events: string[];
  next_events_links: string;
  ride_status: string;
  ride_event_name: string;
  ride_event_url: string;
  ride_origin: string;
  ride_destination: string;
  ride_seats: string;
  ride_notes: string;
  meet_status: string;
  meet_event_name: string;
  meet_event_url: string;
  meet_meeting_point: string;
  meet_time: string;
  meet_notes: string;
};

function normalizeText(value: string | null | undefined): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeForMatch(value: string | null | undefined): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function toEventSlug(value: string | null | undefined): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitEventList(value: string | null | undefined): string[] {
  const text = normalizeText(value);
  if (!text) return [];

  return text
    .split(/,|•|;|\|/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function hasContent(value: string | null | undefined): boolean {
  return normalizeText(value).length > 0;
}

function isHttpUrl(value: string | null | undefined): boolean {
  return /^https?:\/\//i.test(normalizeText(value));
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Map(values.map((item) => [normalizeForMatch(item), item])).values());
}

function pageStyle() {
  return {
    padding: 24,
    maxWidth: 1120,
    margin: "0 auto",
  } as const;
}

function heroStyle() {
  return {
    marginTop: 18,
    padding: 26,
    borderRadius: 30,
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 40%, rgba(255,255,255,0.02) 100%)",
    display: "grid",
    gap: 18,
    boxShadow: "0 18px 40px rgba(0,0,0,0.24)",
  } as const;
}

function badgeStyle() {
  return {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    fontSize: 12,
    fontWeight: 800,
  } as const;
}

function sectionStyle() {
  return {
    marginTop: 22,
    padding: 22,
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    boxShadow: "0 10px 28px rgba(0,0,0,0.14)",
    display: "grid",
    gap: 16,
  } as const;
}

function statsGridStyle() {
  return {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  } as const;
}

function statCardStyle() {
  return {
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    display: "grid",
    gap: 6,
  } as const;
}

function memberGridStyle() {
  return {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  } as const;
}

function memberCardStyle() {
  return {
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    display: "grid",
    gap: 12,
  } as const;
}

function actionButtonStyle(primary = false) {
  return {
    display: "inline-block",
    padding: "11px 14px",
    borderRadius: 12,
    border: primary
      ? "1px solid rgba(255,255,255,0.22)"
      : "1px solid rgba(255,255,255,0.14)",
    background: primary ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 800,
  } as const;
}

function emptyCardStyle() {
  return {
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    opacity: 0.88,
    lineHeight: 1.7,
  } as const;
}

function getRideStatusLabel(value: string) {
  if (value === "offer") return "Oferecendo carona";
  if (value === "need") return "Procurando carona";
  if (value === "both") return "Oferece e também procura";
  return "";
}

function getMeetStatusLabel(value: string) {
  if (value === "host") return "Abrindo ponto de encontro";
  if (value === "join") return "Quer entrar em um encontro";
  if (value === "both") return "Pode abrir ou entrar";
  return "";
}

function MemberCard({
  member,
  extraTitle,
  extraBody,
  officialEventUrl,
}: {
  member: EventMember;
  extraTitle?: string;
  extraBody?: ReactNode;
  officialEventUrl?: string;
}) {
  return (
    <article style={memberCardStyle()}>
      <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 12, alignItems: "start" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            display: "grid",
            placeItems: "center",
          }}
        >
          {hasContent(member.club_photo_url) ? (
            <img
              src={member.club_photo_url}
              alt={member.label}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <span style={{ fontSize: 12, opacity: 0.7 }}>Sem foto</span>
          )}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{member.label}</div>
            {hasContent(member.city_base) ? (
              <div style={{ opacity: 0.78, marginTop: 2 }}>{member.city_base}</div>
            ) : null}
          </div>

          {hasContent(member.club_tagline) ? (
            <div style={{ opacity: 0.86, lineHeight: 1.6 }}>{member.club_tagline}</div>
          ) : null}
        </div>
      </div>

      {extraTitle ? (
        <div
          style={{
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
            display: "grid",
            gap: 6,
          }}
        >
          <strong>{extraTitle}</strong>
          <div style={{ lineHeight: 1.6, opacity: 0.88 }}>{extraBody}</div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href={`/${member.slug}?mode=club`} style={actionButtonStyle(true)}>
          Abrir perfil Club
        </Link>

        {hasContent(officialEventUrl) ? (
          <a
            href={officialEventUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={actionButtonStyle()}
          >
            Evento oficial
          </a>
        ) : null}
      </div>
    </article>
  );
}

export default async function EventPage({ params }: PageProps) {
  const { event_slug } = await params;
  const eventSlug = normalizeText(event_slug).toLowerCase();

  const supabase = createPublicClient();

  const { data: cardsData } = await supabase
    .from("cards")
    .select("card_id,user_id,label,slug,status,is_published")
    .eq("status", "active")
    .eq("is_published", true);

  const cards = ((cardsData ?? []) as CardRow[]).filter((card) => hasContent(card.slug));
  const userIds = dedupeStrings(cards.map((card) => card.user_id));

  const { data: profilesData } = userIds.length
    ? await supabase
        .from("club_profiles")
        .select(`
          user_id,
          city_base,
          club_tagline,
          club_photo_url,
          next_events,
          next_events_links,
          ride_status,
          ride_event_name,
          ride_event_url,
          ride_origin,
          ride_destination,
          ride_seats,
          ride_notes,
          meet_status,
          meet_event_name,
          meet_event_url,
          meet_meeting_point,
          meet_time,
          meet_notes
        `)
        .in("user_id", userIds)
    : { data: [] as ClubProfileRow[] };

  const profileMap = new Map<string, ClubProfileRow>();
  for (const profile of (profilesData ?? []) as ClubProfileRow[]) {
    profileMap.set(profile.user_id, profile);
  }

  const matchedMembers: EventMember[] = [];

  for (const card of cards) {
    const profile = profileMap.get(card.user_id);
    if (!profile) continue;

    const nextEvents = splitEventList(profile.next_events);
    const nextEventsMatch = nextEvents.some((item) => toEventSlug(item) === eventSlug);
    const rideMatch = toEventSlug(profile.ride_event_name) === eventSlug;
    const meetMatch = toEventSlug(profile.meet_event_name) === eventSlug;

    if (!nextEventsMatch && !rideMatch && !meetMatch) continue;

    matchedMembers.push({
      user_id: card.user_id,
      label: normalizeText(card.label) || "Clubber",
      slug: normalizeText(card.slug),
      city_base: normalizeText(profile.city_base),
      club_tagline: normalizeText(profile.club_tagline),
      club_photo_url: normalizeText(profile.club_photo_url),
      next_events,
      next_events_links: normalizeText(profile.next_events_links),
      ride_status: normalizeText(profile.ride_status),
      ride_event_name: normalizeText(profile.ride_event_name),
      ride_event_url: normalizeText(profile.ride_event_url),
      ride_origin: normalizeText(profile.ride_origin),
      ride_destination: normalizeText(profile.ride_destination),
      ride_seats: normalizeText(profile.ride_seats),
      ride_notes: normalizeText(profile.ride_notes),
      meet_status: normalizeText(profile.meet_status),
      meet_event_name: normalizeText(profile.meet_event_name),
      meet_event_url: normalizeText(profile.meet_event_url),
      meet_meeting_point: normalizeText(profile.meet_meeting_point),
      meet_time: normalizeText(profile.meet_time),
      meet_notes: normalizeText(profile.meet_notes),
    });
  }

  const canonicalNames = dedupeStrings(
    matchedMembers
      .flatMap((member) => [
        ...member.next_events.filter((item) => toEventSlug(item) === eventSlug),
        toEventSlug(member.ride_event_name) === eventSlug ? member.ride_event_name : "",
        toEventSlug(member.meet_event_name) === eventSlug ? member.meet_event_name : "",
      ])
      .filter(Boolean)
  );

  const eventTitle = canonicalNames[0] || eventSlug.replace(/-/g, " ");

  const officialEventUrl =
    matchedMembers.find((member) => isHttpUrl(member.next_events_links))?.next_events_links ||
    matchedMembers.find((member) => isHttpUrl(member.ride_event_url))?.ride_event_url ||
    matchedMembers.find((member) => isHttpUrl(member.meet_event_url))?.meet_event_url ||
    "";

  const attendees = matchedMembers;
  const rideOfferMembers = matchedMembers.filter(
    (member) => member.ride_status === "offer" || member.ride_status === "both"
  );
  const rideNeedMembers = matchedMembers.filter(
    (member) => member.ride_status === "need" || member.ride_status === "both"
  );
  const meetMembers = matchedMembers.filter(
    (member) =>
      member.meet_status === "host" ||
      member.meet_status === "join" ||
      member.meet_status === "both"
  );

  return (
    <main style={pageStyle()}>
      <section style={heroStyle()}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badgeStyle()}>Página pública de evento</span>
            <span style={badgeStyle()}>{matchedMembers.length} participantes mapeados</span>
          </div>

          <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.02, fontWeight: 900 }}>
            {eventTitle}
          </h1>

          <p style={{ margin: 0, opacity: 0.84, lineHeight: 1.7, maxWidth: 840 }}>
            Este evento funciona como ponto de conexão entre perfis Club, caronas e encontros já cadastrados no ecossistema USECLUBBERS.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {hasContent(officialEventUrl) ? (
            <a
              href={officialEventUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={actionButtonStyle(true)}
            >
              Abrir evento oficial
            </a>
          ) : null}

          <Link href="/network" style={actionButtonStyle()}>
            Voltar ao ecossistema
          </Link>
        </div>

        <div style={statsGridStyle()}>
          <div style={statCardStyle()}>
            <strong>Perfis no evento</strong>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{attendees.length}</div>
          </div>

          <div style={statCardStyle()}>
            <strong>Oferta de carona</strong>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{rideOfferMembers.length}</div>
          </div>

          <div style={statCardStyle()}>
            <strong>Busca por carona</strong>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{rideNeedMembers.length}</div>
          </div>

          <div style={statCardStyle()}>
            <strong>Encontros ativos</strong>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{meetMembers.length}</div>
          </div>
        </div>
      </section>

      {matchedMembers.length === 0 ? (
        <section style={sectionStyle()}>
          <div style={emptyCardStyle()}>
            <strong style={{ display: "block", marginBottom: 10 }}>Nenhum perfil encontrado para este evento.</strong>
            <div style={{ marginBottom: 12 }}>
              Isso normalmente acontece quando o slug digitado não corresponde exatamente ao nome cadastrado em:
            </div>
            <div style={{ lineHeight: 1.8 }}>
              • Próximos eventos
              <br />
              • Evento da carona
              <br />
              • Evento do encontro
            </div>
            <div style={{ marginTop: 14 }}>
              Exemplo de conversão:
              <br />
              <strong>Time Warp Brasil</strong> → <strong>/event/time-warp-brasil</strong>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section style={sectionStyle()}>
            <div style={{ display: "grid", gap: 6 }}>
              <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>
                Quem vai para este evento
              </h2>
              <p style={{ margin: 0, opacity: 0.82 }}>
                Perfis Club que já se conectaram a este evento.
              </p>
            </div>

            <div style={memberGridStyle()}>
              {attendees.map((member) => (
                <MemberCard
                  key={`attendee-${member.user_id}`}
                  member={member}
                  officialEventUrl={officialEventUrl}
                />
              ))}
            </div>
          </section>

          <section style={sectionStyle()}>
            <div style={{ display: "grid", gap: 6 }}>
              <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>
                Carona compartilhada
              </h2>
              <p style={{ margin: 0, opacity: 0.82 }}>
                Quem oferece e quem procura carona para este evento.
              </p>
            </div>

            {rideOfferMembers.length === 0 && rideNeedMembers.length === 0 ? (
              <div style={emptyCardStyle()}>Ainda não há caronas mapeadas para este evento.</div>
            ) : (
              <div style={memberGridStyle()}>
                {rideOfferMembers.map((member) => (
                  <MemberCard
                    key={`ride-offer-${member.user_id}`}
                    member={member}
                    extraTitle={getRideStatusLabel(member.ride_status) || "Carona"}
                    extraBody={
                      <>
                        {hasContent(member.ride_event_name) ? <div><strong>Evento:</strong> {member.ride_event_name}</div> : null}
                        {hasContent(member.ride_origin) ? <div><strong>Origem:</strong> {member.ride_origin}</div> : null}
                        {hasContent(member.ride_destination) ? <div><strong>Destino:</strong> {member.ride_destination}</div> : null}
                        {hasContent(member.ride_seats) ? <div><strong>Vagas:</strong> {member.ride_seats}</div> : null}
                        {hasContent(member.ride_notes) ? <div><strong>Observações:</strong> {member.ride_notes}</div> : null}
                      </>
                    }
                    officialEventUrl={member.ride_event_url || officialEventUrl}
                  />
                ))}

                {rideNeedMembers
                  .filter((member) => member.ride_status === "need")
                  .map((member) => (
                    <MemberCard
                      key={`ride-need-${member.user_id}`}
                      member={member}
                      extraTitle={getRideStatusLabel(member.ride_status) || "Carona"}
                      extraBody={
                        <>
                          {hasContent(member.ride_event_name) ? <div><strong>Evento:</strong> {member.ride_event_name}</div> : null}
                          {hasContent(member.ride_origin) ? <div><strong>Origem:</strong> {member.ride_origin}</div> : null}
                          {hasContent(member.ride_destination) ? <div><strong>Destino:</strong> {member.ride_destination}</div> : null}
                          {hasContent(member.ride_notes) ? <div><strong>Observações:</strong> {member.ride_notes}</div> : null}
                        </>
                      }
                      officialEventUrl={member.ride_event_url || officialEventUrl}
                    />
                  ))}
              </div>
            )}
          </section>

          <section style={sectionStyle()}>
            <div style={{ display: "grid", gap: 6 }}>
              <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>
                Encontros combinados
              </h2>
              <p style={{ margin: 0, opacity: 0.82 }}>
                Pontos de encontro e horários que já foram marcados para este evento.
              </p>
            </div>

            {meetMembers.length === 0 ? (
              <div style={emptyCardStyle()}>Ainda não há encontros ativos mapeados para este evento.</div>
            ) : (
              <div style={memberGridStyle()}>
                {meetMembers.map((member) => (
                  <MemberCard
                    key={`meet-${member.user_id}`}
                    member={member}
                    extraTitle={getMeetStatusLabel(member.meet_status) || "Encontro"}
                    extraBody={
                      <>
                        {hasContent(member.meet_event_name) ? <div><strong>Evento:</strong> {member.meet_event_name}</div> : null}
                        {hasContent(member.meet_meeting_point) ? <div><strong>Ponto:</strong> {member.meet_meeting_point}</div> : null}
                        {hasContent(member.meet_time) ? <div><strong>Horário:</strong> {member.meet_time}</div> : null}
                        {hasContent(member.meet_notes) ? <div><strong>Observações:</strong> {member.meet_notes}</div> : null}
                      </>
                    }
                    officialEventUrl={member.meet_event_url || officialEventUrl}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}