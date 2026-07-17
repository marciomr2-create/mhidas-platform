export type EleventhCorrectedDraftStructuralSeverity = "critical" | "high";

export type EleventhCorrectedDraftStructuralFinding = {
  readonly key: string;
  readonly severity: EleventhCorrectedDraftStructuralSeverity;
  readonly status: "required";
  readonly title: string;
  readonly evidence: string;
  readonly requiredCorrection: string;
};

export type EleventhCorrectedDraftRemediationPhase = {
  readonly phase: string;
  readonly name: string;
  readonly findingKeys: readonly string[];
  readonly acceptanceTests: number;
};

export const ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS = [
  {
    key: "retention_signal_family_tombstones_not_due_rows",
    severity: "critical",
    status: "required",
    title: "Uma linha vencida pode tombstonar toda a familia de sinais",
    evidence: "O batch seleciona uma familia quando qualquer sinal esta vencido, mas a CTE seguinte bloqueia e minimiza todos os sinais ainda nao minimizados da familia, sem reaplicar a data-limite ou a policy individual. O limite conta familias, nao linhas.",
    requiredCorrection: "Exigir elegibilidade atomica da familia inteira ou minimizar apenas membros vencidos sem quebrar a cadeia, limitando e medindo linhas efetivamente bloqueadas.",
  },
  {
    key: "concurrent_receipt_semantic_reuse_is_partially_validated",
    severity: "critical",
    status: "required",
    title: "O replay concorrente valida somente parte do contrato semantico",
    evidence: "No unique_violation, um recibo concluido e reutilizado verificando apenas request_hash e target_id, omitindo scope, integration, credential, target type, lock version e policy.",
    requiredCorrection: "Centralizar a comparacao completa e aplica-la identicamente no caminho normal e no caminho concorrente.",
  },
  {
    key: "credential_signature_is_not_bound_to_registered_key_hash",
    severity: "critical",
    status: "required",
    title: "A assinatura nao prova correspondencia com o hash da chave aprovada",
    evidence: "O verificador recebe apenas key id, algoritmo, payload e assinatura. verifier_key_hash e credential_fingerprint_hash nao participam da decisao criptografica.",
    requiredCorrection: "Usar verificador hash-aware ou attestation imutavel que vincule key id, algoritmo, public-key hash e fingerprint.",
  },
  {
    key: "commercial_destination_ciphertext_is_not_bound_to_signed_url",
    severity: "critical",
    status: "required",
    title: "O ciphertext do redirect nao esta ligado ao destino assinado",
    evidence: "A prova cobre URL hash e hostname, mas a ativacao apenas exige ciphertext presente e com tamanho valido; nao ha decriptacao, MAC ou recomputacao de hash e hostname.",
    requiredCorrection: "Verificar o envelope antes da ativacao e no redirect, decriptando em boundary controlado e comparando hash e hostname com a prova assinada.",
  },
  {
    key: "confirmed_conversion_bypasses_conversion_confirmation_scope",
    severity: "critical",
    status: "required",
    title: "Confirmed conversion usa somente o scope generico de purchase signal",
    evidence: "A RPC exige sempre channel_scope purchase_signal; conversion_confirmation existe no schema, mas nao e consultado para confirmed_conversion.",
    requiredCorrection: "Aplicar matriz fechada de signal type para scope e exigir conversion_confirmation vigente para confirmacoes e correcoes equivalentes.",
  },
  {
    key: "expired_active_channel_blocks_replacement",
    severity: "critical",
    status: "required",
    title: "Canal vencido permanece active e bloqueia sucessor",
    evidence: "O resolver filtra valid_until, mas o indice unico considera apenas channel_status active. Sem transicao automatica para expired, a linha vencida impede nova ativacao.",
    requiredCorrection: "Criar expiracao e troca receipt-first, atomica e concorrente, fechando o canal anterior antes de ativar o sucessor.",
  },
  {
    key: "retention_rule_contract_is_self_referential",
    severity: "high",
    status: "required",
    title: "Manifesto de regras valida a si mesmo, nao o executor real",
    evidence: "Manifest e executor hash sao derivados das regras da propria policy, enquanto o batch continua hardcoded. A substituicao exige apenas a mesma contagem da policy anterior.",
    requiredCorrection: "Fixar manifests canonicos por executor/evidencia ou executar DSL allowlisted derivada das regras, com referencia externa imutavel.",
  },
  {
    key: "legacy_data_backfill_and_cutover_are_absent",
    severity: "high",
    status: "required",
    title: "As tabelas legadas sao exigidas, mas seus dados nao sao migrados",
    evidence: "event_ticket_intents, partner_ticket_requests e event_sources aparecem no preflight, sem leitura, backfill, rejeicoes materializadas, checksum ou cutover.",
    requiredCorrection: "Adicionar backfill idempotente, rejeicoes, contagens, checksums, dual-read/cutover e rollback comprovado.",
  },
  {
    key: "contract_json_scalar_types_allow_minimization_bypass",
    severity: "high",
    status: "required",
    title: "Escalares numericos e booleanos escapam do contrato JSON",
    evidence: "O validador controla chaves e strings, mas aceita numeros, booleanos e null sem schema por campo, permitindo identificadores brutos fora das regex.",
    requiredCorrection: "Definir tipo, formato, tamanho, faixa e nulabilidade por chave e recusar containers ou escalares nao previstos.",
  },
  {
    key: "post_create_function_execute_allowlist_is_incomplete",
    severity: "high",
    status: "required",
    title: "Default privileges podem expor helpers SECURITY DEFINER",
    evidence: "As funcoes revogam EXECUTE apenas de PUBLIC e o self-check fecha somente service_role. Grants diretos a anon, authenticated ou roles customizados nao sao inventariados.",
    requiredCorrection: "Revogar explicitamente de roles nao autorizados e validar ACLs e memberships efetivos por assinatura para todos os login roles.",
  },
] as const satisfies readonly EleventhCorrectedDraftStructuralFinding[];

export const ELEVENTH_CORRECTED_DRAFT_REMEDIATION_MATRIX = ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.map(
  (finding, index) => ({
    phase: `R${index + 1}`,
    name: finding.key,
    findingKeys: [finding.key],
    acceptanceTests: 5,
  }),
) satisfies readonly EleventhCorrectedDraftRemediationPhase[];

export const ELEVENTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES = [
  "fresh_legacy_schema_and_volume_inventory",
  "immutable_hash_aware_key_registry_contract",
  "commercial_destination_encryption_redemption_contract",
  "signal_type_scope_authorization_matrix",
  "canonical_retention_executor_contract",
  "effective_default_privilege_acl_membership_inventory",
  "postgres_ddl_rls_concurrency_fk_idempotency_tests",
  "production_backup_and_rollback_plan",
  "representative_clone_backfill_dry_run",
  "independent_review_of_next_sql",
] as const;

const criticalCount = ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "critical",
).length;

const highCount = ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "high",
).length;

const acceptanceTests = ELEVENTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.reduce(
  (total, phase) => total + phase.acceptanceTests,
  0,
);

export const EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW = {
  version: "v4.8.117-event-ticket-commercial-migration-eleventh-corrected-adjusted-draft-structural-review-safe",
  baseVersion: "v4.8.116-event-ticket-commercial-migration-eleventh-corrected-adjusted-draft-safe",
  baseCommit: "97fe043a240f94fd05339bd104e9b0a0c7575d74",
  decision: "needs_adjustment_with_remediation_matrix",
  findings: ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS,
  remediationMatrix: ELEVENTH_CORRECTED_DRAFT_REMEDIATION_MATRIX,
  requiredAdjustments: ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length,
  criticalCount,
  highCount,
  acceptanceTests,
  externalPrerequisites: ELEVENTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length,
  reviewedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  separateAdjustmentPlanRequired: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationEleventhCorrectedDraftStructuralReview(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const findingKeys = new Set(ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.map((item) => item.key));
  const matrixKeys = new Set(ELEVENTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.flatMap((phase) => phase.findingKeys));
  const checks = [
    ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length === 10,
    findingKeys.size === 10,
    matrixKeys.size === 10,
    [...findingKeys].every((key) => matrixKeys.has(key)),
    criticalCount === 6,
    highCount === 4,
    ELEVENTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.length === 10,
    acceptanceTests === 50,
    ELEVENTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.reviewedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.separateAdjustmentPlanRequired === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;
  return { ok: checks.every(Boolean), checks };
}
