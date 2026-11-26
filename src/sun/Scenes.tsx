import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {V3, easeIO, easeOut} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {project} from '../lib/project';
import {Human, OUTFITS, coldPose, walkPose} from '../three/Human';
import {Earth, SpaceBackdrop, Stars, Sun} from '../three/Earth';
import {Forest, Mountains, SkyDome, Terrain, TreeSpec} from '../three/Landscape';
import {House} from '../three/Props';
import {CalloutView, Vignette} from './Overlay';
import {SCENES} from './script';

const spec = (id: string) => SCENES.find((s) => s.id === id)!;
const CO = (id: string, key: string) => spec(id).callouts!.find((c) => c.key === key)!;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// 雪（または凍った空気）が降る
const Flakes: React.FC<{n?: number; area?: [number, number, number]; center?: V3; color?: string; speed?: number; size?: number; seed?: number}> = ({n = 220, area = [40, 16, 30], center = [0, 8, 0], color = '#ffffff', speed = 0.05, size = 0.06, seed = 1}) => {
  const f = useCurrentFrame();
  const flakes = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({length: n}).map(() => ({x: (r() - 0.5) * area[0], y: r() * area[1], z: (r() - 0.5) * area[2], s: size * (0.5 + r()), ph: r() * 6}));
  }, [n, area, seed, size]);
  return (
    <group position={center}>
      {flakes.map((p, i) => (
        <mesh key={i} position={[p.x + Math.sin(f * 0.04 + p.ph) * 0.6, ((((p.y - f * speed) % area[1]) + area[1]) % area[1]) - area[1] / 2, p.z]} scale={p.s}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
};

// 雪をかぶった住宅地（距離が離れるほど白く・暗く）
const snowGround = (k: number) => {
  const g = new THREE.Color('#6f9a58'), w = new THREE.Color('#eef3f8'), w2 = new THREE.Color('#d7e2ee');
  return (_x: number, _z: number, n: number) => g.clone().lerp(n > 0 ? w : w2, k);
};

// ---------- 1：今の太陽と地球 ----------
const CAM1: CamKey[] = [
  {f: 0, pos: [3, 1.5, 12], look: [-2, 0.3, 0], fov: 44},
  {f: 120, pos: [4.5, 1.2, 10], look: [1, 0.2, 0], fov: 44},
];
export const S1: React.FC = () => {
  const f = useCurrentFrame();
  const away = interpolate(f, [70, 120], [0, 1], {...clamp, easing: (x) => x * x});
  const sunPos: V3 = [-14 - away * 20, 2 + away * 2, -16 - away * 40];
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM1} />
        <ambientLight intensity={0.1} />
        <hemisphereLight args={['#9fc8ff', '#0a1030', 0.3]} />
        <directionalLight position={sunPos} intensity={3.4} color="#fff2d8" />
        <SpaceBackdrop />
        <Stars />
        <Sun position={sunPos} size={4.5} />
        <Earth radius={2.0} real detail={100} spin={-2.3 + f * 0.003} tilt={0.3} cloudOpacity={0.55} position={[3, -0.3, 0]} />
      </Stage>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

// ---------- 2：1.1倍、住宅地が雪景色 ----------
const CAM2: CamKey[] = [
  {f: 0, pos: [-6, 2.4, 12], look: [0, 1.8, 0], fov: 48},
  {f: 150, pos: [4, 2.2, 10.5], look: [0, 1.6, -2], fov: 48},
];
export const S2: React.FC = () => {
  const f = useCurrentFrame();
  const k = interpolate(f, [0, 70], [0.15, 0.9], clamp);
  const houses = useMemo(() => {
    const r = mulberry32(3);
    return Array.from({length: 10}).map((_, i) => ({x: -12 + (i % 5) * 6 + r(), z: i < 5 ? -4 : -11, c: ['#fff4e0', '#e7f5ff', '#ffe3e3'][i % 3], roof: ['#c0392b', '#2c6e9b', '#7a5233'][i % 3]}));
  }, []);
  const trees: TreeSpec[] = useMemo(() => Array.from({length: 14}).map((_, i) => ({x: -16 + i * 2.5, z: -16 - (i % 3), s: 1.1, type: i % 2 ? 'pine' : 'round'})), []);
  return (
    <AbsoluteFill>
      <Stage bg="#c9d6e2" fog={['#d5dfe8', 20, 90]}>
        <CameraRig keys={CAM2} />
        <SkyDome top="#9fb6cc" horizon="#e5ebf0" />
        <hemisphereLight args={['#eef3f8', '#9aa3ad', 1.0]} />
        <directionalLight position={[10, 14, 6]} intensity={1.4} color="#f2f4f6" castShadow shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
        <Terrain size={[120, 120]} seg={80} amp={0.2} colorAt={snowGround(k)} />
        <Mountains seed={3} radius={80} height={18} color="#c9d4e0" />
        {houses.map((h, i) => (
          <group key={i}>
            <House position={[h.x, 0, h.z]} wall={h.c} roof={h.roof} h={1} scale={1.4} />
            {/* 屋根の雪 */}
            <mesh position={[h.x, 1.4 * 1.32 + 0.1, h.z]} rotation={[0, Math.PI / 4, 0]} scale={[1, k, 1]}>
              <coneGeometry args={[1.42, 0.95, 4]} />
              <meshStandardMaterial color="#f4f7fb" roughness={1} />
            </mesh>
          </group>
        ))}
        <Forest trees={trees} seed={6} />
        <Human position={[0.5 + f * 0.01, 0, 3]} rotation={[0, Math.PI / 2, 0]} outfit={{shirt: '#2c3e50', pants: '#1d1f26', skin: '#e3b08e', hair: '#1c1714'}} p={coldPose(f)} />
        <Flakes n={240} area={[40, 14, 26]} center={[0, 7, 0]} speed={0.06} />
      </Stage>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};

// ---------- 3：1.5倍、海が凍りはじめる ----------
export const CAM3: CamKey[] = [
  {f: 0, pos: [8, 4, 10], look: [-2, 0, -12], fov: 50},
  {f: 150, pos: [5, 3.2, 7], look: [-3, 0, -16], fov: 50},
];
const SHORE = -2;
export const S3: React.FC = () => {
  const f = useCurrentFrame();
  const freeze = interpolate(f, [0, 130], [0.15, 0.95], clamp);
  const sea = useMemo(() => new THREE.PlaneGeometry(200, 120, 120, 70).rotateX(-Math.PI / 2).translate(0, 0, SHORE - 60), []);
  const geo = useMemo(() => {
    const g = sea.clone();
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const water = new THREE.Color('#2b4f6e'), ice = new THREE.Color('#dfeaf3'), crack = new THREE.Color('#9fb8cc');
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      // 岸から沖へ凍っていく（境目はぎざぎざ）
      const edge = SHORE - freeze * 90 + Math.sin(x * 0.2) * 4 + Math.sin(x * 0.07 + 1) * 6;
      const frozen = z > edge;
      const wave = frozen ? 0 : 0.15 * Math.sin(x * 0.5 + f * 0.15) * Math.cos(z * 0.4 - f * 0.1);
      p.setY(i, wave);
      c.copy(frozen ? ice : water);
      if (frozen && (Math.abs(Math.sin(x * 1.3 + z * 0.7)) < 0.04 || Math.abs(Math.sin(x * 0.4 - z * 1.1)) < 0.03)) c.copy(crack);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }, [sea, freeze, f]);
  return (
    <AbsoluteFill>
      <Stage bg="#b9c7d4" fog={['#c4d0dc', 30, 160]}>
        <CameraRig keys={CAM3} />
        <SkyDome top="#7f98b2" horizon="#d6dee6" />
        <hemisphereLight args={['#e6edf3', '#7f8a96', 1.0]} />
        <directionalLight position={[-20, 10, -30]} intensity={1.1} color="#f0e8dc" castShadow shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
        <mesh geometry={geo} receiveShadow>
          <meshPhysicalMaterial vertexColors roughness={0.25} clearcoat={0.6} flatShading />
        </mesh>
        <Terrain size={[200, 40]} seg={80} amp={0.25} position={[0, 0.05, SHORE + 20]} colorAt={snowGround(0.9)} />
        <Mountains seed={9} radius={140} height={26} color="#c4cfdb" arc={[Math.PI * 1.1, Math.PI * 1.9]} />
        <Human position={[-1 - f * 0.012, 0.02, SHORE - 6]} rotation={[0, -Math.PI / 2 - 0.4, 0]} outfit={OUTFITS[0]} p={walkPose(f * 0.25, 0.7)} />
        <Flakes n={120} area={[40, 14, 30]} center={[0, 7, -6]} speed={0.04} />
      </Stage>
      <Vignette strength={0.45} />
      <CalloutView {...project(CAM3, f, [-4, 0.1, SHORE - 60 * 0.6])} {...CO('s3_ice', 'sea')} />
    </AbsoluteFill>
  );
};

// ---------- 4：2倍、真っ白な雪玉 ----------
const CAM4: CamKey[] = [
  {f: 0, pos: [0, 1.0, 8.5], look: [0, 0, 0], fov: 44},
  {f: 150, pos: [-1.6, 1.4, 9.2], look: [0, 0, 0], fov: 44},
];
export const S4: React.FC = () => {
  const f = useCurrentFrame();
  const frost = interpolate(f, [0, 110], [0.35, 1], clamp);
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM4} />
        <ambientLight intensity={0.1} />
        <hemisphereLight args={['#9fc8ff', '#0a1030', 0.3]} />
        <directionalLight position={[-9, 2, 4]} intensity={2.4} color="#fff2d8" />
        <SpaceBackdrop />
        <Stars />
        <Sun position={[-90, 10, -60]} size={4} />
        <Earth radius={2.4} real detail={100} spin={-2.3 + f * 0.004} tilt={0.3} frost={frost} cloudOpacity={0.4} />
      </Stage>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

// ---------- 5〜7：凍った地上から見た空 ----------
const FrozenLand: React.FC<{skyTop: string; skyHor: string; sunDir: V3; sunSize: number; sunLight: number; stars: number; snowColor?: string; flakes?: number; flakeColor?: string; buried?: number}> = ({skyTop, skyHor, sunDir, sunSize, sunLight, stars, flakes = 0, flakeColor = '#eaf4ff', buried = 0}) => {
  const f = useCurrentFrame();
  const sd = new THREE.Vector3(...sunDir).normalize();
  return (
    <>
      <SkyDome top={skyTop} horizon={skyHor} sunDir={sunDir} sunColor="#fff6e0" sunPower={60} radius={400} />
      {stars > 0 && (
        <group rotation={[0, f * 0.0008, 0]}>
          <Stars count={1800} radius={300} seed={21} />
        </group>
      )}
      <mesh position={sd.clone().multiplyScalar(350).toArray()}>
        <sphereGeometry args={[sunSize, 24, 24]} />
        <meshBasicMaterial color="#fffaf0" fog={false} />
      </mesh>
      <mesh position={sd.clone().multiplyScalar(349).toArray()}>
        <sphereGeometry args={[sunSize * 3.5, 24, 24]} />
        <meshBasicMaterial color="#ffe7b0" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </mesh>
      <hemisphereLight args={['#a9bfd6', '#3a4656', 0.35 + sunLight * 0.5]} />
      <ambientLight intensity={0.08} />
      <directionalLight position={sd.clone().multiplyScalar(50).toArray()} intensity={sunLight * 2.2} color="#fff2dc" castShadow shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={25} shadow-camera-bottom={-25} />
      <Terrain size={[300, 300]} seg={90} amp={0.6} colorAt={(_x, _z, n) => new THREE.Color('#e9eff6').lerp(new THREE.Color('#c3d1e0'), Math.max(0, -n * 2))} />
      <Mountains seed={13} radius={150} height={30} color="#dbe4ee" />
      {/* 雪に埋もれた家 */}
      {[-6, 4, 12].map((x, i) => (
        <group key={i} position={[x, -buried * 1.6, -10 - i * 4]}>
          <House wall="#e7ebef" roof="#9aa6b2" h={1} scale={1.5} />
        </group>
      ))}
      {flakes > 0 && <Flakes n={flakes} area={[50, 18, 40]} center={[0, 8, -6]} speed={0.035} color={flakeColor} size={0.07} seed={31} />}
    </>
  );
};

export const CAM5: CamKey[] = [
  {f: 0, pos: [0, 1.7, 12], look: [0, 3, -20], fov: 52},
  {f: 180, pos: [2, 1.8, 10], look: [-8, 18, -40], fov: 52, ease: easeIO},
];
const SUN5: V3 = [-0.35, 0.45, -1];
export const S5: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage bg="#2a3a5a" fog={['#3b4a66', 40, 260]}>
        <CameraRig keys={CAM5} />
        <FrozenLand skyTop="#0f1a3a" skyHor="#5a6f8f" sunDir={SUN5} sunSize={interpolate(f, [0, 40], [3.2, 1.6], clamp)} sunLight={0.45} stars={0.3} buried={0.3} />
        <Human position={[1.5, 0.05, 4]} rotation={[0, Math.PI - 0.4, 0]} outfit={OUTFITS[2]} tint="#b5d3ee" p={coldPose(f)} />
      </Stage>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

export const CAM6: CamKey[] = [
  {f: 0, pos: [-3, 2.4, 10], look: [0, 4, -20], fov: 54},
  {f: 180, pos: [3, 2.0, 8], look: [2, 8, -30], fov: 54},
];
export const S6: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage bg="#0c1226" fog={['#141c33', 40, 300]}>
        <CameraRig keys={CAM6} />
        <FrozenLand skyTop="#04060f" skyHor="#1a2440" sunDir={[0.3, 0.3, -1]} sunSize={0.9} sunLight={0.18} stars={1} flakes={320} flakeColor="#cfe4ff" buried={0.7} />
      </Stage>
      <Vignette strength={0.55} />
      <CalloutView {...project(CAM6, f, [0.5, 3.5, -2])} {...CO('s6_air', 'snow')} />
    </AbsoluteFill>
  );
};

// ---------- 7：冥王星の距離。宇宙から見ると太陽はただの明るい星 ----------
export const CAM7: CamKey[] = [
  {f: 0, pos: [1.5, 0.8, 6.5], look: [-3, 0.6, -30], fov: 50},
  {f: 180, pos: [3.2, 1.2, 7.5], look: [-6, 1.2, -40], fov: 50},
];
const STAR7: V3 = [-30, 8, -120];
export const S7: React.FC = () => (
  <AbsoluteFill>
    <Stage bg="#03040c" shadows={false}>
      <CameraRig keys={CAM7} />
      <ambientLight intensity={0.05} />
      <hemisphereLight args={['#5a78d0', '#000010', 0.18]} />
      <directionalLight position={STAR7} intensity={0.6} color="#fff2d8" />
      <SpaceBackdrop />
      <Stars count={2400} />
      <mesh position={STAR7}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color="#fffbe8" />
      </mesh>
      <mesh position={STAR7}>
        <sphereGeometry args={[2.6, 16, 16]} />
        <meshBasicMaterial color="#ffe9b8" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <Earth radius={2.2} real detail={100} spin={-2.0} tilt={0.3} frost={1} clouds={false} position={[2.2, -1.5, -2]} />
    </Stage>
    <Vignette strength={0.55} />
    <StarCallout />
  </AbsoluteFill>
);
const StarCallout: React.FC = () => {
  const f = useCurrentFrame();
  return <CalloutView {...project(CAM7, f, STAR7)} {...CO('s7_pluto', 'star')} />;
};

// ---------- 8：問いかけ ----------
const CAM8: CamKey[] = [
  {f: 0, pos: [3.2, 1.2, 7.5], look: [-6, 1.2, -40], fov: 50},
  {f: 150, pos: [9, 4, 22], look: [-4, 0, -20], fov: 50, ease: easeOut},
];
export const S8: React.FC = () => (
  <AbsoluteFill>
    <Stage bg="#03040c" shadows={false}>
      <CameraRig keys={CAM8} />
      <ambientLight intensity={0.05} />
      <hemisphereLight args={['#5a78d0', '#000010', 0.18]} />
      <directionalLight position={STAR7} intensity={0.6} color="#fff2d8" />
      <SpaceBackdrop />
      <Stars count={2400} />
      <mesh position={STAR7}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color="#fffbe8" />
      </mesh>
      <mesh position={STAR7}>
        <sphereGeometry args={[2.6, 16, 16]} />
        <meshBasicMaterial color="#ffe9b8" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <Earth radius={2.2} real detail={100} spin={-2.0 + useCurrentFrame() * 0.003} tilt={0.3} frost={1} clouds={false} position={[2.2, -1.5, -2]} />
    </Stage>
    <Vignette strength={0.55} />
  </AbsoluteFill>
);

