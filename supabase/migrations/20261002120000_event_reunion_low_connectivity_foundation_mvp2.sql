-- MHIDAS / USECLUBBERS
-- MVP2 - Low Connectivity - Reunion data foundation
-- Scope:
--   * event-scoped consent records
--   * one replaceable live position per user/event
--   * one replaceable current point per Meetup
--   * RLS enabled with no direct client table access
--   * no changes to event_presence_statuses
--   * no global canonical_events <-> event_groups bridge
--
-- Encoding policy:
--   * UTF-8 without BOM
--   * ASCII-only comments and identifiers in this migration

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

do $prerequisites$
begin
  if to_regclass('public.event_groups') is null
    or to_regclass('public.event_meetups') is null
    or to_regclass('public.event_meetup_members') is null
  then
    raise exception 'EVENT_REUNION_REQUIRED_TABLE_MISSING';
  end if;
end
$prerequisites$;

create table public.event_reunion_consents (
  consent_id uuid primary key default gen_random_uuid(),

  event_group_id uuid not null
    references public.event_groups(group_id)
    on delete cascade,

  owner_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  requested_by_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  scope text not null,

  audience_user_id uuid
    references auth.users(id)
    on delete cascade,

  meetup_id uuid
    references public.event_meetups(meetup_id)
    on delete cascade,

  status text not null default 'requested',

  consented_at timestamptz,
  responded_at timestamptz,
  revoked_at timestamptz,

  expires_at timestamptz not null,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint event_reunion_consents_scope_check
    check (scope in ('person', 'meetup')),

  constraint event_reunion_consents_status_check
    check (
      status in (
        'requested',
        'active',
        'declined',
        'revoked',
        'expired'
      )
    ),

  constraint event_reunion_consents_person_shape_check
    check (
      scope <> 'person'
      or (
        audience_user_id is not null
        and meetup_id is null
        and owner_user_id <> audience_user_id
        and requested_by_user_id in (
          owner_user_id,
          audience_user_id
        )
      )
    ),

  constraint event_reunion_consents_meetup_shape_check
    check (
      scope <> 'meetup'
      or (
        audience_user_id is null
        and meetup_id is not null
        and requested_by_user_id = owner_user_id
      )
    ),

  constraint event_reunion_consents_expiration_check
    check (
      expires_at > created_at
      and expires_at <= created_at + interval '24 hours'
    ),

  constraint event_reunion_consents_active_timestamp_check
    check (
      status <> 'active'
      or consented_at is not null
    ),

  constraint event_reunion_consents_declined_timestamp_check
    check (
      status <> 'declined'
      or responded_at is not null
    ),

  constraint event_reunion_consents_revoked_timestamp_check
    check (
      status <> 'revoked'
      or revoked_at is not null
    )
);

create unique index event_reunion_consents_person_open_unique_idx
  on public.event_reunion_consents (
    event_group_id,
    owner_user_id,
    audience_user_id
  )
  where scope = 'person'
    and status in ('requested', 'active');

create unique index event_reunion_consents_meetup_active_unique_idx
  on public.event_reunion_consents (
    event_group_id,
    owner_user_id,
    meetup_id
  )
  where scope = 'meetup'
    and status = 'active';

create index event_reunion_consents_owner_status_idx
  on public.event_reunion_consents (
    owner_user_id,
    event_group_id,
    status,
    expires_at
  );

create index event_reunion_consents_audience_status_idx
  on public.event_reunion_consents (
    audience_user_id,
    event_group_id,
    status,
    expires_at
  )
  where audience_user_id is not null;

create index event_reunion_consents_meetup_status_idx
  on public.event_reunion_consents (
    meetup_id,
    status,
    expires_at
  )
  where meetup_id is not null;

create table public.event_reunion_live_positions (
  position_id uuid primary key default gen_random_uuid(),

  event_group_id uuid not null
    references public.event_groups(group_id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision not null,

  captured_at timestamptz not null,
  received_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default clock_timestamp(),

  constraint event_reunion_live_positions_unique_user_event
    unique (event_group_id, user_id),

  constraint event_reunion_live_positions_latitude_check
    check (
      latitude >= -90
      and latitude <= 90
    ),

  constraint event_reunion_live_positions_longitude_check
    check (
      longitude >= -180
      and longitude <= 180
    ),

  constraint event_reunion_live_positions_accuracy_check
    check (
      accuracy_meters >= 0
      and accuracy_meters <= 10000
    ),

  constraint event_reunion_live_positions_expiration_check
    check (
      expires_at > captured_at
      and expires_at <= captured_at + interval '5 minutes'
    )
);

create index event_reunion_live_positions_event_expiry_idx
  on public.event_reunion_live_positions (
    event_group_id,
    expires_at,
    captured_at desc
  );

create table public.event_reunion_meetup_points (
  meetup_point_id uuid primary key default gen_random_uuid(),

  event_group_id uuid not null
    references public.event_groups(group_id)
    on delete cascade,

  meetup_id uuid not null
    references public.event_meetups(meetup_id)
    on delete cascade,

  set_by_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  label text not null,

  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision,

  captured_at timestamptz not null,
  received_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default clock_timestamp(),

  constraint event_reunion_meetup_points_unique_meetup
    unique (meetup_id),

  constraint event_reunion_meetup_points_label_check
    check (
      char_length(btrim(label)) between 2 and 160
    ),

  constraint event_reunion_meetup_points_latitude_check
    check (
      latitude >= -90
      and latitude <= 90
    ),

  constraint event_reunion_meetup_points_longitude_check
    check (
      longitude >= -180
      and longitude <= 180
    ),

  constraint event_reunion_meetup_points_accuracy_check
    check (
      accuracy_meters is null
      or (
        accuracy_meters >= 0
        and accuracy_meters <= 10000
      )
    ),

  constraint event_reunion_meetup_points_expiration_check
    check (expires_at > captured_at)
);

create index event_reunion_meetup_points_event_expiry_idx
  on public.event_reunion_meetup_points (
    event_group_id,
    expires_at,
    captured_at desc
  );

create or replace function public.mhidas_event_reunion_set_updated_at_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

create trigger trg_event_reunion_consents_updated_at
before update on public.event_reunion_consents
for each row
execute function public.mhidas_event_reunion_set_updated_at_v1();

create trigger trg_event_reunion_live_positions_updated_at
before update on public.event_reunion_live_positions
for each row
execute function public.mhidas_event_reunion_set_updated_at_v1();

create trigger trg_event_reunion_meetup_points_updated_at
before update on public.event_reunion_meetup_points
for each row
execute function public.mhidas_event_reunion_set_updated_at_v1();

alter table public.event_reunion_consents
  enable row level security;

alter table public.event_reunion_live_positions
  enable row level security;

alter table public.event_reunion_meetup_points
  enable row level security;

revoke all on table public.event_reunion_consents
  from public, anon, authenticated;

revoke all on table public.event_reunion_live_positions
  from public, anon, authenticated;

revoke all on table public.event_reunion_meetup_points
  from public, anon, authenticated;

revoke all on function public.mhidas_event_reunion_set_updated_at_v1()
  from public, anon, authenticated;

do $postflight$
declare
  v_missing_tables integer;
  v_rls_missing integer;
  v_anon_privilege_count integer;
  v_authenticated_privilege_count integer;
  v_location_uniqueness integer;
  v_global_bridge_count integer;
begin
  select count(*)
  into v_missing_tables
  from (
    values
      ('event_reunion_consents'),
      ('event_reunion_live_positions'),
      ('event_reunion_meetup_points')
  ) as expected(table_name)
  where to_regclass(
    'public.' || expected.table_name
  ) is null;

  if v_missing_tables <> 0 then
    raise exception 'EVENT_REUNION_POSTFLIGHT_TABLE_MISSING';
  end if;

  select count(*)
  into v_rls_missing
  from (
    values
      ('event_reunion_consents'),
      ('event_reunion_live_positions'),
      ('event_reunion_meetup_points')
  ) as expected(table_name)
  left join pg_class c
    on c.relname = expected.table_name
  left join pg_namespace n
    on n.oid = c.relnamespace
   and n.nspname = 'public'
  where c.oid is null
     or c.relrowsecurity is not true;

  if v_rls_missing <> 0 then
    raise exception 'EVENT_REUNION_POSTFLIGHT_RLS_MISSING';
  end if;

  select count(*)
  into v_anon_privilege_count
  from (
    values
      ('public.event_reunion_consents'),
      ('public.event_reunion_live_positions'),
      ('public.event_reunion_meetup_points')
  ) as expected(table_name)
  where has_table_privilege(
      'anon',
      expected.table_name,
      'SELECT'
    )
     or has_table_privilege(
      'anon',
      expected.table_name,
      'INSERT'
    )
     or has_table_privilege(
      'anon',
      expected.table_name,
      'UPDATE'
    )
     or has_table_privilege(
      'anon',
      expected.table_name,
      'DELETE'
    );

  if v_anon_privilege_count <> 0 then
    raise exception 'EVENT_REUNION_ANON_TABLE_ACCESS_PRESENT';
  end if;

  select count(*)
  into v_authenticated_privilege_count
  from (
    values
      ('public.event_reunion_consents'),
      ('public.event_reunion_live_positions'),
      ('public.event_reunion_meetup_points')
  ) as expected(table_name)
  where has_table_privilege(
      'authenticated',
      expected.table_name,
      'SELECT'
    )
     or has_table_privilege(
      'authenticated',
      expected.table_name,
      'INSERT'
    )
     or has_table_privilege(
      'authenticated',
      expected.table_name,
      'UPDATE'
    )
     or has_table_privilege(
      'authenticated',
      expected.table_name,
      'DELETE'
    );

  if v_authenticated_privilege_count <> 0 then
    raise exception 'EVENT_REUNION_AUTHENTICATED_TABLE_ACCESS_PRESENT';
  end if;

  select count(*)
  into v_location_uniqueness
  from pg_constraint pc
  join pg_class c
    on c.oid = pc.conrelid
  join pg_namespace n
    on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'event_reunion_live_positions'
    and pc.contype = 'u'
    and pc.conname =
      'event_reunion_live_positions_unique_user_event';

  if v_location_uniqueness <> 1 then
    raise exception 'EVENT_REUNION_POSITION_UNIQUENESS_MISSING';
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
    raise exception 'EVENT_REUNION_GLOBAL_CANONICAL_BRIDGE_PRESENT';
  end if;
end
$postflight$;

commit;
