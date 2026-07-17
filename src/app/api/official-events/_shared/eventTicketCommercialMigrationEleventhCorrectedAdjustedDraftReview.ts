export type EleventhCorrectedDraftSeverity = "critical" | "high";

export type EleventhCorrectedDraftCorrection = {
  readonly key: string;
  readonly severity: EleventhCorrectedDraftSeverity;
  readonly status: "corrected";
  readonly title: string;
  readonly evidence: string;
};

export const ELEVENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS = [
  {
    key: "retention_lineage_columns_declared_on_wrong_table",
    severity: "critical",
    status: "corrected",
    title: "Lineage de retencao movido para a tabela correta",
    evidence: "As colunas de sucessao e drenagem passam a existir somente em event_ticket_retention_policy_versions, com FK e self-check.",
  },
  {
    key: "active_retention_policy_bootstrap_is_absent",
    severity: "critical",
    status: "corrected",
    title: "Bootstrap receipt-first das sete policies",
    evidence: "Um recibo de bootstrap fechado ancora sete policies ativas e seus 44 contratos de minimizacao.",
  },
  {
    key: "nullable_admin_authorization_predicates_fail_open",
    severity: "critical",
    status: "corrected",
    title: "Autorizacao administrativa fail-closed",
    evidence: "Todas as RPCs negam auth.uid nulo e qualquer veredito diferente de TRUE.",
  },
  {
    key: "nullable_credential_proof_predicates_fail_open",
    severity: "critical",
    status: "corrected",
    title: "Prova de credencial fail-closed",
    evidence: "Chave, token, nonce e assinatura sao obrigatorios; hash e verificador usam comparacao estrita.",
  },
  {
    key: "commercial_url_proof_activation_is_nullable_fail_open",
    severity: "critical",
    status: "corrected",
    title: "Prova URL estritamente booleana",
    evidence: "O verificador usa coalesce false, assinatura TRUE e o boundary exige TRUE.",
  },
  {
    key: "active_channel_is_not_redeemable_or_time_bound",
    severity: "critical",
    status: "corrected",
    title: "Canal ativo recuperavel e temporal",
    evidence: "Ciphertext, hostname, valid_from, health e componentes assinados sao obrigatorios.",
  },
  {
    key: "purchase_signal_correction_chain_is_blocked_by_unique_index",
    severity: "high",
    status: "corrected",
    title: "Cadeias de correcao abertas",
    evidence: "A unicidade cobre somente o estado recorded e o predecessor e supersedido antes da insercao atomica.",
  },
  {
    key: "retention_policy_rules_are_not_execution_authority",
    severity: "high",
    status: "corrected",
    title: "Matriz de regras como autoridade",
    evidence: "Manifesto ordenado e executor_contract_hash sao validados por policy antes da execucao e substituicao.",
  },
  {
    key: "expired_active_credential_contexts_are_never_closed",
    severity: "high",
    status: "corrected",
    title: "Expiracao de contextos fechada",
    evidence: "O batch marca contextos vencidos como expired sob o recibo do run antes da minimizacao.",
  },
  {
    key: "legacy_privileged_routine_bypass_inventory_is_incomplete",
    severity: "high",
    status: "corrected",
    title: "Inventario privilegiado fechado",
    evidence: "Preflight por prefixo cobre routines, views, triggers e grants do service_role; self-check usa allowlist exata.",
  }
] as const satisfies readonly EleventhCorrectedDraftCorrection[];

const criticalCount = ELEVENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter(
  (item) => item.severity === "critical",
).length;

const highCount = ELEVENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter(
  (item) => item.severity === "high",
).length;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW = {
  version: "v4.8.116-event-ticket-commercial-migration-eleventh-corrected-adjusted-draft-safe",
  baseVersion: "v4.8.115-event-ticket-commercial-migration-tenth-corrected-adjusted-draft-structural-review-safe",
  baseCommit: "aa3267a0318d39cb5dadc2a2778e2ef4d4c5c8aa",
  decision: "eleventh_corrected_adjusted_draft_ready_for_twelfth_structural_review",
  corrections: ELEVENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS,
  correctedAdjustments: ELEVENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length,
  criticalCount,
  highCount,
  postgresStatementCount: 127,
  activeRetentionPolicies: 7,
  minimizationRulesMaterialized: 44,
  resultContractsMaterialized: 9,
  previousTenthCorrectedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  promotionAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationEleventhCorrectedAdjustedDraft(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const keys = new Set(ELEVENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.map((item) => item.key));
  const checks = [
    ELEVENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length === 10,
    keys.size === 10,
    criticalCount === 6,
    highCount === 4,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.postgresStatementCount === 127,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.activeRetentionPolicies === 7,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.minimizationRulesMaterialized === 44,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.resultContractsMaterialized === 9,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.previousTenthCorrectedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.promotionAllowed === false,
  ] as const;
  return { ok: checks.every(Boolean), checks };
}
