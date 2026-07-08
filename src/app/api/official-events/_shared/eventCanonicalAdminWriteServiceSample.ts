// src/app/api/official-events/_shared/eventCanonicalAdminWriteServiceSample.ts

import type {
  EventCanonicalAdminConfirmationSourceEvidence,
} from "./eventCanonicalAdminConfirmationGuard";

import {
  buildEventCanonicalAdminFeatureGateProposals,
  buildEventCanonicalAdminSearchDocumentProposal,
  buildEventCanonicalAdminWriteServicePlan,
  resolveEventCanonicalAdminWriteDryRunResult,
  type EventCanonicalAdminWriteServiceRequest,
  type EventCanonicalAdminWriteServiceResult,
} from "./eventCanonicalAdminWriteService";

export type EventCanonicalAdminWriteServiceSampleSummary = {
  service_version: "v4.8.55-event-canonical-admin-write-service";
  dry_run_result: EventCanonicalAdminWriteServiceResult;
  passed_expectations: boolean;
  failed_expectation_codes: string[];
  database_write_performed: false;
  supabase_operation_performed: false;
  route_created: false;
  runtime_route_changed: false;
  visual_change_performed: false;
};

const SAMPLE_EVIDENCE: EventCanonicalAdminConfirmationSourceEvidence[] = [
  {
    source_key: "official-event-site",
    source_kind: "official_event_site",
    source_url: "https://example.com/ame-club-2026-08-15",
    authority_score: 95,
    is_official_source: true,
    supports_event_identity: true,
  },
  {
    source_key: "manual-admin-review",
    source_kind: "manual_admin_review",
    authority_score: 100,
    is_official_source: false,
    supports_event_identity: true,
  },
];

export const EVENT_CANONICAL_ADMIN_WRITE_SERVICE_SAMPLE_REQUEST: EventCanonicalAdminWriteServiceRequest =
  {
    dryRun: true,
    adminUserId: "00000000-0000-4000-8000-000000000000",
    event: {
      slug: "ame-club-2026-08-15-sao-paulo",
      event_name: "AME Club",
      starts_at: "2026-08-15T23:00:00.000-03:00",
      event_date_key: "2026-08-15",
      venue_name: "AME Club",
      city: "Sao Paulo",
      state: "SP",
      country: "BR",
      official_url: "https://example.com/ame-club-2026-08-15",
      ticket_url: "https://tickets.example.com/ame-club-2026-08-15",
      metadata: {
        sample_only: true,
      },
    },
    sourceEvidence: SAMPLE_EVIDENCE,
    existingCanonicalMatches: [],
    canonicalIdentityIsUnique: true,
  };

function collectEventCanonicalAdminWriteServiceSampleFailures(
  result: EventCanonicalAdminWriteServiceResult
): string[] {
  const failures: string[] = [];
  const plan = result.plan;

  if (!result.ok) failures.push("dry_run_result_not_ok");
  if (result.mode !== "dry_run") failures.push("mode_mismatch");
  if (result.wroteChanges !== false) failures.push("wrote_changes_mismatch");
  if (result.database_write_performed !== false) failures.push("database_write_performed_mismatch");
  if (result.supabase_operation_performed !== false) failures.push("supabase_operation_performed_mismatch");
  if (result.route_created !== false) failures.push("route_created_mismatch");
  if (result.runtime_route_changed !== false) failures.push("runtime_route_changed_mismatch");
  if (result.visual_change_performed !== false) failures.push("visual_change_performed_mismatch");
  if (result.recommendedAction !== "confirm_create_canonical_event") failures.push("recommended_action_mismatch");
  if (result.confirmationState !== "ready_for_admin_confirmation") failures.push("confirmation_state_mismatch");
  if (result.guardDecision.admin_can_confirm !== true) failures.push("admin_can_confirm_mismatch");

  if (result.guardDecision.admin_allowed_to_choose_between_ambiguous_options !== false) {
    failures.push("admin_ambiguous_choice_mismatch");
  }

  if (result.guardDecision.free_text_event_interaction_allowed !== false) {
    failures.push("free_text_event_interaction_allowed_mismatch");
  }

  if (result.guardDecision.canonical_event_id_required_for_social_features !== true) {
    failures.push("canonical_event_id_required_mismatch");
  }

  if (plan.canonicalEventPayload.validation_status !== "validated") {
    failures.push("canonical_event_validation_status_mismatch");
  }

  if (plan.canonicalEventPayload.validation_method !== "official_event_site") {
    failures.push("canonical_event_validation_method_mismatch");
  }

  if (plan.canonicalEventPayload.slug !== "ame-club-2026-08-15-sao-paulo") {
    failures.push("canonical_slug_mismatch");
  }

  if (plan.searchDocumentPayload.canonical_slug !== "ame-club-2026-08-15-sao-paulo") {
    failures.push("search_document_slug_mismatch");
  }

  if (!Array.isArray(plan.searchDocumentPayload.search_tokens)) {
    failures.push("search_tokens_not_array");
  }

  if (plan.sourcePayloads.length !== 2) {
    failures.push("source_payload_count_mismatch");
  }

  if (plan.featureFeedPayloads.length !== 7) {
    failures.push("feature_feed_payload_count_mismatch");
  }

  return failures;
}

export function runEventCanonicalAdminWriteServiceSample(): EventCanonicalAdminWriteServiceSampleSummary {
  const request = EVENT_CANONICAL_ADMIN_WRITE_SERVICE_SAMPLE_REQUEST;
  const searchDocumentProposal = buildEventCanonicalAdminSearchDocumentProposal(request);
  const featureGateProposals = buildEventCanonicalAdminFeatureGateProposals(null);
  const plan = buildEventCanonicalAdminWriteServicePlan({
    ...request,
    searchDocumentProposal,
    featureGateProposals,
  });

  const dryRunResult = resolveEventCanonicalAdminWriteDryRunResult({
    ...request,
    searchDocumentProposal,
    featureGateProposals,
  });

  const failedExpectationCodes =
    collectEventCanonicalAdminWriteServiceSampleFailures({
      ...dryRunResult,
      plan,
    });

  return {
    service_version: "v4.8.55-event-canonical-admin-write-service",
    dry_run_result: {
      ...dryRunResult,
      plan,
    },
    passed_expectations: failedExpectationCodes.length === 0,
    failed_expectation_codes: failedExpectationCodes,
    database_write_performed: false,
    supabase_operation_performed: false,
    route_created: false,
    runtime_route_changed: false,
    visual_change_performed: false,
  };
}

export function validateEventCanonicalAdminWriteServiceSample(): boolean {
  const summary = runEventCanonicalAdminWriteServiceSample();

  return (
    summary.passed_expectations === true &&
    summary.failed_expectation_codes.length === 0 &&
    summary.database_write_performed === false &&
    summary.supabase_operation_performed === false &&
    summary.route_created === false &&
    summary.runtime_route_changed === false &&
    summary.visual_change_performed === false
  );
}

export const EVENT_CANONICAL_ADMIN_WRITE_SERVICE_SAMPLE_RESULT =
  runEventCanonicalAdminWriteServiceSample();

export const EVENT_CANONICAL_ADMIN_WRITE_SERVICE_SAMPLE_IS_VALID =
  validateEventCanonicalAdminWriteServiceSample();