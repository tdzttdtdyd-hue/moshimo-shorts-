import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig} from '../lib/CameraRig';
import {Lens} from '../three/Lens';
import {NightCity, NightSky} from './City';
import {V3} from '../lib/anim';

export const BhTest: React.FC = () => {
  const f = useCurrentFrame();
  const bh: V3 = [0, 1.6, 0];
  const a = Math.min(1, f / 60);
  return (
    <AbsoluteFill>
      <Stage bg="#04060f" shadows={false}>
        <CameraRig keys={[{f: 0, pos: [2.5, 2.2, 32], look: [0, 4, 0], fov: 55}]} />
        <NightSky />
        <hemisphereLight args={['#3a4a7a', '#101018', 0.6]} />
        <ambientLight intensity={0.15} />
        <NightCity f={f} bh={bh} pullAt={(p) => Math.max(0, Math.min(1, a * 1.6 - Math.hypot(p[0] - bh[0], p[2] - bh[2]) / 40))} />
        <Lens target={bh} shadow={0.01 + 0.03 * a} einstein={0.04 + 0.12 * a} streak={0.2 + 0.7 * a} glow={1} />
      </Stage>
    </AbsoluteFill>
  );
};

import {MapGround, reachRadius} from './Map';
export const BhMapTest: React.FC = () => {
  const f = useCurrentFrame();
  const t = [0.05, 0.6, 1.7, 3.0][Math.min(3, Math.floor(f / 10))];
  const kanto = f >= 40;
  return (
    <AbsoluteFill>
      <Stage bg="#04060f" shadows={false}>
        {kanto ? <CameraRig keys={[{f: 0, pos: [0, 120, 160], look: [0, 0, 0], fov: 50}]} /> : <CameraRig keys={[{f: 0, pos: [0, 60, 80], look: [0, 0, -5], fov: 50}]} />}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        {kanto ? <MapGround b={{lon0: 138.4, lon1: 141.2, lat0: 34.6, lat1: 36.9}} unitKm={1} t={f < 45 ? 0.02 : 0.1} /> : <MapGround b={{lon0: 127, lon1: 147, lat0: 29, lat1: 46}} unitKm={10} t={t} />}
      </Stage>
      <div style={{position: 'absolute', left: 20, top: 20, color: '#fff', fontSize: 40}}>{kanto ? 'kanto' : `t=${t} r=${(reachRadius(t) / 1000).toFixed(0)}km`}</div>
    </AbsoluteFill>
  );
};
