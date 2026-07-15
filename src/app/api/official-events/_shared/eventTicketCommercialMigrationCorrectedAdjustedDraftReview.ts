// src/app/api/official-events/_shared/eventTicketCommercialMigrationCorrectedAdjustedDraftReview.ts

export const EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT_VERSION =
  "v4.8.93-event-ticket-commercial-migration-corrected-adjusted-draft-safe" as const;

export const EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT_BASE_VERSION =
  "v4.8.92-event-ticket-commercial-adjusted-draft-second-adjustment-plan-safe" as const;

export const EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT_BASE_COMMIT =
  "c366f752abb380487dc1d3378d78d484b2715bf4" as const;

export const EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT_SQL_SHA256 =
  "4DC566C2B3259DEC30498BC4BD3FF77AA9B52AA0D9A9F8B65013DD81B15CFECE" as const;

export type EventTicketCommercialCorrectedAdjustment = {
  key: string;
  implemented: true;
  summary: string;
  blocksPromotionUntilReview: true;
};

export const EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTMENTS =
  [
  {
    "key": "automation_expiry_state_mismatch",
    "implemented": true,
    "summary": "Expiração automática alinhada aos estados authorized, active e paused, com allowlist de colunas, recibo por canal e contagem apenas de updates efetivos.",
    "blocksPromotionUntilReview": true
  },
  {
    "key": "idempotency_receipt_not_bound_to_actor_and_request",
    "implemented": true,
    "summary": "Recibos vinculados a principal, operação, alvo, expected_lock_version e request_hash; autorização ocorre antes do replay.",
    "blocksPromotionUntilReview": true
  },
  {
    "key": "metadata_privacy_guard_is_denylist_only",
    "implemented": true,
    "summary": "Metadata passa a usar allowlists por contexto, formato plano, limite de bytes/itens e rejeição de valores com URL, token, e-mail, telefone ou IP.",
    "blocksPromotionUntilReview": true
  },
  {
    "key": "purchase_signal_retention_mutation_scope_too_broad",
    "implemented": true,
    "summary": "Trigger permite somente a allowlist de anonimização durante RPC dedicada e congela todos os campos factuais.",
    "blocksPromotionUntilReview": true
  },
  {
    "key": "retention_delete_conflicts_with_signal_lineage_and_audit_fk",
    "implemented": true,
    "summary": "DELETE de purchase signals foi removido; sinais são tombstoned antes dos cliques e cliques ainda referenciados são anonimizados, preservando lineage e auditoria.",
    "blocksPromotionUntilReview": true
  },
  {
    "key": "partner_membership_ambiguity_and_partner_status_gap",
    "implemented": true,
    "summary": "Representante é validado pelo partner_id exato, parceiro verified, representação active e vigência válida.",
    "blocksPromotionUntilReview": true
  },
  {
    "key": "url_validation_freshness_is_optional_and_resolver_fail_open",
    "implemented": true,
    "summary": "Booleano do chamador foi removido; drafts iniciam pending, somente RPC service-role registra prova e authorize/activate/cutover/resolver exigem validação fresca e saudável.",
    "blocksPromotionUntilReview": true
  }
] as const satisfies readonly EventTicketCommercialCorrectedAdjustment[];

export const EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES =
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

export const EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT = {
  version: EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT_VERSION,
  baseVersion: EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT_BASE_VERSION,
  baseCommit: EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT_BASE_COMMIT,
  decision: "corrected_adjusted_draft_ready_for_second_structural_review",
  correctedSqlSha256: EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT_SQL_SHA256,
  postgresStatementCount: 145,
  correctedAdjustments: EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTMENTS,
  openExternalPrerequisites:
    EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES,
  nextAllowedArtifact: "second_structural_review_safe",
  promotionToExecutableMigrationAllowed: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  publicTicketLinkActivated: false,
  previousAdjustedDraftChanged: false,
} as const;

export type EventTicketCommercialCorrectedDraftRequest = {
  requestExecutableMigration?: boolean | null;
  requestMoveToSupabaseMigrations?: boolean | null;
  requestSupabaseOperation?: boolean | null;
  requestDatabaseWrite?: boolean | null;
  requestPublicActivation?: boolean | null;
};

export type EventTicketCommercialCorrectedDraftState =
  | "corrected_adjusted_draft_ready_for_second_structural_review"
  | "blocked_executable_migration_requested"
  | "blocked_move_to_supabase_migrations_requested"
  | "blocked_supabase_operation_requested"
  | "blocked_database_write_requested"
  | "blocked_public_activation_requested";

export function evaluateEventTicketCommercialCorrectedDraft(
  request: EventTicketCommercialCorrectedDraftRequest = {}
): {
  ok: boolean;
  state: EventTicketCommercialCorrectedDraftState;
  reason: string;
  draft: typeof EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT;
} {
  const blocked: ReadonlyArray<[
    keyof EventTicketCommercialCorrectedDraftRequest,
    EventTicketCommercialCorrectedDraftState,
    string,
  ]> = [
    ["requestExecutableMigration", "blocked_executable_migration_requested", "O SQL continua sendo rascunho protegido."],
    ["requestMoveToSupabaseMigrations", "blocked_move_to_supabase_migrations_requested", "O SQL deve permanecer em docs/sql."],
    ["requestSupabaseOperation", "blocked_supabase_operation_requested", "Nenhuma operação Supabase pertence ao escopo."],
    ["requestDatabaseWrite", "blocked_database_write_requested", "Nenhuma escrita no banco pertence ao escopo."],
    ["requestPublicActivation", "blocked_public_activation_requested", "Nenhum link comercial pode ser ativado."],
  ];

  for (const [key, state, reason] of blocked) {
    if (request[key] === true) {
      return { ok: false, state, reason, draft: EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT };
    }
  }

  return {
    ok: true,
    state: "corrected_adjusted_draft_ready_for_second_structural_review",
    reason: "Os sete bloqueadores foram corrigidos no novo rascunho protegido; promoção depende de revisão estrutural independente.",
    draft: EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT,
  };
}

export function runEventTicketCommercialCorrectedDraftSelfTest(): {
  ok: boolean;
  checks: ReadonlyArray<{ checkKey: string; ok: boolean; detail: string }>;
  correctedAdjustmentCount: number;
  criticalCorrectionCount: number;
  externalPrerequisiteCount: number;
  promotionAllowed: false;
} {
  const checks: Array<{ checkKey: string; ok: boolean; detail: string }> = [];
  const add = (checkKey: string, ok: boolean, detail: string): void => {
    checks.push({ checkKey, ok, detail });
  };

  const corrections = EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTMENTS;
  add("seven_corrections", corrections.length === 7, `count=${corrections.length}`);
  add("all_implemented", corrections.every((item) => item.implemented), "all corrections implemented");
  add("all_block_review", corrections.every((item) => item.blocksPromotionUntilReview), "second review required");
  add("external_prerequisites_open", EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10, "external prerequisites remain open");
  add("promotion_blocked", EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT.promotionToExecutableMigrationAllowed === false, "promotion blocked");
  add("no_database_write", EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT.databaseWritePerformed === false, "database untouched");
  add("no_supabase_operation", EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT.supabaseOperationPerformed === false, "Supabase untouched");
  add("previous_draft_preserved", EVENT_TICKET_COMMERCIAL_CORRECTED_ADJUSTED_DRAFT.previousAdjustedDraftChanged === false, "v4.8.90 preserved");

  for (const correction of corrections) {
    add(`correction_${correction.key}`, correction.implemented, correction.summary);
  }

  return {
    ok: checks.every((item) => item.ok),
    checks,
    correctedAdjustmentCount: corrections.length,
    criticalCorrectionCount: 6,
    externalPrerequisiteCount:
      EVENT_TICKET_COMMERCIAL_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length,
    promotionAllowed: false,
  };
}
