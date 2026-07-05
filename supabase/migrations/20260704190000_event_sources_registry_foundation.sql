-- supabase/migrations/20260704190000_event_sources_registry_foundation.sql

create table if not exists public.event_sources (
  source_id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  display_name text not null,
  roles text[] not null default '{}'::text[],
  trust_tier text not null default 'discovery',
  authority_scope text not null default 'discovery_only',
  domains text[] not null default '{}'::text[],
  ingestion_modes text[] not null default '{}'::text[],
  integration_status text not null default 'planned',
  parent_source_id uuid references public.event_sources(source_id) on delete set null,
  automatic_candidate_eligible boolean not null default false,
  automatic_publish_eligible boolean not null default false,
  requires_secondary_confirmation boolean not null default true,
  city text,
  state text,
  country text default 'BR',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint event_sources_source_key_check
    check (source_key ~ '^[a-z0-9][a-z0-9_]*$'),

  constraint event_sources_display_name_check
    check (length(btrim(display_name)) > 0),

  constraint event_sources_roles_not_empty_check
    check (cardinality(roles) > 0),

  constraint event_sources_roles_check
    check (
      roles <@ array[
        'ticketing_platform',
        'official_venue',
        'official_promoter',
        'official_producer',
        'artist_agency',
        'festival_organizer',
        'editorial_discovery',
        'partner_feed',
        'organizer_account',
        'community_source'
      ]::text[]
    ),

  constraint event_sources_trust_tier_check
    check (
      trust_tier in (
        'official',
        'trusted',
        'discovery',
        'community'
      )
    ),

  constraint event_sources_authority_scope_check
    check (
      authority_scope in (
        'global_catalog',
        'own_events_only',
        'own_venue_only',
        'own_brands_only',
        'represented_artists_signal',
        'discovery_only',
        'community_only'
      )
    ),

  constraint event_sources_ingestion_modes_check
    check (
      ingestion_modes <@ array[
        'api',
        'json_ld',
        'public_page',
        'sitemap',
        'feed',
        'organizer_submission',
        'community_submission'
      ]::text[]
    ),

  constraint event_sources_integration_status_check
    check (
      integration_status in (
        'active',
        'planned',
        'partnership_required',
        'research_required',
        'manual',
        'suspended'
      )
    ),

  constraint event_sources_parent_not_self_check
    check (parent_source_id is null or parent_source_id <> source_id),

  constraint event_sources_automatic_publish_safety_check
    check (
      automatic_publish_eligible = false
      or (
        trust_tier in ('official', 'trusted')
        and authority_scope not in ('discovery_only', 'community_only')
      )
    )
);

create index if not exists event_sources_active_trust_idx
  on public.event_sources (is_active, trust_tier, integration_status);

create index if not exists event_sources_parent_idx
  on public.event_sources (parent_source_id);

create index if not exists event_sources_roles_gin_idx
  on public.event_sources using gin (roles);

create index if not exists event_sources_domains_gin_idx
  on public.event_sources using gin (domains);

create index if not exists event_sources_ingestion_modes_gin_idx
  on public.event_sources using gin (ingestion_modes);

create or replace function public.set_event_sources_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists event_sources_set_updated_at
  on public.event_sources;

create trigger event_sources_set_updated_at
before update on public.event_sources
for each row
execute function public.set_event_sources_updated_at();

alter table public.event_sources enable row level security;

alter table public.official_event_candidates
  add column if not exists source_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'official_event_candidates_source_id_fkey'
  ) then
    alter table public.official_event_candidates
      add constraint official_event_candidates_source_id_fkey
      foreign key (source_id)
      references public.event_sources(source_id)
      on delete set null;
  end if;
end $$;

create index if not exists official_event_candidates_source_id_idx
  on public.official_event_candidates (source_id);

comment on table public.event_sources is
  'National registry of event information sources, separated from the technical provider that ingests each candidate.';

comment on column public.event_sources.source_key is
  'Stable lowercase key used to identify a ticketing platform, venue, promoter, producer, agency, festival, editorial source, organizer, or community source.';

comment on column public.event_sources.roles is
  'One or more source roles, such as ticketing_platform, official_venue, official_producer, artist_agency, festival_organizer, or editorial_discovery.';

comment on column public.event_sources.trust_tier is
  'Trust tier for the source: official, trusted, discovery, or community.';

comment on column public.event_sources.authority_scope is
  'Scope in which the source can authoritatively confirm event information.';

comment on column public.event_sources.ingestion_modes is
  'Supported ingestion modes, such as api, json_ld, public_page, sitemap, feed, organizer_submission, or community_submission.';

comment on column public.event_sources.automatic_candidate_eligible is
  'Whether the source may create candidates automatically after its connector is explicitly enabled.';

comment on column public.event_sources.automatic_publish_eligible is
  'Whether the source may ever qualify for automatic publication. This foundation keeps all initial sources disabled.';

comment on column public.event_sources.requires_secondary_confirmation is
  'Whether candidates from this source require another trusted signal before confirmation or publication.';

comment on column public.official_event_candidates.source_id is
  'Optional reference to the real event information source. The provider column continues to represent the technical ingestion provider.';

insert into public.event_sources (
  source_key,
  display_name,
  roles,
  trust_tier,
  authority_scope,
  integration_status,
  automatic_candidate_eligible,
  automatic_publish_eligible,
  requires_secondary_confirmation
)
values
  ('ticketmaster', 'Ticketmaster', array['ticketing_platform'], 'official', 'global_catalog', 'active', false, false, true),
  ('ingresse', 'Ingresse', array['ticketing_platform'], 'official', 'global_catalog', 'partnership_required', false, false, true),
  ('blacktag', 'Blacktag', array['ticketing_platform'], 'official', 'global_catalog', 'research_required', false, false, true),
  ('shotgun', 'Shotgun', array['ticketing_platform'], 'official', 'global_catalog', 'research_required', false, false, true),
  ('sympla', 'Sympla', array['ticketing_platform'], 'official', 'global_catalog', 'partnership_required', false, false, true),
  ('blueticket', 'Blueticket', array['ticketing_platform'], 'official', 'global_catalog', 'research_required', false, false, true),
  ('eventbrite', 'Eventbrite', array['ticketing_platform'], 'official', 'global_catalog', 'planned', false, false, true),
  ('guicheweb', 'Guiche Web', array['ticketing_platform'], 'official', 'global_catalog', 'research_required', false, false, true),
  ('ticket360', 'Ticket360', array['ticketing_platform'], 'official', 'global_catalog', 'research_required', false, false, true),
  ('clube_do_ingresso', 'Clube do Ingresso', array['ticketing_platform'], 'official', 'global_catalog', 'research_required', false, false, true),
  ('eventim', 'EVENTIM', array['ticketing_platform'], 'official', 'global_catalog', 'research_required', false, false, true),
  ('green_valley', 'Green Valley', array['official_venue'], 'official', 'own_venue_only', 'research_required', false, false, true),
  ('surreal_park', 'Surreal Park', array['official_venue'], 'official', 'own_venue_only', 'research_required', false, false, true),
  ('d_edge', 'D-EDGE', array['official_venue'], 'official', 'own_venue_only', 'research_required', false, false, true),
  ('privilege_brasil', 'Privilège Brasil', array['official_venue'], 'official', 'own_venue_only', 'research_required', false, false, true),
  ('laroc_club', 'Laroc Club', array['official_venue'], 'official', 'own_venue_only', 'research_required', false, false, true),
  ('ame_club', 'AME Club', array['official_venue'], 'official', 'own_venue_only', 'research_required', false, false, true),
  ('club415', 'Club415', array['official_venue'], 'official', 'own_venue_only', 'research_required', false, false, true),
  ('entourage', 'Entourage', array['artist_agency','official_promoter','official_producer'], 'official', 'own_events_only', 'research_required', false, false, true),
  ('be_on_entertainment', 'BE ON Entertainment', array['official_promoter','official_producer'], 'official', 'own_events_only', 'research_required', false, false, true),
  ('agencia_today', 'Agência Today', array['official_promoter','official_producer'], 'official', 'own_events_only', 'research_required', false, false, true),
  ('tomorrowland_brasil', 'Tomorrowland Brasil', array['festival_organizer','official_promoter'], 'official', 'own_brands_only', 'research_required', false, false, true),
  ('so_track_boa', 'Só Track Boa', array['festival_organizer','official_promoter'], 'official', 'own_brands_only', 'research_required', false, false, true),
  ('boma', 'BOMA', array['festival_organizer','official_promoter'], 'official', 'own_brands_only', 'research_required', false, false, true),
  ('time_warp_brasil', 'Time Warp Brasil', array['festival_organizer','official_promoter'], 'official', 'own_brands_only', 'research_required', false, false, true),
  ('playbpm', 'PlayBPM', array['editorial_discovery'], 'discovery', 'discovery_only', 'research_required', false, false, true),
  ('bandsintown', 'Bandsintown', array['editorial_discovery'], 'trusted', 'discovery_only', 'research_required', false, false, true)
on conflict (source_key) do nothing;
