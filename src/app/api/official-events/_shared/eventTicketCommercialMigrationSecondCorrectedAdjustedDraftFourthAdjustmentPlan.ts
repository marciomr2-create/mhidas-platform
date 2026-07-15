// src/app/api/official-events/_shared/eventTicketCommercialMigrationSecondCorrectedAdjustedDraftFourthAdjustmentPlan.ts

export const EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_FOURTH_ADJUSTMENT_PLAN_VERSION =
  "v4.8.98-event-ticket-commercial-second-corrected-draft-fourth-adjustment-plan-safe" as const;

export const EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_FOURTH_ADJUSTMENT_PLAN_BASE_VERSION =
  "v4.8.97-event-ticket-commercial-migration-second-corrected-adjusted-draft-structural-review-safe" as const;

export const EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_FOURTH_ADJUSTMENT_PLAN_BASE_COMMIT =
  "27c122d91f0c00242f1bb8269cd4dcb0b8c777b4" as const;

export const EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_ADJUSTED_DRAFT_SQL_SHA256 =
  "B866D36FDAF867F84D27C920069A3D355BB1DF6387698E19A489E1958604F5B0" as const;

export const EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW_DOC_SHA256 =
  "8BD4972F023C9D3644D6D805504B91FDF44E5A2757050E25837854544C65851C" as const;

export const EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_STRUCTURAL_REVIEW_CONTRACT_SHA256 =
  "6625493D3F07C3EDD1F0FC53FCFD9A7B3125C2A4DC5D4F1A048832201B2AC56A" as const;

export type EventTicketCommercialFourthAdjustmentSeverity = "critical" | "high";

export type EventTicketCommercialFourthAdjustmentPlanItem = {
  key: string;
  severity: EventTicketCommercialFourthAdjustmentSeverity;
  phase: string;
  title: string;
  objective: string;
  requiredChanges: readonly string[];
  acceptanceTests: readonly string[];
  prerequisites: readonly string[];
};

export const EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_PHASES =
  [
  {
    "phaseKey": "url_proof_and_fail_closed_resolution",
    "title": "Fechar prova de URL e resolução pública",
    "objective": "Tornar toda validação estritamente booleana e impedir publicação com evidência incompleta."
  },
  {
    "phaseKey": "purchase_signal_read_minimization",
    "title": "Reduzir a superfície de leitura dos sinais",
    "objective": "Separar dados próprios do clubber de evidências técnicas e valores comerciais sensíveis."
  },
  {
    "phaseKey": "integration_partner_lifecycle_and_scope",
    "title": "Vincular integração, parceiro e escopo",
    "objective": "Garantir lifecycle administrado e coerência entre integração, parceiro, canal e evento."
  },
  {
    "phaseKey": "click_identity_and_transaction_lineage",
    "title": "Fechar identidade de clique e lineage transacional",
    "objective": "Derivar identidade no servidor e deduplicar progressões de conversão por transação."
  },
  {
    "phaseKey": "atomic_idempotency_and_concurrency",
    "title": "Tornar a idempotência atômica",
    "objective": "Reservar recibos antes dos efeitos e retornar resultados determinísticos sob concorrência."
  },
  {
    "phaseKey": "retention_policy_lifecycle_and_re_review",
    "title": "Vincular retenção ao lifecycle e revisar novamente",
    "objective": "Impedir canais ativos com política inválida e submeter o próximo rascunho a revisão independente."
  }
] as const;

export const EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_ITEMS =
  [
  {
    "key": "url_validation_nullable_boolean_bypass",
    "severity": "critical",
    "phase": "url_proof_and_fail_closed_resolution",
    "title": "Transformar a prova de URL em predicado estritamente booleano",
    "objective": "Eliminar qualquer caminho em que NULL seja interpretado como validação suficiente.",
    "requiredChanges": [
      "Reescrever a função de freshness para retornar COALESCE(resultado, false) em todos os ramos.",
      "Trocar verificações PL/pgSQL por IS NOT TRUE nas RPCs de validação, autorização, ativação e cutover.",
      "Exigir NOT NULL para hashes, timestamps, versão do validador e estado healthy quando validation_status for validated.",
      "Fazer o resolvedor público reutilizar a mesma função fail-closed e retornar fallback quando a prova estiver incompleta."
    ],
    "acceptanceTests": [
      "prova completa, íntegra e fresca retorna true.",
      "qualquer hash obrigatório nulo retorna false.",
      "timestamp obrigatório nulo retorna false.",
      "RPC rejeita resultado NULL usando IS NOT TRUE.",
      "resolvedor público não expõe canal com prova incompleta."
    ],
    "prerequisites": [
      "server_side_url_validator",
      "parallel_concurrency_and_failure_tests"
    ]
  },
  {
    "key": "authenticated_purchase_signal_read_exposes_sensitive_evidence",
    "severity": "critical",
    "phase": "purchase_signal_read_minimization",
    "title": "Criar leitura redigida para sinais próprios",
    "objective": "Permitir ao clubber consultar somente o estado funcional do próprio sinal.",
    "requiredChanges": [
      "Revogar SELECT de tabela inteira de authenticated em event_ticket_purchase_signals.",
      "Criar view ou RPC redigida com colunas explicitamente permitidas para leitura própria.",
      "Manter hashes técnicos, namespace, nonce, evidência, valores brutos e comissão restritos a serviço e administração.",
      "Adicionar preflight que detecte grants de tabela ou coluna incompatíveis com a matriz de exposição."
    ],
    "acceptanceTests": [
      "clubber consulta somente sinal próprio pela superfície redigida.",
      "clubber não recebe transaction_hash nem signature_validation_hash.",
      "clubber não recebe gross_amount_minor nem commission_amount_minor.",
      "service_role mantém acesso técnico necessário.",
      "grant amplo para authenticated é detectado pelo preflight."
    ],
    "prerequisites": [
      "admin_authorization_rpc_contract",
      "commercial_financial_semantics"
    ]
  },
  {
    "key": "trusted_integration_not_bound_to_verified_partner_lifecycle",
    "severity": "critical",
    "phase": "integration_partner_lifecycle_and_scope",
    "title": "Vincular integração ativa ao parceiro verificado",
    "objective": "Impedir uso de integração quando o parceiro estiver suspenso, desativado ou revogado.",
    "requiredChanges": [
      "Exigir commercial_partners.partner_status = verified na ativação e em cada uso da integração.",
      "Bloquear suspensão ou desativação do parceiro enquanto houver integrações active, salvo transação de suspensão em cascata.",
      "Criar RPC administrativa que suspenda ou revogue parceiro, integrações e escopos atomicamente.",
      "Registrar auditoria append-only da transição e da evidência administrativa utilizada."
    ],
    "acceptanceTests": [
      "parceiro verified com integração active pode operar.",
      "parceiro suspended é rejeitado mesmo com integração marcada active.",
      "desativação sem cascata é bloqueada quando há integração ativa.",
      "suspensão em cascata revoga todos os escopos na mesma transação.",
      "auditoria registra ator, motivo, estado anterior e estado final."
    ],
    "prerequisites": [
      "verified_partner_and_integration_onboarding",
      "admin_authorization_rpc_contract"
    ]
  },
  {
    "key": "system_click_user_identity_is_caller_controlled",
    "severity": "critical",
    "phase": "click_identity_and_transaction_lineage",
    "title": "Derivar a identidade do clique exclusivamente no servidor",
    "objective": "Impedir enriquecimento ou troca arbitrária de user_id em sinais originados por clique.",
    "requiredChanges": [
      "Remover p_user_id como autoridade no fluxo commercial_link_click.",
      "Derivar user_id somente de event_ticket_click_attributions ou do principal autenticado validado.",
      "Exigir igualdade com IS NOT DISTINCT FROM quando uma identidade também for fornecida para conferência.",
      "Persistir origem da identidade e rejeitar associação posterior de clique anônimo a usuário arbitrário."
    ],
    "acceptanceTests": [
      "clique identificado gera sinal com o mesmo user_id.",
      "user_id divergente do clique é rejeitado.",
      "clique anônimo permanece anônimo.",
      "chamador não consegue associar usuário a clique anônimo.",
      "lineage registra a fonte server-side da identidade."
    ],
    "prerequisites": [
      "parallel_concurrency_and_failure_tests"
    ]
  },
  {
    "key": "receipt_idempotency_is_not_atomic_under_concurrency",
    "severity": "critical",
    "phase": "atomic_idempotency_and_concurrency",
    "title": "Reservar recibo idempotente antes de qualquer efeito",
    "objective": "Garantir replay determinístico mesmo com requisições simultâneas.",
    "requiredChanges": [
      "Inserir ou reservar atomicamente a chave semântica do recibo antes da mutação principal.",
      "Usar INSERT ON CONFLICT, lock transacional ou mecanismo equivalente com segunda leitura do vencedor.",
      "Persistir estado pending, completed ou failed com payload_hash e resultado estável.",
      "Fazer concorrentes aguardarem ou retornarem exatamente o resultado vencedor sem unique violation exposta."
    ],
    "acceptanceTests": [
      "duas chamadas simultâneas com mesmo payload produzem um único efeito.",
      "a chamada perdedora retorna o mesmo result_id da vencedora.",
      "mesma chave com payload divergente é rejeitada deterministicamente.",
      "falha antes do efeito não deixa recibo completed.",
      "unique violation interna não é exposta ao chamador."
    ],
    "prerequisites": [
      "parallel_concurrency_and_failure_tests"
    ]
  },
  {
    "key": "active_channel_can_outlive_active_retention_policy",
    "severity": "critical",
    "phase": "retention_policy_lifecycle_and_re_review",
    "title": "Impedir canal ativo com política de retenção inativa",
    "objective": "Vincular permanentemente a elegibilidade pública do canal ao estado atual da política.",
    "requiredChanges": [
      "Bloquear retirement ou suspensão de policy enquanto houver canal active dependente, salvo transação de pausa em cascata.",
      "Criar RPC administrativa para retirar policy e pausar canais dependentes atomicamente.",
      "Fazer authorize, activate, resume e resolvedor público exigirem policy_status = active.",
      "Registrar auditoria e relatório de canais afetados em qualquer transição de policy."
    ],
    "acceptanceTests": [
      "canal com policy active pode ser resolvido publicamente.",
      "retirement isolado é bloqueado quando há canal ativo dependente.",
      "retirement em cascata pausa os canais na mesma transação.",
      "resolvedor público falha fechado quando a policy deixa de estar active.",
      "auditoria lista todos os canais afetados pela transição."
    ],
    "prerequisites": [
      "legal_retention_and_anonymization",
      "admin_authorization_rpc_contract"
    ]
  },
  {
    "key": "attributed_conversion_transaction_deduplication_missing",
    "severity": "high",
    "phase": "click_identity_and_transaction_lineage",
    "title": "Deduplicar conversões atribuídas por transação canônica",
    "objective": "Impedir inflação de atribuição por múltiplos sinais equivalentes da mesma transação.",
    "requiredChanges": [
      "Definir chave canônica por integration_id, provider_namespace e transaction_hash.",
      "Impor unicidade semântica para attributed_conversion dentro do estágio aplicável.",
      "Modelar progressão explícita de attributed_conversion para confirmed_conversion sem duplicar a transação.",
      "Preservar correções como novos nós versionados ligados à transação canônica."
    ],
    "acceptanceTests": [
      "primeira attributed_conversion da transação é aceita.",
      "segunda atribuição equivalente retorna replay ou é rejeitada sem novo efeito.",
      "mesmo hash em integrações distintas não colide indevidamente.",
      "confirmação progride a transação sem criar segunda identidade canônica.",
      "correção cria novo nó mantendo a transação e o lineage."
    ],
    "prerequisites": [
      "commercial_financial_semantics",
      "provider_namespace_and_credentials_registry"
    ]
  },
  {
    "key": "trusted_integration_channel_event_relation_not_constrained",
    "severity": "high",
    "phase": "integration_partner_lifecycle_and_scope",
    "title": "Impor coerência entre integração, canal e evento",
    "objective": "Eliminar autorizações ativas cujo canonical_event_id não pertença ao channel_id informado.",
    "requiredChanges": [
      "Remover canonical_event_id redundante da autorização ou criar chave composta verificável com o canal.",
      "Adicionar constraint ou trigger fail-closed antes de authorization_status = active.",
      "Validar a mesma relação em todas as RPCs de criação, ativação, uso e revogação.",
      "Adicionar preflight que detecte escopos existentes inconsistentes e gere relatório de rejeitados."
    ],
    "acceptanceTests": [
      "canal e evento correspondentes permitem autorização.",
      "evento divergente do canal é rejeitado.",
      "alteração posterior do canal não deixa escopo ativo inconsistente.",
      "RPC de sinal rejeita autorização estruturalmente inválida.",
      "preflight lista todas as inconsistências sem corrigi-las silenciosamente."
    ],
    "prerequisites": [
      "fresh_production_schema_inventory",
      "legacy_mapping"
    ]
  },
  {
    "key": "trusted_integration_registry_has_no_controlled_audited_lifecycle",
    "severity": "high",
    "phase": "integration_partner_lifecycle_and_scope",
    "title": "Criar lifecycle administrado para integrações confiáveis",
    "objective": "Controlar criação, verificação, ativação, suspensão e revogação com concorrência otimista e auditoria.",
    "requiredChanges": [
      "Adicionar lock_version, lifecycle guard e matriz explícita de transições para integrações e escopos.",
      "Criar RPCs administrativas transacionais com expected_lock_version e recibos idempotentes.",
      "Exigir evidência administrativa redigida em ativação, suspensão, revogação e reativação.",
      "Registrar auditoria append-only e revogar escopos atomicamente quando a integração deixar de estar active."
    ],
    "acceptanceTests": [
      "integração draft pode seguir somente para estado permitido.",
      "expected_lock_version divergente bloqueia a mutação.",
      "replay idempotente retorna o mesmo resultado sem nova auditoria.",
      "revogação remove todos os escopos ativos atomicamente.",
      "mutação direta fora da RPC é bloqueada pelo guard trigger."
    ],
    "prerequisites": [
      "admin_authorization_rpc_contract",
      "verified_partner_and_integration_onboarding"
    ]
  }
] as const satisfies readonly EventTicketCommercialFourthAdjustmentPlanItem[];

export const EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_EXTERNAL_PREREQUISITES =
  [
  {
    "prerequisiteKey": "fresh_production_schema_inventory",
    "closed": false
  },
  {
    "prerequisiteKey": "admin_authorization_rpc_contract",
    "closed": false
  },
  {
    "prerequisiteKey": "verified_partner_and_integration_onboarding",
    "closed": false
  },
  {
    "prerequisiteKey": "commercial_financial_semantics",
    "closed": false
  },
  {
    "prerequisiteKey": "server_side_url_validator",
    "closed": false
  },
  {
    "prerequisiteKey": "provider_namespace_and_credentials_registry",
    "closed": false
  },
  {
    "prerequisiteKey": "legal_retention_and_anonymization",
    "closed": false
  },
  {
    "prerequisiteKey": "legacy_mapping",
    "closed": false
  },
  {
    "prerequisiteKey": "backup_dry_run_and_reconciliation",
    "closed": false
  },
  {
    "prerequisiteKey": "parallel_concurrency_and_failure_tests",
    "closed": false
  }
] as const;

export const EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_PLAN = {
  decision: "fourth_adjustment_plan_ready",
  sourceReviewVersion:
    EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_FOURTH_ADJUSTMENT_PLAN_BASE_VERSION,
  sourceReviewCommit:
    EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_DRAFT_FOURTH_ADJUSTMENT_PLAN_BASE_COMMIT,
  reviewedSqlSha256:
    EVENT_TICKET_COMMERCIAL_SECOND_CORRECTED_ADJUSTED_DRAFT_SQL_SHA256,
  phases: EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_PHASES,
  items: EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_ITEMS,
  externalPrerequisites:
    EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_EXTERNAL_PREREQUISITES,
  nextAllowedArtifact: "third_corrected_adjusted_migration_draft_safe",
  promotionToExecutableMigrationAllowed: false,
  executableMigrationCreated: false,
  reviewedSqlChanged: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  publicTicketLinkActivated: false,
} as const;

export type EventTicketCommercialFourthAdjustmentPlanRequest = {
  requestSqlMutation?: boolean | null;
  requestExecutableMigration?: boolean | null;
  requestMoveToSupabaseMigrations?: boolean | null;
  requestSupabaseOperation?: boolean | null;
  requestDatabaseWrite?: boolean | null;
  requestPublicActivation?: boolean | null;
};

export type EventTicketCommercialFourthAdjustmentPlanState =
  | "fourth_adjustment_plan_ready"
  | "blocked_sql_mutation_requested"
  | "blocked_executable_migration_requested"
  | "blocked_move_to_supabase_migrations_requested"
  | "blocked_supabase_operation_requested"
  | "blocked_database_write_requested"
  | "blocked_public_activation_requested";

export function evaluateEventTicketCommercialFourthAdjustmentPlan(
  request: EventTicketCommercialFourthAdjustmentPlanRequest = {}
): {
  ok: boolean;
  state: EventTicketCommercialFourthAdjustmentPlanState;
  reason: string;
  plan: typeof EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_PLAN;
} {
  const blocked: ReadonlyArray<[
    keyof EventTicketCommercialFourthAdjustmentPlanRequest,
    EventTicketCommercialFourthAdjustmentPlanState,
    string,
  ]> = [
    ["requestSqlMutation", "blocked_sql_mutation_requested", "O plano não altera o SQL protegido."],
    ["requestExecutableMigration", "blocked_executable_migration_requested", "A promoção permanece bloqueada."],
    ["requestMoveToSupabaseMigrations", "blocked_move_to_supabase_migrations_requested", "O SQL permanece em docs/sql."],
    ["requestSupabaseOperation", "blocked_supabase_operation_requested", "Nenhuma operação Supabase pertence ao escopo."],
    ["requestDatabaseWrite", "blocked_database_write_requested", "Nenhuma escrita em banco pertence ao escopo."],
    ["requestPublicActivation", "blocked_public_activation_requested", "Nenhum link comercial pode ser ativado."],
  ];

  for (const [key, state, reason] of blocked) {
    if (request[key] === true) {
      return { ok: false, state, reason, plan: EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_PLAN };
    }
  }

  return {
    ok: true,
    state: "fourth_adjustment_plan_ready",
    reason: "Plano técnico concluído; nove ajustes devem ser aplicados em um novo rascunho protegido.",
    plan: EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_PLAN,
  };
}

export function runEventTicketCommercialFourthAdjustmentPlanSelfTest(): {
  ok: boolean;
  checks: ReadonlyArray<{ checkKey: string; ok: boolean; detail: string }>;
  phaseCount: number;
  requiredAdjustmentCount: number;
  criticalAdjustmentCount: number;
  highAdjustmentCount: number;
  acceptanceTestCount: number;
  externalPrerequisiteCount: number;
  promotionAllowed: false;
} {
  const checks: Array<{ checkKey: string; ok: boolean; detail: string }> = [];
  const add = (checkKey: string, ok: boolean, detail: string): void => {
    checks.push({ checkKey, ok, detail });
  };

  const items = EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_ITEMS;
  const criticalCount = items.filter((item) => item.severity === "critical").length;
  const highCount = items.filter((item) => item.severity === "high").length;
  const acceptanceCount = items.reduce((total, item) => total + item.acceptanceTests.length, 0);
  const phaseKeys = new Set(EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_PHASES.map((phase) => phase.phaseKey));

  add("decision_ready", EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_PLAN.decision === "fourth_adjustment_plan_ready", "decision preserved");
  add("six_phases", EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_PHASES.length === 6, `count=${EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_PHASES.length}`);
  add("nine_items", items.length === 9, `count=${items.length}`);
  add("six_critical", criticalCount === 6, `count=${criticalCount}`);
  add("three_high", highCount === 3, `count=${highCount}`);
  add("forty_five_acceptance_tests", acceptanceCount === 45, `count=${acceptanceCount}`);
  add("all_phases_known", items.every((item) => phaseKeys.has(item.phase)), "all items mapped");
  add("all_have_four_changes", items.every((item) => item.requiredChanges.length === 4), "four changes per item");
  add("all_have_five_tests", items.every((item) => item.acceptanceTests.length === 5), "five tests per item");
  add("external_prerequisites_open", EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_EXTERNAL_PREREQUISITES.length === 10, "ten prerequisites open");
  add("promotion_blocked", EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_PLAN.promotionToExecutableMigrationAllowed === false, "promotion blocked");
  add("reviewed_sql_preserved", EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_PLAN.reviewedSqlChanged === false, "v4.8.96 SQL unchanged");
  add("no_supabase", EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_PLAN.supabaseOperationPerformed === false, "Supabase untouched");
  add("no_database_write", EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_PLAN.databaseWritePerformed === false, "database untouched");

  for (const item of items) {
    add(`item_${item.key}`, item.prerequisites.length >= 1, item.title);
  }

  return {
    ok: checks.every((check) => check.ok),
    checks,
    phaseCount: EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_PHASES.length,
    requiredAdjustmentCount: items.length,
    criticalAdjustmentCount: criticalCount,
    highAdjustmentCount: highCount,
    acceptanceTestCount: acceptanceCount,
    externalPrerequisiteCount: EVENT_TICKET_COMMERCIAL_FOURTH_ADJUSTMENT_EXTERNAL_PREREQUISITES.length,
    promotionAllowed: false,
  };
}
