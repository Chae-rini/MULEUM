"use client";

import { useState, type FormEvent } from "react";
import { type Journal, isJournals } from "@/lib/model";
import { useLocalStore } from "@/lib/use-local-store";
import { Card, Empty, Feedback, Field, Heading } from "./ui";

const initial: Journal[] = [];
const prompts = ["01 · 오늘 가장 기억에 남는 일은 무엇인가요?", "02 · 그 일이 나에게 중요했던 이유는 무엇인가요?", "03 · 오늘 스스로에게 남기고 싶은 질문은 무엇인가요?"];

export function JournalPanel({ today }: { today: string }) {
  const store = useLocalStore("muleum:v1:private-journal", initial, isJournals);
  const [date, setDate] = useState(today);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const entry = store.data.find((j) => j.date === date);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const answers: Journal["answers"] = [String(form.get("journal-0") ?? "").trim(), String(form.get("journal-1") ?? "").trim(), String(form.get("journal-2") ?? "").trim()];
    setSuccess("");
    if (!answers.some(Boolean)) { setError("오늘 남기고 싶은 내용을 한 칸 이상 적어 주세요."); return; }
    if (answers.some((answer) => answer.length > 2000)) { setError("각 항목은 2000자 이내로 적어 주세요."); return; }
    setError("");
    const next = { id: entry?.id ?? crypto.randomUUID(), date, answers };
    if (store.save([next, ...store.data.filter((j) => j.date !== date)].sort((a, b) => b.date.localeCompare(a.date)))) setSuccess("나의 기록이 이 브라우저에 저장됐어요. 오늘을 돌아봤어요.");
  }
  if (!store.ready) return <p role="status">내 기록을 불러오고 있어요…</p>;
  return <><Heading eyebrow="A MOMENT FOR MYSELF" title="5분 일기" description="하루를 잘 보냈는지 평가하지 않아도 괜찮아요. 나에게 무슨 일이 있었는지 살펴봐요." /><div className="content-grid"><Card><div className="section-header"><h2>{date === today ? "오늘의 나를 돌아보기" : "지난 기록 돌아보기"}</h2><span className="pill">{date}</span></div><form key={date} onSubmit={submit}>{prompts.map((prompt, i) => <Field key={prompt} name={`journal-${i}`} label={prompt} placeholder={i === 0 ? "기뻤거나, 힘들었거나, 그냥 평범했던 일도 좋아요." : "꼭 답을 알아야 하는 것은 아니에요."} maxLength={2000} value={entry?.answers[i] ?? ""} />)}<div className="form-footer"><span className="small">나만 보는 기록 · 로컬 데모</span><button className="button" disabled={store.blocked}>{entry ? "기록 수정하기" : "나의 기록 마무리"}</button></div><Feedback error={error || store.error} success={success} /></form></Card><div className="stack"><Card className="soft"><span className="decorative-icon" aria-hidden="true">✎</span><h2>기록을 위한 약속</h2><p>글을 잘 쓸 필요는 없어요. 매일 쓰지 않아도 괜찮아요. 다른 사람이 원하는 대답을 작성하지 않아도 돼요.</p><div className="note">일기는 교사·학부모 화면에 표시하지 않아요. 이 데모에는 실제 인증이 없어 같은 브라우저를 쓰는 사람의 접근을 막을 수는 없어요. 가상의 내용만 적어 주세요.</div></Card><Card><h2>나의 기록 모아보기</h2>{date !== today && <button className="button alt mb-4" onClick={() => { setDate(today); setSuccess(""); setError(""); }}>오늘 일기 쓰기</button>}{store.data.length ? <div className="stack compact">{store.data.map((journal) => <button className={`journal-link ${date === journal.date ? "selected" : ""}`} aria-pressed={date === journal.date} key={journal.id} onClick={() => { setDate(journal.date); setSuccess(""); setError(""); }}><span>{journal.date}</span><span>기록 보기 ↗</span></button>)}</div> : <Empty>아직 기록이 없어요. 한 문장만 남겨도 좋아요.</Empty>}</Card></div></div></>;
}
