"use client";

import { useState, type FormEvent } from "react";
import { type Goal, validateText, weekStart } from "@/lib/model";
import { Card, Empty, Feedback, Field, Heading } from "./ui";

export function Goals({ goals, save, today, storageError, blocked }: { goals: Goal[]; save: (value: Goal[]) => boolean; today: string; storageError: string; blocked: boolean }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const week = weekStart(today);
  const current = goals.filter((g) => g.week === week);
  const previous = goals.filter((g) => g.week !== week);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const text = String(new FormData(form).get("goal") ?? "").trim();
    const issue = validateText(text, 120);
    setError(issue || ""); setSuccess("");
    if (issue) return;
    if (save([...goals, { id: crypto.randomUUID(), text, week, done: false }])) {
      form.reset(); setSuccess("내가 선택한 이번 주 목표가 저장됐어요.");
    }
  }
  return <><Heading eyebrow="MY SMALL STEPS" title="나의 목표" description="남이 정한 목표가 아니라, 내가 선택하고 시도해 볼 수 있는 작은 행동을 만들어요." /><div className="content-grid"><Card><div className="section-header"><h2>이번 주에 해보고 싶은 일</h2><span className="pill">{week.slice(5).replace("-", ".")} 시작</span></div><form onSubmit={submit}><Field name="goal" label="구체적인 작은 행동" placeholder="예: 수요일 오후에 수학 문제 3개 직접 풀기" maxLength={120} multiline={false} required /><button className="button" disabled={blocked}>나의 목표 추가 <span aria-hidden="true">＋</span></button></form><Feedback error={error || storageError} success={success} /><hr /><div className="section-header"><h3>나의 작은 실천</h3><span className="small">{current.filter((g) => g.done).length} / {current.length} 완료</span></div>{current.length ? current.map((goal) => <label className="check-row" key={goal.id}><input type="checkbox" checked={goal.done} disabled={blocked} onChange={() => { setSuccess(""); save(goals.map((g) => g.id === goal.id ? { ...g, done: !g.done } : g)); }} /><span className={goal.done ? "completed" : ""}>{goal.text}</span></label>) : <Empty>아직 이번 주 목표가 없어요. 시작하기 쉬운 행동 하나를 선택해 보세요.</Empty>}</Card><Card className="soft"><span className="decorative-icon" aria-hidden="true">◎</span><h2>작은 실천 하나부터</h2><p>“공부를 잘하고 싶다”보다는 “수요일 오후에 수학 문제 3개를 직접 풀어 보겠다”처럼 시작하기 쉽고, 했는지 확인할 수 있는 행동이 좋아요.</p><div className="note">목표를 지키지 못했다면 나를 비난하지 말고, 무엇이 방해가 되었는지 탐색해 봐요.</div><p className="small mt-5 mb-0">한 주는 월요일부터 시작해요. 지난 목표는 기록으로 남고, 새로운 주의 목표는 직접 선택해요.</p></Card></div>{previous.length > 0 && <Card className="mt-5"><h2>지난 주의 발자국</h2>{previous.map((goal) => <div className="check-row" key={goal.id}><span aria-label={goal.done ? "완료" : "미완료"}>{goal.done ? "✓" : "○"}</span><div>{goal.text}<p className="small mb-0">{goal.week} 주간</p></div></div>)}</Card>}</>;
}
