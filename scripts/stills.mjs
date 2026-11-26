// 指定フレームを PNG で書き出し、横並びのシートにまとめる（確認用）
// usage: node scripts/stills.mjs out.png 10 40 90 ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const [out, ...frames] = process.argv.slice(2);
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const chromiumOptions = {gl: 'angle'};
const composition = await selectComposition({serveUrl, id: 'MoshimoShort', browserExecutable, chromiumOptions});
const dir = path.join(path.dirname(out), 'frames');
fs.mkdirSync(dir, {recursive: true});
const files = [];
for (const fr of frames) {
  const file = path.join(dir, `f${String(fr).padStart(4, '0')}.png`);
  await renderStill({serveUrl, composition, frame: Number(fr), output: file, browserExecutable, chromiumOptions, overwrite: true});
  files.push(file);
}
const args = ['-loglevel', 'error', '-y'];
files.forEach((f) => args.push('-i', f));
const n = files.length;
args.push('-filter_complex', `${files.map((_, i) => `[${i}]scale=360:640[v${i}]`).join(';')};${files.map((_, i) => `[v${i}]`).join('')}hstack=inputs=${n}`, out);
if (n === 1) args.splice(args.indexOf('-filter_complex'), 2, '-vf', 'scale=360:640');
execFileSync('ffmpeg', args);
console.log('wrote', out);
