import test from "node:test";
import assert from "node:assert/strict";
import { ageCategory, ageOn, validateProfile } from "../lib/member-profile.ts";
import { createDemoState, demoIds as ids, linkedStudents, transition, visibleVideos, watchUrl } from "../lib/community.ts";
test("age uses the current birthday boundary independently of enrollment",()=>{
 assert.equal(ageCategory("2007-10-24","2026-10-23"),"minor");assert.equal(ageCategory("2007-10-23","2026-10-23"),"adult");
 assert.equal(ageOn("2012-10-24","2026-10-23"),13);assert.equal(ageOn("2012-10-23","2026-10-23"),14);
 assert.equal(ageOn("2008-02-29","2027-02-28"),18);assert.equal(ageOn("2008-02-29","2027-03-01"),19);
 for(const birth of ["2026-02-30","bad","2027-01-01"])assert.equal(ageOn(birth,"2026-10-23"),null);
});
test("optional gender distinguishes null from refusal and does not require a description",()=>{
 const p=createDemoState().profiles[ids.student];
 for(const gender of [null,"prefer_not_to_say","other"] as const)assert.equal(validateProfile(p,{gender,gender_description:null}),null);
 assert.ok(validateProfile(p,{gender:null,gender_description:"private"}));
 assert.ok(validateProfile(p,{gender:"other",gender_description:"x".repeat(121)}));
});
test("only assigned students see private videos; administrator is not a student identity",()=>{
 const s=createDemoState();assert.equal(visibleVideos(s,ids.student).length,1);assert.equal(visibleVideos(s,ids.second)[0].id,"demo-video-b");
 for(const id of [ids.parent,ids.alumni,ids.assistant,ids.operator,"unknown"])assert.deepEqual(visibleVideos(s,id),[]);
 assert.equal(visibleVideos(s,ids.teacher).length,2);
});
test("teachers cannot approve, assign, or confirm external invitations",()=>{
 const s=createDemoState();
 assert.throws(()=>transition(s,ids.teacher,{type:"approve",videoId:s.videos[0].id}));
 assert.throws(()=>transition(s,ids.teacher,{type:"invite_confirm",assignmentId:s.assignments[0].id}));
 assert.throws(()=>transition(s,ids.parent,{type:"role_grant",accountId:ids.parent,role:"administrator"}));
});
test("visibility mismatch invalidates approval and removes student access",()=>{
 const s=transition(createDemoState(),ids.administrator,{type:"observe",videoId:"demo-video-a",observed:"unlisted",channelVerified:true});
 assert.equal(s.videos[0].review,"submitted");assert.equal(s.videos[0].approvedBy,null);assert.equal(visibleVideos(s,ids.student).length,0);
 assert.throws(()=>transition(s,ids.administrator,{type:"approve",videoId:"demo-video-a"}));
});
test("graduation preserves identity but queues separate external revocation",()=>{
 let s=transition(createDemoState(),ids.administrator,{type:"graduate",accountId:ids.student});
 assert.equal(s.accounts[0].id,ids.student);assert.deepEqual(s.accounts[0].roles,["alumni"]);assert.equal(s.assignments[0].invitation,"revoke_pending");assert.equal(visibleVideos(s,ids.student).length,0);
 s=transition(s,ids.administrator,{type:"revoke_confirm",assignmentId:"assignment-a"});assert.equal(s.assignments[0].invitation,"revoked");assert.equal(s.audit.length,2);
});
test("guardian approval and revocation change only approved relationships",()=>{
 let s=createDemoState();assert.deepEqual(linkedStudents(s,ids.parent),[ids.student]);
 s=transition(s,ids.administrator,{type:"relationship_approve",relationshipId:"guardian-b"});assert.equal(linkedStudents(s,ids.parent).length,2);
 s=transition(s,ids.administrator,{type:"relationship_revoke",relationshipId:"guardian-a"});assert.deepEqual(linkedStudents(s,ids.parent),[ids.second]);
});
test("only administrators can end a teacher assignment",()=>{
 const source=createDemoState();assert.throws(()=>transition(source,ids.teacher,{type:"teacher_end",relationshipId:"teacher-a"}));
 const state=transition(source,ids.administrator,{type:"teacher_end",relationshipId:"teacher-a"});assert.deepEqual(linkedStudents(state,ids.teacher),[]);assert.equal(source.relationships[0].status,"approved");
});
test("watch links require approved real video and an independently confirmed invitation",()=>{
 const s=createDemoState();const v={...s.videos[0],fixture:false};const a=s.assignments[0];
 assert.equal(watchUrl(s.videos[0],a),null);assert.equal(watchUrl(v,a),null);
 assert.equal(watchUrl(v,{...a,invitation:"confirmed"}),"https://www.youtube.com/watch?v=DEMO0000001");
 assert.equal(watchUrl({...v,observed:"public"},{...a,invitation:"confirmed"}),null);
 assert.equal(watchUrl({...v,youtubeId:"javascript:bad"},{...a,invitation:"confirmed"}),null);
});
