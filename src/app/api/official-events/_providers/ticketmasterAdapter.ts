// src/app/api/official-events/_providers/ticketmasterAdapter.ts

import {
  createEmptyProviderAdapterResult,
  createProviderAdapterNotConfiguredResult,
  type OfficialEventProviderAdapter,
} from "@/app/api/official-events/_shared/providerAdapter";

export function createTicketmasterProviderAdapter(): OfficialEventProviderAdapter {
  return {
    provider: "ticketmaster",
    displayName: "Ticketmaster Discovery Adapter",
    isEnabled: true,
    requiresApiKey: true,
    search: async (context) => {
      const apiKey = process.env.TICKETMASTER_API_KEY;

      if (!apiKey) {
        return createProviderAdapterNotConfiguredResult({
          provider: "ticketmaster",
          message:
            "Ticketmaster API key is not configured. Set TICKETMASTER_API_KEY to enable the production adapter.",
        });
      }

      return createEmptyProviderAdapterResult({
        provider: "ticketmaster",
        message: `Ticketmaster adapter foundation is ready for "${context.input.query}". Real Discovery API search is not wired in this version.`,
      });
    },
  };
}
