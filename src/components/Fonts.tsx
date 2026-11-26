import React, {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import {SCENES} from '../script';

const ALL_TEXT =
  SCENES.flatMap((s) => [
    ...s.beats.flatMap((b) => b.lines),
    ...(s.labels ?? []).map((l) => l.text),
    ...(s.numbers ?? []).flatMap((n) => [n.prefix ?? '', n.text ?? '', n.unit ?? '', n.sub ?? '', String(n.value ?? '')]),
  ]).join('') + '0123456789,.…？!ピタッドーンゴゴゴ';

// ローカル配置の M PLUS Rounded 1c（unicode-range 分割）を読み込み完了まで待つ
export const Fonts: React.FC = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = staticFile('fonts/mplus.css');
    link.onload = () => {
      Promise.all([
        document.fonts.load(`800 100px 'M PLUS Rounded 1c'`, ALL_TEXT),
        document.fonts.load(`900 100px 'M PLUS Rounded 1c'`, ALL_TEXT),
      ])
        .then(() => document.fonts.ready)
        .then(() => continueRender(handle))
        .catch(() => continueRender(handle));
    };
    document.head.appendChild(link);
  }, [handle]);
  return null;
};
