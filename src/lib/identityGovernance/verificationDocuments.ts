// src/lib/identityGovernance/verificationDocuments.ts

export const VERIFICATION_DOCUMENTS_BUCKET =
  "verification-private-documents";

export const MAX_VERIFICATION_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const VERIFICATION_DOCUMENT_TYPES = [
  "identity",
  "business_registry",
  "representative_authorization",
  "domain_ownership",
  "booking_or_agency_proof",
  "other",
] as const;

export type VerificationDocumentType =
  (typeof VERIFICATION_DOCUMENT_TYPES)[number];

export const VERIFICATION_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

const DOCUMENT_TYPE_SET = new Set<string>(
  VERIFICATION_DOCUMENT_TYPES
);

const MIME_TYPE_SET = new Set<string>(
  VERIFICATION_DOCUMENT_MIME_TYPES
);

const REQUESTER_UPLOAD_STATUSES = new Set([
  "draft",
  "submitted",
  "in_review",
  "more_info_required",
]);

export function isVerificationDocumentType(
  value: string
): value is VerificationDocumentType {
  return DOCUMENT_TYPE_SET.has(value);
}

export function isVerificationDocumentMimeType(
  value: string
): boolean {
  return MIME_TYPE_SET.has(value.toLowerCase());
}

export function canRequesterUploadVerificationDocument(
  status: string
): boolean {
  return REQUESTER_UPLOAD_STATUSES.has(status);
}

export function isSha256Hex(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

export function sanitizeVerificationFilename(
  value: string
): string {
  const cleaned = String(value || "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._ -]+/gu, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

  return cleaned || "documento";
}