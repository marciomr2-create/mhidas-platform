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
  type OfficialEventCandidateDeduplicationResult,
  deduplicateOfficialEventCandidates,
} from "./candidateDeduplication";
import {
  type RankedOfficialEventCandidate,
  type OfficialEventCandidateRankingSummary,
  rankOfficialEventCandidates,
  summarizeOfficialEventCandidateRanking,
} from "./candidateRanking";
import { prepareOfficialEventCandidatesForPersistence } from "./candidatePersistence";
import {
  type OfficialEventCandidatePersistenceWriteResponse,
  persistOfficialEventCandidateRows,
} from "./candidatePersistenceWriter";

export type OfficialEventProviderOrchestratorOptions = {
  providers?: OfficialEventProvider[];
  requestId?: string;
  signal?: AbortSignal;
  persistenceEnabled?: boolean;
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

export type OfficialEventProviderOrchestratorPersistenceControl = {
  saveRequested: boolean;
  saveEnabled: boolean;
  willPersist: boolean;
  preparedCount: number;
  skippedCount: number;
  reason: string;
};

export type OfficialEventProviderOrchestratorResult = {
  ok: boolean;
  input: OfficialEventSearchInput;
  providers: OfficialEventProvider[];
  results: OfficialEventProviderAdapterSearchResult[];
  rawCandidates: OfficialEventCandidate[];
  candidates: OfficialEventCandidate[];
  deduplicationResult: OfficialEventCandidateDeduplicationResult;
  rankedCandidates: RankedOfficialEventCandidate[];
  rankingSummary: OfficialEventCandidateRankingSummary;
  persistencePreparation: ReturnType<typeof prepareOfficialEventCandidatesForPersistence>;
  persistenceControl: OfficialEventProviderOrchestratorPersistenceControl;
  persistenceWrite: OfficialEventCandidatePersistenceWriteResponse;
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

function resolvePersistenceControl(params: {
  saveRequested: boolean;
  persistenceEnabled: boolean;
  persistencePreparation: ReturnType<typeof prepareOfficialEventCandidatesForPersistence>;
  persistenceWrite: OfficialEventCandidatePersistenceWriteResponse;
}): OfficialEventProviderOrchestratorPersistenceControl {
  const preparedCount = params.persistencePreparation.summary.preparedCount;
  const skippedCount = params.persistencePreparation.summary.skippedCount;

  if (!params.saveRequested) {
    return {
      saveRequested: false,
      saveEnabled: false,
      willPersist: false,
      preparedCount,
      skippedCount,
      reason: "Persistence preview only. No save requested.",
    };
  }

  if (!params.persistenceEnabled) {
    return {
      saveRequested: true,
      saveEnabled: false,
      willPersist: false,
      preparedCount,
      skippedCount,
      reason:
        "Persistence save=true was requested, but this route did not enable persistence.",
    };
  }

  if (!params.persistenceWrite.summary.saveEnabled) {
    return {
      saveRequested: true,
      saveEnabled: false,
      willPersist: false,
      preparedCount,
      skippedCount,
      reason:
        "Persistence save=true was requested, but Supabase persistence is not available.",
    };
  }

  if (params.persistenceWrite.summary.failedCount > 0) {
    return {
      saveRequested: true,
      saveEnabled: true,
      willPersist: params.persistenceWrite.summary.willPersist,
      preparedCount,
      skippedCount,
      reason: "Persistence executed with failures.",
    };
  }

  return {
    saveRequested: true,
    saveEnabled: true,
    willPersist: params.persistenceWrite.summary.willPersist,
    preparedCount,
    skippedCount,
    reason: params.persistenceWrite.summary.willPersist
      ? "Persistence executed by controlled Supabase writer."
      : "Persistence was enabled, but there were no rows to persist.",
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
  const deduplicationResult = deduplicateOfficialEventCandidates(rawCandidates);
  const rankedCandidates = rankOfficialEventCandidates(deduplicationResult.candidates);
  const candidates = rankedCandidates.map((item) => item.candidate);
  const rankingSummary = summarizeOfficialEventCandidateRanking(rankedCandidates);
  const persistencePreparation = prepareOfficialEventCandidatesForPersistence(candidates);

  const saveRequested = params.input.save === true;
  const persistenceEnabled = params.options?.persistenceEnabled === true;

  const persistenceWrite = await persistOfficialEventCandidateRows({
    saveRequested: saveRequested && persistenceEnabled,
    rows: persistencePreparation.rows,
  });

  const persistenceControl = resolvePersistenceControl({
    saveRequested,
    persistenceEnabled,
    persistencePreparation,
    persistenceWrite,
  });

  const summary = summarizeProviderResults(results, candidates);

  return {
    ok: summary.errorCount === 0 && persistenceWrite.ok,
    input: params.input,
    providers,
    results,
    rawCandidates,
    candidates,
    deduplicationResult,
    rankedCandidates,
    rankingSummary,
    persistencePreparation,
    persistenceControl,
    persistenceWrite,
    summary,
  };
}