// src/app/event/[event_slug]/TicketPurchaseAction.tsx

"use client";

import { useEffect, useState } from "react";

type TicketIntentStatus =
  | "interested"
  | "wants_ticket"
  | "ticket_acquired"
  | "cancelled"
  | "checked_in";

type TicketPurchaseActionProps = {
  eventGroupId?: string | null;
  href: string;
  label?: string;
  className?: string;
};

type TicketIntentApiResponse = {
  intent?: {
    status?: TicketIntentStatus;
  } | null;
};

type TicketIntentUpdatedDetail = {
  eventGroupId?: string;
  status?: TicketIntentStatus;
};

const EVENT_TICKET_INTENT_UPDATED = "mhidas:event-ticket-intent-updated";

const TICKET_INTENT_STATUSES: TicketIntentStatus[] = [
  "interested",
  "wants_ticket",
  "ticket_acquired",
  "cancelled",
  "checked_in",
];

function isTicketIntentStatus(value: unknown): value is TicketIntentStatus {
  return TICKET_INTENT_STATUSES.includes(value as TicketIntentStatus);
}

function shouldHidePurchaseAction(
  status: TicketIntentStatus | null
): boolean {
  return (
    status === "ticket_acquired" ||
    status === "checked_in" ||
    status === "cancelled"
  );
}

export default function TicketPurchaseAction({
  eventGroupId = null,
  href,
  label = "Adquirir ingresso",
  className,
}: TicketPurchaseActionProps) {
  const [isVisible, setIsVisible] = useState(!eventGroupId);

  useEffect(() => {
    if (!eventGroupId) {
      setIsVisible(true);
      return;
    }

    const resolvedEventGroupId = eventGroupId;
    const controller = new AbortController();

    async function loadTicketStatus() {
      try {
        const response = await fetch(
          `/api/event-ticket-intents?event_group_id=${encodeURIComponent(
            resolvedEventGroupId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (response.status === 401) {
          setIsVisible(true);
          return;
        }

        if (!response.ok) {
          setIsVisible(true);
          return;
        }

        const data = (await response.json()) as TicketIntentApiResponse;
        const savedStatus = data.intent?.status;

        setIsVisible(
          !isTicketIntentStatus(savedStatus) ||
            !shouldHidePurchaseAction(savedStatus)
        );
      } catch (caughtError) {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === "AbortError"
        ) {
          return;
        }

        setIsVisible(true);
      }
    }

    function handleIntentUpdated(event: Event) {
      const customEvent = event as CustomEvent<TicketIntentUpdatedDetail>;
      const detail = customEvent.detail;

      if (!detail || detail.eventGroupId !== resolvedEventGroupId) {
        return;
      }

      if (isTicketIntentStatus(detail.status)) {
        setIsVisible(!shouldHidePurchaseAction(detail.status));
      }
    }

    window.addEventListener(
      EVENT_TICKET_INTENT_UPDATED,
      handleIntentUpdated as EventListener
    );

    void loadTicketStatus();

    return () => {
      controller.abort();
      window.removeEventListener(
        EVENT_TICKET_INTENT_UPDATED,
        handleIntentUpdated as EventListener
      );
    };
  }, [eventGroupId]);

  if (!href || !isVisible) {
    return null;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={className}
    >
      {label}
    </a>
  );
}
