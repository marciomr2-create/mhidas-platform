-- MHIDAS/USECLUBBERS
-- Recovery migration: restores ONLY the public Clubber onboarding RPC layer.
-- Scope intentionally excludes ticket-security migrations and other unrelated drift.
-- Designed for controlled application after production backup/preflight approval.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

do $mhidas_clubber_onboarding_recovery_preflight$
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.club_profiles') is null
     or to_regclass('public.cards') is null
     or to_regclass('public.card_slug_history') is null then
    raise exception 'MHIDAS_CLUBBER_ONBOARDING_RECOVERY_REQUIRED_TABLE_MISSING';
  end if;

  if to_regprocedure('public.normalize_public_username(text)') is not null
     or to_regprocedure('public.is_reserved_public_username(text)') is not null
     or to_regprocedure('public.check_public_username_availability(text)') is not null
     or to_regprocedure('public.create_public_clubber_identity(text,text,text,text)') is not null then
    raise exception 'MHIDAS_CLUBBER_ONBOARDING_RECOVERY_OBJECT_ALREADY_EXISTS';
  end if;

  if not exists (
    select 1
    from pg_indexes i
    where i.schemaname = 'public'
      and i.tablename = 'cards'
      and i.indexdef ilike 'create unique index%'
      and i.indexdef ilike '%lower(slug)%'
  ) then
    raise exception 'MHIDAS_CLUBBER_ONBOARDING_RECOVERY_CARDS_SLUG_UNIQUENESS_MISSING';
  end if;

  if not exists (
    select 1
    from pg_indexes i
    where i.schemaname = 'public'
      and i.tablename = 'card_slug_history'
      and i.indexdef ilike 'create unique index%'
      and i.indexdef ilike '%lower(slug)%'
  ) then
    raise exception 'MHIDAS_CLUBBER_ONBOARDING_RECOVERY_HISTORY_SLUG_UNIQUENESS_MISSING';
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n
      on n.oid = t.typnamespace
    join pg_enum e
      on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'card_status'
      and e.enumlabel = 'active'
  ) then
    raise exception 'MHIDAS_CLUBBER_ONBOARDING_RECOVERY_ACTIVE_STATUS_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_schema = tc.constraint_schema
     and kcu.constraint_name = tc.constraint_name
     and kcu.table_name = tc.table_name
    where tc.table_schema = 'public'
      and tc.table_name = 'profiles'
      and kcu.column_name = 'user_id'
      and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE')
  ) then
    raise exception 'MHIDAS_CLUBBER_ONBOARDING_RECOVERY_PROFILES_USER_ID_UNIQUE_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_schema = tc.constraint_schema
     and kcu.constraint_name = tc.constraint_name
     and kcu.table_name = tc.table_name
    where tc.table_schema = 'public'
      and tc.table_name = 'club_profiles'
      and kcu.column_name = 'user_id'
      and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE')
  ) then
    raise exception 'MHIDAS_CLUBBER_ONBOARDING_RECOVERY_CLUB_PROFILES_USER_ID_UNIQUE_MISSING';
  end if;
end;
$mhidas_clubber_onboarding_recovery_preflight$;

create function public.normalize_public_username(input_text text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select regexp_replace(
    regexp_replace(
      translate(
        lower(trim(coalesce(input_text, ''))),
        'áàãâäéèêëíìîïóòõôöúùûüçñ',
        'aaaaaeeeeiiiiooooouuuucn'
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    ),
    '(^-+|-+$)',
    '',
    'g'
  );
$$;

create function public.is_reserved_public_username(input_text text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select public.normalize_public_username(input_text) = any (
    array[
      'admin',
      'api',
      'auth',
      'callback',
      'clubbers',
      'connections',
      'dashboard',
      'event',
      'events',
      'invalid',
      'login',
      'logout',
      'me',
      'network',
      'onboarding',
      'privacy',
      'pro',
      'r',
      'settings',
      'signup',
      'support',
      't',
      'terms',
      'u'
    ]::text[]
  );
$$;

create function public.check_public_username_availability(
  p_username text
)
returns table(
  normalized_username text,
  available boolean,
  reason text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_username text;
begin
  v_user_id := auth.uid();
  v_username := public.normalize_public_username(p_username);

  if v_user_id is null then
    return query select v_username, false, 'not_authenticated'::text;
    return;
  end if;

  if char_length(v_username) < 3 then
    return query select v_username, false, 'too_short'::text;
    return;
  end if;

  if char_length(v_username) > 30 then
    return query select v_username, false, 'too_long'::text;
    return;
  end if;

  if public.is_reserved_public_username(v_username) then
    return query select v_username, false, 'reserved'::text;
    return;
  end if;

  if exists (
    select 1
    from public.cards c
    where lower(c.slug) = lower(v_username)
      and c.user_id is distinct from v_user_id
  ) then
    return query select v_username, false, 'already_used'::text;
    return;
  end if;

  if exists (
    select 1
    from public.card_slug_history h
    join public.cards c
      on c.card_id = h.card_id
    where lower(h.slug) = lower(v_username)
      and c.user_id is distinct from v_user_id
  ) then
    return query select v_username, false, 'held_by_history'::text;
    return;
  end if;

  return query select v_username, true, 'available'::text;
end;
$$;

create function public.create_public_clubber_identity(
  p_username text,
  p_display_name text,
  p_city_base text default null,
  p_avatar_url text default null
)
returns table(
  card_id uuid,
  slug text,
  created boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_username text;
  v_display_name text;
  v_city_base text;
  v_avatar_url text;
  v_existing_card_id uuid;
  v_existing_slug text;
  v_card_count integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  v_username := public.normalize_public_username(p_username);
  v_display_name := regexp_replace(trim(coalesce(p_display_name, '')), '\s+', ' ', 'g');
  v_city_base := nullif(regexp_replace(trim(coalesce(p_city_base, '')), '\s+', ' ', 'g'), '');
  v_avatar_url := nullif(trim(coalesce(p_avatar_url, '')), '');

  if char_length(v_username) < 3 then
    raise exception using errcode = 'P0001', message = 'username_too_short';
  end if;

  if char_length(v_username) > 30 then
    raise exception using errcode = 'P0001', message = 'username_too_long';
  end if;

  if public.is_reserved_public_username(v_username) then
    raise exception using errcode = 'P0001', message = 'username_reserved';
  end if;

  if char_length(v_display_name) < 2 then
    raise exception using errcode = 'P0001', message = 'display_name_too_short';
  end if;

  if char_length(v_display_name) > 80 then
    raise exception using errcode = 'P0001', message = 'display_name_too_long';
  end if;

  if v_city_base is not null and char_length(v_city_base) > 120 then
    raise exception using errcode = 'P0001', message = 'city_too_long';
  end if;

  if v_avatar_url is not null then
    if char_length(v_avatar_url) > 2048 or v_avatar_url !~* '^https?://' then
      v_avatar_url := null;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select count(*)
  into v_card_count
  from public.cards c
  where c.user_id = v_user_id;

  if v_card_count > 1 then
    raise exception using errcode = 'P0001', message = 'multiple_cards_require_manual_resolution';
  end if;

  if v_card_count = 1 then
    select c.card_id, c.slug
    into v_existing_card_id, v_existing_slug
    from public.cards c
    where c.user_id = v_user_id
    order by c.issued_at asc, c.card_id asc
    limit 1;

    if lower(v_existing_slug) <> lower(v_username) then
      raise exception using errcode = 'P0001', message = 'identity_already_exists';
    end if;

    insert into public.profiles (
      user_id,
      display_name,
      bio,
      avatar_url,
      is_public
    )
    values (
      v_user_id,
      v_display_name,
      '',
      coalesce(v_avatar_url, ''),
      true
    )
    on conflict (user_id) do update
    set
      display_name = excluded.display_name,
      avatar_url = case
        when excluded.avatar_url <> '' then excluded.avatar_url
        else profiles.avatar_url
      end,
      is_public = true,
      updated_at = now();

    insert into public.club_profiles (
      user_id,
      city_base
    )
    values (
      v_user_id,
      v_city_base
    )
    on conflict (user_id) do update
    set
      city_base = coalesce(excluded.city_base, club_profiles.city_base),
      updated_at = now();

    insert into public.card_slug_history (
      card_id,
      slug,
      is_current
    )
    select
      v_existing_card_id,
      v_existing_slug,
      true
    where not exists (
      select 1
      from public.card_slug_history h
      where h.card_id = v_existing_card_id
        and lower(h.slug) = lower(v_existing_slug)
    );

    return query select v_existing_card_id, v_existing_slug, false;
    return;
  end if;

  if exists (
    select 1
    from public.cards c
    where lower(c.slug) = lower(v_username)
  ) then
    raise exception using errcode = 'P0001', message = 'username_unavailable';
  end if;

  if exists (
    select 1
    from public.card_slug_history h
    where lower(h.slug) = lower(v_username)
  ) then
    raise exception using errcode = 'P0001', message = 'username_unavailable';
  end if;

  insert into public.profiles (
    user_id,
    display_name,
    bio,
    avatar_url,
    is_public
  )
  values (
    v_user_id,
    v_display_name,
    '',
    coalesce(v_avatar_url, ''),
    true
  )
  on conflict (user_id) do update
  set
    display_name = excluded.display_name,
    avatar_url = case
      when excluded.avatar_url <> '' then excluded.avatar_url
      else profiles.avatar_url
    end,
    is_public = true,
    updated_at = now();

  insert into public.club_profiles (
    user_id,
    city_base
  )
  values (
    v_user_id,
    v_city_base
  )
  on conflict (user_id) do update
  set
    city_base = coalesce(excluded.city_base, club_profiles.city_base),
    updated_at = now();

  insert into public.cards as inserted_card (
    user_id,
    status,
    label,
    claimed_at,
    slug,
    is_published,
    published_at
  )
  values (
    v_user_id,
    'active',
    v_display_name,
    now(),
    v_username,
    true,
    now()
  )
  returning inserted_card.card_id
  into v_existing_card_id;

  insert into public.card_slug_history (
    card_id,
    slug,
    is_current
  )
  values (
    v_existing_card_id,
    v_username,
    true
  );

  return query select v_existing_card_id, v_username, true;
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'username_unavailable';
end;
$$;

revoke all on function public.normalize_public_username(text) from public;
revoke all on function public.normalize_public_username(text) from anon;
revoke all on function public.normalize_public_username(text) from authenticated;
revoke all on function public.normalize_public_username(text) from service_role;

revoke all on function public.is_reserved_public_username(text) from public;
revoke all on function public.is_reserved_public_username(text) from anon;
revoke all on function public.is_reserved_public_username(text) from authenticated;
revoke all on function public.is_reserved_public_username(text) from service_role;

revoke all on function public.check_public_username_availability(text) from public;
revoke all on function public.check_public_username_availability(text) from anon;

revoke all on function public.create_public_clubber_identity(text, text, text, text) from public;
revoke all on function public.create_public_clubber_identity(text, text, text, text) from anon;

grant execute
on function public.check_public_username_availability(text)
to authenticated, service_role;

grant execute
on function public.create_public_clubber_identity(text, text, text, text)
to authenticated, service_role;

comment on function public.normalize_public_username(text)
is 'MHIDAS public Clubber onboarding recovery helper: normalizes public usernames.';

comment on function public.is_reserved_public_username(text)
is 'MHIDAS public Clubber onboarding recovery helper: rejects reserved public usernames.';

comment on function public.check_public_username_availability(text)
is 'MHIDAS public Clubber onboarding recovery RPC: validates username availability for authenticated users.';

comment on function public.create_public_clubber_identity(text, text, text, text)
is 'MHIDAS public Clubber onboarding recovery RPC: creates one public Clubber digital identity for the authenticated user without requiring an NFC token.';

do $mhidas_clubber_onboarding_recovery_postflight$
begin
  if to_regprocedure('public.normalize_public_username(text)') is null
     or to_regprocedure('public.is_reserved_public_username(text)') is null
     or to_regprocedure('public.check_public_username_availability(text)') is null
     or to_regprocedure('public.create_public_clubber_identity(text,text,text,text)') is null then
    raise exception 'MHIDAS_CLUBBER_ONBOARDING_RECOVERY_POSTFLIGHT_OBJECT_MISSING';
  end if;

  if has_function_privilege(
       'anon',
       'public.check_public_username_availability(text)',
       'EXECUTE'
     ) then
    raise exception 'MHIDAS_CLUBBER_ONBOARDING_RECOVERY_ANON_CHECK_EXECUTE_DRIFT';
  end if;

  if has_function_privilege(
       'anon',
       'public.create_public_clubber_identity(text,text,text,text)',
       'EXECUTE'
     ) then
    raise exception 'MHIDAS_CLUBBER_ONBOARDING_RECOVERY_ANON_CREATE_EXECUTE_DRIFT';
  end if;

  if not has_function_privilege(
       'authenticated',
       'public.check_public_username_availability(text)',
       'EXECUTE'
     ) then
    raise exception 'MHIDAS_CLUBBER_ONBOARDING_RECOVERY_AUTH_CHECK_EXECUTE_MISSING';
  end if;

  if not has_function_privilege(
       'authenticated',
       'public.create_public_clubber_identity(text,text,text,text)',
       'EXECUTE'
     ) then
    raise exception 'MHIDAS_CLUBBER_ONBOARDING_RECOVERY_AUTH_CREATE_EXECUTE_MISSING';
  end if;

  if not has_function_privilege(
       'service_role',
       'public.check_public_username_availability(text)',
       'EXECUTE'
     ) then
    raise exception 'MHIDAS_CLUBBER_ONBOARDING_RECOVERY_SERVICE_CHECK_EXECUTE_MISSING';
  end if;

  if not has_function_privilege(
       'service_role',
       'public.create_public_clubber_identity(text,text,text,text)',
       'EXECUTE'
     ) then
    raise exception 'MHIDAS_CLUBBER_ONBOARDING_RECOVERY_SERVICE_CREATE_EXECUTE_MISSING';
  end if;
end;
$mhidas_clubber_onboarding_recovery_postflight$;

commit;
