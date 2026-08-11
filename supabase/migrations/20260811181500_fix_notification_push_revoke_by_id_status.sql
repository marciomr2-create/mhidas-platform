-- MHIDAS / USECLUBBERS V4.8.161
-- Fix internal push subscription revocation invariant.
-- V4.8.156 set revoked_at without changing status,
-- violating notification_push_subscriptions_status_timestamps_check.

begin;

create or replace function public.mhidas_revoke_notification_push_subscription_by_id(
  p_push_subscription_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_affected integer := 0;
begin
  if p_push_subscription_id is null then
    return false;
  end if;

  update public.notification_push_subscriptions
  set
    status = 'revoked',
    revoked_at = coalesce(revoked_at, now()),
    invalidated_at = null,
    updated_at = now()
  where subscription_id = p_push_subscription_id
    and status = 'active'
    and revoked_at is null
    and invalidated_at is null;

  get diagnostics v_affected = row_count;
  return v_affected > 0;
end;
$function$;

revoke all on function public.mhidas_revoke_notification_push_subscription_by_id(uuid)
  from public, anon, authenticated;

grant execute on function public.mhidas_revoke_notification_push_subscription_by_id(uuid)
  to service_role;

comment on function public.mhidas_revoke_notification_push_subscription_by_id(uuid) is
  'Revokes one active push subscription by ID while preserving the V4.8.155 status/timestamp invariant.';

commit;
