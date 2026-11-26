import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {Earth, SpaceBackdrop, Stars, Sun} from '../three/Earth';
import {CameraRig} from '../lib/CameraRig';
import {Vignette} from '../components/Overlay';

// 自転が止まると太陽の向きは公転だけでゆっくり変わる（タイムラプス）。夜側には街明かり
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
        <CameraRig
          keys={[
            {f: 0, pos: [-6, 2.5, 9], look: [-0.6, -1.4, 0], fov: 50},
            {f: 120, pos: [3, 1.6, 10], look: [0.3, -1.3, 0], fov: 48},
          ]}
        />
        <ambientLight intensity={0.1} />
        <hemisphereLight args={['#4a6ad0', '#000010', 0.35]} />
        <directionalLight position={sun} intensity={3.6} color="#fff0d0" />
        <SpaceBackdrop />
        <Stars seed={13} />
        <Sun position={[sun[0] * 0.8, sun[1] + 8, sun[2] * 0.8]} size={3} />
        <Earth radius={3.1} spin={1.2} tilt={0.3} position={[0, -2.6, 0]} cityLights={spun} cloudSpin={1.2 + f * 0.002} />
      </Stage>
      <Vignette strength={0.45} />
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(255,170,60,${0.05 + 0.05 * Math.sin(f * 0.1)}) 0%, rgba(0,0,0,0) 40%)`}} />
    </AbsoluteFill>
  );
};
