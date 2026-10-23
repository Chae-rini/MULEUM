'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { questionContext } from '@/lib/questions/server';
import { canAsk, questionInput, updateInput } from '@/lib/questions/model';
import { QuestionRequestError } from '@/lib/questions/client';

export interface QuestionActionState { error?: string; success?: string }
export async function createQuestion(_previous: QuestionActionState, form: FormData): Promise<QuestionActionState> {
  const { identity, client } = await questionContext();
  if (!client || !canAsk(identity)) return { error: '승인된 재학생 계정으로 로그인해 주세요.' };
  let input;
  try { input = questionInput(form); } catch { return { error: '질문 제목·내용과 공개 범위를 확인해 주세요.' }; }
  let id;
  try {
    if (input.p_visibility === 'teacher' && !(await client.assignments()).some(a => a.student_id === identity.id)) return { error: '승인된 담당 선생님이 필요해요. 나만 보기로 저장할 수 있어요.' };
    id = await client.create(input);
  } catch (error) { return { error: error instanceof QuestionRequestError ? error.message : '연결하지 못했어요. 입력 내용을 유지한 채 다시 시도해 주세요.' }; }
  revalidatePath('/member/questions');
  redirect(`/member/questions/${id}`);
}
export async function updateQuestion(_previous: QuestionActionState, form: FormData): Promise<QuestionActionState> {
  const { identity, client } = await questionContext();
  if (!client) return { error: '이 요청을 처리할 권한이 없어요.' };
  let input;
  try { input = updateInput(form); } catch { return { error: '입력 내용과 요청을 확인해 주세요.' }; }
  try {
    const thread = await client.thread(input.p_thread);
    if (!thread) return { error: '질문이 없거나 접근할 수 없어요.' };
    const owner = thread.student_id === identity.id;
    if (owner ? !canAsk(identity) : (!identity.roles.includes('teacher') || input.p_action !== 'message' || thread.visibility !== 'teacher')) return { error: '이 요청을 처리할 권한이 없어요.' };
    if (!owner && !(await client.assignments()).some(a => a.id === thread.assignment_id && a.teacher_id === identity.id && a.student_id === thread.student_id)) return { error: '담당 관계가 변경됐어요. 다시 확인해 주세요.' };
    if (input.p_action === 'visibility' && input.p_value === 'teacher' && !(await client.assignments()).some(a => a.student_id === identity.id)) return { error: '승인된 담당 선생님이 필요해요.' };
    await client.update(input);
  } catch (error) { return { error: error instanceof QuestionRequestError ? error.message : '연결하지 못했어요. 입력 내용을 유지한 채 다시 시도해 주세요.' }; }
  revalidatePath('/member/questions');
  revalidatePath(`/member/questions/${input.p_thread}`);
  return { success: '저장했어요.' };
}
