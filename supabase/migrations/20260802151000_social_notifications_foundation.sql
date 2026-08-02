-- supabase/migrations/20260802151000_social_notifications_foundation.sql
-- MHIDAS / USECLUBBERS
-- V4.8.147 - Central social notifications foundation
-- Scope: in-app only, no generators, no API, no UI, no Realtime, no push.

begin;

do $$
begin
  if to_regclass('public.event_groups') is null then
    raise exception 'V4_8_147_EVENT_GROUPS_DEPENDENCY_MISSING';
  end if;

  if to_regclass('public.professional_relationship_controls') is null then
    raise exception 'V4_8_147_RELATIONSHIP_CONTROLS_DEPENDENCY_MISSING';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'social_notification_channel'
  ) then
    create type public.social_notification_channel as enum (
      'in_app'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'social_notification_status'
  ) then
    create type public.social_notification_status as enum (
      'active',
      'cancelled',
      'invalidated'
    );
  end if;
end
$$;

create or replace function public.mhidas_social_notification_payload_is_safe(
  p_payload jsonb
)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $function$
  select
    p_payload is not null
    and jsonb_typeof(p_payload) = 'object'
    and pg_column_size(p_payload) <= 2048
    and not exists (
      select 1
      from jsonb_each(p_payload) as payload_entry(key_name, value_data)
      where payload_entry.key_name not in (
        'actor_label',
        'actor_slug',
        'source_label',
        'source_category',
        'event_name',
        'event_slug',
        'profile_slug',
        'request_status',
        'member_role',
        'entity_status',
        'count'
      )
      or jsonb_typeof(payload_entry.value_data) not in (
        'string',
        'number',
        'boolean',
        'null'
      )
    );
$function$;

create table if not exists public.social_notifications (
  notification_id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null
    references auth.users(id)
    on delete cascade,
  actor_user_id uuid
    references auth.users(id)
    on delete set null,
  event_group_id uuid
    references public.event_groups(group_id)
    on delete set null,
  source_type text not null,
  source_id uuid not null,
  notification_type text not null,
  title text not null,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  internal_url text not null,
  channel public.social_notification_channel not null default 'in_app',
  status public.social_notification_status not null default 'active',
  idempotency_key text not null,
  read_at timestamptz,
  cancelled_at timestamptz,
  invalidated_at timestamptz,
  status_reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint social_notifications_no_self_notification
    check (
      actor_user_id is null
      or actor_user_id <> recipient_user_id
    ),

  constraint social_notifications_source_type_check
    check (
      source_type = lower(btrim(source_type))
      and source_type ~ '^[a-z][a-z0-9_]{1,49}$'
    ),

  constraint social_notifications_notification_type_check
    check (
      notification_type = lower(btrim(notification_type))
      and notification_type ~ '^[a-z][a-z0-9_.]{2,79}$'
    ),

  constraint social_notifications_title_check
    check (
      char_length(btrim(title)) between 3 and 120
      and title !~ '[[:cntrl:]]'
    ),

  constraint social_notifications_summary_check
    check (
      summary is null
      or (
        char_length(summary) <= 280
        and summary !~ '[[:cntrl:]]'
      )
    ),

  constraint social_notifications_payload_check
    check (
      public.mhidas_social_notification_payload_is_safe(payload)
    ),

  constraint social_notifications_internal_url_check
    check (
      char_length(internal_url) between 2 and 500
      and internal_url ~ '^/[A-Za-z0-9/_?&=.%#:@+~-]*$'
      and internal_url !~ '^//'
      and internal_url !~ '[[:cntrl:]]'
      and position(E'\\' in internal_url) = 0
    ),

  constraint social_notifications_idempotency_key_check
    check (
      idempotency_key = lower(btrim(idempotency_key))
      and char_length(idempotency_key) between 8 and 200
      and idempotency_key ~ '^[a-z0-9][a-z0-9:_./-]{7,199}$'
    ),

  constraint social_notifications_status_timestamps_check
    check (
      (
        status = 'active'
        and cancelled_at is null
        and invalidated_at is null
      )
      or
      (
        status = 'cancelled'
        and cancelled_at is not null
        and invalidated_at is null
      )
      or
      (
        status = 'invalidated'
        and invalidated_at is not null
        and cancelled_at is null
      )
    ),

  constraint social_notifications_status_reason_check
    check (
      status_reason is null
      or char_length(status_reason) <= 160
    ),

  constraint social_notifications_read_at_check
    check (
      read_at is null
      or read_at >= created_at
    ),

  constraint social_notifications_expires_at_check
    check (
      expires_at is null
      or expires_at > created_at
    ),

  constraint social_notifications_updated_at_check
    check (updated_at >= created_at),

  constraint social_notifications_recipient_channel_idempotency_unique
    unique (recipient_user_id, channel, idempotency_key)
);

create index if not exists social_notifications_recipient_feed_idx
  on public.social_notifications (
    recipient_user_id,
    status,
    created_at desc,
    notification_id
  );

create index if not exists social_notifications_recipient_unread_idx
  on public.social_notifications (
    recipient_user_id,
    created_at desc,
    notification_id
  )
  where status = 'active'
    and read_at is null;

create index if not exists social_notifications_source_idx
  on public.social_notifications (
    source_type,
    source_id,
    notification_type,
    created_at desc
  );

create index if not exists social_notifications_event_idx
  on public.social_notifications (
    event_group_id,
    created_at desc
  )
  where event_group_id is not null;

create index if not exists social_notifications_expiration_idx
  on public.social_notifications (
    expires_at
  )
  where expires_at is not null;

create or replace function public.mhidas_social_notification_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists trg_social_notifications_updated_at
  on public.social_notifications;

create trigger trg_social_notifications_updated_at
before update on public.social_notifications
for each row
execute function public.mhidas_social_notification_set_updated_at();

create or replace function public.mhidas_social_notification_relationship_control_exists(
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
      else exists (
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
    end;
$function$;

create or replace function public.mhidas_create_social_notification(
  p_recipient_user_id uuid,
  p_event_group_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_notification_type text,
  p_idempotency_key text,
  p_title text,
  p_internal_url text,
  p_summary text default null,
  p_payload jsonb default '{}'::jsonb,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_source_type text := lower(btrim(coalesce(p_source_type, '')));
  v_notification_type text := lower(btrim(coalesce(p_notification_type, '')));
  v_idempotency_key text := lower(btrim(coalesce(p_idempotency_key, '')));
  v_title text := btrim(coalesce(p_title, ''));
  v_summary text := nullif(btrim(coalesce(p_summary, '')), '');
  v_internal_url text := btrim(coalesce(p_internal_url, ''));
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_notification_id uuid;
  v_existing_source_type text;
  v_existing_source_id uuid;
  v_existing_notification_type text;
  v_existing_event_group_id uuid;
begin
  if v_actor_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  if p_recipient_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'notification_recipient_required';
  end if;

  if p_source_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'notification_source_id_required';
  end if;

  if v_actor_user_id = p_recipient_user_id then
    return null;
  end if;

  if public.mhidas_social_notification_relationship_control_exists(
    v_actor_user_id,
    p_recipient_user_id
  ) then
    return null;
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_recipient_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'notification_recipient_not_found';
  end if;

  if p_event_group_id is not null
    and not exists (
      select 1
      from public.event_groups eg
      where eg.group_id = p_event_group_id
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'notification_event_not_found';
  end if;

  if v_source_type !~ '^[a-z][a-z0-9_]{1,49}$' then
    raise exception using
      errcode = 'P0001',
      message = 'notification_source_type_invalid';
  end if;

  if v_notification_type !~ '^[a-z][a-z0-9_.]{2,79}$' then
    raise exception using
      errcode = 'P0001',
      message = 'notification_type_invalid';
  end if;

  if char_length(v_idempotency_key) not between 8 and 200
    or v_idempotency_key !~ '^[a-z0-9][a-z0-9:_./-]{7,199}$'
  then
    raise exception using
      errcode = 'P0001',
      message = 'notification_idempotency_key_invalid';
  end if;

  if char_length(v_title) not between 3 and 120
    or v_title ~ '[[:cntrl:]]'
  then
    raise exception using
      errcode = 'P0001',
      message = 'notification_title_invalid';
  end if;

  if v_summary is not null
    and (
      char_length(v_summary) > 280
      or v_summary ~ '[[:cntrl:]]'
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'notification_summary_invalid';
  end if;

  if char_length(v_internal_url) not between 2 and 500
    or v_internal_url !~ '^/[A-Za-z0-9/_?&=.%#:@+~-]*$'
    or v_internal_url ~ '^//'
    or v_internal_url ~ '[[:cntrl:]]'
    or position(E'\\' in v_internal_url) <> 0
  then
    raise exception using
      errcode = 'P0001',
      message = 'notification_internal_url_invalid';
  end if;

  if not public.mhidas_social_notification_payload_is_safe(v_payload) then
    raise exception using
      errcode = 'P0001',
      message = 'notification_payload_invalid';
  end if;

  if p_expires_at is not null
    and p_expires_at <= now()
  then
    raise exception using
      errcode = 'P0001',
      message = 'notification_expiration_invalid';
  end if;

  insert into public.social_notifications (
    recipient_user_id,
    actor_user_id,
    event_group_id,
    source_type,
    source_id,
    notification_type,
    title,
    summary,
    payload,
    internal_url,
    channel,
    status,
    idempotency_key,
    expires_at
  )
  values (
    p_recipient_user_id,
    v_actor_user_id,
    p_event_group_id,
    v_source_type,
    p_source_id,
    v_notification_type,
    v_title,
    v_summary,
    v_payload,
    v_internal_url,
    'in_app',
    'active',
    v_idempotency_key,
    p_expires_at
  )
  on conflict on constraint social_notifications_recipient_channel_idempotency_unique
  do nothing
  returning notification_id
  into v_notification_id;

  if v_notification_id is not null then
    return v_notification_id;
  end if;

  select
    sn.notification_id,
    sn.source_type,
    sn.source_id,
    sn.notification_type,
    sn.event_group_id
  into
    v_notification_id,
    v_existing_source_type,
    v_existing_source_id,
    v_existing_notification_type,
    v_existing_event_group_id
  from public.social_notifications sn
  where sn.recipient_user_id = p_recipient_user_id
    and sn.channel = 'in_app'
    and sn.idempotency_key = v_idempotency_key;

  if v_notification_id is null then
    raise exception 'V4_8_147_NOTIFICATION_IDEMPOTENCY_LOOKUP_FAILED';
  end if;

  if v_existing_source_type <> v_source_type
    or v_existing_source_id <> p_source_id
    or v_existing_notification_type <> v_notification_type
    or v_existing_event_group_id is distinct from p_event_group_id
  then
    raise exception using
      errcode = 'P0001',
      message = 'notification_idempotency_collision';
  end if;

  return v_notification_id;
end;
$function$;

create or replace function public.mhidas_set_social_notifications_state_by_source(
  p_source_type text,
  p_source_id uuid,
  p_new_status text,
  p_reason text default null
)
returns integer
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_source_type text := lower(btrim(coalesce(p_source_type, '')));
  v_new_status text := lower(btrim(coalesce(p_new_status, '')));
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_affected integer := 0;
begin
  if v_actor_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  if p_source_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'notification_source_id_required';
  end if;

  if v_source_type !~ '^[a-z][a-z0-9_]{1,49}$' then
    raise exception using
      errcode = 'P0001',
      message = 'notification_source_type_invalid';
  end if;

  if v_new_status not in ('cancelled', 'invalidated') then
    raise exception using
      errcode = 'P0001',
      message = 'notification_status_transition_invalid';
  end if;

  if v_reason is not null
    and char_length(v_reason) > 160
  then
    raise exception using
      errcode = 'P0001',
      message = 'notification_status_reason_invalid';
  end if;

  update public.social_notifications sn
  set
    status = v_new_status::public.social_notification_status,
    cancelled_at = case
      when v_new_status = 'cancelled' then now()
      else null
    end,
    invalidated_at = case
      when v_new_status = 'invalidated' then now()
      else null
    end,
    status_reason = v_reason
  where sn.source_type = v_source_type
    and sn.source_id = p_source_id
    and sn.status = 'active';

  get diagnostics v_affected = row_count;
  return v_affected;
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
  from public.social_notifications sn
  where sn.recipient_user_id = v_user_id
    and sn.status = 'active'
    and sn.read_at is null
    and (
      sn.expires_at is null
      or sn.expires_at > now()
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
  v_affected integer := 0;
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

  update public.social_notifications sn
  set read_at = coalesce(sn.read_at, now())
  where sn.notification_id = p_notification_id
    and sn.recipient_user_id = v_user_id;

  get diagnostics v_affected = row_count;
  return v_affected = 1;
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
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  update public.social_notifications sn
  set read_at = now()
  where sn.recipient_user_id = v_user_id
    and sn.status = 'active'
    and sn.read_at is null;

  get diagnostics v_affected = row_count;
  return v_affected;
end;
$function$;

alter table public.social_notifications
  enable row level security;

drop policy if exists social_notifications_select_own
  on public.social_notifications;

create policy social_notifications_select_own
on public.social_notifications
for select
to authenticated
using (
  recipient_user_id = auth.uid()
);

revoke all on table public.social_notifications
  from public, anon, authenticated;

grant select on table public.social_notifications
  to authenticated;

grant all on table public.social_notifications
  to service_role;

revoke all on function public.mhidas_social_notification_payload_is_safe(jsonb)
  from public, anon, authenticated;

grant execute on function public.mhidas_social_notification_payload_is_safe(jsonb)
  to service_role;

revoke all on function public.mhidas_social_notification_set_updated_at()
  from public, anon, authenticated, service_role;

revoke all on function public.mhidas_social_notification_relationship_control_exists(uuid, uuid)
  from public, anon, authenticated, service_role;

revoke all on function public.mhidas_create_social_notification(
  uuid,
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  timestamptz
) from public, anon, authenticated, service_role;

revoke all on function public.mhidas_set_social_notifications_state_by_source(
  text,
  uuid,
  text,
  text
) from public, anon, authenticated, service_role;

revoke all on function public.mhidas_get_social_notification_unread_count()
  from public, anon, authenticated;

revoke all on function public.mhidas_mark_social_notification_read(uuid)
  from public, anon, authenticated;

revoke all on function public.mhidas_mark_all_social_notifications_read()
  from public, anon, authenticated;

grant execute on function public.mhidas_get_social_notification_unread_count()
  to authenticated, service_role;

grant execute on function public.mhidas_mark_social_notification_read(uuid)
  to authenticated, service_role;

grant execute on function public.mhidas_mark_all_social_notifications_read()
  to authenticated, service_role;

comment on table public.social_notifications is
  'Central in-app social notification store for MHIDAS/USECLUBBERS. Generation is added transactionally by later domain migrations.';

comment on column public.social_notifications.recipient_user_id is
  'Only this authenticated user may read the notification through RLS.';

comment on column public.social_notifications.actor_user_id is
  'Authenticated actor captured by the internal transactional helper. Null only after actor account deletion.';

comment on column public.social_notifications.event_group_id is
  'Optional event scope. Social follow or connection notifications may be independent from an event.';

comment on column public.social_notifications.source_type is
  'Extensible controlled namespace such as tribe, tribe_join_request, ride, meetup, event, social_connection, or professional_follow.';

comment on column public.social_notifications.notification_type is
  'Stable machine-readable event name. UI copy must not infer authorization from this value.';

comment on column public.social_notifications.payload is
  'Small flat allowlisted payload only. Precise location, contact information, tokens, secrets, and arbitrary nested content are forbidden.';

comment on column public.social_notifications.internal_url is
  'Internal relative URL only. External URLs are rejected by constraint and helper validation.';

comment on column public.social_notifications.idempotency_key is
  'Stable business-event key unique per recipient and channel, preventing duplicate notification delivery.';

comment on function public.mhidas_create_social_notification(
  uuid,
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  timestamptz
) is
  'Internal-only transactional creator. Actor is always auth.uid(); self-notifications and blocked relationships are suppressed.';

comment on function public.mhidas_set_social_notifications_state_by_source(
  text,
  uuid,
  text,
  text
) is
  'Internal-only source invalidation helper. Authorization must be established by the enclosing business RPC.';

do $$
declare
  v_missing_relations integer;
  v_missing_types integer;
  v_missing_functions integer;
  v_rls_missing integer;
  v_policy_count integer;
  v_missing_constraints integer;
  v_missing_indexes integer;
  v_anon_table_privilege boolean;
  v_authenticated_write_privilege boolean;
  v_authenticated_select_missing boolean;
  v_internal_execute_exposed integer;
  v_public_rpc_execute_missing integer;
  v_anon_public_rpc_execute integer;
  v_insecure_function_count integer;
  v_trigger_missing integer;
begin
  select count(*)
  into v_missing_relations
  from (
    values
      ('public.social_notifications'),
      ('public.event_groups'),
      ('public.professional_relationship_controls')
  ) as expected(relation_name)
  where to_regclass(expected.relation_name) is null;

  if v_missing_relations <> 0 then
    raise exception 'V4_8_147_REQUIRED_RELATION_MISSING';
  end if;

  select count(*)
  into v_missing_types
  from (
    values
      ('social_notification_channel'),
      ('social_notification_status')
  ) as expected(type_name)
  where not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = expected.type_name
  );

  if v_missing_types <> 0 then
    raise exception 'V4_8_147_REQUIRED_TYPE_MISSING';
  end if;

  select count(*)
  into v_missing_functions
  from (
    values
      ('public.mhidas_social_notification_payload_is_safe(jsonb)'),
      ('public.mhidas_social_notification_set_updated_at()'),
      ('public.mhidas_social_notification_relationship_control_exists(uuid,uuid)'),
      ('public.mhidas_create_social_notification(uuid,uuid,text,uuid,text,text,text,text,text,jsonb,timestamp with time zone)'),
      ('public.mhidas_set_social_notifications_state_by_source(text,uuid,text,text)'),
      ('public.mhidas_get_social_notification_unread_count()'),
      ('public.mhidas_mark_social_notification_read(uuid)'),
      ('public.mhidas_mark_all_social_notifications_read()')
  ) as expected(signature)
  where to_regprocedure(expected.signature) is null;

  if v_missing_functions <> 0 then
    raise exception 'V4_8_147_REQUIRED_FUNCTION_MISSING';
  end if;

  select count(*)
  into v_rls_missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'social_notifications'
    and c.relrowsecurity = false;

  if v_rls_missing <> 0 then
    raise exception 'V4_8_147_RLS_MISSING';
  end if;

  select count(*)
  into v_policy_count
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename = 'social_notifications';

  if v_policy_count <> 1 then
    raise exception 'V4_8_147_POLICY_SET_INVALID';
  end if;

  if not exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'social_notifications'
      and p.policyname = 'social_notifications_select_own'
      and p.cmd = 'SELECT'
      and 'authenticated' = any(p.roles)
  ) then
    raise exception 'V4_8_147_SELECT_POLICY_MISSING';
  end if;

  select count(*)
  into v_missing_constraints
  from (
    values
      ('social_notifications_no_self_notification'),
      ('social_notifications_source_type_check'),
      ('social_notifications_notification_type_check'),
      ('social_notifications_title_check'),
      ('social_notifications_summary_check'),
      ('social_notifications_payload_check'),
      ('social_notifications_internal_url_check'),
      ('social_notifications_idempotency_key_check'),
      ('social_notifications_status_timestamps_check'),
      ('social_notifications_status_reason_check'),
      ('social_notifications_read_at_check'),
      ('social_notifications_expires_at_check'),
      ('social_notifications_updated_at_check'),
      ('social_notifications_recipient_channel_idempotency_unique')
  ) as expected(constraint_name)
  where not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.social_notifications'::regclass
      and c.conname = expected.constraint_name
  );

  if v_missing_constraints <> 0 then
    raise exception 'V4_8_147_REQUIRED_CONSTRAINT_MISSING';
  end if;

  select count(*)
  into v_missing_indexes
  from (
    values
      ('social_notifications_recipient_feed_idx'),
      ('social_notifications_recipient_unread_idx'),
      ('social_notifications_source_idx'),
      ('social_notifications_event_idx'),
      ('social_notifications_expiration_idx')
  ) as expected(index_name)
  where to_regclass('public.' || expected.index_name) is null;

  if v_missing_indexes <> 0 then
    raise exception 'V4_8_147_REQUIRED_INDEX_MISSING';
  end if;

  select
    has_table_privilege('anon', 'public.social_notifications', 'SELECT')
    or has_table_privilege('anon', 'public.social_notifications', 'INSERT')
    or has_table_privilege('anon', 'public.social_notifications', 'UPDATE')
    or has_table_privilege('anon', 'public.social_notifications', 'DELETE')
  into v_anon_table_privilege;

  if v_anon_table_privilege then
    raise exception 'V4_8_147_ANON_TABLE_PRIVILEGE_PRESENT';
  end if;

  select
    has_table_privilege('authenticated', 'public.social_notifications', 'INSERT')
    or has_table_privilege('authenticated', 'public.social_notifications', 'UPDATE')
    or has_table_privilege('authenticated', 'public.social_notifications', 'DELETE')
  into v_authenticated_write_privilege;

  if v_authenticated_write_privilege then
    raise exception 'V4_8_147_AUTHENTICATED_WRITE_PRIVILEGE_PRESENT';
  end if;

  select not has_table_privilege(
    'authenticated',
    'public.social_notifications',
    'SELECT'
  )
  into v_authenticated_select_missing;

  if v_authenticated_select_missing then
    raise exception 'V4_8_147_AUTHENTICATED_SELECT_MISSING';
  end if;

  select count(*)
  into v_internal_execute_exposed
  from (
    values
      ('public.mhidas_social_notification_payload_is_safe(jsonb)'),
      ('public.mhidas_social_notification_set_updated_at()'),
      ('public.mhidas_social_notification_relationship_control_exists(uuid,uuid)'),
      ('public.mhidas_create_social_notification(uuid,uuid,text,uuid,text,text,text,text,text,jsonb,timestamp with time zone)'),
      ('public.mhidas_set_social_notifications_state_by_source(text,uuid,text,text)')
  ) as expected(signature)
  where has_function_privilege('anon', expected.signature, 'EXECUTE')
     or has_function_privilege('authenticated', expected.signature, 'EXECUTE');

  if v_internal_execute_exposed <> 0 then
    raise exception 'V4_8_147_INTERNAL_FUNCTION_EXPOSED';
  end if;

  select count(*)
  into v_public_rpc_execute_missing
  from (
    values
      ('public.mhidas_get_social_notification_unread_count()'),
      ('public.mhidas_mark_social_notification_read(uuid)'),
      ('public.mhidas_mark_all_social_notifications_read()')
  ) as expected(signature)
  where not has_function_privilege(
    'authenticated',
    expected.signature,
    'EXECUTE'
  );

  if v_public_rpc_execute_missing <> 0 then
    raise exception 'V4_8_147_AUTHENTICATED_RPC_EXECUTE_MISSING';
  end if;

  select count(*)
  into v_anon_public_rpc_execute
  from (
    values
      ('public.mhidas_get_social_notification_unread_count()'),
      ('public.mhidas_mark_social_notification_read(uuid)'),
      ('public.mhidas_mark_all_social_notifications_read()')
  ) as expected(signature)
  where has_function_privilege(
    'anon',
    expected.signature,
    'EXECUTE'
  );

  if v_anon_public_rpc_execute <> 0 then
    raise exception 'V4_8_147_ANON_RPC_EXECUTE_PRESENT';
  end if;

  select count(*)
  into v_insecure_function_count
  from (
    values
      ('public.mhidas_social_notification_set_updated_at()'),
      ('public.mhidas_social_notification_relationship_control_exists(uuid,uuid)'),
      ('public.mhidas_create_social_notification(uuid,uuid,text,uuid,text,text,text,text,text,jsonb,timestamp with time zone)'),
      ('public.mhidas_set_social_notifications_state_by_source(text,uuid,text,text)'),
      ('public.mhidas_get_social_notification_unread_count()'),
      ('public.mhidas_mark_social_notification_read(uuid)'),
      ('public.mhidas_mark_all_social_notifications_read()')
  ) as expected(signature)
  join pg_proc p
    on p.oid = to_regprocedure(expected.signature)
  where p.prosecdef = false
     or p.proconfig is null
     or not (
       'search_path=pg_catalog, public' = any(p.proconfig)
     );

  if v_insecure_function_count <> 0 then
    raise exception 'V4_8_147_FUNCTION_SECURITY_CONFIGURATION_INVALID';
  end if;

  select count(*)
  into v_trigger_missing
  from pg_trigger t
  where t.tgrelid = 'public.social_notifications'::regclass
    and t.tgname = 'trg_social_notifications_updated_at'
    and not t.tgisinternal;

  if v_trigger_missing <> 1 then
    raise exception 'V4_8_147_UPDATED_AT_TRIGGER_MISSING';
  end if;
end
$$;

commit;
