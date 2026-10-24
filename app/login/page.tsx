import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentIdentity } from "@/lib/auth/server";
import { authConfig, demoEnabled } from "@/lib/auth/supabase";
import { siteOrigin } from "@/lib/auth/oauth";
import { invitationErrorMessages } from "@/lib/auth/invitations";
import { accountRoleLabels, demoRoles, memberHome } from "@/lib/auth/policy";
import { demoLogin } from "./actions";

export const metadata = { title: "로그인 | 물음", robots: { index: false, follow: false } };

const errorMessages: Record<string, string> = {
  "not-invited": "초대받지 않은 구글 계정이에요. 처음이라면 관리자가 보낸 초대 링크로 들어와 주세요.",
  "invite-email": invitationErrorMessages.MUL01,
  invite: invitationErrorMessages.MUL02,
  "invite-provider": invitationErrorMessages.MUL06,
  suspended: "이용이 중지된 계정이에요. 관리자에게 문의해 주세요.",
  state: "로그인을 마치지 못했어요. 처음부터 다시 시도해 주세요.",
  unavailable: "실제 로그인이 아직 설정되지 않았어요.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ logout?: string; error?: string }> }) {
  const identity = await currentIdentity();
  if (identity) redirect(memberHome(identity));
  const params = await searchParams;
  const enabled = !!authConfig(process.env) && !!siteOrigin(process.env);
  const error = params.error && Object.hasOwn(errorMessages, params.error) ? errorMessages[params.error] : null;
  return <main className="auth-page" id="main-content">
    <Link href="/" className="text-button">← 물음 소개</Link>
    <div className="auth-intro"><Image src="/brand/muleum-icon-blue.png" alt="물음" width={100} height={100} priority /><p className="eyebrow">WELCOME TO MULEUM</p><h1>나의 배움 공간으로</h1><p className="muted">질문으로 만나고, 함께 자라는 물음.</p></div>
    {params.logout === "done" && <p className="notice success" role="status">로그아웃했어요.</p>}
    {params.logout === "push-unconfirmed" && <p className="notice warning" role="status">로그아웃했지만 알림 구독 해제를 확인하지 못했어요. 브라우저 또는 기기 설정에서 물음의 알림을 꺼 주세요.</p>}
    {params.logout === "local" && <p className="notice warning" role="status">이 브라우저에서는 로그아웃했어요. 인증 서버의 세션 종료는 확인하지 못했어요.</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
    <section className="card"><h2>초대 회원 로그인</h2>
      {enabled ? <a className="button w-full" href="/auth/google">Google로 계속하기</a> : <button className="button w-full" type="button" disabled>Google로 계속하기</button>}
      <p className="small mt-4 mb-0">별도의 회원가입은 없어요. 처음이라면 관리자가 보낸 초대 링크로 들어와 초대받은 구글 계정으로 로그인해 주세요.{!enabled && " 지금은 Supabase·Google 개발 환경이 연결되지 않아 실제 로그인이 닫혀 있어요."}</p>
    </section>
    {demoEnabled(process.env) && <section className="card auth-demo"><h2>가상 계정으로 체험하기</h2><p className="muted">실제 계정이 필요 없어요. 선택한 역할의 홈과 마이페이지를 살펴보세요. 실제 인증과 분리된 개발용 체험이에요.</p><div className="demo-account-grid">{demoRoles.map(role => <form action={demoLogin} key={role}><input type="hidden" name="role" value={role} /><button className="button line w-full" type="submit">{accountRoleLabels[role]} 체험 시작</button></form>)}</div></section>}
    <Link href="/app" className="text-button">기존 학습 기능 시연 둘러보기 ↗</Link>
  </main>;
}
