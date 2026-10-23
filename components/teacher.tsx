"use client";

import { useState, type FormEvent } from "react";
import { type TeacherNote, isNotes, localDate, students, validateText } from "@/lib/model";
import { useLocalStore } from "@/lib/use-local-store";
import { Card, Empty, Feedback, Field, Heading } from "./ui";

const initial: TeacherNote[] = [];

export function Teacher() {
  const store = useLocalStore("muleum:v1:teacher-notes", initial, isNotes);
  const [selected, setSelected] = useState<string>(students[0].id);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const student = students.find((s) => s.id === selected)!;
  const notes = store.data.filter((note) => note.student === selected);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const text = String(new FormData(form).get("teacher-note") ?? "").trim();
    const issue = validateText(text, 2000);
    setError(issue || ""); setSuccess("");
    if (issue) return;
    if (store.save([{ id: crypto.randomUUID(), student: selected, text, date: localDate() }, ...store.data])) {
      form.reset(); setSuccess(`${student.name}의 수업 메모가 저장됐어요.`);
    }
  }
  return <><Heading eyebrow="MENTOR'S SPACE" title="지도자 공간" description="학생을 통제하는 화면이 아니라, 학생의 질문과 학습 변화를 이해하는 공간이에요." /><div className="stats-grid"><Card><span className="small">함께 배우는 가상 학생</span><strong className="stat">3<span>명</span></strong></Card><Card><span className="small">기록한 수업 메모</span><strong className="stat">{store.data.length}<span>개</span></strong></Card><Card className="soft"><p className="eyebrow">OUR PROMISE</p><p className="mb-0">정답을 알려주기 전에,<br /><strong>학생의 생각을 먼저 들어요.</strong></p></Card></div><div className="content-grid mt-5"><Card><h2>학생별 수업 기록</h2><div className="stack compact">{students.map((s) => <button className={`student-button ${selected === s.id ? "selected" : ""}`} aria-pressed={selected === s.id} key={s.id} onClick={() => { setSelected(s.id); setError(""); setSuccess(""); }}><span className="avatar" aria-hidden="true">{s.name.slice(-1)}</span><span><strong>{s.name} · {s.subject}</strong><span className="small">{s.topic}</span></span><span className="ml-auto" aria-hidden="true">↗</span></button>)}</div><div className="note mt-5">모두 가상의 학생이에요. 학생의 비공개 질문과 일기는 이 화면에 연결하지 않아요.</div></Card><Card><span className="pill">{student.name} · {student.subject}</span><h2 className="mt-4">함께 살펴볼 배움</h2><p>{student.observation}</p><div className="prompt-box"><small>공유에 동의한 질문 · 가상 예시</small><strong>{student.question}</strong></div><form key={selected} onSubmit={submit}><Field name="teacher-note" label="수업 후 메모" placeholder="학생이 스스로 설명한 내용, 질문의 변화, 다음 수업에서 조정할 점을 적어 주세요." maxLength={2000} required /><button className="button" disabled={!store.ready || store.blocked}>수업 메모 저장</button><Feedback error={error || store.error} success={success} /></form><hr /><h3>{student.name}의 이전 메모</h3>{!store.ready ? <p role="status">메모를 불러오고 있어요…</p> : notes.length ? notes.map((note) => <article className="question-item mt-3" key={note.id}><p className="record-text">{note.text}</p><span className="small">{note.date} · 교사용 메모</span></article>) : <Empty>아직 수업 메모가 없어요.</Empty>}</Card></div></>;
}
