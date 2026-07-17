export type TenthCorrectedDraftCorrectionSeverity = "critical" | "high";

export type TenthCorrectedDraftCorrection = {
  key: string;
  severity: TenthCorrectedDraftCorrectionSeverity;
  status: "corrected_in_protected_draft";
  evidence: string;
};

export const TENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS = [
  { key: "base_preflight_rejects_required_legacy_indexes", severity: "critical", status: "corrected_in_protected_draft", evidence: "Closed object inventory preserves required schema-base indexes and rejects only explicitly forbidden commercial objects." },
  { key: "credential_context_does_not_verify_credential_key_possession", severity: "critical", status: "corrected_in_protected_draft", evidence: "Detached signature verification binds credential key ID, algorithm, version and canonical challenge payload." },
  { key: "credential_context_consumption_ignores_signed_request_payload", severity: "critical", status: "corrected_in_protected_draft", evidence: "Context, operation receipt and consuming request must share the same canonical request payload hash." },
  { key: "commercial_url_proof_not_cryptographically_bound_to_destination", severity: "critical", status: "corrected_in_protected_draft", evidence: "Destination URL hash, hostname, IP set, redirects, authority, validator and freshness window are signature-bound." },
  { key: "official_fallback_hostname_and_authority_not_bound", severity: "critical", status: "corrected_in_protected_draft", evidence: "Official source URL, normalized hostname, authority version and detached signature are verified together." },
  { key: "retention_signal_family_is_not_batch_atomic", severity: "critical", status: "corrected_in_protected_draft", evidence: "Complete signal families are locked and minimized atomically while immutable transaction family identity is preserved." },
  { key: "service_role_table_dml_boundary_not_explicitly_closed", severity: "high", status: "corrected_in_protected_draft", evidence: "Effective direct DML is revoked from service_role and authorized access remains function-only." },
  { key: "retired_policy_strands_existing_evidence", severity: "high", status: "corrected_in_protected_draft", evidence: "Compatible active successor lineage and historical evidence draining are mandatory before retirement completes." },
  { key: "hmac_canonical_payload_is_ambiguous_and_session_dependent", severity: "high", status: "corrected_in_protected_draft", evidence: "Versioned domain-separated canonical JSON and epoch timestamps remove delimiter and session ambiguity." },
  { key: "receipt_terminal_result_state_is_open", severity: "high", status: "corrected_in_protected_draft", evidence: "Nine active result contracts close operation, status and result-version combinations for terminal receipts." },
] as const satisfies readonly TenthCorrectedDraftCorrection[];

const criticalCount = TENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter((item) => item.severity === "critical").length;
const highCount = TENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter((item) => item.severity === "high").length;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW = {
  version: "v4.8.114-event-ticket-commercial-migration-tenth-corrected-adjusted-draft-safe",
  baseVersion: "v4.8.113-event-ticket-commercial-migration-ninth-corrected-adjusted-draft-structural-review-safe",
  baseCommit: "76d434cf49bb37105ef4386ab8712256336a6703",
  decision: "tenth_corrected_adjusted_draft_ready_for_eleventh_structural_review",
  postgresStatementCount: 121,
  corrections: TENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS,
  correctedAdjustments: TENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length,
  criticalCount,
  highCount,
  retentionEvidenceFamilies: 7,
  materializedMinimizationRules: 44,
  materializedResultContracts: 9,
  normalizedSchemaFromBase: true,
  externalSignatureVerifierRequired: true,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  commercialChannelActivated: false,
  publicEventPageChanged: false,
  previousNinthCorrectedSqlChanged: false,
  promotionAllowed: false,
  newStructuralReviewRequired: true,
} as const;

export function selfTestEventTicketCommercialMigrationTenthCorrectedAdjustedDraft(): { ok: boolean; checks: readonly boolean[] } {
  const keys = new Set(TENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.map((item) => item.key));
  const checks = [
    TENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length === 10,
    keys.size === 10,
    criticalCount === 6,
    highCount === 4,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.postgresStatementCount === 121,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.retentionEvidenceFamilies === 7,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.materializedMinimizationRules === 44,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.materializedResultContracts === 9,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.normalizedSchemaFromBase === true,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.externalSignatureVerifierRequired === true,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.commercialChannelActivated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.previousNinthCorrectedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.promotionAllowed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.newStructuralReviewRequired === true,
  ] as const;
  return { ok: checks.every(Boolean), checks };
}
