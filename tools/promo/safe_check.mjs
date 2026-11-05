// Measures every promo element in a real browser and fails if any of it leaves the safe area.
//   node safe_check.mjs <project folder>
// Instagram covers the top 210 px, everything below y 1570, and x past 940 in the lower half. Don't trust by eye: measure.
import { chromium } from 'playwright-core';
import path from 'node:path';
const dir = path.resolve(process.argv[2]);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.route('**/gsap.min.js', r => r.abort());   // measure the layout, without the animation's starting poses
await page.goto('file://' + path.join(dir, 'index.html'));
const found = await page.evaluate(() => [...document.querySelectorAll('.safe, .safe-text')].map(el => {
  const r = el.getBoundingClientRect();
  let w = r.width;
  const inner = document.createRange(); inner.selectNodeContents(el); const t = inner.getBoundingClientRect();
  const box = el.classList.contains('safe-text') ? t : r;
  return { id: el.id || el.className, left: box.left, right: box.right, top: box.top, bottom: box.bottom };
}));
await browser.close();
let bad = 0;
for (const b of found) {
  const why = [];
  if (b.top < 210) why.push(`top ${Math.round(b.top)} is above 210`);
  if (b.bottom > 1570) why.push(`bottom ${Math.round(b.bottom)} is below 1570`);
  if (b.left < 40) why.push(`left ${Math.round(b.left)} is under 40`);
  if (b.bottom > 960 && b.right > 940) why.push(`right ${Math.round(b.right)} is past 940 in the lower half`);
  if (why.length) { bad++; console.log(`FAIL ${b.id}: ${why.join(', ')}`); }
}
console.log(bad ? `${bad} of ${found.length} elements are outside the safe area` : `OK: all ${found.length} elements are inside the safe area`);
process.exit(bad ? 1 : 0);
