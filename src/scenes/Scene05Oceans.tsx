import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {Earth, Stars} from '../three/Earth';
import {CameraRig} from '../lib/CameraRig';
import {ramp} from '../lib/anim';
import {C} from '../theme';
import {Vignette} from '../components/Overlay';

export const Scene05Oceans: React.FC = () => {
  const f = useCurrentFrame();
  const shift = ramp(f, 8, 95);
  const a = -0.9 + f * 0.016;
  const r = 11.5 - f * 0.012;
  return (
    <AbsoluteFill>
      <Stage bg={C.space} shadows={false}>
        <CameraRig
          keys={[
            {f: 0, pos: [Math.sin(-0.9) * 11.5, 3.2, Math.cos(-0.9) * 11.5], look: [0, 0.3, 0], fov: 42},
            {f: 120, pos: [Math.sin(a) * r, 1.2, Math.cos(a) * r], look: [0, 0.3, 0], fov: 42},
          ]}
        />
        <ambientLight intensity={0.5} />
        <hemisphereLight args={['#dff1ff', '#2a3a7a', 0.9]} />
        <directionalLight position={[5, 6, 9]} intensity={2.4} />
        <Stars seed={9} />
        <Earth radius={2.7} spin={0.4 + f * 0.004} tilt={0} oceanShift={shift} clouds={false} position={[0, -0.2, 0]} />
        {/* 赤道ライン */}
        <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.95, 0.02, 6, 96]} />
          <meshBasicMaterial color={C.yellow} transparent opacity={0.25 + 0.55 * ramp(f, 60, 75)} />
        </mesh>
      </Stage>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};
