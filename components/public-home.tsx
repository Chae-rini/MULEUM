import Link from "next/link";
import { Navigation } from "./navigation";
import { Icon } from "./icon";
import { NightSky, Sparkle } from "./sky";
import styles from "./public-home.module.css";

const links = [
  { page: "why", label: "왜 물음인가", icon: "?", href: "#why" },
  { page: "how", label: "배움의 방식", icon: "◎", href: "#how" },
  { page: "believe", label: "물음의 철학", icon: "✳", href: "#believe" },
  { page: "people", label: "함께하는 사람들", icon: "♡", href: "#people" },
];

const facts = [
  ["대상", "중·고등학생", "고등학생 중심"],
  ["운영 방식", "초대제 소수 과외", "대면·비대면"],
  ["하루의 물음", "질문 3개 × 2번", "일과 중 한 번, 자기 전 한 번"],
] as const;

const steps = [
  ["01", "질문에 답하기", "하루 두 번, 오늘에 대한 질문 3가지에 답해요. 막막한 일기 대신 질문이 시작점이 돼요."],
  ["02", "스스로 묻기", "답하다 생긴 궁금증을 나 자신에게 남기고, 새로운 질문을 직접 만들어 제시해요."],
  ["03", "함께 돌아보기", "쌓인 회고를 선생님과 다시 읽으며, 요즘의 고민이 무엇인지 스스로 발견해요."],
  ["04", "길을 고르기", "선생님은 여러 갈래의 길을 보여주고, 어느 길로 갈지는 학생이 골라요."],
] as const;

// Filled in once the planner confirms a real example; while empty, the example cards are not rendered.
const growthExamples: { dailyQuestions: string[]; reviewQuestion: string; discovery: string }[] = [];

const beliefs = [
  ["01", "질문할 자유", "왜, 어떻게, 정말 그런가. 공부와 일상의 모든 궁금증을 환영해요. 아직 답을 찾지 못해도 괜찮아요."],
  ["02", "선택할 권리", "꿈이나 성공의 기준을 대신 정하지 않아요. 작은 목표부터 자신의 말로 선택하고 돌아봐요."],
  ["03", "관계 속의 배움", "독서와 대화, 다양한 경험으로 서로의 관점을 넓혀요. 선생님도 배우는 공동체의 한 사람이에요."],
] as const;

const people = [
  ["학생", "나의 질문과 선택", "오늘의 물음, 작은 목표, 회고. 내 생각을 내 언어로 기록하는 공간이에요."],
  ["선생님", "함께 탐구하는 동료", "학생의 생각을 먼저 듣고, 길을 정해주는 대신 여러 갈래의 길을 보여줘요."],
  ["학부모", "신뢰로 지켜보는 성장", "학생이 동의하고 선생님이 승인한 학습 리포트로 배움의 방향을 나눠요."],
] as const;

function SectionLabel({ number, label, dark = false }: { number: string; label: string; dark?: boolean }) {
  return <div className={`${styles.sectionLabel} ${dark ? styles.sectionLabelDark : ""}`}><p><Sparkle />{number}{"   "}{label}</p><div className={styles.rule} aria-hidden="true" /></div>;
}

export function PublicHome() {
  const example = growthExamples[0];
  return <>
    <a className="skip-link" href="#public-content">본문으로 바로가기</a>
    <div className={styles.home}>
      <div className={styles.headerBar}><div className={styles.container}>
        <Navigation links={links} current=""><Link href="/app" className={styles.headerCta}>시연 공간 둘러보기</Link></Navigation>
      </div></div>

      <main id="public-content" tabIndex={-1}>
        <section id="top" className={styles.hero}><div className={styles.heroOverlay}><NightSky /><div className={`${styles.container} ${styles.heroInner}`}>
          <p className={styles.heroEyebrow}><Sparkle />MULEUM · 질문으로 배우는 교육 공동체</p>
          <h1 className={styles.heroTitle}>배움이 머무는 곳,<br /><span>질문이 시작되는 곳.</span></h1>
          <p className={styles.heroLead}>모든 배움은 하나의 질문에서 시작된다.</p>
          <div className={styles.heroActions}>
            <a href="#how" className={styles.heroPrimary}>물음이 자라는 과정 보기<Icon name="arrow-up-right" /></a>
            <Link href="/app" className={styles.heroSecondary}>시연 공간 둘러보기</Link>
          </div>
          <p className={styles.heroCredit}>배경 사진은 분위기를 위한 이미지이며, 물음의 운영 시설이 아닙니다. Photo: Kyle Ryan / Unsplash</p>
        </div></div></section>

        <section id="why" className={styles.section}><div className={`${styles.container} ${styles.sectionInner}`}>
          <SectionLabel number="01" label="WHY MULEUM" />
          <div className={styles.split}>
            <div className={styles.whyLead}>
              <h2 className={styles.sectionTitle}>무엇을 해야 할지 모르는 것은<br />잘못이 아닙니다.</h2>
              <p className={styles.whySub}>다만 혼자서는 그 질문을<br />꺼내기 어렵습니다.</p>
            </div>
            <div className={styles.whyBody}>
              <div className={styles.whyText}>
                <h3>물음이 하는 일</h3>
                <p>물음의 선생님은 길을 대신 정해주지 않고, 여러 갈래의 길을 보여줍니다. 학생은 매일의 질문과 회고 속에서 자신의 고민을 스스로 발견하고, 언젠가 목표가 생겼을 때 걸어갈 기반을 쌓습니다.</p>
              </div>
              <div className={styles.divider} aria-hidden="true" />
              <dl className={styles.facts}>{facts.map(([label, value, note]) => <div key={label}><dt>{label}</dt><dd className={styles.factValue}>{value}</dd><dd>{note}</dd></div>)}</dl>
            </div>
          </div>
        </div></section>

        <section id="how" className={`${styles.section} ${styles.paper}`}><div className={`${styles.container} ${styles.sectionInner}`}>
          <SectionLabel number="02" label="HOW A QUESTION GROWS" />
          <div className={styles.howHeading}>
            <h2 className={styles.sectionTitle}>하나의 물음이 자라는 과정</h2>
            <p>정답 대신, 여러 갈래의 길.</p>
          </div>
          <ol className={styles.steps}>{steps.map(([number, title, text]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></li>)}</ol>
          {example && <div className={styles.examples}>
            <div className={styles.exampleCard}>
              <p className={styles.exampleLabel}>오늘의 물음 · 자기 전</p>
              <div className={styles.exampleQuestions}>{example.dailyQuestions.map(question => <p key={question}>{question}</p>)}</div>
            </div>
            <div className={styles.exampleCard}>
              <p className={styles.exampleLabel}>2주 뒤, 함께 돌아보기</p>
              <p className={styles.exampleReview}>{example.reviewQuestion}</p>
              <p className={styles.exampleDiscovery}>{example.discovery}</p>
            </div>
          </div>}
        </div></section>

        <section id="believe" className={`${styles.section} ${styles.navy}`}><div className={`${styles.container} ${styles.sectionInner}`}>
          <SectionLabel number="03" label="WHAT WE BELIEVE" dark />
          <h2 className={`${styles.sectionTitle} ${styles.onNavy}`}>잘 해내는 사람보다,<br />스스로 선택하는 사람으로.</h2>
          <div className={styles.beliefs}>{beliefs.map(([number, title, text]) => <div key={number}><h3>{number}{"  "}{title}</h3><p>{text}</p></div>)}</div>
        </div></section>

        <section id="people" className={styles.section}><div className={`${styles.container} ${styles.sectionInner}`}>
          <SectionLabel number="04" label="PEOPLE BEFORE TECHNOLOGY" />
          <h2 className={styles.sectionTitle}>배움의 중심에는<br />언제나 사람이 있어요.</h2>
          <div className={styles.people}>{people.map(([role, title, text]) => <article key={role}><span>{role}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
          <div className={styles.aiBox}>
            <div className={styles.aiIcon}><Icon name="lightbulb" /></div>
            <div className={styles.aiText}>
              <h3>AI는 선생님의 보조예요.</h3>
              <p>학생의 회고와 독서에 어울리는 질문을 제안하고, 아직 경험이 짧은 선생님이 미처 보지 못한 관점을 보완해요. 어떤 질문을 건넬지는 언제나 사람이 정해요.</p>
              <p className={styles.aiPrivacy}>비공개 일기를 자동 분석하거나 외부 AI에 보내지 않아요.</p>
            </div>
          </div>
        </div></section>

        <section id="beta" className={`${styles.section} ${styles.paper} ${styles.beta}`}><div className={`${styles.container} ${styles.betaInner}`}>
          <p className={styles.betaEyebrow}><Sparkle />A SMALL, TRUSTED BEGINNING</p>
          <h2 className={styles.sectionTitle}>작게 시작하고,<br />신뢰를 쌓으며 함께 자라요.</h2>
          <p className={styles.betaText}>물음은 초대 기반 비공개 운영을 준비 중이에요. 지금은 가상 데이터로 구성한 시연 공간을 살펴볼 수 있어요.</p>
          <p className={styles.betaInvite}>초대를 받으셨나요? 받은 링크를 열고 초대받은 구글 계정으로 시작하면 돼요. 별도의 회원가입은 없어요.</p>
          <div className={styles.betaActions}>
            <Link href="/app" className={styles.betaButton}>시연 공간 둘러보기<Icon name="arrow-up-right" /></Link>
            <Link href="/login" className={styles.betaSecondary}>초대받은 회원 로그인</Link>
          </div>
        </div></section>
      </main>

      <footer className={styles.footer}><div className={`${styles.container} ${styles.footerInner}`}>
        <div><strong>물음 · MULEUM</strong><span>모든 배움은 하나의 질문에서 시작된다.</span></div>
        <div className={styles.footerLinks}><Link href="/login">회원 로그인</Link><a href="#top">위로 돌아가기 ↑</a></div>
      </div></footer>
    </div>
  </>;
}
