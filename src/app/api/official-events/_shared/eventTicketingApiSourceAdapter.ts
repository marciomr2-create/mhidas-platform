// src/app/api/official-events/_shared/eventTicketingApiSourceAdapter.ts

import type {
  EventAutomationPolicyDecision,
  EventAutomationPolicyInput,
  EventAutomationSourceAuthorizationStatus,
  EventAutomationSourceRole,
} from "./eventAutomationPolicy";

import { resolveEventAutomationPolicyDecision } from "./eventAutomationPolicy";

export type EventTicketingApiProviderKey =
  | "ingresse"
  | "shotgun"
  | "sympla"
  | "ticketmaster"
  | "eventbrite"
  | "blueticket"
  | "ticket360"
  | "guicheweb"
  | "other_authorized_ticketing_api";

export type EventTicketingApiAuthorizationStatus =
  | "authorized"
  | "pending_authorization"
  | "revoked"
  | "blocked"
  | "unknown";

export type EventTicketingApiAccessMode =
  | "official_api"
  | "partner_api"
  | "private_authorized_feed"
  | "manual_contract_pending"
  | "unknown";

export type EventTicketingApiSourceProfile = {
  provider_key: EventTicketingApiProviderKey;
  provider_name: string;
  authorization_status: EventTicketingApiAuthorizationStatus;
  api_access_mode: EventTicketingApiAccessMode;
  is_official_ticketing_provider: boolean;
  is_partner_verified: boolean;
  is_blocked: boolean;
};

export type EventTicketingApiRawEventSignal = {
  external_event_id?: string | null;
  event_name?: string | null;
  starts_at?: string | null;
  venue_name?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  official_url?: string | null;
  ticket_url?: string | null;
  source_event_url?: string | null;
  is_event_expired?: boolean | null;
};

export type EventTicketingApiSourceAdapterInput = {
  source_profile: EventTicketingApiSourceProfile;
  raw_event_signal: EventTicketingApiRawEventSignal;
  linked_source_count?: number | string | null;
  linked_strong_source_signal_count?: number | string | null;
  linked_official_source_count?: number | string | null;
  linked_verified_venue_source_count?: number | string | null;
  critical_conflict_count?: number | string | null;
  validation_error_count?: number | string | null;
  duplicate_candidate_count?: number | string | null;
};

export type EventTicketingApiSourceAdapterResult = {
  provider_key: EventTicketingApiProviderKey;
  provider_name: string;
  source_authorization_status: EventAutomationSourceAuthorizationStatus;
  source_role: EventAutomationSourceRole;
  policy_input: EventAutomationPolicyInput;
  policy_decision: EventAutomationPolicyDecision;
  external_request_performed: false;
  oauth_token_required_for_sample: false;
  human_event_analysis_required: false;
};

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function toNonNegativeInteger(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.trunc(parsed));
    }
  }

  return 0;
}

function resolveTicketingSourceAuthorizationStatus(
  sourceProfile: EventTicketingApiSourceProfile
): EventAutomationSourceAuthorizationStatus {
  if (
    sourceProfile.is_blocked ||
    sourceProfile.authorization_status === "blocked" ||
    sourceProfile.authorization_status === "revoked"
  ) {
    return "blocked";
  }

  if (
    sourceProfile.authorization_status === "authorized" &&
    sourceProfile.api_access_mode === "official_api" &&
    sourceProfile.is_official_ticketing_provider
  ) {
    return "api_authorized";
  }

  if (
    sourceProfile.authorization_status === "authorized" &&
    sourceProfile.is_partner_verified
  ) {
    return "partner_verified";
  }

  if (
    sourceProfile.authorization_status === "authorized" &&
    sourceProfile.is_official_ticketing_provider
  ) {
    return "official_verified";
  }

  return "unknown";
}

function resolveTicketingSourceRole(
  sourceProfile: EventTicketingApiSourceProfile,
  sourceAuthorizationStatus: EventAutomationSourceAuthorizationStatus
): EventAutomationSourceRole {
  if (sourceAuthorizationStatus === "api_authorized") {
    return "authorized_ticketing_api";
  }

  if (sourceProfile.is_official_ticketing_provider) {
    return "official_event_source";
  }

  return "unknown";
}

function hasRequiredEventIdentity(
  rawEventSignal: EventTicketingApiRawEventSignal
): boolean {
  return (
    hasText(rawEventSignal.event_name) &&
    hasText(rawEventSignal.starts_at) &&
    hasText(rawEventSignal.venue_name) &&
    hasText(rawEventSignal.city) &&
    hasText(rawEventSignal.official_url)
  );
}

function countRawEventStrongSignals(
  rawEventSignal: EventTicketingApiRawEventSignal
): number {
  const signals = [
    rawEventSignal.external_event_id,
    rawEventSignal.event_name,
    rawEventSignal.starts_at,
    rawEventSignal.venue_name,
    rawEventSignal.city,
    rawEventSignal.official_url,
    rawEventSignal.ticket_url,
    rawEventSignal.source_event_url,
  ];

  return signals.filter(hasText).length;
}

export function buildEventAutomationPolicyInputFromTicketingApiSource(
  input: EventTicketingApiSourceAdapterInput
): EventAutomationPolicyInput {
  const sourceAuthorizationStatus = resolveTicketingSourceAuthorizationStatus(
    input.source_profile
  );
  const sourceRole = resolveTicketingSourceRole(
    input.source_profile,
    sourceAuthorizationStatus
  );
  const rawSignalCount = countRawEventStrongSignals(input.raw_event_signal);
  const linkedSourceCount = toNonNegativeInteger(input.linked_source_count);
  const linkedStrongSourceSignalCount = toNonNegativeInteger(
    input.linked_strong_source_signal_count
  );
  const linkedOfficialSourceCount = toNonNegativeInteger(
    input.linked_official_source_count
  );
  const linkedVerifiedVenueSourceCount = toNonNegativeInteger(
    input.linked_verified_venue_source_count
  );

  const authorizedTicketingSourceCount =
    sourceAuthorizationStatus === "api_authorized" ? 1 : 0;

  const officialSourceCount =
    sourceAuthorizationStatus === "official_verified" ||
    sourceAuthorizationStatus === "api_authorized"
      ? 1 + linkedOfficialSourceCount
      : linkedOfficialSourceCount;

  return {
    source_authorization_status: sourceAuthorizationStatus,
    source_role: sourceRole,
    source_count: 1 + linkedSourceCount,
    strong_source_signal_count:
      rawSignalCount + linkedStrongSourceSignalCount,
    authorized_ticketing_source_count: authorizedTicketingSourceCount,
    official_source_count: officialSourceCount,
    verified_venue_source_count: linkedVerifiedVenueSourceCount,
    critical_conflict_count: input.critical_conflict_count ?? 0,
    validation_error_count: input.validation_error_count ?? 0,
    duplicate_candidate_count: input.duplicate_candidate_count ?? 0,
    has_required_event_identity: hasRequiredEventIdentity(
      input.raw_event_signal
    ),
    has_valid_event_name: hasText(input.raw_event_signal.event_name),
    has_valid_event_date: hasText(input.raw_event_signal.starts_at),
    has_valid_location:
      hasText(input.raw_event_signal.venue_name) &&
      hasText(input.raw_event_signal.city),
    has_valid_official_url: hasText(input.raw_event_signal.official_url),
    has_ticket_url: hasText(input.raw_event_signal.ticket_url),
    is_event_expired: input.raw_event_signal.is_event_expired === true,
    is_low_quality_discovery_source:
      sourceAuthorizationStatus === "unknown" &&
      input.source_profile.authorization_status !== "authorized",
    real_auto_publish_enabled: false,
  };
}

export function adaptTicketingApiSourceToAutomationPolicy(
  input: EventTicketingApiSourceAdapterInput
): EventTicketingApiSourceAdapterResult {
  const sourceAuthorizationStatus = resolveTicketingSourceAuthorizationStatus(
    input.source_profile
  );
  const sourceRole = resolveTicketingSourceRole(
    input.source_profile,
    sourceAuthorizationStatus
  );
  const policyInput =
    buildEventAutomationPolicyInputFromTicketingApiSource(input);
  const policyDecision = resolveEventAutomationPolicyDecision(policyInput);

  return {
    provider_key: input.source_profile.provider_key,
    provider_name: input.source_profile.provider_name,
    source_authorization_status: sourceAuthorizationStatus,
    source_role: sourceRole,
    policy_input: policyInput,
    policy_decision: policyDecision,
    external_request_performed: false,
    oauth_token_required_for_sample: false,
    human_event_analysis_required: false,
  };
}