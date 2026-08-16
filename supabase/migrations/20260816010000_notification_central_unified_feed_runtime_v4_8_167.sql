begin;

do $validation$
begin
  if to_regclass('public.notification_events') is null then
    raise exception 'V4_8_167_NOTIFICATION_EVENTS_DEPENDENCY_MISSING';
  end if;

  if to_regclass('public.notification_recipients') is null then
    raise exception 'V4_8_167_NOTIFICATION_RECIPIENTS_DEPENDENCY_MISSING';
  end if;

  if to_regclass('public.social_notifications') is null then
    raise exception 'V4_8_167_SOCIAL_NOTIFICATIONS_DEPENDENCY_MISSING';
  end if;
end;
$validation$;

create or replace function public.mhidas_get_social_notifications_feed(
  p_limit integer default 11,
  p_unread_only boolean default false,
  p_cursor_created_at timestamp with time zone default null,
  p_cursor_notification_id uuid default null
)
returns table (
  notification_id uuid,
  source_type text,
  source_id uuid,
  notification_type text,
  title text,
  summary text,
  payload jsonb,
  internal_url text,
  read_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 101 then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_limit';
  end if;

  if (
    p_cursor_created_at is null
    and p_cursor_notification_id is not null
  ) or (
    p_cursor_created_at is not null
    and p_cursor_notification_id is null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_cursor';
  end if;

  return query
  select
    nr.recipient_id as notification_id,
    ne.source_type,
    ne.source_id,
    ne.notification_type,
    ne.title,
    ne.summary,
    coalesce(ne.payload, '{}'::jsonb) as payload,
    ne.internal_url,
    nr.read_at,
    case
      when nr.expires_at is not null
        and ne.expires_at is not null
        then least(nr.expires_at, ne.expires_at)
      else coalesce(nr.expires_at, ne.expires_at)
    end as expires_at,
    nr.created_at
  from public.notification_recipients nr
  join public.notification_events ne
    on ne.event_id = nr.event_id
  where nr.recipient_user_id = v_user_id
    and nr.status = 'active'
    and ne.status = 'active'
    and (
      nr.expires_at is null
      or nr.expires_at > now()
    )
    and (
      ne.expires_at is null
      or ne.expires_at > now()
    )
    and (
      not coalesce(p_unread_only, false)
      or nr.read_at is null
    )
    and (
      p_cursor_created_at is null
      or (nr.created_at, nr.recipient_id)
        < (p_cursor_created_at, p_cursor_notification_id)
    )
  order by
    nr.created_at desc,
    nr.recipient_id desc
  limit p_limit;
end;
$function$;

create or replace function public.mhidas_get_social_notification_unread_count()
returns bigint
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_count bigint;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  select count(*)
  into v_count
  from public.notification_recipients nr
  join public.notification_events ne
    on ne.event_id = nr.event_id
  where nr.recipient_user_id = v_user_id
    and nr.status = 'active'
    and ne.status = 'active'
    and nr.read_at is null
    and (
      nr.expires_at is null
      or nr.expires_at > now()
    )
    and (
      ne.expires_at is null
      or ne.expires_at > now()
    );

  return v_count;
end;
$function$;

create or replace function public.mhidas_mark_social_notification_read(
  p_notification_id uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_recipient_id uuid;
  v_social_notification_id uuid;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  if p_notification_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'notification_id_required';
  end if;

  select
    nr.recipient_id,
    nr.social_notification_id
  into
    v_recipient_id,
    v_social_notification_id
  from public.notification_recipients nr
  where nr.recipient_user_id = v_user_id
    and (
      nr.recipient_id = p_notification_id
      or nr.social_notification_id = p_notification_id
    )
  order by
    case
      when nr.recipient_id = p_notification_id then 0
      else 1
    end
  limit 1;

  if v_recipient_id is null then
    return false;
  end if;

  update public.notification_recipients nr
  set
    read_at = coalesce(nr.read_at, now()),
    updated_at = now()
  where nr.recipient_id = v_recipient_id
    and nr.recipient_user_id = v_user_id;

  if v_social_notification_id is not null then
    update public.social_notifications sn
    set
      read_at = coalesce(sn.read_at, now()),
      updated_at = now()
    where sn.notification_id = v_social_notification_id
      and sn.recipient_user_id = v_user_id;
  end if;

  return true;
end;
$function$;

create or replace function public.mhidas_mark_all_social_notifications_read()
returns integer
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_affected integer := 0;
  v_social_notification_ids uuid[];
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  select array_agg(nr.social_notification_id)
    filter (where nr.social_notification_id is not null)
  into v_social_notification_ids
  from public.notification_recipients nr
  join public.notification_events ne
    on ne.event_id = nr.event_id
  where nr.recipient_user_id = v_user_id
    and nr.status = 'active'
    and ne.status = 'active'
    and nr.read_at is null
    and (
      nr.expires_at is null
      or nr.expires_at > now()
    )
    and (
      ne.expires_at is null
      or ne.expires_at > now()
    );

  update public.notification_recipients nr
  set
    read_at = now(),
    updated_at = now()
  from public.notification_events ne
  where ne.event_id = nr.event_id
    and nr.recipient_user_id = v_user_id
    and nr.status = 'active'
    and ne.status = 'active'
    and nr.read_at is null
    and (
      nr.expires_at is null
      or nr.expires_at > now()
    )
    and (
      ne.expires_at is null
      or ne.expires_at > now()
    );

  get diagnostics v_affected = row_count;

  if coalesce(array_length(v_social_notification_ids, 1), 0) > 0 then
    update public.social_notifications sn
    set
      read_at = coalesce(sn.read_at, now()),
      updated_at = now()
    where sn.notification_id = any(v_social_notification_ids)
      and sn.recipient_user_id = v_user_id;
  end if;

  return v_affected;
end;
$function$;

revoke all on function public.mhidas_get_social_notifications_feed(
  integer,
  boolean,
  timestamp with time zone,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.mhidas_get_social_notification_unread_count()
  from public, anon, authenticated, service_role;

revoke all on function public.mhidas_mark_social_notification_read(uuid)
  from public, anon, authenticated, service_role;

revoke all on function public.mhidas_mark_all_social_notifications_read()
  from public, anon, authenticated, service_role;

grant execute on function public.mhidas_get_social_notifications_feed(
  integer,
  boolean,
  timestamp with time zone,
  uuid
) to authenticated, service_role;

grant execute on function public.mhidas_get_social_notification_unread_count()
  to authenticated, service_role;

grant execute on function public.mhidas_mark_social_notification_read(uuid)
  to authenticated, service_role;

grant execute on function public.mhidas_mark_all_social_notifications_read()
  to authenticated, service_role;

comment on function public.mhidas_get_social_notifications_feed(
  integer,
  boolean,
  timestamp with time zone,
  uuid
) is
'Returns the authenticated user unified notification feed with stable cursor pagination.';

comment on function public.mhidas_get_social_notification_unread_count() is
'Returns the authenticated user active unread unified notification count.';

comment on function public.mhidas_mark_social_notification_read(uuid) is
'Marks one owned unified notification as read and synchronizes its linked legacy row.';

comment on function public.mhidas_mark_all_social_notifications_read() is
'Marks all visible unread unified notifications for the authenticated user as read.';

do $validation$
declare
  v_valid_functions integer;
begin
  if to_regprocedure(
    'public.mhidas_get_social_notifications_feed(integer,boolean,timestamp with time zone,uuid)'
  ) is null then
    raise exception 'V4_8_167_UNIFIED_FEED_FUNCTION_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_get_social_notification_unread_count()'
  ) is null then
    raise exception 'V4_8_167_UNREAD_COUNT_FUNCTION_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_mark_social_notification_read(uuid)'
  ) is null then
    raise exception 'V4_8_167_MARK_READ_FUNCTION_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_mark_all_social_notifications_read()'
  ) is null then
    raise exception 'V4_8_167_MARK_ALL_READ_FUNCTION_MISSING';
  end if;

  select count(*)
  into v_valid_functions
  from pg_catalog.pg_proc p
  where p.oid in (
    to_regprocedure(
      'public.mhidas_get_social_notifications_feed(integer,boolean,timestamp with time zone,uuid)'
    ),
    to_regprocedure(
      'public.mhidas_get_social_notification_unread_count()'
    ),
    to_regprocedure(
      'public.mhidas_mark_social_notification_read(uuid)'
    ),
    to_regprocedure(
      'public.mhidas_mark_all_social_notifications_read()'
    )
  )
    and p.prosecdef
    and 'search_path=pg_catalog, public' = any(
      coalesce(p.proconfig, '{}'::text[])
    );

  if v_valid_functions <> 4 then
    raise exception
      'V4_8_167_FUNCTION_SECURITY_CONFIGURATION_FAILED:%',
      v_valid_functions;
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.mhidas_get_social_notifications_feed(integer,boolean,timestamp with time zone,uuid)',
    'EXECUTE'
  ) then
    raise exception 'V4_8_167_AUTHENTICATED_FEED_EXECUTE_MISSING';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.mhidas_get_social_notification_unread_count()',
    'EXECUTE'
  ) then
    raise exception 'V4_8_167_AUTHENTICATED_COUNT_EXECUTE_MISSING';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.mhidas_mark_social_notification_read(uuid)',
    'EXECUTE'
  ) then
    raise exception 'V4_8_167_AUTHENTICATED_MARK_READ_EXECUTE_MISSING';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.mhidas_mark_all_social_notifications_read()',
    'EXECUTE'
  ) then
    raise exception 'V4_8_167_AUTHENTICATED_MARK_ALL_EXECUTE_MISSING';
  end if;

  if has_function_privilege(
    'anon',
    'public.mhidas_get_social_notifications_feed(integer,boolean,timestamp with time zone,uuid)',
    'EXECUTE'
  ) then
    raise exception 'V4_8_167_ANON_FEED_EXECUTE_NOT_REVOKED';
  end if;

  if has_function_privilege(
    'anon',
    'public.mhidas_mark_social_notification_read(uuid)',
    'EXECUTE'
  ) then
    raise exception 'V4_8_167_ANON_MARK_READ_EXECUTE_NOT_REVOKED';
  end if;
end;
$validation$;

commit;
