-- supabase/migrations/20260717150000_event_ticket_commercial_governance.sql
-- Version: v4.8.123-event-ticket-commercial-migration-executable-migration-safe
-- Base: v4.8.122-event-ticket-commercial-migration-runtime-corrected-isolated-postgresql-execution-safe
-- Derived from: docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTEENTH_RUNTIME_CORRECTED_DRAFT.sql
-- Source SHA256: D6292E37EFC430E5D94D073F560C5B37066203C2E74C5D948BF46CA78E2FE4C1
-- Runtime proof: v4.8.122 passed 10/10 isolated PostgreSQL checks.
-- This is the executable migration artifact. Production application remains separately controlled.
begin;

-- =============================================================================
-- 0. UNCONDITIONAL EXECUTION GUARD
-- =============================================================================

-- =============================================================================
-- 1. CLOSED BASE-SCHEMA AND LEGACY-BYPASS PREFLIGHT
-- =============================================================================

do $mhidas_preflight$
declare
  v_missing text[] := array[]::text[];
  v_drift text[] := array[]::text[];
  v_item record;
  v_name text;
begin
  for v_item in
    select * from (values
      ('public','canonical_events','id','uuid'),
      ('public','canonical_event_sources','canonical_event_id','uuid'),
      ('public','canonical_event_sources','source_url','text'),
      ('public','canonical_event_sources','last_seen_at','timestamptz'),
      ('auth','users','id','uuid')
    ) as expected(table_schema, table_name, column_name, udt_name)
  loop
    if not exists (
      select 1 from information_schema.columns c
      where c.table_schema = v_item.table_schema
        and c.table_name = v_item.table_name
        and c.column_name = v_item.column_name
        and c.udt_name = v_item.udt_name
    ) then
      v_missing := array_append(v_missing, format('%I.%I.%I:%s', v_item.table_schema, v_item.table_name, v_item.column_name, v_item.udt_name));
    end if;
  end loop;

  foreach v_name in array array['public.event_sources','public.event_ticket_intents','public.partner_ticket_requests'] loop
    if to_regclass(v_name) is null then v_missing := array_append(v_missing, v_name); end if;
  end loop;

  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then v_missing := array_append(v_missing, 'extension:pgcrypto'); end if;
  foreach v_name in array array['anon','authenticated','service_role'] loop
    if not exists (select 1 from pg_roles where rolname = v_name) then v_missing := array_append(v_missing, 'role:' || v_name); end if;
  end loop;
  if to_regprocedure('auth.uid()') is null then v_missing := array_append(v_missing, 'auth.uid()'); end if;
  if to_regprocedure('gen_random_uuid()') is null then v_missing := array_append(v_missing, 'gen_random_uuid()'); end if;
  if to_regprocedure('digest(text,text)') is null and to_regprocedure('digest(bytea,text)') is null then v_missing := array_append(v_missing, 'digest'); end if;
  if to_regprocedure('hmac(text,text,text)') is null and to_regprocedure('hmac(bytea,bytea,text)') is null then v_missing := array_append(v_missing, 'hmac'); end if;
  if to_regprocedure('public.mhidas_is_useclubbers_admin_v1(uuid)') is null then v_missing := array_append(v_missing, 'public.mhidas_is_useclubbers_admin_v1(uuid)'); end if;
  if to_regprocedure('public.mhidas_verify_detached_signature_v1(text,text,text,text)') is null then v_missing := array_append(v_missing, 'public.mhidas_verify_detached_signature_v1(text,text,text,text)'); end if;
  if to_regprocedure('public.mhidas_verify_detached_signature_with_key_hash_v1(text,text,text,text,text,text)') is null then v_missing := array_append(v_missing, 'public.mhidas_verify_detached_signature_with_key_hash_v1(text,text,text,text,text,text)'); end if;
  if to_regprocedure('public.mhidas_decrypt_verified_url_envelope_v1(text,text,text)') is null then v_missing := array_append(v_missing, 'public.mhidas_decrypt_verified_url_envelope_v1(text,text,text)'); end if;

  foreach v_name in array array[
    'commercial_partners','commercial_partner_representatives','event_ticket_trusted_integrations',
    'event_ticket_trusted_integration_credential_versions','event_ticket_trusted_integration_channels',
    'event_ticket_partnership_requests','event_ticket_retention_policy_bootstrap_receipts','event_ticket_retention_policy_versions','event_ticket_retention_minimization_rules',
    'event_ticket_url_validation_authorities','event_ticket_official_source_attestations','event_ticket_commercial_channels',
    'event_ticket_operation_receipts','event_ticket_verified_credential_contexts','event_ticket_click_attributions',
    'event_ticket_purchase_signals','partner_official_communications','event_ticket_retention_runs',
    'event_ticket_commercial_audit_log','event_ticket_backfill_rejections',
    'event_ticket_operation_result_contracts','event_ticket_retention_executor_contracts',
    'event_ticket_legacy_backfill_runs','event_ticket_legacy_backfill_items','event_ticket_legacy_cutover_checkpoints'
  ] loop
    if to_regclass('public.' || v_name) is not null then v_drift := array_append(v_drift, 'table:public.' || v_name); end if;
  end loop;

  for v_item in
    select n.nspname as schema_name,p.proname,pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and (p.proname like 'mhidas_ticket_%' or p.proname like 'mhidas_record_event_ticket_%' or p.proname like 'mhidas_admin_%' or p.proname like 'mhidas_resolve_public_event_ticket_%')
  loop
    v_drift:=array_append(v_drift,format('function:%I.%I(%s)',v_item.schema_name,v_item.proname,v_item.args));
  end loop;

  for v_item in
    select n.nspname as schema_name,c.relname,c.relkind
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('v','m')
      and (c.relname like 'mhidas_ticket_%' or c.relname like 'event_ticket_%')
  loop
    v_drift:=array_append(v_drift,format('view:%I.%I',v_item.schema_name,v_item.relname));
  end loop;

  for v_item in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and policyname = any(array[
      'commercial_partners_admin_read_v4120',
      'event_ticket_channels_admin_read_v4120',
      'event_ticket_requests_owner_or_admin_read_v4120',
      'event_ticket_signals_admin_read_v4120',
      'event_ticket_audit_admin_read_v4120'
    ])
  loop
    v_drift := array_append(v_drift, format('policy:%I.%I:%I', v_item.schemaname, v_item.tablename, v_item.policyname));
  end loop;

  for v_item in
    select n.nspname as schema_name, c.relname as table_name, t.tgname
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where not t.tgisinternal and n.nspname='public'
      and (t.tgname like 'event_ticket_%' or t.tgname like 'mhidas_ticket_%')
  loop
    v_drift := array_append(v_drift, format('trigger:%I.%I:%I', v_item.schema_name, v_item.table_name, v_item.tgname));
  end loop;

  foreach v_name in array array[
    'event_ticket_credentials_one_active_v4120_uq',
    'event_ticket_retention_policy_active_dimension_v4120_uq',
    'event_ticket_channels_one_active_v4120_uq',
    'event_ticket_receipts_semantic_v4120_uq',
    'event_ticket_signal_transaction_v4120_uq'
  ] loop
    if to_regclass('public.' || v_name) is not null then
      v_drift := array_append(v_drift, 'index:public.' || v_name);
    end if;
  end loop;

  if exists (
    select 1 from information_schema.role_routine_grants
    where routine_schema='public' and grantee in ('PUBLIC','anon','authenticated','service_role')
      and (routine_name like 'mhidas_ticket_%' or routine_name like 'mhidas_record_event_ticket_%')
  ) then v_drift := array_append(v_drift, 'unexpected_routine_grants'); end if;

  if cardinality(v_missing) > 0 or cardinality(v_drift) > 0 then
    raise exception 'V4_8_120_BASE_PREFLIGHT_FAILED missing=[%] drift=[%]', array_to_string(v_missing, ','), array_to_string(v_drift, ',');
  end if;
end;
$mhidas_preflight$;

-- =============================================================================
-- 2. FINAL HELPERS, CONTRACT-JSON VALIDATION AND DEFERRED INVARIANTS
-- =============================================================================

create function public.mhidas_ticket_sha256_v1(p_value text)
returns text language sql immutable strict set search_path = public, pg_temp
as $mhidas_sql$ select encode(digest(p_value, 'sha256'), 'hex'); $mhidas_sql$;

create function public.mhidas_ticket_hmac_sha256_v1(p_payload text, p_secret text)
returns text language sql immutable strict set search_path = public, pg_temp
as $mhidas_sql$ select encode(hmac(p_payload, p_secret, 'sha256'), 'hex'); $mhidas_sql$;

create function public.mhidas_ticket_canonical_payload_v1(p_domain text, p_payload jsonb)
returns text
language sql
immutable
strict
set search_path = public, pg_temp
as $mhidas_sql$
  select p_domain || ':' || encode(convert_to(p_payload::text, 'UTF8'), 'base64');
$mhidas_sql$;

create function public.mhidas_ticket_deterministic_uuid_v1(p_value text)
returns uuid language sql immutable strict set search_path = public, pg_temp
as $mhidas_sql$
  with h as (select encode(digest(p_value, 'sha256'), 'hex') as value)
  select (substr(value,1,8)||'-'||substr(value,9,4)||'-'||'5'||substr(value,14,3)||'-'||'8'||substr(value,18,3)||'-'||substr(value,21,12))::uuid from h;
$mhidas_sql$;

create function public.mhidas_ticket_json_matches_contract_v4(
  p_contract text,
  p_value jsonb,
  p_depth integer default 0
)
returns boolean
language plpgsql
immutable
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_key text;
  v_child jsonb;
  v_type text;
  v_text text;
  v_allowed text[];
  v_object_key_count integer;
begin
  if p_value is null or p_depth <> 0 or jsonb_typeof(p_value) <> 'object' or octet_length(p_value::text) > 8192 then return false; end if;
  v_allowed := case p_contract
    when 'partner_metadata' then array['legal_reference_hash','source_reference_hash','classification','country_code']
    when 'representative_metadata' then array['role_reference_hash','verification_reference_hash','classification']
    when 'integration_metadata' then array['provider_code','environment','protocol_version','classification']
    when 'request_metadata' then array['campaign_reference_hash','benefit_type','classification','currency_code']
    when 'channel_metadata' then array['campaign_reference_hash','placement_code','classification','currency_code']
    when 'signal_evidence' then array['provider_code','conversion_stage','campaign_reference_hash','amount_bucket','currency_code','occurred_at_bucket','classification']
    when 'communication_metadata' then array['campaign_reference_hash','template_code','classification']
    when 'retention_checkpoint' then array['phase','cursor_hash','processed_counts']
    when 'audit_snapshot' then array['status','version','state_hash','classification','reason_code']
    else array[]::text[]
  end;
  if cardinality(v_allowed)=0 then return false; end if;
  for v_key,v_child in select key,value from jsonb_each(p_value) loop
    if v_key<>lower(v_key) or not (v_key=any(v_allowed)) then return false; end if;
    v_type:=jsonb_typeof(v_child);
    if v_key='processed_counts' then
      if p_contract<>'retention_checkpoint' or v_type<>'object' then return false; end if;
      select count(*) into v_object_key_count from jsonb_object_keys(v_child);
      if v_object_key_count>12 then return false; end if;
      if exists (
        select 1 from jsonb_each(v_child) x
        where x.key not in ('receipt','audit','signal','click','context','communication','backfill','expired_context','attempted','locked','changed','blocked')
           or jsonb_typeof(x.value)<>'number'
           or (x.value #>> '{}') !~ '^[0-9]{1,10}$'
      ) then return false; end if;
    else
      if v_type<>'string' then return false; end if;
      v_text:=v_child #>> '{}';
      if right(v_key,5)='_hash' or v_key in ('cursor_hash','state_hash') then
        if v_text !~ '^[0-9a-f]{64}$' then return false; end if;
      elsif v_key='country_code' then
        if v_text !~ '^[A-Z]{2}$' then return false; end if;
      elsif v_key='currency_code' then
        if v_text !~ '^[A-Z]{3}$' then return false; end if;
      elsif v_key='protocol_version' then
        if v_text !~ '^[0-9]{1,3}(\.[0-9]{1,3}){0,2}$' then return false; end if;
      elsif length(v_text) not between 1 and 80 or v_text !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]*$' then
        return false;
      end if;
    end if;
  end loop;
  return true;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_extract_hostname_v2(p_url text)
returns text language sql immutable strict set search_path = public, pg_temp
as $mhidas_sql$ select lower(split_part(split_part(p_url, '://', 2), '/', 1)); $mhidas_sql$;

create function public.mhidas_ticket_hostname_is_public_v2(p_hostname text)
returns boolean language sql immutable strict set search_path = public, pg_temp
as $mhidas_sql$
  select p_hostname ~ '^[a-z0-9][a-z0-9.-]{1,252}[a-z0-9]$'
    and p_hostname not in ('localhost','localhost.localdomain')
    and p_hostname not like '%.local' and p_hostname not like '%.internal'
    and p_hostname not like '127.%' and p_hostname not like '10.%'
    and p_hostname not like '192.168.%' and p_hostname not like '169.254.%'
    and p_hostname not like '172.16.%' and p_hostname not like '172.17.%'
    and p_hostname not like '172.18.%' and p_hostname not like '172.19.%'
    and p_hostname not like '172.2%.%' and p_hostname not like '172.30.%'
    and p_hostname not like '172.31.%' and p_hostname not like '[%';
$mhidas_sql$;

create function public.mhidas_ticket_resolve_active_retention_policy_v2(
  p_policy_purpose text, p_jurisdiction_code text, p_evidence_class text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare v_policy_id uuid;
begin
  select retention_policy_version_id into v_policy_id
  from public.event_ticket_retention_policy_versions
  where policy_status='active' and policy_purpose=p_policy_purpose
    and jurisdiction_code=p_jurisdiction_code and evidence_class=p_evidence_class
  for share;
  if not found then raise exception 'ACTIVE_RETENTION_POLICY_NOT_FOUND_V2:%:%:%', p_policy_purpose,p_jurisdiction_code,p_evidence_class; end if;
  return v_policy_id;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_lock_current_credential_v4(
  p_integration_id uuid, p_credential_version_id uuid
)
returns table (
  partner_id uuid,
  principal_namespace text,
  verifier_key_hash text,
  credential_fingerprint_hash text,
  credential_key_id text,
  signature_algorithm text,
  issuer_service_key_hash text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
begin
  return query
  select p.partner_id,i.principal_namespace,c.verifier_key_hash,c.credential_fingerprint_hash,c.credential_key_id,c.signature_algorithm,i.issuer_service_key_hash
  from public.commercial_partners p
  join public.event_ticket_trusted_integrations i on i.partner_id=p.partner_id
  join public.event_ticket_trusted_integration_credential_versions c
    on c.integration_id=i.integration_id and c.credential_version_id=p_credential_version_id
  where i.integration_id=p_integration_id and p.partner_status='verified'
    and i.integration_status='active' and i.current_credential_version_id=p_credential_version_id
    and i.issuer_service_key_hash is not null
    and c.credential_status='active' and c.valid_from<=now() and (c.valid_until is null or c.valid_until>now())
  for update of p,i,c;
  if not found then raise exception 'CURRENT_ACTIVE_CREDENTIAL_REQUIRED_V4'; end if;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_required_scope_for_signal_v1(p_signal_type text)
returns text language sql immutable strict set search_path = public, pg_temp
as $mhidas_sql$
  select case when p_signal_type in ('confirmed_conversion','correction') then 'conversion_confirmation' else 'purchase_signal' end;
$mhidas_sql$;

create function public.mhidas_ticket_verify_commercial_destination_envelope_v2(
  p_ciphertext text,
  p_envelope_key_id text,
  p_envelope_mac text,
  p_expected_envelope_hash text,
  p_expected_url_hash text,
  p_expected_hostname text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_plaintext text;
  v_hostname text;
  v_envelope_hash text;
begin
  if p_ciphertext is null or p_envelope_key_id is null or p_envelope_mac is null
    or p_expected_envelope_hash !~ '^[0-9a-f]{64}$'
    or p_expected_url_hash !~ '^[0-9a-f]{64}$' or p_expected_hostname is null then return false; end if;
  v_envelope_hash:=public.mhidas_ticket_sha256_v1(
    public.mhidas_ticket_canonical_payload_v1(
      'mhidas.commercial-destination-envelope.v2',
      jsonb_build_object(
        'ciphertext_hash',public.mhidas_ticket_sha256_v1(p_ciphertext),
        'envelope_key_id',p_envelope_key_id,
        'envelope_mac',p_envelope_mac,
        'destination_url_hash',p_expected_url_hash,
        'destination_hostname',p_expected_hostname
      )
    )
  );
  if v_envelope_hash<>p_expected_envelope_hash then return false; end if;
  v_plaintext:=public.mhidas_decrypt_verified_url_envelope_v1(p_ciphertext,p_envelope_key_id,p_envelope_mac);
  if v_plaintext is null or v_plaintext !~ '^https://' then return false; end if;
  v_hostname:=public.mhidas_ticket_extract_hostname_v2(v_plaintext);
  return public.mhidas_ticket_sha256_v1(v_plaintext)=p_expected_url_hash
    and v_hostname=p_expected_hostname
    and public.mhidas_ticket_hostname_is_public_v2(v_hostname);
exception when others then
  return false;
end;
$mhidas_plpgsql$;



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
  constraint commercial_partners_key_v4120_check
    check (partner_key ~ '^[a-z0-9][a-z0-9_]{2,79}$'),
  constraint commercial_partners_status_v4120_check
    check (partner_status in ('pending_verification','verified','suspended','deactivated')),
  constraint commercial_partners_verification_v4120_check
    check (
      partner_status <> 'verified'
      or (verified_by_admin_user_id is not null and verified_at is not null)
    ),
  constraint commercial_partners_metadata_v4120_check
    check (public.mhidas_ticket_json_matches_contract_v4('partner_metadata', metadata))
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
  constraint commercial_partner_representatives_identity_v4120_unique
    unique (partner_id, user_id),
  constraint commercial_partner_representatives_role_v4120_check
    check (representative_role in ('owner','commercial','marketing','operations','legal')),
  constraint commercial_partner_representatives_status_v4120_check
    check (representation_status in ('pending','active','suspended','revoked')),
  constraint commercial_partner_representatives_validity_v4120_check
    check (valid_until is null or valid_from is null or valid_until > valid_from),
  constraint commercial_partner_representatives_metadata_v4120_check
    check (public.mhidas_ticket_json_matches_contract_v4('representative_metadata', metadata))
);

create table public.event_ticket_trusted_integrations (
  integration_id uuid primary key default gen_random_uuid(),
  integration_key text not null unique,
  principal_namespace text not null unique,
  partner_id uuid references public.commercial_partners(partner_id) on delete restrict,
  integration_status text not null default 'pending',
  current_credential_version_id uuid,
  issuer_service_key_hash text,
  activated_by_admin_user_id uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  suspended_at timestamptz,
  retired_at timestamptz,
  lock_version integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_ticket_integrations_key_v4120_check
    check (integration_key ~ '^[a-z0-9][a-z0-9_.-]{2,79}$'),
  constraint event_ticket_integrations_namespace_v4120_check
    check (principal_namespace ~ '^[a-z0-9][a-z0-9_.-]{2,79}$'),
  constraint event_ticket_integrations_status_v4120_check
    check (integration_status in ('pending','active','suspended','retired')),
  constraint event_ticket_integrations_partner_v4120_check
    check (integration_status <> 'active' or (partner_id is not null and current_credential_version_id is not null and issuer_service_key_hash ~ '^[0-9a-f]{64}$')),
  constraint event_ticket_integrations_metadata_v4120_check
    check (public.mhidas_ticket_json_matches_contract_v4('integration_metadata', metadata))
);

create table public.event_ticket_trusted_integration_credential_versions (
  credential_version_id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.event_ticket_trusted_integrations(integration_id) on delete restrict,
  credential_version integer not null,
  credential_status text not null default 'pending',
  credential_fingerprint_hash text not null,
  verifier_key_hash text not null,
  credential_key_id text not null,
  signature_algorithm text not null,
  valid_from timestamptz not null,
  valid_until timestamptz,
  activated_by_admin_user_id uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  revoked_by_admin_user_id uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revocation_reason_hash text,
  created_at timestamptz not null default now(),
  constraint event_ticket_credentials_pair_v4120_unique
    unique (integration_id, credential_version_id),
  constraint event_ticket_credentials_version_v4120_unique
    unique (integration_id, credential_version),
  constraint event_ticket_credentials_status_v4120_check
    check (credential_status in ('pending','active','rotating','revoked','expired')),
  constraint event_ticket_credentials_hashes_v4120_check
    check (
      credential_fingerprint_hash ~ '^[0-9a-f]{64}$'
      and verifier_key_hash ~ '^[0-9a-f]{64}$'
      and credential_key_id ~ '^[a-zA-Z0-9][a-zA-Z0-9._:/-]{2,199}$'
      and signature_algorithm in ('ed25519','ecdsa-p256-sha256','rsa-pss-sha256')
      and (revocation_reason_hash is null or revocation_reason_hash ~ '^[0-9a-f]{64}$')
    ),
  constraint event_ticket_credentials_validity_v4120_check
    check (valid_until is null or valid_until > valid_from)
);

create function public.mhidas_ticket_assert_current_credential_invariant_v2()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_integration_id uuid := coalesce(new.integration_id, old.integration_id);
  v_integration public.event_ticket_trusted_integrations%rowtype;
  v_active_count integer;
begin
  select * into v_integration from public.event_ticket_trusted_integrations where integration_id=v_integration_id;
  if not found then return null; end if;
  select count(*) into v_active_count from public.event_ticket_trusted_integration_credential_versions
  where integration_id=v_integration_id and credential_status='active';
  if v_active_count > 1 then raise exception 'MULTIPLE_ACTIVE_CREDENTIALS_DENIED_V1:%', v_integration_id; end if;
  if v_integration.integration_status='active' then
    if v_integration.partner_id is null or v_integration.current_credential_version_id is null or v_integration.issuer_service_key_hash is null then
      raise exception 'ACTIVE_INTEGRATION_AUTHORITY_INCOMPLETE_V1:%', v_integration_id;
    end if;
    if not exists (
      select 1 from public.event_ticket_trusted_integration_credential_versions c
      where c.integration_id=v_integration_id and c.credential_version_id=v_integration.current_credential_version_id
        and c.credential_status='active' and c.valid_from<=now() and (c.valid_until is null or c.valid_until>now())
    ) then raise exception 'ACTIVE_INTEGRATION_CURRENT_CREDENTIAL_INVALID_V1:%', v_integration_id; end if;
  end if;
  return null;
end;
$mhidas_plpgsql$;

create unique index event_ticket_credentials_one_active_v4120_uq
  on public.event_ticket_trusted_integration_credential_versions (integration_id)
  where credential_status = 'active';

alter table public.event_ticket_trusted_integrations
  add constraint event_ticket_integrations_current_credential_v4120_fk
  foreign key (integration_id, current_credential_version_id)
  references public.event_ticket_trusted_integration_credential_versions (
    integration_id,
    credential_version_id
  )
  on delete restrict;

create constraint trigger event_ticket_integrations_current_credential_v4120_ct
  after insert or update of integration_status,current_credential_version_id,partner_id,issuer_service_key_hash
  on public.event_ticket_trusted_integrations
  deferrable initially deferred
  for each row execute function public.mhidas_ticket_assert_current_credential_invariant_v2();

create constraint trigger event_ticket_credentials_current_invariant_v4120_ct
  after insert or update of credential_status,valid_from,valid_until
  on public.event_ticket_trusted_integration_credential_versions
  deferrable initially deferred
  for each row execute function public.mhidas_ticket_assert_current_credential_invariant_v2();

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
  constraint event_ticket_integration_channels_identity_v4120_unique
    unique (integration_id, canonical_event_id, channel_scope),
  constraint event_ticket_integration_channels_authority_v4120_unique
    unique (integration_channel_id, integration_id, canonical_event_id),
  constraint event_ticket_integration_channels_authority_scope_v4120_unique
    unique (integration_channel_id, integration_id, canonical_event_id, channel_scope),
  constraint event_ticket_integration_channels_scope_v4120_check
    check (channel_scope in ('purchase_signal','url_validation','conversion_confirmation')),
  constraint event_ticket_integration_channels_status_v4120_check
    check (scope_status in ('pending','active','suspended','revoked')),
  constraint event_ticket_integration_channels_validity_v4120_check
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
  constraint event_ticket_requests_submission_v4120_unique
    unique (partner_id, client_submission_key),
  constraint event_ticket_requests_authorization_v4120_unique
    unique (request_id, canonical_event_id, partner_id),
  constraint event_ticket_requests_type_v4120_check
    check (request_type in (
      'ticket_sales_partnership','affiliate_campaign','discount_campaign',
      'presale_campaign','fixed_media_campaign','hybrid_commercial_partnership'
    )),
  constraint event_ticket_requests_status_v4120_check
    check (request_status in ('pending','needs_info','approved','rejected','withdrawn')),
  constraint event_ticket_requests_hashes_v4120_check
    check (
      (commercial_contact_reference_hash is null or commercial_contact_reference_hash ~ '^[0-9a-f]{64}$')
      and (commercial_notes_hash is null or commercial_notes_hash ~ '^[0-9a-f]{64}$')
      and (admin_notes_hash is null or admin_notes_hash ~ '^[0-9a-f]{64}$')
      and (review_evidence_hash is null or review_evidence_hash ~ '^[0-9a-f]{64}$')
      and (lifecycle_reason_hash is null or lifecycle_reason_hash ~ '^[0-9a-f]{64}$')
    ),
  constraint event_ticket_requests_metadata_v4120_check
    check (public.mhidas_ticket_json_matches_contract_v4('request_metadata', metadata))
);

create table public.event_ticket_retention_policy_bootstrap_receipts (
  bootstrap_receipt_id uuid primary key,
  bootstrap_key text not null unique,
  bootstrap_status text not null,
  policy_count integer not null,
  manifest_hash text not null,
  migration_authority_hash text not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint event_ticket_retention_bootstrap_status_v4120_check
    check (bootstrap_status = 'completed'),
  constraint event_ticket_retention_bootstrap_count_v4120_check
    check (policy_count = 7),
  constraint event_ticket_retention_bootstrap_hashes_v4120_check
    check (manifest_hash ~ '^[0-9a-f]{64}$' and migration_authority_hash ~ '^[0-9a-f]{64}$')
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
  rule_manifest_hash text not null default repeat('0',64),
  approved_by_admin_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  activated_at timestamptz,
  retired_at timestamptz,
  superseded_by_policy_version_id uuid,
  retirement_drain_completed_at timestamptz,
  bootstrap_receipt_id uuid references public.event_ticket_retention_policy_bootstrap_receipts(bootstrap_receipt_id) on delete restrict,
  executor_contract_hash text not null,
  lock_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_ticket_retention_policy_version_v4120_unique
    unique (policy_key, policy_version),
  constraint event_ticket_retention_policy_status_v4120_check
    check (policy_status in ('draft','approved','active','retired')),
  constraint event_ticket_retention_policy_dimensions_v4120_check
    check (
      policy_purpose in (
        'event_ticket_tracking','commercial_governance','security_audit',
        'operation_receipt','commercial_audit'
      )
      and jurisdiction_code ~ '^[A-Z]{2}$'
      and evidence_class in (
        'clubber','redirect','trusted','admin','operation_receipt',
        'commercial_audit','credential_context','click_attribution',
        'purchase_signal','partner_communication','backfill_rejection'
      )
    ),
  constraint event_ticket_retention_policy_action_v4120_check
    check (retention_action in ('delete','anonymize','tombstone')),
  constraint event_ticket_retention_policy_days_v4120_check
    check (retention_days between 1 and 3650),
  constraint event_ticket_retention_policy_hashes_v4120_check
    check (
      legal_basis_reference_hash ~ '^[0-9a-f]{64}$'
      and policy_manifest_hash ~ '^[0-9a-f]{64}$'
      and rule_manifest_hash ~ '^[0-9a-f]{64}$'
      and executor_contract_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint event_ticket_retention_policy_approval_v4120_check
    check (
      policy_status = 'draft'
      or (approved_at is not null and (approved_by_admin_user_id is not null or bootstrap_receipt_id is not null))
    ),
  constraint event_ticket_retention_policy_activation_v4120_check
    check (policy_status <> 'active' or activated_at is not null),
  constraint event_ticket_retention_policy_retirement_v4120_check
    check (
      policy_status <> 'retired'
      or (retired_at is not null and superseded_by_policy_version_id is not null)
    )
);

alter table public.event_ticket_retention_policy_versions
  add constraint event_ticket_retention_policy_successor_v4120_fk
  foreign key (superseded_by_policy_version_id)
  references public.event_ticket_retention_policy_versions(retention_policy_version_id)
  on delete restrict;

create unique index event_ticket_retention_policy_active_dimension_v4120_uq
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
  constraint event_ticket_minimization_rule_identity_v4120_unique
    unique (retention_policy_version_id, evidence_class, source_table, source_field),
  constraint event_ticket_minimization_rule_action_v4120_check
    check (minimization_action in ('delete','nullify','stable_hash','retain','replace_with_tombstone')),
  constraint event_ticket_minimization_rule_hash_v4120_check
    check (
      minimization_action <> 'stable_hash'
      or stable_hash_namespace ~ '^[a-z0-9][a-z0-9._-]{2,80}$'
    ),
  constraint event_ticket_minimization_rule_status_v4120_check
    check (rule_status in ('active','retired'))
);

create table public.event_ticket_url_validation_authorities (
  url_validation_authority_id uuid primary key default gen_random_uuid(),
  authority_key text not null unique,
  authority_status text not null default 'pending',
  signer_key_hash text not null,
  signer_key_id text not null,
  signature_algorithm text not null,
  manifest_version integer not null,
  valid_from timestamptz not null,
  valid_until timestamptz,
  approved_by_admin_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint event_ticket_url_authority_status_v4120_check check (authority_status in ('pending','active','suspended','retired')),
  constraint event_ticket_url_authority_hash_v4120_check check (
    signer_key_hash ~ '^[0-9a-f]{64}$'
    and signer_key_id ~ '^[a-zA-Z0-9][a-zA-Z0-9._:/-]{2,199}$'
    and signature_algorithm in ('ed25519','ecdsa-p256-sha256','rsa-pss-sha256')
  ),
  constraint event_ticket_url_authority_validity_v4120_check check (valid_until is null or valid_until > valid_from)
);

create table public.event_ticket_official_source_attestations (
  official_source_attestation_id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  source_url text not null,
  source_url_hash text not null,
  source_hostname text not null,
  url_validation_authority_id uuid not null references public.event_ticket_url_validation_authorities(url_validation_authority_id) on delete restrict,
  authority_manifest_hash text not null,
  canonical_payload_hash text not null,
  attestation_signature text not null,
  attestation_signature_hash text not null,
  signer_key_hash_snapshot text not null,
  signer_key_id_snapshot text not null,
  signature_algorithm_snapshot text not null,
  validator_version integer not null,
  commercial_policy_status text not null,
  validated_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint event_ticket_official_source_identity_v4120_unique unique (canonical_event_id, source_url),
  constraint event_ticket_official_source_hashes_v4120_check check (
    source_url_hash ~ '^[0-9a-f]{64}$' and authority_manifest_hash ~ '^[0-9a-f]{64}$'
    and canonical_payload_hash ~ '^[0-9a-f]{64}$' and attestation_signature_hash ~ '^[0-9a-f]{64}$'
    and signer_key_hash_snapshot ~ '^[0-9a-f]{64}$'
  ),
  constraint event_ticket_official_source_signature_v4120_check check (
    length(attestation_signature) between 32 and 4096
    and signer_key_id_snapshot ~ '^[a-zA-Z0-9][a-zA-Z0-9._:/-]{2,199}$'
    and signature_algorithm_snapshot in ('ed25519','ecdsa-p256-sha256','rsa-pss-sha256')
  ),
  constraint event_ticket_official_source_host_v4120_check check (
    public.mhidas_ticket_hostname_is_public_v2(source_hostname)
    and source_hostname = public.mhidas_ticket_extract_hostname_v2(source_url)
    and source_url_hash = public.mhidas_ticket_sha256_v1(source_url)
  ),
  constraint event_ticket_official_source_policy_v4120_check check (commercial_policy_status in ('official_noncommercial','commercial_authorized')),
  constraint event_ticket_official_source_freshness_v4120_check check (expires_at > validated_at and expires_at <= validated_at + interval '30 days')
);

create table public.event_ticket_commercial_channels (
  channel_id uuid primary key default gen_random_uuid(),
  public_redirect_token uuid not null default gen_random_uuid() unique,
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  partner_id uuid not null references public.commercial_partners(partner_id) on delete restrict,
  request_id uuid not null,
  integration_id uuid not null references public.event_ticket_trusted_integrations(integration_id) on delete restrict,
  integration_channel_id uuid not null,
  channel_status text not null default 'draft',
  channel_kind text not null,
  destination_url_ciphertext text,
  destination_envelope_key_id text,
  destination_envelope_mac text,
  destination_envelope_hash text,
  destination_url_hash text,
  destination_hostname text,
  tracking_method text not null default 'none',
  financial_model text not null,
  commission_basis_points integer,
  fixed_fee_minor bigint,
  currency_code text,
  financial_terms_hash text,
  lifecycle_snapshot_hash text,
  authorized_scope_snapshot_hash text,
  authorization_receipt_id uuid,
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
  resolved_ip_set_hash text,
  redirect_chain_validation_hash text,
  url_proof_attestation_hash text,
  url_proof_manifest_hash text,
  url_proof_canonical_payload_hash text,
  url_proof_signature text,
  url_proof_signer_key_hash text,
  url_proof_signer_key_id text,
  url_proof_signature_algorithm text,
  url_validation_authority_id uuid references public.event_ticket_url_validation_authorities(url_validation_authority_id) on delete restrict,
  retention_policy_version_id uuid references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  lock_version integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_ticket_channels_semantic_v4120_unique unique (channel_id, canonical_event_id, integration_id),
  constraint event_ticket_channels_request_v4120_fk foreign key (request_id,canonical_event_id,partner_id)
    references public.event_ticket_partnership_requests(request_id,canonical_event_id,partner_id) on delete restrict,
  constraint event_ticket_channels_scope_v4120_fk foreign key (integration_channel_id,integration_id,canonical_event_id)
    references public.event_ticket_trusted_integration_channels(integration_channel_id,integration_id,canonical_event_id) on delete restrict,
  constraint event_ticket_channels_status_v4120_check check (channel_status in ('draft','authorized','active','paused','expired','revoked')),
  constraint event_ticket_channels_kind_v4120_check check (channel_kind in ('official_reference','affiliate','discount','presale','fixed_media','hybrid')),
  constraint event_ticket_channels_tracking_v4120_check check (tracking_method in ('none','redirect','coupon','postback','webhook','partner_api')),
  constraint event_ticket_channels_financial_v4120_check check (
    financial_model in ('none','commission','fixed_fee','hybrid')
    and (commission_basis_points is null or commission_basis_points between 1 and 10000)
    and (fixed_fee_minor is null or fixed_fee_minor >= 0)
    and (currency_code is null or currency_code ~ '^[A-Z]{3}$')
  ),
  constraint event_ticket_channels_hashes_v4120_check check (
    (destination_url_hash is null or destination_url_hash ~ '^[0-9a-f]{64}$')
    and (destination_envelope_hash is null or destination_envelope_hash ~ '^[0-9a-f]{64}$')
    and (destination_envelope_mac is null or destination_envelope_mac ~ '^[0-9a-f]{64,128}$')
    and (destination_envelope_key_id is null or destination_envelope_key_id ~ '^[a-zA-Z0-9][a-zA-Z0-9._:/-]{2,199}$')
    and (last_health_check_hash is null or last_health_check_hash ~ '^[0-9a-f]{64}$')
    and (resolved_host_hash is null or resolved_host_hash ~ '^[0-9a-f]{64}$')
    and (resolved_ip_set_hash is null or resolved_ip_set_hash ~ '^[0-9a-f]{64}$')
    and (redirect_chain_validation_hash is null or redirect_chain_validation_hash ~ '^[0-9a-f]{64}$')
    and (url_proof_attestation_hash is null or url_proof_attestation_hash ~ '^[0-9a-f]{64}$')
    and (url_proof_manifest_hash is null or url_proof_manifest_hash ~ '^[0-9a-f]{64}$')
    and (url_proof_canonical_payload_hash is null or url_proof_canonical_payload_hash ~ '^[0-9a-f]{64}$')
    and (url_proof_signer_key_hash is null or url_proof_signer_key_hash ~ '^[0-9a-f]{64}$')
    and (url_proof_signature is null or length(url_proof_signature) between 32 and 4096)
    and (url_proof_signer_key_id is null or url_proof_signer_key_id ~ '^[a-zA-Z0-9][a-zA-Z0-9._:/-]{2,199}$')
    and (url_proof_signature_algorithm is null or url_proof_signature_algorithm in ('ed25519','ecdsa-p256-sha256','rsa-pss-sha256'))
    and (financial_terms_hash is null or financial_terms_hash ~ '^[0-9a-f]{64}$')
    and (lifecycle_snapshot_hash is null or lifecycle_snapshot_hash ~ '^[0-9a-f]{64}$')
    and (authorized_scope_snapshot_hash is null or authorized_scope_snapshot_hash ~ '^[0-9a-f]{64}$')
  ),
  constraint event_ticket_channels_active_authority_v4120_check check (
    channel_status <> 'active' or (
      request_id is not null and integration_channel_id is not null and authorization_receipt_id is not null
      and authorized_by_admin_user_id is not null and authorized_at is not null and activated_at is not null
      and financial_terms_hash is not null and lifecycle_snapshot_hash is not null and authorized_scope_snapshot_hash is not null
      and destination_url_ciphertext is not null and length(destination_url_ciphertext) between 32 and 32768
      and destination_envelope_key_id is not null and destination_envelope_mac is not null and destination_envelope_hash is not null
      and destination_url_hash is not null and destination_hostname is not null
      and valid_from is not null and (valid_until is null or valid_until > valid_from)
      and url_validation_status='validated' and url_validation_authority_id is not null
      and url_validated_at is not null and url_validation_expires_at is not null
      and url_validation_expires_at > url_validated_at and url_validation_expires_at > activated_at
      and last_health_checked_at is not null and last_health_check_hash is not null and url_validator_version is not null
      and resolved_host_hash is not null and resolved_ip_set_hash is not null and redirect_chain_validation_hash is not null
      and url_proof_attestation_hash is not null and url_proof_manifest_hash is not null and url_proof_canonical_payload_hash is not null
      and url_proof_signature is not null and url_proof_signer_key_hash is not null and url_proof_signer_key_id is not null
      and url_proof_signature_algorithm is not null
    )
  ),
  constraint event_ticket_channels_metadata_v4120_check check (public.mhidas_ticket_json_matches_contract_v4('channel_metadata', metadata))
);

create unique index event_ticket_channels_one_active_v4120_uq
  on public.event_ticket_commercial_channels (canonical_event_id)
  where channel_status='active';

-- =============================================================================
-- 5. RECEIPTS, CONTEXTS, SIGNALS, AUDIT AND RETENTION RUNS
-- =============================================================================

create table public.event_ticket_operation_result_contracts (
  operation_name text not null,
  result_status text not null,
  minimum_result_version integer not null default 1,
  maximum_result_version integer,
  contract_status text not null default 'active',
  created_at timestamptz not null default now(),
  primary key (operation_name, result_status),
  constraint event_ticket_result_contract_name_v4120_check check (operation_name ~ '^[a-z0-9][a-z0-9._:-]{2,119}$'),
  constraint event_ticket_result_contract_status_v4120_check check (
    result_status ~ '^[a-z0-9][a-z0-9._:-]{2,79}$'
    and result_status not in ('pending','failed')
    and contract_status in ('active','retired')
  ),
  constraint event_ticket_result_contract_version_v4120_check check (
    minimum_result_version >= 1
    and (maximum_result_version is null or maximum_result_version >= minimum_result_version)
  )
);

create table public.event_ticket_retention_executor_contracts (
  evidence_class text primary key,
  executor_version integer not null,
  canonical_rule_manifest_hash text not null,
  executor_code_hash text not null,
  contract_hash text not null unique,
  contract_status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint event_ticket_retention_executor_hashes_v4120_check check (
    canonical_rule_manifest_hash ~ '^[0-9a-f]{64}$' and executor_code_hash ~ '^[0-9a-f]{64}$' and contract_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint event_ticket_retention_executor_status_v4120_check check (contract_status in ('active','retired'))
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
  retention_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  minimized_at timestamptz,
  created_at timestamptz not null default now(),
  constraint event_ticket_backfill_identity_v4120_unique
    unique (reconciliation_run_key, source_table, source_primary_key),
  constraint event_ticket_backfill_source_v4120_check
    check (source_table in ('partner_ticket_requests','event_groups','event_ticket_intents','event_sources')),
  constraint event_ticket_backfill_hash_v4120_check
    check (source_payload_hash ~ '^[0-9a-f]{64}$')
);

create table public.event_ticket_legacy_backfill_runs (
  backfill_run_id uuid primary key,
  idempotency_key text not null unique,
  run_status text not null default 'prepared',
  source_inventory_hash text not null,
  mapped_count bigint not null default 0,
  rejected_count bigint not null default 0,
  mapped_checksum text not null,
  rejection_checksum text not null,
  cutover_ready boolean not null default false,
  created_by_admin_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint event_ticket_legacy_backfill_run_status_v4120_check check (run_status in ('prepared','validated','cutover_ready','cutover_completed','rolled_back','failed')),
  constraint event_ticket_legacy_backfill_run_hashes_v4120_check check (source_inventory_hash ~ '^[0-9a-f]{64}$' and mapped_checksum ~ '^[0-9a-f]{64}$' and rejection_checksum ~ '^[0-9a-f]{64}$')
);

create table public.event_ticket_legacy_backfill_items (
  backfill_run_id uuid not null references public.event_ticket_legacy_backfill_runs(backfill_run_id) on delete restrict,
  source_table text not null,
  source_row_hash text not null,
  mapping_status text not null,
  canonical_event_id uuid references public.canonical_events(id) on delete restrict,
  mapped_object_type text,
  mapped_object_id uuid,
  rejection_id uuid references public.event_ticket_backfill_rejections(rejection_id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (backfill_run_id,source_table,source_row_hash),
  constraint event_ticket_legacy_backfill_item_status_v4120_check check (mapping_status in ('mapped','rejected')),
  constraint event_ticket_legacy_backfill_item_source_v4120_check check (source_table in ('event_ticket_intents','partner_ticket_requests','event_sources')),
  constraint event_ticket_legacy_backfill_item_mapping_v4120_check check ((mapping_status='mapped' and canonical_event_id is not null and rejection_id is null) or (mapping_status='rejected' and rejection_id is not null)),
  constraint event_ticket_legacy_backfill_item_hash_v4120_check check (source_row_hash ~ '^[0-9a-f]{64}$')
);

create table public.event_ticket_legacy_cutover_checkpoints (
  checkpoint_id uuid primary key,
  backfill_run_id uuid not null references public.event_ticket_legacy_backfill_runs(backfill_run_id) on delete restrict,
  checkpoint_status text not null,
  legacy_count bigint not null,
  mapped_count bigint not null,
  rejected_count bigint not null,
  dual_read_checksum text not null,
  rollback_checksum text not null,
  approved_by_admin_user_id uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint event_ticket_legacy_cutover_status_v4120_check check (checkpoint_status in ('prepared','validated','approved','completed','rolled_back')),
  constraint event_ticket_legacy_cutover_hashes_v4120_check check (dual_read_checksum ~ '^[0-9a-f]{64}$' and rollback_checksum ~ '^[0-9a-f]{64}$')
);

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
  receipt_retention_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  anonymized_idempotency_hash text,
  anonymized_target_hash text,
  anonymized_result_hash text,
  anonymized_correlation_hash text,
  minimized_at timestamptz,
  correlation_id text not null,
  constraint event_ticket_receipts_credential_pair_v4120_fk
    foreign key (integration_id, credential_version_id)
    references public.event_ticket_trusted_integration_credential_versions (
      integration_id,
      credential_version_id
    )
    on delete restrict,
  constraint event_ticket_receipts_scope_v4120_check
    check (operation_scope in (
      'request_submit','request_mutation','channel_mutation','communication_mutation',
      'signal_insert','retention_run','channel_expiry','url_validation',
      'integration_mutation','integration_scope_mutation','partner_lifecycle',
      'retention_policy_mutation','credential_context_mutation','admin_signal_read',
      'credential_rotation'
    )),
  constraint event_ticket_receipts_principal_v4120_check
    check (
      principal_type in ('user','service_role','trusted_ticketing_integration','automation')
      and principal_namespace ~ '^[a-z0-9][a-z0-9_.:-]{1,119}$'
      and (
        (
          minimized_at is not null
          and principal_id is null
          and integration_id is null
          and credential_version_id is null
          and principal_namespace like 'minimized:%'
        )
        or (
          minimized_at is null
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
        )
      )
    ),
  constraint event_ticket_receipts_target_v4120_check
    check (target_type in (
      'canonical_event','commercial_partner','partner_request','commercial_channel',
      'partner_communication','retention_policy','trusted_integration',
      'trusted_integration_scope','credential_context','purchase_signal',
      'retention_run','operation_receipt','credential_version'
    )),
  constraint event_ticket_receipts_hashes_v4120_check
    check (
      request_hash ~ '^[0-9a-f]{64}$'
      and (result_hash is null or result_hash ~ '^[0-9a-f]{64}$')
      and (failure_hash is null or failure_hash ~ '^[0-9a-f]{64}$')
      and (anonymized_idempotency_hash is null or anonymized_idempotency_hash ~ '^[0-9a-f]{64}$')
      and (anonymized_target_hash is null or anonymized_target_hash ~ '^[0-9a-f]{64}$')
      and (anonymized_result_hash is null or anonymized_result_hash ~ '^[0-9a-f]{64}$')
      and (anonymized_correlation_hash is null or anonymized_correlation_hash ~ '^[0-9a-f]{64}$')
    ),
  constraint event_ticket_receipts_state_v4120_check
    check (
      (receipt_status = 'pending' and result_status = 'pending' and completed_at is null and failed_at is null and failure_hash is null)
      or (receipt_status = 'completed' and completed_at is not null and failed_at is null and result_hash is not null
          and result_status not in ('pending','failed') and result_version is not null and result_version >= 1)
      or (receipt_status = 'failed' and result_status = 'failed' and failed_at is not null and completed_at is null and failure_hash is not null)
    )
);

create unique index event_ticket_receipts_semantic_v4120_uq
  on public.event_ticket_operation_receipts (
    principal_type,
    coalesce(principal_id, '00000000-0000-0000-0000-000000000000'::uuid),
    principal_namespace,
    operation_name,
    idempotency_key
  );

alter table public.event_ticket_commercial_channels
  add constraint event_ticket_channels_authorization_receipt_v4120_fk
  foreign key (authorization_receipt_id)
  references public.event_ticket_operation_receipts(receipt_id)
  on delete restrict;

create table public.event_ticket_verified_credential_contexts (
  context_id uuid primary key,
  integration_id uuid not null,
  credential_version_id uuid not null,
  context_status text not null default 'active',
  context_token_hash text not null unique,
  audience text not null,
  operation_name text not null,
  request_payload_hash text not null,
  proof_nonce_hash text not null,
  proof_signature_hash text not null,
  canonical_payload_hash text not null,
  credential_key_id_snapshot text not null,
  signature_algorithm_snapshot text not null,
  verifier_key_hash_snapshot text not null,
  credential_fingerprint_hash_snapshot text not null,
  issuer_service_key_hash_snapshot text not null,
  issuance_idempotency_key text not null,
  issuance_receipt_id uuid not null references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  last_lifecycle_receipt_id uuid references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  consumed_receipt_id uuid references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  retention_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  expired_at timestamptz,
  revocation_reason_hash text,
  lifecycle_correlation_hash text,
  minimized_at timestamptz,
  constraint event_ticket_context_credential_pair_v4120_fk foreign key (integration_id,credential_version_id)
    references public.event_ticket_trusted_integration_credential_versions(integration_id,credential_version_id) on delete restrict,
  constraint event_ticket_context_semantic_issue_v4120_unique unique (integration_id,credential_version_id,audience,operation_name,request_payload_hash,proof_nonce_hash,context_token_hash,proof_signature_hash,canonical_payload_hash,expires_at),
  constraint event_ticket_context_consumed_receipt_v4120_unique unique (consumed_receipt_id),
  constraint event_ticket_context_status_v4120_check check (context_status in ('active','consumed','revoked','expired')),
  constraint event_ticket_context_contract_v4120_check check (audience ~ '^[a-z0-9][a-z0-9._:-]{2,79}$' and operation_name ~ '^[a-z0-9][a-z0-9._:-]{2,119}$'),
  constraint event_ticket_context_hashes_v4120_check check (
    context_token_hash ~ '^[0-9a-f]{64}$' and request_payload_hash ~ '^[0-9a-f]{64}$'
    and proof_nonce_hash ~ '^[0-9a-f]{64}$' and proof_signature_hash ~ '^[0-9a-f]{64}$'
    and canonical_payload_hash ~ '^[0-9a-f]{64}$'
    and credential_key_id_snapshot ~ '^[a-zA-Z0-9][a-zA-Z0-9._:/-]{2,199}$'
    and signature_algorithm_snapshot in ('ed25519','ecdsa-p256-sha256','rsa-pss-sha256')
    and verifier_key_hash_snapshot ~ '^[0-9a-f]{64}$' and credential_fingerprint_hash_snapshot ~ '^[0-9a-f]{64}$' and issuer_service_key_hash_snapshot ~ '^[0-9a-f]{64}$'
    and (revocation_reason_hash is null or revocation_reason_hash ~ '^[0-9a-f]{64}$')
    and (lifecycle_correlation_hash is null or lifecycle_correlation_hash ~ '^[0-9a-f]{64}$')
  ),
  constraint event_ticket_context_validity_v4120_check check (expires_at > issued_at),
  constraint event_ticket_context_terminal_v4120_check check (
    (context_status <> 'consumed' or (consumed_at is not null and consumed_receipt_id is not null))
    and (context_status <> 'revoked' or revoked_at is not null)
    and (context_status <> 'expired' or expired_at is not null)
  )
);

create table public.event_ticket_click_attributions (
  click_id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  channel_id uuid not null,
  integration_id uuid not null,
  redirect_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  visitor_hash text,
  campaign_hash text,
  retention_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  created_at timestamptz not null default now(),
  anonymized_at timestamptz,
  constraint event_ticket_click_channel_semantic_v4120_fk
    foreign key (channel_id, canonical_event_id, integration_id)
    references public.event_ticket_commercial_channels (channel_id, canonical_event_id, integration_id)
    on delete restrict,
  constraint event_ticket_click_semantic_v4120_unique
    unique (click_id, channel_id, canonical_event_id, integration_id),
  constraint event_ticket_click_redirect_v4120_unique unique (redirect_id),
  constraint event_ticket_click_hashes_v4120_check
    check (
      (visitor_hash is null or visitor_hash ~ '^[0-9a-f]{64}$')
      and (campaign_hash is null or campaign_hash ~ '^[0-9a-f]{64}$')
    )
);

create table public.event_ticket_purchase_signals (
  signal_id uuid primary key,
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  channel_id uuid,
  click_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  integration_id uuid,
  credential_version_id uuid,
  credential_context_id uuid references public.event_ticket_verified_credential_contexts(context_id) on delete restrict,
  receipt_id uuid not null unique references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  signal_type text not null,
  evidence_source text not null,
  external_transaction_hash text,
  anonymized_transaction_hash text,
  transaction_family_id uuid,
  evidence_hash text not null,
  evidence_metadata jsonb not null default '{}'::jsonb,
  retention_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  signal_status text not null default 'recorded',
  supersedes_signal_id uuid references public.event_ticket_purchase_signals(signal_id) on delete restrict,
  created_at timestamptz not null default now(),
  tombstoned_at timestamptz,
  minimized_at timestamptz,
  constraint event_ticket_signal_credential_pair_v4120_fk
    foreign key (integration_id, credential_version_id)
    references public.event_ticket_trusted_integration_credential_versions (
      integration_id,
      credential_version_id
    )
    on delete restrict,
  constraint event_ticket_signal_channel_semantic_v4120_fk
    foreign key (channel_id, canonical_event_id, integration_id)
    references public.event_ticket_commercial_channels (channel_id, canonical_event_id, integration_id)
    on delete restrict,
  constraint event_ticket_signal_click_semantic_v4120_fk
    foreign key (click_id, channel_id, canonical_event_id, integration_id)
    references public.event_ticket_click_attributions (click_id, channel_id, canonical_event_id, integration_id)
    on delete restrict,
  constraint event_ticket_signal_type_v4120_check
    check (signal_type in (
      'interest','self_declared_purchase','commercial_link_click',
      'attributed_conversion','confirmed_conversion','correction'
    )),
  constraint event_ticket_signal_source_v4120_check
    check (evidence_source in (
      'clubber_action','useclubbers_redirect','coupon_report','partner_report',
      'postback','webhook','partner_api','admin_correction'
    )),
  constraint event_ticket_signal_status_v4120_check
    check (signal_status in ('recorded','superseded','tombstoned')),
  constraint event_ticket_signal_hashes_v4120_check
    check (
      evidence_hash ~ '^[0-9a-f]{64}$'
      and (external_transaction_hash is null or external_transaction_hash ~ '^[0-9a-f]{64}$')
      and (anonymized_transaction_hash is null or anonymized_transaction_hash ~ '^[0-9a-f]{64}$')
      and (external_transaction_hash is null or transaction_family_id is not null)
      and public.mhidas_ticket_json_matches_contract_v4('signal_evidence', evidence_metadata)
    ),
  constraint event_ticket_signal_trusted_evidence_v4120_check
    check (
      signal_status = 'tombstoned'
      or signal_type not in ('attributed_conversion','confirmed_conversion')
      or (
        integration_id is not null
        and credential_version_id is not null
        and credential_context_id is not null
        and channel_id is not null
        and external_transaction_hash is not null
        and evidence_source in ('coupon_report','partner_report','postback','webhook','partner_api')
      )
    ),
  constraint event_ticket_signal_supersession_target_v4120_unique unique (signal_id,canonical_event_id,integration_id,transaction_family_id),
  constraint event_ticket_signal_supersession_v4120_fk foreign key (supersedes_signal_id,canonical_event_id,integration_id,transaction_family_id)
    references public.event_ticket_purchase_signals(signal_id,canonical_event_id,integration_id,transaction_family_id) on delete restrict,
  constraint event_ticket_signal_click_requires_channel_v4120_check
    check (click_id is null or channel_id is not null)
);

create unique index event_ticket_signal_transaction_v4120_uq
  on public.event_ticket_purchase_signals (
    integration_id,
    external_transaction_hash,
    signal_type
  )
  where external_transaction_hash is not null
    and signal_status = 'recorded';

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
  retention_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  minimized_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_communications_status_v4120_check
    check (communication_status in ('draft','submitted','approved','published','paused','revoked','expired')),
  constraint partner_communications_audience_v4120_check
    check (audience_scope in ('all_active_clubbers','event_participants','partner_event_audience')),
  constraint partner_communications_hash_v4120_check
    check (body_hash ~ '^[0-9a-f]{64}$'),
  constraint partner_communications_validity_v4120_check
    check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint partner_communications_metadata_v4120_check
    check (public.mhidas_ticket_json_matches_contract_v4('communication_metadata', metadata))
);

create table public.event_ticket_retention_runs (
  retention_run_id uuid primary key,
  receipt_id uuid not null unique references public.event_ticket_operation_receipts(receipt_id) on delete restrict,
  receipt_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  audit_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  signal_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  click_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  context_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  communication_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  backfill_policy_version_id uuid not null references public.event_ticket_retention_policy_versions(retention_policy_version_id) on delete restrict,
  run_status text not null default 'running',
  batch_limit integer not null,
  receipt_processed_count integer not null default 0,
  audit_processed_count integer not null default 0,
  signal_processed_count integer not null default 0,
  click_processed_count integer not null default 0,
  context_processed_count integer not null default 0,
  communication_processed_count integer not null default 0,
  backfill_processed_count integer not null default 0,
  minimization_rule_count integer not null default 0,
  checkpoint jsonb not null default '{}'::jsonb,
  result_hash text,
  error_hash text,
  correlation_id text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  constraint event_ticket_retention_run_status_v4120_check check (run_status in ('running','completed','failed')),
  constraint event_ticket_retention_run_limit_v4120_check check (batch_limit between 1 and 5000),
  constraint event_ticket_retention_run_counts_v4120_check check (
    receipt_processed_count>=0 and audit_processed_count>=0 and signal_processed_count>=0 and click_processed_count>=0
    and context_processed_count>=0 and communication_processed_count>=0 and backfill_processed_count>=0 and minimization_rule_count>=0
  ),
  constraint event_ticket_retention_run_hashes_v4120_check check (
    (result_hash is null or result_hash ~ '^[0-9a-f]{64}$') and (error_hash is null or error_hash ~ '^[0-9a-f]{64}$')
    and public.mhidas_ticket_json_matches_contract_v4('retention_checkpoint', checkpoint)
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
  minimized_at timestamptz,
  created_at timestamptz not null default now(),
  constraint event_ticket_audit_credential_pair_v4120_fk
    foreign key (integration_id, credential_version_id)
    references public.event_ticket_trusted_integration_credential_versions (
      integration_id,
      credential_version_id
    )
    on delete restrict,
  constraint event_ticket_audit_identity_v4120_unique
    unique (target_type, target_id, idempotency_key),
  constraint event_ticket_audit_target_v4120_check
    check (target_type in (
      'partner','representative','request','channel','communication','signal',
      'retention_run','backfill','integration','integration_scope',
      'retention_policy','credential_context','operation_receipt',
      'retention_minimization_rule','credential_version'
    )),
  constraint event_ticket_audit_actor_v4120_check
    check (actor_role in (
      'useclubbers_admin','verified_partner_representative','clubber',
      'automation','system','trusted_ticketing_integration'
    )),
  constraint event_ticket_audit_hashes_v4120_check
    check (
      reason_hash ~ '^[0-9a-f]{64}$'
      and (anonymized_target_hash is null or anonymized_target_hash ~ '^[0-9a-f]{64}$')
      and (anonymized_correlation_hash is null or anonymized_correlation_hash ~ '^[0-9a-f]{64}$')
      and (anonymized_idempotency_hash is null or anonymized_idempotency_hash ~ '^[0-9a-f]{64}$')
      and (before_snapshot is null or public.mhidas_ticket_json_matches_contract_v4('audit_snapshot', before_snapshot))
      and (after_snapshot is null or public.mhidas_ticket_json_matches_contract_v4('audit_snapshot', after_snapshot))
    )
);



-- =============================================================================
-- 6. MATERIALIZED RETENTION TEMPLATES AND COMPLETE EVIDENCE-FAMILY MATRIX
-- =============================================================================

insert into public.event_ticket_retention_policy_bootstrap_receipts (
  bootstrap_receipt_id,bootstrap_key,bootstrap_status,policy_count,manifest_hash,migration_authority_hash,completed_at
) values (
  '00000000-0000-4120-8000-000000000000'::uuid,
  'v4.8.116.initial-retention-bootstrap',
  'completed',
  7,
  public.mhidas_ticket_sha256_v1('v4.8.116:seven-retention-policies:44-rules'),
  public.mhidas_ticket_sha256_v1('mhidas.migration-owner:v4.8.116'),
  now()
);

insert into public.event_ticket_retention_policy_versions (
  retention_policy_version_id,policy_key,policy_version,policy_status,policy_purpose,jurisdiction_code,
  evidence_class,retention_action,retention_days,legal_basis_reference_hash,policy_manifest_hash,
  approved_at,activated_at,bootstrap_receipt_id,executor_contract_hash
)
values
  ('00000000-0000-4120-8000-000000000001'::uuid,'operation_receipt_br_template',1,'active','operation_receipt','BR','operation_receipt','anonymize',730,repeat('0',64),public.mhidas_ticket_sha256_v1('operation_receipt_br_template_v1'),now(),now(),'00000000-0000-4120-8000-000000000000'::uuid,public.mhidas_ticket_sha256_v1('mhidas.retention-executor.v8:bootstrap-pending')),
  ('00000000-0000-4120-8000-000000000002'::uuid,'commercial_audit_br_template',1,'active','commercial_audit','BR','commercial_audit','anonymize',1825,repeat('0',64),public.mhidas_ticket_sha256_v1('commercial_audit_br_template_v1'),now(),now(),'00000000-0000-4120-8000-000000000000'::uuid,public.mhidas_ticket_sha256_v1('mhidas.retention-executor.v8:bootstrap-pending')),
  ('00000000-0000-4120-8000-000000000003'::uuid,'purchase_signal_br_template',1,'active','event_ticket_tracking','BR','purchase_signal','tombstone',730,repeat('0',64),public.mhidas_ticket_sha256_v1('purchase_signal_br_template_v1'),now(),now(),'00000000-0000-4120-8000-000000000000'::uuid,public.mhidas_ticket_sha256_v1('mhidas.retention-executor.v8:bootstrap-pending')),
  ('00000000-0000-4120-8000-000000000004'::uuid,'click_attribution_br_template',1,'active','event_ticket_tracking','BR','click_attribution','anonymize',365,repeat('0',64),public.mhidas_ticket_sha256_v1('click_attribution_br_template_v1'),now(),now(),'00000000-0000-4120-8000-000000000000'::uuid,public.mhidas_ticket_sha256_v1('mhidas.retention-executor.v8:bootstrap-pending')),
  ('00000000-0000-4120-8000-000000000005'::uuid,'credential_context_br_template',1,'active','security_audit','BR','credential_context','anonymize',90,repeat('0',64),public.mhidas_ticket_sha256_v1('credential_context_br_template_v1'),now(),now(),'00000000-0000-4120-8000-000000000000'::uuid,public.mhidas_ticket_sha256_v1('mhidas.retention-executor.v8:bootstrap-pending')),
  ('00000000-0000-4120-8000-000000000006'::uuid,'partner_communication_br_template',1,'active','commercial_governance','BR','partner_communication','tombstone',730,repeat('0',64),public.mhidas_ticket_sha256_v1('partner_communication_br_template_v1'),now(),now(),'00000000-0000-4120-8000-000000000000'::uuid,public.mhidas_ticket_sha256_v1('mhidas.retention-executor.v8:bootstrap-pending')),
  ('00000000-0000-4120-8000-000000000007'::uuid,'backfill_rejection_br_template',1,'active','commercial_governance','BR','backfill_rejection','anonymize',365,repeat('0',64),public.mhidas_ticket_sha256_v1('backfill_rejection_br_template_v1'),now(),now(),'00000000-0000-4120-8000-000000000000'::uuid,public.mhidas_ticket_sha256_v1('mhidas.retention-executor.v8:bootstrap-pending'));

insert into public.event_ticket_retention_minimization_rules (
  retention_policy_version_id,evidence_class,source_table,source_field,minimization_action,stable_hash_namespace
)
values
  ('00000000-0000-4120-8000-000000000001'::uuid,'operation_receipt','event_ticket_operation_receipts','principal_id','nullify',null),
  ('00000000-0000-4120-8000-000000000001'::uuid,'operation_receipt','event_ticket_operation_receipts','integration_id','nullify',null),
  ('00000000-0000-4120-8000-000000000001'::uuid,'operation_receipt','event_ticket_operation_receipts','credential_version_id','nullify',null),
  ('00000000-0000-4120-8000-000000000001'::uuid,'operation_receipt','event_ticket_operation_receipts','principal_namespace','stable_hash','receipt.principal_namespace'),
  ('00000000-0000-4120-8000-000000000001'::uuid,'operation_receipt','event_ticket_operation_receipts','idempotency_key','stable_hash','receipt.idempotency'),
  ('00000000-0000-4120-8000-000000000001'::uuid,'operation_receipt','event_ticket_operation_receipts','target_id','stable_hash','receipt.target'),
  ('00000000-0000-4120-8000-000000000001'::uuid,'operation_receipt','event_ticket_operation_receipts','result_id','stable_hash','receipt.result'),
  ('00000000-0000-4120-8000-000000000001'::uuid,'operation_receipt','event_ticket_operation_receipts','correlation_id','stable_hash','receipt.correlation'),
  ('00000000-0000-4120-8000-000000000002'::uuid,'commercial_audit','event_ticket_commercial_audit_log','target_id','stable_hash','audit.target'),
  ('00000000-0000-4120-8000-000000000002'::uuid,'commercial_audit','event_ticket_commercial_audit_log','canonical_event_id','nullify',null),
  ('00000000-0000-4120-8000-000000000002'::uuid,'commercial_audit','event_ticket_commercial_audit_log','partner_id','nullify',null),
  ('00000000-0000-4120-8000-000000000002'::uuid,'commercial_audit','event_ticket_commercial_audit_log','integration_id','nullify',null),
  ('00000000-0000-4120-8000-000000000002'::uuid,'commercial_audit','event_ticket_commercial_audit_log','credential_version_id','nullify',null),
  ('00000000-0000-4120-8000-000000000002'::uuid,'commercial_audit','event_ticket_commercial_audit_log','actor_user_id','nullify',null),
  ('00000000-0000-4120-8000-000000000002'::uuid,'commercial_audit','event_ticket_commercial_audit_log','correlation_id','stable_hash','audit.correlation'),
  ('00000000-0000-4120-8000-000000000002'::uuid,'commercial_audit','event_ticket_commercial_audit_log','idempotency_key','stable_hash','audit.idempotency'),
  ('00000000-0000-4120-8000-000000000002'::uuid,'commercial_audit','event_ticket_commercial_audit_log','before_snapshot','nullify',null),
  ('00000000-0000-4120-8000-000000000002'::uuid,'commercial_audit','event_ticket_commercial_audit_log','after_snapshot','nullify',null),
  ('00000000-0000-4120-8000-000000000003'::uuid,'purchase_signal','event_ticket_purchase_signals','user_id','nullify',null),
  ('00000000-0000-4120-8000-000000000003'::uuid,'purchase_signal','event_ticket_purchase_signals','channel_id','nullify',null),
  ('00000000-0000-4120-8000-000000000003'::uuid,'purchase_signal','event_ticket_purchase_signals','click_id','nullify',null),
  ('00000000-0000-4120-8000-000000000003'::uuid,'purchase_signal','event_ticket_purchase_signals','credential_context_id','nullify',null),
  ('00000000-0000-4120-8000-000000000003'::uuid,'purchase_signal','event_ticket_purchase_signals','external_transaction_hash','stable_hash','signal.transaction'),
  ('00000000-0000-4120-8000-000000000003'::uuid,'purchase_signal','event_ticket_purchase_signals','evidence_metadata','replace_with_tombstone',null),
  ('00000000-0000-4120-8000-000000000004'::uuid,'click_attribution','event_ticket_click_attributions','user_id','nullify',null),
  ('00000000-0000-4120-8000-000000000004'::uuid,'click_attribution','event_ticket_click_attributions','visitor_hash','stable_hash','click.visitor'),
  ('00000000-0000-4120-8000-000000000004'::uuid,'click_attribution','event_ticket_click_attributions','campaign_hash','nullify',null),
  ('00000000-0000-4120-8000-000000000004'::uuid,'click_attribution','event_ticket_click_attributions','redirect_id','stable_hash','click.redirect'),
  ('00000000-0000-4120-8000-000000000005'::uuid,'credential_context','event_ticket_verified_credential_contexts','context_token_hash','stable_hash','context.token'),
  ('00000000-0000-4120-8000-000000000005'::uuid,'credential_context','event_ticket_verified_credential_contexts','request_payload_hash','stable_hash','context.request'),
  ('00000000-0000-4120-8000-000000000005'::uuid,'credential_context','event_ticket_verified_credential_contexts','proof_nonce_hash','stable_hash','context.nonce'),
  ('00000000-0000-4120-8000-000000000005'::uuid,'credential_context','event_ticket_verified_credential_contexts','proof_signature_hash','stable_hash','context.signature'),
  ('00000000-0000-4120-8000-000000000005'::uuid,'credential_context','event_ticket_verified_credential_contexts','lifecycle_correlation_hash','stable_hash','context.correlation'),
  ('00000000-0000-4120-8000-000000000006'::uuid,'partner_communication','partner_official_communications','canonical_event_id','nullify',null),
  ('00000000-0000-4120-8000-000000000006'::uuid,'partner_communication','partner_official_communications','title','replace_with_tombstone',null),
  ('00000000-0000-4120-8000-000000000006'::uuid,'partner_communication','partner_official_communications','body_hash','stable_hash','communication.body'),
  ('00000000-0000-4120-8000-000000000006'::uuid,'partner_communication','partner_official_communications','approved_by_admin_user_id','nullify',null),
  ('00000000-0000-4120-8000-000000000006'::uuid,'partner_communication','partner_official_communications','published_by_admin_user_id','nullify',null),
  ('00000000-0000-4120-8000-000000000006'::uuid,'partner_communication','partner_official_communications','metadata','replace_with_tombstone',null),
  ('00000000-0000-4120-8000-000000000007'::uuid,'backfill_rejection','event_ticket_backfill_rejections','source_primary_key','stable_hash','backfill.source_key'),
  ('00000000-0000-4120-8000-000000000007'::uuid,'backfill_rejection','event_ticket_backfill_rejections','rejection_reason','replace_with_tombstone',null),
  ('00000000-0000-4120-8000-000000000007'::uuid,'backfill_rejection','event_ticket_backfill_rejections','canonical_event_id','nullify',null),
  ('00000000-0000-4120-8000-000000000007'::uuid,'backfill_rejection','event_ticket_backfill_rejections','source_payload_hash','stable_hash','backfill.payload'),
  ('00000000-0000-4120-8000-000000000007'::uuid,'backfill_rejection','event_ticket_backfill_rejections','reconciliation_run_key','stable_hash','backfill.run');

insert into public.event_ticket_operation_result_contracts (
  operation_name,result_status,minimum_result_version,maximum_result_version
)
values
  ('issue_verified_credential_context_v8','issued',1,1),
  ('record_purchase_signal_v13','recorded',1,1),
  ('run_governance_retention_batch_v9','completed',1,1),
  ('mutate_commercial_partner_status_v6','verified',1,null),
  ('mutate_commercial_partner_status_v6','suspended',1,null),
  ('mutate_commercial_partner_status_v6','deactivated',1,null),
  ('rotate_integration_credential_v2','credential_rotated',1,null),
  ('retire_retention_policy_v7','retired',1,null),
  ('authorize_activate_commercial_channel_v4','active',1,null);

insert into public.event_ticket_retention_executor_contracts (
  evidence_class,executor_version,canonical_rule_manifest_hash,executor_code_hash,contract_hash
) values
  ('operation_receipt',10,public.mhidas_ticket_sha256_v1('v4120:operation_receipt:8:fixed'),public.mhidas_ticket_sha256_v1('mhidas.retention.executor.v10:operation_receipt'),public.mhidas_ticket_sha256_v1('v4120:operation_receipt:executor-contract')),
  ('commercial_audit',10,public.mhidas_ticket_sha256_v1('v4120:commercial_audit:10:fixed'),public.mhidas_ticket_sha256_v1('mhidas.retention.executor.v10:commercial_audit'),public.mhidas_ticket_sha256_v1('v4120:commercial_audit:executor-contract')),
  ('purchase_signal',10,public.mhidas_ticket_sha256_v1('v4120:purchase_signal:6:fixed'),public.mhidas_ticket_sha256_v1('mhidas.retention.executor.v10:purchase_signal'),public.mhidas_ticket_sha256_v1('v4120:purchase_signal:executor-contract')),
  ('click_attribution',10,public.mhidas_ticket_sha256_v1('v4120:click_attribution:4:fixed'),public.mhidas_ticket_sha256_v1('mhidas.retention.executor.v10:click_attribution'),public.mhidas_ticket_sha256_v1('v4120:click_attribution:executor-contract')),
  ('credential_context',10,public.mhidas_ticket_sha256_v1('v4120:credential_context:5:fixed'),public.mhidas_ticket_sha256_v1('mhidas.retention.executor.v10:credential_context'),public.mhidas_ticket_sha256_v1('v4120:credential_context:executor-contract')),
  ('partner_communication',10,public.mhidas_ticket_sha256_v1('v4120:partner_communication:6:fixed'),public.mhidas_ticket_sha256_v1('mhidas.retention.executor.v10:partner_communication'),public.mhidas_ticket_sha256_v1('v4120:partner_communication:executor-contract')),
  ('backfill_rejection',10,public.mhidas_ticket_sha256_v1('v4120:backfill_rejection:5:fixed'),public.mhidas_ticket_sha256_v1('mhidas.retention.executor.v10:backfill_rejection'),public.mhidas_ticket_sha256_v1('v4120:backfill_rejection:executor-contract'));

update public.event_ticket_retention_policy_versions p
set executor_contract_hash=c.contract_hash,
    rule_manifest_hash=c.canonical_rule_manifest_hash,
    updated_at=now()
from public.event_ticket_retention_executor_contracts c
where c.evidence_class=p.evidence_class and c.contract_status='active';

create function public.mhidas_ticket_assert_retention_execution_contract_v2(
  p_policy_id uuid,
  p_evidence_class text,
  p_expected_rule_count integer
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_policy public.event_ticket_retention_policy_versions%rowtype;
  v_contract public.event_ticket_retention_executor_contracts%rowtype;
  v_rule_count integer;
begin
  select * into v_policy from public.event_ticket_retention_policy_versions
  where retention_policy_version_id=p_policy_id for share;
  if not found or v_policy.evidence_class<>p_evidence_class or v_policy.policy_status not in ('active','retired') then
    raise exception 'RETENTION_POLICY_EXECUTOR_DIMENSION_DENIED_V2';
  end if;
  select * into v_contract from public.event_ticket_retention_executor_contracts
  where evidence_class=p_evidence_class and contract_status='active' for share;
  if not found or v_policy.executor_contract_hash<>v_contract.contract_hash
    or v_policy.rule_manifest_hash<>v_contract.canonical_rule_manifest_hash then
    raise exception 'RETENTION_EXECUTOR_EXTERNAL_CONTRACT_MISMATCH_V2:%',p_evidence_class;
  end if;
  select count(*) into v_rule_count from public.event_ticket_retention_minimization_rules
  where retention_policy_version_id=p_policy_id and evidence_class=p_evidence_class and rule_status='active';
  if v_rule_count<>p_expected_rule_count then raise exception 'RETENTION_RULE_COUNT_MISMATCH_V2:%:%',p_evidence_class,v_rule_count; end if;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 7. RECEIPT-FIRST IDEMPOTENCY AUTHORITY
-- =============================================================================

create function public.mhidas_ticket_operation_receipt_matches_semantics_v1(
  p_receipt public.event_ticket_operation_receipts,
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
  p_receipt_retention_policy_version_id uuid
)
returns boolean language sql immutable set search_path = public, pg_temp
as $mhidas_sql$
  select p_receipt.operation_scope=p_operation_scope
    and p_receipt.principal_type=p_principal_type
    and p_receipt.principal_id is not distinct from p_principal_id
    and p_receipt.principal_namespace=p_principal_namespace
    and p_receipt.integration_id is not distinct from p_integration_id
    and p_receipt.credential_version_id is not distinct from p_credential_version_id
    and p_receipt.operation_name=p_operation_name
    and p_receipt.idempotency_key=p_idempotency_key
    and p_receipt.target_type=p_target_type
    and p_receipt.target_id=p_target_id
    and p_receipt.expected_lock_version is not distinct from p_expected_lock_version
    and p_receipt.request_hash=p_request_hash
    and p_receipt.receipt_retention_policy_version_id=p_receipt_retention_policy_version_id;
$mhidas_sql$;

create function public.mhidas_ticket_reserve_operation_receipt_v10(
  p_operation_scope text,p_principal_type text,p_principal_id uuid,p_principal_namespace text,
  p_integration_id uuid,p_credential_version_id uuid,p_operation_name text,p_idempotency_key text,
  p_target_type text,p_target_id uuid,p_expected_lock_version integer,p_request_hash text,p_correlation_id text,
  p_receipt_retention_policy_version_id uuid
)
returns public.event_ticket_operation_receipts
language plpgsql security definer set search_path = public, pg_temp
as $mhidas_plpgsql$
declare v_receipt public.event_ticket_operation_receipts%rowtype; v_policy public.event_ticket_retention_policy_versions%rowtype;
begin
  select * into v_policy from public.event_ticket_retention_policy_versions
  where retention_policy_version_id=p_receipt_retention_policy_version_id and policy_status='active'
    and policy_purpose='operation_receipt' and jurisdiction_code='BR' and evidence_class='operation_receipt' for share;
  if not found then raise exception 'ACTIVE_OPERATION_RECEIPT_POLICY_REQUIRED_V10'; end if;
  select * into v_receipt from public.event_ticket_operation_receipts r
  where r.principal_type=p_principal_type and r.principal_id is not distinct from p_principal_id
    and r.principal_namespace=p_principal_namespace and r.operation_name=p_operation_name and r.idempotency_key=p_idempotency_key
  for update;
  if found then
    if not public.mhidas_ticket_operation_receipt_matches_semantics_v1(v_receipt,p_operation_scope,p_principal_type,p_principal_id,p_principal_namespace,p_integration_id,p_credential_version_id,p_operation_name,p_idempotency_key,p_target_type,p_target_id,p_expected_lock_version,p_request_hash,p_receipt_retention_policy_version_id) then raise exception 'IDEMPOTENCY_KEY_SEMANTIC_REUSE_DENIED_V10'; end if;
    if v_receipt.receipt_status='completed' then return v_receipt;
    elsif v_receipt.receipt_status='failed' then raise exception 'IDEMPOTENCY_KEY_TERMINAL_FAILURE_V10:%',v_receipt.failure_hash;
    else raise exception 'IDEMPOTENCY_KEY_OPERATION_IN_PROGRESS_V10'; end if;
  end if;
  begin
    insert into public.event_ticket_operation_receipts (
      operation_scope,principal_type,principal_id,principal_namespace,integration_id,credential_version_id,operation_name,idempotency_key,
      target_type,target_id,expected_lock_version,request_hash,receipt_status,result_id,result_status,correlation_id,receipt_retention_policy_version_id
    ) values (
      p_operation_scope,p_principal_type,p_principal_id,p_principal_namespace,p_integration_id,p_credential_version_id,p_operation_name,p_idempotency_key,
      p_target_type,p_target_id,p_expected_lock_version,p_request_hash,'pending',p_target_id,'pending',p_correlation_id,p_receipt_retention_policy_version_id
    ) returning * into v_receipt;
  exception when unique_violation then
    select * into v_receipt from public.event_ticket_operation_receipts r
    where r.principal_type=p_principal_type and r.principal_id is not distinct from p_principal_id
      and r.principal_namespace=p_principal_namespace and r.operation_name=p_operation_name and r.idempotency_key=p_idempotency_key
    for update;
    if not found then raise; end if;
    if not public.mhidas_ticket_operation_receipt_matches_semantics_v1(v_receipt,p_operation_scope,p_principal_type,p_principal_id,p_principal_namespace,p_integration_id,p_credential_version_id,p_operation_name,p_idempotency_key,p_target_type,p_target_id,p_expected_lock_version,p_request_hash,p_receipt_retention_policy_version_id) then raise exception 'IDEMPOTENCY_KEY_CONCURRENT_SEMANTIC_REUSE_DENIED_V10'; end if;
    if v_receipt.receipt_status='completed' then return v_receipt;
    elsif v_receipt.receipt_status='failed' then raise exception 'IDEMPOTENCY_KEY_TERMINAL_FAILURE_V10:%',v_receipt.failure_hash;
    else raise exception 'IDEMPOTENCY_KEY_CONCURRENT_OPERATION_IN_PROGRESS_V10'; end if;
  end;
  return v_receipt;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_complete_operation_receipt_v6(
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
  select * into v_receipt
  from public.event_ticket_operation_receipts
  where receipt_id = p_receipt_id
  for update;

  if not found or v_receipt.receipt_status <> 'pending' then
    raise exception 'RECEIPT_COMPLETION_TRANSITION_DENIED_V6';
  end if;
  if p_result_version is null or p_result_version < 1 or p_result_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'RECEIPT_COMPLETION_RESULT_CONTRACT_INVALID_V6';
  end if;
  if not exists (
    select 1
    from public.event_ticket_operation_result_contracts c
    where c.operation_name = v_receipt.operation_name
      and c.result_status = p_result_status
      and c.contract_status = 'active'
      and p_result_version >= c.minimum_result_version
      and (c.maximum_result_version is null or p_result_version <= c.maximum_result_version)
  ) then
    raise exception 'RECEIPT_COMPLETION_RESULT_STATUS_DENIED_V6:%:%', v_receipt.operation_name, p_result_status;
  end if;

  update public.event_ticket_operation_receipts
  set receipt_status = 'completed',
      result_status = p_result_status,
      result_version = p_result_version,
      result_hash = p_result_hash,
      completed_at = now()
  where receipt_id = p_receipt_id
    and receipt_status = 'pending'
  returning * into v_receipt;

  if not found then
    raise exception 'RECEIPT_COMPLETION_CONCURRENT_TRANSITION_DENIED_V6';
  end if;
  return v_receipt;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_fail_operation_receipt_v6(
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
      failure_hash = p_failure_hash
  where receipt_id = p_receipt_id
    and receipt_status = 'pending'
  returning * into v_receipt;

  if not found then
    raise exception 'RECEIPT_FAILURE_TRANSITION_DENIED_V4';
  end if;

  return v_receipt;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_signal_family_lock_key_v1(
  p_integration_id uuid,
  p_transaction_family_id uuid
)
returns bigint
language sql
immutable
strict
set search_path = public, pg_temp
as $mhidas_sql$
  select hashtextextended(p_integration_id::text||':'||p_transaction_family_id::text,0);
$mhidas_sql$;

create function public.mhidas_ticket_try_uuid_v1(p_value text)
returns uuid
language plpgsql
immutable
set search_path = public, pg_temp
as $mhidas_plpgsql$
begin
  if p_value is null then return null; end if;
  return p_value::uuid;
exception when invalid_text_representation then return null;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 8. CRYPTOGRAPHICALLY BOUND CREDENTIAL CONTEXT LIFECYCLE
-- =============================================================================

create function public.mhidas_ticket_issue_verified_credential_context_v8(
  p_integration_id uuid,
  p_credential_version_id uuid,
  p_context_token text,
  p_issuer_service_key text,
  p_audience text,
  p_operation_name text,
  p_nonce text,
  p_request_payload_hash text,
  p_detached_credential_signature text,
  p_idempotency_key text,
  p_expires_at timestamptz,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_authority record;
  v_context_id uuid;
  v_token_hash text;
  v_nonce_hash text;
  v_canonical_payload text;
  v_canonical_payload_hash text;
  v_signature_hash text;
  v_request_hash text;
  v_receipt_policy uuid;
  v_context_policy uuid;
  v_receipt public.event_ticket_operation_receipts%rowtype;
  v_context public.event_ticket_verified_credential_contexts%rowtype;
  v_failure_hash text;
begin
  select * into v_authority from public.mhidas_ticket_lock_current_credential_v4(p_integration_id,p_credential_version_id);
  if p_issuer_service_key is null or p_context_token is null or p_nonce is null or p_detached_credential_signature is null
    or public.mhidas_ticket_sha256_v1(p_issuer_service_key) is distinct from v_authority.issuer_service_key_hash then
    raise exception 'ISSUER_SERVICE_KEY_PROOF_DENIED_V8';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '10 minutes' then raise exception 'CREDENTIAL_CONTEXT_EXPIRY_OUT_OF_RANGE_V8'; end if;
  if p_audience !~ '^[a-z0-9][a-z0-9._:-]{2,79}$' or p_operation_name !~ '^[a-z0-9][a-z0-9._:-]{2,119}$' then raise exception 'CREDENTIAL_CONTEXT_SCOPE_INVALID_V8'; end if;
  if p_request_payload_hash !~ '^[0-9a-f]{64}$' or length(p_detached_credential_signature) not between 32 and 4096 then raise exception 'CREDENTIAL_CONTEXT_PROOF_INVALID_V8'; end if;

  v_token_hash:=public.mhidas_ticket_sha256_v1(p_context_token);
  v_nonce_hash:=public.mhidas_ticket_sha256_v1(p_nonce);
  v_signature_hash:=public.mhidas_ticket_sha256_v1(p_detached_credential_signature);
  v_canonical_payload:=public.mhidas_ticket_canonical_payload_v1(
    'mhidas.credential-context.v8',
    jsonb_build_object(
      'integration_id',p_integration_id,'credential_version_id',p_credential_version_id,
      'credential_key_id',v_authority.credential_key_id,'signature_algorithm',v_authority.signature_algorithm,
      'verifier_key_hash',v_authority.verifier_key_hash,'credential_fingerprint_hash',v_authority.credential_fingerprint_hash,
      'issuer_service_key_hash',v_authority.issuer_service_key_hash,'audience',p_audience,'operation_name',p_operation_name,
      'context_token_hash',v_token_hash,'nonce_hash',v_nonce_hash,'request_payload_hash',p_request_payload_hash,
      'proof_signature_hash',v_signature_hash,'expires_at_epoch_ms',floor(extract(epoch from p_expires_at)*1000)::bigint
    )
  );
  v_canonical_payload_hash:=public.mhidas_ticket_sha256_v1(v_canonical_payload);
  if public.mhidas_verify_detached_signature_with_key_hash_v1(
    v_authority.credential_key_id,v_authority.signature_algorithm,v_authority.verifier_key_hash,
    v_authority.credential_fingerprint_hash,v_canonical_payload,p_detached_credential_signature
  ) is distinct from true then raise exception 'CREDENTIAL_KEY_POSSESSION_PROOF_DENIED_V8'; end if;

  v_context_id:=public.mhidas_ticket_deterministic_uuid_v1(
    public.mhidas_ticket_canonical_payload_v1(
      'mhidas.credential-context-id.v2',
      jsonb_build_object(
        'integration_id',p_integration_id,'credential_version_id',p_credential_version_id,'audience',p_audience,
        'operation_name',p_operation_name,'context_token_hash',v_token_hash,'nonce_hash',v_nonce_hash,
        'request_payload_hash',p_request_payload_hash,'canonical_payload_hash',v_canonical_payload_hash,
        'proof_signature_hash',v_signature_hash,'expires_at_epoch_ms',floor(extract(epoch from p_expires_at)*1000)::bigint
      )
    )
  );
  v_request_hash:=public.mhidas_ticket_sha256_v1(
    public.mhidas_ticket_canonical_payload_v1(
      'mhidas.credential-context-receipt.v2',
      jsonb_build_object('context_id',v_context_id,'context_token_hash',v_token_hash,'canonical_payload_hash',v_canonical_payload_hash,
        'proof_signature_hash',v_signature_hash,'request_payload_hash',p_request_payload_hash,'expires_at_epoch_ms',floor(extract(epoch from p_expires_at)*1000)::bigint)
    )
  );
  v_receipt_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('operation_receipt','BR','operation_receipt');
  v_context_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('security_audit','BR','credential_context');
  v_receipt:=public.mhidas_ticket_reserve_operation_receipt_v10(
    'credential_context_mutation','trusted_ticketing_integration',null,v_authority.principal_namespace,
    p_integration_id,p_credential_version_id,'issue_verified_credential_context_v8',p_idempotency_key,
    'credential_context',v_context_id,null,v_request_hash,p_correlation_id,v_receipt_policy
  );
  if v_receipt.receipt_status='completed' then
    select * into v_context from public.event_ticket_verified_credential_contexts where context_id=v_receipt.result_id;
    if not found or v_context.integration_id<>p_integration_id or v_context.credential_version_id<>p_credential_version_id
      or v_context.context_token_hash<>v_token_hash or v_context.audience<>p_audience or v_context.operation_name<>p_operation_name
      or v_context.request_payload_hash<>p_request_payload_hash or v_context.proof_nonce_hash<>v_nonce_hash
      or v_context.proof_signature_hash<>v_signature_hash or v_context.canonical_payload_hash<>v_canonical_payload_hash
      or v_context.expires_at<>p_expires_at or v_context.verifier_key_hash_snapshot<>v_authority.verifier_key_hash
      or v_context.credential_fingerprint_hash_snapshot<>v_authority.credential_fingerprint_hash
      or v_context.credential_key_id_snapshot<>v_authority.credential_key_id
      or v_context.signature_algorithm_snapshot<>v_authority.signature_algorithm
      or v_context.issuer_service_key_hash_snapshot<>v_authority.issuer_service_key_hash then
      raise exception 'CREDENTIAL_CONTEXT_REPLAY_SEMANTIC_MISMATCH_V8';
    end if;
    return jsonb_build_object('status','replayed','context_id',v_context.context_id,'context_status',v_context.context_status,'receipt_id',v_receipt.receipt_id);
  end if;
  begin
    insert into public.event_ticket_verified_credential_contexts (
      context_id,integration_id,credential_version_id,context_token_hash,audience,operation_name,request_payload_hash,
      proof_nonce_hash,proof_signature_hash,canonical_payload_hash,credential_key_id_snapshot,signature_algorithm_snapshot,
      verifier_key_hash_snapshot,credential_fingerprint_hash_snapshot,issuer_service_key_hash_snapshot,issuance_idempotency_key,issuance_receipt_id,
      last_lifecycle_receipt_id,retention_policy_version_id,expires_at,lifecycle_correlation_hash
    ) values (
      v_context_id,p_integration_id,p_credential_version_id,v_token_hash,p_audience,p_operation_name,p_request_payload_hash,
      v_nonce_hash,v_signature_hash,v_canonical_payload_hash,v_authority.credential_key_id,v_authority.signature_algorithm,
      v_authority.verifier_key_hash,v_authority.credential_fingerprint_hash,v_authority.issuer_service_key_hash,p_idempotency_key,v_receipt.receipt_id,
      v_receipt.receipt_id,v_context_policy,p_expires_at,public.mhidas_ticket_sha256_v1(p_correlation_id)
    ) returning * into v_context;
    perform public.mhidas_ticket_complete_operation_receipt_v6(v_receipt.receipt_id,'issued',1,public.mhidas_ticket_sha256_v1(v_context.context_id::text||':issued:'||v_request_hash));
    return jsonb_build_object('status','issued','context_id',v_context.context_id,'context_status',v_context.context_status,'receipt_id',v_receipt.receipt_id);
  exception when others then
    v_failure_hash:=public.mhidas_ticket_sha256_v1(sqlstate||':'||sqlerrm);
    perform public.mhidas_ticket_fail_operation_receipt_v6(v_receipt.receipt_id,v_failure_hash);
    return jsonb_build_object('status','failed','receipt_id',v_receipt.receipt_id,'failure_hash',v_failure_hash);
  end;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_consume_verified_credential_context_v8(
  p_context_id uuid,
  p_context_token text,
  p_audience text,
  p_operation_name text,
  p_expected_request_payload_hash text,
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
  v_authority record;
begin
  if p_expected_request_payload_hash !~ '^[0-9a-f]{64}$' then raise exception 'CREDENTIAL_CONTEXT_REQUEST_HASH_INVALID_V8'; end if;
  select * into v_authority from public.mhidas_ticket_lock_current_credential_v4(p_integration_id,p_credential_version_id);
  select * into v_receipt from public.event_ticket_operation_receipts where receipt_id=p_receipt_id for update;
  if not found or v_receipt.receipt_status<>'pending' or v_receipt.operation_scope<>'signal_insert'
    or v_receipt.operation_name<>p_operation_name or v_receipt.target_type<>'purchase_signal' or v_receipt.target_id<>p_signal_id
    or v_receipt.integration_id<>p_integration_id or v_receipt.credential_version_id<>p_credential_version_id
    or v_receipt.principal_type<>'trusted_ticketing_integration' or v_receipt.request_hash<>p_expected_request_payload_hash then
    raise exception 'CREDENTIAL_CONTEXT_RECEIPT_SEMANTIC_BINDING_DENIED_V8';
  end if;
  select * into v_context from public.event_ticket_verified_credential_contexts where context_id=p_context_id for update;
  if not found or v_context.context_status<>'active' or v_context.integration_id<>p_integration_id
    or v_context.credential_version_id<>p_credential_version_id or v_context.expires_at<=now()
    or v_context.audience<>p_audience or v_context.operation_name<>p_operation_name
    or v_context.request_payload_hash is distinct from p_expected_request_payload_hash
    or v_context.context_token_hash is distinct from public.mhidas_ticket_sha256_v1(p_context_token)
    or v_context.verifier_key_hash_snapshot<>v_authority.verifier_key_hash
    or v_context.credential_fingerprint_hash_snapshot<>v_authority.credential_fingerprint_hash
    or v_context.credential_key_id_snapshot<>v_authority.credential_key_id
    or v_context.signature_algorithm_snapshot<>v_authority.signature_algorithm
    or v_context.issuer_service_key_hash_snapshot<>v_authority.issuer_service_key_hash then
    raise exception 'VERIFIED_CREDENTIAL_CONTEXT_PROOF_NOT_CONSUMABLE_V8';
  end if;
  update public.event_ticket_verified_credential_contexts
  set context_status='consumed',consumed_at=now(),consumed_receipt_id=p_receipt_id,last_lifecycle_receipt_id=p_receipt_id
  where context_id=p_context_id and context_status='active' returning * into v_context;
  if not found then raise exception 'VERIFIED_CREDENTIAL_CONTEXT_CONCURRENT_CONSUMPTION_DENIED_V8'; end if;
  return v_context;
end;
$mhidas_plpgsql$;

create function public.mhidas_ticket_purchase_signal_request_hash_v1(
  p_canonical_event_id uuid,
  p_channel_id uuid,
  p_click_id uuid,
  p_integration_id uuid,
  p_credential_version_id uuid,
  p_signal_type text,
  p_evidence_source text,
  p_external_transaction_hash text,
  p_evidence_hash text,
  p_evidence_metadata jsonb,
  p_supersedes_signal_id uuid,
  p_retention_policy_version_id uuid
)
returns text
language sql
immutable
set search_path = public, pg_temp
as $mhidas_sql$
  select public.mhidas_ticket_sha256_v1(
    public.mhidas_ticket_canonical_payload_v1(
      'mhidas.purchase-signal.v12',
      jsonb_build_object(
        'canonical_event_id',p_canonical_event_id,
        'channel_id',p_channel_id,
        'click_id',p_click_id,
        'integration_id',p_integration_id,
        'credential_version_id',p_credential_version_id,
        'signal_type',p_signal_type,
        'evidence_source',p_evidence_source,
        'external_transaction_hash',p_external_transaction_hash,
        'transaction_family_id',case when p_external_transaction_hash is null then null else public.mhidas_ticket_deterministic_uuid_v1('signal.family:'||p_integration_id::text||':'||p_external_transaction_hash) end,
        'evidence_hash',p_evidence_hash,
        'evidence_metadata',p_evidence_metadata,
        'supersedes_signal_id',p_supersedes_signal_id,
        'required_scope',public.mhidas_ticket_required_scope_for_signal_v1(p_signal_type),
        'retention_policy_version_id',p_retention_policy_version_id,
        'verified_credential_context_required',true
      )
    )
  );
$mhidas_sql$;

-- =============================================================================
-- 9. SINGLE-RECEIPT PURCHASE-SIGNAL LIFECYCLE AND ATOMIC SUPERSESSION
-- =============================================================================

create function public.mhidas_record_event_ticket_purchase_signal_v13(
  p_canonical_event_id uuid,
  p_channel_id uuid,
  p_click_id uuid,
  p_integration_id uuid,
  p_credential_version_id uuid,
  p_credential_context_id uuid,
  p_context_token text,
  p_signal_type text,
  p_evidence_source text,
  p_external_transaction_hash text,
  p_evidence_hash text,
  p_evidence_metadata jsonb,
  p_supersedes_signal_id uuid,
  p_idempotency_key text,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_authority record;
  v_signal_id uuid;
  v_request_hash text;
  v_receipt_policy uuid;
  v_signal_policy uuid;
  v_receipt public.event_ticket_operation_receipts%rowtype;
  v_signal public.event_ticket_purchase_signals%rowtype;
  v_previous public.event_ticket_purchase_signals%rowtype;
  v_failure_hash text;
  v_transaction_family_hash text;
  v_transaction_family_id uuid;
  v_required_scope text;
begin
  select * into v_authority from public.mhidas_ticket_lock_current_credential_v4(p_integration_id,p_credential_version_id);
  v_required_scope:=public.mhidas_ticket_required_scope_for_signal_v1(p_signal_type);
  perform 1 from public.event_ticket_trusted_integration_channels s
  where s.integration_id=p_integration_id and s.canonical_event_id=p_canonical_event_id
    and s.channel_scope=v_required_scope and s.scope_status='active'
    and (s.valid_from is null or s.valid_from<=now()) and (s.valid_until is null or s.valid_until>now()) for update;
  if not found then raise exception 'TRUSTED_SIGNAL_INTEGRATION_SCOPE_REQUIRED_V10'; end if;
  if p_channel_id is not null and not exists (
    select 1 from public.event_ticket_commercial_channels c
    where c.channel_id=p_channel_id and c.canonical_event_id=p_canonical_event_id and c.integration_id=p_integration_id
      and c.partner_id=v_authority.partner_id and c.channel_status in ('active','paused')
  ) then raise exception 'SIGNAL_CHANNEL_SEMANTIC_BINDING_DENIED_V10'; end if;
  if p_click_id is not null and (p_channel_id is null or not exists (
    select 1 from public.event_ticket_click_attributions ca
    where ca.click_id=p_click_id and ca.channel_id=p_channel_id and ca.canonical_event_id=p_canonical_event_id and ca.integration_id=p_integration_id
  )) then raise exception 'SIGNAL_CLICK_SEMANTIC_BINDING_DENIED_V10'; end if;
  if p_signal_type in ('attributed_conversion','confirmed_conversion','correction') and p_external_transaction_hash is null then raise exception 'CONVERSION_EXTERNAL_TRANSACTION_REQUIRED_V10'; end if;
  if not public.mhidas_ticket_json_matches_contract_v4('signal_evidence',p_evidence_metadata) then raise exception 'SIGNAL_EVIDENCE_CONTRACT_DENIED_V10'; end if;
  v_transaction_family_hash:=case when p_external_transaction_hash is null then null else public.mhidas_ticket_sha256_v1('signal.family:'||p_integration_id::text||':'||p_external_transaction_hash) end;
  v_transaction_family_id:=case when p_external_transaction_hash is null then null else public.mhidas_ticket_deterministic_uuid_v1('signal.family:'||p_integration_id::text||':'||p_external_transaction_hash) end;

  if v_transaction_family_id is not null then
    perform pg_advisory_xact_lock(public.mhidas_ticket_signal_family_lock_key_v1(p_integration_id,v_transaction_family_id));
  end if;

  if p_signal_type='confirmed_conversion' then
    if p_supersedes_signal_id is null then raise exception 'CONFIRMED_CONVERSION_REQUIRES_ATTRIBUTED_SIGNAL_V10'; end if;
    select * into v_previous from public.event_ticket_purchase_signals
    where signal_id=p_supersedes_signal_id and canonical_event_id=p_canonical_event_id and integration_id=p_integration_id
      and transaction_family_id=v_transaction_family_id and signal_type='attributed_conversion' and signal_status='recorded' for update;
    if not found then raise exception 'CONFIRMED_CONVERSION_PREDECESSOR_INVALID_V10'; end if;
  elsif p_signal_type='correction' then
    if p_supersedes_signal_id is null then raise exception 'CORRECTION_REQUIRES_PREDECESSOR_V10'; end if;
    select * into v_previous from public.event_ticket_purchase_signals
    where signal_id=p_supersedes_signal_id and canonical_event_id=p_canonical_event_id and integration_id=p_integration_id
      and transaction_family_id=v_transaction_family_id and signal_status='recorded' for update;
    if not found then raise exception 'CORRECTION_PREDECESSOR_INVALID_V10'; end if;
  elsif p_supersedes_signal_id is not null then
    raise exception 'UNEXPECTED_SIGNAL_SUPERSESSION_V10';
  end if;

  v_receipt_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('operation_receipt','BR','operation_receipt');
  v_signal_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('event_ticket_tracking','BR','purchase_signal');
  v_signal_id:=public.mhidas_ticket_deterministic_uuid_v1(p_integration_id::text||':'||p_idempotency_key||':'||p_signal_type);
  v_request_hash:=public.mhidas_ticket_purchase_signal_request_hash_v1(
    p_canonical_event_id,p_channel_id,p_click_id,p_integration_id,p_credential_version_id,
    p_signal_type,p_evidence_source,p_external_transaction_hash,p_evidence_hash,p_evidence_metadata,
    p_supersedes_signal_id,v_signal_policy
  );
  v_receipt:=public.mhidas_ticket_reserve_operation_receipt_v10('signal_insert','trusted_ticketing_integration',null,v_authority.principal_namespace,p_integration_id,p_credential_version_id,'record_purchase_signal_v13',p_idempotency_key,'purchase_signal',v_signal_id,null,v_request_hash,p_correlation_id,v_receipt_policy);
  if v_receipt.receipt_status='completed' then
    select * into v_signal from public.event_ticket_purchase_signals where signal_id=v_receipt.result_id;
    return jsonb_build_object('status','replayed','signal_id',v_signal.signal_id,'signal_status',v_signal.signal_status,'receipt_id',v_receipt.receipt_id);
  end if;
  begin
    perform public.mhidas_ticket_consume_verified_credential_context_v8(p_credential_context_id,p_context_token,v_required_scope,'record_purchase_signal_v13',v_request_hash,v_receipt.receipt_id,v_signal_id,p_integration_id,p_credential_version_id);
    if p_supersedes_signal_id is not null then
      update public.event_ticket_purchase_signals
      set signal_status='superseded'
      where signal_id=p_supersedes_signal_id and signal_status='recorded';
      if not found then raise exception 'SIGNAL_SUPERSESSION_CONCURRENT_UPDATE_DENIED_V10'; end if;
    end if;
    insert into public.event_ticket_purchase_signals (
      signal_id,canonical_event_id,channel_id,click_id,integration_id,credential_version_id,credential_context_id,receipt_id,
      signal_type,evidence_source,external_transaction_hash,anonymized_transaction_hash,transaction_family_id,evidence_hash,evidence_metadata,retention_policy_version_id,supersedes_signal_id
    ) values (
      v_signal_id,p_canonical_event_id,p_channel_id,p_click_id,p_integration_id,p_credential_version_id,p_credential_context_id,v_receipt.receipt_id,
      p_signal_type,p_evidence_source,p_external_transaction_hash,v_transaction_family_hash,v_transaction_family_id,p_evidence_hash,p_evidence_metadata,v_signal_policy,p_supersedes_signal_id
    ) returning * into v_signal;
    perform public.mhidas_ticket_complete_operation_receipt_v6(v_receipt.receipt_id,'recorded',1,public.mhidas_ticket_sha256_v1(v_signal.signal_id::text||':recorded'));
    return jsonb_build_object('status','recorded','signal_id',v_signal.signal_id,'signal_status',v_signal.signal_status,'receipt_id',v_receipt.receipt_id,'supersedes_signal_id',p_supersedes_signal_id);
  exception when others then
    v_failure_hash:=public.mhidas_ticket_sha256_v1(sqlstate||':'||sqlerrm);
    perform public.mhidas_ticket_fail_operation_receipt_v6(v_receipt.receipt_id,v_failure_hash);
    return jsonb_build_object('status','failed','receipt_id',v_receipt.receipt_id,'failure_hash',v_failure_hash);
  end;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 10. FAIL-CLOSED RETENTION EXECUTOR FOR EVERY SENSITIVE EVIDENCE FAMILY
-- =============================================================================

create function public.mhidas_run_event_ticket_governance_retention_batch_v9(
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
  v_receipt_policy uuid; v_audit_policy uuid; v_signal_policy uuid; v_click_policy uuid;
  v_context_policy uuid; v_communication_policy uuid; v_backfill_policy uuid;
  v_run_id uuid; v_receipt public.event_ticket_operation_receipts%rowtype;
  v_receipt_count integer:=0; v_audit_count integer:=0; v_signal_count integer:=0; v_click_count integer:=0;
  v_context_count integer:=0; v_context_expired_count integer:=0; v_communication_count integer:=0; v_backfill_count integer:=0; v_rule_count integer:=0;
  v_signal_family_count integer:=0; v_signal_standalone_count integer:=0; v_phase_count integer:=0;
  v_remaining integer; v_attempted integer:=0; v_locked integer:=0; v_changed integer:=0; v_blocked integer:=0;
  v_family record; v_family_total integer; v_family_due boolean;
  v_failure_hash text; v_request_hash text;
begin
  if p_batch_limit not between 1 and 5000 then raise exception 'RETENTION_BATCH_LIMIT_INVALID_V9'; end if;
  v_remaining:=p_batch_limit;
  v_receipt_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('operation_receipt','BR','operation_receipt');
  v_audit_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('commercial_audit','BR','commercial_audit');
  v_signal_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('event_ticket_tracking','BR','purchase_signal');
  v_click_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('event_ticket_tracking','BR','click_attribution');
  v_context_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('security_audit','BR','credential_context');
  v_communication_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('commercial_governance','BR','partner_communication');
  v_backfill_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('commercial_governance','BR','backfill_rejection');
  perform public.mhidas_ticket_assert_retention_execution_contract_v2(v_receipt_policy,'operation_receipt',8);
  perform public.mhidas_ticket_assert_retention_execution_contract_v2(v_audit_policy,'commercial_audit',10);
  perform public.mhidas_ticket_assert_retention_execution_contract_v2(v_signal_policy,'purchase_signal',6);
  perform public.mhidas_ticket_assert_retention_execution_contract_v2(v_click_policy,'click_attribution',4);
  perform public.mhidas_ticket_assert_retention_execution_contract_v2(v_context_policy,'credential_context',5);
  perform public.mhidas_ticket_assert_retention_execution_contract_v2(v_communication_policy,'partner_communication',6);
  perform public.mhidas_ticket_assert_retention_execution_contract_v2(v_backfill_policy,'backfill_rejection',5);
  select count(*) into v_rule_count from public.event_ticket_retention_minimization_rules where rule_status='active'
    and retention_policy_version_id in (v_receipt_policy,v_audit_policy,v_signal_policy,v_click_policy,v_context_policy,v_communication_policy,v_backfill_policy);
  if v_rule_count<>44 then raise exception 'RETENTION_MINIMIZATION_MATRIX_INCOMPLETE_V9'; end if;
  v_run_id:=public.mhidas_ticket_deterministic_uuid_v1('retention:'||p_idempotency_key);
  v_request_hash:=public.mhidas_ticket_sha256_v1(public.mhidas_ticket_canonical_payload_v1('mhidas.retention-run.v9',jsonb_build_object(
    'batch_limit',p_batch_limit,'receipt_policy',v_receipt_policy,'audit_policy',v_audit_policy,'signal_policy',v_signal_policy,
    'click_policy',v_click_policy,'context_policy',v_context_policy,'communication_policy',v_communication_policy,'backfill_policy',v_backfill_policy)));
  v_receipt:=public.mhidas_ticket_reserve_operation_receipt_v10('retention_run','service_role',null,'service_role:retention',null,null,'run_governance_retention_batch_v9',p_idempotency_key,'retention_run',v_run_id,null,v_request_hash,p_correlation_id,v_receipt_policy);
  if v_receipt.receipt_status='completed' then return jsonb_build_object('status','replayed','retention_run_id',v_receipt.result_id,'receipt_id',v_receipt.receipt_id); end if;
  insert into public.event_ticket_retention_runs (retention_run_id,receipt_id,receipt_policy_version_id,audit_policy_version_id,signal_policy_version_id,click_policy_version_id,context_policy_version_id,communication_policy_version_id,backfill_policy_version_id,batch_limit,minimization_rule_count,correlation_id)
  values (v_run_id,v_receipt.receipt_id,v_receipt_policy,v_audit_policy,v_signal_policy,v_click_policy,v_context_policy,v_communication_policy,v_backfill_policy,p_batch_limit,v_rule_count,p_correlation_id);
  begin
    if v_remaining>0 then
      with c as (select context_id from public.event_ticket_verified_credential_contexts where context_status='active' and expires_at<=now() order by expires_at limit v_remaining for update skip locked)
      update public.event_ticket_verified_credential_contexts x set context_status='expired',expired_at=coalesce(expired_at,now()),last_lifecycle_receipt_id=v_receipt.receipt_id from c where x.context_id=c.context_id;
      get diagnostics v_context_expired_count=row_count; v_attempted:=v_attempted+v_context_expired_count; v_locked:=v_locked+v_context_expired_count; v_changed:=v_changed+v_context_expired_count; v_remaining:=v_remaining-v_context_expired_count;
    end if;
    if v_remaining>0 then
      with c as (select r.receipt_id from public.event_ticket_operation_receipts r join public.event_ticket_retention_policy_versions p on p.retention_policy_version_id=r.receipt_retention_policy_version_id where p.policy_status in ('active','retired') and p.policy_purpose='operation_receipt' and p.jurisdiction_code='BR' and p.evidence_class='operation_receipt' and r.reserved_at<now()-make_interval(days=>p.retention_days) and r.minimized_at is null and r.receipt_id<>v_receipt.receipt_id order by r.reserved_at limit v_remaining for update of r skip locked)
      update public.event_ticket_operation_receipts r set anonymized_idempotency_hash=public.mhidas_ticket_sha256_v1('receipt.idempotency:'||r.idempotency_key),anonymized_target_hash=public.mhidas_ticket_sha256_v1('receipt.target:'||r.target_id::text),anonymized_result_hash=public.mhidas_ticket_sha256_v1('receipt.result:'||r.result_id::text),anonymized_correlation_hash=public.mhidas_ticket_sha256_v1('receipt.correlation:'||r.correlation_id),principal_id=null,integration_id=null,credential_version_id=null,principal_namespace='minimized:'||r.receipt_id::text,target_id=public.mhidas_ticket_deterministic_uuid_v1('receipt.target:'||r.receipt_id::text),result_id=public.mhidas_ticket_deterministic_uuid_v1('receipt.result:'||r.receipt_id::text),idempotency_key='minimized:'||r.receipt_id::text,correlation_id='minimized:'||r.receipt_id::text,minimized_at=now() from c where r.receipt_id=c.receipt_id;
      get diagnostics v_receipt_count=row_count; v_attempted:=v_attempted+v_receipt_count; v_locked:=v_locked+v_receipt_count; v_changed:=v_changed+v_receipt_count; v_remaining:=v_remaining-v_receipt_count;
    end if;
    if v_remaining>0 then
      with c as (select a.audit_id from public.event_ticket_commercial_audit_log a join public.event_ticket_retention_policy_versions p on p.retention_policy_version_id=a.audit_retention_policy_version_id where p.policy_status in ('active','retired') and p.policy_purpose='commercial_audit' and p.jurisdiction_code='BR' and p.evidence_class='commercial_audit' and a.created_at<now()-make_interval(days=>p.retention_days) and a.minimized_at is null order by a.created_at limit v_remaining for update of a skip locked)
      update public.event_ticket_commercial_audit_log a set anonymized_target_hash=public.mhidas_ticket_sha256_v1('audit.target:'||a.target_id::text),anonymized_correlation_hash=public.mhidas_ticket_sha256_v1('audit.correlation:'||a.correlation_id),anonymized_idempotency_hash=public.mhidas_ticket_sha256_v1('audit.idempotency:'||a.idempotency_key),target_id=public.mhidas_ticket_deterministic_uuid_v1('audit.target:'||a.audit_id::text),canonical_event_id=null,partner_id=null,integration_id=null,credential_version_id=null,actor_user_id=null,before_snapshot=null,after_snapshot=null,correlation_id='minimized:'||a.audit_id::text,idempotency_key='minimized:'||a.audit_id::text,minimized_at=now() from c where a.audit_id=c.audit_id;
      get diagnostics v_audit_count=row_count; v_attempted:=v_attempted+v_audit_count; v_locked:=v_locked+v_audit_count; v_changed:=v_changed+v_audit_count; v_remaining:=v_remaining-v_audit_count;
    end if;
    if v_remaining>0 then
      for v_family in
        select s.integration_id,s.transaction_family_id,min(s.created_at) as oldest_member_at
        from public.event_ticket_purchase_signals s join public.event_ticket_retention_policy_versions p on p.retention_policy_version_id=s.retention_policy_version_id
        where p.policy_status in ('active','retired') and p.policy_purpose='event_ticket_tracking' and p.jurisdiction_code='BR' and p.evidence_class='purchase_signal' and s.minimized_at is null and s.transaction_family_id is not null
        group by s.integration_id,s.transaction_family_id
        having bool_and(s.created_at<now()-make_interval(days=>p.retention_days))
        order by min(s.created_at),s.integration_id,s.transaction_family_id
      loop
        exit when v_remaining<=0;
        perform pg_advisory_xact_lock(public.mhidas_ticket_signal_family_lock_key_v1(v_family.integration_id,v_family.transaction_family_id));
        perform 1 from public.event_ticket_purchase_signals s where s.integration_id=v_family.integration_id and s.transaction_family_id=v_family.transaction_family_id and s.minimized_at is null order by s.created_at,s.signal_id for update;
        select count(*),coalesce(bool_and(s.created_at<now()-make_interval(days=>p.retention_days)),false) into v_family_total,v_family_due from public.event_ticket_purchase_signals s join public.event_ticket_retention_policy_versions p on p.retention_policy_version_id=s.retention_policy_version_id where s.integration_id=v_family.integration_id and s.transaction_family_id=v_family.transaction_family_id and s.minimized_at is null and p.policy_status in ('active','retired') and p.policy_purpose='event_ticket_tracking' and p.jurisdiction_code='BR' and p.evidence_class='purchase_signal';
        v_attempted:=v_attempted+v_family_total; v_locked:=v_locked+v_family_total;
        if not v_family_due or v_family_total=0 or v_family_total>v_remaining then v_blocked:=v_blocked+v_family_total; continue; end if;
        update public.event_ticket_purchase_signals s set anonymized_transaction_hash=coalesce(s.anonymized_transaction_hash,case when s.external_transaction_hash is null then null else public.mhidas_ticket_sha256_v1('signal.family:'||s.integration_id::text||':'||s.external_transaction_hash) end),user_id=null,channel_id=null,click_id=null,credential_context_id=null,external_transaction_hash=null,evidence_metadata='{}'::jsonb,signal_status='tombstoned',tombstoned_at=coalesce(tombstoned_at,now()),minimized_at=now() where s.integration_id=v_family.integration_id and s.transaction_family_id=v_family.transaction_family_id and s.minimized_at is null;
        get diagnostics v_phase_count=row_count;
        if v_phase_count<>v_family_total then raise exception 'SIGNAL_FAMILY_ATOMIC_CARDINALITY_DRIFT_V9'; end if;
        v_signal_family_count:=v_signal_family_count+v_phase_count; v_changed:=v_changed+v_phase_count; v_remaining:=v_remaining-v_phase_count;
      end loop;
    end if;
    if v_remaining>0 then
      with c as (select s.signal_id from public.event_ticket_purchase_signals s join public.event_ticket_retention_policy_versions p on p.retention_policy_version_id=s.retention_policy_version_id where p.policy_status in ('active','retired') and p.policy_purpose='event_ticket_tracking' and p.jurisdiction_code='BR' and p.evidence_class='purchase_signal' and s.created_at<now()-make_interval(days=>p.retention_days) and s.minimized_at is null and s.transaction_family_id is null order by s.created_at limit v_remaining for update of s skip locked)
      update public.event_ticket_purchase_signals s set user_id=null,channel_id=null,click_id=null,credential_context_id=null,external_transaction_hash=null,evidence_metadata='{}'::jsonb,signal_status='tombstoned',tombstoned_at=coalesce(tombstoned_at,now()),minimized_at=now() from c where s.signal_id=c.signal_id;
      get diagnostics v_signal_standalone_count=row_count; v_attempted:=v_attempted+v_signal_standalone_count; v_locked:=v_locked+v_signal_standalone_count; v_changed:=v_changed+v_signal_standalone_count; v_remaining:=v_remaining-v_signal_standalone_count;
    end if;
    v_signal_count:=v_signal_family_count+v_signal_standalone_count;
    if v_remaining>0 then
      with c as (select a.click_id from public.event_ticket_click_attributions a join public.event_ticket_retention_policy_versions p on p.retention_policy_version_id=a.retention_policy_version_id where p.policy_status in ('active','retired') and p.policy_purpose='event_ticket_tracking' and p.jurisdiction_code='BR' and p.evidence_class='click_attribution' and a.created_at<now()-make_interval(days=>p.retention_days) and a.anonymized_at is null order by a.created_at limit v_remaining for update of a skip locked)
      update public.event_ticket_click_attributions a set user_id=null,visitor_hash=case when visitor_hash is null then null else public.mhidas_ticket_sha256_v1('click.visitor:'||visitor_hash) end,campaign_hash=null,redirect_id=public.mhidas_ticket_deterministic_uuid_v1('click.redirect:'||a.click_id::text),anonymized_at=now() from c where a.click_id=c.click_id;
      get diagnostics v_click_count=row_count; v_attempted:=v_attempted+v_click_count; v_locked:=v_locked+v_click_count; v_changed:=v_changed+v_click_count; v_remaining:=v_remaining-v_click_count;
    end if;
    if v_remaining>0 then
      with c as (select x.context_id from public.event_ticket_verified_credential_contexts x join public.event_ticket_retention_policy_versions p on p.retention_policy_version_id=x.retention_policy_version_id where p.policy_status in ('active','retired') and p.policy_purpose='security_audit' and p.jurisdiction_code='BR' and p.evidence_class='credential_context' and x.issued_at<now()-make_interval(days=>p.retention_days) and x.minimized_at is null and x.context_status<>'active' order by x.issued_at limit v_remaining for update of x skip locked)
      update public.event_ticket_verified_credential_contexts x set context_token_hash=public.mhidas_ticket_sha256_v1('context.token:'||x.context_id::text),request_payload_hash=public.mhidas_ticket_sha256_v1('context.request:'||x.context_id::text),proof_nonce_hash=public.mhidas_ticket_sha256_v1('context.nonce:'||x.context_id::text),proof_signature_hash=public.mhidas_ticket_sha256_v1('context.signature:'||x.context_id::text),lifecycle_correlation_hash=public.mhidas_ticket_sha256_v1('context.correlation:'||x.context_id::text),minimized_at=now() from c where x.context_id=c.context_id;
      get diagnostics v_phase_count=row_count; v_context_count:=v_context_expired_count+v_phase_count; v_attempted:=v_attempted+v_phase_count; v_locked:=v_locked+v_phase_count; v_changed:=v_changed+v_phase_count; v_remaining:=v_remaining-v_phase_count;
    else v_context_count:=v_context_expired_count; end if;
    if v_remaining>0 then
      with c as (select m.communication_id from public.partner_official_communications m join public.event_ticket_retention_policy_versions p on p.retention_policy_version_id=m.retention_policy_version_id where p.policy_status in ('active','retired') and p.policy_purpose='commercial_governance' and p.jurisdiction_code='BR' and p.evidence_class='partner_communication' and m.created_at<now()-make_interval(days=>p.retention_days) and m.minimized_at is null order by m.created_at limit v_remaining for update of m skip locked)
      update public.partner_official_communications m set canonical_event_id=null,title='Conteúdo minimizado',body_hash=public.mhidas_ticket_sha256_v1('communication.body:'||m.communication_id::text),approved_by_admin_user_id=null,published_by_admin_user_id=null,metadata='{}'::jsonb,communication_status=case when communication_status in ('revoked','expired') then communication_status else 'expired' end,minimized_at=now(),updated_at=now() from c where m.communication_id=c.communication_id;
      get diagnostics v_communication_count=row_count; v_attempted:=v_attempted+v_communication_count; v_locked:=v_locked+v_communication_count; v_changed:=v_changed+v_communication_count; v_remaining:=v_remaining-v_communication_count;
    end if;
    if v_remaining>0 then
      with c as (select b.rejection_id from public.event_ticket_backfill_rejections b join public.event_ticket_retention_policy_versions p on p.retention_policy_version_id=b.retention_policy_version_id where p.policy_status in ('active','retired') and p.policy_purpose='commercial_governance' and p.jurisdiction_code='BR' and p.evidence_class='backfill_rejection' and b.created_at<now()-make_interval(days=>p.retention_days) and b.minimized_at is null order by b.created_at limit v_remaining for update of b skip locked)
      update public.event_ticket_backfill_rejections b set source_primary_key=public.mhidas_ticket_sha256_v1('backfill.source_key:'||b.source_primary_key),rejection_reason='minimized',canonical_event_id=null,source_payload_hash=public.mhidas_ticket_sha256_v1('backfill.payload:'||b.source_payload_hash),reconciliation_run_key=public.mhidas_ticket_sha256_v1('backfill.run:'||b.reconciliation_run_key),minimized_at=now() from c where b.rejection_id=c.rejection_id;
      get diagnostics v_backfill_count=row_count; v_attempted:=v_attempted+v_backfill_count; v_locked:=v_locked+v_backfill_count; v_changed:=v_changed+v_backfill_count; v_remaining:=v_remaining-v_backfill_count;
    end if;
    if v_changed>p_batch_limit or v_remaining<>p_batch_limit-v_changed then raise exception 'RETENTION_GLOBAL_WORK_BUDGET_VIOLATION_V9'; end if;
    update public.event_ticket_retention_policy_versions p set retirement_drain_completed_at=now(),updated_at=now() where p.policy_status='retired' and p.retirement_drain_completed_at is null and not exists (select 1 from public.event_ticket_operation_receipts r where r.receipt_retention_policy_version_id=p.retention_policy_version_id and r.minimized_at is null) and not exists (select 1 from public.event_ticket_commercial_audit_log a where a.audit_retention_policy_version_id=p.retention_policy_version_id and a.minimized_at is null) and not exists (select 1 from public.event_ticket_purchase_signals s where s.retention_policy_version_id=p.retention_policy_version_id and s.minimized_at is null) and not exists (select 1 from public.event_ticket_click_attributions c where c.retention_policy_version_id=p.retention_policy_version_id and c.anonymized_at is null) and not exists (select 1 from public.event_ticket_verified_credential_contexts x where x.retention_policy_version_id=p.retention_policy_version_id and x.minimized_at is null) and not exists (select 1 from public.partner_official_communications m where m.retention_policy_version_id=p.retention_policy_version_id and m.minimized_at is null) and not exists (select 1 from public.event_ticket_backfill_rejections b where b.retention_policy_version_id=p.retention_policy_version_id and b.minimized_at is null);
    update public.event_ticket_retention_runs set run_status='completed',receipt_processed_count=v_receipt_count,audit_processed_count=v_audit_count,signal_processed_count=v_signal_count,click_processed_count=v_click_count,context_processed_count=v_context_count,communication_processed_count=v_communication_count,backfill_processed_count=v_backfill_count,checkpoint=jsonb_build_object('phase','completed','cursor_hash',public.mhidas_ticket_sha256_v1(v_run_id::text),'processed_counts',jsonb_build_object('receipt',v_receipt_count,'audit',v_audit_count,'signal',v_signal_count,'click',v_click_count,'context',v_context_count,'communication',v_communication_count,'backfill',v_backfill_count,'expired_context',v_context_expired_count,'attempted',v_attempted,'locked',v_locked,'changed',v_changed,'blocked',v_blocked)),result_hash=public.mhidas_ticket_sha256_v1(v_run_id::text||':'||v_changed::text||':'||v_remaining::text),completed_at=now() where retention_run_id=v_run_id;
    perform public.mhidas_ticket_complete_operation_receipt_v6(v_receipt.receipt_id,'completed',1,public.mhidas_ticket_sha256_v1(v_run_id::text||':completed:'||v_changed::text));
    return jsonb_build_object('status','completed','retention_run_id',v_run_id,'receipt_id',v_receipt.receipt_id,'global_batch_limit',p_batch_limit,'attempted_count',v_attempted,'locked_count',v_locked,'changed_count',v_changed,'blocked_count',v_blocked,'remaining_budget',v_remaining,'receipt_processed_count',v_receipt_count,'audit_processed_count',v_audit_count,'signal_processed_count',v_signal_count,'click_processed_count',v_click_count,'context_processed_count',v_context_count,'communication_processed_count',v_communication_count,'backfill_processed_count',v_backfill_count);
  exception when others then
    v_failure_hash:=public.mhidas_ticket_sha256_v1(sqlstate||':'||sqlerrm);
    update public.event_ticket_retention_runs set run_status='failed',error_hash=v_failure_hash,failed_at=now() where retention_run_id=v_run_id;
    perform public.mhidas_ticket_fail_operation_receipt_v6(v_receipt.receipt_id,v_failure_hash);
    return jsonb_build_object('status','failed','retention_run_id',v_run_id,'receipt_id',v_receipt.receipt_id,'failure_hash',v_failure_hash);
  end;
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 11. RECEIPT-FIRST ADMINISTRATIVE LIFECYCLE
-- =============================================================================

create function public.mhidas_admin_mutate_commercial_partner_status_v6(
  p_partner_id uuid,
  p_next_status text,
  p_expected_lock_version integer,
  p_reason_hash text,
  p_idempotency_key text,
  p_correlation_id text
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
  v_receipt_policy uuid;
  v_audit_policy uuid;
  v_row record;
begin
  if auth.uid() is null or public.mhidas_is_useclubbers_admin_v1(auth.uid()) is distinct from true then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED_V5';
  end if;
  v_receipt_policy := public.mhidas_ticket_resolve_active_retention_policy_v2('operation_receipt','BR','operation_receipt');
  v_audit_policy := public.mhidas_ticket_resolve_active_retention_policy_v2('commercial_audit','BR','commercial_audit');
  v_request_hash := public.mhidas_ticket_sha256_v1(public.mhidas_ticket_canonical_payload_v1('mhidas.partner-status.v6',jsonb_build_object('partner_id',p_partner_id,'next_status',p_next_status,'expected_lock_version',p_expected_lock_version,'reason_hash',p_reason_hash)));
  v_receipt := public.mhidas_ticket_reserve_operation_receipt_v10(
    'partner_lifecycle','user',auth.uid(),'auth:user',null,null,
    'mutate_commercial_partner_status_v6',p_idempotency_key,'commercial_partner',
    p_partner_id,p_expected_lock_version,v_request_hash,p_correlation_id,v_receipt_policy
  );
  if v_receipt.receipt_status = 'completed' then
    return jsonb_build_object('status','replayed','partner_id',v_receipt.result_id,'receipt_id',v_receipt.receipt_id);
  end if;

  begin
    select * into v_partner from public.commercial_partners where partner_id = p_partner_id for update;
    if not found or v_partner.lock_version <> p_expected_lock_version then
      raise exception 'PARTNER_LOCK_VERSION_MISMATCH_V5';
    end if;
    v_previous_status := v_partner.partner_status;
    if not (
      (v_previous_status = 'pending_verification' and p_next_status in ('verified','deactivated'))
      or (v_previous_status = 'verified' and p_next_status in ('suspended','deactivated'))
      or (v_previous_status = 'suspended' and p_next_status in ('verified','deactivated'))
    ) then
      raise exception 'PARTNER_STATUS_TRANSITION_DENIED_V5:%->%', v_previous_status, p_next_status;
    end if;

    update public.commercial_partners
    set partner_status = p_next_status,
        verified_by_admin_user_id = case when p_next_status = 'verified' then auth.uid() else verified_by_admin_user_id end,
        verified_at = case when p_next_status = 'verified' then now() else verified_at end,
        suspended_at = case when p_next_status = 'suspended' then now() else suspended_at end,
        deactivated_at = case when p_next_status = 'deactivated' then now() else deactivated_at end,
        lock_version = lock_version + 1,updated_at = now()
    where partner_id = p_partner_id returning * into v_partner;

    if p_next_status in ('suspended','deactivated') then
      for v_row in
        select integration_id,integration_status,lock_version
        from public.event_ticket_trusted_integrations
        where partner_id = p_partner_id and integration_status not in ('retired')
        for update
      loop
        update public.event_ticket_trusted_integrations
        set integration_status = case when p_next_status = 'deactivated' then 'retired' else 'suspended' end,
            suspended_at = case when p_next_status = 'suspended' then now() else suspended_at end,
            retired_at = case when p_next_status = 'deactivated' then now() else retired_at end,
            lock_version = lock_version + 1,updated_at = now()
        where integration_id = v_row.integration_id;
        insert into public.event_ticket_commercial_audit_log (
          receipt_id,target_type,target_id,partner_id,integration_id,audit_action,actor_role,actor_user_id,
          previous_status,next_status,object_version,reason_hash,correlation_id,idempotency_key,audit_retention_policy_version_id
        ) values (
          v_receipt.receipt_id,'integration',v_row.integration_id,p_partner_id,v_row.integration_id,
          'partner_lifecycle_cascade','useclubbers_admin',auth.uid(),v_row.integration_status,
          case when p_next_status = 'deactivated' then 'retired' else 'suspended' end,
          v_row.lock_version + 1,p_reason_hash,p_correlation_id,
          p_idempotency_key || ':integration:' || v_row.integration_id::text,v_audit_policy
        );
      end loop;

      for v_row in
        select s.integration_channel_id,s.scope_status,s.lock_version,s.integration_id
        from public.event_ticket_trusted_integration_channels s
        join public.event_ticket_trusted_integrations i on i.integration_id = s.integration_id
        where i.partner_id = p_partner_id and s.scope_status not in ('revoked')
        for update of s
      loop
        update public.event_ticket_trusted_integration_channels
        set scope_status = case when p_next_status = 'deactivated' then 'revoked' else 'suspended' end,
            revoked_at = case when p_next_status = 'deactivated' then now() else revoked_at end,
            lock_version = lock_version + 1,updated_at = now()
        where integration_channel_id = v_row.integration_channel_id;
        insert into public.event_ticket_commercial_audit_log (
          receipt_id,target_type,target_id,partner_id,integration_id,audit_action,actor_role,actor_user_id,
          previous_status,next_status,object_version,reason_hash,correlation_id,idempotency_key,audit_retention_policy_version_id
        ) values (
          v_receipt.receipt_id,'integration_scope',v_row.integration_channel_id,p_partner_id,v_row.integration_id,
          'partner_lifecycle_cascade','useclubbers_admin',auth.uid(),v_row.scope_status,
          case when p_next_status = 'deactivated' then 'revoked' else 'suspended' end,
          v_row.lock_version + 1,p_reason_hash,p_correlation_id,
          p_idempotency_key || ':scope:' || v_row.integration_channel_id::text,v_audit_policy
        );
      end loop;

      for v_row in
        select channel_id,channel_status,lock_version,integration_id
        from public.event_ticket_commercial_channels
        where partner_id = p_partner_id and channel_status not in ('revoked','expired')
        for update
      loop
        update public.event_ticket_commercial_channels
        set channel_status = case when p_next_status = 'deactivated' then 'revoked' else 'paused' end,
            paused_at = case when p_next_status = 'suspended' then now() else paused_at end,
            revoked_at = case when p_next_status = 'deactivated' then now() else revoked_at end,
            lock_version = lock_version + 1,updated_at = now()
        where channel_id = v_row.channel_id;
        insert into public.event_ticket_commercial_audit_log (
          receipt_id,target_type,target_id,partner_id,integration_id,audit_action,actor_role,actor_user_id,
          previous_status,next_status,object_version,reason_hash,correlation_id,idempotency_key,audit_retention_policy_version_id
        ) values (
          v_receipt.receipt_id,'channel',v_row.channel_id,p_partner_id,v_row.integration_id,
          'partner_lifecycle_cascade','useclubbers_admin',auth.uid(),v_row.channel_status,
          case when p_next_status = 'deactivated' then 'revoked' else 'paused' end,
          v_row.lock_version + 1,p_reason_hash,p_correlation_id,
          p_idempotency_key || ':channel:' || v_row.channel_id::text,v_audit_policy
        );
      end loop;
    end if;

    insert into public.event_ticket_commercial_audit_log (
      receipt_id,target_type,target_id,partner_id,audit_action,actor_role,actor_user_id,
      previous_status,next_status,object_version,reason_hash,correlation_id,idempotency_key,audit_retention_policy_version_id
    ) values (
      v_receipt.receipt_id,'partner',p_partner_id,p_partner_id,'partner_status_mutated','useclubbers_admin',auth.uid(),
      v_previous_status,p_next_status,v_partner.lock_version,p_reason_hash,p_correlation_id,p_idempotency_key,v_audit_policy
    );
    perform public.mhidas_ticket_complete_operation_receipt_v6(
      v_receipt.receipt_id,p_next_status,v_partner.lock_version,
      public.mhidas_ticket_sha256_v1(p_partner_id::text || ':' || p_next_status)
    );
    return jsonb_build_object('status','completed','partner_id',p_partner_id,'partner_status',p_next_status,'lock_version',v_partner.lock_version,'receipt_id',v_receipt.receipt_id);
  exception when others then
    v_failure_hash := public.mhidas_ticket_sha256_v1(sqlstate || ':' || sqlerrm);
    perform public.mhidas_ticket_fail_operation_receipt_v6(v_receipt.receipt_id, v_failure_hash);
    return jsonb_build_object('status','failed','receipt_id',v_receipt.receipt_id,'failure_hash',v_failure_hash);
  end;
end;
$mhidas_plpgsql$;

create function public.mhidas_admin_rotate_event_ticket_integration_credential_v2(
  p_integration_id uuid,
  p_next_credential_version_id uuid,
  p_next_issuer_service_key_hash text,
  p_expected_lock_version integer,
  p_reason_hash text,
  p_idempotency_key text,
  p_correlation_id text
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_receipt_policy uuid; v_audit_policy uuid; v_receipt public.event_ticket_operation_receipts%rowtype;
  v_integration public.event_ticket_trusted_integrations%rowtype; v_old public.event_ticket_trusted_integration_credential_versions%rowtype;
  v_next public.event_ticket_trusted_integration_credential_versions%rowtype; v_request_hash text; v_failure_hash text;
begin
  if auth.uid() is null or public.mhidas_is_useclubbers_admin_v1(auth.uid()) is distinct from true then raise exception 'USECLUBBERS_ADMIN_REQUIRED_ROTATION_V2'; end if;
  if p_next_issuer_service_key_hash !~ '^[0-9a-f]{64}$' then raise exception 'ISSUER_SERVICE_KEY_HASH_INVALID_V2'; end if;
  v_receipt_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('operation_receipt','BR','operation_receipt');
  v_audit_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('commercial_audit','BR','commercial_audit');
  v_request_hash:=public.mhidas_ticket_sha256_v1(p_integration_id::text||':'||p_next_credential_version_id::text||':'||p_next_issuer_service_key_hash||':'||p_expected_lock_version::text||':'||p_reason_hash);
  v_receipt:=public.mhidas_ticket_reserve_operation_receipt_v10('credential_rotation','user',auth.uid(),'auth:user',null,null,'rotate_integration_credential_v2',p_idempotency_key,'trusted_integration',p_integration_id,p_expected_lock_version,v_request_hash,p_correlation_id,v_receipt_policy);
  if v_receipt.receipt_status='completed' then return jsonb_build_object('status','replayed','integration_id',v_receipt.result_id,'receipt_id',v_receipt.receipt_id); end if;
  begin
    select * into v_integration from public.event_ticket_trusted_integrations where integration_id=p_integration_id for update;
    if not found or v_integration.lock_version<>p_expected_lock_version or v_integration.integration_status<>'active' then raise exception 'INTEGRATION_ROTATION_STATE_DENIED_V2'; end if;
    select * into v_old from public.event_ticket_trusted_integration_credential_versions where integration_id=p_integration_id and credential_version_id=v_integration.current_credential_version_id for update;
    if not found or v_old.credential_status<>'active' then raise exception 'CURRENT_CREDENTIAL_ROTATION_STATE_DENIED_V2'; end if;
    select * into v_next from public.event_ticket_trusted_integration_credential_versions where integration_id=p_integration_id and credential_version_id=p_next_credential_version_id for update;
    if not found or v_next.credential_status not in ('pending','rotating') or v_next.valid_from>now() or (v_next.valid_until is not null and v_next.valid_until<=now()) then raise exception 'NEXT_CREDENTIAL_ROTATION_STATE_DENIED_V2'; end if;
    update public.event_ticket_trusted_integration_credential_versions set credential_status='revoked',revoked_by_admin_user_id=auth.uid(),revoked_at=now(),revocation_reason_hash=p_reason_hash where credential_version_id=v_old.credential_version_id;
    update public.event_ticket_verified_credential_contexts set context_status='revoked',revoked_at=now(),revocation_reason_hash=p_reason_hash where integration_id=p_integration_id and credential_version_id=v_old.credential_version_id and context_status='active';
    update public.event_ticket_trusted_integration_credential_versions set credential_status='active',activated_by_admin_user_id=auth.uid(),activated_at=now() where credential_version_id=p_next_credential_version_id;
    update public.event_ticket_trusted_integrations set current_credential_version_id=p_next_credential_version_id,issuer_service_key_hash=p_next_issuer_service_key_hash,lock_version=lock_version+1,updated_at=now() where integration_id=p_integration_id returning * into v_integration;
    set constraints event_ticket_integrations_current_credential_v4120_ct, event_ticket_credentials_current_invariant_v4120_ct immediate;
    insert into public.event_ticket_commercial_audit_log (receipt_id,target_type,target_id,integration_id,credential_version_id,audit_action,actor_role,actor_user_id,previous_status,next_status,object_version,reason_hash,correlation_id,idempotency_key,audit_retention_policy_version_id)
    values (v_receipt.receipt_id,'credential_version',v_old.credential_version_id,p_integration_id,v_old.credential_version_id,'credential_rotated_out','useclubbers_admin',auth.uid(),'active','revoked',v_integration.lock_version,p_reason_hash,p_correlation_id,p_idempotency_key||':old',v_audit_policy),
      (v_receipt.receipt_id,'credential_version',v_next.credential_version_id,p_integration_id,v_next.credential_version_id,'credential_rotated_in','useclubbers_admin',auth.uid(),v_next.credential_status,'active',v_integration.lock_version,p_reason_hash,p_correlation_id,p_idempotency_key||':new',v_audit_policy),
      (v_receipt.receipt_id,'integration',p_integration_id,p_integration_id,p_next_credential_version_id,'integration_current_credential_rotated','useclubbers_admin',auth.uid(),v_old.credential_version_id::text,p_next_credential_version_id::text,v_integration.lock_version,p_reason_hash,p_correlation_id,p_idempotency_key,v_audit_policy);
    perform public.mhidas_ticket_complete_operation_receipt_v6(v_receipt.receipt_id,'credential_rotated',v_integration.lock_version,public.mhidas_ticket_sha256_v1(p_integration_id::text||':'||p_next_credential_version_id::text||':'||p_next_issuer_service_key_hash));
    return jsonb_build_object('status','completed','integration_id',p_integration_id,'credential_version_id',p_next_credential_version_id,'lock_version',v_integration.lock_version,'receipt_id',v_receipt.receipt_id);
  exception when others then
    v_failure_hash:=public.mhidas_ticket_sha256_v1(sqlstate||':'||sqlerrm); perform public.mhidas_ticket_fail_operation_receipt_v6(v_receipt.receipt_id,v_failure_hash);
    return jsonb_build_object('status','failed','receipt_id',v_receipt.receipt_id,'failure_hash',v_failure_hash);
  end;
end;
$mhidas_plpgsql$;

create function public.mhidas_admin_retire_event_ticket_retention_policy_v7(
  p_retention_policy_version_id uuid,
  p_replacement_policy_version_id uuid,
  p_expected_lock_version integer,
  p_reason_hash text,
  p_idempotency_key text,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_receipt public.event_ticket_operation_receipts%rowtype;
  v_policy public.event_ticket_retention_policy_versions%rowtype;
  v_replacement public.event_ticket_retention_policy_versions%rowtype;
  v_request_hash text;
  v_failure_hash text;
  v_receipt_policy uuid;
  v_audit_policy uuid;
begin
  if auth.uid() is null or public.mhidas_is_useclubbers_admin_v1(auth.uid()) is distinct from true then
    raise exception 'USECLUBBERS_ADMIN_REQUIRED_RETENTION_POLICY_V7';
  end if;
  if p_retention_policy_version_id = p_replacement_policy_version_id then
    raise exception 'RETENTION_POLICY_SELF_SUCCESSOR_DENIED_V7';
  end if;
  v_receipt_policy := public.mhidas_ticket_resolve_active_retention_policy_v2('operation_receipt','BR','operation_receipt');
  v_audit_policy := public.mhidas_ticket_resolve_active_retention_policy_v2('commercial_audit','BR','commercial_audit');
  v_request_hash := public.mhidas_ticket_sha256_v1(
    public.mhidas_ticket_canonical_payload_v1(
      'mhidas.retention-policy-retirement.v7',
      jsonb_build_object(
        'retention_policy_version_id',p_retention_policy_version_id,
        'replacement_policy_version_id',p_replacement_policy_version_id,
        'expected_lock_version',p_expected_lock_version,
        'reason_hash',p_reason_hash
      )
    )
  );
  v_receipt := public.mhidas_ticket_reserve_operation_receipt_v10(
    'retention_policy_mutation','user',auth.uid(),'auth:user',null,null,
    'retire_retention_policy_v7',p_idempotency_key,'retention_policy',
    p_retention_policy_version_id,p_expected_lock_version,v_request_hash,p_correlation_id,v_receipt_policy
  );
  if v_receipt.receipt_status = 'completed' then
    return jsonb_build_object('status','replayed','retention_policy_version_id',v_receipt.result_id,'receipt_id',v_receipt.receipt_id);
  end if;

  begin
    select * into v_policy from public.event_ticket_retention_policy_versions
    where retention_policy_version_id = p_retention_policy_version_id for update;
    select * into v_replacement from public.event_ticket_retention_policy_versions
    where retention_policy_version_id = p_replacement_policy_version_id for share;
    if not found then raise exception 'RETENTION_POLICY_REPLACEMENT_NOT_FOUND_V7'; end if;
    if v_policy.retention_policy_version_id is null or v_policy.lock_version <> p_expected_lock_version then
      raise exception 'RETENTION_POLICY_LOCK_VERSION_MISMATCH_V7';
    end if;
    if v_policy.policy_status <> 'active' then
      raise exception 'ONLY_ACTIVE_RETENTION_POLICY_CAN_BE_RETIRED_V7';
    end if;
    if v_replacement.policy_status <> 'approved'
      or v_replacement.policy_purpose <> v_policy.policy_purpose
      or v_replacement.jurisdiction_code <> v_policy.jurisdiction_code
      or v_replacement.evidence_class <> v_policy.evidence_class then
      raise exception 'APPROVED_COMPATIBLE_RETENTION_POLICY_REPLACEMENT_REQUIRED_V7';
    end if;
    perform public.mhidas_ticket_assert_retention_execution_contract_v2(
      p_replacement_policy_version_id,
      v_policy.evidence_class,
      (select count(*) from public.event_ticket_retention_minimization_rules where retention_policy_version_id=v_policy.retention_policy_version_id and rule_status='active')
    );
    update public.event_ticket_retention_policy_versions
    set policy_status='retired',retired_at=now(),superseded_by_policy_version_id=p_replacement_policy_version_id,
        lock_version=lock_version+1,updated_at=now()
    where retention_policy_version_id=p_retention_policy_version_id returning * into v_policy;
    update public.event_ticket_retention_policy_versions
    set policy_status='active',activated_at=now(),lock_version=lock_version+1,updated_at=now()
    where retention_policy_version_id=p_replacement_policy_version_id and policy_status='approved'
    returning * into v_replacement;
    if not found then raise exception 'RETENTION_POLICY_REPLACEMENT_ACTIVATION_CONFLICT_V7'; end if;
    insert into public.event_ticket_commercial_audit_log (
      receipt_id,target_type,target_id,audit_action,actor_role,actor_user_id,previous_status,next_status,
      object_version,reason_hash,correlation_id,idempotency_key,audit_retention_policy_version_id
    ) values (
      v_receipt.receipt_id,'retention_policy',p_retention_policy_version_id,'retention_policy_retired_with_successor',
      'useclubbers_admin',auth.uid(),'active','retired',v_policy.lock_version,p_reason_hash,
      p_correlation_id,p_idempotency_key,v_audit_policy
    );
    perform public.mhidas_ticket_complete_operation_receipt_v6(
      v_receipt.receipt_id,'retired',v_policy.lock_version,
      public.mhidas_ticket_sha256_v1(p_retention_policy_version_id::text||':'||p_replacement_policy_version_id::text||':retired')
    );
    return jsonb_build_object(
      'status','completed','retention_policy_version_id',p_retention_policy_version_id,
      'replacement_policy_version_id',p_replacement_policy_version_id,'policy_status','retired',
      'lock_version',v_policy.lock_version,'receipt_id',v_receipt.receipt_id
    );
  exception when others then
    v_failure_hash:=public.mhidas_ticket_sha256_v1(sqlstate||':'||sqlerrm);
    perform public.mhidas_ticket_fail_operation_receipt_v6(v_receipt.receipt_id,v_failure_hash);
    return jsonb_build_object('status','failed','receipt_id',v_receipt.receipt_id,'failure_hash',v_failure_hash);
  end;
end;
$mhidas_plpgsql$;



create function public.mhidas_admin_authorize_activate_commercial_channel_v4(
  p_channel_id uuid,
  p_expected_lock_version integer,
  p_financial_terms_hash text,
  p_lifecycle_snapshot_hash text,
  p_scope_snapshot_hash text,
  p_idempotency_key text,
  p_correlation_id text
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_channel public.event_ticket_commercial_channels%rowtype; v_request public.event_ticket_partnership_requests%rowtype;
  v_receipt public.event_ticket_operation_receipts%rowtype; v_receipt_policy uuid; v_audit_policy uuid; v_request_hash text; v_failure_hash text;
begin
  if auth.uid() is null or public.mhidas_is_useclubbers_admin_v1(auth.uid()) is distinct from true then raise exception 'USECLUBBERS_ADMIN_REQUIRED_CHANNEL_AUTH_V1'; end if;
  if p_financial_terms_hash !~ '^[0-9a-f]{64}$' or p_lifecycle_snapshot_hash !~ '^[0-9a-f]{64}$' or p_scope_snapshot_hash !~ '^[0-9a-f]{64}$' then raise exception 'CHANNEL_AUTH_EVIDENCE_HASH_INVALID_V1'; end if;
  v_receipt_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('operation_receipt','BR','operation_receipt');
  v_audit_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('commercial_audit','BR','commercial_audit');
  v_request_hash:=public.mhidas_ticket_sha256_v1(public.mhidas_ticket_canonical_payload_v1('mhidas.channel-activation.v3',jsonb_build_object('channel_id',p_channel_id,'expected_lock_version',p_expected_lock_version,'financial_terms_hash',p_financial_terms_hash,'lifecycle_snapshot_hash',p_lifecycle_snapshot_hash,'scope_snapshot_hash',p_scope_snapshot_hash)));
  v_receipt:=public.mhidas_ticket_reserve_operation_receipt_v10('channel_mutation','user',auth.uid(),'auth:user',null,null,'authorize_activate_commercial_channel_v4',p_idempotency_key,'commercial_channel',p_channel_id,p_expected_lock_version,v_request_hash,p_correlation_id,v_receipt_policy);
  if v_receipt.receipt_status='completed' then return jsonb_build_object('status','replayed','channel_id',v_receipt.result_id,'receipt_id',v_receipt.receipt_id); end if;
  begin
    select * into v_channel from public.event_ticket_commercial_channels where channel_id=p_channel_id;
    if not found then raise exception 'CHANNEL_TARGET_NOT_FOUND_V4'; end if;
    if v_channel.lock_version<>p_expected_lock_version or v_channel.channel_status not in ('draft','authorized','paused') then raise exception 'CHANNEL_AUTH_STATE_DENIED_V4'; end if;
    perform pg_advisory_xact_lock(hashtextextended(v_channel.canonical_event_id::text,0));
    select * into v_channel from public.event_ticket_commercial_channels where channel_id=p_channel_id for update;
    if not found or v_channel.lock_version<>p_expected_lock_version or v_channel.channel_status not in ('draft','authorized','paused') then raise exception 'CHANNEL_AUTH_REVALIDATION_DENIED_V4'; end if;
    select * into v_request from public.event_ticket_partnership_requests where request_id=v_channel.request_id and canonical_event_id=v_channel.canonical_event_id and partner_id=v_channel.partner_id for update;
    if not found or v_request.request_status<>'approved' or v_request.reviewed_by_admin_user_id is null or v_request.reviewed_at is null then raise exception 'APPROVED_PARTNERSHIP_REQUEST_REQUIRED_V1'; end if;
    if not exists (select 1 from public.commercial_partners p where p.partner_id=v_channel.partner_id and p.partner_status='verified') then raise exception 'VERIFIED_PARTNER_REQUIRED_CHANNEL_AUTH_V1'; end if;
    if not exists (select 1 from public.event_ticket_trusted_integrations i join public.event_ticket_trusted_integration_credential_versions c on c.integration_id=i.integration_id and c.credential_version_id=i.current_credential_version_id where i.integration_id=v_channel.integration_id and i.partner_id=v_channel.partner_id and i.integration_status='active' and i.issuer_service_key_hash is not null and c.credential_status='active' and c.valid_from<=now() and (c.valid_until is null or c.valid_until>now())) then raise exception 'ACTIVE_INTEGRATION_AUTHORITY_REQUIRED_V1'; end if;
    update public.event_ticket_commercial_channels
    set channel_status='expired',updated_at=now(),lock_version=lock_version+1
    where canonical_event_id=v_channel.canonical_event_id and channel_id<>v_channel.channel_id
      and channel_status='active' and valid_until is not null and valid_until<=now();
    if exists (select 1 from public.event_ticket_commercial_channels x where x.canonical_event_id=v_channel.canonical_event_id and x.channel_id<>v_channel.channel_id and x.channel_status='active') then raise exception 'NON_EXPIRED_ACTIVE_CHANNEL_REPLACEMENT_DENIED_V3'; end if;
    if not exists (select 1 from public.event_ticket_trusted_integration_channels s where s.integration_channel_id=v_channel.integration_channel_id and s.integration_id=v_channel.integration_id and s.canonical_event_id=v_channel.canonical_event_id and s.channel_scope='url_validation' and s.scope_status='active' and (s.valid_from is null or s.valid_from<=now()) and (s.valid_until is null or s.valid_until>now())) then raise exception 'ACTIVE_URL_SCOPE_REQUIRED_V1'; end if;
    if v_channel.destination_url_ciphertext is null or length(v_channel.destination_url_ciphertext) not between 32 and 32768
      or v_channel.destination_url_hash is null or v_channel.destination_hostname is null
      or v_channel.valid_from is null or (v_channel.valid_until is not null and v_channel.valid_until<=v_channel.valid_from) then
      raise exception 'REDEEMABLE_TIME_BOUND_CHANNEL_REQUIRED_V2';
    end if;
    if public.mhidas_ticket_verify_commercial_destination_envelope_v2(v_channel.destination_url_ciphertext,v_channel.destination_envelope_key_id,v_channel.destination_envelope_mac,v_channel.destination_envelope_hash,v_channel.destination_url_hash,v_channel.destination_hostname) is distinct from true then raise exception 'COMMERCIAL_DESTINATION_ENVELOPE_BINDING_DENIED_V3'; end if;
    if public.mhidas_ticket_url_proof_is_fresh_v9(v_channel.channel_id,v_channel.destination_url_hash,v_channel.destination_envelope_hash,v_channel.url_validation_status,v_channel.destination_hostname,v_channel.url_validated_at,v_channel.url_validation_expires_at,v_channel.last_health_checked_at,v_channel.last_health_check_hash,v_channel.url_validator_version,v_channel.resolved_host_hash,v_channel.resolved_ip_set_hash,v_channel.redirect_chain_validation_hash,v_channel.url_proof_attestation_hash,v_channel.url_proof_manifest_hash,v_channel.url_proof_canonical_payload_hash,v_channel.url_proof_signature,v_channel.url_proof_signer_key_hash,v_channel.url_proof_signer_key_id,v_channel.url_proof_signature_algorithm,v_channel.url_validation_authority_id) is distinct from true then raise exception 'AUTHENTICATED_URL_PROOF_REQUIRED_V1'; end if;
    update public.event_ticket_commercial_channels set channel_status='active',financial_terms_hash=p_financial_terms_hash,lifecycle_snapshot_hash=p_lifecycle_snapshot_hash,authorized_scope_snapshot_hash=p_scope_snapshot_hash,authorization_receipt_id=v_receipt.receipt_id,authorized_by_admin_user_id=auth.uid(),authorized_at=now(),activated_at=now(),valid_from=coalesce(valid_from,now()),paused_at=null,revoked_at=null,lock_version=lock_version+1,updated_at=now() where channel_id=p_channel_id returning * into v_channel;
    insert into public.event_ticket_commercial_audit_log (receipt_id,target_type,target_id,canonical_event_id,partner_id,integration_id,audit_action,actor_role,actor_user_id,previous_status,next_status,object_version,reason_hash,correlation_id,idempotency_key,audit_retention_policy_version_id)
    values (v_receipt.receipt_id,'channel',v_channel.channel_id,v_channel.canonical_event_id,v_channel.partner_id,v_channel.integration_id,'commercial_channel_authorized_activated','useclubbers_admin',auth.uid(),'draft','active',v_channel.lock_version,p_lifecycle_snapshot_hash,p_correlation_id,p_idempotency_key,v_audit_policy);
    perform public.mhidas_ticket_complete_operation_receipt_v6(v_receipt.receipt_id,'active',v_channel.lock_version,public.mhidas_ticket_sha256_v1(v_channel.channel_id::text||':active:'||p_financial_terms_hash));
    return jsonb_build_object('status','completed','channel_id',v_channel.channel_id,'channel_status',v_channel.channel_status,'lock_version',v_channel.lock_version,'receipt_id',v_receipt.receipt_id);
  exception when others then
    v_failure_hash:=public.mhidas_ticket_sha256_v1(sqlstate||':'||sqlerrm); perform public.mhidas_ticket_fail_operation_receipt_v6(v_receipt.receipt_id,v_failure_hash);
    return jsonb_build_object('status','failed','receipt_id',v_receipt.receipt_id,'failure_hash',v_failure_hash);
  end;
end;
$mhidas_plpgsql$;

create function public.mhidas_admin_prepare_event_ticket_legacy_backfill_v2(
  p_idempotency_key text,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $mhidas_plpgsql$
declare
  v_run_id uuid;
  v_source_table text;
  v_total_count bigint:=0;
  v_mapped_count bigint:=0;
  v_rejected_count bigint:=0;
  v_inventory_hash text;
  v_mapped_checksum text;
  v_rejection_checksum text;
  v_backfill_policy uuid;
  v_existing public.event_ticket_legacy_backfill_runs%rowtype;
begin
  if auth.uid() is null or public.mhidas_is_useclubbers_admin_v1(auth.uid()) is distinct from true then raise exception 'USECLUBBERS_ADMIN_REQUIRED_BACKFILL_V2'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 160 or p_correlation_id is null then raise exception 'BACKFILL_REQUEST_CONTRACT_INVALID_V2'; end if;
  v_run_id:=public.mhidas_ticket_deterministic_uuid_v1('legacy-backfill:v2:'||p_idempotency_key);
  select * into v_existing from public.event_ticket_legacy_backfill_runs where idempotency_key=p_idempotency_key for update;
  if found then return jsonb_build_object('status','replayed','backfill_run_id',v_existing.backfill_run_id,'run_status',v_existing.run_status,'mapped_count',v_existing.mapped_count,'rejected_count',v_existing.rejected_count); end if;
  v_inventory_hash:=public.mhidas_ticket_sha256_v1(public.mhidas_ticket_canonical_payload_v1('mhidas.legacy-backfill.inventory.v2',jsonb_build_object(
    'event_ticket_intents_count',(select count(*) from public.event_ticket_intents),
    'partner_ticket_requests_count',(select count(*) from public.partner_ticket_requests),
    'event_sources_count',(select count(*) from public.event_sources))));
  v_backfill_policy:=public.mhidas_ticket_resolve_active_retention_policy_v2('commercial_governance','BR','backfill_rejection');
  insert into public.event_ticket_legacy_backfill_runs (backfill_run_id,idempotency_key,source_inventory_hash,mapped_count,rejected_count,mapped_checksum,rejection_checksum,created_by_admin_user_id)
  values (v_run_id,p_idempotency_key,v_inventory_hash,0,0,public.mhidas_ticket_sha256_v1('mapped:pending'),public.mhidas_ticket_sha256_v1('rejected:pending'),auth.uid());

  foreach v_source_table in array array['event_ticket_intents','partner_ticket_requests','event_sources'] loop
    execute format($mhidas_dynamic$
      with raw as (select to_jsonb(t) as payload from public.%I t), normalized as (
        select payload,
          coalesce(payload->>'id',payload->>'intent_id',payload->>'request_id',payload->>'source_id',public.mhidas_ticket_sha256_v1(payload::text)) as source_key,
          public.mhidas_ticket_try_uuid_v1(coalesce(payload->>'canonical_event_id',payload->>'event_id')) as canonical_event_id,
          public.mhidas_ticket_sha256_v1(%L||':'||payload::text) as source_row_hash
        from raw
      ), classified as (
        select n.*,exists(select 1 from public.canonical_events e where e.id=n.canonical_event_id) as is_mapped from normalized n
      )
      insert into public.event_ticket_backfill_rejections (rejection_id,source_table,source_primary_key,classification,rejection_reason,canonical_event_id,source_payload_hash,reconciliation_run_key,retention_policy_version_id)
      select public.mhidas_ticket_deterministic_uuid_v1('backfill-rejection:'||%L||':'||%L||':'||source_row_hash),%L,source_key,'legacy_mapping','canonical_event_not_resolved',null,source_row_hash,%L,%L::uuid
      from classified where not is_mapped
      on conflict (reconciliation_run_key,source_table,source_primary_key) do nothing
    $mhidas_dynamic$,v_source_table,v_source_table,v_run_id::text,v_source_table,v_source_table,v_run_id::text,v_backfill_policy::text);

    execute format($mhidas_dynamic$
      with raw as (select to_jsonb(t) as payload from public.%I t), normalized as (
        select payload,
          coalesce(payload->>'id',payload->>'intent_id',payload->>'request_id',payload->>'source_id',public.mhidas_ticket_sha256_v1(payload::text)) as source_key,
          public.mhidas_ticket_try_uuid_v1(coalesce(payload->>'canonical_event_id',payload->>'event_id')) as canonical_event_id,
          public.mhidas_ticket_sha256_v1(%L||':'||payload::text) as source_row_hash
        from raw
      ), classified as (
        select n.*,exists(select 1 from public.canonical_events e where e.id=n.canonical_event_id) as is_mapped from normalized n
      )
      insert into public.event_ticket_legacy_backfill_items (backfill_run_id,source_table,source_row_hash,mapping_status,canonical_event_id,mapped_object_type,mapped_object_id,rejection_id)
      select %L::uuid,%L,source_row_hash,case when is_mapped then 'mapped' else 'rejected' end,
        case when is_mapped then canonical_event_id else null end,case when is_mapped then 'canonical_event' else null end,
        case when is_mapped then canonical_event_id else null end,
        case when is_mapped then null else public.mhidas_ticket_deterministic_uuid_v1('backfill-rejection:'||%L||':'||%L||':'||source_row_hash) end
      from classified
      on conflict (backfill_run_id,source_table,source_row_hash) do nothing
    $mhidas_dynamic$,v_source_table,v_source_table,v_run_id::text,v_source_table,v_run_id::text,v_source_table);
  end loop;

  select count(*),count(*) filter(where mapping_status='mapped'),count(*) filter(where mapping_status='rejected')
  into v_total_count,v_mapped_count,v_rejected_count from public.event_ticket_legacy_backfill_items where backfill_run_id=v_run_id;
  v_mapped_checksum:=public.mhidas_ticket_sha256_v1(coalesce((select string_agg(source_table||':'||source_row_hash||':'||coalesce(canonical_event_id::text,''),'|' order by source_table,source_row_hash) from public.event_ticket_legacy_backfill_items where backfill_run_id=v_run_id and mapping_status='mapped'),'mapped:empty'));
  v_rejection_checksum:=public.mhidas_ticket_sha256_v1(coalesce((select string_agg(source_table||':'||source_row_hash||':'||rejection_id::text,'|' order by source_table,source_row_hash) from public.event_ticket_legacy_backfill_items where backfill_run_id=v_run_id and mapping_status='rejected'),'rejected:empty'));
  if v_total_count<>(select count(*) from public.event_ticket_intents)+(select count(*) from public.partner_ticket_requests)+(select count(*) from public.event_sources)
    or v_total_count<>v_mapped_count+v_rejected_count then raise exception 'BACKFILL_CARDINALITY_INVARIANT_DENIED_V2'; end if;
  update public.event_ticket_legacy_backfill_runs set run_status='cutover_ready',mapped_count=v_mapped_count,rejected_count=v_rejected_count,mapped_checksum=v_mapped_checksum,rejection_checksum=v_rejection_checksum,cutover_ready=true where backfill_run_id=v_run_id;
  insert into public.event_ticket_legacy_cutover_checkpoints (checkpoint_id,backfill_run_id,checkpoint_status,legacy_count,mapped_count,rejected_count,dual_read_checksum,rollback_checksum)
  values (public.mhidas_ticket_deterministic_uuid_v1('backfill-checkpoint:'||v_run_id::text),v_run_id,'validated',v_total_count,v_mapped_count,v_rejected_count,public.mhidas_ticket_sha256_v1(v_inventory_hash||':'||v_mapped_checksum||':'||v_rejection_checksum),public.mhidas_ticket_sha256_v1('rollback:'||v_inventory_hash))
  on conflict (checkpoint_id) do nothing;
  return jsonb_build_object('status','cutover_ready','backfill_run_id',v_run_id,'source_inventory_hash',v_inventory_hash,'legacy_row_count',v_total_count,'mapped_count',v_mapped_count,'rejected_count',v_rejected_count,'mapped_checksum',v_mapped_checksum,'rejection_checksum',v_rejection_checksum,'correlation_hash',public.mhidas_ticket_sha256_v1(p_correlation_id));
end;
$mhidas_plpgsql$;

-- =============================================================================
-- 12. AUTHORITY-BOUND PUBLIC RESOLUTION, RLS AND PRIVILEGE BOUNDARIES
-- =============================================================================

create function public.mhidas_ticket_url_proof_is_fresh_v9(
  p_channel_id uuid,
  p_destination_url_hash text,
  p_destination_envelope_hash text,
  p_status text,
  p_hostname text,
  p_validated_at timestamptz,
  p_expires_at timestamptz,
  p_last_health_checked_at timestamptz,
  p_last_health_check_hash text,
  p_validator_version integer,
  p_resolved_host_hash text,
  p_resolved_ip_set_hash text,
  p_redirect_chain_validation_hash text,
  p_attestation_hash text,
  p_manifest_hash text,
  p_canonical_payload_hash text,
  p_detached_signature text,
  p_signer_key_hash text,
  p_signer_key_id text,
  p_signature_algorithm text,
  p_authority_id uuid
)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $mhidas_sql$
  with authority as (
    select a.* from public.event_ticket_url_validation_authorities a
    where a.url_validation_authority_id=p_authority_id and a.authority_status='active'
      and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now())
      and a.signer_key_hash=p_signer_key_hash and a.signer_key_id=p_signer_key_id and a.signature_algorithm=p_signature_algorithm
  ), payload as (
    select public.mhidas_ticket_canonical_payload_v1('mhidas.url-proof.v9',jsonb_build_object(
      'authority_id',p_authority_id,'signer_key_id',p_signer_key_id,'signature_algorithm',p_signature_algorithm,'signer_key_hash',p_signer_key_hash,
      'channel_id',p_channel_id,'destination_url_hash',p_destination_url_hash,'destination_envelope_hash',p_destination_envelope_hash,'hostname',p_hostname,
      'validated_at_epoch_ms',floor(extract(epoch from p_validated_at)*1000)::bigint,'expires_at_epoch_ms',floor(extract(epoch from p_expires_at)*1000)::bigint,
      'last_health_checked_at_epoch_ms',floor(extract(epoch from p_last_health_checked_at)*1000)::bigint,'last_health_check_hash',p_last_health_check_hash,
      'validator_version',p_validator_version,'resolved_host_hash',p_resolved_host_hash,'resolved_ip_set_hash',p_resolved_ip_set_hash,
      'redirect_chain_validation_hash',p_redirect_chain_validation_hash,'manifest_hash',p_manifest_hash)) as canonical_payload
  )
  select coalesce((p_status='validated' and p_channel_id is not null and p_destination_url_hash~'^[0-9a-f]{64}$' and p_destination_envelope_hash~'^[0-9a-f]{64}$'
    and p_hostname is not null and public.mhidas_ticket_hostname_is_public_v2(p_hostname)
    and p_validated_at is not null and p_expires_at is not null and p_expires_at>now() and p_expires_at<=p_validated_at+interval '30 days'
    and p_last_health_checked_at is not null and p_last_health_checked_at<=now()+interval '5 minutes' and p_last_health_checked_at>=now()-interval '15 minutes'
    and p_last_health_check_hash~'^[0-9a-f]{64}$' and p_resolved_host_hash~'^[0-9a-f]{64}$' and p_resolved_ip_set_hash~'^[0-9a-f]{64}$'
    and p_redirect_chain_validation_hash~'^[0-9a-f]{64}$' and p_attestation_hash=public.mhidas_ticket_sha256_v1(p_detached_signature)
    and p_canonical_payload_hash=public.mhidas_ticket_sha256_v1(payload.canonical_payload)
    and exists (select 1 from authority a where public.mhidas_verify_detached_signature_with_key_hash_v1(a.signer_key_id,a.signature_algorithm,a.signer_key_hash,a.signer_key_hash,payload.canonical_payload,p_detached_signature) is true)),false)
  from payload;
$mhidas_sql$;

create function public.mhidas_ticket_official_source_proof_is_fresh_v2(
  p_canonical_event_id uuid,p_source_url text,p_source_url_hash text,p_source_hostname text,p_authority_manifest_hash text,
  p_canonical_payload_hash text,p_detached_signature text,p_attestation_signature_hash text,p_signer_key_hash_snapshot text,
  p_signer_key_id_snapshot text,p_signature_algorithm_snapshot text,p_validator_version integer,p_commercial_policy_status text,
  p_validated_at timestamptz,p_expires_at timestamptz,p_authority_id uuid
)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $mhidas_sql$
  with authority as (
    select a.* from public.event_ticket_url_validation_authorities a where a.url_validation_authority_id=p_authority_id and a.authority_status='active'
      and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now()) and a.signer_key_hash=p_signer_key_hash_snapshot
      and a.signer_key_id=p_signer_key_id_snapshot and a.signature_algorithm=p_signature_algorithm_snapshot
  ), payload as (
    select public.mhidas_ticket_canonical_payload_v1('mhidas.official-source.v2',jsonb_build_object(
      'authority_id',p_authority_id,'signer_key_id',p_signer_key_id_snapshot,'signature_algorithm',p_signature_algorithm_snapshot,
      'signer_key_hash',p_signer_key_hash_snapshot,'canonical_event_id',p_canonical_event_id,'source_url_hash',p_source_url_hash,
      'source_hostname',p_source_hostname,'authority_manifest_hash',p_authority_manifest_hash,'validator_version',p_validator_version,
      'commercial_policy_status',p_commercial_policy_status,'validated_at_epoch_ms',floor(extract(epoch from p_validated_at)*1000)::bigint,
      'expires_at_epoch_ms',floor(extract(epoch from p_expires_at)*1000)::bigint)) as canonical_payload
  )
  select coalesce((p_source_url~'^https://' and p_source_url_hash=public.mhidas_ticket_sha256_v1(p_source_url)
    and p_source_hostname=public.mhidas_ticket_extract_hostname_v2(p_source_url) and public.mhidas_ticket_hostname_is_public_v2(p_source_hostname)
    and p_commercial_policy_status in ('official_noncommercial','commercial_authorized') and p_validated_at<=now() and p_expires_at>now()
    and p_expires_at<=p_validated_at+interval '30 days' and p_attestation_signature_hash=public.mhidas_ticket_sha256_v1(p_detached_signature)
    and p_canonical_payload_hash=public.mhidas_ticket_sha256_v1(payload.canonical_payload)
    and exists (select 1 from authority a where public.mhidas_verify_detached_signature_with_key_hash_v1(a.signer_key_id,a.signature_algorithm,a.signer_key_hash,a.signer_key_hash,payload.canonical_payload,p_detached_signature) is true)),false)
  from payload;
$mhidas_sql$;

create function public.mhidas_resolve_public_event_ticket_action_v10(p_canonical_event_id uuid)
returns table (action_kind text,action_label text,channel_id uuid,redirect_token text,official_reference_url text)
language sql stable security definer set search_path = public, pg_temp
as $mhidas_sql$
  select case when c.channel_id is not null then 'authorized_commercial_channel' when s.source_url is not null then 'official_reference' else 'pending_authorization' end,
    case when c.channel_id is not null then 'Comprar ingresso' when s.source_url is not null then 'Ver evento oficial' else 'Canal de vendas a confirmar' end,
    c.channel_id,case when c.channel_id is not null then c.public_redirect_token::text else null end,case when c.channel_id is null then s.source_url else null end
  from (select p_canonical_event_id as canonical_event_id) e
  left join lateral (
    select ch.channel_id,ch.public_redirect_token
    from public.event_ticket_commercial_channels ch
    join public.event_ticket_partnership_requests r on r.request_id=ch.request_id and r.canonical_event_id=ch.canonical_event_id and r.partner_id=ch.partner_id and r.request_status='approved' and r.reviewed_by_admin_user_id is not null and r.reviewed_at is not null
    join public.commercial_partners p on p.partner_id=ch.partner_id and p.partner_status='verified'
    join public.event_ticket_trusted_integrations i on i.integration_id=ch.integration_id and i.partner_id=ch.partner_id and i.integration_status='active' and i.current_credential_version_id is not null and i.issuer_service_key_hash is not null
    join public.event_ticket_trusted_integration_credential_versions cv on cv.integration_id=i.integration_id and cv.credential_version_id=i.current_credential_version_id and cv.credential_status='active' and cv.valid_from<=now() and (cv.valid_until is null or cv.valid_until>now())
    join public.event_ticket_trusted_integration_channels sc on sc.integration_channel_id=ch.integration_channel_id and sc.integration_id=i.integration_id and sc.canonical_event_id=ch.canonical_event_id and sc.channel_scope='url_validation' and sc.scope_status='active' and (sc.valid_from is null or sc.valid_from<=now()) and (sc.valid_until is null or sc.valid_until>now())
    where ch.canonical_event_id=e.canonical_event_id and ch.channel_status='active' and ch.authorization_receipt_id is not null and ch.financial_terms_hash is not null and ch.lifecycle_snapshot_hash is not null and ch.authorized_scope_snapshot_hash is not null
      and public.mhidas_ticket_verify_commercial_destination_envelope_v2(ch.destination_url_ciphertext,ch.destination_envelope_key_id,ch.destination_envelope_mac,ch.destination_envelope_hash,ch.destination_url_hash,ch.destination_hostname)
      and public.mhidas_ticket_url_proof_is_fresh_v9(ch.channel_id,ch.destination_url_hash,ch.destination_envelope_hash,ch.url_validation_status,ch.destination_hostname,ch.url_validated_at,ch.url_validation_expires_at,ch.last_health_checked_at,ch.last_health_check_hash,ch.url_validator_version,ch.resolved_host_hash,ch.resolved_ip_set_hash,ch.redirect_chain_validation_hash,ch.url_proof_attestation_hash,ch.url_proof_manifest_hash,ch.url_proof_canonical_payload_hash,ch.url_proof_signature,ch.url_proof_signer_key_hash,ch.url_proof_signer_key_id,ch.url_proof_signature_algorithm,ch.url_validation_authority_id)
      and ch.valid_from<=now() and (ch.valid_until is null or ch.valid_until>now()) order by ch.activated_at desc limit 1
  ) c on true
  left join lateral (
    select ces.source_url
    from public.canonical_event_sources ces
    join public.event_ticket_official_source_attestations a on a.canonical_event_id=ces.canonical_event_id and a.source_url=ces.source_url
    where ces.canonical_event_id=e.canonical_event_id and ces.source_url ~ '^https://' and ces.last_seen_at>=now()-interval '30 days'
      and public.mhidas_ticket_official_source_proof_is_fresh_v2(
        a.canonical_event_id,a.source_url,a.source_url_hash,a.source_hostname,a.authority_manifest_hash,
        a.canonical_payload_hash,a.attestation_signature,a.attestation_signature_hash,a.signer_key_hash_snapshot,
        a.signer_key_id_snapshot,a.signature_algorithm_snapshot,a.validator_version,a.commercial_policy_status,
        a.validated_at,a.expires_at,a.url_validation_authority_id
      )
    order by a.validated_at desc limit 1
  ) s on true;
$mhidas_sql$;

alter table public.commercial_partners enable row level security;
alter table public.commercial_partner_representatives enable row level security;
alter table public.event_ticket_trusted_integrations enable row level security;
alter table public.event_ticket_trusted_integration_credential_versions enable row level security;
alter table public.event_ticket_trusted_integration_channels enable row level security;
alter table public.event_ticket_partnership_requests enable row level security;
alter table public.event_ticket_retention_policy_bootstrap_receipts enable row level security;
alter table public.event_ticket_retention_policy_versions enable row level security;
alter table public.event_ticket_retention_minimization_rules enable row level security;
alter table public.event_ticket_url_validation_authorities enable row level security;
alter table public.event_ticket_official_source_attestations enable row level security;
alter table public.event_ticket_commercial_channels enable row level security;
alter table public.event_ticket_operation_result_contracts enable row level security;
alter table public.event_ticket_operation_receipts enable row level security;
alter table public.event_ticket_verified_credential_contexts enable row level security;
alter table public.event_ticket_click_attributions enable row level security;
alter table public.event_ticket_purchase_signals enable row level security;
alter table public.partner_official_communications enable row level security;
alter table public.event_ticket_retention_runs enable row level security;
alter table public.event_ticket_commercial_audit_log enable row level security;
alter table public.event_ticket_backfill_rejections enable row level security;
alter table public.event_ticket_legacy_cutover_checkpoints enable row level security;
alter table public.event_ticket_legacy_backfill_items enable row level security;
alter table public.event_ticket_legacy_backfill_runs enable row level security;
alter table public.event_ticket_retention_executor_contracts enable row level security;

create policy commercial_partners_admin_read_v4120 on public.commercial_partners for select to authenticated using (public.mhidas_is_useclubbers_admin_v1(auth.uid()));
create policy event_ticket_channels_admin_read_v4120 on public.event_ticket_commercial_channels for select to authenticated using (public.mhidas_is_useclubbers_admin_v1(auth.uid()));
create policy event_ticket_requests_owner_or_admin_read_v4120 on public.event_ticket_partnership_requests for select to authenticated using (submitted_by_user_id=auth.uid() or public.mhidas_is_useclubbers_admin_v1(auth.uid()));
create policy event_ticket_signals_admin_read_v4120 on public.event_ticket_purchase_signals for select to authenticated using (public.mhidas_is_useclubbers_admin_v1(auth.uid()));
create policy event_ticket_audit_admin_read_v4120 on public.event_ticket_commercial_audit_log for select to authenticated using (public.mhidas_is_useclubbers_admin_v1(auth.uid()));

revoke all on table public.commercial_partners,public.commercial_partner_representatives,public.event_ticket_trusted_integrations,public.event_ticket_trusted_integration_credential_versions,public.event_ticket_trusted_integration_channels,public.event_ticket_partnership_requests,public.event_ticket_retention_policy_bootstrap_receipts,public.event_ticket_retention_policy_versions,public.event_ticket_retention_minimization_rules,public.event_ticket_url_validation_authorities,public.event_ticket_official_source_attestations,public.event_ticket_commercial_channels,public.event_ticket_operation_result_contracts,public.event_ticket_operation_receipts,public.event_ticket_verified_credential_contexts,public.event_ticket_click_attributions,public.event_ticket_purchase_signals,public.partner_official_communications,public.event_ticket_retention_runs,public.event_ticket_commercial_audit_log,public.event_ticket_backfill_rejections,public.event_ticket_retention_executor_contracts,public.event_ticket_legacy_backfill_runs,public.event_ticket_legacy_backfill_items,public.event_ticket_legacy_cutover_checkpoints from PUBLIC,anon,authenticated,service_role;

revoke all on function public.mhidas_ticket_sha256_v1(text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_hmac_sha256_v1(text,text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_canonical_payload_v1(text,jsonb) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_deterministic_uuid_v1(text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_json_matches_contract_v4(text,jsonb,integer) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_extract_hostname_v2(text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_hostname_is_public_v2(text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_resolve_active_retention_policy_v2(text,text,text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_lock_current_credential_v4(uuid,uuid) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_assert_current_credential_invariant_v2() from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_assert_retention_execution_contract_v2(uuid,text,integer) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_reserve_operation_receipt_v10(text,text,uuid,text,uuid,uuid,text,text,text,uuid,integer,text,text,uuid) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_complete_operation_receipt_v6(uuid,text,integer,text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_fail_operation_receipt_v6(uuid,text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_issue_verified_credential_context_v8(uuid,uuid,text,text,text,text,text,text,text,text,timestamptz,text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_consume_verified_credential_context_v8(uuid,text,text,text,text,uuid,uuid,uuid,uuid) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_record_event_ticket_purchase_signal_v13(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,uuid,text,text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_run_event_ticket_governance_retention_batch_v9(integer,text,text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_admin_mutate_commercial_partner_status_v6(uuid,text,integer,text,text,text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_admin_rotate_event_ticket_integration_credential_v2(uuid,uuid,text,integer,text,text,text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_admin_retire_event_ticket_retention_policy_v7(uuid,uuid,integer,text,text,text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_admin_authorize_activate_commercial_channel_v4(uuid,integer,text,text,text,text,text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_url_proof_is_fresh_v9(uuid,text,text,text,text,timestamptz,timestamptz,timestamptz,text,integer,text,text,text,text,text,text,text,text,text,text,uuid) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_official_source_proof_is_fresh_v2(uuid,text,text,text,text,text,text,text,text,text,text,integer,text,timestamptz,timestamptz,uuid) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_resolve_public_event_ticket_action_v10(uuid) from PUBLIC,anon,authenticated,service_role;

revoke all on function public.mhidas_ticket_signal_family_lock_key_v1(uuid,uuid) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_try_uuid_v1(text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_required_scope_for_signal_v1(text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_purchase_signal_request_hash_v1(uuid,uuid,uuid,uuid,uuid,text,text,text,text,jsonb,uuid,uuid) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_verify_commercial_destination_envelope_v2(text,text,text,text,text,text) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_ticket_operation_receipt_matches_semantics_v1(public.event_ticket_operation_receipts,text,text,uuid,text,uuid,uuid,text,text,text,uuid,integer,text,uuid) from PUBLIC,anon,authenticated,service_role;
revoke all on function public.mhidas_admin_prepare_event_ticket_legacy_backfill_v2(text,text) from PUBLIC,anon,authenticated,service_role;

do $mhidas_function_acl_reset$
declare v_proc record; v_role record;
begin
  if exists (select 1 from public.event_ticket_commercial_channels c where c.channel_status='active' and public.mhidas_ticket_verify_commercial_destination_envelope_v2(c.destination_url_ciphertext,c.destination_envelope_key_id,c.destination_envelope_mac,c.destination_envelope_hash,c.destination_url_hash,c.destination_hostname) is distinct from true) then raise exception 'V4_8_120_ACTIVE_CHANNEL_ENVELOPE_DRIFT'; end if;
  for v_proc in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and (p.proname like 'mhidas_ticket_%' or p.proname like 'mhidas_record_event_ticket_%' or p.proname like 'mhidas_admin_%' or p.proname like 'mhidas_resolve_public_event_ticket_%')
  loop
    execute format('revoke execute on function %s from PUBLIC',v_proc.signature);
    for v_role in select rolname from pg_roles where rolcanlogin loop
      execute format('revoke execute on function %s from %I',v_proc.signature,v_role.rolname);
    end loop;
  end loop;
end;
$mhidas_function_acl_reset$;

grant select on table public.commercial_partners,public.event_ticket_commercial_channels,public.event_ticket_partnership_requests,public.event_ticket_purchase_signals,public.event_ticket_commercial_audit_log to authenticated;
grant execute on function public.mhidas_ticket_issue_verified_credential_context_v8(uuid,uuid,text,text,text,text,text,text,text,text,timestamptz,text) to service_role;
grant execute on function public.mhidas_record_event_ticket_purchase_signal_v13(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,uuid,text,text) to service_role;
grant execute on function public.mhidas_run_event_ticket_governance_retention_batch_v9(integer,text,text) to service_role;
grant execute on function public.mhidas_admin_mutate_commercial_partner_status_v6(uuid,text,integer,text,text,text) to authenticated;
grant execute on function public.mhidas_admin_rotate_event_ticket_integration_credential_v2(uuid,uuid,text,integer,text,text,text) to authenticated;
grant execute on function public.mhidas_admin_retire_event_ticket_retention_policy_v7(uuid,uuid,integer,text,text,text) to authenticated;
grant execute on function public.mhidas_admin_authorize_activate_commercial_channel_v4(uuid,integer,text,text,text,text,text) to authenticated;
grant execute on function public.mhidas_admin_prepare_event_ticket_legacy_backfill_v2(text,text) to authenticated;
grant execute on function public.mhidas_resolve_public_event_ticket_action_v10(uuid) to anon,authenticated;

-- =============================================================================
-- 13. ELEVENTH-CORRECTED STRUCTURAL SELF-CHECK
-- =============================================================================

do $mhidas_v4120_self_check$
declare v_count integer;
begin
  if to_regprocedure('public.mhidas_ticket_signal_family_lock_key_v1(uuid,uuid)') is null then raise exception 'V4_8_120_SIGNAL_FAMILY_LOCK_HELPER_MISSING'; end if;
  if to_regprocedure('public.mhidas_ticket_try_uuid_v1(text)') is null then raise exception 'V4_8_120_TRY_UUID_HELPER_MISSING'; end if;
  if exists (select 1 from public.event_ticket_verified_credential_contexts x join public.event_ticket_trusted_integration_credential_versions c on c.integration_id=x.integration_id and c.credential_version_id=x.credential_version_id where x.context_status='active' and x.credential_fingerprint_hash_snapshot<>c.credential_fingerprint_hash) then raise exception 'V4_8_120_CONTEXT_FINGERPRINT_DRIFT'; end if;

  select count(*) into v_count from public.event_ticket_retention_executor_contracts where contract_status='active';
  if v_count<>7 then raise exception 'V4_8_120_RETENTION_EXECUTOR_CONTRACT_COUNT_INVALID'; end if;
  if to_regclass('public.event_ticket_legacy_backfill_runs') is null or to_regclass('public.event_ticket_legacy_cutover_checkpoints') is null then raise exception 'V4_8_120_LEGACY_BACKFILL_CONTRACTS_MISSING'; end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a on true
    join pg_roles r on r.oid=a.grantee
    where n.nspname='public' and a.privilege_type='EXECUTE' and r.rolcanlogin
      and (p.proname like 'mhidas_ticket_%' or p.proname like 'mhidas_record_event_ticket_%' or p.proname like 'mhidas_admin_%' or p.proname like 'mhidas_resolve_public_event_ticket_%')
      and not (
        (r.rolname='service_role' and p.proname in ('mhidas_ticket_issue_verified_credential_context_v8','mhidas_record_event_ticket_purchase_signal_v13','mhidas_run_event_ticket_governance_retention_batch_v9'))
        or (r.rolname='authenticated' and p.proname in ('mhidas_admin_mutate_commercial_partner_status_v6','mhidas_admin_rotate_event_ticket_integration_credential_v2','mhidas_admin_retire_event_ticket_retention_policy_v7','mhidas_admin_authorize_activate_commercial_channel_v4','mhidas_admin_prepare_event_ticket_legacy_backfill_v2','mhidas_resolve_public_event_ticket_action_v10'))
        or (r.rolname='anon' and p.proname='mhidas_resolve_public_event_ticket_action_v10')
      )
  ) then raise exception 'V4_8_120_EFFECTIVE_FUNCTION_EXECUTE_ALLOWLIST_DRIFT'; end if;
  select count(*) into v_count from public.event_ticket_retention_policy_versions where policy_key like '%_br_template';
  if v_count<>7 then raise exception 'V4_8_120_RETENTION_POLICY_TEMPLATE_COUNT_INVALID'; end if;
  select count(*) into v_count from public.event_ticket_retention_policy_versions where policy_key like '%_br_template' and policy_status='active' and bootstrap_receipt_id='00000000-0000-4120-8000-000000000000'::uuid;
  if v_count<>7 then raise exception 'V4_8_120_RETENTION_POLICY_BOOTSTRAP_ACTIVE_COUNT_INVALID'; end if;
  select count(*) into v_count from public.event_ticket_retention_minimization_rules where rule_status='active';
  if v_count<>44 then raise exception 'V4_8_120_MINIMIZATION_RULE_COUNT_INVALID'; end if;
  select count(*) into v_count from public.event_ticket_operation_result_contracts where contract_status='active';
  if v_count<>9 then raise exception 'V4_8_120_RESULT_CONTRACT_COUNT_INVALID'; end if;
  if (select provolatile from pg_proc where oid='public.mhidas_ticket_resolve_active_retention_policy_v2(text,text,text)'::regprocedure)<>'v' then raise exception 'V4_8_120_RETENTION_RESOLVER_NOT_VOLATILE'; end if;
  if not exists (select 1 from pg_trigger where tgname='event_ticket_integrations_current_credential_v4120_ct' and tgdeferrable) then raise exception 'V4_8_120_INTEGRATION_CONSTRAINT_TRIGGER_MISSING'; end if;
  if exists (select 1 from public.event_ticket_trusted_integrations i where i.integration_status='active' and (i.current_credential_version_id is null or i.issuer_service_key_hash is null)) then raise exception 'V4_8_120_ACTIVE_INTEGRATION_AUTHORITY_DRIFT'; end if;
  if exists (select integration_id from public.event_ticket_trusted_integration_credential_versions where credential_status='active' group by integration_id having count(*)>1) then raise exception 'V4_8_120_MULTIPLE_ACTIVE_CREDENTIALS'; end if;
  if exists (select 1 from public.event_ticket_commercial_channels c where c.channel_status='active' and (c.authorization_receipt_id is null or c.financial_terms_hash is null or c.lifecycle_snapshot_hash is null or c.authorized_scope_snapshot_hash is null or c.url_validation_authority_id is null or c.url_proof_signature is null or c.destination_url_ciphertext is null or c.valid_from is null)) then raise exception 'V4_8_120_ACTIVE_CHANNEL_AUTHORITY_DRIFT'; end if;
  if exists (select 1 from public.event_ticket_purchase_signals s where s.external_transaction_hash is not null and s.transaction_family_id is null) then raise exception 'V4_8_120_SIGNAL_FAMILY_ID_DRIFT'; end if;
  if exists (select 1 from public.event_ticket_operation_receipts r where r.receipt_status='completed' and not exists (select 1 from public.event_ticket_operation_result_contracts c where c.operation_name=r.operation_name and c.result_status=r.result_status and c.contract_status='active' and r.result_version>=c.minimum_result_version and (c.maximum_result_version is null or r.result_version<=c.maximum_result_version))) then raise exception 'V4_8_120_RECEIPT_RESULT_CONTRACT_DRIFT'; end if;
  if exists (
    select 1 from public.event_ticket_retention_policy_versions p
    left join public.event_ticket_retention_policy_versions s on s.retention_policy_version_id=p.superseded_by_policy_version_id
    where p.policy_status='retired' and (s.retention_policy_version_id is null or s.policy_status<>'active'
      or s.policy_purpose<>p.policy_purpose or s.jurisdiction_code<>p.jurisdiction_code or s.evidence_class<>p.evidence_class)
  ) then raise exception 'V4_8_120_RETIRED_POLICY_SUCCESSOR_DRIFT'; end if;
  if exists (
    select 1
    from unnest(array[
      'commercial_partners','commercial_partner_representatives','event_ticket_trusted_integrations',
      'event_ticket_trusted_integration_credential_versions','event_ticket_trusted_integration_channels',
      'event_ticket_partnership_requests','event_ticket_retention_policy_bootstrap_receipts','event_ticket_retention_policy_versions',
      'event_ticket_retention_minimization_rules','event_ticket_url_validation_authorities',
      'event_ticket_official_source_attestations','event_ticket_commercial_channels',
      'event_ticket_operation_result_contracts','event_ticket_operation_receipts',
      'event_ticket_verified_credential_contexts','event_ticket_click_attributions',
      'event_ticket_purchase_signals','partner_official_communications','event_ticket_retention_runs',
      'event_ticket_commercial_audit_log','event_ticket_backfill_rejections','event_ticket_retention_executor_contracts',
      'event_ticket_legacy_backfill_runs','event_ticket_legacy_backfill_items','event_ticket_legacy_cutover_checkpoints'
    ]) as t(table_name)
    where has_table_privilege('service_role','public.'||t.table_name,'INSERT')
       or has_table_privilege('service_role','public.'||t.table_name,'UPDATE')
       or has_table_privilege('service_role','public.'||t.table_name,'DELETE')
       or has_table_privilege('service_role','public.'||t.table_name,'TRUNCATE')
  ) then raise exception 'V4_8_120_SERVICE_ROLE_EFFECTIVE_DML_GRANT_DRIFT'; end if;
  select count(*) into v_count from information_schema.role_table_grants where grantee='authenticated' and privilege_type='SELECT' and table_schema='public' and table_name in ('commercial_partners','event_ticket_commercial_channels','event_ticket_partnership_requests','event_ticket_purchase_signals','event_ticket_commercial_audit_log');
  if v_count<>5 then raise exception 'V4_8_120_RLS_SELECT_GRANT_COUNT_INVALID'; end if;
  if position('destination_url_ciphertext' in pg_get_function_result('public.mhidas_resolve_public_event_ticket_action_v10(uuid)'::regprocedure))>0 then raise exception 'V4_8_120_PUBLIC_RESOLVER_EXPOSES_CIPHERTEXT'; end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and has_function_privilege('service_role',p.oid,'EXECUTE')
      and (p.proname like 'mhidas_ticket_%' or p.proname like 'mhidas_record_event_ticket_%' or p.proname like 'mhidas_admin_%' or p.proname like 'mhidas_resolve_public_event_ticket_%')
      and p.oid not in (
        'public.mhidas_ticket_issue_verified_credential_context_v8(uuid,uuid,text,text,text,text,text,text,text,text,timestamptz,text)'::regprocedure,
        'public.mhidas_record_event_ticket_purchase_signal_v13(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,uuid,text,text)'::regprocedure,
        'public.mhidas_run_event_ticket_governance_retention_batch_v9(integer,text,text)'::regprocedure
      )
  ) then raise exception 'V4_8_120_SERVICE_ROLE_PRIVILEGED_ROUTINE_ALLOWLIST_DRIFT'; end if;
end;
$mhidas_v4120_self_check$;

-- =============================================================================
-- 14. EXECUTABLE MIGRATION DECISION
-- =============================================================================

-- parsed_postgres_statement_count=149
-- migration_decision=executable_migration_created_and_isolated_validated
-- corrected_adjustments=10
-- critical_corrections=6
-- high_corrections=4
-- legacy_backfill_fk_order_closed=True
-- pretable_rowtype_forward_reference_closed=True
-- signal_family_retention_concurrency_atomic=True
-- authority_signatures_key_hash_aware=True
-- credential_context_full_idempotency_bound=True
-- credential_context_fingerprint_consumption_bound=True
-- commercial_envelope_hash_verified_and_signed=True
-- retention_global_work_budget_closed=True
-- legacy_backfill_pipeline_materialized=True
-- channel_found_lock_order_closed=True
-- active_retention_policies=7
-- minimization_rules_materialized=44
-- result_contracts_materialized=9
-- retention_executor_contracts_materialized=7
-- runtime_defect_credential_context_request_hash_circularity_closed=True
-- runtime_defect_retention_executor_rule_count_contract_closed=True
-- runtime_defect_retention_checkpoint_object_cardinality_closed=True
-- runtime_defect_contract_json_hash_suffix_escape_closed=True
-- promotion_allowed=staging_only
-- executable_migration_created=True
-- sql_moved_to_supabase_migrations=True
-- supabase_operation_performed=False
-- database_write_performed=False
-- commercial_channel_activated=False
-- public_event_page_changed=False
-- v4_8_118_twelfth_corrected_sql_changed=False
-- new_structural_review_required=False
-- external_prerequisites_open=False

commit;
