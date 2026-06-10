-- supabase/migrations/20260610160000_professional_search_keywords_schema.sql

begin;

alter table public.professional_profiles
  add column if not exists search_keywords text[]
  not null
  default '{}'::text[];

create or replace function public.is_valid_professional_search_keywords(
  value text[]
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    value is not null
    and cardinality(value) <= 10
    and not exists (
      select 1
      from unnest(value) as keyword
      where keyword is null
         or btrim(keyword) = ''
    )
    and cardinality(value) = (
      select count(distinct lower(btrim(keyword)))
      from unnest(value) as keyword
    );
$$;

alter table public.professional_profiles
  drop constraint if exists professional_profiles_search_keywords_valid;

alter table public.professional_profiles
  add constraint professional_profiles_search_keywords_valid
  check (
    public.is_valid_professional_search_keywords(search_keywords)
  );

create index if not exists professional_profiles_search_keywords_gin_idx
  on public.professional_profiles
  using gin (search_keywords);

comment on column public.professional_profiles.search_keywords is
  'Até 10 palavras-chave profissionais para busca por produtos, serviços e competências.';

commit;
