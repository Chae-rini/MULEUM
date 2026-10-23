"use client";

import { useState } from "react";
import { type LessonRecord, isLessons, lessonProgress, lessonSteps, students } from "@/lib/model";
import { useLocalStore } from "@/lib/use-local-store";
import { Card, Feedback, Heading } from "./ui";

const initial: LessonRecord[] = [];

export function Lesson({ today, teacher = false, onQuestion }: { today: string; teacher?: boolean; onQuestion: () => void }) {
  const store = useLocalStore("muleum:v1:lessons", initial, isLessons);
  const [student, setStudent] = useState("student-a");
  const [date, setDate] = useState(today);
  const id = `${student}:${date}`;
  const completed = store.data.find((record) => record.id === id)?.completed ?? [];
  const progress = lessonProgress(completed);
  function toggle(index: number) {
    const next = completed.includes(index) ? completed.filter((i) => i !== index) : [...completed, index];
    store.save([...store.data.filter((record) => record.id !== id), { id, student, date, completed: next }]);
  }
  return <><Heading eyebrow="LEARN, TRY, REFLECT" title="과외 수업" description="120분 수업 · 독서와 언어, 교과 학습, 독립적인 문제 해결, 질문의 시간." /><div className="content-grid"><Card><div className="section-header"><h2>오늘의 수업 흐름</h2><span className="pill">120분</span></div><div className="lesson-filters">{teacher ? <div className="field"><label htmlFor="lesson-student">수업 학생</label><select id="lesson-student" value={student} onChange={(e) => setStudent(e.target.value)}>{students.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.subject}</option>)}</select></div> : <p className="small">학생 A · 수학 · 가상 수업</p>}<div className="field"><label htmlFor="lesson-date">수업 날짜</label><input type="date" id="lesson-date" value={date} required onChange={(e) => { if (e.target.value) setDate(e.target.value); }} /></div></div>{!store.ready ? <p role="status">수업 기록을 불러오고 있어요…</p> : lessonSteps.map((step, index) => <label className="check-row lesson-step" key={step.title}><input type="checkbox" checked={completed.includes(index)} disabled={store.blocked || !date} onChange={() => toggle(index)} /><span className="step-copy"><strong>{step.title}</strong><span className="small">{step.description}</span></span><span className="lesson-time">{step.minutes}분</span></label>)}<hr /><div className="section-header"><strong>진행 확인</strong><span className="small">{progress.count} / 7 단계 · {progress.minutes} / 120분</span></div><progress max={120} value={progress.minutes} aria-label="수업 완료 시간" /><Feedback error={store.error} /></Card><div className="stack"><Card className="soft"><span className="decorative-icon" aria-hidden="true">?</span><h2>오늘의 물음</h2><p>수업을 마친 뒤 오늘 배운 개념이나 일상에서 궁금했던 점을 질문으로 남겨 보세요.</p>{!teacher && <button className="button" onClick={onQuestion}>질문 남기기 ↗</button>}{teacher && <p className="note">학생이 스스로 질문을 표현할 수 있도록 충분히 기다려 주세요.</p>}</Card><Card><h2>비대면 과외</h2><p className="muted">정식 버전에서는 선생님이 승인한 화상회의 링크와 필기 보드를 이곳에서 열 수 있어요.</p><button className="button line" disabled>화상수업 연결 · 준비 중</button></Card></div></div></>;
}
