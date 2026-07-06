// src/app/api/official-events/_shared/eventJsonLdHtmlInvalidJsonSample.ts

import { extractJsonLdPayloadsFromHtml } from "./eventJsonLdHtmlExtractor";

export type EventJsonLdHtmlInvalidJsonSampleSummary = {
  script_count: number;
  parsed_payload_count: number;
  parse_error_count: number;
  first_parse_error_index: number | null;
  first_parse_error_message: string | null;
  first_parse_error_preview: string | null;
  is_error_handled_without_throwing: boolean;
  can_be_published_automatically: false;
};

export const EVENT_JSON_LD_HTML_INVALID_JSON_SAMPLE_HTML = `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <title>Sample Invalid JSON-LD Electronic Night</title>

    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "Sample Invalid JSON-LD Electronic Night"
        "startDate": "2027-01-10T22:00:00-03:00",
        "url": "https://example.com/events/sample-invalid-jsonld-electronic-night"
      }
    </script>
  </head>
  <body>
    <main>
      <h1>Sample Invalid JSON-LD Electronic Night</h1>
      <p>HTML fictício usado apenas para validar erro de parse controlado.</p>
    </main>
  </body>
</html>
`;

export function runEventJsonLdHtmlInvalidJsonSample(): EventJsonLdHtmlInvalidJsonSampleSummary {
  const extraction = extractJsonLdPayloadsFromHtml(
    EVENT_JSON_LD_HTML_INVALID_JSON_SAMPLE_HTML
  );

  const firstParseError = extraction.parse_errors[0] ?? null;

  return {
    script_count: extraction.script_count,
    parsed_payload_count: extraction.parsed_payload_count,
    parse_error_count: extraction.parse_errors.length,
    first_parse_error_index: firstParseError?.index ?? null,
    first_parse_error_message: firstParseError?.message ?? null,
    first_parse_error_preview: firstParseError?.content_preview ?? null,
    is_error_handled_without_throwing:
      extraction.script_count === 1 &&
      extraction.parsed_payload_count === 0 &&
      extraction.parse_errors.length === 1,
    can_be_published_automatically: false,
  };
}

export const EVENT_JSON_LD_HTML_INVALID_JSON_SAMPLE_RESULT =
  runEventJsonLdHtmlInvalidJsonSample();