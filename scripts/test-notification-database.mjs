import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { questionDatabase,asMember,fixtureId } from './question-test-support.mjs';
const path=process.argv[2];if(!path)throw new Error('Pass the existing local PGlite module path');
const db=await questionDatabase(path);
let checks=0;
const query=(n,sql,args=[])=>asMember(db,n,tx=>tx.query(sql,args));
const check=async(name,fn)=>{await fn();checks++;console.log(`PASS ${name}`);};
const enable=(n,kinds,quietStart=0,quietEnd=0,diary=null)=>query(n,'select public.save_notification_settings(true,$1,$2,$3,$4,$5)',[kinds,'Asia/Seoul',quietStart,quietEnd,diary]);
const subscribe=n=>query(n,'select public.register_push_subscription($1,$2,$3)',[`https://fcm.googleapis.com/fcm/send/fictional-${n}`,'B'.repeat(87),'A'.repeat(22)]);
const queue=async(n,kind,resource)=>{const id=randomUUID();await db.query('insert into public.notification_outbox(id,recipient_id,kind,resource_id,event_key) values($1,$2,$3,$4,$5)',[id,fixtureId(n),kind,resource,randomUUID()]);return id;};
const ready=async(id)=> (await db.query('select muleum_private.notification_ready($1) value',[id])).rows[0].value;
try {
 await db.exec(await readFile(new URL('../supabase/migrations/202610230003_notifications.sql',import.meta.url),'utf8'));
 await check('missing delivery time fails closed',async()=>{assert.equal((await db.query('select muleum_private.notification_ready($1,null) value',[randomUUID()])).rows[0].value,false);});
 await check('no default opt-in and subscription requires explicit settings',async()=>{await assert.rejects(()=>subscribe(1));assert.deepEqual((await query(1,'select * from public.notification_settings')).rows,[]);});
 await check('settings reject unknown kinds, timezones and missing diary time',async()=>{
  await assert.rejects(()=>enable(1,['unknown']));await assert.rejects(()=>enable(1,['diary']));
  await assert.rejects(()=>query(1,"select public.save_notification_settings(true,'{}','Not/AZone',0,0,null)"));
  await assert.rejects(()=>enable(1,['notice'],-1,1440));
 });
 await check('settings and subscription metadata belong only to authenticated owner',async()=>{await enable(1,['question_answer']);await subscribe(1);await enable(3,['student_question']);await subscribe(3);assert.equal((await query(1,'select * from public.notification_settings')).rows.length,1);assert.equal((await query(1,'select id,user_id from public.push_subscriptions')).rows[0].user_id,fixtureId(1));await assert.rejects(()=>query(1,'select endpoint,auth_secret from public.push_subscriptions'));});
 await check('anonymous, administrator and other members cannot read endpoints or outbox',async()=>{
  for(const n of [null,2,4,5,6]){await assert.rejects(()=>query(n,'select * from public.push_subscriptions'));await assert.rejects(()=>query(n,'select * from public.notification_outbox'));}
  assert.deepEqual((await query(5,'select id from public.push_subscriptions')).rows,[]);
 });
 await check('endpoint takeover, arbitrary HTTP hosts and direct mutations fail',async()=>{
  await enable(2,['notice']);await assert.rejects(()=>query(2,'select public.register_push_subscription($1,$2,$3)',['https://fcm.googleapis.com/fcm/send/fictional-1','B'.repeat(87),'A'.repeat(22)]));
  for(const url of ['http://127.0.0.1','https://fcm.googleapis.com.evil.invalid/a','https://fcm.googleapis.com@evil.invalid/a','https://127.0.0.1/a'])await assert.rejects(()=>query(1,'select public.register_push_subscription($1,$2,$3)',[url,'B'.repeat(87),'A'.repeat(22)]));
  await assert.rejects(()=>query(1,"update public.notification_settings set enabled=true"));await assert.rejects(()=>query(1,"insert into public.notification_outbox(recipient_id,kind,event_key) values($1,'notice','forged')",[fixtureId(2)]));
 });
 const thread=randomUUID();await query(1,'select public.create_question($1,$2,$3,$4)',[thread,'PRIVATE_TITLE_SENTINEL','PRIVATE_BODY_SENTINEL','teacher']);
 const teacherJob=await queue(3,'student_question',thread),wrongTeacher=await queue(9,'student_question',thread);
 await check('new question is eligible only for the assigned approved teacher',async()=>{assert.equal(await ready(teacherJob),true);await enable(9,['student_question']);await subscribe(9);assert.equal(await ready(wrongTeacher),false);});
 await check('private question and revoked sharing suppress queued notification',async()=>{await query(1,"select public.update_question($1,1,'visibility','private')",[thread]);assert.equal(await ready(teacherJob),false);await query(1,"select public.update_question($1,2,'visibility','teacher')",[thread]);});
 await query(3,"select public.update_question($1,3,'message','PRIVATE_ANSWER_SENTINEL')",[thread]);
 const studentJob=await queue(1,'question_answer',thread),otherStudentJob=await queue(2,'question_answer',thread);
 await check('answer goes only to the question owner and contains no text in outbox',async()=>{assert.equal(await ready(studentJob),true);await enable(2,['question_answer']);await subscribe(2);assert.equal(await ready(otherStudentJob),false);assert.ok(!JSON.stringify((await db.query('select * from public.notification_outbox')).rows).includes('PRIVATE_'));});
 await check('quiet hours respect timezone and suppress delivery',async()=>{await enable(1,['question_answer'],1320,480);const r=await db.query("select muleum_private.notification_ready($1,date_trunc('day',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'+interval '23 hours') value",[studentJob]);assert.equal(r.rows[0].value,false);await enable(1,['question_answer']);});
 await check('expired events and disabled notification kinds do not send',async()=>{await enable(1,['notice']);assert.equal(await ready(studentJob),false);await enable(1,['question_answer']);await db.query("update public.notification_outbox set expires_at=now()-interval '1 second' where id=$1",[studentJob]);assert.equal(await ready(studentJob),false);});
 await check('approved parent gets only explicitly shared schedule notifications',async()=>{
  const schedule=randomUUID();await db.query("insert into public.shared_learning_items(id,student_id,kind,title,body,parent_shared,student_approved,teacher_approved) values($1,$2,'schedule','Fictional schedule','PRIVATE_SCHEDULE',true,true,true)",[schedule,fixtureId(1)]);
  await enable(4,['lesson_reminder']);await subscribe(4);const job=await queue(4,'lesson_reminder',schedule);assert.equal(await ready(job),true);
  await query(5,"select public.set_guardian($1,$2,'revoked',null)",[fixtureId(1),fixtureId(4)]);assert.equal(await ready(job),false);
 });
 await check('teacher replacement invalidates pending old-teacher delivery',async()=>{await query(5,'select public.assign_teacher($1,$2)',[fixtureId(1),fixtureId(9)]);assert.equal(await ready(teacherJob),false);});
 await check('logout RPC revokes all devices and pending events without affecting other users',async()=>{await query(1,'select public.disable_my_push()');assert.ok((await query(1,'select revoked_at from public.push_subscriptions')).rows[0].revoked_at);assert.equal((await query(1,'select enabled from public.notification_settings')).rows[0].enabled,false);assert.equal((await query(3,'select revoked_at from public.push_subscriptions')).rows[0].revoked_at,null);});
 await check('role changes and account suspension invalidate subscriptions',async()=>{await db.query("update public.member_roles set status='revoked' where user_id=$1 and role='teacher'",[fixtureId(3)]);assert.ok((await db.query('select revoked_at from public.push_subscriptions where user_id=$1',[fixtureId(3)])).rows[0].revoked_at);await db.query("update public.member_accounts set status='suspended' where user_id=$1",[fixtureId(2)]);assert.ok((await db.query('select revoked_at from public.push_subscriptions where user_id=$1',[fixtureId(2)])).rows[0].revoked_at);});
 await check('unimplemented real notices fail closed',async()=>{await enable(5,['notice']);await subscribe(5);assert.equal(await ready(await queue(5,'notice',randomUUID())),false);});
 await check('account deletion cascades notification data',async()=>{await db.query('delete from public.member_accounts where user_id=$1',[fixtureId(5)]);assert.deepEqual((await db.query('select * from public.push_subscriptions where user_id=$1',[fixtureId(5)])).rows,[]);assert.deepEqual((await db.query('select * from public.notification_outbox where recipient_id=$1',[fixtureId(5)])).rows,[]);});
 await check('member cannot invoke private delivery authorization functions',async()=>{await assert.rejects(()=>query(1,'select muleum_private.notification_ready($1)',[teacherJob]));});
 console.log(`${checks} notification database checks passed. No push service was contacted.`);
} finally {await db.close();}
