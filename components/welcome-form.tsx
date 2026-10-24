"use client";
import { useActionState } from "react";
import { completeOnboarding } from "@/app/welcome/actions";
import { Feedback } from "./ui";

export function WelcomeForm() {
  const [state, action, pending] = useActionState(completeOnboarding, {});
  return <form action={action}>
    <div className="field"><label htmlFor="full_name">이름</label><input id="full_name" name="full_name" type="text" required maxLength={80} autoComplete="name" /></div>
    <div className="field"><label htmlFor="birth_date">생년월일</label><input id="birth_date" name="birth_date" type="date" required aria-describedby="birth-help" /><span id="birth-help" className="hint">만 15세 이상만 가입할 수 있어요. 만 19세 미만은 보호자 동의를 확인한 뒤 이용할 수 있어요.</span></div>
    <div className="field"><label htmlFor="residence_region">거주 지역</label><input id="residence_region" name="residence_region" type="text" required maxLength={80} aria-describedby="region-help" /><span id="region-help" className="hint">시·군·구까지만 입력해 주세요. 상세 주소는 받지 않아요.</span></div>
    <label className="check-row"><input type="checkbox" name="privacy_consent" required /><span>수업과 학습 기록 관리를 위해 이름·생년월일·거주 지역·구글 이메일을 수집·이용하는 데 동의해요.</span></label>
    <button className="button w-full mt-4" disabled={pending}>{pending ? "확인하는 중…" : "가입 마치기"}</button>
    <Feedback error={state.error} />
  </form>;
}
