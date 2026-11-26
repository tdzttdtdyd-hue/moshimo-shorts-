import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile} from 'remotion';
import {CAPTIONS, CARDS, SHOTS, TOTAL_L} from './script';
import {C1City, C1Ice, C1Light, C1Next, C1Title, P1, P2, P3, P4} from './Shots';
import {CaptionL, CardL, ChapterL, DisclaimerL, FontsL, PanelL, ShadesL, TitleL} from './Ui';
import {SFX_SUNLONG, SFX_GAIN} from '../sfx';

const SHOT_COMPS: Record<string, React.FC> = {p1_hook: P1, p2_light: P2, p3_zone: P3, p4_rule: P4, c1_title: C1Title, c1_light: C1Light, c1_city: C1City, c1_ice: C1Ice, c1_next: C1Next};
export const BGM_GAIN_L = 0.3;

export const SunLongVideo: React.FC<{withSfx?: boolean; withBgm?: boolean}> = ({withSfx = true, withBgm = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <FontsL />
    {SHOTS.map((s) => {
      const C = SHOT_COMPS[s.id];
      return (
        <Sequence key={s.id} from={s.from} durationInFrames={s.dur} name={s.id}>
          <C />
        </Sequence>
      );
    })}
    <ShadesL />
    {CARDS.map((c, i) => (
      <CardL key={i} c={c} />
    ))}
    {CAPTIONS.map((c, i) => (
      <CaptionL key={i} c={c} />
    ))}
    <PanelL />
    <TitleL />
    <ChapterL />
    <DisclaimerL />
    {withBgm && <Html5Audio src={staticFile('bgm/bgm_sunlong.wav')} volume={(f) => BGM_GAIN_L * Math.min(1, f / 20) * Math.min(1, (TOTAL_L - f) / 15)} />}
    {withSfx &&
      SFX_SUNLONG.map((e, i) => (
        <Sequence key={i} from={e.at} durationInFrames={e.dur ?? 60} name={`sfx:${e.file}`}>
          <Html5Audio src={staticFile(`sfx/${e.file}.wav`)} volume={(e.vol ?? 0.8) * SFX_GAIN} />
        </Sequence>
      ))}
  </AbsoluteFill>
);
