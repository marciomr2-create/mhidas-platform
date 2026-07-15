export type FifthCorrectedDraftStructuralSeverity = "critical" | "high";

export type FifthCorrectedDraftStructuralFinding = {
  key: string;
  severity: FifthCorrectedDraftStructuralSeverity;
  status: "required";
  title: string;
  evidence: string;
  requiredCorrection: string;
};

export type FifthCorrectedDraftRemediationPhase = {
  phase: string;
  name: string;
  findingKeys: readonly string[];
  acceptanceTests: number;
};

export const FIFTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS = [
  {
    key: "credential_bound_receipt_insert_violates_pair_presence",
    severity: "critical",
    status: "required",
    title: "Reserva vinculada à credencial viola a própria integridade composta",
    evidence: "A v4.8.104 adiciona integration_id aos recibos e exige que integration_id e credential_version_id estejam ambos nulos ou ambos preenchidos. Porém mhidas_ticket_reserve_operation_receipt_v4 insere credential_version_id sem integration_id, e o sinal v6 tenta preencher integration_id somente depois da reserva. A inserção falha antes do UPDATE.",
    requiredCorrection: "Criar reserva v5 recebendo integration_id e inserindo o par atomicamente; validar a FK composta no próprio INSERT e remover o UPDATE posterior.",
  },
  {
    key: "class_specific_retention_policies_not_seeded",
    severity: "critical",
    status: "required",
    title: "Triggers de recibo e auditoria não possuem policies ativas resolvíveis",
    evidence: "As policies existentes são convertidas para evidence_class=default. Os novos triggers exigem exatamente operation_receipt e commercial_audit por SELECT INTO STRICT, mas o SQL não cria nem reconcilia essas duas policies ativas. A primeira gravação de recibo ou auditoria falha.",
    requiredCorrection: "Adicionar backfill determinístico e fail-closed para policies de receipt/audit; validar unicidade dimensional e bloquear instalação se os contratos não puderem ser reconciliados.",
  },
  {
    key: "new_security_definer_functions_keep_public_execute",
    severity: "critical",
    status: "required",
    title: "Novas funções SECURITY DEFINER permanecem executáveis por PUBLIC",
    evidence: "As funções novas da camada v4.8.104 não recebem REVOKE ALL explícito. PostgreSQL concede EXECUTE a PUBLIC por padrão; helpers como consume context v2, cascade audit v3, fail receipt v2 e classify receipt v2 também não possuem verificação interna suficiente.",
    requiredCorrection: "Revogar PUBLIC/anon/authenticated em todas as funções internas; conceder somente aos papéis necessários e repetir autorização dentro de cada boundary SECURITY DEFINER.",
  },
  {
    key: "trusted_signal_v6_nests_legacy_receipt_and_audit_path",
    severity: "critical",
    status: "required",
    title: "Sinal v6 divide a atomicidade entre recibo novo e caminho legado",
    evidence: "mhidas_record_event_ticket_purchase_signal_v6 reserva um recibo v4 e consome a credencial, mas chama mhidas_record_event_ticket_purchase_signal_v4. A função v4 cria outro recibo v3, completa pelo contrato v1 e grava audit v1. O lineage de credencial fica separado e a idempotência deixa de ser uma única autoridade transacional.",
    requiredCorrection: "Criar writer v7 completo que grave o sinal diretamente sob um único recibo credential-bound, complete uma única state machine e escreva audit v3 com receipt/integration/credential lineage.",
  },
  {
    key: "credential_context_lifecycle_has_no_receipt_or_audit_lineage",
    severity: "high",
    status: "required",
    title: "Emissão, revogação, expiração e consumo de contexto não são auditadas",
    evidence: "As RPCs de contexto alteram estado crítico, porém não criam operation receipt, retention run ou audit row. O target_type de auditoria também não contempla credential_context.",
    requiredCorrection: "Adicionar target type e writer específicos; registrar emissão, consumo, revogação e expiração com receipt, integration_id, credential_version_id, evidence hash e correlação.",
  },
  {
    key: "credential_context_issuance_retry_is_not_idempotent",
    severity: "high",
    status: "required",
    title: "Retry de emissão pode revogar o próprio resultado ou colidir no nonce",
    evidence: "A emissão revoga contextos issued com o mesmo issuance_request_hash e depois insere outro. Um retry com o mesmo nonce colide no índice único; com nonce diferente cria nova emissão sem replay determinístico. Não existe idempotency_key nem resultado durável.",
    requiredCorrection: "Criar emissão v2 com receipt/reservation, chave semântica por integration+credential+request+nonce e retorno idempotente do mesmo contexto já emitido.",
  },
  {
    key: "retention_minimization_rules_are_declarative_only",
    severity: "high",
    status: "required",
    title: "Matriz de minimização é criada, mas nunca executada",
    evidence: "event_ticket_retention_minimization_rules aparece apenas na definição da tabela. O batch v2 mantém uma lista hardcoded de campos e ignora minimization_action, stable_hash_namespace e preserve_for_legal_hold.",
    requiredCorrection: "Validar e materializar regras permitidas por classe; executar uma matriz fechada server-side ou remover a tabela declarativa para evitar falsa governança.",
  },
  {
    key: "governance_retention_batch_v2_lacks_durable_run_and_idempotency",
    severity: "high",
    status: "required",
    title: "Batch de governança não registra execução durável nem replay",
    evidence: "mhidas_run_event_ticket_governance_retention_batch_v2 recebe correlation_id e idempotency_key, mas apenas devolve seus hashes em JSON. Não cria event_ticket_retention_runs, operation receipt ou audit row, nem oferece replay determinístico para concorrência/retry.",
    requiredCorrection: "Criar batch v3 com reserva atômica, retention_run persistente, contagens por policy/evidence class, terminal receipt e auditoria do resultado.",
  },
  {
    key: "cascade_audit_replacements_are_missing",
    severity: "high",
    status: "required",
    title: "RPCs administrativas antigas são revogadas sem substitutos funcionais",
    evidence: "A v4.8.104 revoga partner status v2 e retention policy retire v2 de todos os papéis, mas apenas define mhidas_ticket_write_cascade_audit_v3 e um comentário. Não existem novas RPCs administrativas que executem a mutação e chamem o writer v3.",
    requiredCorrection: "Criar substitutos v3 completos antes de revogar os contratos anteriores; preservar lock_version, receipt lineage, auditoria por objeto e grants explícitos.",
  }
] as const satisfies readonly FifthCorrectedDraftStructuralFinding[];

export const FIFTH_CORRECTED_DRAFT_REMEDIATION_MATRIX = [
  {
    phase: "R1",
    name: "credential_bound_receipt_insert_violates_pair_presence",
    findingKeys: ["credential_bound_receipt_insert_violates_pair_presence"],
    acceptanceTests: 5,
  },
  {
    phase: "R2",
    name: "class_specific_retention_policies_not_seeded",
    findingKeys: ["class_specific_retention_policies_not_seeded"],
    acceptanceTests: 5,
  },
  {
    phase: "R3",
    name: "new_security_definer_functions_keep_public_execute",
    findingKeys: ["new_security_definer_functions_keep_public_execute"],
    acceptanceTests: 5,
  },
  {
    phase: "R4",
    name: "trusted_signal_v6_nests_legacy_receipt_and_audit_path",
    findingKeys: ["trusted_signal_v6_nests_legacy_receipt_and_audit_path"],
    acceptanceTests: 5,
  },
  {
    phase: "R5",
    name: "credential_context_lifecycle_has_no_receipt_or_audit_lineage",
    findingKeys: ["credential_context_lifecycle_has_no_receipt_or_audit_lineage"],
    acceptanceTests: 5,
  },
  {
    phase: "R6",
    name: "credential_context_issuance_retry_is_not_idempotent",
    findingKeys: ["credential_context_issuance_retry_is_not_idempotent"],
    acceptanceTests: 5,
  },
  {
    phase: "R7",
    name: "retention_minimization_rules_are_declarative_only",
    findingKeys: ["retention_minimization_rules_are_declarative_only"],
    acceptanceTests: 5,
  },
  {
    phase: "R8",
    name: "governance_retention_batch_v2_lacks_durable_run_and_idempotency",
    findingKeys: ["governance_retention_batch_v2_lacks_durable_run_and_idempotency"],
    acceptanceTests: 5,
  },
  {
    phase: "R9",
    name: "cascade_audit_replacements_are_missing",
    findingKeys: ["cascade_audit_replacements_are_missing"],
    acceptanceTests: 5,
  }
] as const satisfies readonly FifthCorrectedDraftRemediationPhase[];

export const FIFTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES = [
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

const criticalCount = FIFTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "critical",
).length;

const highCount = FIFTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "high",
).length;

const acceptanceTests = FIFTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.reduce(
  (total, phase) => total + phase.acceptanceTests,
  0,
);

export const EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW = {
  version: "v4.8.105-event-ticket-commercial-migration-fifth-corrected-adjusted-draft-structural-review-safe",
  baseVersion: "v4.8.104-event-ticket-commercial-migration-fifth-corrected-adjusted-draft-safe",
  baseCommit: "cc81223a701cfa3dfee5bbafcd2731807f721ef1",
  decision: "needs_adjustment_with_remediation_matrix",
  findings: FIFTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS,
  remediationMatrix: FIFTH_CORRECTED_DRAFT_REMEDIATION_MATRIX,
  requiredAdjustments: FIFTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length,
  criticalCount,
  highCount,
  acceptanceTests,
  externalPrerequisites: FIFTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length,
  reviewedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  separateAdjustmentPlanRequired: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationFifthCorrectedDraftStructuralReview(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const findingKeys = new Set(
    FIFTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.map((item) => item.key),
  );
  const matrixKeys = new Set(
    FIFTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.flatMap((phase) => phase.findingKeys),
  );

  const checks = [
    FIFTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length === 9,
    findingKeys.size === 9,
    matrixKeys.size === 9,
    [...findingKeys].every((key) => matrixKeys.has(key)),
    criticalCount === 4,
    highCount === 5,
    FIFTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.length === 9,
    acceptanceTests === 45,
    FIFTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.reviewedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.separateAdjustmentPlanRequired === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;

  return { ok: checks.every(Boolean), checks };
}
