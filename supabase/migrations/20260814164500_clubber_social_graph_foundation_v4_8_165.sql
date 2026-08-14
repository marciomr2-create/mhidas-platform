-- MHIDAS / USECLUBBERS
-- V4.8.165-B1
-- Independent Clubber social graph foundation.
--
-- This migration deliberately separates the Clubber identity from the
-- Professional identity.
--
-- It creates:
--   clubber_follows
--   clubber_connections
--   clubber_relationship_controls
--
-- It does NOT modify professional_follows, professional_connections or
-- professional_relationship_controls.
--
-- It does NOT yet create Clubber notification producers or change UI/API.

begin;

do $dependencies$
begin
  if to_regclass('public.club_profiles') is null
    or to_regclass('public.cards') is null
    or to_regclass('auth.users') is null
  then
    raise exception 'V4_8_165_B1_REQUIRED_DEPENDENCY_MISSING';
  end if;
end
$dependencies$;

-- ================================================================
-- CLUBBER RELATIONSHIP CONTROLS
-- ================================================================

create table if not exists public.clubber_relationship_controls (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  target_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  status text not null,

  reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clubber_relationship_controls_no_self
    check (owner_user_id <> target_user_id),

  constraint clubber_relationship_controls_status_check
    check (status in ('blocked', 'suspended')),

  constraint clubber_relationship_controls_unique_pair
    unique (owner_user_id, target_user_id)
);

create index if not exists
  clubber_relationship_controls_owner_idx
on public.clubber_relationship_controls (
  owner_user_id
);

create index if not exists
  clubber_relationship_controls_target_idx
on public.clubber_relationship_controls (
  target_user_id
);

alter table public.clubber_relationship_controls
  enable row level security;

drop policy if exists
  clubber_relationship_controls_participant_select
on public.clubber_relationship_controls;

create policy
  clubber_relationship_controls_participant_select
on public.clubber_relationship_controls
for select
to authenticated
using (
  auth.uid() = owner_user_id
  or auth.uid() = target_user_id
);

drop policy if exists
  clubber_relationship_controls_owner_insert
on public.clubber_relationship_controls;

create policy
  clubber_relationship_controls_owner_insert
on public.clubber_relationship_controls
for insert
to authenticated
with check (
  auth.uid() = owner_user_id
  and owner_user_id <> target_user_id
);

drop policy if exists
  clubber_relationship_controls_owner_update
on public.clubber_relationship_controls;

create policy
  clubber_relationship_controls_owner_update
on public.clubber_relationship_controls
for update
to authenticated
using (
  auth.uid() = owner_user_id
)
with check (
  auth.uid() = owner_user_id
  and owner_user_id <> target_user_id
);

drop policy if exists
  clubber_relationship_controls_owner_delete
on public.clubber_relationship_controls;

create policy
  clubber_relationship_controls_owner_delete
on public.clubber_relationship_controls
for delete
to authenticated
using (
  auth.uid() = owner_user_id
);

-- ================================================================
-- CLUBBER FOLLOWS
-- ================================================================

create table if not exists public.clubber_follows (
  id uuid primary key default gen_random_uuid(),

  follower_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  followed_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  constraint clubber_follows_no_self
    check (follower_user_id <> followed_user_id),

  constraint clubber_follows_unique_pair
    unique (follower_user_id, followed_user_id)
);

create index if not exists
  clubber_follows_follower_idx
on public.clubber_follows (
  follower_user_id
);

create index if not exists
  clubber_follows_followed_idx
on public.clubber_follows (
  followed_user_id
);

alter table public.clubber_follows
  enable row level security;

drop policy if exists
  clubber_follows_public_select
on public.clubber_follows;

create policy
  clubber_follows_public_select
on public.clubber_follows
for select
to anon, authenticated
using (true);

drop policy if exists
  clubber_follows_insert_own
on public.clubber_follows;

create policy
  clubber_follows_insert_own
on public.clubber_follows
for insert
to authenticated
with check (
  auth.uid() = follower_user_id

  and follower_user_id <> followed_user_id

  and exists (
    select 1
    from public.club_profiles cp
    join public.cards c
      on c.user_id = cp.user_id
    where cp.user_id = followed_user_id
      and c.status = 'active'
      and c.is_published = true
  )

  and not exists (
    select 1
    from public.clubber_relationship_controls crc
    where crc.status = 'blocked'
      and (
        (
          crc.owner_user_id = follower_user_id
          and crc.target_user_id = followed_user_id
        )
        or
        (
          crc.owner_user_id = followed_user_id
          and crc.target_user_id = follower_user_id
        )
      )
  )
);

drop policy if exists
  clubber_follows_delete_own
on public.clubber_follows;

create policy
  clubber_follows_delete_own
on public.clubber_follows
for delete
to authenticated
using (
  auth.uid() = follower_user_id
);

-- ================================================================
-- CLUBBER CONNECTIONS / FRIENDSHIPS
-- ================================================================

create table if not exists public.clubber_connections (
  id uuid primary key default gen_random_uuid(),

  requester_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  target_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  status text not null default 'pending',

  responded_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clubber_connections_no_self
    check (requester_user_id <> target_user_id),

  constraint clubber_connections_status_check
    check (
      status in (
        'pending',
        'accepted',
        'declined',
        'cancelled'
      )
    )
);

create index if not exists
  clubber_connections_requester_idx
on public.clubber_connections (
  requester_user_id,
  created_at desc
);

create index if not exists
  clubber_connections_target_idx
on public.clubber_connections (
  target_user_id,
  created_at desc
);

create index if not exists
  clubber_connections_status_idx
on public.clubber_connections (
  status
);

create unique index if not exists
  clubber_connections_active_pair_unique
on public.clubber_connections (
  least(requester_user_id, target_user_id),
  greatest(requester_user_id, target_user_id)
)
where status in ('pending', 'accepted');

alter table public.clubber_connections
  enable row level security;

drop policy if exists
  clubber_connections_participant_select
on public.clubber_connections;

create policy
  clubber_connections_participant_select
on public.clubber_connections
for select
to authenticated
using (
  auth.uid() = requester_user_id
  or auth.uid() = target_user_id
);

drop policy if exists
  clubber_connections_requester_insert
on public.clubber_connections;

create policy
  clubber_connections_requester_insert
on public.clubber_connections
for insert
to authenticated
with check (
  auth.uid() = requester_user_id

  and requester_user_id <> target_user_id

  and status = 'pending'

  and exists (
    select 1
    from public.club_profiles cp
    join public.cards c
      on c.user_id = cp.user_id
    where cp.user_id = target_user_id
      and coalesce(cp.open_to_networking, false) = true
      and c.status = 'active'
      and c.is_published = true
  )

  and not exists (
    select 1
    from public.clubber_relationship_controls crc
    where crc.status in ('blocked', 'suspended')
      and (
        (
          crc.owner_user_id = requester_user_id
          and crc.target_user_id = target_user_id
        )
        or
        (
          crc.owner_user_id = target_user_id
          and crc.target_user_id = requester_user_id
        )
      )
  )
);

drop policy if exists
  clubber_connections_participant_update
on public.clubber_connections;

create policy
  clubber_connections_participant_update
on public.clubber_connections
for update
to authenticated
using (
  auth.uid() = requester_user_id
  or auth.uid() = target_user_id
)
with check (
  auth.uid() = requester_user_id
  or auth.uid() = target_user_id
);

-- ================================================================
-- TIMESTAMP HELPERS
-- ================================================================

create or replace function
  public.mhidas_clubber_social_touch_updated_at()
returns trigger
language plpgsql
volatile
set search_path = pg_catalog, public
as $function$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

drop trigger if exists
  trg_clubber_relationship_controls_touch_updated_at
on public.clubber_relationship_controls;

create trigger
  trg_clubber_relationship_controls_touch_updated_at
before update
on public.clubber_relationship_controls
for each row
execute function
  public.mhidas_clubber_social_touch_updated_at();

-- ================================================================
-- CONNECTION TRANSITION GUARD
-- ================================================================

create or replace function
  public.mhidas_clubber_connection_transition_guard()
returns trigger
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
begin
  if v_actor_user_id is null then
    if tg_op = 'UPDATE' then
      new.updated_at := clock_timestamp();
    end if;

    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.requester_user_id <> v_actor_user_id then
      raise exception
        'V4_8_165_B1_CLUBBER_CONNECTION_REQUESTER_MISMATCH';
    end if;

    if new.requester_user_id = new.target_user_id then
      raise exception
        'V4_8_165_B1_CLUBBER_CONNECTION_SELF_FORBIDDEN';
    end if;

    if new.status <> 'pending' then
      raise exception
        'V4_8_165_B1_CLUBBER_CONNECTION_INITIAL_STATUS_INVALID';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.requester_user_id is distinct from old.requester_user_id
      or new.target_user_id is distinct from old.target_user_id
    then
      raise exception
        'V4_8_165_B1_CLUBBER_CONNECTION_IDENTITY_IMMUTABLE';
    end if;

    if old.status is not distinct from new.status then
      new.updated_at := clock_timestamp();
      return new;
    end if;

    if old.status = 'pending'
      and new.status in ('accepted', 'declined')
    then
      if old.target_user_id <> v_actor_user_id then
        raise exception
          'V4_8_165_B1_CLUBBER_CONNECTION_DECISION_ACTOR_INVALID';
      end if;

      new.responded_at := clock_timestamp();
      new.updated_at := clock_timestamp();

      return new;
    end if;

    if old.status = 'pending'
      and new.status = 'cancelled'
    then
      if old.requester_user_id <> v_actor_user_id then
        raise exception
          'V4_8_165_B1_CLUBBER_CONNECTION_CANCEL_ACTOR_INVALID';
      end if;

      new.responded_at := clock_timestamp();
      new.updated_at := clock_timestamp();

      return new;
    end if;

    if old.status = 'accepted'
      and new.status = 'cancelled'
    then
      if old.requester_user_id <> v_actor_user_id
        and old.target_user_id <> v_actor_user_id
      then
        raise exception
          'V4_8_165_B1_CLUBBER_CONNECTION_END_ACTOR_INVALID';
      end if;

      new.responded_at := clock_timestamp();
      new.updated_at := clock_timestamp();

      return new;
    end if;

    raise exception
      'V4_8_165_B1_CLUBBER_CONNECTION_TRANSITION_INVALID:%->%',
      old.status,
      new.status;
  end if;

  return new;
end;
$function$;

drop trigger if exists
  trg_clubber_connection_transition_guard
on public.clubber_connections;

create trigger
  trg_clubber_connection_transition_guard
before insert or update
on public.clubber_connections
for each row
execute function
  public.mhidas_clubber_connection_transition_guard();

-- ================================================================
-- PRIVILEGES
-- ================================================================

grant select
on public.clubber_follows
to anon, authenticated;

grant insert, delete
on public.clubber_follows
to authenticated;

grant select, insert, update
on public.clubber_connections
to authenticated;

grant select, insert, update, delete
on public.clubber_relationship_controls
to authenticated;

revoke all
on function public.mhidas_clubber_social_touch_updated_at()
from public, anon, authenticated;

revoke all
on function public.mhidas_clubber_connection_transition_guard()
from public, anon, authenticated;

-- ================================================================
-- DOCUMENTATION
-- ================================================================

comment on table public.clubber_follows is
  'Independent unilateral follower graph for Perfil Clubber.';

comment on table public.clubber_connections is
  'Independent request/accept friendship and connection graph for Perfil Clubber.';

comment on table public.clubber_relationship_controls is
  'Independent blocking and suspension controls for Perfil Clubber.';

comment on function public.mhidas_clubber_connection_transition_guard() is
  'V4.8.165-B1 guard for authenticated Clubber connection lifecycle transitions.';

-- ================================================================
-- SELF CHECK
-- ================================================================

do $self_check$
declare
  v_missing_tables integer;
  v_missing_indexes integer;
  v_missing_triggers integer;
  v_rls_missing integer;
begin
  select count(*)
  into v_missing_tables
  from (
    values
      ('clubber_follows'),
      ('clubber_connections'),
      ('clubber_relationship_controls')
  ) expected(table_name)
  where to_regclass(
    'public.' || expected.table_name
  ) is null;

  if v_missing_tables <> 0 then
    raise exception
      'V4_8_165_B1_MISSING_TABLES:%',
      v_missing_tables;
  end if;

  select count(*)
  into v_missing_indexes
  from (
    values
      ('clubber_follows_follower_idx'),
      ('clubber_follows_followed_idx'),
      ('clubber_connections_requester_idx'),
      ('clubber_connections_target_idx'),
      ('clubber_connections_status_idx'),
      ('clubber_connections_active_pair_unique'),
      ('clubber_relationship_controls_owner_idx'),
      ('clubber_relationship_controls_target_idx')
  ) expected(index_name)
  where to_regclass(
    'public.' || expected.index_name
  ) is null;

  if v_missing_indexes <> 0 then
    raise exception
      'V4_8_165_B1_MISSING_INDEXES:%',
      v_missing_indexes;
  end if;

  select count(*)
  into v_missing_triggers
  from (
    values
      (
        'clubber_connections',
        'trg_clubber_connection_transition_guard'
      ),
      (
        'clubber_relationship_controls',
        'trg_clubber_relationship_controls_touch_updated_at'
      )
  ) expected(table_name, trigger_name)
  where not exists (
    select 1
    from pg_trigger t
    join pg_class c
      on c.oid = t.tgrelid
    join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = expected.table_name
      and t.tgname = expected.trigger_name
      and not t.tgisinternal
      and t.tgenabled <> 'D'
  );

  if v_missing_triggers <> 0 then
    raise exception
      'V4_8_165_B1_MISSING_TRIGGERS:%',
      v_missing_triggers;
  end if;

  select count(*)
  into v_rls_missing
  from (
    values
      ('clubber_follows'),
      ('clubber_connections'),
      ('clubber_relationship_controls')
  ) expected(table_name)
  where not exists (
    select 1
    from pg_class c
    join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = expected.table_name
      and c.relrowsecurity
  );

  if v_rls_missing <> 0 then
    raise exception
      'V4_8_165_B1_RLS_MISSING:%',
      v_rls_missing;
  end if;

  if to_regclass('public.professional_follows') is null
    or to_regclass('public.professional_connections') is null
    or to_regclass('public.professional_relationship_controls') is null
  then
    raise exception
      'V4_8_165_B1_PROFESSIONAL_GRAPH_DEPENDENCY_DRIFT';
  end if;
end
$self_check$;

commit;