"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import styles from "./EventMemoryClient.module.css";

type MemoryPayload = {
  ok: true;
  scope: "event-memory-me";
  mode: "read";

  event: {
    slug: string;
    event_name: string;
    starts_at: string | null;
    ends_at: string | null;
    venue_name: string | null;
    city: string | null;
    state: string | null;
    official_image: {
      image_url: string;
      alt_text: string | null;
    } | null;
  };

  presence: {
    checked_in: boolean;
    latest_checked_in_at: string | null;
  };

  agenda: {
    semantics: "intent_not_attendance";
    copy: "Você marcou para ver";
    saved_sets: Array<{
      set_id: string;
      set_title: string | null;
      stage_name: string | null;
      starts_at: string | null;
      performers: Array<{
        performer_id: string;
        display_name: string;
      }>;
    }>;
    unresolved_saved_set_count: number;
  };

  social: {
    event_group_id: string | null;

    tribes: Array<{
      tribe_id: string;
      name: string | null;
      role: string | null;
    }>;

    rides: Array<{
      ride_id: string;
      mode: string | null;
      direction: string | null;
      departure_at: string | null;
      return_at: string | null;
    }>;

    meetups: Array<{
      meetup_id: string;
      name: string | null;
      starts_at: string | null;
    }>;
  };

  encounters: {
    people: Array<{
      encounter_id: string;
      label: string | null;
      profile_slug: string | null;
      photo_url: string | null;
      nfc_touch_count: number;
      qr_touch_count: number;
      continued_in_network: boolean;
    }>;
  };

  summary: {
    saved_set_count: number;
    tribe_count: number;
    ride_count: number;
    meetup_count: number;
    encountered_people_count: number;
  };
};

type ViewState =
  | { kind: "loading" }
  | {
      kind: "ready";
      payload: MemoryPayload;
    }
  | { kind: "auth" }
  | { kind: "not-found" }
  | { kind: "error" };

type Props = {
  eventSlug: string;
};

function safeHttpsUrl(
  value: string | null | undefined
): string {
  const candidate =
    String(value ?? "").trim();

  if (!candidate) {
    return "";
  }

  try {
    const url = new URL(candidate);
    const host =
      url.hostname.toLowerCase();

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      host === "localhost" ||
      host === "::1" ||
      host.endsWith(".local") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host)
    ) {
      return "";
    }

    const private172 =
      host.match(/^172\.(\d{1,3})\./);

    if (private172) {
      const secondOctet =
        Number(private172[1]);

      if (
        secondOctet >= 16 &&
        secondOctet <= 31
      ) {
        return "";
      }
    }

    return url.toString();
  } catch {
    return "";
  }
}

function formatDateTime(
  value: string | null | undefined
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function formatTime(
  value: string | null | undefined
): string {
  if (!value) {
    return "";
  }

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

function humanize(
  value: string | null | undefined
): string {
  return String(value ?? "")
    .trim()
    .replace(/[_-]+/g, " ");
}

function eventHasEnded(
  payload: MemoryPayload
): boolean {
  const boundary =
    payload.event.ends_at ||
    payload.event.starts_at;

  if (!boundary) {
    return false;
  }

  const timestamp =
    Date.parse(boundary);

  return (
    Number.isFinite(timestamp) &&
    timestamp <= Date.now()
  );
}

function buildLocation(
  payload: MemoryPayload
): string {
  return [
    payload.event.venue_name,
    payload.event.city,
    payload.event.state,
  ]
    .map((item) =>
      String(item ?? "").trim()
    )
    .filter(Boolean)
    .join(" · ");
}

function encounterMethod(
  person: MemoryPayload[
    "encounters"
  ]["people"][number]
): string {
  if (
    person.nfc_touch_count > 0 &&
    person.qr_touch_count > 0
  ) {
    return "NFC + QR";
  }

  if (person.nfc_touch_count > 0) {
    return "NFC";
  }

  if (person.qr_touch_count > 0) {
    return "QR";
  }

  return "Encontro registrado";
}

export default function EventMemoryClient({
  eventSlug,
}: Props) {
  const [state, setState] =
    useState<ViewState>({
      kind: "loading",
    });

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadMemory() {
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

        if (response.status === 401) {
          setState({ kind: "auth" });
          return;
        }

        if (response.status === 404) {
          setState({
            kind: "not-found",
          });
          return;
        }

        if (!response.ok) {
          setState({
            kind: "error",
          });
          return;
        }

        const payload =
          (await response.json()) as
            MemoryPayload;

        if (
          payload.ok !== true ||
          payload.scope !==
            "event-memory-me" ||
          payload.mode !== "read"
        ) {
          setState({
            kind: "error",
          });
          return;
        }

        setState({
          kind: "ready",
          payload,
        });
      } catch {
        if (!controller.signal.aborted) {
          setState({
            kind: "error",
          });
        }
      }
    }

    void loadMemory();

    return () => {
      controller.abort();
    };
  }, [eventSlug]);

  if (state.kind === "loading") {
    return (
      <section
        className={`uc-ui-section uc-ui-surface ${styles.stateCard}`}
        aria-live="polite"
      >
        <strong>Montando sua memória...</strong>

        <p>
          Estamos reunindo somente os registros
          vinculados a você.
        </p>
      </section>
    );
  }

  if (state.kind === "auth") {
    return (
      <section
        className={`uc-ui-section uc-ui-surface ${styles.stateCard}`}
      >
        <strong>
          Esta memória é privada.
        </strong>

        <p>
          Entre na sua conta para acessar
          somente os seus registros deste
          evento.
        </p>

        <Link
          className="uc-ui-button"
          href={`/login?next=${encodeURIComponent(
            `/event/${eventSlug}/memory`
          )}`}
        >
          Entrar no USECLUBBERS
        </Link>
      </section>
    );
  }

  if (state.kind === "not-found") {
    return (
      <section
        className={`uc-ui-section uc-ui-surface ${styles.stateCard}`}
      >
        <strong>
          Memória indisponível.
        </strong>

        <p>
          Não encontramos um evento canônico
          validado para esta memória.
        </p>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section
        className={`uc-ui-section uc-ui-surface ${styles.stateCard}`}
        role="alert"
      >
        <strong>
          Não foi possível carregar sua memória
          agora.
        </strong>

        <p>
          Seus dados não foram alterados.
          Tente novamente mais tarde.
        </p>
      </section>
    );
  }

  const { payload } = state;

  if (!eventHasEnded(payload)) {
    return (
      <section
        className={`uc-ui-section uc-ui-surface ${styles.stateCard}`}
      >
        <strong>
          Sua memória fica disponível depois do
          evento.
        </strong>

        <p>
          Até lá, continue usando a agenda e as
          ferramentas sociais da página do
          evento.
        </p>
      </section>
    );
  }

  const imageUrl =
    safeHttpsUrl(
      payload.event.official_image?.image_url
    );

  const eventDate =
    formatDateTime(
      payload.event.starts_at
    );

  const location =
    buildLocation(payload);

  const recordCount =
    payload.summary.saved_set_count +
    payload.summary.tribe_count +
    payload.summary.ride_count +
    payload.summary.meetup_count +
    payload.summary.encountered_people_count;

  return (
    <div className={styles.page}>
      <section
        className={styles.hero}
        style={
          imageUrl
            ? {
                backgroundImage:
                  `linear-gradient(90deg, rgba(5,5,5,0.60), rgba(5,5,5,0.12)), url("${imageUrl}")`,
              }
            : undefined
        }
        aria-label="Identidade do evento"
      >
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            SUA HISTÓRIA NESTE EVENTO
          </span>

          <h2 className={styles.eventTitle}>
            {payload.event.event_name}
          </h2>

          {eventDate ? (
            <p className={styles.heroMeta}>
              {eventDate}
            </p>
          ) : null}

          {location ? (
            <p className={styles.heroMeta}>
              {location}
            </p>
          ) : null}
        </div>
      </section>

      <section
        className={styles.summaryGrid}
        aria-label="Resumo da memória"
      >
        <article
          className={`uc-ui-surface ${styles.summaryCard}`}
        >
          <span className={styles.cardLabel}>
            Presença
          </span>

          <strong>
            {payload.presence.checked_in
              ? "Check-in registrado"
              : "Sem check-in registrado"}
          </strong>

          <p>
            {payload.presence.checked_in
              ? payload.presence.latest_checked_in_at
                ? `Registro mais recente: ${formatDateTime(
                    payload.presence.latest_checked_in_at
                  )}.`
                : "Há um check-in válido ligado a este evento."
              : "Isso não significa que você não esteve no evento; apenas não há um check-in válido registrado."}
          </p>
        </article>

        <article
          className={`uc-ui-surface ${styles.summaryCard}`}
        >
          <span className={styles.cardLabel}>
            Sua memória
          </span>

          <strong>
            {recordCount} registros pessoais
          </strong>

          <p>
            Agenda, experiências sociais e
            encontros confirmados ficam
            reunidos aqui sem criar um feed
            público.
          </p>
        </article>
      </section>

      <section
        className={`uc-ui-section ${styles.section}`}
        aria-labelledby="memory-agenda-title"
      >
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>
            AGENDA PESSOAL
          </span>

          <h2 id="memory-agenda-title">
            Você marcou para ver
          </h2>

          <p>
            Esta lista representa sua intenção
            na agenda. Ela não afirma que você
            assistiu a esses sets.
          </p>
        </div>

        {payload.agenda.saved_sets.length > 0 ? (
          <div className={styles.list}>
            {payload.agenda.saved_sets.map(
              (set) => {
                const performerNames =
                  set.performers
                    .map(
                      (performer) =>
                        performer.display_name
                    )
                    .filter(Boolean)
                    .join(", ");

                const time =
                  formatTime(set.starts_at);

                return (
                  <article
                    className={`uc-ui-surface ${styles.item}`}
                    key={set.set_id}
                  >
                    <div className={styles.itemHeading}>
                      <strong>
                        {set.set_title ||
                          performerNames ||
                          "Set salvo"}
                      </strong>

                      {time ? (
                        <span className={styles.time}>
                          {time}
                        </span>
                      ) : null}
                    </div>

                    {performerNames &&
                    performerNames !==
                      set.set_title ? (
                      <p>{performerNames}</p>
                    ) : null}

                    {set.stage_name ? (
                      <span className={styles.meta}>
                        {set.stage_name}
                      </span>
                    ) : null}
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <p className={styles.empty}>
            Você não marcou sets na sua agenda
            deste evento.
          </p>
        )}

        {payload.agenda
          .unresolved_saved_set_count > 0 ? (
          <p className={styles.notice}>
            Há{" "}
            {
              payload.agenda
                .unresolved_saved_set_count
            }{" "}
            item(ns) salvo(s) que não puderam
            ser resolvidos na programação
            oficial atual.
          </p>
        ) : null}
      </section>

      <section
        className={`uc-ui-section ${styles.section}`}
        aria-labelledby="memory-social-title"
      >
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>
            SUA EXPERIÊNCIA SOCIAL
          </span>

          <h2 id="memory-social-title">
            O que você organizou e viveu
          </h2>

          <p>
            Aqui aparecem somente as suas
            próprias participações históricas.
          </p>
        </div>

        {payload.social.tribes.length === 0 &&
        payload.social.rides.length === 0 &&
        payload.social.meetups.length === 0 ? (
          <p className={styles.empty}>
            Nenhum grupo, carona ou encontro
            seu ficou registrado para este
            evento.
          </p>
        ) : (
          <div className={styles.socialGrid}>
            {payload.social.tribes.map(
              (tribe) => (
                <article
                  className={`uc-ui-surface ${styles.item}`}
                  key={tribe.tribe_id}
                >
                  <span className={styles.cardLabel}>
                    Grupo
                  </span>

                  <strong>
                    {tribe.name ||
                      "Grupo do evento"}
                  </strong>

                  {tribe.role ? (
                    <p>
                      Seu papel:{" "}
                      {humanize(tribe.role)}
                    </p>
                  ) : null}
                </article>
              )
            )}

            {payload.social.rides.map(
              (ride) => (
                <article
                  className={`uc-ui-surface ${styles.item}`}
                  key={ride.ride_id}
                >
                  <span className={styles.cardLabel}>
                    Carona
                  </span>

                  <strong>
                    {humanize(ride.direction) ||
                      humanize(ride.mode) ||
                      "Carona do evento"}
                  </strong>

                  {ride.departure_at ? (
                    <p>
                      Saída:{" "}
                      {formatDateTime(
                        ride.departure_at
                      )}
                    </p>
                  ) : null}

                  {ride.return_at ? (
                    <p>
                      Retorno:{" "}
                      {formatDateTime(
                        ride.return_at
                      )}
                    </p>
                  ) : null}
                </article>
              )
            )}

            {payload.social.meetups.map(
              (meetup) => (
                <article
                  className={`uc-ui-surface ${styles.item}`}
                  key={meetup.meetup_id}
                >
                  <span className={styles.cardLabel}>
                    Encontro
                  </span>

                  <strong>
                    {meetup.name ||
                      "Encontro do evento"}
                  </strong>

                  {meetup.starts_at ? (
                    <p>
                      {formatDateTime(
                        meetup.starts_at
                      )}
                    </p>
                  ) : null}
                </article>
              )
            )}
          </div>
        )}
      </section>

      <section
        className={`uc-ui-section ${styles.section}`}
        aria-labelledby="memory-people-title"
      >
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>
            PESSOAS QUE VOCÊ ENCONTROU
          </span>

          <h2 id="memory-people-title">
            Conexões daquele momento
          </h2>

          <p>
            Só entram aqui encontros QR ou NFC
            que possuem contexto explícito
            deste evento.
          </p>
        </div>

        {payload.encounters.people.length > 0 ? (
          <div className={styles.peopleGrid}>
            {payload.encounters.people.map(
              (person) => {
                const photo =
                  safeHttpsUrl(
                    person.photo_url
                  );

                const content = (
                  <>
                    <span
                      className={styles.avatar}
                      style={
                        photo
                          ? {
                              backgroundImage:
                                `url("${photo}")`,
                            }
                          : undefined
                      }
                      aria-hidden="true"
                    >
                      {photo
                        ? ""
                        : String(
                            person.label ||
                              "C"
                          )
                            .charAt(0)
                            .toUpperCase()}
                    </span>

                    <span className={styles.personCopy}>
                      <strong>
                        {person.label ||
                          "Clubber"}
                      </strong>

                      <span className={styles.meta}>
                        {encounterMethod(person)}
                      </span>

                      {person.continued_in_network ? (
                        <span className={styles.networkBadge}>
                          Continua na sua rede
                        </span>
                      ) : null}
                    </span>
                  </>
                );

                return person.profile_slug ? (
                  <Link
                    href={`/${person.profile_slug}?mode=club`}
                    className={`${styles.person} uc-ui-interactive`}
                    key={person.encounter_id}
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    className={styles.person}
                    key={person.encounter_id}
                  >
                    {content}
                  </div>
                );
              }
            )}
          </div>
        ) : (
          <p className={styles.empty}>
            Nenhum encontro QR ou NFC com
            contexto deste evento foi
            registrado para você.
          </p>
        )}
      </section>

      <section
        className={`uc-ui-section uc-ui-surface ${styles.closing}`}
      >
        <span className={styles.eyebrow}>
          O QUE FICOU
        </span>

        <h2>
          O evento acabou. Sua história não
          precisa desaparecer.
        </h2>

        <p>
          Esta memória é privada e reúne
          somente sinais pessoais já
          registrados no USECLUBBERS.
        </p>

        <div className={styles.actions}>
          <Link
            className="uc-ui-button"
            href={`/event/${eventSlug}`}
          >
            Voltar ao evento
          </Link>

          <Link
            className="uc-ui-button"
            href="/dashboard"
          >
            Ir para minha central
          </Link>
        </div>
      </section>
    </div>
  );
}