import { test, expect, type Page } from "@playwright/test";

async function accessiblePage(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const failures = await page.evaluate(() => {
    const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
    const lum = (values: number[]) => values.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const errors: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>("body *")) {
      if (!Array.from(element.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) || element.closest('[aria-hidden="true"],:disabled') || ["SCRIPT", "STYLE"].includes(element.tagName) || element.classList.contains("skip-link")) continue;
      const bounds = element.getBoundingClientRect(); const style = getComputedStyle(element);
      if (!bounds.width || !bounds.height || style.visibility === "hidden") continue;
      let node: HTMLElement | null = element; let background = [255, 255, 255];
      while (node) { const color = rgb(getComputedStyle(node).backgroundColor); if (color.length === 3 || color[3] === 1) { background = color; break; } node = node.parentElement; }
      const a = lum(rgb(style.color)); const b = lum(background); const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && parseFloat(style.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) errors.push(`${element.tagName}: ${ratio.toFixed(2)}`);
    }
    return errors;
  });
  expect(failures).toEqual([]);
}

test("protected routes redirect anonymous visitors and real login is closed without configuration", async ({ page }, info) => {
  for (const path of ["/mypage", "/member", "/member/student", "/member/administrator"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
  await expect(page.getByRole("button", { name: "Google로 계속하기", exact: true })).toBeDisabled();
  await expect(page.getByLabel("비밀번호")).toHaveCount(0);
  await accessiblePage(page);
  await page.screenshot({ path: `artifacts/${info.project.name}-login.png`, fullPage: true });
});

test("invite links, Google sign-in and onboarding stay closed until Supabase and Google are configured", async ({ page }) => {
  await page.goto(`/invite/${"a".repeat(43)}`);
  await expect(page.getByRole("heading", { level: 1, name: "물음에 초대받았어요" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Google로 계속하기", exact: true })).toBeDisabled();
  await accessiblePage(page);
  await page.goto("/invite/not-a-token");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("올바르지 않은 초대 링크");
  await page.goto("/welcome");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/auth/google");
  await expect(page).toHaveURL(/\/login\?error=unavailable$/);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("실제 로그인이 아직 설정되지 않았어요");
  await page.goto("/auth/callback?code=forged");
  await expect(page).toHaveURL(/\/login\?error=state$/);
});

test("only student and parent demos exist and neither can open invitation tools", async ({ page }) => {
  await page.goto("/login");
  for (const removed of ["선생님", "졸업생", "관리자"]) await expect(page.getByRole("button", { name: `${removed} 체험 시작`, exact: true })).toHaveCount(0);
  for (const [label, role] of [["학생", "student"], ["학부모", "parent"]]) {
    await page.goto("/login");
    await page.getByRole("button", { name: `${label} 체험 시작`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/member/${role}$`));
    await page.goto("/member/invitations");
    await expect(page.getByRole("heading", { name: "이 공간에 접근할 권한이 없어요." })).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await accessiblePage(page);
    await page.goto(`/member/${role}`);
    await page.getByRole("button", { name: "로그아웃", exact: true }).click();
    await expect(page).toHaveURL(/\/login\?logout=done$/);
  }
});

test("student and parent demo accounts have separate server-checked homes and a working my page", async ({ page, context }, info) => {
  const roles = ["student", "parent"];
  const labels = ["학생", "학부모"];
  await page.addInitScript(() => localStorage.setItem("muleum:v1:private-journal", JSON.stringify({ version: 1, data: [{ id: "demo", date: "2026-10-23", answers: ["PRIVATE_AUTH_SENTINEL", "", ""] }] })));
  for (let index = 0; index < roles.length; index++) {
    await page.goto("/login");
    await page.getByRole("button", { name: `${labels[index]} 체험 시작`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/member/${roles[index]}$`));
    await expect(page.getByText(`${labels[index]} 계정`, { exact: true })).toBeVisible();
    expect(await page.locator("body").innerHTML()).not.toContain("PRIVATE_AUTH_SENTINEL");
    await expect(page.getByLabel("화면 역할 미리보기")).toHaveCount(0);
    const cookie = (await context.cookies()).find(c => c.name === "muleum-demo-session")!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("Lax");
    expect(await page.evaluate(() => document.cookie)).not.toContain("muleum-demo-session");
    await accessiblePage(page);
    if (index === 0) await page.screenshot({ path: `artifacts/${info.project.name}-member.png`, fullPage: true });
    await page.getByRole("link", { name: "마이페이지 ↗", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "마이페이지" })).toBeVisible();
    await expect(page.getByText(`가상 ${labels[index]}`, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(`가상 ${labels[index]}`, { exact: true })).toBeVisible();
    await accessiblePage(page);
    if (index === 0) await page.screenshot({ path: `artifacts/${info.project.name}-mypage.png`, fullPage: true });
    await page.goto(`/member/${roles[(index + 1) % roles.length]}`);
    await expect(page.getByRole("heading", { name: "이 공간에 접근할 권한이 없어요." })).toBeVisible();
    await page.getByRole("button", { name: "로그아웃", exact: true }).click();
    await expect(page).toHaveURL(/\/login\?logout=done$/);
    expect((await context.cookies()).some(c => c.name === "muleum-demo-session")).toBe(false);
    await page.goto("/mypage");
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("forged role cookies and malformed sessions cannot open member pages", async ({ page, context }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "학생 체험 시작", exact: true }).click();
  await expect(page).toHaveURL(/\/member\/student$/);
  const cookie = (await context.cookies()).find(c => c.name === "muleum-demo-session")!;
  const [payload, signature] = cookie.value.split(".");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString());
  data.role = "parent";
  const forged = `${Buffer.from(JSON.stringify(data)).toString("base64url")}.${signature}`;
  await context.addCookies([{ ...cookie, value: forged }]);
  await page.goto("/member/parent");
  await expect(page).toHaveURL(/\/login$/);
  await context.addCookies([{ ...cookie, value: "corrupt-session" }]);
  await page.goto("/mypage");
  await expect(page).toHaveURL(/\/login$/);
});
