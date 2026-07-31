-- supabase/migrations/20260731123000_event_structured_rides_meetups_foundation.sql

begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'event_ride_mode'
  ) then
    create type public.event_ride_mode as enum (
      'offer',
      'seek'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'event_ride_direction'
  ) then
    create type public.event_ride_direction as enum (
      'outbound',
      'return',
      'round_trip'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'event_social_visibility'
  ) then
    create type public.event_social_visibility as enum (
      'public',
      'private'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'event_social_status'
  ) then
    create type public.event_social_status as enum (
      'active',
      'closed',
      'archived',
      'cancelled'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'event_social_member_role'
  ) then
    create type public.event_social_member_role as enum (
      'creator',
      'organizer',
      'driver',
      'passenger',
      'member'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'event_social_member_status'
  ) then
    create type public.event_social_member_status as enum (
      'approved',
      'left',
      'removed',
      'blocked'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'event_social_request_status'
  ) then
    create type public.event_social_request_status as enum (
      'pending',
      'approved',
      'rejected',
      'cancelled'
    );
  end if;
end
$$;

create table if not exists public.event_rides (
  ride_id uuid primary key default gen_random_uuid(),
  event_group_id uuid not null
    references public.event_groups(group_id)
    on delete cascade,
  creator_user_id uuid not null
    references auth.users(id)
    on delete cascade,
  mode public.event_ride_mode not null,
  direction public.event_ride_direction not null,
  origin_label text not null,
  destination_label text not null,
  departure_at timestamptz,
  return_at timestamptz,
  seats_available integer,
  contribution_note text,
  transport_type text,
  notes text,
  visibility public.event_social_visibility not null default 'public',
  status public.event_social_status not null default 'active',
  expires_at timestamptz,
  closed_at timestamptz,
  archived_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_rides_origin_length_check
    check (char_length(btrim(origin_label)) between 2 and 120),

  constraint event_rides_destination_length_check
    check (char_length(btrim(destination_label)) between 2 and 120),

  constraint event_rides_seats_check
    check (
      seats_available is null
      or seats_available between 1 and 50
    ),

  constraint event_rides_contribution_length_check
    check (
      contribution_note is null
      or char_length(contribution_note) <= 180
    ),

  constraint event_rides_transport_type_length_check
    check (
      transport_type is null
      or char_length(transport_type) <= 60
    ),

  constraint event_rides_notes_length_check
    check (
      notes is null
      or char_length(notes) <= 1000
    ),

  constraint event_rides_return_check
    check (
      return_at is null
      or departure_at is null
      or return_at > departure_at
    ),

  constraint event_rides_expiration_check
    check (
      expires_at is null
      or expires_at > created_at
    )
);

create table if not exists public.event_ride_members (
  ride_member_id uuid primary key default gen_random_uuid(),
  ride_id uuid not null
    references public.event_rides(ride_id)
    on delete cascade,
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  role public.event_social_member_role not null default 'member',
  status public.event_social_member_status not null default 'approved',
  status_changed_by_user_id uuid
    references auth.users(id)
    on delete set null,
  joined_at timestamptz,
  left_at timestamptz,
  status_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_ride_members_unique_user
    unique (ride_id, user_id),

  constraint event_ride_members_creator_state_check
    check (
      role <> 'creator'
      or status = 'approved'
    )
);

create table if not exists public.event_ride_join_requests (
  request_id uuid primary key default gen_random_uuid(),
  ride_id uuid not null
    references public.event_rides(ride_id)
    on delete cascade,
  requester_user_id uuid not null
    references auth.users(id)
    on delete cascade,
  seats_requested integer not null default 1,
  status public.event_social_request_status not null default 'pending',
  message text,
  decided_by_user_id uuid
    references auth.users(id)
    on delete set null,
  decided_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_ride_requests_seats_check
    check (seats_requested between 1 and 10),

  constraint event_ride_requests_message_length_check
    check (
      message is null
      or char_length(message) <= 500
    )
);

create table if not exists public.event_meetups (
  meetup_id uuid primary key default gen_random_uuid(),
  event_group_id uuid not null
    references public.event_groups(group_id)
    on delete cascade,
  creator_user_id uuid not null
    references auth.users(id)
    on delete cascade,
  name text not null,
  description text,
  meeting_point_label text not null,
  meeting_point_reference text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  max_members integer not null default 20,
  rules text,
  visibility public.event_social_visibility not null default 'public',
  status public.event_social_status not null default 'active',
  expires_at timestamptz,
  closed_at timestamptz,
  archived_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_meetups_name_length_check
    check (char_length(btrim(name)) between 3 and 80),

  constraint event_meetups_description_length_check
    check (
      description is null
      or char_length(description) <= 500
    ),

  constraint event_meetups_point_length_check
    check (
      char_length(btrim(meeting_point_label)) between 2 and 160
    ),

  constraint event_meetups_reference_length_check
    check (
      meeting_point_reference is null
      or char_length(meeting_point_reference) <= 500
    ),

  constraint event_meetups_max_members_check
    check (max_members between 2 and 250),

  constraint event_meetups_rules_length_check
    check (
      rules is null
      or char_length(rules) <= 2000
    ),

  constraint event_meetups_time_check
    check (
      ends_at is null
      or ends_at > starts_at
    ),

  constraint event_meetups_expiration_check
    check (
      expires_at is null
      or expires_at > created_at
    )
);

create table if not exists public.event_meetup_members (
  meetup_member_id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null
    references public.event_meetups(meetup_id)
    on delete cascade,
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  role public.event_social_member_role not null default 'member',
  status public.event_social_member_status not null default 'approved',
  status_changed_by_user_id uuid
    references auth.users(id)
    on delete set null,
  joined_at timestamptz,
  left_at timestamptz,
  status_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_meetup_members_unique_user
    unique (meetup_id, user_id),

  constraint event_meetup_members_creator_state_check
    check (
      role <> 'creator'
      or status = 'approved'
    )
);

create table if not exists public.event_meetup_join_requests (
  request_id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null
    references public.event_meetups(meetup_id)
    on delete cascade,
  requester_user_id uuid not null
    references auth.users(id)
    on delete cascade,
  status public.event_social_request_status not null default 'pending',
  message text,
  decided_by_user_id uuid
    references auth.users(id)
    on delete set null,
  decided_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_meetup_requests_message_length_check
    check (
      message is null
      or char_length(message) <= 500
    )
);

create index if not exists event_rides_event_status_idx
  on public.event_rides (
    event_group_id,
    status,
    visibility,
    departure_at,
    created_at desc
  );

create index if not exists event_rides_creator_status_idx
  on public.event_rides (
    creator_user_id,
    status,
    created_at desc
  );

create index if not exists event_ride_members_ride_status_idx
  on public.event_ride_members (
    ride_id,
    status,
    role,
    joined_at
  );

create index if not exists event_ride_members_user_status_idx
  on public.event_ride_members (
    user_id,
    status,
    updated_at desc
  );

create unique index if not exists event_ride_requests_pending_unique_idx
  on public.event_ride_join_requests (
    ride_id,
    requester_user_id
  )
  where status = 'pending';

create index if not exists event_ride_requests_ride_status_idx
  on public.event_ride_join_requests (
    ride_id,
    status,
    created_at
  );

create index if not exists event_meetups_event_status_idx
  on public.event_meetups (
    event_group_id,
    status,
    visibility,
    starts_at,
    created_at desc
  );

create index if not exists event_meetups_creator_status_idx
  on public.event_meetups (
    creator_user_id,
    status,
    created_at desc
  );

create index if not exists event_meetup_members_meetup_status_idx
  on public.event_meetup_members (
    meetup_id,
    status,
    role,
    joined_at
  );

create index if not exists event_meetup_members_user_status_idx
  on public.event_meetup_members (
    user_id,
    status,
    updated_at desc
  );

create unique index if not exists event_meetup_requests_pending_unique_idx
  on public.event_meetup_join_requests (
    meetup_id,
    requester_user_id
  )
  where status = 'pending';

create index if not exists event_meetup_requests_meetup_status_idx
  on public.event_meetup_join_requests (
    meetup_id,
    status,
    created_at
  );

create or replace function public.mhidas_event_social_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists trg_event_rides_updated_at
  on public.event_rides;

create trigger trg_event_rides_updated_at
before update on public.event_rides
for each row
execute function public.mhidas_event_social_set_updated_at();

drop trigger if exists trg_event_ride_members_updated_at
  on public.event_ride_members;

create trigger trg_event_ride_members_updated_at
before update on public.event_ride_members
for each row
execute function public.mhidas_event_social_set_updated_at();

drop trigger if exists trg_event_ride_requests_updated_at
  on public.event_ride_join_requests;

create trigger trg_event_ride_requests_updated_at
before update on public.event_ride_join_requests
for each row
execute function public.mhidas_event_social_set_updated_at();

drop trigger if exists trg_event_meetups_updated_at
  on public.event_meetups;

create trigger trg_event_meetups_updated_at
before update on public.event_meetups
for each row
execute function public.mhidas_event_social_set_updated_at();

drop trigger if exists trg_event_meetup_members_updated_at
  on public.event_meetup_members;

create trigger trg_event_meetup_members_updated_at
before update on public.event_meetup_members
for each row
execute function public.mhidas_event_social_set_updated_at();

drop trigger if exists trg_event_meetup_requests_updated_at
  on public.event_meetup_join_requests;

create trigger trg_event_meetup_requests_updated_at
before update on public.event_meetup_join_requests
for each row
execute function public.mhidas_event_social_set_updated_at();

create or replace function public.mhidas_event_social_relationship_control_exists(
  p_left_user_id uuid,
  p_right_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    case
      when p_left_user_id is null
        or p_right_user_id is null
        or p_left_user_id = p_right_user_id
      then false
      else exists (
        select 1
        from public.professional_relationship_controls prc
        where prc.status in ('blocked', 'suspended')
          and (
            (
              prc.owner_user_id = p_left_user_id
              and prc.target_user_id = p_right_user_id
            )
            or
            (
              prc.owner_user_id = p_right_user_id
              and prc.target_user_id = p_left_user_id
            )
          )
      )
    end;
$function$;

create or replace function public.mhidas_event_social_user_has_public_clubber(
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.cards c
    where c.user_id = p_user_id
      and c.status = 'active'
      and c.is_published = true
  );
$function$;

create or replace function public.mhidas_event_social_event_is_active_public(
  p_event_group_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.event_groups eg
    where eg.group_id = p_event_group_id
      and eg.status = 'active'
      and eg.is_public = true
  );
$function$;

create or replace function public.mhidas_create_event_ride(
  p_event_group_id uuid,
  p_mode text,
  p_direction text,
  p_origin_label text,
  p_destination_label text,
  p_departure_at timestamptz default null,
  p_return_at timestamptz default null,
  p_seats_available integer default null,
  p_contribution_note text default null,
  p_transport_type text default null,
  p_notes text default null,
  p_visibility text default 'public',
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_ride_id uuid;
  v_mode public.event_ride_mode;
  v_direction public.event_ride_direction;
  v_visibility public.event_social_visibility;
  v_creator_role public.event_social_member_role;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if not public.mhidas_event_social_user_has_public_clubber(v_actor_user_id) then
    raise exception 'active published Clubber profile required';
  end if;

  if not public.mhidas_event_social_event_is_active_public(p_event_group_id) then
    raise exception 'active public event not found';
  end if;

  begin
    v_mode := lower(btrim(coalesce(p_mode, '')))::public.event_ride_mode;
    v_direction := lower(btrim(coalesce(p_direction, '')))::public.event_ride_direction;
    v_visibility := lower(btrim(coalesce(p_visibility, 'public')))::public.event_social_visibility;
  exception
    when invalid_text_representation then
      raise exception 'invalid ride enum value';
  end;

  if char_length(btrim(coalesce(p_origin_label, ''))) < 2 then
    raise exception 'origin required';
  end if;

  if char_length(btrim(coalesce(p_destination_label, ''))) < 2 then
    raise exception 'destination required';
  end if;

  if p_return_at is not null
    and p_departure_at is not null
    and p_return_at <= p_departure_at
  then
    raise exception 'return_at must be after departure_at';
  end if;

  if p_seats_available is not null
    and (p_seats_available < 1 or p_seats_available > 50)
  then
    raise exception 'seats_available must be between 1 and 50';
  end if;

  if p_expires_at is not null
    and p_expires_at <= now()
  then
    raise exception 'expires_at must be in the future';
  end if;

  insert into public.event_rides (
    event_group_id,
    creator_user_id,
    mode,
    direction,
    origin_label,
    destination_label,
    departure_at,
    return_at,
    seats_available,
    contribution_note,
    transport_type,
    notes,
    visibility,
    status,
    expires_at
  )
  values (
    p_event_group_id,
    v_actor_user_id,
    v_mode,
    v_direction,
    btrim(p_origin_label),
    btrim(p_destination_label),
    p_departure_at,
    p_return_at,
    p_seats_available,
    nullif(btrim(coalesce(p_contribution_note, '')), ''),
    nullif(btrim(coalesce(p_transport_type, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_visibility,
    'active',
    p_expires_at
  )
  returning ride_id
  into v_ride_id;

  v_creator_role := case
    when v_mode = 'offer' then 'driver'::public.event_social_member_role
    else 'passenger'::public.event_social_member_role
  end;

  insert into public.event_ride_members (
    ride_id,
    user_id,
    role,
    status,
    status_changed_by_user_id,
    joined_at,
    status_changed_at
  )
  values (
    v_ride_id,
    v_actor_user_id,
    'creator',
    'approved',
    v_actor_user_id,
    now(),
    now()
  );

  return v_ride_id;
end;
$function$;

create or replace function public.mhidas_request_join_event_ride(
  p_ride_id uuid,
  p_seats_requested integer default 1,
  p_message text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_request_id uuid;
  v_creator_user_id uuid;
  v_status public.event_social_status;
  v_expires_at timestamptz;
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_seats_requested < 1 or p_seats_requested > 10 then
    raise exception 'seats_requested must be between 1 and 10';
  end if;

  if not public.mhidas_event_social_user_has_public_clubber(v_actor_user_id) then
    raise exception 'active published Clubber profile required';
  end if;

  select er.creator_user_id, er.status, er.expires_at
  into v_creator_user_id, v_status, v_expires_at
  from public.event_rides er
  where er.ride_id = p_ride_id
  for update;

  if v_creator_user_id is null then
    raise exception 'ride not found';
  end if;

  if v_creator_user_id = v_actor_user_id then
    raise exception 'ride creator is already a member';
  end if;

  if v_status <> 'active' then
    raise exception 'ride is not accepting requests';
  end if;

  if v_expires_at is not null and v_expires_at <= now() then
    raise exception 'ride has expired';
  end if;

  if public.mhidas_event_social_relationship_control_exists(
    v_actor_user_id,
    v_creator_user_id
  ) then
    raise exception 'relationship control prevents this request';
  end if;

  if exists (
    select 1
    from public.event_ride_members erm
    where erm.ride_id = p_ride_id
      and erm.user_id = v_actor_user_id
      and erm.status = 'approved'
  ) then
    raise exception 'user is already an approved ride member';
  end if;

  insert into public.event_ride_join_requests (
    ride_id,
    requester_user_id,
    seats_requested,
    status,
    message
  )
  values (
    p_ride_id,
    v_actor_user_id,
    p_seats_requested,
    'pending',
    v_message
  )
  returning request_id
  into v_request_id;

  return v_request_id;
exception
  when unique_violation then
    raise exception 'pending ride request already exists';
end;
$function$;

create or replace function public.mhidas_decide_event_ride_request(
  p_request_id uuid,
  p_decision text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_ride_id uuid;
  v_requester_user_id uuid;
  v_creator_user_id uuid;
  v_mode public.event_ride_mode;
  v_request_status public.event_social_request_status;
  v_decision text := lower(btrim(coalesce(p_decision, '')));
  v_role public.event_social_member_role;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  select
    erjr.ride_id,
    erjr.requester_user_id,
    erjr.status,
    er.creator_user_id,
    er.mode
  into
    v_ride_id,
    v_requester_user_id,
    v_request_status,
    v_creator_user_id,
    v_mode
  from public.event_ride_join_requests erjr
  join public.event_rides er
    on er.ride_id = erjr.ride_id
  where erjr.request_id = p_request_id
  for update of erjr, er;

  if v_ride_id is null then
    raise exception 'ride request not found';
  end if;

  if v_actor_user_id <> v_creator_user_id then
    raise exception 'ride creator required';
  end if;

  if v_request_status <> 'pending' then
    raise exception 'ride request is not pending';
  end if;

  if v_decision not in ('approved', 'rejected') then
    raise exception 'invalid ride request decision';
  end if;

  if public.mhidas_event_social_relationship_control_exists(
    v_actor_user_id,
    v_requester_user_id
  ) then
    raise exception 'relationship control prevents this decision';
  end if;

  update public.event_ride_join_requests
  set
    status = v_decision::public.event_social_request_status,
    decided_by_user_id = v_actor_user_id,
    decided_at = now()
  where request_id = p_request_id;

  if v_decision = 'approved' then
    v_role := case
      when v_mode = 'offer' then 'passenger'::public.event_social_member_role
      else 'driver'::public.event_social_member_role
    end;

    insert into public.event_ride_members (
      ride_id,
      user_id,
      role,
      status,
      status_changed_by_user_id,
      joined_at,
      status_changed_at
    )
    values (
      v_ride_id,
      v_requester_user_id,
      v_role,
      'approved',
      v_actor_user_id,
      now(),
      now()
    )
    on conflict (ride_id, user_id)
    do update set
      role = excluded.role,
      status = 'approved',
      left_at = null,
      status_changed_by_user_id = excluded.status_changed_by_user_id,
      joined_at = coalesce(public.event_ride_members.joined_at, now()),
      status_changed_at = now();
  end if;

  return true;
end;
$function$;

create or replace function public.mhidas_create_event_meetup(
  p_event_group_id uuid,
  p_name text,
  p_description text,
  p_meeting_point_label text,
  p_meeting_point_reference text,
  p_starts_at timestamptz,
  p_ends_at timestamptz default null,
  p_max_members integer default 20,
  p_rules text default null,
  p_visibility text default 'public',
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_meetup_id uuid;
  v_visibility public.event_social_visibility;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if not public.mhidas_event_social_user_has_public_clubber(v_actor_user_id) then
    raise exception 'active published Clubber profile required';
  end if;

  if not public.mhidas_event_social_event_is_active_public(p_event_group_id) then
    raise exception 'active public event not found';
  end if;

  if char_length(btrim(coalesce(p_name, ''))) < 3 then
    raise exception 'meetup name required';
  end if;

  if char_length(btrim(coalesce(p_meeting_point_label, ''))) < 2 then
    raise exception 'meeting point required';
  end if;

  if p_starts_at is null then
    raise exception 'starts_at required';
  end if;

  if p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'ends_at must be after starts_at';
  end if;

  if p_max_members < 2 or p_max_members > 250 then
    raise exception 'max_members must be between 2 and 250';
  end if;

  begin
    v_visibility := lower(btrim(coalesce(p_visibility, 'public')))
      ::public.event_social_visibility;
  exception
    when invalid_text_representation then
      raise exception 'invalid meetup visibility';
  end;

  insert into public.event_meetups (
    event_group_id,
    creator_user_id,
    name,
    description,
    meeting_point_label,
    meeting_point_reference,
    starts_at,
    ends_at,
    max_members,
    rules,
    visibility,
    status,
    expires_at
  )
  values (
    p_event_group_id,
    v_actor_user_id,
    btrim(p_name),
    nullif(btrim(coalesce(p_description, '')), ''),
    btrim(p_meeting_point_label),
    nullif(btrim(coalesce(p_meeting_point_reference, '')), ''),
    p_starts_at,
    p_ends_at,
    p_max_members,
    nullif(btrim(coalesce(p_rules, '')), ''),
    v_visibility,
    'active',
    p_expires_at
  )
  returning meetup_id
  into v_meetup_id;

  insert into public.event_meetup_members (
    meetup_id,
    user_id,
    role,
    status,
    status_changed_by_user_id,
    joined_at,
    status_changed_at
  )
  values (
    v_meetup_id,
    v_actor_user_id,
    'creator',
    'approved',
    v_actor_user_id,
    now(),
    now()
  );

  return v_meetup_id;
end;
$function$;

create or replace function public.mhidas_request_join_event_meetup(
  p_meetup_id uuid,
  p_message text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_request_id uuid;
  v_creator_user_id uuid;
  v_status public.event_social_status;
  v_expires_at timestamptz;
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if not public.mhidas_event_social_user_has_public_clubber(v_actor_user_id) then
    raise exception 'active published Clubber profile required';
  end if;

  select em.creator_user_id, em.status, em.expires_at
  into v_creator_user_id, v_status, v_expires_at
  from public.event_meetups em
  where em.meetup_id = p_meetup_id
  for update;

  if v_creator_user_id is null then
    raise exception 'meetup not found';
  end if;

  if v_creator_user_id = v_actor_user_id then
    raise exception 'meetup creator is already a member';
  end if;

  if v_status <> 'active' then
    raise exception 'meetup is not accepting requests';
  end if;

  if v_expires_at is not null and v_expires_at <= now() then
    raise exception 'meetup has expired';
  end if;

  if public.mhidas_event_social_relationship_control_exists(
    v_actor_user_id,
    v_creator_user_id
  ) then
    raise exception 'relationship control prevents this request';
  end if;

  if exists (
    select 1
    from public.event_meetup_members emm
    where emm.meetup_id = p_meetup_id
      and emm.user_id = v_actor_user_id
      and emm.status = 'approved'
  ) then
    raise exception 'user is already an approved meetup member';
  end if;

  insert into public.event_meetup_join_requests (
    meetup_id,
    requester_user_id,
    status,
    message
  )
  values (
    p_meetup_id,
    v_actor_user_id,
    'pending',
    v_message
  )
  returning request_id
  into v_request_id;

  return v_request_id;
exception
  when unique_violation then
    raise exception 'pending meetup request already exists';
end;
$function$;

create or replace function public.mhidas_decide_event_meetup_request(
  p_request_id uuid,
  p_decision text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_meetup_id uuid;
  v_requester_user_id uuid;
  v_creator_user_id uuid;
  v_request_status public.event_social_request_status;
  v_decision text := lower(btrim(coalesce(p_decision, '')));
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  select
    emjr.meetup_id,
    emjr.requester_user_id,
    emjr.status,
    em.creator_user_id
  into
    v_meetup_id,
    v_requester_user_id,
    v_request_status,
    v_creator_user_id
  from public.event_meetup_join_requests emjr
  join public.event_meetups em
    on em.meetup_id = emjr.meetup_id
  where emjr.request_id = p_request_id
  for update of emjr, em;

  if v_meetup_id is null then
    raise exception 'meetup request not found';
  end if;

  if v_actor_user_id <> v_creator_user_id then
    raise exception 'meetup creator required';
  end if;

  if v_request_status <> 'pending' then
    raise exception 'meetup request is not pending';
  end if;

  if v_decision not in ('approved', 'rejected') then
    raise exception 'invalid meetup request decision';
  end if;

  if public.mhidas_event_social_relationship_control_exists(
    v_actor_user_id,
    v_requester_user_id
  ) then
    raise exception 'relationship control prevents this decision';
  end if;

  update public.event_meetup_join_requests
  set
    status = v_decision::public.event_social_request_status,
    decided_by_user_id = v_actor_user_id,
    decided_at = now()
  where request_id = p_request_id;

  if v_decision = 'approved' then
    insert into public.event_meetup_members (
      meetup_id,
      user_id,
      role,
      status,
      status_changed_by_user_id,
      joined_at,
      status_changed_at
    )
    values (
      v_meetup_id,
      v_requester_user_id,
      'member',
      'approved',
      v_actor_user_id,
      now(),
      now()
    )
    on conflict (meetup_id, user_id)
    do update set
      role = 'member',
      status = 'approved',
      left_at = null,
      status_changed_by_user_id = excluded.status_changed_by_user_id,
      joined_at = coalesce(public.event_meetup_members.joined_at, now()),
      status_changed_at = now();
  end if;

  return true;
end;
$function$;

alter table public.event_rides enable row level security;
alter table public.event_ride_members enable row level security;
alter table public.event_ride_join_requests enable row level security;
alter table public.event_meetups enable row level security;
alter table public.event_meetup_members enable row level security;
alter table public.event_meetup_join_requests enable row level security;

drop policy if exists event_rides_select_visible
  on public.event_rides;

create policy event_rides_select_visible
on public.event_rides
for select
to authenticated
using (
  (
    visibility = 'public'
    and status = 'active'
    and (
      expires_at is null
      or expires_at > now()
    )
  )
  or creator_user_id = auth.uid()
  or exists (
    select 1
    from public.event_ride_members erm
    where erm.ride_id = event_rides.ride_id
      and erm.user_id = auth.uid()
      and erm.status = 'approved'
  )
  or exists (
    select 1
    from public.event_ride_join_requests erjr
    where erjr.ride_id = event_rides.ride_id
      and erjr.requester_user_id = auth.uid()
      and erjr.status = 'pending'
  )
);

drop policy if exists event_ride_members_select_self_or_creator
  on public.event_ride_members;

create policy event_ride_members_select_self_or_creator
on public.event_ride_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.event_rides er
    where er.ride_id = event_ride_members.ride_id
      and er.creator_user_id = auth.uid()
  )
);

drop policy if exists event_ride_requests_select_self_or_creator
  on public.event_ride_join_requests;

create policy event_ride_requests_select_self_or_creator
on public.event_ride_join_requests
for select
to authenticated
using (
  requester_user_id = auth.uid()
  or exists (
    select 1
    from public.event_rides er
    where er.ride_id = event_ride_join_requests.ride_id
      and er.creator_user_id = auth.uid()
  )
);

drop policy if exists event_meetups_select_visible
  on public.event_meetups;

create policy event_meetups_select_visible
on public.event_meetups
for select
to authenticated
using (
  (
    visibility = 'public'
    and status = 'active'
    and (
      expires_at is null
      or expires_at > now()
    )
  )
  or creator_user_id = auth.uid()
  or exists (
    select 1
    from public.event_meetup_members emm
    where emm.meetup_id = event_meetups.meetup_id
      and emm.user_id = auth.uid()
      and emm.status = 'approved'
  )
  or exists (
    select 1
    from public.event_meetup_join_requests emjr
    where emjr.meetup_id = event_meetups.meetup_id
      and emjr.requester_user_id = auth.uid()
      and emjr.status = 'pending'
  )
);

drop policy if exists event_meetup_members_select_self_or_creator
  on public.event_meetup_members;

create policy event_meetup_members_select_self_or_creator
on public.event_meetup_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.event_meetups em
    where em.meetup_id = event_meetup_members.meetup_id
      and em.creator_user_id = auth.uid()
  )
);

drop policy if exists event_meetup_requests_select_self_or_creator
  on public.event_meetup_join_requests;

create policy event_meetup_requests_select_self_or_creator
on public.event_meetup_join_requests
for select
to authenticated
using (
  requester_user_id = auth.uid()
  or exists (
    select 1
    from public.event_meetups em
    where em.meetup_id = event_meetup_join_requests.meetup_id
      and em.creator_user_id = auth.uid()
  )
);

revoke all on table public.event_rides from public, anon, authenticated;
revoke all on table public.event_ride_members from public, anon, authenticated;
revoke all on table public.event_ride_join_requests from public, anon, authenticated;
revoke all on table public.event_meetups from public, anon, authenticated;
revoke all on table public.event_meetup_members from public, anon, authenticated;
revoke all on table public.event_meetup_join_requests from public, anon, authenticated;

grant select on table public.event_rides to authenticated;
grant select on table public.event_ride_members to authenticated;
grant select on table public.event_ride_join_requests to authenticated;
grant select on table public.event_meetups to authenticated;
grant select on table public.event_meetup_members to authenticated;
grant select on table public.event_meetup_join_requests to authenticated;

revoke all on function public.mhidas_event_social_set_updated_at() from public, anon, authenticated;
revoke all on function public.mhidas_event_social_relationship_control_exists(uuid, uuid) from public, anon, authenticated;
revoke all on function public.mhidas_event_social_user_has_public_clubber(uuid) from public, anon, authenticated;
revoke all on function public.mhidas_event_social_event_is_active_public(uuid) from public, anon, authenticated;

revoke all on function public.mhidas_create_event_ride(
  uuid, text, text, text, text, timestamptz, timestamptz,
  integer, text, text, text, text, timestamptz
) from public, anon, authenticated;

revoke all on function public.mhidas_request_join_event_ride(
  uuid, integer, text
) from public, anon, authenticated;

revoke all on function public.mhidas_decide_event_ride_request(
  uuid, text
) from public, anon, authenticated;

revoke all on function public.mhidas_create_event_meetup(
  uuid, text, text, text, text, timestamptz, timestamptz,
  integer, text, text, timestamptz
) from public, anon, authenticated;

revoke all on function public.mhidas_request_join_event_meetup(
  uuid, text
) from public, anon, authenticated;

revoke all on function public.mhidas_decide_event_meetup_request(
  uuid, text
) from public, anon, authenticated;

grant execute on function public.mhidas_create_event_ride(
  uuid, text, text, text, text, timestamptz, timestamptz,
  integer, text, text, text, text, timestamptz
) to authenticated;

grant execute on function public.mhidas_request_join_event_ride(
  uuid, integer, text
) to authenticated;

grant execute on function public.mhidas_decide_event_ride_request(
  uuid, text
) to authenticated;

grant execute on function public.mhidas_create_event_meetup(
  uuid, text, text, text, text, timestamptz, timestamptz,
  integer, text, text, timestamptz
) to authenticated;

grant execute on function public.mhidas_request_join_event_meetup(
  uuid, text
) to authenticated;

grant execute on function public.mhidas_decide_event_meetup_request(
  uuid, text
) to authenticated;

do $$
declare
  v_missing_relations integer;
  v_rls_missing integer;
  v_anon_execute integer;
  v_authenticated_execute_missing integer;
begin
  select count(*)
  into v_missing_relations
  from (
    values
      ('event_rides'),
      ('event_ride_members'),
      ('event_ride_join_requests'),
      ('event_meetups'),
      ('event_meetup_members'),
      ('event_meetup_join_requests')
  ) as expected(relation_name)
  where to_regclass('public.' || expected.relation_name) is null;

  if v_missing_relations <> 0 then
    raise exception 'V4_8_138_REQUIRED_RELATION_MISSING';
  end if;

  select count(*)
  into v_rls_missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'event_rides',
      'event_ride_members',
      'event_ride_join_requests',
      'event_meetups',
      'event_meetup_members',
      'event_meetup_join_requests'
    )
    and c.relrowsecurity = false;

  if v_rls_missing <> 0 then
    raise exception 'V4_8_138_RLS_MISSING';
  end if;

  select count(*)
  into v_anon_execute
  from (
    values
      ('public.mhidas_create_event_ride(uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,integer,text,text,text,text,timestamp with time zone)'),
      ('public.mhidas_request_join_event_ride(uuid,integer,text)'),
      ('public.mhidas_decide_event_ride_request(uuid,text)'),
      ('public.mhidas_create_event_meetup(uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,integer,text,text,timestamp with time zone)'),
      ('public.mhidas_request_join_event_meetup(uuid,text)'),
      ('public.mhidas_decide_event_meetup_request(uuid,text)')
  ) as expected(signature)
  where has_function_privilege(
    'anon',
    expected.signature,
    'EXECUTE'
  );

  if v_anon_execute <> 0 then
    raise exception 'V4_8_138_ANON_RPC_EXECUTE_PRESENT';
  end if;

  select count(*)
  into v_authenticated_execute_missing
  from (
    values
      ('public.mhidas_create_event_ride(uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,integer,text,text,text,text,timestamp with time zone)'),
      ('public.mhidas_request_join_event_ride(uuid,integer,text)'),
      ('public.mhidas_decide_event_ride_request(uuid,text)'),
      ('public.mhidas_create_event_meetup(uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,integer,text,text,timestamp with time zone)'),
      ('public.mhidas_request_join_event_meetup(uuid,text)'),
      ('public.mhidas_decide_event_meetup_request(uuid,text)')
  ) as expected(signature)
  where not has_function_privilege(
    'authenticated',
    expected.signature,
    'EXECUTE'
  );

  if v_authenticated_execute_missing <> 0 then
    raise exception 'V4_8_138_AUTHENTICATED_RPC_EXECUTE_MISSING';
  end if;
end
$$;

commit;
