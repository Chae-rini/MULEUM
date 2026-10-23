import test from 'node:test';
import assert from 'node:assert/strict';
import { canAsk, canUseQuestions, questionInput, updateInput } from '../lib/questions/model.ts';
import { questionClient } from '../lib/questions/client.ts';
import type { Identity } from '../lib/auth/policy.ts';
const identity: Identity = { id:'00000000-0000-4000-8000-000000000001', mode:'supabase',roles:['student'],enrollment:'active' };
function form(values: Record<string,string>) { const f=new FormData();for(const [key,value] of Object.entries(values))f.set(key,value);return f; }
test('member question access rejects demo identities and unrelated roles',()=>{
 assert.ok(canAsk(identity));assert.equal(canAsk({...identity,enrollment:'alumni'}),false);
 assert.equal(canUseQuestions({...identity,mode:'demo'}),false);
 for(const role of ['parent','alumni','administrator','teaching_assistant','community_operator'] as const)assert.equal(canUseQuestions({...identity,roles:[role]}),false);
 assert.ok(canUseQuestions({...identity,roles:['teacher']}));
});
test('question validation limits content and excludes forged ownership fields',()=>{
 const values={request_id:identity.id,title:' Why? ',body:' A question ',visibility:'private',student_id:'forged',author_id:'forged'};
 assert.deepEqual(questionInput(form(values)),{p_id:identity.id,p_title:'Why?',p_body:'A question',p_visibility:'private'});
 for(const changes of [{title:' '},{title:'x'.repeat(121)},{body:'x'.repeat(4001)},{visibility:'public'},{request_id:'bad'}])assert.throws(()=>questionInput(form({...values,...changes})));
});
test('updates reject invalid versions, empty replies and role-setting operations',()=>{
 const values={thread_id:identity.id,version:'1',operation:'message',value:'hello'};
 assert.equal(updateInput(form(values)).p_version,1);
 for(const changes of [{version:''},{version:'1.5'},{version:'0'},{operation:'set_author'},{value:' '},{value:'x'.repeat(4001)}])assert.throws(()=>updateInput(form({...values,...changes})));
});
test('database requests use the user token without cache and redact database errors',async()=>{
 let options: RequestInit | undefined;
 const client=questionClient({url:'https://example.invalid',key:'sb_publishable_fixture'},'fictional-user-token',async(_url,init)=>{options=init;return new Response(JSON.stringify([]),{status:200});});
 await client.list();assert.equal(options?.cache,'no-store');assert.equal((options?.headers as Record<string,string>).Authorization,'Bearer fictional-user-token');
 const failing=questionClient({url:'https://example.invalid',key:'fixture'},'user',async()=>new Response('PRIVATE_DATABASE_DETAIL',{status:403}));
 await assert.rejects(()=>failing.list(),error=>error instanceof Error&&!error.message.includes('PRIVATE_DATABASE_DETAIL'));
});
