-- supabase/migrations/20260802170100_event_tribe_social_notifications_runtime.sql
-- MHIDAS / USECLUBBERS
-- V4.8.148 - Transactional social notifications for temporary event tribes.
-- Scope: in-app generation only. No API, UI, Realtime, push or production access.

begin;

do $dependencies$
begin
  if to_regclass('public.event_tribes') is null
    or to_regclass('public.event_tribe_members') is null
    or to_regclass('public.event_tribe_join_requests') is null
    or to_regclass('public.social_notifications') is null
  then
    raise exception 'V4_8_148_REQUIRED_TABLE_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_create_social_notification(uuid,uuid,text,uuid,text,text,text,text,text,jsonb,timestamp with time zone)'
  ) is null then
    raise exception 'V4_8_148_NOTIFICATION_CREATOR_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_set_social_notifications_state_by_source(text,uuid,text,text)'
  ) is null then
    raise exception 'V4_8_148_NOTIFICATION_STATE_HELPER_DEPENDENCY_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'event_groups'
      and c.column_name = 'event_slug'
  ) then
    raise exception 'V4_8_148_EVENT_SLUG_DEPENDENCY_MISSING';
  end if;
end
$dependencies$;

create or replace function public.mhidas_get_event_tribe_notification_context(
  p_tribe_id uuid
)
returns table (
  event_group_id uuid,
  event_slug text,
  tribe_name text,
  notification_expires_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    et.event_group_id,
    lower(btrim(eg.event_slug)),
    left(
      btrim(
        regexp_replace(
          et.name,
          '[[:cntrl:]]',
          ' ',
          'g'
        )
      ),
      80
    ),
    case
      when et.expires_at is not null
        and et.expires_at > now()
      then et.expires_at
      else null
    end
  from public.event_tribes et
  join public.event_groups eg
    on eg.group_id = et.event_group_id
  where et.tribe_id = p_tribe_id;
$function$;

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
        'Nova solicitação para a tribo',
        v_internal_url,
        'Uma pessoa solicitou entrada na tribo.',
        jsonb_build_object(
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
        'Solicitação cancelada',
        v_internal_url,
        'A solicitação para entrar na tribo foi cancelada.',
        jsonb_build_object(
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
      v_title := 'Solicitação aprovada';
      v_summary := 'Você entrou na tribo.';
    else
      v_notification_type := 'tribe_join_request.rejected';
      v_title := 'Solicitação não aprovada';
      v_summary := 'Sua solicitação para entrar na tribo foi recusada.';
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
        'Participante saiu da tribo',
        v_internal_url,
        'Um participante saiu da tribo.',
        jsonb_build_object(
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
          then 'Acesso à tribo bloqueado'
        else 'Você foi removido da tribo'
      end,
      v_internal_url,
      case
        when new.status = 'blocked'
          then 'Seu acesso a esta tribo foi bloqueado.'
        else 'Sua participação nesta tribo foi encerrada.'
      end,
      jsonb_build_object(
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
      'Sua função na tribo mudou',
      v_internal_url,
      'Sua função de participação na tribo foi atualizada.',
      jsonb_build_object(
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
      v_title := 'Tribo reaberta';
      v_summary := 'A tribo foi reaberta.';
    when 'closed' then
      v_notification_type := 'tribe.closed';
      v_title := 'Tribo encerrada';
      v_summary := 'A tribo foi encerrada temporariamente.';
    when 'cancelled' then
      v_notification_type := 'tribe.cancelled';
      v_title := 'Tribo cancelada';
      v_summary := 'A tribo foi cancelada.';
    when 'archived' then
      v_notification_type := 'tribe.archived';
      v_title := 'Tribo arquivada';
      v_summary := 'A tribo foi arquivada.';
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

drop trigger if exists trg_event_tribe_join_request_notifications
  on public.event_tribe_join_requests;

create trigger trg_event_tribe_join_request_notifications
after insert or update of status
on public.event_tribe_join_requests
for each row
execute function public.mhidas_event_tribe_join_request_notification_trigger();

drop trigger if exists trg_event_tribe_member_notifications
  on public.event_tribe_members;

create trigger trg_event_tribe_member_notifications
after update of status, role
on public.event_tribe_members
for each row
when (
  old.status is distinct from new.status
  or old.role is distinct from new.role
)
execute function public.mhidas_event_tribe_member_notification_trigger();

drop trigger if exists trg_event_tribe_status_notifications
  on public.event_tribes;

create trigger trg_event_tribe_status_notifications
after update of status
on public.event_tribes
for each row
when (old.status is distinct from new.status)
execute function public.mhidas_event_tribe_status_notification_trigger();

revoke all on function public.mhidas_get_event_tribe_notification_context(uuid)
  from public, anon, authenticated;

revoke all on function public.mhidas_event_tribe_join_request_notification_trigger()
  from public, anon, authenticated;

revoke all on function public.mhidas_event_tribe_member_notification_trigger()
  from public, anon, authenticated;

revoke all on function public.mhidas_event_tribe_status_notification_trigger()
  from public, anon, authenticated;

comment on function public.mhidas_get_event_tribe_notification_context(uuid) is
  'V4.8.148 internal context resolver for transaction-bound temporary tribe notifications.';

comment on function public.mhidas_event_tribe_join_request_notification_trigger() is
  'V4.8.148 governed generator for temporary tribe join-request notifications.';

comment on function public.mhidas_event_tribe_member_notification_trigger() is
  'V4.8.148 governed generator for temporary tribe membership notifications.';

comment on function public.mhidas_event_tribe_status_notification_trigger() is
  'V4.8.148 governed generator for temporary tribe lifecycle notifications.';

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
      ('public.mhidas_get_event_tribe_notification_context(uuid)'),
      ('public.mhidas_event_tribe_join_request_notification_trigger()'),
      ('public.mhidas_event_tribe_member_notification_trigger()'),
      ('public.mhidas_event_tribe_status_notification_trigger()')
  ) expected(signature)
  where to_regprocedure(expected.signature) is null;

  if v_missing_functions <> 0 then
    raise exception 'V4_8_148_FUNCTION_SELF_CHECK_FAILED';
  end if;

  select count(*)
  into v_missing_triggers
  from (
    values
      (
        'event_tribe_join_requests',
        'trg_event_tribe_join_request_notifications'
      ),
      (
        'event_tribe_members',
        'trg_event_tribe_member_notifications'
      ),
      (
        'event_tribes',
        'trg_event_tribe_status_notifications'
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
    raise exception 'V4_8_148_TRIGGER_SELF_CHECK_FAILED';
  end if;

  select count(*)
  into v_insecure_functions
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'mhidas_get_event_tribe_notification_context',
      'mhidas_event_tribe_join_request_notification_trigger',
      'mhidas_event_tribe_member_notification_trigger',
      'mhidas_event_tribe_status_notification_trigger'
    )
    and (
      not p.prosecdef
      or not (
        coalesce(p.proconfig, '{}'::text[])
        @> array['search_path=pg_catalog, public']
      )
    );

  if v_insecure_functions <> 0 then
    raise exception 'V4_8_148_SECURITY_DEFINER_SELF_CHECK_FAILED';
  end if;

  select count(*)
  into v_exposed_internal_functions
  from (
    values
      ('public.mhidas_get_event_tribe_notification_context(uuid)'),
      ('public.mhidas_event_tribe_join_request_notification_trigger()'),
      ('public.mhidas_event_tribe_member_notification_trigger()'),
      ('public.mhidas_event_tribe_status_notification_trigger()')
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
    raise exception 'V4_8_148_INTERNAL_FUNCTION_ACL_SELF_CHECK_FAILED';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.mhidas_request_join_event_tribe(uuid,text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_cancel_event_tribe_join_request(uuid)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_decide_event_tribe_join_request(uuid,text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_leave_event_tribe(uuid)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_remove_event_tribe_member(uuid,uuid,boolean)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_set_event_tribe_member_role(uuid,uuid,text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_set_event_tribe_status(uuid,text)',
    'EXECUTE'
  )
  then
    raise exception 'V4_8_148_EXISTING_TRIBE_RPC_ACL_DRIFT';
  end if;
end
$self_check$;

commit;
