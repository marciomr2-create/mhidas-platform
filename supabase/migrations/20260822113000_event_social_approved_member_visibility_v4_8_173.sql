-- V4.8.173-R3
-- Approved participants may see the approved participant circle of the same ride/meetup.
-- Pending requests remain private to requester + creator through the existing request policies.

begin;

drop policy if exists event_ride_members_select_self_or_creator
  on public.event_ride_members;

create policy event_ride_members_select_approved_circle
on public.event_ride_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.mhidas_event_ride_viewer_is_creator(ride_id)
  or (
    status = 'approved'
    and public.mhidas_event_ride_viewer_is_approved_member(ride_id)
  )
);

drop policy if exists event_meetup_members_select_self_or_creator
  on public.event_meetup_members;

create policy event_meetup_members_select_approved_circle
on public.event_meetup_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.mhidas_event_meetup_viewer_is_creator(meetup_id)
  or (
    status = 'approved'
    and public.mhidas_event_meetup_viewer_is_approved_member(meetup_id)
  )
);

do $$
declare
  v_required_helpers_missing integer;
  v_member_policy_count integer;
  v_request_policy_count integer;
begin
  select count(*)
  into v_required_helpers_missing
  from (
    values
      ('public.mhidas_event_ride_viewer_is_creator(uuid)'),
      ('public.mhidas_event_ride_viewer_is_approved_member(uuid)'),
      ('public.mhidas_event_meetup_viewer_is_creator(uuid)'),
      ('public.mhidas_event_meetup_viewer_is_approved_member(uuid)')
  ) as expected(signature)
  where to_regprocedure(expected.signature) is null;

  if v_required_helpers_missing <> 0 then
    raise exception 'V4_8_173_R3_REQUIRED_HELPER_MISSING';
  end if;

  select count(*)
  into v_member_policy_count
  from pg_policies
  where schemaname = 'public'
    and (
      (tablename = 'event_ride_members'
       and policyname = 'event_ride_members_select_approved_circle')
      or
      (tablename = 'event_meetup_members'
       and policyname = 'event_meetup_members_select_approved_circle')
    );

  if v_member_policy_count <> 2 then
    raise exception 'V4_8_173_R3_MEMBER_POLICY_SET_INCOMPLETE';
  end if;

  select count(*)
  into v_request_policy_count
  from pg_policies
  where schemaname = 'public'
    and (
      (tablename = 'event_ride_join_requests'
       and policyname = 'event_ride_requests_select_self_or_creator')
      or
      (tablename = 'event_meetup_join_requests'
       and policyname = 'event_meetup_requests_select_self_or_creator')
    );

  if v_request_policy_count <> 2 then
    raise exception 'V4_8_173_R3_REQUEST_PRIVACY_POLICY_MISSING';
  end if;
end
$$;

commit;