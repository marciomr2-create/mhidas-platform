// src/app/api/official-events/_shared/eventCanonicalSchemaPlan.ts

export type EventCanonicalSchemaPlanTableKey =
  | "canonical_events"
  | "canonical_event_sources"
  | "canonical_event_search_documents"
  | "canonical_event_feature_feeds";

export type EventCanonicalSchemaPlanColumnType =
  | "uuid"
  | "text"
  | "timestamptz"
  | "date"
  | "boolean"
  | "integer"
  | "numeric"
  | "jsonb"
  | "text_array";

export type EventCanonicalSchemaPlanColumnRole =
  | "primary_identity"
  | "event_identity"
  | "source_trace"
  | "search_document"
  | "feature_feed"
  | "audit"
  | "safety";

export type EventCanonicalSchemaPlanConstraintKind =
  | "primary_key"
  | "not_null"
  | "unique"
  | "foreign_key"
  | "check"
  | "default"
  | "index";

export type EventCanonicalSchemaPlanDecisionState =
  | "schema_plan_ready"
  | "blocked_real_migration_requested"
  | "blocked_database_write_requested"
  | "blocked_table_scope_not_allowed"
  | "blocked_empty_table_scope";

export type EventCanonicalSchemaPlanLane =
  | "schema_contract_plan_lane"
  | "migration_safety_block_lane"
  | "database_write_safety_block_lane"
  | "table_scope_block_lane";

export type EventCanonicalSchemaPlanReason =
  | "canonical_schema_contract_ready_without_migration"
  | "real_migration_not_allowed_in_foundation"
  | "database_write_not_allowed_in_foundation"
  | "requested_table_scope_contains_unapproved_table"
  | "requested_table_scope_is_empty";

export type EventCanonicalSchemaPlanSafetyFlag =
  | "schema_plan_only"
  | "migration_file_not_created"
  | "supabase_operation_not_performed"
  | "database_write_not_performed"
  | "external_request_not_performed"
  | "real_auto_publish_disabled"
  | "human_event_analysis_not_required"
  | "canonical_events_table_planned"
  | "canonical_event_sources_table_planned"
  | "canonical_event_search_documents_table_planned"
  | "canonical_event_feature_feeds_table_planned"
  | "rls_policy_must_be_defined_before_real_migration"
  | "service_role_write_path_must_be_explicit_before_real_migration"
  | "idempotency_required_before_real_persistence"
  | "real_migration_requested_but_blocked"
  | "database_write_requested_but_blocked"
  | "table_scope_validated";

export type EventCanonicalSchemaPlanColumn = {
  column_name: string;
  column_type: EventCanonicalSchemaPlanColumnType;
  nullable: boolean;
  column_role: EventCanonicalSchemaPlanColumnRole;
  planned_constraints: EventCanonicalSchemaPlanConstraintKind[];
  description: string;
};

export type EventCanonicalSchemaPlanIndex = {
  index_key: string;
  columns: string[];
  unique: boolean;
  purpose: string;
};

export type EventCanonicalSchemaPlanRelationship = {
  relationship_key: string;
  from_table: EventCanonicalSchemaPlanTableKey;
  from_columns: string[];
  to_table: EventCanonicalSchemaPlanTableKey;
  to_columns: string[];
  delete_behavior: "restrict" | "cascade" | "set_null";
  purpose: string;
};

export type EventCanonicalSchemaPlanRlsPolicy = {
  policy_key: string;
  table_key: EventCanonicalSchemaPlanTableKey;
  intended_role: "public_read" | "authenticated_read" | "admin_write" | "service_role_write";
  enabled_before_real_migration: false;
  purpose: string;
};

export type EventCanonicalSchemaPlanTable = {
  table_key: EventCanonicalSchemaPlanTableKey;
  purpose: string;
  planned_columns: EventCanonicalSchemaPlanColumn[];
  planned_indexes: EventCanonicalSchemaPlanIndex[];
};

export type EventCanonicalSchemaPlan = {
  plan_key: string;
  planned_tables: EventCanonicalSchemaPlanTable[];
  planned_relationships: EventCanonicalSchemaPlanRelationship[];
  planned_rls_policies: EventCanonicalSchemaPlanRlsPolicy[];
  migration_execution_order: EventCanonicalSchemaPlanTableKey[];
  rollback_order: EventCanonicalSchemaPlanTableKey[];
  requires_future_human_review_before_real_migration: true;
  requires_future_backup_before_real_migration: true;
  requires_future_build_before_real_migration: true;
  requires_future_supabase_diff_review: true;
};

export type EventCanonicalSchemaPlanInput = {
  requested_table_scope?: EventCanonicalSchemaPlanTableKey[] | null;
  include_feature_feed_plan?: boolean | null;
  allow_real_migration?: boolean | null;
  allow_database_write?: boolean | null;
};

export type EventCanonicalSchemaPlanDecision = {
  decision_state: EventCanonicalSchemaPlanDecisionState;
  schema_plan_lane: EventCanonicalSchemaPlanLane;
  reason: EventCanonicalSchemaPlanReason;
  schema_plan: EventCanonicalSchemaPlan | null;
  requested_table_scope: EventCanonicalSchemaPlanTableKey[];
  planned_table_count: number;
  planned_relationship_count: number;
  planned_rls_policy_count: number;
  should_create_migration_file_now: false;
  should_apply_supabase_migration_now: false;
  should_write_database_now: false;
  can_prepare_real_migration_later: boolean;
  can_prepare_persistence_tables_later: boolean;
  safety_flags: EventCanonicalSchemaPlanSafetyFlag[];
  external_request_performed: false;
  migration_file_created: false;
  supabase_operation_performed: false;
  database_write_performed: false;
  human_event_analysis_required: false;
  real_auto_publish_enabled: false;
  real_auto_publish_allowed: false;
};

const ALLOWED_TABLE_KEYS: EventCanonicalSchemaPlanTableKey[] = [
  "canonical_events",
  "canonical_event_sources",
  "canonical_event_search_documents",
  "canonical_event_feature_feeds",
];

function uniqueTableKeys(
  values: EventCanonicalSchemaPlanTableKey[]
): EventCanonicalSchemaPlanTableKey[] {
  return Array.from(new Set(values));
}

function resolveRequestedTableScope(
  input: EventCanonicalSchemaPlanInput
): EventCanonicalSchemaPlanTableKey[] {
  if (input.requested_table_scope) {
    return uniqueTableKeys(input.requested_table_scope);
  }

  const baseScope: EventCanonicalSchemaPlanTableKey[] = [
    "canonical_events",
    "canonical_event_sources",
    "canonical_event_search_documents",
  ];

  if (input.include_feature_feed_plan === true) {
    baseScope.push("canonical_event_feature_feeds");
  }

  return baseScope;
}

function isAllowedTableScope(scope: EventCanonicalSchemaPlanTableKey[]): boolean {
  return scope.every((tableKey) => ALLOWED_TABLE_KEYS.includes(tableKey));
}

function column(
  columnName: string,
  columnType: EventCanonicalSchemaPlanColumnType,
  nullable: boolean,
  columnRole: EventCanonicalSchemaPlanColumnRole,
  plannedConstraints: EventCanonicalSchemaPlanConstraintKind[],
  description: string
): EventCanonicalSchemaPlanColumn {
  return {
    column_name: columnName,
    column_type: columnType,
    nullable,
    column_role: columnRole,
    planned_constraints: plannedConstraints,
    description,
  };
}

function buildCanonicalEventsTable(): EventCanonicalSchemaPlanTable {
  return {
    table_key: "canonical_events",
    purpose:
      "Store one internal canonical event record for each validated real-world event occurrence.",
    planned_columns: [
      column("id", "uuid", false, "primary_identity", ["primary_key"], "Internal canonical event id."),
      column("event_name", "text", false, "event_identity", ["not_null", "index"], "Human-readable event name."),
      column("normalized_event_name", "text", false, "event_identity", ["not_null", "index"], "Normalized name for deduplication and search."),
      column("starts_at", "timestamptz", false, "event_identity", ["not_null", "index"], "Canonical event start timestamp."),
      column("event_date_key", "date", false, "event_identity", ["not_null", "index"], "Date-only key used for matching and search."),
      column("venue_name", "text", true, "event_identity", ["index"], "Venue name when known."),
      column("city", "text", true, "event_identity", ["index"], "Event city."),
      column("state", "text", true, "event_identity", ["index"], "Event state or region."),
      column("country", "text", true, "event_identity", ["index"], "Event country."),
      column("official_url", "text", true, "event_identity", ["unique"], "Canonical official event URL when available."),
      column("ticket_url", "text", true, "event_identity", ["unique"], "Canonical ticket URL when available."),
      column("primary_provider_key", "text", true, "source_trace", ["index"], "Primary source/provider used for validation."),
      column("primary_external_event_id", "text", true, "source_trace", ["index"], "External event id from primary provider."),
      column("is_100_percent_validated", "boolean", false, "safety", ["not_null", "check", "default"], "Must be true before public canonical use."),
      column("validation_summary", "jsonb", false, "safety", ["not_null", "default"], "Structured validation trace summary."),
      column("created_at", "timestamptz", false, "audit", ["not_null", "default"], "Creation timestamp."),
      column("updated_at", "timestamptz", false, "audit", ["not_null", "default"], "Last update timestamp."),
    ],
    planned_indexes: [
      {
        index_key: "canonical_events_identity_lookup_idx",
        columns: ["normalized_event_name", "event_date_key", "city", "state"],
        unique: false,
        purpose: "Support canonical deduplication and internal event lookup.",
      },
      {
        index_key: "canonical_events_primary_external_source_idx",
        columns: ["primary_provider_key", "primary_external_event_id"],
        unique: true,
        purpose: "Prevent duplicate canonical records from the same primary provider event id.",
      },
    ],
  };
}

function buildCanonicalEventSourcesTable(): EventCanonicalSchemaPlanTable {
  return {
    table_key: "canonical_event_sources",
    purpose:
      "Store every source trace attached to a canonical event, including APIs, official pages, editorial signals and community signals.",
    planned_columns: [
      column("id", "uuid", false, "primary_identity", ["primary_key"], "Source trace row id."),
      column("canonical_event_id", "uuid", false, "source_trace", ["not_null", "foreign_key", "index"], "Target canonical event id."),
      column("source_key", "text", false, "source_trace", ["not_null"], "Stable source trace key."),
      column("source_kind", "text", false, "source_trace", ["not_null", "index"], "Source kind, such as authorized ticketing API or official site."),
      column("provider_key", "text", true, "source_trace", ["index"], "Provider key when available."),
      column("external_event_id", "text", true, "source_trace", ["index"], "External event id from this source."),
      column("source_url", "text", true, "source_trace", ["index"], "Source URL when available."),
      column("authority_score", "integer", false, "source_trace", ["not_null", "default", "check"], "Authority score used for explainability."),
      column("source_payload_summary", "jsonb", false, "source_trace", ["not_null", "default"], "Safe compact payload summary."),
      column("created_at", "timestamptz", false, "audit", ["not_null", "default"], "Creation timestamp."),
    ],
    planned_indexes: [
      {
        index_key: "canonical_event_sources_event_id_idx",
        columns: ["canonical_event_id"],
        unique: false,
        purpose: "List all source traces for a canonical event.",
      },
      {
        index_key: "canonical_event_sources_unique_source_idx",
        columns: ["canonical_event_id", "source_key"],
        unique: true,
        purpose: "Avoid attaching the same source trace twice.",
      },
    ],
  };
}

function buildCanonicalSearchDocumentsTable(): EventCanonicalSchemaPlanTable {
  return {
    table_key: "canonical_event_search_documents",
    purpose:
      "Store normalized local search documents derived from canonical events for internal search and autocomplete.",
    planned_columns: [
      column("id", "uuid", false, "primary_identity", ["primary_key"], "Search document row id."),
      column("canonical_event_id", "uuid", false, "search_document", ["not_null", "foreign_key", "unique"], "Target canonical event id."),
      column("search_title", "text", false, "search_document", ["not_null", "index"], "Display title for search results."),
      column("normalized_title", "text", false, "search_document", ["not_null", "index"], "Normalized title for search matching."),
      column("event_date_key", "date", false, "search_document", ["not_null", "index"], "Date key for search filters."),
      column("canonical_slug_seed", "text", false, "search_document", ["not_null", "index"], "Stable slug seed for future event URLs."),
      column("search_tokens", "text_array", false, "search_document", ["not_null"], "Token list for autocomplete/search."),
      column("availability_scope", "text_array", false, "search_document", ["not_null"], "Allowed consumers such as internal_search and autocomplete."),
      column("search_rank_score", "integer", false, "search_document", ["not_null", "default", "index"], "Ranking score for search ordering."),
      column("source_trace_summary", "jsonb", false, "search_document", ["not_null", "default"], "Compact source trace summary for explainability."),
      column("created_at", "timestamptz", false, "audit", ["not_null", "default"], "Creation timestamp."),
      column("updated_at", "timestamptz", false, "audit", ["not_null", "default"], "Last update timestamp."),
    ],
    planned_indexes: [
      {
        index_key: "canonical_event_search_documents_lookup_idx",
        columns: ["normalized_title", "event_date_key", "search_rank_score"],
        unique: false,
        purpose: "Support local event search and autocomplete ordering.",
      },
      {
        index_key: "canonical_event_search_documents_event_unique_idx",
        columns: ["canonical_event_id"],
        unique: true,
        purpose: "Keep one active search document per canonical event.",
      },
    ],
  };
}

function buildCanonicalFeatureFeedsTable(): EventCanonicalSchemaPlanTable {
  return {
    table_key: "canonical_event_feature_feeds",
    purpose:
      "Store safe references that allow canonical events to feed check-in, ticket intent, rides, meetups and social radar later.",
    planned_columns: [
      column("id", "uuid", false, "primary_identity", ["primary_key"], "Feature feed row id."),
      column("canonical_event_id", "uuid", false, "feature_feed", ["not_null", "foreign_key", "index"], "Target canonical event id."),
      column("feature_key", "text", false, "feature_feed", ["not_null", "index"], "Feature consumer key."),
      column("enabled", "boolean", false, "feature_feed", ["not_null", "default"], "Whether this feature feed is enabled."),
      column("feed_policy", "jsonb", false, "feature_feed", ["not_null", "default"], "Feature feed policy snapshot."),
      column("created_at", "timestamptz", false, "audit", ["not_null", "default"], "Creation timestamp."),
      column("updated_at", "timestamptz", false, "audit", ["not_null", "default"], "Last update timestamp."),
    ],
    planned_indexes: [
      {
        index_key: "canonical_event_feature_feeds_unique_feature_idx",
        columns: ["canonical_event_id", "feature_key"],
        unique: true,
        purpose: "Avoid duplicate feed rows for the same event and feature.",
      },
    ],
  };
}

function getTablePlan(
  tableKey: EventCanonicalSchemaPlanTableKey
): EventCanonicalSchemaPlanTable {
  if (tableKey === "canonical_events") {
    return buildCanonicalEventsTable();
  }

  if (tableKey === "canonical_event_sources") {
    return buildCanonicalEventSourcesTable();
  }

  if (tableKey === "canonical_event_search_documents") {
    return buildCanonicalSearchDocumentsTable();
  }

  return buildCanonicalFeatureFeedsTable();
}

function buildRelationships(
  scope: EventCanonicalSchemaPlanTableKey[]
): EventCanonicalSchemaPlanRelationship[] {
  const relationships: EventCanonicalSchemaPlanRelationship[] = [];

  if (
    scope.includes("canonical_events") &&
    scope.includes("canonical_event_sources")
  ) {
    relationships.push({
      relationship_key: "canonical_event_sources_event_fk",
      from_table: "canonical_event_sources",
      from_columns: ["canonical_event_id"],
      to_table: "canonical_events",
      to_columns: ["id"],
      delete_behavior: "cascade",
      purpose: "Attach source traces to the canonical event they validate.",
    });
  }

  if (
    scope.includes("canonical_events") &&
    scope.includes("canonical_event_search_documents")
  ) {
    relationships.push({
      relationship_key: "canonical_event_search_documents_event_fk",
      from_table: "canonical_event_search_documents",
      from_columns: ["canonical_event_id"],
      to_table: "canonical_events",
      to_columns: ["id"],
      delete_behavior: "cascade",
      purpose: "Bind local search document to one canonical event.",
    });
  }

  if (
    scope.includes("canonical_events") &&
    scope.includes("canonical_event_feature_feeds")
  ) {
    relationships.push({
      relationship_key: "canonical_event_feature_feeds_event_fk",
      from_table: "canonical_event_feature_feeds",
      from_columns: ["canonical_event_id"],
      to_table: "canonical_events",
      to_columns: ["id"],
      delete_behavior: "cascade",
      purpose: "Bind feature feed references to one canonical event.",
    });
  }

  return relationships;
}

function buildRlsPolicies(
  scope: EventCanonicalSchemaPlanTableKey[]
): EventCanonicalSchemaPlanRlsPolicy[] {
  return scope.flatMap((tableKey) => [
    {
      policy_key: `${tableKey}_admin_write_policy_plan`,
      table_key: tableKey,
      intended_role: "admin_write",
      enabled_before_real_migration: false,
      purpose: "Future admin write path must be explicit before real migration.",
    },
    {
      policy_key: `${tableKey}_service_role_write_policy_plan`,
      table_key: tableKey,
      intended_role: "service_role_write",
      enabled_before_real_migration: false,
      purpose: "Future service role write path must be explicit before real migration.",
    },
  ]);
}

function buildSchemaPlan(
  scope: EventCanonicalSchemaPlanTableKey[]
): EventCanonicalSchemaPlan {
  const plannedTables = scope.map((tableKey) => getTablePlan(tableKey));
  const plannedRelationships = buildRelationships(scope);
  const plannedRlsPolicies = buildRlsPolicies(scope);

  return {
    plan_key: "event-canonical-schema-plan-v4-8-46",
    planned_tables: plannedTables,
    planned_relationships: plannedRelationships,
    planned_rls_policies: plannedRlsPolicies,
    migration_execution_order: scope,
    rollback_order: [...scope].reverse(),
    requires_future_human_review_before_real_migration: true,
    requires_future_backup_before_real_migration: true,
    requires_future_build_before_real_migration: true,
    requires_future_supabase_diff_review: true,
  };
}

function buildSafetyFlags(args: {
  scope: EventCanonicalSchemaPlanTableKey[];
  schemaPlan: EventCanonicalSchemaPlan | null;
  realMigrationRequestedButBlocked: boolean;
  databaseWriteRequestedButBlocked: boolean;
}): EventCanonicalSchemaPlanSafetyFlag[] {
  const flags: EventCanonicalSchemaPlanSafetyFlag[] = [
    "schema_plan_only",
    "migration_file_not_created",
    "supabase_operation_not_performed",
    "database_write_not_performed",
    "external_request_not_performed",
    "real_auto_publish_disabled",
    "human_event_analysis_not_required",
    "rls_policy_must_be_defined_before_real_migration",
    "service_role_write_path_must_be_explicit_before_real_migration",
    "idempotency_required_before_real_persistence",
  ];

  if (args.schemaPlan) {
    flags.push("table_scope_validated");
  }

  if (args.scope.includes("canonical_events")) {
    flags.push("canonical_events_table_planned");
  }

  if (args.scope.includes("canonical_event_sources")) {
    flags.push("canonical_event_sources_table_planned");
  }

  if (args.scope.includes("canonical_event_search_documents")) {
    flags.push("canonical_event_search_documents_table_planned");
  }

  if (args.scope.includes("canonical_event_feature_feeds")) {
    flags.push("canonical_event_feature_feeds_table_planned");
  }

  if (args.realMigrationRequestedButBlocked) {
    flags.push("real_migration_requested_but_blocked");
  }

  if (args.databaseWriteRequestedButBlocked) {
    flags.push("database_write_requested_but_blocked");
  }

  return flags;
}

function buildDecision(args: {
  decisionState: EventCanonicalSchemaPlanDecisionState;
  lane: EventCanonicalSchemaPlanLane;
  reason: EventCanonicalSchemaPlanReason;
  scope: EventCanonicalSchemaPlanTableKey[];
  schemaPlan: EventCanonicalSchemaPlan | null;
  canPrepareRealMigrationLater: boolean;
  canPreparePersistenceTablesLater: boolean;
  realMigrationRequestedButBlocked: boolean;
  databaseWriteRequestedButBlocked: boolean;
}): EventCanonicalSchemaPlanDecision {
  return {
    decision_state: args.decisionState,
    schema_plan_lane: args.lane,
    reason: args.reason,
    schema_plan: args.schemaPlan,
    requested_table_scope: args.scope,
    planned_table_count: args.schemaPlan?.planned_tables.length ?? 0,
    planned_relationship_count: args.schemaPlan?.planned_relationships.length ?? 0,
    planned_rls_policy_count: args.schemaPlan?.planned_rls_policies.length ?? 0,
    should_create_migration_file_now: false,
    should_apply_supabase_migration_now: false,
    should_write_database_now: false,
    can_prepare_real_migration_later: args.canPrepareRealMigrationLater,
    can_prepare_persistence_tables_later: args.canPreparePersistenceTablesLater,
    safety_flags: buildSafetyFlags({
      scope: args.scope,
      schemaPlan: args.schemaPlan,
      realMigrationRequestedButBlocked: args.realMigrationRequestedButBlocked,
      databaseWriteRequestedButBlocked: args.databaseWriteRequestedButBlocked,
    }),
    external_request_performed: false,
    migration_file_created: false,
    supabase_operation_performed: false,
    database_write_performed: false,
    human_event_analysis_required: false,
    real_auto_publish_enabled: false,
    real_auto_publish_allowed: false,
  };
}

export function resolveEventCanonicalSchemaPlanDecision(
  input: EventCanonicalSchemaPlanInput = {}
): EventCanonicalSchemaPlanDecision {
  const scope = resolveRequestedTableScope(input);
  const realMigrationRequestedButBlocked = input.allow_real_migration === true;
  const databaseWriteRequestedButBlocked = input.allow_database_write === true;

  if (realMigrationRequestedButBlocked) {
    return buildDecision({
      decisionState: "blocked_real_migration_requested",
      lane: "migration_safety_block_lane",
      reason: "real_migration_not_allowed_in_foundation",
      scope,
      schemaPlan: null,
      canPrepareRealMigrationLater: false,
      canPreparePersistenceTablesLater: false,
      realMigrationRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (databaseWriteRequestedButBlocked) {
    return buildDecision({
      decisionState: "blocked_database_write_requested",
      lane: "database_write_safety_block_lane",
      reason: "database_write_not_allowed_in_foundation",
      scope,
      schemaPlan: null,
      canPrepareRealMigrationLater: false,
      canPreparePersistenceTablesLater: false,
      realMigrationRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (scope.length === 0) {
    return buildDecision({
      decisionState: "blocked_empty_table_scope",
      lane: "table_scope_block_lane",
      reason: "requested_table_scope_is_empty",
      scope,
      schemaPlan: null,
      canPrepareRealMigrationLater: false,
      canPreparePersistenceTablesLater: false,
      realMigrationRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  if (!isAllowedTableScope(scope)) {
    return buildDecision({
      decisionState: "blocked_table_scope_not_allowed",
      lane: "table_scope_block_lane",
      reason: "requested_table_scope_contains_unapproved_table",
      scope,
      schemaPlan: null,
      canPrepareRealMigrationLater: false,
      canPreparePersistenceTablesLater: false,
      realMigrationRequestedButBlocked,
      databaseWriteRequestedButBlocked,
    });
  }

  const schemaPlan = buildSchemaPlan(scope);

  return buildDecision({
    decisionState: "schema_plan_ready",
    lane: "schema_contract_plan_lane",
    reason: "canonical_schema_contract_ready_without_migration",
    scope,
    schemaPlan,
    canPrepareRealMigrationLater: true,
    canPreparePersistenceTablesLater: true,
    realMigrationRequestedButBlocked,
    databaseWriteRequestedButBlocked,
  });
}

export const EVENT_CANONICAL_SCHEMA_PLAN_DEFAULTS = {
  schema_plan_only: true,
  migration_file_created: false,
  supabase_operation_performed: false,
  database_write_performed: false,
  external_request_performed: false,
  human_event_analysis_required: false,
  real_auto_publish_enabled: false,
  real_auto_publish_allowed: false,
} as const;