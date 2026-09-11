-- supabase/migrations/20260911170000_event_social_agenda_foundation_mvp2.sql
-- MHIDAS / USECLUBBERS
-- MVP2 — SOCIAL-4E — Agenda Social foundation
-- LOCAL ONLY. Do not apply to STAGING or Production without explicit approval.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

do $preflight$
begin
  if to_regclass('public.canonical_events') is null then
    raise exception 'SOCIAL_4E_CANONICAL_EVENTS_MISSING';
  end if;

  if to_regclass('public.official_entities') is null then
    raise exception 'SOCIAL_4E_OFFICIAL_ENTITIES_MISSING';
  end if;

  if to_regclass('public.canonical_event_stages') is not null
    or to_regclass('public.canonical_event_sets') is not null
    or to_regclass('public.canonical_event_set_performers') is not null
    or to_regclass('public.clubber_event_agenda_items') is not null
    or to_regclass('public.canonical_event_set_changes') is not null
  then
    raise exception 'SOCIAL_4E_TARGET_ALREADY_EXISTS';
  end if;
end
$preflight$;

-- =========================================================
-- 1. PALCOS / ÁREAS
-- =========================================================

create table public.canonical_event_stages (
  stage_id uuid primary key default gen_random_uuid(),

  canonical_event_id uuid not null
    references public.canonical_events(id)
    on delete cascade,

  name text not null,
  normalized_name text not null,

  sort_order integer not null default 0,
  status text not null default 'active',
  source_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint canonical_event_stages_name_check
    check (char_length(btrim(name)) between 1 and 120),

  constraint canonical_event_stages_normalized_name_check
    check (char_length(btrim(normalized_name)) between 1 and 120),

  constraint canonical_event_stages_status_check
    check (status in ('active', 'inactive')),

  constraint canonical_event_stages_sort_order_check
    check (sort_order between 0 and 1000),

  constraint canonical_event_stages_event_name_unique
    unique (canonical_event_id, normalized_name)
);

create index canonical_event_stages_event_idx
  on public.canonical_event_stages (
    canonical_event_id,
    status,
    sort_order
  );

-- =========================================================
-- 2. SETS / APRESENTAÇÕES
-- =========================================================

create table public.canonical_event_sets (
  set_id uuid primary key default gen_random_uuid(),

  canonical_event_id uuid not null
    references public.canonical_events(id)
    on delete cascade,

  stage_id uuid
    references public.canonical_event_stages(stage_id)
    on delete set null,

  set_title text,

  starts_at timestamptz not null,
  ends_at timestamptz,

  publication_status text not null default 'draft',
  lifecycle_status text not null default 'scheduled',

  source_kind text not null default 'manual_admin',
  source_url text,
  source_confidence_score integer not null default 100,

  schedule_revision integer not null default 1,
  sort_order integer not null default 0,

  created_by uuid
    references auth.users(id)
    on delete set null,

  updated_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint canonical_event_sets_title_check
    check (
      set_title is null
      or char_length(btrim(set_title)) between 1 and 180
    ),

  constraint canonical_event_sets_time_check
    check (
      ends_at is null
      or ends_at > starts_at
    ),

  constraint canonical_event_sets_publication_check
    check (
      publication_status in ('draft', 'published')
    ),

  constraint canonical_event_sets_lifecycle_check
    check (
      lifecycle_status in (
        'scheduled',
        'delayed',
        'live',
        'completed',
        'cancelled'
      )
    ),

  constraint canonical_event_sets_source_kind_check
    check (
      source_kind in (
        'manual_admin',
        'official_event_site',
        'official_venue_site',
        'official_producer_site',
        'official_artist_source',
        'ticketing_api',
        'multi_source_review'
      )
    ),

  constraint canonical_event_sets_confidence_check
    check (source_confidence_score between 0 and 100),

  constraint canonical_event_sets_revision_check
    check (schedule_revision between 1 and 10000),

  constraint canonical_event_sets_sort_order_check
    check (sort_order between 0 and 10000),

  constraint canonical_event_sets_event_pair_unique
    unique (set_id, canonical_event_id)
);

create index canonical_event_sets_event_time_idx
  on public.canonical_event_sets (
    canonical_event_id,
    starts_at
  );

create index canonical_event_sets_stage_time_idx
  on public.canonical_event_sets (
    stage_id,
    starts_at
  )
  where stage_id is not null;

create index canonical_event_sets_publication_idx
  on public.canonical_event_sets (
    publication_status,
    lifecycle_status,
    starts_at
  );

-- =========================================================
-- 3. GARANTIA: PALCO E SET DEVEM SER DO MESMO EVENTO
-- =========================================================

create or replace function public.mhidas_validate_event_set_stage_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if new.stage_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.canonical_event_stages s
    where s.stage_id = new.stage_id
      and s.canonical_event_id = new.canonical_event_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'event_set_stage_event_mismatch';
  end if;

  return new;
end;
$function$;

create trigger trg_validate_event_set_stage
before insert or update of stage_id, canonical_event_id
on public.canonical_event_sets
for each row
execute function public.mhidas_validate_event_set_stage_v1();

-- =========================================================
-- 4. ARTISTAS / PERFORMERS
-- =========================================================

create table public.canonical_event_set_performers (
  performer_id uuid primary key default gen_random_uuid(),

  set_id uuid not null
    references public.canonical_event_sets(set_id)
    on delete cascade,

  display_name text not null,
  spotify_id text,

  official_entity_id uuid
    references public.official_entities(entity_id)
    on delete set null,

  role text not null default 'primary',
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint canonical_event_set_performers_name_check
    check (
      char_length(btrim(display_name)) between 1 and 180
    ),

  constraint canonical_event_set_performers_role_check
    check (
      role in (
        'primary',
        'b2b',
        'guest',
        'live',
        'support'
      )
    ),

  constraint canonical_event_set_performers_sort_check
    check (sort_order between 0 and 100)
);

create index canonical_event_set_performers_set_idx
  on public.canonical_event_set_performers (
    set_id,
    sort_order
  );

create index canonical_event_set_performers_entity_idx
  on public.canonical_event_set_performers (
    official_entity_id
  )
  where official_entity_id is not null;

create index canonical_event_set_performers_spotify_idx
  on public.canonical_event_set_performers (
    spotify_id
  )
  where spotify_id is not null;

-- =========================================================
-- 5. MINHA AGENDA
-- =========================================================

create table public.clubber_event_agenda_items (
  agenda_item_id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  canonical_event_id uuid not null,
  set_id uuid not null,

  status text not null default 'saved',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clubber_event_agenda_items_set_event_fk
    foreign key (set_id, canonical_event_id)
    references public.canonical_event_sets (
      set_id,
      canonical_event_id
    )
    on delete restrict,

  constraint clubber_event_agenda_items_status_check
    check (
      status in ('saved', 'removed')
    ),

  constraint clubber_event_agenda_items_user_set_unique
    unique (user_id, set_id)
);

create index clubber_event_agenda_items_user_event_idx
  on public.clubber_event_agenda_items (
    user_id,
    canonical_event_id,
    status
  );

create index clubber_event_agenda_items_set_status_idx
  on public.clubber_event_agenda_items (
    set_id,
    status
  );

-- =========================================================
-- 6. HISTÓRICO APPEND-ONLY
-- =========================================================

create table public.canonical_event_set_changes (
  change_id uuid primary key default gen_random_uuid(),

  canonical_event_id uuid not null,
  set_id uuid not null,

  change_type text not null,
  schedule_revision integer not null,

  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,

  source_url text,

  recorded_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),

  constraint canonical_event_set_changes_set_event_fk
    foreign key (set_id, canonical_event_id)
    references public.canonical_event_sets (
      set_id,
      canonical_event_id
    )
    on delete restrict,

  constraint canonical_event_set_changes_type_check
    check (
      change_type in (
        'time_changed',
        'stage_changed',
        'cancelled',
        'restored',
        'performer_changed'
      )
    ),

  constraint canonical_event_set_changes_revision_check
    check (
      schedule_revision between 1 and 10000
    )
);

create index canonical_event_set_changes_set_idx
  on public.canonical_event_set_changes (
    set_id,
    created_at desc
  );

create index canonical_event_set_changes_event_idx
  on public.canonical_event_set_changes (
    canonical_event_id,
    created_at desc
  );

-- =========================================================
-- 7. UPDATED_AT AUTOMÁTICO
-- =========================================================

create or replace function public.mhidas_touch_event_social_agenda_updated_at_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create trigger trg_event_stages_updated_at
before update
on public.canonical_event_stages
for each row
execute function public.mhidas_touch_event_social_agenda_updated_at_v1();

create trigger trg_event_sets_updated_at
before update
on public.canonical_event_sets
for each row
execute function public.mhidas_touch_event_social_agenda_updated_at_v1();

create trigger trg_event_set_performers_updated_at
before update
on public.canonical_event_set_performers
for each row
execute function public.mhidas_touch_event_social_agenda_updated_at_v1();

create trigger trg_clubber_event_agenda_updated_at
before update
on public.clubber_event_agenda_items
for each row
execute function public.mhidas_touch_event_social_agenda_updated_at_v1();

-- =========================================================
-- 8. RLS
-- =========================================================

alter table public.canonical_event_stages
  enable row level security;

alter table public.canonical_event_sets
  enable row level security;

alter table public.canonical_event_set_performers
  enable row level security;

alter table public.clubber_event_agenda_items
  enable row level security;

alter table public.canonical_event_set_changes
  enable row level security;

-- Programação oficial publicada: leitura pública.

create policy canonical_event_stages_public_read
  on public.canonical_event_stages
  for select
  using (
    status = 'active'
    and exists (
      select 1
      from public.canonical_events ce
      where ce.id = canonical_event_stages.canonical_event_id
        and ce.validation_status in ('validated', 'published')
        and ce.is_100_percent_validated = true
    )
  );

create policy canonical_event_sets_public_read
  on public.canonical_event_sets
  for select
  using (
    publication_status = 'published'
    and exists (
      select 1
      from public.canonical_events ce
      where ce.id = canonical_event_sets.canonical_event_id
        and ce.validation_status in ('validated', 'published')
        and ce.is_100_percent_validated = true
    )
  );

create policy canonical_event_set_performers_public_read
  on public.canonical_event_set_performers
  for select
  using (
    exists (
      select 1
      from public.canonical_event_sets ces
      join public.canonical_events ce
        on ce.id = ces.canonical_event_id
      where ces.set_id = canonical_event_set_performers.set_id
        and ces.publication_status = 'published'
        and ce.validation_status in ('validated', 'published')
        and ce.is_100_percent_validated = true
    )
  );

grant select
  on public.canonical_event_stages,
     public.canonical_event_sets,
     public.canonical_event_set_performers
  to anon, authenticated;

revoke insert, update, delete
  on public.canonical_event_stages,
     public.canonical_event_sets,
     public.canonical_event_set_performers
  from anon, authenticated;

-- Agenda pessoal: somente o próprio Clubber.

create policy clubber_event_agenda_items_select_own
  on public.clubber_event_agenda_items
  for select
  to authenticated
  using (
    auth.uid() = user_id
  );

create policy clubber_event_agenda_items_insert_own
  on public.clubber_event_agenda_items
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'saved'
    and exists (
      select 1
      from public.canonical_event_sets ces
      join public.canonical_events ce
        on ce.id = ces.canonical_event_id
      where ces.set_id = clubber_event_agenda_items.set_id
        and ces.canonical_event_id =
          clubber_event_agenda_items.canonical_event_id
        and ces.publication_status = 'published'
        and ces.lifecycle_status <> 'cancelled'
        and ce.validation_status in ('validated', 'published')
        and ce.is_100_percent_validated = true
    )
  );

create policy clubber_event_agenda_items_update_own
  on public.clubber_event_agenda_items
  for update
  to authenticated
  using (
    auth.uid() = user_id
  )
  with check (
    auth.uid() = user_id
    and (
      status = 'removed'
      or exists (
        select 1
        from public.canonical_event_sets ces
        join public.canonical_events ce
          on ce.id = ces.canonical_event_id
        where ces.set_id = clubber_event_agenda_items.set_id
          and ces.canonical_event_id =
            clubber_event_agenda_items.canonical_event_id
          and ces.publication_status = 'published'
          and ces.lifecycle_status <> 'cancelled'
          and ce.validation_status in ('validated', 'published')
          and ce.is_100_percent_validated = true
      )
    )
  );

grant select
  on public.clubber_event_agenda_items
  to authenticated;

grant insert (
  user_id,
  canonical_event_id,
  set_id,
  status
)
  on public.clubber_event_agenda_items
  to authenticated;

grant update (status)
  on public.clubber_event_agenda_items
  to authenticated;

revoke all
  on public.clubber_event_agenda_items
  from anon;

revoke delete
  on public.clubber_event_agenda_items
  from authenticated;

-- Histórico: backend/service role only.

revoke all
  on public.canonical_event_set_changes
  from anon, authenticated;

-- Funções internas não ficam executáveis diretamente por clientes.

revoke all
  on function public.mhidas_validate_event_set_stage_v1()
  from public, anon, authenticated;

revoke all
  on function public.mhidas_touch_event_social_agenda_updated_at_v1()
  from public, anon, authenticated;

-- =========================================================
-- 9. POSTFLIGHT
-- =========================================================

do $postflight$
begin
  if to_regclass('public.canonical_event_stages') is null then
    raise exception 'SOCIAL_4E_STAGES_POSTFLIGHT_FAILED';
  end if;

  if to_regclass('public.canonical_event_sets') is null then
    raise exception 'SOCIAL_4E_SETS_POSTFLIGHT_FAILED';
  end if;

  if to_regclass('public.canonical_event_set_performers') is null then
    raise exception 'SOCIAL_4E_PERFORMERS_POSTFLIGHT_FAILED';
  end if;

  if to_regclass('public.clubber_event_agenda_items') is null then
    raise exception 'SOCIAL_4E_AGENDA_ITEMS_POSTFLIGHT_FAILED';
  end if;

  if to_regclass('public.canonical_event_set_changes') is null then
    raise exception 'SOCIAL_4E_CHANGES_POSTFLIGHT_FAILED';
  end if;

  if to_regprocedure(
    'public.mhidas_validate_event_set_stage_v1()'
  ) is null then
    raise exception 'SOCIAL_4E_STAGE_GUARD_POSTFLIGHT_FAILED';
  end if;

  if to_regprocedure(
    'public.mhidas_touch_event_social_agenda_updated_at_v1()'
  ) is null then
    raise exception 'SOCIAL_4E_TOUCH_FUNCTION_POSTFLIGHT_FAILED';
  end if;
end
$postflight$;

commit;