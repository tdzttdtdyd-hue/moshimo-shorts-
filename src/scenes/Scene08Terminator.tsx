import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {House} from '../three/Props';
import {Forest, Grass, Mountains, Road, SkyDome, Terrain, TreeSpec} from '../three/Landscape';
import {Stars} from '../three/Earth';
import {Human, OUTFITS, walkPose, wavePose} from '../three/Human';
import {CameraRig} from '../lib/CameraRig';
import {mulberry32} from '../lib/rand';
import {C} from '../theme';
import {Vignette} from '../components/Overlay';

const hot = new THREE.Color('#e8a055');
const hot2 = new THREE.Color('#c97a3f');
const green = new THREE.Color('#6fb850');
const green2 = new THREE.Color('#4a9440');
const ice = new THREE.Color('#2f3f74');
const ice2 = new THREE.Color('#4a5f9a');
const groundColor = (x: number, _z: number, n: number) => {
  const g = green.clone().lerp(green2, Math.max(0, -n * 2));
  if (x < -5) return g.lerp(hot.clone().lerp(hot2, Math.max(0, n * 2)), Math.min(1, (-x - 5) / 5));
  if (x > 5) return g.lerp(ice.clone().lerp(ice2, Math.max(0, n * 2)), Math.min(1, (x - 5) / 5));
  return g;
};

export const Scene08Terminator: React.FC = () => {
  const f = useCurrentFrame();
  const town = useMemo(() => {
    const r = mulberry32(88);
    const houses = [] as {x: number; z: number; w: string; roof: string; h: number}[];
    for (let z = -46; z <= 8; z += 2.3) for (const x of [-2.6, 2.6]) if (r() < 0.85) houses.push({x: x + (r() - 0.5) * 0.6, z: z + r() * 0.6, w: C.houseColors[Math.floor(r() * 5)], roof: C.roofColors[Math.floor(r() * 5)], h: r() < 0.3 ? 2 : 1});
    const trees: TreeSpec[] = Array.from({length: 40}).map(() => ({x: (r() < 0.5 ? -1 : 1) * (4.2 + r() * 1.8), z: -46 + r() * 52, s: 0.8 + r() * 0.5}));
    return {houses, trees};
  }, []);
  return (
    <AbsoluteFill>
      <Stage bg="#8fb7e8" fog={['#a9b9d8', 40, 120]}>
        <CameraRig
          keys={[
            {f: 0, pos: [0.8, 1.5, 7.5], look: [0, 1.3, 2], fov: 50},
            {f: 50, pos: [1.5, 6, 11], look: [0, 0.5, -2], fov: 50},
            {f: 120, pos: [0.5, 24, 16], look: [0, 0, -8], fov: 50},
          ]}
        />
        <SkyDome top="#7aa6e0" horizon="#ffe1b8" leftTint="#ff8a3a" rightTint="#0c1640" sunDir={[-0.95, 0.12, -0.2]} sunColor="#ffd08a" sunPower={10} />
        <group position={[60, 25, -50]}>
          <Stars count={400} radius={25} seed={3} />
        </group>
        <hemisphereLight args={['#ffe9cf', '#2a3a6a', 0.9]} />
        <directionalLight position={[-20, 6, 4]} intensity={2.9} color="#ffb27a" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-34} shadow-camera-right={34} shadow-camera-top={34} shadow-camera-bottom={-34} shadow-radius={4} />
        <pointLight position={[10, 6, -10]} intensity={60} color="#6f8cff" />
        <Mountains seed={31} radius={90} color="#b08060" height={14} snow={false} arc={[Math.PI * 0.8, Math.PI * 1.25]} />
        <Mountains seed={32} radius={90} color="#3a4a80" height={18} arc={[Math.PI * 1.75, Math.PI * 2.2]} />
        <Terrain size={[100, 100]} seg={120} amp={0.35} colorAt={groundColor} position={[0, 0, -15]} flatten={(x) => (Math.abs(x) < 6 ? 0.3 : 1)} />
        <Road length={60} position={[0, 0, -18]} rotationY={Math.PI / 2} />
        <mesh position={[0, 0.05, -18]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[11, 80]} />
          <meshBasicMaterial color={C.yellow} transparent opacity={0.05 + 0.1 * Math.min(1, f / 60)} depthWrite={false} />
        </mesh>
        <Grass count={1600} area={[-6, 6, -46, 3.5]} keep={(x) => Math.abs(x) > 2.2} />
        {town.houses.map((h, i) => (
          <House key={i} position={[h.x, 0, h.z]} rotation={[0, h.x > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} wall={h.w} roof={h.roof} h={h.h} lit={h.x > 0} />
        ))}
        <Forest trees={town.trees} seed={18} />
        {[-0.8, 0.3, 1.2].map((x, i) => (
          <Human key={i} position={[x, 0, 3.2 - i * 0.7]} rotation={[0, 0.2 - i * 0.2, 0]} scale={0.95} outfit={OUTFITS[(i + 2) % 6]} p={wavePose(f + i * 9, i !== 1)} />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <Human key={`w${i}`} position={[i % 2 ? 0.7 : -0.7, 0, -4 - i * 5 + ((f * 0.03) % 1)]} rotation={[0, i % 2 ? 0 : Math.PI, 0]} scale={0.95} outfit={OUTFITS[i]} p={walkPose(f * 0.3 + i, 0.8)} />
        ))}
      </Stage>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};
