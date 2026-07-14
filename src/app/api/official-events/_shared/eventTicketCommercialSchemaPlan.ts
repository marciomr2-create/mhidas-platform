// src/app/api/official-events/_shared/eventTicketCommercialSchemaPlan.ts

import {
  EVENT_TICKET_COMMERCIAL_PERSISTENCE_CONTRACT_VERSION,
  EVENT_TICKET_COMMERCIAL_PERSISTENCE_ENTITY_BLUEPRINTS,
  EVENT_TICKET_COMMERCIAL_PERSISTENCE_LEGACY_COMPATIBILITY,
  EVENT_TICKET_COMMERCIAL_PERSISTENCE_POLICY,
  type EventTicketCommercialPersistenceEntityKey,
} from "./eventTicketCommercialPersistenceContract";

export const EVENT_TICKET_COMMERCIAL_SCHEMA_PLAN_VERSION =
  "v4.8.86-event-ticket-commercial-schema-plan-safe" as const;

export const EVENT_TICKET_COMMERCIAL_SCHEMA_PLAN_POLICY = {
  schemaPlanOnly: true,
  migrationFileCreated: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicTicketLinkActivated: false,
  publicEventPageChanged: false,
  partnerDirectTableWriteAllowed: false,
  legacyTechnicalTicketUrlAllowedForCommercialButton: false,
  publicDatabaseViewCreated: false,
  publicResolverImplemented: false,
  rawIpAddressStorageAllowed: false,
  commercialSecretsExposedPublicly: false,
  contractVersion:
    EVENT_TICKET_COMMERCIAL_PERSISTENCE_CONTRACT_VERSION,
} as const;

export const EVENT_TICKET_COMMERCIAL_SCHEMA_OBJECT_KEYS = [
  "canonical_event_sources_extension",
  "event_ticket_partnership_requests",
  "event_ticket_commercial_channels",
  "event_ticket_commercial_audit_log",
  "event_ticket_click_attributions",
  "event_ticket_purchase_signals",
  "partner_official_communications",
  "resolved_public_event_ticket_channel",
] as const;

export type EventTicketCommercialSchemaObjectKey =
  (typeof EVENT_TICKET_COMMERCIAL_SCHEMA_OBJECT_KEYS)[number];

export type EventTicketCommercialSchemaStorageKind =
  | "existing_table_extension"
  | "new_table"
  | "append_only_table"
  | "server_resolver_projection";

export type EventTicketCommercialSchemaSqlType =
  | "uuid"
  | "text"
  | "boolean"
  | "integer"
  | "numeric_5_2"
  | "date"
  | "timestamptz"
  | "jsonb";

export type EventTicketCommercialSchemaColumnSecurity =
  | "public_projection_safe"
  | "server_only"
  | "commercial_secret"
  | "personal_data"
  | "pseudonymous_data"
  | "audit_only";

export type EventTicketCommercialSchemaForeignKey = {
  target: string;
  targetColumn: string;
  onDelete: "cascade" | "restrict" | "set_null";
};

export type EventTicketCommercialSchemaColumnPlan = {
  columnName: string;
  contractColumn: string | null;
  sqlType: EventTicketCommercialSchemaSqlType;
  nullableOnCreate: boolean;
  nullableAfterBackfill: boolean;
  defaultSql: string | null;
  checkExpression: string | null;
  foreignKey: EventTicketCommercialSchemaForeignKey | null;
  security: EventTicketCommercialSchemaColumnSecurity;
  purpose: string;
};

export type EventTicketCommercialSchemaIndexPlan = {
  indexName: string;
  columns: string[];
  unique: boolean;
  whereExpression: string | null;
  purpose: string;
};

export type EventTicketCommercialSchemaTriggerPlan = {
  triggerName: string;
  timing: "before" | "after";
  events: ("insert" | "update" | "delete")[];
  functionPurpose: string;
  requiredBeforeProductionWrite: boolean;
};

export type EventTicketCommercialSchemaRlsPlan = {
  enableRls: boolean;
  forceRls: boolean;
  anonPrivileges: readonly string[];
  authenticatedPrivileges: readonly string[];
  directClientAccessAllowed: false;
  serverRouteAccessRequired: true;
  policyNotes: string[];
};

export type EventTicketCommercialSchemaObjectPlan = {
  objectKey: EventTicketCommercialSchemaObjectKey;
  persistenceEntityKey: EventTicketCommercialPersistenceEntityKey;
  storageName: string;
  storageKind: EventTicketCommercialSchemaStorageKind;
  sourceOfTruth: boolean;
  migrationAction:
    | "alter_existing_table"
    | "create_table"
    | "no_database_object";
  purpose: string;
  columns: EventTicketCommercialSchemaColumnPlan[];
  indexes: EventTicketCommercialSchemaIndexPlan[];
  triggers: EventTicketCommercialSchemaTriggerPlan[];
  rls: EventTicketCommercialSchemaRlsPlan | null;
  invariants: string[];
  deferredDecisions: string[];
};

export type EventTicketCommercialSchemaLegacyMapping = {
  source: string;
  destination: string;
  automaticPublicActivationAllowed: false;
  migrationMode:
    | "reference_candidate_only"
    | "request_normalization"
    | "draft_channel_candidate_only"
    | "self_declared_signal_only"
    | "compatibility_read_only";
  statusMapping: Record<string, string> | null;
  rule: string;
};

export type EventTicketCommercialSchemaMigrationPhase = {
  phase: number;
  phaseKey: string;
  purpose: string;
  databaseWriteAllowedInThisVersion: false;
  requiredEvidenceBeforeFutureExecution: string[];
  plannedActions: string[];
  rollbackActions: string[];
};

export type EventTicketCommercialSchemaReadinessBlocker = {
  blockerKey: string;
  blockingRealMigration: true;
  reason: string;
  resolutionRequired: string;
};

export type EventTicketCommercialSchemaPlan = {
  version: typeof EVENT_TICKET_COMMERCIAL_SCHEMA_PLAN_VERSION;
  sourceContractVersion:
    typeof EVENT_TICKET_COMMERCIAL_PERSISTENCE_CONTRACT_VERSION;
  objectPlans: EventTicketCommercialSchemaObjectPlan[];
  legacyMappings: EventTicketCommercialSchemaLegacyMapping[];
  migrationPhases: EventTicketCommercialSchemaMigrationPhase[];
  readinessBlockers: EventTicketCommercialSchemaReadinessBlocker[];
  plannedExistingTableExtensions: number;
  plannedNewTables: number;
  plannedAppendOnlyTables: number;
  plannedServerResolverProjections: number;
  initialPublicResolverKind: "server_route_only";
  initialPublicCommercialDestinationKind: "internal_redirect_path";
  publicDatabaseViewPlannedNow: false;
  realMigrationReadyNow: false;
  migrationDraftMayBePreparedLater: true;
  migrationFileCreated: false;
  databaseWritePerformed: false;
  publicTicketLinkActivated: false;
};

export type EventTicketCommercialSchemaPlanState =
  | "schema_plan_ready"
  | "blocked_real_migration_requested"
  | "blocked_database_write_requested"
  | "blocked_public_activation_requested"
  | "blocked_public_database_view_requested"
  | "blocked_unknown_object_scope"
  | "blocked_empty_object_scope";

export type EventTicketCommercialSchemaPlanInput = {
  requestedObjectKeys?: EventTicketCommercialSchemaObjectKey[] | null;
  requestRealMigration?: boolean | null;
  requestDatabaseWrite?: boolean | null;
  requestPublicActivation?: boolean | null;
  requestPublicDatabaseView?: boolean | null;
};

export type EventTicketCommercialSchemaPlanDecision = {
  ok: boolean;
  state: EventTicketCommercialSchemaPlanState;
  reason: string;
  requestedObjectKeys: EventTicketCommercialSchemaObjectKey[];
  schemaPlan: EventTicketCommercialSchemaPlan | null;
  migrationFileCreated: false;
  supabaseOperationPerformed: false;
  databaseWritePerformed: false;
  publicTicketLinkActivated: false;
  publicDatabaseViewCreated: false;
};

export type EventTicketCommercialSchemaPlanSelfTestResult = {
  ok: boolean;
  version: typeof EVENT_TICKET_COMMERCIAL_SCHEMA_PLAN_VERSION;
  checks: Record<string, boolean>;
  failedChecks: string[];
  migration_file_created: false;
  supabase_operation_performed: false;
  database_write_performed: false;
  public_ticket_link_activated: false;
  public_database_view_created: false;
};

function column(
  columnName: string,
  contractColumn: string | null,
  sqlType: EventTicketCommercialSchemaSqlType,
  nullableOnCreate: boolean,
  nullableAfterBackfill: boolean,
  defaultSql: string | null,
  checkExpression: string | null,
  foreignKey: EventTicketCommercialSchemaForeignKey | null,
  security: EventTicketCommercialSchemaColumnSecurity,
  purpose: string,
): EventTicketCommercialSchemaColumnPlan {
  return {
    columnName,
    contractColumn,
    sqlType,
    nullableOnCreate,
    nullableAfterBackfill,
    defaultSql,
    checkExpression,
    foreignKey,
    security,
    purpose,
  };
}

function index(
  indexName: string,
  columns: string[],
  unique: boolean,
  purpose: string,
  whereExpression: string | null = null,
): EventTicketCommercialSchemaIndexPlan {
  return {
    indexName,
    columns,
    unique,
    whereExpression,
    purpose,
  };
}

function denyDirectAccessRls(
  notes: string[],
  forceRls = true,
): EventTicketCommercialSchemaRlsPlan {
  return {
    enableRls: true,
    forceRls,
    anonPrivileges: [],
    authenticatedPrivileges: [],
    directClientAccessAllowed: false,
    serverRouteAccessRequired: true,
    policyNotes: notes,
  };
}

const CANONICAL_EVENT_SOURCES_EXTENSION: EventTicketCommercialSchemaObjectPlan = {
  objectKey: "canonical_event_sources_extension",
  persistenceEntityKey: "official_event_reference",
  storageName: "canonical_event_sources",
  storageKind: "existing_table_extension",
  sourceOfTruth: true,
  migrationAction: "alter_existing_table",
  purpose:
    "Extend the existing canonical provenance table with an explicit official-reference validation state without duplicating source history.",
  columns: [
    column(
      "reference_status",
      "reference_status",
      "text",
      false,
      false,
      "'candidate'",
      "reference_status in ('candidate','validated','rejected','stale')",
      null,
      "public_projection_safe",
      "Controls whether the source may be considered by the official-reference resolver.",
    ),
    column(
      "reference_domain",
      "reference_domain",
      "text",
      true,
      true,
      null,
      "reference_domain is null or reference_domain = lower(reference_domain)",
      null,
      "public_projection_safe",
      "Normalized HTTPS hostname used for validation and domain drift detection.",
    ),
    column(
      "confidence_score",
      "confidence_score",
      "numeric_5_2",
      true,
      true,
      null,
      "confidence_score is null or (confidence_score >= 0 and confidence_score <= 100)",
      null,
      "audit_only",
      "Official-reference confidence distinct from the existing integer authority score.",
    ),
    column(
      "discovered_automatically",
      "discovered_automatically",
      "boolean",
      false,
      false,
      "false",
      null,
      null,
      "audit_only",
      "Records whether the source was discovered by automation.",
    ),
    column(
      "validated_at",
      "validated_at",
      "timestamptz",
      true,
      true,
      null,
      null,
      null,
      "audit_only",
      "Timestamp of the latest explicit reference validation.",
    ),
    column(
      "validated_by_role",
      "validated_by_role",
      "text",
      true,
      true,
      null,
      "validated_by_role is null or validated_by_role in ('automation','useclubbers_admin')",
      null,
      "audit_only",
      "Role responsible for the latest validation decision.",
    ),
    column(
      "validated_by_user_id",
      "validated_by_user_id",
      "uuid",
      true,
      true,
      null,
      null,
      {
        target: "auth.users",
        targetColumn: "id",
        onDelete: "set_null",
      },
      "audit_only",
      "Admin identity when the validation was manual.",
    ),
    column(
      "updated_at",
      "updated_at",
      "timestamptz",
      false,
      false,
      "now()",
      null,
      null,
      "audit_only",
      "Supports drift detection and optimistic updates of reference validation state.",
    ),
  ],
  indexes: [
    index(
      "canonical_event_sources_official_reference_idx",
      ["canonical_event_id", "reference_status", "authority_score"],
      false,
      "Resolve the strongest validated official reference for a canonical event.",
    ),
    index(
      "canonical_event_sources_reference_domain_idx",
      ["reference_domain", "reference_status"],
      false,
      "Review reference domains and detect stale or rejected domains.",
    ),
  ],
  triggers: [
    {
      triggerName: "canonical_event_sources_reference_updated_at",
      timing: "before",
      events: ["update"],
      functionPurpose:
        "Update updated_at only when official-reference validation fields change.",
      requiredBeforeProductionWrite: true,
    },
  ],
  rls: denyDirectAccessRls(
    [
      "Preserve the existing authenticated read policy only for non-secret source provenance.",
      "Do not add anon write or authenticated write policies.",
      "Automation and admin validation writes must use protected server-side routes.",
    ],
    false,
  ),
  invariants: [
    "The existing unique (canonical_event_id, source_key) is the physical idempotency identity; no duplicate reference_idempotency_key column is added.",
    "Only validated HTTPS sources may be emitted by the future official-reference resolver.",
    "canonical_events.ticket_url and official_event_candidates.ticket_url never populate a commercial channel.",
    "Rejected or stale references never produce a public exit.",
  ],
  deferredDecisions: [
    "The exact confidence threshold remains resolver policy, not a database check.",
  ],
};

const PARTNERSHIP_REQUESTS_TABLE: EventTicketCommercialSchemaObjectPlan = {
  objectKey: "event_ticket_partnership_requests",
  persistenceEntityKey: "ticket_partnership_request",
  storageName: "event_ticket_partnership_requests",
  storageKind: "new_table",
  sourceOfTruth: true,
  migrationAction: "create_table",
  purpose:
    "Persist partner submissions before and independently from any admin-controlled commercial channel.",
  columns: [
    column("request_id", "request_id", "uuid", false, false, "gen_random_uuid()", null, null, "server_only", "Primary request identity."),
    column("canonical_event_id", "canonical_event_id", "uuid", true, true, null, null, { target: "public.canonical_events", targetColumn: "id", onDelete: "set_null" }, "server_only", "Optional during submission; mandatory before approval."),
    column("event_slug_snapshot", "event_slug_snapshot", "text", true, true, null, null, null, "server_only", "Event slug supplied or resolved at submission time."),
    column("event_name_snapshot", null, "text", true, true, null, null, null, "server_only", "Event name when no canonical identity exists yet."),
    column("event_date_snapshot", null, "date", true, true, null, null, null, "server_only", "Event date supplied by the partner."),
    column("city_snapshot", null, "text", true, true, null, null, null, "server_only", "City supplied by the partner."),
    column("state_snapshot", null, "text", true, true, null, null, null, "server_only", "State supplied by the partner."),
    column("venue_name_snapshot", null, "text", true, true, null, null, null, "server_only", "Venue supplied by the partner."),
    column("partner_id", "partner_id", "uuid", true, true, null, null, null, "server_only", "Future verified partner id; no foreign key until a partner registry is approved."),
    column("submitted_by_user_id", "submitted_by_user_id", "uuid", true, true, null, null, { target: "auth.users", targetColumn: "id", onDelete: "set_null" }, "personal_data", "Authenticated submitting user when available."),
    column("partner_type", null, "text", false, false, "'other'", "partner_type in ('agency','event','artist','label','club','producer','ticketing','other')", null, "server_only", "Partner category snapshot."),
    column("partner_display_name", "partner_display_name", "text", false, false, null, null, null, "server_only", "Partner name at submission."),
    column("request_type", "request_type", "text", false, false, null, "request_type in ('ticket_sales_partnership','affiliate_campaign','discount_campaign','presale_campaign','fixed_media_campaign','hybrid_commercial_partnership')", null, "server_only", "Requested commercial relationship."),
    column("request_status", "request_status", "text", false, false, "'pending'", "request_status in ('pending','needs_info','approved','rejected','withdrawn')", null, "server_only", "Submission-review lifecycle only; never contains active, paused, expired or revoked."),
    column("current_sales_url", "current_sales_url", "text", true, true, null, null, null, "server_only", "Partner-supplied evidence; never a public link by itself."),
    column("ticketing_provider_key", "ticketing_provider_key", "text", true, true, null, null, null, "server_only", "Suggested ticketing provider."),
    column("commercial_contact_name", "commercial_contact_name", "text", true, true, null, null, null, "personal_data", "Commercial contact name."),
    column("commercial_contact_email", "commercial_contact_email", "text", true, true, null, null, null, "personal_data", "Commercial contact email."),
    column("commercial_contact_whatsapp", "commercial_contact_whatsapp", "text", true, true, null, null, null, "personal_data", "Commercial contact WhatsApp."),
    column("proposed_benefit", "proposed_benefit", "text", true, true, null, null, null, "server_only", "Discount, presale or exclusive benefit proposal."),
    column("commercial_notes", "commercial_notes", "text", true, true, null, null, null, "server_only", "Partner-provided commercial notes."),
    column("admin_notes", "admin_notes", "text", true, true, null, null, null, "commercial_secret", "Internal review notes never exposed to partners unless explicitly summarized."),
    column("client_submission_key", "client_submission_key", "text", false, false, null, null, null, "audit_only", "Idempotency key supplied by the controlled submission route."),
    column("reviewed_by_admin_user_id", "reviewed_by_admin_user_id", "uuid", true, true, null, null, { target: "auth.users", targetColumn: "id", onDelete: "set_null" }, "audit_only", "Reviewing USECLUBBERS admin."),
    column("reviewed_at", "reviewed_at", "timestamptz", true, true, null, null, null, "audit_only", "Review timestamp."),
    column("created_at", "created_at", "timestamptz", false, false, "now()", null, null, "audit_only", "Creation timestamp."),
    column("updated_at", "updated_at", "timestamptz", false, false, "now()", null, null, "audit_only", "Optimistic-concurrency timestamp."),
    column("metadata", "metadata", "jsonb", false, false, "'{}'::jsonb", null, null, "server_only", "Safe extensible request metadata."),
  ],
  indexes: [
    index("event_ticket_partnership_requests_client_submission_uq", ["client_submission_key"], true, "Prevent duplicate partner submissions."),
    index("event_ticket_partnership_requests_status_idx", ["request_status", "created_at"], false, "Admin review queue."),
    index("event_ticket_partnership_requests_partner_idx", ["partner_id", "created_at"], false, "Partner request history.", "partner_id is not null"),
    index("event_ticket_partnership_requests_event_idx", ["canonical_event_id", "created_at"], false, "Requests attached to a canonical event.", "canonical_event_id is not null"),
  ],
  triggers: [
    {
      triggerName: "event_ticket_partnership_requests_updated_at",
      timing: "before",
      events: ["update"],
      functionPurpose: "Maintain updated_at for controlled request transitions.",
      requiredBeforeProductionWrite: true,
    },
  ],
  rls: denyDirectAccessRls([
    "Partners submit and read their requests through protected server routes, not direct table grants.",
    "Admin review uses protected admin routes.",
    "No anon access is allowed.",
  ]),
  invariants: [
    "Approval requires canonical_event_id, reviewed_by_admin_user_id and reviewed_at.",
    "An approved request never creates or activates a public link automatically.",
    "A partner may withdraw only a pending or needs_info request through the controlled route.",
    "Personal contact data is excluded from all public projections.",
  ],
  deferredDecisions: [
    "A foreign key for partner_id is deferred until the verified partner registry exists.",
  ],
};

const COMMERCIAL_CHANNELS_TABLE: EventTicketCommercialSchemaObjectPlan = {
  objectKey: "event_ticket_commercial_channels",
  persistenceEntityKey: "ticket_commercial_channel",
  storageName: "event_ticket_commercial_channels",
  storageKind: "new_table",
  sourceOfTruth: true,
  migrationAction: "create_table",
  purpose:
    "Persist the monetized ticket destination under exclusive USECLUBBERS admin lifecycle control.",
  columns: [
    column("channel_id", "channel_id", "uuid", false, false, "gen_random_uuid()", null, null, "server_only", "Primary commercial channel identity."),
    column("canonical_event_id", "canonical_event_id", "uuid", false, false, null, null, { target: "public.canonical_events", targetColumn: "id", onDelete: "restrict" }, "server_only", "Canonical event required before any channel may exist."),
    column("source_request_id", "source_request_id", "uuid", true, true, null, null, { target: "public.event_ticket_partnership_requests", targetColumn: "request_id", onDelete: "set_null" }, "server_only", "Approved request origin when applicable."),
    column("source_origin", "source_origin", "text", false, false, null, "source_origin in ('admin_entry','approved_partner_request','commercial_contract','partner_api_submission')", null, "server_only", "Origin evidence, separate from the admin actor who controls the channel."),
    column("ticketing_provider_key", "ticketing_provider_key", "text", true, true, null, null, null, "server_only", "Ticketing provider key."),
    column("ticketing_display_name", "ticketing_display_name", "text", true, true, null, null, null, "public_projection_safe", "Public ticketing label when approved."),
    column("authorized_domain", "authorized_domain", "text", false, false, null, "authorized_domain = lower(authorized_domain)", null, "server_only", "Exact authorized HTTPS host."),
    column("commercial_url", "commercial_url", "text", false, false, null, null, null, "commercial_secret", "Admin-approved external destination; never returned directly by public reads."),
    column("tracking_method", "tracking_method", "text", false, false, "'none'", "tracking_method in ('query_parameter','coupon_code','affiliate_id','path_segment','postback','webhook','partner_api','manual_report','none')", null, "server_only", "Attribution method."),
    column("tracking_secret_ref", "tracking_key_encrypted", "text", true, true, null, null, null, "commercial_secret", "Reference to a secret manager entry; raw credentials are not stored in this table."),
    column("tracking_parameter_name", "tracking_parameter_name", "text", true, true, null, null, null, "server_only", "Public query-parameter name when applicable."),
    column("remuneration_model", "remuneration_model", "text", false, false, null, "remuneration_model in ('commission_percent','commission_fixed_per_ticket','service_fee_share','fixed_campaign','hybrid','licensing','no_remuneration')", null, "commercial_secret", "Commercial remuneration model."),
    column("commission_percent", "commission_percent", "numeric_5_2", true, true, null, "commission_percent is null or (commission_percent >= 0 and commission_percent <= 100)", null, "commercial_secret", "Commission percentage."),
    column("commission_fixed_minor", "commission_fixed_minor", "integer", true, true, null, "commission_fixed_minor is null or commission_fixed_minor >= 0", null, "commercial_secret", "Fixed commission in minor currency units."),
    column("currency", "currency", "text", true, true, null, "currency is null or currency ~ '^[A-Z]{3}$'", null, "commercial_secret", "ISO 4217 currency."),
    column("authorization_reference", "authorization_reference", "text", false, false, null, null, null, "commercial_secret", "Contract, email or internal approval reference."),
    column("authorization_starts_at", "authorization_starts_at", "timestamptz", false, false, null, null, null, "server_only", "Start of authorized commercial validity."),
    column("authorization_ends_at", "authorization_ends_at", "timestamptz", true, true, null, "authorization_ends_at is null or authorization_ends_at > authorization_starts_at", null, "server_only", "End of authorized commercial validity."),
    column("public_priority", "public_priority", "integer", false, false, "100", "public_priority >= 0", null, "server_only", "Future resolver priority; conflicting active candidates must block public resolution."),
    column("channel_status", "channel_status", "text", false, false, "'draft'", "channel_status in ('draft','authorized','active','paused','expired','revoked')", null, "server_only", "Admin-controlled lifecycle."),
    column("disclosure_text", "disclosure_text", "text", true, true, null, null, null, "public_projection_safe", "Approved public transparency notice."),
    column("created_by_admin_user_id", "created_by_admin_user_id", "uuid", false, false, null, null, { target: "auth.users", targetColumn: "id", onDelete: "restrict" }, "audit_only", "Admin who created the definitive channel."),
    column("authorized_by_admin_user_id", "authorized_by_admin_user_id", "uuid", true, true, null, null, { target: "auth.users", targetColumn: "id", onDelete: "set_null" }, "audit_only", "Admin who authorized the channel."),
    column("activated_by_admin_user_id", "activated_by_admin_user_id", "uuid", true, true, null, null, { target: "auth.users", targetColumn: "id", onDelete: "set_null" }, "audit_only", "Admin who activated the channel."),
    column("paused_by_admin_user_id", "paused_by_admin_user_id", "uuid", true, true, null, null, { target: "auth.users", targetColumn: "id", onDelete: "set_null" }, "audit_only", "Admin who paused the channel."),
    column("revoked_by_admin_user_id", "revoked_by_admin_user_id", "uuid", true, true, null, null, { target: "auth.users", targetColumn: "id", onDelete: "set_null" }, "audit_only", "Admin who revoked the channel."),
    column("created_at", "created_at", "timestamptz", false, false, "now()", null, null, "audit_only", "Creation timestamp."),
    column("authorized_at", "authorized_at", "timestamptz", true, true, null, null, null, "audit_only", "Authorization timestamp."),
    column("activated_at", "activated_at", "timestamptz", true, true, null, null, null, "audit_only", "Activation timestamp."),
    column("paused_at", "paused_at", "timestamptz", true, true, null, null, null, "audit_only", "Pause timestamp."),
    column("revoked_at", "revoked_at", "timestamptz", true, true, null, null, null, "audit_only", "Revocation timestamp."),
    column("updated_at", "updated_at", "timestamptz", false, false, "now()", null, null, "audit_only", "Optimistic-concurrency timestamp."),
    column("lock_version", "lock_version", "integer", false, false, "0", "lock_version >= 0", null, "audit_only", "Optimistic-concurrency version incremented on every controlled mutation."),
    column("idempotency_key", "idempotency_key", "text", false, false, null, null, null, "audit_only", "Creation idempotency key."),
    column("metadata", "metadata", "jsonb", false, false, "'{}'::jsonb", null, null, "server_only", "Safe extensible metadata excluding secrets."),
  ],
  indexes: [
    index("event_ticket_commercial_channels_idempotency_uq", ["idempotency_key"], true, "Prevent duplicate definitive channels."),
    index("event_ticket_commercial_channels_event_status_idx", ["canonical_event_id", "channel_status", "public_priority"], false, "Resolve channel candidates."),
    index("event_ticket_commercial_channels_one_active_per_event_uq", ["canonical_event_id"], true, "Allow at most one active channel for each canonical event in the initial production model.", "channel_status = 'active'"),
    index("event_ticket_commercial_channels_validity_idx", ["channel_status", "authorization_starts_at", "authorization_ends_at"], false, "Expire or block channels outside their authorization window."),
    index("event_ticket_commercial_channels_source_request_idx", ["source_request_id"], false, "Trace the originating request.", "source_request_id is not null"),
  ],
  triggers: [
    {
      triggerName: "event_ticket_commercial_channels_guard",
      timing: "before",
      events: ["insert", "update", "delete"],
      functionPurpose:
        "Reject hard delete, require admin actor metadata, enforce lifecycle transitions, increment lock_version and maintain updated_at.",
      requiredBeforeProductionWrite: true,
    },
    {
      triggerName: "event_ticket_commercial_channels_audit",
      timing: "after",
      events: ["insert", "update"],
      functionPurpose:
        "Append a redacted audit row in the same transaction as every lifecycle mutation.",
      requiredBeforeProductionWrite: true,
    },
  ],
  rls: denyDirectAccessRls([
    "No anon or authenticated direct grants.",
    "Admin server routes are the only write path.",
    "The public resolver receives only a redacted server-side projection.",
  ]),
  invariants: [
    "Only a USECLUBBERS admin may create, authorize, activate, pause, reactivate, expire or revoke.",
    "An active channel must be within its authorization window and its URL host must match authorized_domain.",
    "The public button never returns commercial_url directly; it returns an internal redirect path that performs attribution and then resolves the destination server-side.",
    "A revoked channel is terminal and cannot be hard-deleted.",
    "Partner origin does not imply partner lifecycle control.",
  ],
  deferredDecisions: [
    "The production secret manager used by tracking_secret_ref must be selected and tested before any secret-backed tracking method is enabled.",
  ],
};

const COMMERCIAL_AUDIT_TABLE: EventTicketCommercialSchemaObjectPlan = {
  objectKey: "event_ticket_commercial_audit_log",
  persistenceEntityKey: "ticket_commercial_audit_log",
  storageName: "event_ticket_commercial_audit_log",
  storageKind: "append_only_table",
  sourceOfTruth: true,
  migrationAction: "create_table",
  purpose:
    "Preserve immutable commercial decisions and redacted before/after snapshots.",
  columns: [
    column("audit_id", "audit_id", "uuid", false, false, "gen_random_uuid()", null, null, "audit_only", "Primary audit identity."),
    column("canonical_event_id", "canonical_event_id", "uuid", false, false, null, null, { target: "public.canonical_events", targetColumn: "id", onDelete: "restrict" }, "audit_only", "Canonical event."),
    column("channel_id", "channel_id", "uuid", true, true, null, null, { target: "public.event_ticket_commercial_channels", targetColumn: "channel_id", onDelete: "restrict" }, "audit_only", "Commercial channel when applicable."),
    column("request_id", "request_id", "uuid", true, true, null, null, { target: "public.event_ticket_partnership_requests", targetColumn: "request_id", onDelete: "set_null" }, "audit_only", "Partnership request when applicable."),
    column("audit_action", "audit_action", "text", false, false, null, null, null, "audit_only", "Commercial action key."),
    column("actor_role", "actor_role", "text", false, false, null, "actor_role in ('useclubbers_admin','automation','system','trusted_ticketing_integration')", null, "audit_only", "Trusted actor role."),
    column("actor_user_id", "actor_user_id", "uuid", true, true, null, null, { target: "auth.users", targetColumn: "id", onDelete: "set_null" }, "audit_only", "Admin user when applicable."),
    column("previous_status", "previous_status", "text", true, true, null, null, null, "audit_only", "Previous state."),
    column("next_status", "next_status", "text", true, true, null, null, null, "audit_only", "Next state."),
    column("before_snapshot", "before_snapshot", "jsonb", true, true, null, null, null, "audit_only", "Redacted previous record."),
    column("after_snapshot", "after_snapshot", "jsonb", true, true, null, null, null, "audit_only", "Redacted next record."),
    column("reason", "reason", "text", false, false, null, null, null, "audit_only", "Human-readable reason."),
    column("correlation_id", "correlation_id", "text", false, false, null, null, null, "audit_only", "Request correlation id."),
    column("idempotency_key", "idempotency_key", "text", false, false, null, null, null, "audit_only", "Append idempotency key."),
    column("created_at", "created_at", "timestamptz", false, false, "now()", null, null, "audit_only", "Immutable audit timestamp."),
  ],
  indexes: [
    index("event_ticket_commercial_audit_idempotency_uq", ["idempotency_key"], true, "Prevent duplicate audit append."),
    index("event_ticket_commercial_audit_channel_idx", ["channel_id", "created_at"], false, "Chronological channel history.", "channel_id is not null"),
    index("event_ticket_commercial_audit_event_idx", ["canonical_event_id", "created_at"], false, "Commercial history for an event."),
    index("event_ticket_commercial_audit_correlation_idx", ["correlation_id"], false, "Trace one controlled operation."),
  ],
  triggers: [
    {
      triggerName: "event_ticket_commercial_audit_append_only",
      timing: "before",
      events: ["update", "delete"],
      functionPurpose: "Reject every update and delete, including service-role attempts.",
      requiredBeforeProductionWrite: true,
    },
  ],
  rls: denyDirectAccessRls([
    "No direct client read or write.",
    "Admin audit reads use a protected route with explicit redaction.",
    "Append occurs only inside controlled server transactions.",
  ]),
  invariants: [
    "Audit rows are append-only.",
    "Snapshots never include commercial_url, tracking_secret_ref, commission details, contact details or raw external transaction identifiers unless explicitly redacted and approved.",
    "Every channel lifecycle mutation appends an audit row in the same transaction.",
  ],
  deferredDecisions: [],
};

const CLICK_ATTRIBUTIONS_TABLE: EventTicketCommercialSchemaObjectPlan = {
  objectKey: "event_ticket_click_attributions",
  persistenceEntityKey: "ticket_click_attribution",
  storageName: "event_ticket_click_attributions",
  storageKind: "new_table",
  sourceOfTruth: true,
  migrationAction: "create_table",
  purpose:
    "Record monetized exits without claiming that a purchase occurred.",
  columns: [
    column("click_id", "click_id", "uuid", false, false, "gen_random_uuid()", null, null, "server_only", "Primary click identity."),
    column("canonical_event_id", "canonical_event_id", "uuid", false, false, null, null, { target: "public.canonical_events", targetColumn: "id", onDelete: "restrict" }, "server_only", "Canonical event."),
    column("channel_id", "channel_id", "uuid", false, false, null, null, { target: "public.event_ticket_commercial_channels", targetColumn: "channel_id", onDelete: "restrict" }, "server_only", "Resolved active channel."),
    column("user_id", "user_id", "uuid", true, true, null, null, { target: "auth.users", targetColumn: "id", onDelete: "set_null" }, "personal_data", "Authenticated Clubber when known."),
    column("session_attribution_hash", "session_attribution_hash", "text", true, true, null, null, null, "pseudonymous_data", "Short-lived pseudonymous session identity."),
    column("redirect_token_hash", "redirect_token_hash", "text", false, false, null, null, null, "pseudonymous_data", "One-way redirect token fingerprint."),
    column("campaign_id", "campaign_id", "text", true, true, null, null, null, "server_only", "Campaign attribution."),
    column("destination_url_hash", "destination_url_hash", "text", false, false, null, null, null, "pseudonymous_data", "Fingerprint of the resolved destination; no raw URL copy."),
    column("consent_basis", "consent_basis", "text", false, false, null, "consent_basis in ('consent','contract','legitimate_interest','not_applicable')", null, "audit_only", "Documented processing basis."),
    column("clicked_at", "clicked_at", "timestamptz", false, false, "now()", null, null, "audit_only", "Commercial exit timestamp."),
    column("retention_expires_at", "retention_expires_at", "timestamptz", false, false, null, "retention_expires_at > clicked_at", null, "personal_data", "Mandatory deletion or anonymization deadline."),
    column("metadata", "metadata", "jsonb", false, false, "'{}'::jsonb", null, null, "server_only", "Minimal redacted attribution metadata."),
  ],
  indexes: [
    index("event_ticket_click_attributions_redirect_token_uq", ["redirect_token_hash"], true, "Prevent duplicate click attribution."),
    index("event_ticket_click_attributions_channel_time_idx", ["channel_id", "clicked_at"], false, "Channel click reporting."),
    index("event_ticket_click_attributions_event_time_idx", ["canonical_event_id", "clicked_at"], false, "Event click reporting."),
    index("event_ticket_click_attributions_retention_idx", ["retention_expires_at"], false, "Retention cleanup queue."),
  ],
  triggers: [],
  rls: denyDirectAccessRls([
    "Only the internal redirect route inserts click rows.",
    "No public or partner direct reads.",
    "Reporting uses aggregated protected routes.",
  ]),
  invariants: [
    "A click is not a purchase or confirmed revenue.",
    "Raw IP addresses are never stored.",
    "The destination is represented by a hash in attribution storage.",
    "Retention cleanup or anonymization must exist before production tracking begins.",
  ],
  deferredDecisions: [
    "The exact retention duration requires a documented privacy policy and operational cleanup job.",
  ],
};

const PURCHASE_SIGNALS_TABLE: EventTicketCommercialSchemaObjectPlan = {
  objectKey: "event_ticket_purchase_signals",
  persistenceEntityKey: "ticket_purchase_signal",
  storageName: "event_ticket_purchase_signals",
  storageKind: "new_table",
  sourceOfTruth: true,
  migrationAction: "create_table",
  purpose:
    "Separate interest, self-declared purchase, attributed conversion and confirmed conversion evidence.",
  columns: [
    column("signal_id", "signal_id", "uuid", false, false, "gen_random_uuid()", null, null, "server_only", "Primary signal identity."),
    column("canonical_event_id", "canonical_event_id", "uuid", false, false, null, null, { target: "public.canonical_events", targetColumn: "id", onDelete: "restrict" }, "server_only", "Canonical event."),
    column("channel_id", "channel_id", "uuid", true, true, null, null, { target: "public.event_ticket_commercial_channels", targetColumn: "channel_id", onDelete: "set_null" }, "server_only", "Commercial channel when attribution exists."),
    column("click_id", null, "uuid", true, true, null, null, { target: "public.event_ticket_click_attributions", targetColumn: "click_id", onDelete: "set_null" }, "server_only", "Optional source click."),
    column("user_id", "user_id", "uuid", true, true, null, null, { target: "auth.users", targetColumn: "id", onDelete: "set_null" }, "personal_data", "Clubber when known."),
    column("signal_type", "signal_type", "text", false, false, null, "signal_type in ('interest','commercial_link_click','self_declared_purchase','attributed_conversion','confirmed_conversion')", null, "server_only", "Journey or conversion classification."),
    column("evidence_source", "evidence_source", "text", false, false, null, "evidence_source in ('clubber_action','useclubbers_redirect','coupon_report','partner_report','postback','webhook','partner_api')", null, "server_only", "Evidence source."),
    column("trusted_evidence_verified", "trusted_evidence_verified", "boolean", false, false, "false", null, null, "audit_only", "Trusted verification flag."),
    column("external_transaction_reference_hash", "external_transaction_reference_hash", "text", true, true, null, null, null, "pseudonymous_data", "One-way transaction reference for deduplication."),
    column("attribution_campaign_id", "attribution_campaign_id", "text", true, true, null, null, null, "server_only", "Campaign attribution."),
    column("gross_amount_minor", "gross_amount_minor", "integer", true, true, null, "gross_amount_minor is null or gross_amount_minor >= 0", null, "commercial_secret", "Confirmed gross amount only."),
    column("commission_amount_minor", "commission_amount_minor", "integer", true, true, null, "commission_amount_minor is null or commission_amount_minor >= 0", null, "commercial_secret", "Recognized commission only."),
    column("currency", "currency", "text", true, true, null, "currency is null or currency ~ '^[A-Z]{3}$'", null, "commercial_secret", "ISO 4217 currency."),
    column("recorded_at", "recorded_at", "timestamptz", false, false, "now()", null, null, "audit_only", "Signal timestamp."),
    column("confirmed_at", "confirmed_at", "timestamptz", true, true, null, null, null, "audit_only", "Trusted confirmation timestamp."),
    column("confirmed_by_actor_role", "confirmed_by_actor_role", "text", true, true, null, "confirmed_by_actor_role is null or confirmed_by_actor_role in ('trusted_ticketing_integration','useclubbers_admin')", null, "audit_only", "Trusted confirming actor."),
    column("idempotency_key", "idempotency_key", "text", false, false, null, null, null, "audit_only", "Signal idempotency key."),
    column("retention_expires_at", "retention_expires_at", "timestamptz", true, true, null, null, null, "personal_data", "Retention or anonymization deadline."),
    column("metadata", "metadata", "jsonb", false, false, "'{}'::jsonb", null, null, "server_only", "Redacted evidence summary."),
  ],
  indexes: [
    index("event_ticket_purchase_signals_idempotency_uq", ["idempotency_key"], true, "Prevent duplicate signals."),
    index("event_ticket_purchase_signals_event_type_idx", ["canonical_event_id", "signal_type", "recorded_at"], false, "Event journey reporting."),
    index("event_ticket_purchase_signals_transaction_uq", ["external_transaction_reference_hash"], true, "Prevent duplicate attributed or confirmed transactions.", "external_transaction_reference_hash is not null"),
    index("event_ticket_purchase_signals_user_event_idx", ["user_id", "canonical_event_id", "recorded_at"], false, "Clubber journey history.", "user_id is not null"),
  ],
  triggers: [
    {
      triggerName: "event_ticket_purchase_signals_confirmation_guard",
      timing: "before",
      events: ["insert", "update"],
      functionPurpose:
        "Block confirmed_conversion unless trusted evidence, a transaction hash, confirmed_at and a trusted actor are present; block financial amounts on unconfirmed signals.",
      requiredBeforeProductionWrite: true,
    },
  ],
  rls: denyDirectAccessRls([
    "Clubber actions use authenticated server routes.",
    "Trusted conversions use protected integration routes.",
    "Clubber-facing reads expose only the user's safe journey state, never finance or evidence internals.",
  ]),
  invariants: [
    "self_declared_purchase is never confirmed revenue.",
    "confirmed_conversion requires trusted evidence and an external transaction reference hash.",
    "Only confirmed_conversion may contain recognized commission amounts.",
    "Legacy event_ticket_intents.ticket_acquired may backfill only self_declared_purchase.",
  ],
  deferredDecisions: [
    "The trusted ticketing integration signature and replay-protection contract must be approved before confirmed conversions are accepted.",
  ],
};

const OFFICIAL_COMMUNICATIONS_TABLE: EventTicketCommercialSchemaObjectPlan = {
  objectKey: "partner_official_communications",
  persistenceEntityKey: "partner_official_communication",
  storageName: "partner_official_communications",
  storageKind: "new_table",
  sourceOfTruth: true,
  migrationAction: "create_table",
  purpose:
    "Persist official partner communications independently from ticket-channel authorization.",
  columns: [
    column("communication_id", "communication_id", "uuid", false, false, "gen_random_uuid()", null, null, "server_only", "Primary communication identity."),
    column("partner_id", "partner_id", "uuid", true, true, null, null, null, "server_only", "Future verified partner id; nullable until the partner registry exists."),
    column("canonical_event_id", "canonical_event_id", "uuid", true, true, null, null, { target: "public.canonical_events", targetColumn: "id", onDelete: "set_null" }, "server_only", "Related event when applicable."),
    column("commercial_channel_id", "commercial_channel_id", "uuid", true, true, null, null, { target: "public.event_ticket_commercial_channels", targetColumn: "channel_id", onDelete: "set_null" }, "server_only", "Required for ticket-commercial communication types."),
    column("communication_type", "communication_type", "text", false, false, null, "communication_type in ('ticket_batch_change','ticket_presale','ticket_discount','giveaway','music_release','lineup_update','official_after','location_notice','schedule_change','vip_experience','promotional_code','exclusive_content','community_call')", null, "server_only", "Communication type."),
    column("communication_status", "communication_status", "text", false, false, "'draft'", "communication_status in ('draft','submitted','needs_review','approved','published','paused','expired','rejected')", null, "server_only", "Editorial lifecycle."),
    column("title", "title", "text", false, false, null, null, null, "public_projection_safe", "Public title."),
    column("body", "body", "text", false, false, null, null, null, "public_projection_safe", "Public content."),
    column("benefit_code", "benefit_code", "text", true, true, null, null, null, "public_projection_safe", "Optional admin-approved public code."),
    column("starts_at", "starts_at", "timestamptz", true, true, null, null, null, "public_projection_safe", "Publication start."),
    column("ends_at", "ends_at", "timestamptz", true, true, null, "ends_at is null or starts_at is null or ends_at > starts_at", null, "public_projection_safe", "Publication end."),
    column("submitted_by_user_id", "submitted_by_user_id", "uuid", false, false, null, null, { target: "auth.users", targetColumn: "id", onDelete: "restrict" }, "personal_data", "Submitting partner user."),
    column("approved_by_admin_user_id", "approved_by_admin_user_id", "uuid", true, true, null, null, { target: "auth.users", targetColumn: "id", onDelete: "set_null" }, "audit_only", "Editorial approver."),
    column("published_by_admin_user_id", "published_by_admin_user_id", "uuid", true, true, null, null, { target: "auth.users", targetColumn: "id", onDelete: "set_null" }, "audit_only", "Publishing admin."),
    column("created_at", "created_at", "timestamptz", false, false, "now()", null, null, "audit_only", "Creation timestamp."),
    column("updated_at", "updated_at", "timestamptz", false, false, "now()", null, null, "audit_only", "Last update."),
    column("metadata", "metadata", "jsonb", false, false, "'{}'::jsonb", null, null, "server_only", "Safe communication metadata."),
  ],
  indexes: [
    index("partner_official_communications_public_idx", ["communication_status", "starts_at", "ends_at"], false, "Resolve currently published communications."),
    index("partner_official_communications_partner_idx", ["partner_id", "created_at"], false, "Partner communication history.", "partner_id is not null"),
    index("partner_official_communications_event_idx", ["canonical_event_id", "created_at"], false, "Event communication history.", "canonical_event_id is not null"),
  ],
  triggers: [
    {
      triggerName: "partner_official_communications_guard",
      timing: "before",
      events: ["insert", "update", "delete"],
      functionPurpose:
        "Block hard delete, enforce editorial transitions and require an active commercial channel for ticket-commercial communication types before publication.",
      requiredBeforeProductionWrite: true,
    },
  ],
  rls: denyDirectAccessRls([
    "Partners submit through controlled routes.",
    "Admins review and publish through controlled routes.",
    "Public reads use a separate redacted communication resolver.",
  ]),
  invariants: [
    "Official communication approval does not grant ticket-commercial authorization.",
    "Partners never publish directly.",
    "Ticket discount, presale, lot-change and promotional-code communications require an active valid commercial channel.",
    "Editorial communication may exist without a ticket partnership when the partner is verified.",
  ],
  deferredDecisions: [
    "The partner registry and verification source must exist before partner_id becomes non-null and gains a foreign key.",
  ],
};

const PUBLIC_RESOLVER_PROJECTION: EventTicketCommercialSchemaObjectPlan = {
  objectKey: "resolved_public_event_ticket_channel",
  persistenceEntityKey: "public_ticket_resolver_projection",
  storageName: "resolved_public_event_ticket_channel",
  storageKind: "server_resolver_projection",
  sourceOfTruth: false,
  migrationAction: "no_database_object",
  purpose:
    "Return the public ticket action through a protected server resolver without creating a public database view in the initial rollout.",
  columns: [
    column("canonical_event_id", "canonical_event_id", "uuid", false, false, null, null, null, "public_projection_safe", "Canonical event."),
    column("action_kind", "action_kind", "text", false, false, null, "action_kind in ('buy_ticket','view_official_event','ticket_channel_unavailable')", null, "public_projection_safe", "Resolved action."),
    column("action_label", "action_label", "text", false, false, null, null, null, "public_projection_safe", "Portuguese public label."),
    column("resolved_url", "resolved_url", "text", true, true, null, null, null, "public_projection_safe", "Internal redirect path for commercial channels or validated external reference URL for non-commercial reference."),
    column("monetized", "monetized", "boolean", false, false, null, null, null, "public_projection_safe", "Commercial flag."),
    column("disclosure_required", "disclosure_required", "boolean", false, false, null, null, null, "public_projection_safe", "Disclosure flag."),
    column("disclosure_text", "disclosure_text", "text", true, true, null, null, null, "public_projection_safe", "Approved disclosure."),
    column("commercial_channel_id", "commercial_channel_id", "uuid", true, true, null, null, null, "public_projection_safe", "Opaque channel reference used to generate an internal redirect token."),
    column("decision_version", "decision_version", "text", false, false, null, null, null, "public_projection_safe", "Resolver contract version."),
    column("resolved_at", "resolved_at", "timestamptz", false, false, null, null, null, "public_projection_safe", "Resolution timestamp."),
  ],
  indexes: [],
  triggers: [],
  rls: null,
  invariants: [
    "No public SQL view or SECURITY DEFINER function is created in the initial rollout.",
    "A valid active commercial channel has priority over a validated official reference.",
    "A commercial result returns only an internal USECLUBBERS redirect path, never the raw commercial URL or tracking secret.",
    "A paused, expired or revoked channel falls back to a validated official reference.",
    "If no safe destination exists, the resolver returns Canal de vendas a confirmar.",
    "Legacy ticket_url is never read as a monetized source.",
  ],
  deferredDecisions: [
    "A database view may be reconsidered only after a dedicated RLS and view-security audit.",
  ],
};

export const EVENT_TICKET_COMMERCIAL_SCHEMA_OBJECT_PLANS: readonly EventTicketCommercialSchemaObjectPlan[] = [
  CANONICAL_EVENT_SOURCES_EXTENSION,
  PARTNERSHIP_REQUESTS_TABLE,
  COMMERCIAL_CHANNELS_TABLE,
  COMMERCIAL_AUDIT_TABLE,
  CLICK_ATTRIBUTIONS_TABLE,
  PURCHASE_SIGNALS_TABLE,
  OFFICIAL_COMMUNICATIONS_TABLE,
  PUBLIC_RESOLVER_PROJECTION,
] as const;

export const EVENT_TICKET_COMMERCIAL_SCHEMA_LEGACY_MAPPINGS: readonly EventTicketCommercialSchemaLegacyMapping[] = [
  {
    source: "canonical_events.official_url",
    destination: "canonical_event_sources",
    automaticPublicActivationAllowed: false,
    migrationMode: "reference_candidate_only",
    statusMapping: null,
    rule:
      "May seed or reconcile an official reference candidate. It never creates a commercial channel.",
  },
  {
    source: "canonical_events.ticket_url",
    destination: "canonical_event_sources",
    automaticPublicActivationAllowed: false,
    migrationMode: "reference_candidate_only",
    statusMapping: null,
    rule:
      "Remains technical discovery evidence only and never becomes the Comprar ingresso destination.",
  },
  {
    source: "official_event_candidates.ticket_url",
    destination: "canonical_event_sources",
    automaticPublicActivationAllowed: false,
    migrationMode: "reference_candidate_only",
    statusMapping: null,
    rule:
      "May support event validation after source checks; it never activates monetization.",
  },
  {
    source: "event_groups.official_url",
    destination: "canonical_event_sources",
    automaticPublicActivationAllowed: false,
    migrationMode: "compatibility_read_only",
    statusMapping: null,
    rule:
      "Remains a compatibility reference until canonical-source reconciliation is audited.",
  },
  {
    source: "partner_ticket_requests",
    destination: "event_ticket_partnership_requests",
    automaticPublicActivationAllowed: false,
    migrationMode: "request_normalization",
    statusMapping: {
      pending: "pending",
      needs_info: "needs_info",
      approved: "approved",
      rejected: "rejected",
      active: "approved",
      paused: "approved",
      expired: "approved",
    },
    rule:
      "Legacy active, paused or expired request states become approved requests only; they never preserve public activation.",
  },
  {
    source: "event_groups.partner_ticket_fields",
    destination: "event_ticket_commercial_channels",
    automaticPublicActivationAllowed: false,
    migrationMode: "draft_channel_candidate_only",
    statusMapping: {
      active: "draft",
      paused: "draft",
      expired: "draft",
      missing: "draft",
    },
    rule:
      "Legacy embedded partner data may seed a draft channel candidate that requires a new admin review, authorization and activation.",
  },
  {
    source: "event_ticket_intents.ticket_acquired",
    destination: "event_ticket_purchase_signals",
    automaticPublicActivationAllowed: false,
    migrationMode: "self_declared_signal_only",
    statusMapping: {
      ticket_acquired: "self_declared_purchase",
    },
    rule:
      "Backfill only as a self-declared purchase with deterministic idempotency; never as an attributed or confirmed conversion.",
  },
] as const;

export const EVENT_TICKET_COMMERCIAL_SCHEMA_MIGRATION_PHASES: readonly EventTicketCommercialSchemaMigrationPhase[] = [
  {
    phase: 1,
    phaseKey: "preflight_inventory_and_backup",
    purpose: "Prove the current database shape and create recoverable backups.",
    databaseWriteAllowedInThisVersion: false,
    requiredEvidenceBeforeFutureExecution: [
      "Fresh schema dump and hash.",
      "Data backup for all legacy ticket and event tables.",
      "Exact production row counts and nullability inventory.",
      "Validated admin/service-role execution identity.",
    ],
    plannedActions: [
      "Inspect canonical_event_sources, canonical_events, event_groups, partner_ticket_requests and event_ticket_intents.",
      "Detect duplicate legacy commercial candidates.",
      "Produce a dry-run compatibility report with zero writes.",
    ],
    rollbackActions: ["No rollback required because this phase is read-only."],
  },
  {
    phase: 2,
    phaseKey: "additive_schema_creation",
    purpose: "Create only additive columns, tables, indexes and constraints.",
    databaseWriteAllowedInThisVersion: false,
    requiredEvidenceBeforeFutureExecution: [
      "Approved migration file hash.",
      "Structural review proving no drop, truncate or destructive alter.",
      "Successful local and linked-project dry-run.",
    ],
    plannedActions: [
      "Extend canonical_event_sources with official-reference validation fields.",
      "Create partnership requests, commercial channels, audit, clicks, purchase signals and communications.",
      "Create foreign keys in dependency order.",
      "Create the one-active-channel partial unique index.",
    ],
    rollbackActions: [
      "Drop newly created tables in reverse dependency order only if no production data has been accepted.",
      "Drop additive canonical_event_sources columns only after verifying they contain no required data.",
    ],
  },
  {
    phase: 3,
    phaseKey: "security_and_integrity_guards",
    purpose: "Activate deny-by-default access and database-level integrity guards.",
    databaseWriteAllowedInThisVersion: false,
    requiredEvidenceBeforeFutureExecution: [
      "RLS review.",
      "Append-only trigger test.",
      "Channel lifecycle trigger test.",
      "Confirmed-conversion guard test.",
    ],
    plannedActions: [
      "Enable and force RLS on new commercial tables.",
      "Revoke anon and authenticated direct privileges.",
      "Install append-only audit, channel guard and conversion guard triggers.",
    ],
    rollbackActions: [
      "Disable routes before removing any guard.",
      "Never relax RLS while public or partner routes remain enabled.",
    ],
  },
  {
    phase: 4,
    phaseKey: "legacy_backfill_shadow_only",
    purpose: "Normalize legacy data without activating monetization.",
    databaseWriteAllowedInThisVersion: false,
    requiredEvidenceBeforeFutureExecution: [
      "Dry-run mapping report approved by admin.",
      "Idempotency keys generated and collision-free.",
      "Every legacy active commercial record downgraded to a draft candidate.",
    ],
    plannedActions: [
      "Backfill official-reference candidates.",
      "Normalize legacy partnership requests.",
      "Create draft-only commercial channel candidates.",
      "Backfill ticket_acquired only as self_declared_purchase.",
    ],
    rollbackActions: [
      "Delete only rows tagged with the exact migration batch id while no new application writes exist.",
      "Preserve the legacy source tables unchanged until cutover is complete.",
    ],
  },
  {
    phase: 5,
    phaseKey: "protected_routes_and_admin_shadow",
    purpose: "Introduce controlled reads and writes without changing the public event page.",
    databaseWriteAllowedInThisVersion: false,
    requiredEvidenceBeforeFutureExecution: [
      "Admin authorization contract.",
      "Partner submission ownership tests.",
      "Idempotency and optimistic-concurrency tests.",
      "Audit row parity with each mutation.",
    ],
    plannedActions: [
      "Create partner submission route.",
      "Create admin review and commercial lifecycle routes.",
      "Create a server-only public resolver in shadow mode.",
      "Keep legacy public ticket behavior unchanged.",
    ],
    rollbackActions: [
      "Disable new routes and keep schema data intact for audit.",
    ],
  },
  {
    phase: 6,
    phaseKey: "public_activation_separate_release",
    purpose: "Activate public buttons only after commercial and security validation.",
    databaseWriteAllowedInThisVersion: false,
    requiredEvidenceBeforeFutureExecution: [
      "Admin-approved active channel for a controlled pilot event.",
      "Redirect attribution route validated.",
      "Commercial disclosure approved.",
      "Fallback to Ver evento oficial validated.",
      "No raw ticket_url path in the public resolver.",
    ],
    plannedActions: [
      "Enable Comprar ingresso for one approved pilot channel.",
      "Use an internal redirect path for commercial exits.",
      "Retain Ver evento oficial fallback and Canal de vendas a confirmar.",
    ],
    rollbackActions: [
      "Pause the channel or disable the resolver feature flag; fallback remains available.",
    ],
  },
] as const;

export const EVENT_TICKET_COMMERCIAL_SCHEMA_READINESS_BLOCKERS: readonly EventTicketCommercialSchemaReadinessBlocker[] = [
  {
    blockerKey: "production_schema_inventory_missing",
    blockingRealMigration: true,
    reason:
      "The plan is based on repository migrations, not a fresh production schema dump.",
    resolutionRequired:
      "Capture and compare the current production schema before drafting SQL.",
  },
  {
    blockerKey: "verified_partner_registry_missing",
    blockingRealMigration: true,
    reason:
      "No approved partner registry foreign-key target was included in the context.",
    resolutionRequired:
      "Keep partner_id nullable without a foreign key initially or approve a verified partner registry first.",
  },
  {
    blockerKey: "commercial_secret_storage_not_selected",
    blockingRealMigration: true,
    reason:
      "The production secret-manager mechanism for tracking credentials is not yet approved.",
    resolutionRequired:
      "Select and test secret storage; never store raw partner secrets in metadata or public columns.",
  },
  {
    blockerKey: "retention_and_cleanup_job_not_defined",
    blockingRealMigration: true,
    reason:
      "Click and purchase-signal retention requires an operational cleanup or anonymization process.",
    resolutionRequired:
      "Approve retention policy and implement a tested cleanup job before tracking is enabled.",
  },
  {
    blockerKey: "admin_authorization_predicate_not_frozen",
    blockingRealMigration: true,
    reason:
      "The exact reusable admin authorization predicate for commercial operations is not yet frozen.",
    resolutionRequired:
      "Reuse or formalize the protected admin route contract before any commercial write route exists.",
  },
  {
    blockerKey: "trusted_conversion_signature_contract_missing",
    blockingRealMigration: true,
    reason:
      "Confirmed conversions require trusted evidence, replay protection and signature validation.",
    resolutionRequired:
      "Approve the integration verification contract before accepting confirmed_conversion writes.",
  },
] as const;

function uniqueObjectKeys(
  values: EventTicketCommercialSchemaObjectKey[],
): EventTicketCommercialSchemaObjectKey[] {
  return Array.from(new Set(values));
}

function isKnownObjectKey(value: string): value is EventTicketCommercialSchemaObjectKey {
  return EVENT_TICKET_COMMERCIAL_SCHEMA_OBJECT_KEYS.includes(
    value as EventTicketCommercialSchemaObjectKey,
  );
}

function buildSchemaPlan(
  requestedObjectKeys: EventTicketCommercialSchemaObjectKey[],
): EventTicketCommercialSchemaPlan {
  const selected = EVENT_TICKET_COMMERCIAL_SCHEMA_OBJECT_PLANS.filter((item) =>
    requestedObjectKeys.includes(item.objectKey),
  );

  return {
    version: EVENT_TICKET_COMMERCIAL_SCHEMA_PLAN_VERSION,
    sourceContractVersion:
      EVENT_TICKET_COMMERCIAL_PERSISTENCE_CONTRACT_VERSION,
    objectPlans: selected,
    legacyMappings: [...EVENT_TICKET_COMMERCIAL_SCHEMA_LEGACY_MAPPINGS],
    migrationPhases: [...EVENT_TICKET_COMMERCIAL_SCHEMA_MIGRATION_PHASES],
    readinessBlockers: [...EVENT_TICKET_COMMERCIAL_SCHEMA_READINESS_BLOCKERS],
    plannedExistingTableExtensions: selected.filter(
      (item) => item.storageKind === "existing_table_extension",
    ).length,
    plannedNewTables: selected.filter(
      (item) => item.storageKind === "new_table",
    ).length,
    plannedAppendOnlyTables: selected.filter(
      (item) => item.storageKind === "append_only_table",
    ).length,
    plannedServerResolverProjections: selected.filter(
      (item) => item.storageKind === "server_resolver_projection",
    ).length,
    initialPublicResolverKind: "server_route_only",
    initialPublicCommercialDestinationKind: "internal_redirect_path",
    publicDatabaseViewPlannedNow: false,
    realMigrationReadyNow: false,
    migrationDraftMayBePreparedLater: true,
    migrationFileCreated: false,
    databaseWritePerformed: false,
    publicTicketLinkActivated: false,
  };
}

export function resolveEventTicketCommercialSchemaPlan(
  input: EventTicketCommercialSchemaPlanInput = {},
): EventTicketCommercialSchemaPlanDecision {
  const requestedRaw = input.requestedObjectKeys ?? [
    ...EVENT_TICKET_COMMERCIAL_SCHEMA_OBJECT_KEYS,
  ];
  const requested = uniqueObjectKeys(requestedRaw);

  if (input.requestRealMigration === true) {
    return {
      ok: false,
      state: "blocked_real_migration_requested",
      reason: "real_migration_not_allowed_in_schema_plan_version",
      requestedObjectKeys: requested,
      schemaPlan: null,
      migrationFileCreated: false,
      supabaseOperationPerformed: false,
      databaseWritePerformed: false,
      publicTicketLinkActivated: false,
      publicDatabaseViewCreated: false,
    };
  }

  if (input.requestDatabaseWrite === true) {
    return {
      ok: false,
      state: "blocked_database_write_requested",
      reason: "database_write_not_allowed_in_schema_plan_version",
      requestedObjectKeys: requested,
      schemaPlan: null,
      migrationFileCreated: false,
      supabaseOperationPerformed: false,
      databaseWritePerformed: false,
      publicTicketLinkActivated: false,
      publicDatabaseViewCreated: false,
    };
  }

  if (input.requestPublicActivation === true) {
    return {
      ok: false,
      state: "blocked_public_activation_requested",
      reason: "public_ticket_activation_not_allowed_in_schema_plan_version",
      requestedObjectKeys: requested,
      schemaPlan: null,
      migrationFileCreated: false,
      supabaseOperationPerformed: false,
      databaseWritePerformed: false,
      publicTicketLinkActivated: false,
      publicDatabaseViewCreated: false,
    };
  }

  if (input.requestPublicDatabaseView === true) {
    return {
      ok: false,
      state: "blocked_public_database_view_requested",
      reason: "initial_public_projection_must_be_server_route_only",
      requestedObjectKeys: requested,
      schemaPlan: null,
      migrationFileCreated: false,
      supabaseOperationPerformed: false,
      databaseWritePerformed: false,
      publicTicketLinkActivated: false,
      publicDatabaseViewCreated: false,
    };
  }

  if (requested.length === 0) {
    return {
      ok: false,
      state: "blocked_empty_object_scope",
      reason: "requested_schema_object_scope_is_empty",
      requestedObjectKeys: [],
      schemaPlan: null,
      migrationFileCreated: false,
      supabaseOperationPerformed: false,
      databaseWritePerformed: false,
      publicTicketLinkActivated: false,
      publicDatabaseViewCreated: false,
    };
  }

  const rawRequested = input.requestedObjectKeys as unknown as string[] | null;
  if (rawRequested && rawRequested.some((item) => !isKnownObjectKey(item))) {
    return {
      ok: false,
      state: "blocked_unknown_object_scope",
      reason: "requested_schema_object_scope_contains_unknown_object",
      requestedObjectKeys: requested,
      schemaPlan: null,
      migrationFileCreated: false,
      supabaseOperationPerformed: false,
      databaseWritePerformed: false,
      publicTicketLinkActivated: false,
      publicDatabaseViewCreated: false,
    };
  }

  return {
    ok: true,
    state: "schema_plan_ready",
    reason: "commercial_schema_plan_ready_without_migration",
    requestedObjectKeys: requested,
    schemaPlan: buildSchemaPlan(requested),
    migrationFileCreated: false,
    supabaseOperationPerformed: false,
    databaseWritePerformed: false,
    publicTicketLinkActivated: false,
    publicDatabaseViewCreated: false,
  };
}

function findObject(
  key: EventTicketCommercialSchemaObjectKey,
): EventTicketCommercialSchemaObjectPlan | undefined {
  return EVENT_TICKET_COMMERCIAL_SCHEMA_OBJECT_PLANS.find(
    (item) => item.objectKey === key,
  );
}

function hasIndex(objectKey: EventTicketCommercialSchemaObjectKey, name: string): boolean {
  return Boolean(findObject(objectKey)?.indexes.some((item) => item.indexName === name));
}

function hasTrigger(
  objectKey: EventTicketCommercialSchemaObjectKey,
  name: string,
): boolean {
  return Boolean(findObject(objectKey)?.triggers.some((item) => item.triggerName === name));
}

function hasColumn(
  objectKey: EventTicketCommercialSchemaObjectKey,
  name: string,
): boolean {
  return Boolean(findObject(objectKey)?.columns.some((item) => item.columnName === name));
}

export function runEventTicketCommercialSchemaPlanSelfTest(): EventTicketCommercialSchemaPlanSelfTestResult {
  const defaultDecision = resolveEventTicketCommercialSchemaPlan();
  const migrationBlocked = resolveEventTicketCommercialSchemaPlan({
    requestRealMigration: true,
  });
  const writeBlocked = resolveEventTicketCommercialSchemaPlan({
    requestDatabaseWrite: true,
  });
  const activationBlocked = resolveEventTicketCommercialSchemaPlan({
    requestPublicActivation: true,
  });
  const viewBlocked = resolveEventTicketCommercialSchemaPlan({
    requestPublicDatabaseView: true,
  });
  const emptyBlocked = resolveEventTicketCommercialSchemaPlan({
    requestedObjectKeys: [],
  });
  const unknownBlocked = resolveEventTicketCommercialSchemaPlan({
    requestedObjectKeys: ["unknown_object" as EventTicketCommercialSchemaObjectKey],
  });

  const plan = defaultDecision.schemaPlan;
  const channel = findObject("event_ticket_commercial_channels");
  const resolver = findObject("resolved_public_event_ticket_channel");
  const reference = findObject("canonical_event_sources_extension");
  const audit = findObject("event_ticket_commercial_audit_log");
  const clicks = findObject("event_ticket_click_attributions");
  const signals = findObject("event_ticket_purchase_signals");
  const requests = findObject("event_ticket_partnership_requests");
  const communications = findObject("partner_official_communications");

  const persistenceNames = new Set(
    EVENT_TICKET_COMMERCIAL_PERSISTENCE_ENTITY_BLUEPRINTS.map(
      (item) => item.proposedStorageName,
    ),
  );

  const checks: Record<string, boolean> = {
    default_schema_plan_ready:
      defaultDecision.ok && defaultDecision.state === "schema_plan_ready",
    exact_eight_schema_objects: plan?.objectPlans.length === 8,
    one_existing_table_extension: plan?.plannedExistingTableExtensions === 1,
    five_standard_new_tables: plan?.plannedNewTables === 5,
    one_append_only_table: plan?.plannedAppendOnlyTables === 1,
    one_server_projection: plan?.plannedServerResolverProjections === 1,
    six_physical_new_tables_total:
      (plan?.plannedNewTables ?? 0) + (plan?.plannedAppendOnlyTables ?? 0) === 6,
    persistence_contract_alignment:
      EVENT_TICKET_COMMERCIAL_SCHEMA_OBJECT_PLANS.every((item) =>
        persistenceNames.has(item.storageName),
      ),
    canonical_source_reused:
      reference?.storageName === "canonical_event_sources" &&
      reference.migrationAction === "alter_existing_table",
    existing_source_key_used_for_idempotency:
      reference?.invariants.some((item) => item.includes("source_key")) === true &&
      !hasColumn("canonical_event_sources_extension", "reference_idempotency_key"),
    request_and_channel_statuses_separated:
      requests?.columns.find((item) => item.columnName === "request_status")
        ?.checkExpression?.includes("withdrawn") === true &&
      channel?.columns.find((item) => item.columnName === "channel_status")
        ?.checkExpression?.includes("revoked") === true,
    request_can_precede_canonical_match:
      requests?.columns.find((item) => item.columnName === "canonical_event_id")
        ?.nullableOnCreate === true,
    channel_requires_canonical_event:
      channel?.columns.find((item) => item.columnName === "canonical_event_id")
        ?.nullableOnCreate === false,
    one_active_channel_partial_unique:
      hasIndex(
        "event_ticket_commercial_channels",
        "event_ticket_commercial_channels_one_active_per_event_uq",
      ) &&
      channel?.indexes.some(
        (item) =>
          item.indexName ===
            "event_ticket_commercial_channels_one_active_per_event_uq" &&
          item.unique &&
          item.whereExpression === "channel_status = 'active'",
      ) === true,
    admin_only_commercial_write:
      channel?.rls?.directClientAccessAllowed === false &&
      EVENT_TICKET_COMMERCIAL_PERSISTENCE_POLICY.adminCommercialControlRequired,
    partner_direct_write_blocked:
      EVENT_TICKET_COMMERCIAL_SCHEMA_OBJECT_PLANS.filter(
        (item) => item.rls !== null,
      ).every((item) => item.rls?.directClientAccessAllowed === false),
    raw_commercial_url_server_only:
      channel?.columns.find((item) => item.columnName === "commercial_url")
        ?.security === "commercial_secret",
    secret_reference_not_raw_key:
      hasColumn("event_ticket_commercial_channels", "tracking_secret_ref") &&
      !hasColumn("event_ticket_commercial_channels", "tracking_key"),
    public_commercial_exit_uses_internal_redirect:
      plan?.initialPublicCommercialDestinationKind === "internal_redirect_path" &&
      resolver?.invariants.some((item) => item.includes("internal USECLUBBERS redirect")) === true,
    no_public_database_view:
      resolver?.migrationAction === "no_database_object" &&
      plan?.publicDatabaseViewPlannedNow === false,
    audit_append_only_trigger:
      audit?.storageKind === "append_only_table" &&
      hasTrigger(
        "event_ticket_commercial_audit_log",
        "event_ticket_commercial_audit_append_only",
      ),
    channel_mutation_audited_same_transaction:
      hasTrigger(
        "event_ticket_commercial_channels",
        "event_ticket_commercial_channels_audit",
      ),
    click_not_purchase:
      clicks?.invariants.some((item) => item === "A click is not a purchase or confirmed revenue.") === true,
    raw_ip_storage_blocked:
      !hasColumn("event_ticket_click_attributions", "ip_address") &&
      EVENT_TICKET_COMMERCIAL_SCHEMA_PLAN_POLICY.rawIpAddressStorageAllowed === false,
    retention_required_before_tracking:
      hasColumn("event_ticket_click_attributions", "retention_expires_at") &&
      clicks?.deferredDecisions.length === 1,
    self_declared_not_confirmed:
      signals?.invariants.some((item) => item === "self_declared_purchase is never confirmed revenue.") === true,
    confirmed_conversion_guard:
      hasTrigger(
        "event_ticket_purchase_signals",
        "event_ticket_purchase_signals_confirmation_guard",
      ),
    communication_independent_from_commercial_authorization:
      communications?.invariants.some((item) =>
        item.includes("does not grant ticket-commercial authorization"),
      ) === true,
    partner_never_publishes_directly:
      communications?.invariants.some((item) => item === "Partners never publish directly.") === true,
    legacy_ticket_url_never_commercial:
      EVENT_TICKET_COMMERCIAL_SCHEMA_LEGACY_MAPPINGS.filter((item) =>
        item.source.includes("ticket_url"),
      ).every(
        (item) =>
          item.automaticPublicActivationAllowed === false &&
          item.migrationMode === "reference_candidate_only",
      ),
    legacy_active_downgraded_to_draft:
      EVENT_TICKET_COMMERCIAL_SCHEMA_LEGACY_MAPPINGS.some(
        (item) =>
          item.source === "event_groups.partner_ticket_fields" &&
          item.statusMapping?.active === "draft",
      ),
    legacy_ticket_acquired_self_declared_only:
      EVENT_TICKET_COMMERCIAL_SCHEMA_LEGACY_MAPPINGS.some(
        (item) =>
          item.source === "event_ticket_intents.ticket_acquired" &&
          item.statusMapping?.ticket_acquired === "self_declared_purchase",
      ),
    migration_phases_defined: plan?.migrationPhases.length === 6,
    public_activation_is_separate_phase:
      plan?.migrationPhases.at(-1)?.phaseKey ===
      "public_activation_separate_release",
    readiness_blockers_preserved:
      plan?.readinessBlockers.length === 6 && plan.realMigrationReadyNow === false,
    real_migration_blocked:
      !migrationBlocked.ok &&
      migrationBlocked.state === "blocked_real_migration_requested",
    database_write_blocked:
      !writeBlocked.ok &&
      writeBlocked.state === "blocked_database_write_requested",
    public_activation_blocked:
      !activationBlocked.ok &&
      activationBlocked.state === "blocked_public_activation_requested",
    public_view_blocked:
      !viewBlocked.ok &&
      viewBlocked.state === "blocked_public_database_view_requested",
    empty_scope_blocked:
      !emptyBlocked.ok && emptyBlocked.state === "blocked_empty_object_scope",
    unknown_scope_blocked:
      !unknownBlocked.ok &&
      unknownBlocked.state === "blocked_unknown_object_scope",
    no_migration_or_write_performed:
      EVENT_TICKET_COMMERCIAL_SCHEMA_PLAN_POLICY.migrationFileCreated === false &&
      EVENT_TICKET_COMMERCIAL_SCHEMA_PLAN_POLICY.databaseWritePerformed === false &&
      EVENT_TICKET_COMMERCIAL_SCHEMA_PLAN_POLICY.supabaseOperationPerformed === false,
    no_public_link_activated:
      EVENT_TICKET_COMMERCIAL_SCHEMA_PLAN_POLICY.publicTicketLinkActivated === false,
    persistence_legacy_rules_still_non_authoritative:
      EVENT_TICKET_COMMERCIAL_PERSISTENCE_LEGACY_COMPATIBILITY.every(
        (item) => item.authoritativeForCommercialPublicButton === false,
      ),
  };

  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return {
    ok: failedChecks.length === 0,
    version: EVENT_TICKET_COMMERCIAL_SCHEMA_PLAN_VERSION,
    checks,
    failedChecks,
    migration_file_created: false,
    supabase_operation_performed: false,
    database_write_performed: false,
    public_ticket_link_activated: false,
    public_database_view_created: false,
  };
}
