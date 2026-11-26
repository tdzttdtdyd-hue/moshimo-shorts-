import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {easeIn} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {HEIGHT, WIDTH} from '../theme';
import {Human, OUTFITS, flailPose, walkPose} from '../three/Human';
import {WindStreaks} from '../three/Props';
import {CarV4} from './city/CarV4';
import {Forest, TreeSpec} from '../three/Landscape';
import {Buildings, CityFiller, CROSS_Z, HOME, PolesAndWires, ROAD_HALF, Streets, TrafficLight, VendingMachine, useLayout} from './city/City';
import {CloudLayer, DebrisField, Flood, Sky, Snowfall, skyColors} from './city/Effects';
import {F, nightK, snowK, sunDir} from './timeline';

// 一人称カメラ（目の高さ 1.6m）。津波で屋上へ → 時間の早送り → 空へ上昇
const EYE = 1.62;
export const TOKYO_CAM: CamKey[] = [
  {f: 0, pos: [1.3, EYE, 13], look: [0.6, 1.6, -40], fov: 52},
  {f: F.STOP, pos: [1.2, EYE, 11.2], look: [0.9, 1.7, -40], fov: 52},
  {f: 80, pos: [1.15, EYE - 0.05, 11.0], look: [6, 2.4, -16], fov: 55},
  {f: F.SLOW_END, pos: [1.1, EYE - 0.08, 10.8], look: [-7, 2.0, -18], fov: 55},
  {f: F.RT_END, pos: [1.0, EYE, 10.6], look: [0, 2.0, -70], fov: 50},
  {f: F.FF10_END, pos: [0.9, EYE, 10.4], look: [0, 2.4, -90], fov: 48},
  {f: 285, pos: [-5, 14, 2], look: [2, 8, -90], fov: 52},
  {f: F.TSUNAMI_END, pos: [-7.1, HOME.h + 1.75, HOME.z + 2.5], look: [2, 20, -110], fov: 58},
  {f: F.FF1_END, pos: [-7.1, HOME.h + 1.75, HOME.z + 2.3], look: [14, 22, -110], fov: 58},
  {f: F.FF2_END, pos: [-7.1, HOME.h + 1.75, HOME.z + 2.1], look: [50, 24, -90], fov: 58},
  {f: 720, pos: [-7.1, HOME.h + 1.75, HOME.z + 2.0], look: [60, 24, -70], fov: 58},
  {f: F.CRANE, pos: [-7.1, HOME.h + 1.75, HOME.z + 1.8], look: [30, 26, -100], fov: 58},
  {f: F.SPACE, pos: [HOME.x, 190, HOME.z], look: [10, 420, -80], fov: 60, ease: easeIn},
];

const walkers = (() => {
  const r = mulberry32(3);
  return Array.from({length: 12}).map((_, i) => {
    const side = i % 2 ? 1 : -1;
    return {x: side * (ROAD_HALF + 1 + r() * 2), z: 6 - r() * 40, dir: r() < 0.5 ? 1 : -1, o: i % 6, ph: r() * 6, delay: r() * 8};
  });
})();

export const parked = [
  {x: -2.2, z: -8, c: '#e9ecef', rot: Math.PI / 2},
  {x: 2.2, z: -16, c: '#2c3e50', rot: -Math.PI / 2},
  {x: -2.2, z: -26, c: '#c0392b', rot: Math.PI / 2},
  {x: 2.2, z: -4, c: '#95a5a6', rot: -Math.PI / 2},
];

export const carSlide = (f: number, i: number) => {
  const t = Math.max(0, f - F.STOP - 6 - i * 3);
  return f < F.STOP ? 0 : Math.min(30, 0.004 * t * t * (1 + i * 0.2));
};
export const poleTiltAt = (f: number, i: number) => (f < F.STOP + 30 ? 0 : -Math.min(0.32, ((f - F.STOP - 30) / 80) * (0.2 + (i % 3) * 0.06)));

export const TokyoShot: React.FC = () => {
  const f = useCurrentFrame();
  const {bldgs, filler} = useLayout();
  const night = nightK(f);
  const snow = snowK(f);
  const storm = f < F.STOP ? 0 : f < F.FF2_END ? Math.min(1, (f - F.STOP) / 20) * (f < F.TSUNAMI_END ? 0.75 : Math.max(0.15, 0.75 - (f - F.TSUNAMI_END) / 300)) : 0.1;
  const sd = sunDir(f);
  const {hor} = skyColors(f, storm);
  const fogNear = 30 - storm * 18;
  const fogFar = 330 - storm * 200;
  const sunUp = Math.max(0, Math.min(1, (sd[1] + 0.03) / 0.25));
  const trees: TreeSpec[] = useMemo(
    () =>
      [-1, 1].flatMap((s) =>
        Array.from({length: 7}).map((_, i) => ({x: s * (ROAD_HALF + 2.9), z: 24 - i * 9.5 - (s > 0 ? 3 : 0), s: 0.9, type: 'round' as const})),
      ),
    [],
  );
  const bend = (_t: TreeSpec, i: number) => (f < F.STOP ? Math.sin(f * 0.08 + i) * 0.03 : -Math.min(1, (f - F.STOP) / 10) * (0.9 + Math.sin(f * 0.6 + i) * 0.08));
  const poleTilt = (i: number) => poleTiltAt(f, i);
  const camShake = [
    {from: F.STOP, dur: 70, amp: 0.12},
    {from: F.FF10_END, dur: 60, amp: 0.06},
  ];
  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={WIDTH}
        height={HEIGHT}
        shadows={{type: THREE.PCFSoftShadowMap}}
        gl={{antialias: true, preserveDrawingBuffer: true}}
        camera={{fov: 52, position: [0, 1.6, 12], near: 0.1, far: 900}}
        style={{position: 'absolute', inset: 0, filter: 'saturate(0.78) contrast(1.05)'}}
      >
        <color attach="background" args={[hor.getStyle()]} />
        <fog attach="fog" args={[hor.getStyle(), fogNear, fogFar]} />
        <CameraRig keys={TOKYO_CAM} shakes={camShake} />
        <Sky frame={f} storm={storm} />
        <hemisphereLight args={[new THREE.Color('#dfe9f2').lerp(new THREE.Color('#1c2a4a'), night).getStyle(), new THREE.Color('#8f8a80').lerp(new THREE.Color('#141822'), night).getStyle(), 0.75 - night * 0.45]} />
        <ambientLight intensity={0.18} />
        <directionalLight
          position={[sd[0] * 80, Math.max(2, sd[1] * 80), sd[2] * 80]}
          intensity={2.4 * sunUp * (1 - storm * 0.5)}
          color={sd[1] < 0.2 ? '#ffbf86' : '#fff1dc'}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
          shadow-camera-far={300}
          shadow-bias={-0.0005}
          shadow-radius={5}
        />
        {/* 夜の月明かり */}
        <directionalLight position={[-40, 60, 30]} intensity={0.35 * night} color="#9fb6ff" />
        <Streets snow={snow} />
        <Buildings bldgs={bldgs} night={night} snow={snow} />
        <CityFiller items={filler} night={night} snow={snow} />
        <PolesAndWires tilt={poleTilt} sag={f > F.STOP + 40 ? 1.2 : 0} />
        <Forest trees={trees} bend={bend} seed={4} />
        <VendingMachine position={[ROAD_HALF + 3.0, 0.16, 6]} rotY={-Math.PI / 2} i={0} night={night} />
        <VendingMachine position={[ROAD_HALF + 3.0, 0.16, 4.9]} rotY={-Math.PI / 2} i={1} night={night} />
        <VendingMachine position={[-ROAD_HALF - 3.0, 0.16, -16]} rotY={Math.PI / 2} i={2} night={night} />
        <TrafficLight position={[ROAD_HALF + 0.7, 0.16, CROSS_Z + 6]} rotY={Math.PI} />
        <TrafficLight position={[-ROAD_HALF - 0.7, 0.16, CROSS_Z - 6]} rotY={0} />
        {parked.map((c, i) => {
          const slide = carSlide(f, i);
          return <CarV4 key={i} position={[c.x - slide, 0, c.z]} rotation={[Math.min(0.3, slide * 0.02), c.rot + slide * 0.04, 0]} color={c.c} />;
        })}
        {walkers.map((w, i) => {
          if (f < F.STOP) {
            return <Human key={i} position={[w.x, 0.16, w.z + w.dir * f * 0.022]} rotation={[0, w.dir > 0 ? 0 : Math.PI, 0]} outfit={OUTFITS[w.o]} p={walkPose(f * 0.3 + w.ph, 1)} />;
          }
          const t = Math.max(0, (f < F.SLOW_END ? f - F.STOP : F.SLOW_END - F.STOP + (f - F.SLOW_END) * 4) - w.delay);
          const dx = Math.min(200, 0.003 * t * t);
          if (dx > 150) return null;
          return (
            <Human
              key={i}
              position={[w.x - dx, 0.16 + Math.min(2.5, t * 0.03), w.z + w.dir * F.STOP * 0.022]}
              rotation={[0.2, Math.PI / 2, -Math.min(1.4, t * 0.04) - t * 0.02]}
              outfit={OUTFITS[w.o]}
              p={flailPose(t * 0.6, i)}
            />
          );
        })}
        <DebrisField frame={f} />
        <Flood frame={f} />
        {/* 東京湾の対岸 */}
        <mesh position={[0, 4, -330]}>
          <boxGeometry args={[700, 8, 10]} />
          <meshStandardMaterial color="#8e98a3" roughness={1} />
        </mesh>
        <Snowfall frame={f} k={snow} center={[-2, HOME.h + 4, HOME.z - 8]} />
        {f >= F.STOP && f < F.FF2_END && <WindStreaks frame={f} count={80} speed={f < F.SLOW_END ? -0.6 : -2.2} area={[60, 14, 40]} center={[0, 5, -10]} opacity={0.35} />}
        {f > F.CRANE - 10 && <CloudLayer y={120} night={night} />}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

