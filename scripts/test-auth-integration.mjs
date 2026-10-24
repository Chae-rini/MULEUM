// Exercises the production app against a loopback-only fictional Auth/REST server.
// This does not validate Supabase infrastructure or PostgreSQL RLS.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createHash, randomUUID } from "node:crypto";
import { chromium, expect } from "@playwright/test";

const studentId = "00000000-0000-4000-8000-000000000001";
const parentId = "00000000-0000-4000-8000-000000000002";
const records = {
  student: { id: studentId, status: "active", roles: ["student", "parent"], name: "Fictional Student", region: "Example District", token: "fictional-student-token" },
  parent: { id: parentId, status: "active", roles: ["parent"], name: "Fictional Parent", region: "Example District", token: "fictional-parent-token" },
  outsider: { id: "00000000-0000-4000-8000-000000000099", status: "none", roles: [], name: "", region: "", token: "fictional-outsider-token" },
};
const revoked = new Set();
const codes = new Map();
let nextGoogleUser = null;
let lastPatch = null;
let remoteLogoutFails = false;
const mock = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  let body;
  try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}; } catch { res.writeHead(400).end(); return; }
  function json(status, value) { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(value)); }
  // Stands in for Google consent: the browser returns at once with a one-time code tied to the PKCE challenge.
  if (url.pathname === "/auth/v1/authorize") {
    if (url.searchParams.get("provider") !== "google" || url.searchParams.get("code_challenge_method") !== "s256") { res.writeHead(400).end(); return; }
    const code = randomUUID();
    codes.set(code, { who: nextGoogleUser, challenge: url.searchParams.get("code_challenge") });
    const target = new URL(url.searchParams.get("redirect_to"));
    target.searchParams.set("code", code);
    res.writeHead(302, { Location: target.toString() }).end(); return;
  }
  if (req.headers.apikey !== "sb_publishable_fictional_test") return json(401, {});
  if (url.pathname === "/auth/v1/token" && req.method === "POST") {
    const entry = codes.get(body.auth_code);
    codes.delete(body.auth_code);
    const challenge = createHash("sha256").update(String(body.code_verifier ?? "")).digest("base64url");
    if (url.searchParams.get("grant_type") !== "pkce" || !entry?.who || entry.challenge !== challenge) return json(400, { message: "Invalid grant" });
    revoked.delete(entry.who.token);
    return json(200, { access_token: entry.who.token, refresh_token: "fictional-unused-refresh", expires_in: 3600 });
  }
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  const who = Object.values(records).find(record => record.token === token);
  if (!who || revoked.has(token)) return json(401, {});
  if (url.pathname === "/auth/v1/user") return json(200, { id: who.id, user_metadata: { role: "administrator" } });
  if (url.pathname === "/auth/v1/logout") {
    if (remoteLogoutFails) return json(503, {});
    revoked.add(token); return json(200, {});
  }
  if (url.pathname === "/rest/v1/rpc/my_onboarding_status") return json(200, who.status === "active" ? "active" : who.status === "suspended" ? "suspended" : "not_member");
  if (url.searchParams.get("user_id") !== `eq.${who.id}`) return json(403, {});
  if (url.pathname === "/rest/v1/member_accounts") return json(200, [{ user_id: who.id, status: who.status, enrollment: who === records.student ? "active" : "none" }]);
  if (url.pathname === "/rest/v1/member_roles") return json(200, who.roles.map(role => ({ user_id: who.id, role, status: "approved" })));
  if (url.pathname === "/rest/v1/member_profiles") {
    if (req.method === "PATCH") {
      lastPatch = { id: who.id, body };
      who.name = body.full_name; who.region = body.residence_region;
      return json(200, [{ user_id: who.id }]);
    }
    return json(200, [{ full_name: who.name, birth_date: "2000-01-01", residence_region: who.region }]);
  }
  return json(404, {});
});

let app;
let browser;
let checks = 0;
async function check(name, fn) { await fn(); checks++; console.log(`PASS ${name}`); }
try {
  mock.listen(0, "127.0.0.1");
  await once(mock, "listening");
  const port = 3107;
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production", MULEUM_ENABLE_AUTH: "true", MULEUM_SITE_URL: `http://127.0.0.1:${port}`, SUPABASE_URL: `http://127.0.0.1:${mock.address().port}`, SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fictional_test" },
  });
  let output = "";
  app.stdout.on("data", chunk => { output += chunk; });
  app.stderr.on("data", chunk => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (app.exitCode !== null) throw new Error(`Test app exited: ${output}`);
    if (output.includes("Ready in")) break;
    if (attempt === 99) throw new Error("Test app startup timeout");
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  async function loginAs(name) {
    nextGoogleUser = records[name];
    await page.goto(`${base}/login`);
    await page.getByRole("link", { name: "Google로 계속하기", exact: true }).click();
  }
  await check("production has no demo login and an uninvited Google account gets no session", async () => {
    await page.goto(`${base}/login`);
    await expect(page.getByRole("button", { name: "학생 체험 시작" })).toHaveCount(0);
    await loginAs("outsider");
    await expect(page).toHaveURL(`${base}/login?error=not-invited`);
    await expect(page.getByRole("main").getByRole("alert")).toContainText("초대받지 않은 구글 계정");
    assert.equal((await context.cookies()).some(c => c.name === "muleum-auth"), false);
    assert.ok(revoked.has(records.outsider.token));
  });
  await check("a forged code or missing PKCE verifier cannot complete sign-in", async () => {
    codes.set("forged-code", { who: records.student, challenge: "not-the-real-challenge" });
    await context.addCookies([{ name: "muleum-pkce", value: "a".repeat(86), url: base }]);
    await page.goto(`${base}/auth/callback?code=forged-code`);
    await expect(page).toHaveURL(`${base}/login?error=state`);
    codes.set("orphan-code", { who: records.student, challenge: "x" });
    await page.goto(`${base}/auth/callback?code=orphan-code`);
    await expect(page).toHaveURL(`${base}/login?error=state`);
    assert.equal((await context.cookies()).some(c => c.name === "muleum-auth"), false);
  });
  await check("verified login supports multiple approved roles and secure server cookies", async () => {
    await loginAs("student");
    await expect(page).toHaveURL(`${base}/member/student`);
    const cookie = (await context.cookies()).find(c => c.name === "muleum-auth");
    assert.ok(cookie?.httpOnly && cookie.secure && cookie.sameSite === "Lax");
    assert.equal((await page.content()).includes(records.student.token), false);
    await page.goto(`${base}/member/parent`);
    await expect(page.getByText("학부모 계정", { exact: true })).toBeVisible();
    await page.goto(`${base}/member/administrator`);
    await expect(page.getByRole("heading", { name: "이 공간에 접근할 권한이 없어요." })).toBeVisible();
  });
  await check("profile mutation ignores forged owner and role fields", async () => {
    await page.goto(`${base}/mypage`);
    await page.getByLabel("성명", { exact: true }).fill("Updated Fictional Student");
    await page.getByLabel("거주 지역", { exact: true }).fill("Fictional District");
    await page.getByRole("button", { name: "내 프로필 저장" }).evaluate(button => {
      for (const [name, value] of [["user_id", "00000000-0000-4000-8000-000000000002"], ["role", "administrator"]]) {
        const input = document.createElement("input"); input.name = name; input.value = value; input.type = "hidden"; button.closest("form").append(input);
      }
    });
    await page.getByRole("button", { name: "내 프로필 저장" }).click();
    await expect(page.getByRole("status")).toContainText("내 프로필을 저장했어요");
    assert.deepEqual(lastPatch, { id: studentId, body: { full_name: "Updated Fictional Student", residence_region: "Fictional District" } });
    assert.equal(records.parent.name, "Fictional Parent");
  });
  await check("role revocation is checked on the next server request", async () => {
    records.student.roles = [];
    await page.goto(`${base}/mypage`);
    await expect(page).toHaveURL(`${base}/login`);
    records.student.roles = ["student"];
    revoked.add(records.student.token);
  });
  await check("suspended accounts cannot log in or retain a token", async () => {
    await context.clearCookies();
    records.student.status = "suspended";
    await loginAs("student");
    await expect(page).toHaveURL(`${base}/login?error=suspended`);
    await expect(page.getByRole("main").getByRole("alert")).toContainText("이용이 중지된 계정");
    assert.equal((await context.cookies()).some(c => c.name === "muleum-auth"), false);
    records.student.status = "active";
  });
  await check("parent sees own profile and logout revokes the current session", async () => {
    await loginAs("parent");
    await expect(page).toHaveURL(`${base}/member/parent`);
    await page.goto(`${base}/mypage`);
    await expect(page.getByText("Fictional Parent", { exact: true })).toBeVisible();
    assert.equal((await page.content()).includes("Updated Fictional Student"), false);
    await page.getByRole("button", { name: "로그아웃", exact: true }).click();
    await expect(page).toHaveURL(`${base}/login?logout=done`);
    assert.ok(revoked.has(records.parent.token));
    await page.goto(`${base}/mypage`);
    await expect(page).toHaveURL(`${base}/login`);
  });
  await check("logout clears local credentials even when remote revocation fails", async () => {
    await loginAs("parent");
    await expect(page).toHaveURL(`${base}/member/parent`);
    remoteLogoutFails = true;
    await page.getByRole("button", { name: "로그아웃", exact: true }).click();
    await expect(page).toHaveURL(`${base}/login?logout=local`);
    await expect(page.getByRole("status")).toContainText("인증 서버의 세션 종료는 확인하지 못했어요");
    assert.equal((await context.cookies()).some(c => c.name === "muleum-auth"), false);
  });
  console.log(`${checks} auth integration checks passed (fictional loopback service only)`);
} finally {
  await browser?.close();
  if (app && app.exitCode === null) { app.kill("SIGTERM"); await once(app, "exit"); }
  mock.closeAllConnections();
  await new Promise(resolve => mock.close(resolve));
}
