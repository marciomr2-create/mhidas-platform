export type FinalFrozenGateItem = {
  readonly key: string;
  readonly status: "approved";
  readonly evidence: string;
};

export const EVENT_TICKET_COMMERCIAL_MIGRATION_FINAL_FROZEN_GATE_ITEMS = [
  {
    key: "scope_frozen",
    status: "approved",
    evidence: "Scope and requirements are frozen at v4.8.120. No new feature, governance or schema requirement may be added in this phase.",
  },
  {
    key: "base_artifacts_immutable",
    status: "approved",
    evidence: "The v4.8.120 SQL, documentation and TypeScript contract remain byte-identical.",
  },
  {
    key: "postgres_parser_complete",
    status: "approved",
    evidence: "The protected SQL is recognized as 148 PostgreSQL statements by the static parser.",
  },
  {
    key: "execution_guard_present",
    status: "approved",
    evidence: "The unconditional protected-draft guard remains present.",
  },
  {
    key: "rollback_present",
    status: "approved",
    evidence: "The protected draft still terminates with rollback.",
  },
  {
    key: "known_remediation_closed",
    status: "approved",
    evidence: "All ten corrections from the v4.8.119 remediation matrix are evidenced in the v4.8.120 SQL.",
  },
  {
    key: "static_contracts_closed",
    status: "approved",
    evidence: "Retention, minimization, operation-result and executor contracts are statically materialized.",
  },
  {
    key: "runtime_proof_required",
    status: "approved",
    evidence: "Static validation is complete; runtime correctness must now be proven in an isolated PostgreSQL environment.",
  },
  {
    key: "no_new_structural_review",
    status: "approved",
    evidence: "No additional open-ended structural-review cycle is permitted before isolated execution.",
  },
  {
    key: "no_executable_migration_yet",
    status: "approved",
    evidence: "No file is moved to supabase/migrations in this gate.",
  },
  {
    key: "no_database_operation",
    status: "approved",
    evidence: "This gate performs no Supabase operation and no database write.",
  },
  {
    key: "next_stage_fixed",
    status: "approved",
    evidence: "The only next stage is isolated PostgreSQL execution, rollback and concurrency testing.",
  },
] as const satisfies readonly FinalFrozenGateItem[];

export const EVENT_TICKET_COMMERCIAL_MIGRATION_FINAL_FROZEN_RUNTIME_CHECKS = [
  "ddl_creation_order_and_function_body_compilation",
  "transaction_rollback_zero_persistent_objects",
  "constraints_triggers_rls_and_grants",
  "credential_rotation_and_context_lifecycle",
  "commercial_channel_activation_replacement_resolution",
  "purchase_signal_idempotency_and_concurrency",
  "retention_family_concurrency_and_global_budget",
  "legacy_backfill_checksum_cutover_rollback",
  "receipt_terminal_state_and_result_contracts",
  "failure_cleanup_and_repeatable_execution",
] as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_THIRTEENTH_CORRECTED_DRAFT_FINAL_FROZEN_GATE = {
  version: "v4.8.121-event-ticket-commercial-migration-thirteenth-corrected-adjusted-draft-final-frozen-gate-safe",
  baseVersion: "v4.8.120-event-ticket-commercial-migration-thirteenth-corrected-adjusted-draft-safe",
  baseCommit: "07c20bec3258076c485c64960b0a149e1e58953a",
  decision: "ready_for_isolated_execution",
  scopeFrozen: true,
  newRequirementsAllowed: false,
  knownRemediationItemsClosed: 10,
  newRemediationItemsOpened: 0,
  postgresStatementCount: 148,
  staticSqlValidationComplete: true,
  readyForIsolatedExecution: true,
  runtimeChecks: EVENT_TICKET_COMMERCIAL_MIGRATION_FINAL_FROZEN_RUNTIME_CHECKS,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicFeatureChanged: false,
  productionPromotionAllowed: false,
  nextStage: "isolated_postgresql_execution",
} as const;

export function selfTestEventTicketCommercialMigrationFinalFrozenGate(): {
  readonly ok: boolean;
  readonly checks: readonly boolean[];
} {
  const gateKeys = new Set(EVENT_TICKET_COMMERCIAL_MIGRATION_FINAL_FROZEN_GATE_ITEMS.map((item) => item.key));
  const gate = EVENT_TICKET_COMMERCIAL_MIGRATION_THIRTEENTH_CORRECTED_DRAFT_FINAL_FROZEN_GATE;
  const checks = [
    EVENT_TICKET_COMMERCIAL_MIGRATION_FINAL_FROZEN_GATE_ITEMS.length === 12,
    gateKeys.size === 12,
    EVENT_TICKET_COMMERCIAL_MIGRATION_FINAL_FROZEN_GATE_ITEMS.every((item) => item.status === "approved"),
    EVENT_TICKET_COMMERCIAL_MIGRATION_FINAL_FROZEN_RUNTIME_CHECKS.length === 10,
    gate.decision === "ready_for_isolated_execution",
    gate.scopeFrozen === true,
    gate.newRequirementsAllowed === false,
    gate.knownRemediationItemsClosed === 10,
    gate.newRemediationItemsOpened === 0,
    gate.postgresStatementCount === 148,
    gate.staticSqlValidationComplete === true,
    gate.readyForIsolatedExecution === true,
    gate.executableMigrationCreated === false,
    gate.sqlMovedToSupabaseMigrations === false,
    gate.supabaseOperationPerformed === false,
    gate.databaseWritePerformed === false,
    gate.publicFeatureChanged === false,
    gate.productionPromotionAllowed === false,
    gate.nextStage === "isolated_postgresql_execution",
  ] as const;
  return { ok: checks.every(Boolean), checks };
}
