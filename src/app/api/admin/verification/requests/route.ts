// src/app/api/admin/verification/requests/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import {
  createIdentityGovernanceAdminClient,
  getVerificationAuthority,
} from "@/lib/identityGovernance/verificationReviewerServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type ReviewerAction =
  | "start_review"
  | "request_more_info"
  | "resume_review"
  | "reject_request";

type RequestBody = {
  request_id?: unknown;
  action?: unknown;
  reason?: unknown;
};

type CurrentRequest = {
  request_id: string;
  requester_user_id: string;
  status: string;
  submitted_at: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  decision_reason: string | null;
};

function json(
  body: Record<string, unknown>,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function responseError(status: number, message: string): NextResponse {
  return json({ ok: false, message }, status);
}

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function requestOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function isReviewerAction(value: string): value is ReviewerAction {
  return [
    "start_review",
    "request_more_info",
    "resume_review",
    "reject_request",
  ].includes(value);
}

function nextStatusFor(
  currentStatus: string,
  action: ReviewerAction
): string | null {
  if (action === "start_review" && currentStatus === "submitted") {
    return "in_review";
  }

  if (
    action === "request_more_info" &&
    currentStatus === "in_review"
  ) {
    return "more_info_required";
  }

  if (
    action === "resume_review" &&
    currentStatus === "more_info_required"
  ) {
    return "in_review";
  }

  if (
    action === "reject_request" &&
    ["in_review", "more_info_required"].includes(currentStatus)
  ) {
    return "rejected";
  }

  return null;
}

function auditActionFor(action: ReviewerAction): string {
  if (action === "start_review") {
    return "verification.request_review_started";
  }

  if (action === "request_more_info") {
    return "verification.request_more_info_requested";
  }

  if (action === "resume_review") {
    return "verification.request_review_resumed";
  }

  return "verification.request_rejected";
}

function successMessageFor(action: ReviewerAction): string {
  if (action === "start_review") {
    return "A solicitação entrou em revisão.";
  }

  if (action === "request_more_info") {
    return "A solicitação agora aguarda mais informações.";
  }

  if (action === "resume_review") {
    return "A revisão foi retomada.";
  }

  return "A solicitação foi rejeitada e a decisão ficou registrada.";
}

export async function POST(request: NextRequest) {
  if (!requestOriginAllowed(request)) {
    return responseError(
      403,
      "A ação administrativa não pôde ser validada com segurança."
    );
  }

  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return responseError(401, "Entre na sua conta para continuar.");
  }

  const admin = createIdentityGovernanceAdminClient();

  if (!admin) {
    return responseError(
      503,
      "A governança de verificação está temporariamente indisponível."
    );
  }

  let authority;

  try {
    authority = await getVerificationAuthority(user.id, admin);
  } catch {
    return responseError(
      503,
      "Não foi possível validar a autoridade de revisão agora."
    );
  }

  if (!authority) {
    return responseError(403, "Esta conta não possui autoridade de revisão.");
  }

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return responseError(400, "A ação de revisão está inválida.");
  }

  const requestId = cleanText(body.request_id, 80);
  const action = cleanText(body.action, 80);
  const reason = cleanText(body.reason, 1000);

  if (!requestId) {
    return responseError(400, "A solicitação não foi identificada.");
  }

  if (!isReviewerAction(action)) {
    return responseError(400, "A ação de revisão não é permitida.");
  }

  if (
    (action === "request_more_info" || action === "reject_request") &&
    reason.length < 3
  ) {
    return responseError(
      400,
      action === "request_more_info"
        ? "Explique o que precisa ser enviado."
        : "Informe um motivo objetivo para a rejeição."
    );
  }

  const { data: current, error: currentError } = await admin
    .from("entity_verification_requests")
    .select(
      "request_id,requester_user_id,status,submitted_at,reviewed_by_user_id,reviewed_at,decision_reason"
    )
    .eq("request_id", requestId)
    .maybeSingle();

  if (currentError) {
    return responseError(
      500,
      "Não foi possível carregar a solicitação para revisão."
    );
  }

  if (!current) {
    return responseError(404, "A solicitação não foi encontrada.");
  }

  const typedCurrent = current as CurrentRequest;
  const nextStatus = nextStatusFor(typedCurrent.status, action);

  if (!nextStatus) {
    return responseError(
      409,
      "Esta solicitação mudou de estado e não aceita mais essa ação."
    );
  }

  const now = new Date().toISOString();

  const updatePayload = {
    status: nextStatus,
    reviewed_by_user_id: user.id,
    reviewed_at: now,
    decision_reason:
      action === "request_more_info" || action === "reject_request"
        ? reason
        : null,
  };

  const { data: updated, error: updateError } = await admin
    .from("entity_verification_requests")
    .update(updatePayload)
    .eq("request_id", requestId)
    .eq("status", typedCurrent.status)
    .select("request_id,status");

  if (updateError) {
    return responseError(
      500,
      "Não foi possível atualizar a solicitação agora."
    );
  }

  if (!updated || updated.length !== 1) {
    return responseError(
      409,
      "A solicitação foi alterada por outra revisão. Atualize a fila."
    );
  }

  const { error: auditError } = await admin
    .from("entity_verification_audit_log")
    .insert({
      request_id: requestId,
      entity_id: null,
      actor_user_id: user.id,
      actor_kind: "reviewer",
      action: auditActionFor(action),
      previous_status: typedCurrent.status,
      new_status: nextStatus,
      reason:
        action === "request_more_info" || action === "reject_request"
          ? reason
          : null,
      metadata: {
        authority_role: authority.role,
        source: "verification_reviewer_panel",
      },
    });

  if (auditError) {
    await admin
      .from("entity_verification_requests")
      .update({
        status: typedCurrent.status,
        reviewed_by_user_id: typedCurrent.reviewed_by_user_id,
        reviewed_at: typedCurrent.reviewed_at,
        decision_reason: typedCurrent.decision_reason,
      })
      .eq("request_id", requestId)
      .eq("status", nextStatus)
      .eq("reviewed_by_user_id", user.id);

    return responseError(
      500,
      "Não foi possível registrar a mudança de revisão com segurança."
    );
  }

  return json({
    ok: true,
    request_id: requestId,
    previous_status: typedCurrent.status,
    status: nextStatus,
    action,
    message: successMessageFor(action),
    final_approval_performed: false,
    official_entity_created: false,
    membership_created: false,
    public_handle_reserved: false,
  });
}