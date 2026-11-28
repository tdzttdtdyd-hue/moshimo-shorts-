import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey, sampleCam} from '../lib/CameraRig';
import {V3} from '../lib/anim';
import {fbm3, mulberry32} from '../lib/rand';
import {project} from '../lib/project';
import {Human, OUTFITS, Outfit, Pose, pose, walkPose} from '../three/Human';
import {Road, SkyDome, StreetLamp, Tower} from '../three/Landscape';
import {walkAlong, Lane} from '../three/Walk';
import {FUJI, mapTexture, toKm} from '../bh/Map';
import {AshCloud, AshFall, Fuji, FUJI_H, Lightning, Plume} from './Fx';
import {ERUPT, SCENES} from './script';
import {CalloutView, Vignette} from './Overlay';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const LIN = (t: number) => t;
const sm = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: string, b: string, t: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t))).getHexString();
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
const Box: React.FC<{p: V3; s: V3; c: string; r?: number; e?: string; ei?: number; rot?: V3; m?: number}> = ({p, s, c, r = 0.8, e, ei = 0, rot = [0, 0, 0], m = 0}) => (
  <mesh position={p} rotation={rot}>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e ?? '#000'} emissiveIntensity={ei} />
  </mesh>
);

// ---------- 1. 噴火（単位 100m）：朝の富士山 → 山頂から噴煙 ----------
const Fields: React.FC<{ash?: number}> = ({ash = 0}) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(2400, 2400, 160, 160).rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const n = fbm3(x * 0.004, 0, z * 0.004, 5, 4);
      p.setY(i, n * 6 - 0.5);
      c.set('#4a6a36').lerp(new THREE.Color('#6a7a42'), Math.max(0, n + 0.3)).lerp(new THREE.Color('#2e4a28'), Math.max(0, -n));
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors roughness={1} color={mix('#ffffff', '#8a8680', ash)} />
    </mesh>
  );
};
// ふもとの町（富士山の手前 約20km）
const TOWN = (() => {
  const r = mulberry32(12);
  return Array.from({length: 220}).map(() => ({p: [(r() - 0.5) * 260, 0, 190 + r() * 90] as V3, w: 0.15 + r() * 0.25, h: 0.1 + r() * 0.5}));
})();
const CAM_1: CamKey[] = [
  {f: 0, pos: [-34, 7, 230], look: [0, 24, 0], fov: 40},
  {f: ERUPT, pos: [-26, 8, 215], look: [0, 28, 0], fov: 40, ease: LIN},
  {f: 240, pos: [15, 14, 380], look: [30, 100, 0], fov: 58},
];
export const F1: React.FC = () => {
  const f = useCurrentFrame();
  const e = f - ERUPT;
  const boom = interpolate(e, [0, 2, 20], [0, 0.6, 0], clamp);
  const dark = sm((e - 40) / 160);
  return (
    <AbsoluteFill>
      <Stage bg="#9fc4e8" shadows={false} fog={['#b8cde0', 400, 2200]}>
        <CameraRig keys={CAM_1} shakes={[{from: ERUPT, dur: 40, amp: 0.8}]} />
        <SkyDome top={mix('#4f8fd8', '#4a4a52', dark)} horizon={mix('#e8d8c0', '#8a7a6a', dark)} sunDir={[0.6, 0.18, 0.4]} sunColor="#ffe0b0" sunPower={14} radius={2000} />
        <hemisphereLight args={[mix('#dfefff', '#8a8a8a', dark), '#4a4a3a', 1.0]} />
        <directionalLight position={[600, 260, 400]} intensity={2.0 - dark * 0.9} color="#ffe8c8" />
        <ambientLight intensity={0.25} />
        <Fields />
        <Fuji />
        {TOWN.map((t, i) => (
          <Box key={i} p={[t.p[0], t.h / 2, t.p[2]]} s={[t.w, t.h, t.w]} c={i % 3 ? '#d8d2c8' : '#9a6a5a'} />
        ))}
        {e >= 0 && <Plume f={e} topH={160} wind={[1, 0, 0.1]} />}
        {e >= 0 && <Lightning f={e} at={[38, 61, 95, 128, 150]} base={[0, FUJI_H, 0]} />}
        {/* 火口の赤い光と、飛び散る噴石 */}
        {e >= 0 && <pointLight position={[0, FUJI_H + 4, 0]} intensity={20000 * Math.max(0.2, 1 - e / 80)} distance={300} color="#ff6a2a" />}
        {e >= 0 &&
          Array.from({length: 60}).map((_, i) => {
            const r = mulberry32(i + 5);
            const a = r() * Math.PI * 2, v = 0.5 + r() * 1.2, up = 1.5 + r() * 2.5;
            const t = (e - Math.floor(r() * 60)) * 0.6;
            if (t < 0) return null;
            const y = FUJI_H + up * t - 0.04 * t * t;
            if (y < FUJI_H * 0.6) return null;
            return (
              <mesh key={'b' + i} position={[Math.cos(a) * v * t, y, Math.sin(a) * v * t]} scale={0.8}>
                <sphereGeometry args={[1, 6, 4]} />
                <meshBasicMaterial color="#ffb060" toneMapped={false} />
              </mesh>
            );
          })}
      </Stage>
      <AbsoluteFill style={{background: '#fff2e0', opacity: boom}} />
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};

// ---------- 2. 地図：灰の雲が東京へ（単位 1km、東京が原点） ----------
const MAPB = {lon0: 135.6, lon1: 142.8, lat0: 32.6, lat1: 40.2};
const [FX, FZ] = toKm(FUJI.lon, FUJI.lat);
const FUJI_M: V3 = [FX, 0, FZ];
const TOKYO_M: V3 = [0, 0, 0];
const MapPlane: React.FC = () => {
  const {tex} = mapTexture(MAPB, 4096, 4096, 0, false, true);
  const [x0, z0] = toKm(MAPB.lon0, MAPB.lat1);
  const [x1, z1] = toKm(MAPB.lon1, MAPB.lat0);
  return (
    <mesh position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[x1 - x0, z1 - z0]} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  );
};
const CAM_2: CamKey[] = [
  {f: 0, pos: [-70, 330, 190], look: [-46, 0, 0], fov: 50},
  {f: 240, pos: [-22, 260, 150], look: [-38, 0, -4], fov: 50, ease: LIN},
];
export const F2: React.FC = () => {
  const f = useCurrentFrame();
  const reach = interpolate(f, [0, 200], [0.08, 1], clamp);
  const dir: V3 = [TOKYO_M[0] - FUJI_M[0], 0, TOKYO_M[2] - FUJI_M[2]];
  const len = Math.hypot(dir[0], dir[2]) * 1.35;
  const pf = project(CAM_2, f, FUJI_M);
  const pt = project(CAM_2, f, TOKYO_M);
  const cf = CO('f2_map', 'fuji'), ct = CO('f2_map', 'tokyo');
  return (
    <AbsoluteFill>
      <Stage bg="#0e2a4e" shadows={false}>
        <CameraRig keys={CAM_2} />
        <ambientLight intensity={1.0} />
        <directionalLight position={[50, 100, 60]} intensity={0.6} />
        <MapPlane />
        {/* 富士山の噴煙の柱（地図の上） */}
        <group position={FUJI_M} scale={0.1}>
          <Plume f={200 + f} topH={160} wind={[1, 0, -0.35]} />
        </group>
        <AshCloud from={FUJI_M} dir={dir} len={len} reach={reach} f={f} />
        <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.4, 4.8, 40]} />
          <meshBasicMaterial color="#ff6a4a" toneMapped={false} />
        </mesh>
      </Stage>
      <CalloutView x={pf.x} y={pf.y} tag={cf.tag} text={cf.text} from={cf.from} to={cf.to} dx={cf.dx} dy={cf.dy} />
      <CalloutView x={pt.x} y={pt.y} tag={ct.tag} text={ct.text} from={ct.from} to={ct.to} dx={ct.dx} dy={ct.dy} />
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};

// ---------- 東京の通り（3・5・7・8 で共通）：単位 m ----------
const TOWERS = (() => {
  const r = mulberry32(8);
  const out: {p: V3; w: number; d: number; h: number; c: string; seed: number}[] = [];
  for (const sx of [-1, 1])
    for (let i = 0; i < 9; i++) out.push({p: [sx * (13 + r() * 2), 0, 10 - i * 14], w: 10, d: 11, h: 14 + r() * 40, c: ['#c9ccd2', '#d8cfc2', '#bfc8cf', '#b8b0a4'][Math.floor(r() * 4)], seed: i + 1});
  return out;
})();
// 灰が積もった度合い ash（0〜1）で、ビル・道路・街路樹が灰色になっていく
const Street: React.FC<{ash: number; lampsOn?: number; trees?: boolean}> = ({ash, lampsOn = 0, trees = true}) => (
  <>
    <Box p={[0, -0.06, -40]} s={[80, 0.1, 140]} c={mix('#b8b4ac', '#9a968e', ash)} />
    <Road length={140} width={8} position={[0, 0, -40]} rotationY={Math.PI / 2} />
    {/* 積もった灰の層（道路の上に重ねる） */}
    {ash > 0.02 && (
      <mesh position={[0, 0.06 + ash * 0.05, -40]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 140]} />
        <meshStandardMaterial color="#8e8a84" roughness={1} transparent opacity={Math.min(0.97, ash * 1.1)} />
      </mesh>
    )}
    {TOWERS.map((t, i) => (
      <group key={i}>
        <Tower position={t.p} w={t.w} d={t.d} h={t.h} color={mix(t.c, '#8a8680', ash * 0.7)} seed={t.seed} />
        {ash > 0.05 && <Box p={[t.p[0], t.h + 0.32 + ash * 0.15, t.p[2]]} s={[t.w * 1.02, ash * 0.3, t.d * 1.02]} c="#a8a49c" r={1} />}
      </group>
    ))}
    {Array.from({length: 8}).map((_, i) => (
      <React.Fragment key={'l' + i}>
        <StreetLamp position={[-5.6, 0, 6 - i * 16]} rotationY={0} on={lampsOn > 0.5} />
        <StreetLamp position={[5.6, 0, -2 - i * 16]} rotationY={Math.PI} on={lampsOn > 0.5} />
        {lampsOn > 0.5 && <pointLight position={[-5.0, 3.1, 6 - i * 16]} intensity={12 * lampsOn} distance={14} color="#ffd9a0" />}
      </React.Fragment>
    ))}
    {trees &&
      Array.from({length: 10}).map((_, i) => (
        <group key={'t' + i} position={[i % 2 ? 7 : -7, 0, 2 - i * 13]}>
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 2.8, 8]} />
            <meshStandardMaterial color="#5a4030" />
          </mesh>
          <mesh position={[0, 3.4, 0]}>
            <icosahedronGeometry args={[1.4, 1]} />
            <meshStandardMaterial color={mix('#4a7a3a', '#9a968e', ash)} flatShading />
          </mesh>
        </group>
      ))}
  </>
);
// 歩く人：歩道を行き来する（口元に手を当てて灰をよける人もいる）
const LANES: Lane[] = (() => {
  const r = mulberry32(14);
  return Array.from({length: 16}).map((_, i) => ({x: (i % 2 ? 1 : -1) * (4.6 + r() * 0.8), z0: -50 + r() * 60, dir: (r() < 0.5 ? 1 : -1) as 1 | -1, speed: 1.1 + r() * 0.5, zMin: -60, zMax: 14}));
})();
const Walkers: React.FC<{f: number; cover?: number; hurry?: number}> = ({f, cover = 0, hurry = 0}) => (
  <>
    {LANES.map((ln, i) => {
      const w = walkAlong({...ln, speed: ln.speed * (1 + hurry * 0.6)}, f);
      const base = walkPose(w.phase, 1 + hurry * 0.3);
      const c = i % 3 !== 2 ? cover : 0;
      const p: Pose = c > 0 ? {...base, rSh: [lerp(base.rSh[0], 1.5, c), lerp(base.rSh[1], -0.35, c)], rEl: lerp(base.rEl, 2.4, c), head: base.head + 0.15 * c} : base;
      return <Human key={i} outfit={OUTFITS[i % OUTFITS.length]} longHair={i % 4 === 1} position={w.pos} rotation={[0, w.ry, 0]} p={p} />;
    })}
  </>
);
const Mask: React.FC<{p: V3; ry: number}> = ({p, ry}) => (
  <group position={p} rotation={[0, ry, 0]}>
    <mesh position={[0, 1.66, 0.09]} scale={[1, 0.75, 0.55]}>
      <sphereGeometry args={[0.075, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#f4f4f4" />
    </mesh>
  </group>
);

// ---------- 3. 約2時間後：昼なのに暗くなり、灰が降りはじめる ----------
const CAM_3: CamKey[] = [
  {f: 0, pos: [1.5, 1.7, 14], look: [0, 6, -40], fov: 56},
  {f: 240, pos: [-1.2, 1.7, 6], look: [0, 4.5, -40], fov: 56, ease: LIN},
];
export const F3: React.FC = () => {
  const f = useCurrentFrame();
  const dark = sm(f / 110);
  const ashK = sm((f - 120) / 110);
  return (
    <AbsoluteFill>
      <Stage bg="#9fc8f0" shadows={false} fog={[mix('#d8e8f4', '#5a524a', dark), 20, lerp(200, 70, dark)]}>
        <CameraRig keys={CAM_3} />
        <SkyDome top={mix('#5aa0e0', '#2a2622', dark)} horizon={mix('#dceaf6', '#6a5e52', dark)} sunDir={[0.3, 0.6, -0.7]} sunColor={mix('#fff4d8', '#8a6a4a', dark)} sunPower={20} />
        <hemisphereLight args={[mix('#eef4ff', '#6a6058', dark), '#3a3a34', 1.1 - dark * 0.35]} />
        <ambientLight intensity={0.3 - dark * 0.15} />
        <directionalLight position={[10, 30, -20]} intensity={1.8 * (1 - dark * 0.85)} color={mix('#fff0d8', '#a08060', dark)} />
        <Street ash={ashK * 0.25} lampsOn={dark > 0.6 ? 1 : 0} />
        <Walkers f={f} cover={sm((f - 130) / 30)} hurry={ashK} />
        <AshFall f={f} center={[0, 6, -6]} size={[24, 14, 30]} count={6000} amount={ashK} />
      </Stage>
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};

// ---------- 4. 数時間後：駅。線路に灰、電車が止まる ----------
const boardTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#101418';
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#ff5a3a';
    g.font = "900 64px 'Noto Sans JP', sans-serif";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('運転見合わせ', 256, 68);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();
const TrainCar: React.FC<{z: number}> = ({z}) => (
  <group position={[-2.2, 0, z]}>
    <Box p={[0, 1.95, 0]} s={[2.9, 2.9, 19.5]} c="#d8dce2" m={0.4} r={0.35} />
    {/* 窓（車内の明かり）とドア */}
    {Array.from({length: 8}).map((_, k) => (
      <Box key={'w' + k} p={[1.46, 2.3, -8.4 + k * 2.4]} s={[0.02, 0.8, 1.5]} c="#1c2430" e="#fff2d0" ei={0.9} />
    ))}
    <Box p={[1.46, 1.25, 0]} s={[0.02, 0.2, 19]} c="#2f8a4a" e="#2f8a4a" ei={0.2} />
    {[-6, 0, 6].map((dz) => (
      <group key={dz}>
        <Box p={[1.47, 1.75, dz]} s={[0.02, 2.0, 1.3]} c="#aeb6c0" m={0.5} />
        <Box p={[1.48, 2.2, dz]} s={[0.02, 0.6, 1.0]} c="#1c2430" e="#fff2d0" ei={0.8} />
      </group>
    ))}
    {/* 屋根に積もった灰 */}
    <Box p={[0, 3.45, 0]} s={[2.8, 0.08, 19.2]} c="#a8a49c" r={1} />
  </group>
);
const CAM_4: CamKey[] = [
  // ホームの端の少し高い所から、止まった電車と、ホームにあふれる人を見る
  {f: 0, pos: [6.2, 3.4, 12], look: [-1.2, 1.2, -12], fov: 52},
  {f: 210, pos: [5.0, 3.0, 8], look: [-1.5, 1.2, -14], fov: 52, ease: LIN},
];
const WAIT = (() => {
  const r = mulberry32(31);
  return Array.from({length: 26}).map((_, i) => ({p: [1.0 + r() * 3.4, 0.95, 4 - r() * 26] as V3, ry: (r() - 0.5) * 2, o: i, phone: r() < 0.5}));
})();
export const F4: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage bg="#5a524a" shadows={false} fog={['#6a625a', 15, 70]}>
        <CameraRig keys={CAM_4} />
        <hemisphereLight args={['#d8d0c4', '#4a4642', 1.0]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[10, 20, 5]} intensity={0.6} color="#c8b090" />
        {/* ホームの屋根の蛍光灯 */}
        {Array.from({length: 7}).map((_, i) => (
          <React.Fragment key={'fl' + i}>
            <Box p={[2.8, 4.18, 6 - i * 6]} s={[0.15, 0.05, 2.2]} c="#ffffff" e="#ffffff" ei={1.2} />
            <pointLight position={[2.8, 3.9, 6 - i * 6]} intensity={14} distance={9} color="#f4f8ff" />
          </React.Fragment>
        ))}
        {/* ホーム・屋根・柱 */}
        <Box p={[2.8, 0.45, -10]} s={[4.4, 0.9, 50]} c="#a8a49c" />
        <Box p={[0.64, 0.92, -10]} s={[0.12, 0.02, 50]} c="#f2d24a" />
        <Box p={[2.8, 4.3, -10]} s={[5.4, 0.15, 50]} c="#7a7e86" />
        {Array.from({length: 8}).map((_, i) => (
          <Box key={i} p={[4.2, 2.6, 8 - i * 6]} s={[0.2, 3.4, 0.2]} c="#8a8e96" />
        ))}
        {[-2, -8, -14].map((z) => (
          <mesh key={z} position={[2.8, 3.7, z]}>
            <planeGeometry args={[1.8, 0.45]} />
            <meshBasicMaterial map={boardTex()} toneMapped={false} />
          </mesh>
        ))}
        {/* 線路（灰で白っぽく） */}
        <Box p={[-2.2, -0.15, -10]} s={[4, 0.3, 60]} c="#8a8680" r={1} />
        {[-2.9, -1.5].map((x) => (
          <Box key={x} p={[x, 0.05, -10]} s={[0.08, 0.1, 60]} c="#9a968e" m={0.4} />
        ))}
        <TrainCar z={-14} />
        <TrainCar z={-34} />
        {WAIT.map((w, i) => (
          <React.Fragment key={i}>
            <Human outfit={OUTFITS[w.o % OUTFITS.length]} longHair={i % 3 === 0} position={w.p} rotation={[0, w.ry + 0.08 * Math.sin(f * 0.04 + i), 0]} p={w.phone ? pose({rSh: [1.1, 0.1], rEl: 1.8, head: 0.4}) : pose({head: 0.05 * Math.sin(f * 0.05 + i), lSh: [0.1, 0.12], rSh: [0.1, 0.12]})} />
            {i % 2 === 0 && <Mask p={w.p} ry={w.ry} />}
          </React.Fragment>
        ))}
        <AshFall f={f} center={[0, 4, -6]} size={[16, 10, 28]} count={3500} amount={0.8} />
      </Stage>
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};

// ---------- 5. 翌日：雨でぬれた灰がぬかるみに。車が進めない ----------
const Car: React.FC<{p: V3; c: string; f: number; spin: number}> = ({p, c, f, spin}) => (
  <group position={p}>
    <Box p={[0, 0.62, 0]} s={[1.8, 0.62, 4.3]} c={c} m={0.5} r={0.35} />
    <Box p={[0, 1.15, -0.25]} s={[1.6, 0.52, 2.3]} c="#2a3040" m={0.6} r={0.15} />
    {/* 灰でよごれた下まわり */}
    <Box p={[0, 0.38, 0]} s={[1.82, 0.14, 4.32]} c="#7a766e" r={1} />
    {[-0.82, 0.82].map((x) =>
      [-1.35, 1.35].map((z) => (
        <group key={`${x}${z}`} position={[x, 0.34, z]} rotation={[f * spin, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.34, 0.34, 0.24, 14]} />
            <meshStandardMaterial color="#141414" />
          </mesh>
          <Box p={[0, 0.2, 0]} s={[0.26, 0.05, 0.05]} c="#6a6a6a" />
        </group>
      )),
    )}
    {[-0.6, 0.6].map((x) => (
      <Box key={x} p={[x, 0.66, 2.16]} s={[0.36, 0.14, 0.02]} c="#fff6dc" e="#fff6dc" ei={1.5} />
    ))}
  </group>
);
const CAM_5: CamKey[] = [
  {f: 0, pos: [9.5, 4.2, 15], look: [0, 0.6, -3], fov: 50},
  {f: 210, pos: [7.5, 3.6, 12], look: [0, 0.6, -3.5], fov: 50, ease: LIN},
];
export const F5: React.FC = () => {
  const f = useCurrentFrame();
  const r = mulberry32(9);
  const spray = Array.from({length: 40}).map((_, i) => {
    const t = ((f * 0.9 + i * 7) % 24) / 24;
    const wx = (i % 2 ? 0.82 : -0.82) * 1.2, wz = i % 4 < 2 ? -1.35 : 1.35;
    return {p: [wx + (r() - 0.5) * 0.3, 0.1 + t * 0.8 - t * t * 0.9, wz - 0.4 - t * 1.6] as V3, o: 1 - t};
  });
  return (
    <AbsoluteFill>
      <Stage bg="#4a4640" shadows={false} fog={['#5a5650', 12, 60]}>
        <CameraRig keys={CAM_5} />
        <hemisphereLight args={['#c8c4bc', '#4a4642', 1.1]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 10, 8]} intensity={0.8} />
        <Street ash={0.85} lampsOn={1} trees />
        {/* ぬかるみ（ぬれた灰）と、たまった水のてかり */}
        <mesh position={[0, 0.12, -10]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10, 60, 40, 120]} />
          <meshStandardMaterial color="#6a665e" roughness={0.25} metalness={0.2} />
        </mesh>
        <Car p={[0, 0.0, 0]} c="#c94f4f" f={f} spin={0.7} />
        <Car p={[3.2, 0.0, -9]} c="#e8e8ea" f={f} spin={0} />
        <Car p={[-0.2, 0.0, -10]} c="#2f3e5c" f={f} spin={0.5} />
        {spray.map((s, i) => (
          <mesh key={i} position={s.p} scale={0.05}>
            <sphereGeometry args={[1, 6, 4]} />
            <meshStandardMaterial color="#5a564e" transparent opacity={s.o} />
          </mesh>
        ))}
        <AshFall f={f} center={[0, 4, 0]} size={[14, 10, 20]} count={5000} amount={1} rain />
      </Stage>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};

// 夜のビル：窓の明かり（L：0 消灯 〜 1 点灯）
const winTex = (() => {
  const cache: Record<number, THREE.CanvasTexture> = {};
  return (seed: number) => {
    if (cache[seed]) return cache[seed];
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#000';
    g.fillRect(0, 0, 64, 128);
    const r = mulberry32(seed + 1);
    for (let y = 3; y < 128; y += 8)
      for (let x = 3; x < 64; x += 8) {
        if (r() < 0.4) continue;
        g.fillStyle = r() < 0.75 ? '#ffd9a0' : '#cfe4ff';
        g.fillRect(x, y, 5, 5);
      }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    cache[seed] = t;
    return t;
  };
})();
const NightBuilding: React.FC<{p: V3; w: number; d: number; h: number; seed: number; L: number}> = ({p, w, d, h, seed, L}) => (
  <mesh position={[p[0], h / 2, p[2]]}>
    <boxGeometry args={[w, h, d]} />
    <meshStandardMaterial color="#30323a" emissive="#ffffff" emissiveMap={winTex(seed % 6)} emissiveIntensity={1.0 * L} roughness={0.8} />
  </mesh>
);
// ---------- 6. 数日後：夕方の街。灰と雨で、明かりが区画ごとに消えていく ----------
const NIGHT_BLOCK = (() => {
  const r = mulberry32(51);
  const out: {p: V3; w: number; d: number; h: number; seed: number; off: number}[] = [];
  for (let x = -120; x <= 120; x += 22)
    for (let z = -300; z <= -40; z += 22) {
      if (Math.abs(x) < 12) continue;
      out.push({p: [x + (r() - 0.5) * 6, 0, z + (r() - 0.5) * 6], w: 12 + r() * 6, d: 12 + r() * 6, h: 20 + r() * 70, seed: Math.floor(r() * 50), off: 30 + Math.floor(((x + 120) / 240) * 120 + r() * 30)});
    }
  return out;
})();
const CAM_6: CamKey[] = [
  // 高い所から街全体を見下ろす（明かりが区画ごとに消えていくのがわかるように）
  {f: 0, pos: [10, 175, 80], look: [0, 0, -170], fov: 52},
  {f: 210, pos: [-20, 160, 60], look: [0, 0, -175], fov: 52, ease: LIN},
];
export const F6: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage bg="#1a1a22" shadows={false} fog={['#2a2622', 300, 520]}>
        <CameraRig keys={CAM_6} />
        <SkyDome top="#14141a" horizon="#4a3e36" radius={480} />
        <hemisphereLight args={['#8a8480', '#2a2828', 0.7]} />
        <ambientLight intensity={0.25} />
        <Box p={[0, -0.1, -170]} s={[400, 0.2, 400]} c="#4a4640" />
        {NIGHT_BLOCK.map((b, i) => {
          const lit = f < b.off ? 1 : Math.max(0, 1 - (f - b.off) / 6) * (f - b.off < 6 && (f - b.off) % 2 === 0 ? 1 : 0.6);
          const L = f < b.off ? 1 : i % 9 === 0 ? 0.3 : lit * 0.15;
          return (
            <group key={i}>
              <NightBuilding p={b.p} w={b.w} d={b.d} h={b.h} seed={b.seed} L={L} />
              {/* 足元の街明かり */}
              <mesh position={[b.p[0], 0.2, b.p[2] + b.d / 2 + 3]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[b.w + 6, 6]} />
                <meshBasicMaterial color="#ffb060" transparent opacity={0.45 * L} depthWrite={false} toneMapped={false} />
              </mesh>
            </group>
          );
        })}
        <AshFall f={f} center={[0, 40, 40]} size={[120, 80, 80]} count={6000} amount={1} rain />
      </Stage>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};

// ---------- 7. 約2週間後：灰に埋もれた街。マスク姿で片付ける ----------
const SHOVEL = (t: number): Pose => {
  const s = (Math.sin(t) + 1) / 2;
  return pose({spine: 0.3 + 0.35 * s, head: 0.3, lSh: [0.6 + 0.5 * s, 0.1], rSh: [0.4 + 0.6 * s, -0.1], lEl: 0.7, rEl: 0.9, lKn: 0.2 + 0.25 * s, rKn: 0.3 + 0.25 * s, lHip: [0.3 * s, 0.1], rHip: [0.4 * s, 0.1]});
};
const ShovelTool: React.FC = () => (
  <group position={[0, -0.05, 0.05]}>
    <mesh position={[0, -0.45, 0]}>
      <cylinderGeometry args={[0.018, 0.018, 1.1, 6]} />
      <meshStandardMaterial color="#8a6a48" />
    </mesh>
    <Box p={[0, -1.05, 0.05]} s={[0.22, 0.3, 0.03]} c="#5a6a7a" m={0.5} />
  </group>
);
const WORKERS = (() => {
  const r = mulberry32(61);
  return Array.from({length: 9}).map((_, i) => ({p: [(r() - 0.5) * 9, 0.22, 4 - i * 3.2 - r()] as V3, ry: r() * Math.PI * 2, ph: r() * 6, o: i}));
})();
const BAGS = (() => {
  const r = mulberry32(71);
  return Array.from({length: 40}).map(() => ({p: [(r() < 0.5 ? -1 : 1) * (5.2 + r() * 1.4), 0.25 + 0.3, 6 - r() * 36] as V3, ry: r() * 3}));
})();
const CAM_7: CamKey[] = [
  {f: 0, pos: [3.5, 3.0, 12], look: [0, 1.0, -10], fov: 52},
  {f: 240, pos: [-2.5, 2.4, 8], look: [0, 1.0, -12], fov: 52, ease: LIN},
];
export const F7: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage bg="#8a8680" shadows={false} fog={['#9a948c', 25, 120]}>
        <CameraRig keys={CAM_7} />
        <SkyDome top="#7a766e" horizon="#b8b0a4" />
        <hemisphereLight args={['#d8d2c8', '#5a5650', 1.0]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 20, 10]} intensity={0.7} color="#e8dcc8" />
        <Street ash={1} trees />
        {/* 道の両わきの灰の山 */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 4.2, 0, -30]} scale={[1.4, 0.5, 40]}>
            <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#a29e96" roughness={1} />
          </mesh>
        ))}
        {BAGS.map((b, i) => (
          <mesh key={i} position={b.p} rotation={[0, b.ry, 0]} scale={[0.5, 0.42, 0.38]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color="#e8e4dc" roughness={0.8} />
          </mesh>
        ))}
        {WORKERS.map((w, i) => (
          <React.Fragment key={i}>
            <Human outfit={OUTFITS[w.o % OUTFITS.length]} position={w.p} rotation={[0, w.ry, 0]} p={SHOVEL(f * 0.18 + w.ph)} rHand={<ShovelTool />} />
            <Mask p={w.p} ry={w.ry} />
          </React.Fragment>
        ))}
        <AshFall f={f} center={[0, 6, -4]} size={[24, 12, 30]} count={2500} amount={0.6} />
      </Stage>
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};

// ---------- 8. 灰をかぶったビルの屋上から、遠くの富士山を見る ----------
// カメラの描画距離（500）に収まるよう、遠くの景色は縮めて置く（見かけの大きさがそれらしく見える位置）
const LOWCITY = (() => {
  const r = mulberry32(81);
  return Array.from({length: 260}).map(() => ({p: [(r() - 0.5) * 520, 0, -60 - r() * 300] as V3, w: 4 + r() * 6, h: 2 + r() * 10}));
})();
const CAM_8: CamKey[] = [
  {f: 0, pos: [1.2, 32.6, 1.2], look: [-30, 32, -440], fov: 30},
  {f: 210, pos: [1.0, 32.5, -0.6], look: [-33, 34, -440], fov: 24, ease: LIN},
];
export const F8: React.FC = () => {
  const f = useCurrentFrame();
  const ROOF = 30;
  return (
    <AbsoluteFill>
      <Stage bg="#c8bca8" shadows={false} fog={['#c4b8a6', 120, 620]}>
        <CameraRig keys={CAM_8} />
        <SkyDome top="#8a8a92" horizon="#d8ccb8" sunDir={[-0.3, 0.12, -1]} sunColor="#ffe0b0" sunPower={10} radius={480} />
        <hemisphereLight args={['#e8e0d4', '#6a665e', 1.0]} />
        <directionalLight position={[-100, 120, -300]} intensity={1.2} color="#ffe8c8" />
        <ambientLight intensity={0.3} />
        {/* 自分が立つビルの屋上（灰が積もっている）と手すり */}
        <Box p={[0, ROOF / 2, 0]} s={[16, ROOF, 16]} c="#8a8680" />
        <Box p={[0, ROOF + 0.08, 0]} s={[16, 0.16, 16]} c="#bcb6ac" r={1} />
        <Box p={[0, ROOF + 0.55, -7.8]} s={[16, 0.06, 0.06]} c="#6a6e76" m={0.5} />
        {Array.from({length: 9}).map((_, i) => (
          <Box key={i} p={[-8 + i * 2, ROOF + 0.3, -7.8]} s={[0.05, 0.6, 0.05]} c="#6a6e76" />
        ))}
        {/* マスクをして、富士山のほうを見つめる人（背中） */}
        <Human outfit={{shirt: '#4a5468', pants: '#2a2f3a', skin: '#e3b08e', hair: '#1c1714'}} position={[0.4, ROOF + 0.16, -5.6]} rotation={[0, Math.PI - 0.08, 0]} p={pose({head: -0.05, lSh: [0.1, 0.12], rSh: [0.1, 0.12]})} />
        {/* 灰色になった遠くの街並み */}
        <Box p={[0, -0.1, -260]} s={[900, 0.2, 520]} c="#a29e96" />
        {LOWCITY.map((b, i) => (
          <Box key={i} p={[b.p[0], b.h / 2, b.p[2]]} s={[b.w, b.h, b.w]} c={i % 3 ? '#a8a49c' : '#98948c'} />
        ))}
        {/* 遠くの富士山と、まだ続く噴煙 */}
        <group position={[-36, -2, -440]} scale={0.55}>
          <Fuji ash={0.5} />
          <Plume f={600 + f} topH={70} wind={[1, 0, 0.2]} />
        </group>
        <AshFall f={f} center={[0, ROOF + 3, -2]} size={[14, 8, 14]} count={1500} amount={0.5} />
      </Stage>
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};
