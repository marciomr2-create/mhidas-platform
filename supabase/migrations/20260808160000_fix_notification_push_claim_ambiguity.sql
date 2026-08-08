begin;

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

  update public.notification_push_jobs j
  set status = 'retry',
      available_at = now(),
      locked_at = null,
      locked_by = null,
      last_error_code = 'stale_lock_recovered'
  where j.status = 'processing'
    and j.locked_at < now() - make_interval(secs => v_lock_timeout)
    and j.attempt_count < j.max_attempts;

  update public.notification_push_jobs j
  set status = 'failed_permanent',
      locked_at = null,
      locked_by = null,
      last_error_code = coalesce(j.last_error_code, 'max_attempts_exhausted')
  where j.status in ('processing', 'retry', 'pending')
    and j.attempt_count >= j.max_attempts;

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
  ),
  claimed as (
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

commit;