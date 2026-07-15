// src/app/api/official-events/_shared/eventTicketCommercialMigrationThirdCorrectedAdjustedDraftStructuralReview.ts

export const EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW_VERSION =
  "v4.8.100-event-ticket-commercial-migration-third-corrected-adjusted-draft-structural-review-safe" as const;

export const EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW_BASE_VERSION =
  "v4.8.99-event-ticket-commercial-migration-third-corrected-adjusted-draft-safe" as const;

export const EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW_BASE_COMMIT =
  "10ce52c4d616e4e4a2b67f3c10fc6ad21413ea7f" as const;

export const EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_REVIEWED_SQL_SHA256 =
  "A137453B2C7F2A1BF0E580498D0F19B4461EF1EF594D6EB87CB34600DDA66DA9" as const;

export const EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_REVIEWED_DOC_SHA256 =
  "2839E478094419D9CFBA746B8C6DF78F58DBA9310A0B08B28CBD9CA46575EA20" as const;

export const EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_REVIEWED_CONTRACT_SHA256 =
  "A315414A90C2A752C7AF905E59835F99497F35D8F6CA631BBC7A19E8FE051E51" as const;

export type EventTicketCommercialThirdCorrectedDraftStructuralSeverity =
  | "critical"
  | "high";

export type EventTicketCommercialThirdCorrectedDraftStructuralFinding = {
  key: string;
  severity: EventTicketCommercialThirdCorrectedDraftStructuralSeverity;
  title: string;
  summary: string;
  evidence: readonly string[];
  correction: string;
  blocksPromotion: true;
};

export const EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_FINDINGS = [
  {
    key: "legacy_idempotency_paths_remain_non_atomic",
    severity: "critical",
    title: "Fluxos legados continuam fora da reserva idempotente atômica",
    summary:
      "A reserva v3 foi aplicada a sinais e parte do lifecycle novo, mas RPCs ainda publicadas continuam no padrão consultar-antes e gravar-depois. A validação URL v4 delega ao writer v2, e mutações de canal, solicitações, comunicações, expiração e retenção ainda dependem de assert/write v2. Retentativas concorrentes podem falhar em vez de reproduzir deterministicamente o resultado vencedor.",
    evidence: [
      "mhidas_record_event_ticket_channel_url_validation_v4 chama mhidas_record_event_ticket_channel_url_validation_v2",
      "mhidas_admin_mutate_event_ticket_commercial_channel_v2 usa mhidas_ticket_assert_receipt_replay_v2 e mhidas_ticket_write_operation_receipt_v2",
      "mhidas_run_event_ticket_retention_batch_v2 permanece concedida ao service_role e usa o contrato v2",
    ],
    correction:
      "Migrar todos os RPCs efetivamente concedidos para reserve/complete atômicos, definir replay de pending/completed/failed e remover o contrato v2 dos caminhos públicos e administrativos.",
    blocksPromotion: true,
  },
  {
    key: "trusted_integration_identity_not_credential_bound",
    severity: "critical",
    title: "Identidade da integração é escolhida pelo chamador service_role",
    summary:
      "A RPC de conversão aceita integration_id e provider_namespace do payload e valida somente se o registro está ativo. credential_reference_hash e verification_evidence_hash não participam da autorização da chamada. Qualquer caminho com service_role pode se apresentar como outra integração ativa.",
    evidence: [
      "mhidas_record_event_ticket_purchase_signal_v4 recebe p_integration_id e p_provider_namespace",
      "o lookup valida status e namespace, mas não um principal de credencial resolvido pelo servidor",
      "credential_reference_hash não é comparado nem derivado no registro do sinal",
    ],
    correction:
      "Derivar integration_id de um contexto de credencial verificado e não do payload, vincular a verificação a credential_reference_hash/version e registrar o verificador no recibo e na auditoria.",
    blocksPromotion: true,
  },
  {
    key: "partner_lifecycle_not_idempotent_or_transition_constrained",
    severity: "critical",
    title: "Lifecycle do parceiro não possui recibo nem matriz de transição",
    summary:
      "A RPC recebe idempotency_key, mas não reserva ou conclui recibo. Ela permite qualquer estado anterior para verified, suspended ou deactivated, não registra o estado anterior corretamente e não mantém suspended_at/deactivated_at de forma coerente.",
    evidence: [
      "mhidas_admin_mutate_commercial_partner_status_v1 não chama mhidas_ticket_reserve_operation_receipt_v3",
      "a validação limita apenas p_next_status, sem matriz old_status -> next_status",
      "o UPDATE não define suspended_at nem deactivated_at e a auditoria usa previous_status nulo",
    ],
    correction:
      "Adicionar recibo atômico, matriz explícita, evidência obrigatória, timestamps coerentes, snapshots before/after e replay determinístico.",
    blocksPromotion: true,
  },
  {
    key: "retention_retirement_not_idempotent_or_state_guarded",
    severity: "critical",
    title: "Aposentadoria da política não exige estado ativo nem recibo",
    summary:
      "A RPC pode definir retired sobre uma política draft, approved ou já retired. O previous_status da auditoria é fixado como active, e o idempotency_key não possui autoridade de recibo. Uma repetição pode alterar lock_version ou falhar por auditoria em vez de retornar o resultado original.",
    evidence: [
      "mhidas_admin_retire_event_ticket_retention_policy_v1 não verifica v_policy.policy_status = active",
      "a função não chama reserve/complete de recibo",
      "mhidas_ticket_write_audit_v1 recebe previous_status literal active",
    ],
    correction:
      "Exigir transição active -> retired, reservar recibo antes dos efeitos, validar hashes e retornar o resultado concluído em replay.",
    blocksPromotion: true,
  },
  {
    key: "cascade_mutations_lack_per_object_audit",
    severity: "critical",
    title: "Cascatas alteram objetos dependentes sem auditoria individual",
    summary:
      "Suspender ou revogar integração altera scopes; suspender parceiro altera integrações e scopes; aposentar política pausa canais. As funções escrevem somente uma auditoria agregada do objeto principal, sem uma entrada append-only para cada dependência alterada.",
    evidence: [
      "mhidas_admin_mutate_event_ticket_trusted_integration_v1 atualiza event_ticket_trusted_integration_channels e audita apenas integration",
      "mhidas_admin_mutate_commercial_partner_status_v1 atualiza integrações e scopes e audita apenas partner",
      "mhidas_admin_retire_event_ticket_retention_policy_v1 pausa canais e audita apenas retention_policy",
    ],
    correction:
      "Emitir auditoria individual e correlacionada para cada scope, integração e canal afetado, incluindo before/after, versão e resultado da cascata.",
    blocksPromotion: true,
  },
  {
    key: "trusted_integration_onboarding_and_rotation_path_missing",
    severity: "high",
    title: "Registro não possui onboarding e rotação de credencial controlados",
    summary:
      "O trigger bloqueia mutação direta fora do contexto interno, porém a RPC criada somente altera status de uma integração já existente. Não há caminho administrado para criar o registro, trocar credential_reference_hash ou renovar verification_evidence_hash com lock, recibo e auditoria.",
    evidence: [
      "mhidas_ticket_trusted_integration_guard_v1 exige app.mhidas_ticket_integration_mutation",
      "mhidas_admin_mutate_event_ticket_trusted_integration_v1 suporta apenas activate, suspend e revoke",
      "não existe RPC de create/register/rotate para event_ticket_trusted_integrations",
    ],
    correction:
      "Criar onboarding e rotação transacionais, com expected_lock_version, recibo, prova administrativa, histórico de credenciais e revogação da versão anterior.",
    blocksPromotion: true,
  },
  {
    key: "integration_scope_terminal_insert_and_audit_identity_ambiguous",
    severity: "high",
    title: "Scope terminal pode nascer sem histórico e sua auditoria é ambígua",
    summary:
      "A RPC usa UPSERT para authorize, suspend e revoke. Se o scope não existir, suspend ou revoke insere diretamente um registro terminal. A auditoria usa channel_id como target_id, não registra integration_id e mantém previous_status nulo.",
    evidence: [
      "v_next_status aceita suspended e revoked antes do INSERT",
      "ON CONFLICT permite que a ausência resulte em INSERT terminal",
      "a auditoria integration_scope usa v_scope.channel_id como target_id e partner_id nulo",
    ],
    correction:
      "Permitir INSERT apenas para pending/active autorizado, exigir existência para suspend/revoke e identificar a chave composta integration_id + channel_id na auditoria.",
    blocksPromotion: true,
  },
  {
    key: "admin_full_purchase_signal_read_path_missing",
    severity: "high",
    title: "A redaction remove também a leitura operacional do administrador",
    summary:
      "O SELECT integral foi revogado de authenticated e substituído por grant de colunas redigidas. Como privilégios de coluna precedem RLS, a policy administrativa não devolve aos admins os hashes, valores e evidências necessários para reconciliação. Não há view ou RPC exclusiva de administração para a leitura completa.",
    evidence: [
      "revoke select on event_ticket_purchase_signals from authenticated",
      "grant select lista apenas colunas redigidas para authenticated",
      "event_ticket_purchase_signals_own_or_admin_read_v490 não supera ausência de privilégio nas demais colunas",
    ],
    correction:
      "Manter o caminho redigido para clubbers e criar view/RPC admin-only com escopo, finalidade, auditoria e exposição mínima dos campos técnicos e financeiros.",
    blocksPromotion: true,
  },
  {
    key: "audit_and_receipt_retention_contract_missing",
    severity: "high",
    title: "Auditoria e recibos não possuem retenção ou anonimização",
    summary:
      "As tabelas de auditoria e recibos acumulam actor_user_id, principal_id, correlação, idempotência, targets e hashes sem retention_expires_at, processamento ou política associada. O batch existente trata somente cliques e sinais.",
    evidence: [
      "event_ticket_commercial_audit_log não possui retention_policy_version_id ou retention_expires_at",
      "event_ticket_operation_receipts não possui lifecycle de retenção",
      "mhidas_run_event_ticket_retention_batch_v2 processa apenas purchase_signals e click_attributions",
    ],
    correction:
      "Definir base legal e retenção para auditoria/recibos, anonimizar identificadores quando permitido e preservar somente evidência necessária com execução verificável.",
    blocksPromotion: true,
  },
] as const satisfies readonly EventTicketCommercialThirdCorrectedDraftStructuralFinding[];

export const EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES = [
  "fresh_production_schema_inventory",
  "admin_authorization_rpc_contract",
  "verified_partner_and_integration_onboarding",
  "commercial_financial_semantics",
  "server_side_url_and_credential_validator",
  "provider_namespace_and_credentials_registry",
  "legal_retention_and_anonymization",
  "parallel_concurrency_and_failure_tests",
  "production_backup_and_rollback_plan",
  "fifth_independent_structural_review",
] as const;

export const EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW = {
  version: EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW_VERSION,
  baseVersion:
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW_BASE_VERSION,
  baseCommit:
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW_BASE_COMMIT,
  decision: "needs_adjustment",
  findings:
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_FINDINGS,
  requiredAdjustments:
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length,
  criticalCount:
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
      (item) => item.severity === "critical",
    ).length,
  highCount:
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
      (item) => item.severity === "high",
    ).length,
  externalPrerequisites:
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length,
  reviewedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationThirdCorrectedAdjustedDraftStructuralReview(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const findings =
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_FINDINGS;
  const keys = new Set(findings.map((item) => item.key));

  const checks = [
    findings.length === 9,
    keys.size === 9,
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW.criticalCount === 5,
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW.highCount === 4,
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10,
    findings.every((item) => item.blocksPromotion === true),
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW.decision === "needs_adjustment",
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW.reviewedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;

  return { ok: checks.every(Boolean), checks };
}
