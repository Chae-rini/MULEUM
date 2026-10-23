"use client";

import Link from "next/link";
import { useState } from "react";
import { capacityLimits, roleLabels, sectionDefinitions, type MemberRole, type Section } from "@/lib/platform";
import { Card, Empty, Heading } from "./ui";

const noticeExamples = [
  { scope: "전체 공지", title: "함께 배우는 공간의 약속", text: "질문을 서두르지 않고, 다른 사람의 기록과 선택을 존중하는 안내문 예시예요." },
  { scope: "수업별 공지", title: "다음 수업, 함께 정할 것들", text: "독서와 어휘 활동의 분량을 학생과 선생님이 대화로 조정하는 안내문 예시예요." },
  { scope: "선생님 전용", title: "교육팀의 연구 주제", text: "정답을 알려주기 전에 어떤 질문을 건넬 수 있을지 함께 검토하는 공지 예시예요." },
  { scope: "졸업생 전용", title: "원하는 만큼, 함께 이어가는 배움", text: "졸업 후 참여는 선택이에요. 참여나 후배 지원을 의무로 두지 않는 안내문 예시예요." },
];

function DemoLabel({ children }: { children: React.ReactNode }) {
  return <div className="note scaffold-note"><strong>설계 시연 · 실제 운영 기능 미연결</strong><p>{children}</p></div>;
}

export function NoticesPreview({ role }: { role: MemberRole }) {
  const [scope, setScope] = useState("전체 공지");
  const scopes = ["전체 공지"];
  if (["student", "parent", "teacher"].includes(role)) scopes.push("수업별 공지");
  if (role === "teacher") scopes.push("선생님 전용");
  const selected = scopes.includes(scope) ? scope : "전체 공지";
  return <><Heading eyebrow="NOTICE BOARD" title="공지사항" description="우리에게 필요한 소식을, 필요한 범위 안에서 나눠요." />
    <DemoLabel>분류와 공개 범위를 살펴보는 가상 공지예요. 실제 공지 게시·수신자 지정·권한 검사는 아직 구현되지 않았어요.</DemoLabel>
    <div className="filter-row" aria-label="공지 분류">{scopes.map((item) => <button key={item} aria-pressed={selected === item} onClick={() => setScope(item)}>{item}</button>)}</div>
    {noticeExamples.filter((item) => item.scope === selected).map((item) => <Card key={item.scope}><span className="pill">{item.scope} · 예시</span><h2 className="mt-4">{item.title}</h2><p className="muted mb-0">{item.text}</p></Card>)}
  </>;
}

export function BoardPreview() {
  return <><Heading eyebrow="QUESTIONS BETWEEN PEOPLE" title="질문게시판" description="답을 서두르기보다, 서로의 생각을 듣고 질문을 이어가는 공간이에요." />
    <DemoLabel>이곳의 질문은 별도로 만든 예시예요. ‘나의 물음’에 쓴 개인 기록은 자동 게시되지 않아요. 게시·답변·공유 범위 변경은 Phase 2 이후에 연결해요.</DemoLabel>
    <div className="content-grid"><Card><span className="pill">자유 탐구 · 가상 예시</span><h2 className="mt-4">같은 책을 읽고도 왜 서로 다르게 생각할까?</h2><p>각자가 중요하게 생각한 문장부터 이야기해 보면 어떨까요?</p><div className="record-tags"><span>상태 예시: 함께 탐구 중</span><span>범위 예시: 승인된 모임</span></div><hr /><h3>사람이 함께 만드는 답변</h3><p className="muted">담당 선생님과 승인된 조교, 해당 공간에 참여가 허용된 구성원이 질문을 읽고 답변하는 흐름을 준비하고 있어요.</p><Empty>실제 답변과 후속 질문은 아직 없어요.</Empty></Card>
    <Card className="soft"><h2>질문 하나가 대화가 되기까지</h2><ol className="principle-list"><li>궁금한 점을 내 말로 적어요.</li><li>누구와 나눌지 직접 선택해요.</li><li>서로의 근거와 다른 가능성을 살펴봐요.</li><li>새로운 질문을 남겨도, 잠시 멈춰도 괜찮아요.</li></ol><p className="note">질문 상태는 탐구의 흐름을 위한 표시예요. 순위나 답변 속도로 사람을 평가하지 않아요. AI 자동 답변은 연결하지 않았어요.</p></Card></div>
  </>;
}

export function ResearchPreview() {
  return <><Heading eyebrow="TEACHERS LEARNING TOGETHER" title="교육팀 연구" description="선생님도 함께 질문하고, 교육 경험과 교수법을 발전시켜요." />
    <DemoLabel>연구 주제·회의록·비식별 사례를 위한 화면 골격이에요. 실제 문서 작성과 공유 기능은 아직 없어요.</DemoLabel>
    <div className="stats-grid">{[["교수법 연구", "학생의 설명을 먼저 듣는 수업은 어떻게 만들 수 있을까요?"], ["회의록", "논의한 내용과 다음에 시도할 방법을 구분해 남기는 구조를 준비해요."], ["비식별 교육 사례", "이름을 지우는 것만으로 충분하지 않아요. 맥락으로 학생이 드러나지 않는지 검토가 필요해요."]].map(([title, description]) => <Card key={title}><h2>{title}</h2><p className="muted mb-0">{description}</p></Card>)}</div>
  </>;
}

export function CommunityPreview() {
  return <><Heading eyebrow="LEARNING BEYOND THE CLASSROOM" title="졸업생 공동체" description="수업이 끝나도 배움은 이어질 수 있어요. 참여할지, 어떻게 함께할지는 내가 선택해요." />
    <DemoLabel>모임 탐색을 위한 화면 골격이에요. 현재 참가 신청·메시지·회원 연결 기능은 없어요. 아래 항목은 실제 운영 중인 모임이 아닌 확장 방향이에요.</DemoLabel>
    <div className="stats-grid">{[["독서와 학문", "독서모임, 학문별 스터디, 서로의 관점을 듣는 토론"], ["삶과 경험", "취미모임, 정기 세미나, 새로운 경험의 나눔"], ["선택하는 기여", "교육 콘텐츠 제작, 승인된 조교 활동, 공동체 운영 참여"]].map(([title, text]) => <Card key={title}><h2>{title}</h2><p className="muted mb-0">{text}</p></Card>)}</div>
    <Card className="soft mt-5"><h2>함께하기 전에 지킬 경계</h2><p>미성년 졸업생과 성인 졸업생의 활동 범위를 구분하고, 성인 전용 모임은 따로 운영하도록 설계해요. 안전한 운영 정책과 권한 검증 전에는 모임을 열지 않아요.</p><p className="mb-0">졸업은 조교·선생님·관리자 권한을 뜻하지 않아요. 별도의 승인과 필요한 범위의 권한이 있어야 해요.</p></Card>
  </>;
}

export function OperationsPreview() {
  return <><Heading eyebrow="CARE FOR THE COMMUNITY" title="운영 공간" description="공동체를 돌보는 일과 개인의 기록을 열람하는 권한은 다르게 설계해요." />
    <DemoLabel>아래 숫자는 현재 회원 수가 아니라 초기 운영의 정원 기준이에요. 초대 발송·회원 승인·배정·정원 집계·결제 기능은 아직 연결되지 않았어요.</DemoLabel>
    <div className="stats-grid">{[["선생님 정원", capacityLimits.teachers], ["선생님별 활성 학생 정원", capacityLimits.studentsPerTeacher], ["전체 활성 학생 정원", capacityLimits.activeStudents]].map(([label, count]) => <Card key={label}><span className="small">{label}</span><strong className="stat">{count}<span>명</span></strong></Card>)}</div>
    <div className="content-grid mt-5"><Card><h2>초대와 관계 중심의 운영</h2><p>학생마다 주 담당 선생님을 두고, 추가 접근은 관계와 공유 범위를 명시해 승인하는 구조를 준비해요.</p><div className="note">현재 정원 계산 로직은 테스트 가능한 설계 기반이에요. 실제 동시 가입 제한은 서버와 데이터베이스에서 함께 검증해야 해요.</div></Card><Card className="soft"><h2>아직 결정하지 않은 것들</h2><p>수수료율, 납부·환불·정산 정책은 미확정이에요. 학생별 월 과외비와 수수료 계약을 나중에 연결할 수 있도록 설계만 남겨 두었어요.</p><p className="small mb-0">관리자 역할도 비공개 일기나 상담 내용을 자동 열람할 수 있는 권한으로 사용하지 않아요.</p></Card></div>
  </>;
}

export function RoleDashboard({ role }: { role: MemberRole }) {
  const available = Object.entries(sectionDefinitions).filter(([key, item]) => key !== "home" && item.roles.includes(role) && (role !== "alumni" || key === "profile"));
  return <><Heading eyebrow="OUR LEARNING SPACE" title={`${roleLabels[role]}의 배움 공간`} description="각자의 역할에서 필요한 일을 살펴보고, 사람과 사람의 배움을 이어가요." /><div className="stats-grid">{available.map(([key, item]) => <Card key={key}><h2>{item.label}</h2><p className="small">가상 데이터로 화면 구조를 살펴보세요.</p><Link href={item.path} className="text-button">{item.label} 살펴보기 ↗</Link></Card>)}</div></>;
}

export function PreviewUnavailable({ page, role }: { page: Section; role: MemberRole }) {
  return <Card><h1>다른 역할의 시연 화면이에요.</h1><p>‘{sectionDefinitions[page].label}’은 현재 선택한 {roleLabels[role]} 메뉴에 포함되어 있지 않아요. 상단의 역할 미리보기에서 해당 역할을 선택해 주세요.</p><p className="note">이 안내는 화면 구분일 뿐 실제 접근 권한 검사가 아니에요.</p><Link className="button" href="/app">내 시연 홈으로 돌아가기</Link></Card>;
}
