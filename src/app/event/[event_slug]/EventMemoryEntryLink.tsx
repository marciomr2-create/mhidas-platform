"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type AvailabilityPayload = {
  ok?: boolean;
  event?: {
    starts_at?: string | null;
    ends_at?: string | null;
  };
};

function normalizeSlug(
  value: string | string[] | undefined
): string {
  const raw = Array.isArray(value)
    ? value[0]
    : value;

  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

function eventHasEnded(
  payload: AvailabilityPayload
): boolean {
  const boundary =
    payload.event?.ends_at ||
    payload.event?.starts_at ||
    "";

  const timestamp =
    Date.parse(boundary);

  return (
    Boolean(boundary) &&
    Number.isFinite(timestamp) &&
    timestamp <= Date.now()
  );
}

export default function EventMemoryEntryLink() {
  const params = useParams();

  const eventSlug =
    normalizeSlug(
      params?.event_slug as
        | string
        | string[]
        | undefined
    );

  const [available, setAvailable] =
    useState(false);

  useEffect(() => {
    if (!eventSlug) {
      return;
    }

    const controller =
      new AbortController();

    async function checkAvailability() {
      try {
        const response = await fetch(
          `/api/event-memory/me?event_slug=${encodeURIComponent(
            eventSlug
          )}`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          return;
        }

        const payload =
          (await response.json()) as
            AvailabilityPayload;

        if (
          payload.ok === true &&
          eventHasEnded(payload)
        ) {
          setAvailable(true);
        }
      } catch {
        // CTA is optional when availability cannot be confirmed.
      }
    }

    void checkAvailability();

    return () => {
      controller.abort();
    };
  }, [eventSlug]);

  if (!available || !eventSlug) {
    return null;
  }

  return (
    <Link
      href={`/event/${eventSlug}/memory`}
      className="uc-ui-button uc-ui-button--quiet"
    >
      Minha memória
    </Link>
  );
}