import React, {useMemo} from 'react';
import * as THREE from 'three';
import {V3} from '../lib/anim';
import {fbm3, mulberry32} from '../lib/rand';

// 空のドーム：天頂→地平線の縦グラデーション＋太陽の周りの光
export const SkyDome: React.FC<{top: string; horizon: string; bottom?: string; sunDir?: V3; sunColor?: string; sunPower?: number; radius?: number; leftTint?: string; rightTint?: string}> = ({
  top,
  horizon,
  bottom,
  sunDir,
  sunColor = '#fff1c9',
  sunPower = 18,
  radius = 220,
  leftTint,
  rightTint,
}) => {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(radius, 64, 32);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const T = new THREE.Color(top), H = new THREE.Color(horizon), Bt = new THREE.Color(bottom ?? horizon), S = new THREE.Color(sunColor);
    const L = leftTint ? new THREE.Color(leftTint) : null;
    const R = rightTint ? new THREE.Color(rightTint) : null;
    const sd = sunDir ? new THREE.Vector3(...sunDir).normalize() : null;
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      if (v.y >= 0) c.copy(H).lerp(T, Math.pow(v.y, 0.55));
      else c.copy(H).lerp(Bt, Math.min(1, -v.y * 4));
      if (L && v.x < 0) c.lerp(L, Math.min(1, -v.x) * 0.85);
      if (R && v.x > 0) c.lerp(R, Math.min(1, v.x) * 0.85);
      if (sd) c.lerp(S, Math.pow(Math.max(0, v.dot(sd)), sunPower) * 0.9 + Math.pow(Math.max(0, v.dot(sd)), 3) * 0.15);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  }, [top, horizon, bottom, sunDir?.join(','), sunColor, sunPower, radius, leftTint, rightTint]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
};

// ふわっとした立体の雲
export const CloudPuffs: React.FC<{count?: number; seed?: number; area?: [number, number]; y?: [number, number]; z?: [number, number]; drift?: number; scale?: number; color?: string; opacity?: number}> = ({
  count = 8,
  seed = 1,
  area = [-60, 60],
  y = [14, 22],
  z = [-70, -30],
  drift = 0,
  scale = 1,
  color = '#ffffff',
  opacity = 1,
}) => {
  const clouds = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({length: count}).map(() => {
      const n = 4 + Math.floor(r() * 4);
      const puffs = Array.from({length: n}).map((_, i) => ({x: (i - n / 2) * 1.3 + r() * 0.6, y: r() * 0.8 + (i > 0 && i < n - 1 ? 0.6 : 0), z: r() * 0.8, s: 1.0 + r() * 1.1}));
      return {x: area[0] + r() * (area[1] - area[0]), y: y[0] + r() * (y[1] - y[0]), z: z[0] + r() * (z[1] - z[0]), s: (1 + r()) * scale, puffs};
    });
  }, [count, seed, area, y, z, scale]);
  return (
    <group>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x + drift, c.y, c.z]} scale={c.s}>
          {c.puffs.map((p, j) => (
            <mesh key={j} position={[p.x, p.y, p.z]} scale={[p.s, p.s * 0.75, p.s]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshStandardMaterial color={color} roughness={1} emissive={color} emissiveIntensity={0.25} transparent={opacity < 1} opacity={opacity} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

// 遠景の山並み（雪をかぶったローポリの山）
export const Mountains: React.FC<{seed?: number; radius?: number; count?: number; color?: string; snow?: boolean; center?: V3; arc?: [number, number]; height?: number}> = ({
  seed = 4,
  radius = 70,
  count = 22,
  color = '#6f8aa6',
  snow = true,
  center = [0, 0, 0],
  arc = [Math.PI * 0.95, Math.PI * 2.05],
  height = 14,
}) => {
  const ms = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({length: count}).map((_, i) => {
      const a = arc[0] + ((i + r() * 0.6) / count) * (arc[1] - arc[0]);
      const rr = radius * (0.9 + r() * 0.25);
      return {x: Math.cos(a) * rr, z: Math.sin(a) * rr, h: height * (0.55 + r() * 0.7), w: 8 + r() * 10, rot: r() * 3, seg: 5 + Math.floor(r() * 3)};
    });
  }, [seed, radius, count, arc, height]);
  return (
    <group position={center}>
      {ms.map((m, i) => (
        <group key={i} position={[m.x, 0, m.z]} rotation={[0, m.rot, 0]}>
          <mesh position={[0, m.h / 2 - 0.5, 0]}>
            <coneGeometry args={[m.w, m.h, m.seg, 3]} />
            <meshStandardMaterial color={color} flatShading roughness={1} />
          </mesh>
          {snow && m.h > height * 0.8 && (
            <mesh position={[0, m.h - 0.5 - m.h * 0.14, 0]}>
              <coneGeometry args={[m.w * 0.29, m.h * 0.29, m.seg, 1]} />
              <meshStandardMaterial color="#f5f8ff" flatShading roughness={0.9} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

export type TreeSpec = {x: number; z: number; s: number; type?: 'round' | 'pine' | 'sakura'; y?: number};

// 木をまとめて描画（インスタンス化）。bend で風になびかせる
export const Forest: React.FC<{trees: TreeSpec[]; bend?: (t: TreeSpec, i: number) => number; seed?: number}> = ({trees, bend, seed = 1}) => {
  const data = useMemo(() => {
    const r = mulberry32(seed);
    return trees.map((t) => ({...t, rot: r() * Math.PI * 2, hue: r(), type: t.type ?? (r() < 0.35 ? 'pine' : 'round')}));
  }, [trees, seed]);
  const parts = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.07, 0.12, 1, 6).translate(0, 0.5, 0);
    const round = new THREE.IcosahedronGeometry(0.62, 1);
    const pine = new THREE.ConeGeometry(0.62, 1.1, 7).translate(0, 0.55, 0);
    return {trunk, round, pine};
  }, []);
  const mats = useMemo(
    () => ({
      trunk: new THREE.MeshStandardMaterial({color: '#7a5236', flatShading: true, roughness: 1}),
      leaf: new THREE.MeshStandardMaterial({flatShading: true, roughness: 0.95}),
    }),
    [],
  );
  const tmp = new THREE.Object3D();
  const color = new THREE.Color();
  const n = data.length;
  const rounds = data.filter((d) => d.type !== 'pine');
  const pines = data.filter((d) => d.type === 'pine');

  const setup = (mesh: THREE.InstancedMesh | null, fn: (m: THREE.InstancedMesh) => void) => {
    if (!mesh) return;
    fn(mesh);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  const b = (d: (typeof data)[number]) => (bend ? bend(d, data.indexOf(d)) : 0);

  return (
    <group>
      <instancedMesh
        args={[parts.trunk, mats.trunk, n]}
        castShadow
        ref={(m) =>
          setup(m, (mm) =>
            data.forEach((d, i) => {
              tmp.position.set(d.x, d.y ?? 0, d.z);
              tmp.rotation.set(0, 0, -b(d) * 0.35);
              tmp.scale.set(d.s, d.s * (d.type === 'pine' ? 0.7 : 1.0), d.s);
              tmp.updateMatrix();
              mm.setMatrixAt(i, tmp.matrix);
            }),
          )
        }
      />
      {rounds.length > 0 && (
        <instancedMesh
          args={[parts.round, mats.leaf, rounds.length * 3]}
          castShadow
          receiveShadow
          ref={(m) =>
            setup(m, (mm) =>
              rounds.forEach((d, i) => {
                const bb = b(d);
                for (let k = 0; k < 3; k++) {
                  const ox = [0, 0.32, -0.28][k], oy = [1.25, 1.0, 0.95][k], oz = [0, 0.15, -0.12][k], sc = [1, 0.72, 0.68][k];
                  tmp.position.set(d.x + (ox + oy * Math.sin(bb) * 0.9) * d.s, (d.y ?? 0) + oy * Math.cos(bb * 0.5) * d.s, d.z + oz * d.s);
                  tmp.rotation.set(d.rot, d.rot * 1.7 + k, 0);
                  tmp.scale.setScalar(d.s * sc);
                  tmp.updateMatrix();
                  mm.setMatrixAt(i * 3 + k, tmp.matrix);
                  if (d.type === 'sakura') color.setHSL(0.94 + d.hue * 0.03, 0.75, 0.8 - k * 0.04);
                  else color.setHSL(0.24 + d.hue * 0.1, 0.5 + d.hue * 0.15, 0.36 + k * 0.04 + d.hue * 0.06);
                  mm.setColorAt(i * 3 + k, color);
                }
              }),
            )
          }
        />
      )}
      {pines.length > 0 && (
        <instancedMesh
          args={[parts.pine, mats.leaf, pines.length * 3]}
          castShadow
          ref={(m) =>
            setup(m, (mm) =>
              pines.forEach((d, i) => {
                const bb = b(d);
                for (let k = 0; k < 3; k++) {
                  const oy = 0.6 + k * 0.55;
                  tmp.position.set(d.x + oy * Math.sin(bb) * 0.8 * d.s, (d.y ?? 0) + oy * d.s, d.z);
                  tmp.rotation.set(0, d.rot + k, -bb * 0.6);
                  tmp.scale.setScalar(d.s * (1.15 - k * 0.27));
                  tmp.updateMatrix();
                  mm.setMatrixAt(i * 3 + k, tmp.matrix);
                  color.setHSL(0.36 + d.hue * 0.05, 0.45, 0.24 + k * 0.03 + d.hue * 0.05);
                  mm.setColorAt(i * 3 + k, color);
                }
              }),
            )
          }
        />
      )}
    </group>
  );
};

// 草むら（小さな三角錐を大量にインスタンス化）
export const Grass: React.FC<{count?: number; area: [number, number, number, number]; seed?: number; keep?: (x: number, z: number) => boolean; sway?: number; hue?: number}> = ({
  count = 1500,
  area,
  seed = 2,
  keep,
  sway = 0,
  hue = 0.26,
}) => {
  const geo = useMemo(() => new THREE.ConeGeometry(0.06, 0.32, 3).translate(0, 0.16, 0), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({flatShading: true, roughness: 1}), []);
  const items = useMemo(() => {
    const r = mulberry32(seed);
    const out: {x: number; z: number; s: number; h: number; rot: number}[] = [];
    let guard = 0;
    while (out.length < count && guard++ < count * 6) {
      const x = area[0] + r() * (area[1] - area[0]);
      const z = area[2] + r() * (area[3] - area[2]);
      if (keep && !keep(x, z)) continue;
      out.push({x, z, s: 0.6 + r() * 0.9, h: r(), rot: r() * 6});
    }
    return out;
  }, [count, area, seed, keep]);
  const tmp = new THREE.Object3D();
  const c = new THREE.Color();
  return (
    <instancedMesh
      args={[geo, mat, items.length]}
      receiveShadow
      ref={(m) => {
        if (!m) return;
        items.forEach((it, i) => {
          tmp.position.set(it.x, 0, it.z);
          tmp.rotation.set(0, it.rot, sway * (0.6 + it.h * 0.6));
          tmp.scale.set(it.s, it.s * (0.8 + it.h * 0.8), it.s);
          tmp.updateMatrix();
          m.setMatrixAt(i, tmp.matrix);
          c.setHSL(hue + it.h * 0.06, 0.55, 0.32 + it.h * 0.14);
          m.setColorAt(i, c);
        });
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }}
    />
  );
};

export const Rocks: React.FC<{items: {x: number; z: number; s: number}[]; color?: string}> = ({items, color = '#8b8f97'}) => (
  <group>
    {items.map((r, i) => (
      <mesh key={i} position={[r.x, r.s * 0.25, r.z]} rotation={[i, i * 2.1, 0]} scale={[r.s, r.s * 0.6, r.s * 0.9]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={color} flatShading roughness={1} />
      </mesh>
    ))}
  </group>
);

// 道路：アスファルト＋センターライン＋歩道
export const Road: React.FC<{length: number; width?: number; position?: V3; rotationY?: number; sidewalk?: boolean}> = ({length, width = 3.2, position = [0, 0, 0], rotationY = 0, sidewalk = true}) => {
  const dashes = Math.floor(length / 2.4);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial color="#4a4f5a" roughness={0.95} />
      </mesh>
      {Array.from({length: dashes}).map((_, i) => (
        <mesh key={i} position={[-length / 2 + i * 2.4 + 1.2, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.1, 0.12]} />
          <meshStandardMaterial color="#f3f0e2" roughness={0.8} />
        </mesh>
      ))}
      {sidewalk &&
        [-1, 1].map((s) => (
          <mesh key={s} position={[0, 0.07, s * (width / 2 + 0.6)]} receiveShadow castShadow>
            <boxGeometry args={[length, 0.14, 1.2]} />
            <meshStandardMaterial color="#c9c6bf" roughness={0.95} />
          </mesh>
        ))}
    </group>
  );
};

export const StreetLamp: React.FC<{position: V3; rotationY?: number; on?: boolean}> = ({position, rotationY = 0, on = false}) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <mesh position={[0, 1.6, 0]} castShadow>
      <cylinderGeometry args={[0.05, 0.07, 3.2, 8]} />
      <meshStandardMaterial color="#3d434d" metalness={0.4} roughness={0.5} />
    </mesh>
    <mesh position={[0.3, 3.15, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.035, 0.035, 0.6, 6]} />
      <meshStandardMaterial color="#3d434d" metalness={0.4} roughness={0.5} />
    </mesh>
    <mesh position={[0.58, 3.08, 0]}>
      <boxGeometry args={[0.32, 0.1, 0.18]} />
      <meshStandardMaterial color="#fff6d8" emissive="#ffe8a8" emissiveIntensity={on ? 1.5 : 0.3} />
    </mesh>
  </group>
);

// 地面：起伏＋色ムラ（フラットシェーディング）
export const Terrain: React.FC<{size?: [number, number]; seg?: number; position?: V3; amp?: number; seed?: number; colorAt: (x: number, z: number, n: number) => THREE.Color; flatten?: (x: number, z: number) => number}> = ({
  size = [120, 120],
  seg = 90,
  position = [0, 0, 0],
  amp = 0.3,
  seed = 3,
  colorAt,
  flatten,
}) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size[0], size[1], seg, seg);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + position[0], z = p.getZ(i) + position[2];
      const n = fbm3(x * 0.08, 0, z * 0.08, seed, 4);
      const k = flatten ? flatten(x, z) : 1;
      // 遠くほど起伏を大きく（丘陵）
      const far = Math.max(0, Math.hypot(x, z) - 25) * 0.06;
      p.setY(i, (n * amp + Math.max(0, fbm3(x * 0.03, 1, z * 0.03, seed + 1, 3)) * far * 3) * k);
      const c = colorAt(x, z, fbm3(x * 0.25, 2, z * 0.25, seed + 5, 3));
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size[0], size[1], seg, amp, seed]);
  return (
    <mesh geometry={geo} position={position} receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={1} />
    </mesh>
  );
};

export const grassColor = (base = '#6dbb4f', dark = '#3f8f3a', light = '#9bd66a') => {
  const B = new THREE.Color(base), D = new THREE.Color(dark), L = new THREE.Color(light);
  return (_x: number, _z: number, n: number) => (n > 0 ? B.clone().lerp(L, Math.min(1, n * 2.2)) : B.clone().lerp(D, Math.min(1, -n * 2.2)));
};

// ビルの窓テクスチャ
const windowTex = (() => {
  const cache: Record<string, THREE.Texture> = {};
  return (seed: number, lit = 0.25) => {
    const key = `${seed}-${lit}`;
    if (cache[key]) return cache[key];
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    const r = mulberry32(seed);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const on = r() < lit;
        ctx.fillStyle = on ? '#ffe7a6' : `rgb(${70 + r() * 30},${95 + r() * 30},${125 + r() * 30})`;
        ctx.fillRect(x * 16 + 3, y * 16 + 4, 10, 9);
      }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    cache[key] = t;
    return t;
  };
})();

export const Tower: React.FC<{position?: V3; w?: number; d?: number; h: number; color: string; seed?: number; rotation?: V3}> = ({position = [0, 0, 0], w = 1.6, d = 1.6, h, color, seed = 1, rotation = [0, 0, 0]}) => {
  const tex = useMemo(() => {
    const t = windowTex(seed % 5).clone();
    t.repeat.set(Math.max(1, Math.round(w / 0.9)), Math.max(1, Math.round(h / 0.9)));
    t.needsUpdate = true;
    return t;
  }, [seed, w, h]);
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} map={tex} roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[0, h + 0.15, 0]} castShadow>
        <boxGeometry args={[w * 1.04, 0.3, d * 1.04]} />
        <meshStandardMaterial color="#d7d9dd" roughness={0.8} />
      </mesh>
      <mesh position={[w * 0.18, h + 0.55, -d * 0.1]} castShadow>
        <boxGeometry args={[w * 0.35, 0.5, d * 0.35]} />
        <meshStandardMaterial color="#aeb3ba" roughness={0.8} />
      </mesh>
    </group>
  );
};
