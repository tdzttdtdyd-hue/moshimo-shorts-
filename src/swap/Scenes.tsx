import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3} from '../lib/anim';
import {project} from '../lib/project';
import {Human, Outfit, Pose, coldPose, hotPose, pose, shockPose, walkPose} from '../three/Human';
import {Vignette} from './Overlay';
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
const Box: React.FC<{p: V3; s: V3; c: string; r?: number; e?: string; ei?: number; rot?: V3}> = ({p, s, c, r = 0.8, e, ei = 0, rot = [0, 0, 0]}) => (
  <mesh position={p} rotation={rot}>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} roughness={r} emissive={e ?? '#000'} emissiveIntensity={ei} />
  </mesh>
);

// 夫の体（中身は妻）と、妻の体（中身は夫）
const M: Outfit = {shirt: '#5a7ab0', pants: '#3b3b44', skin: '#e3b08e', hair: '#1c1714'};
const W: Outfit = {shirt: '#e8a0a8', pants: '#5a6a8a', skin: '#f0c9ae', hair: '#3a2a20'};
const W_SCALE = 158 / 171;
const Husband: React.FC<{position: V3; rotation?: V3; p?: Pose; rHand?: React.ReactNode; lHand?: React.ReactNode}> = (props) => <Human outfit={M} {...props} />;
const Wife: React.FC<{position: V3; rotation?: V3; p?: Pose; rHand?: React.ReactNode; lHand?: React.ReactNode}> = (props) => <Human outfit={W} longHair scale={W_SCALE} {...props} />;

// 頭の上の「中身」タグ
const Tag: React.FC<{x: number; y: number; who: '妻' | '夫' | '元に戻った'; k?: number}> = ({x, y, who, k = 1}) => {
  if (k <= 0 || !Number.isFinite(x)) return null;
  const w = who === '元に戻った' ? 230 : 170;
  return (
    <div data-telop="callout" style={{position: 'absolute', left: Math.min(860 - w, Math.max(60, x - w / 2)), top: Math.max(560, y - 80), width: w, height: 56, opacity: k, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(18,18,24,0.86)', border: '2px solid rgba(255,255,255,0.55)', borderRadius: 14, fontFamily: SANS, fontWeight: 900, color: '#fff', whiteSpace: 'pre'}}>
      {who === '元に戻った' ? (
        <span style={{fontSize: 30}}>元に戻った</span>
      ) : (
        <>
          <span style={{fontSize: 24, background: who === '妻' ? '#e0607a' : '#4f7fc9', borderRadius: 8, padding: '2px 8px 4px'}}>中身</span>
          <span style={{fontSize: 32}}>{who}</span>
        </>
      )}
    </div>
  );
};
const Tags: React.FC<{cam: CamKey[]; f: number; m?: V3; w?: V3; from?: number; to?: number; back?: boolean}> = ({cam, f, m, w, from = 0, to = 9999, back}) => {
  const k = interpolate(f, [from, from + 8, to - 8, to], [0, 1, 1, 0], clamp);
  const pm = m ? project(cam, f, [m[0], m[1] + 2.05, m[2]]) : null;
  const pw = w ? project(cam, f, [w[0], w[1] + 1.9, w[2]]) : null;
  return (
    <>
      {pm && <Tag x={pm.x} y={pm.y} who={back ? '元に戻った' : '妻'} k={k} />}
      {pw && <Tag x={pw.x} y={pw.y} who={back ? '元に戻った' : '夫'} k={back ? 0 : k} />}
    </>
  );
};

const Room: React.FC<{night?: boolean; wall?: string}> = ({night, wall = '#efe8dc'}) => (
  <>
    <hemisphereLight args={[night ? '#ffe2b8' : '#fff6e8', '#8a7a68', night ? 0.8 : 1.15]} />
    <ambientLight intensity={0.3} />
    <directionalLight position={[3, 4, 4]} intensity={night ? 0.5 : 1.3} color="#fff0d8" />
    <directionalLight position={[-3, 3, 6]} intensity={0.7} />
    {night && <pointLight position={[0, 2.6, 1]} intensity={6} distance={8} color="#ffd9a8" />}
    <Box p={[0, -0.05, 0]} s={[12, 0.1, 12]} c="#b48a62" r={0.7} />
    <Box p={[0, 1.6, -2.4]} s={[12, 3.4, 0.1]} c={wall} />
    <Box p={[-3.2, 1.6, 0]} s={[0.1, 3.4, 12]} c="#e6ddcf" />
  </>
);
const Scene: React.FC<{cam: CamKey[]; children: React.ReactNode; overlay?: React.ReactNode; night?: boolean; wall?: string; shakes?: {from: number; dur: number; amp: number}[]}> = ({cam, children, overlay, night, wall, shakes}) => (
  <AbsoluteFill>
    <Stage bg="#efe8dc" shadows={false}>
      <CameraRig keys={cam} shakes={shakes} />
      <Room night={night} wall={wall} />
      {children}
    </Stage>
    <Vignette strength={night ? 0.4 : 0.25} />
    {overlay}
  </AbsoluteFill>
);

// ---------- 1. 7:00 起きたら入れ替わっていた ----------
const CAM_1: CamKey[] = [
  {f: 0, pos: [0.2, 2.4, 3.2], look: [0, 0.8, -0.6], fov: 50},
  {f: 150, pos: [0.0, 1.9, 2.6], look: [0, 1.0, -0.6], fov: 50, ease: LIN},
];
const SIT_UP: Pose = pose({lHip: [1.5, 0.05], rHip: [1.5, 0.05], lKn: 0.1, rKn: 0.1, lSh: [0.3, 0.2], rSh: [0.3, 0.2], lEl: 0.3, rEl: 0.3});
export const W1: React.FC = () => {
  const f = useCurrentFrame();
  const up = sm((f - 64) / 10);
  const shock = sm((f - 80) / 8);
  // 自分の手を見て → お互いを見て固まる
  const look = (t: number, side: number): Pose => lerpPose(lerpPose(pose({}), SIT_UP, up), {...shockPose(t), lHip: [1.5, 0.05], rHip: [1.5, 0.05], lKn: 0.1, rKn: 0.1, twist: side * 0.5}, shock);
  const mPos: V3 = [-0.38, 0.0, -0.4];
  const wPos: V3 = [0.38, 0.0, -0.4];
  const lying = (pp: V3): V3 => [pp[0], lerp(0.62, 0.0, up), lerp(pp[2] + 0.85, pp[2], up)];
  return (
    <Scene cam={CAM_1} shakes={[{from: 78, dur: 10, amp: 0.04}]} overlay={<Tags cam={CAM_1} f={f} m={[mPos[0], 0, mPos[2] + 0.0]} w={[wPos[0], 0, wPos[2]]} from={92} />}>
      {/* ダブルベッド（上半身を起こしたとき腰がのる高さ） */}
      <group position={[0, 0, -0.5]}>
        <Box p={[0, 0.17, 0.4]} s={[1.8, 0.34, 2.2]} c="#8a6a4e" />
        <Box p={[0, 0.44, 0.4]} s={[1.7, 0.2, 2.1]} c="#f2f0ea" r={0.9} />
        <Box p={[0, 0.7, -0.68]} s={[1.8, 0.8, 0.08]} c="#7a5c42" />
        <Box p={[0, 0.58, 1.0]} s={[1.74, 0.08, 1.0]} c="#9fb4d8" r={0.95} />
      </group>
      <group position={[0, 0.0, 0]}>
        <group position={lying(mPos)} rotation={[lerp(-Math.PI / 2, 0, up), 0, 0]}>
          <Husband position={[0, lerp(0, -0.38, up), 0]} p={look(f, 1)} />
        </group>
        <group position={lying(wPos)} rotation={[lerp(-Math.PI / 2, 0, up), 0, 0]}>
          <Wife position={[0, lerp(0, -0.35, up), 0]} p={look(f + 5, -1)} />
        </group>
      </group>
    </Scene>
  );
};

// ---------- 2. 棚に手が届かない ----------
const Kitchen: React.FC = () => (
  <>
    <Box p={[0, 0.45, -2.0]} s={[3.6, 0.9, 0.7]} c="#e8e4dc" />
    <Box p={[0, 0.92, -2.0]} s={[3.65, 0.05, 0.75]} c="#8a8f99" />
    {/* 吊り戸棚（上の段は高い） */}
    <Box p={[0, 2.15, -2.15]} s={[3.6, 0.7, 0.45]} c="#d8cfc2" />
    <Box p={[0, 1.78, -2.15]} s={[3.6, 0.04, 0.45]} c="#c8bfb2" />
    {[-1.2, -0.6, 0.0, 0.6, 1.2].map((x, i) => (
      <Box key={i} p={[x, 1.88, -2.05]} s={[0.18, 0.16, 0.18]} c={['#e2574c', '#f2c14e', '#4f7fc9', '#5aa36e', '#f0f0f0'][i]} />
    ))}
  </>
);
const CAM_2: CamKey[] = [
  {f: 0, pos: [1.8, 1.6, 2.4], look: [-0.1, 1.3, -1.6], fov: 50},
  {f: 180, pos: [1.0, 1.5, 1.8], look: [-0.2, 1.4, -1.6], fov: 50, ease: LIN},
];
export const W2: React.FC = () => {
  const f = useCurrentFrame();
  // 妻の体（中身は夫）：背伸びしても届かない → 夫の体（中身は妻）がひょいと取る
  const tip = 0.06 * (0.5 + 0.5 * Math.sin(f * 0.25)) * (f < 100 ? 1 : 0);
  const reach = pose({rSh: [2.9, 0.1], rEl: 0.15, lSh: [2.6, 0.2], lEl: 0.3, head: -0.4});
  const help = sm((f - 96) / 16);
  const mPos: V3 = [lerp(1.6, 0.55, sm((f - 70) / 26)), 0, -1.35];
  const wPos: V3 = [-0.1, tip, -1.4];
  return (
    <Scene cam={CAM_2} overlay={<Tags cam={CAM_2} f={f} m={mPos} w={wPos} from={4} to={60} />}>
      <Kitchen />
      <Wife position={wPos} rotation={[0, Math.PI, 0]} p={f < 100 ? reach : lerpPose(reach, pose({head: 0.2, lSh: [0.1, 0.2], rSh: [0.1, 0.2]}), sm((f - 100) / 10))} />
      <Husband position={mPos} rotation={[0, Math.PI + 0.3, 0]} p={f < 96 ? walkPose(f * 0.3, f > 70 ? 1 : 0) : lerpPose(pose({}), pose({rSh: [2.7, 0.1], rEl: 0.2}), help * (1 - sm((f - 140) / 12)))} />
    </Scene>
  );
};

// ---------- 3. ペットボトルのふたが開かない ----------
const Bottle: React.FC<{open?: boolean}> = ({open}) => (
  <group position={[0, -0.06, 0.05]}>
    <mesh position={[0, 0, 0]}>
      <cylinderGeometry args={[0.035, 0.035, 0.2, 14]} />
      <meshStandardMaterial color="#cfeaff" transparent opacity={0.8} roughness={0.1} />
    </mesh>
    <mesh position={[0, 0.12 + (open ? 0.06 : 0), 0]}>
      <cylinderGeometry args={[0.018, 0.018, 0.03, 12]} />
      <meshStandardMaterial color="#4f7fc9" />
    </mesh>
  </group>
);
const CAM_3: CamKey[] = [
  {f: 0, pos: [0.3, 1.5, 2.2], look: [0, 1.0, -0.4], fov: 48},
  {f: 180, pos: [-0.3, 1.45, 1.8], look: [0, 1.05, -0.4], fov: 48, ease: LIN},
];
export const W3: React.FC = () => {
  const f = useCurrentFrame();
  const strain = f < 100 ? Math.sin(f * 0.8) * 0.12 : 0;
  const give = sm((f - 100) / 12);
  const easy = sm((f - 120) / 10);
  const twist = pose({spine: 0.15, head: 0.35, lSh: [1.2, -0.3], lEl: 1.1 + strain, rSh: [1.2, -0.35], rEl: 1.2 - strain});
  const mPos: V3 = [0.5, 0, -0.5];
  const wPos: V3 = [-0.45, 0, -0.4];
  return (
    <Scene cam={CAM_3} overlay={<Tags cam={CAM_3} f={f} m={mPos} w={wPos} from={4} to={60} />}>
      <Box p={[0, 0.7, -1.3]} s={[2.4, 0.05, 0.9]} c="#c9a882" />
      <Wife position={wPos} rotation={[0, 0.35, 0]} p={lerpPose(twist, shockPose(f), sm((f - 140) / 8))} rHand={f < 104 ? <Bottle /> : undefined} />
      <Husband position={mPos} rotation={[0, -0.4, 0]} p={lerpPose(pose({}), pose({lSh: [1.3, -0.2], lEl: 1.1, rSh: [1.3, -0.3], rEl: 1.2 + 0.4 * easy, head: 0.3}), give)} rHand={f >= 104 ? <Bottle open={f > 128} /> : undefined} />
    </Scene>
  );
};

// ---------- 4. エアコン：寒い！ ----------
const CAM_4: CamKey[] = [
  {f: 0, pos: [0.8, 1.6, 2.8], look: [0, 1.1, -0.8], fov: 50},
  {f: 180, pos: [-0.4, 1.5, 2.3], look: [0, 1.1, -0.8], fov: 50, ease: LIN},
];
export const W4: React.FC = () => {
  const f = useCurrentFrame();
  const mPos: V3 = [0.55, 0, -0.9];
  const wPos: V3 = [-0.5, 0, -0.8];
  const shiver = 0.02 * Math.sin(f * 1.8);
  return (
    <Scene cam={CAM_4} overlay={<Tags cam={CAM_4} f={f} m={mPos} w={wPos} from={4} to={60} />}>
      {/* エアコンと冷風 */}
      <Box p={[0, 2.4, -2.28]} s={[1.0, 0.3, 0.2]} c="#f4f4f2" />
      {Array.from({length: 8}).map((_, i) => {
        const t = ((f * 0.03 + i / 8) % 1);
        return (
          <mesh key={i} position={[-0.3 + (i % 4) * 0.2, 2.2 - t * 1.2, -2.1 + t * 1.4]} rotation={[0.8, 0, 0]}>
            <planeGeometry args={[0.03, 0.25]} />
            <meshBasicMaterial color="#bfe4ff" transparent opacity={0.6 * (1 - t)} />
          </mesh>
        );
      })}
      <Wife position={[wPos[0] + shiver, 0, wPos[2]]} rotation={[0, 0.4, 0]} p={coldPose(f)} />
      <Husband position={mPos} rotation={[0, -0.5, 0]} p={hotPose(f)} />
    </Scene>
  );
};

// ---------- 5. 電話：「どちら様ですか？」 ----------
const PhoneProp: React.FC = () => (
  <group position={[0, -0.09, 0.03]}>
    <Box p={[0, 0, 0]} s={[0.075, 0.155, 0.01]} c="#16171b" r={0.3} />
  </group>
);
const CAM_5: CamKey[] = [
  {f: 0, pos: [0.9, 1.5, 1.6], look: [0, 1.35, -0.6], fov: 48},
  {f: 180, pos: [0.3, 1.45, 1.2], look: [0, 1.4, -0.6], fov: 48, ease: LIN},
];
export const W5: React.FC = () => {
  const f = useCurrentFrame();
  const confused = sm((f - 60) / 10);
  const p = lerpPose(pose({rSh: [1.6, 0.6], rEl: 2.4, head: 0.05}), {...pose({rSh: [1.6, 0.6], rEl: 2.4}), head: 0.15, twist: 0.2 * Math.sin(f * 0.2), lSh: [0.6, 0.6], lEl: 1.6}, confused);
  const wPos: V3 = [0, 0, -0.6];
  return (
    <Scene cam={CAM_5} overlay={<Tags cam={CAM_5} f={f} w={wPos} from={4} to={56} />}>
      <Wife position={wPos} rotation={[0, 0.2, 0]} p={p} rHand={<PhoneProp />} />
      {/* 「？」が浮かぶ */}
      {confused > 0 &&
        [0, 1, 2].map((i) => (
          <mesh key={i} position={[0.35 + i * 0.12, 1.85 + 0.05 * Math.sin(f * 0.2 + i), -0.6]} scale={0.04 * confused}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
    </Scene>
  );
};

// ---------- 6. 玄関：靴が合わない ----------
const Shoe: React.FC<{p: V3; s: number; c: string; ry?: number}> = ({p, s, c, ry = 0}) => (
  <mesh position={p} rotation={[0, ry, 0]} scale={[s, s, s]}>
    <boxGeometry args={[0.11, 0.08, 0.28]} />
    <meshStandardMaterial color={c} roughness={0.5} />
  </mesh>
);
const CAM_6: CamKey[] = [
  {f: 0, pos: [1.4, 1.3, 2.4], look: [0, 0.75, -0.6], fov: 50},
  {f: 150, pos: [0.6, 1.2, 2.1], look: [0.2, 0.75, -0.6], fov: 50, ease: LIN},
];
export const W6: React.FC = () => {
  const f = useCurrentFrame();
  const x = interpolate(f, [10, 140], [-0.6, 0.6], clamp);
  // 妻の体（中身は夫）が、夫の大きい革靴をはいて、ぱかぱか歩く
  const ph = f * 0.25;
  const flop = Math.max(0, Math.sin(ph)) * 0.06;
  return (
    <Scene cam={CAM_6} wall="#e9e2d6" overlay={<Tags cam={CAM_6} f={f} w={[x, 0.15, -0.6]} from={4} to={60} />}>
      <Box p={[0, 0.07, -1.6]} s={[3, 0.15, 1.4]} c="#cfc8bc" />
      <Box p={[1.4, 0.5, -2.1]} s={[0.6, 1.0, 0.4]} c="#a88a6a" />
      <Wife position={[x, 0.15, -0.6]} rotation={[0, Math.PI / 2, 0]} p={walkPose(ph, 0.8)} />
      {/* 大きすぎる靴（足からずれる） */}
      <Shoe p={[x + 0.12 + flop, 0.19, -0.66]} s={1.45} c="#3a2a20" ry={Math.PI / 2} />
      <Shoe p={[x + 0.02 - flop, 0.19, -0.54]} s={1.45} c="#3a2a20" ry={Math.PI / 2} />
      {/* 下駄箱の前に置かれた、妻の小さい靴 */}
      <Shoe p={[1.2, 0.19, -1.2]} s={0.9} c="#e8a0a8" ry={0.2} />
      <Shoe p={[1.35, 0.19, -1.2]} s={0.9} c="#e8a0a8" ry={0.2} />
    </Scene>
  );
};

// ---------- 7・8. 夜：ぐったり → 元に戻って、肩をもむ ----------
const SOFA_Z = -1.0;
const Sofa: React.FC = () => (
  <group position={[0, 0, SOFA_Z]}>
    <Box p={[0, 0.25, 0]} s={[2.2, 0.5, 0.9]} c="#6a7fa8" />
    <Box p={[0, 0.7, -0.38]} s={[2.2, 0.6, 0.2]} c="#5f739a" />
    <Box p={[-1.05, 0.45, 0]} s={[0.15, 0.4, 0.9]} c="#5f739a" />
    <Box p={[1.05, 0.45, 0]} s={[0.15, 0.4, 0.9]} c="#5f739a" />
  </group>
);
const SLUMP: Pose = pose({lHip: [1.3, 0.15], rHip: [1.3, 0.15], lKn: 1.2, rKn: 1.2, spine: -0.35, head: -0.3, lSh: [0.2, 0.5], rSh: [0.2, 0.5], lEl: 0.3, rEl: 0.3});
const CAM_7: CamKey[] = [
  {f: 0, pos: [0.4, 1.4, 2.0], look: [0, 0.7, -1.0], fov: 50},
  {f: 150, pos: [-0.4, 1.3, 1.6], look: [0, 0.7, -1.0], fov: 50, ease: LIN},
];
export const W7: React.FC = () => {
  const f = useCurrentFrame();
  const breathe = 0.03 * Math.sin(f * 0.1);
  return (
    <Scene cam={CAM_7} night overlay={<Tags cam={CAM_7} f={f} m={[0.45, -0.35, SOFA_Z]} w={[-0.45, -0.3, SOFA_Z]} from={4} to={60} />}>
      <Sofa />
      <Husband position={[0.45, -0.36, SOFA_Z + 0.05]} p={{...SLUMP, spine: SLUMP.spine + breathe}} />
      <Wife position={[-0.45, -0.31, SOFA_Z + 0.05]} p={{...SLUMP, spine: SLUMP.spine - breathe, head: -0.1}} />
    </Scene>
  );
};
const CAM_8: CamKey[] = [
  {f: 0, pos: [-0.4, 1.3, 1.6], look: [0, 0.9, -1.0], fov: 50},
  {f: 180, pos: [0.5, 1.35, 1.3], look: [0, 1.0, -1.1], fov: 50, ease: LIN},
];
export const W8: React.FC = () => {
  const f = useCurrentFrame();
  const swap = interpolate(f, [26, 30, 40], [0, 1, 0], clamp);
  const standUp = sm((f - 40) / 18);
  const rub = Math.sin(f * 0.35);
  // 妻（元の体）がソファの後ろに回って、夫の肩をもむ
  const wPos: V3 = [lerp(-0.45, 0.45, standUp), lerp(-0.31, 0, standUp), lerp(SOFA_Z + 0.05, SOFA_Z - 0.75, standUp)];
  const massage = pose({lSh: [1.7 + 0.1 * rub, 0.25], rSh: [1.7 - 0.1 * rub, 0.25], lEl: 1.0, rEl: 1.0, head: 0.35, spine: 0.1});
  return (
    <Scene cam={CAM_8} night overlay={<Tags cam={CAM_8} f={f} m={[0.45, -0.35, SOFA_Z]} from={30} to={70} back />}>
      <Sofa />
      <Husband position={[0.45, -0.36, SOFA_Z + 0.05]} p={{...SLUMP, spine: -0.2, head: 0.1 + 0.05 * rub * standUp}} />
      <Wife position={wPos} rotation={[0, standUp > 0.5 ? 0 : 0, 0]} p={standUp < 1 ? lerpPose({...SLUMP, head: -0.1}, pose({}), standUp) : massage} />
      {swap > 0 && (
        <mesh position={[0, 1.2, SOFA_Z]} scale={0.5 + swap * 1.5}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial color="#fff2c8" transparent opacity={swap * 0.5} />
        </mesh>
      )}
    </Scene>
  );
};
