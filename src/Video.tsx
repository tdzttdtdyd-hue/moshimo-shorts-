import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile} from 'remotion';
import {SCENES, TOTAL_FRAMES, sceneStart} from './script';
import {Fonts} from './components/Fonts';
import {SceneOverlay, Shades, ThemeTitle} from './components/Overlay';
import {SCENE_COMPONENTS, OVERLAY_POS} from './scenes';
import {SFX, SFX_GAIN} from './sfx';

export const BGM_GAIN = 0.32;

export const Video: React.FC<{withSfx?: boolean; withBgm?: boolean}> = ({withSfx = true, withBgm = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <Fonts />
    {SCENES.map((s, i) => {
      const Comp = SCENE_COMPONENTS[s.id];
      return (
        <Sequence key={s.id} from={sceneStart(s.id)} durationInFrames={s.duration} name={s.id}>
          {Comp ? <Comp /> : <AbsoluteFill style={{background: '#333'}} />}
        </Sequence>
      );
    })}
    <Shades />
    {SCENES.map((s, i) => {
      const prev = SCENES[i - 1]?.clock?.value;
      const popClock = !!s.clock && s.clock.value !== prev;
      return (
        <Sequence key={`ui-${s.id}`} from={sceneStart(s.id)} durationInFrames={s.duration} name={`ui:${s.id}`}>
          <SceneOverlay spec={s} start={sceneStart(s.id)} popClock={popClock} {...(OVERLAY_POS[s.id] ?? {})} />
        </Sequence>
      );
    })}
    <ThemeTitle />
    {withBgm && <Html5Audio src={staticFile('bgm/bgm.wav')} volume={(f) => BGM_GAIN * Math.min(1, f / 15) * Math.min(1, (TOTAL_FRAMES - f) / 10)} />}
    {withSfx &&
      SFX.map((e, i) => (
        <Sequence key={i} from={sceneStart(e.scene) + e.at} durationInFrames={e.dur ?? 60} name={`sfx:${e.file}`}>
          <Html5Audio src={staticFile(`sfx/${e.file}.wav`)} volume={(e.vol ?? 0.8) * SFX_GAIN} />
        </Sequence>
      ))}
  </AbsoluteFill>
);
