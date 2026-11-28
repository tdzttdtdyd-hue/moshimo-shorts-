import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3} from '../lib/anim';
import {project} from '../lib/project';
import {Human, Outfit, Pose, pose} from '../three/Human';
import {Vignette, emWidth} from './Overlay';
import {Bubble, SCENES} from './script';
import {SANS} from '../theme';

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
const Box: React.FC<{p: V3; s: V3; c: string; r?: number; e?: string; ei?: number; rot?: V3; m?: number}> = ({p, s, c, r = 0.8, e, ei = 0, rot = [0, 0, 0], m = 0}) => (
  <mesh position={p} rotation={rot}>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e ?? '#000'} emissiveIntensity={ei} />
  </mesh>
);
const Cyl: React.FC<{p: V3; r: number; h: number; c: string; r2?: number; rot?: V3; seg?: number}> = ({p, r, h, c, r2, rot = [0, 0, 0], seg = 20}) => (
  <mesh position={p} rotation={rot}>
    <cylinderGeometry args={[r, r2 ?? r, h, seg]} />
    <meshStandardMaterial color={c} roughness={0.7} />
  </mesh>
);

// ---------- 登場人物 ----------
// 主人公：紺のスーツの会社員
const ME: Outfit = {shirt: '#34425e', pants: '#2a2f3a', skin: '#e3b08e', hair: '#1c1714', shoes: '#1a1a1e'};
const WIFE: Outfit = {shirt: '#8fb4d0', pants: '#6a6a80', skin: '#f0c9ae', hair: '#3a2a20', shoes: '#c8a890'};
const BOSS: Outfit = {shirt: '#5a5e66', pants: '#3a3d44', skin: '#d6a27f', hair: '#9a9a9a', shoes: '#1a1a1e'};
const JUNIOR: Outfit = {shirt: '#7a9ac4', pants: '#3a3d44', skin: '#f0c9ae', hair: '#5a3b26', shoes: '#1a1a1e'};
const CLIENT: Outfit = {shirt: '#6a5040', pants: '#3a3028', skin: '#e3b08e', hair: '#2b211c', shoes: '#1a1a1e'};
const CLERK: Outfit = {shirt: '#3f8f6a', pants: '#2a2f3a', skin: '#e9b99a', hair: '#2b211c', shoes: '#1a1a1e'};
const CHILD: Outfit = {shirt: '#f2d26a', pants: '#f2d26a', skin: '#f2cfb4', hair: '#2b211c', shoes: '#f2cfb4'};
const RIDERS: Outfit[] = [
  {shirt: '#c94f4f', pants: '#3b3b44', skin: '#d6a27f', hair: '#1c1714'},
  {shirt: '#4f7fc9', pants: '#c8b79a', skin: '#f0c9ae', hair: '#5a3b26'},
  {shirt: '#e8eef5', pants: '#2f3e5c', skin: '#e9b99a', hair: '#2b211c'},
  {shirt: '#5aa36e', pants: '#4a3f35', skin: '#e3b08e', hair: '#3a2a20'},
  {shirt: '#9b6fc9', pants: '#26303d', skin: '#f2d0b8', hair: '#8a5a2b'},
  {shirt: '#f2c14e', pants: '#30343f', skin: '#b98161', hair: '#141110'},
];

// いすの座面 0.46m。腰（0.93）が座面にのるよう y を下げる
const SEAT_Y = 0.46;
const sitY = (scale = 1) => SEAT_Y - 0.93 * scale + 0.06;
const SEATED: Pose = pose({lHip: [1.5, 0.08], rHip: [1.5, 0.08], lKn: 1.5, rKn: 1.5, lSh: [0.5, 0.12], rSh: [0.5, 0.12], lEl: 1.0, rEl: 1.0});
const HEAD = 1.78; // 立っている人の頭の上
const HEAD_SIT = 1.32; // 座っている人の頭の上

// ---------- 吹き出し（セリフ＝角つき／心の声＝雲形・点線） ----------
const BubbleView: React.FC<{b: Bubble; x: number; y: number; f: number}> = ({b, x, y, f}) => {
  if (f < b.from || f >= b.to || !Number.isFinite(x)) return null;
  const k = interpolate(f, [b.from, b.from + 7, b.to - 7, b.to], [0, 1, 1, 0], clamp);
  const pop = 1 + 0.08 * Math.max(0, 1 - (f - b.from) / 7);
  const lines = b.text.split('\n');
  const maxEm = Math.max(...lines.map((l) => emWidth(l)));
  const size = Math.min(48, Math.floor(560 / maxEm));
  const w = maxEm * size + 72;
  const h = lines.length * size * 1.3 + 42;
  const think = b.kind === 'think';
  // 置き場所は台本で決めた位置。はみ出さないよう左右だけ念のため収める
  const bx = Math.min(1080 - 160 - w * 1.06, Math.max(60 + w * 0.04, b.at[0] - w / 2));
  const by = b.at[1];
  const ax = bx + w / 2;
  const ay = by + h;
  // しっぽの先：話している人の頭の少し上
  const tx = x, ty = y - 16;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, opacity: k, pointerEvents: 'none'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        {think ? (
          // 心の声：小さな丸が3つ、頭に向かって小さくなる
          [0, 1, 2].map((i) => {
            const t = (i + 1) / 4;
            const cx = lerp(Math.min(bx + w - 40, Math.max(bx + 40, tx)), tx, t);
            const cy = lerp(ay + 6, ty, t);
            return <circle key={i} cx={cx} cy={cy} r={15 - i * 4} fill="#ffffff" stroke="rgba(0,0,0,0.3)" strokeWidth={2} strokeDasharray="5 4" />;
          })
        ) : (
          <path d={`M ${Math.min(bx + w - 46, Math.max(bx + 46, tx)) - 18} ${ay - 2} L ${tx} ${Math.min(ty, ay + 90)} L ${Math.min(bx + w - 46, Math.max(bx + 46, tx)) + 18} ${ay - 2} Z`} fill="#ffffff" stroke="rgba(0,0,0,0.25)" strokeWidth={2} />
        )}
      </svg>
      <div
        data-telop="callout"
        style={{
          position: 'absolute',
          left: bx,
          top: by,
          width: w,
          height: h,
          boxSizing: 'border-box',
          transform: `scale(${pop})`,
          transformOrigin: `${ax - bx}px ${h}px`,
          background: think ? '#f6f8ff' : '#ffffff',
          borderRadius: think ? Math.min(h / 2, 60) : 28,
          border: think ? '3px dashed rgba(60,70,110,0.45)' : '2px solid rgba(0,0,0,0.2)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.3,
          color: think ? '#2a3a6a' : '#1d1d22',
          whiteSpace: 'pre',
        }}
      >
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
};
const Bubbles: React.FC<{id: string; f: number; cam: CamKey[]; heads: Record<string, V3>}> = ({id, f, cam, heads}) => (
  <>
    {(spec(id).bubbles ?? []).map((b, i) => {
      const pt = project(cam, f, heads[b.who]);
      return <BubbleView key={i} b={b} x={pt.x} y={pt.y} f={f} />;
    })}
  </>
);

// ---------- 共通のセット ----------
const Room: React.FC<{wall?: string; floor?: string; night?: boolean; office?: boolean}> = ({wall = '#efe8dc', floor = '#b48a62', night, office}) => (
  <>
    <hemisphereLight args={[night ? '#ffe2b8' : '#fff6e8', '#7a6a58', night ? 0.75 : 1.1]} />
    <ambientLight intensity={0.3} />
    <directionalLight position={[3, 4, 5]} intensity={night ? 0.5 : 1.2} color={office ? '#ffffff' : '#fff0d8'} />
    {night && <pointLight position={[0, 2.5, 0.8]} intensity={5} distance={8} decay={1.4} color="#ffd9a8" />}
    <Box p={[0, -0.05, 0]} s={[14, 0.1, 14]} c={floor} r={0.7} />
    <Box p={[0, 1.7, -2.6]} s={[14, 3.6, 0.1]} c={wall} />
    <Box p={[-3.4, 1.7, 0]} s={[0.1, 3.6, 14]} c={wall} />
  </>
);
const Chair: React.FC<{p: V3; ry: number; c?: string}> = ({p, ry, c = '#6b4f3a'}) => (
  <group position={p} rotation={[0, ry, 0]}>
    <Box p={[0, SEAT_Y - 0.03, 0]} s={[0.44, 0.05, 0.44]} c={c} />
    <Box p={[0, 0.75, -0.2]} s={[0.44, 0.55, 0.04]} c={c} />
    {[
      [-0.19, -0.19],
      [0.19, -0.19],
      [-0.19, 0.19],
      [0.19, 0.19],
    ].map(([x, z], i) => (
      <Box key={i} p={[x, SEAT_Y / 2 - 0.03, z]} s={[0.04, SEAT_Y - 0.06, 0.04]} c="#3a3a3a" />
    ))}
  </group>
);
const TABLE_H = 0.72;
// 座る人：いすを置いて、その上に座らせる（向き ry は人の正面の向き）
const Seated: React.FC<{p: V3; ry: number; outfit: Outfit; pz?: Pose; longHair?: boolean; chair?: string; rHand?: React.ReactNode}> = ({p, ry, outfit, pz = SEATED, longHair, chair, rHand}) => (
  <>
    <Chair p={p} ry={ry} c={chair} />
    <Human outfit={outfit} longHair={longHair} position={[p[0], sitY(), p[2]]} rotation={[0, ry, 0]} p={pz} rHand={rHand} />
  </>
);
const Bento: React.FC = () => (
  <group position={[0, -0.08, 0.06]}>
    <Box p={[0, 0, 0]} s={[0.2, 0.06, 0.13]} c="#d8402f" r={0.4} />
    <Box p={[0, 0.04, 0]} s={[0.24, 0.015, 0.06]} c="#f2f2ee" />
  </group>
);

// ---------- 1. 7:00 朝：お弁当 ----------
const CAM_1: CamKey[] = [
  {f: 0, pos: [2.3, 1.6, 3.4], look: [0, 1.1, -0.4], fov: 48},
  {f: 240, pos: [0.9, 1.5, 3.0], look: [0, 1.15, -0.4], fov: 48, ease: LIN},
];
const WIFE_1: V3 = [-0.55, 0, -0.5];
const ME_1: V3 = [0.6, 0, -0.2];
export const H1: React.FC = () => {
  const f = useCurrentFrame();
  // 妻：お弁当を差し出す（96〜）→ 主人公が受け取る（150〜）
  const give = sm((f - 90) / 14);
  const take = f >= 150;
  const reach = sm((f - 140) / 12);
  const wifeP: Pose = take ? pose({head: 0.05, lSh: [0.1, 0.15], rSh: [0.1, 0.15]}) : lerpPose(pose({lSh: [0.2, 0.15], rSh: [0.6, 0.2], rEl: 1.4}), pose({rSh: [1.25, 0.25], rEl: 0.45, head: 0.05}), give);
  const meP: Pose = take ? pose({rSh: [0.8, 0.15], rEl: 1.4, head: 0.15}) : lerpPose(pose({head: 0.05}), pose({rSh: [1.2, -0.25], rEl: 0.5, head: 0.15}), reach);
  return (
    <AbsoluteFill>
      <Stage bg="#efe8dc" shadows={false}>
        <CameraRig keys={CAM_1} />
        <Room />
        {/* キッチンカウンターと窓 */}
        <Box p={[-1.6, 0.45, -2.15]} s={[2.6, 0.9, 0.6]} c="#e8e4dc" />
        <Box p={[-1.6, 0.92, -2.15]} s={[2.65, 0.05, 0.65]} c="#8a8f99" />
        <Box p={[1.2, 1.7, -2.53]} s={[1.6, 1.3, 0.02]} c="#cfe6ff" e="#dff0ff" ei={0.8} />
        <Human outfit={WIFE} longHair position={WIFE_1} rotation={[0, 1.15, 0]} p={wifeP} rHand={!take ? <Bento /> : undefined} />
        <Human outfit={ME} position={ME_1} rotation={[0, -1.75, 0]} p={meP} rHand={take ? <Bento /> : undefined} />
      </Stage>
      <Bubbles id="h1_morning" f={f} cam={CAM_1} heads={{wife: [WIFE_1[0], HEAD - 0.08, WIFE_1[2]]}} />
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 2. 8:30 満員電車 ----------
const STRAP: Pose = pose({rSh: [2.9, 0.05], rEl: 0.15, lSh: [0.05, 0.12], lEl: 0.3});
const CAR_PEOPLE: {p: V3; ry: number; o: Outfit; key?: string}[] = [
  {p: [-0.55, 0, 0.9], ry: 0, o: RIDERS[0], key: 'a'},
  {p: [0.55, 0, 0.7], ry: 0.3, o: RIDERS[1], key: 'b'},
  {p: [-0.45, 0, -0.1], ry: -0.2, o: RIDERS[3], key: 'c'},
  {p: [0.5, 0, -0.3], ry: 0.1, o: RIDERS[4], key: 'd'},
  {p: [0.0, 0, 0.3], ry: 0, o: ME},
  {p: [-0.1, 0, -1.0], ry: 0.2, o: RIDERS[2]},
  {p: [0.65, 0, -1.2], ry: -0.3, o: RIDERS[5]},
  {p: [-0.65, 0, -1.4], ry: 0, o: RIDERS[1]},
];
const CAM_2: CamKey[] = [
  {f: 0, pos: [0.9, 1.75, 3.6], look: [0, 1.35, -0.4], fov: 52},
  {f: 210, pos: [-0.7, 1.7, 3.0], look: [0, 1.35, -0.4], fov: 52, ease: LIN},
];
export const H2: React.FC = () => {
  const f = useCurrentFrame();
  const sway = 0.02 * Math.sin(f * 0.09);
  const heads: Record<string, V3> = {};
  CAR_PEOPLE.forEach((c) => {
    if (c.key) heads[c.key] = [c.p[0], HEAD - 0.05, c.p[2]];
  });
  const outside = (side: number) =>
    Array.from({length: 8}).map((_, i) => {
      const z = ((i * 7 - f * 0.8) % 56 + 56) % 56 - 40;
      return <Box key={`${side}-${i}`} p={[side * (5 + (i % 3) * 2), 1.5 + (i % 4), z]} s={[2, 4 + (i % 3) * 2, 3]} c={['#9fb3c8', '#c8b8a0', '#a8c0a0'][i % 3]} />;
    });
  return (
    <AbsoluteFill>
      <Stage bg="#cfe6ff" shadows={false}>
        <CameraRig keys={CAM_2} />
        <hemisphereLight args={['#ffffff', '#9a9a9a', 1.0]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 6, 4]} intensity={1.1} />
        <mesh>
          <sphereGeometry args={[120, 24, 12]} />
          <meshBasicMaterial color="#cfe6ff" side={THREE.BackSide} />
        </mesh>
        {outside(-1)}
        {outside(1)}
        <group rotation={[0, 0, sway]}>
          <Box p={[0, 0, -1]} s={[2.9, 0.1, 9]} c="#8f949c" />
          <Box p={[0, 2.35, -1]} s={[2.9, 0.08, 9]} c="#eef0f2" />
          {[-1, 1].map((s) => (
            <group key={s}>
              <Box p={[s * 1.45, 0.45, -1]} s={[0.05, 0.9, 9]} c="#e6e8ea" />
              <Box p={[s * 1.45, 2.15, -1]} s={[0.05, 0.4, 9]} c="#e6e8ea" />
              {Array.from({length: 5}).map((_, i) => (
                <Box key={i} p={[s * 1.45, 1.4, 3 - i * 2]} s={[0.06, 1.1, 0.3]} c="#e6e8ea" />
              ))}
              <Box p={[s * 0.75, 2.22, -1]} s={[0.03, 0.03, 9]} c="#c8ccd2" m={0.6} r={0.3} />
            </group>
          ))}
          {[-0.6, 0.6].map((x) => (
            <Box key={x} p={[x, 2.3, -1]} s={[0.2, 0.03, 9]} c="#ffffff" e="#ffffff" ei={0.8} />
          ))}
          {/* つり革：右手の真上に1つずつ */}
          {CAR_PEOPLE.map((c, i) => (
            <group key={'s' + i} position={[c.p[0] + 0.24 * Math.cos(c.ry), 2.2, c.p[2] - 0.24 * Math.sin(c.ry)]} rotation={[0, 0, 0.1 * Math.sin(f * 0.09 + i)]}>
              <Box p={[0, -0.1, 0]} s={[0.025, 0.2, 0.025]} c="#cfd3d8" />
              <mesh position={[0, -0.27, 0]}>
                <torusGeometry args={[0.055, 0.012, 6, 16]} />
                <meshStandardMaterial color="#f2f2f2" />
              </mesh>
            </group>
          ))}
          {CAR_PEOPLE.map((c, i) => (
            <Human key={i} outfit={c.o} longHair={i === 1 || i === 3} position={c.p} rotation={[0, c.ry + 0.03 * Math.sin(f * 0.07 + i), 0]} p={{...STRAP, head: 0.05 * Math.sin(f * 0.05 + i) + (c.o === ME ? 0.2 : 0)}} />
          ))}
        </group>
      </Stage>
      <Bubbles id="h2_train" f={f} cam={CAM_2} heads={heads} />
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};

// ---------- 3. 10:00 会議 ----------
const MEET: {key: string; p: V3; ry: number; o: Outfit; hair?: boolean}[] = [
  {key: 'p1', p: [-0.8, 0, 0.75], ry: Math.PI, o: RIDERS[2]},
  {key: 'p2', p: [0.0, 0, 0.75], ry: Math.PI, o: RIDERS[1], hair: true},
  {key: 'p3', p: [0.8, 0, 0.75], ry: Math.PI, o: ME},
];
const BOSS_P: V3 = [1.6, 0, -1.4];
const CAM_3: CamKey[] = [
  {f: 0, pos: [-1.6, 2.1, 3.2], look: [0.4, 1.0, -0.4], fov: 50},
  {f: 240, pos: [-0.4, 2.0, 3.6], look: [0.4, 1.0, -0.4], fov: 50, ease: LIN},
];
export const H3: React.FC = () => {
  const f = useCurrentFrame();
  const point = 0.15 * Math.sin(f * 0.12);
  const heads: Record<string, V3> = {boss: [BOSS_P[0], HEAD, BOSS_P[2]]};
  MEET.forEach((m) => (heads[m.key] = [m.p[0], HEAD_SIT, m.p[2]]));
  return (
    <AbsoluteFill>
      <Stage bg="#f2f2f0" shadows={false}>
        <CameraRig keys={CAM_3} />
        <Room wall="#eef0f2" floor="#8a8f99" office />
        {/* 長机・ホワイトボード */}
        <Box p={[0, TABLE_H - 0.02, 0.0]} s={[2.6, 0.04, 0.9]} c="#e8e4dc" />
        {[-1.2, 1.2].map((x) => (
          <Box key={x} p={[x, TABLE_H / 2, 0]} s={[0.05, TABLE_H, 0.8]} c="#8a8f99" />
        ))}
        <Box p={[0.6, 1.5, -2.5]} s={[2.4, 1.2, 0.04]} c="#ffffff" />
        {[0, 1, 2].map((i) => (
          <Box key={i} p={[0.2 + i * 0.3, 1.6 + (i % 2) * 0.2, -2.47]} s={[0.25, 0.03, 0.01]} c="#3f6fb0" />
        ))}
        {MEET.map((m, i) => (
          <Seated key={i} p={m.p} ry={m.ry} outfit={m.o} longHair={m.hair} chair="#3d4250" pz={{...SEATED, lSh: [0.9, 0.1], rSh: [0.9, 0.1], lEl: 1.2, rEl: 1.2, head: f > 120 ? -0.15 + 0.04 * Math.sin(f * 0.1 + i) : 0.05 * Math.sin(f * 0.15 + i)}} />
        ))}
        {/* 書類 */}
        {MEET.map((m, i) => (
          <Box key={'d' + i} p={[m.p[0], TABLE_H + 0.005, m.p[2] - 0.3]} s={[0.21, 0.005, 0.3]} c="#ffffff" />
        ))}
        <Human outfit={BOSS} position={BOSS_P} rotation={[0, 0.25, 0]} p={pose({rSh: [1.3 + point, -0.5], rEl: 0.3, lSh: [0.3, 0.2], lEl: 0.8, head: 0.05})} />
      </Stage>
      <Bubbles id="h3_meeting" f={f} cam={CAM_3} heads={heads} />
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 4. 12:00 ランチ（向かい合って座る） ----------
const ME_4: V3 = [0.62, 0, 0];
const JR_4: V3 = [-0.62, 0, 0];
const CAM_4: CamKey[] = [
  {f: 0, pos: [-0.2, 1.6, 3.4], look: [0, 0.95, 0], fov: 46},
  {f: 180, pos: [0.8, 1.5, 3.0], look: [0, 0.95, 0], fov: 46, ease: LIN},
];
const Plate: React.FC<{p: V3; c: string}> = ({p, c}) => (
  <group position={p}>
    <Cyl p={[0, 0.01, 0]} r={0.13} h={0.02} c="#f4f4f0" />
    <mesh position={[0, 0.04, 0]} scale={[1, 0.4, 1]}>
      <sphereGeometry args={[0.08, 12, 8]} />
      <meshStandardMaterial color={c} />
    </mesh>
  </group>
);
export const H4: React.FC = () => {
  const f = useCurrentFrame();
  const wave = Math.sin(f * 0.3) * 0.25 * (f > 16 && f < 90 ? 1 : 0);
  return (
    <AbsoluteFill>
      <Stage bg="#efe8dc" shadows={false}>
        <CameraRig keys={CAM_4} />
        <Room wall="#e8dccb" floor="#a07a58" />
        <Box p={[0.3, 1.6, -2.54]} s={[3.4, 1.8, 0.02]} c="#cfe4f2" e="#dfeefa" ei={0.6} />
        <Cyl p={[0, TABLE_H - 0.02, 0]} r={0.45} h={0.04} c="#c9a882" seg={32} />
        <Cyl p={[0, TABLE_H / 2, 0]} r={0.04} h={TABLE_H} c="#3a3a3a" />
        <Plate p={[0.22, TABLE_H, 0]} c="#c8803a" />
        <Plate p={[-0.22, TABLE_H, 0]} c="#e8c060" />
        <Seated p={ME_4} ry={-Math.PI / 2} outfit={ME} pz={{...SEATED, rSh: [0.95, 0.1], rEl: 1.4, head: 0.1}} />
        <Seated p={JR_4} ry={Math.PI / 2} outfit={JUNIOR} pz={{...SEATED, rSh: [1.2, 0.3], rEl: 1.2 + wave, lSh: [0.6, 0.1], lEl: 1.4, head: -0.05}} />
      </Stage>
      <Bubbles id="h4_lunch" f={f} cam={CAM_4} heads={{junior: [JR_4[0], HEAD_SIT, 0]}} />
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 5. 15:00 取引先（応接室で向かい合う） ----------
const CL_5: V3 = [0.0, 0, -0.75];
const ME_5: V3 = [0.0, 0, 0.75];
const CAM_5: CamKey[] = [
  {f: 0, pos: [1.6, 1.7, 2.6], look: [0, 1.0, -0.5], fov: 46},
  {f: 180, pos: [0.6, 1.6, 2.3], look: [0, 1.0, -0.6], fov: 46, ease: LIN},
];
export const H5: React.FC = () => {
  const f = useCurrentFrame();
  const nod = 0.12 * Math.max(0, Math.sin(f * 0.2)) * (f < 60 ? 1 : 0);
  const slump = sm((f - 70) / 14);
  return (
    <AbsoluteFill>
      <Stage bg="#efe8dc" shadows={false}>
        <CameraRig keys={CAM_5} />
        <Room wall="#e6e0d6" floor="#7a6a5e" office />
        <Box p={[0, 0.4, 0]} s={[1.2, 0.05, 0.7]} c="#4a3a30" />
        {[-0.5, 0.5].map((x) => (
          <Box key={x} p={[x, 0.2, 0]} s={[0.05, 0.4, 0.6]} c="#3a2a22" />
        ))}
        <Box p={[0.2, 0.43, 0.05]} s={[0.21, 0.005, 0.3]} c="#ffffff" />
        <Cyl p={[-0.3, 0.46, -0.1]} r={0.035} h={0.07} c="#f4f4f0" />
        <Seated p={CL_5} ry={0} outfit={CLIENT} chair="#2a2a2e" pz={{...SEATED, lSh: [0.6, 0.1], rSh: [0.6, 0.1], lEl: 1.3, rEl: 1.3, head: nod}} />
        <Seated p={ME_5} ry={Math.PI} outfit={ME} chair="#2a2a2e" pz={{...SEATED, head: lerp(0, 0.4, slump), spine: lerp(0, 0.2, slump)}} />
        {/* 観葉植物 */}
        <Cyl p={[-1.6, 0.2, -1.8]} r={0.18} r2={0.14} h={0.4} c="#c8b8a0" />
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[-1.6 + Math.cos(i * 1.6) * 0.12, 0.65 + i * 0.1, -1.8 + Math.sin(i * 1.6) * 0.12]} scale={[0.15, 0.3, 0.15]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#5a9a4a" flatShading />
          </mesh>
        ))}
      </Stage>
      <Bubbles id="h5_client" f={f} cam={CAM_5} heads={{client: [CL_5[0], HEAD_SIT, CL_5[2]]}} />
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 6. 19:00 コンビニ：レジ ----------
const CLERK_6: V3 = [0, 0, -1.2];
const ME_6: V3 = [0.15, 0, 0.15];
const CAM_6: CamKey[] = [
  {f: 0, pos: [1.9, 1.7, 2.3], look: [0, 1.15, -0.6], fov: 48},
  {f: 180, pos: [1.0, 1.6, 2.0], look: [0, 1.1, -0.6], fov: 48, ease: LIN},
];
export const H6: React.FC = () => {
  const f = useCurrentFrame();
  const bow = Math.max(0, Math.sin(((f - 16) / 24) * Math.PI)) * (f > 16 && f < 40 ? 1 : 0);
  const slump = sm((f - 106) / 16);
  // 主人公は肩を落として、出口（手前）へ歩き出す
  const walk = Math.max(0, f - 130) / 30;
  return (
    <AbsoluteFill>
      <Stage bg="#f2f2ee" shadows={false}>
        <CameraRig keys={CAM_6} />
        <Room wall="#f4f4f0" floor="#e8e6e0" office />
        {/* 商品棚 */}
        {[0, 1, 2].map((row) =>
          Array.from({length: 8}).map((_, i) => (
            <Box key={`${row}-${i}`} p={[-2.9 + i * 0.3, 0.4 + row * 0.5, -2.35]} s={[0.24, 0.3, 0.25]} c={['#e2574c', '#f2c14e', '#4f7fc9', '#5aa36e', '#f0f0f0'][(i + row) % 5]} />
          )),
        )}
        {/* レジカウンター・レジ */}
        <Box p={[0, 0.45, -0.75]} s={[2.0, 0.9, 0.6]} c="#d8d4cc" />
        <Box p={[0, 0.92, -0.75]} s={[2.05, 0.05, 0.65]} c="#8a8f99" />
        <Box p={[-0.5, 1.08, -0.85]} s={[0.36, 0.26, 0.28]} c="#3d4250" />
        <Box p={[-0.5, 1.26, -0.95]} s={[0.32, 0.2, 0.04]} c="#9fd0ff" e="#7fc0ff" ei={0.6} />
        <Human outfit={CLERK} position={CLERK_6} p={pose({spine: 0.7 * bow, head: 0.2 * bow, lSh: [0.2, 0.1], rSh: [0.2, 0.1]})} />
        <Human
          outfit={ME}
          position={[ME_6[0] + walk * 0.2, 0, ME_6[2] + walk * 0.9]}
          rotation={[0, f > 130 ? 0.2 : Math.PI, 0]}
          p={f > 130 ? {...pose({lHip: [0.3 * Math.sin(walk * 6), 0.03], rHip: [-0.3 * Math.sin(walk * 6), 0.03], lKn: 0.2, rKn: 0.2}), spine: 0.25, head: 0.4} : lerpPose(pose({rSh: [0.6, 0.1], rEl: 0.9}), pose({spine: 0.25, head: 0.45, lSh: [0.05, 0.05], rSh: [0.05, 0.05]}), slump)}
        />
      </Stage>
      <Bubbles id="h6_store" f={f} cam={CAM_6} heads={{clerk: [CLERK_6[0], HEAD - 0.05, CLERK_6[2]]}} />
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 7. 21:00 家：おかえり ----------
const WIFE_7: V3 = [-0.4, 0, -0.6];
const ME_7: V3 = [0.6, 0, 0.3];
const CAM_7: CamKey[] = [
  {f: 0, pos: [2.0, 1.6, 3.0], look: [0, 1.1, -0.3], fov: 48},
  {f: 210, pos: [0.8, 1.5, 2.7], look: [0, 1.1, -0.3], fov: 48, ease: LIN},
];
export const H7: React.FC = () => {
  const f = useCurrentFrame();
  const tilt = 0.08 * Math.sin(f * 0.06);
  return (
    <AbsoluteFill>
      <Stage bg="#3a2a2a" shadows={false}>
        <CameraRig keys={CAM_7} />
        <Room night />
        {/* 玄関：ドアと靴箱 */}
        <Box p={[1.8, 1.05, -2.5]} s={[0.95, 2.1, 0.06]} c="#7a5a40" />
        <mesh position={[1.45, 1.0, -2.45]}>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshStandardMaterial color="#c9a24a" metalness={0.7} roughness={0.3} />
        </mesh>
        <Box p={[-1.6, 0.45, -2.3]} s={[1.0, 0.9, 0.35]} c="#a88a6a" />
        <Human outfit={WIFE} longHair position={WIFE_7} rotation={[0, 0.9, 0]} p={pose({head: 0.08 + tilt, lSh: [0.4, 0.1], rSh: [0.4, 0.1], lEl: 1.2, rEl: 1.2})} />
        <Human outfit={ME} position={ME_7} rotation={[0, -2.1, 0]} p={pose({spine: 0.2, head: 0.25, rSh: [0.3, 0.1], rEl: 0.6})} rHand={<Box p={[0, -0.12, 0]} s={[0.08, 0.28, 0.32]} c="#2a2a2e" />} />
      </Stage>
      <Bubbles id="h7_home" f={f} cam={CAM_7} heads={{wife: [WIFE_7[0], HEAD - 0.08, WIFE_7[2]]}} />
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};

// ---------- 8. 23:50 子ども部屋：「パパ、だいすき」 ----------
const BED_Y = 0.3; // 子ども用ベッドのマットの上面
const BED: V3 = [0, 0, -0.6];
const CHILD_S = 0.55;
// ひざをつく：太ももを立て、すねを床につける（体を すねの長さ ぶん下げる）
const KNEEL: Pose = pose({lKn: 1.55, rKn: 1.55, spine: 0.35, head: 0.35, lSh: [0.7, 0.1], rSh: [0.9, 0.1], lEl: 0.5, rEl: 0.4});
const CAM_8: CamKey[] = [
  // ベッドの反対側（左）・少し高い位置から、寝顔と、ひざをつく主人公の正面を見る
  {f: 0, pos: [-2.2, 2.3, 0.6], look: [0.3, 0.5, -0.8], fov: 46},
  {f: 100, pos: [-1.55, 1.95, -0.3], look: [0.3, 0.7, -0.9], fov: 46},
  {f: 150, pos: [-1.6, 1.98, -0.2], look: [0.35, 0.72, -0.88], fov: 46, ease: LIN},
  {f: 210, pos: [-1.9, 2.1, 0.1], look: [0.3, 0.3, -0.85], fov: 46},
  {f: 300, pos: [-2.4, 2.4, 0.8], look: [0.3, 0.25, -0.8], fov: 46, ease: LIN},
];
export const H8: React.FC = () => {
  const f = useCurrentFrame();
  // 布団をかけ直す（10〜50）→ 心の声（66〜）→ 目元をぬぐう（110〜）
  const tuck = Math.sin(Math.min(1, Math.max(0, (f - 10) / 40)) * Math.PI);
  const wipe = sm((f - 110) / 14) * (1 - sm((f - 170) / 14));
  const meP: Pose = lerpPose({...KNEEL, rSh: [0.9 + 0.3 * tuck, 0.1], rEl: 0.4 - 0.2 * tuck}, {...KNEEL, rSh: [1.9, -0.35], rEl: 2.3, head: 0.25}, wipe);
  const breathe = 0.012 * Math.sin(f * 0.1);
  // 子どもの頭（枕の上）
  const childHead: V3 = [BED[0], BED_Y + 0.3, -1.15];
  return (
    <AbsoluteFill>
      <Stage bg="#1c2236" shadows={false}>
        <CameraRig keys={CAM_8} />
        <Room wall="#3a4258" floor="#5a4a3e" night />
        {/* 窓の月明かり */}
        <Box p={[-1.0, 1.7, -2.53]} s={[1.1, 1.0, 0.02]} c="#1c2848" e="#2a3a68" ei={0.6} />
        <directionalLight position={[-1, 3, -2]} intensity={0.5} color="#9db8ff" />
        {/* 子ども用ベッド */}
        <group position={BED}>
          <Box p={[0, BED_Y / 2 - 0.05, 0]} s={[0.8, BED_Y - 0.1, 1.5]} c="#c8a882" />
          <Box p={[0, BED_Y - 0.05, 0]} s={[0.74, 0.1, 1.44]} c="#f2f0ea" />
          <Box p={[0, 0.45, -0.77]} s={[0.8, 0.7, 0.05]} c="#b89870" />
          <Box p={[0, BED_Y + 0.05, -0.6]} s={[0.4, 0.08, 0.24]} c="#ffffff" />
        </group>
        {/* 子ども：あおむけで寝ている（体は布団の中、頭だけ出る） */}
        <group position={[BED[0], BED_Y + 0.16, -0.19]} rotation={[-Math.PI / 2, 0, 0]}>
          <Human outfit={CHILD} scale={CHILD_S} p={pose({lSh: [0, 0.15], rSh: [0, 0.15], head: -0.15})} />
        </group>
        {/* 掛け布団：かけ直すと少し上がる */}
        <mesh position={[BED[0], BED_Y + 0.17 + breathe, -0.42 - 0.04 * tuck]} scale={[0.4, 0.13, 0.6]}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshStandardMaterial color="#8fb0d8" roughness={0.95} />
        </mesh>
        {/* 主人公：ベッドの横にひざをつく */}
        <Human outfit={{...ME, shirt: '#8a96aa'}} position={[BED[0] + 0.72, -0.44, BED[2] - 0.05]} rotation={[0, -Math.PI / 2, 0]} p={meP} />
        <pointLight position={[0.6, 1.2, 0.3]} intensity={1.6} distance={3} color="#ffcf90" />
      </Stage>
      <Bubbles id="h8_child" f={f} cam={CAM_8} heads={{child: childHead}} />
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};
