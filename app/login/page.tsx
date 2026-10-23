import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { currentIdentity } from "@/lib/auth/server";
import { authConfig, demoEnabled } from "@/lib/auth/supabase";
import { accountRoleLabels, demoRoles, memberHome } from "@/lib/auth/policy";
import { demoLogin } from "./actions";

export const metadata = { title: "로그인 | 물음", robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ logout?: string }> }) {
  const identity = await currentIdentity();
  if (identity) redirect(memberHome(identity));
  const params = await searchParams;
  const enabled = !!authConfig(process.env);
  return <main className="auth-page" id="main-content">
    <Link href="/" className="text-button">← 물음 소개</Link>
    <div className="auth-intro"><Image src="/brand/muleum-icon-blue.png" alt="물음" width={100} height={100} priority /><p className="eyebrow">WELCOME TO MULEUM</p><h1>나의 배움 공간으로</h1><p className="muted">질문으로 만나고, 함께 자라는 물음.</p></div>
    {params.logout === "done" && <p className="notice success" role="status">로그아웃했어요.</p>}
    {params.logout === "local" && <p className="notice warning" role="status">이 브라우저에서는 로그아웃했어요. 인증 서버의 세션 종료는 확인하지 못했어요.</p>}
    <section className="card"><h2>초대 회원 로그인</h2><LoginForm enabled={enabled} /><p className="small">공개 회원가입은 열리지 않았어요. 초대 수락·비밀번호 재설정 화면은 준비 중이에요.</p></section>
    {demoEnabled(process.env) && <section className="card auth-demo"><h2>가상 계정으로 체험하기</h2><p className="muted">실제 계정이 필요 없어요. 선택한 역할의 홈과 마이페이지를 살펴보세요. 실제 인증과 분리된 개발용 체험이에요.</p><div className="demo-account-grid">{demoRoles.map(role => <form action={demoLogin} key={role}><input type="hidden" name="role" value={role} /><button className="button line w-full" type="submit">{accountRoleLabels[role]} 체험 시작</button></form>)}</div></section>}
    <Link href="/app" className="text-button">기존 학습 기능 시연 둘러보기 ↗</Link>
  </main>;
}
