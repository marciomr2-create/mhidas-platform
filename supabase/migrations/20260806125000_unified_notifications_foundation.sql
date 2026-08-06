-- supabase/migrations/20260806125000_unified_notifications_foundation.sql
-- MHIDAS / USECLUBBERS
-- V4.8.154 - Unified notifications foundation
-- Scope: platform-wide registry, domain events, recipients and channel deliveries.
-- Compatibility: preserves public.social_notifications, its API contract and all current generators.
-- Explicitly excluded: push subscriptions, VAPID, Service Worker, queue worker, preferences, staging and production access.

begin;

do $$
begin
  if to_regclass('public.social_notifications') is null then
    raise exception 'V4_8_154_SOCIAL_NOTIFICATIONS_DEPENDENCY_MISSING';
  end if;

  if to_regclass('public.event_groups') is null then
    raise exception 'V4_8_154_EVENT_GROUPS_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_social_notification_payload_is_safe(jsonb)'
  ) is null then
    raise exception 'V4_8_154_PAYLOAD_GUARD_DEPENDENCY_MISSING';
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
      and t.typname = 'notification_priority'
  ) then
    create type public.notification_priority as enum (
      'critical',
      'transactional',
      'social',
      'discovery'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'notification_delivery_channel'
  ) then
    create type public.notification_delivery_channel as enum (
      'in_app',
      'push',
      'badge',
      'digest'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'notification_grouping_policy'
  ) then
    create type public.notification_grouping_policy as enum (
      'none',
      'window',
      'digest'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'notification_privacy_level'
  ) then
    create type public.notification_privacy_level as enum (
      'standard',
      'sensitive',
      'critical'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'notification_actor_kind'
  ) then
    create type public.notification_actor_kind as enum (
      'user',
      'system',
      'service',
      'legacy'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'notification_lifecycle_status'
  ) then
    create type public.notification_lifecycle_status as enum (
      'active',
      'cancelled',
      'invalidated'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'notification_delivery_status'
  ) then
    create type public.notification_delivery_status as enum (
      'pending',
      'processing',
      'delivered',
      'failed',
      'suppressed',
      'cancelled',
      'invalidated',
      'expired'
    );
  end if;
end
$$;

create or replace function public.mhidas_notification_channels_are_valid(
  p_channels public.notification_delivery_channel[]
)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $function$
  select
    p_channels is not null
    and cardinality(p_channels) between 1 and 4
    and not exists (
      select 1
      from unnest(p_channels) as channel_value
      where channel_value is null
    )
    and cardinality(p_channels) = (
      select count(distinct channel_value)
      from unnest(p_channels) as channel_value
    );
$function$;

create or replace function public.mhidas_notification_set_updated_at()
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

create table if not exists public.notification_type_registry (
  notification_type text primary key,
  domain text not null,
  source_type text not null,
  default_priority public.notification_priority not null,
  default_channels public.notification_delivery_channel[] not null,
  grouping_policy public.notification_grouping_policy not null default 'none',
  preference_category text not null,
  privacy_level public.notification_privacy_level not null default 'standard',
  push_requires_explicit_consent boolean not null default true,
  quiet_hours_bypass boolean not null default false,
  default_expires_after_seconds integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_type_registry_notification_type_check
    check (
      notification_type = lower(btrim(notification_type))
      and notification_type ~ '^[a-z][a-z0-9_.]{2,79}$'
    ),

  constraint notification_type_registry_domain_check
    check (
      char_length(btrim(domain)) between 2 and 80
      and domain !~ '[[:cntrl:]]'
    ),

  constraint notification_type_registry_source_type_check
    check (
      source_type = lower(btrim(source_type))
      and source_type ~ '^[a-z][a-z0-9_]{1,49}$'
    ),

  constraint notification_type_registry_channels_check
    check (
      public.mhidas_notification_channels_are_valid(default_channels)
    ),

  constraint notification_type_registry_preference_category_check
    check (
      preference_category = lower(btrim(preference_category))
      and char_length(preference_category) between 2 and 80
      and preference_category ~ '^[a-z][a-z0-9_.-]{1,79}$'
    ),

  constraint notification_type_registry_expiration_check
    check (
      default_expires_after_seconds is null
      or default_expires_after_seconds between 60 and 31536000
    ),

  constraint notification_type_registry_quiet_hours_check
    check (
      quiet_hours_bypass = false
      or default_priority = 'critical'
    ),

  constraint notification_type_registry_updated_at_check
    check (updated_at >= created_at)
);

create index if not exists notification_type_registry_domain_idx
  on public.notification_type_registry (
    domain,
    is_active,
    notification_type
  );

create index if not exists notification_type_registry_source_idx
  on public.notification_type_registry (
    source_type,
    notification_type
  );

create table if not exists public.notification_events (
  event_id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  notification_type text not null
    references public.notification_type_registry(notification_type)
    on update cascade
    on delete restrict,
  source_type text not null,
  source_id uuid not null,
  actor_kind public.notification_actor_kind not null default 'user',
  actor_user_id uuid
    references auth.users(id)
    on delete set null,
  event_group_id uuid
    references public.event_groups(group_id)
    on delete set null,
  priority public.notification_priority not null,
  title text not null,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  internal_url text not null,
  status public.notification_lifecycle_status not null default 'active',
  cancelled_at timestamptz,
  invalidated_at timestamptz,
  status_reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_events_event_key_check
    check (
      event_key = lower(btrim(event_key))
      and char_length(event_key) between 8 and 200
      and event_key ~ '^[a-z0-9][a-z0-9:_./-]{7,199}$'
    ),

  constraint notification_events_source_type_check
    check (
      source_type = lower(btrim(source_type))
      and source_type ~ '^[a-z][a-z0-9_]{1,49}$'
    ),

  constraint notification_events_actor_kind_check
    check (
      actor_kind = 'user'
      or actor_user_id is null
    ),

  constraint notification_events_title_check
    check (
      char_length(btrim(title)) between 3 and 120
      and title !~ '[[:cntrl:]]'
    ),

  constraint notification_events_summary_check
    check (
      summary is null
      or (
        char_length(summary) <= 280
        and summary !~ '[[:cntrl:]]'
      )
    ),

  constraint notification_events_payload_check
    check (
      public.mhidas_social_notification_payload_is_safe(payload)
    ),

  constraint notification_events_internal_url_check
    check (
      char_length(internal_url) between 2 and 500
      and internal_url ~ '^/[A-Za-z0-9/_?&=.%#:@+~-]*$'
      and internal_url !~ '^//'
      and internal_url !~ '[[:cntrl:]]'
      and position(E'\\' in internal_url) = 0
    ),

  constraint notification_events_status_timestamps_check
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

  constraint notification_events_status_reason_check
    check (
      status_reason is null
      or char_length(status_reason) <= 160
    ),

  constraint notification_events_expiration_check
    check (
      expires_at is null
      or expires_at > created_at
    ),

  constraint notification_events_updated_at_check
    check (updated_at >= created_at)
);

create index if not exists notification_events_source_idx
  on public.notification_events (
    source_type,
    source_id,
    notification_type,
    created_at desc
  );

create index if not exists notification_events_type_idx
  on public.notification_events (
    notification_type,
    status,
    created_at desc
  );

create index if not exists notification_events_actor_idx
  on public.notification_events (
    actor_user_id,
    created_at desc
  )
  where actor_user_id is not null;

create index if not exists notification_events_event_group_idx
  on public.notification_events (
    event_group_id,
    created_at desc
  )
  where event_group_id is not null;

create index if not exists notification_events_expiration_idx
  on public.notification_events (expires_at)
  where expires_at is not null;

create table if not exists public.notification_recipients (
  recipient_id uuid primary key default gen_random_uuid(),
  event_id uuid not null
    references public.notification_events(event_id)
    on delete cascade,
  recipient_user_id uuid not null
    references auth.users(id)
    on delete cascade,
  social_notification_id uuid unique
    references public.social_notifications(notification_id)
    on delete set null,
  status public.notification_lifecycle_status not null default 'active',
  read_at timestamptz,
  status_reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_recipients_event_user_unique
    unique (event_id, recipient_user_id),

  constraint notification_recipients_status_reason_check
    check (
      status_reason is null
      or char_length(status_reason) <= 160
    ),

  constraint notification_recipients_read_at_check
    check (
      read_at is null
      or read_at >= created_at
    ),

  constraint notification_recipients_expiration_check
    check (
      expires_at is null
      or expires_at > created_at
    ),

  constraint notification_recipients_updated_at_check
    check (updated_at >= created_at)
);

create index if not exists notification_recipients_user_feed_idx
  on public.notification_recipients (
    recipient_user_id,
    status,
    created_at desc,
    recipient_id
  );

create index if not exists notification_recipients_event_idx
  on public.notification_recipients (
    event_id,
    status,
    created_at
  );

create index if not exists notification_recipients_unread_idx
  on public.notification_recipients (
    recipient_user_id,
    created_at desc,
    recipient_id
  )
  where status = 'active'
    and read_at is null;

create table if not exists public.notification_deliveries (
  delivery_id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null
    references public.notification_recipients(recipient_id)
    on delete cascade,
  channel public.notification_delivery_channel not null,
  target_key text not null default 'account',
  status public.notification_delivery_status not null default 'pending',
  idempotency_key text not null unique,
  available_at timestamptz not null default now(),
  delivered_at timestamptz,
  last_attempt_at timestamptz,
  attempt_count integer not null default 0,
  last_error_code text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_deliveries_recipient_channel_target_unique
    unique (recipient_id, channel, target_key),

  constraint notification_deliveries_target_key_check
    check (
      target_key = lower(btrim(target_key))
      and char_length(target_key) between 3 and 120
      and target_key ~ '^[a-z0-9][a-z0-9:_./-]{2,119}$'
    ),

  constraint notification_deliveries_idempotency_key_check
    check (
      idempotency_key = lower(btrim(idempotency_key))
      and char_length(idempotency_key) between 8 and 320
      and idempotency_key ~ '^[a-z0-9][a-z0-9:_./-]{7,319}$'
    ),

  constraint notification_deliveries_status_timestamps_check
    check (
      (
        status = 'delivered'
        and delivered_at is not null
      )
      or
      (
        status <> 'delivered'
        and delivered_at is null
      )
    ),

  constraint notification_deliveries_attempt_count_check
    check (attempt_count between 0 and 1000),

  constraint notification_deliveries_last_error_code_check
    check (
      last_error_code is null
      or (
        char_length(last_error_code) between 2 and 120
        and last_error_code = lower(btrim(last_error_code))
        and last_error_code ~ '^[a-z0-9][a-z0-9_.:-]{1,119}$'
      )
    ),

  constraint notification_deliveries_time_order_check
    check (
      available_at >= created_at
      and (
        delivered_at is null
        or delivered_at >= created_at
      )
      and (
        last_attempt_at is null
        or last_attempt_at >= created_at
      )
      and (
        expires_at is null
        or expires_at > created_at
      )
      and updated_at >= created_at
    )
);

create index if not exists notification_deliveries_queue_idx
  on public.notification_deliveries (
    status,
    available_at,
    created_at
  )
  where status in ('pending', 'failed');

create index if not exists notification_deliveries_recipient_idx
  on public.notification_deliveries (
    recipient_id,
    channel,
    status
  );

create index if not exists notification_deliveries_expiration_idx
  on public.notification_deliveries (expires_at)
  where expires_at is not null;

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
  ('tribe_join_request.created', 'tribes', 'tribe_join_request', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'tribes.requests', 'standard', true, false, null),
  ('tribe_join_request.cancelled', 'tribes', 'tribe_join_request', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'tribes.requests', 'standard', true, false, null),
  ('tribe_join_request.approved', 'tribes', 'tribe_join_request', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'tribes.requests', 'standard', true, false, null),
  ('tribe_join_request.rejected', 'tribes', 'tribe_join_request', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'tribes.requests', 'sensitive', true, false, null),
  ('tribe_membership.left', 'tribes', 'tribe_membership', 'social', array['in_app','badge']::public.notification_delivery_channel[], 'window', 'tribes.activity', 'standard', true, false, null),
  ('tribe_membership.removed', 'tribes', 'tribe_membership', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'tribes.administration', 'sensitive', true, false, null),
  ('tribe_membership.blocked', 'tribes', 'tribe_membership', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'tribes.administration', 'critical', true, false, null),
  ('tribe_membership.role_changed', 'tribes', 'tribe_membership', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'tribes.administration', 'standard', true, false, null),
  ('tribe.reopened', 'tribes', 'tribe', 'social', array['in_app','badge']::public.notification_delivery_channel[], 'window', 'tribes.activity', 'standard', true, false, null),
  ('tribe.closed', 'tribes', 'tribe', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'tribes.activity', 'standard', true, false, null),
  ('tribe.cancelled', 'tribes', 'tribe', 'critical', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'tribes.critical', 'critical', true, true, null),
  ('tribe.archived', 'tribes', 'tribe', 'social', array['in_app','badge']::public.notification_delivery_channel[], 'window', 'tribes.activity', 'standard', true, false, null),

  ('ride_join_request.created', 'rides', 'ride_join_request', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'rides.requests', 'standard', true, false, null),
  ('ride_join_request.cancelled', 'rides', 'ride_join_request', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'rides.requests', 'standard', true, false, null),
  ('ride_join_request.approved', 'rides', 'ride_join_request', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'rides.requests', 'standard', true, false, null),
  ('ride_join_request.rejected', 'rides', 'ride_join_request', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'rides.requests', 'sensitive', true, false, null),
  ('ride_membership.left', 'rides', 'ride_membership', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'rides.operation', 'standard', true, false, null),
  ('ride.closed', 'rides', 'ride', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'rides.operation', 'standard', true, false, null),
  ('ride.cancelled', 'rides', 'ride', 'critical', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'rides.critical', 'critical', true, true, null),

  ('meetup_join_request.created', 'meetups', 'meetup_join_request', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'meetups.requests', 'standard', true, false, null),
  ('meetup_join_request.cancelled', 'meetups', 'meetup_join_request', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'meetups.requests', 'standard', true, false, null),
  ('meetup_join_request.approved', 'meetups', 'meetup_join_request', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'meetups.requests', 'standard', true, false, null),
  ('meetup_join_request.rejected', 'meetups', 'meetup_join_request', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'meetups.requests', 'sensitive', true, false, null),
  ('meetup_membership.left', 'meetups', 'meetup_membership', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'meetups.operation', 'standard', true, false, null),
  ('meetup.closed', 'meetups', 'meetup', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'meetups.operation', 'standard', true, false, null),
  ('meetup.cancelled', 'meetups', 'meetup', 'critical', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'meetups.critical', 'critical', true, true, null),

  ('professional_follow.created', 'professional_profile', 'professional_follow', 'social', array['in_app','badge']::public.notification_delivery_channel[], 'window', 'professional.followers', 'standard', true, false, null),
  ('professional_connection.requested', 'professional_networking', 'professional_connection', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'professional.connections', 'standard', true, false, null),
  ('professional_connection.accepted', 'professional_networking', 'professional_connection', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'professional.connections', 'standard', true, false, null),
  ('professional_connection.declined', 'professional_networking', 'professional_connection', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'professional.connections', 'sensitive', true, false, null),
  ('professional_connection.cancelled', 'professional_networking', 'professional_connection', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'professional.connections', 'sensitive', true, false, null),
  ('professional_connection.ended', 'professional_networking', 'professional_connection', 'transactional', array['in_app','badge']::public.notification_delivery_channel[], 'none', 'professional.connections', 'sensitive', true, false, null)
on conflict (notification_type) do nothing;

drop trigger if exists trg_notification_type_registry_updated_at
  on public.notification_type_registry;

create trigger trg_notification_type_registry_updated_at
before update on public.notification_type_registry
for each row
execute function public.mhidas_notification_set_updated_at();

drop trigger if exists trg_notification_events_updated_at
  on public.notification_events;

create trigger trg_notification_events_updated_at
before update on public.notification_events
for each row
execute function public.mhidas_notification_set_updated_at();

drop trigger if exists trg_notification_recipients_updated_at
  on public.notification_recipients;

create trigger trg_notification_recipients_updated_at
before update on public.notification_recipients
for each row
execute function public.mhidas_notification_set_updated_at();

drop trigger if exists trg_notification_deliveries_updated_at
  on public.notification_deliveries;

create trigger trg_notification_deliveries_updated_at
before update on public.notification_deliveries
for each row
execute function public.mhidas_notification_set_updated_at();

do $$
begin
  if exists (
    select 1
    from public.social_notifications sn
    group by sn.idempotency_key
    having count(distinct (
      sn.source_type,
      sn.source_id,
      sn.notification_type,
      sn.actor_user_id,
      sn.event_group_id,
      sn.title,
      sn.summary,
      sn.payload,
      sn.internal_url,
      sn.expires_at
    )) > 1
  ) then
    raise exception 'V4_8_154_LEGACY_EVENT_KEY_COLLISION';
  end if;

  if exists (
    select 1
    from public.social_notifications sn
    left join public.notification_type_registry ntr
      on ntr.notification_type = sn.notification_type
    where ntr.notification_type is null
      or ntr.is_active = false
      or ntr.source_type <> sn.source_type
  ) then
    raise exception 'V4_8_154_LEGACY_NOTIFICATION_TYPE_UNREGISTERED';
  end if;
end
$$;

insert into public.notification_events (
  event_key,
  notification_type,
  source_type,
  source_id,
  actor_kind,
  actor_user_id,
  event_group_id,
  priority,
  title,
  summary,
  payload,
  internal_url,
  status,
  cancelled_at,
  invalidated_at,
  status_reason,
  expires_at,
  created_at,
  updated_at
)
select
  sn.idempotency_key,
  sn.notification_type,
  sn.source_type,
  sn.source_id,
  case
    when sn.actor_user_id is null then 'legacy'::public.notification_actor_kind
    else 'user'::public.notification_actor_kind
  end,
  sn.actor_user_id,
  sn.event_group_id,
  ntr.default_priority,
  sn.title,
  sn.summary,
  sn.payload,
  sn.internal_url,
  case
    when bool_or(sn.status = 'active') then 'active'::public.notification_lifecycle_status
    when bool_and(sn.status = 'cancelled') then 'cancelled'::public.notification_lifecycle_status
    else 'invalidated'::public.notification_lifecycle_status
  end,
  case
    when not bool_or(sn.status = 'active')
      and bool_and(sn.status = 'cancelled')
    then min(sn.cancelled_at)
    else null
  end,
  case
    when not bool_or(sn.status = 'active')
      and not bool_and(sn.status = 'cancelled')
    then min(sn.invalidated_at)
    else null
  end,
  case
    when count(distinct sn.status_reason) = 1 then min(sn.status_reason)
    else null
  end,
  sn.expires_at,
  min(sn.created_at),
  max(sn.updated_at)
from public.social_notifications sn
join public.notification_type_registry ntr
  on ntr.notification_type = sn.notification_type
where not exists (
  select 1
  from public.notification_events ne
  where ne.event_key = sn.idempotency_key
)
group by
  sn.idempotency_key,
  sn.notification_type,
  sn.source_type,
  sn.source_id,
  sn.actor_user_id,
  sn.event_group_id,
  ntr.default_priority,
  sn.title,
  sn.summary,
  sn.payload,
  sn.internal_url,
  sn.expires_at;

insert into public.notification_recipients (
  event_id,
  recipient_user_id,
  social_notification_id,
  status,
  read_at,
  status_reason,
  expires_at,
  created_at,
  updated_at
)
select
  ne.event_id,
  sn.recipient_user_id,
  sn.notification_id,
  sn.status::text::public.notification_lifecycle_status,
  sn.read_at,
  sn.status_reason,
  sn.expires_at,
  sn.created_at,
  sn.updated_at
from public.social_notifications sn
join public.notification_events ne
  on ne.event_key = sn.idempotency_key
on conflict (event_id, recipient_user_id) do update
set
  social_notification_id = excluded.social_notification_id,
  status = excluded.status,
  read_at = excluded.read_at,
  status_reason = excluded.status_reason,
  expires_at = excluded.expires_at,
  updated_at = excluded.updated_at;

insert into public.notification_deliveries (
  recipient_id,
  channel,
  target_key,
  status,
  idempotency_key,
  available_at,
  delivered_at,
  last_attempt_at,
  attempt_count,
  expires_at,
  created_at,
  updated_at
)
select
  nr.recipient_id,
  channel_value,
  'account',
  case
    when sn.expires_at is not null
      and sn.expires_at <= now()
    then 'expired'::public.notification_delivery_status
    when sn.status = 'cancelled'
    then 'cancelled'::public.notification_delivery_status
    when sn.status = 'invalidated'
    then 'invalidated'::public.notification_delivery_status
    else 'delivered'::public.notification_delivery_status
  end,
  sn.idempotency_key || ':' || sn.recipient_user_id::text || ':' || channel_value::text,
  sn.created_at,
  case
    when sn.status = 'active'
      and (
        sn.expires_at is null
        or sn.expires_at > now()
      )
    then sn.created_at
    else null
  end,
  case
    when sn.status = 'active'
      and (
        sn.expires_at is null
        or sn.expires_at > now()
      )
    then sn.created_at
    else null
  end,
  case
    when sn.status = 'active'
      and (
        sn.expires_at is null
        or sn.expires_at > now()
      )
    then 1
    else 0
  end,
  sn.expires_at,
  sn.created_at,
  sn.updated_at
from public.social_notifications sn
join public.notification_events ne
  on ne.event_key = sn.idempotency_key
join public.notification_recipients nr
  on nr.event_id = ne.event_id
 and nr.recipient_user_id = sn.recipient_user_id
join public.notification_type_registry ntr
  on ntr.notification_type = sn.notification_type
cross join lateral unnest(ntr.default_channels) as channel_value
on conflict (recipient_id, channel, target_key) do update
set
  status = excluded.status,
  delivered_at = excluded.delivered_at,
  last_attempt_at = excluded.last_attempt_at,
  attempt_count = greatest(
    public.notification_deliveries.attempt_count,
    excluded.attempt_count
  ),
  expires_at = excluded.expires_at,
  updated_at = excluded.updated_at;

create or replace function public.mhidas_sync_social_notification_to_unified()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_registry public.notification_type_registry%rowtype;
  v_event_id uuid;
  v_recipient_id uuid;
  v_actor_kind public.notification_actor_kind;
  v_delivery_status public.notification_delivery_status;
  v_channel public.notification_delivery_channel;
  v_existing_source_type text;
  v_existing_source_id uuid;
  v_existing_notification_type text;
  v_existing_actor_user_id uuid;
  v_existing_event_group_id uuid;
  v_existing_title text;
  v_existing_summary text;
  v_existing_payload jsonb;
  v_existing_internal_url text;
  v_existing_expires_at timestamptz;
  v_recomputed_status public.notification_lifecycle_status;
  v_recomputed_reason text;
  v_recomputed_cancelled_at timestamptz;
  v_recomputed_invalidated_at timestamptz;
begin
  if tg_op = 'DELETE' then
    select ne.event_id
    into v_event_id
    from public.notification_events ne
    where ne.event_key = old.idempotency_key;

    if v_event_id is not null then
      delete from public.notification_recipients nr
      where nr.event_id = v_event_id
        and nr.recipient_user_id = old.recipient_user_id;

      delete from public.notification_events ne
      where ne.event_id = v_event_id
        and not exists (
          select 1
          from public.notification_recipients nr
          where nr.event_id = v_event_id
        );
    end if;

    return old;
  end if;

  if tg_op = 'UPDATE'
    and old.actor_user_id is not null
    and new.actor_user_id is null
  then
    update public.notification_events ne
    set actor_user_id = null
    where ne.event_key = new.idempotency_key;
  end if;

  if tg_op = 'UPDATE'
    and old.event_group_id is not null
    and new.event_group_id is null
  then
    update public.notification_events ne
    set event_group_id = null
    where ne.event_key = new.idempotency_key;
  end if;

  if tg_op = 'UPDATE'
    and (
      old.notification_id <> new.notification_id
      or old.recipient_user_id <> new.recipient_user_id
      or old.idempotency_key <> new.idempotency_key
      or old.source_type <> new.source_type
      or old.source_id <> new.source_id
      or old.notification_type <> new.notification_type
      or (
        old.actor_user_id is distinct from new.actor_user_id
        and not (
          old.actor_user_id is not null
          and new.actor_user_id is null
        )
      )
      or (
        old.event_group_id is distinct from new.event_group_id
        and not (
          old.event_group_id is not null
          and new.event_group_id is null
        )
      )
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'unified_notification_identity_immutable';
  end if;

  select ntr.*
  into v_registry
  from public.notification_type_registry ntr
  where ntr.notification_type = new.notification_type
    and ntr.is_active = true;

  if v_registry.notification_type is null then
    raise exception using
      errcode = 'P0001',
      message = 'notification_type_not_registered';
  end if;

  if v_registry.source_type <> new.source_type then
    raise exception using
      errcode = 'P0001',
      message = 'notification_source_type_registry_mismatch';
  end if;

  v_actor_kind := case
    when new.actor_user_id is null
    then 'legacy'::public.notification_actor_kind
    else 'user'::public.notification_actor_kind
  end;

  insert into public.notification_events (
    event_key,
    notification_type,
    source_type,
    source_id,
    actor_kind,
    actor_user_id,
    event_group_id,
    priority,
    title,
    summary,
    payload,
    internal_url,
    status,
    cancelled_at,
    invalidated_at,
    status_reason,
    expires_at,
    created_at,
    updated_at
  )
  values (
    new.idempotency_key,
    new.notification_type,
    new.source_type,
    new.source_id,
    v_actor_kind,
    new.actor_user_id,
    new.event_group_id,
    v_registry.default_priority,
    new.title,
    new.summary,
    new.payload,
    new.internal_url,
    new.status::text::public.notification_lifecycle_status,
    new.cancelled_at,
    new.invalidated_at,
    new.status_reason,
    new.expires_at,
    new.created_at,
    new.updated_at
  )
  on conflict (event_key) do nothing
  returning event_id
  into v_event_id;

  if v_event_id is null then
    select
      ne.event_id,
      ne.source_type,
      ne.source_id,
      ne.notification_type,
      ne.actor_user_id,
      ne.event_group_id,
      ne.title,
      ne.summary,
      ne.payload,
      ne.internal_url,
      ne.expires_at
    into
      v_event_id,
      v_existing_source_type,
      v_existing_source_id,
      v_existing_notification_type,
      v_existing_actor_user_id,
      v_existing_event_group_id,
      v_existing_title,
      v_existing_summary,
      v_existing_payload,
      v_existing_internal_url,
      v_existing_expires_at
    from public.notification_events ne
    where ne.event_key = new.idempotency_key;

    if v_event_id is null then
      raise exception 'V4_8_154_EVENT_IDEMPOTENCY_LOOKUP_FAILED';
    end if;

    if v_existing_source_type <> new.source_type
      or v_existing_source_id <> new.source_id
      or v_existing_notification_type <> new.notification_type
      or v_existing_actor_user_id is distinct from new.actor_user_id
      or v_existing_event_group_id is distinct from new.event_group_id
      or v_existing_title <> new.title
      or v_existing_summary is distinct from new.summary
      or v_existing_payload <> new.payload
      or v_existing_internal_url <> new.internal_url
      or v_existing_expires_at is distinct from new.expires_at
    then
      raise exception using
        errcode = 'P0001',
        message = 'notification_event_key_collision';
    end if;
  end if;

  insert into public.notification_recipients (
    event_id,
    recipient_user_id,
    social_notification_id,
    status,
    read_at,
    status_reason,
    expires_at,
    created_at,
    updated_at
  )
  values (
    v_event_id,
    new.recipient_user_id,
    new.notification_id,
    new.status::text::public.notification_lifecycle_status,
    new.read_at,
    new.status_reason,
    new.expires_at,
    new.created_at,
    new.updated_at
  )
  on conflict (event_id, recipient_user_id) do update
  set
    social_notification_id = excluded.social_notification_id,
    status = excluded.status,
    read_at = excluded.read_at,
    status_reason = excluded.status_reason,
    expires_at = excluded.expires_at,
    updated_at = excluded.updated_at
  returning recipient_id
  into v_recipient_id;

  v_delivery_status := case
    when new.expires_at is not null
      and new.expires_at <= now()
    then 'expired'::public.notification_delivery_status
    when new.status = 'cancelled'
    then 'cancelled'::public.notification_delivery_status
    when new.status = 'invalidated'
    then 'invalidated'::public.notification_delivery_status
    else 'delivered'::public.notification_delivery_status
  end;

  foreach v_channel in array v_registry.default_channels
  loop
    insert into public.notification_deliveries (
      recipient_id,
      channel,
      target_key,
      status,
      idempotency_key,
      available_at,
      delivered_at,
      last_attempt_at,
      attempt_count,
      expires_at,
      created_at,
      updated_at
    )
    values (
      v_recipient_id,
      v_channel,
      'account',
      v_delivery_status,
      new.idempotency_key || ':' || new.recipient_user_id::text || ':' || v_channel::text,
      new.created_at,
      case
        when v_delivery_status = 'delivered'
        then new.created_at
        else null
      end,
      case
        when v_delivery_status = 'delivered'
        then new.created_at
        else null
      end,
      case
        when v_delivery_status = 'delivered'
        then 1
        else 0
      end,
      new.expires_at,
      new.created_at,
      new.updated_at
    )
    on conflict (recipient_id, channel, target_key) do update
    set
      status = excluded.status,
      delivered_at = excluded.delivered_at,
      last_attempt_at = excluded.last_attempt_at,
      attempt_count = greatest(
        public.notification_deliveries.attempt_count,
        excluded.attempt_count
      ),
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at;
  end loop;

  select
    case
      when bool_or(nr.status = 'active')
      then 'active'::public.notification_lifecycle_status
      when bool_and(nr.status = 'cancelled')
      then 'cancelled'::public.notification_lifecycle_status
      else 'invalidated'::public.notification_lifecycle_status
    end,
    case
      when count(distinct nr.status_reason) = 1
      then min(nr.status_reason)
      else null
    end,
    case
      when not bool_or(nr.status = 'active')
        and bool_and(nr.status = 'cancelled')
      then min(nr.updated_at)
      else null
    end,
    case
      when not bool_or(nr.status = 'active')
        and not bool_and(nr.status = 'cancelled')
      then min(nr.updated_at)
      else null
    end
  into
    v_recomputed_status,
    v_recomputed_reason,
    v_recomputed_cancelled_at,
    v_recomputed_invalidated_at
  from public.notification_recipients nr
  where nr.event_id = v_event_id;

  update public.notification_events ne
  set
    status = v_recomputed_status,
    cancelled_at = case
      when v_recomputed_status = 'cancelled'
      then coalesce(ne.cancelled_at, v_recomputed_cancelled_at, now())
      else null
    end,
    invalidated_at = case
      when v_recomputed_status = 'invalidated'
      then coalesce(ne.invalidated_at, v_recomputed_invalidated_at, now())
      else null
    end,
    status_reason = v_recomputed_reason
  where ne.event_id = v_event_id;

  return new;
end;
$function$;

drop trigger if exists trg_social_notifications_unified_sync
  on public.social_notifications;

create trigger trg_social_notifications_unified_sync
after insert or update or delete on public.social_notifications
for each row
execute function public.mhidas_sync_social_notification_to_unified();

alter table public.notification_type_registry
  enable row level security;

alter table public.notification_events
  enable row level security;

alter table public.notification_recipients
  enable row level security;

alter table public.notification_deliveries
  enable row level security;

revoke all on table public.notification_type_registry
  from public, anon, authenticated;

revoke all on table public.notification_events
  from public, anon, authenticated;

revoke all on table public.notification_recipients
  from public, anon, authenticated;

revoke all on table public.notification_deliveries
  from public, anon, authenticated;

grant all on table public.notification_type_registry
  to service_role;

grant all on table public.notification_events
  to service_role;

grant all on table public.notification_recipients
  to service_role;

grant all on table public.notification_deliveries
  to service_role;

revoke all on type public.notification_priority
  from public, anon, authenticated;

revoke all on type public.notification_delivery_channel
  from public, anon, authenticated;

revoke all on type public.notification_grouping_policy
  from public, anon, authenticated;

revoke all on type public.notification_privacy_level
  from public, anon, authenticated;

revoke all on type public.notification_actor_kind
  from public, anon, authenticated;

revoke all on type public.notification_lifecycle_status
  from public, anon, authenticated;

revoke all on type public.notification_delivery_status
  from public, anon, authenticated;

grant usage on type public.notification_priority
  to service_role;

grant usage on type public.notification_delivery_channel
  to service_role;

grant usage on type public.notification_grouping_policy
  to service_role;

grant usage on type public.notification_privacy_level
  to service_role;

grant usage on type public.notification_actor_kind
  to service_role;

grant usage on type public.notification_lifecycle_status
  to service_role;

grant usage on type public.notification_delivery_status
  to service_role;

revoke all on function public.mhidas_notification_channels_are_valid(
  public.notification_delivery_channel[]
) from public, anon, authenticated;

grant execute on function public.mhidas_notification_channels_are_valid(
  public.notification_delivery_channel[]
) to service_role;

revoke all on function public.mhidas_notification_set_updated_at()
  from public, anon, authenticated, service_role;

revoke all on function public.mhidas_sync_social_notification_to_unified()
  from public, anon, authenticated, service_role;

comment on table public.notification_type_registry is
  'Governed platform-wide notification type registry. Every current or future notification must be registered before generation.';

comment on table public.notification_events is
  'Unique domain events behind notifications. One event may have multiple recipients and multiple delivery channels.';

comment on table public.notification_recipients is
  'Per-user recipients linked to the historical in-app record in public.social_notifications.';

comment on table public.notification_deliveries is
  'Per-channel delivery ledger. V4.8.154 records in_app and badge only; push execution is intentionally absent.';

comment on column public.notification_events.event_key is
  'Stable business-event idempotency key shared by all recipients of the same event.';

comment on column public.notification_recipients.social_notification_id is
  'Compatibility link to the current central notification record and read state.';

comment on column public.notification_deliveries.target_key is
  'Delivery target namespace. V4.8.154 uses account; future push delivery may use a governed subscription identifier.';

comment on function public.mhidas_sync_social_notification_to_unified() is
  'Internal compatibility mirror. Existing generators continue writing social_notifications while the unified foundation is populated transactionally.';

do $$
declare
  v_missing_types integer;
  v_missing_tables integer;
  v_missing_functions integer;
  v_missing_constraints integer;
  v_missing_indexes integer;
  v_missing_triggers integer;
  v_missing_registry_rows integer;
  v_registry_mismatch integer;
  v_rls_missing integer;
  v_policy_count integer;
  v_unauthorized_privilege boolean;
  v_function_exposed integer;
  v_social_count bigint;
  v_recipient_count bigint;
  v_expected_delivery_count bigint;
  v_delivery_count bigint;
  v_distinct_event_count bigint;
  v_event_count bigint;
begin
  select count(*)
  into v_missing_types
  from (
    values
      ('notification_priority'),
      ('notification_delivery_channel'),
      ('notification_grouping_policy'),
      ('notification_privacy_level'),
      ('notification_actor_kind'),
      ('notification_lifecycle_status'),
      ('notification_delivery_status')
  ) as expected(type_name)
  where not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = expected.type_name
  );

  if v_missing_types <> 0 then
    raise exception 'V4_8_154_REQUIRED_TYPE_MISSING';
  end if;

  select count(*)
  into v_missing_tables
  from (
    values
      ('public.notification_type_registry'),
      ('public.notification_events'),
      ('public.notification_recipients'),
      ('public.notification_deliveries')
  ) as expected(relation_name)
  where to_regclass(expected.relation_name) is null;

  if v_missing_tables <> 0 then
    raise exception 'V4_8_154_REQUIRED_TABLE_MISSING';
  end if;

  select count(*)
  into v_missing_functions
  from (
    values
      ('public.mhidas_notification_channels_are_valid(public.notification_delivery_channel[])'),
      ('public.mhidas_notification_set_updated_at()'),
      ('public.mhidas_sync_social_notification_to_unified()')
  ) as expected(signature)
  where to_regprocedure(expected.signature) is null;

  if v_missing_functions <> 0 then
    raise exception 'V4_8_154_REQUIRED_FUNCTION_MISSING';
  end if;

  select count(*)
  into v_missing_constraints
  from (
    values
      ('public.notification_type_registry', 'notification_type_registry_notification_type_check'),
      ('public.notification_type_registry', 'notification_type_registry_domain_check'),
      ('public.notification_type_registry', 'notification_type_registry_source_type_check'),
      ('public.notification_type_registry', 'notification_type_registry_channels_check'),
      ('public.notification_type_registry', 'notification_type_registry_preference_category_check'),
      ('public.notification_type_registry', 'notification_type_registry_expiration_check'),
      ('public.notification_type_registry', 'notification_type_registry_quiet_hours_check'),
      ('public.notification_events', 'notification_events_event_key_key'),
      ('public.notification_events', 'notification_events_event_key_check'),
      ('public.notification_events', 'notification_events_source_type_check'),
      ('public.notification_events', 'notification_events_actor_kind_check'),
      ('public.notification_events', 'notification_events_payload_check'),
      ('public.notification_events', 'notification_events_internal_url_check'),
      ('public.notification_events', 'notification_events_status_timestamps_check'),
      ('public.notification_recipients', 'notification_recipients_event_user_unique'),
      ('public.notification_recipients', 'notification_recipients_social_notification_id_key'),
      ('public.notification_recipients', 'notification_recipients_read_at_check'),
      ('public.notification_deliveries', 'notification_deliveries_recipient_channel_target_unique'),
      ('public.notification_deliveries', 'notification_deliveries_idempotency_key_key'),
      ('public.notification_deliveries', 'notification_deliveries_status_timestamps_check'),
      ('public.notification_deliveries', 'notification_deliveries_time_order_check')
  ) as expected(relation_name, constraint_name)
  where not exists (
    select 1
    from pg_constraint c
    where c.conrelid = expected.relation_name::regclass
      and c.conname = expected.constraint_name
  );

  if v_missing_constraints <> 0 then
    raise exception 'V4_8_154_REQUIRED_CONSTRAINT_MISSING';
  end if;

  select count(*)
  into v_missing_indexes
  from (
    values
      ('notification_type_registry_domain_idx'),
      ('notification_type_registry_source_idx'),
      ('notification_events_source_idx'),
      ('notification_events_type_idx'),
      ('notification_events_actor_idx'),
      ('notification_events_event_group_idx'),
      ('notification_events_expiration_idx'),
      ('notification_recipients_user_feed_idx'),
      ('notification_recipients_event_idx'),
      ('notification_recipients_unread_idx'),
      ('notification_deliveries_queue_idx'),
      ('notification_deliveries_recipient_idx'),
      ('notification_deliveries_expiration_idx')
  ) as expected(index_name)
  where to_regclass('public.' || expected.index_name) is null;

  if v_missing_indexes <> 0 then
    raise exception 'V4_8_154_REQUIRED_INDEX_MISSING';
  end if;

  select count(*)
  into v_missing_triggers
  from (
    values
      ('public.notification_type_registry', 'trg_notification_type_registry_updated_at'),
      ('public.notification_events', 'trg_notification_events_updated_at'),
      ('public.notification_recipients', 'trg_notification_recipients_updated_at'),
      ('public.notification_deliveries', 'trg_notification_deliveries_updated_at'),
      ('public.social_notifications', 'trg_social_notifications_unified_sync')
  ) as expected(relation_name, trigger_name)
  where not exists (
    select 1
    from pg_trigger t
    where t.tgrelid = expected.relation_name::regclass
      and t.tgname = expected.trigger_name
      and not t.tgisinternal
  );

  if v_missing_triggers <> 0 then
    raise exception 'V4_8_154_REQUIRED_TRIGGER_MISSING';
  end if;

  select 32 - count(*)
  into v_missing_registry_rows
  from public.notification_type_registry ntr
  where ntr.notification_type in (
    'tribe_join_request.created',
    'tribe_join_request.cancelled',
    'tribe_join_request.approved',
    'tribe_join_request.rejected',
    'tribe_membership.left',
    'tribe_membership.removed',
    'tribe_membership.blocked',
    'tribe_membership.role_changed',
    'tribe.reopened',
    'tribe.closed',
    'tribe.cancelled',
    'tribe.archived',
    'ride_join_request.created',
    'ride_join_request.cancelled',
    'ride_join_request.approved',
    'ride_join_request.rejected',
    'ride_membership.left',
    'ride.closed',
    'ride.cancelled',
    'meetup_join_request.created',
    'meetup_join_request.cancelled',
    'meetup_join_request.approved',
    'meetup_join_request.rejected',
    'meetup_membership.left',
    'meetup.closed',
    'meetup.cancelled',
    'professional_follow.created',
    'professional_connection.requested',
    'professional_connection.accepted',
    'professional_connection.declined',
    'professional_connection.cancelled',
    'professional_connection.ended'
  );

  if v_missing_registry_rows <> 0 then
    raise exception 'V4_8_154_REGISTRY_SEED_INCOMPLETE';
  end if;

  select count(*)
  into v_registry_mismatch
  from public.notification_type_registry ntr
  where ntr.notification_type in (
    'tribe_join_request.created',
    'tribe_join_request.cancelled',
    'tribe_join_request.approved',
    'tribe_join_request.rejected',
    'tribe_membership.left',
    'tribe_membership.removed',
    'tribe_membership.blocked',
    'tribe_membership.role_changed',
    'tribe.reopened',
    'tribe.closed',
    'tribe.cancelled',
    'tribe.archived',
    'ride_join_request.created',
    'ride_join_request.cancelled',
    'ride_join_request.approved',
    'ride_join_request.rejected',
    'ride_membership.left',
    'ride.closed',
    'ride.cancelled',
    'meetup_join_request.created',
    'meetup_join_request.cancelled',
    'meetup_join_request.approved',
    'meetup_join_request.rejected',
    'meetup_membership.left',
    'meetup.closed',
    'meetup.cancelled',
    'professional_follow.created',
    'professional_connection.requested',
    'professional_connection.accepted',
    'professional_connection.declined',
    'professional_connection.cancelled',
    'professional_connection.ended'
  )
    and (
      ntr.is_active = false
      or ntr.default_channels <> array['in_app','badge']::public.notification_delivery_channel[]
      or ntr.push_requires_explicit_consent = false
    );

  if v_registry_mismatch <> 0 then
    raise exception 'V4_8_154_REGISTRY_SEED_INVALID';
  end if;

  select count(*)
  into v_rls_missing
  from (
    values
      ('notification_type_registry'),
      ('notification_events'),
      ('notification_recipients'),
      ('notification_deliveries')
  ) as expected(table_name)
  where not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = expected.table_name
      and c.relrowsecurity = true
  );

  if v_rls_missing <> 0 then
    raise exception 'V4_8_154_RLS_MISSING';
  end if;

  select count(*)
  into v_policy_count
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename in (
      'notification_type_registry',
      'notification_events',
      'notification_recipients',
      'notification_deliveries'
    );

  if v_policy_count <> 0 then
    raise exception 'V4_8_154_UNEXPECTED_POLICY_EXPOSURE';
  end if;

  select exists (
    select 1
    from (
      values
        ('anon'),
        ('authenticated')
    ) as role_name(role_name)
    cross join (
      values
        ('public.notification_type_registry'),
        ('public.notification_events'),
        ('public.notification_recipients'),
        ('public.notification_deliveries')
    ) as relation_name(relation_name)
    where has_table_privilege(
      role_name.role_name,
      relation_name.relation_name,
      'SELECT'
    )
    or has_table_privilege(
      role_name.role_name,
      relation_name.relation_name,
      'INSERT'
    )
    or has_table_privilege(
      role_name.role_name,
      relation_name.relation_name,
      'UPDATE'
    )
    or has_table_privilege(
      role_name.role_name,
      relation_name.relation_name,
      'DELETE'
    )
  )
  into v_unauthorized_privilege;

  if v_unauthorized_privilege then
    raise exception 'V4_8_154_TABLE_PRIVILEGE_EXPOSURE';
  end if;

  select count(*)
  into v_function_exposed
  from (
    values
      ('public.mhidas_notification_set_updated_at()'),
      ('public.mhidas_sync_social_notification_to_unified()')
  ) as expected(signature)
  cross join (
    values
      ('public'),
      ('anon'),
      ('authenticated'),
      ('service_role')
  ) as role_name(role_name)
  where has_function_privilege(
    role_name.role_name,
    expected.signature,
    'EXECUTE'
  );

  if v_function_exposed <> 0 then
    raise exception 'V4_8_154_INTERNAL_FUNCTION_EXPOSED';
  end if;

  select count(*)
  into v_social_count
  from public.social_notifications;

  select count(*)
  into v_recipient_count
  from public.notification_recipients nr
  where nr.social_notification_id is not null;

  if v_social_count <> v_recipient_count then
    raise exception 'V4_8_154_RECIPIENT_BACKFILL_MISMATCH';
  end if;

  select count(distinct sn.idempotency_key)
  into v_distinct_event_count
  from public.social_notifications sn;

  select count(*)
  into v_event_count
  from public.notification_events ne;

  if v_distinct_event_count <> v_event_count then
    raise exception 'V4_8_154_EVENT_BACKFILL_MISMATCH';
  end if;

  select coalesce(sum(cardinality(ntr.default_channels)), 0)
  into v_expected_delivery_count
  from public.social_notifications sn
  join public.notification_type_registry ntr
    on ntr.notification_type = sn.notification_type;

  select count(*)
  into v_delivery_count
  from public.notification_deliveries;

  if v_expected_delivery_count <> v_delivery_count then
    raise exception 'V4_8_154_DELIVERY_BACKFILL_MISMATCH';
  end if;

  if exists (
    select 1
    from public.notification_recipients nr
    join public.notification_events ne
      on ne.event_id = nr.event_id
    where ne.actor_kind = 'user'
      and ne.actor_user_id is not null
      and ne.actor_user_id = nr.recipient_user_id
  ) then
    raise exception 'V4_8_154_SELF_NOTIFICATION_FOUND';
  end if;

  if exists (
    select 1
    from public.notification_recipients nr
    left join public.social_notifications sn
      on sn.notification_id = nr.social_notification_id
    where nr.social_notification_id is not null
      and (
        sn.notification_id is null
        or sn.recipient_user_id <> nr.recipient_user_id
        or sn.status::text <> nr.status::text
        or sn.read_at is distinct from nr.read_at
        or sn.expires_at is distinct from nr.expires_at
      )
  ) then
    raise exception 'V4_8_154_COMPATIBILITY_LINK_INVALID';
  end if;

  if exists (
    select 1
    from public.notification_deliveries nd
    join public.notification_recipients nr
      on nr.recipient_id = nd.recipient_id
    join public.social_notifications sn
      on sn.notification_id = nr.social_notification_id
    where nd.channel not in ('in_app', 'badge')
      or nd.target_key <> 'account'
      or nd.idempotency_key <>
        sn.idempotency_key || ':' || sn.recipient_user_id::text || ':' || nd.channel::text
  ) then
    raise exception 'V4_8_154_DELIVERY_LEDGER_INVALID';
  end if;
end
$$;

commit;
