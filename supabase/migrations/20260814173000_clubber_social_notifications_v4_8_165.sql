-- MHIDAS / USECLUBBERS
-- V4.8.165-B4
-- Independent Perfil Clubber social notification producers.
--
-- Push policy:
--   clubber_connection.requested -> in_app + badge + push
--   clubber_connection.accepted  -> in_app + badge + push
--
-- In-app only:
--   clubber_follow.created
--   clubber_connection.declined
--   clubber_connection.cancelled
--   clubber_connection.ended
--
-- Unfollow remains silent.
-- All payloads explicitly identify profile_mode = clubber.

begin;

do $dependencies$
begin
  if to_regclass('public.clubber_follows') is null
    or to_regclass('public.clubber_connections') is null
    or to_regclass('public.clubber_relationship_controls') is null
    or to_regclass('public.club_profiles') is null
    or to_regclass('public.cards') is null
    or to_regclass('public.social_notifications') is null
    or to_regclass('public.notification_type_registry') is null
  then
    raise exception
      'V4_8_165_B4_REQUIRED_TABLE_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_create_social_notification(uuid,uuid,text,uuid,text,text,text,text,text,jsonb,timestamp with time zone)'
  ) is null
    or to_regprocedure(
      'public.mhidas_set_social_notifications_state_by_source(text,uuid,text,text)'
    ) is null
    or to_regprocedure(
      'public.mhidas_social_notification_relationship_control_exists(uuid,uuid,text)'
    ) is null
  then
    raise exception
      'V4_8_165_B4_REQUIRED_FUNCTION_DEPENDENCY_MISSING';
  end if;
end
$dependencies$;

-- ================================================================
-- REGISTRY
-- ================================================================

insert into public.notification_type_registry (
  notification_type,
  domain,
  source_type,
  default_priority,
  default_channels,
  grouping_policy,
  preference_category,
  privacy_level,
  push_requires_explicit_consent,
  quiet_hours_bypass,
  default_expires_after_seconds
)
values
  (
    'clubber_follow.created',
    'clubber_profile',
    'clubber_follow',
    'social',
    array[
      'in_app',
      'badge'
    ]::public.notification_delivery_channel[],
    'window',
    'clubber.followers',
    'standard',
    true,
    false,
    null
  ),
  (
    'clubber_connection.requested',
    'clubber_networking',
    'clubber_connection',
    'transactional',
    array[
      'in_app',
      'badge',
      'push'
    ]::public.notification_delivery_channel[],
    'none',
    'clubber.connections',
    'standard',
    true,
    false,
    null
  ),
  (
    'clubber_connection.accepted',
    'clubber_networking',
    'clubber_connection',
    'transactional',
    array[
      'in_app',
      'badge',
      'push'
    ]::public.notification_delivery_channel[],
    'none',
    'clubber.connections',
    'standard',
    true,
    false,
    null
  ),
  (
    'clubber_connection.declined',
    'clubber_networking',
    'clubber_connection',
    'transactional',
    array[
      'in_app',
      'badge'
    ]::public.notification_delivery_channel[],
    'none',
    'clubber.connections',
    'sensitive',
    true,
    false,
    null
  ),
  (
    'clubber_connection.cancelled',
    'clubber_networking',
    'clubber_connection',
    'transactional',
    array[
      'in_app',
      'badge'
    ]::public.notification_delivery_channel[],
    'none',
    'clubber.connections',
    'sensitive',
    true,
    false,
    null
  ),
  (
    'clubber_connection.ended',
    'clubber_networking',
    'clubber_connection',
    'transactional',
    array[
      'in_app',
      'badge'
    ]::public.notification_delivery_channel[],
    'none',
    'clubber.connections',
    'sensitive',
    true,
    false,
    null
  )
on conflict (notification_type) do update
set
  domain = excluded.domain,
  source_type = excluded.source_type,
  default_priority = excluded.default_priority,
  default_channels = excluded.default_channels,
  grouping_policy = excluded.grouping_policy,
  preference_category = excluded.preference_category,
  privacy_level = excluded.privacy_level,
  push_requires_explicit_consent =
    excluded.push_requires_explicit_consent,
  quiet_hours_bypass =
    excluded.quiet_hours_bypass,
  default_expires_after_seconds =
    excluded.default_expires_after_seconds,
  is_active = true,
  updated_at = now();

-- ================================================================
-- CLUBBER PROFILE CONTEXT
-- ================================================================

create or replace function
  public.mhidas_get_clubber_notification_context(
    p_user_id uuid
  )
returns table (
  profile_slug text,
  profile_label text,
  profile_internal_url text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    c.slug::text,
    coalesce(
      nullif(btrim(c.label), ''),
      'Clubber'
    )::text,
    (
      '/' || c.slug || '?mode=club'
    )::text
  from public.cards c
  where c.user_id = p_user_id
    and c.status = 'active'
    and c.is_published = true
    and exists (
      select 1
      from public.club_profiles cp
      where cp.user_id = c.user_id
    )
  limit 1;
$function$;

-- ================================================================
-- CLUBBER FOLLOW NOTIFICATION
-- ================================================================

create or replace function
  public.mhidas_clubber_follow_notification_trigger()
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
      raise exception
        'V4_8_165_B4_CLUBBER_FOLLOW_ACTOR_MISMATCH';
    end if;

    select
      c.profile_slug,
      c.profile_label,
      c.profile_internal_url
    into
      v_actor_slug,
      v_actor_label,
      v_actor_internal_url
    from public.mhidas_get_clubber_notification_context(
      v_actor_user_id
    ) c;

    if v_actor_label is null
      or v_actor_internal_url is null
    then
      raise exception
        'V4_8_165_B4_CLUBBER_FOLLOW_CONTEXT_MISSING';
    end if;

    perform public.mhidas_create_social_notification(
      new.followed_user_id,
      null,
      'clubber_follow',
      new.id,
      'clubber_follow.created',
      'clubber_follow:' || new.id::text || ':created',
      'Perfil Clubber · Novo seguidor',
      v_actor_internal_url,
      v_actor_label || ' começou a seguir seu Perfil Clubber.',
      jsonb_build_object(
        'actor_label', v_actor_label,
        'actor_slug', v_actor_slug,
        'profile_slug', v_actor_slug,
        'profile_mode', 'clubber',
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
      raise exception
        'V4_8_165_B4_CLUBBER_UNFOLLOW_ACTOR_MISMATCH';
    end if;

    perform public.mhidas_set_social_notifications_state_by_source(
      'clubber_follow',
      old.id,
      'cancelled',
      'clubber_follow_removed'
    );

    return old;
  end if;

  return new;
end;
$function$;

-- ================================================================
-- CLUBBER CONNECTION NOTIFICATION
-- ================================================================

create or replace function
  public.mhidas_clubber_connection_notification_trigger()
returns trigger
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();

  v_recipient_user_id uuid;
  v_notification_type text;
  v_idempotency_suffix text;

  v_actor_slug text;
  v_actor_label text;
  v_actor_internal_url text;

  v_title text;
  v_summary text;
begin
  if v_actor_user_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      return new;
    end if;

    if new.requester_user_id <> v_actor_user_id then
      raise exception
        'V4_8_165_B4_CLUBBER_CONNECTION_REQUEST_ACTOR_MISMATCH';
    end if;

    v_recipient_user_id := new.target_user_id;

    v_notification_type :=
      'clubber_connection.requested';

    v_idempotency_suffix := 'requested';

  elsif tg_op = 'UPDATE' then
    if old.status is not distinct from new.status then
      return new;
    end if;

    if old.status = 'pending'
      and new.status in ('accepted', 'declined')
    then
      if new.target_user_id <> v_actor_user_id then
        raise exception
          'V4_8_165_B4_CLUBBER_CONNECTION_DECISION_ACTOR_MISMATCH';
      end if;

      perform public.mhidas_set_social_notifications_state_by_source(
        'clubber_connection',
        new.id,
        'invalidated',
        'clubber_connection_decided'
      );

      v_recipient_user_id := new.requester_user_id;

      if new.status = 'accepted' then
        v_notification_type :=
          'clubber_connection.accepted';

        v_idempotency_suffix := 'accepted';
      else
        v_notification_type :=
          'clubber_connection.declined';

        v_idempotency_suffix := 'declined';
      end if;

    elsif old.status = 'pending'
      and new.status = 'cancelled'
    then
      if new.requester_user_id <> v_actor_user_id then
        raise exception
          'V4_8_165_B4_CLUBBER_CONNECTION_CANCEL_ACTOR_MISMATCH';
      end if;

      perform public.mhidas_set_social_notifications_state_by_source(
        'clubber_connection',
        new.id,
        'cancelled',
        'clubber_connection_cancelled_by_requester'
      );

      v_recipient_user_id := new.target_user_id;

      v_notification_type :=
        'clubber_connection.cancelled';

      v_idempotency_suffix := 'cancelled';

    elsif old.status = 'accepted'
      and new.status = 'cancelled'
    then
      if new.requester_user_id <> v_actor_user_id
        and new.target_user_id <> v_actor_user_id
      then
        raise exception
          'V4_8_165_B4_CLUBBER_CONNECTION_END_ACTOR_MISMATCH';
      end if;

      perform public.mhidas_set_social_notifications_state_by_source(
        'clubber_connection',
        new.id,
        'cancelled',
        'clubber_connection_ended'
      );

      v_recipient_user_id :=
        case
          when new.requester_user_id = v_actor_user_id
          then new.target_user_id
          else new.requester_user_id
        end;

      v_notification_type :=
        'clubber_connection.ended';

      v_idempotency_suffix := 'ended';

    else
      return new;
    end if;

  else
    return new;
  end if;

  select
    c.profile_slug,
    c.profile_label,
    c.profile_internal_url
  into
    v_actor_slug,
    v_actor_label,
    v_actor_internal_url
  from public.mhidas_get_clubber_notification_context(
    v_actor_user_id
  ) c;

  if v_actor_label is null
    or v_actor_internal_url is null
  then
    raise exception
      'V4_8_165_B4_CLUBBER_CONNECTION_CONTEXT_MISSING';
  end if;

  if v_notification_type =
    'clubber_connection.requested'
  then
    v_title :=
      'Perfil Clubber · Nova solicitação';

    v_summary :=
      v_actor_label ||
      ' quer se conectar com você no Perfil Clubber.';

  elsif v_notification_type =
    'clubber_connection.accepted'
  then
    v_title :=
      'Perfil Clubber · Conexão aceita';

    v_summary :=
      v_actor_label ||
      ' aceitou sua solicitação no Perfil Clubber.';

  elsif v_notification_type =
    'clubber_connection.declined'
  then
    v_title :=
      'Perfil Clubber · Solicitação não aceita';

    v_summary :=
      v_actor_label ||
      ' não aceitou sua solicitação no Perfil Clubber.';

  elsif v_notification_type =
    'clubber_connection.cancelled'
  then
    v_title :=
      'Perfil Clubber · Solicitação cancelada';

    v_summary :=
      v_actor_label ||
      ' cancelou a solicitação de conexão com seu Perfil Clubber.';

  elsif v_notification_type =
    'clubber_connection.ended'
  then
    v_title :=
      'Perfil Clubber · Conexão encerrada';

    v_summary :=
      v_actor_label ||
      ' encerrou a conexão com seu Perfil Clubber.';

  else
    raise exception
      'V4_8_165_B4_CLUBBER_NOTIFICATION_TYPE_INVALID';
  end if;

  perform public.mhidas_create_social_notification(
    v_recipient_user_id,
    null,
    'clubber_connection',
    new.id,
    v_notification_type,
    'clubber_connection:' ||
      new.id::text ||
      ':' ||
      v_idempotency_suffix,
    v_title,
    v_actor_internal_url,
    v_summary,
    jsonb_build_object(
      'actor_label', v_actor_label,
      'actor_slug', v_actor_slug,
      'profile_slug', v_actor_slug,
      'profile_mode', 'clubber',
      'request_status', new.status,
      'entity_status', new.status
    ),
    null
  );

  return new;
end;
$function$;

-- ================================================================
-- TRIGGERS
-- ================================================================

drop trigger if exists
  trg_clubber_follow_notifications
on public.clubber_follows;

create trigger
  trg_clubber_follow_notifications
after insert or delete
on public.clubber_follows
for each row
execute function
  public.mhidas_clubber_follow_notification_trigger();

drop trigger if exists
  trg_clubber_connection_notifications
on public.clubber_connections;

create trigger
  trg_clubber_connection_notifications
after insert or update
on public.clubber_connections
for each row
execute function
  public.mhidas_clubber_connection_notification_trigger();

-- ================================================================
-- PRIVILEGES
-- ================================================================

revoke all on function
  public.mhidas_get_clubber_notification_context(uuid)
from public, anon, authenticated, service_role;

revoke all on function
  public.mhidas_clubber_follow_notification_trigger()
from public, anon, authenticated, service_role;

revoke all on function
  public.mhidas_clubber_connection_notification_trigger()
from public, anon, authenticated, service_role;

comment on function
  public.mhidas_get_clubber_notification_context(uuid)
is
  'V4.8.165 internal Perfil Clubber notification context resolver.';

comment on function
  public.mhidas_clubber_follow_notification_trigger()
is
  'V4.8.165 governed Perfil Clubber follow notification producer.';

comment on function
  public.mhidas_clubber_connection_notification_trigger()
is
  'V4.8.165 governed Perfil Clubber connection notification producer.';

-- ================================================================
-- SELF CHECK
-- ================================================================

do $self_check$
declare
  v_missing_registry integer;
  v_policy_mismatch integer;
  v_missing_functions integer;
  v_missing_triggers integer;
  v_exposed integer;
begin
  select 6 - count(*)
  into v_missing_registry
  from public.notification_type_registry ntr
  where ntr.notification_type in (
    'clubber_follow.created',
    'clubber_connection.requested',
    'clubber_connection.accepted',
    'clubber_connection.declined',
    'clubber_connection.cancelled',
    'clubber_connection.ended'
  )
    and ntr.is_active = true;

  if v_missing_registry <> 0 then
    raise exception
      'V4_8_165_B4_REGISTRY_INCOMPLETE:%',
      v_missing_registry;
  end if;

  select count(*)
  into v_policy_mismatch
  from public.notification_type_registry ntr
  where (
    ntr.notification_type in (
      'clubber_connection.requested',
      'clubber_connection.accepted'
    )
    and ntr.default_channels <>
      array[
        'in_app',
        'badge',
        'push'
      ]::public.notification_delivery_channel[]
  )
  or (
    ntr.notification_type in (
      'clubber_follow.created',
      'clubber_connection.declined',
      'clubber_connection.cancelled',
      'clubber_connection.ended'
    )
    and ntr.default_channels <>
      array[
        'in_app',
        'badge'
      ]::public.notification_delivery_channel[]
  )
  or (
    ntr.notification_type in (
      'clubber_follow.created',
      'clubber_connection.requested',
      'clubber_connection.accepted',
      'clubber_connection.declined',
      'clubber_connection.cancelled',
      'clubber_connection.ended'
    )
    and (
      ntr.push_requires_explicit_consent = false
      or ntr.preference_category not in (
        'clubber.followers',
        'clubber.connections'
      )
    )
  );

  if v_policy_mismatch <> 0 then
    raise exception
      'V4_8_165_B4_CHANNEL_POLICY_INVALID:%',
      v_policy_mismatch;
  end if;

  select count(*)
  into v_missing_functions
  from (
    values
      (
        'public.mhidas_get_clubber_notification_context(uuid)'
      ),
      (
        'public.mhidas_clubber_follow_notification_trigger()'
      ),
      (
        'public.mhidas_clubber_connection_notification_trigger()'
      )
  ) expected(signature)
  where to_regprocedure(expected.signature) is null;

  if v_missing_functions <> 0 then
    raise exception
      'V4_8_165_B4_REQUIRED_FUNCTION_MISSING:%',
      v_missing_functions;
  end if;

  select count(*)
  into v_missing_triggers
  from (
    values
      (
        'clubber_follows',
        'trg_clubber_follow_notifications'
      ),
      (
        'clubber_connections',
        'trg_clubber_connection_notifications'
      )
  ) expected(table_name, trigger_name)
  where not exists (
    select 1
    from pg_trigger t
    join pg_class c
      on c.oid = t.tgrelid
    join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = expected.table_name
      and t.tgname = expected.trigger_name
      and not t.tgisinternal
      and t.tgenabled <> 'D'
  );

  if v_missing_triggers <> 0 then
    raise exception
      'V4_8_165_B4_REQUIRED_TRIGGER_MISSING:%',
      v_missing_triggers;
  end if;

  select count(*)
  into v_exposed
  from (
    values
      (
        'public.mhidas_get_clubber_notification_context(uuid)'
      ),
      (
        'public.mhidas_clubber_follow_notification_trigger()'
      ),
      (
        'public.mhidas_clubber_connection_notification_trigger()'
      )
  ) expected(signature)
  cross join (
    values
      ('public'),
      ('anon'),
      ('authenticated'),
      ('service_role')
  ) role_name(role_name)
  where has_function_privilege(
    role_name.role_name,
    expected.signature,
    'EXECUTE'
  );

  if v_exposed <> 0 then
    raise exception
      'V4_8_165_B4_INTERNAL_FUNCTION_EXPOSED:%',
      v_exposed;
  end if;
end
$self_check$;

commit;