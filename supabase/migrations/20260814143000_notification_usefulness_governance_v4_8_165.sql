-- MHIDAS / USECLUBBERS
-- V4.8.165-A - Notification usefulness governance and explicit profile identity.
-- Local migration only. No scheduler, dispatcher invocation, test notification,
-- staging access or production access is performed by this file.
--
-- Product rules:
-- 1. One authenticated user may have Clubber and Professional identities.
-- 2. Notification copy must state the relevant profile explicitly.
-- 3. Push is reserved for actionable/operational events.
-- 4. Low-value social events remain in-app/badge.
-- 5. Self-generated confirmations must not become notification spam.

begin;

-- Push is deliberately limited to actionable or operational notification types.
-- Low-value social events remain in-app + badge to avoid notification fatigue.

update public.notification_type_registry
set
  default_channels = array[
    'in_app',
    'badge',
    'push'
  ]::public.notification_delivery_channel[],
  updated_at = now()
where notification_type in (
  'tribe_join_request.created',
  'tribe_join_request.approved',
  'tribe_membership.removed',
  'tribe_membership.blocked',
  'tribe.cancelled',
  'ride_join_request.created',
  'ride_join_request.approved',
  'ride.cancelled',
  'meetup_join_request.created',
  'meetup_join_request.approved',
  'meetup.cancelled',
  'professional_connection.requested',
  'professional_connection.accepted'
);

-- Explicit anti-noise policy.
update public.notification_type_registry
set
  default_channels = array[
    'in_app',
    'badge'
  ]::public.notification_delivery_channel[],
  updated_at = now()
where notification_type in (
  'professional_follow.created',
  'professional_connection.declined',
  'professional_connection.cancelled',
  'professional_connection.ended',
  'tribe_join_request.cancelled',
  'tribe_join_request.rejected',
  'tribe_membership.left',
  'tribe_membership.role_changed',
  'tribe.reopened',
  'tribe.closed',
  'tribe.archived',
  'ride_join_request.cancelled',
  'ride_join_request.rejected',
  'ride_membership.left',
  'ride.closed',
  'meetup_join_request.cancelled',
  'meetup_join_request.rejected',
  'meetup_membership.left',
  'meetup.closed'
);

create or replace function public.mhidas_event_tribe_join_request_notification_trigger()
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
  v_tribe_name text;
  v_expires_at timestamptz;
  v_internal_url text;
  v_recipient_user_id uuid;
  v_notification_type text;
  v_title text;
  v_summary text;
  v_idempotency_key text;
begin
  if v_actor_user_id is null then
    return new;
  end if;

  select
    c.event_group_id,
    c.event_slug,
    c.tribe_name,
    c.notification_expires_at
  into
    v_event_group_id,
    v_event_slug,
    v_tribe_name,
    v_expires_at
  from public.mhidas_get_event_tribe_notification_context(
    new.tribe_id
  ) c;

  if v_event_group_id is null then
    raise exception 'V4_8_148_TRIBE_NOTIFICATION_CONTEXT_MISSING';
  end if;

  if v_event_slug is null
    or v_event_slug !~ '^[a-z0-9][a-z0-9._~-]{0,199}$'
  then
    raise exception 'V4_8_148_EVENT_SLUG_INVALID';
  end if;

  v_internal_url := '/event/' || v_event_slug;

  if tg_op = 'INSERT'
    and new.status = 'pending'
  then
    if new.requester_user_id <> v_actor_user_id then
      raise exception 'V4_8_148_JOIN_REQUEST_ACTOR_MISMATCH';
    end if;

    for v_recipient_user_id in
      select etm.user_id
      from public.event_tribe_members etm
      where etm.tribe_id = new.tribe_id
        and etm.status = 'approved'
        and etm.role in ('creator', 'organizer', 'moderator')
      order by etm.created_at, etm.tribe_member_id
    loop
      perform public.mhidas_create_social_notification(
        v_recipient_user_id,
        v_event_group_id,
        'tribe_join_request',
        new.request_id,
        'tribe_join_request.created',
        'tribe_join_request:' || new.request_id::text || ':created',
        'Perfil Clubber · Nova solicitação para a tribo',
        v_internal_url,
        'Seu Perfil Clubber recebeu uma solicitação para entrar na tribo ' || coalesce(v_tribe_name, 'deste evento') || '.',
        jsonb_build_object(
          'profile_mode', 'clubber',
          'source_label', v_tribe_name,
          'event_slug', v_event_slug,
          'request_status', new.status::text
        ),
        v_expires_at
      );
    end loop;

    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'pending'
    and new.status = 'cancelled'
  then
    if new.requester_user_id <> v_actor_user_id then
      raise exception 'V4_8_148_JOIN_REQUEST_CANCEL_ACTOR_MISMATCH';
    end if;

    perform public.mhidas_set_social_notifications_state_by_source(
      'tribe_join_request',
      new.request_id,
      'cancelled',
      'tribe_join_request_cancelled'
    );

    for v_recipient_user_id in
      select etm.user_id
      from public.event_tribe_members etm
      where etm.tribe_id = new.tribe_id
        and etm.status = 'approved'
        and etm.role in ('creator', 'organizer', 'moderator')
      order by etm.created_at, etm.tribe_member_id
    loop
      perform public.mhidas_create_social_notification(
        v_recipient_user_id,
        v_event_group_id,
        'tribe_join_request',
        new.request_id,
        'tribe_join_request.cancelled',
        'tribe_join_request:' || new.request_id::text || ':cancelled',
        'Perfil Clubber · Solicitação para a tribo cancelada',
        v_internal_url,
        'A solicitação para entrar na tribo ' || coalesce(v_tribe_name, 'deste evento') || ' foi cancelada.',
        jsonb_build_object(
          'profile_mode', 'clubber',
          'source_label', v_tribe_name,
          'event_slug', v_event_slug,
          'request_status', new.status::text
        ),
        v_expires_at
      );
    end loop;

    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'pending'
    and new.status in ('approved', 'rejected')
  then
    if new.decided_by_user_id is distinct from v_actor_user_id then
      raise exception 'V4_8_148_JOIN_REQUEST_DECISION_ACTOR_MISMATCH';
    end if;

    perform public.mhidas_set_social_notifications_state_by_source(
      'tribe_join_request',
      new.request_id,
      'invalidated',
      'tribe_join_request_decided'
    );

    if new.status = 'approved' then
      v_notification_type := 'tribe_join_request.approved';
      v_title := 'Perfil Clubber · Entrada na tribo aprovada';
      v_summary := 'Seu Perfil Clubber foi aceito na tribo ' || coalesce(v_tribe_name, 'deste evento') || '.';
    else
      v_notification_type := 'tribe_join_request.rejected';
      v_title := 'Perfil Clubber · Entrada na tribo não aprovada';
      v_summary := 'A solicitação do seu Perfil Clubber para entrar na tribo ' || coalesce(v_tribe_name, 'deste evento') || ' não foi aprovada.';
    end if;

    v_idempotency_key :=
      'tribe_join_request:' ||
      new.request_id::text ||
      ':' ||
      new.status::text;

    perform public.mhidas_create_social_notification(
      new.requester_user_id,
      v_event_group_id,
      'tribe_join_request',
      new.request_id,
      v_notification_type,
      v_idempotency_key,
      v_title,
      v_internal_url,
      v_summary,
      jsonb_build_object(
          'profile_mode', 'clubber',
        'source_label', v_tribe_name,
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

create or replace function public.mhidas_event_tribe_member_notification_trigger()
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
  v_tribe_name text;
  v_expires_at timestamptz;
  v_internal_url text;
  v_recipient_user_id uuid;
  v_revision text;
begin
  if v_actor_user_id is null then
    return new;
  end if;

  if old.status is not distinct from new.status
    and old.role is not distinct from new.role
  then
    return new;
  end if;

  if new.status_changed_by_user_id is distinct from v_actor_user_id then
    raise exception 'V4_8_148_TRIBE_MEMBER_ACTOR_MISMATCH';
  end if;

  select
    c.event_group_id,
    c.event_slug,
    c.tribe_name,
    c.notification_expires_at
  into
    v_event_group_id,
    v_event_slug,
    v_tribe_name,
    v_expires_at
  from public.mhidas_get_event_tribe_notification_context(
    new.tribe_id
  ) c;

  if v_event_group_id is null then
    raise exception 'V4_8_148_TRIBE_NOTIFICATION_CONTEXT_MISSING';
  end if;

  if v_event_slug is null
    or v_event_slug !~ '^[a-z0-9][a-z0-9._~-]{0,199}$'
  then
    raise exception 'V4_8_148_EVENT_SLUG_INVALID';
  end if;

  v_internal_url := '/event/' || v_event_slug;

  v_revision := (
    floor(
      extract(
        epoch from coalesce(
          new.status_changed_at,
          new.updated_at,
          clock_timestamp()
        )
      ) * 1000000
    )::bigint
  )::text;

  if old.status = 'approved'
    and new.status = 'left'
  then
    for v_recipient_user_id in
      select etm.user_id
      from public.event_tribe_members etm
      where etm.tribe_id = new.tribe_id
        and etm.status = 'approved'
        and etm.role in ('creator', 'organizer', 'moderator')
      order by etm.created_at, etm.tribe_member_id
    loop
      perform public.mhidas_create_social_notification(
        v_recipient_user_id,
        v_event_group_id,
        'tribe_membership',
        new.tribe_member_id,
        'tribe_membership.left',
        'tribe_membership:' ||
          new.tribe_member_id::text ||
          ':left:' ||
          v_revision,
        'Perfil Clubber · Participante saiu da tribo',
        v_internal_url,
        'Um participante saiu da tribo ' || coalesce(v_tribe_name, 'deste evento') || '.',
        jsonb_build_object(
          'profile_mode', 'clubber',
          'source_label', v_tribe_name,
          'event_slug', v_event_slug,
          'entity_status', new.status::text
        ),
        v_expires_at
      );
    end loop;

    return new;
  end if;

  if old.status = 'approved'
    and new.status in ('removed', 'blocked')
  then
    perform public.mhidas_create_social_notification(
      new.user_id,
      v_event_group_id,
      'tribe_membership',
      new.tribe_member_id,
      case
        when new.status = 'blocked'
          then 'tribe_membership.blocked'
        else 'tribe_membership.removed'
      end,
      'tribe_membership:' ||
        new.tribe_member_id::text ||
        ':' ||
        new.status::text ||
        ':' ||
        v_revision,
      case
        when new.status = 'blocked'
          then 'Perfil Clubber · Acesso à tribo bloqueado'
        else 'Perfil Clubber · Você foi removido da tribo'
      end,
      v_internal_url,
      case
        when new.status = 'blocked'
          then 'O acesso do seu Perfil Clubber à tribo ' || coalesce(v_tribe_name, 'deste evento') || ' foi bloqueado.'
        else 'A participação do seu Perfil Clubber na tribo ' || coalesce(v_tribe_name, 'deste evento') || ' foi encerrada.'
      end,
      jsonb_build_object(
          'profile_mode', 'clubber',
        'source_label', v_tribe_name,
        'event_slug', v_event_slug,
        'entity_status', new.status::text
      ),
      v_expires_at
    );

    return new;
  end if;

  if old.role is distinct from new.role
    and new.status = 'approved'
  then
    perform public.mhidas_create_social_notification(
      new.user_id,
      v_event_group_id,
      'tribe_membership',
      new.tribe_member_id,
      'tribe_membership.role_changed',
      'tribe_membership:' ||
        new.tribe_member_id::text ||
        ':role:' ||
        new.role::text ||
        ':' ||
        v_revision,
      'Perfil Clubber · Sua função na tribo mudou',
      v_internal_url,
      'A função do seu Perfil Clubber na tribo ' || coalesce(v_tribe_name, 'deste evento') || ' foi atualizada.',
      jsonb_build_object(
          'profile_mode', 'clubber',
        'source_label', v_tribe_name,
        'event_slug', v_event_slug,
        'member_role', new.role::text
      ),
      v_expires_at
    );
  end if;

  return new;
end;
$function$;

create or replace function public.mhidas_event_tribe_status_notification_trigger()
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
  v_tribe_name text;
  v_expires_at timestamptz;
  v_internal_url text;
  v_recipient_user_id uuid;
  v_request_id uuid;
  v_revision text;
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

  if not exists (
    select 1
    from public.event_tribe_members etm
    where etm.tribe_id = new.tribe_id
      and etm.user_id = v_actor_user_id
      and etm.status = 'approved'
      and etm.role in ('creator', 'organizer')
  ) then
    raise exception 'V4_8_148_TRIBE_STATUS_ACTOR_INVALID';
  end if;

  select
    c.event_group_id,
    c.event_slug,
    c.tribe_name,
    c.notification_expires_at
  into
    v_event_group_id,
    v_event_slug,
    v_tribe_name,
    v_expires_at
  from public.mhidas_get_event_tribe_notification_context(
    new.tribe_id
  ) c;

  if v_event_group_id is null then
    raise exception 'V4_8_148_TRIBE_NOTIFICATION_CONTEXT_MISSING';
  end if;

  if v_event_slug is null
    or v_event_slug !~ '^[a-z0-9][a-z0-9._~-]{0,199}$'
  then
    raise exception 'V4_8_148_EVENT_SLUG_INVALID';
  end if;

  v_internal_url := '/event/' || v_event_slug;

  v_revision := (
    floor(
      extract(
        epoch from coalesce(
          new.updated_at,
          clock_timestamp()
        )
      ) * 1000000
    )::bigint
  )::text;

  case new.status
    when 'active' then
      v_notification_type := 'tribe.reopened';
      v_title := 'Perfil Clubber · Tribo reaberta';
      v_summary := 'A tribo ' || coalesce(v_tribe_name, 'deste evento') || ' foi reaberta.';
    when 'closed' then
      v_notification_type := 'tribe.closed';
      v_title := 'Perfil Clubber · Tribo encerrada';
      v_summary := 'A tribo ' || coalesce(v_tribe_name, 'deste evento') || ' foi encerrada temporariamente.';
    when 'cancelled' then
      v_notification_type := 'tribe.cancelled';
      v_title := 'Perfil Clubber · Tribo cancelada';
      v_summary := 'A tribo ' || coalesce(v_tribe_name, 'deste evento') || ' foi cancelada.';
    when 'archived' then
      v_notification_type := 'tribe.archived';
      v_title := 'Perfil Clubber · Tribo arquivada';
      v_summary := 'A tribo ' || coalesce(v_tribe_name, 'deste evento') || ' foi arquivada.';
    else
      raise exception 'V4_8_148_TRIBE_STATUS_NOTIFICATION_UNSUPPORTED';
  end case;

  if new.status in ('cancelled', 'archived') then
    for v_request_id in
      select etjr.request_id
      from public.event_tribe_join_requests etjr
      where etjr.tribe_id = new.tribe_id
        and etjr.status = 'pending'
      order by etjr.created_at, etjr.request_id
    loop
      perform public.mhidas_set_social_notifications_state_by_source(
        'tribe_join_request',
        v_request_id,
        'invalidated',
        'tribe_final_status'
      );
    end loop;
  end if;

  for v_recipient_user_id in
    select recipient.user_id
    from (
      select etm.user_id
      from public.event_tribe_members etm
      where etm.tribe_id = new.tribe_id
        and etm.status = 'approved'

      union

      select etjr.requester_user_id
      from public.event_tribe_join_requests etjr
      where etjr.tribe_id = new.tribe_id
        and etjr.status = 'pending'
        and new.status in ('cancelled', 'archived')
    ) recipient
    order by recipient.user_id
  loop
    perform public.mhidas_create_social_notification(
      v_recipient_user_id,
      v_event_group_id,
      'tribe',
      new.tribe_id,
      v_notification_type,
      'tribe:' ||
        new.tribe_id::text ||
        ':status:' ||
        new.status::text ||
        ':' ||
        v_revision,
      v_title,
      v_internal_url,
      v_summary,
      jsonb_build_object(
          'profile_mode', 'clubber',
        'source_label', v_tribe_name,
        'event_slug', v_event_slug,
        'entity_status', new.status::text
      ),
      v_expires_at
    );
  end loop;

  return new;
end;
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
      'Perfil Clubber · Nova solicitação de carona',
      v_internal_url,
      'Seu Perfil Clubber recebeu uma solicitação para participar da carona ' || coalesce(v_source_label, 'deste evento') || '.',
      jsonb_build_object(
          'profile_mode', 'clubber',
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
        'Perfil Clubber · Solicitação de carona cancelada',
        v_internal_url,
        'A solicitação para participar da carona ' || coalesce(v_source_label, 'deste evento') || ' foi cancelada.',
        jsonb_build_object(
          'profile_mode', 'clubber',
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
      v_title := 'Perfil Clubber · Carona aprovada';
      v_summary := 'A participação do seu Perfil Clubber na carona ' || coalesce(v_source_label, 'deste evento') || ' foi aprovada.';
    else
      v_notification_type := 'ride_join_request.rejected';
      v_title := 'Perfil Clubber · Carona não aprovada';
      v_summary := 'A solicitação do seu Perfil Clubber para a carona ' || coalesce(v_source_label, 'deste evento') || ' não foi aprovada.';
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
          'profile_mode', 'clubber',
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
    'Perfil Clubber · Participante saiu da carona',
    v_internal_url,
    'Um participante saiu da carona ' || coalesce(v_source_label, 'deste evento') || '.',
    jsonb_build_object(
          'profile_mode', 'clubber',
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
    v_title := 'Perfil Clubber · Carona encerrada';
    v_summary := 'A carona ' || coalesce(v_source_label, 'deste evento') || ' foi encerrada e não aceita novas solicitações.';
  else
    v_notification_type := 'ride.cancelled';
    v_title := 'Perfil Clubber · Carona cancelada';
    v_summary := 'A carona ' || coalesce(v_source_label, 'deste evento') || ' foi cancelada.';
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
          'profile_mode', 'clubber',
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
      'Perfil Clubber · Nova solicitação para o encontro',
      v_internal_url,
      'Seu Perfil Clubber recebeu uma solicitação para participar do encontro ' || coalesce(v_source_label, 'deste evento') || '.',
      jsonb_build_object(
          'profile_mode', 'clubber',
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
        'Perfil Clubber · Solicitação para o encontro cancelada',
        v_internal_url,
        'A solicitação para participar do encontro ' || coalesce(v_source_label, 'deste evento') || ' foi cancelada.',
        jsonb_build_object(
          'profile_mode', 'clubber',
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
      v_title := 'Perfil Clubber · Encontro aprovado';
      v_summary := 'A participação do seu Perfil Clubber no encontro ' || coalesce(v_source_label, 'deste evento') || ' foi aprovada.';
    else
      v_notification_type := 'meetup_join_request.rejected';
      v_title := 'Perfil Clubber · Encontro não aprovado';
      v_summary := 'A solicitação do seu Perfil Clubber para o encontro ' || coalesce(v_source_label, 'deste evento') || ' não foi aprovada.';
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
          'profile_mode', 'clubber',
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
    'Perfil Clubber · Participante saiu do encontro',
    v_internal_url,
    'Um participante saiu do encontro ' || coalesce(v_source_label, 'deste evento') || '.',
    jsonb_build_object(
          'profile_mode', 'clubber',
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
    v_title := 'Perfil Clubber · Encontro encerrado';
    v_summary := 'O encontro ' || coalesce(v_source_label, 'deste evento') || ' foi encerrado e não aceita novas solicitações.';
  else
    v_notification_type := 'meetup.cancelled';
    v_title := 'Perfil Clubber · Encontro cancelado';
    v_summary := 'O encontro ' || coalesce(v_source_label, 'deste evento') || ' foi cancelado.';
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
          'profile_mode', 'clubber',
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

create or replace function public.mhidas_professional_follow_notification_trigger()
returns trigger
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_actor_slug text;
  v_actor_label text;
  v_actor_internal_url text;
begin
  if tg_op = 'INSERT' then
    if v_actor_user_id is null then
      return new;
    end if;

    if new.follower_user_id <> v_actor_user_id then
      raise exception 'V4_8_150_FOLLOW_ACTOR_MISMATCH';
    end if;

    select
      c.profile_slug,
      c.profile_label,
      c.profile_internal_url
    into
      v_actor_slug,
      v_actor_label,
      v_actor_internal_url
    from public.mhidas_get_professional_notification_context(
      v_actor_user_id
    ) c;

    if v_actor_label is null
      or v_actor_internal_url is null
    then
      raise exception 'V4_8_150_FOLLOW_CONTEXT_MISSING';
    end if;

    perform public.mhidas_create_social_notification(
      new.followed_user_id,
      null,
      'professional_follow',
      new.id,
      'professional_follow.created',
      'professional_follow:' || new.id::text || ':created',
      'Perfil Profissional · Novo seguidor',
      v_actor_internal_url,
      v_actor_label || ' começou a seguir seu Perfil Profissional.',
      jsonb_build_object(
        'profile_mode', 'professional',
        'actor_label', v_actor_label,
        'actor_slug', v_actor_slug,
        'profile_slug', v_actor_slug,
        'entity_status', 'following'
      ),
      null
    );

    return new;
  end if;

  if tg_op = 'DELETE' then
    if v_actor_user_id is null then
      return old;
    end if;

    if old.follower_user_id <> v_actor_user_id then
      raise exception 'V4_8_150_UNFOLLOW_ACTOR_MISMATCH';
    end if;

    perform public.mhidas_set_social_notifications_state_by_source(
      'professional_follow',
      old.id,
      'cancelled',
      'professional_follow_removed'
    );

    return old;
  end if;

  return new;
end;
$function$;

create or replace function public.mhidas_professional_connection_notification_trigger()
returns trigger
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_actor_slug text;
  v_actor_label text;
  v_recipient_user_id uuid;
  v_notification_type text;
  v_idempotency_suffix text;
  v_title text;
  v_summary text;
  v_state_status text;
  v_state_reason text;
begin
  if tg_op = 'DELETE' then
    if v_actor_user_id is null then
      return old;
    end if;

    if old.requester_user_id <> v_actor_user_id
      and old.target_user_id <> v_actor_user_id
    then
      raise exception 'V4_8_150_CONNECTION_DELETE_ACTOR_MISMATCH';
    end if;

    perform public.mhidas_set_social_notifications_state_by_source(
      'professional_connection',
      old.id,
      'cancelled',
      'professional_connection_deleted'
    );

    return old;
  end if;

  if v_actor_user_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      if new.requester_user_id <> v_actor_user_id then
        raise exception 'V4_8_150_CONNECTION_REQUEST_ACTOR_MISMATCH';
      end if;

      v_recipient_user_id := new.target_user_id;
      v_notification_type := 'professional_connection.requested';
      v_idempotency_suffix := 'requested';
      v_title := 'Perfil Profissional · Nova solicitação de conexão';
      v_summary :=
        'Seu Perfil Profissional recebeu uma nova solicitação de conexão.';
    elsif new.status in ('accepted', 'connected') then
      if new.requester_user_id <> v_actor_user_id then
        raise exception 'V4_8_150_DIRECT_CONNECTION_ACTOR_MISMATCH';
      end if;

      v_recipient_user_id := new.target_user_id;
      v_notification_type := 'professional_connection.accepted';
      v_idempotency_suffix := 'accepted';
      v_title := 'Nova conexão profissional';
      v_summary := 'Uma nova conexão profissional foi criada.';
    else
      return new;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.status is not distinct from new.status then
      return new;
    end if;

    if old.status = 'pending'
      and new.status in ('accepted', 'declined')
    then
      if new.target_user_id <> v_actor_user_id then
        raise exception 'V4_8_150_CONNECTION_DECISION_ACTOR_MISMATCH';
      end if;

      perform public.mhidas_set_social_notifications_state_by_source(
        'professional_connection',
        new.id,
        'invalidated',
        'professional_connection_decided'
      );

      v_recipient_user_id := new.requester_user_id;

      if new.status = 'accepted' then
        v_notification_type := 'professional_connection.accepted';
        v_idempotency_suffix := 'accepted';
        v_title := 'Conexão profissional aceita';
        v_summary :=
          'Sua solicitação de conexão profissional foi aceita.';
      else
        v_notification_type := 'professional_connection.declined';
        v_idempotency_suffix := 'declined';
        v_title := 'Solicitação de conexão não aceita';
        v_summary :=
          'Sua solicitação de conexão profissional foi recusada.';
      end if;
    elsif old.status = 'pending'
      and new.status = 'cancelled'
    then
      if new.requester_user_id <> v_actor_user_id then
        raise exception 'V4_8_150_CONNECTION_CANCEL_ACTOR_MISMATCH';
      end if;

      perform public.mhidas_set_social_notifications_state_by_source(
        'professional_connection',
        new.id,
        'cancelled',
        'professional_connection_cancelled_by_requester'
      );

      v_recipient_user_id := new.target_user_id;
      v_notification_type := 'professional_connection.cancelled';
      v_idempotency_suffix := 'cancelled';
      v_title := 'Solicitação de conexão cancelada';
      v_summary :=
        'A solicitação de conexão profissional foi cancelada.';
    elsif old.status in ('accepted', 'connected')
      and new.status = 'cancelled'
    then
      if new.requester_user_id <> v_actor_user_id
        and new.target_user_id <> v_actor_user_id
      then
        raise exception 'V4_8_150_CONNECTION_END_ACTOR_MISMATCH';
      end if;

      perform public.mhidas_set_social_notifications_state_by_source(
        'professional_connection',
        new.id,
        'cancelled',
        'professional_connection_ended'
      );

      v_recipient_user_id := case
        when new.requester_user_id = v_actor_user_id
        then new.target_user_id
        else new.requester_user_id
      end;

      v_notification_type := 'professional_connection.ended';
      v_idempotency_suffix := 'ended';
      v_title := 'Conexão profissional encerrada';
      v_summary := 'Uma conexão profissional foi encerrada.';
    else
      return new;
    end if;
  else
    return new;
  end if;

  select
    c.profile_slug,
    c.profile_label
  into
    v_actor_slug,
    v_actor_label
  from public.mhidas_get_professional_notification_context(
    v_actor_user_id
  ) c;

  if v_actor_label is null then
    raise exception 'V4_8_150_CONNECTION_CONTEXT_MISSING';
  end if;

  case v_notification_type
    when 'professional_connection.requested' then
      v_title := 'Perfil Profissional · Nova solicitação de conexão';
      v_summary :=
        v_actor_label ||
        ' enviou uma solicitação de conexão ao seu Perfil Profissional.';
    when 'professional_connection.accepted' then
      v_title := 'Perfil Profissional · Conexão confirmada';
      v_summary :=
        v_actor_label ||
        ' confirmou uma conexão com seu Perfil Profissional.';
    when 'professional_connection.declined' then
      v_title := 'Perfil Profissional · Solicitação não aceita';
      v_summary :=
        v_actor_label ||
        ' não aceitou sua solicitação de conexão profissional.';
    when 'professional_connection.cancelled' then
      v_title := 'Perfil Profissional · Solicitação cancelada';
      v_summary :=
        v_actor_label ||
        ' cancelou a solicitação de conexão profissional.';
    when 'professional_connection.ended' then
      v_title := 'Perfil Profissional · Conexão encerrada';
      v_summary :=
        v_actor_label ||
        ' encerrou a conexão com seu Perfil Profissional.';
  end case;

  v_state_status := new.status::text;
  v_state_reason := case
    when v_notification_type = 'professional_connection.requested'
    then 'connection_request'
    when v_notification_type = 'professional_connection.accepted'
    then 'connection_accepted'
    when v_notification_type = 'professional_connection.declined'
    then 'connection_declined'
    when v_notification_type = 'professional_connection.cancelled'
    then 'connection_cancelled'
    when v_notification_type = 'professional_connection.ended'
    then 'connection_ended'
    else 'connection_changed'
  end;

  perform public.mhidas_create_social_notification(
    v_recipient_user_id,
    null,
    'professional_connection',
    new.id,
    v_notification_type,
    'professional_connection:' ||
      new.id::text ||
      ':' ||
      v_idempotency_suffix,
    v_title,
    '/network/connections',
    v_summary,
    jsonb_build_object(
      'profile_mode', 'professional',
      'actor_label', v_actor_label,
      'actor_slug', v_actor_slug,
      'profile_slug', v_actor_slug,
      'request_status', v_state_status,
      'entity_status', v_state_reason
    ),
    null
  );

  return new;
end;
$function$;

do $$
declare
  v_expected_push integer;
  v_unexpected_push integer;
begin
  select count(*)
  into v_expected_push
  from public.notification_type_registry ntr
  where ntr.notification_type in (
    'tribe_join_request.created',
    'tribe_join_request.approved',
    'tribe_membership.removed',
    'tribe_membership.blocked',
    'tribe.cancelled',
    'ride_join_request.created',
    'ride_join_request.approved',
    'ride.cancelled',
    'meetup_join_request.created',
    'meetup_join_request.approved',
    'meetup.cancelled',
    'professional_connection.requested',
    'professional_connection.accepted'
  )
  and 'push'::public.notification_delivery_channel =
      any(ntr.default_channels);

  if v_expected_push <> 13 then
    raise exception
      'V4_8_165_EXPECTED_PUSH_POLICY_FAILED:%',
      v_expected_push;
  end if;

  select count(*)
  into v_unexpected_push
  from public.notification_type_registry ntr
  where ntr.notification_type in (
    'professional_follow.created',
    'professional_connection.declined',
    'professional_connection.cancelled',
    'professional_connection.ended',
    'tribe_join_request.cancelled',
    'tribe_join_request.rejected',
    'tribe_membership.left',
    'tribe_membership.role_changed',
    'tribe.reopened',
    'tribe.closed',
    'tribe.archived',
    'ride_join_request.cancelled',
    'ride_join_request.rejected',
    'ride_membership.left',
    'ride.closed',
    'meetup_join_request.cancelled',
    'meetup_join_request.rejected',
    'meetup_membership.left',
    'meetup.closed'
  )
  and 'push'::public.notification_delivery_channel =
      any(ntr.default_channels);

  if v_unexpected_push <> 0 then
    raise exception
      'V4_8_165_UNEXPECTED_PUSH_POLICY_FAILED:%',
      v_unexpected_push;
  end if;

  if position(
      'Perfil Clubber' in
      pg_get_functiondef(
        'public.mhidas_event_ride_join_request_notification_trigger()'::regprocedure
      )
    ) = 0
  then
    raise exception 'V4_8_165_CLUBBER_TEXT_POLICY_FAILED';
  end if;

  if position(
      'Perfil Profissional' in
      pg_get_functiondef(
        'public.mhidas_professional_follow_notification_trigger()'::regprocedure
      )
    ) = 0
  then
    raise exception 'V4_8_165_PROFESSIONAL_TEXT_POLICY_FAILED';
  end if;
end
$$;
commit;