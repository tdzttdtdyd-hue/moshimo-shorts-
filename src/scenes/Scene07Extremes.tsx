import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {Sun, Stars} from '../three/Earth';
import {Mountains, Rocks, SkyDome, Terrain} from '../three/Landscape';
import {Human, OUTFITS, coldPose, hotPose} from '../three/Human';
import {CameraRig} from '../lib/CameraRig';
import {easeIO} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {CalloutView, Flash, Vignette} from '../components/Overlay';
import {CamKey} from '../lib/CameraRig';
import {project} from '../lib/project';
import {CALLOUTS} from '../components/callouts';

const HOT_X = -9;
const COLD_X = 9;
const sand1 = new THREE.Color('#f0b56a'), sand2 = new THREE.Color('#d98f4a'), snow1 = new THREE.Color('#f2f7ff'), snow2 = new THREE.Color('#c9dcf2');
const ground = (x: number, _z: number, n: number) => {
  const t = Math.max(0, Math.min(1, (x + 2) / 4));
  const hot = sand1.clone().lerp(sand2, Math.max(0, n * 2 + 0.3));
  const cold = snow1.clone().lerp(snow2, Math.max(0, -n * 2 + 0.2));
  return hot.lerp(cold, t);
};

const Cactus: React.FC<{position: [number, number, number]; s?: number}> = ({position, s = 1}) => (
  <group position={position} scale={s}>
    <mesh position={[0, 0.9, 0]} castShadow>
      <capsuleGeometry args={[0.2, 1.4, 6, 12]} />
      <meshStandardMaterial color="#3e9a55" roughness={0.8} />
    </mesh>
    <mesh position={[0.32, 1.0, 0]} rotation={[0, 0, -1.2]} castShadow>
      <capsuleGeometry args={[0.12, 0.35, 6, 10]} />
      <meshStandardMaterial color="#3e9a55" roughness={0.8} />
    </mesh>
    <mesh position={[0.48, 1.3, 0]} castShadow>
      <capsuleGeometry args={[0.12, 0.4, 6, 10]} />
      <meshStandardMaterial color="#3e9a55" roughness={0.8} />
    </mesh>
  </group>
);

// オーロラ（夜側）
const Aurora: React.FC<{f: number}> = ({f}) => {
  const geo = useMemo(() => new THREE.PlaneGeometry(40, 8, 60, 1), []);
  const g = useMemo(() => {
    const gg = geo.clone();
    const p = gg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setZ(i, Math.sin(x * 0.25 + f * 0.05) * 3 + Math.sin(x * 0.6 - f * 0.03) * 1);
    }
    gg.computeVertexNormals();
    return gg;
  }, [geo, f]);
  return (
    <mesh geometry={g} position={[COLD_X + 6, 14, -30]}>
      <meshBasicMaterial color="#5dffb0" transparent opacity={0.28} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
    </mesh>
  );
};

const CAM: CamKey[] = [
  {f: 0, pos: [HOT_X - 2.4, 2.0, 6.4], look: [HOT_X, 1.1, 0], fov: 46},
  {f: 40, pos: [HOT_X + 0.6, 1.7, 5.4], look: [HOT_X, 1.1, 0], fov: 46},
  {f: 48, pos: [COLD_X - 1, 1.9, 5.8], look: [COLD_X, 1.1, 0], fov: 50, ease: easeIO},
  {f: 90, pos: [COLD_X + 2, 1.7, 5.2], look: [COLD_X, 1.2, 0], fov: 46},
];

export const Scene07Extremes: React.FC = () => {
  const f = useCurrentFrame();
  const r = useMemo(() => mulberry32(77), []);
  const snow = useMemo(() => Array.from({length: 140}).map(() => ({x: COLD_X - 8 + r() * 16, y: r() * 9, z: -6 + r() * 11, s: 0.03 + r() * 0.05})), [r]);
  const ices = useMemo(() => {
    const q = mulberry32(5);
    return Array.from({length: 16}).map(() => ({x: COLD_X - 9 + q() * 18, z: -9 + q() * 6, s: 0.6 + q() * 1.8, ry: q() * 3}));
  }, []);
  const rocks = useMemo(() => {
    const q = mulberry32(6);
    return Array.from({length: 12}).map(() => ({x: HOT_X - 8 + q() * 12, z: -8 + q() * 9, s: 0.4 + q() * 1.2}));
  }, []);
  const cold = f >= 46;
  return (
    <AbsoluteFill>
      <Stage bg="#ffb070" fog={[cold ? '#9fb6d6' : '#ffc387', 16, 60]}>
        <CameraRig
          keys={CAM}
          shakes={[{from: 44, dur: 10, amp: 0.2}]}
        />
        <SkyDome top="#ff8a3d" horizon="#ffe0b0" leftTint="#ff9a4a" rightTint="#16224d" sunDir={[-0.6, 0.35, -0.7]} sunColor="#fff0c0" />
        {cold && (
          <group position={[COLD_X, 0, 0]}>
            <Stars count={500} radius={60} seed={17} />
          </group>
        )}
        <Aurora f={f} />
        <hemisphereLight args={['#ffffff', '#806040', 0.8]} />
        <directionalLight position={[-14, 10, 6]} intensity={2.8} color="#ffcf90" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-radius={4} />
        <pointLight position={[COLD_X + 2, 6, 5]} intensity={40} color="#a8ccff" />
        <Sun position={[HOT_X - 30, 22, -60]} size={5} />
        <Mountains seed={21} radius={60} color="#c98656" height={10} snow={false} arc={[Math.PI * 1.05, Math.PI * 1.45]} />
        <Mountains seed={22} radius={60} color="#cfe0f5" height={16} arc={[Math.PI * 1.55, Math.PI * 1.95]} />
        <Terrain size={[80, 50]} seg={110} amp={0.55} colorAt={ground} />
        {/* 灼熱側 */}
        <Rocks items={rocks} color="#b9764a" />
        <Cactus position={[HOT_X - 3, 0, -2]} />
        <Cactus position={[HOT_X + 2.6, 0, -3.5]} s={1.3} />
        <Human position={[HOT_X, 0, 0]} rotation={[0, 0.3, Math.sin(f * 0.9) * 0.015]} scale={1.05} outfit={OUTFITS[3]} p={hotPose(f)} />
        {[0, 1, 2, 3].map((i) => {
          const t = (f * 0.035 + i / 4) % 1;
          return (
            <mesh key={i} position={[HOT_X + 0.12 - t * 0.25 + i * 0.05, 1.75 - t * 1.4, 0.2]} scale={[0.025, 0.04, 0.025]}>
              <sphereGeometry args={[1, 10, 10]} />
              <meshPhysicalMaterial color="#bfe6ff" transparent opacity={1 - t} roughness={0.05} clearcoat={1} />
            </mesh>
          );
        })}
        {/* 陽炎 */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[HOT_X, 0.6 + i * 0.9 + ((f * 0.04) % 0.9), -1]} rotation={[0, 0, Math.sin(f * 0.2 + i) * 0.1]}>
            <planeGeometry args={[8, 0.05]} />
            <meshBasicMaterial color="#fff2c0" transparent opacity={0.18} />
          </mesh>
        ))}
        {/* 極寒側 */}
        {ices.map((c, i) => (
          <mesh key={i} position={[c.x, c.s * 0.45, c.z]} rotation={[0, c.ry, 0]} scale={c.s} castShadow>
            <icosahedronGeometry args={[0.8, 0]} />
            <meshPhysicalMaterial color="#d9efff" flatShading roughness={0.15} clearcoat={1} transmission={0.2} thickness={1} />
          </mesh>
        ))}
        <Human position={[COLD_X, 0.05, 0]} rotation={[0, -0.3, 0]} scale={1.05} outfit={OUTFITS[2]} tint="#a9cff2" p={coldPose(f)} />
        <mesh position={[COLD_X, 0.95, 0]} rotation={[0, -0.3, 0]}>
          <boxGeometry args={[1.1, 2.0, 0.9]} />
          <meshPhysicalMaterial color="#cbeaff" transparent opacity={0.35} roughness={0.05} clearcoat={1} flatShading />
        </mesh>
        {snow.map((s, i) => (
          <mesh key={i} position={[s.x + Math.sin(f * 0.05 + i) * 0.3, (((s.y - f * 0.06) % 9) + 9) % 9, s.z]} scale={s.s}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
      </Stage>
      <Vignette strength={0.45} />
      <CalloutView {...project(CAM, f, [HOT_X - 0.25, 1.5, 0])} {...CALLOUTS.hot} from={8} to={42} dy={-160} />
      <CalloutView {...project(CAM, f, [COLD_X + 0.3, 1.5, 0])} {...CALLOUTS.cold} from={52} to={88} dy={-160} />
      <Flash at={45} dur={6} max={0.4} />
    </AbsoluteFill>
  );
};
