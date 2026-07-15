export type SixthCorrectedDraftCorrectionSeverity = "critical" | "high";

export type SixthCorrectedDraftCorrection = {
  key: string;
  severity: SixthCorrectedDraftCorrectionSeverity;
  status: "corrected";
  implementation: string;
  negativeTestRequired: true;
};

export const SIXTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS = [
  {
    key: "credential_bound_receipt_insert_violates_pair_presence",
    severity: "critical",
    status: "corrected",
    implementation: "Recibo v5 insere integração e credencial atomicamente",
    negativeTestRequired: true,
  },
  {
    key: "class_specific_retention_policies_not_seeded",
    severity: "critical",
    status: "corrected",
    implementation: "Policies ativas de recibo e auditoria são materializadas e validadas",
    negativeTestRequired: true,
  },
  {
    key: "new_security_definer_functions_keep_public_execute",
    severity: "critical",
    status: "corrected",
    implementation: "Matriz explícita de REVOKE e GRANT para boundaries SECURITY DEFINER",
    negativeTestRequired: true,
  },
  {
    key: "trusted_signal_v6_nests_legacy_receipt_and_audit_path",
    severity: "critical",
    status: "corrected",
    implementation: "Writer v7 usa um único recibo, insert direto e auditoria credential-bound",
    negativeTestRequired: true,
  },
  {
    key: "credential_context_lifecycle_has_no_receipt_or_audit_lineage",
    severity: "high",
    status: "corrected",
    implementation: "Lifecycle de contexto possui recibo, auditoria e correlação",
    negativeTestRequired: true,
  },
  {
    key: "credential_context_issuance_retry_is_not_idempotent",
    severity: "high",
    status: "corrected",
    implementation: "Emissão v2 retorna replay durável pelo recibo semântico",
    negativeTestRequired: true,
  },
  {
    key: "retention_minimization_rules_are_declarative_only",
    severity: "high",
    status: "corrected",
    implementation: "Executor fechado aplica minimização a recibos e auditoria",
    negativeTestRequired: true,
  },
  {
    key: "governance_retention_batch_v2_lacks_durable_run_and_idempotency",
    severity: "high",
    status: "corrected",
    implementation: "Batch v3 persiste run, recibo terminal, contagens e auditoria",
    negativeTestRequired: true,
  },
  {
    key: "cascade_audit_replacements_are_missing",
    severity: "high",
    status: "corrected",
    implementation: "RPCs administrativas v3 substituem contratos revogados",
    negativeTestRequired: true,
  }
] as const satisfies readonly SixthCorrectedDraftCorrection[];

export const SIXTH_CORRECTED_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES = [
  "fresh_production_schema_inventory",
  "admin_authorization_contract",
  "credential_verification_and_context_issuer",
  "commercial_financial_semantics",
  "provider_namespace_and_credentials_registry",
  "legal_retention_and_anonymization",
  "parallel_concurrency_and_failure_tests",
  "production_backup_and_rollback_plan",
  "performance_and_volume_tests",
  "independent_structural_review",
] as const;

const criticalCorrections = SIXTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter(
  (item) => item.severity === "critical",
).length;

const highCorrections = SIXTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter(
  (item) => item.severity === "high",
).length;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_ADJUSTED_DRAFT_REVIEW = {
  version: "v4.8.106-event-ticket-commercial-migration-sixth-corrected-adjusted-draft-safe",
  baseVersion: "v4.8.105-event-ticket-commercial-migration-fifth-corrected-adjusted-draft-structural-review-safe",
  baseCommit: "4e075b71be20883210da9e1fd4ee47fc943f4e50",
  decision: "sixth_corrected_adjusted_draft_ready_for_seventh_structural_review",
  postgresStatementCount: 442,
  corrections: SIXTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS,
  correctedAdjustments: SIXTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length,
  criticalCorrections,
  highCorrections,
  acceptanceTests: 45,
  externalPrerequisites: SIXTH_CORRECTED_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES.length,
  previousSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationSixthCorrectedAdjustedDraftReview(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const keys = new Set(SIXTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.map((item) => item.key));
  const checks = [
    SIXTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length === 9,
    keys.size === 9,
    criticalCorrections === 4,
    highCorrections === 5,
    SIXTH_CORRECTED_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10,
    SIXTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.every((item) => item.status === "corrected"),
    SIXTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.every((item) => item.negativeTestRequired),
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.postgresStatementCount === 442,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.previousSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;
  return { ok: checks.every(Boolean), checks };
}
