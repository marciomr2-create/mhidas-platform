"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./EventSocialAgenda.module.css";

type AgendaPerformer = {
  performer_id: string;
  set_id: string;
  display_name: string;
  spotify_id: string | null;
  official_entity_id: string | null;
  role: string;
  sort_order: number;
};

type AgendaSet = {
  set_id: string;
  canonical_event_id: string;
  stage_id: string | null;
  set_title: string | null;
  starts_at: string;
  ends_at: string | null;
  publication_status: string;
  lifecycle_status: string;
  source_kind: string;
  source_url: string | null;
  source_confidence_score: number;
  schedule_revision: number;
  sort_order: number;
  performers: AgendaPerformer[];
};

type AgendaStage = {
  stage_id: string;
  canonical_event_id: string;
  name: string;
  normalized_name: string;
  sort_order: number;
  status: string;
  source_url: string | null;
  sets: AgendaSet[];
};

type OfficialAgenda = {
  ok: boolean;
  canonical_event_id: string;
  stages: AgendaStage[];
  unassigned_sets: AgendaSet[];
  all_sets: AgendaSet[];
  summary: {
    stage_count: number;
    set_count: number;
    performer_count: number;
    unassigned_set_count: number;
    cancelled_set_count: number;
  };
  error: string | null;
};

type OfficialAgendaResponse = {
  ok?: boolean;
  agenda?: OfficialAgenda;
};

type PersonalAgendaResponse = {
  ok?: boolean;
  saved_set_ids?: string[];
};

type ActionFeedback = {
  kind: "success" | "error";
  message: string;
} | null;

type EventSocialAgendaProps = {
  canonicalEventId: string;
};

function getSetLabel(set: AgendaSet) {
  const performerNames = set.performers
    .map((performer) => performer.display_name.trim())
    .filter(Boolean);

  if (performerNames.length > 0) {
    return performerNames.join(" · ");
  }

  return set.set_title?.trim() || "Set confirmado";
}

function formatClock(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatInterval(set: AgendaSet) {
  const start = formatClock(set.starts_at);
  const end = formatClock(set.ends_at);

  if (start && end) return `${start}–${end}`;
  if (start) return start;

  return "Horário a confirmar";
}

function isCancelled(set: AgendaSet) {
  return set.lifecycle_status.trim().toLowerCase() === "cancelled";
}

function sortSets(sets: AgendaSet[]) {
  return [...sets].sort((a, b) => {
    const aTime = new Date(a.starts_at).getTime();
    const bTime = new Date(b.starts_at).getTime();

    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;

    return aTime - bTime;
  });
}

export default function EventSocialAgenda({
  canonicalEventId,
}: EventSocialAgendaProps) {
  const [agenda, setAgenda] = useState<OfficialAgenda | null>(null);
  const [savedSetIds, setSavedSetIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [officialError, setOfficialError] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [personalReadError, setPersonalReadError] = useState(false);
  const [pendingSetId, setPendingSetId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setOfficialError(false);
      setPersonalReadError(false);
      setFeedback(null);

      try {
        const officialResponse = await fetch(
          `/api/official-events/canonical/agenda?canonicalEventId=${encodeURIComponent(
            canonicalEventId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const officialPayload =
          (await officialResponse.json()) as OfficialAgendaResponse;

        if (!officialResponse.ok || !officialPayload.ok) {
          setOfficialError(true);
        } else {
          setAgenda(officialPayload.agenda ?? null);
        }
      } catch {
        if (!controller.signal.aborted) {
          setOfficialError(true);
        }
      }

      try {
        const personalResponse = await fetch(
          `/api/official-events/canonical/agenda/me?canonicalEventId=${encodeURIComponent(
            canonicalEventId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (personalResponse.status === 401) {
          setAuthRequired(true);
          setSavedSetIds([]);
        } else {
          const personalPayload =
            (await personalResponse.json()) as PersonalAgendaResponse;

          if (!personalResponse.ok || !personalPayload.ok) {
            setPersonalReadError(true);
          } else {
            setAuthRequired(false);
            setSavedSetIds(
              Array.isArray(personalPayload.saved_set_ids)
                ? personalPayload.saved_set_ids
                : []
            );
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setPersonalReadError(true);
        }
      }

      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [canonicalEventId]);

  const stages = agenda?.stages ?? [];
  const unassignedSets = sortSets(agenda?.unassigned_sets ?? []);

  const allSets = sortSets([
    ...stages.flatMap((stage) => stage.sets),
    ...unassignedSets,
  ]);

  const savedSets = allSets.filter((set) =>
    savedSetIds.includes(set.set_id)
  );

  const hasOfficialSets = allSets.length > 0;

  async function toggleSaved(set: AgendaSet) {
    if (pendingSetId) return;

    const currentlySaved = savedSetIds.includes(set.set_id);
    const action = currentlySaved ? "remove" : "save";

    setPendingSetId(set.set_id);
    setFeedback(null);

    try {
      const response = await fetch(
        "/api/official-events/canonical/agenda/me",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            canonical_event_id: canonicalEventId,
            set_id: set.set_id,
          }),
        }
      );

      if (response.status === 401) {
        setAuthRequired(true);
        setFeedback({
          kind: "error",
          message: "Entre na sua conta para montar a sua agenda.",
        });
        return;
      }

      const payload = (await response.json()) as { ok?: boolean };

      if (!response.ok || !payload.ok) {
        setFeedback({
          kind: "error",
          message:
            "Não foi possível atualizar sua agenda agora. Tente novamente.",
        });
        return;
      }

      setAuthRequired(false);

      if (currentlySaved) {
        setSavedSetIds((current) =>
          current.filter((setId) => setId !== set.set_id)
        );
        setFeedback({
          kind: "success",
          message: "Removido da sua agenda.",
        });
      } else {
        setSavedSetIds((current) =>
          current.includes(set.set_id)
            ? current
            : [...current, set.set_id]
        );
        setFeedback({
          kind: "success",
          message: "Adicionado à sua agenda.",
        });
      }
    } catch {
      setFeedback({
        kind: "error",
        message:
          "Não foi possível atualizar sua agenda agora. Tente novamente.",
      });
    } finally {
      setPendingSetId(null);
    }
  }

  return (
    <section
      id="event-social-agenda"
      className={`uc-ui-section ${styles.section}`}
      aria-labelledby="event-social-agenda-title"
    >
      <div className={styles.heading}>
        <div className={styles.headingCopy}>
          <p className={styles.eyebrow}>Programação oficial</p>
          <h2 id="event-social-agenda-title" className={styles.title}>
            Monte seu caminho no evento
          </h2>
          <p className={styles.description}>
            Veja os horários oficiais e marque quem você quer ver. Sua agenda
            fica só com o que importa para você.
          </p>
        </div>


</div>

      {loading ? (
        <div className="uc-ui-surface">
          <p className={styles.stateText}>Carregando programação…</p>
        </div>
      ) : null}

      {!loading && officialError ? (
        <div className="uc-ui-notice uc-ui-notice--error" role="status">
          Não foi possível carregar a programação oficial agora.
        </div>
      ) : null}

      {!loading && !officialError && !hasOfficialSets ? (
        <div className="uc-ui-surface">
          <h3 className={styles.emptyTitle}>Programação em breve</h3>
          <p className={styles.stateText}>
            Assim que os horários oficiais forem publicados, eles aparecem
            aqui para você montar sua agenda.
          </p>
        </div>
      ) : null}

      {!loading && !officialError && hasOfficialSets ? (
        <div className={styles.schedule}>
          {stages.map((stage) => {
            const stageSets = sortSets(stage.sets);

            if (stageSets.length === 0) return null;

            return (
              <div className="uc-ui-surface" key={stage.stage_id}>
                <div className={styles.stageHeader}>
                  <p className={styles.stageLabel}>Palco / área</p>
                  <h3 className={styles.stageName}>
                    {stage.name.trim() || "Programação"}
                  </h3>
                </div>

                <div className={styles.setList}>
                  {stageSets.map((set) => {
                    const saved = savedSetIds.includes(set.set_id);
                    const cancelled = isCancelled(set);
                    const pending = pendingSetId === set.set_id;
                    const label = getSetLabel(set);

                    return (
                      <article className={styles.setRow} key={set.set_id}>
                        <div className={styles.time}>
                          {formatInterval(set)}
                        </div>

                        <div className={styles.setMain}>
                          <strong className={styles.setTitle}>{label}</strong>

                          {set.set_title?.trim() &&
                          set.set_title.trim() !== label ? (
                            <span className={styles.setSubtitle}>
                              {set.set_title}
                            </span>
                          ) : null}

                          {cancelled ? (
                            <span className={styles.cancelled}>Cancelado</span>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          className={
                            saved
                              ? "uc-ui-button uc-ui-button--quiet"
                              : "uc-ui-button uc-ui-button--primary"
                          }
                          aria-pressed={saved}
                          aria-label={
                            saved
                              ? `Remover ${label} da Minha Agenda`
                              : `Adicionar ${label} à Minha Agenda`
                          }
                          disabled={cancelled || pending}
                          onClick={() => void toggleSaved(set)}
                        >
                          {pending
                            ? "Salvando…"
                            : cancelled
                            ? "Indisponível"
                            : saved
                            ? "Na minha agenda"
                            : "Quero ver"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {unassignedSets.length > 0 ? (
            <div className="uc-ui-surface">
              <div className={styles.stageHeader}>
                <p className={styles.stageLabel}>Programação oficial</p>
                <h3 className={styles.stageName}>Sem palco definido</h3>
              </div>

              <div className={styles.setList}>
                {unassignedSets.map((set) => {
                  const saved = savedSetIds.includes(set.set_id);
                  const cancelled = isCancelled(set);
                  const pending = pendingSetId === set.set_id;
                  const label = getSetLabel(set);

                  return (
                    <article className={styles.setRow} key={set.set_id}>
                      <div className={styles.time}>
                        {formatInterval(set)}
                      </div>

                      <div className={styles.setMain}>
                        <strong className={styles.setTitle}>{label}</strong>

                        {set.set_title?.trim() &&
                        set.set_title.trim() !== label ? (
                          <span className={styles.setSubtitle}>
                            {set.set_title}
                          </span>
                        ) : null}

                        {cancelled ? (
                          <span className={styles.cancelled}>Cancelado</span>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        className={
                          saved
                            ? "uc-ui-button uc-ui-button--quiet"
                            : "uc-ui-button uc-ui-button--primary"
                        }
                        aria-pressed={saved}
                        aria-label={
                          saved
                            ? `Remover ${label} da Minha Agenda`
                            : `Adicionar ${label} à Minha Agenda`
                        }
                        disabled={cancelled || pending}
                        onClick={() => void toggleSaved(set)}
                      >
                        {pending
                          ? "Salvando…"
                          : cancelled
                          ? "Indisponível"
                          : saved
                          ? "Na minha agenda"
                          : "Quero ver"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={`uc-ui-surface uc-ui-surface--secondary ${styles.personal}`}
      >
        <div className={styles.personalHeader}>
          <div>
            <p className={styles.eyebrow}>Minha Agenda</p>
            <h3 className={styles.personalTitle}>
              {loading
                ? "Carregando sua agenda…"
                : authRequired
                ? "Entre para montar sua experiência"
                : savedSets.length > 0
                ? `${savedSets.length} ${
                    savedSets.length === 1 ? "set salvo" : "sets salvos"
                  }`
                : "Seu evento, do seu jeito"}
            </h3>
          </div>

          {!loading && !authRequired && savedSets.length > 0 ? (
            <span className="uc-ui-status uc-ui-status--accent">
              {savedSets.length}
            </span>
          ) : null}
        </div>

        {loading ? (
          <p className={styles.stateText}>
            Sincronizando suas escolhas…
          </p>
        ) : authRequired ? (
          <div className={styles.personalBody}>
            <p className={styles.stateText}>
              Faça login para marcar “Quero ver” e encontrar rapidamente os
              sets que você escolheu.
            </p>

            <Link href="/login" className="uc-ui-button uc-ui-button--quiet">
              Entrar
            </Link>
          </div>
        ) : savedSets.length > 0 ? (
          <ol className={styles.savedList}>
            {savedSets.map((set) => (
              <li className={styles.savedItem} key={set.set_id}>
                <span className={styles.savedTime}>
                  {formatInterval(set)}
                </span>
                <strong>{getSetLabel(set)}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.stateText}>
            Toque em “Quero ver” na programação para criar sua agenda.
          </p>
        )}

        {!loading && personalReadError ? (
          <p className={styles.inlineError} role="status">
            Sua agenda pessoal não pôde ser carregada agora.
          </p>
        ) : null}

        {feedback ? (
          <div
            className={
              feedback.kind === "success"
                ? "uc-ui-notice uc-ui-notice--success"
                : "uc-ui-notice uc-ui-notice--error"
            }
            role="status"
          >
            {feedback.message}
          </div>
        ) : null}
      </div>
    </section>
  );
}
