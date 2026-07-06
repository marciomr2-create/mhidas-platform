// src/app/api/official-events/_shared/eventJsonLdGraphSample.ts

import type { EventIngestionNormalizedCandidate } from "./eventIngestionContract";

import { normalizeJsonLdPayload } from "./eventJsonLdNormalizer";

export type EventJsonLdGraphSampleFirstCandidate = {
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

export type EventJsonLdGraphSampleSummary = {
  graph_object_count: number;
  expected_event_object_count: number;
  raw_candidate_count: number;
  normalized_candidate_count: number;
  event_object_count: number;
  has_graph_payload: boolean;
  first_candidate: EventJsonLdGraphSampleFirstCandidate;
};

export const EVENT_JSON_LD_GRAPH_SAMPLE_PAYLOAD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://example.com/#organization",
      name: "Sample Graph Organizer",
      url: "https://example.com/organizers/sample-graph-organizer",
    },
    {
      "@type": "Place",
      "@id": "https://example.com/#place",
      name: "Sample Graph Club",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Rua Graph Exemplo, 420",
        addressLocality: "São Paulo",
        addressRegion: "SP",
        addressCountry: "BR",
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://example.com/#breadcrumb",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Eventos",
          item: "https://example.com/events",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Sample Graph Electronic Night",
          item: "https://example.com/events/sample-graph-electronic-night",
        },
      ],
    },
    {
      "@type": "Event",
      "@id": "https://example.com/events/sample-graph-electronic-night/#event",
      name: "Sample Graph Electronic Night",
      description:
        "Evento fictício usado apenas para validar JSON-LD @graph no USECLUBBERS.",
      startDate: "2027-02-14T22:00:00-03:00",
      endDate: "2027-02-15T06:00:00-03:00",
      eventTimezone: "America/Sao_Paulo",
      url: "https://example.com/events/sample-graph-electronic-night",
      image: [
        "https://example.com/images/sample-graph-electronic-night.jpg",
      ],
      location: {
        "@type": "Place",
        name: "Sample Graph Club",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Rua Graph Exemplo, 420",
          addressLocality: "São Paulo",
          addressRegion: "SP",
          addressCountry: "BR",
        },
      },
      organizer: {
        "@type": "Organization",
        name: "Sample Graph Organizer",
        url: "https://example.com/organizers/sample-graph-organizer",
      },
      offers: {
        "@type": "Offer",
        url: "https://example.com/events/sample-graph-electronic-night/tickets",
        price: "210.00",
        priceCurrency: "BRL",
        availability: "https://schema.org/InStock",
      },
    },
  ],
};

export function runEventJsonLdGraphSample(): EventJsonLdGraphSampleSummary {
  const result = normalizeJsonLdPayload(EVENT_JSON_LD_GRAPH_SAMPLE_PAYLOAD, {
    source: {
      display_name: "Sample Graph JSON-LD Source",
      trust_tier: "discovery",
      authority_scope: "discovery_only",
      actor_type: "editorial_source",
    },
    source_url: "https://example.com/events/sample-graph-electronic-night",
    raw_reference: "sample-graph-jsonld-event-v4.8.26",
    collected_at: "2026-07-06T00:00:00.000Z",
  });

  const firstCandidate = result.normalized_candidates[0];

  if (!firstCandidate) {
    throw new Error("A amostra JSON-LD @graph não gerou candidato normalizado.");
  }

  return {
    graph_object_count: EVENT_JSON_LD_GRAPH_SAMPLE_PAYLOAD["@graph"].length,
    expected_event_object_count: 1,
    raw_candidate_count: result.raw_candidates.length,
    normalized_candidate_count: result.normalized_candidates.length,
    event_object_count: result.event_object_count,
    has_graph_payload: Array.isArray(EVENT_JSON_LD_GRAPH_SAMPLE_PAYLOAD["@graph"]),
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

export const EVENT_JSON_LD_GRAPH_SAMPLE_RESULT =
  runEventJsonLdGraphSample();