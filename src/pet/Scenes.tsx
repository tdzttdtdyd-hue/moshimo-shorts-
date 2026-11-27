import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3} from '../lib/anim';
import {project} from '../lib/project';
import {Human, Outfit, Pose, pose} from '../three/Human';
import {Vignette, emWidth} from './Overlay';
import {SCENES, Bubble} from './script';
import {SAFE, SANS} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const LIN = (t: number) => t;
const sm = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const spec = (id: string) => SCENES.find((s) => s.id === id)!;
const Box: React.FC<{p: V3; s: V3; c: string; r?: number; e?: string; ei?: number; rot?: V3}> = ({p, s, c, r = 0.8, e, ei = 0, rot = [0, 0, 0]}) => (
  <mesh position={p} rotation={rot}>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} roughness={r} emissive={e ?? '#000'} emissiveIntensity={ei} />
  </mesh>
);

// ---------- 猫（顔なし・ローポリ） ----------
type CatPose = 'sit' | 'loaf' | 'sleep' | 'walk' | 'lie';
const FUR = '#e0a060';
const FUR2 = '#f4ead8';
const Mat: React.FC<{c: string}> = ({c}) => <meshStandardMaterial color={c} roughness={0.9} flatShading />;
const Tail: React.FC<{curl: number; wag: number; base: V3; up?: number}> = ({curl, wag, base, up = 0.6}) => {
  const n = 9;
  const segs: React.ReactNode[] = [];
  let p = new THREE.Vector3(...base);
  let a = up; // 立ち上がる角度
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const dir = new THREE.Vector3(Math.sin(wag * t * 1.5) * 0.6, Math.sin(a), -Math.cos(a)).normalize();
    const q = p.clone().add(dir.multiplyScalar(0.045));
    segs.push(
      <mesh key={i} position={q.toArray() as V3}>
        <sphereGeometry args={[0.026 - i * 0.0012, 8, 6]} />
        <Mat c={i > n - 3 ? '#b8743a' : FUR} />
      </mesh>,
    );
    p = q;
    a += curl;
  }
  return <>{segs}</>;
};
const Cat: React.FC<{position?: V3; rotation?: V3; pose?: CatPose; f?: number; tail?: number; scale?: number; headTurn?: number}> = ({position = [0, 0, 0], rotation = [0, 0, 0], pose: cp = 'sit', f = 0, tail = 0.4, scale = 1, headTurn = 0}) => {
  const breathe = 1 + 0.03 * Math.sin(f * 0.12);
  const wag = Math.sin(f * 0.08) * tail;
  const ph = f * 0.35;
  const leg = (x: number, z: number, len: number, swing = 0) => (
    <group position={[x, len, z]} rotation={[swing, 0, 0]}>
      <mesh position={[0, -len / 2, 0]}>
        <cylinderGeometry args={[0.028, 0.024, len, 7]} />
        <Mat c={FUR} />
      </mesh>
      <mesh position={[0, -len + 0.01, 0.012]} scale={[1, 0.6, 1.3]}>
        <sphereGeometry args={[0.03, 8, 6]} />
        <Mat c={FUR2} />
      </mesh>
    </group>
  );
  const head = (p: V3, tilt = 0) => (
    <group position={p} rotation={[tilt, headTurn, 0]}>
      <mesh scale={[1.1, 0.95, 1]}>
        <icosahedronGeometry args={[0.095, 1]} />
        <Mat c={FUR} />
      </mesh>
      <mesh position={[0, -0.03, 0.07]} scale={[0.7, 0.5, 0.6]}>
        <icosahedronGeometry args={[0.06, 1]} />
        <Mat c={FUR2} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.055, 0.085, 0]} rotation={[0, 0, -s * 0.25]}>
          <coneGeometry args={[0.035, 0.075, 4]} />
          <Mat c={FUR} />
        </mesh>
      ))}
    </group>
  );
  let body: React.ReactNode;
  if (cp === 'sit') {
    body = (
      <>
        <mesh position={[0, 0.15, -0.02]} rotation={[-0.5, 0, 0]} scale={[1, 1.35 * breathe, 1]}>
          <icosahedronGeometry args={[0.12, 1]} />
          <Mat c={FUR} />
        </mesh>
        <mesh position={[0, 0.17, 0.08]} scale={[0.75, 1.1, 0.5]}>
          <icosahedronGeometry args={[0.09, 1]} />
          <Mat c={FUR2} />
        </mesh>
        {leg(-0.045, 0.08, 0.16)}
        {leg(0.045, 0.08, 0.16)}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.09, 0.06, -0.06]} scale={[0.6, 0.6, 1]}>
            <icosahedronGeometry args={[0.07, 1]} />
            <Mat c={FUR} />
          </mesh>
        ))}
        {head([0, 0.36, 0.04])}
        <Tail curl={0.15} wag={wag} base={[0, 0.03, -0.13]} up={-0.1} />
      </>
    );
  } else if (cp === 'walk' || cp === 'lie') {
    const lying = cp === 'lie';
    body = (
      <>
        <mesh position={[0, lying ? 0.09 : 0.2, 0]} scale={[0.85, 0.75 * breathe, 1.6]}>
          <icosahedronGeometry args={[0.12, 1]} />
          <Mat c={FUR} />
        </mesh>
        {!lying && (
          <>
            {leg(-0.05, 0.12, 0.18, Math.sin(ph) * 0.5)}
            {leg(0.05, 0.12, 0.18, -Math.sin(ph) * 0.5)}
            {leg(-0.05, -0.12, 0.18, -Math.sin(ph) * 0.5)}
            {leg(0.05, -0.12, 0.18, Math.sin(ph) * 0.5)}
          </>
        )}
        {head([0, lying ? 0.14 : 0.3, 0.2], lying ? 0.2 : 0)}
        <Tail curl={lying ? 0.02 : 0.12} wag={wag} base={[0, lying ? 0.08 : 0.22, -0.18]} up={lying ? -0.1 : 0.5} />
      </>
    );
  } else if (cp === 'loaf') {
    body = (
      <>
        <mesh position={[0, 0.1, 0]} scale={[1, 0.8 * breathe, 1.4]}>
          <icosahedronGeometry args={[0.12, 1]} />
          <Mat c={FUR} />
        </mesh>
        {head([0, 0.22, 0.14])}
        <Tail curl={0.35} wag={wag * 0.3} base={[0.05, 0.04, -0.15]} up={-0.4} />
      </>
    );
  } else {
    // 丸くなって眠る
    body = (
      <>
        <mesh position={[0, 0.08, 0]} scale={[1.25, 0.65 * breathe, 1.1]}>
          <icosahedronGeometry args={[0.13, 1]} />
          <Mat c={FUR} />
        </mesh>
        {head([0.09, 0.08, 0.08], 0.6)}
        <Tail curl={0.42} wag={0} base={[-0.1, 0.03, -0.05]} up={-1.4} />
      </>
    );
  }
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {body}
    </group>
  );
};

// ---------- 部屋 ----------
const SKY: Record<string, string> = {morning: '#cfe6ff', noon: '#bfe0ff', evening: '#ffb47a', night: '#16224a'};
const Room: React.FC<{tod: keyof typeof SKY; f: number}> = ({tod, f}) => {
  const night = tod === 'night';
  const evening = tod === 'evening';
  return (
    <>
      <hemisphereLight args={[night ? '#ffe2b8' : '#fff6e8', '#8a7a68', night ? 0.75 : 1.15]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 4, -4]} intensity={night ? 0.2 : evening ? 1.1 : 1.6} color={evening ? '#ffb070' : '#fff0d8'} />
      <directionalLight position={[2, 4, 6]} intensity={0.8} color="#ffffff" />
      {night && <pointLight position={[0.5, 2.6, 0.5]} intensity={7} distance={9} decay={1.4} color="#ffd9a8" />}
      <Box p={[0, -0.05, 0]} s={[12, 0.1, 12]} c="#b48a62" r={0.7} />
      <Box p={[0, 0.006, 0.6]} s={[2.4, 0.01, 1.8]} c="#c9b8a0" r={1} />
      <Box p={[0, 1.6, -2.4]} s={[12, 3.4, 0.1]} c="#efe8dc" />
      <Box p={[-3.2, 1.6, 0]} s={[0.1, 3.4, 12]} c="#e6ddcf" />
      {/* 窓（時間で空の色が変わる） */}
      <group position={[0.6, 1.6, -2.33]}>
        <Box p={[0, 0, -0.02]} s={[1.9, 1.4, 0.05]} c="#ffffff" />
        <Box p={[0, 0, 0.005]} s={[1.76, 1.26, 0.01]} c={SKY[tod]} e={SKY[tod]} ei={night ? 0.5 : 0.9} />
        <Box p={[0, 0, 0.02]} s={[0.03, 1.26, 0.02]} c="#ffffff" />
        <Box p={[0, -0.75, 0.12]} s={[2.0, 0.06, 0.28]} c="#ffffff" />
      </group>
      {/* 窓からの光だまり */}
      {!night && (
        <mesh position={[0.6, 0.012, -0.9]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 1.6]} />
          <meshBasicMaterial color={evening ? '#ffc890' : '#fff4d8'} transparent opacity={0.35 + 0.03 * Math.sin(f * 0.05)} depthWrite={false} />
        </mesh>
      )}
      {/* ベッド */}
      <group position={[-2.2, 0, -1.1]}>
        <Box p={[0, 0.17, 0]} s={[1.3, 0.34, 2.2]} c="#8a6a4e" />
        <Box p={[0, 0.44, 0]} s={[1.2, 0.2, 2.1]} c="#f2f0ea" r={0.9} />
        <Box p={[0, 0.6, -0.8]} s={[0.7, 0.12, 0.36]} c="#ffffff" r={0.95} />
        <Box p={[0, 0.58, 0.45]} s={[1.24, 0.08, 1.1]} c="#9fb4d8" r={0.95} />
      </group>
      {/* 机とノートパソコン */}
      <group position={[2.3, 0, -1.6]}>
        <Box p={[0, 0.72, 0]} s={[1.4, 0.05, 0.7]} c="#c9a882" />
        {[
          [-0.65, -0.3],
          [0.65, -0.3],
          [-0.65, 0.3],
          [0.65, 0.3],
        ].map(([x, z], i) => (
          <Box key={i} p={[x, 0.36, z]} s={[0.05, 0.72, 0.05]} c="#8a6a4e" />
        ))}
        <Box p={[0, 0.755, 0.05]} s={[0.5, 0.02, 0.34]} c="#3d4250" />
        <Box p={[0, 0.92, -0.12]} s={[0.5, 0.32, 0.02]} rot={[-0.25, 0, 0]} c="#3d4250" />
        <Box p={[0, 0.92, -0.105]} s={[0.46, 0.28, 0.005]} rot={[-0.25, 0, 0]} c="#9fd0ff" e="#7fc0ff" ei={0.7} />
      </group>
      {/* ソファ */}
      <group position={[0, 0, 1.9]} rotation={[0, Math.PI, 0]}>
        <Box p={[0, 0.25, 0]} s={[2.2, 0.5, 0.9]} c="#6a7fa8" />
        <Box p={[0, 0.7, -0.38]} s={[2.2, 0.6, 0.2]} c="#5f739a" />
        <Box p={[-1.05, 0.45, 0]} s={[0.15, 0.4, 0.9]} c="#5f739a" />
        <Box p={[1.05, 0.45, 0]} s={[0.15, 0.4, 0.9]} c="#5f739a" />
      </group>
      {/* 観葉植物 */}
      <group position={[-2.6, 0, 1.0]}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.18, 0.14, 0.4, 10]} />
          <meshStandardMaterial color="#c8b8a0" />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[Math.cos(i * 1.3) * 0.15, 0.6 + i * 0.08, Math.sin(i * 1.3) * 0.15]} scale={[0.15, 0.3, 0.15]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#5a9a4a" flatShading />
          </mesh>
        ))}
      </group>
    </>
  );
};
const OWNER: Outfit = {shirt: '#e8eef5', pants: '#4a5468', skin: '#e9b99a', hair: '#2b211c'};
const SEATED: Pose = pose({lHip: [1.5, 0.08], rHip: [1.5, 0.08], lKn: 1.5, rKn: 1.5, lSh: [0.4, 0.1], rSh: [0.4, 0.1], lEl: 0.7, rEl: 0.7});

// ---------- 吹き出し ----------
const SpeechBubble: React.FC<{b: Bubble; x: number; y: number; f: number; minY: number}> = ({b, x, y, f, minY}) => {
  if (f < b.from || f >= b.to) return null;
  const k = interpolate(f, [b.from, b.from + 6, b.to - 6, b.to], [0, 1, 1, 0], clamp);
  const pop = 1 + 0.12 * Math.max(0, 1 - (f - b.from) / 6);
  const lines = b.text.split('\n');
  const size = Math.min(52, Math.floor(640 / Math.max(...lines.map((l) => emWidth(l)))));
  const w = Math.max(...lines.map((l) => emWidth(l))) * size + 64;
  const h = lines.length * size * 1.3 + 36;
  const cat = b.who === 'cat';
  // 指す先の上にのせる（セーフエリア内）
  const bx = Math.min(SAFE.left + (1080 - SAFE.left - SAFE.right) - w, Math.max(SAFE.left, x - w / 2));
  const by = Math.min(1180 - h, Math.max(minY, y - h - 90));
  const tx = Math.min(bx + w - 40, Math.max(bx + 40, x));
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, opacity: k, pointerEvents: 'none'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={`M ${tx - 18} ${by + h - 2} L ${x} ${Math.min(y - 10, by + h + 70)} L ${tx + 18} ${by + h - 2} Z`} fill={cat ? '#ffffff' : '#ffe9b0'} stroke="rgba(0,0,0,0.25)" strokeWidth={2} />
      </svg>
      <div
        data-telop="callout"
        style={{position: 'absolute', left: bx, top: by, width: w, height: h, boxSizing: 'border-box', transform: `scale(${pop})`, transformOrigin: `${tx - bx}px ${h}px`, background: cat ? '#ffffff' : '#ffe9b0', borderRadius: 34, border: '2px solid rgba(0,0,0,0.18)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: SANS, fontWeight: 900, fontSize: size, lineHeight: 1.3, color: '#1d1d22', whiteSpace: 'pre'}}
      >
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
};
const Bubbles: React.FC<{id: string; f: number; cam: CamKey[]; cat: V3; me: V3}> = ({id, f, cam, cat, me}) => {
  const bs = spec(id).bubbles ?? [];
  const minY = id === 'c2_name' ? 540 : (spec(id).cards ?? []).length ? 800 : 540;
  return (
    <>
      {bs.map((b, i) => {
        const pt = project(cam, f, b.who === 'cat' ? cat : me);
        return <SpeechBubble key={i} b={b} x={pt.x} y={pt.y} f={f} minY={minY} />;
      })}
    </>
  );
};

const Scene: React.FC<{cam: CamKey[]; tod: keyof typeof SKY; f: number; children: React.ReactNode; overlay?: React.ReactNode; shakes?: {from: number; dur: number; amp: number}[]}> = ({cam, tod, f, children, overlay, shakes}) => (
  <AbsoluteFill>
    <Stage bg="#efe8dc" shadows={false}>
      <CameraRig keys={cam} shakes={shakes} />
      <Room tod={tod} f={f} />
      {children}
    </Stage>
    <Vignette strength={tod === 'night' ? 0.4 : 0.25} />
    {overlay}
  </AbsoluteFill>
);

// ---------- 1. 7:00 胸の上に乗って「おい。ごはん」 ----------
const BED_ME: V3 = [-2.2, 0.62, -0.2]; // 寝ている人の足元
const CAM_1: CamKey[] = [
  {f: 0, pos: [-0.6, 2.3, 1.6], look: [-2.2, 0.6, -1.2], fov: 50},
  {f: 180, pos: [-1.0, 1.8, 0.9], look: [-2.2, 0.8, -1.3], fov: 50, ease: LIN},
];
export const C1: React.FC = () => {
  const f = useCurrentFrame();
  const cat: V3 = [-2.2, 0.78, -1.15];
  return (
    <Scene cam={CAM_1} tod="morning" f={f} overlay={<Bubbles id="c1_wake" f={f} cam={CAM_1} cat={[cat[0], cat[1] + 0.42, cat[2]]} me={[0, 0, 0]} />}>
      <Human outfit={OWNER} position={BED_ME} rotation={[-Math.PI / 2, 0, 0]} p={pose({lSh: [0.1, 0.25], rSh: [0.1, 0.25]})} />
      <Cat position={cat} rotation={[0, 0.3, 0]} pose="sit" f={f} tail={0.6} headTurn={f > 80 ? 0 : 0.3 * Math.sin(f * 0.05)} />
    </Scene>
  );
};

// ---------- 2. 8:00 名前を呼んでも背中を向けたまま ----------
const CAM_2: CamKey[] = [
  {f: 0, pos: [2.2, 1.5, 2.6], look: [0.4, 0.9, -1.6], fov: 50},
  {f: 180, pos: [1.6, 1.4, 1.8], look: [0.5, 0.9, -1.8], fov: 50, ease: LIN},
];
export const C2: React.FC = () => {
  const f = useCurrentFrame();
  const cat: V3 = [0.6, 0.85, -2.1];
  // 名前を呼ばれた瞬間だけ耳としっぽがぴくっと動く
  const twitch = f > 20 && f < 34 ? 0.25 * Math.sin((f - 20) * 0.9) : 0;
  return (
    <Scene cam={CAM_2} tod="morning" f={f} overlay={<Bubbles id="c2_name" f={f} cam={CAM_2} cat={[cat[0], cat[1] + 0.42, cat[2]]} me={[-0.5, 1.75, 0.2]} />}>
      <Human outfit={OWNER} position={[-0.5, 0, 0.2]} rotation={[0, Math.PI - 0.45, 0]} p={pose({rSh: [0.6, 0.2], rEl: 0.8, head: -0.05})} />
      <Cat position={cat} rotation={[0, Math.PI, 0]} pose="sit" f={f} tail={0.3 + twitch * 4} headTurn={twitch} />
    </Scene>
  );
};

// ---------- 3. 12:00 日だまりで昼寝 ----------
const CAM_3: CamKey[] = [
  {f: 0, pos: [1.6, 0.9, 0.6], look: [0.6, 0.1, -0.9], fov: 50},
  {f: 180, pos: [1.2, 0.8, 0.1], look: [0.6, 0.1, -0.9], fov: 50, ease: LIN},
];
export const C3: React.FC = () => {
  const f = useCurrentFrame();
  const cat: V3 = [0.6, 0.0, -0.9];
  return (
    <Scene cam={CAM_3} tod="noon" f={f} overlay={<Bubbles id="c3_nap" f={f} cam={CAM_3} cat={[cat[0], cat[1] + 0.2, cat[2]]} me={[0, 0, 0]} />}>
      <Cat position={cat} rotation={[0, 0.6, 0]} pose="sleep" f={f} />
      {/* ふわふわ浮かぶ「Z」の代わりに、寝息の泡 */}
      {[0, 1, 2].map((i) => {
        const t = ((f * 0.02 + i / 3) % 1);
        return (
          <mesh key={i} position={[cat[0] + 0.1 + t * 0.2, 0.25 + t * 0.5, cat[2]]} scale={0.02 + t * 0.03}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.7 * (1 - t)} />
          </mesh>
        );
      })}
    </Scene>
  );
};

// ---------- 4. 15:00 キーボードの上 ----------
const CAM_4: CamKey[] = [
  {f: 0, pos: [0.6, 1.5, -0.4], look: [2.2, 0.85, -1.4], fov: 50},
  {f: 180, pos: [0.9, 1.4, -0.7], look: [2.2, 0.9, -1.45], fov: 50, ease: LIN},
];
export const C4: React.FC = () => {
  const f = useCurrentFrame();
  // 机に飛び乗って、キーボードの上で香箱座り
  const jump = interpolate(f, [10, 30], [0, 1], clamp);
  const start: V3 = [1.6, 0, -0.8];
  const end: V3 = [2.3, 0.77, -1.53];
  const cat: V3 = [lerp(start[0], end[0], sm(jump)), lerp(start[1], end[1], sm(jump)) + Math.sin(jump * Math.PI) * 0.35, lerp(start[2], end[2], sm(jump))];
  const typing = Math.sin(f * 0.9) * 0.08 * (f < 20 ? 1 : 0.2);
  return (
    <Scene cam={CAM_4} tod="noon" f={f} overlay={<Bubbles id="c4_keyboard" f={f} cam={CAM_4} cat={[cat[0], cat[1] + 0.25, cat[2]]} me={[0, 0, 0]} />}>
      <Human outfit={OWNER} position={[2.3, -0.45, -0.75]} rotation={[0, Math.PI, 0]} p={{...SEATED, lSh: [0.95 + typing, 0.1], rSh: [0.95 - typing, 0.1], lEl: 0.5, rEl: 0.5, head: f > 40 ? -0.1 : 0.25}} />
      <Box p={[2.3, 0.25, -0.75]} s={[0.5, 0.06, 0.5]} c="#3d4250" />
      <Cat position={cat} rotation={[0, Math.PI * 0.85, 0]} pose={jump < 1 ? 'walk' : 'loaf'} f={f} tail={0.3} />
    </Scene>
  );
};

// ---------- 5. 18:00 ニャーは人間専用 ----------
const CAM_5: CamKey[] = [
  {f: 0, pos: [-0.6, 1.0, 1.4], look: [0.5, 0.3, -0.7], fov: 52},
  {f: 180, pos: [-0.3, 0.95, 1.1], look: [0.5, 0.32, -0.7], fov: 52, ease: LIN},
];
export const C5: React.FC = () => {
  const f = useCurrentFrame();
  const cat: V3 = [0.2, 0, -0.5];
  return (
    <Scene cam={CAM_5} tod="evening" f={f} overlay={<Bubbles id="c5_meow" f={f} cam={CAM_5} cat={[cat[0], cat[1] + 0.42, cat[2]]} me={[0, 0, 0]} />}>
      <Cat position={cat} rotation={[0, 2.6, 0]} pose="sit" f={f} tail={0.5} headTurn={0.15 * Math.sin(f * 0.04)} />
      {/* となりで寝そべるもう1匹（猫どうしは鳴かない） */}
      <Cat position={[0.9, 0, -0.9]} rotation={[0, -2.2, 0]} pose="lie" f={f + 40} tail={0.2} scale={0.95} />
    </Scene>
  );
};

// ---------- 6・7. ソファ：21:00 年齢 → 23:50 お礼 → ひざの上 ----------
const SOFA_ME: V3 = [0.35, -0.04, 1.75];
const CAM_6: CamKey[] = [
  {f: 0, pos: [0.4, 1.6, -1.9], look: [-0.05, 0.75, 1.6], fov: 50},
  {f: 180, pos: [-0.2, 1.5, -1.6], look: [-0.05, 0.75, 1.6], fov: 50, ease: LIN},
];
export const C6: React.FC = () => {
  const f = useCurrentFrame();
  const cat: V3 = [-0.45, 0.5, 1.75];
  return (
    <Scene cam={CAM_6} tod="night" f={f} overlay={<Bubbles id="c6_age" f={f} cam={CAM_6} cat={[cat[0], cat[1] + 0.42, cat[2]]} me={[0, 0, 0]} />}>
      <Human outfit={OWNER} position={SOFA_ME} rotation={[0, Math.PI, 0]} p={{...SEATED, head: 0.1, twist: -0.2}} />
      <Cat position={cat} rotation={[0, Math.PI, 0]} pose="sit" f={f} tail={0.4} />
    </Scene>
  );
};
const CAM_7: CamKey[] = [
  {f: 0, pos: [-0.2, 1.5, -1.6], look: [-0.05, 0.75, 1.6], fov: 50},
  {f: 210, pos: [0.3, 1.4, -1.1], look: [0.2, 0.7, 1.6], fov: 50, ease: LIN},
];
export const C7: React.FC = () => {
  const f = useCurrentFrame();
  // 「……べつに」のあと、そっぽを向いたまま ひざの上へ
  const hop = interpolate(f, [110, 132], [0, 1], clamp);
  const from: V3 = [-0.45, 0.5, 1.75];
  const to: V3 = [0.33, 0.62, 1.45];
  const cat: V3 = [lerp(from[0], to[0], sm(hop)), lerp(from[1], to[1], sm(hop)) + Math.sin(hop * Math.PI) * 0.25, lerp(from[2], to[2], sm(hop))];
  return (
    <Scene cam={CAM_7} tod="night" f={f} overlay={<Bubbles id="c7_thanks" f={f} cam={CAM_7} cat={[cat[0], cat[1] + 0.35, cat[2]]} me={[0.35, 1.25, 1.75]} />}>
      <Human outfit={OWNER} position={SOFA_ME} rotation={[0, Math.PI, 0]} p={{...SEATED, head: 0.15, twist: -0.25 * (1 - hop), lSh: [0.5 + 0.3 * hop, 0.1], lEl: 1.2 * hop + 0.7}} />
      <Cat position={cat} rotation={[0, lerp(Math.PI * 1.3, Math.PI * 0.6, hop), 0]} pose={hop > 0 && hop < 1 ? 'walk' : hop >= 1 ? 'loaf' : 'sit'} f={f} tail={0.5} headTurn={f > 86 && f < 110 ? 0.6 : 0} />
    </Scene>
  );
};

// ---------- 8. 0:00 魔法が切れて「ニャー」 ----------
export const C8: React.FC = () => {
  const f = useCurrentFrame();
  const cat: V3 = [0.33, 0.62, 1.45];
  const magic = interpolate(f, [30, 38, 60], [0, 1, 0], clamp);
  const cam: CamKey[] = [
    {f: 0, pos: [0.3, 1.4, -1.1], look: [0.2, 0.7, 1.6], fov: 50},
    {f: 210, pos: [0.6, 1.2, -0.7], look: [0.3, 0.7, 1.5], fov: 50, ease: LIN},
  ];
  return (
    <Scene cam={cam} tod="night" f={f} overlay={<Bubbles id="c8_end" f={f} cam={cam} cat={[cat[0], cat[1] + 0.3, cat[2]]} me={[0, 0, 0]} />}>
      <Human outfit={OWNER} position={SOFA_ME} rotation={[0, Math.PI, 0]} p={{...SEATED, head: 0.3, lSh: [0.8, 0.1], lEl: 1.9}} />
      <Cat position={cat} rotation={[0, Math.PI * 0.6, 0]} pose="loaf" f={f} tail={0.3} />
      {/* 魔法が解けるキラキラ */}
      {magic > 0 &&
        Array.from({length: 24}).map((_, i) => {
          const a = i * 0.9 + f * 0.1;
          const r = 0.15 + (f - 30) * 0.012;
          return (
            <mesh key={i} position={[cat[0] + Math.cos(a) * r, cat[1] + 0.2 + Math.sin(i * 1.7) * 0.2 + (f - 30) * 0.008, cat[2] + Math.sin(a) * r]} scale={0.015}>
              <sphereGeometry args={[1, 6, 4]} />
              <meshBasicMaterial color="#ffe9a0" transparent opacity={magic} />
            </mesh>
          );
        })}
      {magic > 0 && <pointLight position={[cat[0], cat[1] + 0.4, cat[2]]} intensity={3 * magic} distance={2} color="#ffe9a0" />}
    </Scene>
  );
};
