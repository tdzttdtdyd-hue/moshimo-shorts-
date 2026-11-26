import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3, easeIO, easeOut} from '../lib/anim';
import {fbm3, mulberry32} from '../lib/rand';
import {project} from '../lib/project';
import {Human, IDLE, OUTFITS, pose, shockPose} from '../three/Human';
import {Earth, SpaceBackdrop, Stars, Sun} from '../three/Earth';
import {CloudPuffs, Mountains, Road, SkyDome, Terrain, Tower, grassColor} from '../three/Landscape';
import {House} from '../three/Props';
import {Balance, CandyShop, Coin, COIN_T, CoinField, CoinHeap, CoinTower, DESK_TOP, Dome, Room, SignBoard, Truck, pileTex} from './Assets';
import {CalloutView, Flash, Vignette} from './Overlay';
import {SCENES} from './script';

const spec = (id: string) => SCENES.find((s) => s.id === id)!;
const CO = (id: string, key: string) => spec(id).callouts!.find((c) => c.key === key)!;
const seqDay = (id: string, f: number) => {
  const seq = spec(id).clock!.seq!;
  return parseInt([...seq].reverse().find((s) => f >= s.from)?.value ?? seq[0].value, 10);
};

// 部屋の明るい照明
const RoomLights: React.FC = () => (
  <>
    <hemisphereLight args={['#fff4e2', '#7a5a3a', 0.9]} />
    <ambientLight intensity={0.2} />
    <directionalLight position={[-2, 4, 2]} intensity={2.2} color="#fff1dc" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} shadow-bias={-0.0003} shadow-radius={4} />
    <pointLight position={[0.6, 2.4, -1.2]} intensity={6} color="#fff6e8" />
  </>
);

// 机の上の積み方：20枚ずつの柱を渦巻き状に
const deskPlace = (i: number, r: () => number) => {
  const stack = Math.floor(i / 20);
  const level = i % 20;
  const ang = stack * 2.4;
  const rad = 0.03 * Math.sqrt(stack) + (stack > 0 ? 0.012 : 0);
  const jx = (r() - 0.5) * 0.002, jz = (r() - 0.5) * 0.002;
  return {p: [DESK_TOP[0] + Math.cos(ang) * rad + jx, DESK_TOP[1] + COIN_T / 2 + level * COIN_T, DESK_TOP[2] + Math.sin(ang) * rad + jz] as V3, r: [0, r() * 6, 0] as V3};
};

// ---------- 1日目：机の上に1枚 ----------
const CAM1: CamKey[] = [
  {f: 0, pos: [DESK_TOP[0] + 0.05, DESK_TOP[1] + 0.06, DESK_TOP[2] + 0.11], look: [DESK_TOP[0], DESK_TOP[1], DESK_TOP[2]], fov: 40},
  {f: 120, pos: [DESK_TOP[0] + 0.1, DESK_TOP[1] + 0.13, DESK_TOP[2] + 0.22], look: [DESK_TOP[0], DESK_TOP[1] + 0.005, DESK_TOP[2]], fov: 42},
];
export const C01: React.FC = () => {
  const f = useCurrentFrame();
  // 上から落ちてきて、くるくる回って止まる
  const drop = Math.max(0, 1 - f / 12);
  const wob = f < 12 ? 0 : Math.exp(-(f - 12) / 10) * 0.25 * Math.sin((f - 12) * 0.8);
  return (
    <AbsoluteFill>
      <Stage bg="#2a2520">
        <CameraRig keys={CAM1} />
        <RoomLights />
        <Room />
        <Coin position={[DESK_TOP[0], DESK_TOP[1] + COIN_T / 2 + drop * drop * 0.25, DESK_TOP[2]]} rotation={[wob, f * 0.01, wob * 0.6]} />
      </Stage>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

// ---------- 2〜10日目：机の上で倍々 ----------
const CAM2: CamKey[] = [
  {f: 0, pos: [DESK_TOP[0] + 0.1, DESK_TOP[1] + 0.13, DESK_TOP[2] + 0.22], look: [DESK_TOP[0], DESK_TOP[1] + 0.005, DESK_TOP[2]], fov: 42},
  {f: 150, pos: [DESK_TOP[0] + 0.34, DESK_TOP[1] + 0.38, DESK_TOP[2] + 0.62], look: [DESK_TOP[0], DESK_TOP[1] + 0.04, DESK_TOP[2]], fov: 44, ease: easeIO},
];
export const C02: React.FC = () => {
  const f = useCurrentFrame();
  const day = seqDay('c02_desk', f);
  const n = 2 ** (day - 1);
  return (
    <AbsoluteFill>
      <Stage bg="#2a2520">
        <CameraRig keys={CAM2} />
        <RoomLights />
        <Room />
        <CoinField n={n} place={deskPlace} seed={3} />
      </Stage>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

// ---------- 20日目：床に山 ----------
const CAM3: CamKey[] = [
  {f: 0, pos: [2.2, 1.6, 2.4], look: [0, 0.4, -0.6], fov: 50},
  {f: 150, pos: [2.0, 1.9, 2.0], look: [0.1, 0.25, -0.5], fov: 50},
];
export const HEAP3: V3 = [0, 0, -0.4];
export const C03: React.FC = () => {
  const f = useCurrentFrame();
  const day = seqDay('c03_room', f);
  // 体積は 2^(day-1) × 約0.6cm³ → 20日目で約0.31m³
  const vol = 2 ** (day - 1) * 0.6e-6;
  const r = Math.cbrt(vol / 0.55) * 1.15;
  return (
    <AbsoluteFill>
      <Stage bg="#2a2520">
        <CameraRig keys={CAM3} shakes={[{from: 50, dur: 90, amp: 0.012}]} />
        <RoomLights />
        <Room floorCreak={day >= 19 ? Math.sin(f * 0.8) : 0} />
        <CoinField n={512} place={deskPlace} seed={3} />
        <CoinHeap position={HEAP3} radius={r * 1.6} height={r * 0.55} seed={2} repeat={3} />
        <Human position={[-1.5, 0, -0.9]} rotation={[0, 0.9, 0]} outfit={OUTFITS[2]} p={day >= 18 ? shockPose(f) : IDLE} />
      </Stage>
      <Vignette strength={0.45} />
      <CalloutView {...project(CAM3, f, [HEAP3[0] + 0.3, 0.05, HEAP3[2] + 0.4])} {...CO('c03_room', 'floor')} />
    </AbsoluteFill>
  );
};

// ---------- 25日目：塔が雲を突き抜ける ----------
const CAM4: CamKey[] = [
  {f: 0, pos: [14, 2.0, 20], look: [0, 6, 0], fov: 50},
  {f: 70, pos: [12, 8, 18], look: [0, 40, 0], fov: 56},
  {f: 150, pos: [10, 170, 26], look: [0, 420, -20], fov: 60, ease: easeIO},
];
const TOWER_AT: V3 = [2.2, 0, 1.0];
export const C04: React.FC = () => {
  const f = useCurrentFrame();
  const grow = interpolate(f, [4, 60], [8, 2000], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => x * x});
  return (
    <AbsoluteFill>
      <Stage bg="#9cc7ea" fog={['#c7def0', 60, 900]}>
        <CameraRig keys={CAM4} />
        <SkyDome top="#3f86d8" horizon="#d9ecf8" sunDir={[0.4, 0.5, -0.7]} radius={1400} />
        <hemisphereLight args={['#dfefff', '#8aa070', 0.9]} />
        <directionalLight position={[20, 40, 10]} intensity={2.2} castShadow shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} />
        <Terrain size={[400, 400]} seg={80} amp={0.4} colorAt={grassColor()} />
        <Mountains seed={4} radius={260} height={60} color="#7f9fbf" />
        <House position={[-2, 0, -1]} wall="#fff4e0" roof="#c0392b" h={2} scale={2.2} />
        <CoinTower position={TOWER_AT} height={grow} />
        <CloudPuffs seed={7} count={40} area={[-400, 400]} y={[120, 150]} z={[-400, 300]} scale={9} />
      </Stage>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};

// ---------- 30日目：トラック54台分 ----------
const CAM5: CamKey[] = [
  {f: 0, pos: [-14, 9, 16], look: [0, 1.5, -6], fov: 48},
  {f: 180, pos: [10, 12, 18], look: [0, 1.5, -24], fov: 50},
];
const TRUCKS = Array.from({length: 9}).map((_, i) => ({x: i % 2 ? 2.6 : -2.6, z: -i * 9 + 4}));
export const C05: React.FC = () => {
  const f = useCurrentFrame();
  const r = mulberry32(5);
  const towers = useMemo(() => Array.from({length: 30}).map((_, i) => ({x: (i % 2 ? 1 : -1) * (14 + r() * 8), z: 20 - Math.floor(i / 2) * 9, h: 8 + r() * 26, c: ['#d9dee6', '#e8e2d6', '#cfd7df'][i % 3], seed: i})), []);
  return (
    <AbsoluteFill>
      <Stage bg="#cfe4f3" fog={['#d8e8f4', 40, 220]}>
        <CameraRig keys={CAM5} />
        <SkyDome top="#4a8fd8" horizon="#e2eff8" sunDir={[0.5, 0.6, 0.4]} />
        <hemisphereLight args={['#eef6ff', '#8f8a80', 0.9]} />
        <directionalLight position={[20, 30, 15]} intensity={2.3} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} />
        <Terrain size={[300, 300]} seg={60} amp={0.1} colorAt={grassColor('#8fa57a', '#76905f', '#a5b88e')} />
        <Road length={200} width={10} position={[0, 0, -40]} rotationY={Math.PI / 2} />
        {towers.map((t, i) => (
          <Tower key={i} position={[t.x, 0, t.z]} h={t.h} w={6} d={6} color={t.c} seed={t.seed} />
        ))}
        {TRUCKS.map((t, i) => (
          <Truck key={i} position={[t.x, 0, t.z]} rotY={Math.PI / 2} load={1 + 0.1 * Math.sin(i)} color={['#e8eef3', '#c0392b', '#2c6e9b'][i % 3]} />
        ))}
      </Stage>
      <Vignette strength={0.4} />
      <CalloutView {...project(CAM5, f, [TRUCKS[4].x, 2.6, TRUCKS[4].z])} {...CO('c05_trucks', 'truck')} />
    </AbsoluteFill>
  );
};

// ---------- 42日目：ドーム球場が満杯 ----------
const CAM6: CamKey[] = [
  {f: 0, pos: [-220, 150, 260], look: [0, 10, 0], fov: 42},
  {f: 180, pos: [160, 170, 270], look: [0, 10, 0], fov: 42},
];
export const C06: React.FC = () => {
  const f = useCurrentFrame();
  const fill = interpolate(f, [4, 110], [0.35, 1.05], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const r = mulberry32(9);
  const city = useMemo(() => {
    const out: {x: number; z: number; h: number; c: string; seed: number}[] = [];
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, d = 150 + r() * 260;
      out.push({x: Math.cos(a) * d, z: Math.sin(a) * d, h: 20 + r() * 70, c: ['#d9dee6', '#e8e2d6', '#cfd7df'][i % 3], seed: i});
    }
    return out;
  }, []);
  return (
    <AbsoluteFill>
      <Stage bg="#cfe4f3" fog={['#d8e8f4', 250, 1200]}>
        <CameraRig keys={CAM6} />
        <SkyDome top="#4a8fd8" horizon="#e2eff8" sunDir={[0.4, 0.6, 0.6]} radius={1500} />
        <hemisphereLight args={['#eef6ff', '#8f8a80', 0.95]} />
        <directionalLight position={[200, 300, 150]} intensity={2.3} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-220} shadow-camera-right={220} shadow-camera-top={220} shadow-camera-bottom={-220} shadow-camera-far={900} />
        <Terrain size={[1400, 1400]} seg={60} amp={0.2} colorAt={grassColor('#9aa38f', '#7f8a74', '#b0b8a4')} />
        <Dome fill={fill} />
        {city.map((t, i) => (
          <Tower key={i} position={[t.x, 0, t.z]} h={t.h} w={24} d={24} color={t.c} seed={t.seed} />
        ))}
      </Stage>
      <Vignette strength={0.4} />
      <CalloutView {...project(CAM6, f, [0, 16 + fill * 30, 0])} {...CO('c06_dome', 'dome')} />
    </AbsoluteFill>
  );
};

// ---------- 47日目：世界のアルミが足りない ----------
// 主なアルミ生産国（経度, 緯度）
const ALU: [number, number][] = [
  [112, 35], [118, 40], [104, 30], [80, 22], [90, 55], [100, 56], [-73, 48], [54, 24], [50.5, 26], [150, -25], [8, 61], [-50, -10], [-90, 37], [24, 66], [12, 0],
];
const llToVec = (lon: number, lat: number, r: number): V3 => {
  const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
  return [Math.sin(lo) * Math.cos(la) * r, Math.sin(la) * r, Math.cos(lo) * Math.cos(la) * r];
};
const CAM7: CamKey[] = [
  {f: 0, pos: [0, 1.6, 8.2], look: [0, 0.2, 0], fov: 44},
  {f: 150, pos: [-1.2, 1.9, 8.8], look: [0, 0.2, 0], fov: 44},
];
export const C07: React.FC = () => {
  const f = useCurrentFrame();
  const SPIN = -1.6 + f * 0.004;
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM7} />
        <ambientLight intensity={0.15} />
        <hemisphereLight args={['#9fc8ff', '#0a1030', 0.4]} />
        <directionalLight position={[6, 4, 8]} intensity={3} />
        <SpaceBackdrop />
        <Stars />
        <Sun position={[80, 40, -100]} size={3} />
        <group rotation={[0, 0, 0.15]}>
          <group rotation={[0, SPIN, 0]}>
            <Earth radius={2.4} real detail={110} spin={0} tilt={0} clouds cloudOpacity={0.45} />
            {ALU.map(([lon, lat], i) => {
              const off = 30 + i * 5;
              const on = f < off ? 1 : Math.max(0, 1 - (f - off) / 12);
              const p = llToVec(lon, lat, 2.48);
              return (
                <group key={i} position={p}>
                  <mesh scale={0.05 + 0.04 * on}>
                    <sphereGeometry args={[1, 12, 12]} />
                    <meshBasicMaterial color={on > 0.05 ? '#ffd27a' : '#5a6070'} />
                  </mesh>
                  {on > 0.05 && (
                    <mesh scale={0.16 * on}>
                      <sphereGeometry args={[1, 12, 12]} />
                      <meshBasicMaterial color="#ffb347" transparent opacity={0.35 * on} blending={THREE.AdditiveBlending} depthWrite={false} />
                    </mesh>
                  )}
                </group>
              );
            })}
          </group>
        </group>
      </Stage>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

// ---------- 94日目：天びんで地球より重い ----------
const CAM8: CamKey[] = [
  {f: 0, pos: [0, -1, 38], look: [0, -3.8, 0], fov: 46},
  {f: 180, pos: [2.5, 0.5, 36], look: [0, -4.0, 0], fov: 46},
];
const CoinBall: React.FC<{r: number}> = ({r}) => {
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 24);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      v.multiplyScalar(1 + 0.06 * fbm3(v.x * 3, v.y * 3, v.z * 3, 5, 3));
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const tex = useMemo(() => pileTex([6, 6]), []);
  return (
    <mesh geometry={geo} scale={r} position={[0, r * 0.95, 0]}>
      <meshStandardMaterial map={tex} metalness={0.2} roughness={0.42} />
    </mesh>
  );
};
export const C08: React.FC = () => {
  const f = useCurrentFrame();
  const grow = interpolate(f, [0, 66], [0.25, 2.3], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut});
  const tilt = interpolate(f, [0, 50, 90], [0.32, 0.25, -0.28], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const tiltWob = f > 90 ? Math.sin((f - 90) * 0.3) * 0.03 * Math.exp(-(f - 90) / 20) : 0;
  const beamT = tilt + tiltWob;
  // 右の皿（1円玉）の位置：吹き出し用
  const L = 7;
  const pileWorld: V3 = [Math.cos(beamT) * L, -1 + Math.sin(beamT) * L - 3.1 + grow * 1.9, 0];
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM8} />
        <ambientLight intensity={0.25} />
        <hemisphereLight args={['#9fc8ff', '#0a1030', 0.5]} />
        <directionalLight position={[6, 6, 10]} intensity={3} />
        <SpaceBackdrop />
        <Stars />
        <Balance tilt={beamT}>
          <group position={[0, 2.05, 0]}>
            <Earth radius={2.0} real detail={90} spin={-2.3 + f * 0.004} tilt={0.3} cloudOpacity={0.5} />
          </group>
          <CoinBall r={grow} />
        </Balance>
      </Stage>
      <Vignette strength={0.5} />
      <Flash at={90} dur={6} max={0.25} />
      <CalloutView {...project(CAM8, f, pileWorld)} {...CO('c08_earth', 'pile')} />
    </AbsoluteFill>
  );
};

// ---------- オチ：駄菓子屋 ----------
const CAM9: CamKey[] = [
  {f: 0, pos: [-1.4, 1.75, 2.6], look: [0.3, 1.0, -0.5], fov: 48},
  {f: 88, pos: [-1.2, 1.7, 2.3], look: [0.0, 1.25, -0.8], fov: 46},
  {f: 172, pos: [-0.7, 1.45, 1.1], look: [0.05, 0.92, -0.25], fov: 42},
  {f: 240, pos: [-0.6, 1.4, 0.95], look: [0.05, 0.92, -0.25], fov: 40},
];
const SIGN_AT: V3 = [-0.15, 1.62, -0.72];
export const C09: React.FC = () => {
  const f = useCurrentFrame();
  const pour = interpolate(f, [20, 80], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const twenty = f >= 172;
  const counterTop: V3 = [0.0, 0.905, -0.25];
  const sign = f >= 90;
  const raise = interpolate(f, [90, 104], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut});
  // 店員：札を掲げる
  const clerkPose = sign ? pose({lSh: [2.0 * raise + 0.2, 0.15], rSh: [2.0 * raise + 0.2, -0.15], lEl: 1.0, rEl: 1.0, head: 0.05}) : pose({lSh: [0.6, 0.1], rSh: [0.6, 0.1], lEl: 1.4, rEl: 1.4, spine: 0.1});
  const me = twenty ? pose({spine: 0.35, head: 0.45, rSh: [1.1, 0.1], rEl: 1.3, lSh: [0.2, 0.15]}) : f < 84 ? pose({lSh: [1.3, 0.1], rSh: [1.3, 0.1], lEl: 0.6, rEl: 0.6, spine: 0.15}) : shockPose(f);
  return (
    <AbsoluteFill>
      <Stage bg="#2a2520">
        <CameraRig keys={CAM9} />
        <hemisphereLight args={['#fff1d9', '#6a4a30', 0.95]} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[2, 4, 3]} intensity={1.8} color="#ffe8c8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} />
        <pointLight position={[0, 2.6, 0]} intensity={8} color="#fff0d8" />
        <CandyShop />
        {/* 店員（年配） */}
        <Human position={[-0.15, 0, -1.25]} rotation={[0, 0, 0]} outfit={{shirt: '#6b8f71', pants: '#3d3a36', skin: '#e3b08e', hair: '#d9d9d9'}} p={clerkPose} />
        {sign && <SignBoard position={[SIGN_AT[0], SIGN_AT[1] - (1 - raise) * 0.5, SIGN_AT[2]]} scale={1.2} />}
        {/* 主人公と、後ろに山ほどの1円玉 */}
        <Human position={[0.95, 0, 0.45]} rotation={[0, Math.PI + 0.6, 0]} outfit={OUTFITS[1]} p={me} />
        <CoinHeap position={[2.6, 0, 2.2]} radius={2.0} height={1.5} seed={11} repeat={4} />
        {/* カウンターの上の1円玉 */}
        {!twenty && <CoinHeap position={counterTop} radius={0.28 * Math.max(0.05, pour)} height={0.12 * Math.max(0.05, pour)} seed={4} repeat={2} />}
        {twenty && (
          <>
            <CoinField n={20} seed={8} place={(i, r) => ({p: [counterTop[0] - 0.12 + (i % 5) * 0.025, counterTop[1] + COIN_T / 2 + Math.floor(i / 5) * COIN_T * 0 + (Math.floor(i / 5) * 0.0015), counterTop[2] + (Math.floor(i / 5) - 2) * 0.025], r: [0, r() * 6, 0]})} />
            {/* 20円の駄菓子 */}
            <mesh position={[0.2, 0.92, -0.12]} rotation={[Math.PI / 2, 0, 0.5]}>
              <cylinderGeometry args={[0.014, 0.014, 0.16, 12]} />
              <meshStandardMaterial color="#f1c40f" roughness={0.35} />
            </mesh>
          </>
        )}
        {f < 84 &&
          Array.from({length: 18}).map((_, i) => {
            const t = (f * 0.06 + i / 18) % 1;
            return <Coin key={i} position={[0.6 - t * 0.5, 1.25 - t * 0.33, 0.05 - t * 0.25]} rotation={[t * 8 + i, i, 0]} scale={1.3} />;
          })}
      </Stage>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

