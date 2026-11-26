import React from 'react';
import {Scene01Hook} from './Scene01Hook';
import {Scene02Equator} from './Scene02Equator';
import {Scene03Japan} from './Scene03Japan';
import {Scene04Tsunami} from './Scene04Tsunami';
import {Scene05Oceans} from './Scene05Oceans';
import {Scene06DayLength} from './Scene06DayLength';
import {Scene07Extremes} from './Scene07Extremes';
import {Scene08Terminator} from './Scene08Terminator';
import {Scene09End} from './Scene09End';

export const SCENE_COMPONENTS: Record<string, React.FC> = {
  s01_hook: Scene01Hook,
  s02_equator: Scene02Equator,
  s03_japan: Scene03Japan,
  s04_tsunami: Scene04Tsunami,
  s05_oceans: Scene05Oceans,
  s06_daylength: Scene06DayLength,
  s07_extremes: Scene07Extremes,
  s08_terminator: Scene08Terminator,
  s09_end: Scene09End,
};

// シーンごとの UI 位置（px）。データカードは被写体を隠しにくい上寄りに置く
export const OVERLAY_POS: Record<string, {cardTop?: number; captionBottom?: number}> = {
  s02_equator: {cardTop: 600},
  s03_japan: {cardTop: 580},
  s05_oceans: {cardTop: 580},
  s06_daylength: {cardTop: 580},
  s08_terminator: {cardTop: 580},
  s09_end: {cardTop: 970, captionBottom: 428},
};
