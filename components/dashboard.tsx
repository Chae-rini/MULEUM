"use client";

import { useEffect, useState } from "react";
import { type Goal, isGoals, isQuestions, localDate, sampleQuestions, weekStart } from "@/lib/model";
import { useLocalStore } from "@/lib/use-local-store";
import { Card, Empty, Feedback, Heading } from "./ui";
import { Questions, QuestionList } from "./questions";
import { Goals } from "./goals";
import { JournalPanel } from "./journal";
import { Lesson } from "./lesson";
import { Teacher } from "./teacher";
import { Parent } from "./parent";

type Role = "student" | "teacher" | "parent";
type Page = "home" | "questions" | "journal" | "goals" | "lesson" | "teacher" | "parent";
const initialGoals: Goal[] = [];
const navigation: { page: Page; label: string; short: string; icon: string; roles: Role[] }[] = [
  { page: "home", label: "오늘의 물음", short: "홈", icon: "⌂", roles: ["student"] },
  { page: "questions", label: "나의 물음", short: "물음", icon: "?", roles: ["student"] },
  { page: "journal", label: "5분 일기", short: "일기", icon: "✎", roles: ["student"] },
  { page: "goals", label: "나의 목표", short: "목표", icon: "◎", roles: ["student"] },
  { page: "lesson", label: "과외 수업", short: "수업", icon: "▤", roles: ["student", "teacher"] },
  { page: "teacher", label: "지도자 공간", short: "학생 관리", icon: "◈", roles: ["teacher"] },
  { page: "parent", label: "성장 리포트", short: "성장 리포트", icon: "♡", roles: ["parent"] },
];

export function Dashboard() {
  const [role, setRole] = useState<Role>("student");
  const [page, setPage] = useState<Page>("home");
  const [today, setToday] = useState("");
  const questions = useLocalStore("muleum:v1:questions", sampleQuestions, isQuestions);
  const goals = useLocalStore("muleum:v1:goals", initialGoals, isGoals);
  useEffect(() => {
    const updateDate = () => setToday(localDate());
    updateDate();
    const timer = window.setInterval(updateDate, 60000);
    return () => window.clearInterval(timer);
  }, []);
  function go(next: Page) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => document.getElementById("main-content")?.focus());
  }
  const links = navigation.filter((item) => item.roles.includes(role));
  const weekly = today ? goals.data.filter((goal) => goal.week === weekStart(today)) : [];
  const ready = today && questions.ready && goals.ready;
  return <><a className="skip-link" href="#main-content">본문으로 바로가기</a><div className="app"><aside className="sidebar"><a className="logo" href="/" aria-label="물음 홈"><span className="brand-mark">?</span><span><strong>물음<span className="brand-english">MULEUM</span></strong><small>모든 배움은 하나의 질문에서</small></span></a><div><p className="nav-caption">MY LEARNING SPACE</p><nav className="side-nav" aria-label="메인 메뉴">{links.map((item) => <button key={item.page} onClick={() => go(item.page)} aria-current={page === item.page ? "page" : undefined}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}{page === item.page && <span className="active-dot" />}</button>)}</nav></div><div className="aside-bottom"><div className="aside-tip"><span className="small">A LITTLE QUESTION</span><strong>오늘의 작은 물음</strong><p>나는 무엇을 모르는가?<br />그것을 어떻게 알아낼까?</p><span aria-hidden="true" className="tip-mark">?</span></div><p className="small sidebar-foot">물음 v0.1 <span>로컬 데모</span></p></div></aside><div className="workspace"><header className="topbar"><div><p className="eyebrow">MULEUM <span className="topbar-divider">/</span> MY LEARNING JOURNEY</p><p className="small mb-0">정답보다 질문을, 관리보다 자율성을.</p></div><div className="role-control"><label htmlFor="role">화면 역할 미리보기</label><select id="role" value={role} onChange={(e) => { const next = e.target.value as Role; setRole(next); go(next === "student" ? "home" : next); }}><option value="student">학생</option><option value="teacher">선생님</option><option value="parent">학부모</option></select><span className="profile-avatar" aria-hidden="true">{role === "student" ? "A" : role === "teacher" ? "T" : "P"}</span></div></header><main id="main-content" tabIndex={-1}>{!ready ? <div className="loading" role="status">나의 배움 공간을 준비하고 있어요…</div> : <>
    {page === "home" && <><Heading eyebrow={`${today.replaceAll("-", ". ")} · 나의 배움 공간`} title="배움은 질문에서 시작돼요." description="오늘의 생각을 기록하고, 작지만 나만의 한 걸음을 선택해 봐요." /><div className="content-grid home-grid"><div className="stack"><Card className="hero"><span className="pill">TODAY’S QUESTION</span><h2>최근에 “왜 그럴까?” 하고<br className="desktop-break" /> 궁금했던 일이 있나요?</h2><p>공부에 관한 일이 아니어도 괜찮아요.<br />나만의 질문을 하나 남겨 보세요.</p><button className="button" onClick={() => go("questions")}>내 질문 남기기 <span aria-hidden="true">↗</span></button><span className="hero-mark" aria-hidden="true">?</span><div className="hero-orbit" aria-hidden="true" /></Card><Card><div className="section-header"><h2>나의 최근 물음</h2><button className="text-button" onClick={() => go("questions")}>전체 보기 <span aria-hidden="true">↗</span></button></div><QuestionList questions={questions.data.slice(0, 2)} /><Feedback error={questions.error} /></Card></div><div className="stack"><Card><div className="section-header"><span className="eyebrow">이번 주 내가 선택한 목표</span><span className="mini-icon" aria-hidden="true">◎</span></div><h2>작은 실천 하나부터</h2>{weekly.length ? <div>{weekly.slice(0, 3).map((goal) => <div className="home-goal" key={goal.id}><span className={goal.done ? "done-circle" : "empty-circle"} aria-label={goal.done ? "완료" : "미완료"}>{goal.done ? "✓" : ""}</span><span className={goal.done ? "completed" : ""}>{goal.text}</span></div>)}<p className="small mt-4">{weekly.filter((g) => g.done).length} / {weekly.length}개의 작은 실천 완료</p></div> : <Empty>이번 주, 나를 위한 작은 행동 하나를 정해 볼까요?</Empty>}<button className="button line w-full mt-4" onClick={() => go("goals")}>목표 관리하기 <span aria-hidden="true">↗</span></button><Feedback error={goals.error} /></Card><Card className="soft journal-card"><div className="section-header"><span className="eyebrow">저녁의 5분</span><span className="mini-icon" aria-hidden="true">✎</span></div><h2>오늘의 나를 돌아보기</h2><p className="muted">평가하거나 점수를 매기지 않아요.<br />하루를 돌아보며 내일을 위한 질문을 남겨요.</p><button className="text-button" onClick={() => go("journal")}>5분 일기 쓰기 <span aria-hidden="true">↗</span></button></Card><p className="quiet-quote">“좋은 질문 하나가, 새로운 배움의 시작.”</p></div></div><div className="journey"><span>나만의 속도로, 나만의 방향으로.</span><div><span>질문</span><i>→</i><span>탐구</span><i>→</i><span>행동</span><i>→</i><span>성찰</span></div></div></>}
    {page === "questions" && <Questions questions={questions.data} save={questions.save} storageError={questions.error} blocked={questions.blocked} />}
    {page === "goals" && <Goals goals={goals.data} save={goals.save} today={today} storageError={goals.error} blocked={goals.blocked} />}
    {page === "journal" && <JournalPanel today={today} />}
    {page === "lesson" && <Lesson today={today} teacher={role === "teacher"} onQuestion={() => go("questions")} />}
    {page === "teacher" && <Teacher />}
    {page === "parent" && <Parent />}
    </>}</main><footer className="demo-warning"><span className="demo-dot" aria-hidden="true" /><p><strong>가상 데이터로 사용하는 로컬 데모</strong><br />기록은 이 브라우저에만 저장돼요. 실제 로그인·접근 권한·서버 저장·AI는 연결되지 않았어요. 실제 학생 개인정보나 민감한 일기는 입력하지 마세요.</p></footer></div></div><nav className="bottom-nav" aria-label="모바일 메뉴" style={{ gridTemplateColumns: `repeat(${links.length}, 1fr)` }}>{links.map((item) => <button key={item.page} onClick={() => go(item.page)} aria-current={page === item.page ? "page" : undefined}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.short}</span></button>)}</nav></>;
}
