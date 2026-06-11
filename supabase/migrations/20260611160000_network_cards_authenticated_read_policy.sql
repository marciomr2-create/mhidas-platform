begin;

drop policy if exists cards_authenticated_select_published_active
on public.cards;

create policy cards_authenticated_select_published_active
on public.cards
for select
to authenticated
using (
  status = 'active'::card_status
  and is_published = true
  and slug is not null
  and btrim(slug) <> ''
);

commit;