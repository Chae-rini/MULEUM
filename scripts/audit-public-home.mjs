import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const phase = process.argv[2];
assert.ok(['before', 'after'].includes(phase), 'Use before or after');
const output = new URL('../artifacts/home-refinement/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const [name, width, height] of [['mobile', 390, 844], ['tablet', 820, 1180], ['desktop', 1440, 900]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: name === 'mobile', hasTouch: name === 'mobile' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:3000/');
    await page.locator('.library-hero-photo img').evaluate(image => image.decode());
    await page.evaluate(() => document.fonts.ready);
    const content = await page.locator('.public-app').evaluate(root => ({
      text: root.textContent.replace(/\s+/g, ' ').trim(),
      sections: [...root.querySelectorAll('main > section')].map(section => section.id),
      links: [...root.querySelectorAll('a')].map(link => [link.textContent.trim(), link.getAttribute('href')]),
    }));
    if (phase === 'before') await writeFile(new URL(`${name}-content.json`, output), JSON.stringify(content, null, 2), { flag: 'wx' });
    else assert.deepEqual(content, JSON.parse(await readFile(new URL(`${name}-content.json`, output), 'utf8')), 'Copy, section order and link destinations must remain unchanged');
    const metrics = await page.evaluate(() => {
      const root = document.querySelector('.public-app');
      const rgb = value => value.match(/[\d.]+/g).map(Number);
      const lum = c => c.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const contrastFailures = [];
      for (const el of root.querySelectorAll('*')) {
        if (!Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()) || el.closest('[aria-hidden="true"]') || ['SCRIPT','STYLE'].includes(el.tagName)) continue;
        const box = el.getBoundingClientRect(), style = getComputedStyle(el);
        if (!box.width || !box.height || style.visibility === 'hidden') continue;
        let node = el, bg = [255,255,255];
        while (node) { const c = rgb(getComputedStyle(node).backgroundColor); if (c.length === 3 || c[3] === 1) { bg = c; break; } node = node.parentElement; }
        const a = lum(rgb(style.color)), b = lum(bg), ratio = (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && parseFloat(style.fontWeight) >= 700);
        if (ratio < (large ? 3 : 4.5)) contrastFailures.push(`${el.tagName}.${el.className}: ${ratio.toFixed(2)}`);
      }
      return { overflow: document.documentElement.scrollWidth > innerWidth, contrastFailures,
        headingSize: getComputedStyle(root.querySelector('h1')).fontSize,
        heroColumns: getComputedStyle(root.querySelector('.public-hero')).gridTemplateColumns,
        pageHeight: document.documentElement.scrollHeight };
    });
    assert.equal(metrics.overflow, false);
    assert.deepEqual(metrics.contrastFailures, []);
    await page.screenshot({ path: new URL(`${phase}-${name}.png`, output).pathname });
    await page.screenshot({ path: new URL(`${phase}-${name}-full.png`, output).pathname, fullPage: true });
    if (phase === 'after') {
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('.skip-link').evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('main').evaluate(el => el === document.activeElement), true);
      const action = page.getByRole('link', { name: '나의 배움 공간으로', exact: true });
      await action.focus();
      assert.equal(await action.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
      const normal = await action.evaluate(el => getComputedStyle(el).backgroundColor);
      if (name !== 'mobile') {
        await action.hover();
        assert.notEqual(await action.evaluate(el => getComputedStyle(el).backgroundColor), normal);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await action.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      if (name === 'mobile') {
        await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('dialog').isVisible(), false);
      }
      await action.click();
      await page.waitForURL('**/login');
    }
    assert.deepEqual(errors, []);
    results.push({ name, width, height, ...metrics });
    await page.close();
  }
  await writeFile(new URL(`${phase}-results.json`, output), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
