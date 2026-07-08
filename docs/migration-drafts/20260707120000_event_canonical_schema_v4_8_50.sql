-- 20260707120000_event_canonical_schema_v4_8_50.sql
-- Version: v4.8.50-event-canonical-migration-file-draft-foundation
--
-- LOCAL MIGRATION FILE DRAFT ONLY.
--
-- This file intentionally lives in docs/migration-drafts.
-- It is formatted like a future Supabase migration filename, but it is not a real Supabase migration file yet.
-- Do not copy this file into supabase/migrations in this version.
-- Do not apply this SQL to Supabase in this version.
-- Do not execute this SQL directly against production.
--
-- Required before a future real migration version:
-- 1. confirmed database backup reference;
-- 2. reviewed SQL;
-- 3. reviewed RLS policies;
-- 4. reviewed service_role write path;
-- 5. reviewed admin write path;
-- 6. reviewed Supabase diff;
-- 7. approved production window;
-- 8. approved rollback ownership;
-- 9. approved post-migration validation.

create extension if not exists pgcrypto;

create table if not exists public.canonical_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  normalized_event_name text not null,
  starts_at timestamptz not null,
  event_date_key date not null,
  venue_name text,
  city text,
  state text,
  country text,
  official_url text,
  ticket_url text,
  primary_provider_key text,
  primary_external_event_id text,
  is_100_percent_validated boolean not null default false,
  validation_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canonical_events_validated_check check (is_100_percent_validated = true),
  constraint canonical_events_authority_reference_check check (
    official_url is not null
    or ticket_url is not null
    or primary_external_event_id is not null
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
  source_payload_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint canonical_event_sources_authority_score_check check (
    authority_score >= 0 and authority_score <= 100
  ),
  constraint canonical_event_sources_unique_source unique (canonical_event_id, source_key)
);

create table if not exists public.canonical_event_search_documents (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null unique references public.canonical_events(id) on delete cascade,
  search_title text not null,
  normalized_title text not null,
  event_date_key date not null,
  canonical_slug_seed text not null,
  search_tokens text[] not null default array[]::text[],
  availability_scope text[] not null default array[]::text[],
  search_rank_score integer not null default 0,
  source_trace_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.canonical_event_feature_feeds (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  feed_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canonical_event_feature_feeds_unique_feature unique (canonical_event_id, feature_key)
);

create index if not exists canonical_events_identity_lookup_idx
  on public.canonical_events (normalized_event_name, event_date_key, city, state);

create unique index if not exists canonical_events_primary_external_source_idx
  on public.canonical_events (primary_provider_key, primary_external_event_id)
  where primary_provider_key is not null and primary_external_event_id is not null;

create index if not exists canonical_event_sources_event_id_idx
  on public.canonical_event_sources (canonical_event_id);

create index if not exists canonical_event_sources_kind_idx
  on public.canonical_event_sources (source_kind);

create index if not exists canonical_event_sources_provider_external_idx
  on public.canonical_event_sources (provider_key, external_event_id);

create index if not exists canonical_event_search_documents_lookup_idx
  on public.canonical_event_search_documents (normalized_title, event_date_key, search_rank_score desc);

create index if not exists canonical_event_search_documents_tokens_gin_idx
  on public.canonical_event_search_documents using gin (search_tokens);

create index if not exists canonical_event_feature_feeds_event_id_idx
  on public.canonical_event_feature_feeds (canonical_event_id);

create index if not exists canonical_event_feature_feeds_feature_key_idx
  on public.canonical_event_feature_feeds (feature_key);

alter table public.canonical_events enable row level security;
alter table public.canonical_event_sources enable row level security;
alter table public.canonical_event_search_documents enable row level security;
alter table public.canonical_event_feature_feeds enable row level security;

-- RLS policy placeholder.
-- No permissive policies are included in this draft.
-- A future real migration must define:
-- 1. controlled service_role write policy/path;
-- 2. protected admin write policy/path;
-- 3. approved public read policy for published canonical search documents;
-- 4. explicit denial or omission for unapproved write paths.

-- Rollback review notes:
-- drop table if exists public.canonical_event_feature_feeds;
-- drop table if exists public.canonical_event_search_documents;
-- drop table if exists public.canonical_event_sources;
-- drop table if exists public.canonical_events;