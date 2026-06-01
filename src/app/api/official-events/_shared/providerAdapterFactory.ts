// src/app/api/official-events/_shared/providerAdapterFactory.ts

import { type OfficialEventProvider } from "./resolverTypes";
import { getOfficialEventProviderRegistry } from "./providerRegistry";
import { type OfficialEventProviderAdapter } from "./providerAdapter";
import { getOfficialEventPreviewAdapters } from "./providerAdapterRegistry";

export type OfficialEventAdapterFactoryMode = "preview" | "production";

export type OfficialEventAdapterFactoryOptions = {
  mode?: OfficialEventAdapterFactoryMode;
  providers?: OfficialEventProvider[];
  includeDisabled?: boolean;
};

function filterAdaptersByProvider(
  adapters: OfficialEventProviderAdapter[],
  providers?: OfficialEventProvider[]
): OfficialEventProviderAdapter[] {
  if (!providers?.length) return adapters;

  const allowedProviders = new Set(providers);

  return adapters.filter((adapter) => allowedProviders.has(adapter.provider));
}

function filterAdaptersByEnabledStatus(
  adapters: OfficialEventProviderAdapter[],
  includeDisabled: boolean
): OfficialEventProviderAdapter[] {
  if (includeDisabled) return adapters;

  return adapters.filter((adapter) => adapter.isEnabled);
}

export function getOfficialEventProviderAdapters(
  options: OfficialEventAdapterFactoryOptions = {}
): OfficialEventProviderAdapter[] {
  const mode = options.mode ?? "preview";
  const includeDisabled = options.includeDisabled ?? false;

  const adapters =
    mode === "preview"
      ? getOfficialEventPreviewAdapters()
      : [];

  return filterAdaptersByEnabledStatus(
    filterAdaptersByProvider(adapters, options.providers),
    includeDisabled
  );
}

export function getOfficialEventProviderAdapterFactorySummary(
  options: OfficialEventAdapterFactoryOptions = {}
) {
  const registry = getOfficialEventProviderRegistry();
  const adapters = getOfficialEventProviderAdapters(options);
  const adapterProviders = new Set(adapters.map((adapter) => adapter.provider));

  return {
    mode: options.mode ?? "preview",
    registeredProviderCount: registry.length,
    adapterCount: adapters.length,
    providersWithAdapters: registry
      .filter((item) => adapterProviders.has(item.provider))
      .map((item) => item.provider),
    providersWithoutAdapters: registry
      .filter((item) => !adapterProviders.has(item.provider))
      .map((item) => item.provider),
  };
}
