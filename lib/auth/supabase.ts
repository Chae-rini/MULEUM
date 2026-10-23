import { approvedIdentity } from "./policy.ts";

export interface AuthConfig { url: string; key: string }
export function authConfig(env: Record<string, string | undefined>): AuthConfig | null {
  if (env.MULEUM_ENABLE_AUTH !== "true") return null;
  try {
    const url = new URL(env.SUPABASE_URL ?? "");
    const key = env.SUPABASE_PUBLISHABLE_KEY ?? "";
    if ((url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))) ||
        url.username || url.password || url.search || url.hash || url.pathname !== "/" || !key.startsWith("sb_publishable_")) return null;
    return { url: url.origin, key };
  } catch { return null; }
}
export function demoEnabled(env: Record<string, string | undefined>): boolean {
  return env.NODE_ENV === "development" && env.MULEUM_ENABLE_AUTH !== "true";
}
export class AuthUnavailable extends Error {}
type Transport = typeof fetch;

async function request(config: AuthConfig, path: string, token: string | null, init: RequestInit, transport: Transport) {
  const response = await transport(`${config.url}${path}`, {
    ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
    headers: { apikey: config.key, ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) throw new AuthUnavailable("Authentication service rejected the request");
  return response;
}

export async function passwordLogin(config: AuthConfig, email: string, password: string, transport: Transport = fetch) {
  const response = await request(config, "/auth/v1/token?grant_type=password", null,
    { method: "POST", body: JSON.stringify({ email, password }) }, transport);
  const result = await response.json();
  if (typeof result.access_token !== "string" || result.access_token.length > 3800 ||
      !Number.isFinite(result.expires_in) || result.expires_in <= 0) throw new AuthUnavailable("Invalid session");
  // Refresh tokens are deliberately not persisted in this initial development flow.
  return { token: result.access_token as string, maxAge: Math.min(Math.floor(result.expires_in), 3600) };
}
export async function resolveIdentity(config: AuthConfig, token: string, transport: Transport = fetch) {
  const user = await (await request(config, "/auth/v1/user", token, {}, transport)).json();
  if (typeof user.id !== "string" || !/^[0-9a-f-]{36}$/i.test(user.id)) throw new AuthUnavailable("Invalid identity");
  const filter = `user_id=eq.${encodeURIComponent(user.id)}`;
  const [accounts, roles] = await Promise.all([
    request(config, `/rest/v1/member_accounts?${filter}&select=user_id,status,enrollment`, token, {}, transport).then(r => r.json()),
    request(config, `/rest/v1/member_roles?${filter}&status=eq.approved&select=user_id,role,status`, token, {}, transport).then(r => r.json()),
  ]);
  return approvedIdentity(user.id, Array.isArray(accounts) && accounts.length === 1 ? accounts[0] : null, roles);
}
export interface OwnProfile { full_name: string; birth_date: string; residence_region: string }
export async function ownProfile(config: AuthConfig, token: string, id: string, transport: Transport = fetch): Promise<OwnProfile | null> {
  const rows = await (await request(config, `/rest/v1/member_profiles?user_id=eq.${encodeURIComponent(id)}&select=full_name,birth_date,residence_region`, token, {}, transport)).json();
  const row = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
  if (!row || typeof row.full_name !== "string" || typeof row.birth_date !== "string" || typeof row.residence_region !== "string") return null;
  return { full_name: row.full_name, birth_date: row.birth_date, residence_region: row.residence_region };
}
export async function updateOwnProfile(config: AuthConfig, token: string, id: string, fullName: string, region: string, transport: Transport = fetch) {
  const response = await request(config, `/rest/v1/member_profiles?user_id=eq.${encodeURIComponent(id)}&select=user_id`, token, {
    method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ full_name: fullName, residence_region: region }),
  }, transport);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0].user_id !== id) throw new AuthUnavailable("Profile not updated");
}
export async function revokeSession(config: AuthConfig, token: string, transport: Transport = fetch) {
  await request(config, "/auth/v1/logout?scope=local", token, { method: "POST" }, transport);
}
