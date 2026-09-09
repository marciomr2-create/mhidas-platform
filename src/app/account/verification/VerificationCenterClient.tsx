// src/app/account/verification/VerificationCenterClient.tsx

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import VerificationDocumentUploader from "./VerificationDocumentUploader";

type EntityType = "artist" | "club" | "festival" | "organization";
type RequestKind = "create" | "claim";

type VerificationRequestView = {
  request_id: string;
  request_kind: string;
  requested_entity_type: string;
  requested_organization_type: string | null;
  requested_display_name: string;
  requested_handle: string | null;
  contact_email: string;
  email_signal_status: string;
  status: string;
  submitted_at: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
};

type ClaimEntity = {
  entity_id: string;
  entity_type: EntityType;
  organization_type: string | null;
  display_name: string;
  public_handle: string;
  lifecycle_status: string;
  verification_status: string;
};

type Props = {
  accountEmail: string;
  initialEntityType: EntityType;
  initialRequests: VerificationRequestView[];
  loadError: boolean;
};

const ENTITY_LABELS: Record<EntityType, string> = {
  artist: "Artista / DJ / Projeto musical",
  club: "Club / Venue",
  festival: "Festival",
  organization: "Organização / Parceiro",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviado para análise",
  in_review: "Em revisão",
  more_info_required: "Precisamos de mais informações",
  approved: "Aprovado",
  rejected: "Não aprovado",
  withdrawn: "Retirado",
  suspended: "Suspenso",
  revoked: "Revogado",
};

const ACTIVE_STATUSES = new Set([
  "draft",
  "submitted",
  "in_review",
  "more_info_required",
]);

const ORGANIZATION_OPTIONS = [
  ["producer", "Produtora"],
  ["promoter", "Promoter"],
  ["agency", "Agência"],
  ["ticketing", "Ticketing"],
  ["brand", "Marca"],
  ["partner", "Parceiro"],
  ["other", "Outro"],
] as const;

function formatDate(value: string | null): string {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function entityTypeLabel(value: string): string {
  return (
    ENTITY_LABELS[value as EntityType] ||
    value ||
    "Identidade oficial"
  );
}

function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.has(status);
}

function statusTone(status: string): "progress" | "critical" | "neutral" {
  if (
    status === "more_info_required" ||
    status === "rejected" ||
    status === "suspended" ||
    status === "revoked"
  ) {
    return "critical";
  }

  if (
    status === "submitted" ||
    status === "in_review" ||
    status === "approved"
  ) {
    return "progress";
  }

  return "neutral";
}

function statusExplanation(status: string): string {
  switch (status) {
    case "draft":
      return "Esta solicitação ainda não foi enviada para análise.";
    case "submitted":
      return "Recebemos sua solicitação. Ela está aguardando o início da revisão.";
    case "in_review":
      return "Sua solicitação está sendo analisada pela equipe de verificação.";
    case "more_info_required":
      return "A análise precisa de uma informação adicional antes de continuar.";
    case "approved":
      return "A verificação foi concluída e esta solicitação foi aprovada.";
    case "rejected":
      return "A análise foi encerrada sem aprovação desta solicitação.";
    case "withdrawn":
      return "Esta solicitação foi retirada e permanece apenas no histórico.";
    case "suspended":
      return "Esta solicitação está suspensa e precisa de atenção.";
    case "revoked":
      return "Esta verificação foi revogada.";
    default:
      return "O estado desta solicitação está registrado nesta Central.";
  }
}

function nextStepTitle(status: string): string {
  switch (status) {
    case "draft":
      return "Revise os dados e envie quando estiver pronto.";
    case "submitted":
      return "Nenhuma ação é necessária agora.";
    case "in_review":
      return "Nenhuma ação é necessária agora.";
    case "more_info_required":
      return "Leia a orientação registrada abaixo.";
    case "approved":
      return "Processo concluído.";
    case "rejected":
      return "Leia o motivo da decisão.";
    case "withdrawn":
      return "Processo encerrado.";
    case "suspended":
    case "revoked":
      return "Consulte a atualização registrada nesta Central.";
    default:
      return "Acompanhe as atualizações por esta Central.";
  }
}

function nextStepCopy(status: string): string {
  switch (status) {
    case "draft":
      return "A análise só começa depois que você enviar a solicitação.";
    case "submitted":
      return "Quando a revisão começar, o status será atualizado aqui.";
    case "in_review":
      return "Se precisarmos de algo, a orientação aparecerá nesta Central.";
    case "more_info_required":
      return "Não envie documentos ou dados sensíveis por e-mail, Instagram ou outro canal informal.";
    case "approved":
      return "A identidade e o vínculo aprovados ficam registrados de forma consistente.";
    case "rejected":
      return "Se necessário, você poderá iniciar uma nova solicitação com informações melhores.";
    case "withdrawn":
      return "Você pode iniciar uma nova solicitação quando precisar.";
    default:
      return "Esta Central é a fonte oficial das próximas etapas.";
  }
}

export default function VerificationCenterClient({
  accountEmail,
  initialEntityType,
  initialRequests,
  loadError,
}: Props) {
  const router = useRouter();

  const initialHasActiveRequest = initialRequests.some((request) =>
    isActiveStatus(request.status)
  );

  const [showNewRequestForm, setShowNewRequestForm] = useState(
    !initialHasActiveRequest
  );

  const [requestKind, setRequestKind] = useState<RequestKind>("create");
  const [entityType, setEntityType] = useState<EntityType>(initialEntityType);
  const [organizationType, setOrganizationType] = useState("producer");
  const [displayName, setDisplayName] = useState("");
  const [requestedHandle, setRequestedHandle] = useState("");
  const [contactEmail, setContactEmail] = useState(accountEmail);
  const [professionalEmail, setProfessionalEmail] = useState("");
  const [officialWebsite, setOfficialWebsite] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [claimQuery, setClaimQuery] = useState("");
  const [claimResults, setClaimResults] = useState<ClaimEntity[]>([]);
  const [selectedClaimEntity, setSelectedClaimEntity] =
    useState<ClaimEntity | null>(null);
  const [searchingClaim, setSearchingClaim] = useState(false);

  const [busy, setBusy] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const entityLabel = useMemo(() => ENTITY_LABELS[entityType], [entityType]);

  const activeRequests = useMemo(
    () => initialRequests.filter((request) => isActiveStatus(request.status)),
    [initialRequests]
  );

  const historyRequests = useMemo(
    () => initialRequests.filter((request) => !isActiveStatus(request.status)),
    [initialRequests]
  );

  function changeRequestKind(nextKind: RequestKind) {
    setRequestKind(nextKind);
    setMessage(null);
    setError(null);

    if (nextKind === "create") {
      setSelectedClaimEntity(null);
      setClaimResults([]);
      setClaimQuery("");
    } else {
      setDisplayName("");
      setRequestedHandle("");
    }
  }

  async function callApi(payload: Record<string, unknown>) {
    const response = await fetch("/api/account/verification/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string }
      | null;

    if (!response.ok || !body?.ok) {
      throw new Error(
        body?.message || "Não foi possível concluir esta ação agora."
      );
    }
  }

  async function searchClaimEntities() {
    const query = claimQuery.trim();

    setMessage(null);
    setError(null);
    setSelectedClaimEntity(null);

    if (query.length < 2) {
      setClaimResults([]);
      setError(
        "Digite pelo menos 2 caracteres para buscar a identidade oficial."
      );
      return;
    }

    setSearchingClaim(true);

    try {
      const response = await fetch(
        `/api/account/verification/requests?action=search_claim_entities&q=${encodeURIComponent(
          query
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            entities?: ClaimEntity[];
          }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.message ||
            "Não foi possível buscar identidades oficiais agora."
        );
      }

      const entities = payload.entities ?? [];
      setClaimResults(entities);

      if (entities.length === 0) {
        setMessage(
          "Nenhuma identidade oficial encontrada. Revise o nome ou @ pesquisado."
        );
      }
    } catch (caught) {
      setClaimResults([]);
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível buscar identidades oficiais agora."
      );
    } finally {
      setSearchingClaim(false);
    }
  }

  async function createRequest(submit: boolean) {
    setBusy(true);
    setMessage(null);
    setError(null);

    if (requestKind === "claim" && !selectedClaimEntity) {
      setBusy(false);
      setError("Escolha a identidade oficial que deseja reivindicar.");
      return;
    }

    if (requestKind === "create" && !requestedHandle.trim()) {
      setBusy(false);
      setError("Informe o @ universal desejado para a nova identidade.");
      return;
    }

    try {
      await callApi({
        action: "create_request",
        submit,
        request_kind: requestKind,
        entity_id:
          requestKind === "claim" ? selectedClaimEntity?.entity_id : null,
        requested_entity_type: entityType,
        requested_organization_type:
          entityType === "organization" ? organizationType : null,
        requested_display_name: displayName,
        requested_handle: requestedHandle,
        contact_email: contactEmail,
        professional_email: professionalEmail,
        official_website: officialWebsite,
        instagram_url: instagramUrl,
        spotify_url: spotifyUrl,
        youtube_url: youtubeUrl,
      });

      setMessage(
        submit
          ? "Solicitação enviada. Agora você pode acompanhar o status por esta Central."
          : "Rascunho salvo. Envie para análise quando estiver pronto."
      );

      setDisplayName("");
      setRequestedHandle("");
      setProfessionalEmail("");
      setOfficialWebsite("");
      setInstagramUrl("");
      setSpotifyUrl("");
      setYoutubeUrl("");
      setClaimQuery("");
      setClaimResults([]);
      setSelectedClaimEntity(null);
      setShowNewRequestForm(false);

      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível concluir esta ação agora."
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateRequest(
    requestId: string,
    action: "submit_request" | "withdraw_request"
  ) {
    setBusyRequestId(requestId);
    setMessage(null);
    setError(null);

    try {
      await callApi({ action, request_id: requestId });

      setMessage(
        action === "submit_request"
          ? "Solicitação enviada para análise."
          : "Solicitação retirada. O histórico permanece registrado."
      );

      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível concluir esta ação agora."
      );
    } finally {
      setBusyRequestId(null);
    }
  }

  function renderCurrentRequest(request: VerificationRequestView) {
    const requestBusy = busyRequestId === request.request_id;
    const canSubmit = request.status === "draft";
    const canWithdraw = [
      "draft",
      "submitted",
      "in_review",
      "more_info_required",
    ].includes(request.status);
    const tone = statusTone(request.status);

    return (
      <article
        key={request.request_id}
        className="uc-verification-requester-current uc-ui-surface"
      >
        <header className="uc-verification-requester-current__head">
          <div>
            <span className="uc-ui-label">
              {request.request_kind === "claim" ? "REIVINDICAÇÃO" : "CRIAÇÃO"} ·{" "}
              {entityTypeLabel(request.requested_entity_type)}
            </span>
            <h3>{request.requested_display_name}</h3>
            <div className="uc-verification-request-meta">
              {request.requested_handle ? (
                <span>@{request.requested_handle}</span>
              ) : null}
              {request.submitted_at ? (
                <span>Enviado em {formatDate(request.submitted_at)}</span>
              ) : (
                <span>Criado em {formatDate(request.created_at)}</span>
              )}
            </div>
          </div>
        </header>

        <section
          className={`uc-verification-requester-state uc-verification-requester-state--${tone}`}
          aria-label={`Status atual: ${STATUS_LABELS[request.status] || request.status}`}
        >
          <span className="uc-ui-label">STATUS ATUAL</span>
          <strong>{STATUS_LABELS[request.status] || request.status}</strong>
          <p>{statusExplanation(request.status)}</p>
        </section>

        <section
          className={`uc-verification-requester-next uc-verification-requester-next--${tone}`}
        >
          <span className="uc-ui-label">O QUE ACONTECE AGORA</span>
          <strong>{nextStepTitle(request.status)}</strong>
          <p>{nextStepCopy(request.status)}</p>
        </section>

        {request.decision_reason ? (
          <section
            className={`uc-verification-requester-reason uc-verification-requester-reason--${tone}`}
          >
            <span className="uc-ui-label">ORIENTAÇÃO DA ANÁLISE</span>
            <p>{request.decision_reason}</p>
          </section>
        ) : null}

        <VerificationDocumentUploader
          requestId={request.request_id}
          status={request.status}
        />

        {canSubmit || canWithdraw ? (
          <div className="uc-verification-request-actions">
            {canSubmit ? (
              <button
                type="button"
                className="uc-ui-button uc-ui-button--quiet"
                disabled={requestBusy || busyRequestId !== null}
                onClick={() =>
                  void updateRequest(request.request_id, "submit_request")
                }
              >
                {requestBusy ? "Processando..." : "Enviar para análise"}
              </button>
            ) : null}

            {canWithdraw ? (
              <button
                type="button"
                className="uc-ui-button uc-ui-button--quiet"
                disabled={requestBusy || busyRequestId !== null}
                onClick={() =>
                  void updateRequest(request.request_id, "withdraw_request")
                }
              >
                {requestBusy ? "Processando..." : "Retirar solicitação"}
              </button>
            ) : null}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <>
      <section className="uc-ui-section uc-verification-section">
        <div className="uc-verification-section-heading">
          <span className="uc-ui-label">AGORA</span>
          <h2>O que está acontecendo com sua verificação</h2>
          <p className="uc-ui-copy">
            Aqui você vê primeiro o estado atual e o que precisa fazer. Histórico
            e novas solicitações ficam separados abaixo.
          </p>
        </div>

        {loadError ? (
          <div
            className="uc-verification-alert uc-verification-alert--error"
            role="alert"
          >
            <strong className="uc-verification-alert__label">ATENÇÃO</strong>
            <p className="uc-verification-alert__copy">
              Não foi possível carregar todas as solicitações agora. Atualize a
              página e tente novamente.
            </p>
          </div>
        ) : null}

        {!loadError && activeRequests.length === 0 ? (
          <article className="uc-verification-requester-empty uc-ui-surface">
            <span className="uc-ui-label">NENHUMA SOLICITAÇÃO EM ANDAMENTO</span>
            <strong className="uc-ui-value">
              Você não precisa acompanhar nenhuma análise agora.
            </strong>
            <p className="uc-ui-copy">
              Quando você enviar uma nova solicitação, o status atual aparecerá
              aqui com a próxima etapa explicada.
            </p>
          </article>
        ) : null}

        <div className="uc-verification-requester-current-list">
          {activeRequests.map(renderCurrentRequest)}
        </div>
      </section>

      <section className="uc-ui-section uc-verification-requester-guide">
        <div className="uc-verification-section-heading">
          <span className="uc-ui-label">COMO FUNCIONA</span>
          <h2>Você não precisa adivinhar o próximo passo</h2>
        </div>

        <ol className="uc-verification-requester-steps">
          <li>
            <span aria-hidden="true">1</span>
            <div>
              <strong>Você envia</strong>
              <p>Crie ou reivindique uma identidade e envie para análise.</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">2</span>
            <div>
              <strong>Nós analisamos</strong>
              <p>O status muda para Em revisão quando a análise começar.</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">3</span>
            <div>
              <strong>Se precisarmos de algo</strong>
              <p>A orientação aparece aqui, dentro da Central.</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">4</span>
            <div>
              <strong>Você recebe a decisão</strong>
              <p>A aprovação ou a não aprovação fica registrada no histórico.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="uc-ui-section uc-verification-section">
        <div className="uc-verification-section-heading">
          <span className="uc-ui-label">NOVA SOLICITAÇÃO</span>
          <h2>
            {activeRequests.length > 0
              ? "Precisa verificar outra identidade?"
              : "Criar ou reivindicar um perfil oficial"}
          </h2>
          <p className="uc-ui-copy">
            Criar serve para uma identidade que ainda não existe na
            USECLUBBERS. Reivindicar serve para pedir acesso a uma identidade
            oficial que já existe.
          </p>
        </div>

        {!showNewRequestForm ? (
          <button
            type="button"
            className="uc-ui-button uc-ui-button--quiet"
            onClick={() => setShowNewRequestForm(true)}
          >
            Criar ou reivindicar outra identidade
          </button>
        ) : (
          <>
            {activeRequests.length > 0 ? (
              <button
                type="button"
                className="uc-verification-requester-close-form"
                onClick={() => setShowNewRequestForm(false)}
              >
                Fechar nova solicitação
              </button>
            ) : null}

            <div className="uc-ui-surface uc-verification-form">
              <div className="uc-verification-field uc-verification-field--full">
                <span className="uc-verification-label">
                  Primeiro, escolha o que você quer fazer
                </span>

                <div className="uc-verification-choice-grid">
                  <button
                    type="button"
                    aria-pressed={requestKind === "create"}
                    className={
                      requestKind === "create"
                        ? "uc-verification-choice is-active"
                        : "uc-verification-choice"
                    }
                    onClick={() => changeRequestKind("create")}
                    disabled={busy}
                  >
                    <strong>Criar uma identidade nova</strong>
                    <span>
                      Escolha esta opção quando o artista, club, festival ou
                      organização ainda não possui perfil oficial.
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={requestKind === "claim"}
                    className={
                      requestKind === "claim"
                        ? "uc-verification-choice is-active"
                        : "uc-verification-choice"
                    }
                    onClick={() => changeRequestKind("claim")}
                    disabled={busy}
                  >
                    <strong>Reivindicar uma identidade existente</strong>
                    <span>
                      Escolha esta opção quando o perfil oficial já existe e você
                      representa ou administra essa identidade.
                    </span>
                  </button>
                </div>
              </div>

              {requestKind === "claim" ? (
                <div className="uc-verification-field uc-verification-field--full">
                  <span className="uc-verification-label">
                    Localize a identidade oficial
                  </span>

                  <div className="uc-verification-actions">
                    <input
                      className="uc-verification-control"
                      value={claimQuery}
                      onChange={(event) => setClaimQuery(event.target.value)}
                      maxLength={120}
                      placeholder="Nome oficial ou @"
                      autoCapitalize="none"
                      autoCorrect="off"
                      disabled={busy || searchingClaim}
                    />

                    <button
                      type="button"
                      className="uc-ui-button uc-ui-button--quiet"
                      disabled={busy || searchingClaim}
                      onClick={() => void searchClaimEntities()}
                    >
                      {searchingClaim ? "Buscando..." : "Buscar identidade"}
                    </button>
                  </div>

                  <span className="uc-verification-help">
                    Depois da busca, selecione a identidade correta para
                    continuar.
                  </span>

                  {claimResults.length > 0 ? (
                    <div className="uc-verification-choice-grid">
                      {claimResults.map((entity) => {
                        const active =
                          selectedClaimEntity?.entity_id === entity.entity_id;

                        return (
                          <button
                            key={entity.entity_id}
                            type="button"
                            aria-pressed={active}
                            className={
                              active
                                ? "uc-verification-choice is-active"
                                : "uc-verification-choice"
                            }
                            onClick={() => setSelectedClaimEntity(entity)}
                            disabled={busy}
                          >
                            <strong>{entity.display_name}</strong>
                            <span>
                              {ENTITY_LABELS[entity.entity_type]} · @
                              {entity.public_handle}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {selectedClaimEntity ? (
                    <article className="uc-verification-requester-selected uc-ui-surface">
                      <span className="uc-ui-label">
                        IDENTIDADE QUE VOCÊ VAI REIVINDICAR
                      </span>
                      <strong className="uc-ui-value">
                        {selectedClaimEntity.display_name}
                      </strong>
                      <p className="uc-ui-copy">
                        {ENTITY_LABELS[selectedClaimEntity.entity_type]} · @
                        {selectedClaimEntity.public_handle}
                      </p>
                    </article>
                  ) : null}
                </div>
              ) : (
                <>
                  <label className="uc-verification-field">
                    <span className="uc-verification-label">
                      Tipo de identidade
                    </span>
                    <select
                      className="uc-verification-control"
                      value={entityType}
                      onChange={(event) =>
                        setEntityType(event.target.value as EntityType)
                      }
                      disabled={busy}
                    >
                      {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {entityType === "organization" ? (
                    <label className="uc-verification-field">
                      <span className="uc-verification-label">
                        Tipo de organização
                      </span>
                      <select
                        className="uc-verification-control"
                        value={organizationType}
                        onChange={(event) =>
                          setOrganizationType(event.target.value)
                        }
                        disabled={busy}
                      >
                        {ORGANIZATION_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <label className="uc-verification-field">
                    <span className="uc-verification-label">Nome público</span>
                    <input
                      className="uc-verification-control"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      maxLength={120}
                      placeholder={`Nome do ${entityLabel}`}
                      disabled={busy}
                    />
                  </label>

                  <label className="uc-verification-field">
                    <span className="uc-verification-label">
                      @ universal desejado
                    </span>
                    <input
                      className="uc-verification-control"
                      value={requestedHandle}
                      onChange={(event) => setRequestedHandle(event.target.value)}
                      maxLength={40}
                      placeholder="@nome"
                      autoCapitalize="none"
                      autoCorrect="off"
                      disabled={busy}
                    />
                    <span className="uc-verification-help">
                      Obrigatório para criação. O @ será validado novamente
                      dentro da aprovação.
                    </span>
                  </label>
                </>
              )}

              <label className="uc-verification-field">
                <span className="uc-verification-label">E-mail de contato</span>
                <input
                  type="email"
                  className="uc-verification-control"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  maxLength={320}
                  autoComplete="email"
                  disabled={busy}
                />
              </label>

              <label className="uc-verification-field">
                <span className="uc-verification-label">
                  E-mail profissional, se tiver
                </span>
                <input
                  type="email"
                  className="uc-verification-control"
                  value={professionalEmail}
                  onChange={(event) => setProfessionalEmail(event.target.value)}
                  maxLength={320}
                  placeholder="contato@dominiooficial.com"
                  autoComplete="email"
                  disabled={busy}
                />
                <span className="uc-verification-help">
                  Ajuda na análise, mas não substitui a verificação.
                </span>
              </label>

              <div className="uc-verification-field uc-verification-field--full">
                <span className="uc-verification-label">
                  Evidências públicas opcionais
                </span>
                <p className="uc-verification-help">
                  Informe apenas páginas públicas oficiais. Não envie documentos
                  ou dados sensíveis nestes campos.
                </p>
              </div>

              <label className="uc-verification-field">
                <span className="uc-verification-label">Site oficial</span>
                <input
                  type="url"
                  className="uc-verification-control"
                  value={officialWebsite}
                  onChange={(event) => setOfficialWebsite(event.target.value)}
                  placeholder="https://..."
                  disabled={busy}
                />
              </label>

              <label className="uc-verification-field">
                <span className="uc-verification-label">Instagram oficial</span>
                <input
                  type="url"
                  className="uc-verification-control"
                  value={instagramUrl}
                  onChange={(event) => setInstagramUrl(event.target.value)}
                  placeholder="https://instagram.com/..."
                  disabled={busy}
                />
              </label>

              <label className="uc-verification-field">
                <span className="uc-verification-label">Spotify oficial</span>
                <input
                  type="url"
                  className="uc-verification-control"
                  value={spotifyUrl}
                  onChange={(event) => setSpotifyUrl(event.target.value)}
                  placeholder="https://open.spotify.com/..."
                  disabled={busy}
                />
              </label>

              <label className="uc-verification-field">
                <span className="uc-verification-label">YouTube oficial</span>
                <input
                  type="url"
                  className="uc-verification-control"
                  value={youtubeUrl}
                  onChange={(event) => setYoutubeUrl(event.target.value)}
                  placeholder="https://youtube.com/..."
                  disabled={busy}
                />
              </label>

              <div className="uc-verification-actions uc-verification-field--full">
                <button
                  type="button"
                  className="uc-ui-button uc-ui-button--quiet"
                  disabled={busy}
                  onClick={() => void createRequest(false)}
                >
                  {busy ? "Processando..." : "Salvar rascunho"}
                </button>
                <button
                  type="button"
                  className="uc-ui-button uc-ui-button--quiet"
                  disabled={busy}
                  onClick={() => void createRequest(true)}
                >
                  {busy ? "Processando..." : "Enviar para análise"}
                </button>
              </div>
            </div>
          </>
        )}

        {message ? (
          <div
            className="uc-verification-alert uc-verification-alert--success"
            role="status"
          >
            <strong className="uc-verification-alert__label">CONCLUÍDO</strong>
            <p className="uc-verification-alert__copy">{message}</p>
          </div>
        ) : null}

        {error ? (
          <div
            className="uc-verification-alert uc-verification-alert--error"
            role="alert"
          >
            <strong className="uc-verification-alert__label">ATENÇÃO</strong>
            <p className="uc-verification-alert__copy">{error}</p>
          </div>
        ) : null}
      </section>

      {historyRequests.length > 0 ? (
        <section className="uc-ui-section uc-verification-section">
          <details className="uc-verification-requester-history">
            <summary>
              <span>
                <strong>Histórico de solicitações</strong>
                <small>
                  Processos concluídos, retirados ou encerrados ficam aqui.
                </small>
              </span>
              <span>{historyRequests.length}</span>
            </summary>

            <div className="uc-verification-requester-history-list">
              {historyRequests.map((request) => {
                const tone = statusTone(request.status);

                return (
                  <article
                    key={request.request_id}
                    className={`uc-verification-requester-history-card uc-verification-requester-history-card--${tone}`}
                  >
                    <div>
                      <span className="uc-ui-label">
                        {request.request_kind === "claim"
                          ? "REIVINDICAÇÃO"
                          : "CRIAÇÃO"}{" "}
                        · {entityTypeLabel(request.requested_entity_type)}
                      </span>
                      <strong>{request.requested_display_name}</strong>
                      <p>
                        {request.requested_handle
                          ? `@${request.requested_handle} · `
                          : ""}
                        {request.submitted_at
                          ? `Enviado em ${formatDate(request.submitted_at)}`
                          : `Criado em ${formatDate(request.created_at)}`}
                      </p>
                    </div>

                    <div
                      className={`uc-verification-requester-history-status uc-verification-requester-history-status--${tone}`}
                    >
                      <span>RESULTADO</span>
                      <strong>
                        {STATUS_LABELS[request.status] || request.status}
                      </strong>
                    </div>

                    {request.decision_reason ? (
                      <p className="uc-verification-requester-history-reason">
                        <strong>Motivo:</strong> {request.decision_reason}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </details>
        </section>
      ) : null}
    </>
  );
}