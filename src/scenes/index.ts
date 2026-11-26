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

// シーンごとのテロップ位置（px）
export const OVERLAY_POS: Record<string, {mainTop?: number; numberTop?: number}> = {
  s01_hook: {mainTop: 360},
  s02_equator: {numberTop: 1170},
  s03_japan: {mainTop: 370, numberTop: 500},
  s05_oceans: {numberTop: 1340},
  s06_daylength: {numberTop: 520},
  s08_terminator: {numberTop: 540},
  s09_end: {numberTop: 1120},
};
