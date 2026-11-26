import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {Ground, House, Tree} from '../three/Props';
import {Character} from '../three/Character';
import {SkyGradient} from '../three/SkyGradient';
import {Stars} from '../three/Earth';
import {CameraRig} from '../lib/CameraRig';
import {mulberry32} from '../lib/rand';
import {C} from '../theme';
import {Vignette} from '../components/Overlay';

const hot = new THREE.Color('#f39a4c');
const green = new THREE.Color('#79d36b');
const ice = new THREE.Color('#3d4f86');
const groundColor = (x: number) => {
  if (x < -4) return hot.clone().lerp(green, Math.max(0, (x + 9) / 5));
  if (x > 4) return green.clone().lerp(ice, Math.min(1, (x - 4) / 5));
  return green.clone();
};

export const Scene08Terminator: React.FC = () => {
  const f = useCurrentFrame();
  const town = useMemo(() => {
    const r = mulberry32(88);
    const houses = [] as {x: number; z: number; w: string; roof: string}[];
    for (let z = -30; z <= 8; z += 2.4) for (const x of [-2.2, 2.2]) if (r() < 0.85) houses.push({x: x + (r() - 0.5) * 0.8, z: z + r(), w: C.houseColors[Math.floor(r() * 5)], roof: C.roofColors[Math.floor(r() * 5)]});
    const trees = Array.from({length: 18}).map(() => ({x: (r() < 0.5 ? -1 : 1) * (3.2 + r() * 1.2), z: -30 + r() * 38}));
    return {houses, trees};
  }, []);
  return (
    <AbsoluteFill>
      <Stage bg="#8fb7e8">
        <CameraRig
          keys={[
            {f: 0, pos: [0.8, 1.4, 7], look: [0, 1.3, 2], fov: 50},
            {f: 50, pos: [1.5, 6, 11], look: [0, 0.5, -2], fov: 50},
            {f: 120, pos: [0.5, 22, 15], look: [0, 0, -6], fov: 50},
          ]}
        />
        <SkyGradient left="#ff8c3a" mid="#ffd9a8" right="#0f1b45" />
        <group position={[60, 30, -40]}>
          <Stars count={300} radius={20} seed={3} />
        </group>
        <hemisphereLight args={['#ffe9cf', '#3a4a7a', 0.9]} />
        <directionalLight position={[-20, 6, 4]} intensity={2.8} color="#ffb27a" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} />
        <Ground size={[70, 70]} seg={70} amp={0.3} colorFn={groundColor} position={[0, 0, -10]} />
        {/* 昼と夜の境目の帯 */}
        <mesh position={[0, 0.06, -10]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[7.5, 70]} />
          <meshBasicMaterial color={C.yellow} transparent opacity={0.12 + 0.1 * Math.min(1, f / 60)} />
        </mesh>
        {town.houses.map((h, i) => (
          <House key={i} position={[h.x, 0, h.z]} rotation={[0, h.x > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} wall={h.w} roof={h.roof} />
        ))}
        {town.trees.map((t, i) => (
          <Tree key={i} position={[t.x, 0, t.z]} />
        ))}
        {[-0.9, 0.2, 1.1].map((x, i) => (
          <Character key={i} position={[x, 0, 3 - i * 0.6]} rotation={[0, 0.2 - i * 0.2, 0]} scale={0.7} color={C.bodyColors[i + 2]} expr="happy" armL={i === 1 ? 2.6 + Math.sin(f * 0.4) * 0.3 : 0.3} armR={2.4 + Math.sin(f * 0.4 + i) * 0.35} breathe={f / 30} />
        ))}
      </Stage>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};
