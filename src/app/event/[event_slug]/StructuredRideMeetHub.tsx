// src/app/event/[event_slug]/StructuredRideMeetHub.tsx
"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type StructuredRideMeetHubProps = {
  eventGroupId: string;
  eventReturnTo: string;
  isAuthenticated: boolean;
};

type RideRow = {
  ride_id: string;
  event_group_id: string;
  creator_user_id: string;
  mode: "offer" | "seek";
  direction: "outbound" | "return" | "round_trip";
  origin_label: string;
  destination_label: string;
  departure_at: string | null;
  return_at: string | null;
  seats_available: number | null;
  contribution_note: string | null;
  transport_type: string | null;
  notes: string | null;
  visibility: "public" | "private";
  status: "active" | "closed" | "archived" | "cancelled";
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type RideMemberRow = {
  ride_member_id: string;
  ride_id: string;
  user_id: string;
  role: "creator" | "organizer" | "driver" | "passenger" | "member";
  status: "approved" | "left" | "removed" | "blocked";
  joined_at: string | null;
  left_at: string | null;
  status_changed_at: string | null;
  created_at: string;
  updated_at: string;
};

type RideRequestRow = {
  request_id: string;
  ride_id: string;
  requester_user_id: string;
  seats_requested: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  message: string | null;
  decided_by_user_id: string | null;
  decided_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type MeetupRow = {
  meetup_id: string;
  event_group_id: string;
  creator_user_id: string;
  name: string;
  description: string | null;
  meeting_point_label: string;
  meeting_point_reference: string | null;
  starts_at: string;
  ends_at: string | null;
  max_members: number;
  rules: string | null;
  visibility: "public" | "private";
  status: "active" | "closed" | "archived" | "cancelled";
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type MeetupMemberRow = {
  meetup_member_id: string;
  meetup_id: string;
  user_id: string;
  role: "creator" | "organizer" | "driver" | "passenger" | "member";
  status: "approved" | "left" | "removed" | "blocked";
  joined_at: string | null;
  left_at: string | null;
  status_changed_at: string | null;
  created_at: string;
  updated_at: string;
};

type MeetupRequestRow = {
  request_id: string;
  meetup_id: string;
  requester_user_id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  message: string | null;
  decided_by_user_id: string | null;
  decided_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type RideReadPayload = {
  ok: boolean;
  message?: string;
  details?: string;
  viewer_user_id?: string;
  rides?: RideRow[];
  members?: RideMemberRow[];
  requests?: RideRequestRow[];
};

type MeetupReadPayload = {
  ok: boolean;
  message?: string;
  details?: string;
  viewer_user_id?: string;
  meetups?: MeetupRow[];
  members?: MeetupMemberRow[];
  requests?: MeetupRequestRow[];
};

type MutationPayload = {
  ok: boolean;
  message?: string;
  details?: string;
};

type ActivePanel = "rides" | "meetups";

type FeedbackState = {
  tone: "success" | "error" | "info";
  message: string;
} | null;

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toNullableIso(value: string): string | null {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Data ou horário inválido.");
  }

  return date.toISOString();
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Horário a combinar";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Horário a combinar";
  }

  return DATE_FORMATTER.format(date);
}

function getLoginHref(returnTo: string): string {
  const safeReturnTo = normalizeText(returnTo);

  if (
    safeReturnTo.startsWith("/event/") &&
    !safeReturnTo.startsWith("//") &&
    !safeReturnTo.includes("\\")
  ) {
    return `/login?next=${encodeURIComponent(safeReturnTo)}`;
  }

  return "/login";
}

function getRideModeLabel(mode: RideRow["mode"]): string {
  return mode === "offer" ? "Ofereço carona" : "Procuro carona";
}

function getRideDirectionLabel(
  direction: RideRow["direction"]
): string {
  if (direction === "outbound") {
    return "Somente ida";
  }

  if (direction === "return") {
    return "Somente volta";
  }

  return "Ida e volta";
}

function getVisibilityLabel(
  visibility: "public" | "private"
): string {
  return visibility === "private"
    ? "Visível apenas aos envolvidos"
    : "Visível para Clubbers autenticados";
}

async function readJsonResponse<T>(
  response: Response
): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Resposta inválida do servidor.");
  }
}

async function fetchReadPayload<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await readJsonResponse<
    T & {
      message?: string;
      details?: string;
    }
  >(response);

  if (!response.ok) {
    throw new Error(
      normalizeText(payload.details) ||
        normalizeText(payload.message) ||
        "Não foi possível carregar os dados."
    );
  }

  return payload;
}

async function postMutation(
  url: string,
  body: Record<string, unknown>
): Promise<MutationPayload> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await readJsonResponse<
    MutationPayload & {
      message?: string;
      details?: string;
    }
  >(response);

  if (!response.ok) {
    throw new Error(
      normalizeText(payload.details) ||
        normalizeText(payload.message) ||
        "Não foi possível concluir esta ação."
    );
  }

  return payload;
}

export default function StructuredRideMeetHub({
  eventGroupId,
  eventReturnTo,
  isAuthenticated,
}: StructuredRideMeetHubProps) {
  const [activePanel, setActivePanel] =
    useState<ActivePanel>("rides");
  const [loading, setLoading] = useState(isAuthenticated);
  const [busyKey, setBusyKey] = useState("");
  const [feedback, setFeedback] =
    useState<FeedbackState>(null);

  const [viewerUserId, setViewerUserId] = useState("");
  const [rides, setRides] = useState<RideRow[]>([]);
  const [rideMembers, setRideMembers] = useState<
    RideMemberRow[]
  >([]);
  const [rideRequests, setRideRequests] = useState<
    RideRequestRow[]
  >([]);

  const [meetups, setMeetups] = useState<MeetupRow[]>([]);
  const [meetupMembers, setMeetupMembers] = useState<
    MeetupMemberRow[]
  >([]);
  const [meetupRequests, setMeetupRequests] = useState<
    MeetupRequestRow[]
  >([]);

  const [rideMode, setRideMode] =
    useState<RideRow["mode"]>("offer");
  const [rideDirection, setRideDirection] =
    useState<RideRow["direction"]>("round_trip");
  const [rideOrigin, setRideOrigin] = useState("");
  const [rideDestination, setRideDestination] = useState("");
  const [rideDepartureAt, setRideDepartureAt] = useState("");
  const [rideReturnAt, setRideReturnAt] = useState("");
  const [rideSeats, setRideSeats] = useState("3");
  const [rideTransportType, setRideTransportType] =
    useState("");
  const [rideContribution, setRideContribution] =
    useState("");
  const [rideNotes, setRideNotes] = useState("");
  const [rideVisibility, setRideVisibility] =
    useState<"public" | "private">("public");

  const [meetupName, setMeetupName] = useState("");
  const [meetupDescription, setMeetupDescription] =
    useState("");
  const [meetupPoint, setMeetupPoint] = useState("");
  const [meetupReference, setMeetupReference] = useState("");
  const [meetupStartsAt, setMeetupStartsAt] = useState("");
  const [meetupEndsAt, setMeetupEndsAt] = useState("");
  const [meetupMaxMembers, setMeetupMaxMembers] =
    useState("20");
  const [meetupRules, setMeetupRules] = useState("");
  const [meetupVisibility, setMeetupVisibility] =
    useState<"public" | "private">("public");

  const loginHref = useMemo(
    () => getLoginHref(eventReturnTo),
    [eventReturnTo]
  );

  const loadData = useCallback(async () => {
    if (!isAuthenticated || !eventGroupId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const query = new URLSearchParams({
        event_group_id: eventGroupId,
      });

      const [ridePayload, meetupPayload] = await Promise.all([
        fetchReadPayload<RideReadPayload>(
          `/api/event-rides?${query.toString()}`
        ),
        fetchReadPayload<MeetupReadPayload>(
          `/api/event-meetups?${query.toString()}`
        ),
      ]);

      const resolvedViewer =
        normalizeText(ridePayload.viewer_user_id) ||
        normalizeText(meetupPayload.viewer_user_id);

      setViewerUserId(resolvedViewer);
      setRides(ridePayload.rides ?? []);
      setRideMembers(ridePayload.members ?? []);
      setRideRequests(ridePayload.requests ?? []);
      setMeetups(meetupPayload.meetups ?? []);
      setMeetupMembers(meetupPayload.members ?? []);
      setMeetupRequests(meetupPayload.requests ?? []);
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar caronas e encontros.",
      });
    } finally {
      setLoading(false);
    }
  }, [eventGroupId, isAuthenticated]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function runMutation(
    key: string,
    action: () => Promise<void>,
    successMessage: string
  ) {
    setBusyKey(key);
    setFeedback(null);

    try {
      await action();
      setFeedback({
        tone: "success",
        message: successMessage,
      });
      await loadData();
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível concluir esta ação.",
      });
    } finally {
      setBusyKey("");
    }
  }

  async function handleCreateRide(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const seats = Number(rideSeats);

    if (!Number.isInteger(seats) || seats < 1 || seats > 50) {
      setFeedback({
        tone: "error",
        message: "Informe entre 1 e 50 vagas.",
      });
      return;
    }

    await runMutation(
      "create-ride",
      async () => {
        await postMutation("/api/event-rides", {
          action: "create",
          event_group_id: eventGroupId,
          mode: rideMode,
          direction: rideDirection,
          origin_label: rideOrigin,
          destination_label: rideDestination,
          departure_at: toNullableIso(rideDepartureAt),
          return_at: toNullableIso(rideReturnAt),
          seats_available: seats,
          contribution_note: rideContribution || null,
          transport_type: rideTransportType || null,
          notes: rideNotes || null,
          visibility: rideVisibility,
          expires_at: null,
        });

        setRideOrigin("");
        setRideDestination("");
        setRideDepartureAt("");
        setRideReturnAt("");
        setRideSeats("3");
        setRideTransportType("");
        setRideContribution("");
        setRideNotes("");
      },
      "Carona publicada com sucesso."
    );
  }

  async function handleCreateMeetup(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const maxMembers = Number(meetupMaxMembers);

    if (
      !Number.isInteger(maxMembers) ||
      maxMembers < 2 ||
      maxMembers > 250
    ) {
      setFeedback({
        tone: "error",
        message: "Informe um limite entre 2 e 250 pessoas.",
      });
      return;
    }

    await runMutation(
      "create-meetup",
      async () => {
        await postMutation("/api/event-meetups", {
          action: "create",
          event_group_id: eventGroupId,
          name: meetupName,
          description: meetupDescription || null,
          meeting_point_label: meetupPoint,
          meeting_point_reference: meetupReference || null,
          starts_at: toNullableIso(meetupStartsAt),
          ends_at: toNullableIso(meetupEndsAt),
          max_members: maxMembers,
          rules: meetupRules || null,
          visibility: meetupVisibility,
          expires_at: null,
        });

        setMeetupName("");
        setMeetupDescription("");
        setMeetupPoint("");
        setMeetupReference("");
        setMeetupStartsAt("");
        setMeetupEndsAt("");
        setMeetupMaxMembers("20");
        setMeetupRules("");
      },
      "Ponto de encontro publicado com sucesso."
    );
  }

  const activeRides = rides.filter(
    (ride) => ride.status === "active"
  );
  const activeMeetups = meetups.filter(
    (meetup) => meetup.status === "active"
  );

  return (
    <section
      id="event-structured-rides-meetups"
      className="structured-social"
      aria-labelledby="structured-social-title"
    >
      <style>{`
        .structured-social {
          width: min(1120px, calc(100vw - 48px));
          min-width: 0;
          margin: 22px 0 0 50%;
          transform: translateX(-50%);
          padding: 24px;
          border-top: 1px solid rgba(20,184,166,0.34);
          border-bottom: 1px solid rgba(255,255,255,0.10);
          background:
            radial-gradient(circle at top right, rgba(20,184,166,0.10), transparent 32%),
            rgba(8,12,19,0.76);
          box-sizing: border-box;
        }

        .structured-social__header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(255,255,255,0.09);
        }

        .structured-social__heading {
          min-width: 0;
          display: grid;
          gap: 5px;
        }

        .structured-social__eyebrow {
          color: #14B8A6;
          font-size: 10px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .structured-social__title {
          margin: 0;
          color: #fff;
          font-size: 26px;
          line-height: 1.08;
          font-weight: 950;
          letter-spacing: -0.035em;
        }

        .structured-social__subtitle {
          max-width: 720px;
          margin: 0;
          color: rgba(255,255,255,0.66);
          font-size: 13px;
          line-height: 1.55;
        }

        .structured-social__refresh {
          flex: 0 0 auto;
          min-height: 38px;
          padding: 0 2px 5px;
          border: 0;
          border-bottom: 1px solid rgba(20,184,166,0.55);
          background: transparent;
          color: #5EEAD4;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .structured-social__refresh:disabled {
          cursor: wait;
          opacity: 0.55;
        }

        .structured-social__login {
          display: grid;
          gap: 12px;
          padding: 22px 0 2px;
        }

        .structured-social__login strong {
          color: #fff;
          font-size: 16px;
          line-height: 1.3;
        }

        .structured-social__login p {
          max-width: 720px;
          margin: 0;
          color: rgba(255,255,255,0.66);
          font-size: 13px;
          line-height: 1.55;
        }

        .structured-social__login-action {
          width: fit-content;
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border: 1px solid rgba(20,184,166,0.54);
          background: rgba(20,184,166,0.12);
          color: #fff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 950;
        }

        .structured-social__feedback {
          margin: 16px 0 0;
          padding: 11px 0;
          border-bottom: 1px solid rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.80);
          font-size: 12px;
          line-height: 1.5;
        }

        .structured-social__feedback[data-tone="success"] {
          color: #5EEAD4;
        }

        .structured-social__feedback[data-tone="error"] {
          color: #FCA5A5;
        }

        .structured-social__tabs {
          display: flex;
          gap: 24px;
          padding-top: 18px;
          border-bottom: 1px solid rgba(255,255,255,0.09);
        }

        .structured-social__tab {
          min-height: 42px;
          padding: 0 0 8px;
          border: 0;
          border-bottom: 2px solid transparent;
          background: transparent;
          color: rgba(255,255,255,0.58);
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .structured-social__tab[aria-selected="true"] {
          border-bottom-color: #14B8A6;
          color: #fff;
        }

        .structured-social__panel {
          display: grid;
          gap: 18px;
          padding-top: 18px;
        }

        .structured-social__summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .structured-social__summary-copy {
          display: grid;
          gap: 3px;
        }

        .structured-social__summary-copy strong {
          color: #fff;
          font-size: 15px;
        }

        .structured-social__summary-copy span {
          color: rgba(255,255,255,0.60);
          font-size: 11px;
          line-height: 1.4;
        }

        .structured-social__count {
          color: #fff;
          font-size: 28px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .structured-social__composer {
          border-top: 1px solid rgba(255,255,255,0.09);
          border-bottom: 1px solid rgba(255,255,255,0.09);
        }

        .structured-social__composer summary {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          color: #fff;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
          list-style: none;
        }

        .structured-social__composer summary::-webkit-details-marker {
          display: none;
        }

        .structured-social__composer summary::after {
          content: "+";
          color: #5EEAD4;
          font-size: 20px;
          font-weight: 600;
        }

        .structured-social__composer[open] summary::after {
          content: "−";
        }

        .structured-social__form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 18px;
          padding: 2px 0 20px;
        }

        .structured-social__field {
          min-width: 0;
          display: grid;
          gap: 6px;
        }

        .structured-social__field--wide {
          grid-column: 1 / -1;
        }

        .structured-social__field label {
          color: rgba(255,255,255,0.62);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .structured-social__field input,
        .structured-social__field select,
        .structured-social__field textarea {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          border: 0;
          border-bottom: 1px solid rgba(255,255,255,0.18);
          border-radius: 0;
          background: transparent;
          color: #fff;
          font: inherit;
          font-size: 13px;
          outline: none;
          padding: 10px 0;
        }

        .structured-social__field textarea {
          min-height: 74px;
          resize: vertical;
        }

        .structured-social__field input:focus,
        .structured-social__field select:focus,
        .structured-social__field textarea:focus {
          border-bottom-color: #14B8A6;
        }

        .structured-social__field select option {
          background: #0B111A;
          color: #fff;
        }

        .structured-social__submit {
          grid-column: 1 / -1;
          min-height: 44px;
          border: 1px solid rgba(20,184,166,0.54);
          background: #0D9488;
          color: #fff;
          font: inherit;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
        }

        .structured-social__submit:disabled {
          cursor: wait;
          opacity: 0.55;
        }

        .structured-social__list {
          display: grid;
          gap: 0;
        }

        .structured-social__empty {
          margin: 0;
          padding: 18px 0;
          border-top: 1px solid rgba(255,255,255,0.09);
          color: rgba(255,255,255,0.58);
          font-size: 12px;
          line-height: 1.55;
        }

        .structured-social__card {
          display: grid;
          grid-template-columns:
            minmax(0, 1.1fr)
            minmax(220px, 0.7fr);
          gap: 24px;
          padding: 20px 0;
          border-top: 1px solid rgba(255,255,255,0.09);
        }

        .structured-social__card-main,
        .structured-social__card-side {
          min-width: 0;
          display: grid;
          align-content: start;
          gap: 10px;
        }

        .structured-social__card-side {
          padding-left: 22px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .structured-social__card-title {
          margin: 0;
          color: #fff;
          font-size: 18px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: -0.025em;
        }

        .structured-social__card-kicker {
          color: #5EEAD4;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .structured-social__route {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.86);
          font-size: 13px;
          font-weight: 850;
        }

        .structured-social__route span:nth-child(2) {
          color: #14B8A6;
        }

        .structured-social__meta {
          display: grid;
          gap: 5px;
          color: rgba(255,255,255,0.62);
          font-size: 11px;
          line-height: 1.45;
        }

        .structured-social__note {
          margin: 0;
          color: rgba(255,255,255,0.72);
          font-size: 12px;
          line-height: 1.5;
        }

        .structured-social__action {
          min-height: 40px;
          border: 1px solid rgba(20,184,166,0.42);
          background: rgba(20,184,166,0.10);
          color: #fff;
          font: inherit;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .structured-social__action--secondary {
          border-color: rgba(255,255,255,0.17);
          background: transparent;
          color: rgba(255,255,255,0.76);
        }

        .structured-social__action--reject {
          border-color: rgba(248,113,113,0.34);
          color: #FCA5A5;
        }

        .structured-social__action:disabled {
          cursor: not-allowed;
          opacity: 0.48;
        }

        .structured-social__request-list {
          display: grid;
          gap: 10px;
          padding-top: 4px;
        }

        .structured-social__request {
          display: grid;
          gap: 8px;
          padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .structured-social__request-copy {
          color: rgba(255,255,255,0.68);
          font-size: 11px;
          line-height: 1.45;
        }

        .structured-social__request-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .structured-social__status {
          color: rgba(255,255,255,0.62);
          font-size: 11px;
          line-height: 1.45;
        }

        @media (max-width: 760px) {
          .structured-social {
            width: 100%;
            max-width: 100%;
            margin: 16px 0 0;
            transform: none;
            padding: 18px 14px;
          }

          .structured-social__header {
            display: grid;
            align-items: start;
            gap: 12px;
          }

          .structured-social__title {
            font-size: 22px;
          }

          .structured-social__refresh {
            width: fit-content;
          }

          .structured-social__tabs {
            gap: 18px;
          }

          .structured-social__form {
            grid-template-columns: minmax(0, 1fr);
          }

          .structured-social__field--wide,
          .structured-social__submit {
            grid-column: 1;
          }

          .structured-social__card {
            grid-template-columns: minmax(0, 1fr);
            gap: 16px;
          }

          .structured-social__card-side {
            padding-left: 0;
            padding-top: 15px;
            border-left: 0;
            border-top: 1px solid rgba(255,255,255,0.08);
          }

          .structured-social__route {
            grid-template-columns: minmax(0, 1fr);
            gap: 4px;
          }

          .structured-social__route span:nth-child(2) {
            display: none;
          }
        }
      `}</style>

      <header className="structured-social__header">
        <div className="structured-social__heading">
          <span className="structured-social__eyebrow">
            Organização entre Clubbers
          </span>
          <h2
            id="structured-social-title"
            className="structured-social__title"
          >
            Caronas e pontos de encontro
          </h2>
          <p className="structured-social__subtitle">
            Publique uma necessidade real, entre em uma organização
            existente e confirme participantes sem expor localização
            precisa publicamente.
          </p>
        </div>

        {isAuthenticated ? (
          <button
            type="button"
            className="structured-social__refresh"
            disabled={loading || Boolean(busyKey)}
            onClick={() => void loadData()}
          >
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        ) : null}
      </header>

      {!isAuthenticated ? (
        <div className="structured-social__login">
          <strong>Entre para visualizar e participar.</strong>
          <p>
            Caronas, solicitações e pontos de encontro são exibidos
            somente para Clubbers autenticados.
          </p>
          <Link
            href={loginHref}
            className="structured-social__login-action"
          >
            Entrar no USECLUBBERS
          </Link>
        </div>
      ) : (
        <>
          {feedback ? (
            <p
              className="structured-social__feedback"
              data-tone={feedback.tone}
              role={feedback.tone === "error" ? "alert" : "status"}
            >
              {feedback.message}
            </p>
          ) : null}

          <div
            className="structured-social__tabs"
            role="tablist"
            aria-label="Caronas e encontros"
          >
            <button
              type="button"
              role="tab"
              className="structured-social__tab"
              aria-selected={activePanel === "rides"}
              onClick={() => setActivePanel("rides")}
            >
              Caronas ({activeRides.length})
            </button>
            <button
              type="button"
              role="tab"
              className="structured-social__tab"
              aria-selected={activePanel === "meetups"}
              onClick={() => setActivePanel("meetups")}
            >
              Encontros ({activeMeetups.length})
            </button>
          </div>

          {activePanel === "rides" ? (
            <div
              className="structured-social__panel"
              role="tabpanel"
            >
              <div className="structured-social__summary">
                <div className="structured-social__summary-copy">
                  <strong>Caronas estruturadas</strong>
                  <span>
                    Ofertas e buscas vinculadas exclusivamente a este
                    evento.
                  </span>
                </div>
                <span className="structured-social__count">
                  {activeRides.length}
                </span>
              </div>

              <details className="structured-social__composer">
                <summary>Publicar uma carona</summary>

                <form
                  className="structured-social__form"
                  onSubmit={handleCreateRide}
                >
                  <div className="structured-social__field">
                    <label htmlFor="structured-ride-mode">
                      Intenção
                    </label>
                    <select
                      id="structured-ride-mode"
                      value={rideMode}
                      onChange={(event) =>
                        setRideMode(
                          event.target.value as RideRow["mode"]
                        )
                      }
                    >
                      <option value="offer">
                        Ofereço carona
                      </option>
                      <option value="seek">
                        Procuro carona
                      </option>
                    </select>
                  </div>

                  <div className="structured-social__field">
                    <label htmlFor="structured-ride-direction">
                      Trajeto
                    </label>
                    <select
                      id="structured-ride-direction"
                      value={rideDirection}
                      onChange={(event) =>
                        setRideDirection(
                          event.target
                            .value as RideRow["direction"]
                        )
                      }
                    >
                      <option value="round_trip">
                        Ida e volta
                      </option>
                      <option value="outbound">
                        Somente ida
                      </option>
                      <option value="return">
                        Somente volta
                      </option>
                    </select>
                  </div>

                  <div className="structured-social__field">
                    <label htmlFor="structured-ride-origin">
                      Origem
                    </label>
                    <input
                      id="structured-ride-origin"
                      value={rideOrigin}
                      onChange={(event) =>
                        setRideOrigin(event.target.value)
                      }
                      maxLength={120}
                      placeholder="Cidade, bairro ou ponto geral"
                      required
                    />
                  </div>

                  <div className="structured-social__field">
                    <label htmlFor="structured-ride-destination">
                      Destino
                    </label>
                    <input
                      id="structured-ride-destination"
                      value={rideDestination}
                      onChange={(event) =>
                        setRideDestination(event.target.value)
                      }
                      maxLength={120}
                      placeholder="Evento ou região próxima"
                      required
                    />
                  </div>

                  <div className="structured-social__field">
                    <label htmlFor="structured-ride-departure">
                      Saída
                    </label>
                    <input
                      id="structured-ride-departure"
                      type="datetime-local"
                      value={rideDepartureAt}
                      onChange={(event) =>
                        setRideDepartureAt(event.target.value)
                      }
                    />
                  </div>

                  <div className="structured-social__field">
                    <label htmlFor="structured-ride-return">
                      Retorno
                    </label>
                    <input
                      id="structured-ride-return"
                      type="datetime-local"
                      value={rideReturnAt}
                      onChange={(event) =>
                        setRideReturnAt(event.target.value)
                      }
                    />
                  </div>

                  <div className="structured-social__field">
                    <label htmlFor="structured-ride-seats">
                      Vagas
                    </label>
                    <input
                      id="structured-ride-seats"
                      type="number"
                      min={1}
                      max={50}
                      value={rideSeats}
                      onChange={(event) =>
                        setRideSeats(event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="structured-social__field">
                    <label htmlFor="structured-ride-transport">
                      Transporte
                    </label>
                    <input
                      id="structured-ride-transport"
                      value={rideTransportType}
                      onChange={(event) =>
                        setRideTransportType(event.target.value)
                      }
                      maxLength={60}
                      placeholder="Carro, van, ônibus..."
                    />
                  </div>

                  <div className="structured-social__field">
                    <label htmlFor="structured-ride-contribution">
                      Divisão de custos
                    </label>
                    <input
                      id="structured-ride-contribution"
                      value={rideContribution}
                      onChange={(event) =>
                        setRideContribution(event.target.value)
                      }
                      maxLength={180}
                      placeholder="Ex.: combustível dividido"
                    />
                  </div>

                  <div className="structured-social__field">
                    <label htmlFor="structured-ride-visibility">
                      Visibilidade
                    </label>
                    <select
                      id="structured-ride-visibility"
                      value={rideVisibility}
                      onChange={(event) =>
                        setRideVisibility(
                          event.target.value as
                            | "public"
                            | "private"
                        )
                      }
                    >
                      <option value="public">
                        Clubbers autenticados
                      </option>
                      <option value="private">
                        Apenas envolvidos
                      </option>
                    </select>
                  </div>

                  <div className="structured-social__field structured-social__field--wide">
                    <label htmlFor="structured-ride-notes">
                      Observações
                    </label>
                    <textarea
                      id="structured-ride-notes"
                      value={rideNotes}
                      onChange={(event) =>
                        setRideNotes(event.target.value)
                      }
                      maxLength={1000}
                      placeholder="Horários flexíveis, bagagem ou referência geral."
                    />
                  </div>

                  <button
                    className="structured-social__submit"
                    type="submit"
                    disabled={Boolean(busyKey)}
                  >
                    {busyKey === "create-ride"
                      ? "Publicando..."
                      : "Publicar carona"}
                  </button>
                </form>
              </details>

              <div className="structured-social__list">
                {loading ? (
                  <p className="structured-social__empty">
                    Carregando caronas...
                  </p>
                ) : activeRides.length === 0 ? (
                  <p className="structured-social__empty">
                    Ainda não há caronas estruturadas para este
                    evento.
                  </p>
                ) : (
                  activeRides.map((ride) => {
                    const isCreator =
                      ride.creator_user_id === viewerUserId;
                    const approvedMembers = rideMembers.filter(
                      (member) =>
                        member.ride_id === ride.ride_id &&
                        member.status === "approved"
                    );
                    const viewerMembership = approvedMembers.find(
                      (member) =>
                        member.user_id === viewerUserId
                    );
                    const viewerPendingRequest =
                      rideRequests.find(
                        (request) =>
                          request.ride_id === ride.ride_id &&
                          request.requester_user_id ===
                            viewerUserId &&
                          request.status === "pending"
                      );
                    const ownerPendingRequests =
                      isCreator
                        ? rideRequests.filter(
                            (request) =>
                              request.ride_id === ride.ride_id &&
                              request.status === "pending"
                          )
                        : [];

                    const joinDisabled =
                      isCreator ||
                      Boolean(viewerMembership) ||
                      Boolean(viewerPendingRequest) ||
                      Boolean(busyKey);

                    let joinLabel = "Solicitar participação";

                    if (isCreator) {
                      joinLabel = "Carona criada por você";
                    } else if (viewerMembership) {
                      joinLabel = "Participação confirmada";
                    } else if (viewerPendingRequest) {
                      joinLabel = "Solicitação pendente";
                    }

                    return (
                      <article
                        className="structured-social__card"
                        key={ride.ride_id}
                      >
                        <div className="structured-social__card-main">
                          <span className="structured-social__card-kicker">
                            {getRideModeLabel(ride.mode)} ·{" "}
                            {getRideDirectionLabel(ride.direction)}
                          </span>
                          <h3 className="structured-social__card-title">
                            {ride.origin_label} →{" "}
                            {ride.destination_label}
                          </h3>

                          <div className="structured-social__route">
                            <span>{ride.origin_label}</span>
                            <span aria-hidden="true">→</span>
                            <span>{ride.destination_label}</span>
                          </div>

                          <div className="structured-social__meta">
                            <span>
                              Saída:{" "}
                              {formatDateTime(ride.departure_at)}
                            </span>
                            {ride.return_at ? (
                              <span>
                                Retorno:{" "}
                                {formatDateTime(ride.return_at)}
                              </span>
                            ) : null}
                            <span>
                              Vagas informadas:{" "}
                              {ride.seats_available ?? "a combinar"}
                            </span>
                            <span>
                              Participantes confirmados:{" "}
                              {approvedMembers.length}
                            </span>
                            <span>
                              {getVisibilityLabel(ride.visibility)}
                            </span>
                          </div>

                          {ride.transport_type ? (
                            <p className="structured-social__note">
                              Transporte: {ride.transport_type}
                            </p>
                          ) : null}

                          {ride.contribution_note ? (
                            <p className="structured-social__note">
                              Custos: {ride.contribution_note}
                            </p>
                          ) : null}

                          {ride.notes ? (
                            <p className="structured-social__note">
                              {ride.notes}
                            </p>
                          ) : null}
                        </div>

                        <div className="structured-social__card-side">
                          <button
                            type="button"
                            className="structured-social__action"
                            disabled={joinDisabled}
                            onClick={() =>
                              void runMutation(
                                `join-ride-${ride.ride_id}`,
                                async () => {
                                  await postMutation(
                                    "/api/event-rides",
                                    {
                                      action: "request_join",
                                      ride_id: ride.ride_id,
                                      seats_requested: 1,
                                      message: null,
                                    }
                                  );
                                },
                                "Solicitação de carona enviada."
                              )
                            }
                          >
                            {busyKey ===
                            `join-ride-${ride.ride_id}`
                              ? "Enviando..."
                              : joinLabel}
                          </button>

                          {isCreator &&
                          ownerPendingRequests.length > 0 ? (
                            <div className="structured-social__request-list">
                              <span className="structured-social__status">
                                Solicitações pendentes:{" "}
                                {ownerPendingRequests.length}
                              </span>

                              {ownerPendingRequests.map(
                                (request, index) => (
                                  <div
                                    className="structured-social__request"
                                    key={request.request_id}
                                  >
                                    <span className="structured-social__request-copy">
                                      Solicitação {index + 1}
                                      {request.seats_requested > 1
                                        ? ` · ${request.seats_requested} vagas`
                                        : ""}
                                      {request.message
                                        ? ` · ${request.message}`
                                        : ""}
                                    </span>

                                    <div className="structured-social__request-actions">
                                      <button
                                        type="button"
                                        className="structured-social__action"
                                        disabled={Boolean(busyKey)}
                                        onClick={() =>
                                          void runMutation(
                                            `approve-ride-${request.request_id}`,
                                            async () => {
                                              await postMutation(
                                                "/api/event-rides",
                                                {
                                                  action:
                                                    "decide_request",
                                                  request_id:
                                                    request.request_id,
                                                  decision:
                                                    "approved",
                                                }
                                              );
                                            },
                                            "Participação aprovada."
                                          )
                                        }
                                      >
                                        Aprovar
                                      </button>
                                      <button
                                        type="button"
                                        className="structured-social__action structured-social__action--reject"
                                        disabled={Boolean(busyKey)}
                                        onClick={() =>
                                          void runMutation(
                                            `reject-ride-${request.request_id}`,
                                            async () => {
                                              await postMutation(
                                                "/api/event-rides",
                                                {
                                                  action:
                                                    "decide_request",
                                                  request_id:
                                                    request.request_id,
                                                  decision:
                                                    "rejected",
                                                }
                                              );
                                            },
                                            "Solicitação recusada."
                                          )
                                        }
                                      >
                                        Recusar
                                      </button>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <span className="structured-social__status">
                              A negociação e os detalhes são
                              responsabilidade dos participantes.
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div
              className="structured-social__panel"
              role="tabpanel"
            >
              <div className="structured-social__summary">
                <div className="structured-social__summary-copy">
                  <strong>Pontos de encontro</strong>
                  <span>
                    Local, horário, limite e regras em uma organização
                    temporária.
                  </span>
                </div>
                <span className="structured-social__count">
                  {activeMeetups.length}
                </span>
              </div>

              <details className="structured-social__composer">
                <summary>Criar ponto de encontro</summary>

                <form
                  className="structured-social__form"
                  onSubmit={handleCreateMeetup}
                >
                  <div className="structured-social__field">
                    <label htmlFor="structured-meetup-name">
                      Nome
                    </label>
                    <input
                      id="structured-meetup-name"
                      value={meetupName}
                      onChange={(event) =>
                        setMeetupName(event.target.value)
                      }
                      minLength={3}
                      maxLength={80}
                      placeholder="Ex.: Encontro antes da abertura"
                      required
                    />
                  </div>

                  <div className="structured-social__field">
                    <label htmlFor="structured-meetup-point">
                      Ponto de encontro
                    </label>
                    <input
                      id="structured-meetup-point"
                      value={meetupPoint}
                      onChange={(event) =>
                        setMeetupPoint(event.target.value)
                      }
                      maxLength={160}
                      placeholder="Referência geral e segura"
                      required
                    />
                  </div>

                  <div className="structured-social__field">
                    <label htmlFor="structured-meetup-start">
                      Início
                    </label>
                    <input
                      id="structured-meetup-start"
                      type="datetime-local"
                      value={meetupStartsAt}
                      onChange={(event) =>
                        setMeetupStartsAt(event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="structured-social__field">
                    <label htmlFor="structured-meetup-end">
                      Término
                    </label>
                    <input
                      id="structured-meetup-end"
                      type="datetime-local"
                      value={meetupEndsAt}
                      onChange={(event) =>
                        setMeetupEndsAt(event.target.value)
                      }
                    />
                  </div>

                  <div className="structured-social__field">
                    <label htmlFor="structured-meetup-limit">
                      Limite de pessoas
                    </label>
                    <input
                      id="structured-meetup-limit"
                      type="number"
                      min={2}
                      max={250}
                      value={meetupMaxMembers}
                      onChange={(event) =>
                        setMeetupMaxMembers(event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="structured-social__field">
                    <label htmlFor="structured-meetup-visibility">
                      Visibilidade
                    </label>
                    <select
                      id="structured-meetup-visibility"
                      value={meetupVisibility}
                      onChange={(event) =>
                        setMeetupVisibility(
                          event.target.value as
                            | "public"
                            | "private"
                        )
                      }
                    >
                      <option value="public">
                        Clubbers autenticados
                      </option>
                      <option value="private">
                        Apenas envolvidos
                      </option>
                    </select>
                  </div>

                  <div className="structured-social__field structured-social__field--wide">
                    <label htmlFor="structured-meetup-reference">
                      Referência complementar
                    </label>
                    <input
                      id="structured-meetup-reference"
                      value={meetupReference}
                      onChange={(event) =>
                        setMeetupReference(event.target.value)
                      }
                      maxLength={500}
                      placeholder="Foto, placa, portão ou instrução sem localização privada."
                    />
                  </div>

                  <div className="structured-social__field structured-social__field--wide">
                    <label htmlFor="structured-meetup-description">
                      Descrição
                    </label>
                    <textarea
                      id="structured-meetup-description"
                      value={meetupDescription}
                      onChange={(event) =>
                        setMeetupDescription(event.target.value)
                      }
                      maxLength={500}
                      placeholder="Explique o objetivo do encontro."
                    />
                  </div>

                  <div className="structured-social__field structured-social__field--wide">
                    <label htmlFor="structured-meetup-rules">
                      Regras
                    </label>
                    <textarea
                      id="structured-meetup-rules"
                      value={meetupRules}
                      onChange={(event) =>
                        setMeetupRules(event.target.value)
                      }
                      maxLength={2000}
                      placeholder="Orientações simples para o grupo."
                    />
                  </div>

                  <button
                    className="structured-social__submit"
                    type="submit"
                    disabled={Boolean(busyKey)}
                  >
                    {busyKey === "create-meetup"
                      ? "Publicando..."
                      : "Publicar ponto de encontro"}
                  </button>
                </form>
              </details>

              <div className="structured-social__list">
                {loading ? (
                  <p className="structured-social__empty">
                    Carregando pontos de encontro...
                  </p>
                ) : activeMeetups.length === 0 ? (
                  <p className="structured-social__empty">
                    Ainda não há pontos de encontro estruturados
                    para este evento.
                  </p>
                ) : (
                  activeMeetups.map((meetup) => {
                    const isCreator =
                      meetup.creator_user_id === viewerUserId;
                    const approvedMembers =
                      meetupMembers.filter(
                        (member) =>
                          member.meetup_id ===
                            meetup.meetup_id &&
                          member.status === "approved"
                      );
                    const viewerMembership =
                      approvedMembers.find(
                        (member) =>
                          member.user_id === viewerUserId
                      );
                    const viewerPendingRequest =
                      meetupRequests.find(
                        (request) =>
                          request.meetup_id ===
                            meetup.meetup_id &&
                          request.requester_user_id ===
                            viewerUserId &&
                          request.status === "pending"
                      );
                    const ownerPendingRequests =
                      isCreator
                        ? meetupRequests.filter(
                            (request) =>
                              request.meetup_id ===
                                meetup.meetup_id &&
                              request.status === "pending"
                          )
                        : [];

                    const joinDisabled =
                      isCreator ||
                      Boolean(viewerMembership) ||
                      Boolean(viewerPendingRequest) ||
                      Boolean(busyKey);

                    let joinLabel = "Solicitar participação";

                    if (isCreator) {
                      joinLabel = "Encontro criado por você";
                    } else if (viewerMembership) {
                      joinLabel = "Participação confirmada";
                    } else if (viewerPendingRequest) {
                      joinLabel = "Solicitação pendente";
                    }

                    return (
                      <article
                        className="structured-social__card"
                        key={meetup.meetup_id}
                      >
                        <div className="structured-social__card-main">
                          <span className="structured-social__card-kicker">
                            Ponto de encontro estruturado
                          </span>
                          <h3 className="structured-social__card-title">
                            {meetup.name}
                          </h3>

                          <div className="structured-social__meta">
                            <span>
                              Local: {meetup.meeting_point_label}
                            </span>
                            <span>
                              Início:{" "}
                              {formatDateTime(meetup.starts_at)}
                            </span>
                            {meetup.ends_at ? (
                              <span>
                                Término:{" "}
                                {formatDateTime(meetup.ends_at)}
                              </span>
                            ) : null}
                            <span>
                              Participantes confirmados:{" "}
                              {approvedMembers.length}/
                              {meetup.max_members}
                            </span>
                            <span>
                              {getVisibilityLabel(
                                meetup.visibility
                              )}
                            </span>
                          </div>

                          {meetup.meeting_point_reference ? (
                            <p className="structured-social__note">
                              Referência:{" "}
                              {meetup.meeting_point_reference}
                            </p>
                          ) : null}

                          {meetup.description ? (
                            <p className="structured-social__note">
                              {meetup.description}
                            </p>
                          ) : null}

                          {meetup.rules ? (
                            <p className="structured-social__note">
                              Regras: {meetup.rules}
                            </p>
                          ) : null}
                        </div>

                        <div className="structured-social__card-side">
                          <button
                            type="button"
                            className="structured-social__action"
                            disabled={joinDisabled}
                            onClick={() =>
                              void runMutation(
                                `join-meetup-${meetup.meetup_id}`,
                                async () => {
                                  await postMutation(
                                    "/api/event-meetups",
                                    {
                                      action: "request_join",
                                      meetup_id:
                                        meetup.meetup_id,
                                      message: null,
                                    }
                                  );
                                },
                                "Solicitação de encontro enviada."
                              )
                            }
                          >
                            {busyKey ===
                            `join-meetup-${meetup.meetup_id}`
                              ? "Enviando..."
                              : joinLabel}
                          </button>

                          {isCreator &&
                          ownerPendingRequests.length > 0 ? (
                            <div className="structured-social__request-list">
                              <span className="structured-social__status">
                                Solicitações pendentes:{" "}
                                {ownerPendingRequests.length}
                              </span>

                              {ownerPendingRequests.map(
                                (request, index) => (
                                  <div
                                    className="structured-social__request"
                                    key={request.request_id}
                                  >
                                    <span className="structured-social__request-copy">
                                      Solicitação {index + 1}
                                      {request.message
                                        ? ` · ${request.message}`
                                        : ""}
                                    </span>

                                    <div className="structured-social__request-actions">
                                      <button
                                        type="button"
                                        className="structured-social__action"
                                        disabled={Boolean(busyKey)}
                                        onClick={() =>
                                          void runMutation(
                                            `approve-meetup-${request.request_id}`,
                                            async () => {
                                              await postMutation(
                                                "/api/event-meetups",
                                                {
                                                  action:
                                                    "decide_request",
                                                  request_id:
                                                    request.request_id,
                                                  decision:
                                                    "approved",
                                                }
                                              );
                                            },
                                            "Participação aprovada."
                                          )
                                        }
                                      >
                                        Aprovar
                                      </button>
                                      <button
                                        type="button"
                                        className="structured-social__action structured-social__action--reject"
                                        disabled={Boolean(busyKey)}
                                        onClick={() =>
                                          void runMutation(
                                            `reject-meetup-${request.request_id}`,
                                            async () => {
                                              await postMutation(
                                                "/api/event-meetups",
                                                {
                                                  action:
                                                    "decide_request",
                                                  request_id:
                                                    request.request_id,
                                                  decision:
                                                    "rejected",
                                                }
                                              );
                                            },
                                            "Solicitação recusada."
                                          )
                                        }
                                      >
                                        Recusar
                                      </button>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <span className="structured-social__status">
                              O ponto exato pode ser combinado após o
                              aceite.
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
