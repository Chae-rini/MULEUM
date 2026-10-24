// Runs only an isolated in-memory PostgreSQL instance; no DATABASE_URL is read.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const modulePath=process.argv[2] ?? '/private/tmp/muleum-sql-check/node_modules/@electric-sql/pglite/dist/index.js';
const {PGlite}=await import(pathToFileURL(modulePath).href);
const db=await PGlite.create();
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const hash=token=>createHash('sha256').update(token).digest('hex');
let checks=0;
async function check(name,fn){await fn();checks++;console.log(`PASS ${name}`);}
// Supabase puts the Google email and provider into the access token claims that auth.jwt() exposes.
async function as(n,{email=null,provider='google'}={},role='authenticated'){
 await db.exec('reset role');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?id(n):'']);
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(n?{sub:id(n),email,app_metadata:{provider}}:{})]);
 await db.exec(`set role ${role}`);
}
async function owner(){await db.exec('reset role');}
async function rows(sql,args=[]){return (await db.query(sql,args)).rows;}
async function value(sql,args=[]){return (await rows(sql,args))[0]?.value;}
async function fails(sql,args=[],code){await assert.rejects(()=>db.query(sql,args),error=>code?error.code===code:true);}
const invite=(email,role,teacher,token,days=7)=>db.query('select public.create_invitation($1,$2,$3,$4,$5) value',[email,role,teacher,hash(token),days]);
const accept=token=>value('select public.accept_invitation($1) value',[hash(token)]);
const onboard=(name,ageYears,consent=true)=>value("select public.complete_onboarding($1,((now() at time zone 'Asia/Seoul')::date - make_interval(years=>$2))::date,'Fictional district',$3) value",[name,ageYears,consent]);
try {
 await db.exec("create role anon nologin; create role authenticated nologin; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid(), auth.jwt() to anon,authenticated;");
 for(const file of ['supabase/migrations/202610230001_members_and_videos.sql','supabase/seed.sql','supabase/migrations/202610230002_question_threads.sql','supabase/migrations/202610230003_notifications.sql','supabase/migrations/202610240001_invitations_onboarding.sql','supabase/migrations/202610250001_profile_column_grants.sql'])await db.exec(await readFile(new URL(`../${file}`,import.meta.url),'utf8'));
 await db.query('insert into auth.users select unnest($1::uuid[])',[[20,21,22,23,24,25].map(id)]);

 await as(null,{},'anon');
 await check('anonymous visitors cannot create or accept invitations',async()=>{await fails('select public.create_invitation($1,$2,null,$3,7)',['a@example.invalid','parent',hash('x')]);await fails('select public.accept_invitation($1)',[hash('x')]);});
 await as(1,{email:'member1@example.invalid'});
 await check('non-administrators cannot create, list, revoke or confirm invitations',async()=>{await fails('select public.create_invitation($1,$2,null,$3,7)',['a@example.invalid','parent',hash('x')],'42501');await fails('select * from public.list_invitations()',[],'42501');await fails('select * from public.pending_guardian_consents()',[],'42501');await fails('select public.confirm_guardian_consent($1,$2)',[id(1),'ref'],'42501');});
 await check('invitation and onboarding tables are never directly readable',async()=>{await fails('select * from public.member_invitations');await fails('select * from public.member_onboarding');});

 await as(5,{email:'member5@example.invalid'});
 await check('administrator invitations validate role, teacher, expiry and token hash',async()=>{
  await fails('select public.create_invitation($1,$2,null,$3,7)',['s@example.invalid','student',hash('t')]);
  await fails('select public.create_invitation($1,$2,$3,$4,7)',['s@example.invalid','student',id(1),hash('t')]);
  await fails('select public.create_invitation($1,$2,$3,$4,7)',['p@example.invalid','parent',id(3),hash('t')]);
  await fails('select public.create_invitation($1,$2,null,$3,7)',['p@example.invalid','alumni',hash('t')]);
  await fails('select public.create_invitation($1,$2,null,$3,0)',['p@example.invalid','parent',hash('t')]);
  await fails('select public.create_invitation($1,$2,null,$3,15)',['p@example.invalid','parent',hash('t')]);
  await fails('select public.create_invitation($1,$2,null,$3,7)',['p@example.invalid','parent','not-a-hash']);
  await fails('select public.create_invitation($1,$2,null,$3,7)',['not-an-email','parent',hash('t')]);
 });
 await invite('  Minor.Student@Example.Invalid ','student',id(3),'minor-token');
 await invite('adult.parent@example.invalid','parent',null,'adult-token');
 await invite('first@example.invalid','parent',null,'replaced-token');
 await invite('first@example.invalid','parent',null,'fresh-token');
 await invite('expired@example.invalid','parent',null,'expired-token');
 await invite('member1@example.invalid','parent',null,'member-token');
 await invite('teacher-left@example.invalid','student',id(3),'teacher-left-token');
 await owner();await db.query("update public.member_invitations set expires_at=now()-interval '1 minute' where invited_email='expired@example.invalid'");
 await as(5,{email:'member5@example.invalid'});
 await check('emails are normalized and re-inviting revokes the previous open link',async()=>{
  const list=await rows('select * from public.list_invitations()');
  assert.ok(list.some(r=>r.invited_email==='minor.student@example.invalid'&&r.role==='student'&&r.teacher_name==='Fictional member 3'));
  const first=list.filter(r=>r.invited_email==='first@example.invalid');
  assert.equal(first.length,2);assert.equal(first.filter(r=>r.revoked_at===null).length,1);
 });

 await check('a different Google account cannot use someone else’s invitation',async()=>{await as(20,{email:'someone.else@example.invalid'});await fails('select public.accept_invitation($1)',[hash('minor-token')],'MUL01');});
 await check('only Google sign-in can accept an invitation',async()=>{await as(20,{email:'minor.student@example.invalid',provider:'email'});await fails('select public.accept_invitation($1)',[hash('minor-token')],'MUL06');});
 await check('expired, replaced and unknown links are unavailable',async()=>{
  await as(21,{email:'expired@example.invalid'});await fails('select public.accept_invitation($1)',[hash('expired-token')],'MUL02');
  await as(21,{email:'first@example.invalid'});await fails('select public.accept_invitation($1)',[hash('replaced-token')],'MUL02');
  await fails('select public.accept_invitation($1)',[hash('never-issued')],'MUL02');
 });
 await check('an existing member cannot accept another invitation',async()=>{await as(1,{email:'member1@example.invalid'});await fails('select public.accept_invitation($1)',[hash('member-token')],'MUL03');});

 await as(20,{email:'minor.student@example.invalid'});
 await check('accepting creates only an invited account with a pending role',async()=>{
  assert.equal(await accept('minor-token'),'student');
  assert.equal(await value('select public.my_onboarding_status() value'),'needs_profile');
  assert.deepEqual(await rows('select * from public.member_accounts'),[]);
  assert.deepEqual(await rows('select * from public.private_journals'),[]);
 });
 await check('a used link cannot be accepted again',async()=>{await as(22,{email:'minor.student@example.invalid'});await fails('select public.accept_invitation($1)',[hash('minor-token')],'MUL02');});
 await as(20,{email:'minor.student@example.invalid'});
 await check('onboarding requires privacy consent and a minimum age of 15',async()=>{
  await fails("select public.complete_onboarding('Minor Student',current_date - 6000,'Fictional district',false)",[],'MUL04');
  await fails("select public.complete_onboarding('Minor Student',((now() at time zone 'Asia/Seoul')::date - interval '14 years')::date,'Fictional district',true)",[],'MUL05');
 });
 await check('a 17-year-old stays invited until guardian consent is confirmed',async()=>{
  assert.equal(await onboard('Minor Student',17),'waiting_guardian');
  assert.equal(await value('select public.my_onboarding_status() value'),'waiting_guardian');
  await fails("select public.complete_onboarding('Again',current_date - 9000,'Fictional district',true)",[],'MUL02');
  await owner();
  assert.equal((await rows('select status from public.member_accounts where user_id=$1',[id(20)]))[0].status,'invited');
  assert.equal((await rows('select status from public.member_roles where user_id=$1',[id(20)]))[0].status,'pending');
  assert.deepEqual(await rows("select * from public.teacher_assignments where student_id=$1",[id(20)]),[]);
 });

 await as(5,{email:'member5@example.invalid'});
 await check('administrator sees the pending minor and must record a consent reference',async()=>{
  const pending=await rows('select * from public.pending_guardian_consents()');
  assert.equal(pending.length,1);assert.equal(pending[0].full_name,'Minor Student');assert.equal(pending[0].age,17);assert.equal(pending[0].role,'student');
  await fails('select public.confirm_guardian_consent($1,$2)',[id(20),'   ']);
 });
 await check('confirming guardian consent activates the student with the invited teacher',async()=>{
  await db.query('select public.confirm_guardian_consent($1,$2)',[id(20),'2026-10-24 보호자 통화 확인']);
  await as(20,{email:'minor.student@example.invalid'});
  assert.equal(await value('select public.my_onboarding_status() value'),'active');
  assert.equal((await rows('select status from public.member_accounts'))[0].status,'active');
  assert.equal((await rows("select role from public.member_roles where status='approved'"))[0].role,'student');
  assert.equal((await rows("select teacher_id from public.teacher_assignments where status='approved'"))[0].teacher_id,id(3));
 });
 await check('consent cannot be confirmed twice',async()=>{await as(5,{email:'member5@example.invalid'});await fails('select public.confirm_guardian_consent($1,$2)',[id(20),'again'],'MUL02');});
 await check('an activated minor cannot rewrite their birth date to pass as an adult',async()=>{
  await as(20,{email:'minor.student@example.invalid'});
  await fails("update public.member_profiles set birth_date='2000-01-01' where user_id=$1",[id(20)],'42501');
  assert.equal(await value('select public.my_age_category() value'),'minor');
  assert.equal((await db.query("update public.member_profiles set full_name='Minor Renamed',residence_region='Fictional city' where user_id=$1",[id(20)])).affectedRows,1);
 });

 await check('an adult is active right after onboarding without guardian consent',async()=>{
  await as(23,{email:'adult.parent@example.invalid'});
  assert.equal(await accept('adult-token'),'parent');
  assert.equal(await onboard('Adult Parent',40),'active');
  assert.equal((await rows("select role from public.member_roles where status='approved'"))[0].role,'parent');
  await owner();assert.deepEqual(await rows('select * from public.teacher_assignments where student_id=$1',[id(23)]),[]);
 });
 await check('activation fails safely when the invited teacher is no longer active',async()=>{
  await as(24,{email:'teacher-left@example.invalid'});assert.equal(await accept('teacher-left-token'),'student');
  await owner();await db.query("update public.member_roles set status='revoked' where user_id=$1 and role='teacher'",[id(3)]);
  await as(24,{email:'teacher-left@example.invalid'});assert.equal(await onboard('Late Student',16),'waiting_guardian');
  await as(5,{email:'member5@example.invalid'});await fails('select public.confirm_guardian_consent($1,$2)',[id(24),'ref']);
  await owner();assert.equal((await rows('select status from public.member_accounts where user_id=$1',[id(24)]))[0].status,'invited');
  assert.equal((await rows('select guardian_consent_at from public.member_onboarding where user_id=$1',[id(24)]))[0].guardian_consent_at,null);
 });
 await check('revoked invitations cannot be accepted',async()=>{
  await owner();await db.query("update public.member_roles set status='approved' where user_id=$1 and role='teacher'",[id(3)]);
  await as(5,{email:'member5@example.invalid'});await invite('revoked@example.invalid','parent',null,'revoked-token');
  const target=(await rows('select id from public.list_invitations() where invited_email=$1',['revoked@example.invalid']))[0].id;
  await db.query('select public.revoke_invitation($1)',[target]);
  await as(25,{email:'revoked@example.invalid'});await fails('select public.accept_invitation($1)',[hash('revoked-token')],'MUL02');
 });
 console.log(`${checks} invitation database checks passed (isolated local SQL only)`);
} finally { await db.close(); }
