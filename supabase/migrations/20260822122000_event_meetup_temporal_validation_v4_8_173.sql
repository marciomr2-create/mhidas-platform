-- MHIDAS / USECLUBBERS
-- V4.8.173-R4
-- Temporal validation for newly created event meetups.
-- Database guard protects the RPC insert path and any direct INSERT path.
-- No existing rows are modified.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $v48173_r4_preflight$
begin
  if to_regclass('public.event_meetups') is null then
    raise exception 'V4_8_173_R4_EVENT_MEETUPS_TABLE_MISSING';
  end if;

  if to_regprocedure('public.mhidas_create_event_meetup(uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,integer,text,text,timestamp with time zone)') is null then
    raise exception 'V4_8_173_R4_CREATE_MEETUP_RPC_MISSING';
  end if;

  if to_regprocedure('public.mhidas_event_meetup_validate_temporal_insert()') is not null then
    raise exception 'V4_8_173_R4_TEMPORAL_GUARD_ALREADY_EXISTS';
  end if;

  if exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'event_meetups'
      and t.tgname = 'trg_event_meetups_validate_temporal_insert'
      and not t.tgisinternal
  ) then
    raise exception 'V4_8_173_R4_TEMPORAL_TRIGGER_ALREADY_EXISTS';
  end if;
end
$v48173_r4_preflight$;

create function public.mhidas_event_meetup_validate_temporal_insert()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if new.starts_at is null then
    raise exception 'starts_at required';
  end if;

  if new.starts_at <= now() then
    raise exception 'starts_at must be in the future';
  end if;

  if new.ends_at is not null
    and new.ends_at <= new.starts_at
  then
    raise exception 'ends_at must be after starts_at';
  end if;

  return new;
end;
$function$;

create trigger trg_event_meetups_validate_temporal_insert
before insert on public.event_meetups
for each row
execute function public.mhidas_event_meetup_validate_temporal_insert();

comment on function public.mhidas_event_meetup_validate_temporal_insert()
is 'V4.8.173-R4 fail-closed temporal guard for new event meetups: starts_at must be future and ends_at, when present, must be after starts_at.';

do $v48173_r4_postflight$
declare
  v_trigger_count integer;
  v_definition text;
begin
  select count(*)
  into v_trigger_count
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'event_meetups'
    and t.tgname = 'trg_event_meetups_validate_temporal_insert'
    and not t.tgisinternal;

  if v_trigger_count <> 1 then
    raise exception 'V4_8_173_R4_TEMPORAL_TRIGGER_POSTFLIGHT_FAILED';
  end if;

  select pg_get_functiondef(
    'public.mhidas_event_meetup_validate_temporal_insert()'::regprocedure
  )
  into v_definition;

  if v_definition not ilike '%starts_at must be in the future%'
     or v_definition not ilike '%ends_at must be after starts_at%' then
    raise exception 'V4_8_173_R4_TEMPORAL_FUNCTION_POSTFLIGHT_FAILED';
  end if;
end
$v48173_r4_postflight$;

commit;