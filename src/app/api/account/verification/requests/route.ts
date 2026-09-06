// src/app/api/account/verification/requests/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EntityType = "artist" | "club" | "festival" | "organization";
type RequestKind = "create" | "claim";

type JsonObject = Record<string, unknown>;

const ENTITY_TYPES = new Set<EntityType>([
  "artist",
  "club",
  "festival",
  "organization",
]);
const REQUEST_KINDS = new Set<RequestKind>(["create", "claim"]);
const ORGANIZATION_TYPES = new Set([
  "producer",
  "promoter",
  "agency",
  "ticketing",
  "brand",
  "partner",
  "other",
]);

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "yahoo.com",
  "proton.me",
  "protonmail.com",
]);
const WITHDRAWABLE_STATUSES = new Set([
  "draft",
  "submitted",
  "in_review",
  "more_info_required",
]);

function responseError(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function hasControlCharacters(value: string): boolean {
  return /[\u0000-\u001F\u007F]/.test(value);
}

function normalizeHandle(value: unknown): string {
  const raw = cleanText(value, 80).replace(/^@+/, "");
  if (!raw) return "";

  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

function validEmail(value: string): boolean {
  return (
    value.length >= 5 &&
    value.length <= 320 &&
    !hasControlCharacters(value) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function professionalDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(domain)) return null;
  if (domain.length < 3 || domain.length > 253) return null;
  return domain;
}

function parseHttpsUrl(value: unknown, allowedHosts?: string[]): string | null {
  const raw = cleanText(value, 2048);
  if (!raw) return null;
  if (hasControlCharacters(raw)) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (!url.hostname) return null;

    if (allowedHosts && allowedHosts.length > 0) {
      const host = url.hostname.toLowerCase();
      const matches = allowedHosts.some(
        (allowed) => host === allowed || host.endsWith(`.${allowed}`)
      );
      if (!matches) return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function requestOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (origin) {
    try {
      return new URL(origin).origin === request.nextUrl.origin;
    } catch {
      return false;
    }
  }

  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }

  return true;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function rollbackCreatedRequest(
  admin: NonNullable<ReturnType<typeof adminClient>>,
  requestId: string
) {
  await admin.from("entity_verification_requests").delete().eq("request_id", requestId);
}

export async function POST(request: NextRequest) {
  if (!requestOriginAllowed(request)) {
    return responseError(403, "A solicitação não pôde ser validada com segurança.");
  }

  let body: JsonObject;
  try {
    const raw = await request.json();
    if (!isObject(raw)) return responseError(400, "Solicitação inválida.");
    body = raw;
  } catch {
    return responseError(400, "Solicitação inválida.");
  }

  const auth = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await auth.auth.getUser();

  if (userError || !user) {
    return responseError(401, "Entre na sua Conta USECLUBBERS para continuar.");
  }

  const admin = adminClient();
  if (!admin) {
    return responseError(503, "A Central de Verificação está temporariamente indisponível.");
  }

  const action = cleanText(body.action, 40);

  if (action === "create_request") {
    const requestKind = cleanText(body.request_kind, 20) as RequestKind;
    const entityType = cleanText(body.requested_entity_type, 30) as EntityType;
    const organizationType = cleanText(body.requested_organization_type, 40);
    const displayName = cleanText(body.requested_display_name, 120);
    const rawHandle = cleanText(body.requested_handle, 80);
    const requestedHandle = normalizeHandle(rawHandle);
    const contactEmail = cleanText(body.contact_email, 320).toLowerCase();
    const professionalEmail = cleanText(body.professional_email, 320).toLowerCase();
    const submit = body.submit === true;

    if (!REQUEST_KINDS.has(requestKind)) {
      return responseError(400, "Escolha se deseja criar ou reivindicar um perfil.");
    }
    if (!ENTITY_TYPES.has(entityType)) {
      return responseError(400, "Escolha um tipo de identidade válido.");
    }
    if (
      entityType === "organization" &&
      !ORGANIZATION_TYPES.has(organizationType)
    ) {
      return responseError(400, "Escolha o tipo da organização.");
    }
    if (displayName.length < 2 || hasControlCharacters(displayName)) {
      return responseError(400, "Informe o nome público da identidade.");
    }
    if (rawHandle && (requestedHandle.length < 3 || requestedHandle.length > 30)) {
      return responseError(400, "O @ desejado deve ter entre 3 e 30 caracteres válidos.");
    }
    if (!validEmail(contactEmail)) {
      return responseError(400, "Informe um e-mail de contato válido.");
    }

    let professionalEmailDomain: string | null = null;
    if (professionalEmail) {
      if (!validEmail(professionalEmail)) {
        return responseError(400, "Informe um e-mail profissional válido ou deixe o campo vazio.");
      }
      professionalEmailDomain = professionalDomain(professionalEmail);
      if (!professionalEmailDomain) {
        return responseError(400, "O domínio do e-mail profissional não é válido.");
      }
    }

    if (requestKind === "create" && requestedHandle) {
      const { data: availabilityData, error: availabilityError } = await auth.rpc(
        "mhidas_check_public_handle_availability_v1",
        { p_handle: requestedHandle }
      );

      if (availabilityError) {
        return responseError(503, "Não foi possível validar o @ agora. Tente novamente.");
      }

      const availability = Array.isArray(availabilityData)
        ? availabilityData[0]
        : availabilityData;
      if (!availability?.available) {
        return responseError(409, "Este @ não está disponível para um novo perfil.");
      }
    }

    const evidenceSpecs = [
      {
        key: "official_website",
        type: "official_website",
        url: parseHttpsUrl(body.official_website),
        provided: Boolean(cleanText(body.official_website, 2048)),
      },
      {
        key: "instagram_url",
        type: "instagram",
        url: parseHttpsUrl(body.instagram_url, ["instagram.com"]),
        provided: Boolean(cleanText(body.instagram_url, 2048)),
      },
      {
        key: "spotify_url",
        type: "spotify",
        url: parseHttpsUrl(body.spotify_url, ["spotify.com"]),
        provided: Boolean(cleanText(body.spotify_url, 2048)),
      },
      {
        key: "youtube_url",
        type: "youtube",
        url: parseHttpsUrl(body.youtube_url, ["youtube.com", "youtu.be"]),
        provided: Boolean(cleanText(body.youtube_url, 2048)),
      },
    ];

    for (const spec of evidenceSpecs) {
      if (spec.provided && !spec.url) {
        return responseError(400, `Revise o campo ${spec.key.replace(/_/g, " ")}. Use uma URL HTTPS oficial.`);
      }
    }

    const status = submit ? "submitted" : "draft";
    const now = new Date().toISOString();

    const { data: created, error: createError } = await admin
      .from("entity_verification_requests")
      .insert({
        request_kind: requestKind,
        requester_user_id: user.id,
        entity_id: null,
        requested_entity_type: entityType,
        requested_organization_type:
          entityType === "organization" ? organizationType : null,
        requested_display_name: displayName,
        requested_handle: requestedHandle || null,
        source_catalog_kind: null,
        source_catalog_key: null,
        contact_email: contactEmail,
        professional_email_domain: professionalEmailDomain,
        email_signal_status: professionalEmail
          ? PERSONAL_EMAIL_DOMAINS.has(professionalEmailDomain || "")
            ? "personal"
            : "professional_unverified"
          : "unassessed",
        status,
        submitted_at: submit ? now : null,
      })
      .select("request_id,status")
      .single();

    if (createError || !created?.request_id) {
      return responseError(500, "Não foi possível salvar a solicitação agora.");
    }

    const requestId = String(created.request_id);
    const evidenceRows: JsonObject[] = [];

    if (professionalEmail) {
      evidenceRows.push({
        request_id: requestId,
        evidence_type: "professional_email",
        value_text: professionalEmail,
        evidence_url: null,
        review_status: "pending",
        metadata: { source: "requester_form" },
      });
    }

    for (const spec of evidenceSpecs) {
      if (!spec.url) continue;
      evidenceRows.push({
        request_id: requestId,
        evidence_type: spec.type,
        value_text: null,
        evidence_url: spec.url,
        review_status: "pending",
        metadata: { source: "requester_form" },
      });
    }

    if (evidenceRows.length > 0) {
      const { error: evidenceError } = await admin
        .from("entity_verification_evidence")
        .insert(evidenceRows);

      if (evidenceError) {
        await rollbackCreatedRequest(admin, requestId);
        return responseError(500, "Não foi possível salvar as evidências agora.");
      }
    }

    const { error: auditError } = await admin
      .from("entity_verification_audit_log")
      .insert({
        request_id: requestId,
        entity_id: null,
        actor_user_id: user.id,
        actor_kind: "user",
        action: submit
          ? "verification.request_submitted"
          : "verification.request_draft_created",
        previous_status: null,
        new_status: status,
        reason: null,
        metadata: { source: "requester_central" },
      });

    if (auditError) {
      await rollbackCreatedRequest(admin, requestId);
      return responseError(500, "Não foi possível registrar a solicitação com segurança.");
    }

    return NextResponse.json({ ok: true, request_id: requestId, status });
  }

  if (action === "submit_request" || action === "withdraw_request") {
    const requestId = cleanText(body.request_id, 80);
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
      return responseError(400, "Solicitação inválida.");
    }

    const { data: current, error: currentError } = await admin
      .from("entity_verification_requests")
      .select("request_id,requester_user_id,status,submitted_at")
      .eq("request_id", requestId)
      .eq("requester_user_id", user.id)
      .maybeSingle();

    if (currentError || !current) {
      return responseError(404, "Solicitação não encontrada.");
    }

    const previousStatus = String(current.status);

    if (action === "submit_request") {
      if (previousStatus !== "draft") {
        return responseError(409, "Somente um rascunho pode ser enviado para análise.");
      }

      const submittedAt = new Date().toISOString();
      const { error: updateError } = await admin
        .from("entity_verification_requests")
        .update({ status: "submitted", submitted_at: submittedAt })
        .eq("request_id", requestId)
        .eq("requester_user_id", user.id);

      if (updateError) {
        return responseError(500, "Não foi possível enviar a solicitação agora.");
      }

      const { error: auditError } = await admin
        .from("entity_verification_audit_log")
        .insert({
          request_id: requestId,
          entity_id: null,
          actor_user_id: user.id,
          actor_kind: "user",
          action: "verification.request_submitted",
          previous_status: previousStatus,
          new_status: "submitted",
          reason: null,
          metadata: { source: "requester_central" },
        });

      if (auditError) {
        await admin
          .from("entity_verification_requests")
          .update({ status: previousStatus, submitted_at: current.submitted_at })
          .eq("request_id", requestId)
          .eq("requester_user_id", user.id);
        return responseError(500, "Não foi possível registrar a mudança com segurança.");
      }

      return NextResponse.json({ ok: true, request_id: requestId, status: "submitted" });
    }

    if (!WITHDRAWABLE_STATUSES.has(previousStatus)) {
      return responseError(409, "Esta solicitação não pode mais ser retirada por este fluxo.");
    }

    const { error: withdrawError } = await admin
      .from("entity_verification_requests")
      .update({ status: "withdrawn" })
      .eq("request_id", requestId)
      .eq("requester_user_id", user.id);

    if (withdrawError) {
      return responseError(500, "Não foi possível retirar a solicitação agora.");
    }

    const { error: auditError } = await admin
      .from("entity_verification_audit_log")
      .insert({
        request_id: requestId,
        entity_id: null,
        actor_user_id: user.id,
        actor_kind: "user",
        action: "verification.request_withdrawn",
        previous_status: previousStatus,
        new_status: "withdrawn",
        reason: null,
        metadata: { source: "requester_central" },
      });

    if (auditError) {
      await admin
        .from("entity_verification_requests")
        .update({ status: previousStatus })
        .eq("request_id", requestId)
        .eq("requester_user_id", user.id);
      return responseError(500, "Não foi possível registrar a mudança com segurança.");
    }

    return NextResponse.json({ ok: true, request_id: requestId, status: "withdrawn" });
  }

  return responseError(400, "Ação inválida.");
}