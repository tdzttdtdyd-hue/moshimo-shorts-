import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Beat, NumberSpec, SceneSpec} from '../script';
import {C, SAFE, WIDTH} from '../theme';
import {outline, Rich} from './Text';

const pop = (f: number, fps: number, delay = 0) =>
  spring({frame: f - delay, fps, config: {damping: 11, stiffness: 190, mass: 0.7}});

const exitK = (f: number, to: number) => interpolate(f, [to - 6, to], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const CONTENT_W = WIDTH - SAFE.left - SAFE.right;

export const TimeLabel: React.FC<{text: string; from: number; to: number}> = ({text, from, to}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < from || f >= to) return null;
  const s = pop(f, fps, from);
  const x = interpolate(s, [0, 1], [-60, 0]);
  return (
    <div style={{position: 'absolute', top: 250, left: SAFE.left, width: CONTENT_W, display: 'flex', justifyContent: 'center'}}>
      <div
        data-telop="label"
        style={{
          transform: `translateX(${x}px) scale(${0.6 + 0.4 * s})`,
          opacity: Math.min(1, s * 1.5) * exitK(f, to),
          background: C.red,
          border: `7px solid ${C.black}`,
          borderRadius: 22,
          padding: '6px 34px 12px',
          boxShadow: `0 8px 0 ${C.black}`,
          ...outline(8),
          textShadow: 'none',
          fontSize: 64,
          color: C.white,
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const MainTelop: React.FC<{beat: Beat; top: number}> = ({beat, top}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < beat.from || f >= beat.to) return null;
  const size = beat.size ?? 84;
  const ex = exitK(f, beat.to);
  return (
    <div style={{position: 'absolute', top, left: SAFE.left, width: CONTENT_W, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
      {beat.lines.map((l, i) => {
        const s = pop(f, fps, beat.from + i * 5);
        return (
          <div
            key={i}
            data-telop="main"
            style={{
              ...outline(size * 0.13),
              fontSize: size,
              color: C.white,
              transform: `scale(${Math.max(0, s) * (0.9 + 0.1 * ex)})`,
              opacity: Math.min(1, s * 2) * ex,
            }}
          >
            <Rich text={l} />
          </div>
        );
      })}
    </div>
  );
};

const fmt = (v: number) => Math.round(v).toLocaleString('ja-JP');

export const BigNumber: React.FC<{spec: NumberSpec; top: number}> = ({spec, top}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < spec.from || f >= spec.to) return null;
  const t = f - spec.from;
  const countDur = 22;
  const ex = exitK(f, spec.to);
  const s = pop(f, fps, spec.from);
  const done = t >= countDur;
  const bounce = done ? 1 + 0.12 * Math.exp(-(t - countDur) / 4) * Math.cos((t - countDur) * 0.9) : 1;
  const k = interpolate(t, [0, countDur], [0, 1], {extrapolateRight: 'clamp', easing: (x) => 1 - Math.pow(1 - x, 3)});
  const color = spec.color ?? C.yellow;
  const size = spec.size ?? 200;
  const flash = done ? Math.max(0, 1 - (t - countDur) / 8) : 0;
  return (
    <div style={{position: 'absolute', top, left: SAFE.left, width: CONTENT_W, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{transform: `scale(${Math.max(0, s) * bounce})`, opacity: ex, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        {spec.value !== undefined ? (
          <div data-telop="number" style={{display: 'flex', alignItems: 'baseline', ...outline(size * 0.075), textShadow: `0 ${size * 0.05}px 0 ${C.black}, 0 0 ${40 * flash}px rgba(255,240,120,${flash})`}}>
            {spec.prefix && <span style={{fontSize: size * 0.36, color: C.white, marginRight: 8}}>{spec.prefix}</span>}
            <span style={{fontSize: size, color, fontVariantNumeric: 'tabular-nums'}}>{fmt(spec.value * k)}</span>
            {spec.unit && <span style={{fontSize: size * 0.4, color: C.white, marginLeft: 6}}>{spec.unit}</span>}
          </div>
        ) : (
          <div data-telop="number" style={{fontSize: size, color, textAlign: 'center', ...outline(size * 0.1)}}>
            {spec.text}
          </div>
        )}
        {spec.sub && (
          <div
            data-telop="sub"
            style={{
              ...outline(7),
              fontSize: 58,
              color: C.white,
              marginTop: 6,
              opacity: interpolate(t, [countDur - 4, countDur + 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
              transform: `translateY(${interpolate(t, [countDur - 4, countDur + 6], [24, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`,
            }}
          >
            <Rich text={spec.sub} />
          </div>
        )}
      </div>
    </div>
  );
};

// シーン仕様からテロップ一式を描画
export const SceneOverlay: React.FC<{spec: SceneSpec; mainTop?: number; numberTop?: number}> = ({spec, mainTop = 380, numberTop = 980}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    {(spec.labels ?? []).map((l, i) => (
      <TimeLabel key={i} {...l} />
    ))}
    {spec.beats.map((b, i) => (
      <MainTelop key={i} beat={b} top={mainTop} />
    ))}
    {(spec.numbers ?? []).map((n, i) => (
      <BigNumber key={i} spec={n} top={numberTop} />
    ))}
  </AbsoluteFill>
);

export const Flash: React.FC<{at: number; dur?: number; color?: string; max?: number}> = ({at, dur = 8, color = '#fff', max = 0.9}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at, at + 1, at + dur], [0, max, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (o <= 0) return null;
  return <AbsoluteFill style={{background: color, opacity: o}} />;
};

export const Vignette: React.FC<{strength?: number}> = ({strength = 0.45}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${strength}) 100%)`}} />
);

// 漫画風の集中線
export const SpeedLines: React.FC<{from: number; to: number; color?: string; count?: number}> = ({from, to, color = '#ffffff', count = 48}) => {
  const f = useCurrentFrame();
  if (f < from || f >= to) return null;
  const o = interpolate(f, [from, from + 3, to - 6, to], [0, 0.85, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const lines = Array.from({length: count}).map((_, i) => {
    const a = (i / count) * Math.PI * 2 + ((i * 7919) % 13) * 0.01;
    const jitter = ((i * 31 + f * 17) % 11) / 11;
    const r0 = 560 + jitter * 220;
    const r1 = 1400;
    const w = 6 + ((i * 13) % 5) * 3;
    return {x0: 540 + Math.cos(a) * r0, y0: 960 + Math.sin(a) * r0 * 1.4, x1: 540 + Math.cos(a) * r1, y1: 960 + Math.sin(a) * r1 * 1.4, w};
  });
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920}>
        {lines.map((l, i) => (
          <line key={i} x1={l.x0} y1={l.y0} x2={l.x1} y2={l.y1} stroke={color} strokeWidth={l.w} strokeLinecap="round" />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

export const Onomato: React.FC<{text: string; at: number; dur?: number; x: number; y: number; rot?: number; size?: number; color?: string}> = ({
  text,
  at,
  dur = 30,
  x,
  y,
  rot = -8,
  size = 150,
  color = C.yellow,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at || f >= at + dur) return null;
  const s = spring({frame: f - at, fps, config: {damping: 8, stiffness: 260}});
  const o = interpolate(f, [at + dur - 6, at + dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      data-telop="onomato"
      style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${s})`, opacity: o, fontSize: size, color, ...outline(size * 0.1)}}
    >
      {text}
    </div>
  );
};
