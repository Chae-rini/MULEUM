'use client';
import { useActionState, useState } from 'react';
import { createQuestion, updateQuestion } from '@/app/member/questions/actions';
import { Feedback } from '@/components/ui';
import type { QuestionThread } from '@/lib/questions/model';

export function CreateQuestionForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(createQuestion, {});
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState('private');
  return <form action={action}><input type="hidden" name="request_id" value={requestId} />
    <div className="field"><label htmlFor="question-title">질문 제목</label><input id="question-title" name="title" type="text" value={title} onChange={e => setTitle(e.target.value)} required maxLength={120} /></div>
    <div className="field"><label htmlFor="question-body">질문 내용</label><textarea id="question-body" name="body" value={body} onChange={e => setBody(e.target.value)} required maxLength={4000} aria-describedby="question-help" /><span className="hint" id="question-help">어디까지 이해했고, 무엇이 궁금한가요? 최대 4,000자.</span></div>
    <div className="field"><label htmlFor="question-visibility">질문 공개 범위</label><select id="question-visibility" name="visibility" value={visibility} onChange={e => setVisibility(e.target.value)}><option value="private">나만 보기</option><option value="teacher">담당 선생님에게 공유</option></select></div>
    <p className="small">{visibility === 'private' ? '선생님·학부모·관리자에게 공개되지 않아요.' : '현재 승인된 담당 선생님에게 질문과 대화를 공유해요. 학부모에게는 공개되지 않아요.'}</p>
    <button className="button" disabled={pending}>{pending ? '저장 중…' : '질문 저장'}</button><Feedback {...state} />
  </form>;
}
export function MessageForm({ thread, owner }: { thread: QuestionThread; owner: boolean }) {
  const [state, action, pending] = useActionState(updateQuestion, {});
  const [body, setBody] = useState('');
  return <form action={action}><ThreadFields thread={thread} /><input type="hidden" name="operation" value="message" />
    <div className="field"><label htmlFor="message-body">{owner ? '후속 질문' : '선생님 답변'}</label><textarea id="message-body" name="value" value={body} onChange={e => setBody(e.target.value)} required maxLength={4000} /></div>
    <button className="button" disabled={pending}>{pending ? '저장 중…' : owner ? '후속 질문 남기기' : '답변 남기기'}</button><Feedback {...state} />
  </form>;
}
function ThreadFields({ thread }: { thread: QuestionThread }) {
  return <><input type="hidden" name="thread_id" value={thread.id} /><input type="hidden" name="version" value={thread.version} /></>;
}
export function ManageQuestionForm({ thread }: { thread: QuestionThread }) {
  const [state, action, pending] = useActionState(updateQuestion, {});
  const [visibility, setVisibility] = useState(thread.visibility);
  return <div className="stack">
    <form action={action}><ThreadFields thread={thread} /><input type="hidden" name="operation" value="visibility" />
      <div className="field"><label htmlFor="share-choice">공개 범위 변경</label><select id="share-choice" name="value" value={visibility} onChange={e => setVisibility(e.target.value as typeof visibility)}><option value="private">나만 보기</option><option value="teacher">현재 담당 선생님에게 공유</option></select></div>
      <p className="small">공유하면 이전 답변을 포함한 대화 전체를 현재 담당 선생님이 읽을 수 있어요. 담당 변경 시 자동으로 공유하지 않아요. 나만 보기로 바꾸면 교사의 이후 접근을 막지만 이미 읽은 내용까지 회수할 수는 없어요.</p>
      <label className="check-row"><input type="checkbox" required name="confirmed" />공개 범위 변경 내용을 확인했어요.</label>
      <button className="button line mt-4" disabled={pending}>공개 범위 저장</button>
    </form>
    <form action={action}><ThreadFields thread={thread} /><input type="hidden" name="operation" value={thread.status === 'resolved' ? 'reopen' : 'resolve'} /><button className="button line" disabled={pending}>{thread.status === 'resolved' ? '다시 질문 이어가기' : '질문 마무리하기'}</button></form>
    <Feedback {...state} />
  </div>;
}
