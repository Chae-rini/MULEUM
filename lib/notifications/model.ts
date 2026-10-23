import type { AccountRole } from '../auth/policy.ts';

export const notificationLabels = {
  question_answer: '질문에 새로운 답변', student_question: '담당 학생의 새로운 질문',
  lesson_reminder: '수업 시작 전 알림', schedule_changed: '수업 일정 변경', notice: '새로운 공지사항', diary: '5분 일기 · 직접 선택',
} as const;
export type NotificationKind = keyof typeof notificationLabels;
export interface NotificationPreferences {
  enabled: boolean; kinds: NotificationKind[]; timezone: string;
  quietStart: number; quietEnd: number; diaryMinute: number | null;
}
export const defaultPreferences: NotificationPreferences = {
  enabled: false, kinds: [], timezone: 'Asia/Seoul', quietStart: 1320, quietEnd: 480, diaryMinute: null,
};
export function allowedKinds(roles: AccountRole[]): NotificationKind[] {
  return (Object.keys(notificationLabels) as NotificationKind[]).filter(kind => {
    if (kind === 'question_answer' || kind === 'diary') return roles.includes('student');
    if (kind === 'student_question') return roles.includes('teacher');
    if (kind === 'notice') return true;
    return roles.some(role => ['student','teacher','parent'].includes(role));
  });
}
export function validatePreferences(value: unknown): NotificationPreferences {
  if (!value || typeof value !== 'object') throw new Error('Invalid preferences');
  const p = value as Record<string, unknown>;
  const minute = (v: unknown) => Number.isInteger(v) && Number(v) >= 0 && Number(v) < 1440;
  if (typeof p.enabled !== 'boolean' || !Array.isArray(p.kinds) || p.kinds.some(k => typeof k !== 'string' || !Object.hasOwn(notificationLabels,k)) ||
    typeof p.timezone !== 'string' || !minute(p.quietStart) || !minute(p.quietEnd) || !(p.diaryMinute === null || minute(p.diaryMinute)) ||
    (p.kinds.includes('diary') && p.diaryMinute === null)) throw new Error('Invalid preferences');
  new Intl.DateTimeFormat('en',{timeZone:p.timezone}).format();
  return { enabled:p.enabled, kinds:[...new Set(p.kinds)] as NotificationKind[], timezone:p.timezone, quietStart:Number(p.quietStart), quietEnd:Number(p.quietEnd), diaryMinute:p.diaryMinute as number|null };
}
export function localMinute(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  return Number(parts.find(p=>p.type==='hour')?.value)*60+Number(parts.find(p=>p.type==='minute')?.value);
}
export function isQuiet(p: NotificationPreferences, now: Date) {
  const m=localMinute(now,p.timezone);
  return p.quietStart===p.quietEnd ? false : p.quietStart<p.quietEnd ? m>=p.quietStart&&m<p.quietEnd : m>=p.quietStart||m<p.quietEnd;
}
export interface NotificationFacts {
  kind: NotificationKind; recipient: { id:string; active:boolean; roles:AccountRole[] };
  studentId?: string; questionShared?: boolean; pinnedTeacherId?: string; relationshipApproved?: boolean;
  studentActive?: boolean; hasAnswer?: boolean; guardianApproved?: boolean; parentShareApproved?: boolean;
  noticeApproved?: boolean; noticeAudience?: AccountRole[];
}
// Inputs must come from trusted server DB queries, never from a browser event body.
export function canReceive(f: NotificationFacts) {
  if (!f.recipient.active || !allowedKinds(f.recipient.roles).includes(f.kind)) return false;
  switch(f.kind) {
    case 'question_answer': return f.hasAnswer===true && f.studentId===f.recipient.id;
    case 'student_question': return f.questionShared===true && f.studentActive===true && f.relationshipApproved===true && f.pinnedTeacherId===f.recipient.id;
    case 'diary': return f.studentId===f.recipient.id;
    case 'lesson_reminder': case 'schedule_changed':
      return (f.recipient.roles.includes('student')&&f.studentId===f.recipient.id) ||
        (f.recipient.roles.includes('teacher')&&f.relationshipApproved===true&&f.pinnedTeacherId===f.recipient.id&&f.studentActive===true) ||
        (f.recipient.roles.includes('parent')&&f.guardianApproved===true&&f.parentShareApproved===true&&f.studentActive===true);
    case 'notice': return f.noticeApproved===true && f.recipient.roles.some(role=>f.noticeAudience?.includes(role));
  }
}
export function planNotification(f: NotificationFacts, p: NotificationPreferences, now: Date) {
  if (!canReceive(f) || !p.enabled || !p.kinds.includes(f.kind)) return 'skip';
  if (isQuiet(p,now)) return 'defer';
  if (f.kind==='diary' && localMinute(now,p.timezone)!==p.diaryMinute) return 'skip';
  return 'ready';
}
export function safePayload(kind: NotificationKind) { return { kind }; }
