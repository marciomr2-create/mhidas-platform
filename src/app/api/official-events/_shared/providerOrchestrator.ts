// src/app/api/official-events/_shared/providerOrchestrator.ts

import {
  type OfficialEventCandidate,
  type OfficialEventProvider,
  type OfficialEventSearchInput,
} from "./resolverTypes";
import { getOfficialEventProviderConfig } from "./providerRegistry";
import {
  type OfficialEventProviderAdapter,
  type OfficialEventProviderAdapterSearchResult,
  createProviderAdapterDisabledResult,
  createProviderAdapterErrorResult,
  createProviderAdapterNotConfiguredResult,
} from "./providerAdapter";
import {
  type RankedOfficialEventCandidate,
  type OfficialEventCandidateRankingSummary,
  rankOfficialEventCandidates,
  summarizeOfficialEventCandidateRanking,
} from "./candidateRanking";

export type OfficialEventProviderOrchestratorOptions = {
  providers?: OfficialEventProvider[];
  requestId?: string;
  signal?: AbortSignal;
};

export type OfficialEventProviderOrchestratorSummary = {
  requestedProviderCount: number;
  executedProviderCount: number;
  candidateCount: number;
  availableCount: number;
  notConfiguredCount: number;
  disabledCount: number;
  errorCount: number;
};

export type OfficialEventProviderOrchestratorResult = {
  ok: boolean;
  input: OfficialEventSearchInput;
  providers: OfficialEventProvider[];
  results: OfficialEventProviderAdapterSearchResult[];
  candidates: OfficialEventCandidate[];
  rankedCandidates: RankedOfficialEventCandidate[];
  rankingSummary: OfficialEventCandidateRankingSummary;
  summary: OfficialEventProviderOrchestratorSummary;
};

function uniqueProviders(providers: OfficialEventProvider[]): OfficialEventProvider[] {
  return Array.from(new Set(providers));
}

function summarizeProviderResults(
  results: OfficialEventProviderAdapterSearchResult[],
  candidates: OfficialEventCandidate[]
): OfficialEventProviderOrchestratorSummary {
  return {
    requestedProviderCount: results.length,
    executedProviderCount: results.filter(
      (result) => result.status === "available" || result.status === "error"
    ).length,
    candidateCount: candidates.length,
    availableCount: results.filter((result) => result.status === "available").length,
    notConfiguredCount: results.filter((result) => result.status === "not_configured").length,
    disabledCount: results.filter((result) => result.status === "disabled").length,
    errorCount: results.filter((result) => result.status === "error").length,
  };
}

export async function runOfficialEventProviderOrchestrator(params: {
  input: OfficialEventSearchInput;
  adapters: OfficialEventProviderAdapter[];
  options?: OfficialEventProviderOrchestratorOptions;
}): Promise<OfficialEventProviderOrchestratorResult> {
  const adapterByProvider = new Map(
    params.adapters.map((adapter) => [adapter.provider, adapter])
  );

  const providers = uniqueProviders(
    params.options?.providers?.length
      ? params.options.providers
      : params.adapters.map((adapter) => adapter.provider)
  );

  const results: OfficialEventProviderAdapterSearchResult[] = [];

  for (const provider of providers) {
    const adapter = adapterByProvider.get(provider);
    const config = getOfficialEventProviderConfig(provider);

    if (!adapter) {
      results.push(
        createProviderAdapterNotConfiguredResult({
          provider,
          message: "Provider adapter has not been registered in the orchestrator.",
        })
      );
      continue;
    }

    if (!adapter.isEnabled) {
      results.push(
        createProviderAdapterDisabledResult({
          provider,
          message: "Provider adapter is registered but disabled.",
        })
      );
      continue;
    }

    try {
      const result = await adapter.search({
        input: params.input,
        config,
        requestId: params.options?.requestId,
        signal: params.options?.signal,
      });

      results.push(result);
    } catch (error) {
      results.push(
        createProviderAdapterErrorResult({
          provider,
          message: "Provider adapter failed while searching official events.",
          error,
        })
      );
    }
  }

  const rawCandidates = results.flatMap((result) => result.candidates);
  const rankedCandidates = rankOfficialEventCandidates(rawCandidates);
  const candidates = rankedCandidates.map((item) => item.candidate);
  const rankingSummary = summarizeOfficialEventCandidateRanking(rankedCandidates);
  const summary = summarizeProviderResults(results, candidates);

  return {
    ok: summary.errorCount === 0,
    input: params.input,
    providers,
    results,
    candidates,
    rankedCandidates,
    rankingSummary,
    summary,
  };
}
