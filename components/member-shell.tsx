"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { defaultPreviewRole, roleHome, roleLabels, sectionDefinitions, sectionFromPath, type MemberRole, type Section } from "@/lib/platform";
import { Navigation } from "./navigation";
import { CommunityProvider } from "./community-provider";

const PreviewContext = createContext<{ role: MemberRole; go: (section: Section) => void } | null>(null);

export function useMemberPreview() {
  const value = useContext(PreviewContext);
  if (!value) throw new Error("Member preview requires MemberShell");
  return value;
}

export function MemberShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<MemberRole>(() => defaultPreviewRole(pathname));
  const previousPath = useRef(pathname);
  const current = sectionFromPath(pathname);
  const links = Object.entries(sectionDefinitions)
    .filter(([key, item]) => key !== "register" && item.roles.includes(role) && (role !== "alumni" || key === "profile"))
    .map(([page, item]) => ({ page, label: item.label, icon: item.icon, href: item.path }));

  useEffect(() => {
    if (previousPath.current !== pathname) {
      document.getElementById("main-content")?.focus();
      previousPath.current = pathname;
    }
  }, [pathname]);

  function go(section: Section) { router.push(sectionDefinitions[section].path); }

  return (
    <PreviewContext.Provider value={{ role, go }}><CommunityProvider>
      <a className="skip-link" href="#main-content">본문으로 바로가기</a>
      <div className="app" data-member-role={role}><div className="workspace">
        <Navigation links={links} current={current ?? ""} brandHref="/app">
          <div className="role-control">
            <label htmlFor="role">화면 역할 미리보기</label>
            <select id="role" value={role} onChange={(event) => {
              const next = event.target.value as MemberRole;
              setRole(next);
              go(roleHome(next));
            }}>
              <optgroup label="기본 계정 유형">{Object.entries(roleLabels).filter(([value])=>!["assistant","operator"].includes(value)).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</optgroup>
              <optgroup label="별도 승인 활동 권한">{Object.entries(roleLabels).filter(([value])=>["assistant","operator"].includes(value)).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</optgroup>
            </select>
          </div>
        </Navigation>
        <div className="preview-banner">
          <div><strong>회원 공간 · 가상 데이터 시연</strong><p>초대제 서비스의 화면을 살펴보는 공간이에요. 로그인·서버 권한은 아직 연결되지 않았어요.</p></div>
          <Link href="/">물음 소개 ↗</Link>
        </div>
        <main id="main-content" tabIndex={-1}>{children}</main>
        <footer className="demo-warning"><span className="demo-dot" aria-hidden="true" /><p><strong>실제 회원 서비스가 아닌 로컬 시제품</strong><br />기록은 이 브라우저에만 저장돼요. 역할 선택은 접근 권한이 아니에요. 실제 학생 개인정보나 민감한 일기는 입력하지 마세요. 인증·초대·데이터베이스 보안 검증 전에는 실제 베타를 시작하지 않아요.</p></footer>
      </div></div>
    </CommunityProvider></PreviewContext.Provider>
  );
}
