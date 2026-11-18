import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const pg=new PGlite();
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
try{
 await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema nhf_private;
 create table auth.users(id uuid primary key);
 create table public.beta_teams(id uuid primary key);
 create table public.beta_members(id uuid,team uuid,role text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 grant usage on schema auth,nhf_private to authenticated;
 create function nhf_private.coaches(t uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select from public.beta_members where id=auth.uid() and team=t and role='coach')$$;`);
 await pg.exec(await readFile('supabase/beta/010_invitation_delivery.sql','utf8'));
 for(const n of [1,2,3])await pg.query('insert into auth.users values ($1)',[id(n)]);
 for(const n of [10,20])await pg.query('insert into beta_teams values ($1)',[id(n)]);
 for(const [n,team,role] of [[1,10,'coach'],[2,10,'athlete'],[3,20,'coach']])await pg.query('insert into beta_members values($1,$2,$3)',[id(n),id(team),role]);
 await pg.exec('set role service_role');
 await pg.query("insert into beta_invitation_deliveries(team,recipient,member_role,sender,created_by) values($1,'test@example.test','athlete','noreply@example.test',$2)",[id(10),id(1)]);
 await pg.exec('reset role;set role authenticated');
 for(const [n,expected] of [[1,1],[2,0],[3,0]]){
  await pg.query("select set_config('test.uid',$1,false)",[id(n)]);
  assert.equal((await pg.query('select * from beta_invitation_deliveries')).rows.length,expected);
  await assert.rejects(pg.query("update beta_invitation_deliveries set status='delivered'"));
  await assert.rejects(pg.query('delete from beta_invitation_deliveries'));
  await assert.rejects(pg.query("insert into beta_invitation_deliveries(team,recipient,member_role,sender) values($1,'forged@example.test','athlete','fake')",[id(10)]));
 }
 await pg.exec('reset role;set role anon');await assert.rejects(pg.query('select * from beta_invitation_deliveries'));
 console.log('PASS: same-team coach read, athlete/other-team/anon denied, no client can forge delivery status');
}finally{await pg.close();}
