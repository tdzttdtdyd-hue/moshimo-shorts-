import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {project} from '../lib/project';
import {Human, IDLE, OUTFITS, pose, walkPose} from '../three/Human';
import {Earth, SpaceBackdrop, Stars} from '../three/Earth';
import {Road, SkyDome, Terrain, Tower, grassColor} from '../three/Landscape';
import {CalloutView, Vignette} from './Overlay';
import {SCENES} from './script';

const spec = (id: string) => SCENES.find((s) => s.id === id)!;
const CO = (id: string, key: string) => spec(id).callouts!.find((c) => c.key === key)!;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const LIN = (t: number) => t;

// 実際の地球の経緯度 → 球面上の点（Earth の real モードと同じ向き）
const ll = (lon: number, lat: number, r: number): THREE.Vector3 => {
  const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
  return new THREE.Vector3(Math.sin(lo) * Math.cos(la) * r, Math.sin(la) * r, Math.cos(lo) * Math.cos(la) * r);
};

// 光る列（点列をなめらかにつないだチューブ）。progress で伸びていく
const GlowLine: React.FC<{pts: THREE.Vector3[]; progress: number; width?: number; color?: string; closed?: boolean}> = ({pts, progress, width = 0.012, color = '#ffcf6a', closed}) => {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(pts, !!closed), [pts, closed]);
  const geo = useMemo(() => {
    const p = Math.max(0.002, Math.min(1, progress));
    const n = Math.max(8, Math.floor(400 * p));
    const sub = Array.from({length: n + 1}).map((_, i) => curve.getPointAt((i / n) * p));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sub), n, width, 6, false);
  }, [curve, progress, width]);
  return (
    <group>
      <mesh geometry={geo}>
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh geometry={geo} scale={1.0}>
        <meshBasicMaterial color={color} transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};

const SpaceLights: React.FC<{sun?: V3}> = ({sun = [8, 4, 10]}) => (
  <>
    <ambientLight intensity={0.15} />
    <hemisphereLight args={['#9fc8ff', '#0a1030', 0.4]} />
    <directionalLight position={sun} intensity={3.0} color="#fff4e2" />
  </>
);

// 遠くまで続く人の列（インスタンス化した人型シルエット：脚2本・胴・腕2本・頭）
const Crowd: React.FC<{n: number; spacing?: number; z0?: number; x?: number; seed?: number}> = ({n, spacing = 0.45, z0 = 0, x = 0, seed = 1}) => {
  const parts = useMemo(
    () => ({
      leg: new THREE.CapsuleGeometry(0.065, 0.72, 4, 8).translate(0, 0.43, 0),
      torso: new THREE.CapsuleGeometry(0.15, 0.4, 4, 10).translate(0, 1.17, 0),
      arm: new THREE.CapsuleGeometry(0.045, 0.52, 4, 8).translate(0, 1.08, 0),
      head: new THREE.SphereGeometry(0.105, 14, 12).translate(0, 1.62, 0),
    }),
    [],
  );
  const mats = useMemo(
    () => ({
      shirt: new THREE.MeshStandardMaterial({roughness: 0.7}),
      pants: new THREE.MeshStandardMaterial({color: '#2b2e36', roughness: 0.8}),
      skin: new THREE.MeshStandardMaterial({color: '#e0b090', roughness: 0.7}),
    }),
    [],
  );
  const tmp = new THREE.Object3D();
  const c = new THREE.Color();
  // dx：体の中心からの左右のずれ（脚・腕用）
  const setup = (m: THREE.InstancedMesh | null, dx: number, colored: boolean) => {
    if (!m) return;
    const r = mulberry32(seed);
    for (let i = 0; i < n; i++) {
      const h = 0.88 + r() * 0.22;
      const hue = r();
      const jx = (r() - 0.5) * 0.06;
      const ry = Math.PI / 2 + (r() - 0.5) * 0.3;
      tmp.position.set(x + jx, 0, z0 - i * spacing);
      tmp.rotation.set(0, ry, 0);
      tmp.scale.set(1, h, 1);
      tmp.updateMatrix();
      if (dx !== 0) tmp.matrix.multiply(new THREE.Matrix4().makeTranslation(dx, 0, 0));
      m.setMatrixAt(i, tmp.matrix);
      if (colored) {
        c.setHSL(hue, 0.45, 0.45 + (hue * 7) % 0.2);
        m.setColorAt(i, c);
      }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  };
  return (
    <>
      <instancedMesh args={[parts.leg, mats.pants, n]} castShadow ref={(m) => setup(m, -0.09, false)} />
      <instancedMesh args={[parts.leg, mats.pants, n]} castShadow ref={(m) => setup(m, 0.09, false)} />
      <instancedMesh args={[parts.torso, mats.shirt, n]} castShadow ref={(m) => setup(m, 0, true)} />
      <instancedMesh args={[parts.arm, mats.shirt, n]} castShadow ref={(m) => setup(m, -0.21, true)} />
      <instancedMesh args={[parts.arm, mats.shirt, n]} castShadow ref={(m) => setup(m, 0.21, true)} />
      <instancedMesh args={[parts.head, mats.skin, n]} castShadow ref={(m) => setup(m, 0, false)} />
    </>
  );
};

// 手前の人は人型キャラクター、遠くは簡易な人形で並べる
const PeopleLine: React.FC<{near: number; far: number; z0?: number; seed?: number}> = ({near, far, z0 = 0, seed = 1}) => {
  const f = useCurrentFrame();
  const people = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({length: near}).map((_, i) => ({o: OUTFITS[Math.floor(r() * OUTFITS.length)], ry: Math.PI / 2 + (r() - 0.5) * 0.4, ph: r() * 6, s: 0.92 + r() * 0.14}));
  }, [near, seed]);
  return (
    <>
      {people.map((p, i) => (
        <Human key={i} position={[0, 0.02, z0 - i * 0.45]} rotation={[0, p.ry, 0]} scale={p.s} outfit={p.o} p={pose({...IDLE, head: Math.sin(f * 0.05 + p.ph) * 0.06, lSh: [0.05, 0.12], rSh: [0.05, 0.12]})} />
      ))}
      {far > 0 && <Crowd n={far} z0={z0 - near * 0.45} x={0} seed={seed + 1} />}
    </>
  );
};

// ---------- 1：1人目 ----------
const CAM1: CamKey[] = [
  {f: 0, pos: [3.5, 1.6, 4.5], look: [0, 1.1, 0], fov: 46},
  {f: 120, pos: [5.5, 2.4, 2.5], look: [0, 1.0, -3], fov: 48},
];
const City: React.FC = () => {
  const towers = useMemo(() => {
    const r = mulberry32(4);
    return Array.from({length: 26}).map((_, i) => ({x: (i % 2 ? 1 : -1) * (14 + r() * 10), z: 10 - Math.floor(i / 2) * 10, h: 14 + r() * 40, c: ['#d9dee6', '#e8e2d6', '#cfd7df'][i % 3], seed: i}));
  }, []);
  return (
    <>
      <SkyDome top="#4a8fd8" horizon="#e2eff8" sunDir={[0.5, 0.6, 0.4]} />
      <hemisphereLight args={['#eef6ff', '#8f8a80', 0.95]} />
      <directionalLight position={[10, 18, 8]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
      <Terrain size={[300, 300]} seg={50} amp={0.02} colorAt={grassColor('#a8a49b', '#97938a', '#bab6ad')} />
      <Road length={200} width={12} position={[0, 0, -40]} rotationY={Math.PI / 2} />
      {towers.map((t, i) => (
        <Tower key={i} position={[t.x, 0, t.z]} h={t.h} w={8} d={8} color={t.c} seed={t.seed} />
      ))}
    </>
  );
};
export const L1: React.FC = () => {
  const f = useCurrentFrame();
  const more = Math.floor(interpolate(f, [80, 120], [0, 30], clamp));
  return (
    <AbsoluteFill>
      <Stage bg="#cfe4f3" fog={['#d8e8f4', 30, 200]}>
        <CameraRig keys={CAM1} />
        <City />
        <Human position={[0, 0.02, 0]} rotation={[0, 0.5, 0]} outfit={OUTFITS[2]} p={pose({...IDLE, lSh: [0.1, 0.15], rSh: [0.1, 0.15], head: Math.sin(f * 0.05) * 0.05})} />
        {/* 肩幅45cmの目盛り */}
        <mesh position={[0, 1.95, 0]}>
          <boxGeometry args={[0.45, 0.02, 0.02]} />
          <meshBasicMaterial color="#ff8a6a" />
        </mesh>
        {more > 0 && <PeopleLine near={Math.min(more, 14)} far={Math.max(0, more - 14)} z0={-0.45} seed={3} />}
      </Stage>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};

// ---------- 2：東京都の人だけで日本列島の約2倍 ----------
const JAPAN: [number, number][] = [
  [139.7, 35.7], [140.9, 38.3], [140.7, 40.8], [141.3, 43.1], [141.7, 45.4], [142.6, 44.0], [144.3, 43.0], [141.0, 42.0], [140.7, 40.6], [139.0, 37.9], [136.6, 36.6], [135.5, 34.7], [133.9, 34.6], [131.4, 34.0], [130.4, 33.6], [130.6, 31.6], [129.5, 28.4], [127.7, 26.2], [125.3, 24.8], [121.5, 25.0], [120.3, 22.6],
];
const R = 2.4;
export const CAM2: CamKey[] = [
  {f: 0, pos: ll(139.7, 35.7, R * 1.55).toArray() as V3, look: ll(139.7, 35.7, R).toArray() as V3, fov: 46},
  {f: 150, pos: ll(134, 33, R * 2.05).toArray() as V3, look: ll(134, 34, R * 0.95).toArray() as V3, fov: 46, ease: LIN},
];
export const L2: React.FC = () => {
  const f = useCurrentFrame();
  const pts = useMemo(() => JAPAN.map(([lo, la]) => ll(lo, la, R * 1.012)), []);
  const prog = interpolate(f, [8, 120], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM2} />
        <SpaceLights sun={ll(160, 30, 30).toArray() as V3} />
        <SpaceBackdrop />
        <Stars />
        <Earth radius={R} real detail={140} spin={0} tilt={0} cloudOpacity={0.25} />
        <GlowLine pts={pts} progress={prog} width={0.008} />
      </Stage>
      <Vignette strength={0.45} />
      <CalloutView {...project(CAM2, f, ll(139.7, 35.7, R).toArray() as V3)} {...CO('l2_tokyo', 'tokyo')} />
    </AbsoluteFill>
  );
};

// ---------- 3：日本人だけで地球1周以上 ----------
const greatCircle = (startLon: number, startLat: number, heading: number, turns: number, r: number, n = 220) => {
  const a = ll(startLon, startLat, 1);
  const north = new THREE.Vector3(0, 1, 0);
  const east = north.clone().cross(a).normalize().negate();
  const nn = a.clone().cross(east).normalize().negate();
  const dir = east.clone().multiplyScalar(Math.cos(heading)).add(nn.clone().multiplyScalar(Math.sin(heading)));
  const axis = a.clone().cross(dir).normalize();
  return Array.from({length: n + 1}).map((_, i) => a.clone().applyAxisAngle(axis, (i / n) * Math.PI * 2 * turns).multiplyScalar(r));
};
const CAM3: CamKey[] = [
  {f: 0, pos: ll(134, 33, R * 2.05).toArray() as V3, look: ll(134, 34, R * 0.95).toArray() as V3, fov: 46},
  {f: 150, pos: [9, 4, 6], look: [0, 0, 0], fov: 44, ease: LIN},
];
export const L3: React.FC = () => {
  const f = useCurrentFrame();
  const pts = useMemo(() => greatCircle(139.7, 35.7, 0.35, 1.4, R * 1.014), []);
  const prog = interpolate(f, [6, 130], [0.06, 1], clamp);
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM3} />
        <SpaceLights />
        <SpaceBackdrop />
        <Stars />
        <Earth radius={R} real detail={120} spin={0} tilt={0} cloudOpacity={0.35} />
        <GlowLine pts={pts} progress={prog} width={0.012} />
      </Stage>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

// ---------- 4：全人類で地球約92周（毛糸玉） ----------
const CAM4: CamKey[] = [
  {f: 0, pos: [9, 4, 6], look: [0, 0, 0], fov: 44},
  {f: 180, pos: [-6, 3, 9.5], look: [0, 0, 0], fov: 44, ease: LIN},
];
export const L4: React.FC = () => {
  const f = useCurrentFrame();
  const loops = useMemo(() => {
    const r = mulberry32(12);
    return Array.from({length: 92}).map((_, i) => {
      const axis = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
      const ref = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const start = ref.clone().cross(axis).normalize();
      const rad = R * (1.016 + (i % 6) * 0.003);
      const pts = Array.from({length: 97}).map((_, k) => start.clone().applyAxisAngle(axis, (k / 96) * Math.PI * 2).multiplyScalar(rad));
      return new THREE.BufferGeometry().setFromPoints(pts);
    });
  }, []);
  const shown = Math.floor(interpolate(f, [4, 120], [2, 92], {...clamp, easing: (x) => x * x}));
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM4} />
        <SpaceLights />
        <SpaceBackdrop />
        <Stars />
        <Earth radius={R} real detail={120} spin={f * 0.004} tilt={0.3} cloudOpacity={0.35} />
        {loops.slice(0, shown).map((g, i) => (
          <lineLoop key={i} geometry={g}>
            <lineBasicMaterial color={i % 3 ? '#ffcf6a' : '#ffe2a0'} transparent opacity={0.8} />
          </lineLoop>
        ))}
      </Stage>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

// ---------- 5：月まで約4.8往復 ----------
const MOON: V3 = [0, 46, 0];
export const CAM5: CamKey[] = [
  {f: 0, pos: [0, 10, 34], look: [0, 20, 0], fov: 80},
  {f: 180, pos: [14, 24, 30], look: [0, 24, 0], fov: 80, ease: LIN},
];
export const L5: React.FC = () => {
  const f = useCurrentFrame();
  // 地球と月のあいだを 4.8 往復（片道 9.6 本）。少しずつずらして並べる
  const zig = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 9; k++) {
      const off = (k - 4.5) * 0.25;
      const end = k % 2 === 0 ? new THREE.Vector3(off, 2.0, 0) : new THREE.Vector3(off, MOON[1] - 0.6, 0);
      pts.push(end);
    }
    const last = pts[pts.length - 1].clone().lerp(pts[pts.length - 2], 0.4);
    pts[pts.length - 1] = last;
    return pts;
  }, []);
  const prog = interpolate(f, [6, 150], [0.02, 1], clamp);
  // 折れ線として描く
  const geo = useMemo(() => {
    const total = zig.length - 1;
    const upto = prog * total;
    const ptsShown: THREE.Vector3[] = [zig[0]];
    for (let i = 1; i <= Math.ceil(upto); i++) {
      const a = zig[i - 1], b = zig[i];
      ptsShown.push(i <= upto ? b : a.clone().lerp(b, upto - (i - 1)));
    }
    return new THREE.BufferGeometry().setFromPoints(ptsShown);
  }, [zig, prog]);
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM5} />
        <SpaceLights sun={[30, 10, 10]} />
        <SpaceBackdrop />
        <Stars />
        <Earth radius={2.0} real detail={100} spin={-2.3 + f * 0.004} tilt={0.3} cloudOpacity={0.4} />
        <mesh position={MOON}>
          <icosahedronGeometry args={[1.4, 6]} />
          <meshStandardMaterial color="#cfcac0" flatShading roughness={1} />
        </mesh>
        <line>
          <primitive object={geo} attach="geometry" />
          <lineBasicMaterial color="#ffcf6a" />
        </line>
      </Stage>
      <Vignette strength={0.45} />
      <CalloutView {...project(CAM5, f, MOON)} {...CO('l5_moon', 'moon')} />
    </AbsoluteFill>
  );
};

// ---------- 6：光なら約12秒 ----------
const CAM6: CamKey[] = [
  {f: 0, pos: [2, 1.5, 8], look: [0, 0, -20], fov: 50},
  {f: 150, pos: [-3, 2.5, 4], look: [0, 0, -60], fov: 50, ease: LIN},
];
export const L6: React.FC = () => {
  const f = useCurrentFrame();
  const t = (f % 60) / 60; // 光の粒がくり返し走る
  const z = 2 - t * 200;
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM6} />
        <SpaceLights />
        <SpaceBackdrop />
        <group rotation={[0, f * 0.002, 0]}>
          <Stars />
        </group>
        <Earth radius={1.4} real detail={90} spin={-2.3 + f * 0.01} tilt={0.3} cloudOpacity={0.4} position={[0, -0.6, 4]} />
        <mesh position={[0, 0, -98]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 200, 8]} />
          <meshBasicMaterial color="#ffcf6a" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0, z]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0, z + 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.16, 4, 12, 1, true]} />
          <meshBasicMaterial color="#bfe4ff" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </Stage>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

// ---------- 7：歩くと約105年（列の横を歩き続ける） ----------
const CAM7: CamKey[] = [
  {f: 0, pos: [2.8, 1.9, 4.2], look: [1.0, 1.2, -6], fov: 50},
  {f: 180, pos: [2.8, 1.9, -13.8], look: [1.0, 1.2, -24], fov: 50, ease: LIN},
];
export const L7: React.FC = () => {
  const f = useCurrentFrame();
  const walkerZ = 1 - f * 0.1;
  const age = interpolate(f, [0, 180], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Stage bg="#cfe4f3" fog={['#d8e8f4', 25, 140]}>
        <CameraRig keys={CAM7} />
        <City />
        <PeopleLine near={16} far={400} z0={2} seed={7} />
        <Human position={[1.5, 0.02, walkerZ]} rotation={[0, Math.PI, 0]} outfit={{shirt: '#d23f33', pants: '#2b2e36', skin: '#e3b08e', hair: new THREE.Color('#2b211c').lerp(new THREE.Color('#e6e6e6'), age).getStyle()}} p={{...walkPose(f * 0.3, 1 - age * 0.4), spine: 0.04 + age * 0.3}} />
      </Stage>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};

// ---------- 8：一生かかってもたどり着けない ----------
export const CAM8: CamKey[] = [
  {f: 0, pos: [2.5, 1.9, 3.2], look: [1.3, 1.2, -10], fov: 50},
  {f: 110, pos: [2.5, 2.1, -2.3], look: [1.3, 1.4, -40], fov: 48, ease: LIN},
  {f: 240, pos: [6, 40, 10], look: [0, 0, -120], fov: 50, ease: LIN},
];
// 列の消失点（最後尾ははるか約369万km先）
const SIGN: V3 = [0, 1.2, -260];
export const L8: React.FC = () => {
  const f = useCurrentFrame();
  const walkerZ = 0 - f * 0.05;
  return (
    <AbsoluteFill>
      <Stage bg="#cfe4f3" fog={['#d8e8f4', 25, 220]}>
        <CameraRig keys={CAM8} />
        <City />
        <PeopleLine near={16} far={700} z0={2} seed={9} />
        <Human position={[1.5, 0.02, walkerZ]} rotation={[0, Math.PI, 0]} outfit={{shirt: '#d23f33', pants: '#2b2e36', skin: '#e3b08e', hair: '#e6e6e6'}} p={{...walkPose(f * 0.25, 0.6), spine: 0.35}} />
      </Stage>
      <Vignette strength={0.4} />
      <CalloutView {...project(CAM8, f, SIGN)} {...CO('l8_end', 'sign')} />
    </AbsoluteFill>
  );
};

