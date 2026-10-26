import { test, expect } from '@playwright/test';

test('manifest and worker install without requesting notification consent or caching member pages', async ({ page }) => {
  await page.goto('/');
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.start_url).toBe('/member');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.map((icon: { src: string; sizes: string; purpose: string }) => `${icon.purpose} ${icon.sizes} ${icon.src}`)).toEqual([
    'any 192x192 /brand/muleum-icon-question-192.png',
    'any 512x512 /brand/muleum-icon-question-512.png',
    'maskable 512x512 /brand/muleum-icon-question-maskable-512.png',
  ]);
  for (const [src, size] of [...manifest.icons.map((icon: { src: string; sizes: string }) => [icon.src, Number(icon.sizes.split('x')[0])]),
    ['/brand/muleum-icon-question-apple-180.png', 180], ['/brand/muleum-icon-question-32.png', 32], ['/brand/muleum-icon-question-16.png', 16]] as [string, number][]) {
    expect(await page.evaluate(async src => {
      const image = new Image(); image.src = src; await image.decode(); return [image.naturalWidth, image.naturalHeight];
    }, src)).toEqual([size, size]);
  }
  expect(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')).toBe('/brand/muleum-icon-question-apple-180.png');
  expect(await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)).toContain('127.0.0.1:3000/');
  expect(await page.evaluate(() => Notification.permission)).toBe('default');
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
  await page.goto('/member/notifications');
  await expect(page).toHaveURL(/\/login$/);
});

test('public app guide explains install and notifications for every device without loading external resources', async ({ page }, info) => {
  await page.addInitScript(() => {
    Notification.requestPermission = async () => { sessionStorage.setItem('test-permission-requested', 'yes'); return 'denied'; };
  });
  const externalRequests: string[] = [];
  page.on('request', request => { if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) externalRequests.push(request.url()); });
  await page.goto('/login');
  await page.getByRole('link', { name: '앱 설치와 알림 안내 ↗', exact: true }).click();
  await expect(page).toHaveURL(/\/guide\/app$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('물음을 앱처럼 쓰기');
  for (const name of ['iPhone · iPad', 'Android 휴대폰 · 태블릿', '컴퓨터 (Windows · Mac)', '알림 받기', '문제 해결']) {
    await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
  }
  await expect(page.getByText('준비 중', { exact: true })).toBeVisible();
  const roles = page.locator('.guide-roles');
  await expect(roles.locator('div', { hasText: '학생' }).first()).toContainText('5분 일기 · 직접 선택');
  await expect(roles.locator('div', { hasText: '학부모' })).not.toContainText('질문에 새로운 답변');
  const nav = page.getByRole('navigation', { name: '안내 목차' });
  await nav.getByRole('link', { name: /^알림/ }).click();
  await expect(page).toHaveURL(/#notifications$/);
  await page.locator('summary', { hasText: '알림 권한을 바꾸고 싶어요' }).click();
  await expect(page.getByText('기기 설정에서 바꿀 수 있어요', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(externalRequests).toEqual([]);
  expect(await page.evaluate(() => sessionStorage.getItem('test-permission-requested'))).toBeNull();
  await page.screenshot({ path: `artifacts/${info.project.name}-guide.png`, fullPage: true });
});

test('the old settings page is gone and my page links to the guide', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '학생 체험 시작', exact: true }).click();
  await expect(page).toHaveURL(/\/member\/student$/);
  await page.goto('/member/notifications');
  await expect(page.getByRole('heading', { name: '이 페이지를 찾을 수 없어요.' })).toBeVisible();
  await page.goto('/mypage');
  await page.getByRole('link', { name: '앱 설치와 알림 안내 ↗', exact: true }).click();
  await expect(page).toHaveURL(/\/guide\/app$/);
});
