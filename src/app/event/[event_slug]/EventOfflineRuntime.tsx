"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import {
  mergeEventOfflinePackagePayload,
} from "@/lib/offline/eventOfflineClient";
import {
  installEventOfflineSyncListeners,
  syncEventOfflineOperations,
  type EventOfflineSyncResult,
} from "@/lib/offline/eventOfflineSync";

type EventOfflineRuntimeProps = {
  eventGroupId: string;
  eventSlug: string;
  eventTitle: string;
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

async function prepareEventOfflineShell(
  eventGroupId: string,
  eventSlug: string,
  eventTitle: string
): Promise<void> {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return;
  }

  if (
    "serviceWorker" in
    navigator
  ) {
    await navigator
      .serviceWorker
      .register(
        "/mhidas-push-sw.js",
        {
          scope: "/",
        }
      );

    await navigator
      .serviceWorker
      .ready;
  }

  const supabase =
    createBrowserClient();

  const {
    data: { session },
  } =
    await supabase.auth.getSession();

  const userId =
    session?.user?.id?.trim() ??
    "";

  if (!userId) {
    return;
  }

  await mergeEventOfflinePackagePayload({
    userId,
    eventGroupId,
    patch: {
      event_slug:
        eventSlug,
      event_title:
        eventTitle,
    },
  });
}

export default function EventOfflineRuntime({
  eventGroupId,
  eventSlug,
  eventTitle,
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

    void prepareEventOfflineShell(
      eventGroupId,
      eventSlug,
      eventTitle
    ).catch(() => undefined);

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
  }, [
    eventGroupId,
    eventSlug,
    eventTitle,
  ]);

  return null;
}
