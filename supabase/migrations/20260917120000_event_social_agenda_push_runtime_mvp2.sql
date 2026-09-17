-- MHIDAS / USECLUBBERS
-- MVP2 - SOCIAL-4K-C4-A
-- Agenda Push operational policy + governed enqueue bridge.
--
-- LOCAL ONLY.
-- No scheduler.
-- No automatic trigger.
-- No dispatcher invocation.
-- No STAGING or Production access.
--
-- Reuses:
--   notification_deliveries
--   notification_push_jobs
--   mhidas_enqueue_notification_push_job(uuid)
--
-- Goals:
--   - explicit push consent
--   - clubber.agenda category override
--   - quiet-hours governance
--   - agenda saved-state revalidation
--   - stale reminder protection
--   - idempotent delivery -> push job bridge
--   - dispatch-time policy/context resolver

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

do $dependencies$
begin
  if to_regclass('public.notification_deliveries') is null
    or to_regclass('public.notification_recipients') is null
    or to_regclass('public.notification_events') is null
    or to_regclass('public.notification_type_registry') is null
    or to_regclass('public.notification_preferences') is null
    or to_regclass('public.notification_push_subscriptions') is null
    or to_regclass('public.notification_push_jobs') is null
    or to_regclass('public.clubber_event_agenda_items') is null
    or to_regclass('public.canonical_event_sets') is null
  then
    raise exception 'SOCIAL_4K_C4_REQUIRED_TABLE_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_enqueue_notification_push_job(uuid)'
  ) is null then
    raise exception 'SOCIAL_4K_C4_ENQUEUE_DEPENDENCY_MISSING';
  end if;
end
$dependencies$;

-- ================================================================
-- CATEGORY OVERRIDE
--
-- Supported shapes for category_overrides["clubber.agenda"]:
--
--   false
--   true
--   { "push": false }
--   { "push": true }
--   { "enabled": false }
--   { "enabled": true }
--
-- Missing/unknown override inherits the global push preference.
-- ================================================================

create or replace function
  public.mhidas_notification_category_push_allowed_v1(
    p_overrides jsonb,
    p_category text
  )
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public
as $function$
declare
  v_value jsonb;
begin
  if p_category is null
    or btrim(p_category) = ''
  then
    return true;
  end if;

  v_value :=
    coalesce(p_overrides, '{}'::jsonb)
    -> btrim(p_category);

  if v_value is null then
    return true;
  end if;

  if jsonb_typeof(v_value) = 'boolean' then
    return (v_value::text)::boolean;
  end if;

  if jsonb_typeof(v_value) = 'object' then
    if jsonb_typeof(v_value -> 'push') = 'boolean' then
      return ((v_value -> 'push')::text)::boolean;
    end if;

    if jsonb_typeof(v_value -> 'enabled') = 'boolean' then
      return ((v_value -> 'enabled')::text)::boolean;
    end if;
  end if;

  return true;
end;
$function$;

-- ================================================================
-- PUSH POLICY + CONTEXT RESOLVER
--
-- policy_action:
--   enqueue  -> may be dispatched now
--   defer    -> queue for available_at
--   suppress -> do not send Push
--   expire   -> notification is no longer useful
--
-- For non-Agenda notifications this function intentionally remains
-- neutral so the existing dispatcher behaviour is preserved.
-- ================================================================

create or replace function
  public.mhidas_resolve_notification_push_policy_v1(
    p_notification_delivery_id uuid,
    p_reference_time timestamptz default now()
  )
returns table (
  is_agenda boolean,
  policy_action text,
  available_at timestamptz,
  reason_code text,
  notification_type text,
  push_title text,
  push_body text,
  internal_url text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_recipient_user_id uuid;
  v_source_type text;
  v_source_id uuid;

  v_notification_type text;
  v_title text;
  v_summary text;
  v_internal_url text;

  v_event_status text;
  v_recipient_status text;
  v_delivery_status text;

  v_event_expires_at timestamptz;
  v_recipient_expires_at timestamptz;
  v_delivery_expires_at timestamptz;
  v_effective_expires_at timestamptz;

  v_preference_category text;
  v_push_requires_explicit_consent boolean;
  v_quiet_hours_bypass boolean;

  v_push_enabled boolean := false;
  v_quiet_hours_enabled boolean := false;
  v_quiet_hours_start time without time zone;
  v_quiet_hours_end time without time zone;
  v_timezone text := 'UTC';
  v_category_overrides jsonb := '{}'::jsonb;

  v_local_timestamp timestamp without time zone;
  v_local_date date;
  v_local_time time without time zone;
  v_quiet_active boolean := false;
  v_quiet_end_date date;
  v_quiet_end_local timestamp without time zone;
  v_quiet_end_at timestamptz;

  v_saved boolean := false;

  v_set_starts_at timestamptz;
  v_set_publication_status text;
  v_set_lifecycle_status text;

  v_is_agenda boolean := false;
begin
  if p_notification_delivery_id is null then
    raise exception 'social_4k_push_delivery_id_required';
  end if;

  if p_reference_time is null then
    raise exception 'social_4k_push_reference_time_required';
  end if;

  select
    nr.recipient_user_id,
    ne.source_type,
    ne.source_id,
    ne.notification_type,
    ne.title,
    ne.summary,
    ne.internal_url,
    ne.status::text,
    nr.status::text,
    nd.status::text,
    ne.expires_at,
    nr.expires_at,
    nd.expires_at,
    ntr.preference_category,
    ntr.push_requires_explicit_consent,
    ntr.quiet_hours_bypass
  into
    v_recipient_user_id,
    v_source_type,
    v_source_id,
    v_notification_type,
    v_title,
    v_summary,
    v_internal_url,
    v_event_status,
    v_recipient_status,
    v_delivery_status,
    v_event_expires_at,
    v_recipient_expires_at,
    v_delivery_expires_at,
    v_preference_category,
    v_push_requires_explicit_consent,
    v_quiet_hours_bypass
  from public.notification_deliveries nd
  join public.notification_recipients nr
    on nr.recipient_id = nd.recipient_id
  join public.notification_events ne
    on ne.event_id = nr.event_id
  join public.notification_type_registry ntr
    on ntr.notification_type = ne.notification_type
  where nd.delivery_id = p_notification_delivery_id
    and nd.channel::text = 'push'
  limit 1;

  if not found then
    raise exception 'social_4k_push_delivery_context_not_found';
  end if;

  v_is_agenda :=
    v_notification_type in (
      'clubber_agenda.schedule_changed',
      'clubber_agenda.performer_changed',
      'clubber_agenda.reminder_30m'
    );

  -- Keep existing Push behaviour unchanged outside Agenda.
  if not v_is_agenda then
    is_agenda := false;
    policy_action := 'enqueue';
    available_at := p_reference_time;
    reason_code := null;
    notification_type := v_notification_type;
    push_title := v_title;
    push_body := coalesce(v_summary, 'Você tem uma nova notificação.');
    internal_url := v_internal_url;
    return next;
    return;
  end if;

  -- performer_changed is intentionally not a Push notification.
  if v_notification_type = 'clubber_agenda.performer_changed' then
    is_agenda := true;
    policy_action := 'suppress';
    available_at := null;
    reason_code := 'agenda_performer_push_not_allowed';
    notification_type := v_notification_type;
    push_title := v_title;
    push_body := coalesce(v_summary, '');
    internal_url := v_internal_url;
    return next;
    return;
  end if;

  -- Lifecycle validity.
  if v_event_status <> 'active'
    or v_recipient_status <> 'active'
    or v_delivery_status in (
      'cancelled',
      'invalidated',
      'expired',
      'suppressed'
    )
  then
    is_agenda := true;
    policy_action := 'suppress';
    available_at := null;
    reason_code := 'agenda_notification_inactive';
    notification_type := v_notification_type;
    push_title := v_title;
    push_body := coalesce(v_summary, '');
    internal_url := v_internal_url;
    return next;
    return;
  end if;

  v_effective_expires_at := least(
    coalesce(v_event_expires_at, 'infinity'::timestamptz),
    coalesce(v_recipient_expires_at, 'infinity'::timestamptz),
    coalesce(v_delivery_expires_at, 'infinity'::timestamptz)
  );

  if v_effective_expires_at = 'infinity'::timestamptz then
    v_effective_expires_at := null;
  end if;

  if v_effective_expires_at is not null
    and v_effective_expires_at <= p_reference_time
  then
    is_agenda := true;
    policy_action := 'expire';
    available_at := null;
    reason_code := 'agenda_notification_expired';
    notification_type := v_notification_type;
    push_title := v_title;
    push_body := coalesce(v_summary, '');
    internal_url := v_internal_url;
    return next;
    return;
  end if;

  -- The user must still have this set saved.
  if v_source_type <> 'canonical_event_set'
    or v_source_id is null
  then
    is_agenda := true;
    policy_action := 'suppress';
    available_at := null;
    reason_code := 'agenda_source_invalid';
    notification_type := v_notification_type;
    push_title := v_title;
    push_body := coalesce(v_summary, '');
    internal_url := v_internal_url;
    return next;
    return;
  end if;

  select exists (
    select 1
    from public.clubber_event_agenda_items ai
    where ai.user_id = v_recipient_user_id
      and ai.set_id = v_source_id
      and ai.status = 'saved'
  )
  into v_saved;

  if not v_saved then
    is_agenda := true;
    policy_action := 'suppress';
    available_at := null;
    reason_code := 'agenda_item_not_saved';
    notification_type := v_notification_type;
    push_title := v_title;
    push_body := coalesce(v_summary, '');
    internal_url := v_internal_url;
    return next;
    return;
  end if;

  -- Explicit Push preference.
  select
    np.push_enabled,
    np.quiet_hours_enabled,
    np.quiet_hours_start,
    np.quiet_hours_end,
    coalesce(nullif(btrim(np.timezone), ''), 'UTC'),
    coalesce(np.category_overrides, '{}'::jsonb)
  into
    v_push_enabled,
    v_quiet_hours_enabled,
    v_quiet_hours_start,
    v_quiet_hours_end,
    v_timezone,
    v_category_overrides
  from public.notification_preferences np
  where np.user_id = v_recipient_user_id
  limit 1;

  if not found then
    v_push_enabled := false;
    v_quiet_hours_enabled := false;
    v_timezone := 'UTC';
    v_category_overrides := '{}'::jsonb;
  end if;

  if coalesce(v_push_requires_explicit_consent, true)
    and not coalesce(v_push_enabled, false)
  then
    is_agenda := true;
    policy_action := 'suppress';
    available_at := null;
    reason_code := 'agenda_push_not_enabled';
    notification_type := v_notification_type;
    push_title := v_title;
    push_body := coalesce(v_summary, '');
    internal_url := v_internal_url;
    return next;
    return;
  end if;

  if not public.mhidas_notification_category_push_allowed_v1(
    v_category_overrides,
    v_preference_category
  ) then
    is_agenda := true;
    policy_action := 'suppress';
    available_at := null;
    reason_code := 'agenda_category_push_disabled';
    notification_type := v_notification_type;
    push_title := v_title;
    push_body := coalesce(v_summary, '');
    internal_url := v_internal_url;
    return next;
    return;
  end if;

  -- Reminder-specific freshness and current official-set state.
  if v_notification_type = 'clubber_agenda.reminder_30m' then
    select
      ces.starts_at,
      ces.publication_status,
      ces.lifecycle_status
    into
      v_set_starts_at,
      v_set_publication_status,
      v_set_lifecycle_status
    from public.canonical_event_sets ces
    where ces.set_id = v_source_id
    limit 1;

    if not found
      or v_set_publication_status <> 'published'
      or v_set_lifecycle_status not in ('scheduled', 'delayed')
    then
      is_agenda := true;
      policy_action := 'suppress';
      available_at := null;
      reason_code := 'agenda_reminder_set_inactive';
      notification_type := v_notification_type;
      push_title := v_title;
      push_body := coalesce(v_summary, '');
      internal_url := v_internal_url;
      return next;
      return;
    end if;

    if v_set_starts_at <= p_reference_time then
      is_agenda := true;
      policy_action := 'expire';
      available_at := null;
      reason_code := 'agenda_reminder_set_started';
      notification_type := v_notification_type;
      push_title := v_title;
      push_body := coalesce(v_summary, '');
      internal_url := v_internal_url;
      return next;
      return;
    end if;

    -- The text says "30 min"; do not deliver a stale reminder.
    if exists (
      select 1
      from public.notification_deliveries nd
      join public.notification_recipients nr
        on nr.recipient_id = nd.recipient_id
      join public.notification_events ne
        on ne.event_id = nr.event_id
      where nd.delivery_id = p_notification_delivery_id
        and ne.created_at + interval '10 minutes' <= p_reference_time
    ) then
      is_agenda := true;
      policy_action := 'expire';
      available_at := null;
      reason_code := 'agenda_reminder_stale';
      notification_type := v_notification_type;
      push_title := v_title;
      push_body := coalesce(v_summary, '');
      internal_url := v_internal_url;
      return next;
      return;
    end if;
  end if;

  -- Quiet hours.
  if coalesce(v_quiet_hours_enabled, false)
    and not coalesce(v_quiet_hours_bypass, false)
    and v_quiet_hours_start is not null
    and v_quiet_hours_end is not null
  then
    if not exists (
      select 1
      from pg_catalog.pg_timezone_names tz
      where tz.name = v_timezone
    ) then
      v_timezone := 'UTC';
    end if;

    v_local_timestamp := p_reference_time at time zone v_timezone;
    v_local_date := v_local_timestamp::date;
    v_local_time := v_local_timestamp::time;

    if v_quiet_hours_start < v_quiet_hours_end then
      v_quiet_active :=
        v_local_time >= v_quiet_hours_start
        and v_local_time < v_quiet_hours_end;

      v_quiet_end_date := v_local_date;
    else
      v_quiet_active :=
        v_local_time >= v_quiet_hours_start
        or v_local_time < v_quiet_hours_end;

      v_quiet_end_date :=
        case
          when v_local_time >= v_quiet_hours_start
            then v_local_date + 1
          else v_local_date
        end;
    end if;

    if v_quiet_active then
      -- A "30 min" reminder must never arrive after its useful window.
      if v_notification_type = 'clubber_agenda.reminder_30m' then
        is_agenda := true;
        policy_action := 'suppress';
        available_at := null;
        reason_code := 'agenda_reminder_quiet_hours';
        notification_type := v_notification_type;
        push_title := v_title;
        push_body := coalesce(v_summary, '');
        internal_url := v_internal_url;
        return next;
        return;
      end if;

      v_quiet_end_local :=
        v_quiet_end_date + v_quiet_hours_end;

      v_quiet_end_at :=
        v_quiet_end_local at time zone v_timezone;

      if v_effective_expires_at is not null
        and v_quiet_end_at >= v_effective_expires_at
      then
        is_agenda := true;
        policy_action := 'expire';
        available_at := null;
        reason_code := 'agenda_quiet_hours_past_expiry';
        notification_type := v_notification_type;
        push_title := v_title;
        push_body := coalesce(v_summary, '');
        internal_url := v_internal_url;
        return next;
        return;
      end if;

      is_agenda := true;
      policy_action := 'defer';
      available_at := v_quiet_end_at;
      reason_code := 'agenda_quiet_hours_deferred';
      notification_type := v_notification_type;
      push_title := v_title;
      push_body := coalesce(v_summary, '');
      internal_url := v_internal_url;
      return next;
      return;
    end if;
  end if;

  is_agenda := true;
  policy_action := 'enqueue';
  available_at := p_reference_time;
  reason_code := null;
  notification_type := v_notification_type;
  push_title := v_title;
  push_body := coalesce(v_summary, 'Você tem uma atualização na sua Agenda.');
  internal_url := v_internal_url;
  return next;
end;
$function$;

-- ================================================================
-- GOVERNED AGENDA DELIVERY -> PUSH JOB BRIDGE
--
-- No trigger is created.
-- A future controlled scheduler/runtime will invoke this explicitly.
-- ================================================================

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
        available_at = coalesce(
          v_policy.available_at,
          p_reference_time
        ),
        locked_at = null,
        locked_by = null,
        last_error_code = null,
        updated_at = now()
      where pj.id = v_job_id;

      update public.notification_deliveries nd
      set
        status = 'pending',
        available_at = coalesce(
          v_policy.available_at,
          p_reference_time
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

-- ================================================================
-- DISPATCH-TIME DEFER
--
-- Used only if quiet-hours state changes after a job was queued.
-- The claim attempt is neutralized so quiet hours do not consume retries.
-- ================================================================

create or replace function
  public.mhidas_defer_notification_push_job_v1(
    p_push_job_id uuid,
    p_available_at timestamptz,
    p_reason_code text
  )
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_delivery_id uuid;
  v_reason text;
begin
  if p_push_job_id is null then
    raise exception 'social_4k_push_job_id_required';
  end if;

  if p_available_at is null
    or p_available_at <= now()
  then
    raise exception 'social_4k_push_defer_time_invalid';
  end if;

  v_reason := left(
    lower(
      regexp_replace(
        coalesce(
          nullif(btrim(p_reason_code), ''),
          'agenda_push_deferred'
        ),
        '[^a-zA-Z0-9_.:-]+',
        '_',
        'g'
      )
    ),
    120
  );

  select pj.notification_delivery_id
  into v_delivery_id
  from public.notification_push_jobs pj
  where pj.id = p_push_job_id
    and pj.status = 'processing'
  for update;

  if not found then
    raise exception 'social_4k_push_job_not_processing';
  end if;

  update public.notification_push_jobs pj
  set
    status = 'retry',
    attempt_count = greatest(pj.attempt_count - 1, 0),
    available_at = p_available_at,
    locked_at = null,
    locked_by = null,
    last_error_code = v_reason,
    updated_at = now()
  where pj.id = p_push_job_id;

  update public.notification_deliveries nd
  set
    status = 'pending',
    available_at = p_available_at,
    delivered_at = null,
    last_error_code = v_reason,
    updated_at = now()
  where nd.delivery_id = v_delivery_id;

  return true;
end;
$function$;

-- ================================================================
-- ACL
-- ================================================================

revoke all on function
  public.mhidas_notification_category_push_allowed_v1(jsonb, text)
from public, anon, authenticated;

revoke all on function
  public.mhidas_resolve_notification_push_policy_v1(
    uuid,
    timestamp with time zone
  )
from public, anon, authenticated;

revoke all on function
  public.mhidas_enqueue_agenda_push_jobs_v1(
    timestamp with time zone,
    integer
  )
from public, anon, authenticated;

revoke all on function
  public.mhidas_defer_notification_push_job_v1(
    uuid,
    timestamp with time zone,
    text
  )
from public, anon, authenticated;

grant execute on function
  public.mhidas_notification_category_push_allowed_v1(jsonb, text)
to service_role;

grant execute on function
  public.mhidas_resolve_notification_push_policy_v1(
    uuid,
    timestamp with time zone
  )
to service_role;

grant execute on function
  public.mhidas_enqueue_agenda_push_jobs_v1(
    timestamp with time zone,
    integer
  )
to service_role;

grant execute on function
  public.mhidas_defer_notification_push_job_v1(
    uuid,
    timestamp with time zone,
    text
  )
to service_role;

comment on function
  public.mhidas_resolve_notification_push_policy_v1(
    uuid,
    timestamp with time zone
  )
is
'SOCIAL-4K-C4 governed Push eligibility/context resolver. Revalidates Agenda saved state, explicit Push consent, category override, quiet hours and reminder freshness.';

comment on function
  public.mhidas_enqueue_agenda_push_jobs_v1(
    timestamp with time zone,
    integer
  )
is
'SOCIAL-4K-C4 explicit idempotent bridge from eligible Agenda Push deliveries to the existing central notification_push_jobs queue. No trigger or scheduler.';

comment on function
  public.mhidas_defer_notification_push_job_v1(
    uuid,
    timestamp with time zone,
    text
  )
is
'SOCIAL-4K-C4 controlled Push defer path that preserves retry budget when quiet-hours state changes after enqueue.';

commit;