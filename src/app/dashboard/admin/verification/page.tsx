// src/app/dashboard/admin/verification/page.tsx

import { redirect } from "next/navigation";
import UseclubbersPageShell from "@/components/layout/UseclubbersPageShell";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import {
  createIdentityGovernanceAdminClient,
  getVerificationAuthority,
} from "@/lib/identityGovernance/verificationReviewerServer";
import VerificationReviewerClient, {
  type ReviewerEvidence,
  type ReviewerDocument,
  type ReviewerAuditEntry,
  type ReviewerRequest,
} from "./VerificationReviewerClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const REVIEWER_PATH = "/dashboard/admin/verification";

const AUTHORITY_ROLE_LABELS = {
  verification_reviewer: "Revisor de verificação",
  verification_admin: "Administrador de verificação",
  platform_admin: "Administrador da plataforma",
} as const;

type RequestRow = Omit<
  ReviewerRequest,
  "evidence" | "documents" | "audit"
>;

function byRequestId<T extends { request_id: string }>(
  rows: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const current = map.get(row.request_id) ?? [];
    current.push(row);
    map.set(row.request_id, current);
  }

  return map;
}

export default async function VerificationReviewerPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(REVIEWER_PATH)}`);
  }

  const admin = createIdentityGovernanceAdminClient();

  if (!admin) {
    throw new Error("IDENTITY_GOVERNANCE_ADMIN_CLIENT_NOT_CONFIGURED");
  }

  const authority = await getVerificationAuthority(user.id, admin);

  if (!authority) {
    redirect("/account/verification");
  }

  const { data: requestRows, error: requestError } = await admin
    .from("entity_verification_requests")
    .select(
      "request_id,request_kind,requester_user_id,entity_id,requested_entity_type,requested_organization_type,requested_display_name,requested_handle,source_catalog_kind,source_catalog_key,contact_email,professional_email_domain,email_signal_status,status,submitted_at,reviewed_by_user_id,reviewed_at,decision_reason,created_at,updated_at"
    )
    .in("status", ["submitted", "in_review", "more_info_required"])
    .order("created_at", { ascending: true });

  if (requestError) {
    throw new Error("VERIFICATION_REVIEW_QUEUE_READ_FAILED");
  }

  const baseRequests =
    (requestRows ?? []) as unknown as RequestRow[];
  const requestIds = baseRequests.map((request) => request.request_id);

  let evidenceRows: ReviewerEvidence[] = [];
  let documentRows: ReviewerDocument[] = [];
  let auditRows: ReviewerAuditEntry[] = [];

  if (requestIds.length > 0) {
    const [
      { data: evidence, error: evidenceError },
      { data: documents, error: documentsError },
      { data: audit, error: auditError },
    ] = await Promise.all([
      admin
        .from("entity_verification_evidence")
        .select(
          "evidence_id,request_id,evidence_type,value_text,evidence_url,review_status,created_at"
        )
        .in("request_id", requestIds)
        .order("created_at", { ascending: true }),
      admin
        .from("entity_verification_documents")
        .select(
          "document_id,request_id,document_type,original_filename,mime_type,file_size_bytes,review_status,created_at"
        )
        .in("request_id", requestIds)
        .order("created_at", { ascending: true }),
      admin
        .from("entity_verification_audit_log")
        .select(
          "audit_id,request_id,actor_kind,action,previous_status,new_status,reason,created_at"
        )
        .in("request_id", requestIds)
        .order("created_at", { ascending: true }),
    ]);

    if (evidenceError || documentsError || auditError) {
      throw new Error("VERIFICATION_REVIEW_CONTEXT_READ_FAILED");
    }

    evidenceRows = (evidence ?? []) as ReviewerEvidence[];
    documentRows = (documents ?? []) as ReviewerDocument[];
    auditRows = (audit ?? []) as ReviewerAuditEntry[];
  }

  const evidenceMap = byRequestId(evidenceRows);
  const documentMap = byRequestId(documentRows);
  const auditMap = byRequestId(auditRows);

  const requests: ReviewerRequest[] = baseRequests.map((request) => ({
    ...request,
    evidence: evidenceMap.get(request.request_id) ?? [],
    documents: documentMap.get(request.request_id) ?? [],
    audit: auditMap.get(request.request_id) ?? [],
  }));

  const submittedCount = requests.filter(
    (request) => request.status === "submitted"
  ).length;
  const inReviewCount = requests.filter(
    (request) => request.status === "in_review"
  ).length;
  const moreInfoCount = requests.filter(
    (request) => request.status === "more_info_required"
  ).length;

  return (
    <UseclubbersPageShell
      eyebrow="REVISÃO DE IDENTIDADES"
      title="Fila de verificação"
      description="Acompanhe solicitações, registre orientações e tome decisões de revisão em um só lugar."
      backHref="/dashboard"
      backLabel="Voltar ao início"
      pageClassName="uc-verification-page-shell"
    >
      <section className="uc-ui-grid uc-ui-grid--2 uc-ui-section">
        <article className="uc-ui-surface">
          <span className="uc-ui-label">Seu acesso</span>
          <strong className="uc-ui-value">
            {AUTHORITY_ROLE_LABELS[authority.role]}
          </strong>
          <p className="uc-ui-copy">
            Esta conta pode revisar e decidir solicitações desta fila.
          </p>
        </article>

        <article className="uc-ui-surface">
          <span className="uc-ui-label">Fila aberta</span>
          <strong className="uc-ui-value">{requests.length}</strong>
          <p className="uc-ui-copy">
            {submittedCount} enviado(s) · {inReviewCount} em revisão ·{" "}
            {moreInfoCount} aguardando mais informações.
          </p>
        </article>
      </section>

      <VerificationReviewerClient
        authorityRole={authority.role}
        initialRequests={requests}
      />

      <section className="uc-ui-trust">
        <strong>Aprovação segura e completa.</strong>
        <p>
          Ao aprovar, a identidade, o responsável e o @ são confirmados juntos.
          Se alguma informação não estiver correta, a aprovação não é concluída.
        </p>
      </section>
    </UseclubbersPageShell>
  );
}