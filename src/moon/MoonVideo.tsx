import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile} from 'remotion';
import {SCENES, TOTAL_FRAMES, sceneStart, DISCLAIMER} from './script';
import {SceneOverlay, Shades, ThemeTitle} from './Overlay';
import {FontsMoon} from './Fonts';
import {M1, M2, M3, M4, M5, M6, M7, M8} from './Scenes';
import {SFX_MOON, SFX_GAIN} from '../sfx';
import {SAFE, SANS} from '../theme';

const COMPS: Record<string, React.FC> = {m1_now: M1, m2_half: M2, m3_quarter: M3, m4_geo: M4, m5_west: M5, m6_break: M6, m7_ring: M7, m8_end: M8};
const POS: Record<string, {cardTop?: number; captionBottom?: number}> = {
  m2_half: {cardTop: 880},
  m3_quarter: {cardTop: 880},
  m4_geo: {cardTop: 880},
  m5_west: {cardTop: 880},
};
export const BGM_GAIN = 0.3;

export const MoonVideo: React.FC<{withSfx?: boolean; withBgm?: boolean}> = ({withSfx = true, withBgm = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <FontsMoon />
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
    <div data-telop="note" style={{position: 'absolute', left: SAFE.left, width: 1080 - SAFE.left - SAFE.right, top: 1440, textAlign: 'center', fontFamily: SANS, fontWeight: 500, fontSize: 21, lineHeight: 1.4, color: 'rgba(255,255,255,0.65)', textShadow: '0 1px 4px rgba(0,0,0,0.7)', whiteSpace: 'pre'}}>
      {DISCLAIMER}
    </div>
    {withBgm && <Html5Audio src={staticFile('bgm/bgm_moon.wav')} volume={(f) => BGM_GAIN * Math.min(1, f / 15) * Math.min(1, (TOTAL_FRAMES - f) / 10)} />}
    {withSfx &&
      SFX_MOON.map((e, i) => (
        <Sequence key={i} from={e.at} durationInFrames={e.dur ?? 60} name={`sfx:${e.file}`}>
          <Html5Audio src={staticFile(`sfx/${e.file}.wav`)} volume={(e.vol ?? 0.8) * SFX_GAIN} />
        </Sequence>
      ))}
  </AbsoluteFill>
);
