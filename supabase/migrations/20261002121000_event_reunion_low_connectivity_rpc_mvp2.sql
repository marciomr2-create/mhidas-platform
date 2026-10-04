-- MHIDAS / USECLUBBERS
-- MVP2 - Low Connectivity - Reunion RPC foundation
-- Scope:
--   * authenticated consent request/response/revocation
--   * one replaceable live position per user/event
--   * authorized reunion reads
--   * temporary Meetup current point
--   * no direct table access for clients
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
  if to_regclass('public.event_reunion_consents') is null
    or to_regclass('public.event_reunion_live_positions') is null
    or to_regclass('public.event_reunion_meetup_points') is null
    or to_regclass('public.event_groups') is null
    or to_regclass('public.event_meetups') is null
    or to_regclass('public.event_meetup_members') is null
    or to_regclass('public.clubber_relationship_controls') is null
    or to_regclass('public.professional_relationship_controls') is null
  then
    raise exception 'EVENT_REUNION_RPC_REQUIRED_TABLE_MISSING';
  end if;

  if to_regprocedure(
      'public.mhidas_event_social_user_has_public_clubber(uuid)'
    ) is null
    or to_regprocedure(
      'public.mhidas_event_social_event_is_active_public(uuid)'
    ) is null

  then
    raise exception 'EVENT_REUNION_RPC_REQUIRED_HELPER_MISSING';
  end if;
end
$prerequisites$;

create or replace function public.mhidas_event_reunion_relationship_control_exists_v1(
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
      else (
        exists (
          select 1
          from public.clubber_relationship_controls crc
          where crc.status in ('blocked', 'suspended')
            and (
              (
                crc.owner_user_id = p_left_user_id
                and crc.target_user_id = p_right_user_id
              )
              or
              (
                crc.owner_user_id = p_right_user_id
                and crc.target_user_id = p_left_user_id
              )
            )
        )
        or exists (
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
      )
    end;
$function$;

create or replace function public.mhidas_event_reunion_user_is_meetup_member_v1(
  p_meetup_id uuid,
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
    from public.event_meetups em
    join public.event_meetup_members emm
      on emm.meetup_id = em.meetup_id
    where em.meetup_id = p_meetup_id
      and em.status = 'active'
      and (
        em.expires_at is null
        or em.expires_at > now()
      )
      and emm.user_id = p_user_id
      and emm.status = 'approved'
  );
$function$;

create or replace function public.mhidas_event_reunion_pair_shares_meetup_v1(
  p_event_group_id uuid,
  p_left_user_id uuid,
  p_right_user_id uuid
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
    join public.event_meetup_members left_member
      on left_member.meetup_id = em.meetup_id
    join public.event_meetup_members right_member
      on right_member.meetup_id = em.meetup_id
    where em.event_group_id = p_event_group_id
      and em.status = 'active'
      and (
        em.expires_at is null
        or em.expires_at > now()
      )
      and left_member.user_id = p_left_user_id
      and left_member.status = 'approved'
      and right_member.user_id = p_right_user_id
      and right_member.status = 'approved'
  );
$function$;

create or replace function public.mhidas_request_event_reunion_person_v1(
  p_event_group_id uuid,
  p_owner_user_id uuid,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor uuid := auth.uid();
  v_consent_id uuid;
begin
  if v_actor is null then
    raise exception 'EVENT_REUNION_AUTH_REQUIRED';
  end if;

  if p_owner_user_id is null
    or p_owner_user_id = v_actor
  then
    raise exception 'EVENT_REUNION_PERSON_TARGET_INVALID';
  end if;

  if p_expires_at is null
    or p_expires_at <= now()
    or p_expires_at > now() + interval '24 hours'
  then
    raise exception 'EVENT_REUNION_EXPIRATION_INVALID';
  end if;

  if not public.mhidas_event_social_event_is_active_public(
    p_event_group_id
  ) then
    raise exception 'EVENT_REUNION_EVENT_INVALID';
  end if;

  if not public.mhidas_event_social_user_has_public_clubber(
    v_actor
  )
    or not public.mhidas_event_social_user_has_public_clubber(
      p_owner_user_id
    )
  then
    raise exception 'EVENT_REUNION_CLUBBER_REQUIRED';
  end if;

  if public.mhidas_event_reunion_relationship_control_exists_v1(
    v_actor,
    p_owner_user_id
  ) then
    raise exception 'EVENT_REUNION_RELATIONSHIP_BLOCKED';
  end if;

  if not public.mhidas_event_reunion_pair_shares_meetup_v1(
    p_event_group_id,
    v_actor,
    p_owner_user_id
  ) then
    raise exception 'EVENT_REUNION_SHARED_MEETUP_REQUIRED';
  end if;

  update public.event_reunion_consents c
  set
    status = 'expired',
    responded_at = coalesce(c.responded_at, now())
  where c.event_group_id = p_event_group_id
    and c.scope = 'person'
    and c.owner_user_id = p_owner_user_id
    and c.audience_user_id = v_actor
    and c.status in ('requested', 'active')
    and c.expires_at <= now();

  select c.consent_id
  into v_consent_id
  from public.event_reunion_consents c
  where c.event_group_id = p_event_group_id
    and c.scope = 'person'
    and c.owner_user_id = p_owner_user_id
    and c.audience_user_id = v_actor
    and c.status in ('requested', 'active')
    and c.expires_at > now()
  order by c.created_at desc
  limit 1
  for update;

  if v_consent_id is not null then
    return v_consent_id;
  end if;

  insert into public.event_reunion_consents (
    event_group_id,
    owner_user_id,
    requested_by_user_id,
    scope,
    audience_user_id,
    status,
    expires_at
  )
  values (
    p_event_group_id,
    p_owner_user_id,
    v_actor,
    'person',
    v_actor,
    'requested',
    p_expires_at
  )
  returning consent_id into v_consent_id;

  return v_consent_id;
end;
$function$;

create or replace function public.mhidas_respond_event_reunion_person_v1(
  p_consent_id uuid,
  p_accept boolean
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor uuid := auth.uid();
  v_event_group_id uuid;
  v_audience_user_id uuid;
  v_status text;
  v_expires_at timestamptz;
begin
  if v_actor is null then
    raise exception 'EVENT_REUNION_AUTH_REQUIRED';
  end if;

  if p_accept is null then
    raise exception 'EVENT_REUNION_RESPONSE_INVALID';
  end if;

  select
    c.event_group_id,
    c.audience_user_id,
    c.status,
    c.expires_at
  into
    v_event_group_id,
    v_audience_user_id,
    v_status,
    v_expires_at
  from public.event_reunion_consents c
  where c.consent_id = p_consent_id
    and c.scope = 'person'
    and c.owner_user_id = v_actor
  for update;

  if v_event_group_id is null then
    raise exception 'EVENT_REUNION_CONSENT_NOT_FOUND';
  end if;

  if v_status <> 'requested' then
    raise exception 'EVENT_REUNION_CONSENT_NOT_REQUESTED';
  end if;

  if v_expires_at <= now() then
    update public.event_reunion_consents c
    set
      status = 'expired',
      responded_at = coalesce(c.responded_at, now())
    where c.consent_id = p_consent_id;

    return false;
  end if;

  if p_accept is true then
    if not public.mhidas_event_social_event_is_active_public(
      v_event_group_id
    ) then
      raise exception 'EVENT_REUNION_EVENT_INVALID';
    end if;

    if not public.mhidas_event_social_user_has_public_clubber(
      v_actor
    )
      or not public.mhidas_event_social_user_has_public_clubber(
        v_audience_user_id
      )
    then
      raise exception 'EVENT_REUNION_CLUBBER_REQUIRED';
    end if;

    if public.mhidas_event_reunion_relationship_control_exists_v1(
      v_actor,
      v_audience_user_id
    ) then
      raise exception 'EVENT_REUNION_RELATIONSHIP_BLOCKED';
    end if;

    if not public.mhidas_event_reunion_pair_shares_meetup_v1(
      v_event_group_id,
      v_actor,
      v_audience_user_id
    ) then
      raise exception 'EVENT_REUNION_SHARED_MEETUP_REQUIRED';
    end if;

    update public.event_reunion_consents c
    set
      status = 'active',
      consented_at = now(),
      responded_at = now(),
      revoked_at = null
    where c.consent_id = p_consent_id;
  else
    update public.event_reunion_consents c
    set
      status = 'declined',
      responded_at = now()
    where c.consent_id = p_consent_id;
  end if;

  return true;
end;
$function$;

create or replace function public.mhidas_set_event_reunion_meetup_consent_v1(
  p_event_group_id uuid,
  p_meetup_id uuid,
  p_expires_at timestamptz,
  p_active boolean
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor uuid := auth.uid();
  v_consent_id uuid;
  v_consent_created_at timestamptz;
  v_meetup_event_group_id uuid;
begin
  if v_actor is null then
    raise exception 'EVENT_REUNION_AUTH_REQUIRED';
  end if;

  if p_active is null then
    raise exception 'EVENT_REUNION_CONSENT_STATE_INVALID';
  end if;

  if not public.mhidas_event_social_user_has_public_clubber(
    v_actor
  ) then
    raise exception 'EVENT_REUNION_CLUBBER_REQUIRED';
  end if;

  select em.event_group_id
  into v_meetup_event_group_id
  from public.event_meetups em
  where em.meetup_id = p_meetup_id
    and em.status = 'active'
    and (
      em.expires_at is null
      or em.expires_at > now()
    );

  if v_meetup_event_group_id is null
    or v_meetup_event_group_id <> p_event_group_id
  then
    raise exception 'EVENT_REUNION_MEETUP_INVALID';
  end if;

  if not public.mhidas_event_social_event_is_active_public(
    p_event_group_id
  ) then
    raise exception 'EVENT_REUNION_EVENT_INVALID';
  end if;

  if not public.mhidas_event_reunion_user_is_meetup_member_v1(
    p_meetup_id,
    v_actor
  ) then
    raise exception 'EVENT_REUNION_MEETUP_MEMBERSHIP_REQUIRED';
  end if;

  if p_active is false then
    update public.event_reunion_consents c
    set
      status = 'revoked',
      revoked_at = now(),
      responded_at = coalesce(c.responded_at, now())
    where c.event_group_id = p_event_group_id
      and c.scope = 'meetup'
      and c.owner_user_id = v_actor
      and c.meetup_id = p_meetup_id
      and c.status = 'active'
    returning c.consent_id into v_consent_id;

    if not exists (
      select 1
      from public.event_reunion_consents active_consent
      where active_consent.event_group_id = p_event_group_id
        and active_consent.owner_user_id = v_actor
        and active_consent.status = 'active'
        and active_consent.expires_at > now()
    )
    then
      delete from public.event_reunion_live_positions p
      where p.event_group_id = p_event_group_id
        and p.user_id = v_actor;
    end if;

    return v_consent_id;
  end if;

  if p_expires_at is null
    or p_expires_at <= now()
    or p_expires_at > now() + interval '24 hours'
  then
    raise exception 'EVENT_REUNION_EXPIRATION_INVALID';
  end if;

  select
    c.consent_id,
    c.created_at
  into
    v_consent_id,
    v_consent_created_at
  from public.event_reunion_consents c
  where c.event_group_id = p_event_group_id
    and c.scope = 'meetup'
    and c.owner_user_id = v_actor
    and c.meetup_id = p_meetup_id
    and c.status = 'active'
    and c.expires_at > now()
  order by c.created_at desc
  limit 1
  for update;

  if v_consent_id is not null then
    if p_expires_at > v_consent_created_at + interval '24 hours' then
      raise exception 'EVENT_REUNION_EXPIRATION_INVALID';
    end if;

    update public.event_reunion_consents c
    set
      expires_at = p_expires_at,
      consented_at = coalesce(c.consented_at, now()),
      revoked_at = null
    where c.consent_id = v_consent_id;

    return v_consent_id;
  end if;

  update public.event_reunion_consents c
  set
    status = 'expired',
    responded_at = coalesce(c.responded_at, now())
  where c.event_group_id = p_event_group_id
    and c.scope = 'meetup'
    and c.owner_user_id = v_actor
    and c.meetup_id = p_meetup_id
    and c.status = 'active'
    and c.expires_at <= now();

  insert into public.event_reunion_consents (
    event_group_id,
    owner_user_id,
    requested_by_user_id,
    scope,
    meetup_id,
    status,
    consented_at,
    responded_at,
    expires_at
  )
  values (
    p_event_group_id,
    v_actor,
    v_actor,
    'meetup',
    p_meetup_id,
    'active',
    now(),
    now(),
    p_expires_at
  )
  returning consent_id into v_consent_id;

  return v_consent_id;
end;
$function$;

create or replace function public.mhidas_revoke_event_reunion_consent_v1(
  p_consent_id uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor uuid := auth.uid();
  v_event_group_id uuid;
  v_owner_user_id uuid;
  v_requested_by_user_id uuid;
  v_status text;
begin
  if v_actor is null then
    raise exception 'EVENT_REUNION_AUTH_REQUIRED';
  end if;

  select
    c.event_group_id,
    c.owner_user_id,
    c.requested_by_user_id,
    c.status
  into
    v_event_group_id,
    v_owner_user_id,
    v_requested_by_user_id,
    v_status
  from public.event_reunion_consents c
  where c.consent_id = p_consent_id
  for update;

  if v_owner_user_id is null then
    raise exception 'EVENT_REUNION_CONSENT_NOT_FOUND';
  end if;

  if v_actor <> v_owner_user_id
    and not (
      v_status = 'requested'
      and v_actor = v_requested_by_user_id
    )
  then
    raise exception 'EVENT_REUNION_CONSENT_FORBIDDEN';
  end if;

  if v_status not in ('requested', 'active') then
    return false;
  end if;

  update public.event_reunion_consents c
  set
    status = 'revoked',
    revoked_at = now(),
    responded_at = coalesce(c.responded_at, now())
  where c.consent_id = p_consent_id;

  if v_actor = v_owner_user_id
    and not exists (
      select 1
      from public.event_reunion_consents active_consent
      where active_consent.event_group_id = v_event_group_id
        and active_consent.owner_user_id = v_owner_user_id
        and active_consent.status = 'active'
        and active_consent.expires_at > now()
    )
  then
    delete from public.event_reunion_live_positions p
    where p.event_group_id = v_event_group_id
      and p.user_id = v_owner_user_id;
  end if;

  return true;
end;
$function$;

create or replace function public.mhidas_update_event_reunion_location_v1(
  p_event_group_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision,
  p_captured_at timestamptz
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor uuid := auth.uid();
  v_position_id uuid;
  v_has_live_consent boolean := false;
begin
  if v_actor is null then
    raise exception 'EVENT_REUNION_AUTH_REQUIRED';
  end if;

  if not public.mhidas_event_social_event_is_active_public(
    p_event_group_id
  ) then
    raise exception 'EVENT_REUNION_EVENT_INVALID';
  end if;

  if not public.mhidas_event_social_user_has_public_clubber(
    v_actor
  ) then
    raise exception 'EVENT_REUNION_CLUBBER_REQUIRED';
  end if;

  if p_latitude is null
    or p_latitude < -90
    or p_latitude > 90
    or p_longitude is null
    or p_longitude < -180
    or p_longitude > 180
  then
    raise exception 'EVENT_REUNION_COORDINATES_INVALID';
  end if;

  if p_accuracy_meters is null
    or p_accuracy_meters < 0
    or p_accuracy_meters > 10000
  then
    raise exception 'EVENT_REUNION_ACCURACY_INVALID';
  end if;

  if p_captured_at is null
    or p_captured_at > now() + interval '2 minutes'
    or p_captured_at < now() - interval '5 minutes'
  then
    raise exception 'EVENT_REUNION_CAPTURE_TIME_INVALID';
  end if;

  select exists (
    select 1
    from public.event_reunion_consents c
    where c.event_group_id = p_event_group_id
      and c.owner_user_id = v_actor
      and c.status = 'active'
      and c.expires_at > now()
      and (
        (
          c.scope = 'person'
          and c.audience_user_id is not null
          and not public.mhidas_event_reunion_relationship_control_exists_v1(
            v_actor,
            c.audience_user_id
          )
          and public.mhidas_event_reunion_pair_shares_meetup_v1(
            p_event_group_id,
            v_actor,
            c.audience_user_id
          )
        )
        or
        (
          c.scope = 'meetup'
          and c.meetup_id is not null
          and public.mhidas_event_reunion_user_is_meetup_member_v1(
            c.meetup_id,
            v_actor
          )
        )
      )
  )
  into v_has_live_consent;

  if not v_has_live_consent then
    raise exception 'EVENT_REUNION_ACTIVE_CONSENT_REQUIRED';
  end if;

  insert into public.event_reunion_live_positions as current_position (
    event_group_id,
    user_id,
    latitude,
    longitude,
    accuracy_meters,
    captured_at,
    received_at,
    expires_at
  )
  values (
    p_event_group_id,
    v_actor,
    p_latitude,
    p_longitude,
    p_accuracy_meters,
    p_captured_at,
    now(),
    p_captured_at + interval '5 minutes'
  )
  on conflict (event_group_id, user_id)
  do update
  set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_meters = excluded.accuracy_meters,
    captured_at = excluded.captured_at,
    received_at = now(),
    expires_at = excluded.expires_at
  where excluded.captured_at > current_position.captured_at
  returning position_id into v_position_id;

  if v_position_id is null then
    select p.position_id
    into v_position_id
    from public.event_reunion_live_positions p
    where p.event_group_id = p_event_group_id
      and p.user_id = v_actor;
  end if;

  return v_position_id;
end;
$function$;

create or replace function public.mhidas_read_event_reunion_locations_v1(
  p_event_group_id uuid,
  p_meetup_id uuid default null
)
returns table (
  user_id uuid,
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  captured_at timestamptz,
  received_at timestamptz,
  expires_at timestamptz,
  consent_scope text,
  meetup_id uuid
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'EVENT_REUNION_AUTH_REQUIRED';
  end if;

  if not public.mhidas_event_social_event_is_active_public(
    p_event_group_id
  ) then
    raise exception 'EVENT_REUNION_EVENT_INVALID';
  end if;

  if not public.mhidas_event_social_user_has_public_clubber(
    v_actor
  ) then
    raise exception 'EVENT_REUNION_CLUBBER_REQUIRED';
  end if;

  if p_meetup_id is not null
    and not public.mhidas_event_reunion_user_is_meetup_member_v1(
      p_meetup_id,
      v_actor
    )
  then
    raise exception 'EVENT_REUNION_MEETUP_MEMBERSHIP_REQUIRED';
  end if;

  return query
  select distinct
    p.user_id,
    p.latitude,
    p.longitude,
    p.accuracy_meters,
    p.captured_at,
    p.received_at,
    p.expires_at,
    c.scope,
    c.meetup_id
  from public.event_reunion_live_positions p
  join public.event_reunion_consents c
    on c.event_group_id = p.event_group_id
   and c.owner_user_id = p.user_id
  where p.event_group_id = p_event_group_id
    and p.user_id <> v_actor
    and p.expires_at > now()
    and c.status = 'active'
    and c.expires_at > now()
    and public.mhidas_event_social_user_has_public_clubber(
      p.user_id
    )
    and not public.mhidas_event_reunion_relationship_control_exists_v1(
      v_actor,
      p.user_id
    )
    and (
      (
        p_meetup_id is null
        and c.scope = 'person'
        and c.audience_user_id = v_actor
        and public.mhidas_event_reunion_pair_shares_meetup_v1(
          p_event_group_id,
          v_actor,
          p.user_id
        )
      )
      or
      (
        p_meetup_id is not null
        and c.scope = 'meetup'
        and c.meetup_id = p_meetup_id
        and public.mhidas_event_reunion_user_is_meetup_member_v1(
          p_meetup_id,
          p.user_id
        )
      )
    )
  order by p.captured_at desc;
end;
$function$;

create or replace function public.mhidas_read_event_reunion_consents_v1(
  p_event_group_id uuid
)
returns table (
  consent_id uuid,
  owner_user_id uuid,
  requested_by_user_id uuid,
  scope text,
  audience_user_id uuid,
  meetup_id uuid,
  status text,
  consented_at timestamptz,
  responded_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'EVENT_REUNION_AUTH_REQUIRED';
  end if;

  return query
  select
    c.consent_id,
    c.owner_user_id,
    c.requested_by_user_id,
    c.scope,
    c.audience_user_id,
    c.meetup_id,
    case
      when c.status in ('requested', 'active')
        and c.expires_at <= now()
      then 'expired'
      else c.status
    end as status,
    c.consented_at,
    c.responded_at,
    c.revoked_at,
    c.expires_at,
    c.created_at,
    c.updated_at
  from public.event_reunion_consents c
  where c.event_group_id = p_event_group_id
    and (
      c.owner_user_id = v_actor
      or c.requested_by_user_id = v_actor
      or c.audience_user_id = v_actor
    )
  order by c.created_at desc;
end;
$function$;

create or replace function public.mhidas_set_event_reunion_meetup_point_v1(
  p_event_group_id uuid,
  p_meetup_id uuid,
  p_label text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision,
  p_captured_at timestamptz,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor uuid := auth.uid();
  v_member_role text;
  v_meetup_event_group_id uuid;
  v_point_id uuid;
  v_label text := btrim(coalesce(p_label, ''));
begin
  if v_actor is null then
    raise exception 'EVENT_REUNION_AUTH_REQUIRED';
  end if;

  if not public.mhidas_event_social_user_has_public_clubber(
    v_actor
  ) then
    raise exception 'EVENT_REUNION_CLUBBER_REQUIRED';
  end if;

  select
    em.event_group_id,
    emm.role::text
  into
    v_meetup_event_group_id,
    v_member_role
  from public.event_meetups em
  join public.event_meetup_members emm
    on emm.meetup_id = em.meetup_id
  where em.meetup_id = p_meetup_id
    and em.status = 'active'
    and (
      em.expires_at is null
      or em.expires_at > now()
    )
    and emm.user_id = v_actor
    and emm.status = 'approved'
  limit 1;

  if v_meetup_event_group_id is null
    or v_meetup_event_group_id <> p_event_group_id
  then
    raise exception 'EVENT_REUNION_MEETUP_INVALID';
  end if;

  if v_member_role not in ('creator', 'organizer') then
    raise exception 'EVENT_REUNION_MEETUP_MANAGER_REQUIRED';
  end if;

  if not public.mhidas_event_social_event_is_active_public(
    p_event_group_id
  ) then
    raise exception 'EVENT_REUNION_EVENT_INVALID';
  end if;

  if char_length(v_label) < 2
    or char_length(v_label) > 160
  then
    raise exception 'EVENT_REUNION_POINT_LABEL_INVALID';
  end if;

  if p_latitude is null
    or p_latitude < -90
    or p_latitude > 90
    or p_longitude is null
    or p_longitude < -180
    or p_longitude > 180
  then
    raise exception 'EVENT_REUNION_COORDINATES_INVALID';
  end if;

  if p_accuracy_meters is not null
    and (
      p_accuracy_meters < 0
      or p_accuracy_meters > 10000
    )
  then
    raise exception 'EVENT_REUNION_ACCURACY_INVALID';
  end if;

  if p_captured_at is null
    or p_captured_at > now() + interval '2 minutes'
    or p_captured_at < now() - interval '5 minutes'
  then
    raise exception 'EVENT_REUNION_CAPTURE_TIME_INVALID';
  end if;

  if p_expires_at is null
    or p_expires_at <= now()
    or p_expires_at <= p_captured_at
    or p_expires_at > p_captured_at + interval '24 hours'
  then
    raise exception 'EVENT_REUNION_POINT_EXPIRATION_INVALID';
  end if;

  insert into public.event_reunion_meetup_points as current_point (
    event_group_id,
    meetup_id,
    set_by_user_id,
    label,
    latitude,
    longitude,
    accuracy_meters,
    captured_at,
    received_at,
    expires_at
  )
  values (
    p_event_group_id,
    p_meetup_id,
    v_actor,
    v_label,
    p_latitude,
    p_longitude,
    p_accuracy_meters,
    p_captured_at,
    now(),
    p_expires_at
  )
  on conflict (meetup_id)
  do update
  set
    event_group_id = excluded.event_group_id,
    set_by_user_id = excluded.set_by_user_id,
    label = excluded.label,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_meters = excluded.accuracy_meters,
    captured_at = excluded.captured_at,
    received_at = now(),
    expires_at = excluded.expires_at
  where excluded.captured_at >= current_point.captured_at
  returning meetup_point_id into v_point_id;

  if v_point_id is null then
    select mp.meetup_point_id
    into v_point_id
    from public.event_reunion_meetup_points mp
    where mp.meetup_id = p_meetup_id;
  end if;

  return v_point_id;
end;
$function$;

create or replace function public.mhidas_read_event_reunion_meetup_point_v1(
  p_event_group_id uuid,
  p_meetup_id uuid
)
returns table (
  meetup_point_id uuid,
  meetup_id uuid,
  set_by_user_id uuid,
  label text,
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  captured_at timestamptz,
  received_at timestamptz,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'EVENT_REUNION_AUTH_REQUIRED';
  end if;

  if not public.mhidas_event_social_event_is_active_public(
    p_event_group_id
  ) then
    raise exception 'EVENT_REUNION_EVENT_INVALID';
  end if;

  if not public.mhidas_event_social_user_has_public_clubber(
    v_actor
  ) then
    raise exception 'EVENT_REUNION_CLUBBER_REQUIRED';
  end if;

  if not public.mhidas_event_reunion_user_is_meetup_member_v1(
    p_meetup_id,
    v_actor
  ) then
    raise exception 'EVENT_REUNION_MEETUP_MEMBERSHIP_REQUIRED';
  end if;

  return query
  select
    mp.meetup_point_id,
    mp.meetup_id,
    mp.set_by_user_id,
    mp.label,
    mp.latitude,
    mp.longitude,
    mp.accuracy_meters,
    mp.captured_at,
    mp.received_at,
    mp.expires_at
  from public.event_reunion_meetup_points mp
  where mp.event_group_id = p_event_group_id
    and mp.meetup_id = p_meetup_id
    and mp.expires_at > now()
  limit 1;
end;
$function$;

create or replace function public.mhidas_clear_event_reunion_meetup_point_v1(
  p_event_group_id uuid,
  p_meetup_id uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor uuid := auth.uid();
  v_member_role text;
  v_set_by_user_id uuid;
begin
  if v_actor is null then
    raise exception 'EVENT_REUNION_AUTH_REQUIRED';
  end if;

  select emm.role::text
  into v_member_role
  from public.event_meetups em
  join public.event_meetup_members emm
    on emm.meetup_id = em.meetup_id
  where em.meetup_id = p_meetup_id
    and em.event_group_id = p_event_group_id
    and emm.user_id = v_actor
    and emm.status = 'approved'
  limit 1;

  select mp.set_by_user_id
  into v_set_by_user_id
  from public.event_reunion_meetup_points mp
  where mp.event_group_id = p_event_group_id
    and mp.meetup_id = p_meetup_id
  for update;

  if v_set_by_user_id is null then
    return false;
  end if;

  if v_actor <> v_set_by_user_id
    and coalesce(v_member_role, '') not in ('creator', 'organizer')
  then
    raise exception 'EVENT_REUNION_MEETUP_POINT_CLEAR_FORBIDDEN';
  end if;

  delete from public.event_reunion_meetup_points mp
  where mp.event_group_id = p_event_group_id
    and mp.meetup_id = p_meetup_id;

  return found;
end;
$function$;

revoke all on function public.mhidas_event_reunion_relationship_control_exists_v1(uuid,uuid)
  from public, anon, authenticated;

revoke all on function public.mhidas_event_reunion_user_is_meetup_member_v1(uuid,uuid)
  from public, anon, authenticated;

revoke all on function public.mhidas_event_reunion_pair_shares_meetup_v1(uuid,uuid,uuid)
  from public, anon, authenticated;

revoke all on function public.mhidas_request_event_reunion_person_v1(uuid,uuid,timestamptz)
  from public, anon, authenticated;

revoke all on function public.mhidas_respond_event_reunion_person_v1(uuid,boolean)
  from public, anon, authenticated;

revoke all on function public.mhidas_set_event_reunion_meetup_consent_v1(uuid,uuid,timestamptz,boolean)
  from public, anon, authenticated;

revoke all on function public.mhidas_revoke_event_reunion_consent_v1(uuid)
  from public, anon, authenticated;

revoke all on function public.mhidas_update_event_reunion_location_v1(uuid,double precision,double precision,double precision,timestamptz)
  from public, anon, authenticated;

revoke all on function public.mhidas_read_event_reunion_locations_v1(uuid,uuid)
  from public, anon, authenticated;

revoke all on function public.mhidas_read_event_reunion_consents_v1(uuid)
  from public, anon, authenticated;

revoke all on function public.mhidas_set_event_reunion_meetup_point_v1(uuid,uuid,text,double precision,double precision,double precision,timestamptz,timestamptz)
  from public, anon, authenticated;

revoke all on function public.mhidas_read_event_reunion_meetup_point_v1(uuid,uuid)
  from public, anon, authenticated;

revoke all on function public.mhidas_clear_event_reunion_meetup_point_v1(uuid,uuid)
  from public, anon, authenticated;

grant execute on function public.mhidas_request_event_reunion_person_v1(uuid,uuid,timestamptz)
  to authenticated;

grant execute on function public.mhidas_respond_event_reunion_person_v1(uuid,boolean)
  to authenticated;

grant execute on function public.mhidas_set_event_reunion_meetup_consent_v1(uuid,uuid,timestamptz,boolean)
  to authenticated;

grant execute on function public.mhidas_revoke_event_reunion_consent_v1(uuid)
  to authenticated;

grant execute on function public.mhidas_update_event_reunion_location_v1(uuid,double precision,double precision,double precision,timestamptz)
  to authenticated;

grant execute on function public.mhidas_read_event_reunion_locations_v1(uuid,uuid)
  to authenticated;

grant execute on function public.mhidas_read_event_reunion_consents_v1(uuid)
  to authenticated;

grant execute on function public.mhidas_set_event_reunion_meetup_point_v1(uuid,uuid,text,double precision,double precision,double precision,timestamptz,timestamptz)
  to authenticated;

grant execute on function public.mhidas_read_event_reunion_meetup_point_v1(uuid,uuid)
  to authenticated;

grant execute on function public.mhidas_clear_event_reunion_meetup_point_v1(uuid,uuid)
  to authenticated;

do $postflight$
declare
  v_missing_functions integer;
  v_public_or_anon_execute integer;
  v_authenticated_execute_missing integer;
  v_security_definer_missing integer;
  v_search_path_missing integer;
begin
  select count(*)
  into v_missing_functions
  from (
    values
      ('public.mhidas_request_event_reunion_person_v1(uuid,uuid,timestamptz)'),
      ('public.mhidas_respond_event_reunion_person_v1(uuid,boolean)'),
      ('public.mhidas_set_event_reunion_meetup_consent_v1(uuid,uuid,timestamptz,boolean)'),
      ('public.mhidas_revoke_event_reunion_consent_v1(uuid)'),
      ('public.mhidas_update_event_reunion_location_v1(uuid,double precision,double precision,double precision,timestamptz)'),
      ('public.mhidas_read_event_reunion_locations_v1(uuid,uuid)'),
      ('public.mhidas_read_event_reunion_consents_v1(uuid)'),
      ('public.mhidas_set_event_reunion_meetup_point_v1(uuid,uuid,text,double precision,double precision,double precision,timestamptz,timestamptz)'),
      ('public.mhidas_read_event_reunion_meetup_point_v1(uuid,uuid)'),
      ('public.mhidas_clear_event_reunion_meetup_point_v1(uuid,uuid)')
  ) as expected(signature)
  where to_regprocedure(expected.signature) is null;

  if v_missing_functions <> 0 then
    raise exception 'EVENT_REUNION_RPC_POSTFLIGHT_FUNCTION_MISSING';
  end if;

  select count(*)
  into v_public_or_anon_execute
  from (
    values
      ('public.mhidas_request_event_reunion_person_v1(uuid,uuid,timestamptz)'),
      ('public.mhidas_respond_event_reunion_person_v1(uuid,boolean)'),
      ('public.mhidas_set_event_reunion_meetup_consent_v1(uuid,uuid,timestamptz,boolean)'),
      ('public.mhidas_revoke_event_reunion_consent_v1(uuid)'),
      ('public.mhidas_update_event_reunion_location_v1(uuid,double precision,double precision,double precision,timestamptz)'),
      ('public.mhidas_read_event_reunion_locations_v1(uuid,uuid)'),
      ('public.mhidas_read_event_reunion_consents_v1(uuid)'),
      ('public.mhidas_set_event_reunion_meetup_point_v1(uuid,uuid,text,double precision,double precision,double precision,timestamptz,timestamptz)'),
      ('public.mhidas_read_event_reunion_meetup_point_v1(uuid,uuid)'),
      ('public.mhidas_clear_event_reunion_meetup_point_v1(uuid,uuid)')
  ) as expected(signature)
  where has_function_privilege(
      'anon',
      expected.signature,
      'EXECUTE'
    )
     or has_function_privilege(
      'public',
      expected.signature,
      'EXECUTE'
    );

  if v_public_or_anon_execute <> 0 then
    raise exception 'EVENT_REUNION_RPC_PUBLIC_OR_ANON_EXECUTE_PRESENT';
  end if;

  select count(*)
  into v_authenticated_execute_missing
  from (
    values
      ('public.mhidas_request_event_reunion_person_v1(uuid,uuid,timestamptz)'),
      ('public.mhidas_respond_event_reunion_person_v1(uuid,boolean)'),
      ('public.mhidas_set_event_reunion_meetup_consent_v1(uuid,uuid,timestamptz,boolean)'),
      ('public.mhidas_revoke_event_reunion_consent_v1(uuid)'),
      ('public.mhidas_update_event_reunion_location_v1(uuid,double precision,double precision,double precision,timestamptz)'),
      ('public.mhidas_read_event_reunion_locations_v1(uuid,uuid)'),
      ('public.mhidas_read_event_reunion_consents_v1(uuid)'),
      ('public.mhidas_set_event_reunion_meetup_point_v1(uuid,uuid,text,double precision,double precision,double precision,timestamptz,timestamptz)'),
      ('public.mhidas_read_event_reunion_meetup_point_v1(uuid,uuid)'),
      ('public.mhidas_clear_event_reunion_meetup_point_v1(uuid,uuid)')
  ) as expected(signature)
  where not has_function_privilege(
    'authenticated',
    expected.signature,
    'EXECUTE'
  );

  if v_authenticated_execute_missing <> 0 then
    raise exception 'EVENT_REUNION_RPC_AUTHENTICATED_EXECUTE_MISSING';
  end if;

  select count(*)
  into v_security_definer_missing
  from (
    values
      ('public.mhidas_request_event_reunion_person_v1(uuid,uuid,timestamptz)'),
      ('public.mhidas_respond_event_reunion_person_v1(uuid,boolean)'),
      ('public.mhidas_set_event_reunion_meetup_consent_v1(uuid,uuid,timestamptz,boolean)'),
      ('public.mhidas_revoke_event_reunion_consent_v1(uuid)'),
      ('public.mhidas_update_event_reunion_location_v1(uuid,double precision,double precision,double precision,timestamptz)'),
      ('public.mhidas_read_event_reunion_locations_v1(uuid,uuid)'),
      ('public.mhidas_read_event_reunion_consents_v1(uuid)'),
      ('public.mhidas_set_event_reunion_meetup_point_v1(uuid,uuid,text,double precision,double precision,double precision,timestamptz,timestamptz)'),
      ('public.mhidas_read_event_reunion_meetup_point_v1(uuid,uuid)'),
      ('public.mhidas_clear_event_reunion_meetup_point_v1(uuid,uuid)')
  ) as expected(signature)
  join pg_proc p
    on p.oid = to_regprocedure(expected.signature)
  where p.prosecdef is not true;

  if v_security_definer_missing <> 0 then
    raise exception 'EVENT_REUNION_RPC_SECURITY_DEFINER_MISSING';
  end if;

  select count(*)
  into v_search_path_missing
  from (
    values
      ('public.mhidas_request_event_reunion_person_v1(uuid,uuid,timestamptz)'),
      ('public.mhidas_respond_event_reunion_person_v1(uuid,boolean)'),
      ('public.mhidas_set_event_reunion_meetup_consent_v1(uuid,uuid,timestamptz,boolean)'),
      ('public.mhidas_revoke_event_reunion_consent_v1(uuid)'),
      ('public.mhidas_update_event_reunion_location_v1(uuid,double precision,double precision,double precision,timestamptz)'),
      ('public.mhidas_read_event_reunion_locations_v1(uuid,uuid)'),
      ('public.mhidas_read_event_reunion_consents_v1(uuid)'),
      ('public.mhidas_set_event_reunion_meetup_point_v1(uuid,uuid,text,double precision,double precision,double precision,timestamptz,timestamptz)'),
      ('public.mhidas_read_event_reunion_meetup_point_v1(uuid,uuid)'),
      ('public.mhidas_clear_event_reunion_meetup_point_v1(uuid,uuid)')
  ) as expected(signature)
  join pg_proc p
    on p.oid = to_regprocedure(expected.signature)
  where not (
    coalesce(p.proconfig, array[]::text[])
    @> array['search_path=pg_catalog, public']::text[]
  );

  if v_search_path_missing <> 0 then
    raise exception 'EVENT_REUNION_RPC_SEARCH_PATH_MISSING';
  end if;
end
$postflight$;

commit;
