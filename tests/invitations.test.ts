import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { hashInviteToken, isInviteToken, newInviteToken, normalizeEmail, parseInviteForm, parseOnboardingForm } from "../lib/auth/invitations.ts";
import { googleAuthorizeUrl, isPkceVerifier, pkceChallenge, pkcePair, siteOrigin } from "../lib/auth/oauth.ts";

const form = (values: Record<string, string | undefined>) => { const data = new FormData(); for (const [key, value] of Object.entries(values)) if (value !== undefined) data.set(key, value); return data; };
const teacher = "00000000-0000-4000-8000-000000000003";

test("invite tokens are random, URL-safe and stored only as a SHA-256 digest", () => {
  const first = newInviteToken(); const second = newInviteToken();
  assert.ok(isInviteToken(first.token)); assert.notEqual(first.token, second.token);
  assert.equal(first.hash, createHash("sha256").update(first.token).digest("hex"));
  assert.equal(hashInviteToken(first.token), first.hash);
  for (const bad of ["", "short", `${first.token}x`, first.token.replace(/.$/, "/"), "../../etc/passwd".padEnd(43, "a")]) assert.equal(isInviteToken(bad), false);
});

test("PKCE pairs follow RFC 7636 S256 and the authorize URL carries only the challenge", () => {
  const { verifier, challenge } = pkcePair();
  assert.ok(isPkceVerifier(verifier));
  assert.equal(challenge, createHash("sha256").update(verifier).digest("base64url"));
  assert.equal(pkceChallenge(verifier), challenge);
  const url = new URL(googleAuthorizeUrl({ url: "https://example.supabase.co", key: "sb_publishable_x" }, "https://muleum.example/auth/callback", challenge));
  assert.equal(url.pathname, "/auth/v1/authorize");
  assert.deepEqual(Object.fromEntries(url.searchParams), { provider: "google", redirect_to: "https://muleum.example/auth/callback", code_challenge: challenge, code_challenge_method: "s256" });
  assert.equal(url.toString().includes(verifier), false);
  for (const bad of ["", "a".repeat(42), "a".repeat(129), "a b".repeat(20)]) assert.equal(isPkceVerifier(bad), false);
});

test("the callback origin comes only from a clean configured URL", () => {
  assert.equal(siteOrigin({ MULEUM_SITE_URL: "https://muleum.example/" }), "https://muleum.example");
  assert.equal(siteOrigin({ MULEUM_SITE_URL: "http://127.0.0.1:3000" }), "http://127.0.0.1:3000");
  for (const bad of [undefined, "", "http://muleum.example", "https://user:pass@muleum.example", "https://muleum.example/path", "https://muleum.example/?next=x", "javascript:alert(1)"]) assert.equal(siteOrigin({ MULEUM_SITE_URL: bad }), null);
});

test("invite forms normalize the Google email and require a teacher for students", () => {
  assert.equal(normalizeEmail("  Student@Example.COM "), "student@example.com");
  assert.equal(normalizeEmail("no-at-sign"), null);
  assert.deepEqual(parseInviteForm(form({ email: " Student@Example.com", role: "student", teacher, days: "7" })), { email: "student@example.com", role: "student", teacher, days: 7 });
  assert.deepEqual(parseInviteForm(form({ email: "parent@example.com", role: "parent", teacher, days: "3" })), { email: "parent@example.com", role: "parent", teacher: null, days: 3 });
  for (const bad of [
    { email: "x", role: "student", teacher, days: "7" },
    { email: "s@example.com", role: "student", days: "7" },
    { email: "s@example.com", role: "student", teacher: "not-a-uuid", days: "7" },
    { email: "s@example.com", role: "alumni", days: "7" },
    { email: "s@example.com", role: "__proto__", days: "7" },
    { email: "s@example.com", role: "parent", days: "0" },
    { email: "s@example.com", role: "parent", days: "15" },
    { email: "s@example.com", role: "parent", days: "2.5" },
  ]) assert.ok("error" in parseInviteForm(form(bad)), JSON.stringify(bad));
});

test("onboarding forms require consent, a past birth date and bounded text", () => {
  const ok = { full_name: " 가상 학생 ", birth_date: "2010-05-12", residence_region: " 가상구 ", privacy_consent: "on" };
  assert.deepEqual(parseOnboardingForm(form(ok), "2026-10-24"), { fullName: "가상 학생", birthDate: "2010-05-12", region: "가상구" });
  for (const bad of [
    { ...ok, privacy_consent: "" }, { ...ok, full_name: " " }, { ...ok, full_name: "가".repeat(81) },
    { ...ok, residence_region: "" }, { ...ok, birth_date: "2027-01-01" }, { ...ok, birth_date: "12/05/2010" },
  ]) assert.ok("error" in parseOnboardingForm(form(bad), "2026-10-24"), JSON.stringify(bad));
});
