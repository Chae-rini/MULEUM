import type { AccountRole, OptionalProfile, Profile } from "./member-profile.ts";

export interface Account { id: string; label: string; roles: AccountRole[]; status: "invited" | "active" | "suspended"; enrollment: "active" | "alumni" | "none" }
export interface Relationship { id: string; studentId: string; memberId: string; kind: "guardian" | "teacher"; status: "pending" | "approved" | "revoked" }
export const categories = ["복습", "학습법", "진로·삶", "공개 Q&A", "독서·토론", "교육철학"] as const;
export interface Video {
  id: string; youtubeId: string; title: string; description: string; category: string; subject: string; unit: string; audience: string;
  creatorIds: string[]; visibility: "private" | "public"; review: "draft" | "submitted" | "approved";
  upload: "pending" | "uploaded"; observed: "unknown" | "private" | "public" | "unlisted";
  checkedAt: string | null; approvedBy: string | null; channelVerified: boolean; fixture: boolean;
}
export interface Assignment { id: string; videoId: string; studentId: string; googleEmail: string; status: "active" | "ended"; invitation: "pending" | "confirmed" | "revoke_pending" | "revoked"; checkedAt: string | null }
export interface Audit { actorId: string; action: string; targetId: string; at: string }
export interface CommunityState { accounts: Account[]; relationships: Relationship[]; videos: Video[]; assignments: Assignment[]; audit: Audit[]; profiles: Record<string, Profile>; optional: Record<string, OptionalProfile> }
export const demoIds = { student: "00000000-0000-4000-8000-000000000001", second: "00000000-0000-4000-8000-000000000002", teacher: "00000000-0000-4000-8000-000000000003", parent: "00000000-0000-4000-8000-000000000004", administrator: "00000000-0000-4000-8000-000000000005", alumni: "00000000-0000-4000-8000-000000000006", assistant: "00000000-0000-4000-8000-000000000007", operator: "00000000-0000-4000-8000-000000000008" };
export function createDemoState(): CommunityState {
  const accounts: Account[] = Object.entries(demoIds).map(([key, id]) => ({ id, label: ({ student:"가상 학생 A",second:"가상 학생 B",teacher:"가상 선생님",parent:"가상 학부모",administrator:"가상 관리자",alumni:"가상 졸업생",assistant:"가상 조교",operator:"가상 운영진" } as Record<string,string>)[key], roles: [({ second:"student",assistant:"teaching_assistant",operator:"community_operator" } as Record<string,AccountRole>)[key] ?? key as AccountRole], status: "active", enrollment: key === "student" || key === "second" ? "active" : key === "alumni" ? "alumni" : "none" }));
  const video: Video = { id: "demo-video-a", youtubeId: "DEMO0000001", title: "가상 복습 · 질문에서 개념으로", description: "수업 뒤 스스로 설명해 보는 복습 영상의 예시입니다.", category:"복습", subject:"수학", unit:"개념 탐구", audience:"배정된 학생", creatorIds:[demoIds.teacher], visibility:"private", review:"approved", upload:"uploaded", observed:"private", checkedAt:"2026-10-23T00:00:00Z", approvedBy:demoIds.administrator, channelVerified:true, fixture:true };
  return { accounts, relationships:[{id:"teacher-a",studentId:demoIds.student,memberId:demoIds.teacher,kind:"teacher",status:"approved"},{id:"guardian-a",studentId:demoIds.student,memberId:demoIds.parent,kind:"guardian",status:"approved"},{id:"guardian-b",studentId:demoIds.second,memberId:demoIds.parent,kind:"guardian",status:"pending"}], videos:[video,{...video,id:"demo-video-b",youtubeId:"DEMO0000002",title:"가상 학생 B 전용 복습"}], assignments:[{id:"assignment-a",videoId:video.id,studentId:demoIds.student,googleEmail:"student-a@example.invalid",status:"active",invitation:"pending",checkedAt:null},{id:"assignment-b",videoId:"demo-video-b",studentId:demoIds.second,googleEmail:"student-b@example.invalid",status:"active",invitation:"confirmed",checkedAt:video.checkedAt}], audit:[], profiles:Object.fromEntries(accounts.map(a => [a.id,{user_id:a.id,full_name:a.label,birth_date:a.enrollment === "active" ? "2010-05-20" : "2000-01-01",residence_region:"가상시 가상구",created_at:"2026-10-23T00:00:00Z",updated_at:"2026-10-23T00:00:00Z"}])), optional:{} };
}
export function hasRole(state: CommunityState, id: string, role: AccountRole): boolean { return state.accounts.some(a => a.id === id && a.status === "active" && a.roles.includes(role)); }
export function isAssignedTeacher(state: CommunityState, teacher: string, student: string): boolean { return hasRole(state,teacher,"teacher") && state.relationships.some(r => r.kind === "teacher" && r.status === "approved" && r.memberId === teacher && r.studentId === student); }
export function linkedStudents(state: CommunityState, memberId: string): string[] { return state.relationships.filter(r => r.memberId === memberId && r.status === "approved" && (r.kind === "guardian" ? hasRole(state,memberId,"parent") : hasRole(state,memberId,"teacher"))).map(r => r.studentId); }
export function visibleVideos(state: CommunityState, actor: string): Video[] {
  if (!state.accounts.some(a => a.id === actor && a.status === "active")) return [];
  return state.videos.filter(v => hasRole(state,actor,"administrator") || (hasRole(state,actor,"teacher") && v.creatorIds.includes(actor)) || (hasRole(state,actor,"student") && state.accounts.find(a=>a.id===actor)?.enrollment === "active" && v.review === "approved" && v.visibility === "private" && v.observed === "private" && v.channelVerified && state.assignments.some(a=>a.videoId===v.id && a.studentId===actor && a.status==="active" && a.invitation!=="revoked" && a.invitation!=="revoke_pending")));
}
export function watchUrl(video: Video, assignment?: Assignment): string | null {
  if (video.fixture || !/^[\w-]{11}$/.test(video.youtubeId) || video.review!=="approved" || !video.channelVerified || video.visibility!==video.observed) return null;
  if (video.visibility==="private" && (!assignment || assignment.videoId!==video.id || assignment.status!=="active" || assignment.invitation!=="confirmed")) return null;
  return `https://www.youtube.com/watch?v=${video.youtubeId}`;
}
export type CommunityAction =
  | {type:"video_create"; video:Video}
  | {type:"submit"|"approve"|"mark_uploaded"; videoId:string}
  | {type:"observe"; videoId:string; observed:Video["observed"]; channelVerified:boolean}
  | {type:"assign"; videoId:string; studentId:string}
  | {type:"invite_confirm"|"end_access"|"revoke_confirm"; assignmentId:string}
  | {type:"relationship_approve"|"relationship_revoke"; relationshipId:string}
  | {type:"teacher_end"; relationshipId:string}
  | {type:"teacher_assign"; studentId:string; teacherId:string}
  | {type:"graduate"|"suspend"; accountId:string}
  | {type:"role_grant"; accountId:string; role:AccountRole};
export function transition(source: CommunityState, actor: string, action: CommunityAction, now = new Date().toISOString()): CommunityState {
  const state = structuredClone(source);
  const admin = hasRole(state,actor,"administrator");
  const deny = () => { throw new Error("이 작업에 필요한 승인 권한이 없어요."); };
  const video = "videoId" in action ? state.videos.find(v=>v.id===action.videoId) : undefined;
  const assignment = "assignmentId" in action ? state.assignments.find(a=>a.id===action.assignmentId) : undefined;
  if (action.type === "video_create") {
    if (!hasRole(state,actor,"teacher") && !admin) deny();
    const v = action.video;
    if (!/^[\w-]{11}$/.test(v.youtubeId) || !v.title.trim() || v.title.length>160 || v.description.length>2000 || !categories.includes(v.category as typeof categories[number]) || !["private","public"].includes(v.visibility) || !v.subject.trim() || !v.unit.trim() || !v.audience.trim() || !v.creatorIds.includes(actor) || v.creatorIds.some(id=>!hasRole(state,id,"teacher") && !hasRole(state,id,"administrator")) || state.videos.some(x=>x.youtubeId===v.youtubeId || x.id===v.id)) throw new Error("영상 ID·필수 항목·제작자·중복 등록을 확인해 주세요.");
    state.videos.push({...v,review:"draft",approvedBy:null,observed:"unknown",checkedAt:null,channelVerified:false,fixture:true});
  } else if (action.type === "submit" || action.type === "mark_uploaded") {
    if (!video || (!admin && (!hasRole(state,actor,"teacher") || !video.creatorIds.includes(actor)))) deny();
    if (video!.review !== "draft") throw new Error("초안만 검토 요청할 수 있어요.");
    if(action.type === "mark_uploaded") video!.upload="uploaded";
    else { if(video!.upload!=="uploaded") throw new Error("업로드 완료를 먼저 기록해 주세요.");video!.review="submitted"; }
  } else {
    if (!admin) deny();
    if (action.type === "approve") {
      if (!video || video.review!=="submitted" || video.upload!=="uploaded" || !video.channelVerified || video.observed!==video.visibility) throw new Error("검토 요청·업로드·공식 채널·공개 상태 확인을 먼저 완료해 주세요.");
      video.review="approved"; video.approvedBy=actor;
    } else if (action.type === "observe") {
      if (!video || !["unknown","private","public","unlisted"].includes(action.observed)) throw new Error("영상을 확인해 주세요.");
      video.observed=action.observed; video.channelVerified=action.channelVerified; video.checkedAt=now;
      if (video.observed!==video.visibility || !video.channelVerified) { video.review="submitted";video.approvedBy=null; }
    } else if (action.type === "assign") {
      if (!video || video.visibility!=="private" || video.review!=="approved" || video.observed!=="private" || !video.channelVerified || !hasRole(state,action.studentId,"student") || state.accounts.find(a=>a.id===action.studentId)?.enrollment!=="active") throw new Error("승인된 비공개 영상과 활성 학생만 배정할 수 있어요.");
      if (state.assignments.some(a=>a.videoId===video.id && a.studentId===action.studentId)) throw new Error("이미 배정 이력이 있어요. 회수 이력을 확인해 주세요.");
      state.assignments.push({id:`assignment-${state.assignments.length+1}`,videoId:video.id,studentId:action.studentId,googleEmail:`demo-${state.assignments.length+1}@example.invalid`,status:"active",invitation:"pending",checkedAt:null});
    } else if (action.type === "invite_confirm" || action.type === "end_access" || action.type === "revoke_confirm") {
      if (!assignment) throw new Error("배정을 찾을 수 없어요.");
      if (action.type === "invite_confirm") { if (assignment.status!=="active" || assignment.invitation!=="pending") throw new Error("초대 대기 중인 배정만 확인할 수 있어요."); assignment.invitation="confirmed"; }
      if (action.type === "end_access") { assignment.status="ended";assignment.invitation=assignment.invitation==="revoked"?"revoked":"revoke_pending"; }
      if (action.type === "revoke_confirm") { if (assignment.status!=="ended" || assignment.invitation!=="revoke_pending") throw new Error("회수 대기 상태를 확인해 주세요."); assignment.invitation="revoked"; }
      assignment.checkedAt=now;
    } else if (action.type === "relationship_approve" || action.type === "relationship_revoke") {
      const r=state.relationships.find(r=>r.id===action.relationshipId);
      if (!r || r.kind!=="guardian") throw new Error("보호자 관계를 확인해 주세요.");
      if (action.type==="relationship_approve" && (!hasRole(state,r.memberId,"parent") || !hasRole(state,r.studentId,"student"))) throw new Error("활성 학생·학부모 계정이 필요해요.");
      r.status=action.type==="relationship_approve"?"approved":"revoked";
    } else if (action.type === "teacher_end") {
      const relationship=state.relationships.find(r=>r.id===action.relationshipId&&r.kind==="teacher");
      if(!relationship) throw new Error("담당 배정을 찾을 수 없어요.");
      relationship.status="revoked";
    } else if (action.type === "teacher_assign") {
      if (!hasRole(state,action.teacherId,"teacher") || !hasRole(state,action.studentId,"student") || state.accounts.find(a=>a.id===action.studentId)?.enrollment!=="active") throw new Error("활성 학생과 선생님을 선택해 주세요.");
      const count=state.relationships.filter(r=>r.kind==="teacher"&&r.status==="approved"&&r.memberId===action.teacherId&&r.studentId!==action.studentId&&state.accounts.some(a=>a.id===r.studentId&&a.status==="active"&&a.enrollment==="active")).length;
      if(count>=10) throw new Error("담당 학생 정원 10명을 초과할 수 없어요.");
      state.relationships.filter(r=>r.studentId===action.studentId&&r.kind==="teacher"&&r.status==="approved").forEach(r=>r.status="revoked");
      state.relationships.push({id:`teacher-${state.relationships.length}`,studentId:action.studentId,memberId:action.teacherId,kind:"teacher",status:"approved"});
    } else if (action.type==="role_grant") {
      const account=state.accounts.find(a=>a.id===action.accountId);
      if(!account) throw new Error("계정이 없어요.");
      if(action.role==="teacher"&&!account.roles.includes("teacher")&&state.accounts.filter(a=>a.roles.includes("teacher")&&a.status==="active").length>=10) throw new Error("선생님 정원 10명을 초과할 수 없어요.");
      if(!account.roles.includes(action.role)) account.roles.push(action.role);
    } else if(action.type==="graduate"||action.type==="suspend") {
      const account=state.accounts.find(a=>a.id===action.accountId);
      if(!account) throw new Error("계정이 없어요.");
      if(action.type==="graduate") { account.enrollment="alumni";account.roles=account.roles.filter(r=>r!=="student");if(!account.roles.includes("alumni"))account.roles.push("alumni"); } else account.status="suspended";
      state.relationships.filter(r=>r.studentId===account.id&&r.kind==="teacher").forEach(r=>r.status="revoked");
      state.assignments.filter(a=>a.studentId===account.id&&a.invitation!=="revoked").forEach(a=>{a.status="ended";a.invitation="revoke_pending";});
    }
  }
  state.audit.push({actorId:actor,action:action.type,targetId:"videoId" in action?action.videoId:"assignmentId" in action?action.assignmentId:"accountId" in action?action.accountId:"relationshipId" in action?action.relationshipId:action.type==="video_create"?action.video.id:action.studentId,at:now});
  return state;
}
