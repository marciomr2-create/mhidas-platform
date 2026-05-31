-- supabase/migrations/20260531160000_add_guicheweb_ticket360_providers.sql

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
      'guicheweb',
      'ticket360',
      'eventbrite',
      'bandsintown',
      'manual',
      'other'
    )
  );

comment on column public.official_event_candidates.provider is
  'External provider used to resolve the event candidate, such as ticketmaster, ingresse, sympla, shotgun, blueticket, guicheweb, ticket360, eventbrite, bandsintown, manual, or other.';
