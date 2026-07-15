// src/app/api/official-events/_shared/eventTicketCommercialMigrationCorrectedAdjustedDraftStructuralReview.ts

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW_VERSION =
  "v4.8.94-event-ticket-commercial-migration-corrected-adjusted-draft-structural-review-safe" as const;

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW_BASE_VERSION =
  "v4.8.93-event-ticket-commercial-migration-corrected-adjusted-draft-safe" as const;

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW_BASE_COMMIT =
  "9a32ab300bbcac163327cce9a60829221a18d32f" as const;

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_REVIEWED_SQL_SHA256 =
  "4DC566C2B3259DEC30498BC4BD3FF77AA9B52AA0D9A9F8B65013DD81B15CFECE" as const;

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_REVIEWED_DOC_SHA256 =
  "19CACEA253F63EC92FA8E5803529D493818BE8FBE1B535AF13A60BD64678B37A" as const;

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_REVIEWED_CONTRACT_SHA256 =
  "71BE1340E35956C512171B01C363AE9FAD794B06E41285F944BD02209F8A6246" as const;

export type EventTicketCommercialCorrectedDraftStructuralSeverity =
  | "critical"
  | "high";

export type EventTicketCommercialCorrectedDraftStructuralFinding = {
  key: string;
  severity: EventTicketCommercialCorrectedDraftStructuralSeverity;
  title: string;
  summary: string;
  evidence: readonly string[];
  correction: string;
  blocksPromotion: true;
};

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_FINDINGS =
  [
  {
    "key": "url_validation_rpc_not_executable_by_service_role",
    "severity": "critical",
    "title": "RPC de validação de URL fica inacessível ao service_role",
    "summary": "A função de validação é revogada de public, anon e authenticated, mas não recebe GRANT EXECUTE para service_role. Como authorize, activate e atomic_cutover exigem prova fresca, nenhum canal consegue avançar pelo fluxo previsto.",
    "evidence": [
      "revoke all on function public.mhidas_record_event_ticket_channel_url_validation_v2",
      "SERVICE_ROLE_REQUIRED",
      "ausência de grant execute da função para service_role"
    ],
    "correction": "Conceder EXECUTE exclusivamente ao service_role e adicionar preflight/teste de privilégios efetivos antes da promoção.",
    "blocksPromotion": true
  },
  {
    "key": "rls_read_policies_without_table_select_grants",
    "severity": "critical",
    "title": "Policies de leitura são anuladas pela ausência de privilégios SELECT",
    "summary": "As tabelas novas recebem REVOKE ALL e policies SELECT, porém não recebem GRANT SELECT. RLS filtra acesso, mas não substitui o privilégio de tabela; parceiros, clubbers e administradores não conseguem usar as leituras declaradas.",
    "evidence": [
      "revoke all on table public.event_ticket_partnership_requests",
      "create policy event_ticket_partnership_requests_own_partner_or_admin_read_v490",
      "ausência de grant select nas tabelas novas"
    ],
    "correction": "Definir grants de coluna/tabela compatíveis com cada policy ou criar RPCs de leitura explícitas e remover policies sem caminho de uso.",
    "blocksPromotion": true
  },
  {
    "key": "purchase_signal_click_context_not_validated",
    "severity": "critical",
    "title": "Sinal de compra aceita click_id de outro evento ou canal",
    "summary": "A RPC valida o evento do parent_signal_id e do channel_id, mas não verifica se click_id pertence ao mesmo canonical_event_id e channel_id. Isso permite lineage e atribuição cruzados.",
    "evidence": [
      "p_click_id é inserido diretamente",
      "validação de event_ticket_commercial_channels existente",
      "ausência de consulta a event_ticket_click_attributions antes do insert"
    ],
    "correction": "Bloquear inserção quando click, evento e canal não coincidirem; exigir também consistência com o usuário quando aplicável.",
    "blocksPromotion": true
  },
  {
    "key": "retention_policy_is_caller_controlled_and_not_active_bound",
    "severity": "critical",
    "title": "Política e prazo de retenção são controlados pelo chamador",
    "summary": "A RPC de sinais aceita retention_policy_version_id e retention_expires_at sem exigir policy active nem calcular o prazo a partir da política. Canais rastreados também podem referenciar versões draft, approved ou retired.",
    "evidence": [
      "p_retention_policy_version_id",
      "p_retention_expires_at",
      "tracking_method = none or retention_policy_version_id is not null"
    ],
    "correction": "Resolver a política ativa no servidor, derivar retention_expires_at de seus dias e impedir authorize/activate quando a versão não estiver active.",
    "blocksPromotion": true
  },
  {
    "key": "purchase_signal_idempotency_scope_conflicts_with_receipts",
    "severity": "high",
    "title": "Unicidade global do sinal contradiz recibos por principal",
    "summary": "Os recibos permitem a mesma idempotency_key para principais diferentes, mas event_ticket_purchase_signals impõe UNIQUE somente sobre idempotency_key. Dois usuários ou integrações podem colidir apesar de semanticamente independentes.",
    "evidence": [
      "event_ticket_purchase_signals_idempotency_v490_uq",
      "on public.event_ticket_purchase_signals (idempotency_key)",
      "event_ticket_operation_receipts_semantic_v493_uq"
    ],
    "correction": "Alinhar a chave do sinal ao principal/provedor ou remover a unicidade redundante e tornar o recibo a autoridade de idempotência.",
    "blocksPromotion": true
  },
  {
    "key": "non_event_communication_receipt_target_is_nullable",
    "severity": "critical",
    "title": "Comunicação sem evento falha ao gravar recibo",
    "summary": "canonical_event_id é opcional para várias comunicações, mas create_draft usa esse campo como target_id do recibo, que é NOT NULL. A transação é revertida para music_release, exclusive_content, community_call e outros casos sem evento.",
    "evidence": [
      "canonical_event_id uuid sem NOT NULL",
      "v_receipt_target_id := canonical_event_id",
      "event_ticket_operation_receipts.target_id uuid not null"
    ],
    "correction": "Usar partner_id ou communication_id como alvo idempotente e incluir o target_type correspondente no contrato de recibos.",
    "blocksPromotion": true
  },
  {
    "key": "trusted_integration_principal_not_namespaced",
    "severity": "high",
    "title": "Integrações confiáveis compartilham uma única identidade de idempotência",
    "summary": "Todos os sinais trusted usam principal_type trusted_ticketing_integration e principal_id NULL. provider_namespace participa do payload, mas não da chave única do recibo, causando colisões entre provedores com a mesma chave.",
    "evidence": [
      "v_principal_type = trusted_ticketing_integration",
      "v_actor_user_id := null",
      "coalesce(principal_id, zero uuid) na unicidade do recibo"
    ],
    "correction": "Adicionar integration_id/provider_namespace validado à identidade do principal e vinculá-lo ao registro oficial de provedores.",
    "blocksPromotion": true
  },
  {
    "key": "signal_actor_type_evidence_matrix_missing",
    "severity": "critical",
    "title": "Tipos e fontes de evidência não são vinculados ao ator",
    "summary": "No fluxo clubber basta p_user_id coincidir com auth.uid(). O usuário pode declarar commercial_link_click com evidence_source useclubbers_redirect ou preencher campos reservados a integrações, contaminando métricas.",
    "evidence": [
      "ramo else define actor_role clubber",
      "signal_type e evidence_source entram diretamente no INSERT",
      "constraints não criam matriz ator × tipo × evidência"
    ],
    "correction": "Aplicar matriz fail-closed por ator, signal_type e evidence_source; limpar ou rejeitar campos não permitidos em cada classe.",
    "blocksPromotion": true
  },
  {
    "key": "confirmed_conversion_lineage_semantics_incomplete",
    "severity": "critical",
    "title": "Conversão confirmada não exige lineage comercial coerente",
    "summary": "confirmed_conversion exige apenas parent_signal_id do mesmo evento. Não exige parent attributed_conversion, canal igual, mesmo provider/transaction ou progressão de evidência.",
    "evidence": [
      "signal_type confirmed_conversion or correction exige parent_signal_id",
      "parent check compara somente canonical_event_id",
      "ausência de validação do tipo, canal e transação do parent"
    ],
    "correction": "Definir grafo de transições permitido e validar parent type, evento, canal, provider_namespace, transaction_hash e ausência de confirmação duplicada.",
    "blocksPromotion": true
  },
  {
    "key": "url_freshness_accepts_future_clock_and_missing_health_evidence",
    "severity": "high",
    "title": "Freshness aceita timestamps futuros e health check sem evidência obrigatória",
    "summary": "A função exige expiry futura e health checked nas últimas 24 horas, mas não limita url_validated_at/last_health_checked_at ao presente. last_health_check_hash também pode ser NULL em uma prova considerada saudável.",
    "evidence": [
      "p_last_health_checked_at > now() - interval 24 hours",
      "ausência de p_last_health_checked_at <= now()",
      "last_health_check_hash é opcional"
    ],
    "correction": "Aplicar tolerância de clock explícita, rejeitar timestamps futuros e exigir hash/versionamento da evidência de health check.",
    "blocksPromotion": true
  }
] as const satisfies readonly EventTicketCommercialCorrectedDraftStructuralFinding[];

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_OPEN_EXTERNAL_PREREQUISITES =
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

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW = {
  version: EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW_VERSION,
  baseVersion: EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW_BASE_VERSION,
  baseCommit: EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW_BASE_COMMIT,
  decision: "needs_adjustment",
  decisionReason:
    "Os sete bloqueadores anteriores foram corrigidos, mas a revisão independente encontrou dez incompatibilidades adicionais que impedem promoção.",
  reviewedSqlSha256: EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_REVIEWED_SQL_SHA256,
  requiredAdjustments: EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_FINDINGS,
  openExternalPrerequisites:
    EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_OPEN_EXTERNAL_PREREQUISITES,
  nextAllowedArtifact: "third_adjustment_plan_safe",
  promotionToExecutableMigrationAllowed: false,
  executableMigrationCreated: false,
  reviewedSqlChanged: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  publicTicketLinkActivated: false,
} as const;

export type EventTicketCommercialCorrectedDraftStructuralReviewRequest = {
  requestSqlMutation?: boolean | null;
  requestExecutableMigration?: boolean | null;
  requestMoveToSupabaseMigrations?: boolean | null;
  requestSupabaseOperation?: boolean | null;
  requestDatabaseWrite?: boolean | null;
  requestPublicActivation?: boolean | null;
};

export type EventTicketCommercialCorrectedDraftStructuralReviewState =
  | "needs_adjustment"
  | "blocked_sql_mutation_requested"
  | "blocked_executable_migration_requested"
  | "blocked_move_to_supabase_migrations_requested"
  | "blocked_supabase_operation_requested"
  | "blocked_database_write_requested"
  | "blocked_public_activation_requested";

export function evaluateEventTicketCommercialCorrectedDraftStructuralReview(
  request: EventTicketCommercialCorrectedDraftStructuralReviewRequest = {}
): {
  ok: boolean;
  state: EventTicketCommercialCorrectedDraftStructuralReviewState;
  reason: string;
  review: typeof EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW;
} {
  const blocked: ReadonlyArray<[
    keyof EventTicketCommercialCorrectedDraftStructuralReviewRequest,
    EventTicketCommercialCorrectedDraftStructuralReviewState,
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
        review: EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW,
      };
    }
  }

  return {
    ok: true,
    state: "needs_adjustment",
    reason:
      "Revisão estrutural concluída; dez ajustes devem ser planejados antes de outro rascunho.",
    review: EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW,
  };
}

export function runEventTicketCommercialCorrectedDraftStructuralReviewSelfTest(): {
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

  const findings = EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_FINDINGS;
  const criticalCount = findings.filter((item) => item.severity === "critical").length;
  const highCount = findings.filter((item) => item.severity === "high").length;

  add("decision_needs_adjustment", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW.decision === "needs_adjustment", "decision preserved");
  add("ten_findings", findings.length === 10, `count=${findings.length}`);
  add("seven_critical", criticalCount === 7, `count=${criticalCount}`);
  add("three_high", highCount === 3, `count=${highCount}`);
  add("all_block_promotion", findings.every((item) => item.blocksPromotion), "all findings block promotion");
  add("external_prerequisites_open", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_OPEN_EXTERNAL_PREREQUISITES.length === 10, "ten prerequisites open");
  add("promotion_blocked", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW.promotionToExecutableMigrationAllowed === false, "promotion blocked");
  add("reviewed_sql_preserved", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW.reviewedSqlChanged === false, "v4.8.93 SQL unchanged");
  add("no_supabase", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW.supabaseOperationPerformed === false, "Supabase untouched");
  add("no_database_write", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_STRUCTURAL_REVIEW.databaseWritePerformed === false, "database untouched");

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
      EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_OPEN_EXTERNAL_PREREQUISITES.length,
    promotionAllowed: false,
  };
}
