// src/app/api/official-events/_shared/eventJsonLdHtmlGraphSample.ts

import type { EventIngestionNormalizedCandidate } from "./eventIngestionContract";

import { normalizeJsonLdHtmlPayloads } from "./eventJsonLdHtmlExtractor";

export type EventJsonLdHtmlGraphSampleFirstCandidate = {
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

export type EventJsonLdHtmlGraphSampleSummary = {
  script_count: number;
  parsed_payload_count: number;
  parse_error_count: number;
  normalization_count: number;
  expected_jsonld_script_count: number;
  expected_event_object_count: number;
  total_event_object_count: number;
  total_raw_candidate_count: number;
  total_normalized_candidate_count: number;
  has_graph_payload: boolean;
  first_candidate: EventJsonLdHtmlGraphSampleFirstCandidate;
};

export const EVENT_JSON_LD_HTML_GRAPH_SAMPLE_HTML = `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <title>Sample HTML Graph Electronic Night</title>

    <script>
      window.__samplePageKind = "regular-script-ignored";
    </script>

    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": "https://example.com/#organization",
            "name": "Sample HTML Graph Organizer",
            "url": "https://example.com/organizers/sample-html-graph-organizer"
          },
          {
            "@type": "Place",
            "@id": "https://example.com/#place",
            "name": "Sample HTML Graph Club",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Rua HTML Graph Exemplo, 510",
              "addressLocality": "São Paulo",
              "addressRegion": "SP",
              "addressCountry": "BR"
            }
          },
          {
            "@type": "BreadcrumbList",
            "@id": "https://example.com/#breadcrumb",
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
                "name": "Sample HTML Graph Electronic Night",
                "item": "https://example.com/events/sample-html-graph-electronic-night"
              }
            ]
          },
          {
            "@type": "Event",
            "@id": "https://example.com/events/sample-html-graph-electronic-night/#event",
            "name": "Sample HTML Graph Electronic Night",
            "description": "Evento fictício usado apenas para validar HTML com JSON-LD @graph no USECLUBBERS.",
            "startDate": "2027-03-21T22:00:00-03:00",
            "endDate": "2027-03-22T06:00:00-03:00",
            "eventTimezone": "America/Sao_Paulo",
            "url": "https://example.com/events/sample-html-graph-electronic-night",
            "image": [
              "https://example.com/images/sample-html-graph-electronic-night.jpg"
            ],
            "location": {
              "@type": "Place",
              "name": "Sample HTML Graph Club",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "Rua HTML Graph Exemplo, 510",
                "addressLocality": "São Paulo",
                "addressRegion": "SP",
                "addressCountry": "BR"
              }
            },
            "organizer": {
              "@type": "Organization",
              "name": "Sample HTML Graph Organizer",
              "url": "https://example.com/organizers/sample-html-graph-organizer"
            },
            "offers": {
              "@type": "Offer",
              "url": "https://example.com/events/sample-html-graph-electronic-night/tickets",
              "price": "240.00",
              "priceCurrency": "BRL",
              "availability": "https://schema.org/InStock"
            }
          }
        ]
      }
    </script>
  </head>
  <body>
    <main>
      <h1>Sample HTML Graph Electronic Night</h1>
      <p>HTML fictício usado apenas para validar script JSON-LD com @graph em memória.</p>
    </main>
  </body>
</html>
`;

export function runEventJsonLdHtmlGraphSample(): EventJsonLdHtmlGraphSampleSummary {
  const result = normalizeJsonLdHtmlPayloads(
    EVENT_JSON_LD_HTML_GRAPH_SAMPLE_HTML,
    {
      source: {
        display_name: "Sample HTML Graph JSON-LD Source",
        trust_tier: "discovery",
        authority_scope: "discovery_only",
        actor_type: "editorial_source",
      },
      source_url: "https://example.com/events/sample-html-graph-electronic-night",
      raw_reference: "sample-html-graph-jsonld-event-v4.8.27",
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
      "A amostra HTML com JSON-LD @graph não gerou candidato normalizado."
    );
  }

  return {
    script_count: result.extraction.script_count,
    parsed_payload_count: result.extraction.parsed_payload_count,
    parse_error_count: result.extraction.parse_errors.length,
    normalization_count: result.normalizations.length,
    expected_jsonld_script_count: 1,
    expected_event_object_count: 1,
    total_event_object_count: result.total_event_object_count,
    total_raw_candidate_count: result.total_raw_candidate_count,
    total_normalized_candidate_count: result.total_normalized_candidate_count,
    has_graph_payload: EVENT_JSON_LD_HTML_GRAPH_SAMPLE_HTML.includes('"@graph"'),
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

export const EVENT_JSON_LD_HTML_GRAPH_SAMPLE_RESULT =
  runEventJsonLdHtmlGraphSample();