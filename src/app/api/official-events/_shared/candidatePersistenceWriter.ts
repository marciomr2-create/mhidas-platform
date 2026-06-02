// src/app/api/official-events/_shared/candidatePersistenceWriter.ts

import { createClient } from "@supabase/supabase-js";
import {
  type OfficialEventCandidatePersistenceRow,
  buildOfficialEventCandidatePersistenceKey,
} from "./candidatePersistence";

type SupabaseAdminClient = {
  from: (table: string) => any;
};

export type OfficialEventCandidatePersistenceWriteOperation =
  | "skipped"
  | "inserted"
  | "updated"
  | "failed";

export type OfficialEventCandidatePersistenceWriteResult = {
  ok: boolean;
  operation: OfficialEventCandidatePersistenceWriteOperation;
  key: string;
  provider: OfficialEventCandidatePersistenceRow["provider"];
  provider_event_id: string | null;
  event_name: string;
  candidate_id: string | null;
  reason: string;
  error: string | null;
};

export type OfficialEventCandidatePersistenceWriteSummary = {
  saveRequested: boolean;
  saveEnabled: boolean;
  willPersist: boolean;
  receivedCount: number;
  attemptedCount: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
};

export type OfficialEventCandidatePersistenceWriteResponse = {
  ok: boolean;
  summary: OfficialEventCandidatePersistenceWriteSummary;
  results: OfficialEventCandidatePersistenceWriteResult[];
};

function normalizeNullableString(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function getSupabaseAdminClient(): SupabaseAdminClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as SupabaseAdminClient;
}

function createSkippedResult(params: {
  row: OfficialEventCandidatePersistenceRow;
  reason: string;
}): OfficialEventCandidatePersistenceWriteResult {
  return {
    ok: true,
    operation: "skipped",
    key: buildOfficialEventCandidatePersistenceKey(params.row),
    provider: params.row.provider,
    provider_event_id: params.row.provider_event_id,
    event_name: params.row.event_name,
    candidate_id: null,
    reason: params.reason,
    error: null,
  };
}

function createFailedResult(params: {
  row: OfficialEventCandidatePersistenceRow;
  reason: string;
  error: string;
}): OfficialEventCandidatePersistenceWriteResult {
  return {
    ok: false,
    operation: "failed",
    key: buildOfficialEventCandidatePersistenceKey(params.row),
    provider: params.row.provider,
    provider_event_id: params.row.provider_event_id,
    event_name: params.row.event_name,
    candidate_id: null,
    reason: params.reason,
    error: params.error,
  };
}

function isPersistableCandidateStatus(
  status: OfficialEventCandidatePersistenceRow["candidate_status"]
): boolean {
  return status === "probable" || status === "review";
}

function validateRowForAutomatedPersistence(
  row: OfficialEventCandidatePersistenceRow
): string | null {
  if (!row.provider) {
    return "Candidate provider is missing.";
  }

  if (!row.event_name) {
    return "Candidate event_name is missing.";
  }

  if (!isPersistableCandidateStatus(row.candidate_status)) {
    return "Only probable or review candidates can be persisted automatically in this version.";
  }

  return null;
}

async function findExistingCandidateId(params: {
  client: SupabaseAdminClient;
  row: OfficialEventCandidatePersistenceRow;
}): Promise<{ candidateId: string | null; error: string | null }> {
  const providerEventId = normalizeNullableString(params.row.provider_event_id);
  const officialUrl = normalizeNullableString(params.row.official_url);
  const ticketUrl = normalizeNullableString(params.row.ticket_url);

  if (providerEventId) {
    const { data, error } = await params.client
      .from("official_event_candidates")
      .select("candidate_id")
      .eq("provider", params.row.provider)
      .eq("provider_event_id", providerEventId)
      .maybeSingle();

    if (error) {
      return {
        candidateId: null,
        error: error.message || "Failed to check existing candidate by provider_event_id.",
      };
    }

    return {
      candidateId: normalizeNullableString(data?.candidate_id),
      error: null,
    };
  }

  if (officialUrl) {
    const { data, error } = await params.client
      .from("official_event_candidates")
      .select("candidate_id")
      .eq("provider", params.row.provider)
      .eq("official_url", officialUrl)
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        candidateId: null,
        error: error.message || "Failed to check existing candidate by official_url.",
      };
    }

    return {
      candidateId: normalizeNullableString(data?.candidate_id),
      error: null,
    };
  }

  if (ticketUrl) {
    const { data, error } = await params.client
      .from("official_event_candidates")
      .select("candidate_id")
      .eq("provider", params.row.provider)
      .eq("ticket_url", ticketUrl)
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        candidateId: null,
        error: error.message || "Failed to check existing candidate by ticket_url.",
      };
    }

    return {
      candidateId: normalizeNullableString(data?.candidate_id),
      error: null,
    };
  }

  return {
    candidateId: null,
    error: null,
  };
}

async function persistSingleOfficialEventCandidateRow(params: {
  client: SupabaseAdminClient;
  row: OfficialEventCandidatePersistenceRow;
  now: string;
}): Promise<OfficialEventCandidatePersistenceWriteResult> {
  const validationError = validateRowForAutomatedPersistence(params.row);

  if (validationError) {
    return createSkippedResult({
      row: params.row,
      reason: validationError,
    });
  }

  const existing = await findExistingCandidateId({
    client: params.client,
    row: params.row,
  });

  if (existing.error) {
    return createFailedResult({
      row: params.row,
      reason: "Failed before writing candidate.",
      error: existing.error,
    });
  }

  if (existing.candidateId) {
    const { error } = await params.client
      .from("official_event_candidates")
      .update({
        ...params.row,
        updated_at: params.now,
      })
      .eq("candidate_id", existing.candidateId);

    if (error) {
      return createFailedResult({
        row: params.row,
        reason: "Failed to update existing candidate.",
        error: error.message || "Unknown update error.",
      });
    }

    return {
      ok: true,
      operation: "updated",
      key: buildOfficialEventCandidatePersistenceKey(params.row),
      provider: params.row.provider,
      provider_event_id: params.row.provider_event_id,
      event_name: params.row.event_name,
      candidate_id: existing.candidateId,
      reason: "Existing candidate updated.",
      error: null,
    };
  }

  const { data, error } = await params.client
    .from("official_event_candidates")
    .insert({
      ...params.row,
      updated_at: params.now,
    })
    .select("candidate_id")
    .maybeSingle();

  if (error) {
    return createFailedResult({
      row: params.row,
      reason: "Failed to insert new candidate.",
      error: error.message || "Unknown insert error.",
    });
  }

  return {
    ok: true,
    operation: "inserted",
    key: buildOfficialEventCandidatePersistenceKey(params.row),
    provider: params.row.provider,
    provider_event_id: params.row.provider_event_id,
    event_name: params.row.event_name,
    candidate_id: normalizeNullableString(data?.candidate_id),
    reason: "New candidate inserted.",
    error: null,
  };
}

function summarizeWriteResults(params: {
  saveRequested: boolean;
  saveEnabled: boolean;
  willPersist: boolean;
  receivedCount: number;
  results: OfficialEventCandidatePersistenceWriteResult[];
}): OfficialEventCandidatePersistenceWriteSummary {
  return {
    saveRequested: params.saveRequested,
    saveEnabled: params.saveEnabled,
    willPersist: params.willPersist,
    receivedCount: params.receivedCount,
    attemptedCount: params.results.filter(
      (result) => result.operation === "inserted" || result.operation === "updated" || result.operation === "failed"
    ).length,
    insertedCount: params.results.filter((result) => result.operation === "inserted").length,
    updatedCount: params.results.filter((result) => result.operation === "updated").length,
    skippedCount: params.results.filter((result) => result.operation === "skipped").length,
    failedCount: params.results.filter((result) => result.operation === "failed").length,
  };
}

export async function persistOfficialEventCandidateRows(params: {
  saveRequested: boolean;
  rows: OfficialEventCandidatePersistenceRow[];
  now?: string;
}): Promise<OfficialEventCandidatePersistenceWriteResponse> {
  const rows = Array.isArray(params.rows) ? params.rows : [];

  if (!params.saveRequested) {
    const results = rows.map((row) =>
      createSkippedResult({
        row,
        reason: "Save was not requested.",
      })
    );

    return {
      ok: true,
      summary: summarizeWriteResults({
        saveRequested: false,
        saveEnabled: false,
        willPersist: false,
        receivedCount: rows.length,
        results,
      }),
      results,
    };
  }

  const client = getSupabaseAdminClient();

  if (!client) {
    const results = rows.map((row) =>
      createSkippedResult({
        row,
        reason: "Supabase service role is not configured.",
      })
    );

    return {
      ok: false,
      summary: summarizeWriteResults({
        saveRequested: true,
        saveEnabled: false,
        willPersist: false,
        receivedCount: rows.length,
        results,
      }),
      results,
    };
  }

  const now = params.now || new Date().toISOString();
  const results: OfficialEventCandidatePersistenceWriteResult[] = [];

  for (const row of rows) {
    results.push(
      await persistSingleOfficialEventCandidateRow({
        client,
        row,
        now,
      })
    );
  }

  const summary = summarizeWriteResults({
    saveRequested: true,
    saveEnabled: true,
    willPersist: rows.length > 0,
    receivedCount: rows.length,
    results,
  });

  return {
    ok: summary.failedCount === 0,
    summary,
    results,
  };
}