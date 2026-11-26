import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Scene3D} from './v4/Scene3D';
import {CardView, ClockPanel, Disclaimer, FontsV4, NarrationView, Shade, TableView, Title} from './v4/Hud';
import {Callouts} from './v4/Callouts';
import {CARDS, NARRATION} from './v4/script';
import {F} from './v4/timeline';
import {SFX_V4, SFX_GAIN} from './sfx';

export const BGM_GAIN = 0.3;

// 宇宙へ抜けるときのホワイトアウト
const Whiteout: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [F.SPACE - 22, F.SPACE - 2, F.SPACE + 2, F.SPACE + 20], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const stop = interpolate(f, [F.STOP, F.STOP + 1, F.STOP + 8], [0, 0.35, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <>
      {o > 0 && <AbsoluteFill style={{background: '#f3f6fa', opacity: o}} />}
      {stop > 0 && <AbsoluteFill style={{background: '#ffffff', opacity: stop}} />}
    </>
  );
};

export const VideoV4: React.FC<{withSfx?: boolean; withBgm?: boolean}> = ({withSfx = true, withBgm = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <FontsV4 />
    <Scene3D />
    <Shade />
    <Callouts />
    <Title />
    <ClockPanel />
    {NARRATION.map((n, i) => (
      <NarrationView key={i} n={n} top={n.from >= F.SPACE ? 700 : 650} center={n.from >= F.SPACE + 150} />
    ))}
    {CARDS.map((c, i) => (
      <CardView key={i} c={c} top={c.from >= F.SPACE ? 1040 : 930} />
    ))}
    <TableView />
    <Disclaimer />
    <Whiteout />
    {withBgm && <Html5Audio src={staticFile('bgm/bgm.wav')} volume={(f) => BGM_GAIN * Math.min(1, f / 15) * Math.min(1, (F.END - f) / 10)} />}
    {withSfx &&
      SFX_V4.map((e, i) => (
        <Sequence key={i} from={e.at} durationInFrames={e.dur ?? 60} name={`sfx:${e.file}`}>
          <Html5Audio src={staticFile(`sfx/${e.file}.wav`)} volume={(e.vol ?? 0.8) * SFX_GAIN} />
        </Sequence>
      ))}
  </AbsoluteFill>
);
