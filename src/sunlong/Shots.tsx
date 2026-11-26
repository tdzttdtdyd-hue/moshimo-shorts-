import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {project} from '../lib/project';
import {Human, OUTFITS, walkPose} from '../three/Human';
import {Earth, SpaceBackdrop, Stars, Sun} from '../three/Earth';
import {CloudPuffs, Forest, Mountains, SkyDome, Terrain, TreeSpec} from '../three/Landscape';
import {House} from '../three/Props';
import {CalloutL} from './Ui';
import {CALLOUTS_L, LH, LW} from './script';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const LIN = (t: number) => t;
const P = (keys: CamKey[], f: number, w: V3) => project(keys, f, w, LW, LH);

const Space: React.FC<{children: React.ReactNode; sun: V3}> = ({children, sun}) => (
  <>
    <ambientLight intensity={0.1} />
    <hemisphereLight args={['#9fc8ff', '#0a1030', 0.3]} />
    <directionalLight position={sun} intensity={3.2} color="#fff2d8" />
    <SpaceBackdrop />
    <Stars />
    {children}
  </>
);

// ---------- 序章1：太陽と地球 ----------
const CAM_P1: CamKey[] = [
  {f: 0, pos: [6, 2, 16], look: [-2, 0, 0], fov: 40},
  {f: 240, pos: [9, 2.6, 12], look: [0, 0, 0], fov: 40, ease: LIN},
];
export const P1: React.FC = () => {
  const f = useCurrentFrame();
  const sun: V3 = [-26, 3, -18];
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false} width={LW} height={LH}>
        <CameraRig keys={CAM_P1} />
        <Space sun={sun}>
          <Sun position={sun} size={6} />
          <Earth radius={2.4} real detail={110} spin={-2.3 + f * 0.003} tilt={0.3} cloudOpacity={0.55} position={[4, -0.4, 0]} />
        </Space>
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- 光の旅（太陽 → 地球）。distance が大きいほど道のりが長い ----------
const LightTrip: React.FC<{camKeys: CamKey[]; distance: (f: number) => number; period: number; callout?: {from: number; to: number}}> = ({camKeys, distance, period, callout}) => {
  const f = useCurrentFrame();
  const d = distance(f);
  const sunX = -30 * d;
  const t = (f % period) / period;
  const px = sunX + 6 + (2.2 - (sunX + 6)) * t;
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false} width={LW} height={LH}>
        <CameraRig keys={camKeys} />
        <Space sun={[sunX, 0, 0]}>
          <Sun position={[sunX, 0, 0]} size={6} />
          <Earth radius={1.6} real detail={100} spin={-2.3 + f * 0.004} tilt={0.3} cloudOpacity={0.5} position={[4, 0, 0]} />
          {/* 太陽と地球を結ぶ光の道 */}
          <mesh position={[(sunX + 6 + 2.4) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 2.4 - (sunX + 6), 8]} />
            <meshBasicMaterial color="#ffd27a" transparent opacity={0.35} />
          </mesh>
          {/* 光の粒 */}
          <mesh position={[px, 0, 0]}>
            <sphereGeometry args={[0.28, 16, 16]} />
            <meshBasicMaterial color="#fffbe8" />
          </mesh>
          <mesh position={[px - 1.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.25, 0.02, 2.4, 12, 1, true]} />
            <meshBasicMaterial color="#ffe7a8" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          {/* 距離の目盛り（カメラが動くと流れて見える） */}
          {Array.from({length: 40}).map((_, i) => (
            <mesh key={i} position={[sunX + 6 + i * ((2.4 - (sunX + 6)) / 40), -0.9, 0]}>
              <boxGeometry args={[0.04, i % 5 === 0 ? 0.35 : 0.18, 0.04]} />
              <meshBasicMaterial color="#9fb6cc" />
            </mesh>
          ))}
        </Space>
      </Stage>
      {callout && <CalloutL {...P(camKeys, f, [sunX, 0, 0])} {...CALLOUTS_L.sun} from={callout.from} to={callout.to} dy={-140} dx={260} />}
    </AbsoluteFill>
  );
};
const CAM_P2: CamKey[] = [
  {f: 0, pos: [-4, 4, 36], look: [-8, 0, 0], fov: 50},
  {f: 300, pos: [-14, 5, 33], look: [-9, 0, 0], fov: 50, ease: LIN},
];
export const P2: React.FC = () => <LightTrip camKeys={CAM_P2} distance={() => 1} period={150} callout={{from: 20, to: 120}} />;

// ---------- 序章3：ちょうどいい距離（真上から見た太陽系の内側） ----------
const AU = 7;
const CAM_P3: CamKey[] = [
  {f: 0, pos: [-5, 25, 15], look: [-5, 0, 0], fov: 46},
  {f: 360, pos: [1, 22, 17], look: [-4, 0, 0], fov: 46, ease: LIN},
];
const planetPos = (r: number, period: number, f: number, phase: number): V3 => {
  const a = phase + (f / period) * Math.PI * 2;
  return [Math.cos(a) * r * AU, 0, Math.sin(a) * r * AU];
};
export const P3: React.FC = () => {
  const f = useCurrentFrame();
  const venus = planetPos(0.72, 380, f, 0.6);
  const earth = planetPos(1, 620, f, 2.2);
  const mars = planetPos(1.52, 1160, f, 4.1);
  const ring = (r: number, c: string) => (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r * AU - 0.03, r * AU + 0.03, 128]} />
      <meshBasicMaterial color={c} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false} width={LW} height={LH}>
        <CameraRig keys={CAM_P3} />
        <ambientLight intensity={0.6} />
        <pointLight position={[0, 0, 0]} intensity={300} distance={100} decay={1.2} color="#fff2d8" />
        <SpaceBackdrop />
        <Stars />
        <Sun position={[0, 0, 0]} size={1.4} />
        {/* 生命が住める範囲（水が液体でいられる帯） */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.95 * AU, 1.37 * AU, 128]} />
          <meshBasicMaterial color="#3fcf8e" transparent opacity={0.18 + 0.05 * Math.sin(f * 0.1)} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {ring(0.72, '#e3b56a')}
        {ring(1, '#7fb8ff')}
        {ring(1.52, '#e0754a')}
        <mesh position={venus}>
          <sphereGeometry args={[0.35, 24, 24]} />
          <meshStandardMaterial color="#e8c77a" emissive="#5a3a10" emissiveIntensity={0.3} />
        </mesh>
        <group position={earth}>
          <Earth radius={0.42} real detail={60} spin={f * 0.02} tilt={0.3} clouds={false} />
        </group>
        <mesh position={mars}>
          <sphereGeometry args={[0.28, 24, 24]} />
          <meshStandardMaterial color="#c8603a" />
        </mesh>
      </Stage>
      <CalloutL {...P(CAM_P3, f, venus)} {...CALLOUTS_L.venus} from={190} to={350} dy={150} dx={-260} />
      <CalloutL {...P(CAM_P3, f, mars)} {...CALLOUTS_L.mars} from={220} to={350} dy={-120} dx={-80} />
      <CalloutL {...P(CAM_P3, f, [1.2 * AU * Math.cos(-1.2), 0, 1.2 * AU * Math.sin(-1.2)])} {...CALLOUTS_L.zone} from={20} to={170} dy={-120} />
    </AbsoluteFill>
  );
};

// ---------- 序章4・第1章の扉・次へ：地球と遠ざかる太陽 ----------
const CAM_P4: CamKey[] = [
  {f: 0, pos: [0, 1.4, 8.5], look: [0, 0, 0], fov: 42},
  {f: 300, pos: [-2.6, 1.8, 8.2], look: [-0.4, 0, 0], fov: 42, ease: LIN},
];
export const P4: React.FC<{recede?: [number, number]}> = ({recede = [240, 300]}) => {
  const f = useCurrentFrame();
  const away = interpolate(f, recede, [0, 1], {...clamp, easing: (x) => x * x});
  const sun: V3 = [-24 - away * 26, 4 + away * 3, -26 - away * 50];
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false} width={LW} height={LH}>
        <CameraRig keys={CAM_P4} />
        <Space sun={sun}>
          <Sun position={sun} size={5} />
          <Earth radius={2.4} real detail={110} spin={-2.3 + f * 0.004} tilt={0.3} cloudOpacity={0.55} position={[1.2, -0.2, 0]} />
        </Space>
      </Stage>
    </AbsoluteFill>
  );
};
export const C1Title: React.FC = () => <P4 recede={[0, 150]} />;

// ---------- 第1章：光が届くまで 25秒長く ----------
const CAM_C1L: CamKey[] = [
  {f: 0, pos: [-6, 5, 38], look: [-9, 0, 0], fov: 50},
  {f: 450, pos: [-18, 6, 35], look: [-10, 0, 0], fov: 50, ease: LIN},
];
export const C1Light: React.FC = () => <LightTrip camKeys={CAM_C1L} distance={(f) => 1 + 0.05 * Math.min(1, Math.max(0, (f - 30) / 120))} period={158} />;

// ---------- 第1章：東京の真夏が5月なみに ----------
const CAM_C1C: CamKey[] = [
  {f: 0, pos: [-9, 2.6, 13], look: [0, 2, 0], fov: 46},
  {f: 450, pos: [8, 2.4, 12], look: [0, 1.8, -2], fov: 46, ease: LIN},
];
const THERMO: V3 = [2.6, 2.8, 2.2];
const Thermometer: React.FC<{temp: number}> = ({temp}) => {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    return {c, t: new THREE.CanvasTexture(c)};
  }, []);
  const ctx = tex.c.getContext('2d')!;
  ctx.fillStyle = '#10141c';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = temp > 24 ? '#ff7a5a' : '#8fd0ff';
  ctx.font = "900 84px 'Noto Sans JP', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${temp.toFixed(0)}℃`, 128, 68);
  tex.t.colorSpace = THREE.SRGBColorSpace;
  tex.t.needsUpdate = true;
  return (
    <group position={THERMO}>
      <mesh position={[0, -1.4, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 2.8, 10]} />
        <meshStandardMaterial color="#8a9099" metalness={0.5} />
      </mesh>
      <mesh>
        <boxGeometry args={[1.4, 0.72, 0.1]} />
        <meshStandardMaterial color="#2a2f38" />
      </mesh>
      <mesh position={[0, 0, 0.052]}>
        <planeGeometry args={[1.3, 0.64]} />
        <meshBasicMaterial map={tex.t} />
      </mesh>
    </group>
  );
};
export const C1City: React.FC = () => {
  const f = useCurrentFrame();
  const k = interpolate(f, [30, 330], [0, 1], clamp);
  const temp = 27 - 7 * k;
  const houses = useMemo(() => {
    const r = mulberry32(3);
    return Array.from({length: 10}).map((_, i) => ({x: -14 + (i % 5) * 7 + r(), z: i < 5 ? -4 : -12, c: ['#fff4e0', '#e7f5ff', '#ffe3e3'][i % 3], roof: ['#c0392b', '#2c6e9b', '#7a5233'][i % 3]}));
  }, []);
  const trees: TreeSpec[] = useMemo(() => Array.from({length: 16}).map((_, i) => ({x: -20 + i * 2.6, z: -18 - (i % 3), s: 1.1, type: i % 3 ? 'round' : 'pine'})), []);
  const sky = new THREE.Color('#3f86d8').lerp(new THREE.Color('#8aa6c2'), k).getStyle();
  const hor = new THREE.Color('#e8f2fa').lerp(new THREE.Color('#d7dee5'), k).getStyle();
  return (
    <AbsoluteFill>
      <Stage bg="#cfe4f3" fog={[hor, 30, 140]} width={LW} height={LH}>
        <CameraRig keys={CAM_C1C} />
        <SkyDome top={sky} horizon={hor} sunDir={[0.4, 0.7 - 0.25 * k, -0.6]} />
        <hemisphereLight args={['#eef6ff', '#8f8a80', 0.95]} />
        <directionalLight position={[10, 16 - 5 * k, 6]} intensity={2.4 - 0.8 * k} castShadow shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={25} shadow-camera-bottom={-25} />
        <Terrain size={[160, 160]} seg={80} amp={0.2} colorAt={(_x, _z, n) => new THREE.Color('#6fb84f').lerp(new THREE.Color('#8f9a6a'), k * 0.6).lerp(new THREE.Color('#4f8f3a'), Math.max(0, -n))} />
        <Mountains seed={3} radius={90} height={22} color="#7f9fbf" />
        <CloudPuffs seed={4} count={10} drift={f * 0.03} />
        {houses.map((h, i) => (
          <House key={i} position={[h.x, 0, h.z]} wall={h.c} roof={h.roof} h={1} scale={1.4} />
        ))}
        <Forest trees={trees} seed={6} bend={(_t, i) => Math.sin(f * 0.05 + i) * 0.04} />
        <Thermometer temp={temp} />
        <Human position={[-1 + f * 0.012, 0, 4]} rotation={[0, Math.PI / 2, 0]} outfit={OUTFITS[4]} p={walkPose(f * 0.28, 0.9)} />
      </Stage>
      <CalloutL {...P(CAM_C1C, f, [THERMO[0], THERMO[1] + 0.4, THERMO[2]])} {...CALLOUTS_L.thermo} from={240} to={440} dy={-110} />
    </AbsoluteFill>
  );
};

// ---------- 第1章：氷河が広がる ----------
const CAM_C1I: CamKey[] = [
  {f: 0, pos: [-30, 14, 50], look: [0, 6, -20], fov: 48},
  {f: 450, pos: [20, 18, 46], look: [0, 6, -24], fov: 48, ease: LIN},
];
export const C1Ice: React.FC = () => {
  const f = useCurrentFrame();
  const snow = interpolate(f, [20, 400], [0.15, 0.85], clamp);
  const ice = interpolate(f, [60, 420], [0, 1], clamp);
  const floes = useMemo(() => {
    const r = mulberry32(8);
    return Array.from({length: 70}).map(() => ({x: (r() - 0.5) * 160, z: 20 + r() * 60, s: 1 + r() * 4, ry: r() * 6, t: r()}));
  }, []);
  // 高いところから雪と氷河に覆われていく
  const colorAt = (x: number, z: number, n: number) => {
    const h = Math.max(0, -z - 10) / 50 + n * 0.3;
    const white = h > 1 - snow ? 1 : 0;
    return new THREE.Color('#6d8f5a').lerp(new THREE.Color('#8a7f6a'), Math.min(1, h)).lerp(new THREE.Color('#f2f6fb'), white);
  };
  return (
    <AbsoluteFill>
      <Stage bg="#b9c9d8" fog={['#c8d4e0', 60, 320]} width={LW} height={LH}>
        <CameraRig keys={CAM_C1I} />
        <SkyDome top="#7f9cbc" horizon="#dde5ec" sunDir={[0.3, 0.35, -0.8]} />
        <hemisphereLight args={['#eef3f8', '#7f8a96', 0.95]} />
        <directionalLight position={[20, 25, 10]} intensity={1.6} castShadow shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={60} shadow-camera-bottom={-60} />
        <Terrain key={Math.round(snow * 30)} size={[260, 120]} seg={110} amp={6} position={[0, 0, -40]} colorAt={colorAt} />
        <Mountains seed={14} radius={150} height={60} color="#dfe7ef" arc={[Math.PI * 1.05, Math.PI * 1.95]} />
        {/* 海と流氷 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 60]}>
          <planeGeometry args={[400, 120]} />
          <meshPhysicalMaterial color={new THREE.Color('#2e5878').lerp(new THREE.Color('#9fb8cc'), ice * 0.5).getStyle()} roughness={0.2} clearcoat={0.6} />
        </mesh>
        {floes
          .filter((p) => p.t < ice)
          .map((p, i) => (
            <mesh key={i} position={[p.x, -0.3, p.z]} rotation={[0, p.ry, 0]} scale={[p.s, 0.4, p.s * 0.7]}>
              <cylinderGeometry args={[1, 1, 1, 6]} />
              <meshStandardMaterial color="#eef4fa" roughness={0.6} />
            </mesh>
          ))}
      </Stage>
      <CalloutL {...P(CAM_C1I, f, [-8, 18, -70])} {...CALLOUTS_L.glacier} from={240} to={440} dy={-100} />
    </AbsoluteFill>
  );
};

// ---------- 第1章のしめ：太陽はさらに遠ざかる ----------
export const C1Next: React.FC = () => <P4 recede={[60, 300]} />;
