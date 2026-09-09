// src/app/dashboard/admin/verification/VerificationReviewerClient.tsx

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { VerificationAuthorityRole } from "@/lib/identityGovernance/verificationReviewerServer";

export type ReviewerEvidence = {
  evidence_id: string;
  request_id: string;
  evidence_type: string;
  value_text: string | null;
  evidence_url: string | null;
  review_status: string;
  created_at: string;
};

export type ReviewerDocument = {
  document_id: string;
  request_id: string;
  document_type: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  review_status: string;
  created_at: string;
};

export type ReviewerAuditEntry = {
  audit_id: string;
  request_id: string;
  actor_kind: string;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  reason: string | null;
  created_at: string;
};

export type ReviewerRequest = {
  request_id: string;
  request_kind: "create" | "claim";
  requester_user_id: string;
  entity_id: string | null;
  requested_entity_type:
    | "artist"
    | "club"
    | "festival"
    | "organization";
  requested_organization_type: string | null;
  requested_display_name: string;
  requested_handle: string | null;
  source_catalog_kind: string | null;
  source_catalog_key: string | null;
  contact_email: string;
  professional_email_domain: string | null;
  email_signal_status: string;
  status:
    | "submitted"
    | "in_review"
    | "more_info_required";
  submitted_at: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
  evidence: ReviewerEvidence[];
  documents: ReviewerDocument[];
  audit: ReviewerAuditEntry[];
};

type ReviewerAction =
  | "start_review"
  | "request_more_info"
  | "resume_review"
  | "approve_request"
  | "reject_request";

type VerificationReviewerClientProps = {
  authorityRole: VerificationAuthorityRole;
  initialRequests: ReviewerRequest[];
};

const STATUS_LABELS: Record<
  ReviewerRequest["status"],
  string
> = {
  submitted: "Enviado para análise",
  in_review: "Em revisão",
  more_info_required: "Mais informações necessárias",
};

const STATUS_DESCRIPTIONS: Record<
  ReviewerRequest["status"],
  string
> = {
  submitted: "A solicitação está aguardando o início da revisão.",
  in_review:
    "A análise está ativa. Este é o estado atual antes de uma decisão ou pedido de informação.",
  more_info_required:
    "A revisão está aguardando informações adicionais antes de continuar.",
};

const ENTITY_LABELS: Record<
  ReviewerRequest["requested_entity_type"],
  string
> = {
  artist: "Artista / DJ / Projeto musical",
  club: "Club / Venue",
  festival: "Festival",
  organization: "Organização / Parceiro",
};

const EVIDENCE_LABELS: Record<string, string> = {
  official_website: "Site oficial",
  professional_email: "E-mail profissional",
  domain_ownership: "Domínio",
  instagram: "Instagram",
  spotify: "Spotify",
  youtube: "YouTube",
  booking_agency: "Agência / booking",
  business_registry: "Registro empresarial",
  representative_authorization:
    "Autorização de representação",
  other: "Outra evidência",
};

const AUTHORITY_ROLE_LABELS: Record<
  VerificationAuthorityRole,
  string
> = {
  verification_reviewer: "Revisor de verificação",
  verification_admin: "Administrador de verificação",
  platform_admin: "Administrador da plataforma",
};

const EMAIL_SIGNAL_LABELS: Record<string, string> = {
  unassessed: "Não avaliado",
  personal: "E-mail pessoal",
  professional_unverified:
    "E-mail profissional não confirmado",
  professional_confirmed:
    "E-mail profissional confirmado",
  mismatch: "E-mail não corresponde à identidade",
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  accepted: "Aceito",
  rejected: "Rejeitado",
  needs_more_info: "Mais informações necessárias",
};

const AUDIT_ACTOR_LABELS: Record<string, string> = {
  user: "Solicitante",
  reviewer: "Revisor",
  system: "Sistema",
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "verification.request_draft_created": "Rascunho criado",
  "verification.request_submitted":
    "Solicitação enviada para análise",
  "verification.request_withdrawn":
    "Solicitação retirada",
  "verification.request_review_started": "Revisão iniciada",
  "verification.request_more_info_requested":
    "Mais informações solicitadas",
  "verification.request_review_resumed": "Revisão retomada",
  "verification.request_approved": "Solicitação aprovada",
  "verification.request_rejected": "Solicitação rejeitada",
};

const AUDIT_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviado para análise",
  in_review: "Em revisão",
  more_info_required: "Mais informações necessárias",
  approved: "Aprovado",
  rejected: "Rejeitado",
  withdrawn: "Retirado",
  suspended: "Suspenso",
  revoked: "Revogado",
};

function authorityRoleLabel(
  role: VerificationAuthorityRole
): string {
  return AUTHORITY_ROLE_LABELS[role];
}

function emailSignalLabel(value: string): string {
  return EMAIL_SIGNAL_LABELS[value] || "Não avaliado";
}

function reviewStatusLabel(value: string): string {
  return REVIEW_STATUS_LABELS[value] || "Pendente";
}

function auditActorLabel(value: string): string {
  return AUDIT_ACTOR_LABELS[value] || "Sistema";
}

function auditActionLabel(value: string): string {
  return AUDIT_ACTION_LABELS[value] || "Ação registrada";
}

function auditStatusLabel(value: string | null): string {
  if (!value) return "—";
  return AUDIT_STATUS_LABELS[value] || "Estado registrado";
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatFileSize(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value < 1024) return `${value} B`;

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function actionNeedsReason(action: ReviewerAction): boolean {
  return (
    action === "request_more_info" ||
    action === "reject_request"
  );
}

function approvalBlockedReason(
  request: ReviewerRequest
): string | null {
  if (
    request.request_kind === "create" &&
    !request.requested_handle
  ) {
    return "Aprovação bloqueada: esta criação não possui @ universal.";
  }

  if (
    request.request_kind === "claim" &&
    (!request.entity_id || !request.requested_handle)
  ) {
    return "Aprovação bloqueada: esta reivindicação não possui identidade oficial e @ vinculados.";
  }

  return null;
}

export default function VerificationReviewerClient({
  authorityRole,
  initialRequests,
}: VerificationReviewerClientProps) {
  const router = useRouter();

  const [busyRequestId, setBusyRequestId] =
    useState<string | null>(null);

  const [reasons, setReasons] =
    useState<Record<string, string>>({});

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const requestCount = useMemo(
    () => initialRequests.length,
    [initialRequests.length]
  );

  async function runAction(
    request: ReviewerRequest,
    action: ReviewerAction
  ) {
    const requestId = request.request_id;
    const reason = String(reasons[requestId] || "").trim();

    if (actionNeedsReason(action) && reason.length < 3) {
      setSuccessMessage(null);

      setErrorMessage(
        action === "request_more_info"
          ? "Explique o que precisa ser enviado antes de pedir mais informações."
          : "Informe um motivo objetivo antes de rejeitar a solicitação."
      );

      return;
    }

    if (action === "approve_request") {
      const blocked = approvalBlockedReason(request);

      if (blocked) {
        setSuccessMessage(null);
        setErrorMessage(blocked);
        return;
      }

      const confirmed = window.confirm(
        request.request_kind === "create"
          ? `Aprovar ${request.requested_display_name}? A identidade oficial, o vínculo de proprietário e @${request.requested_handle} serão concluídos em uma única operação atômica.`
          : `Aprovar a reivindicação de ${request.requested_display_name}? O vínculo de proprietário sobre @${request.requested_handle} será concluído em uma única operação atômica.`
      );

      if (!confirmed) {
        return;
      }
    }

    setBusyRequestId(requestId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        "/api/admin/verification/requests",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            request_id: requestId,
            action,
            reason: reason || null,
          }),
        }
      );

      const payload = (await response
        .json()
        .catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        setErrorMessage(
          payload?.message ||
            "Não foi possível concluir esta ação de revisão agora."
        );
        return;
      }

      setSuccessMessage(
        payload.message ||
          "A revisão foi atualizada com segurança."
      );

      setReasons((current) => ({
        ...current,
        [requestId]: "",
      }));

      router.refresh();
    } catch {
      setErrorMessage(
        "Não foi possível acessar a fila de revisão agora. Tente novamente."
      );
    } finally {
      setBusyRequestId(null);
    }
  }

  return (
    <section className="uc-verification-section uc-ui-section">
      <div className="uc-verification-section-heading">
        <span className="uc-ui-label">REVISÃO INTERNA</span>
        <h2>Solicitações que exigem atenção</h2>
        <p className="uc-ui-copy">
          {requestCount === 0
            ? "A fila está vazia neste momento."
            : `${requestCount} solicitação(ões) disponível(is) para ${authorityRoleLabel(
                authorityRole
              )}.`}
        </p>
      </div>

      {errorMessage ? (
        <div
          className="uc-verification-alert uc-verification-alert--error"
          role="alert"
        >
          <strong className="uc-verification-alert__label">ATENÇÃO</strong>
          <p className="uc-verification-alert__copy">{errorMessage}</p>
        </div>
      ) : null}

      {successMessage ? (
        <div
          className="uc-verification-alert uc-verification-alert--success"
          role="status"
        >
          <strong className="uc-verification-alert__label">CONCLUÍDO</strong>
          <p className="uc-verification-alert__copy">{successMessage}</p>
        </div>
      ) : null}

      {initialRequests.length === 0 ? (
        <article className="uc-ui-surface">
          <span className="uc-ui-label">Fila limpa</span>
          <strong className="uc-ui-value">
            Nenhuma solicitação aguardando revisão.
          </strong>
          <p className="uc-ui-copy">
            Solicitações enviadas aparecerão aqui sem expor a
            autoridade administrativa ao navegador do solicitante.
          </p>
        </article>
      ) : (
        <div className="uc-verification-request-list">
          {initialRequests.map((request) => {
            const requestBusy =
              busyRequestId === request.request_id;

            const hasDecisionActions =
              request.status === "in_review" ||
              request.status === "more_info_required";

            const blockedApproval =
              approvalBlockedReason(request);

            return (
              <article
                key={request.request_id}
                className="uc-verification-request-card uc-ui-surface"
              >
                <div className="uc-verification-request-head">
                  <div>
                    <span className="uc-ui-label">
                      {request.request_kind === "create"
                        ? "CRIAÇÃO"
                        : "REIVINDICAÇÃO"}{" "}
                      · {ENTITY_LABELS[request.requested_entity_type]}
                    </span>

                    <strong className="uc-ui-value">
                      {request.requested_display_name}
                    </strong>

                    <div className="uc-verification-request-meta">
                      <span>
                        Enviado: {formatDate(request.submitted_at)}
                      </span>
                      <span>
                        @ solicitado:{" "}
                        {request.requested_handle
                          ? `@${request.requested_handle}`
                          : "não informado"}
                      </span>
                    </div>
                  </div>
                </div>

                <aside
                  className={`uc-verification-state uc-verification-state--${request.status}`}
                  aria-label={`Status da solicitação: ${STATUS_LABELS[request.status]}`}
                >
                  <span className="uc-ui-label">STATUS DA SOLICITAÇÃO</span>
                  <strong>{STATUS_LABELS[request.status]}</strong>
                  <p>{STATUS_DESCRIPTIONS[request.status]}</p>
                </aside>

                <section className="uc-ui-grid uc-ui-grid--2">
                  <article className="uc-ui-surface">
                    <span className="uc-ui-label">Contato</span>
                    <strong className="uc-ui-value">
                      {request.contact_email}
                    </strong>
                    <p className="uc-ui-copy">
                      Sinal de e-mail:{" "}
                      {emailSignalLabel(request.email_signal_status)}
                      {request.professional_email_domain
                        ? ` · ${request.professional_email_domain}`
                        : ""}
                    </p>
                  </article>

                  <article className="uc-ui-surface">
                    <span className="uc-ui-label">
                      Contexto da solicitação
                    </span>
                    <strong className="uc-ui-value">
                      {request.entity_id
                        ? "Entidade existente vinculada"
                        : request.request_kind === "create"
                        ? "Nova entidade será criada somente na aprovação"
                        : "Sem entidade oficial vinculada"}
                    </strong>
                    <p className="uc-ui-copy">
                      {request.source_catalog_kind ||
                      request.source_catalog_key
                        ? `Catálogo: ${
                            request.source_catalog_kind || "—"
                          } · ${request.source_catalog_key || "—"}`
                        : "Nenhuma origem de catálogo vinculada."}
                    </p>
                  </article>
                </section>

                <section className="uc-ui-stack">
                  <div>
                    <span className="uc-ui-label">
                      Evidências públicas
                    </span>
                    <p className="uc-ui-copy">
                      {request.evidence.length === 0
                        ? "Nenhuma evidência pública foi enviada."
                        : `${request.evidence.length} evidência(s) registrada(s).`}
                    </p>
                  </div>

                  {request.evidence.map((evidence) => (
                    <article
                      key={evidence.evidence_id}
                      className="uc-ui-surface"
                    >
                      <span className="uc-ui-label">
                        {EVIDENCE_LABELS[evidence.evidence_type] ||
                          "Outra evidência"}
                      </span>
                      <strong className="uc-ui-value">
                        {reviewStatusLabel(evidence.review_status)}
                      </strong>
                      <p className="uc-ui-copy">
                        {evidence.value_text ||
                          evidence.evidence_url ||
                          "Evidência sem valor exibível."}
                      </p>

                      {evidence.evidence_url ? (
                        <a
                          className="uc-ui-button uc-ui-button--quiet"
                          href={evidence.evidence_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir evidência
                        </a>
                      ) : null}
                    </article>
                  ))}
                </section>

                <section className="uc-ui-stack">
                  <div>
                    <span className="uc-ui-label">
                      Documentos privados
                    </span>
                    <p className="uc-ui-copy">
                      {request.documents.length === 0
                        ? "Nenhum documento privado foi anexado."
                        : `${request.documents.length} documento(s) com metadata disponível(is).`}
                    </p>
                  </div>

                  {request.documents.map((document) => (
                    <article
                      key={document.document_id}
                      className="uc-ui-surface"
                    >
                      <span className="uc-ui-label">
                        {document.document_type}
                      </span>
                      <strong className="uc-ui-value">
                        {document.original_filename}
                      </strong>
                      <p className="uc-ui-copy">
                        {document.mime_type} ·{" "}
                        {formatFileSize(document.file_size_bytes)} ·{" "}
                        {reviewStatusLabel(document.review_status)}
                      </p>
                    </article>
                  ))}
                </section>

                {request.audit.length > 0 ? (
                  <section className="uc-ui-stack">
                    <div>
                      <span className="uc-ui-label">Auditoria</span>
                      <p className="uc-ui-copy">
                        Histórico interno imutável desta solicitação.
                      </p>
                    </div>

                    {request.audit.map((entry) => (
                      <p
                        key={entry.audit_id}
                        className="uc-verification-request-note"
                      >
                        {formatDate(entry.created_at)} ·{" "}
                        {auditActorLabel(entry.actor_kind)} ·{" "}
                        {auditActionLabel(entry.action)}
                        {entry.previous_status || entry.new_status
                          ? ` · ${auditStatusLabel(
                              entry.previous_status
                            )} → ${auditStatusLabel(entry.new_status)}`
                          : ""}
                        {entry.reason ? ` · ${entry.reason}` : ""}
                      </p>
                    ))}
                  </section>
                ) : null}

                {hasDecisionActions ? (
                  <label className="uc-verification-field">
                    <span className="uc-verification-label">
                      Motivo / orientação ao solicitante
                    </span>
                    <textarea
                      className="uc-verification-control"
                      rows={3}
                      maxLength={1000}
                      value={reasons[request.request_id] || ""}
                      onChange={(event) =>
                        setReasons((current) => ({
                          ...current,
                          [request.request_id]: event.target.value,
                        }))
                      }
                      disabled={requestBusy}
                      placeholder="Use este campo para pedir informações adicionais, registrar uma observação de aprovação ou informar o motivo de uma rejeição."
                    />
                    <span className="uc-verification-help">
                      O motivo é obrigatório para pedir mais
                      informações ou rejeitar. Na aprovação, é
                      opcional.
                    </span>
                  </label>
                ) : null}

                <div className="uc-verification-request-actions">
                  {request.status === "submitted" ? (
                    <button
                      type="button"
                      className="uc-ui-button uc-ui-button--quiet"
                      disabled={busyRequestId !== null}
                      onClick={() =>
                        void runAction(request, "start_review")
                      }
                    >
                      {requestBusy
                        ? "Processando..."
                        : "Iniciar revisão"}
                    </button>
                  ) : null}

                  {request.status === "in_review" ? (
                    <button
                      type="button"
                      className="uc-ui-button uc-ui-button--quiet"
                      disabled={busyRequestId !== null}
                      onClick={() =>
                        void runAction(
                          request,
                          "request_more_info"
                        )
                      }
                    >
                      {requestBusy
                        ? "Processando..."
                        : "Pedir mais informações"}
                    </button>
                  ) : null}

                  {request.status === "more_info_required" ? (
                    <button
                      type="button"
                      className="uc-ui-button uc-ui-button--quiet"
                      disabled={busyRequestId !== null}
                      onClick={() =>
                        void runAction(request, "resume_review")
                      }
                    >
                      {requestBusy
                        ? "Processando..."
                        : "Retomar revisão"}
                    </button>
                  ) : null}

                  {hasDecisionActions && !blockedApproval ? (
                    <button
                      type="button"
                      className="uc-ui-button uc-ui-button--quiet"
                      disabled={busyRequestId !== null}
                      onClick={() =>
                        void runAction(request, "approve_request")
                      }
                    >
                      {requestBusy
                        ? "Processando..."
                        : "Aprovar solicitação"}
                    </button>
                  ) : null}

                  {hasDecisionActions ? (
                    <button
                      type="button"
                      className="uc-ui-button uc-ui-button--quiet"
                      disabled={busyRequestId !== null}
                      onClick={() =>
                        void runAction(request, "reject_request")
                      }
                    >
                      {requestBusy
                        ? "Processando..."
                        : "Rejeitar solicitação"}
                    </button>
                  ) : null}
                </div>

                <p
                  className={
                    blockedApproval
                      ? "uc-verification-request-note uc-verification-request-note--critical"
                      : "uc-verification-request-note"
                  }
                >
                  {blockedApproval
                    ? blockedApproval
                    : "A aprovação final é executada server-side em uma única operação atômica. Nenhum estado approved é gravado sem identidade oficial, vínculo de proprietário e @ universal válidos."}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}