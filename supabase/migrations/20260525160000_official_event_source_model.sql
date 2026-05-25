-- supabase/migrations/20260525160000_official_event_source_model.sql

alter table public.event_groups
  add column if not exists official_url text,
  add column if not exists official_source_name text,
  add column if not exists official_source_url text,
  add column if not exists official_source_type text,
  add column if not exists official_status text default 'missing',
  add column if not exists official_confidence integer default 0,
  add column if not exists official_checked_at timestamp with time zone,
  add column if not exists official_notes text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_groups_official_source_type_check'
  ) then
    alter table public.event_groups
      add constraint event_groups_official_source_type_check
      check (
        official_source_type is null
        or official_source_type in (
          'site',
          'ticket',
          'instagram',
          'manual',
          'ai_search',
          'user_suggestion'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_groups_official_status_check'
  ) then
    alter table public.event_groups
      add constraint event_groups_official_status_check
      check (
        official_status in (
          'confirmed',
          'probable',
          'review',
          'rejected',
          'missing'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_groups_official_confidence_check'
  ) then
    alter table public.event_groups
      add constraint event_groups_official_confidence_check
      check (
        official_confidence >= 0
        and official_confidence <= 100
      );
  end if;
end $$;

create index if not exists event_groups_official_status_idx
  on public.event_groups (official_status);

create index if not exists event_groups_official_source_type_idx
  on public.event_groups (official_source_type);

comment on column public.event_groups.official_url is
  'Confirmed or primary official event link. Can be website, ticket page, or official Instagram.';

comment on column public.event_groups.official_source_name is
  'Source name used to validate the official event link.';

comment on column public.event_groups.official_source_url is
  'Source URL used to validate or review the official event link.';

comment on column public.event_groups.official_source_type is
  'Official source type: site, ticket, instagram, manual, ai_search, or user_suggestion.';

comment on column public.event_groups.official_status is
  'Official link validation status: confirmed, probable, review, rejected, or missing.';

comment on column public.event_groups.official_confidence is
  'Official link confidence level from 0 to 100.';

comment on column public.event_groups.official_checked_at is
  'Last official link verification date and time.';

comment on column public.event_groups.official_notes is
  'Internal notes about official event link validation.';