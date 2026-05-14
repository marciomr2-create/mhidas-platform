-- 2026-05-14
-- Correção de segurança Supabase
-- Objetivo:
-- 1. Ativar RLS em public.public_profile_clicks.
-- 2. Remover acesso direto público à tabela public.public_profile_clicks.
-- 3. Manter incremento de cliques via função SECURITY DEFINER.
-- 4. Corrigir a view public.social_link_click_counts para security_invoker.
-- 5. Remover acesso anon direto à view, mantendo leitura autenticada para dashboard.

begin;

create or replace function public.increment_public_profile_click(p_slug text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clicks bigint;
begin
  insert into public.public_profile_clicks (slug, clicks, updated_at)
  values (p_slug, 1, now())
  on conflict (slug)
  do update set
    clicks = public.public_profile_clicks.clicks + 1,
    updated_at = now()
  returning clicks into v_clicks;

  return v_clicks;
end;
$$;

alter table public.public_profile_clicks enable row level security;

revoke all on table public.public_profile_clicks from anon;
revoke all on table public.public_profile_clicks from authenticated;

grant execute on function public.increment_public_profile_click(text) to anon;
grant execute on function public.increment_public_profile_click(text) to authenticated;
grant execute on function public.increment_public_profile_click(text) to service_role;

alter view public.social_link_click_counts
set (security_invoker = true);

revoke all on table public.social_link_click_counts from anon;
revoke all on table public.social_link_click_counts from authenticated;

grant select on table public.social_link_click_counts to authenticated;
grant select on table public.social_link_click_counts to service_role;

commit;
