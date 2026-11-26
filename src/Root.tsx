import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import {TOTAL_FRAMES} from './script';
import {FPS, HEIGHT, WIDTH} from './theme';

export const Root: React.FC = () => (
  <>
    <Composition id="MoshimoShort" component={Video} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true}} />
  </>
);
