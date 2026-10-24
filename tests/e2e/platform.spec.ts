import { test, expect, type Page } from "@playwright/test";

async function followMenu(page: Page, label: string) {
  const narrow = (page.viewportSize()?.width ?? 1440) <= 690;
  if (narrow) await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
  await page.getByRole("navigation", { name: narrow ? "모바일 메뉴" : "메인 메뉴", exact: true }).getByRole("link", { name: label, exact: true }).click();
}

async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test("public home explains the community without loading private records", async ({ page }, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("muleum:v1:private-journal", JSON.stringify({ version: 1, data: [{ id: "demo", date: "2026-10-23", answers: ["PRIVATE_HOME_SENTINEL", "", ""] }] }));
  });
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on("request", request => { if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) externalRequests.push(request.url()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("배움이 머무는 곳");
  await expect(page.getByRole("main").getByText("모든 배움은 하나의 질문에서 시작된다.", { exact: true })).toBeVisible();
  await expect(page.getByText("배경 사진은 분위기를 위한 이미지이며, 물음의 운영 시설이 아닙니다. Photo: Kyle Ryan / Unsplash")).toBeVisible();
  await expect(page.getByText("지금은 가상 데이터로 구성한 시연 공간을 살펴볼 수 있어요.", { exact: false })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "초대받은 회원 로그인", exact: true })).toHaveAttribute("href", "/login");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "회원 로그인", exact: true })).toHaveAttribute("href", "/login");
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByLabel("화면 역할 미리보기")).toHaveCount(0);
  expect(await page.locator("body").innerHTML()).not.toContain("PRIVATE_HOME_SENTINEL");
  expect(await page.locator("body").innerText()).not.toContain("학생 A");
  await fits(page);
  await expect.poll(() => page.locator("#top").evaluate(async section => {
    const url = getComputedStyle(section).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1];
    if (!url) return 0;
    const image = new Image(); image.src = url; await image.decode(); return image.naturalWidth;
  })).toBeGreaterThan(0);
  expect(externalRequests).toEqual([]);
  await page.screenshot({ path: `artifacts/${info.project.name}-public.png`, fullPage: true });
  await followMenu(page, "배움의 방식");
  await expect(page).toHaveURL(/#how$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "시연 공간 둘러보기", exact: true }).first().click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText("회원 공간 · 가상 데이터 시연", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("real routes support reload, browser history, and unknown-page handling", async ({ page }) => {
  await page.goto("/app/goals");
  await expect(page.getByRole("heading", { name: "나의 목표", exact: true })).toBeVisible();
  await followMenu(page, "나의 프로필");
  await expect(page).toHaveURL(/\/app\/profile$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "나의 프로필", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "나의 목표", exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", { name: "나의 프로필", exact: true })).toBeVisible();
  await followMenu(page, "복습 자료실");
  await expect(page.getByRole("heading", { name: "나의 복습 자료실", exact: true })).toBeVisible();
  await fits(page);
  await page.goto("/app/not-a-real-page");
  await expect(page.getByRole("heading", { name: "이 페이지를 찾을 수 없어요." })).toBeVisible();
});

test("removed preview spaces stay unreachable and role menus show only working demos", async ({ page }) => {
  for (const path of ["/app/notices", "/app/board", "/app/register", "/app/research", "/app/community", "/app/operations"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "이 페이지를 찾을 수 없어요." })).toBeVisible();
  }
  await page.goto("/app");
  await page.getByLabel("화면 역할 미리보기").selectOption("alumni");
  await expect(page.getByRole("heading", { name: "나의 프로필", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "졸업생 공동체", exact: true })).toHaveCount(0);
  await fits(page);
  for (const role of ["assistant", "operator"]) {
    await page.getByLabel("화면 역할 미리보기").selectOption(role);
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("textbox")).toHaveCount(0);
    for (const removed of ["공지사항", "질문게시판", "교육팀 연구", "운영 공간"]) await expect(page.getByRole("link", { name: removed, exact: true })).toHaveCount(0);
  }
  await page.getByLabel("화면 역할 미리보기").selectOption("administrator");
  await expect(page).toHaveURL(/\/app\/accounts$/);
  await expect(page.getByRole("link", { name: "5분 일기", exact: true })).toHaveCount(0);
  await fits(page);
});

test("existing private records stay out of other spaces and the public site", async ({ page }) => {
  await page.goto("/app/questions");
  await page.getByLabel("지금 나에게 궁금한 것은 무엇인가요?").fill("PRIVATE_QUESTION_SENTINEL");
  await page.getByRole("button", { name: "물음 남기기", exact: false }).click();
  await expect(page.getByRole("status")).toContainText("저장됐어요");
  await followMenu(page, "복습 자료실");
  await expect(page.getByRole("heading", { name: "나의 복습 자료실", exact: true })).toBeVisible();
  expect(await page.locator("body").innerText()).not.toContain("PRIVATE_QUESTION_SENTINEL");
  await page.getByRole("link", { name: "물음 소개 ↗", exact: true }).click();
  expect(await page.locator("body").innerText()).not.toContain("PRIVATE_QUESTION_SENTINEL");
  await page.goto("/app/questions");
  await expect(page.getByRole("heading", { name: "PRIVATE_QUESTION_SENTINEL", exact: true })).toBeVisible();
});

test("sky decorations stay hidden from assistive technology and the cloud drift stops when motion is reduced", async ({ page }) => {
  await page.goto("/");
  for (const selector of [".sparkle", ".cloud-bank"]) {
    expect(await page.locator(selector).evaluateAll(nodes => nodes.every(node => node.getAttribute("aria-hidden") === "true"))).toBe(true);
  }
  const drift = page.locator(".cloud-drift").first();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(drift).toHaveCSS("animation-name", "cloud-drift");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(drift).toHaveCSS("animation-name", "none");
  await expect(drift).toHaveCSS("transform", "none");
  await page.goto("/login");
  await expect(page.locator(".auth-intro .cloud-island")).toHaveAttribute("aria-hidden", "true");
  await fits(page);
});
