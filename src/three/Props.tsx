import React, {useMemo} from 'react';
import * as THREE from 'three';
import {V3} from '../lib/anim';

const Flat: React.FC<{color: string; emissive?: string; ei?: number}> = ({color, emissive, ei = 0}) => (
  <meshStandardMaterial color={color} flatShading roughness={0.85} emissive={emissive ?? '#000'} emissiveIntensity={ei} />
);

const gableGeo = (() => {
  let g: THREE.BufferGeometry | null = null;
  return () => {
    if (g) return g;
    const sh = new THREE.Shape();
    sh.moveTo(-0.78, 0);
    sh.lineTo(0.78, 0);
    sh.lineTo(0, 0.62);
    sh.lineTo(-0.78, 0);
    g = new THREE.ExtrudeGeometry(sh, {depth: 1.5, bevelEnabled: false}).translate(0, 0, -0.75);
    return g;
  };
})();

const Win: React.FC<{position: V3; rotY?: number; lit?: boolean}> = ({position, rotY = 0, lit}) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <mesh>
      <boxGeometry args={[0.3, 0.3, 0.03]} />
      <meshStandardMaterial color="#ffffff" roughness={0.7} />
    </mesh>
    <mesh position={[0, 0, 0.012]}>
      <boxGeometry args={[0.24, 0.24, 0.02]} />
      <meshStandardMaterial color={lit ? '#ffe2a0' : '#7fb2d6'} emissive={lit ? '#ffcf6b' : '#000'} emissiveIntensity={lit ? 1.2 : 0} roughness={0.15} metalness={0.2} />
    </mesh>
  </group>
);

// 切妻屋根・煙突・窓枠・玄関のある家（h>1.5 で2階建て）
export const House: React.FC<{position?: V3; rotation?: V3; scale?: number; wall: string; roof: string; h?: number; lit?: boolean}> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  wall,
  roof,
  h = 1,
  lit = false,
}) => {
  const floors = h > 1.5 ? 2 : 1;
  const H = floors === 2 ? 1.75 : 1.05;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[1.42, 0.12, 1.42]} />
        <meshStandardMaterial color="#9a9590" roughness={1} />
      </mesh>
      <mesh position={[0, H / 2 + 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.3, H, 1.3]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      <mesh geometry={gableGeo()} position={[0, H + 0.1, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={roof} roughness={0.75} flatShading />
      </mesh>
      <mesh position={[0.35, H + 0.55, -0.3]} castShadow>
        <boxGeometry args={[0.16, 0.5, 0.16]} />
        <meshStandardMaterial color="#8a6a58" roughness={1} />
      </mesh>
      {/* 玄関 */}
      <mesh position={[-0.28, 0.42, 0.655]}>
        <boxGeometry args={[0.3, 0.6, 0.03]} />
        <meshStandardMaterial color="#7a4e34" roughness={0.8} />
      </mesh>
      <mesh position={[-0.28, 0.14, 0.75]} receiveShadow>
        <boxGeometry args={[0.45, 0.06, 0.22]} />
        <meshStandardMaterial color="#bdb6ad" />
      </mesh>
      {Array.from({length: floors}).map((_, fl) => (
        <group key={fl}>
          <Win position={[0.3, 0.62 + fl * 0.72, 0.66]} lit={lit} />
          {fl === 1 && <Win position={[-0.28, 0.62 + fl * 0.72, 0.66]} lit={lit} />}
          <Win position={[0.66, 0.62 + fl * 0.72, 0.2]} rotY={Math.PI / 2} lit={lit} />
          <Win position={[-0.66, 0.62 + fl * 0.72, -0.2]} rotY={-Math.PI / 2} lit={lit} />
        </group>
      ))}
    </group>
  );
};

export const Car: React.FC<{position?: V3; rotation?: V3; color: string; scale?: number}> = ({position = [0, 0, 0], rotation = [0, 0, 0], color, scale = 1}) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 0.32, 0]} castShadow>
      <boxGeometry args={[1.3, 0.35, 0.7]} />
      <Flat color={color} />
    </mesh>
    <mesh position={[-0.08, 0.62, 0]} castShadow>
      <boxGeometry args={[0.7, 0.3, 0.62]} />
      <meshStandardMaterial color="#cdefff" flatShading roughness={0.3} />
    </mesh>
    {[
      [-0.42, 0.36],
      [0.42, 0.36],
      [-0.42, -0.36],
      [0.42, -0.36],
    ].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.15, z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.12, 10]} />
        <Flat color="#2b2b38" />
      </mesh>
    ))}
  </group>
);

// 横向きに流れる風の線
export const WindStreaks: React.FC<{frame: number; count?: number; speed?: number; area?: [number, number, number]; center?: V3; opacity?: number; seed?: number; len?: number}> = ({
  frame,
  count = 60,
  speed = 1.2,
  area = [40, 10, 20],
  center = [0, 3, 0],
  opacity = 0.7,
  seed = 1,
  len = 3,
}) => {
  const items = useMemo(() => {
    const out: {x: number; y: number; z: number; l: number; s: number}[] = [];
    let a = seed * 9301;
    const r = () => ((a = (a * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) out.push({x: r(), y: r(), z: r(), l: 0.4 + r() * 0.9, s: 0.7 + r() * 0.6});
    return out;
  }, [count, seed]);
  return (
    <group position={center}>
      {items.map((it, i) => {
        const x = ((((it.x * area[0] + frame * speed * it.s) % area[0]) + area[0]) % area[0]) - area[0] / 2;
        return (
          <mesh key={i} position={[x, (it.y - 0.5) * area[1], (it.z - 0.5) * area[2]]}>
            <boxGeometry args={[len * it.l, 0.04, 0.04]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={opacity} />
          </mesh>
        );
      })}
    </group>
  );
};
