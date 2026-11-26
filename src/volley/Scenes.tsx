import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3, easeOut} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {IDLE} from '../three/Human';
import {Earth, SpaceBackdrop, Stars, Sun} from '../three/Earth';
import {Court, Actor} from './Court';
import {Ball, GYM, ShockCone, Streak} from './Gym';
import {COVER, CHEER, DIG, DIG_BLOWN, HIT_POINT, LOOK_UP, REF_POINT, REF_WHISTLE, SLUMP, ballAfterHit, ballBeforeHit, lerpPose} from './rally';
import {CalloutView, Flash, Vignette} from './Overlay';
import {project} from '../lib/project';
import {SCENES} from './script';

const BG = '#20232a';
const spec = (id: string) => SCENES.find((s) => s.id === id)!;
const CO = (id: string, key: string) => spec(id).callouts!.find((c) => c.key === key)!;

// 飛び散る破片（木片・ガラス・火花）
const Burst: React.FC<{at: number; origin: V3; color: string; n?: number; speed?: number; size?: number; seed?: number; up?: number; glow?: boolean}> = ({at, origin, color, n = 30, speed = 0.12, size = 0.06, seed = 1, up = 0.18, glow}) => {
  const f = useCurrentFrame();
  const parts = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({length: n}).map(() => ({vx: (r() - 0.5) * 2, vy: r() * up * 2, vz: (r() - 0.5) * 2, s: 0.5 + r(), rot: r() * 6}));
  }, [n, seed, up]);
  const t = f - at;
  if (t < 0 || t > 50) return null;
  return (
    <group position={origin}>
      {parts.map((p, i) => {
        const x = p.vx * speed * t, z = p.vz * speed * t;
        const y = Math.max(0.02 - origin[1], p.vy * t - 0.012 * t * t);
        return (
          <mesh key={i} position={[x, y, z]} rotation={[p.rot + t * 0.3, p.rot, 0]} scale={size * p.s}>
            <boxGeometry args={[1, 0.4, 1.6]} />
            {glow ? <meshBasicMaterial color={color} transparent opacity={Math.max(0, 1 - t / 40)} /> : <meshStandardMaterial color={color} roughness={0.7} />}
          </mesh>
        );
      })}
    </group>
  );
};

// 床に広がる衝撃のリング
const Ring: React.FC<{at: number; origin: V3; max?: number; color?: string}> = ({at, origin, max = 4, color = '#f2e6d0'}) => {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < 0 || t > 24) return null;
  const k = t / 24;
  return (
    <mesh position={[origin[0], 0.03, origin[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[k * max, k * max + 0.25 + k * 0.4, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.6 * (1 - k)} depthWrite={false} />
    </mesh>
  );
};

const ballPath = (f: number, H: number, target: V3, travel: number, after?: (t: number) => V3 | null): V3 | null => {
  if (f < H) return ballBeforeHit(f, H);
  if (f < H + travel) return ballAfterHit(f, H, target, travel);
  return after ? after(f - H - travel) : target;
};

// ---------- 1本目：ふつうのスパイク ----------
const CAM1: CamKey[] = [
  {f: 0, pos: [8.5, 3.6, 9.5], look: [0.5, 2.2, 0], fov: 46},
  {f: 56, pos: [7.0, 3.4, 8.2], look: [-0.5, 2.4, 0], fov: 44},
  {f: 105, pos: [5.5, 3.6, 7.6], look: [-4, 1.0, 0], fov: 46},
];
export const V01: React.FC = () => {
  const f = useCurrentFrame();
  const H = 56;
  const target: V3 = [-5.4, 0.11, -0.4];
  const ball = ballPath(f, H, target, 9, (t) => [target[0] - t * 0.12, 0.11 + Math.max(0, Math.sin(Math.min(t, 20) * 0.16) * 1.6 * Math.exp(-t / 18)), target[2]]);
  const t = f - H;
  const recv: Actor[] = [
    {pos: [-6.2, 0, -1.4], rot: [0, Math.PI / 2, 0], p: t > 2 ? lerpPose(IDLE, DIG, Math.min(1, (t - 2) / 6)) : IDLE},
    {pos: [-6.0, 0, 2.2], rot: [0, Math.PI / 2, 0], p: IDLE},
  ];
  return (
    <AbsoluteFill>
      <Stage bg={BG}>
        <CameraRig keys={CAM1} shakes={[{from: H + 9, dur: 8, amp: 0.05}]} />
        <Court H={H} ball={ball} receivers={recv}>
          {f >= H && f < H + 10 && <Streak from={HIT_POINT} to={ballAfterHit(f, H, target, 9)} width={0.05} opacity={0.35} />}
          <Ring at={H + 9} origin={target} max={1.2} />
        </Court>
      </Stage>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};

// ---------- 2本目：レシーブが弾かれて天井へ ----------
const CAM2: CamKey[] = [
  {f: 0, pos: [-10, 1.5, -5.2], look: [1, 2.4, 0.4], fov: 50},
  {f: 30, pos: [-9.6, 1.4, -5.0], look: [-3, 2.2, -0.6], fov: 52},
  {f: 105, pos: [-10, 1.2, -5.2], look: [-6.5, 6.0, -0.8], fov: 60, ease: easeOut},
];
export const V02: React.FC = () => {
  const f = useCurrentFrame();
  const H = 26;
  const arms: V3 = [-5.75, 0.85, -1.2];
  const ceiling: V3 = [-7.2, GYM.h - 0.2, -0.6];
  // 腕で弾かれて天井へ → ゆっくり落ちてくる
  const ball = ballPath(f, H, arms, 5, (t) => {
    if (t < 9) {
      const u = t / 9;
      return [arms[0] + (ceiling[0] - arms[0]) * u, arms[1] + (ceiling[1] - arms[1]) * u, arms[2] + (ceiling[2] - arms[2]) * u];
    }
    const d = t - 9;
    return [ceiling[0] - d * 0.02, Math.max(0.11, ceiling[1] - 0.012 * d * d), ceiling[2]];
  });
  const t = f - H;
  const recv: Actor[] = [
    {pos: [-6.2, 0, -1.2], rot: [0, Math.PI / 2, 0], p: t < 5 ? DIG : lerpPose(DIG, DIG_BLOWN, Math.min(1, (t - 5) / 4))},
    {pos: [-6.0, 0, 2.2], rot: [0, Math.PI / 2, 0], p: t > 12 ? LOOK_UP : IDLE},
  ];
  return (
    <AbsoluteFill>
      <Stage bg={BG}>
        <CameraRig keys={CAM2} shakes={[{from: H + 5, dur: 10, amp: 0.08}]} />
        <Court H={H} ball={ball} receivers={recv}>
          {f >= H && f < H + 6 && <Streak from={HIT_POINT} to={ballAfterHit(f, H, arms, 5)} width={0.06} opacity={0.45} />}
          {f >= H + 5 && f < H + 15 && <Streak from={arms} to={ball ?? arms} width={0.06} opacity={0.4} />}
          <Burst at={H + 14} origin={ceiling} color="#c9ccd2" n={20} speed={0.06} up={0} seed={3} />
        </Court>
      </Stage>
      <Vignette strength={0.4} />
      <Flash at={H + 5} dur={5} max={0.25} />
    </AbsoluteFill>
  );
};

// ---------- 3本目：受けた選手ごと吹っ飛ぶ ----------
const CAM3: CamKey[] = [
  {f: 0, pos: [-2, 1.6, 9.5], look: [0, 2.4, 0], fov: 48},
  {f: 28, pos: [-4, 1.5, 9.2], look: [-5, 1.4, 0], fov: 50},
  {f: 105, pos: [-12, 2.2, 8.5], look: [-18, 1.4, -0.6], fov: 52},
];
export const V03: React.FC = () => {
  const f = useCurrentFrame();
  const H = 26;
  const chest: V3 = [-5.8, 1.25, -0.9];
  const t = f - H;
  const fly = Math.max(0, t - 3);
  const rx = -6.2 - Math.min(15.2, fly * 0.55);
  const hitWall = rx <= -21.3;
  const ball = ballPath(f, H, chest, 3, () => [rx + 0.4, 1.2 + Math.min(0.6, fly * 0.04), -0.9]);
  const recv: Actor[] = [
    {pos: [rx, Math.min(0.8, fly * 0.06), -1.0], rot: [hitWall ? 0 : -0.2, Math.PI / 2, hitWall ? 0.1 : 1.1 + fly * 0.02], p: t < 3 ? DIG : DIG_BLOWN},
    {pos: [-6.0, 0, 2.2], rot: [0, Math.PI / 2 - (t > 6 ? 1.3 : 0), 0], p: IDLE},
  ];
  return (
    <AbsoluteFill>
      <Stage bg={BG}>
        <CameraRig keys={CAM3} shakes={[{from: H + 3, dur: 10, amp: 0.1}, {from: H + 31, dur: 14, amp: 0.15}]} />
        <Court H={H} ball={ball} receivers={recv} netShake={t > 0 ? 0.25 * Math.exp(-t / 20) : 0}>
          {f >= H && f < H + 4 && <Streak from={HIT_POINT} to={ballAfterHit(f, H, chest, 3)} width={0.08} opacity={0.55} />}
          {fly > 0 && !hitWall && <Streak from={[rx + 3, 1.0, -1]} to={[rx + 0.5, 1.0, -1]} width={0.4} opacity={0.15} color="#ffffff" />}
          <Burst at={H + 31} origin={[-21.8, 1.2, -1]} color="#bdb6aa" n={26} speed={0.08} seed={5} />
        </Court>
      </Stage>
      <Vignette strength={0.4} />
      <Flash at={H + 3} dur={5} max={0.3} />
    </AbsoluteFill>
  );
};

// ---------- 4本目：床に穴 ----------
export const CAM4: CamKey[] = [
  {f: 0, pos: [4, 7.5, 7], look: [-1, 1.5, 0.5], fov: 50},
  {f: 26, pos: [1, 8.5, 6], look: [-3, 0.5, 0.8], fov: 50},
  {f: 105, pos: [-2.2, 5.0, 4.5], look: [-4.2, 0, 1.2], fov: 48},
];
export const HOLE: V3 = [-4.2, 0, 1.2];
export const V04: React.FC = () => {
  const f = useCurrentFrame();
  const H = 26;
  const t = f - H;
  const ball = ballPath(f, H, [HOLE[0], 0.05, HOLE[2]], 2, () => null);
  const recv: Actor[] = [
    {pos: [-6.2, 0, -1.4], rot: [0, Math.PI / 2, 0], p: t > 2 ? COVER : DIG},
    {pos: [-6.4, 0, 2.6], rot: [0, Math.PI / 2, 0], p: t > 2 ? COVER : IDLE},
  ];
  return (
    <AbsoluteFill>
      <Stage bg={BG}>
        <CameraRig keys={CAM4} shakes={[{from: H + 2, dur: 16, amp: 0.18}]} />
        <Court H={H} ball={ball} receivers={recv} hole={t >= 2} holeAge={t - 2}>
          {f >= H && f < H + 4 && <Streak from={HIT_POINT} to={[HOLE[0], 0.05, HOLE[2]]} width={0.1} opacity={0.6} />}
          <Burst at={H + 2} origin={[HOLE[0], 0.05, HOLE[2]]} color="#b98455" n={40} speed={0.07} up={0.25} seed={7} />
          <Ring at={H + 2} origin={HOLE} max={3.5} />
        </Court>
      </Stage>
      <Vignette strength={0.4} />
      <Flash at={H + 2} dur={6} max={0.4} />
      <CalloutView {...project(CAM4, f, HOLE)} {...CO('v04_floor', 'hole')} />
    </AbsoluteFill>
  );
};

// ---------- 5本目：音速突破・窓が割れる ----------
export const CAM5: CamKey[] = [
  {f: 0, pos: [14, 3.0, 11], look: [0, 3.0, 0], fov: 52},
  {f: 28, pos: [13, 3.2, 10.5], look: [-2, 3.2, 0], fov: 54},
  {f: 120, pos: [10, 2.4, 9], look: [-4, 6.5, -6], fov: 62},
];
export const WIN: V3 = [-6, 8.6, -GYM.z + 0.1];
export const V05: React.FC = () => {
  const f = useCurrentFrame();
  const H = 28;
  const t = f - H;
  const target: V3 = [-6.5, 0.05, 2.4];
  const ball = ballPath(f, H, target, 1, () => null);
  const shatter = interpolate(t, [4, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const cover = t > 3;
  const recv: Actor[] = [
    {pos: [-6.2, 0, -1.4], rot: [0, Math.PI / 2, 0], p: cover ? COVER : DIG},
    {pos: [-6.4, 0, 2.9], rot: [0, Math.PI / 2, 0], p: cover ? COVER : IDLE},
  ];
  const sk = Math.max(0, Math.min(1, t / 14));
  return (
    <AbsoluteFill>
      <Stage bg={BG}>
        <CameraRig keys={CAM5} shakes={[{from: H, dur: 30, amp: 0.25}]} />
        <Court H={H} ball={ball} receivers={recv} shatter={shatter} hole extraOurs={[{pos: [4.6, 0, 2.6], p: cover ? COVER : IDLE}]}>
          {t >= 0 && t < 3 && <Streak from={HIT_POINT} to={target} width={0.14} opacity={0.75} />}
          {t >= 0 && t < 14 && <ShockCone position={[HIT_POINT[0] - 2, 2.2, 1.2]} dir={[target[0] - HIT_POINT[0], target[1] - HIT_POINT[1], target[2] - HIT_POINT[2]]} k={sk} />}
          <Burst at={H + 6} origin={[-6, 8.6, -GYM.z + 0.3]} color="#d6ecf7" n={40} speed={0.09} up={0.05} seed={9} />
          <Burst at={H + 9} origin={[2, 8.6, -GYM.z + 0.3]} color="#d6ecf7" n={30} speed={0.09} up={0.05} seed={10} />
          <Burst at={H + 1} origin={target} color="#b98455" n={36} speed={0.1} up={0.3} seed={11} />
          <Ring at={H + 1} origin={target} max={6} />
        </Court>
      </Stage>
      <Vignette strength={0.45} />
      <Flash at={H + 1} dur={6} max={0.55} />
      <CalloutView {...project(CAM5, f, WIN)} {...CO('v05_sonic', 'window')} />
    </AbsoluteFill>
  );
};

// ---------- 6〜8本目：燃えるボール（早送り） ----------
export const CAM6: CamKey[] = [
  {f: 0, pos: [7.5, 2.4, 4.5], look: [-3, 1.8, -0.5], fov: 52},
  {f: 150, pos: [6.0, 2.2, 3.2], look: [-4, 1.4, 0.5], fov: 52},
];
const HITS6 = [24, 64, 104];
export const V06: React.FC = () => {
  const f = useCurrentFrame();
  const idx = f < HITS6[1] - 30 ? 0 : f < HITS6[2] - 30 ? 1 : 2;
  const H = HITS6[idx];
  const heat = [0.35, 0.65, 1][idx];
  const targets: V3[] = [
    [-5.5, 0.05, -2.2],
    [-7.0, 0.05, 1.6],
    [-4.0, 0.05, 2.8],
  ];
  const target = targets[idx];
  const ball = ballPath(f, H, target, 1, () => null);
  const preHeat = f < H ? heat * 0.4 : heat;
  return (
    <AbsoluteFill>
      <Stage bg={BG}>
        <CameraRig keys={CAM6} shakes={HITS6.map((h) => ({from: h + 1, dur: 14, amp: 0.22}))} />
        <Court H={H} ball={ball} ballHeat={preHeat} shatter={1} hole receivers={[{pos: [-6.3, 0, -1.6], rot: [0, Math.PI / 2, 0], p: COVER}, {pos: [-6.6, 0, 3.0], rot: [0, Math.PI / 2, 0], p: COVER}]}>
          {HITS6.map((h, i) =>
            f >= h && f < h + 6 ? <Streak key={i} from={HIT_POINT} to={targets[i]} width={0.16 + i * 0.05} opacity={0.85} color={['#ffb070', '#ff8a3a', '#ff5a1a'][i]} /> : null,
          )}
          {HITS6.map((h, i) => (
            <Burst key={i} at={h + 1} origin={targets[i]} color={['#ffcf7a', '#ff9a3a', '#ff6a2a'][i]} n={50} speed={0.12} up={0.35} seed={20 + i} size={0.05} glow />
          ))}
          {HITS6.map((h, i) => (
            <Ring key={`r${i}`} at={h + 1} origin={targets[i]} max={5 + i} color="#ffb070" />
          ))}
          {/* 焦げ跡 */}
          {HITS6.map((h, i) =>
            f > h ? (
              <mesh key={`s${i}`} position={[targets[i][0], 0.015, targets[i][2]]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.6 + i * 0.25, 24]} />
                <meshBasicMaterial color="#1a1310" transparent opacity={0.8} />
              </mesh>
            ) : null,
          )}
        </Court>
      </Stage>
      <Vignette strength={0.45} />
      {HITS6.map((h) => (
        <Flash key={h} at={h + 1} dur={5} max={0.35} color="#ffd6a8" />
      ))}
      {ball && <CalloutView {...project(CAM6, f, ball)} {...CO('v06_burn', 'ball')} />}
    </AbsoluteFill>
  );
};

// ---------- 9本目：打ちそこねて宇宙へ → 地球を1周 ----------
const CAM7A: CamKey[] = [
  {f: 0, pos: [8.5, 2.2, 6.5], look: [1, 2.6, 0], fov: 50},
  {f: 40, pos: [9.5, 2.6, 5.5], look: [18, 3.8, 0], fov: 54},
  {f: 62, pos: [12, 3.0, 4], look: [24, 3.8, 0], fov: 56},
];
export const CAM7B: CamKey[] = [
  {f: 62, pos: [0, 2.0, 9.5], look: [0, 0, 0], fov: 44},
  {f: 180, pos: [-2.2, 3.2, 10.5], look: [0, -0.2, 0], fov: 44},
];
const R_ORBIT = 2.62;
export const orbitPos = (f: number): V3 => {
  const a = 0.4 + (f - 62) * 0.045;
  const v = new THREE.Vector3(Math.cos(a) * R_ORBIT, 0, Math.sin(a) * R_ORBIT).applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.5).applyAxisAngle(new THREE.Vector3(0, 0, 1), 0.25);
  return [v.x, v.y - 0.3, v.z];
};
export const V07: React.FC = () => {
  const f = useCurrentFrame();
  const H = 30;
  const exit: V3 = [GYM.x + 2, 3.2, 0.2];
  const gym = f < 62;
  const trail = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 160; k++) pts.push(new THREE.Vector3(...orbitPos(62 + (k / 160) * ((2 * Math.PI) / 0.045))));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  if (gym) {
    // 打ちそこねて後ろ（自分たちの奥の壁）へ
    const ball = ballPath(f, H, exit, 2, () => null);
    const t = f - H;
    return (
      <AbsoluteFill>
        <Stage bg={BG}>
          <CameraRig keys={CAM7A} shakes={[{from: H, dur: 20, amp: 0.2}]} />
          <Court H={H} ball={ball} ballHeat={1} shatter={1} hole wallHole={t >= 2} extraOurs={[{pos: [5.0, 0, 2.4], rot: [0, Math.PI / 2, 0], p: t > 4 ? LOOK_UP : IDLE}]}>
            {t >= 0 && t < 8 && <Streak from={HIT_POINT} to={exit} width={0.22} opacity={0.9} color="#ff7a2a" />}
            <Burst at={H + 2} origin={[GYM.x - 0.2, 3.2, 0]} color="#cfc8bc" n={40} speed={0.1} up={0.1} seed={31} />
          </Court>
        </Stage>
        <Vignette strength={0.45} />
        <Flash at={H} dur={5} max={0.4} color="#ffd6a8" />
      </AbsoluteFill>
    );
  }
  const bp = orbitPos(f);
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM7B} />
        <ambientLight intensity={0.12} />
        <hemisphereLight args={['#9fc8ff', '#0a1030', 0.35]} />
        <directionalLight position={[8, 5, 7]} intensity={3.2} color="#fff4e2" />
        <SpaceBackdrop />
        <Stars />
        <Sun position={[70, 45, -90]} size={3} />
        {/* 実際の大陸の形。日本が正面に来る向き */}
        <Earth radius={2.3} real detail={120} spin={-2.3 + (f - 62) * 0.002} tilt={0.2} cloudOpacity={0.55} position={[0, -0.3, 0]} />
        <lineLoop geometry={trail}>
          <lineDashedMaterial color="#ffd2a0" dashSize={0.08} gapSize={0.06} transparent opacity={0.55} />
        </lineLoop>
        <Ball position={bp} heat={1} scale={1.4} />
      </Stage>
      <Vignette strength={0.5} />
      <Flash at={62} dur={6} max={0.6} />
      <CalloutView {...project(CAM7B, f, bp)} {...CO('v07_orbit', 'orbit')} />
    </AbsoluteFill>
  );
};

// ---------- 90分後：戻ってきて自分のコートへ ----------
export const CAM8: CamKey[] = [
  {f: 0, pos: [-6, 2.0, 7.5], look: [12, 3.0, 0], fov: 52},
  {f: 70, pos: [-4, 2.2, 7.0], look: [14, 3.0, 0], fov: 50},
  {f: 96, pos: [-1, 3.2, 7.5], look: [5, 0.5, -1], fov: 48},
  {f: 150, pos: [1.5, 3.6, 7.0], look: [5, 0.4, -1], fov: 46},
];
export const LAND: V3 = [5.2, 0.11, -1.0];
export const V08: React.FC = () => {
  const f = useCurrentFrame();
  const IN = 76;
  const from: V3 = [GYM.x + 1, 3.2, 0.2];
  const u = Math.max(0, Math.min(1, (f - IN) / 6));
  const ball: V3 | null = f < IN ? null : [from[0] + (LAND[0] - from[0]) * u, from[1] + (LAND[1] - from[1]) * u, from[2] + (LAND[2] - from[2]) * u];
  const watch = f < IN + 6 ? LOOK_UP : SLUMP;
  const others: Actor[] = [
    {pos: [3.0, 0, 1.2], rot: [0, Math.PI / 2, 0], p: f < IN ? IDLE : watch},
    {pos: [4.5, 0, 2.6], rot: [0, Math.PI / 2 + 0.3, 0], p: f < IN ? IDLE : watch},
  ];
  return (
    <AbsoluteFill>
      <Stage bg={BG}>
        <CameraRig keys={CAM8} shakes={[{from: IN + 6, dur: 14, amp: 0.15}]} />
        <Court H={-200} ball={ball} ballHeat={0.25} shatter={1} hole wallHole extraOurs={others} hideSpiker>
          {f >= IN && f < IN + 8 && <Streak from={from} to={ball ?? LAND} width={0.18} opacity={0.8} color="#ffb070" />}
          <Burst at={IN + 6} origin={LAND} color="#b98455" n={30} speed={0.08} up={0.25} seed={41} />
          <Ring at={IN + 6} origin={LAND} max={3} />
        </Court>
      </Stage>
      <Vignette strength={0.45} />
      <Flash at={IN + 6} dur={5} max={0.35} />
      <CalloutView {...project(CAM8, f, LAND)} {...CO('v08_return', 'land')} />
    </AbsoluteFill>
  );
};

// ---------- 判定：相手チームに1点 ----------
const CAM9: CamKey[] = [
  {f: 0, pos: [2.2, 2.6, -2.5], look: [0, 2.9, -5.9], fov: 44},
  {f: 60, pos: [2.0, 2.7, -2.6], look: [0, 3.0, -5.9], fov: 44},
  {f: 90, pos: [0.6, 5.2, 3.5], look: [0, 6.9, -GYM.z], fov: 46},
  {f: 180, pos: [0.3, 5.4, 2.5], look: [0, 7.0, -GYM.z], fov: 42},
];
export const V09: React.FC = () => {
  const f = useCurrentFrame();
  const point = f > 40;
  const flip = f > 96;
  const ref = f < 18 ? IDLE : f < 40 ? REF_WHISTLE : REF_POINT;
  const us: Actor[] = [
    {pos: [3.0, 0, 1.2], rot: [0, Math.PI / 2, 0], p: SLUMP},
    {pos: [4.5, 0, 2.6], rot: [0, Math.PI / 2 + 0.3, 0], p: SLUMP},
  ];
  const them: Actor[] = [
    {pos: [-4.5, Math.max(0, Math.sin(f * 0.35)) * (point ? 0.4 : 0), -1.4], rot: [0, Math.PI / 2, 0], p: point ? CHEER(f) : IDLE},
    {pos: [-5.0, Math.max(0, Math.sin(f * 0.35 + 1)) * (point ? 0.4 : 0), 2.2], rot: [0, Math.PI / 2, 0], p: point ? CHEER(f + 3) : IDLE},
  ];
  return (
    <AbsoluteFill>
      <Stage bg={BG}>
        <CameraRig keys={CAM9} />
        <Court H={-200} ball={[5.2, 0.11, -1.0]} shatter={1} hole wallHole extraOurs={us} receivers={them} refPose={ref} score={flip ? [23, 25] : [23, 24]} scoreFlash={flip ? Math.max(0, 1.2 - (f - 96) / 20) : 0} hideSpiker />
      </Stage>
      <Vignette strength={0.45} />
      <Flash at={97} dur={6} max={0.3} />
    </AbsoluteFill>
  );
};
