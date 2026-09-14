-- supabase/migrations/20260913210000_event_meetup_set_context_foundation_mvp2.sql
-- MHIDAS / USECLUBBERS
-- MVP2 â€” SOCIAL-4J-B â€” Meetup <-> canonical set context foundation
-- LOCAL ONLY. Do not apply to STAGING or Production without explicit approval.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local check_function_bodies = on;

-- =========================================================
-- 0. PREFLIGHT
-- =========================================================

do $preflight$
begin
  if to_regclass('public.event_meetups') is null then
    raise exception 'SOCIAL_4J_EVENT_MEETUPS_MISSING';
  end if;

  if to_regclass('public.canonical_events') is null then
    raise exception 'SOCIAL_4J_CANONICAL_EVENTS_MISSING';
  end if;

  if to_regclass('public.canonical_event_sets') is null then
    raise exception 'SOCIAL_4J_CANONICAL_EVENT_SETS_MISSING';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_meetups'
      and column_name in ('canonical_event_id', 'set_id')
  ) then
    raise exception 'SOCIAL_4J_TARGET_COLUMNS_ALREADY_EXIST';
  end if;
end
$preflight$;

-- =========================================================
-- 1. CONTEXTO CANÃ”NICO OPCIONAL DO ENCONTRO
-- =========================================================

alter table public.event_meetups
  add column canonical_event_id uuid,
  add column set_id uuid;

comment on column public.event_meetups.canonical_event_id is
  'Optional canonical event context for a meetup linked to an official set. Does not create a global canonical_events <-> event_groups bridge.';

comment on column public.event_meetups.set_id is
  'Optional official canonical set linked to this meetup. Used for set/palco/horario social context.';

-- O contexto Ã© opcional, porÃ©m deve ser completo:
-- ou nenhum vÃ­nculo canÃ´nico, ou canonical_event_id + set_id juntos.
alter table public.event_meetups
  add constraint event_meetups_set_context_pair_check
  check (
    (
      canonical_event_id is null
      and set_id is null
    )
    or
    (
      canonical_event_id is not null
      and set_id is not null
    )
  );

-- Garante que o set pertence exatamente ao evento canÃ´nico informado.
-- NÃ£o cria coluna ou FK em event_groups.
alter table public.event_meetups
  add constraint event_meetups_set_event_fk
  foreign key (set_id, canonical_event_id)
  references public.canonical_event_sets (
    set_id,
    canonical_event_id
  )
  on update cascade
  on delete set null;

create index event_meetups_canonical_set_context_idx
  on public.event_meetups (
    canonical_event_id,
    set_id,
    status,
    starts_at
  )
  where set_id is not null;

-- =========================================================
-- 2. RLS / PRIVILÃ‰GIOS
-- =========================================================

-- A tabela jÃ¡ possui RLS e polÃ­tica de leitura social.
-- NÃ£o criamos nova escrita direta pelo cliente nesta foundation.
-- A futura escrita do vÃ­nculo passarÃ¡ por RPC/API controlada.

revoke insert, update, delete
  on public.event_meetups
  from anon, authenticated;

-- =========================================================
-- 3. POSTFLIGHT
-- =========================================================

do $postflight$
declare
  v_pair_check integer;
  v_fk integer;
  v_index integer;
  v_global_bridge integer;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_meetups'
      and column_name = 'canonical_event_id'
      and data_type = 'uuid'
  ) then
    raise exception 'SOCIAL_4J_CANONICAL_EVENT_COLUMN_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_meetups'
      and column_name = 'set_id'
      and data_type = 'uuid'
  ) then
    raise exception 'SOCIAL_4J_SET_COLUMN_MISSING';
  end if;

  select count(*)
  into v_pair_check
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'event_meetups'
    and c.conname = 'event_meetups_set_context_pair_check'
    and c.contype = 'c';

  if v_pair_check <> 1 then
    raise exception 'SOCIAL_4J_PAIR_CHECK_MISSING';
  end if;

  select count(*)
  into v_fk
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'event_meetups'
    and c.conname = 'event_meetups_set_event_fk'
    and c.contype = 'f';

  if v_fk <> 1 then
    raise exception 'SOCIAL_4J_COMPOSITE_FK_MISSING';
  end if;

  select count(*)
  into v_index
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'event_meetups'
    and indexname = 'event_meetups_canonical_set_context_idx';

  if v_index <> 1 then
    raise exception 'SOCIAL_4J_CONTEXT_INDEX_MISSING';
  end if;

  -- Regra arquitetural crÃ­tica:
  -- SOCIAL-4J nÃ£o pode criar ponte global em event_groups.
  select count(*)
  into v_global_bridge
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'event_groups'
    and column_name in ('canonical_event_id', 'canonical_event_uuid');

  if v_global_bridge <> 0 then
    raise exception 'SOCIAL_4J_GLOBAL_BRIDGE_PRESENT';
  end if;
end
$postflight$;

commit;