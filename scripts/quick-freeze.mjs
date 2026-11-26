// 縮小（scale 0.3）で素早く書き出し、0.5秒以上の静止区間だけを確認する
// usage: COMP=SunShort node scripts/quick-freeze.mjs
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const chromiumOptions = {gl: 'angle'};
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const inputProps = {withSfx: false, withBgm: false};
const composition = await selectComposition({serveUrl, id: process.env.COMP, browserExecutable, chromiumOptions, inputProps});
const out = '/tmp/claude-0/-home-user-moshimo-shorts-/bcb202f9-e244-567c-8a20-e15c15f6f138/scratchpad/quick.mp4';
// FROM/TO を指定すると、その範囲だけ原寸で書き出す（星など細かい動きの確認用）
const range = process.env.FROM ? [Number(process.env.FROM), Number(process.env.TO)] : null;
await renderMedia({serveUrl, composition, codec: 'h264', outputLocation: out, browserExecutable, chromiumOptions, inputProps, scale: range ? 1 : 0.3, concurrency: 4, muted: true, ...(range ? {frameRange: range} : {})});
const log = spawnSync('ffmpeg', ['-hide_banner', '-i', out, '-vf', 'freezedetect=n=0.003:d=0.5', '-an', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
const fr = [...log.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => Number(m[1]));
console.log(fr.length ? `静止区間あり: ${fr.join(', ')}s` : '静止区間なし');
