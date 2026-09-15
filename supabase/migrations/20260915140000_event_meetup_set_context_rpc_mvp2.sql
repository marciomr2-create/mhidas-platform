-- supabase/migrations/20260915140000_event_meetup_set_context_rpc_mvp2.sql
-- MHIDAS / USECLUBBERS
-- MVP2 - SOCIAL-4J-C - Meetup create RPC with optional canonical set context.
-- LOCAL ONLY. Do not apply to STAGING or Production without explicit approval.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

do $preflight$
begin
  if to_regclass('public.event_groups') is null then
    raise exception 'SOCIAL_4J_C_EVENT_GROUPS_MISSING';
  end if;

  if to_regclass('public.event_meetups') is null then
    raise exception 'SOCIAL_4J_C_EVENT_MEETUPS_MISSING';
  end if;

  if to_regclass('public.canonical_events') is null then
    raise exception 'SOCIAL_4J_C_CANONICAL_EVENTS_MISSING';
  end if;

  if to_regclass('public.canonical_event_sets') is null then
    raise exception 'SOCIAL_4J_C_CANONICAL_EVENT_SETS_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_meetups'
      and column_name = 'canonical_event_id'
      and data_type = 'uuid'
  ) then
    raise exception 'SOCIAL_4J_C_CANONICAL_EVENT_COLUMN_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_meetups'
      and column_name = 'set_id'
      and data_type = 'uuid'
  ) then
    raise exception 'SOCIAL_4J_C_SET_COLUMN_MISSING';
  end if;
end
$preflight$;

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
  p_expires_at timestamptz default null,
  p_canonical_event_id uuid default null,
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
  v_meetup_id uuid;
  v_visibility public.event_social_visibility;
  v_event_group_slug text;
  v_canonical_event_slug text;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
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

  if (
    (p_canonical_event_id is null and p_set_id is not null)
    or
    (p_canonical_event_id is not null and p_set_id is null)
  ) then
    raise exception 'canonical event and set must be provided together';
  end if;

  if p_set_id is not null then
    select lower(btrim(coalesce(eg.event_slug, '')))
    into v_event_group_slug
    from public.event_groups eg
    where eg.group_id = p_event_group_id
      and eg.status = 'active'
      and eg.is_public = true;

    select lower(btrim(coalesce(ce.slug, '')))
    into v_canonical_event_slug
    from public.canonical_event_sets ces
    join public.canonical_events ce
      on ce.id = ces.canonical_event_id
    where ces.set_id = p_set_id
      and ces.canonical_event_id = p_canonical_event_id
      and ces.publication_status = 'published'
      and ces.lifecycle_status <> 'cancelled'
      and ce.validation_status in ('validated', 'published')
      and ce.is_100_percent_validated = true;

    if v_canonical_event_slug is null
      or v_canonical_event_slug = ''
    then
      raise exception 'canonical event set not found';
    end if;

    if v_event_group_slug is null
      or v_event_group_slug = ''
      or v_event_group_slug <> v_canonical_event_slug
    then
      raise exception 'canonical event does not match event group';
    end if;
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

  if p_ends_at is not null
    and p_ends_at <= p_starts_at
  then
    raise exception 'ends_at must be after starts_at';
  end if;

  if p_max_members < 2
    or p_max_members > 250
  then
    raise exception 'max_members must be between 2 and 250';
  end if;

  begin
    v_visibility :=
      lower(btrim(coalesce(p_visibility, 'public')))
        ::public.event_social_visibility;
  exception
    when invalid_text_representation then
      raise exception 'invalid meetup visibility';
  end;

  insert into public.event_meetups (
    event_group_id,
    canonical_event_id,
    set_id,
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
    p_canonical_event_id,
    p_set_id,
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

revoke all on function public.mhidas_create_event_meetup(
  uuid, text, text, text, text, timestamptz, timestamptz,
  integer, text, text, timestamptz, uuid, uuid
) from public, anon, authenticated;

grant execute on function public.mhidas_create_event_meetup(
  uuid, text, text, text, text, timestamptz, timestamptz,
  integer, text, text, timestamptz, uuid, uuid
) to authenticated;

do $postflight$
declare
  v_global_bridge integer;
begin
  if to_regprocedure(
    'public.mhidas_create_event_meetup(uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,integer,text,text,timestamp with time zone,uuid,uuid)'
  ) is null then
    raise exception 'SOCIAL_4J_C_RPC_OVERLOAD_MISSING';
  end if;

  if has_function_privilege(
    'anon',
    'public.mhidas_create_event_meetup(uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,integer,text,text,timestamp with time zone,uuid,uuid)',
    'EXECUTE'
  ) then
    raise exception 'SOCIAL_4J_C_ANON_EXECUTE_PRESENT';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.mhidas_create_event_meetup(uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,integer,text,text,timestamp with time zone,uuid,uuid)',
    'EXECUTE'
  ) then
    raise exception 'SOCIAL_4J_C_AUTHENTICATED_EXECUTE_MISSING';
  end if;

  select count(*)
  into v_global_bridge
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'event_groups'
    and column_name in ('canonical_event_id', 'canonical_event_uuid');

  if v_global_bridge <> 0 then
    raise exception 'SOCIAL_4J_C_GLOBAL_BRIDGE_PRESENT';
  end if;
end
$postflight$;

commit;
