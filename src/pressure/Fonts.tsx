import React, {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import {CLOCK_LABEL, DISCLAIMER, SCENES, THEME} from './script';

const ALL_TEXT =
  SCENES.flatMap((s) => [
    ...s.captions.flatMap((c) => c.lines),
    s.clock?.value ?? '',
    s.clock?.ff ?? '',
    s.assumption ?? '',
    ...(s.cards ?? []).flatMap((c) => [c.label, c.prefix ?? '', c.text ?? '', c.unit ?? '', c.note ?? '', c.badge ?? '']),
    ...(s.callouts ?? []).flatMap((c) => [c.tag, c.text]),
  ]).join('') +
  THEME.hook.join('') +
  THEME.top +
  DISCLAIMER +
  '0123456789,.+−-▶気圧約℃倍水深30m窒素酔い' + CLOCK_LABEL;

export const FontsPressure: React.FC = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = staticFile('fonts/fonts.css');
    link.onload = () => {
      Promise.all([...[500, 700, 900].map((w) => document.fonts.load(`${w} 100px 'Noto Sans JP'`, ALL_TEXT)), ...[600, 700].map((w) => document.fonts.load(`${w} 100px 'Noto Serif JP'`, ALL_TEXT))])
        .then(() => document.fonts.ready)
        .then(() => continueRender(handle))
        .catch(() => continueRender(handle));
    };
    document.head.appendChild(link);
  }, [handle]);
  return null;
};
