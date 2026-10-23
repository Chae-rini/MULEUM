"use client";

import { useEffect, useState } from "react";
import { type Goal, isGoals, isQuestions, localDate, sampleQuestions, weekStart } from "@/lib/model";
import { sectionDefinitions, type Section } from "@/lib/platform";
import { useLocalStore } from "@/lib/use-local-store";
import { Card, Empty, Feedback, Heading } from "./ui";
import { Questions, QuestionList } from "./questions";
import { Goals } from "./goals";
import { JournalPanel } from "./journal";
import { Lesson } from "./lesson";
import { Teacher } from "./teacher";
import { Parent } from "./parent";
import { useMemberPreview } from "./member-shell";
import { MemberProfilePanel } from "./member-profile";
import { AccountRelations } from "./account-relations";
import { VideoLibrary } from "./video-library";
import { BoardPreview, NoticesPreview, OperationsPreview, PreviewUnavailable, ResearchPreview, RoleDashboard } from "./platform-previews";

const initialGoals: Goal[] = [];

export function Dashboard({ page }: { page: Section }) {
  const { role, go } = useMemberPreview();
  const [today, setToday] = useState("");
  const questions = useLocalStore("muleum:v1:questions", sampleQuestions, isQuestions);
  const goals = useLocalStore("muleum:v1:goals", initialGoals, isGoals);
  useEffect(() => {
    const updateDate = () => setToday(localDate());
    updateDate();
    const timer = window.setInterval(updateDate, 60000);
    return () => window.clearInterval(timer);
  }, []);
  const weekly = today ? goals.data.filter((goal) => goal.week === weekStart(today)) : [];
  if (!sectionDefinitions[page].roles.includes(role)) return <PreviewUnavailable page={page} role={role} />;
  if (!today || !questions.ready || !goals.ready) return <div className="loading" role="status">나의 배움 공간을 준비하고 있어요…</div>;

  return <>
    {page === "profile" && <MemberProfilePanel key={role} />}
    {page === "register" && <MemberProfilePanel key={role} registration />}
    {page === "accounts" && <AccountRelations key={role} />}
    {page === "videos" && <VideoLibrary key={role} />}
    {page === "home" && role === "student" && <><Heading eyebrow={`${today.replaceAll("-", ". ")} · 나의 배움 공간`} title="배움은 질문에서 시작돼요." description="오늘의 생각을 기록하고, 작지만 나만의 한 걸음을 선택해 봐요." /><div className="content-grid home-grid"><div className="stack"><Card className="hero"><span className="pill">TODAY’S QUESTION</span><h2>최근에 “왜 그럴까?” 하고<br className="desktop-break" /> 궁금했던 일이 있나요?</h2><p>공부에 관한 일이 아니어도 괜찮아요.<br />나만의 질문을 하나 남겨 보세요.</p><button className="button" onClick={() => go("questions")}>내 질문 남기기 <span aria-hidden="true">↗</span></button><span className="hero-mark" aria-hidden="true">?</span><div className="hero-orbit" aria-hidden="true" /></Card><Card><div className="section-header"><h2>나의 최근 물음</h2><button className="text-button" onClick={() => go("questions")}>전체 보기 <span aria-hidden="true">↗</span></button></div><QuestionList questions={questions.data.slice(0, 2)} /><Feedback error={questions.error} /></Card></div><div className="stack"><Card><div className="section-header"><span className="eyebrow">이번 주 내가 선택한 목표</span><span className="mini-icon" aria-hidden="true">◎</span></div><h2>작은 실천 하나부터</h2>{weekly.length ? <div>{weekly.slice(0, 3).map((goal) => <div className="home-goal" key={goal.id}><span className={goal.done ? "done-circle" : "empty-circle"} aria-label={goal.done ? "완료" : "미완료"}>{goal.done ? "✓" : ""}</span><span className={goal.done ? "completed" : ""}>{goal.text}</span></div>)}<p className="small mt-4">{weekly.filter((g) => g.done).length} / {weekly.length}개의 작은 실천 완료</p></div> : <Empty>이번 주, 나를 위한 작은 행동 하나를 정해 볼까요?</Empty>}<button className="button line w-full mt-4" onClick={() => go("goals")}>목표 관리하기 <span aria-hidden="true">↗</span></button><Feedback error={goals.error} /></Card><Card className="soft journal-card"><div className="section-header"><span className="eyebrow">저녁의 5분</span><span className="mini-icon" aria-hidden="true">✎</span></div><h2>오늘의 나를 돌아보기</h2><p className="muted">평가하거나 점수를 매기지 않아요.<br />하루를 돌아보며 내일을 위한 질문을 남겨요.</p><button className="text-button" onClick={() => go("journal")}>5분 일기 쓰기 <span aria-hidden="true">↗</span></button></Card><p className="quiet-quote">“좋은 질문 하나가, 새로운 배움의 시작.”</p></div></div><div className="journey"><span>나만의 속도로, 나만의 방향으로.</span><div><span>질문</span><i>→</i><span>탐구</span><i>→</i><span>행동</span><i>→</i><span>성찰</span></div></div></>}
    {page === "home" && role !== "student" && <RoleDashboard role={role} />}
    {page === "questions" && <Questions questions={questions.data} save={questions.save} storageError={questions.error} blocked={questions.blocked} />}
    {page === "goals" && <Goals goals={goals.data} save={goals.save} today={today} storageError={goals.error} blocked={goals.blocked} />}
    {page === "journal" && <JournalPanel today={today} />}
    {page === "lesson" && <Lesson today={today} teacher={role === "teacher"} onQuestion={() => go("questions")} />}
    {page === "teacher" && <Teacher />}
    {page === "parent" && <Parent />}
    {page === "notices" && <NoticesPreview role={role} />}
    {page === "board" && <BoardPreview />}
    {page === "research" && <ResearchPreview />}
    {page === "operations" && <OperationsPreview />}
  </>;
}
