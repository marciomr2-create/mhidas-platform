// src/app/api/official-events/admin/ticket-links/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type TicketLinkAction = "activate" | "pause" | "clear";

type JsonObject = Record<string, unknown>;

type RequestBody = JsonObject & {
  action?: unknown;
  groupId?: unknown;
  partnerTicketUrl?: unknown;
  partnerName?: unknown;
  buttonLabel?: unknown;
  expiresAt?: unknown;
};

type EventGroupRecord = {
  group_id: string;
  event_name: string | null;
  event_slug: string | null;
  status: string | null;
  is_public: boolean | null;
  official_status: string | null;
  official_url: string | null;
  partner_ticket_url: string | null;
  partner_ticket_status: string | null;
  partner_ticket_partner_name: string | null;
  partner_ticket_source: string | null;
  partner_ticket_button_label: string | null;
  partner_ticket_activated_at: string | null;
  partner_ticket_paused_at: string | null;
  partner_ticket_expires_at: string | null;
  partner_ticket_updated_at: string | null;
  partner_ticket_updated_by: string | null;
};

const EVENT_GROUP_SELECT = [
  "group_id",
  "event_name",
  "event_slug",
  "status",
  "is_public",
  "official_status",
  "official_url",
  "partner_ticket_url",
  "partner_ticket_status",
  "partner_ticket_partner_name",
  "partner_ticket_source",
  "partner_ticket_button_label",
  "partner_ticket_activated_at",
  "partner_ticket_paused_at",
  "partner_ticket_expires_at",
  "partner_ticket_updated_at",
  "partner_ticket_updated_by",
].join(",");

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeNullableText(value: unknown, maximumLength: number): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  return text.slice(0, maximumLength);
}

function isPlainObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    host === "localhost" ||
    host === "::1" ||
    host.endsWith(".local") ||
    /^0\./.test(host) ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    return true;
  }

  const private172 = host.match(/^172\.(\d{1,3})\./);
  if (!private172) return false;

  const secondOctet = Number(private172[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

function normalizePublicHttpsUrl(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;

  try {
    const url = new URL(text);

    if (url.protocol !== "https:") return null;
    if (!url.hostname || isPrivateOrLocalHostname(url.hostname)) return null;
    if (url.username || url.password) return null;

    return url.toString();
  } catch {
    return null;
  }
}

function normalizeFutureExpiration(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Data de expiracao invalida.");
  }

  if (date.getTime() <= Date.now()) {
    throw new Error("A expiracao deve estar no futuro.");
  }

  return date.toISOString();
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

function isTicketLinkAction(value: unknown): value is TicketLinkAction {
  return ["activate", "pause", "clear"].includes(normalizeText(value));
}

export async function POST(request: NextRequest) {
  const sessionClient = await createServerSupabaseClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        message: "Autenticacao administrativa obrigatoria.",
      },
      { status: 401 }
    );
  }

  if (!isAdminAllowed(user.id, user.email)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Usuario sem autorizacao administrativa.",
      },
      { status: 403 }
    );
  }

  let body: RequestBody | null = null;

  try {
    const parsed = await request.json();
    body = isPlainObject(parsed) ? (parsed as RequestBody) : null;
  } catch {
    body = null;
  }

  if (!body) {
    return NextResponse.json(
      {
        ok: false,
        message: "Corpo JSON obrigatorio.",
      },
      { status: 400 }
    );
  }

  const groupId = normalizeText(body.groupId);
  const action = body.action;

  if (!groupId || !isTicketLinkAction(action)) {
    return NextResponse.json(
      {
        ok: false,
        message: "groupId e action validos sao obrigatorios.",
      },
      { status: 400 }
    );
  }

  const adminClient = getAdminClient();

  if (!adminClient) {
    return NextResponse.json(
      {
        ok: false,
        message: "Cliente administrativo do Supabase nao configurado.",
      },
      { status: 500 }
    );
  }

  const { data: currentData, error: currentError } = await adminClient
    .from("event_groups")
    .select(EVENT_GROUP_SELECT)
    .eq("group_id", groupId)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json(
      {
        ok: false,
        message: currentError.message || "Falha ao ler o evento.",
      },
      { status: 500 }
    );
  }

  const current =
    (currentData ?? null) as unknown as EventGroupRecord | null;

  if (!current) {
    return NextResponse.json(
      {
        ok: false,
        message: "Evento nao encontrado.",
      },
      { status: 404 }
    );
  }

  if (action === "activate") {
    if (
      normalizeText(current.official_status).toLowerCase() !== "confirmed" ||
      current.is_public !== true
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Somente eventos oficiais confirmados e publicos podem receber link monetizado.",
        },
        { status: 409 }
      );
    }
  }

  const now = new Date().toISOString();
  let updatePayload: Record<string, unknown>;

  try {
    if (action === "activate") {
      const partnerTicketUrl = normalizePublicHttpsUrl(body.partnerTicketUrl);

      if (!partnerTicketUrl) {
        return NextResponse.json(
          {
            ok: false,
            message: "Informe uma URL publica HTTPS valida.",
          },
          { status: 400 }
        );
      }

      updatePayload = {
        partner_ticket_url: partnerTicketUrl,
        partner_ticket_status: "active",
        partner_ticket_partner_name: normalizeNullableText(body.partnerName, 160),
        partner_ticket_source: "admin",
        partner_ticket_button_label:
          normalizeNullableText(body.buttonLabel, 80) || "Comprar ingresso",
        partner_ticket_activated_at: now,
        partner_ticket_paused_at: null,
        partner_ticket_expires_at: normalizeFutureExpiration(body.expiresAt),
        partner_ticket_updated_at: now,
        partner_ticket_updated_by: user.id,
      };
    } else if (action === "pause") {
      updatePayload = {
        partner_ticket_status: "paused",
        partner_ticket_paused_at: now,
        partner_ticket_updated_at: now,
        partner_ticket_updated_by: user.id,
      };
    } else {
      updatePayload = {
        partner_ticket_url: null,
        partner_ticket_status: "inactive",
        partner_ticket_partner_name: null,
        partner_ticket_source: "admin",
        partner_ticket_button_label: "Comprar ingresso",
        partner_ticket_is_featured: false,
        partner_ticket_activated_at: null,
        partner_ticket_paused_at: null,
        partner_ticket_expires_at: null,
        partner_ticket_updated_at: now,
        partner_ticket_updated_by: user.id,
      };
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Dados invalidos.",
      },
      { status: 400 }
    );
  }

  const { data: updatedData, error: updateError } = await adminClient
    .from("event_groups")
    .update(updatePayload)
    .eq("group_id", groupId)
    .select(EVENT_GROUP_SELECT)
    .single();

  if (updateError) {
    return NextResponse.json(
      {
        ok: false,
        message: updateError.message || "Falha ao atualizar o link monetizado.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    action,
    message:
      action === "activate"
        ? "Link monetizado ativado."
        : action === "pause"
          ? "Link monetizado pausado."
          : "Link monetizado removido.",
    eventGroup: updatedData as unknown as EventGroupRecord,
    database_write_performed: true,
    official_url_changed: false,
    canonical_event_changed: false,
  });
}
