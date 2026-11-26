// Playwright 検証用：Remotion Player を等倍（1080x1920）で表示するページ
import React, {useRef, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, PlayerRef} from '@remotion/player';
import {Video} from '../src/Video';
import {SCENES, TOTAL_FRAMES, sceneStart} from '../src/script';
import {SAFE_BOX, FPS, WIDTH, HEIGHT} from '../src/theme';

declare global {
  interface Window {
    __seek: (f: number) => void;
    __checks: {frame: number; what: string}[];
    __safe: typeof SAFE_BOX;
  }
}

const checks: {frame: number; what: string}[] = [];
for (const s of SCENES) {
  const st = sceneStart(s.id);
  s.captions.forEach((b, i) => checks.push({frame: st + Math.min(b.to - 10, b.from + 18), what: `${s.id} caption${i}`}));
  (s.cards ?? []).forEach((n, i) => checks.push({frame: st + Math.min(n.to - 10, n.from + 34), what: `${s.id} card${i}`}));
  // 吹き出しが出ている終盤も確認
  checks.push({frame: st + s.duration - 12, what: `${s.id} end`});
}
window.__checks = checks.sort((a, b) => a.frame - b.frame);
window.__safe = SAFE_BOX;

const App: React.FC = () => {
  const ref = useRef<PlayerRef>(null);
  useEffect(() => {
    window.__seek = (f) => ref.current?.seekTo(f);
  }, []);
  return (
    <Player
      ref={ref}
      component={Video}
      inputProps={{withSfx: false, withBgm: false}}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      style={{width: WIDTH, height: HEIGHT}}
    />
  );
};
createRoot(document.getElementById('root')!).render(<App />);
