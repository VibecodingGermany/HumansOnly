#!/usr/bin/env python3
"""Run isolated PostgreSQL contract tests. Requires initdb, pg_ctl and psql in PATH.
Supabase Auth and Storage schemas are stubbed; this does not test their HTTP services.
All data is temporary under output/sql-validation. No existing database is touched.
"""
import concurrent.futures, json, os, pathlib, subprocess, sys, socket, uuid, getpass
root=pathlib.Path(__file__).resolve().parents[2]
out=root/'output/sql-validation'
out.mkdir(parents=True,exist_ok=True)
cluster=out/('pgdata-'+uuid.uuid4().hex[:10])
with socket.socket() as probe:
 probe.bind(('127.0.0.1',0)); port=str(probe.getsockname()[1])
env=os.environ.copy(); env.update(PGHOST='127.0.0.1', PGPORT=port, PGUSER=getpass.getuser(), PGDATABASE='postgres')
reports=[]
def cmd(args, **kw): return subprocess.run(args,text=True,capture_output=True,**kw)
def sql(query, ok=True):
 r=cmd(['psql','-X','-v','ON_ERROR_STOP=1','-At','-c',query],env=env)
 if ok and r.returncode: raise AssertionError(r.stderr+'\nSQL: '+query)
 return r
def load(path,variables=[]):
 r=cmd(['psql','-X','-v','ON_ERROR_STOP=1',*variables,'-f',str(path)],env=env)
 if r.returncode: raise AssertionError(r.stderr)
 return r
def asuser(uid, query, ok=True, role='authenticated'):
 return sql("set role "+role+"; select set_config('request.jwt.claim.sub','"+uid+"',false); "+query+";",ok)
def scalar(uid,query):
 r=asuser(uid,query)
 return [s for s in r.stdout.strip().splitlines() if s not in ('BEGIN','COMMIT','SET',uid)][-1]
def check(name, cond, detail=''):
 reports.append({'test':name,'pass':bool(cond),'detail':detail})
 print(('PASS ' if cond else 'FAIL ')+name+(' — '+detail if detail else ''),flush=True)
def deny(name,uid,query,expected):
 r=asuser(uid,query,False)
 check(name,r.returncode!=0 and expected in r.stderr,r.stderr.strip().splitlines()[0] if r.stderr else r.stdout)
u=lambda n: f'20000000-0000-4000-8000-{n:012d}'
space='10000000-0000-4000-8000-000000000001'
started=False
try:
 if cluster.exists(): raise RuntimeError('Refusing to reuse existing cluster')
 r=cmd(['initdb','-D',str(cluster),'-A','trust','--no-locale','-E','UTF8'])
 if r.returncode: raise RuntimeError(r.stderr)
 r=cmd(['pg_ctl','-D',str(cluster),'-l',str(out/'postgres.log'),'-o',f"-h 127.0.0.1 -p {port} -k ''",'-w','start'])
 if r.returncode: raise RuntimeError(r.stderr+r.stdout)
 started=True
 sql('''create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
 create schema auth; create schema storage;
 create table auth.users (id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,storage,public to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,unique(bucket_id,name));
 alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to authenticated;
 create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:cardinality(string_to_array(name,'/'))-1] $$;
 grant execute on function storage.foldername(text) to authenticated;
 create publication supabase_realtime;''')
 load(root/'supabase/migrations/0001_humans_only_v2_core.sql')
 load(root/'supabase/seed.sql'); load(root/'supabase/seed.sql')
 check('migration and idempotent seed execute',sql('select count(*) from public.spaces').stdout.strip()=='1')
 sql('insert into auth.users(id) values '+','.join("('"+u(i)+"')" for i in range(1,41)))
 load(root/'supabase/bootstrap-owner.sql',['-v','owner_id='+u(1),'-v','username=owner','-v','display_name=Owner'])
 load(root/'supabase/migrations/0002_waitlist.sql')
 check('waitlist migration makes existing owner admin',sql("select count(*) from private.admins where user_id='"+u(1)+"'").stdout.strip()=='1')
 check('owner bootstrap binds owner and membership',sql("select count(*) from public.spaces s join public.space_members m on m.space_id=s.id where s.owner_id='"+u(1)+"' and m.user_id=s.owner_id and m.role='owner'").stdout.strip()=='1')
 load(root/'supabase/bootstrap-owner.sql',['-v','owner_id='+u(1),'-v','username=owner','-v','display_name=Owner'])
 check('same-owner bootstrap is idempotent',sql("select count(*) from public.space_members where user_id='"+u(1)+"'").stdout.strip()=='1')
 r=asuser('', 'select * from public.profiles',False,role='anon'); check('anonymous cannot read profiles',r.returncode!=0 and 'permission denied' in r.stderr)
 for table in ['profiles','spaces','space_members','posts','invite_tickets','content_votes']:
  check('uninvited sees no '+table,scalar(u(2),'select count(*) from public.'+table)=='0')
 for table,statement in [('profile',"update public.profiles set invites_left=3 where id='"+u(1)+"'"),('membership',"insert into public.space_members(space_id,user_id,role) values ('"+space+"','"+u(2)+"','owner')")]:
  deny('direct '+table+' mutation denied',u(1),statement,'permission denied')
 deny('uninvited cannot create post',u(2),"select public.create_post(null,'Bypass')",'PROFILE_REQUIRED')
 deny('uninvited cannot issue invite',u(2),"select public.create_invite('"+space+"')",'PROFILE_REQUIRED')
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  issued=list(pool.map(lambda _: asuser(u(1),"select (public.create_invite('"+space+"')).code",False),range(4)))
 check('4 concurrent issues allow only 3',sum(r.returncode==0 for r in issued)==3, 'successes='+str(sum(r.returncode==0 for r in issued)))
 check('issue quota never negative',sql("select invites_left from public.profiles where id='"+u(1)+"'").stdout.strip()=='0')
 tickets=sql("select code from public.invite_tickets where creator_id='"+u(1)+"' order by code").stdout.strip().splitlines()
 r=asuser('',"select public.inspect_invite('"+tickets[0]+"')",role='anon')
 check('anonymous narrow preview works','"valid": true' in r.stdout)
 for n in [2,3,4,5]:
  asuser(u(n),"insert into storage.objects(bucket_id,name) values ('voice-intros','"+u(n)+"/intro.webm')")
 deny('cross-user upload denied',u(2),"insert into storage.objects(bucket_id,name) values ('voice-intros','"+u(3)+"/spoof.webm')",'row-level security')
 deny('uninvited post-media upload denied',u(2),"insert into storage.objects(bucket_id,name) values ('post-media','"+u(2)+"/pic.png')",'row-level security')
 check('uninvited sees only own staged voice',scalar(u(2),"select count(*) from storage.objects")=='1')
 deny('foreign voice cannot onboard',u(2),"select public.redeem_invite('"+tickets[0]+"','member2','Member Two','','"+u(3)+"/intro.webm',15)",'VOICE_REQUIRED')
 deny('overlong voice cannot onboard',u(2),"select public.redeem_invite('"+tickets[0]+"','member2','Member Two','','"+u(2)+"/intro.webm',16)",'VOICE_REQUIRED')
 def redeem(n): return asuser(u(n),"select (public.redeem_invite('"+tickets[0]+"','member"+str(n)+"','Member','','"+u(n)+"/intro.webm',15)).id",False)
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool: redeemed=list(pool.map(redeem,[2,3]))
 check('same-ticket concurrent redemption exactly once',sum(r.returncode==0 for r in redeemed)==1)
 winner=2 if redeemed[0].returncode==0 else 3
 loser=3 if winner==2 else 2
 check('losing redemption leaves no profile',sql("select count(*) from public.profiles where id='"+u(loser)+"'").stdout.strip()=='0')
 check('redemption creates target membership',sql("select count(*) from public.space_members where user_id='"+u(winner)+"' and space_id='"+space+"'").stdout.strip()=='1')
 check('redeemed invite no longer validates',not json.loads(scalar('',"select public.inspect_invite('"+tickets[0]+"')"))['valid'])
 deny('repeat onboarding rejected',u(winner),"select public.redeem_invite('"+tickets[1]+"','memberagain','Member','','"+u(winner)+"/intro.webm',15)",'ALREADY_ONBOARDED')
 sql("update public.invite_tickets set expires_at=now()-interval '1 day' where code='"+tickets[1]+"'")
 deny('expired ticket rejected',u(4),"select public.redeem_invite('"+tickets[1]+"','member4','Member','','"+u(4)+"/intro.webm',15)",'INVALID_TICKET')
 sql("update public.profiles set can_invite=false where id='"+u(1)+"'")
 deny('revoked creator blocks outstanding ticket',u(4),"select public.redeem_invite('"+tickets[2]+"','member4','Member','','"+u(4)+"/intro.webm',15)",'INVITES_REVOKED')
 sql("update public.profiles set can_invite=true where id='"+u(1)+"'")
 sql("insert into public.profiles(id,username,display_name) values "+','.join("('"+u(n)+"','voter"+str(n)+"','Voter')" for n in range(6,16)))
 sql("insert into public.space_members(space_id,user_id) values "+','.join("('"+space+"','"+u(n)+"')" for n in range(6,15)))
 post=scalar(u(1),"select (public.create_post('"+space+"','Room note')).id")
 lobby=scalar(u(1),"select (public.create_post(null,'Lobby note')).id")
 check('nonmember only reads lobby',scalar(u(15),'select count(*) from public.posts')=='1')
 deny('nonmember cannot write room',u(15),"select public.create_post('"+space+"','Wrong room')",'SPACE_FORBIDDEN')
 deny('nonmember cannot vote room',u(15),"select public.cast_content_vote('"+post+"','slop')",'POST_FORBIDDEN')
 deny('author cannot self vote',u(1),"select public.cast_content_vote('"+post+"','valuable')",'SELF_VOTE_FORBIDDEN')
 deny('cross-space reply rejected',u(6),"select public.create_post(null,'Reply',null,null,null,'"+post+"')",'INVALID_PARENT')
 asuser(u(6),"select public.cast_content_vote('"+post+"','slop')")
 check('slop first vote under review',sql("select slop_status from public.posts where id='"+post+"'").stdout.strip()=='under_review')
 asuser(u(6),"select public.cast_content_vote('"+post+"','slop')")
 check('repeat same vote idempotent',sql("select slop_votes_count from public.posts where id='"+post+"'").stdout.strip()=='1')
 asuser(u(6),"select public.cast_content_vote('"+post+"','valuable')")
 check('switch vote updates both counts',sql("select valuable_votes_count||','||slop_votes_count||','||slop_status from public.posts where id='"+post+"'").stdout.strip()=='1,0,valuable_verified')
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  votes=list(pool.map(lambda n: asuser(u(n),"select public.cast_content_vote('"+post+"','slop')",False),range(7,11)))
 check('concurrent votes maintain exact counts',all(r.returncode==0 for r in votes) and sql("select valuable_votes_count||','||slop_votes_count||','||slop_status from public.posts where id='"+post+"'").stdout.strip()=='1,4,hidden')
 check('hidden remains reviewable by room members',scalar(u(6),"select count(*) from public.posts where id='"+post+"'")=='1')
 asuser(u(7),"select public.cast_content_vote('"+post+"','valuable')")
 asuser(u(8),"select public.cast_content_vote('"+post+"','valuable')")
 check('switches rehabilitate hidden post',sql("select valuable_votes_count||','||slop_votes_count||','||slop_status from public.posts where id='"+post+"'").stdout.strip()=='3,2,valuable_verified')
 check('voters see only own ballots',scalar(u(6),'select count(*) from public.content_votes')=='1')
 deny('direct counter tampering denied',u(1),"update public.posts set valuable_votes_count=900 where id='"+post+"'",'permission denied')
 asuser(u(6),"insert into storage.objects(bucket_id,name) values ('post-media','"+u(6)+"/room.png')")
 check('unpublished room upload not shared',scalar(u(7),"select count(*) from storage.objects where name='"+u(6)+"/room.png'")=='0')
 asuser(u(6),"select public.create_post('"+space+"','Picture','"+u(6)+"/room.png')")
 check('room media visible to member',scalar(u(7),"select count(*) from storage.objects where name='"+u(6)+"/room.png'")=='1')
 check('room media hidden from nonmember',scalar(u(15),"select count(*) from storage.objects where name='"+u(6)+"/room.png'")=='0')
 deny('foreign media cannot attach',u(7),"select public.create_post('"+space+"','Stolen','"+u(6)+"/room.png')",'INVALID_MEDIA')
 r=asuser(u(6),"update storage.objects set name='"+u(6)+"/renamed.png' where name='"+u(6)+"/room.png'",False)
 check('objects cannot be overwritten',r.returncode!=0 or 'UPDATE 0' in r.stdout)
 r=asuser(u(6),"delete from storage.objects where name='"+u(6)+"/room.png'",False)
 check('objects cannot be deleted',r.returncode!=0 or 'DELETE 0' in r.stdout)
 check('all buckets private',sql('select bool_and(not public) from storage.buckets').stdout.strip()=='t')
 # Warteliste
 asuser('',"select public.join_waitlist('Erika Muster','Erika@Example.org')",role='anon')
 asuser('',"select public.join_waitlist('Erika Doppelt','erika@example.ORG ')",role='anon')
 check('waitlist join is case-insensitive idempotent',sql("select count(*)||','||min(name) from public.waitlist_entries").stdout.strip()=='1,Erika Muster')
 asuser('',"select public.join_waitlist('Max','max@example.org')",role='anon')
 r=asuser('',"select public.join_waitlist('Bad','not-an-email')",False,role='anon'); check('waitlist rejects invalid email',r.returncode!=0 and 'INVALID_EMAIL' in r.stderr)
 r=asuser('',"select public.join_waitlist('  ','a@b.de')",False,role='anon'); check('waitlist rejects blank name',r.returncode!=0 and 'INVALID_NAME' in r.stderr)
 r=asuser('','select * from public.waitlist_entries',False,role='anon'); check('anonymous cannot read waitlist',r.returncode!=0 and 'permission denied' in r.stderr)
 deny('anonymous cannot insert waitlist directly','',"insert into public.waitlist_entries(name,email) values ('x','x@y.de')",'permission denied')
 check('member without admin sees no waitlist',scalar(u(6),'select count(*) from public.waitlist_entries')=='0')
 check('is_admin false for member',scalar(u(6),'select public.is_admin()')=='f')
 check('is_admin true for owner',scalar(u(1),'select public.is_admin()')=='t')
 entry=sql("select id from public.waitlist_entries where email='erika@example.org'").stdout.strip()
 other=sql("select id from public.waitlist_entries where email='max@example.org'").stdout.strip()
 deny('member cannot approve waitlist',u(6),"select public.approve_waitlist_entry('"+entry+"')",'ADMIN_REQUIRED')
 deny('direct waitlist status change denied',u(1),"update public.waitlist_entries set status='approved'",'permission denied')
 check('admin reads waitlist',scalar(u(1),'select count(*) from public.waitlist_entries')=='2')
 budget=sql("select invites_left from public.profiles where id='"+u(1)+"'").stdout.strip()
 code=scalar(u(1),"select (public.approve_waitlist_entry('"+entry+"')).code")
 check('approval issues valid invite',json.loads(scalar('',"select public.inspect_invite('"+code+"')"))['valid'])
 check('approval does not consume admin budget',sql("select invites_left from public.profiles where id='"+u(1)+"'").stdout.strip()==budget)
 check('approval links ticket and status',sql("select e.status||','||(t.code='"+code+"') from public.waitlist_entries e join public.invite_tickets t on t.id=e.ticket_id where e.id='"+entry+"'").stdout.strip()=='approved,true')
 check('repeat approval returns same ticket',scalar(u(1),"select (public.approve_waitlist_entry('"+entry+"')).code")==code)
 deny('approved entry cannot be rejected',u(1),"select public.reject_waitlist_entry('"+entry+"')",'WAITLIST_ALREADY_APPROVED')
 deny('member cannot mark invited',u(6),"select public.mark_waitlist_invited('"+entry+"')",'ADMIN_REQUIRED')
 deny('pending entry cannot be marked invited',u(1),"select public.mark_waitlist_invited('"+other+"')",'WAITLIST_NOT_APPROVED')
 asuser(u(1),"select public.mark_waitlist_invited('"+entry+"')"); asuser(u(1),"select public.mark_waitlist_invited('"+entry+"')")
 check('invite mail is logged per send',sql("select invite_count||','||(invited_at is not null) from public.waitlist_entries where id='"+entry+"'").stdout.strip()=='2,true')
 asuser(u(1),"select public.reject_waitlist_entry('"+other+"')")
 check('reject marks entry',sql("select status||','||(decided_by='"+u(1)+"') from public.waitlist_entries where id='"+other+"'").stdout.strip()=='rejected,true')
 asuser(u(1),"select public.delete_waitlist_entry('"+other+"')")
 check('admin can delete entry',sql("select count(*) from public.waitlist_entries where id='"+other+"'").stdout.strip()=='0')
 deny('member cannot delete entry',u(6),"select public.delete_waitlist_entry('"+entry+"')",'ADMIN_REQUIRED')
 r=cmd(['psql','-X','-v','ON_ERROR_STOP=1','-v','owner_id='+u(40),'-v','username=wrongowner','-v','display_name=Wrong Owner','-f',str(root/'supabase/bootstrap-owner.sql')],env=env)
 exists=sql("select count(*) from public.profiles where id='"+u(40)+"'").stdout.strip()
 check('bootstrap refuses a different existing owner without side effects',r.returncode!=0 and exists=='0','exit='+str(r.returncode)+', newly admitted profile='+exists)
except Exception as exc:
 reports.append({'test':'HARNESS_FATAL','pass':False,'detail':str(exc)})
 print('HARNESS_FATAL',exc,flush=True)
finally:
 if started:
  r=cmd(['pg_ctl','-D',str(cluster),'-m','fast','-w','stop'])
  check('owned PostgreSQL stopped',r.returncode==0,r.stdout.strip())
 (out/'results.json').write_text(json.dumps(reports,indent=2))
 print(json.dumps({'passed':sum(t['pass'] for t in reports),'failed':sum(not t['pass'] for t in reports)},indent=2))
 sys.exit(0 if all(t['pass'] for t in reports) else 1)
