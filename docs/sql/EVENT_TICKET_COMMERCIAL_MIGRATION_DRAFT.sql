-- docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_DRAFT.sql
--
-- Version: v4.8.87-event-ticket-commercial-migration-draft-safe
-- Source plan: v4.8.86-event-ticket-commercial-schema-plan-safe
--
-- DRAFT ONLY. DO NOT EXECUTE.
--
-- This file is deliberately stored under docs/sql and must never be moved to
-- supabase/migrations without a separate structural review, production-schema
-- inventory, approved hash and explicit migration authorization.
--
-- Safety layers:
-- 1. An unconditional exception is raised before every DDL or DML statement.
-- 2. The draft is wrapped in a transaction.
-- 3. The file ends with ROLLBACK and contains no COMMIT.
-- 4. No public database view, public ticket button or commercial activation is created.
-- 5. Legacy commercial records can only become candidate, approved-request or draft data.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local idle_in_transaction_session_timeout = '60s';

do $mhidas_draft_execution_guard$
begin
  raise exception using
    errcode = 'P0001',
    message = 'MHIDAS v4.8.87 DRAFT ONLY: execution is intentionally blocked before all DDL and DML';
end
$mhidas_draft_execution_guard$;

-- ============================================================================
-- PHASE 1 — REQUIRED PREFLIGHT EVIDENCE
-- ============================================================================
--
-- Before a future executable migration is created, all items below must exist:
-- - fresh production schema dump and hash;
-- - data backup and row counts for the listed legacy tables;
-- - approved event_group_id -> canonical_event_id mapping artifact;
-- - approved verified-partner registry decision;
-- - approved secret-manager contract for tracking_secret_ref;
-- - approved retention and cleanup job;
-- - frozen admin authorization context contract;
-- - trusted conversion signature and replay-protection contract;
-- - regression test for canonical_event_sources authenticated reads.
--
-- This draft intentionally does not satisfy those operational prerequisites.

create extension if not exists pgcrypto;

-- ============================================================================
-- PHASE 2A — EXTEND OFFICIAL EVENT REFERENCES WITHOUT DUPLICATING PROVENANCE
-- ============================================================================

alter table public.canonical_event_sources
  add column if not exists reference_status text not null default 'candidate',
  add column if not exists reference_domain text,
  add column if not exists confidence_score numeric(5, 2),
  add column if not exists discovered_automatically boolean not null default false,
  add column if not exists validated_at timestamptz,
  add column if not exists validated_by_role text,
  add column if not exists validated_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

do $mhidas_canonical_source_constraints$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'canonical_event_sources_reference_status_check'
      and conrelid = 'public.canonical_event_sources'::regclass
  ) then
    alter table public.canonical_event_sources
      add constraint canonical_event_sources_reference_status_check
      check (reference_status in ('candidate', 'validated', 'rejected', 'stale'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'canonical_event_sources_reference_domain_check'
      and conrelid = 'public.canonical_event_sources'::regclass
  ) then
    alter table public.canonical_event_sources
      add constraint canonical_event_sources_reference_domain_check
      check (
        reference_domain is null
        or (
          reference_domain = lower(reference_domain)
          and reference_domain ~ '^[a-z0-9.-]+$'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'canonical_event_sources_confidence_score_check'
      and conrelid = 'public.canonical_event_sources'::regclass
  ) then
    alter table public.canonical_event_sources
      add constraint canonical_event_sources_confidence_score_check
      check (
        confidence_score is null
        or (confidence_score >= 0 and confidence_score <= 100)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'canonical_event_sources_validated_by_role_check'
      and conrelid = 'public.canonical_event_sources'::regclass
  ) then
    alter table public.canonical_event_sources
      add constraint canonical_event_sources_validated_by_role_check
      check (
        validated_by_role is null
        or validated_by_role in ('automation', 'useclubbers_admin')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'canonical_event_sources_validation_consistency_check'
      and conrelid = 'public.canonical_event_sources'::regclass
  ) then
    alter table public.canonical_event_sources
      add constraint canonical_event_sources_validation_consistency_check
      check (
        reference_status <> 'validated'
        or (
          source_url ~* '^https://'
          and reference_domain is not null
          and confidence_score is not null
          and validated_at is not null
          and validated_by_role is not null
          and (
            validated_by_role <> 'useclubbers_admin'
            or validated_by_user_id is not null
          )
        )
      );
  end if;
end
$mhidas_canonical_source_constraints$;

create index if not exists canonical_event_sources_official_reference_idx
  on public.canonical_event_sources (
    canonical_event_id,
    reference_status,
    authority_score desc
  );

create index if not exists canonical_event_sources_reference_domain_idx
  on public.canonical_event_sources (reference_domain, reference_status);

create or replace function public.mhidas_touch_canonical_event_source_reference_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if
    new.reference_status is distinct from old.reference_status
    or new.reference_domain is distinct from old.reference_domain
    or new.confidence_score is distinct from old.confidence_score
    or new.discovered_automatically is distinct from old.discovered_automatically
    or new.validated_at is distinct from old.validated_at
    or new.validated_by_role is distinct from old.validated_by_role
    or new.validated_by_user_id is distinct from old.validated_by_user_id
  then
    new.updated_at := now();
  end if;

  return new;
end
$function$;

drop trigger if exists canonical_event_sources_reference_updated_at
  on public.canonical_event_sources;

create trigger canonical_event_sources_reference_updated_at
before update of
  reference_status,
  reference_domain,
  confidence_score,
  discovered_automatically,
  validated_at,
  validated_by_role,
  validated_by_user_id
on public.canonical_event_sources
for each row
execute function public.mhidas_touch_canonical_event_source_reference_updated_at();

-- SECURITY REVIEW REQUIRED BEFORE A REAL MIGRATION:
-- canonical_event_sources currently has authenticated row-level reads. Because
-- PostgreSQL RLS does not hide columns, an executable migration must replace
-- broad table SELECT privileges with an audited column-level allowlist before
-- audit-only columns can be considered protected.
revoke select on public.canonical_event_sources from authenticated;

grant select (
  id,
  canonical_event_id,
  source_key,
  source_kind,
  provider_key,
  external_event_id,
  source_url,
  authority_score,
  ingestion_mode,
  integration_status,
  source_payload_summary,
  last_seen_at,
  created_at,
  reference_status,
  reference_domain
) on public.canonical_event_sources to authenticated;

-- ============================================================================
-- SHARED TIMESTAMP FUNCTION
-- ============================================================================

create or replace function public.mhidas_event_ticket_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  new.updated_at := now();
  return new;
end
$function$;

-- ============================================================================
-- PHASE 2B — PARTNERSHIP REQUESTS
-- ============================================================================

create table if not exists public.event_ticket_partnership_requests (
  request_id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid references public.canonical_events(id) on delete set null,
  event_slug_snapshot text,
  event_name_snapshot text,
  event_date_snapshot date,
  city_snapshot text,
  state_snapshot text,
  venue_name_snapshot text,
  partner_id uuid,
  submitted_by_user_id uuid references auth.users(id) on delete set null,
  partner_type text not null default 'other',
  partner_display_name text not null,
  request_type text not null,
  request_status text not null default 'pending',
  current_sales_url text,
  ticketing_provider_key text,
  commercial_contact_name text,
  commercial_contact_email text,
  commercial_contact_whatsapp text,
  proposed_benefit text,
  commercial_notes text,
  admin_notes text,
  client_submission_key text not null,
  reviewed_by_admin_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint event_ticket_partnership_requests_partner_type_check
    check (
      partner_type in (
        'agency',
        'event',
        'artist',
        'label',
        'club',
        'producer',
        'ticketing',
        'other'
      )
    ),
  constraint event_ticket_partnership_requests_request_type_check
    check (
      request_type in (
        'ticket_sales_partnership',
        'affiliate_campaign',
        'discount_campaign',
        'presale_campaign',
        'fixed_media_campaign',
        'hybrid_commercial_partnership'
      )
    ),
  constraint event_ticket_partnership_requests_status_check
    check (
      request_status in (
        'pending',
        'needs_info',
        'approved',
        'rejected',
        'withdrawn'
      )
    ),
  constraint event_ticket_partnership_requests_approved_check
    check (
      request_status <> 'approved'
      or (
        canonical_event_id is not null
        and reviewed_by_admin_user_id is not null
        and reviewed_at is not null
      )
    ),
  constraint event_ticket_partnership_requests_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists event_ticket_partnership_requests_client_submission_uq
  on public.event_ticket_partnership_requests (client_submission_key);

create index if not exists event_ticket_partnership_requests_status_idx
  on public.event_ticket_partnership_requests (request_status, created_at desc);

create index if not exists event_ticket_partnership_requests_partner_idx
  on public.event_ticket_partnership_requests (partner_id, created_at desc)
  where partner_id is not null;

create index if not exists event_ticket_partnership_requests_event_idx
  on public.event_ticket_partnership_requests (canonical_event_id, created_at desc)
  where canonical_event_id is not null;

drop trigger if exists event_ticket_partnership_requests_updated_at
  on public.event_ticket_partnership_requests;

create trigger event_ticket_partnership_requests_updated_at
before update on public.event_ticket_partnership_requests
for each row
execute function public.mhidas_event_ticket_touch_updated_at();

comment on table public.event_ticket_partnership_requests is
  'Partner submissions are separate from the definitive admin-controlled commercial channel. Approval never activates a public ticket link.';

-- ============================================================================
-- PHASE 2C — ADMIN-CONTROLLED COMMERCIAL CHANNELS
-- ============================================================================

create table if not exists public.event_ticket_commercial_channels (
  channel_id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  source_request_id uuid references public.event_ticket_partnership_requests(request_id) on delete set null,
  source_origin text not null,
  ticketing_provider_key text,
  ticketing_display_name text,
  authorized_domain text not null,
  commercial_url text not null,
  tracking_method text not null default 'none',
  tracking_secret_ref text,
  tracking_parameter_name text,
  remuneration_model text not null,
  commission_percent numeric(5, 2),
  commission_fixed_minor integer,
  currency text,
  authorization_reference text not null,
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
  created_at timestamptz not null default now(),
  authorized_at timestamptz,
  activated_at timestamptz,
  paused_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  lock_version integer not null default 0,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  constraint event_ticket_commercial_channels_source_origin_check
    check (
      source_origin in (
        'admin_entry',
        'approved_partner_request',
        'commercial_contract',
        'partner_api_submission'
      )
    ),
  constraint event_ticket_commercial_channels_authorized_domain_check
    check (
      authorized_domain = lower(authorized_domain)
      and authorized_domain ~ '^[a-z0-9.-]+$'
    ),
  constraint event_ticket_commercial_channels_https_url_check
    check (commercial_url ~* '^https://[^[:space:]]+$'),
  constraint event_ticket_commercial_channels_tracking_method_check
    check (
      tracking_method in (
        'query_parameter',
        'coupon_code',
        'affiliate_id',
        'path_segment',
        'postback',
        'webhook',
        'partner_api',
        'manual_report',
        'none'
      )
    ),
  constraint event_ticket_commercial_channels_secret_reference_check
    check (
      tracking_method not in ('postback', 'webhook', 'partner_api')
      or tracking_secret_ref is not null
    ),
  constraint event_ticket_commercial_channels_remuneration_model_check
    check (
      remuneration_model in (
        'commission_percent',
        'commission_fixed_per_ticket',
        'service_fee_share',
        'fixed_campaign',
        'hybrid',
        'licensing',
        'no_remuneration'
      )
    ),
  constraint event_ticket_commercial_channels_commission_percent_check
    check (
      commission_percent is null
      or (commission_percent >= 0 and commission_percent <= 100)
    ),
  constraint event_ticket_commercial_channels_commission_fixed_check
    check (
      commission_fixed_minor is null
      or commission_fixed_minor >= 0
    ),
  constraint event_ticket_commercial_channels_currency_check
    check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint event_ticket_commercial_channels_remuneration_fields_check
    check (
      (
        remuneration_model = 'commission_percent'
        and commission_percent is not null
      )
      or (
        remuneration_model in (
          'commission_fixed_per_ticket',
          'service_fee_share'
        )
        and commission_fixed_minor is not null
        and currency is not null
      )
      or (
        remuneration_model = 'hybrid'
        and (
          commission_percent is not null
          or commission_fixed_minor is not null
        )
      )
      or remuneration_model in (
        'fixed_campaign',
        'licensing'
      )
      or (
        remuneration_model = 'no_remuneration'
        and commission_percent is null
        and commission_fixed_minor is null
      )
    ),
  constraint event_ticket_commercial_channels_validity_check
    check (
      authorization_ends_at is null
      or authorization_ends_at > authorization_starts_at
    ),
  constraint event_ticket_commercial_channels_priority_check
    check (public_priority >= 0),
  constraint event_ticket_commercial_channels_status_check
    check (
      channel_status in (
        'draft',
        'authorized',
        'active',
        'paused',
        'expired',
        'revoked'
      )
    ),
  constraint event_ticket_commercial_channels_status_evidence_check
    check (
      (
        channel_status = 'draft'
      )
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
      )
      or (
        channel_status = 'paused'
        and paused_by_admin_user_id is not null
        and paused_at is not null
      )
      or (
        channel_status = 'expired'
      )
      or (
        channel_status = 'revoked'
        and revoked_by_admin_user_id is not null
        and revoked_at is not null
      )
    ),
  constraint event_ticket_commercial_channels_lock_version_check
    check (lock_version >= 0),
  constraint event_ticket_commercial_channels_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists event_ticket_commercial_channels_idempotency_uq
  on public.event_ticket_commercial_channels (idempotency_key);

create index if not exists event_ticket_commercial_channels_event_status_idx
  on public.event_ticket_commercial_channels (
    canonical_event_id,
    channel_status,
    public_priority
  );

create unique index if not exists event_ticket_commercial_channels_one_active_per_event_uq
  on public.event_ticket_commercial_channels (canonical_event_id)
  where channel_status = 'active';

create index if not exists event_ticket_commercial_channels_validity_idx
  on public.event_ticket_commercial_channels (
    channel_status,
    authorization_starts_at,
    authorization_ends_at
  );

create index if not exists event_ticket_commercial_channels_source_request_idx
  on public.event_ticket_commercial_channels (source_request_id)
  where source_request_id is not null;

comment on table public.event_ticket_commercial_channels is
  'Definitive monetized ticket destinations. Only USECLUBBERS admin server routes control the lifecycle. Partners never activate this table directly.';

-- ============================================================================
-- PHASE 2D — APPEND-ONLY COMMERCIAL AUDIT
-- ============================================================================

create table if not exists public.event_ticket_commercial_audit_log (
  audit_id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  channel_id uuid references public.event_ticket_commercial_channels(channel_id) on delete restrict,
  request_id uuid references public.event_ticket_partnership_requests(request_id) on delete set null,
  audit_action text not null,
  actor_role text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  previous_status text,
  next_status text,
  before_snapshot jsonb,
  after_snapshot jsonb,
  reason text not null,
  correlation_id text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  constraint event_ticket_commercial_audit_actor_role_check
    check (
      actor_role in (
        'useclubbers_admin',
        'automation',
        'system',
        'trusted_ticketing_integration'
      )
    ),
  constraint event_ticket_commercial_audit_before_object_check
    check (
      before_snapshot is null
      or jsonb_typeof(before_snapshot) = 'object'
    ),
  constraint event_ticket_commercial_audit_after_object_check
    check (
      after_snapshot is null
      or jsonb_typeof(after_snapshot) = 'object'
    ),
  constraint event_ticket_commercial_audit_target_check
    check (channel_id is not null or request_id is not null)
);

create unique index if not exists event_ticket_commercial_audit_idempotency_uq
  on public.event_ticket_commercial_audit_log (idempotency_key);

create index if not exists event_ticket_commercial_audit_channel_idx
  on public.event_ticket_commercial_audit_log (channel_id, created_at desc)
  where channel_id is not null;

create index if not exists event_ticket_commercial_audit_event_idx
  on public.event_ticket_commercial_audit_log (
    canonical_event_id,
    created_at desc
  );

create index if not exists event_ticket_commercial_audit_correlation_idx
  on public.event_ticket_commercial_audit_log (correlation_id);

create or replace function public.mhidas_event_ticket_commercial_audit_append_only_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  raise exception using
    errcode = '55000',
    message = 'event_ticket_commercial_audit_log is append-only';
end
$function$;

drop trigger if exists event_ticket_commercial_audit_append_only
  on public.event_ticket_commercial_audit_log;

create trigger event_ticket_commercial_audit_append_only
before update or delete on public.event_ticket_commercial_audit_log
for each row
execute function public.mhidas_event_ticket_commercial_audit_append_only_guard();

-- ============================================================================
-- PHASE 2E — CLICK ATTRIBUTION
-- ============================================================================

create table if not exists public.event_ticket_click_attributions (
  click_id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  channel_id uuid not null references public.event_ticket_commercial_channels(channel_id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  session_attribution_hash text,
  redirect_token_hash text not null,
  campaign_id text,
  destination_url_hash text not null,
  consent_basis text not null,
  clicked_at timestamptz not null default now(),
  retention_expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  constraint event_ticket_click_attributions_consent_basis_check
    check (
      consent_basis in (
        'consent',
        'contract',
        'legitimate_interest',
        'not_applicable'
      )
    ),
  constraint event_ticket_click_attributions_retention_check
    check (retention_expires_at > clicked_at),
  constraint event_ticket_click_attributions_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists event_ticket_click_attributions_redirect_token_uq
  on public.event_ticket_click_attributions (redirect_token_hash);

create index if not exists event_ticket_click_attributions_channel_time_idx
  on public.event_ticket_click_attributions (channel_id, clicked_at desc);

create index if not exists event_ticket_click_attributions_event_time_idx
  on public.event_ticket_click_attributions (
    canonical_event_id,
    clicked_at desc
  );

create index if not exists event_ticket_click_attributions_retention_idx
  on public.event_ticket_click_attributions (retention_expires_at);

comment on table public.event_ticket_click_attributions is
  'A click records an outbound commercial exit only. It is not a purchase, payment, confirmed revenue or commission event. Raw IP storage is forbidden.';

-- ============================================================================
-- PHASE 2F — PURCHASE AND CONVERSION SIGNALS
-- ============================================================================

create table if not exists public.event_ticket_purchase_signals (
  signal_id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  channel_id uuid references public.event_ticket_commercial_channels(channel_id) on delete set null,
  click_id uuid references public.event_ticket_click_attributions(click_id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  signal_type text not null,
  evidence_source text not null,
  trusted_evidence_verified boolean not null default false,
  external_transaction_reference_hash text,
  attribution_campaign_id text,
  gross_amount_minor integer,
  commission_amount_minor integer,
  currency text,
  recorded_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by_actor_role text,
  idempotency_key text not null,
  retention_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint event_ticket_purchase_signals_type_check
    check (
      signal_type in (
        'interest',
        'commercial_link_click',
        'self_declared_purchase',
        'attributed_conversion',
        'confirmed_conversion'
      )
    ),
  constraint event_ticket_purchase_signals_evidence_source_check
    check (
      evidence_source in (
        'clubber_action',
        'useclubbers_redirect',
        'coupon_report',
        'partner_report',
        'postback',
        'webhook',
        'partner_api'
      )
    ),
  constraint event_ticket_purchase_signals_amounts_check
    check (
      (gross_amount_minor is null or gross_amount_minor >= 0)
      and (
        commission_amount_minor is null
        or commission_amount_minor >= 0
      )
    ),
  constraint event_ticket_purchase_signals_currency_check
    check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint event_ticket_purchase_signals_confirmed_actor_check
    check (
      confirmed_by_actor_role is null
      or confirmed_by_actor_role in (
        'trusted_ticketing_integration',
        'useclubbers_admin'
      )
    ),
  constraint event_ticket_purchase_signals_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists event_ticket_purchase_signals_idempotency_uq
  on public.event_ticket_purchase_signals (idempotency_key);

create index if not exists event_ticket_purchase_signals_event_type_idx
  on public.event_ticket_purchase_signals (
    canonical_event_id,
    signal_type,
    recorded_at desc
  );

create unique index if not exists event_ticket_purchase_signals_transaction_uq
  on public.event_ticket_purchase_signals (
    external_transaction_reference_hash
  )
  where external_transaction_reference_hash is not null;

create index if not exists event_ticket_purchase_signals_user_event_idx
  on public.event_ticket_purchase_signals (
    user_id,
    canonical_event_id,
    recorded_at desc
  )
  where user_id is not null;

create or replace function public.mhidas_event_ticket_purchase_signal_confirmation_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if new.signal_type = 'confirmed_conversion' then
    if
      new.trusted_evidence_verified is distinct from true
      or new.external_transaction_reference_hash is null
      or new.confirmed_at is null
      or new.confirmed_by_actor_role not in (
        'trusted_ticketing_integration',
        'useclubbers_admin'
      )
    then
      raise exception using
        errcode = '23514',
        message = 'confirmed_conversion requires verified trusted evidence, transaction hash, timestamp and trusted actor';
    end if;
  else
    if
      new.gross_amount_minor is not null
      or new.commission_amount_minor is not null
      or new.currency is not null
      or new.confirmed_at is not null
      or new.confirmed_by_actor_role is not null
    then
      raise exception using
        errcode = '23514',
        message = 'only confirmed_conversion may contain finance or confirmation fields';
    end if;
  end if;

  if
    new.signal_type in ('attributed_conversion', 'confirmed_conversion')
    and new.external_transaction_reference_hash is null
  then
    raise exception using
      errcode = '23514',
      message = 'attributed and confirmed conversions require an external transaction reference hash';
  end if;

  if
    new.signal_type = 'commercial_link_click'
    and new.click_id is null
  then
    raise exception using
      errcode = '23514',
      message = 'commercial_link_click requires click_id';
  end if;

  if
    new.signal_type = 'self_declared_purchase'
    and new.evidence_source <> 'clubber_action'
  then
    raise exception using
      errcode = '23514',
      message = 'self_declared_purchase must use clubber_action evidence';
  end if;

  return new;
end
$function$;

drop trigger if exists event_ticket_purchase_signals_confirmation_guard
  on public.event_ticket_purchase_signals;

create trigger event_ticket_purchase_signals_confirmation_guard
before insert or update on public.event_ticket_purchase_signals
for each row
execute function public.mhidas_event_ticket_purchase_signal_confirmation_guard();

comment on table public.event_ticket_purchase_signals is
  'Separates interest, click, self-declared purchase, attributed conversion and confirmed conversion. self_declared_purchase is never confirmed revenue.';

-- ============================================================================
-- PHASE 2G — OFFICIAL PARTNER COMMUNICATIONS
-- ============================================================================

create table if not exists public.partner_official_communications (
  communication_id uuid primary key default gen_random_uuid(),
  partner_id uuid,
  canonical_event_id uuid references public.canonical_events(id) on delete set null,
  commercial_channel_id uuid references public.event_ticket_commercial_channels(channel_id) on delete set null,
  communication_type text not null,
  communication_status text not null default 'draft',
  title text not null,
  body text not null,
  benefit_code text,
  starts_at timestamptz,
  ends_at timestamptz,
  submitted_by_user_id uuid not null references auth.users(id) on delete restrict,
  approved_by_admin_user_id uuid references auth.users(id) on delete set null,
  published_by_admin_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint partner_official_communications_type_check
    check (
      communication_type in (
        'ticket_batch_change',
        'ticket_presale',
        'ticket_discount',
        'giveaway',
        'music_release',
        'lineup_update',
        'official_after',
        'location_notice',
        'schedule_change',
        'vip_experience',
        'promotional_code',
        'exclusive_content',
        'community_call'
      )
    ),
  constraint partner_official_communications_status_check
    check (
      communication_status in (
        'draft',
        'submitted',
        'needs_review',
        'approved',
        'published',
        'paused',
        'expired',
        'rejected'
      )
    ),
  constraint partner_official_communications_validity_check
    check (
      ends_at is null
      or starts_at is null
      or ends_at > starts_at
    ),
  constraint partner_official_communications_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists partner_official_communications_public_idx
  on public.partner_official_communications (
    communication_status,
    starts_at,
    ends_at
  );

create index if not exists partner_official_communications_partner_idx
  on public.partner_official_communications (partner_id, created_at desc)
  where partner_id is not null;

create index if not exists partner_official_communications_event_idx
  on public.partner_official_communications (
    canonical_event_id,
    created_at desc
  )
  where canonical_event_id is not null;

create or replace function public.mhidas_partner_official_communication_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  actor_role text := nullif(
    current_setting('mhidas.commercial_actor_role', true),
    ''
  );
  actor_user_id uuid;
  is_ticket_commercial boolean;
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '55000',
      message = 'partner_official_communications uses status transitions; hard delete is blocked';
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  is_ticket_commercial := new.communication_type in (
    'ticket_batch_change',
    'ticket_presale',
    'ticket_discount',
    'promotional_code'
  );

  if new.communication_status in ('approved', 'published', 'paused', 'expired', 'rejected') then
    if actor_role <> 'useclubbers_admin' then
      raise exception using
        errcode = '42501',
        message = 'only USECLUBBERS admin may review, publish, pause, expire or reject official communications';
    end if;

    begin
      actor_user_id := nullif(
        current_setting('mhidas.commercial_actor_user_id', true),
        ''
      )::uuid;
    exception
      when invalid_text_representation then
        raise exception using
          errcode = '22023',
          message = 'invalid mhidas.commercial_actor_user_id';
    end;

    if actor_user_id is null then
      raise exception using
        errcode = '42501',
        message = 'admin actor user id is required';
    end if;
  end if;

  if new.communication_status = 'published' then
    if new.published_by_admin_user_id is distinct from actor_user_id then
      raise exception using
        errcode = '23514',
        message = 'published_by_admin_user_id must match the admin execution context';
    end if;

    if is_ticket_commercial then
      if new.commercial_channel_id is null then
        raise exception using
          errcode = '23514',
          message = 'ticket-commercial communication requires a commercial channel';
      end if;

      if not exists (
        select 1
        from public.event_ticket_commercial_channels channel
        where channel.channel_id = new.commercial_channel_id
          and channel.channel_status = 'active'
          and now() >= channel.authorization_starts_at
          and (
            channel.authorization_ends_at is null
            or now() < channel.authorization_ends_at
          )
          and (
            new.canonical_event_id is null
            or channel.canonical_event_id = new.canonical_event_id
          )
      ) then
        raise exception using
          errcode = '23514',
          message = 'ticket-commercial communication requires an active valid channel for the same event';
      end if;
    end if;
  end if;

  return new;
end
$function$;

drop trigger if exists partner_official_communications_guard
  on public.partner_official_communications;

create trigger partner_official_communications_guard
before insert or update or delete on public.partner_official_communications
for each row
execute function public.mhidas_partner_official_communication_guard();

comment on table public.partner_official_communications is
  'Official communications are independent from ticket authorization. Partners submit; USECLUBBERS admin controls publication.';

-- ============================================================================
-- PHASE 3 — CHANNEL LIFECYCLE, ADMIN CONTEXT AND SAME-TRANSACTION AUDIT
-- ============================================================================

create or replace function public.mhidas_event_ticket_commercial_channel_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  actor_role text := nullif(
    current_setting('mhidas.commercial_actor_role', true),
    ''
  );
  actor_user_id uuid;
  operation_reason text := nullif(
    current_setting('mhidas.commercial_operation_reason', true),
    ''
  );
  correlation_id text := nullif(
    current_setting('mhidas.commercial_correlation_id', true),
    ''
  );
  commercial_host text;
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '55000',
      message = 'commercial channels are revocable but never hard-deleted';
  end if;

  if actor_role <> 'useclubbers_admin' then
    raise exception using
      errcode = '42501',
      message = 'commercial channel lifecycle requires USECLUBBERS admin context';
  end if;

  begin
    actor_user_id := nullif(
      current_setting('mhidas.commercial_actor_user_id', true),
      ''
    )::uuid;
  exception
    when invalid_text_representation then
      raise exception using
        errcode = '22023',
        message = 'invalid mhidas.commercial_actor_user_id';
  end;

  if actor_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'commercial admin actor user id is required';
  end if;

  if operation_reason is null or correlation_id is null then
    raise exception using
      errcode = '22023',
      message = 'commercial operation reason and correlation id are required';
  end if;

  commercial_host := lower(
    substring(new.commercial_url from '^https://([^/:?#]+)')
  );

  if commercial_host is null or commercial_host <> new.authorized_domain then
    raise exception using
      errcode = '23514',
      message = 'commercial URL host must exactly match authorized_domain';
  end if;

  if tg_op = 'INSERT' then
    if new.channel_status <> 'draft' then
      raise exception using
        errcode = '23514',
        message = 'a definitive commercial channel must be created as draft';
    end if;

    if new.created_by_admin_user_id is distinct from actor_user_id then
      raise exception using
        errcode = '23514',
        message = 'created_by_admin_user_id must match the admin execution context';
    end if;

    new.lock_version := 0;
    new.updated_at := now();
    return new;
  end if;

  if old.channel_status = 'revoked' then
    raise exception using
      errcode = '55000',
      message = 'revoked is terminal';
  end if;

  if
    new.canonical_event_id is distinct from old.canonical_event_id
    or new.created_by_admin_user_id is distinct from old.created_by_admin_user_id
    or new.idempotency_key is distinct from old.idempotency_key
    or new.source_origin is distinct from old.source_origin
  then
    raise exception using
      errcode = '23514',
      message = 'canonical identity, creator, idempotency key and source origin are immutable';
  end if;

  if not (
    new.channel_status = old.channel_status
    or (old.channel_status = 'draft' and new.channel_status in ('authorized', 'revoked'))
    or (old.channel_status = 'authorized' and new.channel_status in ('active', 'revoked'))
    or (old.channel_status = 'active' and new.channel_status in ('paused', 'expired', 'revoked'))
    or (old.channel_status = 'paused' and new.channel_status in ('active', 'expired', 'revoked'))
    or (old.channel_status = 'expired' and new.channel_status = 'revoked')
  ) then
    raise exception using
      errcode = '23514',
      message = 'commercial channel status transition is not allowed';
  end if;

  if old.channel_status <> new.channel_status then
    if new.channel_status = 'authorized' then
      if
        new.authorized_by_admin_user_id is distinct from actor_user_id
        or new.authorized_at is null
      then
        raise exception using
          errcode = '23514',
          message = 'authorization requires matching admin and timestamp';
      end if;
    elsif new.channel_status = 'active' then
      if
        new.activated_by_admin_user_id is distinct from actor_user_id
        or new.activated_at is null
        or new.authorized_by_admin_user_id is null
        or new.authorized_at is null
        or now() < new.authorization_starts_at
        or (
          new.authorization_ends_at is not null
          and now() >= new.authorization_ends_at
        )
      then
        raise exception using
          errcode = '23514',
          message = 'activation requires authorized evidence, matching admin and a current validity window';
      end if;
    elsif new.channel_status = 'paused' then
      if
        new.paused_by_admin_user_id is distinct from actor_user_id
        or new.paused_at is null
      then
        raise exception using
          errcode = '23514',
          message = 'pause requires matching admin and timestamp';
      end if;
    elsif new.channel_status = 'revoked' then
      if
        new.revoked_by_admin_user_id is distinct from actor_user_id
        or new.revoked_at is null
      then
        raise exception using
          errcode = '23514',
          message = 'revocation requires matching admin and timestamp';
      end if;
    end if;
  end if;

  new.lock_version := old.lock_version + 1;
  new.updated_at := now();

  return new;
end
$function$;

drop trigger if exists event_ticket_commercial_channels_guard
  on public.event_ticket_commercial_channels;

create trigger event_ticket_commercial_channels_guard
before insert or update or delete on public.event_ticket_commercial_channels
for each row
execute function public.mhidas_event_ticket_commercial_channel_guard();

create or replace function public.mhidas_event_ticket_commercial_channel_audit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  actor_role text := nullif(
    current_setting('mhidas.commercial_actor_role', true),
    ''
  );
  actor_user_id uuid := nullif(
    current_setting('mhidas.commercial_actor_user_id', true),
    ''
  )::uuid;
  operation_reason text := nullif(
    current_setting('mhidas.commercial_operation_reason', true),
    ''
  );
  correlation_id text := nullif(
    current_setting('mhidas.commercial_correlation_id', true),
    ''
  );
  audit_action text;
  audit_idempotency_key text;
  before_snapshot jsonb;
  after_snapshot jsonb;
begin
  audit_action := case
    when tg_op = 'INSERT' then 'channel_created'
    when old.channel_status is distinct from new.channel_status
      then 'channel_status_' || old.channel_status || '_to_' || new.channel_status
    else 'channel_updated'
  end;

  audit_idempotency_key :=
    'channel:' || new.channel_id::text || ':lock:' || new.lock_version::text;

  before_snapshot := case
    when tg_op = 'INSERT' then null
    else jsonb_build_object(
      'channel_id', old.channel_id,
      'canonical_event_id', old.canonical_event_id,
      'source_request_id', old.source_request_id,
      'source_origin', old.source_origin,
      'ticketing_provider_key', old.ticketing_provider_key,
      'ticketing_display_name', old.ticketing_display_name,
      'authorized_domain', old.authorized_domain,
      'tracking_method', old.tracking_method,
      'remuneration_model', old.remuneration_model,
      'authorization_starts_at', old.authorization_starts_at,
      'authorization_ends_at', old.authorization_ends_at,
      'public_priority', old.public_priority,
      'channel_status', old.channel_status,
      'disclosure_present', old.disclosure_text is not null,
      'lock_version', old.lock_version,
      'updated_at', old.updated_at
    )
  end;

  after_snapshot := jsonb_build_object(
    'channel_id', new.channel_id,
    'canonical_event_id', new.canonical_event_id,
    'source_request_id', new.source_request_id,
    'source_origin', new.source_origin,
    'ticketing_provider_key', new.ticketing_provider_key,
    'ticketing_display_name', new.ticketing_display_name,
    'authorized_domain', new.authorized_domain,
    'tracking_method', new.tracking_method,
    'remuneration_model', new.remuneration_model,
    'authorization_starts_at', new.authorization_starts_at,
    'authorization_ends_at', new.authorization_ends_at,
    'public_priority', new.public_priority,
    'channel_status', new.channel_status,
    'disclosure_present', new.disclosure_text is not null,
    'lock_version', new.lock_version,
    'updated_at', new.updated_at
  );

  insert into public.event_ticket_commercial_audit_log (
    canonical_event_id,
    channel_id,
    request_id,
    audit_action,
    actor_role,
    actor_user_id,
    previous_status,
    next_status,
    before_snapshot,
    after_snapshot,
    reason,
    correlation_id,
    idempotency_key
  ) values (
    new.canonical_event_id,
    new.channel_id,
    new.source_request_id,
    audit_action,
    actor_role,
    actor_user_id,
    case when tg_op = 'INSERT' then null else old.channel_status end,
    new.channel_status,
    before_snapshot,
    after_snapshot,
    operation_reason,
    correlation_id,
    audit_idempotency_key
  );

  return new;
end
$function$;

drop trigger if exists event_ticket_commercial_channels_audit
  on public.event_ticket_commercial_channels;

create trigger event_ticket_commercial_channels_audit
after insert or update on public.event_ticket_commercial_channels
for each row
execute function public.mhidas_event_ticket_commercial_channel_audit();

-- ============================================================================
-- PHASE 3B — DENY-BY-DEFAULT RLS AND PRIVILEGES
-- ============================================================================

alter table public.event_ticket_partnership_requests enable row level security;
alter table public.event_ticket_partnership_requests force row level security;

alter table public.event_ticket_commercial_channels enable row level security;
alter table public.event_ticket_commercial_channels force row level security;

alter table public.event_ticket_commercial_audit_log enable row level security;
alter table public.event_ticket_commercial_audit_log force row level security;

alter table public.event_ticket_click_attributions enable row level security;
alter table public.event_ticket_click_attributions force row level security;

alter table public.event_ticket_purchase_signals enable row level security;
alter table public.event_ticket_purchase_signals force row level security;

alter table public.partner_official_communications enable row level security;
alter table public.partner_official_communications force row level security;

revoke all on public.event_ticket_partnership_requests
  from public, anon, authenticated;
revoke all on public.event_ticket_commercial_channels
  from public, anon, authenticated;
revoke all on public.event_ticket_commercial_audit_log
  from public, anon, authenticated;
revoke all on public.event_ticket_click_attributions
  from public, anon, authenticated;
revoke all on public.event_ticket_purchase_signals
  from public, anon, authenticated;
revoke all on public.partner_official_communications
  from public, anon, authenticated;

revoke all on function public.mhidas_event_ticket_touch_updated_at()
  from public, anon, authenticated;
revoke all on function public.mhidas_touch_canonical_event_source_reference_updated_at()
  from public, anon, authenticated;
revoke all on function public.mhidas_event_ticket_commercial_audit_append_only_guard()
  from public, anon, authenticated;
revoke all on function public.mhidas_event_ticket_purchase_signal_confirmation_guard()
  from public, anon, authenticated;
revoke all on function public.mhidas_partner_official_communication_guard()
  from public, anon, authenticated;
revoke all on function public.mhidas_event_ticket_commercial_channel_guard()
  from public, anon, authenticated;
revoke all on function public.mhidas_event_ticket_commercial_channel_audit()
  from public, anon, authenticated;

-- No client RLS policy is created in this draft.
-- Partner and admin operations must use future protected server routes.
-- No public SQL view or SECURITY DEFINER function is created.

-- ============================================================================
-- PHASE 4 — LEGACY BACKFILL SHADOW-ONLY TEMPLATE
-- ============================================================================
--
-- The mapping table below is intentionally empty. A future migration must fill
-- it from an approved, hashed compatibility report. Exact canonical identity is
-- mandatory; fuzzy matching inside the migration is forbidden.

create temporary table mhidas_approved_event_group_canonical_map (
  event_group_id uuid primary key,
  canonical_event_id uuid not null,
  mapping_evidence text not null,
  approved_by_admin_user_id uuid not null
) on commit drop;

-- Foreign keys are intentionally omitted from the temporary review artifact.
-- The approved mapping loader must validate both UUIDs against their source
-- tables before the future backfill transaction starts.

-- Direct canonical identities may seed candidate references only.
insert into public.canonical_event_sources (
  canonical_event_id,
  source_key,
  source_kind,
  provider_key,
  external_event_id,
  source_url,
  authority_score,
  ingestion_mode,
  integration_status,
  source_payload_summary,
  last_seen_at,
  created_by,
  reference_status,
  reference_domain,
  confidence_score,
  discovered_automatically,
  updated_at
)
select
  event.id,
  'legacy:canonical_events:official_url:' || event.id::text,
  'official_event_site',
  event.primary_provider_key,
  event.primary_external_event_id,
  event.official_url,
  event.source_confidence_score,
  'manual_admin',
  'not_integrated',
  jsonb_build_object(
    'migration_batch', 'v4.8.87-draft',
    'legacy_source', 'canonical_events.official_url',
    'commercial_activation_allowed', false
  ),
  now(),
  event.created_by,
  'candidate',
  lower(substring(event.official_url from '^https://([^/:?#]+)')),
  event.source_confidence_score::numeric(5, 2),
  false,
  now()
from public.canonical_events event
where event.official_url ~* '^https://'
  and not exists (
    select 1
    from public.canonical_event_sources source
    where source.canonical_event_id = event.id
      and source.source_url = event.official_url
  );

insert into public.canonical_event_sources (
  canonical_event_id,
  source_key,
  source_kind,
  provider_key,
  external_event_id,
  source_url,
  authority_score,
  ingestion_mode,
  integration_status,
  source_payload_summary,
  last_seen_at,
  created_by,
  reference_status,
  reference_domain,
  confidence_score,
  discovered_automatically,
  updated_at
)
select
  event.id,
  'legacy:canonical_events:ticket_url:' || event.id::text,
  'ticketing_public_page',
  event.primary_provider_key,
  event.primary_external_event_id,
  event.ticket_url,
  event.source_confidence_score,
  'public_reference',
  'not_integrated',
  jsonb_build_object(
    'migration_batch', 'v4.8.87-draft',
    'legacy_source', 'canonical_events.ticket_url',
    'reference_candidate_only', true,
    'commercial_activation_allowed', false
  ),
  now(),
  event.created_by,
  'candidate',
  lower(substring(event.ticket_url from '^https://([^/:?#]+)')),
  event.source_confidence_score::numeric(5, 2),
  true,
  now()
from public.canonical_events event
where event.ticket_url ~* '^https://'
  and not exists (
    select 1
    from public.canonical_event_sources source
    where source.canonical_event_id = event.id
      and source.source_url = event.ticket_url
  );

-- Block ambiguous legacy rows until the approved mapping is supplied.
do $mhidas_legacy_mapping_preflight$
begin
  if exists (
    select 1
    from public.partner_ticket_requests request
    where request.event_group_id is not null
      and not exists (
        select 1
        from mhidas_approved_event_group_canonical_map mapping
        where mapping.event_group_id = request.event_group_id
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'legacy partnership requests require approved event_group_id to canonical_event_id mapping';
  end if;

  if exists (
    select 1
    from public.event_groups event_group
    where event_group.partner_ticket_url is not null
      and not exists (
        select 1
        from mhidas_approved_event_group_canonical_map mapping
        where mapping.event_group_id = event_group.group_id
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'legacy commercial channel candidates require approved canonical mapping';
  end if;

  if exists (
    select 1
    from public.event_ticket_intents intent
    where intent.status = 'ticket_acquired'
      and not exists (
        select 1
        from mhidas_approved_event_group_canonical_map mapping
        where mapping.event_group_id = intent.event_group_id
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'legacy ticket_acquired signals require approved canonical mapping';
  end if;
end
$mhidas_legacy_mapping_preflight$;

insert into public.event_ticket_partnership_requests (
  canonical_event_id,
  event_name_snapshot,
  event_date_snapshot,
  city_snapshot,
  state_snapshot,
  venue_name_snapshot,
  submitted_by_user_id,
  partner_type,
  partner_display_name,
  request_type,
  request_status,
  current_sales_url,
  ticketing_provider_key,
  commercial_contact_name,
  commercial_contact_email,
  commercial_contact_whatsapp,
  proposed_benefit,
  commercial_notes,
  admin_notes,
  client_submission_key,
  reviewed_by_admin_user_id,
  reviewed_at,
  created_at,
  updated_at,
  metadata
)
select
  mapping.canonical_event_id,
  legacy.event_name,
  legacy.event_date,
  legacy.city,
  legacy.state,
  legacy.venue_name,
  legacy.requested_by_user_id,
  legacy.partner_type,
  legacy.partner_name,
  case legacy.request_type
    when 'discount' then 'discount_campaign'
    when 'pre_sale' then 'presale_campaign'
    else 'ticket_sales_partnership'
  end,
  case legacy.request_status
    when 'pending' then 'pending'
    when 'needs_info' then 'needs_info'
    when 'rejected' then 'rejected'
    when 'approved' then 'approved'
    when 'active' then 'approved'
    when 'paused' then 'approved'
    when 'expired' then 'approved'
    else 'needs_info'
  end,
  coalesce(legacy.requested_ticket_url, legacy.current_ticket_url),
  null,
  legacy.contact_name,
  legacy.contact_email,
  legacy.contact_whatsapp,
  legacy.proposed_benefit,
  legacy.commercial_notes,
  legacy.admin_notes,
  'legacy:partner_ticket_requests:' || legacy.request_id::text,
  legacy.reviewed_by,
  legacy.reviewed_at,
  legacy.created_at,
  legacy.updated_at,
  jsonb_build_object(
    'migration_batch', 'v4.8.87-draft',
    'legacy_request_id', legacy.request_id,
    'legacy_event_group_id', legacy.event_group_id,
    'legacy_request_status', legacy.request_status,
    'legacy_activated_by', legacy.activated_by,
    'legacy_activated_at', legacy.activated_at,
    'legacy_expires_at', legacy.expires_at,
    'public_activation_preserved', false
  )
from public.partner_ticket_requests legacy
left join mhidas_approved_event_group_canonical_map mapping
  on mapping.event_group_id = legacy.event_group_id
where not exists (
  select 1
  from public.event_ticket_partnership_requests current_request
  where current_request.client_submission_key =
    'legacy:partner_ticket_requests:' || legacy.request_id::text
)
and (
  legacy.request_status not in ('approved', 'active', 'paused', 'expired')
  or (
    mapping.canonical_event_id is not null
    and legacy.reviewed_by is not null
    and legacy.reviewed_at is not null
  )
);

do $mhidas_legacy_channel_draft_backfill$
declare
  candidate record;
begin
  for candidate in
    select
      mapping.canonical_event_id,
      mapping.approved_by_admin_user_id,
      legacy.group_id,
      legacy.partner_ticket_source,
      legacy.partner_ticket_partner_name,
      legacy.partner_ticket_url,
      legacy.partner_ticket_updated_at,
      legacy.partner_ticket_expires_at,
      legacy.partner_ticket_status,
      legacy.partner_ticket_button_label,
      legacy.partner_ticket_is_featured
    from public.event_groups legacy
    join mhidas_approved_event_group_canonical_map mapping
      on mapping.event_group_id = legacy.group_id
    where legacy.partner_ticket_url ~* '^https://'
      and not exists (
        select 1
        from public.event_ticket_commercial_channels current_channel
        where current_channel.idempotency_key =
          'legacy:event_groups:' || legacy.group_id::text || ':draft-channel'
      )
  loop
    perform set_config(
      'mhidas.commercial_actor_role',
      'useclubbers_admin',
      true
    );
    perform set_config(
      'mhidas.commercial_actor_user_id',
      candidate.approved_by_admin_user_id::text,
      true
    );
    perform set_config(
      'mhidas.commercial_operation_reason',
      'Legacy commercial field imported as draft candidate; admin revalidation required',
      true
    );
    perform set_config(
      'mhidas.commercial_correlation_id',
      'legacy:event_groups:' || candidate.group_id::text || ':draft-channel',
      true
    );

    insert into public.event_ticket_commercial_channels (
      canonical_event_id,
      source_origin,
      ticketing_display_name,
      authorized_domain,
      commercial_url,
      tracking_method,
      remuneration_model,
      authorization_reference,
      authorization_starts_at,
      authorization_ends_at,
      public_priority,
      channel_status,
      created_by_admin_user_id,
      created_at,
      updated_at,
      idempotency_key,
      metadata
    ) values (
      candidate.canonical_event_id,
      case candidate.partner_ticket_source
        when 'partner_request' then 'approved_partner_request'
        else 'admin_entry'
      end,
      candidate.partner_ticket_partner_name,
      lower(substring(candidate.partner_ticket_url from '^https://([^/:?#]+)')),
      candidate.partner_ticket_url,
      'none',
      'no_remuneration',
      'legacy:event_groups:' || candidate.group_id::text ||
        ':admin_revalidation_required',
      coalesce(candidate.partner_ticket_updated_at, now()),
      candidate.partner_ticket_expires_at,
      100,
      'draft',
      candidate.approved_by_admin_user_id,
      coalesce(candidate.partner_ticket_updated_at, now()),
      coalesce(candidate.partner_ticket_updated_at, now()),
      'legacy:event_groups:' || candidate.group_id::text || ':draft-channel',
      jsonb_build_object(
        'migration_batch', 'v4.8.87-draft',
        'legacy_event_group_id', candidate.group_id,
        'legacy_partner_ticket_status', candidate.partner_ticket_status,
        'legacy_partner_ticket_source', candidate.partner_ticket_source,
        'legacy_button_label', candidate.partner_ticket_button_label,
        'legacy_is_featured', candidate.partner_ticket_is_featured,
        'public_activation_preserved', false,
        'admin_revalidation_required', true
      )
    );
  end loop;
end
$mhidas_legacy_channel_draft_backfill$;

insert into public.event_ticket_purchase_signals (
  canonical_event_id,
  user_id,
  signal_type,
  evidence_source,
  trusted_evidence_verified,
  recorded_at,
  idempotency_key,
  metadata
)
select
  mapping.canonical_event_id,
  intent.user_id,
  'self_declared_purchase',
  'clubber_action',
  false,
  coalesce(intent.updated_at, intent.created_at),
  'legacy:event_ticket_intents:' || intent.intent_id::text ||
    ':self_declared_purchase',
  jsonb_build_object(
    'migration_batch', 'v4.8.87-draft',
    'legacy_intent_id', intent.intent_id,
    'legacy_event_group_id', intent.event_group_id,
    'legacy_status', intent.status,
    'confirmed_conversion', false
  )
from public.event_ticket_intents intent
join mhidas_approved_event_group_canonical_map mapping
  on mapping.event_group_id = intent.event_group_id
where intent.status = 'ticket_acquired'
  and not exists (
    select 1
    from public.event_ticket_purchase_signals signal
    where signal.idempotency_key =
      'legacy:event_ticket_intents:' || intent.intent_id::text ||
      ':self_declared_purchase'
  );

-- Every legacy commercial channel is created as draft.
-- No legacy source receives active, authorized or public status.
-- canonical_events.ticket_url remains reference evidence only.
-- event_ticket_intents.ticket_acquired becomes self_declared_purchase only.

-- ============================================================================
-- PHASE 5 — PROTECTED ROUTES AND SERVER RESOLVER ARE NOT CREATED HERE
-- ============================================================================
--
-- Future routes must:
-- - set the frozen admin execution context before commercial mutations;
-- - use idempotency and optimistic concurrency;
-- - resolve commercial exits to an internal USECLUBBERS redirect path;
-- - keep commercial_url, commission and tracking secrets server-only;
-- - expose Ver evento oficial when no active commercial channel exists;
-- - return Canal de vendas a confirmar when no safe destination exists.
--
-- No CREATE VIEW statement exists in this draft.
-- No SECURITY DEFINER public resolver exists in this draft.
-- No application route or public button is changed by this draft.

-- ============================================================================
-- PHASE 6 — PUBLIC ACTIVATION IS A SEPARATE FUTURE RELEASE
-- ============================================================================
--
-- This draft never:
-- - creates an active channel from legacy data;
-- - activates Comprar ingresso;
-- - changes the public event page;
-- - treats a click as a purchase;
-- - treats self_declared_purchase as confirmed revenue;
-- - exposes a raw commercial destination.

-- ============================================================================
-- ROLLBACK PLAN FOR A FUTURE EXECUTABLE MIGRATION
-- ============================================================================
--
-- Before any production write path exists, reverse in this order:
-- 1. disable future routes and resolver feature flags;
-- 2. drop communication, conversion, channel-audit and lifecycle triggers;
-- 3. drop the six new tables in reverse dependency order;
-- 4. restore the previous canonical_event_sources grants;
-- 5. drop the additive official-reference columns only after proving no data is required;
-- 6. keep all legacy source tables unchanged until cutover is complete.
--
-- Suggested reverse dependency order:
-- partner_official_communications
-- event_ticket_purchase_signals
-- event_ticket_click_attributions
-- event_ticket_commercial_audit_log
-- event_ticket_commercial_channels
-- event_ticket_partnership_requests
--
-- This file is a review artifact. Its transaction is always rolled back.

rollback;
