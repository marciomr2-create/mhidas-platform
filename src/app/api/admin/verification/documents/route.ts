// src/app/api/admin/verification/documents/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import {
  createIdentityGovernanceAdminClient,
  getVerificationAuthority,
} from "@/lib/identityGovernance/verificationReviewerServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function text(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, maxLength);
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function error(
  status: number,
  message: string
): NextResponse {
  return NextResponse.json(
    { ok: false, message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  const auth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    return error(401, "Entre na sua conta para continuar.");
  }

  const admin = createIdentityGovernanceAdminClient();

  if (!admin) {
    return error(
      503,
      "Os documentos estão temporariamente indisponíveis."
    );
  }

  const authority = await getVerificationAuthority(
    user.id,
    admin
  ).catch(() => null);

  if (!authority) {
    return error(
      403,
      "Esta conta não possui permissão para abrir documentos de verificação."
    );
  }

  const documentId = text(
    request.nextUrl.searchParams.get("document_id"),
    80
  );

  if (!validUuid(documentId)) {
    return error(400, "Documento inválido.");
  }

  const { data, error: documentError } = await admin
    .from("entity_verification_documents")
    .select(
      "document_id,storage_bucket,storage_object_path"
    )
    .eq("document_id", documentId)
    .maybeSingle();

  if (documentError || !data) {
    return error(404, "Documento não encontrado.");
  }

  const { data: signed, error: signedError } =
    await admin.storage
      .from(String(data.storage_bucket))
      .createSignedUrl(
        String(data.storage_object_path),
        60
      );

  if (signedError || !signed?.signedUrl) {
    return error(
      503,
      "Não foi possível abrir este documento agora."
    );
  }

  return NextResponse.redirect(signed.signedUrl, 302);
}