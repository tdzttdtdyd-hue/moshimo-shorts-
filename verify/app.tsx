// Playwright 検証用：Remotion Player を等倍（1080x1920）で表示するページ
import React, {useRef, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, PlayerRef} from '@remotion/player';
import {VideoV4} from '../src/VideoV4';
import {CARDS, NARRATION, TABLE} from '../src/v4/script';
import {F} from '../src/v4/timeline';
import {SAFE_BOX, FPS, WIDTH, HEIGHT} from '../src/theme';

declare global {
  interface Window {
    __seek: (f: number) => void;
    __checks: {frame: number; what: string}[];
    __safe: typeof SAFE_BOX;
  }
}

const checks: {frame: number; what: string}[] = [];
NARRATION.forEach((n, i) => checks.push({frame: Math.min(n.to - 10, n.from + 20), what: `narration${i}`}));
CARDS.forEach((c, i) => checks.push({frame: Math.min(c.to - 10, c.from + 30), what: `card${i}`}));
checks.push({frame: TABLE.from + 40, what: 'table'});
// 吹き出しが出ている場面
[F.STOP + 20, 90, 215, 270, 820, F.SPACE + 120].forEach((f) => checks.push({frame: f, what: 'callout'}));
window.__checks = checks.sort((a, b) => a.frame - b.frame);
window.__safe = SAFE_BOX;

const App: React.FC = () => {
  const ref = useRef<PlayerRef>(null);
  useEffect(() => {
    window.__seek = (f) => ref.current?.seekTo(f);
  }, []);
  return (
    <Player ref={ref} component={VideoV4} inputProps={{withSfx: false, withBgm: false}} durationInFrames={F.END} fps={FPS} compositionWidth={WIDTH} compositionHeight={HEIGHT} style={{width: WIDTH, height: HEIGHT}} />
  );
};
createRoot(document.getElementById('root')!).render(<App />);
