import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {Earth, Stars, Sun} from '../three/Earth';
import {CameraRig} from '../lib/CameraRig';
import {Vignette} from '../components/Overlay';

// 自転が止まると、太陽の位置は公転だけでゆっくり動く（タイムラプス表現）
export const Scene06DayLength: React.FC = () => {
  const f = useCurrentFrame();
  const sa = 3.25 + f * 0.006;
  const sun: [number, number, number] = [Math.cos(sa) * 60, 4, Math.sin(sa) * 60 - 10];
  return (
    <AbsoluteFill>
      <Stage bg="#070a22" shadows={false}>
        <CameraRig
          keys={[
            {f: 0, pos: [-6, 2.5, 9], look: [-0.6, -1.4, 0], fov: 50},
            {f: 120, pos: [3, 1.6, 10], look: [0.3, -1.3, 0], fov: 48},
          ]}
        />
        <ambientLight intensity={0.06} />
        <hemisphereLight args={['#4060c0', '#000010', 0.15]} />
        <directionalLight position={sun} intensity={3.4} color="#fff0d0" />
        <Stars seed={13} />
        <Sun position={[sun[0] * 0.6, sun[1] + 6, sun[2] * 0.6]} size={4} />
        <Earth radius={3.1} spin={1.2} tilt={0.3} position={[0, -2.6, 0]} />
      </Stage>
      <Vignette strength={0.45} />
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(255,170,60,${0.05 + 0.05 * Math.sin(f * 0.1)}) 0%, rgba(0,0,0,0) 40%)`}} />
    </AbsoluteFill>
  );
};
