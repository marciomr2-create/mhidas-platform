-- supabase/migrations/20260527160000_official_event_resolver_foundation.sql

create table if not exists public.official_event_candidates (
  candidate_id uuid primary key default gen_random_uuid(),

  provider text not null,
  provider_event_id text,
  provider_url text,

  query_text text,
  event_name text not null,
  artist_name text,
  event_date date,
  event_datetime timestamp with time zone,
  event_timezone text,

  venue_name text,
  city text,
  state text,
  country text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),

  official_url text,
  ticket_url text,
  image_url text,

  source_name text,
  source_type text default 'ticket',
  candidate_status text default 'probable',
  confidence integer default 0,

  event_group_id uuid references public.event_groups(group_id) on delete set null,

  raw_payload jsonb,
  notes text,

  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  constraint official_event_candidates_provider_check
    check (
      provider in (
        'ticketmaster',
        'eventbrite',
        'bandsintown',
        'manual',
        'other'
      )
    ),

  constraint official_event_candidates_source_type_check
    check (
      source_type is null
      or source_type in (
        'site',
        'ticket',
        'instagram',
        'manual',
        'api',
        'other'
      )
    ),

  constraint official_event_candidates_status_check
    check (
      candidate_status in (
        'probable',
        'review',
        'confirmed',
        'rejected',
        'expired'
      )
    ),

  constraint official_event_candidates_confidence_check
    check (
      confidence >= 0
      and confidence <= 100
    )
);

create unique index if not exists official_event_candidates_provider_event_uidx
  on public.official_event_candidates (provider, provider_event_id)
  where provider_event_id is not null;

create index if not exists official_event_candidates_provider_idx
  on public.official_event_candidates (provider);

create index if not exists official_event_candidates_status_idx
  on public.official_event_candidates (candidate_status);

create index if not exists official_event_candidates_event_date_idx
  on public.official_event_candidates (event_date);

create index if not exists official_event_candidates_event_group_idx
  on public.official_event_candidates (event_group_id);

create index if not exists official_event_candidates_city_country_idx
  on public.official_event_candidates (city, country);

comment on table public.official_event_candidates is
  'Cache table for official event candidates returned by trusted providers before manual confirmation.';

comment on column public.official_event_candidates.provider is
  'External provider used to resolve the event candidate, such as ticketmaster or eventbrite.';

comment on column public.official_event_candidates.provider_event_id is
  'Original event identifier from the external provider.';

comment on column public.official_event_candidates.candidate_status is
  'Candidate review status before becoming an official confirmed event.';

comment on column public.official_event_candidates.confidence is
  'Internal confidence score from 0 to 100 for matching an event candidate.';

comment on column public.official_event_candidates.raw_payload is
  'Original provider response stored for audit and future mapping.';

alter table public.official_event_candidates enable row level security;
