import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Stage, Lights} from '../three/Stage';
import {CameraRig} from '../lib/CameraRig';
import {Human, OUTFITS, IDLE, walkPose, runPose, flailPose, shockPose, hotPose, coldPose, wavePose, thinkPose} from '../three/Human';

export const HumanTest: React.FC = () => {
  const poses = [IDLE, walkPose(1.2), runPose(1.2), flailPose(3), shockPose(0), hotPose(0), coldPose(0), wavePose(0), thinkPose(0)];
  return (
    <AbsoluteFill>
      <Stage bg="#9fd8ff">
        <CameraRig keys={[{f: 0, pos: [0, 1.6, 9], look: [0, 1.1, 0], fov: 40}, {f: 1, pos: [0, 1.6, 9], look: [0, 1.1, 0], fov: 40}]} />
        <Lights />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#8fcf7a" /></mesh>
        {poses.map((p, i) => (
          <Human key={i} position={[((i % 3) - 1) * 1.3, 0, i < 3 ? -2 : i < 6 ? 0 : 2]} rotation={[0, 0.5, 0]} p={p} outfit={OUTFITS[i % 6]} />
        ))}
      </Stage>
    </AbsoluteFill>
  );
};
