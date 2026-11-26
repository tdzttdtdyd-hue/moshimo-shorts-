// Remotion で書き出し → FFmpeg で最終エンコード
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const chromiumOptions = {gl: 'angle'};
const COMP = process.env.COMP ?? 'MoshimoShort';
const OUT = process.env.OUT ?? 'out';
const FINAL = process.env.FINAL ?? 'moshimo_final';
fs.mkdirSync(OUT, {recursive: true});

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: COMP, browserExecutable, chromiumOptions});
console.log(`composition: ${composition.width}x${composition.height} ${composition.fps}fps ${composition.durationInFrames}f`);

let last = -1;
await renderMedia({
  serveUrl,
  composition,
  codec: 'h264',
  crf: 14,
  outputLocation: `${OUT}/raw.mp4`,
  browserExecutable,
  chromiumOptions,
  concurrency: 4,
  onProgress: ({progress}) => {
    const p = Math.floor(progress * 20);
    if (p !== last) {
      last = p;
      console.log(`render ${Math.round(progress * 100)}%`);
    }
  },
});

// 効果音のみのステム（BGM なし）
const stem = async (inputProps, outputLocation) => {
  const comp = await selectComposition({serveUrl, id: COMP, browserExecutable, chromiumOptions, inputProps});
  await renderMedia({serveUrl, composition: comp, codec: 'wav', outputLocation, browserExecutable, chromiumOptions, inputProps});
};
await stem({withSfx: true, withBgm: false}, `${OUT}/sfx_only.wav`);
// BGM のみのステム
await stem({withSfx: false, withBgm: true}, `${OUT}/bgm_only.wav`);

const ff = (args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], {stdio: 'inherit'});
// 最終版（BGM＋効果音）
ff(['-i', `${OUT}/raw.mp4`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', `${OUT}/${FINAL}.mp4`]);
// 音声なし版（差し替え用）
ff(['-i', `${OUT}/${FINAL}.mp4`, '-c:v', 'copy', '-an', '-movflags', '+faststart', `${OUT}/video_noaudio.mp4`]);
console.log('done');
