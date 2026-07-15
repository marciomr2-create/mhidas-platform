-- docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_ADJUSTED_DRAFT.sql
-- Version: v4.8.106-event-ticket-commercial-migration-sixth-corrected-adjusted-draft-safe
-- Base: v4.8.105-event-ticket-commercial-migration-fifth-corrected-adjusted-draft-structural-review-safe
--
-- PROTECTED DRAFT. THIS FILE IS NOT AN EXECUTABLE MIGRATION.
-- It must remain outside supabase/migrations until a new structural review,
-- fresh production schema inventory, external contracts, backup, dry-run,
-- reconciliation and explicit promotion approval are completed.
--
-- Safety properties:
-- - unconditional execution guard;
-- - no permissive object-replacement clauses;
-- - no Supabase operation;
-- - no database write performed by this version;
-- - transaction terminates with ROLLBACK;
-- - v4.8.90 adjusted SQL remains preserved unchanged;
-- - the v4.8.93 SQL remains preserved unchanged;
-- - nine v4.8.105 blockers are corrected in this separate eighth draft.

begin;

-- =============================================================================
-- 0. UNCONDITIONAL EXECUTION GUARD
-- =============================================================================

do $mhidas_protected_draft_guard$
begin
  raise exception using
    errcode = 'P0001',
    message = 'MHIDAS_PROTECTED_DRAFT_V4_8_106',
    detail = 'This SQL is a protected review artifact and cannot be executed.',
    hint = 'Promote only through a later reviewed migration after all external prerequisites are closed.';
end;
$mhidas_protected_draft_guard$;

-- Everything below is intentionally unreachable while the guard remains.

-- =============================================================================
-- 1. EXACT BASE-SCHEMA PREFLIGHT AND DRIFT FAILURE
-- =============================================================================

do $mhidas_exact_schema_preflight$
declare
  v_signature text;
  v_name text;
  v_target_tables text[] := array[
    'public.commercial_partners',
    'public.commercial_partner_representatives',
    'public.event_ticket_partnership_requests',
    'public.event_ticket_commercial_channels',
    'public.event_ticket_click_attributions',
    'public.event_ticket_purchase_signals',
    'public.partner_official_communications',
    'public.event_ticket_retention_policy_versions',
    'public.event_ticket_retention_runs',
    'public.event_ticket_commercial_audit_log',
    'public.event_ticket_operation_receipts',
    'public.event_ticket_backfill_rejections'
  ];
begin
  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    raise exception 'PREFLIGHT_MISSING_EXTENSION: pgcrypto';
  end if;

  if to_regclass('public.canonical_events') is null
    or to_regclass('public.canonical_event_sources') is null
    or to_regclass('public.event_sources') is null
    or to_regclass('public.event_groups') is null
    or to_regclass('public.event_ticket_intents') is null
    or to_regclass('public.partner_ticket_requests') is null then
    raise exception 'PREFLIGHT_MISSING_REQUIRED_BASE_TABLE';
  end if;

  select string_agg(
    a.attname || ':' || t.typname || ':' || a.attnotnull::text,
    ',' order by a.attnum
  )
  into v_signature
  from pg_attribute a
  join pg_type t on t.oid = a.atttypid
  where a.attrelid = 'public.canonical_event_sources'::regclass
    and a.attnum > 0
    and not a.attisdropped;

  if v_signature <> concat_ws(',',
    'id:uuid:true',
    'canonical_event_id:uuid:true',
    'source_key:text:true',
    'source_kind:text:true',
    'provider_key:text:false',
    'external_event_id:text:false',
    'source_url:text:false',
    'authority_score:int4:true',
    'ingestion_mode:text:true',
    'integration_status:text:true',
    'source_payload_summary:jsonb:true',
    'last_seen_at:timestamptz:false',
    'created_by:uuid:false',
    'created_at:timestamptz:true'
  ) then
    raise exception 'PREFLIGHT_SCHEMA_DRIFT: canonical_event_sources signature=%', v_signature;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.canonical_event_sources'::regclass
      and conname = 'canonical_event_sources_unique_source'
      and contype = 'u'
  ) then
    raise exception 'PREFLIGHT_MISSING_CONSTRAINT: canonical_event_sources_unique_source';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'canonical_event_sources'
      and policyname = 'Authenticated users can read canonical event sources'
      and cmd = 'SELECT'
  ) then
    raise exception 'PREFLIGHT_POLICY_DRIFT: canonical_event_sources';
  end if;

  if to_regprocedure('public.mhidas_is_useclubbers_admin_v1(uuid)') is null then
    raise exception 'EXTERNAL_PREREQUISITE_MISSING: admin_authorization_rpc_contract';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_groups'
      and column_name = 'partner_ticket_url'
      and data_type = 'text'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_ticket_intents'
      and column_name = 'status'
      and data_type = 'text'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'partner_ticket_requests'
      and column_name = 'request_status'
      and data_type = 'text'
  ) then
    raise exception 'PREFLIGHT_LEGACY_SCHEMA_DRIFT';
  end if;

  foreach v_name in array v_target_tables loop
    if to_regclass(v_name) is not null then
      raise exception 'PREFLIGHT_TARGET_OBJECT_ALREADY_EXISTS: %', v_name;
    end if;
  end loop;

  if to_regprocedure('public.mhidas_admin_mutate_event_ticket_commercial_channel_v2(text,uuid,integer,jsonb,text,text,text)') is not null then
    raise exception 'PREFLIGHT_TARGET_FUNCTION_ALREADY_EXISTS';
  end if;

  if to_regprocedure('public.mhidas_record_event_ticket_channel_url_validation_v2(uuid,integer,jsonb,text,text)') is not null then
    raise exception 'PREFLIGHT_TARGET_FUNCTION_ALREADY_EXISTS: url_validation';
  end if;
end;
$mhidas_exact_schema_preflight$;

-- =============================================================================
-- 2. VERSIONED SAFETY HELPERS
-- =============================================================================

create function public.mhidas_ticket_extract_hostname_v1(p_url text)
returns text
language sql
immutable
strict
as $mhidas_sql$
  select lower((regexp_match(p_url, '^https://([^/?#]+)(?:[/?#]|$)', 'i'))[1]);
$mhidas_sql$;

create function public.mhidas_ticket_hostname_is_structurally_public_v1(p_hostname text)
returns boolean
language sql
immutable
strict
as $mhidas_sql$
  select
    p_hostname = lower(p_hostname)
    and p_hostname ~ '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$'
    and p_hostname !~ '\.\.'
    and p_hostname !~ ':'
    and p_hostname <> 'localhost'
    and p_hostname !~ '(^|\.)localhost$'
    and p_hostname !~ '\.local$'
    and p_hostname !~ '\.internal$'
    and p_hostname !~ '^[0-9.]+$'
    and p_hostname !~ '^\[.*\]$'
    and length(p_hostname) between 4 and 253;
$mhidas_sql$;

create function public.mhidas_ticket_domain_matches_v1(
  p_hostname text,
  p_authorized_domain text,
  p_allow_subdomains boolean
)
returns boolean
language sql
immutable
strict
as $mhidas_sql$
  select p_hostname = p_authorized_domain
    or (p_allow_subdomains and p_hostname like '%.' || p_authorized_domain);
$mhidas_sql$;

create function public.mhidas_ticket_request_hash_v2(p_payload jsonb)
returns text
language sql
immutable
strict
as $mhidas_sql$
  select encode(digest(p_payload::text, 'sha256'), 'hex');
$mhidas_sql$;

create function public.mhidas_ticket_scalar_is_safe_v2(p_value jsonb)
returns boolean
language plpgsql
immutable
strict
as $mhidas_plpgsql$
declare
  v_text text;
begin
  if jsonb_typeof(p_value) in ('null','boolean','number') then
    return true;
  end if;

  if jsonb_typeof(p_value) <> 'string' then
    return false;
  end if;

  v_text := trim(both '"' from p_value::text);
  if octet_length(v_text) > 256 then
    return false;
  end if;

  if v_text ~* '(https?://|www\.|bearer[[:space:]]|token[=:]|secret[=:]|password[=:])'
    or v_text ~* '(^|[^a-z0-9])[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}([^a-z0-9]|$)'
    or v_text ~ '(^|[^0-9])\+?[0-9][0-9 ()-]{7,}[0-9]([^0-9]|$)'
    or v_text ~ '(^|[^0-9])([0-9]{1,3}\.){3}[0-9]{1,3}([^0-9]|$)' then
    return false;
  end if;

  return true;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_metadata_is_allowed_v2(
  p_context text,
  p_value jsonb
)
returns boolean
language plpgsql
immutable
strict
as $mhidas_plpgsql$
declare
  v_allowed_keys text[];
  v_key text;
  v_child jsonb;
  v_count integer := 0;
begin
  if jsonb_typeof(p_value) <> 'object'
    or octet_length(p_value::text) > 2048 then
    return false;
  end if;

  v_allowed_keys := case p_context
    when 'commercial_partner' then array['category','country_code','source_kind','registry_version']
    when 'partner_representative' then array['role_source','verification_method','registry_version']
    when 'partnership_request' then array['submission_channel','campaign_key','request_version']
    when 'commercial_channel' then array['channel_kind','tracking_version','validator_policy_version']
    when 'click_attribution' then array['attribution_model','campaign_kind','collector_version']
    when 'purchase_signal' then array['signal_origin','evidence_version','retention_class']
    when 'partner_communication' then array['audience_kind','delivery_kind','content_version']
    when 'retention_checkpoint' then array['completed_at','batch_limit','tombstoned_count','skipped_count']
    when 'audit_snapshot' then array[
      'request_id','request_status','canonical_event_id','partner_id','channel_status',
      'communication_status','signal_type','evidence_source','trusted_evidence_verified',
      'lock_version','retention_result','policy_version','run_id','tombstoned_count',
      'skipped_count','click_deleted_count','click_anonymized_count',
      'url_validation_status','url_health_status','url_validator_version',
      'url_validation_expires_at','last_health_checked_at'
    ]
    else null
  end;

  if v_allowed_keys is null then
    return false;
  end if;

  for v_key, v_child in select key, value from jsonb_each(p_value)
  loop
    v_count := v_count + 1;
    if v_count > 20 or not (v_key = any(v_allowed_keys)) then
      return false;
    end if;
    if not public.mhidas_ticket_scalar_is_safe_v2(v_child) then
      return false;
    end if;
  end loop;

  return true;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_url_proof_is_fresh_v2(
  p_validation_status text,
  p_validation_expires_at timestamptz,
  p_health_status text,
  p_last_health_checked_at timestamptz,
  p_validator_version integer,
  p_resolved_host_hash text,
  p_redirect_chain_hash text
)
returns boolean
language sql
stable
as $mhidas_sql$
  select p_validation_status = 'validated'
    and p_validation_expires_at is not null
    and p_validation_expires_at > now()
    and p_health_status = 'healthy'
    and p_last_health_checked_at is not null
    and p_last_health_checked_at > now() - interval '24 hours'
    and p_validator_version is not null
    and p_validator_version >= 1
    and p_resolved_host_hash ~ '^[0-9a-f]{64}$'
    and p_redirect_chain_hash ~ '^[0-9a-f]{64}$';
$mhidas_sql$;

-- =============================================================================
-- 3. OFFICIAL REFERENCE URL AND DOMAIN INTEGRITY
-- =============================================================================

alter table public.canonical_event_sources
  add column reference_status text not null default 'candidate',
  add column reference_domain text,
  add column reference_url_hash text,
  add column reference_hash_algorithm text,
  add column reference_hash_version integer,
  add column validated_at timestamptz,
  add column validated_by_role text,
  add column validated_by_user_id uuid references auth.users(id) on delete set null,
  add column validation_evidence_hash text,
  add column updated_at timestamptz not null default now();

alter table public.canonical_event_sources
  add constraint canonical_event_sources_reference_status_v490_check
    check (reference_status in ('candidate', 'validated', 'stale', 'rejected')),
  add constraint canonical_event_sources_reference_domain_v490_check
    check (
      reference_domain is null
      or (
        reference_domain = lower(reference_domain)
        and public.mhidas_ticket_hostname_is_structurally_public_v1(reference_domain)
      )
    ),
  add constraint canonical_event_sources_reference_hash_v490_check
    check (
      reference_url_hash is null
      or (
        reference_hash_algorithm = 'sha256'
        and reference_hash_version = 1
        and reference_url_hash ~ '^[0-9a-f]{64}$'
      )
    ),
  add constraint canonical_event_sources_validated_evidence_v490_check
    check (
      reference_status <> 'validated'
      or (
        source_url is not null
        and reference_domain is not null
        and reference_url_hash is not null
        and validation_evidence_hash ~ '^[0-9a-f]{64}$'
        and validated_at is not null
        and validated_by_role in ('useclubbers_admin', 'trusted_source_validator')
        and public.mhidas_ticket_domain_matches_v1(
          public.mhidas_ticket_extract_hostname_v1(source_url),
          reference_domain,
          true
        )
      )
    );

create function public.mhidas_canonical_event_source_reference_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $mhidas_plpgsql$
begin
  if tg_op = 'UPDATE' and new.source_url is distinct from old.source_url then
    new.reference_status := 'stale';
    new.reference_url_hash := null;
    new.reference_hash_algorithm := null;
    new.reference_hash_version := null;
    new.validated_at := null;
    new.validated_by_role := null;
    new.validated_by_user_id := null;
    new.validation_evidence_hash := null;
  end if;

  if new.reference_status = 'validated'
    and not public.mhidas_ticket_domain_matches_v1(
      public.mhidas_ticket_extract_hostname_v1(new.source_url),
      new.reference_domain,
      true
    ) then
    raise exception 'REFERENCE_DOMAIN_URL_MISMATCH';
  end if;

  new.updated_at := now();
  return new;
end;
$mhidas_plpgsql$;

create trigger canonical_event_sources_reference_guard_v490
before insert or update on public.canonical_event_sources
for each row execute function public.mhidas_canonical_event_source_reference_guard_v1();

revoke select on public.canonical_event_sources from anon, authenticated;
grant select (
  id, canonical_event_id, source_key, source_kind, provider_key,
  external_event_id, source_url, authority_score, ingestion_mode,
  integration_status, source_payload_summary, last_seen_at, created_by, created_at
) on public.canonical_event_sources to authenticated;
revoke insert, update, delete on public.canonical_event_sources from anon, authenticated;

-- =============================================================================
-- 4. VERIFIED PARTNER REGISTRY
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
  constraint commercial_partners_key_v490_check
    check (partner_key ~ '^[a-z0-9][a-z0-9_]{2,79}$'),
  constraint commercial_partners_status_v490_check
    check (partner_status in ('pending_verification', 'verified', 'suspended', 'deactivated')),
  constraint commercial_partners_verified_v490_check
    check (
      partner_status <> 'verified'
      or (verified_by_admin_user_id is not null and verified_at is not null)
    ),
  constraint commercial_partners_metadata_v490_check
    check (
      jsonb_typeof(metadata) = 'object'
      and public.mhidas_ticket_metadata_is_allowed_v2('commercial_partner', metadata)
    )
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
  constraint commercial_partner_representatives_role_v490_check
    check (representative_role in ('owner', 'commercial', 'marketing', 'operations', 'legal')),
  constraint commercial_partner_representatives_status_v490_check
    check (representation_status in ('pending', 'active', 'suspended', 'revoked')),
  constraint commercial_partner_representatives_validity_v490_check
    check (valid_until is null or valid_from is null or valid_until > valid_from),
  constraint commercial_partner_representatives_active_v490_check
    check (
      representation_status <> 'active'
      or (verified_by_admin_user_id is not null and verified_at is not null)
    ),
  constraint commercial_partner_representatives_metadata_v490_check
    check (
      jsonb_typeof(metadata) = 'object'
      and public.mhidas_ticket_metadata_is_allowed_v2('partner_representative', metadata)
    ),
  constraint commercial_partner_representatives_identity_v490_unique
    unique (partner_id, user_id)
);

create index commercial_partners_status_v490_idx
  on public.commercial_partners (partner_status, updated_at desc);

create index commercial_partner_representatives_lookup_v490_idx
  on public.commercial_partner_representatives (
    partner_id, user_id, representation_status, valid_until
  );


create function public.mhidas_ticket_partner_representative_is_authorized_v2(
  p_partner_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $mhidas_sql$
  select exists (
    select 1
    from public.commercial_partner_representatives r
    join public.commercial_partners p on p.partner_id = r.partner_id
    where r.partner_id = p_partner_id
      and r.user_id = p_user_id
      and p.partner_status = 'verified'
      and r.representation_status = 'active'
      and (r.valid_from is null or r.valid_from <= now())
      and (r.valid_until is null or r.valid_until > now())
  );
$mhidas_sql$;


-- =============================================================================
-- 5. PARTNER REQUEST LIFECYCLE
-- =============================================================================

create table public.event_ticket_partnership_requests (
  request_id uuid primary key,
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  partner_id uuid not null references public.commercial_partners(partner_id) on delete restrict,
  submitted_by_user_id uuid not null references auth.users(id) on delete restrict,
  partner_type text not null,
  request_type text not null,
  request_status text not null default 'pending',
  event_slug_snapshot text not null,
  event_name_snapshot text not null,
  event_date_snapshot date not null,
  city_snapshot text,
  state_snapshot text,
  venue_name_snapshot text,
  current_sales_url_hash text,
  proposed_benefit text,
  commercial_contact_reference_id text,
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
  constraint event_ticket_partnership_requests_partner_type_v490_check
    check (partner_type in ('agency','event','artist','label','club','producer','ticketing','other')),
  constraint event_ticket_partnership_requests_request_type_v490_check
    check (request_type in (
      'ticket_sales_partnership','affiliate_campaign','discount_campaign',
      'presale_campaign','fixed_media_campaign','hybrid_commercial_partnership'
    )),
  constraint event_ticket_partnership_requests_status_v490_check
    check (request_status in ('pending','needs_info','approved','rejected','withdrawn')),
  constraint event_ticket_partnership_requests_hashes_v490_check
    check (
      (current_sales_url_hash is null or current_sales_url_hash ~ '^[0-9a-f]{64}$')
      and (commercial_notes_hash is null or commercial_notes_hash ~ '^[0-9a-f]{64}$')
      and (admin_notes_hash is null or admin_notes_hash ~ '^[0-9a-f]{64}$')
      and (review_evidence_hash is null or review_evidence_hash ~ '^[0-9a-f]{64}$')
      and (lifecycle_reason_hash is null or lifecycle_reason_hash ~ '^[0-9a-f]{64}$')
    ),
  constraint event_ticket_partnership_requests_review_v490_check
    check (
      request_status not in ('approved','rejected')
      or (
        reviewed_by_admin_user_id is not null
        and reviewed_at is not null
        and review_evidence_hash is not null
        and lifecycle_reason_hash is not null
      )
    ),
  constraint event_ticket_partnership_requests_withdrawal_v490_check
    check (
      request_status <> 'withdrawn'
      or (
        withdrawn_by_user_id is not null
        and withdrawn_at is not null
        and lifecycle_reason_hash is not null
      )
    ),
  constraint event_ticket_partnership_requests_metadata_v490_check
    check (
      jsonb_typeof(metadata) = 'object'
      and public.mhidas_ticket_metadata_is_allowed_v2('partnership_request', metadata)
    )
);

create unique index event_ticket_partnership_requests_submission_v490_uq
  on public.event_ticket_partnership_requests (partner_id, client_submission_key);

create index event_ticket_partnership_requests_event_status_v490_idx
  on public.event_ticket_partnership_requests (
    canonical_event_id, request_status, created_at desc
  );

-- =============================================================================
-- 6. RETENTION POLICY CONTRACT BEFORE TRACKING
-- =============================================================================

create table public.event_ticket_retention_policy_versions (
  retention_policy_version_id uuid primary key default gen_random_uuid(),
  policy_version integer not null unique,
  policy_status text not null default 'draft',
  legal_basis_reference_hash text not null,
  policy_manifest_hash text not null,
  click_action text not null,
  click_retention_days integer not null,
  signal_action text not null,
  signal_retention_days integer not null,
  approved_by_admin_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  activated_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  constraint event_ticket_retention_policy_status_v490_check
    check (policy_status in ('draft','approved','active','retired')),
  constraint event_ticket_retention_policy_hashes_v490_check
    check (
      legal_basis_reference_hash ~ '^[0-9a-f]{64}$'
      and policy_manifest_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint event_ticket_retention_policy_actions_v490_check
    check (
      click_action in ('delete','anonymize')
      and signal_action = 'tombstone_all'
    ),
  constraint event_ticket_retention_policy_days_v490_check
    check (
      click_retention_days between 1 and 3650
      and signal_retention_days between 1 and 3650
    ),
  constraint event_ticket_retention_policy_approval_v490_check
    check (
      policy_status = 'draft'
      or (approved_by_admin_user_id is not null and approved_at is not null)
    ),
  constraint event_ticket_retention_policy_activation_v490_check
    check (policy_status <> 'active' or activated_at is not null)
);

create unique index event_ticket_retention_policy_one_active_v490_uq
  on public.event_ticket_retention_policy_versions ((1))
  where policy_status = 'active';

-- =============================================================================
-- 7. COMMERCIAL CHANNEL, FINANCIAL MATRIX AND URL PROOF
-- =============================================================================

create table public.event_ticket_commercial_channels (
  channel_id uuid primary key,
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  source_request_id uuid references public.event_ticket_partnership_requests(request_id) on delete restrict,
  partner_id uuid references public.commercial_partners(partner_id) on delete restrict,
  source_origin text not null,
  ticketing_provider_key text,
  ticketing_display_name text,
  authorized_domain text not null,
  allow_subdomains boolean not null default false,
  commercial_url text not null,
  validated_hostname text not null,
  validated_final_hostname text not null,
  url_validation_status text not null default 'pending',
  url_validation_algorithm text,
  url_validation_version integer,
  url_validation_hash text,
  dns_public_validation_hash text,
  redirect_chain_validation_hash text,
  validated_final_url_hash text,
  url_validated_at timestamptz,
  url_validation_expires_at timestamptz,
  url_validated_by_service text,
  url_validator_version integer,
  url_health_status text not null default 'unknown',
  resolved_host_hash text,
  tracking_method text not null default 'none',
  tracking_secret_ref text,
  tracking_parameter_name text,
  retention_policy_version_id uuid references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  remuneration_model text not null,
  remuneration_percent_bps integer,
  remuneration_fixed_minor bigint,
  currency text,
  financial_terms_version integer not null,
  financial_terms_hash text not null,
  authorization_reference_id text not null,
  authorization_evidence_hash text not null,
  authorization_starts_at timestamptz not null,
  authorization_ends_at timestamptz,
  public_priority integer not null default 100,
  channel_status text not null default 'draft',
  disclosure_text text,
  created_by_admin_user_id uuid not null references auth.users(id) on delete restrict,
  authorized_by_admin_user_id uuid references auth.users(id) on delete set null,
  activated_by_admin_user_id uuid references auth.users(id) on delete set null,
  paused_by_admin_user_id uuid references auth.users(id) on delete set null,
  revoked_by_admin_user_id uuid references auth.users(id) on delete set null,
  expired_by_actor_role text,
  superseded_by_admin_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  authorized_at timestamptz,
  activated_at timestamptz,
  paused_at timestamptz,
  revoked_at timestamptz,
  expired_at timestamptz,
  superseded_at timestamptz,
  updated_at timestamptz not null default now(),
  last_health_checked_at timestamptz,
  last_health_check_hash text,
  lock_version integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  constraint event_ticket_commercial_channels_origin_v490_check
    check (source_origin in (
      'admin_entry','approved_partner_request','commercial_contract'
    )),
  constraint event_ticket_commercial_channels_domain_v490_check
    check (
      authorized_domain = lower(authorized_domain)
      and validated_hostname = lower(validated_hostname)
      and validated_final_hostname = lower(validated_final_hostname)
      and public.mhidas_ticket_hostname_is_structurally_public_v1(authorized_domain)
      and public.mhidas_ticket_hostname_is_structurally_public_v1(validated_hostname)
      and public.mhidas_ticket_hostname_is_structurally_public_v1(validated_final_hostname)
    ),
  constraint event_ticket_commercial_channels_url_structure_v490_check
    check (
      commercial_url ~* '^https://[^[:space:]]+$'
      and commercial_url !~ '@'
      and public.mhidas_ticket_extract_hostname_v1(commercial_url) = validated_hostname
      and public.mhidas_ticket_domain_matches_v1(
        validated_hostname, authorized_domain, allow_subdomains
      )
      and public.mhidas_ticket_domain_matches_v1(
        validated_final_hostname, authorized_domain, allow_subdomains
      )
    ),
  constraint event_ticket_commercial_channels_url_validation_v490_check
    check (url_validation_status in ('pending','validated','stale','rejected')),
  constraint event_ticket_commercial_channels_url_proof_v490_check
    check (
      url_validation_status <> 'validated'
      or (
        url_validation_algorithm = 'sha256'
        and url_validation_version = 1
        and url_validation_hash ~ '^[0-9a-f]{64}$'
        and dns_public_validation_hash ~ '^[0-9a-f]{64}$'
        and redirect_chain_validation_hash ~ '^[0-9a-f]{64}$'
        and validated_final_url_hash ~ '^[0-9a-f]{64}$'
        and url_validated_at is not null
        and url_validation_expires_at is not null
        and url_validation_expires_at > url_validated_at
        and length(btrim(url_validated_by_service)) > 0
        and url_validator_version >= 1
        and url_health_status = 'healthy'
        and resolved_host_hash ~ '^[0-9a-f]{64}$'
      )
    ),
  constraint event_ticket_commercial_channels_url_health_v493_check
    check (url_health_status in ('unknown','healthy','degraded','unhealthy')),
  constraint event_ticket_commercial_channels_tracking_v490_check
    check (tracking_method in (
      'query_parameter','coupon_code','affiliate_id','path_segment',
      'postback','webhook','partner_api','manual_report','none'
    )),
  constraint event_ticket_commercial_channels_tracking_secret_v490_check
    check (
      tracking_method not in ('postback','webhook','partner_api')
      or tracking_secret_ref is not null
    ),
  constraint event_ticket_commercial_channels_tracking_retention_v490_check
    check (tracking_method = 'none' or retention_policy_version_id is not null),
  constraint event_ticket_commercial_channels_financial_hash_v490_check
    check (
      financial_terms_version >= 1
      and financial_terms_hash ~ '^[0-9a-f]{64}$'
      and authorization_evidence_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint event_ticket_commercial_channels_financial_matrix_v490_check
    check (
      (
        remuneration_model = 'commission_percent'
        and remuneration_percent_bps between 1 and 10000
        and remuneration_fixed_minor is null
        and currency is null
      )
      or (
        remuneration_model = 'commission_fixed_per_ticket'
        and remuneration_percent_bps is null
        and remuneration_fixed_minor > 0
        and currency ~ '^[A-Z]{3}$'
      )
      or (
        remuneration_model = 'service_fee_share'
        and remuneration_percent_bps between 1 and 10000
        and remuneration_fixed_minor is null
        and currency is null
      )
      or (
        remuneration_model in ('fixed_campaign','licensing')
        and remuneration_percent_bps is null
        and remuneration_fixed_minor > 0
        and currency ~ '^[A-Z]{3}$'
      )
      or (
        remuneration_model = 'hybrid'
        and remuneration_percent_bps between 1 and 10000
        and remuneration_fixed_minor > 0
        and currency ~ '^[A-Z]{3}$'
      )
      or (
        remuneration_model = 'no_remuneration'
        and remuneration_percent_bps is null
        and remuneration_fixed_minor is null
        and currency is null
      )
    ),
  constraint event_ticket_commercial_channels_validity_v490_check
    check (
      authorization_ends_at is null
      or authorization_ends_at > authorization_starts_at
    ),
  constraint event_ticket_commercial_channels_status_v490_check
    check (channel_status in (
      'draft','authorized','active','paused','expired','superseded','revoked'
    )),
  constraint event_ticket_commercial_channels_status_evidence_v490_check
    check (
      channel_status = 'draft'
      or (
        channel_status = 'authorized'
        and authorized_by_admin_user_id is not null
        and authorized_at is not null
      )
      or (
        channel_status = 'active'
        and authorized_by_admin_user_id is not null
        and authorized_at is not null
        and activated_by_admin_user_id is not null
        and activated_at is not null
        and url_validation_status = 'validated'
      )
      or (
        channel_status = 'paused'
        and paused_by_admin_user_id is not null
        and paused_at is not null
      )
      or (
        channel_status = 'expired'
        and expired_at is not null
        and expired_by_actor_role in ('useclubbers_admin','automation','system')
      )
      or (
        channel_status = 'superseded'
        and superseded_by_admin_user_id is not null
        and superseded_at is not null
      )
      or (
        channel_status = 'revoked'
        and revoked_by_admin_user_id is not null
        and revoked_at is not null
      )
    ),
  constraint event_ticket_commercial_channels_health_hash_v490_check
    check (
      last_health_check_hash is null
      or last_health_check_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint event_ticket_commercial_channels_metadata_v490_check
    check (
      jsonb_typeof(metadata) = 'object'
      and public.mhidas_ticket_metadata_is_allowed_v2('commercial_channel', metadata)
    )
);

create unique index event_ticket_commercial_channels_one_active_v490_uq
  on public.event_ticket_commercial_channels (canonical_event_id)
  where channel_status = 'active';

create index event_ticket_commercial_channels_event_status_v490_idx
  on public.event_ticket_commercial_channels (
    canonical_event_id, channel_status, public_priority, updated_at desc
  );

create index event_ticket_commercial_channels_validity_v490_idx
  on public.event_ticket_commercial_channels (
    channel_status, authorization_ends_at
  )
  where channel_status in ('authorized','active','paused');

-- =============================================================================
-- 8. CLICK ATTRIBUTION WITH VERSIONED HASHES
-- =============================================================================

create table public.event_ticket_click_attributions (
  click_id uuid primary key,
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  channel_id uuid not null references public.event_ticket_commercial_channels(channel_id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  session_attribution_hash text,
  redirect_token_hash text not null,
  destination_url_hash text not null,
  hash_algorithm text not null default 'sha256',
  hash_version integer not null default 1,
  campaign_id text,
  consent_basis text not null,
  clicked_at timestamptz not null default now(),
  retention_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  retention_expires_at timestamptz not null,
  retention_processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint event_ticket_click_attributions_hash_v490_check
    check (
      hash_algorithm = 'sha256'
      and hash_version = 1
      and redirect_token_hash ~ '^[0-9a-f]{64}$'
      and destination_url_hash ~ '^[0-9a-f]{64}$'
      and (
        session_attribution_hash is null
        or session_attribution_hash ~ '^[0-9a-f]{64}$'
      )
    ),
  constraint event_ticket_click_attributions_consent_v490_check
    check (consent_basis in (
      'consent','contract','legitimate_interest','not_applicable'
    )),
  constraint event_ticket_click_attributions_retention_v490_check
    check (retention_expires_at > clicked_at),
  constraint event_ticket_click_attributions_metadata_v490_check
    check (
      jsonb_typeof(metadata) = 'object'
      and public.mhidas_ticket_metadata_is_allowed_v2('click_attribution', metadata)
    )
);

create unique index event_ticket_click_attributions_redirect_v490_uq
  on public.event_ticket_click_attributions (
    hash_algorithm, hash_version, redirect_token_hash
  );

create index event_ticket_click_attributions_retention_v490_idx
  on public.event_ticket_click_attributions (retention_expires_at, click_id)
  where retention_processed_at is null;

-- =============================================================================
-- 9. APPEND-ONLY PURCHASE SIGNAL LINEAGE
-- =============================================================================

create table public.event_ticket_purchase_signals (
  signal_id uuid primary key,
  parent_signal_id uuid references public.event_ticket_purchase_signals(signal_id) on delete restrict,
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  channel_id uuid references public.event_ticket_commercial_channels(channel_id) on delete restrict,
  click_id uuid references public.event_ticket_click_attributions(click_id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  signal_type text not null,
  evidence_source text not null,
  trusted_evidence_verified boolean not null default false,
  provider_namespace text,
  transaction_hash text,
  transaction_hash_algorithm text,
  transaction_hash_version integer,
  evidence_hash text,
  signature_validation_hash text,
  replay_nonce_hash text,
  attribution_campaign_id text,
  gross_amount_minor bigint,
  commission_amount_minor bigint,
  currency text,
  recorded_at timestamptz not null default now(),
  trusted_confirmed_at timestamptz,
  trusted_confirmed_by_actor_role text,
  retention_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  retention_expires_at timestamptz not null,
  retention_processed_at timestamptz,
  retention_result text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  constraint event_ticket_purchase_signals_type_v490_check
    check (signal_type in (
      'interest','commercial_link_click','self_declared_purchase',
      'attributed_conversion','confirmed_conversion','correction'
    )),
  constraint event_ticket_purchase_signals_evidence_v490_check
    check (evidence_source in (
      'clubber_action','useclubbers_redirect','coupon_report','partner_report',
      'postback','webhook','partner_api','admin_correction'
    )),
  constraint event_ticket_purchase_signals_lineage_v490_check
    check (
      signal_type not in ('confirmed_conversion','correction')
      or parent_signal_id is not null
    ),
  constraint event_ticket_purchase_signals_conversion_channel_v490_check
    check (
      signal_type not in ('attributed_conversion','confirmed_conversion')
      or channel_id is not null
    ),
  constraint event_ticket_purchase_signals_trusted_conversion_v490_check
    check (
      signal_type not in ('attributed_conversion','confirmed_conversion')
      or (
        trusted_evidence_verified
        and provider_namespace ~ '^[a-z0-9][a-z0-9_.-]{1,79}$'
        and transaction_hash_algorithm = 'sha256'
        and transaction_hash_version = 1
        and transaction_hash ~ '^[0-9a-f]{64}$'
        and evidence_hash ~ '^[0-9a-f]{64}$'
        and signature_validation_hash ~ '^[0-9a-f]{64}$'
        and replay_nonce_hash ~ '^[0-9a-f]{64}$'
        and trusted_confirmed_at is not null
        and trusted_confirmed_by_actor_role = 'trusted_ticketing_integration'
      )
    ),
  constraint event_ticket_purchase_signals_self_declared_v490_check
    check (
      signal_type <> 'self_declared_purchase'
      or (
        trusted_evidence_verified = false
        and transaction_hash is null
        and gross_amount_minor is null
        and commission_amount_minor is null
      )
    ),
  constraint event_ticket_purchase_signals_amounts_v490_check
    check (
      (gross_amount_minor is null or gross_amount_minor >= 0)
      and (commission_amount_minor is null or commission_amount_minor >= 0)
      and (
        (
          gross_amount_minor is null
          and commission_amount_minor is null
          and currency is null
        )
        or currency ~ '^[A-Z]{3}$'
      )
    ),
  constraint event_ticket_purchase_signals_retention_v490_check
    check (retention_expires_at > recorded_at),
  constraint event_ticket_purchase_signals_metadata_v490_check
    check (
      jsonb_typeof(metadata) = 'object'
      and public.mhidas_ticket_metadata_is_allowed_v2('purchase_signal', metadata)
    )
);

create unique index event_ticket_purchase_signals_idempotency_v490_uq
  on public.event_ticket_purchase_signals (idempotency_key);

create unique index event_ticket_purchase_signals_transaction_v490_uq
  on public.event_ticket_purchase_signals (
    provider_namespace,
    transaction_hash_algorithm,
    transaction_hash_version,
    transaction_hash
  )
  where transaction_hash is not null;

create unique index event_ticket_purchase_signals_nonce_v490_uq
  on public.event_ticket_purchase_signals (
    provider_namespace, replay_nonce_hash
  )
  where replay_nonce_hash is not null;

-- =============================================================================
-- 10. COMMUNICATION LIFECYCLE
-- =============================================================================

create table public.partner_official_communications (
  communication_id uuid primary key,
  partner_id uuid not null references public.commercial_partners(partner_id) on delete restrict,
  canonical_event_id uuid references public.canonical_events(id) on delete restrict,
  commercial_channel_id uuid references public.event_ticket_commercial_channels(channel_id) on delete restrict,
  submitted_by_user_id uuid not null references auth.users(id) on delete restrict,
  communication_type text not null,
  communication_status text not null default 'draft',
  title text not null,
  body text not null,
  benefit_code text,
  starts_at timestamptz,
  ends_at timestamptz,
  submitted_at timestamptz,
  approved_by_admin_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  published_by_admin_user_id uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  paused_by_admin_user_id uuid references auth.users(id) on delete set null,
  paused_at timestamptz,
  expired_by_actor_role text,
  expired_at timestamptz,
  rejected_by_admin_user_id uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  lifecycle_reason_hash text,
  review_evidence_hash text,
  lock_version integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_official_communications_type_v490_check
    check (communication_type in (
      'ticket_batch_change','ticket_presale','ticket_discount','giveaway',
      'music_release','lineup_update','official_after','location_notice',
      'schedule_change','vip_experience','promotional_code',
      'exclusive_content','community_call'
    )),
  constraint partner_official_communications_status_v490_check
    check (communication_status in (
      'draft','submitted','approved','published','paused','expired','rejected'
    )),
  constraint partner_official_communications_validity_v490_check
    check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint partner_official_communications_commercial_context_v490_check
    check (
      communication_type not in (
        'ticket_batch_change','ticket_presale','ticket_discount','giveaway',
        'vip_experience','promotional_code'
      )
      or (canonical_event_id is not null and commercial_channel_id is not null)
    ),
  constraint partner_official_communications_evidence_v490_check
    check (
      communication_status not in (
        'approved','published','paused','expired','rejected'
      )
      or lifecycle_reason_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint partner_official_communications_review_v490_check
    check (
      communication_status not in ('approved','published')
      or (
        approved_by_admin_user_id is not null
        and approved_at is not null
        and review_evidence_hash ~ '^[0-9a-f]{64}$'
      )
    ),
  constraint partner_official_communications_publish_v490_check
    check (
      communication_status <> 'published'
      or (
        published_by_admin_user_id is not null
        and published_at is not null
      )
    ),
  constraint partner_official_communications_metadata_v490_check
    check (
      jsonb_typeof(metadata) = 'object'
      and public.mhidas_ticket_metadata_is_allowed_v2('partner_communication', metadata)
    )
);

create index partner_official_communications_public_v490_idx
  on public.partner_official_communications (
    communication_status, starts_at, ends_at
  )
  where communication_status = 'published';

-- =============================================================================
-- 11. RETENTION RUNS, AUDIT, RECEIPTS AND REJECTIONS
-- =============================================================================

create table public.event_ticket_retention_runs (
  retention_run_id uuid primary key default gen_random_uuid(),
  retention_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  run_status text not null default 'running',
  batch_limit integer not null,
  click_deleted_count integer not null default 0,
  click_anonymized_count integer not null default 0,
  signal_tombstoned_count integer not null default 0,
  signal_skipped_count integer not null default 0,
  checkpoint jsonb not null default '{}'::jsonb,
  error_hash text,
  correlation_id text not null,
  idempotency_key text not null unique,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint event_ticket_retention_runs_status_v490_check
    check (run_status in ('running','completed','failed')),
  constraint event_ticket_retention_runs_limit_v490_check
    check (batch_limit between 1 and 5000),
  constraint event_ticket_retention_runs_counts_v490_check
    check (
      click_deleted_count >= 0
      and click_anonymized_count >= 0
      and signal_tombstoned_count >= 0
      and signal_skipped_count >= 0
    ),
  constraint event_ticket_retention_runs_checkpoint_v490_check
    check (
      jsonb_typeof(checkpoint) = 'object'
      and public.mhidas_ticket_metadata_is_allowed_v2('retention_checkpoint', checkpoint)
    ),
  constraint event_ticket_retention_runs_error_hash_v490_check
    check (error_hash is null or error_hash ~ '^[0-9a-f]{64}$')
);

create table public.event_ticket_commercial_audit_log (
  audit_id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  canonical_event_id uuid references public.canonical_events(id) on delete restrict,
  partner_id uuid references public.commercial_partners(partner_id) on delete restrict,
  request_id uuid references public.event_ticket_partnership_requests(request_id) on delete restrict,
  channel_id uuid references public.event_ticket_commercial_channels(channel_id) on delete restrict,
  communication_id uuid references public.partner_official_communications(communication_id) on delete restrict,
  signal_id uuid references public.event_ticket_purchase_signals(signal_id) on delete restrict,
  retention_run_id uuid references public.event_ticket_retention_runs(retention_run_id) on delete restrict,
  audit_action text not null,
  actor_role text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  previous_status text,
  next_status text,
  object_version integer,
  before_snapshot jsonb,
  after_snapshot jsonb,
  sensitive_terms_hash text,
  reason text not null,
  correlation_id text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  constraint event_ticket_commercial_audit_target_type_v490_check
    check (target_type in (
      'partner','representative','request','channel','communication',
      'signal','retention_run','backfill'
    )),
  constraint event_ticket_commercial_audit_actor_v490_check
    check (actor_role in (
      'useclubbers_admin','verified_partner_representative','clubber',
      'automation','system','trusted_ticketing_integration'
    )),
  constraint event_ticket_commercial_audit_snapshots_v490_check
    check (
      (
        before_snapshot is null
        or (
          jsonb_typeof(before_snapshot) = 'object'
          and public.mhidas_ticket_metadata_is_allowed_v2('audit_snapshot', before_snapshot)
        )
      )
      and (
        after_snapshot is null
        or (
          jsonb_typeof(after_snapshot) = 'object'
          and public.mhidas_ticket_metadata_is_allowed_v2('audit_snapshot', after_snapshot)
        )
      )
    ),
  constraint event_ticket_commercial_audit_terms_hash_v490_check
    check (
      sensitive_terms_hash is null
      or sensitive_terms_hash ~ '^[0-9a-f]{64}$'
    )
);

create unique index event_ticket_commercial_audit_idempotency_v490_uq
  on public.event_ticket_commercial_audit_log (
    target_type, target_id, idempotency_key
  );

create index event_ticket_commercial_audit_correlation_v490_idx
  on public.event_ticket_commercial_audit_log (
    correlation_id, created_at
  );

create table public.event_ticket_operation_receipts (
  receipt_id uuid primary key default gen_random_uuid(),
  operation_scope text not null,
  principal_type text not null,
  principal_id uuid references auth.users(id) on delete restrict,
  operation_name text not null,
  idempotency_key text not null,
  target_type text not null,
  target_id uuid not null,
  expected_lock_version integer,
  request_hash text not null,
  result_id uuid not null,
  result_status text not null,
  result_version integer,
  result_hash text not null,
  created_at timestamptz not null default now(),
  constraint event_ticket_operation_receipts_scope_v493_check
    check (operation_scope in (
      'request_submit','request_mutation','channel_mutation',
      'communication_mutation','signal_insert','retention_run','channel_expiry',
      'url_validation'
    )),
  constraint event_ticket_operation_receipts_principal_v493_check
    check (principal_type in (
      'user','service_role','trusted_ticketing_integration','automation'
    )),
  constraint event_ticket_operation_receipts_target_v493_check
    check (target_type in (
      'canonical_event','partner_request','commercial_channel',
      'partner_communication','retention_policy'
    )),
  constraint event_ticket_operation_receipts_hashes_v493_check
    check (
      request_hash ~ '^[0-9a-f]{64}$'
      and result_hash ~ '^[0-9a-f]{64}$'
    )
);

create unique index event_ticket_operation_receipts_semantic_v493_uq
  on public.event_ticket_operation_receipts (
    principal_type,
    coalesce(principal_id, '00000000-0000-0000-0000-000000000000'::uuid),
    operation_name,
    idempotency_key
  );


create function public.mhidas_ticket_assert_receipt_replay_v2(
  p_principal_type text,
  p_principal_id uuid,
  p_operation_name text,
  p_idempotency_key text,
  p_target_type text,
  p_target_id uuid,
  p_expected_lock_version integer,
  p_request_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_receipt record;
begin
  select *
  into v_receipt
  from public.event_ticket_operation_receipts r
  where r.principal_type = p_principal_type
    and r.principal_id is not distinct from p_principal_id
    and r.operation_name = p_operation_name
    and r.idempotency_key = p_idempotency_key;

  if not found then
    return null;
  end if;

  if v_receipt.target_type <> p_target_type
    or v_receipt.target_id <> p_target_id
    or v_receipt.expected_lock_version is distinct from p_expected_lock_version
    or v_receipt.request_hash <> p_request_hash then
    raise exception 'IDEMPOTENCY_KEY_SEMANTIC_REUSE_DENIED';
  end if;

  return v_receipt.result_id;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_write_operation_receipt_v2(
  p_operation_scope text,
  p_principal_type text,
  p_principal_id uuid,
  p_operation_name text,
  p_idempotency_key text,
  p_target_type text,
  p_target_id uuid,
  p_expected_lock_version integer,
  p_request_hash text,
  p_result_id uuid,
  p_result_status text,
  p_result_version integer,
  p_result_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_receipt_id uuid;
begin
  insert into public.event_ticket_operation_receipts (
    operation_scope,
    principal_type,
    principal_id,
    operation_name,
    idempotency_key,
    target_type,
    target_id,
    expected_lock_version,
    request_hash,
    result_id,
    result_status,
    result_version,
    result_hash
  )
  values (
    p_operation_scope,
    p_principal_type,
    p_principal_id,
    p_operation_name,
    p_idempotency_key,
    p_target_type,
    p_target_id,
    p_expected_lock_version,
    p_request_hash,
    p_result_id,
    p_result_status,
    p_result_version,
    p_result_hash
  )
  returning receipt_id into v_receipt_id;

  return v_receipt_id;
end;
$mhidas_plpgsql$;


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
  constraint event_ticket_backfill_rejections_source_v490_check
    check (source_table in (
      'partner_ticket_requests','event_groups','event_ticket_intents'
    )),
  constraint event_ticket_backfill_rejections_hash_v490_check
    check (source_payload_hash ~ '^[0-9a-f]{64}$')
);

create unique index event_ticket_backfill_rejections_source_v490_uq
  on public.event_ticket_backfill_rejections (
    reconciliation_run_key, source_table, source_primary_key
  );

-- =============================================================================
-- 13. CONTROLLED MUTATION CONTEXT AND INTERNAL AUDIT WRITER
-- =============================================================================

create function public.mhidas_ticket_assert_actor_context_v1(
  p_allowed_roles text[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_actor_role text := current_setting('app.mhidas_ticket_actor_role', true);
  v_actor_user_id_text text := current_setting('app.mhidas_ticket_actor_user_id', true);
begin
  if v_actor_role is null or not (v_actor_role = any(p_allowed_roles)) then
    raise exception 'TICKET_MUTATION_CONTEXT_DENIED';
  end if;

  if v_actor_role in (
    'useclubbers_admin',
    'verified_partner_representative',
    'clubber'
  ) and coalesce(v_actor_user_id_text, '') = '' then
    raise exception 'TICKET_MUTATION_ACTOR_USER_REQUIRED';
  end if;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_write_audit_v1(
  p_target_type text,
  p_target_id uuid,
  p_canonical_event_id uuid,
  p_partner_id uuid,
  p_request_id uuid,
  p_channel_id uuid,
  p_communication_id uuid,
  p_signal_id uuid,
  p_retention_run_id uuid,
  p_audit_action text,
  p_previous_status text,
  p_next_status text,
  p_object_version integer,
  p_before_snapshot jsonb,
  p_after_snapshot jsonb,
  p_sensitive_terms_hash text,
  p_reason text,
  p_correlation_id text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_audit_id uuid := gen_random_uuid();
  v_actor_role text := current_setting('app.mhidas_ticket_actor_role', true);
  v_actor_user_id_text text := current_setting('app.mhidas_ticket_actor_user_id', true);
  v_actor_user_id uuid;
begin
  perform public.mhidas_ticket_assert_actor_context_v1(array[
    'useclubbers_admin',
    'verified_partner_representative',
    'clubber',
    'automation',
    'system',
    'trusted_ticketing_integration'
  ]);

  if coalesce(v_actor_user_id_text, '') <> '' then
    v_actor_user_id := v_actor_user_id_text::uuid;
  end if;

  if coalesce(btrim(p_reason), '') = ''
    or coalesce(btrim(p_correlation_id), '') = ''
    or coalesce(btrim(p_idempotency_key), '') = '' then
    raise exception 'TICKET_AUDIT_CONTEXT_INCOMPLETE';
  end if;

  insert into public.event_ticket_commercial_audit_log (
    audit_id,
    target_type,
    target_id,
    canonical_event_id,
    partner_id,
    request_id,
    channel_id,
    communication_id,
    signal_id,
    retention_run_id,
    audit_action,
    actor_role,
    actor_user_id,
    previous_status,
    next_status,
    object_version,
    before_snapshot,
    after_snapshot,
    sensitive_terms_hash,
    reason,
    correlation_id,
    idempotency_key
  )
  values (
    v_audit_id,
    p_target_type,
    p_target_id,
    p_canonical_event_id,
    p_partner_id,
    p_request_id,
    p_channel_id,
    p_communication_id,
    p_signal_id,
    p_retention_run_id,
    p_audit_action,
    v_actor_role,
    v_actor_user_id,
    p_previous_status,
    p_next_status,
    p_object_version,
    p_before_snapshot,
    p_after_snapshot,
    p_sensitive_terms_hash,
    p_reason,
    p_correlation_id,
    p_idempotency_key
  );

  return v_audit_id;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 14. DEFENSIVE TRIGGERS
-- =============================================================================

create function public.mhidas_ticket_partnership_request_guard_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_actor_role text := current_setting('app.mhidas_ticket_actor_role', true);
begin
  perform public.mhidas_ticket_assert_actor_context_v1(array[
    'useclubbers_admin',
    'verified_partner_representative',
    'system'
  ]);

  if tg_op = 'DELETE' then
    raise exception 'REQUEST_DELETE_DENIED';
  end if;

  if v_actor_role = 'verified_partner_representative' then
    if new.submitted_by_user_id <> auth.uid() then
      raise exception 'REQUEST_SUBMITTER_MUST_MATCH_AUTH_USER';
    end if;

    if not public.mhidas_ticket_partner_representative_is_authorized_v2(
      new.partner_id,
      auth.uid()
    ) then
      raise exception 'REQUEST_VERIFIED_PARTNER_MEMBERSHIP_REQUIRED';
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.request_status := 'pending';
    new.lock_version := 0;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if old.request_status in ('approved','rejected','withdrawn') then
    raise exception 'REQUEST_TERMINAL_STATE_IMMUTABLE';
  end if;

  if old.partner_id <> new.partner_id
    or old.canonical_event_id <> new.canonical_event_id
    or old.submitted_by_user_id <> new.submitted_by_user_id
    or old.client_submission_key <> new.client_submission_key then
    raise exception 'REQUEST_IDENTITY_FIELDS_IMMUTABLE';
  end if;

  if new.lock_version <> old.lock_version + 1 then
    raise exception 'REQUEST_LOCK_VERSION_MISMATCH';
  end if;

  if v_actor_role = 'verified_partner_representative' then
    if new.request_status not in ('pending','withdrawn') then
      raise exception 'REQUEST_PARTNER_TRANSITION_DENIED';
    end if;

    if new.request_status = 'withdrawn' then
      new.withdrawn_by_user_id := auth.uid();
      new.withdrawn_at := now();
    end if;
  elsif v_actor_role = 'useclubbers_admin' then
    if not (
      (old.request_status = 'pending' and new.request_status in ('needs_info','approved','rejected'))
      or (old.request_status = 'needs_info' and new.request_status in ('pending','approved','rejected'))
      or new.request_status = old.request_status
    ) then
      raise exception 'REQUEST_ADMIN_TRANSITION_INVALID';
    end if;

    if new.request_status in ('approved','rejected') then
      new.reviewed_by_admin_user_id := auth.uid();
      new.reviewed_at := now();
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$mhidas_plpgsql$;

create trigger event_ticket_partnership_request_guard_v490
before insert or update or delete
on public.event_ticket_partnership_requests
for each row
execute function public.mhidas_ticket_partnership_request_guard_v2();

create function public.mhidas_ticket_commercial_channel_guard_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_actor_role text := current_setting('app.mhidas_ticket_actor_role', true);
  v_request_partner_id uuid;
  v_request_event_id uuid;
  v_request_status text;
begin
  perform public.mhidas_ticket_assert_actor_context_v1(array[
    'useclubbers_admin',
    'automation',
    'system'
  ]);

  if tg_op = 'DELETE' then
    raise exception 'COMMERCIAL_CHANNEL_DELETE_DENIED';
  end if;

  if v_actor_role = 'system' then
    if tg_op <> 'UPDATE'
      or new.channel_status <> old.channel_status
      or new.lock_version <> old.lock_version + 1
      or (to_jsonb(new) - array[
        'validated_hostname','validated_final_hostname',
        'url_validation_status','url_validation_algorithm','url_validation_version',
        'url_validation_hash','dns_public_validation_hash',
        'redirect_chain_validation_hash','validated_final_url_hash',
        'url_validated_at','url_validation_expires_at','url_validated_by_service',
        'url_validator_version','url_health_status','resolved_host_hash',
        'last_health_checked_at','last_health_check_hash','lock_version','updated_at'
      ]) <> (to_jsonb(old) - array[
        'validated_hostname','validated_final_hostname',
        'url_validation_status','url_validation_algorithm','url_validation_version',
        'url_validation_hash','dns_public_validation_hash',
        'redirect_chain_validation_hash','validated_final_url_hash',
        'url_validated_at','url_validation_expires_at','url_validated_by_service',
        'url_validator_version','url_health_status','resolved_host_hash',
        'last_health_checked_at','last_health_check_hash','lock_version','updated_at'
      ]) then
      raise exception 'COMMERCIAL_CHANNEL_SYSTEM_VALIDATION_UPDATE_DENIED';
    end if;

    if new.url_validation_status = 'validated'
      and not public.mhidas_ticket_url_proof_is_fresh_v2(
        new.url_validation_status,
        new.url_validation_expires_at,
        new.url_health_status,
        new.last_health_checked_at,
        new.url_validator_version,
        new.resolved_host_hash,
        new.redirect_chain_validation_hash
      ) then
      raise exception 'COMMERCIAL_CHANNEL_SYSTEM_VALIDATION_PROOF_INVALID';
    end if;

    new.updated_at := now();
    return new;
  end if;

  if v_actor_role = 'automation' then
    if tg_op <> 'UPDATE'
      or old.channel_status not in ('authorized','active','paused')
      or new.channel_status <> 'expired'
      or old.authorization_ends_at is null
      or old.authorization_ends_at > now()
      or new.expired_by_actor_role <> 'automation'
      or new.expired_at is null
      or new.lock_version <> old.lock_version + 1
      or (to_jsonb(new) - array[
        'channel_status','expired_by_actor_role','expired_at','lock_version','updated_at'
      ]) <> (to_jsonb(old) - array[
        'channel_status','expired_by_actor_role','expired_at','lock_version','updated_at'
      ]) then
      raise exception 'COMMERCIAL_CHANNEL_AUTOMATION_TRANSITION_DENIED';
    end if;

    new.updated_at := now();
    return new;
  end if;

  if v_actor_role <> 'useclubbers_admin' then
    raise exception 'COMMERCIAL_CHANNEL_ADMIN_ONLY';
  end if;

  if new.source_origin = 'approved_partner_request' then
    if new.source_request_id is null or new.partner_id is null then
      raise exception 'COMMERCIAL_CHANNEL_REQUEST_AND_PARTNER_REQUIRED';
    end if;

    select r.partner_id, r.canonical_event_id, r.request_status
    into v_request_partner_id, v_request_event_id, v_request_status
    from public.event_ticket_partnership_requests r
    join public.commercial_partners p on p.partner_id = r.partner_id
    where r.request_id = new.source_request_id
      and p.partner_status = 'verified'
    for key share;

    if not found then
      raise exception 'COMMERCIAL_CHANNEL_VERIFIED_SOURCE_REQUEST_NOT_FOUND';
    end if;

    if v_request_status <> 'approved'
      or v_request_partner_id <> new.partner_id
      or v_request_event_id <> new.canonical_event_id then
      raise exception 'COMMERCIAL_CHANNEL_REQUEST_ENTITY_MISMATCH';
    end if;
  elsif new.source_request_id is not null then
    raise exception 'COMMERCIAL_CHANNEL_UNEXPECTED_SOURCE_REQUEST';
  end if;

  if new.channel_status in ('authorized','active','paused') then
    if new.authorization_ends_at is not null and new.authorization_ends_at <= now() then
      raise exception 'COMMERCIAL_CHANNEL_AUTHORIZATION_EXPIRED';
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    new.lock_version := 0;
    return new;
  end if;

  if new.lock_version <> old.lock_version + 1 then
    raise exception 'COMMERCIAL_CHANNEL_LOCK_VERSION_MISMATCH';
  end if;

  if old.channel_status = 'active' then
    if old.canonical_event_id <> new.canonical_event_id
      or old.partner_id is distinct from new.partner_id
      or old.source_request_id is distinct from new.source_request_id
      or old.source_origin <> new.source_origin
      or old.ticketing_provider_key is distinct from new.ticketing_provider_key
      or old.authorized_domain <> new.authorized_domain
      or old.allow_subdomains <> new.allow_subdomains
      or old.commercial_url <> new.commercial_url
      or old.validated_hostname <> new.validated_hostname
      or old.validated_final_hostname <> new.validated_final_hostname
      or old.tracking_method <> new.tracking_method
      or old.tracking_secret_ref is distinct from new.tracking_secret_ref
      or old.remuneration_model <> new.remuneration_model
      or old.remuneration_percent_bps is distinct from new.remuneration_percent_bps
      or old.remuneration_fixed_minor is distinct from new.remuneration_fixed_minor
      or old.currency is distinct from new.currency
      or old.financial_terms_version <> new.financial_terms_version
      or old.financial_terms_hash <> new.financial_terms_hash
      or old.authorization_reference_id <> new.authorization_reference_id
      or old.authorization_evidence_hash <> new.authorization_evidence_hash
      or old.authorization_starts_at <> new.authorization_starts_at
      or old.authorization_ends_at is distinct from new.authorization_ends_at then
      raise exception 'COMMERCIAL_CHANNEL_ACTIVE_SENSITIVE_FIELDS_FROZEN';
    end if;
  end if;

  if not (
    new.channel_status = old.channel_status
    or (old.channel_status = 'draft' and new.channel_status in ('authorized','revoked'))
    or (old.channel_status = 'authorized' and new.channel_status in ('active','revoked','expired'))
    or (old.channel_status = 'active' and new.channel_status in ('paused','expired','superseded','revoked'))
    or (old.channel_status = 'paused' and new.channel_status in ('active','expired','superseded','revoked'))
  ) then
    raise exception 'COMMERCIAL_CHANNEL_TRANSITION_INVALID';
  end if;

  new.updated_at := now();
  return new;
end;
$mhidas_plpgsql$;

create trigger event_ticket_commercial_channel_guard_v490
before insert or update or delete
on public.event_ticket_commercial_channels
for each row
execute function public.mhidas_ticket_commercial_channel_guard_v2();

create function public.mhidas_ticket_purchase_signal_append_only_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_actor_role text := current_setting('app.mhidas_ticket_actor_role', true);
  v_retention_run_id text := current_setting('app.mhidas_ticket_retention_run_id', true);
begin
  if tg_op = 'INSERT' then
    perform public.mhidas_ticket_assert_actor_context_v1(array[
      'clubber',
      'useclubbers_admin',
      'trusted_ticketing_integration',
      'system'
    ]);
    return new;
  end if;

  if tg_op = 'UPDATE'
    and v_actor_role = 'automation'
    and coalesce(v_retention_run_id, '') <> ''
    and old.retention_processed_at is null
    and new.retention_processed_at is not null
    and new.retention_result = 'tombstoned'
    and new.user_id is null
    and new.click_id is null
    and new.attribution_campaign_id is null
    and public.mhidas_ticket_metadata_is_allowed_v2('purchase_signal', new.metadata)
    and (to_jsonb(new) - array[
      'user_id','click_id','attribution_campaign_id','metadata',
      'retention_processed_at','retention_result'
    ]) = (to_jsonb(old) - array[
      'user_id','click_id','attribution_campaign_id','metadata',
      'retention_processed_at','retention_result'
    ]) then
    return new;
  end if;

  raise exception 'PURCHASE_SIGNAL_APPEND_ONLY';
end;
$mhidas_plpgsql$;

create trigger event_ticket_purchase_signal_append_only_v490
before insert or update or delete
on public.event_ticket_purchase_signals
for each row
execute function public.mhidas_ticket_purchase_signal_append_only_v2();

create function public.mhidas_partner_communication_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_actor_role text := current_setting('app.mhidas_ticket_actor_role', true);
  v_channel_partner_id uuid;
  v_channel_event_id uuid;
  v_channel_status text;
begin
  perform public.mhidas_ticket_assert_actor_context_v1(array[
    'useclubbers_admin',
    'verified_partner_representative',
    'automation',
    'system'
  ]);

  if tg_op = 'DELETE' then
    raise exception 'PARTNER_COMMUNICATION_DELETE_DENIED';
  end if;

  if new.commercial_channel_id is not null then
    select c.partner_id, c.canonical_event_id, c.channel_status
    into v_channel_partner_id, v_channel_event_id, v_channel_status
    from public.event_ticket_commercial_channels c
    where c.channel_id = new.commercial_channel_id
    for key share;

    if not found
      or v_channel_partner_id is distinct from new.partner_id
      or v_channel_event_id is distinct from new.canonical_event_id then
      raise exception 'PARTNER_COMMUNICATION_CHANNEL_CONTEXT_MISMATCH';
    end if;

    if new.communication_status = 'published'
      and v_channel_status <> 'active' then
      raise exception 'PARTNER_COMMUNICATION_ACTIVE_CHANNEL_REQUIRED';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if v_actor_role = 'verified_partner_representative' then
      new.communication_status := 'draft';
      new.submitted_by_user_id := auth.uid();
    end if;
    new.lock_version := 0;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if old.partner_id <> new.partner_id
    or old.submitted_by_user_id <> new.submitted_by_user_id
    or old.communication_type <> new.communication_type then
    raise exception 'PARTNER_COMMUNICATION_IDENTITY_FIELDS_IMMUTABLE';
  end if;

  if new.lock_version <> old.lock_version + 1 then
    raise exception 'PARTNER_COMMUNICATION_LOCK_VERSION_MISMATCH';
  end if;

  if v_actor_role = 'verified_partner_representative' then
    if not (
      new.communication_status = old.communication_status
      or (old.communication_status = 'draft' and new.communication_status = 'submitted')
    ) then
      raise exception 'PARTNER_COMMUNICATION_PARTNER_TRANSITION_DENIED';
    end if;
    if new.communication_status = 'submitted' then
      new.submitted_at := now();
    end if;
  elsif v_actor_role = 'useclubbers_admin' then
    if not (
      new.communication_status = old.communication_status
      or (old.communication_status = 'submitted' and new.communication_status in ('approved','rejected'))
      or (old.communication_status = 'approved' and new.communication_status in ('published','rejected'))
      or (old.communication_status = 'published' and new.communication_status in ('paused','expired'))
      or (old.communication_status = 'paused' and new.communication_status in ('published','expired'))
    ) then
      raise exception 'PARTNER_COMMUNICATION_ADMIN_TRANSITION_INVALID';
    end if;

    if new.communication_status = 'approved' then
      new.approved_by_admin_user_id := auth.uid();
      new.approved_at := now();
    elsif new.communication_status = 'published' then
      new.published_by_admin_user_id := auth.uid();
      new.published_at := now();
    elsif new.communication_status = 'paused' then
      new.paused_by_admin_user_id := auth.uid();
      new.paused_at := now();
    elsif new.communication_status = 'rejected' then
      new.rejected_by_admin_user_id := auth.uid();
      new.rejected_at := now();
    elsif new.communication_status = 'expired' then
      new.expired_by_actor_role := 'useclubbers_admin';
      new.expired_at := now();
    end if;
  elsif v_actor_role = 'automation'
    and old.communication_status in ('published','paused')
    and new.communication_status = 'expired' then
    new.expired_by_actor_role := 'automation';
    new.expired_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$mhidas_plpgsql$;

create trigger partner_official_communication_guard_v490
before insert or update or delete
on public.partner_official_communications
for each row
execute function public.mhidas_partner_communication_guard_v1();

create function public.mhidas_ticket_audit_append_only_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
begin
  if tg_op <> 'INSERT' then
    raise exception 'COMMERCIAL_AUDIT_APPEND_ONLY';
  end if;

  perform public.mhidas_ticket_assert_actor_context_v1(array[
    'useclubbers_admin',
    'verified_partner_representative',
    'clubber',
    'automation',
    'system',
    'trusted_ticketing_integration'
  ]);

  if new.target_type = 'request' and new.request_id is null
    or new.target_type = 'channel' and new.channel_id is null
    or new.target_type = 'communication' and new.communication_id is null
    or new.target_type = 'signal' and new.signal_id is null
    or new.target_type = 'retention_run' and new.retention_run_id is null then
    raise exception 'COMMERCIAL_AUDIT_TARGET_REFERENCE_REQUIRED';
  end if;

  return new;
end;
$mhidas_plpgsql$;

create trigger event_ticket_commercial_audit_append_only_v490
before insert or update or delete
on public.event_ticket_commercial_audit_log
for each row
execute function public.mhidas_ticket_audit_append_only_v1();

-- =============================================================================
-- 15. PARTNER REQUEST RPCs WITH IDEMPOTENCY AND OPTIMISTIC CONCURRENCY
-- =============================================================================

create function public.mhidas_partner_submit_ticket_partnership_request_v2(
  p_canonical_event_id uuid,
  p_partner_id uuid,
  p_partner_type text,
  p_request_type text,
  p_event_slug_snapshot text,
  p_event_name_snapshot text,
  p_event_date_snapshot date,
  p_city_snapshot text,
  p_state_snapshot text,
  p_venue_name_snapshot text,
  p_current_sales_url_hash text,
  p_proposed_benefit text,
  p_commercial_contact_reference_id text,
  p_commercial_notes_hash text,
  p_client_submission_key text,
  p_metadata jsonb,
  p_reason text,
  p_correlation_id text
)
returns public.event_ticket_partnership_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_request public.event_ticket_partnership_requests%rowtype;
  v_user_id uuid := auth.uid();
  v_idempotency_key text := 'request-submit:' || p_partner_id::text || ':' || p_client_submission_key;
  v_request_hash text;
  v_replay_result_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATED_USER_REQUIRED';
  end if;

  if not public.mhidas_ticket_partner_representative_is_authorized_v2(
    p_partner_id,
    v_user_id
  ) then
    raise exception 'REQUEST_VERIFIED_PARTNER_MEMBERSHIP_REQUIRED';
  end if;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'canonical_event_id', p_canonical_event_id,
    'partner_id', p_partner_id,
    'partner_type', p_partner_type,
    'request_type', p_request_type,
    'event_slug_snapshot', p_event_slug_snapshot,
    'event_name_snapshot', p_event_name_snapshot,
    'event_date_snapshot', p_event_date_snapshot,
    'city_snapshot', p_city_snapshot,
    'state_snapshot', p_state_snapshot,
    'venue_name_snapshot', p_venue_name_snapshot,
    'current_sales_url_hash', p_current_sales_url_hash,
    'proposed_benefit', p_proposed_benefit,
    'commercial_contact_reference_id', p_commercial_contact_reference_id,
    'commercial_notes_hash', p_commercial_notes_hash,
    'metadata', coalesce(p_metadata, '{}'::jsonb)
  ));

  v_replay_result_id := public.mhidas_ticket_assert_receipt_replay_v2(
    'user', v_user_id, 'submit_request', v_idempotency_key,
    'canonical_event', p_canonical_event_id, null, v_request_hash
  );

  if v_replay_result_id is not null then
    select * into strict v_request
    from public.event_ticket_partnership_requests
    where request_id = v_replay_result_id;
    return v_request;
  end if;

  perform set_config('app.mhidas_ticket_actor_role', 'verified_partner_representative', true);
  perform set_config('app.mhidas_ticket_actor_user_id', v_user_id::text, true);

  insert into public.event_ticket_partnership_requests (
    request_id, canonical_event_id, partner_id, submitted_by_user_id,
    partner_type, request_type, event_slug_snapshot, event_name_snapshot,
    event_date_snapshot, city_snapshot, state_snapshot, venue_name_snapshot,
    current_sales_url_hash, proposed_benefit, commercial_contact_reference_id,
    commercial_notes_hash, client_submission_key, metadata
  )
  values (
    gen_random_uuid(), p_canonical_event_id, p_partner_id, v_user_id,
    p_partner_type, p_request_type, p_event_slug_snapshot, p_event_name_snapshot,
    p_event_date_snapshot, p_city_snapshot, p_state_snapshot, p_venue_name_snapshot,
    p_current_sales_url_hash, p_proposed_benefit, p_commercial_contact_reference_id,
    p_commercial_notes_hash, p_client_submission_key, coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_request;

  perform public.mhidas_ticket_write_operation_receipt_v2(
    'request_submit', 'user', v_user_id, 'submit_request', v_idempotency_key,
    'canonical_event', p_canonical_event_id, null, v_request_hash,
    v_request.request_id, v_request.request_status, v_request.lock_version,
    encode(digest(
      v_request.request_id::text || ':' || v_request.request_status || ':' ||
      v_request.lock_version::text,
      'sha256'
    ), 'hex')
  );

  perform public.mhidas_ticket_write_audit_v1(
    'request', v_request.request_id, v_request.canonical_event_id,
    v_request.partner_id, v_request.request_id, null, null, null, null,
    'request_submitted', null, v_request.request_status, v_request.lock_version,
    null,
    jsonb_build_object(
      'request_id', v_request.request_id,
      'request_status', v_request.request_status,
      'canonical_event_id', v_request.canonical_event_id,
      'partner_id', v_request.partner_id
    ),
    v_request.commercial_notes_hash, p_reason, p_correlation_id, v_idempotency_key
  );

  return v_request;
end;
$mhidas_plpgsql$;

create function public.mhidas_mutate_ticket_partnership_request_v2(
  p_operation text,
  p_request_id uuid,
  p_expected_lock_version integer,
  p_reason_hash text,
  p_review_evidence_hash text,
  p_admin_notes_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_partnership_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_request public.event_ticket_partnership_requests%rowtype;
  v_before public.event_ticket_partnership_requests%rowtype;
  v_user_id uuid := auth.uid();
  v_actor_role text;
  v_next_status text;
  v_request_hash text;
  v_replay_result_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATED_USER_REQUIRED';
  end if;

  select * into v_before
  from public.event_ticket_partnership_requests
  where request_id = p_request_id;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if p_operation in ('approve','reject','needs_info','return_to_pending') then
    if not public.mhidas_is_useclubbers_admin_v1(v_user_id) then
      raise exception 'USECLUBBERS_ADMIN_REQUIRED';
    end if;
    v_actor_role := 'useclubbers_admin';
  elsif p_operation = 'withdraw' then
    if not public.mhidas_ticket_partner_representative_is_authorized_v2(
      v_before.partner_id,
      v_user_id
    ) then
      raise exception 'REQUEST_VERIFIED_PARTNER_MEMBERSHIP_REQUIRED';
    end if;
    v_actor_role := 'verified_partner_representative';
  else
    raise exception 'REQUEST_OPERATION_UNSUPPORTED';
  end if;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'operation', p_operation,
    'request_id', p_request_id,
    'expected_lock_version', p_expected_lock_version,
    'reason_hash', p_reason_hash,
    'review_evidence_hash', p_review_evidence_hash,
    'admin_notes_hash', p_admin_notes_hash
  ));

  v_replay_result_id := public.mhidas_ticket_assert_receipt_replay_v2(
    'user', v_user_id, 'mutate_request:' || p_operation, p_idempotency_key,
    'partner_request', p_request_id, p_expected_lock_version, v_request_hash
  );

  if v_replay_result_id is not null then
    select * into strict v_request
    from public.event_ticket_partnership_requests
    where request_id = v_replay_result_id;
    return v_request;
  end if;

  select * into v_before
  from public.event_ticket_partnership_requests
  where request_id = p_request_id
  for update;

  if v_before.lock_version <> p_expected_lock_version then
    raise exception 'REQUEST_EXPECTED_LOCK_VERSION_CONFLICT';
  end if;

  v_next_status := case p_operation
    when 'approve' then 'approved'
    when 'reject' then 'rejected'
    when 'needs_info' then 'needs_info'
    when 'return_to_pending' then 'pending'
    when 'withdraw' then 'withdrawn'
  end;

  perform set_config('app.mhidas_ticket_actor_role', v_actor_role, true);
  perform set_config('app.mhidas_ticket_actor_user_id', v_user_id::text, true);

  update public.event_ticket_partnership_requests
  set request_status = v_next_status,
      lifecycle_reason_hash = p_reason_hash,
      review_evidence_hash = case
        when v_next_status in ('approved','rejected') then p_review_evidence_hash
        else review_evidence_hash
      end,
      admin_notes_hash = case
        when v_actor_role = 'useclubbers_admin' then p_admin_notes_hash
        else admin_notes_hash
      end,
      lock_version = lock_version + 1
  where request_id = p_request_id
    and lock_version = p_expected_lock_version
  returning * into v_request;

  if not found then
    raise exception 'REQUEST_EXPECTED_LOCK_VERSION_CONFLICT';
  end if;

  perform public.mhidas_ticket_write_operation_receipt_v2(
    'request_mutation', 'user', v_user_id, 'mutate_request:' || p_operation,
    p_idempotency_key, 'partner_request', p_request_id,
    p_expected_lock_version, v_request_hash, v_request.request_id,
    v_request.request_status, v_request.lock_version,
    encode(digest(
      v_request.request_id::text || ':' || v_request.request_status || ':' ||
      v_request.lock_version::text,
      'sha256'
    ), 'hex')
  );

  perform public.mhidas_ticket_write_audit_v1(
    'request', v_request.request_id, v_request.canonical_event_id,
    v_request.partner_id, v_request.request_id, null, null, null, null,
    'request_' || p_operation, v_before.request_status, v_request.request_status,
    v_request.lock_version,
    jsonb_build_object('request_status', v_before.request_status, 'lock_version', v_before.lock_version),
    jsonb_build_object('request_status', v_request.request_status, 'lock_version', v_request.lock_version),
    p_admin_notes_hash, 'request lifecycle mutation', p_correlation_id, p_idempotency_key
  );

  return v_request;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 16. TRANSACTIONAL ADMIN CHANNEL RPC
-- =============================================================================

create function public.mhidas_admin_mutate_event_ticket_commercial_channel_v2(
  p_operation text,
  p_channel_id uuid,
  p_expected_lock_version integer,
  p_payload jsonb,
  p_reason text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_commercial_channels
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_channel public.event_ticket_commercial_channels%rowtype;
  v_before public.event_ticket_commercial_channels%rowtype;
  v_existing_active public.event_ticket_commercial_channels%rowtype;
  v_new_channel_id uuid;
  v_target_status text;
  v_request_hash text;
  v_replay_result_id uuid;
  v_receipt_target_type text;
  v_receipt_target_id uuid;
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  if coalesce(btrim(p_reason), '') = ''
    or coalesce(btrim(p_correlation_id), '') = ''
    or coalesce(btrim(p_idempotency_key), '') = '' then
    raise exception 'CHANNEL_MUTATION_CONTEXT_INCOMPLETE';
  end if;

  v_receipt_target_type := case
    when p_operation = 'create_draft' then 'canonical_event'
    else 'commercial_channel'
  end;
  v_receipt_target_id := case
    when p_operation = 'create_draft' then (p_payload ->> 'canonical_event_id')::uuid
    else p_channel_id
  end;
  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'operation', p_operation,
    'channel_id', p_channel_id,
    'expected_lock_version', p_expected_lock_version,
    'payload', coalesce(p_payload, '{}'::jsonb),
    'reason', p_reason
  ));

  v_replay_result_id := public.mhidas_ticket_assert_receipt_replay_v2(
    'user', v_admin_user_id, 'mutate_channel:' || p_operation,
    p_idempotency_key, v_receipt_target_type, v_receipt_target_id,
    p_expected_lock_version, v_request_hash
  );

  if v_replay_result_id is not null then
    select * into strict v_channel
    from public.event_ticket_commercial_channels
    where channel_id = v_replay_result_id;
    return v_channel;
  end if;

  perform set_config('app.mhidas_ticket_actor_role', 'useclubbers_admin', true);
  perform set_config('app.mhidas_ticket_actor_user_id', v_admin_user_id::text, true);

  if p_operation = 'create_draft' then
    if p_expected_lock_version <> -1 then
      raise exception 'CHANNEL_CREATE_EXPECTED_LOCK_VERSION_MUST_BE_MINUS_ONE';
    end if;

    v_new_channel_id := coalesce(p_channel_id, gen_random_uuid());

    insert into public.event_ticket_commercial_channels (
      channel_id,
      canonical_event_id,
      source_request_id,
      partner_id,
      source_origin,
      ticketing_provider_key,
      ticketing_display_name,
      authorized_domain,
      allow_subdomains,
      commercial_url,
      validated_hostname,
      validated_final_hostname,
      url_validation_status,
      url_validation_algorithm,
      url_validation_version,
      url_validation_hash,
      dns_public_validation_hash,
      redirect_chain_validation_hash,
      validated_final_url_hash,
      url_validated_at,
      url_validation_expires_at,
      url_validated_by_service,
      url_validator_version,
      url_health_status,
      resolved_host_hash,
      tracking_method,
      tracking_secret_ref,
      tracking_parameter_name,
      retention_policy_version_id,
      remuneration_model,
      remuneration_percent_bps,
      remuneration_fixed_minor,
      currency,
      financial_terms_version,
      financial_terms_hash,
      authorization_reference_id,
      authorization_evidence_hash,
      authorization_starts_at,
      authorization_ends_at,
      public_priority,
      channel_status,
      disclosure_text,
      created_by_admin_user_id,
      metadata
    )
    values (
      v_new_channel_id,
      (p_payload ->> 'canonical_event_id')::uuid,
      nullif(p_payload ->> 'source_request_id', '')::uuid,
      nullif(p_payload ->> 'partner_id', '')::uuid,
      p_payload ->> 'source_origin',
      nullif(p_payload ->> 'ticketing_provider_key', ''),
      nullif(p_payload ->> 'ticketing_display_name', ''),
      lower(p_payload ->> 'authorized_domain'),
      coalesce((p_payload ->> 'allow_subdomains')::boolean, false),
      p_payload ->> 'commercial_url',
      lower(public.mhidas_ticket_extract_hostname_v1(p_payload ->> 'commercial_url')),
      lower(public.mhidas_ticket_extract_hostname_v1(p_payload ->> 'commercial_url')),
      'pending',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'unknown',
      null,
      coalesce(p_payload ->> 'tracking_method', 'none'),
      nullif(p_payload ->> 'tracking_secret_ref', ''),
      nullif(p_payload ->> 'tracking_parameter_name', ''),
      nullif(p_payload ->> 'retention_policy_version_id', '')::uuid,
      p_payload ->> 'remuneration_model',
      nullif(p_payload ->> 'remuneration_percent_bps', '')::integer,
      nullif(p_payload ->> 'remuneration_fixed_minor', '')::bigint,
      nullif(p_payload ->> 'currency', ''),
      (p_payload ->> 'financial_terms_version')::integer,
      p_payload ->> 'financial_terms_hash',
      p_payload ->> 'authorization_reference_id',
      p_payload ->> 'authorization_evidence_hash',
      (p_payload ->> 'authorization_starts_at')::timestamptz,
      nullif(p_payload ->> 'authorization_ends_at', '')::timestamptz,
      coalesce((p_payload ->> 'public_priority')::integer, 100),
      'draft',
      nullif(p_payload ->> 'disclosure_text', ''),
      v_admin_user_id,
      coalesce(p_payload -> 'metadata', '{}'::jsonb)
    )
    returning * into v_channel;

    v_before := null;
  else
    select *
    into v_before
    from public.event_ticket_commercial_channels
    where channel_id = p_channel_id
    for update;

    if not found then
      raise exception 'COMMERCIAL_CHANNEL_NOT_FOUND';
    end if;

    if v_before.lock_version <> p_expected_lock_version then
      raise exception 'CHANNEL_EXPECTED_LOCK_VERSION_CONFLICT';
    end if;

    if p_operation in ('authorize','activate','atomic_cutover')
      and not public.mhidas_ticket_url_proof_is_fresh_v2(
        v_before.url_validation_status,
        v_before.url_validation_expires_at,
        v_before.url_health_status,
        v_before.last_health_checked_at,
        v_before.url_validator_version,
        v_before.resolved_host_hash,
        v_before.redirect_chain_validation_hash
      ) then
      raise exception 'CHANNEL_FRESH_HEALTHY_URL_VALIDATION_REQUIRED';
    end if;

    if p_operation in ('activate','atomic_cutover') then
      if v_before.channel_status not in ('authorized','paused') then
        raise exception 'CHANNEL_ACTIVATION_REQUIRES_AUTHORIZED_OR_PAUSED';
      end if;

      if v_before.authorization_ends_at is not null
        and v_before.authorization_ends_at <= now() then
        raise exception 'CHANNEL_AUTHORIZATION_EXPIRED';
      end if;

      select *
      into v_existing_active
      from public.event_ticket_commercial_channels
      where canonical_event_id = v_before.canonical_event_id
        and channel_status = 'active'
        and channel_id <> v_before.channel_id
      for update;

      if found then
        update public.event_ticket_commercial_channels
        set channel_status = 'superseded',
            superseded_by_admin_user_id = v_admin_user_id,
            superseded_at = now(),
            lock_version = lock_version + 1
        where channel_id = v_existing_active.channel_id
          and lock_version = v_existing_active.lock_version;

        perform public.mhidas_ticket_write_audit_v1(
          'channel',
          v_existing_active.channel_id,
          v_existing_active.canonical_event_id,
          v_existing_active.partner_id,
          v_existing_active.source_request_id,
          v_existing_active.channel_id,
          null,
          null,
          null,
          'channel_superseded_by_atomic_cutover',
          v_existing_active.channel_status,
          'superseded',
          v_existing_active.lock_version + 1,
          jsonb_build_object(
            'channel_status', v_existing_active.channel_status,
            'lock_version', v_existing_active.lock_version
          ),
          jsonb_build_object(
            'channel_status', 'superseded',
            'lock_version', v_existing_active.lock_version + 1
          ),
          v_existing_active.financial_terms_hash,
          p_reason,
          p_correlation_id,
          p_idempotency_key || ':superseded'
        );
      end if;

      v_target_status := 'active';
    elsif p_operation = 'authorize' then
      v_target_status := 'authorized';
    elsif p_operation = 'pause' then
      v_target_status := 'paused';
    elsif p_operation = 'revoke' then
      v_target_status := 'revoked';
    elsif p_operation = 'expire' then
      v_target_status := 'expired';
    else
      raise exception 'CHANNEL_OPERATION_UNSUPPORTED';
    end if;

    update public.event_ticket_commercial_channels
    set channel_status = v_target_status,
        authorized_by_admin_user_id = case
          when v_target_status = 'authorized' then v_admin_user_id
          else authorized_by_admin_user_id
        end,
        authorized_at = case
          when v_target_status = 'authorized' then now()
          else authorized_at
        end,
        activated_by_admin_user_id = case
          when v_target_status = 'active' then v_admin_user_id
          else activated_by_admin_user_id
        end,
        activated_at = case
          when v_target_status = 'active' then now()
          else activated_at
        end,
        paused_by_admin_user_id = case
          when v_target_status = 'paused' then v_admin_user_id
          else paused_by_admin_user_id
        end,
        paused_at = case
          when v_target_status = 'paused' then now()
          else paused_at
        end,
        revoked_by_admin_user_id = case
          when v_target_status = 'revoked' then v_admin_user_id
          else revoked_by_admin_user_id
        end,
        revoked_at = case
          when v_target_status = 'revoked' then now()
          else revoked_at
        end,
        expired_by_actor_role = case
          when v_target_status = 'expired' then 'useclubbers_admin'
          else expired_by_actor_role
        end,
        expired_at = case
          when v_target_status = 'expired' then now()
          else expired_at
        end,
        lock_version = lock_version + 1
    where channel_id = p_channel_id
      and lock_version = p_expected_lock_version
    returning * into v_channel;

    if not found then
      raise exception 'CHANNEL_EXPECTED_LOCK_VERSION_CONFLICT';
    end if;
  end if;

  perform public.mhidas_ticket_write_operation_receipt_v2(
    'channel_mutation', 'user', v_admin_user_id,
    'mutate_channel:' || p_operation, p_idempotency_key,
    v_receipt_target_type, v_receipt_target_id, p_expected_lock_version,
    v_request_hash, v_channel.channel_id, v_channel.channel_status,
    v_channel.lock_version,
    encode(digest(
      v_channel.channel_id::text || ':' || v_channel.channel_status || ':' ||
      v_channel.lock_version::text || ':' || v_channel.financial_terms_hash,
      'sha256'
    ), 'hex')
  );

  perform public.mhidas_ticket_write_audit_v1(
    'channel',
    v_channel.channel_id,
    v_channel.canonical_event_id,
    v_channel.partner_id,
    v_channel.source_request_id,
    v_channel.channel_id,
    null,
    null,
    null,
    'channel_' || p_operation,
    case when p_operation = 'create_draft' then null else v_before.channel_status end,
    v_channel.channel_status,
    v_channel.lock_version,
    case
      when p_operation = 'create_draft' then null
      else jsonb_build_object(
        'channel_status', v_before.channel_status,
        'lock_version', v_before.lock_version,
        'authorization_ends_at', v_before.authorization_ends_at
      )
    end,
    jsonb_build_object(
      'channel_status', v_channel.channel_status,
      'lock_version', v_channel.lock_version,
      'authorization_ends_at', v_channel.authorization_ends_at
    ),
    v_channel.financial_terms_hash,
    p_reason,
    p_correlation_id,
    p_idempotency_key
  );

  return v_channel;
end;
$mhidas_plpgsql$;

create function public.mhidas_record_event_ticket_channel_url_validation_v2(
  p_channel_id uuid,
  p_expected_lock_version integer,
  p_validation_result jsonb,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_commercial_channels
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_before public.event_ticket_commercial_channels%rowtype;
  v_channel public.event_ticket_commercial_channels%rowtype;
  v_request_hash text;
  v_replay_result_id uuid;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;

  if coalesce(btrim(p_correlation_id), '') = ''
    or coalesce(btrim(p_idempotency_key), '') = ''
    or jsonb_typeof(p_validation_result) <> 'object' then
    raise exception 'URL_VALIDATION_CONTEXT_INCOMPLETE';
  end if;

  select * into v_before
  from public.event_ticket_commercial_channels
  where channel_id = p_channel_id
  for update;

  if not found then
    raise exception 'COMMERCIAL_CHANNEL_NOT_FOUND';
  end if;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'channel_id', p_channel_id,
    'expected_lock_version', p_expected_lock_version,
    'validation_result', p_validation_result
  ));

  v_replay_result_id := public.mhidas_ticket_assert_receipt_replay_v2(
    'service_role', null, 'record_channel_url_validation', p_idempotency_key,
    'commercial_channel', p_channel_id, p_expected_lock_version, v_request_hash
  );

  if v_replay_result_id is not null then
    select * into strict v_channel
    from public.event_ticket_commercial_channels
    where channel_id = v_replay_result_id;
    return v_channel;
  end if;

  if v_before.lock_version <> p_expected_lock_version then
    raise exception 'CHANNEL_EXPECTED_LOCK_VERSION_CONFLICT';
  end if;

  perform set_config('app.mhidas_ticket_actor_role', 'system', true);
  perform set_config('app.mhidas_ticket_actor_user_id', '', true);

  update public.event_ticket_commercial_channels
  set validated_hostname = lower(p_validation_result ->> 'validated_hostname'),
      validated_final_hostname = lower(p_validation_result ->> 'validated_final_hostname'),
      url_validation_status = p_validation_result ->> 'url_validation_status',
      url_validation_algorithm = nullif(p_validation_result ->> 'url_validation_algorithm', ''),
      url_validation_version = nullif(p_validation_result ->> 'url_validation_version', '')::integer,
      url_validation_hash = nullif(p_validation_result ->> 'url_validation_hash', ''),
      dns_public_validation_hash = nullif(p_validation_result ->> 'dns_public_validation_hash', ''),
      redirect_chain_validation_hash = nullif(p_validation_result ->> 'redirect_chain_validation_hash', ''),
      validated_final_url_hash = nullif(p_validation_result ->> 'validated_final_url_hash', ''),
      url_validated_at = nullif(p_validation_result ->> 'url_validated_at', '')::timestamptz,
      url_validation_expires_at = nullif(p_validation_result ->> 'url_validation_expires_at', '')::timestamptz,
      url_validated_by_service = nullif(p_validation_result ->> 'url_validated_by_service', ''),
      url_validator_version = nullif(p_validation_result ->> 'url_validator_version', '')::integer,
      url_health_status = p_validation_result ->> 'url_health_status',
      resolved_host_hash = nullif(p_validation_result ->> 'resolved_host_hash', ''),
      last_health_checked_at = nullif(p_validation_result ->> 'last_health_checked_at', '')::timestamptz,
      last_health_check_hash = nullif(p_validation_result ->> 'last_health_check_hash', ''),
      lock_version = lock_version + 1
  where channel_id = p_channel_id
    and lock_version = p_expected_lock_version
  returning * into v_channel;

  if not found then
    raise exception 'CHANNEL_EXPECTED_LOCK_VERSION_CONFLICT';
  end if;

  perform public.mhidas_ticket_write_operation_receipt_v2(
    'url_validation', 'service_role', null, 'record_channel_url_validation',
    p_idempotency_key, 'commercial_channel', p_channel_id,
    p_expected_lock_version, v_request_hash, v_channel.channel_id,
    v_channel.url_validation_status, v_channel.lock_version,
    encode(digest(
      v_channel.channel_id::text || ':' || v_channel.url_validation_status || ':' ||
      coalesce(v_channel.url_health_status, '') || ':' || v_channel.lock_version::text,
      'sha256'
    ), 'hex')
  );

  perform public.mhidas_ticket_write_audit_v1(
    'channel', v_channel.channel_id, v_channel.canonical_event_id,
    v_channel.partner_id, v_channel.source_request_id, v_channel.channel_id,
    null, null, null, 'channel_url_validation_recorded',
    v_before.url_validation_status, v_channel.url_validation_status,
    v_channel.lock_version,
    jsonb_build_object(
      'url_validation_status', v_before.url_validation_status,
      'url_health_status', v_before.url_health_status,
      'url_validator_version', v_before.url_validator_version,
      'url_validation_expires_at', v_before.url_validation_expires_at,
      'last_health_checked_at', v_before.last_health_checked_at
    ),
    jsonb_build_object(
      'url_validation_status', v_channel.url_validation_status,
      'url_health_status', v_channel.url_health_status,
      'url_validator_version', v_channel.url_validator_version,
      'url_validation_expires_at', v_channel.url_validation_expires_at,
      'last_health_checked_at', v_channel.last_health_checked_at
    ),
    v_channel.url_validation_hash,
    'trusted server-side URL validation result',
    p_correlation_id,
    p_idempotency_key
  );

  return v_channel;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 17. COMMUNICATION, PURCHASE SIGNAL, EXPIRY AND RETENTION RPCs
-- =============================================================================

create function public.mhidas_mutate_partner_official_communication_v2(
  p_operation text,
  p_communication_id uuid,
  p_expected_lock_version integer,
  p_payload jsonb,
  p_reason_hash text,
  p_review_evidence_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.partner_official_communications
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_user_id uuid := auth.uid();
  v_actor_role text;
  v_before public.partner_official_communications%rowtype;
  v_communication public.partner_official_communications%rowtype;
  v_partner_id uuid;
  v_next_status text;
  v_request_hash text;
  v_replay_result_id uuid;
  v_receipt_target_type text;
  v_receipt_target_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATED_USER_REQUIRED';
  end if;

  if p_operation in ('create_draft','submit') then
    v_actor_role := 'verified_partner_representative';
  elsif p_operation in ('approve','publish','pause','reject','expire') then
    if not public.mhidas_is_useclubbers_admin_v1(v_user_id) then
      raise exception 'USECLUBBERS_ADMIN_REQUIRED';
    end if;
    v_actor_role := 'useclubbers_admin';
  else
    raise exception 'COMMUNICATION_OPERATION_UNSUPPORTED';
  end if;

  if p_operation = 'create_draft' then
    v_partner_id := (p_payload ->> 'partner_id')::uuid;
    if not public.mhidas_ticket_partner_representative_is_authorized_v2(
      v_partner_id,
      v_user_id
    ) then
      raise exception 'COMMUNICATION_VERIFIED_PARTNER_MEMBERSHIP_REQUIRED';
    end if;
    v_receipt_target_type := 'canonical_event';
    v_receipt_target_id := (p_payload ->> 'canonical_event_id')::uuid;
  else
    select * into v_before
    from public.partner_official_communications
    where communication_id = p_communication_id;

    if not found then
      raise exception 'PARTNER_COMMUNICATION_NOT_FOUND';
    end if;

    if v_actor_role = 'verified_partner_representative'
      and not public.mhidas_ticket_partner_representative_is_authorized_v2(
        v_before.partner_id,
        v_user_id
      ) then
      raise exception 'COMMUNICATION_VERIFIED_PARTNER_MEMBERSHIP_REQUIRED';
    end if;
    v_receipt_target_type := 'partner_communication';
    v_receipt_target_id := p_communication_id;
  end if;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'operation', p_operation,
    'communication_id', p_communication_id,
    'expected_lock_version', p_expected_lock_version,
    'payload', coalesce(p_payload, '{}'::jsonb),
    'reason_hash', p_reason_hash,
    'review_evidence_hash', p_review_evidence_hash
  ));

  v_replay_result_id := public.mhidas_ticket_assert_receipt_replay_v2(
    'user', v_user_id, 'mutate_communication:' || p_operation,
    p_idempotency_key, v_receipt_target_type, v_receipt_target_id,
    p_expected_lock_version, v_request_hash
  );

  if v_replay_result_id is not null then
    select * into strict v_communication
    from public.partner_official_communications
    where communication_id = v_replay_result_id;
    return v_communication;
  end if;

  perform set_config('app.mhidas_ticket_actor_role', v_actor_role, true);
  perform set_config('app.mhidas_ticket_actor_user_id', v_user_id::text, true);

  if p_operation = 'create_draft' then
    if p_expected_lock_version <> -1 then
      raise exception 'COMMUNICATION_CREATE_EXPECTED_LOCK_VERSION_MUST_BE_MINUS_ONE';
    end if;

    insert into public.partner_official_communications (
      communication_id,
      partner_id,
      canonical_event_id,
      commercial_channel_id,
      submitted_by_user_id,
      communication_type,
      title,
      body,
      benefit_code,
      starts_at,
      ends_at,
      lifecycle_reason_hash,
      metadata
    )
    values (
      coalesce(p_communication_id, gen_random_uuid()),
      v_partner_id,
      nullif(p_payload ->> 'canonical_event_id', '')::uuid,
      nullif(p_payload ->> 'commercial_channel_id', '')::uuid,
      v_user_id,
      p_payload ->> 'communication_type',
      p_payload ->> 'title',
      p_payload ->> 'body',
      nullif(p_payload ->> 'benefit_code', ''),
      nullif(p_payload ->> 'starts_at', '')::timestamptz,
      nullif(p_payload ->> 'ends_at', '')::timestamptz,
      p_reason_hash,
      coalesce(p_payload -> 'metadata', '{}'::jsonb)
    )
    returning * into v_communication;

    v_before := null;
  else
    select *
    into v_before
    from public.partner_official_communications
    where communication_id = p_communication_id
    for update;

    if not found then
      raise exception 'PARTNER_COMMUNICATION_NOT_FOUND';
    end if;

    if v_before.lock_version <> p_expected_lock_version then
      raise exception 'COMMUNICATION_EXPECTED_LOCK_VERSION_CONFLICT';
    end if;

    v_next_status := case p_operation
      when 'submit' then 'submitted'
      when 'approve' then 'approved'
      when 'publish' then 'published'
      when 'pause' then 'paused'
      when 'reject' then 'rejected'
      when 'expire' then 'expired'
    end;

    update public.partner_official_communications
    set communication_status = v_next_status,
        lifecycle_reason_hash = p_reason_hash,
        review_evidence_hash = case
          when v_next_status in ('approved','published','rejected')
            then coalesce(p_review_evidence_hash, review_evidence_hash)
          else review_evidence_hash
        end,
        lock_version = lock_version + 1
    where communication_id = p_communication_id
      and lock_version = p_expected_lock_version
    returning * into v_communication;

    if not found then
      raise exception 'COMMUNICATION_EXPECTED_LOCK_VERSION_CONFLICT';
    end if;
  end if;

  perform public.mhidas_ticket_write_operation_receipt_v2(
    'communication_mutation', 'user', v_user_id,
    'mutate_communication:' || p_operation, p_idempotency_key,
    v_receipt_target_type, v_receipt_target_id, p_expected_lock_version,
    v_request_hash, v_communication.communication_id,
    v_communication.communication_status, v_communication.lock_version,
    encode(digest(
      v_communication.communication_id::text || ':' ||
      v_communication.communication_status || ':' ||
      v_communication.lock_version::text,
      'sha256'
    ), 'hex')
  );

  perform public.mhidas_ticket_write_audit_v1(
    'communication',
    v_communication.communication_id,
    v_communication.canonical_event_id,
    v_communication.partner_id,
    null,
    v_communication.commercial_channel_id,
    v_communication.communication_id,
    null,
    null,
    'communication_' || p_operation,
    case when p_operation = 'create_draft' then null else v_before.communication_status end,
    v_communication.communication_status,
    v_communication.lock_version,
    case
      when p_operation = 'create_draft' then null
      else jsonb_build_object(
        'communication_status', v_before.communication_status,
        'lock_version', v_before.lock_version
      )
    end,
    jsonb_build_object(
      'communication_status', v_communication.communication_status,
      'lock_version', v_communication.lock_version
    ),
    p_review_evidence_hash,
    'partner communication lifecycle mutation',
    p_correlation_id,
    p_idempotency_key
  );

  return v_communication;
end;
$mhidas_plpgsql$;

create function public.mhidas_record_event_ticket_purchase_signal_v2(
  p_signal_id uuid,
  p_parent_signal_id uuid,
  p_canonical_event_id uuid,
  p_channel_id uuid,
  p_click_id uuid,
  p_user_id uuid,
  p_signal_type text,
  p_evidence_source text,
  p_trusted_evidence_verified boolean,
  p_provider_namespace text,
  p_transaction_hash text,
  p_evidence_hash text,
  p_signature_validation_hash text,
  p_replay_nonce_hash text,
  p_attribution_campaign_id text,
  p_gross_amount_minor bigint,
  p_commission_amount_minor bigint,
  p_currency text,
  p_trusted_confirmed_at timestamptz,
  p_retention_policy_version_id uuid,
  p_retention_expires_at timestamptz,
  p_idempotency_key text,
  p_metadata jsonb,
  p_correlation_id text
)
returns public.event_ticket_purchase_signals
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_signal public.event_ticket_purchase_signals%rowtype;
  v_actor_role text;
  v_actor_user_id uuid := auth.uid();
  v_principal_type text;
  v_request_hash text;
  v_replay_result_id uuid;
begin
  if p_signal_type in ('attributed_conversion','confirmed_conversion') then
    v_actor_role := 'trusted_ticketing_integration';
    if current_setting('request.jwt.claim.role', true) <> 'service_role' then
      raise exception 'TRUSTED_TICKETING_SERVICE_ROLE_REQUIRED';
    end if;
    v_actor_user_id := null;
  elsif p_signal_type = 'correction' then
    if v_actor_user_id is null
      or not public.mhidas_is_useclubbers_admin_v1(v_actor_user_id) then
      raise exception 'USECLUBBERS_ADMIN_REQUIRED';
    end if;
    v_actor_role := 'useclubbers_admin';
  else
    if v_actor_user_id is null or p_user_id is distinct from v_actor_user_id then
      raise exception 'PURCHASE_SIGNAL_OWNERSHIP_REQUIRED';
    end if;
    v_actor_role := 'clubber';
  end if;

  v_principal_type := case
    when v_actor_role = 'trusted_ticketing_integration' then 'trusted_ticketing_integration'
    else 'user'
  end;
  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'signal_id', p_signal_id,
    'parent_signal_id', p_parent_signal_id,
    'canonical_event_id', p_canonical_event_id,
    'channel_id', p_channel_id,
    'click_id', p_click_id,
    'user_id', p_user_id,
    'signal_type', p_signal_type,
    'evidence_source', p_evidence_source,
    'trusted_evidence_verified', p_trusted_evidence_verified,
    'provider_namespace', p_provider_namespace,
    'transaction_hash', p_transaction_hash,
    'evidence_hash', p_evidence_hash,
    'signature_validation_hash', p_signature_validation_hash,
    'replay_nonce_hash', p_replay_nonce_hash,
    'attribution_campaign_id', p_attribution_campaign_id,
    'gross_amount_minor', p_gross_amount_minor,
    'commission_amount_minor', p_commission_amount_minor,
    'currency', p_currency,
    'trusted_confirmed_at', p_trusted_confirmed_at,
    'retention_policy_version_id', p_retention_policy_version_id,
    'retention_expires_at', p_retention_expires_at,
    'metadata', coalesce(p_metadata, '{}'::jsonb)
  ));

  v_replay_result_id := public.mhidas_ticket_assert_receipt_replay_v2(
    v_principal_type, v_actor_user_id, 'insert_purchase_signal',
    p_idempotency_key, 'canonical_event', p_canonical_event_id,
    null, v_request_hash
  );

  if v_replay_result_id is not null then
    select * into strict v_signal
    from public.event_ticket_purchase_signals
    where signal_id = v_replay_result_id;
    return v_signal;
  end if;

  perform set_config('app.mhidas_ticket_actor_role', v_actor_role, true);
  perform set_config(
    'app.mhidas_ticket_actor_user_id',
    coalesce(v_actor_user_id::text, ''),
    true
  );

  if p_parent_signal_id is not null
    and not exists (
      select 1
      from public.event_ticket_purchase_signals s
      where s.signal_id = p_parent_signal_id
        and s.canonical_event_id = p_canonical_event_id
    ) then
    raise exception 'PURCHASE_SIGNAL_PARENT_EVENT_MISMATCH';
  end if;

  if p_channel_id is not null
    and not exists (
      select 1
      from public.event_ticket_commercial_channels c
      where c.channel_id = p_channel_id
        and c.canonical_event_id = p_canonical_event_id
    ) then
    raise exception 'PURCHASE_SIGNAL_CHANNEL_EVENT_MISMATCH';
  end if;

  insert into public.event_ticket_purchase_signals (
    signal_id,
    parent_signal_id,
    canonical_event_id,
    channel_id,
    click_id,
    user_id,
    signal_type,
    evidence_source,
    trusted_evidence_verified,
    provider_namespace,
    transaction_hash,
    transaction_hash_algorithm,
    transaction_hash_version,
    evidence_hash,
    signature_validation_hash,
    replay_nonce_hash,
    attribution_campaign_id,
    gross_amount_minor,
    commission_amount_minor,
    currency,
    trusted_confirmed_at,
    trusted_confirmed_by_actor_role,
    retention_policy_version_id,
    retention_expires_at,
    idempotency_key,
    metadata
  )
  values (
    coalesce(p_signal_id, gen_random_uuid()),
    p_parent_signal_id,
    p_canonical_event_id,
    p_channel_id,
    p_click_id,
    p_user_id,
    p_signal_type,
    p_evidence_source,
    p_trusted_evidence_verified,
    p_provider_namespace,
    p_transaction_hash,
    case when p_transaction_hash is null then null else 'sha256' end,
    case when p_transaction_hash is null then null else 1 end,
    p_evidence_hash,
    p_signature_validation_hash,
    p_replay_nonce_hash,
    p_attribution_campaign_id,
    p_gross_amount_minor,
    p_commission_amount_minor,
    p_currency,
    p_trusted_confirmed_at,
    case
      when p_signal_type in ('attributed_conversion','confirmed_conversion')
        then 'trusted_ticketing_integration'
      else null
    end,
    p_retention_policy_version_id,
    p_retention_expires_at,
    p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_signal;

  perform public.mhidas_ticket_write_operation_receipt_v2(
    'signal_insert', v_principal_type, v_actor_user_id,
    'insert_purchase_signal', p_idempotency_key,
    'canonical_event', p_canonical_event_id, null, v_request_hash,
    v_signal.signal_id, v_signal.signal_type, null,
    encode(digest(
      v_signal.signal_id::text || ':' || v_signal.signal_type || ':' ||
      coalesce(v_signal.transaction_hash, ''),
      'sha256'
    ), 'hex')
  );

  perform public.mhidas_ticket_write_audit_v1(
    'signal',
    v_signal.signal_id,
    v_signal.canonical_event_id,
    null,
    null,
    v_signal.channel_id,
    null,
    v_signal.signal_id,
    null,
    'purchase_signal_inserted',
    null,
    v_signal.signal_type,
    null,
    null,
    jsonb_build_object(
      'signal_type', v_signal.signal_type,
      'evidence_source', v_signal.evidence_source,
      'trusted_evidence_verified', v_signal.trusted_evidence_verified
    ),
    v_signal.evidence_hash,
    'append-only purchase signal',
    p_correlation_id,
    p_idempotency_key
  );

  return v_signal;
end;
$mhidas_plpgsql$;

create function public.mhidas_expire_event_ticket_commercial_channels_v2(
  p_batch_limit integer,
  p_correlation_id text,
  p_idempotency_key text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_count integer := 0;
  v_channel public.event_ticket_commercial_channels%rowtype;
  v_expired public.event_ticket_commercial_channels%rowtype;
  v_request_hash text;
  v_replay_result_id uuid;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;

  if p_batch_limit < 1 or p_batch_limit > 5000 then
    raise exception 'CHANNEL_EXPIRY_BATCH_LIMIT_INVALID';
  end if;

  perform set_config('app.mhidas_ticket_actor_role', 'automation', true);
  perform set_config('app.mhidas_ticket_actor_user_id', '', true);

  for v_channel in
    select c.*
    from public.event_ticket_commercial_channels c
    where c.channel_status in ('authorized','active','paused')
      and c.authorization_ends_at is not null
      and c.authorization_ends_at <= now()
    order by c.authorization_ends_at, c.channel_id
    for update skip locked
    limit p_batch_limit
  loop
    v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
      'channel_id', v_channel.channel_id,
      'expected_lock_version', v_channel.lock_version,
      'authorization_ends_at', v_channel.authorization_ends_at
    ));

    v_replay_result_id := public.mhidas_ticket_assert_receipt_replay_v2(
      'automation', null, 'expire_channel',
      p_idempotency_key || ':' || v_channel.channel_id::text,
      'commercial_channel', v_channel.channel_id,
      v_channel.lock_version, v_request_hash
    );

    if v_replay_result_id is not null then
      continue;
    end if;

    update public.event_ticket_commercial_channels
    set channel_status = 'expired',
        expired_by_actor_role = 'automation',
        expired_at = now(),
        lock_version = lock_version + 1
    where channel_id = v_channel.channel_id
      and lock_version = v_channel.lock_version
      and channel_status in ('authorized','active','paused')
      and authorization_ends_at is not null
      and authorization_ends_at <= now()
    returning * into v_expired;

    if not found then
      continue;
    end if;

    perform public.mhidas_ticket_write_operation_receipt_v2(
      'channel_expiry', 'automation', null, 'expire_channel',
      p_idempotency_key || ':' || v_channel.channel_id::text,
      'commercial_channel', v_channel.channel_id, v_channel.lock_version,
      v_request_hash, v_expired.channel_id, v_expired.channel_status,
      v_expired.lock_version,
      encode(digest(
        v_expired.channel_id::text || ':' || v_expired.channel_status || ':' ||
        v_expired.lock_version::text,
        'sha256'
      ), 'hex')
    );

    perform public.mhidas_ticket_write_audit_v1(
      'channel', v_expired.channel_id, v_expired.canonical_event_id,
      v_expired.partner_id, v_expired.source_request_id, v_expired.channel_id,
      null, null, null, 'channel_expired_automatically',
      v_channel.channel_status, 'expired', v_expired.lock_version,
      jsonb_build_object('channel_status', v_channel.channel_status, 'lock_version', v_channel.lock_version),
      jsonb_build_object('channel_status', 'expired', 'lock_version', v_expired.lock_version),
      v_expired.financial_terms_hash, 'authorization validity ended',
      p_correlation_id, p_idempotency_key || ':' || v_channel.channel_id::text
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$mhidas_plpgsql$;

create function public.mhidas_run_event_ticket_retention_batch_v2(
  p_retention_policy_version_id uuid,
  p_batch_limit integer,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_retention_runs
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_policy public.event_ticket_retention_policy_versions%rowtype;
  v_run public.event_ticket_retention_runs%rowtype;
  v_click_deleted integer := 0;
  v_click_anonymized integer := 0;
  v_signal_tombstoned integer := 0;
  v_signal_skipped integer := 0;
  v_request_hash text;
  v_replay_result_id uuid;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;

  if p_batch_limit < 1 or p_batch_limit > 5000 then
    raise exception 'RETENTION_BATCH_LIMIT_INVALID';
  end if;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'retention_policy_version_id', p_retention_policy_version_id,
    'batch_limit', p_batch_limit
  ));

  v_replay_result_id := public.mhidas_ticket_assert_receipt_replay_v2(
    'service_role', null, 'run_retention_batch', p_idempotency_key,
    'retention_policy', p_retention_policy_version_id, null, v_request_hash
  );

  if v_replay_result_id is not null then
    select * into strict v_run
    from public.event_ticket_retention_runs
    where retention_run_id = v_replay_result_id;
    return v_run;
  end if;

  select * into v_policy
  from public.event_ticket_retention_policy_versions
  where retention_policy_version_id = p_retention_policy_version_id
    and policy_status = 'active'
    and signal_action = 'tombstone_all'
  for key share;

  if not found then
    raise exception 'ACTIVE_TOMBSTONE_RETENTION_POLICY_REQUIRED';
  end if;

  perform set_config('app.mhidas_ticket_actor_role', 'automation', true);
  perform set_config('app.mhidas_ticket_actor_user_id', '', true);

  insert into public.event_ticket_retention_runs (
    retention_policy_version_id, batch_limit, correlation_id, idempotency_key
  )
  values (
    p_retention_policy_version_id, p_batch_limit, p_correlation_id, p_idempotency_key
  )
  returning * into v_run;

  perform set_config(
    'app.mhidas_ticket_retention_run_id',
    v_run.retention_run_id::text,
    true
  );

  with candidates as (
    select s.signal_id
    from public.event_ticket_purchase_signals s
    where s.retention_expires_at <= now()
      and s.retention_processed_at is null
      and s.retention_policy_version_id = p_retention_policy_version_id
    order by s.retention_expires_at, s.signal_id
    for update skip locked
    limit p_batch_limit
  )
  update public.event_ticket_purchase_signals s
  set user_id = null,
      click_id = null,
      attribution_campaign_id = null,
      metadata = jsonb_build_object(
        'retention_class', 'tombstoned',
        'evidence_version', 2
      ),
      retention_processed_at = now(),
      retention_result = 'tombstoned'
  from candidates x
  where s.signal_id = x.signal_id;

  get diagnostics v_signal_tombstoned = row_count;

  if v_policy.click_action = 'delete' then
    with candidates as (
      select c.click_id
      from public.event_ticket_click_attributions c
      where c.retention_expires_at <= now()
        and c.retention_processed_at is null
        and c.retention_policy_version_id = p_retention_policy_version_id
        and not exists (
          select 1
          from public.event_ticket_purchase_signals s
          where s.click_id = c.click_id
        )
      order by c.retention_expires_at, c.click_id
      for update skip locked
      limit p_batch_limit
    )
    delete from public.event_ticket_click_attributions c
    using candidates x
    where c.click_id = x.click_id;
    get diagnostics v_click_deleted = row_count;

    with candidates as (
      select c.click_id
      from public.event_ticket_click_attributions c
      where c.retention_expires_at <= now()
        and c.retention_processed_at is null
        and c.retention_policy_version_id = p_retention_policy_version_id
        and exists (
          select 1
          from public.event_ticket_purchase_signals s
          where s.click_id = c.click_id
        )
      order by c.retention_expires_at, c.click_id
      for update skip locked
      limit p_batch_limit
    )
    update public.event_ticket_click_attributions c
    set user_id = null,
        session_attribution_hash = null,
        campaign_id = null,
        retention_processed_at = now(),
        metadata = '{}'::jsonb
    from candidates x
    where c.click_id = x.click_id;
    get diagnostics v_click_anonymized = row_count;
  else
    with candidates as (
      select c.click_id
      from public.event_ticket_click_attributions c
      where c.retention_expires_at <= now()
        and c.retention_processed_at is null
        and c.retention_policy_version_id = p_retention_policy_version_id
      order by c.retention_expires_at, c.click_id
      for update skip locked
      limit p_batch_limit
    )
    update public.event_ticket_click_attributions c
    set user_id = null,
        session_attribution_hash = null,
        campaign_id = null,
        retention_processed_at = now(),
        metadata = '{}'::jsonb
    from candidates x
    where c.click_id = x.click_id;
    get diagnostics v_click_anonymized = row_count;
  end if;


  select count(*) into v_signal_skipped
  from public.event_ticket_purchase_signals s
  where s.retention_expires_at <= now()
    and s.retention_processed_at is null
    and s.retention_policy_version_id <> p_retention_policy_version_id;

  update public.event_ticket_retention_runs
  set run_status = 'completed',
      click_deleted_count = v_click_deleted,
      click_anonymized_count = v_click_anonymized,
      signal_tombstoned_count = v_signal_tombstoned,
      signal_skipped_count = v_signal_skipped,
      checkpoint = jsonb_build_object(
        'completed_at', now(),
        'batch_limit', p_batch_limit,
        'tombstoned_count', v_signal_tombstoned,
        'skipped_count', v_signal_skipped
      ),
      completed_at = now()
  where retention_run_id = v_run.retention_run_id
  returning * into v_run;

  perform public.mhidas_ticket_write_operation_receipt_v2(
    'retention_run', 'service_role', null, 'run_retention_batch',
    p_idempotency_key, 'retention_policy', p_retention_policy_version_id,
    null, v_request_hash, v_run.retention_run_id, v_run.run_status, null,
    encode(digest(
      v_run.retention_run_id::text || ':' || v_run.run_status || ':' ||
      v_signal_tombstoned::text || ':' || v_signal_skipped::text,
      'sha256'
    ), 'hex')
  );

  perform public.mhidas_ticket_write_audit_v1(
    'retention_run', v_run.retention_run_id, null, null, null, null,
    null, null, v_run.retention_run_id, 'retention_batch_completed',
    'running', 'completed', null, null,
    jsonb_build_object(
      'click_deleted_count', v_click_deleted,
      'click_anonymized_count', v_click_anonymized,
      'tombstoned_count', v_signal_tombstoned,
      'skipped_count', v_signal_skipped
    ),
    v_policy.policy_manifest_hash, 'retention policy enforcement',
    p_correlation_id, p_idempotency_key
  );

  return v_run;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 18. SERVER-ONLY PUBLIC RESOLUTION CONTRACT
-- =============================================================================

create function public.mhidas_resolve_public_event_ticket_action_v2(
  p_canonical_event_id uuid
)
returns table (
  action_kind text,
  action_label text,
  target_url text,
  commercial_channel_id uuid,
  official_source_id uuid,
  reason_code text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_channel public.event_ticket_commercial_channels%rowtype;
  v_source public.canonical_event_sources%rowtype;
begin
  select c.* into v_channel
  from public.event_ticket_commercial_channels c
  where c.canonical_event_id = p_canonical_event_id
    and c.channel_status = 'active'
    and public.mhidas_ticket_url_proof_is_fresh_v2(
      c.url_validation_status,
      c.url_validation_expires_at,
      c.url_health_status,
      c.last_health_checked_at,
      c.url_validator_version,
      c.resolved_host_hash,
      c.redirect_chain_validation_hash
    )
    and c.authorization_starts_at <= now()
    and (c.authorization_ends_at is null or c.authorization_ends_at > now())
  order by c.public_priority, c.activated_at desc, c.channel_id
  limit 1;

  if found then
    return query
    select
      'commercial_channel'::text,
      'Comprar ingresso'::text,
      v_channel.commercial_url,
      v_channel.channel_id,
      null::uuid,
      'authorized_monetized_channel_active_fresh_healthy'::text;
    return;
  end if;

  select s.* into v_source
  from public.canonical_event_sources s
  where s.canonical_event_id = p_canonical_event_id
    and s.reference_status = 'validated'
    and s.source_url is not null
    and s.reference_domain is not null
    and public.mhidas_ticket_domain_matches_v1(
      public.mhidas_ticket_extract_hostname_v1(s.source_url),
      s.reference_domain,
      true
    )
  order by s.authority_score desc, s.validated_at desc, s.id
  limit 1;

  if found then
    return query
    select
      'official_reference'::text,
      'Ver evento oficial'::text,
      v_source.source_url,
      null::uuid,
      v_source.id,
      'commercial_channel_failed_closed_official_reference_available'::text;
    return;
  end if;

  return query
  select
    'unavailable'::text,
    'Canal de vendas a confirmar'::text,
    null::text,
    null::uuid,
    null::uuid,
    'no_fresh_healthy_authorized_channel_or_validated_reference'::text;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 19. RLS, PRIVILEGE BOUNDARIES AND SERVER-ONLY MUTATION
-- =============================================================================

alter table public.commercial_partners enable row level security;
alter table public.commercial_partner_representatives enable row level security;
alter table public.event_ticket_partnership_requests enable row level security;
alter table public.event_ticket_retention_policy_versions enable row level security;
alter table public.event_ticket_commercial_channels enable row level security;
alter table public.event_ticket_click_attributions enable row level security;
alter table public.event_ticket_purchase_signals enable row level security;
alter table public.partner_official_communications enable row level security;
alter table public.event_ticket_retention_runs enable row level security;
alter table public.event_ticket_commercial_audit_log enable row level security;
alter table public.event_ticket_operation_receipts enable row level security;
alter table public.event_ticket_backfill_rejections enable row level security;

revoke all on table public.commercial_partners from public, anon, authenticated;
revoke all on table public.commercial_partner_representatives from public, anon, authenticated;
revoke all on table public.event_ticket_partnership_requests from public, anon, authenticated;
revoke all on table public.event_ticket_retention_policy_versions from public, anon, authenticated;
revoke all on table public.event_ticket_commercial_channels from public, anon, authenticated;
revoke all on table public.event_ticket_click_attributions from public, anon, authenticated;
revoke all on table public.event_ticket_purchase_signals from public, anon, authenticated;
revoke all on table public.partner_official_communications from public, anon, authenticated;
revoke all on table public.event_ticket_retention_runs from public, anon, authenticated;
revoke all on table public.event_ticket_commercial_audit_log from public, anon, authenticated;
revoke all on table public.event_ticket_operation_receipts from public, anon, authenticated;
revoke all on table public.event_ticket_backfill_rejections from public, anon, authenticated;

create policy commercial_partners_admin_read_v490
on public.commercial_partners
for select
to authenticated
using (public.mhidas_is_useclubbers_admin_v1(auth.uid()));

create policy commercial_partner_representatives_own_or_admin_read_v490
on public.commercial_partner_representatives
for select
to authenticated
using (
  user_id = auth.uid()
  or public.mhidas_is_useclubbers_admin_v1(auth.uid())
);

create policy event_ticket_partnership_requests_own_partner_or_admin_read_v490
on public.event_ticket_partnership_requests
for select
to authenticated
using (
  public.mhidas_is_useclubbers_admin_v1(auth.uid())
  or exists (
    select 1
    from public.commercial_partner_representatives r
    join public.commercial_partners p on p.partner_id = r.partner_id
    where r.partner_id = event_ticket_partnership_requests.partner_id
      and r.user_id = auth.uid()
      and p.partner_status = 'verified'
      and r.representation_status = 'active'
      and (r.valid_from is null or r.valid_from <= now())
      and (r.valid_until is null or r.valid_until > now())
  )
);

create policy event_ticket_purchase_signals_own_or_admin_read_v490
on public.event_ticket_purchase_signals
for select
to authenticated
using (
  user_id = auth.uid()
  or public.mhidas_is_useclubbers_admin_v1(auth.uid())
);

create policy partner_official_communications_own_partner_or_admin_read_v490
on public.partner_official_communications
for select
to authenticated
using (
  public.mhidas_is_useclubbers_admin_v1(auth.uid())
  or exists (
    select 1
    from public.commercial_partner_representatives r
    join public.commercial_partners p on p.partner_id = r.partner_id
    where r.partner_id = partner_official_communications.partner_id
      and r.user_id = auth.uid()
      and p.partner_status = 'verified'
      and r.representation_status = 'active'
      and (r.valid_from is null or r.valid_from <= now())
      and (r.valid_until is null or r.valid_until > now())
  )
);

create policy event_ticket_commercial_channels_admin_read_v490
on public.event_ticket_commercial_channels
for select
to authenticated
using (public.mhidas_is_useclubbers_admin_v1(auth.uid()));

create policy event_ticket_commercial_audit_admin_read_v490
on public.event_ticket_commercial_audit_log
for select
to authenticated
using (public.mhidas_is_useclubbers_admin_v1(auth.uid()));

create policy event_ticket_backfill_rejections_admin_read_v490
on public.event_ticket_backfill_rejections
for select
to authenticated
using (public.mhidas_is_useclubbers_admin_v1(auth.uid()));

revoke all on function public.mhidas_ticket_extract_hostname_v1(text)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_hostname_is_structurally_public_v1(text)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_domain_matches_v1(text,text,boolean)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_request_hash_v2(jsonb)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_scalar_is_safe_v2(jsonb)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_metadata_is_allowed_v2(text,jsonb)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_partner_representative_is_authorized_v2(uuid,uuid)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_url_proof_is_fresh_v2(text,timestamptz,text,timestamptz,integer,text,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_assert_receipt_replay_v2(text,uuid,text,text,text,uuid,integer,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_write_operation_receipt_v2(text,text,uuid,text,text,text,uuid,integer,text,uuid,text,integer,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_assert_actor_context_v1(text[])
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_write_audit_v1(
  text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,integer,jsonb,jsonb,text,text,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_partner_submit_ticket_partnership_request_v2(
  uuid,uuid,text,text,text,text,date,text,text,text,text,text,text,text,text,jsonb,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_mutate_ticket_partnership_request_v2(
  text,uuid,integer,text,text,text,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_admin_mutate_event_ticket_commercial_channel_v2(
  text,uuid,integer,jsonb,text,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_record_event_ticket_channel_url_validation_v2(
  uuid,integer,jsonb,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_mutate_partner_official_communication_v2(
  text,uuid,integer,jsonb,text,text,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_record_event_ticket_purchase_signal_v2(
  uuid,uuid,uuid,uuid,uuid,uuid,text,text,boolean,text,text,text,text,text,text,bigint,bigint,text,timestamptz,uuid,timestamptz,text,jsonb,text
) from public, anon, authenticated;
revoke all on function public.mhidas_expire_event_ticket_commercial_channels_v2(
  integer,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_run_event_ticket_retention_batch_v2(
  uuid,integer,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_resolve_public_event_ticket_action_v2(uuid)
  from public;

grant execute on function public.mhidas_partner_submit_ticket_partnership_request_v2(
  uuid,uuid,text,text,text,text,date,text,text,text,text,text,text,text,text,jsonb,text,text
) to authenticated;
grant execute on function public.mhidas_mutate_ticket_partnership_request_v2(
  text,uuid,integer,text,text,text,text,text
) to authenticated;
grant execute on function public.mhidas_admin_mutate_event_ticket_commercial_channel_v2(
  text,uuid,integer,jsonb,text,text,text
) to authenticated;
grant execute on function public.mhidas_mutate_partner_official_communication_v2(
  text,uuid,integer,jsonb,text,text,text,text
) to authenticated;
grant execute on function public.mhidas_record_event_ticket_purchase_signal_v2(
  uuid,uuid,uuid,uuid,uuid,uuid,text,text,boolean,text,text,text,text,text,text,bigint,bigint,text,timestamptz,uuid,timestamptz,text,jsonb,text
) to authenticated, service_role;
grant execute on function public.mhidas_expire_event_ticket_commercial_channels_v2(
  integer,text,text
) to service_role;
grant execute on function public.mhidas_run_event_ticket_retention_batch_v2(
  uuid,integer,text,text
) to service_role;
grant execute on function public.mhidas_resolve_public_event_ticket_action_v2(uuid)
  to anon, authenticated, service_role;

-- =============================================================================
-- 20. BACKFILL RECONCILIATION WITH NO SILENT SKIP
-- =============================================================================

create temporary table mhidas_v490_backfill_reconciliation (
  source_table text not null,
  source_primary_key text not null,
  source_classification text not null,
  canonical_event_id uuid,
  partner_id uuid,
  target_id uuid,
  reason_code text not null,
  source_payload_hash text not null,
  primary key (source_table, source_primary_key)
) on commit drop;

insert into mhidas_v490_backfill_reconciliation (
  source_table,
  source_primary_key,
  source_classification,
  canonical_event_id,
  partner_id,
  target_id,
  reason_code,
  source_payload_hash
)
select
  'partner_ticket_requests',
  r.request_id::text,
  'rejected',
  null,
  null,
  null,
  case
    when r.partner_name is null or btrim(r.partner_name) = ''
      then 'legacy_partner_identity_missing'
    when r.event_name is null or r.event_date is null
      then 'legacy_event_identity_incomplete'
    when r.requested_ticket_url is not null
      then 'legacy_raw_commercial_url_requires_new_server_validation'
    else 'verified_partner_and_canonical_event_mapping_required'
  end,
  encode(digest(
    concat_ws(
      ':',
      r.request_id::text,
      coalesce(r.event_group_id::text, ''),
      coalesce(r.partner_name, ''),
      coalesce(r.event_name, ''),
      coalesce(r.event_date::text, ''),
      coalesce(r.request_status, '')
    ),
    'sha256'
  ), 'hex')
from public.partner_ticket_requests r;

insert into mhidas_v490_backfill_reconciliation (
  source_table,
  source_primary_key,
  source_classification,
  canonical_event_id,
  partner_id,
  target_id,
  reason_code,
  source_payload_hash
)
select
  'event_groups',
  g.group_id::text,
  'rejected',
  null,
  null,
  null,
  case
    when g.partner_ticket_url is not null
      then 'legacy_channel_requires_authorization_financial_terms_and_url_validation'
    else 'legacy_commercial_status_requires_explicit_reconciliation'
  end,
  encode(digest(
    concat_ws(
      ':',
      g.group_id::text,
      coalesce(g.partner_ticket_status, ''),
      coalesce(g.partner_ticket_url, ''),
      coalesce(g.partner_ticket_partner_name, ''),
      coalesce(g.partner_ticket_source, '')
    ),
    'sha256'
  ), 'hex')
from public.event_groups g
where g.partner_ticket_url is not null
   or g.partner_ticket_status <> 'inactive'
   or g.partner_ticket_partner_name is not null;

insert into mhidas_v490_backfill_reconciliation (
  source_table,
  source_primary_key,
  source_classification,
  canonical_event_id,
  partner_id,
  target_id,
  reason_code,
  source_payload_hash
)
select
  'event_ticket_intents',
  i.intent_id::text,
  'rejected',
  null,
  null,
  null,
  'legacy_self_declared_purchase_requires_event_group_to_canonical_mapping',
  encode(digest(
    concat_ws(
      ':',
      i.intent_id::text,
      i.event_group_id::text,
      i.user_id::text,
      i.status,
      i.updated_at::text
    ),
    'sha256'
  ), 'hex')
from public.event_ticket_intents i
where i.status = 'ticket_acquired';

insert into public.event_ticket_backfill_rejections (
  source_table,
  source_primary_key,
  classification,
  rejection_reason,
  canonical_event_id,
  source_payload_hash,
  reconciliation_run_key
)
select
  r.source_table,
  r.source_primary_key,
  r.source_classification,
  r.reason_code,
  r.canonical_event_id,
  r.source_payload_hash,
  'v4.8.90-protected-draft'
from mhidas_v490_backfill_reconciliation r
where r.source_classification = 'rejected';

do $mhidas_backfill_count_closure$
declare
  v_legacy_request_count bigint;
  v_legacy_group_count bigint;
  v_legacy_intent_count bigint;
  v_reconciled_request_count bigint;
  v_reconciled_group_count bigint;
  v_reconciled_intent_count bigint;
  v_duplicate_count bigint;
begin
  select count(*) into v_legacy_request_count
  from public.partner_ticket_requests;

  select count(*) into v_legacy_group_count
  from public.event_groups g
  where g.partner_ticket_url is not null
     or g.partner_ticket_status <> 'inactive'
     or g.partner_ticket_partner_name is not null;

  select count(*) into v_legacy_intent_count
  from public.event_ticket_intents i
  where i.status = 'ticket_acquired';

  select count(*) into v_reconciled_request_count
  from mhidas_v490_backfill_reconciliation
  where source_table = 'partner_ticket_requests';

  select count(*) into v_reconciled_group_count
  from mhidas_v490_backfill_reconciliation
  where source_table = 'event_groups';

  select count(*) into v_reconciled_intent_count
  from mhidas_v490_backfill_reconciliation
  where source_table = 'event_ticket_intents';

  select count(*)
  into v_duplicate_count
  from (
    select source_table, source_primary_key
    from mhidas_v490_backfill_reconciliation
    group by source_table, source_primary_key
    having count(*) <> 1
  ) duplicated;

  if v_legacy_request_count <> v_reconciled_request_count
    or v_legacy_group_count <> v_reconciled_group_count
    or v_legacy_intent_count <> v_reconciled_intent_count
    or v_duplicate_count <> 0 then
    raise exception using
      errcode = 'P0001',
      message = 'BACKFILL_RECONCILIATION_COUNT_MISMATCH',
      detail = format(
        'requests=%s/%s groups=%s/%s intents=%s/%s duplicates=%s',
        v_reconciled_request_count,
        v_legacy_request_count,
        v_reconciled_group_count,
        v_legacy_group_count,
        v_reconciled_intent_count,
        v_legacy_intent_count,
        v_duplicate_count
      );
  end if;
end;
$mhidas_backfill_count_closure$;

-- No legacy commercial row is automatically promoted to an active channel.
-- Every rejected row is preserved in a reconciliation report with a SHA-256
-- source fingerprint and must be resolved through a later controlled run.

-- =============================================================================
-- 21. ADJUSTMENT EVIDENCE MATRIX
-- =============================================================================

create temporary table mhidas_v490_adjustment_evidence (
  adjustment_key text primary key,
  evidence_state text not null,
  sql_evidence text[] not null,
  external_prerequisite text,
  promotion_blocked boolean not null
) on commit drop;

insert into mhidas_v490_adjustment_evidence values
(
  'exact_schema_preflight_without_drift_masking',
  'implemented_in_protected_draft',
  array['mhidas_exact_schema_preflight','canonical_event_sources signature','target object absence'],
  'fresh production schema inventory and approved drift manifest',
  true
),
(
  'verified_partner_registry_foreign_key',
  'implemented_in_protected_draft',
  array['commercial_partners','commercial_partner_representatives','partner_id foreign keys'],
  'verified partner onboarding and identity governance',
  true
),
(
  'financial_field_matrix',
  'implemented_in_protected_draft',
  array['event_ticket_commercial_channels_financial_matrix_v490_check'],
  'commercial and accounting approval of remuneration semantics',
  true
),
(
  'transactional_admin_mutation_rpc',
  'implemented_in_protected_draft',
  array['mhidas_admin_mutate_event_ticket_commercial_channel_v2','operation receipts','audit writer'],
  'approved admin authorization RPC contract',
  true
),
(
  'optimistic_concurrency_expected_version',
  'implemented_in_protected_draft',
  array['lock_version','expected_lock_version conflict checks','idempotency receipts'],
  'concurrency test plan with parallel sessions',
  true
),
(
  'request_lifecycle_guard_and_audit',
  'implemented_in_protected_draft',
  array['mhidas_ticket_partnership_request_guard_v1','mhidas_mutate_ticket_partnership_request_v2'],
  'partner support workflow and service-level policy',
  true
),
(
  'request_channel_cross_entity_consistency',
  'implemented_in_protected_draft',
  array['COMMERCIAL_CHANNEL_REQUEST_ENTITY_MISMATCH','approved_partner_request consistency'],
  'approved legacy partner-to-registry mapping',
  true
),
(
  'freeze_sensitive_active_channel_fields',
  'implemented_in_protected_draft',
  array['COMMERCIAL_CHANNEL_ACTIVE_SENSITIVE_FIELDS_FROZEN'],
  'approved change-management policy for replacement channels',
  true
),
(
  'expiry_and_atomic_channel_cutover',
  'implemented_in_protected_draft',
  array['atomic_cutover','single active channel index','mhidas_expire_event_ticket_commercial_channels_v2'],
  'scheduler ownership and failure-recovery runbook',
  true
),
(
  'official_reference_url_domain_integrity',
  'implemented_in_protected_draft',
  array['canonical_event_sources reference fields','reference integrity trigger','official resolver fallback'],
  'authoritative domain inventory per source',
  true
),
(
  'commercial_url_public_network_validation',
  'partially_implemented_external_validator_required',
  array['HTTPS structure','hostname restrictions','DNS and redirect proof hashes','freshness requirement'],
  'server-side DNS, redirect and SSRF validator service',
  true
),
(
  'immutable_purchase_signal_lineage',
  'implemented_in_protected_draft',
  array['append-only trigger','parent_signal_id','correction as new row'],
  'legacy event-group to canonical-event reconciliation map',
  true
),
(
  'conversion_channel_and_provider_namespace',
  'implemented_in_protected_draft',
  array['conversion requires channel','provider_namespace','trusted evidence proof fields'],
  'ticketing provider namespace registry and signed integration contracts',
  true
),
(
  'hash_format_and_metadata_privacy_guards',
  'implemented_in_protected_draft',
  array['SHA-256 format checks','hash version columns','context-specific metadata allowlists and scalar guards'],
  'privacy and legal review of data classification',
  true
),
(
  'communication_lifecycle_evidence',
  'implemented_in_protected_draft',
  array['partner_official_communications','communication lifecycle trigger','commercial context consistency'],
  'notification delivery policy and moderation service-level agreement',
  true
),
(
  'audit_coverage_and_consistency',
  'implemented_in_protected_draft',
  array['event_ticket_commercial_audit_log','append-only audit trigger','correlation and idempotency keys'],
  'audit retention, access and incident response policy',
  true
),
(
  'retention_and_cleanup_enforcement',
  'implemented_in_protected_draft',
  array['retention policy versions','retention runs','tombstone-only retention RPC with immutable factual fields'],
  'approved legal basis and retention periods',
  true
),
(
  'backfill_reconciliation_and_no_silent_skip',
  'implemented_as_rejection_first_reconciliation',
  array['mhidas_v490_backfill_reconciliation','backfill rejection ledger','count closure assertion'],
  'verified partner map, event-group canonical map, backup and dry-run report',
  true
);

do $mhidas_adjustment_evidence_self_check$
declare
  v_count integer;
  v_unblocked integer;
begin
  select count(*) into v_count
  from mhidas_v490_adjustment_evidence;

  select count(*) into v_unblocked
  from mhidas_v490_adjustment_evidence
  where promotion_blocked = false;

  if v_count <> 18 then
    raise exception 'ADJUSTMENT_EVIDENCE_COUNT_MISMATCH: %', v_count;
  end if;

  if v_unblocked <> 0 then
    raise exception 'PROTECTED_DRAFT_PROMOTION_MUST_REMAIN_BLOCKED';
  end if;
end;
$mhidas_adjustment_evidence_self_check$;


-- =============================================================================
-- 22. SECOND-ADJUSTMENT CORRECTION EVIDENCE
-- =============================================================================

create temporary table mhidas_v493_second_adjustment_evidence (
  finding_key text primary key,
  correction_status text not null,
  evidence text[] not null,
  promotion_blocked boolean not null
) on commit drop;

insert into mhidas_v493_second_adjustment_evidence (
  finding_key, correction_status, evidence, promotion_blocked
)
values
(
  'automation_expiry_state_mismatch',
  'corrected_in_protected_draft',
  array['authorized-active-paused expiry allowlist','actual update row count','per-channel semantic receipt'],
  true
),
(
  'idempotency_receipt_not_bound_to_actor_and_request',
  'corrected_in_protected_draft',
  array['principal-bound receipt','target and expected version','canonical request hash','authorization before replay'],
  true
),
(
  'metadata_privacy_guard_is_denylist_only',
  'corrected_in_protected_draft',
  array['context allowlists','flat scalar-only metadata','byte and item limits','PII pattern rejection'],
  true
),
(
  'purchase_signal_retention_mutation_scope_too_broad',
  'corrected_in_protected_draft',
  array['dedicated retention RPC','exact anonymization allowlist','all factual fields frozen'],
  true
),
(
  'retention_delete_conflicts_with_signal_lineage_and_audit_fk',
  'corrected_in_protected_draft',
  array['no purchase signal delete','tombstone_all policy','lineage and audit preserved'],
  true
),
(
  'partner_membership_ambiguity_and_partner_status_gap',
  'corrected_in_protected_draft',
  array['exact partner EXISTS','verified partner join','active valid representation'],
  true
),
(
  'url_validation_freshness_is_optional_and_resolver_fail_open',
  'corrected_in_protected_draft',
  array['caller boolean removed','mandatory fresh healthy proof','public resolver fail-closed'],
  true
);

do $mhidas_v493_second_adjustment_self_check$
declare
  v_count integer;
  v_unblocked integer;
begin
  select count(*) into v_count
  from mhidas_v493_second_adjustment_evidence;

  select count(*) into v_unblocked
  from mhidas_v493_second_adjustment_evidence
  where promotion_blocked = false;

  if v_count <> 7 then
    raise exception 'SECOND_ADJUSTMENT_EVIDENCE_COUNT_MISMATCH: %', v_count;
  end if;

  if v_unblocked <> 0 then
    raise exception 'CORRECTED_DRAFT_PROMOTION_MUST_REMAIN_BLOCKED';
  end if;
end;
$mhidas_v493_second_adjustment_self_check$;


-- =============================================================================
-- 23. FOURTH CORRECTION LAYER FOR THE TEN V4.8.94 BLOCKERS
-- =============================================================================

-- 23.1 Effective URL-validation execution boundary.

grant execute on function public.mhidas_record_event_ticket_channel_url_validation_v2(
  uuid,integer,jsonb,text,text
) to service_role;

-- 23.2 Effective read paths for the existing SELECT policies.

grant select on table public.commercial_partners to authenticated;
grant select on table public.commercial_partner_representatives to authenticated;
grant select on table public.event_ticket_partnership_requests to authenticated;
grant select on table public.event_ticket_purchase_signals to authenticated;
grant select on table public.partner_official_communications to authenticated;
grant select on table public.event_ticket_commercial_channels to authenticated;
grant select on table public.event_ticket_commercial_audit_log to authenticated;
grant select on table public.event_ticket_backfill_rejections to authenticated;

-- 23.3 Stable registry and authorization scope for trusted integrations.

create table public.event_ticket_trusted_integrations (
  integration_id uuid primary key,
  partner_id uuid not null references public.commercial_partners(partner_id) on delete restrict,
  provider_namespace text not null unique,
  integration_status text not null default 'pending',
  credential_reference_hash text not null,
  verification_evidence_hash text not null,
  verified_by_admin_user_id uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  suspended_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_ticket_trusted_integrations_namespace_v496_check
    check (provider_namespace ~ '^[a-z0-9][a-z0-9_.-]{1,79}$'),
  constraint event_ticket_trusted_integrations_status_v496_check
    check (integration_status in ('pending','active','suspended','revoked')),
  constraint event_ticket_trusted_integrations_hashes_v496_check
    check (
      credential_reference_hash ~ '^[0-9a-f]{64}$'
      and verification_evidence_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint event_ticket_trusted_integrations_activation_v496_check
    check (
      integration_status <> 'active'
      or (
        verified_by_admin_user_id is not null
        and verified_at is not null
      )
    )
);

create table public.event_ticket_trusted_integration_channels (
  integration_id uuid not null references public.event_ticket_trusted_integrations(integration_id) on delete restrict,
  channel_id uuid not null references public.event_ticket_commercial_channels(channel_id) on delete restrict,
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  authorization_status text not null default 'pending',
  authorization_evidence_hash text not null,
  authorized_by_admin_user_id uuid references auth.users(id) on delete set null,
  authorized_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (integration_id, channel_id),
  constraint event_ticket_trusted_integration_channels_status_v496_check
    check (authorization_status in ('pending','active','suspended','revoked')),
  constraint event_ticket_trusted_integration_channels_hash_v496_check
    check (authorization_evidence_hash ~ '^[0-9a-f]{64}$'),
  constraint event_ticket_trusted_integration_channels_activation_v496_check
    check (
      authorization_status <> 'active'
      or (
        authorized_by_admin_user_id is not null
        and authorized_at is not null
      )
    )
);

alter table public.event_ticket_trusted_integrations enable row level security;
alter table public.event_ticket_trusted_integration_channels enable row level security;
revoke all on table public.event_ticket_trusted_integrations from public, anon, authenticated;
revoke all on table public.event_ticket_trusted_integration_channels from public, anon, authenticated;

grant select on table public.event_ticket_trusted_integrations to authenticated;
grant select on table public.event_ticket_trusted_integration_channels to authenticated;

create policy event_ticket_trusted_integrations_admin_read_v496
on public.event_ticket_trusted_integrations
for select
to authenticated
using (public.mhidas_is_useclubbers_admin_v1(auth.uid()));

create policy event_ticket_trusted_integration_channels_admin_read_v496
on public.event_ticket_trusted_integration_channels
for select
to authenticated
using (public.mhidas_is_useclubbers_admin_v1(auth.uid()));

-- 23.4 Server-owned retention policy dimensions and active-policy resolution.

alter table public.event_ticket_retention_policy_versions
  add column policy_purpose text not null default 'event_ticket_tracking',
  add column jurisdiction_code text not null default 'BR',
  add column evidence_class text not null default 'clubber';

alter table public.event_ticket_retention_policy_versions
  add constraint event_ticket_retention_policy_dimensions_v496_check
  check (
    policy_purpose = 'event_ticket_tracking'
    and jurisdiction_code ~ '^[A-Z]{2}$'
    and evidence_class in ('clubber','redirect','trusted','admin')
  );

drop index public.event_ticket_retention_policy_one_active_v490_uq;

create unique index event_ticket_retention_policy_one_active_dimension_v496_uq
  on public.event_ticket_retention_policy_versions (
    policy_purpose,
    jurisdiction_code,
    evidence_class
  )
  where policy_status = 'active';

create function public.mhidas_ticket_resolve_active_retention_policy_v1(
  p_signal_type text,
  p_evidence_source text
)
returns table (
  retention_policy_version_id uuid,
  signal_retention_days integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_evidence_class text;
  v_count integer;
begin
  v_evidence_class := case
    when p_signal_type in ('interest','self_declared_purchase')
      and p_evidence_source = 'clubber_action' then 'clubber'
    when p_signal_type = 'commercial_link_click'
      and p_evidence_source = 'useclubbers_redirect' then 'redirect'
    when p_signal_type in ('attributed_conversion','confirmed_conversion')
      and p_evidence_source in ('coupon_report','partner_report','postback','webhook','partner_api') then 'trusted'
    when p_signal_type = 'correction'
      and p_evidence_source = 'admin_correction' then 'admin'
    else null
  end;

  if v_evidence_class is null then
    raise exception 'RETENTION_EVIDENCE_CLASS_UNRESOLVED';
  end if;

  select count(*) into v_count
  from public.event_ticket_retention_policy_versions p
  where p.policy_status = 'active'
    and p.policy_purpose = 'event_ticket_tracking'
    and p.jurisdiction_code = 'BR'
    and p.evidence_class = v_evidence_class;

  if v_count <> 1 then
    raise exception 'ACTIVE_RETENTION_POLICY_CARDINALITY_INVALID: %', v_count;
  end if;

  return query
  select p.retention_policy_version_id, p.signal_retention_days
  from public.event_ticket_retention_policy_versions p
  where p.policy_status = 'active'
    and p.policy_purpose = 'event_ticket_tracking'
    and p.jurisdiction_code = 'BR'
    and p.evidence_class = v_evidence_class;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_channel_retention_policy_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
begin
  if new.tracking_method <> 'none'
    and new.channel_status in ('authorized','active','paused')
    and not exists (
      select 1
      from public.event_ticket_retention_policy_versions p
      where p.retention_policy_version_id = new.retention_policy_version_id
        and p.policy_status = 'active'
        and p.policy_purpose = 'event_ticket_tracking'
        and p.jurisdiction_code = 'BR'
        and p.evidence_class = 'redirect'
    ) then
    raise exception 'CHANNEL_ACTIVE_RETENTION_POLICY_REQUIRED';
  end if;

  return new;
end;
$mhidas_plpgsql$;

create trigger event_ticket_channel_retention_policy_guard_v496
before insert or update
on public.event_ticket_commercial_channels
for each row
execute function public.mhidas_ticket_channel_retention_policy_guard_v1();

-- 23.5 Receipt authority, polymorphic principal identity and signal linkage.

alter table public.event_ticket_operation_receipts
  drop constraint event_ticket_operation_receipts_principal_id_fkey;

alter table public.event_ticket_operation_receipts
  add column principal_namespace text;

alter table public.event_ticket_operation_receipts
  add constraint event_ticket_operation_receipts_principal_identity_v496_check
  check (
    (
      principal_type = 'user'
      and principal_id is not null
      and principal_namespace is null
    )
    or (
      principal_type = 'trusted_ticketing_integration'
      and principal_id is not null
      and principal_namespace ~ '^[a-z0-9][a-z0-9_.-]{1,79}$'
    )
    or (
      principal_type in ('service_role','automation')
      and principal_id is null
    )
  );

alter table public.event_ticket_operation_receipts
  drop constraint event_ticket_operation_receipts_target_v493_check;

alter table public.event_ticket_operation_receipts
  add constraint event_ticket_operation_receipts_target_v496_check
  check (target_type in (
    'canonical_event','commercial_partner','partner_request','commercial_channel',
    'partner_communication','retention_policy'
  ));

alter table public.event_ticket_purchase_signals
  add column receipt_id uuid references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  add column integration_id uuid references public.event_ticket_trusted_integrations(integration_id) on delete restrict,
  add column evidence_matrix_version integer not null default 1;

alter table public.event_ticket_purchase_signals
  add constraint event_ticket_purchase_signals_operational_identity_v496_check
  check (
    receipt_id is not null
    and evidence_matrix_version = 1
    and (
      signal_type not in ('attributed_conversion','confirmed_conversion')
      or integration_id is not null
    )
  );

drop index public.event_ticket_purchase_signals_idempotency_v490_uq;
drop index public.event_ticket_purchase_signals_transaction_v490_uq;

create unique index event_ticket_purchase_signals_receipt_v496_uq
  on public.event_ticket_purchase_signals (receipt_id);

create unique index event_ticket_purchase_signals_confirmed_transaction_v496_uq
  on public.event_ticket_purchase_signals (
    integration_id,
    provider_namespace,
    transaction_hash_algorithm,
    transaction_hash_version,
    transaction_hash
  )
  where signal_type = 'confirmed_conversion';

-- 23.6 Fail-closed actor, signal and evidence matrix.

create function public.mhidas_ticket_signal_evidence_is_allowed_v1(
  p_actor_role text,
  p_signal_type text,
  p_evidence_source text
)
returns boolean
language sql
immutable
strict
as $mhidas_sql$
  select case p_actor_role
    when 'clubber' then
      (p_signal_type, p_evidence_source) in (
        ('interest','clubber_action'),
        ('self_declared_purchase','clubber_action')
      )
    when 'system' then
      (p_signal_type, p_evidence_source) = (
        'commercial_link_click','useclubbers_redirect'
      )
    when 'trusted_ticketing_integration' then
      p_signal_type in ('attributed_conversion','confirmed_conversion')
      and p_evidence_source in (
        'coupon_report','partner_report','postback','webhook','partner_api'
      )
    when 'useclubbers_admin' then
      (p_signal_type, p_evidence_source) = ('correction','admin_correction')
    else false
  end;
$mhidas_sql$;

-- 23.7 Hardened URL freshness with future-clock and health-evidence checks.

create function public.mhidas_ticket_url_proof_is_fresh_v3(
  p_validation_status text,
  p_url_validated_at timestamptz,
  p_validation_expires_at timestamptz,
  p_health_status text,
  p_last_health_checked_at timestamptz,
  p_last_health_check_hash text,
  p_validator_version integer,
  p_resolved_host_hash text,
  p_redirect_chain_hash text
)
returns boolean
language sql
stable
as $mhidas_sql$
  select p_validation_status = 'validated'
    and p_url_validated_at is not null
    and p_url_validated_at <= now() + interval '5 minutes'
    and p_url_validated_at > now() - interval '30 days'
    and p_validation_expires_at is not null
    and p_validation_expires_at > now()
    and p_validation_expires_at <= p_url_validated_at + interval '7 days'
    and p_health_status = 'healthy'
    and p_last_health_checked_at is not null
    and p_last_health_checked_at <= now() + interval '5 minutes'
    and p_last_health_checked_at > now() - interval '24 hours'
    and p_last_health_check_hash ~ '^[0-9a-f]{64}$'
    and p_validator_version is not null
    and p_validator_version >= 1
    and p_resolved_host_hash ~ '^[0-9a-f]{64}$'
    and p_redirect_chain_hash ~ '^[0-9a-f]{64}$';
$mhidas_sql$;

create function public.mhidas_record_event_ticket_channel_url_validation_v3(
  p_channel_id uuid,
  p_expected_lock_version integer,
  p_validation_result jsonb,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_commercial_channels
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_url_validated_at timestamptz;
  v_validation_expires_at timestamptz;
  v_last_health_checked_at timestamptz;
  v_channel public.event_ticket_commercial_channels%rowtype;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;

  v_url_validated_at := nullif(p_validation_result ->> 'url_validated_at', '')::timestamptz;
  v_validation_expires_at := nullif(p_validation_result ->> 'url_validation_expires_at', '')::timestamptz;
  v_last_health_checked_at := nullif(p_validation_result ->> 'last_health_checked_at', '')::timestamptz;

  if not public.mhidas_ticket_url_proof_is_fresh_v3(
    p_validation_result ->> 'url_validation_status',
    v_url_validated_at,
    v_validation_expires_at,
    p_validation_result ->> 'url_health_status',
    v_last_health_checked_at,
    nullif(p_validation_result ->> 'last_health_check_hash', ''),
    nullif(p_validation_result ->> 'url_validator_version', '')::integer,
    nullif(p_validation_result ->> 'resolved_host_hash', ''),
    nullif(p_validation_result ->> 'redirect_chain_validation_hash', '')
  ) then
    raise exception 'URL_VALIDATION_PROOF_V3_INVALID';
  end if;

  select * into v_channel
  from public.mhidas_record_event_ticket_channel_url_validation_v2(
    p_channel_id,
    p_expected_lock_version,
    p_validation_result,
    p_correlation_id,
    p_idempotency_key
  );

  return v_channel;
end;
$mhidas_plpgsql$;


-- 23.8 Context-bound, receipt-authoritative purchase-signal RPC.

create function public.mhidas_record_event_ticket_purchase_signal_v3(
  p_signal_id uuid,
  p_parent_signal_id uuid,
  p_canonical_event_id uuid,
  p_channel_id uuid,
  p_click_id uuid,
  p_user_id uuid,
  p_signal_type text,
  p_evidence_source text,
  p_integration_id uuid,
  p_provider_namespace text,
  p_transaction_hash text,
  p_evidence_hash text,
  p_signature_validation_hash text,
  p_replay_nonce_hash text,
  p_attribution_campaign_id text,
  p_gross_amount_minor bigint,
  p_commission_amount_minor bigint,
  p_currency text,
  p_idempotency_key text,
  p_metadata jsonb,
  p_correlation_id text
)
returns public.event_ticket_purchase_signals
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_signal public.event_ticket_purchase_signals%rowtype;
  v_parent public.event_ticket_purchase_signals%rowtype;
  v_click public.event_ticket_click_attributions%rowtype;
  v_channel public.event_ticket_commercial_channels%rowtype;
  v_integration public.event_ticket_trusted_integrations%rowtype;
  v_actor_role text;
  v_actor_user_id uuid := auth.uid();
  v_principal_type text;
  v_principal_id uuid;
  v_principal_namespace text;
  v_request_hash text;
  v_replay_result_id uuid;
  v_receipt_id uuid;
  v_retention_policy_version_id uuid;
  v_signal_retention_days integer;
  v_recorded_at timestamptz := now();
  v_effective_signal_id uuid := coalesce(p_signal_id, gen_random_uuid());
begin
  if p_signal_type in ('attributed_conversion','confirmed_conversion') then
    if current_setting('request.jwt.claim.role', true) <> 'service_role' then
      raise exception 'TRUSTED_TICKETING_SERVICE_ROLE_REQUIRED';
    end if;

    select * into v_integration
    from public.event_ticket_trusted_integrations i
    where i.integration_id = p_integration_id
      and i.provider_namespace = p_provider_namespace
      and i.integration_status = 'active';

    if not found then
      raise exception 'TRUSTED_INTEGRATION_NOT_ACTIVE_OR_NAMESPACE_MISMATCH';
    end if;

    v_actor_role := 'trusted_ticketing_integration';
    v_actor_user_id := null;
    v_principal_type := 'trusted_ticketing_integration';
    v_principal_id := v_integration.integration_id;
    v_principal_namespace := v_integration.provider_namespace;
  elsif p_signal_type = 'commercial_link_click' then
    if current_setting('request.jwt.claim.role', true) <> 'service_role' then
      raise exception 'SYSTEM_REDIRECT_SERVICE_ROLE_REQUIRED';
    end if;

    v_actor_role := 'system';
    v_actor_user_id := null;
    v_principal_type := 'automation';
    v_principal_id := null;
    v_principal_namespace := null;
  elsif p_signal_type = 'correction' then
    if v_actor_user_id is null
      or not public.mhidas_is_useclubbers_admin_v1(v_actor_user_id) then
      raise exception 'USECLUBBERS_ADMIN_REQUIRED';
    end if;

    v_actor_role := 'useclubbers_admin';
    v_principal_type := 'user';
    v_principal_id := v_actor_user_id;
    v_principal_namespace := null;
  else
    if v_actor_user_id is null
      or p_user_id is distinct from v_actor_user_id then
      raise exception 'PURCHASE_SIGNAL_OWNERSHIP_REQUIRED';
    end if;

    v_actor_role := 'clubber';
    v_principal_type := 'user';
    v_principal_id := v_actor_user_id;
    v_principal_namespace := null;
  end if;

  if not public.mhidas_ticket_signal_evidence_is_allowed_v1(
    v_actor_role,
    p_signal_type,
    p_evidence_source
  ) then
    raise exception 'SIGNAL_ACTOR_EVIDENCE_MATRIX_DENIED';
  end if;

  if p_channel_id is not null then
    select * into v_channel
    from public.event_ticket_commercial_channels c
    where c.channel_id = p_channel_id;

    if not found or v_channel.canonical_event_id <> p_canonical_event_id then
      raise exception 'SIGNAL_CHANNEL_EVENT_CONTEXT_MISMATCH';
    end if;

    if v_actor_role = 'trusted_ticketing_integration' then
      if v_channel.ticketing_provider_key is distinct from p_provider_namespace
        or not exists (
          select 1
          from public.event_ticket_trusted_integration_channels a
          where a.integration_id = p_integration_id
            and a.channel_id = p_channel_id
            and a.canonical_event_id = p_canonical_event_id
            and a.authorization_status = 'active'
        ) then
        raise exception 'TRUSTED_INTEGRATION_CHANNEL_SCOPE_DENIED';
      end if;
    end if;
  elsif p_signal_type in (
    'commercial_link_click','attributed_conversion','confirmed_conversion'
  ) then
    raise exception 'SIGNAL_CHANNEL_REQUIRED';
  end if;

  if p_click_id is not null then
    select * into v_click
    from public.event_ticket_click_attributions c
    where c.click_id = p_click_id;

    if not found
      or v_click.canonical_event_id <> p_canonical_event_id
      or v_click.channel_id is distinct from p_channel_id then
      raise exception 'SIGNAL_CLICK_EVENT_CHANNEL_CONTEXT_MISMATCH';
    end if;

    if v_click.user_id is not null
      and p_user_id is distinct from v_click.user_id then
      raise exception 'SIGNAL_CLICK_USER_CONTEXT_MISMATCH';
    end if;
  elsif p_signal_type = 'commercial_link_click' then
    raise exception 'COMMERCIAL_LINK_CLICK_REQUIRES_CLICK_ID';
  end if;

  if p_parent_signal_id is not null then
    select * into v_parent
    from public.event_ticket_purchase_signals s
    where s.signal_id = p_parent_signal_id;

    if not found then
      raise exception 'PARENT_SIGNAL_NOT_FOUND';
    end if;

    if v_parent.canonical_event_id <> p_canonical_event_id then
      raise exception 'PARENT_SIGNAL_EVENT_CONTEXT_MISMATCH';
    end if;
  end if;

  if p_signal_type = 'confirmed_conversion' then
    if p_parent_signal_id is null
      or v_parent.signal_type <> 'attributed_conversion'
      or v_parent.channel_id is distinct from p_channel_id
      or v_parent.integration_id is distinct from p_integration_id
      or v_parent.provider_namespace is distinct from p_provider_namespace
      or v_parent.transaction_hash is distinct from p_transaction_hash then
      raise exception 'CONFIRMED_CONVERSION_LINEAGE_INVALID';
    end if;
  elsif p_signal_type = 'correction' then
    if p_parent_signal_id is null
      or v_parent.signal_type not in (
        'attributed_conversion','confirmed_conversion','correction'
      ) then
      raise exception 'CORRECTION_LINEAGE_INVALID';
    end if;
  elsif p_parent_signal_id is not null then
    raise exception 'PARENT_SIGNAL_NOT_ALLOWED_FOR_SIGNAL_TYPE';
  end if;

  select p.retention_policy_version_id, p.signal_retention_days
  into v_retention_policy_version_id, v_signal_retention_days
  from public.mhidas_ticket_resolve_active_retention_policy_v1(
    p_signal_type,
    p_evidence_source
  ) p;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'signal_id', v_effective_signal_id,
    'parent_signal_id', p_parent_signal_id,
    'canonical_event_id', p_canonical_event_id,
    'channel_id', p_channel_id,
    'click_id', p_click_id,
    'user_id', p_user_id,
    'signal_type', p_signal_type,
    'evidence_source', p_evidence_source,
    'integration_id', p_integration_id,
    'provider_namespace', p_provider_namespace,
    'transaction_hash', p_transaction_hash,
    'evidence_hash', p_evidence_hash,
    'signature_validation_hash', p_signature_validation_hash,
    'replay_nonce_hash', p_replay_nonce_hash,
    'attribution_campaign_id', p_attribution_campaign_id,
    'gross_amount_minor', p_gross_amount_minor,
    'commission_amount_minor', p_commission_amount_minor,
    'currency', p_currency,
    'metadata', coalesce(p_metadata, '{}'::jsonb),
    'evidence_matrix_version', 1
  ));

  v_replay_result_id := public.mhidas_ticket_assert_receipt_replay_v2(
    v_principal_type,
    v_principal_id,
    'record_purchase_signal_v3',
    p_idempotency_key,
    'canonical_event',
    p_canonical_event_id,
    null,
    v_request_hash
  );

  if v_replay_result_id is not null then
    select * into strict v_signal
    from public.event_ticket_purchase_signals s
    where s.signal_id = v_replay_result_id;
    return v_signal;
  end if;

  insert into public.event_ticket_operation_receipts (
    operation_scope,
    principal_type,
    principal_id,
    principal_namespace,
    operation_name,
    idempotency_key,
    target_type,
    target_id,
    expected_lock_version,
    request_hash,
    result_id,
    result_status,
    result_version,
    result_hash
  )
  values (
    'signal_insert',
    v_principal_type,
    v_principal_id,
    v_principal_namespace,
    'record_purchase_signal_v3',
    p_idempotency_key,
    'canonical_event',
    p_canonical_event_id,
    null,
    v_request_hash,
    v_effective_signal_id,
    p_signal_type,
    1,
    encode(digest(
      v_effective_signal_id::text || ':' || p_signal_type || ':' || v_request_hash,
      'sha256'
    ), 'hex')
  )
  returning receipt_id into v_receipt_id;

  perform set_config('app.mhidas_ticket_actor_role', v_actor_role, true);
  perform set_config(
    'app.mhidas_ticket_actor_user_id',
    coalesce(v_actor_user_id::text, ''),
    true
  );

  insert into public.event_ticket_purchase_signals (
    signal_id,
    parent_signal_id,
    canonical_event_id,
    channel_id,
    click_id,
    user_id,
    signal_type,
    evidence_source,
    trusted_evidence_verified,
    provider_namespace,
    transaction_hash,
    transaction_hash_algorithm,
    transaction_hash_version,
    evidence_hash,
    signature_validation_hash,
    replay_nonce_hash,
    attribution_campaign_id,
    gross_amount_minor,
    commission_amount_minor,
    currency,
    recorded_at,
    trusted_confirmed_at,
    trusted_confirmed_by_actor_role,
    retention_policy_version_id,
    retention_expires_at,
    idempotency_key,
    metadata,
    receipt_id,
    integration_id,
    evidence_matrix_version
  )
  values (
    v_effective_signal_id,
    p_parent_signal_id,
    p_canonical_event_id,
    p_channel_id,
    p_click_id,
    p_user_id,
    p_signal_type,
    p_evidence_source,
    v_actor_role = 'trusted_ticketing_integration',
    case when v_actor_role = 'trusted_ticketing_integration' then p_provider_namespace end,
    case when v_actor_role = 'trusted_ticketing_integration' then p_transaction_hash end,
    case when v_actor_role = 'trusted_ticketing_integration' then 'sha256' end,
    case when v_actor_role = 'trusted_ticketing_integration' then 1 end,
    case when v_actor_role = 'trusted_ticketing_integration' then p_evidence_hash end,
    case when v_actor_role = 'trusted_ticketing_integration' then p_signature_validation_hash end,
    case when v_actor_role = 'trusted_ticketing_integration' then p_replay_nonce_hash end,
    p_attribution_campaign_id,
    case when v_actor_role = 'trusted_ticketing_integration' then p_gross_amount_minor end,
    case when v_actor_role = 'trusted_ticketing_integration' then p_commission_amount_minor end,
    case when v_actor_role = 'trusted_ticketing_integration' then p_currency end,
    v_recorded_at,
    case when v_actor_role = 'trusted_ticketing_integration' then v_recorded_at end,
    case when v_actor_role = 'trusted_ticketing_integration' then 'trusted_ticketing_integration' end,
    v_retention_policy_version_id,
    v_recorded_at + make_interval(days => v_signal_retention_days),
    p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb),
    v_receipt_id,
    case when v_actor_role = 'trusted_ticketing_integration' then p_integration_id end,
    1
  )
  returning * into v_signal;

  perform public.mhidas_ticket_write_audit_v1(
    'signal',
    v_signal.signal_id,
    v_signal.canonical_event_id,
    v_integration.partner_id,
    null,
    v_signal.channel_id,
    null,
    v_signal.signal_id,
    null,
    'purchase_signal_recorded_v3',
    null,
    v_signal.signal_type,
    null,
    null,
    jsonb_build_object(
      'signal_type', v_signal.signal_type,
      'evidence_source', v_signal.evidence_source,
      'trusted_evidence_verified', v_signal.trusted_evidence_verified,
      'policy_version', v_retention_policy_version_id,
      'lock_version', null
    ),
    p_evidence_hash,
    'context-bound purchase signal with receipt authority',
    p_correlation_id,
    p_idempotency_key
  );

  return v_signal;
end;
$mhidas_plpgsql$;


-- 23.9 Communication target correction and effective v3 privilege surface.

revoke all on function public.mhidas_mutate_partner_official_communication_v2(
  text,uuid,integer,jsonb,text,text,text,text
) from public, anon, authenticated, service_role;

revoke all on function public.mhidas_record_event_ticket_purchase_signal_v2(
  uuid,uuid,uuid,uuid,uuid,uuid,text,text,boolean,text,text,text,text,text,text,bigint,bigint,text,timestamptz,uuid,timestamptz,text,jsonb,text
) from public, anon, authenticated, service_role;

revoke all on function public.mhidas_record_event_ticket_channel_url_validation_v2(
  uuid,integer,jsonb,text,text
) from public, anon, authenticated, service_role;

revoke all on function public.mhidas_resolve_public_event_ticket_action_v2(uuid)
  from public, anon, authenticated, service_role;

create function public.mhidas_mutate_partner_official_communication_v3(
  p_operation text,
  p_communication_id uuid,
  p_expected_lock_version integer,
  p_payload jsonb,
  p_reason_hash text,
  p_review_evidence_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.partner_official_communications
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_user_id uuid := auth.uid();
  v_actor_role text;
  v_before public.partner_official_communications%rowtype;
  v_communication public.partner_official_communications%rowtype;
  v_partner_id uuid;
  v_next_status text;
  v_request_hash text;
  v_replay_result_id uuid;
  v_receipt_target_type text;
  v_receipt_target_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATED_USER_REQUIRED';
  end if;

  if p_operation in ('create_draft','submit') then
    v_actor_role := 'verified_partner_representative';
  elsif p_operation in ('approve','publish','pause','reject','expire') then
    if not public.mhidas_is_useclubbers_admin_v1(v_user_id) then
      raise exception 'USECLUBBERS_ADMIN_REQUIRED';
    end if;
    v_actor_role := 'useclubbers_admin';
  else
    raise exception 'COMMUNICATION_OPERATION_UNSUPPORTED';
  end if;

  if p_operation = 'create_draft' then
    v_partner_id := (p_payload ->> 'partner_id')::uuid;
    if not public.mhidas_ticket_partner_representative_is_authorized_v2(
      v_partner_id,
      v_user_id
    ) then
      raise exception 'COMMUNICATION_VERIFIED_PARTNER_MEMBERSHIP_REQUIRED';
    end if;
    if nullif(p_payload ->> 'canonical_event_id', '') is not null then
      v_receipt_target_type := 'canonical_event';
      v_receipt_target_id := (p_payload ->> 'canonical_event_id')::uuid;
    else
      v_receipt_target_type := 'commercial_partner';
      v_receipt_target_id := v_partner_id;
    end if;
  else
    select * into v_before
    from public.partner_official_communications
    where communication_id = p_communication_id;

    if not found then
      raise exception 'PARTNER_COMMUNICATION_NOT_FOUND';
    end if;

    if v_actor_role = 'verified_partner_representative'
      and not public.mhidas_ticket_partner_representative_is_authorized_v2(
        v_before.partner_id,
        v_user_id
      ) then
      raise exception 'COMMUNICATION_VERIFIED_PARTNER_MEMBERSHIP_REQUIRED';
    end if;
    v_receipt_target_type := 'partner_communication';
    v_receipt_target_id := p_communication_id;
  end if;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'operation', p_operation,
    'communication_id', p_communication_id,
    'expected_lock_version', p_expected_lock_version,
    'payload', coalesce(p_payload, '{}'::jsonb),
    'reason_hash', p_reason_hash,
    'review_evidence_hash', p_review_evidence_hash
  ));

  v_replay_result_id := public.mhidas_ticket_assert_receipt_replay_v2(
    'user', v_user_id, 'mutate_communication:' || p_operation,
    p_idempotency_key, v_receipt_target_type, v_receipt_target_id,
    p_expected_lock_version, v_request_hash
  );

  if v_replay_result_id is not null then
    select * into strict v_communication
    from public.partner_official_communications
    where communication_id = v_replay_result_id;
    return v_communication;
  end if;

  perform set_config('app.mhidas_ticket_actor_role', v_actor_role, true);
  perform set_config('app.mhidas_ticket_actor_user_id', v_user_id::text, true);

  if p_operation = 'create_draft' then
    if p_expected_lock_version <> -1 then
      raise exception 'COMMUNICATION_CREATE_EXPECTED_LOCK_VERSION_MUST_BE_MINUS_ONE';
    end if;

    insert into public.partner_official_communications (
      communication_id,
      partner_id,
      canonical_event_id,
      commercial_channel_id,
      submitted_by_user_id,
      communication_type,
      title,
      body,
      benefit_code,
      starts_at,
      ends_at,
      lifecycle_reason_hash,
      metadata
    )
    values (
      coalesce(p_communication_id, gen_random_uuid()),
      v_partner_id,
      nullif(p_payload ->> 'canonical_event_id', '')::uuid,
      nullif(p_payload ->> 'commercial_channel_id', '')::uuid,
      v_user_id,
      p_payload ->> 'communication_type',
      p_payload ->> 'title',
      p_payload ->> 'body',
      nullif(p_payload ->> 'benefit_code', ''),
      nullif(p_payload ->> 'starts_at', '')::timestamptz,
      nullif(p_payload ->> 'ends_at', '')::timestamptz,
      p_reason_hash,
      coalesce(p_payload -> 'metadata', '{}'::jsonb)
    )
    returning * into v_communication;

    v_before := null;
  else
    select *
    into v_before
    from public.partner_official_communications
    where communication_id = p_communication_id
    for update;

    if not found then
      raise exception 'PARTNER_COMMUNICATION_NOT_FOUND';
    end if;

    if v_before.lock_version <> p_expected_lock_version then
      raise exception 'COMMUNICATION_EXPECTED_LOCK_VERSION_CONFLICT';
    end if;

    v_next_status := case p_operation
      when 'submit' then 'submitted'
      when 'approve' then 'approved'
      when 'publish' then 'published'
      when 'pause' then 'paused'
      when 'reject' then 'rejected'
      when 'expire' then 'expired'
    end;

    update public.partner_official_communications
    set communication_status = v_next_status,
        lifecycle_reason_hash = p_reason_hash,
        review_evidence_hash = case
          when v_next_status in ('approved','published','rejected')
            then coalesce(p_review_evidence_hash, review_evidence_hash)
          else review_evidence_hash
        end,
        lock_version = lock_version + 1
    where communication_id = p_communication_id
      and lock_version = p_expected_lock_version
    returning * into v_communication;

    if not found then
      raise exception 'COMMUNICATION_EXPECTED_LOCK_VERSION_CONFLICT';
    end if;
  end if;

  perform public.mhidas_ticket_write_operation_receipt_v2(
    'communication_mutation', 'user', v_user_id,
    'mutate_communication:' || p_operation, p_idempotency_key,
    v_receipt_target_type, v_receipt_target_id, p_expected_lock_version,
    v_request_hash, v_communication.communication_id,
    v_communication.communication_status, v_communication.lock_version,
    encode(digest(
      v_communication.communication_id::text || ':' ||
      v_communication.communication_status || ':' ||
      v_communication.lock_version::text,
      'sha256'
    ), 'hex')
  );

  perform public.mhidas_ticket_write_audit_v1(
    'communication',
    v_communication.communication_id,
    v_communication.canonical_event_id,
    v_communication.partner_id,
    null,
    v_communication.commercial_channel_id,
    v_communication.communication_id,
    null,
    null,
    'communication_' || p_operation,
    case when p_operation = 'create_draft' then null else v_before.communication_status end,
    v_communication.communication_status,
    v_communication.lock_version,
    case
      when p_operation = 'create_draft' then null
      else jsonb_build_object(
        'communication_status', v_before.communication_status,
        'lock_version', v_before.lock_version
      )
    end,
    jsonb_build_object(
      'communication_status', v_communication.communication_status,
      'lock_version', v_communication.lock_version
    ),
    p_review_evidence_hash,
    'partner communication lifecycle mutation',
    p_correlation_id,
    p_idempotency_key
  );

  return v_communication;
end;
$mhidas_plpgsql$;

create function public.mhidas_resolve_public_event_ticket_action_v3(
  p_canonical_event_id uuid
)
returns table (
  action_kind text,
  action_label text,
  target_url text,
  commercial_channel_id uuid,
  official_source_id uuid,
  reason_code text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_channel public.event_ticket_commercial_channels%rowtype;
  v_source public.canonical_event_sources%rowtype;
begin
  select c.* into v_channel
  from public.event_ticket_commercial_channels c
  where c.canonical_event_id = p_canonical_event_id
    and c.channel_status = 'active'
    and public.mhidas_ticket_url_proof_is_fresh_v3(
      c.url_validation_status,
      c.url_validated_at,
      c.url_validation_expires_at,
      c.url_health_status,
      c.last_health_checked_at,
      c.last_health_check_hash,
      c.url_validator_version,
      c.resolved_host_hash,
      c.redirect_chain_validation_hash
    )
    and c.authorization_starts_at <= now()
    and (c.authorization_ends_at is null or c.authorization_ends_at > now())
  order by c.public_priority, c.activated_at desc, c.channel_id
  limit 1;

  if found then
    return query
    select
      'commercial_channel'::text,
      'Comprar ingresso'::text,
      v_channel.commercial_url,
      v_channel.channel_id,
      null::uuid,
      'authorized_monetized_channel_active_fresh_healthy'::text;
    return;
  end if;

  select s.* into v_source
  from public.canonical_event_sources s
  where s.canonical_event_id = p_canonical_event_id
    and s.reference_status = 'validated'
    and s.source_url is not null
    and s.reference_domain is not null
    and public.mhidas_ticket_domain_matches_v1(
      public.mhidas_ticket_extract_hostname_v1(s.source_url),
      s.reference_domain,
      true
    )
  order by s.authority_score desc, s.validated_at desc, s.id
  limit 1;

  if found then
    return query
    select
      'official_reference'::text,
      'Ver evento oficial'::text,
      v_source.source_url,
      null::uuid,
      v_source.id,
      'commercial_channel_failed_closed_official_reference_available'::text;
    return;
  end if;

  return query
  select
    'unavailable'::text,
    'Canal de vendas a confirmar'::text,
    null::text,
    null::uuid,
    null::uuid,
    'no_fresh_healthy_authorized_channel_or_validated_reference'::text;
end;
$mhidas_plpgsql$;


revoke all on function public.mhidas_ticket_resolve_active_retention_policy_v1(text,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_channel_retention_policy_guard_v1()
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_signal_evidence_is_allowed_v1(text,text,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_url_proof_is_fresh_v3(
  text,timestamptz,timestamptz,text,timestamptz,text,integer,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_record_event_ticket_channel_url_validation_v3(
  uuid,integer,jsonb,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_mutate_partner_official_communication_v3(
  text,uuid,integer,jsonb,text,text,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_record_event_ticket_purchase_signal_v3(
  uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text
) from public, anon, authenticated;
revoke all on function public.mhidas_resolve_public_event_ticket_action_v3(uuid)
  from public;

grant execute on function public.mhidas_record_event_ticket_channel_url_validation_v3(
  uuid,integer,jsonb,text,text
) to service_role;
grant execute on function public.mhidas_mutate_partner_official_communication_v3(
  text,uuid,integer,jsonb,text,text,text,text
) to authenticated;
grant execute on function public.mhidas_record_event_ticket_purchase_signal_v3(
  uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text
) to authenticated, service_role;
grant execute on function public.mhidas_resolve_public_event_ticket_action_v3(uuid)
  to anon, authenticated, service_role;

-- =============================================================================
-- 24. STATIC EVIDENCE AND FOURTH-CORRECTION SELF-CHECK
-- =============================================================================

create temporary table mhidas_v496_fourth_adjustment_evidence (
  adjustment_key text primary key,
  correction_status text not null,
  evidence_items text[] not null,
  promotion_blocked boolean not null
) on commit drop;

insert into mhidas_v496_fourth_adjustment_evidence (
  adjustment_key,
  correction_status,
  evidence_items,
  promotion_blocked
)
values
(
  'url_validation_rpc_not_executable_by_service_role',
  'corrected_in_protected_draft',
  array['v3 service_role grant','v2 direct execution revoked','exact signature ACL check'],
  true
),
(
  'rls_read_policies_without_table_select_grants',
  'corrected_in_protected_draft',
  array['authenticated SELECT grants','RLS remains enabled','admin and ownership policies preserved'],
  true
),
(
  'purchase_signal_click_context_not_validated',
  'corrected_in_protected_draft',
  array['click row lookup','event equality','channel equality','identified user equality'],
  true
),
(
  'retention_policy_is_caller_controlled_and_not_active_bound',
  'corrected_in_protected_draft',
  array['retention parameters removed from v3','active policy resolved server-side','expiry derived from policy days'],
  true
),
(
  'purchase_signal_idempotency_scope_conflicts_with_receipts',
  'corrected_in_protected_draft',
  array['global signal idempotency index removed','receipt_id persisted','receipt semantic key remains authoritative'],
  true
),
(
  'non_event_communication_receipt_target_is_nullable',
  'corrected_in_protected_draft',
  array['commercial_partner target type','partner target for non-event draft','canonical event target retained when present'],
  true
),
(
  'trusted_integration_principal_not_namespaced',
  'corrected_in_protected_draft',
  array['trusted integration registry','integration channel authorization','receipt principal_id equals integration_id'],
  true
),
(
  'signal_actor_type_evidence_matrix_missing',
  'corrected_in_protected_draft',
  array['versioned matrix helper','server-derived actor','unknown combinations fail closed'],
  true
),
(
  'confirmed_conversion_lineage_semantics_incomplete',
  'corrected_in_protected_draft',
  array['attributed parent required','event channel integration provider and transaction equality','confirmed transaction uniqueness'],
  true
),
(
  'url_freshness_accepts_future_clock_and_missing_health_evidence',
  'corrected_in_protected_draft',
  array['five minute clock tolerance','health hash mandatory','v3 public resolver fail closed'],
  true
);

do $mhidas_v496_fourth_adjustment_self_check$
declare
  v_count integer;
  v_unblocked integer;
begin
  select count(*) into v_count
  from mhidas_v496_fourth_adjustment_evidence;

  select count(*) into v_unblocked
  from mhidas_v496_fourth_adjustment_evidence
  where promotion_blocked = false;

  if v_count <> 10 then
    raise exception 'FOURTH_ADJUSTMENT_EVIDENCE_COUNT_MISMATCH: %', v_count;
  end if;

  if v_unblocked <> 0 then
    raise exception 'SECOND_CORRECTED_DRAFT_PROMOTION_MUST_REMAIN_BLOCKED';
  end if;

  if to_regprocedure('public.mhidas_record_event_ticket_purchase_signal_v3(uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text)') is null
    or to_regprocedure('public.mhidas_mutate_partner_official_communication_v3(text,uuid,integer,jsonb,text,text,text,text)') is null
    or to_regprocedure('public.mhidas_record_event_ticket_channel_url_validation_v3(uuid,integer,jsonb,text,text)') is null
    or to_regprocedure('public.mhidas_resolve_public_event_ticket_action_v3(uuid)') is null then
    raise exception 'V4_8_96_REQUIRED_RPC_MISSING';
  end if;

  if to_regclass('public.event_ticket_trusted_integrations') is null
    or to_regclass('public.event_ticket_trusted_integration_channels') is null then
    raise exception 'V4_8_96_TRUSTED_INTEGRATION_REGISTRY_MISSING';
  end if;
end;
$mhidas_v496_fourth_adjustment_self_check$;

-- =============================================================================
-- 25. ATOMIC RECEIPT RESERVATION AND TERMINAL RESULT STATE
-- =============================================================================

alter table public.event_ticket_operation_receipts
  drop constraint event_ticket_operation_receipts_scope_v493_check;

alter table public.event_ticket_operation_receipts
  add constraint event_ticket_operation_receipts_scope_v499_check
  check (operation_scope in (
    'request_submit','request_mutation','channel_mutation',
    'communication_mutation','signal_insert','retention_run','channel_expiry',
    'url_validation','integration_mutation','integration_scope_mutation',
    'partner_lifecycle','retention_policy_mutation'
  ));

alter table public.event_ticket_operation_receipts
  drop constraint event_ticket_operation_receipts_target_v496_check;

alter table public.event_ticket_operation_receipts
  add constraint event_ticket_operation_receipts_target_v499_check
  check (target_type in (
    'canonical_event','commercial_partner','partner_request','commercial_channel',
    'partner_communication','retention_policy','trusted_integration',
    'trusted_integration_scope'
  ));

alter table public.event_ticket_operation_receipts
  add column receipt_status text not null default 'completed',
  add column reserved_at timestamptz not null default now(),
  add column completed_at timestamptz default now(),
  add column failed_at timestamptz,
  add column failure_hash text;

alter table public.event_ticket_operation_receipts
  add constraint event_ticket_operation_receipts_state_v499_check
  check (
    (
      receipt_status = 'pending'
      and completed_at is null
      and failed_at is null
      and failure_hash is null
    )
    or (
      receipt_status = 'completed'
      and completed_at is not null
      and failed_at is null
      and failure_hash is null
    )
    or (
      receipt_status = 'failed'
      and completed_at is null
      and failed_at is not null
      and failure_hash ~ '^[0-9a-f]{64}$'
    )
  );

create function public.mhidas_ticket_reserve_operation_receipt_v3(
  p_operation_scope text,
  p_principal_type text,
  p_principal_id uuid,
  p_principal_namespace text,
  p_operation_name text,
  p_idempotency_key text,
  p_target_type text,
  p_target_id uuid,
  p_expected_lock_version integer,
  p_request_hash text,
  p_proposed_result_id uuid,
  p_result_status text,
  p_result_version integer
)
returns table (
  receipt_id uuid,
  result_id uuid,
  receipt_status text,
  reservation_owner boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_receipt public.event_ticket_operation_receipts%rowtype;
  v_inserted boolean := false;
begin
  insert into public.event_ticket_operation_receipts (
    operation_scope,
    principal_type,
    principal_id,
    principal_namespace,
    operation_name,
    idempotency_key,
    target_type,
    target_id,
    expected_lock_version,
    request_hash,
    result_id,
    result_status,
    result_version,
    result_hash,
    receipt_status,
    completed_at
  )
  values (
    p_operation_scope,
    p_principal_type,
    p_principal_id,
    p_principal_namespace,
    p_operation_name,
    p_idempotency_key,
    p_target_type,
    p_target_id,
    p_expected_lock_version,
    p_request_hash,
    p_proposed_result_id,
    p_result_status,
    p_result_version,
    encode(digest(
      p_proposed_result_id::text || ':' || p_result_status || ':' || p_request_hash,
      'sha256'
    ), 'hex'),
    'pending',
    null
  )
  on conflict (
    principal_type,
    coalesce(principal_id, '00000000-0000-0000-0000-000000000000'::uuid),
    operation_name,
    idempotency_key
  ) do nothing
  returning * into v_receipt;

  if found then
    v_inserted := true;
  else
    select * into strict v_receipt
    from public.event_ticket_operation_receipts r
    where r.principal_type = p_principal_type
      and r.principal_id is not distinct from p_principal_id
      and r.operation_name = p_operation_name
      and r.idempotency_key = p_idempotency_key
    for update;
  end if;

  if v_receipt.principal_namespace is distinct from p_principal_namespace
    or v_receipt.target_type <> p_target_type
    or v_receipt.target_id <> p_target_id
    or v_receipt.expected_lock_version is distinct from p_expected_lock_version
    or v_receipt.request_hash <> p_request_hash then
    raise exception 'IDEMPOTENCY_KEY_SEMANTIC_REUSE_DENIED';
  end if;

  if not v_inserted and v_receipt.receipt_status = 'failed' then
    raise exception 'IDEMPOTENCY_RECEIPT_PREVIOUSLY_FAILED';
  end if;

  return query
  select
    v_receipt.receipt_id,
    v_receipt.result_id,
    v_receipt.receipt_status,
    v_inserted;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_complete_operation_receipt_v1(
  p_receipt_id uuid,
  p_result_id uuid,
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
  update public.event_ticket_operation_receipts r
  set result_id = p_result_id,
      result_status = p_result_status,
      result_version = p_result_version,
      result_hash = p_result_hash,
      receipt_status = 'completed',
      completed_at = now(),
      failed_at = null,
      failure_hash = null
  where r.receipt_id = p_receipt_id
    and r.receipt_status = 'pending'
  returning * into v_receipt;

  if not found then
    select * into strict v_receipt
    from public.event_ticket_operation_receipts r
    where r.receipt_id = p_receipt_id;

    if v_receipt.receipt_status <> 'completed'
      or v_receipt.result_id <> p_result_id
      or v_receipt.result_hash <> p_result_hash then
      raise exception 'IDEMPOTENCY_RECEIPT_COMPLETION_CONFLICT';
    end if;
  end if;

  return v_receipt;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 26. FAIL-CLOSED URL PROOF AND REDACTED CLUBBER SIGNAL READ
-- =============================================================================

alter table public.event_ticket_commercial_channels
  add constraint event_ticket_commercial_channels_url_proof_not_null_v499_check
  check (
    url_validation_status <> 'validated'
    or (
      url_validated_at is not null
      and url_validation_expires_at is not null
      and last_health_checked_at is not null
      and last_health_check_hash is not null
      and url_validator_version is not null
      and resolved_host_hash is not null
      and redirect_chain_validation_hash is not null
    )
  );

create function public.mhidas_ticket_url_proof_is_fresh_v4(
  p_validation_status text,
  p_url_validated_at timestamptz,
  p_validation_expires_at timestamptz,
  p_health_status text,
  p_last_health_checked_at timestamptz,
  p_last_health_check_hash text,
  p_validator_version integer,
  p_resolved_host_hash text,
  p_redirect_chain_hash text
)
returns boolean
language sql
stable
as $mhidas_sql$
  select coalesce(
    p_validation_status = 'validated'
    and p_url_validated_at is not null
    and p_url_validated_at <= now() + interval '5 minutes'
    and p_url_validated_at > now() - interval '30 days'
    and p_validation_expires_at is not null
    and p_validation_expires_at > now()
    and p_validation_expires_at <= p_url_validated_at + interval '7 days'
    and p_health_status = 'healthy'
    and p_last_health_checked_at is not null
    and p_last_health_checked_at <= now() + interval '5 minutes'
    and p_last_health_checked_at > now() - interval '24 hours'
    and p_last_health_check_hash ~ '^[0-9a-f]{64}$'
    and p_validator_version is not null
    and p_validator_version >= 1
    and p_resolved_host_hash ~ '^[0-9a-f]{64}$'
    and p_redirect_chain_hash ~ '^[0-9a-f]{64}$',
    false
  );
$mhidas_sql$;

create function public.mhidas_record_event_ticket_channel_url_validation_v4(
  p_channel_id uuid,
  p_expected_lock_version integer,
  p_validation_result jsonb,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_commercial_channels
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_url_validated_at timestamptz;
  v_validation_expires_at timestamptz;
  v_last_health_checked_at timestamptz;
  v_channel public.event_ticket_commercial_channels%rowtype;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;

  v_url_validated_at := nullif(p_validation_result ->> 'url_validated_at', '')::timestamptz;
  v_validation_expires_at := nullif(p_validation_result ->> 'url_validation_expires_at', '')::timestamptz;
  v_last_health_checked_at := nullif(p_validation_result ->> 'last_health_checked_at', '')::timestamptz;

  if public.mhidas_ticket_url_proof_is_fresh_v4(
    p_validation_result ->> 'url_validation_status',
    v_url_validated_at,
    v_validation_expires_at,
    p_validation_result ->> 'url_health_status',
    v_last_health_checked_at,
    nullif(p_validation_result ->> 'last_health_check_hash', ''),
    nullif(p_validation_result ->> 'url_validator_version', '')::integer,
    nullif(p_validation_result ->> 'resolved_host_hash', ''),
    nullif(p_validation_result ->> 'redirect_chain_validation_hash', '')
  ) is not true then
    raise exception 'URL_VALIDATION_PROOF_V4_INVALID';
  end if;

  select * into v_channel
  from public.mhidas_record_event_ticket_channel_url_validation_v2(
    p_channel_id,
    p_expected_lock_version,
    p_validation_result,
    p_correlation_id,
    p_idempotency_key
  );

  return v_channel;
end;
$mhidas_plpgsql$;

revoke select on table public.event_ticket_purchase_signals from authenticated;
grant select (
  signal_id,
  parent_signal_id,
  canonical_event_id,
  channel_id,
  click_id,
  user_id,
  signal_type,
  evidence_source,
  attribution_campaign_id,
  recorded_at,
  trusted_confirmed_at,
  retention_expires_at,
  retention_processed_at,
  retention_result
) on table public.event_ticket_purchase_signals to authenticated;

create view public.event_ticket_purchase_signal_self_service_v499
with (security_invoker = true)
as
select
  signal_id,
  parent_signal_id,
  canonical_event_id,
  channel_id,
  click_id,
  user_id,
  signal_type,
  evidence_source,
  attribution_campaign_id,
  recorded_at,
  trusted_confirmed_at,
  retention_expires_at,
  retention_processed_at,
  retention_result
from public.event_ticket_purchase_signals
where user_id = auth.uid();

revoke all on table public.event_ticket_purchase_signal_self_service_v499
  from public, anon, authenticated;
grant select on table public.event_ticket_purchase_signal_self_service_v499
  to authenticated;

-- =============================================================================
-- 27. TRUSTED INTEGRATION, PARTNER AND CHANNEL-SCOPE LIFECYCLE
-- =============================================================================

alter table public.event_ticket_commercial_audit_log
  drop constraint event_ticket_commercial_audit_target_type_v490_check;

alter table public.event_ticket_commercial_audit_log
  add constraint event_ticket_commercial_audit_target_type_v499_check
  check (target_type in (
    'partner','representative','request','channel','communication',
    'signal','retention_run','backfill','integration','integration_scope',
    'retention_policy'
  ));

alter table public.event_ticket_trusted_integrations
  add column lock_version integer not null default 0,
  add column lifecycle_evidence_hash text,
  add column lifecycle_reason_hash text,
  add column updated_by_admin_user_id uuid references auth.users(id) on delete set null;

alter table public.event_ticket_trusted_integrations
  add constraint event_ticket_trusted_integrations_lifecycle_hashes_v499_check
  check (
    lifecycle_evidence_hash is null
    or lifecycle_evidence_hash ~ '^[0-9a-f]{64}$'
  ),
  add constraint event_ticket_trusted_integrations_reason_hash_v499_check
  check (
    lifecycle_reason_hash is null
    or lifecycle_reason_hash ~ '^[0-9a-f]{64}$'
  );

alter table public.event_ticket_trusted_integration_channels
  add column lock_version integer not null default 0,
  add column lifecycle_evidence_hash text,
  add column lifecycle_reason_hash text,
  add column updated_at timestamptz not null default now();

alter table public.event_ticket_trusted_integration_channels
  add constraint event_ticket_trusted_integration_channels_lifecycle_hashes_v499_check
  check (
    lifecycle_evidence_hash is null
    or lifecycle_evidence_hash ~ '^[0-9a-f]{64}$'
  ),
  add constraint event_ticket_trusted_integration_channels_reason_hash_v499_check
  check (
    lifecycle_reason_hash is null
    or lifecycle_reason_hash ~ '^[0-9a-f]{64}$'
  );

alter table public.event_ticket_commercial_channels
  add constraint event_ticket_commercial_channels_channel_event_v499_unique
  unique (channel_id, canonical_event_id);

alter table public.event_ticket_trusted_integration_channels
  add constraint event_ticket_trusted_integration_channels_channel_event_v499_fk
  foreign key (channel_id, canonical_event_id)
  references public.event_ticket_commercial_channels(channel_id, canonical_event_id)
  on delete restrict;

create function public.mhidas_ticket_trusted_integration_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
begin
  if current_setting('app.mhidas_ticket_integration_mutation', true) <> 'on' then
    raise exception 'TRUSTED_INTEGRATION_DIRECT_MUTATION_DENIED';
  end if;

  if new.integration_status = 'active'
    and not exists (
      select 1
      from public.commercial_partners p
      where p.partner_id = new.partner_id
        and p.partner_status = 'verified'
    ) then
    raise exception 'TRUSTED_INTEGRATION_VERIFIED_PARTNER_REQUIRED';
  end if;

  if tg_op = 'UPDATE' then
    if not (
      old.integration_status = new.integration_status
      or (old.integration_status = 'pending' and new.integration_status in ('active','revoked'))
      or (old.integration_status = 'active' and new.integration_status in ('suspended','revoked'))
      or (old.integration_status = 'suspended' and new.integration_status in ('active','revoked'))
    ) then
      raise exception 'TRUSTED_INTEGRATION_TRANSITION_INVALID';
    end if;

    new.lock_version := old.lock_version + 1;
  end if;

  if new.integration_status in ('active','suspended','revoked')
    and (
      new.lifecycle_evidence_hash is null
      or new.lifecycle_reason_hash is null
      or new.updated_by_admin_user_id is null
    ) then
    raise exception 'TRUSTED_INTEGRATION_LIFECYCLE_EVIDENCE_REQUIRED';
  end if;

  new.updated_at := now();
  return new;
end;
$mhidas_plpgsql$;

create trigger event_ticket_trusted_integrations_guard_v499
before insert or update on public.event_ticket_trusted_integrations
for each row execute function public.mhidas_ticket_trusted_integration_guard_v1();

create function public.mhidas_ticket_trusted_integration_scope_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
begin
  if current_setting('app.mhidas_ticket_integration_mutation', true) <> 'on' then
    raise exception 'TRUSTED_INTEGRATION_SCOPE_DIRECT_MUTATION_DENIED';
  end if;

  if new.authorization_status = 'active'
    and not exists (
      select 1
      from public.event_ticket_trusted_integrations i
      join public.commercial_partners p on p.partner_id = i.partner_id
      join public.event_ticket_commercial_channels c
        on c.channel_id = new.channel_id
       and c.canonical_event_id = new.canonical_event_id
      where i.integration_id = new.integration_id
        and i.integration_status = 'active'
        and p.partner_status = 'verified'
    ) then
    raise exception 'TRUSTED_INTEGRATION_SCOPE_ACTIVE_CONTEXT_INVALID';
  end if;

  if tg_op = 'UPDATE' then
    if not (
      old.authorization_status = new.authorization_status
      or (old.authorization_status = 'pending' and new.authorization_status in ('active','revoked'))
      or (old.authorization_status = 'active' and new.authorization_status in ('suspended','revoked'))
      or (old.authorization_status = 'suspended' and new.authorization_status in ('active','revoked'))
    ) then
      raise exception 'TRUSTED_INTEGRATION_SCOPE_TRANSITION_INVALID';
    end if;

    new.lock_version := old.lock_version + 1;
  end if;

  if new.authorization_status in ('active','suspended','revoked')
    and (
      new.lifecycle_evidence_hash is null
      or new.lifecycle_reason_hash is null
    ) then
    raise exception 'TRUSTED_INTEGRATION_SCOPE_EVIDENCE_REQUIRED';
  end if;

  new.updated_at := now();
  return new;
end;
$mhidas_plpgsql$;

create trigger event_ticket_trusted_integration_channels_guard_v499
before insert or update on public.event_ticket_trusted_integration_channels
for each row execute function public.mhidas_ticket_trusted_integration_scope_guard_v1();

create function public.mhidas_ticket_partner_integration_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
begin
  if old.partner_status = 'verified'
    and new.partner_status <> 'verified'
    and exists (
      select 1
      from public.event_ticket_trusted_integrations i
      where i.partner_id = old.partner_id
        and i.integration_status = 'active'
    )
    and current_setting('app.mhidas_ticket_partner_cascade', true) <> 'on' then
    raise exception 'PARTNER_ACTIVE_INTEGRATION_CASCADE_REQUIRED';
  end if;

  return new;
end;
$mhidas_plpgsql$;

create trigger commercial_partners_integration_guard_v499
before update of partner_status on public.commercial_partners
for each row execute function public.mhidas_ticket_partner_integration_guard_v1();

create function public.mhidas_admin_mutate_event_ticket_trusted_integration_v1(
  p_operation text,
  p_integration_id uuid,
  p_expected_lock_version integer,
  p_lifecycle_evidence_hash text,
  p_lifecycle_reason_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_trusted_integrations
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_before public.event_ticket_trusted_integrations%rowtype;
  v_after public.event_ticket_trusted_integrations%rowtype;
  v_next_status text;
  v_request_hash text;
  v_receipt record;
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  if p_lifecycle_evidence_hash !~ '^[0-9a-f]{64}$'
    or p_lifecycle_reason_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'TRUSTED_INTEGRATION_LIFECYCLE_HASH_INVALID';
  end if;

  v_next_status := case p_operation
    when 'activate' then 'active'
    when 'suspend' then 'suspended'
    when 'revoke' then 'revoked'
    else null
  end;

  if v_next_status is null then
    raise exception 'TRUSTED_INTEGRATION_OPERATION_INVALID';
  end if;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'operation', p_operation,
    'integration_id', p_integration_id,
    'expected_lock_version', p_expected_lock_version,
    'lifecycle_evidence_hash', p_lifecycle_evidence_hash,
    'lifecycle_reason_hash', p_lifecycle_reason_hash
  ));

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v3(
    'integration_mutation',
    'user',
    v_admin_user_id,
    null,
    'mutate_trusted_integration_v1:' || p_operation,
    p_idempotency_key,
    'trusted_integration',
    p_integration_id,
    p_expected_lock_version,
    v_request_hash,
    p_integration_id,
    v_next_status,
    p_expected_lock_version + 1
  );

  if not v_receipt.reservation_owner then
    if v_receipt.receipt_status = 'completed' then
      select * into strict v_after
      from public.event_ticket_trusted_integrations i
      where i.integration_id = v_receipt.result_id;
      return v_after;
    end if;
    raise exception 'IDEMPOTENCY_RECEIPT_PENDING_RETRY';
  end if;

  select * into strict v_before
  from public.event_ticket_trusted_integrations i
  where i.integration_id = p_integration_id
  for update;

  if v_before.lock_version <> p_expected_lock_version then
    raise exception 'TRUSTED_INTEGRATION_LOCK_VERSION_MISMATCH';
  end if;

  perform set_config('app.mhidas_ticket_integration_mutation', 'on', true);
  perform set_config('app.mhidas_ticket_actor_role', 'useclubbers_admin', true);
  perform set_config('app.mhidas_ticket_actor_user_id', v_admin_user_id::text, true);

  if v_next_status in ('suspended','revoked') then
    update public.event_ticket_trusted_integration_channels s
    set authorization_status = v_next_status,
        lifecycle_evidence_hash = p_lifecycle_evidence_hash,
        lifecycle_reason_hash = p_lifecycle_reason_hash,
        revoked_at = case when v_next_status = 'revoked' then now() else s.revoked_at end
    where s.integration_id = p_integration_id
      and s.authorization_status in ('active','suspended');
  end if;

  update public.event_ticket_trusted_integrations i
  set integration_status = v_next_status,
      lifecycle_evidence_hash = p_lifecycle_evidence_hash,
      lifecycle_reason_hash = p_lifecycle_reason_hash,
      updated_by_admin_user_id = v_admin_user_id,
      verified_by_admin_user_id = case when v_next_status = 'active' then v_admin_user_id else i.verified_by_admin_user_id end,
      verified_at = case when v_next_status = 'active' then coalesce(i.verified_at, now()) else i.verified_at end,
      suspended_at = case when v_next_status = 'suspended' then now() else i.suspended_at end,
      revoked_at = case when v_next_status = 'revoked' then now() else i.revoked_at end
  where i.integration_id = p_integration_id
  returning * into v_after;

  perform public.mhidas_ticket_write_audit_v1(
    'integration',
    v_after.integration_id,
    null,
    v_after.partner_id,
    null,
    null,
    null,
    null,
    null,
    'trusted_integration_' || p_operation,
    v_before.integration_status,
    v_after.integration_status,
    v_after.lock_version,
    jsonb_build_object('lock_version', v_before.lock_version),
    jsonb_build_object('lock_version', v_after.lock_version),
    p_lifecycle_evidence_hash,
    'trusted integration controlled lifecycle',
    p_correlation_id,
    p_idempotency_key
  );

  perform public.mhidas_ticket_complete_operation_receipt_v1(
    v_receipt.receipt_id,
    v_after.integration_id,
    v_after.integration_status,
    v_after.lock_version,
    encode(digest(
      v_after.integration_id::text || ':' || v_after.integration_status || ':' || v_request_hash,
      'sha256'
    ), 'hex')
  );

  return v_after;
end;
$mhidas_plpgsql$;

create function public.mhidas_admin_mutate_event_ticket_trusted_integration_scope_v1(
  p_operation text,
  p_integration_id uuid,
  p_channel_id uuid,
  p_canonical_event_id uuid,
  p_expected_lock_version integer,
  p_lifecycle_evidence_hash text,
  p_lifecycle_reason_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_trusted_integration_channels
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_scope public.event_ticket_trusted_integration_channels%rowtype;
  v_next_status text;
  v_request_hash text;
  v_receipt record;
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  if p_lifecycle_evidence_hash !~ '^[0-9a-f]{64}$'
    or p_lifecycle_reason_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'TRUSTED_INTEGRATION_SCOPE_HASH_INVALID';
  end if;

  v_next_status := case p_operation
    when 'authorize' then 'active'
    when 'suspend' then 'suspended'
    when 'revoke' then 'revoked'
    else null
  end;

  if v_next_status is null then
    raise exception 'TRUSTED_INTEGRATION_SCOPE_OPERATION_INVALID';
  end if;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'operation', p_operation,
    'integration_id', p_integration_id,
    'channel_id', p_channel_id,
    'canonical_event_id', p_canonical_event_id,
    'expected_lock_version', p_expected_lock_version,
    'lifecycle_evidence_hash', p_lifecycle_evidence_hash,
    'lifecycle_reason_hash', p_lifecycle_reason_hash
  ));

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v3(
    'integration_scope_mutation',
    'user',
    v_admin_user_id,
    null,
    'mutate_trusted_integration_scope_v1:' || p_operation,
    p_idempotency_key,
    'trusted_integration_scope',
    p_channel_id,
    p_expected_lock_version,
    v_request_hash,
    p_channel_id,
    v_next_status,
    p_expected_lock_version + 1
  );

  if not v_receipt.reservation_owner then
    if v_receipt.receipt_status = 'completed' then
      select * into strict v_scope
      from public.event_ticket_trusted_integration_channels s
      where s.integration_id = p_integration_id
        and s.channel_id = v_receipt.result_id;
      return v_scope;
    end if;
    raise exception 'IDEMPOTENCY_RECEIPT_PENDING_RETRY';
  end if;

  perform set_config('app.mhidas_ticket_integration_mutation', 'on', true);
  perform set_config('app.mhidas_ticket_actor_role', 'useclubbers_admin', true);
  perform set_config('app.mhidas_ticket_actor_user_id', v_admin_user_id::text, true);

  insert into public.event_ticket_trusted_integration_channels (
    integration_id,
    channel_id,
    canonical_event_id,
    authorization_status,
    authorization_evidence_hash,
    authorized_by_admin_user_id,
    authorized_at,
    revoked_at,
    lock_version,
    lifecycle_evidence_hash,
    lifecycle_reason_hash
  )
  values (
    p_integration_id,
    p_channel_id,
    p_canonical_event_id,
    v_next_status,
    p_lifecycle_evidence_hash,
    v_admin_user_id,
    case when v_next_status = 'active' then now() end,
    case when v_next_status = 'revoked' then now() end,
    0,
    p_lifecycle_evidence_hash,
    p_lifecycle_reason_hash
  )
  on conflict (integration_id, channel_id) do update
  set authorization_status = excluded.authorization_status,
      authorization_evidence_hash = excluded.authorization_evidence_hash,
      authorized_by_admin_user_id = excluded.authorized_by_admin_user_id,
      authorized_at = case when excluded.authorization_status = 'active' then now() else event_ticket_trusted_integration_channels.authorized_at end,
      revoked_at = case when excluded.authorization_status = 'revoked' then now() else event_ticket_trusted_integration_channels.revoked_at end,
      lifecycle_evidence_hash = excluded.lifecycle_evidence_hash,
      lifecycle_reason_hash = excluded.lifecycle_reason_hash
  where event_ticket_trusted_integration_channels.lock_version = p_expected_lock_version
    and event_ticket_trusted_integration_channels.canonical_event_id = excluded.canonical_event_id
  returning * into v_scope;

  if not found then
    raise exception 'TRUSTED_INTEGRATION_SCOPE_LOCK_OR_EVENT_MISMATCH';
  end if;

  perform public.mhidas_ticket_write_audit_v1(
    'integration_scope',
    v_scope.channel_id,
    v_scope.canonical_event_id,
    null,
    null,
    v_scope.channel_id,
    null,
    null,
    null,
    'trusted_integration_scope_' || p_operation,
    null,
    v_scope.authorization_status,
    v_scope.lock_version,
    null,
    jsonb_build_object('lock_version', v_scope.lock_version),
    p_lifecycle_evidence_hash,
    'trusted integration channel scope lifecycle',
    p_correlation_id,
    p_idempotency_key
  );

  perform public.mhidas_ticket_complete_operation_receipt_v1(
    v_receipt.receipt_id,
    v_scope.channel_id,
    v_scope.authorization_status,
    v_scope.lock_version,
    encode(digest(
      v_scope.integration_id::text || ':' || v_scope.channel_id::text || ':' || v_request_hash,
      'sha256'
    ), 'hex')
  );

  return v_scope;
end;
$mhidas_plpgsql$;

create function public.mhidas_admin_mutate_commercial_partner_status_v1(
  p_partner_id uuid,
  p_expected_lock_version integer,
  p_next_status text,
  p_cascade_integrations boolean,
  p_evidence_hash text,
  p_reason_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.commercial_partners
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_partner public.commercial_partners%rowtype;
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  if p_next_status not in ('verified','suspended','deactivated') then
    raise exception 'COMMERCIAL_PARTNER_STATUS_INVALID';
  end if;

  select * into strict v_partner
  from public.commercial_partners p
  where p.partner_id = p_partner_id
  for update;

  if v_partner.lock_version <> p_expected_lock_version then
    raise exception 'COMMERCIAL_PARTNER_LOCK_VERSION_MISMATCH';
  end if;

  if p_next_status <> 'verified'
    and exists (
      select 1
      from public.event_ticket_trusted_integrations i
      where i.partner_id = p_partner_id
        and i.integration_status = 'active'
    )
    and not p_cascade_integrations then
    raise exception 'PARTNER_ACTIVE_INTEGRATION_CASCADE_REQUIRED';
  end if;

  perform set_config('app.mhidas_ticket_partner_cascade', 'on', true);
  perform set_config('app.mhidas_ticket_integration_mutation', 'on', true);
  perform set_config('app.mhidas_ticket_actor_role', 'useclubbers_admin', true);
  perform set_config('app.mhidas_ticket_actor_user_id', v_admin_user_id::text, true);

  if p_next_status <> 'verified' then
    update public.event_ticket_trusted_integration_channels s
    set authorization_status = 'suspended',
        lifecycle_evidence_hash = p_evidence_hash,
        lifecycle_reason_hash = p_reason_hash
    where s.integration_id in (
      select i.integration_id
      from public.event_ticket_trusted_integrations i
      where i.partner_id = p_partner_id
        and i.integration_status = 'active'
    )
      and s.authorization_status = 'active';

    update public.event_ticket_trusted_integrations i
    set integration_status = 'suspended',
        lifecycle_evidence_hash = p_evidence_hash,
        lifecycle_reason_hash = p_reason_hash,
        updated_by_admin_user_id = v_admin_user_id,
        suspended_at = now()
    where i.partner_id = p_partner_id
      and i.integration_status = 'active';
  end if;

  update public.commercial_partners p
  set partner_status = p_next_status,
      lock_version = p.lock_version + 1,
      updated_at = now(),
      verified_by_admin_user_id = case when p_next_status = 'verified' then v_admin_user_id else p.verified_by_admin_user_id end,
      verified_at = case when p_next_status = 'verified' then coalesce(p.verified_at, now()) else p.verified_at end
  where p.partner_id = p_partner_id
  returning * into v_partner;

  perform public.mhidas_ticket_write_audit_v1(
    'partner',
    v_partner.partner_id,
    null,
    v_partner.partner_id,
    null,
    null,
    null,
    null,
    null,
    'commercial_partner_status_changed',
    null,
    v_partner.partner_status,
    v_partner.lock_version,
    null,
    jsonb_build_object('lock_version', v_partner.lock_version),
    p_evidence_hash,
    'commercial partner and integration cascade lifecycle',
    p_correlation_id,
    p_idempotency_key
  );

  return v_partner;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 28. RETENTION POLICY LIFECYCLE AND PUBLIC RESOLUTION
-- =============================================================================

alter table public.event_ticket_retention_policy_versions
  add column lock_version integer not null default 0,
  add column lifecycle_evidence_hash text,
  add column lifecycle_reason_hash text;

alter table public.event_ticket_retention_policy_versions
  add constraint event_ticket_retention_policy_lifecycle_hash_v499_check
  check (
    lifecycle_evidence_hash is null
    or lifecycle_evidence_hash ~ '^[0-9a-f]{64}$'
  ),
  add constraint event_ticket_retention_policy_reason_hash_v499_check
  check (
    lifecycle_reason_hash is null
    or lifecycle_reason_hash ~ '^[0-9a-f]{64}$'
  );

create function public.mhidas_ticket_retention_policy_dependency_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
begin
  if old.policy_status = 'active'
    and new.policy_status <> 'active'
    and exists (
      select 1
      from public.event_ticket_commercial_channels c
      where c.retention_policy_version_id = old.retention_policy_version_id
        and c.channel_status = 'active'
    )
    and current_setting('app.mhidas_ticket_retention_cascade', true) <> 'on' then
    raise exception 'RETENTION_POLICY_ACTIVE_CHANNEL_CASCADE_REQUIRED';
  end if;

  if tg_op = 'UPDATE' then
    new.lock_version := old.lock_version + 1;
  end if;

  return new;
end;
$mhidas_plpgsql$;

create trigger event_ticket_retention_policy_dependency_guard_v499
before update on public.event_ticket_retention_policy_versions
for each row execute function public.mhidas_ticket_retention_policy_dependency_guard_v1();

create function public.mhidas_admin_retire_event_ticket_retention_policy_v1(
  p_policy_id uuid,
  p_expected_lock_version integer,
  p_pause_dependent_channels boolean,
  p_evidence_hash text,
  p_reason_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_retention_policy_versions
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_policy public.event_ticket_retention_policy_versions%rowtype;
  v_affected_channels integer;
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  select * into strict v_policy
  from public.event_ticket_retention_policy_versions p
  where p.retention_policy_version_id = p_policy_id
  for update;

  if v_policy.lock_version <> p_expected_lock_version then
    raise exception 'RETENTION_POLICY_LOCK_VERSION_MISMATCH';
  end if;

  select count(*) into v_affected_channels
  from public.event_ticket_commercial_channels c
  where c.retention_policy_version_id = p_policy_id
    and c.channel_status = 'active';

  if v_affected_channels > 0 and not p_pause_dependent_channels then
    raise exception 'RETENTION_POLICY_ACTIVE_CHANNEL_CASCADE_REQUIRED';
  end if;

  perform set_config('app.mhidas_ticket_retention_cascade', 'on', true);
  perform set_config('app.mhidas_ticket_actor_role', 'useclubbers_admin', true);
  perform set_config('app.mhidas_ticket_actor_user_id', v_admin_user_id::text, true);

  update public.event_ticket_commercial_channels c
  set channel_status = 'paused',
      paused_by_admin_user_id = v_admin_user_id,
      paused_at = now(),
      updated_at = now(),
      lock_version = c.lock_version + 1
  where c.retention_policy_version_id = p_policy_id
    and c.channel_status = 'active';

  update public.event_ticket_retention_policy_versions p
  set policy_status = 'retired',
      retired_at = now(),
      lifecycle_evidence_hash = p_evidence_hash,
      lifecycle_reason_hash = p_reason_hash
  where p.retention_policy_version_id = p_policy_id
  returning * into v_policy;

  perform public.mhidas_ticket_write_audit_v1(
    'retention_policy',
    v_policy.retention_policy_version_id,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'retention_policy_retired_with_channel_cascade',
    'active',
    v_policy.policy_status,
    v_policy.lock_version,
    jsonb_build_object('lock_version', p_expected_lock_version),
    jsonb_build_object(
      'lock_version', v_policy.lock_version,
      'channel_status', 'paused',
      'skipped_count', 0
    ),
    p_evidence_hash,
    'retention policy retirement and dependent channel pause',
    p_correlation_id,
    p_idempotency_key
  );

  return v_policy;
end;
$mhidas_plpgsql$;

create function public.mhidas_resolve_public_event_ticket_action_v4(
  p_canonical_event_id uuid
)
returns table (
  action_kind text,
  action_label text,
  target_url text,
  commercial_channel_id uuid,
  official_source_id uuid,
  reason_code text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_channel public.event_ticket_commercial_channels%rowtype;
  v_source public.canonical_event_sources%rowtype;
begin
  select c.* into v_channel
  from public.event_ticket_commercial_channels c
  where c.canonical_event_id = p_canonical_event_id
    and c.channel_status = 'active'
    and public.mhidas_ticket_url_proof_is_fresh_v4(
      c.url_validation_status,
      c.url_validated_at,
      c.url_validation_expires_at,
      c.url_health_status,
      c.last_health_checked_at,
      c.last_health_check_hash,
      c.url_validator_version,
      c.resolved_host_hash,
      c.redirect_chain_validation_hash
    ) is true
    and (
      c.tracking_method = 'none'
      or exists (
        select 1
        from public.event_ticket_retention_policy_versions p
        where p.retention_policy_version_id = c.retention_policy_version_id
          and p.policy_status = 'active'
          and p.policy_purpose = 'event_ticket_tracking'
          and p.jurisdiction_code = 'BR'
          and p.evidence_class = 'redirect'
      )
    )
    and c.authorization_starts_at <= now()
    and (c.authorization_ends_at is null or c.authorization_ends_at > now())
  order by c.public_priority, c.activated_at desc, c.channel_id
  limit 1;

  if found then
    return query
    select
      'commercial_channel'::text,
      'Comprar ingresso'::text,
      v_channel.commercial_url,
      v_channel.channel_id,
      null::uuid,
      'authorized_monetized_channel_active_fresh_healthy_policy_active'::text;
    return;
  end if;

  select s.* into v_source
  from public.canonical_event_sources s
  where s.canonical_event_id = p_canonical_event_id
    and s.reference_status = 'validated'
    and s.source_url is not null
    and s.reference_domain is not null
    and public.mhidas_ticket_domain_matches_v1(
      public.mhidas_ticket_extract_hostname_v1(s.source_url),
      s.reference_domain,
      true
    )
  order by s.authority_score desc, s.validated_at desc, s.id
  limit 1;

  if found then
    return query
    select
      'official_reference'::text,
      'Ver evento oficial'::text,
      v_source.source_url,
      null::uuid,
      v_source.id,
      'commercial_channel_failed_closed_official_reference_available'::text;
    return;
  end if;

  return query
  select
    'unavailable'::text,
    'Canal de vendas a confirmar'::text,
    null::text,
    null::uuid,
    null::uuid,
    'no_fresh_healthy_authorized_policy_active_channel_or_validated_reference'::text;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 29. TRANSACTION DEDUPLICATION AND SERVER-DERIVED CLICK IDENTITY
-- =============================================================================

create unique index event_ticket_purchase_signals_attributed_transaction_v499_uq
  on public.event_ticket_purchase_signals (
    integration_id,
    provider_namespace,
    transaction_hash_algorithm,
    transaction_hash_version,
    transaction_hash
  )
  where signal_type = 'attributed_conversion';

create function public.mhidas_record_event_ticket_purchase_signal_v4(
  p_signal_id uuid,
  p_parent_signal_id uuid,
  p_canonical_event_id uuid,
  p_channel_id uuid,
  p_click_id uuid,
  p_user_id uuid,
  p_signal_type text,
  p_evidence_source text,
  p_integration_id uuid,
  p_provider_namespace text,
  p_transaction_hash text,
  p_evidence_hash text,
  p_signature_validation_hash text,
  p_replay_nonce_hash text,
  p_attribution_campaign_id text,
  p_gross_amount_minor bigint,
  p_commission_amount_minor bigint,
  p_currency text,
  p_idempotency_key text,
  p_metadata jsonb,
  p_correlation_id text
)
returns public.event_ticket_purchase_signals
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_signal public.event_ticket_purchase_signals%rowtype;
  v_parent public.event_ticket_purchase_signals%rowtype;
  v_click public.event_ticket_click_attributions%rowtype;
  v_channel public.event_ticket_commercial_channels%rowtype;
  v_integration public.event_ticket_trusted_integrations%rowtype;
  v_actor_role text;
  v_actor_user_id uuid := auth.uid();
  v_principal_type text;
  v_principal_id uuid;
  v_principal_namespace text;
  v_request_hash text;
  v_receipt record;
  v_receipt_id uuid;
  v_effective_user_id uuid;
  v_retention_policy_version_id uuid;
  v_signal_retention_days integer;
  v_recorded_at timestamptz := now();
  v_effective_signal_id uuid := coalesce(p_signal_id, gen_random_uuid());
begin
  if p_signal_type in ('attributed_conversion','confirmed_conversion') then
    if current_setting('request.jwt.claim.role', true) <> 'service_role' then
      raise exception 'TRUSTED_TICKETING_SERVICE_ROLE_REQUIRED';
    end if;

    select i.* into v_integration
    from public.event_ticket_trusted_integrations i
    join public.commercial_partners p on p.partner_id = i.partner_id
    where i.integration_id = p_integration_id
      and i.provider_namespace = p_provider_namespace
      and i.integration_status = 'active'
      and p.partner_status = 'verified';

    if not found then
      raise exception 'TRUSTED_INTEGRATION_NOT_ACTIVE_OR_NAMESPACE_MISMATCH';
    end if;

    v_actor_role := 'trusted_ticketing_integration';
    v_actor_user_id := null;
    v_principal_type := 'trusted_ticketing_integration';
    v_principal_id := v_integration.integration_id;
    v_principal_namespace := v_integration.provider_namespace;
    v_effective_user_id := null;
  elsif p_signal_type = 'commercial_link_click' then
    if current_setting('request.jwt.claim.role', true) <> 'service_role' then
      raise exception 'SYSTEM_REDIRECT_SERVICE_ROLE_REQUIRED';
    end if;

    v_actor_role := 'system';
    v_actor_user_id := null;
    v_principal_type := 'automation';
    v_principal_id := null;
    v_principal_namespace := null;
    v_effective_user_id := null;
  elsif p_signal_type = 'correction' then
    if v_actor_user_id is null
      or not public.mhidas_is_useclubbers_admin_v1(v_actor_user_id) then
      raise exception 'USECLUBBERS_ADMIN_REQUIRED';
    end if;

    v_actor_role := 'useclubbers_admin';
    v_principal_type := 'user';
    v_principal_id := v_actor_user_id;
    v_principal_namespace := null;
    v_effective_user_id := null;
  else
    if v_actor_user_id is null
      or p_user_id is distinct from v_actor_user_id then
      raise exception 'PURCHASE_SIGNAL_OWNERSHIP_REQUIRED';
    end if;

    v_actor_role := 'clubber';
    v_principal_type := 'user';
    v_principal_id := v_actor_user_id;
    v_principal_namespace := null;
    v_effective_user_id := v_actor_user_id;
  end if;

  if not public.mhidas_ticket_signal_evidence_is_allowed_v1(
    v_actor_role,
    p_signal_type,
    p_evidence_source
  ) then
    raise exception 'SIGNAL_ACTOR_EVIDENCE_MATRIX_DENIED';
  end if;

  if p_channel_id is not null then
    select * into v_channel
    from public.event_ticket_commercial_channels c
    where c.channel_id = p_channel_id;

    if not found or v_channel.canonical_event_id <> p_canonical_event_id then
      raise exception 'SIGNAL_CHANNEL_EVENT_CONTEXT_MISMATCH';
    end if;

    if v_actor_role = 'trusted_ticketing_integration' then
      if v_channel.ticketing_provider_key is distinct from p_provider_namespace
        or not exists (
          select 1
          from public.event_ticket_trusted_integration_channels a
          where a.integration_id = p_integration_id
            and a.channel_id = p_channel_id
            and a.canonical_event_id = p_canonical_event_id
            and a.authorization_status = 'active'
        ) then
        raise exception 'TRUSTED_INTEGRATION_CHANNEL_SCOPE_DENIED';
      end if;
    end if;
  elsif p_signal_type in (
    'commercial_link_click','attributed_conversion','confirmed_conversion'
  ) then
    raise exception 'SIGNAL_CHANNEL_REQUIRED';
  end if;

  if p_click_id is not null then
    select * into v_click
    from public.event_ticket_click_attributions c
    where c.click_id = p_click_id;

    if not found
      or v_click.canonical_event_id <> p_canonical_event_id
      or v_click.channel_id is distinct from p_channel_id then
      raise exception 'SIGNAL_CLICK_EVENT_CHANNEL_CONTEXT_MISMATCH';
    end if;

    if p_user_id is not null
      and p_user_id is distinct from v_click.user_id then
      raise exception 'SIGNAL_CLICK_USER_CONTEXT_MISMATCH';
    end if;

    v_effective_user_id := v_click.user_id;
  elsif p_signal_type = 'commercial_link_click' then
    raise exception 'COMMERCIAL_LINK_CLICK_REQUIRES_CLICK_ID';
  elsif v_actor_role = 'trusted_ticketing_integration' and p_user_id is not null then
    raise exception 'TRUSTED_SIGNAL_USER_REQUIRES_CLICK_LINEAGE';
  end if;

  if p_parent_signal_id is not null then
    select * into v_parent
    from public.event_ticket_purchase_signals s
    where s.signal_id = p_parent_signal_id;

    if not found then
      raise exception 'PARENT_SIGNAL_NOT_FOUND';
    end if;

    if v_parent.canonical_event_id <> p_canonical_event_id then
      raise exception 'PARENT_SIGNAL_EVENT_CONTEXT_MISMATCH';
    end if;
  end if;

  if p_signal_type = 'confirmed_conversion' then
    if p_parent_signal_id is null
      or v_parent.signal_type <> 'attributed_conversion'
      or v_parent.channel_id is distinct from p_channel_id
      or v_parent.integration_id is distinct from p_integration_id
      or v_parent.provider_namespace is distinct from p_provider_namespace
      or v_parent.transaction_hash is distinct from p_transaction_hash then
      raise exception 'CONFIRMED_CONVERSION_LINEAGE_INVALID';
    end if;
  elsif p_signal_type = 'correction' then
    v_effective_user_id := v_parent.user_id;
    if p_user_id is not null and p_user_id is distinct from v_parent.user_id then
      raise exception 'CORRECTION_USER_LINEAGE_MISMATCH';
    end if;

    if p_parent_signal_id is null
      or v_parent.signal_type not in (
        'attributed_conversion','confirmed_conversion','correction'
      ) then
      raise exception 'CORRECTION_LINEAGE_INVALID';
    end if;
  elsif p_parent_signal_id is not null then
    raise exception 'PARENT_SIGNAL_NOT_ALLOWED_FOR_SIGNAL_TYPE';
  end if;

  select p.retention_policy_version_id, p.signal_retention_days
  into v_retention_policy_version_id, v_signal_retention_days
  from public.mhidas_ticket_resolve_active_retention_policy_v1(
    p_signal_type,
    p_evidence_source
  ) p;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'signal_id', v_effective_signal_id,
    'parent_signal_id', p_parent_signal_id,
    'canonical_event_id', p_canonical_event_id,
    'channel_id', p_channel_id,
    'click_id', p_click_id,
    'user_id', v_effective_user_id,
    'signal_type', p_signal_type,
    'evidence_source', p_evidence_source,
    'integration_id', p_integration_id,
    'provider_namespace', p_provider_namespace,
    'transaction_hash', p_transaction_hash,
    'evidence_hash', p_evidence_hash,
    'signature_validation_hash', p_signature_validation_hash,
    'replay_nonce_hash', p_replay_nonce_hash,
    'attribution_campaign_id', p_attribution_campaign_id,
    'gross_amount_minor', p_gross_amount_minor,
    'commission_amount_minor', p_commission_amount_minor,
    'currency', p_currency,
    'metadata', coalesce(p_metadata, '{}'::jsonb),
    'evidence_matrix_version', 1
  ));

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v3(
    'signal_insert',
    v_principal_type,
    v_principal_id,
    v_principal_namespace,
    'record_purchase_signal_v4',
    p_idempotency_key,
    'canonical_event',
    p_canonical_event_id,
    null,
    v_request_hash,
    v_effective_signal_id,
    p_signal_type,
    1
  );

  v_receipt_id := v_receipt.receipt_id;
  v_effective_signal_id := v_receipt.result_id;

  if not v_receipt.reservation_owner then
    if v_receipt.receipt_status = 'completed' then
      select * into strict v_signal
      from public.event_ticket_purchase_signals s
      where s.signal_id = v_receipt.result_id;
      return v_signal;
    end if;

    raise exception 'IDEMPOTENCY_RECEIPT_PENDING_RETRY';
  end if;

  perform set_config('app.mhidas_ticket_actor_role', v_actor_role, true);
  perform set_config(
    'app.mhidas_ticket_actor_user_id',
    coalesce(v_actor_user_id::text, ''),
    true
  );

  insert into public.event_ticket_purchase_signals (
    signal_id,
    parent_signal_id,
    canonical_event_id,
    channel_id,
    click_id,
    user_id,
    signal_type,
    evidence_source,
    trusted_evidence_verified,
    provider_namespace,
    transaction_hash,
    transaction_hash_algorithm,
    transaction_hash_version,
    evidence_hash,
    signature_validation_hash,
    replay_nonce_hash,
    attribution_campaign_id,
    gross_amount_minor,
    commission_amount_minor,
    currency,
    recorded_at,
    trusted_confirmed_at,
    trusted_confirmed_by_actor_role,
    retention_policy_version_id,
    retention_expires_at,
    idempotency_key,
    metadata,
    receipt_id,
    integration_id,
    evidence_matrix_version
  )
  values (
    v_effective_signal_id,
    p_parent_signal_id,
    p_canonical_event_id,
    p_channel_id,
    p_click_id,
    v_effective_user_id,
    p_signal_type,
    p_evidence_source,
    v_actor_role = 'trusted_ticketing_integration',
    case when v_actor_role = 'trusted_ticketing_integration' then p_provider_namespace end,
    case when v_actor_role = 'trusted_ticketing_integration' then p_transaction_hash end,
    case when v_actor_role = 'trusted_ticketing_integration' then 'sha256' end,
    case when v_actor_role = 'trusted_ticketing_integration' then 1 end,
    case when v_actor_role = 'trusted_ticketing_integration' then p_evidence_hash end,
    case when v_actor_role = 'trusted_ticketing_integration' then p_signature_validation_hash end,
    case when v_actor_role = 'trusted_ticketing_integration' then p_replay_nonce_hash end,
    p_attribution_campaign_id,
    case when v_actor_role = 'trusted_ticketing_integration' then p_gross_amount_minor end,
    case when v_actor_role = 'trusted_ticketing_integration' then p_commission_amount_minor end,
    case when v_actor_role = 'trusted_ticketing_integration' then p_currency end,
    v_recorded_at,
    case when v_actor_role = 'trusted_ticketing_integration' then v_recorded_at end,
    case when v_actor_role = 'trusted_ticketing_integration' then 'trusted_ticketing_integration' end,
    v_retention_policy_version_id,
    v_recorded_at + make_interval(days => v_signal_retention_days),
    p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb),
    v_receipt_id,
    case when v_actor_role = 'trusted_ticketing_integration' then p_integration_id end,
    1
  )
  returning * into v_signal;

  perform public.mhidas_ticket_complete_operation_receipt_v1(
    v_receipt_id,
    v_signal.signal_id,
    v_signal.signal_type,
    1,
    encode(digest(
      v_signal.signal_id::text || ':' || v_signal.signal_type || ':' || v_request_hash,
      'sha256'
    ), 'hex')
  );

  perform public.mhidas_ticket_write_audit_v1(
    'signal',
    v_signal.signal_id,
    v_signal.canonical_event_id,
    v_integration.partner_id,
    null,
    v_signal.channel_id,
    null,
    v_signal.signal_id,
    null,
    'purchase_signal_recorded_v4',
    null,
    v_signal.signal_type,
    null,
    null,
    jsonb_build_object(
      'signal_type', v_signal.signal_type,
      'evidence_source', v_signal.evidence_source,
      'trusted_evidence_verified', v_signal.trusted_evidence_verified,
      'policy_version', v_retention_policy_version_id,
      'lock_version', null
    ),
    p_evidence_hash,
    'server-derived click identity with atomic receipt authority',
    p_correlation_id,
    p_idempotency_key
  );

  return v_signal;
end;
$mhidas_plpgsql$;


-- =============================================================================
-- 30. EFFECTIVE PRIVILEGES, STATIC EVIDENCE AND FIFTH-DRAFT SELF-CHECK
-- =============================================================================

revoke all on function public.mhidas_record_event_ticket_channel_url_validation_v3(
  uuid,integer,jsonb,text,text
) from public, anon, authenticated, service_role;
revoke all on function public.mhidas_record_event_ticket_purchase_signal_v3(
  uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text
) from public, anon, authenticated, service_role;
revoke all on function public.mhidas_resolve_public_event_ticket_action_v3(uuid)
  from public, anon, authenticated, service_role;

revoke all on function public.mhidas_ticket_reserve_operation_receipt_v3(
  text,text,uuid,text,text,text,text,uuid,integer,text,uuid,text,integer
) from public, anon, authenticated;
revoke all on function public.mhidas_ticket_complete_operation_receipt_v1(
  uuid,uuid,text,integer,text
) from public, anon, authenticated;
revoke all on function public.mhidas_ticket_url_proof_is_fresh_v4(
  text,timestamptz,timestamptz,text,timestamptz,text,integer,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_record_event_ticket_channel_url_validation_v4(
  uuid,integer,jsonb,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_admin_mutate_event_ticket_trusted_integration_v1(
  text,uuid,integer,text,text,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_admin_mutate_event_ticket_trusted_integration_scope_v1(
  text,uuid,uuid,uuid,integer,text,text,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_admin_mutate_commercial_partner_status_v1(
  uuid,integer,text,boolean,text,text,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_admin_retire_event_ticket_retention_policy_v1(
  uuid,integer,boolean,text,text,text,text
) from public, anon, authenticated;
revoke all on function public.mhidas_record_event_ticket_purchase_signal_v4(
  uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text
) from public, anon, authenticated;
revoke all on function public.mhidas_resolve_public_event_ticket_action_v4(uuid)
  from public;

grant execute on function public.mhidas_record_event_ticket_channel_url_validation_v4(
  uuid,integer,jsonb,text,text
) to service_role;
grant execute on function public.mhidas_admin_mutate_event_ticket_trusted_integration_v1(
  text,uuid,integer,text,text,text,text
) to authenticated;
grant execute on function public.mhidas_admin_mutate_event_ticket_trusted_integration_scope_v1(
  text,uuid,uuid,uuid,integer,text,text,text,text
) to authenticated;
grant execute on function public.mhidas_admin_mutate_commercial_partner_status_v1(
  uuid,integer,text,boolean,text,text,text,text
) to authenticated;
grant execute on function public.mhidas_admin_retire_event_ticket_retention_policy_v1(
  uuid,integer,boolean,text,text,text,text
) to authenticated;
grant execute on function public.mhidas_record_event_ticket_purchase_signal_v4(
  uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text
) to authenticated, service_role;
grant execute on function public.mhidas_resolve_public_event_ticket_action_v4(uuid)
  to anon, authenticated, service_role;

create temporary table mhidas_v499_fifth_adjustment_evidence (
  adjustment_key text primary key,
  correction_status text not null,
  evidence_items text[] not null,
  promotion_blocked boolean not null
) on commit drop;

insert into mhidas_v499_fifth_adjustment_evidence (
  adjustment_key,
  correction_status,
  evidence_items,
  promotion_blocked
)
values
(
  'url_validation_nullable_boolean_bypass',
  'corrected_in_protected_draft',
  array['coalesce false predicate','is not true validation','validated proof not-null constraint'],
  true
),
(
  'authenticated_purchase_signal_read_exposes_sensitive_evidence',
  'corrected_in_protected_draft',
  array['table select revoked','security invoker redacted view','financial and evidence hashes omitted'],
  true
),
(
  'trusted_integration_not_bound_to_verified_partner_lifecycle',
  'corrected_in_protected_draft',
  array['active partner join','partner cascade guard','atomic integration scope suspension'],
  true
),
(
  'system_click_user_identity_is_caller_controlled',
  'corrected_in_protected_draft',
  array['click-derived user identity','anonymous click remains anonymous','caller value is comparison only'],
  true
),
(
  'receipt_idempotency_is_not_atomic_under_concurrency',
  'corrected_in_protected_draft',
  array['atomic receipt reservation','pending completed failed state','winner result replay'],
  true
),
(
  'active_channel_can_outlive_active_retention_policy',
  'corrected_in_protected_draft',
  array['policy dependency guard','cascade pause RPC','public resolver active policy join'],
  true
),
(
  'attributed_conversion_transaction_deduplication_missing',
  'corrected_in_protected_draft',
  array['attributed transaction unique index','integration namespace transaction key','confirmed lineage preserved'],
  true
),
(
  'trusted_integration_channel_event_relation_not_constrained',
  'corrected_in_protected_draft',
  array['channel event composite unique','scope composite foreign key','active scope guard'],
  true
),
(
  'trusted_integration_registry_has_no_controlled_audited_lifecycle',
  'corrected_in_protected_draft',
  array['lock version guards','admin lifecycle RPCs','append-only audit and cascade revocation'],
  true
);

do $mhidas_v499_fifth_adjustment_self_check$
declare
  v_count integer;
  v_unblocked integer;
begin
  select count(*) into v_count
  from mhidas_v499_fifth_adjustment_evidence;

  select count(*) into v_unblocked
  from mhidas_v499_fifth_adjustment_evidence
  where promotion_blocked = false;

  if v_count <> 9 then
    raise exception 'FIFTH_ADJUSTMENT_EVIDENCE_COUNT_MISMATCH: %', v_count;
  end if;

  if v_unblocked <> 0 then
    raise exception 'THIRD_CORRECTED_DRAFT_PROMOTION_MUST_REMAIN_BLOCKED';
  end if;

  if to_regprocedure('public.mhidas_record_event_ticket_purchase_signal_v4(uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text)') is null
    or to_regprocedure('public.mhidas_record_event_ticket_channel_url_validation_v4(uuid,integer,jsonb,text,text)') is null
    or to_regprocedure('public.mhidas_resolve_public_event_ticket_action_v4(uuid)') is null
    or to_regprocedure('public.mhidas_admin_mutate_event_ticket_trusted_integration_v1(text,uuid,integer,text,text,text,text)') is null
    or to_regprocedure('public.mhidas_admin_retire_event_ticket_retention_policy_v1(uuid,integer,boolean,text,text,text,text)') is null then
    raise exception 'V4_8_99_REQUIRED_RPC_MISSING';
  end if;

  if to_regclass('public.event_ticket_purchase_signal_self_service_v499') is null then
    raise exception 'V4_8_99_REDACTED_SIGNAL_SURFACE_MISSING';
  end if;
end;
$mhidas_v499_fifth_adjustment_self_check$;

-- =============================================================================
-- 31. SIXTH CORRECTION LAYER FOR THE NINE V4.8.100 BLOCKERS
-- =============================================================================

-- 31.1 Retention, credential and audit authority columns.

alter table public.event_ticket_operation_receipts
  add column credential_version_id uuid,
  add column verifier_evidence_hash text,
  add column retention_policy_version_id uuid references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  add column retention_expires_at timestamptz,
  add column retention_status text not null default 'active',
  add column retention_processed_at timestamptz,
  add column legal_hold boolean not null default false,
  add column dispute_hold boolean not null default false,
  add column anonymized_principal_hash text;

alter table public.event_ticket_operation_receipts
  add constraint event_ticket_operation_receipts_verifier_hash_v4102_check
  check (
    verifier_evidence_hash is null
    or verifier_evidence_hash ~ '^[0-9a-f]{64}$'
  ),
  add constraint event_ticket_operation_receipts_retention_v4102_check
  check (
    retention_status in ('active','eligible','anonymized','preserved','expired')
    and (
      retention_expires_at is null
      or retention_expires_at > created_at
    )
    and (
      retention_status not in ('anonymized','expired')
      or retention_processed_at is not null
    )
  ),
  add constraint event_ticket_operation_receipts_anonymized_hash_v4102_check
  check (
    anonymized_principal_hash is null
    or anonymized_principal_hash ~ '^[0-9a-f]{64}$'
  );

alter table public.event_ticket_commercial_audit_log
  add column parent_target_type text,
  add column parent_target_id uuid,
  add column target_key_hash text,
  add column receipt_id uuid references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  add column credential_version_id uuid,
  add column verifier_evidence_hash text,
  add column read_purpose text,
  add column response_hash text,
  add column response_row_count integer,
  add column retention_policy_version_id uuid references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  add column retention_expires_at timestamptz,
  add column retention_status text not null default 'active',
  add column retention_processed_at timestamptz,
  add column legal_hold boolean not null default false,
  add column dispute_hold boolean not null default false;

alter table public.event_ticket_commercial_audit_log
  add constraint event_ticket_commercial_audit_extended_hashes_v4102_check
  check (
    (target_key_hash is null or target_key_hash ~ '^[0-9a-f]{64}$')
    and (verifier_evidence_hash is null or verifier_evidence_hash ~ '^[0-9a-f]{64}$')
    and (response_hash is null or response_hash ~ '^[0-9a-f]{64}$')
  ),
  add constraint event_ticket_commercial_audit_read_v4102_check
  check (
    (
      read_purpose is null
      and response_hash is null
      and response_row_count is null
    )
    or (
      read_purpose in ('financial_reconciliation','conversion_dispute','fraud_review','partner_settlement','legal_hold_review')
      and response_hash is not null
      and response_row_count is not null
      and response_row_count >= 0
    )
  ),
  add constraint event_ticket_commercial_audit_retention_v4102_check
  check (
    retention_status in ('active','eligible','anonymized','preserved','expired')
    and (retention_expires_at is null or retention_expires_at > created_at)
    and (
      retention_status not in ('anonymized','expired')
      or retention_processed_at is not null
    )
  );

-- =============================================================================
-- 32. CREDENTIAL VERSION REGISTRY AND VERIFIED SERVER CONTEXT
-- =============================================================================

create table public.event_ticket_trusted_integration_credential_versions (
  credential_version_id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.event_ticket_trusted_integrations(integration_id) on delete restrict,
  version_number integer not null,
  credential_status text not null default 'active',
  credential_reference_hash text not null,
  verification_evidence_hash text not null,
  verifier_evidence_hash text not null,
  activated_by_admin_user_id uuid not null references auth.users(id) on delete restrict,
  activated_at timestamptz not null default now(),
  rotated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint event_ticket_trusted_integration_credentials_version_v4102_check
    check (version_number >= 1),
  constraint event_ticket_trusted_integration_credentials_status_v4102_check
    check (credential_status in ('active','rotated','revoked')),
  constraint event_ticket_trusted_integration_credentials_hashes_v4102_check
    check (
      credential_reference_hash ~ '^[0-9a-f]{64}$'
      and verification_evidence_hash ~ '^[0-9a-f]{64}$'
      and verifier_evidence_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint event_ticket_trusted_integration_credentials_terminal_v4102_check
    check (
      (credential_status = 'active' and rotated_at is null and revoked_at is null)
      or (credential_status = 'rotated' and rotated_at is not null and revoked_at is null)
      or (credential_status = 'revoked' and revoked_at is not null)
    ),
  unique (integration_id, version_number)
);

create unique index event_ticket_trusted_integration_credentials_active_v4102_uq
  on public.event_ticket_trusted_integration_credential_versions (integration_id)
  where credential_status = 'active';

create table public.event_ticket_verified_credential_contexts (
  credential_context_id uuid primary key default gen_random_uuid(),
  credential_version_id uuid not null references public.event_ticket_trusted_integration_credential_versions(credential_version_id) on delete restrict,
  context_token_hash text not null unique,
  request_signature_hash text not null,
  verifier_evidence_hash text not null,
  context_status text not null default 'issued',
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  consumed_at timestamptz,
  consumed_receipt_id uuid references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint event_ticket_verified_credential_contexts_hashes_v4102_check
    check (
      context_token_hash ~ '^[0-9a-f]{64}$'
      and request_signature_hash ~ '^[0-9a-f]{64}$'
      and verifier_evidence_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint event_ticket_verified_credential_contexts_status_v4102_check
    check (context_status in ('issued','consumed','revoked','expired')),
  constraint event_ticket_verified_credential_contexts_validity_v4102_check
    check (
      valid_until > valid_from
      and valid_until <= valid_from + interval '15 minutes'
      and (
        (context_status = 'issued' and consumed_at is null and consumed_receipt_id is null)
        or (context_status = 'consumed' and consumed_at is not null and consumed_receipt_id is not null)
        or context_status in ('revoked','expired')
      )
    )
);

alter table public.event_ticket_trusted_integrations
  add column current_credential_version_id uuid;

alter table public.event_ticket_trusted_integrations
  add constraint event_ticket_trusted_integrations_current_credential_v4102_fk
  foreign key (current_credential_version_id)
  references public.event_ticket_trusted_integration_credential_versions(credential_version_id)
  on delete restrict;

alter table public.event_ticket_operation_receipts
  add constraint event_ticket_operation_receipts_credential_version_v4102_fk
  foreign key (credential_version_id)
  references public.event_ticket_trusted_integration_credential_versions(credential_version_id)
  on delete restrict;

alter table public.event_ticket_commercial_audit_log
  add constraint event_ticket_commercial_audit_credential_version_v4102_fk
  foreign key (credential_version_id)
  references public.event_ticket_trusted_integration_credential_versions(credential_version_id)
  on delete restrict;

alter table public.event_ticket_trusted_integration_credential_versions enable row level security;
alter table public.event_ticket_verified_credential_contexts enable row level security;

revoke all on table public.event_ticket_trusted_integration_credential_versions from public, anon, authenticated;
revoke all on table public.event_ticket_verified_credential_contexts from public, anon, authenticated;

create function public.mhidas_ticket_governance_retention_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_policy_id uuid;
  v_retention_days integer;
begin
  if new.retention_policy_version_id is null or new.retention_expires_at is null then
    select p.retention_policy_version_id, p.signal_retention_days
    into v_policy_id, v_retention_days
    from public.event_ticket_retention_policy_versions p
    where p.policy_status = 'active';

    if v_policy_id is null then
      raise exception 'GOVERNANCE_RETENTION_ACTIVE_POLICY_REQUIRED';
    end if;

    new.retention_policy_version_id := coalesce(new.retention_policy_version_id, v_policy_id);
    new.retention_expires_at := coalesce(
      new.retention_expires_at,
      new.created_at + make_interval(days => v_retention_days)
    );
  end if;

  return new;
end;
$mhidas_plpgsql$;

create trigger event_ticket_operation_receipts_retention_guard_v4102
before insert on public.event_ticket_operation_receipts
for each row execute function public.mhidas_ticket_governance_retention_guard_v1();

create trigger event_ticket_commercial_audit_retention_guard_v4102
before insert on public.event_ticket_commercial_audit_log
for each row execute function public.mhidas_ticket_governance_retention_guard_v1();

update public.event_ticket_operation_receipts r
set retention_policy_version_id = p.retention_policy_version_id,
    retention_expires_at = r.created_at + make_interval(days => p.signal_retention_days)
from public.event_ticket_retention_policy_versions p
where p.policy_status = 'active'
  and (r.retention_policy_version_id is null or r.retention_expires_at is null);

update public.event_ticket_commercial_audit_log a
set retention_policy_version_id = p.retention_policy_version_id,
    retention_expires_at = a.created_at + make_interval(days => p.signal_retention_days)
from public.event_ticket_retention_policy_versions p
where p.policy_status = 'active'
  and (a.retention_policy_version_id is null or a.retention_expires_at is null);

create function public.mhidas_ticket_write_audit_v2(
  p_target_type text,
  p_target_id uuid,
  p_parent_target_type text,
  p_parent_target_id uuid,
  p_target_key_hash text,
  p_canonical_event_id uuid,
  p_partner_id uuid,
  p_channel_id uuid,
  p_signal_id uuid,
  p_audit_action text,
  p_previous_status text,
  p_next_status text,
  p_object_version integer,
  p_before_snapshot jsonb,
  p_after_snapshot jsonb,
  p_sensitive_terms_hash text,
  p_reason text,
  p_correlation_id text,
  p_idempotency_key text,
  p_receipt_id uuid,
  p_credential_version_id uuid,
  p_verifier_evidence_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_audit_id uuid := gen_random_uuid();
  v_actor_role text := current_setting('app.mhidas_ticket_actor_role', true);
  v_actor_user_id_text text := current_setting('app.mhidas_ticket_actor_user_id', true);
  v_actor_user_id uuid;
begin
  perform public.mhidas_ticket_assert_actor_context_v1(array[
    'useclubbers_admin','verified_partner_representative','clubber',
    'automation','system','trusted_ticketing_integration'
  ]);

  if coalesce(v_actor_user_id_text, '') <> '' then
    v_actor_user_id := v_actor_user_id_text::uuid;
  end if;

  if p_target_key_hash is not null and p_target_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'TICKET_AUDIT_TARGET_KEY_HASH_INVALID';
  end if;

  insert into public.event_ticket_commercial_audit_log (
    audit_id,
    target_type,
    target_id,
    parent_target_type,
    parent_target_id,
    target_key_hash,
    canonical_event_id,
    partner_id,
    channel_id,
    signal_id,
    audit_action,
    actor_role,
    actor_user_id,
    previous_status,
    next_status,
    object_version,
    before_snapshot,
    after_snapshot,
    sensitive_terms_hash,
    reason,
    correlation_id,
    idempotency_key,
    receipt_id,
    credential_version_id,
    verifier_evidence_hash
  )
  values (
    v_audit_id,
    p_target_type,
    p_target_id,
    p_parent_target_type,
    p_parent_target_id,
    p_target_key_hash,
    p_canonical_event_id,
    p_partner_id,
    p_channel_id,
    p_signal_id,
    p_audit_action,
    v_actor_role,
    v_actor_user_id,
    p_previous_status,
    p_next_status,
    p_object_version,
    p_before_snapshot,
    p_after_snapshot,
    p_sensitive_terms_hash,
    p_reason,
    p_correlation_id,
    p_idempotency_key,
    p_receipt_id,
    p_credential_version_id,
    p_verifier_evidence_hash
  );

  return v_audit_id;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 33. ATOMIC RECEIPT AUTHORITY V4
-- =============================================================================

create function public.mhidas_ticket_reserve_operation_receipt_v4(
  p_operation_scope text,
  p_principal_type text,
  p_principal_id uuid,
  p_principal_namespace text,
  p_operation_name text,
  p_idempotency_key text,
  p_target_type text,
  p_target_id uuid,
  p_expected_lock_version integer,
  p_request_hash text,
  p_proposed_result_id uuid,
  p_result_status text,
  p_result_version integer,
  p_credential_version_id uuid,
  p_verifier_evidence_hash text,
  p_retention_policy_version_id uuid,
  p_retention_expires_at timestamptz
)
returns table (
  receipt_id uuid,
  result_id uuid,
  receipt_status text,
  reservation_owner boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_receipt public.event_ticket_operation_receipts%rowtype;
  v_inserted boolean := false;
begin
  if p_request_hash !~ '^[0-9a-f]{64}$'
    or p_verifier_evidence_hash is not null
       and p_verifier_evidence_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'ATOMIC_RECEIPT_HASH_INVALID';
  end if;

  insert into public.event_ticket_operation_receipts (
    operation_scope,
    principal_type,
    principal_id,
    principal_namespace,
    operation_name,
    idempotency_key,
    target_type,
    target_id,
    expected_lock_version,
    request_hash,
    result_id,
    result_status,
    result_version,
    result_hash,
    receipt_status,
    completed_at,
    credential_version_id,
    verifier_evidence_hash,
    retention_policy_version_id,
    retention_expires_at
  )
  values (
    p_operation_scope,
    p_principal_type,
    p_principal_id,
    p_principal_namespace,
    p_operation_name,
    p_idempotency_key,
    p_target_type,
    p_target_id,
    p_expected_lock_version,
    p_request_hash,
    p_proposed_result_id,
    p_result_status,
    p_result_version,
    encode(digest(
      p_proposed_result_id::text || ':' || p_result_status || ':' || p_request_hash,
      'sha256'
    ), 'hex'),
    'pending',
    null,
    p_credential_version_id,
    p_verifier_evidence_hash,
    p_retention_policy_version_id,
    p_retention_expires_at
  )
  on conflict (
    principal_type,
    coalesce(principal_id, '00000000-0000-0000-0000-000000000000'::uuid),
    operation_name,
    idempotency_key
  ) do nothing
  returning * into v_receipt;

  if found then
    v_inserted := true;
  else
    select * into strict v_receipt
    from public.event_ticket_operation_receipts r
    where r.principal_type = p_principal_type
      and r.principal_id is not distinct from p_principal_id
      and r.operation_name = p_operation_name
      and r.idempotency_key = p_idempotency_key
    for update;
  end if;

  if v_receipt.principal_namespace is distinct from p_principal_namespace
    or v_receipt.target_type <> p_target_type
    or v_receipt.target_id <> p_target_id
    or v_receipt.expected_lock_version is distinct from p_expected_lock_version
    or v_receipt.request_hash <> p_request_hash
    or v_receipt.credential_version_id is distinct from p_credential_version_id
    or v_receipt.verifier_evidence_hash is distinct from p_verifier_evidence_hash then
    raise exception 'IDEMPOTENCY_KEY_SEMANTIC_REUSE_DENIED';
  end if;

  if not v_inserted and v_receipt.receipt_status = 'failed' then
    raise exception 'IDEMPOTENCY_RECEIPT_PREVIOUSLY_FAILED';
  end if;

  return query
  select v_receipt.receipt_id, v_receipt.result_id, v_receipt.receipt_status, v_inserted;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_complete_operation_receipt_v2(
  p_receipt_id uuid,
  p_result_id uuid,
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
  if p_result_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'IDEMPOTENCY_RESULT_HASH_INVALID';
  end if;

  update public.event_ticket_operation_receipts r
  set result_id = p_result_id,
      result_status = p_result_status,
      result_version = p_result_version,
      result_hash = p_result_hash,
      receipt_status = 'completed',
      completed_at = now(),
      failed_at = null,
      failure_hash = null
  where r.receipt_id = p_receipt_id
    and r.receipt_status = 'pending'
  returning * into v_receipt;

  if not found then
    select * into strict v_receipt
    from public.event_ticket_operation_receipts r
    where r.receipt_id = p_receipt_id;

    if v_receipt.receipt_status <> 'completed'
      or v_receipt.result_id <> p_result_id
      or v_receipt.result_hash <> p_result_hash then
      raise exception 'IDEMPOTENCY_RECEIPT_COMPLETION_CONFLICT';
    end if;
  end if;

  return v_receipt;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_fail_operation_receipt_v1(
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
  if p_failure_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'IDEMPOTENCY_FAILURE_HASH_INVALID';
  end if;

  update public.event_ticket_operation_receipts r
  set receipt_status = 'failed',
      completed_at = null,
      failed_at = now(),
      failure_hash = p_failure_hash
  where r.receipt_id = p_receipt_id
    and r.receipt_status = 'pending'
  returning * into strict v_receipt;

  return v_receipt;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 34. CREDENTIAL-BOUND INTEGRATION IDENTITY
-- =============================================================================

create function public.mhidas_ticket_consume_verified_credential_context_v1(
  p_context_token_hash text,
  p_request_signature_hash text,
  p_receipt_id uuid
)
returns table (
  integration_id uuid,
  credential_version_id uuid,
  provider_namespace text,
  verifier_evidence_hash text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_context public.event_ticket_verified_credential_contexts%rowtype;
  v_credential public.event_ticket_trusted_integration_credential_versions%rowtype;
  v_integration public.event_ticket_trusted_integrations%rowtype;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'TRUSTED_CREDENTIAL_CONTEXT_SERVICE_ROLE_REQUIRED';
  end if;

  select * into strict v_context
  from public.event_ticket_verified_credential_contexts c
  where c.context_token_hash = p_context_token_hash
  for update;

  if v_context.request_signature_hash <> p_request_signature_hash then
    raise exception 'TRUSTED_CREDENTIAL_CONTEXT_SIGNATURE_MISMATCH';
  end if;

  if v_context.context_status = 'consumed' then
    if v_context.consumed_receipt_id is distinct from p_receipt_id then
      raise exception 'TRUSTED_CREDENTIAL_CONTEXT_ALREADY_CONSUMED';
    end if;
  elsif v_context.context_status <> 'issued'
    or v_context.valid_from > now()
    or v_context.valid_until <= now() then
    raise exception 'TRUSTED_CREDENTIAL_CONTEXT_NOT_ACTIVE';
  else
    update public.event_ticket_verified_credential_contexts c
    set context_status = 'consumed',
        consumed_at = now(),
        consumed_receipt_id = p_receipt_id
    where c.credential_context_id = v_context.credential_context_id;
  end if;

  select * into strict v_credential
  from public.event_ticket_trusted_integration_credential_versions c
  where c.credential_version_id = v_context.credential_version_id
    and c.credential_status = 'active';

  select i.* into strict v_integration
  from public.event_ticket_trusted_integrations i
  join public.commercial_partners p on p.partner_id = i.partner_id
  where i.integration_id = v_credential.integration_id
    and i.current_credential_version_id = v_credential.credential_version_id
    and i.integration_status = 'active'
    and p.partner_status = 'verified';

  return query
  select
    v_integration.integration_id,
    v_credential.credential_version_id,
    v_integration.provider_namespace,
    v_context.verifier_evidence_hash;
end;
$mhidas_plpgsql$;

create function public.mhidas_record_event_ticket_purchase_signal_v5(
  p_signal_id uuid,
  p_parent_signal_id uuid,
  p_canonical_event_id uuid,
  p_channel_id uuid,
  p_click_id uuid,
  p_user_id uuid,
  p_signal_type text,
  p_evidence_source text,
  p_credential_context_token_hash text,
  p_request_signature_hash text,
  p_transaction_hash text,
  p_evidence_hash text,
  p_signature_validation_hash text,
  p_replay_nonce_hash text,
  p_attribution_campaign_id text,
  p_gross_amount_minor bigint,
  p_commission_amount_minor bigint,
  p_currency text,
  p_idempotency_key text,
  p_metadata jsonb,
  p_correlation_id text
)
returns public.event_ticket_purchase_signals
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_signal public.event_ticket_purchase_signals%rowtype;
  v_receipt public.event_ticket_operation_receipts%rowtype;
  v_context record;
  v_effective_signal_id uuid := coalesce(p_signal_id, gen_random_uuid());
  v_request_hash text;
  v_reservation record;
  v_retention_policy_version_id uuid;
  v_retention_days integer;
begin
  if p_signal_type not in ('attributed_conversion','confirmed_conversion') then
    raise exception 'PURCHASE_SIGNAL_V5_TRUSTED_CONVERSION_ONLY';
  end if;

  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'TRUSTED_TICKETING_SERVICE_ROLE_REQUIRED';
  end if;

  select p.retention_policy_version_id, p.signal_retention_days
  into v_retention_policy_version_id, v_retention_days
  from public.mhidas_ticket_resolve_active_retention_policy_v1(
    p_signal_type,
    p_evidence_source
  ) p;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'signal_id', v_effective_signal_id,
    'parent_signal_id', p_parent_signal_id,
    'canonical_event_id', p_canonical_event_id,
    'channel_id', p_channel_id,
    'click_id', p_click_id,
    'user_id_compare', p_user_id,
    'signal_type', p_signal_type,
    'evidence_source', p_evidence_source,
    'credential_context_token_hash', p_credential_context_token_hash,
    'request_signature_hash', p_request_signature_hash,
    'transaction_hash', p_transaction_hash,
    'evidence_hash', p_evidence_hash,
    'signature_validation_hash', p_signature_validation_hash,
    'replay_nonce_hash', p_replay_nonce_hash,
    'attribution_campaign_id', p_attribution_campaign_id,
    'gross_amount_minor', p_gross_amount_minor,
    'commission_amount_minor', p_commission_amount_minor,
    'currency', p_currency,
    'metadata', coalesce(p_metadata, '{}'::jsonb)
  ));

  select * into v_reservation
  from public.mhidas_ticket_reserve_operation_receipt_v4(
    'signal_insert',
    'service_role',
    null,
    'verified_credential_context',
    'record_purchase_signal_v5',
    p_idempotency_key,
    'canonical_event',
    p_canonical_event_id,
    null,
    v_request_hash,
    v_effective_signal_id,
    p_signal_type,
    1,
    null,
    null,
    v_retention_policy_version_id,
    now() + make_interval(days => v_retention_days)
  );

  if not v_reservation.reservation_owner then
    if v_reservation.receipt_status = 'completed' then
      select * into strict v_signal
      from public.event_ticket_purchase_signals s
      where s.signal_id = v_reservation.result_id;
      return v_signal;
    end if;

    raise exception 'IDEMPOTENCY_RECEIPT_PENDING_RETRY';
  end if;

  select * into strict v_context
  from public.mhidas_ticket_consume_verified_credential_context_v1(
    p_credential_context_token_hash,
    p_request_signature_hash,
    v_reservation.receipt_id
  );

  update public.event_ticket_operation_receipts r
  set credential_version_id = v_context.credential_version_id,
      verifier_evidence_hash = v_context.verifier_evidence_hash
  where r.receipt_id = v_reservation.receipt_id
  returning * into v_receipt;

  v_signal := public.mhidas_record_event_ticket_purchase_signal_v4(
    v_effective_signal_id,
    p_parent_signal_id,
    p_canonical_event_id,
    p_channel_id,
    p_click_id,
    p_user_id,
    p_signal_type,
    p_evidence_source,
    v_context.integration_id,
    v_context.provider_namespace,
    p_transaction_hash,
    p_evidence_hash,
    p_signature_validation_hash,
    p_replay_nonce_hash,
    p_attribution_campaign_id,
    p_gross_amount_minor,
    p_commission_amount_minor,
    p_currency,
    p_idempotency_key || ':inner',
    p_metadata,
    p_correlation_id
  );

  perform public.mhidas_ticket_complete_operation_receipt_v2(
    v_receipt.receipt_id,
    v_signal.signal_id,
    v_signal.signal_type,
    1,
    encode(digest(
      v_signal.signal_id::text || ':' || v_signal.signal_type || ':' || v_request_hash,
      'sha256'
    ), 'hex')
  );

  return v_signal;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 35. CONTROLLED INTEGRATION ONBOARDING AND CREDENTIAL ROTATION
-- =============================================================================

create function public.mhidas_admin_onboard_event_ticket_trusted_integration_v1(
  p_integration_id uuid,
  p_partner_id uuid,
  p_expected_partner_lock_version integer,
  p_provider_namespace text,
  p_credential_reference_hash text,
  p_verification_evidence_hash text,
  p_verifier_evidence_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_trusted_integrations
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_partner public.commercial_partners%rowtype;
  v_integration public.event_ticket_trusted_integrations%rowtype;
  v_credential public.event_ticket_trusted_integration_credential_versions%rowtype;
  v_request_hash text;
  v_receipt record;
  v_credential_id uuid := gen_random_uuid();
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  select * into strict v_partner
  from public.commercial_partners p
  where p.partner_id = p_partner_id
  for update;

  if v_partner.partner_status <> 'verified'
    or v_partner.lock_version <> p_expected_partner_lock_version then
    raise exception 'TRUSTED_INTEGRATION_ONBOARDING_PARTNER_INVALID';
  end if;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'integration_id', p_integration_id,
    'partner_id', p_partner_id,
    'expected_partner_lock_version', p_expected_partner_lock_version,
    'provider_namespace', p_provider_namespace,
    'credential_reference_hash', p_credential_reference_hash,
    'verification_evidence_hash', p_verification_evidence_hash,
    'verifier_evidence_hash', p_verifier_evidence_hash
  ));

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v4(
    'integration_mutation',
    'user',
    v_admin_user_id,
    null,
    'onboard_trusted_integration_v1',
    p_idempotency_key,
    'trusted_integration',
    p_integration_id,
    p_expected_partner_lock_version,
    v_request_hash,
    p_integration_id,
    'active',
    1,
    null,
    null,
    null,
    null
  );

  if not v_receipt.reservation_owner then
    select * into strict v_integration
    from public.event_ticket_trusted_integrations i
    where i.integration_id = v_receipt.result_id;
    return v_integration;
  end if;

  perform set_config('app.mhidas_ticket_integration_mutation', 'on', true);
  perform set_config('app.mhidas_ticket_actor_role', 'useclubbers_admin', true);
  perform set_config('app.mhidas_ticket_actor_user_id', v_admin_user_id::text, true);

  insert into public.event_ticket_trusted_integrations (
    integration_id,
    partner_id,
    provider_namespace,
    integration_status,
    credential_reference_hash,
    verification_evidence_hash,
    verified_by_admin_user_id,
    verified_at,
    lifecycle_evidence_hash,
    lifecycle_reason_hash,
    updated_by_admin_user_id
  )
  values (
    p_integration_id,
    p_partner_id,
    p_provider_namespace,
    'active',
    p_credential_reference_hash,
    p_verification_evidence_hash,
    v_admin_user_id,
    now(),
    p_verification_evidence_hash,
    p_verifier_evidence_hash,
    v_admin_user_id
  )
  returning * into v_integration;

  insert into public.event_ticket_trusted_integration_credential_versions (
    credential_version_id,
    integration_id,
    version_number,
    credential_status,
    credential_reference_hash,
    verification_evidence_hash,
    verifier_evidence_hash,
    activated_by_admin_user_id
  )
  values (
    v_credential_id,
    v_integration.integration_id,
    1,
    'active',
    p_credential_reference_hash,
    p_verification_evidence_hash,
    p_verifier_evidence_hash,
    v_admin_user_id
  )
  returning * into v_credential;

  update public.event_ticket_trusted_integrations i
  set current_credential_version_id = v_credential.credential_version_id
  where i.integration_id = v_integration.integration_id
  returning * into v_integration;

  update public.event_ticket_operation_receipts r
  set credential_version_id = v_credential.credential_version_id,
      verifier_evidence_hash = p_verifier_evidence_hash
  where r.receipt_id = v_receipt.receipt_id;

  perform public.mhidas_ticket_write_audit_v2(
    'integration',
    v_integration.integration_id,
    'partner',
    p_partner_id,
    encode(digest(p_partner_id::text || ':' || p_provider_namespace, 'sha256'), 'hex'),
    null,
    p_partner_id,
    null,
    null,
    'trusted_integration_onboarded',
    null,
    v_integration.integration_status,
    v_integration.lock_version,
    null,
    jsonb_build_object(
      'integration_id', v_integration.integration_id,
      'credential_version_id', v_credential.credential_version_id,
      'provider_namespace', v_integration.provider_namespace
    ),
    p_verification_evidence_hash,
    'trusted integration onboarding',
    p_correlation_id,
    p_idempotency_key,
    v_receipt.receipt_id,
    v_credential.credential_version_id,
    p_verifier_evidence_hash
  );

  perform public.mhidas_ticket_complete_operation_receipt_v2(
    v_receipt.receipt_id,
    v_integration.integration_id,
    v_integration.integration_status,
    v_integration.lock_version,
    encode(digest(v_integration.integration_id::text || ':' || v_request_hash, 'sha256'), 'hex')
  );

  return v_integration;
end;
$mhidas_plpgsql$;

create function public.mhidas_admin_rotate_event_ticket_trusted_integration_credential_v1(
  p_integration_id uuid,
  p_expected_lock_version integer,
  p_credential_reference_hash text,
  p_verification_evidence_hash text,
  p_verifier_evidence_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_trusted_integration_credential_versions
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_integration public.event_ticket_trusted_integrations%rowtype;
  v_current public.event_ticket_trusted_integration_credential_versions%rowtype;
  v_new public.event_ticket_trusted_integration_credential_versions%rowtype;
  v_request_hash text;
  v_receipt record;
  v_new_id uuid := gen_random_uuid();
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  select * into strict v_integration
  from public.event_ticket_trusted_integrations i
  where i.integration_id = p_integration_id
  for update;

  if v_integration.integration_status <> 'active'
    or v_integration.lock_version <> p_expected_lock_version then
    raise exception 'TRUSTED_INTEGRATION_ROTATION_CONTEXT_INVALID';
  end if;

  select * into strict v_current
  from public.event_ticket_trusted_integration_credential_versions c
  where c.credential_version_id = v_integration.current_credential_version_id
    and c.credential_status = 'active'
  for update;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'integration_id', p_integration_id,
    'expected_lock_version', p_expected_lock_version,
    'credential_reference_hash', p_credential_reference_hash,
    'verification_evidence_hash', p_verification_evidence_hash,
    'verifier_evidence_hash', p_verifier_evidence_hash
  ));

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v4(
    'integration_mutation',
    'user',
    v_admin_user_id,
    null,
    'rotate_trusted_integration_credential_v1',
    p_idempotency_key,
    'trusted_integration',
    p_integration_id,
    p_expected_lock_version,
    v_request_hash,
    v_new_id,
    'active',
    v_current.version_number + 1,
    null,
    null,
    null,
    null
  );

  if not v_receipt.reservation_owner then
    select * into strict v_new
    from public.event_ticket_trusted_integration_credential_versions c
    where c.credential_version_id = v_receipt.result_id;
    return v_new;
  end if;

  update public.event_ticket_trusted_integration_credential_versions c
  set credential_status = 'rotated',
      rotated_at = now()
  where c.credential_version_id = v_current.credential_version_id;

  insert into public.event_ticket_trusted_integration_credential_versions (
    credential_version_id,
    integration_id,
    version_number,
    credential_status,
    credential_reference_hash,
    verification_evidence_hash,
    verifier_evidence_hash,
    activated_by_admin_user_id
  )
  values (
    v_new_id,
    p_integration_id,
    v_current.version_number + 1,
    'active',
    p_credential_reference_hash,
    p_verification_evidence_hash,
    p_verifier_evidence_hash,
    v_admin_user_id
  )
  returning * into v_new;

  update public.event_ticket_operation_receipts r
  set credential_version_id = v_new.credential_version_id,
      verifier_evidence_hash = p_verifier_evidence_hash
  where r.receipt_id = v_receipt.receipt_id;

  perform set_config('app.mhidas_ticket_integration_mutation', 'on', true);

  update public.event_ticket_trusted_integrations i
  set credential_reference_hash = p_credential_reference_hash,
      verification_evidence_hash = p_verification_evidence_hash,
      current_credential_version_id = v_new.credential_version_id,
      lifecycle_evidence_hash = p_verification_evidence_hash,
      lifecycle_reason_hash = p_verifier_evidence_hash,
      updated_by_admin_user_id = v_admin_user_id
  where i.integration_id = p_integration_id;

  perform set_config('app.mhidas_ticket_actor_role', 'useclubbers_admin', true);
  perform set_config('app.mhidas_ticket_actor_user_id', v_admin_user_id::text, true);

  perform public.mhidas_ticket_write_audit_v2(
    'integration',
    p_integration_id,
    'integration',
    p_integration_id,
    encode(digest(p_integration_id::text || ':credential', 'sha256'), 'hex'),
    null,
    v_integration.partner_id,
    null,
    null,
    'trusted_integration_credential_rotated',
    'active',
    'active',
    v_integration.lock_version + 1,
    jsonb_build_object('credential_version_id', v_current.credential_version_id),
    jsonb_build_object('credential_version_id', v_new.credential_version_id),
    p_verification_evidence_hash,
    'trusted integration credential rotation',
    p_correlation_id,
    p_idempotency_key,
    v_receipt.receipt_id,
    v_new.credential_version_id,
    p_verifier_evidence_hash
  );

  perform public.mhidas_ticket_complete_operation_receipt_v2(
    v_receipt.receipt_id,
    v_new.credential_version_id,
    v_new.credential_status,
    v_new.version_number,
    encode(digest(v_new.credential_version_id::text || ':' || v_request_hash, 'sha256'), 'hex')
  );

  return v_new;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 36. PARTNER, RETENTION AND SCOPE LIFECYCLE V2
-- =============================================================================

create function public.mhidas_admin_mutate_commercial_partner_status_v2(
  p_partner_id uuid,
  p_expected_lock_version integer,
  p_next_status text,
  p_cascade_integrations boolean,
  p_evidence_hash text,
  p_reason_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.commercial_partners
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_before public.commercial_partners%rowtype;
  v_after public.commercial_partners%rowtype;
  v_integration public.event_ticket_trusted_integrations%rowtype;
  v_scope public.event_ticket_trusted_integration_channels%rowtype;
  v_request_hash text;
  v_receipt record;
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  select * into strict v_before
  from public.commercial_partners p
  where p.partner_id = p_partner_id
  for update;

  if v_before.lock_version <> p_expected_lock_version then
    raise exception 'COMMERCIAL_PARTNER_LOCK_VERSION_MISMATCH';
  end if;

  if not (
    (v_before.partner_status = 'pending_verification' and p_next_status in ('verified','deactivated'))
    or (v_before.partner_status = 'verified' and p_next_status in ('suspended','deactivated'))
    or (v_before.partner_status = 'suspended' and p_next_status in ('verified','deactivated'))
  ) then
    raise exception 'COMMERCIAL_PARTNER_TRANSITION_INVALID';
  end if;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'partner_id', p_partner_id,
    'expected_lock_version', p_expected_lock_version,
    'previous_status', v_before.partner_status,
    'next_status', p_next_status,
    'cascade_integrations', p_cascade_integrations,
    'evidence_hash', p_evidence_hash,
    'reason_hash', p_reason_hash
  ));

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v4(
    'partner_lifecycle',
    'user',
    v_admin_user_id,
    null,
    'mutate_commercial_partner_status_v2',
    p_idempotency_key,
    'commercial_partner',
    p_partner_id,
    p_expected_lock_version,
    v_request_hash,
    p_partner_id,
    p_next_status,
    p_expected_lock_version + 1,
    null,
    null,
    null,
    null
  );

  if not v_receipt.reservation_owner then
    select * into strict v_after
    from public.commercial_partners p
    where p.partner_id = v_receipt.result_id;
    return v_after;
  end if;

  if p_next_status <> 'verified'
    and exists (
      select 1 from public.event_ticket_trusted_integrations i
      where i.partner_id = p_partner_id and i.integration_status = 'active'
    )
    and not p_cascade_integrations then
    raise exception 'PARTNER_ACTIVE_INTEGRATION_CASCADE_REQUIRED';
  end if;

  perform set_config('app.mhidas_ticket_partner_cascade', 'on', true);
  perform set_config('app.mhidas_ticket_integration_mutation', 'on', true);
  perform set_config('app.mhidas_ticket_actor_role', 'useclubbers_admin', true);
  perform set_config('app.mhidas_ticket_actor_user_id', v_admin_user_id::text, true);

  for v_scope in
    select s.*
    from public.event_ticket_trusted_integration_channels s
    join public.event_ticket_trusted_integrations i on i.integration_id = s.integration_id
    where i.partner_id = p_partner_id
      and s.authorization_status = 'active'
    for update of s
  loop
    update public.event_ticket_trusted_integration_channels s
    set authorization_status = 'suspended',
        lifecycle_evidence_hash = p_evidence_hash,
        lifecycle_reason_hash = p_reason_hash
    where s.integration_id = v_scope.integration_id
      and s.channel_id = v_scope.channel_id;

    perform public.mhidas_ticket_write_audit_v1(
      'integration_scope',
      v_scope.channel_id,
      v_scope.canonical_event_id,
      p_partner_id,
      null,
      v_scope.channel_id,
      null,
      null,
      null,
      'integration_scope_suspended_by_partner_cascade',
      v_scope.authorization_status,
      'suspended',
      v_scope.lock_version + 1,
      jsonb_build_object('integration_id', v_scope.integration_id, 'channel_id', v_scope.channel_id),
      jsonb_build_object('integration_id', v_scope.integration_id, 'channel_id', v_scope.channel_id),
      p_evidence_hash,
      'partner lifecycle cascade',
      p_correlation_id,
      p_idempotency_key || ':scope:' || v_scope.integration_id::text || ':' || v_scope.channel_id::text
    );
  end loop;

  for v_integration in
    select i.*
    from public.event_ticket_trusted_integrations i
    where i.partner_id = p_partner_id
      and i.integration_status = 'active'
    for update
  loop
    update public.event_ticket_trusted_integrations i
    set integration_status = 'suspended',
        lifecycle_evidence_hash = p_evidence_hash,
        lifecycle_reason_hash = p_reason_hash,
        updated_by_admin_user_id = v_admin_user_id,
        suspended_at = now()
    where i.integration_id = v_integration.integration_id;

    perform public.mhidas_ticket_write_audit_v1(
      'integration',
      v_integration.integration_id,
      null,
      p_partner_id,
      null,
      null,
      null,
      null,
      null,
      'integration_suspended_by_partner_cascade',
      v_integration.integration_status,
      'suspended',
      v_integration.lock_version + 1,
      jsonb_build_object('integration_id', v_integration.integration_id),
      jsonb_build_object('integration_id', v_integration.integration_id),
      p_evidence_hash,
      'partner lifecycle cascade',
      p_correlation_id,
      p_idempotency_key || ':integration:' || v_integration.integration_id::text
    );
  end loop;

  update public.commercial_partners p
  set partner_status = p_next_status,
      lock_version = p.lock_version + 1,
      updated_at = now(),
      verified_by_admin_user_id = case when p_next_status = 'verified' then v_admin_user_id else p.verified_by_admin_user_id end,
      verified_at = case when p_next_status = 'verified' then coalesce(p.verified_at, now()) else p.verified_at end,
      suspended_at = case when p_next_status = 'suspended' then now() else p.suspended_at end,
      deactivated_at = case when p_next_status = 'deactivated' then now() else p.deactivated_at end
  where p.partner_id = p_partner_id
  returning * into v_after;

  perform public.mhidas_ticket_write_audit_v1(
    'partner',
    v_after.partner_id,
    null,
    v_after.partner_id,
    null,
    null,
    null,
    null,
    null,
    'commercial_partner_status_changed_v2',
    v_before.partner_status,
    v_after.partner_status,
    v_after.lock_version,
    jsonb_build_object('status', v_before.partner_status, 'lock_version', v_before.lock_version),
    jsonb_build_object('status', v_after.partner_status, 'lock_version', v_after.lock_version),
    p_evidence_hash,
    'commercial partner lifecycle matrix',
    p_correlation_id,
    p_idempotency_key
  );

  perform public.mhidas_ticket_complete_operation_receipt_v2(
    v_receipt.receipt_id,
    v_after.partner_id,
    v_after.partner_status,
    v_after.lock_version,
    encode(digest(v_after.partner_id::text || ':' || v_request_hash, 'sha256'), 'hex')
  );

  return v_after;
end;
$mhidas_plpgsql$;

create function public.mhidas_admin_retire_event_ticket_retention_policy_v2(
  p_policy_id uuid,
  p_expected_lock_version integer,
  p_pause_dependent_channels boolean,
  p_evidence_hash text,
  p_reason_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_retention_policy_versions
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_before public.event_ticket_retention_policy_versions%rowtype;
  v_after public.event_ticket_retention_policy_versions%rowtype;
  v_channel public.event_ticket_commercial_channels%rowtype;
  v_request_hash text;
  v_receipt record;
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  select * into strict v_before
  from public.event_ticket_retention_policy_versions p
  where p.retention_policy_version_id = p_policy_id
  for update;

  if v_before.policy_status <> 'active' then
    raise exception 'RETENTION_POLICY_ACTIVE_TO_RETIRED_ONLY';
  end if;

  if v_before.lock_version <> p_expected_lock_version then
    raise exception 'RETENTION_POLICY_LOCK_VERSION_MISMATCH';
  end if;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'policy_id', p_policy_id,
    'expected_lock_version', p_expected_lock_version,
    'pause_dependent_channels', p_pause_dependent_channels,
    'evidence_hash', p_evidence_hash,
    'reason_hash', p_reason_hash
  ));

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v4(
    'retention_policy_mutation',
    'user',
    v_admin_user_id,
    null,
    'retire_retention_policy_v2',
    p_idempotency_key,
    'retention_policy',
    p_policy_id,
    p_expected_lock_version,
    v_request_hash,
    p_policy_id,
    'retired',
    p_expected_lock_version + 1,
    null,
    null,
    null,
    null
  );

  if not v_receipt.reservation_owner then
    select * into strict v_after
    from public.event_ticket_retention_policy_versions p
    where p.retention_policy_version_id = v_receipt.result_id;
    return v_after;
  end if;

  if exists (
    select 1 from public.event_ticket_commercial_channels c
    where c.retention_policy_version_id = p_policy_id
      and c.channel_status = 'active'
  ) and not p_pause_dependent_channels then
    raise exception 'RETENTION_POLICY_ACTIVE_CHANNEL_CASCADE_REQUIRED';
  end if;

  perform set_config('app.mhidas_ticket_retention_cascade', 'on', true);
  perform set_config('app.mhidas_ticket_actor_role', 'useclubbers_admin', true);
  perform set_config('app.mhidas_ticket_actor_user_id', v_admin_user_id::text, true);

  for v_channel in
    select c.*
    from public.event_ticket_commercial_channels c
    where c.retention_policy_version_id = p_policy_id
      and c.channel_status = 'active'
    for update
  loop
    update public.event_ticket_commercial_channels c
    set channel_status = 'paused',
        paused_by_admin_user_id = v_admin_user_id,
        paused_at = now(),
        updated_at = now(),
        lock_version = c.lock_version + 1
    where c.channel_id = v_channel.channel_id;

    perform public.mhidas_ticket_write_audit_v1(
      'channel',
      v_channel.channel_id,
      v_channel.canonical_event_id,
      v_channel.partner_id,
      null,
      v_channel.channel_id,
      null,
      null,
      null,
      'channel_paused_by_retention_policy_retirement',
      v_channel.channel_status,
      'paused',
      v_channel.lock_version + 1,
      jsonb_build_object('channel_status', v_channel.channel_status, 'lock_version', v_channel.lock_version),
      jsonb_build_object('channel_status', 'paused', 'lock_version', v_channel.lock_version + 1),
      p_evidence_hash,
      'retention policy cascade',
      p_correlation_id,
      p_idempotency_key || ':channel:' || v_channel.channel_id::text
    );
  end loop;

  update public.event_ticket_retention_policy_versions p
  set policy_status = 'retired',
      retired_at = now(),
      lifecycle_evidence_hash = p_evidence_hash,
      lifecycle_reason_hash = p_reason_hash
  where p.retention_policy_version_id = p_policy_id
  returning * into v_after;

  perform public.mhidas_ticket_write_audit_v1(
    'retention_policy',
    v_after.retention_policy_version_id,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'retention_policy_retired_v2',
    v_before.policy_status,
    v_after.policy_status,
    v_after.lock_version,
    jsonb_build_object('status', v_before.policy_status, 'lock_version', v_before.lock_version),
    jsonb_build_object('status', v_after.policy_status, 'lock_version', v_after.lock_version),
    p_evidence_hash,
    'active to retired lifecycle',
    p_correlation_id,
    p_idempotency_key
  );

  perform public.mhidas_ticket_complete_operation_receipt_v2(
    v_receipt.receipt_id,
    v_after.retention_policy_version_id,
    v_after.policy_status,
    v_after.lock_version,
    encode(digest(v_after.retention_policy_version_id::text || ':' || v_request_hash, 'sha256'), 'hex')
  );

  return v_after;
end;
$mhidas_plpgsql$;

create function public.mhidas_admin_create_event_ticket_trusted_integration_scope_v1(
  p_integration_id uuid,
  p_channel_id uuid,
  p_canonical_event_id uuid,
  p_evidence_hash text,
  p_reason_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_trusted_integration_channels
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_scope public.event_ticket_trusted_integration_channels%rowtype;
  v_scope_id uuid;
  v_request_hash text;
  v_receipt record;
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  if exists (
    select 1 from public.event_ticket_trusted_integration_channels s
    where s.integration_id = p_integration_id and s.channel_id = p_channel_id
  ) then
    raise exception 'TRUSTED_INTEGRATION_SCOPE_ALREADY_EXISTS';
  end if;

  v_scope_id := md5(p_integration_id::text || ':' || p_channel_id::text)::uuid;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'integration_id', p_integration_id,
    'channel_id', p_channel_id,
    'canonical_event_id', p_canonical_event_id,
    'evidence_hash', p_evidence_hash,
    'reason_hash', p_reason_hash
  ));

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v4(
    'integration_scope_mutation',
    'user',
    v_admin_user_id,
    null,
    'create_trusted_integration_scope_v1',
    p_idempotency_key,
    'trusted_integration_scope',
    v_scope_id,
    null,
    v_request_hash,
    v_scope_id,
    'active',
    0,
    null,
    null,
    null,
    null
  );

  if not v_receipt.reservation_owner then
    select * into strict v_scope
    from public.event_ticket_trusted_integration_channels s
    where s.integration_id = p_integration_id and s.channel_id = p_channel_id;
    return v_scope;
  end if;

  perform set_config('app.mhidas_ticket_integration_mutation', 'on', true);

  insert into public.event_ticket_trusted_integration_channels (
    integration_id,
    channel_id,
    canonical_event_id,
    authorization_status,
    authorization_evidence_hash,
    authorized_by_admin_user_id,
    authorized_at,
    lifecycle_evidence_hash,
    lifecycle_reason_hash
  )
  values (
    p_integration_id,
    p_channel_id,
    p_canonical_event_id,
    'active',
    p_evidence_hash,
    v_admin_user_id,
    now(),
    p_evidence_hash,
    p_reason_hash
  )
  returning * into v_scope;

  perform set_config('app.mhidas_ticket_actor_role', 'useclubbers_admin', true);
  perform set_config('app.mhidas_ticket_actor_user_id', v_admin_user_id::text, true);

  perform public.mhidas_ticket_write_audit_v2(
    'integration_scope',
    v_scope_id,
    'integration',
    p_integration_id,
    encode(digest(p_integration_id::text || ':' || p_channel_id::text, 'sha256'), 'hex'),
    p_canonical_event_id,
    null,
    p_channel_id,
    null,
    'trusted_integration_scope_created',
    null,
    v_scope.authorization_status,
    v_scope.lock_version,
    null,
    jsonb_build_object('integration_id', p_integration_id, 'channel_id', p_channel_id),
    p_evidence_hash,
    'trusted integration scope creation',
    p_correlation_id,
    p_idempotency_key,
    v_receipt.receipt_id,
    null,
    null
  );

  perform public.mhidas_ticket_complete_operation_receipt_v2(
    v_receipt.receipt_id,
    v_scope_id,
    v_scope.authorization_status,
    v_scope.lock_version,
    encode(digest(v_scope_id::text || ':' || v_request_hash, 'sha256'), 'hex')
  );

  return v_scope;
end;
$mhidas_plpgsql$;

create function public.mhidas_admin_transition_event_ticket_trusted_integration_scope_v2(
  p_operation text,
  p_integration_id uuid,
  p_channel_id uuid,
  p_expected_lock_version integer,
  p_evidence_hash text,
  p_reason_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_trusted_integration_channels
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_before public.event_ticket_trusted_integration_channels%rowtype;
  v_after public.event_ticket_trusted_integration_channels%rowtype;
  v_next_status text;
  v_scope_id uuid;
  v_request_hash text;
  v_receipt record;
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  v_next_status := case p_operation
    when 'suspend' then 'suspended'
    when 'reactivate' then 'active'
    when 'revoke' then 'revoked'
    else null
  end;

  if v_next_status is null then
    raise exception 'TRUSTED_INTEGRATION_SCOPE_TRANSITION_OPERATION_INVALID';
  end if;

  select * into strict v_before
  from public.event_ticket_trusted_integration_channels s
  where s.integration_id = p_integration_id
    and s.channel_id = p_channel_id
  for update;

  if v_before.lock_version <> p_expected_lock_version then
    raise exception 'TRUSTED_INTEGRATION_SCOPE_LOCK_VERSION_MISMATCH';
  end if;

  if not (
    (v_before.authorization_status = 'active' and v_next_status in ('suspended','revoked'))
    or (v_before.authorization_status = 'suspended' and v_next_status in ('active','revoked'))
  ) then
    raise exception 'TRUSTED_INTEGRATION_SCOPE_TRANSITION_INVALID';
  end if;

  v_scope_id := md5(p_integration_id::text || ':' || p_channel_id::text)::uuid;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'operation', p_operation,
    'integration_id', p_integration_id,
    'channel_id', p_channel_id,
    'expected_lock_version', p_expected_lock_version,
    'evidence_hash', p_evidence_hash,
    'reason_hash', p_reason_hash
  ));

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v4(
    'integration_scope_mutation',
    'user',
    v_admin_user_id,
    null,
    'transition_trusted_integration_scope_v2',
    p_idempotency_key,
    'trusted_integration_scope',
    v_scope_id,
    p_expected_lock_version,
    v_request_hash,
    v_scope_id,
    v_next_status,
    p_expected_lock_version + 1,
    null,
    null,
    null,
    null
  );

  if not v_receipt.reservation_owner then
    select * into strict v_after
    from public.event_ticket_trusted_integration_channels s
    where s.integration_id = p_integration_id and s.channel_id = p_channel_id;
    return v_after;
  end if;

  perform set_config('app.mhidas_ticket_integration_mutation', 'on', true);

  update public.event_ticket_trusted_integration_channels s
  set authorization_status = v_next_status,
      lifecycle_evidence_hash = p_evidence_hash,
      lifecycle_reason_hash = p_reason_hash,
      revoked_at = case when v_next_status = 'revoked' then now() else s.revoked_at end
  where s.integration_id = p_integration_id
    and s.channel_id = p_channel_id
  returning * into v_after;

  perform set_config('app.mhidas_ticket_actor_role', 'useclubbers_admin', true);
  perform set_config('app.mhidas_ticket_actor_user_id', v_admin_user_id::text, true);

  perform public.mhidas_ticket_write_audit_v2(
    'integration_scope',
    v_scope_id,
    'integration',
    p_integration_id,
    encode(digest(p_integration_id::text || ':' || p_channel_id::text, 'sha256'), 'hex'),
    v_after.canonical_event_id,
    null,
    p_channel_id,
    null,
    'trusted_integration_scope_' || p_operation,
    v_before.authorization_status,
    v_after.authorization_status,
    v_after.lock_version,
    jsonb_build_object('integration_id', p_integration_id, 'channel_id', p_channel_id, 'status', v_before.authorization_status),
    jsonb_build_object('integration_id', p_integration_id, 'channel_id', p_channel_id, 'status', v_after.authorization_status),
    p_evidence_hash,
    'trusted integration scope transition',
    p_correlation_id,
    p_idempotency_key,
    v_receipt.receipt_id,
    null,
    null
  );

  perform public.mhidas_ticket_complete_operation_receipt_v2(
    v_receipt.receipt_id,
    v_scope_id,
    v_after.authorization_status,
    v_after.lock_version,
    encode(digest(v_scope_id::text || ':' || v_request_hash, 'sha256'), 'hex')
  );

  return v_after;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 37. ADMIN PURCHASE-SIGNAL READ WITH PURPOSE AND AUDIT
-- =============================================================================

create function public.mhidas_admin_read_event_ticket_purchase_signals_v1(
  p_canonical_event_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_purpose text,
  p_correlation_id text
)
returns table (
  signal_id uuid,
  parent_signal_id uuid,
  canonical_event_id uuid,
  channel_id uuid,
  signal_type text,
  evidence_source text,
  integration_id uuid,
  provider_namespace text,
  transaction_hash text,
  evidence_hash text,
  signature_validation_hash text,
  gross_amount_minor bigint,
  commission_amount_minor bigint,
  currency text,
  recorded_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_count integer;
  v_response_hash text;
  v_audit_id uuid := gen_random_uuid();
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  if p_purpose not in (
    'financial_reconciliation','conversion_dispute','fraud_review',
    'partner_settlement','legal_hold_review'
  ) then
    raise exception 'ADMIN_PURCHASE_SIGNAL_READ_PURPOSE_INVALID';
  end if;

  if p_period_start is null
    or p_period_end is null
    or p_period_end <= p_period_start
    or p_period_end > now() + interval '5 minutes'
    or p_period_end - p_period_start > interval '90 days' then
    raise exception 'ADMIN_PURCHASE_SIGNAL_READ_PERIOD_INVALID';
  end if;

  select count(*), encode(digest(coalesce(string_agg(
    s.signal_id::text || ':' || s.recorded_at::text,
    ',' order by s.signal_id
  ), ''), 'sha256'), 'hex')
  into v_count, v_response_hash
  from public.event_ticket_purchase_signals s
  where s.canonical_event_id = p_canonical_event_id
    and s.recorded_at >= p_period_start
    and s.recorded_at < p_period_end;

  insert into public.event_ticket_commercial_audit_log (
    audit_id,
    target_type,
    target_id,
    canonical_event_id,
    audit_action,
    actor_role,
    actor_user_id,
    reason,
    correlation_id,
    idempotency_key,
    read_purpose,
    response_hash,
    response_row_count,
    retention_status
  )
  values (
    v_audit_id,
    'signal',
    p_canonical_event_id,
    p_canonical_event_id,
    'admin_purchase_signal_read',
    'useclubbers_admin',
    v_admin_user_id,
    'purpose-bound administrative reconciliation read',
    p_correlation_id,
    'admin-read:' || v_audit_id::text,
    p_purpose,
    v_response_hash,
    v_count,
    'active'
  );

  return query
  select
    s.signal_id,
    s.parent_signal_id,
    s.canonical_event_id,
    s.channel_id,
    s.signal_type,
    s.evidence_source,
    s.integration_id,
    s.provider_namespace,
    s.transaction_hash,
    s.evidence_hash,
    s.signature_validation_hash,
    s.gross_amount_minor,
    s.commission_amount_minor,
    s.currency,
    s.recorded_at
  from public.event_ticket_purchase_signals s
  where s.canonical_event_id = p_canonical_event_id
    and s.recorded_at >= p_period_start
    and s.recorded_at < p_period_end
  order by s.recorded_at, s.signal_id;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 38. AUDIT AND RECEIPT RETENTION BATCH
-- =============================================================================

create function public.mhidas_run_event_ticket_governance_retention_batch_v1(
  p_retention_policy_version_id uuid,
  p_batch_limit integer,
  p_correlation_id text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_request_hash text;
  v_receipt record;
  v_result_id uuid := gen_random_uuid();
  v_receipt_count integer := 0;
  v_audit_count integer := 0;
  v_report jsonb;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'GOVERNANCE_RETENTION_SERVICE_ROLE_REQUIRED';
  end if;

  if p_batch_limit < 1 or p_batch_limit > 5000 then
    raise exception 'GOVERNANCE_RETENTION_BATCH_LIMIT_INVALID';
  end if;

  if not exists (
    select 1 from public.event_ticket_retention_policy_versions p
    where p.retention_policy_version_id = p_retention_policy_version_id
      and p.policy_status = 'active'
  ) then
    raise exception 'GOVERNANCE_RETENTION_ACTIVE_POLICY_REQUIRED';
  end if;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'retention_policy_version_id', p_retention_policy_version_id,
    'batch_limit', p_batch_limit
  ));

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v4(
    'retention_run',
    'automation',
    null,
    null,
    'governance_retention_batch_v1',
    p_idempotency_key,
    'retention_policy',
    p_retention_policy_version_id,
    null,
    v_request_hash,
    v_result_id,
    'completed',
    1,
    null,
    null,
    p_retention_policy_version_id,
    now() + interval '7 years'
  );

  if not v_receipt.reservation_owner then
    return jsonb_build_object(
      'result_id', v_receipt.result_id,
      'receipt_status', v_receipt.receipt_status,
      'replayed', true
    );
  end if;

  with candidates as (
    select r.receipt_id
    from public.event_ticket_operation_receipts r
    where r.retention_status in ('active','eligible')
      and r.retention_expires_at <= now()
      and not r.legal_hold
      and not r.dispute_hold
    order by r.retention_expires_at, r.receipt_id
    limit p_batch_limit
    for update skip locked
  )
  update public.event_ticket_operation_receipts r
  set principal_id = null,
      principal_namespace = null,
      anonymized_principal_hash = encode(digest(
        r.principal_type || ':' || coalesce(r.principal_id::text, '') || ':' || r.idempotency_key,
        'sha256'
      ), 'hex'),
      retention_status = 'anonymized',
      retention_processed_at = now()
  from candidates c
  where r.receipt_id = c.receipt_id;

  get diagnostics v_receipt_count = row_count;

  with candidates as (
    select a.audit_id
    from public.event_ticket_commercial_audit_log a
    where a.retention_status in ('active','eligible')
      and a.retention_expires_at <= now()
      and not a.legal_hold
      and not a.dispute_hold
    order by a.retention_expires_at, a.audit_id
    limit greatest(p_batch_limit - v_receipt_count, 0)
    for update skip locked
  )
  update public.event_ticket_commercial_audit_log a
  set actor_user_id = null,
      before_snapshot = null,
      after_snapshot = null,
      reason = 'retained governance evidence anonymized',
      retention_status = 'anonymized',
      retention_processed_at = now()
  from candidates c
  where a.audit_id = c.audit_id;

  get diagnostics v_audit_count = row_count;

  v_report := jsonb_build_object(
    'result_id', v_result_id,
    'receipt_anonymized_count', v_receipt_count,
    'audit_anonymized_count', v_audit_count,
    'legal_and_dispute_holds_preserved', true
  );

  perform public.mhidas_ticket_complete_operation_receipt_v2(
    v_receipt.receipt_id,
    v_result_id,
    'completed',
    1,
    encode(digest(v_report::text || ':' || v_request_hash, 'sha256'), 'hex')
  );

  return v_report;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 39. EFFECTIVE PRIVILEGES, LEGACY RETIREMENT AND STATIC PREFLIGHT
-- =============================================================================

revoke all on function public.mhidas_ticket_assert_receipt_replay_v2(text,uuid,text,text,text,uuid,integer,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_ticket_write_operation_receipt_v2(text,text,uuid,text,text,text,uuid,integer,text,uuid,text,integer,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_partner_submit_ticket_partnership_request_v2(uuid,uuid,text,text,text,text,date,text,text,text,text,text,text,text,text,jsonb,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_mutate_ticket_partnership_request_v2(text,uuid,integer,text,text,text,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_admin_mutate_event_ticket_commercial_channel_v2(text,uuid,integer,jsonb,text,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_mutate_partner_official_communication_v2(text,uuid,integer,jsonb,text,text,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_record_event_ticket_purchase_signal_v2(uuid,uuid,uuid,uuid,uuid,uuid,text,text,boolean,text,text,text,text,text,text,bigint,bigint,text,timestamptz,uuid,timestamptz,text,jsonb,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_expire_event_ticket_commercial_channels_v2(integer,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_run_event_ticket_retention_batch_v2(uuid,integer,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_record_event_ticket_channel_url_validation_v2(uuid,integer,jsonb,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_admin_mutate_commercial_partner_status_v1(uuid,integer,text,boolean,text,text,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_admin_retire_event_ticket_retention_policy_v1(uuid,integer,boolean,text,text,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_admin_mutate_event_ticket_trusted_integration_scope_v1(text,uuid,uuid,uuid,integer,text,text,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_record_event_ticket_purchase_signal_v4(uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text)
  from public, anon, authenticated, service_role;

revoke all on function public.mhidas_ticket_write_audit_v2(text,uuid,text,uuid,text,uuid,uuid,uuid,uuid,text,text,text,integer,jsonb,jsonb,text,text,text,text,uuid,uuid,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_reserve_operation_receipt_v4(text,text,uuid,text,text,text,text,uuid,integer,text,uuid,text,integer,uuid,text,uuid,timestamptz)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_complete_operation_receipt_v2(uuid,uuid,text,integer,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_fail_operation_receipt_v1(uuid,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_consume_verified_credential_context_v1(text,text,uuid)
  from public, anon, authenticated;
revoke all on function public.mhidas_record_event_ticket_purchase_signal_v5(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_admin_onboard_event_ticket_trusted_integration_v1(uuid,uuid,integer,text,text,text,text,text,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_admin_rotate_event_ticket_trusted_integration_credential_v1(uuid,integer,text,text,text,text,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_admin_mutate_commercial_partner_status_v2(uuid,integer,text,boolean,text,text,text,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_admin_retire_event_ticket_retention_policy_v2(uuid,integer,boolean,text,text,text,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_admin_create_event_ticket_trusted_integration_scope_v1(uuid,uuid,uuid,text,text,text,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_admin_transition_event_ticket_trusted_integration_scope_v2(text,uuid,uuid,integer,text,text,text,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_admin_read_event_ticket_purchase_signals_v1(uuid,timestamptz,timestamptz,text,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_run_event_ticket_governance_retention_batch_v1(uuid,integer,text,text)
  from public, anon, authenticated;

grant execute on function public.mhidas_record_event_ticket_purchase_signal_v5(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text)
  to service_role;
grant execute on function public.mhidas_admin_onboard_event_ticket_trusted_integration_v1(uuid,uuid,integer,text,text,text,text,text,text)
  to authenticated;
grant execute on function public.mhidas_admin_rotate_event_ticket_trusted_integration_credential_v1(uuid,integer,text,text,text,text,text)
  to authenticated;
grant execute on function public.mhidas_admin_mutate_commercial_partner_status_v2(uuid,integer,text,boolean,text,text,text,text)
  to authenticated;
grant execute on function public.mhidas_admin_retire_event_ticket_retention_policy_v2(uuid,integer,boolean,text,text,text,text)
  to authenticated;
grant execute on function public.mhidas_admin_create_event_ticket_trusted_integration_scope_v1(uuid,uuid,uuid,text,text,text,text)
  to authenticated;
grant execute on function public.mhidas_admin_transition_event_ticket_trusted_integration_scope_v2(text,uuid,uuid,integer,text,text,text,text)
  to authenticated;
grant execute on function public.mhidas_admin_read_event_ticket_purchase_signals_v1(uuid,timestamptz,timestamptz,text,text)
  to authenticated;
grant execute on function public.mhidas_run_event_ticket_governance_retention_batch_v1(uuid,integer,text,text)
  to service_role;

do $mhidas_v4102_legacy_grant_preflight$
declare
  v_exposed integer;
begin
  select count(*) into v_exposed
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and (
      p.prosrc ilike '%mhidas_ticket_assert_receipt_replay_v2%'
      or p.prosrc ilike '%mhidas_ticket_write_operation_receipt_v2%'
    )
    and (
      has_function_privilege('authenticated', p.oid, 'EXECUTE')
      or has_function_privilege('service_role', p.oid, 'EXECUTE')
      or has_function_privilege('anon', p.oid, 'EXECUTE')
    );

  if v_exposed <> 0 then
    raise exception 'LEGACY_NON_ATOMIC_RPC_REMAINS_EXPOSED: %', v_exposed;
  end if;
end;
$mhidas_v4102_legacy_grant_preflight$;

create temporary table mhidas_v4102_sixth_adjustment_evidence (
  adjustment_key text primary key,
  correction_status text not null,
  evidence_items text[] not null,
  promotion_blocked boolean not null
) on commit drop;

insert into mhidas_v4102_sixth_adjustment_evidence (
  adjustment_key,
  correction_status,
  evidence_items,
  promotion_blocked
)
values
(
  'legacy_idempotency_paths_remain_non_atomic',
  'corrected_in_protected_draft',
  array['v2 grants revoked','atomic receipt v4','grant introspection preflight'],
  true
),
(
  'trusted_integration_identity_not_credential_bound',
  'corrected_in_protected_draft',
  array['credential versions','single-use server context','purchase signal v5 derives identity'],
  true
),
(
  'partner_lifecycle_not_idempotent_or_transition_constrained',
  'corrected_in_protected_draft',
  array['partner lifecycle v2','explicit transition matrix','atomic receipt and snapshots'],
  true
),
(
  'retention_retirement_not_idempotent_or_state_guarded',
  'corrected_in_protected_draft',
  array['active to retired only','atomic receipt','channel cascade rollback'],
  true
),
(
  'cascade_mutations_lack_per_object_audit',
  'corrected_in_protected_draft',
  array['scope audit loop','integration audit loop','channel audit loop'],
  true
),
(
  'trusted_integration_onboarding_and_rotation_path_missing',
  'corrected_in_protected_draft',
  array['admin onboarding','credential version history','atomic rotation'],
  true
),
(
  'integration_scope_terminal_insert_and_audit_identity_ambiguous',
  'corrected_in_protected_draft',
  array['create only active','transition requires existing row','deterministic composite scope id'],
  true
),
(
  'admin_full_purchase_signal_read_path_missing',
  'corrected_in_protected_draft',
  array['purpose allowlist','event and period scope','append-only read audit'],
  true
),
(
  'audit_and_receipt_retention_contract_missing',
  'corrected_in_protected_draft',
  array['retention columns','legal and dispute holds','server-resolved anonymization batch'],
  true
);

do $mhidas_v4102_sixth_adjustment_self_check$
declare
  v_count integer;
  v_unblocked integer;
begin
  select count(*) into v_count
  from mhidas_v4102_sixth_adjustment_evidence;

  select count(*) into v_unblocked
  from mhidas_v4102_sixth_adjustment_evidence
  where promotion_blocked = false;

  if v_count <> 9 then
    raise exception 'SIXTH_ADJUSTMENT_EVIDENCE_COUNT_MISMATCH: %', v_count;
  end if;

  if v_unblocked <> 0 then
    raise exception 'FOURTH_CORRECTED_DRAFT_PROMOTION_MUST_REMAIN_BLOCKED';
  end if;

  if to_regclass('public.event_ticket_trusted_integration_credential_versions') is null
    or to_regclass('public.event_ticket_verified_credential_contexts') is null then
    raise exception 'V4_8_102_CREDENTIAL_REGISTRY_MISSING';
  end if;

  if to_regprocedure('public.mhidas_record_event_ticket_purchase_signal_v5(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text)') is null
    or to_regprocedure('public.mhidas_admin_mutate_commercial_partner_status_v2(uuid,integer,text,boolean,text,text,text,text)') is null
    or to_regprocedure('public.mhidas_admin_retire_event_ticket_retention_policy_v2(uuid,integer,boolean,text,text,text,text)') is null
    or to_regprocedure('public.mhidas_admin_read_event_ticket_purchase_signals_v1(uuid,timestamptz,timestamptz,text,text)') is null
    or to_regprocedure('public.mhidas_run_event_ticket_governance_retention_batch_v1(uuid,integer,text,text)') is null then
    raise exception 'V4_8_102_REQUIRED_RPC_MISSING';
  end if;
end;
$mhidas_v4102_sixth_adjustment_self_check$;

-- =============================================================================
-- 40. SEVENTH CORRECTION LAYER FOR THE EIGHT V4.8.103 BLOCKERS
-- =============================================================================

-- 40.1 Deterministic retention dimensions and class-specific periods.

drop index public.event_ticket_retention_policy_one_active_v490_uq;

alter table public.event_ticket_retention_policy_versions
  add column policy_purpose text,
  add column jurisdiction_code text,
  add column evidence_class text,
  add column receipt_retention_days integer,
  add column audit_retention_days integer;

update public.event_ticket_retention_policy_versions
set policy_purpose = 'commercial_governance',
    jurisdiction_code = 'BR',
    evidence_class = 'default',
    receipt_retention_days = signal_retention_days,
    audit_retention_days = signal_retention_days;

alter table public.event_ticket_retention_policy_versions
  alter column policy_purpose set not null,
  alter column jurisdiction_code set not null,
  alter column evidence_class set not null,
  alter column receipt_retention_days set not null,
  alter column audit_retention_days set not null,
  add constraint event_ticket_retention_policy_dimensions_v4104_check
  check (
    policy_purpose in ('commercial_governance','purchase_evidence','financial_reconciliation','security_audit')
    and jurisdiction_code ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$'
    and evidence_class in ('default','operation_receipt','commercial_audit','trusted_purchase_signal')
  ),
  add constraint event_ticket_retention_policy_class_days_v4104_check
  check (
    receipt_retention_days between 1 and 3650
    and audit_retention_days between 1 and 3650
  );

create unique index event_ticket_retention_policy_active_dimension_v4104_uq
  on public.event_ticket_retention_policy_versions (
    policy_purpose,
    jurisdiction_code,
    evidence_class
  )
  where policy_status = 'active';

create function public.mhidas_ticket_resolve_retention_policy_v2(
  p_policy_purpose text,
  p_jurisdiction_code text,
  p_evidence_class text
)
returns table (
  retention_policy_version_id uuid,
  retention_days integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $mhidas_sql$
  select
    p.retention_policy_version_id,
    case p_evidence_class
      when 'operation_receipt' then p.receipt_retention_days
      when 'commercial_audit' then p.audit_retention_days
      else p.signal_retention_days
    end
  from public.event_ticket_retention_policy_versions p
  where p.policy_status = 'active'
    and p.policy_purpose = p_policy_purpose
    and p.jurisdiction_code = p_jurisdiction_code
    and p.evidence_class = p_evidence_class;
$mhidas_sql$;

create function public.mhidas_ticket_operation_receipt_retention_guard_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_policy record;
begin
  select * into strict v_policy
  from public.mhidas_ticket_resolve_retention_policy_v2(
    'commercial_governance',
    'BR',
    'operation_receipt'
  );

  if new.retention_policy_version_id is null then
    new.retention_policy_version_id := v_policy.retention_policy_version_id;
  elsif new.retention_policy_version_id <> v_policy.retention_policy_version_id then
    raise exception 'OPERATION_RECEIPT_RETENTION_POLICY_MISMATCH';
  end if;

  new.retention_expires_at := coalesce(
    new.retention_expires_at,
    new.created_at + make_interval(days => v_policy.retention_days)
  );

  return new;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_commercial_audit_retention_guard_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_policy record;
begin
  select * into strict v_policy
  from public.mhidas_ticket_resolve_retention_policy_v2(
    'security_audit',
    'BR',
    'commercial_audit'
  );

  if new.retention_policy_version_id is null then
    new.retention_policy_version_id := v_policy.retention_policy_version_id;
  elsif new.retention_policy_version_id <> v_policy.retention_policy_version_id then
    raise exception 'COMMERCIAL_AUDIT_RETENTION_POLICY_MISMATCH';
  end if;

  new.retention_expires_at := coalesce(
    new.retention_expires_at,
    new.created_at + make_interval(days => v_policy.retention_days)
  );

  return new;
end;
$mhidas_plpgsql$;

drop trigger event_ticket_operation_receipts_retention_guard_v4102
  on public.event_ticket_operation_receipts;

drop trigger event_ticket_commercial_audit_retention_guard_v4102
  on public.event_ticket_commercial_audit_log;

create trigger event_ticket_operation_receipts_retention_guard_v4104
before insert on public.event_ticket_operation_receipts
for each row execute function public.mhidas_ticket_operation_receipt_retention_guard_v2();

create trigger event_ticket_commercial_audit_retention_guard_v4104
before insert on public.event_ticket_commercial_audit_log
for each row execute function public.mhidas_ticket_commercial_audit_retention_guard_v2();

-- =============================================================================
-- 41. SERVER-SIDE CREDENTIAL CONTEXT ISSUANCE, REVOCATION AND EXPIRY
-- =============================================================================

alter table public.event_ticket_verified_credential_contexts
  add column issuer_service_key text,
  add column issuance_request_hash text,
  add column issuance_nonce_hash text,
  add column issued_by_verifier_key_hash text,
  add column revoked_at timestamptz,
  add column revocation_reason_hash text,
  add column expired_at timestamptz;

alter table public.event_ticket_verified_credential_contexts
  add constraint event_ticket_verified_context_issuance_hashes_v4104_check
  check (
    issuer_service_key is null
    or (
      issuer_service_key ~ '^[a-z0-9][a-z0-9._-]{2,80}$'
      and issuance_request_hash ~ '^[0-9a-f]{64}$'
      and issuance_nonce_hash ~ '^[0-9a-f]{64}$'
      and issued_by_verifier_key_hash ~ '^[0-9a-f]{64}$'
    )
  ),
  add constraint event_ticket_verified_context_terminal_timestamps_v4104_check
  check (
    (context_status <> 'revoked' or revoked_at is not null)
    and (context_status <> 'expired' or expired_at is not null)
    and (revocation_reason_hash is null or revocation_reason_hash ~ '^[0-9a-f]{64}$')
  );

create unique index event_ticket_verified_context_nonce_v4104_uq
  on public.event_ticket_verified_credential_contexts (
    credential_version_id,
    issuance_nonce_hash
  )
  where issuance_nonce_hash is not null;

create function public.mhidas_ticket_issue_verified_credential_context_v1(
  p_credential_version_id uuid,
  p_context_token_hash text,
  p_request_signature_hash text,
  p_issuance_request_hash text,
  p_issuance_nonce_hash text,
  p_verifier_evidence_hash text,
  p_issuer_service_key text,
  p_issued_by_verifier_key_hash text,
  p_valid_for_seconds integer
)
returns public.event_ticket_verified_credential_contexts
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_context public.event_ticket_verified_credential_contexts%rowtype;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'VERIFIED_CONTEXT_ISSUANCE_SERVICE_ROLE_REQUIRED';
  end if;

  if p_valid_for_seconds < 30 or p_valid_for_seconds > 900 then
    raise exception 'VERIFIED_CONTEXT_VALIDITY_INVALID';
  end if;

  if p_context_token_hash !~ '^[0-9a-f]{64}$'
    or p_request_signature_hash !~ '^[0-9a-f]{64}$'
    or p_issuance_request_hash !~ '^[0-9a-f]{64}$'
    or p_issuance_nonce_hash !~ '^[0-9a-f]{64}$'
    or p_verifier_evidence_hash !~ '^[0-9a-f]{64}$'
    or p_issued_by_verifier_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'VERIFIED_CONTEXT_ISSUANCE_HASH_INVALID';
  end if;

  perform 1
  from public.event_ticket_trusted_integration_credential_versions c
  join public.event_ticket_trusted_integrations i
    on i.integration_id = c.integration_id
   and i.current_credential_version_id = c.credential_version_id
  join public.commercial_partners p on p.partner_id = i.partner_id
  where c.credential_version_id = p_credential_version_id
    and c.credential_status = 'active'
    and i.integration_status = 'active'
    and p.partner_status = 'verified'
  for update of c, i;

  if not found then
    raise exception 'VERIFIED_CONTEXT_ACTIVE_CREDENTIAL_REQUIRED';
  end if;

  update public.event_ticket_verified_credential_contexts c
  set context_status = 'revoked',
      revoked_at = now(),
      revocation_reason_hash = encode(digest('superseded:' || p_issuance_request_hash, 'sha256'), 'hex')
  where c.credential_version_id = p_credential_version_id
    and c.context_status = 'issued'
    and c.issuance_request_hash = p_issuance_request_hash;

  insert into public.event_ticket_verified_credential_contexts (
    credential_version_id,
    context_token_hash,
    request_signature_hash,
    verifier_evidence_hash,
    context_status,
    valid_from,
    valid_until,
    issuer_service_key,
    issuance_request_hash,
    issuance_nonce_hash,
    issued_by_verifier_key_hash
  )
  values (
    p_credential_version_id,
    p_context_token_hash,
    p_request_signature_hash,
    p_verifier_evidence_hash,
    'issued',
    now(),
    now() + make_interval(secs => p_valid_for_seconds),
    p_issuer_service_key,
    p_issuance_request_hash,
    p_issuance_nonce_hash,
    p_issued_by_verifier_key_hash
  )
  returning * into v_context;

  return v_context;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_revoke_verified_credential_context_v1(
  p_context_token_hash text,
  p_revocation_reason_hash text
)
returns public.event_ticket_verified_credential_contexts
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_context public.event_ticket_verified_credential_contexts%rowtype;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'VERIFIED_CONTEXT_REVOCATION_SERVICE_ROLE_REQUIRED';
  end if;

  if p_revocation_reason_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'VERIFIED_CONTEXT_REVOCATION_HASH_INVALID';
  end if;

  update public.event_ticket_verified_credential_contexts c
  set context_status = 'revoked',
      revoked_at = coalesce(c.revoked_at, now()),
      revocation_reason_hash = p_revocation_reason_hash
  where c.context_token_hash = p_context_token_hash
    and c.context_status = 'issued'
  returning * into v_context;

  if not found then
    select * into strict v_context
    from public.event_ticket_verified_credential_contexts c
    where c.context_token_hash = p_context_token_hash;

    if v_context.context_status <> 'revoked'
      or v_context.revocation_reason_hash <> p_revocation_reason_hash then
      raise exception 'VERIFIED_CONTEXT_REVOCATION_CONFLICT';
    end if;
  end if;

  return v_context;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_expire_verified_credential_contexts_v1(
  p_batch_limit integer
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_count integer;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'VERIFIED_CONTEXT_EXPIRY_SERVICE_ROLE_REQUIRED';
  end if;

  if p_batch_limit < 1 or p_batch_limit > 5000 then
    raise exception 'VERIFIED_CONTEXT_EXPIRY_BATCH_INVALID';
  end if;

  with candidates as (
    select c.credential_context_id
    from public.event_ticket_verified_credential_contexts c
    where c.context_status = 'issued'
      and c.valid_until <= now()
    order by c.valid_until, c.credential_context_id
    limit p_batch_limit
    for update skip locked
  )
  update public.event_ticket_verified_credential_contexts c
  set context_status = 'expired',
      expired_at = now()
  from candidates x
  where c.credential_context_id = x.credential_context_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 42. COMPOSITE CREDENTIAL INTEGRITY
-- =============================================================================

alter table public.event_ticket_trusted_integration_credential_versions
  add constraint event_ticket_credential_integration_pair_v4104_uq
  unique (integration_id, credential_version_id);

alter table public.event_ticket_trusted_integrations
  add constraint event_ticket_current_credential_integration_pair_v4104_fk
  foreign key (integration_id, current_credential_version_id)
  references public.event_ticket_trusted_integration_credential_versions (
    integration_id,
    credential_version_id
  )
  on delete restrict;

alter table public.event_ticket_operation_receipts
  add column integration_id uuid;

update public.event_ticket_operation_receipts r
set integration_id = c.integration_id
from public.event_ticket_trusted_integration_credential_versions c
where r.credential_version_id = c.credential_version_id
  and r.integration_id is null;

alter table public.event_ticket_operation_receipts
  add constraint event_ticket_receipt_credential_integration_pair_v4104_fk
  foreign key (integration_id, credential_version_id)
  references public.event_ticket_trusted_integration_credential_versions (
    integration_id,
    credential_version_id
  )
  on delete restrict,
  add constraint event_ticket_receipt_credential_pair_presence_v4104_check
  check (
    (integration_id is null and credential_version_id is null)
    or (integration_id is not null and credential_version_id is not null)
  );

alter table public.event_ticket_commercial_audit_log
  add column integration_id uuid;

update public.event_ticket_commercial_audit_log a
set integration_id = c.integration_id
from public.event_ticket_trusted_integration_credential_versions c
where a.credential_version_id = c.credential_version_id
  and a.integration_id is null;

alter table public.event_ticket_commercial_audit_log
  add constraint event_ticket_audit_credential_integration_pair_v4104_fk
  foreign key (integration_id, credential_version_id)
  references public.event_ticket_trusted_integration_credential_versions (
    integration_id,
    credential_version_id
  )
  on delete restrict;

-- =============================================================================
-- 43. CREDENTIAL-BOUND SIGNAL RESERVATION AND REPLAY
-- =============================================================================

create function public.mhidas_ticket_lock_verified_credential_context_v2(
  p_context_token_hash text,
  p_request_signature_hash text
)
returns table (
  credential_context_id uuid,
  integration_id uuid,
  credential_version_id uuid,
  provider_namespace text,
  verifier_evidence_hash text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_context public.event_ticket_verified_credential_contexts%rowtype;
  v_credential public.event_ticket_trusted_integration_credential_versions%rowtype;
  v_integration public.event_ticket_trusted_integrations%rowtype;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'TRUSTED_CONTEXT_LOCK_SERVICE_ROLE_REQUIRED';
  end if;

  select * into strict v_context
  from public.event_ticket_verified_credential_contexts c
  where c.context_token_hash = p_context_token_hash
  for update;

  if v_context.request_signature_hash <> p_request_signature_hash
    or v_context.context_status not in ('issued','consumed')
    or v_context.valid_from > now()
    or v_context.valid_until <= now() then
    raise exception 'TRUSTED_CONTEXT_LOCK_VALIDATION_FAILED';
  end if;

  select * into strict v_credential
  from public.event_ticket_trusted_integration_credential_versions c
  where c.credential_version_id = v_context.credential_version_id
    and c.credential_status = 'active';

  select i.* into strict v_integration
  from public.event_ticket_trusted_integrations i
  join public.commercial_partners p on p.partner_id = i.partner_id
  where i.integration_id = v_credential.integration_id
    and i.current_credential_version_id = v_credential.credential_version_id
    and i.integration_status = 'active'
    and p.partner_status = 'verified';

  return query
  select
    v_context.credential_context_id,
    v_integration.integration_id,
    v_credential.credential_version_id,
    v_integration.provider_namespace,
    v_context.verifier_evidence_hash;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_consume_verified_credential_context_v2(
  p_credential_context_id uuid,
  p_expected_credential_version_id uuid,
  p_expected_verifier_evidence_hash text,
  p_receipt_id uuid
)
returns public.event_ticket_verified_credential_contexts
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_context public.event_ticket_verified_credential_contexts%rowtype;
begin
  select * into strict v_context
  from public.event_ticket_verified_credential_contexts c
  where c.credential_context_id = p_credential_context_id
  for update;

  if v_context.credential_version_id <> p_expected_credential_version_id
    or v_context.verifier_evidence_hash <> p_expected_verifier_evidence_hash then
    raise exception 'TRUSTED_CONTEXT_EXPECTATION_MISMATCH';
  end if;

  if v_context.context_status = 'consumed' then
    if v_context.consumed_receipt_id <> p_receipt_id then
      raise exception 'TRUSTED_CONTEXT_ALREADY_CONSUMED';
    end if;
    return v_context;
  end if;

  if v_context.context_status <> 'issued'
    or v_context.valid_from > now()
    or v_context.valid_until <= now() then
    raise exception 'TRUSTED_CONTEXT_NOT_CONSUMABLE';
  end if;

  update public.event_ticket_verified_credential_contexts c
  set context_status = 'consumed',
      consumed_at = now(),
      consumed_receipt_id = p_receipt_id
  where c.credential_context_id = v_context.credential_context_id
  returning * into v_context;

  return v_context;
end;
$mhidas_plpgsql$;

create function public.mhidas_record_event_ticket_purchase_signal_v6(
  p_signal_id uuid,
  p_parent_signal_id uuid,
  p_canonical_event_id uuid,
  p_channel_id uuid,
  p_click_id uuid,
  p_user_id uuid,
  p_signal_type text,
  p_evidence_source text,
  p_credential_context_token_hash text,
  p_request_signature_hash text,
  p_transaction_hash text,
  p_evidence_hash text,
  p_signature_validation_hash text,
  p_replay_nonce_hash text,
  p_attribution_campaign_id text,
  p_gross_amount_minor bigint,
  p_commission_amount_minor bigint,
  p_currency text,
  p_idempotency_key text,
  p_metadata jsonb,
  p_correlation_id text
)
returns public.event_ticket_purchase_signals
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_context record;
  v_reservation record;
  v_signal public.event_ticket_purchase_signals%rowtype;
  v_effective_signal_id uuid := coalesce(p_signal_id, gen_random_uuid());
  v_request_hash text;
  v_retention record;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'TRUSTED_SIGNAL_V6_SERVICE_ROLE_REQUIRED';
  end if;

  select * into strict v_context
  from public.mhidas_ticket_lock_verified_credential_context_v2(
    p_credential_context_token_hash,
    p_request_signature_hash
  );

  select * into strict v_retention
  from public.mhidas_ticket_resolve_retention_policy_v2(
    'purchase_evidence',
    'BR',
    'trusted_purchase_signal'
  );

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'signal_id', v_effective_signal_id,
    'parent_signal_id', p_parent_signal_id,
    'canonical_event_id', p_canonical_event_id,
    'channel_id', p_channel_id,
    'click_id', p_click_id,
    'user_id_compare', p_user_id,
    'signal_type', p_signal_type,
    'evidence_source', p_evidence_source,
    'credential_version_id', v_context.credential_version_id,
    'verifier_evidence_hash', v_context.verifier_evidence_hash,
    'request_signature_hash', p_request_signature_hash,
    'transaction_hash', p_transaction_hash,
    'evidence_hash', p_evidence_hash,
    'signature_validation_hash', p_signature_validation_hash,
    'replay_nonce_hash', p_replay_nonce_hash,
    'attribution_campaign_id', p_attribution_campaign_id,
    'gross_amount_minor', p_gross_amount_minor,
    'commission_amount_minor', p_commission_amount_minor,
    'currency', p_currency,
    'metadata', coalesce(p_metadata, '{}'::jsonb)
  ));

  select * into v_reservation
  from public.mhidas_ticket_reserve_operation_receipt_v4(
    'signal_insert',
    'service_role',
    null,
    v_context.provider_namespace,
    'record_purchase_signal_v6',
    p_idempotency_key,
    'canonical_event',
    p_canonical_event_id,
    null,
    v_request_hash,
    v_effective_signal_id,
    p_signal_type,
    1,
    v_context.credential_version_id,
    v_context.verifier_evidence_hash,
    v_retention.retention_policy_version_id,
    now() + make_interval(days => v_retention.retention_days)
  );

  update public.event_ticket_operation_receipts r
  set integration_id = v_context.integration_id
  where r.receipt_id = v_reservation.receipt_id
    and r.integration_id is null;

  perform public.mhidas_ticket_consume_verified_credential_context_v2(
    v_context.credential_context_id,
    v_context.credential_version_id,
    v_context.verifier_evidence_hash,
    v_reservation.receipt_id
  );

  if not v_reservation.reservation_owner then
    if v_reservation.receipt_status = 'completed' then
      select * into strict v_signal
      from public.event_ticket_purchase_signals s
      where s.signal_id = v_reservation.result_id
        and s.integration_id = v_context.integration_id
        and s.provider_namespace = v_context.provider_namespace;
      return v_signal;
    end if;

    raise exception 'IDEMPOTENCY_RECEIPT_PENDING_RETRY';
  end if;

  v_signal := public.mhidas_record_event_ticket_purchase_signal_v4(
    v_effective_signal_id,
    p_parent_signal_id,
    p_canonical_event_id,
    p_channel_id,
    p_click_id,
    p_user_id,
    p_signal_type,
    p_evidence_source,
    v_context.integration_id,
    v_context.provider_namespace,
    p_transaction_hash,
    p_evidence_hash,
    p_signature_validation_hash,
    p_replay_nonce_hash,
    p_attribution_campaign_id,
    p_gross_amount_minor,
    p_commission_amount_minor,
    p_currency,
    p_idempotency_key || ':inner',
    p_metadata,
    p_correlation_id
  );

  perform public.mhidas_ticket_complete_operation_receipt_v2(
    v_reservation.receipt_id,
    v_signal.signal_id,
    v_signal.signal_type,
    1,
    encode(digest(v_signal.signal_id::text || ':' || v_request_hash, 'sha256'), 'hex')
  );

  return v_signal;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 44. RECEIPT-LINKED CASCADE AUDIT AUTHORITY
-- =============================================================================

create function public.mhidas_ticket_write_cascade_audit_v3(
  p_target_type text,
  p_target_id uuid,
  p_parent_target_type text,
  p_parent_target_id uuid,
  p_target_key_hash text,
  p_canonical_event_id uuid,
  p_partner_id uuid,
  p_channel_id uuid,
  p_audit_action text,
  p_previous_status text,
  p_next_status text,
  p_object_version integer,
  p_before_snapshot jsonb,
  p_after_snapshot jsonb,
  p_sensitive_terms_hash text,
  p_reason text,
  p_correlation_id text,
  p_idempotency_key text,
  p_receipt_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_receipt public.event_ticket_operation_receipts%rowtype;
begin
  select * into strict v_receipt
  from public.event_ticket_operation_receipts r
  where r.receipt_id = p_receipt_id
  for share;

  if v_receipt.receipt_status not in ('pending','completed') then
    raise exception 'CASCADE_AUDIT_RECEIPT_STATE_INVALID';
  end if;

  return public.mhidas_ticket_write_audit_v2(
    p_target_type,
    p_target_id,
    p_parent_target_type,
    p_parent_target_id,
    p_target_key_hash,
    p_canonical_event_id,
    p_partner_id,
    p_channel_id,
    null,
    p_audit_action,
    p_previous_status,
    p_next_status,
    p_object_version,
    p_before_snapshot,
    p_after_snapshot,
    p_sensitive_terms_hash,
    p_reason,
    p_correlation_id,
    p_idempotency_key,
    p_receipt_id,
    v_receipt.credential_version_id,
    v_receipt.verifier_evidence_hash
  );
end;
$mhidas_plpgsql$;

revoke all on function public.mhidas_admin_mutate_commercial_partner_status_v2(uuid,integer,text,boolean,text,text,text,text)
  from public, anon, authenticated, service_role;

revoke all on function public.mhidas_admin_retire_event_ticket_retention_policy_v2(uuid,integer,boolean,text,text,text,text)
  from public, anon, authenticated, service_role;

-- New cascade-capable administrative RPCs must call mhidas_ticket_write_cascade_audit_v3
-- for every mutated integration, scope, channel, policy and parent object.

-- =============================================================================
-- 45. SINGLE-SNAPSHOT ADMINISTRATIVE SIGNAL READ
-- =============================================================================

create function public.mhidas_admin_read_event_ticket_purchase_signals_v2(
  p_canonical_event_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_purpose text,
  p_correlation_id text
)
returns table (
  signal_id uuid,
  parent_signal_id uuid,
  canonical_event_id uuid,
  channel_id uuid,
  signal_type text,
  evidence_source text,
  integration_id uuid,
  provider_namespace text,
  transaction_hash text,
  evidence_hash text,
  signature_validation_hash text,
  gross_amount_minor bigint,
  commission_amount_minor bigint,
  currency text,
  recorded_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_audit_id uuid := gen_random_uuid();
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  if p_purpose not in (
    'financial_reconciliation','conversion_dispute','fraud_review',
    'partner_settlement','legal_hold_review'
  ) then
    raise exception 'ADMIN_PURCHASE_SIGNAL_READ_PURPOSE_INVALID';
  end if;

  if p_period_start is null
    or p_period_end is null
    or p_period_end <= p_period_start
    or p_period_end > now() + interval '5 minutes'
    or p_period_end - p_period_start > interval '90 days' then
    raise exception 'ADMIN_PURCHASE_SIGNAL_READ_PERIOD_INVALID';
  end if;

  return query
  with selected_rows as materialized (
    select
      s.signal_id,
      s.parent_signal_id,
      s.canonical_event_id,
      s.channel_id,
      s.signal_type,
      s.evidence_source,
      s.integration_id,
      s.provider_namespace,
      s.transaction_hash,
      s.evidence_hash,
      s.signature_validation_hash,
      s.gross_amount_minor,
      s.commission_amount_minor,
      s.currency,
      s.recorded_at
    from public.event_ticket_purchase_signals s
    where s.canonical_event_id = p_canonical_event_id
      and s.recorded_at >= p_period_start
      and s.recorded_at < p_period_end
    order by s.recorded_at, s.signal_id
  ),
  audit_row as (
    insert into public.event_ticket_commercial_audit_log (
      audit_id,
      target_type,
      target_id,
      canonical_event_id,
      audit_action,
      actor_role,
      actor_user_id,
      reason,
      correlation_id,
      idempotency_key,
      read_purpose,
      response_hash,
      response_row_count,
      retention_status
    )
    select
      v_audit_id,
      'signal',
      p_canonical_event_id,
      p_canonical_event_id,
      'admin_purchase_signal_read_v2',
      'useclubbers_admin',
      v_admin_user_id,
      'single snapshot purpose-bound administrative read',
      p_correlation_id,
      'admin-read-v2:' || v_audit_id::text,
      p_purpose,
      encode(digest(coalesce(string_agg(
        r.signal_id::text || ':' || r.recorded_at::text,
        ',' order by r.recorded_at, r.signal_id
      ), ''), 'sha256'), 'hex'),
      count(*)::integer,
      'active'
    from selected_rows r
    returning audit_id
  )
  select r.*
  from selected_rows r
  cross join (select count(*) from audit_row) a;
end;
$mhidas_plpgsql$;

revoke all on function public.mhidas_admin_read_event_ticket_purchase_signals_v1(uuid,timestamptz,timestamptz,text,text)
  from public, anon, authenticated, service_role;

grant execute on function public.mhidas_admin_read_event_ticket_purchase_signals_v2(uuid,timestamptz,timestamptz,text,text)
  to service_role;

-- =============================================================================
-- 46. RETENTION MINIMIZATION MATRIX AND POLICY-BOUND BATCH V2
-- =============================================================================

create table public.event_ticket_retention_minimization_rules (
  minimization_rule_id uuid primary key default gen_random_uuid(),
  retention_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  evidence_class text not null,
  source_field text not null,
  minimization_action text not null,
  stable_hash_namespace text,
  preserve_for_legal_hold boolean not null default true,
  created_at timestamptz not null default now(),
  constraint event_ticket_minimization_evidence_class_v4104_check
    check (evidence_class in ('operation_receipt','commercial_audit')),
  constraint event_ticket_minimization_action_v4104_check
    check (minimization_action in ('null','stable_hash','preserve')),
  constraint event_ticket_minimization_hash_namespace_v4104_check
    check (
      minimization_action <> 'stable_hash'
      or stable_hash_namespace ~ '^[a-z0-9][a-z0-9._-]{2,80}$'
    ),
  unique (retention_policy_version_id, evidence_class, source_field)
);

alter table public.event_ticket_operation_receipts
  add column anonymized_idempotency_hash text,
  add column anonymized_target_hash text,
  add column anonymized_correlation_hash text;

alter table public.event_ticket_operation_receipts
  add constraint event_ticket_receipt_minimized_hashes_v4104_check
  check (
    (anonymized_idempotency_hash is null or anonymized_idempotency_hash ~ '^[0-9a-f]{64}$')
    and (anonymized_target_hash is null or anonymized_target_hash ~ '^[0-9a-f]{64}$')
    and (anonymized_correlation_hash is null or anonymized_correlation_hash ~ '^[0-9a-f]{64}$')
  );

alter table public.event_ticket_commercial_audit_log
  add column anonymized_target_hash text,
  add column anonymized_correlation_hash text,
  add column anonymized_idempotency_hash text;

alter table public.event_ticket_commercial_audit_log
  add constraint event_ticket_audit_minimized_hashes_v4104_check
  check (
    (anonymized_target_hash is null or anonymized_target_hash ~ '^[0-9a-f]{64}$')
    and (anonymized_correlation_hash is null or anonymized_correlation_hash ~ '^[0-9a-f]{64}$')
    and (anonymized_idempotency_hash is null or anonymized_idempotency_hash ~ '^[0-9a-f]{64}$')
  );

create function public.mhidas_run_event_ticket_governance_retention_batch_v2(
  p_retention_policy_version_id uuid,
  p_batch_limit integer,
  p_correlation_id text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_receipt_policy record;
  v_audit_policy record;
  v_receipt_count integer := 0;
  v_audit_count integer := 0;
  v_report jsonb;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'GOVERNANCE_RETENTION_SERVICE_ROLE_REQUIRED';
  end if;

  if p_batch_limit < 1 or p_batch_limit > 5000 then
    raise exception 'GOVERNANCE_RETENTION_BATCH_LIMIT_INVALID';
  end if;

  select * into strict v_receipt_policy
  from public.event_ticket_retention_policy_versions p
  where p.retention_policy_version_id = p_retention_policy_version_id
    and p.policy_status = 'active'
    and p.evidence_class = 'operation_receipt';

  select * into strict v_audit_policy
  from public.event_ticket_retention_policy_versions p
  where p.policy_status = 'active'
    and p.policy_purpose = v_receipt_policy.policy_purpose
    and p.jurisdiction_code = v_receipt_policy.jurisdiction_code
    and p.evidence_class = 'commercial_audit';

  with candidates as (
    select r.receipt_id
    from public.event_ticket_operation_receipts r
    where r.retention_policy_version_id = v_receipt_policy.retention_policy_version_id
      and r.retention_status in ('active','eligible')
      and r.retention_expires_at <= now()
      and not r.legal_hold
      and not r.dispute_hold
    order by r.retention_expires_at, r.receipt_id
    limit p_batch_limit
    for update skip locked
  )
  update public.event_ticket_operation_receipts r
  set anonymized_principal_hash = encode(digest(
        'principal:' || coalesce(r.principal_id::text, '') || ':' || coalesce(r.principal_namespace, ''),
        'sha256'
      ), 'hex'),
      anonymized_idempotency_hash = encode(digest('idempotency:' || r.idempotency_key, 'sha256'), 'hex'),
      anonymized_target_hash = encode(digest('target:' || r.target_type || ':' || r.target_id::text, 'sha256'), 'hex'),
      anonymized_correlation_hash = encode(digest('operation:' || r.operation_name || ':' || r.receipt_id::text, 'sha256'), 'hex'),
      principal_id = null,
      principal_namespace = null,
      idempotency_key = 'anonymized:' || encode(digest(r.idempotency_key, 'sha256'), 'hex'),
      retention_status = 'anonymized',
      retention_processed_at = now()
  from candidates c
  where r.receipt_id = c.receipt_id;

  get diagnostics v_receipt_count = row_count;

  with candidates as (
    select a.audit_id
    from public.event_ticket_commercial_audit_log a
    where a.retention_policy_version_id = v_audit_policy.retention_policy_version_id
      and a.retention_status in ('active','eligible')
      and a.retention_expires_at <= now()
      and not a.legal_hold
      and not a.dispute_hold
    order by a.retention_expires_at, a.audit_id
    limit p_batch_limit
    for update skip locked
  )
  update public.event_ticket_commercial_audit_log a
  set anonymized_target_hash = encode(digest('target:' || a.target_type || ':' || a.target_id::text, 'sha256'), 'hex'),
      anonymized_correlation_hash = encode(digest('correlation:' || a.correlation_id, 'sha256'), 'hex'),
      anonymized_idempotency_hash = encode(digest('idempotency:' || a.idempotency_key, 'sha256'), 'hex'),
      actor_user_id = null,
      before_snapshot = null,
      after_snapshot = null,
      correlation_id = 'anonymized:' || encode(digest(a.correlation_id, 'sha256'), 'hex'),
      idempotency_key = 'anonymized:' || encode(digest(a.idempotency_key, 'sha256'), 'hex'),
      reason = 'minimum legal lineage retained under policy-bound anonymization',
      retention_status = 'anonymized',
      retention_processed_at = now()
  from candidates c
  where a.audit_id = c.audit_id;

  get diagnostics v_audit_count = row_count;

  v_report := jsonb_build_object(
    'retention_policy_version_id', p_retention_policy_version_id,
    'audit_retention_policy_version_id', v_audit_policy.retention_policy_version_id,
    'receipt_anonymized_count', v_receipt_count,
    'audit_anonymized_count', v_audit_count,
    'legal_and_dispute_holds_preserved', true,
    'correlation_id_hash', encode(digest(p_correlation_id, 'sha256'), 'hex'),
    'idempotency_key_hash', encode(digest(p_idempotency_key, 'sha256'), 'hex')
  );

  return v_report;
end;
$mhidas_plpgsql$;

revoke all on function public.mhidas_run_event_ticket_governance_retention_batch_v1(uuid,integer,text,text)
  from public, anon, authenticated, service_role;

grant execute on function public.mhidas_run_event_ticket_governance_retention_batch_v2(uuid,integer,text,text)
  to service_role;

-- =============================================================================
-- 47. TERMINAL RECEIPT STATE MACHINE V2
-- =============================================================================

create function public.mhidas_ticket_fail_operation_receipt_v2(
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
  if p_failure_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'IDEMPOTENCY_FAILURE_HASH_INVALID';
  end if;

  update public.event_ticket_operation_receipts r
  set receipt_status = 'failed',
      completed_at = null,
      failed_at = coalesce(r.failed_at, now()),
      failure_hash = p_failure_hash
  where r.receipt_id = p_receipt_id
    and r.receipt_status = 'pending'
  returning * into v_receipt;

  if not found then
    select * into strict v_receipt
    from public.event_ticket_operation_receipts r
    where r.receipt_id = p_receipt_id
    for update;

    if v_receipt.receipt_status = 'failed'
      and v_receipt.failure_hash = p_failure_hash then
      return v_receipt;
    end if;

    if v_receipt.receipt_status = 'completed' then
      raise exception 'IDEMPOTENCY_RECEIPT_ALREADY_COMPLETED';
    end if;

    raise exception 'IDEMPOTENCY_RECEIPT_FAILURE_CONFLICT';
  end if;

  return v_receipt;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_classify_operation_receipt_v2(
  p_receipt_id uuid
)
returns table (
  receipt_status text,
  retry_allowed boolean,
  terminal_hash text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $mhidas_sql$
  select
    r.receipt_status,
    r.receipt_status = 'pending',
    case
      when r.receipt_status = 'completed' then r.result_hash
      when r.receipt_status = 'failed' then r.failure_hash
      else null
    end
  from public.event_ticket_operation_receipts r
  where r.receipt_id = p_receipt_id;
$mhidas_sql$;

revoke all on function public.mhidas_ticket_fail_operation_receipt_v1(uuid,text)
  from public, anon, authenticated, service_role;

-- =============================================================================
-- 48. STATIC PREFLIGHT, NEGATIVE TEST CONTRACT AND CORRECTION EVIDENCE
-- =============================================================================

create temporary table mhidas_v4104_seventh_adjustment_evidence (
  finding_key text primary key,
  correction_status text not null,
  evidence_tokens text[] not null,
  negative_test_key text not null,
  promotion_blocked boolean not null
) on commit drop;

insert into mhidas_v4104_seventh_adjustment_evidence (
  finding_key,
  correction_status,
  evidence_tokens,
  negative_test_key,
  promotion_blocked
)
values
(
  'retention_policy_resolution_and_batch_scope_not_bound',
  'corrected_in_protected_draft',
  array['policy purpose','jurisdiction','evidence class','policy-bound candidate filters'],
  'reject_cross_policy_retention_candidate',
  true
),
(
  'verified_credential_context_issuance_authority_missing',
  'corrected_in_protected_draft',
  array['service_role issuance','nonce hash','revocation','expiry batch'],
  'reject_unverified_context_issuance',
  true
),
(
  'current_credential_cross_integration_integrity_missing',
  'corrected_in_protected_draft',
  array['composite unique','composite foreign key','receipt integration pair'],
  'reject_cross_integration_credential_reference',
  true
),
(
  'purchase_signal_replay_not_credential_bound_before_reservation',
  'corrected_in_protected_draft',
  array['context lock before reserve','credential in request hash','same credential replay'],
  'reject_replay_with_different_credential',
  true
),
(
  'cascade_audit_lineage_uses_legacy_writer',
  'corrected_in_protected_draft',
  array['cascade audit v3','receipt lineage','legacy admin rpc revoked'],
  'reject_cascade_without_parent_receipt',
  true
),
(
  'admin_signal_read_hash_not_same_snapshot_as_result',
  'corrected_in_protected_draft',
  array['materialized cte','same statement audit','canonical ordering'],
  'reject_mismatched_read_hash_snapshot',
  true
),
(
  'retention_anonymization_minimization_incomplete',
  'corrected_in_protected_draft',
  array['minimization matrix','stable hashes','raw correlation removal'],
  'reject_raw_identifier_after_anonymization',
  true
),
(
  'operation_receipt_failure_and_pending_replay_contract_incomplete',
  'corrected_in_protected_draft',
  array['idempotent failure v2','terminal state classifier','conflict taxonomy'],
  'reject_conflicting_terminal_receipt_transition',
  true
);

do $mhidas_v4104_seventh_adjustment_self_check$
declare
  v_count integer;
  v_unblocked integer;
begin
  select count(*) into v_count
  from mhidas_v4104_seventh_adjustment_evidence;

  select count(*) into v_unblocked
  from mhidas_v4104_seventh_adjustment_evidence
  where promotion_blocked = false;

  if v_count <> 8 then
    raise exception 'SEVENTH_ADJUSTMENT_EVIDENCE_COUNT_MISMATCH: %', v_count;
  end if;

  if v_unblocked <> 0 then
    raise exception 'FIFTH_CORRECTED_DRAFT_PROMOTION_MUST_REMAIN_BLOCKED';
  end if;

  if to_regprocedure('public.mhidas_ticket_issue_verified_credential_context_v1(uuid,text,text,text,text,text,text,text,integer)') is null
    or to_regprocedure('public.mhidas_record_event_ticket_purchase_signal_v6(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text)') is null
    or to_regprocedure('public.mhidas_admin_read_event_ticket_purchase_signals_v2(uuid,timestamptz,timestamptz,text,text)') is null
    or to_regprocedure('public.mhidas_run_event_ticket_governance_retention_batch_v2(uuid,integer,text,text)') is null
    or to_regprocedure('public.mhidas_ticket_fail_operation_receipt_v2(uuid,text)') is null then
    raise exception 'V4_8_104_REQUIRED_RPC_MISSING';
  end if;
end;
$mhidas_v4104_seventh_adjustment_self_check$;

-- =============================================================================
-- 49. EIGHTH CORRECTION LAYER FOR THE NINE V4.8.105 BLOCKERS
-- =============================================================================

-- 49.1 Credential-bound receipt reservation v5 inserts integration and
-- credential version as one atomic pair. The previous post-insert UPDATE is
-- intentionally not used by the new trusted writer.

create function public.mhidas_ticket_reserve_operation_receipt_v5(
  p_operation_scope text,
  p_principal_type text,
  p_principal_id uuid,
  p_principal_namespace text,
  p_operation_name text,
  p_idempotency_key text,
  p_target_type text,
  p_target_id uuid,
  p_expected_lock_version integer,
  p_request_hash text,
  p_proposed_result_id uuid,
  p_result_status text,
  p_result_version integer,
  p_integration_id uuid,
  p_credential_version_id uuid,
  p_verifier_evidence_hash text,
  p_retention_policy_version_id uuid,
  p_retention_expires_at timestamptz
)
returns table (
  receipt_id uuid,
  result_id uuid,
  receipt_status text,
  reservation_owner boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_receipt public.event_ticket_operation_receipts%rowtype;
  v_inserted boolean := false;
begin
  if p_request_hash !~ '^[0-9a-f]{64}$'
    or p_verifier_evidence_hash is not null
       and p_verifier_evidence_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'ATOMIC_RECEIPT_V5_HASH_INVALID';
  end if;

  if (p_integration_id is null) <> (p_credential_version_id is null) then
    raise exception 'ATOMIC_RECEIPT_V5_CREDENTIAL_PAIR_REQUIRED';
  end if;

  if p_integration_id is not null and not exists (
    select 1
    from public.event_ticket_trusted_integration_credential_versions c
    where c.integration_id = p_integration_id
      and c.credential_version_id = p_credential_version_id
  ) then
    raise exception 'ATOMIC_RECEIPT_V5_CREDENTIAL_PAIR_INVALID';
  end if;

  insert into public.event_ticket_operation_receipts (
    operation_scope,
    principal_type,
    principal_id,
    principal_namespace,
    operation_name,
    idempotency_key,
    target_type,
    target_id,
    expected_lock_version,
    request_hash,
    result_id,
    result_status,
    result_version,
    result_hash,
    receipt_status,
    integration_id,
    credential_version_id,
    verifier_evidence_hash,
    retention_policy_version_id,
    retention_expires_at
  )
  values (
    p_operation_scope,
    p_principal_type,
    p_principal_id,
    p_principal_namespace,
    p_operation_name,
    p_idempotency_key,
    p_target_type,
    p_target_id,
    p_expected_lock_version,
    p_request_hash,
    p_proposed_result_id,
    p_result_status,
    p_result_version,
    encode(digest(
      p_proposed_result_id::text || ':' || p_result_status || ':' || p_request_hash,
      'sha256'
    ), 'hex'),
    'pending',
    p_integration_id,
    p_credential_version_id,
    p_verifier_evidence_hash,
    p_retention_policy_version_id,
    p_retention_expires_at
  )
  on conflict (
    principal_type,
    coalesce(principal_id, '00000000-0000-0000-0000-000000000000'::uuid),
    operation_name,
    idempotency_key
  ) do nothing
  returning * into v_receipt;

  if found then
    v_inserted := true;
  else
    select * into strict v_receipt
    from public.event_ticket_operation_receipts r
    where r.principal_type = p_principal_type
      and r.principal_id is not distinct from p_principal_id
      and r.operation_name = p_operation_name
      and r.idempotency_key = p_idempotency_key
    for update;
  end if;

  if v_receipt.principal_namespace is distinct from p_principal_namespace
    or v_receipt.target_type <> p_target_type
    or v_receipt.target_id <> p_target_id
    or v_receipt.expected_lock_version is distinct from p_expected_lock_version
    or v_receipt.request_hash <> p_request_hash
    or v_receipt.integration_id is distinct from p_integration_id
    or v_receipt.credential_version_id is distinct from p_credential_version_id
    or v_receipt.verifier_evidence_hash is distinct from p_verifier_evidence_hash then
    raise exception 'IDEMPOTENCY_KEY_SEMANTIC_REUSE_DENIED_V5';
  end if;

  if not v_inserted and v_receipt.receipt_status = 'failed' then
    raise exception 'IDEMPOTENCY_RECEIPT_PREVIOUSLY_FAILED';
  end if;

  return query
  select v_receipt.receipt_id, v_receipt.result_id, v_receipt.receipt_status, v_inserted;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 50. CLASS-SPECIFIC RETENTION POLICY MATERIALIZATION
-- =============================================================================

-- Fail closed if an active dimensional policy is ambiguous. Clone the single
-- default governance policy into receipt and audit classes only when absent.

do $mhidas_v4106_seed_class_policies$
declare
  v_default public.event_ticket_retention_policy_versions%rowtype;
  v_next_version integer;
  v_receipt_count integer;
  v_audit_count integer;
begin
  lock table public.event_ticket_retention_policy_versions in share row exclusive mode;

  select * into strict v_default
  from public.event_ticket_retention_policy_versions p
  where p.policy_status = 'active'
    and p.policy_purpose = 'commercial_governance'
    and p.jurisdiction_code = 'BR'
    and p.evidence_class = 'default';

  select count(*) into v_receipt_count
  from public.event_ticket_retention_policy_versions p
  where p.policy_status = 'active'
    and p.policy_purpose = 'commercial_governance'
    and p.jurisdiction_code = 'BR'
    and p.evidence_class = 'operation_receipt';

  select count(*) into v_audit_count
  from public.event_ticket_retention_policy_versions p
  where p.policy_status = 'active'
    and p.policy_purpose = 'security_audit'
    and p.jurisdiction_code = 'BR'
    and p.evidence_class = 'commercial_audit';

  if v_receipt_count > 1 or v_audit_count > 1 then
    raise exception 'CLASS_SPECIFIC_RETENTION_POLICY_AMBIGUOUS';
  end if;

  select coalesce(max(policy_version), 0) + 1 into v_next_version
  from public.event_ticket_retention_policy_versions;

  if v_receipt_count = 0 then
    insert into public.event_ticket_retention_policy_versions (
      policy_version, policy_status, legal_basis_reference_hash,
      policy_manifest_hash, click_action, click_retention_days,
      signal_action, signal_retention_days, approved_by_admin_user_id,
      approved_at, activated_at, policy_purpose, jurisdiction_code,
      evidence_class, receipt_retention_days, audit_retention_days,
      lifecycle_evidence_hash, lifecycle_reason_hash
    ) values (
      v_next_version, 'active', v_default.legal_basis_reference_hash,
      encode(digest(v_default.policy_manifest_hash || ':operation_receipt', 'sha256'), 'hex'),
      v_default.click_action, v_default.click_retention_days,
      v_default.signal_action, v_default.signal_retention_days,
      v_default.approved_by_admin_user_id, v_default.approved_at, now(),
      'commercial_governance', 'BR', 'operation_receipt',
      v_default.receipt_retention_days, v_default.audit_retention_days,
      encode(digest('v4106:operation_receipt', 'sha256'), 'hex'),
      encode(digest('class-specific retention seed', 'sha256'), 'hex')
    );
    v_next_version := v_next_version + 1;
  end if;

  if v_audit_count = 0 then
    insert into public.event_ticket_retention_policy_versions (
      policy_version, policy_status, legal_basis_reference_hash,
      policy_manifest_hash, click_action, click_retention_days,
      signal_action, signal_retention_days, approved_by_admin_user_id,
      approved_at, activated_at, policy_purpose, jurisdiction_code,
      evidence_class, receipt_retention_days, audit_retention_days,
      lifecycle_evidence_hash, lifecycle_reason_hash
    ) values (
      v_next_version, 'active', v_default.legal_basis_reference_hash,
      encode(digest(v_default.policy_manifest_hash || ':commercial_audit', 'sha256'), 'hex'),
      v_default.click_action, v_default.click_retention_days,
      v_default.signal_action, v_default.signal_retention_days,
      v_default.approved_by_admin_user_id, v_default.approved_at, now(),
      'security_audit', 'BR', 'commercial_audit',
      v_default.receipt_retention_days, v_default.audit_retention_days,
      encode(digest('v4106:commercial_audit', 'sha256'), 'hex'),
      encode(digest('class-specific retention seed', 'sha256'), 'hex')
    );
  end if;

  if (select count(*) from public.event_ticket_retention_policy_versions p
      where p.policy_status = 'active'
        and p.policy_purpose = 'commercial_governance'
        and p.jurisdiction_code = 'BR'
        and p.evidence_class = 'operation_receipt') <> 1
    or (select count(*) from public.event_ticket_retention_policy_versions p
      where p.policy_status = 'active'
        and p.policy_purpose = 'security_audit'
        and p.jurisdiction_code = 'BR'
        and p.evidence_class = 'commercial_audit') <> 1 then
    raise exception 'CLASS_SPECIFIC_RETENTION_POLICY_NOT_RESOLVABLE';
  end if;
end;
$mhidas_v4106_seed_class_policies$;

-- =============================================================================
-- 51. CREDENTIAL CONTEXT LINEAGE AND IDEMPOTENT ISSUANCE V2
-- =============================================================================

alter table public.event_ticket_verified_credential_contexts
  add column integration_id uuid,
  add column issuance_idempotency_key text,
  add column issuance_receipt_id uuid references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  add column last_lifecycle_receipt_id uuid references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  add column lifecycle_correlation_hash text;

update public.event_ticket_verified_credential_contexts c
set integration_id = v.integration_id
from public.event_ticket_trusted_integration_credential_versions v
where c.credential_version_id = v.credential_version_id
  and c.integration_id is null;

alter table public.event_ticket_verified_credential_contexts
  alter column integration_id set not null,
  add constraint event_ticket_verified_context_integration_credential_v4106_fk
  foreign key (integration_id, credential_version_id)
  references public.event_ticket_trusted_integration_credential_versions (
    integration_id, credential_version_id
  ) on delete restrict,
  add constraint event_ticket_verified_context_lineage_hash_v4106_check
  check (
    lifecycle_correlation_hash is null
    or lifecycle_correlation_hash ~ '^[0-9a-f]{64}$'
  );

create unique index event_ticket_verified_context_semantic_issue_v4106_uq
  on public.event_ticket_verified_credential_contexts (
    integration_id,
    credential_version_id,
    issuance_request_hash,
    issuance_nonce_hash
  )
  where issuance_request_hash is not null
    and issuance_nonce_hash is not null;

alter table public.event_ticket_commercial_audit_log
  drop constraint event_ticket_commercial_audit_target_type_v499_check;

alter table public.event_ticket_commercial_audit_log
  add constraint event_ticket_commercial_audit_target_type_v4106_check
  check (target_type in (
    'partner','representative','request','channel','communication',
    'signal','retention_run','backfill','integration','integration_scope',
    'retention_policy','credential_context','operation_receipt',
    'retention_minimization_rule'
  ));

create function public.mhidas_ticket_write_credential_context_audit_v1(
  p_context_id uuid,
  p_integration_id uuid,
  p_credential_version_id uuid,
  p_receipt_id uuid,
  p_action text,
  p_previous_status text,
  p_next_status text,
  p_evidence_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_audit_id uuid := gen_random_uuid();
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role'
    and not public.mhidas_is_useclubbers_admin_v1(auth.uid()) then
    raise exception 'CREDENTIAL_CONTEXT_AUDIT_AUTHORITY_REQUIRED';
  end if;

  if p_evidence_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'CREDENTIAL_CONTEXT_AUDIT_EVIDENCE_HASH_INVALID';
  end if;

  insert into public.event_ticket_commercial_audit_log (
    audit_id, target_type, target_id, integration_id,
    credential_version_id, receipt_id, audit_action, actor_role,
    actor_user_id, previous_status, next_status, sensitive_terms_hash,
    reason, correlation_id, idempotency_key
  ) values (
    v_audit_id, 'credential_context', p_context_id, p_integration_id,
    p_credential_version_id, p_receipt_id, p_action,
    case when current_setting('request.jwt.claim.role', true) = 'service_role'
      then 'system' else 'useclubbers_admin' end,
    auth.uid(), p_previous_status, p_next_status, p_evidence_hash,
    'credential context lifecycle', p_correlation_id, p_idempotency_key
  );

  return v_audit_id;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_issue_verified_credential_context_v2(
  p_integration_id uuid,
  p_credential_version_id uuid,
  p_context_token_hash text,
  p_request_signature_hash text,
  p_issuance_request_hash text,
  p_issuance_nonce_hash text,
  p_verifier_evidence_hash text,
  p_issuer_service_key text,
  p_issued_by_verifier_key_hash text,
  p_valid_for_seconds integer,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_verified_credential_contexts
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_context public.event_ticket_verified_credential_contexts%rowtype;
  v_receipt record;
  v_request_hash text;
  v_context_id uuid := gen_random_uuid();
  v_retention record;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'VERIFIED_CONTEXT_ISSUANCE_SERVICE_ROLE_REQUIRED';
  end if;

  if p_valid_for_seconds < 30 or p_valid_for_seconds > 900 then
    raise exception 'VERIFIED_CONTEXT_VALIDITY_INVALID';
  end if;

  if not exists (
    select 1
    from public.event_ticket_trusted_integration_credential_versions c
    join public.event_ticket_trusted_integrations i
      on i.integration_id = c.integration_id
    where c.integration_id = p_integration_id
      and c.credential_version_id = p_credential_version_id
      and c.credential_status = 'active'
      and i.integration_status = 'active'
      and i.current_credential_version_id = c.credential_version_id
  ) then
    raise exception 'VERIFIED_CONTEXT_ACTIVE_CREDENTIAL_REQUIRED';
  end if;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'integration_id', p_integration_id,
    'credential_version_id', p_credential_version_id,
    'context_token_hash', p_context_token_hash,
    'request_signature_hash', p_request_signature_hash,
    'issuance_request_hash', p_issuance_request_hash,
    'issuance_nonce_hash', p_issuance_nonce_hash,
    'verifier_evidence_hash', p_verifier_evidence_hash,
    'issuer_service_key', p_issuer_service_key,
    'issued_by_verifier_key_hash', p_issued_by_verifier_key_hash,
    'valid_for_seconds', p_valid_for_seconds
  ));

  select * into strict v_retention
  from public.mhidas_ticket_resolve_retention_policy_v2(
    'commercial_governance', 'BR', 'operation_receipt'
  );

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v5(
    'credential_context_mutation', 'service_role', null,
    p_issuer_service_key, 'issue_verified_credential_context_v2',
    p_idempotency_key, 'credential_context', v_context_id, null,
    v_request_hash, v_context_id, 'issued', 1,
    p_integration_id, p_credential_version_id, p_verifier_evidence_hash,
    v_retention.retention_policy_version_id,
    now() + make_interval(days => v_retention.retention_days)
  );

  if not v_receipt.reservation_owner then
    select * into strict v_context
    from public.event_ticket_verified_credential_contexts c
    where c.issuance_receipt_id = v_receipt.receipt_id
      and c.integration_id = p_integration_id
      and c.credential_version_id = p_credential_version_id;
    return v_context;
  end if;

  insert into public.event_ticket_verified_credential_contexts (
    credential_context_id, integration_id, credential_version_id,
    context_token_hash, request_signature_hash, verifier_evidence_hash,
    context_status, valid_from, valid_until, issuer_service_key,
    issuance_request_hash, issuance_nonce_hash,
    issued_by_verifier_key_hash, issuance_idempotency_key,
    issuance_receipt_id, last_lifecycle_receipt_id,
    lifecycle_correlation_hash
  ) values (
    v_context_id, p_integration_id, p_credential_version_id,
    p_context_token_hash, p_request_signature_hash, p_verifier_evidence_hash,
    'issued', now(), now() + make_interval(secs => p_valid_for_seconds),
    p_issuer_service_key, p_issuance_request_hash, p_issuance_nonce_hash,
    p_issued_by_verifier_key_hash, p_idempotency_key,
    v_receipt.receipt_id, v_receipt.receipt_id,
    encode(digest(p_correlation_id, 'sha256'), 'hex')
  )
  returning * into v_context;

  perform public.mhidas_ticket_write_credential_context_audit_v1(
    v_context.credential_context_id, v_context.integration_id,
    v_context.credential_version_id, v_receipt.receipt_id,
    'credential_context_issued_v2', null, 'issued',
    p_verifier_evidence_hash, p_correlation_id, p_idempotency_key
  );

  perform public.mhidas_ticket_complete_operation_receipt_v2(
    v_receipt.receipt_id, v_context.credential_context_id,
    'issued', 1,
    encode(digest(v_context.credential_context_id::text || ':' || v_request_hash, 'sha256'), 'hex')
  );

  return v_context;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_consume_verified_credential_context_v3(
  p_context_id uuid,
  p_integration_id uuid,
  p_credential_version_id uuid,
  p_verifier_evidence_hash text,
  p_receipt_id uuid,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_verified_credential_contexts
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_context public.event_ticket_verified_credential_contexts%rowtype;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'VERIFIED_CONTEXT_CONSUME_SERVICE_ROLE_REQUIRED';
  end if;

  update public.event_ticket_verified_credential_contexts c
  set context_status = 'consumed',
      consumed_at = now(),
      consumed_receipt_id = p_receipt_id,
      last_lifecycle_receipt_id = p_receipt_id,
      lifecycle_correlation_hash = encode(digest(p_correlation_id, 'sha256'), 'hex')
  where c.credential_context_id = p_context_id
    and c.integration_id = p_integration_id
    and c.credential_version_id = p_credential_version_id
    and c.verifier_evidence_hash = p_verifier_evidence_hash
    and c.context_status = 'issued'
    and c.valid_from <= now()
    and c.valid_until > now()
  returning * into v_context;

  if not found then
    raise exception 'VERIFIED_CONTEXT_CONSUME_STATE_MISMATCH';
  end if;

  perform public.mhidas_ticket_write_credential_context_audit_v1(
    v_context.credential_context_id, v_context.integration_id,
    v_context.credential_version_id, p_receipt_id,
    'credential_context_consumed_v3', 'issued', 'consumed',
    p_verifier_evidence_hash, p_correlation_id, p_idempotency_key
  );

  return v_context;
end;
$mhidas_plpgsql$;

create function public.mhidas_admin_revoke_verified_credential_context_v2(
  p_context_id uuid,
  p_reason_hash text,
  p_evidence_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_verified_credential_contexts
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_context public.event_ticket_verified_credential_contexts%rowtype;
  v_receipt record;
  v_request_hash text;
  v_retention record;
begin
  if auth.uid() is null or not public.mhidas_is_useclubbers_admin_v1(auth.uid()) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  select * into strict v_context
  from public.event_ticket_verified_credential_contexts c
  where c.credential_context_id = p_context_id
  for update;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'context_id', p_context_id,
    'previous_status', v_context.context_status,
    'reason_hash', p_reason_hash,
    'evidence_hash', p_evidence_hash
  ));

  select * into strict v_retention
  from public.mhidas_ticket_resolve_retention_policy_v2(
    'commercial_governance', 'BR', 'operation_receipt'
  );

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v5(
    'credential_context_mutation', 'user', auth.uid(), null,
    'revoke_verified_credential_context_v2', p_idempotency_key,
    'credential_context', p_context_id, null, v_request_hash,
    p_context_id, 'revoked', 1, v_context.integration_id,
    v_context.credential_version_id, p_evidence_hash,
    v_retention.retention_policy_version_id,
    now() + make_interval(days => v_retention.retention_days)
  );

  if v_receipt.reservation_owner then
    update public.event_ticket_verified_credential_contexts c
    set context_status = 'revoked', revoked_at = now(),
        revocation_reason_hash = p_reason_hash,
        last_lifecycle_receipt_id = v_receipt.receipt_id,
        lifecycle_correlation_hash = encode(digest(p_correlation_id, 'sha256'), 'hex')
    where c.credential_context_id = p_context_id
      and c.context_status = 'issued'
    returning * into v_context;

    if not found then
      raise exception 'VERIFIED_CONTEXT_REVOKE_STATE_MISMATCH';
    end if;

    perform public.mhidas_ticket_write_credential_context_audit_v1(
      v_context.credential_context_id, v_context.integration_id,
      v_context.credential_version_id, v_receipt.receipt_id,
      'credential_context_revoked_v2', 'issued', 'revoked',
      p_evidence_hash, p_correlation_id, p_idempotency_key
    );

    perform public.mhidas_ticket_complete_operation_receipt_v2(
      v_receipt.receipt_id, p_context_id, 'revoked', 1,
      encode(digest(p_context_id::text || ':' || v_request_hash, 'sha256'), 'hex')
    );
  end if;

  return v_context;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 52. SINGLE-RECEIPT TRUSTED SIGNAL WRITER V7
-- =============================================================================

create function public.mhidas_record_event_ticket_purchase_signal_v7(
  p_signal_id uuid,
  p_parent_signal_id uuid,
  p_canonical_event_id uuid,
  p_channel_id uuid,
  p_click_id uuid,
  p_user_id uuid,
  p_signal_type text,
  p_evidence_source text,
  p_credential_context_token_hash text,
  p_request_signature_hash text,
  p_transaction_hash text,
  p_evidence_hash text,
  p_signature_validation_hash text,
  p_replay_nonce_hash text,
  p_attribution_campaign_id text,
  p_gross_amount_minor bigint,
  p_commission_amount_minor bigint,
  p_currency text,
  p_idempotency_key text,
  p_metadata jsonb,
  p_correlation_id text
)
returns public.event_ticket_purchase_signals
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_context record;
  v_receipt record;
  v_signal public.event_ticket_purchase_signals%rowtype;
  v_effective_signal_id uuid := coalesce(p_signal_id, gen_random_uuid());
  v_request_hash text;
  v_retention record;
  v_partner_id uuid;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'TRUSTED_SIGNAL_V7_SERVICE_ROLE_REQUIRED';
  end if;

  select * into strict v_context
  from public.mhidas_ticket_lock_verified_credential_context_v2(
    p_credential_context_token_hash, p_request_signature_hash
  );

  if not exists (
    select 1
    from public.event_ticket_trusted_integration_channels s
    join public.event_ticket_trusted_integrations i
      on i.integration_id = s.integration_id
    where s.integration_id = v_context.integration_id
      and s.channel_id = p_channel_id
      and s.canonical_event_id = p_canonical_event_id
      and s.authorization_status = 'active'
      and i.integration_status = 'active'
      and i.current_credential_version_id = v_context.credential_version_id
  ) then
    raise exception 'TRUSTED_SIGNAL_V7_SCOPE_DENIED';
  end if;

  select i.partner_id into strict v_partner_id
  from public.event_ticket_trusted_integrations i
  where i.integration_id = v_context.integration_id;

  select * into strict v_retention
  from public.mhidas_ticket_resolve_retention_policy_v2(
    'purchase_evidence', 'BR', 'trusted_purchase_signal'
  );

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'signal_id', v_effective_signal_id,
    'parent_signal_id', p_parent_signal_id,
    'canonical_event_id', p_canonical_event_id,
    'channel_id', p_channel_id,
    'click_id', p_click_id,
    'user_id_compare', p_user_id,
    'signal_type', p_signal_type,
    'evidence_source', p_evidence_source,
    'integration_id', v_context.integration_id,
    'credential_version_id', v_context.credential_version_id,
    'verifier_evidence_hash', v_context.verifier_evidence_hash,
    'transaction_hash', p_transaction_hash,
    'evidence_hash', p_evidence_hash,
    'signature_validation_hash', p_signature_validation_hash,
    'replay_nonce_hash', p_replay_nonce_hash,
    'attribution_campaign_id', p_attribution_campaign_id,
    'gross_amount_minor', p_gross_amount_minor,
    'commission_amount_minor', p_commission_amount_minor,
    'currency', p_currency,
    'metadata', coalesce(p_metadata, '{}'::jsonb)
  ));

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v5(
    'signal_insert', 'service_role', null, v_context.provider_namespace,
    'record_purchase_signal_v7', p_idempotency_key, 'canonical_event',
    p_canonical_event_id, null, v_request_hash, v_effective_signal_id,
    p_signal_type, 1, v_context.integration_id,
    v_context.credential_version_id, v_context.verifier_evidence_hash,
    v_retention.retention_policy_version_id,
    now() + make_interval(days => v_retention.retention_days)
  );

  if not v_receipt.reservation_owner then
    if v_receipt.receipt_status <> 'completed' then
      raise exception 'IDEMPOTENCY_RECEIPT_PENDING_RETRY';
    end if;

    select * into strict v_signal
    from public.event_ticket_purchase_signals s
    where s.signal_id = v_receipt.result_id
      and s.integration_id = v_context.integration_id;
    return v_signal;
  end if;

  perform public.mhidas_ticket_consume_verified_credential_context_v3(
    v_context.credential_context_id, v_context.integration_id,
    v_context.credential_version_id, v_context.verifier_evidence_hash,
    v_receipt.receipt_id, p_correlation_id,
    p_idempotency_key || ':context-consume'
  );

  perform set_config('app.mhidas_ticket_actor_role', 'trusted_ticketing_integration', true);
  perform set_config('app.mhidas_ticket_actor_user_id', '', true);

  insert into public.event_ticket_purchase_signals (
    signal_id, parent_signal_id, canonical_event_id, channel_id, click_id,
    user_id, signal_type, evidence_source, trusted_evidence_verified,
    provider_namespace, transaction_hash, transaction_hash_algorithm,
    transaction_hash_version, evidence_hash, signature_validation_hash,
    replay_nonce_hash, attribution_campaign_id, gross_amount_minor,
    commission_amount_minor, currency, recorded_at, trusted_confirmed_at,
    trusted_confirmed_by_actor_role, retention_policy_version_id,
    retention_expires_at, idempotency_key, metadata, receipt_id,
    integration_id, evidence_matrix_version
  ) values (
    v_effective_signal_id, p_parent_signal_id, p_canonical_event_id,
    p_channel_id, p_click_id, p_user_id, p_signal_type, p_evidence_source,
    true, v_context.provider_namespace, p_transaction_hash, 'sha256', 1,
    p_evidence_hash, p_signature_validation_hash, p_replay_nonce_hash,
    p_attribution_campaign_id, p_gross_amount_minor,
    p_commission_amount_minor, p_currency, now(), now(),
    'trusted_ticketing_integration', v_retention.retention_policy_version_id,
    now() + make_interval(days => v_retention.retention_days),
    p_idempotency_key, coalesce(p_metadata, '{}'::jsonb),
    v_receipt.receipt_id, v_context.integration_id, 3
  )
  returning * into v_signal;

  insert into public.event_ticket_commercial_audit_log (
    target_type, target_id, canonical_event_id, partner_id, channel_id,
    signal_id, integration_id, credential_version_id, receipt_id,
    verifier_evidence_hash, audit_action, actor_role, previous_status,
    next_status, before_snapshot, after_snapshot, sensitive_terms_hash,
    reason, correlation_id, idempotency_key
  ) values (
    'signal', v_signal.signal_id, v_signal.canonical_event_id,
    v_partner_id, v_signal.channel_id, v_signal.signal_id,
    v_context.integration_id, v_context.credential_version_id,
    v_receipt.receipt_id, v_context.verifier_evidence_hash,
    'purchase_signal_recorded_v7', 'trusted_ticketing_integration',
    null, v_signal.signal_type, null,
    jsonb_build_object(
      'signal_type', v_signal.signal_type,
      'integration_id', v_context.integration_id,
      'credential_version_id', v_context.credential_version_id,
      'receipt_id', v_receipt.receipt_id
    ),
    p_evidence_hash, 'single receipt credential-bound signal writer',
    p_correlation_id, p_idempotency_key || ':audit'
  );

  perform public.mhidas_ticket_complete_operation_receipt_v2(
    v_receipt.receipt_id, v_signal.signal_id, v_signal.signal_type, 1,
    encode(digest(v_signal.signal_id::text || ':' || v_request_hash, 'sha256'), 'hex')
  );

  return v_signal;
exception when others then
  if v_receipt.receipt_id is not null then
    perform public.mhidas_ticket_fail_operation_receipt_v2(
      v_receipt.receipt_id,
      encode(digest(sqlstate || ':' || sqlerrm, 'sha256'), 'hex')
    );
  end if;
  raise;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 53. EXECUTABLE MINIMIZATION MATRIX AND DURABLE RETENTION BATCH V3
-- =============================================================================

alter table public.event_ticket_retention_runs
  add column receipt_id uuid references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  add column receipt_processed_count integer not null default 0,
  add column audit_processed_count integer not null default 0,
  add column minimization_rule_count integer not null default 0,
  add column result_hash text;

alter table public.event_ticket_retention_runs
  add constraint event_ticket_retention_run_v4106_counts_check
  check (
    receipt_processed_count >= 0
    and audit_processed_count >= 0
    and minimization_rule_count >= 0
  ),
  add constraint event_ticket_retention_run_v4106_result_hash_check
  check (result_hash is null or result_hash ~ '^[0-9a-f]{64}$');

create function public.mhidas_ticket_apply_minimization_rule_v1(
  p_evidence_class text,
  p_source_field text,
  p_source_value text,
  p_action text,
  p_hash_namespace text,
  p_legal_hold boolean
)
returns text
language plpgsql
immutable
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
begin
  if p_legal_hold then
    return p_source_value;
  end if;

  if p_evidence_class not in ('operation_receipt','commercial_audit')
    or p_source_field not in (
      'principal_namespace','idempotency_key','correlation_id',
      'target_id','principal_id','reason'
    ) then
    raise exception 'MINIMIZATION_RULE_FIELD_DENIED';
  end if;

  if p_action = 'null' then
    return null;
  elsif p_action = 'stable_hash' then
    if p_hash_namespace is null
      or p_hash_namespace !~ '^[a-z0-9][a-z0-9._-]{2,80}$' then
      raise exception 'MINIMIZATION_RULE_NAMESPACE_INVALID';
    end if;
    return encode(digest(p_hash_namespace || ':' || coalesce(p_source_value, ''), 'sha256'), 'hex');
  elsif p_action = 'preserve' then
    return p_source_value;
  end if;

  raise exception 'MINIMIZATION_RULE_ACTION_DENIED';
end;
$mhidas_plpgsql$;

create function public.mhidas_run_event_ticket_governance_retention_batch_v3(
  p_retention_policy_version_id uuid,
  p_batch_limit integer,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_retention_runs
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_run public.event_ticket_retention_runs%rowtype;
  v_receipt record;
  v_request_hash text;
  v_result_hash text;
  v_receipt_count integer := 0;
  v_audit_count integer := 0;
  v_rule_count integer := 0;
  v_retention record;
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  if p_batch_limit < 1 or p_batch_limit > 5000 then
    raise exception 'RETENTION_BATCH_LIMIT_INVALID';
  end if;

  select * into strict v_retention
  from public.mhidas_ticket_resolve_retention_policy_v2(
    'commercial_governance', 'BR', 'operation_receipt'
  );

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'retention_policy_version_id', p_retention_policy_version_id,
    'batch_limit', p_batch_limit,
    'correlation_hash', encode(digest(p_correlation_id, 'sha256'), 'hex')
  ));

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v5(
    'retention_run', 'user', v_admin_user_id, null,
    'governance_retention_batch_v3', p_idempotency_key,
    'retention_policy', p_retention_policy_version_id, null,
    v_request_hash, gen_random_uuid(), 'running', 1,
    null, null, null, v_retention.retention_policy_version_id,
    now() + make_interval(days => v_retention.retention_days)
  );

  if not v_receipt.reservation_owner then
    select * into strict v_run
    from public.event_ticket_retention_runs r
    where r.receipt_id = v_receipt.receipt_id;
    return v_run;
  end if;

  insert into public.event_ticket_retention_runs (
    retention_run_id, retention_policy_version_id, run_status,
    batch_limit, checkpoint, correlation_id, idempotency_key,
    receipt_id
  ) values (
    v_receipt.result_id, p_retention_policy_version_id, 'running',
    p_batch_limit, jsonb_build_object('stage','reserved'),
    p_correlation_id, p_idempotency_key, v_receipt.receipt_id
  ) returning * into v_run;

  select count(*) into v_rule_count
  from public.event_ticket_retention_minimization_rules m
  where m.retention_policy_version_id = p_retention_policy_version_id;

  if v_rule_count = 0 then
    raise exception 'RETENTION_MINIMIZATION_RULES_REQUIRED';
  end if;

  with candidates as (
    select r.receipt_id
    from public.event_ticket_operation_receipts r
    where r.retention_policy_version_id = p_retention_policy_version_id
      and r.retention_status in ('active','eligible')
      and r.retention_expires_at <= now()
      and not r.legal_hold
      and not r.dispute_hold
    order by r.retention_expires_at, r.receipt_id
    limit p_batch_limit
    for update skip locked
  )
  update public.event_ticket_operation_receipts r
  set anonymized_principal_hash = encode(digest(
        'receipt-principal:' || coalesce(r.principal_id::text, r.principal_namespace, ''),
        'sha256'
      ), 'hex'),
      anonymized_idempotency_hash = public.mhidas_ticket_apply_minimization_rule_v1(
        'operation_receipt','idempotency_key',r.idempotency_key,
        'stable_hash','receipt.idempotency',false
      ),
      anonymized_target_hash = public.mhidas_ticket_apply_minimization_rule_v1(
        'operation_receipt','target_id',r.target_id::text,
        'stable_hash','receipt.target',false
      ),
      principal_id = null,
      principal_namespace = null,
      retention_status = 'anonymized',
      retention_processed_at = now()
  from candidates c
  where r.receipt_id = c.receipt_id;

  get diagnostics v_receipt_count = row_count;

  with candidates as (
    select a.audit_id
    from public.event_ticket_commercial_audit_log a
    where a.retention_policy_version_id = p_retention_policy_version_id
      and a.retention_status in ('active','eligible')
      and a.retention_expires_at <= now()
      and not a.legal_hold
      and not a.dispute_hold
    order by a.retention_expires_at, a.audit_id
    limit p_batch_limit
    for update skip locked
  )
  update public.event_ticket_commercial_audit_log a
  set anonymized_target_hash = public.mhidas_ticket_apply_minimization_rule_v1(
        'commercial_audit','target_id',a.target_id::text,
        'stable_hash','audit.target',false
      ),
      anonymized_correlation_hash = public.mhidas_ticket_apply_minimization_rule_v1(
        'commercial_audit','correlation_id',a.correlation_id,
        'stable_hash','audit.correlation',false
      ),
      anonymized_idempotency_hash = public.mhidas_ticket_apply_minimization_rule_v1(
        'commercial_audit','idempotency_key',a.idempotency_key,
        'stable_hash','audit.idempotency',false
      ),
      before_snapshot = null,
      after_snapshot = null,
      retention_status = 'anonymized',
      retention_processed_at = now()
  from candidates c
  where a.audit_id = c.audit_id;

  get diagnostics v_audit_count = row_count;

  v_result_hash := encode(digest(
    v_run.retention_run_id::text || ':' || v_receipt_count::text || ':' ||
    v_audit_count::text || ':' || v_rule_count::text,
    'sha256'
  ), 'hex');

  update public.event_ticket_retention_runs r
  set run_status = 'completed',
      receipt_processed_count = v_receipt_count,
      audit_processed_count = v_audit_count,
      minimization_rule_count = v_rule_count,
      result_hash = v_result_hash,
      checkpoint = jsonb_build_object(
        'stage','completed',
        'receipt_processed_count',v_receipt_count,
        'audit_processed_count',v_audit_count,
        'minimization_rule_count',v_rule_count
      ),
      completed_at = now()
  where r.retention_run_id = v_run.retention_run_id
  returning * into v_run;

  insert into public.event_ticket_commercial_audit_log (
    target_type, target_id, retention_run_id, receipt_id,
    audit_action, actor_role, actor_user_id, next_status,
    response_hash, response_row_count, reason,
    correlation_id, idempotency_key
  ) values (
    'retention_run', v_run.retention_run_id, v_run.retention_run_id,
    v_receipt.receipt_id, 'governance_retention_batch_completed_v3',
    'useclubbers_admin', v_admin_user_id, 'completed',
    v_result_hash, v_receipt_count + v_audit_count,
    'durable idempotent retention batch', p_correlation_id,
    p_idempotency_key || ':audit'
  );

  perform public.mhidas_ticket_complete_operation_receipt_v2(
    v_receipt.receipt_id, v_run.retention_run_id, 'completed', 1,
    v_result_hash
  );

  return v_run;
exception when others then
  if v_receipt.receipt_id is not null then
    perform public.mhidas_ticket_fail_operation_receipt_v2(
      v_receipt.receipt_id,
      encode(digest(sqlstate || ':' || sqlerrm, 'sha256'), 'hex')
    );
  end if;
  raise;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 54. ADMINISTRATIVE CASCADE REPLACEMENTS V3
-- =============================================================================

create function public.mhidas_admin_mutate_commercial_partner_status_v3(
  p_partner_id uuid,
  p_expected_lock_version integer,
  p_next_status text,
  p_cascade_integrations boolean,
  p_evidence_hash text,
  p_reason_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.commercial_partners
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_before public.commercial_partners%rowtype;
  v_after public.commercial_partners%rowtype;
  v_receipt record;
  v_request_hash text;
  v_retention record;
  v_integration public.event_ticket_trusted_integrations%rowtype;
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  select * into strict v_before
  from public.commercial_partners p
  where p.partner_id = p_partner_id
  for update;

  if v_before.lock_version <> p_expected_lock_version then
    raise exception 'COMMERCIAL_PARTNER_LOCK_VERSION_MISMATCH';
  end if;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'partner_id',p_partner_id,
    'expected_lock_version',p_expected_lock_version,
    'previous_status',v_before.partner_status,
    'next_status',p_next_status,
    'cascade_integrations',p_cascade_integrations,
    'evidence_hash',p_evidence_hash,
    'reason_hash',p_reason_hash
  ));

  select * into strict v_retention
  from public.mhidas_ticket_resolve_retention_policy_v2(
    'commercial_governance','BR','operation_receipt'
  );

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v5(
    'partner_lifecycle','user',v_admin_user_id,null,
    'mutate_commercial_partner_status_v3',p_idempotency_key,
    'commercial_partner',p_partner_id,p_expected_lock_version,
    v_request_hash,p_partner_id,p_next_status,p_expected_lock_version + 1,
    null,null,null,v_retention.retention_policy_version_id,
    now() + make_interval(days => v_retention.retention_days)
  );

  if not v_receipt.reservation_owner then
    select * into strict v_after
    from public.commercial_partners p
    where p.partner_id = v_receipt.result_id;
    return v_after;
  end if;

  if p_next_status <> 'verified' and exists (
    select 1 from public.event_ticket_trusted_integrations i
    where i.partner_id = p_partner_id and i.integration_status = 'active'
  ) and not p_cascade_integrations then
    raise exception 'PARTNER_ACTIVE_INTEGRATION_CASCADE_REQUIRED';
  end if;

  perform set_config('app.mhidas_ticket_actor_role','useclubbers_admin',true);
  perform set_config('app.mhidas_ticket_actor_user_id',v_admin_user_id::text,true);

  for v_integration in
    select i.* from public.event_ticket_trusted_integrations i
    where i.partner_id = p_partner_id and i.integration_status = 'active'
    for update
  loop
    update public.event_ticket_trusted_integrations i
    set integration_status = 'suspended', suspended_at = now(),
        lifecycle_evidence_hash = p_evidence_hash,
        lifecycle_reason_hash = p_reason_hash,
        updated_by_admin_user_id = v_admin_user_id,
        lock_version = i.lock_version + 1
    where i.integration_id = v_integration.integration_id;

    perform public.mhidas_ticket_write_cascade_audit_v3(
      'integration',v_integration.integration_id,'partner',p_partner_id,
      encode(digest(v_integration.integration_id::text,'sha256'),'hex'),
      null,p_partner_id,null,'integration_suspended_by_partner_cascade_v3',
      v_integration.integration_status,'suspended',v_integration.lock_version + 1,
      jsonb_build_object('status',v_integration.integration_status),
      jsonb_build_object('status','suspended'),p_evidence_hash,
      'partner lifecycle cascade',p_correlation_id,
      p_idempotency_key || ':integration:' || v_integration.integration_id::text,
      v_receipt.receipt_id,null,null
    );
  end loop;

  update public.commercial_partners p
  set partner_status = p_next_status,
      lock_version = p.lock_version + 1,
      updated_at = now()
  where p.partner_id = p_partner_id
  returning * into v_after;

  perform public.mhidas_ticket_write_cascade_audit_v3(
    'partner',v_after.partner_id,null,null,
    encode(digest(v_after.partner_id::text,'sha256'),'hex'),
    null,v_after.partner_id,null,'partner_status_mutated_v3',
    v_before.partner_status,v_after.partner_status,v_after.lock_version,
    jsonb_build_object('status',v_before.partner_status,'lock_version',v_before.lock_version),
    jsonb_build_object('status',v_after.partner_status,'lock_version',v_after.lock_version),
    p_evidence_hash,'partner lifecycle mutation',p_correlation_id,
    p_idempotency_key,v_receipt.receipt_id,null,null
  );

  perform public.mhidas_ticket_complete_operation_receipt_v2(
    v_receipt.receipt_id,v_after.partner_id,v_after.partner_status,
    v_after.lock_version,
    encode(digest(v_after.partner_id::text || ':' || v_request_hash,'sha256'),'hex')
  );

  return v_after;
end;
$mhidas_plpgsql$;

create function public.mhidas_admin_retire_event_ticket_retention_policy_v3(
  p_policy_id uuid,
  p_expected_lock_version integer,
  p_pause_dependent_channels boolean,
  p_evidence_hash text,
  p_reason_hash text,
  p_correlation_id text,
  p_idempotency_key text
)
returns public.event_ticket_retention_policy_versions
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_admin_user_id uuid := auth.uid();
  v_before public.event_ticket_retention_policy_versions%rowtype;
  v_after public.event_ticket_retention_policy_versions%rowtype;
  v_channel public.event_ticket_commercial_channels%rowtype;
  v_receipt record;
  v_request_hash text;
  v_retention record;
begin
  if v_admin_user_id is null
    or not public.mhidas_is_useclubbers_admin_v1(v_admin_user_id) then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED';
  end if;

  select * into strict v_before
  from public.event_ticket_retention_policy_versions p
  where p.retention_policy_version_id = p_policy_id
  for update;

  if v_before.policy_status <> 'active'
    or v_before.lock_version <> p_expected_lock_version then
    raise exception 'RETENTION_POLICY_STATE_OR_LOCK_MISMATCH';
  end if;

  v_request_hash := public.mhidas_ticket_request_hash_v2(jsonb_build_object(
    'policy_id',p_policy_id,
    'expected_lock_version',p_expected_lock_version,
    'pause_dependent_channels',p_pause_dependent_channels,
    'evidence_hash',p_evidence_hash,
    'reason_hash',p_reason_hash
  ));

  select * into strict v_retention
  from public.mhidas_ticket_resolve_retention_policy_v2(
    'commercial_governance','BR','operation_receipt'
  );

  select * into v_receipt
  from public.mhidas_ticket_reserve_operation_receipt_v5(
    'retention_policy_mutation','user',v_admin_user_id,null,
    'retire_retention_policy_v3',p_idempotency_key,'retention_policy',
    p_policy_id,p_expected_lock_version,v_request_hash,p_policy_id,
    'retired',p_expected_lock_version + 1,null,null,null,
    v_retention.retention_policy_version_id,
    now() + make_interval(days => v_retention.retention_days)
  );

  if not v_receipt.reservation_owner then
    select * into strict v_after
    from public.event_ticket_retention_policy_versions p
    where p.retention_policy_version_id = v_receipt.result_id;
    return v_after;
  end if;

  if exists (
    select 1 from public.event_ticket_commercial_channels c
    where c.retention_policy_version_id = p_policy_id
      and c.channel_status = 'active'
  ) and not p_pause_dependent_channels then
    raise exception 'RETENTION_POLICY_ACTIVE_CHANNEL_CASCADE_REQUIRED';
  end if;

  perform set_config('app.mhidas_ticket_actor_role','useclubbers_admin',true);
  perform set_config('app.mhidas_ticket_actor_user_id',v_admin_user_id::text,true);

  for v_channel in
    select c.* from public.event_ticket_commercial_channels c
    where c.retention_policy_version_id = p_policy_id
      and c.channel_status = 'active'
    for update
  loop
    update public.event_ticket_commercial_channels c
    set channel_status = 'paused', paused_by_admin_user_id = v_admin_user_id,
        paused_at = now(), updated_at = now(), lock_version = c.lock_version + 1
    where c.channel_id = v_channel.channel_id;

    perform public.mhidas_ticket_write_cascade_audit_v3(
      'channel',v_channel.channel_id,'retention_policy',p_policy_id,
      encode(digest(v_channel.channel_id::text,'sha256'),'hex'),
      v_channel.canonical_event_id,v_channel.partner_id,v_channel.channel_id,
      'channel_paused_by_retention_policy_retirement_v3',
      v_channel.channel_status,'paused',v_channel.lock_version + 1,
      jsonb_build_object('status',v_channel.channel_status),
      jsonb_build_object('status','paused'),p_evidence_hash,
      'retention policy cascade',p_correlation_id,
      p_idempotency_key || ':channel:' || v_channel.channel_id::text,
      v_receipt.receipt_id,null,null
    );
  end loop;

  update public.event_ticket_retention_policy_versions p
  set policy_status = 'retired', retired_at = now(),
      lifecycle_evidence_hash = p_evidence_hash,
      lifecycle_reason_hash = p_reason_hash,
      lock_version = p.lock_version + 1
  where p.retention_policy_version_id = p_policy_id
  returning * into v_after;

  perform public.mhidas_ticket_write_cascade_audit_v3(
    'retention_policy',v_after.retention_policy_version_id,null,null,
    encode(digest(v_after.retention_policy_version_id::text,'sha256'),'hex'),
    null,null,null,'retention_policy_retired_v3',v_before.policy_status,
    v_after.policy_status,v_after.lock_version,
    jsonb_build_object('status',v_before.policy_status,'lock_version',v_before.lock_version),
    jsonb_build_object('status',v_after.policy_status,'lock_version',v_after.lock_version),
    p_evidence_hash,'retention policy lifecycle',p_correlation_id,
    p_idempotency_key,v_receipt.receipt_id,null,null
  );

  perform public.mhidas_ticket_complete_operation_receipt_v2(
    v_receipt.receipt_id,v_after.retention_policy_version_id,
    v_after.policy_status,v_after.lock_version,
    encode(digest(v_after.retention_policy_version_id::text || ':' || v_request_hash,'sha256'),'hex')
  );

  return v_after;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 55. EXPLICIT EXECUTE PRIVILEGE MATRIX FOR SECURITY DEFINER BOUNDARIES
-- =============================================================================

revoke all on function public.mhidas_ticket_reserve_operation_receipt_v5(text,text,uuid,text,text,text,text,uuid,integer,text,uuid,text,integer,uuid,uuid,text,uuid,timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_ticket_write_credential_context_audit_v1(uuid,uuid,uuid,uuid,text,text,text,text,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_ticket_issue_verified_credential_context_v2(uuid,uuid,text,text,text,text,text,text,text,integer,text,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_consume_verified_credential_context_v3(uuid,uuid,uuid,text,uuid,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_admin_revoke_verified_credential_context_v2(uuid,text,text,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_record_event_ticket_purchase_signal_v7(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text)
  from public, anon, authenticated;
revoke all on function public.mhidas_ticket_apply_minimization_rule_v1(text,text,text,text,text,boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_run_event_ticket_governance_retention_batch_v3(uuid,integer,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_admin_mutate_commercial_partner_status_v3(uuid,integer,text,boolean,text,text,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_admin_retire_event_ticket_retention_policy_v3(uuid,integer,boolean,text,text,text,text)
  from public, anon, authenticated, service_role;

-- Repair the v4.8.104 boundaries that otherwise retain PUBLIC execute.
revoke all on function public.mhidas_ticket_consume_verified_credential_context_v2(uuid,uuid,text,uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_ticket_write_cascade_audit_v3(text,uuid,text,uuid,text,uuid,uuid,uuid,text,text,text,integer,jsonb,jsonb,text,text,text,text,uuid,uuid,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_ticket_fail_operation_receipt_v2(uuid,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_ticket_classify_operation_receipt_v2(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_ticket_issue_verified_credential_context_v1(uuid,text,text,text,text,text,text,text,integer)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_record_event_ticket_purchase_signal_v6(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_run_event_ticket_governance_retention_batch_v2(uuid,integer,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_admin_mutate_commercial_partner_status_v2(uuid,integer,text,boolean,text,text,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.mhidas_admin_retire_event_ticket_retention_policy_v2(uuid,integer,boolean,text,text,text,text)
  from public, anon, authenticated, service_role;

-- Only externally callable boundaries receive grants. Internal helpers remain
-- owner-only after REVOKE ALL.
grant execute on function public.mhidas_ticket_issue_verified_credential_context_v2(uuid,uuid,text,text,text,text,text,text,text,integer,text,text)
  to service_role;
grant execute on function public.mhidas_record_event_ticket_purchase_signal_v7(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text)
  to service_role;
grant execute on function public.mhidas_admin_revoke_verified_credential_context_v2(uuid,text,text,text,text)
  to authenticated;
grant execute on function public.mhidas_run_event_ticket_governance_retention_batch_v3(uuid,integer,text,text)
  to authenticated;
grant execute on function public.mhidas_admin_mutate_commercial_partner_status_v3(uuid,integer,text,boolean,text,text,text,text)
  to authenticated;
grant execute on function public.mhidas_admin_retire_event_ticket_retention_policy_v3(uuid,integer,boolean,text,text,text,text)
  to authenticated;

-- =============================================================================
-- 56. STATIC EVIDENCE AND NEGATIVE TEST CONTRACT
-- =============================================================================

create temporary table mhidas_v4106_eighth_adjustment_evidence (
  finding_key text primary key,
  correction_status text not null,
  evidence_tokens text[] not null,
  negative_test_key text not null,
  promotion_blocked boolean not null
) on commit drop;

insert into mhidas_v4106_eighth_adjustment_evidence (
  finding_key, correction_status, evidence_tokens,
  negative_test_key, promotion_blocked
) values
(
  'credential_bound_receipt_insert_violates_pair_presence',
  'corrected_in_protected_draft',
  array['receipt v5','integration credential atomic pair','no post insert update'],
  'reject_half_present_credential_pair', true
),
(
  'class_specific_retention_policies_not_seeded',
  'corrected_in_protected_draft',
  array['operation_receipt active policy','commercial_audit active policy','fail closed count'],
  'reject_ambiguous_class_policy', true
),
(
  'new_security_definer_functions_keep_public_execute',
  'corrected_in_protected_draft',
  array['explicit revoke all','boundary grant matrix','internal owner only'],
  'reject_public_execute_on_internal_helper', true
),
(
  'trusted_signal_v6_nests_legacy_receipt_and_audit_path',
  'corrected_in_protected_draft',
  array['writer v7','single receipt','direct signal insert','credential audit lineage'],
  'reject_nested_legacy_receipt', true
),
(
  'credential_context_lifecycle_has_no_receipt_or_audit_lineage',
  'corrected_in_protected_draft',
  array['credential context audit writer','issuance receipt','consumption receipt lineage','revocation receipt'],
  'reject_context_mutation_without_receipt', true
),
(
  'credential_context_issuance_retry_is_not_idempotent',
  'corrected_in_protected_draft',
  array['semantic issue unique index','issue v2 receipt replay','durable context return'],
  'reject_context_retry_payload_drift', true
),
(
  'retention_minimization_rules_are_declarative_only',
  'corrected_in_protected_draft',
  array['closed field matrix','minimization executor','receipt and audit application'],
  'reject_unknown_minimization_field', true
),
(
  'governance_retention_batch_v2_lacks_durable_run_and_idempotency',
  'corrected_in_protected_draft',
  array['retention batch v3','durable run','terminal receipt','result audit'],
  'reject_retention_batch_replay_drift', true
),
(
  'cascade_audit_replacements_are_missing',
  'corrected_in_protected_draft',
  array['partner status v3','retention retire v3','cascade audit v3','lock version'],
  'reject_legacy_admin_mutation_contract', true
);

do $mhidas_v4106_eighth_adjustment_self_check$
declare
  v_count integer;
  v_unblocked integer;
begin
  select count(*) into v_count
  from mhidas_v4106_eighth_adjustment_evidence;

  select count(*) into v_unblocked
  from mhidas_v4106_eighth_adjustment_evidence
  where promotion_blocked = false;

  if v_count <> 9 then
    raise exception 'EIGHTH_ADJUSTMENT_EVIDENCE_COUNT_MISMATCH: %', v_count;
  end if;

  if v_unblocked <> 0 then
    raise exception 'SIXTH_CORRECTED_DRAFT_PROMOTION_MUST_REMAIN_BLOCKED';
  end if;

  if to_regprocedure('public.mhidas_ticket_reserve_operation_receipt_v5(text,text,uuid,text,text,text,text,uuid,integer,text,uuid,text,integer,uuid,uuid,text,uuid,timestamptz)') is null
    or to_regprocedure('public.mhidas_ticket_issue_verified_credential_context_v2(uuid,uuid,text,text,text,text,text,text,text,integer,text,text)') is null
    or to_regprocedure('public.mhidas_record_event_ticket_purchase_signal_v7(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,bigint,bigint,text,text,jsonb,text)') is null
    or to_regprocedure('public.mhidas_run_event_ticket_governance_retention_batch_v3(uuid,integer,text,text)') is null
    or to_regprocedure('public.mhidas_admin_mutate_commercial_partner_status_v3(uuid,integer,text,boolean,text,text,text,text)') is null
    or to_regprocedure('public.mhidas_admin_retire_event_ticket_retention_policy_v3(uuid,integer,boolean,text,text,text,text)') is null then
    raise exception 'V4_8_106_REQUIRED_RPC_MISSING';
  end if;
end;
$mhidas_v4106_eighth_adjustment_self_check$;

-- =============================================================================
-- 57. EXPLICIT PROTECTED-DRAFT DECISION
-- =============================================================================

-- draft_decision=sixth_corrected_adjusted_draft_ready_for_seventh_structural_review
-- parsed_postgres_statement_count=442
-- corrected_adjustments=9
-- critical_corrections=4
-- high_corrections=5
-- promotion_allowed=False
-- executable_migration_created=False
-- sql_moved_to_supabase_migrations=False
-- supabase_operation_performed=False
-- database_write_performed=False
-- commercial_channel_activated=False
-- public_event_page_changed=False
-- v4_8_104_fifth_corrected_sql_changed=False
-- new_structural_review_required=True
-- external_prerequisites_open=True

rollback;
