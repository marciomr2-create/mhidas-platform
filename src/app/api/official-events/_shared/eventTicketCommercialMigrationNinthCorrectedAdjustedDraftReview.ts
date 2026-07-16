export type NinthCorrectedDraftCorrectionSeverity = "critical" | "high";

export type NinthCorrectedDraftCorrection = {
  key: string;
  severity: NinthCorrectedDraftCorrectionSeverity;
  status: "corrected_in_protected_draft";
  evidence: string;
};

export const NINTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS = [
  { key: "stable_retention_policy_resolver_attempts_row_lock", severity: "critical", status: "corrected_in_protected_draft", evidence: "Resolver is VOLATILE and retains explicit row-lock semantics." },
  { key: "verified_credential_context_is_not_cryptographically_bound", severity: "critical", status: "corrected_in_protected_draft", evidence: "HMAC, audience, operation, nonce, payload hash and token possession are verified." },
  { key: "commercial_channel_activation_is_not_authorization_bound", severity: "critical", status: "corrected_in_protected_draft", evidence: "Single administrative RPC binds approved request, partner, integration, credential, scope and financial evidence." },
  { key: "retention_execution_omits_sensitive_evidence_families", severity: "critical", status: "corrected_in_protected_draft", evidence: "Seven evidence families have policies, rules, checkpoints and fail-closed batch execution." },
  { key: "receipt_minimization_preserves_raw_result_identity", severity: "critical", status: "corrected_in_protected_draft", evidence: "result_id and its correlation hash are minimized with target and idempotency identity." },
  { key: "json_minimization_is_shallow_and_bypassable", severity: "critical", status: "corrected_in_protected_draft", evidence: "Recursive contract allowlists enforce depth, size, key and value constraints." },
  { key: "active_integration_credential_invariants_are_not_schema_closed", severity: "high", status: "corrected_in_protected_draft", evidence: "Partial uniqueness and deferred constraint triggers close current-credential invariants." },
  { key: "purchase_signal_lifecycle_and_supersession_are_inconsistent", severity: "high", status: "corrected_in_protected_draft", evidence: "Attributed, confirmed and correction stages use semantic composite supersession and row locks." },
  { key: "url_proof_and_official_fallback_are_not_authority_bound", severity: "high", status: "corrected_in_protected_draft", evidence: "Validator authority and official-source attestations bind proof, freshness and commercial policy." },
  { key: "preflight_does_not_reject_legacy_security_bypass_objects", severity: "high", status: "corrected_in_protected_draft", evidence: "Closed inventory rejects legacy functions, policies, triggers, indexes and grants." },
] as const satisfies readonly NinthCorrectedDraftCorrection[];

const criticalCount = NINTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter((item) => item.severity === "critical").length;
const highCount = NINTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter((item) => item.severity === "high").length;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_ADJUSTED_DRAFT_REVIEW = {
  version: "v4.8.112-event-ticket-commercial-migration-ninth-corrected-adjusted-draft-safe",
  baseVersion: "v4.8.111-event-ticket-commercial-migration-eighth-corrected-adjusted-draft-structural-review-safe",
  baseCommit: "76d6ab1be7b5c715316d33fd9251d003f9782ecc",
  decision: "ninth_corrected_adjusted_draft_ready_for_tenth_structural_review",
  postgresStatementCount: 113,
  corrections: NINTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS,
  correctedAdjustments: NINTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length,
  criticalCount,
  highCount,
  retentionEvidenceFamilies: 7,
  materializedMinimizationRules: 44,
  normalizedSchemaFromBase: true,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  commercialChannelActivated: false,
  publicEventPageChanged: false,
  previousEighthCorrectedSqlChanged: false,
  promotionAllowed: false,
  newStructuralReviewRequired: true,
} as const;

export function selfTestEventTicketCommercialMigrationNinthCorrectedAdjustedDraft(): { ok: boolean; checks: readonly boolean[] } {
  const keys = new Set(NINTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.map((item) => item.key));
  const checks = [
    NINTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length === 10,
    keys.size === 10,
    criticalCount === 6,
    highCount === 4,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.retentionEvidenceFamilies === 7,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.materializedMinimizationRules === 44,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.normalizedSchemaFromBase === true,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.commercialChannelActivated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.previousEighthCorrectedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.promotionAllowed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.newStructuralReviewRequired === true,
  ] as const;
  return { ok: checks.every(Boolean), checks };
}
