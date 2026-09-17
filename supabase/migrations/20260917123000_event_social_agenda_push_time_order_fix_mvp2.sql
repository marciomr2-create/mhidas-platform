-- MHIDAS / USECLUBBERS
-- MVP2 - SOCIAL-4K-C4-D
-- Agenda Push enqueue time-order compatibility fix.
--
-- Corrective migration.
-- Does NOT alter historical migration 20260917120000.
-- Does NOT add scheduler, trigger, test data or dispatcher invocation.
--
-- Reason:
-- notification_deliveries requires available_at >= created_at.
-- A caller-supplied reference time may predate a newly-created delivery.
-- Clamp queue/delivery available_at to their own created_at.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

do $dependencies$
begin
  if to_regclass('public.notification_deliveries') is null
    or to_regclass('public.notification_recipients') is null
    or to_regclass('public.notification_events') is null
    or to_regclass('public.notification_push_jobs') is null
  then
    raise exception 'SOCIAL_4K_C4_TIME_ORDER_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_resolve_notification_push_policy_v1(uuid,timestamp with time zone)'
  ) is null then
    raise exception 'SOCIAL_4K_C4_TIME_ORDER_POLICY_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_enqueue_notification_push_job(uuid)'
  ) is null then
    raise exception 'SOCIAL_4K_C4_TIME_ORDER_ENQUEUE_DEPENDENCY_MISSING';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class r
      on r.oid = c.conrelid
    join pg_namespace n
      on n.oid = r.relnamespace
    where n.nspname = 'public'
      and r.relname = 'notification_deliveries'
      and c.conname = 'notification_deliveries_time_order_check'
  ) then
    raise exception 'SOCIAL_4K_C4_TIME_ORDER_CONSTRAINT_MISSING';
  end if;
end
$dependencies$;

create or replace function
  public.mhidas_enqueue_agenda_push_jobs_v1(
    p_reference_time timestamptz default now(),
    p_limit integer default 100
  )
returns table (
  scanned_count integer,
  enqueued_count integer,
  deferred_count integer,
  suppressed_count integer,
  expired_count integer
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_delivery record;
  v_policy record;
  v_job_id uuid;

  v_scanned integer := 0;
  v_enqueued integer := 0;
  v_deferred integer := 0;
  v_suppressed integer := 0;
  v_expired integer := 0;
  v_limit integer;
begin
  if p_reference_time is null then
    raise exception 'social_4k_push_reference_time_required';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 100), 500));

  for v_delivery in
    select nd.delivery_id
    from public.notification_deliveries nd
    join public.notification_recipients nr
      on nr.recipient_id = nd.recipient_id
    join public.notification_events ne
      on ne.event_id = nr.event_id
    where nd.channel::text = 'push'
      and ne.notification_type in (
        'clubber_agenda.schedule_changed',
        'clubber_agenda.reminder_30m'
      )
      and nd.status::text not in (
        'cancelled',
        'invalidated',
        'expired',
        'suppressed'
      )
      and not exists (
        select 1
        from public.notification_push_jobs pj
        where pj.notification_delivery_id = nd.delivery_id
      )
    order by nd.created_at, nd.delivery_id
    limit v_limit
    for update of nd skip locked
  loop
    v_scanned := v_scanned + 1;

    select *
    into v_policy
    from public.mhidas_resolve_notification_push_policy_v1(
      v_delivery.delivery_id,
      p_reference_time
    );

    if v_policy.policy_action in ('enqueue', 'defer') then
      v_job_id :=
        public.mhidas_enqueue_notification_push_job(
          v_delivery.delivery_id
        );

      update public.notification_push_jobs pj
      set
        status = 'pending',
        available_at = greatest(
          coalesce(
            v_policy.available_at,
            p_reference_time
          ),
          pj.created_at
        ),
        locked_at = null,
        locked_by = null,
        last_error_code = null,
        updated_at = now()
      where pj.id = v_job_id;

      update public.notification_deliveries nd
      set
        status = 'pending',
        available_at = greatest(
          coalesce(
            v_policy.available_at,
            p_reference_time
          ),
          nd.created_at
        ),
        delivered_at = null,
        last_error_code = null,
        updated_at = now()
      where nd.delivery_id = v_delivery.delivery_id;

      if v_policy.policy_action = 'defer' then
        v_deferred := v_deferred + 1;
      else
        v_enqueued := v_enqueued + 1;
      end if;

    elsif v_policy.policy_action = 'expire' then
      update public.notification_deliveries nd
      set
        status = 'expired',
        delivered_at = null,
        last_error_code = left(
          coalesce(
            v_policy.reason_code,
            'agenda_push_expired'
          ),
          120
        ),
        updated_at = now()
      where nd.delivery_id = v_delivery.delivery_id;

      v_expired := v_expired + 1;

    else
      update public.notification_deliveries nd
      set
        status = 'suppressed',
        delivered_at = null,
        last_error_code = left(
          coalesce(
            v_policy.reason_code,
            'agenda_push_suppressed'
          ),
          120
        ),
        updated_at = now()
      where nd.delivery_id = v_delivery.delivery_id;

      v_suppressed := v_suppressed + 1;
    end if;
  end loop;

  scanned_count := v_scanned;
  enqueued_count := v_enqueued;
  deferred_count := v_deferred;
  suppressed_count := v_suppressed;
  expired_count := v_expired;

  return next;
end;
$function$;

revoke all on function
  public.mhidas_enqueue_agenda_push_jobs_v1(
    timestamp with time zone,
    integer
  )
from public, anon, authenticated;

grant execute on function
  public.mhidas_enqueue_agenda_push_jobs_v1(
    timestamp with time zone,
    integer
  )
to service_role;

comment on function
  public.mhidas_enqueue_agenda_push_jobs_v1(
    timestamp with time zone,
    integer
  )
is
  'SOCIAL-4K governed Agenda Push enqueue bridge. Clamps available_at to queue/delivery created_at to preserve central time-order constraints.';

commit;