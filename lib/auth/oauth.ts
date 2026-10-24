import { createHash, randomBytes } from "node:crypto";
import type { AuthConfig } from "./supabase.ts";

// PKCE (RFC 7636): the verifier stays in an httpOnly cookie; only its S256 challenge goes to the provider.
export function pkcePair() {
  const verifier = randomBytes(64).toString("base64url");
  return { verifier, challenge: pkceChallenge(verifier) };
}
export function pkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}
export function isPkceVerifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43,128}$/.test(value);
}
// Mirrors the parameters supabase-js sends to Supabase Auth's /authorize endpoint.
export function googleAuthorizeUrl(config: AuthConfig, redirectTo: string, challenge: string) {
  const params = new URLSearchParams({ provider: "google", redirect_to: redirectTo, code_challenge: challenge, code_challenge_method: "s256" });
  return `${config.url}/auth/v1/authorize?${params}`;
}
// The callback URL comes from configuration, never from the request Host header.
export function siteOrigin(env: Record<string, string | undefined>): string | null {
  try {
    const url = new URL(env.MULEUM_SITE_URL ?? "");
    const local = url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname);
    if ((url.protocol !== "https:" && !local) || url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    return url.origin;
  } catch { return null; }
}
