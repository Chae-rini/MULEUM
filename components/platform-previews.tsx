"use client";

import Link from "next/link";
import { roleLabels, sectionDefinitions, type MemberRole, type Section } from "@/lib/platform";
import { Card, Heading } from "./ui";

export function RoleDashboard({ role }: { role: MemberRole }) {
  const available = Object.entries(sectionDefinitions).filter(([key, item]) => key !== "home" && item.roles.includes(role) && (role !== "alumni" || key === "profile"));
  return <><Heading eyebrow="OUR LEARNING SPACE" title={`${roleLabels[role]}의 배움 공간`} description="각자의 역할에서 필요한 일을 살펴보고, 사람과 사람의 배움을 이어가요." /><div className="stats-grid">{available.map(([key, item]) => <Card key={key}><h2>{item.label}</h2><p className="small">가상 데이터로 화면 구조를 살펴보세요.</p><Link href={item.path} className="text-button">{item.label} 살펴보기 ↗</Link></Card>)}</div></>;
}

export function PreviewUnavailable({ page, role }: { page: Section; role: MemberRole }) {
  return <Card><h1>다른 역할의 시연 화면이에요.</h1><p>‘{sectionDefinitions[page].label}’은 현재 선택한 {roleLabels[role]} 메뉴에 포함되어 있지 않아요. 상단의 역할 미리보기에서 해당 역할을 선택해 주세요.</p><p className="note">이 안내는 화면 구분일 뿐 실제 접근 권한 검사가 아니에요.</p><Link className="button" href="/app">내 시연 홈으로 돌아가기</Link></Card>;
}
