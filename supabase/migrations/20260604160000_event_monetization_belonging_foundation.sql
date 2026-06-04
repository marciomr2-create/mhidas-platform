-- supabase/migrations/20260604160000_event_monetization_belonging_foundation.sql

begin;

create extension if not exists pgcrypto;

alter table public.event_groups
  add column if not exists partner_ticket_url text,
  add column if not exists partner_ticket_status text not null default 'inactive',
  add column if not exists partner_ticket_partner_name text,
  add column if not exists partner_ticket_source text not null default 'none',
  add column if not exists partner_ticket_button_label text not null default 'Comprar ingresso',
  add column if not exists partner_ticket_notes text,
  add column if not exists partner_ticket_is_featured boolean not null default false,
  add column if not exists partner_ticket_activated_at timestamptz,
  add column if not exists partner_ticket_paused_at timestamptz,
  add column if not exists partner_ticket_expires_at timestamptz,
  add column if not exists partner_ticket_updated_at timestamptz,
  add column if not exists partner_ticket_updated_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_groups_partner_ticket_status_check'
  ) then
    alter table public.event_groups
      add constraint event_groups_partner_ticket_status_check
      check (
        partner_ticket_status in (
          'inactive',
          'review',
          'active',
          'paused',
          'expired',
          'rejected'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_groups_partner_ticket_source_check'
  ) then
    alter table public.event_groups
      add constraint event_groups_partner_ticket_source_check
      check (
        partner_ticket_source in (
          'none',
          'admin',
          'partner_request',
          'manual',
          'other'
        )
      );
  end if;
end $$;

create index if not exists event_groups_partner_ticket_status_idx
  on public.event_groups (partner_ticket_status);

create index if not exists event_groups_partner_ticket_active_idx
  on public.event_groups (partner_ticket_status, partner_ticket_activated_at desc)
  where partner_ticket_status = 'active';

create index if not exists event_groups_partner_ticket_featured_idx
  on public.event_groups (partner_ticket_is_featured, partner_ticket_activated_at desc)
  where partner_ticket_is_featured = true;

comment on column public.event_groups.partner_ticket_url is
  'Admin-controlled monetized ticket sales URL. This is different from official_url.';

comment on column public.event_groups.official_url is
  'Official reference URL used to validate event identity. This is not necessarily a monetized ticket URL.';

comment on column public.event_groups.partner_ticket_status is
  'Commercial ticket URL status controlled by the ecosystem admin.';

comment on column public.event_groups.partner_ticket_partner_name is
  'Commercial partner name for the monetized ticket URL.';

comment on column public.event_groups.partner_ticket_source is
  'Source of the commercial ticket URL. Only admin-controlled activation should publish this URL.';

comment on column public.event_groups.partner_ticket_notes is
  'Internal commercial notes for ticket partnership control.';

revoke insert (
  partner_ticket_url,
  partner_ticket_status,
  partner_ticket_partner_name,
  partner_ticket_source,
  partner_ticket_button_label,
  partner_ticket_notes,
  partner_ticket_is_featured,
  partner_ticket_activated_at,
  partner_ticket_paused_at,
  partner_ticket_expires_at,
  partner_ticket_updated_at,
  partner_ticket_updated_by
) on table public.event_groups from anon, authenticated;

revoke update (
  partner_ticket_url,
  partner_ticket_status,
  partner_ticket_partner_name,
  partner_ticket_source,
  partner_ticket_button_label,
  partner_ticket_notes,
  partner_ticket_is_featured,
  partner_ticket_activated_at,
  partner_ticket_paused_at,
  partner_ticket_expires_at,
  partner_ticket_updated_at,
  partner_ticket_updated_by
) on table public.event_groups from anon, authenticated;

create table if not exists public.event_ticket_intents (
  intent_id uuid primary key default gen_random_uuid(),
  event_group_id uuid not null references public.event_groups(group_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'interested',
  source text not null default 'event_page',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_ticket_intents_status_check
    check (
      status in (
        'interested',
        'wants_ticket',
        'ticket_acquired',
        'cancelled',
        'checked_in'
      )
    ),
  constraint event_ticket_intents_source_check
    check (
      source in (
        'event_page',
        'club_profile',
        'admin',
        'import',
        'other'
      )
    ),
  constraint event_ticket_intents_unique_user_event
    unique (event_group_id, user_id)
);

create index if not exists event_ticket_intents_event_status_idx
  on public.event_ticket_intents (event_group_id, status);

create index if not exists event_ticket_intents_user_status_idx
  on public.event_ticket_intents (user_id, status);

create index if not exists event_ticket_intents_updated_idx
  on public.event_ticket_intents (updated_at desc);

alter table public.event_ticket_intents enable row level security;

drop policy if exists event_ticket_intents_select_own
  on public.event_ticket_intents;

create policy event_ticket_intents_select_own
  on public.event_ticket_intents
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists event_ticket_intents_insert_own
  on public.event_ticket_intents;

create policy event_ticket_intents_insert_own
  on public.event_ticket_intents
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists event_ticket_intents_update_own
  on public.event_ticket_intents;

create policy event_ticket_intents_update_own
  on public.event_ticket_intents
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.event_ticket_intents to authenticated;
revoke all on public.event_ticket_intents from anon;
revoke delete on public.event_ticket_intents from authenticated;

comment on table public.event_ticket_intents is
  'Clubber event intent table: interested, wants_ticket, ticket_acquired, cancelled, checked_in.';

comment on column public.event_ticket_intents.status is
  'Clubber self-declared event ticket or presence intent.';

comment on column public.event_ticket_intents.source is
  'Where the Clubber intent was created from.';

create table if not exists public.partner_ticket_requests (
  request_id uuid primary key default gen_random_uuid(),
  event_group_id uuid references public.event_groups(group_id) on delete set null,
  requested_by_user_id uuid references auth.users(id) on delete set null,
  partner_type text not null default 'other',
  partner_name text not null default '',
  request_type text not null default 'ticket_sales',
  request_status text not null default 'pending',
  event_name text,
  event_date date,
  city text,
  state text,
  country text,
  venue_name text,
  current_ticket_url text,
  requested_ticket_url text,
  proposed_benefit text,
  contact_name text,
  contact_email text,
  contact_whatsapp text,
  commercial_notes text,
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  activated_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  activated_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_ticket_requests_partner_type_check
    check (
      partner_type in (
        'agency',
        'event',
        'artist',
        'label',
        'club',
        'producer',
        'ticketing',
        'other'
      )
    ),
  constraint partner_ticket_requests_request_type_check
    check (
      request_type in (
        'ticket_sales',
        'discount',
        'pre_sale',
        'giveaway',
        'official_update',
        'other'
      )
    ),
  constraint partner_ticket_requests_status_check
    check (
      request_status in (
        'pending',
        'needs_info',
        'approved',
        'rejected',
        'active',
        'paused',
        'expired'
      )
    )
);

create index if not exists partner_ticket_requests_status_idx
  on public.partner_ticket_requests (request_status, created_at desc);

create index if not exists partner_ticket_requests_event_group_idx
  on public.partner_ticket_requests (event_group_id);

create index if not exists partner_ticket_requests_partner_type_idx
  on public.partner_ticket_requests (partner_type);

create index if not exists partner_ticket_requests_created_idx
  on public.partner_ticket_requests (created_at desc);

alter table public.partner_ticket_requests enable row level security;

revoke all on public.partner_ticket_requests from anon, authenticated;

comment on table public.partner_ticket_requests is
  'Commercial ticket partnership requests. Partners can request, but only admin can approve and activate monetized ticket links.';

comment on column public.partner_ticket_requests.request_status is
  'Commercial request status controlled by the ecosystem admin workflow.';

comment on column public.partner_ticket_requests.requested_ticket_url is
  'Ticket URL suggested by a partner. It is not public until admin approval and activation.';

comment on column public.partner_ticket_requests.proposed_benefit is
  'Partner proposal such as discount, pre-sale, giveaway, lot change, or exclusive benefit.';

commit;