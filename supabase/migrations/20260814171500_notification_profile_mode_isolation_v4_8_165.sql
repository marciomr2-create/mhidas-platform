-- MHIDAS / USECLUBBERS
-- V4.8.165-B3
-- Notification profile-mode isolation.
--
-- Clubber and Professional relationship controls must remain independent.
-- Legacy notifications without profile_mode preserve the previous behavior.
-- No historical migration is edited.

begin;

do $dependencies$
begin
  if to_regclass('public.professional_relationship_controls') is null
    or to_regclass('public.clubber_relationship_controls') is null
    or to_regclass('public.social_notifications') is null
  then
    raise exception
      'V4_8_165_B3_REQUIRED_TABLE_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_social_notification_payload_is_safe(jsonb)'
  ) is null
    or to_regprocedure(
      'public.mhidas_social_notification_relationship_control_exists(uuid,uuid)'
    ) is null
    or to_regprocedure(
      'public.mhidas_create_social_notification(uuid,uuid,text,uuid,text,text,text,text,text,jsonb,timestamp with time zone)'
    ) is null
  then
    raise exception
      'V4_8_165_B3_REQUIRED_FUNCTION_DEPENDENCY_MISSING';
  end if;
end
$dependencies$;

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
        'profile_mode',
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

create or replace function
  public.mhidas_social_notification_relationship_control_exists(
    p_left_user_id uuid,
    p_right_user_id uuid,
    p_profile_mode text
  )
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_profile_mode text :=
    lower(btrim(coalesce(p_profile_mode, '')));
  v_exists boolean := false;
begin
  if p_left_user_id is null
    or p_right_user_id is null
    or p_left_user_id = p_right_user_id
  then
    return false;
  end if;

  if v_profile_mode = 'clubber' then
    select exists (
      select 1
      from public.clubber_relationship_controls crc
      where crc.status in ('blocked', 'suspended')
        and (
          (
            crc.owner_user_id = p_left_user_id
            and crc.target_user_id = p_right_user_id
          )
          or
          (
            crc.owner_user_id = p_right_user_id
            and crc.target_user_id = p_left_user_id
          )
        )
    )
    into v_exists;

    return v_exists;
  end if;

  if v_profile_mode = 'professional' then
    select exists (
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
    into v_exists;

    return v_exists;
  end if;

  return
    public.mhidas_social_notification_relationship_control_exists(
      p_left_user_id,
      p_right_user_id
    );
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
  v_profile_mode text :=
    lower(btrim(coalesce(p_payload ->> 'profile_mode', '')));
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

  if v_profile_mode <> ''
    and v_profile_mode not in ('clubber', 'professional')
  then
    raise exception using
      errcode = 'P0001',
      message = 'notification_profile_mode_invalid';
  end if;

  if public.mhidas_social_notification_relationship_control_exists(
    v_actor_user_id,
    p_recipient_user_id,
    nullif(v_profile_mode, '')
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

revoke all on function
  public.mhidas_social_notification_relationship_control_exists(
    uuid,
    uuid,
    text
  )
from public, anon, authenticated, service_role;

revoke all on function
  public.mhidas_create_social_notification(
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
  )
from public, anon, authenticated, service_role;

comment on function
  public.mhidas_social_notification_relationship_control_exists(
    uuid,
    uuid,
    text
  ) is
  'V4.8.165 identity-aware notification relationship-control resolver.';

comment on function
  public.mhidas_create_social_notification(
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
  'Internal social notification creator with explicit Clubber and Professional isolation.';

do $self_check$
declare
  v_definition text;
  v_exposed integer;
begin
  if to_regprocedure(
    'public.mhidas_social_notification_relationship_control_exists(uuid,uuid,text)'
  ) is null
  then
    raise exception
      'V4_8_165_B3_CONTEXT_HELPER_MISSING';
  end if;

  select pg_get_functiondef(
    to_regprocedure(
      'public.mhidas_social_notification_payload_is_safe(jsonb)'
    )
  )
  into v_definition;

  if position(
    '''profile_mode''' in v_definition
  ) = 0
  then
    raise exception
      'V4_8_165_B3_PROFILE_MODE_ALLOWLIST_MISSING';
  end if;

  select pg_get_functiondef(
    to_regprocedure(
      'public.mhidas_create_social_notification(uuid,uuid,text,uuid,text,text,text,text,text,jsonb,timestamp with time zone)'
    )
  )
  into v_definition;

  if position(
    'notification_profile_mode_invalid' in v_definition
  ) = 0
    or position(
      'nullif(v_profile_mode, '''')' in v_definition
    ) = 0
  then
    raise exception
      'V4_8_165_B3_CREATOR_PROFILE_MODE_ROUTING_MISSING';
  end if;

  select pg_get_functiondef(
    to_regprocedure(
      'public.mhidas_social_notification_relationship_control_exists(uuid,uuid,text)'
    )
  )
  into v_definition;

  if position(
    'clubber_relationship_controls' in v_definition
  ) = 0
    or position(
      'professional_relationship_controls' in v_definition
    ) = 0
  then
    raise exception
      'V4_8_165_B3_IDENTITY_CONTROL_ROUTING_MISSING';
  end if;

  select count(*)
  into v_exposed
  from (
    values
      (
        'public.mhidas_social_notification_relationship_control_exists(uuid,uuid,text)'
      ),
      (
        'public.mhidas_create_social_notification(uuid,uuid,text,uuid,text,text,text,text,text,jsonb,timestamp with time zone)'
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
      'V4_8_165_B3_INTERNAL_FUNCTION_EXPOSED';
  end if;
end
$self_check$;

commit;