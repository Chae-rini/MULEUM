import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { questionDatabase, asMember, fixtureId } from './question-test-support.mjs';

const modulePath = process.argv[2];
if (!modulePath) throw new Error('Pass local PGlite dist/index.js path');
const dir = await mkdtemp(join(tmpdir(),'muleum-question-db-'));
let db = await questionDatabase(modulePath,dir);
let checks = 0;
async function check(name, fn) { await fn(); console.log(`PASS ${name}`); checks++; }
const query = (n,sql,args=[]) => asMember(db,n,tx=>tx.query(sql,args));
const create = (n,id,visibility='teacher') => query(n,'select public.create_question($1,$2,$3,$4)',[id,'Fictional question','Why does this happen?',visibility]);
const mutate = (n,id,version,action,value='') => query(n,'select public.update_question($1,$2,$3,$4)',[id,version,action,value]);
const thread = async (n,id) => (await query(n,'select * from public.question_threads where id=$1',[id])).rows[0];
const shared=randomUUID(), privateId=randomUUID();
try {
 await check('student creates a private question and an assigned shared question',async()=>{await create(1,shared);await create(1,privateId,'private');assert.equal((await thread(1,shared)).student_id,fixtureId(1));});
 await check('create retry is idempotent and cannot claim another owner',async()=>{await create(1,shared);assert.equal((await query(1,'select * from public.question_threads')).rows.length,2);await assert.rejects(()=>create(2,shared));});
 await check('anonymous direct SQL and RPC are denied',async()=>{await assert.rejects(()=>query(null,'select * from public.question_threads'));await assert.rejects(()=>create(null,randomUUID()));});
 for(const n of [2,4,5,6,7,8,9]) await check(`account ${n} cannot read or mutate another student's thread`,async()=>{assert.equal(await thread(n,shared),undefined);await assert.rejects(()=>mutate(n,shared,1,'message','forbidden'));});
 await check('teacher reads only shared question, not private question',async()=>{assert.ok(await thread(3,shared));assert.equal(await thread(3,privateId),undefined);await assert.rejects(()=>mutate(3,privateId,1,'message','forbidden'));});
 await check('raw writes cannot bypass RPC or forge the author',async()=>{await assert.rejects(()=>query(1,"insert into public.question_messages(thread_id,author_id,kind,body,sequence) values($1,$2,'answer','forged',2)",[shared,fixtureId(3)]));await assert.rejects(()=>query(1,"update public.question_threads set student_id=$1 where id=$2",[fixtureId(2),shared]));await assert.rejects(()=>query(3,'delete from public.question_threads where id=$1',[shared]));});
 await check('input validation rejects null, whitespace, oversize and unknown visibility',async()=>{for(const [title,body,visibility] of [[' ', 'x','private'],['x','x'.repeat(4001),'private'],['x','x','public'],['x','x',null]]) await assert.rejects(()=>query(1,'select public.create_question($1,$2,$3,$4)',[randomUUID(),title,body,visibility]));});
 await check('student follow-up requires a human answer',async()=>{await assert.rejects(()=>mutate(1,shared,1,'message','early'));});
 await check('teacher answer and student follow-up are ordered and update status',async()=>{await mutate(3,shared,1,'message','A human answer');assert.equal((await thread(1,shared)).status,'answered');await mutate(1,shared,2,'message','A follow-up');assert.equal((await thread(3,shared)).status,'follow_up');const rows=(await query(1,'select * from public.question_messages where thread_id=$1 order by sequence',[shared])).rows;assert.deepEqual(rows.map(m=>m.kind),['answer','follow_up']);assert.deepEqual(rows.map(m=>m.author_id),[fixtureId(3),fixtureId(1)]);});
 await check('stale writes fail without duplicate messages',async()=>{await assert.rejects(()=>mutate(3,shared,2,'message','stale'));assert.equal((await query(1,'select * from public.question_messages where thread_id=$1',[shared])).rows.length,2);});
 await check('only student resolves and can reopen the conversation',async()=>{await assert.rejects(()=>mutate(3,shared,3,'resolve'));await mutate(1,shared,3,'resolve');await assert.rejects(()=>mutate(3,shared,4,'message','closed'));await mutate(1,shared,4,'reopen');assert.equal((await thread(1,shared)).status,'follow_up');});
 await check('privacy revocation hides thread and all messages from teacher',async()=>{await mutate(1,shared,5,'visibility','private');assert.equal(await thread(3,shared),undefined);assert.deepEqual((await query(3,'select * from public.question_messages where thread_id=$1',[shared])).rows,[]);await assert.rejects(()=>mutate(3,shared,6,'message','revoked'));await mutate(1,shared,6,'visibility','teacher');});
 await check('ended assignment and replacement teacher cannot read old conversation',async()=>{await query(5,'select public.assign_teacher($1,$2)',[fixtureId(1),fixtureId(9)]);assert.equal(await thread(3,shared),undefined);assert.equal(await thread(9,shared),undefined);await assert.rejects(()=>mutate(3,shared,7,'message','ended'));});
 await check('student explicitly re-shares full conversation to the new teacher',async()=>{await mutate(1,shared,7,'visibility','teacher');assert.ok(await thread(9,shared));assert.equal(await thread(3,shared),undefined);});
 await check('revoked teacher role and suspended account lose access',async()=>{await db.query("update public.member_roles set status='revoked' where user_id=$1 and role='teacher'",[fixtureId(9)]);assert.equal(await thread(9,shared),undefined);await assert.rejects(()=>mutate(9,shared,8,'message','revoked role'));await db.query("update public.member_roles set status='approved' where user_id=$1 and role='teacher'",[fixtureId(9)]);await db.query("update public.member_accounts set status='suspended' where user_id=$1",[fixtureId(1)]);assert.equal(await thread(1,shared),undefined);assert.equal(await thread(9,shared),undefined);await db.query("update public.member_accounts set status='active' where user_id=$1",[fixtureId(1)]);});
 await check('unassigned student can save privately but cannot share',async()=>{await query(5,'select public.assign_teacher($1,null)',[fixtureId(2)]);await assert.rejects(()=>create(2,randomUUID()));await create(2,randomUUID(),'private');});
 await check('database reopen preserves records independently of login sessions',async()=>{await db.close();const {PGlite}=await import(pathToFileURL(modulePath).href);db=await PGlite.create(dir);assert.equal((await thread(1,shared)).title,'Fictional question');assert.equal((await query(1,'select * from public.question_messages where thread_id=$1',[shared])).rows.length,2);});
 console.log(`${checks} question database checks passed. Fixture directory: ${dir}`);
 console.log('Managed Supabase, JWT verification and independent database connection races are not covered.');
} finally { await db.close(); }
