-- supabase/migrations/20260529160000_artist_event_discovery_resolver_strategy.sql

alter table public.official_event_candidates
  add column if not exists discovery_type text,
  add column if not exists normalized_query text,
  add column if not exists query_city text,
  add column if not exists query_state text,
  add column if not exists query_country text,
  add column if not exists query_start_date date,
  add column if not exists query_end_date date,
  add column if not exists match_reason text,
  add column if not exists match_details jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'official_event_candidates_discovery_type_check'
  ) then
    alter table public.official_event_candidates
      add constraint official_event_candidates_discovery_type_check
      check (
        discovery_type is null
        or discovery_type in (
          'artist',
          'event',
          'festival',
          'venue',
          'party',
          'mixed'
        )
      );
  end if;
end $$;

create index if not exists official_event_candidates_discovery_type_idx
  on public.official_event_candidates (discovery_type);

create index if not exists official_event_candidates_normalized_query_idx
  on public.official_event_candidates (normalized_query);

create index if not exists official_event_candidates_query_location_idx
  on public.official_event_candidates (query_city, query_state, query_country);

create index if not exists official_event_candidates_query_period_idx
  on public.official_event_candidates (query_start_date, query_end_date);

comment on column public.official_event_candidates.discovery_type is
  'Search intent type used by the discovery resolver: artist, event, festival, venue, party, or mixed.';

comment on column public.official_event_candidates.normalized_query is
  'Normalized search query without accents or noisy characters, used for matching and deduplication.';

comment on column public.official_event_candidates.query_city is
  'City originally requested by the user or resolver.';

comment on column public.official_event_candidates.query_state is
  'State originally requested by the user or resolver.';

comment on column public.official_event_candidates.query_country is
  'Country originally requested by the user or resolver.';

comment on column public.official_event_candidates.query_start_date is
  'Start date of the requested discovery period.';

comment on column public.official_event_candidates.query_end_date is
  'End date of the requested discovery period.';

comment on column public.official_event_candidates.match_reason is
  'Human-readable reason explaining why this candidate matched the search.';

comment on column public.official_event_candidates.match_details is
  'Structured matching details used for confidence, audit and future multi-provider ranking.';
