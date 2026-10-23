import type { AuthConfig } from '../auth/supabase.ts';
import type { QuestionThread, QuestionMessage } from './model.ts';

export class QuestionRequestError extends Error {}
export function questionClient(config: AuthConfig, token: string, transport: typeof fetch = fetch) {
  async function request<T>(path: string, body?: object): Promise<T> {
    const response = await transport(`${config.url}/rest/v1/${path}`, {
      method: body ? 'POST' : 'GET', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
      headers: { apikey: config.key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      // Never surface database details or user content in errors/logs.
      throw new QuestionRequestError(response.status === 409 ? '기록이 변경됐어요. 새로고침 후 다시 시도해 주세요.' : '처리하지 못했어요. 연결 상태·공유 범위·담당 관계를 확인해 주세요. 입력한 내용은 그대로 남아 있어요.');
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  }
  const fields = 'id,student_id,assignment_id,title,body,visibility,status,version,created_at,updated_at';
  return {
    list: () => request<QuestionThread[]>(`question_threads?select=${fields}&order=updated_at.desc,id.desc&limit=100`),
    thread: async (id: string) => (await request<QuestionThread[]>(`question_threads?id=eq.${encodeURIComponent(id)}&select=${fields}&limit=1`))[0] ?? null,
    messages: (id: string) => request<QuestionMessage[]>(`question_messages?thread_id=eq.${encodeURIComponent(id)}&select=id,thread_id,author_id,kind,body,created_at,sequence&order=sequence.asc`),
    assignments: () => request<{ id: string; student_id: string; teacher_id: string }[]>('teacher_assignments?status=eq.approved&select=id,student_id,teacher_id'),
    create: (body: object) => request<string>('rpc/create_question', body),
    update: (body: object) => request<void>('rpc/update_question', body),
  };
}
