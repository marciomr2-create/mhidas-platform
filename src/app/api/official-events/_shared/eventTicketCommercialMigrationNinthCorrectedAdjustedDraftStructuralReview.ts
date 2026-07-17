export type NinthCorrectedDraftStructuralSeverity = "critical" | "high";

export type NinthCorrectedDraftStructuralFinding = {
  key: string;
  severity: NinthCorrectedDraftStructuralSeverity;
  status: "required";
  title: string;
  evidence: string;
  requiredCorrection: string;
};

export type NinthCorrectedDraftRemediationPhase = {
  phase: string;
  name: string;
  findingKeys: readonly string[];
  acceptanceTests: number;
};

export const NINTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS = [
  {
    key: "base_preflight_rejects_required_legacy_indexes",
    severity: "critical",
    status: "required",
    title: "O preflight rejeita indices obrigatorios das tabelas-base que ele proprio exige",
    evidence: "O preflight exige `public.event_ticket_intents` e `public.partner_ticket_requests`, mas depois classifica como drift qualquer indice cujo nome contenha `ticket`. Os indices de chave primaria normalmente chamados `event_ticket_intents_pkey` e `partner_ticket_requests_pkey` entram nesse filtro, tornando a promocao inexequivel mesmo sobre a base esperada.",
    requiredCorrection: "Trocar a busca ampla por um inventario fechado dos objetos comerciais novos, com allowlist explicita para tabelas e indices-base. Adicionar teste PostgreSQL real que execute o preflight sobre um schema representativo e prove zero falso positivo.",
  },
  {
    key: "credential_context_does_not_verify_credential_key_possession",
    severity: "critical",
    status: "required",
    title: "O contexto de credencial nao comprova posse da chave da credencial corrente",
    evidence: "A emissao compara o hash de `p_issuer_service_key` com `issuer_service_key_hash` e calcula HMAC com essa mesma chave. `verifier_key_hash` aparece apenas como texto dentro do payload; nenhuma assinatura e verificada com a chave publica ou material criptografico da credencial corrente.",
    requiredCorrection: "Separar autoridade do emissor e prova da credencial. Verificar assinatura assimetrica ou prova equivalente contra a credencial corrente, vincular key id/algoritmo/versao e impedir que apenas o segredo do servico emita contexto em nome de qualquer credencial.",
  },
  {
    key: "credential_context_consumption_ignores_signed_request_payload",
    severity: "critical",
    status: "required",
    title: "O consumo do contexto ignora o payload que foi assinado na emissao",
    evidence: "A emissao persiste `request_payload_hash`, mas `mhidas_ticket_consume_verified_credential_context_v6` nao compara esse valor com o `request_hash` do recibo nem com o payload do sinal. Um contexto emitido para um pedido pode autorizar outro pedido com a mesma operation/audience.",
    requiredCorrection: "Persistir um hash canonico do pedido e exigir igualdade entre contexto, recibo e operacao consumidora na mesma transacao. O teste negativo deve provar que qualquer alteracao em evento, canal, clique, evidencia ou transacao invalida o contexto.",
  },
  {
    key: "commercial_url_proof_not_cryptographically_bound_to_destination",
    severity: "critical",
    status: "required",
    title: "A prova de URL e declarativa e nao esta vinculada ao destino comercial",
    evidence: "`mhidas_ticket_url_proof_is_fresh_v7` verifica formato de hashes, timestamps e igualdade do hash da chave do validador. Ela nao recebe nem valida `destination_url_hash`, ciphertext, payload assinado ou assinatura. Assim, os hashes de host, IP e redirects nao sao comprovadamente derivados da URL armazenada.",
    requiredCorrection: "Definir atestado canonico assinado contendo channel_id, URL hash, hostname, IPs, redirects, validator version, validated_at e expires_at. Verificar assinatura e autoridade ativa no boundary antes de autorizar e novamente ao resolver.",
  },
  {
    key: "official_fallback_hostname_and_authority_not_bound",
    severity: "critical",
    status: "required",
    title: "O fallback oficial nao vincula hostname, URL e autoridade de validacao",
    evidence: "A attestation armazena `source_hostname`, `signer_key_hash` e manifesto sem `url_validation_authority_id`. O resolver testa se o hostname declarado e publico, mas nao exige que ele seja igual ao hostname extraido de `source_url` nem verifica uma autoridade ativa correspondente.",
    requiredCorrection: "Adicionar FK para autoridade versionada, assinatura verificavel e constraint/RPC que compare hostname normalizado com a URL. O resolver deve recalcular hash/hostname e rejeitar URLs privadas, divergentes, expiradas ou sem cadeia de autoridade.",
  },
  {
    key: "retention_signal_family_is_not_batch_atomic",
    severity: "critical",
    status: "required",
    title: "A retencao pode quebrar a FK de supersessao ao dividir uma familia de sinais",
    evidence: "A FK de supersessao inclui `anonymized_transaction_hash`. O batch seleciona sinais individualmente por `LIMIT` e troca esse hash de `signal.family:*` para `signal.transaction:*`. Se predecessor e sucessor nao estiverem no mesmo lote, a atualizacao de um deles rompe a FK imediata ou deixa a familia inconsistente.",
    requiredCorrection: "Processar familias completas sob bloqueio, preservar uma chave de familia imutavel ou tornar a migracao de chave diferivel e atomica. Incluir testes com attributed, confirmed e correction atravessando fronteiras de lote.",
  },
  {
    key: "service_role_table_dml_boundary_not_explicitly_closed",
    severity: "high",
    status: "required",
    title: "O boundary function-only do service_role nao e fechado pelo DDL",
    evidence: "O SQL revoga tabelas apenas de `anon` e `authenticated`, enquanto concede RPCs ao `service_role`. Sem inventario e revoke explicito dos privilegios DML efetivos do `service_role`, processos privilegiados podem contornar recibos, state machines e auditoria com escrita direta.",
    requiredCorrection: "Inventariar grants herdados e diretos, revogar DML de tabelas do service_role quando compativel com a arquitetura e conceder somente EXECUTE nas RPCs autorizadas. Provar com testes de permissao que DML direto falha.",
  },
  {
    key: "retired_policy_strands_existing_evidence",
    severity: "high",
    status: "required",
    title: "A aposentadoria de policy pode deixar evidencias antigas fora da retencao",
    evidence: "O executor resolve somente a policy atualmente ativa e filtra cada tabela pelo ID exato dessa policy. A RPC de aposentadoria nao exige substituta ativa nem migra o vinculo das linhas existentes; registros ligados a uma policy retired podem nunca mais ser processados.",
    requiredCorrection: "Criar lineage/supersession de policy e executor que processe policies historicas ainda devidas, ou migracao controlada dos vinculos. Bloquear aposentadoria sem substituta aprovada e teste de drenagem.",
  },
  {
    key: "hmac_canonical_payload_is_ambiguous_and_session_dependent",
    severity: "high",
    status: "required",
    title: "O payload HMAC usa concatenacao ambigua e timestamp dependente da sessao",
    evidence: "O payload e montado com `:` embora audience e operation aceitem `:`. Alem disso usa `p_expires_at::text`, cuja representacao depende de timezone/configuracao da sessao. Tuplas distintas podem produzir fronteiras ambiguas e clientes podem assinar representacoes diferentes.",
    requiredCorrection: "Usar serializacao canonica com campos tipados e length-prefix ou JSON canonico, timestamp UTC em epoch/ISO fixo e domain separation versionada. Testar colisao de delimitador e diferentes timezones.",
  },
  {
    key: "receipt_terminal_result_state_is_open",
    severity: "high",
    status: "required",
    title: "O estado terminal do recibo aceita result_status arbitrario",
    evidence: "`mhidas_ticket_complete_operation_receipt_v5` recebe qualquer `p_result_status`. A constraint de estado exige apenas `receipt_status='completed'`, `completed_at` e `result_hash`, sem allowlist de resultado nem `result_version` obrigatoria. O recibo pode terminar como completed com status semantico invalido.",
    requiredCorrection: "Definir estados de resultado por operation_scope/operation_name ou enum fechado, exigir result_version e validar transicoes terminalmente. Adicionar testes que rejeitem `pending`, `failed` e valores desconhecidos na conclusao.",
  },
] as const satisfies readonly NinthCorrectedDraftStructuralFinding[];

export const NINTH_CORRECTED_DRAFT_REMEDIATION_MATRIX = [
  { phase: "R1", name: "base_preflight_rejects_required_legacy_indexes", findingKeys: ["base_preflight_rejects_required_legacy_indexes"], acceptanceTests: 5 },
  { phase: "R2", name: "credential_context_does_not_verify_credential_key_possession", findingKeys: ["credential_context_does_not_verify_credential_key_possession"], acceptanceTests: 5 },
  { phase: "R3", name: "credential_context_consumption_ignores_signed_request_payload", findingKeys: ["credential_context_consumption_ignores_signed_request_payload"], acceptanceTests: 5 },
  { phase: "R4", name: "commercial_url_proof_not_cryptographically_bound_to_destination", findingKeys: ["commercial_url_proof_not_cryptographically_bound_to_destination"], acceptanceTests: 5 },
  { phase: "R5", name: "official_fallback_hostname_and_authority_not_bound", findingKeys: ["official_fallback_hostname_and_authority_not_bound"], acceptanceTests: 5 },
  { phase: "R6", name: "retention_signal_family_is_not_batch_atomic", findingKeys: ["retention_signal_family_is_not_batch_atomic"], acceptanceTests: 5 },
  { phase: "R7", name: "service_role_table_dml_boundary_not_explicitly_closed", findingKeys: ["service_role_table_dml_boundary_not_explicitly_closed"], acceptanceTests: 5 },
  { phase: "R8", name: "retired_policy_strands_existing_evidence", findingKeys: ["retired_policy_strands_existing_evidence"], acceptanceTests: 5 },
  { phase: "R9", name: "hmac_canonical_payload_is_ambiguous_and_session_dependent", findingKeys: ["hmac_canonical_payload_is_ambiguous_and_session_dependent"], acceptanceTests: 5 },
  { phase: "R10", name: "receipt_terminal_result_state_is_open", findingKeys: ["receipt_terminal_result_state_is_open"], acceptanceTests: 5 },
] as const satisfies readonly NinthCorrectedDraftRemediationPhase[];

export const NINTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES = [
  "fresh_complete_production_schema_inventory",
  "effective_service_role_grant_inventory",
  "credential_signature_and_rotation_contract",
  "url_and_official_source_attestation_contract",
  "retention_policy_lineage_contract",
  "postgres_concurrency_fk_and_idempotency_tests",
  "production_backup_and_rollback_plan",
  "representative_clone_dry_run",
  "performance_and_volume_tests",
  "independent_review_of_next_sql",
] as const;

const criticalCount = NINTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "critical",
).length;

const highCount = NINTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "high",
).length;

const acceptanceTests = NINTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.reduce(
  (total, phase) => total + phase.acceptanceTests,
  0,
);

export const EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW = {
  version: "v4.8.113-event-ticket-commercial-migration-ninth-corrected-adjusted-draft-structural-review-safe",
  baseVersion: "v4.8.112-event-ticket-commercial-migration-ninth-corrected-adjusted-draft-safe",
  baseCommit: "e79116a24155bf62c97a5de4ee834e19367cc90a",
  decision: "needs_adjustment_with_remediation_matrix",
  findings: NINTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS,
  remediationMatrix: NINTH_CORRECTED_DRAFT_REMEDIATION_MATRIX,
  requiredAdjustments: NINTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length,
  criticalCount,
  highCount,
  acceptanceTests,
  externalPrerequisites: NINTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length,
  reviewedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  separateAdjustmentPlanRequired: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationNinthCorrectedDraftStructuralReview(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const findingKeys = new Set(
    NINTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.map((item) => item.key),
  );
  const matrixKeys = new Set(
    NINTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.flatMap((phase) => phase.findingKeys),
  );

  const checks = [
    NINTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length === 10,
    findingKeys.size === 10,
    matrixKeys.size === 10,
    [...findingKeys].every((key) => matrixKeys.has(key)),
    criticalCount === 6,
    highCount === 4,
    NINTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.length === 10,
    acceptanceTests === 50,
    NINTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.reviewedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.separateAdjustmentPlanRequired === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;

  return { ok: checks.every(Boolean), checks };
}
