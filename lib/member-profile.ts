export const genderLabels = { male: "남성", female: "여성", other: "그 외 (간성, 논바이너리 등)", prefer_not_to_say: "밝히고 싶지 않음" } as const;
export type Gender = keyof typeof genderLabels;
export type AccountRole = "student" | "parent" | "teacher" | "alumni" | "administrator" | "teaching_assistant" | "community_operator";
export interface Profile {
  user_id: string; full_name: string; birth_date: string; residence_region: string;
  created_at: string; updated_at: string;
}
export interface OptionalProfile { gender: Gender | null; gender_description: string | null }
export function koreaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now);
}
export function ageOn(birth: string, today = koreaToday()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  const date = new Date(`${birth}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== birth || birth > today) return null;
  return Number(today.slice(0, 4)) - Number(birth.slice(0, 4)) - (today.slice(5) < birth.slice(5) ? 1 : 0);
}
export function ageCategory(birth: string, today = koreaToday()) {
  const age = ageOn(birth, today);
  return age === null ? "unverified" : age >= 19 ? "adult" : "minor";
}
export function validateProfile(profile: Profile, optional: OptionalProfile, today = koreaToday()): string | null {
  if (!profile.full_name.trim() || profile.full_name.trim().length > 80) return "성명을 1~80자로 입력해 주세요.";
  if (ageOn(profile.birth_date, today) === null) return "미래가 아닌 유효한 생년월일을 입력해 주세요.";
  if (!profile.residence_region.trim() || profile.residence_region.length > 80) return "시·군·구 수준의 지역을 입력해 주세요.";
  if (optional.gender !== null && !Object.hasOwn(genderLabels, optional.gender)) return "성별 선택값을 확인해 주세요.";
  if (optional.gender !== "other" && optional.gender_description) return "직접 표현은 ‘그 외’를 선택했을 때만 저장할 수 있어요.";
  if ((optional.gender_description?.length ?? 0) > 120) return "직접 표현은 120자 이내로 입력해 주세요.";
  return null;
}
