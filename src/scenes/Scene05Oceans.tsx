import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {Earth, SpaceBackdrop, Stars, Sun} from '../three/Earth';
import {CameraRig} from '../lib/CameraRig';
import {ramp} from '../lib/anim';
import {C} from '../theme';
import {CalloutView, Vignette} from '../components/Overlay';
import {CamKey, sampleCam} from '../lib/CameraRig';
import {project} from '../lib/project';
import {CALLOUTS} from '../components/callouts';
import {SpaceLights} from './Scene01Hook';

const A1 = -0.9 + 120 * 0.016;
const R1 = 11.5 - 120 * 0.012;
const CAM: CamKey[] = [
  {f: 0, pos: [Math.sin(-0.9) * 11.5, 3.2, Math.cos(-0.9) * 11.5], look: [0, 0.3, 0], fov: 42},
  {f: 120, pos: [Math.sin(A1) * R1, 1.2, Math.cos(A1) * R1], look: [0, 0.3, 0], fov: 42},
];

export const Scene05Oceans: React.FC = () => {
  const f = useCurrentFrame();
  const shift = ramp(f, 8, 95);
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM} />
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
      {(() => {
        // 赤道上でカメラに向いている点
        const c = sampleCam(CAM, f).pos;
        const d = Math.hypot(c[0], c[2]);
        const ang = 0.35;
        const x = (c[0] * Math.cos(ang) - c[2] * Math.sin(ang)) / d;
        const z = (c[0] * Math.sin(ang) + c[2] * Math.cos(ang)) / d;
        return <CalloutView {...project(CAM, f, [x * 2.78, -0.2, z * 2.78])} {...CALLOUTS.equator} from={64} to={118} dy={170} dx={60} />;
      })()}
    </AbsoluteFill>
  );
};
