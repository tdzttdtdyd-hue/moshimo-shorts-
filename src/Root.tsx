import React from 'react';
import {Composition} from 'remotion';
import {VideoV4} from './VideoV4';
import {HumanTest} from './dev/HumanTest';
import {EarthTest} from './dev/EarthTest';
import {Scene3D} from './v4/Scene3D';
import {VolleyVideo} from './volley/VolleyVideo';
import {TOTAL_FRAMES as VOLLEY_FRAMES} from './volley/script';
import {F} from './v4/timeline';
import {FPS, HEIGHT, WIDTH} from './theme';

export const Root: React.FC = () => (
  <>
    <Composition id="MoshimoShort" component={VideoV4} durationInFrames={F.END} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="HumanTest" component={HumanTest} durationInFrames={2} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="EarthTest" component={EarthTest} durationInFrames={4} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="V4Raw" component={Scene3D} durationInFrames={F.END} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="VolleyShort" component={VolleyVideo} durationInFrames={VOLLEY_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
  </>
);
