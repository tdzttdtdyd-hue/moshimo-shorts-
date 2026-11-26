import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {Ground} from '../three/Props';
import {Character} from '../three/Character';
import {SkyGradient} from '../three/SkyGradient';
import {Sun} from '../three/Earth';
import {CameraRig} from '../lib/CameraRig';
import {easeIO} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {C} from '../theme';
import {Flash, Vignette} from '../components/Overlay';

const HOT_X = -9;
const COLD_X = 9;
const ground = (x: number) => {
  const t = Math.max(0, Math.min(1, (x + 3) / 6));
  return new THREE.Color('#f5a25a').lerp(new THREE.Color('#e6f4ff'), t);
};

const Cactus: React.FC<{position: [number, number, number]; s?: number}> = ({position, s = 1}) => (
  <group position={position} scale={s}>
    <mesh position={[0, 0.8, 0]} castShadow>
      <capsuleGeometry args={[0.22, 1.2, 4, 8]} />
      <meshStandardMaterial color="#3fae5a" flatShading />
    </mesh>
    <mesh position={[0.35, 1.0, 0]} rotation={[0, 0, -0.9]} castShadow>
      <capsuleGeometry args={[0.13, 0.45, 4, 8]} />
      <meshStandardMaterial color="#3fae5a" flatShading />
    </mesh>
  </group>
);

export const Scene07Extremes: React.FC = () => {
  const f = useCurrentFrame();
  const snow = useMemo(() => {
    const r = mulberry32(77);
    return Array.from({length: 90}).map(() => ({x: COLD_X - 7 + r() * 14, y: r() * 9, z: -5 + r() * 9, s: 0.04 + r() * 0.05}));
  }, []);
  const ices = useMemo(() => {
    const r = mulberry32(5);
    return Array.from({length: 14}).map(() => ({x: COLD_X - 8 + r() * 16, z: -8 + r() * 6, s: 0.6 + r() * 1.6, ry: r() * 3}));
  }, []);
  // 灼熱の揺らぎ
  const shimmer = Math.sin(f * 0.9) * 0.03;
  return (
    <AbsoluteFill>
      <Stage bg="#ff9d4d" fog={[f < 46 ? '#ffb070' : '#bcd6f0', 14, 40]}>
        <CameraRig
          keys={[
            {f: 0, pos: [HOT_X - 2.2, 2.2, 6.2], look: [HOT_X, 1.2, 0], fov: 48},
            {f: 40, pos: [HOT_X + 0.6, 1.8, 5.2], look: [HOT_X, 1.2, 0], fov: 48},
            // ホイップパン
            {f: 48, pos: [COLD_X - 1, 2.0, 5.6], look: [COLD_X, 1.2, 0], fov: 52, ease: easeIO},
            {f: 90, pos: [COLD_X + 2, 1.8, 5.0], look: [COLD_X, 1.3, 0], fov: 48},
          ]}
          shakes={[{from: 44, dur: 10, amp: 0.2}]}
        />
        <SkyGradient left="#ff7a2e" mid="#ffc27a" right="#1b2a5c" />
        <hemisphereLight args={['#ffffff', '#806040', 0.9]} />
        <directionalLight position={[-14, 10, 6]} intensity={2.6} color="#ffd29a" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={14} shadow-camera-bottom={-14} />
        <pointLight position={[COLD_X, 6, 4]} intensity={30} color="#9cc8ff" />
        <Sun position={[HOT_X - 10, 9, -22]} size={3.5} />
        <Ground size={[60, 30]} seg={60} amp={0.35} colorFn={ground} />
        {/* 灼熱側 */}
        <Cactus position={[HOT_X - 3, 0, -2]} />
        <Cactus position={[HOT_X + 2.6, 0, -3.5]} s={1.3} />
        <Character position={[HOT_X, 0, 0]} rotation={[0, 0.3, shimmer]} scale={1.05} color={C.bodyColors[5]} expr="hot" squash={1 - Math.abs(Math.sin(f * 0.25)) * 0.05} armL={0.6 + Math.sin(f * 0.5) * 0.4} armR={1.9 + Math.sin(f * 0.8) * 0.5} />
        {[0, 1, 2].map((i) => {
          const t = (f * 0.03 + i / 3) % 1;
          return (
            <mesh key={i} position={[HOT_X + 0.45 - t * 0.4, 1.9 - t * 1.3, 0.35]} scale={[0.05, 0.08, 0.05]}>
              <sphereGeometry args={[1, 10, 10]} />
              <meshStandardMaterial color="#7cc8ff" transparent opacity={1 - t} />
            </mesh>
          );
        })}
        {/* 極寒側 */}
        {ices.map((c, i) => (
          <mesh key={i} position={[c.x, c.s * 0.5, c.z]} rotation={[0, c.ry, 0]} scale={c.s} castShadow>
            <icosahedronGeometry args={[0.8, 0]} />
            <meshStandardMaterial color="#d8efff" flatShading roughness={0.3} />
          </mesh>
        ))}
        <Character position={[COLD_X, 0.05, 0]} rotation={[0, -0.3, 0]} scale={1.05} color={C.bodyColors[1]} expr="frozen" armL={0.1} armR={0.1} />
        <mesh position={[COLD_X, 0.95, 0]} rotation={[0, -0.3, 0]}>
          <boxGeometry args={[1.5, 2.1, 1.3]} />
          <meshStandardMaterial color="#bfe6ff" transparent opacity={0.45} roughness={0.1} flatShading />
        </mesh>
        {snow.map((s, i) => (
          <mesh key={i} position={[s.x + Math.sin(f * 0.05 + i) * 0.3, (((s.y - f * 0.06) % 9) + 9) % 9, s.z]} scale={s.s}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
      </Stage>
      <Vignette strength={0.45} />
      <Flash at={45} dur={6} max={0.6} />
    </AbsoluteFill>
  );
};
