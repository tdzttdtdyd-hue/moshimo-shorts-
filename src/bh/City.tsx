// 夜の大きな交差点（オリジナルの街並み）と、ブラックホールに吸い込まれる表現
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {V3} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {Human, OUTFITS, walkPose} from '../three/Human';
import {STRIDE, walkAlong} from '../three/Walk';

// ---------- 吸い込まれる物：位置は穴へ、形は穴の向きに細長く（スパゲッティ化） ----------
// p：物のもとの位置（ワールド）／a：0 そのまま → 1 吸い込まれて消える
export const pullMatrix = (p: V3, bh: V3, a: number, size = 1): THREE.Matrix4 => {
  const P = new THREE.Vector3(...p);
  const B = new THREE.Vector3(...bh);
  const n = B.clone().sub(P);
  const dist = n.length();
  if (dist < 1e-4 || a <= 0) return new THREE.Matrix4();
  n.normalize();
  const e = a * a * a; // はじめはゆっくり、だんだん速く
  const np = P.clone().add(B.clone().sub(P).multiplyScalar(e));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  const R = new THREE.Matrix4().makeRotationFromQuaternion(q);
  const Ri = R.clone().invert();
  const thin = Math.max(0.04, 1 - 0.9 * a);
  const stretch = 5 * a;
  const S = new THREE.Matrix4().makeScale(thin, thin, 1 + stretch);
  // 穴に近い側だけが伸びる（遠い側の端は、ほぼもとの位置のまま）
  const front = n.clone().multiplyScalar(Math.min(dist * 0.9, stretch * size * 0.5));
  np.add(front);
  return new THREE.Matrix4().makeTranslation(np.x, np.y, np.z).multiply(R).multiply(S).multiply(Ri).multiply(new THREE.Matrix4().makeTranslation(-P.x, -P.y, -P.z));
};
export const Pulled: React.FC<{p: V3; bh: V3; a: number; size?: number; children: React.ReactNode}> = ({p, bh, a, size = 1, children}) => {
  if (a >= 0.999) return null;
  const m = pullMatrix(p, bh, a, size);
  return (
    <group matrixAutoUpdate={false} matrix={m}>
      {children}
    </group>
  );
};

// ---------- 夜のビル（窓明かり・屋上のライト） ----------
const winTexCache: Record<number, THREE.CanvasTexture> = {};
const nightWindows = (seed: number) => {
  if (winTexCache[seed]) return winTexCache[seed];
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, 128, 256);
  const r = mulberry32(seed);
  for (let y = 4; y < 256; y += 12)
    for (let x = 4; x < 128; x += 10) {
      const on = r() < 0.55;
      if (!on) continue;
      const warm = r() < 0.7;
      g.fillStyle = warm ? `rgba(255,${200 + r() * 40},${130 + r() * 50},1)` : `rgba(${170 + r() * 40},${210 + r() * 30},255,1)`;
      g.fillRect(x, y, 6, 7);
    }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  winTexCache[seed] = t;
  return t;
};
export const NightTower: React.FC<{p: V3; w: number; d: number; h: number; seed: number; color?: string; lit?: number}> = ({p, w, d, h, seed, color = '#2a2f3c', lit = 1}) => {
  const tex = useMemo(() => {
    const t = nightWindows(seed % 7).clone();
    // 窓の大きさ：横 約2.5m・縦 約3.5m（1フロア）
    t.repeat.set(Math.max(1, w / 30), Math.max(0.3, h / 74));
    t.needsUpdate = true;
    return t;
  }, [seed, w, h]);
  return (
    <group position={p}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.75 * lit} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[w * 0.3, h + 0.6, 0]}>
        <sphereGeometry args={[0.35, 8, 6]} />
        <meshBasicMaterial color="#ff3a3a" />
      </mesh>
    </group>
  );
};

// ネオン看板（文字は使わず、光る色の帯と枠）
const Neon: React.FC<{p: V3; ry: number; w: number; h: number; c: string}> = ({p, ry, w, h, c}) => (
  <group position={p} rotation={[0, ry, 0]}>
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial color={c} toneMapped={false} />
    </mesh>
    <mesh position={[0, 0, 0.02]}>
      <planeGeometry args={[w * 0.86, h * 0.7]} />
      <meshBasicMaterial color="#111" />
    </mesh>
    {Array.from({length: 4}).map((_, i) => (
      <mesh key={i} position={[-w * 0.3 + i * w * 0.2, 0, 0.03]}>
        <planeGeometry args={[w * 0.12, h * 0.4]} />
        <meshBasicMaterial color={c} toneMapped={false} />
      </mesh>
    ))}
  </group>
);

// 車（ヘッドライト・テールランプつき）
const NightCar: React.FC<{color: string}> = ({color}) => (
  <group>
    <mesh position={[0, 0.45, 0]}>
      <boxGeometry args={[1.8, 0.6, 4.2]} />
      <meshStandardMaterial color={color} roughness={0.35} metalness={0.5} />
    </mesh>
    <mesh position={[0, 0.95, -0.2]}>
      <boxGeometry args={[1.6, 0.5, 2.2]} />
      <meshStandardMaterial color="#1c2230" roughness={0.1} metalness={0.6} />
    </mesh>
    {[-0.6, 0.6].map((x) => (
      <React.Fragment key={x}>
        <mesh position={[x, 0.5, 2.11]}>
          <boxGeometry args={[0.35, 0.14, 0.02]} />
          <meshBasicMaterial color="#fff6dc" toneMapped={false} />
        </mesh>
        <mesh position={[x, 0.55, -2.11]}>
          <boxGeometry args={[0.35, 0.12, 0.02]} />
          <meshBasicMaterial color="#ff2a2a" toneMapped={false} />
        </mesh>
      </React.Fragment>
    ))}
    {[-0.8, 0.8].map((x) =>
      [-1.3, 1.3].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.3, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.32, 0.32, 0.22, 14]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      )),
    )}
  </group>
);

// ---------- 街のレイアウト（交差点の中心が原点） ----------
export type CityItem = {kind: 'tower'; p: V3; w: number; d: number; h: number; seed: number; color: string} | {kind: 'neon'; p: V3; ry: number; w: number; h: number; c: string} | {kind: 'lamp'; p: V3};
export const CITY: CityItem[] = (() => {
  const r = mulberry32(2024);
  const out: CityItem[] = [];
  const colors = ['#2a2f3c', '#30333d', '#3a3a44', '#262b36', '#34303a'];
  // 4つの角のブロックに、奥へ向かってビルを並べる
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      for (let i = 0; i < 7; i++)
        for (let j = 0; j < 3; j++) {
          const x = sx * (14 + j * 13 + r() * 3);
          const z = sz * (14 + i * 12 + r() * 3);
          const h = 18 + r() * 45 + (i + j) * 6;
          out.push({kind: 'tower', p: [x, 0, z], w: 9 + r() * 3, d: 9 + r() * 3, h, seed: Math.floor(r() * 100), color: colors[Math.floor(r() * colors.length)]});
        }
  // 交差点に面したビルの、大きなネオン
  const neonC = ['#ff3b8a', '#3bd6ff', '#ffb83b', '#8a5bff', '#4bff9a'];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      out.push({kind: 'neon', p: [sx * 9.4, 9 + r() * 8, sz * 14], ry: sx > 0 ? -Math.PI / 2 : Math.PI / 2, w: 7, h: 4, c: neonC[Math.floor(r() * neonC.length)]});
      out.push({kind: 'neon', p: [sx * 14, 7 + r() * 6, sz * 9.4], ry: sz > 0 ? Math.PI : 0, w: 6, h: 3, c: neonC[Math.floor(r() * neonC.length)]});
    }
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    out.push({kind: 'lamp', p: [i * 8, 0, 8.6]});
    out.push({kind: 'lamp', p: [i * 8, 0, -8.6]});
  }
  return out;
})();

// 歩く人（横断歩道を渡る）と走る車
export const WALKERS = (() => {
  const r = mulberry32(7);
  return Array.from({length: 34}).map((_, i) => {
    const alongX = i % 2 === 0;
    const lanePos = (r() < 0.5 ? -1 : 1) * (6.2 + r() * 1.6);
    return {alongX, lane: {x: lanePos, z0: -12 + r() * 24, dir: (r() < 0.5 ? 1 : -1) as 1 | -1, speed: 1.2 + r() * 0.4, zMin: -13, zMax: 13}, o: i};
  });
})();
export const CARS = (() => {
  const r = mulberry32(11);
  return Array.from({length: 10}).map((_, i) => ({x: (i % 2 ? 1 : -1) * (2 + (i % 4 < 2 ? 0 : 3)), z0: -80 + r() * 160, dir: i % 2 ? -1 : 1, speed: 8 + r() * 4, c: ['#c94f4f', '#e8e8ea', '#2f3e5c', '#1c1c20', '#f2c14e'][i % 5]}));
})();

// ---------- 地面（交差点・横断歩道） ----------
const crossTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const S = 1024;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d')!;
    // 1px = 0.1m（102.4m 四方）
    g.fillStyle = '#5a5e66';
    g.fillRect(0, 0, S, S);
    g.fillStyle = '#2a2c32';
    g.fillRect(0, S / 2 - 90, S, 180);
    g.fillRect(S / 2 - 90, 0, 180, S);
    // 横断歩道（4方向）と、斜めの横断歩道
    g.fillStyle = '#e8e8e2';
    for (let k = -4; k <= 4; k++) {
      g.fillRect(S / 2 - 88, S / 2 - 120 + 0, 176, 0);
      g.fillRect(S / 2 + k * 18 - 6, S / 2 - 140, 12, 46);
      g.fillRect(S / 2 + k * 18 - 6, S / 2 + 94, 12, 46);
      g.fillRect(S / 2 - 140, S / 2 + k * 18 - 6, 46, 12);
      g.fillRect(S / 2 + 94, S / 2 + k * 18 - 6, 46, 12);
    }
    g.save();
    g.translate(S / 2, S / 2);
    g.rotate(Math.PI / 4);
    for (let k = -3; k <= 3; k++) g.fillRect(k * 18 - 6, -80, 12, 160);
    g.rotate(Math.PI / 2);
    for (let k = -3; k <= 3; k++) g.fillRect(k * 18 - 6, -80, 12, 160);
    g.restore();
    // 車線
    g.fillStyle = '#d8d8d0';
    for (let y = 0; y < S; y += 40) {
      if (Math.abs(y - S / 2) < 150) continue;
      g.fillRect(S / 2 - 2, y, 4, 22);
      g.fillRect(y, S / 2 - 2, 22, 4);
    }
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  };
})();

// 地面：funnel（0〜1）で、穴に向かってすり鉢状にへこむ
export const Ground: React.FC<{bh: V3; funnel?: number; radius?: number}> = ({bh, funnel = 0, radius = 60}) => {
  // 中心 102.4m 四方に交差点の絵。外側は絵のふち（道路と歩道）がそのまま続く
  const geo = useMemo(() => {
    const gg = new THREE.PlaneGeometry(400, 400, 240, 240).rotateX(-Math.PI / 2);
    const uv = gg.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - 0.5) * (400 / 102.4) + 0.5, (uv.getY(i) - 0.5) * (400 / 102.4) + 0.5);
    return gg;
  }, []);
  const base = useMemo(() => (geo.attributes.position.array as Float32Array).slice(), [geo]);
  const g = useMemo(() => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      const d = Math.hypot(x - bh[0], z - bh[2]);
      const k = funnel * Math.exp(-(d * d) / (2 * radius * radius));
      // 穴のほうへ引き寄せて、深く沈める
      const pull = k * 0.55;
      p.setXYZ(i, x + (bh[0] - x) * pull, -k * radius * 0.9, z + (bh[2] - z) * pull);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [geo, base, bh, funnel, radius]);
  const tex = crossTex();
  return (
    <mesh geometry={g}>
      <meshStandardMaterial map={tex} roughness={0.55} metalness={0.15} />
    </mesh>
  );
};

// ---------- 街全体 ----------
// pullAt：物の位置 → 吸い込まれ具合（0〜1）
export const NightCity: React.FC<{f: number; bh: V3; pullAt?: (p: V3) => number; funnel?: number; funnelR?: number}> = ({f, bh, pullAt = () => 0, funnel = 0, funnelR = 60}) => (
  <>
    <Ground bh={bh} funnel={funnel} radius={funnelR} />
    {CITY.map((it, i) => {
      const a = pullAt(it.p);
      if (it.kind === 'tower')
        return (
          <Pulled key={i} p={[it.p[0], it.h / 2, it.p[2]]} bh={bh} a={a} size={Math.max(it.w, it.h) / 2}>
            <NightTower p={it.p} w={it.w} d={it.d} h={it.h} seed={it.seed} color={it.color} />
          </Pulled>
        );
      if (it.kind === 'neon')
        return (
          <Pulled key={i} p={it.p} bh={bh} a={a}>
            <Neon p={it.p} ry={it.ry} w={it.w} h={it.h} c={it.c} />
          </Pulled>
        );
      return (
        <Pulled key={i} p={it.p} bh={bh} a={a}>
          <group position={it.p}>
            <mesh position={[0, 3, 0]}>
              <cylinderGeometry args={[0.08, 0.1, 6, 8]} />
              <meshStandardMaterial color="#3d434d" metalness={0.4} roughness={0.5} />
            </mesh>
            <mesh position={[0, 6.05, 0]}>
              <sphereGeometry args={[0.28, 10, 8]} />
              <meshBasicMaterial color="#ffe8b0" toneMapped={false} />
            </mesh>
            <pointLight position={[0, 5.8, 0]} intensity={18} distance={16} decay={1.6} color="#ffd9a0" />
          </group>
        </Pulled>
      );
    })}
    {WALKERS.map((w, i) => {
      const s = walkAlong(w.lane, f);
      const pos: V3 = w.alongX ? [s.pos[2], 0, s.pos[0]] : s.pos;
      const ry = w.alongX ? s.ry + Math.PI / 2 : s.ry;
      const a = pullAt([pos[0], 1, pos[2]]);
      return (
        <Pulled key={'w' + i} p={[pos[0], 1, pos[2]]} bh={bh} a={a}>
          <Human outfit={OUTFITS[w.o % OUTFITS.length]} position={pos} rotation={[0, ry, 0]} p={{...walkStep(s.phase)}} longHair={i % 3 === 0} />
        </Pulled>
      );
    })}
    {CARS.map((c, i) => {
      const span = 160;
      let z = c.z0 + c.dir * c.speed * (f / 30);
      z = ((((z + 80) % span) + span) % span) - 80;
      // 交差点の中（±12m）は止まって見えないよう、信号待ちはしない
      const p: V3 = [c.x, 0, z];
      const a = pullAt([p[0], 0.6, p[2]]);
      return (
        <Pulled key={'c' + i} p={[p[0], 0.6, p[2]]} bh={bh} a={a} size={2}>
          <group position={p} rotation={[0, c.dir > 0 ? 0 : Math.PI, 0]}>
            <NightCar color={c.c} />
          </group>
        </Pulled>
      );
    })}
  </>
);
const walkStep = (phase: number) => walkPose(phase, 1);
export {STRIDE};

// 夜空（街明かりで地平線がぼんやり明るい）と星
export const NightSky: React.FC<{tint?: string}> = ({tint = '#1a2240'}) => {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(600, 48, 24);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const top = new THREE.Color('#04060f'), hz = new THREE.Color(tint), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 600;
      c.copy(hz).lerp(top, Math.min(1, Math.max(0, y * 3)));
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  }, [tint]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
};

// 交差点から 100〜450m の、遠くのビル街（まとめて描画）。吸い込まれる範囲に入ったものから細長く伸びて消える
const FAR = (() => {
  const r = mulberry32(99);
  const out: {p: V3; w: number; d: number; h: number}[] = [];
  for (let x = -450; x <= 450; x += 22)
    for (let z = -450; z <= 450; z += 22) {
      const dd = Math.hypot(x, z);
      if (dd < 100 || dd > 460) continue;
      if (Math.abs(x) < 12 || Math.abs(z) < 12) continue; // 大通り
      if (r() < 0.15) continue;
      out.push({p: [x + (r() - 0.5) * 6, 0, z + (r() - 0.5) * 6], w: 10 + r() * 8, d: 10 + r() * 8, h: 15 + r() * 70});
    }
  return out;
})();
export const FarCity: React.FC<{bh: V3; pullAt: (p: V3) => number}> = ({bh, pullAt}) => {
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), []);
  const mat = useMemo(() => {
    const t = nightWindows(3).clone();
    t.repeat.set(1, 1);
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({color: '#262b36', emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.6, roughness: 0.6, metalness: 0.2});
  }, []);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  return (
    <instancedMesh
      args={[geo, mat, FAR.length]}
      ref={(mesh) => {
        if (!mesh) return;
        FAR.forEach((b, i) => {
          const a = pullAt([b.p[0], b.h / 2, b.p[2]]);
          const base = new THREE.Matrix4().compose(new THREE.Vector3(...b.p), new THREE.Quaternion(), new THREE.Vector3(b.w, b.h, b.d));
          if (a >= 0.999) {
            m4.makeScale(0, 0, 0);
          } else {
            m4.copy(pullMatrix([b.p[0], b.h / 2, b.p[2]], bh, a, Math.max(b.w, b.h) / 2)).multiply(base);
          }
          mesh.setMatrixAt(i, m4);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }}
    />
  );
};
