import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, SANS, SERIF} from '../theme';
import {CALLOUTS_L, CAPTIONS, CARDS, CHAPTERS, Caption, Card, DISCLAIMER_L, LH, LW, THEME_L, distAt, lightSec, sunPct, tempC, yearDays} from './script';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const fadeIO = (f: number, a: number, b: number, d = 10) => interpolate(f, [a, a + d, b - d, b], [0, 1, 1, 0], clamp);
const shadow = '0 3px 14px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.6)';
// 映像を見せる左側の領域（右側は計器パネル）
export const CONTENT = {x: 60, w: 1380};

const Rich: React.FC<{text: string; blue?: boolean}> = ({text, blue}) => {
  const out: React.ReactNode[] = [];
  const re = /(\*[^*]+\*|\^[^^]+\^|~[^~]+~)/g;
  let last = 0, k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const c = m[0][0] === '*' ? (blue ? C.skyBlue : C.peach) : m[0][0] === '^' ? C.coral : C.skyBlue;
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

// ---------- フォント ----------
const ALL =
  CAPTIONS.flatMap((c) => c.lines).join('') +
  CARDS.map((c) => c.label + c.text + (c.note ?? '')).join('') +
  CHAPTERS.map((c) => c.num + c.title + (c.sub ?? '')).join('') +
  Object.values(CALLOUTS_L)
    .map((c) => c.tag + c.text)
    .join('') +
  THEME_L.hook.join('') +
  THEME_L.top +
  DISCLAIMER_L +
  '0123456789.,%+−-→℃倍分秒日約太陽までの距離平均気温日差し光が届くまで1年の長さ今';
export const FontsL: React.FC = () => {
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = staticFile('fonts/fonts.css');
    link.onload = () => {
      Promise.all([...[500, 700, 900].map((w) => document.fonts.load(`${w} 100px 'Noto Sans JP'`, ALL)), ...[600, 700].map((w) => document.fonts.load(`${w} 100px 'Noto Serif JP'`, ALL))])
        .then(() => document.fonts.ready)
        .then(() => continueRender(h))
        .catch(() => continueRender(h));
    };
    document.head.appendChild(link);
  }, [h]);
  return null;
};

// ---------- 上下の暗いグラデーション ----------
export const ShadesL: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 260, background: 'linear-gradient(180deg, rgba(6,8,14,0.6), rgba(6,8,14,0))'}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 360, background: 'linear-gradient(0deg, rgba(6,8,14,0.7), rgba(6,8,14,0))'}} />
    <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: 560, background: 'linear-gradient(270deg, rgba(6,8,14,0.45), rgba(6,8,14,0))'}} />
  </AbsoluteFill>
);

// ---------- テーマ（明朝体）：冒頭は中央に大きく → 左上に常駐 ----------
const HOOK_END = 150;
export const TitleL: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const intro = interpolate(f, [10, 30], [0, 1], clamp);
  const s = spring({frame: f - HOOK_END, fps, config: {damping: 18, stiffness: 110}});
  if (s < 0.5) {
    return (
      <div style={{position: 'absolute', left: CONTENT.x, width: CONTENT.w + 380, top: 360, textAlign: 'center', opacity: intro * (1 - s * 2)}}>
        {THEME_L.hook.map((l, i) => (
          <div key={i} data-telop="title" style={{display: 'block', fontFamily: SERIF, fontWeight: 700, fontSize: 92, color: '#f4f2ee', letterSpacing: '0.05em', lineHeight: 1.4, textShadow: shadow}}>
            <Rich text={l} blue />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{position: 'absolute', left: 60, top: 44, opacity: Math.min(1, (s - 0.5) * 3)}}>
      <span data-telop="title" style={{fontFamily: SERIF, fontWeight: 700, fontSize: 34, color: '#f4f2ee', letterSpacing: '0.05em', textShadow: shadow, whiteSpace: 'pre'}}>
        <Rich text={THEME_L.top} blue />
      </span>
    </div>
  );
};

// ---------- 右側の計器パネル（距離・気温・日差し・光の時間・1年の長さ） ----------
const fmtLight = (sec: number) => `${Math.floor(sec / 60)}分${String(Math.round(sec % 60)).padStart(2, '0')}秒`;
export const PanelL: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [170, 200], [0, 1], clamp);
  if (o <= 0) return null;
  const d = distAt(f);
  const t = tempC(d);
  const changing = distAt(f + 1) !== d;
  const row = (label: string, value: string, color = '#fff', big = false, serif = false) => (
    <div style={{padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.14)'}}>
      <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 22, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.08em'}}>{label}</div>
      <div data-telop={serif ? 'clock' : 'panel'} style={{display: 'table', fontFamily: serif ? SERIF : SANS, fontWeight: serif ? 600 : 900, fontSize: big ? 76 : 40, color, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums', whiteSpace: 'pre'}}>
        {value}
      </div>
    </div>
  );
  return (
    <div style={{position: 'absolute', right: 60, top: 130, width: 380, opacity: o, background: 'rgba(16,18,26,0.7)', border: '1.5px solid rgba(255,255,255,0.16)', borderRadius: 22, padding: '18px 28px 10px', boxSizing: 'border-box', boxShadow: changing ? '0 0 30px rgba(240,123,90,0.45)' : '0 10px 30px rgba(0,0,0,0.3)'}}>
      <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 22, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.08em', marginBottom: 2}}>太陽までの距離</div>
      <div data-telop="clock" style={{display: 'table', fontFamily: SERIF, fontWeight: 600, fontSize: 84, color: '#fff', lineHeight: 1.1, whiteSpace: 'pre', textShadow: shadow}}>
        {d.toFixed(2)}倍
      </div>
      {row('地球の平均気温', `約${t >= 0 ? '' : '−'}${Math.abs(t).toFixed(0)}℃`, t < 12 ? C.skyBlue : C.coral)}
      {row('日差しの強さ', `今の約${Math.round(sunPct(d))}%`)}
      {row('太陽の光が届くまで', `約${fmtLight(lightSec(d))}`)}
      {row('1年の長さ', `約${Math.round(yearDays(d))}日`)}
    </div>
  );
};

// ---------- 章タイトル ----------
export const ChapterL: React.FC = () => {
  const f = useCurrentFrame();
  const ch = CHAPTERS.find((c) => f >= c.from && f < c.to);
  if (!ch) return null;
  const k = fadeIO(f, ch.from, ch.to, 16);
  const line = interpolate(f, [ch.from + 6, ch.from + 30], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: `rgba(4,6,12,${0.55 * k})`, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 360, textAlign: 'center', opacity: k}}>
        <div data-telop="chapter" style={{display: 'inline-block', fontFamily: SERIF, fontWeight: 600, fontSize: 40, color: C.peach, letterSpacing: '0.3em'}}>
          {ch.num}
        </div>
        <div style={{width: 520 * line, height: 2, background: 'rgba(255,255,255,0.7)', margin: '14px auto 18px'}} />
        <div data-telop="title" style={{display: 'inline-block', fontFamily: SERIF, fontWeight: 700, fontSize: 110, color: '#fff', letterSpacing: '0.12em', textShadow: shadow}}>
          {ch.title}
        </div>
        {ch.sub && <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 30, color: 'rgba(255,255,255,0.8)', marginTop: 14, letterSpacing: '0.1em'}}>{ch.sub}</div>}
      </div>
    </AbsoluteFill>
  );
};

// ---------- 字幕（画面下・左側の中央） ----------
export const CaptionL: React.FC<{c: Caption}> = ({c}) => {
  const f = useCurrentFrame();
  if (f < c.from || f >= c.to) return null;
  const k = fadeIO(f, c.from, c.to, 8);
  return (
    <div style={{position: 'absolute', left: CONTENT.x, width: CONTENT.w, bottom: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
      {c.lines.map((l, i) => {
        const d = interpolate(f, [c.from + i * 5, c.from + i * 5 + 10], [0, 1], clamp);
        return (
          <div key={i} data-telop="caption" style={{fontFamily: SANS, fontWeight: 900, fontSize: 58, color: '#fff', letterSpacing: '0.03em', textShadow: shadow, opacity: Math.min(k, d), transform: `translateY(${(1 - d) * 14}px)`, whiteSpace: 'pre'}}>
            <Rich text={l} />
          </div>
        );
      })}
    </div>
  );
};

// ---------- データカード ----------
export const CardL: React.FC<{c: Card}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < c.from || f >= c.to) return null;
  const k = fadeIO(f, c.from, c.to, 8);
  const s = spring({frame: f - c.from, fps, config: {damping: 20, stiffness: 160}});
  const w = c.w ?? 560;
  const x = c.x ?? CONTENT.x + (CONTENT.w - w) / 2;
  return (
    <div data-telop="card" style={{position: 'absolute', left: x, top: c.y ?? 150, width: w, opacity: k, transform: `scale(${0.96 + 0.04 * s})`, background: 'rgba(20,22,30,0.82)', border: '1.5px solid rgba(255,255,255,0.16)', borderRadius: 22, padding: '20px 30px 22px', boxSizing: 'border-box', textAlign: 'center', fontFamily: SANS, boxShadow: '0 10px 40px rgba(0,0,0,0.35)'}}>
      <div style={{fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.92)'}}>{c.label}</div>
      <div style={{fontSize: Math.min(64, Math.floor((w - 60) / (c.text.length * 0.92))), fontWeight: 900, color: C.coral, lineHeight: 1.25, whiteSpace: 'pre'}}>{c.text}</div>
      {c.note && <div style={{fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.8)'}}>{c.note}</div>}
    </div>
  );
};

// ---------- 3D を指す吹き出し ----------
export const CalloutL: React.FC<{x: number; y: number; tag: string; text: string; from: number; to: number; dx?: number; dy?: number}> = ({x, y, tag, text, from, to, dx = 0, dy = -120}) => {
  const f = useCurrentFrame();
  if (f < from || f >= to || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const k = fadeIO(f, from, to, 8);
  const lk = interpolate(f, [from, from + 10], [0, 1], clamp);
  const w = tag.length * 26 + 22 + text.length * 30 + 60;
  const h = 54;
  const lx = Math.min(CONTENT.x + CONTENT.w - w, Math.max(CONTENT.x, x + dx - w / 2));
  const ly = Math.min(LH - 200 - h, Math.max(110, y + dy - h));
  const ax = lx + w / 2, ay = ly + h;
  return (
    <>
      <svg width={LW} height={LH} style={{position: 'absolute', left: 0, top: 0, opacity: k}}>
        <line x1={ax} y1={ay} x2={ax + (x - ax) * lk} y2={ay + (y - ay) * lk} stroke="rgba(255,255,255,0.9)" strokeWidth={3} />
        <circle cx={x} cy={y} r={7 * lk} fill="#fff" stroke="rgba(0,0,0,0.4)" strokeWidth={2} />
      </svg>
      <div data-telop="callout" style={{position: 'absolute', left: lx, top: ly, height: h, boxSizing: 'border-box', opacity: k, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(18,18,24,0.86)', border: '2px solid rgba(255,255,255,0.55)', borderRadius: 14, padding: '0 18px 0 8px', fontFamily: SANS, whiteSpace: 'pre'}}>
        <span style={{background: C.tag, color: '#fff', fontWeight: 900, fontSize: 24, borderRadius: 8, padding: '3px 10px 5px'}}>{tag}</span>
        <span style={{color: '#fff', fontWeight: 900, fontSize: 29}}>{text}</span>
      </div>
    </>
  );
};

export const DisclaimerL: React.FC = () => (
  <div data-telop="note" style={{position: 'absolute', left: 60, bottom: 22, fontFamily: SANS, fontWeight: 500, fontSize: 20, color: 'rgba(255,255,255,0.6)', textShadow: shadow, whiteSpace: 'pre'}}>
    {DISCLAIMER_L}
  </div>
);
