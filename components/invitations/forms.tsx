"use client";
import { useActionState, useState } from "react";
import { confirmConsent, createInvite } from "@/app/member/invitations/actions";
import { Feedback } from "@/components/ui";

export function InviteForm({ roles, teachers }: { roles: [string, string][]; teachers: { user_id: string; full_name: string }[] }) {
  const [state, action, pending] = useActionState(createInvite, {});
  const [role, setRole] = useState("student");
  return <form action={action}>
    <div className="field"><label htmlFor="invite-email">초대할 구글 계정 이메일</label><input id="invite-email" name="email" type="email" required maxLength={254} autoComplete="off" aria-describedby="invite-email-help" /><span id="invite-email-help" className="hint">이 구글 계정으로 로그인해야만 초대를 사용할 수 있어요. 복습영상 공유에도 같은 계정을 써요.</span></div>
    <div className="field"><label htmlFor="invite-role">역할</label><select id="invite-role" name="role" value={role} onChange={event => setRole(event.target.value)}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    {role === "student" && <div className="field"><label htmlFor="invite-teacher">담당 선생님</label><select id="invite-teacher" name="teacher" required defaultValue=""><option value="" disabled>선택해 주세요</option>{teachers.map(teacher => <option key={teacher.user_id} value={teacher.user_id}>{teacher.full_name}</option>)}</select>{!teachers.length && <span className="hint">활성 선생님이 없어요. 선생님을 먼저 초대해 주세요.</span>}</div>}
    <div className="field"><label htmlFor="invite-days">유효 기간(일)</label><input id="invite-days" name="days" type="number" min={1} max={14} defaultValue={7} required /></div>
    <button className="button" disabled={pending}>{pending ? "만드는 중…" : "초대 링크 만들기"}</button>
    <Feedback error={state.error} />
    {state.link && <div className="note mt-4" role="status"><strong>초대 링크 · 지금 한 번만 보여요</strong><input className="mt-2" type="text" readOnly value={state.link} aria-label="초대 링크" onFocus={event => event.currentTarget.select()} /><p className="small mt-2 mb-0">{state.email} 계정으로만 가입할 수 있어요. 카카오톡이나 문자로 직접 전달해 주세요.</p></div>}
  </form>;
}

export function ConsentForm({ userId, name }: { userId: string; name: string }) {
  const [state, action, pending] = useActionState(confirmConsent, {});
  return <form action={action}>
    <input type="hidden" name="user_id" value={userId} />
    <div className="field"><label htmlFor={`consent-${userId}`}>{name} · 보호자 동의 확인 근거</label><input id={`consent-${userId}`} name="reference" type="text" required maxLength={200} placeholder="예: 10/24 보호자 통화로 동의 확인" /></div>
    <button className="button" disabled={pending}>{pending ? "기록하는 중…" : "보호자 동의 확인"}</button>
    <Feedback error={state.error} />
  </form>;
}
