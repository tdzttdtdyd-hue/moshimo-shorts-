import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, SAFE, SANS, SERIF} from '../theme';
import {CalloutView, emWidth} from '../components/Overlay';
import {CALLOUT_TEXT, CARDS, Card, DISCLAIMER, NARRATION, Narr, TABLE, THEME_TITLE} from './script';
import {F, formatClock, formatRate, hourAngle, rateAt, simTime, skyState} from './timeline';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const fadeIO = (f: number, a: number, b: number, d = 8) => interpolate(f, [a, a + d, b - d, b], [0, 1, 1, 0], clamp);
const shadow = '0 2px 10px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.7)';
const CONTENT_W = 1080 - SAFE.left - SAFE.right;

// ---------- フォント ----------
const ALL_TEXT =
  NARRATION.flatMap((n) => [...n.lines, n.note ?? '']).join('') +
  CARDS.map((c) => c.label + (c.prefix ?? '') + (c.unit ?? '') + (c.note ?? '')).join('') +
  TABLE.title.join('') +
  TABLE.rows.map((r) => r.k + r.v + r.sub).join('') +
  Object.values(CALLOUT_TEXT)
    .map((c) => c.tag + c.text)
    .join('') +
  DISCLAIMER +
  Object.values(THEME_TITLE).join('') +
  '0123456789,.:+−×万日▶※シミュレーション自転停止からまでいまの風空（東京）おだやか時速暴風強風昼夕方夜北極側から見た地球1日の長さ24時間約365日あなたスロー珈琲薬ホテル居酒屋歯科らーめん不動産書店花クリーニング定食眼科';

export const FontsV4: React.FC = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = staticFile('fonts/fonts.css');
    link.onload = () => {
      Promise.all([
        ...[500, 700, 900].map((w) => document.fonts.load(`${w} 100px 'Noto Sans JP'`, ALL_TEXT)),
        ...[600, 700].map((w) => document.fonts.load(`${w} 100px 'Noto Serif JP'`, ALL_TEXT)),
      ])
        .then(() => document.fonts.ready)
        .then(() => continueRender(handle))
        .catch(() => continueRender(handle));
    };
    document.head.appendChild(link);
  }, [handle]);
  return null;
};

// ---------- テーマ（明朝体・常駐） ----------
export const Title: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', top: 226, left: SAFE.left, width: CONTENT_W, textAlign: 'center', opacity: o}}>
      <span data-telop="title" style={{fontFamily: SERIF, fontWeight: 700, fontSize: 44, color: '#f2efe9', letterSpacing: '0.05em', textShadow: shadow, whiteSpace: 'pre'}}>
        {THEME_TITLE.pre}
        <span style={{color: C.skyBlue}}>{THEME_TITLE.key}</span>
        {THEME_TITLE.post}
      </span>
    </div>
  );
};

// ---------- 左上：経過時間（明朝体）と状態バッジ ----------
const Badge: React.FC<{text: string; color: string; pulse?: number}> = ({text, color, pulse = 0}) => (
  <span style={{display: 'inline-block', background: color, color: '#fff', fontFamily: SANS, fontWeight: 900, fontSize: 30, borderRadius: 8, padding: '2px 14px 5px', boxShadow: `0 0 ${pulse * 18}px ${color}`, whiteSpace: 'pre'}}>{text}</span>
);

const windBadge = (f: number) =>
  f < F.STOP ? {t: 'おだやか', c: '#5f7389'} : f < F.TSUNAMI_END ? {t: '時速1,360km', c: '#d23f33'} : f < F.FF2_END ? {t: '暴風', c: '#de6b22'} : {t: '強風', c: '#b8901f'};
const skyBadge = (f: number) => {
  const s = skyState(f);
  return s === 'day' ? {t: '昼', c: '#c99a1e'} : s === 'dusk' ? {t: '夕方', c: '#d0612a'} : {t: '夜', c: '#3a63c4'};
};

export const ClockPanel: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [F.CRANE + 20, F.SPACE - 10], [1, 0], clamp);
  if (o <= 0) return null;
  const t = simTime(f);
  const r = rateAt(f);
  const slow = f >= F.STOP && r < 1;
  const rateText = f < F.STOP ? '' : slow ? `▶ ${formatRate(r)} スロー` : r === 1 ? `▶ ${formatRate(r)}` : `▶▶ ${formatRate(r)}`;
  const rateColor = slow ? '#3f7fbf' : r === 1 ? '#5f7389' : '#d9533f';
  const w = windBadge(f);
  const s = skyBadge(f);
  const stopFlash = f >= F.STOP && f < F.STOP + 12 ? 1 - (f - F.STOP) / 12 : 0;
  const label = {fontFamily: SANS, fontWeight: 500, fontSize: 26, color: 'rgba(255,255,255,0.88)', letterSpacing: '0.12em', textShadow: shadow, whiteSpace: 'pre' as const};
  return (
    <div style={{position: 'absolute', left: 72, top: 300, opacity: o}}>
      <div data-telop="hud" style={{display: 'table', border: '1.5px solid rgba(255,255,255,0.55)', borderRadius: 6, padding: '1px 10px 3px', ...label, fontSize: 22, letterSpacing: '0.08em'}}>
        ※シミュレーション
      </div>
      <div data-telop="hud" style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 10}}>
        <span style={{...label, letterSpacing: '0.16em'}}>{f < F.STOP ? '自転停止まで' : '自転停止から'}</span>
        {rateText && (
          <span style={{background: rateColor, color: '#fff', fontFamily: SANS, fontWeight: 900, fontSize: 24, borderRadius: 6, padding: '1px 10px 3px', whiteSpace: 'pre'}}>{rateText}</span>
        )}
      </div>
      <div
        data-telop="clock"
        style={{
          display: 'table',
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: 90,
          lineHeight: 1.12,
          color: f < F.STOP ? '#ffd0c4' : '#ffffff',
          letterSpacing: '0.01em',
          textShadow: `0 4px 18px rgba(0,0,0,0.55), 0 0 ${stopFlash * 30}px rgba(255,120,90,${stopFlash})`,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'pre',
        }}
      >
        {formatClock(t)}
      </div>
      <div data-telop="hud" style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 4}}>
        <span style={label}>いまの風（東京）</span>
        <Badge text={w.t} color={w.c} pulse={stopFlash} />
      </div>
      <div data-telop="hud" style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 8}}>
        <span style={label}>いまの空（東京）</span>
        <Badge text={s.t} color={s.c} />
      </div>
    </div>
  );
};

// ---------- 右上：北極側から見た地球（昼夜・東京の位置） ----------
export const GlobePanel: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [F.CRANE + 20, F.SPACE - 10], [1, 0], clamp);
  if (o <= 0) return null;
  const W = 280, H = 290, cx = 140, cy = 150, R = 86;
  // 停止前は自転で東京が回る。停止後は東京が固定され、太陽の向きがゆっくり回る
  const preSpin = f < F.STOP ? ((F.STOP - f) / 30) * 0.9 : 0;
  const tokyoAng = -Math.PI / 2 - preSpin;
  const sunAng = -Math.PI / 2 + hourAngle(f);
  const tr = R * Math.cos((35.7 * Math.PI) / 180);
  const tx = cx + Math.cos(tokyoAng) * tr, ty = cy + Math.sin(tokyoAng) * tr;
  const sx = cx + Math.cos(sunAng) * (R + 34), sy = cy + Math.sin(sunAng) * (R + 34);
  const deg = (sunAng * 180) / Math.PI;
  const len = f < F.TSUNAMI_END ? '24時間' : '約365日';
  return (
    <div data-telop="globe" style={{position: 'absolute', right: SAFE.right + 6, top: 296, width: W, opacity: o, background: 'rgba(20,24,34,0.72)', border: '1.5px solid rgba(255,255,255,0.22)', borderRadius: 18, padding: '10px 10px 12px', boxSizing: 'border-box', fontFamily: SANS}}>
      <div style={{fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.85)', paddingLeft: 6}}>北極側から見た地球</div>
      <svg width={W - 20} height={H - 70} viewBox={`0 0 ${W} ${H - 40}`}>
        <defs>
          <clipPath id="disk">
            <circle cx={cx} cy={cy - 20} r={R} />
          </clipPath>
        </defs>
        <g transform="translate(0,-20)">
          <circle cx={cx} cy={cy} r={R} fill="#1b2747" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />
          {/* 昼側 */}
          <g clipPath="url(#disk)" transform="translate(0,20)">
            <g transform={`translate(0,-20) rotate(${deg} ${cx} ${cy})`}>
              <rect x={cx} y={cy - R} width={R} height={R * 2} fill="#d9b25a" opacity={0.85} />
            </g>
          </g>
          {[0.33, 0.66].map((k) => (
            <circle key={k} cx={cx} cy={cy} r={R * k} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
          ))}
          <circle cx={cx} cy={cy} r={3} fill="#fff" />
          {/* 太陽 */}
          <circle cx={sx} cy={sy} r={11} fill="#ffcf5a" />
          {/* 東京 */}
          <circle cx={tx} cy={ty} r={7} fill="#fff" stroke="#d9483b" strokeWidth={4} />
          <text x={tx + 12} y={ty + 5} fill="#fff" fontSize={20} fontWeight={900} fontFamily="Noto Sans JP">
            東京
          </text>
          {/* 自転の矢印 */}
          <path d={`M ${cx + R + 10} ${cy + 30} A ${R + 10} ${R + 10} 0 0 1 ${cx + 30} ${cy + R + 10}`} fill="none" stroke={f < F.STOP ? '#8fc3ff' : 'rgba(255,255,255,0.25)'} strokeWidth={3} />
          {f >= F.STOP && (
            <text x={cx + R - 6} y={cy + R + 6} fill="#ff8a78" fontSize={22} fontWeight={900} fontFamily="Noto Sans JP">
              自転停止
            </text>
          )}
        </g>
      </svg>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 8px', marginTop: -6}}>
        <span style={{fontSize: 22, color: 'rgba(255,255,255,0.8)', fontWeight: 500}}>1日の長さ</span>
        <span style={{fontSize: 30, color: f < F.TSUNAMI_END ? '#fff' : C.peach, fontWeight: 900}}>{len}</span>
      </div>
    </div>
  );
};

// ---------- 左：語り（明朝体） ----------
const Rich: React.FC<{text: string}> = ({text}) => {
  const out: React.ReactNode[] = [];
  const re = /(\*[^*]+\*|\^[^^]+\^|~[^~]+~)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const c = m[0][0] === '^' ? '#ff6b57' : m[0][0] === '*' ? C.peach : C.skyBlue;
    out.push(
      <span key={k++} style={{color: c}}>
        {m[0].slice(1, -1)}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
};

export const NarrationView: React.FC<{n: Narr; top?: number; center?: boolean}> = ({n, top = 650, center}) => {
  const f = useCurrentFrame();
  if (f < n.from || f >= n.to) return null;
  const k = fadeIO(f, n.from, n.to, 8);
  const size = Math.min(60, ...n.lines.map((l) => Math.floor((CONTENT_W - 30) / (emWidth(l.replace(/[\^*~]/g, '')) * 1.05))));
  return (
    <div style={{position: 'absolute', left: SAFE.left + 12, top, width: CONTENT_W - 12, textAlign: center ? 'center' : 'left'}}>
      {n.lines.map((l, i) => {
        const d = interpolate(f, [n.from + i * 5, n.from + i * 5 + 10], [0, 1], clamp);
        return (
          <div key={i} data-telop="narr" style={{display: center ? 'block' : 'table', fontFamily: SERIF, fontWeight: 700, fontSize: size, lineHeight: 1.32, color: '#f6f3ee', letterSpacing: '0.04em', textShadow: shadow, opacity: Math.min(k, d), transform: `translateX(${(1 - d) * 16}px)`, whiteSpace: 'pre'}}>
            <Rich text={l} />
          </div>
        );
      })}
      {n.note && (
        <div data-telop="note" style={{display: center ? 'block' : 'table', marginTop: 10, fontFamily: SANS, fontWeight: 500, fontSize: 24, color: 'rgba(255,255,255,0.78)', textShadow: shadow, opacity: k, whiteSpace: 'pre'}}>
          {n.note}
        </div>
      )}
    </div>
  );
};

// ---------- 中央：数値カード ----------
const fmt = (v: number) => Math.round(v).toLocaleString('ja-JP');
export const CardView: React.FC<{c: Card; top?: number}> = ({c, top = 930}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < c.from || f >= c.to) return null;
  const t = f - c.from;
  const k = fadeIO(f, c.from, c.to, 7);
  const s = spring({frame: t, fps, config: {damping: 20, stiffness: 160}});
  const prog = interpolate(t, [2, 24], [0, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});
  const W = 760;
  const wEm = emWidth(c.prefix ?? '') * 0.42 + fmt(c.value ?? 0).length * 0.6 + emWidth(c.unit ?? '') * 0.6 + 0.2;
  const size = Math.min(140, Math.floor((W - 80) / wEm));
  return (
    <div data-telop="card" style={{position: 'absolute', top, left: SAFE.left + (CONTENT_W - W) / 2, width: W, opacity: k, transform: `scale(${0.96 + 0.04 * s})`, background: 'rgba(20,22,30,0.82)', border: '1.5px solid rgba(255,255,255,0.16)', borderRadius: 24, padding: '22px 40px 26px', boxSizing: 'border-box', textAlign: 'center', fontFamily: SANS, boxShadow: '0 10px 40px rgba(0,0,0,0.35)'}}>
      <div style={{fontSize: 32, fontWeight: 700, color: 'rgba(255,255,255,0.95)'}}>{c.label}</div>
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'baseline'}}>
        {c.prefix && <span style={{fontSize: size * 0.42, fontWeight: 900, color: '#fff', marginRight: 10}}>{c.prefix}</span>}
        <span style={{fontSize: size, fontWeight: 900, color: C.coral, lineHeight: 1.12}}>{fmt((c.value ?? 0) * prog)}</span>
        {c.unit && <span style={{fontSize: size * 0.6, fontWeight: 900, color: C.coral, marginLeft: 6}}>{c.unit}</span>}
      </div>
      {c.note && <div style={{fontSize: 28, fontWeight: 500, color: 'rgba(255,255,255,0.82)', opacity: interpolate(t, [18, 28], [0, 1], clamp)}}>{c.note}</div>}
    </div>
  );
};

// ---------- 表組みカード ----------
export const TableView: React.FC<{top?: number}> = ({top = 900}) => {
  const f = useCurrentFrame();
  if (f < TABLE.from || f >= TABLE.to) return null;
  const k = fadeIO(f, TABLE.from, TABLE.to, 8);
  const W = 800;
  return (
    <div data-telop="card" style={{position: 'absolute', top, left: SAFE.left + (CONTENT_W - W) / 2, width: W, opacity: k, background: 'rgba(20,22,30,0.86)', border: '1.5px solid rgba(255,255,255,0.16)', borderRadius: 24, padding: '24px 34px 18px', boxSizing: 'border-box', boxShadow: '0 10px 40px rgba(0,0,0,0.35)'}}>
      <div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 46, color: '#fff', marginBottom: 12}}>
        {TABLE.title[0]}
        <span style={{color: C.peach}}>{TABLE.title[1]}</span>
        {TABLE.title[2]}
      </div>
      {TABLE.rows.map((r, i) => {
        const d = interpolate(f, [TABLE.from + 8 + i * 8, TABLE.from + 18 + i * 8], [0, 1], clamp);
        return (
          <div key={i} style={{display: 'flex', alignItems: 'baseline', gap: 26, padding: '14px 4px', borderTop: '1px solid rgba(255,255,255,0.14)', opacity: d, fontFamily: SANS}}>
            <span style={{width: 60, fontSize: 30, fontWeight: 500, color: 'rgba(255,255,255,0.75)'}}>{r.k}</span>
            <span style={{display: 'flex', flexDirection: 'column'}}>
              <span style={{fontSize: 38, fontWeight: 900, color: i === 0 ? C.coral : '#fff'}}>{r.v}</span>
              <span style={{fontSize: 24, fontWeight: 500, color: 'rgba(255,255,255,0.7)'}}>{r.sub}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const Disclaimer: React.FC = () => (
  <div data-telop="note" style={{position: 'absolute', left: SAFE.left, width: CONTENT_W, top: 1448, textAlign: 'center', fontFamily: SANS, fontWeight: 500, fontSize: 22, color: 'rgba(255,255,255,0.7)', textShadow: shadow, whiteSpace: 'pre'}}>
    {DISCLAIMER}
  </div>
);

export const Shade: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 980, background: 'linear-gradient(180deg, rgba(6,8,14,0.66) 0%, rgba(6,8,14,0.42) 45%, rgba(6,8,14,0) 100%)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 700, background: 'linear-gradient(0deg, rgba(6,8,14,0.6) 0%, rgba(6,8,14,0) 100%)'}} />
  </AbsoluteFill>
);

export {CalloutView};
