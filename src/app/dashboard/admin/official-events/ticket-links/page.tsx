// src/app/dashboard/admin/official-events/ticket-links/page.tsx

import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import TicketLinkAdminCard from "./TicketLinkAdminCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type EventGroupRow = {
  group_id: string;
  event_name: string | null;
  event_slug: string | null;
  event_date: string | null;
  city_base: string | null;
  status: string | null;
  is_public: boolean | null;
  official_status: string | null;
  official_url: string | null;
  partner_ticket_url: string | null;
  partner_ticket_status: string | null;
  partner_ticket_partner_name: string | null;
  partner_ticket_button_label: string | null;
  partner_ticket_expires_at: string | null;
};

function pageStyle(): CSSProperties {
  return {
    maxWidth: 1080,
    margin: "0 auto",
    padding: 24,
    display: "grid",
    gap: 18,
  };
}

function panelStyle(): CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 18,
    background: "rgba(255,255,255,0.035)",
  };
}

function linkStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 12,
    padding: "10px 13px",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 900,
  };
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

  if (allowedUserIds.includes(userId)) return true;

  if (email && allowedEmails.includes(email.trim().toLowerCase())) {
    return true;
  }

  return (
    process.env.NODE_ENV !== "production" &&
    allowedUserIds.length === 0 &&
    allowedEmails.length === 0
  );
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function loadEventGroups(): Promise<{
  rows: EventGroupRow[];
  error: string | null;
}> {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return {
      rows: [],
      error: "Cliente administrativo do Supabase nao configurado.",
    };
  }

  const { data, error } = await adminClient
    .from("event_groups")
    .select(
      [
        "group_id",
        "event_name",
        "event_slug",
        "event_date",
        "city_base",
        "status",
        "is_public",
        "official_status",
        "official_url",
        "partner_ticket_url",
        "partner_ticket_status",
        "partner_ticket_partner_name",
        "partner_ticket_button_label",
        "partner_ticket_expires_at",
      ].join(",")
    )
    .eq("official_status", "confirmed")
    .eq("is_public", true)
    .order("event_date", { ascending: true })
    .limit(100);

  if (error) {
    return {
      rows: [],
      error: error.message || "Falha ao carregar eventos oficiais.",
    };
  }

  return {
    rows: (Array.isArray(data) ? data : []) as unknown as EventGroupRow[],
    error: null,
  };
}

export default async function TicketLinksAdminPage() {
  const sessionClient = await createServerSupabaseClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdminAllowed(user.id, user.email)) {
    return (
      <main style={pageStyle()}>
        <section style={panelStyle()}>
          <h1 style={{ marginTop: 0 }}>Monetizacao de ingressos</h1>
          <p>Seu usuario nao possui autorizacao administrativa.</p>
          <Link href="/dashboard" style={linkStyle()}>
            Voltar ao painel
          </Link>
        </section>
      </main>
    );
  }

  const result = await loadEventGroups();

  return (
    <main style={pageStyle()}>
      <section style={panelStyle()}>
        <p style={{ margin: 0, opacity: 0.72, fontWeight: 800 }}>
          PLANO B | MONETIZACAO ESSENCIAL
        </p>
        <h1 style={{ marginBottom: 8 }}>Links monetizados de ingressos</h1>
        <p style={{ margin: 0, opacity: 0.82, lineHeight: 1.55 }}>
          O link oficial continua sendo a referencia do evento. O botao
          Comprar ingresso aparece somente quando o admin ativa uma URL
          publica HTTPS para um evento oficial confirmado.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 16,
          }}
        >
          <Link
            href="/dashboard/admin/official-events"
            style={linkStyle()}
          >
            Voltar aos eventos oficiais
          </Link>
          <Link href="/dashboard" style={linkStyle()}>
            Voltar ao painel
          </Link>
        </div>
      </section>

      {result.error ? (
        <section style={panelStyle()}>
          <h2 style={{ marginTop: 0 }}>Nao foi possivel carregar</h2>
          <p style={{ marginBottom: 0 }}>{result.error}</p>
        </section>
      ) : null}

      {!result.error && result.rows.length === 0 ? (
        <section style={panelStyle()}>
          <strong>Nenhum evento oficial confirmado e publico encontrado.</strong>
        </section>
      ) : null}

      {result.rows.map((eventGroup) => (
        <TicketLinkAdminCard
          key={eventGroup.group_id}
          groupId={eventGroup.group_id}
          eventName={eventGroup.event_name || "Evento sem nome"}
          eventSlug={eventGroup.event_slug || ""}
          eventDate={eventGroup.event_date}
          cityBase={eventGroup.city_base}
          officialUrl={eventGroup.official_url}
          initialUrl={eventGroup.partner_ticket_url}
          initialStatus={eventGroup.partner_ticket_status}
          initialPartnerName={eventGroup.partner_ticket_partner_name}
          initialButtonLabel={eventGroup.partner_ticket_button_label}
          initialExpiresAt={eventGroup.partner_ticket_expires_at}
        />
      ))}
    </main>
  );
}
