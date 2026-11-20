// Usage and scope: see DESIGN-GAPS.md. Dependencies are installed outside the site.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');

const site = path.resolve(process.argv[2] || '_site');
const base = process.argv[3] || 'http://127.0.0.1:4000';
const report = { pages: [], filters: [], failures: [] };
const check = (condition, message) => { if (!condition) report.failures.push(message); };
function pagesIn(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return pagesIn(file);
    if (!file.endsWith('.html') || !fs.readFileSync(file, 'utf8').includes('<main')) return [];
    return ['/' + path.relative(site, file).split(path.sep).join('/')];
  });
}
async function visit(page, route) {
  await page.goto(base + route);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
}
async function widths(page) {
  return page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    overflow: [...document.querySelectorAll('main *')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width && (r.right > innerWidth + 1 || r.left < -1);
    }).map(el => ({ tag: el.tagName, class: el.className, text: el.textContent.trim().slice(0, 80) })),
  }));
}
async function filterStyle(tag) {
  return tag.evaluate(el => {
    const s = getComputedStyle(el);
    return { color: s.color, background: s.backgroundColor, decoration: s.textDecorationLine,
      thickness: s.textDecorationThickness, offset: s.textUnderlineOffset, text: el.textContent.trim() };
  });
}
function contrast(a, b) {
  const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number)
    .map(x => x / 255).map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)
    .reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
}
async function filters(page, dark, route, selector, tagNames) {
  await page.setViewportSize({ width: 320, height: 900 });
  await visit(page, route);
  const tag = page.locator(`${selector}:visible`).first();
  const idle = await filterStyle(tag);
  check(!idle.decoration.includes('underline'), `${dark}: unselected tag underlined`);
  await tag.focus();
  await page.keyboard.press('Enter');
  await page.waitForLoadState('load');
  await page.waitForFunction(() => document.querySelector('.tag[data-active]'));
  await page.addStyleTag({ content: '* { transition: none !important; }' });
  const selected = page.locator(`${selector}[data-active]:visible`).first();
  await selected.focus();
  const active = await filterStyle(selected);
  check(active.decoration.includes('underline'), `${dark}: active tag has no underline`);
  check(contrast(active.color, active.background) >= 4.5, `${dark}: active tag contrast below 4.5`);
  check((await widths(page)).document <= 320, `${dark}: selected filters overflow`);

  const search = page.locator('.search-box input');
  await search.fill(tagNames.map(name => `"tag: ${name}"`).join(" "));
  await page.waitForFunction(names => names.every(text =>
    [...document.querySelectorAll('.tag[data-active]')].some(el => el.textContent.trim() === text)), tagNames);
  const activeStyles = await page.locator('.tag[data-active]:visible').evaluateAll(els => els.map(el => ({
    text: el.textContent.trim(), decoration: getComputedStyle(el).textDecorationLine,
    color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor,
  })));
  check(activeStyles.length > 0 && activeStyles.every(s => s.decoration.includes('underline')),
    `${dark}: multiple active filters missing cue`);
  check(activeStyles.every(s => contrast(s.color, s.background) >= 4.5), `${dark}: multiple filter contrast`);
  const activeAxe = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  check(activeAxe.violations.length === 0, `${dark}: contrast violations with active filters`);

  await page.locator('.search-box button').click();
  check(await page.locator('.tag[data-active]').count() === 0, `${dark}: clear leaves active filters`);
  const hoverTag = page.locator(`${selector}:visible`).first();
  await hoverTag.hover();
  const hover = await filterStyle(hoverTag);
  check(!hover.decoration.includes('underline'), `${dark}: hover mistaken for selection`);
  check(contrast(hover.color, hover.background) >= 4.5, `${dark}: hover tag contrast below 4.5`);
  report.filters.push({ dark, route, idle, active, activeRatio: contrast(active.color, active.background), hover,
    hoverRatio: contrast(hover.color, hover.background), activeAxe: activeAxe.violations });
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const dark of [false, true]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addInitScript(value => localStorage.setItem('dark-mode', value), String(dark));
      const page = await context.newPage();
      for (const route of pagesIn(site)) {
        await page.setViewportSize({ width: 1440, height: 900 });
        await visit(page, route);
        assert.equal(await page.locator('html').getAttribute('data-dark'), String(dark));
        const axe = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
        check(axe.violations.length === 0, `${dark} ${route}: contrast violations`);
        await page.setViewportSize({ width: 320, height: 900 });
        const reflow = await widths(page);
        check(reflow.document <= reflow.viewport && reflow.body <= reflow.viewport && !reflow.overflow.length,
          `${dark} ${route}: 320px overflow`);
        report.pages.push({ route, dark, violations: axe.violations, incomplete: axe.incomplete, reflow });
        console.log(`${dark ? 'dark' : 'light'} ${route}: ${axe.violations.reduce((n, v) => n + v.nodes.length, 0)} contrast nodes; width ${reflow.document}`);
      }
      await filters(page, dark, '/publications/', '.citation .tag', ['journal', 'patent']);
      await filters(page, dark, '/news/', '.tag', ['award', 'grant']);
      await context.close();
    }
  } finally {
    await browser.close();
    fs.writeFileSync(process.env.DESIGN_REPORT || '/tmp/trela-design-gaps.json', JSON.stringify(report, null, 2));
  }
  console.log(`${report.pages.length} page/theme checks; ${report.failures.length} failures`);
  if (report.failures.length) {
    console.error(report.failures.join('\n'));
    if (!process.env.ALLOW_FAILURES) process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
