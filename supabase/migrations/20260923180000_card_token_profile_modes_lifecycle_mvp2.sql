-- supabase/migrations/20260923180000_card_token_profile_modes_lifecycle_mvp2.sql
-- MHIDAS / USECLUBBERS
-- MVP2 - QR/NFC physical-token lifecycle foundation.
--
-- Product model:
-- - one account/card may own one active Clubber NFC token;
-- - the same account/card may own one active Professional NFC token;
-- - both physical tokens are independent;
-- - raw NFC tokens are never persisted, only SHA-256 hashes;
-- - direct client access to card_tokens remains prohibited;
-- - controlled lifecycle happens through authenticated SECURITY DEFINER RPCs;
-- - public token resolution happens through a dedicated resolver;
-- - the existing legacy resolver is preserved for compatibility.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

-- =========================================================
-- 0. PREFLIGHT
-- =========================================================

do $preflight$
begin
  if to_regclass('public.cards') is null then
    raise exception 'NFC_FOUNDATION_CARDS_MISSING';
  end if;

  if to_regclass('public.card_tokens') is null then
    raise exception 'NFC_FOUNDATION_CARD_TOKENS_MISSING';
  end if;

  if to_regclass('public.audit_events') is null then
    raise exception 'NFC_FOUNDATION_AUDIT_EVENTS_MISSING';
  end if;

  if to_regprocedure('public.sha256_hex(text)') is null then
    raise exception 'NFC_FOUNDATION_SHA256_HELPER_MISSING';
  end if;

  if to_regprocedure('public.resolve_card_token(text)') is null then
    raise exception 'NFC_FOUNDATION_LEGACY_RESOLVER_MISSING';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'card_tokens'
      and column_name = 'profile_mode'
  ) then
    raise exception 'NFC_FOUNDATION_PROFILE_MODE_ALREADY_EXISTS';
  end if;

  if to_regprocedure(
    'public.mhidas_issue_card_token_v1(uuid,text,text)'
  ) is not null
    or to_regprocedure(
      'public.mhidas_revoke_card_token_v1(uuid,text)'
    ) is not null
    or to_regprocedure(
      'public.mhidas_rotate_card_token_v1(uuid,text,text)'
    ) is not null
    or to_regprocedure(
      'public.mhidas_resolve_card_token_v2(text)'
    ) is not null
  then
    raise exception 'NFC_FOUNDATION_TARGET_RPC_ALREADY_EXISTS';
  end if;
end
$preflight$;

-- =========================================================
-- 1. CLUBBER / PROFESSIONAL MODE
-- =========================================================

alter table public.card_tokens
  add column profile_mode text;

-- Legacy physical tokens had no mode distinction.
-- Their previous behavior maps to the Clubber identity.
update public.card_tokens
set profile_mode = 'clubber'
where profile_mode is null;

alter table public.card_tokens
  alter column profile_mode set not null;

alter table public.card_tokens
  add constraint card_tokens_profile_mode_check
  check (
    profile_mode in ('clubber', 'professional')
  );

comment on column public.card_tokens.profile_mode is
  'Physical NFC destination mode. clubber and professional belong to the same card but use independent tokens.';

-- Exactly one currently active physical token per card and profile mode.
create unique index card_tokens_one_active_mode_per_card_idx
  on public.card_tokens (card_id, profile_mode)
  where active is true
    and revoked_at is null;

-- =========================================================
-- 2. ISSUE TOKEN HASH
-- =========================================================

create function public.mhidas_issue_card_token_v1(
  p_card_id uuid,
  p_profile_mode text,
  p_token_hash text
)
returns table (
  token_id uuid,
  card_id uuid,
  profile_mode text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_mode text := lower(btrim(coalesce(p_profile_mode, '')));
  v_hash text := lower(btrim(coalesce(p_token_hash, '')));
  v_token_id uuid;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_auth_required';
  end if;

  if p_card_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_card_required';
  end if;

  if v_mode not in ('clubber', 'professional') then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_profile_mode_invalid';
  end if;

  if v_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_token_hash_invalid';
  end if;

  if not exists (
    select 1
    from public.cards c
    where c.card_id = p_card_id
      and c.user_id = v_user_id
      and c.status in ('issued', 'active')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_card_not_owned_or_inactive';
  end if;

  if exists (
    select 1
    from public.card_tokens ct
    where ct.card_id = p_card_id
      and ct.profile_mode = v_mode
      and ct.active is true
      and ct.revoked_at is null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_active_token_already_exists';
  end if;

  insert into public.card_tokens (
    card_id,
    token_hash,
    active,
    profile_mode
  )
  values (
    p_card_id,
    v_hash,
    true,
    v_mode
  )
  returning public.card_tokens.token_id
  into v_token_id;

  insert into public.audit_events (
    event_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata,
    created_at
  )
  values (
    gen_random_uuid(),
    v_user_id,
    'card_token_issued',
    'card_token',
    v_token_id::text,
    jsonb_build_object(
      'card_id', p_card_id,
      'profile_mode', v_mode
    ),
    now()
  );

  return query
  select
    v_token_id,
    p_card_id,
    v_mode;
end;
$function$;

comment on function public.mhidas_issue_card_token_v1(uuid,text,text) is
  'Creates one active physical NFC token hash for the authenticated card owner. Raw token material is never persisted.';

-- =========================================================
-- 3. REVOKE
-- =========================================================

create function public.mhidas_revoke_card_token_v1(
  p_card_id uuid,
  p_profile_mode text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_mode text := lower(btrim(coalesce(p_profile_mode, '')));
  v_token_id uuid;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_auth_required';
  end if;

  if v_mode not in ('clubber', 'professional') then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_profile_mode_invalid';
  end if;

  if not exists (
    select 1
    from public.cards c
    where c.card_id = p_card_id
      and c.user_id = v_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_card_not_owned';
  end if;

  update public.card_tokens ct
  set
    active = false,
    revoked_at = coalesce(ct.revoked_at, now())
  where ct.card_id = p_card_id
    and ct.profile_mode = v_mode
    and ct.active is true
    and ct.revoked_at is null
  returning ct.token_id
  into v_token_id;

  if v_token_id is null then
    return false;
  end if;

  insert into public.audit_events (
    event_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata,
    created_at
  )
  values (
    gen_random_uuid(),
    v_user_id,
    'card_token_revoked',
    'card_token',
    v_token_id::text,
    jsonb_build_object(
      'card_id', p_card_id,
      'profile_mode', v_mode
    ),
    now()
  );

  return true;
end;
$function$;

comment on function public.mhidas_revoke_card_token_v1(uuid,text) is
  'Revokes the current active physical NFC token for one card/profile mode without affecting the other mode.';

-- =========================================================
-- 4. ROTATE / REPLACE LOST OR DAMAGED NFC
-- =========================================================

create function public.mhidas_rotate_card_token_v1(
  p_card_id uuid,
  p_profile_mode text,
  p_new_token_hash text
)
returns table (
  token_id uuid,
  card_id uuid,
  profile_mode text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_mode text := lower(btrim(coalesce(p_profile_mode, '')));
  v_hash text := lower(btrim(coalesce(p_new_token_hash, '')));
  v_previous_token_id uuid;
  v_new_token_id uuid;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_auth_required';
  end if;

  if v_mode not in ('clubber', 'professional') then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_profile_mode_invalid';
  end if;

  if v_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_token_hash_invalid';
  end if;

  if not exists (
    select 1
    from public.cards c
    where c.card_id = p_card_id
      and c.user_id = v_user_id
      and c.status in ('issued', 'active')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_card_not_owned_or_inactive';
  end if;

  update public.card_tokens ct
  set
    active = false,
    revoked_at = coalesce(ct.revoked_at, now()),
    rotated_at = now()
  where ct.card_id = p_card_id
    and ct.profile_mode = v_mode
    and ct.active is true
    and ct.revoked_at is null
  returning ct.token_id
  into v_previous_token_id;

  if v_previous_token_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_active_token_not_found';
  end if;

  insert into public.card_tokens (
    card_id,
    token_hash,
    active,
    profile_mode
  )
  values (
    p_card_id,
    v_hash,
    true,
    v_mode
  )
  returning public.card_tokens.token_id
  into v_new_token_id;

  insert into public.audit_events (
    event_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata,
    created_at
  )
  values (
    gen_random_uuid(),
    v_user_id,
    'card_token_rotated',
    'card_token',
    v_new_token_id::text,
    jsonb_build_object(
      'card_id', p_card_id,
      'profile_mode', v_mode,
      'previous_token_id', v_previous_token_id
    ),
    now()
  );

  return query
  select
    v_new_token_id,
    p_card_id,
    v_mode;
end;
$function$;

comment on function public.mhidas_rotate_card_token_v1(uuid,text,text) is
  'Atomically replaces the active physical NFC token for one card/profile mode while preserving revocation history.';

-- =========================================================
-- 5. PUBLIC TOKEN RESOLVER V2
-- =========================================================

create function public.mhidas_resolve_card_token_v2(
  p_token text
)
returns table (
  card_id uuid,
  user_id uuid,
  card_status public.card_status,
  token_id uuid,
  profile_mode text,
  slug text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_hash text;
begin
  if p_token is null
    or length(p_token) < 16
    or length(p_token) > 256
  then
    return;
  end if;

  v_hash := public.sha256_hex(p_token);

  return query
  select
    c.card_id,
    c.user_id,
    c.status,
    ct.token_id,
    ct.profile_mode,
    c.slug
  from public.card_tokens ct
  join public.cards c
    on c.card_id = ct.card_id
  where ct.token_hash = v_hash
    and ct.active is true
    and ct.revoked_at is null
    and c.status in ('issued', 'active')
    and c.is_published is true
    and c.slug is not null
  limit 1;
end;
$function$;

comment on function public.mhidas_resolve_card_token_v2(text) is
  'Resolves one active NFC raw token to its published card and Clubber/Professional destination without exposing stored hashes.';

-- =========================================================
-- 6. RLS / PRIVILEGES
-- =========================================================

alter table public.card_tokens
  enable row level security;

-- No direct browser access. Lifecycle is RPC-only.
revoke all
  on table public.card_tokens
  from public, anon, authenticated;

revoke all
  on function public.mhidas_issue_card_token_v1(uuid,text,text)
  from public, anon, authenticated;

revoke all
  on function public.mhidas_revoke_card_token_v1(uuid,text)
  from public, anon, authenticated;

revoke all
  on function public.mhidas_rotate_card_token_v1(uuid,text,text)
  from public, anon, authenticated;

revoke all
  on function public.mhidas_resolve_card_token_v2(text)
  from public, anon, authenticated;

grant execute
  on function public.mhidas_issue_card_token_v1(uuid,text,text)
  to authenticated;

grant execute
  on function public.mhidas_revoke_card_token_v1(uuid,text)
  to authenticated;

grant execute
  on function public.mhidas_rotate_card_token_v1(uuid,text,text)
  to authenticated;

grant execute
  on function public.mhidas_resolve_card_token_v2(text)
  to anon, authenticated, service_role;

-- =========================================================
-- 7. POSTFLIGHT
-- =========================================================

do $postflight$
declare
  v_rls_enabled boolean := false;
  v_direct_anon_privileges integer := 0;
  v_direct_authenticated_privileges integer := 0;
  v_manage_anon_execute integer := 0;
  v_manage_authenticated_missing integer := 0;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'card_tokens'
      and column_name = 'profile_mode'
      and is_nullable = 'NO'
  ) then
    raise exception 'NFC_FOUNDATION_PROFILE_MODE_COLUMN_INVALID';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c
      on c.oid = con.conrelid
    join pg_catalog.pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'card_tokens'
      and con.conname = 'card_tokens_profile_mode_check'
  ) then
    raise exception 'NFC_FOUNDATION_PROFILE_MODE_CHECK_MISSING';
  end if;

  if to_regclass(
    'public.card_tokens_one_active_mode_per_card_idx'
  ) is null then
    raise exception 'NFC_FOUNDATION_ACTIVE_MODE_INDEX_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_issue_card_token_v1(uuid,text,text)'
  ) is null
    or to_regprocedure(
      'public.mhidas_revoke_card_token_v1(uuid,text)'
    ) is null
    or to_regprocedure(
      'public.mhidas_rotate_card_token_v1(uuid,text,text)'
    ) is null
    or to_regprocedure(
      'public.mhidas_resolve_card_token_v2(text)'
    ) is null
  then
    raise exception 'NFC_FOUNDATION_RPC_SET_INCOMPLETE';
  end if;

  select c.relrowsecurity
  into v_rls_enabled
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n
    on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'card_tokens';

  if not coalesce(v_rls_enabled, false) then
    raise exception 'NFC_FOUNDATION_RLS_MISSING';
  end if;

  select count(*)
  into v_direct_anon_privileges
  from (
    values
      ('SELECT'),
      ('INSERT'),
      ('UPDATE'),
      ('DELETE')
  ) as privilege(privilege_type)
  where has_table_privilege(
    'anon',
    'public.card_tokens',
    privilege.privilege_type
  );

  if v_direct_anon_privileges <> 0 then
    raise exception 'NFC_FOUNDATION_ANON_TABLE_ACCESS_PRESENT';
  end if;

  select count(*)
  into v_direct_authenticated_privileges
  from (
    values
      ('SELECT'),
      ('INSERT'),
      ('UPDATE'),
      ('DELETE')
  ) as privilege(privilege_type)
  where has_table_privilege(
    'authenticated',
    'public.card_tokens',
    privilege.privilege_type
  );

  if v_direct_authenticated_privileges <> 0 then
    raise exception 'NFC_FOUNDATION_AUTH_TABLE_ACCESS_PRESENT';
  end if;

  select count(*)
  into v_manage_anon_execute
  from (
    values
      ('public.mhidas_issue_card_token_v1(uuid,text,text)'),
      ('public.mhidas_revoke_card_token_v1(uuid,text)'),
      ('public.mhidas_rotate_card_token_v1(uuid,text,text)')
  ) as expected(signature)
  where has_function_privilege(
    'anon',
    expected.signature,
    'EXECUTE'
  );

  if v_manage_anon_execute <> 0 then
    raise exception 'NFC_FOUNDATION_ANON_MANAGE_EXECUTE_PRESENT';
  end if;

  select count(*)
  into v_manage_authenticated_missing
  from (
    values
      ('public.mhidas_issue_card_token_v1(uuid,text,text)'),
      ('public.mhidas_revoke_card_token_v1(uuid,text)'),
      ('public.mhidas_rotate_card_token_v1(uuid,text,text)')
  ) as expected(signature)
  where not has_function_privilege(
    'authenticated',
    expected.signature,
    'EXECUTE'
  );

  if v_manage_authenticated_missing <> 0 then
    raise exception 'NFC_FOUNDATION_AUTH_MANAGE_EXECUTE_MISSING';
  end if;

  if not has_function_privilege(
    'anon',
    'public.mhidas_resolve_card_token_v2(text)',
    'EXECUTE'
  ) then
    raise exception 'NFC_FOUNDATION_ANON_RESOLVER_EXECUTE_MISSING';
  end if;

  if has_function_privilege(
    'anon',
    'public.mhidas_issue_card_token_v1(uuid,text,text)',
    'EXECUTE'
  ) then
    raise exception 'NFC_FOUNDATION_ANON_ISSUE_EXECUTE_PRESENT';
  end if;
end
$postflight$;

commit;