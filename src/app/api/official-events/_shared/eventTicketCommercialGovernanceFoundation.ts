// src/app/api/official-events/_shared/eventTicketCommercialGovernanceFoundation.ts

export const EVENT_TICKET_COMMERCIAL_GOVERNANCE_FOUNDATION_VERSION =
  "v4.8.84-event-ticket-commercial-governance-foundation-safe" as const;

export const EVENT_TICKET_COMMERCIAL_GOVERNANCE_POLICY = {
  officialReferenceAndCommercialChannelAreIndependent: true,
  officialReferenceMayBeAutomatedAtHighConfidence: true,
  officialReferenceNeverBecomesCommercialAutomatically: true,
  legacyTechnicalTicketUrlNeverActivatesCommercialButton: true,
  partnerMaySubmitButNeverActivateCommercialChannel: true,
  useclubbersAdminOwnsCommercialChannelLifecycle: true,
  approvedPartnershipRequestDoesNotActivateCommercialChannel: true,
  selfDeclaredPurchaseIsNotConfirmedConversion: true,
  officialCommunicationDoesNotGrantCommercialAuthorization: true,
  revokedCommercialChannelIsRetainedForAudit: true,
  publicIntegrationImplemented: false,
  databaseWriteImplemented: false,
  migrationImplemented: false,
} as const;

export const EVENT_TICKET_GOVERNANCE_ACTOR_ROLES = [
  "useclubbers_admin",
  "partner_user",
  "automation",
  "system",
] as const;

export type EventTicketGovernanceActorRole =
  (typeof EVENT_TICKET_GOVERNANCE_ACTOR_ROLES)[number];

export const EVENT_TICKET_GOVERNANCE_ACTIONS = [
  "submit_official_reference",
  "validate_official_reference",
  "reject_official_reference",
  "submit_partnership_request",
  "request_partnership_information",
  "approve_partnership_request",
  "reject_partnership_request",
  "withdraw_partnership_request",
  "create_commercial_channel",
  "authorize_commercial_channel",
  "activate_commercial_channel",
  "pause_commercial_channel",
  "revoke_commercial_channel",
  "submit_official_communication",
  "review_official_communication",
  "publish_official_communication",
  "pause_official_communication",
] as const;

export type EventTicketGovernanceAction =
  (typeof EVENT_TICKET_GOVERNANCE_ACTIONS)[number];

const EVENT_TICKET_GOVERNANCE_PERMISSIONS: Record<
  EventTicketGovernanceActorRole,
  readonly EventTicketGovernanceAction[]
> = {
  useclubbers_admin: EVENT_TICKET_GOVERNANCE_ACTIONS,
  partner_user: [
    "submit_official_reference",
    "submit_partnership_request",
    "withdraw_partnership_request",
    "submit_official_communication",
  ],
  automation: [
    "submit_official_reference",
    "validate_official_reference",
  ],
  system: [],
};

export function canRolePerformEventTicketGovernanceAction(
  role: EventTicketGovernanceActorRole,
  action: EventTicketGovernanceAction,
): boolean {
  return EVENT_TICKET_GOVERNANCE_PERMISSIONS[role].includes(action);
}

export const OFFICIAL_EVENT_REFERENCE_STATUSES = [
  "candidate",
  "validated",
  "rejected",
  "stale",
] as const;

export type OfficialEventReferenceStatus =
  (typeof OFFICIAL_EVENT_REFERENCE_STATUSES)[number];

export const OFFICIAL_EVENT_REFERENCE_SOURCE_TYPES = [
  "ticketing_platform",
  "official_event_site",
  "official_producer_site",
  "official_club_site",
  "official_social_profile",
  "trusted_event_source",
  "manual_admin_reference",
] as const;

export type OfficialEventReferenceSourceType =
  (typeof OFFICIAL_EVENT_REFERENCE_SOURCE_TYPES)[number];

export type OfficialEventReferenceInput = {
  canonicalEventId?: string | null;
  eventSlug?: string | null;
  referenceUrl?: string | null;
  sourceType?: OfficialEventReferenceSourceType | string | null;
  sourceKey?: string | null;
  sourceDisplayName?: string | null;
  status?: OfficialEventReferenceStatus | string | null;
  confidence?: number | string | null;
  authorityScore?: number | string | null;
  validatedAt?: string | null;
  validatedByRole?: EventTicketGovernanceActorRole | string | null;
  discoveredAutomatically?: boolean | null;
  notes?: string | null;
};

export type OfficialEventReferenceNormalized = {
  canonicalEventId: string | null;
  eventSlug: string | null;
  referenceUrl: string | null;
  sourceType: OfficialEventReferenceSourceType;
  sourceKey: string | null;
  sourceDisplayName: string | null;
  status: OfficialEventReferenceStatus;
  confidence: number | null;
  authorityScore: number | null;
  validatedAt: string | null;
  validatedByRole: EventTicketGovernanceActorRole | null;
  discoveredAutomatically: boolean;
  notes: string | null;
};

export type OfficialEventReferenceDecision = {
  eligibleForPublicReference: boolean;
  publicUrl: string | null;
  publicLabel: "Ver evento oficial" | null;
  blockingReasons: string[];
};

export const EVENT_TICKET_PARTNERSHIP_REQUEST_STATUSES = [
  "pending",
  "needs_info",
  "approved",
  "rejected",
  "withdrawn",
] as const;

export type EventTicketPartnershipRequestStatus =
  (typeof EVENT_TICKET_PARTNERSHIP_REQUEST_STATUSES)[number];

export const EVENT_TICKET_PARTNERSHIP_REQUEST_TYPES = [
  "ticket_sales_partnership",
  "affiliate_campaign",
  "discount_campaign",
  "presale_campaign",
  "fixed_media_campaign",
  "hybrid_commercial_partnership",
] as const;

export type EventTicketPartnershipRequestType =
  (typeof EVENT_TICKET_PARTNERSHIP_REQUEST_TYPES)[number];

export type EventTicketPartnershipRequestInput = {
  requestId?: string | null;
  canonicalEventId?: string | null;
  eventSlug?: string | null;
  partnerId?: string | null;
  partnerDisplayName?: string | null;
  submittedByRole?: EventTicketGovernanceActorRole | string | null;
  requestType?: EventTicketPartnershipRequestType | string | null;
  status?: EventTicketPartnershipRequestStatus | string | null;
  currentSalesUrl?: string | null;
  ticketingProviderKey?: string | null;
  commercialContactName?: string | null;
  commercialContactEmail?: string | null;
  proposedBenefit?: string | null;
  commercialNotes?: string | null;
  reviewedByRole?: EventTicketGovernanceActorRole | string | null;
  reviewedAt?: string | null;
};

export type EventTicketPartnershipRequestNormalized = {
  requestId: string | null;
  canonicalEventId: string | null;
  eventSlug: string | null;
  partnerId: string | null;
  partnerDisplayName: string | null;
  submittedByRole: EventTicketGovernanceActorRole;
  requestType: EventTicketPartnershipRequestType;
  status: EventTicketPartnershipRequestStatus;
  currentSalesUrl: string | null;
  ticketingProviderKey: string | null;
  commercialContactName: string | null;
  commercialContactEmail: string | null;
  proposedBenefit: string | null;
  commercialNotes: string | null;
  reviewedByRole: EventTicketGovernanceActorRole | null;
  reviewedAt: string | null;
};

export type EventTicketPartnershipRequestDecision = {
  validSubmission: boolean;
  createsCommercialChannelAutomatically: false;
  activatesCommercialLinkAutomatically: false;
  adminReviewRequired: true;
  blockingReasons: string[];
};

export const EVENT_TICKET_COMMERCIAL_CHANNEL_STATUSES = [
  "draft",
  "authorized",
  "active",
  "paused",
  "expired",
  "revoked",
] as const;

export type EventTicketCommercialChannelStatus =
  (typeof EVENT_TICKET_COMMERCIAL_CHANNEL_STATUSES)[number];

export const EVENT_TICKET_COMMERCIAL_CHANNEL_SOURCE_ORIGINS = [
  "admin_entry",
  "approved_partner_request",
  "commercial_contract",
  "partner_api_submission",
] as const;

export type EventTicketCommercialChannelSourceOrigin =
  (typeof EVENT_TICKET_COMMERCIAL_CHANNEL_SOURCE_ORIGINS)[number];

export const EVENT_TICKET_COMMERCIAL_TRACKING_METHODS = [
  "query_parameter",
  "coupon_code",
  "affiliate_id",
  "path_segment",
  "postback",
  "webhook",
  "partner_api",
  "manual_report",
  "none",
] as const;

export type EventTicketCommercialTrackingMethod =
  (typeof EVENT_TICKET_COMMERCIAL_TRACKING_METHODS)[number];

export const EVENT_TICKET_COMMERCIAL_REMUNERATION_MODELS = [
  "commission_percent",
  "commission_fixed_per_ticket",
  "service_fee_share",
  "fixed_campaign",
  "hybrid",
  "licensing",
  "no_remuneration",
] as const;

export type EventTicketCommercialRemunerationModel =
  (typeof EVENT_TICKET_COMMERCIAL_REMUNERATION_MODELS)[number];

export type EventTicketCommercialChannelInput = {
  channelId?: string | null;
  canonicalEventId?: string | null;
  eventSlug?: string | null;
  sourceOrigin?: EventTicketCommercialChannelSourceOrigin | string | null;
  sourceRequestId?: string | null;
  ticketingProviderKey?: string | null;
  ticketingDisplayName?: string | null;
  authorizedDomain?: string | null;
  commercialUrl?: string | null;
  trackingMethod?: EventTicketCommercialTrackingMethod | string | null;
  trackingKey?: string | null;
  trackingParameterName?: string | null;
  remunerationModel?: EventTicketCommercialRemunerationModel | string | null;
  commissionPercent?: number | string | null;
  commissionFixedMinor?: number | string | null;
  currency?: string | null;
  authorizationReference?: string | null;
  authorizationStartsAt?: string | null;
  authorizationEndsAt?: string | null;
  createdByRole?: EventTicketGovernanceActorRole | string | null;
  authorizedByRole?: EventTicketGovernanceActorRole | string | null;
  activatedByRole?: EventTicketGovernanceActorRole | string | null;
  pausedByRole?: EventTicketGovernanceActorRole | string | null;
  revokedByRole?: EventTicketGovernanceActorRole | string | null;
  createdAt?: string | null;
  authorizedAt?: string | null;
  activatedAt?: string | null;
  pausedAt?: string | null;
  revokedAt?: string | null;
  status?: EventTicketCommercialChannelStatus | string | null;
  disclosureText?: string | null;
  notes?: string | null;
};

export type EventTicketCommercialChannelNormalized = {
  channelId: string | null;
  canonicalEventId: string | null;
  eventSlug: string | null;
  sourceOrigin: EventTicketCommercialChannelSourceOrigin;
  sourceRequestId: string | null;
  ticketingProviderKey: string | null;
  ticketingDisplayName: string | null;
  authorizedDomain: string | null;
  commercialUrl: string | null;
  trackingMethod: EventTicketCommercialTrackingMethod;
  trackingKey: string | null;
  trackingParameterName: string | null;
  remunerationModel: EventTicketCommercialRemunerationModel;
  commissionPercent: number | null;
  commissionFixedMinor: number | null;
  currency: string | null;
  authorizationReference: string | null;
  authorizationStartsAt: string | null;
  authorizationEndsAt: string | null;
  createdByRole: EventTicketGovernanceActorRole;
  authorizedByRole: EventTicketGovernanceActorRole | null;
  activatedByRole: EventTicketGovernanceActorRole | null;
  pausedByRole: EventTicketGovernanceActorRole | null;
  revokedByRole: EventTicketGovernanceActorRole | null;
  createdAt: string | null;
  authorizedAt: string | null;
  activatedAt: string | null;
  pausedAt: string | null;
  revokedAt: string | null;
  status: EventTicketCommercialChannelStatus;
  disclosureText: string | null;
  notes: string | null;
};

export type EventTicketCommercialChannelDecision = {
  eligibleForPublicPurchase: boolean;
  publicUrl: string | null;
  publicLabel: "Comprar ingresso" | null;
  disclosureRequired: boolean;
  disclosureText: string | null;
  effectiveStatus: EventTicketCommercialChannelStatus;
  blockingReasons: string[];
};

export const EVENT_TICKET_PURCHASE_SIGNAL_TYPES = [
  "interest",
  "commercial_link_click",
  "self_declared_purchase",
  "attributed_conversion",
  "confirmed_conversion",
] as const;

export type EventTicketPurchaseSignalType =
  (typeof EVENT_TICKET_PURCHASE_SIGNAL_TYPES)[number];

export const EVENT_TICKET_PURCHASE_EVIDENCE_SOURCES = [
  "clubber_action",
  "useclubbers_redirect",
  "coupon_report",
  "partner_report",
  "postback",
  "webhook",
  "partner_api",
] as const;

export type EventTicketPurchaseEvidenceSource =
  (typeof EVENT_TICKET_PURCHASE_EVIDENCE_SOURCES)[number];

export type EventTicketPurchaseSignalInput = {
  signalType?: EventTicketPurchaseSignalType | string | null;
  evidenceSource?: EventTicketPurchaseEvidenceSource | string | null;
  externalTransactionId?: string | null;
  attributionCampaignId?: string | null;
  recordedAt?: string | null;
};

export type EventTicketPurchaseSignalDecision = {
  signalType: EventTicketPurchaseSignalType;
  isInterestSignal: boolean;
  isSelfDeclaredPurchase: boolean;
  isAttributedConversion: boolean;
  isConfirmedConversion: boolean;
  canBeReportedAsConfirmedRevenue: boolean;
  publicStateLabel:
    | "Tenho interesse"
    | "Já comprei meu ingresso"
    | "Compra atribuída"
    | "Compra confirmada";
  blockingReasons: string[];
};

export const PARTNER_OFFICIAL_COMMUNICATION_STATUSES = [
  "draft",
  "submitted",
  "needs_review",
  "approved",
  "published",
  "paused",
  "expired",
  "rejected",
] as const;

export type PartnerOfficialCommunicationStatus =
  (typeof PARTNER_OFFICIAL_COMMUNICATION_STATUSES)[number];

export const PARTNER_OFFICIAL_COMMUNICATION_TYPES = [
  "ticket_batch_change",
  "ticket_presale",
  "ticket_discount",
  "giveaway",
  "music_release",
  "lineup_update",
  "official_after",
  "location_notice",
  "schedule_change",
  "vip_experience",
  "promotional_code",
  "exclusive_content",
  "community_call",
] as const;

export type PartnerOfficialCommunicationType =
  (typeof PARTNER_OFFICIAL_COMMUNICATION_TYPES)[number];

export type PartnerOfficialCommunicationInput = {
  communicationId?: string | null;
  partnerId?: string | null;
  canonicalEventId?: string | null;
  communicationType?: PartnerOfficialCommunicationType | string | null;
  status?: PartnerOfficialCommunicationStatus | string | null;
  partnerVerified?: boolean | null;
  commercialTicketPartnershipActive?: boolean | null;
  submittedByRole?: EventTicketGovernanceActorRole | string | null;
  approvedByRole?: EventTicketGovernanceActorRole | string | null;
  publishedByRole?: EventTicketGovernanceActorRole | string | null;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type PartnerOfficialCommunicationDecision = {
  eligibleForSubmission: boolean;
  eligibleForPublication: boolean;
  requiresCommercialTicketPartnership: boolean;
  officialCommunicationGrantsCommercialAuthorization: false;
  partnerCanPublishDirectly: false;
  blockingReasons: string[];
};

export type EventTicketPublicButtonDecision = {
  primaryAction:
    | {
        kind: "buy_ticket";
        label: "Comprar ingresso";
        url: string;
        monetized: true;
        disclosureRequired: boolean;
        disclosureText: string | null;
      }
    | {
        kind: "view_official_event";
        label: "Ver evento oficial";
        url: string;
        monetized: false;
        disclosureRequired: false;
        disclosureText: null;
      }
    | {
        kind: "ticket_channel_unavailable";
        label: "Canal de vendas a confirmar";
        url: null;
        monetized: false;
        disclosureRequired: false;
        disclosureText: null;
        supportingText:
          "Aguardando o envio de um link autorizado pelo evento ou pela ticketeira.";
      };
  legacyTechnicalTicketUrlUsed: false;
  purchaseSignalAction: {
    label: "Já comprei meu ingresso";
    records: "self_declared_purchase";
    confirmsRevenue: false;
  };
  decisionReasons: string[];
};

export type EventTicketCommercialGovernanceIssueSeverity =
  | "blocking"
  | "warning"
  | "information";

export type EventTicketCommercialGovernanceIssue = {
  code: string;
  severity: EventTicketCommercialGovernanceIssueSeverity;
  field: string | null;
  message: string;
};

export type EventTicketCommercialGovernanceSelfTestResult = {
  ok: boolean;
  version: typeof EVENT_TICKET_COMMERCIAL_GOVERNANCE_FOUNDATION_VERSION;
  checks: Record<string, boolean>;
  failedChecks: string[];
  database_write_performed: false;
  public_ticket_link_activated: false;
  migration_performed: false;
};

const COMMERCIAL_CHANNEL_TRANSITIONS: Record<
  EventTicketCommercialChannelStatus,
  readonly EventTicketCommercialChannelStatus[]
> = {
  draft: ["authorized", "revoked"],
  authorized: ["active", "paused", "expired", "revoked"],
  active: ["paused", "expired", "revoked"],
  paused: ["active", "expired", "revoked"],
  expired: ["authorized", "revoked"],
  revoked: [],
};

const PARTNERSHIP_REQUEST_TRANSITIONS: Record<
  EventTicketPartnershipRequestStatus,
  readonly EventTicketPartnershipRequestStatus[]
> = {
  pending: ["needs_info", "approved", "rejected", "withdrawn"],
  needs_info: ["pending", "approved", "rejected", "withdrawn"],
  approved: [],
  rejected: [],
  withdrawn: [],
};

const COMMUNICATION_TRANSITIONS: Record<
  PartnerOfficialCommunicationStatus,
  readonly PartnerOfficialCommunicationStatus[]
> = {
  draft: ["submitted", "rejected"],
  submitted: ["needs_review", "approved", "rejected"],
  needs_review: ["submitted", "approved", "rejected"],
  approved: ["published", "paused", "expired", "rejected"],
  published: ["paused", "expired"],
  paused: ["published", "expired", "rejected"],
  expired: [],
  rejected: [],
};

const TICKET_COMMERCIAL_COMMUNICATION_TYPES = new Set<
  PartnerOfficialCommunicationType
>(["ticket_batch_change", "ticket_presale", "ticket_discount", "promotional_code"]);

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeLowerText(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function normalizeEnum<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
  fallback: TValue,
): TValue {
  const normalized = normalizeLowerText(value);
  return allowed.includes(normalized as TValue)
    ? (normalized as TValue)
    : fallback;
}

function normalizeOptionalEnum<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
): TValue | null {
  const normalized = normalizeLowerText(value);
  return allowed.includes(normalized as TValue)
    ? (normalized as TValue)
    : null;
}

function normalizeIsoDate(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;

  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function normalizeFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const numeric =
    typeof value === "number"
      ? value
      : Number(normalizeText(value).replace(",", "."));

  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeInteger(value: unknown): number | null {
  const numeric = normalizeFiniteNumber(value);
  return numeric !== null && Number.isInteger(numeric) ? numeric : null;
}

function normalizeCurrency(value: unknown): string | null {
  const currency = normalizeText(value).toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function normalizeActorRole(
  value: unknown,
  fallback: EventTicketGovernanceActorRole,
): EventTicketGovernanceActorRole {
  return normalizeEnum(value, EVENT_TICKET_GOVERNANCE_ACTOR_ROLES, fallback);
}

function normalizeDomain(value: unknown): string | null {
  let domain = normalizeLowerText(value);
  if (!domain) return null;

  domain = domain.replace(/^https?:\/\//, "");
  domain = domain.split("/")[0] ?? "";
  domain = domain.replace(/\.$/, "");

  if (!domain || domain.includes("@") || domain.includes(":")) return null;
  if (!/^[a-z0-9.-]+$/.test(domain)) return null;
  if (!domain.includes(".")) return null;
  if (domain.startsWith(".") || domain.endsWith(".")) return null;
  if (domain.includes("..")) return null;

  return domain;
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return true;
  }

  const ipv4 = host.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
  );

  if (!ipv4) return false;

  const octets = ipv4.slice(1).map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return true;

  const [first, second] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function normalizeHttpsUrl(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;

  try {
    const url = new URL(text);

    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.port && url.port !== "443") return null;
    if (isPrivateOrLocalHost(url.hostname)) return null;

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function urlMatchesAuthorizedDomain(
  urlValue: string | null,
  authorizedDomain: string | null,
): boolean {
  if (!urlValue || !authorizedDomain) return false;

  try {
    const hostname = new URL(urlValue).hostname.toLowerCase().replace(/\.$/, "");
    return hostname === authorizedDomain || hostname.endsWith(`.${authorizedDomain}`);
  } catch {
    return false;
  }
}

function isWithinWindow(
  startsAt: string | null,
  endsAt: string | null,
  nowIso: string,
): boolean {
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) return false;

  if (startsAt && now < Date.parse(startsAt)) return false;
  if (endsAt && now >= Date.parse(endsAt)) return false;
  return true;
}

function issue(
  code: string,
  severity: EventTicketCommercialGovernanceIssueSeverity,
  field: string | null,
  message: string,
): EventTicketCommercialGovernanceIssue {
  return { code, severity, field, message };
}

export function normalizeOfficialEventReference(
  input: OfficialEventReferenceInput,
): OfficialEventReferenceNormalized {
  return {
    canonicalEventId: normalizeNullableText(input.canonicalEventId),
    eventSlug: normalizeNullableText(input.eventSlug),
    referenceUrl: normalizeHttpsUrl(input.referenceUrl),
    sourceType: normalizeEnum(
      input.sourceType,
      OFFICIAL_EVENT_REFERENCE_SOURCE_TYPES,
      "trusted_event_source",
    ),
    sourceKey: normalizeNullableText(input.sourceKey),
    sourceDisplayName: normalizeNullableText(input.sourceDisplayName),
    status: normalizeEnum(
      input.status,
      OFFICIAL_EVENT_REFERENCE_STATUSES,
      "candidate",
    ),
    confidence: normalizeFiniteNumber(input.confidence),
    authorityScore: normalizeFiniteNumber(input.authorityScore),
    validatedAt: normalizeIsoDate(input.validatedAt),
    validatedByRole: normalizeOptionalEnum(
      input.validatedByRole,
      EVENT_TICKET_GOVERNANCE_ACTOR_ROLES,
    ),
    discoveredAutomatically: input.discoveredAutomatically === true,
    notes: normalizeNullableText(input.notes),
  };
}

export function resolveOfficialEventReferenceDecision(
  input: OfficialEventReferenceInput,
): OfficialEventReferenceDecision {
  const normalized = normalizeOfficialEventReference(input);
  const blockingReasons: string[] = [];

  if (!normalized.canonicalEventId) {
    blockingReasons.push("canonical_event_id_required");
  }

  if (!normalized.eventSlug) {
    blockingReasons.push("event_slug_required");
  }

  if (!normalized.referenceUrl) {
    blockingReasons.push("valid_https_reference_url_required");
  }

  if (normalized.status !== "validated") {
    blockingReasons.push("official_reference_not_validated");
  }

  if (normalized.confidence === null || normalized.confidence < 90) {
    blockingReasons.push("official_reference_high_confidence_required");
  }

  if (normalized.authorityScore === null || normalized.authorityScore < 90) {
    blockingReasons.push("official_reference_high_authority_required");
  }

  if (!normalized.validatedAt || !normalized.validatedByRole) {
    blockingReasons.push("official_reference_validation_audit_required");
  }

  return {
    eligibleForPublicReference: blockingReasons.length === 0,
    publicUrl: blockingReasons.length === 0 ? normalized.referenceUrl : null,
    publicLabel: blockingReasons.length === 0 ? "Ver evento oficial" : null,
    blockingReasons,
  };
}

export function normalizeEventTicketPartnershipRequest(
  input: EventTicketPartnershipRequestInput,
): EventTicketPartnershipRequestNormalized {
  return {
    requestId: normalizeNullableText(input.requestId),
    canonicalEventId: normalizeNullableText(input.canonicalEventId),
    eventSlug: normalizeNullableText(input.eventSlug),
    partnerId: normalizeNullableText(input.partnerId),
    partnerDisplayName: normalizeNullableText(input.partnerDisplayName),
    submittedByRole: normalizeActorRole(input.submittedByRole, "partner_user"),
    requestType: normalizeEnum(
      input.requestType,
      EVENT_TICKET_PARTNERSHIP_REQUEST_TYPES,
      "ticket_sales_partnership",
    ),
    status: normalizeEnum(
      input.status,
      EVENT_TICKET_PARTNERSHIP_REQUEST_STATUSES,
      "pending",
    ),
    currentSalesUrl: normalizeHttpsUrl(input.currentSalesUrl),
    ticketingProviderKey: normalizeNullableText(input.ticketingProviderKey),
    commercialContactName: normalizeNullableText(input.commercialContactName),
    commercialContactEmail: normalizeNullableText(input.commercialContactEmail),
    proposedBenefit: normalizeNullableText(input.proposedBenefit),
    commercialNotes: normalizeNullableText(input.commercialNotes),
    reviewedByRole: normalizeOptionalEnum(
      input.reviewedByRole,
      EVENT_TICKET_GOVERNANCE_ACTOR_ROLES,
    ),
    reviewedAt: normalizeIsoDate(input.reviewedAt),
  };
}

export function resolveEventTicketPartnershipRequestDecision(
  input: EventTicketPartnershipRequestInput,
): EventTicketPartnershipRequestDecision {
  const normalized = normalizeEventTicketPartnershipRequest(input);
  const blockingReasons: string[] = [];

  if (!normalized.requestId) blockingReasons.push("request_id_required");
  if (!normalized.canonicalEventId) {
    blockingReasons.push("canonical_event_id_required");
  }
  if (!normalized.eventSlug) blockingReasons.push("event_slug_required");
  if (!normalized.partnerId) blockingReasons.push("partner_id_required");
  if (!normalized.partnerDisplayName) {
    blockingReasons.push("partner_display_name_required");
  }
  if (!normalized.currentSalesUrl) {
    blockingReasons.push("valid_current_sales_url_required");
  }
  if (!normalized.ticketingProviderKey) {
    blockingReasons.push("ticketing_provider_required");
  }
  if (!normalized.commercialContactName) {
    blockingReasons.push("commercial_contact_name_required");
  }
  if (
    !normalized.commercialContactEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.commercialContactEmail)
  ) {
    blockingReasons.push("valid_commercial_contact_email_required");
  }
  if (
    !canRolePerformEventTicketGovernanceAction(
      normalized.submittedByRole,
      "submit_partnership_request",
    )
  ) {
    blockingReasons.push("role_cannot_submit_partnership_request");
  }

  if (["approved", "rejected"].includes(normalized.status)) {
    if (normalized.reviewedByRole !== "useclubbers_admin") {
      blockingReasons.push("admin_review_required_for_final_request_status");
    }
    if (!normalized.reviewedAt) {
      blockingReasons.push("request_review_timestamp_required");
    }
  }

  return {
    validSubmission: blockingReasons.length === 0,
    createsCommercialChannelAutomatically: false,
    activatesCommercialLinkAutomatically: false,
    adminReviewRequired: true,
    blockingReasons,
  };
}

export function canTransitionEventTicketPartnershipRequestStatus(
  from: EventTicketPartnershipRequestStatus,
  to: EventTicketPartnershipRequestStatus,
): boolean {
  return PARTNERSHIP_REQUEST_TRANSITIONS[from].includes(to);
}

export function normalizeEventTicketCommercialChannel(
  input: EventTicketCommercialChannelInput,
): EventTicketCommercialChannelNormalized {
  const commissionPercent = normalizeFiniteNumber(input.commissionPercent);
  const commissionFixedMinor = normalizeInteger(input.commissionFixedMinor);

  return {
    channelId: normalizeNullableText(input.channelId),
    canonicalEventId: normalizeNullableText(input.canonicalEventId),
    eventSlug: normalizeNullableText(input.eventSlug),
    sourceOrigin: normalizeEnum(
      input.sourceOrigin,
      EVENT_TICKET_COMMERCIAL_CHANNEL_SOURCE_ORIGINS,
      "admin_entry",
    ),
    sourceRequestId: normalizeNullableText(input.sourceRequestId),
    ticketingProviderKey: normalizeNullableText(input.ticketingProviderKey),
    ticketingDisplayName: normalizeNullableText(input.ticketingDisplayName),
    authorizedDomain: normalizeDomain(input.authorizedDomain),
    commercialUrl: normalizeHttpsUrl(input.commercialUrl),
    trackingMethod: normalizeEnum(
      input.trackingMethod,
      EVENT_TICKET_COMMERCIAL_TRACKING_METHODS,
      "none",
    ),
    trackingKey: normalizeNullableText(input.trackingKey),
    trackingParameterName: normalizeNullableText(input.trackingParameterName),
    remunerationModel: normalizeEnum(
      input.remunerationModel,
      EVENT_TICKET_COMMERCIAL_REMUNERATION_MODELS,
      "no_remuneration",
    ),
    commissionPercent,
    commissionFixedMinor,
    currency: normalizeCurrency(input.currency),
    authorizationReference: normalizeNullableText(input.authorizationReference),
    authorizationStartsAt: normalizeIsoDate(input.authorizationStartsAt),
    authorizationEndsAt: normalizeIsoDate(input.authorizationEndsAt),
    createdByRole: normalizeActorRole(input.createdByRole, "partner_user"),
    authorizedByRole: normalizeOptionalEnum(
      input.authorizedByRole,
      EVENT_TICKET_GOVERNANCE_ACTOR_ROLES,
    ),
    activatedByRole: normalizeOptionalEnum(
      input.activatedByRole,
      EVENT_TICKET_GOVERNANCE_ACTOR_ROLES,
    ),
    pausedByRole: normalizeOptionalEnum(
      input.pausedByRole,
      EVENT_TICKET_GOVERNANCE_ACTOR_ROLES,
    ),
    revokedByRole: normalizeOptionalEnum(
      input.revokedByRole,
      EVENT_TICKET_GOVERNANCE_ACTOR_ROLES,
    ),
    createdAt: normalizeIsoDate(input.createdAt),
    authorizedAt: normalizeIsoDate(input.authorizedAt),
    activatedAt: normalizeIsoDate(input.activatedAt),
    pausedAt: normalizeIsoDate(input.pausedAt),
    revokedAt: normalizeIsoDate(input.revokedAt),
    status: normalizeEnum(
      input.status,
      EVENT_TICKET_COMMERCIAL_CHANNEL_STATUSES,
      "draft",
    ),
    disclosureText: normalizeNullableText(input.disclosureText),
    notes: normalizeNullableText(input.notes),
  };
}

function commercialChannelRequiresAttribution(
  model: EventTicketCommercialRemunerationModel,
): boolean {
  return [
    "commission_percent",
    "commission_fixed_per_ticket",
    "service_fee_share",
    "hybrid",
  ].includes(model);
}

function commercialChannelHasAttribution(
  channel: EventTicketCommercialChannelNormalized,
): boolean {
  if (channel.trackingMethod === "none") return false;

  if (
    ["query_parameter", "coupon_code", "affiliate_id", "path_segment"].includes(
      channel.trackingMethod,
    )
  ) {
    return Boolean(channel.trackingKey);
  }

  return true;
}

function resolveEffectiveCommercialStatus(
  channel: EventTicketCommercialChannelNormalized,
  nowIso: string,
): EventTicketCommercialChannelStatus {
  if (channel.status === "revoked") return "revoked";

  if (
    channel.authorizationEndsAt &&
    Date.parse(nowIso) >= Date.parse(channel.authorizationEndsAt)
  ) {
    return "expired";
  }

  return channel.status;
}

export function resolveEventTicketCommercialChannelDecision(
  input: EventTicketCommercialChannelInput,
  nowIso = new Date().toISOString(),
): EventTicketCommercialChannelDecision {
  const channel = normalizeEventTicketCommercialChannel(input);
  const blockingReasons: string[] = [];
  const effectiveStatus = resolveEffectiveCommercialStatus(channel, nowIso);

  if (!channel.channelId) blockingReasons.push("channel_id_required");
  if (!channel.canonicalEventId) {
    blockingReasons.push("canonical_event_id_required");
  }
  if (!channel.eventSlug) blockingReasons.push("event_slug_required");
  if (!channel.ticketingProviderKey) {
    blockingReasons.push("ticketing_provider_required");
  }
  if (!channel.ticketingDisplayName) {
    blockingReasons.push("ticketing_display_name_required");
  }
  if (!channel.authorizedDomain) {
    blockingReasons.push("authorized_domain_required");
  }
  if (!channel.commercialUrl) {
    blockingReasons.push("valid_https_commercial_url_required");
  }
  if (!urlMatchesAuthorizedDomain(channel.commercialUrl, channel.authorizedDomain)) {
    blockingReasons.push("commercial_url_domain_mismatch");
  }
  if (channel.createdByRole !== "useclubbers_admin") {
    blockingReasons.push("commercial_channel_must_be_created_by_admin");
  }
  if (!channel.createdAt) {
    blockingReasons.push("commercial_channel_created_at_required");
  }
  if (channel.authorizedByRole !== "useclubbers_admin") {
    blockingReasons.push("commercial_channel_must_be_authorized_by_admin");
  }
  if (!channel.authorizedAt || !channel.authorizationReference) {
    blockingReasons.push("commercial_authorization_audit_required");
  }
  if (channel.activatedByRole !== "useclubbers_admin") {
    blockingReasons.push("commercial_channel_must_be_activated_by_admin");
  }
  if (!channel.activatedAt) {
    blockingReasons.push("commercial_activation_timestamp_required");
  }
  if (!isWithinWindow(channel.authorizationStartsAt, channel.authorizationEndsAt, nowIso)) {
    blockingReasons.push("commercial_authorization_not_currently_valid");
  }
  if (effectiveStatus !== "active") {
    blockingReasons.push(`commercial_channel_not_active:${effectiveStatus}`);
  }
  if (
    channel.sourceOrigin === "approved_partner_request" &&
    !channel.sourceRequestId
  ) {
    blockingReasons.push("approved_partner_request_id_required");
  }
  if (
    commercialChannelRequiresAttribution(channel.remunerationModel) &&
    !commercialChannelHasAttribution(channel)
  ) {
    blockingReasons.push("attribution_mechanism_required_for_performance_model");
  }
  if (
    channel.trackingMethod === "query_parameter" &&
    !channel.trackingParameterName
  ) {
    blockingReasons.push("tracking_parameter_name_required");
  }
  if (
    channel.remunerationModel === "commission_percent" &&
    (channel.commissionPercent === null ||
      channel.commissionPercent <= 0 ||
      channel.commissionPercent > 100)
  ) {
    blockingReasons.push("valid_commission_percent_required");
  }
  if (
    channel.remunerationModel === "commission_fixed_per_ticket" &&
    (channel.commissionFixedMinor === null || channel.commissionFixedMinor <= 0)
  ) {
    blockingReasons.push("valid_fixed_commission_required");
  }
  if (
    ["commission_fixed_per_ticket", "fixed_campaign", "hybrid"].includes(
      channel.remunerationModel,
    ) &&
    !channel.currency
  ) {
    blockingReasons.push("currency_required_for_monetary_model");
  }

  const disclosureRequired = channel.remunerationModel !== "no_remuneration";

  return {
    eligibleForPublicPurchase: blockingReasons.length === 0,
    publicUrl: blockingReasons.length === 0 ? channel.commercialUrl : null,
    publicLabel: blockingReasons.length === 0 ? "Comprar ingresso" : null,
    disclosureRequired,
    disclosureText:
      blockingReasons.length === 0 && disclosureRequired
        ? channel.disclosureText ??
          "A USECLUBBERS poderá receber remuneração pelas vendas realizadas por este canal, sem alteração no preço informado pela ticketeira."
        : null,
    effectiveStatus,
    blockingReasons,
  };
}

export function canTransitionEventTicketCommercialChannelStatus(
  from: EventTicketCommercialChannelStatus,
  to: EventTicketCommercialChannelStatus,
): boolean {
  return COMMERCIAL_CHANNEL_TRANSITIONS[from].includes(to);
}

export function canActorTransitionEventTicketCommercialChannelStatus(
  actorRole: EventTicketGovernanceActorRole,
  from: EventTicketCommercialChannelStatus,
  to: EventTicketCommercialChannelStatus,
): boolean {
  if (actorRole !== "useclubbers_admin") return false;
  return canTransitionEventTicketCommercialChannelStatus(from, to);
}

export function resolveEventTicketPurchaseSignalDecision(
  input: EventTicketPurchaseSignalInput,
): EventTicketPurchaseSignalDecision {
  const signalType = normalizeEnum(
    input.signalType,
    EVENT_TICKET_PURCHASE_SIGNAL_TYPES,
    "interest",
  );
  const evidenceSource = normalizeEnum(
    input.evidenceSource,
    EVENT_TICKET_PURCHASE_EVIDENCE_SOURCES,
    "clubber_action",
  );
  const externalTransactionId = normalizeNullableText(
    input.externalTransactionId,
  );
  const attributionCampaignId = normalizeNullableText(
    input.attributionCampaignId,
  );
  const blockingReasons: string[] = [];

  const isSelfDeclaredPurchase = signalType === "self_declared_purchase";
  const isAttributedConversion = signalType === "attributed_conversion";
  const isConfirmedConversion = signalType === "confirmed_conversion";

  if (isAttributedConversion && !attributionCampaignId) {
    blockingReasons.push("attribution_campaign_id_required");
  }

  if (isConfirmedConversion) {
    if (!externalTransactionId) {
      blockingReasons.push("external_transaction_id_required");
    }

    if (!["postback", "webhook", "partner_api"].includes(evidenceSource)) {
      blockingReasons.push("trusted_confirmation_evidence_required");
    }
  }

  const publicStateLabel = isConfirmedConversion
    ? "Compra confirmada"
    : isAttributedConversion
      ? "Compra atribuída"
      : isSelfDeclaredPurchase
        ? "Já comprei meu ingresso"
        : "Tenho interesse";

  return {
    signalType,
    isInterestSignal: signalType === "interest",
    isSelfDeclaredPurchase,
    isAttributedConversion,
    isConfirmedConversion,
    canBeReportedAsConfirmedRevenue:
      isConfirmedConversion && blockingReasons.length === 0,
    publicStateLabel,
    blockingReasons,
  };
}

export function resolvePartnerOfficialCommunicationDecision(
  input: PartnerOfficialCommunicationInput,
  nowIso = new Date().toISOString(),
): PartnerOfficialCommunicationDecision {
  const communicationType = normalizeEnum(
    input.communicationType,
    PARTNER_OFFICIAL_COMMUNICATION_TYPES,
    "exclusive_content",
  );
  const status = normalizeEnum(
    input.status,
    PARTNER_OFFICIAL_COMMUNICATION_STATUSES,
    "draft",
  );
  const submittedByRole = normalizeActorRole(
    input.submittedByRole,
    "partner_user",
  );
  const approvedByRole = normalizeOptionalEnum(
    input.approvedByRole,
    EVENT_TICKET_GOVERNANCE_ACTOR_ROLES,
  );
  const publishedByRole = normalizeOptionalEnum(
    input.publishedByRole,
    EVENT_TICKET_GOVERNANCE_ACTOR_ROLES,
  );
  const startsAt = normalizeIsoDate(input.startsAt);
  const endsAt = normalizeIsoDate(input.endsAt);
  const requiresCommercialTicketPartnership =
    TICKET_COMMERCIAL_COMMUNICATION_TYPES.has(communicationType);
  const blockingReasons: string[] = [];

  if (!normalizeNullableText(input.communicationId)) {
    blockingReasons.push("communication_id_required");
  }
  if (!normalizeNullableText(input.partnerId)) {
    blockingReasons.push("partner_id_required");
  }
  if (input.partnerVerified !== true) {
    blockingReasons.push("verified_partner_required");
  }
  if (
    !canRolePerformEventTicketGovernanceAction(
      submittedByRole,
      "submit_official_communication",
    )
  ) {
    blockingReasons.push("role_cannot_submit_official_communication");
  }
  if (
    requiresCommercialTicketPartnership &&
    input.commercialTicketPartnershipActive !== true
  ) {
    blockingReasons.push("active_commercial_ticket_partnership_required");
  }

  const eligibleForSubmission = blockingReasons.length === 0;
  const publicationBlockingReasons = [...blockingReasons];

  if (status !== "published") {
    publicationBlockingReasons.push("communication_not_published");
  }
  if (approvedByRole !== "useclubbers_admin") {
    publicationBlockingReasons.push("admin_editorial_approval_required");
  }
  if (publishedByRole !== "useclubbers_admin") {
    publicationBlockingReasons.push("admin_publication_required");
  }
  if (!isWithinWindow(startsAt, endsAt, nowIso)) {
    publicationBlockingReasons.push("communication_outside_publication_window");
  }

  return {
    eligibleForSubmission,
    eligibleForPublication: publicationBlockingReasons.length === 0,
    requiresCommercialTicketPartnership,
    officialCommunicationGrantsCommercialAuthorization: false,
    partnerCanPublishDirectly: false,
    blockingReasons: publicationBlockingReasons,
  };
}

export function canTransitionPartnerOfficialCommunicationStatus(
  from: PartnerOfficialCommunicationStatus,
  to: PartnerOfficialCommunicationStatus,
): boolean {
  return COMMUNICATION_TRANSITIONS[from].includes(to);
}

export function resolveEventTicketPublicButtonDecision(input: {
  officialReference?: OfficialEventReferenceInput | null;
  commercialChannel?: EventTicketCommercialChannelInput | null;
  legacyTechnicalTicketUrl?: string | null;
  nowIso?: string;
}): EventTicketPublicButtonDecision {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const commercialDecision = input.commercialChannel
    ? resolveEventTicketCommercialChannelDecision(
        input.commercialChannel,
        nowIso,
      )
    : null;
  const referenceDecision = input.officialReference
    ? resolveOfficialEventReferenceDecision(input.officialReference)
    : null;
  const decisionReasons: string[] = [];

  if (commercialDecision?.eligibleForPublicPurchase && commercialDecision.publicUrl) {
    decisionReasons.push("active_admin_controlled_commercial_channel_selected");

    return {
      primaryAction: {
        kind: "buy_ticket",
        label: "Comprar ingresso",
        url: commercialDecision.publicUrl,
        monetized: true,
        disclosureRequired: commercialDecision.disclosureRequired,
        disclosureText: commercialDecision.disclosureText,
      },
      legacyTechnicalTicketUrlUsed: false,
      purchaseSignalAction: {
        label: "Já comprei meu ingresso",
        records: "self_declared_purchase",
        confirmsRevenue: false,
      },
      decisionReasons,
    };
  }

  if (commercialDecision) {
    decisionReasons.push(...commercialDecision.blockingReasons);
  }

  if (referenceDecision?.eligibleForPublicReference && referenceDecision.publicUrl) {
    decisionReasons.push("validated_official_reference_selected");

    return {
      primaryAction: {
        kind: "view_official_event",
        label: "Ver evento oficial",
        url: referenceDecision.publicUrl,
        monetized: false,
        disclosureRequired: false,
        disclosureText: null,
      },
      legacyTechnicalTicketUrlUsed: false,
      purchaseSignalAction: {
        label: "Já comprei meu ingresso",
        records: "self_declared_purchase",
        confirmsRevenue: false,
      },
      decisionReasons,
    };
  }

  if (referenceDecision) {
    decisionReasons.push(...referenceDecision.blockingReasons);
  }

  if (normalizeHttpsUrl(input.legacyTechnicalTicketUrl)) {
    decisionReasons.push("legacy_technical_ticket_url_intentionally_ignored");
  }

  return {
    primaryAction: {
      kind: "ticket_channel_unavailable",
      label: "Canal de vendas a confirmar",
      url: null,
      monetized: false,
      disclosureRequired: false,
      disclosureText: null,
      supportingText:
        "Aguardando o envio de um link autorizado pelo evento ou pela ticketeira.",
    },
    legacyTechnicalTicketUrlUsed: false,
    purchaseSignalAction: {
      label: "Já comprei meu ingresso",
      records: "self_declared_purchase",
      confirmsRevenue: false,
    },
    decisionReasons,
  };
}

export function buildEventTicketCommercialGovernanceAuditIssues(input: {
  officialReference?: OfficialEventReferenceInput | null;
  partnershipRequest?: EventTicketPartnershipRequestInput | null;
  commercialChannel?: EventTicketCommercialChannelInput | null;
  nowIso?: string;
}): EventTicketCommercialGovernanceIssue[] {
  const issues: EventTicketCommercialGovernanceIssue[] = [];
  const nowIso = input.nowIso ?? new Date().toISOString();

  if (input.officialReference) {
    const decision = resolveOfficialEventReferenceDecision(
      input.officialReference,
    );

    for (const code of decision.blockingReasons) {
      issues.push(
        issue(
          code,
          "blocking",
          "officialReference",
          "A referência oficial ainda não está elegível para exposição pública.",
        ),
      );
    }
  }

  if (input.partnershipRequest) {
    const decision = resolveEventTicketPartnershipRequestDecision(
      input.partnershipRequest,
    );

    for (const code of decision.blockingReasons) {
      issues.push(
        issue(
          code,
          "blocking",
          "partnershipRequest",
          "A solicitação comercial ainda não está completa ou auditável.",
        ),
      );
    }
  }

  if (input.commercialChannel) {
    const decision = resolveEventTicketCommercialChannelDecision(
      input.commercialChannel,
      nowIso,
    );

    for (const code of decision.blockingReasons) {
      issues.push(
        issue(
          code,
          "blocking",
          "commercialChannel",
          "O canal comercial não está elegível para o botão Comprar ingresso.",
        ),
      );
    }
  }

  return issues;
}

export function runEventTicketCommercialGovernanceFoundationSelfTest(): EventTicketCommercialGovernanceSelfTestResult {
  const nowIso = "2026-07-13T18:00:00.000Z";

  const reference: OfficialEventReferenceInput = {
    canonicalEventId: "event-001",
    eventSlug: "evento-oficial-001",
    referenceUrl: "https://official.example.com/evento-001",
    sourceType: "official_event_site",
    sourceKey: "official-example",
    sourceDisplayName: "Official Example",
    status: "validated",
    confidence: 100,
    authorityScore: 100,
    validatedAt: "2026-07-13T17:00:00.000Z",
    validatedByRole: "automation",
    discoveredAutomatically: true,
  };

  const approvedRequest: EventTicketPartnershipRequestInput = {
    requestId: "request-001",
    canonicalEventId: "event-001",
    eventSlug: "evento-oficial-001",
    partnerId: "partner-001",
    partnerDisplayName: "Partner Example",
    submittedByRole: "partner_user",
    requestType: "ticket_sales_partnership",
    status: "approved",
    currentSalesUrl: "https://tickets.example.com/evento-001",
    ticketingProviderKey: "example_ticketing",
    commercialContactName: "Contato Comercial",
    commercialContactEmail: "comercial@example.com",
    proposedBenefit: "Pré-venda para Clubbers",
    reviewedByRole: "useclubbers_admin",
    reviewedAt: "2026-07-13T17:10:00.000Z",
  };

  const activeChannel: EventTicketCommercialChannelInput = {
    channelId: "channel-001",
    canonicalEventId: "event-001",
    eventSlug: "evento-oficial-001",
    sourceOrigin: "approved_partner_request",
    sourceRequestId: "request-001",
    ticketingProviderKey: "example_ticketing",
    ticketingDisplayName: "Example Ticketing",
    authorizedDomain: "tickets.example.com",
    commercialUrl: "https://tickets.example.com/evento-001?ref=useclubbers",
    trackingMethod: "query_parameter",
    trackingKey: "useclubbers",
    trackingParameterName: "ref",
    remunerationModel: "commission_percent",
    commissionPercent: 8,
    currency: "BRL",
    authorizationReference: "CONTRACT-001",
    authorizationStartsAt: "2026-07-01T00:00:00.000Z",
    authorizationEndsAt: "2026-10-01T00:00:00.000Z",
    createdByRole: "useclubbers_admin",
    authorizedByRole: "useclubbers_admin",
    activatedByRole: "useclubbers_admin",
    createdAt: "2026-07-13T17:20:00.000Z",
    authorizedAt: "2026-07-13T17:25:00.000Z",
    activatedAt: "2026-07-13T17:30:00.000Z",
    status: "active",
  };

  const commercialDecision = resolveEventTicketCommercialChannelDecision(
    activeChannel,
    nowIso,
  );
  const publicWithCommercial = resolveEventTicketPublicButtonDecision({
    officialReference: reference,
    commercialChannel: activeChannel,
    legacyTechnicalTicketUrl: "https://legacy.example.com/ticket",
    nowIso,
  });
  const publicWithReferenceOnly = resolveEventTicketPublicButtonDecision({
    officialReference: reference,
    legacyTechnicalTicketUrl: "https://legacy.example.com/ticket",
    nowIso,
  });
  const publicWithLegacyOnly = resolveEventTicketPublicButtonDecision({
    legacyTechnicalTicketUrl: "https://legacy.example.com/ticket",
    nowIso,
  });
  const approvedRequestDecision =
    resolveEventTicketPartnershipRequestDecision(approvedRequest);
  const pausedFallback = resolveEventTicketPublicButtonDecision({
    officialReference: reference,
    commercialChannel: { ...activeChannel, status: "paused" },
    nowIso,
  });
  const partnerActivated = resolveEventTicketCommercialChannelDecision(
    {
      ...activeChannel,
      activatedByRole: "partner_user",
    },
    nowIso,
  );
  const selfDeclared = resolveEventTicketPurchaseSignalDecision({
    signalType: "self_declared_purchase",
    evidenceSource: "clubber_action",
  });
  const confirmed = resolveEventTicketPurchaseSignalDecision({
    signalType: "confirmed_conversion",
    evidenceSource: "webhook",
    externalTransactionId: "tx-001",
    attributionCampaignId: "campaign-001",
  });
  const editorialCommunication = resolvePartnerOfficialCommunicationDecision(
    {
      communicationId: "communication-001",
      partnerId: "partner-001",
      communicationType: "music_release",
      status: "published",
      partnerVerified: true,
      commercialTicketPartnershipActive: false,
      submittedByRole: "partner_user",
      approvedByRole: "useclubbers_admin",
      publishedByRole: "useclubbers_admin",
      startsAt: "2026-07-01T00:00:00.000Z",
      endsAt: "2026-08-01T00:00:00.000Z",
    },
    nowIso,
  );
  const ticketCommunicationWithoutPartnership =
    resolvePartnerOfficialCommunicationDecision(
      {
        communicationId: "communication-002",
        partnerId: "partner-001",
        communicationType: "ticket_discount",
        status: "submitted",
        partnerVerified: true,
        commercialTicketPartnershipActive: false,
        submittedByRole: "partner_user",
        startsAt: "2026-07-01T00:00:00.000Z",
        endsAt: "2026-08-01T00:00:00.000Z",
      },
      nowIso,
    );

  const checks: Record<string, boolean> = {
    validated_official_reference_public: resolveOfficialEventReferenceDecision(
      reference,
    ).eligibleForPublicReference,
    commercial_channel_public_when_admin_controlled:
      commercialDecision.eligibleForPublicPurchase,
    commercial_channel_has_priority:
      publicWithCommercial.primaryAction.kind === "buy_ticket",
    reference_used_when_no_commercial_channel:
      publicWithReferenceOnly.primaryAction.kind === "view_official_event",
    paused_channel_falls_back_to_reference:
      pausedFallback.primaryAction.kind === "view_official_event",
    legacy_ticket_url_never_used:
      publicWithLegacyOnly.primaryAction.kind === "ticket_channel_unavailable" &&
      publicWithLegacyOnly.legacyTechnicalTicketUrlUsed === false,
    approved_request_never_activates_link:
      approvedRequestDecision.activatesCommercialLinkAutomatically === false &&
      approvedRequestDecision.createsCommercialChannelAutomatically === false,
    partner_cannot_activate_channel:
      !canRolePerformEventTicketGovernanceAction(
        "partner_user",
        "activate_commercial_channel",
      ) && !partnerActivated.eligibleForPublicPurchase,
    admin_can_activate_channel: canRolePerformEventTicketGovernanceAction(
      "useclubbers_admin",
      "activate_commercial_channel",
    ),
    partner_cannot_pause_channel: !canRolePerformEventTicketGovernanceAction(
      "partner_user",
      "pause_commercial_channel",
    ),
    partner_cannot_revoke_channel: !canRolePerformEventTicketGovernanceAction(
      "partner_user",
      "revoke_commercial_channel",
    ),
    self_declared_purchase_not_confirmed:
      selfDeclared.isSelfDeclaredPurchase &&
      !selfDeclared.isConfirmedConversion &&
      !selfDeclared.canBeReportedAsConfirmedRevenue,
    confirmed_conversion_requires_trusted_evidence:
      confirmed.isConfirmedConversion &&
      confirmed.canBeReportedAsConfirmedRevenue,
    editorial_communication_independent_from_ticket_partnership:
      editorialCommunication.eligibleForPublication &&
      editorialCommunication.officialCommunicationGrantsCommercialAuthorization ===
        false,
    ticket_discount_requires_commercial_partnership:
      !ticketCommunicationWithoutPartnership.eligibleForSubmission &&
      ticketCommunicationWithoutPartnership.blockingReasons.includes(
        "active_commercial_ticket_partnership_required",
      ),
    partner_never_publishes_directly:
      editorialCommunication.partnerCanPublishDirectly === false,
    revoked_channel_has_no_exit:
      !canTransitionEventTicketCommercialChannelStatus("revoked", "active"),
    partner_cannot_transition_channel:
      !canActorTransitionEventTicketCommercialChannelStatus(
        "partner_user",
        "paused",
        "active",
      ),
    admin_can_transition_authorized_to_active:
      canActorTransitionEventTicketCommercialChannelStatus(
        "useclubbers_admin",
        "authorized",
        "active",
      ),
  };

  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return {
    ok: failedChecks.length === 0,
    version: EVENT_TICKET_COMMERCIAL_GOVERNANCE_FOUNDATION_VERSION,
    checks,
    failedChecks,
    database_write_performed: false,
    public_ticket_link_activated: false,
    migration_performed: false,
  };
}
