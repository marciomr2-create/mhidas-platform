// src/app/api/official-events/_shared/eventJsonLdHtmlMultiScriptSample.ts

import type { EventIngestionNormalizedCandidate } from "./eventIngestionContract";

import { normalizeJsonLdHtmlPayloads } from "./eventJsonLdHtmlExtractor";

export type EventJsonLdHtmlMultiScriptSampleFirstCandidate = {
  title: EventIngestionNormalizedCandidate["title"];
  city: EventIngestionNormalizedCandidate["city"];
  state: EventIngestionNormalizedCandidate["state"];
  country: EventIngestionNormalizedCandidate["country"];
  venue_name: EventIngestionNormalizedCandidate["venue_name"];
  organizer_name: EventIngestionNormalizedCandidate["organizer_name"];
  official_event_url: EventIngestionNormalizedCandidate["official_event_url"];
  ticket_url: EventIngestionNormalizedCandidate["ticket_url"];
  confidence_level: EventIngestionNormalizedCandidate["confidence_level"];
  can_be_confirmed_without_secondary_source: EventIngestionNormalizedCandidate["can_be_confirmed_without_secondary_source"];
  can_be_published_automatically: EventIngestionNormalizedCandidate["can_be_published_automatically"];
  validation_issue_codes: string[];
  is_valid_for_candidate_review: boolean;
};

export type EventJsonLdHtmlMultiScriptSampleSummary = {
  script_count: number;
  parsed_payload_count: number;
  parse_error_count: number;
  normalization_count: number;
  total_event_object_count: number;
  total_raw_candidate_count: number;
  total_normalized_candidate_count: number;
  non_event_payload_count: number;
  first_candidate: EventJsonLdHtmlMultiScriptSampleFirstCandidate;
};

export const EVENT_JSON_LD_HTML_MULTI_SCRIPT_SAMPLE_HTML = `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <title>Sample Multi Script Electronic Night</title>

    <script>
      window.__sampleTracking = {
        source: "ignored-regular-script"
      };
    </script>

    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Sample Multi Script Organization",
        "url": "https://example.com/organizations/sample-multi-script"
      }
    </script>

    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Eventos",
            "item": "https://example.com/events"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Sample Multi Script Electronic Night",
            "item": "https://example.com/events/sample-multi-script-electronic-night"
          }
        ]
      }
    </script>

    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "Sample Multi Script Electronic Night",
        "description": "Evento fictício usado apenas para validar múltiplos scripts JSON-LD no USECLUBBERS.",
        "startDate": "2026-12-05T22:00:00-03:00",
        "endDate": "2026-12-06T06:00:00-03:00",
        "eventTimezone": "America/Sao_Paulo",
        "url": "https://example.com/events/sample-multi-script-electronic-night",
        "image": [
          "https://example.com/images/sample-multi-script-electronic-night.jpg"
        ],
        "location": {
          "@type": "Place",
          "name": "Sample Multi Script Club",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Rua Multi Script, 300",
            "addressLocality": "São Paulo",
            "addressRegion": "SP",
            "addressCountry": "BR"
          }
        },
        "organizer": {
          "@type": "Organization",
          "name": "Sample Multi Script Organizer",
          "url": "https://example.com/organizers/sample-multi-script-organizer"
        },
        "offers": {
          "@type": "Offer",
          "url": "https://example.com/events/sample-multi-script-electronic-night/tickets",
          "price": "180.00",
          "priceCurrency": "BRL",
          "availability": "https://schema.org/InStock"
        }
      }
    </script>
  </head>
  <body>
    <main>
      <h1>Sample Multi Script Electronic Night</h1>
      <p>HTML fictício usado apenas para validar múltiplos blocos JSON-LD em memória.</p>
    </main>
  </body>
</html>
`;

export function runEventJsonLdHtmlMultiScriptSample(): EventJsonLdHtmlMultiScriptSampleSummary {
  const result = normalizeJsonLdHtmlPayloads(
    EVENT_JSON_LD_HTML_MULTI_SCRIPT_SAMPLE_HTML,
    {
      source: {
        display_name: "Sample Multi Script JSON-LD Source",
        trust_tier: "discovery",
        authority_scope: "discovery_only",
        actor_type: "editorial_source",
      },
      source_url: "https://example.com/events/sample-multi-script-electronic-night",
      raw_reference: "sample-multi-script-jsonld-event-v4.8.24",
      collected_at: "2026-07-06T00:00:00.000Z",
    }
  );

  const normalizedCandidates = result.normalizations.reduce<
    EventIngestionNormalizedCandidate[]
  >((candidates, normalization) => {
    return candidates.concat(normalization.normalized_candidates);
  }, []);

  const firstCandidate = normalizedCandidates[0];

  if (!firstCandidate) {
    throw new Error(
      "A amostra multi-script HTML JSON-LD não gerou candidato normalizado."
    );
  }

  return {
    script_count: result.extraction.script_count,
    parsed_payload_count: result.extraction.parsed_payload_count,
    parse_error_count: result.extraction.parse_errors.length,
    normalization_count: result.normalizations.length,
    total_event_object_count: result.total_event_object_count,
    total_raw_candidate_count: result.total_raw_candidate_count,
    total_normalized_candidate_count: result.total_normalized_candidate_count,
    non_event_payload_count:
      result.extraction.parsed_payload_count - result.total_event_object_count,
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

export const EVENT_JSON_LD_HTML_MULTI_SCRIPT_SAMPLE_RESULT =
  runEventJsonLdHtmlMultiScriptSample();