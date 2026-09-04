-- MHIDAS / USECLUBBERS
-- MVP-1 R8B - Identity & Governance foundation
-- LOCAL REVIEW FIRST. Do not apply to Production without explicit approval.
-- Scope: account entry intent, official entities, universal public handle registry,
-- memberships, verification requests/evidence/document metadata, admin authority,
-- append-only audit metadata and verification transactional email outbox.
-- Explicitly excluded: Storage bucket creation, document upload routes, email provider,
-- notification generators, entity public pages and Production changes.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

do $preflight$
begin
  if to_regclass('public.cards') is null
     or to_regclass('public.card_slug_history') is null then
    raise exception 'MHIDAS_IDENTITY_GOVERNANCE_CLUBBER_HANDLE_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure('public.normalize_public_username(text)') is null
     or to_regprocedure('public.is_reserved_public_username(text)') is null then
    raise exception 'MHIDAS_IDENTITY_GOVERNANCE_USERNAME_HELPER_DEPENDENCY_MISSING';
  end if;

  if to_regclass('public.account_entry_intents') is not null
     or to_regclass('public.official_entities') is not null
     or to_regclass('public.public_identity_handles') is not null
     or to_regclass('public.entity_memberships') is not null
     or to_regclass('public.entity_verification_requests') is not null
     or to_regclass('public.entity_verification_evidence') is not null
     or to_regclass('public.entity_verification_documents') is not null
     or to_regclass('public.platform_admin_memberships') is not null
     or to_regclass('public.entity_verification_audit_log') is not null
     or to_regclass('public.verification_email_outbox') is not null then
    raise exception 'MHIDAS_IDENTITY_GOVERNANCE_FOUNDATION_ALREADY_EXISTS';
  end if;

  if exists (
    select 1
    from public.cards c
    join public.card_slug_history h
      on public.normalize_public_username(c.slug) =
         public.normalize_public_username(h.slug)
    where h.card_id <> c.card_id
  ) then
    raise exception 'MHIDAS_IDENTITY_GOVERNANCE_CROSS_CARD_HANDLE_HISTORY_COLLISION';
  end if;
end;
$preflight$;

create table public.account_entry_intents (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,
  initial_intent text not null,
  current_intent text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint account_entry_intents_initial_check
    check (initial_intent in ('clubber', 'artist', 'club', 'festival', 'organization')),
  constraint account_entry_intents_current_check
    check (current_intent in ('clubber', 'artist', 'club', 'festival', 'organization')),
  constraint account_entry_intents_updated_at_check
    check (updated_at >= created_at)
);

create table public.official_entities (
  entity_id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  organization_type text,
  display_name text not null,
  public_handle text,
  lifecycle_status text not null default 'draft',
  verification_status text not null default 'unverified',
  created_by_user_id uuid not null
    references auth.users(id)
    on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint official_entities_type_check
    check (entity_type in ('artist', 'club', 'festival', 'organization')),
  constraint official_entities_organization_type_check
    check (
      (entity_type = 'organization' and organization_type in (
        'producer', 'promoter', 'agency', 'ticketing', 'brand', 'partner', 'other'
      ))
      or
      (entity_type <> 'organization' and organization_type is null)
    ),
  constraint official_entities_display_name_check
    check (
      char_length(btrim(display_name)) between 2 and 120
      and display_name !~ '[[:cntrl:]]'
    ),
  constraint official_entities_public_handle_check
    check (
      public_handle is null
      or (
        char_length(public_handle) between 3 and 30
        and public_handle = public.normalize_public_username(public_handle)
        and not public.is_reserved_public_username(public_handle)
      )
    ),
  constraint official_entities_lifecycle_check
    check (lifecycle_status in ('draft', 'pending_review', 'active', 'suspended', 'archived')),
  constraint official_entities_verification_check
    check (verification_status in (
      'unverified', 'pending', 'in_review', 'verified', 'rejected', 'suspended', 'revoked'
    )),
  constraint official_entities_updated_at_check
    check (updated_at >= created_at)
);

create unique index official_entities_public_handle_unique_idx
  on public.official_entities (lower(public_handle))
  where public_handle is not null;

create index official_entities_type_status_idx
  on public.official_entities (entity_type, lifecycle_status, verification_status);

create table public.public_identity_handles (
  normalized_handle text primary key,
  subject_kind text not null,
  card_id uuid
    references public.cards(card_id)
    on delete restrict,
  entity_id uuid
    references public.official_entities(entity_id)
    on delete restrict,
  is_current boolean not null default true,
  reservation_status text not null default 'current',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint public_identity_handles_normalized_check
    check (
      char_length(normalized_handle) between 3 and 30
      and normalized_handle = public.normalize_public_username(normalized_handle)
      and not public.is_reserved_public_username(normalized_handle)
    ),
  constraint public_identity_handles_subject_kind_check
    check (subject_kind in ('clubber', 'entity')),
  constraint public_identity_handles_subject_reference_check
    check (
      (subject_kind = 'clubber' and card_id is not null and entity_id is null)
      or
      (subject_kind = 'entity' and entity_id is not null and card_id is null)
    ),
  constraint public_identity_handles_reservation_status_check
    check (reservation_status in ('current', 'historical', 'reserved')),
  constraint public_identity_handles_current_status_check
    check (
      (is_current = true and reservation_status in ('current', 'reserved'))
      or
      (is_current = false and reservation_status = 'historical')
    ),
  constraint public_identity_handles_updated_at_check
    check (updated_at >= created_at)
);

create index public_identity_handles_card_idx
  on public.public_identity_handles (card_id)
  where card_id is not null;

create index public_identity_handles_entity_idx
  on public.public_identity_handles (entity_id)
  where entity_id is not null;

create unique index public_identity_handles_one_current_card_idx
  on public.public_identity_handles (card_id)
  where subject_kind = 'clubber'
    and card_id is not null
    and is_current = true;

create unique index public_identity_handles_one_current_entity_idx
  on public.public_identity_handles (entity_id)
  where subject_kind = 'entity'
    and entity_id is not null
    and is_current = true;

insert into public.public_identity_handles (
  normalized_handle,
  subject_kind,
  card_id,
  entity_id,
  is_current,
  reservation_status
)
select
  public.normalize_public_username(c.slug),
  'clubber',
  c.card_id,
  null,
  true,
  'current'
from public.cards c
where c.slug is not null
  and char_length(public.normalize_public_username(c.slug)) between 3 and 30
  and not public.is_reserved_public_username(c.slug);

insert into public.public_identity_handles (
  normalized_handle,
  subject_kind,
  card_id,
  entity_id,
  is_current,
  reservation_status
)
select
  public.normalize_public_username(h.slug),
  'clubber',
  h.card_id,
  null,
  false,
  'historical'
from public.card_slug_history h
where h.slug is not null
  and char_length(public.normalize_public_username(h.slug)) between 3 and 30
  and not public.is_reserved_public_username(h.slug)
on conflict (normalized_handle) do nothing;

create table public.entity_memberships (
  entity_id uuid not null
    references public.official_entities(entity_id)
    on delete cascade,
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  role text not null,
  status text not null default 'active',
  invited_by_user_id uuid
    references auth.users(id)
    on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (entity_id, user_id),

  constraint entity_memberships_role_check
    check (role in ('owner', 'admin', 'editor', 'communications', 'event_manager', 'viewer')),
  constraint entity_memberships_status_check
    check (status in ('invited', 'active', 'suspended', 'revoked')),
  constraint entity_memberships_updated_at_check
    check (updated_at >= created_at)
);

create index entity_memberships_user_status_idx
  on public.entity_memberships (user_id, status, role);

create table public.entity_verification_requests (
  request_id uuid primary key default gen_random_uuid(),
  request_kind text not null,
  requester_user_id uuid not null
    references auth.users(id)
    on delete restrict,
  entity_id uuid
    references public.official_entities(entity_id)
    on delete restrict,
  requested_entity_type text not null,
  requested_organization_type text,
  requested_display_name text not null,
  requested_handle text,
  source_catalog_kind text,
  source_catalog_key text,
  contact_email text not null,
  professional_email_domain text,
  email_signal_status text not null default 'unassessed',
  status text not null default 'draft',
  submitted_at timestamptz,
  reviewed_by_user_id uuid
    references auth.users(id)
    on delete set null,
  reviewed_at timestamptz,
  decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint entity_verification_requests_kind_check
    check (request_kind in ('create', 'claim')),
  constraint entity_verification_requests_entity_type_check
    check (requested_entity_type in ('artist', 'club', 'festival', 'organization')),
  constraint entity_verification_requests_organization_type_check
    check (
      (requested_entity_type = 'organization' and requested_organization_type in (
        'producer', 'promoter', 'agency', 'ticketing', 'brand', 'partner', 'other'
      ))
      or
      (requested_entity_type <> 'organization' and requested_organization_type is null)
    ),
  constraint entity_verification_requests_display_name_check
    check (
      char_length(btrim(requested_display_name)) between 2 and 120
      and requested_display_name !~ '[[:cntrl:]]'
    ),
  constraint entity_verification_requests_handle_check
    check (
      requested_handle is null
      or (
        char_length(requested_handle) between 3 and 30
        and requested_handle = public.normalize_public_username(requested_handle)
        and not public.is_reserved_public_username(requested_handle)
      )
    ),
  constraint entity_verification_requests_contact_email_check
    check (
      char_length(btrim(contact_email)) between 5 and 320
      and contact_email !~ '[[:cntrl:]]'
    ),
  constraint entity_verification_requests_professional_domain_check
    check (
      professional_email_domain is null
      or (
        char_length(btrim(professional_email_domain)) between 3 and 253
        and professional_email_domain = lower(btrim(professional_email_domain))
        and professional_email_domain ~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$'
      )
    ),
  constraint entity_verification_requests_email_signal_check
    check (email_signal_status in (
      'unassessed', 'personal', 'professional_unverified', 'professional_confirmed', 'mismatch'
    )),
  constraint entity_verification_requests_status_check
    check (status in (
      'draft', 'submitted', 'in_review', 'more_info_required',
      'approved', 'rejected', 'withdrawn', 'suspended', 'revoked'
    )),
  constraint entity_verification_requests_review_pair_check
    check (
      (reviewed_by_user_id is null and reviewed_at is null)
      or
      (reviewed_by_user_id is not null and reviewed_at is not null)
    ),
  constraint entity_verification_requests_decision_reason_check
    check (
      decision_reason is null
      or (
        char_length(decision_reason) <= 1000
        and decision_reason !~ '[[:cntrl:]]'
      )
    ),
  constraint entity_verification_requests_updated_at_check
    check (updated_at >= created_at)
);

create index entity_verification_requests_requester_idx
  on public.entity_verification_requests (requester_user_id, status, created_at desc);

create index entity_verification_requests_review_queue_idx
  on public.entity_verification_requests (status, submitted_at, created_at)
  where status in ('submitted', 'in_review', 'more_info_required');

create index entity_verification_requests_entity_idx
  on public.entity_verification_requests (entity_id, status)
  where entity_id is not null;

create table public.entity_verification_evidence (
  evidence_id uuid primary key default gen_random_uuid(),
  request_id uuid not null
    references public.entity_verification_requests(request_id)
    on delete cascade,
  evidence_type text not null,
  value_text text,
  evidence_url text,
  review_status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint entity_verification_evidence_type_check
    check (evidence_type in (
      'official_website', 'professional_email', 'domain_ownership',
      'instagram', 'spotify', 'youtube', 'booking_agency',
      'business_registry', 'representative_authorization', 'other'
    )),
  constraint entity_verification_evidence_value_check
    check (
      value_text is null
      or (
        char_length(value_text) <= 2000
        and value_text !~ '[[:cntrl:]]'
      )
    ),
  constraint entity_verification_evidence_url_check
    check (
      evidence_url is null
      or (
        char_length(evidence_url) <= 2048
        and evidence_url ~* '^https://'
        and evidence_url !~ '[[:cntrl:]]'
      )
    ),
  constraint entity_verification_evidence_present_check
    check (value_text is not null or evidence_url is not null),
  constraint entity_verification_evidence_review_check
    check (review_status in ('pending', 'accepted', 'rejected', 'needs_more_info')),
  constraint entity_verification_evidence_metadata_check
    check (
      jsonb_typeof(metadata) = 'object'
      and octet_length(metadata::text) <= 16384
    ),
  constraint entity_verification_evidence_updated_at_check
    check (updated_at >= created_at)
);

create index entity_verification_evidence_request_idx
  on public.entity_verification_evidence (request_id, review_status, created_at);

create table public.entity_verification_documents (
  document_id uuid primary key default gen_random_uuid(),
  request_id uuid not null
    references public.entity_verification_requests(request_id)
    on delete cascade,
  document_type text not null,
  storage_bucket text not null,
  storage_object_path text not null,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  sha256 text not null,
  uploaded_by_user_id uuid not null
    references auth.users(id)
    on delete restrict,
  review_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint entity_verification_documents_type_check
    check (document_type in (
      'identity', 'business_registry', 'representative_authorization',
      'domain_ownership', 'booking_or_agency_proof', 'other'
    )),
  constraint entity_verification_documents_bucket_check
    check (
      char_length(storage_bucket) between 3 and 120
      and storage_bucket = lower(btrim(storage_bucket))
      and storage_bucket ~ '^[a-z0-9][a-z0-9_-]{2,119}$'
    ),
  constraint entity_verification_documents_path_check
    check (
      char_length(storage_object_path) between 3 and 1024
      and storage_object_path !~ '(^|/)\.\.(/|$)'
      and storage_object_path !~ '[[:cntrl:]]'
    ),
  constraint entity_verification_documents_filename_check
    check (
      char_length(btrim(original_filename)) between 1 and 255
      and original_filename !~ '[[:cntrl:]/\\]'
    ),
  constraint entity_verification_documents_mime_check
    check (
      mime_type in (
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
      )
    ),
  constraint entity_verification_documents_size_check
    check (file_size_bytes between 1 and 15728640),
  constraint entity_verification_documents_sha_check
    check (sha256 ~ '^[A-Fa-f0-9]{64}$'),
  constraint entity_verification_documents_review_check
    check (review_status in ('pending', 'accepted', 'rejected', 'needs_more_info')),
  constraint entity_verification_documents_updated_at_check
    check (updated_at >= created_at)
);

create unique index entity_verification_documents_object_unique_idx
  on public.entity_verification_documents (storage_bucket, storage_object_path);

create index entity_verification_documents_request_idx
  on public.entity_verification_documents (request_id, review_status, created_at);

create table public.platform_admin_memberships (
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  role text not null,
  status text not null default 'active',
  granted_by_user_id uuid
    references auth.users(id)
    on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,

  primary key (user_id, role),

  constraint platform_admin_memberships_role_check
    check (role in ('verification_reviewer', 'verification_admin', 'platform_admin')),
  constraint platform_admin_memberships_status_check
    check (status in ('active', 'revoked')),
  constraint platform_admin_memberships_revocation_check
    check (
      (status = 'active' and revoked_at is null)
      or
      (status = 'revoked' and revoked_at is not null)
    )
);

create index platform_admin_memberships_active_idx
  on public.platform_admin_memberships (role, user_id)
  where status = 'active';

create table public.entity_verification_audit_log (
  audit_id uuid primary key default gen_random_uuid(),
  request_id uuid not null
    references public.entity_verification_requests(request_id)
    on delete restrict,
  entity_id uuid
    references public.official_entities(entity_id)
    on delete restrict,
  actor_user_id uuid
    references auth.users(id)
    on delete set null,
  actor_kind text not null,
  action text not null,
  previous_status text,
  new_status text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint entity_verification_audit_actor_kind_check
    check (actor_kind in ('user', 'reviewer', 'system')),
  constraint entity_verification_audit_action_check
    check (
      char_length(action) between 3 and 80
      and action = lower(btrim(action))
      and action ~ '^[a-z0-9][a-z0-9_.:-]{2,79}$'
    ),
  constraint entity_verification_audit_reason_check
    check (
      reason is null
      or (
        char_length(reason) <= 1000
        and reason !~ '[[:cntrl:]]'
      )
    ),
  constraint entity_verification_audit_metadata_check
    check (
      jsonb_typeof(metadata) = 'object'
      and octet_length(metadata::text) <= 16384
    )
);

create index entity_verification_audit_request_idx
  on public.entity_verification_audit_log (request_id, created_at desc);

create table public.verification_email_outbox (
  email_id uuid primary key default gen_random_uuid(),
  request_id uuid not null
    references public.entity_verification_requests(request_id)
    on delete restrict,
  recipient_user_id uuid not null
    references auth.users(id)
    on delete restrict,
  template_key text not null,
  recipient_email text not null,
  status text not null default 'pending',
  idempotency_key text not null unique,
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  failed_at timestamptz,
  provider_message_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint verification_email_outbox_template_check
    check (
      char_length(template_key) between 3 and 100
      and template_key = lower(btrim(template_key))
      and template_key ~ '^[a-z0-9][a-z0-9_.:-]{2,99}$'
    ),
  constraint verification_email_outbox_email_check
    check (
      char_length(btrim(recipient_email)) between 5 and 320
      and recipient_email !~ '[[:cntrl:]]'
    ),
  constraint verification_email_outbox_status_check
    check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  constraint verification_email_outbox_idempotency_check
    check (
      char_length(idempotency_key) between 8 and 320
      and idempotency_key = lower(btrim(idempotency_key))
      and idempotency_key ~ '^[a-z0-9][a-z0-9:_./-]*$'
    ),
  constraint verification_email_outbox_status_timestamps_check
    check (
      (status = 'sent' and sent_at is not null and failed_at is null)
      or
      (status = 'failed' and failed_at is not null and sent_at is null)
      or
      (status not in ('sent', 'failed') and sent_at is null and failed_at is null)
    ),
  constraint verification_email_outbox_error_check
    check (
      last_error_code is null
      or (
        char_length(last_error_code) between 2 and 120
        and last_error_code = lower(btrim(last_error_code))
        and last_error_code ~ '^[a-z0-9][a-z0-9_.:-]{1,119}$'
      )
    ),
  constraint verification_email_outbox_updated_at_check
    check (updated_at >= created_at)
);

create index verification_email_outbox_queue_idx
  on public.verification_email_outbox (status, available_at, created_at)
  where status in ('pending', 'failed');

create or replace function public.mhidas_identity_governance_set_updated_at_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create or replace function public.mhidas_is_identity_governance_admin_v1()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.platform_admin_memberships pam
    where pam.user_id = auth.uid()
      and pam.status = 'active'
      and pam.role in ('verification_reviewer', 'verification_admin', 'platform_admin')
  );
$function$;

create or replace function public.mhidas_check_public_handle_availability_v1(
  p_handle text
)
returns table (
  normalized_handle text,
  available boolean,
  reason text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_handle text;
begin
  v_handle := public.normalize_public_username(p_handle);

  if v_user_id is null then
    return query select v_handle, false, 'not_authenticated'::text;
    return;
  end if;

  if char_length(v_handle) < 3 then
    return query select v_handle, false, 'too_short'::text;
    return;
  end if;

  if char_length(v_handle) > 30 then
    return query select v_handle, false, 'too_long'::text;
    return;
  end if;

  if public.is_reserved_public_username(v_handle) then
    return query select v_handle, false, 'reserved'::text;
    return;
  end if;

  if exists (
    select 1
    from public.public_identity_handles h
    where h.normalized_handle = v_handle
  ) then
    return query select v_handle, false, 'already_used'::text;
    return;
  end if;

  return query select v_handle, true, 'available'::text;
end;
$function$;

create or replace function public.mhidas_assert_universal_public_handle_v1(
  p_handle text,
  p_subject_kind text,
  p_card_id uuid default null,
  p_entity_id uuid default null
)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_handle text;
begin
  v_handle := public.normalize_public_username(p_handle);

  if char_length(v_handle) < 3 then
    raise exception using errcode = 'P0001', message = 'username_too_short';
  end if;

  if char_length(v_handle) > 30 then
    raise exception using errcode = 'P0001', message = 'username_too_long';
  end if;

  if public.is_reserved_public_username(v_handle) then
    raise exception using errcode = 'P0001', message = 'username_reserved';
  end if;

  if p_subject_kind not in ('clubber', 'entity') then
    raise exception using errcode = 'P0001', message = 'invalid_public_handle_subject_kind';
  end if;

  if exists (
    select 1
    from public.public_identity_handles h
    where h.normalized_handle = v_handle
      and not (
        (p_subject_kind = 'clubber' and h.subject_kind = 'clubber' and h.card_id = p_card_id)
        or
        (p_subject_kind = 'entity' and h.subject_kind = 'entity' and h.entity_id = p_entity_id)
      )
  ) then
    raise exception using errcode = 'P0001', message = 'username_unavailable';
  end if;

  return v_handle;
end;
$function$;

create or replace function public.mhidas_validate_card_public_handle_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  perform public.mhidas_assert_universal_public_handle_v1(
    new.slug,
    'clubber',
    new.card_id,
    null
  );

  return new;
end;
$function$;

create or replace function public.mhidas_sync_card_public_handle_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_handle text;
  v_old_handle text;
begin
  v_handle := public.normalize_public_username(new.slug);

  if tg_op = 'UPDATE' then
    v_old_handle := public.normalize_public_username(old.slug);

    if v_old_handle is distinct from v_handle then
      update public.public_identity_handles h
      set
        is_current = false,
        reservation_status = 'historical',
        updated_at = now()
      where h.normalized_handle = v_old_handle
        and h.subject_kind = 'clubber'
        and h.card_id = new.card_id;
    end if;
  end if;

  update public.public_identity_handles h
  set
    is_current = true,
    reservation_status = 'current',
    updated_at = now()
  where h.normalized_handle = v_handle
    and h.subject_kind = 'clubber'
    and h.card_id = new.card_id;

  if not found then
    insert into public.public_identity_handles (
      normalized_handle,
      subject_kind,
      card_id,
      entity_id,
      is_current,
      reservation_status
    )
    values (
      v_handle,
      'clubber',
      new.card_id,
      null,
      true,
      'current'
    );
  end if;

  return new;
end;
$function$;

create or replace function public.mhidas_sync_clubber_handle_history_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_handle text;
  v_current_handle text;
begin
  v_handle := public.mhidas_assert_universal_public_handle_v1(
    new.slug,
    'clubber',
    new.card_id,
    null
  );

  select public.normalize_public_username(c.slug)
  into v_current_handle
  from public.cards c
  where c.card_id = new.card_id;

  if v_handle = v_current_handle then
    return new;
  end if;

  update public.public_identity_handles h
  set
    is_current = false,
    reservation_status = 'historical',
    updated_at = now()
  where h.normalized_handle = v_handle
    and h.subject_kind = 'clubber'
    and h.card_id = new.card_id;

  if not found then
    insert into public.public_identity_handles (
      normalized_handle,
      subject_kind,
      card_id,
      entity_id,
      is_current,
      reservation_status
    )
    values (
      v_handle,
      'clubber',
      new.card_id,
      null,
      false,
      'historical'
    );
  end if;

  return new;
end;
$function$;

create or replace function public.mhidas_validate_entity_public_handle_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if new.public_handle is not null then
    new.public_handle := public.mhidas_assert_universal_public_handle_v1(
      new.public_handle,
      'entity',
      null,
      new.entity_id
    );
  end if;

  return new;
end;
$function$;

create or replace function public.mhidas_sync_entity_public_handle_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_handle text;
  v_old_handle text;
begin
  if tg_op = 'UPDATE' and old.public_handle is not null then
    v_old_handle := public.normalize_public_username(old.public_handle);

    if new.public_handle is null
       or v_old_handle is distinct from public.normalize_public_username(new.public_handle) then
      update public.public_identity_handles h
      set
        is_current = false,
        reservation_status = 'historical',
        updated_at = now()
      where h.normalized_handle = v_old_handle
        and h.subject_kind = 'entity'
        and h.entity_id = new.entity_id;
    end if;
  end if;

  if new.public_handle is null then
    return new;
  end if;

  v_handle := public.normalize_public_username(new.public_handle);

  update public.public_identity_handles h
  set
    is_current = true,
    reservation_status = 'current',
    updated_at = now()
  where h.normalized_handle = v_handle
    and h.subject_kind = 'entity'
    and h.entity_id = new.entity_id;

  if not found then
    insert into public.public_identity_handles (
      normalized_handle,
      subject_kind,
      card_id,
      entity_id,
      is_current,
      reservation_status
    )
    values (
      v_handle,
      'entity',
      null,
      new.entity_id,
      true,
      'current'
    );
  end if;

  return new;
end;
$function$;

create trigger trg_cards_validate_universal_public_handle
before insert or update of slug on public.cards
for each row execute function public.mhidas_validate_card_public_handle_v1();

create trigger trg_cards_sync_universal_public_handle
after insert or update of slug on public.cards
for each row execute function public.mhidas_sync_card_public_handle_v1();

create trigger trg_card_slug_history_sync_universal_public_handle
after insert or update of slug on public.card_slug_history
for each row execute function public.mhidas_sync_clubber_handle_history_v1();

create trigger trg_official_entities_validate_universal_public_handle
before insert or update of public_handle on public.official_entities
for each row execute function public.mhidas_validate_entity_public_handle_v1();

create trigger trg_official_entities_sync_universal_public_handle
after insert or update of public_handle on public.official_entities
for each row execute function public.mhidas_sync_entity_public_handle_v1();

create trigger trg_account_entry_intents_updated_at
before update on public.account_entry_intents
for each row execute function public.mhidas_identity_governance_set_updated_at_v1();

create trigger trg_official_entities_updated_at
before update on public.official_entities
for each row execute function public.mhidas_identity_governance_set_updated_at_v1();

create trigger trg_public_identity_handles_updated_at
before update on public.public_identity_handles
for each row execute function public.mhidas_identity_governance_set_updated_at_v1();

create trigger trg_entity_memberships_updated_at
before update on public.entity_memberships
for each row execute function public.mhidas_identity_governance_set_updated_at_v1();

create trigger trg_entity_verification_requests_updated_at
before update on public.entity_verification_requests
for each row execute function public.mhidas_identity_governance_set_updated_at_v1();

create trigger trg_entity_verification_evidence_updated_at
before update on public.entity_verification_evidence
for each row execute function public.mhidas_identity_governance_set_updated_at_v1();

create trigger trg_entity_verification_documents_updated_at
before update on public.entity_verification_documents
for each row execute function public.mhidas_identity_governance_set_updated_at_v1();

create trigger trg_verification_email_outbox_updated_at
before update on public.verification_email_outbox
for each row execute function public.mhidas_identity_governance_set_updated_at_v1();

alter table public.account_entry_intents enable row level security;
alter table public.official_entities enable row level security;
alter table public.public_identity_handles enable row level security;
alter table public.entity_memberships enable row level security;
alter table public.entity_verification_requests enable row level security;
alter table public.entity_verification_evidence enable row level security;
alter table public.entity_verification_documents enable row level security;
alter table public.platform_admin_memberships enable row level security;
alter table public.entity_verification_audit_log enable row level security;
alter table public.verification_email_outbox enable row level security;

create policy account_entry_intents_select_own
on public.account_entry_intents
for select
to authenticated
using (user_id = auth.uid());

create policy account_entry_intents_insert_own
on public.account_entry_intents
for insert
to authenticated
with check (user_id = auth.uid());

create policy account_entry_intents_update_own
on public.account_entry_intents
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy official_entities_public_verified_select
on public.official_entities
for select
to anon, authenticated
using (
  lifecycle_status = 'active'
  and verification_status = 'verified'
);

create policy entity_memberships_select_own
on public.entity_memberships
for select
to authenticated
using (user_id = auth.uid());

create policy entity_verification_requests_select_own
on public.entity_verification_requests
for select
to authenticated
using (requester_user_id = auth.uid());

create policy entity_verification_evidence_select_own_request
on public.entity_verification_evidence
for select
to authenticated
using (
  exists (
    select 1
    from public.entity_verification_requests r
    where r.request_id = entity_verification_evidence.request_id
      and r.requester_user_id = auth.uid()
  )
);

create policy entity_verification_documents_select_own_request
on public.entity_verification_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.entity_verification_requests r
    where r.request_id = entity_verification_documents.request_id
      and r.requester_user_id = auth.uid()
  )
);

revoke all on table public.account_entry_intents from public, anon, authenticated;
revoke all on table public.official_entities from public, anon, authenticated;
revoke all on table public.public_identity_handles from public, anon, authenticated;
revoke all on table public.entity_memberships from public, anon, authenticated;
revoke all on table public.entity_verification_requests from public, anon, authenticated;
revoke all on table public.entity_verification_evidence from public, anon, authenticated;
revoke all on table public.entity_verification_documents from public, anon, authenticated;
revoke all on table public.platform_admin_memberships from public, anon, authenticated;
revoke all on table public.entity_verification_audit_log from public, anon, authenticated;
revoke all on table public.verification_email_outbox from public, anon, authenticated;

grant select, insert, update on table public.account_entry_intents to authenticated;
grant select on table public.official_entities to anon, authenticated;
grant select on table public.entity_memberships to authenticated;
grant select on table public.entity_verification_requests to authenticated;
grant select on table public.entity_verification_evidence to authenticated;
grant select on table public.entity_verification_documents to authenticated;

grant all on table public.account_entry_intents to service_role;
grant all on table public.official_entities to service_role;
grant all on table public.public_identity_handles to service_role;
grant all on table public.entity_memberships to service_role;
grant all on table public.entity_verification_requests to service_role;
grant all on table public.entity_verification_evidence to service_role;
grant all on table public.entity_verification_documents to service_role;
grant all on table public.platform_admin_memberships to service_role;
grant all on table public.entity_verification_audit_log to service_role;
grant all on table public.verification_email_outbox to service_role;

grant execute on function public.normalize_public_username(text)
to service_role;

grant execute on function public.is_reserved_public_username(text)
to service_role;

revoke all on function public.mhidas_identity_governance_set_updated_at_v1()
from public, anon, authenticated, service_role;

revoke all on function public.mhidas_is_identity_governance_admin_v1()
from public, anon, authenticated, service_role;

revoke all on function public.mhidas_check_public_handle_availability_v1(text)
from public, anon, authenticated, service_role;

revoke all on function public.mhidas_assert_universal_public_handle_v1(text,text,uuid,uuid)
from public, anon, authenticated, service_role;

revoke all on function public.mhidas_validate_card_public_handle_v1()
from public, anon, authenticated, service_role;

revoke all on function public.mhidas_sync_card_public_handle_v1()
from public, anon, authenticated, service_role;

revoke all on function public.mhidas_sync_clubber_handle_history_v1()
from public, anon, authenticated, service_role;

revoke all on function public.mhidas_validate_entity_public_handle_v1()
from public, anon, authenticated, service_role;

revoke all on function public.mhidas_sync_entity_public_handle_v1()
from public, anon, authenticated, service_role;

grant execute on function public.mhidas_identity_governance_set_updated_at_v1()
to service_role;

grant execute on function public.mhidas_assert_universal_public_handle_v1(text,text,uuid,uuid)
to service_role;

grant execute on function public.mhidas_validate_card_public_handle_v1()
to service_role;

grant execute on function public.mhidas_sync_card_public_handle_v1()
to service_role;

grant execute on function public.mhidas_sync_clubber_handle_history_v1()
to service_role;

grant execute on function public.mhidas_validate_entity_public_handle_v1()
to service_role;

grant execute on function public.mhidas_sync_entity_public_handle_v1()
to service_role;

grant execute on function public.mhidas_is_identity_governance_admin_v1()
to authenticated, service_role;

grant execute on function public.mhidas_check_public_handle_availability_v1(text)
to authenticated, service_role;

comment on table public.account_entry_intents is
  'UX routing intent for a universal USECLUBBERS account. It never grants authorization or verification.';

comment on table public.official_entities is
  'Official Artist, Club, Festival and Organization identities administered by USECLUBBERS accounts.';

comment on table public.public_identity_handles is
  'Platform-wide public @ namespace reservation ledger for Clubber identities and official entities. Historical handles remain reserved.';

comment on table public.entity_verification_requests is
  'Create/claim verification workflow for Artist, Club, Festival and Organization identities.';

comment on table public.entity_verification_documents is
  'Private verification document metadata only. File bytes must live in a private Storage bucket and are not created by this migration.';

comment on table public.platform_admin_memberships is
  'Server-controlled verification/platform authority. No user can self-grant these roles through direct client access.';

comment on table public.entity_verification_audit_log is
  'Internal append-only verification audit ledger. Direct client access is denied.';

comment on table public.verification_email_outbox is
  'Transactional verification email outbox. No provider or dispatcher is created by this migration.';

comment on function public.mhidas_is_identity_governance_admin_v1() is
  'Returns whether the authenticated user currently holds an active verification/platform admin role.';

comment on function public.mhidas_check_public_handle_availability_v1(text) is
  'Checks the platform-wide public handle reservation ledger. Database triggers also enforce the universal namespace for legacy Clubber card writes and official entity writes.';

do $postflight$
declare
  v_expected_tables integer := 10;
  v_actual_tables integer;
  v_missing_rls integer;
  v_current_card_count bigint;
  v_current_handle_count bigint;
begin
  select count(*)
  into v_actual_tables
  from (
    values
      ('account_entry_intents'),
      ('official_entities'),
      ('public_identity_handles'),
      ('entity_memberships'),
      ('entity_verification_requests'),
      ('entity_verification_evidence'),
      ('entity_verification_documents'),
      ('platform_admin_memberships'),
      ('entity_verification_audit_log'),
      ('verification_email_outbox')
  ) as expected(table_name)
  where to_regclass('public.' || expected.table_name) is not null;

  if v_actual_tables <> v_expected_tables then
    raise exception 'MHIDAS_IDENTITY_GOVERNANCE_POSTFLIGHT_TABLE_COUNT_FAILED:%', v_actual_tables;
  end if;

  select count(*)
  into v_missing_rls
  from (
    values
      ('account_entry_intents'),
      ('official_entities'),
      ('public_identity_handles'),
      ('entity_memberships'),
      ('entity_verification_requests'),
      ('entity_verification_evidence'),
      ('entity_verification_documents'),
      ('platform_admin_memberships'),
      ('entity_verification_audit_log'),
      ('verification_email_outbox')
  ) as expected(table_name)
  where not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = expected.table_name
      and c.relrowsecurity = true
  );

  if v_missing_rls <> 0 then
    raise exception 'MHIDAS_IDENTITY_GOVERNANCE_POSTFLIGHT_RLS_MISSING:%', v_missing_rls;
  end if;

  select count(*)
  into v_current_card_count
  from public.cards c
  where c.slug is not null
    and char_length(public.normalize_public_username(c.slug)) between 3 and 30
    and not public.is_reserved_public_username(c.slug);

  select count(*)
  into v_current_handle_count
  from public.public_identity_handles h
  where h.subject_kind = 'clubber'
    and h.is_current = true
    and h.reservation_status = 'current';

  if v_current_handle_count <> v_current_card_count then
    raise exception
      'MHIDAS_IDENTITY_GOVERNANCE_CURRENT_HANDLE_BACKFILL_MISMATCH:%:%',
      v_current_handle_count,
      v_current_card_count;
  end if;

  if to_regprocedure('public.mhidas_is_identity_governance_admin_v1()') is null
     or to_regprocedure('public.mhidas_check_public_handle_availability_v1(text)') is null
     or to_regprocedure('public.mhidas_assert_universal_public_handle_v1(text,text,uuid,uuid)') is null
     or to_regprocedure('public.mhidas_validate_card_public_handle_v1()') is null
     or to_regprocedure('public.mhidas_sync_card_public_handle_v1()') is null
     or to_regprocedure('public.mhidas_sync_clubber_handle_history_v1()') is null
     or to_regprocedure('public.mhidas_validate_entity_public_handle_v1()') is null
     or to_regprocedure('public.mhidas_sync_entity_public_handle_v1()') is null then
    raise exception 'MHIDAS_IDENTITY_GOVERNANCE_POSTFLIGHT_FUNCTION_MISSING';
  end if;

  if not has_function_privilege('service_role', 'public.normalize_public_username(text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.is_reserved_public_username(text)', 'EXECUTE') then
    raise exception 'MHIDAS_IDENTITY_GOVERNANCE_SERVICE_ROLE_USERNAME_HELPER_EXECUTE_MISSING';
  end if;

  if not exists (
    select 1 from pg_trigger t
    where t.tgrelid = 'public.cards'::regclass
      and t.tgname = 'trg_cards_validate_universal_public_handle'
      and not t.tgisinternal
  )
  or not exists (
    select 1 from pg_trigger t
    where t.tgrelid = 'public.cards'::regclass
      and t.tgname = 'trg_cards_sync_universal_public_handle'
      and not t.tgisinternal
  )
  or not exists (
    select 1 from pg_trigger t
    where t.tgrelid = 'public.card_slug_history'::regclass
      and t.tgname = 'trg_card_slug_history_sync_universal_public_handle'
      and not t.tgisinternal
  )
  or not exists (
    select 1 from pg_trigger t
    where t.tgrelid = 'public.official_entities'::regclass
      and t.tgname = 'trg_official_entities_validate_universal_public_handle'
      and not t.tgisinternal
  )
  or not exists (
    select 1 from pg_trigger t
    where t.tgrelid = 'public.official_entities'::regclass
      and t.tgname = 'trg_official_entities_sync_universal_public_handle'
      and not t.tgisinternal
  ) then
    raise exception 'MHIDAS_IDENTITY_GOVERNANCE_UNIVERSAL_HANDLE_TRIGGER_MISSING';
  end if;

  if has_table_privilege('anon', 'public.platform_admin_memberships', 'SELECT')
     or has_table_privilege('authenticated', 'public.platform_admin_memberships', 'SELECT')
     or has_table_privilege('anon', 'public.entity_verification_audit_log', 'SELECT')
     or has_table_privilege('authenticated', 'public.entity_verification_audit_log', 'SELECT')
     or has_table_privilege('anon', 'public.verification_email_outbox', 'SELECT')
     or has_table_privilege('authenticated', 'public.verification_email_outbox', 'SELECT') then
    raise exception 'MHIDAS_IDENTITY_GOVERNANCE_INTERNAL_TABLE_EXPOSURE';
  end if;
end;
$postflight$;

commit;
