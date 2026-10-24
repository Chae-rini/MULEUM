import test from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, createPublicKey, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { canReceive, defaultPreferences, isQuiet, planNotification, safePayload, validatePreferences, type NotificationFacts } from '../lib/notifications/model.ts';
import { vapidAuthorization } from '../lib/notifications/vapid.ts';

const student:NotificationFacts={kind:'question_answer',recipient:{id:'student-a',active:true,roles:['student']},studentId:'student-a',hasAnswer:true};
test('notifications require opt-in, kind consent and correct recipient',()=>{
 assert.equal(defaultPreferences.enabled,false);assert.deepEqual(defaultPreferences.kinds,[]);
 assert.equal(planNotification(student,defaultPreferences,new Date()),'skip');
 assert.equal(canReceive({...student,studentId:'student-b'}),false);
 assert.equal(canReceive({...student,recipient:{...student.recipient,roles:['administrator']}}),false);
 assert.equal(canReceive({...student,recipient:{...student.recipient,active:false}}),false);
 assert.deepEqual(safePayload('question_answer'),{kind:'question_answer'});
});
test('teacher, parent and notice audiences require current authorization facts',()=>{
 const teacher:NotificationFacts={kind:'student_question',recipient:{id:'teacher',active:true,roles:['teacher']},questionShared:true,pinnedTeacherId:'teacher',relationshipApproved:true,studentActive:true};
 assert.equal(canReceive(teacher),true);assert.equal(canReceive({...teacher,questionShared:false}),false);assert.equal(canReceive({...teacher,relationshipApproved:false}),false);
 const parent:NotificationFacts={kind:'schedule_changed',recipient:{id:'parent',active:true,roles:['parent']},guardianApproved:true,parentShareApproved:true,studentActive:true};
 assert.equal(canReceive(parent),true);assert.equal(canReceive({...parent,parentShareApproved:false}),false);
 assert.equal(canReceive({kind:'notice',recipient:parent.recipient,noticeApproved:true,noticeAudience:['teacher']}),false);
 assert.equal(canReceive({kind:'notice',recipient:parent.recipient,noticeApproved:true,noticeAudience:['parent']}),true);
});
test('quiet hours handle midnight, timezone and equal boundaries',()=>{
 assert.equal(isQuiet(defaultPreferences,new Date('2026-10-23T14:00:00Z')),true);
 assert.equal(isQuiet(defaultPreferences,new Date('2026-10-23T03:00:00Z')),false);
 assert.equal(isQuiet({...defaultPreferences,quietStart:0,quietEnd:0},new Date()),false);
 assert.equal(isQuiet({...defaultPreferences,timezone:'America/New_York'},new Date('2026-11-01T06:30:00Z')),true);
 assert.equal(planNotification(student,{...defaultPreferences,enabled:true,kinds:['question_answer']},new Date('2026-10-23T14:00:00Z')),'defer');
});
test('diary is optional and time settings are validated',()=>{
 assert.throws(()=>validatePreferences({...defaultPreferences,kinds:['diary']}));
 assert.throws(()=>validatePreferences({...defaultPreferences,timezone:'bad-zone'}));
 assert.throws(()=>validatePreferences({...defaultPreferences,quietStart:1440}));
 const p=validatePreferences({...defaultPreferences,enabled:true,kinds:['diary'],diaryMinute:1200});
 assert.equal(planNotification({...student,kind:'diary'},p,new Date('2026-10-23T11:00:00Z')),'ready');
 assert.equal(planNotification({...student,kind:'diary'},p,new Date('2026-10-23T10:00:00Z')),'skip');
});
test('VAPID signs a scoped one-hour JWT and rejects unsafe endpoint hosts',()=>{
 const ecdh=createECDH('prime256v1');ecdh.generateKeys();const pub=ecdh.getPublicKey();
 const config={publicKey:pub.toString('base64url'),privateKey:ecdh.getPrivateKey().toString('base64url'),subject:'mailto:fixture@example.invalid'};
 const now=Date.parse('2026-10-23T00:00:00Z');const header=vapidAuthorization('https://fcm.googleapis.com/fcm/send/fixture',config,now);
 const token=header.split('t=')[1].split(',')[0];const [head,payload,sig]=token.split('.');
 const claims=JSON.parse(Buffer.from(payload,'base64url').toString());assert.equal(claims.aud,'https://fcm.googleapis.com');assert.equal(claims.exp,now/1000+3600);
 const key=createPublicKey({format:'jwk',key:{kty:'EC',crv:'P-256',x:pub.subarray(1,33).toString('base64url'),y:pub.subarray(33).toString('base64url')}});
 assert.equal(verify('sha256',Buffer.from(`${head}.${payload}`),{key,dsaEncoding:'ieee-p1363'},Buffer.from(sig,'base64url')),true);
 for(const endpoint of ['http://127.0.0.1','https://fcm.googleapis.com.evil.invalid/x','https://web.push.apple.com:9999/x'])assert.throws(()=>vapidAuthorization(endpoint,config));
});
test('service worker strips sensitive payloads, uses fixed destination and never caches pages',async()=>{
 const handlers=new Map<string,(e:unknown)=>void>();const shown:unknown[]=[];const opened:unknown[]=[];
 const scope={addEventListener:(type:string,fn:(e:unknown)=>void)=>handlers.set(type,fn),location:{origin:'https://muleum.example'},clients:{claim:async()=>{},openWindow:async(url:string)=>opened.push(url)},registration:{showNotification:async(title:string,options:unknown)=>shown.push({title,options})}};
 vm.runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),{self:scope,URL});
 assert.equal(handlers.has('fetch'),false);
 assert.equal(handlers.has('message'),false);
 let pending:Promise<unknown>=Promise.resolve();
 handlers.get('push')!({data:{json:()=>({kind:'question_answer',body:'PRIVATE_DIARY',title:'PRIVATE_NAME',url:'https://evil.invalid'})},waitUntil:(p:Promise<unknown>)=>pending=p});await pending;
 assert.equal(shown.length,1);assert.ok(!JSON.stringify(shown).includes('PRIVATE'));assert.ok(!JSON.stringify(shown).includes('evil'));
 handlers.get('notificationclick')!({notification:{close:()=>{},data:{url:'https://evil.invalid'}},waitUntil:(p:Promise<unknown>)=>pending=p});await pending;assert.deepEqual(opened,['/member']);
 handlers.get('push')!({data:{json:()=>({kind:'__proto__'})},waitUntil:(p:Promise<unknown>)=>pending=p});await pending;assert.equal(shown.length,1);
});
