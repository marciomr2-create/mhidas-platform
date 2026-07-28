-- v4.8.133 — public Clubber onboarding ACL hardening
-- Removes anonymous execution from onboarding RPCs while preserving
-- authenticated and service-role execution.

begin;

revoke all
on function public.check_public_username_availability(text)
from public;

revoke all
on function public.check_public_username_availability(text)
from anon;

revoke all
on function public.create_public_clubber_identity(text, text, text, text)
from public;

revoke all
on function public.create_public_clubber_identity(text, text, text, text)
from anon;

grant execute
on function public.check_public_username_availability(text)
to authenticated;

grant execute
on function public.check_public_username_availability(text)
to service_role;

grant execute
on function public.create_public_clubber_identity(text, text, text, text)
to authenticated;

grant execute
on function public.create_public_clubber_identity(text, text, text, text)
to service_role;

do $$
declare
  v_anon_oid oid;
begin
  select oid
  into v_anon_oid
  from pg_roles
  where rolname = 'anon';

  if v_anon_oid is null then
    raise exception 'V4_8_133_ANON_ROLE_NOT_FOUND';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    cross join lateral aclexplode(
      coalesce(
        p.proacl,
        acldefault('f', p.proowner)
      )
    ) acl
    where
      n.nspname = 'public'
      and p.proname in (
        'check_public_username_availability',
        'create_public_clubber_identity'
      )
      and acl.privilege_type = 'EXECUTE'
      and acl.grantee in (0, v_anon_oid)
  ) then
    raise exception 'V4_8_133_ANON_OR_PUBLIC_EXECUTE_REMAINS';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.check_public_username_availability(text)',
    'EXECUTE'
  ) then
    raise exception 'V4_8_133_AUTHENTICATED_USERNAME_CHECK_EXECUTE_MISSING';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.create_public_clubber_identity(text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'V4_8_133_AUTHENTICATED_IDENTITY_CREATE_EXECUTE_MISSING';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.check_public_username_availability(text)',
    'EXECUTE'
  ) then
    raise exception 'V4_8_133_SERVICE_ROLE_USERNAME_CHECK_EXECUTE_MISSING';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.create_public_clubber_identity(text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'V4_8_133_SERVICE_ROLE_IDENTITY_CREATE_EXECUTE_MISSING';
  end if;
end
$$;

comment on function public.check_public_username_availability(text)
is 'Checks public username availability for authenticated users. Anonymous execution is blocked.';

comment on function public.create_public_clubber_identity(text, text, text, text)
is 'Creates one public Clubber digital identity for the authenticated user without requiring NFC. Anonymous execution is blocked.';

commit;
