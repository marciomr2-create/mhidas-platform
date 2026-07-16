export type SeventhCorrectedDraftCorrectionSeverity = "critical" | "high";

export type SeventhCorrectedDraftCorrection = {
  key: string;
  severity: SeventhCorrectedDraftCorrectionSeverity;
  status: "corrected_in_protected_draft";
  evidence: string;
};

export const SEVENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS = [
  { key: "retention_dimension_ddl_is_redeclared", severity: "critical", status: "corrected_in_protected_draft", evidence: "Normalized schema declares each retention column and active-dimension index exactly once." },
  { key: "retention_dimension_constraints_are_mutually_incompatible", severity: "critical", status: "corrected_in_protected_draft", evidence: "One final dimensional constraint replaces all cumulative contracts." },
  { key: "credential_context_receipt_scope_and_target_are_not_allowed", severity: "critical", status: "corrected_in_protected_draft", evidence: "Final receipt enums include credential_context_mutation and credential_context." },
  { key: "credential_context_issuance_retry_uses_random_result_identity", severity: "critical", status: "corrected_in_protected_draft", evidence: "Context identity is deterministically derived before receipt reservation." },
  { key: "receipt_semantic_uniqueness_omits_principal_namespace", severity: "high", status: "corrected_in_protected_draft", evidence: "The semantic unique index includes principal_namespace." },
  { key: "retention_minimization_rules_are_never_materialized", severity: "critical", status: "corrected_in_protected_draft", evidence: "Eight closed minimization rules are inserted with the draft." },
  { key: "retention_batch_uses_one_policy_id_for_receipts_and_audits", severity: "critical", status: "corrected_in_protected_draft", evidence: "Retention runs persist separate receipt and audit policy identifiers." },
  { key: "failed_receipt_state_is_rolled_back_on_reraise", severity: "high", status: "corrected_in_protected_draft", evidence: "Protected writers return terminal failed results without re-raising after receipt failure." },
  { key: "admin_lifecycle_replay_checks_mutated_state_before_receipt", severity: "high", status: "corrected_in_protected_draft", evidence: "Administrative RPCs reserve or replay receipts before mutable locks and status checks." },
  { key: "credential_context_consumption_receipt_is_not_semantically_bound", severity: "high", status: "corrected_in_protected_draft", evidence: "Context consumption validates pending status, operation, target, integration and credential pair." },
] as const satisfies readonly SeventhCorrectedDraftCorrection[];

const criticalCount = SEVENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter(
  (item) => item.severity === "critical",
).length;

const highCount = SEVENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter(
  (item) => item.severity === "high",
).length;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW = {
  version: "v4.8.108-event-ticket-commercial-migration-seventh-corrected-adjusted-draft-safe",
  baseVersion: "v4.8.107-event-ticket-commercial-migration-sixth-corrected-adjusted-draft-structural-review-safe",
  baseCommit: "59acd04661103ad699e35ccd62ebd4614dce35b8",
  decision: "seventh_corrected_adjusted_draft_ready_for_eighth_structural_review",
  parsedPostgresStatementCount: 106,
  corrections: SEVENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS,
  correctedAdjustments: SEVENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length,
  criticalCorrections: criticalCount,
  highCorrections: highCount,
  normalizedSchemaFromBase: true,
  minimizationRulesMaterialized: 8,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  previousSixthCorrectedSqlChanged: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationSeventhCorrectedAdjustedDraftReview(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const keys = new Set(SEVENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.map((item) => item.key));
  const checks = [
    SEVENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length === 10,
    keys.size === 10,
    criticalCount === 6,
    highCount === 4,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.parsedPostgresStatementCount === 106,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.normalizedSchemaFromBase === true,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.minimizationRulesMaterialized === 8,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.previousSixthCorrectedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;

  return { ok: checks.every(Boolean), checks };
}
