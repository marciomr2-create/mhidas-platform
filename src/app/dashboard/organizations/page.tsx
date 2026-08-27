// src/app/dashboard/organizations/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type MemberRow = { id: string; role: string };

type TribeParentRow = {
  tribe_id: string;
  event_group_id: string;
  creator_user_id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
};

type RideParentRow = {
  ride_id: string;
  event_group_id: string;
  creator_user_id: string;
  mode: string;
  origin_label: string;
  destination_label: string;
  departure_at: string | null;
  status: string;
  created_at: string;
};

type MeetupParentRow = {
  meetup_id: string;
  event_group_id: string;
  creator_user_id: string;
  name: string;
  meeting_point_label: string;
  starts_at: string;
  status: string;
  created_at: string;
};

type EventRow = {
  group_id: string;
  event_name: string | null;
  event_slug: string | null;
  event_date: string | null;
  city_base: string | null;
};
type Organization = {
  kind: "tribe" | "ride" | "meetup";
  id: string;
  event_group_id: string;
  event_name: string;
  event_slug: string | null;
  event_date: string | null;
  city_base: string | null;
  title: string;
  summary: string;
  role: string;
  status: string;
  starts_at: string | null;
};

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function roleLabel(role: string) {
  if (role === "creator") return "Criador";
  if (role === "organizer") return "Organizador";
  if (role === "moderator") return "Moderador";
  if (role === "driver") return "Motorista";
  if (role === "passenger") return "Passageiro";
  return "Participante";
}

function kindLabel(kind: Organization["kind"]) {
  if (kind === "tribe") return "Tribo";
  if (kind === "ride") return "Carona";
  return "Encontro";
}

function statusLabel(status: string) {
  return status === "closed" ? "Encerrada" : "Ativa";
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function OrganizationsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userId = user.id;
  const errors: string[] = [];

  const [tm, rm, mm, ot, or, om] = await Promise.all([
    supabase.from("event_tribe_members")
      .select("tribe_id,role,status").eq("user_id", userId).eq("status", "approved"),
    supabase.from("event_ride_members")
      .select("ride_id,role,status").eq("user_id", userId).eq("status", "approved"),
    supabase.from("event_meetup_members")
      .select("meetup_id,role,status").eq("user_id", userId).eq("status", "approved"),
    supabase.from("event_tribes")
      .select("tribe_id,event_group_id,creator_user_id,name,description,status,created_at")
      .eq("creator_user_id", userId).in("status", ["active", "closed"]),
    supabase.from("event_rides")
      .select("ride_id,event_group_id,creator_user_id,mode,origin_label,destination_label,departure_at,status,created_at")
      .eq("creator_user_id", userId).in("status", ["active", "closed"]),
    supabase.from("event_meetups")
      .select("meetup_id,event_group_id,creator_user_id,name,meeting_point_label,starts_at,status,created_at")
      .eq("creator_user_id", userId).in("status", ["active", "closed"]),
  ]);

  for (const [label, error] of [
    ["tribos", tm.error], ["caronas", rm.error], ["encontros", mm.error],
    ["tribos criadas", ot.error], ["caronas criadas", or.error], ["encontros criados", om.error],
  ] as const) {
    if (error) errors.push(`${label}: ${error.message}`);
  }

  const tribeMembers = (tm.data ?? []).map((row) => ({
    id: String(row.tribe_id), role: String(row.role),
  })) as MemberRow[];
  const rideMembers = (rm.data ?? []).map((row) => ({
    id: String(row.ride_id), role: String(row.role),
  })) as MemberRow[];
  const meetupMembers = (mm.data ?? []).map((row) => ({
    id: String(row.meetup_id), role: String(row.role),
  })) as MemberRow[];

  let memberTribes: TribeParentRow[] = [];
  let memberRides: RideParentRow[] = [];
  let memberMeetups: MeetupParentRow[] = [];

  if (tribeMembers.length > 0) {
    const { data, error } = await supabase
      .from("event_tribes")
      .select("tribe_id,event_group_id,creator_user_id,name,description,status,created_at")
      .in("tribe_id", tribeMembers.map((x) => x.id))
      .in("status", ["active", "closed"]);

    if (error) errors.push(`tribos participantes: ${error.message}`);
    memberTribes = (data ?? []) as TribeParentRow[];
  }

  if (rideMembers.length > 0) {
    const { data, error } = await supabase
      .from("event_rides")
      .select("ride_id,event_group_id,creator_user_id,mode,origin_label,destination_label,departure_at,status,created_at")
      .in("ride_id", rideMembers.map((x) => x.id))
      .in("status", ["active", "closed"]);

    if (error) errors.push(`caronas participantes: ${error.message}`);
    memberRides = (data ?? []) as RideParentRow[];
  }

  if (meetupMembers.length > 0) {
    const { data, error } = await supabase
      .from("event_meetups")
      .select("meetup_id,event_group_id,creator_user_id,name,meeting_point_label,starts_at,status,created_at")
      .in("meetup_id", meetupMembers.map((x) => x.id))
      .in("status", ["active", "closed"]);

    if (error) errors.push(`encontros participantes: ${error.message}`);
    memberMeetups = (data ?? []) as MeetupParentRow[];
  }

  const tribes = new Map<string, TribeParentRow>();
  for (const row of [
    ...((ot.data ?? []) as TribeParentRow[]),
    ...memberTribes,
  ]) {
    tribes.set(row.tribe_id, row);
  }

  const rides = new Map<string, RideParentRow>();
  for (const row of [
    ...((or.data ?? []) as RideParentRow[]),
    ...memberRides,
  ]) {
    rides.set(row.ride_id, row);
  }

  const meetups = new Map<string, MeetupParentRow>();
  for (const row of [
    ...((om.data ?? []) as MeetupParentRow[]),
    ...memberMeetups,
  ]) {
    meetups.set(row.meetup_id, row);
  }

  const eventIds = Array.from(new Set([
    ...Array.from(tribes.values()).map((x) => String(x.event_group_id)),
    ...Array.from(rides.values()).map((x) => String(x.event_group_id)),
    ...Array.from(meetups.values()).map((x) => String(x.event_group_id)),
  ]));

  const events = new Map<string, EventRow>();
  if (eventIds.length > 0) {
    const { data, error } = await supabase.from("event_groups")
      .select("group_id,event_name,event_slug,event_date,city_base")
      .in("group_id", eventIds);
    if (error) errors.push(`eventos: ${error.message}`);
    for (const row of (data ?? []) as EventRow[]) events.set(row.group_id, row);
  }

  const tribeRoles = new Map(tribeMembers.map((x) => [x.id, x.role]));
  const rideRoles = new Map(rideMembers.map((x) => [x.id, x.role]));
  const meetupRoles = new Map(meetupMembers.map((x) => [x.id, x.role]));
  const organizations: Organization[] = [];

  for (const row of tribes.values()) {
    const id = String(row.tribe_id);
    const eventId = String(row.event_group_id);
    const event = events.get(eventId);
    organizations.push({
      kind: "tribe", id, event_group_id: eventId,
      event_name: clean(event?.event_name) || "Evento",
      event_slug: event?.event_slug ?? null, event_date: event?.event_date ?? null,
      city_base: event?.city_base ?? null,
      title: clean(row.name) || "Tribo",
      summary: clean(row.description) || "Organização temporária entre Clubbers.",
      role: String(row.creator_user_id) === userId ? "creator" : (tribeRoles.get(id) || "member"),
      status: String(row.status), starts_at: String(row.created_at || "") || null,
    });
  }

  for (const row of rides.values()) {
    const id = String(row.ride_id);
    const eventId = String(row.event_group_id);
    const event = events.get(eventId);
    organizations.push({
      kind: "ride", id, event_group_id: eventId,
      event_name: clean(event?.event_name) || "Evento",
      event_slug: event?.event_slug ?? null, event_date: event?.event_date ?? null,
      city_base: event?.city_base ?? null,
      title: String(row.mode) === "seek" ? "Procuro carona" : "Ofereço carona",
      summary: [clean(row.origin_label), clean(row.destination_label)].filter(Boolean).join(" → "),
      role: String(row.creator_user_id) === userId ? "creator" : (rideRoles.get(id) || "member"),
      status: String(row.status), starts_at: row.departure_at ? String(row.departure_at) : null,
    });
  }

  for (const row of meetups.values()) {
    const id = String(row.meetup_id);
    const eventId = String(row.event_group_id);
    const event = events.get(eventId);
    organizations.push({
      kind: "meetup", id, event_group_id: eventId,
      event_name: clean(event?.event_name) || "Evento",
      event_slug: event?.event_slug ?? null, event_date: event?.event_date ?? null,
      city_base: event?.city_base ?? null,
      title: clean(row.name) || "Ponto de encontro",
      summary: clean(row.meeting_point_label) || "Encontro vinculado ao evento.",
      role: String(row.creator_user_id) === userId ? "creator" : (meetupRoles.get(id) || "member"),
      status: String(row.status), starts_at: row.starts_at ? String(row.starts_at) : null,
    });
  }

  organizations.sort((a, b) => {
    const ta = a.event_date ? new Date(a.event_date).getTime() : Number.MAX_SAFE_INTEGER;
    const tb = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER;
    return ta - tb || a.event_name.localeCompare(b.event_name, "pt-BR");
  });

  const counts = {
    all: organizations.length,
    tribes: organizations.filter((x) => x.kind === "tribe").length,
    rides: organizations.filter((x) => x.kind === "ride").length,
    meetups: organizations.filter((x) => x.kind === "meetup").length,
  };

  return (
    <main className="org-shell">
      <style>{`
        .org-shell{width:min(1080px,100%);margin:0 auto;padding:18px 14px 48px;color:#f8fafc;box-sizing:border-box;overflow-x:clip}
        .org-hero,.org-card,.org-empty,.org-error{min-width:0;max-width:100%;box-sizing:border-box}
        .org-hero{border:1px solid var(--mhidas-border);border-radius:26px;padding:22px;background:var(--mhidas-card-dark);display:grid;gap:14px}
        .org-eyebrow{color:var(--mhidas-clubber-action);font-size:11px;font-weight:950;letter-spacing:.07em;text-transform:uppercase}
        .org-back,.org-open{min-height:44px;border-radius:13px;padding:11px 14px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-weight:900;box-sizing:border-box}
        .org-back{width:fit-content;color:#F8FAFC;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.10)}
        .org-open{color:#F8FAFC;background:var(--mhidas-clubber-action-strong);border:1px solid var(--mhidas-border)}
        .org-counts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}
        .org-count{border:1px solid rgba(255,255,255,.10);border-radius:18px;background:var(--mhidas-card-secondary);padding:14px;display:grid;gap:5px}
        .org-count strong{font-size:28px;line-height:1}
        .org-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:11px;margin-top:14px}
        .org-card{border:1px solid rgba(255,255,255,.10);border-radius:22px;background:var(--mhidas-card-dark);padding:16px;display:grid;gap:11px}
        .org-meta{display:flex;flex-wrap:wrap;align-items:center;gap:0;color:rgba(255,255,255,.62);font-size:13px;font-weight:750;line-height:1.45}
        .org-meta-separator{padding:0 7px;color:rgba(255,255,255,.28);font-weight:700}
        .org-empty,.org-error{margin-top:14px;border:1px dashed rgba(255,255,255,.10);border-radius:20px;padding:18px;background:var(--mhidas-card-secondary);color:rgba(255,255,255,.66)}
        .org-error{border-color:rgba(252,165,165,.35);color:#FCA5A5}
        @media(max-width:640px){.org-shell{width:100dvw;max-width:100dvw;margin:0;padding:12px 10px 36px}.org-hero{border-radius:22px;padding:18px 15px}.org-counts{grid-template-columns:repeat(2,minmax(0,1fr))}.org-grid{grid-template-columns:minmax(0,1fr)}}
      `}</style>

      <section className="org-hero">
        <span className="org-eyebrow">USECLUBBERS · ORGANIZAÇÃO SOCIAL</span>
        <h1 style={{margin:0,fontSize:"clamp(32px,8vw,52px)",lineHeight:1,letterSpacing:"-.05em"}}>
          Minhas Organizações
        </h1>
        <p style={{margin:0,color:"rgba(255,255,255,0.66)",lineHeight:1.55,maxWidth:720}}>
          Tribos, caronas e encontros dos eventos em que você participa ou organiza,
          reunidos em uma única central.
        </p>
        <Link href="/dashboard" className="org-back">Voltar ao dashboard</Link>
      </section>

      <section className="org-counts" aria-label="Resumo das organizações">
        {[
          ["Todas", counts.all], ["Tribos", counts.tribes],
          ["Caronas", counts.rides], ["Encontros", counts.meetups],
        ].map(([label, value]) => (
          <div className="org-count" key={String(label)}>
            <span style={{color:"rgba(255,255,255,0.60)",fontWeight:800}}>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      {errors.length > 0 ? (
        <div className="org-error">
          Não foi possível carregar toda a central agora. Nenhuma informação foi alterada.
          {" "}{errors.join(" | ")}
        </div>
      ) : null}

      {organizations.length === 0 ? (
        <div className="org-empty">
          Você ainda não participa de uma Tribo, Carona ou Ponto de Encontro ativo.
          Entre em um evento para criar ou participar de uma organização.
        </div>
      ) : (
        <section className="org-grid" aria-label="Suas organizações">
          {organizations.map((item) => (
            <article className="org-card" key={`${item.kind}:${item.id}`}>
              <span className="org-eyebrow">{kindLabel(item.kind)} · {item.event_name}</span>
              <h2 style={{margin:0,fontSize:23,lineHeight:1.08,letterSpacing:"-.035em",overflowWrap:"anywhere"}}>
                {item.title}
              </h2>
              <p style={{margin:0,color:"rgba(255,255,255,0.66)",lineHeight:1.5,overflowWrap:"anywhere"}}>
                {item.summary}
              </p>
              <div className="org-meta" aria-label="Informações da organização">
                <span>{roleLabel(item.role)}</span>
                <span className="org-meta-separator" aria-hidden="true">·</span>
                <span>{statusLabel(item.status)}</span>
                {formatDate(item.event_date) ? (
                  <>
                    <span className="org-meta-separator" aria-hidden="true">·</span>
                    <span>{formatDate(item.event_date)}</span>
                  </>
                ) : null}
                {clean(item.city_base) ? (
                  <>
                    <span className="org-meta-separator" aria-hidden="true">·</span>
                    <span>{clean(item.city_base)}</span>
                  </>
                ) : null}
              </div>
              {item.event_slug ? (
                <Link href={`/event/${item.event_slug}`} className="org-open">Abrir no evento</Link>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
