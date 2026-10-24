import Image from "next/image";
import Link from "next/link";
import { authConfig } from "@/lib/auth/supabase";
import { siteOrigin } from "@/lib/auth/oauth";
import { isInviteToken } from "@/lib/auth/invitations";

// The token is a credential: keep it out of search engines and outgoing Referer headers.
export const metadata = { title: "초대 | 물음", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = isInviteToken(token);
  const enabled = !!authConfig(process.env) && !!siteOrigin(process.env);
  return <main className="auth-page" id="main-content">
    <Link href="/" className="text-button">← 물음 소개</Link>
    <div className="auth-intro"><Image src="/brand/muleum-icon-blue.png" alt="물음" width={100} height={100} priority /><p className="eyebrow">YOU ARE INVITED</p><h1>물음에 초대받았어요</h1><p className="muted">질문으로 만나고, 함께 자라는 물음.</p></div>
    <section className="card"><h2>초대받은 구글 계정으로 시작하기</h2>
      {!valid ? <p className="notice error" role="alert">올바르지 않은 초대 링크예요. 관리자에게 받은 링크를 그대로 열어 주세요.</p> : <>
        <p>관리자가 초대한 구글 계정으로 로그인하면 가입이 끝나요. 별도의 회원가입 양식은 없어요.</p>
        {enabled ? <a className="button w-full" href={`/auth/google?invite=${token}`}>Google로 계속하기</a> : <button className="button w-full" type="button" disabled>Google로 계속하기</button>}
        <p className="small mt-4 mb-0">처음 로그인하면 이름·생년월일·거주 지역(시·군·구)과 개인정보 동의를 한 번 확인해요. 만 15세 이상만 가입할 수 있고, 만 19세 미만은 보호자 동의를 확인한 뒤 이용할 수 있어요.{!enabled && " 지금은 Supabase·Google 개발 환경이 연결되지 않아 실제 로그인이 닫혀 있어요."}</p>
      </>}
    </section>
  </main>;
}
