import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import {HumanTest} from './dev/HumanTest';
import {EarthTest} from './dev/EarthTest';
import {TOTAL_FRAMES} from './script';
import {FPS, HEIGHT, WIDTH} from './theme';

export const Root: React.FC = () => (
  <>
    <Composition id="MoshimoShort" component={Video} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true}} />
    <Composition id="HumanTest" component={HumanTest} durationInFrames={2} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="EarthTest" component={EarthTest} durationInFrames={4} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
