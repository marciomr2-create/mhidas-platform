-- supabase/migrations/20260526160000_sync_event_official_review_status.sql

create or replace function public.upsert_event_group_from_profile(
  p_creator_user_id uuid,
  p_card_id uuid,
  p_group_type public.event_group_type,
  p_event_name text,
  p_event_date date,
  p_event_url text,
  p_city_base text,
  p_title text default null::text,
  p_description text default null::text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_group_id uuid;
  v_event_slug text;
  v_clean_event_url text;
begin
  if p_creator_user_id is null then
    raise exception 'creator_user_id obrigatorio';
  end if;

  if trim(coalesce(p_event_name, '')) = '' then
    raise exception 'event_name obrigatorio';
  end if;

  v_event_slug := public.slugify_event_name(p_event_name);
  v_clean_event_url := nullif(trim(coalesce(p_event_url, '')), '');

  select eg.group_id
  into v_group_id
  from public.event_groups eg
  where eg.creator_user_id = p_creator_user_id
    and eg.group_type = p_group_type
    and coalesce(eg.event_slug, '') = coalesce(v_event_slug, '')
    and coalesce(eg.event_date, date '1900-01-01') = coalesce(p_event_date, date '1900-01-01')
    and eg.status = 'active'
  limit 1;

  if v_group_id is null then
    insert into public.event_groups (
      group_type,
      status,
      creator_user_id,
      card_id,
      event_name,
      event_date,
      event_url,
      official_url,
      official_source_type,
      official_status,
      official_confidence,
      official_checked_at,
      official_notes,
      event_slug,
      city_base,
      title,
      description,
      is_public
    )
    values (
      p_group_type,
      'active',
      p_creator_user_id,
      p_card_id,
      trim(p_event_name),
      p_event_date,
      v_clean_event_url,
      v_clean_event_url,
      case when v_clean_event_url is not null then 'user_suggestion' else null end,
      case when v_clean_event_url is not null then 'review' else 'missing' end,
      case when v_clean_event_url is not null then 35 else 0 end,
      case when v_clean_event_url is not null then now() else null end,
      case when v_clean_event_url is not null then 'Auto-filled from Club profile event link. Requires manual confirmation.' else null end,
      v_event_slug,
      nullif(trim(coalesce(p_city_base, '')), ''),
      nullif(trim(coalesce(p_title, '')), ''),
      nullif(trim(coalesce(p_description, '')), ''),
      true
    )
    returning group_id
    into v_group_id;
  else
    update public.event_groups
    set
      card_id = p_card_id,
      event_name = trim(p_event_name),
      event_date = p_event_date,
      event_url = v_clean_event_url,
      official_url = case
        when official_status = 'confirmed' then official_url
        when v_clean_event_url is not null then v_clean_event_url
        else official_url
      end,
      official_source_type = case
        when official_status = 'confirmed' then official_source_type
        when v_clean_event_url is not null then 'user_suggestion'
        else official_source_type
      end,
      official_status = case
        when official_status = 'confirmed' then official_status
        when v_clean_event_url is not null then 'review'
        else coalesce(official_status, 'missing')
      end,
      official_confidence = case
        when official_status = 'confirmed' then official_confidence
        when v_clean_event_url is not null then greatest(coalesce(official_confidence, 0), 35)
        else coalesce(official_confidence, 0)
      end,
      official_checked_at = case
        when official_status = 'confirmed' then official_checked_at
        when v_clean_event_url is not null then now()
        else official_checked_at
      end,
      official_notes = case
        when official_status = 'confirmed' then official_notes
        when v_clean_event_url is not null then 'Auto-filled from Club profile event link. Requires manual confirmation.'
        else official_notes
      end,
      event_slug = v_event_slug,
      city_base = nullif(trim(coalesce(p_city_base, '')), ''),
      title = nullif(trim(coalesce(p_title, '')), ''),
      description = nullif(trim(coalesce(p_description, '')), ''),
      status = 'active',
      is_public = true
    where group_id = v_group_id;
  end if;

  insert into public.event_group_members (
    group_id,
    user_id,
    role,
    status,
    joined_at,
    decided_at
  )
  values (
    v_group_id,
    p_creator_user_id,
    'creator',
    'approved',
    now(),
    now()
  )
  on conflict (group_id, user_id)
  do update set
    role = 'creator',
    status = 'approved',
    joined_at = coalesce(public.event_group_members.joined_at, now()),
    decided_at = now(),
    updated_at = now();

  return v_group_id;
end;
$$;

alter function public.upsert_event_group_from_profile(
  uuid,
  uuid,
  public.event_group_type,
  text,
  date,
  text,
  text,
  text,
  text
) owner to postgres;

