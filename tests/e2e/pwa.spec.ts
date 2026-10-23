import { test, expect } from '@playwright/test';

test('manifest and worker install without requesting notification consent or caching member pages', async ({ page }) => {
  await page.goto('/');
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.start_url).toBe('/member');
  expect(manifest.display).toBe('standalone');
  for (const size of [192, 512]) {
    expect(await page.evaluate(async size => {
      const image = new Image(); image.src = `/brand/pwa-${size}.png`; await image.decode(); return image.naturalWidth;
    }, size)).toBe(size);
  }
  expect(await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)).toContain('127.0.0.1:3000/');
  expect(await page.evaluate(() => Notification.permission)).toBe('default');
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
  await page.goto('/member/notifications');
  await expect(page).toHaveURL(/\/login$/);
});

test('notification preview is opt-in, tab-persistent, role-scoped and cleared on logout', async ({ page }, info) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '학생 체험 시작', exact: true }).click();
  await expect(page).toHaveURL(/\/member\/student$/);
  await page.goto('/member/notifications');
  const toggle = page.getByLabel('가상 알림 설정 켜기');
  await expect(toggle).not.toBeChecked();
  await expect(page.getByLabel('담당 학생의 새로운 질문', { exact: true })).toHaveCount(0);
  await toggle.check();
  await expect(page.getByLabel('5분 일기 · 직접 선택', { exact: true })).not.toBeChecked();
  await page.getByLabel('새로운 공지사항', { exact: true }).check();
  await page.getByRole('button', { name: '가상 설정 저장' }).click();
  await expect(page.getByRole('status')).toContainText('이 탭에 저장');
  await page.reload();
  await expect(toggle).toBeChecked();
  await page.getByRole('button', { name: '화면에서 미리보기' }).click();
  await expect(page.getByTestId('notification-preview')).toContainText('로그인 후 확인');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/${info.project.name}-notifications.png`, fullPage: true });
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect(page).toHaveURL(/logout=done/);
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('muleum:notification-preview:')))).toEqual([]);
  await page.getByRole('button', { name: '선생님 체험 시작', exact: true }).click();
  await expect(page).toHaveURL(/\/member\/teacher$/);
  await page.goto('/member/notifications');
  await expect(toggle).not.toBeChecked();
  await expect(page.getByLabel('담당 학생의 새로운 질문', { exact: true })).toBeVisible();
  await expect(page.getByLabel('5분 일기 · 직접 선택', { exact: true })).toHaveCount(0);
});

test('native permission is requested only after a click and local test does not subscribe', async ({ page, context }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', { configurable: true, get: () => sessionStorage.getItem('test-permission') || 'default' });
    Notification.requestPermission = async () => { sessionStorage.setItem('test-permission', 'granted'); return 'granted'; };
    PushManager.prototype.subscribe = async () => { throw new Error('Live subscription must not be called'); };
  });
  await page.goto('/login');
  await page.getByRole('button', { name: '학생 체험 시작', exact: true }).click();
  await expect(page).toHaveURL(/\/member\/student$/);
  await page.goto('/member/notifications');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  expect(await page.evaluate(() => sessionStorage.getItem('test-permission'))).toBeNull();
  const worker = context.serviceWorkers()[0];
  await worker.evaluate(() => {
    const workerScope = globalThis as unknown as { registration: { showNotification: (title: string, options: unknown) => Promise<void> }; testNotification?: unknown };
    workerScope.registration.showNotification = async (title, options) => { workerScope.testNotification = { title, options }; };
  });
  await page.getByRole('button', { name: '기기 알림 권한 요청' }).click();
  await page.getByLabel('가상 알림 설정 켜기').check();
  await page.getByLabel('새로운 공지사항', { exact: true }).check();
  await page.getByLabel('조용한 시간 시작').fill('00:00');
  await page.getByLabel('조용한 시간 종료').fill('00:00');
  await page.getByRole('button', { name: '이 기기에 테스트 알림', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('외부 푸시를 발송한 것은 아니에요');
  await expect.poll(() => worker.evaluate(() => JSON.stringify((globalThis as unknown as {testNotification?: unknown}).testNotification))).toContain('/member');
  expect(await page.evaluate(async () => (await navigator.serviceWorker.ready).pushManager.getSubscription())).toBeNull();
});
