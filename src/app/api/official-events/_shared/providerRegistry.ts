// src/app/api/official-events/_shared/providerRegistry.ts

import {
  type OfficialEventDiscoveryType,
  type OfficialEventProvider,
} from "./resolverTypes";

export type OfficialEventProviderIntegrationStatus =
  | "active"
  | "planned"
  | "partnership_required"
  | "research_required"
  | "manual";

export type OfficialEventProviderCapability =
  | "event_search"
  | "artist_search"
  | "city_search"
  | "date_range_search"
  | "venue_search"
  | "official_ticket_url"
  | "official_image"
  | "commercial_api_access";

export type OfficialEventProviderRegistryItem = {
  provider: OfficialEventProvider;
  publicName: string;
  priority: number;
  primaryMarkets: string[];
  integrationStatus: OfficialEventProviderIntegrationStatus;
  requiresPartnership: boolean;
  supportedDiscoveryTypes: OfficialEventDiscoveryType[];
  capabilities: Record<OfficialEventProviderCapability, boolean>;
  strategicRole: string;
  validationNotes: string;
};

export const OFFICIAL_EVENT_PROVIDER_REGISTRY: OfficialEventProviderRegistryItem[] = [
  {
    provider: "ticketmaster",
    publicName: "Ticketmaster",
    priority: 10,
    primaryMarkets: ["global", "US", "BR"],
    integrationStatus: "active",
    requiresPartnership: false,
    supportedDiscoveryTypes: ["artist", "event", "festival", "venue", "mixed"],
    capabilities: {
      event_search: true,
      artist_search: true,
      city_search: true,
      date_range_search: true,
      venue_search: true,
      official_ticket_url: true,
      official_image: true,
      commercial_api_access: true,
    },
    strategicRole:
      "First active technical provider for official event candidates and international artist agenda validation.",
    validationNotes:
      "Already integrated as the first provider. Coverage for the Brazilian electronic scene is limited and must not be treated as the only official source.",
  },
  {
    provider: "ingresse",
    publicName: "Ingresse",
    priority: 20,
    primaryMarkets: ["BR", "SP", "electronic_scene"],
    integrationStatus: "partnership_required",
    requiresPartnership: true,
    supportedDiscoveryTypes: ["artist", "event", "festival", "party", "venue", "mixed"],
    capabilities: {
      event_search: true,
      artist_search: false,
      city_search: true,
      date_range_search: false,
      venue_search: false,
      official_ticket_url: true,
      official_image: true,
      commercial_api_access: false,
    },
    strategicRole:
      "Priority Brazilian provider for Sao Paulo electronic music events, agencies, parties and festivals.",
    validationNotes:
      "Requires official validation with Ingresse. Do not integrate through scraping. Confirm API access, partner key, commercial permission, rate limits and allowed data usage.",
  },
  {
    provider: "shotgun",
    publicName: "Shotgun",
    priority: 30,
    primaryMarkets: ["BR", "electronic_scene", "underground_scene"],
    integrationStatus: "research_required",
    requiresPartnership: true,
    supportedDiscoveryTypes: ["artist", "event", "festival", "party", "venue", "mixed"],
    capabilities: {
      event_search: true,
      artist_search: false,
      city_search: true,
      date_range_search: false,
      venue_search: false,
      official_ticket_url: true,
      official_image: true,
      commercial_api_access: false,
    },
    strategicRole:
      "Relevant provider for electronic, independent and underground events. Important for future coverage beyond mainstream ticketing.",
    validationNotes:
      "Validate official API, partnership model, commercial permission and whether public event discovery is allowed.",
  },
  {
    provider: "sympla",
    publicName: "Sympla",
    priority: 40,
    primaryMarkets: ["BR"],
    integrationStatus: "planned",
    requiresPartnership: true,
    supportedDiscoveryTypes: ["event", "festival", "party", "venue", "mixed"],
    capabilities: {
      event_search: true,
      artist_search: false,
      city_search: true,
      date_range_search: true,
      venue_search: false,
      official_ticket_url: true,
      official_image: true,
      commercial_api_access: false,
    },
    strategicRole:
      "Complementary Brazilian provider for events, festivals and parties that may not be covered by Ticketmaster or Ingresse.",
    validationNotes:
      "Validate whether API access supports public discovery for third-party platforms or only events managed by the authenticated organizer account.",
  },
  {
    provider: "blueticket",
    publicName: "Blueticket",
    priority: 50,
    primaryMarkets: ["BR", "regional_events"],
    integrationStatus: "research_required",
    requiresPartnership: true,
    supportedDiscoveryTypes: ["event", "festival", "party", "venue", "mixed"],
    capabilities: {
      event_search: true,
      artist_search: false,
      city_search: true,
      date_range_search: false,
      venue_search: false,
      official_ticket_url: true,
      official_image: false,
      commercial_api_access: false,
    },
    strategicRole:
      "Potential Brazilian ticketing provider for regional coverage and events outside the main Sao Paulo providers.",
    validationNotes:
      "Validate official developer documentation, API availability, partnership path, allowed fields and commercial usage.",
  },
  {
    provider: "eventbrite",
    publicName: "Eventbrite",
    priority: 60,
    primaryMarkets: ["global", "BR"],
    integrationStatus: "planned",
    requiresPartnership: false,
    supportedDiscoveryTypes: ["event", "festival", "party", "venue", "mixed"],
    capabilities: {
      event_search: true,
      artist_search: false,
      city_search: true,
      date_range_search: true,
      venue_search: true,
      official_ticket_url: true,
      official_image: true,
      commercial_api_access: true,
    },
    strategicRole:
      "Complementary global event discovery provider for events not covered by Brazilian ticketing partners.",
    validationNotes:
      "Validate current API access, search limitations, rate limits and terms for commercial third-party discovery.",
  },
  {
    provider: "bandsintown",
    publicName: "Bandsintown",
    priority: 70,
    primaryMarkets: ["global", "artist_agenda"],
    integrationStatus: "research_required",
    requiresPartnership: true,
    supportedDiscoveryTypes: ["artist", "event", "festival", "venue", "mixed"],
    capabilities: {
      event_search: true,
      artist_search: true,
      city_search: true,
      date_range_search: true,
      venue_search: true,
      official_ticket_url: true,
      official_image: true,
      commercial_api_access: false,
    },
    strategicRole:
      "Strong candidate for artist agenda discovery, similar to concert discovery flows used by music platforms.",
    validationNotes:
      "Validate licensing, commercial usage, API terms and whether USECLUBBERS can use it for artist agenda discovery.",
  },
  {
    provider: "manual",
    publicName: "Manual Review",
    priority: 90,
    primaryMarkets: ["BR", "global"],
    integrationStatus: "manual",
    requiresPartnership: false,
    supportedDiscoveryTypes: ["artist", "event", "festival", "party", "venue", "mixed"],
    capabilities: {
      event_search: false,
      artist_search: false,
      city_search: false,
      date_range_search: false,
      venue_search: false,
      official_ticket_url: true,
      official_image: true,
      commercial_api_access: true,
    },
    strategicRole:
      "Human/admin confirmation layer for official event candidates when automatic sources are incomplete or ambiguous.",
    validationNotes:
      "Use for official links confirmed by trusted admins, organizers, agencies, artists or verified sources.",
  },
  {
    provider: "other",
    publicName: "Other Official Source",
    priority: 100,
    primaryMarkets: ["BR", "global"],
    integrationStatus: "research_required",
    requiresPartnership: true,
    supportedDiscoveryTypes: ["artist", "event", "festival", "party", "venue", "mixed"],
    capabilities: {
      event_search: false,
      artist_search: false,
      city_search: false,
      date_range_search: false,
      venue_search: false,
      official_ticket_url: true,
      official_image: false,
      commercial_api_access: false,
    },
    strategicRole:
      "Fallback provider classification for future official sources not yet mapped in the resolver.",
    validationNotes:
      "Avoid using this as a final provider when a specific official provider can be identified.",
  },
];

export function getOfficialEventProviderRegistry() {
  return OFFICIAL_EVENT_PROVIDER_REGISTRY;
}

export function getOfficialEventProviderConfig(provider: OfficialEventProvider) {
  return OFFICIAL_EVENT_PROVIDER_REGISTRY.find(
    (item) => item.provider === provider
  );
}

export function getOfficialEventProvidersByStatus(
  status: OfficialEventProviderIntegrationStatus
) {
  return OFFICIAL_EVENT_PROVIDER_REGISTRY.filter(
    (item) => item.integrationStatus === status
  );
}

export function getOfficialEventProvidersRequiringPartnership() {
  return OFFICIAL_EVENT_PROVIDER_REGISTRY.filter(
    (item) => item.requiresPartnership
  );
}

export function getOfficialEventProvidersByDiscoveryType(
  discoveryType: OfficialEventDiscoveryType
) {
  return OFFICIAL_EVENT_PROVIDER_REGISTRY.filter((item) =>
    item.supportedDiscoveryTypes.includes(discoveryType)
  );
}
