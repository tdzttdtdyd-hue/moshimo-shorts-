import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {APPEAR, SCENES, START, TOTAL_FRAMES, VANISH_IN_S6, DISCLAIMER, fmtRange, hud, realTime, reachM, sceneStart} from './script';
import {SceneOverlay, Shades, ThemeTitle} from './Overlay';
import {FontsBh} from './Fonts';
import {B1, B2, B3, B4, B5, B6, B7, B8} from './Scenes';
import {SFX_BH, SFX_GAIN} from '../sfx';
import {C, SAFE, SANS, SERIF} from '../theme';

const COMPS: Record<string, React.FC> = {s1_city: B1, s2_coin: B2, s3_spaghetti: B3, s4_kanto: B4, s5_japan: B5, s6_earth: B6, s7_after: B7, s8_sky: B8};
const POS: Record<string, {cardTop?: number; captionBottom?: number}> = {s2_coin: {cardTop: 560}};
export const BGM_GAIN = 0.3;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// 画面左上：時間（明朝体）とスロー倍率／右上：吸い込まれた範囲
const Hud: React.FC = () => {
  const g = useCurrentFrame();
  const {fps} = useVideoConfig();
  const h = hud(g);
  const k = interpolate(g, [58, 70], [0, 1], clamp);
  const pop = spring({frame: g - APPEAR, fps, config: {damping: 14, stiffness: 160}});
  const showRange = g >= START.s3 && g < START.s6 + VANISH_IN_S6 + 20;
  const rk = interpolate(g, [START.s3, START.s3 + 10, START.s6 + VANISH_IN_S6, START.s6 + VANISH_IN_S6 + 20], [0, 1, 1, 0], clamp);
  const range = fmtRange(reachM(realTime(Math.min(g, START.s6 + VANISH_IN_S6))));
  return (
    <>
      <div style={{position: 'absolute', left: 92, top: 318, opacity: k}}>
        <div data-telop="clock-label" style={{display: 'table', fontFamily: SANS, fontWeight: 500, fontSize: 28, color: 'rgba(255,255,255,0.88)', letterSpacing: '0.12em', textShadow: '0 2px 8px rgba(0,0,0,0.6)', whiteSpace: 'pre'}}>
          {h.label}
        </div>
        <div data-telop="clock" style={{display: 'table', fontFamily: SERIF, fontWeight: 600, fontSize: 96, lineHeight: 1.1, color: '#fff', textShadow: '0 4px 18px rgba(0,0,0,0.6)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'pre', transform: `scale(${g >= APPEAR && g < APPEAR + 20 ? 1 + 0.15 * (1 - pop) : 1})`, transformOrigin: 'left center'}}>
          {h.value}
        </div>
        <div data-telop="ff" style={{display: 'inline-block', marginTop: 10, background: g >= APPEAR ? 'rgba(222, 92, 78, 0.9)' : 'rgba(60,64,80,0.85)', borderRadius: 30, padding: '6px 22px 8px 18px', fontFamily: SANS, fontWeight: 900, fontSize: 32, color: '#fff', whiteSpace: 'pre'}}>
          {h.slow === '等速' ? '▶ 等速' : h.slow === '早回し' ? '▶▶ 早回し' : `◀◀ ${h.slow}`}
        </div>
      </div>
      {showRange && (
        <div data-telop="assume" style={{position: 'absolute', right: SAFE.right + 8, top: 560, opacity: rk, background: 'rgba(18,20,30,0.8)', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 18, padding: '10px 22px 12px', fontFamily: SANS, textAlign: 'right'}}>
          <div style={{fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre'}}>吸い込まれた範囲</div>
          <div style={{fontSize: 46, fontWeight: 900, color: C.coral, whiteSpace: 'pre'}}>半径 {range}</div>
        </div>
      )}
    </>
  );
};

export const BhVideo: React.FC<{withSfx?: boolean; withBgm?: boolean}> = ({withSfx = true, withBgm = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <FontsBh />
    {SCENES.map((s) => {
      const Comp = COMPS[s.id];
      return (
        <Sequence key={s.id} from={sceneStart(s.id)} durationInFrames={s.duration} name={s.id}>
          <Comp />
        </Sequence>
      );
    })}
    <Shades />
    {SCENES.map((s) => (
      <Sequence key={`ui-${s.id}`} from={sceneStart(s.id)} durationInFrames={s.duration} name={`ui:${s.id}`}>
        <SceneOverlay spec={s} start={sceneStart(s.id)} popClock={false} {...(POS[s.id] ?? {})} />
      </Sequence>
    ))}
    <Hud />
    <ThemeTitle />
    <div data-telop="note" style={{position: 'absolute', left: SAFE.left, width: 1080 - SAFE.left - SAFE.right, top: 1440, textAlign: 'center', fontFamily: SANS, fontWeight: 500, fontSize: 20, lineHeight: 1.4, color: 'rgba(255,255,255,0.65)', textShadow: '0 1px 4px rgba(0,0,0,0.7)', whiteSpace: 'pre-wrap'}}>
      {DISCLAIMER}
    </div>
    {withBgm && <Html5Audio src={staticFile('bgm/bgm_bh.wav')} volume={(f) => BGM_GAIN * Math.min(1, f / 15) * Math.min(1, (TOTAL_FRAMES - f) / 10)} />}
    {withSfx &&
      SFX_BH.map((e, i) => (
        <Sequence key={i} from={e.at} durationInFrames={e.dur ?? 60} name={`sfx:${e.file}`}>
          <Html5Audio src={staticFile(`sfx/${e.file}.wav`)} volume={(e.vol ?? 0.8) * SFX_GAIN} />
        </Sequence>
      ))}
  </AbsoluteFill>
);
