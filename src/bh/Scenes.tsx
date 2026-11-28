import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey, sampleCam} from '../lib/CameraRig';
import {V3} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {project} from '../lib/project';
import {Lens} from '../three/Lens';
import {Earth, SpaceBackdrop, Stars} from '../three/Earth';
import {Human} from '../three/Human';
import {FarCity, NightCity, NightSky} from './City';
import {FUJI, MapGround, pullAmount, toKm} from './Map';
import {Abyss, Glow} from './Fx';
import {APPEAR, D, START, VANISH_IN_S6, realTime, reachM} from './script';
import {CalloutView, Vignette} from './Overlay';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const LIN = (t: number) => t;
const sm = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};
const dist3 = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// ---------- 街の場面（1〜3）：単位は m。交差点のまん中、高さ 1.6m に現れる ----------
const BH: V3 = [0, 1.6, 0];
const StreetLights: React.FC = () => (
  <>
    <NightSky />
    <hemisphereLight args={['#4a5a8a', '#1a1a22', 0.7]} />
    <ambientLight intensity={0.18} />
    <directionalLight position={[30, 60, 20]} intensity={0.35} color="#9db0e0" />
  </>
);
// 見え方：ブラックホールに近いほど、影も ゆがみも大きく見える（実際より大きめに描く）
const lensBy = (cam: V3) => {
  const d = Math.max(0.6, dist3(cam, BH));
  return {shadow: Math.min(0.035, 0.05 / d), einstein: Math.min(0.16, 0.38 / d)};
};

// 1. 夜の交差点 → まん中に黒い点が現れる（現れた瞬間から、時間は100万倍スロー＝ほぼ止まる）
const CAM_1: CamKey[] = [
  {f: 0, pos: [3.5, 2.4, 46], look: [0, 3.2, 0], fov: 52},
  {f: APPEAR, pos: [2.2, 2.1, 26], look: [0, 2.2, 0], fov: 52, ease: LIN},
  {f: D.s1, pos: [1.6, 1.95, 19], look: [0, 1.8, 0], fov: 50, ease: LIN},
];
export const B1: React.FC = () => {
  const f = useCurrentFrame();
  const live = Math.min(f, APPEAR); // 現れたあとは、時間が止まって見える
  const cam = sampleCam(CAM_1, f).pos as V3;
  const L = lensBy(cam);
  const on = f >= APPEAR;
  const pop = interpolate(f, [APPEAR, APPEAR + 2, APPEAR + 14], [0, 0.55, 0], clamp);
  return (
    <AbsoluteFill>
      <Stage bg="#04060f" shadows={false}>
        <CameraRig keys={CAM_1} />
        <StreetLights />
        <NightCity f={live} bh={BH} />
        <Lens visible={on} target={BH} shadow={L.shadow * sm((f - APPEAR) / 8)} einstein={L.einstein * sm((f - APPEAR) / 10)} streak={0.08} glow={1.2} flash={pop} />
      </Stage>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

// 2. 近づいて見る：大きさは1円玉、まわりの景色がぐにゃっと曲がる
const CAM_2: CamKey[] = [
  {f: 0, pos: [1.6, 1.95, 19], look: [0, 1.8, 0], fov: 50},
  {f: 150, pos: [0.9, 1.75, 3.2], look: [0, 1.62, 0], fov: 46},
  {f: D.s2, pos: [-1.6, 1.9, 2.6], look: [0, 1.62, 0], fov: 46, ease: LIN},
];
export const B2: React.FC = () => {
  const f = useCurrentFrame();
  const cam = sampleCam(CAM_2, f).pos as V3;
  const L = lensBy(cam);
  return (
    <AbsoluteFill>
      <Stage bg="#04060f" shadows={false}>
        <CameraRig keys={CAM_2} />
        <StreetLights />
        <NightCity f={APPEAR} bh={BH} />
        <Lens target={BH} shadow={L.shadow} einstein={L.einstein} streak={0.1} glow={1.3} />
      </Stage>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

// 3. スパゲッティ化：近い物から順に、細長く伸びて吸い込まれる（自由落下の時間で計算）
// カメラは、吸い込まれる範囲（半径）の2倍以上はなれた所から見る
const CAM_3: CamKey[] = [
  {f: 0, pos: [-1.6, 1.9, 2.6], look: [0, 1.62, 0], fov: 46},
  // 大通り（x ≒ 0）の上を、後ろへ下がりながら上がっていく
  {f: 120, pos: [-2, 5, 17], look: [0, 1.6, 0], fov: 50, ease: LIN},
  {f: 180, pos: [-3, 24, 62], look: [0, 1, 0], fov: 52, ease: LIN},
  {f: D.s3, pos: [-5, 95, 210], look: [0, 0, 0], fov: 52, ease: LIN},
];
export const B3: React.FC = () => {
  const f = useCurrentFrame();
  const t = realTime(START.s3 + f);
  const cam = sampleCam(CAM_3, f).pos as V3;
  const L = lensBy(cam);
  const R = reachM(t);
  return (
    <AbsoluteFill>
      <Stage bg="#04060f" shadows={false}>
        <CameraRig keys={CAM_3} />
        <StreetLights />
        <NightCity f={APPEAR} bh={BH} pullAt={(p) => pullAmount(dist3(p, BH), t)} funnel={Math.min(1, R / 140)} funnelR={Math.max(8, R * 0.7)} />
        <FarCity bh={BH} pullAt={(p) => pullAmount(dist3(p, BH), t)} />
        <Lens target={BH} shadow={Math.max(0.005, L.shadow)} einstein={Math.max(0.04, L.einstein)} streak={0.1 + 0.2 * sm(f / 150)} glow={1.4} />
      </Stage>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

// ---------- 地図の場面（4・5） ----------
const KANTO = {lon0: 139.15, lon1: 140.25, lat0: 35.2, lat1: 36.1};
const JAPAN = {lon0: 128, lon1: 147, lat0: 30, lat1: 45.5};
const MapLights: React.FC = () => (
  <>
    <ambientLight intensity={0.9} />
    <directionalLight position={[10, 20, 10]} intensity={0.6} />
    <mesh>
      <sphereGeometry args={[480, 24, 12]} />
      <meshBasicMaterial color="#03050c" side={THREE.BackSide} />
    </mesh>
  </>
);
// 4. 関東を真上から：まわりから順に、地面が東京へ引き込まれていく（1単位 = 0.5km）
const U4 = 0.5;
const CAM_4: CamKey[] = [
  {f: 0, pos: [0.5, 26, 16], look: [0, 0, 0], fov: 50},
  {f: 140, pos: [1.5, 48, 32], look: [0, 0, 0], fov: 50},
  {f: D.s4, pos: [3, 100, 70], look: [0, 0, -2], fov: 50, ease: LIN},
];
export const B4: React.FC = () => {
  const f = useCurrentFrame();
  const t = realTime(START.s4 + f);
  const R = reachM(t) / 1000 / U4;
  return (
    <AbsoluteFill>
      <Stage bg="#03050c" shadows={false}>
        <CameraRig keys={CAM_4} />
        <MapLights />
        <MapGround b={KANTO} unitKm={U4} t={t} seg={260} texSize={4096} night={0.62} />
        <Abyss bh={[0, 0, 0]} R={R} f={f} cracks={0.5 * sm(f / 200)} streaks={1} />
        <Lens target={[0, 0.05, 0]} shadow={0.004} einstein={0.025} streak={0.08 + 0.12 * sm(f / 200)} glow={0.6} />
      </Stage>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};

// 5. 日本列島：ひびが走り、富士山まで飲みこまれる（1単位 = 10km）
const U5 = 10;
const [FX, FZ] = toKm(FUJI.lon, FUJI.lat);
const FUJI_P: V3 = [FX / U5, 0.1, FZ / U5];
const CAM_5: CamKey[] = [
  {f: 0, pos: [2, 72, 66], look: [-4, 0, -6], fov: 50},
  {f: D.s5, pos: [-6, 118, 108], look: [-3, 0, -8], fov: 50, ease: LIN},
];
export const B5: React.FC = () => {
  const f = useCurrentFrame();
  const t = realTime(START.s5 + f);
  const R = reachM(t) / 1000 / U5;
  const pf = project(CAM_5, f, FUJI_P);
  return (
    <AbsoluteFill>
      <Stage bg="#03050c" shadows={false}>
        <CameraRig keys={CAM_5} shakes={[{from: 150, dur: 40, amp: 0.4}]} />
        <MapLights />
        <MapGround b={JAPAN} unitKm={U5} t={t} seg={300} texSize={4096} />
        <Abyss bh={[0, 0, 0]} R={R} f={f} cracks={0.4 + 0.8 * sm(f / 220)} streaks={1} seed={7} />
        <Lens target={[0, 0.05, 0]} shadow={0.004} einstein={0.022} streak={0.2} glow={0.6} />
      </Stage>
      <CalloutView x={pf.x} y={pf.y} tag="富士山" text="東京から 約94km" from={24} to={160} dx={-60} dy={-260} />
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};

// ---------- 宇宙の場面（6・7） ----------
const ER = 2.3;
const ll = (lon: number, lat: number) => {
  const a = (lon * Math.PI) / 180, b = (lat * Math.PI) / 180;
  return new THREE.Vector3(Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b));
};
const TK = ll(139.7, 35.66);
const TK_P = TK.clone().multiplyScalar(ER).toArray() as V3;
// 地表に貼る（地面の向き＝上）
const OnSurface: React.FC<{children: React.ReactNode; lift?: number}> = ({children, lift = 0.004}) => {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), TK);
  return (
    <group position={TK.clone().multiplyScalar(ER + lift).toArray() as V3} quaternion={q}>
      {children}
    </group>
  );
};
// 太陽：日本が夜になる向き（夕方の境目が日本の西にくる）
// 日本は夜：太陽は地球の裏側、少しだけ西寄り（夕方の境目が西の海に見える）
const SUN = TK.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -1.85).multiplyScalar(30).toArray() as V3;
const SpaceSet: React.FC = () => (
  <>
    <ambientLight intensity={0.06} />
    <hemisphereLight args={['#9fc8ff', '#0a1030', 0.15]} />
    <directionalLight position={SUN} intensity={2.6} color="#fff4e2" />
    <SpaceBackdrop />
    <Stars />
    <Earth radius={ER} real detail={120} spin={0} tilt={0} clouds={false} cityLights={SUN} />
  </>
);
const camToward = (dist: number, side: number, up: number): V3 => {
  const right = new THREE.Vector3(0, 1, 0).cross(TK).normalize();
  return TK.clone().multiplyScalar(dist).add(right.multiplyScalar(side)).add(new THREE.Vector3(0, up, 0)).toArray() as V3;
};
// 6. 宇宙から：関東に黒い穴 → 5秒で消えて、まぶしい光
const CAM_6: CamKey[] = [
  {f: 0, pos: camToward(6.5, 0.6, -0.3), look: [TK_P[0] * 0.55, TK_P[1] * 0.55, TK_P[2] * 0.55], fov: 40},
  {f: VANISH_IN_S6, pos: camToward(8.0, 0.0, 0.1), look: [TK_P[0] * 0.5, TK_P[1] * 0.5, TK_P[2] * 0.5], fov: 40, ease: LIN},
  {f: D.s6, pos: camToward(8.6, -0.4, 0.3), look: [TK_P[0] * 0.5, TK_P[1] * 0.5, TK_P[2] * 0.5], fov: 40, ease: LIN},
];
export const B6: React.FC = () => {
  const f = useCurrentFrame();
  const t = realTime(START.s6 + Math.min(f, VANISH_IN_S6));
  const gone = f >= VANISH_IN_S6;
  const R = ((reachM(t) / 1000) / 6371) * ER;
  const flash = interpolate(f, [VANISH_IN_S6, VANISH_IN_S6 + 3, VANISH_IN_S6 + 40], [0, 1, 0], clamp);
  const boom = Math.max(0, f - VANISH_IN_S6);
  return (
    <AbsoluteFill>
      <Stage bg="#03050c" shadows={false}>
        <CameraRig keys={CAM_6} shakes={[{from: VANISH_IN_S6, dur: 30, amp: 0.05}]} />
        <SpaceSet />
        {!gone && (
          <OnSurface>
            <Abyss bh={[0, 0, 0]} R={R} f={f} cracks={1} streaks={1} seed={11} />
          </OnSurface>
        )}
        {gone && (
          <>
            {/* 爆発の光と、地表を広がる衝撃波 */}
            <Glow p={TK.clone().multiplyScalar(ER + 0.02).toArray() as V3} size={0.3 + boom * 0.04} opacity={Math.max(0, 1 - boom / 70)} />
            <OnSurface lift={0.006}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.05 + boom * 0.006, 0.07 + boom * 0.0075, 96]} />
                <meshBasicMaterial color="#ffd8a0" transparent opacity={Math.max(0, 0.9 - boom / 60)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[R * 1.05, 64]} />
                <meshBasicMaterial color="#ff7a30" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
              </mesh>
            </OnSurface>
          </>
        )}
        <Lens visible={!gone || flash > 0} target={TK_P} shadow={gone ? 0 : 0.004} einstein={gone ? 0 : 0.03} streak={gone ? 0 : 0.1} glow={gone ? 0 : 0.8} flash={flash} />
      </Stage>
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};

const craterTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256);
    gr.addColorStop(0, 'rgba(255,255,240,1)');
    gr.addColorStop(0.25, 'rgba(255,220,150,1)');
    gr.addColorStop(0.5, 'rgba(240,120,50,0.95)');
    gr.addColorStop(0.66, 'rgba(120,30,10,0.9)');
    gr.addColorStop(0.72, 'rgba(255,140,60,0.6)');
    gr.addColorStop(1, 'rgba(80,10,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);
    // 溶岩のすじ
    const r = mulberry32(8);
    g.globalCompositeOperation = 'multiply';
    for (let k = 0; k < 60; k++) {
      const a = r() * Math.PI * 2, r0 = 30 + r() * 120;
      g.strokeStyle = `rgba(120,40,20,${0.3 + r() * 0.4})`;
      g.lineWidth = 2 + r() * 4;
      g.beginPath();
      g.arc(256, 256, r0, a, a + 0.4 + r() * 0.8);
      g.stroke();
    }
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();
// 7. その後：関東に赤く光る大きなくぼみ、立ちのぼる火柱、まわりへ飛び散る かけら
const DEBRIS = (() => {
  const r = mulberry32(21);
  return Array.from({length: 260}).map(() => ({a: r() * Math.PI * 2, v: 0.15 + r() * 0.5, up: 0.2 + r() * 0.6, s: 0.0025 + r() * 0.004, d: r() * 120, c: r() < 0.7 ? '#ffb070' : '#ffe8c0'}));
})();
const PLUME = (() => {
  const r = mulberry32(5);
  return Array.from({length: 46}).map(() => ({a: r() * Math.PI * 2, d: r() * 0.05, ph: r(), s: 0.04 + r() * 0.06}));
})();
const CAM_7: CamKey[] = [
  {f: 0, pos: camToward(5.0, -0.2, 0.1), look: [TK_P[0] * 0.75, TK_P[1] * 0.75, TK_P[2] * 0.75], fov: 40},
  {f: D.s7, pos: camToward(7.4, -0.9, 0.5), look: [TK_P[0] * 0.55, TK_P[1] * 0.55, TK_P[2] * 0.55], fov: 40, ease: LIN},
];
export const B7: React.FC = () => {
  const f = useCurrentFrame();
  const R = (200 / 6371) * ER;
  const cool = sm(f / 210);
  const hot = '#' + new THREE.Color('#ffffff').lerp(new THREE.Color('#ff8a5a'), cool).getHexString();
  return (
    <AbsoluteFill>
      <Stage bg="#03050c" shadows={false}>
        <CameraRig keys={CAM_7} />
        <SpaceSet />
        <OnSurface lift={0.02}>
          {/* 溶けた岩のくぼみ：中心ほど熱く白っぽく、ふちは暗い赤。時間とともに冷えて暗くなる */}
          <mesh rotation={[-Math.PI / 2, 0, f * 0.002]} renderOrder={20}>
            <planeGeometry args={[R * 3.2, R * 3.2]} />
            <meshBasicMaterial map={craterTex()} color={hot} transparent depthTest={false} depthWrite={false} toneMapped={false} />
          </mesh>
          {/* 火柱と煙：熱いうちは明るく、上へいくほど暗い煙に */}
          {PLUME.map((s, i) => {
            const ph = (s.ph + f * 0.005) % 1;
            const y = ph * 0.45;
            return (
              <mesh key={'pl' + i} position={[Math.cos(s.a) * s.d * (1 + ph), y, Math.sin(s.a) * s.d * (1 + ph)]} scale={s.s * (0.6 + ph * 2.4)}>
                <sphereGeometry args={[1, 12, 10]} />
                <meshBasicMaterial color={ph < 0.25 ? '#ffb060' : ph < 0.5 ? '#a8482a' : '#4a3a3a'} transparent opacity={(1 - ph) * 0.55} depthWrite={false} toneMapped={false} />
              </mesh>
            );
          })}
          {/* 飛び散る かけら：弧をえがいて、まわりへ落ちる */}
          {DEBRIS.map((d, i) => {
            const tt = ((f + d.d) % 120) / 120;
            const x = Math.cos(d.a) * d.v * tt, z = Math.sin(d.a) * d.v * tt;
            const y = d.up * tt - 0.9 * tt * tt * d.up;
            if (y < 0) return null;
            return (
              <mesh key={'d' + i} position={[x, y, z]} scale={d.s}>
                <sphereGeometry args={[1, 6, 4]} />
                <meshBasicMaterial color={d.c} transparent opacity={1 - tt * 0.6} toneMapped={false} />
              </mesh>
            );
          })}
        </OnSurface>
        <Glow p={TK.clone().multiplyScalar(ER + 0.04).toArray() as V3} size={0.45} opacity={0.6 - cool * 0.25} color="#ffb070" />
      </Stage>
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};

// 8. 地上から：赤い夜空と、降りそそぐ かけら（流れ星）
const METEORS = (() => {
  const r = mulberry32(31);
  return Array.from({length: 46}).map(() => ({x: (r() - 0.5) * 300, z: -80 - r() * 200, d: r() * 120, sp: 0.8 + r() * 0.8, len: 6 + r() * 14}));
})();
// 丘の上の人の、少し後ろ・下から（人と赤い空が両方入る）
const CAM_8: CamKey[] = [
  {f: 0, pos: [1.9, 1.45, 3.2], look: [-1, 8, -60], fov: 56},
  {f: D.s8, pos: [0.9, 1.4, 2.2], look: [-2.5, 10, -60], fov: 56, ease: LIN},
];
export const B8: React.FC = () => {
  const f = useCurrentFrame();
  const sky = useMemo(() => {
    const g = new THREE.SphereGeometry(450, 48, 24);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const top = new THREE.Color('#1a0608'), hz = new THREE.Color('#d8401a'), mid = new THREE.Color('#6a1410'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 450;
      const front = Math.max(0, -p.getZ(i) / 450);
      c.copy(hz).lerp(mid, Math.min(1, Math.max(0, y * 4))).lerp(top, Math.min(1, Math.max(0, (y - 0.25) * 2)));
      c.lerp(new THREE.Color('#2a0a0c'), (1 - front) * 0.5);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  }, []);
  return (
    <AbsoluteFill>
      <Stage bg="#1a0608" shadows={false}>
        <CameraRig keys={CAM_8} />
        <mesh geometry={sky}>
          <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} />
        </mesh>
        <hemisphereLight args={['#ff8a5a', '#1a0a0a', 0.6]} />
        <directionalLight position={[0, 10, -50]} intensity={0.8} color="#ff7a40" />
        {/* 遠くの山並み（シルエット） */}
        {Array.from({length: 11}).map((_, i) => (
          <mesh key={i} position={[(i - 5) * 60, -6, -230 - (i % 3) * 35]} scale={[1, 0.45 + (i % 4) * 0.12, 1]}>
            <sphereGeometry args={[70 + (i % 3) * 25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#14070a" roughness={1} />
          </mesh>
        ))}
        {/* 地平線の向こうの、赤く光る空 */}
        <Glow p={[0, 6, -300]} size={420} opacity={0.6} color="#ff6a30" />
        {/* 丘と、空を見上げる人 */}
        <mesh position={[0, -4, -2]} scale={[30, 5, 22]}>
          <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#1a0c0c" />
        </mesh>
        <Human outfit={{shirt: '#2a2024', pants: '#1a1418', skin: '#5a3a32', hair: '#111'}} position={[0, 0.97, -2]} rotation={[0, Math.PI, 0]} p={{spine: -0.05, twist: 0, head: -0.45, lSh: [0.05, 0.12], rSh: [0.05, 0.12], lEl: 0.2, rEl: 0.2, lHip: [0, 0.05], rHip: [0, 0.05], lKn: 0.02, rKn: 0.02}} />
        {/* 降りそそぐ かけら */}
        {METEORS.map((m, i) => {
          const tt = ((f * m.sp + m.d) % 120) / 120;
          const y = 160 - tt * 170;
          if (y < 4) return null;
          return (
            <group key={i} position={[m.x - tt * 30, y, m.z]} rotation={[0, 0, 0.35]}>
              <mesh position={[0, m.len / 2, 0]}>
                <boxGeometry args={[0.5, m.len, 0.5]} />
                <meshBasicMaterial color="#ffd0a0" transparent opacity={0.85 * Math.sin(tt * Math.PI)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
              </mesh>
              <Glow p={[0, 0, 0]} size={4} opacity={Math.sin(tt * Math.PI)} color="#ffe0b0" />
            </group>
          );
        })}
      </Stage>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};
