-- Humans Only 2.0 — Profil-Einstellungen.
-- Additiv: neue Profilfelder, eigene Benachrichtigungs-Einstellungen, Schreib-RPCs, öffentliches Profil.
-- Die Sichtbarkeitsstufen members/hidden steuern die Darstellung der Profilseite unter Mitgliedern.
-- Nur "public" öffnet Daten nach außen (anon) und wird hier hart erzwungen: nur über get_public_profile()
-- und die Avatar-Storage-Policy, niemals über Tabellenzugriff.
begin;

alter table public.profiles
  add column location text not null default '' check (length(location) <= 60),
  add column pronouns text not null default '' check (length(pronouns) <= 30),
  add column links jsonb not null default '[]' check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 5),
  add column visibility text not null default 'members' check (visibility in ('members','public','hidden')),
  add column show_posts boolean not null default true,
  add column show_trust_tree boolean not null default true;

create table public.profile_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  notify_replies boolean not null default true,
  notify_ticket_redeemed boolean not null default true,
  notify_news boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.profile_settings enable row level security;
revoke all on public.profile_settings from anon, authenticated;
grant select on public.profile_settings to authenticated;
create policy profile_settings_own on public.profile_settings for select to authenticated using (user_id = (select auth.uid()));

create function public.update_profile(
  p_display_name text, p_bio text, p_location text, p_pronouns text, p_links jsonb,
  p_visibility text, p_show_posts boolean, p_show_trust_tree boolean
) returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare
  result public.profiles;
  item jsonb;
  clean jsonb := '[]'::jsonb;
  link_label text;
  link_url text;
begin
  if not private.has_profile() then raise exception 'PROFILE_REQUIRED' using errcode='42501'; end if;
  if length(btrim(coalesce(p_display_name,''))) not between 1 and 60 then raise exception 'INVALID_DISPLAY_NAME'; end if;
  if length(coalesce(p_bio,'')) > 300 then raise exception 'INVALID_BIO'; end if;
  if length(btrim(coalesce(p_location,''))) > 60 then raise exception 'INVALID_LOCATION'; end if;
  if length(btrim(coalesce(p_pronouns,''))) > 30 then raise exception 'INVALID_PRONOUNS'; end if;
  if p_visibility is null or p_visibility not in ('members','public','hidden') then raise exception 'INVALID_VISIBILITY'; end if;
  if p_show_posts is null or p_show_trust_tree is null then raise exception 'INVALID_VISIBILITY'; end if;
  if p_links is null or jsonb_typeof(p_links) <> 'array' or jsonb_array_length(p_links) > 5 then raise exception 'INVALID_LINKS'; end if;
  for item in select * from jsonb_array_elements(p_links) loop
    if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'label') is distinct from 'string' or jsonb_typeof(item->'url') is distinct from 'string' then
      raise exception 'INVALID_LINKS';
    end if;
    link_label := btrim(item->>'label');
    link_url := btrim(item->>'url');
    if length(link_label) not between 1 and 40 or length(link_url) > 200 or link_url !~* '^https?://[^\s/$.?#][^\s]*$' then
      raise exception 'INVALID_LINKS';
    end if;
    clean := clean || jsonb_build_array(jsonb_build_object('label', link_label, 'url', link_url));
  end loop;
  update public.profiles set
    display_name = btrim(p_display_name),
    bio = coalesce(p_bio,''),
    location = btrim(coalesce(p_location,'')),
    pronouns = btrim(coalesce(p_pronouns,'')),
    links = clean,
    visibility = p_visibility,
    show_posts = p_show_posts,
    show_trust_tree = p_show_trust_tree
  where id = auth.uid() returning * into result;
  return result;
end;
$$;

-- Avatare sind unveränderliche Storage-Objekte: ein neues Bild ist ein neuer Pfad, NULL entfernt das Bild.
create function public.set_avatar(p_path text) returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare result public.profiles;
begin
  if not private.has_profile() then raise exception 'PROFILE_REQUIRED' using errcode='42501'; end if;
  if p_path is not null and not private.owns_media('avatars', p_path) then raise exception 'INVALID_MEDIA'; end if;
  update public.profiles set avatar_url = p_path where id = auth.uid() returning * into result;
  return result;
end;
$$;

create function public.update_notification_settings(p_replies boolean, p_ticket_redeemed boolean, p_news boolean)
returns public.profile_settings
language plpgsql security definer set search_path = ''
as $$
declare result public.profile_settings;
begin
  if not private.has_profile() then raise exception 'PROFILE_REQUIRED' using errcode='42501'; end if;
  if p_replies is null or p_ticket_redeemed is null or p_news is null then raise exception 'INVALID_SETTINGS'; end if;
  insert into public.profile_settings(user_id, notify_replies, notify_ticket_redeemed, notify_news)
  values (auth.uid(), p_replies, p_ticket_redeemed, p_news)
  on conflict (user_id) do update set
    notify_replies = excluded.notify_replies,
    notify_ticket_redeemed = excluded.notify_ticket_redeemed,
    notify_news = excluded.notify_news,
    updated_at = now()
  returning * into result;
  return result;
end;
$$;

-- Öffentlich (anon): ausschließlich Profile mit visibility = 'public' und nur diese Felder.
-- Keine Beiträge, kein Vertrauensbaum, keine Einladungsbeziehungen, keine Stimme.
create function public.get_public_profile(p_username text) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'username', p.username, 'display_name', p.display_name, 'bio', p.bio,
    'avatar_path', p.avatar_url, 'location', p.location, 'pronouns', p.pronouns,
    'links', p.links, 'member_since', p.created_at)
  from public.profiles p
  where p.username = lower(btrim(coalesce(p_username,''))) and p.visibility = 'public';
$$;

-- Konto löschen (DSGVO). Gastgeber eines Raums müssen ihn zuerst übergeben.
-- Beiträge, Antworten darauf, Tickets und Stimmen verschwinden per ON DELETE CASCADE.
-- Hochgeladene Dateien bleiben bis zur Wartung im Storage liegen (keine Client-Löschrechte).
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if exists(select 1 from public.spaces where owner_id = auth.uid()) then raise exception 'OWNER_CANNOT_DELETE'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- Öffentliche Avatare: anon darf nur Bilder öffentlicher Profile signieren/lesen.
create function private.is_public_avatar(p_name text) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.profiles where avatar_url = p_name and visibility = 'public'); $$;
revoke all on function private.is_public_avatar(text) from public, anon, authenticated;
grant usage on schema private to anon;
grant execute on function private.is_public_avatar(text) to anon, authenticated;
create policy clubhouse_public_avatar_read on storage.objects for select to anon using (
  bucket_id = 'avatars' and private.is_public_avatar(name)
);

revoke all on function
  public.update_profile(text,text,text,text,jsonb,text,boolean,boolean),
  public.set_avatar(text),
  public.update_notification_settings(boolean,boolean,boolean),
  public.get_public_profile(text),
  public.delete_my_account()
from public, anon, authenticated;
grant execute on function
  public.update_profile(text,text,text,text,jsonb,text,boolean,boolean),
  public.set_avatar(text),
  public.update_notification_settings(boolean,boolean,boolean),
  public.delete_my_account()
to authenticated;
grant execute on function public.get_public_profile(text) to anon, authenticated;
commit;
