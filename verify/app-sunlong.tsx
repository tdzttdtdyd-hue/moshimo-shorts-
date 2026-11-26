// Playwright 検証用（長尺・横長）
import React, {useRef, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, PlayerRef} from '@remotion/player';
import {SunLongVideo} from '../src/sunlong/SunLongVideo';
import {CAPTIONS, CARDS, CHAPTERS, LH, LW, TOTAL_L} from '../src/sunlong/script';
import {FPS} from '../src/theme';

declare global {
  interface Window {
    __seek: (f: number) => void;
    __checks: {frame: number; what: string}[];
    __safe: {x: number; y: number; w: number; h: number};
  }
}
const checks: {frame: number; what: string}[] = [{frame: 60, what: 'hook'}];
CAPTIONS.forEach((c, i) => checks.push({frame: Math.min(c.to - 10, c.from + 20), what: `caption${i}`}));
CARDS.forEach((c, i) => checks.push({frame: Math.min(c.to - 10, c.from + 24), what: `card${i}`}));
CHAPTERS.forEach((c, i) => checks.push({frame: c.from + 60, what: `chapter${i}`}));
[90, 300, 620, 760, 2560, 2620].forEach((f) => checks.push({frame: f, what: 'callout'}));
window.__checks = checks.sort((a, b) => a.frame - b.frame);
window.__safe = {x: 40, y: 20, w: LW - 80, h: LH - 30};

const App: React.FC = () => {
  const ref = useRef<PlayerRef>(null);
  useEffect(() => {
    window.__seek = (f) => ref.current?.seekTo(f);
  }, []);
  return <Player ref={ref} component={SunLongVideo} inputProps={{withSfx: false, withBgm: false}} durationInFrames={TOTAL_L} fps={FPS} compositionWidth={LW} compositionHeight={LH} style={{width: LW, height: LH}} />;
};
createRoot(document.getElementById('root')!).render(<App />);
