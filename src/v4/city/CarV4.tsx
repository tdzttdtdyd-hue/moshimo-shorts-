import React, {useMemo} from 'react';
import * as THREE from 'three';

// 実寸（全長約4.4m）の乗用車。角を落としたボディ・ガラス・ホイール・ライト付き
const bodyGeo = (() => {
  let g: THREE.BufferGeometry | null = null;
  return () => {
    if (g) return g;
    const s = new THREE.Shape();
    // 側面シルエット（x=前後, y=高さ）
    s.moveTo(-2.2, 0.32);
    s.lineTo(-2.2, 0.78);
    s.quadraticCurveTo(-2.15, 0.9, -1.9, 0.92);
    s.lineTo(-1.15, 0.95);
    s.lineTo(-0.7, 1.42);
    s.lineTo(0.75, 1.44);
    s.lineTo(1.35, 0.98);
    s.lineTo(2.05, 0.9);
    s.quadraticCurveTo(2.22, 0.86, 2.22, 0.7);
    s.lineTo(2.22, 0.32);
    s.lineTo(-2.2, 0.32);
    g = new THREE.ExtrudeGeometry(s, {depth: 1.72, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3}).translate(0, 0, -0.86);
    g.computeVertexNormals();
    return g;
  };
})();

const glassGeo = (() => {
  let g: THREE.BufferGeometry | null = null;
  return () => {
    if (g) return g;
    const s = new THREE.Shape();
    s.moveTo(-1.05, 1.0);
    s.lineTo(-0.66, 1.37);
    s.lineTo(0.72, 1.39);
    s.lineTo(1.25, 1.0);
    s.lineTo(-1.05, 1.0);
    g = new THREE.ExtrudeGeometry(s, {depth: 1.78, bevelEnabled: false}).translate(0, 0, -0.89);
    return g;
  };
})();

export const CarV4: React.FC<{position?: [number, number, number]; rotation?: [number, number, number]; color: string}> = ({position = [0, 0, 0], rotation = [0, 0, 0], color}) => {
  const body = useMemo(() => bodyGeo(), []);
  const glass = useMemo(() => glassGeo(), []);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshPhysicalMaterial color={color} roughness={0.35} metalness={0.3} clearcoat={0.9} clearcoatRoughness={0.15} />
      </mesh>
      <mesh geometry={glass}>
        <meshPhysicalMaterial color="#1d2630" roughness={0.08} metalness={0.4} clearcoat={1} />
      </mesh>
      {[
        [-1.4, 0.86],
        [1.45, 0.86],
        [-1.4, -0.86],
        [1.45, -0.86],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.33, z]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.33, 0.33, 0.24, 20]} />
            <meshStandardMaterial color="#1b1c1f" roughness={0.9} />
          </mesh>
          <mesh position={[0, z > 0 ? 0.125 : -0.125, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
            <meshStandardMaterial color="#b8bcc2" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {[-0.6, 0.6].map((z) => (
        <group key={z}>
          <mesh position={[2.27, 0.72, z]}>
            <boxGeometry args={[0.04, 0.12, 0.34]} />
            <meshStandardMaterial color="#f4f6f8" emissive="#fff6e0" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[-2.25, 0.74, z]}>
            <boxGeometry args={[0.04, 0.12, 0.3]} />
            <meshStandardMaterial color="#b3261e" emissive="#b3261e" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
