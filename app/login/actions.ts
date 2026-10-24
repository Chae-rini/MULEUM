"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookie, demoCookie, cookieOptions, createDemoSession, requireIdentity } from "@/lib/auth/server";
import { authConfig, demoEnabled, revokeSession, updateOwnProfile } from "@/lib/auth/supabase";
import { demoRoles } from "@/lib/auth/policy";
import { revalidatePath } from "next/cache";
import { revokeAllSubscriptions } from "@/lib/notifications/server";

export interface ActionState { error?: string; success?: string }

export async function demoLogin(form: FormData) {
  const role = String(form.get("role") ?? "");
  if (!demoEnabled(process.env) || !demoRoles.some(item => item === role)) redirect("/login");
  const jar = await cookies();
  jar.delete(authCookie);
  jar.set(demoCookie, createDemoSession(role), { ...cookieOptions, maxAge: 3600 });
  redirect(`/member/${role}`);
}

export async function logout(devicePushFailed = false) {
  const jar = await cookies();
  const token = jar.get(authCookie)?.value;
  const config = authConfig(process.env);
  let revokeFailed = false;
  let pushFailed = devicePushFailed === true;
  if (config && token) {
    if (process.env.MULEUM_NOTIFICATION_SCHEMA_READY === "true") {
      try { await revokeAllSubscriptions(config, token); } catch { pushFailed = true; }
    }
    try { await revokeSession(config, token); } catch { revokeFailed = true; }
  }
  jar.delete(authCookie);
  jar.delete(demoCookie);
  redirect(revokeFailed ? "/login?logout=local" : pushFailed ? "/login?logout=push-unconfirmed" : "/login?logout=done");
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
