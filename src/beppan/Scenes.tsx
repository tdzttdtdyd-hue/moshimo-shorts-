import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {project} from '../lib/project';
import {Human, IDLE, OUTFITS, Outfit, Pose, pose, runPose, shockPose, walkPose} from '../three/Human';
import {SkyDome} from '../three/Landscape';
import {STRIDE, walkAlong} from '../three/Walk';
import {Vignette, emWidth} from './Overlay';
import {Bubble, SCENES} from './script';
import {SAFE, SANS} from '../theme';

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
const Cyl: React.FC<{p: V3; r: number; h: number; c: string; r2?: number; rot?: V3; seg?: number; e?: string; ei?: number}> = ({p, r, h, c, r2, rot = [0, 0, 0], seg = 20, e, ei = 0}) => (
  <mesh position={p} rotation={rot}>
    <cylinderGeometry args={[r, r2 ?? r, h, seg]} />
    <meshStandardMaterial color={c} roughness={0.7} emissive={e ?? '#000'} emissiveIntensity={ei} />
  </mesh>
);

// ---------- 登場人物 ----------
const HIM: Outfit = {shirt: '#2f3e5c', pants: '#2a2f3a', skin: '#e3b08e', hair: '#1c1714', shoes: '#1a1a1e'};
const HER: Outfit = {shirt: '#ead2c2', pants: '#7a6a7e', skin: '#f0c9ae', hair: '#3a2a20', shoes: '#6a4a3a'};
const HER_S = 0.93;
const BLACK: Outfit = {shirt: '#16171b', pants: '#16171b', skin: '#d6a27f', hair: '#111', shoes: '#0e0e10'};
const Him: React.FC<React.ComponentProps<typeof Human>> = (p) => <Human outfit={HIM} {...p} />;
const Her: React.FC<React.ComponentProps<typeof Human>> = (p) => <Human outfit={HER} longHair scale={HER_S} {...p} />;

// いすに座る：座面の高さ 0.46m。腰（0.93）が座面にのるよう y を下げる
const SEAT_Y = 0.46;
const SIT_Y = SEAT_Y - 0.93 + 0.06;
const SIT_YH = SEAT_Y - 0.93 * HER_S + 0.06;
const SEATED: Pose = pose({lHip: [1.5, 0.08], rHip: [1.5, 0.08], lKn: 1.5, rKn: 1.5, lSh: [0.45, 0.12], rSh: [0.45, 0.12], lEl: 0.9, rEl: 0.9});

// ---------- 吹き出し（セリフ＝角つき／心の声＝雲形・点線） ----------
const BubbleView: React.FC<{b: Bubble; x: number; y: number; f: number}> = ({b, x, y, f}) => {
  if (f < b.from || f >= b.to || !Number.isFinite(x)) return null;
  const k = interpolate(f, [b.from, b.from + 6, b.to - 6, b.to], [0, 1, 1, 0], clamp);
  const pop = 1 + 0.1 * Math.max(0, 1 - (f - b.from) / 6);
  const lines = b.text.split('\n');
  const maxEm = Math.max(...lines.map((l) => emWidth(l)));
  const size = Math.min(50, Math.floor(660 / maxEm));
  const w = maxEm * size + 70;
  const h = lines.length * size * 1.32 + 40;
  const think = b.kind === 'think';
  // 出るときに少し拡大するぶんも含めて、セーフエリアの内側に収める
  const bx = Math.min(1080 - SAFE.right - w * 1.08, Math.max(SAFE.left + w * 0.06, x - w / 2));
  const by = Math.min(1150 - h, Math.max(540, y - h - 110));
  const tx = Math.min(bx + w - 50, Math.max(bx + 50, x));
  const bg = b.who === 'her' ? '#fff4f6' : '#ffffff';
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, opacity: k, pointerEvents: 'none'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        {think ? (
          [0, 1, 2].map((i) => {
            const t = (i + 1) / 4;
            return <circle key={i} cx={lerp(tx, x, t)} cy={lerp(by + h + 6, y - 20, t)} r={14 - i * 4} fill={bg} stroke="rgba(0,0,0,0.3)" strokeWidth={2} strokeDasharray="5 4" />;
          })
        ) : (
          <path d={`M ${tx - 18} ${by + h - 2} L ${x} ${Math.min(y - 14, by + h + 70)} L ${tx + 18} ${by + h - 2} Z`} fill={bg} stroke="rgba(0,0,0,0.25)" strokeWidth={2} />
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
          transformOrigin: `${tx - bx}px ${h}px`,
          background: bg,
          borderRadius: think ? h / 2 : 30,
          border: think ? '3px dashed rgba(0,0,0,0.3)' : '2px solid rgba(0,0,0,0.2)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.32,
          color: '#1d1d22',
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
const Bubbles: React.FC<{id: string; f: number; cam: CamKey[]; him: V3; her: V3}> = ({id, f, cam, him, her}) => (
  <>
    {(spec(id).bubbles ?? []).map((b, i) => {
      const pt = project(cam, f, b.who === 'him' ? him : her);
      return <BubbleView key={i} b={b} x={pt.x} y={pt.y} f={f} />;
    })}
  </>
);

// ---------- 室内の共通セット ----------
const Interior: React.FC<{wall?: string; floor?: string; night?: boolean; warm?: boolean}> = ({wall = '#efe8dc', floor = '#b48a62', night, warm}) => (
  <>
    <hemisphereLight args={[night ? '#ffd9a8' : '#fff6e8', '#7a6a58', night ? 0.6 : 1.1]} />
    <ambientLight intensity={night ? 0.2 : 0.3} />
    <directionalLight position={[3, 4, 5]} intensity={night ? 0.4 : 1.2} color={warm ? '#ffd8a8' : '#fff0d8'} />
    {night && <pointLight position={[0, 2.4, 0.6]} intensity={5} distance={7} decay={1.4} color="#ffcf90" />}
    <Box p={[0, -0.05, 0]} s={[14, 0.1, 14]} c={floor} r={0.7} />
    <Box p={[0, 1.7, -2.6]} s={[14, 3.6, 0.1]} c={wall} />
    <Box p={[-3.4, 1.7, 0]} s={[0.1, 3.6, 14]} c={wall} />
  </>
);
const Chair: React.FC<{p: V3; ry: number}> = ({p, ry}) => (
  <group position={p} rotation={[0, ry, 0]}>
    <Box p={[0, SEAT_Y - 0.03, 0]} s={[0.44, 0.05, 0.44]} c="#6b4f3a" />
    <Box p={[0, 0.75, -0.2]} s={[0.44, 0.55, 0.04]} c="#6b4f3a" />
    {[
      [-0.19, -0.19],
      [0.19, -0.19],
      [-0.19, 0.19],
      [0.19, 0.19],
    ].map(([x, z], i) => (
      <Box key={i} p={[x, SEAT_Y / 2 - 0.03, z]} s={[0.04, SEAT_Y - 0.06, 0.04]} c="#5a4030" />
    ))}
  </group>
);
// 丸テーブル（天板 0.72m・半径 0.42m）と、向かい合って座る2人
const TABLE_H = 0.72;
const Table: React.FC<{cloth?: boolean}> = ({cloth}) => (
  <>
    <Cyl p={[0, TABLE_H - 0.02, 0]} r={0.42} h={0.04} c={cloth ? '#f4f0e8' : '#c9a882'} seg={32} />
    <Cyl p={[0, TABLE_H / 2, 0]} r={0.04} h={TABLE_H} c="#3a3a3a" />
    <Cyl p={[0, 0.02, 0]} r={0.22} h={0.04} c="#3a3a3a" />
  </>
);
const HIM_SEAT: V3 = [0.68, 0, 0];
const HER_SEAT: V3 = [-0.68, 0, 0];
const Cup: React.FC<{p: V3; tip?: number}> = ({p, tip = 0}) => (
  <group position={p} rotation={[0, 0, tip * 1.45]}>
    <Cyl p={[0, 0.045, 0]} r={0.04} r2={0.032} h={0.09} c="#f4f4f0" />
    <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.036, 16]} />
      <meshStandardMaterial color="#5a3a24" />
    </mesh>
  </group>
);
const Phone: React.FC<{glow?: number}> = ({glow = 1}) => (
  <group>
    <Box p={[0, 0, 0]} s={[0.075, 0.01, 0.155]} c="#16171b" r={0.3} />
    <Box p={[0, 0.006, 0]} s={[0.066, 0.002, 0.14]} c="#9fd0ff" e="#7fc0ff" ei={1.2 * glow} />
  </group>
);
// 手に持つスマホ（前腕の延長に）
const HandPhone: React.FC = () => (
  <group position={[0, -0.08, 0.03]}>
    <Box p={[0, 0, 0]} s={[0.075, 0.155, 0.01]} c="#16171b" r={0.3} />
    <Box p={[0, 0, 0.006]} s={[0.066, 0.14, 0.002]} c="#9fd0ff" e="#7fc0ff" ei={1.2} />
  </group>
);
const Cafe: React.FC = () => (
  <>
    <Interior wall="#e8dccb" floor="#a07a58" />
    {/* 大きな窓と、外の街 */}
    <Box p={[0.4, 1.6, -2.54]} s={[3.6, 2.0, 0.02]} c="#cfe4f2" e="#dfeefa" ei={0.6} />
    {[-1.4, 0.4, 2.2].map((x) => (
      <Box key={x} p={[x, 1.6, -2.5]} s={[0.06, 2.0, 0.06]} c="#4a3a30" />
    ))}
    <Box p={[-2.6, 1.0, -1.6]} s={[1.2, 2.0, 0.5]} c="#7a5a40" />
    {[0.5, 1.0, 1.5].map((y) => (
      <Box key={y} p={[-2.6, y, -1.36]} s={[1.1, 0.03, 0.02]} c="#c8b8a0" />
    ))}
    <Table />
    <Chair p={HIM_SEAT} ry={-Math.PI / 2} />
    <Chair p={HER_SEAT} ry={Math.PI / 2} />
  </>
);

// ---------- 1. 1日目：自慢のハイスペ彼氏 ----------
const CAM_1: CamKey[] = [
  {f: 0, pos: [0.4, 1.7, 4.6], look: [0, 0.85, 0], fov: 46},
  {f: 270, pos: [-0.5, 1.55, 3.9], look: [0, 0.85, 0], fov: 46, ease: LIN},
];
export const B1: React.FC = () => {
  const f = useCurrentFrame();
  const spill = sm((f - 196) / 8);
  const panic = sm((f - 200) / 6);
  const sip = sm((f - 120) / 20) * (1 - sm((f - 170) / 20));
  const himP = lerpPose({...SEATED, rSh: [lerp(0.45, 1.2, sip), 0.1], rEl: lerp(0.9, 2.0, sip), head: 0.05 * Math.sin(f * 0.08)}, {...SEATED, lSh: [1.0, 0.6], rSh: [1.0, 0.6], lEl: 1.4, rEl: 1.4, head: 0.3, spine: 0.2}, panic);
  const herP: Pose = {...SEATED, lSh: [0.8, 0.0], lEl: 1.8, head: -0.05 + 0.04 * Math.sin(f * 0.06), spine: 0.08};
  return (
    <AbsoluteFill>
      <Stage bg="#e8dccb" shadows={false}>
        <CameraRig keys={CAM_1} />
        <Cafe />
        <Him position={[HIM_SEAT[0], SIT_Y, 0]} rotation={[0, -Math.PI / 2, 0]} p={himP} />
        <Her position={[HER_SEAT[0], SIT_YH, 0]} rotation={[0, Math.PI / 2, 0]} p={herP} />
        <Cup p={[0.2, TABLE_H, 0.08]} tip={spill} />
        <Cup p={[-0.22, TABLE_H, -0.05]} />
        {/* こぼれたコーヒー */}
        {spill > 0 && (
          <mesh position={[0.08, TABLE_H + 0.002, 0.1]} rotation={[-Math.PI / 2, 0, 0]} scale={[spill * 1.4, spill, 1]}>
            <circleGeometry args={[0.1, 24]} />
            <meshStandardMaterial color="#5a3a24" roughness={0.2} />
          </mesh>
        )}
      </Stage>
      <Bubbles id="b1_day1" f={f} cam={CAM_1} him={[HIM_SEAT[0], 1.35, 0]} her={[HER_SEAT[0], 1.28, 0]} />
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 2. 30日目：急な出張 → 人混みに消える ----------
const CAM_2: CamKey[] = [
  {f: 0, pos: [-1.9, 1.45, 2.2], look: [0.4, 0.95, -0.4], fov: 48},
  {f: 270, pos: [-2.4, 1.5, 2.8], look: [0.6, 1.0, -1.2], fov: 48, ease: LIN},
];
// 彼が店の奥（窓ぎわの出口）へ早足で歩いていく道すじ
const EXIT_PATH: V3[] = [
  [0.68, 0, 0.0],
  [0.95, 0, -0.6],
  [1.5, 0, -1.6],
  [2.6, 0, -2.0],
];
const along = (path: V3[], d: number): {pos: V3; ry: number} => {
  let rest = d;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
    if (rest <= len || i === path.length - 2) {
      const t = Math.min(1, rest / len);
      return {pos: [lerp(a[0], b[0], t), 0, lerp(a[2], b[2], t)], ry: Math.atan2(b[0] - a[0], b[2] - a[2])};
    }
    rest -= len;
  }
  return {pos: path[path.length - 1], ry: 0};
};
export const B2: React.FC = () => {
  const f = useCurrentFrame();
  const buzz = f > 18 && f < 46 ? 0.004 * Math.sin(f * 3) : 0;
  const pick = sm((f - 46) / 8);
  const stand = sm((f - 140) / 12);
  const walkD = Math.max(0, (f - 152) / 30) * 1.6; // 早足 1.6m/秒
  const w = along(EXIT_PATH, walkD);
  const seated = f < 152;
  const gone = f > 214;
  const himPos: V3 = seated ? [HIM_SEAT[0], lerp(SIT_Y, 0, stand), 0] : w.pos;
  const himRy = seated ? -Math.PI / 2 : w.ry;
  const himP = seated ? lerpPose({...SEATED, rSh: [lerp(0.45, 1.4, pick), 0.25], rEl: lerp(0.9, 2.3, pick), head: 0.25 * pick}, IDLE, stand) : walkPose((walkD / STRIDE) * Math.PI * 2, 1.1);
  const reach = sm((f - 170) / 12);
  // 彼女：あっけにとられて、手を伸ばす
  const herP: Pose = lerpPose({...SEATED, head: 0}, {...SEATED, rSh: [1.3, -0.2], rEl: 0.3, head: -0.1, spine: 0.1}, reach);
  return (
    <AbsoluteFill>
      <Stage bg="#e8dccb" shadows={false}>
        <CameraRig keys={CAM_2} />
        <Cafe />
        {!gone && <Him position={himPos} rotation={[0, himRy, 0]} p={himP} rHand={pick > 0.5 && f < 150 ? <HandPhone /> : undefined} />}
        <Her position={[HER_SEAT[0], SIT_YH, 0]} rotation={[0, Math.PI / 2, 0]} p={herP} />
        <Cup p={[0.2, TABLE_H, 0.08]} />
        <Cup p={[-0.22, TABLE_H, -0.05]} />
        {pick < 0.5 && (
          <group position={[0.26 + buzz, TABLE_H + 0.005, -0.12]} rotation={[0, 0.3 + buzz * 20, 0]}>
            <Phone glow={f > 18 ? 1 : 0.2} />
          </group>
        )}
      </Stage>
      <Bubbles id="b2_day30" f={f} cam={CAM_2} him={[HIM_SEAT[0], 1.35, 0]} her={[HER_SEAT[0], 1.28, 0]} />
      {/* 消えた瞬間の、ふっと抜ける風 */}
      <AbsoluteFill style={{background: '#ffffff', opacity: interpolate(f, [212, 215, 224], [0, 0.35, 0], clamp)}} />
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 3. 60日目：「……言えない」と謎のお土産 ----------
const Souvenir: React.FC = () => (
  <group position={[0, -0.1, 0.06]}>
    <Cyl p={[0, 0, 0]} r={0.05} r2={0.06} h={0.12} c="#6a4a2e" seg={6} />
    <mesh position={[0, 0.1, 0]}>
      <icosahedronGeometry args={[0.06, 0]} />
      <meshStandardMaterial color="#3f8f7a" flatShading />
    </mesh>
    {[0, 1, 2, 3].map((i) => (
      <mesh key={i} position={[Math.cos(i * 1.57) * 0.06, 0.16, Math.sin(i * 1.57) * 0.06]} rotation={[Math.sin(i * 1.57) * 0.6, 0, -Math.cos(i * 1.57) * 0.6]}>
        <coneGeometry args={[0.015, 0.07, 6]} />
        <meshStandardMaterial color="#d8402f" />
      </mesh>
    ))}
    <mesh position={[0, 0.17, 0]}>
      <sphereGeometry args={[0.025, 10, 8]} />
      <meshStandardMaterial color="#f2c14e" metalness={0.6} roughness={0.3} />
    </mesh>
  </group>
);
const CAM_3: CamKey[] = [
  {f: 0, pos: [0.0, 1.55, 3.4], look: [0, 1.15, 0], fov: 46},
  {f: 270, pos: [0.6, 1.4, 2.4], look: [0.2, 1.1, 0], fov: 46, ease: LIN},
];
export const B3: React.FC = () => {
  const f = useCurrentFrame();
  const offer = sm((f - 100) / 14);
  const look = sm((f - 120) / 12);
  const himP: Pose = lerpPose(pose({head: 0.1 * Math.sin(f * 0.05), lSh: [0.1, 0.15], rSh: [0.1, 0.15]}), pose({rSh: [1.2, 0.1], rEl: 0.5, head: 0.15, spine: 0.05}), offer);
  const herP: Pose = lerpPose(pose({head: -0.05, lSh: [0.3, 0.15], lEl: 1.3, rSh: [0.3, 0.15], rEl: 1.3}), pose({head: 0.3, spine: 0.1, lSh: [0.9, 0.2], lEl: 1.2, rSh: [0.9, 0.2], rEl: 1.2, twist: 0.1 * Math.sin(f * 0.15)}), look);
  return (
    <AbsoluteFill>
      <Stage bg="#efe8dc" shadows={false}>
        <CameraRig keys={CAM_3} />
        <Interior />
        <group position={[0, 0, -1.9]}>
          <Box p={[0, 0.25, 0]} s={[2.2, 0.5, 0.9]} c="#6a7fa8" />
          <Box p={[0, 0.7, -0.38]} s={[2.2, 0.6, 0.2]} c="#5f739a" />
        </group>
        {/* スーツケース（出張帰り） */}
        <Box p={[1.4, 0.35, -0.2]} s={[0.42, 0.6, 0.25]} c="#3d4250" r={0.5} />
        <Him position={[0.45, 0, 0]} rotation={[0, -0.9, 0]} p={himP} rHand={offer > 0.2 ? <Souvenir /> : undefined} />
        <Her position={[-0.45, 0, 0.1]} rotation={[0, 0.9, 0]} p={herP} />
      </Stage>
      <Bubbles id="b3_day60" f={f} cam={CAM_3} him={[0.45, 1.85, 0]} her={[-0.45, 1.72, 0.1]} />
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 4. 90日目：毎朝、朱色の大きな神社に参拝 ----------
const SHU = '#d0472c';
const Torii: React.FC<{z: number}> = ({z}) => (
  <group position={[0, 0, z]}>
    {[-1.7, 1.7].map((x) => (
      <Cyl key={x} p={[x, 2.2, 0]} r={0.17} r2={0.2} h={4.4} c={SHU} seg={16} />
    ))}
    <Box p={[0, 3.7, 0]} s={[4.2, 0.24, 0.26]} c={SHU} />
    <Box p={[0, 4.55, 0]} s={[5.2, 0.24, 0.42]} c="#1e1e22" />
    <Box p={[0, 4.35, 0]} s={[4.8, 0.2, 0.34]} c={SHU} />
    <Box p={[0, 4.05, 0]} s={[0.3, 0.6, 0.18]} c={SHU} />
    {[-1.7, 1.7].map((x) => (
      <Box key={'b' + x} p={[x, 0.15, 0]} s={[0.5, 0.3, 0.5]} c="#2a2a2e" />
    ))}
  </group>
);
const Lantern: React.FC<{p: V3}> = ({p}) => (
  <group position={p}>
    <Box p={[0, 0.1, 0]} s={[0.5, 0.2, 0.5]} c="#9a968e" />
    <Cyl p={[0, 0.7, 0]} r={0.09} h={1.0} c="#a29e96" seg={8} />
    <Box p={[0, 1.3, 0]} s={[0.42, 0.32, 0.42]} c="#b0aca4" />
    <Box p={[0, 1.3, 0.2]} s={[0.18, 0.18, 0.02]} c="#ffe9b0" e="#ffd27a" ei={0.6} />
    <mesh position={[0, 1.6, 0]}>
      <coneGeometry args={[0.38, 0.28, 4]} />
      <meshStandardMaterial color="#8a867e" />
    </mesh>
  </group>
);
const Honden: React.FC<{z: number}> = ({z}) => (
  <group position={[0, 0, z]}>
    <Box p={[0, 0.3, 0]} s={[7, 0.6, 4.6]} c="#8a867e" />
    {/* 階段 */}
    {[0, 1, 2].map((i) => (
      <Box key={i} p={[0, 0.1 + i * 0.2, 2.5 - i * 0.18]} s={[2.4, 0.2, 0.36]} c="#9a968e" />
    ))}
    {/* 朱色の柱と白い壁 */}
    {[-2.8, -1.4, 0, 1.4, 2.8].map((x) => (
      <Cyl key={x} p={[x, 1.85, 1.9]} r={0.13} h={2.5} c={SHU} seg={12} />
    ))}
    <Box p={[0, 1.85, 0.2]} s={[6.2, 2.5, 3]} c="#f2ede2" />
    {[-2.1, -0.7, 0.7, 2.1].map((x) => (
      <Box key={'w' + x} p={[x, 1.85, 1.72]} s={[1.0, 2.2, 0.04]} c={SHU} />
    ))}
    <Box p={[0, 3.12, 1.9]} s={[6.4, 0.16, 0.2]} c={SHU} />
    {/* 銅板の屋根（緑青）：反りのある切妻 */}
    {[-1, 1].map((s) => (
      <mesh key={s} position={[0, 3.9, s * 0.95 + 0.3]} rotation={[s * 0.62, 0, 0]}>
        <boxGeometry args={[7.6, 0.14, 2.7]} />
        <meshStandardMaterial color="#4f8a78" roughness={0.6} />
      </mesh>
    ))}
    <Box p={[0, 4.62, 0.3]} s={[7.8, 0.22, 0.3]} c="#3f6f60" />
    {/* さい銭箱と鈴 */}
    <Box p={[0, 0.95, 2.4]} s={[1.2, 0.5, 0.5]} c="#6b4f3a" />
    <mesh position={[0, 2.6, 2.3]}>
      <sphereGeometry args={[0.13, 14, 10]} />
      <meshStandardMaterial color="#c9a24a" metalness={0.7} roughness={0.3} />
    </mesh>
    <Cyl p={[0, 1.9, 2.3]} r={0.03} h={1.3} c="#e8e0c8" seg={8} />
  </group>
);
const HONDEN_Z = -16;
const PRAY_Z = HONDEN_Z + 3.4; // さい銭箱の前
// 参拝の動き：歩く → 2回お辞儀 → 2回手を打つ → 手を合わせて祈る
const shrinePose = (f: number, dist: number): Pose => {
  if (f < 150) return walkPose((dist / STRIDE) * Math.PI * 2, 1);
  const t = f - 150;
  if (t < 44) {
    const bow = Math.max(0, Math.sin((t / 22) * Math.PI));
    return pose({spine: 1.2 * bow, head: 0.2 * bow, lSh: [0.05, 0.05], rSh: [0.05, 0.05]});
  }
  if (t < 66) {
    const clap = Math.abs(Math.sin(((t - 44) / 22) * Math.PI * 2));
    return pose({lSh: [1.3, -0.35 + 0.25 * clap], rSh: [1.3, -0.35 + 0.25 * clap], lEl: 0.7, rEl: 0.7});
  }
  return pose({lSh: [1.15, -0.42], rSh: [1.15, -0.42], lEl: 1.0, rEl: 1.0, head: 0.3, spine: 0.15});
};
const CAM_4 = (f: number): CamKey[] => [
  {f: 0, pos: [0.5, 1.3, 8.0], look: [0, 2.6, -6], fov: 55},
  {f: 70, pos: [0.4, 1.5, 3.0], look: [0, 2.0, -10], fov: 52, ease: LIN},
  {f: 132, pos: [0.4, 1.7, -3.6], look: [0, 1.6, -14], fov: 50, ease: LIN},
  {f: 152, pos: [5.0, 1.85, PRAY_Z + 4.9], look: [0.6, 1.2, PRAY_Z + 1.0], fov: 52},
  {f: 300, pos: [5.3, 1.95, PRAY_Z + 5.5], look: [0.7, 1.2, PRAY_Z + 1.2], fov: 52, ease: LIN},
];
export const B4: React.FC = () => {
  const f = useCurrentFrame();
  // 鳥居をくぐった先（z = −3）から、さい銭箱の前まで歩き、140フレームで着く（約2m/秒）
  const START_Z = -3;
  const WALK_END = 140;
  const dist = Math.min((f / WALK_END) * (START_Z - PRAY_Z), START_Z - PRAY_Z);
  const z = START_Z - dist;
  const cam = CAM_4(f);
  const herPos: V3 = [1.75, 0, PRAY_Z + 3.3];
  const peek = sm((f - 180) / 14);
  return (
    <AbsoluteFill>
      <Stage bg="#f4dcc8" shadows={false}>
        <CameraRig keys={cam} />
        <SkyDome top="#9fbfe0" horizon="#f8dcc0" sunDir={[0.7, 0.18, -0.4]} sunColor="#ffe0b0" sunPower={10} />
        <hemisphereLight args={['#ffeedd', '#7a6a58', 1.0]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[14, 6, -6]} intensity={1.6} color="#ffd8a8" />
        <directionalLight position={[-4, 6, 10]} intensity={0.6} />
        <Box p={[0, -0.06, -6]} s={[40, 0.1, 50]} c="#c8bca8" />
        {/* 石畳の参道 */}
        <Box p={[0, 0.0, -6]} s={[2.2, 0.04, 26]} c="#a8a49c" />
        {Array.from({length: 26}).map((_, i) => (
          <Box key={i} p={[0, 0.025, 6 - i]} s={[2.2, 0.01, 0.03]} c="#8a867e" />
        ))}
        <Torii z={-0.5} />
        {Array.from({length: 4}).map((_, i) => (
          <React.Fragment key={i}>
            <Lantern p={[-1.9, 0, -2.5 - i * 3]} />
            <Lantern p={[1.9, 0, -2.5 - i * 3]} />
          </React.Fragment>
        ))}
        <Honden z={HONDEN_Z} />
        {/* まわりの木々 */}
        {Array.from({length: 16}).map((_, i) => (
          <group key={'t' + i} position={[(i % 2 ? 1 : -1) * (6 + (i % 4)), 0, 4 - i * 2.2]}>
            <Cyl p={[0, 1.6, 0]} r={0.15} h={3.2} c="#5a4030" seg={8} />
            <mesh position={[0, 4.0, 0]}>
              <icosahedronGeometry args={[1.6, 1]} />
              <meshStandardMaterial color={i % 3 ? '#3f6f3a' : '#4f7f44'} flatShading />
            </mesh>
          </group>
        ))}
        <Him position={[0, 0, z]} rotation={[0, Math.PI, 0]} p={shrinePose(f, dist)} />
        {/* 灯籠の陰からのぞく彼女 */}
        {f > 170 && <Lantern p={[1.3, 0, PRAY_Z + 2.85]} />}
        {f > 170 && <Her position={[herPos[0] + 0.3 * (1 - peek), 0, herPos[2]]} rotation={[0, Math.PI + 0.5, 0]} p={pose({spine: 0.25 * peek, twist: -0.2, lSh: [0.9, 0.1], lEl: 1.4, head: 0.1})} />}
      </Stage>
      <Bubbles id="b4_day90" f={f} cam={cam} him={[0, 1.9, z]} her={[herPos[0], 1.7, herPos[2]]} />
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 5. 120日目：出張中、連絡してもまったくつながらない ----------
// 夜の部屋で、ソファに座ってスマホを見つめる彼女。画面には、既読のつかないメッセージと、つながらない電話
const MSGS: {at: number; text: string; time: string}[] = [
  {at: 24, text: '今どこ？', time: '21:03'},
  {at: 52, text: '大丈夫？', time: '23:41'},
  {at: 80, text: 'おーい', time: '2:15'},
  {at: 108, text: '生きてる？', time: '7:30'},
];
const CALL_FROM = 150;
const PhoneScreen: React.FC<{f: number}> = ({f}) => {
  const k = interpolate(f, [14, 24, 220, 230], [0, 1, 1, 0], clamp);
  if (k <= 0) return null;
  const W = 400, H = 620;
  const calling = f >= CALL_FROM;
  const noAnswer = f >= CALL_FROM + 36;
  return (
    <div style={{position: 'absolute', left: (1080 - W) / 2 - 40, top: 540, width: W, height: H, opacity: k, transform: `translateY(${(1 - k) * 30 + 6 * Math.sin(f * 0.07)}px) rotate(${1.2 * Math.sin(f * 0.05)}deg)`, borderRadius: 48, background: '#111216', padding: 14, boxSizing: 'border-box', boxShadow: '0 16px 50px rgba(0,0,0,0.5)'}}>
      <div data-telop="phone" style={{position: 'relative', width: '100%', height: '100%', borderRadius: 36, overflow: 'hidden', background: calling ? '#1d2230' : '#eef0f3', fontFamily: SANS}}>
        {!calling ? (
          <>
            <div style={{height: 70, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 30, color: '#1d1d22', borderBottom: '1px solid #ddd'}}>彼</div>
            <div style={{padding: '18px 18px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16}}>
              {MSGS.filter((m) => f >= m.at).map((m, i) => {
                const pop = Math.min(1, (f - m.at) / 6);
                return (
                  <div key={i} style={{display: 'flex', alignItems: 'flex-end', gap: 8, opacity: pop, transform: `scale(${0.9 + 0.1 * pop})`, transformOrigin: 'right bottom'}}>
                    {/* 既読はつかない：時刻だけ */}
                    <span style={{fontSize: 18, color: '#8a8f99', whiteSpace: 'pre'}}>{m.time}</span>
                    <span style={{background: '#7bd86a', color: '#1d1d22', fontWeight: 700, fontSize: 32, borderRadius: 22, padding: '10px 18px', whiteSpace: 'pre'}}>{m.text}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 90, color: '#fff'}}>
            <div style={{width: 120, height: 120, borderRadius: 60, background: '#5a6478'}} />
            <div style={{marginTop: 22, fontSize: 40, fontWeight: 900}}>彼</div>
            {!noAnswer ? (
              <div style={{marginTop: 12, fontSize: 28, opacity: 0.6 + 0.4 * Math.abs(Math.sin(f * 0.15)), whiteSpace: 'pre'}}>発信中…</div>
            ) : (
              <div style={{marginTop: 28, fontSize: 25, lineHeight: 1.6, textAlign: 'center', color: '#e8eaf0', whiteSpace: 'pre'}}>{'おかけになった電話は\n電波の届かない場所にあるか\n電源が入っていないため\nかかりません'}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
const CAM_5: CamKey[] = [
  {f: 0, pos: [1.2, 1.6, 3.2], look: [0, 0.8, -1.2], fov: 48},
  {f: 300, pos: [-1.0, 1.3, 2.0], look: [-0.1, 0.85, -1.2], fov: 48, ease: LIN},
];
export const B5: React.FC = () => {
  const f = useCurrentFrame();
  const SOFA_Z = -1.6;
  // 座面の高さ 0.5m のソファ
  const sitY = 0.5 - 0.93 * HER_S + 0.06;
  const toEar = sm((f - CALL_FROM) / 10) * (1 - sm((f - 222) / 10));
  const herP: Pose = lerpPose({...SEATED, rSh: [1.1 + 0.05 * Math.sin(f * 0.9), 0.1], rEl: 1.6 + 0.08 * Math.sin(f * 1.3), lSh: [0.6, 0.1], lEl: 1.2, head: 0.45 + 0.05 * Math.sin(f * 0.11), spine: 0.15}, {...SEATED, rSh: [1.6, 0.6], rEl: 2.4, head: 0.1, spine: 0.05}, toEar);
  const slump = sm((f - 226) / 14);
  return (
    <AbsoluteFill>
      <Stage bg="#1c2236" shadows={false}>
        <CameraRig keys={CAM_5} />
        <Interior wall="#3a4258" floor="#4a3a30" night />
        <group position={[0, 0, SOFA_Z]}>
          <Box p={[0, 0.25, 0]} s={[2.2, 0.5, 0.9]} c="#6a7fa8" />
          <Box p={[0, 0.7, -0.38]} s={[2.2, 0.6, 0.2]} c="#5f739a" />
          <Box p={[-1.05, 0.45, 0]} s={[0.15, 0.4, 0.9]} c="#5f739a" />
          <Box p={[1.05, 0.45, 0]} s={[0.15, 0.4, 0.9]} c="#5f739a" />
        </group>
        {/* 窓の外は夜 → 明け方へ（時間がたっていく） */}
        <Box p={[1.2, 1.7, -2.54]} s={[1.6, 1.4, 0.02]} c={f < 110 ? '#141c34' : '#3a4a70'} e={f < 110 ? '#1c2848' : '#5a6a90'} ei={0.5} />
        <Her position={[0.1, sitY, SOFA_Z + 0.1]} p={{...herP, spine: herP.spine + 0.15 * slump, head: herP.head + 0.2 * slump}} rHand={<HandPhone />} />
        {/* スマホの光が顔を照らす */}
        <pointLight position={[0.15, 1.1, SOFA_Z + 0.5]} intensity={0.45} distance={1.4} color="#9fc8ff" />
      </Stage>
      <PhoneScreen f={f} />
      <Bubbles id="b5_day120" f={f} cam={CAM_5} him={[0, 0, 0]} her={[0.1, 1.25, SOFA_Z + 0.1]} />
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

// ---------- 6. 180日目：寝言が5か国語 ----------
const CAM_6: CamKey[] = [
  {f: 0, pos: [2.2, 2.4, 2.9], look: [0, 0.7, -0.4], fov: 48},
  {f: 270, pos: [1.4, 2.2, 2.4], look: [0, 0.7, -0.4], fov: 48, ease: LIN},
];
export const B6: React.FC = () => {
  const f = useCurrentFrame();
  const up = sm((f - 70) / 16);
  const bed: V3 = [0, 0, -0.4];
  return (
    <AbsoluteFill>
      <Stage bg="#1c2236" shadows={false}>
        <CameraRig keys={CAM_6} />
        <Interior wall="#3a4258" floor="#4a3a30" night />
        <directionalLight position={[2, 4, -3]} intensity={0.6} color="#9db8ff" />
        <group position={bed}>
          <Box p={[0, 0.17, 0]} s={[1.6, 0.34, 2.2]} c="#6b4f3a" />
          <Box p={[0, 0.44, 0]} s={[1.5, 0.2, 2.1]} c="#e8e6e1" r={0.9} />
          <Box p={[0, 0.7, -1.06]} s={[1.6, 0.8, 0.08]} c="#5e4532" />
          <Box p={[0, 0.58, 0.35]} s={[1.54, 0.08, 1.3]} c="#7a8ab0" r={0.95} />
          {[-0.38, 0.38].map((x) => (
            <Box key={x} p={[x, 0.6, -0.82]} s={[0.55, 0.12, 0.32]} c="#f2f1ed" />
          ))}
        </group>
        {/* 彼：あおむけで寝て、寝言をいう／彼女：起き上がって見つめる */}
        <group position={[0.38, 0.62, bed[2] + 0.85]} rotation={[-Math.PI / 2, 0, 0]}>
          <Him position={[0, 0, 0]} p={pose({head: 0.1 * Math.sin(f * 0.3) * (f % 44 < 30 ? 1 : 0), lSh: [0.1, 0.2], rSh: [0.1, 0.2]})} />
        </group>
        <group position={[-0.38, lerp(0.62, 0.0, up), lerp(bed[2] + 0.85, bed[2] + 0.1, up)]} rotation={[lerp(-Math.PI / 2, 0, up), 0, 0]}>
          <Her position={[0, lerp(0, -0.36, up), 0]} p={lerpPose(pose({}), {...pose({lHip: [1.5, 0.05], rHip: [1.5, 0.05], lKn: 0.1, rKn: 0.1, lSh: [0.3, 0.2], rSh: [0.3, 0.2]}), twist: -0.5, head: 0.2}, up)} />
        </group>
      </Stage>
      <Bubbles id="b6_day180" f={f} cam={CAM_6} him={[0.38, 0.75, bed[2] - 0.75]} her={[-0.38, 1.2, bed[2]]} />
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

// ---------- 7・8. 365日目：記録ファイル → 彼女の調査報告書 ----------
const fileTex = (() => {
  const cache: Record<string, THREE.CanvasTexture> = {};
  return (label: string, color: string) => {
    if (cache[label]) return cache[label];
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 320;
    const g = cv.getContext('2d')!;
    g.fillStyle = color;
    g.fillRect(0, 0, 256, 320);
    g.fillStyle = '#ffffff';
    g.fillRect(40, 60, 176, 90);
    g.fillStyle = '#1d1d22';
    g.font = "900 44px 'Noto Sans JP', sans-serif";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, 128, 106);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    cache[label] = t;
    return t;
  };
})();
const spineTex = (() => {
  const cache: Record<string, THREE.CanvasTexture> = {};
  return (label: string, color: string) => {
    if (cache[label]) return cache[label];
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 160;
    const g = cv.getContext('2d')!;
    g.fillStyle = color;
    g.fillRect(0, 0, 512, 160);
    g.fillStyle = '#ffffff';
    g.font = "900 72px 'Noto Sans JP', sans-serif";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, 256, 84);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    cache[label] = t;
    return t;
  };
})();
const FileBinder: React.FC<{p: V3; thick: number; label: string; color: string; rot?: V3}> = ({p, thick, label, color, rot = [0, 0, 0]}) => (
  <group position={p} rotation={rot}>
    <mesh position={[0, thick / 2, 0]}>
      <boxGeometry args={[0.24, thick, 0.31]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
    {/* 紙の束（側面） */}
    <Box p={[0.005, thick / 2, 0]} s={[0.235, thick * 0.86, 0.3]} c="#f4f2ea" />
    <mesh position={[0, thick + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.24, 0.31]} />
      <meshStandardMaterial map={fileTex(label, color)} />
    </mesh>
    {/* 背表紙（手前を向く面）にもラベル */}
    <mesh position={[0, thick / 2, 0.156]}>
      <planeGeometry args={[0.24, thick]} />
      <meshStandardMaterial map={spineTex(label, color)} />
    </mesh>
  </group>
);
const Restaurant: React.FC<{f: number}> = ({f}) => (
  <>
    <Interior wall="#4a3a3a" floor="#3a2a24" night warm />
    <Table cloth />
    <Chair p={HIM_SEAT} ry={-Math.PI / 2} />
    <Chair p={HER_SEAT} ry={Math.PI / 2} />
    {/* キャンドルとグラス */}
    <Cyl p={[0, TABLE_H + 0.06, 0.2]} r={0.025} h={0.12} c="#f4f0e0" />
    <mesh position={[0, TABLE_H + 0.15 + 0.005 * Math.sin(f * 0.7), 0.2]} scale={[1, 1 + 0.15 * Math.sin(f * 0.9), 1]}>
      <coneGeometry args={[0.012, 0.04, 8]} />
      <meshBasicMaterial color="#ffc860" />
    </mesh>
    <pointLight position={[0, TABLE_H + 0.3, 0.2]} intensity={1.8 + 0.2 * Math.sin(f * 0.9)} distance={2.5} color="#ffb870" />
    {[-0.22, 0.22].map((x) => (
      <group key={x} position={[x, TABLE_H, 0.22]}>
        <Cyl p={[0, 0.06, 0]} r={0.006} h={0.12} c="#e8eef2" />
        <Cyl p={[0, 0.15, 0]} r={0.035} r2={0.02} h={0.07} c="#d8e4ea" />
      </group>
    ))}
    {/* 窓の夜景 */}
    <Box p={[0.3, 1.6, -2.54]} s={[3.4, 1.8, 0.02]} c="#141c34" e="#1c2848" ei={0.5} />
    {Array.from({length: 40}).map((_, i) => (
      <Box key={i} p={[-1.3 + ((i * 37) % 32) / 10, 0.9 + ((i * 13) % 12) / 10, -2.52]} s={[0.03, 0.03, 0.01]} c="#ffd58a" e="#ffd58a" ei={1.2} />
    ))}
  </>
);
const CAM_7: CamKey[] = [
  {f: 0, pos: [0.3, 1.7, 4.4], look: [0, 0.85, 0], fov: 46},
  {f: 270, pos: [-0.5, 1.55, 3.6], look: [0, 0.85, 0], fov: 46, ease: LIN},
];
export const B7: React.FC = () => {
  const f = useCurrentFrame();
  const place = sm((f - 40) / 18);
  const shock = sm((f - 120) / 10);
  const himP: Pose = {...SEATED, rSh: [lerp(0.45, 1.0, place * (1 - sm((f - 70) / 10))), 0.1], rEl: 0.6, head: 0.1};
  const herP: Pose = lerpPose({...SEATED, head: 0}, {...SEATED, lSh: [1.4, 0.4], rSh: [1.4, 0.4], lEl: 1.8, rEl: 1.8, spine: -0.15, head: -0.1}, shock);
  return (
    <AbsoluteFill>
      <Stage bg="#3a2a2a" shadows={false}>
        <CameraRig keys={CAM_7} />
        <Restaurant f={f} />
        <Him position={[HIM_SEAT[0], SIT_Y, 0]} rotation={[0, -Math.PI / 2, 0]} p={himP} />
        <Her position={[HER_SEAT[0], SIT_YH, 0]} rotation={[0, Math.PI / 2, 0]} p={herP} />
        {place > 0 && <FileBinder p={[lerp(0.45, 0.05, place), TABLE_H + lerp(0.25, 0, place), -0.08]} thick={0.07} label="記録" color="#2f5a8a" rot={[0, 0.1, 0]} />}
      </Stage>
      <Bubbles id="b7_day365" f={f} cam={CAM_7} him={[HIM_SEAT[0], 1.35, 0]} her={[HER_SEAT[0], 1.28, 0]} />
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};
const CAM_8: CamKey[] = [
  {f: 0, pos: [-0.5, 1.55, 3.6], look: [0, 0.85, 0], fov: 46},
  {f: 110, pos: [0.1, 1.5, 3.2], look: [-0.05, 0.85, 0], fov: 46, ease: LIN},
  {f: 330, pos: [0.9, 1.7, 4.2], look: [0, 0.85, 0], fov: 46, ease: LIN},
];
export const B8: React.FC = () => {
  const f = useCurrentFrame();
  const pull = sm((f - 70) / 20);
  const thud = f >= 92;
  const shock = sm((f - 100) / 8);
  const himP: Pose = lerpPose({...SEATED, head: 0.1}, {...shockPose(f), lHip: [1.5, 0.08], rHip: [1.5, 0.08], lKn: 1.5, rKn: 1.5}, shock);
  const herP: Pose = lerpPose({...SEATED, head: 0.05}, {...SEATED, rSh: [1.0, -0.1], rEl: 0.6, lSh: [0.6, 0.1], lEl: 1.4, head: 0.1, spine: 0.08}, pull);
  return (
    <AbsoluteFill>
      <Stage bg="#3a2a2a" shadows={false}>
        <CameraRig keys={CAM_8} shakes={[{from: 92, dur: 10, amp: 0.03}]} />
        <Restaurant f={f} />
        <Him position={[HIM_SEAT[0], SIT_Y, 0]} rotation={[0, -Math.PI / 2, 0]} p={himP} />
        <Her position={[HER_SEAT[0], SIT_YH, 0]} rotation={[0, Math.PI / 2, 0]} p={herP} />
        <FileBinder p={[0.05, TABLE_H, -0.08]} thick={0.07} label="記録" color="#2f5a8a" rot={[0, 0.1, 0]} />
        {/* 彼女のは、ずっと分厚い「調査報告書」 */}
        {pull > 0 && <FileBinder p={[lerp(-0.5, -0.2, pull), TABLE_H + (thud ? 0 : lerp(0.3, 0.05, pull)), 0.05]} thick={0.24} label="調査報告書" color="#8a2f3a" rot={[0, -0.15, 0]} />}
      </Stage>
      <Bubbles id="b8_end" f={f} cam={CAM_8} him={[HIM_SEAT[0], 1.4, 0]} her={[HER_SEAT[0], 1.28, 0]} />
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};
