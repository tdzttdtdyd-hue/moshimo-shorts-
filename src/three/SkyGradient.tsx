import React, {useMemo} from 'react';
import * as THREE from 'three';

// 左右（x 方向）で色が変わる空の球
export const SkyGradient: React.FC<{left: string; mid: string; right: string; radius?: number; offsetX?: number}> = ({left, mid, right, radius = 150, offsetX = 0}) => {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(radius, 48, 24);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const L = new THREE.Color(left), M = new THREE.Color(mid), R = new THREE.Color(right);
    for (let i = 0; i < p.count; i++) {
      const t = Math.max(-1, Math.min(1, (p.getX(i) - offsetX) / (radius * 0.55)));
      const c = t < 0 ? M.clone().lerp(L, -t) : M.clone().lerp(R, t);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  }, [left, mid, right, radius, offsetX]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} />
    </mesh>
  );
};
