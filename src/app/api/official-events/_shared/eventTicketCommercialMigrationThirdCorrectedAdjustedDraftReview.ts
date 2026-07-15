export type ThirdCorrectedAdjustedDraftSeverity = "critical" | "high";

export type ThirdCorrectedAdjustedDraftCorrection = {
  key: string;
  severity: ThirdCorrectedAdjustedDraftSeverity;
  correctionStatus: "corrected_in_protected_draft";
  title: string;
};

export const THIRD_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS = [
  {
    key: "url_validation_nullable_boolean_bypass",
    severity: "critical",
    correctionStatus: "corrected_in_protected_draft",
    title: "Prova de URL estritamente booleana e fail-closed",
  },
  {
    key: "authenticated_purchase_signal_read_exposes_sensitive_evidence",
    severity: "critical",
    correctionStatus: "corrected_in_protected_draft",
    title: "Leitura própria redigida sem evidência técnica ou finanças",
  },
  {
    key: "trusted_integration_not_bound_to_verified_partner_lifecycle",
    severity: "critical",
    correctionStatus: "corrected_in_protected_draft",
    title: "Integração vinculada ao estado verificado do parceiro",
  },
  {
    key: "system_click_user_identity_is_caller_controlled",
    severity: "critical",
    correctionStatus: "corrected_in_protected_draft",
    title: "Identidade derivada exclusivamente do clique server-side",
  },
  {
    key: "receipt_idempotency_is_not_atomic_under_concurrency",
    severity: "critical",
    correctionStatus: "corrected_in_protected_draft",
    title: "Reserva atômica do recibo antes do efeito",
  },
  {
    key: "active_channel_can_outlive_active_retention_policy",
    severity: "critical",
    correctionStatus: "corrected_in_protected_draft",
    title: "Retirada de policy pausa canais e resolução falha fechada",
  },
  {
    key: "attributed_conversion_transaction_deduplication_missing",
    severity: "high",
    correctionStatus: "corrected_in_protected_draft",
    title: "Unicidade de atribuição por transação canônica",
  },
  {
    key: "trusted_integration_channel_event_relation_not_constrained",
    severity: "high",
    correctionStatus: "corrected_in_protected_draft",
    title: "FK composta integração–canal–evento",
  },
  {
    key: "trusted_integration_registry_has_no_controlled_audited_lifecycle",
    severity: "high",
    correctionStatus: "corrected_in_protected_draft",
    title: "Lifecycle administrado, versionado e auditado",
  },
] as const satisfies readonly ThirdCorrectedAdjustedDraftCorrection[];

export const THIRD_CORRECTED_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES = [
  "fresh_production_schema_inventory",
  "admin_authorization_rpc_contract",
  "verified_partner_and_integration_onboarding",
  "commercial_financial_semantics",
  "server_side_url_validator",
  "provider_namespace_and_credentials_registry",
  "legal_retention_and_anonymization",
  "parallel_concurrency_and_failure_tests",
  "production_backup_and_rollback_plan",
  "fourth_independent_structural_review",
] as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_THIRD_CORRECTED_ADJUSTED_DRAFT_REVIEW = {
  version: "v4.8.99-event-ticket-commercial-migration-third-corrected-adjusted-draft-safe",
  baseVersion: "v4.8.98-event-ticket-commercial-second-corrected-draft-fourth-adjustment-plan-safe",
  baseCommit: "3d03bad5b60f5ecc8415f7d28c07efc28f7491d6",
  decision: "third_corrected_adjusted_draft_ready_for_fourth_structural_review",
  correctedAdjustments: THIRD_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length,
  criticalCorrections: THIRD_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter(
    (item) => item.severity === "critical",
  ).length,
  highCorrections: THIRD_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter(
    (item) => item.severity === "high",
  ).length,
  externalPrerequisites: THIRD_CORRECTED_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES.length,
  priorSecondCorrectedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationThirdCorrectedAdjustedDraft(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const keys = new Set(
    THIRD_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.map((item) => item.key),
  );

  const checks = [
    THIRD_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length === 9,
    keys.size === 9,
    EVENT_TICKET_COMMERCIAL_MIGRATION_THIRD_CORRECTED_ADJUSTED_DRAFT_REVIEW.criticalCorrections === 6,
    EVENT_TICKET_COMMERCIAL_MIGRATION_THIRD_CORRECTED_ADJUSTED_DRAFT_REVIEW.highCorrections === 3,
    THIRD_CORRECTED_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10,
    EVENT_TICKET_COMMERCIAL_MIGRATION_THIRD_CORRECTED_ADJUSTED_DRAFT_REVIEW.priorSecondCorrectedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_THIRD_CORRECTED_ADJUSTED_DRAFT_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_THIRD_CORRECTED_ADJUSTED_DRAFT_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_THIRD_CORRECTED_ADJUSTED_DRAFT_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_THIRD_CORRECTED_ADJUSTED_DRAFT_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_THIRD_CORRECTED_ADJUSTED_DRAFT_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_THIRD_CORRECTED_ADJUSTED_DRAFT_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;

  return { ok: checks.every(Boolean), checks };
}
