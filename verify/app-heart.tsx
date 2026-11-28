// Playwright 検証用（心の声の動画）
import React, {useRef, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, PlayerRef} from '@remotion/player';
import {HeartVideo} from '../src/heart/HeartVideo';
import {SCENES, TOTAL_FRAMES, sceneStart} from '../src/heart/script';
import {SAFE_BOX, FPS, WIDTH, HEIGHT} from '../src/theme';

declare global {
  interface Window {
    __seek: (f: number) => void;
    __checks: {frame: number; what: string}[];
    __safe: typeof SAFE_BOX;
  }
}

const checks: {frame: number; what: string}[] = [{frame: 30, what: 'hook title'}];
for (const s of SCENES) {
  const st = sceneStart(s.id);
  s.captions.forEach((c, i) => checks.push({frame: st + Math.min(c.to - 10, c.from + 20), what: `${s.id} caption${i}`}));
  (s.cards ?? []).forEach((c, i) => checks.push({frame: st + Math.min(c.to - 10, c.from + 34), what: `${s.id} card${i}`}));
  (s.callouts ?? []).forEach((c, i) => checks.push({frame: st + Math.round((c.from + c.to) / 2), what: `${s.id} callout${i}`}));
}
// 場面内の独自テロップ（入浴バッジ・水ゲージ・アイコスの吹き出し・コメント・グラフ）
for (const [id, fr] of [['h1_morning', 180], ['h2_train', 150], ['h3_meeting', 90], ['h3_meeting', 200], ['h4_lunch', 140], ['h5_client', 140], ['h6_store', 80], ['h7_home', 150], ['h8_child', 180]] as const) checks.push({frame: sceneStart(id) + fr, what: `${id} custom@${fr}`});
window.__checks = checks.sort((a, b) => a.frame - b.frame);
window.__safe = SAFE_BOX;

const App: React.FC = () => {
  const ref = useRef<PlayerRef>(null);
  useEffect(() => {
    window.__seek = (f) => ref.current?.seekTo(f);
  }, []);
  return <Player ref={ref} component={HeartVideo} inputProps={{withSfx: false, withBgm: false}} durationInFrames={TOTAL_FRAMES} fps={FPS} compositionWidth={WIDTH} compositionHeight={HEIGHT} style={{width: WIDTH, height: HEIGHT}} />;
};
createRoot(document.getElementById('root')!).render(<App />);
