-- supabase/migrations/20260922170000_event_social_presence_safety_foundation_mvp2.sql
-- MHIDAS / USECLUBBERS
-- MVP2 - Status / ponto / segurança - presence status foundation.
--
-- Principles:
-- - reuses existing event_groups, Meetups and canonical sets;
-- - no global canonical_events <-> event_groups bridge;
-- - no continuous GPS;
-- - no latitude/longitude or precise location in this table;
-- - meeting point remains owned by event_meetups;
-- - status is temporary and expires after 30 minutes;
-- - blocked/suspended relationships are excluded from social reads;
-- - direct client writes are prohibited; controlled RPCs only.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

-- =========================================================
-- 0. PREFLIGHT
-- =========================================================

do $preflight$
begin
  if to_regclass('public.event_groups') is null
    or to_regclass('public.event_meetups') is null
    or to_regclass('public.event_meetup_members') is null
    or to_regclass('public.canonical_event_sets') is null
    or to_regclass('public.canonical_events') is null
    or to_regclass('public.professional_relationship_controls') is null
  then
    raise exception 'SOCIAL_PRESENCE_REQUIRED_RELATION_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_event_social_user_has_public_clubber(uuid)'
  ) is null then
    raise exception 'SOCIAL_PRESENCE_CLUBBER_HELPER_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_event_social_event_is_active_public(uuid)'
  ) is null then
    raise exception 'SOCIAL_PRESENCE_EVENT_HELPER_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_event_social_relationship_control_exists(uuid,uuid)'
  ) is null then
    raise exception 'SOCIAL_PRESENCE_RELATIONSHIP_HELPER_MISSING';
  end if;

  if to_regclass('public.event_presence_statuses') is not null then
    raise exception 'SOCIAL_PRESENCE_TARGET_ALREADY_EXISTS';
  end if;
end
$preflight$;

-- =========================================================
-- 1. STATUS TEMPORÁRIO
-- =========================================================

do $type$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n
      on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'event_social_presence_status'
  ) then
    create type public.event_social_presence_status as enum (
      'arrived',
      'entering',
      'at_stage',
      'moving_stage',
      'at_meeting_point',
      'looking_for_group',
      'leaving',
      'safe_home'
    );
  end if;
end
$type$;

create table public.event_presence_statuses (
  presence_status_id uuid primary key
    default gen_random_uuid(),

  event_group_id uuid not null
    references public.event_groups(group_id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  status public.event_social_presence_status not null,

  meetup_id uuid
    references public.event_meetups(meetup_id)
    on delete set null,

  set_id uuid
    references public.canonical_event_sets(set_id)
    on delete set null,

  expires_at timestamptz not null
    default (now() + interval '30 minutes'),

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint event_presence_statuses_user_event_unique
    unique (event_group_id, user_id),

  constraint event_presence_statuses_expiration_check
    check (
      expires_at > updated_at
      and expires_at <= updated_at + interval '30 minutes'
    ),

  constraint event_presence_statuses_context_check
    check (
      (
        status = 'at_meeting_point'
        and meetup_id is not null
        and set_id is null
      )
      or
      (
        status in ('at_stage', 'moving_stage')
        and set_id is not null
        and meetup_id is null
      )
      or
      (
        status not in (
          'at_meeting_point',
          'at_stage',
          'moving_stage'
        )
        and meetup_id is null
        and set_id is null
      )
    )
);

comment on table public.event_presence_statuses is
  'Temporary Clubber event presence status. Never stores GPS or precise user location.';

comment on column public.event_presence_statuses.meetup_id is
  'Optional meeting-point context. Point details remain owned by event_meetups.';

comment on column public.event_presence_statuses.set_id is
  'Optional official set context for at-stage or moving-stage statuses.';

create index event_presence_statuses_event_active_idx
  on public.event_presence_statuses (
    event_group_id,
    expires_at,
    updated_at desc
  );

create index event_presence_statuses_user_active_idx
  on public.event_presence_statuses (
    user_id,
    expires_at,
    updated_at desc
  );

-- =========================================================
-- 2. UPDATED_AT
-- =========================================================

create or replace function
  public.mhidas_event_presence_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create trigger trg_event_presence_statuses_updated_at
before update on public.event_presence_statuses
for each row
execute function public.mhidas_event_presence_set_updated_at();

-- =========================================================
-- 3. WRITE RPC
-- =========================================================

create or replace function
  public.mhidas_set_event_presence_status(
    p_event_group_id uuid,
    p_status text,
    p_meetup_id uuid default null,
    p_set_id uuid default null
  )
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_status public.event_social_presence_status;
  v_presence_status_id uuid;

  v_event_group_slug text;
  v_set_event_slug text;

  v_meetup_context_valid boolean := false;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_event_group_id is null then
    raise exception 'event_group_id required';
  end if;

  begin
    v_status :=
      lower(btrim(coalesce(p_status, '')))
        ::public.event_social_presence_status;
  exception
    when invalid_text_representation then
      raise exception 'invalid presence status';
  end;

  if not public.mhidas_event_social_user_has_public_clubber(
    v_actor_user_id
  ) then
    raise exception 'active published Clubber profile required';
  end if;

  if not public.mhidas_event_social_event_is_active_public(
    p_event_group_id
  ) then
    raise exception 'active public event not found';
  end if;

  select lower(btrim(coalesce(eg.event_slug, '')))
  into v_event_group_slug
  from public.event_groups eg
  where eg.group_id = p_event_group_id
    and eg.status = 'active'
    and eg.is_public = true
  limit 1;

  -- ---------------------------------------------------------
  -- MEETING POINT
  -- ---------------------------------------------------------

  if v_status = 'at_meeting_point' then
    if p_meetup_id is null or p_set_id is not null then
      raise exception 'meeting-point status requires meetup_id only';
    end if;

    select exists (
      select 1
      from public.event_meetups em
      join public.event_meetup_members emm
        on emm.meetup_id = em.meetup_id
      where em.meetup_id = p_meetup_id
        and em.event_group_id = p_event_group_id
        and em.status = 'active'
        and (
          em.expires_at is null
          or em.expires_at > now()
        )
        and emm.user_id = v_actor_user_id
        and emm.status = 'approved'
    )
    into v_meetup_context_valid;

    if not v_meetup_context_valid then
      raise exception 'approved active meetup membership required';
    end if;

  -- ---------------------------------------------------------
  -- STAGE / SET CONTEXT
  -- ---------------------------------------------------------

  elsif v_status in ('at_stage', 'moving_stage') then
    if p_set_id is null or p_meetup_id is not null then
      raise exception 'stage status requires set_id only';
    end if;

    if nullif(v_event_group_slug, '') is null then
      raise exception 'event group slug required for stage context';
    end if;

    select lower(btrim(coalesce(ce.slug, '')))
    into v_set_event_slug
    from public.canonical_event_sets ces
    join public.canonical_events ce
      on ce.id = ces.canonical_event_id
    where ces.set_id = p_set_id
      and ces.publication_status = 'published'
      and ces.lifecycle_status <> 'cancelled'
      and ce.validation_status in ('validated', 'published')
      and ce.is_100_percent_validated = true
    limit 1;

    if nullif(v_set_event_slug, '') is null then
      raise exception 'official event set not found';
    end if;

    if v_set_event_slug <> v_event_group_slug then
      raise exception 'official set does not match event group';
    end if;

  -- ---------------------------------------------------------
  -- STATUS WITHOUT LOCATION CONTEXT
  -- ---------------------------------------------------------

  else
    if p_meetup_id is not null or p_set_id is not null then
      raise exception 'presence status does not accept location context';
    end if;
  end if;

  insert into public.event_presence_statuses (
    event_group_id,
    user_id,
    status,
    meetup_id,
    set_id,
    expires_at
  )
  values (
    p_event_group_id,
    v_actor_user_id,
    v_status,
    p_meetup_id,
    p_set_id,
    now() + interval '30 minutes'
  )
  on conflict (event_group_id, user_id)
  do update set
    status = excluded.status,
    meetup_id = excluded.meetup_id,
    set_id = excluded.set_id,
    expires_at = now() + interval '30 minutes',
    updated_at = now()
  returning presence_status_id
  into v_presence_status_id;

  return v_presence_status_id;
end;
$function$;

-- =========================================================
-- 4. CLEAR RPC
-- =========================================================

create or replace function
  public.mhidas_clear_event_presence_status(
    p_event_group_id uuid
  )
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_event_group_id is null then
    raise exception 'event_group_id required';
  end if;

  delete from public.event_presence_statuses eps
  where eps.event_group_id = p_event_group_id
    and eps.user_id = v_actor_user_id;

  return found;
end;
$function$;

-- =========================================================
-- 5. SAFE READ RPC
-- =========================================================

create or replace function
  public.mhidas_read_event_presence_statuses(
    p_event_group_id uuid
  )
returns table (
  user_id uuid,
  status public.event_social_presence_status,
  meetup_id uuid,
  set_id uuid,
  expires_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_event_group_id is null then
    raise exception 'event_group_id required';
  end if;

  if not public.mhidas_event_social_user_has_public_clubber(
    v_actor_user_id
  ) then
    raise exception 'active published Clubber profile required';
  end if;

  if not public.mhidas_event_social_event_is_active_public(
    p_event_group_id
  ) then
    raise exception 'active public event not found';
  end if;

  return query
  select
    eps.user_id,
    eps.status,
    eps.meetup_id,
    eps.set_id,
    eps.expires_at,
    eps.updated_at
  from public.event_presence_statuses eps
  where eps.event_group_id = p_event_group_id
    and eps.expires_at > now()
    and (
      eps.user_id = v_actor_user_id
      or not public.mhidas_event_social_relationship_control_exists(
        v_actor_user_id,
        eps.user_id
      )
    )
  order by
    eps.updated_at desc,
    eps.user_id;
end;
$function$;

-- =========================================================
-- 6. RLS + ACL
-- =========================================================

alter table public.event_presence_statuses
  enable row level security;

revoke all
  on table public.event_presence_statuses
  from public, anon, authenticated;

revoke all
  on function public.mhidas_event_presence_set_updated_at()
  from public, anon, authenticated;

revoke all
  on function public.mhidas_set_event_presence_status(
    uuid, text, uuid, uuid
  )
  from public, anon, authenticated;

revoke all
  on function public.mhidas_clear_event_presence_status(uuid)
  from public, anon, authenticated;

revoke all
  on function public.mhidas_read_event_presence_statuses(uuid)
  from public, anon, authenticated;

grant execute
  on function public.mhidas_set_event_presence_status(
    uuid, text, uuid, uuid
  )
  to authenticated;

grant execute
  on function public.mhidas_clear_event_presence_status(uuid)
  to authenticated;

grant execute
  on function public.mhidas_read_event_presence_statuses(uuid)
  to authenticated;

-- =========================================================
-- 7. POSTFLIGHT
-- =========================================================

do $postflight$
declare
  v_rls_enabled boolean := false;
  v_anon_execute integer := 0;
  v_authenticated_execute_missing integer := 0;
  v_precise_location_column_count integer := 0;
  v_global_bridge_count integer := 0;
  v_direct_authenticated_privilege_count integer := 0;
begin
  if to_regclass('public.event_presence_statuses') is null then
    raise exception 'SOCIAL_PRESENCE_TABLE_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_set_event_presence_status(uuid,text,uuid,uuid)'
  ) is null
    or to_regprocedure(
      'public.mhidas_clear_event_presence_status(uuid)'
    ) is null
    or to_regprocedure(
      'public.mhidas_read_event_presence_statuses(uuid)'
    ) is null
  then
    raise exception 'SOCIAL_PRESENCE_RPC_SET_INCOMPLETE';
  end if;

  select c.relrowsecurity
  into v_rls_enabled
  from pg_class c
  join pg_namespace n
    on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'event_presence_statuses';

  if not coalesce(v_rls_enabled, false) then
    raise exception 'SOCIAL_PRESENCE_RLS_MISSING';
  end if;

  select count(*)
  into v_precise_location_column_count
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'event_presence_statuses'
    and (
      lower(c.column_name) like '%latitude%'
      or lower(c.column_name) like '%longitude%'
      or lower(c.column_name) like '%coordinate%'
      or lower(c.column_name) like '%gps%'
    );

  if v_precise_location_column_count <> 0 then
    raise exception 'SOCIAL_PRESENCE_PRECISE_LOCATION_PRESENT';
  end if;

  select count(*)
  into v_global_bridge_count
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'event_groups'
    and c.column_name in (
      'canonical_event_id',
      'canonical_event_uuid'
    );

  if v_global_bridge_count <> 0 then
    raise exception 'SOCIAL_PRESENCE_GLOBAL_CANONICAL_BRIDGE_PRESENT';
  end if;

  select count(*)
  into v_direct_authenticated_privilege_count
  from (
    values
      ('SELECT'),
      ('INSERT'),
      ('UPDATE'),
      ('DELETE')
  ) as privilege(privilege_type)
  where has_table_privilege(
    'authenticated',
    'public.event_presence_statuses',
    privilege.privilege_type
  );

  if v_direct_authenticated_privilege_count <> 0 then
    raise exception 'SOCIAL_PRESENCE_DIRECT_CLIENT_TABLE_ACCESS_PRESENT';
  end if;

  select count(*)
  into v_anon_execute
  from (
    values
      ('public.mhidas_set_event_presence_status(uuid,text,uuid,uuid)'),
      ('public.mhidas_clear_event_presence_status(uuid)'),
      ('public.mhidas_read_event_presence_statuses(uuid)')
  ) as expected(signature)
  where has_function_privilege(
    'anon',
    expected.signature,
    'EXECUTE'
  );

  if v_anon_execute <> 0 then
    raise exception 'SOCIAL_PRESENCE_ANON_EXECUTE_PRESENT';
  end if;

  select count(*)
  into v_authenticated_execute_missing
  from (
    values
      ('public.mhidas_set_event_presence_status(uuid,text,uuid,uuid)'),
      ('public.mhidas_clear_event_presence_status(uuid)'),
      ('public.mhidas_read_event_presence_statuses(uuid)')
  ) as expected(signature)
  where not has_function_privilege(
    'authenticated',
    expected.signature,
    'EXECUTE'
  );

  if v_authenticated_execute_missing <> 0 then
    raise exception 'SOCIAL_PRESENCE_AUTHENTICATED_EXECUTE_MISSING';
  end if;
end
$postflight$;

commit;
