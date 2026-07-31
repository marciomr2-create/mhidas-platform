-- supabase/migrations/20260731133500_event_structured_rides_meetups_rls_runtime_hardening.sql

begin;

create or replace function public.mhidas_event_ride_viewer_is_creator(
  p_ride_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.event_rides er
    where er.ride_id = p_ride_id
      and er.creator_user_id = auth.uid()
  );
$function$;

create or replace function public.mhidas_event_ride_viewer_is_approved_member(
  p_ride_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.event_ride_members erm
    where erm.ride_id = p_ride_id
      and erm.user_id = auth.uid()
      and erm.status = 'approved'
  );
$function$;

create or replace function public.mhidas_event_ride_viewer_has_pending_request(
  p_ride_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.event_ride_join_requests erjr
    where erjr.ride_id = p_ride_id
      and erjr.requester_user_id = auth.uid()
      and erjr.status = 'pending'
  );
$function$;

create or replace function public.mhidas_event_meetup_viewer_is_creator(
  p_meetup_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.event_meetups em
    where em.meetup_id = p_meetup_id
      and em.creator_user_id = auth.uid()
  );
$function$;

create or replace function public.mhidas_event_meetup_viewer_is_approved_member(
  p_meetup_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.event_meetup_members emm
    where emm.meetup_id = p_meetup_id
      and emm.user_id = auth.uid()
      and emm.status = 'approved'
  );
$function$;

create or replace function public.mhidas_event_meetup_viewer_has_pending_request(
  p_meetup_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.event_meetup_join_requests emjr
    where emjr.meetup_id = p_meetup_id
      and emjr.requester_user_id = auth.uid()
      and emjr.status = 'pending'
  );
$function$;

revoke all on function public.mhidas_event_ride_viewer_is_creator(uuid)
  from public, anon, authenticated;
revoke all on function public.mhidas_event_ride_viewer_is_approved_member(uuid)
  from public, anon, authenticated;
revoke all on function public.mhidas_event_ride_viewer_has_pending_request(uuid)
  from public, anon, authenticated;
revoke all on function public.mhidas_event_meetup_viewer_is_creator(uuid)
  from public, anon, authenticated;
revoke all on function public.mhidas_event_meetup_viewer_is_approved_member(uuid)
  from public, anon, authenticated;
revoke all on function public.mhidas_event_meetup_viewer_has_pending_request(uuid)
  from public, anon, authenticated;

grant execute on function public.mhidas_event_ride_viewer_is_creator(uuid)
  to authenticated;
grant execute on function public.mhidas_event_ride_viewer_is_approved_member(uuid)
  to authenticated;
grant execute on function public.mhidas_event_ride_viewer_has_pending_request(uuid)
  to authenticated;
grant execute on function public.mhidas_event_meetup_viewer_is_creator(uuid)
  to authenticated;
grant execute on function public.mhidas_event_meetup_viewer_is_approved_member(uuid)
  to authenticated;
grant execute on function public.mhidas_event_meetup_viewer_has_pending_request(uuid)
  to authenticated;

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
  or public.mhidas_event_ride_viewer_is_approved_member(ride_id)
  or public.mhidas_event_ride_viewer_has_pending_request(ride_id)
);

drop policy if exists event_ride_members_select_self_or_creator
  on public.event_ride_members;

create policy event_ride_members_select_self_or_creator
on public.event_ride_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.mhidas_event_ride_viewer_is_creator(ride_id)
);

drop policy if exists event_ride_requests_select_self_or_creator
  on public.event_ride_join_requests;

create policy event_ride_requests_select_self_or_creator
on public.event_ride_join_requests
for select
to authenticated
using (
  requester_user_id = auth.uid()
  or public.mhidas_event_ride_viewer_is_creator(ride_id)
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
  or public.mhidas_event_meetup_viewer_is_approved_member(meetup_id)
  or public.mhidas_event_meetup_viewer_has_pending_request(meetup_id)
);

drop policy if exists event_meetup_members_select_self_or_creator
  on public.event_meetup_members;

create policy event_meetup_members_select_self_or_creator
on public.event_meetup_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.mhidas_event_meetup_viewer_is_creator(meetup_id)
);

drop policy if exists event_meetup_requests_select_self_or_creator
  on public.event_meetup_join_requests;

create policy event_meetup_requests_select_self_or_creator
on public.event_meetup_join_requests
for select
to authenticated
using (
  requester_user_id = auth.uid()
  or public.mhidas_event_meetup_viewer_is_creator(meetup_id)
);

do $$
declare
  v_missing_functions integer;
  v_public_or_anon_execute integer;
  v_authenticated_execute_missing integer;
  v_policy_count integer;
  v_recursive_policy_count integer;
begin
  select count(*)
  into v_missing_functions
  from (
    values
      ('public.mhidas_event_ride_viewer_is_creator(uuid)'),
      ('public.mhidas_event_ride_viewer_is_approved_member(uuid)'),
      ('public.mhidas_event_ride_viewer_has_pending_request(uuid)'),
      ('public.mhidas_event_meetup_viewer_is_creator(uuid)'),
      ('public.mhidas_event_meetup_viewer_is_approved_member(uuid)'),
      ('public.mhidas_event_meetup_viewer_has_pending_request(uuid)')
  ) as expected(signature)
  where to_regprocedure(expected.signature) is null;

  if v_missing_functions <> 0 then
    raise exception 'V4_8_140_REQUIRED_FUNCTION_MISSING';
  end if;

  select count(*)
  into v_public_or_anon_execute
  from (
    values
      ('public.mhidas_event_ride_viewer_is_creator(uuid)'),
      ('public.mhidas_event_ride_viewer_is_approved_member(uuid)'),
      ('public.mhidas_event_ride_viewer_has_pending_request(uuid)'),
      ('public.mhidas_event_meetup_viewer_is_creator(uuid)'),
      ('public.mhidas_event_meetup_viewer_is_approved_member(uuid)'),
      ('public.mhidas_event_meetup_viewer_has_pending_request(uuid)')
  ) as expected(signature)
  where has_function_privilege('anon', expected.signature, 'EXECUTE')
     or has_function_privilege('public', expected.signature, 'EXECUTE');

  if v_public_or_anon_execute <> 0 then
    raise exception 'V4_8_140_PUBLIC_OR_ANON_EXECUTE_PRESENT';
  end if;

  select count(*)
  into v_authenticated_execute_missing
  from (
    values
      ('public.mhidas_event_ride_viewer_is_creator(uuid)'),
      ('public.mhidas_event_ride_viewer_is_approved_member(uuid)'),
      ('public.mhidas_event_ride_viewer_has_pending_request(uuid)'),
      ('public.mhidas_event_meetup_viewer_is_creator(uuid)'),
      ('public.mhidas_event_meetup_viewer_is_approved_member(uuid)'),
      ('public.mhidas_event_meetup_viewer_has_pending_request(uuid)')
  ) as expected(signature)
  where not has_function_privilege(
    'authenticated',
    expected.signature,
    'EXECUTE'
  );

  if v_authenticated_execute_missing <> 0 then
    raise exception 'V4_8_140_AUTHENTICATED_EXECUTE_MISSING';
  end if;

  select count(*)
  into v_policy_count
  from pg_policies
  where schemaname = 'public'
    and (
      (tablename = 'event_rides'
        and policyname = 'event_rides_select_visible')
      or
      (tablename = 'event_ride_members'
        and policyname = 'event_ride_members_select_self_or_creator')
      or
      (tablename = 'event_ride_join_requests'
        and policyname = 'event_ride_requests_select_self_or_creator')
      or
      (tablename = 'event_meetups'
        and policyname = 'event_meetups_select_visible')
      or
      (tablename = 'event_meetup_members'
        and policyname = 'event_meetup_members_select_self_or_creator')
      or
      (tablename = 'event_meetup_join_requests'
        and policyname = 'event_meetup_requests_select_self_or_creator')
    );

  if v_policy_count <> 6 then
    raise exception 'V4_8_140_POLICY_SET_INCOMPLETE';
  end if;

  select count(*)
  into v_recursive_policy_count
  from pg_policies
  where schemaname = 'public'
    and (
      (
        tablename = 'event_rides'
        and policyname = 'event_rides_select_visible'
        and qual ilike '%from event_ride_members%'
      )
      or
      (
        tablename = 'event_ride_members'
        and policyname = 'event_ride_members_select_self_or_creator'
        and qual ilike '%from event_rides%'
      )
      or
      (
        tablename = 'event_ride_join_requests'
        and policyname = 'event_ride_requests_select_self_or_creator'
        and qual ilike '%from event_rides%'
      )
      or
      (
        tablename = 'event_meetups'
        and policyname = 'event_meetups_select_visible'
        and qual ilike '%from event_meetup_members%'
      )
      or
      (
        tablename = 'event_meetup_members'
        and policyname = 'event_meetup_members_select_self_or_creator'
        and qual ilike '%from event_meetups%'
      )
      or
      (
        tablename = 'event_meetup_join_requests'
        and policyname = 'event_meetup_requests_select_self_or_creator'
        and qual ilike '%from event_meetups%'
      )
    );

  if v_recursive_policy_count <> 0 then
    raise exception 'V4_8_140_RECURSIVE_POLICY_REFERENCE_PRESENT';
  end if;
end
$$;

commit;
