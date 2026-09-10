-- MHIDAS / USECLUBBERS
-- R8J-C — transactional verification email dispatcher foundation
-- LOCAL MIGRATION ONLY. Do not apply to STAGING/Production without explicit approval.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

do $preflight$
begin
  if to_regclass('public.verification_email_outbox') is null then
    raise exception 'R8J_EMAIL_OUTBOX_DEPENDENCY_MISSING';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'verification_email_outbox'
      and column_name in ('attempt_count', 'max_attempts', 'processing_started_at', 'worker_id')
  ) then
    raise exception 'R8J_EMAIL_DISPATCHER_COLUMNS_ALREADY_EXIST';
  end if;
end;
$preflight$;

alter table public.verification_email_outbox
  add column attempt_count integer not null default 0,
  add column max_attempts integer not null default 5,
  add column processing_started_at timestamptz,
  add column worker_id text;

alter table public.verification_email_outbox
  add constraint verification_email_outbox_attempt_count_check
    check (attempt_count between 0 and 20),
  add constraint verification_email_outbox_max_attempts_check
    check (max_attempts between 1 and 20),
  add constraint verification_email_outbox_attempt_bounds_check
    check (attempt_count <= max_attempts),
  add constraint verification_email_outbox_processing_check
    check (
      (status = 'processing' and processing_started_at is not null and worker_id is not null)
      or
      (status <> 'processing' and processing_started_at is null and worker_id is null)
    ),
  add constraint verification_email_outbox_worker_id_check
    check (
      worker_id is null
      or (
        char_length(worker_id) between 8 and 120
        and worker_id !~ '[[:cntrl:]]'
      )
    );

create or replace function public.mhidas_claim_verification_email_jobs_v1(
  p_batch_size integer default 10,
  p_worker_id text default null,
  p_lock_timeout_seconds integer default 300
)
returns table (
  email_id uuid,
  request_id uuid,
  recipient_user_id uuid,
  recipient_email text,
  template_key text,
  idempotency_key text,
  attempt_number integer,
  max_attempts integer
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_batch_size integer := greatest(1, least(coalesce(p_batch_size, 10), 25));
  v_lock_timeout integer := greatest(60, least(coalesce(p_lock_timeout_seconds, 300), 1800));
  v_worker_id text := btrim(coalesce(p_worker_id, ''));
begin
  if char_length(v_worker_id) < 8 or char_length(v_worker_id) > 120 then
    raise exception using errcode = 'P0001', message = 'invalid_email_worker_id';
  end if;

  update public.verification_email_outbox e
  set
    status = 'failed',
    failed_at = now(),
    sent_at = null,
    provider_message_id = null,
    last_error_code = 'processing_lock_timeout',
    available_at = now(),
    processing_started_at = null,
    worker_id = null,
    updated_at = now()
  where e.status = 'processing'
    and e.processing_started_at <
      now() - make_interval(secs => v_lock_timeout);

  return query
  with candidates as (
    select e.email_id
    from public.verification_email_outbox e
    where e.status in ('pending', 'failed')
      and e.available_at <= now()
      and e.attempt_count < e.max_attempts
    order by e.available_at asc, e.created_at asc
    for update skip locked
    limit v_batch_size
  ),
  claimed as (
    update public.verification_email_outbox e
    set
      status = 'processing',
      attempt_count = e.attempt_count + 1,
      processing_started_at = now(),
      worker_id = v_worker_id,
      sent_at = null,
      failed_at = null,
      provider_message_id = null,
      last_error_code = null,
      updated_at = now()
    from candidates c
    where e.email_id = c.email_id
    returning
      e.email_id,
      e.request_id,
      e.recipient_user_id,
      e.recipient_email,
      e.template_key,
      e.idempotency_key,
      e.attempt_count,
      e.max_attempts
  )
  select
    c.email_id,
    c.request_id,
    c.recipient_user_id,
    c.recipient_email,
    c.template_key,
    c.idempotency_key,
    c.attempt_count,
    c.max_attempts
  from claimed c;
end;
$function$;

create or replace function public.mhidas_finish_verification_email_job_v1(
  p_email_id uuid,
  p_worker_id text,
  p_outcome text,
  p_provider_message_id text default null,
  p_error_code text default null,
  p_backoff_seconds integer default null
)
returns void
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_updated integer := 0;
  v_error_code text := lower(btrim(coalesce(p_error_code, 'email_delivery_error')));
  v_provider_message_id text := nullif(btrim(coalesce(p_provider_message_id, '')), '');
  v_backoff_seconds integer := greatest(30, least(coalesce(p_backoff_seconds, 30), 3600));
begin
  if p_email_id is null then
    raise exception using errcode = 'P0001', message = 'missing_email_id';
  end if;

  if char_length(btrim(coalesce(p_worker_id, ''))) < 8 then
    raise exception using errcode = 'P0001', message = 'invalid_email_worker_id';
  end if;

  if p_outcome not in ('sent', 'retry', 'failed_permanent', 'cancelled') then
    raise exception using errcode = 'P0001', message = 'invalid_email_job_outcome';
  end if;

  if v_error_code !~ '^[a-z0-9][a-z0-9_.:-]{1,119}$' then
    v_error_code := 'email_delivery_error';
  end if;

  if p_outcome = 'sent' then
    update public.verification_email_outbox e
    set
      status = 'sent',
      sent_at = now(),
      failed_at = null,
      provider_message_id = left(v_provider_message_id, 500),
      last_error_code = null,
      processing_started_at = null,
      worker_id = null,
      updated_at = now()
    where e.email_id = p_email_id
      and e.status = 'processing'
      and e.worker_id = p_worker_id;

  elsif p_outcome = 'retry' then
    update public.verification_email_outbox e
    set
      status = 'failed',
      sent_at = null,
      failed_at = now(),
      provider_message_id = null,
      last_error_code = v_error_code,
      available_at = now() + make_interval(secs => v_backoff_seconds),
      processing_started_at = null,
      worker_id = null,
      updated_at = now()
    where e.email_id = p_email_id
      and e.status = 'processing'
      and e.worker_id = p_worker_id;

  elsif p_outcome = 'failed_permanent' then
    update public.verification_email_outbox e
    set
      status = 'failed',
      sent_at = null,
      failed_at = now(),
      provider_message_id = null,
      last_error_code = v_error_code,
      attempt_count = e.max_attempts,
      available_at = now(),
      processing_started_at = null,
      worker_id = null,
      updated_at = now()
    where e.email_id = p_email_id
      and e.status = 'processing'
      and e.worker_id = p_worker_id;

  else
    update public.verification_email_outbox e
    set
      status = 'cancelled',
      sent_at = null,
      failed_at = null,
      provider_message_id = null,
      last_error_code = v_error_code,
      processing_started_at = null,
      worker_id = null,
      updated_at = now()
    where e.email_id = p_email_id
      and e.status = 'processing'
      and e.worker_id = p_worker_id;
  end if;

  get diagnostics v_updated = row_count;

  if v_updated <> 1 then
    raise exception using errcode = 'P0001', message = 'email_job_state_changed';
  end if;
end;
$function$;

revoke all on function
  public.mhidas_claim_verification_email_jobs_v1(integer, text, integer)
from public, anon, authenticated;

revoke all on function
  public.mhidas_finish_verification_email_job_v1(uuid, text, text, text, text, integer)
from public, anon, authenticated;

grant execute on function
  public.mhidas_claim_verification_email_jobs_v1(integer, text, integer)
to service_role;

grant execute on function
  public.mhidas_finish_verification_email_job_v1(uuid, text, text, text, text, integer)
to service_role;

comment on function public.mhidas_claim_verification_email_jobs_v1(integer, text, integer) is
  'R8J claims verification email outbox jobs with SKIP LOCKED and stale-processing recovery.';

comment on function public.mhidas_finish_verification_email_job_v1(uuid, text, text, text, text, integer) is
  'R8J finalizes verification email jobs as sent, retryable failure, permanent failure or cancelled.';

do $postflight$
begin
  if to_regprocedure(
    'public.mhidas_claim_verification_email_jobs_v1(integer,text,integer)'
  ) is null then
    raise exception 'R8J_EMAIL_CLAIM_FUNCTION_POSTFLIGHT_FAILED';
  end if;

  if to_regprocedure(
    'public.mhidas_finish_verification_email_job_v1(uuid,text,text,text,text,integer)'
  ) is null then
    raise exception 'R8J_EMAIL_FINISH_FUNCTION_POSTFLIGHT_FAILED';
  end if;
end;
$postflight$;

commit;
