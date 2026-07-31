-- supabase/migrations/20260731142000_event_structured_rides_meetups_lifecycle_capacity_foundation.sql

begin;

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
  v_ride_status public.event_social_status;
  v_ride_expires_at timestamptz;
  v_seats_available integer;
  v_seats_requested integer;
  v_approved_seats integer;
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
    erjr.seats_requested,
    erjr.status,
    er.creator_user_id,
    er.mode,
    er.status,
    er.expires_at,
    er.seats_available
  into
    v_ride_id,
    v_requester_user_id,
    v_seats_requested,
    v_request_status,
    v_creator_user_id,
    v_mode,
    v_ride_status,
    v_ride_expires_at,
    v_seats_available
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

  if v_decision = 'approved' then
    if v_ride_status <> 'active' then
      raise exception 'ride is not accepting requests';
    end if;

    if v_ride_expires_at is not null
      and v_ride_expires_at <= now()
    then
      raise exception 'ride has expired';
    end if;

    if public.mhidas_event_social_relationship_control_exists(
      v_actor_user_id,
      v_requester_user_id
    ) then
      raise exception 'relationship control prevents this approval';
    end if;

    if v_mode = 'offer'
      and v_seats_available is not null
    then
      select coalesce(sum(erjr.seats_requested), 0)::integer
      into v_approved_seats
      from public.event_ride_join_requests erjr
      where erjr.ride_id = v_ride_id
        and erjr.status = 'approved';

      if v_approved_seats + v_seats_requested > v_seats_available then
        raise exception 'ride capacity exceeded';
      end if;
    end if;
  end if;

  update public.event_ride_join_requests
  set
    status = v_decision::public.event_social_request_status,
    decided_by_user_id = v_actor_user_id,
    decided_at = now(),
    cancelled_at = null
  where request_id = p_request_id;

  if v_decision = 'approved' then
    v_role := case
      when v_mode = 'offer'
        then 'passenger'::public.event_social_member_role
      else 'driver'::public.event_social_member_role
    end;

    insert into public.event_ride_members (
      ride_id,
      user_id,
      role,
      status,
      status_changed_by_user_id,
      joined_at,
      left_at,
      status_changed_at
    )
    values (
      v_ride_id,
      v_requester_user_id,
      v_role,
      'approved',
      v_actor_user_id,
      now(),
      null,
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
  v_meetup_status public.event_social_status;
  v_meetup_expires_at timestamptz;
  v_max_members integer;
  v_approved_members integer;
  v_decision text := lower(btrim(coalesce(p_decision, '')));
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  select
    emjr.meetup_id,
    emjr.requester_user_id,
    emjr.status,
    em.creator_user_id,
    em.status,
    em.expires_at,
    em.max_members
  into
    v_meetup_id,
    v_requester_user_id,
    v_request_status,
    v_creator_user_id,
    v_meetup_status,
    v_meetup_expires_at,
    v_max_members
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

  if v_decision = 'approved' then
    if v_meetup_status <> 'active' then
      raise exception 'meetup is not accepting requests';
    end if;

    if v_meetup_expires_at is not null
      and v_meetup_expires_at <= now()
    then
      raise exception 'meetup has expired';
    end if;

    if public.mhidas_event_social_relationship_control_exists(
      v_actor_user_id,
      v_requester_user_id
    ) then
      raise exception 'relationship control prevents this approval';
    end if;

    select count(*)::integer
    into v_approved_members
    from public.event_meetup_members emm
    where emm.meetup_id = v_meetup_id
      and emm.status = 'approved';

    if v_approved_members >= v_max_members then
      raise exception 'meetup capacity exceeded';
    end if;
  end if;

  update public.event_meetup_join_requests
  set
    status = v_decision::public.event_social_request_status,
    decided_by_user_id = v_actor_user_id,
    decided_at = now(),
    cancelled_at = null
  where request_id = p_request_id;

  if v_decision = 'approved' then
    insert into public.event_meetup_members (
      meetup_id,
      user_id,
      role,
      status,
      status_changed_by_user_id,
      joined_at,
      left_at,
      status_changed_at
    )
    values (
      v_meetup_id,
      v_requester_user_id,
      'member',
      'approved',
      v_actor_user_id,
      now(),
      null,
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

create or replace function public.mhidas_cancel_event_ride_request(
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
  v_requester_user_id uuid;
  v_request_status public.event_social_request_status;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  select
    erjr.requester_user_id,
    erjr.status
  into
    v_requester_user_id,
    v_request_status
  from public.event_ride_join_requests erjr
  where erjr.request_id = p_request_id
  for update;

  if v_requester_user_id is null then
    raise exception 'ride request not found';
  end if;

  if v_requester_user_id <> v_actor_user_id then
    raise exception 'ride request owner required';
  end if;

  if v_request_status <> 'pending' then
    raise exception 'ride request is not pending';
  end if;

  update public.event_ride_join_requests
  set
    status = 'cancelled',
    cancelled_at = now(),
    decided_by_user_id = null,
    decided_at = null
  where request_id = p_request_id;

  return true;
end;
$function$;

create or replace function public.mhidas_leave_event_ride(
  p_ride_id uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_member_role public.event_social_member_role;
  v_member_status public.event_social_member_status;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  select
    erm.role,
    erm.status
  into
    v_member_role,
    v_member_status
  from public.event_ride_members erm
  where erm.ride_id = p_ride_id
    and erm.user_id = v_actor_user_id
  for update;

  if v_member_role is null then
    raise exception 'ride membership not found';
  end if;

  if v_member_role = 'creator' then
    raise exception 'ride creator must close or cancel the ride';
  end if;

  if v_member_status <> 'approved' then
    raise exception 'ride membership is not active';
  end if;

  update public.event_ride_members
  set
    status = 'left',
    left_at = now(),
    status_changed_by_user_id = v_actor_user_id,
    status_changed_at = now()
  where ride_id = p_ride_id
    and user_id = v_actor_user_id;

  return true;
end;
$function$;

create or replace function public.mhidas_set_event_ride_status(
  p_ride_id uuid,
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
  v_creator_user_id uuid;
  v_current_status public.event_social_status;
  v_target_status text := lower(btrim(coalesce(p_status, '')));
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if v_target_status not in ('closed', 'cancelled') then
    raise exception 'invalid ride lifecycle status';
  end if;

  select
    er.creator_user_id,
    er.status
  into
    v_creator_user_id,
    v_current_status
  from public.event_rides er
  where er.ride_id = p_ride_id
  for update;

  if v_creator_user_id is null then
    raise exception 'ride not found';
  end if;

  if v_creator_user_id <> v_actor_user_id then
    raise exception 'ride creator required';
  end if;

  if v_current_status::text = v_target_status then
    return true;
  end if;

  if v_current_status <> 'active' then
    raise exception 'ride lifecycle transition not allowed';
  end if;

  update public.event_rides
  set
    status = v_target_status::public.event_social_status,
    closed_at = case
      when v_target_status = 'closed' then now()
      else null
    end,
    cancelled_at = case
      when v_target_status = 'cancelled' then now()
      else null
    end
  where ride_id = p_ride_id;

  update public.event_ride_join_requests
  set
    status = 'cancelled',
    cancelled_at = now(),
    decided_by_user_id = v_actor_user_id,
    decided_at = now()
  where ride_id = p_ride_id
    and status = 'pending';

  return true;
end;
$function$;

create or replace function public.mhidas_cancel_event_meetup_request(
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
  v_requester_user_id uuid;
  v_request_status public.event_social_request_status;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  select
    emjr.requester_user_id,
    emjr.status
  into
    v_requester_user_id,
    v_request_status
  from public.event_meetup_join_requests emjr
  where emjr.request_id = p_request_id
  for update;

  if v_requester_user_id is null then
    raise exception 'meetup request not found';
  end if;

  if v_requester_user_id <> v_actor_user_id then
    raise exception 'meetup request owner required';
  end if;

  if v_request_status <> 'pending' then
    raise exception 'meetup request is not pending';
  end if;

  update public.event_meetup_join_requests
  set
    status = 'cancelled',
    cancelled_at = now(),
    decided_by_user_id = null,
    decided_at = null
  where request_id = p_request_id;

  return true;
end;
$function$;

create or replace function public.mhidas_leave_event_meetup(
  p_meetup_id uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_member_role public.event_social_member_role;
  v_member_status public.event_social_member_status;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  select
    emm.role,
    emm.status
  into
    v_member_role,
    v_member_status
  from public.event_meetup_members emm
  where emm.meetup_id = p_meetup_id
    and emm.user_id = v_actor_user_id
  for update;

  if v_member_role is null then
    raise exception 'meetup membership not found';
  end if;

  if v_member_role = 'creator' then
    raise exception 'meetup creator must close or cancel the meetup';
  end if;

  if v_member_status <> 'approved' then
    raise exception 'meetup membership is not active';
  end if;

  update public.event_meetup_members
  set
    status = 'left',
    left_at = now(),
    status_changed_by_user_id = v_actor_user_id,
    status_changed_at = now()
  where meetup_id = p_meetup_id
    and user_id = v_actor_user_id;

  return true;
end;
$function$;

create or replace function public.mhidas_set_event_meetup_status(
  p_meetup_id uuid,
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
  v_creator_user_id uuid;
  v_current_status public.event_social_status;
  v_target_status text := lower(btrim(coalesce(p_status, '')));
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if v_target_status not in ('closed', 'cancelled') then
    raise exception 'invalid meetup lifecycle status';
  end if;

  select
    em.creator_user_id,
    em.status
  into
    v_creator_user_id,
    v_current_status
  from public.event_meetups em
  where em.meetup_id = p_meetup_id
  for update;

  if v_creator_user_id is null then
    raise exception 'meetup not found';
  end if;

  if v_creator_user_id <> v_actor_user_id then
    raise exception 'meetup creator required';
  end if;

  if v_current_status::text = v_target_status then
    return true;
  end if;

  if v_current_status <> 'active' then
    raise exception 'meetup lifecycle transition not allowed';
  end if;

  update public.event_meetups
  set
    status = v_target_status::public.event_social_status,
    closed_at = case
      when v_target_status = 'closed' then now()
      else null
    end,
    cancelled_at = case
      when v_target_status = 'cancelled' then now()
      else null
    end
  where meetup_id = p_meetup_id;

  update public.event_meetup_join_requests
  set
    status = 'cancelled',
    cancelled_at = now(),
    decided_by_user_id = v_actor_user_id,
    decided_at = now()
  where meetup_id = p_meetup_id
    and status = 'pending';

  return true;
end;
$function$;

revoke all on function public.mhidas_cancel_event_ride_request(uuid)
  from public, anon, authenticated;
revoke all on function public.mhidas_leave_event_ride(uuid)
  from public, anon, authenticated;
revoke all on function public.mhidas_set_event_ride_status(uuid, text)
  from public, anon, authenticated;
revoke all on function public.mhidas_cancel_event_meetup_request(uuid)
  from public, anon, authenticated;
revoke all on function public.mhidas_leave_event_meetup(uuid)
  from public, anon, authenticated;
revoke all on function public.mhidas_set_event_meetup_status(uuid, text)
  from public, anon, authenticated;

grant execute on function public.mhidas_cancel_event_ride_request(uuid)
  to authenticated;
grant execute on function public.mhidas_leave_event_ride(uuid)
  to authenticated;
grant execute on function public.mhidas_set_event_ride_status(uuid, text)
  to authenticated;
grant execute on function public.mhidas_cancel_event_meetup_request(uuid)
  to authenticated;
grant execute on function public.mhidas_leave_event_meetup(uuid)
  to authenticated;
grant execute on function public.mhidas_set_event_meetup_status(uuid, text)
  to authenticated;

do $$
declare
  v_missing_functions integer;
  v_public_or_anon_execute integer;
  v_authenticated_execute_missing integer;
  v_insecure_function_count integer;
begin
  select count(*)
  into v_missing_functions
  from (
    values
      ('public.mhidas_decide_event_ride_request(uuid,text)'),
      ('public.mhidas_decide_event_meetup_request(uuid,text)'),
      ('public.mhidas_cancel_event_ride_request(uuid)'),
      ('public.mhidas_leave_event_ride(uuid)'),
      ('public.mhidas_set_event_ride_status(uuid,text)'),
      ('public.mhidas_cancel_event_meetup_request(uuid)'),
      ('public.mhidas_leave_event_meetup(uuid)'),
      ('public.mhidas_set_event_meetup_status(uuid,text)')
  ) as expected(signature)
  where to_regprocedure(expected.signature) is null;

  if v_missing_functions <> 0 then
    raise exception 'V4_8_142_REQUIRED_FUNCTION_MISSING';
  end if;

  select count(*)
  into v_public_or_anon_execute
  from (
    values
      ('public.mhidas_cancel_event_ride_request(uuid)'),
      ('public.mhidas_leave_event_ride(uuid)'),
      ('public.mhidas_set_event_ride_status(uuid,text)'),
      ('public.mhidas_cancel_event_meetup_request(uuid)'),
      ('public.mhidas_leave_event_meetup(uuid)'),
      ('public.mhidas_set_event_meetup_status(uuid,text)')
  ) as expected(signature)
  where has_function_privilege('public', expected.signature, 'EXECUTE')
     or has_function_privilege('anon', expected.signature, 'EXECUTE');

  if v_public_or_anon_execute <> 0 then
    raise exception 'V4_8_142_PUBLIC_OR_ANON_EXECUTE_PRESENT';
  end if;

  select count(*)
  into v_authenticated_execute_missing
  from (
    values
      ('public.mhidas_cancel_event_ride_request(uuid)'),
      ('public.mhidas_leave_event_ride(uuid)'),
      ('public.mhidas_set_event_ride_status(uuid,text)'),
      ('public.mhidas_cancel_event_meetup_request(uuid)'),
      ('public.mhidas_leave_event_meetup(uuid)'),
      ('public.mhidas_set_event_meetup_status(uuid,text)')
  ) as expected(signature)
  where not has_function_privilege(
    'authenticated',
    expected.signature,
    'EXECUTE'
  );

  if v_authenticated_execute_missing <> 0 then
    raise exception 'V4_8_142_AUTHENTICATED_EXECUTE_MISSING';
  end if;

  select count(*)
  into v_insecure_function_count
  from (
    values
      ('public.mhidas_decide_event_ride_request(uuid,text)'),
      ('public.mhidas_decide_event_meetup_request(uuid,text)'),
      ('public.mhidas_cancel_event_ride_request(uuid)'),
      ('public.mhidas_leave_event_ride(uuid)'),
      ('public.mhidas_set_event_ride_status(uuid,text)'),
      ('public.mhidas_cancel_event_meetup_request(uuid)'),
      ('public.mhidas_leave_event_meetup(uuid)'),
      ('public.mhidas_set_event_meetup_status(uuid,text)')
  ) as expected(signature)
  join pg_proc p
    on p.oid = to_regprocedure(expected.signature)
  where p.prosecdef = false
     or p.provolatile <> 'v'
     or p.proconfig is null
     or not (
       'search_path=pg_catalog, public' = any(p.proconfig)
     );

  if v_insecure_function_count <> 0 then
    raise exception 'V4_8_142_FUNCTION_SECURITY_CONFIGURATION_INVALID';
  end if;
end
$$;

commit;
