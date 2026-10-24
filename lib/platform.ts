export const roleLabels = {
  student: "학생", parent: "학부모", teacher: "선생님", alumni: "졸업생",
  assistant: "질의응답 조교", operator: "공동체 운영진", administrator: "관리자",
} as const;

export type MemberRole = keyof typeof roleLabels;
export type AgeCategory = "minor" | "adult" | "unverified";
export type EnrollmentStatus = "active" | "alumni" | "none";

// Domain contracts for a future server; these are not authentication claims.
export interface MemberProfile {
  id: string;
  ageCategory: AgeCategory;
  enrollmentStatus: EnrollmentStatus;
  accountStatus: "invited" | "active" | "suspended";
}
export interface RoleAssignment {
  memberId: string;
  role: MemberRole;
  status: "pending" | "approved" | "revoked";
  approvedBy: string | null;
}
export interface StudentRelationship {
  studentId: string;
  memberId: string;
  kind: "primary_teacher" | "additional_teacher" | "guardian";
  status: "pending" | "approved" | "revoked";
  scopes: ("shared_questions" | "lesson_records" | "approved_reports")[];
}
export interface LessonTemplate {
  id: string;
  version: number;
  steps: { id: string; title: string; minutes: number; optional: boolean }[];
}
export interface FeeAgreementDraft {
  studentId: string;
  monthlyTuitionKrw: number | null;
  platformFeeRate: number | null;
  status: "draft";
}

export const capacityLimits = { teachers: 10, studentsPerTeacher: 10, activeStudents: 100 } as const;
export interface CapacitySnapshot {
  activeTeachers: number;
  activeStudents: number;
  assignedActiveStudents: number;
}
export function capacityIssues(snapshot: CapacitySnapshot, action: "add_teacher" | "add_student"): string[] {
  if (Object.values(snapshot).some((n) => !Number.isSafeInteger(n) || n < 0)) return ["정원 집계가 올바르지 않아요."];
  const issues: string[] = [];
  if (action === "add_teacher") {
    if (snapshot.activeTeachers >= capacityLimits.teachers) issues.push("선생님 정원 10명에 도달했어요.");
  } else {
    if (snapshot.activeTeachers === 0) issues.push("승인된 담당 선생님이 필요해요.");
    if (snapshot.activeStudents >= capacityLimits.activeStudents) issues.push("활성 학생 정원 100명에 도달했어요.");
    if (snapshot.assignedActiveStudents >= capacityLimits.studentsPerTeacher) issues.push("담당 선생님의 활성 학생 정원 10명에 도달했어요.");
  }
  return issues;
}

export const sectionDefinitions = {
  home: { path: "/app", label: "오늘의 물음", icon: "⌂", roles: Object.keys(roleLabels) as MemberRole[] },
  profile: { path: "/app/profile", label: "나의 프로필", icon: "○", roles: Object.keys(roleLabels) as MemberRole[] },
  accounts: { path: "/app/accounts", label: "회원과 연결", icon: "◇", roles: ["parent", "teacher", "administrator"] as MemberRole[] },
  videos: { path: "/app/videos", label: "복습 자료실", icon: "▷", roles: ["student", "teacher", "administrator"] as MemberRole[] },
  questions: { path: "/app/questions", label: "나의 물음", icon: "?", roles: ["student"] as MemberRole[] },
  journal: { path: "/app/journal", label: "5분 일기", icon: "✎", roles: ["student"] as MemberRole[] },
  goals: { path: "/app/goals", label: "나의 목표", icon: "◎", roles: ["student"] as MemberRole[] },
  lesson: { path: "/app/lesson", label: "과외 수업", icon: "▤", roles: ["student", "teacher"] as MemberRole[] },
  teacher: { path: "/app/teacher", label: "지도자 공간", icon: "◈", roles: ["teacher"] as MemberRole[] },
  parent: { path: "/app/parent", label: "성장 리포트", icon: "♡", roles: ["parent"] as MemberRole[] },
};
export type Section = keyof typeof sectionDefinitions;
export function isSection(value: string): value is Section {
  return Object.hasOwn(sectionDefinitions, value);
}
export function sectionFromPath(pathname: string): Section | null {
  return (Object.entries(sectionDefinitions).find(([, definition]) => definition.path === pathname)?.[0] as Section | undefined) ?? null;
}
export function defaultPreviewRole(pathname: string): MemberRole {
  if (pathname === "/app/accounts") return "administrator";
  if (pathname === "/app/teacher") return "teacher";
  if (pathname === "/app/parent") return "parent";
  return "student";
}
export function roleHome(role: MemberRole): Section {
  if (role === "teacher") return "teacher";
  if (role === "parent") return "parent";
  if (role === "alumni") return "profile";
  if (role === "administrator") return "accounts";
  return "home";
}
