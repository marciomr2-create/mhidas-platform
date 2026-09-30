begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

create function public.mhidas_record_qr_encounter_v1(p_slug text)
returns table (
  encounter_id uuid,
  owner_user_id uuid,
  visitor_user_id uuid,
  outcome text
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor uuid := auth.uid();
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_owner uuid;
  v_card uuid;
  v_encounter uuid;
begin
  if v_actor is null then
    raise exception 'qr_encounter_auth_required';
  end if;

  select c.user_id, c.card_id
  into v_owner, v_card
  from public.cards c
  where lower(c.slug) = v_slug
    and c.status in ('issued','active')
    and c.is_published is true
    and exists (
      select 1
      from public.club_profiles cp
      where cp.user_id = c.user_id
    )
  limit 1;

  if v_owner is null then
    raise exception 'qr_encounter_profile_not_found';
  end if;

  if v_owner = v_actor then
    return query
    select null::uuid, v_owner, v_actor, 'self'::text;
    return;
  end if;

  if public.mhidas_clubber_encounter_pair_is_blocked_v1(v_owner, v_actor) then
    return query
    select null::uuid, v_owner, v_actor, 'blocked'::text;
    return;
  end if;

  if not public.mhidas_clubber_encounter_user_has_public_clubber_v1(v_actor) then
    return query
    select null::uuid, v_owner, v_actor, 'profile_required'::text;
    return;
  end if;

  v_encounter :=
    public.mhidas_upsert_clubber_encounter_internal_v1(
      v_owner,
      v_actor,
      'qr',
      null,
      v_card,
      clock_timestamp(),
      clock_timestamp(),
      1,
      0,
      1
    );

  return query
  select v_encounter, v_owner, v_actor, 'confirmed'::text;
end;
$function$;

create function public.mhidas_record_qr_guest_claim_v1(
  p_slug text,
  p_guest_session_hash text
)
returns table (
  claim_id uuid,
  owner_user_id uuid,
  outcome text,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_hash text := lower(btrim(coalesce(p_guest_session_hash, '')));
  v_owner uuid;
  v_card uuid;
  v_claim uuid;
  v_expires timestamptz;
begin
  if v_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'qr_guest_session_hash_invalid';
  end if;

  select c.user_id, c.card_id
  into v_owner, v_card
  from public.cards c
  where lower(c.slug) = v_slug
    and c.status in ('issued','active')
    and c.is_published is true
    and exists (
      select 1
      from public.club_profiles cp
      where cp.user_id = c.user_id
    )
  limit 1;

  if v_owner is null then
    raise exception 'qr_guest_profile_not_found';
  end if;

  select c.claim_id, c.expires_at
  into v_claim, v_expires
  from public.clubber_encounter_claims c
  where c.guest_session_hash = v_hash
    and c.amulet_owner_user_id = v_owner
    and c.source = 'qr'
    and c.state = 'pending'
    and c.expires_at > clock_timestamp()
    and c.last_seen_at >= clock_timestamp() - interval '6 hours'
  order by c.last_seen_at desc
  limit 1
  for update;

  if v_claim is not null then
    update public.clubber_encounter_claims
    set
      last_source = 'qr',
      source_card_id = coalesce(source_card_id, v_card),
      last_seen_at = clock_timestamp(),
      touch_count = touch_count + 1,
      qr_touch_count = qr_touch_count + 1
    where clubber_encounter_claims.claim_id = v_claim;

    return query
    select v_claim, v_owner, 'pending'::text, v_expires;
    return;
  end if;

  v_expires := clock_timestamp() + interval '7 days';

  insert into public.clubber_encounter_claims (
    guest_session_hash,
    amulet_owner_user_id,
    source,
    last_source,
    source_card_id,
    state,
    first_seen_at,
    last_seen_at,
    touch_count,
    nfc_touch_count,
    qr_touch_count,
    expires_at
  )
  values (
    v_hash,
    v_owner,
    'qr',
    'qr',
    v_card,
    'pending',
    clock_timestamp(),
    clock_timestamp(),
    1,
    0,
    1,
    v_expires
  )
  returning clubber_encounter_claims.claim_id
  into v_claim;

  return query
  select v_claim, v_owner, 'pending'::text, v_expires;
end;
$function$;

create function public.mhidas_claim_qr_encounters_v1(
  p_guest_session_hash text
)
returns table (
  claim_id uuid,
  encounter_id uuid,
  state text
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor uuid := auth.uid();
  v_hash text := lower(btrim(coalesce(p_guest_session_hash, '')));
  v_claim record;
  v_encounter uuid;
begin
  if v_actor is null then
    raise exception 'qr_claim_auth_required';
  end if;

  for v_claim in
    select c.*
    from public.clubber_encounter_claims c
    where c.guest_session_hash = v_hash
      and c.source = 'qr'
      and c.expires_at > clock_timestamp()
      and (
        c.state = 'pending'
        or (
          c.state = 'claimed'
          and c.claimed_by_user_id = v_actor
        )
      )
    order by c.first_seen_at
    for update
  loop
    if
      v_claim.amulet_owner_user_id = v_actor
      or public.mhidas_clubber_encounter_pair_is_blocked_v1(
        v_claim.amulet_owner_user_id,
        v_actor
      )
    then
      update public.clubber_encounter_claims
      set
        state = 'invalidated',
        claimed_by_user_id = v_actor,
        claimed_at = coalesce(claimed_at, clock_timestamp())
      where clubber_encounter_claims.claim_id = v_claim.claim_id;

      claim_id := v_claim.claim_id;
      encounter_id := null;
      state := 'invalidated';
      return next;
      continue;
    end if;

    if not public.mhidas_clubber_encounter_user_has_public_clubber_v1(v_actor) then
      update public.clubber_encounter_claims
      set
        state = 'claimed',
        claimed_by_user_id = v_actor,
        claimed_at = coalesce(claimed_at, clock_timestamp())
      where clubber_encounter_claims.claim_id = v_claim.claim_id;

      claim_id := v_claim.claim_id;
      encounter_id := null;
      state := 'claimed';
      return next;
      continue;
    end if;

    v_encounter :=
      public.mhidas_upsert_clubber_encounter_internal_v1(
        v_claim.amulet_owner_user_id,
        v_actor,
        'qr',
        null,
        v_claim.source_card_id,
        v_claim.first_seen_at,
        v_claim.last_seen_at,
        v_claim.touch_count,
        0,
        v_claim.qr_touch_count
      );

    update public.clubber_encounter_claims
    set
      state = 'confirmed',
      claimed_by_user_id = v_actor,
      claimed_at = coalesce(claimed_at, clock_timestamp()),
      encounter_id = v_encounter
    where clubber_encounter_claims.claim_id = v_claim.claim_id;

    claim_id := v_claim.claim_id;
    encounter_id := v_encounter;
    state := 'confirmed';
    return next;
  end loop;
end;
$function$;

revoke all on function public.mhidas_record_qr_encounter_v1(text)
from public, anon, authenticated, service_role;

revoke all on function public.mhidas_record_qr_guest_claim_v1(text,text)
from public, anon, authenticated, service_role;

revoke all on function public.mhidas_claim_qr_encounters_v1(text)
from public, anon, authenticated, service_role;

grant execute on function public.mhidas_record_qr_encounter_v1(text)
to authenticated;

grant execute on function public.mhidas_record_qr_guest_claim_v1(text,text)
to service_role;

grant execute on function public.mhidas_claim_qr_encounters_v1(text)
to authenticated;

commit;