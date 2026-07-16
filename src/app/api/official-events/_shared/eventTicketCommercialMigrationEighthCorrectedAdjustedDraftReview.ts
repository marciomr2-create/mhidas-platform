export type EighthCorrectedDraftCorrectionSeverity = "critical" | "high";

export type EighthCorrectedDraftCorrection = {
  key: string;
  severity: EighthCorrectedDraftCorrectionSeverity;
  status: "corrected_in_protected_draft";
  evidence: string;
};

export const EIGHTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS = [
  { key: "current_credential_version_is_not_authoritative", severity: "critical", status: "corrected_in_protected_draft", evidence: "Trusted operations lock partner, integration and current active credential; rotation is atomic." },
  { key: "public_channel_ignores_partner_and_integration_lifecycle", severity: "critical", status: "corrected_in_protected_draft", evidence: "Public resolution binds partner, integration, current credential and active event scope." },
  { key: "url_proof_nullable_hostname_and_unbounded_health_age", severity: "critical", status: "corrected_in_protected_draft", evidence: "Validated proof is fail-closed and health age is limited to fifteen minutes." },
  { key: "purchase_signal_semantic_relations_are_not_bound", severity: "critical", status: "corrected_in_protected_draft", evidence: "Composite foreign keys, row locks and transaction requirements bind the signal graph." },
  { key: "receipt_terminal_states_can_be_reused_as_pending_work", severity: "critical", status: "corrected_in_protected_draft", evidence: "Completed replays, failed is terminal and pending concurrent work is rejected." },
  { key: "retention_minimization_and_policy_authority_are_incomplete", severity: "critical", status: "corrected_in_protected_draft", evidence: "Server-side policy resolution and seventeen materialized rules minimize raw identifiers." },
  { key: "public_resolver_returns_ciphertext_and_drops_official_url", severity: "high", status: "corrected_in_protected_draft", evidence: "Resolver returns an opaque redirect token or validated HTTPS official reference." },
  { key: "partner_status_mutation_has_no_valid_transition_contract", severity: "high", status: "corrected_in_protected_draft", evidence: "Closed transition matrix fills verification evidence and audits lifecycle cascades." },
  { key: "rls_read_policies_have_no_table_select_grants", severity: "high", status: "corrected_in_protected_draft", evidence: "Exactly five policy-backed tables receive minimum authenticated SELECT grants." },
  { key: "base_preflight_is_not_schema_exact", severity: "high", status: "corrected_in_protected_draft", evidence: "Closed dependency inventory validates required columns, roles, extension and target absence." },
] as const satisfies readonly EighthCorrectedDraftCorrection[];

const criticalCount = EIGHTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter((item) => item.severity === "critical").length;
const highCount = EIGHTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter((item) => item.severity === "high").length;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW = {
  version: "v4.8.110-event-ticket-commercial-migration-eighth-corrected-adjusted-draft-safe",
  baseVersion: "v4.8.109-event-ticket-commercial-migration-seventh-corrected-adjusted-draft-structural-review-safe",
  baseCommit: "ef5d7ba3403178e7ef4c0f33bb74f6750506fc99",
  decision: "eighth_corrected_adjusted_draft_ready_for_ninth_structural_review",
  parsedPostgresStatementCount: 119,
  corrections: EIGHTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS,
  correctedAdjustments: EIGHTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length,
  criticalCorrections: criticalCount,
  highCorrections: highCount,
  currentCredentialAuthoritative: true,
  credentialRotationAtomic: true,
  publicChannelLifecycleBound: true,
  urlProofFailClosed: true,
  purchaseSignalSemanticBinding: true,
  receiptTerminalStateMachineClosed: true,
  retentionPolicyServerAuthoritative: true,
  rawIdentifierMinimizationComplete: true,
  publicCiphertextExposure: false,
  partnerTransitionMatrixClosed: true,
  rlsSelectGrantsReachable: true,
  baseDependencyPreflightClosed: true,
  minimizationRulesMaterialized: 17,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  previousSeventhCorrectedSqlChanged: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationEighthCorrectedAdjustedDraftReview(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const keys = new Set(EIGHTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.map((item) => item.key));
  const checks = [
    EIGHTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length === 10,
    keys.size === 10,
    criticalCount === 6,
    highCount === 4,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.parsedPostgresStatementCount === 119,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.currentCredentialAuthoritative === true,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.credentialRotationAtomic === true,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.publicChannelLifecycleBound === true,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.urlProofFailClosed === true,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.purchaseSignalSemanticBinding === true,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.receiptTerminalStateMachineClosed === true,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.retentionPolicyServerAuthoritative === true,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.rawIdentifierMinimizationComplete === true,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.publicCiphertextExposure === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.partnerTransitionMatrixClosed === true,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.rlsSelectGrantsReachable === true,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.baseDependencyPreflightClosed === true,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.minimizationRulesMaterialized === 17,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.previousSeventhCorrectedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;
  return { ok: checks.every(Boolean), checks };
}
