import React from 'react';
import {Composition} from 'remotion';
import {VideoV4} from './VideoV4';
import {HumanTest} from './dev/HumanTest';
import {EarthTest} from './dev/EarthTest';
import {Scene3D} from './v4/Scene3D';
import {VolleyVideo} from './volley/VolleyVideo';
import {CoinVideo} from './coin/CoinVideo';
import {SunVideo} from './sun/SunVideo';
import {LineVideo} from './line/LineVideo';
import {HoriVideo} from './hori/HoriVideo';
import {MoonVideo} from './moon/MoonVideo';
import {CubeVideo} from './cube/CubeVideo';
import {TOTAL_FRAMES as CUBE_FRAMES} from './cube/script';
import {TOTAL_FRAMES as MOON_FRAMES} from './moon/script';
import {TOTAL_FRAMES as HORI_FRAMES} from './hori/script';
import {SunLongVideo} from './sunlong/SunLongVideo';
import {TOTAL_L, LW, LH} from './sunlong/script';
import {TOTAL_FRAMES as LINE_FRAMES} from './line/script';
import {TOTAL_FRAMES as SUN_FRAMES} from './sun/script';
import {TOTAL_FRAMES as COIN_FRAMES} from './coin/script';
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
    <Composition id="CoinShort" component={CoinVideo} durationInFrames={COIN_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="SunShort" component={SunVideo} durationInFrames={SUN_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="LineShort" component={LineVideo} durationInFrames={LINE_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="HoriShort" component={HoriVideo} durationInFrames={HORI_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="MoonShort" component={MoonVideo} durationInFrames={MOON_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="CubeShort" component={CubeVideo} durationInFrames={CUBE_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="SunLong" component={SunLongVideo} durationInFrames={TOTAL_L} fps={FPS} width={LW} height={LH} defaultProps={{withSfx: true, withBgm: true}} />
  </>
);
