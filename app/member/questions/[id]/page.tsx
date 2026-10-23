import Link from 'next/link';
import { notFound } from 'next/navigation';
import { questionContext } from '@/lib/questions/server';
import { canAsk, isUuid, statusLabels } from '@/lib/questions/model';
import { AuthenticatedShell } from '@/components/authenticated-shell';
import { Card, Heading } from '@/components/ui';
import { ManageQuestionForm, MessageForm } from '@/components/member-questions/forms';

export const metadata = { title: '질문 대화 | 물음', robots: { index: false, follow: false } };
export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { identity, client } = await questionContext();
  const { id } = await params;
  if (!client || !isUuid(id)) notFound();
  let thread;
  let messages;
  try { thread = await client.thread(id); messages = thread ? await client.messages(id) : []; }
  catch { return <AuthenticatedShell identity={identity} current="questions"><Heading eyebrow="CONNECTION" title="질문을 불러오지 못했어요." description="연결 상태를 확인하고 다시 시도해 주세요." /><Link href="/member/questions" className="button line">질문 목록으로</Link></AuthenticatedShell>; }
  if (!thread) notFound();
  const owner = thread.student_id === identity.id;
  const writable = owner ? canAsk(identity) : identity.roles.includes('teacher');
  const canMessage = writable && thread.status !== 'resolved' && (!owner || messages.some(message => message.kind === 'answer'));
  return <AuthenticatedShell identity={identity} current="questions">
    <Link className="text-button mb-4" href="/member/questions">← 질문 목록</Link>
    <Heading eyebrow={statusLabels[thread.status]} title={thread.title} description={thread.visibility === 'private' ? '나만 보는 질문과 대화예요.' : '이 대화에 연결된 담당 선생님에게 공유한 기록이에요.'} />
    <div className="content-grid"><div className="stack"><Card><h2>처음 남긴 질문</h2><p className="record-text">{thread.body}</p><p className="small">{thread.created_at.slice(0,10)}</p></Card>
      <Card><h2>함께 이어가는 대화</h2>{!messages.length && <p className="empty">아직 답변이 없어요. 선생님과 공유한 질문에 답변이 도착하면 이어 물을 수 있어요.</p>}
        <div className="question-list">{messages.map(message => <article className="question-item" key={message.id}><h3>{message.kind === 'answer' ? '선생님 답변' : '학생의 후속 질문'}</h3><p className="record-text">{message.body}</p><p className="small mb-0">{message.created_at.slice(0,10)}</p></article>)}</div>
      </Card>{canMessage && <Card><MessageForm key={thread.version} thread={thread} owner={owner} /></Card>}
    </div>{owner && writable && <Card><h2>내 질문 관리</h2><ManageQuestionForm key={thread.version} thread={thread} /></Card>}</div>
  </AuthenticatedShell>;
}
