// src/app/api/official-events/_shared/eventTicketCommercialMigrationCorrectedAdjustedDraftThirdAdjustmentPlan.ts

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN_VERSION =
  "v4.8.95-event-ticket-commercial-corrected-draft-third-adjustment-plan-safe" as const;

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN_BASE_VERSION =
  "v4.8.94-event-ticket-commercial-migration-corrected-adjusted-draft-structural-review-safe" as const;

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN_BASE_COMMIT =
  "19f0b1cc380c98a8d39cc4df7122acb0497368c4" as const;

export const EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT_SQL_SHA256 =
  "4DC566C2B3259DEC30498BC4BD3FF77AA9B52AA0D9A9F8B65013DD81B15CFECE" as const;

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW_DOC_SHA256 =
  "33B57CC80D586F14EA9BCC945D66BB97428B2BC62D6F25E1CB407326F6A30D07" as const;

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW_CONTRACT_SHA256 =
  "1B4A52F5DCFDA1517685E91145796B873C6603CC1C78216712E4BBFA938CF5E6" as const;

export type EventTicketCommercialThirdAdjustmentSeverity = "critical" | "high";

export type EventTicketCommercialThirdAdjustmentPlanItem = {
  key: string;
  severity: EventTicketCommercialThirdAdjustmentSeverity;
  phase: string;
  title: string;
  objective: string;
  requiredChanges: readonly string[];
  acceptanceTests: readonly string[];
  prerequisites: readonly string[];
};

export const EVENT_TICKET_COMMERCIAL_THIRD_ADJUSTMENT_PHASES =
  [
  {
    "phaseKey": "privileges_and_read_surfaces",
    "title": "Fechar privilégios e superfícies de leitura",
    "objective": "Garantir que RPCs e leituras declaradas tenham privilégios efetivos e mínimos."
  },
  {
    "phaseKey": "signal_identity_and_context",
    "title": "Fechar identidade, contexto e idempotência dos sinais",
    "objective": "Vincular sinais ao principal, integração, evento, canal e clique corretos."
  },
  {
    "phaseKey": "retention_and_policy_binding",
    "title": "Vincular retenção à política ativa",
    "objective": "Resolver política e prazo no servidor, sem controle do chamador."
  },
  {
    "phaseKey": "communication_receipt_model",
    "title": "Corrigir recibos de comunicações",
    "objective": "Suportar comunicações com e sem evento usando alvos idempotentes não nulos."
  },
  {
    "phaseKey": "conversion_lineage_and_evidence",
    "title": "Fechar lineage e matriz de evidências",
    "objective": "Aplicar transições fail-closed e progressão confiável até conversão confirmada."
  },
  {
    "phaseKey": "url_evidence_and_re_review",
    "title": "Endurecer evidência de URL e revisar novamente",
    "objective": "Rejeitar provas temporais inválidas e submeter novo rascunho a revisão independente."
  }
] as const;

export const EVENT_TICKET_COMMERCIAL_THIRD_ADJUSTMENT_ITEMS =
  [
  {
    "key": "url_validation_rpc_not_executable_by_service_role",
    "severity": "critical",
    "phase": "privileges_and_read_surfaces",
    "title": "Conceder execução mínima da RPC de validação",
    "objective": "Permitir que somente service_role registre validações de URL sem abrir execução a outros papéis.",
    "requiredChanges": [
      "Adicionar GRANT EXECUTE explícito da função versionada exclusivamente para service_role.",
      "Manter REVOKE ALL de public, anon e authenticated e validar ausência de grant indireto por PUBLIC.",
      "Adicionar preflight que compare proacl efetiva, owner e assinatura exata da função antes da promoção.",
      "Registrar o contrato de privilégio no self-test e no relatório de drift da migration futura."
    ],
    "acceptanceTests": [
      "service_role consegue executar a RPC com payload válido.",
      "anon não consegue executar a RPC.",
      "authenticated não consegue executar a RPC.",
      "PUBLIC não possui EXECUTE residual.",
      "preflight falha quando assinatura, owner ou ACL divergem."
    ],
    "prerequisites": [
      "admin_authorization_rpc_contract",
      "server_side_url_validator"
    ]
  },
  {
    "key": "rls_read_policies_without_table_select_grants",
    "severity": "critical",
    "phase": "privileges_and_read_surfaces",
    "title": "Alinhar grants de leitura às policies ou RPCs",
    "objective": "Criar caminhos de leitura efetivos sem ampliar o acesso além das policies aprovadas.",
    "requiredChanges": [
      "Inventariar cada policy SELECT e definir se o acesso será por GRANT SELECT mínimo ou por RPC SECURITY DEFINER dedicada.",
      "Aplicar grants por tabela ou coluna somente aos papéis que possuem caminho de leitura aprovado.",
      "Remover policies sem consumidor real quando a leitura for exclusivamente por RPC.",
      "Adicionar testes de privilégio e RLS para parceiro, clubber, administrador, anon e service_role."
    ],
    "acceptanceTests": [
      "parceiro autorizado lê somente solicitações do próprio parceiro.",
      "clubber lê somente dados públicos ou próprios definidos no contrato.",
      "administrador autorizado acessa a visão administrativa prevista.",
      "papel sem grant recebe permission denied antes de qualquer vazamento.",
      "policy sem grant ou grant sem policy é detectado pelo preflight."
    ],
    "prerequisites": [
      "admin_authorization_rpc_contract",
      "verified_partner_onboarding"
    ]
  },
  {
    "key": "purchase_signal_click_context_not_validated",
    "severity": "critical",
    "phase": "signal_identity_and_context",
    "title": "Validar contexto integral do clique",
    "objective": "Impedir que click_id de outro evento, canal ou usuário contamine lineage e atribuição.",
    "requiredChanges": [
      "Consultar event_ticket_click_attributions antes do insert e bloquear click inexistente ou incompatível.",
      "Exigir igualdade de canonical_event_id e channel_id entre clique, sinal e parent_signal quando presentes.",
      "Exigir consistência de user_id ou principal quando o clique estiver identificado.",
      "Persistir snapshot mínimo do vínculo validado e registrar rejeições com motivo estruturado."
    ],
    "acceptanceTests": [
      "clique do mesmo evento, canal e usuário é aceito.",
      "clique de outro evento é rejeitado.",
      "clique de outro canal é rejeitado.",
      "clique de outro usuário ou principal é rejeitado quando identificado.",
      "clique inexistente não cria sinal nem recibo concluído."
    ],
    "prerequisites": [
      "parallel_concurrency_and_failure_tests"
    ]
  },
  {
    "key": "retention_policy_is_caller_controlled_and_not_active_bound",
    "severity": "critical",
    "phase": "retention_and_policy_binding",
    "title": "Resolver política ativa de retenção no servidor",
    "objective": "Remover do chamador o poder de escolher versão e prazo de retenção.",
    "requiredChanges": [
      "Remover retention_policy_version_id e retention_expires_at do contrato público de gravação de sinais.",
      "Resolver server-side a única versão active aplicável por finalidade, jurisdição e tipo de evidência.",
      "Calcular retention_expires_at a partir de recorded_at e retention_days versionados.",
      "Bloquear authorize, activate e tracking quando não houver política active compatível."
    ],
    "acceptanceTests": [
      "política active compatível é resolvida e o prazo é derivado corretamente.",
      "política draft, approved não ativa ou retired é rejeitada.",
      "chamador não consegue antecipar ou estender retention_expires_at.",
      "duas políticas active conflitantes bloqueiam o fluxo por drift.",
      "canal rastreado sem política active não pode ser autorizado ou ativado."
    ],
    "prerequisites": [
      "privacy_legal_basis_and_retention",
      "commercial_financial_semantics"
    ]
  },
  {
    "key": "purchase_signal_idempotency_scope_conflicts_with_receipts",
    "severity": "high",
    "phase": "signal_identity_and_context",
    "title": "Unificar a autoridade de idempotência dos sinais",
    "objective": "Eliminar colisão global de idempotency_key entre principais independentes.",
    "requiredChanges": [
      "Definir event_ticket_operation_receipts como autoridade de idempotência para criação de sinais.",
      "Remover a unicidade global isolada de purchase_signals.idempotency_key ou substituí-la por chave semanticamente equivalente ao recibo.",
      "Persistir receipt_id no sinal para lineage operacional auditável.",
      "Adicionar preflight que rejeite coexistência de índices com escopos semânticos divergentes."
    ],
    "acceptanceTests": [
      "dois principais diferentes podem usar a mesma chave sem colisão.",
      "mesmo principal e mesmo payload recebe o mesmo resultado.",
      "mesmo principal e payload divergente é rejeitado.",
      "cada sinal criado referencia o recibo autoritativo.",
      "índice global legado ou divergente é detectado antes da promoção."
    ],
    "prerequisites": [
      "parallel_concurrency_and_failure_tests"
    ]
  },
  {
    "key": "non_event_communication_receipt_target_is_nullable",
    "severity": "critical",
    "phase": "communication_receipt_model",
    "title": "Definir alvo idempotente para comunicação sem evento",
    "objective": "Permitir rascunhos não vinculados a evento sem violar target_id NOT NULL.",
    "requiredChanges": [
      "Adicionar target_type versionado para partner, communication e canonical_event no contrato de recibos.",
      "Usar canonical_event_id somente quando a comunicação for realmente orientada a evento.",
      "Usar partner_id ou communication_id estável para categorias sem evento, conforme momento da operação.",
      "Validar igualdade entre target_type, target_id e payload no replay idempotente."
    ],
    "acceptanceTests": [
      "comunicação de evento usa canonical_event como alvo.",
      "music_release sem evento cria rascunho e recibo válido.",
      "exclusive_content sem evento cria rascunho e recibo válido.",
      "replay com target_type ou target_id diferente é rejeitado.",
      "nenhuma operação grava recibo com target_id nulo."
    ],
    "prerequisites": [
      "admin_authorization_rpc_contract"
    ]
  },
  {
    "key": "trusted_integration_principal_not_namespaced",
    "severity": "high",
    "phase": "signal_identity_and_context",
    "title": "Namespaciar a identidade de integrações confiáveis",
    "objective": "Impedir colisões e impersonação entre provedores que usam a mesma chave idempotente.",
    "requiredChanges": [
      "Criar integration_id estável ligado ao registro oficial de namespaces de provedores.",
      "Usar principal_type trusted_ticketing_integration e principal_id igual ao integration_id validado.",
      "Exigir correspondência entre integration_id, provider_namespace, credencial e evento/canal autorizado.",
      "Bloquear namespace não registrado, suspenso, revogado ou divergente do principal autenticado."
    ],
    "acceptanceTests": [
      "duas integrações distintas reutilizam a mesma chave sem colisão.",
      "namespace divergente da integração autenticada é rejeitado.",
      "integração suspensa ou revogada é rejeitada.",
      "recibo e sinal persistem integration_id e provider_namespace coerentes.",
      "integração não registrada não cria sinal nem resultado idempotente."
    ],
    "prerequisites": [
      "ticketing_provider_namespace_registry",
      "verified_partner_onboarding"
    ]
  },
  {
    "key": "signal_actor_type_evidence_matrix_missing",
    "severity": "critical",
    "phase": "conversion_lineage_and_evidence",
    "title": "Aplicar matriz ator × sinal × evidência",
    "objective": "Impedir que clubbers, parceiros ou integrações emitam classes de evidência que não lhes pertencem.",
    "requiredChanges": [
      "Definir matriz versionada fail-closed para actor_role, signal_type, evidence_source e campos permitidos.",
      "Rejeitar combinações não previstas em vez de normalizá-las silenciosamente.",
      "Limpar do contrato de entrada campos reservados e calculá-los server-side quando aplicável.",
      "Registrar matrix_version e motivo de rejeição sem armazenar payload bruto."
    ],
    "acceptanceTests": [
      "clubber pode registrar somente tipos e evidências autodeclarados permitidos.",
      "clubber não pode declarar commercial_link_click de infraestrutura.",
      "integração confiável aceita somente evidências vinculadas ao namespace autenticado.",
      "parceiro não pode declarar confirmação financeira reservada.",
      "combinação desconhecida é rejeitada por padrão e auditada de forma redigida."
    ],
    "prerequisites": [
      "commercial_financial_semantics",
      "ticketing_provider_namespace_registry"
    ]
  },
  {
    "key": "confirmed_conversion_lineage_semantics_incomplete",
    "severity": "critical",
    "phase": "conversion_lineage_and_evidence",
    "title": "Definir grafo de lineage da conversão confirmada",
    "objective": "Exigir progressão comercial coerente e impedir confirmação duplicada ou cruzada.",
    "requiredChanges": [
      "Definir transições permitidas entre intent, click, attributed_conversion, confirmed_conversion e correction.",
      "Exigir parent attributed_conversion compatível para confirmed_conversion, salvo fluxo excepcional explicitamente versionado.",
      "Validar igualdade de evento, canal, integration/provider namespace e transaction_hash entre os nós aplicáveis.",
      "Impor unicidade de confirmação confiável por provedor e transação, preservando correções como novos nós."
    ],
    "acceptanceTests": [
      "attributed_conversion compatível pode originar uma confirmação.",
      "parent de tipo não permitido é rejeitado.",
      "evento, canal, provedor ou transação divergente é rejeitado.",
      "segunda confirmação da mesma transação é rejeitada ou retorna replay idempotente.",
      "correção cria novo nó e preserva lineage completo sem editar o sinal original."
    ],
    "prerequisites": [
      "commercial_financial_semantics",
      "parallel_concurrency_and_failure_tests"
    ]
  },
  {
    "key": "url_freshness_accepts_future_clock_and_missing_health_evidence",
    "severity": "high",
    "phase": "url_evidence_and_re_review",
    "title": "Endurecer tempo e evidência de health check",
    "objective": "Rejeitar timestamps futuros e provas saudáveis sem hash ou versão verificável.",
    "requiredChanges": [
      "Definir tolerância máxima de clock e rejeitar validated_at ou last_health_checked_at além da janela futura permitida.",
      "Exigir last_health_check_hash, validator_version e evidence_recorded_at em qualquer estado healthy.",
      "Vincular o hash à URL normalizada, resolved_host_hash, redirect_chain_hash, status e instante da verificação.",
      "Fazer authorize, activate, resume, cutover e resolvedor público reutilizarem a mesma função fail-closed."
    ],
    "acceptanceTests": [
      "timestamp futuro além da tolerância é rejeitado.",
      "health_status healthy sem hash é rejeitado.",
      "hash incompatível com URL ou cadeia de redirect é rejeitado.",
      "prova válida dentro da tolerância e da janela de freshness é aceita.",
      "resolver público retorna fallback quando qualquer evidência temporal ou criptográfica estiver ausente."
    ],
    "prerequisites": [
      "server_side_url_validator",
      "parallel_concurrency_and_failure_tests"
    ]
  }
] as const satisfies readonly EventTicketCommercialThirdAdjustmentPlanItem[];

export const EVENT_TICKET_COMMERCIAL_THIRD_ADJUSTMENT_EXTERNAL_PREREQUISITES =
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
    "prerequisiteKey": "verified_partner_onboarding",
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
    "prerequisiteKey": "ticketing_provider_namespace_registry",
    "closed": false
  },
  {
    "prerequisiteKey": "privacy_legal_basis_and_retention",
    "closed": false
  },
  {
    "prerequisiteKey": "legacy_partner_and_event_mapping",
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

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN = {
  version: EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN_VERSION,
  baseVersion:
    EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN_BASE_VERSION,
  baseCommit:
    EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN_BASE_COMMIT,
  decision: "third_adjustment_plan_ready",
  decisionReason:
    "Os dez bloqueadores da revisão v4.8.94 foram convertidos em correções técnicas verificáveis, sem alterar o SQL protegido.",
  reviewedSqlSha256: EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT_SQL_SHA256,
  phases: EVENT_TICKET_COMMERCIAL_THIRD_ADJUSTMENT_PHASES,
  adjustments: EVENT_TICKET_COMMERCIAL_THIRD_ADJUSTMENT_ITEMS,
  externalPrerequisites:
    EVENT_TICKET_COMMERCIAL_THIRD_ADJUSTMENT_EXTERNAL_PREREQUISITES,
  nextAllowedArtifact: "second_corrected_adjusted_migration_draft_safe",
  promotionToExecutableMigrationAllowed: false,
  reviewedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  publicTicketLinkActivated: false,
} as const;

export type EventTicketCommercialThirdAdjustmentPlanRequest = {
  requestSqlMutation?: boolean | null;
  requestExecutableMigration?: boolean | null;
  requestMoveToSupabaseMigrations?: boolean | null;
  requestSupabaseOperation?: boolean | null;
  requestDatabaseWrite?: boolean | null;
  requestPublicActivation?: boolean | null;
};

export type EventTicketCommercialThirdAdjustmentPlanState =
  | "third_adjustment_plan_ready"
  | "blocked_sql_mutation_requested"
  | "blocked_executable_migration_requested"
  | "blocked_move_to_supabase_migrations_requested"
  | "blocked_supabase_operation_requested"
  | "blocked_database_write_requested"
  | "blocked_public_activation_requested";

export function evaluateEventTicketCommercialThirdAdjustmentPlan(
  request: EventTicketCommercialThirdAdjustmentPlanRequest = {}
): {
  ok: boolean;
  state: EventTicketCommercialThirdAdjustmentPlanState;
  reason: string;
  plan: typeof EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN;
} {
  const blocked: ReadonlyArray<[
    keyof EventTicketCommercialThirdAdjustmentPlanRequest,
    EventTicketCommercialThirdAdjustmentPlanState,
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
      return {
        ok: false,
        state,
        reason,
        plan: EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN,
      };
    }
  }

  return {
    ok: true,
    state: "third_adjustment_plan_ready",
    reason:
      "Plano dos dez bloqueadores concluído; o próximo artefato permitido é um novo rascunho SQL protegido.",
    plan: EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN,
  };
}

export function runEventTicketCommercialThirdAdjustmentPlanSelfTest(): {
  ok: boolean;
  checks: ReadonlyArray<{ checkKey: string; ok: boolean; detail: string }>;
  phaseCount: number;
  adjustmentCount: number;
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

  const items = EVENT_TICKET_COMMERCIAL_THIRD_ADJUSTMENT_ITEMS;
  const phases = EVENT_TICKET_COMMERCIAL_THIRD_ADJUSTMENT_PHASES;
  const criticalCount = items.filter((item) => item.severity === "critical").length;
  const highCount = items.filter((item) => item.severity === "high").length;
  const acceptanceCount = items.reduce(
    (total, item) => total + item.acceptanceTests.length,
    0
  );
  const knownPrerequisites = new Set(
    EVENT_TICKET_COMMERCIAL_THIRD_ADJUSTMENT_EXTERNAL_PREREQUISITES.map(
      (item) => item.prerequisiteKey
    )
  );

  add("version", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN_VERSION === "v4.8.95-event-ticket-commercial-corrected-draft-third-adjustment-plan-safe", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN_VERSION);
  add("base_version", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN_BASE_VERSION === "v4.8.94-event-ticket-commercial-migration-corrected-adjusted-draft-structural-review-safe", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN_BASE_VERSION);
  add("base_commit", /^[0-9a-f]{40}$/.test(EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN_BASE_COMMIT), EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN_BASE_COMMIT);
  add("sql_hash", /^[A-F0-9]{64}$/.test(EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT_SQL_SHA256), EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT_SQL_SHA256);
  add("review_doc_hash", /^[A-F0-9]{64}$/.test(EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW_DOC_SHA256), EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW_DOC_SHA256);
  add("review_contract_hash", /^[A-F0-9]{64}$/.test(EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW_CONTRACT_SHA256), EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW_CONTRACT_SHA256);
  add("phase_count", phases.length === 6, String(phases.length));
  add("phase_keys_unique", new Set(phases.map((phase) => phase.phaseKey)).size === 6, "Seis fases únicas.");
  add("adjustment_count", items.length === 10, String(items.length));
  add("adjustment_keys_unique", new Set(items.map((item) => item.key)).size === 10, "Dez ajustes únicos.");
  add("critical_count", criticalCount === 7, String(criticalCount));
  add("high_count", highCount === 3, String(highCount));
  add("acceptance_count", acceptanceCount === 50, String(acceptanceCount));
  add("each_adjustment_has_four_changes", items.every((item) => item.requiredChanges.length === 4), "Quatro mudanças por ajuste.");
  add("each_adjustment_has_five_tests", items.every((item) => item.acceptanceTests.length === 5), "Cinco testes por ajuste.");
  add("all_phases_known", items.every((item) => phases.some((phase) => phase.phaseKey === item.phase)), "Todos os ajustes pertencem a fase conhecida.");
  add("all_prerequisites_known", items.every((item) => item.prerequisites.every((key) => knownPrerequisites.has(key))), "Pré-requisitos internos ao registro conhecido.");
  add("external_prerequisite_count", EVENT_TICKET_COMMERCIAL_THIRD_ADJUSTMENT_EXTERNAL_PREREQUISITES.length === 10, String(EVENT_TICKET_COMMERCIAL_THIRD_ADJUSTMENT_EXTERNAL_PREREQUISITES.length));
  add("external_prerequisites_open", EVENT_TICKET_COMMERCIAL_THIRD_ADJUSTMENT_EXTERNAL_PREREQUISITES.every((item) => item.closed === false), "Todas permanecem abertas.");
  add("decision", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN.decision === "third_adjustment_plan_ready", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN.decision);
  add("next_artifact", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN.nextAllowedArtifact === "second_corrected_adjusted_migration_draft_safe", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN.nextAllowedArtifact);
  add("promotion_blocked", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN.promotionToExecutableMigrationAllowed === false, "promotion=false");
  add("sql_preserved", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_THIRD_ADJUSTMENT_PLAN.reviewedSqlChanged === false, "reviewedSqlChanged=false");

  const forbidden: EventTicketCommercialThirdAdjustmentPlanRequest[] = [
    { requestSqlMutation: true },
    { requestExecutableMigration: true },
    { requestMoveToSupabaseMigrations: true },
    { requestSupabaseOperation: true },
    { requestDatabaseWrite: true },
    { requestPublicActivation: true },
  ];
  add("forbidden_requests_blocked", forbidden.every((request) => evaluateEventTicketCommercialThirdAdjustmentPlan(request).ok === false), "Seis operações proibidas recusadas.");
  add("safe_plan_result", evaluateEventTicketCommercialThirdAdjustmentPlan().state === "third_adjustment_plan_ready", "third_adjustment_plan_ready");

  return {
    ok: checks.every((check) => check.ok),
    checks,
    phaseCount: phases.length,
    adjustmentCount: items.length,
    criticalAdjustmentCount: criticalCount,
    highAdjustmentCount: highCount,
    acceptanceTestCount: acceptanceCount,
    externalPrerequisiteCount:
      EVENT_TICKET_COMMERCIAL_THIRD_ADJUSTMENT_EXTERNAL_PREREQUISITES.length,
    promotionAllowed: false,
  };
}
