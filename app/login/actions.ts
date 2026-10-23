"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookie, demoCookie, cookieOptions, createDemoSession, requireIdentity } from "@/lib/auth/server";
import { authConfig, demoEnabled, passwordLogin, resolveIdentity, revokeSession, updateOwnProfile } from "@/lib/auth/supabase";
import { demoRoles, memberHome } from "@/lib/auth/policy";
import { revalidatePath } from "next/cache";

export interface ActionState { error?: string; success?: string }

export async function login(_previous: ActionState, form: FormData): Promise<ActionState> {
  const config = authConfig(process.env);
  if (!config) return { error: "실제 로그인이 아직 설정되지 않았어요. 아래 가상 계정 체험을 이용해 주세요." };
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 1024) {
    return { error: "이메일과 비밀번호를 확인해 주세요." };
  }
  let destination: string;
  try {
    const session = await passwordLogin(config, email, password);
    const identity = await resolveIdentity(config, session.token);
    if (!identity) {
      await revokeSession(config, session.token).catch(() => undefined);
      return { error: "로그인할 수 없어요. 입력 정보 또는 초대·계정 승인 상태를 확인해 주세요." };
    }
    const jar = await cookies();
    jar.delete(demoCookie);
    jar.set(authCookie, session.token, { ...cookieOptions, maxAge: session.maxAge });
    destination = memberHome(identity);
  } catch {
    return { error: "로그인할 수 없어요. 입력 정보 또는 연결 상태를 확인하고 잠시 후 다시 시도해 주세요." };
  }
  redirect(destination);
}

export async function demoLogin(form: FormData) {
  const role = String(form.get("role") ?? "");
  if (!demoEnabled(process.env) || !demoRoles.some(item => item === role)) redirect("/login");
  const jar = await cookies();
  jar.delete(authCookie);
  jar.set(demoCookie, createDemoSession(role), { ...cookieOptions, maxAge: 3600 });
  redirect(`/member/${role}`);
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(authCookie)?.value;
  const config = authConfig(process.env);
  let revokeFailed = false;
  if (config && token) {
    try { await revokeSession(config, token); } catch { revokeFailed = true; }
  }
  jar.delete(authCookie);
  jar.delete(demoCookie);
  redirect(revokeFailed ? "/login?logout=local" : "/login?logout=done");
}

export async function saveProfile(_previous: ActionState, form: FormData): Promise<ActionState> {
  const identity = await requireIdentity();
  if (identity.mode !== "supabase") return { error: "가상 계정의 기본 정보는 변경하지 않아요. 프로필 편집 시연을 이용해 주세요." };
  const name = String(form.get("full_name") ?? "").trim();
  const region = String(form.get("residence_region") ?? "").trim();
  if (!name || name.length > 80 || !region || region.length > 80) return { error: "성명과 시·군·구를 각각 1~80자로 입력해 주세요." };
  const config = authConfig(process.env);
  const token = (await cookies()).get(authCookie)?.value;
  if (!config || !token) return { error: "다시 로그인해 주세요." };
  try {
    // The owner ID comes only from the freshly verified server identity.
    await updateOwnProfile(config, token, identity.id, name, region);
  } catch { return { error: "저장하지 못했어요. 연결 상태와 계정 승인을 확인한 뒤 다시 시도해 주세요." }; }
  revalidatePath("/mypage");
  return { success: "내 프로필을 저장했어요." };
}
