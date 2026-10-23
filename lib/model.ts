export interface Question { id: string; text: string; reason: string; date: string; demo: boolean }
export interface Goal { id: string; text: string; week: string; done: boolean }
export interface Journal { id: string; date: string; answers: [string, string, string] }
export interface LessonRecord { id: string; student: string; date: string; completed: number[] }
export interface TeacherNote { id: string; student: string; text: string; date: string }
export interface Report { id: string; student: string; approved: boolean; consented: boolean; growth: string; next: string }

export const students = [
  { id: "student-a", name: "학생 A", subject: "수학", topic: "이차함수의 최대·최소", observation: "그래프의 의미를 자기 언어로 설명하는 연습 중이에요.", question: "왜 꼭짓점에서 최댓값이나 최솟값을 가질까?" },
  { id: "student-b", name: "학생 B", subject: "국어", topic: "문단별 주장과 근거", observation: "글을 읽고 독립적인 질문을 만들어 보고 있어요.", question: "이 문장이 주장의 근거가 되는 이유는 무엇일까?" },
  { id: "student-c", name: "학생 C", subject: "영어", topic: "긴 문장의 수식 구조", observation: "이번 주의 학습 계획을 직접 설정했어요.", question: "긴 문장을 어떤 단위로 나누어 읽으면 좋을까?" },
] as const;

export const lessonSteps = [
  { title: "인사와 주간 리뷰", description: "학생의 일상과 지난 한 주를 편안하게 듣는 시간", minutes: 5 },
  { title: "독서", description: "자신이 선택한 책을 읽고 떠오르는 물음을 찾기", minutes: 10 },
  { title: "영단어", description: "인출·필기로 점검하되 단어 수는 학생 수준에 맞게 조정", minutes: 10 },
  { title: "본 수업", description: "개념과 원리를 이해하고 왜 그런지 질문하기", minutes: 55 },
  { title: "짧은 휴식", description: "눈과 몸을 잠시 쉬게 하기", minutes: 5 },
  { title: "독립 문제풀이", description: "스스로 시도하고 막힌 지점을 확인하기", minutes: 25 },
  { title: "오늘의 리뷰와 다음 물음", description: "질의응답·다음 목표·토론 주제·플랫폼 기록", minutes: 10 },
] as const;

export const sampleQuestions: Question[] = [
  { id: "sample-q1", text: "왜 같은 문제를 여러 번 틀리는 걸까?", reason: "실수라고만 생각했는데 이유를 알고 싶다.", date: "가상 예시", demo: true },
  { id: "sample-q2", text: "내가 요즘 가장 재미있어하는 일은 무엇일까?", reason: "", date: "가상 예시", demo: true },
];

export const reports: Report[] = [
  { id: "report-a", student: "학생 A", approved: true, consented: true, growth: "학생이 이번 주의 학습 목표를 직접 선택하고, 모르는 개념을 질문으로 표현하는 연습을 했습니다.", next: "수학 문제의 풀이 과정을 자기 언어로 설명하고, 잘못된 단계에 대한 질문을 스스로 구성하는 연습을 이어갑니다." },
  { id: "report-draft", student: "학생 B", approved: false, consented: false, growth: "검토 중인 가상 초안", next: "아직 공유되지 않은 방향" },
];

export function visibleReports(items: Report[]): Report[] {
  return items.filter((item) => item.approved && item.consented);
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function weekStart(date: string): string {
  const day = new Date(`${date}T12:00:00`);
  day.setDate(day.getDate() - (day.getDay() + 6) % 7);
  return localDate(day);
}

export function validateText(value: string, maximum: number): string | null {
  if (!value.trim()) return "공백만 입력할 수 없어요. 내용을 먼저 적어 주세요.";
  if (value.trim().length > maximum) return `${maximum}자 이내로 적어 주세요.`;
  return null;
}

export function lessonProgress(completed: number[]): { count: number; minutes: number; percent: number } {
  const unique = [...new Set(completed)].filter((index) => Number.isInteger(index) && index >= 0 && index < lessonSteps.length);
  const minutes = unique.reduce((sum, index) => sum + lessonSteps[index].minutes, 0);
  return { count: unique.length, minutes, percent: minutes / 120 * 100 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown, max: number): value is string { return typeof value === "string" && value.length <= max; }
function base(value: unknown): value is Record<string, unknown> & { id: string } {
  return isRecord(value) && text(value.id, 100) && value.id.length > 0;
}
export const isQuestions = (value: unknown): value is Question[] => Array.isArray(value) && value.every((q: unknown) => base(q) && text(q.text, 300) && !!q.text.trim() && text(q.reason, 500) && text(q.date, 40) && typeof q.demo === "boolean");
export const isGoals = (value: unknown): value is Goal[] => Array.isArray(value) && value.every((g: unknown) => base(g) && text(g.text, 120) && !!g.text.trim() && text(g.week, 10) && /^\d{4}-\d{2}-\d{2}$/.test(g.week) && typeof g.done === "boolean");
export const isJournals = (value: unknown): value is Journal[] => Array.isArray(value) && value.every((j: unknown) => base(j) && text(j.date, 10) && Array.isArray(j.answers) && j.answers.length === 3 && j.answers.every((a: unknown) => text(a, 2000)) && j.answers.some((a: string) => a.trim()));
export const isLessons = (value: unknown): value is LessonRecord[] => Array.isArray(value) && value.every((l: unknown) => base(l) && text(l.date, 10) && students.some((s) => s.id === l.student) && Array.isArray(l.completed) && l.completed.every((i: unknown) => typeof i === "number" && Number.isInteger(i) && i >= 0 && i < 7));
export const isNotes = (value: unknown): value is TeacherNote[] => Array.isArray(value) && value.every((n: unknown) => base(n) && students.some((s) => s.id === n.student) && text(n.text, 2000) && !!n.text.trim() && text(n.date, 40));

export interface StorageAdapter { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function readStored<T>(storage: StorageAdapter, key: string, fallback: T, validate: (value: unknown) => value is T): T {
  const raw = storage.getItem(key);
  if (raw === null) return fallback;
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value) || value.version !== 1 || !validate(value.data)) throw new Error("Invalid saved data");
  return value.data;
}
export function writeStored<T>(storage: StorageAdapter, key: string, value: T): void {
  storage.setItem(key, JSON.stringify({ version: 1, data: value }));
}
