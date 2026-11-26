import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Lights, Stage} from '../three/Stage';
import {WindStreaks} from '../three/Props';
import {Forest, Grass, Mountains, Road, SkyDome, Terrain, Tower, TreeSpec, grassColor} from '../three/Landscape';
import {Human, OUTFITS, flailPose, holdPose} from '../three/Human';
import {CameraRig} from '../lib/CameraRig';
import {mulberry32} from '../lib/rand';
import {Flash, Vignette} from '../components/Overlay';

const wallX = (f: number) => -30 + Math.max(0, f - 4) * 0.9;
const HIT = 37;
const ground = grassColor('#78b955', '#4f9440', '#a4d36e');

const Torii: React.FC<{position: [number, number, number]}> = ({position}) => (
  <group position={position}>
    {[-1.1, 1.1].map((x) => (
      <mesh key={x} position={[x, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.16, 2.6, 12]} />
        <meshStandardMaterial color="#e0432c" roughness={0.6} />
      </mesh>
    ))}
    <mesh position={[0, 2.72, 0]} castShadow>
      <boxGeometry args={[3.4, 0.2, 0.32]} />
      <meshStandardMaterial color="#2b2b30" roughness={0.6} />
    </mesh>
    <mesh position={[0, 2.32, 0]} castShadow>
      <boxGeometry args={[2.8, 0.14, 0.2]} />
      <meshStandardMaterial color="#e0432c" roughness={0.6} />
    </mesh>
  </group>
);

export const Scene03Japan: React.FC = () => {
  const f = useCurrentFrame();
  const city = useMemo(() => {
    const r = mulberry32(21);
    const b = [] as {x: number; z: number; h: number; w: number; d: number; c: string; seed: number}[];
    for (let x = -30; x <= 30; x += 2.3)
      for (const z of [-9, -12.5, -16, -20])
        if (r() < 0.82) b.push({x: x + r() * 0.6, z: z - r() * 1.2, h: 3 + r() * (z < -12 ? 12 : 5), w: 1.6 + r() * 0.7, d: 1.6 + r() * 0.6, c: ['#eef1f5', '#d9dee6', '#f1e6d6', '#cfe0ef', '#e3dcef', '#f3ecd0'][Math.floor(r() * 6)], seed: Math.floor(r() * 100)});
    const trees: TreeSpec[] = [];
    for (let x = -26; x <= 26; x += 2.6) trees.push({x: x + r(), z: -6.2 - r() * 0.8, s: 0.8 + r() * 0.4, type: r() < 0.45 ? 'sakura' : 'round'});
    const debris = Array.from({length: 46}).map(() => ({y: r() * 6, z: -6 + r() * 9, s: 0.08 + r() * 0.2, c: r()}));
    return {b, trees, debris};
  }, []);
  const wx = wallX(f);
  const hitK = Math.min(1, Math.max(0, (f - HIT) / 8));
  const dusty = Math.min(1, Math.max(0, (wx - 0) / 10));
  return (
    <AbsoluteFill>
      <Stage bg="#cfe6f7" fog={[dusty > 0 ? '#d7b98c' : '#d7ecfa', 10 + 30 * (1 - dusty), 40 + 60 * (1 - dusty)]}>
        <CameraRig
          keys={[
            {f: 0, pos: [0.5, 2.6, 17], look: [0, 2.6, 0], fov: 22},
            {f: HIT, pos: [0.4, 2.2, 6.2], look: [0, 2.2, 0], fov: 56},
            {f: 105, pos: [-1.2, 1.6, 5.2], look: [0.4, 2.3, 0], fov: 60},
          ]}
          shakes={[{from: HIT, dur: 30, amp: 0.3}]}
        />
        <SkyDome top="#3c86d6" horizon="#e2f1fb" sunDir={[-0.5, 0.45, -0.7]} />
        <Lights sun={[-8, 14, 8]} shadowSize={18} />
        <Mountains seed={8} radius={80} color="#8aa3be" height={22} arc={[Math.PI * 1.1, Math.PI * 1.9]} />
        <Terrain size={[120, 70]} seg={90} amp={0.2} colorAt={ground} flatten={(_x, z) => (z > -24 ? 0.2 : 1)} />
        <Road length={120} position={[0, 0, -2.6]} />
        <Grass count={900} area={[-30, 30, -0.2, 2.6]} sway={hitK * 0.8} />
        {city.b.map((b, i) => (
          <Tower key={i} position={[b.x, 0, b.z]} h={b.h} w={b.w} d={b.d} color={b.c} seed={b.seed} />
        ))}
        <Torii position={[-5.5, 0, -6.6]} />
        <Forest trees={city.trees} seed={9} bend={(t, i) => (t.x < wx ? 0.9 + Math.sin(f * 1.1 + i) * 0.1 : Math.sin(f * 0.1 + i) * 0.03)} />
        {/* 街灯につかまる人 */}
        <mesh position={[0.6, 1.5, 0.3]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 3, 10]} />
          <meshStandardMaterial color="#3d434d" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0.6, 3.05, 0.3]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color="#fff6d8" emissive="#ffe8a8" emissiveIntensity={0.5} />
        </mesh>
        <group position={[0.6, 2.45, 0.3]} rotation={[0, 0, (-Math.PI / 2) * hitK + Math.sin(f * 1.4) * 0.08 * hitK]}>
          <group position={[0, -2.05 * 0.95, 0.07]} rotation={[0, hitK * 0.4, 0]}>
            <Human scale={0.95} outfit={OUTFITS[5]} p={f < HIT - 6 ? holdPose(f, 0) : holdPose(f, 1)} />
          </group>
        </group>
        {f > HIT + 2 &&
          [0, 1].map((i) => {
            const t = f - HIT - 2 - i * 8;
            if (t < 0) return null;
            return <Human key={i} position={[-4 + t * 0.35 + i * 2, 1 + i + Math.sin(t * 0.2) * 0.4, -2 - i * 1.5]} rotation={[0.3, 1.2, -t * 0.15]} scale={0.9} outfit={OUTFITS[i + 1]} p={flailPose(t, i)} />;
          })}
        {/* 迫る砂嵐の壁 */}
        <group position={[wx, 0, 0]}>
          {Array.from({length: 26}).map((_, i) => {
            const y = (i % 5) * 2.2 + 1;
            const z = -14 + Math.floor(i / 5) * 5.5 + Math.cos(i) * 1.5;
            return (
              <mesh key={i} position={[-1.5 + Math.sin(i * 3.1 + f * 0.35) * 0.8 - (i % 3) * 1.6, y, z]} scale={[2.6 + (i % 3) * 0.8, 2.4 + (i % 4) * 0.5, 2.6]}>
                <sphereGeometry args={[1, 18, 14]} />
                <meshStandardMaterial color={i % 2 ? '#cfa877' : '#b88f5f'} roughness={1} transparent opacity={0.82} />
              </mesh>
            );
          })}
          <mesh position={[-9, 6, -3]}>
            <boxGeometry args={[14, 14, 34]} />
            <meshStandardMaterial color="#c19a69" transparent opacity={0.9} />
          </mesh>
        </group>
        {city.debris.map((d, i) => {
          const x = wx - 2 + ((i * 3.7 + f * 0.8) % 14);
          if (wx < -14) return null;
          return (
            <mesh key={i} position={[x, d.y + Math.sin(f * 0.2 + i) * 0.4, d.z]} rotation={[f * 0.2 + i, f * 0.3, 0]} scale={d.s} castShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={d.c > 0.6 ? '#8d6e63' : d.c > 0.3 ? '#adb5bd' : '#ffb3c8'} flatShading />
            </mesh>
          );
        })}
        {f > HIT - 10 && <WindStreaks frame={f} count={60} speed={2.4} area={[30, 6, 8]} center={[0, 2.5, 0]} opacity={0.55} />}
      </Stage>
      <Vignette strength={0.4} />
      <Flash at={HIT} dur={7} max={0.55} color="#fff1d6" />
    </AbsoluteFill>
  );
};
