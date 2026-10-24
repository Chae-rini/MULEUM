import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cookieOptions, inviteCookie, pkceCookie } from "@/lib/auth/server";
import { authConfig } from "@/lib/auth/supabase";
import { googleAuthorizeUrl, pkcePair, siteOrigin } from "@/lib/auth/oauth";
import { isInviteToken } from "@/lib/auth/invitations";

export async function GET(request: Request) {
  const config = authConfig(process.env);
  const origin = siteOrigin(process.env);
  if (!config || !origin) redirect("/login?error=unavailable");
  const invite = new URL(request.url).searchParams.get("invite");
  if (invite !== null && !isInviteToken(invite)) redirect("/login?error=invite");
  const { verifier, challenge } = pkcePair();
  const jar = await cookies();
  jar.set(pkceCookie, verifier, { ...cookieOptions, maxAge: 600 });
  if (invite) jar.set(inviteCookie, invite, { ...cookieOptions, maxAge: 600 });
  else jar.delete(inviteCookie);
  redirect(googleAuthorizeUrl(config, `${origin}/auth/callback`, challenge));
}
