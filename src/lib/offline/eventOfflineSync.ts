import { createBrowserClient } from "@/utils/supabase/client";
import {
  deletePendingOfflineOperation,
  listPendingOfflineOperations,
  pruneExpiredEventOfflineData,
  purgeEventOfflineDataExceptUser,
  type PendingOfflineOperationRecord,
} from "@/lib/offline/eventOfflineStore";

const LOCATION_MAX_AGE_MS = 5 * 60 * 1000;

const TERMINAL_SERVER_STATUSES = new Set([
  400,
  403,
  404,
  409,
]);

const REUNION_CONSENT_ACTIONS = new Set([
  "request_person",
  "respond_person",
  "set_meetup_consent",
]);

export type EventOfflineSyncStatus =
  | "updated"
  | "updated_with_discrepancies"
  | "nothing_to_sync"
  | "waiting_for_connection"
  | "authentication_required"
  | "sync_deferred";

export type EventOfflineSyncResult = {
  status: EventOfflineSyncStatus;
  processed: number;
  synced: number;
  discarded: number;
  failed: number;
  discrepancies: string[];
};

type SyncRequest = {
  path: string;
  body: Record<string, unknown>;
};

function isOnline(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return navigator.onLine !== false;
}

function asText(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function asFiniteNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? numeric
    : null;
}

function asIsoTimestamp(
  value: unknown
): string | null {
  const text = asText(value);

  if (!text) {
    return null;
  }

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function createdAtMs(
  operation: PendingOfflineOperationRecord
): number {
  return new Date(
    operation.created_at
  ).getTime();
}

function capturedAtMs(
  operation: PendingOfflineOperationRecord
): number {
  const value =
    operation.captured_at ??
    operation.created_at;

  return new Date(value).getTime();
}

function operationRank(
  operation: PendingOfflineOperationRecord
): number {
  if (
    operation.operation_type ===
    "reunion_revoke"
  ) {
    return 0;
  }

  if (
    operation.operation_type ===
    "reunion_consent_intent"
  ) {
    return 10;
  }

  if (
    operation.operation_type ===
    "agenda_set"
  ) {
    return 20;
  }

  if (
    operation.operation_type ===
    "presence_clear"
  ) {
    return 30;
  }

  if (
    operation.operation_type ===
    "presence_set"
  ) {
    return 31;
  }

  if (
    operation.operation_type ===
    "reunion_meetup_point"
  ) {
    return 40;
  }

  return 50;
}

function newestOperation(
  left: PendingOfflineOperationRecord,
  right: PendingOfflineOperationRecord
): PendingOfflineOperationRecord {
  return capturedAtMs(right) >=
    capturedAtMs(left)
    ? right
    : left;
}

function buildSyncPlan(
  operations: PendingOfflineOperationRecord[],
  nowMs: number
): {
  ready: PendingOfflineOperationRecord[];
  discard: PendingOfflineOperationRecord[];
} {
  const discardById = new Map<
    string,
    PendingOfflineOperationRecord
  >();

  const keepById = new Map<
    string,
    PendingOfflineOperationRecord
  >();

  const revokeExists = operations.some(
    (operation) =>
      operation.operation_type ===
      "reunion_revoke"
  );

  const newestLocation = operations
    .filter(
      (operation) =>
        operation.operation_type ===
        "reunion_location"
    )
    .reduce<
      PendingOfflineOperationRecord | null
    >(
      (current, operation) =>
        current
          ? newestOperation(
              current,
              operation
            )
          : operation,
      null
    );

  const agendaBySet = new Map<
    string,
    PendingOfflineOperationRecord
  >();

  const meetupPointByMeetup = new Map<
    string,
    PendingOfflineOperationRecord
  >();

  let newestPresence:
    | PendingOfflineOperationRecord
    | null = null;

  for (const operation of operations) {
    if (
      revokeExists &&
      operation.operation_type ===
        "reunion_consent_intent"
    ) {
      discardById.set(
        operation.operation_id,
        operation
      );
      continue;
    }

    if (
      operation.operation_type ===
      "reunion_location"
    ) {
      const ageMs =
        nowMs -
        capturedAtMs(operation);

      if (
        revokeExists ||
        ageMs < 0 ||
        ageMs > LOCATION_MAX_AGE_MS ||
        operation.operation_id !==
          newestLocation?.operation_id
      ) {
        discardById.set(
          operation.operation_id,
          operation
        );
      } else {
        keepById.set(
          operation.operation_id,
          operation
        );
      }

      continue;
    }

    if (
      operation.operation_type ===
      "agenda_set"
    ) {
      const setId = asText(
        operation.payload.set_id
      );

      if (!setId) {
        discardById.set(
          operation.operation_id,
          operation
        );
        continue;
      }

      const existing =
        agendaBySet.get(setId);

      agendaBySet.set(
        setId,
        existing
          ? newestOperation(
              existing,
              operation
            )
          : operation
      );

      continue;
    }

    if (
      operation.operation_type ===
        "presence_set" ||
      operation.operation_type ===
        "presence_clear"
    ) {
      newestPresence =
        newestPresence
          ? newestOperation(
              newestPresence,
              operation
            )
          : operation;

      continue;
    }

    if (
      operation.operation_type ===
      "reunion_meetup_point"
    ) {
      const meetupId = asText(
        operation.payload.meetup_id
      );

      if (!meetupId) {
        discardById.set(
          operation.operation_id,
          operation
        );
        continue;
      }

      const existing =
        meetupPointByMeetup.get(
          meetupId
        );

      meetupPointByMeetup.set(
        meetupId,
        existing
          ? newestOperation(
              existing,
              operation
            )
          : operation
      );

      continue;
    }

    keepById.set(
      operation.operation_id,
      operation
    );
  }

  for (const operation of operations) {
    if (
      operation.operation_type ===
      "agenda_set"
    ) {
      const setId = asText(
        operation.payload.set_id
      );

      if (
        setId &&
        agendaBySet.get(setId)
          ?.operation_id ===
          operation.operation_id
      ) {
        keepById.set(
          operation.operation_id,
          operation
        );
      } else {
        discardById.set(
          operation.operation_id,
          operation
        );
      }
    }

    if (
      operation.operation_type ===
        "presence_set" ||
      operation.operation_type ===
        "presence_clear"
    ) {
      if (
        newestPresence?.operation_id ===
        operation.operation_id
      ) {
        keepById.set(
          operation.operation_id,
          operation
        );
      } else {
        discardById.set(
          operation.operation_id,
          operation
        );
      }
    }

    if (
      operation.operation_type ===
      "reunion_meetup_point"
    ) {
      const meetupId = asText(
        operation.payload.meetup_id
      );

      if (
        meetupId &&
        meetupPointByMeetup.get(
          meetupId
        )?.operation_id ===
          operation.operation_id
      ) {
        keepById.set(
          operation.operation_id,
          operation
        );
      } else {
        discardById.set(
          operation.operation_id,
          operation
        );
      }
    }
  }

  for (const operationId of discardById.keys()) {
    keepById.delete(operationId);
  }

  const ready = Array.from(
    keepById.values()
  ).sort((left, right) => {
    const rankDifference =
      operationRank(left) -
      operationRank(right);

    if (rankDifference !== 0) {
      return rankDifference;
    }

    return (
      createdAtMs(left) -
      createdAtMs(right)
    );
  });

  return {
    ready,
    discard: Array.from(
      discardById.values()
    ),
  };
}

function buildSyncRequest(
  operation: PendingOfflineOperationRecord,
  nowMs: number
): SyncRequest | null {
  const payload = operation.payload;

  if (
    operation.operation_type ===
    "reunion_revoke"
  ) {
    const consentId = asText(
      payload.consent_id
    );

    if (!consentId) {
      return null;
    }

    return {
      path: "/api/event-reunion",
      body: {
        action: "revoke_consent",
        consent_id: consentId,
      },
    };
  }

  if (
    operation.operation_type ===
    "reunion_location"
  ) {
    const capturedAt =
      asIsoTimestamp(
        operation.captured_at ??
          payload.captured_at
      );

    const latitude =
      asFiniteNumber(
        payload.latitude
      );

    const longitude =
      asFiniteNumber(
        payload.longitude
      );

    const accuracyMeters =
      asFiniteNumber(
        payload.accuracy_meters
      );

    if (
      !capturedAt ||
      latitude === null ||
      longitude === null ||
      accuracyMeters === null ||
      nowMs -
        new Date(
          capturedAt
        ).getTime() >
        LOCATION_MAX_AGE_MS
    ) {
      return null;
    }

    return {
      path: "/api/event-reunion",
      body: {
        action: "update_location",
        event_group_id:
          operation.event_group_id,
        latitude,
        longitude,
        accuracy_meters:
          accuracyMeters,
        captured_at: capturedAt,
      },
    };
  }

  if (
    operation.operation_type ===
    "reunion_meetup_point"
  ) {
    const meetupId = asText(
      payload.meetup_id
    );

    const label = asText(
      payload.label
    );

    const capturedAt =
      asIsoTimestamp(
        operation.captured_at ??
          payload.captured_at
      );

    const expiresAt =
      asIsoTimestamp(
        operation.expires_at ??
          payload.expires_at
      );

    const latitude =
      asFiniteNumber(
        payload.latitude
      );

    const longitude =
      asFiniteNumber(
        payload.longitude
      );

    const accuracyValue =
      payload.accuracy_meters;

    const accuracyMeters =
      accuracyValue === null ||
      accuracyValue === undefined ||
      accuracyValue === ""
        ? null
        : asFiniteNumber(
            accuracyValue
          );

    if (
      !meetupId ||
      !label ||
      !capturedAt ||
      !expiresAt ||
      new Date(expiresAt).getTime() <=
        nowMs ||
      latitude === null ||
      longitude === null ||
      (
        accuracyValue !== null &&
        accuracyValue !== undefined &&
        accuracyValue !== "" &&
        accuracyMeters === null
      )
    ) {
      return null;
    }

    return {
      path: "/api/event-reunion",
      body: {
        action: "set_meetup_point",
        event_group_id:
          operation.event_group_id,
        meetup_id: meetupId,
        label,
        latitude,
        longitude,
        accuracy_meters:
          accuracyMeters,
        captured_at: capturedAt,
        expires_at: expiresAt,
      },
    };
  }

  if (
    operation.operation_type ===
    "reunion_consent_intent"
  ) {
    const action = asText(
      payload.action
    );

    if (
      !action ||
      !REUNION_CONSENT_ACTIONS.has(
        action
      )
    ) {
      return null;
    }

    return {
      path: "/api/event-reunion",
      body: {
        ...payload,
        action,
        event_group_id:
          operation.event_group_id,
      },
    };
  }

  if (
    operation.operation_type ===
    "agenda_set"
  ) {
    const action = asText(
      payload.action
    );

    const canonicalEventId =
      asText(
        payload.canonical_event_id
      );

    const setId = asText(
      payload.set_id
    );

    if (
      (
        action !== "save" &&
        action !== "remove"
      ) ||
      !canonicalEventId ||
      !setId
    ) {
      return null;
    }

    return {
      path:
        "/api/official-events/canonical/agenda/me",
      body: {
        action,
        canonical_event_id:
          canonicalEventId,
        set_id: setId,
      },
    };
  }

  if (
    operation.operation_type ===
    "presence_clear"
  ) {
    return {
      path:
        "/api/event-presence-statuses",
      body: {
        action: "clear",
        event_group_id:
          operation.event_group_id,
      },
    };
  }

  if (
    operation.operation_type ===
    "presence_set"
  ) {
    const status = asText(
      payload.status
    );

    const expiresAt =
      asIsoTimestamp(
        operation.expires_at
      );

    if (
      !status ||
      !expiresAt ||
      new Date(
        expiresAt
      ).getTime() <= nowMs
    ) {
      return null;
    }

    return {
      path:
        "/api/event-presence-statuses",
      body: {
        action: "set",
        event_group_id:
          operation.event_group_id,
        status,
        meetup_id:
          asText(
            payload.meetup_id
          ),
        set_id:
          asText(
            payload.set_id
          ),
      },
    };
  }

  return null;
}

async function postSyncRequest(
  request: SyncRequest
): Promise<Response> {
  return fetch(request.path, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type":
        "application/json",
    },
    body: JSON.stringify(
      request.body
    ),
  });
}

async function readCurrentUserId(): Promise<{
  userId: string | null;
  authAvailable: boolean;
}> {
  try {
    const supabase =
      createBrowserClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return {
        userId: null,
        authAvailable: false,
      };
    }

    return {
      userId: user?.id ?? null,
      authAvailable: true,
    };
  } catch {
    return {
      userId: null,
      authAvailable: false,
    };
  }
}

function emptyResult(
  status: EventOfflineSyncStatus
): EventOfflineSyncResult {
  return {
    status,
    processed: 0,
    synced: 0,
    discarded: 0,
    failed: 0,
    discrepancies: [],
  };
}

export async function syncEventOfflineOperations(
  eventGroupId: string
): Promise<EventOfflineSyncResult> {
  const normalizedEventGroupId =
    eventGroupId.trim();

  if (!normalizedEventGroupId) {
    return emptyResult(
      "sync_deferred"
    );
  }

  if (!isOnline()) {
    return emptyResult(
      "waiting_for_connection"
    );
  }

  const auth =
    await readCurrentUserId();

  if (!auth.authAvailable) {
    return emptyResult(
      "sync_deferred"
    );
  }

  if (!auth.userId) {
    return emptyResult(
      "authentication_required"
    );
  }

  let operations:
    PendingOfflineOperationRecord[];

  try {
    await purgeEventOfflineDataExceptUser(
      auth.userId
    );

    await pruneExpiredEventOfflineData();

    operations =
      await listPendingOfflineOperations(
        auth.userId,
        normalizedEventGroupId
      );
  } catch {
    return emptyResult(
      "sync_deferred"
    );
  }

  if (operations.length === 0) {
    return emptyResult(
      "nothing_to_sync"
    );
  }

  const result:
    EventOfflineSyncResult = {
      status: "updated",
      processed: 0,
      synced: 0,
      discarded: 0,
      failed: 0,
      discrepancies: [],
    };

  const {
    ready,
    discard,
  } = buildSyncPlan(
    operations,
    Date.now()
  );

  for (const operation of discard) {
    await deletePendingOfflineOperation(
      operation.operation_id
    );

    result.discarded += 1;
  }

  for (const operation of ready) {
    result.processed += 1;

    const request =
      buildSyncRequest(
        operation,
        Date.now()
      );

    if (!request) {
      await deletePendingOfflineOperation(
        operation.operation_id
      );

      result.discarded += 1;
      result.discrepancies.push(
        `${operation.operation_type}:invalid_or_stale`
      );

      continue;
    }

    let response: Response;

    try {
      response =
        await postSyncRequest(
          request
        );
    } catch {
      result.failed += 1;
      result.status =
        "waiting_for_connection";

      return result;
    }

    if (response.ok) {
      await deletePendingOfflineOperation(
        operation.operation_id
      );

      result.synced += 1;
      continue;
    }

    if (response.status === 401) {
      result.failed += 1;
      result.status =
        "authentication_required";

      return result;
    }

    if (
      TERMINAL_SERVER_STATUSES.has(
        response.status
      )
    ) {
      await deletePendingOfflineOperation(
        operation.operation_id
      );

      result.discarded += 1;
      result.discrepancies.push(
        `${operation.operation_type}:server_${response.status}`
      );

      continue;
    }

    result.failed += 1;
    result.status = "sync_deferred";

    return result;
  }

  result.status =
    result.discrepancies.length > 0
      ? "updated_with_discrepancies"
      : "updated";

  return result;
}

export function installEventOfflineSyncListeners(
  eventGroupId: string,
  onResult?: (
    result: EventOfflineSyncResult
  ) => void
): () => void {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    return () => undefined;
  }

  let running = false;

  const run = async () => {
    if (running) {
      return;
    }

    running = true;

    try {
      const result =
        await syncEventOfflineOperations(
          eventGroupId
        );

      onResult?.(result);
    } catch {
      onResult?.(
        emptyResult(
          "sync_deferred"
        )
      );
    } finally {
      running = false;
    }
  };

  const handleOnline = () => {
    void run();
  };

  const handleFocus = () => {
    void run();
  };

  const handleVisibility = () => {
    if (
      document.visibilityState ===
      "visible"
    ) {
      void run();
    }
  };

  window.addEventListener(
    "online",
    handleOnline
  );

  window.addEventListener(
    "focus",
    handleFocus
  );

  document.addEventListener(
    "visibilitychange",
    handleVisibility
  );

  return () => {
    window.removeEventListener(
      "online",
      handleOnline
    );

    window.removeEventListener(
      "focus",
      handleFocus
    );

    document.removeEventListener(
      "visibilitychange",
      handleVisibility
    );
  };
}
