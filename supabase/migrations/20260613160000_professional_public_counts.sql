begin;

create or replace function public.get_professional_public_counts(p_user_id uuid)
returns table (
  followers_count bigint,
  following_count bigint,
  connections_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (
      select count(*)
      from public.professional_follows pf
      where pf.followed_user_id = p_user_id
    )::bigint as followers_count,
    (
      select count(*)
      from public.professional_follows pf
      where pf.follower_user_id = p_user_id
    )::bigint as following_count,
    (
      select count(distinct
        case
          when pc.requester_user_id = p_user_id then pc.target_user_id
          else pc.requester_user_id
        end
      )
      from public.professional_connections pc
      where pc.status = 'accepted'
        and (
          pc.requester_user_id = p_user_id
          or pc.target_user_id = p_user_id
        )
    )::bigint as connections_count
  where exists (
    select 1
    from public.professional_profiles pp
    where pp.user_id = p_user_id
      and pp.visible_in_network = true
  );
$$;

grant execute on function public.get_professional_public_counts(uuid)
to anon, authenticated;

comment on function public.get_professional_public_counts(uuid) is
  'Public safe counters for Pro profile: followers, following and accepted professional connections.';

commit;
