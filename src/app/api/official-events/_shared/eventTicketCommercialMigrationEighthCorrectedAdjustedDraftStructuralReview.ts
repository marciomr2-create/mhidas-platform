export type EighthCorrectedDraftStructuralSeverity = "critical" | "high";

export type EighthCorrectedDraftStructuralFinding = {
  key: string;
  severity: EighthCorrectedDraftStructuralSeverity;
  status: "required";
  title: string;
  evidence: string;
  requiredCorrection: string;
};

export type EighthCorrectedDraftRemediationPhase = {
  phase: string;
  name: string;
  findingKeys: readonly string[];
  acceptanceTests: number;
};

export const EIGHTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS = [
  {
    key: "stable_retention_policy_resolver_attempts_row_lock",
    severity: "critical",
    status: "required",
    title: "O resolvedor de policy de retenção tenta bloquear linhas dentro de uma função STABLE",
    evidence: "`mhidas_ticket_resolve_active_retention_policy_v1` é declarada `STABLE`, mas executa `SELECT ... FOR SHARE`. Funções STABLE rodam com semântica somente leitura; o contrato de bloqueio não é compatível com essa classificação e pode impedir a resolução operacional das policies.",
    requiredCorrection: "Reclassificar o resolvedor como `VOLATILE` ou remover o bloqueio, definir a estratégia concorrente de leitura/ativação e executar teste PostgreSQL real que prove resolução, rotação e concorrência de policy.",
  },
  {
    key: "verified_credential_context_is_not_cryptographically_bound",
    severity: "critical",
    status: "required",
    title: "O contexto verificado pode ser emitido e consumido sem prova criptográfica vinculante",
    evidence: "A emissão aceita hashes fornecidos pelo `service_role`, não compara `p_issued_by_verifier_key_hash` com `verifier_key_hash` da credencial corrente e não inclui `p_issuer_service_key` nem a identidade do verificador no hash semântico do pedido. O consumo recebe apenas `context_id`; `context_token_hash` e a assinatura do pedido não são reapresentados nem verificados.",
    requiredCorrection: "Criar boundary de verificação criptográfica com chave corrente, assinatura, audience, nonce e operação vinculados; incluir todos os campos no request hash e exigir token/prova de posse no consumo único do contexto.",
  },
  {
    key: "commercial_channel_activation_is_not_authorization_bound",
    severity: "critical",
    status: "required",
    title: "Um canal pode ficar ativo sem comprovar autorização comercial e request correspondente",
    evidence: "`request_id` é apenas uma FK simples e não é vinculado ao mesmo parceiro/evento. A constraint de canal ativo exige somente `url_validation_status = validated`; não exige request aprovado, administrador autorizador, timestamps de autorização/ativação, modelo financeiro coerente ou scope ativo. O resolver público também não consulta o request nem esses campos.",
    requiredCorrection: "Implementar RPC única de autorização/ativação com máquina de estados, FK/constraint semântica para request+partner+event, evidência administrativa e financeira obrigatória, snapshot de lifecycle e auditoria atômica.",
  },
  {
    key: "retention_execution_omits_sensitive_evidence_families",
    severity: "critical",
    status: "required",
    title: "A execução de retenção não alcança sinais, cliques, contextos ou comunicações",
    evidence: "As 17 regras materializadas cobrem somente `event_ticket_operation_receipts` e `event_ticket_commercial_audit_log`. O batch atualiza apenas essas duas tabelas. A policy `trusted_signal` é resolvida na gravação, mas não existe execução de tombstone/minimização para purchase signals, click attributions, verified credential contexts, communications ou backfill rejections.",
    requiredCorrection: "Criar matriz completa por família de evidência e executor fail-closed para cada tabela, com checkpoints, contagens, tombstone/anonymize/delete conforme policy, integridade referencial e testes de recuperação.",
  },
  {
    key: "receipt_minimization_preserves_raw_result_identity",
    severity: "critical",
    status: "required",
    title: "A minimização do recibo mantém o identificador original em `result_id`",
    evidence: "O recibo nasce com `result_id = target_id`. O batch substitui `target_id`, mas não altera `result_id`; a matriz de 17 regras também omite esse campo. O identificador bruto continua diretamente disponível e ainda pode ser correlacionado por `receipt_id` no audit log.",
    requiredCorrection: "Incluir `result_id` e toda coluna de vínculo na matriz, separar resultado operacional de identidade minimizada, substituir o valor de forma consistente e validar que nenhuma relação reidentificável permaneça após o batch.",
  },
  {
    key: "json_minimization_is_shallow_and_bypassable",
    severity: "critical",
    status: "required",
    title: "A validação de JSON usa blacklist superficial e permite dados sensíveis aninhados",
    evidence: "`mhidas_ticket_json_object_is_minimized_v1` verifica somente chaves do primeiro nível com `?|`, de forma sensível a caixa. Estruturas como `{\"safe\":{\"email\":\"...\"}}`, chaves alternativas ou valores brutos sob nomes permitidos passam pelas constraints de metadata e snapshots.",
    requiredCorrection: "Substituir blacklist genérica por schemas allowlist específicos por objeto, inspeção recursiva, limites de tamanho/profundidade e validação de valores; recusar qualquer payload fora do contrato.",
  },
  {
    key: "active_integration_credential_invariants_are_not_schema_closed",
    severity: "high",
    status: "required",
    title: "Integração ativa e credencial corrente ainda podem entrar em estado inválido",
    evidence: "A constraint da integração ativa exige apenas `partner_id`, permitindo `current_credential_version_id` nulo. Não existe índice parcial que impeça múltiplas credenciais `active` por integração. O self-check ignora integrações ativas sem ponteiro e não verifica validade temporal da credencial corrente.",
    requiredCorrection: "Fechar invariantes com constraints/trigger diferível ou RPC exclusiva, unicidade parcial da credencial ativa e self-check que detecte ponteiro nulo, status divergente, validade expirada e múltiplas versões ativas.",
  },
  {
    key: "purchase_signal_lifecycle_and_supersession_are_inconsistent",
    severity: "high",
    status: "required",
    title: "A unicidade de transação conflita com a evolução attributed→confirmed e a supersessão não é vinculada",
    evidence: "O índice único `(integration_id, external_transaction_hash)` cobre simultaneamente `attributed_conversion` e `confirmed_conversion`, impedindo registrar os dois estágios para a mesma transação. `supersedes_signal_id` é FK simples, sem vínculo de evento, integração ou transação, e a RPC não implementa correção/supersessão atômica.",
    requiredCorrection: "Definir modelo explícito de evento ou estado de conversão, permitir progressão idempotente controlada, vincular supersessão por constraints compostas e atualizar o sinal anterior de forma auditada e concorrente.",
  },
  {
    key: "url_proof_and_official_fallback_are_not_authority_bound",
    severity: "high",
    status: "required",
    title: "A prova de URL e o fallback oficial ainda dependem de artefatos não autenticados",
    evidence: "O freshness helper apenas testa formato e timestamps de hashes independentes; não há assinatura/manifesto que vincule URL, hostname, resolução, redirects e versão do validador. A validação de hostname é textual e o fallback aceita qualquer `source_url` com prefixo HTTPS, sem autoridade da fonte, frescor máximo ou política de domínio comercial.",
    requiredCorrection: "Persistir atestado assinado e versionado do validador, validar resolução/IP e redirects no boundary seguro, exigir fonte oficial autorizada e fresca no fallback e aplicar allowlist/denylist comercial fail-closed.",
  },
  {
    key: "preflight_does_not_reject_legacy_security_bypass_objects",
    severity: "high",
    status: "required",
    title: "O preflight não inventaria RPCs antigas, policies e grants que podem contornar o novo boundary",
    evidence: "O preflight rejeita apenas as assinaturas finais listadas e as tabelas-alvo. Ele não procura famílias anteriores de funções `mhidas_ticket_*`, policies, grants, triggers ou índices conflitantes. Uma RPC antiga ainda executável pode coexistir e ignorar os controles da v4.8.110.",
    requiredCorrection: "Gerar inventário fechado de objetos por prefixo e assinatura, abortar diante de qualquer versão legada ou grant inesperado e incluir plano explícito de revoke/drop/migração antes da promoção.",
  },
] as const satisfies readonly EighthCorrectedDraftStructuralFinding[];

export const EIGHTH_CORRECTED_DRAFT_REMEDIATION_MATRIX = [
  { phase: "R1", name: "stable_retention_policy_resolver_attempts_row_lock", findingKeys: ["stable_retention_policy_resolver_attempts_row_lock"], acceptanceTests: 5 },
  { phase: "R2", name: "verified_credential_context_is_not_cryptographically_bound", findingKeys: ["verified_credential_context_is_not_cryptographically_bound"], acceptanceTests: 5 },
  { phase: "R3", name: "commercial_channel_activation_is_not_authorization_bound", findingKeys: ["commercial_channel_activation_is_not_authorization_bound"], acceptanceTests: 5 },
  { phase: "R4", name: "retention_execution_omits_sensitive_evidence_families", findingKeys: ["retention_execution_omits_sensitive_evidence_families"], acceptanceTests: 5 },
  { phase: "R5", name: "receipt_minimization_preserves_raw_result_identity", findingKeys: ["receipt_minimization_preserves_raw_result_identity"], acceptanceTests: 5 },
  { phase: "R6", name: "json_minimization_is_shallow_and_bypassable", findingKeys: ["json_minimization_is_shallow_and_bypassable"], acceptanceTests: 5 },
  { phase: "R7", name: "active_integration_credential_invariants_are_not_schema_closed", findingKeys: ["active_integration_credential_invariants_are_not_schema_closed"], acceptanceTests: 5 },
  { phase: "R8", name: "purchase_signal_lifecycle_and_supersession_are_inconsistent", findingKeys: ["purchase_signal_lifecycle_and_supersession_are_inconsistent"], acceptanceTests: 5 },
  { phase: "R9", name: "url_proof_and_official_fallback_are_not_authority_bound", findingKeys: ["url_proof_and_official_fallback_are_not_authority_bound"], acceptanceTests: 5 },
  { phase: "R10", name: "preflight_does_not_reject_legacy_security_bypass_objects", findingKeys: ["preflight_does_not_reject_legacy_security_bypass_objects"], acceptanceTests: 5 },
] as const satisfies readonly EighthCorrectedDraftRemediationPhase[];

export const EIGHTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES = [
  "fresh_complete_production_schema_inventory",
  "admin_authorization_contract",
  "cryptographic_credential_verification_and_rotation_service",
  "commercial_domain_redirect_and_official_source_policy",
  "commercial_financial_semantics",
  "legal_retention_anonymization_and_tombstone_by_evidence",
  "postgres_concurrency_idempotency_and_failure_tests",
  "production_backup_and_rollback_plan",
  "performance_and_volume_tests",
  "independent_review_of_next_sql",
] as const;

const criticalCount = EIGHTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "critical",
).length;

const highCount = EIGHTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "high",
).length;

const acceptanceTests = EIGHTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.reduce(
  (total, phase) => total + phase.acceptanceTests,
  0,
);

export const EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW = {
  version: "v4.8.111-event-ticket-commercial-migration-eighth-corrected-adjusted-draft-structural-review-safe",
  baseVersion: "v4.8.110-event-ticket-commercial-migration-eighth-corrected-adjusted-draft-safe",
  baseCommit: "cad168206541292f73cb32f1370aae2f90a75cb6",
  decision: "needs_adjustment_with_remediation_matrix",
  findings: EIGHTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS,
  remediationMatrix: EIGHTH_CORRECTED_DRAFT_REMEDIATION_MATRIX,
  requiredAdjustments: EIGHTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length,
  criticalCount,
  highCount,
  acceptanceTests,
  externalPrerequisites: EIGHTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length,
  reviewedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  separateAdjustmentPlanRequired: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationEighthCorrectedDraftStructuralReview(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const findingKeys = new Set(
    EIGHTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.map((item) => item.key),
  );
  const matrixKeys = new Set(
    EIGHTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.flatMap((phase) => phase.findingKeys),
  );

  const checks = [
    EIGHTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length === 10,
    findingKeys.size === 10,
    matrixKeys.size === 10,
    [...findingKeys].every((key) => matrixKeys.has(key)),
    criticalCount === 6,
    highCount === 4,
    EIGHTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.length === 10,
    acceptanceTests === 50,
    EIGHTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.reviewedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.separateAdjustmentPlanRequired === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;

  return { ok: checks.every(Boolean), checks };
}
