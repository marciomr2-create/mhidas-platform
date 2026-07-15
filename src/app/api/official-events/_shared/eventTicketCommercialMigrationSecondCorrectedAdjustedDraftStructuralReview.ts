// src/app/api/official-events/_shared/eventTicketCommercialMigrationSecondCorrectedAdjustedDraftStructuralReview.ts

export const EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW_VERSION =
  "v4.8.97-event-ticket-commercial-migration-second-corrected-adjusted-draft-structural-review-safe" as const;

export const EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW_BASE_VERSION =
  "v4.8.96-event-ticket-commercial-migration-second-corrected-adjusted-draft-safe" as const;

export const EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW_BASE_COMMIT =
  "ada5e61e4b45b6c4601100841177919efc11a437" as const;

export const EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_REVIEWED_SQL_SHA256 =
  "B866D36FDAF867F84D27C920069A3D355BB1DF6387698E19A489E1958604F5B0" as const;

export const EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_REVIEWED_DOC_SHA256 =
  "32BD967BF5BF1B66F31B2187CA5F980F3A8888A6798033FE79C64DA40C18614B" as const;

export const EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_REVIEWED_CONTRACT_SHA256 =
  "CB1A5C91521B9304004ECA927168E28E228A7A44C56E67E5E5D99573A4AECAF8" as const;

export type EventTicketCommercialSecondCorrectedDraftStructuralSeverity =
  | "critical"
  | "high";

export type EventTicketCommercialSecondCorrectedDraftStructuralFinding = {
  key: string;
  severity: EventTicketCommercialSecondCorrectedDraftStructuralSeverity;
  title: string;
  summary: string;
  evidence: readonly string[];
  correction: string;
  blocksPromotion: true;
};

export const EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_FINDINGS = [
  {
    key: "url_validation_nullable_boolean_bypass",
    severity: "critical",
    title: "Validação de URL aceita prova nula por lógica ternária",
    summary: "A função de freshness pode retornar NULL quando hashes ou timestamps obrigatórios estão ausentes. A RPC usa IF NOT sobre esse resultado; em PL/pgSQL, NOT NULL continua NULL e o bloco de rejeição não é executado. O CHECK da tabela também aceita NULL, pois constraints CHECK rejeitam somente FALSE.",
    evidence: [
      "mhidas_ticket_url_proof_is_fresh_v3 usa uma cadeia booleana sem COALESCE",
      "mhidas_record_event_ticket_channel_url_validation_v3 usa if not função(...) then",
      "event_ticket_commercial_channels_url_proof_v490_check não exige IS NOT NULL para todos os hashes",
    ],
    correction: "Tornar o predicado estritamente booleano com COALESCE(..., false), testar IS NOT TRUE e exigir NOT NULL explícito para toda evidência de uma prova validated.",
    blocksPromotion: true,
  },
  {
    key: "authenticated_purchase_signal_read_exposes_sensitive_evidence",
    severity: "critical",
    title: "Leitura própria expõe evidências e valores comerciais sensíveis",
    summary: "O GRANT SELECT de tabela inteira combinado com a policy user_id = auth.uid() entrega ao clubber todas as colunas do sinal, incluindo namespace do provedor, hashes de transação, assinatura, replay, evidência e valores bruto/comissão.",
    evidence: [
      "grant select on table public.event_ticket_purchase_signals to authenticated",
      "policy event_ticket_purchase_signals_own_or_admin_read_v490",
      "colunas transaction_hash, signature_validation_hash, replay_nonce_hash, gross_amount_minor e commission_amount_minor",
    ],
    correction: "Usar view/RPC redigida ou grants por coluna; manter os campos de integração e finanças disponíveis somente para administração e processamento servidor.",
    blocksPromotion: true,
  },
  {
    key: "trusted_integration_not_bound_to_verified_partner_lifecycle",
    severity: "critical",
    title: "Integração ativa não depende do estado atual do parceiro",
    summary: "A ativação da integração exige verificação administrativa, mas não exige que commercial_partners permaneça verified. A RPC de sinais busca apenas integration_status = active, permitindo que parceiro suspenso ou desativado continue enviando conversões.",
    evidence: [
      "event_ticket_trusted_integrations possui partner_id",
      "constraint de ativação verifica somente verified_by_admin_user_id e verified_at",
      "mhidas_record_event_ticket_purchase_signal_v3 não junta commercial_partners",
    ],
    correction: "Vincular uso e ativação ao parceiro verified, bloquear suspensão/desativação com integração ativa ou suspender/revogar integrações atomicamente.",
    blocksPromotion: true,
  },
  {
    key: "system_click_user_identity_is_caller_controlled",
    severity: "critical",
    title: "Identidade do usuário em clique de sistema é controlada pelo chamador",
    summary: "No fluxo commercial_link_click, p_user_id é gravado diretamente. A RPC só compara o usuário quando o click já possui user_id; para clique anônimo, o service_role pode associar qualquer usuário, alterando ownership, leitura RLS e métricas.",
    evidence: [
      "ramo commercial_link_click define actor_role system",
      "p_user_id entra diretamente no INSERT",
      "validação usa if v_click.user_id is not null antes de comparar",
    ],
    correction: "Derivar user_id exclusivamente do registro de click ou exigir igualdade com IS NOT DISTINCT FROM, sem aceitar enriquecimento arbitrário.",
    blocksPromotion: true,
  },
  {
    key: "receipt_idempotency_is_not_atomic_under_concurrency",
    severity: "critical",
    title: "Idempotência continua vulnerável a concorrência",
    summary: "O fluxo consulta recibo e só depois grava o recibo ou executa a mutação. Duas requisições simultâneas podem passar pela consulta inicial; a segunda termina em unique violation ou conflito de lock, em vez de retornar deterministicamente o primeiro resultado.",
    evidence: [
      "mhidas_ticket_assert_receipt_replay_v2 ocorre antes da reserva do recibo",
      "event_ticket_operation_receipts_semantic_v493_uq é a única barreira concorrente",
      "não há INSERT ON CONFLICT, advisory lock ou segunda leitura após conflito",
    ],
    correction: "Reservar a chave idempotente atomicamente antes do efeito, usar upsert/lock transacional e retornar o resultado vencedor em concorrência.",
    blocksPromotion: true,
  },
  {
    key: "active_channel_can_outlive_active_retention_policy",
    severity: "critical",
    title: "Canal ativo pode continuar público após retirada da política de retenção",
    summary: "O trigger valida a policy quando o canal é inserido ou atualizado, mas nada impede a policy de mudar para retired depois. A resolução pública v3 não verifica se a policy associada ao canal ainda está active.",
    evidence: [
      "event_ticket_channel_retention_policy_guard_v496 executa apenas em mudanças do canal",
      "event_ticket_retention_policy_versions permite lifecycle até retired",
      "mhidas_resolve_public_event_ticket_action_v3 não consulta policy_status",
    ],
    correction: "Bloquear retirement enquanto houver canal dependente ativo ou pausar canais atomicamente; a resolução pública também deve falhar fechada quando a policy não estiver active.",
    blocksPromotion: true,
  },
  {
    key: "attributed_conversion_transaction_deduplication_missing",
    severity: "high",
    title: "Conversão atribuída não possui unicidade por transação",
    summary: "O índice global de transação foi removido e o novo índice cobre somente confirmed_conversion. A mesma transação pode gerar várias attributed_conversion com idempotency keys ou nonces diferentes, inflando atribuição.",
    evidence: [
      "drop index public.event_ticket_purchase_signals_transaction_v490_uq",
      "event_ticket_purchase_signals_confirmed_transaction_v496_uq usa where signal_type = confirmed_conversion",
      "replay_nonce e recibo não garantem unicidade semântica da transação atribuída",
    ],
    correction: "Criar entidade transacional canônica ou unicidade por integração/provedor/hash/estágio, com regra explícita de progressão attributed para confirmed.",
    blocksPromotion: true,
  },
  {
    key: "trusted_integration_channel_event_relation_not_constrained",
    severity: "high",
    title: "Escopo integração–canal–evento pode ficar internamente inconsistente",
    summary: "A tabela de autorização armazena channel_id e canonical_event_id separadamente, porém não existe FK composta ou trigger garantindo que o evento seja o evento do canal. A RPC falha fechada, mas o registro pode conter autorizações active inválidas e auditoria ambígua.",
    evidence: [
      "event_ticket_trusted_integration_channels possui channel_id e canonical_event_id",
      "primary key cobre apenas integration_id e channel_id",
      "ausência de constraint composta com event_ticket_commercial_channels",
    ],
    correction: "Remover a duplicação do evento ou criar chave composta/trigger que imponha igualdade antes de permitir authorization_status active.",
    blocksPromotion: true,
  },
  {
    key: "trusted_integration_registry_has_no_controlled_audited_lifecycle",
    severity: "high",
    title: "Registro de integrações não possui caminho controlado e auditado de mutação",
    summary: "As tabelas de integrações são centrais para evidência confiável, mas não possuem lock_version, guard trigger, RPC administrativa, recibos de idempotência ou auditoria de ativação, suspensão e revogação.",
    evidence: [
      "create table event_ticket_trusted_integrations",
      "create table event_ticket_trusted_integration_channels",
      "somente grants de leitura e nenhuma RPC de lifecycle definida",
    ],
    correction: "Adicionar lifecycle transacional administrado, optimistic concurrency, evidência obrigatória, auditoria append-only e revogação atômica dos escopos.",
    blocksPromotion: true,
  }
] as const satisfies readonly EventTicketCommercialSecondCorrectedDraftStructuralFinding[];

export const EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_OPEN_EXTERNAL_PREREQUISITES = [
  { prerequisiteKey: "fresh_production_schema_inventory", closed: false },
  { prerequisiteKey: "admin_authorization_rpc_contract", closed: false },
  { prerequisiteKey: "verified_partner_and_integration_onboarding", closed: false },
  { prerequisiteKey: "commercial_financial_semantics", closed: false },
  { prerequisiteKey: "server_side_url_validator", closed: false },
  { prerequisiteKey: "provider_namespace_and_credentials_registry", closed: false },
  { prerequisiteKey: "legal_retention_and_anonymization", closed: false },
  { prerequisiteKey: "legacy_mapping", closed: false },
  { prerequisiteKey: "backup_dry_run_and_reconciliation", closed: false },
  { prerequisiteKey: "parallel_concurrency_and_failure_tests", closed: false },
] as const;

export const EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW = {
  decision: "needs_adjustment",
  reviewedVersion: EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW_BASE_VERSION,
  reviewedCommit: EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW_BASE_COMMIT,
  reviewedSqlSha256: EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_REVIEWED_SQL_SHA256,
  findings: EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_FINDINGS,
  openExternalPrerequisites:
    EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_OPEN_EXTERNAL_PREREQUISITES,
  nextAllowedArtifact: "fourth_adjustment_plan_safe",
  promotionToExecutableMigrationAllowed: false,
  executableMigrationCreated: false,
  reviewedSqlChanged: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  publicTicketLinkActivated: false,
} as const;

export type EventTicketCommercialSecondCorrectedDraftStructuralReviewRequest = {
  requestSqlMutation?: boolean | null;
  requestExecutableMigration?: boolean | null;
  requestMoveToSupabaseMigrations?: boolean | null;
  requestSupabaseOperation?: boolean | null;
  requestDatabaseWrite?: boolean | null;
  requestPublicActivation?: boolean | null;
};

export type EventTicketCommercialSecondCorrectedDraftStructuralReviewState =
  | "needs_adjustment"
  | "blocked_sql_mutation_requested"
  | "blocked_executable_migration_requested"
  | "blocked_move_to_supabase_migrations_requested"
  | "blocked_supabase_operation_requested"
  | "blocked_database_write_requested"
  | "blocked_public_activation_requested";

export function evaluateEventTicketCommercialSecondCorrectedDraftStructuralReview(
  request: EventTicketCommercialSecondCorrectedDraftStructuralReviewRequest = {}
): {
  ok: boolean;
  state: EventTicketCommercialSecondCorrectedDraftStructuralReviewState;
  reason: string;
  review: typeof EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW;
} {
  const blocked: ReadonlyArray<[
    keyof EventTicketCommercialSecondCorrectedDraftStructuralReviewRequest,
    EventTicketCommercialSecondCorrectedDraftStructuralReviewState,
    string,
  ]> = [
    ["requestSqlMutation", "blocked_sql_mutation_requested", "A revisão não altera o SQL protegido."],
    ["requestExecutableMigration", "blocked_executable_migration_requested", "A promoção permanece bloqueada."],
    ["requestMoveToSupabaseMigrations", "blocked_move_to_supabase_migrations_requested", "O SQL permanece em docs/sql."],
    ["requestSupabaseOperation", "blocked_supabase_operation_requested", "Nenhuma operação Supabase pertence ao escopo."],
    ["requestDatabaseWrite", "blocked_database_write_requested", "Nenhuma escrita em banco pertence ao escopo."],
    ["requestPublicActivation", "blocked_public_activation_requested", "Nenhum link comercial pode ser ativado."],
  ];

  for (const [key, state, reason] of blocked) {
    if (request[key] === true) {
      return {
        ok: false,
        state,
        reason,
        review: EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW,
      };
    }
  }

  return {
    ok: true,
    state: "needs_adjustment",
    reason:
      "Revisão estrutural concluída; nove ajustes devem ser planejados antes de outro rascunho.",
    review: EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW,
  };
}

export function runEventTicketCommercialSecondCorrectedDraftStructuralReviewSelfTest(): {
  ok: boolean;
  checks: ReadonlyArray<{ checkKey: string; ok: boolean; detail: string }>;
  requiredAdjustmentCount: number;
  criticalAdjustmentCount: number;
  highAdjustmentCount: number;
  externalPrerequisiteCount: number;
  promotionAllowed: false;
} {
  const checks: Array<{ checkKey: string; ok: boolean; detail: string }> = [];
  const add = (checkKey: string, ok: boolean, detail: string): void => {
    checks.push({ checkKey, ok, detail });
  };

  const findings = EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_FINDINGS;
  const criticalCount = findings.filter((item) => item.severity === "critical").length;
  const highCount = findings.filter((item) => item.severity === "high").length;

  add("decision_needs_adjustment", EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW.decision === "needs_adjustment", "decision preserved");
  add("nine_findings", findings.length === 9, `count=${findings.length}`);
  add("six_critical", criticalCount === 6, `count=${criticalCount}`);
  add("three_high", highCount === 3, `count=${highCount}`);
  add("all_block_promotion", findings.every((item) => item.blocksPromotion), "all findings block promotion");
  add("external_prerequisites_open", EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_OPEN_EXTERNAL_PREREQUISITES.length === 10, "ten prerequisites open");
  add("promotion_blocked", EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW.promotionToExecutableMigrationAllowed === false, "promotion blocked");
  add("reviewed_sql_preserved", EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW.reviewedSqlChanged === false, "v4.8.96 SQL unchanged");
  add("no_supabase", EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW.supabaseOperationPerformed === false, "Supabase untouched");
  add("no_database_write", EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW.databaseWritePerformed === false, "database untouched");

  for (const finding of findings) {
    add(`finding_${finding.key}`, finding.evidence.length >= 3, finding.title);
  }

  return {
    ok: checks.every((item) => item.ok),
    checks,
    requiredAdjustmentCount: findings.length,
    criticalAdjustmentCount: criticalCount,
    highAdjustmentCount: highCount,
    externalPrerequisiteCount:
      EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_OPEN_EXTERNAL_PREREQUISITES.length,
    promotionAllowed: false,
  };
}
