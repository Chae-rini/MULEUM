import type { AccountRole } from "./policy";

export const homeContent: Record<AccountRole, { title: string; description: string; cards: { title: string; text: string; preview: string }[] }> = {
  student: { title: "오늘은 어떤 물음이 떠올랐나요?", description: "질문하고, 시도하고, 나만의 속도로 성장해요.", cards: [
    { title: "나의 물음", text: "답을 몰라도 괜찮아요. 궁금한 것부터 시작해요.", preview: "questions" },
    { title: "5분 일기", text: "나만 읽을 수 있는 기록으로 오늘을 돌아봐요.", preview: "journal" },
    { title: "나의 목표", text: "이번 주 내가 선택한 작은 실천을 정해요.", preview: "goals" },
  ] },
  parent: { title: "믿음으로 함께 지켜보는 배움", description: "승인된 관계와 공유 범위 안에서 학생의 성장을 함께 살펴봐요.", cards: [
    { title: "공유된 성장 리포트", text: "공유 승인을 받은 리포트만 확인해요. 학생의 비공개 일기는 제공하지 않아요.", preview: "parent" },
    { title: "학생과의 연결", text: "보호자 관계를 확인하고 승인하는 절차를 살펴봐요.", preview: "accounts" },
  ] },
  teacher: { title: "질문을 함께 키우는 선생님 공간", description: "학생의 생각을 먼저 듣고, 다음 배움을 함께 준비해요.", cards: [
    { title: "담당 학생과 수업", text: "담당 학생의 수업과 피드백을 준비해요.", preview: "teacher" },
    { title: "공식 교육 영상", text: "복습 자료를 준비하고 관리자 검토를 요청해요.", preview: "videos" },
  ] },
  alumni: { title: "졸업 후에도 내 계정은 그대로", description: "졸업 상태와 승인된 역할을 확인해요. 초기 학습 앱에는 졸업생 커뮤니티를 운영하지 않아요.", cards: [] },
  administrator: { title: "신뢰를 지키는 운영 공간", description: "초대와 관계, 역할 승인을 책임 있게 관리해요.", cards: [
    { title: "회원과 관계 승인", text: "초대·역할·담당 관계의 승인 흐름을 확인해요.", preview: "accounts" },
    { title: "공식 영상 검토", text: "공개 여부와 실제 YouTube 상태를 별도로 확인해요.", preview: "videos" },
  ] },
  teaching_assistant: { title: "함께 생각하는 조교 공간", description: "승인받은 활동 범위에서 배움을 도와요.", cards: [] },
  community_operator: { title: "함께 만드는 공동체", description: "승인된 운영 권한으로 모임과 공지를 준비해요.", cards: [] },
};
