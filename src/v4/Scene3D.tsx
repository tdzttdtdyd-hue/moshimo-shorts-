import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {TokyoShot} from './TokyoShot';
import {SpaceShot} from './SpaceShot';
import {F} from './timeline';

export const Scene3D: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <Sequence from={0} durationInFrames={F.SPACE + 6} name="tokyo">
      <TokyoShot />
    </Sequence>
    <Sequence from={F.SPACE} durationInFrames={F.END - F.SPACE} name="space">
      <SpaceShot />
    </Sequence>
  </AbsoluteFill>
);
