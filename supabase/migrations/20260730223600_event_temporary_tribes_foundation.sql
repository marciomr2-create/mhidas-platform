-- supabase/migrations/20260730223600_event_temporary_tribes_foundation.sql

begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'event_tribe_visibility'
  ) then
    create type public.event_tribe_visibility as enum (
      'public',
      'private'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'event_tribe_status'
  ) then
    create type public.event_tribe_status as enum (
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
      and t.typname = 'event_tribe_member_role'
  ) then
    create type public.event_tribe_member_role as enum (
      'creator',
      'organizer',
      'moderator',
      'member'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'event_tribe_member_status'
  ) then
    create type public.event_tribe_member_status as enum (
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
      and t.typname = 'event_tribe_join_request_status'
  ) then
    create type public.event_tribe_join_request_status as enum (
      'pending',
      'approved',
      'rejected',
      'cancelled'
    );
  end if;
end
$$;

create table if not exists public.event_tribes (
  tribe_id uuid primary key default gen_random_uuid(),
  event_group_id uuid not null
    references public.event_groups(group_id)
    on delete cascade,
  creator_user_id uuid not null
    references auth.users(id)
    on delete cascade,
  name text not null,
  description text,
  category text not null default 'custom',
  visibility public.event_tribe_visibility not null default 'public',
  max_members integer not null default 30,
  rules text,
  status public.event_tribe_status not null default 'active',
  expires_at timestamptz,
  closed_at timestamptz,
  archived_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_tribes_name_length_check
    check (char_length(btrim(name)) between 3 and 80),

  constraint event_tribes_description_length_check
    check (
      description is null
      or char_length(description) <= 360
    ),

  constraint event_tribes_category_check
    check (
      category ~ '^[a-z0-9_]{2,40}$'
    ),

  constraint event_tribes_max_members_check
    check (max_members between 2 and 250),

  constraint event_tribes_rules_length_check
    check (
      rules is null
      or char_length(rules) <= 2000
    ),

  constraint event_tribes_expiration_check
    check (
      expires_at is null
      or expires_at > created_at
    )
);

create table if not exists public.event_tribe_members (
  tribe_member_id uuid primary key default gen_random_uuid(),
  tribe_id uuid not null
    references public.event_tribes(tribe_id)
    on delete cascade,
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  role public.event_tribe_member_role not null default 'member',
  status public.event_tribe_member_status not null default 'approved',
  invited_by_user_id uuid
    references auth.users(id)
    on delete set null,
  status_changed_by_user_id uuid
    references auth.users(id)
    on delete set null,
  joined_at timestamptz,
  left_at timestamptz,
  status_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_tribe_members_unique_user
    unique (tribe_id, user_id),

  constraint event_tribe_members_creator_state_check
    check (
      role <> 'creator'
      or status = 'approved'
    )
);

create table if not exists public.event_tribe_join_requests (
  request_id uuid primary key default gen_random_uuid(),
  tribe_id uuid not null
    references public.event_tribes(tribe_id)
    on delete cascade,
  requester_user_id uuid not null
    references auth.users(id)
    on delete cascade,
  status public.event_tribe_join_request_status not null default 'pending',
  message text,
  decided_by_user_id uuid
    references auth.users(id)
    on delete set null,
  decided_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_tribe_join_requests_message_length_check
    check (
      message is null
      or char_length(message) <= 500
    )
);

create unique index if not exists event_tribes_active_name_unique_idx
  on public.event_tribes (
    event_group_id,
    lower(btrim(name))
  )
  where status in ('active', 'closed');

create index if not exists event_tribes_event_status_idx
  on public.event_tribes (
    event_group_id,
    status,
    visibility,
    created_at desc
  );

create index if not exists event_tribes_creator_status_idx
  on public.event_tribes (
    creator_user_id,
    status,
    created_at desc
  );

create index if not exists event_tribes_expiration_idx
  on public.event_tribes (
    expires_at
  )
  where status = 'active'
    and expires_at is not null;

create index if not exists event_tribe_members_tribe_status_idx
  on public.event_tribe_members (
    tribe_id,
    status,
    role,
    joined_at
  );

create index if not exists event_tribe_members_user_status_idx
  on public.event_tribe_members (
    user_id,
    status,
    updated_at desc
  );

create unique index if not exists event_tribe_join_requests_pending_unique_idx
  on public.event_tribe_join_requests (
    tribe_id,
    requester_user_id
  )
  where status = 'pending';

create index if not exists event_tribe_join_requests_tribe_status_idx
  on public.event_tribe_join_requests (
    tribe_id,
    status,
    created_at
  );

create index if not exists event_tribe_join_requests_requester_status_idx
  on public.event_tribe_join_requests (
    requester_user_id,
    status,
    created_at desc
  );

create or replace function public.mhidas_event_tribe_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists trg_event_tribes_updated_at
  on public.event_tribes;

create trigger trg_event_tribes_updated_at
before update on public.event_tribes
for each row
execute function public.mhidas_event_tribe_set_updated_at();

drop trigger if exists trg_event_tribe_members_updated_at
  on public.event_tribe_members;

create trigger trg_event_tribe_members_updated_at
before update on public.event_tribe_members
for each row
execute function public.mhidas_event_tribe_set_updated_at();

drop trigger if exists trg_event_tribe_join_requests_updated_at
  on public.event_tribe_join_requests;

create trigger trg_event_tribe_join_requests_updated_at
before update on public.event_tribe_join_requests
for each row
execute function public.mhidas_event_tribe_set_updated_at();

create or replace function public.mhidas_event_tribe_relationship_control_exists(
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

create or replace function public.mhidas_event_tribe_user_has_public_clubber(
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

create or replace function public.mhidas_event_tribe_user_is_approved_member(
  p_tribe_id uuid,
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
    from public.event_tribe_members etm
    where etm.tribe_id = p_tribe_id
      and etm.user_id = p_user_id
      and etm.status = 'approved'
  );
$function$;

create or replace function public.mhidas_event_tribe_user_is_manager(
  p_tribe_id uuid,
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
    from public.event_tribe_members etm
    where etm.tribe_id = p_tribe_id
      and etm.user_id = p_user_id
      and etm.status = 'approved'
      and etm.role in ('creator', 'organizer', 'moderator')
  );
$function$;

create or replace function public.mhidas_event_tribe_viewer_is_approved_member(
  p_tribe_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select public.mhidas_event_tribe_user_is_approved_member(
    p_tribe_id,
    auth.uid()
  );
$function$;

create or replace function public.mhidas_event_tribe_viewer_is_manager(
  p_tribe_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select public.mhidas_event_tribe_user_is_manager(
    p_tribe_id,
    auth.uid()
  );
$function$;

create or replace function public.mhidas_event_tribe_viewer_can_read(
  p_tribe_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.event_tribes et
    where et.tribe_id = p_tribe_id
      and (
        (
          et.visibility = 'public'
          and et.status = 'active'
          and (
            et.expires_at is null
            or et.expires_at > now()
          )
        )
        or et.creator_user_id = auth.uid()
        or public.mhidas_event_tribe_user_is_approved_member(
          et.tribe_id,
          auth.uid()
        )
        or exists (
          select 1
          from public.event_tribe_join_requests etjr
          where etjr.tribe_id = et.tribe_id
            and etjr.requester_user_id = auth.uid()
            and etjr.status = 'pending'
        )
      )
  );
$function$;

create or replace function public.mhidas_create_event_tribe(
  p_event_group_id uuid,
  p_name text,
  p_description text default null,
  p_category text default 'custom',
  p_visibility text default 'public',
  p_max_members integer default 30,
  p_rules text default null,
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
  v_tribe_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_category text := lower(btrim(coalesce(p_category, 'custom')));
  v_rules text := nullif(btrim(coalesce(p_rules, '')), '');
  v_visibility public.event_tribe_visibility;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_event_group_id is null then
    raise exception 'event_group_id required';
  end if;

  if char_length(v_name) < 3 or char_length(v_name) > 80 then
    raise exception 'tribe name must contain 3 to 80 characters';
  end if;

  if v_description is not null
    and char_length(v_description) > 360
  then
    raise exception 'tribe description exceeds 360 characters';
  end if;

  if v_category !~ '^[a-z0-9_]{2,40}$' then
    raise exception 'invalid tribe category';
  end if;

  if p_max_members is null
    or p_max_members < 2
    or p_max_members > 250
  then
    raise exception 'max_members must be between 2 and 250';
  end if;

  if v_rules is not null
    and char_length(v_rules) > 2000
  then
    raise exception 'tribe rules exceed 2000 characters';
  end if;

  if p_expires_at is not null
    and p_expires_at <= now()
  then
    raise exception 'expires_at must be in the future';
  end if;

  begin
    v_visibility := lower(btrim(coalesce(p_visibility, 'public')))
      ::public.event_tribe_visibility;
  exception
    when invalid_text_representation then
      raise exception 'invalid tribe visibility';
  end;

  if not public.mhidas_event_tribe_user_has_public_clubber(
    v_actor_user_id
  ) then
    raise exception 'active published Clubber profile required';
  end if;

  if not exists (
    select 1
    from public.event_groups eg
    where eg.group_id = p_event_group_id
      and eg.status = 'active'
      and eg.is_public = true
  ) then
    raise exception 'active public event not found';
  end if;

  insert into public.event_tribes (
    event_group_id,
    creator_user_id,
    name,
    description,
    category,
    visibility,
    max_members,
    rules,
    status,
    expires_at
  )
  values (
    p_event_group_id,
    v_actor_user_id,
    v_name,
    v_description,
    v_category,
    v_visibility,
    p_max_members,
    v_rules,
    'active',
    p_expires_at
  )
  returning tribe_id
  into v_tribe_id;

  insert into public.event_tribe_members (
    tribe_id,
    user_id,
    role,
    status,
    status_changed_by_user_id,
    joined_at,
    status_changed_at
  )
  values (
    v_tribe_id,
    v_actor_user_id,
    'creator',
    'approved',
    v_actor_user_id,
    now(),
    now()
  );

  return v_tribe_id;
exception
  when unique_violation then
    raise exception 'an active tribe with this name already exists for the event';
end;
$function$;

create or replace function public.mhidas_update_event_tribe(
  p_tribe_id uuid,
  p_name text,
  p_description text default null,
  p_category text default 'custom',
  p_visibility text default 'public',
  p_max_members integer default 30,
  p_rules text default null,
  p_expires_at timestamptz default null
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_actor_role public.event_tribe_member_role;
  v_current_status public.event_tribe_status;
  v_approved_count integer;
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_category text := lower(btrim(coalesce(p_category, 'custom')));
  v_rules text := nullif(btrim(coalesce(p_rules, '')), '');
  v_visibility public.event_tribe_visibility;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  select etm.role
  into v_actor_role
  from public.event_tribe_members etm
  where etm.tribe_id = p_tribe_id
    and etm.user_id = v_actor_user_id
    and etm.status = 'approved'
  for update;

  if v_actor_role is null
    or v_actor_role not in ('creator', 'organizer')
  then
    raise exception 'tribe creator or organizer required';
  end if;

  select et.status
  into v_current_status
  from public.event_tribes et
  where et.tribe_id = p_tribe_id
  for update;

  if v_current_status is null then
    raise exception 'tribe not found';
  end if;

  if v_current_status in ('archived', 'cancelled') then
    raise exception 'archived or cancelled tribe cannot be edited';
  end if;

  if char_length(v_name) < 3 or char_length(v_name) > 80 then
    raise exception 'tribe name must contain 3 to 80 characters';
  end if;

  if v_description is not null
    and char_length(v_description) > 360
  then
    raise exception 'tribe description exceeds 360 characters';
  end if;

  if v_category !~ '^[a-z0-9_]{2,40}$' then
    raise exception 'invalid tribe category';
  end if;

  if p_max_members is null
    or p_max_members < 2
    or p_max_members > 250
  then
    raise exception 'max_members must be between 2 and 250';
  end if;

  select count(*)::integer
  into v_approved_count
  from public.event_tribe_members etm
  where etm.tribe_id = p_tribe_id
    and etm.status = 'approved';

  if p_max_members < v_approved_count then
    raise exception 'max_members cannot be lower than approved members';
  end if;

  if v_rules is not null
    and char_length(v_rules) > 2000
  then
    raise exception 'tribe rules exceed 2000 characters';
  end if;

  if p_expires_at is not null
    and p_expires_at <= now()
  then
    raise exception 'expires_at must be in the future';
  end if;

  begin
    v_visibility := lower(btrim(coalesce(p_visibility, 'public')))
      ::public.event_tribe_visibility;
  exception
    when invalid_text_representation then
      raise exception 'invalid tribe visibility';
  end;

  update public.event_tribes
  set
    name = v_name,
    description = v_description,
    category = v_category,
    visibility = v_visibility,
    max_members = p_max_members,
    rules = v_rules,
    expires_at = p_expires_at
  where tribe_id = p_tribe_id;

  return found;
exception
  when unique_violation then
    raise exception 'an active tribe with this name already exists for the event';
end;
$function$;

create or replace function public.mhidas_request_join_event_tribe(
  p_tribe_id uuid,
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
  v_status public.event_tribe_status;
  v_expires_at timestamptz;
  v_max_members integer;
  v_approved_count integer;
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_existing_member_status public.event_tribe_member_status;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if v_message is not null
    and char_length(v_message) > 500
  then
    raise exception 'join request message exceeds 500 characters';
  end if;

  if not public.mhidas_event_tribe_user_has_public_clubber(
    v_actor_user_id
  ) then
    raise exception 'active published Clubber profile required';
  end if;

  select
    et.creator_user_id,
    et.status,
    et.expires_at,
    et.max_members
  into
    v_creator_user_id,
    v_status,
    v_expires_at,
    v_max_members
  from public.event_tribes et
  where et.tribe_id = p_tribe_id
  for update;

  if v_creator_user_id is null then
    raise exception 'tribe not found';
  end if;

  if v_status <> 'active' then
    raise exception 'tribe is not accepting requests';
  end if;

  if v_expires_at is not null
    and v_expires_at <= now()
  then
    raise exception 'tribe has expired';
  end if;

  if v_creator_user_id = v_actor_user_id then
    raise exception 'tribe creator is already a member';
  end if;

  if exists (
    select 1
    from public.event_tribe_members manager_member
    where manager_member.tribe_id = p_tribe_id
      and manager_member.status = 'approved'
      and manager_member.role in ('creator', 'organizer', 'moderator')
      and public.mhidas_event_tribe_relationship_control_exists(
        v_actor_user_id,
        manager_member.user_id
      )
  ) then
    raise exception 'relationship control prevents this request';
  end if;

  select etm.status
  into v_existing_member_status
  from public.event_tribe_members etm
  where etm.tribe_id = p_tribe_id
    and etm.user_id = v_actor_user_id
  for update;

  if v_existing_member_status = 'approved' then
    raise exception 'user is already an approved tribe member';
  end if;

  if v_existing_member_status = 'blocked' then
    raise exception 'user is blocked from this tribe';
  end if;

  select count(*)::integer
  into v_approved_count
  from public.event_tribe_members etm
  where etm.tribe_id = p_tribe_id
    and etm.status = 'approved';

  if v_approved_count >= v_max_members then
    raise exception 'tribe member limit reached';
  end if;

  select etjr.request_id
  into v_request_id
  from public.event_tribe_join_requests etjr
  where etjr.tribe_id = p_tribe_id
    and etjr.requester_user_id = v_actor_user_id
    and etjr.status = 'pending'
  limit 1;

  if v_request_id is not null then
    return v_request_id;
  end if;

  insert into public.event_tribe_join_requests (
    tribe_id,
    requester_user_id,
    status,
    message
  )
  values (
    p_tribe_id,
    v_actor_user_id,
    'pending',
    v_message
  )
  returning request_id
  into v_request_id;

  return v_request_id;
exception
  when unique_violation then
    select etjr.request_id
    into v_request_id
    from public.event_tribe_join_requests etjr
    where etjr.tribe_id = p_tribe_id
      and etjr.requester_user_id = v_actor_user_id
      and etjr.status = 'pending'
    limit 1;

    if v_request_id is null then
      raise;
    end if;

    return v_request_id;
end;
$function$;

create or replace function public.mhidas_cancel_event_tribe_join_request(
  p_request_id uuid
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

  update public.event_tribe_join_requests
  set
    status = 'cancelled',
    cancelled_at = now()
  where request_id = p_request_id
    and requester_user_id = v_actor_user_id
    and status = 'pending';

  return found;
end;
$function$;

create or replace function public.mhidas_decide_event_tribe_join_request(
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
  v_decision public.event_tribe_join_request_status;
  v_tribe_id uuid;
  v_requester_user_id uuid;
  v_request_status public.event_tribe_join_request_status;
  v_tribe_status public.event_tribe_status;
  v_expires_at timestamptz;
  v_max_members integer;
  v_approved_count integer;
  v_existing_member_status public.event_tribe_member_status;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if lower(btrim(coalesce(p_decision, ''))) not in (
    'approved',
    'rejected'
  ) then
    raise exception 'decision must be approved or rejected';
  end if;

  v_decision := lower(btrim(p_decision))
    ::public.event_tribe_join_request_status;

  select
    etjr.tribe_id,
    etjr.requester_user_id,
    etjr.status
  into
    v_tribe_id,
    v_requester_user_id,
    v_request_status
  from public.event_tribe_join_requests etjr
  where etjr.request_id = p_request_id
  for update;

  if v_tribe_id is null then
    raise exception 'join request not found';
  end if;

  if v_request_status <> 'pending' then
    raise exception 'join request is no longer pending';
  end if;

  if not public.mhidas_event_tribe_user_is_manager(
    v_tribe_id,
    v_actor_user_id
  ) then
    raise exception 'tribe manager required';
  end if;

  if v_requester_user_id = v_actor_user_id then
    raise exception 'self approval is not allowed';
  end if;

  select
    et.status,
    et.expires_at,
    et.max_members
  into
    v_tribe_status,
    v_expires_at,
    v_max_members
  from public.event_tribes et
  where et.tribe_id = v_tribe_id
  for update;

  if v_decision = 'approved' then
    if v_tribe_status <> 'active' then
      raise exception 'tribe is not accepting members';
    end if;

    if v_expires_at is not null
      and v_expires_at <= now()
    then
      raise exception 'tribe has expired';
    end if;

    if not public.mhidas_event_tribe_user_has_public_clubber(
      v_requester_user_id
    ) then
      raise exception 'requester no longer has a published Clubber profile';
    end if;

    if exists (
      select 1
      from public.event_tribe_members manager_member
      where manager_member.tribe_id = v_tribe_id
        and manager_member.status = 'approved'
        and manager_member.role in ('creator', 'organizer', 'moderator')
        and public.mhidas_event_tribe_relationship_control_exists(
          v_requester_user_id,
          manager_member.user_id
        )
    ) then
      raise exception 'relationship control prevents approval';
    end if;

    select etm.status
    into v_existing_member_status
    from public.event_tribe_members etm
    where etm.tribe_id = v_tribe_id
      and etm.user_id = v_requester_user_id
    for update;

    if v_existing_member_status = 'blocked' then
      raise exception 'requester is blocked from this tribe';
    end if;

    select count(*)::integer
    into v_approved_count
    from public.event_tribe_members etm
    where etm.tribe_id = v_tribe_id
      and etm.status = 'approved';

    if v_approved_count >= v_max_members then
      raise exception 'tribe member limit reached';
    end if;

    insert into public.event_tribe_members (
      tribe_id,
      user_id,
      role,
      status,
      status_changed_by_user_id,
      joined_at,
      status_changed_at
    )
    values (
      v_tribe_id,
      v_requester_user_id,
      'member',
      'approved',
      v_actor_user_id,
      now(),
      now()
    )
    on conflict (tribe_id, user_id)
    do update set
      role = case
        when public.event_tribe_members.role = 'creator'
          then public.event_tribe_members.role
        else 'member'::public.event_tribe_member_role
      end,
      status = 'approved',
      status_changed_by_user_id = v_actor_user_id,
      joined_at = coalesce(
        public.event_tribe_members.joined_at,
        now()
      ),
      left_at = null,
      status_changed_at = now();
  end if;

  update public.event_tribe_join_requests
  set
    status = v_decision,
    decided_by_user_id = v_actor_user_id,
    decided_at = now(),
    cancelled_at = null
  where request_id = p_request_id;

  return true;
end;
$function$;

create or replace function public.mhidas_leave_event_tribe(
  p_tribe_id uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_role public.event_tribe_member_role;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  select etm.role
  into v_role
  from public.event_tribe_members etm
  where etm.tribe_id = p_tribe_id
    and etm.user_id = v_actor_user_id
    and etm.status = 'approved'
  for update;

  if v_role is null then
    raise exception 'approved tribe membership not found';
  end if;

  if v_role = 'creator' then
    raise exception 'tribe creator cannot leave without closing or archiving';
  end if;

  update public.event_tribe_members
  set
    role = 'member',
    status = 'left',
    status_changed_by_user_id = v_actor_user_id,
    left_at = now(),
    status_changed_at = now()
  where tribe_id = p_tribe_id
    and user_id = v_actor_user_id
    and status = 'approved';

  return found;
end;
$function$;

create or replace function public.mhidas_remove_event_tribe_member(
  p_tribe_id uuid,
  p_member_user_id uuid,
  p_block boolean default false
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_actor_role public.event_tribe_member_role;
  v_target_role public.event_tribe_member_role;
  v_target_status public.event_tribe_member_status;
  v_next_status public.event_tribe_member_status;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_member_user_id is null then
    raise exception 'member_user_id required';
  end if;

  if p_member_user_id = v_actor_user_id then
    raise exception 'use the leave operation for your own membership';
  end if;

  select etm.role
  into v_actor_role
  from public.event_tribe_members etm
  where etm.tribe_id = p_tribe_id
    and etm.user_id = v_actor_user_id
    and etm.status = 'approved'
  for update;

  if v_actor_role is null
    or v_actor_role not in ('creator', 'organizer', 'moderator')
  then
    raise exception 'tribe manager required';
  end if;

  select
    etm.role,
    etm.status
  into
    v_target_role,
    v_target_status
  from public.event_tribe_members etm
  where etm.tribe_id = p_tribe_id
    and etm.user_id = p_member_user_id
  for update;

  if v_target_role is null then
    raise exception 'tribe member not found';
  end if;

  if v_target_role = 'creator' then
    raise exception 'tribe creator cannot be removed';
  end if;

  if v_actor_role = 'moderator'
    and v_target_role <> 'member'
  then
    raise exception 'moderator can remove members only';
  end if;

  if v_actor_role = 'organizer'
    and v_target_role = 'organizer'
  then
    raise exception 'organizer cannot remove another organizer';
  end if;

  v_next_status := case
    when coalesce(p_block, false)
      then 'blocked'::public.event_tribe_member_status
    else 'removed'::public.event_tribe_member_status
  end;

  update public.event_tribe_members
  set
    role = 'member',
    status = v_next_status,
    status_changed_by_user_id = v_actor_user_id,
    left_at = now(),
    status_changed_at = now()
  where tribe_id = p_tribe_id
    and user_id = p_member_user_id;

  update public.event_tribe_join_requests
  set
    status = 'rejected',
    decided_by_user_id = v_actor_user_id,
    decided_at = now()
  where tribe_id = p_tribe_id
    and requester_user_id = p_member_user_id
    and status = 'pending';

  return true;
end;
$function$;

create or replace function public.mhidas_set_event_tribe_member_role(
  p_tribe_id uuid,
  p_member_user_id uuid,
  p_role text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_target_role public.event_tribe_member_role;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.event_tribe_members etm
    where etm.tribe_id = p_tribe_id
      and etm.user_id = v_actor_user_id
      and etm.role = 'creator'
      and etm.status = 'approved'
  ) then
    raise exception 'tribe creator required';
  end if;

  if p_member_user_id = v_actor_user_id then
    raise exception 'creator role cannot be changed';
  end if;

  if lower(btrim(coalesce(p_role, ''))) not in (
    'organizer',
    'moderator',
    'member'
  ) then
    raise exception 'invalid tribe member role';
  end if;

  v_target_role := lower(btrim(p_role))
    ::public.event_tribe_member_role;

  update public.event_tribe_members
  set
    role = v_target_role,
    status_changed_by_user_id = v_actor_user_id,
    status_changed_at = now()
  where tribe_id = p_tribe_id
    and user_id = p_member_user_id
    and status = 'approved'
    and role <> 'creator';

  if not found then
    raise exception 'approved tribe member not found';
  end if;

  return true;
end;
$function$;

create or replace function public.mhidas_set_event_tribe_status(
  p_tribe_id uuid,
  p_status text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_actor_role public.event_tribe_member_role;
  v_current_status public.event_tribe_status;
  v_next_status public.event_tribe_status;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if lower(btrim(coalesce(p_status, ''))) not in (
    'active',
    'closed',
    'archived',
    'cancelled'
  ) then
    raise exception 'invalid tribe status';
  end if;

  v_next_status := lower(btrim(p_status))
    ::public.event_tribe_status;

  select etm.role
  into v_actor_role
  from public.event_tribe_members etm
  where etm.tribe_id = p_tribe_id
    and etm.user_id = v_actor_user_id
    and etm.status = 'approved'
  for update;

  if v_actor_role is null
    or v_actor_role not in ('creator', 'organizer')
  then
    raise exception 'tribe creator or organizer required';
  end if;

  select et.status
  into v_current_status
  from public.event_tribes et
  where et.tribe_id = p_tribe_id
  for update;

  if v_current_status is null then
    raise exception 'tribe not found';
  end if;

  if v_current_status in ('archived', 'cancelled') then
    raise exception 'archived or cancelled tribe status is final';
  end if;

  if v_actor_role = 'organizer'
    and v_next_status not in ('active', 'closed')
  then
    raise exception 'organizer can activate or close the tribe only';
  end if;

  update public.event_tribes
  set
    status = v_next_status,
    closed_at = case
      when v_next_status = 'closed' then now()
      when v_next_status = 'active' then null
      else closed_at
    end,
    archived_at = case
      when v_next_status = 'archived' then now()
      else archived_at
    end,
    cancelled_at = case
      when v_next_status = 'cancelled' then now()
      else cancelled_at
    end
  where tribe_id = p_tribe_id;

  return found;
end;
$function$;

alter table public.event_tribes
  enable row level security;

alter table public.event_tribe_members
  enable row level security;

alter table public.event_tribe_join_requests
  enable row level security;

drop policy if exists event_tribes_select_visible
  on public.event_tribes;

create policy event_tribes_select_visible
on public.event_tribes
for select
to authenticated
using (
  public.mhidas_event_tribe_viewer_can_read(tribe_id)
);

drop policy if exists event_tribe_members_select_self_or_manager
  on public.event_tribe_members;

create policy event_tribe_members_select_self_or_manager
on public.event_tribe_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.mhidas_event_tribe_viewer_is_manager(tribe_id)
);

drop policy if exists event_tribe_join_requests_select_self_or_manager
  on public.event_tribe_join_requests;

create policy event_tribe_join_requests_select_self_or_manager
on public.event_tribe_join_requests
for select
to authenticated
using (
  requester_user_id = auth.uid()
  or public.mhidas_event_tribe_viewer_is_manager(tribe_id)
);

revoke all on table public.event_tribes
  from public, anon, authenticated;

revoke all on table public.event_tribe_members
  from public, anon, authenticated;

revoke all on table public.event_tribe_join_requests
  from public, anon, authenticated;

grant select on table public.event_tribes
  to authenticated;

grant select on table public.event_tribe_members
  to authenticated;

grant select on table public.event_tribe_join_requests
  to authenticated;

grant all on table public.event_tribes
  to service_role;

grant all on table public.event_tribe_members
  to service_role;

grant all on table public.event_tribe_join_requests
  to service_role;

revoke all on function public.mhidas_event_tribe_set_updated_at()
  from public, anon, authenticated, service_role;

revoke all on function public.mhidas_event_tribe_relationship_control_exists(
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.mhidas_event_tribe_user_has_public_clubber(
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.mhidas_event_tribe_user_is_approved_member(
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.mhidas_event_tribe_user_is_manager(
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.mhidas_event_tribe_viewer_is_approved_member(
  uuid
) from public, anon;

revoke all on function public.mhidas_event_tribe_viewer_is_manager(
  uuid
) from public, anon;

revoke all on function public.mhidas_event_tribe_viewer_can_read(
  uuid
) from public, anon;

grant execute on function public.mhidas_event_tribe_viewer_is_approved_member(
  uuid
) to authenticated, service_role;

grant execute on function public.mhidas_event_tribe_viewer_is_manager(
  uuid
) to authenticated, service_role;

grant execute on function public.mhidas_event_tribe_viewer_can_read(
  uuid
) to authenticated, service_role;

revoke all on function public.mhidas_create_event_tribe(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  text,
  timestamptz
) from public, anon;

revoke all on function public.mhidas_update_event_tribe(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  text,
  timestamptz
) from public, anon;

revoke all on function public.mhidas_request_join_event_tribe(
  uuid,
  text
) from public, anon;

revoke all on function public.mhidas_cancel_event_tribe_join_request(
  uuid
) from public, anon;

revoke all on function public.mhidas_decide_event_tribe_join_request(
  uuid,
  text
) from public, anon;

revoke all on function public.mhidas_leave_event_tribe(
  uuid
) from public, anon;

revoke all on function public.mhidas_remove_event_tribe_member(
  uuid,
  uuid,
  boolean
) from public, anon;

revoke all on function public.mhidas_set_event_tribe_member_role(
  uuid,
  uuid,
  text
) from public, anon;

revoke all on function public.mhidas_set_event_tribe_status(
  uuid,
  text
) from public, anon;

grant execute on function public.mhidas_create_event_tribe(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  text,
  timestamptz
) to authenticated, service_role;

grant execute on function public.mhidas_update_event_tribe(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  text,
  timestamptz
) to authenticated, service_role;

grant execute on function public.mhidas_request_join_event_tribe(
  uuid,
  text
) to authenticated, service_role;

grant execute on function public.mhidas_cancel_event_tribe_join_request(
  uuid
) to authenticated, service_role;

grant execute on function public.mhidas_decide_event_tribe_join_request(
  uuid,
  text
) to authenticated, service_role;

grant execute on function public.mhidas_leave_event_tribe(
  uuid
) to authenticated, service_role;

grant execute on function public.mhidas_remove_event_tribe_member(
  uuid,
  uuid,
  boolean
) to authenticated, service_role;

grant execute on function public.mhidas_set_event_tribe_member_role(
  uuid,
  uuid,
  text
) to authenticated, service_role;

grant execute on function public.mhidas_set_event_tribe_status(
  uuid,
  text
) to authenticated, service_role;

comment on table public.event_tribes is
  'Temporary social tribes tied to a persisted event_group. Separate from legacy ride and meet groups.';

comment on table public.event_tribe_members is
  'Approved, departed, removed, or blocked memberships for temporary event tribes.';

comment on table public.event_tribe_join_requests is
  'Private join requests visible only to the requester and tribe managers.';

comment on column public.event_tribes.event_group_id is
  'Persisted event container in public.event_groups. This is not a canonical_event bridge.';

comment on column public.event_tribes.visibility is
  'Discovery visibility only. Both public and private tribes require manager approval in this foundation.';

comment on column public.event_tribes.expires_at is
  'Optional automatic cutoff used to stop new join requests without deleting tribe history.';

comment on column public.event_tribe_members.status is
  'Membership lifecycle. Pending requests are stored separately in event_tribe_join_requests.';

do $$
declare
  v_labels text[];
begin
  if to_regclass('public.event_tribes') is null
    or to_regclass('public.event_tribe_members') is null
    or to_regclass('public.event_tribe_join_requests') is null
  then
    raise exception 'V4_8_137_TRIBE_RELATION_MISSING';
  end if;

  select array_agg(e.enumlabel order by e.enumsortorder)
  into v_labels
  from pg_type t
  join pg_namespace n
    on n.oid = t.typnamespace
  join pg_enum e
    on e.enumtypid = t.oid
  where n.nspname = 'public'
    and t.typname = 'event_tribe_visibility';

  if v_labels <> array['public', 'private'] then
    raise exception 'V4_8_137_VISIBILITY_ENUM_DRIFT';
  end if;

  select array_agg(e.enumlabel order by e.enumsortorder)
  into v_labels
  from pg_type t
  join pg_namespace n
    on n.oid = t.typnamespace
  join pg_enum e
    on e.enumtypid = t.oid
  where n.nspname = 'public'
    and t.typname = 'event_tribe_status';

  if v_labels <> array['active', 'closed', 'archived', 'cancelled'] then
    raise exception 'V4_8_137_STATUS_ENUM_DRIFT';
  end if;

  select array_agg(e.enumlabel order by e.enumsortorder)
  into v_labels
  from pg_type t
  join pg_namespace n
    on n.oid = t.typnamespace
  join pg_enum e
    on e.enumtypid = t.oid
  where n.nspname = 'public'
    and t.typname = 'event_tribe_member_role';

  if v_labels <> array['creator', 'organizer', 'moderator', 'member'] then
    raise exception 'V4_8_137_MEMBER_ROLE_ENUM_DRIFT';
  end if;

  select array_agg(e.enumlabel order by e.enumsortorder)
  into v_labels
  from pg_type t
  join pg_namespace n
    on n.oid = t.typnamespace
  join pg_enum e
    on e.enumtypid = t.oid
  where n.nspname = 'public'
    and t.typname = 'event_tribe_member_status';

  if v_labels <> array['approved', 'left', 'removed', 'blocked'] then
    raise exception 'V4_8_137_MEMBER_STATUS_ENUM_DRIFT';
  end if;

  select array_agg(e.enumlabel order by e.enumsortorder)
  into v_labels
  from pg_type t
  join pg_namespace n
    on n.oid = t.typnamespace
  join pg_enum e
    on e.enumtypid = t.oid
  where n.nspname = 'public'
    and t.typname = 'event_tribe_join_request_status';

  if v_labels <> array['pending', 'approved', 'rejected', 'cancelled'] then
    raise exception 'V4_8_137_REQUEST_STATUS_ENUM_DRIFT';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'event_tribes'
      and c.relrowsecurity = true
  ) then
    raise exception 'V4_8_137_EVENT_TRIBES_RLS_DISABLED';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'event_tribe_members'
      and c.relrowsecurity = true
  ) then
    raise exception 'V4_8_137_EVENT_TRIBE_MEMBERS_RLS_DISABLED';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'event_tribe_join_requests'
      and c.relrowsecurity = true
  ) then
    raise exception 'V4_8_137_EVENT_TRIBE_REQUESTS_RLS_DISABLED';
  end if;

  if has_table_privilege(
    'anon',
    'public.event_tribes',
    'SELECT'
  ) or has_table_privilege(
    'anon',
    'public.event_tribe_members',
    'SELECT'
  ) or has_table_privilege(
    'anon',
    'public.event_tribe_join_requests',
    'SELECT'
  ) then
    raise exception 'V4_8_137_ANON_TABLE_ACCESS_DRIFT';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.event_tribes',
    'INSERT'
  ) or has_table_privilege(
    'authenticated',
    'public.event_tribes',
    'UPDATE'
  ) or has_table_privilege(
    'authenticated',
    'public.event_tribes',
    'DELETE'
  ) or has_table_privilege(
    'authenticated',
    'public.event_tribe_members',
    'INSERT'
  ) or has_table_privilege(
    'authenticated',
    'public.event_tribe_members',
    'UPDATE'
  ) or has_table_privilege(
    'authenticated',
    'public.event_tribe_members',
    'DELETE'
  ) or has_table_privilege(
    'authenticated',
    'public.event_tribe_join_requests',
    'INSERT'
  ) or has_table_privilege(
    'authenticated',
    'public.event_tribe_join_requests',
    'UPDATE'
  ) or has_table_privilege(
    'authenticated',
    'public.event_tribe_join_requests',
    'DELETE'
  ) then
    raise exception 'V4_8_137_DIRECT_MUTATION_GRANT_DRIFT';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.event_tribes',
    'SELECT'
  ) or not has_table_privilege(
    'authenticated',
    'public.event_tribe_members',
    'SELECT'
  ) or not has_table_privilege(
    'authenticated',
    'public.event_tribe_join_requests',
    'SELECT'
  ) then
    raise exception 'V4_8_137_AUTHENTICATED_SELECT_MISSING';
  end if;

  if has_function_privilege(
    'anon',
    'public.mhidas_create_event_tribe(uuid,text,text,text,text,integer,text,timestamp with time zone)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.mhidas_request_join_event_tribe(uuid,text)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.mhidas_decide_event_tribe_join_request(uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'V4_8_137_ANON_RPC_EXECUTE_DRIFT';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.mhidas_create_event_tribe(uuid,text,text,text,text,integer,text,timestamp with time zone)',
    'EXECUTE'
  ) or not has_function_privilege(
    'authenticated',
    'public.mhidas_request_join_event_tribe(uuid,text)',
    'EXECUTE'
  ) or not has_function_privilege(
    'authenticated',
    'public.mhidas_decide_event_tribe_join_request(uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'V4_8_137_AUTHENTICATED_RPC_EXECUTE_MISSING';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conname = 'event_tribes_event_group_id_fkey'
      and c.conrelid = 'public.event_tribes'::regclass
  ) then
    raise exception 'V4_8_137_EVENT_GROUP_FK_MISSING';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conname = 'event_tribe_members_unique_user'
      and c.conrelid = 'public.event_tribe_members'::regclass
  ) then
    raise exception 'V4_8_137_MEMBER_UNIQUE_CONSTRAINT_MISSING';
  end if;

  if not exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'event_tribes'
      and p.policyname = 'event_tribes_select_visible'
      and p.cmd = 'SELECT'
  ) then
    raise exception 'V4_8_137_TRIBE_SELECT_POLICY_MISSING';
  end if;

  if not exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'event_tribe_members'
      and p.policyname = 'event_tribe_members_select_self_or_manager'
      and p.cmd = 'SELECT'
  ) then
    raise exception 'V4_8_137_MEMBER_SELECT_POLICY_MISSING';
  end if;

  if not exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'event_tribe_join_requests'
      and p.policyname = 'event_tribe_join_requests_select_self_or_manager'
      and p.cmd = 'SELECT'
  ) then
    raise exception 'V4_8_137_REQUEST_SELECT_POLICY_MISSING';
  end if;
end
$$;

commit;
