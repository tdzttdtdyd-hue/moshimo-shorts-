import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile} from 'remotion';
import {SCENES, TOTAL_FRAMES, sceneStart, DISCLAIMER} from './script';
import {SceneOverlay, Shades, ThemeTitle} from './Overlay';
import {FontsLine} from './Fonts';
import {L1, L2, L3, L4, L5, L6, L7, L8} from './Scenes';
import {SFX_LINE, SFX_GAIN} from '../sfx';
import {SAFE, SANS} from '../theme';

const COMPS: Record<string, React.FC> = {l1_one: L1, l2_tokyo: L2, l3_japan: L3, l4_world: L4, l5_moon: L5, l6_light: L6, l7_walk: L7, l8_end: L8};
const POS: Record<string, {cardTop?: number; captionBottom?: number}> = {
  l1_one: {cardTop: 600},
  l2_tokyo: {cardTop: 620},
  l3_japan: {cardTop: 620},
  l4_world: {cardTop: 620},
  l5_moon: {cardTop: 620},
  l6_light: {cardTop: 620},
  l7_walk: {cardTop: 620},
};
export const BGM_GAIN = 0.3;

export const LineVideo: React.FC<{withSfx?: boolean; withBgm?: boolean}> = ({withSfx = true, withBgm = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <FontsLine />
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
    {withBgm && <Html5Audio src={staticFile('bgm/bgm_line.wav')} volume={(f) => BGM_GAIN * Math.min(1, f / 15) * Math.min(1, (TOTAL_FRAMES - f) / 10)} />}
    {withSfx &&
      SFX_LINE.map((e, i) => (
        <Sequence key={i} from={e.at} durationInFrames={e.dur ?? 60} name={`sfx:${e.file}`}>
          <Html5Audio src={staticFile(`sfx/${e.file}.wav`)} volume={(e.vol ?? 0.8) * SFX_GAIN} />
        </Sequence>
      ))}
  </AbsoluteFill>
);
