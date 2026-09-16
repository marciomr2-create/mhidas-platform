-- supabase/migrations/20260916190000_event_social_agenda_notifications_foundation_mvp2.sql
-- MHIDAS / USECLUBBERS
-- MVP2 - SOCIAL-4K-C1 - Agenda Social notification producers foundation
-- LOCAL ONLY. Do not apply to STAGING or Production without explicit approval.
-- No scheduler, dispatcher invocation, event-group bridge or test data.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

do $dependencies$
begin
  if to_regclass('public.social_notifications') is null
    or to_regclass('public.notification_type_registry') is null
    or to_regclass('public.notification_events') is null
    or to_regclass('public.notification_recipients') is null
    or to_regclass('public.notification_deliveries') is null
    or to_regclass('public.canonical_events') is null
    or to_regclass('public.canonical_event_stages') is null
    or to_regclass('public.canonical_event_sets') is null
    or to_regclass('public.canonical_event_set_performers') is null
    or to_regclass('public.clubber_event_agenda_items') is null
    or to_regclass('public.canonical_event_set_changes') is null
  then
    raise exception 'SOCIAL_4K_C1_REQUIRED_TABLE_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure('public.mhidas_sync_social_notification_to_unified()') is null then
    raise exception 'SOCIAL_4K_C1_UNIFIED_SYNC_DEPENDENCY_MISSING';
  end if;
end
$dependencies$;

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
  (
    'clubber_agenda.schedule_changed',
    'clubber_agenda',
    'canonical_event_set',
    'transactional',
    array['in_app','badge','push']::public.notification_delivery_channel[],
    'none',
    'clubber.agenda',
    'standard',
    true,
    false,
    null
  ),
  (
    'clubber_agenda.performer_changed',
    'clubber_agenda',
    'canonical_event_set',
    'social',
    array['in_app','badge']::public.notification_delivery_channel[],
    'none',
    'clubber.agenda',
    'standard',
    true,
    false,
    null
  ),
  (
    'clubber_agenda.reminder_30m',
    'clubber_agenda',
    'canonical_event_set',
    'transactional',
    array['in_app','badge','push']::public.notification_delivery_channel[],
    'none',
    'clubber.agenda',
    'standard',
    true,
    false,
    null
  )
on conflict (notification_type)
do update set
  domain = excluded.domain,
  source_type = excluded.source_type,
  default_priority = excluded.default_priority,
  default_channels = excluded.default_channels,
  grouping_policy = excluded.grouping_policy,
  preference_category = excluded.preference_category,
  privacy_level = excluded.privacy_level,
  push_requires_explicit_consent = excluded.push_requires_explicit_consent,
  quiet_hours_bypass = excluded.quiet_hours_bypass,
  default_expires_after_seconds = excluded.default_expires_after_seconds,
  is_active = true,
  updated_at = now();

create or replace function public.mhidas_emit_event_set_revision_notifications_v1(
  p_set_id uuid,
  p_schedule_revision integer
)
returns integer
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_canonical_event_id uuid;
  v_event_slug text;
  v_event_name text;
  v_event_ends_at timestamptz;
  v_set_title text;
  v_set_starts_at timestamptz;
  v_set_ends_at timestamptz;
  v_set_publication_status text;
  v_set_lifecycle_status text;
  v_current_revision integer;
  v_performer_label text;
  v_source_label text;
  v_change_count integer := 0;
  v_has_operational_change boolean := false;
  v_has_restored boolean := false;
  v_notification_type text;
  v_title text;
  v_summary text;
  v_idempotency_key text;
  v_internal_url text;
  v_expires_at timestamptz;
  v_inserted integer := 0;
begin
  if p_set_id is null then
    raise exception 'social_4k_set_id_required';
  end if;

  if p_schedule_revision is null or p_schedule_revision not between 1 and 10000 then
    raise exception 'social_4k_schedule_revision_invalid';
  end if;

  select
    ces.canonical_event_id,
    ce.slug,
    ce.event_name,
    ce.ends_at,
    ces.set_title,
    ces.starts_at,
    ces.ends_at,
    ces.publication_status,
    ces.lifecycle_status,
    ces.schedule_revision
  into
    v_canonical_event_id,
    v_event_slug,
    v_event_name,
    v_event_ends_at,
    v_set_title,
    v_set_starts_at,
    v_set_ends_at,
    v_set_publication_status,
    v_set_lifecycle_status,
    v_current_revision
  from public.canonical_event_sets ces
  join public.canonical_events ce on ce.id = ces.canonical_event_id
  where ces.set_id = p_set_id
    and ce.validation_status in ('validated', 'published')
    and ce.is_100_percent_validated = true
  limit 1;

  if not found then
    raise exception 'social_4k_official_set_not_found';
  end if;

  if nullif(btrim(v_event_slug), '') is null then
    raise exception 'social_4k_event_slug_missing';
  end if;

  if v_set_publication_status <> 'published' then
    raise exception 'social_4k_set_not_published';
  end if;

  if v_current_revision <> p_schedule_revision then
    raise exception 'social_4k_schedule_revision_mismatch';
  end if;

  select
    count(*)::integer,
    bool_or(c.change_type in ('time_changed','stage_changed','cancelled','restored')),
    bool_or(c.change_type = 'restored')
  into
    v_change_count,
    v_has_operational_change,
    v_has_restored
  from public.canonical_event_set_changes c
  where c.set_id = p_set_id
    and c.canonical_event_id = v_canonical_event_id
    and c.schedule_revision = p_schedule_revision;

  if v_change_count = 0 then
    raise exception 'social_4k_revision_changes_missing';
  end if;

  select nullif(
    string_agg(p.display_name, ' + ' order by p.sort_order, p.display_name),
    ''
  )
  into v_performer_label
  from public.canonical_event_set_performers p
  where p.set_id = p_set_id;

  v_source_label := left(
    coalesce(
      nullif(btrim(v_performer_label), ''),
      nullif(btrim(v_set_title), ''),
      'Set salvo'
    ),
    120
  );

  if v_has_operational_change then
    v_notification_type := 'clubber_agenda.schedule_changed';

    if v_set_lifecycle_status = 'cancelled' then
      v_title := U&'Perfil Clubber \00b7 Set cancelado';
      v_summary := v_source_label || U&' foi cancelado na programa\00e7\00e3o oficial.';
    elsif v_has_restored then
      v_title := U&'Perfil Clubber \00b7 Set restaurado';
      v_summary := v_source_label || U&' voltou \00e0 programa\00e7\00e3o oficial.';
    else
      v_title := U&'Perfil Clubber \00b7 Programa\00e7\00e3o atualizada';
      v_summary := U&'A programa\00e7\00e3o oficial de ' || v_source_label || U&' mudou. Abra o evento para ver os detalhes atualizados.';
    end if;
  else
    v_notification_type := 'clubber_agenda.performer_changed';
    v_title := U&'Perfil Clubber \00b7 Artistas atualizados';
    v_summary := U&'Os artistas de ' || v_source_label || U&' foram atualizados na programa\00e7\00e3o oficial.';
  end if;

  v_idempotency_key :=
    'clubber_agenda:set:' || p_set_id::text || ':rev:' || p_schedule_revision::text;

  v_internal_url := '/event/' || v_event_slug;
  v_expires_at := coalesce(v_set_ends_at, v_event_ends_at, v_set_starts_at + interval '12 hours');

  if v_expires_at <= now() then
    v_expires_at := null;
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
  select
    ai.user_id,
    null,
    null,
    'canonical_event_set',
    p_set_id,
    v_notification_type,
    v_title,
    left(v_summary, 280),
    jsonb_build_object(
      'source_label', v_source_label,
      'source_category', 'agenda_set',
      'event_name', v_event_name,
      'event_slug', v_event_slug,
      'profile_mode', 'clubber',
      'count', v_change_count
    ),
    v_internal_url,
    'in_app',
    'active',
    v_idempotency_key,
    v_expires_at
  from public.clubber_event_agenda_items ai
  where ai.set_id = p_set_id
    and ai.canonical_event_id = v_canonical_event_id
    and ai.status = 'saved'
  on conflict (recipient_user_id, channel, idempotency_key)
  do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$function$;

create or replace function public.mhidas_emit_event_set_reminders_30m_v1(
  p_reference_time timestamptz default now(),
  p_scan_window_minutes integer default 5
)
returns integer
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_set record;
  v_performer_label text;
  v_source_label text;
  v_summary text;
  v_idempotency_key text;
  v_expires_at timestamptz;
  v_inserted_for_set integer := 0;
  v_total_inserted integer := 0;
begin
  if p_reference_time is null then
    raise exception 'social_4k_reference_time_required';
  end if;

  if p_scan_window_minutes is null or p_scan_window_minutes not between 1 and 15 then
    raise exception 'social_4k_scan_window_invalid';
  end if;

  for v_set in
    select
      ces.set_id,
      ces.canonical_event_id,
      ces.set_title,
      ces.starts_at,
      ces.ends_at,
      ces.schedule_revision,
      ce.slug as event_slug,
      ce.event_name,
      ce.ends_at as event_ends_at,
      ces_stage.name as stage_name
    from public.canonical_event_sets ces
    join public.canonical_events ce on ce.id = ces.canonical_event_id
    left join public.canonical_event_stages ces_stage on ces_stage.stage_id = ces.stage_id
    where ces.publication_status = 'published'
      and ces.lifecycle_status in ('scheduled', 'delayed')
      and ce.validation_status in ('validated', 'published')
      and ce.is_100_percent_validated = true
      and nullif(btrim(ce.slug), '') is not null
      and ces.starts_at >= p_reference_time + interval '30 minutes'
      and ces.starts_at < p_reference_time + interval '30 minutes' + make_interval(mins => p_scan_window_minutes)
      and exists (
        select 1
        from public.clubber_event_agenda_items ai
        where ai.set_id = ces.set_id
          and ai.canonical_event_id = ces.canonical_event_id
          and ai.status = 'saved'
      )
    order by ces.starts_at, ces.set_id
  loop
    select nullif(
      string_agg(p.display_name, ' + ' order by p.sort_order, p.display_name),
      ''
    )
    into v_performer_label
    from public.canonical_event_set_performers p
    where p.set_id = v_set.set_id;

    v_source_label := left(
      coalesce(
        nullif(btrim(v_performer_label), ''),
        nullif(btrim(v_set.set_title), ''),
        'Set salvo'
      ),
      120
    );

    if nullif(btrim(v_set.stage_name), '') is null then
      v_summary := v_source_label || U&' est\00e1 na sua agenda e come\00e7a em cerca de 30 min. Abra o evento para acompanhar a programa\00e7\00e3o.';
    else
      v_summary := v_source_label || U&' come\00e7a em cerca de 30 min em ' || left(btrim(v_set.stage_name), 80) || U&'. Abra o evento para acompanhar a programa\00e7\00e3o.';
    end if;

    v_idempotency_key :=
      'clubber_agenda:set:' || v_set.set_id::text || ':rev:' || v_set.schedule_revision::text || ':reminder30m';

    v_expires_at := coalesce(v_set.ends_at, v_set.event_ends_at, v_set.starts_at + interval '6 hours');

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
    select
      ai.user_id,
      null,
      null,
      'canonical_event_set',
      v_set.set_id,
      'clubber_agenda.reminder_30m',
      U&'Perfil Clubber \00b7 Come\00e7a em 30 min',
      left(v_summary, 280),
      jsonb_build_object(
        'source_label', v_source_label,
        'source_category', 'agenda_set',
        'event_name', v_set.event_name,
        'event_slug', v_set.event_slug,
        'profile_mode', 'clubber',
        'count', 1
      ),
      '/event/' || v_set.event_slug,
      'in_app',
      'active',
      v_idempotency_key,
      v_expires_at
    from public.clubber_event_agenda_items ai
    where ai.set_id = v_set.set_id
      and ai.canonical_event_id = v_set.canonical_event_id
      and ai.status = 'saved'
    on conflict (recipient_user_id, channel, idempotency_key)
    do nothing;

    get diagnostics v_inserted_for_set = row_count;
    v_total_inserted := v_total_inserted + v_inserted_for_set;
  end loop;

  return v_total_inserted;
end;
$function$;

revoke all on function public.mhidas_emit_event_set_revision_notifications_v1(uuid, integer)
from public, anon, authenticated;

revoke all on function public.mhidas_emit_event_set_reminders_30m_v1(timestamp with time zone, integer)
from public, anon, authenticated;

grant execute on function public.mhidas_emit_event_set_revision_notifications_v1(uuid, integer)
to service_role;

grant execute on function public.mhidas_emit_event_set_reminders_30m_v1(timestamp with time zone, integer)
to service_role;

comment on function public.mhidas_emit_event_set_revision_notifications_v1(uuid, integer) is
  'SOCIAL-4K explicit finalizer for one consolidated Clubber Agenda notification per official set schedule revision. No row trigger is created.';

comment on function public.mhidas_emit_event_set_reminders_30m_v1(timestamp with time zone, integer) is
  'SOCIAL-4K idempotent 30-minute Clubber Agenda reminder producer. No scheduler or dispatcher invocation is created.';

do $postflight$
declare
  v_registry_count integer;
begin
  select count(*)
  into v_registry_count
  from public.notification_type_registry
  where notification_type in (
    'clubber_agenda.schedule_changed',
    'clubber_agenda.performer_changed',
    'clubber_agenda.reminder_30m'
  )
    and domain = 'clubber_agenda'
    and source_type = 'canonical_event_set'
    and preference_category = 'clubber.agenda'
    and is_active = true;

  if v_registry_count <> 3 then
    raise exception 'SOCIAL_4K_C1_NOTIFICATION_REGISTRY_POSTFLIGHT_FAILED:%', v_registry_count;
  end if;

  if to_regprocedure('public.mhidas_emit_event_set_revision_notifications_v1(uuid,integer)') is null then
    raise exception 'SOCIAL_4K_C1_REVISION_EMITTER_POSTFLIGHT_FAILED';
  end if;

  if to_regprocedure('public.mhidas_emit_event_set_reminders_30m_v1(timestamp with time zone,integer)') is null then
    raise exception 'SOCIAL_4K_C1_REMINDER_EMITTER_POSTFLIGHT_FAILED';
  end if;

  if has_function_privilege(
    'anon',
    'public.mhidas_emit_event_set_revision_notifications_v1(uuid,integer)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.mhidas_emit_event_set_revision_notifications_v1(uuid,integer)',
    'EXECUTE'
  ) then
    raise exception 'SOCIAL_4K_C1_REVISION_EMITTER_CLIENT_EXECUTE_NOT_REVOKED';
  end if;

  if has_function_privilege(
    'anon',
    'public.mhidas_emit_event_set_reminders_30m_v1(timestamp with time zone,integer)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.mhidas_emit_event_set_reminders_30m_v1(timestamp with time zone,integer)',
    'EXECUTE'
  ) then
    raise exception 'SOCIAL_4K_C1_REMINDER_EMITTER_CLIENT_EXECUTE_NOT_REVOKED';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.mhidas_emit_event_set_revision_notifications_v1(uuid,integer)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.mhidas_emit_event_set_reminders_30m_v1(timestamp with time zone,integer)',
    'EXECUTE'
  ) then
    raise exception 'SOCIAL_4K_C1_SERVICE_ROLE_EXECUTE_MISSING';
  end if;
end
$postflight$;

commit;