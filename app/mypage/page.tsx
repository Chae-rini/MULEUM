import Link from "next/link";
import { requireIdentity, currentProfile } from "@/lib/auth/server";
import { accountRoleLabels } from "@/lib/auth/policy";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { Card, Heading } from "@/components/ui";
import { OwnProfileForm } from "@/components/login-form";

export const metadata = { title: "마이페이지 | 물음", robots: { index: false, follow: false } };
export default async function MyPage() {
  const identity = await requireIdentity();
  const profile = await currentProfile(identity);
  return <AuthenticatedShell identity={identity} current="mypage">
    <Heading eyebrow="MY PAGE" title="마이페이지" description="내 정보와 나에게 승인된 역할을 확인해요." />
    <p><Link className="button line" href="/guide/app">앱 설치와 알림 안내 ↗</Link></p>
    <div className="content-grid"><Card><h2>내 기본 정보</h2>{profile ? <><dl className="detail-list"><dt>성명</dt><dd>{profile.full_name}</dd><dt>생년월일</dt><dd>{profile.birth_date}</dd><dt>거주 지역</dt><dd>{profile.residence_region}</dd></dl>{identity.mode === "supabase" ? <OwnProfileForm profile={profile} /> : <><p className="small">위 정보는 체험용 가상 정보예요. 실제 개인정보를 입력하지 마세요.</p><Link href="/app/profile" className="text-button">별도 프로필 편집 시연 ↗</Link></>}</> : <p className="notice warning" role="status">프로필을 불러오지 못했어요. 잠시 후 새로고침하거나 담당자에게 문의해 주세요.</p>}</Card>
    <Card><h2>내 역할과 이용 상태</h2><dl className="detail-list"><dt>계정 상태</dt><dd>활성</dd><dt>재학·졸업 상태</dt><dd>{identity.enrollment === "active" ? "재학" : identity.enrollment === "alumni" ? "졸업" : "해당 없음"}</dd><dt>승인된 역할</dt><dd className="action-row">{identity.roles.map(role => <Link key={role} className="button line" href={`/member/${role}`}>{accountRoleLabels[role]} 홈</Link>)}</dd></dl><p className="note">역할은 직접 추가하거나 바꿀 수 없어요. 여러 역할을 승인받은 계정은 위 링크로 각 공간을 이용할 수 있어요.</p><p className="small mt-4">성별은 선택 정보이며 이 화면에서는 조회하지 않아요. 역할이나 연령 판단에 사용하지 않아요. 생년월일 변경·탈퇴 요청·비밀번호 재설정은 별도 절차를 준비 중이에요.</p></Card></div>
  </AuthenticatedShell>;
}
