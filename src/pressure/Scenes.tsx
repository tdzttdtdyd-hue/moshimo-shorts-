import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {Human, OUTFITS, Pose, pose, walkPose} from '../three/Human';
import {Road, SkyDome, Tower} from '../three/Landscape';
import {Lane, walkAlong} from '../three/Walk';
import {ChipBag, chipAt, chipGeo, makeShots} from '../three/ChipBag';
import {CalloutView, Vignette} from './Overlay';
import {project} from '../lib/project';

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
type Crowd = 'walk' | 'tipsy' | 'none';
// 歩道（道路の両わき）を歩く人たち。千鳥足のときは車道にもはみ出す
const lanesFor = (mode: Crowd, n: number): Lane[] => {
  const r = mulberry32(mode === 'tipsy' ? 19 : 9);
  return Array.from({length: n}).map((_, i) => {
    const side = i % 2 ? 1 : -1;
    const tipsy = mode === 'tipsy';
    return {
      x: tipsy ? (r() - 0.5) * 6 : side * (2.5 + (i % 4 < 2 ? 0 : 0.6)),
      z0: -40 + r() * 50,
      dir: (r() < 0.5 ? 1 : -1) as 1 | -1,
      speed: tipsy ? 0.7 + r() * 0.3 : 1.2 + r() * 0.3,
      wobble: tipsy ? 0.35 + r() * 0.2 : 0,
    };
  });
};
const tipsyPose = (ph: number, f: number, i: number): Pose => {
  const w = walkPose(ph, 0.8);
  return {
    ...w,
    spine: 0.12 * Math.sin(f * 0.07 + i),
    twist: 0.25 * Math.sin(f * 0.05 + i * 2),
    head: -0.25 + 0.3 * Math.sin(f * 0.09 + i),
    lSh: [w.lSh[0] * 0.5 + 0.4 + 0.4 * Math.sin(f * 0.11 + i), 0.6],
    rSh: [w.rSh[0] * 0.5 + 0.3 + 0.4 * Math.cos(f * 0.1 + i), 0.7],
    lEl: 0.8,
    rEl: 0.9,
  };
};
const Street: React.FC<{f: number; haze?: number; crowd?: Crowd; people?: number}> = ({f, haze = 0, crowd = 'walk', people = 12}) => {
  const towers = useMemo(() => {
    const r = mulberry32(4);
    return Array.from({length: 14}).map((_, i) => ({p: [(i % 2 ? 1 : -1) * (6 + r() * 2), 0, -4 - Math.floor(i / 2) * 6] as V3, h: 6 + r() * 14, c: ['#c9ccd2', '#d8cfc2', '#bfc8cf'][i % 3], seed: i + 1}));
  }, []);
  const lanes = useMemo(() => (crowd === 'none' ? [] : lanesFor(crowd, people)), [crowd, people]);
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
      {lanes.map((ln, i) => {
        const w = walkAlong(ln, f);
        return <Human key={i} outfit={OUTFITS[i % OUTFITS.length]} position={w.pos} rotation={[0, w.ry, 0]} p={crowd === 'tipsy' ? tipsyPose(w.phase, f, i) : walkPose(w.phase, 1)} />;
      })}
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
        <Street f={f} crowd="walk" people={16} />
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
  {f: 0, pos: [0.7, 1.15, 1.2], look: [0, 0.93, 0], fov: 46},
  {f: 150, pos: [-0.55, 1.08, 0.95], look: [0, 0.93, 0], fov: 46, ease: LIN},
];
export const P2: React.FC = () => {
  const f = useCurrentFrame();
  const puff = interpolate(f, [20, 110], [1, 0.3], {...clamp, easing: (x) => x * x * (3 - 2 * x)});
  return (
    <AbsoluteFill>
      <Stage bg="#efe8dc" shadows={false}>
        <CameraRig keys={CAM_2} />
        <Table />
        <ChipBag position={[0, 0.745 + 0.17, 0]} rotation={[-0.08, 0.25 + f * 0.003, 0]} air={puff} seed={3} />
      </Stage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 3. 2気圧：耳がキーン・お湯が沸かない ----------
const CAM_3: CamKey[] = [
  {f: 0, pos: [1.4, 2.0, 3.8], look: [-0.75, 0.95, 0], fov: 50},
  {f: 180, pos: [-0.6, 1.9, 3.7], look: [-0.7, 0.85, 0], fov: 50, ease: LIN},
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
        <Box p={[-0.3, 0.78, -0.1]} s={[0.5, 0.06, 0.4]} c="#3d4250" />
        <mesh position={[-0.3, 0.92, -0.1]}>
          <cylinderGeometry args={[0.16, 0.14, 0.2, 20]} />
          <meshStandardMaterial color="#b8bcc4" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[-0.3, 1.0, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.15, 20]} />
          <meshStandardMaterial color="#8fd0f0" />
        </mesh>
        {/* 炎 */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[-0.3 + Math.cos(i) * 0.1, 0.83, -0.1 + Math.sin(i) * 0.1]} scale={[1, 1 + 0.3 * Math.sin(f * 0.8 + i), 1]}>
            <coneGeometry args={[0.02, 0.06, 6]} />
            <meshBasicMaterial color="#4f8fff" />
          </mesh>
        ))}
        {/* 鍋からの湯気（ゆらゆら上る） */}
        {Array.from({length: 8}).map((_, i) => {
          const t = ((f * 0.012 + i / 8) % 1);
          return (
            <mesh key={'st' + i} position={[-0.3 + 0.06 * Math.sin(i * 2 + f * 0.05), 1.05 + t * 0.7, -0.1 + 0.04 * Math.cos(i)]} scale={0.04 + t * 0.1}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.35 * Math.sin(t * Math.PI)} depthWrite={false} />
            </mesh>
          );
        })}
        {/* 小さな泡 → ずっと沸かない（最後だけ沸く） */}
        {Array.from({length: boil ? 14 : 3}).map((_, i) => {
          const t = ((f * 0.05 + i * 0.17) % 1);
          return (
            <mesh key={'b' + i} position={[-0.3 + Math.cos(i * 2.1) * 0.08, 1.0 + t * 0.03, -0.1 + Math.sin(i * 1.7) * 0.08]} scale={0.012 + boil * 0.01}>
              <sphereGeometry args={[1, 6, 4]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          );
        })}
        <Human outfit={OUTFITS[0]} position={[-1.2, 0, 0.25]} rotation={[0, Math.PI / 2 - 0.5, 0]} p={{...EARS, twist: 0.35 * Math.sin(f * 0.12), head: 0.2 + 0.12 * Math.sin(f * 0.21), spine: 0.15 + 0.08 * Math.sin(f * 0.09)}} />
      </Stage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 4. 3気圧：ピッチャーが投げ → バッターが打つ → 打球がすぐ失速 ----------
// 寸法は実際の球場（ホームからピッチャー板まで 18.44m、フェンスまで 約120m）
const MOUND_Z = -18.44;
const RELEASE = 40; // 球が手を離れるフレーム
const CONTACT = RELEASE + 14; // 時速 約140km で 約0.45秒
const HIT_V: V3 = [5, 24, -41]; // 打った直後の速さ（約170km/h）：1気圧なら約120m飛んでフェンス越え
const DRAG = 0.006 * 3; // 空気の抵抗の係数（1気圧で約0.006/m、3気圧で3倍）→ 約68mで落ちる
const ballAfterHit = (t: number): V3 => {
  // 速さの2乗に比例する抵抗＋重力を、細かく区切って計算
  const dt = 1 / 240;
  let x = 0.1, y = 0.95, z = 0.2;
  let [vx, vy, vz] = HIT_V;
  const n = Math.floor(t * 240);
  for (let i = 0; i < n; i++) {
    const v = Math.hypot(vx, vy, vz);
    vx -= DRAG * v * vx * dt;
    vy -= (9.8 + DRAG * v * vy) * dt;
    vz -= DRAG * v * vz * dt;
    x += vx * dt;
    y += vy * dt;
    z += vz * dt;
    if (y < 0.04) {
      y = 0.04;
      vy = Math.abs(vy) * 0.3;
      vx *= 0.5;
      vz *= 0.5;
    }
  }
  return [x, y, z];
};
const pitcherPose = (f: number): Pose => {
  // 振りかぶる → 足を上げる → 腕を振り下ろす → フォロースルー
  const k1 = sm((f - 10) / 14), k2 = sm((f - 24) / 10), k3 = sm((f - (RELEASE - 4)) / 6);
  let p = pose({});
  p = lerpPose(p, pose({lSh: [2.6, 0.2], rSh: [2.6, 0.2], lEl: 1.4, rEl: 1.4, lHip: [1.3, 0.1], lKn: 1.4, spine: -0.1}), k1);
  p = lerpPose(p, pose({rSh: [-0.6, 0.8], rEl: 1.6, lSh: [1.4, -0.3], lEl: 0.5, lHip: [0.6, 0.15], lKn: 0.3, rKn: 0.4, spine: 0.1, twist: -0.6}), k2);
  p = lerpPose(p, pose({rSh: [1.4, -0.4], rEl: 0.2, lSh: [0.3, 0.5], lEl: 0.8, lHip: [0.5, 0.15], lKn: 0.5, rHip: [-0.5, 0.05], rKn: 0.9, spine: 0.55, twist: 0.6}), k3);
  return p;
};
const batterPose = (f: number): Pose => {
  // 構え → スイング（腰と肩を回す）→ フォロースルー
  const k = sm((f - (CONTACT - 5)) / 8);
  // 両手をそろえてバットを握る。構えでは手は肩の前、スイングで腕を伸ばし、上半身ごと回す
  const ready = pose({lSh: [1.15, -0.35], rSh: [1.15, 0.05], lEl: 2.0, rEl: 2.1, lKn: 0.35, rKn: 0.35, lHip: [0.3, 0.18], rHip: [0.3, 0.18], spine: 0.25, twist: 0.75, head: -0.05});
  const follow = pose({lSh: [1.45, -0.25], rSh: [1.4, 0.1], lEl: 0.25, rEl: 0.35, lKn: 0.2, rKn: 0.55, lHip: [0.2, 0.15], rHip: [0.45, 0.1], spine: 0.2, twist: -1.1, head: -0.05});
  return lerpPose(ready, follow, k);
};
// バット：構えでは肩の上で立て、スイングで水平に回る（手元を中心に）
const Bat: React.FC<{f: number}> = ({f}) => {
  const k = sm((f - (CONTACT - 5)) / 8);
  const yaw = lerp(1.9, -2.2, k);
  const tilt = lerp(-1.1, -0.15, Math.min(1, k * 1.6));
  return (
    <group position={[-0.05, 1.32 - 0.25 * Math.min(1, k * 1.6), 0.15]} rotation={[0, yaw, 0]}>
      <group rotation={[0, 0, tilt]}>
        <mesh position={[0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.033, 0.016, 0.84, 10]} />
          <meshStandardMaterial color="#c8a070" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
};
// カメラ：ホームの後ろ・高い位置から（ピッチャーが上、バッターが下に並ぶ）。打ったあとは打球を目で追う
const LAND = ballAfterHit(4.0);
const cam4 = (f: number): CamKey[] => {
  const pre = {pos: [1.4 + Math.min(f, CONTACT) * 0.012, 3.4 - Math.min(f, CONTACT) * 0.008, 6.8 - Math.min(f, CONTACT) * 0.02] as V3, look: [-0.3, 0.9, -8] as V3};
  if (f < CONTACT) return [{f: 0, ...pre, fov: 48}];
  const t = (f - CONTACT) / 30;
  const b = ballAfterHit(t);
  const k = sm((f - CONTACT) / 12);
  const look: V3 = [lerp(pre.look[0], b[0], k), lerp(pre.look[1], Math.max(1, b[1] * 0.85), k), lerp(pre.look[2], b[2], k)];
  const pos: V3 = [lerp(pre.pos[0], 4, sm(t / 2)), lerp(pre.pos[1], 9, sm(t / 2)), lerp(pre.pos[2], 10, sm(t / 2))];
  return [{f: 0, pos, look, fov: 48}];
};
export const P4: React.FC = () => {
  const f = useCurrentFrame();
  // 投球：ピッチャーの手 → ホームまで、少し落ちながら一直線
  const handRelease: V3 = [-0.35, 1.95, MOUND_Z + 1.2];
  const plate: V3 = [0.1, 0.95, 0.2];
  let ball: V3 | null = null;
  if (f >= RELEASE && f < CONTACT) {
    const u = (f - RELEASE) / (CONTACT - RELEASE);
    ball = [lerp(handRelease[0], plate[0], u), lerp(handRelease[1], plate[1], u) - 0.25 * u * (1 - u), lerp(handRelease[2], plate[2], u)];
  } else if (f >= CONTACT) {
    ball = ballAfterHit((f - CONTACT) / 30);
  }
  const CAM = cam4(f);
  // 打球の通り道（直近の位置を線でつなぐ）
  const trail: V3[] = f >= CONTACT ? Array.from({length: 10}).map((_, i) => ballAfterHit(Math.max(0, (f - CONTACT - i * 1.5) / 30))) : [];
  const pLand = project(CAM, f, LAND);
  const pFence = project(CAM, f, [6, 4, -121]);
  return (
    <AbsoluteFill>
      <Stage bg="#9fc8f0" shadows={false}>
        <CameraRig keys={CAM} shakes={[{from: CONTACT, dur: 6, amp: 0.03}]} />
        <SkyDome top="#4f9be0" horizon="#d8eefa" sunDir={[0.3, 0.7, -0.6]} />
        <hemisphereLight args={['#dff0ff', '#6a8a50', 1.1]} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[6, 12, 8]} intensity={1.8} />
        {/* 外野の芝・内野の土・マウンド・ベース・フェンス */}
        <mesh position={[0, -0.02, -60]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[260, 200]} />
          <meshStandardMaterial color="#5f9a48" />
        </mesh>
        <mesh position={[0, -0.01, -13]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <planeGeometry args={[27, 27]} />
          <meshStandardMaterial color="#b8905e" />
        </mesh>
        <mesh position={[0, 0.0, -13]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <planeGeometry args={[19, 19]} />
          <meshStandardMaterial color="#5f9a48" />
        </mesh>
        <mesh position={[0, 0.12, MOUND_Z]}>
          <cylinderGeometry args={[2.0, 2.7, 0.25, 32]} />
          <meshStandardMaterial color="#b8905e" />
        </mesh>
        <Box p={[0, 0.01, 0.0]} s={[0.43, 0.02, 0.43]} c="#f4f4f0" />
        {[
          [19.4, -19.4],
          [0, -38.8],
          [-19.4, -19.4],
        ].map(([x, z], i) => (
          <Box key={i} p={[x * 0.7071 * 1.0, 0.04, z * 1.0]} s={[0.38, 0.08, 0.38]} c="#f4f4f0" />
        ))}
        <Box p={[0, 2, -122]} s={[240, 4, 1]} c="#2f5a3a" />
        <Box p={[0, 1.1, 6.8]} s={[8, 2.2, 0.2]} c="#2f5a3a" />
        {/* ピッチャー（マウンドの上、ホーム向き） */}
        <Human outfit={{shirt: '#f0f0f0', pants: '#f0f0f0', skin: '#d6a27f', hair: '#1c1714'}} position={[0, 0.25, MOUND_Z]} rotation={[0, 0, 0]} p={pitcherPose(f)} rHand={f < RELEASE ? <mesh position={[0, -0.05, 0.03]}><sphereGeometry args={[0.037, 10, 8]} /><meshStandardMaterial color="#ffffff" /></mesh> : undefined} />
        {/* バッター（右打ち：ホームの左側に立ち、ピッチャーに体の横を向ける） */}
        <group position={[-0.75, 0, 0.15]} rotation={[0, Math.PI / 2, 0]}>
          <Human
            outfit={{shirt: '#3f5f9f', pants: '#e8e8e8', skin: '#e3b08e', hair: '#1c1714'}}
            p={batterPose(f)}
            rHand={
              // バットは前腕の延長（手首から先）に伸ばす
              <mesh position={[0, -0.42, 0.02]}>
                <cylinderGeometry args={[0.016, 0.034, 0.84, 10]} />
                <meshStandardMaterial color="#c8a070" roughness={0.6} />
              </mesh>
            }
          />
        </group>
        {/* キャッチャーと審判 */}
        <Human outfit={{shirt: '#3f5f9f', pants: '#e8e8e8', skin: '#e3b08e', hair: '#1c1714'}} position={[0.05, -0.4, 1.1]} rotation={[0, Math.PI, 0]} p={pose({lHip: [1.9, 0.5], rHip: [1.9, 0.5], lKn: 2.2, rKn: 2.2, spine: 0.4, lSh: [1.2, 0.2], lEl: 0.6})} />
        {ball && (
          <mesh position={ball}>
            <sphereGeometry args={[f >= CONTACT ? 0.12 : 0.05, 12, 10]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
          </mesh>
        )}
        {trail.slice(1).map((pt, i) => (
          <mesh key={i} position={pt} scale={0.1 * (1 - i / 10)}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.5 * (1 - i / 10)} />
          </mesh>
        ))}
      </Stage>
      <Vignette strength={0.25} />
      <CalloutView x={pFence.x} y={pFence.y} tag="フェンス" text="1気圧なら ここを越える" from={CONTACT + 66} to={180} dy={-110} dx={120} />
      <CalloutView x={pLand.x} y={pLand.y} tag="打球" text="約70mで落ちる" from={CONTACT + 96} to={180} dy={240} dx={-120} />
    </AbsoluteFill>
  );
};

// ---------- 5. 4気圧：窒素酔い ----------
const CAM_5: CamKey[] = [
  {f: 0, pos: [1.0, 1.8, 4.0], look: [0, 1.3, -6], fov: 54},
  {f: 180, pos: [-0.8, 1.7, 2.0], look: [0, 1.3, -6], fov: 54, ease: LIN},
];
const tipsy = (f: number, i: number): Pose =>
  pose({spine: 0.15 * Math.sin(f * 0.07 + i), twist: 0.3 * Math.sin(f * 0.05 + i * 2), head: -0.2 + 0.25 * Math.sin(f * 0.09 + i), lSh: [0.6 + 0.6 * Math.sin(f * 0.11 + i), 0.6], rSh: [0.5 + 0.6 * Math.cos(f * 0.1 + i), 0.7], lEl: 0.8, rEl: 0.9, lKn: 0.2 + 0.15 * Math.sin(f * 0.13 + i), rKn: 0.2, lHip: [0.2 * Math.sin(f * 0.1 + i), 0.15], rHip: [-0.1, 0.12]});
export const P5: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage bg="#9fc8f0" shadows={false}>
        <CameraRig keys={CAM_5} roll={(fr) => 0.04 * Math.sin(fr * 0.06)} />
        <Street f={f} crowd="tipsy" people={16} />
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
        <Street f={f} crowd="none" haze={0.15} />
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
        <Street f={f} crowd="none" haze={haze} />
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
// 気圧が戻る（30）→ 袋がだんだんふくらむ → 1つずつ限界を超えて破裂（52〜72）
// 破裂した袋は空気が抜けて棚に残り、中のチップスが前に飛び出して床に落ちる
const CAM_8: CamKey[] = [
  {f: 0, pos: [0.3, 1.25, 2.6], look: [0, 1.05, -0.6], fov: 50},
  {f: 60, pos: [0.5, 1.3, 2.9], look: [0, 1.0, -0.6], fov: 50, ease: LIN},
  {f: 180, pos: [1.6, 1.5, 3.6], look: [0, 0.7, -0.3], fov: 52, ease: LIN},
];
const SHELF_Y = [0.25, 0.87, 1.49]; // 棚板の上面
const SHELF_BAGS = (() => {
  const r = mulberry32(44);
  const out: {p: V3; burst: number; ry: number; seed: number}[] = [];
  SHELF_Y.forEach((y, row) =>
    Array.from({length: 6}).forEach((_, i) => out.push({p: [-1.25 + i * 0.5 + (r() - 0.5) * 0.04, y + 0.17, -0.62], burst: 52 + Math.floor(r() * 20), ry: (r() - 0.5) * 0.25, seed: row * 10 + i})),
  );
  return out;
})();
export const P8: React.FC = () => {
  const f = useCurrentFrame();
  const shots = useMemo(() => SHELF_BAGS.map((b, i) => makeShots(b.p, 7, 100 + i, 0.012)), []);
  return (
    <AbsoluteFill>
      <Stage bg="#f2f2ee" shadows={false}>
        <CameraRig keys={CAM_8} shakes={SHELF_BAGS.map((b) => ({from: b.burst, dur: 6, amp: 0.008}))} />
        <hemisphereLight args={['#ffffff', '#bdbdb6', 1.2]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 6, 5]} intensity={1.0} />
        <Box p={[0, -0.05, 0]} s={[10, 0.1, 10]} c="#e8e6e0" r={0.5} />
        <Box p={[0, 1.6, -1.0]} s={[10, 3.4, 0.1]} c="#f4f4f0" />
        {/* 商品棚（背板・棚板・値札レール） */}
        <Box p={[0, 1.0, -0.88]} s={[3.3, 2.0, 0.04]} c="#dfe2e6" />
        {SHELF_Y.map((y, row) => (
          <React.Fragment key={row}>
            <Box p={[0, y - 0.02, -0.62]} s={[3.3, 0.04, 0.52]} c="#c8ccd2" />
            <Box p={[0, y - 0.04, -0.355]} s={[3.3, 0.06, 0.02]} c="#f4f4f0" />
          </React.Fragment>
        ))}
        {SHELF_BAGS.map((b, i) => {
          const burst = f >= b.burst;
          // 戻った直後からふくらみ始め、破裂の直前にいちばん大きい
          const air = f < 30 ? 0.3 : burst ? lerp(1.55, 0.35, sm((f - b.burst) / 6)) : lerp(0.3, 1.55, sm((f - 30) / (b.burst - 30)));
          const jiggle = !burst && f > b.burst - 8 ? 0.02 * Math.sin(f * 2.5 + i) : 0;
          const fall = burst ? sm((f - b.burst) / 8) : 0;
          return (
            <ChipBag
              key={i}
              position={[b.p[0], b.p[1] - fall * 0.1, b.p[2] + fall * 0.05]}
              rotation={[-0.06 - fall * 0.5, b.ry + jiggle, jiggle + fall * 0.15 * (i % 2 ? 1 : -1)]}
              air={air}
              seed={b.seed}
              torn={burst}
            />
          );
        })}
        {/* 破裂した瞬間の空気の勢い（白いもや） */}
        {SHELF_BAGS.map((b, i) => {
          const t = (f - b.burst) / 10;
          if (t < 0 || t > 1) return null;
          return (
            <mesh key={'puff' + i} position={[b.p[0], b.p[1] + 0.18, b.p[2] + 0.05]} scale={0.08 + t * 0.35}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.45 * (1 - t)} depthWrite={false} />
            </mesh>
          );
        })}
        {/* 飛び出すチップス */}
        {SHELF_BAGS.flatMap((b, i) =>
          f < b.burst
            ? []
            : shots[i].map((c, k) => {
                const st = chipAt(c, (f - b.burst) / 30);
                return (
                  <mesh key={i + '-' + k} geometry={chipGeo()} position={st.p} rotation={st.rot}>
                    <meshStandardMaterial color={k % 2 ? '#f0cf6a' : '#e6bf55'} roughness={0.7} side={THREE.DoubleSide} />
                  </mesh>
                );
              }),
        )}
      </Stage>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};
