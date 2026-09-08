-- MHIDAS / USECLUBBERS
-- R8E-J - Atomic final approval for identity verification.
-- Local source of truth. Do not apply to Production without explicit approval.
-- STAGING application must remain controlled and UNLINKED_SAFE.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

do $preflight$
begin
  if to_regclass('public.official_entities') is null
     or to_regclass('public.public_identity_handles') is null
     or to_regclass('public.entity_memberships') is null
     or to_regclass('public.entity_verification_requests') is null
     or to_regclass('public.entity_verification_audit_log') is null
     or to_regclass('public.platform_admin_memberships') is null then
    raise exception 'MHIDAS_R8E_J_REQUIRED_TABLE_MISSING';
  end if;

  if to_regprocedure(
    'public.mhidas_assert_universal_public_handle_v1(text,text,uuid,uuid)'
  ) is null then
    raise exception 'MHIDAS_R8E_J_HANDLE_ASSERTION_MISSING';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger t
    where t.tgrelid = to_regclass('public.official_entities')
      and t.tgname = 'trg_official_entities_validate_universal_public_handle'
      and not t.tgisinternal
  ) then
    raise exception 'MHIDAS_R8E_J_HANDLE_VALIDATION_TRIGGER_MISSING';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger t
    where t.tgrelid = to_regclass('public.official_entities')
      and t.tgname = 'trg_official_entities_sync_universal_public_handle'
      and not t.tgisinternal
  ) then
    raise exception 'MHIDAS_R8E_J_HANDLE_SYNC_TRIGGER_MISSING';
  end if;
end;
$preflight$;

create or replace function public.mhidas_approve_entity_verification_request_v1(
  p_request_id uuid,
  p_actor_user_id uuid,
  p_decision_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_request public.entity_verification_requests%rowtype;
  v_entity public.official_entities%rowtype;
  v_authority_role text;
  v_handle text;
  v_reason text;
  v_previous_status text;
begin
  if p_request_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'request_id_required';
  end if;

  if p_actor_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'actor_user_id_required';
  end if;

  select pam.role
  into v_authority_role
  from public.platform_admin_memberships pam
  where pam.user_id = p_actor_user_id
    and pam.status = 'active'
    and pam.role in (
      'verification_reviewer',
      'verification_admin',
      'platform_admin'
    )
  order by
    case pam.role
      when 'platform_admin' then 1
      when 'verification_admin' then 2
      when 'verification_reviewer' then 3
      else 99
    end
  limit 1;

  if v_authority_role is null then
    raise exception using
      errcode = 'P0001',
      message = 'verification_authority_required';
  end if;

  if p_decision_reason is null then
    v_reason := null;
  else
    v_reason := nullif(btrim(p_decision_reason), '');

    if v_reason is not null
       and (
         char_length(v_reason) > 1000
         or v_reason ~ '[[:cntrl:]]'
       ) then
      raise exception using
        errcode = 'P0001',
        message = 'invalid_decision_reason';
    end if;
  end if;

  select r.*
  into v_request
  from public.entity_verification_requests r
  where r.request_id = p_request_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'verification_request_not_found';
  end if;

  if v_request.status = 'approved' then
    if v_request.entity_id is null then
      raise exception using
        errcode = 'P0001',
        message = 'approved_request_missing_entity';
    end if;

    select oe.*
    into v_entity
    from public.official_entities oe
    where oe.entity_id = v_request.entity_id;

    if not found or v_entity.public_handle is null then
      raise exception using
        errcode = 'P0001',
        message = 'approved_request_entity_incomplete';
    end if;

    v_handle := public.normalize_public_username(
      v_entity.public_handle
    );

    if not exists (
      select 1
      from public.entity_memberships em
      where em.entity_id = v_entity.entity_id
        and em.user_id = v_request.requester_user_id
        and em.role = 'owner'
        and em.status = 'active'
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'approved_request_membership_incomplete';
    end if;

    if not exists (
      select 1
      from public.public_identity_handles h
      where h.normalized_handle = v_handle
        and h.subject_kind = 'entity'
        and h.entity_id = v_entity.entity_id
        and h.is_current = true
        and h.reservation_status = 'current'
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'approved_request_handle_incomplete';
    end if;

    return jsonb_build_object(
      'request_id', v_request.request_id,
      'entity_id', v_entity.entity_id,
      'request_kind', v_request.request_kind,
      'status', v_request.status,
      'public_handle', v_handle,
      'membership_role', 'owner',
      'already_approved', true
    );
  end if;

  if v_request.status not in (
    'in_review',
    'more_info_required'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'verification_request_not_approvable';
  end if;

  v_previous_status := v_request.status;

  if v_request.request_kind = 'create' then
    if v_request.entity_id is not null then
      raise exception using
        errcode = 'P0001',
        message = 'create_request_entity_must_be_null';
    end if;

    if v_request.requested_handle is null then
      raise exception using
        errcode = 'P0001',
        message = 'create_request_handle_required';
    end if;

    v_handle := public.mhidas_assert_universal_public_handle_v1(
      v_request.requested_handle,
      'entity',
      null,
      null
    );

    insert into public.official_entities (
      entity_type,
      organization_type,
      display_name,
      public_handle,
      lifecycle_status,
      verification_status,
      created_by_user_id
    )
    values (
      v_request.requested_entity_type,
      v_request.requested_organization_type,
      v_request.requested_display_name,
      v_handle,
      'active',
      'verified',
      v_request.requester_user_id
    )
    returning *
    into v_entity;

  elsif v_request.request_kind = 'claim' then
    if v_request.entity_id is null then
      raise exception using
        errcode = 'P0001',
        message = 'claim_request_entity_required';
    end if;

    select oe.*
    into v_entity
    from public.official_entities oe
    where oe.entity_id = v_request.entity_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'claim_entity_not_found';
    end if;

    if v_entity.lifecycle_status not in (
         'pending_review',
         'active'
       )
       or v_entity.verification_status not in (
         'unverified',
         'pending',
         'in_review',
         'verified'
       ) then
      raise exception using
        errcode = 'P0001',
        message = 'claim_entity_not_claimable';
    end if;

    if v_entity.entity_type <> v_request.requested_entity_type then
      raise exception using
        errcode = 'P0001',
        message = 'claim_entity_type_mismatch';
    end if;

    if v_entity.public_handle is null then
      raise exception using
        errcode = 'P0001',
        message = 'claim_entity_handle_required';
    end if;

    v_handle := public.mhidas_assert_universal_public_handle_v1(
      v_entity.public_handle,
      'entity',
      null,
      v_entity.entity_id
    );

    if v_request.requested_handle is null
       or public.normalize_public_username(
         v_request.requested_handle
       ) <> v_handle then
      raise exception using
        errcode = 'P0001',
        message = 'claim_request_handle_drift';
    end if;

    update public.official_entities oe
    set
      public_handle = v_handle,
      lifecycle_status = 'active',
      verification_status = 'verified'
    where oe.entity_id = v_entity.entity_id
    returning *
    into v_entity;

  else
    raise exception using
      errcode = 'P0001',
      message = 'invalid_request_kind';
  end if;

  insert into public.entity_memberships (
    entity_id,
    user_id,
    role,
    status,
    invited_by_user_id
  )
  values (
    v_entity.entity_id,
    v_request.requester_user_id,
    'owner',
    'active',
    p_actor_user_id
  )
  on conflict (entity_id, user_id)
  do update set
    role = 'owner',
    status = 'active',
    invited_by_user_id = excluded.invited_by_user_id,
    updated_at = now();

  if not exists (
    select 1
    from public.public_identity_handles h
    where h.normalized_handle = v_handle
      and h.subject_kind = 'entity'
      and h.entity_id = v_entity.entity_id
      and h.is_current = true
      and h.reservation_status = 'current'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'entity_public_handle_not_reserved';
  end if;

  update public.entity_verification_requests r
  set
    entity_id = v_entity.entity_id,
    status = 'approved',
    reviewed_by_user_id = p_actor_user_id,
    reviewed_at = now(),
    decision_reason = v_reason
  where r.request_id = v_request.request_id;

  insert into public.entity_verification_audit_log (
    request_id,
    entity_id,
    actor_user_id,
    actor_kind,
    action,
    previous_status,
    new_status,
    reason,
    metadata
  )
  values (
    v_request.request_id,
    v_entity.entity_id,
    p_actor_user_id,
    'reviewer',
    'verification.request_approved',
    v_previous_status,
    'approved',
    v_reason,
    jsonb_build_object(
      'authority_role', v_authority_role,
      'source', 'verification_reviewer_panel',
      'request_kind', v_request.request_kind,
      'atomic_approval_version', 'v1'
    )
  );

  return jsonb_build_object(
    'request_id', v_request.request_id,
    'entity_id', v_entity.entity_id,
    'request_kind', v_request.request_kind,
    'status', 'approved',
    'public_handle', v_handle,
    'membership_role', 'owner',
    'already_approved', false
  );
end;
$function$;

revoke all on function public.mhidas_approve_entity_verification_request_v1(
  uuid,
  uuid,
  text
) from public, anon, authenticated, service_role;

grant execute on function public.mhidas_approve_entity_verification_request_v1(
  uuid,
  uuid,
  text
) to service_role;

comment on function public.mhidas_approve_entity_verification_request_v1(
  uuid,
  uuid,
  text
) is
'Atomically approves a create or claim verification request, guaranteeing official entity, owner membership and universal public handle consistency. Service-role only.';

do $validation$
declare
  v_security_definer boolean;
  v_configuration text[];
begin
  if to_regprocedure(
    'public.mhidas_approve_entity_verification_request_v1(uuid,uuid,text)'
  ) is null then
    raise exception 'MHIDAS_R8E_J_APPROVAL_FUNCTION_MISSING';
  end if;

  select
    p.prosecdef,
    p.proconfig
  into
    v_security_definer,
    v_configuration
  from pg_catalog.pg_proc p
  where p.oid = to_regprocedure(
    'public.mhidas_approve_entity_verification_request_v1(uuid,uuid,text)'
  );

  if v_security_definer is distinct from true then
    raise exception 'MHIDAS_R8E_J_SECURITY_DEFINER_FAILED';
  end if;

  if not (
    'search_path=pg_catalog, public' =
    any(coalesce(v_configuration, array[]::text[]))
  ) then
    raise exception 'MHIDAS_R8E_J_SEARCH_PATH_FAILED';
  end if;

  if not pg_catalog.has_function_privilege(
    'service_role',
    'public.mhidas_approve_entity_verification_request_v1(uuid,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'MHIDAS_R8E_J_SERVICE_ROLE_GRANT_FAILED';
  end if;

  if pg_catalog.has_function_privilege(
    'authenticated',
    'public.mhidas_approve_entity_verification_request_v1(uuid,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'MHIDAS_R8E_J_AUTHENTICATED_EXECUTE_NOT_REVOKED';
  end if;

  if pg_catalog.has_function_privilege(
    'anon',
    'public.mhidas_approve_entity_verification_request_v1(uuid,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'MHIDAS_R8E_J_ANON_EXECUTE_NOT_REVOKED';
  end if;
end;
$validation$;

commit;