// src/lib/events/canonicalEventAgendaRead.ts

import { createPublicClient } from "@/utils/supabase/public";

export type CanonicalEventAgendaPerformer = {
  performer_id: string;
  set_id: string;
  display_name: string;
  spotify_id: string | null;
  official_entity_id: string | null;
  role: string;
  sort_order: number;
};

export type CanonicalEventAgendaSet = {
  set_id: string;
  canonical_event_id: string;
  stage_id: string | null;
  set_title: string | null;
  starts_at: string;
  ends_at: string | null;
  publication_status: string;
  lifecycle_status: string;
  source_kind: string;
  source_url: string | null;
  source_confidence_score: number;
  schedule_revision: number;
  sort_order: number;
  performers: CanonicalEventAgendaPerformer[];
};

export type CanonicalEventAgendaStage = {
  stage_id: string;
  canonical_event_id: string;
  name: string;
  normalized_name: string;
  sort_order: number;
  status: string;
  source_url: string | null;
  sets: CanonicalEventAgendaSet[];
};

export type CanonicalEventAgendaReadResult = {
  ok: boolean;
  canonical_event_id: string;
  stages: CanonicalEventAgendaStage[];
  unassigned_sets: CanonicalEventAgendaSet[];
  all_sets: CanonicalEventAgendaSet[];
  summary: {
    stage_count: number;
    set_count: number;
    performer_count: number;
    unassigned_set_count: number;
    cancelled_set_count: number;
  };
  error: string | null;
};

type StageRow = Omit<CanonicalEventAgendaStage, "sets">;

type SetRow = Omit<CanonicalEventAgendaSet, "performers">;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function mapStageRow(row: Record<string, unknown>): StageRow | null {
  const stageId = normalizeText(row.stage_id);
  const canonicalEventId = normalizeText(row.canonical_event_id);
  const name = normalizeText(row.name);

  if (!stageId || !canonicalEventId || !name) {
    return null;
  }

  return {
    stage_id: stageId,
    canonical_event_id: canonicalEventId,
    name,
    normalized_name: normalizeText(row.normalized_name),
    sort_order: normalizeNumber(row.sort_order),
    status: normalizeText(row.status),
    source_url: normalizeText(row.source_url) || null,
  };
}

function mapSetRow(row: Record<string, unknown>): SetRow | null {
  const setId = normalizeText(row.set_id);
  const canonicalEventId = normalizeText(row.canonical_event_id);
  const startsAt = normalizeText(row.starts_at);

  if (!setId || !canonicalEventId || !startsAt) {
    return null;
  }

  return {
    set_id: setId,
    canonical_event_id: canonicalEventId,
    stage_id: normalizeText(row.stage_id) || null,
    set_title: normalizeText(row.set_title) || null,
    starts_at: startsAt,
    ends_at: normalizeText(row.ends_at) || null,
    publication_status: normalizeText(row.publication_status),
    lifecycle_status: normalizeText(row.lifecycle_status),
    source_kind: normalizeText(row.source_kind),
    source_url: normalizeText(row.source_url) || null,
    source_confidence_score: normalizeNumber(row.source_confidence_score),
    schedule_revision: normalizeNumber(row.schedule_revision),
    sort_order: normalizeNumber(row.sort_order),
  };
}

function mapPerformerRow(
  row: Record<string, unknown>
): CanonicalEventAgendaPerformer | null {
  const performerId = normalizeText(row.performer_id);
  const setId = normalizeText(row.set_id);
  const displayName = normalizeText(row.display_name);

  if (!performerId || !setId || !displayName) {
    return null;
  }

  return {
    performer_id: performerId,
    set_id: setId,
    display_name: displayName,
    spotify_id: normalizeText(row.spotify_id) || null,
    official_entity_id: normalizeText(row.official_entity_id) || null,
    role: normalizeText(row.role),
    sort_order: normalizeNumber(row.sort_order),
  };
}

function emptyResult(
  canonicalEventId: string,
  error: string | null = null
): CanonicalEventAgendaReadResult {
  return {
    ok: error === null,
    canonical_event_id: canonicalEventId,
    stages: [],
    unassigned_sets: [],
    all_sets: [],
    summary: {
      stage_count: 0,
      set_count: 0,
      performer_count: 0,
      unassigned_set_count: 0,
      cancelled_set_count: 0,
    },
    error,
  };
}

export async function readCanonicalEventAgenda(
  canonicalEventId: string
): Promise<CanonicalEventAgendaReadResult> {
  const normalizedEventId = normalizeText(canonicalEventId);

  if (!normalizedEventId) {
    return emptyResult("", "missing_canonical_event_id");
  }

  try {
    const supabase = createPublicClient();

    const [stagesResult, setsResult] = await Promise.all([
      supabase
        .from("canonical_event_stages")
        .select(
          "stage_id,canonical_event_id,name,normalized_name,sort_order,status,source_url"
        )
        .eq("canonical_event_id", normalizedEventId)
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("canonical_event_sets")
        .select(
          "set_id,canonical_event_id,stage_id,set_title,starts_at,ends_at,publication_status,lifecycle_status,source_kind,source_url,source_confidence_score,schedule_revision,sort_order"
        )
        .eq("canonical_event_id", normalizedEventId)
        .eq("publication_status", "published")
        .order("starts_at", { ascending: true })
        .order("sort_order", { ascending: true }),
    ]);

    if (stagesResult.error) {
      return emptyResult(
        normalizedEventId,
        `agenda_stage_read_failed:${stagesResult.error.message}`
      );
    }

    if (setsResult.error) {
      return emptyResult(
        normalizedEventId,
        `agenda_set_read_failed:${setsResult.error.message}`
      );
    }

    const stages = ((stagesResult.data ?? []) as Record<string, unknown>[])
      .map(mapStageRow)
      .filter((item): item is StageRow => item !== null);

    const setRows = ((setsResult.data ?? []) as Record<string, unknown>[])
      .map(mapSetRow)
      .filter((item): item is SetRow => item !== null);

    const setIds = setRows.map((item) => item.set_id);

    let performers: CanonicalEventAgendaPerformer[] = [];

    if (setIds.length > 0) {
      const performersResult = await supabase
        .from("canonical_event_set_performers")
        .select(
          "performer_id,set_id,display_name,spotify_id,official_entity_id,role,sort_order"
        )
        .in("set_id", setIds)
        .order("sort_order", { ascending: true })
        .order("display_name", { ascending: true });

      if (performersResult.error) {
        return emptyResult(
          normalizedEventId,
          `agenda_performer_read_failed:${performersResult.error.message}`
        );
      }

      performers = (
        (performersResult.data ?? []) as Record<string, unknown>[]
      )
        .map(mapPerformerRow)
        .filter(
          (item): item is CanonicalEventAgendaPerformer => item !== null
        );
    }

    const performersBySetId = new Map<
      string,
      CanonicalEventAgendaPerformer[]
    >();

    for (const performer of performers) {
      const current = performersBySetId.get(performer.set_id) ?? [];
      current.push(performer);
      performersBySetId.set(performer.set_id, current);
    }

    const allSets: CanonicalEventAgendaSet[] = setRows.map((setRow) => ({
      ...setRow,
      performers: performersBySetId.get(setRow.set_id) ?? [],
    }));

    const setsByStageId = new Map<string, CanonicalEventAgendaSet[]>();

    for (const setRow of allSets) {
      if (!setRow.stage_id) {
        continue;
      }

      const current = setsByStageId.get(setRow.stage_id) ?? [];
      current.push(setRow);
      setsByStageId.set(setRow.stage_id, current);
    }

    const hydratedStages: CanonicalEventAgendaStage[] = stages.map(
      (stage) => ({
        ...stage,
        sets: setsByStageId.get(stage.stage_id) ?? [],
      })
    );

    const activeStageIds = new Set(
      hydratedStages.map((stage) => stage.stage_id)
    );

    const unassignedSets = allSets.filter(
      (setRow) =>
        setRow.stage_id === null ||
        !activeStageIds.has(setRow.stage_id)
    );

    return {
      ok: true,
      canonical_event_id: normalizedEventId,
      stages: hydratedStages,
      unassigned_sets: unassignedSets,
      all_sets: allSets,
      summary: {
        stage_count: hydratedStages.length,
        set_count: allSets.length,
        performer_count: performers.length,
        unassigned_set_count: unassignedSets.length,
        cancelled_set_count: allSets.filter(
          (item) => item.lifecycle_status === "cancelled"
        ).length,
      },
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "unknown_agenda_read_error";

    return emptyResult(
      normalizedEventId,
      `agenda_read_failed:${message}`
    );
  }
}