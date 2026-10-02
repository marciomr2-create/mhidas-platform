import {
  buildEventOfflinePackageKey,
  getEventOfflinePackage,
  putEventOfflinePackage,
  putPendingOfflineOperation,
  type EventOfflineOperationType,
  type EventOfflinePackageRecord,
  type PendingOfflineOperationRecord,
} from "./eventOfflineStore";

const DEFAULT_PACKAGE_TTL_MS =
  24 * 60 * 60 * 1000;

const DEFAULT_OPERATION_TTL_MS =
  24 * 60 * 60 * 1000;

export type EventOfflinePackagePayload =
  Record<string, unknown>;

type MergeEventOfflinePackageInput = {
  userId: string;
  eventGroupId: string;
  patch: EventOfflinePackagePayload;
  expiresAt?: string;
  syncedAt?: string;
};

type QueueEventOfflineOperationInput = {
  userId: string;
  eventGroupId: string;
  operationType:
    EventOfflineOperationType;
  payload: Record<string, unknown>;
  priority: number;
  capturedAt?: string;
  expiresAt?: string;
};

function normalizeId(
  value: string
): string {
  return value.trim();
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function defaultExpiry(
  now: number,
  ttlMs: number
): string {
  return new Date(
    now + ttlMs
  ).toISOString();
}

function createOperationId():
  string {
  return globalThis.crypto.randomUUID();
}

export async function readEventOfflinePackagePayload(
  userId: string,
  eventGroupId: string
): Promise<EventOfflinePackagePayload | null> {
  const safeUserId =
    normalizeId(userId);

  const safeEventGroupId =
    normalizeId(eventGroupId);

  if (
    !safeUserId ||
    !safeEventGroupId
  ) {
    return null;
  }

  const record =
    await getEventOfflinePackage(
      safeUserId,
      safeEventGroupId
    );

  if (!record) {
    return null;
  }

  const expiresAt =
    record.expires_at
      ? new Date(
          record.expires_at
        ).getTime()
      : null;

  if (
    expiresAt !== null &&
    Number.isFinite(expiresAt) &&
    expiresAt <= Date.now()
  ) {
    return null;
  }

  return isRecord(record.payload)
    ? record.payload
    : null;
}

export async function mergeEventOfflinePackagePayload({
  userId,
  eventGroupId,
  patch,
  expiresAt,
  syncedAt,
}: MergeEventOfflinePackageInput):
  Promise<EventOfflinePackageRecord | null> {
  const safeUserId =
    normalizeId(userId);

  const safeEventGroupId =
    normalizeId(eventGroupId);

  if (
    !safeUserId ||
    !safeEventGroupId
  ) {
    return null;
  }

  const now = Date.now();
  const nowIso =
    new Date(now).toISOString();

  const current =
    await getEventOfflinePackage(
      safeUserId,
      safeEventGroupId
    );

  const currentPayload =
    current &&
    isRecord(current.payload)
      ? current.payload
      : {};

  const record:
    EventOfflinePackageRecord = {
      key:
        buildEventOfflinePackageKey(
          safeUserId,
          safeEventGroupId
        ),
      user_id:
        safeUserId,
      event_group_id:
        safeEventGroupId,
      payload: {
        ...currentPayload,
        ...patch,
      },
      cached_at:
        nowIso,
      synced_at:
        syncedAt ?? nowIso,
      expires_at:
        expiresAt ??
        current?.expires_at ??
        defaultExpiry(
          now,
          DEFAULT_PACKAGE_TTL_MS
        ),
    };

  await putEventOfflinePackage(
    record
  );

  return record;
}

export async function queueEventOfflineOperation({
  userId,
  eventGroupId,
  operationType,
  payload,
  priority,
  capturedAt,
  expiresAt,
}: QueueEventOfflineOperationInput):
  Promise<PendingOfflineOperationRecord | null> {
  const safeUserId =
    normalizeId(userId);

  const safeEventGroupId =
    normalizeId(eventGroupId);

  if (
    !safeUserId ||
    !safeEventGroupId
  ) {
    return null;
  }

  const now = Date.now();
  const nowIso =
    new Date(now).toISOString();

  const record:
    PendingOfflineOperationRecord = {
      operation_id:
        createOperationId(),
      user_id:
        safeUserId,
      event_group_id:
        safeEventGroupId,
      operation_type:
        operationType,
      payload,
      priority,
      attempts: 0,
      created_at:
        nowIso,
      captured_at:
        capturedAt ?? nowIso,
      expires_at:
        expiresAt ??
        defaultExpiry(
          now,
          DEFAULT_OPERATION_TTL_MS
        ),
    };

  await putPendingOfflineOperation(
    record
  );

  return record;
}
