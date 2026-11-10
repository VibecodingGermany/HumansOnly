-- Humans Only 2.0 — Social-Basics.
-- Additiv: Likes ("Gefällt mir") mit Zähler, Löschen eigener Beiträge/Kommentare (plus Moderation),
-- neue Sprachvorstellung aus den Einstellungen. Kommentare bleiben Beiträge mit parent_id.
-- Likes sind bewusst getrennt von der Community-Prüfung (content_votes): ein Like ist Zuneigung,
-- keine Qualitätsstimme, und beeinflusst slop_status nicht.
begin;

alter table public.posts
  add column likes_count integer not null default 0 check (likes_count >= 0);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_by_user on public.post_likes(user_id);
alter table public.post_likes enable row level security;
revoke all on public.post_likes from anon, authenticated;
grant select on public.post_likes to authenticated;
-- Wer den Beitrag lesen darf, darf auch sehen, wem er gefällt (wie in jedem sozialen Netzwerk).
create policy post_likes_read on public.post_likes for select to authenticated
  using (private.can_read_post(post_id));

create function private.recount_likes() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare pid uuid;
begin
  if TG_OP = 'DELETE' then pid := old.post_id; else pid := new.post_id; end if;
  update public.posts
    set likes_count = (select count(*) from public.post_likes where post_id = pid)
    where id = pid;
  return null;
end;
$$;
revoke all on function private.recount_likes() from public, anon, authenticated;
create trigger post_likes_recount after insert or delete on public.post_likes
  for each row execute function private.recount_likes();

-- Umschalten statt zwei RPCs: ein Tipp auf das Herz liked oder nimmt das Like zurück.
-- Die Zeile des Beitrags wird gesperrt, damit parallele Klicks sauber serialisiert werden.
create function public.toggle_post_like(p_post_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare target public.posts; now_liked boolean;
begin
  if not private.has_profile() then raise exception 'PROFILE_REQUIRED' using errcode='42501'; end if;
  select * into target from public.posts where id = p_post_id for update;
  if target.id is null or not private.can_read_post(p_post_id) then raise exception 'POST_FORBIDDEN' using errcode='42501'; end if;
  if target.author_id = auth.uid() then raise exception 'SELF_LIKE_FORBIDDEN' using errcode='42501'; end if;
  delete from public.post_likes where post_id = p_post_id and user_id = auth.uid();
  if found then
    now_liked := false;
  else
    insert into public.post_likes(post_id, user_id) values (p_post_id, auth.uid());
    now_liked := true;
  end if;
  return jsonb_build_object('liked', now_liked,
    'likes_count', (select likes_count from public.posts where id = p_post_id));
end;
$$;

-- Löschen: die Autorin/der Autor selbst, Gastgeber oder Moderation des Raums, oder ein Admin.
-- Antworten, Likes und Stimmen verschwinden per ON DELETE CASCADE.
-- Hochgeladene Medien bleiben bis zur Wartung im Storage (keine Client-Löschrechte).
create function public.delete_post(p_post_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare target public.posts;
begin
  if not private.has_profile() then raise exception 'PROFILE_REQUIRED' using errcode='42501'; end if;
  select * into target from public.posts where id = p_post_id for update;
  if target.id is null or not private.can_read_post(p_post_id) then raise exception 'POST_FORBIDDEN' using errcode='42501'; end if;
  if target.author_id is distinct from auth.uid()
     and not exists(select 1 from private.admins where user_id = auth.uid())
     and not (target.space_id is not null and exists(
       select 1 from public.space_members
       where space_id = target.space_id and user_id = auth.uid() and role in ('owner','moderator')))
  then
    raise exception 'DELETE_FORBIDDEN' using errcode='42501';
  end if;
  delete from public.posts where id = p_post_id;
end;
$$;

-- Neue Sprachvorstellung aufnehmen (1–15 Sekunden). Wie bei Avataren ist jede Aufnahme ein neuer Pfad.
create function public.set_voice_intro(p_path text, p_duration_sec numeric) returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare result public.profiles;
begin
  if not private.has_profile() then raise exception 'PROFILE_REQUIRED' using errcode='42501'; end if;
  if p_duration_sec is null or p_duration_sec < 1 or p_duration_sec > 15
     or not private.owns_media('voice-intros', p_path) then
    raise exception 'VOICE_REQUIRED';
  end if;
  update public.profiles set voice_intro_url = p_path, voice_duration_sec = p_duration_sec
    where id = auth.uid() returning * into result;
  return result;
end;
$$;

revoke all on function
  public.toggle_post_like(uuid),
  public.delete_post(uuid),
  public.set_voice_intro(text, numeric)
from public, anon, authenticated;
grant execute on function
  public.toggle_post_like(uuid),
  public.delete_post(uuid),
  public.set_voice_intro(text, numeric)
to authenticated;

do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.post_likes;
  end if;
end $$;
commit;
