// 完成動画の自動検証：FFmpeg/ffprobe（仕様・静止区間・黒画面）＋ Playwright（テロップ配置・フォント）
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const VIDEO = process.argv[2] ?? 'out/moshimo_final.mp4';
const CHECK = 'out/check';
fs.mkdirSync(CHECK, {recursive: true});
const results = [];
const ok = (name, pass, detail = '') => {
  results.push({name, pass, detail});
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
};

// ---------- FFmpeg / ffprobe ----------
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', VIDEO]).toString());
const v = probe.streams.find((s) => s.codec_type === 'video');
const a = probe.streams.find((s) => s.codec_type === 'audio');
const dur = Number(probe.format.duration);
const [n, d] = v.r_frame_rate.split('/').map(Number);
ok('解像度 1080x1920', v.width === 1080 && v.height === 1920, `${v.width}x${v.height}`);
ok('30fps', n / d === 30, v.r_frame_rate);
ok('尺 30〜40秒', dur >= 30 && dur <= 40, `${dur.toFixed(2)}s / ${v.nb_frames} frames`);
ok('H.264 / yuv420p', v.codec_name === 'h264' && v.pix_fmt === 'yuv420p', `${v.codec_name} ${v.pix_fmt}`);
ok('音声トラック（SEのみ）', !!a, a ? `${a.codec_name} ${a.sample_rate}Hz` : 'なし');

const ffLog = (filters) => spawnSync('ffmpeg', ['-hide_banner', '-i', VIDEO, '-vf', filters, '-an', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
const freeze = ffLog('freezedetect=n=0.003:d=0.5');
const freezes = [...freeze.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => Number(m[1]));
ok('0.5秒以上の静止区間なし（スライドショー化していない）', freezes.length === 0, freezes.length ? `start at ${freezes.join(', ')}s` : '0件');
const black = ffLog('blackdetect=d=0.2:pix_th=0.08');
const blacks = [...black.matchAll(/black_start:([\d.]+)/g)].map((m) => Number(m[1]));
ok('意図しない黒画面なし', blacks.length === 0, blacks.length ? `start at ${blacks.join(', ')}s` : '0件');
if (a) {
  const vol = spawnSync('ffmpeg', ['-hide_banner', '-i', VIDEO, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
  const peak = Number(/max_volume: ([-\d.]+)/.exec(vol)?.[1]);
  ok('SE ピーク -3dBFS 以下（BGM を重ねる余裕）', peak <= -3, `${peak} dBFS`);
}
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', VIDEO, '-vf', 'fps=1,scale=270:480,tile=8x5:padding=6:color=black', '-frames:v', '1', `${CHECK}/contact_sheet.png`]);
ok('コンタクトシート作成', fs.existsSync(`${CHECK}/contact_sheet.png`), `${CHECK}/contact_sheet.png`);

// ---------- Playwright ----------
const esbuild = require('esbuild');
await esbuild.build({
  entryPoints: ['verify/app.tsx'],
  bundle: true,
  outfile: 'verify/dist/app.js',
  jsx: 'automatic',
  define: {'process.env.NODE_ENV': '"production"'},
  loader: {'.ts': 'ts', '.tsx': 'tsx'},
  logLevel: 'error',
});
const types = {'.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.html': 'text/html'};
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = url === '/' ? 'verify/index.html' : url === '/app.js' ? 'verify/dist/app.js' : path.join('public', path.normalize(url).replace(/^(\.\.[/\\])+/, ''));
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, {'content-type': types[path.extname(file)] ?? 'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4319, r));

const {chromium} = require('playwright');
const browser = await chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1});
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:4319/');
await page.waitForFunction(() => typeof window.__seek === 'function');
const checks = await page.evaluate(() => window.__checks);
const safe = await page.evaluate(() => window.__safe);

const report = [];
let safeFails = 0, overlapFails = 0, widthFails = 0;
for (const c of checks) {
  await page.evaluate((f) => window.__seek(f), c.frame);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll('[data-telop]')].map((el) => {
      const r = el.getBoundingClientRect();
      return {kind: el.dataset.telop, text: el.textContent, x: r.x, y: r.y, w: r.width, h: r.height, sw: el.scrollWidth};
    }),
  );
  const issues = [];
  for (const b of boxes) {
    if (b.kind === 'onomato') continue; // 擬音は演出として画面中央付近に自由配置
    const t = 2;
    if (b.x < safe.x - t || b.y < safe.y - t || b.x + b.w > safe.x + safe.w + t || b.y + b.h > safe.y + safe.h + t) {
      issues.push(`セーフエリア外: 「${b.text}」 (${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.w)}x${Math.round(b.h)})`);
      safeFails++;
    }
    if (b.w > safe.w + t) {
      issues.push(`幅超過: 「${b.text}」 ${Math.round(b.w)}px`);
      widthFails++;
    }
  }
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const p = boxes[i], q = boxes[j];
      const ix = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x);
      const iy = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
      if (ix > 4 && iy > 4) {
        issues.push(`重なり: 「${p.text}」×「${q.text}」`);
        overlapFails++;
      }
    }
  const shot = `${CHECK}/telop_${String(c.frame).padStart(4, '0')}.png`;
  await page.screenshot({path: shot});
  report.push({...c, boxes: boxes.length, issues});
  console.log(`  frame ${c.frame} (${c.what}): ${boxes.length} telops ${issues.length ? '⚠ ' + issues.join(' / ') : 'OK'}`);
}
const fontOk = await page.evaluate(async () => {
  const texts = [...document.querySelectorAll('[data-telop]')].map((e) => e.textContent).join('');
  await document.fonts.load(`900 80px 'M PLUS Rounded 1c'`, texts || 'あ');
  return [...document.fonts].filter((f) => f.family.includes('M PLUS') && f.status === 'loaded').length;
});
ok('テロップがセーフエリア内', safeFails === 0, `${checks.length} フレーム検査 / 違反 ${safeFails}`);
ok('テロップ同士の重なりなし', overlapFails === 0, `違反 ${overlapFails}`);
ok('テロップが横幅に収まる', widthFails === 0, `違反 ${widthFails}`);
ok('日本語フォント（M PLUS Rounded 1c）読込', fontOk > 0, `${fontOk} subsets loaded`);
const webglErr = errors.filter((e) => /webgl|three|context/i.test(e));
ok('コンソール / WebGL エラーなし', errors.length === 0, errors.length ? errors.slice(0, 3).join(' | ') : '0件');
void webglErr;
await browser.close();
server.close();

fs.writeFileSync(`${CHECK}/verify_report.json`, JSON.stringify({video: VIDEO, results, frames: report}, null, 2));
const failed = results.filter((r) => !r.pass);
console.log(failed.length ? `\n${failed.length} 件 不合格` : '\nすべて合格');
process.exit(failed.length ? 1 : 0);
