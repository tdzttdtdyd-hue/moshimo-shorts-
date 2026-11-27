import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3} from '../lib/anim';
import {fbm3, mulberry32} from '../lib/rand';
import {project} from '../lib/project';
import {SpaceBackdrop, Stars, Sun} from '../three/Earth';
import {Human, Outfit, Pose, pose, walkPose} from '../three/Human';
import {CalloutView, Vignette} from './Overlay';
import {SCENES} from './script';
import {C, SANS} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const LIN = (t: number) => t;
const sm = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const spec = (id: string) => SCENES.find((s) => s.id === id)!;
const CO = (id: string, key: string) => spec(id).callouts!.find((c) => c.key === key)!;

// ---------- 立方体の地球 ----------
const H = 2; // 一辺の半分
const R_SPHERE = H / 0.806; // 同じ体積の球の半径
const col = (h: string) => new THREE.Color(h);
const PAL = {
  deep: col('#0d3f8f'),
  ocean: col('#1d6bc4'),
  shallow: col('#3aa8d8'),
  beach: col('#e2cf98'),
  grass: col('#6fae4c'),
  forest: col('#3f7f3a'),
  dry: col('#b8a26a'),
  rock: col('#8a7a68'),
  bare: col('#6a6560'),
  airless: col('#4a4744'),
};
// d：中心からの距離 ÷ H（面の真ん中 1 → 角 1.73）。sea：海の広さ（0..1）
const surfaceColor = (v: THREE.Vector3, sea: number, out: THREE.Color) => {
  const d = v.length() / H;
  const n = fbm3(v.x * 1.3, v.y * 1.3, v.z * 1.3, 4, 4) * 0.08;
  const shore = 1.0 + 0.16 * sea + n;
  if (d < shore - 0.06) return out.copy(PAL.deep).lerp(PAL.ocean, Math.min(1, (d - 1) / 0.12));
  if (d < shore) return out.copy(PAL.ocean).lerp(PAL.shallow, (d - shore + 0.06) / 0.06);
  if (d < shore + 0.015) return out.copy(PAL.beach);
  const t = d - shore;
  if (t < 0.08) return out.copy(PAL.grass).lerp(PAL.forest, 0.5 + n * 4);
  if (t < 0.15) return out.copy(PAL.forest).lerp(PAL.dry, (t - 0.08) / 0.07);
  if (t < 0.24) return out.copy(PAL.dry).lerp(PAL.rock, (t - 0.15) / 0.09);
  if (t < 0.34) return out.copy(PAL.rock).lerp(PAL.bare, (t - 0.24) / 0.1);
  return out.copy(PAL.bare).lerp(PAL.airless, Math.min(1, (t - 0.34) / 0.15));
};
const CubeEarth: React.FC<{morph?: number; sea?: number; air?: number; spin?: number; tilt?: number; position?: V3; night?: number}> = ({morph = 1, sea = 1, air = 1, spin = 0, tilt = 0.35, position = [0, 0, 0], night = 0}) => {
  const base = useMemo(() => new THREE.BoxGeometry(2 * H, 2 * H, 2 * H, 56, 56, 56), []);
  const geo = useMemo(() => {
    const g = base.clone();
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const v = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    // 球のときの色（いまの地球らしく：海が多い）
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i), p.getY(i), p.getZ(i));
      surfaceColor(v, sea, c);
      if (morph < 1) {
        // 球の状態では、ゆるやかな大陸と海
        const k = fbm3(v.x * 0.9 + 3, v.y * 0.9, v.z * 0.9, 9, 4);
        const sc = k > 0.08 ? PAL.grass.clone().lerp(PAL.dry, Math.min(1, (k - 0.08) * 4)) : PAL.ocean.clone().lerp(PAL.deep, Math.min(1, -k * 3));
        c.lerp(sc, 1 - sm((morph - 0.3) / 0.7));
      }
      s.copy(v).normalize().multiplyScalar(R_SPHERE);
      v.lerp(s, 1 - morph);
      p.setXYZ(i, v.x, v.y, v.z);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }, [base, morph, sea]);
  const faces: {p: V3; r: V3}[] = [
    {p: [0, 0, H], r: [0, 0, 0]},
    {p: [0, 0, -H], r: [0, Math.PI, 0]},
    {p: [H, 0, 0], r: [0, Math.PI / 2, 0]},
    {p: [-H, 0, 0], r: [0, -Math.PI / 2, 0]},
    {p: [0, H, 0], r: [-Math.PI / 2, 0, 0]},
    {p: [0, -H, 0], r: [Math.PI / 2, 0, 0]},
  ];
  return (
    <group position={position} rotation={[tilt, spin, 0]}>
      <mesh geometry={geo}>
        <meshStandardMaterial vertexColors roughness={0.8} flatShading={false} emissive="#ffd28a" emissiveIntensity={0} />
      </mesh>
      {/* 面の真ん中にだけある空気（青い光） */}
      {air > 0 &&
        faces.map((fc, i) => (
          <group key={i} position={fc.p} rotation={fc.r}>
            <mesh scale={[1, 1, 0.16]}>
              <sphereGeometry args={[H * 0.78, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshBasicMaterial color="#7fc4ff" transparent opacity={0.22 * air} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            {night > 0 && <CityLights k={night} seed={i} />}
          </group>
        ))}
      {morph < 1 && (
        <mesh>
          <sphereGeometry args={[R_SPHERE * 1.03, 48, 32]} />
          <meshBasicMaterial color="#6fb8ff" transparent opacity={0.16 * (1 - morph)} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
};
const CityLights: React.FC<{k: number; seed: number}> = ({k, seed}) => {
  const pts = useMemo(() => {
    const r = mulberry32(seed + 3);
    return Array.from({length: 60}).map(() => {
      const a = r() * Math.PI * 2, rr = H * (0.42 + r() * 0.3);
      return [Math.cos(a) * rr, Math.sin(a) * rr, 0.01] as V3;
    });
  }, [seed]);
  return (
    <>
      {pts.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.018, 6, 4]} />
          <meshBasicMaterial color="#ffd27a" transparent opacity={k} />
        </mesh>
      ))}
    </>
  );
};
const SpaceLights: React.FC<{sun?: V3}> = ({sun = [8, 5, 9]}) => (
  <>
    <ambientLight intensity={0.12} />
    <hemisphereLight args={['#9fc8ff', '#0a1030', 0.35]} />
    <directionalLight position={sun} intensity={3.0} color="#fff4e2" />
  </>
);

// ---------- 1. 球 → 立方体 ----------
const CAM_C1: CamKey[] = [
  {f: 0, pos: [0, 1.6, 16], look: [0, 0.3, 0], fov: 42},
  {f: 150, pos: [3.5, 3.0, 15], look: [0, 0.2, 0], fov: 42, ease: LIN},
];
export const C1: React.FC = () => {
  const f = useCurrentFrame();
  const morph = interpolate(f, [55, 125], [0, 1], {...clamp, easing: (x) => x * x * (3 - 2 * x)});
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM_C1} shakes={[{from: 60, dur: 60, amp: 0.03}]} />
        <SpaceLights />
        <SpaceBackdrop />
        <Stars />
        <CubeEarth morph={morph} sea={1} air={morph} spin={0.6 + f * 0.006} position={[0, 0.5, 0]} />
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- 2. 海が面の真ん中に集まる ----------
const CAM_C2: CamKey[] = [
  {f: 0, pos: [3.5, 3.0, 15], look: [0, 0.2, 0], fov: 42},
  {f: 180, pos: [7.5, 5.0, 12], look: [0, 0.2, 0], fov: 42, ease: LIN},
];
export const C2: React.FC = () => {
  const f = useCurrentFrame();
  const sea = interpolate(f, [0, 90], [0.15, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 2)});
  const spin = 0.6 + (150 + f) * 0.006;
  const co = CO('c2_seas', 'sea');
  // 手前の面の真ん中を指す
  const g = new THREE.Object3D();
  g.position.set(0, 0.5, 0);
  g.rotation.set(0.35, spin, 0);
  g.updateMatrixWorld();
  const pt = new THREE.Vector3(0, 0, H).applyMatrix4(g.matrixWorld);
  const pp = project(CAM_C2, f, pt.toArray() as V3);
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM_C2} />
        <SpaceLights />
        <SpaceBackdrop />
        <Stars />
        <CubeEarth sea={sea} spin={spin} position={[0, 0.5, 0]} />
      </Stage>
      <CalloutView x={pp.x} y={pp.y} tag={co.tag} text={co.text} from={co.from} to={co.to} dx={co.dx} dy={co.dy} />
    </AbsoluteFill>
  );
};

// ---------- 3. 角は宇宙に突き出す ----------
const CAM_C3: CamKey[] = [
  {f: 0, pos: [9.5, 7.5, 9.5], look: [0, 0.6, 0], fov: 40},
  {f: 180, pos: [7.5, 8.5, 8.0], look: [0.4, 1.2, 0.4], fov: 40, ease: LIN},
];
export const C3: React.FC = () => {
  const f = useCurrentFrame();
  const corner: V3 = [H, H, H];
  const co = CO('c3_corner', 'corner');
  const pp = project(CAM_C3, f, corner);
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM_C3} />
        <SpaceLights sun={[9, 6, 3]} />
        <SpaceBackdrop />
        <Stars />
        <CubeEarth sea={1} spin={0} tilt={0} />
      </Stage>
      <CalloutView x={pp.x} y={pp.y} tag={co.tag} text={co.text} from={co.from} to={co.to} dx={co.dx} dy={co.dy} />
    </AbsoluteFill>
  );
};

// ---------- 地表の場面で使う部品 ----------
const WALKER: Outfit = {shirt: '#d9663f', pants: '#2f3e5c', skin: '#e3b08e', hair: '#2b211c'};
const SUIT: Outfit = {shirt: '#f2f2ee', pants: '#e6e6e2', skin: '#f2f2ee', hair: '#e6e6e2', shoes: '#9aa0a8'};
// 宇宙服のヘルメット（頭の位置に重ねる）
const Helmet: React.FC<{p: V3}> = ({p}) => (
  <group position={p}>
    <mesh>
      <sphereGeometry args={[0.2, 24, 18]} />
      <meshStandardMaterial color="#f4f4f0" roughness={0.4} />
    </mesh>
    <mesh position={[0, -0.01, 0.07]} scale={[0.85, 0.7, 0.75]}>
      <sphereGeometry args={[0.19, 24, 18]} />
      <meshStandardMaterial color="#c9a24a" metalness={0.8} roughness={0.15} />
    </mesh>
    <mesh position={[0, -0.12, -0.26]}>
      <boxGeometry args={[0.36, 0.5, 0.18]} />
      <meshStandardMaterial color="#e2e2de" roughness={0.6} />
    </mesh>
  </group>
);
// 空：地平線の色 → 上の色
const SkyGrad: React.FC<{top: string; horizon: string; left?: string}> = ({top, horizon}) => {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(300, 48, 24);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const a = col(horizon), b = col(top), tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 300;
      tmp.copy(a).lerp(b, Math.min(1, Math.max(0, y * 2.4)));
      cols.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  }, [top, horizon]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
};
const groundGeo = (w: number, d: number, seg: number, seed: number, colorAt: (x: number, z: number, n: number) => THREE.Color, height = (x: number, z: number) => 0) => {
  const g = new THREE.PlaneGeometry(w, d, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const n = fbm3(x * 0.08, 0, z * 0.08, seed, 4);
    p.setY(i, height(x, z) + n * 0.4);
    const c = colorAt(x, z, n);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.computeVertexNormals();
  return g;
};

// ---------- 4. 平らなのに上り坂 ----------
// 人は右（辺の方向）へ歩く。地面は平らなまま、重力の向き＝人の体が少しずつ前に傾く
const CAM_C4: CamKey[] = [
  {f: 0, pos: [-2.5, 2.4, 10], look: [-0.5, 1.6, 0], fov: 46},
  {f: 210, pos: [3.0, 1.9, 8.0], look: [2.0, 1.4, 0], fov: 46, ease: LIN},
];
export const C4: React.FC = () => {
  const f = useCurrentFrame();
  const lean = interpolate(f, [20, 180], [0, 0.6], {...clamp, easing: (x) => x * x * (3 - 2 * x)}); // ラジアン（約41°）
  const x = -0.8 + f * 0.012;
  const climb = lean / 0.72;
  const p: Pose = walkPose(f * 0.32, 1 + climb * 0.4);
  p.head -= climb * 0.15;
  const ground = useMemo(
    () =>
      groundGeo(200, 60, 120, 4, (gx, _gz, n) => {
        // 右（辺の方向）ほど草が減って岩肌に
        const t = Math.max(0, Math.min(1, (gx + 20) / 80));
        return PAL.grass.clone().lerp(PAL.dry, t).lerp(PAL.rock, Math.max(0, t - 0.5) * 2).offsetHSL(0, 0, n * 0.1);
      }),
    [],
  );
  // 重力の矢印（体の傾きと同じ向き）
  const arrowLen = 1.4;
  return (
    <AbsoluteFill>
      <Stage bg="#6fa8e0" shadows={false}>
        <CameraRig keys={CAM_C4} />
        <SkyGrad top={'#' + col('#3c78c8').lerp(col('#0b1030'), climb * 0.8).getHexString()} horizon={'#' + col('#bcd8f0').lerp(col('#3a4a70'), climb * 0.6).getHexString()} />
        <hemisphereLight args={['#dfeeff', '#6a6a50', 1.1]} />
        <directionalLight position={[6, 10, 6]} intensity={2.0} color="#fff3e0" />
        <mesh geometry={ground}>
          <meshStandardMaterial vertexColors roughness={1} flatShading />
        </mesh>
        <Rocks />
        {/* 体は重力の向きに沿って立つ → 地面に対して前に倒れていく */}
        <group position={[x, 0, 0]} rotation={[0, 0, -lean]}>
          <Human outfit={WALKER} rotation={[0, Math.PI / 2, 0]} p={p} />
        </group>
        <group position={[x - 1.3, 2.4, 0.3]} rotation={[0, 0, -lean]}>
          <mesh position={[0, -arrowLen / 2, 0]}>
            <cylinderGeometry args={[0.06, 0.06, arrowLen, 10]} />
            <meshBasicMaterial color="#ff8a5a" />
          </mesh>
          <mesh position={[0, -arrowLen - 0.12, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.12, 0.26, 12]} />
            <meshBasicMaterial color="#ff8a5a" />
          </mesh>
        </group>
      </Stage>
      <GravityTag f={f} lean={lean} x={x} />
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};
const GravityTag: React.FC<{f: number; lean: number; x: number}> = ({f, lean, x}) => {
  const k = interpolate(f, [30, 40], [0, 1], clamp);
  const pt = project(CAM_C4, f, [x - 1.3 - Math.sin(lean) * 0.8, 2.4 - Math.cos(lean) * 0.8, 0.3]);
  return <CalloutView x={pt.x} y={pt.y} tag="重力" text="地球の中心へ" from={30} to={100} dx={200} dy={-60} key={k > 0 ? 1 : 0} />;
};
const Rocks: React.FC = () => {
  const items = useMemo(() => {
    const r = mulberry32(8);
    return Array.from({length: 60}).map(() => ({p: [(r() - 0.3) * 60, 0, -4 - r() * 30] as V3, s: 0.2 + r() * 0.8}));
  }, []);
  return (
    <>
      {items.map((it, i) => (
        <mesh key={i} position={it.p} scale={[it.s, it.s * 0.6, it.s]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#8a8070" roughness={1} flatShading />
        </mesh>
      ))}
    </>
  );
};

// ---------- 5. 辺の上（屋根の棟のような尾根・昼でも星空） ----------
const ridgeGeo = () =>
  groundGeo(260, 260, 140, 12, (_x, z, n) => col('#9a9288').lerp(col('#7a746c'), Math.min(1, Math.abs(z) * 0.03)).offsetHSL(0, 0, n * 0.15), (_x, z) => -Math.abs(z) * 0.9);
const CAM_C5: CamKey[] = [
  {f: 0, pos: [-8, 5.5, 4], look: [12, -1.5, -1], fov: 55},
  {f: 180, pos: [-3, 6.0, -3], look: [14, -1.8, 1], fov: 55, ease: LIN},
];
export const C5: React.FC = () => {
  const f = useCurrentFrame();
  const ground = useMemo(() => ridgeGeo(), []);
  return (
    <AbsoluteFill>
      <Stage bg="#02030a" shadows={false}>
        <CameraRig keys={CAM_C5} />
        <mesh>
          <sphereGeometry args={[300, 32, 16]} />
          <meshBasicMaterial color="#02030a" side={THREE.BackSide} />
        </mesh>
        <Stars count={2200} radius={250} seed={9} />
        <Sun position={[120, 80, -140]} size={4} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[120, 80, -140]} intensity={2.6} color="#ffffff" />
        <directionalLight position={[-40, 30, 60]} intensity={1.0} color="#cfd8ff" />
        <mesh geometry={ground}>
          <meshStandardMaterial vertexColors roughness={1} flatShading />
        </mesh>
        {/* 両側のずっと下に、青く光る空気の層 */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[30, -60, s * 120]} rotation={[s * 0.75, 0, 0]}>
            <planeGeometry args={[400, 120]} />
            <meshBasicMaterial color="#5fa8ff" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {/* 尾根に立つ旗（空気がないのでなびかない） */}
        <group position={[4, 0, 0]}>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 2.4, 8]} />
            <meshStandardMaterial color="#c9c9c9" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0.45, 2.1, 0]}>
            <boxGeometry args={[0.9, 0.55, 0.02]} />
            <meshStandardMaterial color="#e8e2d0" />
          </mesh>
        </group>
        <Dust f={f} />
      </Stage>
    </AbsoluteFill>
  );
};
// 尾根を転がる小石（動きを足す）
const Dust: React.FC<{f: number}> = ({f}) => {
  const r = mulberry32(31);
  return (
    <>
      {Array.from({length: 18}).map((_, i) => {
        const side = r() < 0.5 ? -1 : 1;
        const x0 = r() * 20 - 2;
        const t = ((f * 0.6 + i * 23) % 120) / 120;
        const z = side * (0.2 + t * 6);
        return (
          <mesh key={i} position={[x0, -Math.abs(z) * 0.9 + 0.12, z]} rotation={[f * 0.2, i, 0]}>
            <dodecahedronGeometry args={[0.12 + (i % 3) * 0.05, 0]} />
            <meshStandardMaterial color="#7a746c" flatShading />
          </mesh>
        );
      })}
    </>
  );
};

// ---------- 6. 角の上：ひと跳びで高く ----------
const CAM_C6: CamKey[] = [
  {f: 0, pos: [7.0, 2.8, 7.0], look: [0.9, 1.4, 0.6], fov: 50},
  {f: 150, pos: [2.0, 3.8, 9.5], look: [0.9, 2.0, 0.6], fov: 50, ease: LIN},
];
export const C6: React.FC = () => {
  const f = useCurrentFrame();
  // 角：3つの面が出会う頂点（ピラミッド状）
  const peak = useMemo(() => {
    const g = new THREE.ConeGeometry(40, 30, 3, 8);
    g.translate(0, -15, 0);
    return g;
  }, []);
  // ゆっくり大きなジャンプ（重力1/3）
  const T = 120;
  const t = Math.max(0, Math.min(1, (f - 20) / T));
  const y = 4 * 2.2 * t * (1 - t);
  const air = f > 20 && f < 20 + T;
  const p: Pose = air ? pose({lSh: [0.6, 0.9], rSh: [0.6, 0.9], lEl: 0.4, rEl: 0.4, lHip: [0.5, 0.1], rHip: [0.2, 0.1], lKn: 0.9, rKn: 0.5}) : pose({lKn: 0.3, rKn: 0.3, lHip: [0.2, 0.05], rHip: [0.2, 0.05], spine: 0.15});
  return (
    <AbsoluteFill>
      <Stage bg="#02030a" shadows={false}>
        <CameraRig keys={CAM_C6} />
        <mesh>
          <sphereGeometry args={[300, 32, 16]} />
          <meshBasicMaterial color="#02030a" side={THREE.BackSide} />
        </mesh>
        <Stars count={2200} radius={250} seed={4} />
        <Sun position={[-120, 90, -100]} size={4} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[-120, 90, -100]} intensity={2.4} />
        <directionalLight position={[10, 5, 10]} intensity={1.2} />
        <mesh geometry={peak} position={[0.9, 0, 0.6]} rotation={[0, 0.3, 0]}>
          <meshStandardMaterial color="#9a9288" roughness={1} flatShading />
        </mesh>
        <group position={[0.9, y, 0.6]}>
          <Human outfit={SUIT} rotation={[0, 0.5, 0]} p={p} muscle={1.15} />
          <Helmet p={[0, 1.74, 0]} />
        </group>
      </Stage>
      <JumpHeight f={f} />
    </AbsoluteFill>
  );
};
const JumpHeight: React.FC<{f: number}> = ({f}) => {
  const k = interpolate(f, [40, 50, 130, 140], [0, 1, 1, 0], clamp);
  if (k <= 0) return null;
  return (
    <div data-telop="card" style={{position: 'absolute', left: 92, top: 560, opacity: k, background: C.card, border: `1.5px solid ${C.cardBorder}`, borderRadius: 20, padding: '14px 26px', fontFamily: SANS, textAlign: 'center'}}>
      <div style={{fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre'}}>ジャンプの高さ</div>
      <div style={{fontSize: 64, fontWeight: 900, color: C.coral, whiteSpace: 'pre'}}>約3倍</div>
    </div>
  );
};

// ---------- 7. 面全体に同時に朝が来る ----------
const CAM_C7: CamKey[] = [
  {f: 0, pos: [0.5, 1.6, 14], look: [0, 0.3, 0], fov: 42},
  {f: 150, pos: [-0.5, 2.0, 13], look: [0, 0.3, 0], fov: 42, ease: LIN},
];
export const C7: React.FC = () => {
  const f = useCurrentFrame();
  // 太陽は右。立方体が回って、手前の面が一気に昼側へ
  const spin = interpolate(f, [0, 150], [-1.35, -0.55], clamp);
  const lit = f > 70 ? 1 : 0;
  const night = interpolate(f, [60, 76], [1, 0], clamp);
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM_C7} />
        <ambientLight intensity={0.05} />
        <directionalLight position={[10, 1, 0.6]} intensity={3.2} color="#fff4e2" />
        <SpaceBackdrop />
        <Stars />
        <CubeEarth sea={1} spin={spin} tilt={0.12} position={[0, 0.3, 0]} night={night} />
      </Stage>
      <Flash f={f} at={70} />
      <Vignette strength={0.3} />
      {lit > 2 && null}
    </AbsoluteFill>
  );
};
const Flash: React.FC<{f: number; at: number}> = ({f, at}) => {
  const o = interpolate(f, [at, at + 2, at + 14], [0, 0.35, 0], clamp);
  if (o <= 0) return null;
  return <AbsoluteFill style={{background: '#fff2d0', opacity: o}} />;
};

// ---------- 8. となりの面へ：宇宙服で辺を越える ----------
const CAM_C8: CamKey[] = [
  {f: 0, pos: [-6, 2.6, 6], look: [1, 1.0, 0], fov: 50},
  {f: 180, pos: [-3, 3.4, 7.5], look: [2, 1.0, 0], fov: 50, ease: LIN},
];
export const C8: React.FC = () => {
  const f = useCurrentFrame();
  const ground = useMemo(() => ridgeGeo(), []);
  // 尾根（z=0）を手前の面から奥の面へ歩いて越える
  const z = interpolate(f, [0, 170], [3.2, -2.6], clamp);
  const y = -Math.abs(z) * 0.9;
  const p = walkPose(f * 0.25, 0.8);
  const facing = Math.PI;
  return (
    <AbsoluteFill>
      <Stage bg="#02030a" shadows={false}>
        <CameraRig keys={CAM_C8} />
        <mesh>
          <sphereGeometry args={[300, 32, 16]} />
          <meshBasicMaterial color="#02030a" side={THREE.BackSide} />
        </mesh>
        <Stars count={2200} radius={250} seed={9} />
        <Sun position={[120, 80, -140]} size={4} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[120, 80, -140]} intensity={2.2} />
        <directionalLight position={[-20, 10, 20]} intensity={1.2} />
        <mesh geometry={ground}>
          <meshStandardMaterial vertexColors roughness={1} flatShading />
        </mesh>
        {/* 国境の看板 */}
        <group position={[1.6, 0, 0]}>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1.8, 8]} />
            <meshStandardMaterial color="#9a9a9a" />
          </mesh>
          <BorderSign />
        </group>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[30, -60, s * 120]} rotation={[s * 0.75, 0, 0]}>
            <planeGeometry args={[400, 120]} />
            <meshBasicMaterial color="#5fa8ff" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <group position={[0, y, z]} rotation={[z > 0 ? -0.35 : 0.35, facing, 0]}>
          <Human outfit={SUIT} p={p} muscle={1.15} />
          <Helmet p={[0, 1.74, 0]} />
        </group>
      </Stage>
    </AbsoluteFill>
  );
};
const signTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 256;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#f2efe6';
    g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#c0392b';
    g.lineWidth = 14;
    g.strokeRect(10, 10, 492, 236);
    g.fillStyle = '#1d1d22';
    g.font = "900 54px 'Noto Sans JP', sans-serif";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('この先 となりの面', 256, 128);
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();
const BorderSign: React.FC = () => (
  <mesh position={[0, 1.9, 0]} rotation={[0, -Math.PI / 2, 0]}>
    <planeGeometry args={[1.6, 0.8]} />
    <meshStandardMaterial map={signTex()} side={THREE.DoubleSide} />
  </mesh>
);
