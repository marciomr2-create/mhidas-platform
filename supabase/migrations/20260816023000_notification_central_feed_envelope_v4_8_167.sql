begin;

create or replace function public.mhidas_get_social_notifications_envelope(
  p_limit integer default 11,
  p_unread_only boolean default false,
  p_cursor_created_at timestamp with time zone default null,
  p_cursor_notification_id uuid default null
)
returns table(
  notifications jsonb,
  unread_count bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  with feed as (
    select
      notification_id,
      source_type,
      source_id,
      notification_type,
      title,
      summary,
      payload,
      internal_url,
      read_at,
      expires_at,
      created_at
    from public.mhidas_get_social_notifications_feed(
      p_limit,
      p_unread_only,
      p_cursor_created_at,
      p_cursor_notification_id
    )
  )
  select
    coalesce(
      jsonb_agg(
        to_jsonb(feed)
        order by
          feed.created_at desc,
          feed.notification_id desc
      ) filter (
        where feed.notification_id is not null
      ),
      '[]'::jsonb
    ) as notifications,
    public.mhidas_get_social_notification_unread_count()
      as unread_count
  from feed;
$function$;

revoke all on function public.mhidas_get_social_notifications_envelope(
  integer,
  boolean,
  timestamp with time zone,
  uuid
) from public;

revoke all on function public.mhidas_get_social_notifications_envelope(
  integer,
  boolean,
  timestamp with time zone,
  uuid
) from anon;

grant execute on function public.mhidas_get_social_notifications_envelope(
  integer,
  boolean,
  timestamp with time zone,
  uuid
) to authenticated;

grant execute on function public.mhidas_get_social_notifications_envelope(
  integer,
  boolean,
  timestamp with time zone,
  uuid
) to service_role;

comment on function public.mhidas_get_social_notifications_envelope(
  integer,
  boolean,
  timestamp with time zone,
  uuid
) is
  'Returns one paginated notification feed envelope and its unread count for the authenticated user.';

do $validation$
declare
  v_function_count integer := 0;
  v_security_definer boolean;
  v_volatility "char";
  v_configuration text[];
begin
  select
    count(*) over (),
    p.prosecdef,
    p.provolatile,
    p.proconfig
  into
    v_function_count,
    v_security_definer,
    v_volatility,
    v_configuration
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname =
      'mhidas_get_social_notifications_envelope'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) =
      'p_limit integer, p_unread_only boolean, p_cursor_created_at timestamp with time zone, p_cursor_notification_id uuid'
  limit 1;

  if v_function_count <> 1 then
    raise exception
      'V4_8_167_ENVELOPE_FUNCTION_COUNT_FAILED:%',
      v_function_count;
  end if;

  if v_security_definer is distinct from true then
    raise exception
      'V4_8_167_ENVELOPE_SECURITY_DEFINER_FAILED';
  end if;

  if v_volatility is distinct from 's'::"char" then
    raise exception
      'V4_8_167_ENVELOPE_VOLATILITY_FAILED';
  end if;

  if not (
    'search_path=pg_catalog, public' =
    any(coalesce(v_configuration, array[]::text[]))
  ) then
    raise exception
      'V4_8_167_ENVELOPE_SEARCH_PATH_FAILED';
  end if;

  if not pg_catalog.has_function_privilege(
    'authenticated',
    'public.mhidas_get_social_notifications_envelope(integer,boolean,timestamp with time zone,uuid)',
    'EXECUTE'
  ) then
    raise exception
      'V4_8_167_ENVELOPE_AUTHENTICATED_GRANT_FAILED';
  end if;
end
$validation$;

commit;