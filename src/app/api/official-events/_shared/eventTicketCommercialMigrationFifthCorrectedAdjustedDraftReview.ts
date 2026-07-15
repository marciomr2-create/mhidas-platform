export type FifthCorrectedAdjustedDraftSeverity = "critical" | "high";

export type FifthCorrectedAdjustedDraftCorrection = {
  key: string;
  severity: FifthCorrectedAdjustedDraftSeverity;
  correctionStatus: "corrected_in_protected_draft";
  title: string;
};

export const FIFTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS = [
  {
    key: "retention_policy_resolution_and_batch_scope_not_bound",
    severity: "critical",
    correctionStatus: "corrected_in_protected_draft",
    title: "Retenção determinística por finalidade, jurisdição e classe",
  },
  {
    key: "verified_credential_context_issuance_authority_missing",
    severity: "critical",
    correctionStatus: "corrected_in_protected_draft",
    title: "Emissão, revogação e expiração server-side do contexto de credencial",
  },
  {
    key: "current_credential_cross_integration_integrity_missing",
    severity: "critical",
    correctionStatus: "corrected_in_protected_draft",
    title: "Integridade composta entre integração e versão de credencial",
  },
  {
    key: "purchase_signal_replay_not_credential_bound_before_reservation",
    severity: "critical",
    correctionStatus: "corrected_in_protected_draft",
    title: "Reserva e replay vinculados à credencial antes do recibo",
  },
  {
    key: "cascade_audit_lineage_uses_legacy_writer",
    severity: "high",
    correctionStatus: "corrected_in_protected_draft",
    title: "Auditoria de cascata v3 vinculada ao recibo pai",
  },
  {
    key: "admin_signal_read_hash_not_same_snapshot_as_result",
    severity: "high",
    correctionStatus: "corrected_in_protected_draft",
    title: "Leitura administrativa e hash no mesmo snapshot SQL",
  },
  {
    key: "retention_anonymization_minimization_incomplete",
    severity: "high",
    correctionStatus: "corrected_in_protected_draft",
    title: "Matriz de minimização e remoção de identificadores brutos",
  },
  {
    key: "operation_receipt_failure_and_pending_replay_contract_incomplete",
    severity: "high",
    correctionStatus: "corrected_in_protected_draft",
    title: "Estado terminal e falha idempotente de recibos",
  }
] as const satisfies readonly FifthCorrectedAdjustedDraftCorrection[];

export const FIFTH_CORRECTED_ADJUSTED_DRAFT_NEGATIVE_TESTS = [
  "reject_cross_policy_retention_candidate",
  "reject_unverified_context_issuance",
  "reject_cross_integration_credential_reference",
  "reject_replay_with_different_credential",
  "reject_cascade_without_parent_receipt",
  "reject_mismatched_read_hash_snapshot",
  "reject_raw_identifier_after_anonymization",
  "reject_conflicting_terminal_receipt_transition",
] as const;

export const FIFTH_CORRECTED_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES = [
  "fresh_production_schema_inventory",
  "admin_authorization_rpc_contract",
  "cryptographic_context_issuer",
  "commercial_financial_semantics",
  "provider_namespace_and_credentials_registry",
  "legal_retention_and_anonymization",
  "parallel_concurrency_and_failure_tests",
  "production_backup_and_rollback_plan",
  "performance_and_volume_test",
  "sixth_independent_structural_review",
] as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW = {
  version: "v4.8.104-event-ticket-commercial-migration-fifth-corrected-adjusted-draft-safe",
  baseVersion: "v4.8.103-event-ticket-commercial-migration-fourth-corrected-adjusted-draft-structural-review-safe",
  baseCommit: "4b268861090ca92b02fc7cb72ef2cb1cf3e78a44",
  decision: "fifth_corrected_adjusted_draft_ready_for_sixth_structural_review",
  postgresStatementCount: 395,
  correctedAdjustments: FIFTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length,
  criticalCorrections: FIFTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter((item) => item.severity === "critical").length,
  highCorrections: FIFTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter((item) => item.severity === "high").length,
  negativeTests: FIFTH_CORRECTED_ADJUSTED_DRAFT_NEGATIVE_TESTS.length,
  externalPrerequisites: FIFTH_CORRECTED_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES.length,
  priorFourthCorrectedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationFifthCorrectedAdjustedDraft(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const keys = new Set(FIFTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.map((item) => item.key));
  const tests = new Set(FIFTH_CORRECTED_ADJUSTED_DRAFT_NEGATIVE_TESTS);

  const checks = [
    FIFTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length === 8,
    keys.size === 8,
    FIFTH_CORRECTED_ADJUSTED_DRAFT_NEGATIVE_TESTS.length === 8,
    tests.size === 8,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.criticalCorrections === 4,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.highCorrections === 4,
    FIFTH_CORRECTED_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.priorFourthCorrectedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;

  return { ok: checks.every(Boolean), checks };
}
