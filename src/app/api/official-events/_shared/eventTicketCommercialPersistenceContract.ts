// src/app/api/official-events/_shared/eventTicketCommercialPersistenceContract.ts

import {
  EVENT_TICKET_COMMERCIAL_CHANNEL_STATUSES,
  EVENT_TICKET_PARTNERSHIP_REQUEST_STATUSES,
  EVENT_TICKET_PURCHASE_EVIDENCE_SOURCES,
  EVENT_TICKET_PURCHASE_SIGNAL_TYPES,
  OFFICIAL_EVENT_REFERENCE_STATUSES,
  PARTNER_OFFICIAL_COMMUNICATION_STATUSES,
  type EventTicketCommercialChannelStatus,
  type EventTicketGovernanceActorRole,
  type EventTicketPartnershipRequestStatus,
  type EventTicketPurchaseEvidenceSource,
  type EventTicketPurchaseSignalType,
  type OfficialEventReferenceStatus,
  type PartnerOfficialCommunicationStatus,
} from "./eventTicketCommercialGovernanceFoundation";

export const EVENT_TICKET_COMMERCIAL_PERSISTENCE_CONTRACT_VERSION =
  "v4.8.85-event-ticket-commercial-persistence-contract-safe" as const;

export const EVENT_TICKET_COMMERCIAL_PERSISTENCE_POLICY = {
  contractOnly: true,
  migrationFileCreated: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicTicketLinkActivated: false,
  publicEventPageChanged: false,
  legacyTechnicalTicketUrlAllowedForCommercialButton: false,
  partnerDirectTableWriteAllowed: false,
  partnerCommercialActivationAllowed: false,
  adminCommercialControlRequired: true,
  canonicalEventIdRequiredForCommercialActivation: true,
  auditLogAppendOnlyRequired: true,
  hardDeleteCommercialHistoryAllowed: false,
  rawIpAddressStorageAllowed: false,
  publicReadsUseResolvedProjectionOnly: true,
} as const;

export const EVENT_TICKET_COMMERCIAL_PERSISTENCE_ENTITY_KEYS = [
  "official_event_reference",
  "ticket_partnership_request",
  "ticket_commercial_channel",
  "ticket_commercial_audit_log",
  "ticket_click_attribution",
  "ticket_purchase_signal",
  "partner_official_communication",
  "public_ticket_resolver_projection",
] as const;

export type EventTicketCommercialPersistenceEntityKey =
  (typeof EVENT_TICKET_COMMERCIAL_PERSISTENCE_ENTITY_KEYS)[number];

export const EVENT_TICKET_COMMERCIAL_PERSISTENCE_ACTOR_ROLES = [
  "useclubbers_admin",
  "partner_user",
  "automation",
  "system",
  "clubber_user",
  "trusted_ticketing_integration",
] as const;

export type EventTicketCommercialPersistenceActorRole =
  | EventTicketGovernanceActorRole
  | "clubber_user"
  | "trusted_ticketing_integration";

export const EVENT_TICKET_COMMERCIAL_PERSISTENCE_WRITE_PATHS = [
  "admin_server_route",
  "partner_submission_route",
  "automation_ingestion_service",
  "system_redirect_route",
  "clubber_authenticated_route",
  "trusted_integration_route",
  "public_resolver_read",
  "direct_table_access",
] as const;

export type EventTicketCommercialPersistenceWritePath =
  (typeof EVENT_TICKET_COMMERCIAL_PERSISTENCE_WRITE_PATHS)[number];

export const EVENT_TICKET_COMMERCIAL_PERSISTENCE_ACTIONS = [
  "plan_official_reference_candidate",
  "plan_official_reference_validation",
  "plan_partnership_request_submission",
  "plan_partnership_request_review",
  "plan_commercial_channel_create",
  "plan_commercial_channel_transition",
  "plan_commercial_audit_append",
  "plan_click_attribution_record",
  "plan_purchase_signal_record",
  "plan_official_communication_submission",
  "plan_official_communication_review",
  "plan_public_ticket_projection_read",
  "plan_legacy_data_migration",
] as const;

export type EventTicketCommercialPersistenceAction =
  (typeof EVENT_TICKET_COMMERCIAL_PERSISTENCE_ACTIONS)[number];

export type EventTicketCommercialPersistenceStorageKind =
  | "existing_table_extension"
  | "new_table"
  | "append_only_table"
  | "existing_table_compatibility"
  | "derived_projection";

export type EventTicketCommercialPersistenceColumnType =
  | "uuid"
  | "text"
  | "boolean"
  | "integer"
  | "numeric"
  | "date"
  | "timestamptz"
  | "jsonb"
  | "text_array";

export type EventTicketCommercialPersistenceColumnRole =
  | "primary_identity"
  | "canonical_identity"
  | "partner_identity"
  | "commercial_governance"
  | "commercial_tracking"
  | "commercial_finance"
  | "authorization"
  | "status"
  | "audit"
  | "privacy"
  | "compatibility"
  | "content"
  | "public_projection";

export type EventTicketCommercialPersistenceConstraintKind =
  | "primary_key"
  | "not_null"
  | "unique"
  | "foreign_key"
  | "check"
  | "default"
  | "index"
  | "partial_unique"
  | "append_only";

export type EventTicketCommercialPersistenceDeletePolicy =
  | "restrict"
  | "soft_revoke_only"
  | "retain_and_anonymize"
  | "derived_no_delete";

export type EventTicketCommercialPersistenceReadPolicy =
  | "admin_only"
  | "owner_and_admin"
  | "service_only"
  | "resolved_public_projection_only"
  | "partner_own_submission_and_admin";

export type EventTicketCommercialPersistenceWritePolicy =
  | "admin_server_route_only"
  | "partner_submission_route_only"
  | "automation_ingestion_service_only"
  | "system_redirect_route_only"
  | "clubber_authenticated_route_only"
  | "trusted_integration_route_only"
  | "append_only_server_route"
  | "no_write_projection";

export type EventTicketCommercialPersistenceColumn = {
  columnName: string;
  columnType: EventTicketCommercialPersistenceColumnType;
  nullable: boolean;
  role: EventTicketCommercialPersistenceColumnRole;
  constraints: EventTicketCommercialPersistenceConstraintKind[];
  description: string;
};

export type EventTicketCommercialPersistenceIndex = {
  indexKey: string;
  columns: string[];
  unique: boolean;
  partialCondition: string | null;
  purpose: string;
};

export type EventTicketCommercialPersistenceEntityBlueprint = {
  entityKey: EventTicketCommercialPersistenceEntityKey;
  proposedStorageName: string;
  storageKind: EventTicketCommercialPersistenceStorageKind;
  sourceOfTruth: boolean;
  purpose: string;
  canonicalEventIdRequired: boolean;
  statusValues:
    | readonly OfficialEventReferenceStatus[]
    | readonly EventTicketPartnershipRequestStatus[]
    | readonly EventTicketCommercialChannelStatus[]
    | readonly EventTicketPurchaseSignalType[]
    | readonly PartnerOfficialCommunicationStatus[]
    | readonly string[]
    | null;
  readPolicy: EventTicketCommercialPersistenceReadPolicy;
  writePolicy: EventTicketCommercialPersistenceWritePolicy;
  deletePolicy: EventTicketCommercialPersistenceDeletePolicy;
  columns: EventTicketCommercialPersistenceColumn[];
  indexes: EventTicketCommercialPersistenceIndex[];
  invariants: string[];
};

export type EventTicketCommercialPersistenceRelationship = {
  relationshipKey: string;
  fromEntity: EventTicketCommercialPersistenceEntityKey;
  fromColumn: string;
  toStorageName: string;
  toColumn: string;
  required: boolean;
  deleteBehavior: "restrict" | "cascade" | "set_null";
  purpose: string;
};

export type EventTicketCommercialLegacyCompatibilitySource =
  | "canonical_events.official_url"
  | "canonical_events.ticket_url"
  | "canonical_event_sources"
  | "official_event_candidates.ticket_url"
  | "event_groups.official_url"
  | "event_groups.partner_ticket_fields"
  | "partner_ticket_requests"
  | "event_ticket_intents";

export type EventTicketCommercialLegacyCompatibilityRule = {
  source: EventTicketCommercialLegacyCompatibilitySource;
  targetEntity: EventTicketCommercialPersistenceEntityKey;
  migrationTreatment:
    | "reuse_as_source_of_truth_with_additive_contract"
    | "candidate_only"
    | "migration_source_only"
    | "compatibility_projection_only"
    | "self_declared_signal_only";
  authoritativeForCommercialPublicButton: false;
  rule: string;
};

export const EVENT_TICKET_COMMERCIAL_PERSISTENCE_LEGACY_COMPATIBILITY: readonly EventTicketCommercialLegacyCompatibilityRule[] =
  [
    {
      source: "canonical_events.official_url",
      targetEntity: "official_event_reference",
      migrationTreatment: "candidate_only",
      authoritativeForCommercialPublicButton: false,
      rule:
        "May seed a validated official reference, but never becomes a monetized commercial channel automatically.",
    },
    {
      source: "canonical_events.ticket_url",
      targetEntity: "official_event_reference",
      migrationTreatment: "candidate_only",
      authoritativeForCommercialPublicButton: false,
      rule:
        "Legacy technical ticket_url remains discovery/reference data and is never a commercial public-button source.",
    },
    {
      source: "canonical_event_sources",
      targetEntity: "official_event_reference",
      migrationTreatment: "reuse_as_source_of_truth_with_additive_contract",
      authoritativeForCommercialPublicButton: false,
      rule:
        "Existing canonical source traces should be reused and extended for official-reference validation instead of duplicating provenance.",
    },
    {
      source: "official_event_candidates.ticket_url",
      targetEntity: "official_event_reference",
      migrationTreatment: "candidate_only",
      authoritativeForCommercialPublicButton: false,
      rule:
        "Candidate ticket URLs may support validation but cannot activate or populate the commercial channel.",
    },
    {
      source: "event_groups.official_url",
      targetEntity: "official_event_reference",
      migrationTreatment: "compatibility_projection_only",
      authoritativeForCommercialPublicButton: false,
      rule:
        "Legacy event-group official URL remains a compatibility reference until the canonical resolver becomes the only public source.",
    },
    {
      source: "event_groups.partner_ticket_fields",
      targetEntity: "ticket_commercial_channel",
      migrationTreatment: "migration_source_only",
      authoritativeForCommercialPublicButton: false,
      rule:
        "Embedded partner_ticket fields may be migrated into audited channels, but must not remain the long-term commercial source of truth.",
    },
    {
      source: "partner_ticket_requests",
      targetEntity: "ticket_partnership_request",
      migrationTreatment: "migration_source_only",
      authoritativeForCommercialPublicButton: false,
      rule:
        "Legacy request rows require status normalization; active, paused and expired values must be split into an approved request plus a separate channel lifecycle.",
    },
    {
      source: "event_ticket_intents",
      targetEntity: "ticket_purchase_signal",
      migrationTreatment: "self_declared_signal_only",
      authoritativeForCommercialPublicButton: false,
      rule:
        "ticket_acquired is a Clubber self-declaration and must never be upgraded to confirmed revenue without trusted external evidence.",
    },
  ] as const;

function column(
  columnName: string,
  columnType: EventTicketCommercialPersistenceColumnType,
  nullable: boolean,
  role: EventTicketCommercialPersistenceColumnRole,
  constraints: EventTicketCommercialPersistenceConstraintKind[],
  description: string,
): EventTicketCommercialPersistenceColumn {
  return {
    columnName,
    columnType,
    nullable,
    role,
    constraints,
    description,
  };
}

function index(
  indexKey: string,
  columns: string[],
  unique: boolean,
  purpose: string,
  partialCondition: string | null = null,
): EventTicketCommercialPersistenceIndex {
  return {
    indexKey,
    columns,
    unique,
    partialCondition,
    purpose,
  };
}

const OFFICIAL_EVENT_REFERENCE_BLUEPRINT: EventTicketCommercialPersistenceEntityBlueprint =
  {
    entityKey: "official_event_reference",
    proposedStorageName: "canonical_event_sources",
    storageKind: "existing_table_extension",
    sourceOfTruth: true,
    purpose:
      "Reuse canonical source provenance and add the validation state required to resolve a safe official event reference.",
    canonicalEventIdRequired: true,
    statusValues: OFFICIAL_EVENT_REFERENCE_STATUSES,
    readPolicy: "resolved_public_projection_only",
    writePolicy: "automation_ingestion_service_only",
    deletePolicy: "restrict",
    columns: [
      column("id", "uuid", false, "primary_identity", ["primary_key"], "Existing canonical source row id."),
      column("canonical_event_id", "uuid", false, "canonical_identity", ["not_null", "foreign_key", "index"], "Canonical event target."),
      column("source_key", "text", false, "canonical_identity", ["not_null"], "Stable source key."),
      column("source_kind", "text", false, "canonical_identity", ["not_null", "index"], "Source category."),
      column("source_url", "text", true, "content", ["index"], "Validated official-reference candidate URL."),
      column("reference_status", "text", false, "status", ["not_null", "default", "check", "index"], "candidate, validated, rejected or stale."),
      column("reference_domain", "text", true, "content", ["index"], "Normalized HTTPS domain."),
      column("confidence_score", "numeric", true, "commercial_governance", ["check"], "Validation confidence from 0 to 100."),
      column("authority_score", "integer", false, "commercial_governance", ["not_null", "default", "check"], "Existing source authority score."),
      column("discovered_automatically", "boolean", false, "audit", ["not_null", "default"], "Whether discovery was automated."),
      column("validated_at", "timestamptz", true, "audit", [], "Validation timestamp."),
      column("validated_by_role", "text", true, "audit", ["check"], "automation or useclubbers_admin."),
      column("validated_by_user_id", "uuid", true, "audit", ["foreign_key"], "Admin user when validation was manual."),
      column("reference_idempotency_key", "text", false, "audit", ["not_null", "unique"], "Deduplication key for reference persistence."),
      column("source_payload_summary", "jsonb", false, "content", ["not_null", "default"], "Existing safe source summary."),
      column("created_at", "timestamptz", false, "audit", ["not_null", "default"], "Creation timestamp."),
      column("updated_at", "timestamptz", false, "audit", ["not_null", "default"], "Last validation-state update."),
    ],
    indexes: [
      index(
        "canonical_event_sources_official_reference_idx",
        ["canonical_event_id", "reference_status", "authority_score"],
        false,
        "Resolve the best validated official reference.",
      ),
      index(
        "canonical_event_sources_reference_identity_uq",
        ["canonical_event_id", "reference_idempotency_key"],
        true,
        "Prevent duplicate official-reference persistence.",
      ),
    ],
    invariants: [
      "Only validated HTTPS references may appear in the public resolver.",
      "An official reference never becomes a commercial channel automatically.",
      "A stale or rejected reference cannot produce a public exit URL.",
      "The technical ticket_url field is not read by the commercial resolver.",
    ],
  };

const PARTNERSHIP_REQUEST_BLUEPRINT: EventTicketCommercialPersistenceEntityBlueprint =
  {
    entityKey: "ticket_partnership_request",
    proposedStorageName: "event_ticket_partnership_requests",
    storageKind: "new_table",
    sourceOfTruth: true,
    purpose:
      "Persist partner commercial submissions independently from the admin-controlled commercial channel.",
    canonicalEventIdRequired: false,
    statusValues: EVENT_TICKET_PARTNERSHIP_REQUEST_STATUSES,
    readPolicy: "partner_own_submission_and_admin",
    writePolicy: "partner_submission_route_only",
    deletePolicy: "retain_and_anonymize",
    columns: [
      column("request_id", "uuid", false, "primary_identity", ["primary_key"], "Request row id."),
      column("canonical_event_id", "uuid", true, "canonical_identity", ["foreign_key", "index"], "Canonical event; required before approval."),
      column("event_slug_snapshot", "text", true, "compatibility", ["index"], "Human-readable event snapshot."),
      column("partner_id", "uuid", true, "partner_identity", ["index"], "Future verified partner identity."),
      column("submitted_by_user_id", "uuid", true, "partner_identity", ["foreign_key", "index"], "Submitting partner user."),
      column("partner_display_name", "text", true, "partner_identity", [], "Partner name at submission."),
      column("request_type", "text", false, "commercial_governance", ["not_null", "check", "index"], "Requested partnership type."),
      column("request_status", "text", false, "status", ["not_null", "default", "check", "index"], "pending, needs_info, approved, rejected or withdrawn."),
      column("current_sales_url", "text", true, "content", [], "Partner-supplied URL; never public by itself."),
      column("ticketing_provider_key", "text", true, "content", ["index"], "Ticketing provider suggested by the partner."),
      column("commercial_contact_name", "text", true, "content", [], "Commercial contact."),
      column("commercial_contact_email", "text", true, "privacy", [], "Commercial email."),
      column("commercial_contact_whatsapp", "text", true, "privacy", [], "Commercial WhatsApp."),
      column("proposed_benefit", "text", true, "content", [], "Discount, presale or benefit proposal."),
      column("commercial_notes", "text", true, "content", [], "Partner notes."),
      column("admin_notes", "text", true, "commercial_governance", [], "Internal review notes."),
      column("client_submission_key", "text", false, "audit", ["not_null", "unique"], "Partner-route idempotency key."),
      column("reviewed_by_admin_user_id", "uuid", true, "authorization", ["foreign_key"], "Reviewing USECLUBBERS admin."),
      column("reviewed_at", "timestamptz", true, "audit", [], "Review timestamp."),
      column("created_at", "timestamptz", false, "audit", ["not_null", "default"], "Submission timestamp."),
      column("updated_at", "timestamptz", false, "audit", ["not_null", "default"], "Last request update."),
      column("metadata", "jsonb", false, "content", ["not_null", "default"], "Safe extensible request metadata."),
    ],
    indexes: [
      index(
        "event_ticket_partnership_requests_status_idx",
        ["request_status", "created_at"],
        false,
        "Admin review queue.",
      ),
      index(
        "event_ticket_partnership_requests_partner_idx",
        ["partner_id", "created_at"],
        false,
        "Partner request history.",
      ),
      index(
        "event_ticket_partnership_requests_event_idx",
        ["canonical_event_id", "created_at"],
        false,
        "Commercial requests for a canonical event.",
      ),
    ],
    invariants: [
      "Approval requires a canonical_event_id and an admin reviewer.",
      "Approved requests do not activate or create a public ticket link.",
      "Request status never contains active, paused, expired or revoked.",
      "Partners may submit or withdraw only their own request through a controlled route.",
    ],
  };

const COMMERCIAL_CHANNEL_BLUEPRINT: EventTicketCommercialPersistenceEntityBlueprint =
  {
    entityKey: "ticket_commercial_channel",
    proposedStorageName: "event_ticket_commercial_channels",
    storageKind: "new_table",
    sourceOfTruth: true,
    purpose:
      "Persist the monetized ticket channel under exclusive USECLUBBERS admin lifecycle control.",
    canonicalEventIdRequired: true,
    statusValues: EVENT_TICKET_COMMERCIAL_CHANNEL_STATUSES,
    readPolicy: "resolved_public_projection_only",
    writePolicy: "admin_server_route_only",
    deletePolicy: "soft_revoke_only",
    columns: [
      column("channel_id", "uuid", false, "primary_identity", ["primary_key"], "Commercial channel id."),
      column("canonical_event_id", "uuid", false, "canonical_identity", ["not_null", "foreign_key", "index"], "Canonical event target."),
      column("source_request_id", "uuid", true, "compatibility", ["foreign_key", "index"], "Approved partner request origin, when applicable."),
      column("source_origin", "text", false, "commercial_governance", ["not_null", "check"], "Origin of the proposed commercial data."),
      column("ticketing_provider_key", "text", true, "content", ["index"], "Ticketing platform key."),
      column("ticketing_display_name", "text", true, "content", [], "Ticketing platform label."),
      column("authorized_domain", "text", false, "authorization", ["not_null", "check"], "Exact authorized HTTPS domain."),
      column("commercial_url", "text", false, "commercial_tracking", ["not_null"], "Admin-approved commercial destination."),
      column("tracking_method", "text", false, "commercial_tracking", ["not_null", "check"], "UTM, coupon, affiliate, postback, webhook or API method."),
      column("tracking_key_encrypted", "text", true, "privacy", [], "Encrypted or secret-managed tracking credential when needed."),
      column("tracking_parameter_name", "text", true, "commercial_tracking", [], "Public query parameter name when applicable."),
      column("remuneration_model", "text", false, "commercial_finance", ["not_null", "check"], "Commission, fixed campaign, hybrid, licensing or no remuneration."),
      column("commission_percent", "numeric", true, "commercial_finance", ["check"], "Percent commission from 0 to 100."),
      column("commission_fixed_minor", "integer", true, "commercial_finance", ["check"], "Fixed commission in minor currency units."),
      column("currency", "text", true, "commercial_finance", ["check"], "ISO 4217 currency."),
      column("authorization_reference", "text", false, "authorization", ["not_null"], "Contract, email or internal authorization reference."),
      column("authorization_starts_at", "timestamptz", false, "authorization", ["not_null", "index"], "Commercial validity start."),
      column("authorization_ends_at", "timestamptz", true, "authorization", ["index"], "Commercial validity end."),
      column("public_priority", "integer", false, "public_projection", ["not_null", "default", "check"], "Resolver priority; ties block public resolution."),
      column("channel_status", "text", false, "status", ["not_null", "default", "check", "index"], "draft, authorized, active, paused, expired or revoked."),
      column("disclosure_text", "text", true, "public_projection", [], "Transparent commercial disclosure."),
      column("created_by_admin_user_id", "uuid", false, "authorization", ["not_null", "foreign_key"], "Admin who created the definitive channel."),
      column("authorized_by_admin_user_id", "uuid", true, "authorization", ["foreign_key"], "Admin who authorized the channel."),
      column("activated_by_admin_user_id", "uuid", true, "authorization", ["foreign_key"], "Admin who activated the channel."),
      column("paused_by_admin_user_id", "uuid", true, "authorization", ["foreign_key"], "Admin who paused the channel."),
      column("revoked_by_admin_user_id", "uuid", true, "authorization", ["foreign_key"], "Admin who revoked the channel."),
      column("created_at", "timestamptz", false, "audit", ["not_null", "default"], "Creation timestamp."),
      column("authorized_at", "timestamptz", true, "audit", [], "Authorization timestamp."),
      column("activated_at", "timestamptz", true, "audit", [], "Activation timestamp."),
      column("paused_at", "timestamptz", true, "audit", [], "Pause timestamp."),
      column("revoked_at", "timestamptz", true, "audit", [], "Revocation timestamp."),
      column("updated_at", "timestamptz", false, "audit", ["not_null", "default", "index"], "Optimistic-concurrency timestamp."),
      column("lock_version", "integer", false, "audit", ["not_null", "default", "check"], "Optimistic-concurrency version."),
      column("idempotency_key", "text", false, "audit", ["not_null", "unique"], "Admin-operation idempotency key."),
      column("metadata", "jsonb", false, "content", ["not_null", "default"], "Safe extensible channel metadata."),
    ],
    indexes: [
      index(
        "event_ticket_commercial_channels_event_status_idx",
        ["canonical_event_id", "channel_status", "public_priority"],
        false,
        "Resolve current channel candidates.",
      ),
      index(
        "event_ticket_commercial_channels_active_primary_uq",
        ["canonical_event_id"],
        true,
        "Allow at most one current public channel per event in the first production implementation.",
        "channel_status = 'active'",
      ),
      index(
        "event_ticket_commercial_channels_validity_idx",
        ["channel_status", "authorization_starts_at", "authorization_ends_at"],
        false,
        "Expire or block channels outside their authorization window.",
      ),
    ],
    invariants: [
      "Only useclubbers_admin may create, authorize, activate, pause, reactivate or revoke.",
      "A channel is public only when active, in its validity window and resolved without a priority conflict.",
      "Revocation is terminal and history is never hard-deleted.",
      "The authorized domain must match the commercial URL domain.",
      "A partner-supplied URL is input evidence, not the definitive commercial URL.",
      "No public query exposes commission, authorization documents or secret tracking keys.",
    ],
  };

const COMMERCIAL_AUDIT_BLUEPRINT: EventTicketCommercialPersistenceEntityBlueprint =
  {
    entityKey: "ticket_commercial_audit_log",
    proposedStorageName: "event_ticket_commercial_audit_log",
    storageKind: "append_only_table",
    sourceOfTruth: true,
    purpose:
      "Preserve every commercial decision and state transition as an immutable audit trail.",
    canonicalEventIdRequired: true,
    statusValues: null,
    readPolicy: "admin_only",
    writePolicy: "append_only_server_route",
    deletePolicy: "restrict",
    columns: [
      column("audit_id", "uuid", false, "primary_identity", ["primary_key"], "Audit row id."),
      column("canonical_event_id", "uuid", false, "canonical_identity", ["not_null", "foreign_key", "index"], "Canonical event."),
      column("channel_id", "uuid", true, "commercial_governance", ["foreign_key", "index"], "Commercial channel when applicable."),
      column("request_id", "uuid", true, "commercial_governance", ["foreign_key", "index"], "Partnership request when applicable."),
      column("audit_action", "text", false, "audit", ["not_null", "check", "index"], "Created, reviewed, authorized, activated, paused, expired or revoked."),
      column("actor_role", "text", false, "audit", ["not_null", "check"], "Admin or trusted server actor."),
      column("actor_user_id", "uuid", true, "audit", ["foreign_key"], "Authenticated admin when applicable."),
      column("previous_status", "text", true, "audit", [], "State before the action."),
      column("next_status", "text", true, "audit", [], "State after the action."),
      column("before_snapshot", "jsonb", true, "audit", [], "Redacted previous record snapshot."),
      column("after_snapshot", "jsonb", true, "audit", [], "Redacted next record snapshot."),
      column("reason", "text", false, "audit", ["not_null"], "Human-readable reason."),
      column("correlation_id", "text", false, "audit", ["not_null", "index"], "Request correlation id."),
      column("idempotency_key", "text", false, "audit", ["not_null", "unique"], "Append idempotency key."),
      column("created_at", "timestamptz", false, "audit", ["not_null", "default", "index"], "Immutable audit timestamp."),
    ],
    indexes: [
      index(
        "event_ticket_commercial_audit_channel_idx",
        ["channel_id", "created_at"],
        false,
        "Chronological channel audit.",
      ),
      index(
        "event_ticket_commercial_audit_event_idx",
        ["canonical_event_id", "created_at"],
        false,
        "Commercial history for an event.",
      ),
    ],
    invariants: [
      "Rows are append-only and cannot be updated or deleted.",
      "Secret tracking values and unnecessary personal data are redacted from snapshots.",
      "Every channel lifecycle mutation must append an audit row in the same controlled operation.",
    ],
  };

const CLICK_ATTRIBUTION_BLUEPRINT: EventTicketCommercialPersistenceEntityBlueprint =
  {
    entityKey: "ticket_click_attribution",
    proposedStorageName: "event_ticket_click_attributions",
    storageKind: "new_table",
    sourceOfTruth: true,
    purpose:
      "Record auditable commercial exits without claiming that a sale occurred.",
    canonicalEventIdRequired: true,
    statusValues: null,
    readPolicy: "service_only",
    writePolicy: "system_redirect_route_only",
    deletePolicy: "retain_and_anonymize",
    columns: [
      column("click_id", "uuid", false, "primary_identity", ["primary_key"], "Click attribution id."),
      column("canonical_event_id", "uuid", false, "canonical_identity", ["not_null", "foreign_key", "index"], "Canonical event."),
      column("channel_id", "uuid", false, "commercial_tracking", ["not_null", "foreign_key", "index"], "Resolved active channel."),
      column("user_id", "uuid", true, "privacy", ["foreign_key", "index"], "Authenticated Clubber when available."),
      column("session_attribution_hash", "text", true, "privacy", ["index"], "Pseudonymous short-lived session attribution."),
      column("redirect_token_hash", "text", false, "commercial_tracking", ["not_null", "unique"], "One-way redirect token fingerprint."),
      column("campaign_id", "text", true, "commercial_tracking", ["index"], "Campaign identifier."),
      column("destination_url_hash", "text", false, "commercial_tracking", ["not_null"], "Fingerprint of the resolved destination."),
      column("consent_basis", "text", false, "privacy", ["not_null", "check"], "Consent or legitimate-interest basis."),
      column("clicked_at", "timestamptz", false, "audit", ["not_null", "default", "index"], "Commercial exit timestamp."),
      column("retention_expires_at", "timestamptz", false, "privacy", ["not_null", "index"], "Mandatory retention limit."),
      column("metadata", "jsonb", false, "content", ["not_null", "default"], "Minimal safe attribution metadata."),
    ],
    indexes: [
      index(
        "event_ticket_click_attributions_channel_time_idx",
        ["channel_id", "clicked_at"],
        false,
        "Channel click reporting.",
      ),
      index(
        "event_ticket_click_attributions_user_time_idx",
        ["user_id", "clicked_at"],
        false,
        "User journey when consent and authentication permit.",
      ),
    ],
    invariants: [
      "A click is never reported as a purchase or confirmed revenue.",
      "Raw IP addresses are not stored.",
      "The redirect route records the exact resolved channel before redirecting.",
      "Retention expiry is mandatory.",
    ],
  };

const PURCHASE_SIGNAL_BLUEPRINT: EventTicketCommercialPersistenceEntityBlueprint =
  {
    entityKey: "ticket_purchase_signal",
    proposedStorageName: "event_ticket_purchase_signals",
    storageKind: "new_table",
    sourceOfTruth: true,
    purpose:
      "Separate interest, self-declaration, attributed conversion and confirmed conversion evidence.",
    canonicalEventIdRequired: true,
    statusValues: EVENT_TICKET_PURCHASE_SIGNAL_TYPES,
    readPolicy: "owner_and_admin",
    writePolicy: "trusted_integration_route_only",
    deletePolicy: "retain_and_anonymize",
    columns: [
      column("signal_id", "uuid", false, "primary_identity", ["primary_key"], "Purchase-signal id."),
      column("canonical_event_id", "uuid", false, "canonical_identity", ["not_null", "foreign_key", "index"], "Canonical event."),
      column("channel_id", "uuid", true, "commercial_tracking", ["foreign_key", "index"], "Commercial channel when attribution exists."),
      column("user_id", "uuid", true, "privacy", ["foreign_key", "index"], "Clubber when known."),
      column("signal_type", "text", false, "status", ["not_null", "check", "index"], "Interest, click, self-declared, attributed or confirmed."),
      column("evidence_source", "text", false, "commercial_governance", ["not_null", "check", "index"], "Clubber action, redirect, report, postback, webhook or API."),
      column("trusted_evidence_verified", "boolean", false, "commercial_governance", ["not_null", "default", "check"], "Whether evidence passed trusted verification."),
      column("external_transaction_reference_hash", "text", true, "privacy", ["index"], "One-way transaction reference for deduplication."),
      column("attribution_campaign_id", "text", true, "commercial_tracking", ["index"], "Campaign attribution."),
      column("gross_amount_minor", "integer", true, "commercial_finance", ["check"], "Gross transaction amount in minor units when confirmed."),
      column("commission_amount_minor", "integer", true, "commercial_finance", ["check"], "Recognized commission in minor units when confirmed."),
      column("currency", "text", true, "commercial_finance", ["check"], "ISO 4217 currency."),
      column("recorded_at", "timestamptz", false, "audit", ["not_null", "default", "index"], "Signal timestamp."),
      column("confirmed_at", "timestamptz", true, "audit", [], "Confirmation timestamp."),
      column("confirmed_by_actor_role", "text", true, "authorization", ["check"], "Trusted integration or admin."),
      column("idempotency_key", "text", false, "audit", ["not_null", "unique"], "Signal idempotency key."),
      column("retention_expires_at", "timestamptz", true, "privacy", ["index"], "Retention or anonymization deadline."),
      column("metadata", "jsonb", false, "content", ["not_null", "default"], "Redacted evidence summary."),
    ],
    indexes: [
      index(
        "event_ticket_purchase_signals_event_type_idx",
        ["canonical_event_id", "signal_type", "recorded_at"],
        false,
        "Event journey and conversion reporting.",
      ),
      index(
        "event_ticket_purchase_signals_transaction_uq",
        ["external_transaction_reference_hash"],
        true,
        "Prevent duplicate trusted conversions.",
        "external_transaction_reference_hash is not null",
      ),
    ],
    invariants: [
      "self_declared_purchase never sets trusted_evidence_verified to true by itself.",
      "confirmed_conversion requires trusted evidence and an external transaction reference hash.",
      "Only confirmed_conversion may be reported as confirmed revenue.",
      "Clubbers may create only interest and self-declared signals through their authenticated route.",
    ],
  };

const OFFICIAL_COMMUNICATION_BLUEPRINT: EventTicketCommercialPersistenceEntityBlueprint =
  {
    entityKey: "partner_official_communication",
    proposedStorageName: "partner_official_communications",
    storageKind: "new_table",
    sourceOfTruth: true,
    purpose:
      "Persist official partner communications independently from ticket-channel authorization.",
    canonicalEventIdRequired: false,
    statusValues: PARTNER_OFFICIAL_COMMUNICATION_STATUSES,
    readPolicy: "resolved_public_projection_only",
    writePolicy: "partner_submission_route_only",
    deletePolicy: "retain_and_anonymize",
    columns: [
      column("communication_id", "uuid", false, "primary_identity", ["primary_key"], "Communication id."),
      column("partner_id", "uuid", false, "partner_identity", ["not_null", "index"], "Verified partner."),
      column("canonical_event_id", "uuid", true, "canonical_identity", ["foreign_key", "index"], "Related event when applicable."),
      column("commercial_channel_id", "uuid", true, "commercial_governance", ["foreign_key"], "Required only for ticket-commercial communication types."),
      column("communication_type", "text", false, "content", ["not_null", "check", "index"], "Lineup, schedule, presale, discount, music, giveaway or community content."),
      column("communication_status", "text", false, "status", ["not_null", "default", "check", "index"], "Editorial lifecycle."),
      column("title", "text", false, "content", ["not_null"], "Public title."),
      column("body", "text", false, "content", ["not_null"], "Public content."),
      column("benefit_code", "text", true, "commercial_tracking", [], "Optional admin-approved public code."),
      column("starts_at", "timestamptz", true, "content", ["index"], "Publication start."),
      column("ends_at", "timestamptz", true, "content", ["index"], "Publication end."),
      column("submitted_by_user_id", "uuid", false, "partner_identity", ["not_null", "foreign_key"], "Submitting partner user."),
      column("approved_by_admin_user_id", "uuid", true, "authorization", ["foreign_key"], "Editorial approver."),
      column("published_by_admin_user_id", "uuid", true, "authorization", ["foreign_key"], "Publishing admin."),
      column("created_at", "timestamptz", false, "audit", ["not_null", "default"], "Creation timestamp."),
      column("updated_at", "timestamptz", false, "audit", ["not_null", "default"], "Last update."),
      column("metadata", "jsonb", false, "content", ["not_null", "default"], "Safe communication metadata."),
    ],
    indexes: [
      index(
        "partner_official_communications_public_idx",
        ["communication_status", "starts_at", "ends_at"],
        false,
        "Resolve currently published communications.",
      ),
      index(
        "partner_official_communications_partner_idx",
        ["partner_id", "created_at"],
        false,
        "Partner communication history.",
      ),
    ],
    invariants: [
      "Official communication approval does not grant ticket-commercial authorization.",
      "Partners submit; admins review and publish.",
      "Ticket discount, presale, lot-change and promotional-code communications require an active commercial channel.",
      "Editorial communications may exist without a ticket partnership when the partner is verified.",
    ],
  };

const PUBLIC_RESOLVER_BLUEPRINT: EventTicketCommercialPersistenceEntityBlueprint =
  {
    entityKey: "public_ticket_resolver_projection",
    proposedStorageName: "resolved_public_event_ticket_channel",
    storageKind: "derived_projection",
    sourceOfTruth: false,
    purpose:
      "Expose only the resolved public action without leaking raw commercial, authorization or tracking records.",
    canonicalEventIdRequired: true,
    statusValues: null,
    readPolicy: "resolved_public_projection_only",
    writePolicy: "no_write_projection",
    deletePolicy: "derived_no_delete",
    columns: [
      column("canonical_event_id", "uuid", false, "canonical_identity", ["not_null", "unique"], "Canonical event."),
      column("action_kind", "text", false, "public_projection", ["not_null", "check"], "buy_ticket, view_official_event or unavailable."),
      column("action_label", "text", false, "public_projection", ["not_null"], "Public Portuguese label."),
      column("resolved_url", "text", true, "public_projection", [], "Only the safe resolved public destination."),
      column("monetized", "boolean", false, "public_projection", ["not_null"], "Whether the action uses a commercial channel."),
      column("disclosure_required", "boolean", false, "public_projection", ["not_null"], "Commercial disclosure flag."),
      column("disclosure_text", "text", true, "public_projection", [], "Public disclosure."),
      column("commercial_channel_id", "uuid", true, "public_projection", [], "Opaque channel reference for redirect attribution."),
      column("decision_version", "text", false, "audit", ["not_null"], "Resolver contract version."),
      column("resolved_at", "timestamptz", false, "audit", ["not_null"], "Resolution timestamp."),
    ],
    indexes: [],
    invariants: [
      "The projection never exposes commission, authorization references or secret tracking keys.",
      "The projection never reads legacy technical ticket_url as a monetized source.",
      "An active valid commercial channel has priority over a validated official reference.",
      "If no safe exit exists, the projection returns Canal de vendas a confirmar.",
    ],
  };

export const EVENT_TICKET_COMMERCIAL_PERSISTENCE_ENTITY_BLUEPRINTS: readonly EventTicketCommercialPersistenceEntityBlueprint[] =
  [
    OFFICIAL_EVENT_REFERENCE_BLUEPRINT,
    PARTNERSHIP_REQUEST_BLUEPRINT,
    COMMERCIAL_CHANNEL_BLUEPRINT,
    COMMERCIAL_AUDIT_BLUEPRINT,
    CLICK_ATTRIBUTION_BLUEPRINT,
    PURCHASE_SIGNAL_BLUEPRINT,
    OFFICIAL_COMMUNICATION_BLUEPRINT,
    PUBLIC_RESOLVER_BLUEPRINT,
  ] as const;

export const EVENT_TICKET_COMMERCIAL_PERSISTENCE_RELATIONSHIPS: readonly EventTicketCommercialPersistenceRelationship[] =
  [
    {
      relationshipKey: "official_reference_canonical_event_fk",
      fromEntity: "official_event_reference",
      fromColumn: "canonical_event_id",
      toStorageName: "canonical_events",
      toColumn: "id",
      required: true,
      deleteBehavior: "cascade",
      purpose: "Attach source provenance to the canonical event.",
    },
    {
      relationshipKey: "partnership_request_canonical_event_fk",
      fromEntity: "ticket_partnership_request",
      fromColumn: "canonical_event_id",
      toStorageName: "canonical_events",
      toColumn: "id",
      required: false,
      deleteBehavior: "set_null",
      purpose: "Allow submission before matching, but require canonical identity before approval.",
    },
    {
      relationshipKey: "commercial_channel_canonical_event_fk",
      fromEntity: "ticket_commercial_channel",
      fromColumn: "canonical_event_id",
      toStorageName: "canonical_events",
      toColumn: "id",
      required: true,
      deleteBehavior: "restrict",
      purpose: "Canonical identity is mandatory for monetized activation.",
    },
    {
      relationshipKey: "commercial_channel_request_fk",
      fromEntity: "ticket_commercial_channel",
      fromColumn: "source_request_id",
      toStorageName: "event_ticket_partnership_requests",
      toColumn: "request_id",
      required: false,
      deleteBehavior: "set_null",
      purpose: "Preserve request origin without granting lifecycle control.",
    },
    {
      relationshipKey: "commercial_audit_channel_fk",
      fromEntity: "ticket_commercial_audit_log",
      fromColumn: "channel_id",
      toStorageName: "event_ticket_commercial_channels",
      toColumn: "channel_id",
      required: false,
      deleteBehavior: "restrict",
      purpose: "Immutable channel history.",
    },
    {
      relationshipKey: "click_channel_fk",
      fromEntity: "ticket_click_attribution",
      fromColumn: "channel_id",
      toStorageName: "event_ticket_commercial_channels",
      toColumn: "channel_id",
      required: true,
      deleteBehavior: "restrict",
      purpose: "Attribute each commercial exit to the resolved channel.",
    },
    {
      relationshipKey: "purchase_signal_channel_fk",
      fromEntity: "ticket_purchase_signal",
      fromColumn: "channel_id",
      toStorageName: "event_ticket_commercial_channels",
      toColumn: "channel_id",
      required: false,
      deleteBehavior: "set_null",
      purpose: "Preserve conversion attribution when a channel exists.",
    },
    {
      relationshipKey: "communication_channel_fk",
      fromEntity: "partner_official_communication",
      fromColumn: "commercial_channel_id",
      toStorageName: "event_ticket_commercial_channels",
      toColumn: "channel_id",
      required: false,
      deleteBehavior: "set_null",
      purpose: "Bind ticket-commercial communication to an active channel.",
    },
  ] as const;

export type EventTicketCommercialPersistencePlanState =
  | "persistence_contract_ready"
  | "blocked_real_database_write_requested"
  | "blocked_real_migration_requested"
  | "blocked_public_activation_requested"
  | "blocked_direct_table_access"
  | "blocked_actor_or_path_not_allowed"
  | "blocked_missing_canonical_event"
  | "blocked_invalid_status_ownership"
  | "blocked_untrusted_conversion_evidence"
  | "blocked_legacy_ticket_url_requested"
  | "blocked_missing_idempotency_identity";

export type EventTicketCommercialPersistencePlanLane =
  | "contract_plan_lane"
  | "database_write_safety_block_lane"
  | "migration_safety_block_lane"
  | "public_activation_safety_block_lane"
  | "direct_access_safety_block_lane"
  | "permission_safety_block_lane"
  | "canonical_identity_safety_block_lane"
  | "status_governance_safety_block_lane"
  | "conversion_evidence_safety_block_lane"
  | "legacy_ticket_url_safety_block_lane"
  | "idempotency_safety_block_lane";

export type EventTicketCommercialPersistencePlanInput = {
  entityKey: EventTicketCommercialPersistenceEntityKey;
  action: EventTicketCommercialPersistenceAction;
  actorRole: EventTicketCommercialPersistenceActorRole;
  writePath: EventTicketCommercialPersistenceWritePath;
  canonicalEventId?: string | null;
  recordIdentity?: string | null;
  status?: string | null;
  signalType?: EventTicketPurchaseSignalType | string | null;
  evidenceSource?: EventTicketPurchaseEvidenceSource | string | null;
  trustedEvidenceVerified?: boolean | null;
  externalTransactionReferenceHash?: string | null;
  useLegacyTechnicalTicketUrl?: boolean | null;
  requestRealDatabaseWrite?: boolean | null;
  requestRealMigration?: boolean | null;
  requestPublicActivation?: boolean | null;
};

export type EventTicketCommercialPersistencePlan = {
  ok: boolean;
  state: EventTicketCommercialPersistencePlanState;
  lane: EventTicketCommercialPersistencePlanLane;
  entityKey: EventTicketCommercialPersistenceEntityKey;
  proposedStorageName: string;
  action: EventTicketCommercialPersistenceAction;
  actorRole: EventTicketCommercialPersistenceActorRole;
  writePath: EventTicketCommercialPersistenceWritePath;
  canonicalEventId: string | null;
  idempotencyKey: string | null;
  plannedOnly: true;
  blockingReasons: string[];
  safetyFlags: string[];
  database_write_performed: false;
  supabase_operation_performed: false;
  migration_file_created: false;
  public_ticket_link_activated: false;
};

export type EventTicketCommercialPersistenceSelfTestResult = {
  ok: boolean;
  version: typeof EVENT_TICKET_COMMERCIAL_PERSISTENCE_CONTRACT_VERSION;
  checks: Record<string, boolean>;
  failedChecks: string[];
  entityCount: number;
  relationshipCount: number;
  legacyCompatibilityRuleCount: number;
  database_write_performed: false;
  migration_performed: false;
  public_ticket_link_activated: false;
};

const ACTION_PERMISSION_MATRIX: Record<
  EventTicketCommercialPersistenceAction,
  readonly EventTicketCommercialPersistenceActorRole[]
> = {
  plan_official_reference_candidate: [
    "useclubbers_admin",
    "partner_user",
    "automation",
  ],
  plan_official_reference_validation: [
    "useclubbers_admin",
    "automation",
  ],
  plan_partnership_request_submission: [
    "useclubbers_admin",
    "partner_user",
  ],
  plan_partnership_request_review: ["useclubbers_admin"],
  plan_commercial_channel_create: ["useclubbers_admin"],
  plan_commercial_channel_transition: ["useclubbers_admin"],
  plan_commercial_audit_append: ["useclubbers_admin", "system"],
  plan_click_attribution_record: ["system"],
  plan_purchase_signal_record: [
    "useclubbers_admin",
    "system",
    "clubber_user",
    "trusted_ticketing_integration",
  ],
  plan_official_communication_submission: [
    "useclubbers_admin",
    "partner_user",
  ],
  plan_official_communication_review: ["useclubbers_admin"],
  plan_public_ticket_projection_read: ["system"],
  plan_legacy_data_migration: ["useclubbers_admin"],
};

const ACTION_WRITE_PATH_MATRIX: Record<
  EventTicketCommercialPersistenceAction,
  readonly EventTicketCommercialPersistenceWritePath[]
> = {
  plan_official_reference_candidate: [
    "admin_server_route",
    "partner_submission_route",
    "automation_ingestion_service",
  ],
  plan_official_reference_validation: [
    "admin_server_route",
    "automation_ingestion_service",
  ],
  plan_partnership_request_submission: [
    "admin_server_route",
    "partner_submission_route",
  ],
  plan_partnership_request_review: ["admin_server_route"],
  plan_commercial_channel_create: ["admin_server_route"],
  plan_commercial_channel_transition: ["admin_server_route"],
  plan_commercial_audit_append: ["admin_server_route"],
  plan_click_attribution_record: ["system_redirect_route"],
  plan_purchase_signal_record: [
    "admin_server_route",
    "clubber_authenticated_route",
    "trusted_integration_route",
  ],
  plan_official_communication_submission: [
    "admin_server_route",
    "partner_submission_route",
  ],
  plan_official_communication_review: ["admin_server_route"],
  plan_public_ticket_projection_read: ["public_resolver_read"],
  plan_legacy_data_migration: ["admin_server_route"],
};

const CANONICAL_EVENT_REQUIRED_ENTITIES =
  new Set<EventTicketCommercialPersistenceEntityKey>([
    "official_event_reference",
    "ticket_commercial_channel",
    "ticket_commercial_audit_log",
    "ticket_click_attribution",
    "ticket_purchase_signal",
    "public_ticket_resolver_projection",
  ]);

const TRUSTED_CONFIRMED_CONVERSION_EVIDENCE =
  new Set<EventTicketPurchaseEvidenceSource>([
    "partner_report",
    "postback",
    "webhook",
    "partner_api",
  ]);

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function stableHash(value: string): string {
  let hash = 2166136261;

  for (let indexValue = 0; indexValue < value.length; indexValue += 1) {
    hash ^= value.charCodeAt(indexValue);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function buildIdempotencyKey(input: {
  entityKey: EventTicketCommercialPersistenceEntityKey;
  action: EventTicketCommercialPersistenceAction;
  canonicalEventId: string | null;
  recordIdentity: string | null;
}): string | null {
  const identityParts = [
    input.entityKey,
    input.action,
    input.canonicalEventId ?? "",
    input.recordIdentity ?? "",
  ];

  if (!input.canonicalEventId && !input.recordIdentity) {
    return null;
  }

  return `event-ticket:${input.entityKey}:${stableHash(identityParts.join("|"))}`;
}

export function getEventTicketCommercialPersistenceEntityBlueprint(
  entityKey: EventTicketCommercialPersistenceEntityKey,
): EventTicketCommercialPersistenceEntityBlueprint {
  const blueprint = EVENT_TICKET_COMMERCIAL_PERSISTENCE_ENTITY_BLUEPRINTS.find(
    (candidate) => candidate.entityKey === entityKey,
  );

  if (!blueprint) {
    throw new Error(`Persistence blueprint not found: ${entityKey}`);
  }

  return blueprint;
}

export function canActorPlanEventTicketCommercialPersistenceAction(
  actorRole: EventTicketCommercialPersistenceActorRole,
  action: EventTicketCommercialPersistenceAction,
  writePath: EventTicketCommercialPersistenceWritePath,
): boolean {
  if (writePath === "direct_table_access") {
    return false;
  }

  return (
    ACTION_PERMISSION_MATRIX[action].includes(actorRole) &&
    ACTION_WRITE_PATH_MATRIX[action].includes(writePath)
  );
}

export function buildEventTicketCommercialPersistencePlan(
  input: EventTicketCommercialPersistencePlanInput,
): EventTicketCommercialPersistencePlan {
  const blueprint = getEventTicketCommercialPersistenceEntityBlueprint(
    input.entityKey,
  );

  const canonicalEventId = normalizeText(input.canonicalEventId) || null;
  const recordIdentity = normalizeText(input.recordIdentity) || null;
  const status = normalizeText(input.status).toLowerCase();
  const signalType = normalizeText(input.signalType).toLowerCase();
  const evidenceSource = normalizeText(input.evidenceSource).toLowerCase();
  const externalTransactionReferenceHash =
    normalizeText(input.externalTransactionReferenceHash) || null;

  const blockingReasons: string[] = [];
  const safetyFlags: string[] = [
    "persistence_contract_only",
    "database_write_not_performed",
    "supabase_operation_not_performed",
    "migration_file_not_created",
    "public_ticket_link_not_activated",
    "direct_table_access_denied",
    "legacy_ticket_url_not_used",
    "admin_commercial_control_preserved",
  ];

  if (input.requestRealDatabaseWrite === true) {
    blockingReasons.push(
      "Real database write is not allowed in the persistence-contract foundation.",
    );
    safetyFlags.push("real_database_write_requested_but_blocked");
  }

  if (input.requestRealMigration === true) {
    blockingReasons.push(
      "Real migration is not allowed in the persistence-contract foundation.",
    );
    safetyFlags.push("real_migration_requested_but_blocked");
  }

  if (input.requestPublicActivation === true) {
    blockingReasons.push(
      "Public ticket-link activation is not allowed in the persistence-contract foundation.",
    );
    safetyFlags.push("public_activation_requested_but_blocked");
  }

  if (input.writePath === "direct_table_access") {
    blockingReasons.push(
      "Direct table access is denied; every write must pass through its controlled server path.",
    );
    safetyFlags.push("direct_table_access_requested_but_blocked");
  }

  if (
    !canActorPlanEventTicketCommercialPersistenceAction(
      input.actorRole,
      input.action,
      input.writePath,
    )
  ) {
    blockingReasons.push(
      "Actor role or controlled write path is not allowed for this persistence action.",
    );
    safetyFlags.push("actor_or_path_not_allowed");
  }

  if (
    CANONICAL_EVENT_REQUIRED_ENTITIES.has(input.entityKey) &&
    !canonicalEventId
  ) {
    blockingReasons.push(
      "canonical_event_id is mandatory for this persistence entity.",
    );
    safetyFlags.push("canonical_event_identity_missing");
  }

  if (input.useLegacyTechnicalTicketUrl === true) {
    blockingReasons.push(
      "Legacy technical ticket_url cannot be used as the monetized public destination.",
    );
    safetyFlags.push("legacy_ticket_url_requested_but_blocked");
  }

  if (
    input.entityKey === "ticket_partnership_request" &&
    ["active", "paused", "expired", "revoked"].includes(status)
  ) {
    blockingReasons.push(
      "Commercial-channel lifecycle status cannot be persisted on a partnership request.",
    );
    safetyFlags.push("request_and_channel_statuses_separated");
  }

  if (
    input.entityKey === "ticket_commercial_channel" &&
    input.actorRole !== "useclubbers_admin"
  ) {
    blockingReasons.push(
      "Only useclubbers_admin may persist the definitive commercial channel lifecycle.",
    );
    safetyFlags.push("partner_commercial_activation_blocked");
  }

  if (
    input.entityKey === "ticket_purchase_signal" &&
    signalType === "confirmed_conversion"
  ) {
    const normalizedEvidence =
      EVENT_TICKET_PURCHASE_EVIDENCE_SOURCES.includes(
        evidenceSource as EventTicketPurchaseEvidenceSource,
      )
        ? (evidenceSource as EventTicketPurchaseEvidenceSource)
        : null;

    if (
      input.trustedEvidenceVerified !== true ||
      !normalizedEvidence ||
      !TRUSTED_CONFIRMED_CONVERSION_EVIDENCE.has(normalizedEvidence) ||
      !externalTransactionReferenceHash
    ) {
      blockingReasons.push(
        "confirmed_conversion requires verified trusted evidence and an external transaction reference hash.",
      );
      safetyFlags.push("untrusted_confirmed_conversion_blocked");
    }
  }

  if (
    input.entityKey === "ticket_purchase_signal" &&
    signalType === "self_declared_purchase" &&
    input.trustedEvidenceVerified === true
  ) {
    blockingReasons.push(
      "self_declared_purchase cannot be persisted as trusted confirmed evidence.",
    );
    safetyFlags.push("self_declared_purchase_not_confirmed");
  }

  const idempotencyKey = buildIdempotencyKey({
    entityKey: input.entityKey,
    action: input.action,
    canonicalEventId,
    recordIdentity,
  });

  if (!idempotencyKey && input.action !== "plan_public_ticket_projection_read") {
    blockingReasons.push(
      "A canonical or record identity is required to create the persistence idempotency key.",
    );
    safetyFlags.push("idempotency_identity_missing");
  } else if (idempotencyKey) {
    safetyFlags.push("idempotency_key_planned");
  }

  let state: EventTicketCommercialPersistencePlanState =
    "persistence_contract_ready";
  let lane: EventTicketCommercialPersistencePlanLane =
    "contract_plan_lane";

  if (blockingReasons.length > 0) {
    if (input.requestRealDatabaseWrite === true) {
      state = "blocked_real_database_write_requested";
      lane = "database_write_safety_block_lane";
    } else if (input.requestRealMigration === true) {
      state = "blocked_real_migration_requested";
      lane = "migration_safety_block_lane";
    } else if (input.requestPublicActivation === true) {
      state = "blocked_public_activation_requested";
      lane = "public_activation_safety_block_lane";
    } else if (input.writePath === "direct_table_access") {
      state = "blocked_direct_table_access";
      lane = "direct_access_safety_block_lane";
    } else if (input.useLegacyTechnicalTicketUrl === true) {
      state = "blocked_legacy_ticket_url_requested";
      lane = "legacy_ticket_url_safety_block_lane";
    } else if (
      CANONICAL_EVENT_REQUIRED_ENTITIES.has(input.entityKey) &&
      !canonicalEventId
    ) {
      state = "blocked_missing_canonical_event";
      lane = "canonical_identity_safety_block_lane";
    } else if (
      input.entityKey === "ticket_partnership_request" &&
      ["active", "paused", "expired", "revoked"].includes(status)
    ) {
      state = "blocked_invalid_status_ownership";
      lane = "status_governance_safety_block_lane";
    } else if (
      input.entityKey === "ticket_purchase_signal" &&
      (signalType === "confirmed_conversion" ||
        signalType === "self_declared_purchase")
    ) {
      state = "blocked_untrusted_conversion_evidence";
      lane = "conversion_evidence_safety_block_lane";
    } else if (!idempotencyKey) {
      state = "blocked_missing_idempotency_identity";
      lane = "idempotency_safety_block_lane";
    } else {
      state = "blocked_actor_or_path_not_allowed";
      lane = "permission_safety_block_lane";
    }
  }

  return {
    ok: blockingReasons.length === 0,
    state,
    lane,
    entityKey: input.entityKey,
    proposedStorageName: blueprint.proposedStorageName,
    action: input.action,
    actorRole: input.actorRole,
    writePath: input.writePath,
    canonicalEventId,
    idempotencyKey,
    plannedOnly: true,
    blockingReasons,
    safetyFlags: Array.from(new Set(safetyFlags)),
    database_write_performed: false,
    supabase_operation_performed: false,
    migration_file_created: false,
    public_ticket_link_activated: false,
  };
}

export const EVENT_TICKET_COMMERCIAL_PUBLIC_PROJECTION_CONTRACT = {
  sourcePriority: [
    "active_valid_admin_controlled_commercial_channel",
    "validated_official_event_reference",
    "ticket_channel_unavailable",
  ],
  publicFields: [
    "canonical_event_id",
    "action_kind",
    "action_label",
    "resolved_url",
    "monetized",
    "disclosure_required",
    "disclosure_text",
    "commercial_channel_id",
    "decision_version",
    "resolved_at",
  ],
  forbiddenPublicFields: [
    "commission_percent",
    "commission_fixed_minor",
    "authorization_reference",
    "tracking_key_encrypted",
    "commercial_contact_email",
    "commercial_contact_whatsapp",
    "admin_notes",
    "before_snapshot",
    "after_snapshot",
  ],
  legacyTechnicalTicketUrlUsed: false,
  rawCommercialTablePublicSelectAllowed: false,
} as const;

export const EVENT_TICKET_COMMERCIAL_PERSISTENCE_RLS_REQUIREMENTS = {
  defaultDenyRawCommercialTables: true,
  anonDirectSelectCommercialChannel: false,
  authenticatedDirectSelectCommercialChannel: false,
  partnerDirectInsertCommercialChannel: false,
  partnerDirectUpdateCommercialChannel: false,
  automationDirectWriteCommercialChannel: false,
  clubberDirectWriteConfirmedConversion: false,
  partnerMaySubmitOwnRequestThroughControlledRoute: true,
  clubberMayWriteOwnInterestOrSelfDeclarationThroughControlledRoute: true,
  trustedIntegrationMayWriteVerifiedConversionThroughSignedRoute: true,
  publicMayReadResolvedProjection: true,
  auditLogAppendOnly: true,
} as const;

export function runEventTicketCommercialPersistenceContractSelfTest(): EventTicketCommercialPersistenceSelfTestResult {
  const blueprintByKey = new Map(
    EVENT_TICKET_COMMERCIAL_PERSISTENCE_ENTITY_BLUEPRINTS.map((blueprint) => [
      blueprint.entityKey,
      blueprint,
    ]),
  );

  const partnerChannelPlan = buildEventTicketCommercialPersistencePlan({
    entityKey: "ticket_commercial_channel",
    action: "plan_commercial_channel_create",
    actorRole: "partner_user",
    writePath: "partner_submission_route",
    canonicalEventId: "event-1",
    recordIdentity: "partner-channel-attempt",
  });

  const adminChannelPlan = buildEventTicketCommercialPersistencePlan({
    entityKey: "ticket_commercial_channel",
    action: "plan_commercial_channel_create",
    actorRole: "useclubbers_admin",
    writePath: "admin_server_route",
    canonicalEventId: "event-1",
    recordIdentity: "admin-channel-plan",
  });

  const legacyTicketPlan = buildEventTicketCommercialPersistencePlan({
    entityKey: "ticket_commercial_channel",
    action: "plan_commercial_channel_create",
    actorRole: "useclubbers_admin",
    writePath: "admin_server_route",
    canonicalEventId: "event-1",
    recordIdentity: "legacy-ticket-url",
    useLegacyTechnicalTicketUrl: true,
  });

  const invalidRequestStatusPlan = buildEventTicketCommercialPersistencePlan({
    entityKey: "ticket_partnership_request",
    action: "plan_partnership_request_review",
    actorRole: "useclubbers_admin",
    writePath: "admin_server_route",
    canonicalEventId: "event-1",
    recordIdentity: "request-1",
    status: "active",
  });

  const selfDeclaredTrustedPlan = buildEventTicketCommercialPersistencePlan({
    entityKey: "ticket_purchase_signal",
    action: "plan_purchase_signal_record",
    actorRole: "clubber_user",
    writePath: "clubber_authenticated_route",
    canonicalEventId: "event-1",
    recordIdentity: "signal-1",
    signalType: "self_declared_purchase",
    evidenceSource: "clubber_action",
    trustedEvidenceVerified: true,
  });

  const confirmedWithoutEvidencePlan =
    buildEventTicketCommercialPersistencePlan({
      entityKey: "ticket_purchase_signal",
      action: "plan_purchase_signal_record",
      actorRole: "trusted_ticketing_integration",
      writePath: "trusted_integration_route",
      canonicalEventId: "event-1",
      recordIdentity: "signal-2",
      signalType: "confirmed_conversion",
      evidenceSource: "clubber_action",
      trustedEvidenceVerified: false,
    });

  const confirmedTrustedPlan = buildEventTicketCommercialPersistencePlan({
    entityKey: "ticket_purchase_signal",
    action: "plan_purchase_signal_record",
    actorRole: "trusted_ticketing_integration",
    writePath: "trusted_integration_route",
    canonicalEventId: "event-1",
    recordIdentity: "signal-3",
    signalType: "confirmed_conversion",
    evidenceSource: "webhook",
    trustedEvidenceVerified: true,
    externalTransactionReferenceHash: "transaction-hash",
  });

  const directAccessPlan = buildEventTicketCommercialPersistencePlan({
    entityKey: "ticket_partnership_request",
    action: "plan_partnership_request_submission",
    actorRole: "partner_user",
    writePath: "direct_table_access",
    recordIdentity: "request-direct",
  });

  const realMigrationPlan = buildEventTicketCommercialPersistencePlan({
    entityKey: "ticket_commercial_channel",
    action: "plan_legacy_data_migration",
    actorRole: "useclubbers_admin",
    writePath: "admin_server_route",
    canonicalEventId: "event-1",
    recordIdentity: "migration-attempt",
    requestRealMigration: true,
  });

  const realWritePlan = buildEventTicketCommercialPersistencePlan({
    entityKey: "ticket_commercial_channel",
    action: "plan_commercial_channel_create",
    actorRole: "useclubbers_admin",
    writePath: "admin_server_route",
    canonicalEventId: "event-1",
    recordIdentity: "write-attempt",
    requestRealDatabaseWrite: true,
  });

  const publicActivationPlan = buildEventTicketCommercialPersistencePlan({
    entityKey: "public_ticket_resolver_projection",
    action: "plan_public_ticket_projection_read",
    actorRole: "system",
    writePath: "public_resolver_read",
    canonicalEventId: "event-1",
    recordIdentity: "resolver-attempt",
    requestPublicActivation: true,
  });

  const channelBlueprint = blueprintByKey.get("ticket_commercial_channel");
  const requestBlueprint = blueprintByKey.get("ticket_partnership_request");
  const auditBlueprint = blueprintByKey.get("ticket_commercial_audit_log");
  const clickBlueprint = blueprintByKey.get("ticket_click_attribution");
  const signalBlueprint = blueprintByKey.get("ticket_purchase_signal");
  const communicationBlueprint = blueprintByKey.get(
    "partner_official_communication",
  );
  const resolverBlueprint = blueprintByKey.get(
    "public_ticket_resolver_projection",
  );

  const allColumnNames = EVENT_TICKET_COMMERCIAL_PERSISTENCE_ENTITY_BLUEPRINTS.flatMap(
    (blueprint) => blueprint.columns.map((candidate) => candidate.columnName),
  );

  const checks: Record<string, boolean> = {
    eight_persistence_entities_defined:
      EVENT_TICKET_COMMERCIAL_PERSISTENCE_ENTITY_BLUEPRINTS.length === 8,
    canonical_source_reused_for_official_reference:
      blueprintByKey.get("official_event_reference")?.proposedStorageName ===
        "canonical_event_sources" &&
      blueprintByKey.get("official_event_reference")?.storageKind ===
        "existing_table_extension",
    request_and_channel_have_independent_statuses:
      requestBlueprint?.statusValues === EVENT_TICKET_PARTNERSHIP_REQUEST_STATUSES &&
      channelBlueprint?.statusValues === EVENT_TICKET_COMMERCIAL_CHANNEL_STATUSES &&
      !EVENT_TICKET_PARTNERSHIP_REQUEST_STATUSES.includes(
        "active" as EventTicketPartnershipRequestStatus,
      ),
    partner_cannot_plan_definitive_channel:
      partnerChannelPlan.ok === false &&
      partnerChannelPlan.state === "blocked_actor_or_path_not_allowed",
    admin_can_plan_definitive_channel:
      adminChannelPlan.ok === true &&
      adminChannelPlan.state === "persistence_contract_ready",
    legacy_ticket_url_blocked:
      legacyTicketPlan.ok === false &&
      legacyTicketPlan.state === "blocked_legacy_ticket_url_requested",
    channel_status_not_stored_on_request:
      invalidRequestStatusPlan.ok === false &&
      invalidRequestStatusPlan.state === "blocked_invalid_status_ownership",
    self_declared_purchase_not_trusted:
      selfDeclaredTrustedPlan.ok === false &&
      selfDeclaredTrustedPlan.state === "blocked_untrusted_conversion_evidence",
    confirmed_conversion_without_trusted_evidence_blocked:
      confirmedWithoutEvidencePlan.ok === false &&
      confirmedWithoutEvidencePlan.state ===
        "blocked_untrusted_conversion_evidence",
    confirmed_conversion_with_trusted_evidence_plannable:
      confirmedTrustedPlan.ok === true &&
      confirmedTrustedPlan.state === "persistence_contract_ready",
    direct_table_access_blocked:
      directAccessPlan.ok === false &&
      directAccessPlan.state === "blocked_direct_table_access",
    real_migration_blocked:
      realMigrationPlan.ok === false &&
      realMigrationPlan.state === "blocked_real_migration_requested",
    real_database_write_blocked:
      realWritePlan.ok === false &&
      realWritePlan.state === "blocked_real_database_write_requested",
    public_activation_blocked:
      publicActivationPlan.ok === false &&
      publicActivationPlan.state === "blocked_public_activation_requested",
    commercial_channel_admin_only:
      channelBlueprint?.writePolicy === "admin_server_route_only" &&
      channelBlueprint?.deletePolicy === "soft_revoke_only",
    audit_log_append_only:
      auditBlueprint?.storageKind === "append_only_table" &&
      auditBlueprint?.writePolicy === "append_only_server_route" &&
      auditBlueprint?.columns.some((candidate) =>
        candidate.constraints.includes("append_only"),
      ) !== true &&
      auditBlueprint?.invariants.some((value) =>
        value.includes("append-only"),
      ) === true,
    click_is_not_purchase:
      clickBlueprint?.invariants.some((value) =>
        value.includes("never reported as a purchase"),
      ) === true,
    no_raw_ip_storage: !allColumnNames.includes("ip_address"),
    purchase_signal_separates_confirmed_revenue:
      signalBlueprint?.invariants.some((value) =>
        value.includes("Only confirmed_conversion"),
      ) === true,
    official_communication_independent:
      communicationBlueprint?.invariants.some((value) =>
        value.includes("does not grant ticket-commercial authorization"),
      ) === true,
    public_projection_hides_commercial_secrets:
      resolverBlueprint?.sourceOfTruth === false &&
      EVENT_TICKET_COMMERCIAL_PUBLIC_PROJECTION_CONTRACT.forbiddenPublicFields.includes(
        "tracking_key_encrypted",
      ),
    public_raw_channel_select_denied:
      EVENT_TICKET_COMMERCIAL_PERSISTENCE_RLS_REQUIREMENTS.anonDirectSelectCommercialChannel ===
        false &&
      EVENT_TICKET_COMMERCIAL_PERSISTENCE_RLS_REQUIREMENTS.authenticatedDirectSelectCommercialChannel ===
        false,
    one_active_public_channel_planned:
      channelBlueprint?.indexes.some(
        (candidate) =>
          candidate.indexKey ===
            "event_ticket_commercial_channels_active_primary_uq" &&
          candidate.unique &&
          candidate.partialCondition === "channel_status = 'active'",
      ) === true,
    idempotency_required:
      adminChannelPlan.idempotencyKey?.startsWith(
        "event-ticket:ticket_commercial_channel:",
      ) === true,
    legacy_partner_request_requires_normalization:
      EVENT_TICKET_COMMERCIAL_PERSISTENCE_LEGACY_COMPATIBILITY.some(
        (rule) =>
          rule.source === "partner_ticket_requests" &&
          rule.migrationTreatment === "migration_source_only" &&
          rule.authoritativeForCommercialPublicButton === false,
      ),
    legacy_ticket_intent_is_self_declared_only:
      EVENT_TICKET_COMMERCIAL_PERSISTENCE_LEGACY_COMPATIBILITY.some(
        (rule) =>
          rule.source === "event_ticket_intents" &&
          rule.migrationTreatment === "self_declared_signal_only",
      ),
    governance_status_contracts_reused:
      OFFICIAL_EVENT_REFERENCE_STATUSES.length === 4 &&
      EVENT_TICKET_COMMERCIAL_CHANNEL_STATUSES.length === 6 &&
      EVENT_TICKET_PURCHASE_SIGNAL_TYPES.length === 5 &&
      PARTNER_OFFICIAL_COMMUNICATION_STATUSES.length === 8,
    contract_performs_no_side_effects:
      EVENT_TICKET_COMMERCIAL_PERSISTENCE_POLICY.contractOnly === true &&
      EVENT_TICKET_COMMERCIAL_PERSISTENCE_POLICY.databaseWritePerformed ===
        false &&
      EVENT_TICKET_COMMERCIAL_PERSISTENCE_POLICY.migrationFileCreated === false &&
      EVENT_TICKET_COMMERCIAL_PERSISTENCE_POLICY.publicTicketLinkActivated ===
        false,
  };

  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([check]) => check);

  return {
    ok: failedChecks.length === 0,
    version: EVENT_TICKET_COMMERCIAL_PERSISTENCE_CONTRACT_VERSION,
    checks,
    failedChecks,
    entityCount:
      EVENT_TICKET_COMMERCIAL_PERSISTENCE_ENTITY_BLUEPRINTS.length,
    relationshipCount:
      EVENT_TICKET_COMMERCIAL_PERSISTENCE_RELATIONSHIPS.length,
    legacyCompatibilityRuleCount:
      EVENT_TICKET_COMMERCIAL_PERSISTENCE_LEGACY_COMPATIBILITY.length,
    database_write_performed: false,
    migration_performed: false,
    public_ticket_link_activated: false,
  };
}
