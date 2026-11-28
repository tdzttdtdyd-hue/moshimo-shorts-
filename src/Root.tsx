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
import {PhoneVideo} from './phone/PhoneVideo';
import {IslandVideo} from './island/IslandVideo';
import {PetVideo} from './pet/PetVideo';
import {SwapVideo} from './swap/SwapVideo';
import {SpinVideo} from './spin/SpinVideo';
import {PressureVideo} from './pressure/PressureVideo';
import {BeppanVideo} from './beppan/BeppanVideo';
import {HeartVideo} from './heart/HeartVideo';
import {BhTest, BhMapTest} from './bh/Test';
import {BhVideo} from './bh/BhVideo';
import {TOTAL_FRAMES as BH_FRAMES} from './bh/script';
import {TOTAL_FRAMES as HEART_FRAMES} from './heart/script';
import {TOTAL_FRAMES as BEPPAN_FRAMES} from './beppan/script';
import {TOTAL_FRAMES as PRESSURE_FRAMES} from './pressure/script';
import {TOTAL_FRAMES as SPIN_FRAMES} from './spin/script';
import {TOTAL_FRAMES as SWAP_FRAMES} from './swap/script';
import {TOTAL_FRAMES as PET_FRAMES} from './pet/script';
import {TOTAL_FRAMES as ISLAND_FRAMES} from './island/script';
import {TOTAL_FRAMES as PHONE_FRAMES} from './phone/script';
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
    <Composition id="PhoneShort" component={PhoneVideo} durationInFrames={PHONE_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="IslandShort" component={IslandVideo} durationInFrames={ISLAND_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="PetShort" component={PetVideo} durationInFrames={PET_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="SwapShort" component={SwapVideo} durationInFrames={SWAP_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="SpinShort" component={SpinVideo} durationInFrames={SPIN_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="PressureShort" component={PressureVideo} durationInFrames={PRESSURE_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="BeppanShort" component={BeppanVideo} durationInFrames={BEPPAN_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="HeartShort" component={HeartVideo} durationInFrames={HEART_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="BhShort" component={BhVideo} durationInFrames={BH_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{withSfx: true, withBgm: true}} />
    <Composition id="BhTest" component={BhTest} durationInFrames={90} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="BhMapTest" component={BhMapTest} durationInFrames={60} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="SunLong" component={SunLongVideo} durationInFrames={TOTAL_L} fps={FPS} width={LW} height={LH} defaultProps={{withSfx: true, withBgm: true}} />
  </>
);
