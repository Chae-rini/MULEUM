"use client";

import { useState, type FormEvent } from "react";
import { type Question, localDate, validateText } from "@/lib/model";
import { Card, Empty, Feedback, Field, Heading } from "./ui";

export function QuestionList({ questions }: { questions: Question[] }) {
  if (!questions.length) return <Empty>아직 질문이 없어요. 지금 떠오르는 작은 궁금증부터 남겨 보세요.</Empty>;
  return <div className="question-list">{questions.map((q) => <article className="question-item" key={q.id}><div className="question-title"><span className="question-mark" aria-hidden="true">?</span><h3>{q.text}</h3></div>{q.reason && <p className="record-text muted">{q.reason}</p>}<p className="small mb-0">{q.demo ? "가상 예시" : q.date} <span aria-hidden="true">·</span> 나만 보기</p></article>)}</div>;
}

export function Questions({ questions, save, storageError, blocked }: { questions: Question[]; save: (value: Question[]) => boolean; storageError: string; blocked: boolean }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const text = String(values.get("question") ?? "").trim();
    const reason = String(values.get("reason") ?? "").trim();
    const issue = validateText(text, 300) || (reason.length > 500 ? "이유는 500자 이내로 적어 주세요." : "");
    setError(issue || ""); setSuccess("");
    if (issue) return;
    if (save([{ id: crypto.randomUUID(), text, reason, date: localDate(), demo: false }, ...questions])) {
      form.reset(); setSuccess("새로운 물음이 이 브라우저에 저장됐어요.");
    }
  }
  return <><Heading eyebrow="MY QUESTIONS" title="나의 물음" description="중요한 것은 정답이 아니라, 내가 어떤 질문을 발견했는지예요." /><div className="content-grid"><Card><h2>새 질문 남기기</h2><form onSubmit={submit}><Field name="question" label="지금 나에게 궁금한 것은 무엇인가요?" placeholder="예: 나는 왜 틀리는 것이 두려울까?" maxLength={300} required /><Field name="reason" label="이 질문을 하게 된 이유" placeholder="어떤 일을 겪었나요? 왜 궁금해졌나요?" maxLength={500} /><div className="form-footer"><span className="small">작은 질문도 충분히 의미 있어요.</span><button className="button" disabled={blocked}>물음 남기기 <span aria-hidden="true">↗</span></button></div><Feedback error={error || storageError} success={success} /></form></Card><Card className="soft"><p className="eyebrow">THINK A LITTLE DEEPER</p><h2>질문을 깊게 만드는 방법</h2>{[["WHY", "왜 그렇게 생각했을까?"], ["HOW", "어떻게 확인할 수 있을까?"], ["WHAT IF", "다른 가능성은 없을까?"], ["HOW DO I KNOW", "내 생각의 근거는 충분할까?"]].map(([label, prompt]) => <div className="prompt-box" key={label}><small>{label}</small><strong>{prompt}</strong></div>)}<p className="small mb-0">스스로 생각할 시간을 충분히 가져요. AI 질문 코치는 아직 연결되지 않았어요.</p></Card></div><Card className="mt-5"><div className="section-header"><h2>질문의 기록</h2><span className="pill">{questions.length}개의 물음</span></div><QuestionList questions={questions} /></Card></>;
}
