"use client";

import { useEffect } from "react";
import {
  installEventOfflineSyncListeners,
  syncEventOfflineOperations,
  type EventOfflineSyncResult,
} from "@/lib/offline/eventOfflineSync";

type EventOfflineRuntimeProps = {
  eventGroupId: string;
};

export const EVENT_OFFLINE_SYNC_EVENT =
  "mhidas:event-offline-sync";

function publishSyncResult(
  result: EventOfflineSyncResult
) {
  window.dispatchEvent(
    new CustomEvent<EventOfflineSyncResult>(
      EVENT_OFFLINE_SYNC_EVENT,
      {
        detail: result,
      }
    )
  );
}

export default function EventOfflineRuntime({
  eventGroupId,
}: EventOfflineRuntimeProps) {
  useEffect(() => {
    let active = true;

    const onResult = (
      result: EventOfflineSyncResult
    ) => {
      if (!active) {
        return;
      }

      publishSyncResult(result);
    };

    void syncEventOfflineOperations(
      eventGroupId
    )
      .then(onResult)
      .catch(() => undefined);

    const removeListeners =
      installEventOfflineSyncListeners(
        eventGroupId,
        onResult
      );

    return () => {
      active = false;
      removeListeners();
    };
  }, [eventGroupId]);

  return null;
}
