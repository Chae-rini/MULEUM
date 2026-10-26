import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { AccountRole } from "@/lib/auth/policy";
import { allowedKinds, notificationLabels } from "@/lib/notifications/model";

export const metadata = { title: "앱 설치와 알림 안내 | 물음", description: "iPhone·Android·컴퓨터에서 물음을 앱처럼 설치하고 알림을 설정하는 방법" };

// Menu names follow the browsers' Korean help pages (checked 2026-10-24); they can shift between OS versions.
function Steps({ items }: { items: ReactNode[] }) {
  return <ol className="guide-steps">{items.map((item, index) => <li key={index}>{item}</li>)}</ol>;
}
function UI({ children }: { children: ReactNode }) {
  return <span className="ui-label">{children}</span>;
}

const contents = [
  ["ios", "iPhone · iPad", "Safari"],
  ["android", "Android", "Chrome · 삼성 인터넷"],
  ["computer", "컴퓨터", "Chrome · Edge · Mac Safari"],
  ["notifications", "알림", "종류 · 잠금 화면"],
  ["help", "문제 해결", "자주 묻는 질문"],
] as const;

const roleGroups: [string, AccountRole[]][] = [
  ["학생", ["student"]], ["선생님", ["teacher"]], ["학부모", ["parent"]], ["관리자 · 그 밖의 역할", ["administrator"]],
];

export default function AppGuidePage() {
  return <>
    <a className="skip-link" href="#main-content">본문으로 바로가기</a>
    <div className="site">
      <div className="header-bar"><div className="shell-container guide-header">
        <Link href="/" className="logo" aria-label="물음 홈"><Image className="brand-mark" src="/brand/muleum-icon-question.png" alt="" width={36} height={36} /><strong>물음<span className="brand-english">MULEUM</span></strong></Link>
        <Link href="/login" className="text-button">회원 로그인</Link>
      </div></div>

      <main id="main-content" tabIndex={-1} className="shell-container shell-main">
        <div className="page-heading"><p className="eyebrow">APP GUIDE</p><h1>물음을 앱처럼 쓰기</h1><p className="lead">홈 화면에 물음을 추가하면 앱처럼 바로 열 수 있어요. 내 기기를 골라 순서대로 따라 해 주세요.</p></div>

        <div className="guide-layout">
          <nav aria-label="안내 목차" className="guide-nav">
            <p className="guide-nav-title">목차</p>
            <ol>{contents.map(([id, label, detail]) => <li key={id}><a href={`#${id}`}><strong>{label}</strong><span>{detail}</span></a></li>)}</ol>
          </nav>

          <div className="guide-content">
            <section className="card guide-status" aria-labelledby="status-title">
              <h2 id="status-title">지금 쓸 수 있는 기능</h2>
              <ul>
                <li><span className="pill">지금 가능</span><p><strong>앱 설치</strong>홈 화면, Dock, 시작 메뉴에서 물음을 바로 열 수 있어요. 인터넷 연결은 계속 필요해요.</p></li>
                <li><span className="pill guide-soon">준비 중</span><p><strong>알림 받기</strong>질문 답변, 수업 알림은 베타 운영을 시작할 때 열려요. 그때 받고 싶은 알림만 직접 고를 수 있어요.</p></li>
              </ul>
            </section>

            <section id="ios" className="guide-section" aria-labelledby="ios-title">
              <p className="eyebrow">01 설치</p>
              <h2 id="ios-title">iPhone · iPad</h2>
              <p className="guide-intro"><UI>Safari</UI>에서 열어 주세요. 카카오톡처럼 다른 앱 안에서 열린 화면에서는 홈 화면에 추가할 수 없어요.</p>
              <div className="card">
                <Steps items={[
                  <>Safari에서 물음 주소를 열어요.</>,
                  <>화면 아래(iPad는 위쪽)의 <UI>공유</UI> 버튼을 눌러요. 네모 위로 화살표가 나온 모양이에요. 공유 버튼이 보이지 않으면 주소창 옆 <UI>⋯</UI> 버튼을 먼저 눌러요.</>,
                  <>목록을 내려 <UI>홈 화면에 추가</UI>를 눌러요.</>,
                  <><UI>웹 앱으로 열기</UI>가 보이면 켜 둔 채로 오른쪽 위 <UI>추가</UI>를 눌러요.</>,
                  <>홈 화면에 생긴 <strong>물음</strong> 아이콘을 눌러 열어요. Safari에서 로그인했더라도 여기서 한 번 더 로그인해야 할 수 있어요.</>,
                ]} />
              </div>
              <p className="note guide-note">알림은 <strong>iOS·iPadOS 16.4 이상</strong>에서, 홈 화면의 물음 아이콘으로 열었을 때만 받을 수 있어요. 메뉴 이름과 위치는 iOS 버전에 따라 조금 다를 수 있어요.</p>
            </section>

            <section id="android" className="guide-section" aria-labelledby="android-title">
              <p className="eyebrow">02 설치</p>
              <h2 id="android-title">Android 휴대폰 · 태블릿</h2>
              <p className="guide-intro">알림까지 쓰려면 <UI>Chrome</UI>에서 설치하는 방법을 권해요.</p>
              <div className="card"><h3>Chrome</h3>
                <Steps items={[
                  <>Chrome에서 물음 주소를 열어요.</>,
                  <>오른쪽 위 <UI>⋮</UI>(더보기)를 눌러요.</>,
                  <><UI>설치 및 바로가기 만들기</UI> → <UI>설치</UI>를 눌러요. Chrome 버전에 따라 <UI>앱 설치</UI>나 <UI>홈 화면에 추가</UI>로 보일 수 있어요.</>,
                  <>안내에 따라 설치하면 홈 화면과 앱 목록에 <strong>물음</strong>이 생겨요.</>,
                ]} />
              </div>
              <div className="card"><h3>삼성 인터넷</h3>
                <Steps items={[
                  <>삼성 인터넷에서 물음 주소를 열어요.</>,
                  <>아래쪽 <UI>≡</UI>(메뉴)를 눌러요.</>,
                  <><UI>현재 페이지 추가</UI> → <UI>홈 화면</UI>을 고르고 <UI>추가</UI>를 눌러요.</>,
                ]} />
                <p className="small guide-card-note">쉬운 사용 모드에서는 이 메뉴가 보이지 않을 수 있어요.</p>
              </div>
            </section>

            <section id="computer" className="guide-section" aria-labelledby="computer-title">
              <p className="eyebrow">03 설치</p>
              <h2 id="computer-title">컴퓨터 (Windows · Mac)</h2>
              <p className="guide-intro">설치하면 물음이 브라우저와 따로 떨어진 창으로 열려요.</p>
              <div className="card"><h3>Chrome</h3>
                <Steps items={[
                  <>주소창 오른쪽에 설치 아이콘이 보이면 눌러요.</>,
                  <>보이지 않으면 오른쪽 위 <UI>⋮</UI> → <UI>전송, 저장 및 공유</UI> → <UI>페이지를 앱으로 설치…</UI>를 눌러요.</>,
                  <><UI>설치</UI>를 누르면 끝이에요. 다음부터는 시작 메뉴(Windows)나 Launchpad(Mac)에서 열 수 있어요.</>,
                ]} />
              </div>
              <div className="card"><h3>Microsoft Edge</h3>
                <Steps items={[
                  <>주소창의 앱 설치 아이콘을 누르거나, 오른쪽 위 <UI>⋯</UI> → <UI>앱</UI> → <UI>이 사이트를 앱으로 설치</UI>를 눌러요.</>,
                  <><UI>설치</UI>를 눌러요. 설치한 앱은 <UI>edge://apps</UI>에서 관리해요.</>,
                ]} />
              </div>
              <div className="card"><h3>Mac Safari</h3>
                <Steps items={[
                  <>macOS Sonoma(14) 이상의 Safari에서 물음 주소를 열어요.</>,
                  <>메뉴 막대의 <UI>파일</UI> → <UI>Dock에 추가</UI>를 눌러요.</>,
                  <>이름과 아이콘을 확인하고 <UI>추가</UI>를 누르면 Dock에 물음이 생겨요.</>,
                ]} />
              </div>
            </section>

            <section id="notifications" className="guide-section" aria-labelledby="notifications-title">
              <p className="eyebrow">04 알림</p>
              <h2 id="notifications-title">알림 받기</h2>
              <p className="guide-intro">알림은 베타 운영을 시작할 때 열려요. 지금은 앱 설치까지만 해 두면 돼요.</p>
              <div className="card"><h3>이렇게 준비하고 있어요</h3>
                <ul className="guide-list">
                  <li>처음에는 모든 알림이 꺼져 있어요. 받고 싶은 종류만 직접 골라요.</li>
                  <li>밤 10시부터 아침 8시까지는 <strong>조용한 시간</strong>이에요. 이 시간에 생긴 알림은 기다렸다가 보내고, 시간은 바꿀 수 있어요.</li>
                  <li>iPhone·iPad는 <strong>iOS·iPadOS 16.4 이상</strong>에서, 홈 화면에 추가한 물음 아이콘으로 열어야 알림을 받을 수 있어요. 미리 설치해 두세요.</li>
                </ul>
              </div>
              <div className="card"><h3>역할별로 고를 수 있는 알림</h3>
                <dl className="guide-roles">{roleGroups.map(([label, roles]) => <div key={label}><dt>{label}</dt><dd><ul>{allowedKinds(roles).map(kind => <li key={kind}>{notificationLabels[kind]}</li>)}</ul></dd></div>)}</dl>
              </div>
              <div className="note guide-note"><strong>잠금 화면에는 내용이 보이지 않아요.</strong> 이름, 질문 제목과 내용, 일기 내용은 알림에 나오지 않아요. ‘새로운 답변이 있어요. 로그인 후 확인해 주세요.’처럼만 보이고, 누르면 물음이 열려요.</div>
            </section>

            <section id="help" className="guide-section" aria-labelledby="help-title">
              <p className="eyebrow">05 도움말</p>
              <h2 id="help-title">문제 해결</h2>
              <div className="guide-faq">
                <details><summary>설치 메뉴가 보이지 않아요</summary><div className="faq-body">
                  <p>카카오톡, 인스타그램처럼 다른 앱 안에서 링크를 열었다면 그 화면의 메뉴에서 <UI>다른 브라우저로 열기</UI>나 <UI>Safari로 열기</UI>를 눌러 주세요.</p>
                  <p className="mb-0">iPhone·iPad는 Safari, Android는 최신 Chrome에서 열어야 해요. 이미 설치되어 있으면 메뉴가 보이지 않을 수 있으니 홈 화면이나 앱 목록을 먼저 확인해 주세요.</p>
                </div></details>
                <details id="help-permission"><summary>알림 권한을 바꾸고 싶어요</summary><div className="faq-body">
                  <p>알림을 허용했거나 거부한 뒤에는 기기 설정에서 바꿀 수 있어요.</p>
                  <ul className="guide-list">
                    <li><strong>iPhone·iPad</strong> <UI>설정</UI> → <UI>알림</UI> → <UI>물음</UI>에서 알림 허용을 켜거나 꺼요.</li>
                    <li><strong>Android</strong> <UI>설정</UI> → <UI>애플리케이션</UI> → <UI>물음</UI>(또는 <UI>Chrome</UI>) → <UI>알림</UI>. 기기마다 메뉴 이름이 조금 달라요.</li>
                    <li><strong>컴퓨터 Chrome·Edge</strong> 주소창 왼쪽의 사이트 정보 아이콘 → <UI>알림</UI>을 허용이나 차단으로 바꿔요.</li>
                    <li><strong>Mac</strong> <UI>시스템 설정</UI> → <UI>알림</UI>에서 물음(또는 사용하는 브라우저)을 찾아 바꿔요.</li>
                  </ul>
                </div></details>
                <details><summary>알림이 오지 않아요</summary><div className="faq-body">
                  <ul className="guide-list">
                    <li>알림은 베타 운영을 시작할 때 열려요. 그 전에는 알림이 오지 않아요.</li>
                    <li>조용한 시간에 생긴 알림은 조용한 시간이 끝난 뒤에 와요.</li>
                    <li>집중 모드나 방해 금지 모드가 켜져 있으면 알림이 보이지 않아요.</li>
                    <li>iPhone·iPad는 홈 화면의 물음 아이콘으로 열어야 해요. Safari 탭에서는 알림을 받을 수 없어요.</li>
                  </ul>
                </div></details>
                <details><summary>다른 기기에서도 쓰고 싶어요</summary><div className="faq-body">
                  <p className="mb-0">설치와 알림 권한은 기기마다 따로예요. 새 기기에서도 이 안내대로 설치하고 알림을 허용해 주세요. 여럿이 함께 쓰는 컴퓨터에는 설치하지 말고, 쓰고 나면 꼭 로그아웃해 주세요.</p>
                </div></details>
                <details><summary>설치한 앱을 지우고 싶어요</summary><div className="faq-body">
                  <ul className="guide-list">
                    <li><strong>휴대폰·태블릿</strong> 물음 아이콘을 길게 눌러 나오는 메뉴에서 삭제(제거)를 골라요.</li>
                    <li><strong>Chrome·Edge</strong> 물음 창 오른쪽 위 메뉴에서 제거해요. Edge는 <UI>edge://apps</UI>에서도 지울 수 있어요.</li>
                    <li><strong>Mac Safari</strong> Dock에서 아이콘을 빼도 앱은 남아 있어요. Finder의 홈 폴더 → <UI>응용 프로그램</UI>에서 물음을 휴지통으로 옮겨 주세요.</li>
                  </ul>
                </div></details>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="site-footer"><div className="shell-container public-footer"><span>모든 배움은 하나의 질문에서 시작된다.</span><Link href="/">물음 소개 ↗</Link></div></footer>
    </div>
  </>;
}
