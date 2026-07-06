// src/app/api/official-events/_shared/eventJsonLdHtmlExtractorSample.ts

import type { EventIngestionNormalizedCandidate } from "./eventIngestionContract";

import { normalizeJsonLdHtmlPayloads } from "./eventJsonLdHtmlExtractor";

export type EventJsonLdHtmlExtractorSampleFirstCandidate = {
  title: EventIngestionNormalizedCandidate["title"];
  city: EventIngestionNormalizedCandidate["city"];
  state: EventIngestionNormalizedCandidate["state"];
  country: EventIngestionNormalizedCandidate["country"];
  venue_name: EventIngestionNormalizedCandidate["venue_name"];
  organizer_name: EventIngestionNormalizedCandidate["organizer_name"];
  official_event_url: EventIngestionNormalizedCandidate["official_event_url"];
  ticket_url: EventIngestionNormalizedCandidateTicketUrl;
  confidence_level: EventIngestionNormalizedCandidate["confidence_level"];
  can_be_confirmed_without_secondary_source: EventIngestionNormalizedCandidate["can_be_confirmed_without_secondary_source"];
  can_be_published_automatically: EventIngestionNormalizedCandidate["can_be_published_automatically"];
  validation_issue_codes: string[];
  is_valid_for_candidate_review: boolean;
};

type EventIngestionNormalizedCandidateTicketUrl =
  EventIngestionNormalizedCandidate["ticket_url"];

export type EventJsonLdHtmlExtractorSampleSummary = {
  script_count: number;
  parsed_payload_count: number;
  parse_error_count: number;
  normalization_count: number;
  total_event_object_count: number;
  total_raw_candidate_count: number;
  total_normalized_candidate_count: number;
  first_candidate: EventJsonLdHtmlExtractorSampleFirstCandidate;
};

export const EVENT_JSON_LD_HTML_EXTRACTOR_SAMPLE_HTML = `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <title>Sample HTML Electronic Night</title>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "Sample HTML Electronic Night",
        "description": "Evento fictício usado apenas para validar o extractor HTML JSON-LD do USECLUBBERS.",
        "startDate": "2026-11-14T22:00:00-03:00",
        "endDate": "2026-11-15T06:00:00-03:00",
        "eventTimezone": "America/Sao_Paulo",
        "url": "https://example.com/events/sample-html-electronic-night",
        "image": [
          "https://example.com/images/sample-html-electronic-night.jpg"
        ],
        "location": {
          "@type": "Place",
          "name": "Sample HTML Club",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Rua HTML Exemplo, 200",
            "addressLocality": "São Paulo",
            "addressRegion": "SP",
            "addressCountry": "BR"
          }
        },
        "organizer": {
          "@type": "Organization",
          "name": "Sample HTML Organizer",
          "url": "https://example.com/organizers/sample-html-organizer"
        },
        "offers": {
          "@type": "Offer",
          "url": "https://example.com/events/sample-html-electronic-night/tickets",
          "price": "150.00",
          "priceCurrency": "BRL",
          "availability": "https://schema.org/InStock"
        }
      }
    </script>
  </head>
  <body>
    <main>
      <h1>Sample HTML Electronic Night</h1>
      <p>HTML fictício usado apenas para validar extração local em memória.</p>
    </main>
  </body>
</html>
`;

export function runEventJsonLdHtmlExtractorSample(): EventJsonLdHtmlExtractorSampleSummary {
  const result = normalizeJsonLdHtmlPayloads(
    EVENT_JSON_LD_HTML_EXTRACTOR_SAMPLE_HTML,
    {
      source: {
        display_name: "Sample HTML JSON-LD Source",
        trust_tier: "discovery",
        authority_scope: "discovery_only",
        actor_type: "editorial_source",
      },
      source_url: "https://example.com/events/sample-html-electronic-night",
      raw_reference: "sample-html-jsonld-event-v4.8.23",
      collected_at: "2026-07-06T00:00:00.000Z",
    }
  );

  const firstCandidate = result.normalizations[0]?.normalized_candidates[0];

  if (!firstCandidate) {
    throw new Error("A amostra HTML JSON-LD não gerou candidato normalizado.");
  }

  return {
    script_count: result.extraction.script_count,
    parsed_payload_count: result.extraction.parsed_payload_count,
    parse_error_count: result.extraction.parse_errors.length,
    normalization_count: result.normalizations.length,
    total_event_object_count: result.total_event_object_count,
    total_raw_candidate_count: result.total_raw_candidate_count,
    total_normalized_candidate_count: result.total_normalized_candidate_count,
    first_candidate: {
      title: firstCandidate.title,
      city: firstCandidate.city,
      state: firstCandidate.state,
      country: firstCandidate.country,
      venue_name: firstCandidate.venue_name,
      organizer_name: firstCandidate.organizer_name,
      official_event_url: firstCandidate.official_event_url,
      ticket_url: firstCandidate.ticket_url,
      confidence_level: firstCandidate.confidence_level,
      can_be_confirmed_without_secondary_source:
        firstCandidate.can_be_confirmed_without_secondary_source,
      can_be_published_automatically:
        firstCandidate.can_be_published_automatically,
      validation_issue_codes: firstCandidate.validation_issues.map(
        (issue) => issue.code
      ),
      is_valid_for_candidate_review: !firstCandidate.validation_issues.some(
        (issue) => issue.severity === "error"
      ),
    },
  };
}

export const EVENT_JSON_LD_HTML_EXTRACTOR_SAMPLE_RESULT =
  runEventJsonLdHtmlExtractorSample();