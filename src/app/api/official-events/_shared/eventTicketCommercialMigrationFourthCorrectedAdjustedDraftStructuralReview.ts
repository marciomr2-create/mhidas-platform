export type FourthCorrectedDraftStructuralSeverity = "critical" | "high";

export type FourthCorrectedDraftStructuralFinding = {
  key: string;
  severity: FourthCorrectedDraftStructuralSeverity;
  status: "required";
  title: string;
  evidence: string;
  requiredCorrection: string;
};

export type FourthCorrectedDraftRemediationPhase = {
  phase: string;
  name: string;
  findingKeys: readonly string[];
  acceptanceTests: number;
};

export const FOURTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS = [
  {
    key: "retention_policy_resolution_and_batch_scope_not_bound",
    severity: "critical",
    status: "required",
    title: "Resolução e execução de retenção não estão vinculadas à policy correta",
    evidence: "O trigger escolhe qualquer policy ativa sem dimensões determinísticas e usa signal_retention_days para recibos e auditorias. O batch recebe uma policy, mas não filtra os candidatos por retention_policy_version_id.",
    requiredCorrection: "Criar policies específicas para receipt/audit; resolver por purpose, jurisdiction e evidence class com unicidade; filtrar ambos os lotes pela policy recebida e registrar contagens por classe.",
  },
  {
    key: "verified_credential_context_issuance_authority_missing",
    severity: "critical",
    status: "required",
    title: "Contexto de credencial é consumido, mas não possui autoridade de emissão",
    evidence: "A tabela de contextos existe e há RPC de consumo, porém o SQL não contém caminho controlado de INSERT, validação criptográfica de emissão, revogação ou expiração server-side.",
    requiredCorrection: "Adicionar RPC service_role de emissão com verificador, nonce e request hash; revogar contextos antigos; expirar contextos por batch; auditar emissão, consumo e revogação.",
  },
  {
    key: "current_credential_cross_integration_integrity_missing",
    severity: "critical",
    status: "required",
    title: "Credencial atual não possui integridade composta com a integração",
    evidence: "current_credential_version_id referencia somente credential_version_id. O banco não impede uma integração de apontar para uma credencial pertencente a outra integração.",
    requiredCorrection: "Adicionar unicidade composta (integration_id, credential_version_id) e FK composta; validar no trigger e no preflight; testar tentativa cross-integration.",
  },
  {
    key: "purchase_signal_replay_not_credential_bound_before_reservation",
    severity: "critical",
    status: "required",
    title: "Replay de sinal confiável pode retornar antes de validar a credencial apresentada",
    evidence: "A reserva v4 é criada com credential_version_id e verifier_evidence_hash nulos. Em replay completed, a função retorna o sinal antes de consumir ou validar o novo contexto.",
    requiredCorrection: "Resolver e bloquear o contexto antes da reserva, incluir credential_version_id e verifier hash na chave semântica, e somente permitir replay para a mesma credencial e assinatura.",
  },
  {
    key: "cascade_audit_lineage_uses_legacy_writer",
    severity: "high",
    status: "required",
    title: "Cascatas administrativas ainda gravam auditoria sem lineage do recibo",
    evidence: "As cascatas de parceiro e retenção usam mhidas_ticket_write_audit_v1, não vinculando receipt_id, parent target, target hash e evidência de credencial.",
    requiredCorrection: "Migrar todas as cascatas para audit v2; vincular cada objeto ao recibo pai; adicionar preflight que proíba audit v1 nos novos RPCs.",
  },
  {
    key: "admin_signal_read_hash_not_same_snapshot_as_result",
    severity: "high",
    status: "required",
    title: "Hash da leitura administrativa pode não representar as linhas retornadas",
    evidence: "A função calcula count/hash em um SELECT e retorna linhas em outro SELECT. Em READ COMMITTED, os comandos podem observar snapshots diferentes.",
    requiredCorrection: "Materializar o conjunto uma única vez em tabela temporária/CTE persistida na função; calcular hash e retornar exatamente o mesmo conjunto; incluir ordenação canônica.",
  },
  {
    key: "retention_anonymization_minimization_incomplete",
    severity: "high",
    status: "required",
    title: "Anonimização mantém identificadores operacionais correlacionáveis",
    evidence: "O batch limpa principal_id e snapshots, mas preserva idempotency_key, target_id, correlation_id e outros vínculos capazes de reidentificação operacional.",
    requiredCorrection: "Definir matriz de campos por classe; substituir chaves brutas por hashes estáveis quando permitido; preservar somente lineage legal mínimo e testar não reidentificação.",
  },
  {
    key: "operation_receipt_failure_and_pending_replay_contract_incomplete",
    severity: "high",
    status: "required",
    title: "Estado terminal de recibos não é totalmente idempotente",
    evidence: "mhidas_ticket_fail_operation_receipt_v1 exige pending e usa RETURNING INTO STRICT. Repetição de falha ou corrida com completion gera erro não classificado; alguns chamadores tratam qualquer replay não owner de forma inconsistente.",
    requiredCorrection: "Criar fail v2 idempotente; distinguir pending/completed/failed em todos os chamadores; registrar failure hash consistente e definir recuperação controlada.",
  }
] as const satisfies readonly FourthCorrectedDraftStructuralFinding[];

export const FOURTH_CORRECTED_DRAFT_REMEDIATION_MATRIX = [
  {
    phase: "R1",
    name: "retention_contract_v2",
    findingKeys: ["retention_policy_resolution_and_batch_scope_not_bound"],
    acceptanceTests: 5,
  },
  {
    phase: "R2",
    name: "credential_context_issuance_and_revocation",
    findingKeys: ["verified_credential_context_issuance_authority_missing"],
    acceptanceTests: 5,
  },
  {
    phase: "R3",
    name: "composite_credential_integrity",
    findingKeys: ["current_credential_cross_integration_integrity_missing"],
    acceptanceTests: 5,
  },
  {
    phase: "R4",
    name: "credential_bound_signal_idempotency",
    findingKeys: ["purchase_signal_replay_not_credential_bound_before_reservation"],
    acceptanceTests: 5,
  },
  {
    phase: "R5",
    name: "receipt_linked_cascade_audit",
    findingKeys: ["cascade_audit_lineage_uses_legacy_writer"],
    acceptanceTests: 5,
  },
  {
    phase: "R6",
    name: "single_snapshot_admin_read",
    findingKeys: ["admin_signal_read_hash_not_same_snapshot_as_result"],
    acceptanceTests: 5,
  },
  {
    phase: "R7",
    name: "data_minimization_retention_matrix",
    findingKeys: ["retention_anonymization_minimization_incomplete"],
    acceptanceTests: 5,
  },
  {
    phase: "R8",
    name: "terminal_receipt_state_machine_v2",
    findingKeys: ["operation_receipt_failure_and_pending_replay_contract_incomplete"],
    acceptanceTests: 5,
  }
] as const satisfies readonly FourthCorrectedDraftRemediationPhase[];

export const FOURTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES = [
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

const criticalCount = FOURTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "critical",
).length;

const highCount = FOURTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "high",
).length;

const acceptanceTests = FOURTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.reduce(
  (total, phase) => total + phase.acceptanceTests,
  0,
);

export const EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW = {
  version: "v4.8.103-event-ticket-commercial-migration-fourth-corrected-adjusted-draft-structural-review-safe",
  baseVersion: "v4.8.102-event-ticket-commercial-migration-fourth-corrected-adjusted-draft-safe",
  baseCommit: "4b8fe9a3a312e12c0cf3f08e0432544a2d3aeb8b",
  decision: "needs_adjustment_with_remediation_matrix",
  findings: FOURTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS,
  remediationMatrix: FOURTH_CORRECTED_DRAFT_REMEDIATION_MATRIX,
  requiredAdjustments: FOURTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length,
  criticalCount,
  highCount,
  acceptanceTests,
  externalPrerequisites: FOURTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length,
  reviewedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  separateAdjustmentPlanRequired: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationFourthCorrectedDraftStructuralReview(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const findingKeys = new Set(
    FOURTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.map((item) => item.key),
  );
  const matrixKeys = new Set(
    FOURTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.flatMap((phase) => phase.findingKeys),
  );

  const checks = [
    FOURTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length === 8,
    findingKeys.size === 8,
    matrixKeys.size === 8,
    [...findingKeys].every((key) => matrixKeys.has(key)),
    criticalCount === 4,
    highCount === 4,
    FOURTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.length === 8,
    acceptanceTests === 40,
    FOURTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.reviewedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.separateAdjustmentPlanRequired === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;

  return { ok: checks.every(Boolean), checks };
}
