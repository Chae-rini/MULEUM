import Link from "next/link";
import type { ReactNode } from "react";
import { accountRoleLabels, memberHome, type Identity } from "@/lib/auth/policy";
import { Navigation } from "./navigation";
import { LogoutButton } from "./pwa/logout-button";
import { canUseQuestions } from "@/lib/questions/model";

export function AuthenticatedShell({ identity, current, children }: { identity: Identity; current: string; children: ReactNode }) {
  const links = [...identity.roles.map(role => ({ page: role, label: `${accountRoleLabels[role]} 홈`, icon: "⌂", href: `/member/${role}` })), { page: "mypage", label: "마이페이지", icon: "○", href: "/mypage" }];
  if (canUseQuestions(identity)) links.splice(links.length - 1, 0, { page: "questions", label: "질문과 대화", icon: "?", href: "/member/questions" });
  if (identity.roles.includes("administrator")) links.splice(links.length - 1, 0, { page: "invitations", label: "초대와 동의", icon: "○", href: "/member/invitations" });
  return <><a className="skip-link" href="#main-content">본문으로 바로가기</a><div className="site" data-member-role={current}>
    <div className="header-bar"><div className="shell-container">
      <Navigation links={links} current={current} brandHref={memberHome(identity)}><LogoutButton /></Navigation>
    </div></div>
    {identity.mode === "demo" && <div className="preview-banner"><div className="shell-container preview-banner-inner"><div><strong>가상 계정 로그인 체험</strong><p>실제 학생 정보 없이 역할별 화면을 확인하는 개발용 공간이에요.</p></div><Link href="/app">기존 기능 시연 ↗</Link></div></div>}
    <main id="main-content" tabIndex={-1} className="shell-container shell-main">{children}</main>
    <footer className="site-footer"><div className="shell-container public-footer"><span>나의 속도로, 함께 배우는 물음.</span><Link href="/">물음 소개 ↗</Link></div></footer>
  </div></>;
}
