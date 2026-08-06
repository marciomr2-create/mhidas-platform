-- supabase/migrations/20260806152000_notification_push_subscriptions_preferences.sql
-- MHIDAS / USECLUBBERS
-- V4.8.155 - Push subscriptions and notification preferences foundation
-- Scope: authenticated Web Push subscriptions, per-user push preference and secure RPCs.
-- Explicitly excluded: push dispatch, VAPID private-key use, delivery attempts, queue worker and production access.

begin;

do $$
begin
  if to_regclass('public.notification_type_registry') is null then
    raise exception 'V4_8_155_NOTIFICATION_TYPE_REGISTRY_DEPENDENCY_MISSING';
  end if;

  if to_regclass('public.notification_events') is null then
    raise exception 'V4_8_155_NOTIFICATION_EVENTS_DEPENDENCY_MISSING';
  end if;

  if to_regclass('public.notification_recipients') is null then
    raise exception 'V4_8_155_NOTIFICATION_RECIPIENTS_DEPENDENCY_MISSING';
  end if;

  if to_regclass('public.notification_deliveries') is null then
    raise exception 'V4_8_155_NOTIFICATION_DELIVERIES_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure('public.mhidas_notification_set_updated_at()') is null then
    raise exception 'V4_8_155_UPDATED_AT_TRIGGER_DEPENDENCY_MISSING';
  end if;
end
$$;

create table if not exists public.notification_preferences (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,
  push_enabled boolean not null default false,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time without time zone,
  quiet_hours_end time without time zone,
  timezone text not null default 'UTC',
  category_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_preferences_quiet_hours_check
    check (
      (
        quiet_hours_enabled = false
      )
      or
      (
        quiet_hours_enabled = true
        and quiet_hours_start is not null
        and quiet_hours_end is not null
        and quiet_hours_start <> quiet_hours_end
      )
    ),

  constraint notification_preferences_timezone_check
    check (
      char_length(btrim(timezone)) between 1 and 80
      and timezone !~ '[[:cntrl:]]'
    ),

  constraint notification_preferences_category_overrides_check
    check (
      jsonb_typeof(category_overrides) = 'object'
      and octet_length(category_overrides::text) <= 16384
    ),

  constraint notification_preferences_updated_at_check
    check (updated_at >= created_at)
);

create table if not exists public.notification_push_subscriptions (
  subscription_id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  expiration_time_ms bigint,
  vapid_key_fingerprint text not null,
  user_agent text,
  status text not null default 'active',
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_push_subscriptions_endpoint_check
    check (
      char_length(endpoint) between 16 and 1000
      and endpoint = btrim(endpoint)
      and endpoint ~ '^https://[^[:space:]/]+/[^[:space:]]+$'
      and endpoint !~ '[[:cntrl:]]'
      and position(E'\\' in endpoint) = 0
    ),

  constraint notification_push_subscriptions_p256dh_check
    check (
      char_length(p256dh) between 40 and 200
      and p256dh ~ '^[A-Za-z0-9_-]+={0,2}$'
    ),

  constraint notification_push_subscriptions_auth_secret_check
    check (
      char_length(auth_secret) between 8 and 128
      and auth_secret ~ '^[A-Za-z0-9_-]+={0,2}$'
    ),

  constraint notification_push_subscriptions_expiration_check
    check (
      expiration_time_ms is null
      or expiration_time_ms > 0
    ),

  constraint notification_push_subscriptions_vapid_fingerprint_check
    check (
      vapid_key_fingerprint ~ '^[a-f0-9]{64}$'
    ),

  constraint notification_push_subscriptions_user_agent_check
    check (
      user_agent is null
      or (
        char_length(user_agent) <= 500
        and user_agent !~ '[[:cntrl:]]'
      )
    ),

  constraint notification_push_subscriptions_status_check
    check (
      status in ('active', 'revoked', 'invalidated', 'expired')
    ),

  constraint notification_push_subscriptions_status_timestamps_check
    check (
      (
        status = 'active'
        and revoked_at is null
        and invalidated_at is null
      )
      or
      (
        status = 'revoked'
        and revoked_at is not null
        and invalidated_at is null
      )
      or
      (
        status in ('invalidated', 'expired')
        and invalidated_at is not null
        and revoked_at is null
      )
    ),

  constraint notification_push_subscriptions_time_order_check
    check (
      last_seen_at >= created_at
      and updated_at >= created_at
      and (revoked_at is null or revoked_at >= created_at)
      and (invalidated_at is null or invalidated_at >= created_at)
    )
);

create index if not exists notification_push_subscriptions_user_active_idx
  on public.notification_push_subscriptions (
    user_id,
    status,
    updated_at desc
  );

create index if not exists notification_push_subscriptions_expiration_idx
  on public.notification_push_subscriptions (
    expiration_time_ms
  )
  where expiration_time_ms is not null;

drop trigger if exists trg_notification_preferences_updated_at
  on public.notification_preferences;

create trigger trg_notification_preferences_updated_at
before update on public.notification_preferences
for each row
execute function public.mhidas_notification_set_updated_at();

drop trigger if exists trg_notification_push_subscriptions_updated_at
  on public.notification_push_subscriptions;

create trigger trg_notification_push_subscriptions_updated_at
before update on public.notification_push_subscriptions
for each row
execute function public.mhidas_notification_set_updated_at();

create or replace function public.mhidas_notification_push_endpoint_is_safe(
  p_endpoint text
)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $function$
  select
    p_endpoint is not null
    and p_endpoint = btrim(p_endpoint)
    and char_length(p_endpoint) between 16 and 1000
    and p_endpoint ~ '^https://[^[:space:]/]+/[^[:space:]]+$'
    and p_endpoint !~ '[[:cntrl:]]'
    and position(E'\\' in p_endpoint) = 0;
$function$;

create or replace function public.mhidas_get_notification_push_settings(
  p_endpoint text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user_id uuid;
  v_push_enabled boolean;
  v_active_subscription_count integer;
  v_current_endpoint_active boolean;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'V4_8_155_AUTHENTICATION_REQUIRED';
  end if;

  if p_endpoint is not null
     and not public.mhidas_notification_push_endpoint_is_safe(p_endpoint) then
    raise exception 'V4_8_155_INVALID_PUSH_ENDPOINT';
  end if;

  select coalesce(np.push_enabled, false)
  into v_push_enabled
  from public.notification_preferences np
  where np.user_id = v_user_id;

  if not found then
    v_push_enabled := false;
  end if;

  select count(*)::integer
  into v_active_subscription_count
  from public.notification_push_subscriptions nps
  where nps.user_id = v_user_id
    and nps.status = 'active';

  if p_endpoint is null then
    v_current_endpoint_active := false;
  else
    select exists (
      select 1
      from public.notification_push_subscriptions nps
      where nps.user_id = v_user_id
        and nps.endpoint = p_endpoint
        and nps.status = 'active'
    )
    into v_current_endpoint_active;
  end if;

  return jsonb_build_object(
    'pushEnabled', v_push_enabled,
    'activeSubscriptionCount', v_active_subscription_count,
    'currentEndpointActive', v_current_endpoint_active
  );
end;
$function$;

create or replace function public.mhidas_upsert_notification_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth_secret text,
  p_expiration_time_ms bigint,
  p_vapid_key_fingerprint text,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user_id uuid;
  v_previous_user_id uuid;
  v_subscription_id uuid;
  v_active_subscription_count integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'V4_8_155_AUTHENTICATION_REQUIRED';
  end if;

  p_endpoint := btrim(coalesce(p_endpoint, ''));
  p_p256dh := btrim(coalesce(p_p256dh, ''));
  p_auth_secret := btrim(coalesce(p_auth_secret, ''));
  p_vapid_key_fingerprint := lower(btrim(coalesce(p_vapid_key_fingerprint, '')));
  p_user_agent := nullif(btrim(coalesce(p_user_agent, '')), '');

  if not public.mhidas_notification_push_endpoint_is_safe(p_endpoint) then
    raise exception 'V4_8_155_INVALID_PUSH_ENDPOINT';
  end if;

  if char_length(p_p256dh) not between 40 and 200
     or p_p256dh !~ '^[A-Za-z0-9_-]+={0,2}$' then
    raise exception 'V4_8_155_INVALID_P256DH_KEY';
  end if;

  if char_length(p_auth_secret) not between 8 and 128
     or p_auth_secret !~ '^[A-Za-z0-9_-]+={0,2}$' then
    raise exception 'V4_8_155_INVALID_AUTH_SECRET';
  end if;

  if p_expiration_time_ms is not null
     and p_expiration_time_ms <= 0 then
    raise exception 'V4_8_155_INVALID_EXPIRATION_TIME';
  end if;

  if p_vapid_key_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'V4_8_155_INVALID_VAPID_FINGERPRINT';
  end if;

  if p_user_agent is not null
     and (
       char_length(p_user_agent) > 500
       or p_user_agent ~ '[[:cntrl:]]'
     ) then
    raise exception 'V4_8_155_INVALID_USER_AGENT';
  end if;

  select nps.user_id
  into v_previous_user_id
  from public.notification_push_subscriptions nps
  where nps.endpoint = p_endpoint
  for update;

  insert into public.notification_push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth_secret,
    expiration_time_ms,
    vapid_key_fingerprint,
    user_agent,
    status,
    last_seen_at,
    revoked_at,
    invalidated_at
  )
  values (
    v_user_id,
    p_endpoint,
    p_p256dh,
    p_auth_secret,
    p_expiration_time_ms,
    p_vapid_key_fingerprint,
    p_user_agent,
    'active',
    now(),
    null,
    null
  )
  on conflict (endpoint)
  do update set
    user_id = excluded.user_id,
    p256dh = excluded.p256dh,
    auth_secret = excluded.auth_secret,
    expiration_time_ms = excluded.expiration_time_ms,
    vapid_key_fingerprint = excluded.vapid_key_fingerprint,
    user_agent = excluded.user_agent,
    status = 'active',
    last_seen_at = now(),
    revoked_at = null,
    invalidated_at = null,
    updated_at = now()
  returning subscription_id
  into v_subscription_id;

  insert into public.notification_preferences (
    user_id,
    push_enabled
  )
  values (
    v_user_id,
    true
  )
  on conflict (user_id)
  do update set
    push_enabled = true,
    updated_at = now();

  if v_previous_user_id is not null
     and v_previous_user_id <> v_user_id then
    insert into public.notification_preferences (
      user_id,
      push_enabled
    )
    values (
      v_previous_user_id,
      exists (
        select 1
        from public.notification_push_subscriptions nps
        where nps.user_id = v_previous_user_id
          and nps.status = 'active'
      )
    )
    on conflict (user_id)
    do update set
      push_enabled = excluded.push_enabled,
      updated_at = now();
  end if;

  select count(*)::integer
  into v_active_subscription_count
  from public.notification_push_subscriptions nps
  where nps.user_id = v_user_id
    and nps.status = 'active';

  return jsonb_build_object(
    'subscriptionId', v_subscription_id,
    'pushEnabled', true,
    'activeSubscriptionCount', v_active_subscription_count,
    'currentEndpointActive', true
  );
end;
$function$;

create or replace function public.mhidas_revoke_notification_push_subscription(
  p_endpoint text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user_id uuid;
  v_revoked boolean;
  v_active_subscription_count integer;
  v_push_enabled boolean;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'V4_8_155_AUTHENTICATION_REQUIRED';
  end if;

  p_endpoint := btrim(coalesce(p_endpoint, ''));

  if not public.mhidas_notification_push_endpoint_is_safe(p_endpoint) then
    raise exception 'V4_8_155_INVALID_PUSH_ENDPOINT';
  end if;

  update public.notification_push_subscriptions nps
  set
    status = 'revoked',
    revoked_at = now(),
    invalidated_at = null,
    updated_at = now()
  where nps.user_id = v_user_id
    and nps.endpoint = p_endpoint
    and nps.status = 'active';

  v_revoked := found;

  select count(*)::integer
  into v_active_subscription_count
  from public.notification_push_subscriptions nps
  where nps.user_id = v_user_id
    and nps.status = 'active';

  v_push_enabled := v_active_subscription_count > 0;

  insert into public.notification_preferences (
    user_id,
    push_enabled
  )
  values (
    v_user_id,
    v_push_enabled
  )
  on conflict (user_id)
  do update set
    push_enabled = excluded.push_enabled,
    updated_at = now();

  return jsonb_build_object(
    'revoked', v_revoked,
    'pushEnabled', v_push_enabled,
    'activeSubscriptionCount', v_active_subscription_count,
    'currentEndpointActive', false
  );
end;
$function$;

alter table public.notification_preferences
  enable row level security;

alter table public.notification_push_subscriptions
  enable row level security;

revoke all on table public.notification_preferences
  from public, anon, authenticated;

revoke all on table public.notification_push_subscriptions
  from public, anon, authenticated;

grant all on table public.notification_preferences
  to service_role;

grant all on table public.notification_push_subscriptions
  to service_role;

revoke all on function public.mhidas_notification_push_endpoint_is_safe(text)
  from public, anon, authenticated, service_role;

grant execute on function public.mhidas_notification_push_endpoint_is_safe(text)
  to service_role;

revoke all on function public.mhidas_get_notification_push_settings(text)
  from public, anon, authenticated, service_role;

grant execute on function public.mhidas_get_notification_push_settings(text)
  to authenticated;

revoke all on function public.mhidas_upsert_notification_push_subscription(
  text,
  text,
  text,
  bigint,
  text,
  text
) from public, anon, authenticated, service_role;

grant execute on function public.mhidas_upsert_notification_push_subscription(
  text,
  text,
  text,
  bigint,
  text,
  text
) to authenticated;

revoke all on function public.mhidas_revoke_notification_push_subscription(text)
  from public, anon, authenticated, service_role;

grant execute on function public.mhidas_revoke_notification_push_subscription(text)
  to authenticated;

comment on table public.notification_preferences is
  'Per-user notification preferences. V4.8.155 introduces explicit opt-in for Web Push and reserves governed quiet-hours/category fields for later delivery policy.';

comment on table public.notification_push_subscriptions is
  'Authenticated browser/device Web Push subscriptions. Direct client table access is denied; writes occur only through guarded RPCs.';

comment on column public.notification_push_subscriptions.vapid_key_fingerprint is
  'SHA-256 fingerprint of the public VAPID key used to create the browser subscription. The private key is never stored in this table.';

comment on function public.mhidas_get_notification_push_settings(text) is
  'Returns the authenticated user push preference, active subscription count and optional current endpoint status.';

comment on function public.mhidas_upsert_notification_push_subscription(
  text,
  text,
  text,
  bigint,
  text,
  text
) is
  'Registers or refreshes one authenticated browser/device subscription and enables push preference explicitly.';

comment on function public.mhidas_revoke_notification_push_subscription(text) is
  'Revokes one authenticated user endpoint and disables global push preference when no active subscriptions remain.';

do $$
declare
  v_missing_tables integer;
  v_missing_constraints integer;
  v_missing_indexes integer;
  v_missing_triggers integer;
  v_policy_count integer;
  v_registry_count integer;
  v_non_default_channel_count integer;
  v_push_delivery_count integer;
begin
  select count(*)
  into v_missing_tables
  from (
    values
      ('public.notification_preferences'),
      ('public.notification_push_subscriptions')
  ) as expected(relation_name)
  where to_regclass(expected.relation_name) is null;

  if v_missing_tables <> 0 then
    raise exception 'V4_8_155_SELF_CHECK_TABLES_FAILED';
  end if;

  select count(*)
  into v_missing_constraints
  from (
    values
      ('public.notification_preferences', 'notification_preferences_pkey'),
      ('public.notification_preferences', 'notification_preferences_quiet_hours_check'),
      ('public.notification_preferences', 'notification_preferences_timezone_check'),
      ('public.notification_preferences', 'notification_preferences_category_overrides_check'),
      ('public.notification_push_subscriptions', 'notification_push_subscriptions_pkey'),
      ('public.notification_push_subscriptions', 'notification_push_subscriptions_endpoint_key'),
      ('public.notification_push_subscriptions', 'notification_push_subscriptions_endpoint_check'),
      ('public.notification_push_subscriptions', 'notification_push_subscriptions_p256dh_check'),
      ('public.notification_push_subscriptions', 'notification_push_subscriptions_auth_secret_check'),
      ('public.notification_push_subscriptions', 'notification_push_subscriptions_vapid_fingerprint_check'),
      ('public.notification_push_subscriptions', 'notification_push_subscriptions_status_check'),
      ('public.notification_push_subscriptions', 'notification_push_subscriptions_status_timestamps_check')
  ) as expected(relation_name, constraint_name)
  where not exists (
    select 1
    from pg_constraint c
    where c.conrelid = expected.relation_name::regclass
      and c.conname = expected.constraint_name
  );

  if v_missing_constraints <> 0 then
    raise exception 'V4_8_155_SELF_CHECK_CONSTRAINTS_FAILED';
  end if;

  select count(*)
  into v_missing_indexes
  from (
    values
      ('notification_push_subscriptions_user_active_idx'),
      ('notification_push_subscriptions_expiration_idx')
  ) as expected(index_name)
  where to_regclass('public.' || expected.index_name) is null;

  if v_missing_indexes <> 0 then
    raise exception 'V4_8_155_SELF_CHECK_INDEXES_FAILED';
  end if;

  select count(*)
  into v_missing_triggers
  from (
    values
      ('public.notification_preferences', 'trg_notification_preferences_updated_at'),
      ('public.notification_push_subscriptions', 'trg_notification_push_subscriptions_updated_at')
  ) as expected(relation_name, trigger_name)
  where not exists (
    select 1
    from pg_trigger t
    where t.tgrelid = expected.relation_name::regclass
      and t.tgname = expected.trigger_name
      and not t.tgisinternal
  );

  if v_missing_triggers <> 0 then
    raise exception 'V4_8_155_SELF_CHECK_TRIGGERS_FAILED';
  end if;

  if to_regprocedure('public.mhidas_notification_push_endpoint_is_safe(text)') is null
     or to_regprocedure('public.mhidas_get_notification_push_settings(text)') is null
     or to_regprocedure(
       'public.mhidas_upsert_notification_push_subscription(text,text,text,bigint,text,text)'
     ) is null
     or to_regprocedure(
       'public.mhidas_revoke_notification_push_subscription(text)'
     ) is null then
    raise exception 'V4_8_155_SELF_CHECK_FUNCTIONS_FAILED';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'notification_preferences'
      and c.relrowsecurity = true
  )
  or not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'notification_push_subscriptions'
      and c.relrowsecurity = true
  ) then
    raise exception 'V4_8_155_SELF_CHECK_RLS_FAILED';
  end if;

  select count(*)
  into v_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'notification_preferences',
      'notification_push_subscriptions'
    );

  if v_policy_count <> 0 then
    raise exception 'V4_8_155_SELF_CHECK_UNEXPECTED_POLICIES';
  end if;

  if exists (
    select 1
    from (
      values ('anon'), ('authenticated')
    ) as roles(role_name)
    cross join (
      values
        ('public.notification_preferences'),
        ('public.notification_push_subscriptions')
    ) as relations(relation_name)
    where has_table_privilege(
      roles.role_name,
      relations.relation_name,
      'SELECT,INSERT,UPDATE,DELETE'
    )
  ) then
    raise exception 'V4_8_155_SELF_CHECK_TABLE_ACL_FAILED';
  end if;

  if has_function_privilege(
    'anon',
    'public.mhidas_get_notification_push_settings(text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_get_notification_push_settings(text)',
    'EXECUTE'
  )
  or has_function_privilege(
    'anon',
    'public.mhidas_upsert_notification_push_subscription(text,text,text,bigint,text,text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_upsert_notification_push_subscription(text,text,text,bigint,text,text)',
    'EXECUTE'
  )
  or has_function_privilege(
    'anon',
    'public.mhidas_revoke_notification_push_subscription(text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.mhidas_revoke_notification_push_subscription(text)',
    'EXECUTE'
  ) then
    raise exception 'V4_8_155_SELF_CHECK_FUNCTION_ACL_FAILED';
  end if;

  select count(*)
  into v_registry_count
  from public.notification_type_registry
  where is_active = true;

  if v_registry_count <> 32 then
    raise exception 'V4_8_155_SELF_CHECK_REGISTRY_COUNT_FAILED:%', v_registry_count;
  end if;

  select count(*)
  into v_non_default_channel_count
  from public.notification_type_registry ntr
  where ntr.default_channels <> array[
    'in_app',
    'badge'
  ]::public.notification_delivery_channel[];

  if v_non_default_channel_count <> 0 then
    raise exception 'V4_8_155_SELF_CHECK_CHANNELS_CHANGED';
  end if;

  select count(*)
  into v_push_delivery_count
  from public.notification_deliveries nd
  where nd.channel = 'push'::public.notification_delivery_channel;

  if v_push_delivery_count <> 0 then
    raise exception 'V4_8_155_SELF_CHECK_PUSH_DELIVERIES_CREATED';
  end if;
end
$$;

commit;
