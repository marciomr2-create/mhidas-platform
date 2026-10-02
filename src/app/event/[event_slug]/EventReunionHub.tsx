"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  calculateReunionNavigation,
  classifyReunionFreshness,
  type ReunionCoordinate,
} from "@/lib/events/reunionNavigation";
import { createBrowserClient } from "@/utils/supabase/client";
import {
  mergeEventOfflinePackagePayload,
  queueEventOfflineOperation,
  readEventOfflinePackagePayload,
} from "@/lib/offline/eventOfflineClient";
import {
  deletePendingOfflineOperation,
  getReunionOfflineSnapshot,
  listPendingOfflineOperations,
  putReunionOfflineSnapshot,
  type EventOfflineOperationType,
} from "@/lib/offline/eventOfflineStore";

type Props = {
  eventGroupId: string;
  eventReturnTo: string;
  isAuthenticated: boolean;
};

type Meetup = {
  meetup_id: string;
  name: string;
  meeting_point_label: string;
  ends_at: string | null;
  expires_at: string | null;
  status: string;
};

type Member = {
  meetup_id: string;
  user_id: string;
  role: string;
  status: string;
};

type Person = {
  user_id: string;
  label: string;
  city_base: string | null;
};

type Consent = {
  consent_id: string;
  owner_user_id: string;
  requested_by_user_id: string;
  scope: "person" | "meetup";
  audience_user_id: string | null;
  meetup_id: string | null;
  status: string;
  expires_at: string;
};

type LiveLocation = {
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  captured_at: string;
};

type MeetupPoint = {
  label: string;
  latitude: number;
  longitude: number;
  captured_at: string;
} | null;

type Mode = "person" | "meetup" | null;

type CompassEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

type OrientationConstructor =
  typeof DeviceOrientationEvent & {
    requestPermission?: () =>
      Promise<"granted" | "denied">;
  };

const COPY = {
  actionError:
    "N\u00e3o foi poss\u00edvel concluir a a\u00e7\u00e3o.",
  loadError:
    "N\u00e3o foi poss\u00edvel carregar o ME PERDI! agora.",
  refreshError:
    "N\u00e3o foi poss\u00edvel atualizar o ME PERDI!.",
  noLocation:
    "Localiza\u00e7\u00e3o n\u00e3o dispon\u00edvel neste aparelho.",
  permission:
    "N\u00e3o foi poss\u00edvel acessar sua localiza\u00e7\u00e3o.",
  compass:
    "A b\u00fassola n\u00e3o foi liberada. A dist\u00e2ncia continua dispon\u00edvel.",
  offline:
    "Sem conex\u00e3o para atualizar sua localiza\u00e7\u00e3o agora.",
  cached:
    "Sem conex\u00e3o. Usando os \u00faltimos dados v\u00e1lidos salvos neste aparelho.",
  queued:
    "A\u00e7\u00e3o salva neste aparelho. Vamos sincronizar quando a conex\u00e3o voltar.",
  requestNeedsConnection:
    "Conecte-se para pedir a localiza\u00e7\u00e3o de uma nova pessoa.",
  sharingQueued:
    "Seu pedido foi salvo. O compartilhamento s\u00f3 ser\u00e1 ativado quando a conex\u00e3o voltar.",
  pointQueued:
    "Ponto atual salvo neste aparelho. Vamos sincronizar quando a conex\u00e3o voltar.",
  requested:
    "Pedido enviado. Aguardando a pessoa aceitar.",
  accepted:
    "Compartilhamento autorizado. Ative a localiza\u00e7\u00e3o deste celular.",
  declined:
    "Pedido recusado.",
  groupOn:
    "Compartilhamento autorizado para sua turma.",
  groupOff:
    "Compartilhamento com esta turma encerrado.",
  stopped:
    "Seu compartilhamento de localiza\u00e7\u00e3o foi encerrado.",
  deviceOn:
    "Localiza\u00e7\u00e3o ativa neste celular.",
  pointSaved:
    "Ponto atual da turma atualizado.",
  recent:
    "Atualizado agora",
  unstable:
    "Sinal inst\u00e1vel",
  old:
    "Posi\u00e7\u00e3o antiga",
  last:
    "\u00daltima posi\u00e7\u00e3o",
} as const;

const buttonStyle: CSSProperties = {
  minHeight:
    "var(--mhidas-control-min-height)",
  padding: "10px 14px",
  border:
    "1px solid var(--mhidas-border-strong)",
  borderRadius:
    "var(--mhidas-radius-md)",
  background:
    "var(--mhidas-card-secondary)",
  color:
    "var(--mhidas-text-primary)",
  fontWeight: 850,
  cursor: "pointer",
  whiteSpace: "normal",
};

function clean(
  value: unknown,
  max = 200
): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function loginHref(
  returnTo: string
): string {
  const safe = clean(returnTo);

  if (
    safe.startsWith("/event/") &&
    !safe.startsWith("//") &&
    !safe.includes("\\")
  ) {
    return `/login?next=${encodeURIComponent(
      safe
    )}`;
  }

  return "/login";
}

function expiryFor(
  meetups: Meetup[]
): string {
  const now = Date.now();
  const maximum =
    now + 24 * 60 * 60 * 1000;
  const fallback =
    now + 12 * 60 * 60 * 1000;

  const values = meetups
    .flatMap((item) => [
      item.ends_at,
      item.expires_at,
    ])
    .filter(
      (value): value is string =>
        Boolean(value)
    )
    .map(
      (value) =>
        new Date(value).getTime()
    )
    .filter(
      (value) =>
        Number.isFinite(value) &&
        value > now
    );

  const limit =
    values.length > 0
      ? Math.max(...values)
      : fallback;

  return new Date(
    Math.min(
      limit,
      maximum
    )
  ).toISOString();
}

function freshnessLabel(
  capturedAt: string
): string {
  const result =
    classifyReunionFreshness(
      capturedAt
    );

  if (
    result.freshness ===
    "recent"
  ) {
    return COPY.recent;
  }

  if (
    result.freshness ===
    "unstable"
  ) {
    return COPY.unstable;
  }

  if (
    result.freshness ===
    "last_known"
  ) {
    return `${COPY.last} - ${Math.max(
      1,
      Math.round(
        result.age_seconds / 60
      )
    )} min`;
  }

  return COPY.old;
}

function distanceLabel(
  meters: number
): string {
  if (meters < 1000) {
    return `${Math.max(
      1,
      Math.round(meters)
    )} m`;
  }

  return `${(
    meters / 1000
  ).toFixed(1)} km`;
}

function getPositionOnce():
  Promise<GeolocationPosition> {
  return new Promise(
    (resolve, reject) => {
      if (
        typeof navigator ===
          "undefined" ||
        !navigator.geolocation
      ) {
        reject(
          new Error(
            COPY.noLocation
          )
        );
        return;
      }

      navigator.geolocation
        .getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy:
              true,
            maximumAge: 5000,
            timeout: 20000,
          }
        );
    }
  );
}

type ReunionOfflinePackage = {
  reunion_meetups?: unknown;
  reunion_members?: unknown;
  reunion_people?: unknown;
  reunion_viewer_user_id?: unknown;
  reunion_consents?: unknown;
  reunion_cached_target_ids?: unknown;
};

async function resolveLocalUserId():
  Promise<string> {
  try {
    const supabase =
      createBrowserClient();

    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    return (
      session?.user?.id?.trim() ?? ""
    );
  } catch {
    return "";
  }
}

function snapshotExpiry(
  capturedAt: string
): string | null {
  const captured =
    new Date(
      capturedAt
    ).getTime();

  if (!Number.isFinite(captured)) {
    return null;
  }

  return new Date(
    captured +
      5 * 60 * 1000
  ).toISOString();
}

function asCachedIds(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" &&
          item.trim().length > 0
      )
    )
  );
}

export default function EventReunionHub({
  eventGroupId,
  eventReturnTo,
  isAuthenticated,
}: Props) {
  const [
    mode,
    setMode,
  ] = useState<Mode>(null);

  const [
    viewerUserId,
    setViewerUserId,
  ] = useState("");

  const [
    meetups,
    setMeetups,
  ] = useState<Meetup[]>([]);

  const [
    members,
    setMembers,
  ] = useState<Member[]>([]);

  const [
    people,
    setPeople,
  ] = useState<Person[]>([]);

  const [
    consents,
    setConsents,
  ] = useState<Consent[]>([]);

  const [
    locations,
    setLocations,
  ] =
    useState<
      LiveLocation[]
    >([]);

  const [
    meetupPoint,
    setMeetupPoint,
  ] =
    useState<MeetupPoint>(
      null
    );

  const [
    personId,
    setPersonId,
  ] = useState("");

  const [
    meetupId,
    setMeetupId,
  ] = useState("");

  const [
    targetUserId,
    setTargetUserId,
  ] = useState("");

  const [
    current,
    setCurrent,
  ] =
    useState<
      ReunionCoordinate | null
    >(null);

  const [
    heading,
    setHeading,
  ] =
    useState<
      number | null
    >(null);

  const [
    navigating,
    setNavigating,
  ] = useState(false);

  const [
    sharingDevice,
    setSharingDevice,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    offlineQueuePending,
    setOfflineQueuePending,
  ] = useState(false);

  const watchRef =
    useRef<
      number | null
    >(null);

  const uploadRef =
    useRef(false);

  const lastUploadRef =
    useRef(0);

  const headingRef =
    useRef<
      ((
        event:
          DeviceOrientationEvent
      ) => void) |
        null
    >(null);

  const queueOffline =
    useCallback(
      async (
        operationType:
          EventOfflineOperationType,
        payload:
          Record<
            string,
            unknown
          >,
        options?: {
          capturedAt?: string;
          expiresAt?: string;
        }
      ): Promise<boolean> => {
        const userId =
          viewerUserId ||
          (await resolveLocalUserId());

        if (!userId) {
          return false;
        }

        try {
          if (
            operationType ===
              "reunion_location"
          ) {
            const pending =
              await listPendingOfflineOperations(
                userId,
                eventGroupId
              );

            for (
              const item
              of pending
            ) {
              if (
                item.operation_type ===
                  "reunion_location"
              ) {
                await deletePendingOfflineOperation(
                  item.operation_id
                );
              }
            }
          }

          const queued =
            await queueEventOfflineOperation({
              userId,
              eventGroupId,
              operationType,
              payload,
              priority:
                operationType ===
                  "reunion_revoke"
                  ? 100
                  : 0,
              capturedAt:
                options
                  ?.capturedAt,
              expiresAt:
                options
                  ?.expiresAt,
            });

          if (!queued) {
            return false;
          }

          setViewerUserId(
            userId
          );

          setOfflineQueuePending(
            true
          );

          return true;
        } catch {
          return false;
        }
      },
      [
        eventGroupId,
        viewerUserId,
      ]
    );

  const peopleById =
    useMemo(
      () =>
        new Map(
          people.map(
            (person) => [
              person.user_id,
              person,
            ]
          )
        ),
      [people]
    );

  const myMeetupIds =
    useMemo(
      () =>
        new Set(
          members
            .filter(
              (member) =>
                member.user_id ===
                  viewerUserId &&
                member.status ===
                  "approved"
            )
            .map(
              (member) =>
                member.meetup_id
            )
        ),
      [
        members,
        viewerUserId,
      ]
    );

  const myMeetups =
    useMemo(
      () =>
        meetups.filter(
          (meetup) =>
            meetup.status ===
              "active" &&
            myMeetupIds.has(
              meetup.meetup_id
            )
        ),
      [
        meetups,
        myMeetupIds,
      ]
    );

  const eligiblePeople =
    useMemo(() => {
      const ids =
        new Set(
          members
            .filter(
              (member) =>
                member.status ===
                  "approved" &&
                member.user_id !==
                  viewerUserId &&
                myMeetupIds.has(
                  member.meetup_id
                )
            )
            .map(
              (member) =>
                member.user_id
            )
        );

      return Array.from(ids)
        .map(
          (id) =>
            peopleById.get(id)
        )
        .filter(
          (
            person
          ): person is Person =>
            Boolean(person)
        );
    }, [
      members,
      myMeetupIds,
      peopleById,
      viewerUserId,
    ]);

  const sharedMeetups =
    useMemo(() => {
      if (!personId) {
        return [];
      }

      const ids =
        new Set(
          members
            .filter(
              (member) =>
                member.user_id ===
                  personId &&
                member.status ===
                  "approved"
            )
            .map(
              (member) =>
                member.meetup_id
            )
        );

      return myMeetups.filter(
        (meetup) =>
          ids.has(
            meetup.meetup_id
          )
      );
    }, [
      members,
      myMeetups,
      personId,
    ]);

  const selectedMeetup =
    myMeetups.find(
      (meetup) =>
        meetup.meetup_id ===
        meetupId
    );

  const selectedPerson =
    peopleById.get(
      personId
    );

  const membership =
    members.find(
      (member) =>
        member.meetup_id ===
          meetupId &&
        member.user_id ===
          viewerUserId &&
        member.status ===
          "approved"
    );

  const canSetPoint =
    membership?.role ===
      "creator" ||
    membership?.role ===
      "organizer";

  const incoming =
    consents.filter(
      (item) =>
        item.scope ===
          "person" &&
        item.owner_user_id ===
          viewerUserId &&
        item.status ===
          "requested" &&
        new Date(
          item.expires_at
        ).getTime() >
          Date.now()
    );

  const ownActive =
    consents.filter(
      (item) =>
        item.owner_user_id ===
          viewerUserId &&
        item.status ===
          "active" &&
        new Date(
          item.expires_at
        ).getTime() >
          Date.now()
    );

  const personConsent =
    consents.find(
      (item) =>
        item.scope ===
          "person" &&
        item.owner_user_id ===
          personId &&
        item.audience_user_id ===
          viewerUserId &&
        item.status ===
          "active" &&
        new Date(
          item.expires_at
        ).getTime() >
          Date.now()
    );

  const personRequest =
    consents.find(
      (item) =>
        item.scope ===
          "person" &&
        item.owner_user_id ===
          personId &&
        item.audience_user_id ===
          viewerUserId &&
        item.status ===
          "requested" &&
        new Date(
          item.expires_at
        ).getTime() >
          Date.now()
    );

  const groupConsent =
    consents.find(
      (item) =>
        item.scope ===
          "meetup" &&
        item.owner_user_id ===
          viewerUserId &&
        item.meetup_id ===
          meetupId &&
        item.status ===
          "active" &&
        new Date(
          item.expires_at
        ).getTime() >
          Date.now()
    );

  const targetId =
    mode === "person"
      ? personId
      : targetUserId;

  const targetLocation =
    locations.find(
      (location) =>
        location.user_id ===
        targetId
    );

  const navigation =
    useMemo(() => {
      if (
        !current ||
        !targetLocation
      ) {
        return null;
      }

      try {
        return calculateReunionNavigation(
          current,
          {
            latitude:
              targetLocation.latitude,
            longitude:
              targetLocation.longitude,
          },
          targetLocation.captured_at,
          heading,
          Boolean(
            meetupPoint ||
              selectedMeetup
                ?.meeting_point_label ||
              sharedMeetups[0]
                ?.meeting_point_label
          )
        );
      } catch {
        return null;
      }
    }, [
      current,
      heading,
      meetupPoint,
      selectedMeetup,
      sharedMeetups,
      targetLocation,
    ]);

  const post =
    useCallback(
      async (
        body:
          Record<
            string,
            unknown
          >
      ) => {
        const response =
          await fetch(
            "/api/event-reunion",
            {
              method: "POST",
              credentials:
                "same-origin",
              cache:
                "no-store",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify(
                  body
                ),
            }
          );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            clean(
              payload?.message
            ) ||
              COPY.actionError
          );
        }

        return payload;
      },
      []
    );

  const loadReunion =
    useCallback(
      async (
        activeMeetup:
          string | null
      ) => {
        if (!isAuthenticated) {
          return;
        }

        const localUserId =
          await resolveLocalUserId();

        let cachedLoaded = false;
        let cachedTargetIds:
          string[] = [];

        if (localUserId) {
          try {
            const cached =
              await readEventOfflinePackagePayload(
                localUserId,
                eventGroupId
              );

            if (cached) {
              const offline =
                cached as ReunionOfflinePackage;

              const cachedConsents =
                Array.isArray(
                  offline.reunion_consents
                )
                  ? offline.reunion_consents
                  : [];

              cachedTargetIds =
                asCachedIds(
                  offline
                    .reunion_cached_target_ids
                );

              setConsents(
                cachedConsents as Consent[]
              );

              const cachedLocations:
                LiveLocation[] = [];

              let cachedPoint:
                MeetupPoint = null;

              for (
                const targetId
                of cachedTargetIds
              ) {
                const snapshot =
                  await getReunionOfflineSnapshot(
                    localUserId,
                    eventGroupId,
                    "person",
                    targetId
                  );

                if (!snapshot) {
                  continue;
                }

                if (
                  typeof snapshot.latitude !==
                    "number" ||
                  typeof snapshot.longitude !==
                    "number" ||
                  typeof snapshot.accuracy_meters !==
                    "number" ||
                  !snapshot.captured_at
                ) {
                  continue;
                }

                cachedLocations.push({
                  user_id:
                    snapshot.target_id,
                  latitude:
                    snapshot.latitude,
                  longitude:
                    snapshot.longitude,
                  accuracy_meters:
                    snapshot.accuracy_meters,
                  captured_at:
                    snapshot.captured_at,
                });

                if (
                  !cachedPoint &&
                  snapshot
                    .meetup_point_label &&
                  typeof snapshot
                    .meetup_point_latitude ===
                    "number" &&
                  typeof snapshot
                    .meetup_point_longitude ===
                    "number" &&
                  snapshot
                    .meetup_point_captured_at
                ) {
                  cachedPoint = {
                    label:
                      snapshot
                        .meetup_point_label,
                    latitude:
                      snapshot
                        .meetup_point_latitude,
                    longitude:
                      snapshot
                        .meetup_point_longitude,
                    captured_at:
                      snapshot
                        .meetup_point_captured_at,
                  };
                }
              }

              if (
                cachedLocations.length >
                0
              ) {
                setLocations(
                  cachedLocations
                );

                cachedLoaded = true;
              }

              if (cachedPoint) {
                setMeetupPoint(
                  cachedPoint
                );

                cachedLoaded = true;
              }

              if (
                cachedConsents.length >
                0
              ) {
                cachedLoaded = true;
              }
            }
          } catch {
            // Local cache is auxiliary.
          }
        }

        const query =
          new URLSearchParams({
            event_group_id:
              eventGroupId,
          });

        if (activeMeetup) {
          query.set(
            "meetup_id",
            activeMeetup
          );
        }

        try {
          const response =
            await fetch(
              `/api/event-reunion?${query.toString()}`,
              {
                credentials:
                  "same-origin",
                cache:
                  "no-store",
              }
            );

          const payload =
            await response.json();

          if (!response.ok) {
            throw new Error(
              COPY.refreshError
            );
          }

          const nextViewerUserId =
            clean(
              payload
                .viewer_user_id,
              64
            );

          const nextConsents =
            Array.isArray(
              payload.consents
            )
              ? payload.consents
              : [];

          const nextLocations =
            Array.isArray(
              payload.locations
            )
              ? payload.locations
              : [];

          const nextMeetupPoint =
            payload.meetup_point ??
            null;

          setViewerUserId(
            nextViewerUserId
          );

          setConsents(
            nextConsents
          );

          setLocations(
            nextLocations
          );

          setMeetupPoint(
            nextMeetupPoint
          );

          const cacheUserId =
            nextViewerUserId ||
            localUserId;

          if (cacheUserId) {
            const targetIds =
              Array.from(
                new Set([
                  ...cachedTargetIds,
                  ...nextLocations
                    .map(
                      (
                        location:
                          LiveLocation
                      ) =>
                        clean(
                          location
                            .user_id,
                          64
                        )
                    )
                    .filter(Boolean),
                ])
              );

            try {
              await mergeEventOfflinePackagePayload({
                userId:
                  cacheUserId,
                eventGroupId,
                patch: {
                  reunion_consents:
                    nextConsents,
                  reunion_cached_target_ids:
                    targetIds,
                },
              });

              const receivedAt =
                new Date()
                  .toISOString();

              for (
                const location
                of nextLocations
              ) {
                const targetId =
                  clean(
                    location.user_id,
                    64
                  );

                const expiresAt =
                  snapshotExpiry(
                    location.captured_at
                  );

                if (
                  !targetId ||
                  !expiresAt
                ) {
                  continue;
                }

                await putReunionOfflineSnapshot({
                  user_id:
                    cacheUserId,
                  event_group_id:
                    eventGroupId,
                  target_kind:
                    "person",
                  target_id:
                    targetId,
                  target_label:
                    "Clubber",
                  target_photo_url:
                    null,
                  latitude:
                    location.latitude,
                  longitude:
                    location.longitude,
                  accuracy_meters:
                    location
                      .accuracy_meters,
                  captured_at:
                    location.captured_at,
                  received_at:
                    receivedAt,
                  meetup_point_label:
                    nextMeetupPoint
                      ?.label ??
                    null,
                  meetup_point_latitude:
                    typeof nextMeetupPoint
                      ?.latitude ===
                    "number"
                      ? nextMeetupPoint
                          .latitude
                      : null,
                  meetup_point_longitude:
                    typeof nextMeetupPoint
                      ?.longitude ===
                    "number"
                      ? nextMeetupPoint
                          .longitude
                      : null,
                  meetup_point_accuracy_meters:
                    null,
                  meetup_point_captured_at:
                    nextMeetupPoint
                      ?.captured_at ??
                    null,
                  expires_at:
                    expiresAt,
                });
              }
            } catch {
              // Network data remains authoritative.
            }
          }
        } catch {
          if (cachedLoaded) {
            setMessage(
              COPY.cached
            );
          } else {
            setMessage(
              COPY.refreshError
            );
          }
        }
      },
      [
        eventGroupId,
        isAuthenticated,
      ]
    );

  const loadContext =
    useCallback(
      async () => {
        if (!isAuthenticated) {
          setLoading(false);
          return;
        }

        setLoading(true);

        const localUserId =
          await resolveLocalUserId();

        let cachedLoaded = false;

        if (localUserId) {
          try {
            const cached =
              await readEventOfflinePackagePayload(
                localUserId,
                eventGroupId
              );

            if (cached) {
              const offline =
                cached as ReunionOfflinePackage;

              const cachedMeetups =
                Array.isArray(
                  offline.reunion_meetups
                )
                  ? offline.reunion_meetups
                  : [];

              const cachedMembers =
                Array.isArray(
                  offline.reunion_members
                )
                  ? offline.reunion_members
                  : [];

              const cachedPeople =
                Array.isArray(
                  offline.reunion_people
                )
                  ? offline.reunion_people
                  : [];

              const cachedViewer =
                clean(
                  offline
                    .reunion_viewer_user_id,
                  64
                ) ||
                localUserId;

              if (
                cachedMeetups.length >
                  0 ||
                cachedMembers.length >
                  0 ||
                cachedPeople.length >
                  0
              ) {
                setMeetups(
                  cachedMeetups as Meetup[]
                );

                setMembers(
                  cachedMembers as Member[]
                );

                setPeople(
                  cachedPeople as Person[]
                );

                setViewerUserId(
                  cachedViewer
                );

                cachedLoaded = true;
              }
            }

            const pending =
              await listPendingOfflineOperations(
                localUserId,
                eventGroupId
              );

            setOfflineQueuePending(
              pending.some(
                (item) =>
                  item.operation_type
                    .startsWith(
                      "reunion_"
                    )
              )
            );
          } catch {
            // Local cache is auxiliary.
          }
        }

        try {
          const response =
            await fetch(
              `/api/event-meetups?event_group_id=${encodeURIComponent(
                eventGroupId
              )}`,
              {
                credentials:
                  "same-origin",
                cache:
                  "no-store",
              }
            );

          const payload =
            await response.json();

          if (!response.ok) {
            throw new Error();
          }

          const nextViewerUserId =
            clean(
              payload
                .viewer_user_id,
              64
            );

          const nextMeetups =
            Array.isArray(
              payload.meetups
            )
              ? payload.meetups
              : [];

          const nextMembers =
            Array.isArray(
              payload.members
            )
              ? payload.members
              : [];

          const nextPeople =
            Array.isArray(
              payload.people
            )
              ? payload.people
              : [];

          setViewerUserId(
            nextViewerUserId
          );

          setMeetups(
            nextMeetups
          );

          setMembers(
            nextMembers
          );

          setPeople(
            nextPeople
          );

          const cacheUserId =
            nextViewerUserId ||
            localUserId;

          if (cacheUserId) {
            try {
              await mergeEventOfflinePackagePayload({
                userId:
                  cacheUserId,
                eventGroupId,
                patch: {
                  reunion_meetups:
                    nextMeetups,
                  reunion_members:
                    nextMembers,
                  reunion_people:
                    nextPeople,
                  reunion_viewer_user_id:
                    cacheUserId,
                },
              });
            } catch {
              // Network data remains authoritative.
            }
          }
        } catch {
          if (cachedLoaded) {
            setMessage(
              COPY.cached
            );
          } else {
            setMessage(
              COPY.loadError
            );
          }
        }

        await loadReunion(
          null
        );

        setLoading(false);
      },
      [
        eventGroupId,
        isAuthenticated,
        loadReunion,
      ]
    );

  const stopWatch =
    useCallback(() => {
      if (
        typeof navigator !==
          "undefined" &&
        watchRef.current !==
          null
      ) {
        navigator.geolocation
          .clearWatch(
            watchRef.current
          );
      }

      watchRef.current =
        null;

      lastUploadRef.current =
        0;
    }, []);

  const detachHeading =
    useCallback(() => {
      if (
        typeof window !==
          "undefined" &&
        headingRef.current
      ) {
        window.removeEventListener(
          "deviceorientation",
          headingRef.current
        );
      }

      headingRef.current =
        null;

      setHeading(null);
    }, []);

  const uploadLocation =
    useCallback(
      async (
        coords:
          GeolocationCoordinates,
        timestamp: number
      ) => {
        const capturedAt =
          new Date(
            timestamp
          ).toISOString();

        const expiresAt =
          snapshotExpiry(
            capturedAt
          ) ??
          new Date(
            Date.now() +
              5 * 60 * 1000
          ).toISOString();

        const payload = {
          latitude:
            coords.latitude,
          longitude:
            coords.longitude,
          accuracy_meters:
            coords.accuracy,
          captured_at:
            capturedAt,
        };

        if (
          typeof navigator !==
            "undefined" &&
          !navigator.onLine
        ) {
          const queued =
            await queueOffline(
              "reunion_location",
              payload,
              {
                capturedAt,
                expiresAt,
              }
            );

          if (!queued) {
            setMessage(
              COPY.offline
            );
          }

          return;
        }

        try {
          await post({
            action:
              "update_location",
            event_group_id:
              eventGroupId,
            ...payload,
          });
        } catch {
          const queued =
            await queueOffline(
              "reunion_location",
              payload,
              {
                capturedAt,
                expiresAt,
              }
            );

          if (!queued) {
            setMessage(
              COPY.offline
            );
          }
        }
      },
      [
        eventGroupId,
        post,
        queueOffline,
      ]
    );

  const ensureWatch =
    useCallback(
      (
        upload: boolean
      ): boolean => {
        if (
          typeof navigator ===
            "undefined" ||
          !navigator.geolocation
        ) {
          setMessage(
            COPY.noLocation
          );
          return false;
        }

        uploadRef.current =
          upload ||
          uploadRef.current;

        if (
          watchRef.current !==
          null
        ) {
          if (upload) {
            setSharingDevice(
              true
            );
          }

          return true;
        }

        watchRef.current =
          navigator.geolocation
            .watchPosition(
              (position) => {
                setCurrent({
                  latitude:
                    position
                      .coords
                      .latitude,
                  longitude:
                    position
                      .coords
                      .longitude,
                });

                if (
                  !uploadRef.current
                ) {
                  return;
                }

                const now =
                  Date.now();

                if (
                  now -
                    lastUploadRef
                      .current <
                  15000
                ) {
                  return;
                }

                lastUploadRef.current =
                  now;

                void uploadLocation(
                  position.coords,
                  position.timestamp
                );
              },
              () => {
                setMessage(
                  COPY.permission
                );
              },
              {
                enableHighAccuracy:
                  true,
                maximumAge:
                  10000,
                timeout:
                  20000,
              }
            );

        if (upload) {
          setSharingDevice(
            true
          );
        }

        return true;
      },
      [uploadLocation]
    );

  const attachHeading =
    useCallback(
      async () => {
        if (
          typeof window ===
            "undefined" ||
          typeof DeviceOrientationEvent ===
            "undefined"
        ) {
          return;
        }

        const constructor =
          DeviceOrientationEvent as
            OrientationConstructor;

        if (
          typeof constructor
            .requestPermission ===
          "function"
        ) {
          const permission =
            await constructor
              .requestPermission();

          if (
            permission !==
            "granted"
          ) {
            setMessage(
              COPY.compass
            );
            return;
          }
        }

        if (
          headingRef.current
        ) {
          return;
        }

        const handler = (
          raw:
            DeviceOrientationEvent
        ) => {
          const event =
            raw as CompassEvent;

          if (
            typeof event
              .webkitCompassHeading ===
              "number"
          ) {
            setHeading(
              event
                .webkitCompassHeading
            );
            return;
          }

          if (
            typeof event.alpha ===
              "number"
          ) {
            setHeading(
              (
                360 -
                event.alpha
              ) % 360
            );
          }
        };

        headingRef.current =
          handler;

        window.addEventListener(
          "deviceorientation",
          handler
        );
      },
      []
    );

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    const handleOfflineSync =
      () => {
        void (async () => {
          const userId =
            viewerUserId ||
            (await resolveLocalUserId());

          if (!userId) {
            return;
          }

          try {
            const pending =
              await listPendingOfflineOperations(
                userId,
                eventGroupId
              );

            const stillPending =
              pending.some(
                (item) =>
                  item.operation_type
                    .startsWith(
                      "reunion_"
                    )
              );

            setOfflineQueuePending(
              stillPending
            );

            if (!stillPending) {
              await loadContext();
            }
          } catch {
            // A fila local continua sendo a fonte do estado pendente.
          }
        })();
      };

    window.addEventListener(
      "mhidas:event-offline-sync",
      handleOfflineSync
    );

    return () => {
      window.removeEventListener(
        "mhidas:event-offline-sync",
        handleOfflineSync
      );
    };
  }, [
    eventGroupId,
    loadContext,
    viewerUserId,
  ]);

  useEffect(
    () => () => {
      stopWatch();
      detachHeading();
    },
    [
      detachHeading,
      stopWatch,
    ]
  );

  useEffect(() => {
    if (
      !isAuthenticated ||
      (
        !navigating &&
        !sharingDevice
      )
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          void loadReunion(
            mode === "meetup"
              ? meetupId ||
                  null
              : null
          );
        },
        15000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    isAuthenticated,
    loadReunion,
    meetupId,
    mode,
    navigating,
    sharingDevice,
  ]);

  async function run(
    task:
      () => Promise<void>
  ) {
    setBusy(true);
    setMessage("");

    try {
      await task();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : COPY.actionError
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestPerson() {
    if (
      !personId ||
      sharedMeetups.length ===
        0
    ) {
      return;
    }

    if (
      typeof navigator !==
        "undefined" &&
      !navigator.onLine
    ) {
      setMessage(
        COPY.requestNeedsConnection
      );

      return;
    }

    await run(async () => {
      await post({
        action:
          "request_person",
        event_group_id:
          eventGroupId,
        owner_user_id:
          personId,
        expires_at:
          expiryFor(
            sharedMeetups
          ),
      });

      setMessage(
        COPY.requested
      );

      await loadReunion(
        null
      );
    });
  }

  async function respond(
    consentId: string,
    accept: boolean
  ) {
    await run(async () => {
      const intent = {
        action:
          "respond_person",
        consent_id:
          consentId,
        accept,
      };

      const consent =
        consents.find(
          (item) =>
            item.consent_id ===
            consentId
        );

      if (
        typeof navigator !==
          "undefined" &&
        !navigator.onLine
      ) {
        const queued =
          await queueOffline(
            "reunion_consent_intent",
            intent,
            {
              expiresAt:
                consent
                  ?.expires_at,
            }
          );

        if (!queued) {
          throw new Error(
            COPY.actionError
          );
        }

        setMessage(
          COPY.queued
        );

        return;
      }

      try {
        await post({
          ...intent,
        });
      } catch {
        const queued =
          await queueOffline(
            "reunion_consent_intent",
            intent,
            {
              expiresAt:
                consent
                  ?.expires_at,
            }
          );

        if (!queued) {
          throw new Error(
            COPY.actionError
          );
        }

        setMessage(
          COPY.queued
        );

        return;
      }

      setMessage(
        accept
          ? COPY.accepted
          : COPY.declined
      );

      await loadReunion(
        mode === "meetup"
          ? meetupId || null
          : null
      );
    });
  }

  async function setGroupSharing(
    active: boolean
  ) {
    if (!selectedMeetup) {
      return;
    }

    const selectedMeetupId =
      selectedMeetup.meetup_id;

    await run(async () => {
      const expiresAt =
        active
          ? expiryFor([
              selectedMeetup,
            ])
          : null;

      const intent = {
        action:
          "set_meetup_consent",
        meetup_id:
          selectedMeetup
            .meetup_id,
        active,
        expires_at:
          expiresAt,
      };

      async function applyQueued():
        Promise<boolean> {
        const queued =
          await queueOffline(
            "reunion_consent_intent",
            intent,
            {
              expiresAt:
                expiresAt ??
                undefined,
            }
          );

        if (!queued) {
          return false;
        }

        if (!active) {
          uploadRef.current =
            false;

          setSharingDevice(
            false
          );

          setConsents(
            (currentConsents) =>
              currentConsents.filter(
                (item) =>
                  !(
                    item.scope ===
                      "meetup" &&
                    item.owner_user_id ===
                      viewerUserId &&
                    item.meetup_id ===
                      selectedMeetupId &&
                    item.status ===
                      "active"
                  )
              )
          );

          if (!navigating) {
            stopWatch();
          }

          setMessage(
            COPY.groupOff
          );
        } else {
          setMessage(
            COPY.sharingQueued
          );
        }

        return true;
      }

      if (
        typeof navigator !==
          "undefined" &&
        !navigator.onLine
      ) {
        const queued =
          await applyQueued();

        if (!queued) {
          throw new Error(
            COPY.actionError
          );
        }

        return;
      }

      try {
        await post({
          ...intent,
          event_group_id:
            eventGroupId,
        });
      } catch {
        const queued =
          await applyQueued();

        if (!queued) {
          throw new Error(
            COPY.actionError
          );
        }

        return;
      }

      if (!active) {
        uploadRef.current =
          false;

        setSharingDevice(
          false
        );

        if (!navigating) {
          stopWatch();
        }
      }

      setMessage(
        active
          ? COPY.groupOn
          : COPY.groupOff
      );

      await loadReunion(
        selectedMeetup
          .meetup_id
      );
    });
  }

  async function stopSharing() {
    await run(async () => {
      for (
        const consent
        of ownActive
      ) {
        let revokedOnline =
          false;

        if (
          typeof navigator ===
            "undefined" ||
          navigator.onLine
        ) {
          try {
            await post({
              action:
                "revoke_consent",
              consent_id:
                consent
                  .consent_id,
            });

            revokedOnline =
              true;
          } catch {
            revokedOnline =
              false;
          }
        }

        if (!revokedOnline) {
          const queued =
            await queueOffline(
              "reunion_revoke",
              {
                consent_id:
                  consent
                    .consent_id,
              }
            );

          if (!queued) {
            throw new Error(
              COPY.actionError
            );
          }
        }
      }

      uploadRef.current =
        false;

      setSharingDevice(
        false
      );

      setConsents(
        (currentConsents) =>
          currentConsents.filter(
            (item) =>
              !(
                item.owner_user_id ===
                  viewerUserId &&
                item.status ===
                  "active"
              )
          )
      );

      if (!navigating) {
        stopWatch();
      }

      setMessage(
        offlineQueuePending
          ? COPY.queued
          : COPY.stopped
      );

      if (
        typeof navigator ===
          "undefined" ||
        navigator.onLine
      ) {
        await loadReunion(
          mode === "meetup"
            ? meetupId || null
            : null
        );
      }
    });
  }

  async function markGroupHere() {
    if (
      !selectedMeetup ||
      !canSetPoint
    ) {
      return;
    }

    await run(async () => {
      const position =
        await getPositionOnce();

      const captured =
        new Date(
          position.timestamp
        );

      const capturedAt =
        captured.toISOString();

      const expiresAt =
        new Date(
          captured.getTime() +
          5 * 60 * 1000
        ).toISOString();

      const point = {
        meetup_id:
          selectedMeetup
            .meetup_id,
        label:
          "A turma est\u00e1 aqui",
        latitude:
          position.coords
            .latitude,
        longitude:
          position.coords
            .longitude,
        accuracy_meters:
          position.coords
            .accuracy,
        captured_at:
          capturedAt,
        expires_at:
          expiresAt,
      };

      async function applyQueued():
        Promise<boolean> {
        const queued =
          await queueOffline(
            "reunion_meetup_point",
            point,
            {
              capturedAt,
              expiresAt,
            }
          );

        if (!queued) {
          return false;
        }

        setMeetupPoint({
          label:
            point.label,
          latitude:
            point.latitude,
          longitude:
            point.longitude,
          captured_at:
            point.captured_at,
        });

        setMessage(
          COPY.pointQueued
        );

        return true;
      }

      if (
        typeof navigator !==
          "undefined" &&
        !navigator.onLine
      ) {
        const queued =
          await applyQueued();

        if (!queued) {
          throw new Error(
            COPY.actionError
          );
        }

        return;
      }

      try {
        await post({
          action:
            "set_meetup_point",
          event_group_id:
            eventGroupId,
          ...point,
        });
      } catch {
        const queued =
          await applyQueued();

        if (!queued) {
          throw new Error(
            COPY.actionError
          );
        }

        return;
      }

      setMessage(
        COPY.pointSaved
      );

      await loadReunion(
        selectedMeetup
          .meetup_id
      );
    });
  }

  async function startCompass() {
    if (
      !targetLocation ||
      !ensureWatch(false)
    ) {
      return;
    }

    try {
      await attachHeading();
    } catch {
      setMessage(
        COPY.compass
      );
    }

    setNavigating(
      true
    );
  }

  function activateLocation() {
    if (
      ownActive.length > 0 &&
      ensureWatch(true)
    ) {
      setMessage(
        COPY.deviceOn
      );
    }
  }

  function finishNavigation() {
    setNavigating(
      false
    );

    detachHeading();

    if (
      !uploadRef.current
    ) {
      stopWatch();
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="uc-ui-surface">
        <p
          className="uc-ui-label"
          style={{
            margin: 0,
          }}
        >
          ME PERDI!
        </p>

        <h3>
          {
            "Encontre sua turma"
          }
        </h3>

        <p>
          {
            "Entre para usar localiza\u00e7\u00e3o tempor\u00e1ria com consentimento."
          }
        </p>

        <Link
          href={loginHref(
            eventReturnTo
          )}
          className="uc-ui-button uc-ui-button--primary"
        >
          Entrar
        </Link>
      </div>
    );
  }

  const groupSharers =
    locations
      .map(
        (location) => ({
          location,
          person:
            peopleById.get(
              location.user_id
            ),
        })
      )
      .filter(
        (
          item
        ): item is {
          location:
            LiveLocation;
          person:
            Person;
        } =>
          Boolean(
            item.person
          )
      );

  const fallbackLabel =
    meetupPoint?.label ??
    selectedMeetup
      ?.meeting_point_label ??
    sharedMeetups[0]
      ?.meeting_point_label ??
    null;

  return (
    <section
      className="event-reunion"
      aria-labelledby="event-reunion-title"
    >
      <style>{`
        .event-reunion{display:grid;gap:14px;min-width:0}
        .event-reunion__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        .event-reunion__card{min-width:0;display:grid;gap:10px;padding:14px;border:1px solid var(--mhidas-border);border-radius:var(--mhidas-radius-md);background:var(--mhidas-card-dark);overflow-wrap:anywhere}
        .event-reunion__pick{width:100%;min-width:0;display:grid;gap:4px;padding:14px;border:1px solid var(--mhidas-border);border-radius:var(--mhidas-radius-md);background:var(--mhidas-card-secondary);color:var(--mhidas-text-primary);text-align:left;cursor:pointer;white-space:normal;overflow-wrap:anywhere}
        .event-reunion__pick[data-active="true"]{border-color:color-mix(in srgb,var(--mhidas-mode-action,var(--mhidas-clubber-action)) 72%,transparent);background:var(--mhidas-card-secondary);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--mhidas-mode-action,var(--mhidas-clubber-action)) 14%,transparent)}
        .event-reunion__muted{color:var(--mhidas-text-secondary);font-size:12px;line-height:1.5;overflow-wrap:anywhere}
        .event-reunion__actions{display:flex;flex-wrap:wrap;gap:8px}
        .event-reunion__arrow{display:grid;place-items:center;width:110px;height:110px;margin:auto;font-size:76px;line-height:1;transform-origin:center}
        .event-reunion__distance{text-align:center;color:var(--mhidas-text-primary);font-size:clamp(30px,8vw,44px);font-weight:950}
        .event-reunion__status{text-align:center;color:var(--mhidas-mode-action,var(--mhidas-clubber-action));font-size:12px;font-weight:900;text-transform:uppercase}
        @media(max-width:760px){.event-reunion__grid{grid-template-columns:1fr}.event-reunion__actions{display:grid}.event-reunion__actions button{width:100%}}
      `}</style>

      <header>
        <span
          style={{
            color:
              "var(--mhidas-mode-action, var(--mhidas-clubber-action))",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing:
              "0.12em",
          }}
        >
          {
            "Perdeu sua turma?"
          }
        </span>

        <h3
          id="event-reunion-title"
        >
          ME PERDI!
        </h3>

        <p
          className="event-reunion__muted"
        >
          {
            "Encontre uma pessoa ou sua turma com dire\u00e7\u00e3o, dist\u00e2ncia e \u00faltima posi\u00e7\u00e3o autorizada."
          }
        </p>
      </header>

      {offlineQueuePending ? (
        <p
          className="event-reunion__card"
          role="status"
        >
          {
            "Sincroniza\u00e7\u00e3o pendente. As a\u00e7\u00f5es v\u00e1lidas est\u00e3o salvas neste aparelho."
          }
        </p>
      ) : null}

      {message ? (
        <p
          className="event-reunion__card"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {incoming.length > 0 ? (
        <div className="event-reunion__card">
          <strong>
            {
              "Pedidos para encontrar voc\u00ea"
            }
          </strong>

          {incoming.map(
            (consent) => (
              <div
                key={
                  consent
                    .consent_id
                }
                className="event-reunion__card"
              >
                <span>
                  {peopleById.get(
                    consent
                      .requested_by_user_id
                  )?.label ??
                    "Clubber"}{" "}
                  {
                    "quer compartilhar localiza\u00e7\u00e3o com voc\u00ea."
                  }
                </span>

                <div className="event-reunion__actions">
                  <button
                    type="button"
                    style={
                      buttonStyle
                    }
                    disabled={
                      busy
                    }
                    onClick={() =>
                      void respond(
                        consent
                          .consent_id,
                        true
                      )
                    }
                  >
                    Aceitar
                  </button>

                  <button
                    type="button"
                    style={
                      buttonStyle
                    }
                    disabled={
                      busy
                    }
                    onClick={() =>
                      void respond(
                        consent
                          .consent_id,
                        false
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
      ) : null}

      {ownActive.length > 0 ? (
        <div className="event-reunion__card">
          <strong>
            {
              "Voc\u00ea autorizou compartilhamento de localiza\u00e7\u00e3o"
            }
          </strong>

          {!sharingDevice ? (
            <button
              type="button"
              style={
                buttonStyle
              }
              onClick={
                activateLocation
              }
            >
              ATIVAR MINHA LOCALIZACAO
            </button>
          ) : (
            <span className="event-reunion__status">
              {
                "Localiza\u00e7\u00e3o ativa"
              }
            </span>
          )}

          <button
            type="button"
            style={
              buttonStyle
            }
            disabled={
              busy
            }
            onClick={() =>
              void stopSharing()
            }
          >
            PARAR DE COMPARTILHAR
          </button>
        </div>
      ) : null}

      <div className="event-reunion__grid">
        <button
          type="button"
          className="event-reunion__pick"
          data-active={
            mode ===
            "person"
          }
          onClick={() => {
            setMode(
              "person"
            );
            setPersonId("");
            setTargetUserId("");
            setNavigating(
              false
            );
            detachHeading();

            void loadReunion(
              null
            );
          }}
        >
          <strong>
            Encontrar uma pessoa
          </strong>

          <span className="event-reunion__muted">
            {
              "Escolha algu\u00e9m de uma turma em comum."
            }
          </span>
        </button>

        <button
          type="button"
          className="event-reunion__pick"
          data-active={
            mode ===
            "meetup"
          }
          onClick={() => {
            setMode(
              "meetup"
            );
            setMeetupId("");
            setTargetUserId("");
            setNavigating(
              false
            );
            detachHeading();

            void loadReunion(
              null
            );
          }}
        >
          <strong>
            Encontrar minha turma
          </strong>

          <span className="event-reunion__muted">
            {
              "Veja quem est\u00e1 compartilhando e o ponto de encontro."
            }
          </span>
        </button>
      </div>

      {loading ? (
        <span className="event-reunion__muted">
          Carregando...
        </span>
      ) : null}

      {!loading &&
      mode === "person" ? (
        <div className="event-reunion__card">
          <strong>
            {
              "Quem voc\u00ea quer encontrar?"
            }
          </strong>

          {eligiblePeople.length ===
          0 ? (
            <span className="event-reunion__muted">
              {
                "Nenhuma pessoa eleg\u00edvel nas suas turmas agora."
              }
            </span>
          ) : (
            <div className="event-reunion__grid">
              {eligiblePeople.map(
                (person) => (
                  <button
                    key={
                      person.user_id
                    }
                    type="button"
                    className="event-reunion__pick"
                    data-active={
                      personId ===
                      person.user_id
                    }
                    onClick={() => {
                      setPersonId(
                        person.user_id
                      );
                      setNavigating(
                        false
                      );
                      detachHeading();

                      void loadReunion(
                        null
                      );
                    }}
                  >
                    <strong>
                      {person.label}
                    </strong>

                    <span className="event-reunion__muted">
                      {person.city_base ??
                        "Clubber"}
                    </span>
                  </button>
                )
              )}
            </div>
          )}

          {selectedPerson ? (
            <div className="event-reunion__card">
              <strong>
                {
                  selectedPerson
                    .label
                }
              </strong>

              {personConsent &&
              targetLocation ? (
                <button
                  type="button"
                  style={
                    buttonStyle
                  }
                  onClick={() =>
                    void startCompass()
                  }
                >
                  COMECAR BUSSOLA
                </button>
              ) : personConsent ? (
                <span className="event-reunion__muted">
                  {
                    "Compartilhamento autorizado, mas ainda sem posi\u00e7\u00e3o v\u00e1lida."
                  }
                </span>
              ) : personRequest ? (
                <span className="event-reunion__muted">
                  {COPY.requested}
                </span>
              ) : (
                <button
                  type="button"
                  style={
                    buttonStyle
                  }
                  disabled={
                    busy ||
                    sharedMeetups
                      .length === 0
                  }
                  onClick={() =>
                    void requestPerson()
                  }
                >
                  PEDIR LOCALIZACAO
                </button>
              )}

              {sharedMeetups[0]
                ?.meeting_point_label ? (
                <span className="event-reunion__muted">
                  {
                    "Ponto de encontro: "
                  }
                  {
                    sharedMeetups[0]
                      .meeting_point_label
                  }
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!loading &&
      mode === "meetup" ? (
        <div className="event-reunion__card">
          <strong>
            Qual turma?
          </strong>

          {myMeetups.length ===
          0 ? (
            <span className="event-reunion__muted">
              {
                "Voc\u00ea ainda n\u00e3o participa de uma turma ativa neste evento."
              }
            </span>
          ) : (
            <div className="event-reunion__grid">
              {myMeetups.map(
                (meetup) => (
                  <button
                    key={
                      meetup
                        .meetup_id
                    }
                    type="button"
                    className="event-reunion__pick"
                    data-active={
                      meetupId ===
                      meetup
                        .meetup_id
                    }
                    onClick={() => {
                      setMeetupId(
                        meetup
                          .meetup_id
                      );
                      setTargetUserId(
                        ""
                      );
                      setNavigating(
                        false
                      );
                      detachHeading();

                      void loadReunion(
                        meetup
                          .meetup_id
                      );
                    }}
                  >
                    <strong>
                      {meetup.name}
                    </strong>

                    <span className="event-reunion__muted">
                      {
                        meetup
                          .meeting_point_label
                      }
                    </span>
                  </button>
                )
              )}
            </div>
          )}

          {selectedMeetup ? (
            <div className="event-reunion__card">
              <strong>
                {
                  selectedMeetup
                    .name
                }
              </strong>

              <span className="event-reunion__muted">
                {
                  groupSharers.length
                }{" "}
                {
                  "compartilhando localiza\u00e7\u00e3o"
                }
              </span>

              {groupConsent ? (
                <button
                  type="button"
                  style={
                    buttonStyle
                  }
                  disabled={
                    busy
                  }
                  onClick={() =>
                    void setGroupSharing(
                      false
                    )
                  }
                >
                  PARAR DE COMPARTILHAR
                </button>
              ) : (
                <button
                  type="button"
                  style={
                    buttonStyle
                  }
                  disabled={
                    busy
                  }
                  onClick={() =>
                    void setGroupSharing(
                      true
                    )
                  }
                >
                  COMPARTILHAR COM MINHA TURMA
                </button>
              )}

              <span className="event-reunion__muted">
                {
                  "Ponto de encontro: "
                }
                {
                  selectedMeetup
                    .meeting_point_label
                }
              </span>

              {meetupPoint ? (
                <span className="event-reunion__muted">
                  {
                    "Ponto atual: "
                  }
                  {
                    meetupPoint.label
                  }
                </span>
              ) : null}

              {canSetPoint ? (
                <button
                  type="button"
                  style={
                    buttonStyle
                  }
                  disabled={
                    busy
                  }
                  onClick={() =>
                    void markGroupHere()
                  }
                >
                  A TURMA ESTA AQUI
                </button>
              ) : null}

              {groupSharers.length >
              0 ? (
                <>
                  <strong>
                    {
                      "Escolha uma pessoa para seguir"
                    }
                  </strong>

                  <div className="event-reunion__grid">
                    {groupSharers.map(
                      ({
                        location,
                        person,
                      }) => (
                        <button
                          key={
                            person
                              .user_id
                          }
                          type="button"
                          className="event-reunion__pick"
                          data-active={
                            targetUserId ===
                            person
                              .user_id
                          }
                          onClick={() =>
                            setTargetUserId(
                              person
                                .user_id
                            )
                          }
                        >
                          <strong>
                            {
                              person
                                .label
                            }
                          </strong>

                          <span className="event-reunion__muted">
                            {freshnessLabel(
                              location
                                .captured_at
                            )}
                          </span>
                        </button>
                      )
                    )}
                  </div>

                  {targetUserId &&
                  targetLocation ? (
                    <button
                      type="button"
                      style={
                        buttonStyle
                      }
                      onClick={() =>
                        void startCompass()
                      }
                    >
                      COMECAR BUSSOLA
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {navigating &&
      targetLocation ? (
        <div className="event-reunion__card">
          {navigation &&
          navigation
            .guidance_mode !==
            "meeting_point" &&
          navigation
            .guidance_mode !==
            "unavailable" ? (
            <>
              <div
                className="event-reunion__arrow"
                aria-hidden="true"
                style={{
                  transform:
                    navigation
                      .relative_heading_degrees ===
                    null
                      ? "rotate(0deg)"
                      : `rotate(${navigation.relative_heading_degrees}deg)`,
                }}
              >
                &uarr;
              </div>

              <div className="event-reunion__distance">
                {distanceLabel(
                  navigation
                    .distance_meters
                )}
              </div>

              <div className="event-reunion__status">
                {freshnessLabel(
                  targetLocation
                    .captured_at
                )}
              </div>
            </>
          ) : (
            <>
              <div className="event-reunion__status">
                {
                  "Use o ponto de encontro"
                }
              </div>

              <span className="event-reunion__muted">
                {
                  "A posi\u00e7\u00e3o ficou antiga demais para orientar voc\u00ea."
                }
              </span>

              {fallbackLabel ? (
                <strong>
                  {fallbackLabel}
                </strong>
              ) : (
                <span className="event-reunion__muted">
                  {
                    "Nenhum ponto de encontro dispon\u00edvel."
                  }
                </span>
              )}
            </>
          )}

          <div className="event-reunion__actions">
            <button
              type="button"
              style={
                buttonStyle
              }
              onClick={
                finishNavigation
              }
            >
              ENCONTREI MINHA TURMA
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
