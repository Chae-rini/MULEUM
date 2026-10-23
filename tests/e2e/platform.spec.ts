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
  await expect(page.getByText("브랜드 분위기를 위한 참고 이미지 · 물음 운영 시설 아님")).toBeVisible();
  await expect(page.getByText("실제 회원가입과 베타 참여 신청은 아직 열리지 않았어요.", { exact: false })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByLabel("화면 역할 미리보기")).toHaveCount(0);
  expect(await page.locator("body").innerHTML()).not.toContain("PRIVATE_HOME_SENTINEL");
  expect(await page.locator("body").innerText()).not.toContain("학생 A");
  await fits(page);
  await expect.poll(() => page.getByAltText("자연광과 하늘색 의자가 어우러진 질문의 도서관 콘셉트 이미지").evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(externalRequests).toEqual([]);
  await page.screenshot({ path: `artifacts/${info.project.name}-public.png`, fullPage: true });
  await followMenu(page, "배움의 방식");
  await expect(page).toHaveURL(/#learning$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "배움 공간 둘러보기 ↗", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText("회원 공간 · 가상 데이터 시연", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("real routes support reload, browser history, and unknown-page handling", async ({ page }) => {
  await page.goto("/app/goals");
  await expect(page.getByRole("heading", { name: "나의 목표", exact: true })).toBeVisible();
  await followMenu(page, "공지사항");
  await expect(page).toHaveURL(/\/app\/notices$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "공지사항", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "나의 목표", exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", { name: "공지사항", exact: true })).toBeVisible();
  await followMenu(page, "질문게시판");
  await expect(page.getByRole("heading", { name: "질문게시판", exact: true })).toBeVisible();
  await fits(page);
  await page.goto("/app/not-a-real-page");
  await expect(page.getByRole("heading", { name: "이 페이지를 찾을 수 없어요." })).toBeVisible();
});

test("new spaces clearly expose only examples and planned workflows", async ({ page }, info) => {
  await page.goto("/app/notices");
  await page.getByRole("button", { name: "수업별 공지", exact: true }).click();
  await expect(page.getByRole("heading", { name: "다음 수업, 함께 정할 것들" })).toBeVisible();
  await page.getByLabel("화면 역할 미리보기").selectOption("teacher");
  await followMenu(page, "교육팀 연구");
  await expect(page.getByRole("heading", { name: "비식별 교육 사례", exact: true })).toBeVisible();
  await fits(page);
  await page.getByLabel("화면 역할 미리보기").selectOption("alumni");
  await expect(page.getByRole("heading", { name: "나의 프로필", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "졸업생 공동체", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "질문게시판", exact: true })).toHaveCount(0);
  await fits(page);
  await page.getByLabel("화면 역할 미리보기").selectOption("assistant");
  await expect(page.getByRole("heading", { name: "질문게시판", exact: true })).toBeVisible();
  await expect(page.getByText("설계 시연 · 실제 운영 기능 미연결", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.getByLabel("화면 역할 미리보기").selectOption("operator");
  await expect(page.getByRole("heading", { name: "운영 공간", exact: true })).toBeVisible();
  await expect(page.getByText("전체 활성 학생 정원", { exact: true })).toBeVisible();
  await fits(page);
  await page.screenshot({ path: `artifacts/${info.project.name}-operations.png`, fullPage: true });
  await page.getByLabel("화면 역할 미리보기").selectOption("administrator");
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "5분 일기", exact: true })).toHaveCount(0);
});

test("existing private records stay separate from the new question board and public site", async ({ page }) => {
  await page.goto("/app/questions");
  await page.getByLabel("지금 나에게 궁금한 것은 무엇인가요?").fill("PRIVATE_QUESTION_SENTINEL");
  await page.getByRole("button", { name: "물음 남기기", exact: false }).click();
  await expect(page.getByRole("status")).toContainText("저장됐어요");
  await followMenu(page, "질문게시판");
  await expect(page.getByRole("heading", { name: "질문게시판", exact: true })).toBeVisible();
  expect(await page.locator("body").innerText()).not.toContain("PRIVATE_QUESTION_SENTINEL");
  await page.getByRole("link", { name: "물음 소개 ↗", exact: true }).click();
  expect(await page.locator("body").innerText()).not.toContain("PRIVATE_QUESTION_SENTINEL");
  await page.goto("/app/questions");
  await expect(page.getByRole("heading", { name: "PRIVATE_QUESTION_SENTINEL", exact: true })).toBeVisible();
});
