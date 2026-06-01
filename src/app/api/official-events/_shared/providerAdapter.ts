// src/app/api/official-events/_shared/providerAdapter.ts

import {
  type JsonRecord,
  type OfficialEventCandidate,
  type OfficialEventProvider,
  type OfficialEventSearchInput,
} from "./resolverTypes";
import { type OfficialEventProviderRegistryItem } from "./providerRegistry";

export type OfficialEventProviderAdapterStatus =
  | "available"
  | "not_configured"
  | "disabled"
  | "error";

export type OfficialEventProviderAdapterContext = {
  input: OfficialEventSearchInput;
  config?: OfficialEventProviderRegistryItem;
  requestId?: string;
  signal?: AbortSignal;
};

export type OfficialEventProviderAdapterSearchResult = {
  ok: boolean;
  provider: OfficialEventProvider;
  status: OfficialEventProviderAdapterStatus;
  message: string;
  candidates: OfficialEventCandidate[];
  raw: JsonRecord | null;
  error: string | null;
};

export type OfficialEventProviderAdapter = {
  provider: OfficialEventProvider;
  displayName: string;
  isEnabled: boolean;
  requiresApiKey: boolean;
  search: (
    context: OfficialEventProviderAdapterContext
  ) => Promise<OfficialEventProviderAdapterSearchResult>;
};

export function createEmptyProviderAdapterResult(params: {
  provider: OfficialEventProvider;
  status?: OfficialEventProviderAdapterStatus;
  message?: string;
}): OfficialEventProviderAdapterSearchResult {
  return {
    ok: true,
    provider: params.provider,
    status: params.status ?? "available",
    message: params.message ?? "No official event candidates found.",
    candidates: [],
    raw: null,
    error: null,
  };
}

export function createProviderAdapterErrorResult(params: {
  provider: OfficialEventProvider;
  message: string;
  error?: unknown;
}): OfficialEventProviderAdapterSearchResult {
  const errorMessage =
    params.error instanceof Error
      ? params.error.message
      : params.error
        ? String(params.error)
        : params.message;

  return {
    ok: false,
    provider: params.provider,
    status: "error",
    message: params.message,
    candidates: [],
    raw: null,
    error: errorMessage,
  };
}

export function createProviderAdapterDisabledResult(params: {
  provider: OfficialEventProvider;
  message?: string;
}): OfficialEventProviderAdapterSearchResult {
  return {
    ok: false,
    provider: params.provider,
    status: "disabled",
    message: params.message ?? "Provider adapter is disabled.",
    candidates: [],
    raw: null,
    error: null,
  };
}

export function createProviderAdapterNotConfiguredResult(params: {
  provider: OfficialEventProvider;
  message?: string;
}): OfficialEventProviderAdapterSearchResult {
  return {
    ok: false,
    provider: params.provider,
    status: "not_configured",
    message: params.message ?? "Provider adapter is not configured.",
    candidates: [],
    raw: null,
    error: null,
  };
}
