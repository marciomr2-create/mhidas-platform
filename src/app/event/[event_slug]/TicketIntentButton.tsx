// src/app/event/[event_slug]/TicketIntentButton.tsx

"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import availabilityStyles from "./TicketNetworkAvailability.module.css";

type TicketIntentStatus =
  | "interested"
  | "wants_ticket"
  | "ticket_acquired"
  | "cancelled"
  | "checked_in";

type TicketAvailabilityStatus =
  | "available"
  | "reserved"
  | "transferred"
  | "withdrawn";

type SocialParticipationMode =
  | "alone"
  | "with_friends"
  | "undecided";

type MobileJourneyPanel = "moment" | "social" | "preferences";

type SocialPreferenceKey =
  | "wants_group"
  | "accepts_new_people"
  | "meet_on_site"
  | "women_only"
  | "men_only"
  | "lgbtqia_plus"
  | "mixed_group"
  | "first_time"
  | "same_city";

type GroupPreferenceKey =
  | "women_only"
  | "men_only"
  | "lgbtqia_plus"
  | "mixed_group";

type JsonRecord = Record<string, unknown>;

type EventSocialPreferences = Record<SocialPreferenceKey, boolean>;

type EventSocialJourney = {
  participation_mode: SocialParticipationMode;
  preferences: EventSocialPreferences;
  active: boolean;
  updated_at: string;
};

type TicketAvailability = {
  status: TicketAvailabilityStatus;
  quantity: number;
  ticket_type: string;
  lot: string;
  asking_price: number;
  currency: "BRL";
  transfer_method: string;
  note: string;
  published_at: string;
  updated_at: string;
};

type TicketIntentButtonProps = {
  eventGroupId: string;
  initialStatus?: TicketIntentStatus | null;
  compact?: boolean;
};

type TicketIntentApiResponse = {
  ok?: boolean;
  message?: string;
  intent?: {
    status?: TicketIntentStatus;
    metadata?: unknown;
    updated_at?: string;
  } | null;
};

type JourneyAction = {
  status: Exclude<TicketIntentStatus, "checked_in">;
  label: string;
  detail: string;
  tone: "interest" | "ticket" | "confirmed" | "cancelled";
};

type SocialModeAction = {
  mode: SocialParticipationMode;
  label: string;
  detail: string;
  featured?: boolean;
};

type SocialPreferenceAction = {
  key: Exclude<SocialPreferenceKey, GroupPreferenceKey>;
  label: string;
  detail: string;
};

type GroupPreferenceAction = {
  key: GroupPreferenceKey;
  label: string;
};

type AvailabilityFormState = {
  quantity: string;
  ticketType: string;
  lot: string;
  askingPrice: string;
  transferMethod: string;
  note: string;
};

const EVENT_TICKET_INTENT_UPDATED = "mhidas:event-ticket-intent-updated";
const EVENT_TICKET_NETWORK_AVAILABILITY_UPDATED =
  "mhidas:event-ticket-network-availability-updated";

const TICKET_INTENT_STATUSES: TicketIntentStatus[] = [
  "interested",
  "wants_ticket",
  "ticket_acquired",
  "cancelled",
  "checked_in",
];

const TICKET_AVAILABILITY_STATUSES: TicketAvailabilityStatus[] = [
  "available",
  "reserved",
  "transferred",
  "withdrawn",
];

const SOCIAL_PARTICIPATION_MODES: SocialParticipationMode[] = [
  "alone",
  "with_friends",
  "undecided",
];

const EMPTY_SOCIAL_PREFERENCES: EventSocialPreferences = {
  wants_group: false,
  accepts_new_people: false,
  meet_on_site: false,
  women_only: false,
  men_only: false,
  lgbtqia_plus: false,
  mixed_group: false,
  first_time: false,
  same_city: false,
};

const SOCIAL_MODE_ACTIONS: SocialModeAction[] = [
  {
    mode: "alone",
    label: "Vou sozinho",
    detail: "Quero encontrar companhia compatível para este evento.",
    featured: true,
  },
  {
    mode: "with_friends",
    label: "Vou com amigos",
    detail: "Já tenho companhia e posso organizar encontros com outras pessoas.",
  },
  {
    mode: "undecided",
    label: "Ainda estou decidindo",
    detail: "Quero explorar pessoas e possibilidades antes de confirmar.",
  },
];

const SOCIAL_PREFERENCE_ACTIONS: SocialPreferenceAction[] = [
  {
    key: "wants_group",
    label: "Quero entrar em um grupo",
    detail: "Encontrar um grupo para este evento.",
  },
  {
    key: "accepts_new_people",
    label: "Aceito novas pessoas",
    detail: "Meu grupo está aberto a novas conexões.",
  },
  {
    key: "meet_on_site",
    label: "Quero encontrar pessoas no local",
    detail: "Combinar um encontro dentro ou perto do evento.",
  },
  {
    key: "first_time",
    label: "Primeira vez neste evento",
    detail: "Conectar com pessoas que possam ajudar na experiência.",
  },
  {
    key: "same_city",
    label: "Pessoas da minha cidade",
    detail: "Priorizar Clubbers próximos para organizar ida e volta.",
  },
];

const GROUP_PREFERENCE_ACTIONS: GroupPreferenceAction[] = [
  {
    key: "mixed_group",
    label: "Misto",
  },
  {
    key: "women_only",
    label: "Feminino",
  },
  {
    key: "men_only",
    label: "Masculino",
  },
  {
    key: "lgbtqia_plus",
    label: "LGBTQIA+",
  },
];

const JOURNEY_ACTIONS: JourneyAction[] = [
  {
    status: "interested",
    label: "Tenho interesse",
    detail: "Acompanhar o evento e explorar sua camada social.",
    tone: "interest",
  },
  {
    status: "wants_ticket",
    label: "Quero adquirir ingresso",
    detail: "Estou me organizando para participar deste evento.",
    tone: "ticket",
  },
  {
    status: "ticket_acquired",
    label: "Já tenho ingresso",
    detail: "Meu ingresso está garantido e posso avançar na jornada.",
    tone: "confirmed",
  },
  {
    status: "cancelled",
    label: "Não vou mais",
    detail: "Registrar desistência sem apagar meu histórico social.",
    tone: "cancelled",
  },
];

const EMPTY_AVAILABILITY_FORM: AvailabilityFormState = {
  quantity: "1",
  ticketType: "",
  lot: "",
  askingPrice: "",
  transferMethod: "Transferência pela plataforma oficial do ingresso",
  note: "",
};

function normalizeText(value: unknown, maxLength = 500): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

function isTicketIntentStatus(value: unknown): value is TicketIntentStatus {
  return TICKET_INTENT_STATUSES.includes(value as TicketIntentStatus);
}

function isTicketAvailabilityStatus(
  value: unknown
): value is TicketAvailabilityStatus {
  return TICKET_AVAILABILITY_STATUSES.includes(
    value as TicketAvailabilityStatus
  );
}

function isSocialParticipationMode(
  value: unknown
): value is SocialParticipationMode {
  return SOCIAL_PARTICIPATION_MODES.includes(
    value as SocialParticipationMode
  );
}

function parseTicketAvailability(metadataValue: unknown): TicketAvailability | null {
  const metadata = asRecord(metadataValue);
  const availability = asRecord(metadata?.ticket_network_availability);
  const availabilityStatus = availability?.status;

  if (!availability || !isTicketAvailabilityStatus(availabilityStatus)) {
    return null;
  }

  const quantity = Number(availability.quantity);
  const askingPrice = Number(availability.asking_price);
  const ticketType = normalizeText(availability.ticket_type, 80);
  const transferMethod = normalizeText(availability.transfer_method, 140);

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 10 ||
    !Number.isFinite(askingPrice) ||
    askingPrice < 0 ||
    !ticketType ||
    !transferMethod
  ) {
    return null;
  }

  return {
    status: availabilityStatus,
    quantity,
    ticket_type: ticketType,
    lot: normalizeText(availability.lot, 80),
    asking_price: Math.round(askingPrice * 100) / 100,
    currency: "BRL",
    transfer_method: transferMethod,
    note: normalizeText(availability.note, 280),
    published_at: normalizeText(availability.published_at, 40),
    updated_at: normalizeText(availability.updated_at, 40),
  };
}

function parseEventSocialJourney(
  metadataValue: unknown
): EventSocialJourney | null {
  const metadata = asRecord(metadataValue);
  const socialJourney = asRecord(metadata?.event_social_journey);
  const participationMode = socialJourney?.participation_mode;

  if (
    !socialJourney ||
    !isSocialParticipationMode(participationMode)
  ) {
    return null;
  }

  const preferences = asRecord(socialJourney.preferences);

  return {
    participation_mode: participationMode,
    preferences: {
      wants_group: preferences?.wants_group === true,
      accepts_new_people: preferences?.accepts_new_people === true,
      meet_on_site: preferences?.meet_on_site === true,
      women_only:
        preferences?.mixed_group === true
          ? false
          : preferences?.women_only === true,
      men_only:
        preferences?.mixed_group === true
          ? false
          : preferences?.men_only === true,
      lgbtqia_plus:
        preferences?.mixed_group === true
          ? false
          : preferences?.lgbtqia_plus === true,
      mixed_group: preferences?.mixed_group === true,
      first_time: preferences?.first_time === true,
      same_city: preferences?.same_city === true,
    },
    active: socialJourney.active !== false,
    updated_at: normalizeText(socialJourney.updated_at, 40),
  };
}

function availabilityToForm(
  availability: TicketAvailability | null
): AvailabilityFormState {
  if (!availability) {
    return { ...EMPTY_AVAILABILITY_FORM };
  }

  return {
    quantity: String(availability.quantity),
    ticketType: availability.ticket_type,
    lot: availability.lot,
    askingPrice: String(availability.asking_price).replace(".", ","),
    transferMethod: availability.transfer_method,
    note: availability.note,
  };
}

function parsePrice(value: string): number | null {
  const normalizedValue = value.replace(/\s/g, "").replace(",", ".");

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 100000) {
    return null;
  }

  return Math.round(parsedValue * 100) / 100;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getStatusLabel(status: TicketIntentStatus | null): string {
  if (status === "ticket_acquired") {
    return "Ingresso garantido";
  }

  if (status === "checked_in") {
    return "Presença registrada";
  }

  if (status === "wants_ticket") {
    return "Quero adquirir ingresso";
  }

  if (status === "interested") {
    return "Tenho interesse";
  }

  if (status === "cancelled") {
    return "Não vou mais";
  }

  return "Jornada ainda não informada";
}

function getHelperText(status: TicketIntentStatus | null): string {
  if (status === "ticket_acquired") {
    return "Seu ingresso está registrado. Agora a experiência prioriza preparação, conexões e participação.";
  }

  if (status === "checked_in") {
    return "Seu check-in confirmou sua presença neste evento.";
  }

  if (status === "wants_ticket") {
    return "Você continua com acesso a pessoas, encontros, grupos e caronas enquanto organiza a compra.";
  }

  if (status === "interested") {
    return "Explore pessoas, encontros, grupos e caronas mesmo antes de adquirir ingresso.";
  }

  if (status === "cancelled") {
    return "Sua desistência foi registrada. Você pode informar um ingresso disponível somente às suas conexões aceitas.";
  }

  return "Escolha seu momento sem limitar o acesso à experiência social do evento.";
}

function getFeedbackText(status: TicketIntentStatus): string {
  if (status === "ticket_acquired") {
    return "Ingresso registrado. As ações de aquisição foram ocultadas.";
  }

  if (status === "wants_ticket") {
    return "Você informou que pretende adquirir ingresso.";
  }

  if (status === "interested") {
    return "Seu interesse neste evento foi registrado.";
  }

  if (status === "cancelled") {
    return "Sua desistência foi registrada.";
  }

  return "Sua jornada foi atualizada.";
}

function getSocialParticipationLabel(
  journey: EventSocialJourney | null
): string {
  if (!journey || !journey.active) {
    return "Ainda não informado";
  }

  if (journey.participation_mode === "alone") {
    return "Vou sozinho";
  }

  if (journey.participation_mode === "with_friends") {
    return "Vou com amigos";
  }

  return "Ainda estou decidindo";
}

function getSocialFeedbackText(
  mode: SocialParticipationMode,
  statusWasActivated: boolean
): string {
  const suffix = statusWasActivated
    ? " O evento também foi registrado em Tenho interesse."
    : "";

  if (mode === "alone") {
    return `Registrado: você vai sozinho e poderá encontrar pessoas compatíveis.${suffix}`;
  }

  if (mode === "with_friends") {
    return `Registrado: você vai com amigos e pode abrir seu grupo para novas conexões.${suffix}`;
  }

  return `Registrado: você ainda está decidindo e continua com acesso à camada social.${suffix}`;
}

function getAvailabilityStatusLabel(
  availability: TicketAvailability | null
): string {
  if (availability?.status === "available") {
    return "Disponível para conexões";
  }

  if (availability?.status === "reserved") {
    return "Reservado";
  }

  if (availability?.status === "transferred") {
    return "Transferido";
  }

  if (availability?.status === "withdrawn") {
    return "Disponibilidade retirada";
  }

  return "Não informado";
}

function getActionClassName(action: JourneyAction, isActive: boolean): string {
  return [
    "event-ticket-journey__action",
    `event-ticket-journey__action--${action.tone}`,
    isActive ? "event-ticket-journey__action--active" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function TicketIntentButton({
  eventGroupId,
  initialStatus = null,
}: TicketIntentButtonProps) {
  const [status, setStatus] = useState<TicketIntentStatus | null>(initialStatus);
  const [availability, setAvailability] =
    useState<TicketAvailability | null>(null);
  const [socialJourney, setSocialJourney] =
    useState<EventSocialJourney | null>(null);
  const [mobileJourneyPanel, setMobileJourneyPanel] =
    useState<MobileJourneyPanel>("moment");
  const [availabilityForm, setAvailabilityForm] =
    useState<AvailabilityFormState>({ ...EMPTY_AVAILABILITY_FORM });
  const [isAvailabilityEditorOpen, setIsAvailabilityEditorOpen] =
    useState(false);
  const [isLoadingInitialStatus, setIsLoadingInitialStatus] = useState(
    Boolean(eventGroupId)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSocialJourney, setIsSavingSocialJourney] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [pendingAvailabilityAction, setPendingAvailabilityAction] = useState<
    "transferred" | "withdrawn" | null
  >(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [socialFeedback, setSocialFeedback] = useState<string | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [availabilityFeedback, setAvailabilityFeedback] =
    useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null
  );

  const statusLabel = useMemo(() => getStatusLabel(status), [status]);
  const helperText = useMemo(() => getHelperText(status), [status]);
  const availabilityStatusLabel = useMemo(
    () => getAvailabilityStatusLabel(availability),
    [availability]
  );
  const socialParticipationLabel = useMemo(
    () => getSocialParticipationLabel(socialJourney),
    [socialJourney]
  );
  const selectedSocialPreferenceCount = useMemo(
    () =>
      socialJourney?.active
        ? Object.values(socialJourney.preferences).filter(Boolean).length
        : 0,
    [socialJourney]
  );
  const groupPreferenceSummary = useMemo(() => {
    if (!socialJourney?.active) {
      return "Sem preferência";
    }

    if (socialJourney.preferences.mixed_group) {
      return "Misto / indiferente";
    }

    const selectedLabels = GROUP_PREFERENCE_ACTIONS.filter(
      (action) =>
        action.key !== "mixed_group" &&
        socialJourney.preferences[action.key]
    ).map((action) => action.label);

    if (selectedLabels.length === 0) {
      return "Sem preferência";
    }

    if (selectedLabels.length === 1) {
      return selectedLabels[0];
    }

    if (selectedLabels.length === 2) {
      return selectedLabels.join(" + ");
    }

    return "3 preferências";
  }, [socialJourney]);
  const isCheckedIn = status === "checked_in";
  const hasActiveAvailability =
    availability?.status === "available" || availability?.status === "reserved";

  useEffect(() => {
    if (!eventGroupId) {
      setIsLoadingInitialStatus(false);
      return;
    }

    const controller = new AbortController();

    async function loadSavedIntent() {
      setIsLoadingInitialStatus(true);

      try {
        const response = await fetch(
          `/api/event-ticket-intents?event_group_id=${encodeURIComponent(
            eventGroupId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (response.status === 401 || !response.ok) {
          return;
        }

        const data = (await response.json()) as TicketIntentApiResponse;
        const savedStatus = data.intent?.status;
        const savedAvailability = parseTicketAvailability(
          data.intent?.metadata
        );
        const savedSocialJourney = parseEventSocialJourney(
          data.intent?.metadata
        );

        if (isTicketIntentStatus(savedStatus)) {
          setStatus(savedStatus);
        }

        if (savedAvailability) {
          setAvailability(savedAvailability);
          setAvailabilityForm(availabilityToForm(savedAvailability));
          setIsAvailabilityEditorOpen(false);
        }

        if (savedSocialJourney) {
          setSocialJourney(savedSocialJourney);
        }
      } catch (caughtError) {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === "AbortError"
        ) {
          return;
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingInitialStatus(false);
        }
      }
    }

    void loadSavedIntent();

    return () => {
      controller.abort();
    };
  }, [eventGroupId]);

  async function saveIntent(nextStatus: TicketIntentStatus) {
    if (!eventGroupId || isSaving || isLoadingInitialStatus || isCheckedIn) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    setError(null);
    setSocialFeedback(null);
    setSocialError(null);
    setAvailabilityFeedback(null);
    setAvailabilityError(null);

    try {
      const response = await fetch("/api/event-ticket-intents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_group_id: eventGroupId,
          status: nextStatus,
          source: "event_page",
          notes: "Clubber updated event journey from public event page.",
          metadata: {
            component: "TicketIntentButton",
            version: "v4.8.135",
            journey_foundation: true,
          },
        }),
      });

      const data = (await response.json()) as TicketIntentApiResponse;

      if (!response.ok || !data.ok) {
        throw new Error(
          response.status === 401
            ? "Entre na sua conta para salvar sua jornada."
            : data.message || "Não foi possível salvar sua jornada."
        );
      }

      const savedAvailability = parseTicketAvailability(data.intent?.metadata);
      const savedSocialJourney = parseEventSocialJourney(
        data.intent?.metadata
      );

      setStatus(nextStatus);
      setAvailability(savedAvailability);
      setSocialJourney(savedSocialJourney);
      setAvailabilityForm(availabilityToForm(savedAvailability));
      setIsAvailabilityEditorOpen(false);
      setFeedback(getFeedbackText(nextStatus));

      window.dispatchEvent(
        new CustomEvent(EVENT_TICKET_INTENT_UPDATED, {
          detail: {
            eventGroupId,
            status: nextStatus,
          },
        })
      );

      if (nextStatus !== "cancelled") {
        window.dispatchEvent(
          new CustomEvent(EVENT_TICKET_NETWORK_AVAILABILITY_UPDATED, {
            detail: {
              eventGroupId,
            },
          })
        );
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível salvar sua jornada."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSocialJourney(
    nextMode: SocialParticipationMode,
    nextPreferences: EventSocialPreferences
  ) {
    if (
      !eventGroupId ||
      isSavingSocialJourney ||
      isLoadingInitialStatus
    ) {
      return;
    }

    const previousStatus = status;
    const nextStatus: TicketIntentStatus =
      status && status !== "cancelled" ? status : "interested";

    setIsSavingSocialJourney(true);
    setSocialFeedback(null);
    setSocialError(null);
    setFeedback(null);
    setError(null);
    setAvailabilityFeedback(null);
    setAvailabilityError(null);

    try {
      const response = await fetch("/api/event-ticket-intents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_group_id: eventGroupId,
          status: nextStatus,
          source: "event_page",
          notes: "Clubber updated event social participation state.",
          metadata: {
            component: "TicketIntentButton",
            version: "v4.8.135",
            journey_foundation: true,
            event_social_journey: {
              participation_mode: nextMode,
              preferences: nextPreferences,
              active: true,
            },
          },
        }),
      });

      const data = (await response.json()) as TicketIntentApiResponse;

      if (!response.ok || !data.ok) {
        throw new Error(
          response.status === 401
            ? "Entre na sua conta para salvar sua participação social."
            : data.message ||
                "Não foi possível salvar sua participação social."
        );
      }

      const savedStatus = data.intent?.status;
      const savedSocialJourney = parseEventSocialJourney(
        data.intent?.metadata
      );
      const savedAvailability = parseTicketAvailability(
        data.intent?.metadata
      );

      if (!savedSocialJourney) {
        throw new Error(
          "A participação social não retornou em formato válido."
        );
      }

      if (isTicketIntentStatus(savedStatus)) {
        setStatus(savedStatus);
      }

      setSocialJourney(savedSocialJourney);
      setAvailability(savedAvailability);
      setAvailabilityForm(availabilityToForm(savedAvailability));
      setIsAvailabilityEditorOpen(false);
      setSocialFeedback(
        getSocialFeedbackText(
          nextMode,
          !previousStatus || previousStatus === "cancelled"
        )
      );

      window.dispatchEvent(
        new CustomEvent(EVENT_TICKET_INTENT_UPDATED, {
          detail: {
            eventGroupId,
            status: savedStatus || nextStatus,
            socialParticipationMode: nextMode,
          },
        })
      );
    } catch (caughtError) {
      setSocialError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível salvar sua participação social."
      );
    } finally {
      setIsSavingSocialJourney(false);
    }
  }

  async function saveAvailability(nextStatus: TicketAvailabilityStatus) {
    if (
      !eventGroupId ||
      status !== "cancelled" ||
      isSavingAvailability ||
      isLoadingInitialStatus
    ) {
      return;
    }

    const quantity = Number(availabilityForm.quantity);
    const askingPrice = parsePrice(availabilityForm.askingPrice);
    const ticketType = normalizeText(availabilityForm.ticketType, 80);
    const lot = normalizeText(availabilityForm.lot, 80);
    const transferMethod = normalizeText(
      availabilityForm.transferMethod,
      140
    );
    const note = normalizeText(availabilityForm.note, 280);

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10 ||
      askingPrice === null ||
      !ticketType ||
      !transferMethod
    ) {
      setAvailabilityError(
        "Informe quantidade, tipo do ingresso, valor e forma de transferência."
      );
      return;
    }

    setIsSavingAvailability(true);
    setAvailabilityFeedback(null);
    setAvailabilityError(null);
    setFeedback(null);
    setError(null);
    setSocialFeedback(null);
    setSocialError(null);

    try {
      const response = await fetch("/api/event-ticket-intents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_group_id: eventGroupId,
          status: "cancelled",
          source: "event_page",
          notes:
            "Clubber updated ticket availability for accepted connections.",
          metadata: {
            component: "TicketIntentButton",
            version: "v4.8.135",
            journey_foundation: true,
            ticket_network_availability: {
              status: nextStatus,
              quantity,
              ticket_type: ticketType,
              lot,
              asking_price: askingPrice,
              currency: "BRL",
              transfer_method: transferMethod,
              note,
            },
          },
        }),
      });

      const data = (await response.json()) as TicketIntentApiResponse;

      if (!response.ok || !data.ok) {
        throw new Error(
          response.status === 401
            ? "Entre na sua conta para informar o ingresso."
            : data.message || "Não foi possível atualizar a disponibilidade."
        );
      }

      const savedAvailability = parseTicketAvailability(data.intent?.metadata);
      const savedSocialJourney = parseEventSocialJourney(
        data.intent?.metadata
      );

      if (!savedAvailability) {
        throw new Error("A disponibilidade não retornou em formato válido.");
      }

      setAvailability(savedAvailability);
      setSocialJourney(savedSocialJourney);
      setAvailabilityForm(availabilityToForm(savedAvailability));
      setIsAvailabilityEditorOpen(false);
      setPendingAvailabilityAction(null);

      if (nextStatus === "available") {
        setAvailabilityFeedback(
          "Ingresso visível somente para suas conexões aceitas neste evento."
        );
      } else if (nextStatus === "reserved") {
        setAvailabilityFeedback(
          availability?.status === "reserved"
            ? "Alterações salvas. O ingresso permanece reservado."
            : "Ingresso marcado como reservado e ocultado das novas consultas."
        );
      } else if (nextStatus === "transferred") {
        setAvailabilityFeedback("Ingresso marcado como transferido.");
      } else {
        setAvailabilityFeedback("Disponibilidade retirada da sua rede.");
      }

      window.dispatchEvent(
        new CustomEvent(EVENT_TICKET_NETWORK_AVAILABILITY_UPDATED, {
          detail: {
            eventGroupId,
          },
        })
      );
    } catch (caughtError) {
      setAvailabilityError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível atualizar a disponibilidade."
      );
    } finally {
      setIsSavingAvailability(false);
    }
  }

  const controlsDisabled =
    isLoadingInitialStatus || isSaving || !eventGroupId || isCheckedIn;
  const socialControlsDisabled =
    isLoadingInitialStatus || isSavingSocialJourney || !eventGroupId;

  function renderSocialPreferenceAction(
    action: SocialPreferenceAction
  ) {
    const isActive =
      socialJourney?.active === true &&
      socialJourney.preferences[action.key];

    return (
      <button
        key={action.key}
        type="button"
        className={[
          "event-social-journey__preference",
          isActive
            ? "event-social-journey__preference--active"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={isActive}
        disabled={socialControlsDisabled}
        onClick={() => {
          const currentPreferences =
            socialJourney?.preferences || {
              ...EMPTY_SOCIAL_PREFERENCES,
            };

          void saveSocialJourney(
            socialJourney?.participation_mode || "undecided",
            {
              ...currentPreferences,
              [action.key]: !isActive,
            }
          );
        }}
      >
        <span className="event-social-journey__preference-check">
          {isActive ? "✓" : "+"}
        </span>
        <span className="event-social-journey__preference-copy">
          <strong>{action.label}</strong>
          <span>{action.detail}</span>
        </span>
      </button>
    );
  }

  return (
    <section
      className="event-ticket-journey"
      aria-labelledby="event-ticket-journey-title"
      data-status={status || "unselected"}
      data-mobile-panel={mobileJourneyPanel}
    >
      <div className="event-ticket-journey__heading">
        <div className="event-ticket-journey__copy">
          <span className="event-ticket-journey__eyebrow">Minha Jornada</span>

          <h2
            id="event-ticket-journey-title"
            className="event-ticket-journey__title"
          >
            Organize sua participação
          </h2>

          <p className="event-ticket-journey__description">{helperText}</p>
        </div>

        <div className="event-ticket-journey__status" aria-live="polite">
          <span className="event-ticket-journey__status-dot" aria-hidden="true" />
          <span className="event-ticket-journey__status-label">Seu momento</span>
          <strong className="event-ticket-journey__status-value">
            {isLoadingInitialStatus
              ? "Verificando sua jornada..."
              : isSaving
                ? "Salvando sua escolha..."
                : statusLabel}
          </strong>
        </div>
      </div>

      <div
        className="event-journey-mobile-nav"
        role="tablist"
        aria-label="Áreas da sua participação"
      >
        {[
          {
            key: "moment" as const,
            label: "Momento",
            value: statusLabel,
          },
          {
            key: "social" as const,
            label: "Como vou",
            value: socialParticipationLabel,
          },
          {
            key: "preferences" as const,
            label: "O que busco",
            value:
              selectedSocialPreferenceCount > 0
                ? `${selectedSocialPreferenceCount} ${
                    selectedSocialPreferenceCount === 1
                      ? "escolha"
                      : "escolhas"
                  }`
                : "Nada ainda",
          },
        ].map((panel) => {
          const isActive = mobileJourneyPanel === panel.key;

          return (
            <button
              key={panel.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`event-journey-panel-${panel.key}`}
              className={[
                "event-journey-mobile-nav__button",
                isActive
                  ? "event-journey-mobile-nav__button--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setMobileJourneyPanel(panel.key)}
            >
              <span className="event-journey-mobile-nav__label">
                {panel.label}
              </span>
              <strong
                className="event-journey-mobile-nav__value"
                title={panel.value}
              >
                {panel.value}
              </strong>
              <span
                className="event-journey-mobile-nav__action"
                aria-hidden="true"
              >
                {isActive ? "Aberto" : "Abrir"}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="event-journey-panel-moment"
        className="event-ticket-journey__actions"
        role="group"
        aria-label="Atualize sua jornada neste evento"
      >
        {JOURNEY_ACTIONS.map((action, index) => {
          const isActive = status === action.status;

          return (
            <button
              key={action.status}
              type="button"
              onClick={() => saveIntent(action.status)}
              disabled={controlsDisabled || isActive}
              aria-pressed={isActive}
              aria-label={`${action.label}. ${action.detail}`}
              className={getActionClassName(action, isActive)}
            >
              <span className="event-ticket-journey__action-index">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="event-ticket-journey__action-copy">
                <span className="event-ticket-journey__action-title">
                  {action.label}
                </span>

                {isActive ? (
                  <span className="event-ticket-journey__action-state">
                    Selecionado
                  </span>
                ) : null}
              </span>

              <span className="event-ticket-journey__action-arrow" aria-hidden="true">
                →
              </span>
            </button>
          );
        })}
      </div>

      <section
        className="event-social-journey"
        aria-labelledby="event-social-journey-title"
        data-social-mode={
          socialJourney?.active
            ? socialJourney.participation_mode
            : "unselected"
        }
      >
        <div className="event-social-journey__heading">
          <div className="event-social-journey__copy">
            <span className="event-social-journey__eyebrow">
              Camada social
            </span>
            <h3
              id="event-social-journey-title"
              className="event-social-journey__title"
            >
              Como você vai?
            </h3>
            <p className="event-social-journey__description">
              Informe sua situação para encontrar companhia, grupos e pessoas
              compatíveis sem depender de já ter ingresso.
            </p>
          </div>

          <div
            className="event-social-journey__status"
            aria-live="polite"
          >
            <span>Participação</span>
            <strong>
              {isSavingSocialJourney
                ? "Salvando..."
                : socialParticipationLabel}
            </strong>
          </div>
        </div>

        <div
          id="event-journey-panel-social"
          className="event-social-journey__modes"
          role="group"
          aria-label="Como você pretende participar do evento"
        >
          {SOCIAL_MODE_ACTIONS.map((action) => {
            const isActive =
              socialJourney?.active === true &&
              socialJourney.participation_mode === action.mode;

            return (
              <button
                key={action.mode}
                type="button"
                className={[
                  "event-social-journey__mode",
                  action.featured
                    ? "event-social-journey__mode--featured"
                    : "",
                  isActive
                    ? "event-social-journey__mode--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={isActive}
                disabled={socialControlsDisabled || isActive}
                onClick={() =>
                  saveSocialJourney(
                    action.mode,
                    socialJourney?.preferences || {
                      ...EMPTY_SOCIAL_PREFERENCES,
                    }
                  )
                }
              >
                <span className="event-social-journey__mode-title">
                  {action.label}
                </span>
                <span className="event-social-journey__mode-detail">
                  {action.detail}
                </span>
                <span
                  className="event-social-journey__mode-state"
                  aria-hidden="true"
                >
                  {isActive ? "Selecionado" : "Escolher"}
                </span>
              </button>
            );
          })}
        </div>

        <div
          id="event-journey-panel-preferences"
          className="event-social-journey__preferences"
          role="group"
          aria-label="Preferências sociais para este evento"
        >
          <div className="event-social-journey__preferences-heading">
            <strong>O que você procura neste evento?</strong>
            <span>Você pode selecionar mais de uma opção.</span>
          </div>

          <div
            className="event-social-journey__preference-grid"
            role="group"
            aria-label="Preferências sociais para este evento"
          >
            {SOCIAL_PREFERENCE_ACTIONS.slice(0, 3).map(
              renderSocialPreferenceAction
            )}

            <div
              className={[
                "event-social-journey__group-preference",
                GROUP_PREFERENCE_ACTIONS.some(
                  (action) =>
                    socialJourney?.active === true &&
                    socialJourney.preferences[action.key]
                )
                  ? "event-social-journey__group-preference--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="group"
              aria-label="Preferência de grupo"
            >
              <div className="event-social-journey__group-preference-heading">
                <strong>Preferência de grupo</strong>
                <span title={groupPreferenceSummary}>
                  {groupPreferenceSummary}
                </span>
              </div>

              <div className="event-social-journey__group-preference-options">
                {GROUP_PREFERENCE_ACTIONS.map((action) => {
                  const isActive =
                    socialJourney?.active === true &&
                    socialJourney.preferences[action.key];

                  return (
                    <button
                      key={action.key}
                      type="button"
                      className={[
                        "event-social-journey__group-preference-option",
                        isActive
                          ? "event-social-journey__group-preference-option--active"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-pressed={isActive}
                      disabled={socialControlsDisabled}
                      onClick={() => {
                        const currentPreferences =
                          socialJourney?.preferences || {
                            ...EMPTY_SOCIAL_PREFERENCES,
                          };

                        const nextIsActive = !isActive;
                        const nextPreferences = {
                          ...currentPreferences,
                          [action.key]: nextIsActive,
                        };

                        if (action.key === "mixed_group" && nextIsActive) {
                          nextPreferences.women_only = false;
                          nextPreferences.men_only = false;
                          nextPreferences.lgbtqia_plus = false;
                        } else if (action.key !== "mixed_group" && nextIsActive) {
                          nextPreferences.mixed_group = false;
                        }

                        void saveSocialJourney(
                          socialJourney?.participation_mode || "undecided",
                          nextPreferences
                        );
                      }}
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {SOCIAL_PREFERENCE_ACTIONS.slice(3).map(
              renderSocialPreferenceAction
            )}
          </div>
        </div>

        {(socialFeedback || socialError) && (
          <p
            className={
              socialError
                ? "event-social-journey__feedback event-social-journey__feedback--error"
                : "event-social-journey__feedback"
            }
            role={socialError ? "alert" : "status"}
          >
            {socialError || socialFeedback}
          </p>
        )}
      </section>

      {status === "cancelled" ? (
        <section
          className={`${availabilityStyles.root} event-ticket-availability-editor`}
          aria-labelledby="event-ticket-availability-editor-title"
          data-availability-status={availability?.status || "unselected"}
        >
          <div className="event-ticket-availability-editor__intro">
            <div className="event-ticket-availability-editor__copy">
              <span className="event-ticket-availability-editor__eyebrow">
                Somente para conexões aceitas
              </span>
              <h3
                id="event-ticket-availability-editor-title"
                className="event-ticket-availability-editor__title"
              >
                Seu ingresso está disponível?
              </h3>
              <p className="event-ticket-availability-editor__description">
                Informe a disponibilidade para pessoas que já fazem parte da sua
                rede. O USECLUBBERS não intermedeia nem modera a negociação.
              </p>
            </div>

            <div className="event-ticket-availability-editor__state">
              <span>Disponibilidade</span>
              <strong>{availabilityStatusLabel}</strong>
            </div>
          </div>

          {availability ? (
            <div className="event-ticket-availability-editor__summary">
              <span>
                {availability.quantity} {availability.quantity === 1 ? "ingresso" : "ingressos"}
              </span>
              <span>{availability.ticket_type}</span>
              {availability.lot ? <span>{availability.lot}</span> : null}
              <strong>{formatPrice(availability.asking_price)}</strong>
            </div>
          ) : null}

          {!isAvailabilityEditorOpen ? (
            <button
              type="button"
              className="event-ticket-availability-editor__open"
              onClick={() => {
                setAvailabilityForm(availabilityToForm(availability));
                setIsAvailabilityEditorOpen(true);
                setPendingAvailabilityAction(null);
                setAvailabilityFeedback(null);
                setAvailabilityError(null);
              }}
            >
              {hasActiveAvailability
                ? "Editar disponibilidade"
                : availability?.status === "transferred"
                  ? "Informar outro ingresso disponível"
                  : availability?.status === "withdrawn"
                    ? "Disponibilizar novamente"
                    : "Informar ingresso disponível"}
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <div className="event-ticket-availability-editor__form">
              <div className="event-ticket-availability-editor__fields">
                <label className="event-ticket-availability-editor__field event-ticket-availability-editor__field--small">
                  <span>Quantidade</span>
                  <select
                    value={availabilityForm.quantity}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      setAvailabilityForm((current) => ({
                        ...current,
                        quantity: event.target.value,
                      }))
                    }
                    disabled={isSavingAvailability}
                  >
                    {Array.from({ length: 10 }, (_, index) => index + 1).map(
                      (quantity) => (
                        <option key={quantity} value={quantity}>
                          {quantity}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="event-ticket-availability-editor__field">
                  <span>Tipo do ingresso</span>
                  <input
                    type="text"
                    value={availabilityForm.ticketType}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setAvailabilityForm((current) => ({
                        ...current,
                        ticketType: event.target.value,
                      }))
                    }
                    placeholder="Ex.: pista, VIP ou passaporte"
                    maxLength={80}
                    disabled={isSavingAvailability}
                  />
                </label>

                <label className="event-ticket-availability-editor__field">
                  <span>Lote ou identificação opcional</span>
                  <input
                    type="text"
                    value={availabilityForm.lot}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setAvailabilityForm((current) => ({
                        ...current,
                        lot: event.target.value,
                      }))
                    }
                    placeholder="Ex.: 2º lote"
                    maxLength={80}
                    disabled={isSavingAvailability}
                  />
                </label>

                <label className="event-ticket-availability-editor__field event-ticket-availability-editor__field--price">
                  <span>Valor informado</span>
                  <div className="event-ticket-availability-editor__price-input">
                    <span>R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={availabilityForm.askingPrice}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setAvailabilityForm((current) => ({
                          ...current,
                          askingPrice: event.target.value,
                        }))
                      }
                      placeholder="0,00"
                      maxLength={12}
                      disabled={isSavingAvailability}
                    />
                  </div>
                </label>

                <label className="event-ticket-availability-editor__field event-ticket-availability-editor__field--wide event-ticket-availability-editor__field--transfer">
                  <span>Forma declarada de transferência</span>
                  <textarea
                    value={availabilityForm.transferMethod}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      setAvailabilityForm((current) => ({
                        ...current,
                        transferMethod: event.target.value,
                      }))
                    }
                    placeholder="Como o ingresso poderá ser transferido"
                    maxLength={140}
                    rows={2}
                    disabled={isSavingAvailability}
                  />
                </label>

                <label className="event-ticket-availability-editor__field event-ticket-availability-editor__field--wide">
                  <span>Observação opcional</span>
                  <textarea
                    value={availabilityForm.note}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      setAvailabilityForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    placeholder="Informação curta que suas conexões precisam saber"
                    maxLength={280}
                    rows={2}
                    disabled={isSavingAvailability}
                  />
                </label>
              </div>

              <p className="event-ticket-availability-editor__responsibility">
                Autenticidade, preço, pagamento, transferência e conclusão da
                negociação são responsabilidade exclusiva das partes.
              </p>

              {pendingAvailabilityAction === "withdrawn" ? (
                <p
                  className="event-ticket-availability-editor__responsibility"
                  role="alert"
                  style={{
                    borderLeftColor: "rgba(248, 113, 113, 0.72)",
                    color: "rgba(254, 202, 202, 0.92)",
                  }}
                >
                  Ao confirmar, esta oferta deixará de aparecer para suas
                  conexões. Você poderá disponibilizá-la novamente depois.
                </p>
              ) : null}

              <div className="event-ticket-availability-editor__controls">
                {pendingAvailabilityAction ? (
                  <>
                    <button
                      type="button"
                      className="event-ticket-availability-editor__control event-ticket-availability-editor__control--primary"
                      style={
                        pendingAvailabilityAction === "withdrawn"
                          ? {
                              borderColor: "rgba(248, 113, 113, 0.62)",
                              background:
                                "linear-gradient(135deg, rgba(127, 29, 29, 0.48), rgba(190, 24, 93, 0.24))",
                              color: "#ffffff",
                            }
                          : undefined
                      }
                      onClick={() =>
                        saveAvailability(pendingAvailabilityAction)
                      }
                      disabled={isSavingAvailability}
                    >
                      {isSavingAvailability
                        ? "Salvando..."
                        : pendingAvailabilityAction === "withdrawn"
                          ? "Confirmar retirada"
                          : "Confirmar transferência"}
                    </button>

                    <button
                      type="button"
                      className="event-ticket-availability-editor__control event-ticket-availability-editor__control--ghost"
                      onClick={() => setPendingAvailabilityAction(null)}
                      disabled={isSavingAvailability}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="event-ticket-availability-editor__control event-ticket-availability-editor__control--primary"
                      onClick={() =>
                        saveAvailability(
                          availability?.status === "reserved"
                            ? "reserved"
                            : "available"
                        )
                      }
                      disabled={isSavingAvailability}
                    >
                      {isSavingAvailability
                        ? "Salvando..."
                        : availability?.status === "reserved"
                          ? "Salvar alterações"
                          : availability?.status === "available"
                            ? "Atualizar disponibilidade"
                            : "Disponibilizar para conexões"}
                    </button>

                    {availability?.status === "reserved" ? (
                      <button
                        type="button"
                        className="event-ticket-availability-editor__control"
                        onClick={() => saveAvailability("available")}
                        disabled={isSavingAvailability}
                      >
                        Voltar a disponibilizar
                      </button>
                    ) : null}

                    {availability?.status === "available" ? (
                      <button
                        type="button"
                        className="event-ticket-availability-editor__control"
                        onClick={() => saveAvailability("reserved")}
                        disabled={isSavingAvailability}
                      >
                        Marcar reservado
                      </button>
                    ) : null}

                    {hasActiveAvailability ? (
                      <button
                        type="button"
                        className="event-ticket-availability-editor__control"
                        onClick={() =>
                          setPendingAvailabilityAction("transferred")
                        }
                        disabled={isSavingAvailability}
                      >
                        Marcar transferido
                      </button>
                    ) : null}

                    {hasActiveAvailability ? (
                      <button
                        type="button"
                        className="event-ticket-availability-editor__control event-ticket-availability-editor__control--muted"
                        onClick={() =>
                          setPendingAvailabilityAction("withdrawn")
                        }
                        disabled={isSavingAvailability}
                      >
                        Retirar disponibilidade
                      </button>
                    ) : null}

                    <button
                      type="button"
                      className="event-ticket-availability-editor__control event-ticket-availability-editor__control--ghost"
                      onClick={() => {
                        setAvailabilityForm(availabilityToForm(availability));
                        setIsAvailabilityEditorOpen(false);
                        setPendingAvailabilityAction(null);
                        setAvailabilityError(null);
                      }}
                      disabled={isSavingAvailability}
                    >
                      Fechar
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {(availabilityFeedback || availabilityError) && (
            <p
              className={
                availabilityError
                  ? "event-ticket-availability-editor__feedback event-ticket-availability-editor__feedback--error"
                  : "event-ticket-availability-editor__feedback"
              }
              role={availabilityError ? "alert" : "status"}
            >
              {availabilityError || availabilityFeedback}
            </p>
          )}
        </section>
      ) : null}

      {(feedback || error) && (
        <p
          className={
            error
              ? "event-ticket-journey__feedback event-ticket-journey__feedback--error"
              : "event-ticket-journey__feedback"
          }
          role={error ? "alert" : "status"}
        >
          {error || feedback}
        </p>
      )}
    </section>
  );
}
