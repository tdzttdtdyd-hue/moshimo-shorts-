import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3, lerp3} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {project} from '../lib/project';
import {Human, IDLE, Outfit, Pose, pose} from '../three/Human';
import {Earth, SpaceBackdrop, Stars} from '../three/Earth';
import {CalloutView, Vignette, emWidth} from './Overlay';
import {BATH_CYCLE} from './script';
import {C, SAFE, SANS} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const LIN = (t: number) => t;
const sm = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPose = (a: Pose, b: Pose, t: number): Pose => {
  const o: Record<string, unknown> = {};
  for (const k of Object.keys(a) as (keyof Pose)[]) {
    const va = a[k], vb = b[k];
    o[k] = Array.isArray(va) ? [lerp(va[0], (vb as [number, number])[0], t), lerp(va[1], (vb as [number, number])[1], t)] : lerp(va as number, vb as number, t);
  }
  return o as Pose;
};
const mixColor = (a: string, b: string, t: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t))).getHexString();

// ---------- 主人公（顔なし・色黒・筋肉質・タンクトップ） ----------
const HORI: Outfit = {shirt: '#1c1e23', pants: '#2b2f38', skin: '#5e3520', hair: '#121010', shoes: '#18181c'};
const Hori: React.FC<React.ComponentProps<typeof Human>> = (props) => <Human outfit={HORI} muscle={1.38} sleeveless {...props} />;

const Mat: React.FC<{c: string; r?: number; e?: string; ei?: number; m?: number}> = ({c, r = 0.75, e, ei = 0, m = 0}) => (
  <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e ?? '#000'} emissiveIntensity={ei} />
);
const Box: React.FC<{p: V3; s: V3; c: string; r?: number; e?: string; ei?: number; rot?: V3; m?: number}> = ({p, s, c, r, e, ei, rot = [0, 0, 0], m}) => (
  <mesh position={p} rotation={rot}>
    <boxGeometry args={s} />
    <Mat c={c} r={r} e={e} ei={ei} m={m} />
  </mesh>
);

// アイコス（細長い白い本体）
const Iqos: React.FC<{p: V3; rot?: V3}> = ({p, rot = [0, 0, 0]}) => (
  <group position={p} rotation={rot}>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <capsuleGeometry args={[0.014, 0.1, 4, 12]} />
      <Mat c="#e9e6df" r={0.35} />
    </mesh>
    <mesh position={[0.072, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.006, 0.006, 0.03, 10]} />
      <Mat c="#c7a26b" r={0.5} />
    </mesh>
  </group>
);
// ダンベル（握りは手首から少し先、前腕と直交）
const Dumbbell: React.FC = () => (
  <group position={[0, -0.06, 0.01]}>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.014, 0.014, 0.26, 10]} />
      <Mat c="#8b9098" r={0.35} m={0.6} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.06, 6]} />
        <Mat c="#26282d" r={0.6} />
      </mesh>
    ))}
  </group>
);


// 手と口の位置を Human と同じ関節の並びで計算（スマホを手から口へ渡すため）
const MX = 1 + (1.38 - 1) * 0.6;
const chain = (pos: V3, rotY: number, p: Pose, side = 1) => {
  const root = new THREE.Object3D();
  root.position.set(...pos);
  root.rotation.set(0, rotY, 0);
  const upper = new THREE.Object3D();
  upper.position.set(0, 0.98, 0);
  upper.rotation.set(p.spine, p.twist, 0);
  root.add(upper);
  const off = new THREE.Object3D();
  off.position.set(0, -0.98, 0);
  upper.add(off);
  const sh = new THREE.Object3D();
  const SH = side > 0 ? p.rSh : p.lSh;
  sh.position.set(side * 0.215 * MX, 1.47, 0);
  sh.rotation.set(-SH[0], 0, side * SH[1]);
  off.add(sh);
  const el = new THREE.Object3D();
  el.position.set(0, -0.29, 0);
  el.rotation.set(-(side > 0 ? p.rEl : p.lEl), 0, 0);
  sh.add(el);
  const hand = new THREE.Object3D();
  hand.position.set(0, -0.3, 0);
  el.add(hand);
  const head = new THREE.Object3D();
  head.position.set(0, 1.53, 0);
  head.rotation.set(p.head, 0, 0);
  off.add(head);
  const mouth = new THREE.Object3D();
  mouth.position.set(0, 0.15, 0.1);
  head.add(mouth);
  const fwd = new THREE.Object3D();
  fwd.position.set(0, 0.0, 0.5);
  head.add(fwd);
  root.updateMatrixWorld(true);
  const w = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
  return {hand: w(hand), mouth: w(mouth), face: w(fwd)};
};
// 手に持ったスマホ。k=0 は顔の前で画面を見る向き、k=1 は端を唇に当てる
const HeldPhone: React.FC<{pos: V3; rotY: number; p: Pose; k: number; glow?: number}> = ({pos, rotY, p, k, glow = 1}) => {
  const c = chain(pos, rotY, p);
  const look = c.hand.clone().add(new THREE.Vector3(0, 0.35, 0)).lerp(c.mouth, k);
  const d = look.clone().sub(c.hand).normalize();
  const dist = c.mouth.distanceTo(c.hand);
  // 口に当てるときは、手（下の端）から唇（上の端）までをスマホでつなぐ
  const len = lerp(0.155, Math.min(0.24, Math.max(0.155, dist)), k);
  const center = c.hand.clone().add(d.clone().multiplyScalar(lerp(0.06, dist - len / 2, k)));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  // 画面を顔（またはカメラ側）へ向ける
  const e = new THREE.Euler().setFromQuaternion(q);
  return (
    <group position={center.toArray() as V3} rotation={[e.x, e.y, e.z]} scale={[1, len / 0.155, 1]}>
      <Box p={[0, 0, 0]} s={[0.075, 0.155, 0.01]} c="#16171b" r={0.3} />
      {[-1, 1].map((sd) => (
        <Box key={sd} p={[0, 0, sd * 0.0056]} s={[0.066, 0.14, 0.002]} c="#9fd0ff" e="#7fc0ff" ei={1.6 * glow} r={0.2} />
      ))}
    </group>
  );
};

// ---------- ベッド（掛け布団は wake で飛ぶ） ----------
const Bed: React.FC<{p?: V3; wake?: number; color?: string}> = ({p = [0, 0, 0], wake = 0, color = '#5d7088'}) => {
  const fly = sm(wake);
  return (
    <group position={p}>
      <Box p={[0, 0.17, 0]} s={[1.3, 0.34, 2.2]} c="#6b4f3a" />
      <Box p={[0, 0.5, -1.06]} s={[1.3, 0.7, 0.08]} c="#5e4532" />
      <Box p={[0, 0.44, 0]} s={[1.2, 0.2, 2.1]} c="#e8e6e1" r={0.9} />
      <Box p={[0, 0.6, -0.8]} s={[0.7, 0.12, 0.36]} c="#f2f1ed" r={0.95} />
      <group position={[lerp(0, -1.0, fly), lerp(0.66, 0.08, fly) + Math.sin(fly * Math.PI) * 0.6, lerp(0.35, 0.6, fly)]} rotation={[0, fly * 0.6, lerp(0, 1.3, fly)]}>
        <Box p={[0, 0, 0]} s={[1.26, 0.08, 1.3]} c={color} r={0.95} />
      </group>
    </group>
  );
};
// 寝ている → 飛び起きて床に立つ（u：0→1）
const sleeperTransform = (u: number, bed: V3, stand: V3, standRotY = 0) => {
  const e = sm(u);
  const pos: V3 = [lerp(bed[0], stand[0], e), lerp(bed[1] + 0.6, stand[1], e) + Math.sin(e * Math.PI) * 0.55, lerp(bed[2] + 0.82, stand[2], e)];
  const rot: V3 = [lerp(-Math.PI / 2, 0, e), lerp(0, standRotY, e), 0];
  const land = Math.max(0, Math.min(1, (u - 0.85) / 0.15));
  const crouch = Math.sin(land * Math.PI) * 0.5;
  const p = pose({lKn: 0.05 + crouch, rKn: 0.05 + crouch, lHip: [crouch * 0.6, 0.05], rHip: [crouch * 0.6, 0.05], spine: crouch * 0.3, lSh: [0.2 + 0.4 * Math.sin(e * Math.PI), 0.35], rSh: [0.2 + 0.4 * Math.sin(e * Math.PI), 0.35], lEl: 0.4, rEl: 0.4});
  return {pos, rot, p};
};

// ---------- 寝室（夜） ----------
const NightWindow: React.FC<{p: V3; w?: number; h?: number; seed?: number}> = ({p, w = 1.2, h = 1.1, seed = 3}) => {
  const dots = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({length: 40}).map(() => ({x: (r() - 0.5) * w * 0.9, y: -h / 2 + r() * h * 0.45, c: r() < 0.7 ? '#ffd58a' : '#bfe0ff'}));
  }, [w, h, seed]);
  return (
    <group position={p}>
      <Box p={[0, 0, -0.02]} s={[w + 0.12, h + 0.12, 0.05]} c="#d9d4cb" />
      <Box p={[0, 0, 0.005]} s={[w, h, 0.01]} c="#13203c" e="#16264a" ei={0.6} r={0.2} />
      {dots.map((d, i) => (
        <Box key={i} p={[d.x, d.y, 0.015]} s={[0.025, 0.025, 0.005]} c={d.c} e={d.c} ei={1.5} />
      ))}
      <Box p={[0, 0, 0.02]} s={[0.03, h, 0.02]} c="#d9d4cb" />
    </group>
  );
};
const Bedroom: React.FC<{lamp: number; bright?: boolean}> = ({lamp, bright}) => (
  <>
    {bright ? (
      <>
        <hemisphereLight args={['#fff6e8', '#8a7a68', 1.3]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 3.5, 6]} intensity={1.4} color="#fff4e6" />
        <pointLight position={[0, 3.0, 0.5]} intensity={8} distance={9} decay={1.4} color="#fff1dc" />
      </>
    ) : (
      <>
        <hemisphereLight args={['#6f86b8', '#1a1a22', 0.35 + lamp * 0.25]} />
        <ambientLight intensity={0.08} />
        <directionalLight position={[2, 4, -3]} intensity={0.7} color="#9db8ff" />
        <directionalLight position={[3, 3.5, 6]} intensity={0.9 + lamp * 0.5} color="#b4c6ff" />
      </>
    )}
    <pointLight position={[-1.0, 1.1, -0.9]} intensity={6 * lamp} distance={7} decay={1.6} color="#ffc98a" />
    <Box p={[0, -0.05, 0]} s={[9, 0.1, 9]} c={bright ? '#a8825f' : '#5b4636'} />
    <Box p={[0, 1.6, -1.7]} s={[9, 3.4, 0.1]} c={bright ? '#ece4d6' : '#3d4558'} />
    <Box p={[-2.4, 1.6, 0]} s={[0.1, 3.4, 9]} c={bright ? '#e2d8c6' : '#353c4d'} />
    <NightWindow p={[1.15, 1.7, -1.63]} />
    {/* ナイトテーブルとランプ */}
    <Box p={[-1.0, 0.27, -0.9]} s={[0.5, 0.54, 0.45]} c="#6b4f3a" />
    <mesh position={[-1.0, 0.75, -0.9]}>
      <cylinderGeometry args={[0.12, 0.17, 0.2, 16, 1, true]} />
      <meshStandardMaterial color="#f3e3c4" emissive="#ffc98a" emissiveIntensity={1.2 * lamp} side={THREE.DoubleSide} />
    </mesh>
    <Box p={[-1.0, 0.6, -0.9]} s={[0.03, 0.14, 0.03]} c="#3a3a3a" />
    {/* ラグ */}
    <Box p={[0.9, 0.005, 0.6]} s={[1.8, 0.01, 1.4]} c="#7a6a8f" r={1} />
  </>
);

// ---------- 1. 30分で飛び起きる ----------
const WAKE1 = 98;
const CAM_H1: CamKey[] = [
  {f: 0, pos: [2.0, 2.0, 2.2], look: [0, 0.55, -0.3], fov: 50},
  {f: 98, pos: [1.6, 1.75, 1.9], look: [0, 0.6, -0.3], fov: 50, ease: LIN},
  {f: 150, pos: [2.9, 1.6, 4.2], look: [0.7, 1.0, 0.4], fov: 50},
];
export const H1: React.FC = () => {
  const f = useCurrentFrame();
  const u = interpolate(f, [WAKE1, WAKE1 + 16], [0, 1], clamp);
  const t = sleeperTransform(u, [0, 0.06, -0.15], [1.0, 0, 0.75], -0.35);
  const breathe = u === 0 ? Math.sin(f * 0.12) * 0.01 : 0;
  const lamp = interpolate(f, [WAKE1 + 2, WAKE1 + 8], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Stage bg="#0b0f1c" shadows={false}>
        <CameraRig keys={CAM_H1} shakes={[{from: WAKE1 + 14, dur: 10, amp: 0.05}]} />
        <Bedroom lamp={lamp} />
        <Bed p={[0, 0, -0.15]} wake={u * 1.4} />
        <Hori position={[t.pos[0], t.pos[1] + breathe, t.pos[2]]} rotation={t.rot} p={t.p} />
      </Stage>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

// ---------- 団地の断面（全員が同じ体・同じ動き） ----------
const COLS = 4, FLOORS = 5, UW = 3.2, UH = 2.8, UD = 3;
const unitOrigin = (c: number, fl: number): V3 => [(c - (COLS - 1) / 2) * UW, fl * UH, 0];
type Mode = 'wake' | 'phone';
const Building: React.FC<{mode: Mode; f: number; wakeAt?: number}> = ({mode, f, wakeAt = 30}) => {
  const u = mode === 'wake' ? interpolate(f, [wakeAt, wakeAt + 16], [0, 1], clamp) : 1;
  const light = mode === 'wake' ? interpolate(f, [wakeAt + 2, wakeAt + 8], [0, 1], clamp) : 0;
  const units = [] as React.ReactNode[];
  for (let fl = 0; fl < FLOORS; fl++)
    for (let c = 0; c < COLS; c++) {
      const o = unitOrigin(c, fl);
      const k = `${c}-${fl}`;
      const wall = mode === 'wake' ? mixColor('#283044', '#e8c690', light) : '#ece0c8';
      const ei = mode === 'wake' ? 0.5 * light : 0.45;
      let man: React.ReactNode;
      if (mode === 'wake') {
        const t = sleeperTransform(u, [-0.6, 0.06, -0.3], [0.65, 0, 0.6], -0.15);
        man = <Hori position={t.pos} rotation={t.rot} p={t.p} />;
      } else {
        const pp = phonePose(1, f + c * 3 + fl * 5);
        man = (
          <>
            <Hori position={[0.45, 0, 0.4]} rotation={[0, -0.25, 0]} p={pp} />
            <HeldPhone pos={[0.45, 0, 0.4]} rotY={-0.25} p={pp} k={1} />
          </>
        );
      }
      units.push(
        <group key={k} position={o}>
          <Box p={[0, 0.02, 0]} s={[UW, 0.16, UD]} c="#8d8a84" />
          <Box p={[0, UH / 2, -UD / 2 + 0.05]} s={[UW - 0.1, UH, 0.1]} c={wall} e={'#ffcf8a'} ei={ei} />
          <Box p={[-UW / 2, UH / 2, 0]} s={[0.14, UH, UD]} c="#9a968f" />
          <group position={[-0.6, 0.1, -0.3]}>
            <Bed wake={mode === 'wake' ? u * 1.4 : 2} color={['#5d7088', '#7a5d6a', '#5d7a68', '#7a7058'][(c + fl) % 4]} />
          </group>
          <group position={[0, 0.1, 0]}>{man}</group>
          {mode === 'phone' && <pointLight position={[0.3, 2.3, 0.9]} intensity={3} distance={3.5} color="#fff1dc" />}
        </group>,
      );
    }
  const W = COLS * UW, H = FLOORS * UH;
  return (
    <group position={[0, -H / 2, 0]}>
      {units}
      <Box p={[W / 2, H / 2, 0]} s={[0.14, H, UD]} c="#9a968f" />
      <Box p={[0, H + 0.2, 0]} s={[W + 0.4, 0.4, UD + 0.2]} c="#8d8a84" />
      <Box p={[0, -0.3, 0]} s={[W + 0.4, 0.6, UD + 0.2]} c="#77746e" />
    </group>
  );
};
// 背景のビル群（夜。窓明かり）
const CityBackdrop: React.FC<{lit: number; seed?: number}> = ({lit, seed = 8}) => {
  const items = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({length: 26}).map((_, i) => ({x: (i - 13) * 4.2 + (r() - 0.5) * 2, z: -18 - r() * 14, h: 8 + r() * 22, w: 2.5 + r() * 2.5}));
  }, [seed]);
  return (
    <>
      {items.map((b, i) => (
        <group key={i} position={[b.x, -7 + b.h / 2, b.z]}>
          <Box p={[0, 0, 0]} s={[b.w, b.h, 2.5]} c="#141a2a" />
          {Array.from({length: Math.floor(b.h / 1.6)}).map((_, j) => (
            <Box key={j} p={[0, -b.h / 2 + 1 + j * 1.6, 1.26]} s={[b.w * 0.8, 0.35, 0.02]} c="#2a3550" e="#ffcf8a" ei={0.15 + 0.9 * lit * (((i * 7 + j * 3) % 5) > 0 ? 1 : 0.2)} />
          ))}
        </group>
      ))}
    </>
  );
};
const NightSky: React.FC = () => (
  <>
    <mesh>
      <sphereGeometry args={[120, 24, 16]} />
      <meshBasicMaterial color="#0b1228" side={THREE.BackSide} />
    </mesh>
    <Stars count={500} radius={110} />
  </>
);

// ---------- 2. 全人類が同時に飛び起きる ----------
const CAM_H2: CamKey[] = [
  {f: 0, pos: [-0.9, 0.8, 5.2], look: [-1.6, -0.2, -0.3], fov: 50},
  {f: 40, pos: [-0.9, 0.8, 5.6], look: [-1.6, -0.2, -0.3], fov: 50, ease: LIN},
  {f: 140, pos: [1.5, 1.5, 27], look: [0, 0.3, 0], fov: 50},
  {f: 165, pos: [1.8, 1.6, 28.5], look: [0, 0.3, 0], fov: 50, ease: LIN},
];
export const H2: React.FC = () => {
  const f = useCurrentFrame();
  const lit = interpolate(f, [32, 60], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Stage bg="#0b1228" shadows={false}>
        <CameraRig keys={CAM_H2} shakes={[{from: 44, dur: 10, amp: 0.06}]} />
        <hemisphereLight args={['#8ea4d8', '#202028', 0.7]} />
        <directionalLight position={[4, 8, 10]} intensity={1.6} color="#c9d4ff" />
        <ambientLight intensity={0.3} />
        <NightSky />
        <CityBackdrop lit={lit} />
        <Building mode="wake" f={f} />
      </Stage>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

// ---------- 3. 数時間おきのお風呂（1日早送り） ----------
const SKY = ['#0c1430', '#f0a066', '#9ccaf2', '#8cc4f0', '#ee8a50', '#141c3c'];
const SUNI = [0.15, 0.8, 1.4, 1.5, 0.9, 0.2];
const tileTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#e4ebef';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#b9c4cb';
    g.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 256);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i);
      g.lineTo(256, i);
      g.stroke();
    }
    t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 3);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();
const TUB: V3 = [-0.1, 0, -0.75];
const STAND: Pose = pose({lSh: [0.05, 0.25], rSh: [0.05, 0.25], lEl: 0.3, rEl: 0.3});
const SOAK: Pose = pose({spine: -0.35, head: -0.25, lHip: [1.45, 0.1], rHip: [1.45, 0.1], lKn: 0.25, rKn: 0.15, lSh: [0.15, 0.85], rSh: [0.15, 0.85], lEl: 0.5, rEl: 0.5});
export const H3: React.FC = () => {
  const f = useCurrentFrame();
  const cyc = f / BATH_CYCLE;
  const ci = Math.min(5, Math.floor(cyc));
  const ct = f - ci * BATH_CYCLE;
  // 空の色は時刻にあわせて連続的に変える
  const skyT = Math.min(5, Math.max(0, cyc - 0.5));
  const a = Math.floor(skyT), b = Math.min(5, a + 1);
  const sky = mixColor(SKY[a], SKY[b], skyT - a);
  const sun = lerp(SUNI[a], SUNI[b], skyT - a);
  // 立つ → 湯船へ → つかる → 出る
  const into = sm((ct - 4) / 10);
  const out = sm((ct - 32) / 8);
  const k = ci === 5 ? into : into * (1 - out);
  const standPos: V3 = [0.55, 0, -0.05];
  const soakPos: V3 = [TUB[0] - 0.55, -0.66, TUB[2]];
  const step = Math.sin(Math.min(1, Math.max(0, (ct - 4) / 10)) * Math.PI) * 0.35 + (ci === 5 ? 0 : Math.sin(Math.min(1, Math.max(0, (ct - 32) / 8)) * Math.PI) * 0.35);
  const pos = lerp3(standPos, soakPos, k);
  pos[1] += step;
  const rotY = lerp(-0.3, Math.PI / 2, k);
  const p = lerpPose(STAND, SOAK, k);
  const cam: CamKey[] = [
    {f: 0, pos: [1.1, 2.1, 3.6], look: [-0.1, 0.75, -0.6], fov: 50},
    {f: 240, pos: [0.1, 1.9, 3.4], look: [-0.2, 0.75, -0.6], fov: 50, ease: LIN},
  ];
  const steam = Array.from({length: 16}).map((_, i) => {
    const ph = ((f * 0.9 + i * 13) % 60) / 60;
    return {x: TUB[0] + Math.sin(i * 2.3) * 0.7, y: 0.55 + ph * 1.3, z: TUB[2] + Math.cos(i * 1.7) * 0.25, o: Math.sin(ph * Math.PI) * 0.09, s: 0.08 + ph * 0.14};
  });
  return (
    <AbsoluteFill>
      <Stage bg="#202830" shadows={false}>
        <CameraRig keys={cam} />
        <hemisphereLight args={['#ffffff', '#8a8f96', 0.45 + sun * 0.25]} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[1.5, 3, -2]} intensity={0.6 + sun} color={mixColor('#9db8ff', '#fff1dc', Math.min(1, sun))} />
        <pointLight position={[0, 2.6, 0.5]} intensity={3} distance={6} color="#fff4e0" />
        <directionalLight position={[1, 2.5, 5]} intensity={0.9} color="#ffffff" />
        {/* 壁と床（タイル） */}
        <mesh position={[0, 1.5, -1.3]}>
          <planeGeometry args={[6, 3.2]} />
          <meshStandardMaterial map={tileTex()} roughness={0.4} />
        </mesh>
        <mesh position={[-2.0, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[6, 3.2]} />
          <meshStandardMaterial map={tileTex()} roughness={0.4} color="#dfe6ea" />
        </mesh>
        <Box p={[0, -0.05, 0]} s={[6, 0.1, 6]} c="#aab4ba" r={0.5} />
        {/* 窓（時刻で空の色が変わる） */}
        <group position={[0.9, 1.75, -1.27]}>
          <Box p={[0, 0, 0]} s={[1.0, 0.8, 0.04]} c="#e9ecee" />
          <Box p={[0, 0, 0.022]} s={[0.88, 0.68, 0.01]} c={sky} e={sky} ei={0.9} r={0.2} />
          <Box p={[0, 0, 0.03]} s={[0.03, 0.68, 0.01]} c="#e9ecee" />
        </group>
        {/* 浴槽 */}
        <group position={TUB}>
          <Box p={[0, 0.06, 0]} s={[1.9, 0.12, 0.9]} c="#f4f5f6" r={0.3} />
          <Box p={[0, 0.33, 0.42]} s={[1.9, 0.66, 0.08]} c="#f4f5f6" r={0.3} />
          <Box p={[0, 0.33, -0.42]} s={[1.9, 0.66, 0.08]} c="#f4f5f6" r={0.3} />
          <Box p={[-0.91, 0.33, 0]} s={[0.08, 0.66, 0.9]} c="#f4f5f6" r={0.3} />
          <Box p={[0.91, 0.33, 0]} s={[0.08, 0.66, 0.9]} c="#f4f5f6" r={0.3} />
          <mesh position={[0, 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.76, 0.78]} />
            <meshStandardMaterial color="#6fb6d8" transparent opacity={0.72} roughness={0.1} />
          </mesh>
        </group>
        {/* タオル掛け */}
        <Box p={[1.6, 1.25, -1.25]} s={[0.6, 0.03, 0.03]} c="#b0b4b8" m={0.6} r={0.3} />
        <Box p={[1.6, 1.0, -1.23]} s={[0.45, 0.5, 0.03]} c="#f0d9a8" />
        {steam.map((s, i) => (
          <mesh key={i} position={[s.x, s.y, s.z]} scale={s.s}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={s.o * (0.4 + 0.6 * k)} depthWrite={false} />
          </mesh>
        ))}
        <Hori position={pos} rotation={[0, rotY, 0]} p={p} />
      </Stage>
      <Vignette strength={0.4} />
      <BathBadge n={ci + 1} pop={ct} />
    </AbsoluteFill>
  );
};
// 「入浴 n回目」バッジ（時刻の下）
const BathBadge: React.FC<{n: number; pop: number}> = ({n, pop}) => {
  const s = 1 + 0.18 * Math.max(0, 1 - pop / 8);
  return (
    <div data-telop="ff" style={{position: 'absolute', left: 92, top: 522, transform: `scale(${s})`, transformOrigin: 'left center', background: 'rgba(70, 140, 200, 0.9)', borderRadius: 40, padding: '10px 30px 12px 26px', fontFamily: SANS, fontWeight: 900, fontSize: 38, color: '#fff', boxShadow: '0 6px 20px rgba(0,0,0,0.35)', whiteSpace: 'pre'}}>
      入浴 {n}回目
    </div>
  );
};

// ---------- 4. 水が足りない（地球） ----------
const CAM_H4: CamKey[] = [
  {f: 0, pos: [0, 0.6, 9.5], look: [0, 0.9, 0], fov: 40},
  {f: 195, pos: [-1.6, 1.0, 8.4], look: [0, 0.9, 0], fov: 40, ease: LIN},
];
export const H4: React.FC = () => {
  const f = useCurrentFrame();
  const level = interpolate(f, [20, 110, 120, 180], [1, 0.55, 0.55, 0.04], clamp);
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM_H4} />
        <ambientLight intensity={0.12} />
        <hemisphereLight args={['#9fc8ff', '#0a1030', 0.35]} />
        <directionalLight position={[8, 4, 10]} intensity={3.0} color="#fff4e2" />
        <SpaceBackdrop />
        <Stars />
        <Earth radius={2.3} real detail={110} spin={1.9 + f * 0.006} tilt={0.35} cloudOpacity={0.5} position={[0, 1.6, 0]} />
      </Stage>
      <WaterGauge level={level} warn={f > 120} f={f} />
    </AbsoluteFill>
  );
};
const WaterGauge: React.FC<{level: number; warn: boolean; f: number}> = ({level, warn, f}) => {
  const blink = warn ? 0.6 + 0.4 * Math.abs(Math.sin(f * 0.25)) : 1;
  return (
    <div style={{position: 'absolute', left: 92, top: 320, width: 470}}>
      <div data-telop="gauge" style={{display: 'table', fontFamily: SANS, fontWeight: 700, fontSize: 32, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.08em', textShadow: '0 2px 8px rgba(0,0,0,0.6)'}}>
        人類が使える水
      </div>
      <div style={{marginTop: 10, height: 34, borderRadius: 17, border: '2px solid rgba(255,255,255,0.6)', background: 'rgba(10,14,24,0.6)', overflow: 'hidden'}}>
        <div style={{width: `${level * 100}%`, height: '100%', background: warn ? C.coral : '#5fb0e8', opacity: blink}} />
      </div>
    </div>
  );
};

// ---------- 5. アイコスとスマホを間違える ----------
const phonePose = (k: number, f: number): Pose =>
  lerpPose(pose({rSh: [0.75, 0.05], rEl: 1.2, head: 0.35, lSh: [0.05, 0.12], lEl: 0.2}), pose({rSh: [1.3, -0.45], rEl: 2.55, head: -0.02 + 0.02 * Math.sin(f * 0.1), lSh: [0.05, 0.12], lEl: 0.2}), k);
const CAM_H5A: CamKey[] = [
  {f: 0, pos: [0.9, 1.6, 2.9], look: [-0.1, 1.2, 0], fov: 46},
  {f: 100, pos: [0.6, 1.68, 2.3], look: [-0.05, 1.35, 0], fov: 46, ease: LIN},
];
const CAM_H5B: CamKey[] = [
  {f: 100, pos: [-0.2, 0.9, 7], look: [-0.5, 0.1, -0.3], fov: 50},
  {f: 195, pos: [1.2, 1.2, 25], look: [0, 0.3, 0], fov: 50},
];
const IQOS_AT: V3 = [-0.75, 0.6, -0.05];
export const H5: React.FC = () => {
  const f = useCurrentFrame();
  if (f < 100) {
    const k = sm((f - 26) / 22);
    const co = project(CAM_H5A, f, IQOS_AT);
    return (
      <AbsoluteFill>
        <Stage bg="#e9e2d4" shadows={false}>
          <CameraRig keys={CAM_H5A} />
          <Bedroom lamp={1} bright />
          <pointLight position={[0.35, 1.5, 0.5]} intensity={1.2} distance={2} color="#8fc3ff" />
          <Bed p={[0.9, 0, -0.6]} wake={2} />
          <Box p={[-0.75, 0.27, -0.05]} s={[0.5, 0.54, 0.45]} c="#6b4f3a" />
          <Iqos p={[IQOS_AT[0], 0.557, IQOS_AT[2]]} rot={[0, 0.5, 0]} />
          <Hori position={[0.1, 0, 0]} rotation={[0, -0.2, 0]} p={phonePose(k, f)} />
          <HeldPhone pos={[0.1, 0, 0]} rotY={-0.2} p={phonePose(k, f)} k={k} />
        </Stage>
        <Vignette strength={0.3} />
        <CalloutView x={co.x} y={co.y} tag="アイコス" text="こっち" from={56} to={98} dy={-380} dx={60} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <Stage bg="#0b1228" shadows={false}>
        <CameraRig keys={CAM_H5B} />
        <hemisphereLight args={['#fff2dc', '#3a3530', 0.8]} />
        <directionalLight position={[4, 8, 10]} intensity={1.4} color="#fff0dc" />
        <ambientLight intensity={0.3} />
        <NightSky />
        <CityBackdrop lit={1} />
        <Building mode="phone" f={f} />
      </Stage>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

// ---------- 6. 深夜3時のジム ----------
const RAGE = 92;
const GYM_MEN: {x: number; z: number; ry: number; ph: number}[] = [
  {x: -1.6, z: -0.4, ry: 0.25, ph: 0},
  {x: -0.5, z: 0.2, ry: 0.08, ph: 14},
  {x: 0.6, z: -0.2, ry: -0.05, ph: 27},
  {x: 1.7, z: 0.3, ry: -0.22, ph: 40},
];
const CAM_H6: CamKey[] = [
  {f: 0, pos: [0.4, 2.0, 5.8], look: [0, 1.65, 0], fov: 50},
  {f: RAGE, pos: [0.1, 1.85, 5.1], look: [0, 1.7, 0], fov: 50, ease: LIN},
  {f: RAGE + 16, pos: [0.0, 1.8, 5.6], look: [0, 1.25, 0.5], fov: 50},
  {f: 195, pos: [-0.3, 1.7, 5.2], look: [0, 1.3, 0.5], fov: 50, ease: LIN},
];
const curlPose = (t: number): Pose => {
  const a = (Math.sin(t * 0.16) + 1) / 2, b = (Math.sin(t * 0.16 + Math.PI) + 1) / 2;
  return pose({lSh: [0.1, 0.18], rSh: [0.1, 0.18], lEl: 0.25 + 1.9 * a, rEl: 0.25 + 1.9 * b, head: 0.1});
};
// ダンベルを振りかぶって → 投げる → 怒る
const RELEASE = RAGE + 11;
const windup = pose({spine: -0.2, head: -0.15, lSh: [2.9, 0.15], rSh: [2.9, 0.15], lEl: 1.0, rEl: 1.0, lKn: 0.2, rKn: 0.2, lHip: [0.1, 0.1], rHip: [0.1, 0.1]});
const thrown = pose({spine: 0.4, head: 0.15, lSh: [0.55, 0.05], rSh: [0.55, 0.05], lEl: 0.15, rEl: 0.15, lKn: 0.35, rKn: 0.1, lHip: [0.35, 0.1], rHip: [-0.1, 0.1]});
const gymPose = (f: number, ph: number, i: number): Pose => {
  if (f < RAGE) return curlPose(f + ph);
  if (f < RAGE + 7) return lerpPose(curlPose(RAGE + ph), windup, sm((f - RAGE) / 7));
  if (f < RELEASE + 1) return lerpPose(windup, thrown, sm((f - RAGE - 7) / 5));
  return lerpPose(thrown, ragePose(f + i * 7), sm((f - RELEASE - 4) / 8));
};
// 投げたダンベルの軌道（決まった手順で毎フレーム計算し直す）
const flight = (start: THREE.Vector3, dir: THREE.Vector3, n: number) => {
  const p = start.clone();
  const v = dir.clone();
  let landed = -1;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 4; k++) {
      const dt = 1 / 120;
      p.addScaledVector(v, dt);
      v.y -= 9.8 * dt;
      if (p.y < 0.06) {
        p.y = 0.06;
        if (landed < 0) landed = i;
        v.y = Math.abs(v.y) > 0.6 ? -v.y * 0.25 : 0;
        v.x *= 0.55;
        v.z *= 0.55;
      }
    }
  }
  return {p, landed};
};
const FlyingDumbbell: React.FC<{m: (typeof GYM_MEN)[number]; side: number; f: number; i: number}> = ({m, side, f, i}) => {
  const c = chain([m.x, 0, m.z], m.ry, gymPose(RELEASE, m.ph, i), side);
  const fwd = new THREE.Vector3(side * 0.35 + Math.sin(m.ry) * 1, 0, Math.cos(m.ry)).normalize();
  const dir = fwd.multiplyScalar(1.7 + 0.25 * ((i + side + 2) % 2)).add(new THREE.Vector3(0, 2.6, 0));
  const n = f - RELEASE;
  const {p, landed} = flight(c.hand, dir, n);
  const air = landed < 0 ? n : landed;
  const wob = 0.9 * Math.sin(air * 0.8 + i) * Math.max(0, 1 - air / 14) * (landed < 0 ? 1 : Math.max(0, 1 - (n - landed) / 6));
  return (
    <group position={p.toArray() as V3} rotation={[0, air * 0.35 * side + m.ry, wob]}>
      <group position={[0, 0.06, -0.01]}>
        <Dumbbell />
      </group>
    </group>
  );
};
const ragePose = (t: number): Pose =>
  pose({spine: -0.18, head: -0.25, lSh: [0.35, 2.5 + 0.12 * Math.sin(t * 1.3)], rSh: [0.35, 2.5 + 0.12 * Math.cos(t * 1.5)], lEl: 1.1 + 0.2 * Math.sin(t * 1.7), rEl: 1.1 + 0.2 * Math.cos(t * 1.9), lHip: [0.1, 0.22], rHip: [0.1, 0.22], lKn: 0.25, rKn: 0.25});
export const H6: React.FC = () => {
  const f = useCurrentFrame();
  const r = sm((f - RELEASE) / 7);
  return (
    <AbsoluteFill>
      <Stage bg="#15181e" shadows={false}>
        <CameraRig keys={CAM_H6} shakes={[{from: RAGE, dur: 12, amp: 0.03}, {from: RELEASE + 24, dur: 14, amp: 0.07}]} />
        <hemisphereLight args={['#f2f6ff', '#3a3d44', 0.9]} />
        <ambientLight intensity={0.15} />
        <directionalLight position={[2, 6, 4]} intensity={1.2} color="#ffffff" />
        <directionalLight position={[0, 2, 8]} intensity={1.0} color="#ffffff" />
        <pointLight position={[0, 2.4, 1.5]} intensity={2 + 4 * r} distance={8} color={mixColor('#ffffff', '#ff7a6a', r)} />
        <Box p={[0, -0.05, 0]} s={[10, 0.1, 10]} c="#2c2f35" r={0.9} />
        {/* 鏡張りの壁と天井の照明 */}
        <Box p={[0, 1.6, -1.6]} s={[10, 3.4, 0.1]} c="#59636e" m={0.5} r={0.25} />
        {[-3, -1, 1, 3].map((x) => (
          <Box key={x} p={[x, 1.6, -1.53]} s={[0.06, 3.2, 0.04]} c="#2a2d33" />
        ))}
        {[-2, 0, 2].map((x) => (
          <Box key={x} p={[x, 3.2, 0]} s={[1.4, 0.05, 0.25]} c="#ffffff" e="#ffffff" ei={1.2} />
        ))}
        {/* ダンベルラック */}
        <Box p={[0, 0.35, -1.25]} s={[4.5, 0.08, 0.4]} c="#3a3d44" />
        {Array.from({length: 10}).map((_, i) => (
          <group key={i} position={[-2 + i * 0.44, 0.45, -1.25]}>
            <Dumbbell />
          </group>
        ))}
        <Box p={[2.9, 0.25, 0.6]} s={[0.4, 0.5, 1.3]} c="#3c3f47" />
        <Box p={[-3.0, 0.75, 0.0]} s={[0.9, 1.5, 0.9]} c="#4a4f58" />
        {GYM_MEN.map((m, i) => (
          <React.Fragment key={i}>
            <Hori position={[m.x, 0, m.z]} rotation={[0, m.ry, 0]} p={gymPose(f, m.ph, i)} lHand={f <= RELEASE ? <Dumbbell /> : undefined} rHand={f <= RELEASE ? <Dumbbell /> : undefined} />
            {f > RELEASE && [-1, 1].map((sd) => <FlyingDumbbell key={sd} m={m} side={sd} f={f} i={i} />)}
          </React.Fragment>
        ))}
      </Stage>
      <Vignette strength={0.45} />
      <AbsoluteFill style={{background: '#ff3b2e', opacity: 0.12 * r * (0.6 + 0.4 * Math.sin(f * 0.6))}} />
      <CommentCard f={f} />
      {f >= RELEASE + 4 &&
        GYM_MEN.map((m, i) => {
          const pt = project(CAM_H6, f, [m.x, 1.95, m.z]);
          return <AngerMark key={i} x={pt.x + 40} y={pt.y - 20} s={sm((f - RELEASE - 4 - i * 2) / 6) * (1 + 0.12 * Math.sin(f * 0.8 + i))} />;
        })}
    </AbsoluteFill>
  );
};
// 怒りマーク（SVG）
const AngerMark: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
  <svg width={120} height={120} viewBox="-60 -60 120 120" style={{position: 'absolute', left: x - 60, top: y - 60, transform: `scale(${s})`}}>
    {[0, 1, 2, 3].map((i) => (
      <path key={i} d="M 10 -34 Q 12 -12 34 -10" transform={`rotate(${i * 90})`} fill="none" stroke="#ff3b3b" strokeWidth={11} strokeLinecap="round" />
    ))}
  </svg>
);
// 届いたコメント
const CommentCard: React.FC<{f: number}> = ({f}) => {
  const from = 38, to = RELEASE + 10;
  if (f < from || f >= to) return null;
  const k = interpolate(f, [from, from + 8, to - 8, to], [0, 1, 1, 0], clamp);
  const shake = f > RAGE ? Math.sin(f * 2.1) * 10 : 0;
  const text = '寝た方がいい';
  const W = 640;
  return (
    <div data-telop="comment" style={{position: 'absolute', left: SAFE.left + (1080 - SAFE.left - SAFE.right - W) / 2 + shake, top: 540, width: W, boxSizing: 'border-box', opacity: k, transform: `translateY(${(1 - k) * 30}px)`, background: 'rgba(250,250,252,0.96)', borderRadius: 22, padding: '18px 26px 22px', display: 'flex', gap: 18, alignItems: 'center', boxShadow: '0 10px 34px rgba(0,0,0,0.45)', fontFamily: SANS}}>
      <div style={{width: 72, height: 72, borderRadius: 36, background: '#9aa6b8', flexShrink: 0}} />
      <div>
        <div style={{fontSize: 26, fontWeight: 700, color: '#5d6672'}}>コメント・たった今</div>
        <div style={{fontSize: Math.min(56, Math.floor(480 / emWidth(text))), fontWeight: 900, color: '#1a1c22', whiteSpace: 'pre'}}>{text}</div>
      </div>
    </div>
  );
};

// ---------- 7. 起きている時間は増えた。仕事は進まなくなった ----------
const CAM_H7: CamKey[] = [
  {f: 0, pos: [0, 0.4, 10], look: [0, 0.8, 0], fov: 40},
  {f: 300, pos: [1.8, 1.2, 8.6], look: [0, 0.8, 0], fov: 40, ease: LIN},
];
export const H7: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM_H7} />
        <ambientLight intensity={0.1} />
        <hemisphereLight args={['#9fc8ff', '#0a1030', 0.3]} />
        <directionalLight position={[-9, 2, -3]} intensity={3.0} color="#fff4e2" />
        <SpaceBackdrop />
        <Stars />
        <Earth radius={2.3} real detail={110} spin={0.6 + f * 0.005} tilt={0.35} cloudOpacity={0.45} position={[0, 1.4, 0]} />
      </Stage>
      <Graph f={f} />
    </AbsoluteFill>
  );
};
// 起きている時間（上がる）と生産性（下がる）
const Graph: React.FC<{f: number}> = ({f}) => {
  const from = 118;
  if (f < from) return null;
  const k = interpolate(f, [from, from + 10], [0, 1], clamp);
  const prog = interpolate(f, [from + 6, from + 70], [0, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 2)});
  const W = 760, H = 360;
  const left = SAFE.left + (1080 - SAFE.left - SAFE.right - W) / 2;
  const n = 40;
  const pts = (fn: (x: number) => number) =>
    Array.from({length: Math.max(2, Math.round(n * prog) + 1)})
      .map((_, i, arr) => {
        const x = (i / (arr.length - 1)) * prog;
        return `${40 + x * (W - 80)},${H - 40 - fn(x) * (H - 90)}`;
      })
      .join(' ');
  const up = (x: number) => 0.18 + 0.72 * x;
  const down = (x: number) => 0.62 - 0.56 * x + 0.03 * Math.sin(x * 22);
  const end = (fn: (x: number) => number) => ({x: 40 + prog * (W - 80), y: H - 40 - fn(prog) * (H - 90)});
  const eu = end(up), ed = end(down);
  const lab = interpolate(f, [from + 60, from + 72], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', left, top: 640, width: W, height: H, opacity: k, background: 'rgba(22,24,32,0.8)', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 26}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <line x1={40} y1={H - 40} x2={W - 30} y2={H - 40} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
        <line x1={40} y1={30} x2={40} y2={H - 40} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
        <polyline points={pts(up)} fill="none" stroke={C.skyBlue} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={pts(down)} fill="none" stroke={C.coral} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={eu.x} cy={eu.y} r={10} fill={C.skyBlue} />
        <circle cx={ed.x} cy={ed.y} r={10} fill={C.coral} />
      </svg>
      <div data-telop="graph" style={{position: 'absolute', left: 60, top: 26, fontFamily: SANS, fontWeight: 900, fontSize: 38, color: C.skyBlue, opacity: lab, whiteSpace: 'pre'}}>
        起きている時間 ↑
      </div>
      <div data-telop="graph" style={{position: 'absolute', left: 60, bottom: 56, fontFamily: SANS, fontWeight: 900, fontSize: 38, color: C.coral, opacity: lab, whiteSpace: 'pre'}}>
        生産性 ↓
      </div>
    </div>
  );
};
