import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { questionContext } from '@/lib/questions/server';
import { canAsk, statusLabels, type QuestionThread } from '@/lib/questions/model';
import { AuthenticatedShell } from '@/components/authenticated-shell';
import { Card, Heading } from '@/components/ui';
import { CreateQuestionForm } from '@/components/member-questions/forms';

export const metadata = { title: '질문과 대화 | 물음', robots: { index: false, follow: false } };
export default async function QuestionsPage() {
  const { identity, client } = await questionContext();
  let threads: QuestionThread[] = [];
  let failed = false;
  if (client) { try { threads = await client.list(); } catch { failed = true; } }
  return <AuthenticatedShell identity={identity} current="questions">
    <Heading eyebrow="QUESTIONS & CONVERSATION" title="질문과 대화" description="궁금한 것을 남기고, 담당 선생님과 생각을 이어가요. AI가 자동 답변하지 않아요." />
    {!client ? <Card><h2>회원 질문 공간에 연결할 수 없어요.</h2><p>실제 인증을 마친 학생·선생님 계정이 필요해요. 가상 로그인과 기존 시연 기록은 이 공간에 연결되지 않아요.</p><Link className="button line" href="/app/questions">기존 질문 시연 보기</Link></Card> : <>
      {failed && <p className="notice error" role="alert">질문을 불러오지 못했어요. 연결 상태와 DB 설정을 확인한 뒤 새로고침해 주세요.</p>}
      <div className="content-grid"><div className="stack"><Card><h2>나에게 허용된 질문</h2><p className="small">최근 업데이트된 질문 최대 100개를 보여줘요.</p>
        {!failed && !threads.length && <p className="empty">아직 볼 수 있는 질문이 없어요. 비공개 질문은 작성자에게만 보여요.</p>}
        <div className="question-list">{threads.map(thread => <article className="question-item" key={thread.id}><span className="pill">{statusLabels[thread.status]}</span><h3 className="mt-3"><Link className="text-button" href={`/member/questions/${thread.id}`}>{thread.title}</Link></h3><p className="small mb-0">{thread.visibility === 'private' ? '나만 보기' : '담당 선생님에게 공유'} · {thread.updated_at.slice(0,10)}</p></article>)}</div>
      </Card></div>{canAsk(identity) && <Card><h2>새 질문 남기기</h2><CreateQuestionForm requestId={randomUUID()} /></Card>}</div>
    </>}
  </AuthenticatedShell>;
}
