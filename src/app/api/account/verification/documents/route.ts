// src/app/api/account/verification/documents/route.ts

import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { createIdentityGovernanceAdminClient } from "@/lib/identityGovernance/verificationReviewerServer";
import {
  MAX_VERIFICATION_DOCUMENT_BYTES,
  VERIFICATION_DOCUMENTS_BUCKET,
  canRequesterUploadVerificationDocument,
  isSha256Hex,
  isVerificationDocumentMimeType,
  isVerificationDocumentType,
  sanitizeVerificationFilename,
} from "@/lib/identityGovernance/verificationDocuments";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

type OwnedRequest = {
  request_id: string;
  requester_user_id: string;
  status: string;
};

type DocumentRow = {
  document_id: string;
  request_id: string;
  document_type: string;
  storage_bucket: string;
  storage_object_path: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  sha256: string;
  review_status: string;
  created_at: string;
};

function json(
  body: Record<string, unknown>,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function error(
  status: number,
  message: string
): NextResponse {
  return json({ ok: false, message }, status);
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function text(
  value: unknown,
  maxLength: number
): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (origin) {
    try {
      return new URL(origin).origin === request.nextUrl.origin;
    } catch {
      return false;
    }
  }

  return !fetchSite ||
    fetchSite === "same-origin" ||
    fetchSite === "none";
}

async function authenticatedUser() {
  const auth = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await auth.auth.getUser();

  if (userError || !user) {
    return null;
  }

  return user;
}

async function ownedRequest(
  admin: NonNullable<
    ReturnType<typeof createIdentityGovernanceAdminClient>
  >,
  requestId: string,
  userId: string
): Promise<OwnedRequest | null> {
  const { data, error: readError } = await admin
    .from("entity_verification_requests")
    .select("request_id,requester_user_id,status")
    .eq("request_id", requestId)
    .eq("requester_user_id", userId)
    .maybeSingle();

  if (readError || !data) {
    return null;
  }

  return data as OwnedRequest;
}

function publicDocument(row: DocumentRow) {
  return {
    document_id: row.document_id,
    request_id: row.request_id,
    document_type: row.document_type,
    original_filename: row.original_filename,
    mime_type: row.mime_type,
    file_size_bytes: row.file_size_bytes,
    review_status: row.review_status,
    created_at: row.created_at,
  };
}

export async function GET(request: NextRequest) {
  const user = await authenticatedUser();

  if (!user) {
    return error(401, "Entre na sua conta para continuar.");
  }

  const admin = createIdentityGovernanceAdminClient();

  if (!admin) {
    return error(
      503,
      "O envio privado de documentos está temporariamente indisponível."
    );
  }

  const documentId = text(
    request.nextUrl.searchParams.get("document_id"),
    80
  );

  if (documentId) {
    if (!validUuid(documentId)) {
      return error(400, "Documento inválido.");
    }

    const { data, error: documentError } = await admin
      .from("entity_verification_documents")
      .select(
        "document_id,request_id,storage_bucket,storage_object_path"
      )
      .eq("document_id", documentId)
      .maybeSingle();

    if (documentError || !data) {
      return error(404, "Documento não encontrado.");
    }

    const requestRow = await ownedRequest(
      admin,
      String(data.request_id),
      user.id
    );

    if (!requestRow) {
      return error(404, "Documento não encontrado.");
    }

    const { data: signed, error: signedError } = await admin.storage
      .from(String(data.storage_bucket))
      .createSignedUrl(String(data.storage_object_path), 60);

    if (signedError || !signed?.signedUrl) {
      return error(
        503,
        "Não foi possível abrir este documento agora."
      );
    }

    return NextResponse.redirect(signed.signedUrl, 302);
  }

  const requestId = text(
    request.nextUrl.searchParams.get("request_id"),
    80
  );

  if (!validUuid(requestId)) {
    return error(400, "Solicitação inválida.");
  }

  const requestRow = await ownedRequest(
    admin,
    requestId,
    user.id
  );

  if (!requestRow) {
    return error(404, "Solicitação não encontrada.");
  }

  const { data, error: listError } = await admin
    .from("entity_verification_documents")
    .select(
      "document_id,request_id,document_type,storage_bucket,storage_object_path,original_filename,mime_type,file_size_bytes,sha256,review_status,created_at"
    )
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (listError) {
    return error(
      500,
      "Não foi possível carregar os documentos agora."
    );
  }

  return json({
    ok: true,
    can_upload:
      canRequesterUploadVerificationDocument(requestRow.status),
    documents: ((data ?? []) as DocumentRow[]).map(publicDocument),
  });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return error(
      403,
      "Não foi possível validar esta ação. Atualize a página e tente novamente."
    );
  }

  const user = await authenticatedUser();

  if (!user) {
    return error(401, "Entre na sua conta para continuar.");
  }

  const admin = createIdentityGovernanceAdminClient();

  if (!admin) {
    return error(
      503,
      "O envio privado de documentos está temporariamente indisponível."
    );
  }

  let body: JsonObject;

  try {
    const parsed = await request.json();

    if (!isObject(parsed)) {
      return error(400, "Solicitação inválida.");
    }

    body = parsed;
  } catch {
    return error(400, "Solicitação inválida.");
  }

  const action = text(body.action, 40);
  const requestId = text(body.request_id, 80);
  const documentType = text(body.document_type, 80);
  const originalFilename = sanitizeVerificationFilename(
    text(body.original_filename, 220)
  );
  const mimeType = text(body.mime_type, 120).toLowerCase();
  const sha256 = text(body.sha256, 64).toLowerCase();
  const fileSize = Number(body.file_size_bytes);

  if (!validUuid(requestId)) {
    return error(400, "Solicitação inválida.");
  }

  if (!isVerificationDocumentType(documentType)) {
    return error(400, "Escolha o tipo do documento.");
  }

  if (!isVerificationDocumentMimeType(mimeType)) {
    return error(
      400,
      "Use um arquivo PDF, JPG ou PNG."
    );
  }

  if (
    !Number.isSafeInteger(fileSize) ||
    fileSize < 1 ||
    fileSize > MAX_VERIFICATION_DOCUMENT_BYTES
  ) {
    return error(
      400,
      "O documento deve ter no máximo 10 MB."
    );
  }

  if (!isSha256Hex(sha256)) {
    return error(400, "Não foi possível validar o arquivo.");
  }

  const requestRow = await ownedRequest(
    admin,
    requestId,
    user.id
  );

  if (!requestRow) {
    return error(404, "Solicitação não encontrada.");
  }

  if (
    !canRequesterUploadVerificationDocument(
      requestRow.status
    )
  ) {
    return error(
      409,
      "Esta solicitação não aceita novos documentos."
    );
  }

  if (action === "prepare_upload") {
    const documentId = randomUUID();
    const objectPath =
      `${user.id}/${requestId}/${documentId}/${originalFilename}`;

    const { data, error: signedError } = await admin.storage
      .from(VERIFICATION_DOCUMENTS_BUCKET)
      .createSignedUploadUrl(objectPath, {
        upsert: false,
      });

    if (signedError || !data?.token) {
      return error(
        503,
        "O envio privado de documentos ainda não está disponível neste ambiente."
      );
    }

    return json({
      ok: true,
      document_id: documentId,
      bucket: VERIFICATION_DOCUMENTS_BUCKET,
      object_path: objectPath,
      token: data.token,
    });
  }

  if (action !== "finalize_upload") {
    return error(400, "Ação inválida.");
  }

  const documentId = text(body.document_id, 80);
  const objectPath = text(body.object_path, 900);

  if (!validUuid(documentId)) {
    return error(400, "Documento inválido.");
  }

  const expectedPrefix =
    `${user.id}/${requestId}/${documentId}/`;

  if (
    !objectPath.startsWith(expectedPrefix) ||
    objectPath !== expectedPrefix + originalFilename
  ) {
    return error(400, "Documento inválido.");
  }

  const { data: downloaded, error: downloadError } =
    await admin.storage
      .from(VERIFICATION_DOCUMENTS_BUCKET)
      .download(objectPath);

  if (downloadError || !downloaded) {
    return error(
      409,
      "O arquivo não foi encontrado. Envie novamente."
    );
  }

  const bytes = Buffer.from(
    await downloaded.arrayBuffer()
  );

  const actualHash = createHash("sha256")
    .update(bytes)
    .digest("hex");

  if (
    bytes.byteLength !== fileSize ||
    actualHash !== sha256
  ) {
    await admin.storage
      .from(VERIFICATION_DOCUMENTS_BUCKET)
      .remove([objectPath]);

    return error(
      409,
      "O arquivo enviado não pôde ser confirmado. Envie novamente."
    );
  }

  const { data: inserted, error: insertError } = await admin
    .from("entity_verification_documents")
    .insert({
      document_id: documentId,
      request_id: requestId,
      document_type: documentType,
      storage_bucket: VERIFICATION_DOCUMENTS_BUCKET,
      storage_object_path: objectPath,
      original_filename: originalFilename,
      mime_type: mimeType,
      file_size_bytes: fileSize,
      sha256,
      uploaded_by_user_id: user.id,
      review_status: "pending",
    })
    .select(
      "document_id,request_id,document_type,storage_bucket,storage_object_path,original_filename,mime_type,file_size_bytes,sha256,review_status,created_at"
    )
    .single();

  if (insertError || !inserted) {
    await admin.storage
      .from(VERIFICATION_DOCUMENTS_BUCKET)
      .remove([objectPath]);

    return error(
      500,
      "Não foi possível registrar o documento. Tente novamente."
    );
  }

  return json({
    ok: true,
    message: "Documento enviado com segurança.",
    document: publicDocument(inserted as DocumentRow),
  });
}