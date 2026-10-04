export const EVENT_OFFLINE_DB_NAME =
  "mhidas-event-offline-v1";

export const EVENT_OFFLINE_DB_VERSION = 1;

const EVENT_PACKAGE_STORE = "event_packages";
const REUNION_SNAPSHOT_STORE = "reunion_snapshots";
const PENDING_OPERATION_STORE = "pending_operations";

const USER_ID_INDEX = "by_user_id";
const USER_EVENT_INDEX = "by_user_event";
const USER_EVENT_PRIORITY_INDEX =
  "by_user_event_priority";

export type EventOfflinePackageRecord = {
  key: string;
  user_id: string;
  event_group_id: string;
  payload: Record<string, unknown>;
  synced_at: string;
  cached_at: string;
  expires_at: string | null;
};

export type ReunionOfflineTargetKind =
  | "person"
  | "meetup";

export type ReunionOfflineSnapshotRecord = {
  key: string;
  user_id: string;
  event_group_id: string;
  target_kind: ReunionOfflineTargetKind;
  target_id: string;
  target_label: string | null;
  target_photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  captured_at: string | null;
  received_at: string | null;
  meetup_point_label: string | null;
  meetup_point_latitude: number | null;
  meetup_point_longitude: number | null;
  meetup_point_accuracy_meters: number | null;
  meetup_point_captured_at: string | null;
  cached_at: string;
  expires_at: string | null;
};

export type EventOfflineOperationType =
  | "agenda_set"
  | "presence_set"
  | "presence_clear"
  | "reunion_revoke"
  | "reunion_location"
  | "reunion_meetup_point"
  | "reunion_consent_intent";

export type PendingOfflineOperationRecord = {
  operation_id: string;
  user_id: string;
  event_group_id: string;
  operation_type: EventOfflineOperationType;
  payload: Record<string, unknown>;
  created_at: string;
  captured_at: string | null;
  expires_at: string | null;
  priority: number;
  attempts: number;
};

type OfflineStoreName =
  | typeof EVENT_PACKAGE_STORE
  | typeof REUNION_SNAPSHOT_STORE
  | typeof PENDING_OPERATION_STORE;

function assertNonEmpty(
  value: string,
  fieldName: string
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(
      `Offline store requires ${fieldName}.`
    );
  }

  return normalized;
}

function asIsoTimestamp(
  value: string | null | undefined
): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      "Offline store received an invalid timestamp."
    );
  }

  return parsed.toISOString();
}

function isExpired(
  expiresAt: string | null,
  nowMs: number
): boolean {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() <= nowMs;
}

function requestToPromise<T>(
  request: IDBRequest<T>
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () =>
      resolve(request.result);

    request.onerror = () =>
      reject(
        request.error ??
          new Error("IndexedDB request failed.")
      );
  });
}

function transactionDone(
  transaction: IDBTransaction
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();

    transaction.onabort = () =>
      reject(
        transaction.error ??
          new Error("IndexedDB transaction aborted.")
      );

    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error("IndexedDB transaction failed.")
      );
  });
}

function createIndexes(
  store: IDBObjectStore,
  includePriority = false
) {
  if (!store.indexNames.contains(USER_ID_INDEX)) {
    store.createIndex(
      USER_ID_INDEX,
      "user_id",
      { unique: false }
    );
  }

  if (!store.indexNames.contains(USER_EVENT_INDEX)) {
    store.createIndex(
      USER_EVENT_INDEX,
      ["user_id", "event_group_id"],
      { unique: false }
    );
  }

  if (
    includePriority &&
    !store.indexNames.contains(
      USER_EVENT_PRIORITY_INDEX
    )
  ) {
    store.createIndex(
      USER_EVENT_PRIORITY_INDEX,
      [
        "user_id",
        "event_group_id",
        "priority",
        "created_at",
      ],
      { unique: false }
    );
  }
}

export function buildEventOfflinePackageKey(
  userId: string,
  eventGroupId: string
): string {
  return [
    assertNonEmpty(userId, "user_id"),
    assertNonEmpty(
      eventGroupId,
      "event_group_id"
    ),
  ].join(":");
}

export function buildReunionOfflineSnapshotKey(
  userId: string,
  eventGroupId: string,
  targetKind: ReunionOfflineTargetKind,
  targetId: string
): string {
  return [
    assertNonEmpty(userId, "user_id"),
    assertNonEmpty(
      eventGroupId,
      "event_group_id"
    ),
    targetKind,
    assertNonEmpty(targetId, "target_id"),
  ].join(":");
}

export function openEventOfflineDatabase():
  Promise<IDBDatabase> {
  return new Promise<IDBDatabase>(
    (resolve, reject) => {
      if (
        typeof indexedDB === "undefined"
      ) {
        reject(
          new Error(
            "IndexedDB is unavailable in this environment."
          )
        );
        return;
      }

      const request = indexedDB.open(
        EVENT_OFFLINE_DB_NAME,
        EVENT_OFFLINE_DB_VERSION
      );

      request.onupgradeneeded = () => {
        const database = request.result;

        const eventPackageStore =
          database.objectStoreNames.contains(
            EVENT_PACKAGE_STORE
          )
            ? request.transaction?.objectStore(
                EVENT_PACKAGE_STORE
              )
            : database.createObjectStore(
                EVENT_PACKAGE_STORE,
                { keyPath: "key" }
              );

        if (eventPackageStore) {
          createIndexes(eventPackageStore);
        }

        const reunionSnapshotStore =
          database.objectStoreNames.contains(
            REUNION_SNAPSHOT_STORE
          )
            ? request.transaction?.objectStore(
                REUNION_SNAPSHOT_STORE
              )
            : database.createObjectStore(
                REUNION_SNAPSHOT_STORE,
                { keyPath: "key" }
              );

        if (reunionSnapshotStore) {
          createIndexes(reunionSnapshotStore);
        }

        const pendingOperationStore =
          database.objectStoreNames.contains(
            PENDING_OPERATION_STORE
          )
            ? request.transaction?.objectStore(
                PENDING_OPERATION_STORE
              )
            : database.createObjectStore(
                PENDING_OPERATION_STORE,
                { keyPath: "operation_id" }
              );

        if (pendingOperationStore) {
          createIndexes(
            pendingOperationStore,
            true
          );
        }
      };

      request.onsuccess = () =>
        resolve(request.result);

      request.onerror = () =>
        reject(
          request.error ??
            new Error(
              "Could not open the event offline database."
            )
        );

      request.onblocked = () =>
        reject(
          new Error(
            "Event offline database upgrade is blocked."
          )
        );
    }
  );
}

async function withStore<T>(
  storeName: OfflineStoreName,
  mode: IDBTransactionMode,
  operation: (
    store: IDBObjectStore
  ) => Promise<T>
): Promise<T> {
  const database =
    await openEventOfflineDatabase();

  try {
    const transaction =
      database.transaction(
        storeName,
        mode
      );

    const completion =
      transactionDone(transaction);

    const result = await operation(
      transaction.objectStore(storeName)
    );

    await completion;

    return result;
  } finally {
    database.close();
  }
}

export async function putEventOfflinePackage(
  record: Omit<
    EventOfflinePackageRecord,
    "key" | "cached_at"
  >
): Promise<EventOfflinePackageRecord> {
  const normalized: EventOfflinePackageRecord = {
    ...record,
    user_id: assertNonEmpty(
      record.user_id,
      "user_id"
    ),
    event_group_id: assertNonEmpty(
      record.event_group_id,
      "event_group_id"
    ),
    synced_at:
      asIsoTimestamp(record.synced_at) ??
      new Date().toISOString(),
    expires_at: asIsoTimestamp(
      record.expires_at
    ),
    key: buildEventOfflinePackageKey(
      record.user_id,
      record.event_group_id
    ),
    cached_at: new Date().toISOString(),
  };

  await withStore(
    EVENT_PACKAGE_STORE,
    "readwrite",
    async (store) => {
      await requestToPromise(
        store.put(normalized)
      );
    }
  );

  return normalized;
}

export async function getEventOfflinePackage(
  userId: string,
  eventGroupId: string
): Promise<EventOfflinePackageRecord | null> {
  const key = buildEventOfflinePackageKey(
    userId,
    eventGroupId
  );

  const record = await withStore(
    EVENT_PACKAGE_STORE,
    "readonly",
    (store) =>
      requestToPromise(
        store.get(key)
      )
  ) as
    | EventOfflinePackageRecord
    | undefined;

  if (!record) {
    return null;
  }

  if (
    isExpired(
      record.expires_at,
      Date.now()
    )
  ) {
    await deleteEventOfflinePackage(
      userId,
      eventGroupId
    );
    return null;
  }

  return record;
}

export async function deleteEventOfflinePackage(
  userId: string,
  eventGroupId: string
): Promise<void> {
  const key = buildEventOfflinePackageKey(
    userId,
    eventGroupId
  );

  await withStore(
    EVENT_PACKAGE_STORE,
    "readwrite",
    async (store) => {
      await requestToPromise(
        store.delete(key)
      );
    }
  );
}

export async function putReunionOfflineSnapshot(
  record: Omit<
    ReunionOfflineSnapshotRecord,
    "key" | "cached_at"
  >
): Promise<ReunionOfflineSnapshotRecord> {
  const normalized:
    ReunionOfflineSnapshotRecord = {
      ...record,
      user_id: assertNonEmpty(
        record.user_id,
        "user_id"
      ),
      event_group_id: assertNonEmpty(
        record.event_group_id,
        "event_group_id"
      ),
      target_id: assertNonEmpty(
        record.target_id,
        "target_id"
      ),
      captured_at: asIsoTimestamp(
        record.captured_at
      ),
      received_at: asIsoTimestamp(
        record.received_at
      ),
      meetup_point_captured_at:
        asIsoTimestamp(
          record.meetup_point_captured_at
        ),
      expires_at: asIsoTimestamp(
        record.expires_at
      ),
      key: buildReunionOfflineSnapshotKey(
        record.user_id,
        record.event_group_id,
        record.target_kind,
        record.target_id
      ),
      cached_at: new Date().toISOString(),
    };

  await withStore(
    REUNION_SNAPSHOT_STORE,
    "readwrite",
    async (store) => {
      await requestToPromise(
        store.put(normalized)
      );
    }
  );

  return normalized;
}

export async function getReunionOfflineSnapshot(
  userId: string,
  eventGroupId: string,
  targetKind: ReunionOfflineTargetKind,
  targetId: string
): Promise<
  ReunionOfflineSnapshotRecord | null
> {
  const key = buildReunionOfflineSnapshotKey(
    userId,
    eventGroupId,
    targetKind,
    targetId
  );

  const record = await withStore(
    REUNION_SNAPSHOT_STORE,
    "readonly",
    (store) =>
      requestToPromise(
        store.get(key)
      )
  ) as
    | ReunionOfflineSnapshotRecord
    | undefined;

  if (!record) {
    return null;
  }

  if (
    isExpired(
      record.expires_at,
      Date.now()
    )
  ) {
    await deleteReunionOfflineSnapshot(
      userId,
      eventGroupId,
      targetKind,
      targetId
    );
    return null;
  }

  return record;
}

export async function deleteReunionOfflineSnapshot(
  userId: string,
  eventGroupId: string,
  targetKind: ReunionOfflineTargetKind,
  targetId: string
): Promise<void> {
  const key = buildReunionOfflineSnapshotKey(
    userId,
    eventGroupId,
    targetKind,
    targetId
  );

  await withStore(
    REUNION_SNAPSHOT_STORE,
    "readwrite",
    async (store) => {
      await requestToPromise(
        store.delete(key)
      );
    }
  );
}

export async function putPendingOfflineOperation(
  record: PendingOfflineOperationRecord
): Promise<PendingOfflineOperationRecord> {
  const normalized:
    PendingOfflineOperationRecord = {
      ...record,
      operation_id: assertNonEmpty(
        record.operation_id,
        "operation_id"
      ),
      user_id: assertNonEmpty(
        record.user_id,
        "user_id"
      ),
      event_group_id: assertNonEmpty(
        record.event_group_id,
        "event_group_id"
      ),
      created_at:
        asIsoTimestamp(
          record.created_at
        ) ?? new Date().toISOString(),
      captured_at: asIsoTimestamp(
        record.captured_at
      ),
      expires_at: asIsoTimestamp(
        record.expires_at
      ),
      priority: Number.isFinite(
        record.priority
      )
        ? record.priority
        : 100,
      attempts: Number.isFinite(
        record.attempts
      )
        ? Math.max(
            0,
            Math.trunc(record.attempts)
          )
        : 0,
    };

  await withStore(
    PENDING_OPERATION_STORE,
    "readwrite",
    async (store) => {
      await requestToPromise(
        store.put(normalized)
      );
    }
  );

  return normalized;
}

export async function listPendingOfflineOperations(
  userId: string,
  eventGroupId: string
): Promise<PendingOfflineOperationRecord[]> {
  const normalizedUserId =
    assertNonEmpty(
      userId,
      "user_id"
    );

  const normalizedEventGroupId =
    assertNonEmpty(
      eventGroupId,
      "event_group_id"
    );

  const records = await withStore(
    PENDING_OPERATION_STORE,
    "readonly",
    (store) =>
      requestToPromise(
        store
          .index(USER_EVENT_INDEX)
          .getAll([
            normalizedUserId,
            normalizedEventGroupId,
          ])
      )
  ) as PendingOfflineOperationRecord[];

  const nowMs = Date.now();

  return records
    .filter(
      (record) =>
        !isExpired(
          record.expires_at,
          nowMs
        )
    )
    .sort((left, right) => {
      if (
        left.priority !== right.priority
      ) {
        return (
          left.priority -
          right.priority
        );
      }

      return (
        new Date(left.created_at).getTime() -
        new Date(right.created_at).getTime()
      );
    });
}

export async function deletePendingOfflineOperation(
  operationId: string
): Promise<void> {
  const normalizedOperationId =
    assertNonEmpty(
      operationId,
      "operation_id"
    );

  await withStore(
    PENDING_OPERATION_STORE,
    "readwrite",
    async (store) => {
      await requestToPromise(
        store.delete(
          normalizedOperationId
        )
      );
    }
  );
}

async function deleteRecordsForUser(
  storeName: OfflineStoreName,
  userId: string
): Promise<number> {
  return withStore(
    storeName,
    "readwrite",
    async (store) => {
      const records = await requestToPromise(
        store
          .index(USER_ID_INDEX)
          .getAll(userId)
      ) as Array<
        Record<string, unknown>
      >;

      let deleted = 0;

      for (const record of records) {
        const key =
          storeName ===
          PENDING_OPERATION_STORE
            ? record.operation_id
            : record.key;

        if (
          typeof key !== "string" ||
          !key
        ) {
          continue;
        }

        await requestToPromise(
          store.delete(key)
        );
        deleted += 1;
      }

      return deleted;
    }
  );
}

export async function purgeEventOfflineDataForUser(
  userId: string
): Promise<number> {
  const normalizedUserId =
    assertNonEmpty(
      userId,
      "user_id"
    );

  const counts = await Promise.all([
    deleteRecordsForUser(
      EVENT_PACKAGE_STORE,
      normalizedUserId
    ),
    deleteRecordsForUser(
      REUNION_SNAPSHOT_STORE,
      normalizedUserId
    ),
    deleteRecordsForUser(
      PENDING_OPERATION_STORE,
      normalizedUserId
    ),
  ]);

  return counts.reduce(
    (sum, value) => sum + value,
    0
  );
}

async function deleteRecordsExceptUser(
  storeName: OfflineStoreName,
  userId: string
): Promise<number> {
  return withStore(
    storeName,
    "readwrite",
    async (store) => {
      const records =
        await requestToPromise(
          store.getAll()
        ) as Array<
          Record<string, unknown>
        >;

      let deleted = 0;

      for (const record of records) {
        if (
          record.user_id === userId
        ) {
          continue;
        }

        const key =
          storeName ===
          PENDING_OPERATION_STORE
            ? record.operation_id
            : record.key;

        if (
          typeof key !== "string" ||
          !key
        ) {
          continue;
        }

        await requestToPromise(
          store.delete(key)
        );
        deleted += 1;
      }

      return deleted;
    }
  );
}

export async function purgeEventOfflineDataExceptUser(
  userId: string
): Promise<number> {
  const normalizedUserId =
    assertNonEmpty(
      userId,
      "user_id"
    );

  const counts = await Promise.all([
    deleteRecordsExceptUser(
      EVENT_PACKAGE_STORE,
      normalizedUserId
    ),
    deleteRecordsExceptUser(
      REUNION_SNAPSHOT_STORE,
      normalizedUserId
    ),
    deleteRecordsExceptUser(
      PENDING_OPERATION_STORE,
      normalizedUserId
    ),
  ]);

  return counts.reduce(
    (sum, value) => sum + value,
    0
  );
}

async function pruneExpiredStore(
  storeName: OfflineStoreName,
  nowMs: number
): Promise<number> {
  return withStore(
    storeName,
    "readwrite",
    async (store) => {
      const records =
        await requestToPromise(
          store.getAll()
        ) as Array<
          Record<string, unknown>
        >;

      let deleted = 0;

      for (const record of records) {
        const expiresAt =
          typeof record.expires_at ===
          "string"
            ? record.expires_at
            : null;

        if (
          !isExpired(
            expiresAt,
            nowMs
          )
        ) {
          continue;
        }

        const key =
          storeName ===
          PENDING_OPERATION_STORE
            ? record.operation_id
            : record.key;

        if (
          typeof key !== "string" ||
          !key
        ) {
          continue;
        }

        await requestToPromise(
          store.delete(key)
        );
        deleted += 1;
      }

      return deleted;
    }
  );
}

export async function pruneExpiredEventOfflineData(
  now = new Date()
): Promise<number> {
  const nowMs = now.getTime();

  const counts = await Promise.all([
    pruneExpiredStore(
      EVENT_PACKAGE_STORE,
      nowMs
    ),
    pruneExpiredStore(
      REUNION_SNAPSHOT_STORE,
      nowMs
    ),
    pruneExpiredStore(
      PENDING_OPERATION_STORE,
      nowMs
    ),
  ]);

  return counts.reduce(
    (sum, value) => sum + value,
    0
  );
}
