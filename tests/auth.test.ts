import test from "node:test";
import assert from "node:assert/strict";
import { approvedIdentity, canOpenRole, isAccountRole, memberHome } from "../lib/auth/policy.ts";
import { readDemoSession, signDemoSession } from "../lib/auth/demo-session.ts";
import { authConfig, demoEnabled, pkceExchange, resolveIdentity, ownProfile, updateOwnProfile, revokeSession, rpc, RpcError, onboardingStatus } from "../lib/auth/supabase.ts";

const id = "00000000-0000-4000-8000-000000000001";
const config = { url: "https://example.invalid", key: "sb_publishable_test" };
const account = { user_id: id, status: "active", enrollment: "active" };
const role = (name: string, status = "approved", user_id = id) => ({ user_id, role: name, status });

test("only active accounts and their own approved roles grant access", () => {
  for (const status of ["invited", "suspended", "unknown"]) assert.equal(approvedIdentity(id, { ...account, status }, [role("student")]), null);
  assert.equal(approvedIdentity(id, account, [role("administrator", "pending"), role("teacher", "revoked"), role("parent", "approved", "someone-else")]), null);
  assert.equal(approvedIdentity(id, { ...account, user_id: "someone-else" }, [role("student")]), null);
  const identity = approvedIdentity(id, account, [role("student"), role("parent"), role("administrator", "pending")])!;
  assert.deepEqual(identity.roles, ["student", "parent"]);
  assert.equal(canOpenRole(identity, "parent"), true);
  assert.equal(canOpenRole(identity, "administrator"), false);
  assert.equal(isAccountRole("constructor"), false);
  assert.equal(memberHome(identity), "/member/student");
});

test("demo session rejects tampering, malformed signatures, expiry and unknown roles", () => {
  const session = signDemoSession("student", "test-secret", 1000);
  assert.deepEqual(readDemoSession(session, "test-secret", 1001)?.roles, ["student"]);
  assert.equal(readDemoSession(session, "other-secret", 1001), null);
  assert.equal(readDemoSession(session, "test-secret", 3601000), null);
  assert.equal(readDemoSession(session, "test-secret", 0), null);
  for (const value of ["", `${session}x`, `${session}.extra`, `${session.split(".")[0]}.${"é".repeat(43)}`, "x".repeat(1025)]) {
    assert.equal(readDemoSession(value, "test-secret", 1001), null);
  }
  const forged = Buffer.from(JSON.stringify({ role: "administrator", expires: 3601000 })).toString("base64url") + "." + session.split(".")[1];
  assert.equal(readDemoSession(forged, "test-secret", 1001), null);
  assert.throws(() => signDemoSession("constructor", "test-secret"));
  for (const removed of ["teacher", "alumni", "administrator"]) assert.throws(() => signDemoSession(removed, "test-secret"));
});

test("real auth requires explicit enablement and publishable keys; demo is development only", () => {
  const env = { MULEUM_ENABLE_AUTH: "true", SUPABASE_URL: config.url, SUPABASE_PUBLISHABLE_KEY: config.key };
  assert.deepEqual(authConfig(env), config);
  assert.equal(authConfig({ ...env, MULEUM_ENABLE_AUTH: "false" }), null);
  assert.equal(authConfig({ ...env, SUPABASE_PUBLISHABLE_KEY: "sb_secret_private" }), null);
  for (const url of ["http://example.invalid", "https://user:secret@example.invalid", "https://example.invalid/path", "https://example.invalid?key=x"]) {
    assert.equal(authConfig({ ...env, SUPABASE_URL: url }), null);
  }
  assert.ok(authConfig({ ...env, SUPABASE_URL: "http://127.0.0.1:54321" }));
  assert.equal(demoEnabled({ NODE_ENV: "production" }), false);
  assert.equal(demoEnabled({ NODE_ENV: "development" }), true);
  assert.equal(demoEnabled({ NODE_ENV: "development", MULEUM_ENABLE_AUTH: "true" }), false);
});

test("Supabase identity ignores user metadata and uses fresh own-account RLS queries", async () => {
  const requests: string[] = [];
  const transport: typeof fetch = async (input, init) => {
    const url = String(input); requests.push(url);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("authorization"), "Bearer test-access-token");
    assert.equal(headers.get("apikey"), config.key);
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.redirect, "error");
    if (url.endsWith("/user")) return Response.json({ id, user_metadata: { role: "administrator" } });
    assert.ok(url.includes(`user_id=eq.${id}`));
    return Response.json(url.includes("member_accounts") ? [account] : [role("student"), role("administrator", "revoked")]);
  };
  assert.deepEqual((await resolveIdentity(config, "test-access-token", transport))?.roles, ["student"]);
  assert.equal(requests.length, 3);
});

test("Supabase errors and suspended membership fail closed", async () => {
  await assert.rejects(resolveIdentity(config, "expired", async () => new Response(null, { status: 401 })));
  await assert.rejects(resolveIdentity(config, "x", async () => { throw new Error("Network offline"); }));
  await assert.rejects(resolveIdentity(config, "x", async () => Response.json({ id: "malicious&select=*" })));
  const transport: typeof fetch = async input => Response.json(String(input).endsWith("/user") ? { id } : []);
  assert.equal(await resolveIdentity(config, "test-token", transport), null);
});

test("Google PKCE exchange uses the pkce grant and excludes refresh tokens from its return", async () => {
  const session = await pkceExchange(config, "fictional-code", "fictional-verifier", async (input, init) => {
    assert.ok(String(input).endsWith("/auth/v1/token?grant_type=pkce"));
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), { auth_code: "fictional-code", code_verifier: "fictional-verifier" });
    return Response.json({ access_token: "access", refresh_token: "never-persist", expires_in: 7200 });
  });
  assert.deepEqual(session, { token: "access", maxAge: 3600 });
  await assert.rejects(pkceExchange(config, "x", "x", async () => Response.json({ access_token: "x", expires_in: -1 })));
  await assert.rejects(pkceExchange(config, "x", "x", async () => new Response(null, { status: 400 })));
});

test("database calls send the user token and surface only whitelisted error codes", async () => {
  const result = await rpc<string>(config, "access", "accept_invitation", { p_token_hash: "a".repeat(64) }, async (input, init) => {
    assert.equal(String(input), "https://example.invalid/rest/v1/rpc/accept_invitation");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer access");
    return Response.json("student");
  });
  assert.equal(result, "student");
  await assert.rejects(rpc(config, "access", "accept_invitation", {}, async () => Response.json({ code: "MUL01", message: "fictional detail" }, { status: 400 })), (error: unknown) => error instanceof RpcError && error.code === "MUL01" && !error.message.includes("fictional detail"));
  await assert.rejects(rpc(config, "access", "x;drop", {}, async () => Response.json(null)), (error: unknown) => error instanceof RpcError && error.code === null);
  assert.equal(await onboardingStatus(config, "access", async () => Response.json("waiting_guardian")), "waiting_guardian");
  await assert.rejects(onboardingStatus(config, "access", async () => Response.json("superuser")));
});

test("own profile responses expose only selected fields and updates use a fixed allowlist", async () => {
  const profile = await ownProfile(config, "access", id, async input => {
    assert.ok(String(input).includes(`user_id=eq.${id}&select=full_name,birth_date,residence_region`));
    return Response.json([{ full_name: "Fictional", birth_date: "2010-01-01", residence_region: "Example", gender_description: "PRIVATE_SENTINEL" }]);
  });
  assert.equal(JSON.stringify(profile).includes("PRIVATE_SENTINEL"), false);
  await updateOwnProfile(config, "access", id, "Fictional", "Example", async (input, init) => {
    assert.ok(String(input).includes(`user_id=eq.${id}&select=user_id`));
    assert.equal(init?.method, "PATCH");
    assert.deepEqual(JSON.parse(String(init?.body)), { full_name: "Fictional", residence_region: "Example" });
    return Response.json([{ user_id: id }]);
  });
  await assert.rejects(updateOwnProfile(config, "access", id, "Fictional", "Example", async () => Response.json([])));
});

test("logout requests revocation for the current Supabase session", async () => {
  await revokeSession(config, "access", async (input, init) => {
    assert.ok(String(input).endsWith("/auth/v1/logout?scope=local"));
    assert.equal(init?.method, "POST");
    return new Response(null, { status: 204 });
  });
});
