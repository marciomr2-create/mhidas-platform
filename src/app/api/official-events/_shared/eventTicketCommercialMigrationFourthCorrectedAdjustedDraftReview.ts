export type FourthCorrectedAdjustedDraftSeverity = "critical" | "high";

export type FourthCorrectedAdjustedDraftCorrection = {
  key: string;
  severity: FourthCorrectedAdjustedDraftSeverity;
  correctionStatus: "corrected_in_protected_draft";
  title: string;
};

export const FOURTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS = [
  {
    key: "legacy_idempotency_paths_remain_non_atomic",
    severity: "critical",
    correctionStatus: "corrected_in_protected_draft",
    title: "Caminhos concedidos migrados para autoridade de recibo atômico",
  },
  {
    key: "trusted_integration_identity_not_credential_bound",
    severity: "critical",
    correctionStatus: "corrected_in_protected_draft",
    title: "Identidade da integração derivada de credencial verificada",
  },
  {
    key: "partner_lifecycle_not_idempotent_or_transition_constrained",
    severity: "critical",
    correctionStatus: "corrected_in_protected_draft",
    title: "Lifecycle do parceiro com matriz, lock e recibo",
  },
  {
    key: "retention_retirement_not_idempotent_or_state_guarded",
    severity: "critical",
    correctionStatus: "corrected_in_protected_draft",
    title: "Aposentadoria de policy restrita a active para retired",
  },
  {
    key: "cascade_mutations_lack_per_object_audit",
    severity: "critical",
    correctionStatus: "corrected_in_protected_draft",
    title: "Auditoria individual e correlacionada para cada efeito de cascata",
  },
  {
    key: "trusted_integration_onboarding_and_rotation_path_missing",
    severity: "high",
    correctionStatus: "corrected_in_protected_draft",
    title: "Onboarding e rotação transacionais com histórico de credencial",
  },
  {
    key: "integration_scope_terminal_insert_and_audit_identity_ambiguous",
    severity: "high",
    correctionStatus: "corrected_in_protected_draft",
    title: "Criação e transição de scope separadas por chave composta",
  },
  {
    key: "admin_full_purchase_signal_read_path_missing",
    severity: "high",
    correctionStatus: "corrected_in_protected_draft",
    title: "Leitura administrativa mínima, auditada e por finalidade",
  },
  {
    key: "audit_and_receipt_retention_contract_missing",
    severity: "high",
    correctionStatus: "corrected_in_protected_draft",
    title: "Retenção e anonimização de auditorias e recibos",
  },
] as const satisfies readonly FourthCorrectedAdjustedDraftCorrection[];

export const FOURTH_CORRECTED_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES = [
  "fresh_production_schema_inventory",
  "admin_authorization_rpc_contract",
  "verified_partner_and_integration_onboarding",
  "commercial_financial_semantics",
  "server_side_url_and_credential_validator",
  "provider_namespace_and_credentials_registry",
  "legal_retention_and_anonymization",
  "parallel_concurrency_and_failure_tests",
  "production_backup_and_rollback_plan",
  "fifth_independent_structural_review",
] as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_ADJUSTED_DRAFT_REVIEW = {
  version: "v4.8.102-event-ticket-commercial-migration-fourth-corrected-adjusted-draft-safe",
  baseVersion: "v4.8.101-event-ticket-commercial-third-corrected-draft-fifth-adjustment-plan-safe",
  baseCommit: "b2f0bbf2a47d9b91b10cc4fbafb17204d48ba48c",
  decision: "fourth_corrected_adjusted_draft_ready_for_fifth_structural_review",
  correctedAdjustments: FOURTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length,
  criticalCorrections: FOURTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter(
    (item) => item.severity === "critical",
  ).length,
  highCorrections: FOURTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter(
    (item) => item.severity === "high",
  ).length,
  externalPrerequisites: FOURTH_CORRECTED_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES.length,
  priorThirdCorrectedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationFourthCorrectedAdjustedDraft(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const keys = new Set(
    FOURTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.map((item) => item.key),
  );

  const checks = [
    FOURTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length === 9,
    keys.size === 9,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.criticalCorrections === 5,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.highCorrections === 4,
    FOURTH_CORRECTED_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.priorThirdCorrectedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;

  return { ok: checks.every(Boolean), checks };
}
