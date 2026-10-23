export const accountRoleLabels = {
  student: "학생", parent: "학부모", teacher: "선생님", alumni: "졸업생",
  administrator: "관리자", teaching_assistant: "조교", community_operator: "공동체 운영진",
} as const;
export type AccountRole = keyof typeof accountRoleLabels;
export interface Identity {
  id: string;
  mode: "demo" | "supabase";
  roles: AccountRole[];
  enrollment: "active" | "alumni" | "none";
}
export const demoRoles = ["student", "parent", "teacher", "alumni", "administrator"] as const;
export function isAccountRole(value: unknown): value is AccountRole {
  return typeof value === "string" && Object.hasOwn(accountRoleLabels, value);
}
export function canOpenRole(identity: Identity, role: unknown): role is AccountRole {
  return isAccountRole(role) && identity.roles.includes(role);
}
export function memberHome(identity: Identity): string {
  return `/member/${identity.roles[0]}`;
}
export function approvedIdentity(id: string, account: unknown, roleRows: unknown): Identity | null {
  if (!account || typeof account !== "object" || !("status" in account) || account.status !== "active" ||
      !("user_id" in account) || account.user_id !== id || !("enrollment" in account) ||
      !["active", "alumni", "none"].includes(String(account.enrollment)) || !Array.isArray(roleRows)) return null;
  const roles = Object.keys(accountRoleLabels).filter((role) => roleRows.some((row: unknown) =>
    row !== null && typeof row === "object" && "user_id" in row && row.user_id === id &&
    "role" in row && row.role === role && "status" in row && row.status === "approved")) as AccountRole[];
  return roles.length ? { id, mode: "supabase", roles, enrollment: account.enrollment as Identity["enrollment"] } : null;
}
