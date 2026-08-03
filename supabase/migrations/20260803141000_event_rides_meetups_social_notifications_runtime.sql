-- supabase/migrations/20260803141000_event_rides_meetups_social_notifications_runtime.sql
-- MHIDAS / USECLUBBERS
-- V4.8.149 - Transactional social notifications for structured rides and meetups.
-- Scope: in-app generation only. No API, UI, Realtime, push or production access.

begin;

do $dependencies$
begin
  if to_regclass('public.event_rides') is null
    or to_regclass('public.event_ride_members') is null
    or to_regclass('public.event_ride_join_requests') is null
    or to_regclass('public.event_meetups') is null
    or to_regclass('public.event_meetup_members') is null
    or to_regclass('public.event_meetup_join_requests') is null
    or to_regclass('public.social_notifications') is null
  then
    raise exception 'V4_8_149_REQUIRED_TABLE_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_create_social_notification(uuid,uuid,text,uuid,text,text,text,text,text,jsonb,timestamp with time zone)'
  ) is null then
    raise exception 'V4_8_149_NOTIFICATION_CREATOR_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_set_social_notifications_state_by_source(text,uuid,text,text)'
  ) is null then
    raise exception 'V4_8_149_NOTIFICATION_STATE_HELPER_DEPENDENCY_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'event_groups'
      and c.column_name = 'event_slug'
  ) then
    raise exception 'V4_8_149_EVENT_SLUG_DEPENDENCY_MISSING';
  end if;
end
$dependencies$;

alter table public.event_ride_members
  add column if not exists membership_cycle bigint not null default 0;

alter table public.event_meetup_members
  add column if not exists membership_cycle bigint not null default 0;

update public.event_ride_members
set membership_cycle = 1
where role <> 'creator'
  and membership_cycle = 0;

update public.event_meetup_members
set membership_cycle = 1
where role <> 'creator'
  and membership_cycle = 0;

do $cycle_constraints$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'event_ride_members'
      and c.conname = 'event_ride_members_membership_cycle_check'
  ) then
    alter table public.event_ride_members
      add constraint event_ride_members_membership_cycle_check
      check (membership_cycle >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'event_meetup_members'
      and c.conname = 'event_meetup_members_membership_cycle_check'
  ) then
    alter table public.event_meetup_members
      add constraint event_meetup_members_membership_cycle_check
      check (membership_cycle >= 0);
  end if;
end
$cycle_constraints$;

comment on column public.event_ride_members.membership_cycle is
  'V4.8.149 persistent participation cycle used for ride membership notification idempotency.';

comment on column public.event_meetup_members.membership_cycle is
  'V4.8.149 persistent participation cycle used for meetup membership notification idempotency.';

create or replace function public.mhidas_event_ride_membership_cycle_trigger()
returns trigger
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
begin
  if new.role = 'creator' then
    new.membership_cycle := 0;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'approved' then
      new.membership_cycle := 1;
    else
      new.membership_cycle := greatest(
        coalesce(new.membership_cycle, 0),
        0
      );
    end if;

    return new;
  end if;

  if old.status is distinct from new.status
    and new.status = 'approved'
  then
    new.membership_cycle :=
      greatest(coalesce(old.membership_cycle, 0), 0) + 1;
  else
    new.membership_cycle := coalesce(
      old.membership_cycle,
      new.membership_cycle,
      0
    );
  end if;

  return new;
end;
$function$;

create or replace function public.mhidas_event_meetup_membership_cycle_trigger()
returns trigger
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
begin
  if new.role = 'creator' then
    new.membership_cycle := 0;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'approved' then
      new.membership_cycle := 1;
    else
      new.membership_cycle := greatest(
        coalesce(new.membership_cycle, 0),
        0
      );
    end if;

    return new;
  end if;

  if old.status is distinct from new.status
    and new.status = 'approved'
  then
    new.membership_cycle :=
      greatest(coalesce(old.membership_cycle, 0), 0) + 1;
  else
    new.membership_cycle := coalesce(
      old.membership_cycle,
      new.membership_cycle,
      0
    );
  end if;

  return new;
end;
$function$;

create or replace function public.mhidas_get_event_ride_notification_context(
  p_ride_id uuid
)
returns table (
  event_group_id uuid,
  event_slug text,
  creator_user_id uuid,
  source_label text,
  source_category text,
  notification_expires_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    er.event_group_id,
    lower(btrim(eg.event_slug)),
    er.creator_user_id,
    left(
      btrim(
        regexp_replace(
          er.origin_label || ' → ' || er.destination_label,
          '[[:cntrl:]]',
          ' ',
          'g'
        )
      ),
      120
    ),
    er.mode::text || ':' || er.direction::text,
    case
      when er.expires_at is not null
        and er.expires_at > now()
      then er.expires_at
      else null
    end
  from public.event_rides er
  join public.event_groups eg
    on eg.group_id = er.event_group_id
  where er.ride_id = p_ride_id;
$function$;

create or replace function public.mhidas_get_event_meetup_notification_context(
  p_meetup_id uuid
)
returns table (
  event_group_id uuid,
  event_slug text,
  creator_user_id uuid,
  source_label text,
  source_category text,
  notification_expires_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    em.event_group_id,
    lower(btrim(eg.event_slug)),
    em.creator_user_id,
    left(
      btrim(
        regexp_replace(
          em.name,
          '[[:cntrl:]]',
          ' ',
          'g'
        )
      ),
      80
    ),
    'meetup',
    case
      when em.expires_at is not null
        and em.expires_at > now()
      then em.expires_at
      else null
    end
  from public.event_meetups em
  join public.event_groups eg
    on eg.group_id = em.event_group_id
  where em.meetup_id = p_meetup_id;
$function$;

create or replace function public.mhidas_event_ride_join_request_notification_trigger()
returns trigger
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_event_group_id uuid;
  v_event_slug text;
  v_creator_user_id uuid;
  v_source_label text;
  v_source_category text;
  v_expires_at timestamptz;
  v_internal_url text;
  v_notification_type text;
  v_title text;
  v_summary text;
begin
  if v_actor_user_id is null then
    return new;
  end if;

  select
    c.event_group_id,
    c.event_slug,
    c.creator_user_id,
    c.source_label,
    c.source_category,
    c.notification_expires_at
  into
    v_event_group_id,
    v_event_slug,
    v_creator_user_id,
    v_source_label,
    v_source_category,
    v_expires_at
  from public.mhidas_get_event_ride_notification_context(
    new.ride_id
  ) c;

  if v_event_group_id is null
    or v_creator_user_id is null
  then
    raise exception 'V4_8_149_RIDE_NOTIFICATION_CONTEXT_MISSING';
  end if;

  if v_event_slug is null
    or v_event_slug !~ '^[a-z0-9][a-z0-9._~-]{0,199}$'
  then
    raise exception 'V4_8_149_EVENT_SLUG_INVALID';
  end if;

  v_internal_url :=
    '/event/' ||
    v_event_slug ||
    '#event-structured-rides-meetups';

  if tg_op = 'INSERT'
    and new.status = 'pending'
  then
    if new.requester_user_id <> v_actor_user_id then
      raise exception 'V4_8_149_RIDE_REQUEST_ACTOR_MISMATCH';
    end if;

    perform public.mhidas_create_social_notification(
      v_creator_user_id,
      v_event_group_id,
      'ride_join_request',
      new.request_id,
      'ride_join_request.created',
      'ride_join_request:' || new.request_id::text || ':created',
      'Nova solicitação de carona',
      v_internal_url,
      'Uma pessoa solicitou participação na carona.',
      jsonb_build_object(
        'source_label', v_source_label,
        'source_category', v_source_category,
        'event_slug', v_event_slug,
        'request_status', new.status::text,
        'count', new.seats_requested
      ),
      v_expires_at
    );

    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'pending'
    and new.status = 'cancelled'
  then
    if new.requester_user_id = v_actor_user_id
      and new.decided_by_user_id is null
    then
      perform public.mhidas_set_social_notifications_state_by_source(
        'ride_join_request',
        new.request_id,
        'cancelled',
        'ride_join_request_cancelled_by_requester'
      );

      perform public.mhidas_create_social_notification(
        v_creator_user_id,
        v_event_group_id,
        'ride_join_request',
        new.request_id,
        'ride_join_request.cancelled',
        'ride_join_request:' || new.request_id::text || ':cancelled',
        'Solicitação de carona cancelada',
        v_internal_url,
        'A solicitação para participar da carona foi cancelada.',
        jsonb_build_object(
          'source_label', v_source_label,
          'source_category', v_source_category,
          'event_slug', v_event_slug,
          'request_status', new.status::text,
          'count', new.seats_requested
        ),
        v_expires_at
      );

      return new;
    end if;

    if v_creator_user_id = v_actor_user_id
      and new.decided_by_user_id = v_actor_user_id
    then
      perform public.mhidas_set_social_notifications_state_by_source(
        'ride_join_request',
        new.request_id,
        'invalidated',
        'ride_lifecycle_changed'
      );

      return new;
    end if;

    raise exception 'V4_8_149_RIDE_REQUEST_CANCEL_ACTOR_MISMATCH';
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'pending'
    and new.status in ('approved', 'rejected')
  then
    if v_creator_user_id <> v_actor_user_id
      or new.decided_by_user_id is distinct from v_actor_user_id
    then
      raise exception 'V4_8_149_RIDE_REQUEST_DECISION_ACTOR_MISMATCH';
    end if;

    perform public.mhidas_set_social_notifications_state_by_source(
      'ride_join_request',
      new.request_id,
      'invalidated',
      'ride_join_request_decided'
    );

    if new.status = 'approved' then
      v_notification_type := 'ride_join_request.approved';
      v_title := 'Solicitação de carona aprovada';
      v_summary := 'Sua participação na carona foi aprovada.';
    else
      v_notification_type := 'ride_join_request.rejected';
      v_title := 'Solicitação de carona não aprovada';
      v_summary := 'Sua solicitação para participar da carona foi recusada.';
    end if;

    perform public.mhidas_create_social_notification(
      new.requester_user_id,
      v_event_group_id,
      'ride_join_request',
      new.request_id,
      v_notification_type,
      'ride_join_request:' ||
        new.request_id::text ||
        ':' ||
        new.status::text,
      v_title,
      v_internal_url,
      v_summary,
      jsonb_build_object(
        'source_label', v_source_label,
        'source_category', v_source_category,
        'event_slug', v_event_slug,
        'request_status', new.status::text,
        'count', new.seats_requested
      ),
      v_expires_at
    );

    return new;
  end if;

  return new;
end;
$function$;

create or replace function public.mhidas_event_ride_member_notification_trigger()
returns trigger
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_event_group_id uuid;
  v_event_slug text;
  v_creator_user_id uuid;
  v_source_label text;
  v_source_category text;
  v_expires_at timestamptz;
  v_internal_url text;
begin
  if v_actor_user_id is null then
    return new;
  end if;

  if old.status is not distinct from new.status then
    return new;
  end if;

  if old.status <> 'approved'
    or new.status <> 'left'
  then
    return new;
  end if;

  if new.user_id <> v_actor_user_id
    or new.status_changed_by_user_id is distinct from v_actor_user_id
  then
    raise exception 'V4_8_149_RIDE_MEMBER_LEAVE_ACTOR_MISMATCH';
  end if;

  select
    c.event_group_id,
    c.event_slug,
    c.creator_user_id,
    c.source_label,
    c.source_category,
    c.notification_expires_at
  into
    v_event_group_id,
    v_event_slug,
    v_creator_user_id,
    v_source_label,
    v_source_category,
    v_expires_at
  from public.mhidas_get_event_ride_notification_context(
    new.ride_id
  ) c;

  if v_event_group_id is null
    or v_creator_user_id is null
  then
    raise exception 'V4_8_149_RIDE_NOTIFICATION_CONTEXT_MISSING';
  end if;

  if v_event_slug is null
    or v_event_slug !~ '^[a-z0-9][a-z0-9._~-]{0,199}$'
  then
    raise exception 'V4_8_149_EVENT_SLUG_INVALID';
  end if;

  v_internal_url :=
    '/event/' ||
    v_event_slug ||
    '#event-structured-rides-meetups';

  if new.membership_cycle < 1 then
    raise exception 'V4_8_149_RIDE_MEMBERSHIP_CYCLE_MISSING';
  end if;

  perform public.mhidas_create_social_notification(
    v_creator_user_id,
    v_event_group_id,
    'ride_membership',
    new.ride_member_id,
    'ride_membership.left',
    'ride_membership:' ||
      new.ride_member_id::text ||
      ':left:cycle:' ||
      new.membership_cycle::text,
    'Participante saiu da carona',
    v_internal_url,
    'Uma pessoa deixou de participar da carona.',
    jsonb_build_object(
      'source_label', v_source_label,
      'source_category', v_source_category,
      'event_slug', v_event_slug,
      'entity_status', new.status::text
    ),
    v_expires_at
  );

  return new;
end;
$function$;

create or replace function public.mhidas_event_ride_status_notification_trigger()
returns trigger
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_event_group_id uuid;
  v_event_slug text;
  v_creator_user_id uuid;
  v_source_label text;
  v_source_category text;
  v_expires_at timestamptz;
  v_internal_url text;
  v_recipient_user_id uuid;
  v_notification_type text;
  v_title text;
  v_summary text;
begin
  if v_actor_user_id is null then
    return new;
  end if;

  if old.status is not distinct from new.status then
    return new;
  end if;

  if old.status <> 'active'
    or new.status not in ('closed', 'cancelled')
  then
    return new;
  end if;

  select
    c.event_group_id,
    c.event_slug,
    c.creator_user_id,
    c.source_label,
    c.source_category,
    c.notification_expires_at
  into
    v_event_group_id,
    v_event_slug,
    v_creator_user_id,
    v_source_label,
    v_source_category,
    v_expires_at
  from public.mhidas_get_event_ride_notification_context(
    new.ride_id
  ) c;

  if v_event_group_id is null
    or v_creator_user_id is null
  then
    raise exception 'V4_8_149_RIDE_NOTIFICATION_CONTEXT_MISSING';
  end if;

  if v_creator_user_id <> v_actor_user_id then
    raise exception 'V4_8_149_RIDE_STATUS_ACTOR_MISMATCH';
  end if;

  if v_event_slug is null
    or v_event_slug !~ '^[a-z0-9][a-z0-9._~-]{0,199}$'
  then
    raise exception 'V4_8_149_EVENT_SLUG_INVALID';
  end if;

  v_internal_url :=
    '/event/' ||
    v_event_slug ||
    '#event-structured-rides-meetups';

  if new.status = 'closed' then
    v_notification_type := 'ride.closed';
    v_title := 'Carona encerrada';
    v_summary := 'A carona foi encerrada e não aceita novas solicitações.';
  else
    v_notification_type := 'ride.cancelled';
    v_title := 'Carona cancelada';
    v_summary := 'A carona foi cancelada.';
  end if;

  for v_recipient_user_id in
    select recipient.user_id
    from (
      select erm.user_id
      from public.event_ride_members erm
      where erm.ride_id = new.ride_id
        and erm.status = 'approved'

      union

      select erjr.requester_user_id
      from public.event_ride_join_requests erjr
      where erjr.ride_id = new.ride_id
        and erjr.status = 'pending'
    ) recipient
    order by recipient.user_id
  loop
    perform public.mhidas_create_social_notification(
      v_recipient_user_id,
      v_event_group_id,
      'ride',
      new.ride_id,
      v_notification_type,
      'ride:' ||
        new.ride_id::text ||
        ':status:' ||
        new.status::text,
      v_title,
      v_internal_url,
      v_summary,
      jsonb_build_object(
        'source_label', v_source_label,
        'source_category', v_source_category,
        'event_slug', v_event_slug,
        'entity_status', new.status::text
      ),
      v_expires_at
    );
  end loop;

  return new;
end;
$function$;

create or replace function public.mhidas_event_meetup_join_request_notification_trigger()
returns trigger
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_event_group_id uuid;
  v_event_slug text;
  v_creator_user_id uuid;
  v_source_label text;
  v_source_category text;
  v_expires_at timestamptz;
  v_internal_url text;
  v_notification_type text;
  v_title text;
  v_summary text;
begin
  if v_actor_user_id is null then
    return new;
  end if;

  select
    c.event_group_id,
    c.event_slug,
    c.creator_user_id,
    c.source_label,
    c.source_category,
    c.notification_expires_at
  into
    v_event_group_id,
    v_event_slug,
    v_creator_user_id,
    v_source_label,
    v_source_category,
    v_expires_at
  from public.mhidas_get_event_meetup_notification_context(
    new.meetup_id
  ) c;

  if v_event_group_id is null
    or v_creator_user_id is null
  then
    raise exception 'V4_8_149_MEETUP_NOTIFICATION_CONTEXT_MISSING';
  end if;

  if v_event_slug is null
    or v_event_slug !~ '^[a-z0-9][a-z0-9._~-]{0,199}$'
  then
    raise exception 'V4_8_149_EVENT_SLUG_INVALID';
  end if;

  v_internal_url :=
    '/event/' ||
    v_event_slug ||
    '#event-structured-rides-meetups';

  if tg_op = 'INSERT'
    and new.status = 'pending'
  then
    if new.requester_user_id <> v_actor_user_id then
      raise exception 'V4_8_149_MEETUP_REQUEST_ACTOR_MISMATCH';
    end if;

    perform public.mhidas_create_social_notification(
      v_creator_user_id,
      v_event_group_id,
      'meetup_join_request',
      new.request_id,
      'meetup_join_request.created',
      'meetup_join_request:' || new.request_id::text || ':created',
      'Nova solicitação para o encontro',
      v_internal_url,
      'Uma pessoa solicitou participação no encontro.',
      jsonb_build_object(
        'source_label', v_source_label,
        'source_category', v_source_category,
        'event_slug', v_event_slug,
        'request_status', new.status::text
      ),
      v_expires_at
    );

    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'pending'
    and new.status = 'cancelled'
  then
    if new.requester_user_id = v_actor_user_id
      and new.decided_by_user_id is null
    then
      perform public.mhidas_set_social_notifications_state_by_source(
        'meetup_join_request',
        new.request_id,
        'cancelled',
        'meetup_join_request_cancelled_by_requester'
      );

      perform public.mhidas_create_social_notification(
        v_creator_user_id,
        v_event_group_id,
        'meetup_join_request',
        new.request_id,
        'meetup_join_request.cancelled',
        'meetup_join_request:' || new.request_id::text || ':cancelled',
        'Solicitação para o encontro cancelada',
        v_internal_url,
        'A solicitação para participar do encontro foi cancelada.',
        jsonb_build_object(
          'source_label', v_source_label,
          'source_category', v_source_category,
          'event_slug', v_event_slug,
          'request_status', new.status::text
        ),
        v_expires_at
      );

      return new;
    end if;

    if v_creator_user_id = v_actor_user_id
      and new.decided_by_user_id = v_actor_user_id
    then
      perform public.mhidas_set_social_notifications_state_by_source(
        'meetup_join_request',
        new.request_id,
        'invalidated',
        'meetup_lifecycle_changed'
      );

      return new;
    end if;

    raise exception 'V4_8_149_MEETUP_REQUEST_CANCEL_ACTOR_MISMATCH';
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'pending'
    and new.status in ('approved', 'rejected')
  then
    if v_creator_user_id <> v_actor_user_id
      or new.decided_by_user_id is distinct from v_actor_user_id
    then
      raise exception 'V4_8_149_MEETUP_REQUEST_DECISION_ACTOR_MISMATCH';
    end if;

    perform public.mhidas_set_social_notifications_state_by_source(
      'meetup_join_request',
      new.request_id,
      'invalidated',
      'meetup_join_request_decided'
    );

    if new.status = 'approved' then
      v_notification_type := 'meetup_join_request.approved';
      v_title := 'Solicitação para o encontro aprovada';
      v_summary := 'Sua participação no encontro foi aprovada.';
    else
      v_notification_type := 'meetup_join_request.rejected';
      v_title := 'Solicitação para o encontro não aprovada';
      v_summary := 'Sua solicitação para participar do encontro foi recusada.';
    end if;

    perform public.mhidas_create_social_notification(
      new.requester_user_id,
      v_event_group_id,
      'meetup_join_request',
      new.request_id,
      v_notification_type,
      'meetup_join_request:' ||
        new.request_id::text ||
        ':' ||
        new.status::text,
      v_title,
      v_internal_url,
      v_summary,
      jsonb_build_object(
        'source_label', v_source_label,
        'source_category', v_source_category,
        'event_slug', v_event_slug,
        'request_status', new.status::text
      ),
      v_expires_at
    );

    return new;
  end if;

  return new;
end;
$function$;

create or replace function public.mhidas_event_meetup_member_notification_trigger()
returns trigger
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_event_group_id uuid;
  v_event_slug text;
  v_creator_user_id uuid;
  v_source_label text;
  v_source_category text;
  v_expires_at timestamptz;
  v_internal_url text;
begin
  if v_actor_user_id is null then
    return new;
  end if;

  if old.status is not distinct from new.status then
    return new;
  end if;

  if old.status <> 'approved'
    or new.status <> 'left'
  then
    return new;
  end if;

  if new.user_id <> v_actor_user_id
    or new.status_changed_by_user_id is distinct from v_actor_user_id
  then
    raise exception 'V4_8_149_MEETUP_MEMBER_LEAVE_ACTOR_MISMATCH';
  end if;

  select
    c.event_group_id,
    c.event_slug,
    c.creator_user_id,
    c.source_label,
    c.source_category,
    c.notification_expires_at
  into
    v_event_group_id,
    v_event_slug,
    v_creator_user_id,
    v_source_label,
    v_source_category,
    v_expires_at
  from public.mhidas_get_event_meetup_notification_context(
    new.meetup_id
  ) c;

  if v_event_group_id is null
    or v_creator_user_id is null
  then
    raise exception 'V4_8_149_MEETUP_NOTIFICATION_CONTEXT_MISSING';
  end if;

  if v_event_slug is null
    or v_event_slug !~ '^[a-z0-9][a-z0-9._~-]{0,199}$'
  then
    raise exception 'V4_8_149_EVENT_SLUG_INVALID';
  end if;

  v_internal_url :=
    '/event/' ||
    v_event_slug ||
    '#event-structured-rides-meetups';

  if new.membership_cycle < 1 then
    raise exception 'V4_8_149_MEETUP_MEMBERSHIP_CYCLE_MISSING';
  end if;

  perform public.mhidas_create_social_notification(
    v_creator_user_id,
    v_event_group_id,
    'meetup_membership',
    new.meetup_member_id,
    'meetup_membership.left',
    'meetup_membership:' ||
      new.meetup_member_id::text ||
      ':left:cycle:' ||
      new.membership_cycle::text,
    'Participante saiu do encontro',
    v_internal_url,
    'Uma pessoa deixou de participar do encontro.',
    jsonb_build_object(
      'source_label', v_source_label,
      'source_category', v_source_category,
      'event_slug', v_event_slug,
      'entity_status', new.status::text
    ),
    v_expires_at
  );

  return new;
end;
$function$;

create or replace function public.mhidas_event_meetup_status_notification_trigger()
returns trigger
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_event_group_id uuid;
  v_event_slug text;
  v_creator_user_id uuid;
  v_source_label text;
  v_source_category text;
  v_expires_at timestamptz;
  v_internal_url text;
  v_recipient_user_id uuid;
  v_notification_type text;
  v_title text;
  v_summary text;
begin
  if v_actor_user_id is null then
    return new;
  end if;

  if old.status is not distinct from new.status then
    return new;
  end if;

  if old.status <> 'active'
    or new.status not in ('closed', 'cancelled')
  then
    return new;
  end if;

  select
    c.event_group_id,
    c.event_slug,
    c.creator_user_id,
    c.source_label,
    c.source_category,
    c.notification_expires_at
  into
    v_event_group_id,
    v_event_slug,
    v_creator_user_id,
    v_source_label,
    v_source_category,
    v_expires_at
  from public.mhidas_get_event_meetup_notification_context(
    new.meetup_id
  ) c;

  if v_event_group_id is null
    or v_creator_user_id is null
  then
    raise exception 'V4_8_149_MEETUP_NOTIFICATION_CONTEXT_MISSING';
  end if;

  if v_creator_user_id <> v_actor_user_id then
    raise exception 'V4_8_149_MEETUP_STATUS_ACTOR_MISMATCH';
  end if;

  if v_event_slug is null
    or v_event_slug !~ '^[a-z0-9][a-z0-9._~-]{0,199}$'
  then
    raise exception 'V4_8_149_EVENT_SLUG_INVALID';
  end if;

  v_internal_url :=
    '/event/' ||
    v_event_slug ||
    '#event-structured-rides-meetups';

  if new.status = 'closed' then
    v_notification_type := 'meetup.closed';
    v_title := 'Encontro encerrado';
    v_summary := 'O encontro foi encerrado e não aceita novas solicitações.';
  else
    v_notification_type := 'meetup.cancelled';
    v_title := 'Encontro cancelado';
    v_summary := 'O encontro foi cancelado.';
  end if;

  for v_recipient_user_id in
    select recipient.user_id
    from (
      select emm.user_id
      from public.event_meetup_members emm
      where emm.meetup_id = new.meetup_id
        and emm.status = 'approved'

      union

      select emjr.requester_user_id
      from public.event_meetup_join_requests emjr
      where emjr.meetup_id = new.meetup_id
        and emjr.status = 'pending'
    ) recipient
    order by recipient.user_id
  loop
    perform public.mhidas_create_social_notification(
      v_recipient_user_id,
      v_event_group_id,
      'meetup',
      new.meetup_id,
      v_notification_type,
      'meetup:' ||
        new.meetup_id::text ||
        ':status:' ||
        new.status::text,
      v_title,
      v_internal_url,
      v_summary,
      jsonb_build_object(
        'source_label', v_source_label,
        'source_category', v_source_category,
        'event_slug', v_event_slug,
        'entity_status', new.status::text
      ),
      v_expires_at
    );
  end loop;

  return new;
end;
$function$;

drop trigger if exists trg_event_ride_membership_cycle
  on public.event_ride_members;

create trigger trg_event_ride_membership_cycle
before insert or update of status, role
on public.event_ride_members
for each row
execute function public.mhidas_event_ride_membership_cycle_trigger();

drop trigger if exists trg_event_meetup_membership_cycle
  on public.event_meetup_members;

create trigger trg_event_meetup_membership_cycle
before insert or update of status, role
on public.event_meetup_members
for each row
execute function public.mhidas_event_meetup_membership_cycle_trigger();

drop trigger if exists trg_event_ride_join_request_notifications
  on public.event_ride_join_requests;

create trigger trg_event_ride_join_request_notifications
after insert or update of status
on public.event_ride_join_requests
for each row
execute function public.mhidas_event_ride_join_request_notification_trigger();

drop trigger if exists trg_event_ride_member_notifications
  on public.event_ride_members;

create trigger trg_event_ride_member_notifications
after update of status
on public.event_ride_members
for each row
when (old.status is distinct from new.status)
execute function public.mhidas_event_ride_member_notification_trigger();

drop trigger if exists trg_event_ride_status_notifications
  on public.event_rides;

create trigger trg_event_ride_status_notifications
after update of status
on public.event_rides
for each row
when (old.status is distinct from new.status)
execute function public.mhidas_event_ride_status_notification_trigger();

drop trigger if exists trg_event_meetup_join_request_notifications
  on public.event_meetup_join_requests;

create trigger trg_event_meetup_join_request_notifications
after insert or update of status
on public.event_meetup_join_requests
for each row
execute function public.mhidas_event_meetup_join_request_notification_trigger();

drop trigger if exists trg_event_meetup_member_notifications
  on public.event_meetup_members;

create trigger trg_event_meetup_member_notifications
after update of status
on public.event_meetup_members
for each row
when (old.status is distinct from new.status)
execute function public.mhidas_event_meetup_member_notification_trigger();

drop trigger if exists trg_event_meetup_status_notifications
  on public.event_meetups;

create trigger trg_event_meetup_status_notifications
after update of status
on public.event_meetups
for each row
when (old.status is distinct from new.status)
execute function public.mhidas_event_meetup_status_notification_trigger();

revoke all on function public.mhidas_event_ride_membership_cycle_trigger()
  from public, anon, authenticated;

revoke all on function public.mhidas_event_meetup_membership_cycle_trigger()
  from public, anon, authenticated;

revoke all on function public.mhidas_get_event_ride_notification_context(uuid)
  from public, anon, authenticated;

revoke all on function public.mhidas_get_event_meetup_notification_context(uuid)
  from public, anon, authenticated;

revoke all on function public.mhidas_event_ride_join_request_notification_trigger()
  from public, anon, authenticated;

revoke all on function public.mhidas_event_ride_member_notification_trigger()
  from public, anon, authenticated;

revoke all on function public.mhidas_event_ride_status_notification_trigger()
  from public, anon, authenticated;

revoke all on function public.mhidas_event_meetup_join_request_notification_trigger()
  from public, anon, authenticated;

revoke all on function public.mhidas_event_meetup_member_notification_trigger()
  from public, anon, authenticated;

revoke all on function public.mhidas_event_meetup_status_notification_trigger()
  from public, anon, authenticated;

comment on function public.mhidas_event_ride_membership_cycle_trigger() is
  'V4.8.149 persistent ride participation-cycle governance for notification idempotency.';

comment on function public.mhidas_event_meetup_membership_cycle_trigger() is
  'V4.8.149 persistent meetup participation-cycle governance for notification idempotency.';

comment on function public.mhidas_get_event_ride_notification_context(uuid) is
  'V4.8.149 internal context resolver for transaction-bound structured ride notifications.';

comment on function public.mhidas_get_event_meetup_notification_context(uuid) is
  'V4.8.149 internal context resolver for transaction-bound structured meetup notifications.';

comment on function public.mhidas_event_ride_join_request_notification_trigger() is
  'V4.8.149 governed generator for structured ride join-request notifications.';

comment on function public.mhidas_event_ride_member_notification_trigger() is
  'V4.8.149 governed generator for structured ride membership notifications.';

comment on function public.mhidas_event_ride_status_notification_trigger() is
  'V4.8.149 governed generator for structured ride lifecycle notifications.';

comment on function public.mhidas_event_meetup_join_request_notification_trigger() is
  'V4.8.149 governed generator for structured meetup join-request notifications.';

comment on function public.mhidas_event_meetup_member_notification_trigger() is
  'V4.8.149 governed generator for structured meetup membership notifications.';

comment on function public.mhidas_event_meetup_status_notification_trigger() is
  'V4.8.149 governed generator for structured meetup lifecycle notifications.';

do $self_check$
declare
  v_missing_cycle_columns integer;
  v_missing_cycle_constraints integer;
  v_missing_functions integer;
  v_missing_triggers integer;
  v_insecure_functions integer;
  v_exposed_internal_functions integer;
begin
  select count(*)
  into v_missing_cycle_columns
  from (
    values
      ('event_ride_members'),
      ('event_meetup_members')
  ) expected(table_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = expected.table_name
      and c.column_name = 'membership_cycle'
      and c.data_type = 'bigint'
      and c.is_nullable = 'NO'
  );

  if v_missing_cycle_columns <> 0 then
    raise exception 'V4_8_149_MEMBERSHIP_CYCLE_COLUMN_SELF_CHECK_FAILED';
  end if;

  select count(*)
  into v_missing_cycle_constraints
  from (
    values
      (
        'event_ride_members',
        'event_ride_members_membership_cycle_check'
      ),
      (
        'event_meetup_members',
        'event_meetup_members_membership_cycle_check'
      )
  ) expected(table_name, constraint_name)
  where not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = expected.table_name
      and c.conname = expected.constraint_name
      and c.contype = 'c'
      and c.convalidated
  );

  if v_missing_cycle_constraints <> 0 then
    raise exception 'V4_8_149_MEMBERSHIP_CYCLE_CONSTRAINT_SELF_CHECK_FAILED';
  end if;

  select count(*)
  into v_missing_functions
  from (
    values
      ('public.mhidas_event_ride_membership_cycle_trigger()'),
      ('public.mhidas_event_meetup_membership_cycle_trigger()'),
      ('public.mhidas_get_event_ride_notification_context(uuid)'),
      ('public.mhidas_get_event_meetup_notification_context(uuid)'),
      ('public.mhidas_event_ride_join_request_notification_trigger()'),
      ('public.mhidas_event_ride_member_notification_trigger()'),
      ('public.mhidas_event_ride_status_notification_trigger()'),
      ('public.mhidas_event_meetup_join_request_notification_trigger()'),
      ('public.mhidas_event_meetup_member_notification_trigger()'),
      ('public.mhidas_event_meetup_status_notification_trigger()')
  ) expected(signature)
  where to_regprocedure(expected.signature) is null;

  if v_missing_functions <> 0 then
    raise exception 'V4_8_149_FUNCTION_SELF_CHECK_FAILED';
  end if;

  select count(*)
  into v_missing_triggers
  from (
    values
      (
        'event_ride_members',
        'trg_event_ride_membership_cycle'
      ),
      (
        'event_meetup_members',
        'trg_event_meetup_membership_cycle'
      ),
      (
        'event_ride_join_requests',
        'trg_event_ride_join_request_notifications'
      ),
      (
        'event_ride_members',
        'trg_event_ride_member_notifications'
      ),
      (
        'event_rides',
        'trg_event_ride_status_notifications'
      ),
      (
        'event_meetup_join_requests',
        'trg_event_meetup_join_request_notifications'
      ),
      (
        'event_meetup_members',
        'trg_event_meetup_member_notifications'
      ),
      (
        'event_meetups',
        'trg_event_meetup_status_notifications'
      )
  ) expected(table_name, trigger_name)
  where not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = expected.table_name
      and t.tgname = expected.trigger_name
      and not t.tgisinternal
      and t.tgenabled <> 'D'
  );

  if v_missing_triggers <> 0 then
    raise exception 'V4_8_149_TRIGGER_SELF_CHECK_FAILED';
  end if;

  select count(*)
  into v_insecure_functions
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'mhidas_event_ride_membership_cycle_trigger',
      'mhidas_event_meetup_membership_cycle_trigger',
      'mhidas_get_event_ride_notification_context',
      'mhidas_get_event_meetup_notification_context',
      'mhidas_event_ride_join_request_notification_trigger',
      'mhidas_event_ride_member_notification_trigger',
      'mhidas_event_ride_status_notification_trigger',
      'mhidas_event_meetup_join_request_notification_trigger',
      'mhidas_event_meetup_member_notification_trigger',
      'mhidas_event_meetup_status_notification_trigger'
    )
    and (
      not p.prosecdef
      or not (
        coalesce(p.proconfig, '{}'::text[])
        @> array['search_path=pg_catalog, public']
      )
    );

  if v_insecure_functions <> 0 then
    raise exception 'V4_8_149_SECURITY_DEFINER_SELF_CHECK_FAILED';
  end if;

  select count(*)
  into v_exposed_internal_functions
  from (
    values
      ('public.mhidas_event_ride_membership_cycle_trigger()'),
      ('public.mhidas_event_meetup_membership_cycle_trigger()'),
      ('public.mhidas_get_event_ride_notification_context(uuid)'),
      ('public.mhidas_get_event_meetup_notification_context(uuid)'),
      ('public.mhidas_event_ride_join_request_notification_trigger()'),
      ('public.mhidas_event_ride_member_notification_trigger()'),
      ('public.mhidas_event_ride_status_notification_trigger()'),
      ('public.mhidas_event_meetup_join_request_notification_trigger()'),
      ('public.mhidas_event_meetup_member_notification_trigger()'),
      ('public.mhidas_event_meetup_status_notification_trigger()')
  ) expected(signature)
  where has_function_privilege(
    'anon',
    expected.signature,
    'EXECUTE'
  )
  or has_function_privilege(
    'authenticated',
    expected.signature,
    'EXECUTE'
  );

  if v_exposed_internal_functions <> 0 then
    raise exception 'V4_8_149_INTERNAL_FUNCTION_ACL_SELF_CHECK_FAILED';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.mhidas_create_event_ride(uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,integer,text,text,text,text,timestamp with time zone)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_request_join_event_ride(uuid,integer,text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_decide_event_ride_request(uuid,text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_cancel_event_ride_request(uuid)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_leave_event_ride(uuid)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_set_event_ride_status(uuid,text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_create_event_meetup(uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,integer,text,text,timestamp with time zone)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_request_join_event_meetup(uuid,text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_decide_event_meetup_request(uuid,text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_cancel_event_meetup_request(uuid)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_leave_event_meetup(uuid)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_set_event_meetup_status(uuid,text)',
    'EXECUTE'
  )
  then
    raise exception 'V4_8_149_EXISTING_RIDES_MEETUPS_RPC_ACL_DRIFT';
  end if;
end
$self_check$;

commit;
