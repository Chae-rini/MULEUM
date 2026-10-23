// Runs only an isolated in-memory PostgreSQL instance; no DATABASE_URL is read.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const modulePath=process.argv[2];
if(!modulePath) throw new Error('Pass the local PGlite dist/index.js path; see docs/DEVELOPMENT_SETUP.md');
const {PGlite}=await import(pathToFileURL(modulePath).href);
const db=await PGlite.create();
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let checks=0;
async function check(name,fn){await fn();checks++;console.log(`PASS ${name}`);}
async function as(n,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?id(n):'']);await db.exec(`set role ${role}`);}
async function rows(sql,args=[]){return (await db.query(sql,args)).rows;}
async function denied(sql,args=[]){await assert.rejects(()=>db.query(sql,args));}
try {
 await db.exec("create role anon nologin; create role authenticated nologin; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;");
 await db.exec(await readFile(new URL('../supabase/migrations/202610230001_members_and_videos.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/seed.sql',import.meta.url),'utf8'));
 await check('migration enables RLS on every application table',async()=>{const r=await rows("select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity");assert.deepEqual(r,[]);});
 await as(null,'anon');
 await check('anonymous cannot read profiles or invoke privileged mutation',async()=>{await denied('select * from public.member_profiles');await denied("select public.manage_member('grant_role',$1,'administrator')",[id(1)]);assert.deepEqual(await rows('select * from public.public_video_catalogue()'),[]);});
 await as(1);
 await check('student reads only own profile and optional data',async()=>{assert.equal((await rows('select * from public.member_profiles')).length,1);assert.equal((await rows('select * from public.member_optional_profiles'))[0].gender_description,'PRIVATE_GENDER_SENTINEL');});
 await check('student cannot update another profile or self-elevate',async()=>{assert.equal((await db.query('update public.member_profiles set full_name=$1 where user_id=$2',['hacked',id(2)])).affectedRows,0);await denied("insert into public.member_roles(user_id,role,status) values($1,'administrator','approved')",[id(1)]);await denied("select public.manage_member('grant_role',$1,'administrator')",[id(1)]);});
 await check('gender can be omitted or explicitly refused; invalid free text fails',async()=>{await db.query('update public.member_optional_profiles set gender=null,gender_description=null');assert.equal((await rows('select gender from public.member_optional_profiles'))[0].gender,null);await db.query("update public.member_optional_profiles set gender='prefer_not_to_say'");assert.equal((await rows('select gender from public.member_optional_profiles'))[0].gender,'prefer_not_to_say');await denied("update public.member_optional_profiles set gender_description='not allowed'");});
 await check('future birth dates and owner changes fail',async()=>{await denied("update public.member_profiles set birth_date=current_date+1");await denied('update public.member_profiles set user_id=$1',[id(7)]);});
 await check('age category is computed from date, not role or gender',async()=>{assert.equal((await rows('select public.my_age_category() value'))[0].value,'minor');await db.query("update public.member_profiles set birth_date='2000-01-01'");assert.equal((await rows('select public.my_age_category() value'))[0].value,'adult');});
 for(const n of [2,3,4,5,6,7,8]){await as(n);await check(`account ${n} cannot read student private records`,async()=>{assert.deepEqual(await rows('select * from public.private_journals'),[]);assert.deepEqual(await rows('select * from public.private_questions'),[]);assert.deepEqual(await rows('select * from public.member_optional_profiles'),[]);});}
 await as(4);
 await check('guardian gets approved summary only, no raw student profile',async()=>{assert.equal((await rows('select * from public.shared_learning_items')).length,1);const minimal=await rows('select * from public.related_student_summaries()');assert.equal(minimal.length,1);assert.deepEqual(Object.keys(minimal[0]).sort(),['full_name','student_id']);assert.equal((await rows('select * from public.member_profiles'))[0].user_id,id(4));});
 await as(5);await db.query("select public.set_guardian($1,$2,'revoked',null)",[id(1),id(4)]);await as(4);
 await check('revoked guardian loses access immediately',async()=>{assert.deepEqual(await rows('select * from public.related_student_summaries()'),[]);assert.deepEqual(await rows('select * from public.shared_learning_items'),[]);});
 await as(5);await db.query("select public.set_guardian($1,$2,'approved','fictional-evidence')",[id(1),id(4)]);
 await db.query("select public.set_guardian($1,$2,'approved','fictional-evidence')",[id(2),id(4)]);await as(4);
 await check('one guardian can have multiple approved students',async()=>assert.equal((await rows('select * from public.related_student_summaries()')).length,2));
 await as(5);await db.query("select public.manage_member('grant_role',$1,'parent')",[id(8)]);await db.query("select public.set_guardian($1,$2,'approved','fictional-second-guardian')",[id(1),id(8)]);await as(8);
 await check('student can have multiple guardians and an account can have multiple roles',async()=>{assert.equal((await rows('select * from public.related_student_summaries()')).length,1);assert.equal((await rows("select role from public.member_roles where status='approved'")).length,2);assert.deepEqual(await rows('select * from public.private_journals'),[]);});
 await as(3);
 await check('teacher cannot end own administrative assignment',async()=>{await denied('select public.assign_teacher($1,null)',[id(1)]);});
 await as(5);await db.query('select public.assign_teacher($1,null)',[id(1)]);await as(3);
 await check('administrator-ended assignment removes teacher access',async()=>{assert.deepEqual(await rows('select * from public.related_student_summaries()'),[]);});
 await as(5);await db.query('select public.assign_teacher($1,$2)',[id(1),id(3)]);await as(3);
 const video=(await rows("select public.create_video('DEMO0000001','Fictional lesson','Example','복습','Math','Unit','Assigned students','private',$1) id",[[id(3)]]))[0].id;
 await db.query("select public.review_video($1,'mark_uploaded')",[video]);
 await db.query("select public.review_video($1,'submit')",[video]);
 await check('teacher cannot approve own video or assign students',async()=>{await denied("select public.review_video($1,'approve')",[video]);await denied('select public.assign_video($1,$2,$3)',[video,id(1),'student@example.invalid']);});
 await as(5);
 await check('approval requires independent channel/visibility observation',async()=>{await denied("select public.review_video($1,'approve')",[video]);await db.query("select public.review_video($1,'observe','private',true)",[video]);await db.query("select public.review_video($1,'approve')",[video]);});
 const assignment=(await rows('select public.assign_video($1,$2,$3) id',[video,id(1),'student@example.invalid']))[0].id;
 await as(1);await check('assigned student sees one approved private video',async()=>assert.equal((await rows('select * from public.education_videos')).length,1));
 for(const n of [2,4,6,7,8]){await as(n);await check(`account ${n} cannot read another student's video or Google email`,async()=>{assert.deepEqual(await rows('select * from public.education_videos'),[]);assert.deepEqual(await rows('select * from public.video_recipient_emails'),[]);});}
 await as(3);await check('creator does not receive student Google email',async()=>assert.deepEqual(await rows('select * from public.video_recipient_emails'),[]));
 await as(5);await db.query("select public.confirm_video_access($1,'invite_confirm')",[assignment]);
 await db.query("select public.review_video($1,'observe','unlisted',true)",[video]);await as(1);
 await check('YouTube mismatch hides the video and invalidates approval',async()=>assert.deepEqual(await rows('select * from public.education_videos'),[]));
 await as(5);await db.query("select public.review_video($1,'observe','private',true)",[video]);await db.query("select public.review_video($1,'approve')",[video]);
 await db.query("select public.manage_member('graduate',$1,'')",[id(1)]);
 await check('graduation preserves account, queues external revocation, grants no teacher power',async()=>{assert.equal((await rows('select enrollment from public.member_accounts where user_id=$1',[id(1)]))[0].enrollment,'alumni');assert.equal((await rows('select invitation_status from public.video_assignments where id=$1',[assignment]))[0].invitation_status,'revoke_pending');assert.deepEqual(await rows("select role from public.member_roles where user_id=$1 and status='approved' and role in ('teacher','administrator')",[id(1)]),[]);});
 await db.query("select public.confirm_video_access($1,'revoke_confirm')",[assignment]);
 await check('revocation needs its own confirmation; cannot re-confirm old invitation',async()=>{assert.equal((await rows('select invitation_status from public.video_assignments where id=$1',[assignment]))[0].invitation_status,'revoked');await denied("select public.confirm_video_access($1,'invite_confirm')",[assignment]);});
 await check('audit excludes private free text and cannot be edited by admin role',async()=>{const audit=await rows('select * from public.permission_audit');assert.ok(audit.length>0);assert.ok(!JSON.stringify(audit).includes('PRIVATE_'));await denied('delete from public.permission_audit');});
 await check('only one official channel exists and public catalogue has minimal fields',async()=>{
  await db.exec('reset role');await denied("insert into public.official_channel(singleton,name) values(false,'Other channel')");
  await db.query("update public.official_channel set youtube_channel_id='UC0000000000000000000000',verified_at=now()");
  await db.query("insert into public.education_videos(youtube_video_id,title,description,category,subject,unit,audience,requested_visibility,upload_status,review_status,observed_visibility,channel_verified,observed_at,approved_by,approved_at,is_fixture) values('PUBLIC00001','Public example','Public copy','학습법','General','Unit','Public','public','uploaded','approved','public',true,now(),$1,now(),false)",[id(5)]);
  await as(null,'anon');const catalogue=await rows('select * from public.public_video_catalogue()');assert.equal(catalogue.length,1);assert.deepEqual(Object.keys(catalogue[0]).sort(),['category','description','title','youtube_video_id']);assert.ok(!JSON.stringify(catalogue).includes('student@example.invalid'));
 });
 await as(1);await check('alumni retains own journal under the provisional retention policy',async()=>assert.equal((await rows('select * from public.private_journals')).length,1));
 await db.exec('reset role');
 await check('database enforces 10 teachers even on privileged inserts',async()=>{
  for(let n=10;n<20;n++){await db.query('insert into auth.users values($1)',[id(n)]);await db.query("insert into public.member_accounts(user_id,status) values($1,'active')",[id(n)]);}
  for(let n=10;n<19;n++)await db.query("insert into public.member_roles(user_id,role,status) values($1,'teacher','approved')",[id(n)]);
  await denied("insert into public.member_roles(user_id,role,status) values($1,'teacher','approved')",[id(19)]);
 });
 await check('database enforces 10 students per teacher and 100 active students',async()=>{
  for(let n=100;n<200;n++){await db.query('insert into auth.users values($1)',[id(n)]);}
  for(let n=100;n<199;n++)await db.query("insert into public.member_accounts(user_id,status,enrollment) values($1,'active','active')",[id(n)]);
  await denied("insert into public.member_accounts(user_id,status,enrollment) values($1,'active','active')",[id(199)]);
  for(let n=100;n<110;n++)await db.query("insert into public.teacher_assignments(student_id,teacher_id,status) values($1,$2,'approved')",[id(n),id(3)]);
  await denied("insert into public.teacher_assignments(student_id,teacher_id,status) values($1,$2,'approved')",[id(110),id(3)]);
 });
 console.log(`${checks} database checks passed. Supabase Auth/HTTP and concurrent sessions are NOT covered.`);
} finally {await db.close();}
