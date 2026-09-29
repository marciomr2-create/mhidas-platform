-- supabase/migrations/20260929170000_clubber_social_encounters_foundation_mvp2.sql
-- MHIDAS / USECLUBBERS
-- MVP2 - AMULETO / Clubber Social Encounter foundation.
--
-- Scope:
-- - durable reciprocal Clubber encounters;
-- - NFC authenticated encounter recording;
-- - server-governed anonymous pending NFC encounter claims;
-- - later claim after login/signup;
-- - shared source model for NFC and future QR adapters;
-- - no automatic clubber_connections promotion in this migration;
-- - no canonical_events <-> event_groups bridge;
-- - no raw NFC token or raw guest-session secret persistence.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

do $preflight$
begin
  if to_regclass('public.cards') is null
    or to_regclass('public.club_profiles') is null
    or to_regclass('public.card_tokens') is null
    or to_regclass('public.clubber_relationship_controls') is null
  then
    raise exception 'CLUBBER_ENCOUNTER_REQUIRED_DEPENDENCY_MISSING';
  end if;

  if to_regprocedure('public.sha256_hex(text)') is null then
    raise exception 'CLUBBER_ENCOUNTER_SHA256_HELPER_MISSING';
  end if;

  if to_regclass('public.clubber_encounters') is not null
    or to_regclass('public.clubber_encounter_claims') is not null
  then
    raise exception 'CLUBBER_ENCOUNTER_TARGET_TABLE_ALREADY_EXISTS';
  end if;

  if to_regprocedure('public.mhidas_record_nfc_encounter_v1(text)') is not null
    or to_regprocedure('public.mhidas_record_nfc_guest_claim_v1(text,text)') is not null
    or to_regprocedure('public.mhidas_claim_nfc_encounters_v1(text)') is not null
    or to_regprocedure('public.mhidas_read_my_clubber_encounters_v1(integer)') is not null
  then
    raise exception 'CLUBBER_ENCOUNTER_TARGET_RPC_ALREADY_EXISTS';
  end if;
end
$preflight$;

create table public.clubber_encounters (
  encounter_id uuid primary key default gen_random_uuid(),
  amulet_owner_user_id uuid not null
    references auth.users(id) on delete cascade,
  visitor_user_id uuid not null
    references auth.users(id) on delete cascade,
  source text not null,
  last_source text not null,
  source_token_id uuid
    references public.card_tokens(token_id) on delete set null,
  source_card_id uuid
    references public.cards(card_id) on delete set null,
  event_group_id uuid,
  canonical_event_id uuid,
  first_seen_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default clock_timestamp(),
  touch_count integer not null default 1,
  nfc_touch_count integer not null default 0,
  qr_touch_count integer not null default 0,
  status text not null default 'confirmed',
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint clubber_encounters_no_self
    check (amulet_owner_user_id <> visitor_user_id),
  constraint clubber_encounters_source_check
    check (source in ('nfc', 'qr')),
  constraint clubber_encounters_last_source_check
    check (last_source in ('nfc', 'qr')),
  constraint clubber_encounters_status_check
    check (status in ('confirmed', 'voided')),
  constraint clubber_encounters_touch_count_check
    check (
      touch_count >= 1
      and nfc_touch_count >= 0
      and qr_touch_count >= 0
      and touch_count = nfc_touch_count + qr_touch_count
    ),
  constraint clubber_encounters_time_check
    check (last_seen_at >= first_seen_at),
  constraint clubber_encounters_context_isolation_check
    check (event_group_id is null or canonical_event_id is null)
);

create index clubber_encounters_pair_last_seen_idx
on public.clubber_encounters (
  least(amulet_owner_user_id, visitor_user_id),
  greatest(amulet_owner_user_id, visitor_user_id),
  last_seen_at desc
);

create index clubber_encounters_owner_last_seen_idx
on public.clubber_encounters (amulet_owner_user_id, last_seen_at desc);

create index clubber_encounters_visitor_last_seen_idx
on public.clubber_encounters (visitor_user_id, last_seen_at desc);

create index clubber_encounters_event_group_idx
on public.clubber_encounters (event_group_id, last_seen_at desc)
where event_group_id is not null;

create index clubber_encounters_canonical_event_idx
on public.clubber_encounters (canonical_event_id, last_seen_at desc)
where canonical_event_id is not null;

comment on table public.clubber_encounters is
  'Durable reciprocal real-world Clubber encounters. NFC and QR are physical entry channels; the encounter is the lasting social fact.';

comment on column public.clubber_encounters.event_group_id is
  'Optional soft event context. No FK is created here to avoid a premature global event_groups/canonical_events bridge.';

comment on column public.clubber_encounters.canonical_event_id is
  'Optional soft canonical event context. This foundation forbids simultaneous event_group_id and canonical_event_id.';

create table public.clubber_encounter_claims (
  claim_id uuid primary key default gen_random_uuid(),
  guest_session_hash text not null,
  amulet_owner_user_id uuid not null
    references auth.users(id) on delete cascade,
  source text not null,
  last_source text not null,
  source_token_id uuid
    references public.card_tokens(token_id) on delete set null,
  source_card_id uuid
    references public.cards(card_id) on delete set null,
  event_group_id uuid,
  canonical_event_id uuid,
  state text not null default 'pending',
  claimed_by_user_id uuid
    references auth.users(id) on delete cascade,
  encounter_id uuid
    references public.clubber_encounters(encounter_id) on delete set null,
  claimed_at timestamptz,
  first_seen_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default clock_timestamp(),
  touch_count integer not null default 1,
  nfc_touch_count integer not null default 0,
  qr_touch_count integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint clubber_encounter_claims_guest_hash_check
    check (guest_session_hash ~ '^[0-9a-f]{64}$'),
  constraint clubber_encounter_claims_source_check
    check (source in ('nfc', 'qr')),
  constraint clubber_encounter_claims_last_source_check
    check (last_source in ('nfc', 'qr')),
  constraint clubber_encounter_claims_state_check
    check (
      state in (
        'pending',
        'claimed',
        'confirmed',
        'expired',
        'invalidated'
      )
    ),
  constraint clubber_encounter_claims_touch_count_check
    check (
      touch_count >= 1
      and nfc_touch_count >= 0
      and qr_touch_count >= 0
      and touch_count = nfc_touch_count + qr_touch_count
    ),
  constraint clubber_encounter_claims_time_check
    check (
      last_seen_at >= first_seen_at
      and expires_at > first_seen_at
    ),
  constraint clubber_encounter_claims_context_isolation_check
    check (event_group_id is null or canonical_event_id is null),
  constraint clubber_encounter_claims_confirmed_link_check
    check (
      state <> 'confirmed'
      or (
        claimed_by_user_id is not null
        and claimed_at is not null
        and encounter_id is not null
      )
    )
);

create index clubber_encounter_claims_session_state_idx
on public.clubber_encounter_claims (
  guest_session_hash,
  state,
  last_seen_at desc
);

create index clubber_encounter_claims_owner_state_idx
on public.clubber_encounter_claims (
  amulet_owner_user_id,
  state,
  last_seen_at desc
);

create index clubber_encounter_claims_claimed_user_idx
on public.clubber_encounter_claims (
  claimed_by_user_id,
  state,
  last_seen_at desc
)
where claimed_by_user_id is not null;

create index clubber_encounter_claims_expiry_idx
on public.clubber_encounter_claims (state, expires_at)
where state in ('pending', 'claimed');

comment on table public.clubber_encounter_claims is
  'Temporary anonymous-to-authenticated encounter recovery. Only a SHA-256 guest-session hash is persisted; raw guest secrets are never stored.';

alter table public.clubber_encounters enable row level security;
alter table public.clubber_encounter_claims enable row level security;

revoke all on table public.clubber_encounters
from public, anon, authenticated;

revoke all on table public.clubber_encounter_claims
from public, anon, authenticated;

create function public.mhidas_clubber_encounter_touch_updated_at_v1()
returns trigger
language plpgsql
volatile
set search_path = pg_catalog, public
as $function$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

create trigger trg_clubber_encounters_touch_updated_at
before update on public.clubber_encounters
for each row
execute function public.mhidas_clubber_encounter_touch_updated_at_v1();

create trigger trg_clubber_encounter_claims_touch_updated_at
before update on public.clubber_encounter_claims
for each row
execute function public.mhidas_clubber_encounter_touch_updated_at_v1();

create function public.mhidas_clubber_encounter_user_has_public_clubber_v1(
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    p_user_id is not null
    and exists (
      select 1
      from public.club_profiles cp
      where cp.user_id = p_user_id
    )
    and exists (
      select 1
      from public.cards c
      where c.user_id = p_user_id
        and c.status in ('issued', 'active')
        and c.is_published is true
        and c.slug is not null
    );
$function$;

create function public.mhidas_clubber_encounter_pair_is_blocked_v1(
  p_left_user_id uuid,
  p_right_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    case
      when p_left_user_id is null
        or p_right_user_id is null
        or p_left_user_id = p_right_user_id
      then false
      else exists (
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
    end;
$function$;

create function public.mhidas_upsert_clubber_encounter_internal_v1(
  p_amulet_owner_user_id uuid,
  p_visitor_user_id uuid,
  p_source text,
  p_source_token_id uuid,
  p_source_card_id uuid,
  p_first_seen_at timestamptz,
  p_last_seen_at timestamptz,
  p_touch_count integer,
  p_nfc_touch_count integer,
  p_qr_touch_count integer
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_source text := lower(btrim(coalesce(p_source, '')));
  v_pair_left uuid;
  v_pair_right uuid;
  v_encounter_id uuid;
  v_first_seen_at timestamptz :=
    coalesce(p_first_seen_at, clock_timestamp());
  v_last_seen_at timestamptz :=
    coalesce(p_last_seen_at, p_first_seen_at, clock_timestamp());
  v_touch_count integer := coalesce(p_touch_count, 1);
  v_nfc_touch_count integer := coalesce(p_nfc_touch_count, 0);
  v_qr_touch_count integer := coalesce(p_qr_touch_count, 0);
begin
  if p_amulet_owner_user_id is null
    or p_visitor_user_id is null
  then
    raise exception using
      errcode = 'P0001',
      message = 'clubber_encounter_participants_required';
  end if;

  if p_amulet_owner_user_id = p_visitor_user_id then
    raise exception using
      errcode = 'P0001',
      message = 'clubber_encounter_self_forbidden';
  end if;

  if v_source not in ('nfc', 'qr') then
    raise exception using
      errcode = 'P0001',
      message = 'clubber_encounter_source_invalid';
  end if;

  if v_last_seen_at < v_first_seen_at then
    raise exception using
      errcode = 'P0001',
      message = 'clubber_encounter_time_invalid';
  end if;

  if v_touch_count < 1
    or v_nfc_touch_count < 0
    or v_qr_touch_count < 0
    or v_touch_count <> v_nfc_touch_count + v_qr_touch_count
  then
    raise exception using
      errcode = 'P0001',
      message = 'clubber_encounter_touch_count_invalid';
  end if;

  if v_source = 'nfc' and v_nfc_touch_count < 1 then
    raise exception using
      errcode = 'P0001',
      message = 'clubber_encounter_nfc_count_invalid';
  end if;

  if v_source = 'qr' and v_qr_touch_count < 1 then
    raise exception using
      errcode = 'P0001',
      message = 'clubber_encounter_qr_count_invalid';
  end if;

  if not public.mhidas_clubber_encounter_user_has_public_clubber_v1(
    p_amulet_owner_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'clubber_encounter_owner_profile_required';
  end if;

  if not public.mhidas_clubber_encounter_user_has_public_clubber_v1(
    p_visitor_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'clubber_encounter_visitor_profile_required';
  end if;

  if public.mhidas_clubber_encounter_pair_is_blocked_v1(
    p_amulet_owner_user_id,
    p_visitor_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'clubber_encounter_relationship_blocked';
  end if;

  v_pair_left := least(
    p_amulet_owner_user_id,
    p_visitor_user_id
  );

  v_pair_right := greatest(
    p_amulet_owner_user_id,
    p_visitor_user_id
  );

  -- Serialize only this Clubber pair. This prevents simultaneous A->B and
  -- B->A scans from generating duplicate durable memories.
  perform pg_advisory_xact_lock(
    hashtext(v_pair_left::text),
    hashtext(v_pair_right::text)
  );

  select ce.encounter_id
  into v_encounter_id
  from public.clubber_encounters ce
  where ce.status = 'confirmed'
    and least(
      ce.amulet_owner_user_id,
      ce.visitor_user_id
    ) = v_pair_left
    and greatest(
      ce.amulet_owner_user_id,
      ce.visitor_user_id
    ) = v_pair_right
    and ce.event_group_id is null
    and ce.canonical_event_id is null
    and ce.last_seen_at >= v_first_seen_at - interval '6 hours'
    and ce.first_seen_at <= v_last_seen_at + interval '6 hours'
  order by ce.last_seen_at desc
  limit 1
  for update;

  if v_encounter_id is not null then
    update public.clubber_encounters ce
    set
      last_source = v_source,
      source_token_id = coalesce(
        ce.source_token_id,
        p_source_token_id
      ),
      source_card_id = coalesce(
        ce.source_card_id,
        p_source_card_id
      ),
      first_seen_at = least(
        ce.first_seen_at,
        v_first_seen_at
      ),
      last_seen_at = greatest(
        ce.last_seen_at,
        v_last_seen_at
      ),
      touch_count = ce.touch_count + v_touch_count,
      nfc_touch_count = ce.nfc_touch_count + v_nfc_touch_count,
      qr_touch_count = ce.qr_touch_count + v_qr_touch_count
    where ce.encounter_id = v_encounter_id;

    return v_encounter_id;
  end if;

  insert into public.clubber_encounters (
    amulet_owner_user_id,
    visitor_user_id,
    source,
    last_source,
    source_token_id,
    source_card_id,
    first_seen_at,
    last_seen_at,
    touch_count,
    nfc_touch_count,
    qr_touch_count,
    status
  )
  values (
    p_amulet_owner_user_id,
    p_visitor_user_id,
    v_source,
    v_source,
    p_source_token_id,
    p_source_card_id,
    v_first_seen_at,
    v_last_seen_at,
    v_touch_count,
    v_nfc_touch_count,
    v_qr_touch_count,
    'confirmed'
  )
  returning encounter_id
  into v_encounter_id;

  return v_encounter_id;
end;
$function$;

create function public.mhidas_record_nfc_encounter_v1(
  p_token text
)
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
  v_actor_user_id uuid := auth.uid();
  v_token text := btrim(coalesce(p_token, ''));
  v_token_hash text;
  v_owner_user_id uuid;
  v_source_token_id uuid;
  v_source_card_id uuid;
  v_encounter_id uuid;
begin
  if v_actor_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_encounter_auth_required';
  end if;

  if length(v_token) < 16 or length(v_token) > 256 then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_encounter_token_invalid';
  end if;

  v_token_hash := public.sha256_hex(v_token);

  select
    c.user_id,
    ct.token_id,
    ct.card_id
  into
    v_owner_user_id,
    v_source_token_id,
    v_source_card_id
  from public.card_tokens ct
  join public.cards c on c.card_id = ct.card_id
  where ct.token_hash = v_token_hash
    and ct.profile_mode = 'clubber'
    and ct.active is true
    and ct.revoked_at is null
    and c.status in ('issued', 'active')
    and c.is_published is true
    and c.slug is not null
  limit 1;

  if v_owner_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_encounter_token_not_found';
  end if;

  if v_owner_user_id = v_actor_user_id then
    return query
    select null::uuid, v_owner_user_id, v_actor_user_id, 'self'::text;
    return;
  end if;

  if public.mhidas_clubber_encounter_pair_is_blocked_v1(
    v_owner_user_id,
    v_actor_user_id
  ) then
    return query
    select null::uuid, v_owner_user_id, v_actor_user_id, 'blocked'::text;
    return;
  end if;

  if not public.mhidas_clubber_encounter_user_has_public_clubber_v1(
    v_actor_user_id
  ) then
    return query
    select null::uuid, v_owner_user_id, v_actor_user_id, 'profile_required'::text;
    return;
  end if;

  v_encounter_id :=
    public.mhidas_upsert_clubber_encounter_internal_v1(
      v_owner_user_id,
      v_actor_user_id,
      'nfc',
      v_source_token_id,
      v_source_card_id,
      clock_timestamp(),
      clock_timestamp(),
      1,
      1,
      0
    );

  return query
  select
    v_encounter_id,
    v_owner_user_id,
    v_actor_user_id,
    'confirmed'::text;
end;
$function$;

create function public.mhidas_record_nfc_guest_claim_v1(
  p_token text,
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
  v_token text := btrim(coalesce(p_token, ''));
  v_guest_hash text := lower(btrim(coalesce(p_guest_session_hash, '')));
  v_token_hash text;
  v_owner_user_id uuid;
  v_source_token_id uuid;
  v_source_card_id uuid;
  v_claim_id uuid;
  v_expires_at timestamptz;
begin
  if length(v_token) < 16 or length(v_token) > 256 then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_guest_claim_token_invalid';
  end if;

  if v_guest_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_guest_claim_session_hash_invalid';
  end if;

  v_token_hash := public.sha256_hex(v_token);

  select
    c.user_id,
    ct.token_id,
    ct.card_id
  into
    v_owner_user_id,
    v_source_token_id,
    v_source_card_id
  from public.card_tokens ct
  join public.cards c on c.card_id = ct.card_id
  where ct.token_hash = v_token_hash
    and ct.profile_mode = 'clubber'
    and ct.active is true
    and ct.revoked_at is null
    and c.status in ('issued', 'active')
    and c.is_published is true
    and c.slug is not null
  limit 1;

  if v_owner_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_guest_claim_token_not_found';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(v_guest_hash),
    hashtext(v_owner_user_id::text)
  );

  select
    c.claim_id,
    c.expires_at
  into
    v_claim_id,
    v_expires_at
  from public.clubber_encounter_claims c
  where c.guest_session_hash = v_guest_hash
    and c.amulet_owner_user_id = v_owner_user_id
    and c.state = 'pending'
    and c.event_group_id is null
    and c.canonical_event_id is null
    and c.expires_at > clock_timestamp()
    and c.last_seen_at >= clock_timestamp() - interval '6 hours'
  order by c.last_seen_at desc
  limit 1
  for update;

  if v_claim_id is not null then
    update public.clubber_encounter_claims c
    set
      last_source = 'nfc',
      source_token_id = coalesce(c.source_token_id, v_source_token_id),
      source_card_id = coalesce(c.source_card_id, v_source_card_id),
      last_seen_at = clock_timestamp(),
      touch_count = c.touch_count + 1,
      nfc_touch_count = c.nfc_touch_count + 1,
      expires_at = greatest(
        c.expires_at,
        clock_timestamp() + interval '7 days'
      )
    where c.claim_id = v_claim_id
    returning c.expires_at into v_expires_at;

    return query
    select v_claim_id, v_owner_user_id, 'pending'::text, v_expires_at;
    return;
  end if;

  v_expires_at := clock_timestamp() + interval '7 days';

  insert into public.clubber_encounter_claims (
    guest_session_hash,
    amulet_owner_user_id,
    source,
    last_source,
    source_token_id,
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
    v_guest_hash,
    v_owner_user_id,
    'nfc',
    'nfc',
    v_source_token_id,
    v_source_card_id,
    'pending',
    clock_timestamp(),
    clock_timestamp(),
    1,
    1,
    0,
    v_expires_at
  )
  returning public.clubber_encounter_claims.claim_id
  into v_claim_id;

  return query
  select v_claim_id, v_owner_user_id, 'pending'::text, v_expires_at;
end;
$function$;

create function public.mhidas_claim_nfc_encounters_v1(
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
  v_actor_user_id uuid := auth.uid();
  v_guest_hash text := lower(btrim(coalesce(p_guest_session_hash, '')));
  v_claim record;
  v_encounter_id uuid;
begin
  if v_actor_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_claim_auth_required';
  end if;

  if v_guest_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = 'P0001',
      message = 'nfc_claim_session_hash_invalid';
  end if;

  update public.clubber_encounter_claims c
  set state = 'expired'
  where c.guest_session_hash = v_guest_hash
    and c.state in ('pending', 'claimed')
    and c.expires_at <= clock_timestamp();

  for v_claim in
    select c.*
    from public.clubber_encounter_claims c
    where c.guest_session_hash = v_guest_hash
      and c.expires_at > clock_timestamp()
      and (
        c.state = 'pending'
        or (
          c.state = 'claimed'
          and c.claimed_by_user_id = v_actor_user_id
        )
      )
    order by c.first_seen_at asc
    for update
  loop
    if v_claim.amulet_owner_user_id = v_actor_user_id then
      update public.clubber_encounter_claims c
      set
        state = 'invalidated',
        claimed_by_user_id = v_actor_user_id,
        claimed_at = coalesce(c.claimed_at, clock_timestamp())
      where c.claim_id = v_claim.claim_id;

      claim_id := v_claim.claim_id;
      encounter_id := null;
      state := 'invalidated';
      return next;
      continue;
    end if;

    if public.mhidas_clubber_encounter_pair_is_blocked_v1(
      v_claim.amulet_owner_user_id,
      v_actor_user_id
    ) then
      update public.clubber_encounter_claims c
      set
        state = 'invalidated',
        claimed_by_user_id = v_actor_user_id,
        claimed_at = coalesce(c.claimed_at, clock_timestamp())
      where c.claim_id = v_claim.claim_id;

      claim_id := v_claim.claim_id;
      encounter_id := null;
      state := 'invalidated';
      return next;
      continue;
    end if;

    if not public.mhidas_clubber_encounter_user_has_public_clubber_v1(
      v_actor_user_id
    ) then
      update public.clubber_encounter_claims c
      set
        state = 'claimed',
        claimed_by_user_id = v_actor_user_id,
        claimed_at = coalesce(c.claimed_at, clock_timestamp())
      where c.claim_id = v_claim.claim_id;

      claim_id := v_claim.claim_id;
      encounter_id := null;
      state := 'claimed';
      return next;
      continue;
    end if;

    v_encounter_id :=
      public.mhidas_upsert_clubber_encounter_internal_v1(
        v_claim.amulet_owner_user_id,
        v_actor_user_id,
        v_claim.source,
        v_claim.source_token_id,
        v_claim.source_card_id,
        v_claim.first_seen_at,
        v_claim.last_seen_at,
        v_claim.touch_count,
        v_claim.nfc_touch_count,
        v_claim.qr_touch_count
      );

    update public.clubber_encounter_claims c
    set
      state = 'confirmed',
      claimed_by_user_id = v_actor_user_id,
      claimed_at = coalesce(c.claimed_at, clock_timestamp()),
      encounter_id = v_encounter_id
    where c.claim_id = v_claim.claim_id;

    claim_id := v_claim.claim_id;
    encounter_id := v_encounter_id;
    state := 'confirmed';
    return next;
  end loop;
end;
$function$;

create function public.mhidas_read_my_clubber_encounters_v1(
  p_limit integer default 100
)
returns table (
  encounter_id uuid,
  counterpart_user_id uuid,
  source text,
  last_source text,
  touch_count integer,
  nfc_touch_count integer,
  qr_touch_count integer,
  event_group_id uuid,
  canonical_event_id uuid,
  first_seen_at timestamptz,
  last_seen_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 200));
begin
  if v_actor_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'clubber_encounter_read_auth_required';
  end if;

  return query
  select
    ce.encounter_id,
    case
      when ce.amulet_owner_user_id = v_actor_user_id
      then ce.visitor_user_id
      else ce.amulet_owner_user_id
    end,
    ce.source,
    ce.last_source,
    ce.touch_count,
    ce.nfc_touch_count,
    ce.qr_touch_count,
    ce.event_group_id,
    ce.canonical_event_id,
    ce.first_seen_at,
    ce.last_seen_at
  from public.clubber_encounters ce
  where ce.status = 'confirmed'
    and (
      ce.amulet_owner_user_id = v_actor_user_id
      or ce.visitor_user_id = v_actor_user_id
    )
    and not public.mhidas_clubber_encounter_pair_is_blocked_v1(
      ce.amulet_owner_user_id,
      ce.visitor_user_id
    )
  order by ce.last_seen_at desc
  limit v_limit;
end;
$function$;

revoke all on function
  public.mhidas_clubber_encounter_touch_updated_at_v1()
from public, anon, authenticated, service_role;

revoke all on function
  public.mhidas_clubber_encounter_user_has_public_clubber_v1(uuid)
from public, anon, authenticated, service_role;

revoke all on function
  public.mhidas_clubber_encounter_pair_is_blocked_v1(uuid,uuid)
from public, anon, authenticated, service_role;

revoke all on function
  public.mhidas_upsert_clubber_encounter_internal_v1(uuid,uuid,text,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,integer,integer)
from public, anon, authenticated, service_role;

revoke all on function
  public.mhidas_record_nfc_encounter_v1(text)
from public, anon, authenticated, service_role;

revoke all on function
  public.mhidas_record_nfc_guest_claim_v1(text,text)
from public, anon, authenticated, service_role;

revoke all on function
  public.mhidas_claim_nfc_encounters_v1(text)
from public, anon, authenticated, service_role;

revoke all on function
  public.mhidas_read_my_clubber_encounters_v1(integer)
from public, anon, authenticated, service_role;

grant execute on function
  public.mhidas_record_nfc_encounter_v1(text)
to authenticated;

grant execute on function
  public.mhidas_record_nfc_guest_claim_v1(text,text)
to service_role;

grant execute on function
  public.mhidas_claim_nfc_encounters_v1(text)
to authenticated;

grant execute on function
  public.mhidas_read_my_clubber_encounters_v1(integer)
to authenticated;

comment on function public.mhidas_record_nfc_encounter_v1(text) is
  'Authenticated Clubber NFC encounter recorder. Raw NFC token is resolved in memory and never persisted.';

comment on function public.mhidas_record_nfc_guest_claim_v1(text,text) is
  'Server-only NFC pending-claim recorder for anonymous visitors. Stores only a SHA-256 guest-session hash; direct browser execution is prohibited.';

comment on function public.mhidas_claim_nfc_encounters_v1(text) is
  'Claims pending NFC encounters after login/signup and confirms them once the claimant has a public Clubber identity.';

comment on function public.mhidas_read_my_clubber_encounters_v1(integer) is
  'Reciprocal authenticated read of confirmed Clubber encounters.';

do $postflight$
declare
  v_missing_tables integer := 0;
  v_missing_functions integer := 0;
  v_missing_indexes integer := 0;
  v_rls_missing integer := 0;
  v_browser_table_privileges integer := 0;
  v_wrong_execute integer := 0;
begin
  select count(*)
  into v_missing_tables
  from (
    values
      ('clubber_encounters'),
      ('clubber_encounter_claims')
  ) expected(table_name)
  where to_regclass('public.' || expected.table_name) is null;

  if v_missing_tables <> 0 then
    raise exception
      'CLUBBER_ENCOUNTER_POSTFLIGHT_TABLES_MISSING:%',
      v_missing_tables;
  end if;

  select count(*)
  into v_missing_indexes
  from (
    values
      ('clubber_encounters_pair_last_seen_idx'),
      ('clubber_encounters_owner_last_seen_idx'),
      ('clubber_encounters_visitor_last_seen_idx'),
      ('clubber_encounters_event_group_idx'),
      ('clubber_encounters_canonical_event_idx'),
      ('clubber_encounter_claims_session_state_idx'),
      ('clubber_encounter_claims_owner_state_idx'),
      ('clubber_encounter_claims_claimed_user_idx'),
      ('clubber_encounter_claims_expiry_idx')
  ) expected(index_name)
  where to_regclass('public.' || expected.index_name) is null;

  if v_missing_indexes <> 0 then
    raise exception
      'CLUBBER_ENCOUNTER_POSTFLIGHT_INDEXES_MISSING:%',
      v_missing_indexes;
  end if;

  select count(*)
  into v_missing_functions
  from (
    values
      ('public.mhidas_clubber_encounter_touch_updated_at_v1()'),
      ('public.mhidas_clubber_encounter_user_has_public_clubber_v1(uuid)'),
      ('public.mhidas_clubber_encounter_pair_is_blocked_v1(uuid,uuid)'),
      ('public.mhidas_upsert_clubber_encounter_internal_v1(uuid,uuid,text,uuid,uuid,timestamp with time zone,timestamp with time zone,integer,integer,integer)'),
      ('public.mhidas_record_nfc_encounter_v1(text)'),
      ('public.mhidas_record_nfc_guest_claim_v1(text,text)'),
      ('public.mhidas_claim_nfc_encounters_v1(text)'),
      ('public.mhidas_read_my_clubber_encounters_v1(integer)')
  ) expected(signature)
  where to_regprocedure(expected.signature) is null;

  if v_missing_functions <> 0 then
    raise exception
      'CLUBBER_ENCOUNTER_POSTFLIGHT_FUNCTIONS_MISSING:%',
      v_missing_functions;
  end if;

  select count(*)
  into v_rls_missing
  from (
    values
      ('clubber_encounters'),
      ('clubber_encounter_claims')
  ) expected(table_name)
  where not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = expected.table_name
      and c.relrowsecurity
  );

  if v_rls_missing <> 0 then
    raise exception
      'CLUBBER_ENCOUNTER_POSTFLIGHT_RLS_MISSING:%',
      v_rls_missing;
  end if;

  select count(*)
  into v_browser_table_privileges
  from (
    values
      ('anon'),
      ('authenticated')
  ) roles(role_name)
  cross join (
    values
      ('clubber_encounters'),
      ('clubber_encounter_claims')
  ) tables(table_name)
  cross join (
    values
      ('SELECT'),
      ('INSERT'),
      ('UPDATE'),
      ('DELETE')
  ) privileges(privilege_type)
  where has_table_privilege(
    roles.role_name,
    'public.' || tables.table_name,
    privileges.privilege_type
  );

  if v_browser_table_privileges <> 0 then
    raise exception
      'CLUBBER_ENCOUNTER_POSTFLIGHT_DIRECT_BROWSER_ACCESS_PRESENT:%',
      v_browser_table_privileges;
  end if;

  if has_function_privilege(
    'anon',
    'public.mhidas_record_nfc_encounter_v1(text)',
    'EXECUTE'
  )
    or not has_function_privilege(
      'authenticated',
      'public.mhidas_record_nfc_encounter_v1(text)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.mhidas_record_nfc_guest_claim_v1(text,text)',
      'EXECUTE'
    )
    or has_function_privilege(
      'authenticated',
      'public.mhidas_record_nfc_guest_claim_v1(text,text)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'service_role',
      'public.mhidas_record_nfc_guest_claim_v1(text,text)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.mhidas_claim_nfc_encounters_v1(text)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.mhidas_claim_nfc_encounters_v1(text)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.mhidas_read_my_clubber_encounters_v1(integer)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.mhidas_read_my_clubber_encounters_v1(integer)',
      'EXECUTE'
    )
  then
    v_wrong_execute := 1;
  end if;

  if v_wrong_execute <> 0 then
    raise exception
      'CLUBBER_ENCOUNTER_POSTFLIGHT_EXECUTE_PRIVILEGE_INVALID';
  end if;
end
$postflight$;

commit;
