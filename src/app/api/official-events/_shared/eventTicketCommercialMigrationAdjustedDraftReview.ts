// src/app/api/official-events/_shared/eventTicketCommercialMigrationAdjustedDraftReview.ts

export const EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT_VERSION =
  "v4.8.90-event-ticket-commercial-migration-adjusted-draft-safe" as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT_BASE_VERSION =
  "v4.8.89-event-ticket-commercial-migration-adjustment-plan-safe" as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT_SQL_SHA256 =
  "2E6BE6D1DA005548E6272AD79432922B91778C5103AD4D7281699450F46A1F3C" as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN_SHA256 =
  "25F39EEA90BDC2C32BAF0510C36D054C073FF1D1AD311488893416AFE81CC455" as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN_DOC_SHA256 =
  "ADEF556F00AA36AB1098207E2F38166DBEE72D0B6DB24C8DBA94CA03371A9184" as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW_SHA256 =
  "60456C95D3D220CA224F329B1B5F0ACDF83F6883591988C7198014CD1E20603A" as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW_DOC_SHA256 =
  "5C5E699C74A8571FD5B1354676E86F8A32D138C8EE405DF434DC9F2DA160A640" as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_PRIOR_DRAFT_SQL_SHA256 =
  "B2CA2791D41E38697754FD29BBA1DED0E1DD7F0EB4603A377E5689E53526BA62" as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_PRIOR_DRAFT_DOC_SHA256 =
  "162FEC395FA9CA29415592BF2AD059887F399097FE87B509F34E6D0194FEF1EC" as const;

export type EventTicketCommercialAdjustedDraftEvidenceState =
  | "implemented_in_protected_draft"
  | "external_validator_required"
  | "external_policy_approval_required"
  | "rejection_first_reconciliation";

export type EventTicketCommercialAdjustedDraftEvidence = {
  adjustmentKey: string;
  state: EventTicketCommercialAdjustedDraftEvidenceState;
  summary: string;
  requiredSqlEvidence: readonly string[];
  promotionBlocked: true;
};

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_EVIDENCE =
  [
  {
    "adjustmentKey": "exact_schema_preflight_without_drift_masking",
    "state": "implemented_in_protected_draft",
    "summary": "Preflight exato falha diante de schema divergente ou objetos-alvo já existentes.",
    "requiredSqlEvidence": [
      "mhidas_exact_schema_preflight",
      "PREFLIGHT_SCHEMA_DRIFT",
      "PREFLIGHT_TARGET_OBJECT_ALREADY_EXISTS"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "verified_partner_registry_foreign_key",
    "state": "implemented_in_protected_draft",
    "summary": "Solicitações, canais e comunicações usam parceiros e representantes verificados com chaves estrangeiras.",
    "requiredSqlEvidence": [
      "commercial_partners",
      "commercial_partner_representatives",
      "partner_id"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "financial_field_matrix",
    "state": "implemented_in_protected_draft",
    "summary": "A matriz financeira impede combinações ambíguas entre percentual, valor fixo e moeda.",
    "requiredSqlEvidence": [
      "event_ticket_commercial_channels_financial_matrix_v490_check",
      "remuneration_percent_bps",
      "remuneration_fixed_minor"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "transactional_admin_mutation_rpc",
    "state": "implemented_in_protected_draft",
    "summary": "A mutação administrativa de canal é transacional, auditada e idempotente.",
    "requiredSqlEvidence": [
      "mhidas_admin_mutate_event_ticket_commercial_channel_v1",
      "event_ticket_operation_receipts",
      "mhidas_ticket_write_audit_v1"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "optimistic_concurrency_expected_version",
    "state": "implemented_in_protected_draft",
    "summary": "Solicitações, canais e comunicações exigem expected_lock_version.",
    "requiredSqlEvidence": [
      "expected_lock_version",
      "lock_version",
      "EXPECTED_LOCK_VERSION_CONFLICT"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "request_lifecycle_guard_and_audit",
    "state": "implemented_in_protected_draft",
    "summary": "O lifecycle de solicitações possui transições autorizadas, evidência e auditoria.",
    "requiredSqlEvidence": [
      "mhidas_ticket_partnership_request_guard_v1",
      "mhidas_mutate_ticket_partnership_request_v1",
      "request_status"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "request_channel_cross_entity_consistency",
    "state": "implemented_in_protected_draft",
    "summary": "Canal derivado de solicitação aprovada deve manter o mesmo parceiro e evento canônico.",
    "requiredSqlEvidence": [
      "COMMERCIAL_CHANNEL_REQUEST_ENTITY_MISMATCH",
      "source_request_id",
      "canonical_event_id"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "freeze_sensitive_active_channel_fields",
    "state": "implemented_in_protected_draft",
    "summary": "Campos sensíveis ficam congelados enquanto o canal está ativo.",
    "requiredSqlEvidence": [
      "COMMERCIAL_CHANNEL_ACTIVE_SENSITIVE_FIELDS_FROZEN",
      "financial_terms_hash",
      "authorization_evidence_hash"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "expiry_and_atomic_channel_cutover",
    "state": "implemented_in_protected_draft",
    "summary": "Expiração e troca de canal ativo são controladas em transação única.",
    "requiredSqlEvidence": [
      "atomic_cutover",
      "channel_superseded_by_atomic_cutover",
      "mhidas_expire_event_ticket_commercial_channels_v1"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "official_reference_url_domain_integrity",
    "state": "implemented_in_protected_draft",
    "summary": "Referência oficial validada exige HTTPS, domínio autorizado e evidência hash.",
    "requiredSqlEvidence": [
      "canonical_event_sources_reference_guard_v490",
      "reference_domain",
      "reference_url_hash"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "commercial_url_public_network_validation",
    "state": "external_validator_required",
    "summary": "O SQL valida estrutura e provas, mas DNS, redirects e SSRF dependem de validador externo.",
    "requiredSqlEvidence": [
      "dns_public_validation_hash",
      "redirect_chain_validation_hash",
      "CHANNEL_FRESH_URL_VALIDATION_REQUIRED"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "immutable_purchase_signal_lineage",
    "state": "implemented_in_protected_draft",
    "summary": "Sinais são append-only; confirmação ou correção cria novo registro com lineage.",
    "requiredSqlEvidence": [
      "event_ticket_purchase_signal_append_only_v490",
      "parent_signal_id",
      "PURCHASE_SIGNAL_APPEND_ONLY"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "conversion_channel_and_provider_namespace",
    "state": "implemented_in_protected_draft",
    "summary": "Conversões atribuídas ou confirmadas exigem canal e namespace de provider confiável.",
    "requiredSqlEvidence": [
      "provider_namespace",
      "trusted_ticketing_integration",
      "event_ticket_purchase_signals_conversion_channel_v490_check"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "hash_format_and_metadata_privacy_guards",
    "state": "implemented_in_protected_draft",
    "summary": "Hashes são versionados e metadata rejeita dados brutos sensíveis.",
    "requiredSqlEvidence": [
      "mhidas_ticket_metadata_is_safe_v1",
      "sha256",
      "hash_version"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "communication_lifecycle_evidence",
    "state": "implemented_in_protected_draft",
    "summary": "Comunicações têm lifecycle, lock otimista, evidência e coerência comercial.",
    "requiredSqlEvidence": [
      "partner_official_communications",
      "mhidas_partner_communication_guard_v1",
      "review_evidence_hash"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "audit_coverage_and_consistency",
    "state": "implemented_in_protected_draft",
    "summary": "Operações críticas geram auditoria append-only com correlação e idempotência.",
    "requiredSqlEvidence": [
      "event_ticket_commercial_audit_log",
      "event_ticket_commercial_audit_append_only_v490",
      "correlation_id"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "retention_and_cleanup_enforcement",
    "state": "external_policy_approval_required",
    "summary": "O lote de retenção existe, mas períodos e base legal exigem aprovação externa.",
    "requiredSqlEvidence": [
      "event_ticket_retention_policy_versions",
      "mhidas_run_event_ticket_retention_batch_v1",
      "event_ticket_retention_runs"
    ],
    "promotionBlocked": true
  },
  {
    "adjustmentKey": "backfill_reconciliation_and_no_silent_skip",
    "state": "rejection_first_reconciliation",
    "summary": "Todas as linhas legadas relevantes são classificadas; nenhuma vira canal ativo automaticamente.",
    "requiredSqlEvidence": [
      "mhidas_v490_backfill_reconciliation",
      "BACKFILL_RECONCILIATION_COUNT_MISMATCH",
      "event_ticket_backfill_rejections"
    ],
    "promotionBlocked": true
  }
] as const satisfies readonly EventTicketCommercialAdjustedDraftEvidence[];

export type EventTicketCommercialAdjustedDraftAdjustmentKey =
  (typeof EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_EVIDENCE)[number]["adjustmentKey"];

export type EventTicketCommercialAdjustedDraftExternalPrerequisite = {
  prerequisiteKey: string;
  requiredEvidence: string;
  closed: false;
};

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES =
  [
  {
    "prerequisiteKey": "fresh_production_schema_inventory",
    "requiredEvidence": "Inventário atual de schema, constraints, policies, funções e grants da produção.",
    "closed": false
  },
  {
    "prerequisiteKey": "admin_authorization_rpc_contract",
    "requiredEvidence": "Contrato aprovado de mhidas_is_useclubbers_admin_v1(uuid), sem depender de metadata editável pelo usuário.",
    "closed": false
  },
  {
    "prerequisiteKey": "verified_partner_onboarding",
    "requiredEvidence": "Processo de verificação de parceiro, representante, validade e revogação.",
    "closed": false
  },
  {
    "prerequisiteKey": "commercial_financial_semantics",
    "requiredEvidence": "Aprovação comercial e contábil dos modelos de remuneração, moeda e arredondamento.",
    "closed": false
  },
  {
    "prerequisiteKey": "server_side_url_validator",
    "requiredEvidence": "Serviço server-side para DNS público, IP privado, redirects, SSRF, HTTPS e freshness.",
    "closed": false
  },
  {
    "prerequisiteKey": "ticketing_provider_namespace_registry",
    "requiredEvidence": "Registro de namespaces e contratos de evidência para integrações de ticketeiras.",
    "closed": false
  },
  {
    "prerequisiteKey": "privacy_legal_basis_and_retention",
    "requiredEvidence": "Base legal, classificação, períodos, anonimização, deleção e auditoria.",
    "closed": false
  },
  {
    "prerequisiteKey": "legacy_partner_and_event_mapping",
    "requiredEvidence": "Mapeamento verificado de parceiro legado e event_group para canonical_event_id.",
    "closed": false
  },
  {
    "prerequisiteKey": "backup_dry_run_and_reconciliation",
    "requiredEvidence": "Backup, dry-run em cópia, relatório de rejeitados e plano de rollback operacional.",
    "closed": false
  },
  {
    "prerequisiteKey": "parallel_concurrency_and_failure_tests",
    "requiredEvidence": "Testes com sessões paralelas, retries, idempotência, falha intermediária e cutover atômico.",
    "closed": false
  }
] as const satisfies readonly EventTicketCommercialAdjustedDraftExternalPrerequisite[];

export const EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW = {
  version: EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT_VERSION,
  baseVersion: EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT_BASE_VERSION,
  decision: "adjusted_draft_ready_for_structural_review",
  decisionReason:
    "Os 18 ajustes foram incorporados ou explicitamente contratados no novo rascunho protegido. A promoção continua bloqueada por dependências externas e por uma nova revisão estrutural obrigatória.",
  adjustedSqlSha256: EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT_SQL_SHA256,
  evidence: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_EVIDENCE,
  externalPrerequisites:
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES,
  nextAllowedArtifact: "new_structural_review_safe",
  promotionToExecutableMigrationAllowed: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicTicketLinkActivated: false,
  publicEventPageChanged: false,
  priorDraftChanged: false,
} as const;

export type EventTicketCommercialAdjustedDraftReviewRequest = {
  requestPriorDraftMutation?: boolean | null;
  requestExecutableMigration?: boolean | null;
  requestMoveToSupabaseMigrations?: boolean | null;
  requestSupabaseOperation?: boolean | null;
  requestDatabaseWrite?: boolean | null;
  requestPublicActivation?: boolean | null;
};

export type EventTicketCommercialAdjustedDraftReviewState =
  | "adjusted_draft_ready_for_structural_review"
  | "blocked_prior_draft_mutation_requested"
  | "blocked_executable_migration_requested"
  | "blocked_move_to_supabase_migrations_requested"
  | "blocked_supabase_operation_requested"
  | "blocked_database_write_requested"
  | "blocked_public_activation_requested";

export type EventTicketCommercialAdjustedDraftReviewResult = {
  ok: boolean;
  state: EventTicketCommercialAdjustedDraftReviewState;
  reason: string;
  review: typeof EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW;
};

export function evaluateEventTicketCommercialAdjustedDraftReview(
  request: EventTicketCommercialAdjustedDraftReviewRequest = {}
): EventTicketCommercialAdjustedDraftReviewResult {
  if (request.requestPriorDraftMutation === true) {
    return {
      ok: false,
      state: "blocked_prior_draft_mutation_requested",
      reason: "O rascunho protegido da v4.8.87 deve permanecer preservado.",
      review: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW,
    };
  }

  if (request.requestExecutableMigration === true) {
    return {
      ok: false,
      state: "blocked_executable_migration_requested",
      reason: "A v4.8.90 não cria migration executável.",
      review: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW,
    };
  }

  if (request.requestMoveToSupabaseMigrations === true) {
    return {
      ok: false,
      state: "blocked_move_to_supabase_migrations_requested",
      reason: "O SQL deve permanecer em docs/sql até nova revisão estrutural.",
      review: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW,
    };
  }

  if (request.requestSupabaseOperation === true) {
    return {
      ok: false,
      state: "blocked_supabase_operation_requested",
      reason: "Nenhuma operação Supabase pertence ao escopo desta versão.",
      review: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW,
    };
  }

  if (request.requestDatabaseWrite === true) {
    return {
      ok: false,
      state: "blocked_database_write_requested",
      reason: "Nenhuma escrita em banco pertence ao escopo desta versão.",
      review: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW,
    };
  }

  if (request.requestPublicActivation === true) {
    return {
      ok: false,
      state: "blocked_public_activation_requested",
      reason: "Nenhum link comercial ou alteração pública pode ser ativado.",
      review: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW,
    };
  }

  return {
    ok: true,
    state: "adjusted_draft_ready_for_structural_review",
    reason:
      "Rascunho ajustado protegido e pronto somente para uma nova revisão estrutural.",
    review: EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW,
  };
}

export type EventTicketCommercialAdjustedDraftSelfTestCheck = {
  checkKey: string;
  ok: boolean;
  detail: string;
};

export type EventTicketCommercialAdjustedDraftSelfTest = {
  ok: boolean;
  checks: EventTicketCommercialAdjustedDraftSelfTestCheck[];
  adjustmentCount: number;
  externalPrerequisiteCount: number;
  promotionAllowed: false;
};

function isSha256(value: string): boolean {
  return /^[A-F0-9]{64}$/.test(value);
}

export function runEventTicketCommercialAdjustedDraftSelfTest(): EventTicketCommercialAdjustedDraftSelfTest {
  const checks: EventTicketCommercialAdjustedDraftSelfTestCheck[] = [];
  const add = (checkKey: string, ok: boolean, detail: string): void => {
    checks.push({ checkKey, ok, detail });
  };

  add(
    "version",
    EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT_VERSION ===
      "v4.8.90-event-ticket-commercial-migration-adjusted-draft-safe",
    EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT_VERSION
  );
  add(
    "base_version",
    EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT_BASE_VERSION ===
      "v4.8.89-event-ticket-commercial-migration-adjustment-plan-safe",
    EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT_BASE_VERSION
  );
  add(
    "sql_sha256",
    isSha256(EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT_SQL_SHA256),
    EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT_SQL_SHA256
  );
  add(
    "adjustment_count",
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_EVIDENCE.length === 18,
    String(EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_EVIDENCE.length)
  );
  add(
    "adjustment_unique",
    new Set(
      EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_EVIDENCE.map(
        (item) => item.adjustmentKey
      )
    ).size === 18,
    "Cada ajuste deve aparecer exatamente uma vez."
  );
  add(
    "external_prerequisite_count",
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10,
    String(
      EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES.length
    )
  );
  add(
    "external_prerequisites_open",
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES.every(
      (item) => item.closed === false
    ),
    "As dez dependências externas permanecem abertas."
  );

  for (const item of EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_EVIDENCE) {
    add(
      `adjustment:${item.adjustmentKey}:promotion_blocked`,
      item.promotionBlocked === true,
      item.state
    );
    add(
      `adjustment:${item.adjustmentKey}:sql_evidence`,
      item.requiredSqlEvidence.length >= 3 &&
        item.requiredSqlEvidence.every((token) => token.trim().length > 0),
      item.requiredSqlEvidence.join(", ")
    );
  }

  add(
    "decision",
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW.decision ===
      "adjusted_draft_ready_for_structural_review",
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW.decision
  );
  add(
    "next_allowed_artifact",
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW.nextAllowedArtifact ===
      "new_structural_review_safe",
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW.nextAllowedArtifact
  );
  add(
    "promotion_blocked",
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW
      .promotionToExecutableMigrationAllowed === false,
    "promotionToExecutableMigrationAllowed=false"
  );
  add(
    "executable_migration_not_created",
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW.executableMigrationCreated ===
      false,
    "executableMigrationCreated=false"
  );
  add(
    "sql_not_moved",
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW
      .sqlMovedToSupabaseMigrations === false,
    "sqlMovedToSupabaseMigrations=false"
  );
  add(
    "no_supabase_operation",
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW
      .supabaseOperationPerformed === false,
    "supabaseOperationPerformed=false"
  );
  add(
    "no_database_write",
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW.databaseWritePerformed ===
      false,
    "databaseWritePerformed=false"
  );
  add(
    "no_public_activation",
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW
      .publicTicketLinkActivated === false,
    "publicTicketLinkActivated=false"
  );
  add(
    "no_public_page_change",
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW.publicEventPageChanged ===
      false,
    "publicEventPageChanged=false"
  );
  add(
    "prior_draft_preserved",
    EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_REVIEW.priorDraftChanged === false,
    "priorDraftChanged=false"
  );

  const blockedRequests: EventTicketCommercialAdjustedDraftReviewRequest[] = [
    { requestPriorDraftMutation: true },
    { requestExecutableMigration: true },
    { requestMoveToSupabaseMigrations: true },
    { requestSupabaseOperation: true },
    { requestDatabaseWrite: true },
    { requestPublicActivation: true },
  ];

  add(
    "all_forbidden_requests_blocked",
    blockedRequests.every(
      (request) =>
        evaluateEventTicketCommercialAdjustedDraftReview(request).ok === false
    ),
    "Seis operações proibidas foram recusadas."
  );

  const readyResult = evaluateEventTicketCommercialAdjustedDraftReview();
  add(
    "safe_review_request_allowed",
    readyResult.ok === true &&
      readyResult.state === "adjusted_draft_ready_for_structural_review",
    readyResult.state
  );

  return {
    ok: checks.every((check) => check.ok),
    checks,
    adjustmentCount:
      EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_EVIDENCE.length,
    externalPrerequisiteCount:
      EVENT_TICKET_COMMERCIAL_ADJUSTED_DRAFT_EXTERNAL_PREREQUISITES.length,
    promotionAllowed: false,
  };
}
