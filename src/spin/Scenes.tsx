import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {project} from '../lib/project';
import {Earth, SpaceBackdrop, Stars} from '../three/Earth';
import {Human, OUTFITS, Outfit, Pose, pose, walkPose, flailPose} from '../three/Human';
import {Road, SkyDome, Tower} from '../three/Landscape';
import {Car} from '../three/Props';
import {CalloutView, Vignette} from './Overlay';
import {SCENES} from './script';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const LIN = (t: number) => t;
const sm = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const spec = (id: string) => SCENES.find((s) => s.id === id)!;
const CO = (id: string, key: string) => spec(id).callouts!.find((c) => c.key === key)!;
const mix = (a: string, b: string, t: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t))).getHexString();
const Box: React.FC<{p: V3; s: V3; c: string; r?: number; e?: string; ei?: number; rot?: V3}> = ({p, s, c, r = 0.8, e, ei = 0, rot = [0, 0, 0]}) => (
  <mesh position={p} rotation={rot}>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} roughness={r} emissive={e ?? '#000'} emissiveIntensity={ei} />
  </mesh>
);
const SpaceLights: React.FC = () => (
  <>
    <ambientLight intensity={0.15} />
    <hemisphereLight args={['#9fc8ff', '#0a1030', 0.35]} />
    <directionalLight position={[8, 3, 9]} intensity={3.0} color="#fff4e2" />
  </>
);

// ---------- 1. 地球がだんだん速く回る ----------
const CAM_1: CamKey[] = [
  {f: 0, pos: [0, 0.8, 13.5], look: [0, 0.6, 0], fov: 40},
  {f: 150, pos: [1.8, 1.6, 12.5], look: [0, 0.6, 0], fov: 40, ease: LIN},
];
export const S1: React.FC = () => {
  const f = useCurrentFrame();
  // 角度 = ∫ 角速度（だんだん速く）
  const spin = 0.004 * f + 0.00012 * f * f;
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM_1} />
        <SpaceLights />
        <SpaceBackdrop />
        <Stars />
        <Earth radius={2.3} real detail={110} spin={1.0 + spin} tilt={0.35} cloudOpacity={0.5} position={[0, 0.9, 0]} />
        {/* 回転の向きを示す矢印の弧 */}
        <mesh position={[0, 0.9, 0]} rotation={[Math.PI / 2 - 0.35, 0, -spin * 0.5]}>
          <torusGeometry args={[2.8, 0.03, 8, 64, Math.PI * 0.6]} />
          <meshBasicMaterial color="#ffb27a" transparent opacity={interpolate(f, [70, 90], [0, 0.8], clamp)} />
        </mesh>
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- 2. 12時間：太陽が速く空を横切る ----------
const DAY = {top: '#4f9be0', hz: '#d8eefa'};
const DUSK = {top: '#4a5a9a', hz: '#ffa868'};
const NIGHT = {top: '#050a1e', hz: '#18264a'};
const skyAt = (el: number) => {
  // el：太陽の高さ（−1..1）
  if (el > 0.25) return {top: DAY.top, hz: DAY.hz, light: 1};
  if (el > -0.05) {
    const t = (el + 0.05) / 0.3;
    return {top: mix(DUSK.top, DAY.top, t), hz: mix(DUSK.hz, DAY.hz, t), light: 0.4 + 0.6 * t};
  }
  const t = Math.min(1, (-0.05 - el) / 0.2);
  return {top: mix(DUSK.top, NIGHT.top, t), hz: mix(DUSK.hz, NIGHT.hz, t), light: 0.4 - 0.3 * t};
};
const City: React.FC<{f: number; period: number; walk?: boolean}> = ({f, period, walk = true}) => {
  const a = (f / period) * Math.PI * 2 - Math.PI / 2;
  const sunDir: V3 = [Math.cos(a), Math.sin(a), -0.35];
  const sky = skyAt(Math.sin(a));
  const towers = useMemo(() => {
    const r = mulberry32(4);
    return Array.from({length: 14}).map((_, i) => ({p: [(i % 2 ? 1 : -1) * (6 + r() * 2), 0, -4 - Math.floor(i / 2) * 6] as V3, h: 6 + r() * 14, c: ['#c9ccd2', '#d8cfc2', '#bfc8cf'][i % 3], seed: i + 1}));
  }, []);
  const people = useMemo(() => {
    const r = mulberry32(9);
    return Array.from({length: 10}).map((_, i) => ({x: (r() < 0.5 ? -1 : 1) * (3.2 + r() * 0.6), z0: -r() * 30, v: 0.02 + r() * 0.02, o: i}));
  }, []);
  return (
    <>
      <SkyDome top={sky.top} horizon={sky.hz} sunDir={sunDir} sunColor="#fff1c9" sunPower={24} />
      {Math.sin(a) > -0.1 && (
        <mesh position={[sunDir[0] * 180, sunDir[1] * 180, sunDir[2] * 180]}>
          <sphereGeometry args={[6, 20, 16]} />
          <meshBasicMaterial color="#fff6d8" />
        </mesh>
      )}
      <hemisphereLight args={[sky.hz, '#6a6a60', 0.4 + 0.7 * sky.light]} />
      <ambientLight intensity={0.15 + 0.15 * sky.light} />
      <directionalLight position={[sunDir[0] * 30, Math.max(2, sunDir[1] * 30), -10]} intensity={1.8 * Math.max(0, sky.light)} color="#fff0d8" />
      <Box p={[0, -0.06, -20]} s={[40, 0.1, 80]} c="#b8b4ac" />
      <Road length={80} width={4.4} position={[0, 0, -20]} rotationY={Math.PI / 2} />
      {towers.map((t, i) => (
        <Tower key={i} position={t.p} w={4} d={5} h={t.h} color={t.c} seed={t.seed} />
      ))}
      {walk &&
        people.map((pp, i) => {
          const z = ((pp.z0 + f * pp.v * 5) % 30) - 28;
          return <Human key={i} outfit={OUTFITS[pp.o % OUTFITS.length]} position={[pp.x, 0, z]} p={walkPose(f * 0.3 + i, 1)} />;
        })}
      <Car position={[-1, 0, ((f * 0.25) % 50) - 45]} color="#e2574c" />
      <Car position={[1, 0, -((f * 0.22) % 50) - 5]} rotation={[0, Math.PI, 0]} color="#4f7fc9" />
    </>
  );
};
const CAM_2: CamKey[] = [
  {f: 0, pos: [0.5, 2.2, 8], look: [0, 6, -30], fov: 56},
  {f: 180, pos: [-0.5, 2.4, 6], look: [0, 6.5, -30], fov: 56, ease: LIN},
];
export const S2: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage bg="#9fc8f0" shadows={false}>
        <CameraRig keys={CAM_2} />
        <City f={f + 20} period={110} />
      </Stage>
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};

// ---------- 赤道の浜（体重計・ジャンプ・浮く） ----------
const Palm: React.FC<{p: V3; h?: number; lift?: number; f: number}> = ({p, h = 5, lift = 0, f}) => (
  <group position={p}>
    <mesh position={[0, h / 2, 0]} rotation={[0, 0, 0.12]}>
      <cylinderGeometry args={[0.1, 0.15, h, 8]} />
      <meshStandardMaterial color="#8a6a48" />
    </mesh>
    {Array.from({length: 7}).map((_, i) => {
      // 葉が1枚ずつ、ちぎれて浮いていく
      const fly = Math.max(0, lift - i * 0.08);
      return (
        <group key={i} position={[0.6 * h * 0.0 + fly * Math.cos(i) * 2, h + fly * (6 + i), fly * Math.sin(i) * 2]} rotation={[fly * 2, (i / 7) * Math.PI * 2 + fly, 0]}>
          <mesh position={[0.9, -0.3, 0]} rotation={[0, 0, -0.45 + 0.05 * Math.sin(f * 0.1 + i)]} scale={[1, 0.08, 0.3]}>
            <sphereGeometry args={[1.0, 10, 6]} />
            <meshStandardMaterial color={i % 2 ? '#3f8f3a' : '#4fa046'} />
          </mesh>
        </group>
      );
    })}
  </group>
);
const Beach: React.FC<{f: number; lift?: number}> = ({f, lift = 0}) => (
  <>
    <SkyDome top="#3f95e0" horizon="#cfeaf8" sunDir={[0.3, 0.8, -0.5]} />
    <hemisphereLight args={['#dff0ff', '#a89a70', 1.1]} />
    <ambientLight intensity={0.3} />
    <directionalLight position={[6, 12, 4]} intensity={2.0} color="#fff4e0" />
    <Box p={[0, -0.06, 0]} s={[60, 0.1, 24]} c="#e8d6a8" r={1} />
    <mesh position={[0, -0.02 + lift * 1.5, -22]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[200, 30]} />
      <meshStandardMaterial color="#2a8fb8" roughness={0.15} transparent opacity={0.9} />
    </mesh>
    <Palm p={[-3.5, 0, -3]} f={f} lift={lift} />
    <Palm p={[4, 0, -5]} h={6} f={f} lift={lift} />
    <Palm p={[-7, 0, -8]} h={5.5} f={f} lift={lift} />
  </>
);
const Scale: React.FC<{p: V3}> = ({p}) => (
  <group position={p}>
    <Box p={[0, 0.03, 0]} s={[0.36, 0.06, 0.36]} c="#f2f2f0" r={0.4} />
    <Box p={[0, 0.062, 0.12]} s={[0.12, 0.005, 0.05]} c="#2a2a30" e="#8fe08f" ei={0.4} />
  </group>
);
const CAM_3: CamKey[] = [
  {f: 0, pos: [2.4, 1.6, 4.8], look: [0, 0.9, 0], fov: 48},
  {f: 150, pos: [-1.2, 1.7, 4.4], look: [0, 0.9, 0], fov: 48, ease: LIN},
];
const SWIM: Outfit = {shirt: '#f2c14e', pants: '#3f7fd0', skin: '#d6a27f', hair: '#1c1714'};
export const S3: React.FC = () => {
  const f = useCurrentFrame();
  const joy = sm((f - 60) / 10);
  const p: Pose = lerpPose(pose({head: 0.5, spine: 0.1}), pose({lSh: [0.3, 2.6 + 0.1 * Math.sin(f * 0.4)], rSh: [0.3, 2.6 + 0.1 * Math.cos(f * 0.4)], lEl: 0.3, rEl: 0.3, head: -0.2}), joy);
  return (
    <AbsoluteFill>
      <Stage bg="#9fc8f0" shadows={false}>
        <CameraRig keys={CAM_3} />
        <Beach f={f} />
        <Scale p={[0, 0, 0]} />
        <Human outfit={SWIM} position={[0, 0.06 + joy * 0.08 * Math.abs(Math.sin(f * 0.4)), 0]} p={p} />
      </Stage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};
const lerpPose = (a: Pose, b: Pose, t: number): Pose => {
  const o: Record<string, unknown> = {};
  for (const k of Object.keys(a) as (keyof Pose)[]) {
    const va = a[k], vb = b[k];
    o[k] = Array.isArray(va) ? [lerp(va[0], (vb as [number, number])[0], t), lerp(va[1], (vb as [number, number])[1], t)] : lerp(va as number, vb as number, t);
  }
  return o as Pose;
};

// ---------- 4. 6時間：海が赤道に集まる ----------
const CAM_4: CamKey[] = [
  {f: 0, pos: [0, 3.0, 13.0], look: [0, 0.9, 0], fov: 40},
  {f: 180, pos: [1.6, 4.0, 12.0], look: [0, 0.9, 0], fov: 40, ease: LIN},
];
export const S4: React.FC = () => {
  const f = useCurrentFrame();
  const bulge = interpolate(f, [20, 140], [0, 1], {...clamp, easing: (x) => x * x * (3 - 2 * x)});
  const spin = 2.0 + f * 0.03;
  const center: V3 = [0, 0.9, 0];
  const co1 = CO('s4_ocean', 'pole'), co2 = CO('s4_ocean', 'eq');
  const pPole = project(CAM_4, f, [0, 0.9 + 2.3 * (1 - 0.05 * bulge), 0]);
  const pEq = project(CAM_4, f, [0, 0.9 - 0.3, 2.3 * (1 + 0.07 * bulge)]);
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM_4} />
        <SpaceLights />
        <SpaceBackdrop />
        <Stars />
        <group position={center} scale={[1 + 0.03 * bulge, 1 - 0.05 * bulge, 1 + 0.03 * bulge]}>
          <Earth radius={2.3} real detail={110} spin={spin} tilt={0} cloudOpacity={0.4} />
        </group>
        {/* 赤道に集まる海のふくらみ（水の帯） */}
        <mesh position={center} scale={[1, 0.35, 1]}>
          <sphereGeometry args={[2.3 * (1 + 0.07 * bulge), 64, 32]} />
          <meshStandardMaterial color="#2a7fd0" transparent opacity={0.55 * bulge} roughness={0.15} metalness={0.2} />
        </mesh>
      </Stage>
      <CalloutView x={pPole.x} y={pPole.y} tag={co1.tag} text={co1.text} from={co1.from} to={co1.to} dx={co1.dx} dy={co1.dy} />
      <CalloutView x={pEq.x} y={pEq.y} tag={co2.tag} text={co2.text} from={co2.from} to={co2.to} dx={co2.dx} dy={co2.dy} />
    </AbsoluteFill>
  );
};

// ---------- 5. 3時間：巨大な台風 ----------
const spiralTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d')!;
    g.translate(128, 128);
    for (let arm = 0; arm < 4; arm++) {
      g.beginPath();
      for (let i = 0; i < 140; i++) {
        const a = (i / 140) * Math.PI * 3.2 + (arm * Math.PI) / 2;
        const r = 6 + i * 0.85;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 14;
      g.lineCap = 'round';
      g.stroke();
    }
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, 128);
    rg.addColorStop(0, 'rgba(255,255,255,0.9)');
    rg.addColorStop(0.08, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(-128, -128, 256, 256);
    t = new THREE.CanvasTexture(cv);
    return t;
  };
})();
const STORMS: {lat: number; lon: number; s: number; dir: number}[] = [
  {lat: 22, lon: 20, s: 1.0, dir: 1},
  {lat: -24, lon: 70, s: 0.9, dir: -1},
  {lat: 28, lon: 140, s: 1.1, dir: 1},
  {lat: -20, lon: 200, s: 0.8, dir: -1},
  {lat: 25, lon: 260, s: 0.95, dir: 1},
  {lat: -26, lon: 310, s: 1.0, dir: -1},
];
const CAM_5: CamKey[] = [
  {f: 0, pos: [0, 1.6, 12.5], look: [0, 0.9, 0], fov: 40},
  {f: 180, pos: [-1.8, 2.4, 11.5], look: [0, 0.9, 0], fov: 40, ease: LIN},
];
export const S5: React.FC = () => {
  const f = useCurrentFrame();
  const grow = interpolate(f, [0, 150], [0.5, 2.0], clamp);
  const spin = 3.0 + f * 0.05;
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM_5} />
        <SpaceLights />
        <SpaceBackdrop />
        <Stars />
        <group position={[0, 0.9, 0]} rotation={[0.2, spin, 0]}>
          <Earth radius={2.3} real detail={110} spin={0} tilt={0} cloudOpacity={0.35} />
          {STORMS.map((st, i) => {
            const la = (st.lat * Math.PI) / 180, lo = (st.lon * Math.PI) / 180;
            const n = new THREE.Vector3(Math.sin(lo) * Math.cos(la), Math.sin(la), Math.cos(lo) * Math.cos(la));
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
            const pos = n.clone().multiplyScalar(2.34);
            return (
              <group key={i} position={pos.toArray() as V3} quaternion={q}>
                <mesh rotation={[0, 0, st.dir * f * 0.12]} scale={st.s * grow}>
                  <circleGeometry args={[0.7, 32]} />
                  <meshBasicMaterial map={spiralTex()} transparent opacity={0.85} depthWrite={false} />
                </mesh>
              </group>
            );
          })}
        </group>
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- 6. 3時間：ジャンプが高い ----------
const CAM_6: CamKey[] = [
  {f: 0, pos: [3.5, 1.6, 6.0], look: [0, 1.6, 0], fov: 50},
  {f: 150, pos: [2.0, 2.2, 6.6], look: [0, 2.0, 0], fov: 50, ease: LIN},
];
export const S6: React.FC = () => {
  const f = useCurrentFrame();
  const T = 80;
  const t = Math.max(0, Math.min(1, (f - 30) / T));
  const y = 4 * 1.6 * t * (1 - t);
  const air = f > 30 && f < 30 + T;
  const p: Pose = air ? pose({lSh: [0.5, 1.4], rSh: [0.5, 1.4], lHip: [0.6, 0.15], rHip: [0.3, 0.1], lKn: 0.9, rKn: 0.6, head: -0.2}) : pose({lKn: 0.35, rKn: 0.35, lHip: [0.3, 0.05], rHip: [0.3, 0.05], spine: 0.2, lSh: [-0.3, 0.2], rSh: [-0.3, 0.2]});
  return (
    <AbsoluteFill>
      <Stage bg="#9fc8f0" shadows={false}>
        <CameraRig keys={CAM_6} />
        <Beach f={f} />
        <Human outfit={SWIM} position={[0, y, 0]} rotation={[0, 0.6, 0]} p={p} />
        {/* 地面の影 */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={1 - y * 0.25}>
          <circleGeometry args={[0.35, 20]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.2} />
        </mesh>
      </Stage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 7. 約84分：赤道で重さゼロ → 宇宙へ ----------
const CAM_7: CamKey[] = [
  {f: 0, pos: [3, 1.8, 9], look: [0, 2.0, -2], fov: 55},
  {f: 180, pos: [2, 1.4, 10.5], look: [0, 5.5, -3], fov: 55, ease: LIN},
];
const FLOATERS = (() => {
  const r = mulberry32(13);
  return Array.from({length: 8}).map((_, i) => ({p: [(r() - 0.5) * 8, 0, -r() * 5] as V3, o: i, d: r() * 30, sp: 0.6 + r() * 0.5}));
})();
export const S7: React.FC = () => {
  const f = useCurrentFrame();
  const lift = interpolate(f, [20, 180], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Stage bg="#9fc8f0" shadows={false}>
        <CameraRig keys={CAM_7} />
        <Beach f={f} lift={lift * 0.6} />
        {FLOATERS.map((fl, i) => {
          const t = Math.max(0, f - 20 - fl.d);
          const up = 0.0004 * t * t * fl.sp * 30;
          return <Human key={i} outfit={OUTFITS[fl.o % OUTFITS.length]} position={[fl.p[0], fl.p[1] + up, fl.p[2]]} rotation={[t * 0.01 * fl.sp, i, t * 0.008]} p={t > 0 ? flailPose(f * 0.3, i) : pose({})} />;
        })}
        {[0, 1].map((i) => {
          const t = Math.max(0, f - 40 - i * 15);
          return (
            <group key={i} position={[i ? 2.5 : -2.5, 0.0004 * t * t * 25, -3 - i * 2]} rotation={[t * 0.006, i, t * 0.01]}>
              <Car color={i ? '#4f7fc9' : '#e2574c'} />
            </group>
          );
        })}
        {/* 海から持ち上がる水のつぶ */}
        {Array.from({length: 40}).map((_, i) => {
          const t = Math.max(0, f - 30 - (i % 10) * 6);
          return (
            <mesh key={i} position={[((i * 37) % 30) - 15, 0.0005 * t * t * 20 + (i % 5) * 0.3, -14 - (i % 7)]} scale={0.25}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial color="#6fc0e8" transparent opacity={0.8} />
            </mesh>
          );
        })}
      </Stage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 8. 北極：平和 ----------
const CAM_8: CamKey[] = [
  {f: 0, pos: [3.6, 1.9, 5.2], look: [0, 0.8, 0], fov: 50},
  {f: 180, pos: [2.2, 1.6, 4.4], look: [0, 0.8, 0], fov: 50, ease: LIN},
];
export const S8: React.FC = () => {
  const f = useCurrentFrame();
  // 北極では太陽が地平線すれすれを、ぐるぐる回る（1周 約84分）
  const a = f * 0.09;
  const sunDir: V3 = [Math.cos(a), 0.12, Math.sin(a)];
  const co = CO('s8_end', 'me');
  const pt = project(CAM_8, f, [0, 1.35, 0]);
  return (
    <AbsoluteFill>
      <Stage bg="#cfe0f0" shadows={false}>
        <CameraRig keys={CAM_8} />
        <SkyDome top="#7aa8d8" horizon="#f2e2d0" sunDir={sunDir} sunColor="#ffe0b0" sunPower={14} />
        <mesh position={[sunDir[0] * 180, sunDir[1] * 180, sunDir[2] * 180]}>
          <sphereGeometry args={[6, 16, 12]} />
          <meshBasicMaterial color="#fff2d0" />
        </mesh>
        <hemisphereLight args={['#eaf2ff', '#b0b8c8', 1.0]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[sunDir[0] * 20, 4, sunDir[2] * 20]} intensity={1.2} color="#ffe8c8" />
        <Box p={[0, -0.06, 0]} s={[80, 0.1, 80]} c="#f4f8fc" r={0.9} />
        {/* かまくら */}
        <mesh position={[-1.8, 0, -1.5]}>
          <sphereGeometry args={[1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </mesh>
        <Box p={[0.5, 0.2, 0.3]} s={[0.6, 0.4, 0.4]} c="#e8eef4" />
        {/* 目覚まし時計 */}
        <group position={[0.5, 0.46, 0.3]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.05, 20]} />
            <meshStandardMaterial color="#e2574c" />
          </mesh>
          <mesh position={[0, 0, 0.026]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.005, 20]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0, 0.03]} rotation={[0, 0, -f * 0.4]}>
            <boxGeometry args={[0.006, 0.05, 0.004]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        </group>
        <Human outfit={{shirt: '#c94f4f', pants: '#3b3b44', skin: '#e9b99a', hair: '#2b211c'}} position={[0, -0.45, -0.2]} rotation={[0, 0.3, 0]} p={pose({lHip: [1.5, 0.15], rHip: [1.5, 0.15], lKn: 1.5, rKn: 1.5, spine: 0.35, head: 0.5, lSh: [0.6, 0.1], rSh: [0.6, 0.1], lEl: 1.0, rEl: 1.0})} />
      </Stage>
      <CalloutView x={pt.x} y={pt.y} tag={co.tag} text={co.text} from={co.from} to={co.to} dx={co.dx} dy={co.dy} />
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};
