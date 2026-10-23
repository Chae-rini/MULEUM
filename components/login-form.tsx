"use client";
import { useActionState } from "react";
import { login, saveProfile } from "@/app/login/actions";
import { Feedback } from "./ui";
import type { OwnProfile } from "@/lib/auth/supabase";

export function LoginForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(login, {});
  return <form action={action}>
    <fieldset disabled={!enabled || pending} className="auth-fields">
      <div className="field"><label htmlFor="email">이메일</label><input id="email" name="email" type="email" autoComplete="username" required maxLength={254} aria-describedby="login-help" /></div>
      <div className="field"><label htmlFor="password">비밀번호</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} /></div>
      <button className="button w-full" type="submit">{pending ? "로그인 확인 중…" : "로그인"}</button>
    </fieldset>
    <p className="small mt-4" id="login-help">{enabled ? "초대와 승인을 완료한 개발용 계정으로 로그인해 주세요." : "Supabase 개발 환경이 연결되지 않아 실제 로그인은 닫혀 있어요. 실제 이메일·비밀번호를 입력하지 마세요."}</p>
    <Feedback error={state.error} />
  </form>;
}

export function OwnProfileForm({ profile }: { profile: OwnProfile }) {
  const [state, action, pending] = useActionState(saveProfile, {});
  return <form action={action}>
    <div className="field"><label htmlFor="full_name">성명</label><input id="full_name" name="full_name" type="text" defaultValue={profile.full_name} required maxLength={80} /></div>
    <div className="field"><label htmlFor="residence_region">거주 지역</label><input id="residence_region" name="residence_region" type="text" defaultValue={profile.residence_region} required maxLength={80} aria-describedby="region-help" /><span id="region-help" className="hint">시·군·구까지만 입력해 주세요. 상세 주소는 입력하지 마세요.</span></div>
    <button className="button" disabled={pending}>{pending ? "저장 중…" : "내 프로필 저장"}</button>
    <Feedback error={state.error} success={state.success} />
  </form>;
}
