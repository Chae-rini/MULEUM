"use client";
import { useActionState } from "react";
import { saveProfile } from "@/app/login/actions";
import { Feedback } from "./ui";
import type { OwnProfile } from "@/lib/auth/supabase";

export function OwnProfileForm({ profile }: { profile: OwnProfile }) {
  const [state, action, pending] = useActionState(saveProfile, {});
  return <form action={action}>
    <div className="field"><label htmlFor="full_name">성명</label><input id="full_name" name="full_name" type="text" defaultValue={profile.full_name} required maxLength={80} /></div>
    <div className="field"><label htmlFor="residence_region">거주 지역</label><input id="residence_region" name="residence_region" type="text" defaultValue={profile.residence_region} required maxLength={80} aria-describedby="region-help" /><span id="region-help" className="hint">시·군·구까지만 입력해 주세요. 상세 주소는 입력하지 마세요.</span></div>
    <button className="button" disabled={pending}>{pending ? "저장 중…" : "내 프로필 저장"}</button>
    <Feedback error={state.error} success={state.success} />
  </form>;
}
