-- New project only. Create the intended owner's Auth account first.
-- psql "$NEW_PROJECT_DATABASE_URL" -v owner_id='<auth UUID>' -v username='dennis' -v display_name='Dennis' -f supabase/bootstrap-owner.sql
\set ON_ERROR_STOP on
begin;
select set_config('ho.bootstrap_owner', :'owner_id', true), set_config('ho.bootstrap_username', :'username', true), set_config('ho.bootstrap_name', :'display_name', true);
do $$
declare room public.spaces; desired uuid:=current_setting('ho.bootstrap_owner')::uuid;
begin
 select * into room from public.spaces where slug='vibecoding-germany' for update;
 if room.id is null then raise exception 'Run seed.sql first'; end if;
 if room.owner_id is not null then
   if room.owner_id=desired and exists(select 1 from public.space_members where space_id=room.id and user_id=desired and role='owner') then
     if to_regclass('private.admins') is not null then execute 'insert into private.admins(user_id) values($1) on conflict do nothing' using desired; end if;
     return;
   end if;
   raise exception 'Space already has a different owner; no profile was created';
 end if;
 insert into public.profiles(id,username,display_name,bio)
 values(desired,lower(current_setting('ho.bootstrap_username')),current_setting('ho.bootstrap_name'),'Gastgeber von Vibecoding Germany.');
 update public.spaces set owner_id=desired where id=room.id;
 insert into public.space_members(space_id,user_id,role) values(room.id,desired,'owner');
 if to_regclass('private.admins') is not null then execute 'insert into private.admins(user_id) values($1) on conflict do nothing' using desired; end if;
end;
$$;
commit;
