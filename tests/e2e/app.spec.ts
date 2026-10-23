import { test, expect, type Page } from "@playwright/test";

async function navigate(page: Page, desktop: string, mobile: string) {
  const narrow = (page.viewportSize()?.width ?? 1440) <= 690;
  const menu = page.getByRole("navigation", { name: narrow ? "모바일 메뉴" : "메인 메뉴", exact: true });
  await menu.getByRole("button", { name: narrow ? mobile : desktop, exact: true }).click();
}

async function expectFits(page: Page) {
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
}

test("student journey persists questions, journal, weekly goals, and lesson progress", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "배움은 질문에서 시작돼요." })).toBeVisible();
  await expectFits(page);
  await page.screenshot({ path: `artifacts/${info.project.name}-home.png`, fullPage: true });
  await page.getByRole("button", { name: "내 질문 남기기" }).click();
  await page.getByLabel("지금 나에게 궁금한 것은 무엇인가요?").fill("   ");
  await page.getByRole("button", { name: "물음 남기기", exact: false }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("공백만");
  await page.getByLabel("지금 나에게 궁금한 것은 무엇인가요?").fill("왜 달은 낮에도 보일까? <script>example</script>");
  await page.getByLabel("이 질문을 하게 된 이유").fill("가상의 관찰을 검증하고 싶다.");
  await page.getByRole("button", { name: "물음 남기기", exact: false }).click();
  await expect(page.getByRole("status")).toContainText("저장됐어요");
  await expect(page.getByRole("heading", { name: "왜 달은 낮에도 보일까? <script>example</script>" })).toBeVisible();
  await expectFits(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "왜 달은 낮에도 보일까? <script>example</script>" })).toBeVisible();

  await navigate(page, "나의 목표", "목표");
  await expect(page.getByText("아직 이번 주 목표가 없어요.", { exact: false })).toBeVisible();
  await page.getByLabel("구체적인 작은 행동").fill("수요일에 수학 문제 3개 직접 풀기");
  await page.getByRole("button", { name: "나의 목표 추가" }).click();
  await page.getByRole("checkbox", { name: "수요일에 수학 문제 3개 직접 풀기" }).check();
  await expect(page.getByText("1 / 1 완료", { exact: true })).toBeVisible();
  await page.reload();
  await navigate(page, "나의 목표", "목표");
  await expect(page.getByRole("checkbox", { name: "수요일에 수학 문제 3개 직접 풀기" })).toBeChecked();
  await expectFits(page);

  await navigate(page, "5분 일기", "일기");
  await page.getByRole("button", { name: "나의 기록 마무리" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("한 칸 이상");
  await page.getByLabel("01 · 오늘 가장 기억에 남는 일은 무엇인가요?").fill("PRIVATE_FICTIONAL_DIARY: 가상 학생의 하루");
  await page.getByRole("button", { name: "나의 기록 마무리" }).click();
  await expect(page.getByRole("status")).toContainText("저장됐어요");
  await page.reload();
  await navigate(page, "5분 일기", "일기");
  await expect(page.getByLabel("01 · 오늘 가장 기억에 남는 일은 무엇인가요?")).toHaveValue("PRIVATE_FICTIONAL_DIARY: 가상 학생의 하루");
  await page.getByLabel("02 · 그 일이 나에게 중요했던 이유는 무엇인가요?").fill("수정한 가상 기록");
  await page.getByRole("button", { name: "기록 수정하기" }).click();
  await expect(page.getByRole("status")).toContainText("저장됐어요");
  await expectFits(page);

  await navigate(page, "과외 수업", "수업");
  await page.getByRole("checkbox", { name: "본 수업", exact: false }).check();
  await expect(page.getByText("1 / 7 단계 · 55 / 120분", { exact: true })).toBeVisible();
  await page.reload();
  await navigate(page, "과외 수업", "수업");
  await expect(page.getByRole("checkbox", { name: "본 수업", exact: false })).toBeChecked();
  await page.getByLabel("수업 날짜").fill("2026-01-01");
  await expect(page.getByText("0 / 7 단계 · 0 / 120분", { exact: true })).toBeVisible();
  await expectFits(page);
  expect(errors).toEqual([]);
});

test("teacher records stay separate by student; parent sees only approved examples", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("화면 역할 미리보기").selectOption("teacher");
  await expect(page.getByRole("heading", { name: "지도자 공간" })).toBeVisible();
  await page.getByLabel("수업 후 메모").fill("학생 A의 가상 수업 관찰");
  await page.getByRole("button", { name: "수업 메모 저장" }).click();
  await expect(page.getByRole("status")).toContainText("학생 A");
  await page.getByRole("button", { name: "학생 B · 국어", exact: false }).click();
  await expect(page.getByText("학생 A의 가상 수업 관찰", { exact: true })).toHaveCount(0);
  await page.getByLabel("수업 후 메모").fill("학생 B의 별도 가상 메모");
  await page.getByRole("button", { name: "수업 메모 저장" }).click();
  await page.reload();
  await page.getByLabel("화면 역할 미리보기").selectOption("teacher");
  await expect(page.getByText("학생 A의 가상 수업 관찰", { exact: true })).toBeVisible();
  await expect(page.getByText("학생 B의 별도 가상 메모", { exact: true })).toHaveCount(0);
  await expectFits(page);
  await navigate(page, "과외 수업", "수업");
  await page.getByRole("checkbox", { name: "독서", exact: false }).check();
  await page.getByLabel("수업 학생").selectOption("student-b");
  await expect(page.getByRole("checkbox", { name: "독서", exact: false })).not.toBeChecked();
  await page.getByLabel("화면 역할 미리보기").selectOption("parent");
  await expect(page.getByText("승인된 리포트 예시", { exact: true })).toBeVisible();
  await expect(page.getByText("검토 중인 가상 초안", { exact: true })).toHaveCount(0);
  await expect(page.getByText("학생 A의 가상 수업 관찰", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expectFits(page);
});

test("private diary is absent from teacher and parent DOM", async ({ page }) => {
  await page.goto("/");
  await navigate(page, "5분 일기", "일기");
  await page.getByLabel("01 · 오늘 가장 기억에 남는 일은 무엇인가요?").fill("PRIVATE_SENTINEL_123");
  await page.getByRole("button", { name: "나의 기록 마무리" }).click();
  await expect(page.getByRole("status")).toContainText("저장됐어요");
  for (const role of ["teacher", "parent"]) {
    await page.getByLabel("화면 역할 미리보기").selectOption(role);
    expect(await page.locator("body").innerHTML()).not.toContain("PRIVATE_SENTINEL_123");
    await expect(page.getByRole("button", { name: "5분 일기", exact: true })).toHaveCount(0);
  }
});

test("corrupt storage is preserved and saving is blocked with an explanation", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("muleum:v1:questions", "CORRUPTED_EXAMPLE"); });
  await page.goto("/");
  await page.getByRole("button", { name: "내 질문 남기기" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("기존 데이터 보호");
  await expect(page.getByRole("button", { name: "물음 남기기", exact: false })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("muleum:v1:questions"))).toBe("CORRUPTED_EXAMPLE");
});

test("save failure retains input and never reports success", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("quota", "QuotaExceededError"); }; });
  await page.goto("/");
  await page.getByRole("button", { name: "내 질문 남기기" }).click();
  await page.getByLabel("지금 나에게 궁금한 것은 무엇인가요?").fill("저장 실패 테스트 질문");
  await page.getByRole("button", { name: "물음 남기기", exact: false }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("저장하지 못했어요");
  await expect(page.getByLabel("지금 나에게 궁금한 것은 무엇인가요?")).toHaveValue("저장 실패 테스트 질문");
  await expect(page.getByRole("status")).toHaveCount(0);
});
