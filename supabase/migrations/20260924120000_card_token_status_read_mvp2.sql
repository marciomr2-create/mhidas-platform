-- supabase/migrations/20260924120000_card_token_status_read_mvp2.sql
-- MHIDAS / USECLUBBERS
-- MVP2 - QR/NFC authenticated lifecycle status read foundation.
--
-- Purpose:
-- - expose only safe lifecycle state for the authenticated card owner;
-- - return Clubber and Professional NFC states independently;
-- - never expose raw token material or token_hash;
-- - keep direct card_tokens table access prohibited.

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
    raise exception 'NFC_STATUS_READ_CARDS_MISSING';
  end if;

  if to_regclass('public.card_tokens') is null then
    raise exception 'NFC_STATUS_READ_CARD_TOKENS_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'card_tokens'
      and column_name = 'profile_mode'
  ) then
    raise exception 'NFC_STATUS_READ_PROFILE_MODE_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_read_card_token_status_v1(uuid)'
  ) is not null then
    raise exception 'NFC_STATUS_READ_TARGET_ALREADY_EXISTS';
  end if;
end
$preflight$;

-- =========================================================
-- 1. AUTHENTICATED OWNER STATUS READ
-- =========================================================

create function public.mhidas_read_card_token_status_v1(
  p_card_id uuid
)
returns table (
  profile_mode text,
  active boolean,
  created_at timestamptz,
  rotated_at timestamptz,
  revoked_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
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

  return query
  with modes(profile_mode) as (
    values
      ('clubber'::text),
      ('professional'::text)
  )
  select
    m.profile_mode,
    coalesce(
      ct.active is true
      and ct.revoked_at is null,
      false
    ) as active,
    ct.created_at,
    ct.rotated_at,
    ct.revoked_at
  from modes m
  left join lateral (
    select
      t.active,
      t.created_at,
      t.rotated_at,
      t.revoked_at
    from public.card_tokens t
    where t.card_id = p_card_id
      and t.profile_mode = m.profile_mode
    order by
      (
        t.active is true
        and t.revoked_at is null
      ) desc,
      t.created_at desc,
      t.token_id desc
    limit 1
  ) ct on true
  order by
    case m.profile_mode
      when 'clubber' then 1
      when 'professional' then 2
      else 3
    end;
end;
$function$;

comment on function public.mhidas_read_card_token_status_v1(uuid) is
  'Returns safe Clubber and Professional NFC lifecycle status for the authenticated card owner without exposing token material or hashes.';

-- =========================================================
-- 2. PRIVILEGES
-- =========================================================

revoke all
  on function public.mhidas_read_card_token_status_v1(uuid)
  from public, anon, authenticated;

grant execute
  on function public.mhidas_read_card_token_status_v1(uuid)
  to authenticated;

-- =========================================================
-- 3. POSTFLIGHT
-- =========================================================

do $postflight$
begin
  if to_regprocedure(
    'public.mhidas_read_card_token_status_v1(uuid)'
  ) is null then
    raise exception 'NFC_STATUS_READ_FUNCTION_MISSING';
  end if;

  if has_function_privilege(
    'anon',
    'public.mhidas_read_card_token_status_v1(uuid)',
    'EXECUTE'
  ) then
    raise exception 'NFC_STATUS_READ_ANON_EXECUTE_PRESENT';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.mhidas_read_card_token_status_v1(uuid)',
    'EXECUTE'
  ) then
    raise exception 'NFC_STATUS_READ_AUTH_EXECUTE_MISSING';
  end if;
end
$postflight$;

commit;