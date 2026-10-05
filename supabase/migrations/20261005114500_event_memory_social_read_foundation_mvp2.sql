-- MHIDAS / USECLUBBERS
-- MVP2 — PASSO 7 — Memoria do Evento
-- Historical social memory read foundation.
--
-- Scope:
-- - authenticated user's own historical participation only;
-- - event_group scoped;
-- - no other-member lists;
-- - no GPS/location history;
-- - no meeting-point details;
-- - no ride origin/destination;
-- - no canonical_events <-> event_groups global bridge.

begin;

do $$
begin
  if to_regclass('public.event_tribes') is null
    or to_regclass('public.event_tribe_members') is null
    or to_regclass('public.event_rides') is null
    or to_regclass('public.event_ride_members') is null
    or to_regclass('public.event_meetups') is null
    or to_regclass('public.event_meetup_members') is null
  then
    raise exception
      'EVENT_MEMORY_SOCIAL_REQUIRED_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_read_my_event_memory_social_v1(uuid)'
  ) is not null then
    raise exception
      'EVENT_MEMORY_SOCIAL_FUNCTION_ALREADY_EXISTS';
  end if;
end
$$;

create function public.mhidas_read_my_event_memory_social_v1(
  p_event_group_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();

  v_tribes jsonb := '[]'::jsonb;
  v_rides jsonb := '[]'::jsonb;
  v_meetups jsonb := '[]'::jsonb;
begin
  if v_actor_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'event_memory_auth_required';
  end if;

  if p_event_group_id is null then
    raise exception using
      errcode = '22023',
      message = 'event_memory_event_group_required';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'tribe_id', et.tribe_id,
        'name', et.name,
        'role', etm.role,
        'membership_status', etm.status,
        'joined_at', etm.joined_at,
        'left_at', etm.left_at,
        'tribe_status', et.status
      )
      order by
        coalesce(etm.joined_at, et.created_at),
        et.created_at,
        et.tribe_id
    ),
    '[]'::jsonb
  )
  into v_tribes
  from public.event_tribes et
  left join public.event_tribe_members etm
    on etm.tribe_id = et.tribe_id
   and etm.user_id = v_actor_user_id
  where et.event_group_id = p_event_group_id
    and (
      et.creator_user_id = v_actor_user_id
      or etm.user_id = v_actor_user_id
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ride_id', er.ride_id,
        'mode', er.mode,
        'direction', er.direction,
        'departure_at', er.departure_at,
        'return_at', er.return_at,
        'role', erm.role,
        'membership_status', erm.status,
        'joined_at', erm.joined_at,
        'left_at', erm.left_at,
        'ride_status', er.status
      )
      order by
        coalesce(erm.joined_at, er.created_at),
        er.created_at,
        er.ride_id
    ),
    '[]'::jsonb
  )
  into v_rides
  from public.event_rides er
  left join public.event_ride_members erm
    on erm.ride_id = er.ride_id
   and erm.user_id = v_actor_user_id
  where er.event_group_id = p_event_group_id
    and (
      er.creator_user_id = v_actor_user_id
      or erm.user_id = v_actor_user_id
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'meetup_id', em.meetup_id,
        'name', em.name,
        'starts_at', em.starts_at,
        'ends_at', em.ends_at,
        'canonical_event_id', em.canonical_event_id,
        'set_id', em.set_id,
        'role', emm.role,
        'membership_status', emm.status,
        'joined_at', emm.joined_at,
        'left_at', emm.left_at,
        'meetup_status', em.status
      )
      order by
        coalesce(emm.joined_at, em.created_at),
        em.created_at,
        em.meetup_id
    ),
    '[]'::jsonb
  )
  into v_meetups
  from public.event_meetups em
  left join public.event_meetup_members emm
    on emm.meetup_id = em.meetup_id
   and emm.user_id = v_actor_user_id
  where em.event_group_id = p_event_group_id
    and (
      em.creator_user_id = v_actor_user_id
      or emm.user_id = v_actor_user_id
    );

  return jsonb_build_object(
    'event_group_id', p_event_group_id,
    'tribes', v_tribes,
    'rides', v_rides,
    'meetups', v_meetups
  );
end;
$function$;

revoke all on function
  public.mhidas_read_my_event_memory_social_v1(uuid)
from public, anon, authenticated, service_role;

grant execute on function
  public.mhidas_read_my_event_memory_social_v1(uuid)
to authenticated;

comment on function
  public.mhidas_read_my_event_memory_social_v1(uuid)
is
  'Returns only the authenticated Clubber own historical tribe, ride and meetup participation for one event_group. No other-member lists or location history.';

do $$
declare
  v_signature text :=
    'public.mhidas_read_my_event_memory_social_v1(uuid)';
  v_function_definition text;
  v_security_definer boolean;
  v_return_type text;
begin
  if to_regprocedure(v_signature) is null then
    raise exception
      'EVENT_MEMORY_SOCIAL_FUNCTION_MISSING';
  end if;

  select
    p.prosecdef,
    pg_get_function_result(p.oid),
    pg_get_functiondef(p.oid)
  into
    v_security_definer,
    v_return_type,
    v_function_definition
  from pg_proc p
  where p.oid = to_regprocedure(v_signature);

  if v_security_definer is distinct from true then
    raise exception
      'EVENT_MEMORY_SOCIAL_SECURITY_DEFINER_MISSING';
  end if;

  if lower(v_return_type) <> 'jsonb' then
    raise exception
      'EVENT_MEMORY_SOCIAL_RETURN_TYPE_INVALID';
  end if;

  if position(
    'auth.uid()'
    in v_function_definition
  ) = 0 then
    raise exception
      'EVENT_MEMORY_SOCIAL_AUTH_UID_GUARD_MISSING';
  end if;

  if has_function_privilege(
    'anon',
    v_signature,
    'EXECUTE'
  ) then
    raise exception
      'EVENT_MEMORY_SOCIAL_ANON_EXECUTE_PRESENT';
  end if;

  if has_function_privilege(
    'public',
    v_signature,
    'EXECUTE'
  ) then
    raise exception
      'EVENT_MEMORY_SOCIAL_PUBLIC_EXECUTE_PRESENT';
  end if;

  if not has_function_privilege(
    'authenticated',
    v_signature,
    'EXECUTE'
  ) then
    raise exception
      'EVENT_MEMORY_SOCIAL_AUTHENTICATED_EXECUTE_MISSING';
  end if;

  if has_function_privilege(
    'service_role',
    v_signature,
    'EXECUTE'
  ) then
    raise exception
      'EVENT_MEMORY_SOCIAL_SERVICE_ROLE_EXECUTE_PRESENT';
  end if;

  if lower(v_function_definition) ~
    '(latitude|longitude|meeting_point_label|meeting_point_reference|origin_label|destination_label)'
  then
    raise exception
      'EVENT_MEMORY_SOCIAL_LOCATION_OR_ROUTE_DATA_PRESENT';
  end if;

  if lower(v_function_definition) ~
    'p_user_id'
  then
    raise exception
      'EVENT_MEMORY_SOCIAL_EXTERNAL_USER_PARAMETER_PRESENT';
  end if;
end
$$;

commit;