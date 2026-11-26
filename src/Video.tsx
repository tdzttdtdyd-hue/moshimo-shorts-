import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile} from 'remotion';
import {SCENES, sceneStart} from './script';
import {Fonts} from './components/Fonts';
import {SceneOverlay} from './components/Overlay';
import {SCENE_COMPONENTS, OVERLAY_POS} from './scenes';
import {SFX, SFX_GAIN} from './sfx';

export const Video: React.FC<{withSfx?: boolean}> = ({withSfx = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <Fonts />
    {SCENES.map((s) => {
      const Comp = SCENE_COMPONENTS[s.id];
      return (
        <Sequence key={s.id} from={sceneStart(s.id)} durationInFrames={s.duration} name={s.id}>
          {Comp ? <Comp /> : <AbsoluteFill style={{background: '#333'}} />}
          <SceneOverlay spec={s} {...(OVERLAY_POS[s.id] ?? {})} />
        </Sequence>
      );
    })}
    {withSfx &&
      SFX.map((e, i) => (
        <Sequence key={i} from={sceneStart(e.scene) + e.at} durationInFrames={e.dur ?? 60} name={`sfx:${e.file}`}>
          <Html5Audio src={staticFile(`sfx/${e.file}.wav`)} volume={(e.vol ?? 0.8) * SFX_GAIN} />
        </Sequence>
      ))}
  </AbsoluteFill>
);
