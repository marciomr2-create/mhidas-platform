-- MHIDAS / USECLUBBERS
-- MVP2 - SOCIAL-4K-C4-F
-- Agenda Push scheduler runtime foundation.
--
-- Creates:
--   - pg_net / pg_cron dependencies
--   - governed scheduler runtime
--   - explicit scheduler activation function
--
-- IMPORTANT:
--   The migration DOES NOT activate the cron job automatically.
--   Activation is explicit and requires Vault configuration first.
--   No secret values are stored in this migration.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

create extension if not exists pg_net
with schema extensions;

create extension if not exists pg_cron;

do $dependencies$
begin
  if to_regprocedure(
    'public.mhidas_emit_event_set_reminders_30m_v1(timestamp with time zone,integer)'
  ) is null then
    raise exception 'SOCIAL_4K_C4F_REMINDER_PRODUCER_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_enqueue_agenda_push_jobs_v1(timestamp with time zone,integer)'
  ) is null then
    raise exception 'SOCIAL_4K_C4F_ENQUEUE_RUNTIME_MISSING';
  end if;

  if to_regclass('vault.decrypted_secrets') is null then
    raise exception 'SOCIAL_4K_C4F_VAULT_MISSING';
  end if;

  if to_regprocedure(
    'net.http_post(text,jsonb,jsonb,jsonb,integer)'
  ) is null then
    raise exception 'SOCIAL_4K_C4F_PG_NET_HTTP_POST_MISSING';
  end if;

  if to_regprocedure(
    'cron.schedule(text,text,text)'
  ) is null then
    raise exception 'SOCIAL_4K_C4F_PG_CRON_SCHEDULE_MISSING';
  end if;
end
$dependencies$;

create or replace function
  public.mhidas_run_agenda_push_scheduler_v1(
    p_reference_time timestamptz default now(),
    p_scan_window_minutes integer default 5,
    p_enqueue_limit integer default 100,
    p_dispatch_batch_size integer default 25
  )
returns table (
  reminders_emitted integer,
  enqueue_scanned integer,
  enqueue_enqueued integer,
  enqueue_deferred integer,
  enqueue_suppressed integer,
  enqueue_expired integer,
  dispatch_requested boolean,
  dispatch_request_id bigint
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_reminders integer := 0;
  v_enqueue record;

  v_dispatch_base_url text;
  v_dispatch_secret text;
  v_expected_project_ref text;

  v_batch_size integer;
  v_request_id bigint;
begin
  if p_reference_time is null then
    raise exception 'social_4k_scheduler_reference_time_required';
  end if;

  if p_scan_window_minutes is null
    or p_scan_window_minutes not between 1 and 15
  then
    raise exception 'social_4k_scheduler_scan_window_invalid';
  end if;

  if p_enqueue_limit is null
    or p_enqueue_limit not between 1 and 500
  then
    raise exception 'social_4k_scheduler_enqueue_limit_invalid';
  end if;

  v_batch_size :=
    greatest(
      1,
      least(
        coalesce(p_dispatch_batch_size, 25),
        25
      )
    );

  select nullif(btrim(ds.decrypted_secret), '')
  into v_dispatch_base_url
  from vault.decrypted_secrets ds
  where ds.name = 'mhidas_social_4k_dispatcher_base_url'
  limit 1;

  select nullif(btrim(ds.decrypted_secret), '')
  into v_dispatch_secret
  from vault.decrypted_secrets ds
  where ds.name = 'mhidas_social_4k_dispatcher_secret'
  limit 1;

  select lower(nullif(btrim(ds.decrypted_secret), ''))
  into v_expected_project_ref
  from vault.decrypted_secrets ds
  where ds.name = 'mhidas_social_4k_expected_supabase_project_ref'
  limit 1;

  if v_dispatch_base_url is null then
    raise exception 'social_4k_dispatcher_base_url_missing';
  end if;

  if v_dispatch_secret is null then
    raise exception 'social_4k_dispatcher_secret_missing';
  end if;

  if v_expected_project_ref is null then
    raise exception 'social_4k_expected_project_ref_missing';
  end if;

  if v_dispatch_base_url !~
    '^https://[A-Za-z0-9.-]+[.]vercel[.]app/?$'
  then
    raise exception 'social_4k_dispatcher_base_url_invalid';
  end if;

  if v_expected_project_ref !~ '^[a-z0-9]{8,64}$' then
    raise exception 'social_4k_expected_project_ref_invalid';
  end if;

  select
    public.mhidas_emit_event_set_reminders_30m_v1(
      p_reference_time,
      p_scan_window_minutes
    )
  into v_reminders;

  select *
  into v_enqueue
  from public.mhidas_enqueue_agenda_push_jobs_v1(
    p_reference_time,
    p_enqueue_limit
  );

  select net.http_post(
    url :=
      rtrim(v_dispatch_base_url, '/')
      || '/api/internal/notifications/push/dispatch',
    body := jsonb_build_object(
      'batchSize',
      v_batch_size
    ),
    headers := jsonb_build_object(
      'Content-Type',
      'application/json',
      'x-mhidas-push-dispatcher-secret',
      v_dispatch_secret,
      'x-mhidas-expected-supabase-project-ref',
      v_expected_project_ref
    ),
    timeout_milliseconds := 10000
  )
  into v_request_id;

  reminders_emitted := coalesce(v_reminders, 0);
  enqueue_scanned := coalesce(v_enqueue.scanned_count, 0);
  enqueue_enqueued := coalesce(v_enqueue.enqueued_count, 0);
  enqueue_deferred := coalesce(v_enqueue.deferred_count, 0);
  enqueue_suppressed := coalesce(v_enqueue.suppressed_count, 0);
  enqueue_expired := coalesce(v_enqueue.expired_count, 0);
  dispatch_requested := v_request_id is not null;
  dispatch_request_id := v_request_id;

  return next;
end;
$function$;

revoke all on function
  public.mhidas_run_agenda_push_scheduler_v1(
    timestamp with time zone,
    integer,
    integer,
    integer
  )
from public, anon, authenticated;

grant execute on function
  public.mhidas_run_agenda_push_scheduler_v1(
    timestamp with time zone,
    integer,
    integer,
    integer
  )
to service_role;

comment on function
  public.mhidas_run_agenda_push_scheduler_v1(
    timestamp with time zone,
    integer,
    integer,
    integer
  )
is
  'SOCIAL-4K Agenda scheduler cycle: 30m reminder producer, governed enqueue and authenticated pg_net dispatch request. Runtime configuration is read from Vault.';

create or replace function
  public.mhidas_activate_agenda_push_scheduler_v1()
returns bigint
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_job_id bigint;
begin
  if not exists (
    select 1
    from vault.decrypted_secrets ds
    where ds.name = 'mhidas_social_4k_dispatcher_base_url'
      and nullif(btrim(ds.decrypted_secret), '') is not null
  ) then
    raise exception 'social_4k_dispatcher_base_url_missing';
  end if;

  if not exists (
    select 1
    from vault.decrypted_secrets ds
    where ds.name = 'mhidas_social_4k_dispatcher_secret'
      and nullif(btrim(ds.decrypted_secret), '') is not null
  ) then
    raise exception 'social_4k_dispatcher_secret_missing';
  end if;

  if not exists (
    select 1
    from vault.decrypted_secrets ds
    where ds.name = 'mhidas_social_4k_expected_supabase_project_ref'
      and nullif(btrim(ds.decrypted_secret), '') is not null
  ) then
    raise exception 'social_4k_expected_project_ref_missing';
  end if;

  select cron.schedule(
    'mhidas-social-4k-agenda-push-every-5m',
    '*/5 * * * *',
    $cron$
      select public.mhidas_run_agenda_push_scheduler_v1(
        now(),
        5,
        100,
        25
      );
    $cron$
  )
  into v_job_id;

  return v_job_id;
end;
$function$;

revoke all on function
  public.mhidas_activate_agenda_push_scheduler_v1()
from public, anon, authenticated, service_role;

comment on function
  public.mhidas_activate_agenda_push_scheduler_v1()
is
  'SOCIAL-4K explicit operator-only activation for the 5-minute Agenda Push scheduler. Requires Vault runtime configuration first.';

commit;