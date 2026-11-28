import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {Human, OUTFITS, Pose, pose, walkPose} from '../three/Human';
import {Road, SkyDome, Tower} from '../three/Landscape';
import {Vignette} from './Overlay';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const LIN = (t: number) => t;
const sm = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const Box: React.FC<{p: V3; s: V3; c: string; r?: number; e?: string; ei?: number; rot?: V3}> = ({p, s, c, r = 0.8, e, ei = 0, rot = [0, 0, 0]}) => (
  <mesh position={p} rotation={rot}>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} roughness={r} emissive={e ?? '#000'} emissiveIntensity={ei} />
  </mesh>
);

// ---------- ポテチの袋（しぼむ・ふくらむ・はじける） ----------
const bagTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 256;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#f2c14e';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#d8402f';
    g.fillRect(0, 90, 256, 70);
    g.fillStyle = '#ffffff';
    g.font = "900 46px 'Noto Sans JP', sans-serif";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('ポテト', 128, 126);
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();
const Bag: React.FC<{p: V3; puff: number; f: number; rot?: number}> = ({p, puff, f, rot = 0}) => {
  // puff：1 ふつう・0.4 しぼむ・1.5 パンパン
  const wr = puff < 1 ? (1 - puff) * 0.25 : 0;
  return (
    <group position={p} rotation={[wr * Math.sin(f * 0.3), rot, wr * Math.cos(f * 0.25)]}>
      <mesh scale={[0.22 * (1 + (puff - 1) * 0.15), 0.3, 0.09 * puff]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial map={bagTex()} roughness={0.35} metalness={0.2} />
      </mesh>
      {[-1, 1].map((s) => (
        <Box key={s} p={[0, s * 0.3, 0]} s={[0.44 * (1 + (puff - 1) * 0.15), 0.03, 0.02]} c="#e0b040" />
      ))}
    </group>
  );
};

// ---------- 街（日中） ----------
const Street: React.FC<{f: number; haze?: number; walkers?: (i: number) => Pose; people?: number}> = ({f, haze = 0, walkers, people = 10}) => {
  const towers = useMemo(() => {
    const r = mulberry32(4);
    return Array.from({length: 14}).map((_, i) => ({p: [(i % 2 ? 1 : -1) * (6 + r() * 2), 0, -4 - Math.floor(i / 2) * 6] as V3, h: 6 + r() * 14, c: ['#c9ccd2', '#d8cfc2', '#bfc8cf'][i % 3], seed: i + 1}));
  }, []);
  const ppl = useMemo(() => {
    const r = mulberry32(9);
    return Array.from({length: people}).map((_, i) => ({x: (r() - 0.5) * 6, z: -1 - r() * 14, ry: r() * 6, o: i}));
  }, [people]);
  const top = '#' + new THREE.Color('#5aa8e8').lerp(new THREE.Color('#c8a860'), haze).getHexString();
  const hz = '#' + new THREE.Color('#d8eefa').lerp(new THREE.Color('#e8c880'), haze).getHexString();
  return (
    <>
      <SkyDome top={top} horizon={hz} sunDir={[0.3, 0.7, -0.6]} />
      {haze > 0 && <fog attach="fog" args={[hz, 8, 60 - haze * 40]} />}
      <hemisphereLight args={[hz, '#6a6a60', 1.0]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[8, 14, 6]} intensity={1.8 * (1 - haze * 0.4)} color="#fff0d8" />
      <Box p={[0, -0.06, -20]} s={[40, 0.1, 80]} c="#b8b4ac" />
      <Road length={80} width={4.4} position={[0, 0, -20]} rotationY={Math.PI / 2} />
      {towers.map((t, i) => (
        <Tower key={i} position={t.p} w={4} d={5} h={t.h} color={t.c} seed={t.seed} />
      ))}
      {ppl.map((pp, i) => (
        <Human key={i} outfit={OUTFITS[pp.o % OUTFITS.length]} position={[pp.x, 0, pp.z]} rotation={[0, pp.ry + (walkers ? 0.3 * Math.sin(f * 0.05 + i) : 0), 0]} p={walkers ? walkers(i) : walkPose(f * 0.3 + i, 0)} />
      ))}
    </>
  );
};

// ---------- 1. 1気圧 ----------
const CAM_1: CamKey[] = [
  {f: 0, pos: [1.5, 2.4, 9], look: [0, 4, -30], fov: 56},
  {f: 150, pos: [-0.5, 2.2, 7], look: [0, 4.5, -30], fov: 56, ease: LIN},
];
export const P1: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage bg="#9fc8f0" shadows={false}>
        <CameraRig keys={CAM_1} />
        <Street f={f} walkers={(i) => walkPose(f * 0.3 + i, 1)} />
      </Stage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 2. 1.5気圧：袋がしぼむ ----------
const Table: React.FC = () => (
  <>
    <hemisphereLight args={['#fff6e8', '#8a7a68', 1.15]} />
    <ambientLight intensity={0.3} />
    <directionalLight position={[3, 4, 4]} intensity={1.3} color="#fff0d8" />
    <Box p={[0, -0.05, 0]} s={[10, 0.1, 10]} c="#b48a62" />
    <Box p={[0, 1.6, -2.0]} s={[10, 3.4, 0.1]} c="#efe8dc" />
    <Box p={[0, 0.72, 0]} s={[1.6, 0.05, 0.9]} c="#c9a882" />
  </>
);
const CAM_2: CamKey[] = [
  {f: 0, pos: [0.9, 1.5, 2.4], look: [0, 0.95, 0], fov: 46},
  {f: 150, pos: [-0.4, 1.35, 2.0], look: [0, 0.95, 0], fov: 46, ease: LIN},
];
export const P2: React.FC = () => {
  const f = useCurrentFrame();
  const puff = interpolate(f, [20, 110], [1, 0.35], {...clamp, easing: (x) => x * x * (3 - 2 * x)});
  return (
    <AbsoluteFill>
      <Stage bg="#efe8dc" shadows={false}>
        <CameraRig keys={CAM_2} />
        <Table />
        <Bag p={[0, 0.98, 0]} puff={puff} f={f} rot={0.2} />
      </Stage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 3. 2気圧：耳がキーン・お湯が沸かない ----------
const CAM_3: CamKey[] = [
  {f: 0, pos: [1.0, 1.7, 3.6], look: [-0.1, 1.0, -0.1], fov: 50},
  {f: 180, pos: [0.2, 1.6, 3.2], look: [-0.1, 1.0, -0.1], fov: 50, ease: LIN},
];
const EARS: Pose = pose({lSh: [1.7, 0.75], rSh: [1.7, 0.75], lEl: 2.5, rEl: 2.5, head: 0.2, spine: 0.15});
export const P3: React.FC = () => {
  const f = useCurrentFrame();
  const boil = f > 150 ? 1 : 0;
  return (
    <AbsoluteFill>
      <Stage bg="#efe8dc" shadows={false}>
        <CameraRig keys={CAM_3} />
        <Table />
        {/* コンロと鍋 */}
        <Box p={[0.4, 0.78, -0.1]} s={[0.5, 0.06, 0.4]} c="#3d4250" />
        <mesh position={[0.4, 0.92, -0.1]}>
          <cylinderGeometry args={[0.16, 0.14, 0.2, 20]} />
          <meshStandardMaterial color="#b8bcc4" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.4, 1.0, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.15, 20]} />
          <meshStandardMaterial color="#8fd0f0" />
        </mesh>
        {/* 炎 */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[0.4 + Math.cos(i) * 0.1, 0.83, -0.1 + Math.sin(i) * 0.1]} scale={[1, 1 + 0.3 * Math.sin(f * 0.8 + i), 1]}>
            <coneGeometry args={[0.02, 0.06, 6]} />
            <meshBasicMaterial color="#4f8fff" />
          </mesh>
        ))}
        {/* 小さな泡 → ずっと沸かない（最後だけ沸く） */}
        {Array.from({length: boil ? 14 : 3}).map((_, i) => {
          const t = ((f * 0.05 + i * 0.17) % 1);
          return (
            <mesh key={'b' + i} position={[0.4 + Math.cos(i * 2.1) * 0.08, 1.0 + t * 0.03, -0.1 + Math.sin(i * 1.7) * 0.08]} scale={0.012 + boil * 0.01}>
              <sphereGeometry args={[1, 6, 4]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          );
        })}
        <Human outfit={OUTFITS[0]} position={[-0.5, 0, 0.3]} rotation={[0, 0.5, 0]} p={{...EARS, twist: 0.15 * Math.sin(f * 0.15)}} />
      </Stage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 4. 3気圧：打球が失速する ----------
const CAM_4: CamKey[] = [
  {f: 0, pos: [-3.2, 1.9, 3.8], look: [-0.2, 1.2, -1.2], fov: 52},
  {f: 180, pos: [-3.0, 2.6, 3.0], look: [0.8, 1.0, -5], fov: 52, ease: LIN},
];
export const P4: React.FC = () => {
  const f = useCurrentFrame();
  const swing = sm((f - 30) / 6);
  const hit = 36;
  const t = Math.max(0, f - hit);
  // 空気の抵抗が大きいので、すぐに失速して落ちる
  const k = 0.06;
  const dist = (45 / k) * (1 - Math.exp(-k * t / 2)) / 30;
  const ball: V3 = t > 0 ? [dist * 0.35, Math.max(0.05, 1.0 + t * 0.06 - 0.0016 * t * t * 1.6), -dist] : [0.4, 1.0, 0.2];
  const p = pose({rSh: [lerp(0.8, 1.6, swing), lerp(0.9, -0.3, swing)], lSh: [lerp(1.2, 1.4, swing), lerp(-0.6, 0.5, swing)], rEl: 0.6, lEl: 0.5, twist: lerp(0.8, -0.9, swing), lKn: 0.25, rKn: 0.15, head: 0.1});
  return (
    <AbsoluteFill>
      <Stage bg="#9fc8f0" shadows={false}>
        <CameraRig keys={CAM_4} />
        <SkyDome top="#4f9be0" horizon="#d8eefa" sunDir={[0.3, 0.7, -0.6]} />
        <hemisphereLight args={['#dff0ff', '#6a8a50', 1.1]} />
        <directionalLight position={[6, 12, 4]} intensity={1.8} />
        <Box p={[0, -0.06, -20]} s={[80, 0.1, 80]} c="#5f9a48" />
        <mesh position={[0, 0.0, -6]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <planeGeometry args={[12, 12]} />
          <meshStandardMaterial color="#b8905e" />
        </mesh>
        <Box p={[0, 3, -60]} s={[80, 6, 1]} c="#2f5a3a" />
        <Human outfit={{shirt: '#f0f0f0', pants: '#f0f0f0', skin: '#e3b08e', hair: '#1c1714'}} position={[0, 0, 0]} rotation={[0, -Math.PI / 2, 0]} p={p} rHand={<mesh position={[0, -0.1, 0.4]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.03, 0.02, 0.85, 8]} /><meshStandardMaterial color="#c8a070" /></mesh>} />
        <mesh position={ball}>
          <sphereGeometry args={[0.06, 12, 10]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </Stage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 5. 4気圧：窒素酔い ----------
const CAM_5: CamKey[] = [
  {f: 0, pos: [1.5, 2.0, 6], look: [0, 1.4, -6], fov: 54},
  {f: 180, pos: [-1.0, 1.9, 4.5], look: [0, 1.4, -6], fov: 54, ease: LIN},
];
const tipsy = (f: number, i: number): Pose =>
  pose({spine: 0.15 * Math.sin(f * 0.07 + i), twist: 0.3 * Math.sin(f * 0.05 + i * 2), head: -0.2 + 0.25 * Math.sin(f * 0.09 + i), lSh: [0.6 + 0.6 * Math.sin(f * 0.11 + i), 0.6], rSh: [0.5 + 0.6 * Math.cos(f * 0.1 + i), 0.7], lEl: 0.8, rEl: 0.9, lKn: 0.2 + 0.15 * Math.sin(f * 0.13 + i), rKn: 0.2, lHip: [0.2 * Math.sin(f * 0.1 + i), 0.15], rHip: [-0.1, 0.12]});
export const P5: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage bg="#9fc8f0" shadows={false}>
        <CameraRig keys={CAM_5} roll={(fr) => 0.04 * Math.sin(fr * 0.06)} />
        <Street f={f} walkers={(i) => tipsy(f, i)} people={14} />
      </Stage>
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};

// ---------- 6. 8気圧：酸素が毒に → マスク ----------
const CAM_6: CamKey[] = [
  {f: 0, pos: [0.8, 1.8, 4.5], look: [0, 1.5, -3], fov: 52},
  {f: 150, pos: [-0.6, 1.7, 3.6], look: [0, 1.5, -3], fov: 52, ease: LIN},
];
export const P6: React.FC = () => {
  const f = useCurrentFrame();
  const people = useMemo(() => {
    const r = mulberry32(21);
    return Array.from({length: 7}).map((_, i) => ({p: [(i - 3) * 0.9 + (r() - 0.5) * 0.3, 0, -1 - r() * 3] as V3, o: i, d: r() * 40}));
  }, []);
  return (
    <AbsoluteFill>
      <Stage bg="#9fc8f0" shadows={false}>
        <CameraRig keys={CAM_6} />
        <Street f={f} people={0} haze={0.15} />
        {people.map((pp, i) => {
          const k = sm((f - 20 - pp.d) / 14);
          const p = lerpPose(pose({spine: 0.25, head: 0.2, lSh: [0.6, 0.3], rSh: [1.6, 0.3], rEl: 2.0}), pose({lSh: [1.5, -0.2], rSh: [1.5, -0.2], lEl: 2.4, rEl: 2.4, head: 0}), k);
          return (
            <group key={i} position={pp.p}>
              <Human outfit={OUTFITS[pp.o % OUTFITS.length]} p={p} />
              {/* 口元のマスク */}
              <mesh position={[0, 1.67, 0.1 - (1 - k) * 0.3]} scale={[1, 0.8, 0.6]} visible={k > 0.05}>
                <sphereGeometry args={[0.065, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#f4f4f4" />
              </mesh>
            </group>
          );
        })}
      </Stage>
      <Vignette strength={0.3} />
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

// ---------- 7. 92気圧：空き缶がつぶれ、空がかすむ ----------
const CAM_7: CamKey[] = [
  {f: 0, pos: [0.8, 0.6, 2.2], look: [0, 0.2, -1], fov: 52},
  {f: 180, pos: [0.2, 1.8, 5.5], look: [0, 2.5, -20], fov: 56, ease: LIN},
];
export const P7: React.FC = () => {
  const f = useCurrentFrame();
  const haze = interpolate(f, [0, 120], [0.3, 1], clamp);
  return (
    <AbsoluteFill>
      <Stage bg="#e8c880" shadows={false}>
        <CameraRig keys={CAM_7} />
        <Street f={f} people={0} haze={haze} />
        {[-0.4, 0, 0.45].map((x, i) => {
          const crush = sm((f - 15 - i * 12) / 8);
          return (
            <mesh key={i} position={[x, 0.06 * (1 - crush * 0.8), -0.8 - i * 0.2]} rotation={[0, i, crush * 0.3]} scale={[1 + crush * 0.4, 1 - crush * 0.8, 1 + crush * 0.3]}>
              <cylinderGeometry args={[0.033, 0.033, 0.12, 14]} />
              <meshStandardMaterial color={['#d8402f', '#4f7fc9', '#c8ccd2'][i]} metalness={0.7} roughness={0.3} />
            </mesh>
          );
        })}
      </Stage>
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};

// ---------- 8. 気圧が戻って、世界中の袋が「パン！」 ----------
const CAM_8: CamKey[] = [
  {f: 0, pos: [0, 1.3, 2.4], look: [0, 1.1, -0.6], fov: 52},
  {f: 180, pos: [0.6, 1.4, 3.2], look: [0, 1.1, -0.6], fov: 52, ease: LIN},
];
const SHELF_BAGS = (() => {
  const out: V3[] = [];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) out.push([-1.25 + i * 0.5, 0.55 + row * 0.62, -0.6]);
  return out;
})();
export const P8: React.FC = () => {
  const f = useCurrentFrame();
  // 30で気圧が戻る → ふくらむ → 60で はじける
  const puff = f < 30 ? 0.35 : f < 58 ? lerp(0.35, 1.6, sm((f - 30) / 26)) : 0;
  const flash = interpolate(f, [58, 60, 70], [0, 0.85, 0], clamp);
  const chips = useMemo(() => {
    const r = mulberry32(31);
    return SHELF_BAGS.flatMap((b) => Array.from({length: 6}).map(() => ({b, v: [(r() - 0.5) * 2.4, r() * 2.4 + 0.6, r() * 2.2] as V3, s: r() * 6})));
  }, []);
  return (
    <AbsoluteFill>
      <Stage bg="#f2f2ee" shadows={false}>
        <CameraRig keys={CAM_8} shakes={[{from: 58, dur: 14, amp: 0.06}]} />
        <hemisphereLight args={['#ffffff', '#bdbdb6', 1.2]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 6, 5]} intensity={1.0} />
        <Box p={[0, -0.05, 0]} s={[10, 0.1, 10]} c="#e8e6e0" />
        <Box p={[0, 1.6, -1.0]} s={[10, 3.4, 0.1]} c="#f4f4f0" />
        {[0, 1, 2].map((row) => (
          <Box key={row} p={[0, 0.22 + row * 0.62, -0.6]} s={[3.2, 0.04, 0.5]} c="#c8ccd2" />
        ))}
        {f < 60 && SHELF_BAGS.map((b, i) => <Bag key={i} p={b} puff={puff} f={f + i * 7} rot={(i % 3) * 0.1 - 0.1} />)}
        {f >= 60 &&
          chips.map((c, i) => {
            const t = (f - 60) / 30;
            return (
              <mesh key={i} position={[c.b[0] + c.v[0] * t, c.b[1] + c.v[1] * t - 4.9 * t * t * 0.6, c.b[2] + c.v[2] * t]} rotation={[c.s + t * 6, c.s * 2, t * 4]}>
                <cylinderGeometry args={[0.04, 0.04, 0.006, 10]} />
                <meshStandardMaterial color="#f2c860" />
              </mesh>
            );
          })}
        {f >= 60 &&
          SHELF_BAGS.map((b, i) => (
            <mesh key={'r' + i} position={[b[0], b[1] - 0.2, b[2]]} rotation={[0.3, i, 0.2]} scale={[0.2, 0.02, 0.15]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#f2c14e" />
            </mesh>
          ))}
      </Stage>
      <AbsoluteFill style={{background: '#ffffff', opacity: flash}} />
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};
