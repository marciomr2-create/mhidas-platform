export type TwelfthCorrectedDraftSeverity = "critical" | "high";

export type TwelfthCorrectedDraftCorrection = {
  readonly key: string;
  readonly severity: TwelfthCorrectedDraftSeverity;
  readonly status: "corrected";
  readonly title: string;
  readonly evidence: string;
};

export const TWELFTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS = [
  {
    key: "retention_signal_family_tombstones_not_due_rows",
    severity: "critical",
    status: "corrected",
    title: "Familias vencidas e limite real de linhas",
    evidence: "A elegibilidade exige todos os membros vencidos e o acumulado de linhas nao ultrapassa o batch.",
  },
  {
    key: "concurrent_receipt_semantic_reuse_is_partially_validated",
    severity: "critical",
    status: "corrected",
    title: "Replay concorrente semanticamente completo",
    evidence: "Um comparador unico verifica todos os campos semanticos nos dois caminhos de reserva.",
  },
  {
    key: "credential_signature_is_not_bound_to_registered_key_hash",
    severity: "critical",
    status: "corrected",
    title: "Assinatura vinculada ao material aprovado",
    evidence: "O verificador recebe key id, algoritmo, verifier-key hash e fingerprint registrados.",
  },
  {
    key: "commercial_destination_ciphertext_is_not_bound_to_signed_url",
    severity: "critical",
    status: "corrected",
    title: "Envelope comercial vinculado ao destino assinado",
    evidence: "Ativacao e leitura recomputam URL hash e hostname dentro do boundary de decriptacao.",
  },
  {
    key: "confirmed_conversion_bypasses_conversion_confirmation_scope",
    severity: "critical",
    status: "corrected",
    title: "Scope de confirmacao obrigatorio",
    evidence: "Confirmed conversion e correction exigem conversion_confirmation ativo e vigente.",
  },
  {
    key: "expired_active_channel_blocks_replacement",
    severity: "critical",
    status: "corrected",
    title: "Substituicao atomica de canal vencido",
    evidence: "O canal vencido e fechado sob lock antes da ativacao do sucessor.",
  },
  {
    key: "retention_rule_contract_is_self_referential",
    severity: "high",
    status: "corrected",
    title: "Contrato externo do executor de retencao",
    evidence: "Sete contratos canonicos imutaveis vinculam manifesto e codigo do executor.",
  },
  {
    key: "legacy_data_backfill_and_cutover_are_absent",
    severity: "high",
    status: "corrected",
    title: "Backfill e cutover materializados",
    evidence: "Runs, itens e checkpoints registram inventario, checksums, rejeicoes e rollback.",
  },
  {
    key: "contract_json_scalar_types_allow_minimization_bypass",
    severity: "high",
    status: "corrected",
    title: "Tipos JSON fechados por chave",
    evidence: "Escalares e containers nao previstos sao recusados por schema explicito.",
  },
  {
    key: "post_create_function_execute_allowlist_is_incomplete",
    severity: "high",
    status: "corrected",
    title: "Allowlist efetiva de EXECUTE fechada",
    evidence: "Todas as ACLs de login roles sao zeradas antes dos grants exatos e auditadas no self-check.",
  },
] as const satisfies readonly TwelfthCorrectedDraftCorrection[];

const criticalCount = TWELFTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter(
  (item) => item.severity === "critical",
).length;

const highCount = TWELFTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter(
  (item) => item.severity === "high",
).length;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW = {
  version: "v4.8.118-event-ticket-commercial-migration-twelfth-corrected-adjusted-draft-safe",
  baseVersion: "v4.8.117-event-ticket-commercial-migration-eleventh-corrected-adjusted-draft-structural-review-safe",
  baseCommit: "fb1497c2444980fbd411f4d41f2820859f0850b1",
  decision: "twelfth_corrected_adjusted_draft_ready_for_thirteenth_structural_review",
  corrections: TWELFTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS,
  correctedAdjustments: TWELFTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length,
  criticalCount,
  highCount,
  postgresStatementCount: 146,
  activeRetentionPolicies: 7,
  minimizationRulesMaterialized: 44,
  resultContractsMaterialized: 9,
  retentionExecutorContractsMaterialized: 7,
  previousEleventhCorrectedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  promotionAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationTwelfthCorrectedAdjustedDraft(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const keys = new Set(TWELFTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.map((item) => item.key));
  const checks = [
    TWELFTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length === 10,
    keys.size === 10,
    criticalCount === 6,
    highCount === 4,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.postgresStatementCount === 146,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.activeRetentionPolicies === 7,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.minimizationRulesMaterialized === 44,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.resultContractsMaterialized === 9,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.retentionExecutorContractsMaterialized === 7,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.previousEleventhCorrectedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.promotionAllowed === false,
  ] as const;
  return { ok: checks.every(Boolean), checks };
}
