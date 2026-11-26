import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {Earth, SpaceBackdrop, Stars, Sun} from '../three/Earth';
import {CameraRig} from '../lib/CameraRig';
import {ramp} from '../lib/anim';
import {C} from '../theme';
import {Vignette} from '../components/Overlay';
import {SpaceLights} from './Scene01Hook';

export const Scene05Oceans: React.FC = () => {
  const f = useCurrentFrame();
  const shift = ramp(f, 8, 95);
  const a = -0.9 + f * 0.016;
  const r = 11.5 - f * 0.012;
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig
          keys={[
            {f: 0, pos: [Math.sin(-0.9) * 11.5, 3.2, Math.cos(-0.9) * 11.5], look: [0, 0.3, 0], fov: 42},
            {f: 120, pos: [Math.sin(a) * r, 1.2, Math.cos(a) * r], look: [0, 0.3, 0], fov: 42},
          ]}
        />
        <SpaceLights sun={[4, 5, 10]} />
        <SpaceBackdrop />
        <Stars seed={9} />
        <Sun position={[-80, 30, -100]} size={3} />
        <Earth radius={2.7} spin={0.4 + f * 0.004} tilt={0} oceanShift={shift} clouds={shift < 0.15} position={[0, -0.2, 0]} />
        <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3.02, 0.015, 6, 128]} />
          <meshBasicMaterial color={C.yellow} transparent opacity={0.2 + 0.6 * ramp(f, 60, 75)} />
        </mesh>
      </Stage>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};
