import Link from "next/link";
import { notFound } from "next/navigation";
import { requireIdentity } from "@/lib/auth/server";
import { canOpenRole, isAccountRole, accountRoleLabels } from "@/lib/auth/policy";
import { homeContent } from "@/lib/auth/home-content";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { Card, Heading } from "@/components/ui";
import { canUseQuestions } from "@/lib/questions/model";

export const metadata = { title: "나의 배움 공간 | 물음", robots: { index: false, follow: false } };
export default async function RoleHome({ params }: { params: Promise<{ role: string }> }) {
  const identity = await requireIdentity();
  const { role } = await params;
  if (!isAccountRole(role)) notFound();
  if (!canOpenRole(identity, role)) return <AuthenticatedShell identity={identity} current=""><Heading eyebrow="ACCESS RESTRICTED" title="이 공간에 접근할 권한이 없어요." description="계정에 승인된 역할의 공간만 열 수 있어요." /><Link className="button" href="/mypage">내 승인 역할 확인하기</Link></AuthenticatedShell>;
  const content = homeContent[role];
  return <AuthenticatedShell identity={identity} current={role}>
    <Heading eyebrow={`${accountRoleLabels[role]} · MY LEARNING SPACE`} title={content.title} description={content.description} />
    {canUseQuestions(identity) && (role === "student" || role === "teacher") && <p><Link className="button" href="/member/questions">질문과 대화 열기 ↗</Link></p>}
    <div className="member-welcome"><div><span className="pill">{accountRoleLabels[role]} 계정</span><h2>나의 배움과 연결을 한곳에서</h2><p>계정 정보와 승인된 역할은 마이페이지에서 확인할 수 있어요.</p></div><Link className="button" href="/mypage">마이페이지 ↗</Link></div>
    <div className="member-card-grid">{content.cards.map(card => <Card key={card.title}><h2>{card.title}</h2><p className="muted">{card.text}</p>{identity.mode === "demo" ? <Link className="text-button" href={`/app/${card.preview}`}>가상 기능 시연 열기 ↗</Link> : <p className="empty">회원 데이터 연결 준비 중이에요. 이곳에는 실제 학습 기록을 아직 불러오지 않아요.</p>}</Card>)}</div>
    {identity.mode === "demo" && <p className="note mt-5">기능 시연은 별도 공간이에요. 기존 시연 기록은 로그인 계정의 기록이 아니며, 계정 간 공유하거나 옮기지 않아요.</p>}
  </AuthenticatedShell>;
}
