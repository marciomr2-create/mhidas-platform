// src/app/api/official-events/_shared/eventTicketCommercialMigrationThirdCorrectedAdjustedDraftFifthAdjustmentPlan.ts

export const EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_FIFTH_ADJUSTMENT_PLAN_VERSION =
  "v4.8.101-event-ticket-commercial-third-corrected-draft-fifth-adjustment-plan-safe" as const;

export const EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_FIFTH_ADJUSTMENT_PLAN_BASE_VERSION =
  "v4.8.100-event-ticket-commercial-migration-third-corrected-adjusted-draft-structural-review-safe" as const;

export const EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_FIFTH_ADJUSTMENT_PLAN_BASE_COMMIT =
  "5671d3e02e1877f65db71c6259f2a95be5f762a5" as const;

export const EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_ADJUSTED_DRAFT_SQL_SHA256 =
  "A137453B2C7F2A1BF0E580498D0F19B4461EF1EF594D6EB87CB34600DDA66DA9" as const;

export const EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW_DOC_SHA256 =
  "4D63316B2BBE97ACC717F3FA02B29CEF45D8E168596067A73C2170FF47936FE6" as const;

export const EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_STRUCTURAL_REVIEW_CONTRACT_SHA256 =
  "84A8598C5AAEBB421B392C296B3F1E6275500F505693367E61A4188AAF0FCFAA" as const;

export type EventTicketCommercialFifthAdjustmentSeverity = "critical" | "high";

export type EventTicketCommercialFifthAdjustmentPlanItem = {
  key: string;
  severity: EventTicketCommercialFifthAdjustmentSeverity;
  phase: string;
  title: string;
  objective: string;
  requiredChanges: readonly string[];
  acceptanceTests: readonly string[];
  prerequisites: readonly string[];
};

export const EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PHASES =
  [
  {
    "phaseKey": "atomic_receipt_migration",
    "title": "Migrar todos os fluxos para recibos atômicos",
    "objective": "Eliminar contratos v2 concedidos e tornar replay, falha e concorrência determinísticos."
  },
  {
    "phaseKey": "credential_bound_integration_identity",
    "title": "Vincular identidade da integração à credencial",
    "objective": "Derivar a integração do contexto verificado pelo servidor e registrar a versão da credencial."
  },
  {
    "phaseKey": "partner_and_retention_lifecycle",
    "title": "Fechar lifecycles de parceiro e retenção",
    "objective": "Aplicar matrizes explícitas, locks, timestamps e idempotência às transições administrativas."
  },
  {
    "phaseKey": "cascade_audit_integrity",
    "title": "Auditar cada efeito de cascata",
    "objective": "Gerar auditoria append-only individual para cada objeto dependente alterado."
  },
  {
    "phaseKey": "integration_onboarding_rotation_and_scope",
    "title": "Criar onboarding, rotação e escopo coerentes",
    "objective": "Administrar credenciais e scopes com histórico, chave composta e transições válidas."
  },
  {
    "phaseKey": "admin_read_retention_and_re_review",
    "title": "Fechar leitura administrativa e retenção",
    "objective": "Criar acesso admin mínimo e auditado, retenção para auditoria/recibos e nova revisão independente."
  }
] as const;

export const EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_ITEMS =
  [
  {
    "key": "legacy_idempotency_paths_remain_non_atomic",
    "severity": "critical",
    "phase": "atomic_receipt_migration",
    "title": "Migrar todas as RPCs concedidas para o contrato idempotente atômico",
    "objective": "Remover o padrão consultar-antes/gravar-depois dos fluxos ainda expostos.",
    "requiredChanges": [
      "Inventariar todas as RPCs com GRANT efetivo que ainda chamam assert/write v2 ou delegam para writers v2.",
      "Substituir cada fluxo por reserve, complete e fail de recibo com chave semântica, principal, payload_hash e estado persistido.",
      "Fazer pending concorrente aguardar ou retornar estado controlado e completed reproduzir exatamente o resultado vencedor.",
      "Revogar EXECUTE dos contratos v2 legados e adicionar preflight que falhe se qualquer caminho concedido ainda os referenciar."
    ],
    "acceptanceTests": [
      "nenhuma RPC concedida referencia mhidas_ticket_assert_receipt_replay_v2 ou mhidas_ticket_write_operation_receipt_v2.",
      "duas chamadas simultâneas com mesma chave e payload produzem um único efeito.",
      "replay completed retorna o mesmo result_id e o mesmo resultado serializado.",
      "mesma chave com payload divergente é rejeitada sem executar mutação.",
      "preflight bloqueia promoção quando encontra contrato v2 alcançável por GRANT."
    ],
    "prerequisites": [
      "parallel_concurrency_and_failure_tests",
      "admin_authorization_rpc_contract"
    ]
  },
  {
    "key": "trusted_integration_identity_not_credential_bound",
    "severity": "critical",
    "phase": "credential_bound_integration_identity",
    "title": "Derivar a integração de credencial verificada pelo servidor",
    "objective": "Impedir que service_role escolha livremente integration_id e provider_namespace.",
    "requiredChanges": [
      "Criar contexto server-side imutável contendo integration_id, credential_version_id, provider_namespace e verifier_evidence_hash.",
      "Remover integration_id e provider_namespace como autoridade do payload, mantendo-os apenas como valores de conferência quando necessários.",
      "Validar status da integração, parceiro, credencial e scope na mesma transação antes de registrar conversão.",
      "Persistir credential_version_id, verificador, namespace derivado e correlação no recibo e na auditoria."
    ],
    "acceptanceTests": [
      "credencial ativa resolve exatamente uma integração e namespace.",
      "payload que tenta declarar outra integração é rejeitado.",
      "credencial revogada ou rotacionada não autoriza nova conversão.",
      "recibo registra a versão da credencial usada na autorização.",
      "auditoria permite reconstruir quem verificou a credencial e qual integração foi derivada."
    ],
    "prerequisites": [
      "server_side_url_and_credential_validator",
      "provider_namespace_and_credentials_registry"
    ]
  },
  {
    "key": "partner_lifecycle_not_idempotent_or_transition_constrained",
    "severity": "critical",
    "phase": "partner_and_retention_lifecycle",
    "title": "Tornar o lifecycle do parceiro idempotente e governado por matriz",
    "objective": "Permitir somente transições válidas com recibo, prova e snapshots completos.",
    "requiredChanges": [
      "Definir matriz explícita para pending, verified, suspended e deactivated, incluindo estados terminais e reativação permitida.",
      "Reservar recibo atômico antes da transição e validar expected_lock_version, payload_hash e evidência administrativa.",
      "Manter verified_at, suspended_at e deactivated_at coerentes com o novo estado, limpando apenas campos permitidos pela matriz.",
      "Registrar before/after, ator, motivo, evidência, lock_version e resultado no audit log append-only."
    ],
    "acceptanceTests": [
      "pending para verified exige evidência válida e atualiza verified_at.",
      "verified para suspended atualiza suspended_at e preserva histórico de verificação.",
      "transição inválida é rejeitada antes de qualquer efeito.",
      "replay da mesma transição retorna o resultado original sem incrementar lock_version.",
      "auditoria contém snapshots anterior e posterior completos."
    ],
    "prerequisites": [
      "verified_partner_and_integration_onboarding",
      "admin_authorization_rpc_contract"
    ]
  },
  {
    "key": "retention_retirement_not_idempotent_or_state_guarded",
    "severity": "critical",
    "phase": "partner_and_retention_lifecycle",
    "title": "Restringir aposentadoria de política a active para retired",
    "objective": "Impedir retirement fora do estado ativo e garantir replay determinístico.",
    "requiredChanges": [
      "Exigir policy_status = active e expected_lock_version antes da aposentadoria.",
      "Reservar recibo atômico e vincular idempotency_key ao ator, policy_id, payload_hash e operação.",
      "Executar pausa de canais dependentes na mesma transação ou bloquear a operação quando o modo cascata não for autorizado.",
      "Persistir retired_at, motivo, before/after e relatório determinístico dos canais afetados."
    ],
    "acceptanceTests": [
      "active para retired é aceita com lock e evidência válidos.",
      "draft, approved ou retired para retired é rejeitada.",
      "replay não altera lock_version nem duplica auditoria.",
      "retirement em cascata pausa todos os canais dependentes atomicamente.",
      "falha intermediária reverte policy, canais, recibo e auditorias da transação."
    ],
    "prerequisites": [
      "legal_retention_and_anonymization",
      "parallel_concurrency_and_failure_tests"
    ]
  },
  {
    "key": "cascade_mutations_lack_per_object_audit",
    "severity": "critical",
    "phase": "cascade_audit_integrity",
    "title": "Gerar auditoria individual para cada mutação em cascata",
    "objective": "Eliminar efeitos dependentes sem lineage append-only por objeto.",
    "requiredChanges": [
      "Capturar before/after de cada integração, scope e canal afetado antes de executar os UPDATEs em lote.",
      "Inserir uma entrada de auditoria por objeto com target_type, target_id, chave composta, versão e correlation_id comum.",
      "Registrar resultado, causa raiz, objeto pai e ordem da cascata para permitir reconstrução determinística.",
      "Fazer a transação falhar se qualquer auditoria individual não puder ser gravada."
    ],
    "acceptanceTests": [
      "suspensão de parceiro gera auditoria para o parceiro e para cada integração e scope alterado.",
      "revogação de integração gera auditoria para cada scope afetado.",
      "retirement de policy gera auditoria para cada canal pausado.",
      "todas as entradas compartilham correlation_id e identificam o objeto pai.",
      "ausência de uma auditoria individual provoca rollback completo da cascata."
    ],
    "prerequisites": [
      "admin_authorization_rpc_contract",
      "production_backup_and_rollback_plan"
    ]
  },
  {
    "key": "trusted_integration_onboarding_and_rotation_path_missing",
    "severity": "high",
    "phase": "integration_onboarding_rotation_and_scope",
    "title": "Criar onboarding e rotação transacionais de integração",
    "objective": "Administrar criação e credenciais sem mutação direta ou perda de histórico.",
    "requiredChanges": [
      "Criar RPC de onboarding com parceiro verified, namespace permitido, expected partner lock e evidência de verificação.",
      "Criar tabela ou registro histórico de versões de credencial com status active, rotated e revoked.",
      "Criar RPC de rotação que ative nova versão e revogue a anterior atomicamente com recibo e auditoria.",
      "Bloquear UPDATE direto de credential_reference_hash e verification_evidence_hash fora das RPCs administradas."
    ],
    "acceptanceTests": [
      "onboarding cria integração e primeira versão de credencial em uma transação.",
      "parceiro não verificado não pode receber integração ativa.",
      "rotação ativa uma única versão e revoga a anterior.",
      "credencial anterior deixa de autorizar chamadas após commit.",
      "replay de onboarding ou rotação retorna o mesmo resultado sem duplicar versões."
    ],
    "prerequisites": [
      "verified_partner_and_integration_onboarding",
      "provider_namespace_and_credentials_registry"
    ]
  },
  {
    "key": "integration_scope_terminal_insert_and_audit_identity_ambiguous",
    "severity": "high",
    "phase": "integration_onboarding_rotation_and_scope",
    "title": "Restringir criação de scope e identificar a chave composta na auditoria",
    "objective": "Impedir INSERT em estado terminal e remover ambiguidade entre integração e canal.",
    "requiredChanges": [
      "Permitir INSERT de scope somente no estado inicial autorizado definido pela matriz.",
      "Exigir registro existente, expected_lock_version e transição válida para suspend e revoke.",
      "Eliminar UPSERT genérico e separar comandos de create, transition e revoke com recibos próprios.",
      "Registrar integration_id, channel_id e identificador composto estável em auditoria e resultados."
    ],
    "acceptanceTests": [
      "authorize cria scope ausente no estado inicial permitido.",
      "suspend ou revoke sobre scope ausente é rejeitado.",
      "transição usa expected_lock_version e falha sob versão divergente.",
      "auditoria identifica inequivocamente integration_id e channel_id.",
      "replay não cria scope duplicado nem altera versão."
    ],
    "prerequisites": [
      "admin_authorization_rpc_contract",
      "parallel_concurrency_and_failure_tests"
    ]
  },
  {
    "key": "admin_full_purchase_signal_read_path_missing",
    "severity": "high",
    "phase": "admin_read_retention_and_re_review",
    "title": "Criar leitura administrativa mínima, auditada e por finalidade",
    "objective": "Restaurar reconciliação técnica sem reabrir SELECT amplo para authenticated.",
    "requiredChanges": [
      "Manter a superfície redigida para clubbers e criar RPC ou view security definer exclusiva para administradores autorizados.",
      "Exigir finalidade, escopo do evento, correlação e limite temporal em cada consulta administrativa.",
      "Retornar somente campos técnicos e financeiros necessários à finalidade declarada.",
      "Registrar cada leitura administrativa com ator, finalidade, filtros, quantidade e hash da resposta."
    ],
    "acceptanceTests": [
      "clubber continua sem acesso a hashes e valores sensíveis.",
      "administrador autorizado consulta somente o evento e período permitidos.",
      "finalidade ausente ou inválida bloqueia a consulta.",
      "resposta não inclui campos fora da allowlist da finalidade.",
      "cada leitura gera auditoria append-only com quantidade e hash da resposta."
    ],
    "prerequisites": [
      "admin_authorization_rpc_contract",
      "commercial_financial_semantics"
    ]
  },
  {
    "key": "audit_and_receipt_retention_contract_missing",
    "severity": "high",
    "phase": "admin_read_retention_and_re_review",
    "title": "Definir retenção e anonimização para auditoria e recibos",
    "objective": "Limitar dados identificáveis sem destruir evidência necessária de governança.",
    "requiredChanges": [
      "Adicionar retention_policy_version_id, retention_expires_at, retention_status e processed_at em auditoria e recibos.",
      "Classificar campos preserváveis, anonimizáveis e elimináveis por tipo de operação e base legal.",
      "Criar batch server-resolved com lock, relatório, recibo e auditoria para anonimização ou expurgo permitido.",
      "Bloquear remoção de evidência sob hold, disputa, reconciliação ou obrigação legal ativa."
    ],
    "acceptanceTests": [
      "novas auditorias e recibos recebem política e data de expiração válidas.",
      "batch anonimiza identificadores permitidos e preserva hashes probatórios necessários.",
      "registro sob legal hold não é alterado.",
      "replay do batch retorna o mesmo relatório sem repetir efeitos.",
      "quinta revisão estrutural confirma retenção, leitura admin e todos os oito ajustes anteriores."
    ],
    "prerequisites": [
      "legal_retention_and_anonymization",
      "fifth_independent_structural_review"
    ]
  }
] as const satisfies readonly EventTicketCommercialFifthAdjustmentPlanItem[];

export const EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_EXTERNAL_PREREQUISITES =
  [
  "fresh_production_schema_inventory",
  "admin_authorization_rpc_contract",
  "verified_partner_and_integration_onboarding",
  "commercial_financial_semantics",
  "server_side_url_and_credential_validator",
  "provider_namespace_and_credentials_registry",
  "legal_retention_and_anonymization",
  "parallel_concurrency_and_failure_tests",
  "production_backup_and_rollback_plan",
  "fifth_independent_structural_review"
] as const;

export const EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PLAN = {
  version: EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_FIFTH_ADJUSTMENT_PLAN_VERSION,
  baseVersion: EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_FIFTH_ADJUSTMENT_PLAN_BASE_VERSION,
  baseCommit: EVENT_TICKET_COMMERCIAL_THIRD_CORRECTED_DRAFT_FIFTH_ADJUSTMENT_PLAN_BASE_COMMIT,
  decision: "fifth_adjustment_plan_ready",
  phases: EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PHASES,
  items: EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_ITEMS,
  externalPrerequisites: EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_EXTERNAL_PREREQUISITES,
  nextAllowedArtifact: "fourth_corrected_adjusted_migration_draft_safe",
  reviewedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export type EventTicketCommercialFifthAdjustmentPlanRequest = {
  requestSqlMutation?: boolean;
  requestExecutableMigration?: boolean;
  requestMoveToSupabaseMigrations?: boolean;
  requestSupabaseOperation?: boolean;
  requestDatabaseWrite?: boolean;
  requestPublicActivation?: boolean;
};

export type EventTicketCommercialFifthAdjustmentPlanState =
  | "fifth_adjustment_plan_ready"
  | "blocked_sql_mutation_requested"
  | "blocked_executable_migration_requested"
  | "blocked_move_to_supabase_migrations_requested"
  | "blocked_supabase_operation_requested"
  | "blocked_database_write_requested"
  | "blocked_public_activation_requested";

export function evaluateEventTicketCommercialFifthAdjustmentPlan(
  request: EventTicketCommercialFifthAdjustmentPlanRequest = {},
): {
  ok: boolean;
  state: EventTicketCommercialFifthAdjustmentPlanState;
  reason: string;
  plan: typeof EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PLAN;
} {
  const blocked: ReadonlyArray<[
    keyof EventTicketCommercialFifthAdjustmentPlanRequest,
    EventTicketCommercialFifthAdjustmentPlanState,
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
      return { ok: false, state, reason, plan: EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PLAN };
    }
  }

  return {
    ok: true,
    state: "fifth_adjustment_plan_ready",
    reason: "Plano técnico concluído; nove ajustes devem ser aplicados em um novo rascunho protegido.",
    plan: EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PLAN,
  };
}

export function runEventTicketCommercialFifthAdjustmentPlanSelfTest(): {
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

  const items = EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_ITEMS;
  const criticalCount = items.filter((item) => item.severity === "critical").length;
  const highCount = items.filter((item) => item.severity === "high").length;
  const acceptanceCount = items.reduce((total, item) => total + item.acceptanceTests.length, 0);
  const phaseKeys = new Set(EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PHASES.map((phase) => phase.phaseKey));

  add("decision_ready", EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PLAN.decision === "fifth_adjustment_plan_ready", "decision preserved");
  add("six_phases", EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PHASES.length === 6, `count=${EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PHASES.length}`);
  add("nine_items", items.length === 9, `count=${items.length}`);
  add("five_critical", criticalCount === 5, `count=${criticalCount}`);
  add("four_high", highCount === 4, `count=${highCount}`);
  add("forty_five_acceptance_tests", acceptanceCount === 45, `count=${acceptanceCount}`);
  add("all_phases_known", items.every((item) => phaseKeys.has(item.phase)), "all items mapped");
  add("all_have_four_changes", items.every((item) => item.requiredChanges.length === 4), "four changes per item");
  add("all_have_five_tests", items.every((item) => item.acceptanceTests.length === 5), "five tests per item");
  add("external_prerequisites_open", EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_EXTERNAL_PREREQUISITES.length === 10, "ten prerequisites open");
  add("next_artifact", EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PLAN.nextAllowedArtifact === "fourth_corrected_adjusted_migration_draft_safe", "next artifact constrained");
  add("promotion_blocked", EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PLAN.promotionToExecutableMigrationAllowed === false, "promotion blocked");
  add("reviewed_sql_preserved", EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PLAN.reviewedSqlChanged === false, "v4.8.99 SQL unchanged");
  add("no_supabase", EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PLAN.supabaseOperationPerformed === false, "Supabase untouched");
  add("no_database_write", EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PLAN.databaseWritePerformed === false, "database untouched");

  for (const item of items) {
    add(`item_${item.key}`, item.prerequisites.length >= 1, item.title);
  }

  return {
    ok: checks.every((check) => check.ok),
    checks,
    phaseCount: EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_PHASES.length,
    requiredAdjustmentCount: items.length,
    criticalAdjustmentCount: criticalCount,
    highAdjustmentCount: highCount,
    acceptanceTestCount: acceptanceCount,
    externalPrerequisiteCount: EVENT_TICKET_COMMERCIAL_FIFTH_ADJUSTMENT_EXTERNAL_PREREQUISITES.length,
    promotionAllowed: false,
  };
}
