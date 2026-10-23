// Fictional Auth + a small REST adapter backed by actual local SQL/RLS.
// This adapter is test-only and is not a replacement for managed PostgREST.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium, expect } from '@playwright/test';
import { questionDatabase, asMember, fixtureId } from './question-test-support.mjs';

const modulePath=process.argv[2] ?? '/private/tmp/muleum-sql-check/node_modules/@electric-sql/pglite/dist/index.js';
const db=await questionDatabase(modulePath);
const sessions=new Map();
let failNextWrite=false;
const mock=createServer(async(req,res)=>{
 const json=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
 try {
  const url=new URL(req.url,'http://localhost');
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):{};
  if(req.headers.apikey!=='sb_publishable_question_fixture')return json(401,{});
  if(url.pathname==='/auth/v1/token'){
   const n=Number(/^member(\d+)@example.invalid$/.exec(body.email)?.[1]);
   if(![1,2,3,4,5,6,7,8,9].includes(n)||body.password!=='fictional-password')return json(401,{});
   const token=randomUUID();sessions.set(token,n);return json(200,{access_token:token,expires_in:3600});
  }
  const token=req.headers.authorization?.replace(/^Bearer /,'');const n=sessions.get(token);
  if(!n)return json(401,{});
  if(url.pathname==='/auth/v1/user')return json(200,{id:fixtureId(n)});
  if(url.pathname==='/auth/v1/logout'){sessions.delete(token);return json(200,{});}
  const endpoint=url.pathname.replace('/rest/v1/','');
  if(endpoint.startsWith('rpc/')){
   if(req.method!=='POST')return json(405,{});
   if(failNextWrite){failNextWrite=false;return json(503,{});}
   const result=await asMember(db,n,tx=>{
    if(endpoint==='rpc/create_question')return tx.query('select public.create_question($1,$2,$3,$4) value',[body.p_id,body.p_title,body.p_body,body.p_visibility]);
    if(endpoint==='rpc/update_question')return tx.query('select public.update_question($1,$2,$3,$4) value',[body.p_thread,body.p_version,body.p_action,body.p_value]);
    throw new Error('Unknown fixture RPC');
   });return json(200,result.rows[0].value);
  }
  if(req.method!=='GET')return json(403,{});
  const queries={
   member_accounts:['select user_id,status,enrollment from public.member_accounts where user_id=$1',[fixtureId(n)]],
   member_roles:["select user_id,role,status from public.member_roles where user_id=$1 and status='approved'",[fixtureId(n)]],
   teacher_assignments:["select id,student_id,teacher_id from public.teacher_assignments where status='approved'",[]],
   question_threads:url.searchParams.has('id')?['select * from public.question_threads where id=$1',[url.searchParams.get('id').replace(/^eq\./,'')]]:['select * from public.question_threads order by updated_at desc,id desc limit 100',[]],
   question_messages:['select * from public.question_messages where thread_id=$1 order by sequence',[url.searchParams.get('thread_id')?.replace(/^eq\./,'')]],
  };
  const query=queries[endpoint];if(!query)return json(404,{});
  return json(200,(await asMember(db,n,tx=>tx.query(...query))).rows);
 } catch(error){return json(error.code==='PT409'?409:403,{code:error.code??'fixture_error'});}
});
let app,browser;let checks=0;
async function check(name,fn){await fn();checks++;console.log(`PASS ${name}`);}
try {
 mock.listen(0,'127.0.0.1');await once(mock,'listening');
 const base='http://127.0.0.1:3108';
 app=spawn(process.execPath,[`${process.cwd()}/node_modules/next/dist/bin/next`,'start','--hostname','127.0.0.1','--port','3108'],{
  cwd:process.env.MULEUM_TEST_APP_DIR??process.cwd(),stdio:['ignore','pipe','pipe'],
  env:{...process.env,NODE_ENV:'production',MULEUM_ENABLE_AUTH:'true',SUPABASE_URL:`http://127.0.0.1:${mock.address().port}`,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_question_fixture'},
 });
 let output='';app.stdout.on('data',c=>output+=c);app.stderr.on('data',c=>output+=c);
 for(let i=0;i<100;i++){if(app.exitCode!==null)throw new Error(output);if(output.includes('Ready in'))break;if(i===99)throw new Error('App startup timeout');await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({channel:'chrome',headless:true});
 async function login(page,n){await page.goto(base+'/login');await page.getByLabel('이메일',{exact:true}).fill(`member${n}@example.invalid`);await page.getByLabel('비밀번호',{exact:true}).fill('fictional-password');await page.getByRole('button',{name:'로그인',exact:true}).click();await expect(page).toHaveURL(/\/member\/(student|teacher|parent|administrator|alumni|teaching_assistant|community_operator)$/);}
 async function fit(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const sc=await browser.newContext({viewport}),tc=await browser.newContext({viewport});
  const student=await sc.newPage(),teacher=await tc.newPage();
  const title=`Fictional ${name} question`;const privateTitle=`PRIVATE_${name}_SENTINEL`;
  let id;
  await check(`${name}: student saves private and shared questions through authenticated server actions`,async()=>{
   await login(student,1);await student.goto(base+'/member/questions');
   await student.getByLabel('질문 제목',{exact:true}).fill(privateTitle);await student.getByLabel('질문 내용',{exact:true}).fill('Private fictional text');
   await student.getByRole('button',{name:'질문 저장',exact:true}).click();await expect(student).toHaveURL(/\/member\/questions\/[0-9a-f-]+$/);
   await student.goto(base+'/member/questions');await student.getByLabel('질문 제목',{exact:true}).fill(title);await student.getByLabel('질문 내용',{exact:true}).fill('Why is the sky blue?');await student.getByLabel('질문 공개 범위',{exact:true}).selectOption('teacher');
   // Extra client fields must not influence the authenticated author.
   await student.locator('form').filter({has:student.getByLabel('질문 제목',{exact:true})}).evaluate(form=>{const input=document.createElement('input');input.name='student_id';input.value='00000000-0000-4000-8000-000000000002';form.append(input);});
   await student.getByRole('button',{name:'질문 저장',exact:true}).click();await expect(student).toHaveURL(/\/member\/questions\/[0-9a-f-]+$/);id=student.url().split('/').at(-1);
   assert.equal((await asMember(db,1,tx=>tx.query('select student_id from public.question_threads where id=$1',[id]))).rows[0].student_id,fixtureId(1));
   await fit(student);
  });
  await check(`${name}: teacher only sees shared questions and writes a human answer`,async()=>{
   await login(teacher,3);await teacher.goto(base+'/member/questions');await expect(teacher.getByRole('link',{name:privateTitle,exact:true})).toHaveCount(0);
   await teacher.getByRole('link',{name:title,exact:true}).click();await teacher.getByLabel('선생님 답변',{exact:true}).fill('A fictional human explanation.');await teacher.getByRole('button',{name:'답변 남기기',exact:true}).click();await expect(teacher.getByText('A fictional human explanation.',{exact:true})).toBeVisible();await fit(teacher);
  });
  await check(`${name}: save failure preserves input and student follows up`,async()=>{
   await student.reload();await student.getByLabel('후속 질문',{exact:true}).fill('How can I check that?');failNextWrite=true;
   await student.getByRole('button',{name:'후속 질문 남기기',exact:true}).click();await expect(student.getByRole('main').getByRole('alert')).toBeVisible();await expect(student.getByLabel('후속 질문',{exact:true})).toHaveValue('How can I check that?');
   await student.getByRole('button',{name:'후속 질문 남기기',exact:true}).click();await expect(student.getByText('How can I check that?',{exact:true})).toBeVisible();await expect(student.getByText('이어 묻기',{exact:true})).toBeVisible();
   await student.screenshot({path:`artifacts/${name}-question-thread.png`,fullPage:true});
  });
  await check(`${name}: an outdated teacher form receives a conflict without losing its text`,async()=>{
   // Teacher last loaded the thread before the student's follow-up changed its version.
   await teacher.getByLabel('선생님 답변',{exact:true}).fill('Stale draft retained');
   await teacher.getByRole('button',{name:'답변 남기기',exact:true}).click();
   await expect(teacher.getByRole('main').getByRole('alert')).toContainText('기록이 변경됐어요');
   await expect(teacher.getByLabel('선생님 답변',{exact:true})).toHaveValue('Stale draft retained');
   assert.equal((await asMember(db,1,tx=>tx.query('select * from public.question_messages where thread_id=$1',[id]))).rows.length,2);
  });
  await check(`${name}: logout and fresh login preserve the database conversation`,async()=>{
   await student.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(student).toHaveURL(/\/login/);await login(student,1);await student.goto(base+'/member/questions/'+id);await expect(student.getByText('How can I check that?',{exact:true})).toBeVisible();
   await student.getByRole('button',{name:'질문 마무리하기',exact:true}).click();await expect(student.getByText('마무리',{exact:true})).toBeVisible();await expect(student.getByLabel('후속 질문',{exact:true})).toHaveCount(0);
   await student.getByRole('button',{name:'다시 질문 이어가기',exact:true}).click();await expect(student.getByLabel('후속 질문',{exact:true})).toBeVisible();
  });
  await check(`${name}: privacy withdrawal blocks an already-open teacher reply`,async()=>{
   await teacher.reload();await teacher.getByLabel('선생님 답변',{exact:true}).fill('This stale reply must fail');
   await student.getByLabel('공개 범위 변경',{exact:true}).selectOption('private');await student.getByRole('checkbox').check();await student.getByRole('button',{name:'공개 범위 저장',exact:true}).click();await expect(student.getByText('나만 보는 질문과 대화예요.',{exact:true})).toBeVisible();
   await teacher.getByRole('button',{name:'답변 남기기',exact:true}).click();await expect(teacher.getByRole('main').getByRole('alert')).toContainText('접근할 수 없어요');
   // A streamed Next.js notFound response can have HTTP 200 after the loading shell.
   await teacher.goto(base+'/member/questions/'+id);await expect(teacher.getByRole('heading',{name:'이 페이지를 찾을 수 없어요.',exact:true})).toBeVisible();assert.ok(!(await teacher.content()).includes(title));
  });
  await check(`${name}: unrelated students, teachers, parents and administrators cannot read private detail`,async()=>{
   const context=await browser.newContext({viewport});const page=await context.newPage();
   for(const n of [2,9,4,5,6,7,8]){await context.clearCookies();await login(page,n);await page.goto(base+'/member/questions/'+id);await expect(page.getByRole('heading',{name:'이 페이지를 찾을 수 없어요.',exact:true})).toBeVisible();assert.ok(!(await page.content()).includes('How can I check that?'));}
   await context.close();
  });
  await sc.close();await tc.close();
 }
 console.log(`${checks} question integration checks passed with real local SQL/RLS and fictional Auth. Managed Supabase is not covered.`);
} finally {
 await browser?.close();if(app&&app.exitCode===null){app.kill('SIGTERM');await once(app,'exit');}
 mock.closeAllConnections();await new Promise(resolve=>mock.close(resolve));await db.close();
}
