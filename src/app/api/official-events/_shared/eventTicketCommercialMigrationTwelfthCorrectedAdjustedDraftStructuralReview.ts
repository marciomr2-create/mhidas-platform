export type TwelfthCorrectedDraftStructuralSeverity = "critical" | "high";

export type TwelfthCorrectedDraftStructuralFinding = {
  readonly key: string;
  readonly severity: TwelfthCorrectedDraftStructuralSeverity;
  readonly status: "required";
  readonly title: string;
  readonly evidence: string;
  readonly requiredCorrection: string;
};

export type TwelfthCorrectedDraftRemediationPhase = {
  readonly phase: string;
  readonly name: string;
  readonly findingKeys: readonly string[];
  readonly acceptanceTests: number;
};

export const TWELFTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS = [
  {
    key: "legacy_backfill_fk_targets_table_created_later",
    severity: "critical",
    status: "required",
    title: "legacy backfill fk targets table created later",
    evidence: "O DDL de event_ticket_legacy_backfill_items declara FK para event_ticket_backfill_rejections antes de essa tabela existir no script.",
    requiredCorrection: "Reordenar o DDL para criar a tabela referenciada antes do FK, ou adicionar a constraint somente depois que ambas existirem; validar o script em PostgreSQL real com check_function_bodies padrao.",
  },
  {
    key: "pretable_rowtype_function_forward_reference_is_not_closed",
    severity: "critical",
    status: "required",
    title: "pretable rowtype function forward reference is not closed",
    evidence: "mhidas_ticket_assert_current_credential_invariant_v1 e criado antes de event_ticket_trusted_integrations e declara public.event_ticket_trusted_integrations%rowtype, sem desabilitar validacao de corpos.",
    requiredCorrection: "Mover helpers dependentes para depois das tabelas ou criar tipos independentes; nao depender de forward reference e executar dry-run com check_function_bodies=on.",
  },
  {
    key: "signal_family_retention_can_partially_tombstone_under_concurrency",
    severity: "critical",
    status: "required",
    title: "signal family retention can partially tombstone under concurrency",
    evidence: "A selecao da familia usa advisory lock apenas no executor e a CTE de linhas usa FOR UPDATE SKIP LOCKED. Escritores nao tomam o mesmo lock e linhas bloqueadas podem ser ignoradas, permitindo tombstone parcial ou insercao concorrente na familia.",
    requiredCorrection: "Compartilhar o mesmo lock entre gravacao e retencao, bloquear e revalidar a familia completa sem SKIP LOCKED parcial e abortar quando a cardinalidade travada divergir da elegivel.",
  },
  {
    key: "url_and_official_source_signatures_are_not_key_hash_aware",
    severity: "critical",
    status: "required",
    title: "url and official source signatures are not key hash aware",
    evidence: "As provas de URL e fonte oficial comparam signer_key_hash da linha, mas verificam a assinatura por mhidas_verify_detached_signature_v1, sem passar o hash da chave aprovada ao verificador.",
    requiredCorrection: "Usar verificador hash-aware para ambas as provas e vincular authority id, key id, algoritmo, key hash e manifest version ao payload assinado.",
  },
  {
    key: "credential_context_idempotency_omits_token_and_expiry",
    severity: "critical",
    status: "required",
    title: "credential context idempotency omits token and expiry",
    evidence: "O context_id deterministico e o recibo de emissao nao vinculam context_token_hash nem expires_at; o request_hash do recibo e apenas p_request_payload_hash. Reuso da mesma chave pode devolver contexto emitido com segredo ou TTL diferentes.",
    requiredCorrection: "Incluir token hash, expiry, canonical payload hash e assinatura na identidade semantica/idempotente, e exigir igualdade integral no replay.",
  },
  {
    key: "credential_context_consumption_omits_fingerprint_snapshot",
    severity: "critical",
    status: "required",
    title: "credential context consumption omits fingerprint snapshot",
    evidence: "O consumo compara verifier_key_hash, key id, algoritmo e issuer hash, mas nao compara credential_fingerprint_hash_snapshot com a credencial corrente.",
    requiredCorrection: "Comparar fingerprint snapshot e todos os campos da attestation; tornar o snapshot imutavel e revogar contextos quando qualquer componente autorizado divergir.",
  },
  {
    key: "commercial_envelope_hash_is_required_but_never_verified",
    severity: "high",
    status: "required",
    title: "commercial envelope hash is required but never verified",
    evidence: "destination_envelope_hash e obrigatorio para canal ativo, mas nao participa do helper de decriptacao, da ativacao, do resolver ou do self-check.",
    requiredCorrection: "Definir o hash canonico do envelope, recomputa-lo no boundary de decriptacao e inclui-lo no payload/prova assinada antes de ativar e resolver.",
  },
  {
    key: "retention_batch_limit_is_not_a_global_work_bound",
    severity: "high",
    status: "required",
    title: "retention batch limit is not a global work bound",
    evidence: "p_batch_limit e aplicado separadamente a cada familia de evidencia e a expiracao de contextos ativos e ilimitada. Uma execucao pode alterar muitas vezes o limite declarado.",
    requiredCorrection: "Criar orcamento global de linhas, limitar expiracoes e cada fase pelo saldo restante e registrar contagens tentadas, bloqueadas e alteradas.",
  },
  {
    key: "legacy_backfill_pipeline_is_only_prepared_and_source_contract_drifts",
    severity: "high",
    status: "required",
    title: "legacy backfill pipeline is only prepared and source contract drifts",
    evidence: "A RPC de backfill apenas conta fontes e cria run vazio; nao materializa items, rejections ou checkpoints. O inventario inclui event_sources, mas o check de source_table das rejeicoes nao permite event_sources.",
    requiredCorrection: "Implementar pipeline receipt-first de mapeamento/rejeicao/checksum/cutover, alinhar allowlists de fontes e impor invariantes de mapped versus rejected.",
  },
  {
    key: "channel_activation_overwrites_found_before_target_validation",
    severity: "high",
    status: "required",
    title: "channel activation overwrites found before target validation",
    evidence: "A funcao seleciona o canal, executa PERFORM pg_advisory_xact_lock e somente depois testa IF NOT FOUND. O PERFORM sobrescreve FOUND, mascarando canal inexistente e invalidando a ordem de validacao/lock.",
    requiredCorrection: "Validar FOUND imediatamente apos SELECT, depois adquirir lock por chave nao nula e reconsultar/revalidar o canal sob o lock.",
  },
] as const satisfies readonly TwelfthCorrectedDraftStructuralFinding[];

export const TWELFTH_CORRECTED_DRAFT_REMEDIATION_MATRIX = TWELFTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.map(
  (finding, index) => ({
    phase: `R${index + 1}`,
    name: finding.key,
    findingKeys: [finding.key],
    acceptanceTests: 5,
  }),
) satisfies readonly TwelfthCorrectedDraftRemediationPhase[];

export const TWELFTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES = [
  "postgres_real_ddl_dry_run_with_normal_body_validation",
  "fresh_legacy_schema_and_volume_inventory",
  "hash_aware_url_and_official_source_authority_contract",
  "canonical_commercial_envelope_contract",
  "shared_signal_family_writer_retention_lock_protocol",
  "global_retention_executor_work_budget",
  "postgres_fk_concurrency_idempotency_rollback_tests",
  "production_backup_and_rollback_plan",
  "representative_clone_backfill_cutover_dry_run",
  "independent_review_of_next_sql",
] as const;

const criticalCount = TWELFTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "critical",
).length;

const highCount = TWELFTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "high",
).length;

const acceptanceTests = TWELFTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.reduce(
  (total, phase) => total + phase.acceptanceTests,
  0,
);

export const EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW = {
  version: "v4.8.119-event-ticket-commercial-migration-twelfth-corrected-adjusted-draft-structural-review-safe",
  baseVersion: "v4.8.118-event-ticket-commercial-migration-twelfth-corrected-adjusted-draft-safe",
  baseCommit: "a02b051fa6bb44a144395b5585e71781da168aad",
  decision: "needs_adjustment_with_remediation_matrix",
  findings: TWELFTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS,
  remediationMatrix: TWELFTH_CORRECTED_DRAFT_REMEDIATION_MATRIX,
  requiredAdjustments: TWELFTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length,
  criticalCount,
  highCount,
  acceptanceTests,
  externalPrerequisites: TWELFTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length,
  reviewedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  separateAdjustmentPlanRequired: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationTwelfthCorrectedDraftStructuralReview(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const findingKeys = new Set(TWELFTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.map((item) => item.key));
  const matrixKeys = new Set(TWELFTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.flatMap((phase) => phase.findingKeys));
  const checks = [
    TWELFTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length === 10,
    findingKeys.size === 10,
    matrixKeys.size === 10,
    [...findingKeys].every((key) => matrixKeys.has(key)),
    criticalCount === 6,
    highCount === 4,
    TWELFTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.length === 10,
    acceptanceTests === 50,
    TWELFTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.reviewedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.separateAdjustmentPlanRequired === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;
  return { ok: checks.every(Boolean), checks };
}
