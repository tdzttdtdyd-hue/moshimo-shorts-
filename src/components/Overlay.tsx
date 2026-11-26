import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Caption, DataCard, SceneSpec, STOP_FRAME, THEME_TITLE, TOTAL_FRAMES} from '../script';
import {C, SAFE, SANS, SERIF, WIDTH} from '../theme';

// ---------- 共通 ----------
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const CONTENT_W = WIDTH - SAFE.left - SAFE.right;
const fadeIO = (f: number, from: number, to: number, d = 8) => interpolate(f, [from, from + d, to - d, to], [0, 1, 1, 0], clamp);

const softShadow = '0 3px 14px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.6)';

// *オレンジ* ^赤^ ~水色~
export const Rich: React.FC<{text: string}> = ({text}) => {
  const parts: {t: string; c?: string}[] = [];
  const re = /(\*[^*]+\*|\^[^^]+\^|~[^~]+~)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({t: text.slice(last, m.index)});
    const mark = m[0][0];
    parts.push({t: m[0].slice(1, -1), c: mark === '*' ? C.peach : mark === '^' ? C.coral : C.skyBlue});
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({t: text.slice(last)});
  return (
    <>
      {parts.map((p, i) => (
        <span key={i} style={p.c ? {color: p.c} : undefined}>
          {p.t}
        </span>
      ))}
    </>
  );
};

const plain = (t: string) => t.replace(/[*^~]/g, '');
export const emWidth = (t: string) => [...plain(t)].reduce((a, ch) => a + (/[ -~]/.test(ch) ? 0.58 : 1), 0);
const fit = (lines: string[], size: number, maxW: number) => Math.min(size, ...lines.map((l) => Math.floor(maxW / (emWidth(l) * 1.03))));

// ---------- 画面上下のグラデーション（文字を読みやすく） ----------
export const Shades: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 720, background: 'linear-gradient(180deg, rgba(8,10,16,0.62) 0%, rgba(8,10,16,0.28) 55%, rgba(8,10,16,0) 100%)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 900, background: 'linear-gradient(0deg, rgba(8,10,16,0.72) 0%, rgba(8,10,16,0.35) 50%, rgba(8,10,16,0) 100%)'}} />
  </AbsoluteFill>
);

// ---------- テーマ（明朝体） ----------
const HOOK_END = 62;
export const ThemeTitle: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  // 冒頭：中央に大きく → 上部に小さく移動して常駐
  const settle = spring({frame: f - HOOK_END, fps, config: {damping: 18, stiffness: 120}});
  const intro = interpolate(f, [0, 10], [0, 1], clamp);
  const big = f < HOOK_END;
  const top = big ? 560 : interpolate(settle, [0, 1], [560, 222]);
  const size = big ? 86 : interpolate(settle, [0, 1], [86, 46]);
  const twoLines = settle < 0.5;
  const style: React.CSSProperties = {
    fontFamily: SERIF,
    fontWeight: 700,
    fontSize: size,
    color: '#f4f2ee',
    letterSpacing: '0.04em',
    lineHeight: 1.35,
    textShadow: '0 2px 12px rgba(0,0,0,0.65), 0 1px 2px rgba(0,0,0,0.7)',
    whiteSpace: 'pre',
    textAlign: 'center',
  };
  const key = <span style={{color: C.skyBlue}}>{THEME_TITLE.key}</span>;
  return (
    <div style={{position: 'absolute', top, left: SAFE.left, width: CONTENT_W, display: 'flex', justifyContent: 'center', opacity: intro, transform: `translateY(${(1 - intro) * 20}px)`}}>
      <div data-telop="title" style={style}>
        {twoLines ? (
          <>
            {THEME_TITLE.pre}
            {key}
            {'が\n'}
            {THEME_TITLE.post.replace(/^が/, '')}
          </>
        ) : (
          <>
            {THEME_TITLE.pre}
            {key}
            {THEME_TITLE.post}
          </>
        )}
      </div>
    </div>
  );
};

// ---------- 自転停止からの経過時間（明朝体） ----------
export const Clock: React.FC<{value: string; sceneFrame: number; popFrame: number; ff?: string; globalFrame: number}> = ({value, sceneFrame, popFrame, ff, globalFrame}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: popFrame, fps, config: {damping: 16, stiffness: 140}});
  const progress = globalFrame / TOTAL_FRAMES;
  // 早送りバッジ
  const ffK = ff ? fadeIO(sceneFrame, 2, 58, 8) : 0;
  const ffPulse = 0.85 + 0.15 * Math.abs(Math.sin(sceneFrame * 0.25));
  return (
    <>
      <div style={{position: 'absolute', left: 92, top: 318}}>
        <div data-telop="clock-label" style={{display: 'table', fontFamily: SANS, fontWeight: 500, fontSize: 30, color: 'rgba(255,255,255,0.88)', letterSpacing: '0.18em', textShadow: softShadow}}>
          自転停止から
        </div>
        <div
          data-telop="clock"
          style={{
            display: 'table',
            fontFamily: SERIF,
            fontWeight: 600,
            fontSize: 132,
            lineHeight: 1.08,
            color: '#ffffff',
            letterSpacing: '0.01em',
            textShadow: '0 4px 18px rgba(0,0,0,0.55)',
            transform: `translateY(${(1 - s) * 16}px)`,
            opacity: Math.min(1, s * 1.4),
            whiteSpace: 'pre',
          }}
        >
          {value}
        </div>
        <div style={{width: 430, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.28)', marginTop: 10, overflow: 'hidden'}}>
          <div style={{width: `${progress * 100}%`, height: '100%', background: '#ffffff'}} />
        </div>
      </div>
      {ff && ffK > 0 && (
        <div
          data-telop="ff"
          style={{
            position: 'absolute',
            right: SAFE.right + 8,
            top: 350,
            opacity: ffK,
            transform: `translateX(${(1 - ffK) * 30}px)`,
            background: 'rgba(222, 92, 78, 0.88)',
            borderRadius: 40,
            padding: '10px 30px 12px 24px',
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: 38,
            color: '#fff',
            boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
            whiteSpace: 'pre',
          }}
        >
          <span style={{opacity: ffPulse, marginRight: 10, letterSpacing: '-0.15em'}}>▶▶</span>
          {ff}
        </div>
      )}
    </>
  );
};

export const fmtClock = (globalFrame: number, fps: number) => `+${Math.max(0, Math.floor((globalFrame - STOP_FRAME) / fps))}秒`;

// ---------- 「想定」カード ----------
export const Assumption: React.FC<{sceneFrame: number; dur: number; top?: number}> = ({sceneFrame, dur, top = 420}) => {
  const k = fadeIO(sceneFrame, 0, dur, 6);
  return (
    <div
      data-telop="assume"
      style={{
        position: 'absolute',
        right: SAFE.right + 8,
        top,
        opacity: k,
        background: 'rgba(28, 28, 34, 0.74)',
        border: '2px solid rgba(255,255,255,0.4)',
        borderRadius: 22,
        padding: '12px 26px 16px',
        fontFamily: SANS,
        boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{fontSize: 26, fontWeight: 500, color: 'rgba(255,255,255,0.9)'}}>想定</div>
      <div style={{fontSize: 33, fontWeight: 900, color: C.peach, whiteSpace: 'pre'}}>自転だけが一瞬で停止</div>
    </div>
  );
};

// ---------- 画面下の字幕 ----------
export const CaptionView: React.FC<{c: Caption; bottom?: number}> = ({c, bottom = 450}) => {
  const f = useCurrentFrame();
  if (f < c.from || f >= c.to) return null;
  const k = fadeIO(f, c.from, c.to, 7);
  const size = fit(c.lines, 74, CONTENT_W - 20);
  return (
    <div style={{position: 'absolute', bottom, left: SAFE.left, width: CONTENT_W, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
      {c.lines.map((l, i) => {
        const d = interpolate(f, [c.from + i * 4, c.from + i * 4 + 9], [0, 1], clamp);
        return (
          <div
            key={i}
            data-telop="caption"
            style={{
              fontFamily: SANS,
              fontWeight: 900,
              fontSize: size,
              lineHeight: 1.22,
              color: '#fff',
              letterSpacing: '0.03em',
              textShadow: softShadow,
              opacity: Math.min(k, d),
              transform: `translateY(${(1 - d) * 18}px)`,
              whiteSpace: 'pre',
            }}
          >
            <Rich text={l} />
          </div>
        );
      })}
    </div>
  );
};

// ---------- 中央のデータカード ----------
const fmt = (v: number) => Math.round(v).toLocaleString('ja-JP');
export const DataCardView: React.FC<{card: DataCard; top?: number}> = ({card, top = 800}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < card.from || f >= card.to) return null;
  const t = f - card.from;
  const k = fadeIO(f, card.from, card.to, 7);
  const s = spring({frame: t, fps, config: {damping: 20, stiffness: 160}});
  const countDur = 24;
  const prog = interpolate(t, [2, countDur], [0, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});
  const W = 780;
  const inner = W - 80;
  let size = 150;
  if (card.value !== undefined) {
    const w = emWidth(card.prefix ?? '') * 0.42 + fmt(card.value).length * 0.6 + emWidth(card.unit ?? '') * 0.6 + 0.2;
    size = Math.min(size, Math.floor(inner / w));
  } else if (card.text) {
    size = Math.min(110, Math.floor(inner / (emWidth(card.text) * 1.03)));
  }
  const glow = t >= countDur ? Math.max(0, 1 - (t - countDur) / 10) : 0;
  return (
    <div
      data-telop="card"
      style={{
        position: 'absolute',
        top,
        left: SAFE.left + (CONTENT_W - W) / 2,
        width: W,
        opacity: k,
        transform: `scale(${0.96 + 0.04 * s})`,
        background: C.card,
        border: `1.5px solid ${C.cardBorder}`,
        borderRadius: 26,
        padding: '26px 40px 30px',
        boxSizing: 'border-box',
        textAlign: 'center',
        fontFamily: SANS,
        boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{fontSize: 36, fontWeight: 700, color: 'rgba(255,255,255,0.95)', letterSpacing: '0.04em'}}>{card.label}</div>
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'baseline', marginTop: 4, textShadow: `0 0 ${30 * glow}px rgba(240,123,90,${0.8 * glow})`}}>
        {card.value !== undefined ? (
          <>
            {card.prefix && <span style={{fontSize: size * 0.42, fontWeight: 900, color: '#fff', marginRight: 10}}>{card.prefix}</span>}
            <span style={{fontSize: size, fontWeight: 900, color: C.coral, lineHeight: 1.12, fontVariantNumeric: 'tabular-nums'}}>{fmt(card.value * prog)}</span>
            {card.unit && <span style={{fontSize: size * 0.6, fontWeight: 900, color: C.coral, marginLeft: 6}}>{card.unit}</span>}
          </>
        ) : (
          <span style={{fontSize: size, fontWeight: 900, color: C.coral, lineHeight: 1.25, opacity: prog}}>{card.text}</span>
        )}
      </div>
      {card.note && (
        <div style={{fontSize: 32, fontWeight: 500, color: 'rgba(255,255,255,0.82)', marginTop: 4, opacity: interpolate(t, [countDur - 6, countDur + 4], [0, 1], clamp)}}>
          {card.note}
        </div>
      )}
    </div>
  );
};

// ---------- 3D の物体を指す吹き出し ----------
export const CalloutView: React.FC<{x: number; y: number; tag: string; text: string; from: number; to: number; dx?: number; dy?: number}> = ({x, y, tag, text, from, to, dx = 0, dy = -150}) => {
  const f = useCurrentFrame();
  if (f < from || f >= to || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const k = fadeIO(f, from, to, 7);
  const lineK = interpolate(f, [from, from + 10], [0, 1], clamp);
  const w = (emWidth(tag) * 26 + 22) + emWidth(text) * 31 + 42;
  const h = 58;
  // ラベルはセーフエリア内に収める
  const lx = Math.min(SAFE.left + CONTENT_W - w, Math.max(SAFE.left, x + dx - w / 2));
  const ly = Math.min(1920 - SAFE.bottom - h, Math.max(SAFE.top, y + dy - h));
  const ax = lx + w / 2;
  const ay = ly + h;
  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: k}}>
        <line x1={ax} y1={ay} x2={ax + (x - ax) * lineK} y2={ay + (y - ay) * lineK} stroke="rgba(255,255,255,0.9)" strokeWidth={3} />
        <circle cx={x} cy={y} r={7 * lineK} fill="#fff" stroke="rgba(0,0,0,0.4)" strokeWidth={2} />
      </svg>
      <div
        data-telop="callout"
        style={{
          position: 'absolute',
          left: lx,
          top: ly,
          height: h,
          boxSizing: 'border-box',
          opacity: k,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(18, 18, 24, 0.86)',
          border: '2px solid rgba(255,255,255,0.55)',
          borderRadius: 14,
          padding: '0 18px 0 8px',
          fontFamily: SANS,
          whiteSpace: 'pre',
        }}
      >
        <span style={{background: C.tag, color: '#fff', fontWeight: 900, fontSize: 26, borderRadius: 8, padding: '3px 10px 5px'}}>{tag}</span>
        <span style={{color: '#fff', fontWeight: 900, fontSize: 31}}>{text}</span>
      </div>
    </>
  );
};

// ---------- シーンごとの UI 一式 ----------
export const SceneOverlay: React.FC<{spec: SceneSpec; start: number; popClock: boolean; cardTop?: number; captionBottom?: number}> = ({spec, start, popClock, cardTop, captionBottom}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const g = start + f;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {spec.clock && f >= (spec.clock.from ?? 0) && (
        <Clock
          value={spec.clock.value === 'tick' ? fmtClock(g, fps) : spec.clock.value}
          sceneFrame={f}
          popFrame={popClock ? f - (spec.clock.from ?? 0) : 60}
          ff={spec.clock.ff}
          globalFrame={g}
        />
      )}
      {spec.assumption && <Assumption sceneFrame={f} dur={spec.duration} top={spec.clock?.ff ? 440 : 352} />}
      {(spec.cards ?? []).map((c, i) => (
        <DataCardView key={i} card={c} top={cardTop} />
      ))}
      {spec.captions.map((c, i) => (
        <CaptionView key={i} c={c} bottom={captionBottom} />
      ))}
    </AbsoluteFill>
  );
};

export const Flash: React.FC<{at: number; dur?: number; color?: string; max?: number}> = ({at, dur = 8, color = '#fff', max = 0.9}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at, at + 1, at + dur], [0, max, 0], clamp);
  if (o <= 0) return null;
  return <AbsoluteFill style={{background: color, opacity: o}} />;
};

export const Vignette: React.FC<{strength?: number}> = ({strength = 0.45}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${strength}) 100%)`}} />
);
