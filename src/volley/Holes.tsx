import React, {useMemo} from 'react';
import * as THREE from 'three';
import {mulberry32, noise3} from '../lib/rand';
import {V3} from '../lib/anim';

// 不規則な穴の輪郭（半径 r に凸凹をつける）
export const holeOutline = (r: number, seed: number, n = 40, rough = 0.28): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + rough * noise3(Math.cos(a) * 1.6, Math.sin(a) * 1.6, seed, seed) + (i % 3 === 0 ? -0.06 : 0.04);
    out.push([Math.cos(a) * r * k, Math.sin(a) * r * k]);
  }
  return out;
};

// 割れ目（ギザギザの線）
const crackPath = (r: () => number, start: [number, number], ang: number, len: number) => {
  const pts: [number, number][] = [start];
  let [x, y] = start;
  let a = ang;
  const steps = Math.max(3, Math.floor(len / 0.18));
  for (let i = 0; i < steps; i++) {
    a += (r() - 0.5) * 0.9;
    const s = (len / steps) * (0.7 + r() * 0.6);
    x += Math.cos(a) * s;
    y += Math.sin(a) * s;
    pts.push([x, y]);
  }
  return pts;
};

const Crack: React.FC<{pts: [number, number][]; plane: 'floor' | 'wall'; width?: number; grow?: number}> = ({pts, plane, width = 0.025, grow = 1}) => {
  const n = Math.max(1, Math.floor((pts.length - 1) * grow));
  return (
    <group>
      {pts.slice(0, n).map((p, i) => {
        const q = pts[i + 1];
        const dx = q[0] - p[0], dy = q[1] - p[1];
        const len = Math.hypot(dx, dy);
        const w = width * (1 - (i / pts.length) * 0.7);
        const mid: [number, number] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        return plane === 'floor' ? (
          <mesh key={i} position={[mid[0], 0.004, mid[1]]} rotation={[-Math.PI / 2, 0, -Math.atan2(dy, dx)]}>
            <planeGeometry args={[len + w, w]} />
            <meshBasicMaterial color="#1a120c" transparent opacity={0.9} />
          </mesh>
        ) : (
          <mesh key={i} position={[0, mid[1], mid[0]]} rotation={[-Math.atan2(dy, dx), -Math.PI / 2, 0]}>
            <planeGeometry args={[len + w, w]} />
            <meshBasicMaterial color="#3b3a38" transparent opacity={0.85} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------- 床の穴：めくれ上がった床板・下地の層・放射状のひび・焦げ ----------
export const FLOOR_HOLE_R = 0.55;
export const FloorHoleOutline = holeOutline(FLOOR_HOLE_R, 3);

export const FloorHole: React.FC<{at: V3; age: number}> = ({at, age}) => {
  const k = Math.min(1, Math.max(0, age / 5)); // 衝撃から 5 フレームで形ができる
  const data = useMemo(() => {
    const r = mulberry32(17);
    const planks = Array.from({length: 13}).map((_, i) => {
      const a = (i / 13) * Math.PI * 2 + (r() - 0.5) * 0.45;
      return {a, len: 0.22 + r() * 0.42, tilt: 0.25 + r() * 0.9, w: 0.09 + r() * 0.05, light: r()};
    });
    const cracks = Array.from({length: 11}).map((_, i) => {
      const a = (i / 11) * Math.PI * 2 + r() * 0.4;
      const s = FloorHoleOutline[Math.floor((i / 11) * FloorHoleOutline.length)];
      return crackPath(r, [s[0] * 1.05, s[1] * 1.05], a, 1.0 + r() * 2.6);
    });
    const chips = Array.from({length: 26}).map(() => {
      const a = r() * Math.PI * 2;
      const d = 0.7 + r() * 1.6;
      return {x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.05 + r() * 0.12, ry: r() * 6, l: r()};
    });
    // 穴の内壁：上から 床板（木）→ 合板 → 根太の隙間 → コンクリート
    const wall = new THREE.BufferGeometry();
    const layers = [
      {y: 0, s: 1, c: new THREE.Color('#9a6a40')},
      {y: -0.05, s: 0.97, c: new THREE.Color('#c9a27a')},
      {y: -0.09, s: 0.95, c: new THREE.Color('#7a6650')},
      {y: -0.32, s: 0.82, c: new THREE.Color('#2a2622')},
      {y: -0.5, s: 0.6, c: new THREE.Color('#5d5a55')},
    ];
    const pos: number[] = [];
    const col: number[] = [];
    const N = FloorHoleOutline.length;
    for (let li = 0; li < layers.length - 1; li++) {
      const A = layers[li], Bl = layers[li + 1];
      for (let i = 0; i < N; i++) {
        const p = FloorHoleOutline[i], q = FloorHoleOutline[(i + 1) % N];
        const v = [
          [p[0] * A.s, A.y, p[1] * A.s],
          [q[0] * A.s, A.y, q[1] * A.s],
          [q[0] * Bl.s, Bl.y, q[1] * Bl.s],
          [p[0] * Bl.s, Bl.y, p[1] * Bl.s],
        ];
        for (const idx of [0, 1, 2, 0, 2, 3]) {
          pos.push(...v[idx]);
          const c = idx < 2 ? A.c : Bl.c;
          col.push(c.r, c.g, c.b);
        }
      }
    }
    wall.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    wall.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    wall.computeVertexNormals();
    return {planks, cracks, chips, wall};
  }, []);
  return (
    <group position={at}>
      {/* 焦げ・粉じんの跡 */}
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5 * k, 40]} />
        <meshBasicMaterial color="#3a2a1c" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {/* 内壁と底 */}
      <mesh geometry={data.wall}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={1} />
      </mesh>
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[FLOOR_HOLE_R * 0.7, 24]} />
        <meshStandardMaterial color="#3e3b37" roughness={1} />
      </mesh>
      {/* 底にめり込んだボール */}
      <mesh position={[0.08, -0.42, -0.05]}>
        <sphereGeometry args={[0.105, 20, 16]} />
        <meshStandardMaterial color="#d8b23a" roughness={0.6} />
      </mesh>
      {/* めくれ上がった床板 */}
      {data.planks.map((p, i) => {
        const tilt = p.tilt * k;
        const rimX = Math.cos(p.a) * FLOOR_HOLE_R * 0.95, rimZ = Math.sin(p.a) * FLOOR_HOLE_R * 0.95;
        return (
          <group key={i} position={[rimX, 0.0, rimZ]} rotation={[0, -p.a, 0]}>
            <group rotation={[0, 0, tilt]}>
              <mesh position={[p.len / 2, 0.012, 0]} castShadow>
                <boxGeometry args={[p.len, 0.025, p.w]} />
                <meshStandardMaterial color={p.light > 0.5 ? '#c9925a' : '#b37d4a'} roughness={0.6} />
              </mesh>
              {/* ささくれた折れ口 */}
              <mesh position={[0.02, 0.012, 0]} rotation={[0, 0, 0.6]}>
                <boxGeometry args={[0.08, 0.02, p.w * 0.8]} />
                <meshStandardMaterial color="#e2c08f" roughness={0.9} />
              </mesh>
            </group>
          </group>
        );
      })}
      {/* ひび */}
      {data.cracks.map((c, i) => (
        <Crack key={i} pts={c} plane="floor" grow={k} />
      ))}
      {/* 木片 */}
      {k > 0.5 &&
        data.chips.map((c, i) => (
          <mesh key={i} position={[c.x, 0.015, c.z]} rotation={[0, c.ry, 0]} scale={c.s} castShadow>
            <boxGeometry args={[1, 0.25, 0.35]} />
            <meshStandardMaterial color={c.l > 0.5 ? '#c9925a' : '#8f6038'} roughness={0.8} />
          </mesh>
        ))}
    </group>
  );
};

// 床（穴あき）：ShapeGeometry で本当に穴を抜く
export const floorWithHole = (GX: number, GZ: number, at: V3) => {
  const s = new THREE.Shape();
  s.moveTo(-GX, -GZ);
  s.lineTo(GX, -GZ);
  s.lineTo(GX, GZ);
  s.lineTo(-GX, GZ);
  s.closePath();
  const h = new THREE.Path();
  FloorHoleOutline.forEach(([x, z], i) => (i === 0 ? h.moveTo(at[0] + x, -(at[2] + z)) : h.lineTo(at[0] + x, -(at[2] + z))));
  h.closePath();
  s.holes.push(h);
  return new THREE.ShapeGeometry(s, 4);
};

// ---------- 壁の穴：厚みのある壁を抜いた穴・鉄筋・がれき・ひび・外の光 ----------
export const WALL_HOLE = {y: 3.2, z: 0.2, r: 1.25};
export const WallWithHole: React.FC<{GX: number; GZ: number; GH: number; tex: THREE.Texture}> = ({GX, GZ, GH, tex}) => {
  const data = useMemo(() => {
    const outline = holeOutline(WALL_HOLE.r, 9, 48, 0.32);
    const s = new THREE.Shape();
    s.moveTo(-GZ, 0);
    s.lineTo(GZ, 0);
    s.lineTo(GZ, GH);
    s.lineTo(-GZ, GH);
    s.closePath();
    const h = new THREE.Path();
    outline.forEach(([u, v], i) => (i === 0 ? h.moveTo(WALL_HOLE.z + u, WALL_HOLE.y + v) : h.lineTo(WALL_HOLE.z + u, WALL_HOLE.y + v)));
    h.closePath();
    s.holes.push(h);
    const geo = new THREE.ExtrudeGeometry(s, {depth: 0.35, bevelEnabled: false, curveSegments: 4});
    const t = tex.clone();
    t.repeat.set(1 / 4.4, 1 / GH);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;
    const r = mulberry32(23);
    const chunks = outline
      .filter((_, i) => i % 2 === 0)
      .map(([u, v]) => ({u: WALL_HOLE.z + u * (1.02 + r() * 0.1), v: WALL_HOLE.y + v * (1.02 + r() * 0.1), s: 0.08 + r() * 0.14, d: r() * 0.3, ry: r() * 6}));
    const rebar = Array.from({length: 7}).map(() => {
      const a = r() * Math.PI * 2;
      return {u: WALL_HOLE.z + Math.cos(a) * WALL_HOLE.r * 0.95, v: WALL_HOLE.y + Math.sin(a) * WALL_HOLE.r * 0.95, a, len: 0.3 + r() * 0.5, bend: 0.4 + r() * 0.6};
    });
    const cracks = Array.from({length: 12}).map((_, i) => {
      const a = (i / 12) * Math.PI * 2 + r() * 0.3;
      const [u, v] = outline[Math.floor((i / 12) * outline.length)];
      return crackPath(r, [WALL_HOLE.z + u * 1.05, WALL_HOLE.y + v * 1.05], a, 0.8 + r() * 2.4);
    });
    const rubble = Array.from({length: 34}).map(() => ({x: -0.3 - r() * 2.4, z: WALL_HOLE.z + (r() - 0.5) * 3.2, s: 0.06 + r() * 0.22, ry: r() * 6, dark: r()}));
    return {geo, t, chunks, rebar, cracks, rubble};
  }, [GX, GZ, GH, tex]);
  return (
    <group>
      {/* 壁（厚さ 35cm）。内側の面が x = GX */}
      <mesh geometry={data.geo} position={[GX + 0.35, 0, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow castShadow>
        <meshStandardMaterial map={data.t} roughness={0.9} />
      </mesh>
      {/* 穴の向こうの外の光 */}
      <mesh position={[GX + 4, WALL_HOLE.y, WALL_HOLE.z]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[12, 10]} />
        <meshBasicMaterial color="#e8f2fb" />
      </mesh>
      <mesh position={[GX - 2.2, WALL_HOLE.y - 0.9, WALL_HOLE.z]} rotation={[0, 0, Math.PI / 2 + 0.25]}>
        <coneGeometry args={[2.2, 4.4, 32, 1, true]} />
        <meshBasicMaterial color="#fff6e0" transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 縁のがれき */}
      {data.chunks.map((c, i) => (
        <mesh key={i} position={[GX - 0.05 + c.d * 0.3, c.v, c.u]} rotation={[c.ry, c.ry * 1.3, 0]} scale={c.s} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#c9c4ba" roughness={1} flatShading />
        </mesh>
      ))}
      {/* むき出しの鉄筋 */}
      {data.rebar.map((b, i) => (
        <group key={i} position={[GX + 0.17, b.v, b.u]} rotation={[-b.a, 0, 0]}>
          <mesh position={[-b.len / 2, 0, 0]} rotation={[0, 0, Math.PI / 2 + b.bend * 0.5]}>
            <cylinderGeometry args={[0.012, 0.012, b.len, 6]} />
            <meshStandardMaterial color="#5a4a3e" metalness={0.6} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* ひび */}
      <group position={[GX - 0.005, 0, 0]}>
        {data.cracks.map((c, i) => (
          <Crack key={i} pts={c} plane="wall" width={0.03} />
        ))}
      </group>
      {/* 床に落ちたがれき */}
      {data.rubble.map((c, i) => (
        <mesh key={i} position={[GX + c.x, c.s * 0.4, c.z]} rotation={[c.ry, c.ry * 2, 0]} scale={c.s} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={c.dark > 0.5 ? '#bdb7ac' : '#d6d1c7'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
};
