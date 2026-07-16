export type SixthCorrectedDraftStructuralSeverity = "critical" | "high";

export type SixthCorrectedDraftStructuralFinding = {
  key: string;
  severity: SixthCorrectedDraftStructuralSeverity;
  status: "required";
  title: string;
  evidence: string;
  requiredCorrection: string;
};

export type SixthCorrectedDraftRemediationPhase = {
  phase: string;
  name: string;
  findingKeys: readonly string[];
  acceptanceTests: number;
};

export const SIXTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS = [
  {
    key: "retention_dimension_ddl_is_redeclared",
    severity: "critical",
    status: "required",
    title: "O DDL cumulativo de dimensões de retenção é redeclarado",
    evidence: "A seção 23 remove o índice ativo v490 e adiciona policy_purpose, jurisdiction_code e evidence_class. A seção 40 tenta remover o mesmo índice e adicionar as mesmas colunas novamente, sem IF EXISTS, interrompendo a execução antes das correções recentes.",
    requiredCorrection: "Gerar o próximo rascunho como DDL normalizado, com cada índice, coluna e constraint alterado exatamente uma vez, e adicionar self-test de duplicidade estrutural.",
  },
  {
    key: "retention_dimension_constraints_are_mutually_incompatible",
    severity: "critical",
    status: "required",
    title: "As constraints dimensionais antigas e novas são incompatíveis",
    evidence: "A constraint v496 exige policy_purpose event_ticket_tracking e classes clubber, redirect, trusted ou admin. A camada v4.8.104 grava commercial_governance, security_audit, operation_receipt e commercial_audit sem remover a constraint anterior.",
    requiredCorrection: "Remover a constraint v496, reconciliar os dados e instalar um único contrato dimensional final antes de NOT NULL e unicidade ativa.",
  },
  {
    key: "credential_context_receipt_scope_and_target_are_not_allowed",
    severity: "critical",
    status: "required",
    title: "Escopo e alvo de recibos de contexto não são permitidos",
    evidence: "As RPCs v2 usam operation_scope credential_context_mutation e target_type credential_context, mas as constraints finais de event_ticket_operation_receipts não contêm esses valores.",
    requiredCorrection: "Atualizar as constraints finais antes das RPCs dependentes e rejeitar qualquer escopo ou alvo não enumerado.",
  },
  {
    key: "credential_context_issuance_retry_uses_random_result_identity",
    severity: "critical",
    status: "required",
    title: "O retry de emissão usa uma identidade aleatória diferente",
    evidence: "mhidas_ticket_issue_verified_credential_context_v2 gera v_context_id com gen_random_uuid antes da reserva e usa o UUID como target e result. O retry encontra o recibo anterior com outro UUID e falha na validação semântica.",
    requiredCorrection: "Consultar o recibo antes de gerar identidade ou derivar UUID determinístico da chave semântica, retornando exatamente o mesmo contexto em replay.",
  },
  {
    key: "receipt_semantic_uniqueness_omits_principal_namespace",
    severity: "high",
    status: "required",
    title: "A unicidade semântica do recibo omite o namespace técnico",
    evidence: "O índice único usa principal_type, principal_id, operation_name e idempotency_key, mas omite principal_namespace. Service roles de integrações diferentes colidem quando reutilizam a mesma chave.",
    requiredCorrection: "Incluir namespace normalizado ou integration_id na autoridade de idempotência e reconciliar colisões existentes.",
  },
  {
    key: "retention_minimization_rules_are_never_materialized",
    severity: "critical",
    status: "required",
    title: "As regras de minimização nunca são materializadas",
    evidence: "A tabela event_ticket_retention_minimization_rules é criada, mas não recebe INSERT. O batch v3 exige v_rule_count maior que zero e sempre lança RETENTION_MINIMIZATION_RULES_REQUIRED.",
    requiredCorrection: "Materializar uma matriz fechada por policy e evidence class, validar cobertura obrigatória e impedir policy ativa sem regras mínimas.",
  },
  {
    key: "retention_batch_uses_one_policy_id_for_receipts_and_audits",
    severity: "critical",
    status: "required",
    title: "O batch de retenção usa uma única policy para duas classes",
    evidence: "Recibos usam operation_receipt e auditorias usam commercial_audit, porém o batch v3 filtra ambas as tabelas pelo mesmo p_retention_policy_version_id. Uma classe fica fora do processamento.",
    requiredCorrection: "Resolver e persistir IDs separados para receipt e audit, aplicando cada matriz somente à evidence class correspondente.",
  },
  {
    key: "failed_receipt_state_is_rolled_back_on_reraise",
    severity: "high",
    status: "required",
    title: "O estado failed do recibo é desfeito pelo re-raise",
    evidence: "O writer v7 e o batch v3 marcam o recibo como failed dentro do bloco EXCEPTION e executam RAISE. O aborto da transação desfaz também o UPDATE de falha.",
    requiredCorrection: "Usar envelope transacional que preserve o estado terminal, retorno controlado sem re-raise ou persistência externa confiável.",
  },
  {
    key: "admin_lifecycle_replay_checks_mutated_state_before_receipt",
    severity: "high",
    status: "required",
    title: "O replay administrativo valida estado mutável antes do recibo",
    evidence: "Partner status v3 e retention retire v3 verificam lock e status atuais antes da autoridade de idempotência e incluem previous_status no request hash. O mesmo retry falha após o primeiro sucesso; a revogação de contexto repete o padrão.",
    requiredCorrection: "Consultar o recibo antes de locks e estados mutáveis, persistir snapshot do resultado e devolvê-lo em replay.",
  },
  {
    key: "credential_context_consumption_receipt_is_not_semantically_bound",
    severity: "high",
    status: "required",
    title: "O consumo do contexto não valida semanticamente o recibo",
    evidence: "mhidas_ticket_consume_verified_credential_context_v3 aceita p_receipt_id sem verificar operação, target, integração, credencial, status pending ou ownership. A FK isolada garante apenas existência.",
    requiredCorrection: "Bloquear e validar o recibo antes do consumo, exigindo o par integration e credential, operação esperada, target correto e reserva pendente pertencente ao writer.",
  },
] as const satisfies readonly SixthCorrectedDraftStructuralFinding[];

export const SIXTH_CORRECTED_DRAFT_REMEDIATION_MATRIX = [
  { phase: "R1", name: "normalized_retention_ddl", findingKeys: ["retention_dimension_ddl_is_redeclared"], acceptanceTests: 5 },
  { phase: "R2", name: "single_retention_dimension_contract", findingKeys: ["retention_dimension_constraints_are_mutually_incompatible"], acceptanceTests: 5 },
  { phase: "R3", name: "credential_context_receipt_enums", findingKeys: ["credential_context_receipt_scope_and_target_are_not_allowed"], acceptanceTests: 5 },
  { phase: "R4", name: "deterministic_context_issuance_replay", findingKeys: ["credential_context_issuance_retry_uses_random_result_identity"], acceptanceTests: 5 },
  { phase: "R5", name: "tenant_bound_receipt_uniqueness", findingKeys: ["receipt_semantic_uniqueness_omits_principal_namespace"], acceptanceTests: 5 },
  { phase: "R6", name: "materialized_minimization_matrix", findingKeys: ["retention_minimization_rules_are_never_materialized"], acceptanceTests: 5 },
  { phase: "R7", name: "evidence_class_retention_batch", findingKeys: ["retention_batch_uses_one_policy_id_for_receipts_and_audits"], acceptanceTests: 5 },
  { phase: "R8", name: "durable_receipt_failure_semantics", findingKeys: ["failed_receipt_state_is_rolled_back_on_reraise"], acceptanceTests: 5 },
  { phase: "R9", name: "receipt_first_admin_replay", findingKeys: ["admin_lifecycle_replay_checks_mutated_state_before_receipt"], acceptanceTests: 5 },
  { phase: "R10", name: "semantic_context_consumption_binding", findingKeys: ["credential_context_consumption_receipt_is_not_semantically_bound"], acceptanceTests: 5 },
] as const satisfies readonly SixthCorrectedDraftRemediationPhase[];

export const SIXTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES = [
  "fresh_production_schema_inventory",
  "admin_authorization_contract",
  "credential_context_verification_service",
  "commercial_financial_semantics",
  "provider_namespace_and_credentials_registry",
  "legal_retention_and_anonymization",
  "parallel_concurrency_and_failure_tests",
  "production_backup_and_rollback_plan",
  "performance_and_volume_tests",
  "independent_review_of_next_sql",
] as const;

const criticalCount = SIXTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "critical",
).length;

const highCount = SIXTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "high",
).length;

const acceptanceTests = SIXTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.reduce(
  (total, phase) => total + phase.acceptanceTests,
  0,
);

export const EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW = {
  version: "v4.8.107-event-ticket-commercial-migration-sixth-corrected-adjusted-draft-structural-review-safe",
  baseVersion: "v4.8.106-event-ticket-commercial-migration-sixth-corrected-adjusted-draft-safe",
  baseCommit: "f210c2451fa6b35d929fd90c56e909384c418bde",
  decision: "needs_adjustment_with_remediation_matrix",
  findings: SIXTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS,
  remediationMatrix: SIXTH_CORRECTED_DRAFT_REMEDIATION_MATRIX,
  requiredAdjustments: SIXTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length,
  criticalCount,
  highCount,
  acceptanceTests,
  externalPrerequisites: SIXTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length,
  reviewedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  separateAdjustmentPlanRequired: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationSixthCorrectedDraftStructuralReview(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const findingKeys = new Set(
    SIXTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.map((item) => item.key),
  );
  const matrixKeys = new Set(
    SIXTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.flatMap((phase) => phase.findingKeys),
  );

  const checks = [
    SIXTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length === 10,
    findingKeys.size === 10,
    matrixKeys.size === 10,
    [...findingKeys].every((key) => matrixKeys.has(key)),
    criticalCount === 6,
    highCount === 4,
    SIXTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.length === 10,
    acceptanceTests === 50,
    SIXTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.reviewedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.separateAdjustmentPlanRequired === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;

  return { ok: checks.every(Boolean), checks };
}
