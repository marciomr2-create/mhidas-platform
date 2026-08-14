-- V4.8.165-C
-- Clubber ticket-offer opportunity notifications.
--
-- This migration covers ONLY the Clubber-to-Clubber ticket offer
-- created when a Clubber gives up attending and publishes the ticket.
--
-- Official ticket sales through the USECLUBBERS controlled commercial
-- link remain a separate admin-authorized ticketing workflow.

begin;

do $dependencies$
declare
  v_missing_event_columns integer;
begin
  if to_regclass('public.event_ticket_intents') is null
    or to_regclass('public.event_groups') is null
    or to_regclass('public.clubber_connections') is null
    or to_regclass('public.clubber_relationship_controls') is null
    or to_regclass('public.notification_type_registry') is null
    or to_regclass('public.social_notifications') is null
  then
    raise exception
      'V4_8_165_C_TICKET_REQUIRED_TABLE_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_create_social_notification(uuid,uuid,text,uuid,text,text,text,text,text,jsonb,timestamp with time zone)'
  ) is null
    or to_regprocedure(
      'public.mhidas_set_social_notifications_state_by_source(text,uuid,text,text)'
    ) is null
    or to_regprocedure(
      'public.mhidas_get_clubber_notification_context(uuid)'
    ) is null
  then
    raise exception
      'V4_8_165_C_TICKET_REQUIRED_FUNCTION_DEPENDENCY_MISSING';
  end if;

  select count(*)
  into v_missing_event_columns
  from (
    values
      ('group_id'),
      ('event_name'),
      ('event_slug')
  ) expected(column_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'event_groups'
      and c.column_name = expected.column_name
  );

  if v_missing_event_columns <> 0 then
    raise exception
      'V4_8_165_C_TICKET_EVENT_GROUP_COLUMNS_MISSING:%',
      v_missing_event_columns;
  end if;
end
$dependencies$;

-- ================================================================
-- REGISTRY
-- ================================================================

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
values (
  'clubber_ticket_offer.available',
  'clubber_ticket_network',
  'clubber_ticket_offer',
  'transactional',
  array[
    'in_app',
    'badge',
    'push'
  ]::public.notification_delivery_channel[],
  'none',
  'clubber.ticket_opportunities',
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
  push_requires_explicit_consent =
    excluded.push_requires_explicit_consent,
  quiet_hours_bypass =
    excluded.quiet_hours_bypass,
  default_expires_after_seconds =
    excluded.default_expires_after_seconds;

-- ================================================================
-- PRODUCER
-- ================================================================

create or replace function
  public.mhidas_clubber_ticket_offer_notification_trigger()
returns trigger
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();

  v_old_offer_status text := '';

  v_new_offer_status text :=
    lower(
      btrim(
        coalesce(
          new.metadata
            -> 'ticket_network_availability'
            ->> 'status',
          ''
        )
      )
    );

  v_event_name text;
  v_event_slug text;
  v_internal_url text;

  v_actor_slug text;
  v_actor_label text;

  v_recipient_user_id uuid;

  v_cycle_key text;
begin
  if v_actor_user_id is null then
    return new;
  end if;

  if new.user_id <> v_actor_user_id then
    raise exception
      'V4_8_165_C_TICKET_ACTOR_MISMATCH';
  end if;

  if tg_op = 'UPDATE' then
    v_old_offer_status :=
      lower(
        btrim(
          coalesce(
            old.metadata
              -> 'ticket_network_availability'
              ->> 'status',
            ''
          )
        )
      );
  end if;

  -- Offer stopped being available.
  if tg_op = 'UPDATE'
    and v_old_offer_status = 'available'
    and (
      new.status <> 'cancelled'
      or v_new_offer_status <> 'available'
    )
  then
    perform
      public.mhidas_set_social_notifications_state_by_source(
        'clubber_ticket_offer',
        new.intent_id,
        'invalidated',
        'clubber_ticket_offer_unavailable'
      );
  end if;

  -- Only an available ticket from a cancelled Clubber journey
  -- can become an opportunity.
  if new.status <> 'cancelled'
    or v_new_offer_status <> 'available'
  then
    return new;
  end if;

  -- Price, quantity, lot or note edits while still available
  -- do not create another notification.
  if tg_op = 'UPDATE'
    and old.status = 'cancelled'
    and v_old_offer_status = 'available'
  then
    return new;
  end if;

  select
    nullif(btrim(eg.event_name), ''),
    lower(nullif(btrim(eg.event_slug), ''))
  into
    v_event_name,
    v_event_slug
  from public.event_groups eg
  where eg.group_id = new.event_group_id;

  if v_event_name is null then
    raise exception
      'V4_8_165_C_TICKET_EVENT_NAME_MISSING';
  end if;

  if v_event_slug is null
    or v_event_slug !~ '^[a-z0-9][a-z0-9._~-]{0,199}$'
  then
    raise exception
      'V4_8_165_C_TICKET_EVENT_SLUG_INVALID';
  end if;

  v_internal_url :=
    '/event/' || v_event_slug;

  select
    c.profile_slug,
    c.profile_label
  into
    v_actor_slug,
    v_actor_label
  from public.mhidas_get_clubber_notification_context(
    new.user_id
  ) c;

  if v_actor_slug is null
    or v_actor_label is null
  then
    raise exception
      'V4_8_165_C_TICKET_CLUBBER_CONTEXT_MISSING';
  end if;

  -- New transition to available = new opportunity cycle.
  v_cycle_key :=
    md5(new.updated_at::text);

  for v_recipient_user_id in
    select distinct
      case
        when cc.requester_user_id = new.user_id
        then cc.target_user_id
        else cc.requester_user_id
      end
    from public.clubber_connections cc
    join public.event_ticket_intents recipient_intent
      on recipient_intent.user_id =
        case
          when cc.requester_user_id = new.user_id
          then cc.target_user_id
          else cc.requester_user_id
        end
      and recipient_intent.event_group_id =
        new.event_group_id
      and recipient_intent.status =
        'wants_ticket'
    where cc.status = 'accepted'
      and (
        cc.requester_user_id = new.user_id
        or cc.target_user_id = new.user_id
      )
  loop
    perform public.mhidas_create_social_notification(
      v_recipient_user_id,
      new.event_group_id,
      'clubber_ticket_offer',
      new.intent_id,
      'clubber_ticket_offer.available',
      'clubber_ticket_offer:' ||
        new.intent_id::text ||
        ':available:' ||
        v_cycle_key,
      'Perfil Clubber · Ingresso disponível',
      v_internal_url,
      v_actor_label ||
        ' disponibilizou um ingresso para ' ||
        v_event_name ||
        '. Você marcou que está procurando ingresso.',
      jsonb_build_object(
        'actor_label', v_actor_label,
        'actor_slug', v_actor_slug,
        'source_label', v_event_name,
        'source_category', 'ticket_opportunity',
        'event_name', v_event_name,
        'event_slug', v_event_slug,
        'profile_slug', v_actor_slug,
        'profile_mode', 'clubber',
        'entity_status', 'available'
      ),
      null
    );
  end loop;

  return new;
end;
$function$;

-- ================================================================
-- TRIGGER
-- ================================================================

drop trigger if exists
  trg_clubber_ticket_offer_notifications
on public.event_ticket_intents;

create trigger
  trg_clubber_ticket_offer_notifications
after insert or update of status, metadata
on public.event_ticket_intents
for each row
execute function
  public.mhidas_clubber_ticket_offer_notification_trigger();

-- ================================================================
-- PRIVILEGES
-- ================================================================

revoke all on function
  public.mhidas_clubber_ticket_offer_notification_trigger()
from public, anon, authenticated, service_role;

comment on function
  public.mhidas_clubber_ticket_offer_notification_trigger()
is
  'V4.8.165 Perfil Clubber ticket-offer opportunity producer.';

-- ================================================================
-- SELF CHECK
-- ================================================================

do $self_check$
declare
  v_definition text;
  v_registry_count integer;
  v_trigger_count integer;
  v_exposed integer;
begin
  select count(*)
  into v_registry_count
  from public.notification_type_registry ntr
  where ntr.notification_type =
      'clubber_ticket_offer.available'
    and ntr.domain =
      'clubber_ticket_network'
    and ntr.source_type =
      'clubber_ticket_offer'
    and ntr.preference_category =
      'clubber.ticket_opportunities'
    and ntr.push_requires_explicit_consent
    and not ntr.quiet_hours_bypass
    and 'in_app'::public.notification_delivery_channel =
      any(ntr.default_channels)
    and 'badge'::public.notification_delivery_channel =
      any(ntr.default_channels)
    and 'push'::public.notification_delivery_channel =
      any(ntr.default_channels);

  if v_registry_count <> 1 then
    raise exception
      'V4_8_165_C_TICKET_REGISTRY_POLICY_FAILED';
  end if;

  if to_regprocedure(
    'public.mhidas_clubber_ticket_offer_notification_trigger()'
  ) is null
  then
    raise exception
      'V4_8_165_C_TICKET_FUNCTION_MISSING';
  end if;

  select pg_get_functiondef(
    to_regprocedure(
      'public.mhidas_clubber_ticket_offer_notification_trigger()'
    )
  )
  into v_definition;

  if position(
    'clubber_connections'
    in v_definition
  ) = 0
    or position(
      'wants_ticket'
      in v_definition
    ) = 0
    or position(
      '''profile_mode'', ''clubber'''
      in v_definition
    ) = 0
    or position(
      'clubber_ticket_offer.available'
      in v_definition
    ) = 0
    or position(
      'mhidas_set_social_notifications_state_by_source'
      in v_definition
    ) = 0
  then
    raise exception
      'V4_8_165_C_TICKET_PRODUCER_POLICY_FAILED';
  end if;

  if position(
    'professional_connections'
    in v_definition
  ) <> 0
    or position(
      'professional_relationship_controls'
      in v_definition
    ) <> 0
  then
    raise exception
      'V4_8_165_C_TICKET_PROFESSIONAL_GRAPH_LEAK';
  end if;

  select count(*)
  into v_trigger_count
  from pg_trigger t
  join pg_class c
    on c.oid = t.tgrelid
  join pg_namespace n
    on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'event_ticket_intents'
    and t.tgname =
      'trg_clubber_ticket_offer_notifications'
    and not t.tgisinternal
    and t.tgenabled <> 'D';

  if v_trigger_count <> 1 then
    raise exception
      'V4_8_165_C_TICKET_TRIGGER_MISSING';
  end if;

  select count(*)
  into v_exposed
  from (
    values
      (
        'public.mhidas_clubber_ticket_offer_notification_trigger()'
      )
  ) expected(signature)
  cross join (
    values
      ('public'),
      ('anon'),
      ('authenticated'),
      ('service_role')
  ) role_name(role_name)
  where has_function_privilege(
    role_name.role_name,
    expected.signature,
    'EXECUTE'
  );

  if v_exposed <> 0 then
    raise exception
      'V4_8_165_C_TICKET_INTERNAL_FUNCTION_EXPOSED';
  end if;
end
$self_check$;

commit;