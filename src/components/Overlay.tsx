import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, SAFE, SANS, WIDTH} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const CONTENT_W = WIDTH - SAFE.left - SAFE.right;
const fadeIO = (f: number, from: number, to: number, d = 8) => interpolate(f, [from, from + d, to - d, to], [0, 1, 1, 0], clamp);

const plain = (t: string) => t.replace(/[*^~]/g, '');
// 全角=1em、半角≒0.58em として文字列の幅を見積もる
export const emWidth = (t: string) => [...plain(t)].reduce((a, ch) => a + (/[ -~]/.test(ch) ? 0.58 : 1), 0);

// ---------- 3D の物体を指す吹き出し ----------
export const CalloutView: React.FC<{x: number; y: number; tag: string; text: string; from: number; to: number; dx?: number; dy?: number}> = ({x, y, tag, text, from, to, dx = 0, dy = -150}) => {
  const f = useCurrentFrame();
  if (f < from || f >= to || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const k = fadeIO(f, from, to, 7);
  const lineK = interpolate(f, [from, from + 10], [0, 1], clamp);
  const w = emWidth(tag) * 26 + 22 + emWidth(text) * 31 + 42 + 20; // gap・枠線ぶんを含む
  const h = 58;
  // ラベルはセーフエリア内に収める
  const lx = Math.min(SAFE.left + CONTENT_W - w, Math.max(SAFE.left, x + dx - w / 2));
  // 下端の注意書き（y=1440〜）にかからないよう少し上で止める
  const ly = Math.min(1920 - SAFE.bottom - h - 70, Math.max(SAFE.top, y + dy - h));
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

