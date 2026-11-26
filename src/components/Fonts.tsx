import React, {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import {SCENES, THEME_TITLE} from '../script';
import {CALLOUT_TEXT} from './callouts';

const ALL_TEXT =
  SCENES.flatMap((s) => [
    ...s.captions.flatMap((b) => b.lines),
    s.clock && s.clock.value !== 'tick' ? s.clock.value : '',
    s.clock?.ff ?? '',
    ...(s.cards ?? []).flatMap((n) => [n.label, n.prefix ?? '', n.text ?? '', n.unit ?? '', n.note ?? '']),
  ]).join('') +
  Object.values(THEME_TITLE).join('') +
  CALLOUT_TEXT +
  '0123456789,.+秒分年自転停止から想定だけが一瞬で大気と海は止まらない？、。▶';

// ローカル配置の Noto Sans JP / Noto Serif JP（unicode-range 分割）を読み込み完了まで待つ
export const Fonts: React.FC = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = staticFile('fonts/fonts.css');
    link.onload = () => {
      const loads = [
        ...[500, 700, 900].map((w) => document.fonts.load(`${w} 100px 'Noto Sans JP'`, ALL_TEXT)),
        ...[600, 700, 900].map((w) => document.fonts.load(`${w} 100px 'Noto Serif JP'`, ALL_TEXT)),
      ];
      Promise.all(loads)
        .then(() => document.fonts.ready)
        .then(() => continueRender(handle))
        .catch(() => continueRender(handle));
    };
    document.head.appendChild(link);
  }, [handle]);
  return null;
};
