import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile} from 'remotion';
import {SCENES, TOTAL_FRAMES, sceneStart, DISCLAIMER} from './script';
import {SceneOverlay, Shades, ThemeTitle} from './Overlay';
import {FontsFuji} from './Fonts';
import {F1, F2, F3, F4, F5, F6, F7, F8} from './Scenes';
import {SFX_FUJI, SFX_GAIN} from '../sfx';
import {SAFE, SANS} from '../theme';

const COMPS: Record<string, React.FC> = {f1_erupt: F1, f2_map: F2, f3_dark: F3, f4_train: F4, f5_road: F5, f6_blackout: F6, f7_cleanup: F7, f8_end: F8};
const POS: Record<string, {cardTop?: number; captionBottom?: number}> = {
  f2_map: {cardTop: 560},
  f4_train: {cardTop: 560},
  f5_road: {cardTop: 560},
  f6_blackout: {cardTop: 560},
  f7_cleanup: {cardTop: 560},
};
export const BGM_GAIN = 0.3;

export const FujiVideo: React.FC<{withSfx?: boolean; withBgm?: boolean}> = ({withSfx = true, withBgm = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <FontsFuji />
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
    {withBgm && <Html5Audio src={staticFile('bgm/bgm_fuji.wav')} volume={(f) => BGM_GAIN * Math.min(1, f / 15) * Math.min(1, (TOTAL_FRAMES - f) / 10)} />}
    {withSfx &&
      SFX_FUJI.map((e, i) => (
        <Sequence key={i} from={e.at} durationInFrames={e.dur ?? 60} name={`sfx:${e.file}`}>
          <Html5Audio src={staticFile(`sfx/${e.file}.wav`)} volume={(e.vol ?? 0.8) * SFX_GAIN} />
        </Sequence>
      ))}
  </AbsoluteFill>
);
