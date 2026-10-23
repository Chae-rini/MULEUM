import type { Identity } from '../auth/policy.ts';

export const statusLabels = { waiting: '답변 기다리는 중', answered: '답변 도착', follow_up: '이어 묻기', resolved: '마무리' } as const;
export type Visibility = 'private' | 'teacher';
export interface QuestionThread {
  id: string; student_id: string; assignment_id: string | null; title: string; body: string;
  visibility: Visibility; status: keyof typeof statusLabels; version: number; created_at: string; updated_at: string;
}
export interface QuestionMessage {
  id: string; thread_id: string; author_id: string; kind: 'answer' | 'follow_up'; body: string; created_at: string; sequence: number;
}
export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const canUseQuestions = (identity: Identity) => identity.mode === 'supabase' && identity.roles.some(role => role === 'student' || role === 'teacher');
export const canAsk = (identity: Identity) => canUseQuestions(identity) && identity.roles.includes('student') && identity.enrollment === 'active';
export function questionInput(form: FormData) {
  const id = String(form.get('request_id') ?? '');
  const title = String(form.get('title') ?? '').trim();
  const body = String(form.get('body') ?? '').trim();
  const visibility = String(form.get('visibility') ?? '');
  if (!isUuid(id) || !title || title.length > 120 || !body || body.length > 4000 || !['private', 'teacher'].includes(visibility)) throw new Error('질문 제목·내용과 공개 범위를 확인해 주세요.');
  return { p_id: id, p_title: title, p_body: body, p_visibility: visibility as Visibility };
}
export function updateInput(form: FormData) {
  const id = String(form.get('thread_id') ?? '');
  const rawVersion = String(form.get('version') ?? '');
  const version = Number(rawVersion);
  const action = String(form.get('operation') ?? '');
  const value = String(form.get('value') ?? '').trim();
  if (!isUuid(id) || !/^\d+$/.test(rawVersion) || !Number.isSafeInteger(version) || version < 1 || !['message', 'visibility', 'resolve', 'reopen'].includes(action) ||
    (action === 'message' && (!value || value.length > 4000)) || (action === 'visibility' && !['private', 'teacher'].includes(value))) throw new Error('입력 내용과 요청을 확인해 주세요.');
  return { p_thread: id, p_version: version, p_action: action, p_value: value };
}
