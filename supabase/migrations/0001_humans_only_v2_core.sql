-- Humans Only 2.0. Apply to a fresh Supabase project; never to the v1 database.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (length(btrim(display_name)) between 1 and 60),
  bio text not null default '' check (length(bio) <= 300),
  avatar_url text,
  voice_intro_url text,
  voice_duration_sec numeric check (voice_duration_sec between 1 and 15),
  invited_by_id uuid references public.profiles(id) on delete set null,
  invites_left integer not null default 3 check (invites_left between 0 and 3),
  can_invite boolean not null default true,
  created_at timestamptz not null default now(),
  check (invited_by_id is distinct from id),
  check ((voice_intro_url is null) = (voice_duration_sec is null))
);
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,64}$'),
  name text not null check (length(name) between 1 and 80),
  description text not null default '',
  owner_id uuid references public.profiles(id) on delete restrict,
  pinned_info jsonb not null default '[]' check (jsonb_typeof(pinned_info) = 'array'),
  access_type text not null default 'invite' check (access_type in ('invite','paid')),
  price_cents integer not null default 0 check (price_cents >= 0),
  created_at timestamptz not null default now()
);
create table public.invite_tickets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  target_space_id uuid not null references public.spaces(id) on delete cascade,
  redeemed_by_id uuid unique references public.profiles(id) on delete set null,
  redeemed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  check (redeemed_by_id is null or redeemed_at is not null)
);
create table public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','moderator','member')),
  joined_at timestamptz not null default now(),
  primary key (space_id,user_id)
);
create unique index one_owner_per_space on public.space_members(space_id) where role = 'owner';
create index memberships_by_user on public.space_members(user_id,space_id);
create index profiles_by_inviter on public.profiles(invited_by_id);
create index tickets_by_creator on public.invite_tickets(creator_id);
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete cascade,
  text text not null default '' check (length(text) <= 2000),
  image_url text,
  audio_url text,
  audio_duration_sec numeric check (audio_duration_sec between 1 and 60),
  parent_id uuid references public.posts(id) on delete cascade,
  slop_status text not null default 'clean' check (slop_status in ('clean','under_review','hidden','valuable_verified')),
  valuable_votes_count integer not null default 0 check (valuable_votes_count >= 0),
  slop_votes_count integer not null default 0 check (slop_votes_count >= 0),
  created_at timestamptz not null default now(),
  check (length(btrim(text)) > 0 or image_url is not null or audio_url is not null),
  check ((audio_url is null) = (audio_duration_sec is null))
);
create index posts_feed on public.posts(space_id,created_at desc,id desc);
create index posts_by_author on public.posts(author_id);
create index posts_by_parent on public.posts(parent_id);
create table public.content_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  vote text not null check (vote in ('valuable','slop')),
  created_at timestamptz not null default now(),
  unique (post_id,voter_id)
);
create index votes_by_voter on public.content_votes(voter_id);

create function private.has_profile() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.profiles where id = (select auth.uid())); $$;
create function private.in_space(p_space_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.space_members where space_id = p_space_id and user_id = (select auth.uid())); $$;
create function private.can_read_post(p_post_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.posts p where p.id = p_post_id and private.has_profile() and (p.space_id is null or private.in_space(p.space_id))); $$;
revoke all on function private.has_profile(), private.in_space(uuid), private.can_read_post(uuid) from public, anon;
grant execute on function private.has_profile(), private.in_space(uuid), private.can_read_post(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.invite_tickets enable row level security;
alter table public.space_members enable row level security;
alter table public.posts enable row level security;
alter table public.content_votes enable row level security;
revoke all on public.profiles,public.spaces,public.invite_tickets,public.space_members,public.posts,public.content_votes from anon,authenticated;
grant select on public.profiles,public.spaces,public.invite_tickets,public.space_members,public.posts,public.content_votes to authenticated;
create policy profiles_read on public.profiles for select to authenticated using ((select private.has_profile()));
create policy spaces_read on public.spaces for select to authenticated using ((select private.has_profile()));
create policy tickets_read on public.invite_tickets for select to authenticated using (creator_id = (select auth.uid()) or redeemed_by_id = (select auth.uid()));
create policy members_read on public.space_members for select to authenticated using (private.in_space(space_id));
-- hidden is presentation suppression, not a separate confidentiality boundary.
-- Room access remains enforced; authorized members can review and rehabilitate hidden posts.
create policy posts_read on public.posts for select to authenticated using ((select private.has_profile()) and (space_id is null or private.in_space(space_id)));
create policy votes_read on public.content_votes for select to authenticated using (voter_id = (select auth.uid()) and private.can_read_post(post_id));

create function public.inspect_invite(p_code text) returns jsonb
language sql stable security definer set search_path = ''
as $$
 select coalesce((select jsonb_build_object('valid',true,'space_slug',s.slug,'space_name',s.name,'inviter_username',p.username)
 from public.invite_tickets t join public.profiles p on p.id=t.creator_id join public.spaces s on s.id=t.target_space_id
 where t.code=upper(btrim(p_code)) and t.redeemed_at is null and t.expires_at>now() and p.can_invite and s.owner_id is not null and s.access_type='invite'),
 jsonb_build_object('valid',false,'space_slug',null,'space_name',null,'inviter_username',null));
$$;
create function public.create_invite(p_space_id uuid) returns public.invite_tickets
language plpgsql security definer set search_path = ''
as $$
declare actor public.profiles; result public.invite_tickets;
begin
 select * into actor from public.profiles where id=auth.uid() for update;
 if actor.id is null then raise exception 'PROFILE_REQUIRED' using errcode='42501'; end if;
 if not actor.can_invite then raise exception 'INVITES_REVOKED' using errcode='42501'; end if;
 if actor.invites_left<=0 then raise exception 'NO_INVITES_LEFT' using errcode='P0001'; end if;
 if not private.in_space(p_space_id) or not exists(select 1 from public.spaces where id=p_space_id and owner_id is not null and access_type='invite') then
   raise exception 'SPACE_FORBIDDEN' using errcode='42501';
 end if;
 insert into public.invite_tickets(code,creator_id,target_space_id)
 values(upper(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),actor.id,p_space_id) returning * into result;
 update public.profiles set invites_left=invites_left-1 where id=actor.id;
 return result;
end;
$$;
create function private.owns_media(p_bucket text,p_path text) returns boolean
language sql stable security definer set search_path = ''
as $$ select p_path is not null and split_part(p_path,'/',1) = auth.uid()::text and exists(select 1 from storage.objects where bucket_id=p_bucket and name=p_path); $$;
revoke all on function private.owns_media(text,text) from public,anon,authenticated;

create function public.redeem_invite(p_code text,p_username text,p_display_name text,p_bio text,p_voice_path text,p_voice_duration_sec numeric)
returns public.profiles language plpgsql security definer set search_path = ''
as $$
declare ticket public.invite_tickets; creator public.profiles; result public.profiles;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if exists(select 1 from public.profiles where id=auth.uid()) then raise exception 'ALREADY_ONBOARDED'; end if;
 select * into ticket from public.invite_tickets where code=upper(btrim(p_code)) for update;
 if ticket.id is null or ticket.redeemed_at is not null or ticket.expires_at<=now() then raise exception 'INVALID_TICKET'; end if;
 select * into creator from public.profiles where id=ticket.creator_id for update;
 if not creator.can_invite then raise exception 'INVITES_REVOKED' using errcode='42501'; end if;
 if not exists(select 1 from public.spaces where id=ticket.target_space_id and owner_id is not null and access_type='invite') then raise exception 'SPACE_FORBIDDEN' using errcode='42501'; end if;
 if p_voice_duration_sec is null or p_voice_duration_sec<1 or p_voice_duration_sec>15 or not private.owns_media('voice-intros',p_voice_path) then raise exception 'VOICE_REQUIRED'; end if;
 insert into public.profiles(id,username,display_name,bio,voice_intro_url,voice_duration_sec,invited_by_id)
 values(auth.uid(),lower(btrim(p_username)),btrim(p_display_name),coalesce(p_bio,''),p_voice_path,p_voice_duration_sec,creator.id) returning * into result;
 insert into public.space_members(space_id,user_id,role) values(ticket.target_space_id,result.id,'member');
 update public.invite_tickets set redeemed_by_id=result.id,redeemed_at=now() where id=ticket.id;
 return result;
end;
$$;
create function public.create_post(p_space_id uuid,p_text text,p_image_path text default null,p_audio_path text default null,p_audio_duration_sec numeric default null,p_parent_id uuid default null)
returns public.posts language plpgsql security definer set search_path = ''
as $$
declare result public.posts;
begin
 if not private.has_profile() then raise exception 'PROFILE_REQUIRED' using errcode='42501'; end if;
 if p_space_id is not null and not private.in_space(p_space_id) then raise exception 'SPACE_FORBIDDEN' using errcode='42501'; end if;
 if p_parent_id is not null and not exists(select 1 from public.posts where id=p_parent_id and space_id is not distinct from p_space_id) then raise exception 'INVALID_PARENT'; end if;
 if p_image_path is not null and not private.owns_media('post-media',p_image_path) then raise exception 'INVALID_MEDIA'; end if;
 if p_audio_path is not null and not private.owns_media('post-media',p_audio_path) then raise exception 'INVALID_MEDIA'; end if;
 insert into public.posts(author_id,space_id,text,image_url,audio_url,audio_duration_sec,parent_id)
 values(auth.uid(),p_space_id,coalesce(btrim(p_text),''),p_image_path,p_audio_path,p_audio_duration_sec,p_parent_id) returning * into result;
 return result;
end;
$$;
-- Lock before mutating votes so concurrent inserts/switches serialize per post.
create function public.cast_content_vote(p_post_id uuid,p_vote text) returns public.posts
language plpgsql security definer set search_path = ''
as $$
declare target public.posts;
begin
 select * into target from public.posts where id=p_post_id for update;
 if target.id is null or not private.can_read_post(p_post_id) then raise exception 'POST_FORBIDDEN' using errcode='42501'; end if;
 if target.author_id=auth.uid() then raise exception 'SELF_VOTE_FORBIDDEN' using errcode='42501'; end if;
 if p_vote is null or p_vote not in ('valuable','slop') then raise exception 'INVALID_VOTE'; end if;
 insert into public.content_votes(post_id,voter_id,vote) values(p_post_id,auth.uid(),p_vote)
 on conflict(post_id,voter_id) do update set vote=excluded.vote;
 select * into target from public.posts where id=p_post_id;
 return target;
end;
$$;
create function private.recount_votes() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare pid uuid; v integer; s integer;
begin
 if TG_OP='DELETE' then pid:=old.post_id; else pid:=new.post_id; end if;
 perform 1 from public.posts where id=pid for update;
 select count(*) filter(where vote='valuable'),count(*) filter(where vote='slop') into v,s from public.content_votes where post_id=pid;
 update public.posts set valuable_votes_count=v,slop_votes_count=s,
 slop_status=case when s-v>=3 then 'hidden' when v>s then 'valuable_verified' when s>0 then 'under_review' else 'clean' end where id=pid;
 return null;
end;
$$;
revoke all on function private.recount_votes() from public,anon,authenticated;
create trigger content_votes_recount after insert or update or delete on public.content_votes for each row execute function private.recount_votes();
revoke all on function public.inspect_invite(text),public.create_invite(uuid),public.redeem_invite(text,text,text,text,text,numeric),public.create_post(uuid,text,text,text,numeric,uuid),public.cast_content_vote(uuid,text) from public,anon,authenticated;
grant execute on function public.inspect_invite(text) to anon,authenticated;
grant execute on function public.create_invite(uuid),public.redeem_invite(text,text,text,text,text,numeric),public.create_post(uuid,text,text,text,numeric,uuid),public.cast_content_vote(uuid,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('avatars','avatars',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('voice-intros','voice-intros',false,5242880,array['audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/x-m4a']),
 ('post-media','post-media',false,10485760,array['image/jpeg','image/png','image/webp','audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/x-m4a']);
create policy clubhouse_upload on storage.objects for insert to authenticated with check (
 bucket_id in ('avatars','voice-intros','post-media') and (storage.foldername(name))[1]=(select auth.uid())::text
 and (bucket_id in ('voice-intros','avatars') or (select private.has_profile()))
);
create policy clubhouse_media_read on storage.objects for select to authenticated using (
 bucket_id in ('avatars','voice-intros','post-media') and (
  (storage.foldername(name))[1]=(select auth.uid())::text
  or ((select private.has_profile()) and (
   (bucket_id='avatars' and exists(select 1 from public.profiles p where p.avatar_url=name))
   or (bucket_id='voice-intros' and exists(select 1 from public.profiles p where p.voice_intro_url=name))
   or (bucket_id='post-media' and exists(select 1 from public.posts p where (p.image_url=name or p.audio_url=name) and (p.space_id is null or private.in_space(p.space_id))))
  ))
 )
);
-- Immutable objects: no client UPDATE/DELETE policies. Cleanup unreferenced uploads via trusted maintenance.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.posts;
 end if;
end $$;
commit;
