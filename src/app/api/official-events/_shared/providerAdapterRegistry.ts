// src/app/api/official-events/_shared/providerAdapterRegistry.ts

import { type OfficialEventProvider } from "./resolverTypes";
import {
  type OfficialEventProviderAdapter,
  createEmptyProviderAdapterResult,
} from "./providerAdapter";

export const OFFICIAL_EVENT_PREVIEW_ADAPTERS: OfficialEventProviderAdapter[] = [
  {
    provider: "ticketmaster",
    displayName: "Ticketmaster Preview Adapter",
    isEnabled: true,
    requiresApiKey: false,
    search: async (context) =>
      createEmptyProviderAdapterResult({
        provider: "ticketmaster",
        message: `Preview adapter executed for "${context.input.query}". No external API was called.`,
      }),
  },
];

export function getOfficialEventPreviewAdapters() {
  return OFFICIAL_EVENT_PREVIEW_ADAPTERS;
}

export function getRegisteredOfficialEventPreviewProviders(): OfficialEventProvider[] {
  return OFFICIAL_EVENT_PREVIEW_ADAPTERS.map((adapter) => adapter.provider);
}

export function hasOfficialEventPreviewAdapter(
  provider: OfficialEventProvider
): boolean {
  return OFFICIAL_EVENT_PREVIEW_ADAPTERS.some(
    (adapter) => adapter.provider === provider
  );
}
