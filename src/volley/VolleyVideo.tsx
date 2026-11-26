import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile} from 'remotion';
import {SCENES, TOTAL_FRAMES, sceneStart, DISCLAIMER} from './script';
import {SceneOverlay, Shades, ThemeTitle} from './Overlay';
import {FontsVolley} from './Fonts';
import {V01, V02, V03, V04, V05, V06, V07, V08, V09} from './Scenes';
import {SFX_VOLLEY, SFX_GAIN} from '../sfx';
import {SAFE, SANS} from '../theme';

const COMPS: Record<string, React.FC> = {v01_first: V01, v02_dig: V02, v03_knock: V03, v04_floor: V04, v05_sonic: V05, v06_burn: V06, v07_orbit: V07, v08_return: V08, v09_point: V09};
// シーンごとの UI 位置（データカードは被写体を隠しにくい位置に）
const POS: Record<string, {cardTop?: number; captionBottom?: number}> = {
  v01_first: {cardTop: 820},
  v07_orbit: {cardTop: 560},
  v09_point: {cardTop: 930},
};
export const BGM_GAIN = 0.3;

export const VolleyVideo: React.FC<{withSfx?: boolean; withBgm?: boolean}> = ({withSfx = true, withBgm = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <FontsVolley />
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
      const prev = SCENES[i - 1]?.clock?.value;
      return (
        <Sequence key={`ui-${s.id}`} from={sceneStart(s.id)} durationInFrames={s.duration} name={`ui:${s.id}`}>
          <SceneOverlay spec={s} start={sceneStart(s.id)} popClock={!!s.clock && s.clock.value !== prev} {...(POS[s.id] ?? {})} />
        </Sequence>
      );
    })}
    <ThemeTitle />
    <div data-telop="note" style={{position: 'absolute', left: SAFE.left, width: 1080 - SAFE.left - SAFE.right, top: 1456, textAlign: 'center', fontFamily: SANS, fontWeight: 500, fontSize: 22, color: 'rgba(255,255,255,0.65)', textShadow: '0 1px 4px rgba(0,0,0,0.7)', whiteSpace: 'pre'}}>
      {DISCLAIMER}
    </div>
    {withBgm && <Html5Audio src={staticFile('bgm/bgm_volley.wav')} volume={(f) => BGM_GAIN * Math.min(1, f / 15) * Math.min(1, (TOTAL_FRAMES - f) / 10)} />}
    {withSfx &&
      SFX_VOLLEY.map((e, i) => (
        <Sequence key={i} from={e.at} durationInFrames={e.dur ?? 60} name={`sfx:${e.file}`}>
          <Html5Audio src={staticFile(`sfx/${e.file}.wav`)} volume={(e.vol ?? 0.8) * SFX_GAIN} />
        </Sequence>
      ))}
  </AbsoluteFill>
);
