// Compare two served builds without changing their unfocused appearance.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { PNG } = require("pngjs");

const beforeURL = process.argv[2] || "http://127.0.0.1:4001";
const afterURL = process.argv[3] || "http://127.0.0.1:4000";
const output = process.env.A11Y_VISUAL_DIR || "/tmp/trela-visual";
const routes = ["/", "/research/", "/publications/", "/team/", "/news/", "/contact/", "/members/matthew-nigh.html", "/404.html"];

async function capture(page, url) {
  await page.goto(url);
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelectorAll("img").forEach((image) => image.loading = "eager");
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
  });
  await page.waitForTimeout(250);
  const geometry = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    elements: [...document.querySelectorAll("header,nav,main,footer,section,h1,h2,h3,.button,.citation,.citation-authors,.portrait,.alumni-card,.project-card,.thrust-card,.search-box,img")]
      .filter((el) => !el.classList.contains("sr-only"))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return [el.tagName, el.className, ...["x", "y", "width", "height"].map((key) => Math.round(rect[key] * 100) / 100)];
      }),
  }));
  const shots = [];
  for (const position of ["top", "middle", "bottom"]) {
    await page.evaluate((position) => window.scrollTo(0,
      position === "top" ? 0 : position === "middle" ? document.documentElement.scrollHeight / 2 : document.documentElement.scrollHeight
    ), position);
    await page.waitForTimeout(250);
    shots.push(await page.screenshot({ animations: "disabled" }));
  }
  return { geometry, shots };
}

(async () => {
  const { default: pixelmatch } = await import(require.resolve("pixelmatch"));
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  const summary = [];
  try {
    for (const width of [1440, 390]) {
      for (const dark of ["false", "true"]) {
        const contexts = [];
        for (const url of [beforeURL, afterURL]) {
          const context = await browser.newContext({ viewport: { width, height: 900 } });
          await context.addInitScript((value) => localStorage.setItem("dark-mode", value), dark);
          contexts.push({ context, page: await context.newPage(), url });
        }
        for (const route of routes) {
          const results = [];
          for (const { page, url } of contexts) results.push(await capture(page, url + route));
          const stem = path.join(output, `${width}-${dark}-${route.replaceAll("/", "_")}`);
          const differentPixels = results[0].shots.map((shot, index) => {
            const before = PNG.sync.read(shot);
            const after = PNG.sync.read(results[1].shots[index]);
            const diff = new PNG({ width: before.width, height: before.height });
            const count = pixelmatch(before.data, after.data, diff.data, before.width, before.height, { threshold: 0.1 });
            if (count) {
              fs.writeFileSync(`${stem}-${index}-before.png`, shot);
              fs.writeFileSync(`${stem}-${index}-after.png`, results[1].shots[index]);
              fs.writeFileSync(`${stem}-${index}-diff.png`, PNG.sync.write(diff));
            }
            return count;
          });
          const sameGeometry = JSON.stringify(results[0].geometry) === JSON.stringify(results[1].geometry);
          if (!sameGeometry) fs.writeFileSync(`${stem}-geometry.json`, JSON.stringify(results.map((result) => result.geometry), null, 2));
          const result = { width, dark, route, sameGeometry, differentPixels };
          summary.push(result);
          console.log(JSON.stringify(result));
        }
        for (const { context } of contexts) await context.close();
      }
    }
    assert.ok(summary.every((result) => result.sameGeometry && result.differentPixels.every((count) => count === 0)), "Visual differences found; inspect artifacts");
  } finally {
    fs.writeFileSync(path.join(output, "summary.json"), JSON.stringify(summary, null, 2));
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
