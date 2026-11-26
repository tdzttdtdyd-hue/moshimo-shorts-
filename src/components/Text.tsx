import React from 'react';
import {C, FONT} from '../theme';

// *黄* ^赤^ ~水色~ の簡易マークアップ
export const Rich: React.FC<{text: string; base?: string}> = ({text, base = C.white}) => {
  const parts: {t: string; c: string}[] = [];
  const re = /(\*[^*]+\*|\^[^^]+\^|~[^~]+~)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({t: text.slice(last, m.index), c: base});
    const mark = m[0][0];
    parts.push({t: m[0].slice(1, -1), c: mark === '*' ? C.yellow : mark === '^' ? C.red : C.cyan});
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({t: text.slice(last), c: base});
  return (
    <>
      {parts.map((p, i) => (
        <span key={i} style={{color: p.c}}>
          {p.t}
        </span>
      ))}
    </>
  );
};

export const outline = (px: number): React.CSSProperties => ({
  fontFamily: FONT,
  fontWeight: 900,
  WebkitTextStroke: `${px}px ${C.black}`,
  paintOrder: 'stroke fill',
  textShadow: `0 ${px * 0.6}px 0 ${C.black}, 0 ${px * 1.2}px ${px * 1.6}px rgba(0,0,0,0.45)`,
  letterSpacing: '0.01em',
  lineHeight: 1.18,
  whiteSpace: 'pre',
});
