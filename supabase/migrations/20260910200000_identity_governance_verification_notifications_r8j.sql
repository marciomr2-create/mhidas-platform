-- MHIDAS / USECLUBBERS
-- R8J — verification notifications + transactional email outbox producer
-- LOCAL MIGRATION ONLY. Do not apply to STAGING/Production without explicit approval.

begin;

do $dependencies$
begin
  if to_regclass('public.entity_verification_requests') is null
    or to_regclass('public.verification_email_outbox') is null
    or to_regclass('public.social_notifications') is null
    or to_regclass('public.notification_type_registry') is null
  then
    raise exception 'R8J_REQUIRED_DEPENDENCY_MISSING';
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
    'entity_verification.submitted',
    'identity_governance',
    'entity_verification_request',
    'transactional',
    array['in_app','badge']::public.notification_delivery_channel[],
    'none',
    'identity.verification',
    'sensitive',
    true,
    false,
    null
  ),
  (
    'entity_verification.in_review',
    'identity_governance',
    'entity_verification_request',
    'transactional',
    array['in_app','badge']::public.notification_delivery_channel[],
    'none',
    'identity.verification',
    'sensitive',
    true,
    false,
    null
  ),
  (
    'entity_verification.more_info_required',
    'identity_governance',
    'entity_verification_request',
    'transactional',
    array['in_app','badge']::public.notification_delivery_channel[],
    'none',
    'identity.verification',
    'sensitive',
    true,
    false,
    null
  ),
  (
    'entity_verification.approved',
    'identity_governance',
    'entity_verification_request',
    'transactional',
    array['in_app','badge']::public.notification_delivery_channel[],
    'none',
    'identity.verification',
    'sensitive',
    true,
    false,
    null
  ),
  (
    'entity_verification.rejected',
    'identity_governance',
    'entity_verification_request',
    'transactional',
    array['in_app','badge']::public.notification_delivery_channel[],
    'none',
    'identity.verification',
    'sensitive',
    true,
    false,
    null
  ),
  (
    'entity_verification.suspended',
    'identity_governance',
    'entity_verification_request',
    'critical',
    array['in_app','badge']::public.notification_delivery_channel[],
    'none',
    'identity.verification',
    'sensitive',
    true,
    true,
    null
  ),
  (
    'entity_verification.revoked',
    'identity_governance',
    'entity_verification_request',
    'critical',
    array['in_app','badge']::public.notification_delivery_channel[],
    'none',
    'identity.verification',
    'sensitive',
    true,
    true,
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

create or replace function public.mhidas_entity_verification_notification_trigger_v1()
returns trigger
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_notification_type text;
  v_title text;
  v_summary text;
  v_idempotency_key text;
  v_email_template_key text;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'submitted' then
      return new;
    end if;
  elsif old.status is not distinct from new.status then
    return new;
  end if;

  case new.status
    when 'submitted' then
      v_notification_type := 'entity_verification.submitted';
      v_title := 'Verificação · Solicitação enviada';
      v_summary := 'Recebemos sua solicitação. Acompanhe o andamento na Central de Verificação.';
      v_email_template_key := 'entity_verification.submitted';

    when 'in_review' then
      v_notification_type := 'entity_verification.in_review';
      v_title := 'Verificação · Análise iniciada';
      v_summary := 'Sua solicitação está em análise pela equipe USECLUBBERS.';
      v_email_template_key := null;

    when 'more_info_required' then
      v_notification_type := 'entity_verification.more_info_required';
      v_title := 'Verificação · Precisamos de mais informações';
      v_summary := 'Há uma nova orientação da equipe de verificação. Abra a Central para continuar.';
      v_email_template_key := 'entity_verification.more_info_required';

    when 'approved' then
      v_notification_type := 'entity_verification.approved';
      v_title := 'Verificação · Identidade aprovada';
      v_summary := 'Sua solicitação foi aprovada. A identidade e o vínculo foram confirmados.';
      v_email_template_key := 'entity_verification.approved';

    when 'rejected' then
      v_notification_type := 'entity_verification.rejected';
      v_title := 'Verificação · Solicitação não aprovada';
      v_summary := 'A decisão está disponível na Central de Verificação.';
      v_email_template_key := 'entity_verification.rejected';

    when 'suspended' then
      v_notification_type := 'entity_verification.suspended';
      v_title := 'Verificação · Identidade suspensa';
      v_summary := 'Existe uma atualização importante sobre esta identidade na Central de Verificação.';
      v_email_template_key := 'entity_verification.suspended';

    when 'revoked' then
      v_notification_type := 'entity_verification.revoked';
      v_title := 'Verificação · Verificação revogada';
      v_summary := 'Existe uma atualização importante sobre esta identidade na Central de Verificação.';
      v_email_template_key := 'entity_verification.revoked';

    else
      return new;
  end case;

  v_idempotency_key :=
    'entity_verification:' || new.request_id::text || ':' || new.status;

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
    idempotency_key
  )
  values (
    new.requester_user_id,
    null,
    null,
    'entity_verification_request',
    new.request_id,
    v_notification_type,
    v_title,
    v_summary,
    jsonb_build_object(
      'request_status', new.status
    ),
    '/account/verification',
    'in_app',
    'active',
    v_idempotency_key
  )
  on conflict (recipient_user_id, channel, idempotency_key)
  do nothing;

  if v_email_template_key is not null then
    insert into public.verification_email_outbox (
      request_id,
      recipient_user_id,
      template_key,
      recipient_email,
      status,
      idempotency_key,
      available_at
    )
    values (
      new.request_id,
      new.requester_user_id,
      v_email_template_key,
      lower(btrim(new.contact_email)),
      'pending',
      v_idempotency_key || ':email',
      now()
    )
    on conflict (idempotency_key)
    do nothing;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_entity_verification_notifications_r8j
  on public.entity_verification_requests;

create trigger trg_entity_verification_notifications_r8j
after insert or update of status
on public.entity_verification_requests
for each row
execute function public.mhidas_entity_verification_notification_trigger_v1();

revoke all on function
  public.mhidas_entity_verification_notification_trigger_v1()
from public, anon, authenticated, service_role;

comment on function public.mhidas_entity_verification_notification_trigger_v1() is
  'R8J transactional producer for governed in-app verification notifications and verification email outbox jobs.';

do $postflight$
declare
  v_registry_count integer;
begin
  select count(*)
  into v_registry_count
  from public.notification_type_registry
  where notification_type in (
    'entity_verification.submitted',
    'entity_verification.in_review',
    'entity_verification.more_info_required',
    'entity_verification.approved',
    'entity_verification.rejected',
    'entity_verification.suspended',
    'entity_verification.revoked'
  )
    and source_type = 'entity_verification_request'
    and is_active = true;

  if v_registry_count <> 7 then
    raise exception 'R8J_NOTIFICATION_REGISTRY_POSTFLIGHT_FAILED:%', v_registry_count;
  end if;

  if not exists (
    select 1
    from pg_trigger t
    where t.tgrelid = 'public.entity_verification_requests'::regclass
      and t.tgname = 'trg_entity_verification_notifications_r8j'
      and not t.tgisinternal
  ) then
    raise exception 'R8J_NOTIFICATION_TRIGGER_POSTFLIGHT_FAILED';
  end if;

  if to_regprocedure(
    'public.mhidas_entity_verification_notification_trigger_v1()'
  ) is null then
    raise exception 'R8J_NOTIFICATION_FUNCTION_POSTFLIGHT_FAILED';
  end if;
end
$postflight$;

commit;
