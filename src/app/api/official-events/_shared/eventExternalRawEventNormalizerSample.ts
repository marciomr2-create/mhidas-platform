// src/app/api/official-events/_shared/eventExternalRawEventNormalizerSample.ts

import type {
  EventExternalRawEventNormalizationErrorCode,
  EventExternalRawEventNormalizerInput,
  EventExternalRawEventNormalizerResult,
} from "./eventExternalRawEventNormalizer";

import { normalizeExternalRawEvent } from "./eventExternalRawEventNormalizer";

export type EventExternalRawEventNormalizerSampleCase = {
  case_key: string;
  description: string;
  input: EventExternalRawEventNormalizerInput;
  expected_can_feed_ticketing_api_adapter: boolean;
  expected_complete_required_identity: boolean;
  expected_is_event_expired: boolean;
  expected_validation_error_codes: EventExternalRawEventNormalizationErrorCode[];
};

export type EventExternalRawEventNormalizerSampleResult = {
  case_key: string;
  description: string;
  normalization_result: EventExternalRawEventNormalizerResult;
  matched_expected_result: boolean;
};

export type EventExternalRawEventNormalizerSampleSummary = {
  sample_case_count: number;
  valid_sample_case_count: number;
  invalid_sample_case_count: number;
  external_request_performed: false;
  human_event_analysis_required: false;
  all_sample_cases_valid: boolean;
  results: EventExternalRawEventNormalizerSampleResult[];
};

export const EVENT_EXTERNAL_RAW_EVENT_NORMALIZER_SAMPLE_CASES: EventExternalRawEventNormalizerSampleCase[] =
  [
    {
      case_key: "ticketmaster_like_payload_complete",
      description:
        "Ticketmaster-like payload with nested event fields normalizes into a complete raw event signal.",
      input: {
        provider_key: "ticketmaster",
        provider_name: "Ticketmaster",
        current_date: "2026-07-07T12:00:00-03:00",
        raw_payload: {
          event: {
            id: "tm-normalizer-001",
            name: "Sample Ticketmaster Normalized Event",
            startDate: "2026-12-12T22:00:00-03:00",
            url: "https://example.com/events/tm-normalized",
          },
          venue: {
            name: "Sample Arena",
            city: "Sao Paulo",
            state: "SP",
            country: "BR",
          },
          ticketing: {
            url: "https://example.com/tickets/tm-normalized",
          },
          href: "https://example.com/api/tm-normalized",
        },
      },
      expected_can_feed_ticketing_api_adapter: true,
      expected_complete_required_identity: true,
      expected_is_event_expired: false,
      expected_validation_error_codes: [],
    },
    {
      case_key: "shotgun_like_flat_payload_complete",
      description:
        "Flat Shotgun-like payload normalizes with default aliases and no validation errors.",
      input: {
        provider_key: "shotgun",
        provider_name: "Shotgun",
        current_date: "2026-07-07T12:00:00-03:00",
        raw_payload: {
          id: "shotgun-normalizer-001",
          title: "Sample Shotgun Normalized Event",
          date: "2026-10-18T23:00:00-03:00",
          venueName: "Sample Warehouse",
          municipality: "Rio de Janeiro",
          region: "RJ",
          country: "BR",
          link: "https://example.com/events/shotgun-normalized",
          buyUrl: "https://example.com/tickets/shotgun-normalized",
          apiUrl: "https://example.com/api/shotgun-normalized",
        },
      },
      expected_can_feed_ticketing_api_adapter: true,
      expected_complete_required_identity: true,
      expected_is_event_expired: false,
      expected_validation_error_codes: [],
    },
    {
      case_key: "missing_date_blocks_adapter_feed",
      description:
        "Payload without event date is normalized but cannot feed the ticketing adapter safely.",
      input: {
        provider_key: "sympla",
        provider_name: "Sympla",
        current_date: "2026-07-07T12:00:00-03:00",
        raw_payload: {
          id: "sympla-normalizer-missing-date",
          name: "Sample Missing Date Event",
          venueName: "Sample Hall",
          city: "Belo Horizonte",
          state: "MG",
          country: "BR",
          url: "https://example.com/events/missing-date",
          ticketUrl: "https://example.com/tickets/missing-date",
        },
      },
      expected_can_feed_ticketing_api_adapter: false,
      expected_complete_required_identity: false,
      expected_is_event_expired: false,
      expected_validation_error_codes: ["missing_event_date"],
    },
    {
      case_key: "missing_official_url_blocks_adapter_feed",
      description:
        "Payload without official URL is normalized but rejected from the adapter feed.",
      input: {
        provider_key: "eventbrite",
        provider_name: "Eventbrite",
        current_date: "2026-07-07T12:00:00-03:00",
        raw_payload: {
          externalEventId: "eventbrite-normalizer-missing-url",
          eventName: "Sample Missing URL Event",
          startsAt: "2026-09-20T21:00:00-03:00",
          venueName: "Sample Park",
          city: "Curitiba",
          state: "PR",
          country: "BR",
          ticketUrl: "https://example.com/tickets/missing-url",
        },
      },
      expected_can_feed_ticketing_api_adapter: false,
      expected_complete_required_identity: false,
      expected_is_event_expired: false,
      expected_validation_error_codes: ["missing_official_url"],
    },
    {
      case_key: "expired_event_detected_by_current_date",
      description:
        "Past event is automatically marked as expired by comparing starts_at with current_date.",
      input: {
        provider_key: "blueticket",
        provider_name: "Blueticket",
        current_date: "2026-07-07T12:00:00-03:00",
        raw_payload: {
          external_event_id: "blueticket-expired-event",
          event_name: "Sample Expired Event",
          starts_at: "2026-01-10T22:00:00-03:00",
          venue_name: "Sample Beach Club",
          city: "Balneario Camboriu",
          state: "SC",
          country: "BR",
          official_url: "https://example.com/events/expired",
          ticket_url: "https://example.com/tickets/expired",
        },
      },
      expected_can_feed_ticketing_api_adapter: false,
      expected_complete_required_identity: true,
      expected_is_event_expired: true,
      expected_validation_error_codes: ["event_expired"],
    },
    {
      case_key: "custom_field_map_payload_complete",
      description:
        "Provider-specific custom field map normalizes uncommon payload keys.",
      input: {
        provider_key: "other_authorized_ticketing_api",
        provider_name: "Other Authorized Ticketing API",
        current_date: "2026-07-07T12:00:00-03:00",
        field_map: {
          external_event_id: ["providerEventCode"],
          event_name: ["headline"],
          starts_at: ["begin"],
          venue_name: ["place"],
          city: ["town"],
          state: ["province"],
          country: ["nation"],
          official_url: ["officialLink"],
          ticket_url: ["purchaseLink"],
          source_event_url: ["feedLink"],
        },
        raw_payload: {
          providerEventCode: "custom-normalizer-001",
          headline: "Sample Custom Provider Event",
          begin: "2026-11-05T22:00:00-03:00",
          place: "Sample Custom Venue",
          town: "Campinas",
          province: "SP",
          nation: "BR",
          officialLink: "https://example.com/events/custom-provider",
          purchaseLink: "https://example.com/tickets/custom-provider",
          feedLink: "https://example.com/feed/custom-provider",
        },
      },
      expected_can_feed_ticketing_api_adapter: true,
      expected_complete_required_identity: true,
      expected_is_event_expired: false,
      expected_validation_error_codes: [],
    },
  ];

function hasSameErrorCodes(
  actualErrorCodes: EventExternalRawEventNormalizationErrorCode[],
  expectedErrorCodes: EventExternalRawEventNormalizationErrorCode[]
): boolean {
  return (
    actualErrorCodes.length === expectedErrorCodes.length &&
    expectedErrorCodes.every((errorCode) =>
      actualErrorCodes.includes(errorCode)
    )
  );
}

function doesNormalizationResultMatchSampleCase(
  sampleCase: EventExternalRawEventNormalizerSampleCase,
  normalizationResult: EventExternalRawEventNormalizerResult
): boolean {
  return (
    normalizationResult.can_feed_ticketing_api_adapter ===
      sampleCase.expected_can_feed_ticketing_api_adapter &&
    normalizationResult.normalized_identity.complete_required_identity ===
      sampleCase.expected_complete_required_identity &&
    normalizationResult.normalized_signal.is_event_expired ===
      sampleCase.expected_is_event_expired &&
    hasSameErrorCodes(
      normalizationResult.validation_error_codes,
      sampleCase.expected_validation_error_codes
    ) &&
    normalizationResult.external_request_performed === false &&
    normalizationResult.human_event_analysis_required === false
  );
}

export function runEventExternalRawEventNormalizerSample(): EventExternalRawEventNormalizerSampleSummary {
  const results = EVENT_EXTERNAL_RAW_EVENT_NORMALIZER_SAMPLE_CASES.map(
    (sampleCase) => {
      const normalizationResult = normalizeExternalRawEvent(sampleCase.input);

      return {
        case_key: sampleCase.case_key,
        description: sampleCase.description,
        normalization_result: normalizationResult,
        matched_expected_result: doesNormalizationResultMatchSampleCase(
          sampleCase,
          normalizationResult
        ),
      };
    }
  );

  const validSampleCaseCount = results.filter(
    (result) => result.matched_expected_result
  ).length;

  return {
    sample_case_count: results.length,
    valid_sample_case_count: validSampleCaseCount,
    invalid_sample_case_count: results.length - validSampleCaseCount,
    external_request_performed: false,
    human_event_analysis_required: false,
    all_sample_cases_valid: validSampleCaseCount === results.length,
    results,
  };
}

export function validateEventExternalRawEventNormalizerSample(): boolean {
  const summary = runEventExternalRawEventNormalizerSample();

  return (
    summary.sample_case_count === 6 &&
    summary.valid_sample_case_count === 6 &&
    summary.invalid_sample_case_count === 0 &&
    summary.external_request_performed === false &&
    summary.human_event_analysis_required === false &&
    summary.all_sample_cases_valid === true
  );
}

export const EVENT_EXTERNAL_RAW_EVENT_NORMALIZER_SAMPLE_RESULT =
  runEventExternalRawEventNormalizerSample();

export const EVENT_EXTERNAL_RAW_EVENT_NORMALIZER_SAMPLE_IS_VALID =
  validateEventExternalRawEventNormalizerSample();