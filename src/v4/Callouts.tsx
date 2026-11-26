import React from 'react';
import {useCurrentFrame} from 'remotion';
import {project} from '../lib/project';
import {CalloutView} from './Hud';
import {CALLOUT_TEXT} from './script';
import {F} from './timeline';
import {TOKYO_CAM, carSlide, parked, poleTiltAt} from './TokyoShot';
import {DEBRIS, debrisPos} from './city/Effects';
import {BAY_Z, POLES} from './city/City';
import {MOON_POS, SPACE_CAM} from './SpaceShot';

const SIGN = DEBRIS.findIndex((d) => d.kind === 'sign');
// 画面に入りやすい右側（西側）の電柱
const POLE = POLES.findIndex((p) => p.x > 0 && p.z < 0);

export const Callouts: React.FC = () => {
  const f = useCurrentFrame();
  const sign = debrisPos(DEBRIS[SIGN], f);
  const c = parked[3];
  const tilt = poleTiltAt(f, POLE);
  const pole = POLES[POLE];
  const front = BAY_Z + ((f - F.FF10_END) / 60) * (BAY_Z * -1 + 40);
  return (
    <>
      <CalloutView {...project(TOKYO_CAM, f, [sign.x, sign.y + 1.2, sign.z])} {...CALLOUT_TEXT.sign} from={F.STOP + 6} to={F.STOP + 40} dy={380} />
      <CalloutView {...project(TOKYO_CAM, f, [c.x - carSlide(f, 3), 1.2, c.z])} {...CALLOUT_TEXT.car} from={F.STOP + 40} to={110} dy={220} dx={-60} />
      <CalloutView {...project(TOKYO_CAM, f, [pole.x - Math.sin(tilt) * 4, 4 * Math.cos(tilt), pole.z])} {...CALLOUT_TEXT.pole} from={202} to={F.FF10_END - 2} dy={420} dx={-80} />
      <CalloutView {...project(TOKYO_CAM, f, [0, 2.5, Math.min(0, front)])} {...CALLOUT_TEXT.wave} from={F.FF10_END + 8} to={300} dy={180} />
      <CalloutView {...project(TOKYO_CAM, f, [14, 22, -40])} {...CALLOUT_TEXT.roof} from={770} to={866} dy={260} dx={-60} />
      <CalloutView {...project(SPACE_CAM, f - F.SPACE, MOON_POS(f - F.SPACE))} {...CALLOUT_TEXT.moon} from={F.SPACE + 84} to={F.SPACE + 150} dy={-110} />
    </>
  );
};
