-- supabase/migrations/20260807132900_notification_push_dispatcher_attempts.sql
-- MHIDAS / USECLUBBERS V4.8.156
-- Controlled web-push dispatcher foundation.
-- R5 schema alignment: delivery_id, recipient_id, subscription_id and real V4.8.155 columns.
-- Safety: no scheduler, no seed data, no automatic delivery creation, no production assumptions.

begin;

do $$
declare
  v_missing text[] := array[]::text[];
begin
  if to_regclass('public.notification_deliveries') is null then
    v_missing := array_append(v_missing, 'table:notification_deliveries');
  end if;

  if to_regclass('public.notification_recipients') is null then
    v_missing := array_append(v_missing, 'table:notification_recipients');
  end if;

  if to_regclass('public.notification_push_subscriptions') is null then
    v_missing := array_append(v_missing, 'table:notification_push_subscriptions');
  end if;

  if to_regclass('public.notification_preferences') is null then
    v_missing := array_append(v_missing, 'table:notification_preferences');
  end if;

  if to_regclass('public.notification_type_registry') is null then
    v_missing := array_append(v_missing, 'table:notification_type_registry');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_deliveries' and column_name = 'delivery_id'
  ) then v_missing := array_append(v_missing, 'column:notification_deliveries.delivery_id'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_deliveries' and column_name = 'recipient_id'
  ) then v_missing := array_append(v_missing, 'column:notification_deliveries.recipient_id'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_deliveries' and column_name = 'channel'
  ) then v_missing := array_append(v_missing, 'column:notification_deliveries.channel'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_deliveries' and column_name = 'status'
  ) then v_missing := array_append(v_missing, 'column:notification_deliveries.status'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_recipients' and column_name = 'recipient_id'
  ) then v_missing := array_append(v_missing, 'column:notification_recipients.recipient_id'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_recipients' and column_name = 'recipient_user_id'
  ) then v_missing := array_append(v_missing, 'column:notification_recipients.recipient_user_id'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_recipients' and column_name = 'event_id'
  ) then v_missing := array_append(v_missing, 'column:notification_recipients.event_id'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_push_subscriptions' and column_name = 'subscription_id'
  ) then v_missing := array_append(v_missing, 'column:notification_push_subscriptions.subscription_id'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_push_subscriptions' and column_name = 'user_id'
  ) then v_missing := array_append(v_missing, 'column:notification_push_subscriptions.user_id'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_push_subscriptions' and column_name = 'endpoint'
  ) then v_missing := array_append(v_missing, 'column:notification_push_subscriptions.endpoint'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_push_subscriptions' and column_name = 'p256dh'
  ) then v_missing := array_append(v_missing, 'column:notification_push_subscriptions.p256dh'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_push_subscriptions' and column_name = 'auth_secret'
  ) then v_missing := array_append(v_missing, 'column:notification_push_subscriptions.auth_secret'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_push_subscriptions' and column_name = 'expiration_time_ms'
  ) then v_missing := array_append(v_missing, 'column:notification_push_subscriptions.expiration_time_ms'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_push_subscriptions' and column_name = 'status'
  ) then v_missing := array_append(v_missing, 'column:notification_push_subscriptions.status'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_push_subscriptions' and column_name = 'revoked_at'
  ) then v_missing := array_append(v_missing, 'column:notification_push_subscriptions.revoked_at'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_push_subscriptions' and column_name = 'invalidated_at'
  ) then v_missing := array_append(v_missing, 'column:notification_push_subscriptions.invalidated_at'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_preferences' and column_name = 'user_id'
  ) then v_missing := array_append(v_missing, 'column:notification_preferences.user_id'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_preferences' and column_name = 'push_enabled'
  ) then v_missing := array_append(v_missing, 'column:notification_preferences.push_enabled'); end if;

  if cardinality(v_missing) > 0 then
    raise exception 'v4_8_156_schema_prerequisite_missing:%', array_to_string(v_missing, ',');
  end if;
end $$;

create table if not exists public.notification_push_jobs (
  id uuid primary key default gen_random_uuid(),
  notification_delivery_id uuid not null references public.notification_deliveries(delivery_id) on delete cascade,
  notification_id uuid,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error_code text,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_push_jobs_delivery_unique
    unique (notification_delivery_id),

  constraint notification_push_jobs_status_check
    check (status in (
      'pending',
      'processing',
      'retry',
      'delivered',
      'failed_permanent',
      'cancelled',
      'expired'
    )),

  constraint notification_push_jobs_attempt_count_check
    check (attempt_count >= 0 and max_attempts between 1 and 20 and attempt_count <= max_attempts),

  constraint notification_push_jobs_lock_check
    check (
      (status = 'processing' and locked_at is not null and locked_by is not null)
      or
      (status <> 'processing')
    ),

  constraint notification_push_jobs_terminal_timestamp_check
    check (
      (status <> 'delivered' or delivered_at is not null)
      and (status <> 'cancelled' or cancelled_at is not null)
      and (status <> 'expired' or expired_at is not null)
    ),

  constraint notification_push_jobs_last_error_code_check
    check (
      last_error_code is null
      or (
        length(last_error_code) between 1 and 120
        and last_error_code ~ '^[a-z0-9][a-z0-9_.:-]*$'
      )
    )
);

create table if not exists public.notification_push_attempts (
  id uuid primary key default gen_random_uuid(),
  push_job_id uuid not null references public.notification_push_jobs(id) on delete cascade,
  push_subscription_id uuid not null references public.notification_push_subscriptions(subscription_id) on delete restrict,
  attempt_number integer not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  result text not null,
  http_status integer,
  provider_code text,
  error_class text,
  endpoint_fingerprint text not null,
  created_at timestamptz not null default now(),

  constraint notification_push_attempts_unique
    unique (push_job_id, push_subscription_id, attempt_number),

  constraint notification_push_attempts_attempt_number_check
    check (attempt_number between 1 and 20),

  constraint notification_push_attempts_result_check
    check (result in (
      'delivered',
      'transient_error',
      'permanent_error',
      'subscription_revoked',
      'skipped'
    )),

  constraint notification_push_attempts_http_status_check
    check (http_status is null or http_status between 100 and 599),

  constraint notification_push_attempts_endpoint_fingerprint_check
    check (endpoint_fingerprint ~ '^[a-f0-9]{64}$'),

  constraint notification_push_attempts_provider_code_check
    check (
      provider_code is null
      or (
        length(provider_code) between 1 and 120
        and provider_code ~ '^[a-z0-9][a-z0-9_.:-]*$'
      )
    ),

  constraint notification_push_attempts_error_class_check
    check (
      error_class is null
      or (
        length(error_class) between 1 and 120
        and error_class ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]*$'
      )
    )
);

create index if not exists notification_push_jobs_claim_idx
  on public.notification_push_jobs (status, available_at, created_at)
  where status in ('pending', 'retry');

create index if not exists notification_push_jobs_recipient_idx
  on public.notification_push_jobs (recipient_user_id, created_at desc);

create index if not exists notification_push_jobs_stale_lock_idx
  on public.notification_push_jobs (locked_at)
  where status = 'processing';

create index if not exists notification_push_attempts_job_idx
  on public.notification_push_attempts (push_job_id, attempt_number, created_at);

create index if not exists notification_push_attempts_subscription_idx
  on public.notification_push_attempts (push_subscription_id, created_at desc);

create or replace function public.mhidas_notification_push_jobs_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_notification_push_jobs_updated_at
  on public.notification_push_jobs;

create trigger trg_notification_push_jobs_updated_at
before update on public.notification_push_jobs
for each row
execute function public.mhidas_notification_push_jobs_set_updated_at();

-- Resolve a delivery status without hard-coding an enum that may evolve.
create or replace function public.mhidas_pick_notification_delivery_status(
  p_candidates text[]
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_udt_name text;
  v_candidate text;
  v_constraint_text text;
begin
  select c.udt_name
    into v_udt_name
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'notification_deliveries'
    and c.column_name = 'status'
  limit 1;

  if v_udt_name is null then
    return null;
  end if;

  foreach v_candidate in array p_candidates loop
    if exists (
      select 1
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
        and t.typname = v_udt_name
        and e.enumlabel = v_candidate
    ) then
      return v_candidate;
    end if;
  end loop;

  select string_agg(pg_get_constraintdef(pc.oid), ' ')
    into v_constraint_text
  from pg_constraint pc
  join pg_class cl on cl.oid = pc.conrelid
  join pg_namespace ns on ns.oid = cl.relnamespace
  where ns.nspname = 'public'
    and cl.relname = 'notification_deliveries'
    and pc.contype = 'c';

  if v_constraint_text is not null then
    foreach v_candidate in array p_candidates loop
      if position(quote_literal(v_candidate) in v_constraint_text) > 0 then
        return v_candidate;
      end if;
    end loop;
  end if;

  return null;
end;
$$;

create or replace function public.mhidas_enqueue_notification_push_job(
  p_notification_delivery_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recipient_id uuid;
  v_recipient_user_id uuid;
  v_notification_id uuid;
  v_channel text;
  v_job_id uuid;
begin
  if p_notification_delivery_id is null then
    raise exception 'notification_delivery_id_required';
  end if;

  select
    nd.recipient_id,
    nd.channel::text
  into
    v_recipient_id,
    v_channel
  from public.notification_deliveries nd
  where nd.delivery_id = p_notification_delivery_id
  limit 1;

  if not found then
    raise exception 'notification_delivery_not_found';
  end if;

  if lower(coalesce(v_channel, '')) <> 'push' then
    raise exception 'notification_delivery_channel_must_be_push';
  end if;

  select
    nr.recipient_user_id,
    nr.event_id
  into
    v_recipient_user_id,
    v_notification_id
  from public.notification_recipients nr
  where nr.recipient_id = v_recipient_id
  limit 1;

  if not found or v_recipient_user_id is null then
    raise exception 'notification_delivery_recipient_user_unresolved';
  end if;

  insert into public.notification_push_jobs (
    notification_delivery_id,
    notification_id,
    recipient_user_id
  )
  values (
    p_notification_delivery_id,
    v_notification_id,
    v_recipient_user_id
  )
  on conflict (notification_delivery_id)
  do update set
    notification_id = coalesce(public.notification_push_jobs.notification_id, excluded.notification_id),
    recipient_user_id = excluded.recipient_user_id
  returning id into v_job_id;

  return v_job_id;
end;
$$;

create or replace function public.mhidas_claim_notification_push_jobs(
  p_batch_size integer,
  p_worker_id text,
  p_lock_timeout_seconds integer default 300
)
returns table (
  job_id uuid,
  notification_delivery_id uuid,
  notification_id uuid,
  recipient_user_id uuid,
  attempt_number integer,
  max_attempts integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_batch_size integer;
  v_lock_timeout integer;
begin
  v_batch_size := greatest(1, least(coalesce(p_batch_size, 10), 25));
  v_lock_timeout := greatest(60, least(coalesce(p_lock_timeout_seconds, 300), 1800));

  if p_worker_id is null
     or length(btrim(p_worker_id)) < 8
     or length(btrim(p_worker_id)) > 120
     or btrim(p_worker_id) !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]*$' then
    raise exception 'invalid_worker_id';
  end if;

  update public.notification_push_jobs
  set status = 'retry',
      available_at = now(),
      locked_at = null,
      locked_by = null,
      last_error_code = 'stale_lock_recovered'
  where status = 'processing'
    and locked_at < now() - make_interval(secs => v_lock_timeout)
    and attempt_count < max_attempts;

  update public.notification_push_jobs
  set status = 'failed_permanent',
      locked_at = null,
      locked_by = null,
      last_error_code = coalesce(last_error_code, 'max_attempts_exhausted')
  where status in ('processing', 'retry', 'pending')
    and attempt_count >= max_attempts;

  return query
  with candidates as (
    select j.id
    from public.notification_push_jobs j
    where j.status in ('pending', 'retry')
      and j.available_at <= now()
      and j.attempt_count < j.max_attempts
    order by j.available_at asc, j.created_at asc
    for update skip locked
    limit v_batch_size
  ), claimed as (
    update public.notification_push_jobs j
    set status = 'processing',
        locked_at = now(),
        locked_by = btrim(p_worker_id),
        attempt_count = j.attempt_count + 1,
        last_error_code = null
    from candidates c
    where j.id = c.id
    returning j.*
  )
  select
    c.id,
    c.notification_delivery_id,
    c.notification_id,
    c.recipient_user_id,
    c.attempt_count,
    c.max_attempts
  from claimed c
  order by c.created_at asc;
end;
$$;

create or replace function public.mhidas_get_active_notification_push_subscriptions(
  p_recipient_user_id uuid
)
returns table (
  push_subscription_id uuid,
  endpoint text,
  p256dh text,
  auth_secret text,
  expiration_time bigint,
  endpoint_fingerprint text
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_push_allowed boolean;
begin
  if p_recipient_user_id is null then
    return;
  end if;

  select coalesce((
    select p.push_enabled
    from public.notification_preferences p
    where p.user_id = p_recipient_user_id
    limit 1
  ), true)
  into v_push_allowed;

  if not v_push_allowed then
    return;
  end if;

  return query
  select
    s.subscription_id,
    s.endpoint,
    s.p256dh,
    s.auth_secret,
    s.expiration_time_ms,
    encode(digest(s.endpoint, 'sha256'), 'hex')
  from public.notification_push_subscriptions s
  where s.user_id = p_recipient_user_id
    and s.revoked_at is null
    and s.invalidated_at is null
    and public.mhidas_notification_push_endpoint_is_safe(s.endpoint)
    and btrim(coalesce(s.p256dh, '')) <> ''
    and btrim(coalesce(s.auth_secret, '')) <> ''
    and (
      s.expiration_time_ms is null
      or s.expiration_time_ms > floor(extract(epoch from clock_timestamp()) * 1000)::bigint
    );
end;
$$;

create or replace function public.mhidas_record_notification_push_attempt(
  p_push_job_id uuid,
  p_push_subscription_id uuid,
  p_attempt_number integer,
  p_result text,
  p_http_status integer,
  p_provider_code text,
  p_error_class text,
  p_endpoint_fingerprint text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt_id uuid;
  v_provider_code text;
  v_error_class text;
begin
  v_provider_code := nullif(lower(regexp_replace(coalesce(p_provider_code, ''), '[^a-zA-Z0-9_.:-]+', '_', 'g')), '');
  v_error_class := nullif(regexp_replace(coalesce(p_error_class, ''), '[^A-Za-z0-9_.:-]+', '_', 'g'), '');

  if v_provider_code is not null then
    v_provider_code := left(v_provider_code, 120);
  end if;

  if v_error_class is not null then
    v_error_class := left(v_error_class, 120);
  end if;

  insert into public.notification_push_attempts (
    push_job_id,
    push_subscription_id,
    attempt_number,
    started_at,
    finished_at,
    result,
    http_status,
    provider_code,
    error_class,
    endpoint_fingerprint
  )
  values (
    p_push_job_id,
    p_push_subscription_id,
    p_attempt_number,
    now(),
    now(),
    p_result,
    p_http_status,
    v_provider_code,
    v_error_class,
    lower(p_endpoint_fingerprint)
  )
  on conflict (push_job_id, push_subscription_id, attempt_number)
  do update set
    finished_at = excluded.finished_at,
    result = excluded.result,
    http_status = excluded.http_status,
    provider_code = excluded.provider_code,
    error_class = excluded.error_class,
    endpoint_fingerprint = excluded.endpoint_fingerprint
  returning id into v_attempt_id;

  return v_attempt_id;
end;
$$;

create or replace function public.mhidas_revoke_notification_push_subscription_by_id(
  p_push_subscription_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_affected integer := 0;
begin
  if p_push_subscription_id is null then
    return false;
  end if;

  update public.notification_push_subscriptions
  set revoked_at = coalesce(revoked_at, now()),
      updated_at = now()
  where subscription_id = p_push_subscription_id
    and revoked_at is null;

  get diagnostics v_affected = row_count;
  return v_affected > 0;
end;
$$;

create or replace function public.mhidas_finish_notification_push_job(
  p_push_job_id uuid,
  p_outcome text,
  p_error_code text default null,
  p_backoff_seconds integer default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.notification_push_jobs%rowtype;
  v_delivery_status text;
  v_delivery_set_parts text[] := array[]::text[];
  v_delivery_sql text;
  v_error_code text;
  v_backoff integer;
  v_effective_outcome text;
begin
  select *
    into v_job
  from public.notification_push_jobs
  where id = p_push_job_id
  for update;

  if not found then
    raise exception 'push_job_not_found';
  end if;

  if v_job.status <> 'processing' then
    raise exception 'push_job_not_processing';
  end if;

  v_effective_outcome := p_outcome;
  if p_outcome = 'retry' and v_job.attempt_count >= v_job.max_attempts then
    v_effective_outcome := 'failed_permanent';
  end if;

  v_error_code := nullif(lower(regexp_replace(coalesce(p_error_code, ''), '[^a-zA-Z0-9_.:-]+', '_', 'g')), '');
  if v_error_code is not null then
    v_error_code := left(v_error_code, 120);
  end if;

  if v_effective_outcome = 'delivered' then
    v_delivery_status := public.mhidas_pick_notification_delivery_status(array['delivered', 'sent', 'completed']);
  elsif v_effective_outcome = 'retry' then
    v_delivery_status := public.mhidas_pick_notification_delivery_status(array['retry', 'pending', 'queued']);
  elsif v_effective_outcome = 'failed_permanent' then
    v_delivery_status := public.mhidas_pick_notification_delivery_status(array['failed_permanent', 'failed']);
  elsif v_effective_outcome = 'cancelled' then
    v_delivery_status := public.mhidas_pick_notification_delivery_status(array['cancelled', 'canceled']);
  elsif v_effective_outcome = 'expired' then
    v_delivery_status := public.mhidas_pick_notification_delivery_status(array['expired']);
  else
    raise exception 'invalid_push_job_outcome';
  end if;

  if v_delivery_status is null then
    raise exception 'notification_delivery_status_mapping_failed:%', v_effective_outcome;
  end if;

  v_delivery_set_parts := array_append(
    v_delivery_set_parts,
    format('status = %L', v_delivery_status)
  );

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_deliveries' and column_name = 'attempt_count'
  ) then
    v_delivery_set_parts := array_append(
      v_delivery_set_parts,
      format('attempt_count = greatest(coalesce(attempt_count, 0), %s)', v_job.attempt_count)
    );
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_deliveries' and column_name = 'last_attempt_at'
  ) then
    v_delivery_set_parts := array_append(v_delivery_set_parts, 'last_attempt_at = now()');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_deliveries' and column_name = 'last_error_code'
  ) then
    if v_error_code is null then
      v_delivery_set_parts := array_append(v_delivery_set_parts, 'last_error_code = null');
    else
      v_delivery_set_parts := array_append(v_delivery_set_parts, format('last_error_code = %L', v_error_code));
    end if;
  end if;

  if v_effective_outcome = 'delivered' and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_deliveries' and column_name = 'delivered_at'
  ) then
    v_delivery_set_parts := array_append(v_delivery_set_parts, 'delivered_at = coalesce(delivered_at, now())');
  end if;

  if v_effective_outcome = 'failed_permanent' and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_deliveries' and column_name = 'failed_at'
  ) then
    v_delivery_set_parts := array_append(v_delivery_set_parts, 'failed_at = coalesce(failed_at, now())');
  end if;

  if v_effective_outcome = 'cancelled' and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_deliveries' and column_name = 'cancelled_at'
  ) then
    v_delivery_set_parts := array_append(v_delivery_set_parts, 'cancelled_at = coalesce(cancelled_at, now())');
  end if;

  if v_effective_outcome = 'expired' and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_deliveries' and column_name = 'expired_at'
  ) then
    v_delivery_set_parts := array_append(v_delivery_set_parts, 'expired_at = coalesce(expired_at, now())');
  end if;

  if v_effective_outcome = 'retry' and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_deliveries' and column_name = 'available_at'
  ) then
    v_backoff := greatest(30, least(coalesce(p_backoff_seconds, 60), 3600));
    v_delivery_set_parts := array_append(
      v_delivery_set_parts,
      format('available_at = now() + make_interval(secs => %s)', v_backoff)
    );
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_deliveries' and column_name = 'updated_at'
  ) then
    v_delivery_set_parts := array_append(v_delivery_set_parts, 'updated_at = now()');
  end if;

  v_delivery_sql := format(
    'update public.notification_deliveries set %s where delivery_id = $1',
    array_to_string(v_delivery_set_parts, ', ')
  );

  begin
    execute v_delivery_sql using v_job.notification_delivery_id;
  exception when others then
    raise exception 'notification_delivery_update_failed:%', sqlstate;
  end;

  if v_effective_outcome = 'delivered' then
    update public.notification_push_jobs
    set status = 'delivered',
        delivered_at = now(),
        locked_at = null,
        locked_by = null,
        last_error_code = null
    where id = p_push_job_id;

  elsif v_effective_outcome = 'retry' then
    v_backoff := greatest(30, least(coalesce(p_backoff_seconds, 60), 3600));

    update public.notification_push_jobs
    set status = 'retry',
        available_at = now() + make_interval(secs => v_backoff),
        locked_at = null,
        locked_by = null,
        last_error_code = coalesce(v_error_code, 'transient_push_error')
    where id = p_push_job_id;

  elsif v_effective_outcome = 'failed_permanent' then
    update public.notification_push_jobs
    set status = 'failed_permanent',
        locked_at = null,
        locked_by = null,
        last_error_code = coalesce(
          v_error_code,
          case when p_outcome = 'retry' then 'max_attempts_exhausted' else 'permanent_push_error' end
        )
    where id = p_push_job_id;

  elsif v_effective_outcome = 'cancelled' then
    update public.notification_push_jobs
    set status = 'cancelled',
        cancelled_at = now(),
        locked_at = null,
        locked_by = null,
        last_error_code = coalesce(v_error_code, 'push_cancelled')
    where id = p_push_job_id;

  elsif v_effective_outcome = 'expired' then
    update public.notification_push_jobs
    set status = 'expired',
        expired_at = now(),
        locked_at = null,
        locked_by = null,
        last_error_code = coalesce(v_error_code, 'push_expired')
    where id = p_push_job_id;
  end if;

  return true;
end;
$$;

create or replace function public.mhidas_notification_push_dispatcher_self_check()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'jobs_table', to_regclass('public.notification_push_jobs') is not null,
    'attempts_table', to_regclass('public.notification_push_attempts') is not null,
    'job_count', (select count(*) from public.notification_push_jobs),
    'attempt_count', (select count(*) from public.notification_push_attempts),
    'push_delivery_count', (
      select count(*)
      from public.notification_deliveries nd
      where lower(coalesce(to_jsonb(nd) ->> 'channel', '')) = 'push'
    ),
    'registry_non_default_channel_count', (
      select count(*)
      from public.notification_type_registry ntr
      where to_jsonb(ntr) -> 'default_channels' is distinct from to_jsonb(array['in_app','badge']::text[])
    )
  );
$$;

alter table public.notification_push_jobs enable row level security;
alter table public.notification_push_attempts enable row level security;

revoke all on table public.notification_push_jobs from public, anon, authenticated;
revoke all on table public.notification_push_attempts from public, anon, authenticated;

grant all on table public.notification_push_jobs to service_role;
grant all on table public.notification_push_attempts to service_role;

revoke all on function public.mhidas_notification_push_jobs_set_updated_at() from public, anon, authenticated;
revoke all on function public.mhidas_pick_notification_delivery_status(text[]) from public, anon, authenticated;
revoke all on function public.mhidas_enqueue_notification_push_job(uuid) from public, anon, authenticated;
revoke all on function public.mhidas_claim_notification_push_jobs(integer, text, integer) from public, anon, authenticated;
revoke all on function public.mhidas_get_active_notification_push_subscriptions(uuid) from public, anon, authenticated;
revoke all on function public.mhidas_record_notification_push_attempt(uuid, uuid, integer, text, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.mhidas_revoke_notification_push_subscription_by_id(uuid) from public, anon, authenticated;
revoke all on function public.mhidas_finish_notification_push_job(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.mhidas_notification_push_dispatcher_self_check() from public, anon, authenticated;

grant execute on function public.mhidas_pick_notification_delivery_status(text[]) to service_role;
grant execute on function public.mhidas_enqueue_notification_push_job(uuid) to service_role;
grant execute on function public.mhidas_claim_notification_push_jobs(integer, text, integer) to service_role;
grant execute on function public.mhidas_get_active_notification_push_subscriptions(uuid) to service_role;
grant execute on function public.mhidas_record_notification_push_attempt(uuid, uuid, integer, text, integer, text, text, text) to service_role;
grant execute on function public.mhidas_revoke_notification_push_subscription_by_id(uuid) to service_role;
grant execute on function public.mhidas_finish_notification_push_job(uuid, text, text, integer) to service_role;
grant execute on function public.mhidas_notification_push_dispatcher_self_check() to service_role;

comment on table public.notification_push_jobs is
  'V4.8.156 server-side push dispatch queue. Exactly one job per notification_deliveries.delivery_id. No scheduler is created.';

comment on table public.notification_push_attempts is
  'V4.8.156 sanitized per-device push attempt ledger. It never stores full endpoints, p256dh, auth secrets, VAPID private keys, or private payloads.';

commit;
