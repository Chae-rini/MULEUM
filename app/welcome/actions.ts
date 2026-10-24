"use server";

import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/server";
import { resolveIdentity, rpc, RpcError } from "@/lib/auth/supabase";
import { memberHome } from "@/lib/auth/policy";
import { invitationErrorMessages, parseOnboardingForm } from "@/lib/auth/invitations";

export interface WelcomeState { error?: string }

function seoulToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function completeOnboarding(_previous: WelcomeState, form: FormData): Promise<WelcomeState> {
  const session = await currentSession();
  if (!session) return { error: "다시 로그인해 주세요." };
  const input = parseOnboardingForm(form, seoulToday());
  if ("error" in input) return input;
  let destination = "/welcome";
  try {
    // The owner comes only from the verified access token inside the database function.
    const result = await rpc<string>(session.config, session.token, "complete_onboarding", {
      p_full_name: input.fullName, p_birth_date: input.birthDate, p_region: input.region, p_privacy_consent: true,
    });
    if (result === "active") {
      const identity = await resolveIdentity(session.config, session.token);
      if (identity) destination = memberHome(identity);
    }
  } catch (error) {
    const message = error instanceof RpcError && error.code ? invitationErrorMessages[error.code] : undefined;
    return { error: message ?? "저장하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요. 입력한 내용은 그대로 남아 있어요." };
  }
  redirect(destination);
}
