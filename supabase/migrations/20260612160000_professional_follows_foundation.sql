begin;

create table if not exists public.professional_follows (
  id uuid primary key default gen_random_uuid(),
  follower_user_id uuid not null references auth.users(id) on delete cascade,
  followed_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default now(),

  constraint professional_follows_no_self_follow
    check (follower_user_id <> followed_user_id),

  constraint professional_follows_unique_pair
    unique (follower_user_id, followed_user_id)
);

create index if not exists professional_follows_follower_user_id_idx
  on public.professional_follows (follower_user_id);

create index if not exists professional_follows_followed_user_id_idx
  on public.professional_follows (followed_user_id);

alter table public.professional_follows enable row level security;

drop policy if exists professional_follows_public_select
on public.professional_follows;

create policy professional_follows_public_select
on public.professional_follows
for select
to anon, authenticated
using (true);

drop policy if exists professional_follows_insert_own
on public.professional_follows;

create policy professional_follows_insert_own
on public.professional_follows
for insert
to authenticated
with check (
  auth.uid() = follower_user_id
  and follower_user_id <> followed_user_id
  and exists (
    select 1
    from public.professional_profiles pp
    where pp.user_id = followed_user_id
      and pp.visible_in_network = true
  )
  and not exists (
    select 1
    from public.professional_relationship_controls prc
    where prc.status = 'blocked'
      and (
        (
          prc.owner_user_id = follower_user_id
          and prc.target_user_id = followed_user_id
        )
        or
        (
          prc.owner_user_id = followed_user_id
          and prc.target_user_id = follower_user_id
        )
      )
  )
);

drop policy if exists professional_follows_delete_own
on public.professional_follows;

create policy professional_follows_delete_own
on public.professional_follows
for delete
to authenticated
using (
  auth.uid() = follower_user_id
);

comment on table public.professional_follows is
  'Relacao unilateral de seguir no Perfil Pro. Seguir e diferente de conexao profissional.';

comment on column public.professional_follows.follower_user_id is
  'Usuario que segue.';

comment on column public.professional_follows.followed_user_id is
  'Usuario seguido.';

commit;