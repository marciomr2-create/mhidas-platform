// src/app/dashboard/admin/official-events/page.tsx

import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type AdminClient = {
  from: (table: string) => any;
};

type CandidateStatus = "probable" | "review" | "confirmed" | "rejected" | "expired";

type CandidateRow = {
  candidate_id: string;
  provider: string;
  provider_event_id: string | null;
  provider_url: string | null;
  event_name: string;
  artist_name: string | null;
  event_date: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  official_url: string | null;
  ticket_url: string | null;
  source_name: string | null;
  source_type: string | null;
  candidate_status: CandidateStatus;
  confidence: number | null;
  event_group_id: string | null;
  updated_at: string | null;
};

type EventGroupRow = {
  group_id: string;
  event_name: string | null;
  event_date: string | null;
  event_slug: string | null;
  city_base: string | null;
  status: string | null;
  is_public: boolean | null;
  official_status: string | null;
  official_url: string | null;
  official_source_name: string | null;
  official_source_type: string | null;
  official_confidence: number | null;
};

type CandidateView = CandidateRow & {
  primaryOfficialUrl: string | null;
  hasValidOfficialUrl: boolean;
  hasEventGroup: boolean;
  recommendedAction: string;
  eventGroup: EventGroupRow | null;
};

type AdminData = {
  ok: boolean;
  message: string;
  candidates: CandidateView[];
  summary: {
    total: number;
    probableCount: number;
    reviewCount: number;
    confirmedCount: number;
    rejectedCount: number;
    expiredCount: number;
    withEventGroupCount: number;
    withoutEventGroupCount: number;
    withValidOfficialUrlCount: number;
  };
};

function pageStyle(): CSSProperties {
  return {
    maxWidth: 1180,
    margin: "0 auto",
    padding: 24,
    display: "grid",
    gap: 22,
  };
}

function panelStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 22,
    padding: 18,
  };
}

function heroStyle(): CSSProperties {
  return {
    ...panelStyle(),
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
    display: "grid",
    gap: 10,
  };
}

function gridStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  };
}

function statStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.035)",
    borderRadius: 18,
    padding: 14,
    display: "grid",
    gap: 6,
  };
}

function cardStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.035)",
    borderRadius: 20,
    padding: 16,
    display: "grid",
    gap: 12,
  };
}

function badgeStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    fontWeight: 700,
  };
}

function linkButtonStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.07)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 800,
  };
}

function mutedTextStyle(): CSSProperties {
  return {
    margin: 0,
    opacity: 0.78,
    lineHeight: 1.55,
  };
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function isValidHttpUrl(value: unknown): boolean {
  const text = normalizeText(value);

  if (!text) return false;

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getPrimaryOfficialUrl(candidate: CandidateRow): string | null {
  return (
    normalizeText(candidate.official_url) ||
    normalizeText(candidate.ticket_url) ||
    normalizeText(candidate.provider_url) ||
    null
  );
}

function resolveAction(candidate: CandidateRow, hasValidOfficialUrl: boolean, hasEventGroup: boolean): string {
  if (candidate.candidate_status === "confirmed") return "already_confirmed";
  if (candidate.candidate_status === "rejected") return "review_rejected";
  if (candidate.candidate_status === "expired") return "review_expired";
  if (!hasValidOfficialUrl) return "missing_official_url";
  if (!hasEventGroup) return "select_event_group";
  return "run_confirmation_dry_run";
}

function formatDate(value: string | null): string {
  if (!value) return "Not available";

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const date = new Date(year, month - 1, day);

    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(date);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
}

function formatDateTime(value: string | null): string {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getAdminClient(): AdminClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as AdminClient;
}

function isAdminAllowed(userId: string, email: string | undefined): boolean {
  const allowedUserIds = String(process.env.OFFICIAL_EVENTS_ADMIN_USER_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const allowedEmails = String(process.env.OFFICIAL_EVENTS_ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (allowedUserIds.length > 0 && allowedUserIds.includes(userId)) return true;
  if (email && allowedEmails.length > 0 && allowedEmails.includes(email.toLowerCase())) return true;

  return process.env.NODE_ENV !== "production" && allowedUserIds.length === 0 && allowedEmails.length === 0;
}

async function loadAdminData(): Promise<AdminData> {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return {
      ok: false,
      message: "Supabase service role is not configured.",
      candidates: [],
      summary: emptySummary(),
    };
  }

  const { data, error } = await adminClient
    .from("official_event_candidates")
    .select(
      [
        "candidate_id",
        "provider",
        "provider_event_id",
        "provider_url",
        "event_name",
        "artist_name",
        "event_date",
        "venue_name",
        "city",
        "state",
        "country",
        "official_url",
        "ticket_url",
        "source_name",
        "source_type",
        "candidate_status",
        "confidence",
        "event_group_id",
        "updated_at",
      ].join(",")
    )
    .in("candidate_status", ["probable", "review", "confirmed", "rejected", "expired"])
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return {
      ok: false,
      message: error.message || "Failed to load candidates.",
      candidates: [],
      summary: emptySummary(),
    };
  }

  const candidates = (Array.isArray(data) ? data : []) as CandidateRow[];
  const eventGroupIds = Array.from(
    new Set(candidates.map((candidate) => normalizeText(candidate.event_group_id)).filter(Boolean))
  );

  const eventGroupById = new Map<string, EventGroupRow>();

  if (eventGroupIds.length > 0) {
    const { data: eventGroups } = await adminClient
      .from("event_groups")
      .select(
        [
          "group_id",
          "event_name",
          "event_date",
          "event_slug",
          "city_base",
          "status",
          "is_public",
          "official_status",
          "official_url",
          "official_source_name",
          "official_source_type",
          "official_confidence",
        ].join(",")
      )
      .in("group_id", eventGroupIds);

    const rows = (Array.isArray(eventGroups) ? eventGroups : []) as EventGroupRow[];

    for (const row of rows) {
      eventGroupById.set(row.group_id, row);
    }
  }

  const enriched = candidates.map((candidate) => {
    const primaryOfficialUrl = getPrimaryOfficialUrl(candidate);
    const hasValidOfficialUrl = isValidHttpUrl(primaryOfficialUrl);
    const hasEventGroup = Boolean(normalizeText(candidate.event_group_id));

    return {
      ...candidate,
      primaryOfficialUrl,
      hasValidOfficialUrl,
      hasEventGroup,
      recommendedAction: resolveAction(candidate, hasValidOfficialUrl, hasEventGroup),
      eventGroup: candidate.event_group_id
        ? eventGroupById.get(candidate.event_group_id) || null
        : null,
    };
  });

  return {
    ok: true,
    message: "Admin preview loaded.",
    candidates: enriched,
    summary: summarize(enriched),
  };
}

function emptySummary() {
  return {
    total: 0,
    probableCount: 0,
    reviewCount: 0,
    confirmedCount: 0,
    rejectedCount: 0,
    expiredCount: 0,
    withEventGroupCount: 0,
    withoutEventGroupCount: 0,
    withValidOfficialUrlCount: 0,
  };
}

function summarize(candidates: CandidateView[]) {
  return {
    total: candidates.length,
    probableCount: candidates.filter((item) => item.candidate_status === "probable").length,
    reviewCount: candidates.filter((item) => item.candidate_status === "review").length,
    confirmedCount: candidates.filter((item) => item.candidate_status === "confirmed").length,
    rejectedCount: candidates.filter((item) => item.candidate_status === "rejected").length,
    expiredCount: candidates.filter((item) => item.candidate_status === "expired").length,
    withEventGroupCount: candidates.filter((item) => item.hasEventGroup).length,
    withoutEventGroupCount: candidates.filter((item) => !item.hasEventGroup).length,
    withValidOfficialUrlCount: candidates.filter((item) => item.hasValidOfficialUrl).length,
  };
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={statStyle()}>
      <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 950 }}>{value}</div>
    </div>
  );
}

function CandidateCard({ candidate }: { candidate: CandidateView }) {
  return (
    <article style={cardStyle()}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <span style={badgeStyle()}>{candidate.provider}</span>
        <span style={badgeStyle()}>{candidate.candidate_status}</span>
        <span style={badgeStyle()}>{candidate.recommendedAction}</span>
      </div>

      <div>
        <h2 style={{ margin: 0, fontSize: 22 }}>{candidate.event_name}</h2>
        <p style={mutedTextStyle()}>
          {candidate.artist_name || "Artist not available"} | {candidate.venue_name || "Venue not available"}
        </p>
      </div>

      <div style={gridStyle()}>
        <div>
          <strong>Date</strong>
          <p style={mutedTextStyle()}>{formatDate(candidate.event_date)}</p>
        </div>

        <div>
          <strong>Location</strong>
          <p style={mutedTextStyle()}>
            {[candidate.city, candidate.state, candidate.country].filter(Boolean).join(", ") || "Not available"}
          </p>
        </div>

        <div>
          <strong>Confidence</strong>
          <p style={mutedTextStyle()}>{candidate.confidence ?? 0}</p>
        </div>

        <div>
          <strong>Updated</strong>
          <p style={mutedTextStyle()}>{formatDateTime(candidate.updated_at)}</p>
        </div>
      </div>

      {candidate.eventGroup ? (
        <div style={panelStyle()}>
          <strong>Linked event group</strong>
          <p style={mutedTextStyle()}>
            {candidate.eventGroup.event_name || "Unnamed group"} | {candidate.eventGroup.city_base || "No city"}
          </p>
          <p style={mutedTextStyle()}>
            Group status: {candidate.eventGroup.status || "unknown"} | Official status:{" "}
            {candidate.eventGroup.official_status || "unknown"} | Public:{" "}
            {candidate.eventGroup.is_public ? "yes" : "no"}
          </p>
        </div>
      ) : (
        <div style={panelStyle()}>
          <strong>No linked event group</strong>
          <p style={mutedTextStyle()}>This candidate still needs a target event group.</p>
        </div>
      )}

      {candidate.primaryOfficialUrl ? (
        <a
          href={candidate.primaryOfficialUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={linkButtonStyle()}
        >
          Open official link
        </a>
      ) : null}
    </article>
  );
}

export default async function OfficialEventsAdminPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdminAllowed(user.id, user.email)) {
    return (
      <main style={pageStyle()}>
        <section style={heroStyle()}>
          <span style={badgeStyle()}>Admin access required</span>
          <h1 style={{ margin: 0, fontSize: 32 }}>Official Events Admin</h1>
          <p style={mutedTextStyle()}>
            Your user is logged in, but it is not allowed to access this admin page.
          </p>
          <Link href="/dashboard" style={linkButtonStyle()}>
            Back to dashboard
          </Link>
        </section>
      </main>
    );
  }

  const data = await loadAdminData();

  return (
    <main style={pageStyle()}>
      <section style={heroStyle()}>
        <span style={badgeStyle()}>Read-only internal preview</span>
        <h1 style={{ margin: 0, fontSize: 34 }}>Official Events Admin</h1>
        <p style={mutedTextStyle()}>
          Internal view for official event candidates. This page does not write data and does not confirm events.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/dashboard" style={linkButtonStyle()}>
            Back to dashboard
          </Link>
          <Link href="/dashboard/cards" style={linkButtonStyle()}>
            My cards
          </Link>
        </div>
      </section>

      {!data.ok ? (
        <section style={panelStyle()}>
          <h2 style={{ marginTop: 0 }}>Unable to load admin preview</h2>
          <p style={mutedTextStyle()}>{data.message}</p>
        </section>
      ) : null}

      <section style={gridStyle()}>
        <StatCard label="TOTAL" value={data.summary.total} />
        <StatCard label="PROBABLE" value={data.summary.probableCount} />
        <StatCard label="REVIEW" value={data.summary.reviewCount} />
        <StatCard label="CONFIRMED" value={data.summary.confirmedCount} />
        <StatCard label="WITH GROUP" value={data.summary.withEventGroupCount} />
        <StatCard label="VALID URL" value={data.summary.withValidOfficialUrlCount} />
      </section>

      <section style={{ display: "grid", gap: 14 }}>
        <div style={panelStyle()}>
          <h2 style={{ marginTop: 0 }}>Candidates</h2>
          <p style={mutedTextStyle()}>
            Showing latest candidates from official_event_candidates. Actions will be added in a later version.
          </p>
        </div>

        {data.candidates.length === 0 ? (
          <div style={panelStyle()}>
            <h3 style={{ marginTop: 0 }}>No candidates found</h3>
            <p style={mutedTextStyle()}>Run the resolver first to populate candidates.</p>
          </div>
        ) : (
          data.candidates.map((candidate) => (
            <CandidateCard key={candidate.candidate_id} candidate={candidate} />
          ))
        )}
      </section>
    </main>
  );
}