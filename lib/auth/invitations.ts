import { createHash, randomBytes } from "node:crypto";

export const invitableRoles = { student: "학생", parent: "학부모", teacher: "선생님", administrator: "관리자" } as const;
export type InvitableRole = keyof typeof invitableRoles;

// 32 random bytes → 43 base64url characters. Only the SHA-256 digest is stored in the database.
export function newInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashInviteToken(token) };
}
export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function isInviteToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InviteInput = { email: string; role: InvitableRole; teacher: string | null; days: number };
export function parseInviteForm(form: FormData): InviteInput | { error: string } {
  const email = normalizeEmail(form.get("email"));
  if (!email) return { error: "초대할 구글 계정 이메일을 확인해 주세요." };
  const role = String(form.get("role") ?? "");
  if (!Object.hasOwn(invitableRoles, role)) return { error: "역할을 선택해 주세요." };
  const teacherValue = String(form.get("teacher") ?? "");
  const teacher = role === "student" ? (uuidPattern.test(teacherValue) ? teacherValue : null) : null;
  if (role === "student" && !teacher) return { error: "학생은 담당 선생님을 함께 지정해야 해요." };
  const days = Number(form.get("days") ?? 7);
  if (!Number.isInteger(days) || days < 1 || days > 14) return { error: "유효 기간은 1~14일로 정해 주세요." };
  return { email, role: role as InvitableRole, teacher, days };
}

export type OnboardingInput = { fullName: string; birthDate: string; region: string };
export function parseOnboardingForm(form: FormData, today: string): OnboardingInput | { error: string } {
  const fullName = String(form.get("full_name") ?? "").trim();
  const region = String(form.get("residence_region") ?? "").trim();
  const birthDate = String(form.get("birth_date") ?? "");
  if (!fullName || fullName.length > 80) return { error: "이름을 1~80자로 입력해 주세요." };
  if (!region || region.length > 80) return { error: "거주 지역(시·군·구)을 1~80자로 입력해 주세요." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(`${birthDate}T00:00:00Z`)) || birthDate > today) return { error: "생년월일을 확인해 주세요." };
  if (form.get("privacy_consent") !== "on") return { error: "개인정보 수집·이용에 동의해야 가입을 마칠 수 있어요." };
  return { fullName, birthDate, region };
}

// Database error codes raised by supabase/migrations/202610240001_invitations_onboarding.sql.
export const invitationErrorMessages: Record<string, string> = {
  MUL01: "초대받은 구글 계정으로 로그인해 주세요. 다른 계정으로는 이 초대를 사용할 수 없어요.",
  MUL02: "사용할 수 없는 초대 링크예요. 만료됐거나 이미 사용됐을 수 있어요. 관리자에게 새 링크를 요청해 주세요.",
  MUL04: "개인정보 수집·이용에 동의해야 가입을 마칠 수 있어요.",
  MUL05: "물음은 만 15세 이상부터 가입할 수 있어요.",
  MUL06: "Google 계정으로만 초대를 수락할 수 있어요.",
};
