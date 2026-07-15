// src/app/api/official-events/_shared/eventTicketCommercialMigrationAdjustedDraftStructuralReview.ts

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW_VERSION =
  "v4.8.91-event-ticket-commercial-migration-adjusted-draft-structural-review-safe" as const;

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW_BASE_VERSION =
  "v4.8.90-event-ticket-commercial-migration-adjusted-draft-safe" as const;

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW_BASE_COMMIT =
  "c09f4af422659a8fe7ba2f76155635043caffcbf" as const;

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SQL_SHA256 =
  "2E6BE6D1DA005548E6272AD79432922B91778C5103AD4D7281699450F46A1F3C" as const;

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_DOC_SHA256 =
  "182CFB09C586B254BD51D2B3E68FBEB80ABDD6500C80496AA6BB151CA173DA2D" as const;

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW_CONTRACT_SHA256 =
  "8C17FE35CD51B004820FE687206C568C22C370E5103DFDF8C197F22C94A0F93C" as const;

export type EventTicketCommercialAdjustedDraftStructuralSeverity =
  | "critical"
  | "high";

export type EventTicketCommercialAdjustedDraftStructuralFinding = {
  key: string;
  severity: EventTicketCommercialAdjustedDraftStructuralSeverity;
  title: string;
  summary: string;
  evidence: readonly string[];
  correction: string;
  blocksPromotion: true;
};

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_FINDINGS =
  [
  {
    "key": "automation_expiry_state_mismatch",
    "severity": "critical",
    "title": "Expiração automática incompatível com o guard do canal",
    "summary": "O lote seleciona canais authorized, active e paused, mas o trigger permite actor automation somente para active → expired. Um canal authorized ou paused vencido interrompe o lote.",
    "evidence": [
      "channel_status in ('authorized','active','paused')",
      "old.channel_status = 'active'",
      "COMMERCIAL_CHANNEL_ADMIN_ONLY"
    ],
    "correction": "Alinhar seleção e guard: permitir expiração automatizada idempotente dos três estados, com checagem estrita das únicas colunas mutáveis e contagem real de linhas atualizadas.",
    "blocksPromotion": true
  },
  {
    "key": "idempotency_receipt_not_bound_to_actor_and_request",
    "severity": "critical",
    "title": "Recibos de idempotência não vinculam ator, alvo e fingerprint da requisição",
    "summary": "RPCs consultam operation_scope + idempotency_key e podem retornar o alvo antes de revalidar autorização específica. O recibo não registra ator, operação concreta, target esperado nem hash do payload.",
    "evidence": [
      "event_ticket_operation_receipts_v490_unique",
      "operation_scope = 'request_mutation'",
      "operation_scope = 'signal_insert'"
    ],
    "correction": "Autorizar antes do replay e vincular o recibo a principal, target, operation, expected version e request_hash; rejeitar reutilização semântica divergente.",
    "blocksPromotion": true
  },
  {
    "key": "metadata_privacy_guard_is_denylist_only",
    "severity": "critical",
    "title": "Proteção de metadata é denylist de chaves e não bloqueia conteúdo escalar",
    "summary": "A função recursiva rejeita alguns nomes de chave, mas aceita uma chave genérica contendo URL, token, e-mail, telefone, IP ou transação bruta; também não limita profundidade, tamanho ou conjunto permitido.",
    "evidence": [
      "mhidas_ticket_metadata_is_safe_v1",
      "jsonb_each(p_value)",
      "lower(v_key) = any"
    ],
    "correction": "Substituir por allowlists específicas por objeto, limites de bytes/profundidade/itens e validação dos valores escalares.",
    "blocksPromotion": true
  },
  {
    "key": "purchase_signal_retention_mutation_scope_too_broad",
    "severity": "critical",
    "title": "Exceção de retenção não congela todos os campos imutáveis do sinal",
    "summary": "O trigger compara apenas parte das colunas. Em contexto automation, uma atualização poderia alterar provider, prova, assinatura, nonce, valores financeiros, moeda ou confirmação confiável.",
    "evidence": [
      "PURCHASE_SIGNAL_APPEND_ONLY",
      "v_actor_role = 'automation'",
      "old.transaction_hash is not distinct from new.transaction_hash"
    ],
    "correction": "Usar allowlist explícita das colunas anonimizáveis e exigir igualdade de todas as demais colunas, preferencialmente em RPC de retenção dedicado.",
    "blocksPromotion": true
  },
  {
    "key": "retention_delete_conflicts_with_signal_lineage_and_audit_fk",
    "severity": "critical",
    "title": "Deleção de sinais conflita com lineage e auditoria em ON DELETE RESTRICT",
    "summary": "O lote tenta excluir sinais não conversão, mas parent_signal_id e event_ticket_commercial_audit_log.signal_id usam ON DELETE RESTRICT. Sinais auditados ou com descendentes não podem ser removidos.",
    "evidence": [
      "parent_signal_id uuid references public.event_ticket_purchase_signals(signal_id) on delete restrict",
      "signal_id uuid references public.event_ticket_purchase_signals(signal_id) on delete restrict",
      "delete from public.event_ticket_purchase_signals"
    ],
    "correction": "Adotar anonimização/tombstone preservando lineage, ou redesenhar FKs e auditoria com política jurídica explícita; não prometer delete inviável.",
    "blocksPromotion": true
  },
  {
    "key": "partner_membership_ambiguity_and_partner_status_gap",
    "severity": "high",
    "title": "Validação de representante pode ser ambígua e ignora status do parceiro",
    "summary": "O guard de solicitação seleciona partner_id por usuário sem filtrar o parceiro-alvo, podendo retornar múltiplas linhas. Fluxos e policies validam representante ativo, mas não exigem commercial_partners.partner_status = verified.",
    "evidence": [
      "select r.partner_id",
      "where r.user_id = auth.uid()",
      "representation_status = 'active'"
    ],
    "correction": "Validar com EXISTS pelo partner_id exato, juntar commercial_partners e exigir parceiro verified, vigência válida e representação ativa.",
    "blocksPromotion": true
  },
  {
    "key": "url_validation_freshness_is_optional_and_resolver_fail_open",
    "severity": "critical",
    "title": "Freshness da URL é opcional na mutação e ausente no resolvedor público",
    "summary": "p_require_fresh_url é controlado pelo chamador e o resolvedor aceita qualquer canal active + validated, sem limite de idade, health status ou prova de revalidação periódica.",
    "evidence": [
      "p_require_fresh_url boolean",
      "if p_require_fresh_url",
      "url_validation_status = 'validated'"
    ],
    "correction": "Tornar freshness obrigatória para authorize/activate/cutover e fazer o resolvedor falhar fechado por idade, health check e evidência do validador server-side.",
    "blocksPromotion": true
  }
] as const satisfies readonly EventTicketCommercialAdjustedDraftStructuralFinding[];

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_OPEN_EXTERNAL_PREREQUISITES =
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

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW = {
  version: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW_VERSION,
  baseVersion:
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW_BASE_VERSION,
  baseCommit:
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW_BASE_COMMIT,
  decision: "needs_adjustment",
  decisionReason:
    "O rascunho preserva os 18 controles planejados, mas sete incompatibilidades estruturais ainda impedem promoção.",
  reviewedSqlSha256: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SQL_SHA256,
  requiredAdjustments:
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_FINDINGS,
  openExternalPrerequisites:
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_OPEN_EXTERNAL_PREREQUISITES,
  nextAllowedArtifact: "adjustment_plan_for_v4_8_90_safe",
  promotionToExecutableMigrationAllowed: false,
  executableMigrationCreated: false,
  sqlChanged: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  publicTicketLinkActivated: false,
} as const;

export type EventTicketCommercialAdjustedDraftStructuralReviewRequest = {
  requestSqlMutation?: boolean | null;
  requestExecutableMigration?: boolean | null;
  requestMoveToSupabaseMigrations?: boolean | null;
  requestSupabaseOperation?: boolean | null;
  requestDatabaseWrite?: boolean | null;
  requestPublicActivation?: boolean | null;
};

export type EventTicketCommercialAdjustedDraftStructuralReviewState =
  | "needs_adjustment"
  | "blocked_sql_mutation_requested"
  | "blocked_executable_migration_requested"
  | "blocked_move_to_supabase_migrations_requested"
  | "blocked_supabase_operation_requested"
  | "blocked_database_write_requested"
  | "blocked_public_activation_requested";

export function evaluateEventTicketCommercialAdjustedDraftStructuralReview(
  request: EventTicketCommercialAdjustedDraftStructuralReviewRequest = {}
): {
  ok: boolean;
  state: EventTicketCommercialAdjustedDraftStructuralReviewState;
  reason: string;
  review: typeof EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW;
} {
  const blocked: ReadonlyArray<[
    keyof EventTicketCommercialAdjustedDraftStructuralReviewRequest,
    EventTicketCommercialAdjustedDraftStructuralReviewState,
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
        review: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW,
      };
    }
  }

  return {
    ok: true,
    state: "needs_adjustment",
    reason:
      "Revisão estrutural concluída; sete ajustes devem ser planejados antes de um novo rascunho.",
    review: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW,
  };
}

export function runEventTicketCommercialAdjustedDraftStructuralReviewSelfTest(): {
  ok: boolean;
  checks: ReadonlyArray<{ checkKey: string; ok: boolean; detail: string }>;
  findingCount: number;
  criticalFindingCount: number;
  externalPrerequisiteCount: number;
  promotionAllowed: false;
} {
  const checks: Array<{ checkKey: string; ok: boolean; detail: string }> = [];
  const add = (checkKey: string, ok: boolean, detail: string): void => {
    checks.push({ checkKey, ok, detail });
  };

  const findings = EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_FINDINGS;
  const criticalCount = findings.filter(
    (finding) => finding.severity === "critical"
  ).length;

  add("version", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW_VERSION === "v4.8.91-event-ticket-commercial-migration-adjusted-draft-structural-review-safe", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW_VERSION);
  add("base_version", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW_BASE_VERSION === "v4.8.90-event-ticket-commercial-migration-adjusted-draft-safe", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW_BASE_VERSION);
  add("base_commit", /^[0-9a-f]{40}$/.test(EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW_BASE_COMMIT), EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW_BASE_COMMIT);
  add("sql_hash", /^[A-F0-9]{64}$/.test(EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SQL_SHA256), EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_SQL_SHA256);
  add("finding_count", findings.length === 7, String(findings.length));
  add("finding_keys_unique", new Set(findings.map((item) => item.key)).size === 7, "Sete chaves únicas.");
  add("critical_finding_count", criticalCount === 6, String(criticalCount));
  add("all_findings_block_promotion", findings.every((item) => item.blocksPromotion === true), "Todos bloqueiam promoção.");
  add("all_findings_have_evidence", findings.every((item) => item.evidence.length >= 3), "Cada finding possui ao menos três evidências.");
  add("external_prerequisite_count", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_OPEN_EXTERNAL_PREREQUISITES.length === 10, String(EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_OPEN_EXTERNAL_PREREQUISITES.length));
  add("external_prerequisites_open", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_OPEN_EXTERNAL_PREREQUISITES.every((item) => item.closed === false), "Todas permanecem abertas.");
  add("decision", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW.decision === "needs_adjustment", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW.decision);
  add("next_artifact", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW.nextAllowedArtifact === "adjustment_plan_for_v4_8_90_safe", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW.nextAllowedArtifact);
  add("promotion_blocked", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW.promotionToExecutableMigrationAllowed === false, "promotion=false");
  add("sql_preserved", EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_STRUCTURAL_REVIEW.sqlChanged === false, "sqlChanged=false");

  const forbidden: EventTicketCommercialAdjustedDraftStructuralReviewRequest[] = [
    { requestSqlMutation: true },
    { requestExecutableMigration: true },
    { requestMoveToSupabaseMigrations: true },
    { requestSupabaseOperation: true },
    { requestDatabaseWrite: true },
    { requestPublicActivation: true },
  ];
  add("forbidden_requests_blocked", forbidden.every((request) => evaluateEventTicketCommercialAdjustedDraftStructuralReview(request).ok === false), "Seis operações proibidas recusadas.");
  add("safe_review_result", evaluateEventTicketCommercialAdjustedDraftStructuralReview().state === "needs_adjustment", "needs_adjustment");

  return {
    ok: checks.every((check) => check.ok),
    checks,
    findingCount: findings.length,
    criticalFindingCount: criticalCount,
    externalPrerequisiteCount:
      EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_OPEN_EXTERNAL_PREREQUISITES.length,
    promotionAllowed: false,
  };
}
