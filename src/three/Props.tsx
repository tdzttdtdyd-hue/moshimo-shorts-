import React, {useMemo} from 'react';
import * as THREE from 'three';
import {V3} from '../lib/anim';
import {fbm3} from '../lib/rand';

const Flat: React.FC<{color: string; emissive?: string; ei?: number}> = ({color, emissive, ei = 0}) => (
  <meshStandardMaterial color={color} flatShading roughness={0.85} emissive={emissive ?? '#000'} emissiveIntensity={ei} />
);

export const House: React.FC<{position?: V3; rotation?: V3; scale?: number; wall: string; roof: string; h?: number}> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  wall,
  roof,
  h = 1,
}) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.2, h, 1.2]} />
      <Flat color={wall} />
    </mesh>
    <mesh position={[0, h + 0.38, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
      <coneGeometry args={[1.05, 0.75, 4]} />
      <Flat color={roof} />
    </mesh>
    <mesh position={[0, 0.3, 0.605]}>
      <boxGeometry args={[0.3, 0.5, 0.02]} />
      <Flat color="#8a5a3c" />
    </mesh>
    {[-0.35, 0.35].map((x) => (
      <mesh key={x} position={[x, h * 0.62, 0.605]}>
        <boxGeometry args={[0.22, 0.22, 0.02]} />
        <meshStandardMaterial color="#9fe0ff" emissive="#9fe0ff" emissiveIntensity={0.2} />
      </mesh>
    ))}
  </group>
);

export const Building: React.FC<{position?: V3; w?: number; d?: number; h: number; color: string; rotation?: V3}> = ({
  position = [0, 0, 0],
  w = 1.4,
  d = 1.4,
  h,
  color,
  rotation = [0, 0, 0],
}) => {
  const rows = Math.max(1, Math.floor(h / 0.7));
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <Flat color={color} />
      </mesh>
      {Array.from({length: rows}).map((_, i) => (
        <mesh key={i} position={[0, 0.45 + i * 0.7, d / 2 + 0.01]}>
          <boxGeometry args={[w * 0.75, 0.22, 0.02]} />
          <meshStandardMaterial color="#bfe9ff" emissive="#bfe9ff" emissiveIntensity={0.15} />
        </mesh>
      ))}
    </group>
  );
};

export const Tree: React.FC<{position?: V3; rotation?: V3; scale?: number; color?: string; bend?: number}> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = '#4cc46a',
  bend = 0,
}) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 0.35, 0]} castShadow>
      <cylinderGeometry args={[0.08, 0.12, 0.7, 6]} />
      <Flat color="#8d5a3b" />
    </mesh>
    <group position={[0, 0.7, 0]} rotation={[0, 0, -bend]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <icosahedronGeometry args={[0.55, 0]} />
        <Flat color={color} />
      </mesh>
      <mesh position={[0.15, 0.85, 0.05]} castShadow>
        <icosahedronGeometry args={[0.35, 0]} />
        <Flat color={color} />
      </mesh>
    </group>
  </group>
);

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

// フラットシェーディングの起伏のある地面
export const Ground: React.FC<{size?: [number, number]; seg?: number; color?: string; amp?: number; seed?: number; colorFn?: (x: number, z: number) => THREE.Color; position?: V3}> = ({
  size = [80, 80],
  seg = 60,
  color = '#7ed66f',
  amp = 0.25,
  seed = 3,
  colorFn,
  position = [0, 0, 0],
}) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size[0], size[1], seg, seg).toNonIndexed();
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, fbm3(x * 0.15, 0, z * 0.15, seed, 3) * amp);
    }
    if (colorFn) {
      const cols = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i += 3) {
        const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
        const cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
        const c = colorFn(cx, cz);
        for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (i + k) * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    }
    g.computeVertexNormals();
    return g;
  }, [size, seg, amp, seed, colorFn]);
  return (
    <mesh geometry={geo} receiveShadow position={position}>
      <meshStandardMaterial color={colorFn ? '#fff' : color} vertexColors={!!colorFn} flatShading roughness={0.95} />
    </mesh>
  );
};

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
