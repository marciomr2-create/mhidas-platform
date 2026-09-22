"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type PresenceStatus =
  | "arrived"
  | "entering"
  | "at_stage"
  | "moving_stage"
  | "at_meeting_point"
  | "looking_for_group"
  | "leaving"
  | "safe_home";

type PresenceRow = {
  user_id: string;
  status: PresenceStatus;
  meetup_id: string | null;
  set_id: string | null;
  expires_at: string;
  updated_at: string;
};

type ClubberPerson = {
  user_id: string;
  slug: string;
  label: string;
  city_base: string | null;
  club_photo_url: string | null;
};

type PresenceReadPayload = {
  ok?: boolean;
  viewer_user_id?: string;
  statuses?: PresenceRow[];
  people?: ClubberPerson[];
};

type MeetupRow = {
  meetup_id: string;
  name: string;
  meeting_point_label: string;
  status: string;
};

type MeetupMemberRow = {
  meetup_id: string;
  user_id: string;
  status: string;
};

type MeetupReadPayload = {
  ok?: boolean;
  viewer_user_id?: string;
  meetups?: MeetupRow[];
  members?: MeetupMemberRow[];
};

type AgendaSet = {
  set_id: string;
  set_title: string | null;
  starts_at: string;
  lifecycle_status: string;
  performers?: Array<{
    display_name?: string;
  }>;
};

type AgendaStage = {
  name: string;
  sets?: AgendaSet[];
};

type AgendaPayload = {
  ok?: boolean;
  agenda?: {
    stages?: AgendaStage[];
    unassigned_sets?: AgendaSet[];
  };
};

type MeetupOption = {
  meetup_id: string;
  label: string;
};

type SetOption = {
  set_id: string;
  label: string;
};

type FeedbackState = {
  kind: "success" | "error" | "info";
  message: string;
} | null;

type EventPresenceStatusHubProps = {
  eventGroupId: string;
  eventReturnTo: string;
  isAuthenticated: boolean;
  canonicalEventId?: string | null;
};

const STATUS_OPTIONS: Array<{
  value: PresenceStatus;
  label: string;
  helper: string;
}> = [
  {
    value: "arrived",
    label: "Cheguei",
    helper: "Você já está no evento.",
  },
  {
    value: "entering",
    label: "Estou entrando",
    helper: "Você está chegando ou passando pela entrada.",
  },
  {
    value: "at_stage",
    label: "Estou neste palco",
    helper: "Mostre em qual programação oficial você está.",
  },
  {
    value: "moving_stage",
    label: "Indo para outro palco",
    helper: "Sinalize para onde você está indo.",
  },
  {
    value: "at_meeting_point",
    label: "Estou no ponto de encontro",
    helper: "Use um encontro do qual você já participa.",
  },
  {
    value: "looking_for_group",
    label: "Procurando meu grupo",
    helper: "Avise sua rede que você está procurando a galera.",
  },
  {
    value: "leaving",
    label: "Estou saindo",
    helper: "Você está deixando o evento.",
  },
  {
    value: "safe_home",
    label: "Cheguei em segurança",
    helper: "Feche a noite avisando que você chegou bem.",
  },
];

function normalizeText(
  value: unknown
): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function getLoginHref(
  returnTo: string
): string {
  const safeReturnTo =
    normalizeText(returnTo);

  if (
    safeReturnTo.startsWith("/event/") &&
    !safeReturnTo.startsWith("//") &&
    !safeReturnTo.includes("\\")
  ) {
    return `/login?next=${encodeURIComponent(
      safeReturnTo
    )}`;
  }

  return "/login";
}

function getStatusLabel(
  status: PresenceStatus
): string {
  return (
    STATUS_OPTIONS.find(
      (option) =>
        option.value === status
    )?.label ?? "Status ativo"
  );
}

function formatClock(
  value: string
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function buildSetLabel(
  set: AgendaSet,
  stageName: string
): string {
  const performerNames = (
    set.performers ?? []
  )
    .map((performer) =>
      normalizeText(
        performer.display_name
      )
    )
    .filter(Boolean);

  const mainLabel =
    performerNames.join(" · ") ||
    normalizeText(set.set_title) ||
    "Set oficial";

  const time =
    formatClock(set.starts_at);

  return [
    time,
    mainLabel,
    normalizeText(stageName),
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function EventPresenceStatusHub({
  eventGroupId,
  eventReturnTo,
  isAuthenticated,
  canonicalEventId = null,
}: EventPresenceStatusHubProps) {
  const [
    statuses,
    setStatuses,
  ] = useState<PresenceRow[]>([]);

  const [
    people,
    setPeople,
  ] = useState<ClubberPerson[]>([]);

  const [
    viewerUserId,
    setViewerUserId,
  ] = useState("");

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<PresenceStatus>(
    "arrived"
  );

  const [
    selectedMeetupId,
    setSelectedMeetupId,
  ] = useState("");

  const [
    selectedSetId,
    setSelectedSetId,
  ] = useState("");

  const [
    meetupOptions,
    setMeetupOptions,
  ] = useState<MeetupOption[]>([]);

  const [
    setOptions,
    setSetOptions,
  ] = useState<SetOption[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    contextLoading,
    setContextLoading,
  ] = useState(false);

  const [
    pending,
    setPending,
  ] = useState(false);

  const [
    feedback,
    setFeedback,
  ] = useState<FeedbackState>(
    null
  );

  const loadPresence =
    useCallback(async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(
          `/api/event-presence-statuses?event_group_id=${encodeURIComponent(
            eventGroupId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            credentials:
              "same-origin",
          }
        );

        const payload =
          (await response
            .json()
            .catch(
              () => null
            )) as PresenceReadPayload | null;

        if (
          !response.ok ||
          !payload?.ok
        ) {
          throw new Error(
            "PRESENCE_READ_FAILED"
          );
        }

        const nextStatuses =
          Array.isArray(
            payload.statuses
          )
            ? payload.statuses
            : [];

        const nextPeople =
          Array.isArray(payload.people)
            ? payload.people
            : [];

        const nextViewerUserId =
          normalizeText(
            payload.viewer_user_id
          );

        setStatuses(nextStatuses);
        setPeople(nextPeople);
        setViewerUserId(
          nextViewerUserId
        );

        const ownStatus =
          nextStatuses.find(
            (row) =>
              row.user_id ===
              nextViewerUserId
          );

        if (ownStatus) {
          setSelectedStatus(
            ownStatus.status
          );
          setSelectedMeetupId(
            ownStatus.meetup_id ?? ""
          );
          setSelectedSetId(
            ownStatus.set_id ?? ""
          );
        }
      } catch {
        setFeedback({
          kind: "error",
          message:
            "Não foi possível carregar os status do evento agora.",
        });
      } finally {
        setLoading(false);
      }
    }, [
      eventGroupId,
      isAuthenticated,
    ]);

  const loadMeetupOptions =
    useCallback(async () => {
      if (!isAuthenticated) {
        return;
      }

      setContextLoading(true);

      try {
        const response = await fetch(
          `/api/event-meetups?event_group_id=${encodeURIComponent(
            eventGroupId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            credentials:
              "same-origin",
          }
        );

        const payload =
          (await response
            .json()
            .catch(
              () => null
            )) as MeetupReadPayload | null;

        if (
          !response.ok ||
          !payload?.ok
        ) {
          throw new Error(
            "MEETUP_READ_FAILED"
          );
        }

        const currentUserId =
          normalizeText(
            payload.viewer_user_id
          );

        const approvedIds =
          new Set(
            (payload.members ?? [])
              .filter(
                (member) =>
                  member.user_id ===
                    currentUserId &&
                  member.status ===
                    "approved"
              )
              .map(
                (member) =>
                  member.meetup_id
              )
          );

        const options = (
          payload.meetups ?? []
        )
          .filter(
            (meetup) =>
              meetup.status ===
                "active" &&
              approvedIds.has(
                meetup.meetup_id
              )
          )
          .map((meetup) => ({
            meetup_id:
              meetup.meetup_id,
            label: [
              normalizeText(
                meetup.name
              ),
              normalizeText(
                meetup.meeting_point_label
              ),
            ]
              .filter(Boolean)
              .join(" · "),
          }));

        setMeetupOptions(options);

        if (
          options.length === 1 &&
          !selectedMeetupId
        ) {
          setSelectedMeetupId(
            options[0].meetup_id
          );
        }
      } catch {
        setFeedback({
          kind: "error",
          message:
            "Não foi possível carregar seus pontos de encontro.",
        });
      } finally {
        setContextLoading(false);
      }
    }, [
      eventGroupId,
      isAuthenticated,
      selectedMeetupId,
    ]);

  const loadSetOptions =
    useCallback(async () => {
      const eventId =
        normalizeText(
          canonicalEventId
        );

      if (!eventId) {
        setSetOptions([]);
        return;
      }

      setContextLoading(true);

      try {
        const response = await fetch(
          `/api/official-events/canonical/agenda?canonicalEventId=${encodeURIComponent(
            eventId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            credentials:
              "same-origin",
          }
        );

        const payload =
          (await response
            .json()
            .catch(
              () => null
            )) as AgendaPayload | null;

        if (
          !response.ok ||
          !payload?.ok ||
          !payload.agenda
        ) {
          throw new Error(
            "AGENDA_READ_FAILED"
          );
        }

        const stageOptions = (
          payload.agenda.stages ??
          []
        ).flatMap((stage) =>
          (stage.sets ?? [])
            .filter(
              (set) =>
                normalizeText(
                  set.lifecycle_status
                ).toLowerCase() !==
                "cancelled"
            )
            .map((set) => ({
              set_id: set.set_id,
              label:
                buildSetLabel(
                  set,
                  stage.name
                ),
            }))
        );

        const unassignedOptions = (
          payload.agenda
            .unassigned_sets ?? []
        )
          .filter(
            (set) =>
              normalizeText(
                set.lifecycle_status
              ).toLowerCase() !==
              "cancelled"
          )
          .map((set) => ({
            set_id: set.set_id,
            label:
              buildSetLabel(
                set,
                "Área a confirmar"
              ),
          }));

        const options = [
          ...stageOptions,
          ...unassignedOptions,
        ];

        setSetOptions(options);

        if (
          options.length === 1 &&
          !selectedSetId
        ) {
          setSelectedSetId(
            options[0].set_id
          );
        }
      } catch {
        setFeedback({
          kind: "error",
          message:
            "Não foi possível carregar a programação para escolher o palco.",
        });
      } finally {
        setContextLoading(false);
      }
    }, [
      canonicalEventId,
      selectedSetId,
    ]);

  useEffect(() => {
    void loadPresence();
  }, [loadPresence]);

  const peopleByUserId =
    useMemo(
      () =>
        new Map(
          people.map((person) => [
            person.user_id,
            person,
          ])
        ),
      [people]
    );

  const ownStatus =
    statuses.find(
      (row) =>
        row.user_id === viewerUserId
    );

  const selectedOption =
    STATUS_OPTIONS.find(
      (option) =>
        option.value ===
        selectedStatus
    );

  const needsMeetup =
    selectedStatus ===
    "at_meeting_point";

  const needsSet =
    selectedStatus ===
      "at_stage" ||
    selectedStatus ===
      "moving_stage";

  const contextReady =
    (!needsMeetup ||
      Boolean(selectedMeetupId)) &&
    (!needsSet ||
      Boolean(selectedSetId));

  async function handleStatusChange(
    nextStatus: PresenceStatus
  ) {
    setSelectedStatus(nextStatus);
    setFeedback(null);

    if (
      nextStatus !==
      "at_meeting_point"
    ) {
      setSelectedMeetupId("");
    }

    if (
      nextStatus !== "at_stage" &&
      nextStatus !== "moving_stage"
    ) {
      setSelectedSetId("");
    }

    if (
      nextStatus ===
      "at_meeting_point"
    ) {
      await loadMeetupOptions();
    }

    if (
      nextStatus === "at_stage" ||
      nextStatus ===
        "moving_stage"
    ) {
      await loadSetOptions();
    }
  }

  async function saveStatus() {
    if (
      pending ||
      !contextReady
    ) {
      return;
    }

    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch(
        "/api/event-presence-statuses",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials:
            "same-origin",
          body: JSON.stringify({
            action: "set",
            event_group_id:
              eventGroupId,
            status: selectedStatus,
            meetup_id:
              needsMeetup
                ? selectedMeetupId
                : null,
            set_id:
              needsSet
                ? selectedSetId
                : null,
          }),
        }
      );

      const payload =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        !payload?.ok
      ) {
        throw new Error(
          "PRESENCE_SAVE_FAILED"
        );
      }

      setFeedback({
        kind: "success",
        message:
          "Seu status foi atualizado por 30 minutos.",
      });

      await loadPresence();
    } catch {
      setFeedback({
        kind: "error",
        message:
          "Não foi possível atualizar seu status agora.",
      });
    } finally {
      setPending(false);
    }
  }

  async function clearStatus() {
    if (pending) {
      return;
    }

    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch(
        "/api/event-presence-statuses",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials:
            "same-origin",
          body: JSON.stringify({
            action: "clear",
            event_group_id:
              eventGroupId,
          }),
        }
      );

      const payload =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        !payload?.ok
      ) {
        throw new Error(
          "PRESENCE_CLEAR_FAILED"
        );
      }

      setSelectedStatus(
        "arrived"
      );
      setSelectedMeetupId("");
      setSelectedSetId("");

      setFeedback({
        kind: "success",
        message:
          "Seu status foi removido.",
      });

      await loadPresence();
    } catch {
      setFeedback({
        kind: "error",
        message:
          "Não foi possível remover seu status agora.",
      });
    } finally {
      setPending(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="uc-ui-surface">
        <p
          className="uc-ui-label"
          style={{ margin: 0 }}
        >
          Agora no evento
        </p>

        <h3
          className="uc-ui-subtitle"
          style={{ marginTop: 8 }}
        >
          Compartilhe seu momento com outros Clubbers
        </h3>

        <p className="uc-ui-copy">
          Entre na sua conta para usar status temporário,
          ponto de encontro e confirmação de chegada em
          segurança.
        </p>

        <div
          className="uc-ui-form-actions"
          style={{ marginTop: 14 }}
        >
          <Link
            href={getLoginHref(
              eventReturnTo
            )}
            className="uc-ui-button uc-ui-button--primary"
          >
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="uc-ui-stack"
      aria-labelledby="event-presence-title"
    >
      <div className="uc-ui-surface">
        <p
          className="uc-ui-label"
          style={{ margin: 0 }}
        >
          Agora no evento
        </p>

        <h3
          id="event-presence-title"
          className="uc-ui-subtitle"
        >
          Como você está agora?
        </h3>

        <p className="uc-ui-copy">
          Escolha um status rápido para facilitar encontros
          reais sem compartilhar sua localização precisa.
        </p>

        <div className="uc-ui-form">
          <label className="uc-ui-field">
            <span>Seu status</span>

            <select
              className="uc-ui-input"
              value={selectedStatus}
              disabled={pending}
              onChange={(event) =>
                void handleStatusChange(
                  event.target
                    .value as PresenceStatus
                )
              }
            >
              {STATUS_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>

            <p
              className="uc-ui-copy"
              style={{ margin: 0 }}
            >
              {selectedOption?.helper}
            </p>
          </label>

          {needsMeetup ? (
            <label className="uc-ui-field">
              <span>
                Seu ponto de encontro
              </span>

              <select
                className="uc-ui-input"
                value={selectedMeetupId}
                disabled={
                  pending ||
                  contextLoading
                }
                onFocus={() => {
                  if (
                    meetupOptions.length ===
                    0
                  ) {
                    void loadMeetupOptions();
                  }
                }}
                onChange={(event) =>
                  setSelectedMeetupId(
                    event.target.value
                  )
                }
              >
                <option value="">
                  {contextLoading
                    ? "Carregando…"
                    : "Escolha um encontro"}
                </option>

                {meetupOptions.map(
                  (option) => (
                    <option
                      key={
                        option.meetup_id
                      }
                      value={
                        option.meetup_id
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

              {!contextLoading &&
              meetupOptions.length === 0 ? (
                <p
                  className="uc-ui-copy"
                  style={{
                    margin: 0,
                  }}
                >
                  Entre primeiro em um encontro ativo para
                  usar esse status.
                </p>
              ) : null}
            </label>
          ) : null}

          {needsSet ? (
            <label className="uc-ui-field">
              <span>
                Palco / programação
              </span>

              <select
                className="uc-ui-input"
                value={selectedSetId}
                disabled={
                  pending ||
                  contextLoading
                }
                onFocus={() => {
                  if (
                    setOptions.length ===
                    0
                  ) {
                    void loadSetOptions();
                  }
                }}
                onChange={(event) =>
                  setSelectedSetId(
                    event.target.value
                  )
                }
              >
                <option value="">
                  {contextLoading
                    ? "Carregando…"
                    : "Escolha onde você está"}
                </option>

                {setOptions.map(
                  (option) => (
                    <option
                      key={option.set_id}
                      value={option.set_id}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

              {!contextLoading &&
              setOptions.length === 0 ? (
                <p
                  className="uc-ui-copy"
                  style={{
                    margin: 0,
                  }}
                >
                  A programação oficial ainda não oferece
                  uma opção de palco para este status.
                </p>
              ) : null}
            </label>
          ) : null}

          <div
            className="uc-ui-form-actions"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <button
              type="button"
              className="uc-ui-button uc-ui-button--primary"
              disabled={
                pending ||
                !contextReady
              }
              onClick={() =>
                void saveStatus()
              }
            >
              {pending
                ? "Atualizando…"
                : "Atualizar status"}
            </button>

            {ownStatus ? (
              <button
                type="button"
                className="uc-ui-button uc-ui-button--quiet"
                disabled={pending}
                onClick={() =>
                  void clearStatus()
                }
              >
                Remover meu status
              </button>
            ) : null}
          </div>
        </div>

        {feedback ? (
          <div
            className={
              feedback.kind === "error"
                ? "uc-ui-notice uc-ui-notice--error"
                : feedback.kind ===
                    "success"
                  ? "uc-ui-notice uc-ui-notice--success"
                  : "uc-ui-notice"
            }
            role="status"
          >
            {feedback.message}
          </div>
        ) : null}

        {ownStatus ? (
          <div className="uc-ui-notice">
            Seu status atual:{" "}
            <strong>
              {getStatusLabel(
                ownStatus.status
              )}
            </strong>
            .
          </div>
        ) : null}

        <div className="uc-ui-trust">
          <strong>
            Privacidade por padrão
          </strong>
          <p>
            O status expira em 30 minutos. A plataforma não
            publica GPS, latitude ou longitude nesta camada.
            Pontos de encontro reutilizam apenas encontros dos
            quais você participa.
          </p>
        </div>
      </div>

      <div>
        <div
          style={{
            display: "grid",
            gap: 5,
            marginBottom: 10,
          }}
        >
          <p
            className="uc-ui-label"
            style={{ margin: 0 }}
          >
            Clubbers agora
          </p>

          <h3
            className="uc-ui-subtitle"
            style={{ marginTop: 0 }}
          >
            O que está acontecendo no evento
          </h3>
        </div>

        {loading ? (
          <div className="uc-ui-surface">
            <p className="uc-ui-copy">
              Carregando status…
            </p>
          </div>
        ) : null}

        {!loading &&
        statuses.length === 0 ? (
          <div className="uc-ui-surface">
            <p className="uc-ui-copy">
              Ninguém compartilhou um status temporário ainda.
            </p>
          </div>
        ) : null}

        {!loading &&
        statuses.length > 0 ? (
          <div className="uc-ui-grid uc-ui-grid--2">
            {statuses.map((row) => {
              const person =
                peopleByUserId.get(
                  row.user_id
                );

              const label =
                normalizeText(
                  person?.label
                ) || "Clubber";

              return (
                <article
                  className="uc-ui-surface uc-ui-surface--secondary"
                  key={row.user_id}
                >
                  <span className="uc-ui-status uc-ui-status--accent">
                    {getStatusLabel(
                      row.status
                    )}
                  </span>

                  <strong
                    style={{
                      display: "block",
                      marginTop: 10,
                      color:
                        "var(--mhidas-text-primary)",
                      fontSize: 16,
                      lineHeight: 1.3,
                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    {person?.slug ? (
                      <Link
                        href={`/${person.slug}?mode=club`}
                        style={{
                          color:
                            "inherit",
                          textDecoration:
                            "none",
                        }}
                      >
                        {label}
                      </Link>
                    ) : (
                      label
                    )}
                  </strong>

                  {person?.city_base ? (
                    <span
                      style={{
                        display:
                          "block",
                        marginTop: 4,
                        color:
                          "var(--mhidas-text-muted)",
                        fontSize: 13,
                        lineHeight: 1.4,
                        overflowWrap:
                          "anywhere",
                      }}
                    >
                      {person.city_base}
                    </span>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}