-- docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_ADJUSTED_DRAFT.sql
-- Version: v4.8.108-event-ticket-commercial-migration-seventh-corrected-adjusted-draft-safe
-- Base: v4.8.107-event-ticket-commercial-migration-sixth-corrected-adjusted-draft-structural-review-safe
--
-- PROTECTED DRAFT. THIS FILE IS NOT AN EXECUTABLE MIGRATION.
-- It remains outside supabase/migrations.
-- The unconditional guard below must be removed only after independent review,
-- fresh production-schema inventory, backup, dry-run and explicit approval.
--
-- This draft is normalized from the schema base. It does not concatenate the
-- incompatible correction layers from v4.8.106.

begin;

-- =============================================================================
-- 0. UNCONDITIONAL EXECUTION GUARD
-- =============================================================================

do $mhidas_guard$
begin
  raise exception 'MHIDAS_PROTECTED_DRAFT_V4_8_108';
end;
$mhidas_guard$;

-- Everything below is unreachable while the guard remains.

-- =============================================================================
-- 1. EXACT BASE-SCHEMA PREFLIGHT
-- =============================================================================

do $mhidas_preflight$
declare
  v_missing text[] := array[]::text[];
begin
  if to_regclass('public.canonical_events') is null then
    v_missing := array_append(v_missing, 'public.canonical_events');
  end if;
  if to_regclass('public.canonical_event_sources') is null then
    v_missing := array_append(v_missing, 'public.canonical_event_sources');
  end if;
  if to_regclass('public.event_sources') is null then
    v_missing := array_append(v_missing, 'public.event_sources');
  end if;
  if to_regclass('public.event_ticket_intents') is null then
    v_missing := array_append(v_missing, 'public.event_ticket_intents');
  end if;
  if to_regclass('public.partner_ticket_requests') is null then
    v_missing := array_append(v_missing, 'public.partner_ticket_requests');
  end if;
  if to_regclass('auth.users') is null then
    v_missing := array_append(v_missing, 'auth.users');
  end if;
  if to_regprocedure('gen_random_uuid()') is null then
    v_missing := array_append(v_missing, 'gen_random_uuid()');
  end if;
  if to_regprocedure('digest(bytea,text)') is null
    and to_regprocedure('digest(text,text)') is null then
    v_missing := array_append(v_missing, 'digest');
  end if;
  if to_regprocedure('public.mhidas_is_useclubbers_admin_v1(uuid)') is null then
    v_missing := array_append(v_missing, 'public.mhidas_is_useclubbers_admin_v1(uuid)');
  end if;
  if cardinality(v_missing) > 0 then
    raise exception 'V4_8_108_BASE_PREFLIGHT_MISSING: %', array_to_string(v_missing, ',');
  end if;

  if to_regclass('public.event_ticket_operation_receipts') is not null
    or to_regclass('public.event_ticket_retention_policy_versions') is not null
    or to_regclass('public.event_ticket_verified_credential_contexts') is not null then
    raise exception 'V4_8_108_TARGET_SCHEMA_ALREADY_PRESENT_OR_DRIFTED';
  end if;
end;
$mhidas_preflight$;

-- =============================================================================
-- 2. FINAL HELPERS
-- =============================================================================

create function public.mhidas_ticket_sha256_v1(p_value text)
returns text
language sql
immutable
strict
set search_path = public, pg_temp
as $mhidas_sql$
  select encode(digest(p_value, 'sha256'), 'hex');
$mhidas_sql$;

create function public.mhidas_ticket_deterministic_uuid_v1(p_value text)
returns uuid
language sql
immutable
strict
set search_path = public, pg_temp
as $mhidas_sql$
  with h as (
    select encode(digest(p_value, 'sha256'), 'hex') as value
  )
  select (
    substr(value, 1, 8) || '-' ||
    substr(value, 9, 4) || '-' ||
    '5' || substr(value, 14, 3) || '-' ||
    '8' || substr(value, 18, 3) || '-' ||
    substr(value, 21, 12)
  )::uuid
  from h;
$mhidas_sql$;

create function public.mhidas_ticket_json_object_is_minimized_v1(p_value jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $mhidas_sql$
  select coalesce(
    jsonb_typeof(p_value) = 'object'
    and not (p_value ?| array[
      'raw_url','url','email','phone','document','cpf','cnpj','token','secret',
      'authorization','cookie','ip','user_agent','full_name','address'
    ]),
    false
  );
$mhidas_sql$;

create function public.mhidas_ticket_extract_hostname_v2(p_url text)
returns text
language sql
immutable
strict
set search_path = public, pg_temp
as $mhidas_sql$
  select lower(split_part(split_part(p_url, '://', 2), '/', 1));
$mhidas_sql$;

create function public.mhidas_ticket_hostname_is_public_v2(p_hostname text)
returns boolean
language sql
immutable
strict
set search_path = public, pg_temp
as $mhidas_sql$
  select p_hostname ~ '^[a-z0-9][a-z0-9.-]{1,252}[a-z0-9]$'
    and p_hostname not in ('localhost','localhost.localdomain')
    and p_hostname not like '%.local'
    and p_hostname not like '%.internal'
    and p_hostname not like '127.%'
    and p_hostname not like '10.%'
    and p_hostname not like '192.168.%'
    and p_hostname not like '169.254.%'
    and p_hostname not like '172.16.%'
    and p_hostname not like '172.17.%'
    and p_hostname not like '172.18.%'
    and p_hostname not like '172.19.%'
    and p_hostname not like '172.2%.%'
    and p_hostname not like '172.30.%'
    and p_hostname not like '172.31.%'
    and p_hostname not like '[%';
$mhidas_sql$;

-- =============================================================================
-- 3. PARTNER AND TRUSTED-INTEGRATION REGISTRY
-- =============================================================================

create table public.commercial_partners (
  partner_id uuid primary key default gen_random_uuid(),
  partner_key text not null unique,
  legal_name text not null,
  display_name text not null,
  partner_status text not null default 'pending_verification',
  verified_by_admin_user_id uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  suspended_at timestamptz,
  deactivated_at timestamptz,
  lock_version integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_partners_key_v4108_check
    check (partner_key ~ '^[a-z0-9][a-z0-9_]{2,79}$'),
  constraint commercial_partners_status_v4108_check
    check (partner_status in ('pending_verification','verified','suspended','deactivated')),
  constraint commercial_partners_verification_v4108_check
    check (
      partner_status <> 'verified'
      or (verified_by_admin_user_id is not null and verified_at is not null)
    ),
  constraint commercial_partners_metadata_v4108_check
    check (public.mhidas_ticket_json_object_is_minimized_v1(metadata))
);

create table public.commercial_partner_representatives (
  representative_id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.commercial_partners(partner_id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  representative_role text not null,
  representation_status text not null default 'pending',
  valid_from timestamptz,
  valid_until timestamptz,
  verified_by_admin_user_id uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  revoked_by_admin_user_id uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_partner_representatives_identity_v4108_unique
    unique (partner_id, user_id),
  constraint commercial_partner_representatives_role_v4108_check
    check (representative_role in ('owner','commercial','marketing','operations','legal')),
  constraint commercial_partner_representatives_status_v4108_check
    check (representation_status in ('pending','active','suspended','revoked')),
  constraint commercial_partner_representatives_validity_v4108_check
    check (valid_until is null or valid_from is null or valid_until > valid_from),
  constraint commercial_partner_representatives_metadata_v4108_check
    check (public.mhidas_ticket_json_object_is_minimized_v1(metadata))
);

create table public.event_ticket_trusted_integrations (
  integration_id uuid primary key default gen_random_uuid(),
  integration_key text not null unique,
  principal_namespace text not null unique,
  partner_id uuid references public.commercial_partners(partner_id) on delete restrict,
  integration_status text not null default 'pending',
  current_credential_version_id uuid,
  activated_by_admin_user_id uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  suspended_at timestamptz,
  retired_at timestamptz,
  lock_version integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_ticket_integrations_key_v4108_check
    check (integration_key ~ '^[a-z0-9][a-z0-9_.-]{2,79}$'),
  constraint event_ticket_integrations_namespace_v4108_check
    check (principal_namespace ~ '^[a-z0-9][a-z0-9_.-]{2,79}$'),
  constraint event_ticket_integrations_status_v4108_check
    check (integration_status in ('pending','active','suspended','retired')),
  constraint event_ticket_integrations_partner_v4108_check
    check (integration_status <> 'active' or partner_id is not null),
  constraint event_ticket_integrations_metadata_v4108_check
    check (public.mhidas_ticket_json_object_is_minimized_v1(metadata))
);

create table public.event_ticket_trusted_integration_credential_versions (
  credential_version_id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.event_ticket_trusted_integrations(integration_id) on delete restrict,
  credential_version integer not null,
  credential_status text not null default 'pending',
  credential_fingerprint_hash text not null,
  verifier_key_hash text not null,
  valid_from timestamptz not null,
  valid_until timestamptz,
  activated_by_admin_user_id uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  revoked_by_admin_user_id uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revocation_reason_hash text,
  created_at timestamptz not null default now(),
  constraint event_ticket_credentials_pair_v4108_unique
    unique (integration_id, credential_version_id),
  constraint event_ticket_credentials_version_v4108_unique
    unique (integration_id, credential_version),
  constraint event_ticket_credentials_status_v4108_check
    check (credential_status in ('pending','active','rotating','revoked','expired')),
  constraint event_ticket_credentials_hashes_v4108_check
    check (
      credential_fingerprint_hash ~ '^[0-9a-f]{64}$'
      and verifier_key_hash ~ '^[0-9a-f]{64}$'
      and (revocation_reason_hash is null or revocation_reason_hash ~ '^[0-9a-f]{64}$')
    ),
  constraint event_ticket_credentials_validity_v4108_check
    check (valid_until is null or valid_until > valid_from)
);

alter table public.event_ticket_trusted_integrations
  add constraint event_ticket_integrations_current_credential_v4108_fk
  foreign key (integration_id, current_credential_version_id)
  references public.event_ticket_trusted_integration_credential_versions (
    integration_id,
    credential_version_id
  )
  on delete restrict;

create table public.event_ticket_trusted_integration_channels (
  integration_channel_id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.event_ticket_trusted_integrations(integration_id) on delete restrict,
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  channel_scope text not null,
  scope_status text not null default 'pending',
  valid_from timestamptz,
  valid_until timestamptz,
  approved_by_admin_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  revoked_at timestamptz,
  lock_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_ticket_integration_channels_identity_v4108_unique
    unique (integration_id, canonical_event_id, channel_scope),
  constraint event_ticket_integration_channels_scope_v4108_check
    check (channel_scope in ('purchase_signal','url_validation','conversion_confirmation')),
  constraint event_ticket_integration_channels_status_v4108_check
    check (scope_status in ('pending','active','suspended','revoked')),
  constraint event_ticket_integration_channels_validity_v4108_check
    check (valid_until is null or valid_from is null or valid_until > valid_from)
);

-- =============================================================================
-- 4. REQUEST, RETENTION AND COMMERCIAL CHANNEL CONTRACTS
-- =============================================================================

create table public.event_ticket_partnership_requests (
  request_id uuid primary key,
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  partner_id uuid not null references public.commercial_partners(partner_id) on delete restrict,
  submitted_by_user_id uuid not null references auth.users(id) on delete restrict,
  request_type text not null,
  request_status text not null default 'pending',
  event_slug_snapshot text not null,
  event_name_snapshot text not null,
  event_date_snapshot date not null,
  proposed_benefit text,
  commercial_contact_reference_hash text,
  commercial_notes_hash text,
  admin_notes_hash text,
  review_evidence_hash text,
  client_submission_key text not null,
  reviewed_by_admin_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  withdrawn_by_user_id uuid references auth.users(id) on delete set null,
  withdrawn_at timestamptz,
  lifecycle_reason_hash text,
  lock_version integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_ticket_requests_submission_v4108_unique
    unique (partner_id, client_submission_key),
  constraint event_ticket_requests_type_v4108_check
    check (request_type in (
      'ticket_sales_partnership','affiliate_campaign','discount_campaign',
      'presale_campaign','fixed_media_campaign','hybrid_commercial_partnership'
    )),
  constraint event_ticket_requests_status_v4108_check
    check (request_status in ('pending','needs_info','approved','rejected','withdrawn')),
  constraint event_ticket_requests_hashes_v4108_check
    check (
      (commercial_contact_reference_hash is null or commercial_contact_reference_hash ~ '^[0-9a-f]{64}$')
      and (commercial_notes_hash is null or commercial_notes_hash ~ '^[0-9a-f]{64}$')
      and (admin_notes_hash is null or admin_notes_hash ~ '^[0-9a-f]{64}$')
      and (review_evidence_hash is null or review_evidence_hash ~ '^[0-9a-f]{64}$')
      and (lifecycle_reason_hash is null or lifecycle_reason_hash ~ '^[0-9a-f]{64}$')
    ),
  constraint event_ticket_requests_metadata_v4108_check
    check (public.mhidas_ticket_json_object_is_minimized_v1(metadata))
);

create table public.event_ticket_retention_policy_versions (
  retention_policy_version_id uuid primary key default gen_random_uuid(),
  policy_key text not null unique,
  policy_version integer not null,
  policy_status text not null default 'draft',
  policy_purpose text not null,
  jurisdiction_code text not null,
  evidence_class text not null,
  retention_action text not null,
  retention_days integer not null,
  legal_basis_reference_hash text not null,
  policy_manifest_hash text not null,
  approved_by_admin_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  activated_at timestamptz,
  retired_at timestamptz,
  lock_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_ticket_retention_policy_version_v4108_unique
    unique (policy_key, policy_version),
  constraint event_ticket_retention_policy_status_v4108_check
    check (policy_status in ('draft','approved','active','retired')),
  constraint event_ticket_retention_policy_dimensions_v4108_check
    check (
      policy_purpose in (
        'event_ticket_tracking','commercial_governance','security_audit',
        'operation_receipt','commercial_audit'
      )
      and jurisdiction_code ~ '^[A-Z]{2}$'
      and evidence_class in (
        'clubber','redirect','trusted','admin','operation_receipt',
        'commercial_audit','credential_context'
      )
    ),
  constraint event_ticket_retention_policy_action_v4108_check
    check (retention_action in ('delete','anonymize','tombstone')),
  constraint event_ticket_retention_policy_days_v4108_check
    check (retention_days between 1 and 3650),
  constraint event_ticket_retention_policy_hashes_v4108_check
    check (
      legal_basis_reference_hash ~ '^[0-9a-f]{64}$'
      and policy_manifest_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint event_ticket_retention_policy_approval_v4108_check
    check (
      policy_status = 'draft'
      or (approved_by_admin_user_id is not null and approved_at is not null)
    )
);

create unique index event_ticket_retention_policy_active_dimension_v4108_uq
  on public.event_ticket_retention_policy_versions (
    policy_purpose,
    jurisdiction_code,
    evidence_class
  )
  where policy_status = 'active';

create table public.event_ticket_retention_minimization_rules (
  minimization_rule_id uuid primary key default gen_random_uuid(),
  retention_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  evidence_class text not null,
  source_table text not null,
  source_field text not null,
  minimization_action text not null,
  stable_hash_namespace text,
  rule_status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint event_ticket_minimization_rule_identity_v4108_unique
    unique (retention_policy_version_id, evidence_class, source_table, source_field),
  constraint event_ticket_minimization_rule_action_v4108_check
    check (minimization_action in ('delete','nullify','stable_hash','retain')),
  constraint event_ticket_minimization_rule_hash_v4108_check
    check (
      minimization_action <> 'stable_hash'
      or stable_hash_namespace ~ '^[a-z0-9][a-z0-9._-]{2,80}$'
    ),
  constraint event_ticket_minimization_rule_status_v4108_check
    check (rule_status in ('active','retired'))
);

create table public.event_ticket_commercial_channels (
  channel_id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  partner_id uuid not null references public.commercial_partners(partner_id) on delete restrict,
  request_id uuid references public.event_ticket_partnership_requests(request_id) on delete restrict,
  integration_id uuid references public.event_ticket_trusted_integrations(integration_id) on delete restrict,
  channel_status text not null default 'draft',
  channel_kind text not null,
  destination_url_ciphertext text,
  destination_url_hash text,
  destination_hostname text,
  tracking_method text not null default 'none',
  financial_model text not null,
  commission_basis_points integer,
  fixed_fee_minor bigint,
  currency_code text,
  authorized_by_admin_user_id uuid references auth.users(id) on delete set null,
  authorized_at timestamptz,
  activated_at timestamptz,
  paused_at timestamptz,
  revoked_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  url_validation_status text not null default 'pending',
  url_validated_at timestamptz,
  url_validation_expires_at timestamptz,
  last_health_checked_at timestamptz,
  last_health_check_hash text,
  url_validator_version integer,
  resolved_host_hash text,
  redirect_chain_validation_hash text,
  retention_policy_version_id uuid references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  lock_version integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_ticket_channels_status_v4108_check
    check (channel_status in ('draft','authorized','active','paused','expired','revoked')),
  constraint event_ticket_channels_kind_v4108_check
    check (channel_kind in ('official_reference','affiliate','discount','presale','fixed_media','hybrid')),
  constraint event_ticket_channels_tracking_v4108_check
    check (tracking_method in ('none','redirect','coupon','postback','webhook','partner_api')),
  constraint event_ticket_channels_financial_v4108_check
    check (
      financial_model in ('none','commission','fixed_fee','hybrid')
      and (commission_basis_points is null or commission_basis_points between 1 and 10000)
      and (fixed_fee_minor is null or fixed_fee_minor >= 0)
      and (currency_code is null or currency_code ~ '^[A-Z]{3}$')
    ),
  constraint event_ticket_channels_url_hashes_v4108_check
    check (
      (destination_url_hash is null or destination_url_hash ~ '^[0-9a-f]{64}$')
      and (last_health_check_hash is null or last_health_check_hash ~ '^[0-9a-f]{64}$')
      and (resolved_host_hash is null or resolved_host_hash ~ '^[0-9a-f]{64}$')
      and (redirect_chain_validation_hash is null or redirect_chain_validation_hash ~ '^[0-9a-f]{64}$')
    ),
  constraint event_ticket_channels_url_proof_v4108_check
    check (
      url_validation_status <> 'validated'
      or (
        url_validated_at is not null
        and url_validation_expires_at is not null
        and url_validation_expires_at > url_validated_at
        and last_health_checked_at is not null
        and last_health_check_hash is not null
        and url_validator_version is not null
        and resolved_host_hash is not null
        and redirect_chain_validation_hash is not null
        and public.mhidas_ticket_hostname_is_public_v2(destination_hostname)
      )
    ),
  constraint event_ticket_channels_metadata_v4108_check
    check (public.mhidas_ticket_json_object_is_minimized_v1(metadata))
);

create unique index event_ticket_channels_one_active_v4108_uq
  on public.event_ticket_commercial_channels (canonical_event_id)
  where channel_status = 'active';

-- =============================================================================
-- 5. RECEIPTS, CONTEXTS, SIGNALS, AUDIT AND RETENTION RUNS
-- =============================================================================

create table public.event_ticket_operation_receipts (
  receipt_id uuid primary key default gen_random_uuid(),
  operation_scope text not null,
  principal_type text not null,
  principal_id uuid,
  principal_namespace text not null,
  integration_id uuid,
  credential_version_id uuid,
  operation_name text not null,
  idempotency_key text not null,
  target_type text not null,
  target_id uuid not null,
  expected_lock_version integer,
  request_hash text not null,
  receipt_status text not null default 'pending',
  result_id uuid not null,
  result_status text not null default 'pending',
  result_version integer,
  result_hash text,
  failure_hash text,
  reserved_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  receipt_retention_policy_version_id uuid references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  anonymized_idempotency_hash text,
  anonymized_target_hash text,
  anonymized_correlation_hash text,
  correlation_id text not null,
  constraint event_ticket_receipts_credential_pair_v4108_fk
    foreign key (integration_id, credential_version_id)
    references public.event_ticket_trusted_integration_credential_versions (
      integration_id,
      credential_version_id
    )
    on delete restrict,
  constraint event_ticket_receipts_scope_v4108_check
    check (operation_scope in (
      'request_submit','request_mutation','channel_mutation','communication_mutation',
      'signal_insert','retention_run','channel_expiry','url_validation',
      'integration_mutation','integration_scope_mutation','partner_lifecycle',
      'retention_policy_mutation','credential_context_mutation','admin_signal_read'
    )),
  constraint event_ticket_receipts_principal_v4108_check
    check (
      principal_type in ('user','service_role','trusted_ticketing_integration','automation')
      and principal_namespace ~ '^[a-z0-9][a-z0-9_.:-]{1,119}$'
      and (
        (principal_type = 'user' and principal_id is not null and integration_id is null and credential_version_id is null)
        or (principal_type in ('service_role','automation') and principal_id is null)
        or (
          principal_type = 'trusted_ticketing_integration'
          and principal_id is null
          and integration_id is not null
          and credential_version_id is not null
        )
      )
    ),
  constraint event_ticket_receipts_target_v4108_check
    check (target_type in (
      'canonical_event','commercial_partner','partner_request','commercial_channel',
      'partner_communication','retention_policy','trusted_integration',
      'trusted_integration_scope','credential_context','purchase_signal',
      'retention_run','operation_receipt'
    )),
  constraint event_ticket_receipts_hashes_v4108_check
    check (
      request_hash ~ '^[0-9a-f]{64}$'
      and (result_hash is null or result_hash ~ '^[0-9a-f]{64}$')
      and (failure_hash is null or failure_hash ~ '^[0-9a-f]{64}$')
      and (anonymized_idempotency_hash is null or anonymized_idempotency_hash ~ '^[0-9a-f]{64}$')
      and (anonymized_target_hash is null or anonymized_target_hash ~ '^[0-9a-f]{64}$')
      and (anonymized_correlation_hash is null or anonymized_correlation_hash ~ '^[0-9a-f]{64}$')
    ),
  constraint event_ticket_receipts_state_v4108_check
    check (
      (receipt_status = 'pending' and completed_at is null and failed_at is null and failure_hash is null)
      or (receipt_status = 'completed' and completed_at is not null and failed_at is null and result_hash is not null)
      or (receipt_status = 'failed' and failed_at is not null and completed_at is null and failure_hash is not null)
    )
);

create unique index event_ticket_receipts_semantic_v4108_uq
  on public.event_ticket_operation_receipts (
    principal_type,
    coalesce(principal_id, '00000000-0000-0000-0000-000000000000'::uuid),
    principal_namespace,
    operation_name,
    idempotency_key
  );

create table public.event_ticket_verified_credential_contexts (
  context_id uuid primary key,
  integration_id uuid not null,
  credential_version_id uuid not null,
  context_status text not null default 'active',
  context_token_hash text not null unique,
  request_signature_hash text not null,
  issuance_request_hash text not null,
  issuance_nonce_hash text not null,
  verifier_evidence_hash text not null,
  issuer_service_key text not null,
  issued_by_verifier_key_hash text not null,
  issuance_idempotency_key text not null,
  issuance_receipt_id uuid not null references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  last_lifecycle_receipt_id uuid references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  consumed_receipt_id uuid references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  expired_at timestamptz,
  revocation_reason_hash text,
  lifecycle_correlation_hash text,
  constraint event_ticket_context_credential_pair_v4108_fk
    foreign key (integration_id, credential_version_id)
    references public.event_ticket_trusted_integration_credential_versions (
      integration_id,
      credential_version_id
    )
    on delete restrict,
  constraint event_ticket_context_semantic_issue_v4108_unique
    unique (integration_id, credential_version_id, issuance_request_hash, issuance_nonce_hash),
  constraint event_ticket_context_consumed_receipt_v4108_unique
    unique (consumed_receipt_id),
  constraint event_ticket_context_status_v4108_check
    check (context_status in ('active','consumed','revoked','expired')),
  constraint event_ticket_context_hashes_v4108_check
    check (
      context_token_hash ~ '^[0-9a-f]{64}$'
      and request_signature_hash ~ '^[0-9a-f]{64}$'
      and issuance_request_hash ~ '^[0-9a-f]{64}$'
      and issuance_nonce_hash ~ '^[0-9a-f]{64}$'
      and verifier_evidence_hash ~ '^[0-9a-f]{64}$'
      and issued_by_verifier_key_hash ~ '^[0-9a-f]{64}$'
      and (revocation_reason_hash is null or revocation_reason_hash ~ '^[0-9a-f]{64}$')
      and (lifecycle_correlation_hash is null or lifecycle_correlation_hash ~ '^[0-9a-f]{64}$')
    ),
  constraint event_ticket_context_validity_v4108_check
    check (expires_at > issued_at),
  constraint event_ticket_context_terminal_v4108_check
    check (
      (context_status <> 'consumed' or (consumed_at is not null and consumed_receipt_id is not null))
      and (context_status <> 'revoked' or revoked_at is not null)
      and (context_status <> 'expired' or expired_at is not null)
    )
);

create table public.event_ticket_click_attributions (
  click_id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  channel_id uuid not null references public.event_ticket_commercial_channels(channel_id) on delete restrict,
  redirect_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  visitor_hash text,
  campaign_hash text,
  created_at timestamptz not null default now(),
  anonymized_at timestamptz,
  constraint event_ticket_click_redirect_v4108_unique unique (redirect_id),
  constraint event_ticket_click_hashes_v4108_check
    check (
      (visitor_hash is null or visitor_hash ~ '^[0-9a-f]{64}$')
      and (campaign_hash is null or campaign_hash ~ '^[0-9a-f]{64}$')
    )
);

create table public.event_ticket_purchase_signals (
  signal_id uuid primary key,
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  channel_id uuid references public.event_ticket_commercial_channels(channel_id) on delete restrict,
  click_id uuid references public.event_ticket_click_attributions(click_id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  integration_id uuid,
  credential_version_id uuid,
  credential_context_id uuid references public.event_ticket_verified_credential_contexts(context_id) on delete restrict,
  receipt_id uuid not null unique references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  signal_type text not null,
  evidence_source text not null,
  external_transaction_hash text,
  evidence_hash text not null,
  evidence_metadata jsonb not null default '{}'::jsonb,
  retention_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  signal_status text not null default 'recorded',
  supersedes_signal_id uuid references public.event_ticket_purchase_signals(signal_id) on delete restrict,
  created_at timestamptz not null default now(),
  tombstoned_at timestamptz,
  constraint event_ticket_signal_credential_pair_v4108_fk
    foreign key (integration_id, credential_version_id)
    references public.event_ticket_trusted_integration_credential_versions (
      integration_id,
      credential_version_id
    )
    on delete restrict,
  constraint event_ticket_signal_type_v4108_check
    check (signal_type in (
      'interest','self_declared_purchase','commercial_link_click',
      'attributed_conversion','confirmed_conversion','correction'
    )),
  constraint event_ticket_signal_source_v4108_check
    check (evidence_source in (
      'clubber_action','useclubbers_redirect','coupon_report','partner_report',
      'postback','webhook','partner_api','admin_correction'
    )),
  constraint event_ticket_signal_status_v4108_check
    check (signal_status in ('recorded','superseded','tombstoned')),
  constraint event_ticket_signal_hashes_v4108_check
    check (
      evidence_hash ~ '^[0-9a-f]{64}$'
      and (external_transaction_hash is null or external_transaction_hash ~ '^[0-9a-f]{64}$')
      and public.mhidas_ticket_json_object_is_minimized_v1(evidence_metadata)
    ),
  constraint event_ticket_signal_trusted_evidence_v4108_check
    check (
      signal_type not in ('attributed_conversion','confirmed_conversion')
      or (
        integration_id is not null
        and credential_version_id is not null
        and credential_context_id is not null
        and evidence_source in ('coupon_report','partner_report','postback','webhook','partner_api')
      )
    )
);

create unique index event_ticket_signal_transaction_v4108_uq
  on public.event_ticket_purchase_signals (
    integration_id,
    external_transaction_hash,
    signal_type
  )
  where external_transaction_hash is not null
    and signal_status <> 'tombstoned';

create table public.partner_official_communications (
  communication_id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.commercial_partners(partner_id) on delete restrict,
  canonical_event_id uuid references public.canonical_events(id) on delete restrict,
  communication_status text not null default 'draft',
  audience_scope text not null,
  title text not null,
  body_hash text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  approved_by_admin_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  published_by_admin_user_id uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  revoked_at timestamptz,
  lock_version integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_communications_status_v4108_check
    check (communication_status in ('draft','submitted','approved','published','paused','revoked','expired')),
  constraint partner_communications_audience_v4108_check
    check (audience_scope in ('all_active_clubbers','event_participants','partner_event_audience')),
  constraint partner_communications_hash_v4108_check
    check (body_hash ~ '^[0-9a-f]{64}$'),
  constraint partner_communications_validity_v4108_check
    check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint partner_communications_metadata_v4108_check
    check (public.mhidas_ticket_json_object_is_minimized_v1(metadata))
);

create table public.event_ticket_retention_runs (
  retention_run_id uuid primary key,
  receipt_id uuid not null unique references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  receipt_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  audit_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  run_status text not null default 'running',
  batch_limit integer not null,
  receipt_processed_count integer not null default 0,
  audit_processed_count integer not null default 0,
  minimization_rule_count integer not null default 0,
  checkpoint jsonb not null default '{}'::jsonb,
  result_hash text,
  error_hash text,
  correlation_id text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  constraint event_ticket_retention_run_status_v4108_check
    check (run_status in ('running','completed','failed')),
  constraint event_ticket_retention_run_limit_v4108_check
    check (batch_limit between 1 and 5000),
  constraint event_ticket_retention_run_counts_v4108_check
    check (
      receipt_processed_count >= 0
      and audit_processed_count >= 0
      and minimization_rule_count >= 0
    ),
  constraint event_ticket_retention_run_hashes_v4108_check
    check (
      (result_hash is null or result_hash ~ '^[0-9a-f]{64}$')
      and (error_hash is null or error_hash ~ '^[0-9a-f]{64}$')
      and public.mhidas_ticket_json_object_is_minimized_v1(checkpoint)
    )
);

create table public.event_ticket_commercial_audit_log (
  audit_id uuid primary key default gen_random_uuid(),
  receipt_id uuid references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  target_type text not null,
  target_id uuid not null,
  canonical_event_id uuid references public.canonical_events(id) on delete restrict,
  partner_id uuid references public.commercial_partners(partner_id) on delete restrict,
  integration_id uuid,
  credential_version_id uuid,
  audit_action text not null,
  actor_role text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  previous_status text,
  next_status text,
  object_version integer,
  before_snapshot jsonb,
  after_snapshot jsonb,
  reason_hash text not null,
  correlation_id text not null,
  idempotency_key text not null,
  audit_retention_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  anonymized_target_hash text,
  anonymized_correlation_hash text,
  anonymized_idempotency_hash text,
  created_at timestamptz not null default now(),
  constraint event_ticket_audit_credential_pair_v4108_fk
    foreign key (integration_id, credential_version_id)
    references public.event_ticket_trusted_integration_credential_versions (
      integration_id,
      credential_version_id
    )
    on delete restrict,
  constraint event_ticket_audit_identity_v4108_unique
    unique (target_type, target_id, idempotency_key),
  constraint event_ticket_audit_target_v4108_check
    check (target_type in (
      'partner','representative','request','channel','communication','signal',
      'retention_run','backfill','integration','integration_scope',
      'retention_policy','credential_context','operation_receipt',
      'retention_minimization_rule'
    )),
  constraint event_ticket_audit_actor_v4108_check
    check (actor_role in (
      'useclubbers_admin','verified_partner_representative','clubber',
      'automation','system','trusted_ticketing_integration'
    )),
  constraint event_ticket_audit_hashes_v4108_check
    check (
      reason_hash ~ '^[0-9a-f]{64}$'
      and (anonymized_target_hash is null or anonymized_target_hash ~ '^[0-9a-f]{64}$')
      and (anonymized_correlation_hash is null or anonymized_correlation_hash ~ '^[0-9a-f]{64}$')
      and (anonymized_idempotency_hash is null or anonymized_idempotency_hash ~ '^[0-9a-f]{64}$')
      and (before_snapshot is null or public.mhidas_ticket_json_object_is_minimized_v1(before_snapshot))
      and (after_snapshot is null or public.mhidas_ticket_json_object_is_minimized_v1(after_snapshot))
    )
);

create table public.event_ticket_backfill_rejections (
  rejection_id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_primary_key text not null,
  classification text not null,
  rejection_reason text not null,
  canonical_event_id uuid references public.canonical_events(id) on delete set null,
  source_payload_hash text not null,
  reconciliation_run_key text not null,
  created_at timestamptz not null default now(),
  constraint event_ticket_backfill_identity_v4108_unique
    unique (reconciliation_run_key, source_table, source_primary_key),
  constraint event_ticket_backfill_source_v4108_check
    check (source_table in ('partner_ticket_requests','event_groups','event_ticket_intents')),
  constraint event_ticket_backfill_hash_v4108_check
    check (source_payload_hash ~ '^[0-9a-f]{64}$')
);

-- =============================================================================
-- 6. MATERIALIZED RETENTION TEMPLATES AND RULE MATRIX
-- =============================================================================

insert into public.event_ticket_retention_policy_versions (
  retention_policy_version_id,
  policy_key,
  policy_version,
  policy_status,
  policy_purpose,
  jurisdiction_code,
  evidence_class,
  retention_action,
  retention_days,
  legal_basis_reference_hash,
  policy_manifest_hash
)
values
  (
    '00000000-0000-4108-8000-000000000001'::uuid,
    'operation_receipt_br_template',
    1,
    'draft',
    'operation_receipt',
    'BR',
    'operation_receipt',
    'anonymize',
    730,
    repeat('0', 64),
    public.mhidas_ticket_sha256_v1('operation_receipt_br_template_v1')
  ),
  (
    '00000000-0000-4108-8000-000000000002'::uuid,
    'commercial_audit_br_template',
    1,
    'draft',
    'commercial_audit',
    'BR',
    'commercial_audit',
    'anonymize',
    1825,
    repeat('0', 64),
    public.mhidas_ticket_sha256_v1('commercial_audit_br_template_v1')
  );

insert into public.event_ticket_retention_minimization_rules (
  retention_policy_version_id,
  evidence_class,
  source_table,
  source_field,
  minimization_action,
  stable_hash_namespace
)
values
  ('00000000-0000-4108-8000-000000000001'::uuid, 'operation_receipt', 'event_ticket_operation_receipts', 'idempotency_key', 'stable_hash', 'receipt.idempotency'),
  ('00000000-0000-4108-8000-000000000001'::uuid, 'operation_receipt', 'event_ticket_operation_receipts', 'target_id', 'stable_hash', 'receipt.target'),
  ('00000000-0000-4108-8000-000000000001'::uuid, 'operation_receipt', 'event_ticket_operation_receipts', 'correlation_id', 'stable_hash', 'receipt.correlation'),
  ('00000000-0000-4108-8000-000000000002'::uuid, 'commercial_audit', 'event_ticket_commercial_audit_log', 'target_id', 'stable_hash', 'audit.target'),
  ('00000000-0000-4108-8000-000000000002'::uuid, 'commercial_audit', 'event_ticket_commercial_audit_log', 'correlation_id', 'stable_hash', 'audit.correlation'),
  ('00000000-0000-4108-8000-000000000002'::uuid, 'commercial_audit', 'event_ticket_commercial_audit_log', 'idempotency_key', 'stable_hash', 'audit.idempotency'),
  ('00000000-0000-4108-8000-000000000002'::uuid, 'commercial_audit', 'event_ticket_commercial_audit_log', 'before_snapshot', 'nullify', null),
  ('00000000-0000-4108-8000-000000000002'::uuid, 'commercial_audit', 'event_ticket_commercial_audit_log', 'after_snapshot', 'nullify', null);

-- =============================================================================
-- 7. RECEIPT-FIRST IDEMPOTENCY AUTHORITY
-- =============================================================================

create function public.mhidas_ticket_reserve_operation_receipt_v6(
  p_operation_scope text,
  p_principal_type text,
  p_principal_id uuid,
  p_principal_namespace text,
  p_integration_id uuid,
  p_credential_version_id uuid,
  p_operation_name text,
  p_idempotency_key text,
  p_target_type text,
  p_target_id uuid,
  p_expected_lock_version integer,
  p_request_hash text,
  p_correlation_id text,
  p_receipt_retention_policy_version_id uuid
)
returns public.event_ticket_operation_receipts
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_receipt public.event_ticket_operation_receipts%rowtype;
begin
  select *
  into v_receipt
  from public.event_ticket_operation_receipts r
  where r.principal_type = p_principal_type
    and r.principal_id is not distinct from p_principal_id
    and r.principal_namespace = p_principal_namespace
    and r.operation_name = p_operation_name
    and r.idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_receipt.operation_scope <> p_operation_scope
      or v_receipt.integration_id is distinct from p_integration_id
      or v_receipt.credential_version_id is distinct from p_credential_version_id
      or v_receipt.target_type <> p_target_type
      or v_receipt.target_id <> p_target_id
      or v_receipt.expected_lock_version is distinct from p_expected_lock_version
      or v_receipt.request_hash <> p_request_hash then
      raise exception 'IDEMPOTENCY_KEY_SEMANTIC_REUSE_DENIED_V6';
    end if;
    return v_receipt;
  end if;

  begin
    insert into public.event_ticket_operation_receipts (
      operation_scope,
      principal_type,
      principal_id,
      principal_namespace,
      integration_id,
      credential_version_id,
      operation_name,
      idempotency_key,
      target_type,
      target_id,
      expected_lock_version,
      request_hash,
      receipt_status,
      result_id,
      result_status,
      correlation_id,
      receipt_retention_policy_version_id
    )
    values (
      p_operation_scope,
      p_principal_type,
      p_principal_id,
      p_principal_namespace,
      p_integration_id,
      p_credential_version_id,
      p_operation_name,
      p_idempotency_key,
      p_target_type,
      p_target_id,
      p_expected_lock_version,
      p_request_hash,
      'pending',
      p_target_id,
      'pending',
      p_correlation_id,
      p_receipt_retention_policy_version_id
    )
    returning * into v_receipt;
  exception when unique_violation then
    select *
    into v_receipt
    from public.event_ticket_operation_receipts r
    where r.principal_type = p_principal_type
      and r.principal_id is not distinct from p_principal_id
      and r.principal_namespace = p_principal_namespace
      and r.operation_name = p_operation_name
      and r.idempotency_key = p_idempotency_key
    for update;

    if not found then
      raise;
    end if;

    if v_receipt.operation_scope <> p_operation_scope
      or v_receipt.integration_id is distinct from p_integration_id
      or v_receipt.credential_version_id is distinct from p_credential_version_id
      or v_receipt.target_type <> p_target_type
      or v_receipt.target_id <> p_target_id
      or v_receipt.expected_lock_version is distinct from p_expected_lock_version
      or v_receipt.request_hash <> p_request_hash then
      raise exception 'IDEMPOTENCY_KEY_CONCURRENT_SEMANTIC_REUSE_DENIED_V6';
    end if;
  end;

  return v_receipt;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_complete_operation_receipt_v3(
  p_receipt_id uuid,
  p_result_status text,
  p_result_version integer,
  p_result_hash text
)
returns public.event_ticket_operation_receipts
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_receipt public.event_ticket_operation_receipts%rowtype;
begin
  update public.event_ticket_operation_receipts
  set receipt_status = 'completed',
      result_status = p_result_status,
      result_version = p_result_version,
      result_hash = p_result_hash,
      completed_at = now(),
      failed_at = null,
      failure_hash = null
  where receipt_id = p_receipt_id
    and receipt_status = 'pending'
  returning * into v_receipt;

  if not found then
    select * into v_receipt
    from public.event_ticket_operation_receipts
    where receipt_id = p_receipt_id;
  end if;

  return v_receipt;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_fail_operation_receipt_v3(
  p_receipt_id uuid,
  p_failure_hash text
)
returns public.event_ticket_operation_receipts
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_receipt public.event_ticket_operation_receipts%rowtype;
begin
  update public.event_ticket_operation_receipts
  set receipt_status = 'failed',
      result_status = 'failed',
      failed_at = now(),
      completed_at = null,
      failure_hash = p_failure_hash
  where receipt_id = p_receipt_id
    and receipt_status = 'pending'
  returning * into v_receipt;

  if not found then
    select * into v_receipt
    from public.event_ticket_operation_receipts
    where receipt_id = p_receipt_id;
  end if;

  return v_receipt;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 8. DETERMINISTIC CREDENTIAL CONTEXT LIFECYCLE
-- =============================================================================

create function public.mhidas_ticket_issue_verified_credential_context_v3(
  p_integration_id uuid,
  p_credential_version_id uuid,
  p_context_token_hash text,
  p_request_signature_hash text,
  p_issuance_request_hash text,
  p_issuance_nonce_hash text,
  p_verifier_evidence_hash text,
  p_issuer_service_key text,
  p_issued_by_verifier_key_hash text,
  p_idempotency_key text,
  p_expires_at timestamptz,
  p_correlation_id text,
  p_receipt_retention_policy_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_namespace text;
  v_context_id uuid;
  v_request_hash text;
  v_receipt public.event_ticket_operation_receipts%rowtype;
  v_context public.event_ticket_verified_credential_contexts%rowtype;
  v_failure_hash text;
begin
  select i.principal_namespace
  into v_namespace
  from public.event_ticket_trusted_integrations i
  join public.event_ticket_trusted_integration_credential_versions c
    on c.integration_id = i.integration_id
   and c.credential_version_id = p_credential_version_id
  where i.integration_id = p_integration_id
    and i.integration_status = 'active'
    and c.credential_status = 'active'
    and c.valid_from <= now()
    and (c.valid_until is null or c.valid_until > now());

  if not found then
    raise exception 'ACTIVE_INTEGRATION_CREDENTIAL_REQUIRED_V3';
  end if;

  v_context_id := public.mhidas_ticket_deterministic_uuid_v1(
    p_integration_id::text || ':' || p_credential_version_id::text || ':' ||
    p_issuance_request_hash || ':' || p_issuance_nonce_hash
  );

  v_request_hash := public.mhidas_ticket_sha256_v1(
    p_integration_id::text || ':' || p_credential_version_id::text || ':' ||
    p_context_token_hash || ':' || p_request_signature_hash || ':' ||
    p_issuance_request_hash || ':' || p_issuance_nonce_hash || ':' ||
    p_verifier_evidence_hash || ':' || p_expires_at::text
  );

  v_receipt := public.mhidas_ticket_reserve_operation_receipt_v6(
    'credential_context_mutation',
    'trusted_ticketing_integration',
    null,
    v_namespace,
    p_integration_id,
    p_credential_version_id,
    'issue_verified_credential_context_v3',
    p_idempotency_key,
    'credential_context',
    v_context_id,
    null,
    v_request_hash,
    p_correlation_id,
    p_receipt_retention_policy_version_id
  );

  if v_receipt.receipt_status = 'completed' then
    select * into v_context
    from public.event_ticket_verified_credential_contexts
    where context_id = v_receipt.result_id;

    return jsonb_build_object(
      'status','replayed',
      'context_id',v_context.context_id,
      'context_status',v_context.context_status,
      'receipt_id',v_receipt.receipt_id
    );
  end if;

  begin
    insert into public.event_ticket_verified_credential_contexts (
      context_id,
      integration_id,
      credential_version_id,
      context_token_hash,
      request_signature_hash,
      issuance_request_hash,
      issuance_nonce_hash,
      verifier_evidence_hash,
      issuer_service_key,
      issued_by_verifier_key_hash,
      issuance_idempotency_key,
      issuance_receipt_id,
      last_lifecycle_receipt_id,
      expires_at,
      lifecycle_correlation_hash
    )
    values (
      v_context_id,
      p_integration_id,
      p_credential_version_id,
      p_context_token_hash,
      p_request_signature_hash,
      p_issuance_request_hash,
      p_issuance_nonce_hash,
      p_verifier_evidence_hash,
      p_issuer_service_key,
      p_issued_by_verifier_key_hash,
      p_idempotency_key,
      v_receipt.receipt_id,
      v_receipt.receipt_id,
      p_expires_at,
      public.mhidas_ticket_sha256_v1(p_correlation_id)
    )
    returning * into v_context;

    perform public.mhidas_ticket_complete_operation_receipt_v3(
      v_receipt.receipt_id,
      'issued',
      1,
      public.mhidas_ticket_sha256_v1(v_context.context_id::text || ':issued')
    );

    return jsonb_build_object(
      'status','issued',
      'context_id',v_context.context_id,
      'context_status',v_context.context_status,
      'receipt_id',v_receipt.receipt_id
    );
  exception when others then
    v_failure_hash := public.mhidas_ticket_sha256_v1(sqlstate || ':' || sqlerrm);
    perform public.mhidas_ticket_fail_operation_receipt_v3(v_receipt.receipt_id, v_failure_hash);
    return jsonb_build_object(
      'status','failed',
      'receipt_id',v_receipt.receipt_id,
      'failure_hash',v_failure_hash
    );
  end;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_consume_verified_credential_context_v4(
  p_context_id uuid,
  p_receipt_id uuid,
  p_signal_id uuid,
  p_integration_id uuid,
  p_credential_version_id uuid
)
returns public.event_ticket_verified_credential_contexts
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_context public.event_ticket_verified_credential_contexts%rowtype;
  v_receipt public.event_ticket_operation_receipts%rowtype;
begin
  select * into v_receipt
  from public.event_ticket_operation_receipts
  where receipt_id = p_receipt_id
  for update;

  if not found
    or v_receipt.receipt_status <> 'pending'
    or v_receipt.operation_scope <> 'signal_insert'
    or v_receipt.operation_name <> 'record_purchase_signal_v8'
    or v_receipt.target_type <> 'purchase_signal'
    or v_receipt.target_id <> p_signal_id
    or v_receipt.integration_id <> p_integration_id
    or v_receipt.credential_version_id <> p_credential_version_id
    or v_receipt.principal_type <> 'trusted_ticketing_integration' then
    raise exception 'CREDENTIAL_CONTEXT_RECEIPT_SEMANTIC_BINDING_DENIED_V4';
  end if;

  select * into v_context
  from public.event_ticket_verified_credential_contexts
  where context_id = p_context_id
  for update;

  if not found
    or v_context.context_status <> 'active'
    or v_context.integration_id <> p_integration_id
    or v_context.credential_version_id <> p_credential_version_id
    or v_context.expires_at <= now() then
    raise exception 'VERIFIED_CREDENTIAL_CONTEXT_NOT_CONSUMABLE_V4';
  end if;

  update public.event_ticket_verified_credential_contexts
  set context_status = 'consumed',
      consumed_at = now(),
      consumed_receipt_id = p_receipt_id,
      last_lifecycle_receipt_id = p_receipt_id
  where context_id = p_context_id
  returning * into v_context;

  return v_context;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 9. SINGLE-RECEIPT TRUSTED PURCHASE SIGNAL WRITER
-- =============================================================================

create function public.mhidas_record_event_ticket_purchase_signal_v8(
  p_canonical_event_id uuid,
  p_channel_id uuid,
  p_click_id uuid,
  p_integration_id uuid,
  p_credential_version_id uuid,
  p_credential_context_id uuid,
  p_signal_type text,
  p_evidence_source text,
  p_external_transaction_hash text,
  p_evidence_hash text,
  p_evidence_metadata jsonb,
  p_retention_policy_version_id uuid,
  p_idempotency_key text,
  p_correlation_id text,
  p_receipt_retention_policy_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_namespace text;
  v_signal_id uuid;
  v_request_hash text;
  v_receipt public.event_ticket_operation_receipts%rowtype;
  v_signal public.event_ticket_purchase_signals%rowtype;
  v_failure_hash text;
begin
  select i.principal_namespace
  into v_namespace
  from public.event_ticket_trusted_integrations i
  join public.event_ticket_trusted_integration_credential_versions c
    on c.integration_id = i.integration_id
   and c.credential_version_id = p_credential_version_id
  join public.event_ticket_trusted_integration_channels s
    on s.integration_id = i.integration_id
   and s.canonical_event_id = p_canonical_event_id
   and s.channel_scope = 'purchase_signal'
  where i.integration_id = p_integration_id
    and i.integration_status = 'active'
    and c.credential_status = 'active'
    and s.scope_status = 'active'
    and (s.valid_from is null or s.valid_from <= now())
    and (s.valid_until is null or s.valid_until > now());

  if not found then
    raise exception 'TRUSTED_SIGNAL_INTEGRATION_SCOPE_REQUIRED_V8';
  end if;

  v_signal_id := public.mhidas_ticket_deterministic_uuid_v1(
    p_integration_id::text || ':' || p_idempotency_key || ':' || p_signal_type
  );

  v_request_hash := public.mhidas_ticket_sha256_v1(
    p_canonical_event_id::text || ':' || coalesce(p_channel_id::text,'') || ':' ||
    coalesce(p_click_id::text,'') || ':' || p_integration_id::text || ':' ||
    p_credential_version_id::text || ':' || p_credential_context_id::text || ':' ||
    p_signal_type || ':' || p_evidence_source || ':' ||
    coalesce(p_external_transaction_hash,'') || ':' || p_evidence_hash || ':' ||
    p_evidence_metadata::text || ':' || p_retention_policy_version_id::text
  );

  v_receipt := public.mhidas_ticket_reserve_operation_receipt_v6(
    'signal_insert',
    'trusted_ticketing_integration',
    null,
    v_namespace,
    p_integration_id,
    p_credential_version_id,
    'record_purchase_signal_v8',
    p_idempotency_key,
    'purchase_signal',
    v_signal_id,
    null,
    v_request_hash,
    p_correlation_id,
    p_receipt_retention_policy_version_id
  );

  if v_receipt.receipt_status = 'completed' then
    select * into v_signal
    from public.event_ticket_purchase_signals
    where signal_id = v_receipt.result_id;

    return jsonb_build_object(
      'status','replayed',
      'signal_id',v_signal.signal_id,
      'signal_status',v_signal.signal_status,
      'receipt_id',v_receipt.receipt_id
    );
  end if;

  begin
    perform public.mhidas_ticket_consume_verified_credential_context_v4(
      p_credential_context_id,
      v_receipt.receipt_id,
      v_signal_id,
      p_integration_id,
      p_credential_version_id
    );

    insert into public.event_ticket_purchase_signals (
      signal_id,
      canonical_event_id,
      channel_id,
      click_id,
      integration_id,
      credential_version_id,
      credential_context_id,
      receipt_id,
      signal_type,
      evidence_source,
      external_transaction_hash,
      evidence_hash,
      evidence_metadata,
      retention_policy_version_id
    )
    values (
      v_signal_id,
      p_canonical_event_id,
      p_channel_id,
      p_click_id,
      p_integration_id,
      p_credential_version_id,
      p_credential_context_id,
      v_receipt.receipt_id,
      p_signal_type,
      p_evidence_source,
      p_external_transaction_hash,
      p_evidence_hash,
      p_evidence_metadata,
      p_retention_policy_version_id
    )
    returning * into v_signal;

    perform public.mhidas_ticket_complete_operation_receipt_v3(
      v_receipt.receipt_id,
      'recorded',
      1,
      public.mhidas_ticket_sha256_v1(v_signal.signal_id::text || ':recorded')
    );

    return jsonb_build_object(
      'status','recorded',
      'signal_id',v_signal.signal_id,
      'signal_status',v_signal.signal_status,
      'receipt_id',v_receipt.receipt_id
    );
  exception when others then
    v_failure_hash := public.mhidas_ticket_sha256_v1(sqlstate || ':' || sqlerrm);
    perform public.mhidas_ticket_fail_operation_receipt_v3(v_receipt.receipt_id, v_failure_hash);
    return jsonb_build_object(
      'status','failed',
      'receipt_id',v_receipt.receipt_id,
      'failure_hash',v_failure_hash
    );
  end;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 10. CLASS-SPECIFIC DURABLE RETENTION BATCH
-- =============================================================================

create function public.mhidas_run_event_ticket_governance_retention_batch_v4(
  p_batch_limit integer,
  p_idempotency_key text,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_receipt_policy uuid;
  v_audit_policy uuid;
  v_run_id uuid;
  v_receipt public.event_ticket_operation_receipts%rowtype;
  v_receipt_count integer := 0;
  v_audit_count integer := 0;
  v_rule_count integer := 0;
  v_failure_hash text;
  v_request_hash text;
begin
  select retention_policy_version_id into v_receipt_policy
  from public.event_ticket_retention_policy_versions
  where policy_status = 'active'
    and policy_purpose = 'operation_receipt'
    and jurisdiction_code = 'BR'
    and evidence_class = 'operation_receipt';

  if not found then
    raise exception 'ACTIVE_OPERATION_RECEIPT_POLICY_REQUIRED_V4';
  end if;

  select retention_policy_version_id into v_audit_policy
  from public.event_ticket_retention_policy_versions
  where policy_status = 'active'
    and policy_purpose = 'commercial_audit'
    and jurisdiction_code = 'BR'
    and evidence_class = 'commercial_audit';

  if not found then
    raise exception 'ACTIVE_COMMERCIAL_AUDIT_POLICY_REQUIRED_V4';
  end if;

  select count(*) into v_rule_count
  from public.event_ticket_retention_minimization_rules
  where rule_status = 'active'
    and retention_policy_version_id in (v_receipt_policy, v_audit_policy);

  if v_rule_count < 8 then
    raise exception 'RETENTION_MINIMIZATION_MATRIX_INCOMPLETE_V4';
  end if;

  v_run_id := public.mhidas_ticket_deterministic_uuid_v1('retention:' || p_idempotency_key);
  v_request_hash := public.mhidas_ticket_sha256_v1(
    p_batch_limit::text || ':' || v_receipt_policy::text || ':' || v_audit_policy::text
  );

  v_receipt := public.mhidas_ticket_reserve_operation_receipt_v6(
    'retention_run',
    'service_role',
    null,
    'service_role:retention',
    null,
    null,
    'run_governance_retention_batch_v4',
    p_idempotency_key,
    'retention_run',
    v_run_id,
    null,
    v_request_hash,
    p_correlation_id,
    v_receipt_policy
  );

  if v_receipt.receipt_status = 'completed' then
    return jsonb_build_object(
      'status','replayed',
      'retention_run_id',v_receipt.result_id,
      'receipt_id',v_receipt.receipt_id
    );
  end if;

  insert into public.event_ticket_retention_runs (
    retention_run_id,
    receipt_id,
    receipt_policy_version_id,
    audit_policy_version_id,
    batch_limit,
    minimization_rule_count,
    correlation_id
  )
  values (
    v_run_id,
    v_receipt.receipt_id,
    v_receipt_policy,
    v_audit_policy,
    p_batch_limit,
    v_rule_count,
    p_correlation_id
  );

  begin
    with candidates as (
      select receipt_id
      from public.event_ticket_operation_receipts
      where receipt_retention_policy_version_id = v_receipt_policy
        and reserved_at < now() - (
          select make_interval(days => retention_days)
          from public.event_ticket_retention_policy_versions
          where retention_policy_version_id = v_receipt_policy
        )
        and anonymized_idempotency_hash is null
      order by reserved_at
      limit p_batch_limit
      for update skip locked
    )
    update public.event_ticket_operation_receipts r
    set anonymized_idempotency_hash = public.mhidas_ticket_sha256_v1('receipt.idempotency:' || r.idempotency_key),
        anonymized_target_hash = public.mhidas_ticket_sha256_v1('receipt.target:' || r.target_id::text),
        anonymized_correlation_hash = public.mhidas_ticket_sha256_v1('receipt.correlation:' || r.correlation_id),
        idempotency_key = 'minimized:' || r.receipt_id::text,
        correlation_id = 'minimized:' || r.receipt_id::text
    from candidates c
    where r.receipt_id = c.receipt_id;

    get diagnostics v_receipt_count = row_count;

    with candidates as (
      select audit_id
      from public.event_ticket_commercial_audit_log
      where audit_retention_policy_version_id = v_audit_policy
        and created_at < now() - (
          select make_interval(days => retention_days)
          from public.event_ticket_retention_policy_versions
          where retention_policy_version_id = v_audit_policy
        )
        and anonymized_idempotency_hash is null
      order by created_at
      limit p_batch_limit
      for update skip locked
    )
    update public.event_ticket_commercial_audit_log a
    set anonymized_target_hash = public.mhidas_ticket_sha256_v1('audit.target:' || a.target_id::text),
        anonymized_correlation_hash = public.mhidas_ticket_sha256_v1('audit.correlation:' || a.correlation_id),
        anonymized_idempotency_hash = public.mhidas_ticket_sha256_v1('audit.idempotency:' || a.idempotency_key),
        before_snapshot = null,
        after_snapshot = null,
        correlation_id = 'minimized:' || a.audit_id::text,
        idempotency_key = 'minimized:' || a.audit_id::text
    from candidates c
    where a.audit_id = c.audit_id;

    get diagnostics v_audit_count = row_count;

    update public.event_ticket_retention_runs
    set run_status = 'completed',
        receipt_processed_count = v_receipt_count,
        audit_processed_count = v_audit_count,
        result_hash = public.mhidas_ticket_sha256_v1(
          v_run_id::text || ':' || v_receipt_count::text || ':' || v_audit_count::text
        ),
        completed_at = now()
    where retention_run_id = v_run_id;

    perform public.mhidas_ticket_complete_operation_receipt_v3(
      v_receipt.receipt_id,
      'completed',
      1,
      public.mhidas_ticket_sha256_v1(v_run_id::text || ':completed')
    );

    return jsonb_build_object(
      'status','completed',
      'retention_run_id',v_run_id,
      'receipt_id',v_receipt.receipt_id,
      'receipt_processed_count',v_receipt_count,
      'audit_processed_count',v_audit_count
    );
  exception when others then
    v_failure_hash := public.mhidas_ticket_sha256_v1(sqlstate || ':' || sqlerrm);

    update public.event_ticket_retention_runs
    set run_status = 'failed',
        error_hash = v_failure_hash,
        failed_at = now()
    where retention_run_id = v_run_id;

    perform public.mhidas_ticket_fail_operation_receipt_v3(v_receipt.receipt_id, v_failure_hash);

    return jsonb_build_object(
      'status','failed',
      'retention_run_id',v_run_id,
      'receipt_id',v_receipt.receipt_id,
      'failure_hash',v_failure_hash
    );
  end;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 11. RECEIPT-FIRST ADMINISTRATIVE LIFECYCLE
-- =============================================================================

create function public.mhidas_admin_mutate_commercial_partner_status_v4(
  p_partner_id uuid,
  p_next_status text,
  p_expected_lock_version integer,
  p_reason_hash text,
  p_idempotency_key text,
  p_correlation_id text,
  p_receipt_retention_policy_version_id uuid,
  p_audit_retention_policy_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_receipt public.event_ticket_operation_receipts%rowtype;
  v_partner public.commercial_partners%rowtype;
  v_previous_status text;
  v_request_hash text;
  v_failure_hash text;
begin
  if not public.mhidas_is_useclubbers_admin_v1(auth.uid()) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED_V4';
  end if;

  v_request_hash := public.mhidas_ticket_sha256_v1(
    p_partner_id::text || ':' || p_next_status || ':' ||
    p_expected_lock_version::text || ':' || p_reason_hash
  );

  v_receipt := public.mhidas_ticket_reserve_operation_receipt_v6(
    'partner_lifecycle',
    'user',
    auth.uid(),
    'auth:user',
    null,
    null,
    'mutate_commercial_partner_status_v4',
    p_idempotency_key,
    'commercial_partner',
    p_partner_id,
    p_expected_lock_version,
    v_request_hash,
    p_correlation_id,
    p_receipt_retention_policy_version_id
  );

  if v_receipt.receipt_status = 'completed' then
    return jsonb_build_object(
      'status','replayed',
      'partner_id',v_receipt.result_id,
      'receipt_id',v_receipt.receipt_id
    );
  end if;

  begin
    select * into v_partner
    from public.commercial_partners
    where partner_id = p_partner_id
    for update;

    if not found or v_partner.lock_version <> p_expected_lock_version then
      raise exception 'PARTNER_LOCK_VERSION_MISMATCH_V4';
    end if;

    v_previous_status := v_partner.partner_status;

    update public.commercial_partners
    set partner_status = p_next_status,
        suspended_at = case when p_next_status = 'suspended' then now() else suspended_at end,
        deactivated_at = case when p_next_status = 'deactivated' then now() else deactivated_at end,
        lock_version = lock_version + 1,
        updated_at = now()
    where partner_id = p_partner_id
    returning * into v_partner;

    insert into public.event_ticket_commercial_audit_log (
      receipt_id,
      target_type,
      target_id,
      partner_id,
      audit_action,
      actor_role,
      actor_user_id,
      previous_status,
      next_status,
      object_version,
      reason_hash,
      correlation_id,
      idempotency_key,
      audit_retention_policy_version_id
    )
    values (
      v_receipt.receipt_id,
      'partner',
      p_partner_id,
      p_partner_id,
      'partner_status_mutated',
      'useclubbers_admin',
      auth.uid(),
      v_previous_status,
      p_next_status,
      v_partner.lock_version,
      p_reason_hash,
      p_correlation_id,
      p_idempotency_key,
      p_audit_retention_policy_version_id
    );

    perform public.mhidas_ticket_complete_operation_receipt_v3(
      v_receipt.receipt_id,
      p_next_status,
      v_partner.lock_version,
      public.mhidas_ticket_sha256_v1(p_partner_id::text || ':' || p_next_status)
    );

    return jsonb_build_object(
      'status','completed',
      'partner_id',p_partner_id,
      'partner_status',p_next_status,
      'lock_version',v_partner.lock_version,
      'receipt_id',v_receipt.receipt_id
    );
  exception when others then
    v_failure_hash := public.mhidas_ticket_sha256_v1(sqlstate || ':' || sqlerrm);
    perform public.mhidas_ticket_fail_operation_receipt_v3(v_receipt.receipt_id, v_failure_hash);
    return jsonb_build_object('status','failed','receipt_id',v_receipt.receipt_id,'failure_hash',v_failure_hash);
  end;
end;
$mhidas_plpgsql$;

create function public.mhidas_admin_retire_event_ticket_retention_policy_v4(
  p_retention_policy_version_id uuid,
  p_expected_lock_version integer,
  p_reason_hash text,
  p_idempotency_key text,
  p_correlation_id text,
  p_receipt_retention_policy_version_id uuid,
  p_audit_retention_policy_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_receipt public.event_ticket_operation_receipts%rowtype;
  v_policy public.event_ticket_retention_policy_versions%rowtype;
  v_request_hash text;
  v_failure_hash text;
begin
  if not public.mhidas_is_useclubbers_admin_v1(auth.uid()) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED_V4';
  end if;

  v_request_hash := public.mhidas_ticket_sha256_v1(
    p_retention_policy_version_id::text || ':' ||
    p_expected_lock_version::text || ':' || p_reason_hash
  );

  v_receipt := public.mhidas_ticket_reserve_operation_receipt_v6(
    'retention_policy_mutation',
    'user',
    auth.uid(),
    'auth:user',
    null,
    null,
    'retire_retention_policy_v4',
    p_idempotency_key,
    'retention_policy',
    p_retention_policy_version_id,
    p_expected_lock_version,
    v_request_hash,
    p_correlation_id,
    p_receipt_retention_policy_version_id
  );

  if v_receipt.receipt_status = 'completed' then
    return jsonb_build_object(
      'status','replayed',
      'retention_policy_version_id',v_receipt.result_id,
      'receipt_id',v_receipt.receipt_id
    );
  end if;

  begin
    select * into v_policy
    from public.event_ticket_retention_policy_versions
    where retention_policy_version_id = p_retention_policy_version_id
    for update;

    if not found or v_policy.lock_version <> p_expected_lock_version then
      raise exception 'RETENTION_POLICY_LOCK_VERSION_MISMATCH_V4';
    end if;

    if v_policy.policy_status <> 'active' then
      raise exception 'ONLY_ACTIVE_RETENTION_POLICY_CAN_BE_RETIRED_V4';
    end if;

    update public.event_ticket_retention_policy_versions
    set policy_status = 'retired',
        retired_at = now(),
        lock_version = lock_version + 1,
        updated_at = now()
    where retention_policy_version_id = p_retention_policy_version_id
    returning * into v_policy;

    insert into public.event_ticket_commercial_audit_log (
      receipt_id,
      target_type,
      target_id,
      audit_action,
      actor_role,
      actor_user_id,
      previous_status,
      next_status,
      object_version,
      reason_hash,
      correlation_id,
      idempotency_key,
      audit_retention_policy_version_id
    )
    values (
      v_receipt.receipt_id,
      'retention_policy',
      p_retention_policy_version_id,
      'retention_policy_retired',
      'useclubbers_admin',
      auth.uid(),
      'active',
      'retired',
      v_policy.lock_version,
      p_reason_hash,
      p_correlation_id,
      p_idempotency_key,
      p_audit_retention_policy_version_id
    );

    perform public.mhidas_ticket_complete_operation_receipt_v3(
      v_receipt.receipt_id,
      'retired',
      v_policy.lock_version,
      public.mhidas_ticket_sha256_v1(p_retention_policy_version_id::text || ':retired')
    );

    return jsonb_build_object(
      'status','completed',
      'retention_policy_version_id',p_retention_policy_version_id,
      'policy_status','retired',
      'lock_version',v_policy.lock_version,
      'receipt_id',v_receipt.receipt_id
    );
  exception when others then
    v_failure_hash := public.mhidas_ticket_sha256_v1(sqlstate || ':' || sqlerrm);
    perform public.mhidas_ticket_fail_operation_receipt_v3(v_receipt.receipt_id, v_failure_hash);
    return jsonb_build_object('status','failed','receipt_id',v_receipt.receipt_id,'failure_hash',v_failure_hash);
  end;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 12. PUBLIC RESOLUTION, RLS AND PRIVILEGE BOUNDARIES
-- =============================================================================

create function public.mhidas_ticket_url_proof_is_fresh_v5(
  p_validation_status text,
  p_url_validated_at timestamptz,
  p_validation_expires_at timestamptz,
  p_last_health_checked_at timestamptz
)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $mhidas_sql$
  select p_validation_status = 'validated'
    and p_url_validated_at is not null
    and p_url_validated_at <= now() + interval '5 minutes'
    and p_validation_expires_at is not null
    and p_validation_expires_at > now()
    and p_last_health_checked_at is not null
    and p_last_health_checked_at <= now() + interval '5 minutes';
$mhidas_sql$;

create function public.mhidas_resolve_public_event_ticket_action_v5(p_canonical_event_id uuid)
returns table (
  action_kind text,
  action_label text,
  channel_id uuid,
  destination_url_ciphertext text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $mhidas_sql$
  select
    case
      when c.channel_id is not null then 'authorized_commercial_channel'
      when s.source_url is not null then 'official_reference'
      else 'pending_authorization'
    end,
    case
      when c.channel_id is not null then 'Comprar ingresso'
      when s.source_url is not null then 'Ver evento oficial'
      else 'Canal de vendas a confirmar'
    end,
    c.channel_id,
    c.destination_url_ciphertext
  from (select p_canonical_event_id as canonical_event_id) e
  left join lateral (
    select ch.*
    from public.event_ticket_commercial_channels ch
    where ch.canonical_event_id = e.canonical_event_id
      and ch.channel_status = 'active'
      and public.mhidas_ticket_url_proof_is_fresh_v5(
        ch.url_validation_status,
        ch.url_validated_at,
        ch.url_validation_expires_at,
        ch.last_health_checked_at
      )
      and ch.valid_from <= now()
      and (ch.valid_until is null or ch.valid_until > now())
    order by ch.activated_at desc
    limit 1
  ) c on true
  left join lateral (
    select ces.source_url
    from public.canonical_event_sources ces
    where ces.canonical_event_id = e.canonical_event_id
      and ces.source_url is not null
    order by ces.authority_score desc, ces.last_seen_at desc
    limit 1
  ) s on true;
$mhidas_sql$;

alter table public.commercial_partners enable row level security;
alter table public.commercial_partner_representatives enable row level security;
alter table public.event_ticket_trusted_integrations enable row level security;
alter table public.event_ticket_trusted_integration_credential_versions enable row level security;
alter table public.event_ticket_trusted_integration_channels enable row level security;
alter table public.event_ticket_partnership_requests enable row level security;
alter table public.event_ticket_retention_policy_versions enable row level security;
alter table public.event_ticket_retention_minimization_rules enable row level security;
alter table public.event_ticket_commercial_channels enable row level security;
alter table public.event_ticket_operation_receipts enable row level security;
alter table public.event_ticket_verified_credential_contexts enable row level security;
alter table public.event_ticket_click_attributions enable row level security;
alter table public.event_ticket_purchase_signals enable row level security;
alter table public.partner_official_communications enable row level security;
alter table public.event_ticket_retention_runs enable row level security;
alter table public.event_ticket_commercial_audit_log enable row level security;
alter table public.event_ticket_backfill_rejections enable row level security;

create policy commercial_partners_admin_read_v4108
on public.commercial_partners
for select
to authenticated
using (public.mhidas_is_useclubbers_admin_v1(auth.uid()));

create policy event_ticket_channels_admin_read_v4108
on public.event_ticket_commercial_channels
for select
to authenticated
using (public.mhidas_is_useclubbers_admin_v1(auth.uid()));

create policy event_ticket_requests_owner_or_admin_read_v4108
on public.event_ticket_partnership_requests
for select
to authenticated
using (
  submitted_by_user_id = auth.uid()
  or public.mhidas_is_useclubbers_admin_v1(auth.uid())
);

create policy event_ticket_signals_admin_read_v4108
on public.event_ticket_purchase_signals
for select
to authenticated
using (public.mhidas_is_useclubbers_admin_v1(auth.uid()));

create policy event_ticket_audit_admin_read_v4108
on public.event_ticket_commercial_audit_log
for select
to authenticated
using (public.mhidas_is_useclubbers_admin_v1(auth.uid()));

revoke all on table public.commercial_partners from anon, authenticated;
revoke all on table public.commercial_partner_representatives from anon, authenticated;
revoke all on table public.event_ticket_trusted_integrations from anon, authenticated;
revoke all on table public.event_ticket_trusted_integration_credential_versions from anon, authenticated;
revoke all on table public.event_ticket_trusted_integration_channels from anon, authenticated;
revoke all on table public.event_ticket_partnership_requests from anon, authenticated;
revoke all on table public.event_ticket_retention_policy_versions from anon, authenticated;
revoke all on table public.event_ticket_retention_minimization_rules from anon, authenticated;
revoke all on table public.event_ticket_commercial_channels from anon, authenticated;
revoke all on table public.event_ticket_operation_receipts from anon, authenticated;
revoke all on table public.event_ticket_verified_credential_contexts from anon, authenticated;
revoke all on table public.event_ticket_click_attributions from anon, authenticated;
revoke all on table public.event_ticket_purchase_signals from anon, authenticated;
revoke all on table public.partner_official_communications from anon, authenticated;
revoke all on table public.event_ticket_retention_runs from anon, authenticated;
revoke all on table public.event_ticket_commercial_audit_log from anon, authenticated;
revoke all on table public.event_ticket_backfill_rejections from anon, authenticated;

revoke all on function public.mhidas_ticket_sha256_v1(text) from public;
revoke all on function public.mhidas_ticket_deterministic_uuid_v1(text) from public;
revoke all on function public.mhidas_ticket_json_object_is_minimized_v1(jsonb) from public;
revoke all on function public.mhidas_ticket_extract_hostname_v2(text) from public;
revoke all on function public.mhidas_ticket_hostname_is_public_v2(text) from public;
revoke all on function public.mhidas_ticket_reserve_operation_receipt_v6(text,text,uuid,text,uuid,uuid,text,text,text,uuid,integer,text,text,uuid) from public;
revoke all on function public.mhidas_ticket_complete_operation_receipt_v3(uuid,text,integer,text) from public;
revoke all on function public.mhidas_ticket_fail_operation_receipt_v3(uuid,text) from public;
revoke all on function public.mhidas_ticket_issue_verified_credential_context_v3(uuid,uuid,text,text,text,text,text,text,text,text,timestamptz,text,uuid) from public;
revoke all on function public.mhidas_ticket_consume_verified_credential_context_v4(uuid,uuid,uuid,uuid,uuid) from public;
revoke all on function public.mhidas_record_event_ticket_purchase_signal_v8(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,jsonb,uuid,text,text,uuid) from public;
revoke all on function public.mhidas_run_event_ticket_governance_retention_batch_v4(integer,text,text) from public;
revoke all on function public.mhidas_admin_mutate_commercial_partner_status_v4(uuid,text,integer,text,text,text,uuid,uuid) from public;
revoke all on function public.mhidas_admin_retire_event_ticket_retention_policy_v4(uuid,integer,text,text,text,uuid,uuid) from public;
revoke all on function public.mhidas_ticket_url_proof_is_fresh_v5(text,timestamptz,timestamptz,timestamptz) from public;
revoke all on function public.mhidas_resolve_public_event_ticket_action_v5(uuid) from public;

grant execute on function public.mhidas_ticket_issue_verified_credential_context_v3(uuid,uuid,text,text,text,text,text,text,text,text,timestamptz,text,uuid) to service_role;
grant execute on function public.mhidas_record_event_ticket_purchase_signal_v8(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,jsonb,uuid,text,text,uuid) to service_role;
grant execute on function public.mhidas_run_event_ticket_governance_retention_batch_v4(integer,text,text) to service_role;
grant execute on function public.mhidas_admin_mutate_commercial_partner_status_v4(uuid,text,integer,text,text,text,uuid,uuid) to authenticated;
grant execute on function public.mhidas_admin_retire_event_ticket_retention_policy_v4(uuid,integer,text,text,text,uuid,uuid) to authenticated;
grant execute on function public.mhidas_resolve_public_event_ticket_action_v5(uuid) to anon, authenticated;

-- =============================================================================
-- 13. NORMALIZED-DDL AND NEGATIVE-TEST SELF-CHECK
-- =============================================================================

do $mhidas_v4108_self_check$
declare
  v_count integer;
begin
  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'event_ticket_retention_policy_versions'
    and column_name in ('policy_purpose','jurisdiction_code','evidence_class');

  if v_count <> 3 then
    raise exception 'V4_8_108_RETENTION_DIMENSION_COLUMN_COUNT_INVALID';
  end if;

  select count(*) into v_count
  from pg_indexes
  where schemaname = 'public'
    and indexname = 'event_ticket_retention_policy_active_dimension_v4108_uq';

  if v_count <> 1 then
    raise exception 'V4_8_108_ACTIVE_RETENTION_INDEX_COUNT_INVALID';
  end if;

  select count(*) into v_count
  from public.event_ticket_retention_minimization_rules
  where rule_status = 'active';

  if v_count <> 8 then
    raise exception 'V4_8_108_MINIMIZATION_RULE_COUNT_INVALID';
  end if;

  if exists (
    select 1
    from public.event_ticket_operation_receipts
    where principal_type = 'trusted_ticketing_integration'
      and (integration_id is null or credential_version_id is null)
  ) then
    raise exception 'V4_8_108_UNBOUND_TRUSTED_RECEIPT_FOUND';
  end if;

  if exists (
    select 1
    from public.event_ticket_verified_credential_contexts c
    join public.event_ticket_operation_receipts r
      on r.receipt_id = c.consumed_receipt_id
    where c.consumed_receipt_id is not null
      and (
        r.operation_name <> 'record_purchase_signal_v8'
        or r.target_type <> 'purchase_signal'
        or r.integration_id <> c.integration_id
        or r.credential_version_id <> c.credential_version_id
      )
  ) then
    raise exception 'V4_8_108_CONTEXT_RECEIPT_SEMANTIC_DRIFT';
  end if;
end;
$mhidas_v4108_self_check$;

-- =============================================================================
-- 14. EXPLICIT PROTECTED-DRAFT DECISION
-- =============================================================================

-- parsed_postgres_statement_count=106
-- draft_decision=seventh_corrected_adjusted_draft_ready_for_eighth_structural_review
-- normalized_schema_from_base=True
-- corrected_adjustments=10
-- critical_corrections=6
-- high_corrections=4
-- retention_dimension_ddl_redeclared=False
-- retention_dimension_contract_single=True
-- credential_context_receipt_enum_allowed=True
-- deterministic_context_issue_replay=True
-- receipt_namespace_bound=True
-- minimization_rules_materialized=True
-- evidence_class_policies_separate=True
-- failed_receipt_state_durable=True
-- admin_replay_receipt_first=True
-- credential_context_consumption_semantically_bound=True
-- promotion_allowed=False
-- executable_migration_created=False
-- sql_moved_to_supabase_migrations=False
-- supabase_operation_performed=False
-- database_write_performed=False
-- commercial_channel_activated=False
-- public_event_page_changed=False
-- v4_8_106_sixth_corrected_sql_changed=False
-- new_structural_review_required=True
-- external_prerequisites_open=True

rollback;
