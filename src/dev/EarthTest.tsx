import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig} from '../lib/CameraRig';
import {Earth, Stars, SpaceBackdrop, Sun} from '../three/Earth';

export const EarthTest: React.FC = () => {
  const f = useCurrentFrame();
  const mode = f;
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={[{f: 0, pos: [0, 1, 10], look: [0, 0, 0], fov: 42}, {f: 9, pos: [0, 1, 10], look: [0, 0, 0], fov: 42}]} />
        <ambientLight intensity={mode === 2 ? 0.12 : 0.25} />
        <hemisphereLight args={['#bfe3ff', '#20306a', mode === 2 ? 0.35 : 0.6]} />
        <directionalLight position={mode === 2 ? [-10, 2, -3] : [6, 4, 8]} intensity={3} />
        <SpaceBackdrop />
        <Stars />
        {mode === 2 && <Sun position={[-60, 10, -40]} size={4} />}
        <Earth radius={3} real detail={120} spin={[-2.4, -0.3, 1.6, 0.4][mode]} tilt={0.15} clouds={mode === 0} cloudOpacity={0.55} />
      </Stage>
    </AbsoluteFill>
  );
};
