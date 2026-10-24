import Image from "next/image";
import { CloudIsland, Sparkle } from "@/components/sky";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/server";
import { onboardingStatus, resolveIdentity, type OnboardingStatus } from "@/lib/auth/supabase";
import { memberHome } from "@/lib/auth/policy";
import { WelcomeForm } from "@/components/welcome-form";
import { LogoutButton } from "@/components/pwa/logout-button";

export const metadata = { title: "처음 오셨군요 | 물음", robots: { index: false, follow: false } };

export default async function WelcomePage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  let status: OnboardingStatus | "error";
  try { status = await onboardingStatus(session.config, session.token); } catch { status = "error"; }
  if (status === "active") {
    const identity = await resolveIdentity(session.config, session.token).catch(() => null);
    redirect(identity ? memberHome(identity) : "/login?error=state");
  }
  if (status === "not_member") redirect("/login?error=not-invited");
  if (status === "suspended") redirect("/login?error=suspended");
  const waiting = status === "waiting_guardian" || status === "pending";
  return <main className="auth-page" id="main-content">
    <div className="auth-intro"><CloudIsland /><Image src="/brand/muleum-icon-sky.png" alt="물음" width={100} height={100} priority /><p className="eyebrow"><Sparkle />WELCOME TO MULEUM</p><h1>{waiting ? "보호자 동의를 확인하고 있어요" : "처음 오셨군요"}</h1><p className="muted">{waiting ? "확인이 끝나면 바로 물음을 이용할 수 있어요." : "한 번만 확인하면 가입이 끝나요."}</p></div>
    {status === "error" && <p className="notice error" role="alert">가입 상태를 불러오지 못했어요. 잠시 후 새로고침해 주세요.</p>}
    {status === "needs_profile" && <section className="card"><h2>기본 정보와 동의</h2><WelcomeForm /></section>}
    {waiting && <section className="card"><h2>보호자 동의 대기</h2><p>만 19세 미만 회원은 보호자의 동의를 관리자가 확인한 뒤 이용할 수 있어요. 담당 선생님이나 관리자가 보호자께 연락드릴 거예요.</p><p className="small">확인이 끝난 뒤 다시 로그인하면 나의 배움 공간이 열려요.</p><LogoutButton /></section>}
  </main>;
}
