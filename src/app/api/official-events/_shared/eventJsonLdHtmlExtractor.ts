// src/app/api/official-events/_shared/eventJsonLdHtmlExtractor.ts

import type {
  EventJsonLdNormalizationResult,
  EventJsonLdNormalizerOptions,
} from "./eventJsonLdNormalizer";

import { normalizeJsonLdPayload } from "./eventJsonLdNormalizer";

export type EventJsonLdHtmlExtractionError = {
  index: number;
  message: string;
  content_preview: string;
};

export type EventJsonLdHtmlExtractionResult = {
  script_count: number;
  parsed_payload_count: number;
  payloads: unknown[];
  parse_errors: EventJsonLdHtmlExtractionError[];
};

export type EventJsonLdHtmlNormalizationResult = {
  extraction: EventJsonLdHtmlExtractionResult;
  normalizations: EventJsonLdNormalizationResult[];
  total_event_object_count: number;
  total_raw_candidate_count: number;
  total_normalized_candidate_count: number;
};

export function extractJsonLdScriptContentsFromHtml(html: unknown): string[] {
  const source = typeof html === "string" ? html : String(html ?? "");
  const lowerSource = source.toLowerCase();
  const contents: string[] = [];

  let cursor = 0;

  while (cursor < source.length) {
    const scriptStart = lowerSource.indexOf("<script", cursor);

    if (scriptStart === -1) {
      break;
    }

    const openingEnd = lowerSource.indexOf(">", scriptStart);

    if (openingEnd === -1) {
      break;
    }

    const openingTag = source.slice(scriptStart, openingEnd + 1);

    if (!isJsonLdScriptOpeningTag(openingTag)) {
      cursor = openingEnd + 1;
      continue;
    }

    const scriptEnd = lowerSource.indexOf("</script>", openingEnd + 1);

    if (scriptEnd === -1) {
      break;
    }

    const content = source.slice(openingEnd + 1, scriptEnd).trim();

    if (content.length > 0) {
      contents.push(content);
    }

    cursor = scriptEnd + "</script>".length;
  }

  return contents;
}

export function extractJsonLdPayloadsFromHtml(
  html: unknown
): EventJsonLdHtmlExtractionResult {
  const scriptContents = extractJsonLdScriptContentsFromHtml(html);
  const payloads: unknown[] = [];
  const parseErrors: EventJsonLdHtmlExtractionError[] = [];

  scriptContents.forEach((content, index) => {
    try {
      payloads.push(JSON.parse(content) as unknown);
    } catch (error) {
      parseErrors.push({
        index,
        message:
          error instanceof Error
            ? error.message
            : "Falha desconhecida ao parsear JSON-LD.",
        content_preview: createContentPreview(content),
      });
    }
  });

  return {
    script_count: scriptContents.length,
    parsed_payload_count: payloads.length,
    payloads,
    parse_errors: parseErrors,
  };
}

export function normalizeJsonLdHtmlPayloads(
  html: unknown,
  options: EventJsonLdNormalizerOptions = {}
): EventJsonLdHtmlNormalizationResult {
  const extraction = extractJsonLdPayloadsFromHtml(html);
  const normalizations = extraction.payloads.map((payload) =>
    normalizeJsonLdPayload(payload, options)
  );

  return {
    extraction,
    normalizations,
    total_event_object_count: sumNormalizationField(
      normalizations,
      "event_object_count"
    ),
    total_raw_candidate_count: sumNormalizationField(
      normalizations,
      "raw_candidates"
    ),
    total_normalized_candidate_count: sumNormalizationField(
      normalizations,
      "normalized_candidates"
    ),
  };
}

function isJsonLdScriptOpeningTag(openingTag: string): boolean {
  const normalizedTag = openingTag.toLowerCase();

  if (!normalizedTag.startsWith("<script")) {
    return false;
  }

  return normalizedTag.includes("application/ld+json");
}

function createContentPreview(content: string): string {
  const normalized = content
    .split("\r")
    .join(" ")
    .split("\n")
    .join(" ")
    .split("\t")
    .join(" ")
    .trim();

  if (normalized.length <= 160) {
    return normalized;
  }

  return `${normalized.slice(0, 157)}...`;
}

function sumNormalizationField(
  normalizations: EventJsonLdNormalizationResult[],
  field:
    | "event_object_count"
    | "raw_candidates"
    | "normalized_candidates"
): number {
  return normalizations.reduce((total, normalization) => {
    if (field === "event_object_count") {
      return total + normalization.event_object_count;
    }

    if (field === "raw_candidates") {
      return total + normalization.raw_candidates.length;
    }

    return total + normalization.normalized_candidates.length;
  }, 0);
}