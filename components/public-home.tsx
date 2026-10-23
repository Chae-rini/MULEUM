import Link from "next/link";
import Image from "next/image";
import { Navigation } from "./navigation";
import { Icon } from "./icon";

const links = [
  { page: "philosophy", label: "물음의 철학", icon: "?", href: "#philosophy" },
  { page: "learning", label: "배움의 방식", icon: "◎", href: "#learning" },
  { page: "community", label: "함께하는 사람들", icon: "♡", href: "#community" },
  { page: "beta", label: "비공개 베타 안내", icon: "↗", href: "#beta" },
];

const lesson = [
  ["한 주의 리뷰", 5, "일상과 생각을 먼저 들어요."],
  ["독서", 10, "새로운 관점과 만나요."],
  ["영단어 학습", 10, "수준에 맞게 인출을 연습해요."],
  ["핵심 수업", 55, "개념과 원리를 함께 탐구해요."],
  ["휴식", 5, "잠시 눈과 몸을 쉬어요."],
  ["독립 문제풀이", 25, "스스로 시도하고 적용해요."],
  ["오늘의 리뷰", 10, "질문과 다음 걸음을 남겨요."],
] as const;

export function PublicHome() {
  return <>
    <a className="skip-link" href="#public-content">본문으로 바로가기</a>
    <div className="app public-app"><div className="workspace">
      <Navigation links={links} current=""><Link href="/login" className="button line public-entry">로그인 ↗</Link></Navigation>
      <main id="public-content">
        <section className="public-hero" aria-labelledby="public-title">
          <div className="public-hero-copy">
            <p className="eyebrow">MULEUM · A PLACE FOR THOUGHT</p>
            <h1 id="public-title">배움이 머무는 곳,<br /><em>질문이 시작되는 곳.</em></h1>
            <p className="public-lead">조용한 도서관처럼 깊이 생각하고, 편안한 스터디카페처럼 서로의 이야기를 나누는 공간. 물음은 사람과 사람이 함께 배우는 교육 공동체입니다.</p>
            <div className="public-actions"><Link className="button" href="/login">나의 배움 공간으로 <Icon name="arrow-up-right" /></Link><Link className="text-button" href="/app">배움 공간 둘러보기 ↗</Link></div>
            <p className="official-slogan">모든 배움은 하나의 질문에서 시작된다.</p>
          </div>
          <figure className="library-hero-photo">
            <Image src="/brand/library-concept.png" width={1536} height={1024} sizes="(max-width: 690px) 100vw, 55vw" alt="자연광과 하늘색 의자가 어우러진 질문의 도서관 콘셉트 이미지" priority />
            <figcaption><span>브랜드 분위기를 위한 참고 이미지 · 물음 운영 시설 아님</span><span>사용자 제공 브랜드 콘셉트 이미지</span></figcaption>
          </figure>
        </section>

        <section id="philosophy" className="public-section">
          <div className="public-section-heading"><p className="eyebrow">01 / WHAT WE BELIEVE</p><h2>잘 해내는 사람보다,<br />스스로 선택하는 사람으로.</h2><p>성적은 중요한 도구지만 사람의 가치를 결정하지 않아요.<br />물음은 학생마다 다른 속도와 삶의 방향을 존중해요.</p></div>
          <div className="values-grid">{[
            ["01", "질문할 자유", "왜, 어떻게, 정말 그런가. 공부와 일상의 모든 궁금증을 환영해요. 아직 답을 찾지 못해도 괜찮아요."],
            ["02", "선택할 권리", "꿈이나 성공의 기준을 대신 정하지 않아요. 작은 목표부터 자신의 말로 선택하고 돌아봐요."],
            ["03", "관계 속의 배움", "독서와 대화, 다양한 경험으로 서로의 관점을 넓혀요. 선생님도 배우는 공동체의 한 사람이에요."],
          ].map(([number, title, description]) => <article className="value-card" key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
        </section>

        <section id="learning" className="public-section learning-section">
          <div className="public-section-heading"><p className="eyebrow">02 / A SPACE TO THINK</p><h2>듣고, 읽고, 스스로 풀어보는<br />120분의 배움.</h2><p>하나의 수업 기본안이에요. 학생과 선생님, 과목에 따라<br />순서와 시간을 함께 조정할 수 있도록 발전시켜요.</p><div className="note">독서와 어휘의 분량을 모두에게 똑같이 강요하지 않아요. 현재 시연 체크리스트는 기본형이며, 개별 편집 기능은 다음 단계예요.</div></div>
          <ol className="public-lesson">{lesson.map(([title, minutes, description], index) => <li key={title}><span className="lesson-number">0{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div><span className="lesson-duration">{minutes}<small>분</small></span></li>)}</ol>
        </section>

        <section id="community" className="public-section">
          <div className="public-section-heading"><p className="eyebrow">03 / PEOPLE BEFORE TECHNOLOGY</p><h2>배움의 중심에는<br />언제나 사람이 있어요.</h2><p>학생·선생님·학부모가 신뢰로 연결되고,<br />수업을 마친 뒤에도 원한다면 배움을 나눌 수 있어요.</p></div>
          <div className="people-grid">{[
            ["학생", "나의 질문과 선택", "나의 물음, 작은 목표, 선택적인 5분 일기. 내 생각을 내 언어로 기록하는 공간이에요."],
            ["선생님", "함께 탐구하는 동료", "학생의 생각을 먼저 듣고 피드백해요. 교육팀은 교수법과 비식별 경험을 함께 연구해요."],
            ["학부모", "신뢰로 지켜보는 성장", "공유에 동의하고 승인한 학습 리포트로 배움의 방향을 나눠요. 일기 원문은 공유하지 않아요."],
            ["졸업 이후", "계정과 기록의 경계", "졸업 상태는 계정에 유지해요. 향후 별도 공동체를 운영하더라도 학습 기록을 자동으로 옮기지 않아요."],
          ].map(([label, title, text]) => <article className="card" key={label}><span className="pill">{label}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
          <div className="human-note"><Icon name="lightbulb" /><div><h3>AI는 사람을 돕는 도구예요.</h3><p>질문게시판의 답변은 사람이 중심이에요. AI는 자료 정리와 운영을 보조할 수 있지만, 생각이나 관계를 대신하지 않아요. 비공개 일기를 자동 분석하거나 외부 AI에 보내지 않아요.</p></div></div>
        </section>

        <section id="contents" className="public-section"><div className="public-section-heading"><p className="eyebrow">MULEUM OFFICIAL CONTENTS</p><h2>함께 나누는 배움의 이야기</h2><p>물음 공식 YouTube 채널에서 공개 교육 콘텐츠를 준비해요.</p></div><div className="filter-row">{["학습법","진로·삶","공개 Q&A","독서·토론","교육철학"].map(category=><span className="pill" key={category}>{category}</span>)}</div><p className="empty">아직 공개 승인과 공식 채널 확인을 마친 실제 영상이 없어요. 가상 영상이나 학생 전용 자료는 이곳에 소개하지 않아요.</p></section>
        <section id="beta" className="public-beta">
          <p className="eyebrow">A SMALL, TRUSTED BEGINNING</p><h2>작게 시작하고,<br />신뢰를 쌓으며 함께 자라요.</h2><p>물음은 초대 기반 비공개 운영을 준비 중이에요.<br />지금은 가상 데이터로 구성한 시연 공간만 살펴볼 수 있어요.<br />실제 회원가입과 베타 참여 신청은 아직 열리지 않았어요.</p><Link className="button" href="/app">회원 공간 시연 살펴보기 ↗</Link>
        </section>
      </main>
      <footer className="public-footer"><div><strong>물음 · MULEUM</strong><p>모든 배움은 하나의 질문에서 시작된다.</p></div><a href="#public-title">위로 돌아가기 ↑</a></footer>
    </div></div>
  </>;
}
