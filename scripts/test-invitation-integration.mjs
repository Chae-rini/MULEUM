// Invite link + Google sign-in end to end: fictional Google/Auth plus a small REST adapter backed by actual local SQL/RLS.
// This adapter is test-only and does not validate hosted Supabase, Google OAuth or PostgREST.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium, expect } from '@playwright/test';
import { questionDatabase, asMember, fixtureId } from './question-test-support.mjs';

const modulePath=process.argv[2] ?? '/private/tmp/muleum-sql-check/node_modules/@electric-sql/pglite/dist/index.js';
const db=await questionDatabase(modulePath);
const sessions=new Map();
const codes=new Map();
let nextGoogle=null;
const setReturning=new Set(['list_invitations','pending_guardian_consents','active_teachers']);
const mock=createServer(async(req,res)=>{
 const json=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
 try {
  const url=new URL(req.url,'http://localhost');
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):{};
  if(url.pathname==='/auth/v1/authorize'){
   if(url.searchParams.get('provider')!=='google'||url.searchParams.get('code_challenge_method')!=='s256'){res.writeHead(400).end();return;}
   // First Google sign-in creates the auth user, exactly as Supabase does; membership is decided later in SQL.
   await db.query('insert into auth.users values($1) on conflict do nothing',[fixtureId(nextGoogle.n)]);
   const code=randomUUID();codes.set(code,{...nextGoogle,challenge:url.searchParams.get('code_challenge')});
   const target=new URL(url.searchParams.get('redirect_to'));target.searchParams.set('code',code);
   res.writeHead(302,{Location:target.toString()}).end();return;
  }
  if(req.headers.apikey!=='sb_publishable_invitation_fixture')return json(401,{});
  if(url.pathname==='/auth/v1/token'){
   const entry=codes.get(body.auth_code);codes.delete(body.auth_code);
   if(url.searchParams.get('grant_type')!=='pkce'||!entry||entry.challenge!==createHash('sha256').update(String(body.code_verifier??'')).digest('base64url'))return json(400,{});
   const token=randomUUID();sessions.set(token,entry);return json(200,{access_token:token,expires_in:3600});
  }
  const token=req.headers.authorization?.replace(/^Bearer /,'');const who=sessions.get(token);
  if(!who)return json(401,{});
  const claims={email:who.email,app_metadata:{provider:'google'}};
  if(url.pathname==='/auth/v1/user')return json(200,{id:fixtureId(who.n),email:who.email});
  if(url.pathname==='/auth/v1/logout'){sessions.delete(token);return json(200,{});}
  const endpoint=url.pathname.replace('/rest/v1/','');
  if(endpoint.startsWith('rpc/')){
   const name=endpoint.slice(4);
   const calls={
    my_onboarding_status:['select public.my_onboarding_status() value',[]],
    accept_invitation:['select public.accept_invitation($1) value',[body.p_token_hash]],
    complete_onboarding:['select public.complete_onboarding($1,$2,$3,$4) value',[body.p_full_name,body.p_birth_date,body.p_region,body.p_privacy_consent]],
    create_invitation:['select public.create_invitation($1,$2,$3,$4,$5) value',[body.p_email,body.p_role,body.p_teacher,body.p_token_hash,body.p_days]],
    revoke_invitation:['select public.revoke_invitation($1) value',[body.p_id]],
    confirm_guardian_consent:['select public.confirm_guardian_consent($1,$2) value',[body.p_user,body.p_reference]],
    list_invitations:['select * from public.list_invitations()',[]],
    pending_guardian_consents:['select * from public.pending_guardian_consents()',[]],
    active_teachers:['select * from public.active_teachers()',[]],
   };
   if(!calls[name])return json(404,{});
   const result=await asMember(db,who.n,tx=>tx.query(...calls[name]),claims);
   return json(200,setReturning.has(name)?result.rows:result.rows[0].value);
  }
  const queries={
   member_accounts:['select user_id,status,enrollment from public.member_accounts where user_id=$1',[fixtureId(who.n)]],
   member_roles:["select user_id,role,status from public.member_roles where user_id=$1 and status='approved'",[fixtureId(who.n)]],
  };
  const query=queries[endpoint];if(!query||req.method!=='GET')return json(404,{});
  return json(200,(await asMember(db,who.n,tx=>tx.query(...query),claims)).rows);
 } catch(error){return json(400,{code:typeof error.code==='string'?error.code:'fixture_error'});}
});

function seoulDateYearsAgo(years){
 const [y,m,d]=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).split('-');
 return `${Number(y)-years}-${m}-${d}`;
}
let app,browser;let checks=0;
async function check(name,fn){await fn();checks++;console.log(`PASS ${name}`);}
try {
 mock.listen(0,'127.0.0.1');await once(mock,'listening');
 const base='http://127.0.0.1:3109';
 app=spawn(process.execPath,[`${process.cwd()}/node_modules/next/dist/bin/next`,'start','--hostname','127.0.0.1','--port','3109'],{
  cwd:process.cwd(),stdio:['ignore','pipe','pipe'],
  env:{...process.env,NODE_ENV:'production',MULEUM_ENABLE_AUTH:'true',MULEUM_SITE_URL:base,SUPABASE_URL:`http://127.0.0.1:${mock.address().port}`,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_invitation_fixture'},
 });
 let output='';app.stdout.on('data',c=>output+=c);app.stderr.on('data',c=>output+=c);
 for(let i=0;i<100;i++){if(app.exitCode!==null)throw new Error(output);if(output.includes('Ready in'))break;if(i===99)throw new Error('App startup timeout');await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({channel:'chrome',headless:true});
 const admin=await (await browser.newContext()).newPage();
 async function fit(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 async function google(page,n,email,start){nextGoogle={n,email};await page.goto(start);await page.getByRole('link',{name:'Google로 계속하기',exact:true}).click();}
 async function createInvite(email,role){
  await admin.goto(base+'/member/invitations');
  await admin.getByLabel('초대할 구글 계정 이메일',{exact:true}).fill(email);
  await admin.getByLabel('역할',{exact:true}).selectOption(role);
  if(role==='student')await admin.getByLabel('담당 선생님',{exact:true}).selectOption({label:'Fictional member 3'});
  await admin.getByRole('button',{name:'초대 링크 만들기',exact:true}).click();
  const link=admin.getByLabel('초대 링크',{exact:true});await expect(link).toBeVisible();
  return link.inputValue();
 }
 let studentLink;

 await check('an administrator signs in with Google and creates a single-use student link',async()=>{
  await google(admin,5,'member5@example.invalid',base+'/login');
  await expect(admin).toHaveURL(base+'/member/administrator');
  await admin.getByRole('navigation',{name:'메인 메뉴',exact:true}).getByRole('link',{name:'초대와 동의',exact:true}).click();
  await expect(admin.getByRole('heading',{level:1,name:'초대와 보호자 동의'})).toBeVisible();
  studentLink=await createInvite('Minor.Student@Example.invalid','student');
  assert.match(studentLink,new RegExp(`^${base}/invite/[A-Za-z0-9_-]{43}$`));
  await expect(admin.getByText('minor.student@example.invalid 계정으로만 가입할 수 있어요.',{exact:false})).toBeVisible();
  const stored=(await db.query('select token_hash from public.member_invitations where invited_email=$1',['minor.student@example.invalid'])).rows[0].token_hash;
  assert.equal(stored,createHash('sha256').update(studentLink.split('/').pop()).digest('hex'));
  assert.equal((await db.query('select count(*)::int n from public.member_invitations where token_hash like $1',[`%${studentLink.split('/').pop()}%`])).rows[0].n,0);
  await fit(admin);
 });

 const wrong=await (await browser.newContext()).newPage();
 await check('the link refuses a different Google account and keeps the invitation open',async()=>{
  await google(wrong,41,'someone.else@example.invalid',studentLink);
  await expect(wrong).toHaveURL(base+'/login?error=invite-email');
  await expect(wrong.getByRole('main').getByRole('alert')).toContainText('초대받은 구글 계정으로 로그인해 주세요');
  assert.equal((await wrong.context().cookies()).some(c=>c.name==='muleum-auth'),false);
  assert.equal((await db.query('select accepted_at from public.member_invitations where invited_email=$1',['minor.student@example.invalid'])).rows[0].accepted_at,null);
 });

 const student=await (await browser.newContext()).newPage();
 await check('the invited 17-year-old completes one confirmation step and waits for guardian consent',async()=>{
  await google(student,40,'minor.student@example.invalid',studentLink);
  await expect(student).toHaveURL(base+'/welcome');
  await expect(student.getByRole('heading',{level:1,name:'처음 오셨군요'})).toBeVisible();
  await student.getByLabel('이름',{exact:true}).fill('Minor Student');
  await student.getByLabel('생년월일',{exact:true}).fill(seoulDateYearsAgo(17));
  await student.getByLabel('거주 지역',{exact:true}).fill('Fictional district');
  await expect(student.getByRole('checkbox')).toHaveAttribute('required','');
  await student.getByRole('checkbox').check();
  await student.getByRole('button',{name:'가입 마치기',exact:true}).click();
  await expect(student.getByRole('heading',{level:1,name:'보호자 동의를 확인하고 있어요'})).toBeVisible();
  await fit(student);
  await student.goto(base+'/member/student');
  await expect(student).toHaveURL(base+'/login');
 });

 await check('the administrator records guardian consent, which activates the student with the invited teacher',async()=>{
  await admin.goto(base+'/member/invitations');
  await expect(admin.getByRole('heading',{name:'Minor Student · 만 17세'})).toBeVisible();
  await admin.getByLabel('Minor Student · 보호자 동의 확인 근거',{exact:true}).fill('2026-10-24 보호자 통화로 동의 확인');
  await admin.getByRole('button',{name:'보호자 동의 확인',exact:true}).click();
  await expect(admin.getByRole('status')).toContainText('보호자 동의를 기록하고 계정을 활성화했어요');
  const row=(await db.query("select a.status,t.teacher_id from public.member_accounts a join public.teacher_assignments t on t.student_id=a.user_id and t.status='approved' where a.user_id=$1",[fixtureId(40)])).rows[0];
  assert.deepEqual(row,{status:'active',teacher_id:fixtureId(3)});
  await student.goto(base+'/welcome');
  await expect(student).toHaveURL(base+'/member/student');
 });

 await check('a used link cannot be reused by anyone',async()=>{
  const other=await (await browser.newContext()).newPage();
  await google(other,42,'minor.student@example.invalid',studentLink);
  await expect(other).toHaveURL(base+'/login?error=invite');
 });

 await check('an adult invitee is active right after the confirmation step',async()=>{
  const parentLink=await createInvite('adult.parent@example.invalid','parent');
  const parent=await (await browser.newContext()).newPage();
  await google(parent,43,'adult.parent@example.invalid',parentLink);
  await expect(parent).toHaveURL(base+'/welcome');
  await parent.getByLabel('이름',{exact:true}).fill('Adult Parent');
  await parent.getByLabel('생년월일',{exact:true}).fill(seoulDateYearsAgo(40));
  await parent.getByLabel('거주 지역',{exact:true}).fill('Fictional district');
  await parent.getByRole('checkbox').check();
  await parent.getByRole('button',{name:'가입 마치기',exact:true}).click();
  await expect(parent).toHaveURL(base+'/member/parent');
 });

 await check('an uninvited Google account and a revoked link get no access',async()=>{
  const stranger=await (await browser.newContext()).newPage();
  await google(stranger,44,'stranger@example.invalid',base+'/login');
  await expect(stranger).toHaveURL(base+'/login?error=not-invited');
  const revokedLink=await createInvite('revoked@example.invalid','parent');
  const card=admin.locator('article').filter({hasText:'revoked@example.invalid'});
  await card.getByRole('button',{name:'초대 취소',exact:true}).click();
  await expect(card.getByText('취소됨',{exact:true})).toBeVisible();
  await google(stranger,45,'revoked@example.invalid',revokedLink);
  await expect(stranger).toHaveURL(base+'/login?error=invite');
 });
 console.log(`${checks} invitation integration checks passed (fictional Google/Auth with local SQL)`);
} finally {
 await browser?.close();
 if(app&&app.exitCode===null){app.kill('SIGTERM');await once(app,'exit');}
 mock.closeAllConnections();await new Promise(r=>mock.close(r));await db.close();
}
