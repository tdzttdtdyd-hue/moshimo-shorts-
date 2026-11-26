// Remotion で書き出し → FFmpeg で最終エンコード
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const chromiumOptions = {gl: 'angle'};
fs.mkdirSync('out', {recursive: true});

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'MoshimoShort', browserExecutable, chromiumOptions});
console.log(`composition: ${composition.width}x${composition.height} ${composition.fps}fps ${composition.durationInFrames}f`);

let last = -1;
await renderMedia({
  serveUrl,
  composition,
  codec: 'h264',
  crf: 14,
  outputLocation: 'out/raw.mp4',
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
await renderMedia({serveUrl, composition, codec: 'wav', outputLocation: 'out/sfx_only.wav', browserExecutable, chromiumOptions, inputProps: {withSfx: true, withBgm: false}});
// BGM のみのステム
await renderMedia({serveUrl, composition, codec: 'wav', outputLocation: 'out/bgm_only.wav', browserExecutable, chromiumOptions, inputProps: {withSfx: false, withBgm: true}});

const ff = (args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], {stdio: 'inherit'});
// 最終版（BGM＋効果音）
ff(['-i', 'out/raw.mp4', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', 'out/moshimo_final.mp4']);
// 音声なし版（差し替え用）
ff(['-i', 'out/moshimo_final.mp4', '-c:v', 'copy', '-an', '-movflags', '+faststart', 'out/video_noaudio.mp4']);
console.log('done');
