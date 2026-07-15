// src/app/api/official-events/_shared/eventTicketCommercialMigrationAdjustedDraftSecondAdjustmentPlan.ts

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN_VERSION =
  "v4.8.92-event-ticket-commercial-adjusted-draft-second-adjustment-plan-safe" as const;

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN_BASE_VERSION =
  "v4.8.91-event-ticket-commercial-migration-adjusted-draft-structural-review-safe" as const;

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN_BASE_COMMIT =
  "4f70e1b3d1b35b1b38d5a502ada1cc06b2bb3777" as const;

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SQL_SHA256 =
  "2E6BE6D1DA005548E6272AD79432922B91778C5103AD4D7281699450F46A1F3C" as const;

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW_DOC_SHA256 =
  "AF4E5199AA28A5D283CEA1A238E75320360F70CA78D6186B51AA92B8F0AA3BC0" as const;

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW_CONTRACT_SHA256 =
  "273650DDA4B58BCA876B936394BC3752E442DE19C3B3E27889267113E0EE995B" as const;

export type EventTicketCommercialSecondAdjustmentSeverity = "critical" | "high";

export type EventTicketCommercialSecondAdjustmentPlanItem = {
  key: string;
  severity: EventTicketCommercialSecondAdjustmentSeverity;
  phase: string;
  title: string;
  objective: string;
  requiredChanges: readonly string[];
  acceptanceTests: readonly string[];
  prerequisites: readonly string[];
};

export const EVENT_TICKET_COMMERCIAL_SECOND_ADJUSTMENT_PHASES =
  [
  {
    "phaseKey": "authorization_and_idempotency",
    "title": "Fechar autorização e idempotência",
    "objective": "Corrigir recibos e autorização de representantes antes de qualquer replay."
  },
  {
    "phaseKey": "channel_lifecycle_and_automation",
    "title": "Alinhar lifecycle e automação",
    "objective": "Tornar expiração segura, idempotente e limitada a colunas autorizadas."
  },
  {
    "phaseKey": "privacy_and_retention",
    "title": "Fechar privacidade, imutabilidade e retenção",
    "objective": "Trocar metadata genérica, restringir anonimização e preservar lineage por tombstone."
  },
  {
    "phaseKey": "url_validation_fail_closed",
    "title": "Tornar URL fail-closed",
    "objective": "Exigir validação server-side fresca e saudável em mutações e resolução pública."
  },
  {
    "phaseKey": "corrected_draft_and_re_review",
    "title": "Produzir e revisar novo rascunho",
    "objective": "Gerar rascunho protegido e submetê-lo a nova revisão estrutural independente."
  }
] as const;

export const EVENT_TICKET_COMMERCIAL_SECOND_ADJUSTMENT_ITEMS =
  [
  {
    "key": "automation_expiry_state_mismatch",
    "severity": "critical",
    "phase": "channel_lifecycle_and_automation",
    "title": "Alinhar expiração automática ao lifecycle do canal",
    "objective": "Permitir expiração idempotente de canais authorized, active e paused sem ampliar o poder geral do ator automation.",
    "requiredChanges": [
      "Substituir a exceção genérica do trigger por uma allowlist exclusiva de transição para expired nos três estados elegíveis.",
      "Comparar todas as colunas e permitir ao ator automation alterar somente channel_status, expired_by_actor_role, expired_at, lock_version e updated_at.",
      "Contabilizar somente updates efetivos e não auditar linhas perdidas por concorrência otimista.",
      "Vincular cada expiração a recibo idempotente específico por canal e versão esperada."
    ],
    "acceptanceTests": [
      "authorized vencido expira sem erro e sem alterar campos comerciais.",
      "active vencido expira sem erro e sem alterar campos comerciais.",
      "paused vencido expira sem erro e sem alterar campos comerciais.",
      "canal não vencido ou estado não elegível não é atualizado.",
      "conflito de lock_version não incrementa a contagem nem gera auditoria falsa."
    ],
    "prerequisites": [
      "admin_authorization_rpc_contract",
      "parallel_concurrency_and_failure_tests"
    ]
  },
  {
    "key": "idempotency_receipt_not_bound_to_actor_and_request",
    "severity": "critical",
    "phase": "authorization_and_idempotency",
    "title": "Vincular recibos ao ator, alvo, operação e payload",
    "objective": "Impedir replay cruzado, reutilização semântica divergente e retorno antecipado antes da autorização.",
    "requiredChanges": [
      "Adicionar principal_type, principal_id, operation_name, target_type, target_id, expected_lock_version e request_hash ao contrato de recibo.",
      "Trocar a unicidade por principal + operation_name + idempotency_key e validar igualdade semântica no replay.",
      "Executar autenticação, autorização e vínculo de parceiro antes de consultar ou devolver qualquer resultado idempotente.",
      "Calcular request_hash server-side a partir de payload canônico e rejeitar a mesma chave com fingerprint diferente."
    ],
    "acceptanceTests": [
      "mesma chave e mesmo ator/payload retorna o resultado original.",
      "mesma chave com ator diferente é rejeitada.",
      "mesma chave com target diferente é rejeitada.",
      "mesma chave com payload ou expected_lock_version diferente é rejeitada.",
      "usuário sem autorização não obtém resultado por replay."
    ],
    "prerequisites": [
      "admin_authorization_rpc_contract",
      "parallel_concurrency_and_failure_tests"
    ]
  },
  {
    "key": "metadata_privacy_guard_is_denylist_only",
    "severity": "critical",
    "phase": "privacy_and_retention",
    "title": "Substituir metadata genérica por contratos allowlist",
    "objective": "Bloquear dados brutos e limitar forma, profundidade, quantidade e tamanho de metadata por objeto.",
    "requiredChanges": [
      "Remover o uso universal da função denylist e criar validadores versionados por tabela e finalidade.",
      "Aceitar somente chaves documentadas, tipos escalares aprovados e valores normalizados sem URL, token, e-mail, telefone, IP ou payload transacional bruto.",
      "Impor limites de bytes, profundidade, número de chaves e itens de array.",
      "Armazenar somente identificadores internos, enums e hashes versionados onde evidência adicional for necessária."
    ],
    "acceptanceTests": [
      "chave não prevista é rejeitada.",
      "valor escalar contendo URL, token, e-mail, telefone ou IP é rejeitado.",
      "profundidade, bytes ou quantidade de itens acima do limite são rejeitados.",
      "metadata válida por objeto é aceita.",
      "snapshots de auditoria mantêm somente campos permitidos e hashes."
    ],
    "prerequisites": [
      "privacy_legal_basis_and_retention",
      "commercial_financial_semantics"
    ]
  },
  {
    "key": "purchase_signal_retention_mutation_scope_too_broad",
    "severity": "critical",
    "phase": "privacy_and_retention",
    "title": "Restringir retenção a uma allowlist de anonimização",
    "objective": "Preservar a imutabilidade factual dos sinais durante o processamento de retenção.",
    "requiredChanges": [
      "Remover a exceção ampla do trigger e centralizar anonimização em RPC SECURITY DEFINER exclusiva para retenção.",
      "Permitir alterar somente user_id, click_id, attribution_campaign_id, metadata, retention_processed_at e retention_result, após contrato jurídico aprovado.",
      "Exigir igualdade de todas as demais colunas, inclusive provider, hashes, assinatura, nonce, valores, moeda e flags de confiança.",
      "Registrar before/after redigidos, policy_version, run_id e contagem real em auditoria."
    ],
    "acceptanceTests": [
      "alteração de qualquer campo factual é rejeitada.",
      "anonimização da allowlist é aceita uma única vez.",
      "segunda execução idempotente não altera o sinal novamente.",
      "sinal com policy_version incompatível é rejeitado.",
      "auditoria registra somente snapshots redigidos e hashes."
    ],
    "prerequisites": [
      "privacy_legal_basis_and_retention",
      "parallel_concurrency_and_failure_tests"
    ]
  },
  {
    "key": "retention_delete_conflicts_with_signal_lineage_and_audit_fk",
    "severity": "critical",
    "phase": "privacy_and_retention",
    "title": "Preservar lineage e auditoria por tombstone",
    "objective": "Eliminar a deleção fisicamente inviável de sinais e preservar vínculos de lineage e auditoria.",
    "requiredChanges": [
      "Remover delete de event_ticket_purchase_signals do lote de retenção.",
      "Adotar anonimização/tombstone para todos os tipos de sinal com retention_result explícito e campos pessoais nulos.",
      "Manter signal_id, parent_signal_id, canonical_event_id, signal_type, hashes não reversíveis, recorded_at e referências de auditoria.",
      "Renomear a ação da política para semântica compatível com tombstone e bloquear configurações que prometam delete."
    ],
    "acceptanceTests": [
      "sinal com descendente é anonimizado sem quebrar parent_signal_id.",
      "sinal auditado é anonimizado sem violar foreign key.",
      "nenhum DELETE em purchase_signals permanece no rascunho corrigido.",
      "contagens do lote distinguem tombstoned e skipped.",
      "lineage e auditoria continuam consultáveis após retenção."
    ],
    "prerequisites": [
      "privacy_legal_basis_and_retention"
    ]
  },
  {
    "key": "partner_membership_ambiguity_and_partner_status_gap",
    "severity": "high",
    "phase": "authorization_and_idempotency",
    "title": "Validar representante pelo parceiro-alvo verificado",
    "objective": "Eliminar seleção ambígua e impedir operações em nome de parceiro não verificado ou inativo.",
    "requiredChanges": [
      "Substituir SELECT INTO por EXISTS vinculado ao partner_id exato da operação.",
      "Juntar commercial_partners e exigir partner_status = verified.",
      "Exigir representation_status = active e vigência válida no mesmo predicado.",
      "Repetir a autorização antes de replay idempotente e em todas as policies/RPCs de parceiro."
    ],
    "acceptanceTests": [
      "usuário representante de dois parceiros opera somente no partner_id solicitado.",
      "parceiro pending, suspended ou revoked é rejeitado.",
      "representação expirada ou inativa é rejeitada.",
      "representação ativa de parceiro verified é aceita.",
      "replay não contorna mudança posterior de autorização."
    ],
    "prerequisites": [
      "verified_partner_onboarding",
      "admin_authorization_rpc_contract"
    ]
  },
  {
    "key": "url_validation_freshness_is_optional_and_resolver_fail_open",
    "severity": "critical",
    "phase": "url_validation_fail_closed",
    "title": "Tornar freshness obrigatória e resolver em fail-closed",
    "objective": "Impedir autorização, ativação ou exposição pública de URL sem validação server-side recente e saudável.",
    "requiredChanges": [
      "Remover p_require_fresh_url do controle do chamador e tornar freshness obrigatória para authorize, activate, resume e cutover.",
      "Definir contrato versionado para validated_at, validation_expires_at, health_status, validator_version, resolved_host_hash e redirect_chain_hash.",
      "Fazer o resolvedor público exigir status active, validação não expirada, health_status healthy e autorização vigente.",
      "Falhar para fallback oficial quando qualquer prova estiver ausente, stale, rejected ou unhealthy."
    ],
    "acceptanceTests": [
      "authorize/activate/cutover sem validação fresca é rejeitado.",
      "canal stale ou unhealthy nunca é retornado pelo resolvedor.",
      "canal validado e saudável dentro da janela pode ser resolvido.",
      "expiração da prova muda o resultado para fallback oficial sem mutação pública.",
      "redirect ou hostname revalidado altera hashes e exige nova aprovação quando material."
    ],
    "prerequisites": [
      "server_side_url_validator",
      "parallel_concurrency_and_failure_tests"
    ]
  }
] as const satisfies readonly EventTicketCommercialSecondAdjustmentPlanItem[];

export const EVENT_TICKET_COMMERCIAL_SECOND_ADJUSTMENT_EXTERNAL_PREREQUISITES =
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

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN = {
  version: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN_VERSION,
  baseVersion:
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN_BASE_VERSION,
  baseCommit:
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN_BASE_COMMIT,
  decision: "second_adjustment_plan_ready",
  decisionReason:
    "Os sete bloqueadores da revisão v4.8.91 foram convertidos em correções técnicas verificáveis, sem alterar o SQL protegido.",
  reviewedSqlSha256: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SQL_SHA256,
  phases: EVENT_TICKET_COMMERCIAL_SECOND_ADJUSTMENT_PHASES,
  adjustments: EVENT_TICKET_COMMERCIAL_SECOND_ADJUSTMENT_ITEMS,
  externalPrerequisites:
    EVENT_TICKET_COMMERCIAL_SECOND_ADJUSTMENT_EXTERNAL_PREREQUISITES,
  nextAllowedArtifact: "corrected_adjusted_migration_draft_safe",
  promotionToExecutableMigrationAllowed: false,
  reviewedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  publicTicketLinkActivated: false,
} as const;

export type EventTicketCommercialSecondAdjustmentPlanRequest = {
  requestSqlMutation?: boolean | null;
  requestExecutableMigration?: boolean | null;
  requestMoveToSupabaseMigrations?: boolean | null;
  requestSupabaseOperation?: boolean | null;
  requestDatabaseWrite?: boolean | null;
  requestPublicActivation?: boolean | null;
};

export type EventTicketCommercialSecondAdjustmentPlanState =
  | "second_adjustment_plan_ready"
  | "blocked_sql_mutation_requested"
  | "blocked_executable_migration_requested"
  | "blocked_move_to_supabase_migrations_requested"
  | "blocked_supabase_operation_requested"
  | "blocked_database_write_requested"
  | "blocked_public_activation_requested";

export function evaluateEventTicketCommercialSecondAdjustmentPlan(
  request: EventTicketCommercialSecondAdjustmentPlanRequest = {}
): {
  ok: boolean;
  state: EventTicketCommercialSecondAdjustmentPlanState;
  reason: string;
  plan: typeof EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN;
} {
  const blocked: ReadonlyArray<[
    keyof EventTicketCommercialSecondAdjustmentPlanRequest,
    EventTicketCommercialSecondAdjustmentPlanState,
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
        plan: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN,
      };
    }
  }

  return {
    ok: true,
    state: "second_adjustment_plan_ready",
    reason:
      "Plano específico dos sete bloqueadores concluído; o próximo artefato permitido é um novo rascunho protegido.",
    plan: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN,
  };
}

export function runEventTicketCommercialSecondAdjustmentPlanSelfTest(): {
  ok: boolean;
  checks: ReadonlyArray<{ checkKey: string; ok: boolean; detail: string }>;
  phaseCount: number;
  adjustmentCount: number;
  criticalAdjustmentCount: number;
  acceptanceTestCount: number;
  externalPrerequisiteCount: number;
  promotionAllowed: false;
} {
  const checks: Array<{ checkKey: string; ok: boolean; detail: string }> = [];
  const add = (checkKey: string, ok: boolean, detail: string): void => {
    checks.push({ checkKey, ok, detail });
  };

  const items = EVENT_TICKET_COMMERCIAL_SECOND_ADJUSTMENT_ITEMS;
  const phases = EVENT_TICKET_COMMERCIAL_SECOND_ADJUSTMENT_PHASES;
  const criticalCount = items.filter((item) => item.severity === "critical").length;
  const acceptanceCount = items.reduce(
    (total, item) => total + item.acceptanceTests.length,
    0
  );
  const knownPrerequisites = new Set(
    EVENT_TICKET_COMMERCIAL_SECOND_ADJUSTMENT_EXTERNAL_PREREQUISITES.map(
      (item) => item.prerequisiteKey
    )
  );

  add("version", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN_VERSION === "v4.8.92-event-ticket-commercial-adjusted-draft-second-adjustment-plan-safe", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN_VERSION);
  add("base_version", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN_BASE_VERSION === "v4.8.91-event-ticket-commercial-migration-adjusted-draft-structural-review-safe", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN_BASE_VERSION);
  add("base_commit", /^[0-9a-f]{40}$/.test(EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN_BASE_COMMIT), EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN_BASE_COMMIT);
  add("sql_hash", /^[A-F0-9]{64}$/.test(EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SQL_SHA256), EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SQL_SHA256);
  add("phase_count", phases.length === 5, String(phases.length));
  add("phase_keys_unique", new Set(phases.map((phase) => phase.phaseKey)).size === 5, "Cinco fases únicas.");
  add("adjustment_count", items.length === 7, String(items.length));
  add("adjustment_keys_unique", new Set(items.map((item) => item.key)).size === 7, "Sete ajustes únicos.");
  add("critical_count", criticalCount === 6, String(criticalCount));
  add("acceptance_count", acceptanceCount === 35, String(acceptanceCount));
  add("each_adjustment_has_four_changes", items.every((item) => item.requiredChanges.length === 4), "Quatro mudanças por ajuste.");
  add("each_adjustment_has_five_tests", items.every((item) => item.acceptanceTests.length === 5), "Cinco testes por ajuste.");
  add("all_phases_known", items.every((item) => phases.some((phase) => phase.phaseKey === item.phase)), "Todos os ajustes pertencem a fase conhecida.");
  add("all_prerequisites_known", items.every((item) => item.prerequisites.every((key) => knownPrerequisites.has(key))), "Pré-requisitos internos ao registro conhecido.");
  add("external_prerequisite_count", EVENT_TICKET_COMMERCIAL_SECOND_ADJUSTMENT_EXTERNAL_PREREQUISITES.length === 10, String(EVENT_TICKET_COMMERCIAL_SECOND_ADJUSTMENT_EXTERNAL_PREREQUISITES.length));
  add("external_prerequisites_open", EVENT_TICKET_COMMERCIAL_SECOND_ADJUSTMENT_EXTERNAL_PREREQUISITES.every((item) => item.closed === false), "Todas permanecem abertas.");
  add("decision", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN.decision === "second_adjustment_plan_ready", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN.decision);
  add("next_artifact", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN.nextAllowedArtifact === "corrected_adjusted_migration_draft_safe", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN.nextAllowedArtifact);
  add("promotion_blocked", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN.promotionToExecutableMigrationAllowed === false, "promotion=false");
  add("sql_preserved", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SECOND_ADJUSTMENT_PLAN.reviewedSqlChanged === false, "reviewedSqlChanged=false");

  const forbidden: EventTicketCommercialSecondAdjustmentPlanRequest[] = [
    { requestSqlMutation: true },
    { requestExecutableMigration: true },
    { requestMoveToSupabaseMigrations: true },
    { requestSupabaseOperation: true },
    { requestDatabaseWrite: true },
    { requestPublicActivation: true },
  ];
  add("forbidden_requests_blocked", forbidden.every((request) => evaluateEventTicketCommercialSecondAdjustmentPlan(request).ok === false), "Seis operações proibidas recusadas.");
  add("safe_plan_result", evaluateEventTicketCommercialSecondAdjustmentPlan().state === "second_adjustment_plan_ready", "second_adjustment_plan_ready");

  return {
    ok: checks.every((check) => check.ok),
    checks,
    phaseCount: phases.length,
    adjustmentCount: items.length,
    criticalAdjustmentCount: criticalCount,
    acceptanceTestCount: acceptanceCount,
    externalPrerequisiteCount:
      EVENT_TICKET_COMMERCIAL_SECOND_ADJUSTMENT_EXTERNAL_PREREQUISITES.length,
    promotionAllowed: false,
  };
}
