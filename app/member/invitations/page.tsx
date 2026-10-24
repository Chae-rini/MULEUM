import { currentSession, requireIdentity } from "@/lib/auth/server";
import { rpc } from "@/lib/auth/supabase";
import { invitableRoles } from "@/lib/auth/invitations";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { Card, Empty, Heading } from "@/components/ui";
import { ConsentForm, InviteForm } from "@/components/invitations/forms";
import { revokeInvite } from "./actions";

export const metadata = { title: "초대와 보호자 동의 | 물음", robots: { index: false, follow: false } };

interface Invitation { id: string; invited_email: string; role: string; teacher_name: string | null; expires_at: string; accepted_at: string | null; revoked_at: string | null }
interface PendingConsent { user_id: string; full_name: string; age: number; invited_email: string; role: string; completed_at: string }
interface Teacher { user_id: string; full_name: string }

function invitationState(item: Invitation, now: number) {
  if (item.accepted_at) return "가입함";
  if (item.revoked_at) return "취소됨";
  if (Date.parse(item.expires_at) <= now) return "만료";
  return `대기 · ${item.expires_at.slice(0, 10)}까지`;
}

export default async function InvitationsPage({ searchParams }: { searchParams: Promise<{ confirmed?: string }> }) {
  const identity = await requireIdentity();
  const confirmed = (await searchParams).confirmed === "1";
  if (!identity.roles.includes("administrator")) return <AuthenticatedShell identity={identity} current="invitations"><Heading eyebrow="ACCESS RESTRICTED" title="이 공간에 접근할 권한이 없어요." description="관리자만 초대와 보호자 동의를 관리할 수 있어요." /></AuthenticatedShell>;
  const session = identity.mode === "supabase" ? await currentSession() : null;
  let data: { invitations: Invitation[]; pending: PendingConsent[]; teachers: Teacher[] } | null = null;
  if (session) {
    try {
      const [invitations, pending, teachers] = await Promise.all([
        rpc<Invitation[]>(session.config, session.token, "list_invitations", {}),
        rpc<PendingConsent[]>(session.config, session.token, "pending_guardian_consents", {}),
        rpc<Teacher[]>(session.config, session.token, "active_teachers", {}),
      ]);
      data = { invitations, pending, teachers };
    } catch { data = null; }
  }
  const now = Date.now();
  return <AuthenticatedShell identity={identity} current="invitations">
    <Heading eyebrow="INVITATIONS & CONSENT" title="초대와 보호자 동의" description="초대받은 구글 계정만 가입할 수 있어요. 만 19세 미만은 보호자 동의를 확인해야 활성화돼요." />
    {confirmed && session && <p className="notice success mb-6" role="status">보호자 동의를 기록하고 계정을 활성화했어요.</p>}
    {!session ? <Card><h2>실제 회원 공간에 연결할 수 없어요.</h2><p className="mb-0">초대 링크 발급과 보호자 동의 확인은 Supabase·Google 연결을 마친 실제 관리자 계정에서만 쓸 수 있어요. 가상 체험 계정은 이 기능에 연결되지 않아요.</p></Card>
      : !data ? <p className="notice error" role="alert">초대 정보를 불러오지 못했어요. 연결 상태와 DB 설정을 확인한 뒤 새로고침해 주세요.</p>
      : <div className="content-grid">
        <div className="stack">
          <Card><h2>새 초대 링크</h2><InviteForm roles={Object.entries(invitableRoles)} teachers={data.teachers} /></Card>
          <Card><h2>최근 초대</h2>{!data.invitations.length ? <Empty>아직 만든 초대가 없어요.</Empty> : <div className="question-list">{data.invitations.map(item => <article className="question-item" key={item.id}>
            <span className="pill">{invitationState(item, now)}</span>
            <h3 className="mt-3">{item.invited_email}</h3>
            <p className="small mb-0">{invitableRoles[item.role as keyof typeof invitableRoles] ?? item.role}{item.teacher_name ? ` · 담당 ${item.teacher_name}` : ""}</p>
            {!item.accepted_at && !item.revoked_at && Date.parse(item.expires_at) > now && <form action={revokeInvite} className="mt-3"><input type="hidden" name="id" value={item.id} /><button className="button line">초대 취소</button></form>}
          </article>)}</div>}</Card>
        </div>
        <Card><h2>보호자 동의 대기</h2>{!data.pending.length ? <Empty>보호자 동의를 기다리는 회원이 없어요.</Empty> : <div className="question-list">{data.pending.map(item => <article className="question-item" key={item.user_id}>
          <h3>{item.full_name} · 만 {item.age}세</h3>
          <p className="small">{item.invited_email} · {invitableRoles[item.role as keyof typeof invitableRoles] ?? item.role} · {item.completed_at.slice(0, 10)} 정보 입력</p>
          <ConsentForm userId={item.user_id} name={item.full_name} />
        </article>)}</div>}<p className="note mt-4 mb-0">보호자와 통화하거나 동의서를 받은 뒤, 확인한 방법과 날짜를 남겨 주세요. 기록은 감사 기록과 함께 보관돼요.</p></Card>
      </div>}
  </AuthenticatedShell>;
}
