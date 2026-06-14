begin;

create or replace function public.get_professional_public_follow_preview(
  p_user_id uuid,
  p_limit integer default 6
)
returns table (
  list_type text,
  user_id uuid,
  slug text,
  label text,
  profession text,
  company_name text,
  city text,
  pro_photo_url text,
  sort_created_at timestamp with time zone
)
language sql
security definer
set search_path = public
as $$
  with safe_limit as (
    select greatest(1, least(coalesce(p_limit, 6), 12)) as value
  ),
  target_profile as (
    select pp.user_id
    from public.professional_profiles pp
    where pp.user_id = p_user_id
      and pp.visible_in_network = true
  ),
  follower_users as (
    select
      'followers'::text as list_type,
      pf.follower_user_id as related_user_id,
      pf.created_at as sort_created_at
    from public.professional_follows pf
    join target_profile tp
      on tp.user_id = pf.followed_user_id
  ),
  following_users as (
    select
      'following'::text as list_type,
      pf.followed_user_id as related_user_id,
      pf.created_at as sort_created_at
    from public.professional_follows pf
    join target_profile tp
      on tp.user_id = pf.follower_user_id
  ),
  combined as (
    select * from follower_users
    union all
    select * from following_users
  ),
  visible_profiles as (
    select
      combined.list_type,
      pp.user_id,
      public_card.slug,
      public_card.label,
      pp.profession,
      pp.company_name,
      pp.city,
      pp.pro_photo_url,
      combined.sort_created_at,
      row_number() over (
        partition by combined.list_type
        order by combined.sort_created_at desc, pp.user_id
      ) as rn
    from combined
    join public.professional_profiles pp
      on pp.user_id = combined.related_user_id
     and pp.visible_in_network = true
    join lateral (
      select c.slug, c.label
      from public.cards c
      where c.user_id = combined.related_user_id
        and c.is_published = true
        and c.slug is not null
        and btrim(c.slug) <> ''
      order by c.slug asc
      limit 1
    ) public_card on true
    where not exists (
      select 1
      from public.professional_relationship_controls prc
      where prc.status in ('blocked', 'suspended')
        and (
          (
            prc.owner_user_id = p_user_id
            and prc.target_user_id = combined.related_user_id
          )
          or
          (
            prc.owner_user_id = combined.related_user_id
            and prc.target_user_id = p_user_id
          )
        )
    )
  )
  select
    visible_profiles.list_type,
    visible_profiles.user_id,
    visible_profiles.slug,
    visible_profiles.label,
    visible_profiles.profession,
    visible_profiles.company_name,
    visible_profiles.city,
    visible_profiles.pro_photo_url,
    visible_profiles.sort_created_at
  from visible_profiles
  cross join safe_limit
  where visible_profiles.rn <= safe_limit.value
  order by visible_profiles.list_type, visible_profiles.sort_created_at desc;
$$;

grant execute on function public.get_professional_public_follow_preview(uuid, integer)
to anon, authenticated;

comment on function public.get_professional_public_follow_preview(uuid, integer) is
  'Public safe preview for Pro profile followers and following lists. Returns only public professional profiles and published card slugs.';

commit;
