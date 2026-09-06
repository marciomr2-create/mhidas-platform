// src/app/account/verification/VerificationCenterClient.tsx

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  in_review: "Em análise",
  more_info_required: "Mais informações necessárias",
  approved: "Aprovado",
  rejected: "Não aprovado",
  withdrawn: "Retirado",
  suspended: "Suspenso",
  revoked: "Revogado",
};

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

function statusClass(status: string): string {
  return status === "approved"
    ? "uc-ui-status uc-ui-status--accent"
    : "uc-ui-status";
}

export default function VerificationCenterClient({
  accountEmail,
  initialEntityType,
  initialRequests,
  loadError,
}: Props) {
  const router = useRouter();
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
  const [busy, setBusy] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasRequests = initialRequests.length > 0;
  const entityLabel = useMemo(() => ENTITY_LABELS[entityType], [entityType]);

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
      throw new Error(body?.message || "Não foi possível concluir esta ação agora.");
    }
  }

  async function createRequest(submit: boolean) {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      await callApi({
        action: "create_request",
        submit,
        request_kind: requestKind,
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
          ? "Solicitação enviada para análise. Você acompanhará as próximas etapas nesta Central."
          : "Rascunho salvo. Você pode enviá-lo para análise quando estiver pronto."
      );
      setDisplayName("");
      setRequestedHandle("");
      setProfessionalEmail("");
      setOfficialWebsite("");
      setInstagramUrl("");
      setSpotifyUrl("");
      setYoutubeUrl("");
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

  async function updateRequest(requestId: string, action: "submit_request" | "withdraw_request") {
    setBusyRequestId(requestId);
    setMessage(null);
    setError(null);

    try {
      await callApi({ action, request_id: requestId });
      setMessage(
        action === "submit_request"
          ? "Solicitação enviada para análise."
          : "Solicitação retirada. O histórico permanece registrado com segurança."
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

  return (
    <>
      <section className="uc-ui-section uc-verification-section">
        <div className="uc-verification-section-heading">
          <span className="uc-ui-label">NOVA SOLICITAÇÃO</span>
          <h2>Criar ou reivindicar um perfil oficial</h2>
          <p className="uc-ui-copy">
            Nenhum perfil, autorização ou badge é criado automaticamente por este formulário.
            A análise precisa confirmar a relação legítima com a identidade.
          </p>
        </div>

        <div className="uc-ui-surface uc-verification-form">
          <div className="uc-verification-field uc-verification-field--full">
            <span className="uc-verification-label">O que você quer fazer?</span>
            <div className="uc-verification-choice-grid">
              <button
                type="button"
                className={
                  requestKind === "create"
                    ? "uc-verification-choice is-active"
                    : "uc-verification-choice"
                }
                onClick={() => setRequestKind("create")}
                disabled={busy}
              >
                <strong>Criar novo perfil</strong>
                <span>Para uma identidade oficial que ainda não possui perfil na USECLUBBERS.</span>
              </button>
              <button
                type="button"
                className={
                  requestKind === "claim"
                    ? "uc-verification-choice is-active"
                    : "uc-verification-choice"
                }
                onClick={() => setRequestKind("claim")}
                disabled={busy}
              >
                <strong>Reivindicar perfil existente</strong>
                <span>Para uma identidade que já existe e que você representa ou administra.</span>
              </button>
            </div>
          </div>

          <label className="uc-verification-field">
            <span className="uc-verification-label">Tipo de identidade</span>
            <select
              className="uc-verification-control"
              value={entityType}
              onChange={(event) => setEntityType(event.target.value as EntityType)}
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
              <span className="uc-verification-label">Tipo de organização</span>
              <select
                className="uc-verification-control"
                value={organizationType}
                onChange={(event) => setOrganizationType(event.target.value)}
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
            <span className="uc-verification-label">@ desejado</span>
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
              É uma preferência. O namespace universal é validado antes da aprovação e publicação.
            </span>
          </label>

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
            <span className="uc-verification-label">E-mail profissional, se tiver</span>
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
              E-mail corporativo aumenta a confiança e pode agilizar a análise, mas não substitui a verificação.
            </span>
          </label>

          <div className="uc-verification-field uc-verification-field--full">
            <span className="uc-verification-label">Evidências públicas opcionais</span>
            <p className="uc-verification-help">
              Informe apenas páginas públicas oficiais. Não envie documentos ou dados sensíveis nestes campos.
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
              className="uc-ui-button uc-ui-button--primary"
              disabled={busy}
              onClick={() => void createRequest(true)}
            >
              {busy ? "Processando..." : "Enviar para análise"}
            </button>
          </div>
        </div>

        {message ? (
          <p className="uc-verification-alert" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="uc-verification-alert uc-verification-alert--error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="uc-ui-section uc-verification-section">
        <div className="uc-verification-section-heading">
          <span className="uc-ui-label">MINHAS SOLICITAÇÕES</span>
          <h2>Acompanhe o processo</h2>
          <p className="uc-ui-copy">
            Status, pedidos de informação e decisões ficam registrados nesta Central.
          </p>
        </div>

        {loadError ? (
          <p className="uc-verification-alert uc-verification-alert--error" role="alert">
            Não foi possível carregar todas as solicitações agora. Atualize a página e tente novamente.
          </p>
        ) : null}

        {!loadError && !hasRequests ? (
          <article className="uc-ui-surface">
            <strong className="uc-ui-value">Nenhuma solicitação ainda</strong>
            <p className="uc-ui-copy">
              Quando você criar ou reivindicar uma identidade oficial, o acompanhamento aparecerá aqui.
            </p>
          </article>
        ) : null}

        <div className="uc-verification-request-list">
          {initialRequests.map((request) => {
            const canSubmit = request.status === "draft";
            const canWithdraw = [
              "draft",
              "submitted",
              "in_review",
              "more_info_required",
            ].includes(request.status);
            const requestBusy = busyRequestId === request.request_id;

            return (
              <article key={request.request_id} className="uc-ui-surface uc-verification-request-card">
                <div className="uc-verification-request-head">
                  <div>
                    <span className="uc-ui-label">
                      {request.request_kind === "claim" ? "REIVINDICAÇÃO" : "CRIAÇÃO"} · {" "}
                      {ENTITY_LABELS[request.requested_entity_type as EntityType] || request.requested_entity_type}
                    </span>
                    <strong className="uc-ui-value">{request.requested_display_name}</strong>
                  </div>
                  <span className={statusClass(request.status)}>
                    {STATUS_LABELS[request.status] || request.status}
                  </span>
                </div>

                <div className="uc-verification-request-meta">
                  {request.requested_handle ? <span>@{request.requested_handle}</span> : null}
                  <span>Criado em {formatDate(request.created_at)}</span>
                  {request.submitted_at ? (
                    <span>Enviado em {formatDate(request.submitted_at)}</span>
                  ) : null}
                </div>

                {request.status === "more_info_required" ? (
                  <p className="uc-verification-request-note">
                    A equipe precisa de mais informações. O motivo e as próximas instruções devem aparecer aqui antes de qualquer envio sensível.
                  </p>
                ) : null}

                {request.decision_reason ? (
                  <p className="uc-verification-request-note">
                    <strong>Atualização da análise:</strong> {request.decision_reason}
                  </p>
                ) : null}

                {canSubmit || canWithdraw ? (
                  <div className="uc-verification-request-actions">
                    {canSubmit ? (
                      <button
                        type="button"
                        className="uc-ui-button uc-ui-button--primary"
                        disabled={requestBusy || busyRequestId !== null}
                        onClick={() => void updateRequest(request.request_id, "submit_request")}
                      >
                        {requestBusy ? "Processando..." : "Enviar para análise"}
                      </button>
                    ) : null}
                    {canWithdraw ? (
                      <button
                        type="button"
                        className="uc-ui-button uc-ui-button--quiet"
                        disabled={requestBusy || busyRequestId !== null}
                        onClick={() => void updateRequest(request.request_id, "withdraw_request")}
                      >
                        {requestBusy ? "Processando..." : "Retirar solicitação"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}