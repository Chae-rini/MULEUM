import { createHmac, timingSafeEqual } from "node:crypto";
import { demoRoles, type Identity } from "./policy.ts";

export function signDemoSession(role: string, secret: string, now = Date.now()): string {
  if (!demoRoles.some((item) => item === role)) throw new Error("Unknown demo identity");
  const payload = Buffer.from(JSON.stringify({ role, expires: now + 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function readDemoSession(value: string, secret: string, now = Date.now()): Identity | null {
  if (value.length > 1024) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (!/^[A-Za-z0-9_-]{43}$/.test(signature) || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data || !Number.isSafeInteger(data.expires) || data.expires <= now || data.expires > now + 3600000 ||
        !demoRoles.includes(data.role)) return null;
    return { id: `demo-${data.role}`, mode: "demo", roles: [data.role], enrollment: data.role === "student" ? "active" : data.role === "alumni" ? "alumni" : "none" };
  } catch { return null; }
}
