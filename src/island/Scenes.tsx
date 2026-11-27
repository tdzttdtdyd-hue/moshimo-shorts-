import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3} from '../lib/anim';
import {fbm3, mulberry32} from '../lib/rand';
import {project} from '../lib/project';
import {Human, IDLE, Outfit, Pose, pose, shockPose, walkPose, wavePose} from '../three/Human';
import {Forest, SkyDome, TreeSpec} from '../three/Landscape';
import {CalloutView, Vignette} from './Overlay';
import {SCENES} from './script';

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
const spec = (id: string) => SCENES.find((s) => s.id === id)!;
const CO = (id: string, key: string) => spec(id).callouts!.find((c) => c.key === key)!;
const Box: React.FC<{p: V3; s: V3; c: string; r?: number; e?: string; ei?: number; rot?: V3}> = ({p, s, c, r = 0.8, e, ei = 0, rot = [0, 0, 0]}) => (
  <mesh position={p} rotation={rot}>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} roughness={r} emissive={e ?? '#000'} emissiveIntensity={ei} />
  </mesh>
);

// ---------- 主人公：パジャマ → 日焼け ----------
const PAJAMA: Outfit = {shirt: '#9cc3e6', pants: '#9cc3e6', skin: '#e9b99a', hair: '#2b211c', shoes: '#e9b99a'};
const TAN: Outfit = {shirt: '#9cc3e6', pants: '#7aa0c4', skin: '#b5784e', hair: '#2b211c', shoes: '#b5784e'};
const SITTING: Pose = pose({lHip: [1.45, 0.15], rHip: [1.45, 0.15], lKn: 1.4, rKn: 1.4, lSh: [0.5, 0.15], rSh: [0.5, 0.15], lEl: 0.8, rEl: 0.8, spine: 0.15});

// ---------- 島 ----------
type Sky = 'day' | 'noon' | 'sunset' | 'night';
const SKIES: Record<Sky, {top: string; horizon: string; sun: V3; sunColor: string; light: number; lightColor: string; hemi: number; bg: string}> = {
  day: {top: '#5aa8e8', horizon: '#d8eefa', sun: [0.5, 0.6, -0.6], sunColor: '#fff6dc', light: 2.0, lightColor: '#fff4e0', hemi: 1.0, bg: '#bfe0f5'},
  noon: {top: '#3f95e0', horizon: '#cfeaf8', sun: [0.2, 0.9, -0.3], sunColor: '#ffffff', light: 2.4, lightColor: '#ffffff', hemi: 1.1, bg: '#bfe0f5'},
  sunset: {top: '#4a5a9a', horizon: '#ffa868', sun: [0.0, 0.06, -1], sunColor: '#ffd08a', light: 1.5, lightColor: '#ffb070', hemi: 0.7, bg: '#f0a070'},
  night: {top: '#050a1e', horizon: '#18264a', sun: [0.3, 0.5, -0.8], sunColor: '#cfdcff', light: 0.35, lightColor: '#9fb4ff', hemi: 0.35, bg: '#0a1228'},
};
const PALMS: {p: V3; h: number; lean: number; ry: number}[] = [
  {p: [-3.2, 0, -2.5], h: 5.2, lean: 0.25, ry: 0.4},
  {p: [-1.4, 0, -4.2], h: 6.0, lean: 0.15, ry: -0.6},
  {p: [2.8, 0, -3.4], h: 5.5, lean: 0.3, ry: 2.6},
  {p: [4.6, 0, -1.2], h: 4.8, lean: 0.2, ry: 2.0},
  {p: [-5.2, 0, 0.6], h: 5.0, lean: 0.35, ry: 0.9},
];
const Palm: React.FC<{p: V3; h: number; lean: number; ry: number; f: number; coconut?: boolean}> = ({p, h, lean, ry, f, coconut = true}) => {
  const segs = 8;
  const pts = Array.from({length: segs + 1}).map((_, i) => {
    const t = i / segs;
    return new THREE.Vector3(Math.sin(t * lean * 2) * h * 0.35, t * h, 0);
  });
  const top = pts[segs];
  const sway = 0.06 * Math.sin(f * 0.05 + p[0]);
  return (
    <group position={p} rotation={[0, ry, 0]}>
      {pts.slice(0, segs).map((a, i) => {
        const b = pts[i + 1];
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const len = a.distanceTo(b);
        const ang = Math.atan2(b.x - a.x, b.y - a.y);
        return (
          <mesh key={i} position={mid.toArray() as V3} rotation={[0, 0, -ang]}>
            <cylinderGeometry args={[0.13 - i * 0.008, 0.15 - i * 0.008, len * 1.02, 8]} />
            <meshStandardMaterial color={i % 2 ? '#8a6a48' : '#7a5c3e'} roughness={1} />
          </mesh>
        );
      })}
      <group position={top.toArray() as V3} rotation={[0, 0, sway]}>
        {Array.from({length: 8}).map((_, i) => (
          <group key={i} rotation={[0, (i / 8) * Math.PI * 2, 0]}>
            <mesh position={[1.1, -0.35, 0]} rotation={[0, 0, -0.45]} scale={[1, 0.08, 0.32]}>
              <sphereGeometry args={[1.2, 10, 6]} />
              <meshStandardMaterial color={i % 2 ? '#3f8f3a' : '#4fa046'} roughness={0.9} />
            </mesh>
          </group>
        ))}
        {coconut &&
          [0, 2.1, 4.2].map((a, i) => (
            <mesh key={i} position={[Math.cos(a) * 0.2, -0.25, Math.sin(a) * 0.2]}>
              <sphereGeometry args={[0.14, 12, 10]} />
              <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
            </mesh>
          ))}
      </group>
    </group>
  );
};
// 島の形：手前の浜（z ≈ 11）から奥へ広がり、奥に山がある
const IC_Z = -29; // 島の中心（ワールド z）
const IR = 40; // 島の半径
const MT: [number, number] = [8, -44]; // 山の位置（ワールド x, z）
const islandH = (x: number, z: number) => {
  const r = Math.hypot(x, z - IC_Z);
  const n = fbm3(x * 0.15, 0, z * 0.15, 5, 3);
  const beach = Math.min(1, Math.max(0, (IR - r) / 7)) * 0.62 - 0.42;
  const md = Math.hypot(x - MT[0], z - MT[1]);
  const mt = 24 * Math.exp(-(md * md) / (2 * 9 * 9)) + 5 * Math.exp(-((x + 14) ** 2 + (z + 40) ** 2) / (2 * 7 * 7));
  const inland = Math.min(1, Math.max(0, (IR - 14 - r) / 6));
  return beach + (mt + Math.max(0, n) * 1.5) * inland + n * 0.04;
};
const EXTRA_PALMS = (() => {
  const r = mulberry32(77);
  const out: {p: V3; h: number; lean: number; ry: number}[] = [];
  while (out.length < 34) {
    const a = r() * Math.PI * 2, d = IR - 6 - r() * 6;
    const x = Math.sin(a) * d, z = IC_Z + Math.cos(a) * d;
    if (Math.abs(x) < 12 && z > -12) continue; // 撮影している場所はあける
    out.push({p: [x, islandH(x, z) - 0.05, z], h: 4.5 + r() * 2, lean: 0.1 + r() * 0.3, ry: r() * 6});
  }
  return out;
})();
const JUNGLE: TreeSpec[] = (() => {
  const r = mulberry32(91);
  const out: TreeSpec[] = [];
  while (out.length < 260) {
    const x = (r() - 0.5) * 70, z = IC_Z + (r() - 0.5) * 60;
    const rr = Math.hypot(x, z - IC_Z);
    if (rr > IR - 14) continue;
    if (z > -16) continue;
    const h = islandH(x, z);
    if (h > 13) continue;
    out.push({x, z, s: 1.6 + r() * 1.6, type: r() < 0.25 ? 'pine' : 'round', y: h - 0.1});
  }
  return out;
})();
const ROCKS = (() => {
  const r = mulberry32(3);
  return Array.from({length: 26}).map(() => {
    const a = r() * Math.PI * 2, d = 6 + r() * 5;
    return {p: [Math.cos(a) * d, 0.05, Math.sin(a) * d - 2] as V3, s: 0.2 + r() * 0.5};
  });
})();
const Island: React.FC<{f: number; sky?: Sky; children?: React.ReactNode; water?: number}> = ({f, sky = 'day', children, water = 0}) => {
  const S = SKIES[sky];
  const sand = useMemo(() => {
    const g = new THREE.PlaneGeometry(2 * IR + 6, 2 * IR + 6, 140, 140);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i) + IC_Z;
      const r = Math.hypot(x, z - IC_Z);
      const h = islandH(x, z);
      p.setY(i, r > IR + 1 ? -1.5 : h);
      const n = fbm3(x * 0.3, 0, z * 0.3, 5, 3);
      const inland = Math.min(1, Math.max(0, (IR - 14 - r) / 4));
      c.set('#e8d6a8').lerp(new THREE.Color('#c9b27e'), Math.max(0, n * 2));
      c.lerp(new THREE.Color(h > 9 ? '#5a7a3a' : '#5f9a40'), inland);
      if (h > 12) c.lerp(new THREE.Color('#8a8070'), Math.min(1, (h - 12) / 3));
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <>
      <SkyDome top={S.top} horizon={S.horizon} sunDir={S.sun} sunColor={S.sunColor} sunPower={sky === 'sunset' ? 10 : 30} />
      <hemisphereLight args={[S.horizon, '#8a7a5a', S.hemi]} />
      <ambientLight intensity={sky === 'night' ? 0.15 : 0.3} />
      <directionalLight position={[S.sun[0] * 30, Math.max(3, S.sun[1] * 30), S.sun[2] * 30]} intensity={S.light} color={S.lightColor} />
      <directionalLight position={[4, 6, 14]} intensity={sky === 'night' ? 0.25 : 0.6} color="#ffffff" />
      <mesh geometry={sand} position={[0, 0, IC_Z]}>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      {/* 海（浅瀬は明るく） */}
      <mesh position={[0, -0.12 + water + 0.02 * Math.sin(f * 0.06), 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={sky === 'night' ? '#0d2a48' : sky === 'sunset' ? '#3a5f8a' : '#2a8fb8'} roughness={0.15} metalness={0.2} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, -0.1, IC_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[IR - 0.8, IR + 2.5, 128]} />
        <meshBasicMaterial color={sky === 'night' ? '#20507a' : '#7fe0e0'} transparent opacity={0.35 + 0.1 * Math.sin(f * 0.08)} depthWrite={false} />
      </mesh>
      {PALMS.map((pl, i) => (
        <Palm key={i} {...pl} f={f} />
      ))}
      {EXTRA_PALMS.map((pl, i) => (
        <Palm key={'x' + i} {...pl} f={f} />
      ))}
      <Forest trees={JUNGLE} seed={5} />
      {ROCKS.map((r, i) => (
        <mesh key={i} position={r.p} scale={[r.s, r.s * 0.6, r.s]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#8a8478" roughness={1} flatShading />
        </mesh>
      ))}
      {children}
    </>
  );
};
const IslandStage: React.FC<{f: number; cam: CamKey[]; sky?: Sky; children?: React.ReactNode; shakes?: {from: number; dur: number; amp: number}[]; water?: number}> = ({f, cam, sky = 'day', children, shakes, water}) => (
  <Stage bg={SKIES[sky].bg} shadows={false}>
    <CameraRig keys={cam} shakes={shakes} />
    <Island f={f} sky={sky} water={water}>
      {children}
    </Island>
  </Stage>
);

// 小物
const Phone: React.FC = () => (
  <group position={[0, -0.09, 0.03]}>
    <Box p={[0, 0, 0]} s={[0.075, 0.155, 0.01]} c="#16171b" r={0.3} />
    <Box p={[0, 0, 0.006]} s={[0.066, 0.14, 0.002]} c="#9fd0ff" e="#7fc0ff" ei={1.2} r={0.2} />
  </group>
);
const Coconut: React.FC<{p?: V3; s?: number}> = ({p = [0, -0.1, 0.04], s = 1}) => (
  <mesh position={p} scale={s}>
    <sphereGeometry args={[0.14, 12, 10]} />
    <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
  </mesh>
);
const Campfire: React.FC<{p: V3; f: number; k: number; smoke?: number}> = ({p, f, k, smoke = 0}) => (
  <group position={p}>
    {[0, 1, 2, 3, 4].map((i) => (
      <mesh key={i} position={[0, 0.06, 0]} rotation={[0.25, (i / 5) * Math.PI * 2, Math.PI / 2 - 0.35]}>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 6]} />
        <meshStandardMaterial color="#5a4030" roughness={1} />
      </mesh>
    ))}
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
      <mesh key={'s' + i} position={[Math.cos(i) * 0.38, 0.05, Math.sin(i) * 0.38]} scale={0.1}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#7a766e" flatShading />
      </mesh>
    ))}
    {k > 0 && (
      <>
        <mesh position={[0, 0.28, 0]} scale={[k, k * (1 + 0.15 * Math.sin(f * 0.9)), k]}>
          <coneGeometry args={[0.18, 0.5, 10]} />
          <meshBasicMaterial color="#ff8a2a" transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 0.22, 0]} scale={[k, k * (1 + 0.2 * Math.cos(f * 1.1)), k]}>
          <coneGeometry args={[0.1, 0.32, 10]} />
          <meshBasicMaterial color="#ffe070" />
        </mesh>
        <pointLight position={[0, 0.6, 0]} intensity={6 * k * (0.9 + 0.1 * Math.sin(f * 0.7))} distance={7} color="#ff9a4a" />
      </>
    )}
    {smoke > 0 &&
      Array.from({length: 10}).map((_, i) => {
        const ph = ((f * 0.8 + i * 10) % 100) / 100;
        return (
          <mesh key={'m' + i} position={[Math.sin(i * 2.3 + ph * 3) * 0.2 * ph, 0.2 + ph * 2.2, Math.cos(i) * 0.1]} scale={0.08 + ph * 0.3}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#d8d8d8" transparent opacity={(1 - ph) * 0.45 * smoke} depthWrite={false} />
          </mesh>
        );
      })}
  </group>
);

// ---------- 1. ワープ：光とともに砂浜へ落ちる ----------
const CAM_1: CamKey[] = [
  {f: 0, pos: [30, 38, 52], look: [2, 6, -30], fov: 50},
  {f: 34, pos: [3, 2.2, 8], look: [0, 1.0, 0], fov: 50},
  {f: 120, pos: [1.5, 1.8, 6], look: [0, 0.9, 0], fov: 50, ease: LIN},
];
export const S1: React.FC = () => {
  const f = useCurrentFrame();
  const drop = interpolate(f, [24, 40], [4, 0], {...clamp, easing: (x) => x * x});
  const land = f >= 40;
  const sit = sm((f - 40) / 6) * (1 - sm((f - 70) / 14));
  const p = land ? lerpPose(lerpPose(IDLE, SITTING, sit), shockPose(f), sm((f - 74) / 10)) : pose({lSh: [0.3, 1.2], rSh: [0.3, 1.2], lKn: 0.4, rKn: 0.2});
  const flash = interpolate(f, [16, 24, 40], [0, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <IslandStage f={f} cam={CAM_1} shakes={[{from: 40, dur: 10, amp: 0.05}]}>
        {f >= 20 && <Human outfit={PAJAMA} position={[0, drop - sit * 0.45, 0]} rotation={[0, 0.3, 0]} p={p} rHand={<Phone />} />}
        {flash > 0 && (
          <mesh position={[0, 1.5, 0]} scale={0.4 + flash * 1.6}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshBasicMaterial color="#e8f4ff" transparent opacity={flash * 0.8} />
          </mesh>
        )}
      </IslandStage>
      <AbsoluteFill style={{background: '#ffffff', opacity: interpolate(f, [18, 24, 32], [0, 0.85, 0], clamp)}} />
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 2. 圏外 ----------
const CAM_2: CamKey[] = [
  {f: 0, pos: [2.4, 1.6, 3.6], look: [0, 1.5, 0], fov: 50},
  {f: 120, pos: [-1.5, 3.4, 7.5], look: [0, 1.2, -2], fov: 50, ease: LIN},
];
export const S2: React.FC = () => {
  const f = useCurrentFrame();
  const p = pose({rSh: [2.6, 0.2], rEl: 0.2, head: -0.35, twist: 0.25 * Math.sin(f * 0.06), lSh: [0.1, 0.2]});
  // 手の先（スマホ）を指す
  const ph: V3 = [0.32, 2.35, 0.1];
  const co = CO('i02_signal', 'phone');
  const pt = project(CAM_2, f, ph);
  return (
    <AbsoluteFill>
      <IslandStage f={f} cam={CAM_2}>
        <Human outfit={PAJAMA} position={[0, 0, 0]} rotation={[0, 0.3, 0]} p={p} rHand={<Phone />} />
      </IslandStage>
      <CalloutView x={pt.x} y={pt.y} tag={co.tag} text={co.text} from={co.from} to={co.to} dx={co.dx} dy={co.dy} />
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 3. 海水を飲む → 吐き出す ----------
const CAM_3: CamKey[] = [
  {f: 0, pos: [2.8, 1.5, 11.0], look: [0, 0.7, 7.0], fov: 50},
  {f: 180, pos: [1.8, 1.4, 11.4], look: [0, 0.7, 7.0], fov: 50, ease: LIN},
];
export const S3: React.FC = () => {
  const f = useCurrentFrame();
  const scoop = sm((f - 10) / 20) * (1 - sm((f - 60) / 10));
  const spit = sm((f - 62) / 8);
  const crouch = pose({spine: 0.7, head: 0.3, lHip: [0.9, 0.15], rHip: [0.9, 0.15], lKn: 1.4, rKn: 1.4, lSh: [1.0, 0.1], rSh: [1.0, -0.1], lEl: 0.6, rEl: 0.6});
  const drink = pose({spine: 0.1, head: -0.3, lHip: [0.6, 0.15], rHip: [0.6, 0.15], lKn: 1.0, rKn: 1.0, lSh: [1.4, -0.3], rSh: [1.4, -0.3], lEl: 1.9, rEl: 1.9});
  const yuck = pose({spine: 0.45, head: 0.55, lSh: [0.6, 0.3], rSh: [1.6, 0.2], rEl: 2.2, lEl: 0.5, lKn: 0.25, rKn: 0.2});
  let p = lerpPose(crouch, drink, sm((f - 30) / 14));
  p = lerpPose(p, yuck, spit);
  return (
    <AbsoluteFill>
      <IslandStage f={f} cam={CAM_3}>
        <Human outfit={PAJAMA} position={[0, -0.05 - 0.2 * (1 - spit) * (scoop > 0 ? 1 : 0.5), 6.9]} rotation={[0, 0.1, 0]} p={p} />
        {/* 吐き出す水しぶき */}
        {spit > 0 &&
          spit < 1 &&
          Array.from({length: 10}).map((_, i) => (
            <mesh key={i} position={[Math.sin(i) * 0.3 * spit, 1.4 - spit * 1.2 + Math.cos(i * 2) * 0.1, 7.1 + spit * 0.8]} scale={0.03}>
              <sphereGeometry args={[1, 6, 4]} />
              <meshBasicMaterial color="#cfeeff" />
            </mesh>
          ))}
      </IslandStage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 4. ヤシの木に登る（ずり落ちる → 2回目で取れる） ----------
const TREE_P: V3 = [1.6, 0, 0.6];
const CAM_4: CamKey[] = [
  {f: 0, pos: [5.6, 2.2, 4.2], look: [1.6, 2.2, 0.6], fov: 54},
  {f: 180, pos: [4.6, 2.8, 4.8], look: [1.6, 2.8, 0.6], fov: 54, ease: LIN},
];
export const S4: React.FC = () => {
  const f = useCurrentFrame();
  // 1回目：0〜70 で 2m 登って、ずるっと落ちる。2回目：80〜150 で てっぺん
  const y1 = f < 50 ? interpolate(f, [5, 50], [0, 2.0], clamp) : interpolate(f, [50, 60], [2.0, 0], {...clamp, easing: (x) => x * x});
  const y2 = interpolate(f, [80, 140], [0, 3.6], clamp);
  const y = f < 75 ? y1 : f < 150 ? y2 : interpolate(f, [150, 168], [3.6, 0], clamp);
  const climbing = (f > 5 && f < 50) || (f > 80 && f < 140);
  const fallen = f >= 58 && f < 80;
  const ph = f * 0.35;
  const climbPose = pose({lSh: [2.4 + 0.3 * Math.sin(ph), 0.4], rSh: [2.4 - 0.3 * Math.sin(ph), 0.4], lEl: 0.8, rEl: 0.8, lHip: [1.0 + 0.3 * Math.sin(ph), 0.4], rHip: [1.0 - 0.3 * Math.sin(ph), 0.4], lKn: 1.4, rKn: 1.4, spine: 0.1});
  const p = fallen ? SITTING : climbing || (f >= 140 && f < 150) ? climbPose : f >= 150 ? pose({rSh: [2.6, 0.3], rEl: 0.3, head: -0.2}) : IDLE;
  const base: V3 = [TREE_P[0], 0, TREE_P[2] + 0.32];
  const hasNut = f >= 140;
  return (
    <AbsoluteFill>
      <IslandStage f={f} cam={CAM_4} shakes={[{from: 58, dur: 10, amp: 0.05}]}>
        <Palm p={TREE_P} h={4.6} lean={0} ry={0} f={f} coconut={!hasNut} />
        <Human outfit={PAJAMA} position={[base[0], y - (fallen ? 0.45 : 0), base[2] + (fallen ? 0.4 : 0)]} rotation={[0, climbing || (f >= 140 && f < 150) ? Math.PI : 0.3, 0]} p={p} rHand={hasNut ? <Coconut /> : undefined} />
      </IslandStage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 5. 1日目の夜：火起こし（煙だけ） ----------
const CAM_5: CamKey[] = [
  {f: 0, pos: [2.6, 1.4, 4.4], look: [0, 0.4, 1.2], fov: 50},
  {f: 180, pos: [1.6, 1.2, 3.8], look: [0, 0.4, 1.2], fov: 50, ease: LIN},
];
const RUB = (f: number): Pose => {
  const s = Math.sin(f * 1.2);
  return pose({spine: 0.55, head: 0.5, lHip: [1.5, 0.3], rHip: [1.5, 0.3], lKn: 1.6, rKn: 1.6, lSh: [1.1 + 0.15 * s, -0.2], rSh: [1.1 - 0.15 * s, -0.2], lEl: 0.9, rEl: 0.9});
};
export const S5: React.FC = () => {
  const f = useCurrentFrame();
  const tired = sm((f - 120) / 20);
  const p = lerpPose(RUB(f), pose({spine: 0.7, head: 0.8, lHip: [1.5, 0.3], rHip: [1.5, 0.3], lKn: 1.6, rKn: 1.6, lSh: [0.2, 0.3], rSh: [0.2, 0.3]}), tired);
  return (
    <AbsoluteFill>
      <IslandStage f={f} cam={CAM_5} sky="night">
        <Campfire p={[0, 0, 1.2]} f={f} k={0} smoke={interpolate(f, [20, 50], [0, 1], clamp)} />
        <Human outfit={PAJAMA} position={[0, -0.4, 0.55]} p={p} />
        <mesh position={[0, 0.25, 1.0]} rotation={[0.9, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.5, 6]} />
          <meshStandardMaterial color="#8a6a48" />
        </mesh>
      </IslandStage>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};

// ---------- 6. 3日目：SOS → 飛行機は気づかない ----------
const letterPts = (): V3[] => {
  const pts: V3[] = [];
  const add = (x: number, z: number) => pts.push([x, 0.22, z]);
  // S：上から見て読める向き（画面の上 = 奥 = −z）
  const S = (ox: number) => {
    const ctrl = [
      [0.8, 1.2],
      [0, 1.7],
      [-0.8, 1.1],
      [0, 0],
      [0.8, -1.1],
      [0, -1.7],
      [-0.8, -1.2],
    ].map(([u, v]) => new THREE.Vector3(u, 0, -v));
    const c = new THREE.CatmullRomCurve3(ctrl);
    for (let i = 0; i <= 24; i++) {
      const q = c.getPointAt(i / 24);
      add(ox + q.x, q.z);
    }
  };
  S(-3.0);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    add(Math.cos(a) * 1.1, 0.0 + Math.sin(a) * 1.7);
  }
  S(3.0);
  return pts;
};
const SOS = letterPts();
const CAM_6: CamKey[] = [
  {f: 0, pos: [0, 17, 11], look: [0, 0, 0.5], fov: 52},
  {f: 85, pos: [0, 18, 11.5], look: [0, 0, 0], fov: 52, ease: LIN},
  {f: 180, pos: [0, 9, 12], look: [0, 26, -30], fov: 52},
];
export const S6: React.FC = () => {
  const f = useCurrentFrame();
  const shown = Math.floor(interpolate(f, [0, 60], [SOS.length * 0.6, SOS.length], clamp));
  const planeX = interpolate(f, [100, 180], [-22, 14], clamp);
  return (
    <AbsoluteFill>
      <IslandStage f={f} cam={CAM_6}>
        <group position={[0, 0, 1.0]}>
          {SOS.slice(0, shown).map((p, i) => (
            <mesh key={i} position={p} scale={[0.22, 0.14, 0.22]}>
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#6a6560" flatShading />
            </mesh>
          ))}
        </group>
        <Human outfit={TAN} position={[4.5, 0, 2.2]} rotation={[0, -0.6, 0]} p={f > 90 ? wavePose(f * 1.5) : walkPose(f * 0.3, 0.6)} />
        {/* 上空の飛行機と飛行機雲 */}
        <group position={[planeX, 40, -40]} scale={2}>
          <Box p={[0, 0, 0]} s={[4, 0.5, 0.5]} c="#f0f2f4" />
          <Box p={[0.2, 0, 0]} s={[0.8, 0.1, 4]} c="#e0e4e8" />
          <Box p={[-1.8, 0.4, 0]} s={[0.5, 0.8, 0.1]} c="#e0e4e8" />
          <mesh position={[-40, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.18, 0.4, 76, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.55} />
          </mesh>
        </group>
      </IslandStage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 7. 7日目：ついに火がつく ----------
const CAM_7: CamKey[] = [
  {f: 0, pos: [2.0, 1.2, 3.8], look: [0, 0.5, 1.2], fov: 50},
  {f: 150, pos: [3.0, 1.6, 4.6], look: [0, 0.8, 1.0], fov: 50, ease: LIN},
];
export const S7: React.FC = () => {
  const f = useCurrentFrame();
  const fire = sm((f - 40) / 25);
  const joy = sm((f - 60) / 10);
  const p = lerpPose(RUB(f), shockPose(f), joy);
  return (
    <AbsoluteFill>
      <IslandStage f={f} cam={CAM_7} sky="sunset">
        <Campfire p={[0, 0, 1.2]} f={f} k={fire} smoke={1 - fire * 0.6} />
        <Human outfit={TAN} position={[0, lerp(-0.4, 0, joy), 0.4]} p={p} />
      </IslandStage>
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};

// ---------- 8. 10日目：魚を突く → 焼き魚 ----------
const CAM_8: CamKey[] = [
  {f: 0, pos: [3.4, 1.7, 11.6], look: [0, 0.7, 7.8], fov: 50},
  {f: 150, pos: [1.9, 1.9, 12.0], look: [0, 0.9, 7.8], fov: 50, ease: LIN},
];
export const S8: React.FC = () => {
  const f = useCurrentFrame();
  const thrust = sm((f - 50) / 5) * (1 - sm((f - 70) / 10));
  const caught = f >= 55;
  const lift = sm((f - 72) / 12);
  const p = pose({spine: 0.3 * thrust + 0.1, head: 0.4, rSh: [lerp(1.6, 0.9, thrust) + lift * 1.0, 0.1], rEl: lerp(1.2, 0.2, thrust), lSh: [1.4, -0.2], lEl: 1.0, lKn: 0.3, rKn: 0.2, lHip: [0.3, 0.1]});
  const fishA = f * 0.08;
  return (
    <AbsoluteFill>
      <IslandStage f={f} cam={CAM_8}>
        <Human
          outfit={TAN}
          position={[0, -0.05, 7.0]}
          rotation={[0, 0, 0]}
          p={p}
          rHand={
            <group rotation={[Math.PI / 2, 0, 0]}>
              <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 1.8, 6]} />
                <meshStandardMaterial color="#8a6a48" />
              </mesh>
              {caught && (
                <mesh position={[0, 1.0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 0.4, 0.25]}>
                  <sphereGeometry args={[0.16, 12, 8]} />
                  <meshStandardMaterial color="#e8885a" />
                </mesh>
              )}
            </group>
          }
        />
        {!caught && (
          <mesh position={[Math.cos(fishA) * 0.6, -0.2, 8.8 + Math.sin(fishA) * 0.4]} rotation={[0, -fishA, 0]} scale={[1, 0.4, 0.25]}>
            <sphereGeometry args={[0.16, 12, 8]} />
            <meshStandardMaterial color="#e8885a" />
          </mesh>
        )}
        {Array.from({length: 3}).map((_, i) => {
          const a = f * 0.06 + i * 2;
          return (
            <mesh key={i} position={[1.5 + Math.cos(a) * 0.8, -0.22, 9.0 + Math.sin(a) * 0.6]} rotation={[0, -a, 0]} scale={[1, 0.4, 0.25]}>
              <sphereGeometry args={[0.13, 10, 6]} />
              <meshStandardMaterial color="#6fa8d8" />
            </mesh>
          );
        })}
        {thrust > 0.5 && (
          <mesh position={[0, -0.08, 8.6]} rotation={[-Math.PI / 2, 0, 0]} scale={thrust}>
            <ringGeometry args={[0.2, 0.5, 24]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
          </mesh>
        )}
      </IslandStage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 9. 14日目：小屋と雨水タンク ----------
const Hut: React.FC<{f: number; tally?: boolean}> = ({f, tally}) => (
  <group position={[-2.6, 0, -1.0]} rotation={[0, 0.5, 0]}>
    {[
      [-1.2, -0.9],
      [1.2, -0.9],
      [-1.2, 0.9],
      [1.2, 0.9],
    ].map(([x, z], i) => (
      <mesh key={i} position={[x, 1.1, z]}>
        <cylinderGeometry args={[0.07, 0.08, 2.2, 8]} />
        <meshStandardMaterial color="#8a6a48" roughness={1} />
      </mesh>
    ))}
    {/* ヤシの葉の屋根（雨水を前に集める傾き） */}
    <mesh position={[0, 2.35, 0]} rotation={[0.28, 0, 0]}>
      <boxGeometry args={[2.9, 0.12, 2.5]} />
      <meshStandardMaterial color="#5a8a3a" roughness={1} />
    </mesh>
    {Array.from({length: 7}).map((_, i) => (
      <mesh key={i} position={[-1.3 + i * 0.43, 2.43, 0]} rotation={[0.28, 0, 0]} scale={[0.25, 0.05, 1.3]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={i % 2 ? '#4f8a36' : '#6a9a44'} roughness={1} />
      </mesh>
    ))}
    {/* 雨どい → 水がめ */}
    <mesh position={[0, 1.95, 1.35]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.07, 0.07, 2.8, 8, 1, true, 0, Math.PI]} />
      <meshStandardMaterial color="#7a9a4a" side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[1.5, 0.35, 1.4]}>
      <cylinderGeometry args={[0.3, 0.25, 0.7, 14]} />
      <meshStandardMaterial color="#9a7050" roughness={0.9} />
    </mesh>
    <mesh position={[1.5, 0.66, 1.4]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.27, 16]} />
      <meshStandardMaterial color="#4fa8d8" roughness={0.1} />
    </mesh>
    {/* したたる水 */}
    {Array.from({length: 4}).map((_, i) => {
      const t = ((f * 0.06 + i * 0.25) % 1);
      return (
        <mesh key={'d' + i} position={[1.45, 1.9 - t * 1.2, 1.4]} scale={0.03}>
          <sphereGeometry args={[1, 6, 4]} />
          <meshBasicMaterial color="#bfe8ff" />
        </mesh>
      );
    })}
    {/* ハンモック */}
    <mesh position={[0, 0.85, 0]} rotation={[0, 0, 0]} scale={[1.15, 0.25, 0.4]}>
      <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      <meshStandardMaterial color="#e8d8b0" side={THREE.DoubleSide} />
    </mesh>
    {tally && <TallyBoard />}
  </group>
);
const tallyTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 160;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#b08a60';
    g.fillRect(0, 0, 512, 160);
    g.fillStyle = '#3a2a1a';
    g.font = "900 78px 'Noto Sans JP', sans-serif";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('正正正正正正', 256, 84);
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();
const TallyBoard: React.FC = () => (
  <mesh position={[1.2, 1.4, 0.98]} rotation={[0, 0, 0]}>
    <planeGeometry args={[1.0, 0.31]} />
    <meshStandardMaterial map={tallyTex()} side={THREE.DoubleSide} />
  </mesh>
);
const CAM_9: CamKey[] = [
  {f: 0, pos: [2.5, 2.2, 5.0], look: [-2.2, 1.2, -1.0], fov: 52},
  {f: 150, pos: [0.4, 2.0, 5.2], look: [-2.4, 1.2, -1.0], fov: 52, ease: LIN},
];
export const S9: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <IslandStage f={f} cam={CAM_9} sky="noon">
        <Hut f={f} />
        <Human outfit={TAN} position={[0.2, 0, 1.0]} rotation={[0, -0.9, 0]} p={pose({lSh: [0.1, 0.2], rSh: [1.2, 0.3], rEl: 1.4, head: -0.1 + 0.05 * Math.sin(f * 0.1)})} rHand={<Coconut />} />
      </IslandStage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 10. 30日目：正の字30本・ペットのカニ・夕日 ----------
const Crab: React.FC<{p: V3; f: number}> = ({p, f}) => (
  <group position={p} rotation={[0, Math.PI / 2, 0]}>
    <mesh scale={[1, 0.5, 0.7]}>
      <sphereGeometry args={[0.14, 12, 8]} />
      <meshStandardMaterial color="#d84a3a" roughness={0.6} />
    </mesh>
    {[-1, 1].map((s) => (
      <group key={s}>
        <mesh position={[s * 0.18, 0.03, 0.1]} rotation={[0, 0, s * (0.4 + 0.2 * Math.sin(f * 0.4))]}>
          <sphereGeometry args={[0.055, 8, 6]} />
          <meshStandardMaterial color="#e05a48" />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[s * 0.15, -0.04, -0.06 + i * 0.06]} rotation={[0, 0, s * (1.0 + 0.3 * Math.sin(f * 0.8 + i))]}>
            <cylinderGeometry args={[0.01, 0.01, 0.16, 4]} />
            <meshStandardMaterial color="#c8402f" />
          </mesh>
        ))}
      </group>
    ))}
  </group>
);
const CAM_10: CamKey[] = [
  {f: 0, pos: [1.8, 1.3, 4.0], look: [-1.2, 0.8, -0.5], fov: 52},
  {f: 180, pos: [3.4, 1.8, 5.4], look: [-1.4, 1.0, -0.8], fov: 52, ease: LIN},
];
export const S10: React.FC = () => {
  const f = useCurrentFrame();
  const crab: V3 = [0.3 + 0.4 * Math.sin(f * 0.04), 0.06, 1.3];
  const co = CO('i10_day30', 'crab');
  const pt = project(CAM_10, f, crab);
  return (
    <AbsoluteFill>
      <IslandStage f={f} cam={CAM_10} sky="sunset">
        <Hut f={f} tally />
        <Campfire p={[1.2, 0, 0.0]} f={f} k={0.8} smoke={0.4} />
        <Human outfit={TAN} position={[-0.6, -0.42, 0.9]} rotation={[0, 0.4, 0]} p={{...SITTING, head: -0.1, rSh: [0.6, 0.3], rEl: 0.5}} />
        <Crab p={crab} f={f} />
      </IslandStage>
      <CalloutView x={pt.x} y={pt.y} tag={co.tag} text={co.text} from={co.from} to={co.to} dx={co.dx} dy={co.dy} />
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};

// ---------- 11. 救助のヘリ → 「あと1週間！」 ----------
const Heli: React.FC<{p: V3; f: number}> = ({p, f}) => (
  <group position={p} rotation={[0, -0.5, 0.04 * Math.sin(f * 0.1)]}>
    <mesh scale={[1.4, 1, 1]}>
      <sphereGeometry args={[0.9, 20, 14]} />
      <meshStandardMaterial color="#e8642a" roughness={0.5} />
    </mesh>
    <mesh position={[0.7, 0.15, 0]} scale={[0.6, 0.6, 0.85]}>
      <sphereGeometry args={[0.7, 16, 12]} />
      <meshStandardMaterial color="#9fd0ff" roughness={0.1} metalness={0.3} />
    </mesh>
    <Box p={[-1.9, 0.2, 0]} s={[2.4, 0.3, 0.3]} c="#e8642a" />
    <Box p={[-3.0, 0.6, 0]} s={[0.4, 0.9, 0.08]} c="#e8642a" />
    <group position={[0, 1.0, 0]} rotation={[0, f * 1.3, 0]}>
      <Box p={[0, 0, 0]} s={[5.0, 0.04, 0.25]} c="#3a3a3a" />
      <Box p={[0, 0, 0]} s={[0.25, 0.04, 5.0]} c="#3a3a3a" />
    </group>
    <Box p={[0, -1.0, 0.6]} s={[2.2, 0.06, 0.08]} c="#555" />
    <Box p={[0, -1.0, -0.6]} s={[2.2, 0.06, 0.08]} c="#555" />
    {/* 縄ばしご */}
    {Array.from({length: 10}).map((_, i) => (
      <Box key={i} p={[0.2 + 0.03 * Math.sin(f * 0.1 + i * 0.4) * i, -1.3 - i * 0.35, 0]} s={[0.5, 0.04, 0.04]} c="#c8a878" />
    ))}
  </group>
);
const CAM_11: CamKey[] = [
  {f: 0, pos: [3.6, 1.4, 7.2], look: [0.2, 3.6, -1.5], fov: 56},
  {f: 210, pos: [2.4, 1.4, 6.0], look: [0.2, 3.4, -1.5], fov: 56, ease: LIN},
];
export const S11: React.FC = () => {
  const f = useCurrentFrame();
  const heliY = interpolate(f, [0, 60], [11, 4.4], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 2)}) + 0.15 * Math.sin(f * 0.12);
  const heli: V3 = [0.8, heliY + 3.4, -7.0];
  // 最初は喜んで手を振る → 振り向いて「ことわる」手ぶり
  const refuse = sm((f - 76) / 10);
  const p = lerpPose(wavePose(f * 1.6), pose({rSh: [1.2, 0.2], rEl: 0.4, lSh: [0.2, 0.2], head: -0.15, twist: 0.25 * Math.sin(f * 0.5)}), refuse);
  const co = CO('i11_heli', 'say');
  const pt = project(CAM_11, f, [0.2, 1.9, 0.2]);
  return (
    <AbsoluteFill>
      <IslandStage f={f} cam={CAM_11} sky="day">
        <Hut f={f} tally />
        <Heli p={heli} f={f} />
        {/* ヘリの風で揺れる砂 */}
        {Array.from({length: 14}).map((_, i) => {
          const a = i * 0.45 + f * 0.05;
          const r = 1 + ((f * 0.05 + i * 0.3) % 3);
          return (
            <mesh key={i} position={[heli[0] + Math.cos(a) * r, 0.1 + 0.2 * Math.sin(f * 0.3 + i), heli[2] + Math.sin(a) * r]} scale={0.05}>
              <sphereGeometry args={[1, 6, 4]} />
              <meshBasicMaterial color="#e8d6a8" transparent opacity={0.7} />
            </mesh>
          );
        })}
        <Human outfit={TAN} position={[0.2, 0, 0.2]} rotation={[0, lerp(Math.PI * 0.85, 0.5, refuse), 0]} p={p} />
        <Crab p={[0.9, 0.06, 0.9]} f={f} />
      </IslandStage>
      <CalloutView x={pt.x} y={pt.y} tag={co.tag} text={co.text} from={co.from} to={co.to} dx={co.dx} dy={co.dy} />
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};
