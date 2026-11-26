import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {Earth, SpaceBackdrop, Stars, Sun} from '../three/Earth';
import {CameraRig} from '../lib/CameraRig';
import {CalloutView, Vignette} from '../components/Overlay';
import {CamKey, sampleCam} from '../lib/CameraRig';
import {project} from '../lib/project';
import {CALLOUTS} from '../components/callouts';

// 自転が止まると太陽の向きは公転だけでゆっくり変わる（タイムラプス）。夜側には街明かり
const CAM: CamKey[] = [
  {f: 0, pos: [-6, 2.5, 9], look: [-0.6, -1.4, 0], fov: 50},
  {f: 120, pos: [3, 1.6, 10], look: [0.3, -1.3, 0], fov: 48},
];

export const Scene06DayLength: React.FC = () => {
  const f = useCurrentFrame();
  const sa = 2.55 + f * 0.0055;
  const sun: [number, number, number] = [Math.cos(sa) * 60, 4, Math.sin(sa) * 60 - 10];
  // Earth は tilt=0.3 で回転しているので、太陽方向を地球のローカル座標に戻す
  const c = Math.cos(-0.3), s = Math.sin(-0.3);
  const local: [number, number, number] = [sun[0] * c - (sun[1] + 2.6) * s, sun[0] * s + (sun[1] + 2.6) * c, sun[2]];
  const cs = Math.cos(-1.2), sn = Math.sin(-1.2);
  const spun: [number, number, number] = [local[0] * cs + local[2] * sn, local[1], -local[0] * sn + local[2] * cs];
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM} />
        <ambientLight intensity={0.1} />
        <hemisphereLight args={['#4a6ad0', '#000010', 0.35]} />
        <directionalLight position={sun} intensity={3.6} color="#fff0d0" />
        <SpaceBackdrop />
        <Stars seed={13} />
        <Sun position={[sun[0] * 0.8, sun[1] + 8, sun[2] * 0.8]} size={3} />
        <Earth radius={3.1} spin={1.2} tilt={0.3} position={[0, -2.6, 0]} cityLights={spun} cloudSpin={1.2 + f * 0.002} />
      </Stage>
      <Vignette strength={0.45} />
      {(() => {
        // 夜側（太陽と反対側）かつカメラから見える点
        const cp = sampleCam(CAM, f).pos;
        const toCam = [cp[0], cp[1] + 2.6, cp[2]];
        const lc = Math.hypot(...toCam);
        const ls = Math.hypot(...sun);
        const v = [0, 1, 2].map((i) => (toCam[i] / lc) * 0.75 - (sun[i] / ls) * 0.65);
        const lv = Math.hypot(...v);
        const p: [number, number, number] = [(v[0] / lv) * 3.25, -2.6 + (v[1] / lv) * 3.25, (v[2] / lv) * 3.25];
        return <CalloutView {...project(CAM, f, p)} {...CALLOUTS.night} from={50} to={118} dy={-120} />;
      })()}
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(255,170,60,${0.05 + 0.05 * Math.sin(f * 0.1)}) 0%, rgba(0,0,0,0) 40%)`}} />
    </AbsoluteFill>
  );
};
