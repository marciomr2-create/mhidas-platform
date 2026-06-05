// src/app/event/[event_slug]/ticket-intent-preview/page.tsx

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import TicketIntentButton from "../TicketIntentButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type PageProps = {
  params: Promise<{ event_slug: string }>;
  searchParams?: Promise<{ event_group_id?: string }>;
};

type EventGroupPreviewRow = {
  group_id: string;
  event_name: string | null;
  event_slug: string | null;
  city_base: string | null;
  event_date: string | null;
  official_status: string | null;
  partner_ticket_status: string | null;
  event_image_url: string | null;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function formatEventDate(value: string | null) {
  const text = normalizeText(value);

  if (!text) {
    return "Data a confirmar";
  }

  const [year, month, day] = text.slice(0, 10).split("-").map(Number);

  if (!year || !month || !day) {
    return text;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function pageStyle(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(125,92,255,0.28), transparent 36%), #050505",
    color: "#ffffff",
    padding: "28px 18px 42px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };
}

function shellStyle(): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 760,
    margin: "0 auto",
    display: "grid",
    gap: 18,
  };
}

function cardStyle(): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 28,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035))",
    boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
    overflow: "hidden",
  };
}

function badgeStyle(): React.CSSProperties {
  return {
    width: "fit-content",
    border: "1px solid rgba(0,255,190,0.26)",
    borderRadius: 999,
    padding: "8px 11px",
    color: "rgba(196,255,235,0.96)",
    background: "rgba(0,255,190,0.09)",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };
}

export default async function TicketIntentPreviewPage({
  params,
  searchParams,
}: PageProps) {
  if (process.env.NODE_ENV === "production") {
    return (
      <main style={pageStyle()}>
        <div style={shellStyle()}>
          <section style={{ ...cardStyle(), padding: 22 }}>
            <span style={badgeStyle()}>Preview interno</span>
            <h1 style={{ margin: "14px 0 8px", fontSize: 28, lineHeight: 1 }}>
              Preview indisponível em produção
            </h1>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.72)", lineHeight: 1.65 }}>
              Esta rota existe apenas para validação local do componente antes de
              encaixar o botão na página oficial do evento.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const eventSlug = normalizeText(resolvedParams.event_slug);
  const eventGroupId = normalizeText(resolvedSearchParams.event_group_id);

  let eventGroup: EventGroupPreviewRow | null = null;
  let loadError = "";

  try {
    const supabase = createServiceRoleClient();

    let query = supabase
      .from("event_groups")
      .select(
        "group_id,event_name,event_slug,city_base,event_date,official_status,partner_ticket_status,event_image_url"
      )
      .limit(1);

    if (eventGroupId && isUuidLike(eventGroupId)) {
      query = query.eq("group_id", eventGroupId);
    } else {
      query = query.eq("event_slug", eventSlug);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      loadError = error.message;
    } else {
      eventGroup = data as EventGroupPreviewRow | null;
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown preview error.";
  }

  const heroImage =
    normalizeText(eventGroup?.event_image_url) ||
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1800&auto=format&fit=crop";

  return (
    <main style={pageStyle()}>
      <div style={shellStyle()}>
        <section style={cardStyle()}>
          <div
            style={{
              minHeight: 220,
              padding: 22,
              display: "grid",
              alignContent: "end",
              gap: 12,
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.86)), url("${heroImage}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <span style={badgeStyle()}>Preview local</span>

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  lineHeight: 0.98,
                  fontWeight: 950,
                  letterSpacing: "-0.04em",
                }}
              >
                {normalizeText(eventGroup?.event_name) || "Evento não encontrado"}
              </h1>

              <p
                style={{
                  margin: "10px 0 0",
                  color: "rgba(255,255,255,0.76)",
                  lineHeight: 1.55,
                  fontSize: 14,
                }}
              >
                {eventGroup
                  ? `${formatEventDate(eventGroup.event_date)} · ${
                      normalizeText(eventGroup.city_base) || "Cidade a confirmar"
                    }`
                  : "Use event_group_id na URL para testar um evento privado."}
              </p>
            </div>
          </div>

          <div style={{ padding: 18, display: "grid", gap: 14 }}>
            {eventGroup ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    padding: 14,
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.05)",
                  }}
                >
                  <strong style={{ fontSize: 13 }}>Contexto do preview</strong>
                  <span style={{ color: "rgba(255,255,255,0.66)", fontSize: 12 }}>
                    Event group: {eventGroup.group_id}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.66)", fontSize: 12 }}>
                    Official status: {normalizeText(eventGroup.official_status) || "none"}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.66)", fontSize: 12 }}>
                    Partner ticket status:{" "}
                    {normalizeText(eventGroup.partner_ticket_status) || "inactive"}
                  </span>
                </div>

                <TicketIntentButton eventGroupId={eventGroup.group_id} compact />
              </>
            ) : (
              <div
                style={{
                  padding: 16,
                  borderRadius: 20,
                  border: "1px solid rgba(248,113,113,0.24)",
                  background: "rgba(248,113,113,0.08)",
                  color: "rgba(255,220,220,0.95)",
                  lineHeight: 1.55,
                }}
              >
                <strong>Evento não encontrado para este preview.</strong>
                <p style={{ margin: "8px 0 0" }}>
                  {loadError || "Informe um event_group_id válido na URL."}
                </p>
              </div>
            )}

            <Link
              href={`/event/${eventSlug}`}
              style={{
                color: "rgba(255,255,255,0.74)",
                fontSize: 13,
                textDecoration: "none",
                fontWeight: 800,
              }}
            >
              Voltar para a página do evento
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}