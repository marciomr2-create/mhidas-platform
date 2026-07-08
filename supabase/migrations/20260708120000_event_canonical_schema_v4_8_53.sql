-- 20260708120000_event_canonical_schema_v4_8_53.sql
-- Version: v4.8.53-event-canonical-schema-real-migration
--
-- Purpose:
-- Create the canonical event engine schema required for the real pilot.
--
-- Safety context:
-- Backup completed before this file was created:
-- - schema hash: F8C87AA61179C99FB03566D795BF890D79D24A6EA9CB5C1F9831E5F0704EDB49
-- - data hash: B0713FF2580DAA1C573732E4D774CDC6776ACE962763D448614AB67214A268FA
-- - manifest hash: 8D1084A644E6A02479B7980BC64E3394B2B88C8C4F01679B03763CEBB1282F4F
--
-- This migration prepares the 20-day real pilot motor:
-- canonical_event_id becomes the stable event identity for:
-- event page, ticket intent, check-in, rides, meetups, connections, radar and search.
--
-- Ticketing APIs are intentionally not required by this migration.
-- The schema prepares provider fields for the 60-day ticketing integration path.

create extension if not exists pgcrypto;

create table if not exists public.canonical_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  event_name text not null,
  normalized_event_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  event_date_key date not null,
  venue_name text,
  city text,
  state text,
  country text not null default 'BR',
  official_url text,
  ticket_url text,
  primary_provider_key text,
  primary_external_event_id text,
  validation_status text not null default 'validated',
  validation_method text not null default 'manual_admin',
  is_100_percent_validated boolean not null default true,
  source_confidence_score integer not null default 100,
  validation_summary jsonb not null default '{}'::jsonb,
  feature_policy jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canonical_events_slug_unique unique (slug),
  constraint canonical_events_confidence_score_check check (
    source_confidence_score >= 0 and source_confidence_score <= 100
  ),
  constraint canonical_events_validation_status_check check (
    validation_status in ('draft', 'validated', 'published', 'archived', 'rejected')
  ),
  constraint canonical_events_validation_method_check check (
    validation_method in (
      'manual_admin',
      'ticketing_api',
      'official_event_site',
      'official_ticketing_public_page',
      'official_venue_site',
      'official_producer_site',
      'official_artist_source',
      'multi_source_review'
    )
  ),
  constraint canonical_events_validated_requires_confidence_check check (
    validation_status not in ('validated', 'published')
    or (is_100_percent_validated = true and source_confidence_score >= 80)
  ),
  constraint canonical_events_authority_reference_check check (
    official_url is not null
    or ticket_url is not null
    or primary_external_event_id is not null
    or validation_method = 'manual_admin'
  )
);

create table if not exists public.canonical_event_sources (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete cascade,
  source_key text not null,
  source_kind text not null,
  provider_key text,
  external_event_id text,
  source_url text,
  authority_score integer not null default 0,
  ingestion_mode text not null default 'manual_admin',
  integration_status text not null default 'not_integrated',
  source_payload_summary jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint canonical_event_sources_authority_score_check check (
    authority_score >= 0 and authority_score <= 100
  ),
  constraint canonical_event_sources_source_kind_check check (
    source_kind in (
      'ticketing_api',
      'ticketing_public_page',
      'official_event_site',
      'official_venue_site',
      'official_producer_site',
      'official_artist_source',
      'social_official_post',
      'editorial_source',
      'manual_admin_review',
      'other_official_source'
    )
  ),
  constraint canonical_event_sources_ingestion_mode_check check (
    ingestion_mode in ('manual_admin', 'api_authorized', 'future_api_authorized', 'public_reference')
  ),
  constraint canonical_event_sources_integration_status_check check (
    integration_status in ('not_integrated', 'prepared', 'authorized', 'active', 'paused', 'failed')
  ),
  constraint canonical_event_sources_unique_source unique (canonical_event_id, source_key)
);

create table if not exists public.canonical_event_search_documents (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null unique references public.canonical_events(id) on delete cascade,
  search_title text not null,
  normalized_title text not null,
  event_date_key date not null,
  canonical_slug text not null,
  venue_name text,
  city text,
  state text,
  country text not null default 'BR',
  search_tokens text[] not null default array[]::text[],
  availability_scope text[] not null default array[]::text[],
  search_rank_score integer not null default 0,
  source_trace_summary jsonb not null default '{}'::jsonb,
  is_publicly_searchable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canonical_event_search_documents_slug_unique unique (canonical_slug)
);

create table if not exists public.canonical_event_feature_feeds (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  feed_policy jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canonical_event_feature_feeds_feature_key_check check (
    feature_key in (
      'ticket_intent',
      'check_in',
      'rides',
      'meetups',
      'connections',
      'social_radar',
      'search_autocomplete'
    )
  ),
  constraint canonical_event_feature_feeds_unique_feature unique (canonical_event_id, feature_key)
);

create index if not exists canonical_events_identity_lookup_idx
  on public.canonical_events (normalized_event_name, event_date_key, city, state);

create index if not exists canonical_events_slug_idx
  on public.canonical_events (slug);

create index if not exists canonical_events_validation_status_idx
  on public.canonical_events (validation_status);

create unique index if not exists canonical_events_primary_external_source_idx
  on public.canonical_events (primary_provider_key, primary_external_event_id)
  where primary_provider_key is not null and primary_external_event_id is not null;

create index if not exists canonical_event_sources_event_id_idx
  on public.canonical_event_sources (canonical_event_id);

create index if not exists canonical_event_sources_kind_idx
  on public.canonical_event_sources (source_kind);

create index if not exists canonical_event_sources_provider_external_idx
  on public.canonical_event_sources (provider_key, external_event_id);

create index if not exists canonical_event_sources_integration_status_idx
  on public.canonical_event_sources (integration_status);

create index if not exists canonical_event_search_documents_lookup_idx
  on public.canonical_event_search_documents (
    normalized_title,
    event_date_key,
    search_rank_score desc
  );

create index if not exists canonical_event_search_documents_tokens_gin_idx
  on public.canonical_event_search_documents using gin (search_tokens);

create index if not exists canonical_event_search_documents_public_idx
  on public.canonical_event_search_documents (is_publicly_searchable);

create index if not exists canonical_event_feature_feeds_event_id_idx
  on public.canonical_event_feature_feeds (canonical_event_id);

create index if not exists canonical_event_feature_feeds_feature_key_idx
  on public.canonical_event_feature_feeds (feature_key);

create index if not exists canonical_event_feature_feeds_enabled_idx
  on public.canonical_event_feature_feeds (enabled);

alter table public.canonical_events enable row level security;
alter table public.canonical_event_sources enable row level security;
alter table public.canonical_event_search_documents enable row level security;
alter table public.canonical_event_feature_feeds enable row level security;

create policy "Public can read validated canonical events"
  on public.canonical_events
  for select
  using (
    validation_status in ('validated', 'published')
    and is_100_percent_validated = true
  );

create policy "Authenticated users can read canonical event sources"
  on public.canonical_event_sources
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.canonical_events ce
      where ce.id = canonical_event_sources.canonical_event_id
        and ce.validation_status in ('validated', 'published')
        and ce.is_100_percent_validated = true
    )
  );

create policy "Public can read searchable canonical event documents"
  on public.canonical_event_search_documents
  for select
  using (
    is_publicly_searchable = true
    and exists (
      select 1
      from public.canonical_events ce
      where ce.id = canonical_event_search_documents.canonical_event_id
        and ce.validation_status in ('validated', 'published')
        and ce.is_100_percent_validated = true
    )
  );

create policy "Public can read enabled canonical event feature feeds"
  on public.canonical_event_feature_feeds
  for select
  using (
    enabled = true
    and exists (
      select 1
      from public.canonical_events ce
      where ce.id = canonical_event_feature_feeds.canonical_event_id
        and ce.validation_status in ('validated', 'published')
        and ce.is_100_percent_validated = true
    )
  );

-- Write policies are intentionally not created in this migration.
-- Writes must happen through server-side admin/service-role controlled paths.

-- Rollback notes:
-- drop policy if exists "Public can read enabled canonical event feature feeds" on public.canonical_event_feature_feeds;
-- drop policy if exists "Public can read searchable canonical event documents" on public.canonical_event_search_documents;
-- drop policy if exists "Authenticated users can read canonical event sources" on public.canonical_event_sources;
-- drop policy if exists "Public can read validated canonical events" on public.canonical_events;
-- drop table if exists public.canonical_event_feature_feeds;
-- drop table if exists public.canonical_event_search_documents;
-- drop table if exists public.canonical_event_sources;
-- drop table if exists public.canonical_events;