begin;

do $$
begin
  if to_regclass('public.event_groups') is null then
    raise exception 'MVP2_PASSO8_EVENT_GROUPS_MISSING';
  end if;

  if to_regclass('public.canonical_events') is null then
    raise exception 'MVP2_PASSO8_CANONICAL_EVENTS_MISSING';
  end if;

  if to_regclass('public.event_group_canonical_links') is not null then
    raise exception 'MVP2_PASSO8_BRIDGE_ALREADY_EXISTS';
  end if;
end
$$;

create table public.event_group_canonical_links (
  event_group_id uuid primary key
    references public.event_groups(group_id)
    on delete cascade,

  canonical_event_id uuid not null
    references public.canonical_events(id)
    on delete restrict,

  link_method text not null,

  linked_by_user_id uuid
    references auth.users(id)
    on delete set null,

  linked_at timestamptz not null default now(),

  constraint event_group_canonical_links_method_check
    check (
      link_method in (
        'admin_confirmed',
        'deterministic_backfill'
      )
    )
);

create index event_group_canonical_links_canonical_event_idx
  on public.event_group_canonical_links (canonical_event_id);

comment on table public.event_group_canonical_links is
'Controlled bridge between legacy/social event_groups and canonical_events. One event_group may link to at most one canonical_event; one canonical_event may link to multiple event_groups.';

comment on column public.event_group_canonical_links.event_group_id is
'Stable social event container identity. Primary key prevents multiple canonical links for one event_group.';

comment on column public.event_group_canonical_links.canonical_event_id is
'Canonical event identity. Intentionally not unique to allow multiple event_groups for one canonical_event.';

comment on column public.event_group_canonical_links.link_method is
'Controlled authority used to establish the link. Slug equality alone never creates a link.';

alter table public.event_group_canonical_links
  enable row level security;

revoke all
  on table public.event_group_canonical_links
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.event_group_canonical_links
  to service_role;

commit;