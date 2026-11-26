import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Lights, Stage} from '../three/Stage';
import {Building, Ground, Tree, WindStreaks} from '../three/Props';
import {Character} from '../three/Character';
import {CameraRig} from '../lib/CameraRig';
import {mulberry32} from '../lib/rand';
import {C} from '../theme';
import {Flash, Vignette} from '../components/Overlay';

const wallX = (f: number) => -30 + Math.max(0, f - 4) * 0.9;
const HIT = 37; // 砂嵐の壁が主人公に届くフレーム

const Torii: React.FC<{position: [number, number, number]}> = ({position}) => (
  <group position={position}>
    {[-1.1, 1.1].map((x) => (
      <mesh key={x} position={[x, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.16, 2.6, 8]} />
        <meshStandardMaterial color="#e8432e" flatShading />
      </mesh>
    ))}
    <mesh position={[0, 2.7, 0]} castShadow>
      <boxGeometry args={[3.3, 0.22, 0.3]} />
      <meshStandardMaterial color="#2b2b38" flatShading />
    </mesh>
    <mesh position={[0, 2.3, 0]}>
      <boxGeometry args={[2.7, 0.16, 0.22]} />
      <meshStandardMaterial color="#e8432e" flatShading />
    </mesh>
  </group>
);

export const Scene03Japan: React.FC = () => {
  const f = useCurrentFrame();
  const city = useMemo(() => {
    const r = mulberry32(21);
    const b = [] as {x: number; z: number; h: number; w: number; c: string}[];
    for (let x = -26; x <= 26; x += 2.1) for (const z of [-7, -10, -13]) if (r() < 0.8) b.push({x: x + r() * 0.5, z: z - r(), h: 2 + r() * (z < -9 ? 9 : 4), w: 1.3 + r() * 0.6, c: ['#f8f9fa', '#dee2e6', '#ffe8cc', '#d0ebff', '#e5dbff', '#fff3bf'][Math.floor(r() * 6)]});
    const trees = [] as {x: number; z: number; s: number}[];
    for (let x = -24; x <= 24; x += 3) trees.push({x: x + r(), z: -3.5 - r(), s: 0.8 + r() * 0.4});
    const debris = Array.from({length: 40}).map(() => ({y: r() * 6, z: -6 + r() * 9, s: 0.1 + r() * 0.2, c: r()}));
    return {b, trees, debris};
  }, []);
  const wx = wallX(f);
  const hitK = Math.min(1, Math.max(0, (f - HIT) / 8));
  return (
    <AbsoluteFill>
      <Stage bg={wx > 2 ? '#e0c49a' : '#9fd8ff'} fog={[wx > 2 ? '#d9b98a' : '#bfe6ff', 12, wx > 2 ? 30 : 60]}>
        {/* ドリーズーム：被写体の大きさを保ったまま背景が迫る */}
        <CameraRig
          keys={[
            {f: 0, pos: [0.5, 2.6, 17], look: [0, 2.6, 0], fov: 22},
            {f: HIT, pos: [0.4, 2.2, 6.2], look: [0, 2.2, 0], fov: 56},
            {f: 105, pos: [-1.2, 1.6, 5.2], look: [0.4, 2.3, 0], fov: 60},
          ]}
          shakes={[{from: HIT, dur: 30, amp: 0.3}]}
        />
        <Lights sun={[-8, 14, 8]} shadowSize={16} />
        <Ground size={[80, 50]} seg={50} color="#9ad77e" amp={0.12} />
        <mesh position={[0, 0.02, -1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[80, 2.4]} />
          <meshStandardMaterial color={C.road} />
        </mesh>
        {city.b.map((b, i) => (
          <Building key={i} position={[b.x, 0, b.z]} h={b.h} w={b.w} color={b.c} />
        ))}
        <Torii position={[-5, 0, -2.2]} />
        {city.trees.map((t, i) => {
          const hit = t.x < wx;
          return <Tree key={i} position={[t.x, 0, t.z]} scale={t.s} color={i % 3 === 0 ? '#ffb3c8' : '#4cc46a'} bend={hit ? 1.0 + Math.sin(f * 1.1 + i) * 0.12 : 0} />;
        })}
        {/* 街灯につかまる主人公（体が旗のようになびく） */}
        <mesh position={[0.6, 1.4, 0.3]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 2.8, 8]} />
          <meshStandardMaterial color="#495057" />
        </mesh>
        <mesh position={[0.6, 2.85, 0.3]}>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshStandardMaterial color="#fff3bf" emissive="#ffe066" emissiveIntensity={0.6} />
        </mesh>
        <group position={[0.6, 2.25, 0.3]} rotation={[0, 0, -Math.PI / 2 * hitK + Math.sin(f * 1.4) * 0.08 * hitK]}>
          <Character position={[0, -1.55 + hitK * 0.1, 0.05]} rotation={[0, hitK * 0.5, 0]} scale={0.8} color={C.bodyColors[3]} expr={f < HIT - 6 ? 'happy' : 'scared'} armL={f < HIT - 6 ? 0.3 : 2.9} armR={f < HIT - 6 ? 0.3 : 2.9} walk={f * 0.9} walkAmp={0.5 * hitK} />
        </group>
        {/* 迫る砂嵐の壁 */}
        <group position={[wx, 0, 0]}>
          <mesh position={[-6, 6, -2]}>
            <boxGeometry args={[12, 14, 30]} />
            <meshStandardMaterial color="#c9a36b" transparent opacity={0.75} flatShading />
          </mesh>
          {Array.from({length: 18}).map((_, i) => (
            <mesh key={i} position={[0.2 + Math.sin(i * 3.1 + f * 0.4) * 0.6, (i % 6) * 2 + 0.6, -12 + Math.floor(i / 6) * 8 + Math.cos(i) * 2]} scale={1.3 + (i % 3) * 0.5}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#d8b47e" flatShading transparent opacity={0.85} />
            </mesh>
          ))}
        </group>
        {/* 舞い上がるがれき */}
        {city.debris.map((d, i) => {
          const x = wx - 2 + ((i * 3.7 + f * 0.8) % 14);
          if (wx < -14) return null;
          return (
            <mesh key={i} position={[x, d.y + Math.sin(f * 0.2 + i) * 0.4, d.z]} rotation={[f * 0.2 + i, f * 0.3, 0]} scale={d.s}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={d.c > 0.5 ? '#8d6e63' : '#adb5bd'} flatShading />
            </mesh>
          );
        })}
        {f > HIT - 10 && <WindStreaks frame={f} count={60} speed={2.4} area={[30, 6, 8]} center={[0, 2.5, 0]} />}
      </Stage>
      <Vignette strength={0.4} />
      <Flash at={HIT} dur={7} max={0.55} color="#fff1d6" />
    </AbsoluteFill>
  );
};
