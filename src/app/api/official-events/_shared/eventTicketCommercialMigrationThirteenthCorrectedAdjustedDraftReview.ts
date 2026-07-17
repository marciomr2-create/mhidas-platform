export type ThirteenthCorrectedDraftSeverity = "critical" | "high";

export type ThirteenthCorrectedDraftCorrection = {
  readonly key: string;
  readonly severity: ThirteenthCorrectedDraftSeverity;
  readonly title: string;
  readonly evidence: string;
};

export const THIRTEENTH_CORRECTED_ADJUSTED_DRAFT_VERSION = "v4.8.120-event-ticket-commercial-migration-thirteenth-corrected-adjusted-draft-safe" as const;
export const THIRTEENTH_CORRECTED_ADJUSTED_DRAFT_BASE_COMMIT = "0f3be74158fc7edb1e8626c6b3d0d21f7722ca7e" as const;
export const THIRTEENTH_CORRECTED_ADJUSTED_DRAFT_SQL_STATEMENT_COUNT = 148 as const;

export const THIRTEENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS = [
  { key: 'legacy_backfill_fk_targets_table_created_later', severity: 'critical', title: 'DDL de backfill reordenado', evidence: 'A tabela referenciada e criada antes dos itens e da FK.' },
  { key: 'pretable_rowtype_function_forward_reference_is_not_closed', severity: 'critical', title: 'Forward reference eliminada', evidence: 'O trigger dependente e criado apos as tabelas.' },
  { key: 'signal_family_retention_can_partially_tombstone_under_concurrency', severity: 'critical', title: 'Familia atomica sob concorrencia', evidence: 'Escritor e retencao compartilham advisory lock e bloqueio integral.' },
  { key: 'url_and_official_source_signatures_are_not_key_hash_aware', severity: 'critical', title: 'Assinaturas hash-aware', evidence: 'Autoridade e hash da chave participam do payload e da verificacao.' },
  { key: 'credential_context_idempotency_omits_token_and_expiry', severity: 'critical', title: 'Identidade idempotente completa', evidence: 'Token, expiry, assinatura e payload vinculam contexto e recibo.' },
  { key: 'credential_context_consumption_omits_fingerprint_snapshot', severity: 'critical', title: 'Fingerprint exigido no consumo', evidence: 'Todos os snapshots da credencial corrente sao comparados.' },
  { key: 'commercial_envelope_hash_is_required_but_never_verified', severity: 'high', title: 'Envelope canonico verificado', evidence: 'Hash e recomputado e incluido na prova de URL.' },
  { key: 'retention_batch_limit_is_not_a_global_work_bound', severity: 'high', title: 'Orcamento global de trabalho', evidence: 'Todas as fases consomem um saldo unico e auditavel.' },
  { key: 'legacy_backfill_pipeline_is_only_prepared_and_source_contract_drifts', severity: 'high', title: 'Pipeline materializado', evidence: 'Itens, rejeicoes, checksums e checkpoint cobrem as tres fontes.' },
  { key: 'channel_activation_overwrites_found_before_target_validation', severity: 'high', title: 'Ordem FOUND/lock corrigida', evidence: 'Canal e validado antes e revalidado depois do lock.' }
] as const satisfies readonly ThirteenthCorrectedDraftCorrection[];

export const THIRTEENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW = {
  decision: "thirteenth_corrected_adjusted_draft_ready_for_fourteenth_structural_review",
  correctedAdjustments: THIRTEENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length,
  criticalCorrections: THIRTEENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter((item) => item.severity === "critical").length,
  highCorrections: THIRTEENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.filter((item) => item.severity === "high").length,
  activeRetentionPolicies: 7,
  minimizationRulesMaterialized: 44,
  resultContractsMaterialized: 9,
  retentionExecutorContractsMaterialized: 7,
  parserValidated: true,
  previousSqlChanged: false,
  promotionAllowed: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
} as const;

if (THIRTEENTH_CORRECTED_ADJUSTED_DRAFT_CORRECTIONS.length !== 10) {
  throw new Error("THIRTEENTH_CORRECTED_DRAFT_CORRECTION_COUNT_INVALID");
}
if (THIRTEENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.criticalCorrections !== 6) {
  throw new Error("THIRTEENTH_CORRECTED_DRAFT_CRITICAL_COUNT_INVALID");
}
if (THIRTEENTH_CORRECTED_ADJUSTED_DRAFT_REVIEW.highCorrections !== 4) {
  throw new Error("THIRTEENTH_CORRECTED_DRAFT_HIGH_COUNT_INVALID");
}
