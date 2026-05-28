-- supabase/migrations/20260528160000_official_event_provider_strategy.sql

alter table public.official_event_candidates
  drop constraint if exists official_event_candidates_provider_check;

alter table public.official_event_candidates
  add constraint official_event_candidates_provider_check
  check (
    provider in (
      'ticketmaster',
      'ingresse',
      'sympla',
      'shotgun',
      'blueticket',
      'eventbrite',
      'bandsintown',
      'manual',
      'other'
    )
  );

comment on column public.official_event_candidates.provider is
  'External provider used to resolve the event candidate, such as ticketmaster, ingresse, sympla, shotgun, blueticket, eventbrite, bandsintown, manual, or other.';
