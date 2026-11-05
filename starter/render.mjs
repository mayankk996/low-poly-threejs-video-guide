// Renders a film page to numbered frames through your installed Chrome. Every frame is a pure function of time,
// so any stretch can be re-rendered on its own and overwrites the same frame numbers.
//   node render.mjs film/index.html <from s> <to s> <out folder> [--fps 30] [--ss 2] [--mb 8] [--shutter 0.5] [--width 1080] [--height 1920] [--times 0,4,9]
// Writes f<n>.jpg and a<n>.json (which shot the frame belongs to). A page error stops the render, so it can't hang.
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, extname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream' };
const pos = [], opt = {}, argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[++i];
  else pos.push(argv[i]);
}
const [pagePath, from, to, outdir] = pos;
if (!outdir) { console.log('usage: node render.mjs film/index.html <from s> <to s> <out folder> [options]'); process.exit(1); }
const fps = +(opt.fps || 30), ss = +(opt.ss || 2), mb = +(opt.mb || 8), shutter = +(opt.shutter || .5), W = +(opt.width || 1080), H = +(opt.height || 1920);
const pageFile = resolve(pagePath), pageDir = dirname(pageFile);
mkdirSync(outdir, { recursive: true });
const gpu = process.platform === 'darwin' ? ['--use-angle=metal'] : [];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: [...gpu, '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const stop = async (why) => { console.log('STOPPED:', why); await browser.close(); process.exit(2); };
page.on('pageerror', (e) => stop(e.message));
page.on('crash', () => stop('the page crashed (GPU or memory)'));
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE', m.text()); });
await page.route('http://film.local/**', (route) => {
  const p = decodeURIComponent(new URL(route.request().url()).pathname);
  const f = p.startsWith('/node_modules/') ? join(HERE, p) : join(pageDir, p);
  if (!existsSync(f)) return route.fulfill({ status: 404, body: 'not found' });
  route.fulfill({ status: 200, body: readFileSync(f), headers: { 'content-type': MIME[extname(f)] || 'application/octet-stream' } });
});
await page.goto(`http://film.local/${basename(pageFile)}?w=${W}&h=${H}&ss=${ss}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 300000 });
console.log('GPU:', await page.evaluate(() => window.gpuInfo), `| ${W}x${H} at ${fps} fps, ss ${ss}, mb ${mb}`);
const frames = opt.times ? opt.times.split(',').map((x) => Math.round(+x * fps))
  : Array.from({ length: Math.round(to * fps) - Math.round(from * fps) }, (_, k) => Math.round(from * fps) + k);
const put = (name, data) => { const p = join(outdir, name); writeFileSync(p + '.tmp', data); renameSync(p + '.tmp', p); };
const t0 = Date.now();
for (let k = 0; k < frames.length; k++) {
  const n = frames[k];
  const r = await page.evaluate(([t, f]) => window.frameAt(t, f), [n / fps, { mb, shutter, fps }]);
  put(`f${n}.jpg`, Buffer.from(r.img.split(',')[1], 'base64'));
  put(`a${n}.json`, JSON.stringify({ anchors: r.anchors }));
  if ((k + 1) % 30 === 0 || k === frames.length - 1) {
    const s = (Date.now() - t0) / 1000;
    console.log(`${k + 1}/${frames.length} frames, ${Math.round(1000 * s / (k + 1))} ms per frame, ${(s / (k + 1) * (frames.length - k - 1) / 60).toFixed(1)} min left`);
  }
}
await browser.close();
