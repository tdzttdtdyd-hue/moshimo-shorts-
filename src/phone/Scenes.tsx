import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {project} from '../lib/project';
import {Human, IDLE, OUTFITS, Outfit, Pose, pose, shockPose, thinkPose, walkPose} from '../three/Human';
import {Earth, SpaceBackdrop, Stars} from '../three/Earth';
import {Road, SkyDome, Tower} from '../three/Landscape';
import {CalloutView, Vignette} from './Overlay';
import {SCENES, WAKE_AT} from './script';

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

const Box: React.FC<{p: V3; s: V3; c: string; r?: number; e?: string; ei?: number; rot?: V3; m?: number}> = ({p, s, c, r = 0.75, e, ei = 0, rot = [0, 0, 0], m = 0}) => (
  <mesh position={p} rotation={rot}>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e ?? '#000'} emissiveIntensity={ei} />
  </mesh>
);
const outfit = (i: number): Outfit => OUTFITS[i % OUTFITS.length];

// 看板（キャンバスに文字）
const signCache: Record<string, THREE.CanvasTexture> = {};
const signTex = (text: string, bg: string, fg: string) => {
  const key = text + bg + fg;
  if (signCache[key]) return signCache[key];
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 192;
  const g = cv.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 192);
  g.fillStyle = fg;
  g.font = "900 104px 'Noto Sans JP', sans-serif";
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 100);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  signCache[key] = t;
  return t;
};
const Sign: React.FC<{p: V3; text: string; w?: number; bg?: string; fg?: string; rot?: V3; glow?: number}> = ({p, text, w = 1.6, bg = '#1f4f8f', fg = '#ffffff', rot = [0, 0, 0], glow = 0.5}) => (
  <mesh position={p} rotation={rot}>
    <planeGeometry args={[w, w * 0.375]} />
    <meshStandardMaterial map={signTex(text, bg, fg)} emissive="#ffffff" emissiveMap={signTex(text, bg, fg)} emissiveIntensity={glow} />
  </mesh>
);

// ---------- 1. 7:00 目覚ましが鳴らない → 8:10 飛び起きる ----------
const Bed: React.FC<{p?: V3; wake?: number}> = ({p = [0, 0, 0], wake = 0}) => {
  const fly = sm(wake);
  return (
    <group position={p}>
      <Box p={[0, 0.17, 0]} s={[1.3, 0.34, 2.2]} c="#8a6a4e" />
      <Box p={[0, 0.5, -1.06]} s={[1.3, 0.7, 0.08]} c="#7a5c42" />
      <Box p={[0, 0.44, 0]} s={[1.2, 0.2, 2.1]} c="#f2f0ea" r={0.9} />
      <Box p={[0, 0.6, -0.8]} s={[0.7, 0.12, 0.36]} c="#ffffff" r={0.95} />
      <group position={[lerp(0, -1.0, fly), lerp(0.66, 0.08, fly) + Math.sin(fly * Math.PI) * 0.6, lerp(0.35, 0.6, fly)]} rotation={[0, fly * 0.6, lerp(0, 1.3, fly)]}>
        <Box p={[0, 0, 0]} s={[1.26, 0.08, 1.3]} c="#7f9cc4" r={0.95} />
      </group>
    </group>
  );
};
const CAM_P1: CamKey[] = [
  {f: 0, pos: [2.2, 2.0, 2.6], look: [0, 0.6, -0.3], fov: 50},
  {f: WAKE_AT, pos: [1.8, 1.8, 2.2], look: [0, 0.6, -0.3], fov: 50, ease: LIN},
  {f: 150, pos: [2.9, 1.6, 4.2], look: [0.7, 1.0, 0.3], fov: 50},
];
export const P1: React.FC = () => {
  const f = useCurrentFrame();
  const u = interpolate(f, [WAKE_AT, WAKE_AT + 14], [0, 1], clamp);
  const e = sm(u);
  const bed: V3 = [0, 0.06, -0.15];
  const pos: V3 = [lerp(bed[0], 1.0, e), lerp(bed[1] + 0.6, 0, e) + Math.sin(e * Math.PI) * 0.55, lerp(bed[2] + 0.82, 0.75, e)];
  const rot: V3 = [lerp(-Math.PI / 2, 0, e), lerp(0, -0.35, e), 0];
  const p = u < 1 ? pose({lSh: [0.2, 0.3], rSh: [0.2, 0.3], lEl: 0.4, rEl: 0.4}) : shockPose(f);
  const breathe = u === 0 ? Math.sin(f * 0.12) * 0.01 : 0;
  return (
    <AbsoluteFill>
      <Stage bg="#dfe6ee" shadows={false}>
        <CameraRig keys={CAM_P1} shakes={[{from: WAKE_AT + 12, dur: 10, amp: 0.05}]} />
        <hemisphereLight args={['#fff6e8', '#8a7a68', 1.2]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[2, 3, -4]} intensity={1.6} color="#fff0d8" />
        <directionalLight position={[3, 3.5, 6]} intensity={0.9} color="#ffffff" />
        <Box p={[0, -0.05, 0]} s={[9, 0.1, 9]} c="#b08a66" />
        <Box p={[0, 1.6, -1.7]} s={[9, 3.4, 0.1]} c="#efe8dc" />
        <Box p={[-2.4, 1.6, 0]} s={[0.1, 3.4, 9]} c="#e6ddcf" />
        {/* 朝の窓と差し込む光 */}
        <group position={[1.15, 1.7, -1.63]}>
          <Box p={[0, 0, -0.02]} s={[1.32, 1.22, 0.05]} c="#ffffff" />
          <Box p={[0, 0, 0.005]} s={[1.2, 1.1, 0.01]} c="#cfe6ff" e="#dff0ff" ei={1.0} />
          <Box p={[0, 0, 0.02]} s={[0.03, 1.1, 0.02]} c="#ffffff" />
        </group>
        <mesh position={[0.9, 0.9, -0.6]} rotation={[-0.5, 0, 0.2]}>
          <planeGeometry args={[1.1, 2.4]} />
          <meshBasicMaterial color="#fff4d8" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {/* ナイトテーブル：充電ケーブルだけ（スマホがない） */}
        <Box p={[-1.0, 0.27, -0.9]} s={[0.5, 0.54, 0.45]} c="#8a6a4e" />
        <mesh position={[-1.0, 0.56, -0.85]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.08, 0.006, 6, 24, Math.PI * 1.6]} />
          <meshStandardMaterial color="#f4f4f4" />
        </mesh>
        <Bed p={[0, 0, -0.15]} wake={u * 1.4} />
        <Human outfit={OUTFITS[2]} position={[pos[0], pos[1] + breathe, pos[2]]} rotation={rot} p={p} />
      </Stage>
      <CableTag f={f} />
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};
const CableTag: React.FC<{f: number}> = ({f}) => {
  const pt = project(CAM_P1, f, [-1.0, 0.57, -0.85]);
  return <CalloutView x={pt.x} y={pt.y} tag="スマホ" text="ない" from={64} to={96} dy={-200} dx={80} />;
};

// ---------- 2. 8:30 改札が通れない ----------
const LANES = [-2.25, -0.75, 0.75, 2.25];
const GATE_Z = 0;
const CAM_P2: CamKey[] = [
  {f: 0, pos: [1.2, 3.4, 7.5], look: [0, 1.0, -1.5], fov: 50},
  {f: 180, pos: [-1.0, 3.0, 6.2], look: [0, 1.0, -1.5], fov: 50, ease: LIN},
];
// 改札に着く時刻（レーンごと）
const TAP = [30, 48, 64, 84];
export const P2: React.FC = () => {
  const f = useCurrentFrame();
  const queue = useMemo(() => {
    const r = mulberry32(4);
    return Array.from({length: 18}).map((_, i) => ({lane: i % 4, row: 1 + Math.floor(i / 4), jx: (r() - 0.5) * 0.3, o: i + 3}));
  }, []);
  return (
    <AbsoluteFill>
      <Stage bg="#cfd4da" shadows={false}>
        <CameraRig keys={CAM_P2} />
        <hemisphereLight args={['#ffffff', '#9a968e', 1.1]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[3, 6, 6]} intensity={1.2} />
        <Box p={[0, -0.05, -3]} s={[14, 0.1, 18]} c="#cfc8bc" r={0.5} />
        <Box p={[0, 2.4, -9]} s={[14, 5, 0.2]} c="#e6e2da" />
        <Sign p={[0, 3.3, -8.85]} text="改札" w={2.4} />
        {[-4, 0, 4].map((x) => (
          <Box key={x} p={[x, 4.6, -3]} s={[2.4, 0.06, 0.4]} c="#ffffff" e="#ffffff" ei={1} />
        ))}
        {/* 改札機（5台）とフラップ */}
        {[-3, -1.5, 0, 1.5, 3].map((x, k) => (
          <group key={k} position={[x, 0, GATE_Z]}>
            <Box p={[0, 0.5, 0]} s={[0.3, 1.0, 1.6]} c="#e9ecef" r={0.4} />
            <Box p={[0, 1.0, 0.0]} s={[0.32, 0.04, 1.62]} c="#3d4250" />
            <Box p={[0, 1.03, -0.55]} s={[0.24, 0.02, 0.24]} c="#4fa3ff" e="#4fa3ff" ei={0.9} />
          </group>
        ))}
        {LANES.map((lx, i) => {
          const shut = f > TAP[i] + 6;
          const k = shut ? sm((f - TAP[i] - 6) / 4) : 0;
          return (
            <group key={i}>
              {[-1, 1].map((s) => (
                <Box key={s} p={[lx + s * lerp(0.62, 0.36, k), 0.75, GATE_Z + 0.1]} s={[lerp(0.04, 0.5, k), 0.3, 0.05]} c={shut ? '#e05050' : '#dfe3e8'} e={shut ? '#ff3030' : '#000'} ei={shut ? 0.6 : 0} />
              ))}
              {shut && <Box p={[lx + 0.75 * (i < 2 ? 1 : -1), 1.04, GATE_Z - 0.55]} s={[0.25, 0.03, 0.25]} c="#ff4040" e="#ff3030" ei={1.2} />}
            </group>
          );
        })}
        {/* 先頭の人：歩いてきて、手をかざすが空振り → フラップが閉まって止まる */}
        {LANES.map((lx, i) => {
          const z = interpolate(f, [TAP[i] - 40, TAP[i]], [-5.5, GATE_Z - 0.9], clamp);
          const walking = f < TAP[i];
          const tapK = sm((f - TAP[i]) / 6) * (1 - sm((f - TAP[i] - 14) / 6));
          const shock = sm((f - TAP[i] - 14) / 5);
          let p = walking ? walkPose(f * 0.3 + i, 1) : lerpPose(IDLE, pose({rSh: [0.9, 0.1], rEl: 0.5, head: 0.25}), tapK);
          if (!walking) p = lerpPose(p, shockPose(f + i * 5), shock);
          return <Human key={i} outfit={outfit(i)} position={[lx, 0, z]} p={p} />;
        })}
        {/* 後ろにできる行列 */}
        {queue.map((q, i) => {
          const zT = GATE_Z - 0.9 - q.row * 0.75;
          const arrive = TAP[q.lane] + q.row * 14;
          const z = interpolate(f, [arrive - 50, arrive], [-9, zT], clamp);
          const walking = f < arrive;
          const p = walking ? walkPose(f * 0.3 + i, 1) : thinkPose(f + i * 3);
          return <Human key={i} outfit={outfit(q.o)} position={[LANES[q.lane] + q.jx, 0, z]} rotation={[0, (i % 3) * 0.1 - 0.1, 0]} p={p} />;
        })}
      </Stage>
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};

// ---------- 3. 9:00 待ち合わせできない ----------
const CAM_P3: CamKey[] = [
  {f: 0, pos: [3, 11, 15], look: [0, 0.3, 0], fov: 50},
  {f: 165, pos: [-2, 10.5, 14], look: [0, 0.3, 0], fov: 50, ease: LIN},
];
// A さんと B さんは、それぞれ別の角のまわりをぐるぐる
const pathA = (f: number): {p: V3; ry: number} => {
  const a = f * 0.035;
  return {p: [-1.4 + Math.cos(a) * 1.1, 0, 2.0 + Math.sin(a) * 1.1], ry: -a};
};
const pathB = (f: number): {p: V3; ry: number} => {
  const a = -f * 0.035 + 2;
  return {p: [1.4 + Math.cos(a) * 1.1, 0, -2.0 + Math.sin(a) * 1.1], ry: -a + Math.PI};
};
const ZEBRA: React.FC<{p: V3; rot?: number}> = ({p, rot = 0}) => (
  <group position={p} rotation={[0, rot, 0]}>
    {Array.from({length: 7}).map((_, i) => (
      <mesh key={i} position={[-1.5 + i * 0.5, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.28, 2.4]} />
        <meshStandardMaterial color="#f3f0e2" />
      </mesh>
    ))}
  </group>
);
export const P3: React.FC = () => {
  const f = useCurrentFrame();
  const A = pathA(f), B = pathB(f);
  const walkers = useMemo(() => {
    const r = mulberry32(12);
    return Array.from({length: 12}).map((_, i) => ({x0: (r() - 0.5) * 16, z: r() < 0.5 ? 2.9 : -2.9, v: (r() < 0.5 ? 1 : -1) * (0.03 + r() * 0.02), o: i + 1, alongX: r() < 0.5}));
  }, []);
  const ca = CO('p3_meet', 'a'), cb = CO('p3_meet', 'b');
  const pa = project(CAM_P3, f, [A.p[0], 1.9, A.p[2]]);
  const pb = project(CAM_P3, f, [B.p[0], 1.9, B.p[2]]);
  return (
    <AbsoluteFill>
      <Stage bg="#cfe3f5" shadows={false}>
        <CameraRig keys={CAM_P3} />
        <SkyDome top="#7fb2e6" horizon="#e2eef8" />
        <hemisphereLight args={['#ffffff', '#8a8a80', 1.0]} />
        <directionalLight position={[8, 12, 6]} intensity={1.6} />
        <Box p={[0, -0.06, 0]} s={[60, 0.1, 60]} c="#bdb8ae" />
        <Road length={60} width={3.6} position={[0, 0, 0]} sidewalk={false} />
        <Road length={60} width={3.6} position={[0, 0.005, 0]} rotationY={Math.PI / 2} sidewalk={false} />
        <ZEBRA p={[0, 0, 2.6]} />
        <ZEBRA p={[0, 0, -2.6]} />
        <ZEBRA p={[2.6, 0, 0]} rot={Math.PI / 2} />
        <ZEBRA p={[-2.6, 0, 0]} rot={Math.PI / 2} />
        {[
          [-7, -7],
          [7, -7],
          [-7, 7],
          [7, 7],
          [-12, -7],
          [12, 7],
        ].map(([x, z], i) => (
          <Tower key={i} position={[x, 0, z]} w={6} d={6} h={6 + (i % 3) * 4} color={['#c9ccd2', '#d8cfc2', '#bfc8cf'][i % 3]} seed={i + 2} />
        ))}
        {walkers.map((w, i) => {
          const t = w.x0 + f * w.v * 6;
          const x = ((t + 20) % 40 + 40) % 40 - 20;
          return <Human key={i} outfit={outfit(w.o)} position={w.alongX ? [x, 0, w.z + (i % 2) * 0.6] : [w.z + (i % 2) * 0.6, 0, x]} rotation={[0, w.alongX ? (w.v > 0 ? Math.PI / 2 : -Math.PI / 2) : w.v > 0 ? 0 : Math.PI, 0]} p={walkPose(f * 0.3 + i, 1)} />;
        })}
        <Human outfit={{shirt: '#e2574c', pants: '#2f3e5c', skin: '#e9b99a', hair: '#2b211c'}} position={A.p} rotation={[0, A.ry, 0]} p={{...walkPose(f * 0.3, 0.9), head: -0.1, twist: 0.3 * Math.sin(f * 0.1)}} />
        <Human outfit={{shirt: '#3f7fd0', pants: '#3b3b44', skin: '#d6a27f', hair: '#1c1714'}} position={B.p} rotation={[0, B.ry, 0]} p={{...walkPose(f * 0.3 + 1, 0.9), head: -0.1, twist: 0.3 * Math.cos(f * 0.1)}} />
      </Stage>
      <CalloutView x={pa.x} y={pa.y} tag={ca.tag} text={ca.text} from={ca.from} to={ca.to} dx={ca.dx} dy={ca.dy} />
      <CalloutView x={pb.x} y={pb.y} tag={cb.tag} text={cb.text} from={cb.from} to={cb.to} dx={cb.dx} dy={cb.dy} />
    </AbsoluteFill>
  );
};

// ---------- 4. 9:30 電車：全員が無言で前を見つめる ----------
const SEATED = (t: number): Pose => pose({lHip: [1.5, 0.08], rHip: [1.5, 0.08], lKn: 1.5, rKn: 1.5, lSh: [0.45, 0.1], rSh: [0.45, 0.1], lEl: 0.7, rEl: 0.7, head: 0.02 * Math.sin(t * 0.05)});
const CAM_P4: CamKey[] = [
  {f: 0, pos: [0.3, 1.55, 7.2], look: [0, 1.0, -4], fov: 56},
  {f: 180, pos: [-0.3, 1.5, 5.6], look: [0, 1.0, -4], fov: 56, ease: LIN},
];
export const P4: React.FC = () => {
  const f = useCurrentFrame();
  const sway = 0.012 * Math.sin(f * 0.11);
  const seats = useMemo(() => {
    const out: {x: number; z: number; side: number; o: number}[] = [];
    for (let i = 0; i < 8; i++) {
      out.push({x: -1.05, z: 4 - i * 1.0, side: 1, o: i});
      out.push({x: 1.05, z: 4.5 - i * 1.0, side: -1, o: i + 3});
    }
    return out;
  }, []);
  const outside = (side: number) =>
    Array.from({length: 10}).map((_, i) => {
      const z = ((i * 6 - f * 0.9) % 60 + 60) % 60 - 40;
      return <Box key={`${side}-${i}`} p={[side * (6 + (i % 3) * 2), 1 + (i % 4), z]} s={[2, 3 + (i % 4) * 2, 3]} c={['#9fb3c8', '#c8b8a0', '#a8c0a0'][i % 3]} />;
    });
  return (
    <AbsoluteFill>
      <Stage bg="#cfe6ff" shadows={false}>
        <CameraRig keys={CAM_P4} />
        <SkyDome top="#8fc0f0" horizon="#eaf4ff" />
        <hemisphereLight args={['#ffffff', '#9a9a9a', 1.0]} />
        <directionalLight position={[5, 6, 2]} intensity={1.2} />
        {outside(-1)}
        {outside(1)}
        <group rotation={[0, 0, sway]}>
          {/* 床・天井・壁（窓のすき間あり） */}
          <Box p={[0, 0, -2]} s={[2.9, 0.1, 16]} c="#8f949c" />
          <Box p={[0, 2.35, -2]} s={[2.9, 0.08, 16]} c="#eef0f2" />
          {[-1, 1].map((s) => (
            <group key={s}>
              <Box p={[s * 1.45, 0.45, -2]} s={[0.05, 0.9, 16]} c="#e6e8ea" />
              <Box p={[s * 1.45, 2.15, -2]} s={[0.05, 0.4, 16]} c="#e6e8ea" />
              {Array.from({length: 8}).map((_, i) => (
                <Box key={i} p={[s * 1.45, 1.4, 5.5 - i * 2]} s={[0.06, 1.1, 0.3]} c="#e6e8ea" />
              ))}
              <Box p={[s * 1.18, 0.42, -2]} s={[0.5, 0.12, 16]} c="#3f5f9f" />
              <Box p={[s * 1.4, 0.7, -2]} s={[0.08, 0.5, 16]} c="#3f5f9f" />
              {/* つり革 */}
              {Array.from({length: 10}).map((_, i) => (
                <group key={i} position={[s * 0.75, 2.2, 5 - i * 1.2]} rotation={[0, 0, 0.12 * Math.sin(f * 0.11 + i * 0.3)]}>
                  <Box p={[0, -0.12, 0]} s={[0.03, 0.24, 0.03]} c="#cfd3d8" />
                  <mesh position={[0, -0.3, 0]}>
                    <torusGeometry args={[0.06, 0.012, 6, 16]} />
                    <meshStandardMaterial color="#f2f2f2" />
                  </mesh>
                </group>
              ))}
            </group>
          ))}
          {[-0.6, 0.6].map((x) => (
            <Box key={x} p={[x, 2.3, -2]} s={[0.2, 0.03, 16]} c="#ffffff" e="#ffffff" ei={0.8} />
          ))}
          {/* 座っている人：全員、まっすぐ前を見ている */}
          {seats.map((s, i) => (
            <Human key={i} outfit={outfit(s.o)} position={[s.x, -0.43, s.z]} rotation={[0, (s.side * Math.PI) / 2, 0]} p={SEATED(f + i * 9)} />
          ))}
        </group>
      </Stage>
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};

// ---------- 5. 12:00 コンビニ：小銭がない ----------
const CAM_P5: CamKey[] = [
  {f: 0, pos: [6.5, 3.4, -2.6], look: [0, 1.0, 1.6], fov: 52},
  {f: 180, pos: [5.6, 3.0, -2.0], look: [0, 1.0, 1.4], fov: 52, ease: LIN},
];
const Coins: React.FC<{f: number}> = ({f}) => {
  // 手から1枚ずつカウンターに落ちる
  return (
    <>
      {Array.from({length: 9}).map((_, i) => {
        const t0 = 20 + i * 15;
        const t = f - t0;
        if (t < 0) return null;
        const fall = Math.min(1, t / 8);
        const x = -0.05 + (i % 3) * 0.06 - 0.06;
        const z = -0.2 + Math.floor(i / 3) * 0.05;
        const y = lerp(1.18, 0.96, fall * fall);
        return (
          <mesh key={i} position={[x, y, z]} rotation={[fall < 1 ? t : Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.004, 16]} />
            <meshStandardMaterial color={i % 2 ? '#c9a24a' : '#c8ccd2'} metalness={0.7} roughness={0.3} />
          </mesh>
        );
      })}
    </>
  );
};
export const P5: React.FC = () => {
  const f = useCurrentFrame();
  const shelves = useMemo(() => {
    const r = mulberry32(6);
    return Array.from({length: 3}).flatMap((_, row) =>
      Array.from({length: 4}).flatMap((__, lvl) => Array.from({length: 12}).map((___, k) => ({p: [-4 + k * 0.5, 0.35 + lvl * 0.45, -3 - row * 1.6] as V3, c: ['#e2574c', '#f2c14e', '#4f7fc9', '#5aa36e', '#f0f0f0', '#9b6fc9'][Math.floor(r() * 6)]}))),
    );
  }, []);
  const queue = Array.from({length: 7}).map((_, i) => ({p: [0.15 + i * 0.05, 0, 0.75 + i * 0.75] as V3, o: i + 1}));
  const dig = Math.sin(f * 0.25);
  return (
    <AbsoluteFill>
      <Stage bg="#f2f2ee" shadows={false}>
        <CameraRig keys={CAM_P5} />
        <hemisphereLight args={['#ffffff', '#bdbdb6', 1.2]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 6, 5]} intensity={1.0} />
        <Box p={[0, -0.05, 0]} s={[14, 0.1, 14]} c="#e8e6e0" r={0.4} />
        <Box p={[0, 1.8, -6.5]} s={[14, 3.8, 0.1]} c="#f4f4f0" />
        {shelves.map((s, i) => (
          <Box key={i} p={s.p} s={[0.4, 0.3, 0.3]} c={s.c} />
        ))}
        {/* レジカウンター・レジ・店員 */}
        <Box p={[-0.6, 0.45, -0.7]} s={[3.2, 0.9, 0.7]} c="#d8d4cc" />
        <Box p={[-0.6, 0.92, -0.7]} s={[3.25, 0.05, 0.75]} c="#8a8f99" />
        <Box p={[-0.9, 1.1, -0.85]} s={[0.4, 0.3, 0.3]} c="#3d4250" />
        <Box p={[-0.9, 1.3, -0.95]} s={[0.36, 0.22, 0.04]} c="#9fd0ff" e="#7fc0ff" ei={0.6} />
        <Sign p={[-0.6, 2.4, -1.2]} text="レジ" w={1.0} bg="#2f8f5f" />
        <Human outfit={{shirt: '#2f8f5f', pants: '#2f3440', skin: '#e3b08e', hair: '#2b211c'}} position={[-0.6, 0, -1.45]} p={pose({lSh: [0.3, 0.1], rSh: [0.3, 0.1], lEl: 0.6, rEl: 0.6, head: 0.15})} />
        {/* 先頭のお客さん：財布をのぞいて小銭を探す */}
        <Human
          outfit={OUTFITS[3]}
          position={[0, 0, 0.05]}
          rotation={[0, Math.PI, 0]}
          p={pose({spine: 0.25, head: 0.45, lSh: [0.9, -0.1], lEl: 1.3, rSh: [0.8 + 0.15 * dig, -0.2], rEl: 1.4 + 0.2 * dig})}
          lHand={<Box p={[0, -0.05, 0.03]} s={[0.12, 0.09, 0.03]} c="#6b4a2e" />}
        />
        <Coins f={f} />
        {/* 行列（いらいら） */}
        {queue.map((q, i) => (
          <Human key={i} outfit={outfit(q.o)} position={q.p} rotation={[0, Math.PI + (i % 2 ? 0.15 : -0.1), 0]} p={i % 3 === 0 ? thinkPose(f + i * 7) : pose({head: 0.05 * Math.sin(f * 0.1 + i), lKn: 0.1 + 0.08 * Math.max(0, Math.sin(f * 0.2 + i)), lSh: [0, 0.15], rSh: [0, 0.15]})} />
        ))}
      </Stage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 6. 地球：人類から消えたスマホ時間 ----------
const CAM_P6: CamKey[] = [
  {f: 0, pos: [0, 0.6, 9.5], look: [0, 1.4, 0], fov: 40},
  {f: 165, pos: [-1.6, 1.0, 8.6], look: [0, 1.4, 0], fov: 40, ease: LIN},
];
export const P6: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM_P6} />
        <ambientLight intensity={0.1} />
        <hemisphereLight args={['#9fc8ff', '#0a1030', 0.3]} />
        <directionalLight position={[-9, 2, 3]} intensity={3.0} color="#fff4e2" />
        <SpaceBackdrop />
        <Stars />
        <Earth radius={2.3} real detail={110} spin={2.2 + f * 0.006} tilt={0.35} cloudOpacity={0.4} position={[0, 1.9, 0]} cityLights={[-9, 2, 3]} />
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- 7・8. 夕焼け：空を見上げる → 撮ろうとして撮れない ----------
const LOOK_UP: Pose = pose({head: -0.55, spine: -0.05});
const SNAP: Pose = pose({head: -0.35, rSh: [2.25, 0.15], rEl: 0.45, lSh: [2.15, -0.1], lEl: 0.5});
const DROP: Pose = pose({head: 0.35, spine: 0.15, lSh: [0.05, 0.1], rSh: [0.05, 0.1]});
const CROWD = (() => {
  const r = mulberry32(17);
  return Array.from({length: 14}).map((_, i) => ({p: [(r() - 0.5) * 7, 0, -1 - r() * 9] as V3, ry: Math.PI + (r() - 0.5) * 0.4, o: i, d: r() * 10}));
})();
const SunsetStreet: React.FC<{f: number; cam: CamKey[]; poseOf: (i: number, d: number) => Pose; ghost?: number}> = ({f, cam, poseOf, ghost = 0}) => (
  <Stage bg="#f0a070" shadows={false}>
    <CameraRig keys={cam} />
    <SkyDome top="#3d4a8a" horizon="#ff9a5a" sunDir={[0, 0.06, -1]} sunColor="#ffd08a" sunPower={10} />
    <hemisphereLight args={['#ffc8a0', '#4a3a40', 0.9]} />
    <ambientLight intensity={0.25} />
    <directionalLight position={[0, 4, -30]} intensity={1.6} color="#ffb070" />
    <directionalLight position={[2, 4, 10]} intensity={0.6} color="#a0a8d0" />
    <Box p={[0, -0.06, -20]} s={[40, 0.1, 80]} c="#6a6460" />
    <Road length={80} width={4} position={[0, 0, -20]} rotationY={Math.PI / 2} />
    {Array.from({length: 8}).map((_, i) => (
      <React.Fragment key={i}>
        <Tower position={[-7, 0, -4 - i * 7]} w={5} d={6} h={8 + (i % 3) * 5} color="#7a6e78" seed={i + 1} />
        <Tower position={[7, 0, -6 - i * 7]} w={5} d={6} h={10 + ((i + 1) % 3) * 5} color="#6e6878" seed={i + 4} />
      </React.Fragment>
    ))}
    {CROWD.map((c, i) => (
      <Human key={i} outfit={outfit(c.o)} position={c.p} rotation={[0, c.ry + 0.03 * Math.sin(f * 0.05 + i), 0]} p={poseOf(i, c.d)} />
    ))}
    {ghost > 0 &&
      CROWD.map((c, i) => {
        // スマホがあったはずの場所に、点線の枠だけ（両手の先・顔の前上）
        const fwd = new THREE.Vector3(Math.sin(c.ry), 0, Math.cos(c.ry));
        const at = new THREE.Vector3(...c.p).add(fwd.multiplyScalar(0.42)).add(new THREE.Vector3(0, 2.05, 0));
        return (
          <lineSegments key={i} position={at.toArray() as V3} rotation={[0.35, c.ry, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(0.075, 0.15, 0.005)]} />
            <lineBasicMaterial color="#ffffff" transparent opacity={ghost * (0.5 + 0.5 * Math.sin(f * 0.3))} />
          </lineSegments>
        );
      })}
  </Stage>
);
const CAM_P7: CamKey[] = [
  {f: 0, pos: [0.5, 1.4, 6.5], look: [0, 4.5, -30], fov: 56},
  {f: 180, pos: [-0.5, 1.5, 4.6], look: [0, 5.0, -30], fov: 56, ease: LIN},
];
export const P7: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <SunsetStreet f={f} cam={CAM_P7} poseOf={(i, d) => lerpPose(IDLE, LOOK_UP, sm((f - 10 - d * 4) / 20))} />
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};
const CAM_P8: CamKey[] = [
  {f: 0, pos: [-0.5, 1.5, 4.6], look: [0, 5.0, -30], fov: 56},
  {f: 180, pos: [0.4, 1.9, 2.4], look: [0, 4.4, -30], fov: 56, ease: LIN},
];
export const P8: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <SunsetStreet
        f={f}
        cam={CAM_P8}
        ghost={interpolate(f, [26, 34, 90, 100], [0, 1, 1, 0], clamp)}
        poseOf={(i, d) => {
          const up = sm((f - 6 - d * 1.5) / 14);
          const down = sm((f - 92 - d) / 16);
          return lerpPose(lerpPose(LOOK_UP, SNAP, up), DROP, down);
        }}
      />
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};
