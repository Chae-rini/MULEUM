import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookie, cookieOptions, demoCookie, inviteCookie, pkceCookie } from "@/lib/auth/server";
import { authConfig, onboardingStatus, pkceExchange, resolveIdentity, revokeSession, rpc, RpcError } from "@/lib/auth/supabase";
import { memberHome } from "@/lib/auth/policy";
import { isPkceVerifier } from "@/lib/auth/oauth";
import { hashInviteToken, isInviteToken } from "@/lib/auth/invitations";

const inviteErrorKeys: Record<string, string> = { MUL01: "invite-email", MUL02: "invite", MUL06: "invite-provider" };

export async function GET(request: Request) {
  const config = authConfig(process.env);
  const jar = await cookies();
  const verifier = jar.get(pkceCookie)?.value;
  const invite = jar.get(inviteCookie)?.value;
  jar.delete(pkceCookie);
  jar.delete(inviteCookie);
  const code = new URL(request.url).searchParams.get("code");
  if (!config || !isPkceVerifier(verifier) || !code || code.length > 512) redirect("/login?error=state");

  let destination = "/login?error=state";
  let session: { token: string; maxAge: number } | null = null;
  try {
    session = await pkceExchange(config, code, verifier);
    if (invite && isInviteToken(invite)) {
      try {
        await rpc(config, session.token, "accept_invitation", { p_token_hash: hashInviteToken(invite) });
      } catch (error) {
        // An existing member who reopens an old link simply signs in.
        const key = error instanceof RpcError && error.code !== "MUL03" ? inviteErrorKeys[error.code ?? ""] ?? "invite" : null;
        if (key) throw new InviteRejected(key);
      }
    }
    const status = await onboardingStatus(config, session.token);
    if (status === "active") {
      const identity = await resolveIdentity(config, session.token);
      if (!identity) throw new InviteRejected("not-invited");
      destination = memberHome(identity);
    } else if (status === "needs_profile" || status === "waiting_guardian" || status === "pending") {
      destination = "/welcome";
    } else {
      throw new InviteRejected(status === "suspended" ? "suspended" : "not-invited");
    }
    jar.delete(demoCookie);
    jar.set(authCookie, session.token, { ...cookieOptions, maxAge: session.maxAge });
  } catch (error) {
    if (session) await revokeSession(config, session.token).catch(() => undefined);
    destination = `/login?error=${error instanceof InviteRejected ? error.key : "state"}`;
  }
  redirect(destination);
}

class InviteRejected extends Error {
  readonly key: string;
  constructor(key: string) { super("Sign-in rejected"); this.key = key; }
}
