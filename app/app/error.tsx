"use client";

export default function MemberError({ reset }: { reset: () => void }) {
  return <section className="card"><h1>화면을 불러오지 못했어요.</h1><p>저장한 기록은 브라우저에 남아 있어요. 다시 시도해 주세요.</p><button className="button" onClick={reset}>다시 시도</button></section>;
}
