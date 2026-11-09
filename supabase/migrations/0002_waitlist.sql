-- Humans Only 2.0 — Warteliste und Admin-Freigabe.
-- Additiv: die sechs Kern-Tabellen und ihre RPCs bleiben unverändert.
-- Admins liegen in private.admins (kein Client-Zugriff). Die Warteliste ist nur für Admins lesbar.
begin;

create table private.admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on private.admins from public, anon, authenticated;
-- Der bestehende Gastgeber von Vibecoding Germany wird erster Admin (idempotent).
insert into private.admins(user_id)
select owner_id from public.spaces where slug='vibecoding-germany' and owner_id is not null
on conflict do nothing;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from private.admins where user_id = (select auth.uid())); $$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  email text not null check (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  ticket_id uuid unique references public.invite_tickets(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  invited_at timestamptz,
  invite_count integer not null default 0 check (invite_count >= 0),
  check ((status = 'pending') = (decided_at is null))
);
create unique index waitlist_unique_email on public.waitlist_entries(lower(email));
create index waitlist_by_status on public.waitlist_entries(status, created_at);
alter table public.waitlist_entries enable row level security;
revoke all on public.waitlist_entries from anon, authenticated;
grant select on public.waitlist_entries to authenticated;
create policy waitlist_admin_read on public.waitlist_entries for select to authenticated using ((select private.is_admin()));

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select private.is_admin(); $$;

-- Öffentlich: gleiche Antwort für neue und bekannte Adressen (keine Enumeration).
create function public.join_waitlist(p_name text, p_email text) returns void
language plpgsql security definer set search_path = ''
as $$
declare clean_name text := btrim(coalesce(p_name,'')); clean_email text := lower(btrim(coalesce(p_email,'')));
begin
 if length(clean_name) not between 1 and 80 then raise exception 'INVALID_NAME'; end if;
 if length(clean_email) > 254 or clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
 -- Grobe globale Bremse gegen Massen-Eintragungen.
 if (select count(*) from public.waitlist_entries where created_at > now() - interval '10 minutes') >= 60 then
   raise exception 'WAITLIST_BUSY';
 end if;
 insert into public.waitlist_entries(name,email) values(clean_name,clean_email)
 on conflict ((lower(email))) do nothing;
end;
$$;

-- Admin: stellt ein Goldenes Ticket für Vibecoding Germany aus, ohne das eigene Drei-Ticket-Budget zu verbrauchen.
-- Wiederholte Freigabe liefert das vorhandene Ticket zurück.
create function public.approve_waitlist_entry(p_entry_id uuid) returns public.invite_tickets
language plpgsql security definer set search_path = ''
as $$
declare entry public.waitlist_entries; room public.spaces; result public.invite_tickets;
begin
 if not private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 select * into entry from public.waitlist_entries where id=p_entry_id for update;
 if entry.id is null then raise exception 'WAITLIST_NOT_FOUND'; end if;
 if entry.ticket_id is not null then
   select * into result from public.invite_tickets where id=entry.ticket_id;
   if result.id is not null and (result.redeemed_at is not null or result.expires_at > now()) then
     update public.waitlist_entries set status='approved', decided_at=coalesce(decided_at,now()), decided_by=coalesce(decided_by,auth.uid()) where id=entry.id;
     return result;
   end if;
 end if;
 select * into room from public.spaces where slug='vibecoding-germany' and owner_id is not null and access_type='invite';
 if room.id is null or not private.in_space(room.id) then raise exception 'SPACE_FORBIDDEN' using errcode='42501'; end if;
 insert into public.invite_tickets(code,creator_id,target_space_id)
 values(upper(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),auth.uid(),room.id) returning * into result;
 update public.waitlist_entries set status='approved', ticket_id=result.id, decided_at=now(), decided_by=auth.uid() where id=entry.id;
 return result;
end;
$$;

create function public.reject_waitlist_entry(p_entry_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare entry public.waitlist_entries;
begin
 if not private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 select * into entry from public.waitlist_entries where id=p_entry_id for update;
 if entry.id is null then raise exception 'WAITLIST_NOT_FOUND'; end if;
 if entry.status='approved' then raise exception 'WAITLIST_ALREADY_APPROVED'; end if;
 update public.waitlist_entries set status='rejected', decided_at=now(), decided_by=auth.uid() where id=entry.id;
end;
$$;

-- Löschen auf Wunsch der Person (DSGVO). Ein bereits ausgestelltes Ticket bleibt gültig.
create function public.delete_waitlist_entry(p_entry_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
 if not private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 delete from public.waitlist_entries where id=p_entry_id;
 if not found then raise exception 'WAITLIST_NOT_FOUND'; end if;
end;
$$;

-- Admin: protokolliert den erfolgreichen Mailversand (die Mail selbst verschickt der Web-Server per SMTP).
create function public.mark_waitlist_invited(p_entry_id uuid) returns public.waitlist_entries
language plpgsql security definer set search_path = ''
as $$
declare result public.waitlist_entries;
begin
 if not private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 update public.waitlist_entries set invited_at=now(), invite_count=invite_count+1
 where id=p_entry_id and status='approved' and ticket_id is not null returning * into result;
 if result.id is null then raise exception 'WAITLIST_NOT_APPROVED'; end if;
 return result;
end;
$$;

revoke all on function public.is_admin(), public.join_waitlist(text,text), public.approve_waitlist_entry(uuid), public.reject_waitlist_entry(uuid), public.delete_waitlist_entry(uuid), public.mark_waitlist_invited(uuid) from public, anon, authenticated;
grant execute on function public.join_waitlist(text,text) to anon, authenticated;
grant execute on function public.is_admin(), public.approve_waitlist_entry(uuid), public.reject_waitlist_entry(uuid), public.delete_waitlist_entry(uuid), public.mark_waitlist_invited(uuid) to authenticated;
commit;
