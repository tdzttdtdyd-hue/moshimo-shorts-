import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile} from 'remotion';
import {SCENES, TOTAL_FRAMES, sceneStart, DISCLAIMER} from './script';
import {SceneOverlay, Shades, ThemeTitle} from './Overlay';
import {FontsCoin} from './Fonts';
import {C01, C02, C03, C04, C05, C06, C07, C08, C09} from './Scenes';
import {SFX_COIN, SFX_GAIN} from '../sfx';
import {SAFE, SANS} from '../theme';

const COMPS: Record<string, React.FC> = {c01_one: C01, c02_desk: C02, c03_room: C03, c04_tower: C04, c05_trucks: C05, c06_dome: C06, c07_alu: C07, c08_earth: C08, c09_shop: C09};
const POS: Record<string, {cardTop?: number; captionBottom?: number}> = {
  c01_one: {cardTop: 600},
  c04_tower: {cardTop: 620},
  c05_trucks: {cardTop: 620},
  c06_dome: {cardTop: 620},
  c08_earth: {cardTop: 620},
};
export const BGM_GAIN = 0.3;

export const CoinVideo: React.FC<{withSfx?: boolean; withBgm?: boolean}> = ({withSfx = true, withBgm = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <FontsCoin />
    {SCENES.map((s) => {
      const C = COMPS[s.id];
      return (
        <Sequence key={s.id} from={sceneStart(s.id)} durationInFrames={s.duration} name={s.id}>
          <C />
        </Sequence>
      );
    })}
    <Shades />
    {SCENES.map((s, i) => {
      const prev = SCENES[i - 1]?.clock;
      const pop = !!s.clock && (!prev || !!s.clock.seq || s.clock.value !== prev.value);
      return (
        <Sequence key={`ui-${s.id}`} from={sceneStart(s.id)} durationInFrames={s.duration} name={`ui:${s.id}`}>
          <SceneOverlay spec={s} start={sceneStart(s.id)} popClock={pop} {...(POS[s.id] ?? {})} />
        </Sequence>
      );
    })}
    <ThemeTitle />
    <div data-telop="note" style={{position: 'absolute', left: SAFE.left, width: 1080 - SAFE.left - SAFE.right, top: 1456, textAlign: 'center', fontFamily: SANS, fontWeight: 500, fontSize: 21, color: 'rgba(255,255,255,0.65)', textShadow: '0 1px 4px rgba(0,0,0,0.7)', whiteSpace: 'pre'}}>
      {DISCLAIMER}
    </div>
    {withBgm && <Html5Audio src={staticFile('bgm/bgm_coin.wav')} volume={(f) => BGM_GAIN * Math.min(1, f / 15) * Math.min(1, (TOTAL_FRAMES - f) / 10)} />}
    {withSfx &&
      SFX_COIN.map((e, i) => (
        <Sequence key={i} from={e.at} durationInFrames={e.dur ?? 60} name={`sfx:${e.file}`}>
          <Html5Audio src={staticFile(`sfx/${e.file}.wav`)} volume={(e.vol ?? 0.8) * SFX_GAIN} />
        </Sequence>
      ))}
  </AbsoluteFill>
);
