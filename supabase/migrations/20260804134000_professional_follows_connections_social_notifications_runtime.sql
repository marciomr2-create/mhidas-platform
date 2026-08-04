-- supabase/migrations/20260804134000_professional_follows_connections_social_notifications_runtime.sql
-- MHIDAS / USECLUBBERS
-- V4.8.150 - Transactional social notifications for professional follows and connections.
-- Scope: in-app generation only. No API, UI, Realtime, push or production access.

begin;

do $dependencies$
begin
  if to_regclass('public.professional_follows') is null
    or to_regclass('public.professional_connections') is null
    or to_regclass('public.professional_relationship_controls') is null
    or to_regclass('public.professional_profiles') is null
    or to_regclass('public.cards') is null
    or to_regclass('public.social_notifications') is null
  then
    raise exception 'V4_8_150_REQUIRED_TABLE_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_create_social_notification(uuid,uuid,text,uuid,text,text,text,text,text,jsonb,timestamp with time zone)'
  ) is null then
    raise exception 'V4_8_150_NOTIFICATION_CREATOR_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_set_social_notifications_state_by_source(text,uuid,text,text)'
  ) is null then
    raise exception 'V4_8_150_NOTIFICATION_STATE_HELPER_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_social_notification_relationship_control_exists(uuid,uuid)'
  ) is null then
    raise exception 'V4_8_150_RELATIONSHIP_CONTROL_HELPER_DEPENDENCY_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'professional_follows'
      and c.column_name = 'id'
      and c.data_type = 'uuid'
  )
  or not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'professional_follows'
      and c.column_name = 'follower_user_id'
      and c.data_type = 'uuid'
  )
  or not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'professional_follows'
      and c.column_name = 'followed_user_id'
      and c.data_type = 'uuid'
  )
  or not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'professional_connections'
      and c.column_name = 'id'
      and c.data_type = 'uuid'
  )
  or not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'professional_connections'
      and c.column_name = 'requester_user_id'
      and c.data_type = 'uuid'
  )
  or not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'professional_connections'
      and c.column_name = 'target_user_id'
      and c.data_type = 'uuid'
  )
  or not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'professional_connections'
      and c.column_name = 'status'
      and c.data_type = 'text'
  )
  then
    raise exception 'V4_8_150_REQUIRED_COLUMN_DEPENDENCY_MISSING';
  end if;
end
$dependencies$;

create or replace function public.mhidas_get_professional_notification_context(
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
    case
      when selected_card.slug is not null
        and selected_card.slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      then selected_card.slug
      else null
    end,
    left(
      btrim(
        regexp_replace(
          coalesce(
            nullif(btrim(selected_card.label), ''),
            nullif(btrim(pp.profession), ''),
            nullif(btrim(pp.company_name), ''),
            'Perfil profissional'
          ),
          '[[:cntrl:]]',
          ' ',
          'g'
        )
      ),
      80
    ),
    case
      when selected_card.slug is not null
        and selected_card.slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      then '/' || selected_card.slug || '?mode=pro'
      else '/network'
    end
  from auth.users u
  left join public.professional_profiles pp
    on pp.user_id = u.id
  left join lateral (
    select
      lower(btrim(c.slug)) as slug,
      c.label
    from public.cards c
    where c.user_id = u.id
      and c.status = 'active'
      and c.is_published = true
      and c.slug is not null
      and btrim(c.slug) <> ''
    order by
      c.published_at desc nulls last,
      c.issued_at desc,
      c.card_id
    limit 1
  ) selected_card on true
  where u.id = p_user_id;
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
      'Novo seguidor profissional',
      v_actor_internal_url,
      'Uma pessoa começou a seguir seu Perfil Pro.',
      jsonb_build_object(
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
      v_title := 'Nova solicitação de conexão';
      v_summary :=
        'Uma pessoa quer se conectar profissionalmente com você.';
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

drop trigger if exists trg_professional_follow_notifications
  on public.professional_follows;

create trigger trg_professional_follow_notifications
after insert or delete
on public.professional_follows
for each row
execute function public.mhidas_professional_follow_notification_trigger();

drop trigger if exists trg_professional_connection_notifications
  on public.professional_connections;

create trigger trg_professional_connection_notifications
after insert or update or delete
on public.professional_connections
for each row
execute function public.mhidas_professional_connection_notification_trigger();

revoke all on function public.mhidas_get_professional_notification_context(uuid)
  from public, anon, authenticated;

revoke all on function public.mhidas_professional_follow_notification_trigger()
  from public, anon, authenticated;

revoke all on function public.mhidas_professional_connection_notification_trigger()
  from public, anon, authenticated;

comment on function public.mhidas_get_professional_notification_context(uuid) is
  'V4.8.150 internal context resolver for professional-network notifications.';

comment on function public.mhidas_professional_follow_notification_trigger() is
  'V4.8.150 governed generator for professional follow notifications.';

comment on function public.mhidas_professional_connection_notification_trigger() is
  'V4.8.150 governed generator for professional connection notifications.';

comment on trigger trg_professional_follow_notifications
  on public.professional_follows is
  'V4.8.150 transaction-bound professional follow notification generator.';

comment on trigger trg_professional_connection_notifications
  on public.professional_connections is
  'V4.8.150 transaction-bound professional connection notification generator.';

do $self_check$
declare
  v_missing_functions integer;
  v_missing_triggers integer;
  v_insecure_functions integer;
  v_exposed_internal_functions integer;
begin
  select count(*)
  into v_missing_functions
  from (
    values
      ('public.mhidas_get_professional_notification_context(uuid)'),
      ('public.mhidas_professional_follow_notification_trigger()'),
      ('public.mhidas_professional_connection_notification_trigger()')
  ) expected(signature)
  where to_regprocedure(expected.signature) is null;

  if v_missing_functions <> 0 then
    raise exception 'V4_8_150_FUNCTION_SELF_CHECK_FAILED';
  end if;

  select count(*)
  into v_missing_triggers
  from (
    values
      (
        'professional_follows',
        'trg_professional_follow_notifications'
      ),
      (
        'professional_connections',
        'trg_professional_connection_notifications'
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
    raise exception 'V4_8_150_TRIGGER_SELF_CHECK_FAILED';
  end if;

  select count(*)
  into v_insecure_functions
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'mhidas_get_professional_notification_context',
      'mhidas_professional_follow_notification_trigger',
      'mhidas_professional_connection_notification_trigger'
    )
    and (
      not p.prosecdef
      or not (
        coalesce(p.proconfig, '{}'::text[])
        @> array['search_path=pg_catalog, public']
      )
    );

  if v_insecure_functions <> 0 then
    raise exception 'V4_8_150_SECURITY_DEFINER_SELF_CHECK_FAILED';
  end if;

  select count(*)
  into v_exposed_internal_functions
  from (
    values
      ('public.mhidas_get_professional_notification_context(uuid)'),
      ('public.mhidas_professional_follow_notification_trigger()'),
      ('public.mhidas_professional_connection_notification_trigger()')
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
    raise exception 'V4_8_150_INTERNAL_FUNCTION_ACL_SELF_CHECK_FAILED';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'professional_follows'
      and c.relrowsecurity
  )
  or not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'professional_connections'
      and c.relrowsecurity
  )
  then
    raise exception 'V4_8_150_EXISTING_RLS_DRIFT';
  end if;
end
$self_check$;

commit;
