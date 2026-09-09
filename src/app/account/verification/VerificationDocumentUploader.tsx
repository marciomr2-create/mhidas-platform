// src/app/account/verification/VerificationDocumentUploader.tsx

"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type DocumentView = {
  document_id: string;
  request_id: string;
  document_type: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  review_status: string;
  created_at: string;
};

type Props = {
  requestId: string;
  status: string;
};

const DOCUMENT_TYPES = [
  ["identity", "Documento de identidade"],
  ["business_registry", "Registro da empresa"],
  [
    "representative_authorization",
    "Autorização de representação",
  ],
  ["domain_ownership", "Comprovação de domínio"],
  [
    "booking_or_agency_proof",
    "Comprovação de agência / booking",
  ],
  ["other", "Outro documento"],
] as const;

const DOCUMENT_TYPE_LABELS = Object.fromEntries(
  DOCUMENT_TYPES
) as Record<string, string>;

const REVIEW_LABELS: Record<string, string> = {
  pending: "Aguardando análise",
  accepted: "Aceito",
  rejected: "Não aceito",
  needs_more_info: "Precisamos de mais informações",
};

const UPLOADABLE_STATUSES = new Set([
  "draft",
  "submitted",
  "in_review",
  "more_info_required",
]);

function formatSize(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer()
  );

  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export default function VerificationDocumentUploader({
  requestId,
  status,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<DocumentView[]>([]);
  const [documentType, setDocumentType] =
    useState("representative_authorization");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const canUpload = useMemo(
    () => UPLOADABLE_STATUSES.has(status),
    [status]
  );

  async function loadDocuments() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/account/verification/documents?request_id=${encodeURIComponent(
          requestId
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const payload = (await response
        .json()
        .catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            documents?: DocumentView[];
          }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.message ||
            "Não foi possível carregar os documentos agora."
        );
      }

      setDocuments(payload.documents ?? []);
    } catch (caught) {
      setErrorMessage(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar os documentos agora."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, [requestId]);

  async function uploadDocument() {
    if (!file || !canUpload) {
      setErrorMessage("Escolha um documento para enviar.");
      return;
    }

    if (
      ![
        "application/pdf",
        "image/jpeg",
        "image/png",
      ].includes(file.type)
    ) {
      setErrorMessage("Use um arquivo PDF, JPG ou PNG.");
      return;
    }

    if (file.size < 1 || file.size > 10 * 1024 * 1024) {
      setErrorMessage(
        "O documento deve ter no máximo 10 MB."
      );
      return;
    }

    setUploading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const hash = await sha256Hex(file);

      const prepareResponse = await fetch(
        "/api/account/verification/documents",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "prepare_upload",
            request_id: requestId,
            document_type: documentType,
            original_filename: file.name,
            mime_type: file.type,
            file_size_bytes: file.size,
            sha256: hash,
          }),
        }
      );

      const prepared = (await prepareResponse
        .json()
        .catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            document_id?: string;
            bucket?: string;
            object_path?: string;
            token?: string;
          }
        | null;

      if (
        !prepareResponse.ok ||
        !prepared?.ok ||
        !prepared.document_id ||
        !prepared.bucket ||
        !prepared.object_path ||
        !prepared.token
      ) {
        throw new Error(
          prepared?.message ||
            "Não foi possível preparar o envio agora."
        );
      }

      const supabase = createBrowserClient();

      const { error: uploadError } = await supabase.storage
        .from(prepared.bucket)
        .uploadToSignedUrl(
          prepared.object_path,
          prepared.token,
          file,
          {
            contentType: file.type,
            upsert: false,
          }
        );

      if (uploadError) {
        throw new Error(
          "Não foi possível enviar o arquivo. Tente novamente."
        );
      }

      const finalizeResponse = await fetch(
        "/api/account/verification/documents",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "finalize_upload",
            request_id: requestId,
            document_id: prepared.document_id,
            object_path: prepared.object_path,
            document_type: documentType,
            original_filename: file.name,
            mime_type: file.type,
            file_size_bytes: file.size,
            sha256: hash,
          }),
        }
      );

      const finalized = (await finalizeResponse
        .json()
        .catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
          }
        | null;

      if (!finalizeResponse.ok || !finalized?.ok) {
        throw new Error(
          finalized?.message ||
            "Não foi possível concluir o envio agora."
        );
      }

      setMessage("Documento enviado com segurança.");
      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadDocuments();
    } catch (caught) {
      setErrorMessage(
        caught instanceof Error
          ? caught.message
          : "Não foi possível enviar o documento agora."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="uc-ui-surface">
      <span className="uc-ui-label">DOCUMENTOS PRIVADOS</span>
      <strong className="uc-ui-value">
        Envie documentos somente quando eles ajudarem a comprovar sua relação
        com esta identidade.
      </strong>
      <p className="uc-ui-copy">
        Os arquivos ficam privados. Use PDF, JPG ou PNG, com até 10 MB por
        documento.
      </p>

      {canUpload ? (
        <div className="uc-ui-form">
          <label className="uc-ui-field">
            <span>Tipo de documento</span>
            <select
              className="uc-ui-input"
              value={documentType}
              onChange={(event) =>
                setDocumentType(event.target.value)
              }
              disabled={uploading}
            >
              {DOCUMENT_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="uc-ui-field">
            <span>Escolher arquivo</span>
            <input
              ref={fileInputRef}
              type="file"
              className="uc-ui-input"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              disabled={uploading}
              onChange={(event) =>
                setFile(event.target.files?.[0] ?? null)
              }
            />
          </label>

          <div className="uc-ui-form-actions">
            <button
              type="button"
              className="uc-ui-button uc-ui-button--quiet"
              disabled={uploading || !file}
              onClick={() => void uploadDocument()}
            >
              {uploading ? "Enviando..." : "Enviar documento"}
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="uc-ui-notice uc-ui-notice--success" role="status">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="uc-ui-notice uc-ui-notice--error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      {loading ? (
        <p className="uc-ui-copy">Carregando documentos...</p>
      ) : documents.length === 0 ? (
        <p className="uc-ui-copy">
          Nenhum documento privado foi enviado nesta solicitação.
        </p>
      ) : (
        <div className="uc-ui-stack">
          {documents.map((document) => (
            <article
              key={document.document_id}
              className="uc-ui-surface uc-ui-surface--secondary"
            >
              <span className="uc-ui-label">
                {DOCUMENT_TYPE_LABELS[document.document_type] ||
                  "Documento"}
              </span>
              <strong className="uc-ui-value">
                {document.original_filename}
              </strong>
              <p className="uc-ui-copy">
                {formatSize(document.file_size_bytes)} ·{" "}
                {REVIEW_LABELS[document.review_status] ||
                  "Aguardando análise"}
              </p>
              <a
                className="uc-ui-button uc-ui-button--quiet"
                href={`/api/account/verification/documents?document_id=${encodeURIComponent(
                  document.document_id
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Abrir documento
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}