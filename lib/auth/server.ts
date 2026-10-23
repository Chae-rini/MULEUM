import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readDemoSession, signDemoSession } from "./demo-session";
import { authConfig, demoEnabled, resolveIdentity, ownProfile } from "./supabase";
import type { Identity } from "./policy";

export const authCookie = "muleum-auth";
export const demoCookie = "muleum-demo-session";
const processState = globalThis as typeof globalThis & { muleumDemoSecret?: string };
function demoSecret() {
  return processState.muleumDemoSecret ??= randomBytes(32).toString("hex");
}
export function createDemoSession(role: string) { return signDemoSession(role, demoSecret()); }
export const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function currentIdentity(): Promise<Identity | null> {
  const jar = await cookies();
  const config = authConfig(process.env);
  if (config) {
    const token = jar.get(authCookie)?.value;
    if (!token) return null;
    try { return await resolveIdentity(config, token); } catch { return null; }
  }
  if (!demoEnabled(process.env)) return null;
  return readDemoSession(jar.get(demoCookie)?.value ?? "", demoSecret());
}
export async function requireIdentity() {
  const identity = await currentIdentity();
  if (!identity) redirect("/login");
  return identity;
}
export async function currentProfile(identity: Identity) {
  if (identity.mode === "demo") return {
    full_name: `가상 ${identity.roles[0] === "student" ? "학생" : identity.roles[0] === "parent" ? "학부모" : identity.roles[0] === "teacher" ? "선생님" : identity.roles[0] === "alumni" ? "졸업생" : "관리자"}`,
    birth_date: identity.roles[0] === "student" ? "2010-05-12" : "1995-03-15", residence_region: "가상 지역",
  };
  const config = authConfig(process.env);
  const token = (await cookies()).get(authCookie)?.value;
  if (!config || !token) return null;
  try { return await ownProfile(config, token, identity.id); } catch { return null; }
}
