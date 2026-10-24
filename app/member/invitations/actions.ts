"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession, requireIdentity } from "@/lib/auth/server";
import { rpc } from "@/lib/auth/supabase";
import { siteOrigin } from "@/lib/auth/oauth";
import { newInviteToken, parseInviteForm } from "@/lib/auth/invitations";

export interface InviteState { error?: string; link?: string; email?: string }
export interface ConsentState { error?: string }
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Every action re-checks the administrator role on the server; the database checks it again.
async function adminSession() {
  const identity = await requireIdentity();
  if (identity.mode !== "supabase" || !identity.roles.includes("administrator")) return null;
  return currentSession();
}

export async function createInvite(_previous: InviteState, form: FormData): Promise<InviteState> {
  const session = await adminSession();
  if (!session) return { error: "관리자 계정으로만 초대할 수 있어요." };
  const origin = siteOrigin(process.env);
  if (!origin) return { error: "MULEUM_SITE_URL 설정이 필요해요." };
  const input = parseInviteForm(form);
  if ("error" in input) return input;
  const { token, hash } = newInviteToken();
  try {
    await rpc(session.config, session.token, "create_invitation", { p_email: input.email, p_role: input.role, p_teacher: input.teacher, p_token_hash: hash, p_days: input.days });
  } catch {
    return { error: "초대를 만들지 못했어요. 담당 선생님이 활성 상태인지, 입력값이 맞는지 확인해 주세요." };
  }
  revalidatePath("/member/invitations");
  return { link: `${origin}/invite/${token}`, email: input.email };
}

export async function revokeInvite(form: FormData) {
  const session = await adminSession();
  const id = String(form.get("id") ?? "");
  if (!session || !uuidPattern.test(id)) return;
  await rpc(session.config, session.token, "revoke_invitation", { p_id: id }).catch(() => undefined);
  revalidatePath("/member/invitations");
}

export async function confirmConsent(_previous: ConsentState, form: FormData): Promise<ConsentState> {
  const session = await adminSession();
  if (!session) return { error: "관리자 계정으로만 확인할 수 있어요." };
  const user = String(form.get("user_id") ?? "");
  const reference = String(form.get("reference") ?? "").trim();
  if (!uuidPattern.test(user)) return { error: "대상 회원을 확인하지 못했어요." };
  if (!reference || reference.length > 200) return { error: "보호자 동의를 확인한 방법과 날짜를 1~200자로 남겨 주세요." };
  try {
    await rpc(session.config, session.token, "confirm_guardian_consent", { p_user: user, p_reference: reference });
  } catch {
    return { error: "확인하지 못했어요. 이미 처리됐거나, 담당 선생님이 더 이상 활성 상태가 아닐 수 있어요." };
  }
  // The confirmed member leaves the pending list, so the result is shown at page level.
  revalidatePath("/member/invitations");
  redirect("/member/invitations?confirmed=1");
}
