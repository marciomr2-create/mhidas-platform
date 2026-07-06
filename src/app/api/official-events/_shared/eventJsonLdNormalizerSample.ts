// src/app/api/official-events/_shared/eventJsonLdNormalizerSample.ts

import type { EventIngestionNormalizedCandidate } from "./eventIngestionContract";

import { normalizeJsonLdPayload } from "./eventJsonLdNormalizer";

export type EventJsonLdNormalizerSampleSummary = {
  event_object_count: number;
  raw_candidate_count: number;
  normalized_candidate_count: number;
  first_candidate: {
    title: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    venue_name: string | null;
    organizer_name: string | null;
    official_event_url: string | null;
    ticket_url: string | null;
    confidence_level: EventIngestionNormalizedCandidate["confidence_level"];
    can_be_confirmed_without_secondary_source: boolean;
    can_be_published_automatically: false;
    validation_issue_codes: string[];
    is_valid_for_candidate_review: boolean;
  } | null;
};

export const EVENT_JSON_LD_NORMALIZER_SAMPLE_PAYLOAD = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Sample Electronic Night",
  description:
    "Evento fictício usado apenas para validar o normalizador JSON-LD do USECLUBBERS.",
  startDate: "2026-10-10T22:00:00-03:00",
  endDate: "2026-10-11T06:00:00-03:00",
  eventTimezone: "America/Sao_Paulo",
  url: "https://example.com/events/sample-electronic-night",
  image: [
    "https://example.com/images/sample-electronic-night.jpg",
  ],
  location: {
    "@type": "Place",
    name: "Sample Club",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Rua Exemplo, 100",
      addressLocality: "São Paulo",
      addressRegion: "SP",
      addressCountry: "BR",
    },
  },
  organizer: {
    "@type": "Organization",
    name: "Sample Organizer",
    url: "https://example.com/organizers/sample",
  },
  offers: {
    "@type": "Offer",
    url: "https://example.com/tickets/sample-electronic-night",
    price: "120.00",
    priceCurrency: "BRL",
  },
} as const;

export function runEventJsonLdNormalizerSample(): EventJsonLdNormalizerSampleSummary {
  const result = normalizeJsonLdPayload(
    EVENT_JSON_LD_NORMALIZER_SAMPLE_PAYLOAD,
    {
      source: {
        display_name: "Sample JSON-LD Source",
        trust_tier: "discovery",
        authority_scope: "discovery_only",
        actor_type: "editorial_source",
      },
      source_url: "https://example.com/events/sample-electronic-night",
      raw_reference: "sample-jsonld-event-v4.8.21",
      collected_at: "2026-07-06T00:00:00.000Z",
    }
  );

  const firstCandidate = result.normalized_candidates[0] ?? null;

  return {
    event_object_count: result.event_object_count,
    raw_candidate_count: result.raw_candidates.length,
    normalized_candidate_count: result.normalized_candidates.length,
    first_candidate: firstCandidate
      ? {
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
          is_valid_for_candidate_review:
            firstCandidate.validation_issues.every(
              (issue) => issue.severity !== "error"
            ),
        }
      : null,
  };
}

export const EVENT_JSON_LD_NORMALIZER_SAMPLE_RESULT =
  runEventJsonLdNormalizerSample();