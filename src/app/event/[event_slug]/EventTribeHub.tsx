// src/app/event/[event_slug]/EventTribeHub.tsx
"use client";

import type { FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";

type EventTribeHubProps = {
  eventGroupId: string;
  eventReturnTo: string;
  isAuthenticated: boolean;
};

type TribeCategory =
  | "genre"
  | "artist"
  | "stage"
  | "city_caravan"
  | "experience"
  | "social_profile"
  | "lodging_logistics"
  | "club_festival_community"
  | "custom";

type TribeRow = {
  tribe_id: string;
  event_group_id: string;
  creator_user_id: string;
  name: string;
  description: string | null;
  category: TribeCategory;
  visibility: "public" | "private";
  max_members: number;
  rules: string | null;
  status: "active" | "closed" | "archived" | "cancelled";
  expires_at: string | null;
  closed_at: string | null;
  archived_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type TribeMemberRow = {
  tribe_member_id: string;
  tribe_id: string;
  user_id: string;
  role: "creator" | "organizer" | "moderator" | "member";
  status: "approved" | "left" | "removed" | "blocked";
  invited_by_user_id: string | null;
  status_changed_by_user_id: string | null;
  joined_at: string | null;
  left_at: string | null;
  status_changed_at: string | null;
  created_at: string;
  updated_at: string;
};

type TribeRequestRow = {
  request_id: string;
  tribe_id: string;
  requester_user_id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  message: string | null;
  decided_by_user_id: string | null;
  decided_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type PersonRow = {
  user_id: string;
  label: string;
  slug: string | null;
  photo_url: string | null;
  city_base: string | null;
};

type ReadPayload = {
  ok: boolean;
  message?: string;
  details?: string;
  viewer_user_id?: string;
  categories?: TribeCategory[];
  tribes?: TribeRow[];
  members?: TribeMemberRow[];
  requests?: TribeRequestRow[];
  people?: PersonRow[];
};

type MutationPayload = {
  ok: boolean;
  message?: string;
  details?: string;
  tribe_id?: string;
  request_id?: string;
  updated?: boolean;
  cancelled?: boolean;
  decided?: boolean;
  left?: boolean;
};

type FeedbackState = {
  tone: "success" | "error" | "info";
  message: string;
} | null;

const CATEGORY_OPTIONS: Array<{
  value: TribeCategory;
  label: string;
}> = [
  { value: "genre", label: "Vertente" },
  { value: "artist", label: "Artista" },
  { value: "stage", label: "Palco" },
  { value: "city_caravan", label: "Cidade ou caravana" },
  { value: "experience", label: "Experiência" },
  { value: "social_profile", label: "Perfil social" },
  {
    value: "lodging_logistics",
    label: "Hospedagem ou logística",
  },
  {
    value: "club_festival_community",
    label: "Comunidade de club ou festival",
  },
  { value: "custom", label: "Outro tema" },
];

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
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
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return DATE_FORMATTER.format(date);
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

function getCategoryLabel(category: string): string {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === category)
      ?.label ?? "Outro tema"
  );
}

function getVisibilityLabel(
  visibility: TribeRow["visibility"]
): string {
  return visibility === "private"
    ? "Privada"
    : "Visível no evento";
}

function getRoleLabel(role: TribeMemberRow["role"]): string {
  if (role === "creator") {
    return "Criador";
  }

  if (role === "organizer") {
    return "Organizador";
  }

  if (role === "moderator") {
    return "Moderador";
  }

  return "Participante";
}

function getStatusLabel(status: TribeRow["status"]): string {
  if (status === "closed") {
    return "Encerrada";
  }

  if (status === "archived") {
    return "Arquivada";
  }

  if (status === "cancelled") {
    return "Cancelada";
  }

  return "Ativa";
}

async function readPayload<T extends { ok: boolean }>(
  response: Response
): Promise<T> {
  let payload: T | null = null;

  try {
    payload = (await response.json()) as T;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    const candidate = payload as
      | {
          message?: string;
          details?: string;
        }
      | null;

    throw new Error(
      normalizeText(candidate?.message) ||
        normalizeText(candidate?.details) ||
        "Não foi possível concluir esta ação."
    );
  }

  return payload;
}


type TribeEditDraft = {
  name: string;
  description: string;
  category: TribeCategory;
  visibility: TribeRow["visibility"];
  maxMembers: string;
  rules: string;
  expiresAt: string;
};

type TribeEditField = keyof TribeEditDraft;

type TribeEditFieldErrors = Partial<
  Record<TribeEditField, string>
>;

type TribeEditSaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "invalid"
  | "error";

type TribeEditPayload = {
  name: string;
  description: string | null;
  category: TribeCategory;
  visibility: TribeRow["visibility"];
  max_members: number;
  rules: string | null;
  expires_at: string | null;
};

type TribeEditSaveResult = {
  ok: boolean;
  message: string;
};

type TribeEditFormProps = {
  tribe: TribeRow;
  disabled: boolean;
  onSave: (
    tribeId: string,
    payload: TribeEditPayload
  ) => Promise<TribeEditSaveResult>;
};

const EDIT_FIELD_NAMES: Record<TribeEditField, string> = {
  name: "name",
  description: "description",
  category: "category",
  visibility: "visibility",
  maxMembers: "max_members",
  rules: "rules",
  expiresAt: "expires_at",
};

const EDIT_FIELD_ORDER: TribeEditField[] = [
  "name",
  "description",
  "category",
  "visibility",
  "maxMembers",
  "expiresAt",
  "rules",
];

function createTribeEditDraft(
  tribe: TribeRow
): TribeEditDraft {
  return {
    name: tribe.name,
    description: tribe.description ?? "",
    category: tribe.category,
    visibility: tribe.visibility,
    maxMembers: String(tribe.max_members),
    rules: tribe.rules ?? "",
    expiresAt: toDateTimeLocalValue(tribe.expires_at),
  };
}

function validateTribeEditDraft(draft: TribeEditDraft): {
  errors: TribeEditFieldErrors;
  payload: TribeEditPayload | null;
  fingerprint: string;
} {
  const errors: TribeEditFieldErrors = {};
  const name = normalizeText(draft.name);
  const description = normalizeText(draft.description);
  const rules = normalizeText(draft.rules);
  const maxMembers = Number(draft.maxMembers);

  if (name.length < 3 || name.length > 80) {
    errors.name =
      "O nome deve ter entre 3 e 80 caracteres.";
  }

  if (description.length > 360) {
    errors.description =
      "A descrição deve ter no máximo 360 caracteres.";
  }

  if (
    !CATEGORY_OPTIONS.some(
      (option) => option.value === draft.category
    )
  ) {
    errors.category = "Selecione um tema válido.";
  }

  if (
    draft.visibility !== "public" &&
    draft.visibility !== "private"
  ) {
    errors.visibility =
      "Selecione uma visibilidade válida.";
  }

  if (
    !Number.isInteger(maxMembers) ||
    maxMembers < 2 ||
    maxMembers > 250
  ) {
    errors.maxMembers =
      "A capacidade deve ficar entre 2 e 250 participantes.";
  }

  if (rules.length > 2000) {
    errors.rules =
      "As regras devem ter no máximo 2.000 caracteres.";
  }

  let expiresAt: string | null = null;

  try {
    expiresAt = toNullableIso(draft.expiresAt);
  } catch {
    errors.expiresAt = "A data de encerramento é inválida.";
  }

  const payload: TribeEditPayload | null =
    Object.keys(errors).length === 0
      ? {
          name,
          description: description || null,
          category: draft.category,
          visibility: draft.visibility,
          max_members: maxMembers,
          rules: rules || null,
          expires_at: expiresAt,
        }
      : null;

  return {
    errors,
    payload,
    fingerprint: payload
      ? JSON.stringify(payload)
      : JSON.stringify(draft),
  };
}

function mapEditServerError(
  message: string
): TribeEditFieldErrors {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("name") ||
    normalized.includes("nome")
  ) {
    return { name: message };
  }

  if (
    normalized.includes("description") ||
    normalized.includes("descrição")
  ) {
    return { description: message };
  }

  if (
    normalized.includes("category") ||
    normalized.includes("tema")
  ) {
    return { category: message };
  }

  if (
    normalized.includes("visibility") ||
    normalized.includes("visibilidade")
  ) {
    return { visibility: message };
  }

  if (
    normalized.includes("max_members") ||
    normalized.includes("capacity") ||
    normalized.includes("capacidade") ||
    normalized.includes("participant")
  ) {
    return { maxMembers: message };
  }

  if (
    normalized.includes("expires") ||
    normalized.includes("expiration") ||
    normalized.includes("date") ||
    normalized.includes("data")
  ) {
    return { expiresAt: message };
  }

  if (
    normalized.includes("rules") ||
    normalized.includes("regras")
  ) {
    return { rules: message };
  }

  return {};
}

function TribeEditForm({
  tribe,
  disabled,
  onSave,
}: TribeEditFormProps) {
  const initialDraft = createTribeEditDraft(tribe);
  const initialValidation = validateTribeEditDraft(initialDraft);
  const [draft, setDraft] =
    useState<TribeEditDraft>(initialDraft);
  const [fieldErrors, setFieldErrors] =
    useState<TribeEditFieldErrors>({});
  const [saveStatus, setSaveStatus] =
    useState<TribeEditSaveStatus>("idle");
  const [generalError, setGeneralError] = useState("");
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const draftRef = useRef<TribeEditDraft>(initialDraft);
  const baselineFingerprintRef = useRef(
    initialValidation.fingerprint
  );
  const savingRef = useRef(false);
  const saveAttemptRef = useRef(0);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  function focusFirstInvalidField(
    errors: TribeEditFieldErrors
  ) {
    const firstInvalidField = EDIT_FIELD_ORDER.find(
      (field) => Boolean(errors[field])
    );

    if (!firstInvalidField) {
      return;
    }

    const fieldName = EDIT_FIELD_NAMES[firstInvalidField];

    window.requestAnimationFrame(() => {
      const element = formRef.current?.querySelector<HTMLElement>(
        `[name="${fieldName}"]`
      );

      element?.focus();
    });
  }

  function updateDraftField(
    field: TribeEditField,
    value: string
  ) {
    const nextDraft = {
      ...draftRef.current,
      [field]: value,
    } as TribeEditDraft;
    const validation = validateTribeEditDraft(nextDraft);
    const hasErrors = Object.keys(validation.errors).length > 0;
    const nextDirty =
      validation.fingerprint !== baselineFingerprintRef.current;

    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setFieldErrors(validation.errors);
    setGeneralError("");
    setDirty(nextDirty);

    if (hasErrors) {
      setSaveStatus("invalid");
      return;
    }

    setSaveStatus(nextDirty ? "dirty" : "saved");
  }

  const performSave = useCallback(
    async (source: "auto" | "manual" | "retry") => {
      if (savingRef.current || disabled) {
        return;
      }

      const validation = validateTribeEditDraft(
        draftRef.current
      );
      const hasErrors =
        Object.keys(validation.errors).length > 0;

      setFieldErrors(validation.errors);

      if (hasErrors || !validation.payload) {
        setSaveStatus("invalid");
        setGeneralError(
          "Há campos que precisam de correção. O salvamento automático foi pausado."
        );

        if (source !== "auto") {
          focusFirstInvalidField(validation.errors);
        }

        return;
      }

      if (
        validation.fingerprint ===
          baselineFingerprintRef.current &&
        source !== "retry"
      ) {
        setDirty(false);
        setSaveStatus("saved");
        setGeneralError("");
        return;
      }

      savingRef.current = true;
      const attempt = saveAttemptRef.current + 1;
      saveAttemptRef.current = attempt;
      setSaveStatus("saving");
      setGeneralError("");

      try {
        const result = await onSaveRef.current(
          tribe.tribe_id,
          validation.payload
        );

        if (attempt !== saveAttemptRef.current) {
          return;
        }

        if (!result.ok) {
          const mappedErrors = mapEditServerError(
            result.message
          );

          setFieldErrors((current) => ({
            ...current,
            ...mappedErrors,
          }));
          setGeneralError(result.message);
          setDirty(true);
          setSaveStatus("error");
          return;
        }

        baselineFingerprintRef.current =
          validation.fingerprint;

        const currentValidation = validateTribeEditDraft(
          draftRef.current
        );
        const unchangedSinceRequest =
          currentValidation.fingerprint ===
          validation.fingerprint;

        setGeneralError("");

        if (unchangedSinceRequest) {
          setFieldErrors({});
          setDirty(false);
          setSaveStatus("saved");
          return;
        }

        setFieldErrors(currentValidation.errors);
        setDirty(true);
        setSaveStatus(
          Object.keys(currentValidation.errors).length > 0
            ? "invalid"
            : "dirty"
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível salvar as alterações.";

        setFieldErrors((current) => ({
          ...current,
          ...mapEditServerError(message),
        }));
        setGeneralError(message);
        setDirty(true);
        setSaveStatus("error");
      } finally {
        savingRef.current = false;
      }
    },
    [disabled, tribe.tribe_id]
  );

  useEffect(() => {
    if (
      !dirty ||
      disabled ||
      saveStatus !== "dirty"
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void performSave("auto");
    }, 1100);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [disabled, dirty, draft, performSave, saveStatus]);

  function getStatusMessage(): string {
    if (saveStatus === "saving") {
      return "Salvando alterações...";
    }

    if (saveStatus === "saved") {
      return "Alterações salvas.";
    }

    if (saveStatus === "dirty") {
      return "Alterações pendentes. Salvamento automático em instantes.";
    }

    if (saveStatus === "invalid") {
      return "Há campos que precisam de correção. O salvamento automático foi pausado.";
    }

    if (saveStatus === "error") {
      return (
        generalError ||
        "Não foi possível salvar. Seus dados foram preservados."
      );
    }

    return "O salvamento automático será ativado ao editar.";
  }

  function renderFieldError(field: TribeEditField) {
    const message = fieldErrors[field];

    if (!message) {
      return null;
    }

    return (
      <span
        id={`event-tribe-edit-${field}-error-${tribe.tribe_id}`}
        className="event-tribe-hub__field-error"
        role="alert"
      >
        {message}
      </span>
    );
  }

  return (
    <form
      ref={formRef}
      className="event-tribe-hub__edit-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void performSave("manual");
      }}
    >
      <div
        className="event-tribe-hub__edit-savebar"
        data-status={saveStatus}
      >
        <p
          className="event-tribe-hub__edit-status"
          role={
            saveStatus === "invalid" || saveStatus === "error"
              ? "alert"
              : "status"
          }
          aria-live="polite"
        >
          {getStatusMessage()}
        </p>

        <div className="event-tribe-hub__edit-save-actions">
          {saveStatus === "error" ? (
            <button
              type="button"
              className="event-tribe-hub__edit-retry"
              disabled={disabled}
              onClick={() => void performSave("retry")}
            >
              Tentar novamente
            </button>
          ) : null}

          <button
            type="submit"
            className="event-tribe-hub__edit-submit"
            disabled={disabled || saveStatus === "saving"}
          >
            {saveStatus === "saving"
              ? "Salvando..."
              : "Salvar agora"}
          </button>
        </div>
      </div>

      <div
        className="event-tribe-hub__field"
        data-invalid={fieldErrors.name ? "true" : "false"}
      >
        <label
          htmlFor={`event-tribe-edit-name-${tribe.tribe_id}`}
        >
          Nome da tribo
        </label>
        <input
          id={`event-tribe-edit-name-${tribe.tribe_id}`}
          name="name"
          value={draft.name}
          minLength={3}
          maxLength={80}
          required
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={
            fieldErrors.name
              ? `event-tribe-edit-name-error-${tribe.tribe_id}`
              : undefined
          }
          onChange={(event) =>
            updateDraftField("name", event.target.value)
          }
        />
        {renderFieldError("name")}
      </div>

      <div
        className="event-tribe-hub__field"
        data-invalid={
          fieldErrors.description ? "true" : "false"
        }
      >
        <label
          htmlFor={`event-tribe-edit-description-${tribe.tribe_id}`}
        >
          Descrição
        </label>
        <textarea
          id={`event-tribe-edit-description-${tribe.tribe_id}`}
          name="description"
          value={draft.description}
          maxLength={360}
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={
            fieldErrors.description
              ? `event-tribe-edit-description-error-${tribe.tribe_id}`
              : undefined
          }
          onChange={(event) =>
            updateDraftField(
              "description",
              event.target.value
            )
          }
        />
        {renderFieldError("description")}
      </div>

      <div
        className="event-tribe-hub__field"
        data-invalid={
          fieldErrors.category ? "true" : "false"
        }
      >
        <label
          htmlFor={`event-tribe-edit-category-${tribe.tribe_id}`}
        >
          Tema
        </label>
        <select
          id={`event-tribe-edit-category-${tribe.tribe_id}`}
          name="category"
          value={draft.category}
          required
          aria-invalid={Boolean(fieldErrors.category)}
          aria-describedby={
            fieldErrors.category
              ? `event-tribe-edit-category-error-${tribe.tribe_id}`
              : undefined
          }
          onChange={(event) =>
            updateDraftField("category", event.target.value)
          }
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {renderFieldError("category")}
      </div>

      <div
        className="event-tribe-hub__field"
        data-invalid={
          fieldErrors.visibility ? "true" : "false"
        }
      >
        <label
          htmlFor={`event-tribe-edit-visibility-${tribe.tribe_id}`}
        >
          Visibilidade
        </label>
        <select
          id={`event-tribe-edit-visibility-${tribe.tribe_id}`}
          name="visibility"
          value={draft.visibility}
          required
          aria-invalid={Boolean(fieldErrors.visibility)}
          aria-describedby={
            fieldErrors.visibility
              ? `event-tribe-edit-visibility-error-${tribe.tribe_id}`
              : undefined
          }
          onChange={(event) =>
            updateDraftField(
              "visibility",
              event.target.value
            )
          }
        >
          <option value="public">Visível no evento</option>
          <option value="private">Privada</option>
        </select>
        {renderFieldError("visibility")}
      </div>

      <div
        className="event-tribe-hub__field"
        data-invalid={
          fieldErrors.maxMembers ? "true" : "false"
        }
      >
        <label
          htmlFor={`event-tribe-edit-capacity-${tribe.tribe_id}`}
        >
          Limite de participantes
        </label>
        <input
          id={`event-tribe-edit-capacity-${tribe.tribe_id}`}
          name="max_members"
          type="number"
          min={2}
          max={250}
          step={1}
          value={draft.maxMembers}
          required
          aria-invalid={Boolean(fieldErrors.maxMembers)}
          aria-describedby={
            fieldErrors.maxMembers
              ? `event-tribe-edit-maxMembers-error-${tribe.tribe_id}`
              : undefined
          }
          onChange={(event) =>
            updateDraftField(
              "maxMembers",
              event.target.value
            )
          }
        />
        {renderFieldError("maxMembers")}
      </div>

      <div
        className="event-tribe-hub__field"
        data-invalid={
          fieldErrors.expiresAt ? "true" : "false"
        }
      >
        <label
          htmlFor={`event-tribe-edit-expires-${tribe.tribe_id}`}
        >
          Encerramento automático
        </label>
        <input
          id={`event-tribe-edit-expires-${tribe.tribe_id}`}
          name="expires_at"
          type="datetime-local"
          value={draft.expiresAt}
          aria-invalid={Boolean(fieldErrors.expiresAt)}
          aria-describedby={
            fieldErrors.expiresAt
              ? `event-tribe-edit-expiresAt-error-${tribe.tribe_id}`
              : undefined
          }
          onChange={(event) =>
            updateDraftField(
              "expiresAt",
              event.target.value
            )
          }
        />
        {renderFieldError("expiresAt")}
      </div>

      <div
        className="event-tribe-hub__field"
        data-invalid={fieldErrors.rules ? "true" : "false"}
      >
        <label
          htmlFor={`event-tribe-edit-rules-${tribe.tribe_id}`}
        >
          Regras
        </label>
        <textarea
          id={`event-tribe-edit-rules-${tribe.tribe_id}`}
          name="rules"
          value={draft.rules}
          maxLength={2000}
          aria-invalid={Boolean(fieldErrors.rules)}
          aria-describedby={
            fieldErrors.rules
              ? `event-tribe-edit-rules-error-${tribe.tribe_id}`
              : undefined
          }
          onChange={(event) =>
            updateDraftField("rules", event.target.value)
          }
        />
        {renderFieldError("rules")}
      </div>

    </form>
  );
}

export default function EventTribeHub({
  eventGroupId,
  eventReturnTo,
  isAuthenticated,
}: EventTribeHubProps) {
  const [tribes, setTribes] = useState<TribeRow[]>([]);
  const [members, setMembers] = useState<TribeMemberRow[]>([]);
  const [requests, setRequests] = useState<TribeRequestRow[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [viewerUserId, setViewerUserId] = useState("");
  const [loading, setLoading] = useState(isAuthenticated);
  const [busyKey, setBusyKey] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | TribeCategory
  >("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [highlightedTribeId, setHighlightedTribeId] =
    useState("");
  const [requestMessages, setRequestMessages] = useState<
    Record<string, string>
  >({});

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] =
    useState<TribeCategory>("custom");
  const [visibility, setVisibility] =
    useState<TribeRow["visibility"]>("public");
  const [maxMembers, setMaxMembers] = useState("30");
  const [rules, setRules] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const cardRefs = useRef(
    new Map<string, HTMLElement>()
  );
  const editMutationLocksRef = useRef(
    new Set<string>()
  );

  const loginHref = useMemo(
    () => getLoginHref(eventReturnTo),
    [eventReturnTo]
  );

  const peopleByUserId = useMemo(() => {
    return new Map(
      people.map((person) => [person.user_id, person])
    );
  }, [people]);

  const activeTribes = useMemo(() => {
    const now = Date.now();

    return tribes.filter((tribe) => {
      if (tribe.status !== "active") {
        return false;
      }

      if (!tribe.expires_at) {
        return true;
      }

      const expiration = new Date(tribe.expires_at).getTime();

      return (
        Number.isNaN(expiration) ||
        expiration > now
      );
    });
  }, [tribes]);

  const visibleTribes = useMemo(() => {
    return tribes
      .filter(
        (tribe) =>
          tribe.status === "active" ||
          tribe.status === "closed"
      )
      .filter(
        (tribe) =>
          categoryFilter === "all" ||
          tribe.category === categoryFilter
      )
      .sort((left, right) => {
        const leftActive = left.status === "active" ? 1 : 0;
        const rightActive = right.status === "active" ? 1 : 0;

        if (leftActive !== rightActive) {
          return rightActive - leftActive;
        }

        return (
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime()
        );
      });
  }, [categoryFilter, tribes]);

  const presentCategories = useMemo(() => {
    return CATEGORY_OPTIONS.filter((option) =>
      tribes.some(
        (tribe) =>
          tribe.category === option.value &&
          (tribe.status === "active" ||
            tribe.status === "closed")
      )
    );
  }, [tribes]);

  const loadData = useCallback(
    async (showLoading = true): Promise<boolean> => {
      if (!isAuthenticated) {
        setLoading(false);
        return false;
      }

      if (showLoading) {
        setLoading(true);
      }

      try {
        const response = await fetch(
          `/api/event-tribes?event_group_id=${encodeURIComponent(
            eventGroupId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "same-origin",
          }
        );

        const payload = await readPayload<ReadPayload>(response);

        setTribes(payload.tribes ?? []);
        setMembers(payload.members ?? []);
        setRequests(payload.requests ?? []);
        setPeople(payload.people ?? []);
        setViewerUserId(normalizeText(payload.viewer_user_id));
        return true;
      } catch (error) {
        setFeedback({
          tone: "error",
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as tribos.",
        });
        return false;
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [eventGroupId, isAuthenticated]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!highlightedTribeId) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const card = cardRefs.current.get(highlightedTribeId);

      card?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
      card?.focus({ preventScroll: true });
    }, 120);

    const clearHighlight = window.setTimeout(() => {
      setHighlightedTribeId("");
    }, 2600);

    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(clearHighlight);
    };
  }, [highlightedTribeId, tribes]);

  async function postMutation(
    body: Record<string, unknown>
  ): Promise<MutationPayload> {
    const response = await fetch("/api/event-tribes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });

    return readPayload<MutationPayload>(response);
  }

  async function runMutation(
    key: string,
    body: Record<string, unknown>,
    successMessage: string
  ): Promise<MutationPayload | null> {
    if (busyKey) {
      return null;
    }

    setBusyKey(key);
    setFeedback(null);

    try {
      const payload = await postMutation(body);
      const refreshed = await loadData(false);

      if (refreshed) {
        setFeedback({
          tone: "success",
          message: successMessage,
        });
      }

      return payload;
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível concluir esta ação.",
      });
      return null;
    } finally {
      setBusyKey("");
    }
  }

  async function handleCreateTribe(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedName = normalizeText(name);
    const parsedMaxMembers = Number(maxMembers);

    if (
      normalizedName.length < 3 ||
      normalizedName.length > 80
    ) {
      setFeedback({
        tone: "error",
        message:
          "O nome da tribo deve ter entre 3 e 80 caracteres.",
      });
      return;
    }

    if (
      !Number.isInteger(parsedMaxMembers) ||
      parsedMaxMembers < 2 ||
      parsedMaxMembers > 250
    ) {
      setFeedback({
        tone: "error",
        message:
          "A capacidade deve ficar entre 2 e 250 participantes.",
      });
      return;
    }

    let normalizedExpiresAt: string | null;

    try {
      normalizedExpiresAt = toNullableIso(expiresAt);
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Data de encerramento inválida.",
      });
      return;
    }

    const payload = await runMutation(
      "create-tribe",
      {
        action: "create",
        event_group_id: eventGroupId,
        name: normalizedName,
        description: normalizeText(description) || null,
        category,
        visibility,
        max_members: parsedMaxMembers,
        rules: normalizeText(rules) || null,
        expires_at: normalizedExpiresAt,
      },
      "Tribo criada e vinculada a este evento."
    );

    if (!payload) {
      return;
    }

    setName("");
    setDescription("");
    setCategory("custom");
    setVisibility("public");
    setMaxMembers("30");
    setRules("");
    setExpiresAt("");
    setComposerOpen(false);

    if (payload.tribe_id) {
      setHighlightedTribeId(payload.tribe_id);
    }
  }

  async function saveTribeEdits(
    tribeId: string,
    payload: TribeEditPayload
  ): Promise<TribeEditSaveResult> {
    const mutationKey = `update-tribe-${tribeId}`;

    if (editMutationLocksRef.current.has(tribeId)) {
      return {
        ok: false,
        message:
          "Já existe um salvamento em andamento. Aguarde e tente novamente.",
      };
    }

    editMutationLocksRef.current.add(tribeId);
    setBusyKey(mutationKey);

    try {
      await postMutation({
        action: "update",
        tribe_id: tribeId,
        ...payload,
      });

      await loadData(false);
      return {
        ok: true,
        message: "Alterações salvas.",
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar as alterações.",
      };
    } finally {
      editMutationLocksRef.current.delete(tribeId);
      setBusyKey("");
    }
  }

  function getPerson(userId: string): PersonRow {
    return (
      peopleByUserId.get(userId) ?? {
        user_id: userId,
        label: "Clubber",
        slug: null,
        photo_url: null,
        city_base: null,
      }
    );
  }

  return (
    <section
      id="event-temporary-tribes"
      className="event-tribe-hub"
      aria-labelledby="event-tribe-hub-title"
    >
      <style>{`
        .event-tribe-hub {
          width: min(1120px, calc(100vw - 48px));
          min-width: 0;
          margin: 22px 0 0 50%;
          transform: translateX(-50%);
          padding: 24px;
          border-top: 1px solid rgba(20,184,166,0.34);
          border-bottom: 1px solid rgba(255,255,255,0.10);
          background:
            radial-gradient(circle at top left, rgba(20,184,166,0.10), transparent 32%),
            rgba(8,12,19,0.76);
          box-sizing: border-box;
        }

        .event-tribe-hub__header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(255,255,255,0.09);
        }

        .event-tribe-hub__heading {
          min-width: 0;
          display: grid;
          gap: 5px;
        }

        .event-tribe-hub__eyebrow {
          color: #14B8A6;
          font-size: 10px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .event-tribe-hub__title {
          margin: 0;
          color: #fff;
          font-size: 26px;
          line-height: 1.08;
          font-weight: 950;
          letter-spacing: -0.035em;
        }

        .event-tribe-hub__subtitle {
          max-width: 760px;
          margin: 0;
          color: rgba(255,255,255,0.66);
          font-size: 13px;
          line-height: 1.55;
        }

        .event-tribe-hub__refresh {
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

        .event-tribe-hub__refresh:disabled {
          cursor: wait;
          opacity: 0.55;
        }

        .event-tribe-hub__login {
          display: grid;
          gap: 12px;
          padding: 22px 0 2px;
        }

        .event-tribe-hub__login strong {
          color: #fff;
          font-size: 16px;
          line-height: 1.3;
        }

        .event-tribe-hub__login p {
          max-width: 720px;
          margin: 0;
          color: rgba(255,255,255,0.66);
          font-size: 13px;
          line-height: 1.55;
        }

        .event-tribe-hub__login-action {
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

        .event-tribe-hub__feedback {
          margin: 16px 0 0;
          padding: 11px 0;
          border-bottom: 1px solid rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.80);
          font-size: 12px;
          line-height: 1.5;
        }

        .event-tribe-hub__feedback[data-tone="success"] {
          color: #5EEAD4;
        }

        .event-tribe-hub__feedback[data-tone="error"] {
          color: #FCA5A5;
        }

        .event-tribe-hub__toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(210px, 300px);
          align-items: end;
          gap: 22px;
          padding: 18px 0;
          border-bottom: 1px solid rgba(255,255,255,0.09);
        }

        .event-tribe-hub__summary {
          display: grid;
          gap: 3px;
        }

        .event-tribe-hub__summary strong {
          color: #fff;
          font-size: 15px;
        }

        .event-tribe-hub__summary span {
          color: rgba(255,255,255,0.60);
          font-size: 11px;
          line-height: 1.45;
        }

        .event-tribe-hub__filter {
          min-width: 0;
          display: grid;
          gap: 6px;
        }

        .event-tribe-hub__filter label {
          color: rgba(255,255,255,0.56);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .event-tribe-hub__filter select {
          width: 100%;
          min-width: 0;
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

        .event-tribe-hub__filter select option {
          background: #0B111A;
          color: #fff;
        }

        .event-tribe-hub__composer {
          border-bottom: 1px solid rgba(255,255,255,0.09);
        }

        .event-tribe-hub__composer summary {
          min-height: 50px;
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

        .event-tribe-hub__composer summary::-webkit-details-marker {
          display: none;
        }

        .event-tribe-hub__composer summary::after {
          content: "+";
          color: #5EEAD4;
          font-size: 20px;
          font-weight: 600;
        }

        .event-tribe-hub__composer[open] summary::after {
          content: "−";
        }

        .event-tribe-hub__form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 18px;
          padding: 2px 0 20px;
        }

        .event-tribe-hub__field {
          min-width: 0;
          display: grid;
          gap: 6px;
        }

        .event-tribe-hub__field--wide {
          grid-column: 1 / -1;
        }

        .event-tribe-hub__field label {
          color: rgba(255,255,255,0.62);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .event-tribe-hub__field input,
        .event-tribe-hub__field select,
        .event-tribe-hub__field textarea {
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

        .event-tribe-hub__field textarea {
          min-height: 76px;
          resize: vertical;
        }

        .event-tribe-hub__field input:focus,
        .event-tribe-hub__field select:focus,
        .event-tribe-hub__field textarea:focus {
          border-bottom-color: #14B8A6;
        }

        .event-tribe-hub__field select option {
          background: #0B111A;
          color: #fff;
        }

        .event-tribe-hub__hint {
          margin: 0;
          color: rgba(255,255,255,0.54);
          font-size: 10px;
          line-height: 1.45;
        }

        .event-tribe-hub__submit {
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

        .event-tribe-hub__submit:disabled {
          cursor: wait;
          opacity: 0.55;
        }

        .event-tribe-hub__list {
          min-width: 0;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0 24px;
          padding-top: 2px;
        }

        .event-tribe-hub__empty {
          grid-column: 1 / -1;
          margin: 0;
          padding: 22px 0;
          color: rgba(255,255,255,0.58);
          font-size: 12px;
          line-height: 1.55;
        }

        .event-tribe-hub__card {
          min-width: 0;
          display: grid;
          align-content: start;
          gap: 14px;
          padding: 20px 0;
          border-bottom: 1px solid rgba(255,255,255,0.09);
          outline: 0 solid transparent;
          outline-offset: -1px;
          transition:
            outline-color 180ms ease,
            background-color 180ms ease;
        }

        .event-tribe-hub__card:focus {
          outline: none;
        }

        .event-tribe-hub__card[data-highlighted="true"] {
          outline: 2px solid rgba(94,234,212,0.86);
          background: rgba(20,184,166,0.08);
        }

        .event-tribe-hub__card-header {
          min-width: 0;
          display: grid;
          gap: 7px;
        }

        .event-tribe-hub__kicker {
          color: #5EEAD4;
          font-size: 10px;
          line-height: 1.35;
          font-weight: 950;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .event-tribe-hub__card-title {
          margin: 0;
          color: #fff;
          font-size: 19px;
          line-height: 1.18;
          font-weight: 950;
          letter-spacing: -0.025em;
          overflow-wrap: anywhere;
        }

        .event-tribe-hub__description {
          margin: 0;
          color: rgba(255,255,255,0.72);
          font-size: 12px;
          line-height: 1.55;
          overflow-wrap: anywhere;
        }

        .event-tribe-hub__meta {
          display: grid;
          gap: 5px;
          color: rgba(255,255,255,0.62);
          font-size: 11px;
          line-height: 1.45;
        }

        .event-tribe-hub__creator {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 0;
          border-top: 1px solid rgba(255,255,255,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .event-tribe-hub__avatar {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 50%;
          border: 1px solid rgba(20,184,166,0.38);
          background: rgba(20,184,166,0.10);
          color: #fff;
          font-size: 12px;
          font-weight: 950;
        }

        .event-tribe-hub__avatar img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .event-tribe-hub__creator-copy {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .event-tribe-hub__creator-copy strong,
        .event-tribe-hub__creator-copy a {
          min-width: 0;
          color: #fff;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 900;
          text-decoration: none;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .event-tribe-hub__creator-copy span {
          color: rgba(255,255,255,0.54);
          font-size: 10px;
          line-height: 1.35;
        }

        .event-tribe-hub__actions {
          display: grid;
          gap: 8px;
        }

        .event-tribe-hub__owner-actions,
        .event-tribe-hub__request-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .event-tribe-hub__edit-composer {
          border-top: 1px solid rgba(255,255,255,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .event-tribe-hub__edit-composer summary {
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #fff;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          list-style: none;
        }

        .event-tribe-hub__edit-composer summary::-webkit-details-marker {
          display: none;
        }

        .event-tribe-hub__edit-composer summary::after {
          content: "+";
          color: #5EEAD4;
          font-size: 18px;
          font-weight: 600;
        }

        .event-tribe-hub__edit-composer[open] summary::after {
          content: "−";
        }

        .event-tribe-hub__edit-form {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 12px;
          padding: 2px 0 14px;
        }

        .event-tribe-hub__field[data-invalid="true"] label {
          color: #FCA5A5;
        }

        .event-tribe-hub__field[data-invalid="true"] input,
        .event-tribe-hub__field[data-invalid="true"] select,
        .event-tribe-hub__field[data-invalid="true"] textarea {
          border-bottom-color: rgba(248,113,113,0.72);
        }

        .event-tribe-hub__field-error {
          color: #FCA5A5;
          font-size: 10px;
          line-height: 1.45;
        }

        .event-tribe-hub__edit-savebar {
          position: sticky;
          top: 0;
          z-index: 4;
          display: grid;
          gap: 9px;
          padding: 2px 0 12px;
          border-bottom: 1px solid rgba(255,255,255,0.10);
          background:
            linear-gradient(
              180deg,
              #080C13 68%,
              rgba(8,12,19,0.78)
            );
        }

        .event-tribe-hub__edit-status {
          min-height: 18px;
          margin: 0;
          color: rgba(255,255,255,0.64);
          font-size: 10px;
          line-height: 1.45;
        }

        .event-tribe-hub__edit-savebar[data-status="saved"]
          .event-tribe-hub__edit-status {
          color: #5EEAD4;
        }

        .event-tribe-hub__edit-savebar[data-status="invalid"]
          .event-tribe-hub__edit-status,
        .event-tribe-hub__edit-savebar[data-status="error"]
          .event-tribe-hub__edit-status {
          color: #FCA5A5;
        }

        .event-tribe-hub__edit-save-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .event-tribe-hub__edit-save-actions
          > .event-tribe-hub__edit-submit:only-child {
          grid-column: 1 / -1;
        }

        .event-tribe-hub__edit-submit,
        .event-tribe-hub__edit-retry {
          min-height: 42px;
          border: 1px solid rgba(20,184,166,0.54);
          background: #0D9488;
          color: #fff;
          font: inherit;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .event-tribe-hub__edit-retry {
          border-color: rgba(248,113,113,0.40);
          background: transparent;
          color: #FCA5A5;
        }

        .event-tribe-hub__edit-submit:disabled,
        .event-tribe-hub__edit-retry:disabled {
          cursor: wait;
          opacity: 0.55;
        }

        .event-tribe-hub__action {
          min-height: 40px;
          border: 1px solid rgba(20,184,166,0.42);
          background: rgba(20,184,166,0.10);
          color: #fff;
          font: inherit;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .event-tribe-hub__action--secondary {
          border-color: rgba(255,255,255,0.17);
          background: transparent;
          color: rgba(255,255,255,0.76);
        }

        .event-tribe-hub__action--danger {
          border-color: rgba(248,113,113,0.34);
          background: transparent;
          color: #FCA5A5;
        }

        .event-tribe-hub__action:disabled {
          cursor: not-allowed;
          opacity: 0.48;
        }

        .event-tribe-hub__request-composer {
          border-top: 1px solid rgba(255,255,255,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .event-tribe-hub__request-composer summary {
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #fff;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          list-style: none;
        }

        .event-tribe-hub__request-composer summary::-webkit-details-marker {
          display: none;
        }

        .event-tribe-hub__request-form {
          display: grid;
          gap: 10px;
          padding: 0 0 12px;
        }

        .event-tribe-hub__request-form textarea {
          width: 100%;
          min-height: 62px;
          box-sizing: border-box;
          resize: vertical;
          border: 0;
          border-bottom: 1px solid rgba(255,255,255,0.18);
          border-radius: 0;
          background: transparent;
          color: #fff;
          font: inherit;
          font-size: 12px;
          line-height: 1.45;
          outline: none;
          padding: 8px 0;
        }

        .event-tribe-hub__request-list {
          display: grid;
          gap: 10px;
          padding-top: 2px;
        }

        .event-tribe-hub__request {
          display: grid;
          gap: 9px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .event-tribe-hub__request-person {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .event-tribe-hub__request-copy {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .event-tribe-hub__request-copy strong,
        .event-tribe-hub__request-copy a {
          color: #fff;
          font-size: 11px;
          line-height: 1.35;
          font-weight: 900;
          text-decoration: none;
        }

        .event-tribe-hub__request-copy span {
          color: rgba(255,255,255,0.58);
          font-size: 10px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .event-tribe-hub__status {
          color: rgba(255,255,255,0.60);
          font-size: 11px;
          line-height: 1.45;
        }

        @media (max-width: 760px) {
          .event-tribe-hub {
            width: 100%;
            max-width: 100%;
            margin: 16px 0 0;
            transform: none;
            padding: 18px 14px;
          }

          .event-tribe-hub__header {
            display: grid;
            align-items: start;
            gap: 12px;
          }

          .event-tribe-hub__title {
            font-size: 22px;
          }

          .event-tribe-hub__refresh {
            width: fit-content;
          }

          .event-tribe-hub__toolbar {
            grid-template-columns: minmax(0, 1fr);
            gap: 14px;
          }

          .event-tribe-hub__form {
            grid-template-columns: minmax(0, 1fr);
          }

          .event-tribe-hub__field--wide,
          .event-tribe-hub__submit {
            grid-column: 1;
          }

          .event-tribe-hub__list {
            display: flex;
            gap: 12px;
            margin-inline: -14px;
            padding: 14px 14px 16px;
            overflow-x: auto;
            overscroll-behavior-inline: contain;
            scroll-padding-inline: 14px;
            scroll-snap-type: inline mandatory;
            scrollbar-width: thin;
          }

          .event-tribe-hub__card {
            flex: 0 0 min(88%, 430px);
            scroll-snap-align: start;
            scroll-snap-stop: always;
            padding: 18px;
            border: 1px solid rgba(255,255,255,0.10);
            background: rgba(4,8,14,0.66);
          }

          .event-tribe-hub__empty {
            flex: 1 0 100%;
            padding: 18px 0;
          }
        }
      `}</style>

      <header className="event-tribe-hub__header">
        <div className="event-tribe-hub__heading">
          <span className="event-tribe-hub__eyebrow">
            Afinidade com propósito
          </span>
          <h2
            id="event-tribe-hub-title"
            className="event-tribe-hub__title"
          >
            Tribos temporárias do evento
          </h2>
          <p className="event-tribe-hub__subtitle">
            Crie ou participe de uma organização por vertente,
            artista, palco, cidade, experiência, perfil social,
            hospedagem ou comunidade. Cada tribo existe apenas neste
            evento.
          </p>
        </div>

        {isAuthenticated ? (
          <button
            type="button"
            className="event-tribe-hub__refresh"
            disabled={loading || Boolean(busyKey)}
            onClick={() => void loadData()}
          >
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        ) : null}
      </header>

      {!isAuthenticated ? (
        <div className="event-tribe-hub__login">
          <strong>Entre para visualizar e participar.</strong>
          <p>
            As tribos temporárias são exibidas apenas para Clubbers
            autenticados. A entrada depende da aprovação do gestor da
            tribo.
          </p>
          <Link
            href={loginHref}
            className="event-tribe-hub__login-action"
          >
            Entrar no USECLUBBERS
          </Link>
        </div>
      ) : (
        <>
          {feedback ? (
            <p
              className="event-tribe-hub__feedback"
              data-tone={feedback.tone}
              role={feedback.tone === "error" ? "alert" : "status"}
            >
              {feedback.message}
            </p>
          ) : null}

          <div className="event-tribe-hub__toolbar">
            <div className="event-tribe-hub__summary">
              <strong>
                {activeTribes.length === 1
                  ? "1 tribo ativa"
                  : `${activeTribes.length} tribos ativas`}
              </strong>
              <span>
                Afinidades do radar não criam uma tribo automaticamente.
                Aqui estão os grupos organizados por Clubbers.
              </span>
            </div>

            <div className="event-tribe-hub__filter">
              <label htmlFor="event-tribe-category-filter">
                Filtrar por tema
              </label>
              <select
                id="event-tribe-category-filter"
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value as
                      | "all"
                      | TribeCategory
                  )
                }
              >
                <option value="all">Todos os temas</option>
                {presentCategories.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <details
            className="event-tribe-hub__composer"
            open={composerOpen}
            onToggle={(event) =>
              setComposerOpen(event.currentTarget.open)
            }
          >
            <summary>
              {tribes.some(
                (tribe) =>
                  tribe.creator_user_id === viewerUserId &&
                  tribe.status === "active"
              )
                ? "Criar outra tribo"
                : "Criar uma tribo"}
            </summary>

            <form
              className="event-tribe-hub__form"
              onSubmit={handleCreateTribe}
            >
              <div className="event-tribe-hub__field">
                <label htmlFor="event-tribe-name">
                  Nome da tribo
                </label>
                <input
                  id="event-tribe-name"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  minLength={3}
                  maxLength={80}
                  placeholder="Ex.: Progressive no Mainstage"
                  required
                />
              </div>

              <div className="event-tribe-hub__field">
                <label htmlFor="event-tribe-category">
                  Tema
                </label>
                <select
                  id="event-tribe-category"
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value as TribeCategory
                    )
                  }
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="event-tribe-hub__field event-tribe-hub__field--wide">
                <label htmlFor="event-tribe-description">
                  Descrição
                </label>
                <textarea
                  id="event-tribe-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  maxLength={360}
                  placeholder="Explique quem a tribo pretende reunir e qual é o objetivo."
                />
              </div>

              <div className="event-tribe-hub__field">
                <label htmlFor="event-tribe-visibility">
                  Visibilidade
                </label>
                <select
                  id="event-tribe-visibility"
                  value={visibility}
                  onChange={(event) =>
                    setVisibility(
                      event.target
                        .value as TribeRow["visibility"]
                    )
                  }
                >
                  <option value="public">
                    Pública no evento
                  </option>
                  <option value="private">
                    Privada para membros
                  </option>
                </select>
                <p className="event-tribe-hub__hint">
                  Tribos públicas podem receber solicitações. Tribos
                  privadas ficam visíveis somente para membros e
                  gestores.
                </p>
              </div>

              <div className="event-tribe-hub__field">
                <label htmlFor="event-tribe-capacity">
                  Limite de participantes
                </label>
                <input
                  id="event-tribe-capacity"
                  type="number"
                  value={maxMembers}
                  onChange={(event) =>
                    setMaxMembers(event.target.value)
                  }
                  min={2}
                  max={250}
                  step={1}
                  inputMode="numeric"
                  required
                />
              </div>

              <div className="event-tribe-hub__field">
                <label htmlFor="event-tribe-expires-at">
                  Encerramento automático
                </label>
                <input
                  id="event-tribe-expires-at"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) =>
                    setExpiresAt(event.target.value)
                  }
                />
                <p className="event-tribe-hub__hint">
                  Opcional. Use uma data posterior ao momento atual.
                </p>
              </div>

              <div className="event-tribe-hub__field">
                <label htmlFor="event-tribe-rules">
                  Regras
                </label>
                <textarea
                  id="event-tribe-rules"
                  value={rules}
                  onChange={(event) =>
                    setRules(event.target.value)
                  }
                  maxLength={2000}
                  placeholder="Ex.: respeito, horário combinado e entrada somente após aprovação."
                />
              </div>

              <button
                type="submit"
                className="event-tribe-hub__submit"
                disabled={Boolean(busyKey)}
              >
                {busyKey === "create-tribe"
                  ? "Criando..."
                  : "Criar tribo neste evento"}
              </button>
            </form>
          </details>

          <div
            className="event-tribe-hub__list"
            aria-live="polite"
          >
            {loading && tribes.length === 0 ? (
              <p className="event-tribe-hub__empty">
                Carregando tribos temporárias...
              </p>
            ) : visibleTribes.length === 0 ? (
              <p className="event-tribe-hub__empty">
                {categoryFilter === "all"
                  ? "Ainda não há tribos organizadas para este evento."
                  : "Nenhuma tribo encontrada neste tema."}
              </p>
            ) : (
              visibleTribes.map((tribe) => {
                const tribeMembers = members.filter(
                  (member) => member.tribe_id === tribe.tribe_id
                );
                const approvedMembers = tribeMembers.filter(
                  (member) => member.status === "approved"
                );
                const viewerMembership = tribeMembers.find(
                  (member) =>
                    member.user_id === viewerUserId &&
                    member.status === "approved"
                );
                const viewerPendingRequest = requests.find(
                  (joinRequest) =>
                    joinRequest.tribe_id === tribe.tribe_id &&
                    joinRequest.requester_user_id === viewerUserId &&
                    joinRequest.status === "pending"
                );
                const isManager = Boolean(
                  viewerMembership &&
                    [
                      "creator",
                      "organizer",
                      "moderator",
                    ].includes(viewerMembership.role)
                );
                const canControlLifecycle = Boolean(
                  viewerMembership &&
                    ["creator", "organizer"].includes(
                      viewerMembership.role
                    )
                );
                const canCancel =
                  viewerMembership?.role === "creator";
                const exactApprovedCount = isManager
                  ? approvedMembers.length
                  : null;
                const capacityReached =
                  exactApprovedCount !== null &&
                  exactApprovedCount >= tribe.max_members;
                const pendingRequests = isManager
                  ? requests.filter(
                      (joinRequest) =>
                        joinRequest.tribe_id === tribe.tribe_id &&
                        joinRequest.status === "pending"
                    )
                  : [];
                const creator = getPerson(
                  tribe.creator_user_id
                );
                const expiresLabel = formatDateTime(
                  tribe.expires_at
                );
                const active = tribe.status === "active";
                const requestMessage =
                  requestMessages[tribe.tribe_id] ?? "";

                return (
                  <article
                    id={`event-tribe-${tribe.tribe_id}`}
                    key={tribe.tribe_id}
                    ref={(node) => {
                      if (node) {
                        cardRefs.current.set(
                          tribe.tribe_id,
                          node
                        );
                      } else {
                        cardRefs.current.delete(
                          tribe.tribe_id
                        );
                      }
                    }}
                    tabIndex={-1}
                    className="event-tribe-hub__card"
                    data-highlighted={
                      highlightedTribeId === tribe.tribe_id
                        ? "true"
                        : "false"
                    }
                  >
                    <div className="event-tribe-hub__card-header">
                      <span className="event-tribe-hub__kicker">
                        {getCategoryLabel(tribe.category)}
                        {" · "}
                        {getVisibilityLabel(tribe.visibility)}
                        {active
                          ? ""
                          : ` · ${getStatusLabel(tribe.status)}`}
                      </span>
                      <h3 className="event-tribe-hub__card-title">
                        {tribe.name}
                      </h3>
                      {tribe.description ? (
                        <p className="event-tribe-hub__description">
                          {tribe.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="event-tribe-hub__meta">
                      <span>
                        {exactApprovedCount !== null
                          ? `${exactApprovedCount} de ${tribe.max_members} participantes confirmados`
                          : `Até ${tribe.max_members} participantes`}
                      </span>
                      <span>
                        Entrada mediante aprovação do gestor
                      </span>
                      {expiresLabel ? (
                        <span>
                          Disponível até {expiresLabel}
                        </span>
                      ) : null}
                      {tribe.rules ? (
                        <span>Regras: {tribe.rules}</span>
                      ) : null}
                    </div>

                    <div className="event-tribe-hub__creator">
                      <span
                        className="event-tribe-hub__avatar"
                        aria-hidden="true"
                      >
                        {creator.photo_url ? (
                          <img
                            src={creator.photo_url}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          creator.label.slice(0, 1).toUpperCase()
                        )}
                      </span>
                      <div className="event-tribe-hub__creator-copy">
                        {creator.slug ? (
                          <Link
                            href={`/${creator.slug}?mode=club`}
                          >
                            {creator.label}
                          </Link>
                        ) : (
                          <strong>{creator.label}</strong>
                        )}
                        <span>
                          Criador da tribo
                          {creator.city_base
                            ? ` · ${creator.city_base}`
                            : ""}
                        </span>
                      </div>
                    </div>

                    <div className="event-tribe-hub__actions">
                      {canControlLifecycle ? (
                        <details className="event-tribe-hub__edit-composer">
                          <summary>Editar tribo</summary>

                          <TribeEditForm
                            tribe={tribe}
                            disabled={Boolean(busyKey)}
                            onSave={saveTribeEdits}
                          />
                        </details>
                      ) : null}

                      {canControlLifecycle ? (
                        <div className="event-tribe-hub__owner-actions">
                          <button
                            type="button"
                            className="event-tribe-hub__action event-tribe-hub__action--secondary"
                            disabled={Boolean(busyKey)}
                            onClick={() => {
                              if (
                                active &&
                                !window.confirm(
                                  "Encerrar esta tribo? Novas solicitações deixarão de ser aceitas."
                                )
                              ) {
                                return;
                              }

                              void runMutation(
                                `${
                                  active ? "close" : "reopen"
                                }-tribe-${tribe.tribe_id}`,
                                {
                                  action: "set_status",
                                  tribe_id: tribe.tribe_id,
                                  status: active
                                    ? "closed"
                                    : "active",
                                },
                                active
                                  ? "Tribo encerrada."
                                  : "Tribo reaberta."
                              );
                            }}
                          >
                            {busyKey ===
                            `${
                              active ? "close" : "reopen"
                            }-tribe-${tribe.tribe_id}`
                              ? "Salvando..."
                              : active
                                ? "Encerrar"
                                : "Reabrir"}
                          </button>

                          {canCancel ? (
                            <button
                              type="button"
                              className="event-tribe-hub__action event-tribe-hub__action--danger"
                              disabled={Boolean(busyKey)}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    "Cancelar esta tribo? Ela deixará de aparecer e solicitações pendentes serão encerradas."
                                  )
                                ) {
                                  return;
                                }

                                void runMutation(
                                  `cancel-tribe-${tribe.tribe_id}`,
                                  {
                                    action: "set_status",
                                    tribe_id: tribe.tribe_id,
                                    status: "cancelled",
                                  },
                                  "Tribo cancelada."
                                );
                              }}
                            >
                              Cancelar
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      {viewerMembership &&
                      viewerMembership.role !== "creator" ? (
                        <button
                          type="button"
                          className="event-tribe-hub__action event-tribe-hub__action--secondary"
                          disabled={Boolean(busyKey)}
                          onClick={() => {
                            if (
                              !window.confirm(
                                "Sair desta tribo?"
                              )
                            ) {
                              return;
                            }

                            void runMutation(
                              `leave-tribe-${tribe.tribe_id}`,
                              {
                                action: "leave",
                                tribe_id: tribe.tribe_id,
                              },
                              "Você saiu da tribo."
                            );
                          }}
                        >
                          Sair da tribo
                        </button>
                      ) : null}

                      {viewerPendingRequest ? (
                        <button
                          type="button"
                          className="event-tribe-hub__action event-tribe-hub__action--secondary"
                          disabled={Boolean(busyKey)}
                          onClick={() =>
                            void runMutation(
                              `cancel-request-${viewerPendingRequest.request_id}`,
                              {
                                action: "cancel_request",
                                request_id:
                                  viewerPendingRequest.request_id,
                              },
                              "Solicitação cancelada."
                            )
                          }
                        >
                          Cancelar solicitação
                        </button>
                      ) : null}

                      {!viewerMembership &&
                      !viewerPendingRequest &&
                      active ? (
                        <details className="event-tribe-hub__request-composer">
                          <summary>
                            {capacityReached
                              ? "Tribo lotada"
                              : "Solicitar entrada"}
                          </summary>
                          <div className="event-tribe-hub__request-form">
                            <textarea
                              value={requestMessage}
                              onChange={(event) =>
                                setRequestMessages(
                                  (current) => ({
                                    ...current,
                                    [tribe.tribe_id]:
                                      event.target.value,
                                  })
                                )
                              }
                              maxLength={500}
                              placeholder="Mensagem opcional para o gestor da tribo."
                              disabled={capacityReached}
                            />
                            <button
                              type="button"
                              className="event-tribe-hub__action"
                              disabled={
                                Boolean(busyKey) ||
                                capacityReached
                              }
                              onClick={() =>
                                void runMutation(
                                  `request-join-${tribe.tribe_id}`,
                                  {
                                    action: "request_join",
                                    tribe_id: tribe.tribe_id,
                                    message:
                                      normalizeText(
                                        requestMessage
                                      ) || null,
                                  },
                                  "Solicitação enviada ao gestor da tribo."
                                )
                              }
                            >
                              {busyKey ===
                              `request-join-${tribe.tribe_id}`
                                ? "Enviando..."
                                : "Enviar solicitação"}
                            </button>
                          </div>
                        </details>
                      ) : null}

                      {viewerMembership ? (
                        <span className="event-tribe-hub__status">
                          Sua participação:{" "}
                          {getRoleLabel(viewerMembership.role)}
                        </span>
                      ) : viewerPendingRequest ? (
                        <span className="event-tribe-hub__status">
                          Solicitação aguardando decisão do gestor.
                        </span>
                      ) : !active ? (
                        <span className="event-tribe-hub__status">
                          Esta tribo não aceita novas solicitações.
                        </span>
                      ) : null}
                    </div>

                    {isManager &&
                    pendingRequests.length > 0 ? (
                      <div className="event-tribe-hub__request-list">
                        <span className="event-tribe-hub__status">
                          Solicitações pendentes:{" "}
                          {pendingRequests.length}
                        </span>

                        {pendingRequests.map((joinRequest) => {
                          const requester = getPerson(
                            joinRequest.requester_user_id
                          );

                          return (
                            <div
                              key={joinRequest.request_id}
                              className="event-tribe-hub__request"
                            >
                              <div className="event-tribe-hub__request-person">
                                <span
                                  className="event-tribe-hub__avatar"
                                  aria-hidden="true"
                                >
                                  {requester.photo_url ? (
                                    <img
                                      src={requester.photo_url}
                                      alt=""
                                      loading="lazy"
                                    />
                                  ) : (
                                    requester.label
                                      .slice(0, 1)
                                      .toUpperCase()
                                  )}
                                </span>

                                <div className="event-tribe-hub__request-copy">
                                  {requester.slug ? (
                                    <Link
                                      href={`/${requester.slug}?mode=club`}
                                    >
                                      {requester.label}
                                    </Link>
                                  ) : (
                                    <strong>
                                      {requester.label}
                                    </strong>
                                  )}
                                  <span>
                                    {joinRequest.message ||
                                      "Solicitação sem mensagem."}
                                    {requester.city_base
                                      ? ` · ${requester.city_base}`
                                      : ""}
                                  </span>
                                </div>
                              </div>

                              <div className="event-tribe-hub__request-actions">
                                <button
                                  type="button"
                                  className="event-tribe-hub__action"
                                  disabled={
                                    Boolean(busyKey) ||
                                    capacityReached
                                  }
                                  onClick={() =>
                                    void runMutation(
                                      `approve-request-${joinRequest.request_id}`,
                                      {
                                        action:
                                          "decide_request",
                                        request_id:
                                          joinRequest.request_id,
                                        decision: "approved",
                                      },
                                      "Participação aprovada."
                                    )
                                  }
                                >
                                  {capacityReached
                                    ? "Lotação"
                                    : "Aprovar"}
                                </button>
                                <button
                                  type="button"
                                  className="event-tribe-hub__action event-tribe-hub__action--danger"
                                  disabled={Boolean(busyKey)}
                                  onClick={() =>
                                    void runMutation(
                                      `reject-request-${joinRequest.request_id}`,
                                      {
                                        action:
                                          "decide_request",
                                        request_id:
                                          joinRequest.request_id,
                                        decision: "rejected",
                                      },
                                      "Solicitação recusada."
                                    )
                                  }
                                >
                                  Recusar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </>
      )}
    </section>
  );
}
