// 富士山・噴煙・降る灰・地図の上を流れる灰の雲
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {V3} from '../lib/anim';
import {fbm3, mulberry32} from '../lib/rand';

// ---------- 富士山（単位 100m：高さ 37.76、すそ野の半径 約150） ----------
export const FUJI_H = 37.76;
const FUJI_R = 150;
// すそ野ほどゆるやかな、くぼんだ円錐（実際の富士山の形に近い）
const profile = (u: number) => Math.pow(1 - u, 2.1); // u：中心からの距離 / 半径 → 高さの割合
export const fujiHeight = (x: number, z: number) => {
  const r = Math.hypot(x, z);
  const u = Math.min(1, r / FUJI_R);
  const crater = r < 3.2 ? -(1 - r / 3.2) * 1.6 : 0; // 山頂の火口
  const n = fbm3(x * 0.05, 0, z * 0.05, 3, 4);
  return FUJI_H * profile(u) * (1 + n * 0.04) + crater + (1 - u) * n * 1.2;
};
export const Fuji: React.FC<{ash?: number}> = ({ash = 0}) => {
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(FUJI_R, 220, 0, Math.PI * 2);
    // 中心が細かくなるよう、頂点を半径方向に並べ直した格子
    const rings = 120, segs = 220;
    const pos: number[] = [];
    const idx: number[] = [];
    const cols: number[] = [];
    const c = new THREE.Color();
    pos.push(0, fujiHeight(0, 0), 0);
    c.set('#5a4a44');
    cols.push(c.r, c.g, c.b);
    for (let i = 1; i <= rings; i++) {
      const rr = FUJI_R * Math.pow(i / rings, 1.6);
      for (let j = 0; j < segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
        const h = fujiHeight(x, z);
        pos.push(x, h, z);
        const hr = h / FUJI_H;
        const n = fbm3(x * 0.12, 1, z * 0.12, 9, 3);
        // 雪（上の方・沢すじは低くまで）→ 岩肌 → 森
        const snowLine = 0.62 + n * 0.18 + 0.06 * Math.sin(a * 9);
        if (hr > snowLine) c.set('#f2f4f8');
        else if (hr > 0.42) c.set('#6a5a52').lerp(new THREE.Color('#8a7a6a'), Math.max(0, n + 0.3));
        else if (hr > 0.2) c.set('#4a5a3a').lerp(new THREE.Color('#6a6a4a'), Math.max(0, n + 0.3));
        else c.set('#3a5a2e').lerp(new THREE.Color('#5a7a3a'), Math.max(0, n + 0.4));
        cols.push(c.r, c.g, c.b);
      }
    }
    for (let j = 0; j < segs; j++) idx.push(0, 1 + j, 1 + ((j + 1) % segs));
    for (let i = 1; i < rings; i++)
      for (let j = 0; j < segs; j++) {
        const a = 1 + (i - 1) * segs + j, b = 1 + (i - 1) * segs + ((j + 1) % segs);
        const cc = 1 + i * segs + j, d = 1 + i * segs + ((j + 1) % segs);
        idx.push(a, cc, b, b, cc, d);
      }
    g.dispose();
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    out.setIndex(idx);
    out.computeVertexNormals();
    return out;
  }, []);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors roughness={0.95} color={'#' + new THREE.Color('#ffffff').lerp(new THREE.Color('#8a8680'), ash).getHexString()} />
    </mesh>
  );
};

// ---------- 噴煙：大量の煙のかたまりが、火口から立ちのぼり、上で横に広がって東へ流れる ----------
type Puff = {born: number; ang: number; off: number; spd: number; size: number; shade: number; wob: number};
const PUFFS: Puff[] = (() => {
  const r = mulberry32(17);
  return Array.from({length: 1600}).map((_, i) => ({born: i * 0.14 + r() * 0.3, ang: r() * Math.PI * 2, off: Math.sqrt(r()), spd: 0.8 + r() * 0.4, size: 0.45 + r() * 0.55, shade: r(), wob: r() * 6}));
})();
// f：噴火してからのフレーム。topH：噴煙の高さ（100m単位）
export const Plume: React.FC<{f: number; topH?: number; wind?: V3; scale?: number}> = ({f, topH = 150, wind = [1, 0, 0.15], scale = 1}) => {
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({roughness: 1, flatShading: true}), []);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);
  const w = new THREE.Vector3(...wind).normalize();
  return (
    <instancedMesh
      args={[geo, mat, PUFFS.length]}
      frustumCulled={false}
      ref={(m) => {
        if (!m) return;
        PUFFS.forEach((p, i) => {
          // 噴火が続くあいだ、煙はくり返し湧き上がる（1周 260フレーム）
          const raw = f - p.born;
          const age = raw > 260 ? raw % 260 : raw;
          if (raw < 0) {
            tmp.scale.setScalar(0);
            tmp.updateMatrix();
            m.setMatrixAt(i, tmp.matrix);
            return;
          }
          // 上昇：はじめ速く、高くなるほど遅く（1フレームの上昇 約 3.6 → 0）
          const h = topH * (1 - Math.exp((-age * p.spd) / 55));
          const k = h / topH;
          // 上の方ほど横に広がり、風下へ流れる
          // 柱は根元から太く、上で大きく傘のように広がる
          const spread = 6 + 14 * k + 34 * Math.pow(k, 3) + age * 0.04;
          const drift = Math.max(0, age - 40) * 0.35 * Math.pow(k, 2);
          const x = Math.cos(p.ang + p.wob * 0.1 * Math.sin(age * 0.05)) * spread * p.off + w.x * drift;
          const z = Math.sin(p.ang) * spread * p.off * 0.8 + w.z * drift;
          const y = FUJI_H + h + Math.sin(age * 0.07 + p.wob) * 0.8;
          const s = (3.5 + k * 9 + Math.min(age, 300) * 0.015) * p.size;
          tmp.position.set(x * scale, y * scale, z * scale);
          tmp.rotation.set(p.wob + age * 0.01, p.wob * 2, 0);
          tmp.scale.setScalar(s * scale);
          tmp.updateMatrix();
          m.setMatrixAt(i, tmp.matrix);
          // 根元は黒っぽく、上は灰色、日の当たる上側ほど明るい
          col.set('#3a3430').lerp(new THREE.Color('#8a847c'), Math.min(1, k * 1.3)).lerp(new THREE.Color('#c8c2b8'), p.shade * 0.5 * k).lerp(new THREE.Color('#1e1a18'), (1 - p.shade) * 0.3);
          m.setColorAt(i, col);
        });
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }}
    />
  );
};

// 噴煙の中の雷（火山雷）：短く光る折れ線
export const Lightning: React.FC<{f: number; at: number[]; base: V3; scale?: number}> = ({f, at, base, scale = 1}) => {
  const hit = at.find((t) => f >= t && f < t + 4);
  if (hit === undefined) return null;
  const r = mulberry32(hit);
  const pts: THREE.Vector3[] = [];
  let p = new THREE.Vector3(base[0] + (r() - 0.5) * 20, base[1] + 30 + r() * 40, base[2]);
  for (let i = 0; i < 9; i++) {
    pts.push(p.clone().multiplyScalar(scale));
    p = p.clone().add(new THREE.Vector3((r() - 0.5) * 8, -4 - r() * 4, (r() - 0.5) * 4));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return (
    <>
      <line>
        <primitive object={geo} attach="geometry" />
        <lineBasicMaterial color="#e8f0ff" toneMapped={false} />
      </line>
      <pointLight position={pts[3].toArray() as V3} intensity={4000} distance={400} color="#cfe0ff" />
    </>
  );
};

// ---------- 降る灰（丸いふわっとした粒）・雨（細い線） ----------
const dotTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.7)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    t = new THREE.CanvasTexture(c);
    return t;
  };
})();
export const AshFall: React.FC<{f: number; center: V3; size?: [number, number, number]; count?: number; amount?: number; rain?: boolean}> = ({f, center, size = [30, 20, 30], count = 5000, amount = 1, rain = false}) => {
  const base = useMemo(() => {
    const r = mulberry32(3);
    return Array.from({length: count}).map(() => [r(), r(), r(), r()]);
  }, [count]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3 * (rain ? 2 : 1)), 3));
    return g;
  }, [count, rain]);
  const p = geo.attributes.position as THREE.BufferAttribute;
  const n = Math.floor(count * Math.max(0, Math.min(1, amount)));
  const fall = rain ? 0.55 : 0.04;
  const streak = 0.5;
  for (let i = 0; i < count; i++) {
    const [a, b, c, d] = base[i];
    const hide = i >= n;
    const y = ((((b * size[1] - f * fall * (0.7 + d * 0.6)) % size[1]) + size[1]) % size[1]) - size[1] / 2;
    const x = (a - 0.5) * size[0] + (rain ? 0 : Math.sin(f * 0.03 + d * 9) * 0.4 + f * 0.01);
    const z = (c - 0.5) * size[2];
    const X = center[0] + x, Y = hide ? -9999 : center[1] + y, Z = center[2] + z;
    if (rain) {
      p.setXYZ(i * 2, X, Y, Z);
      p.setXYZ(i * 2 + 1, X + 0.05, Y + streak, Z);
    } else p.setXYZ(i, X, Y, Z);
  }
  p.needsUpdate = true;
  if (rain)
    return (
      <lineSegments geometry={geo} frustumCulled={false}>
        <lineBasicMaterial color="#c8d0d8" transparent opacity={0.35} depthWrite={false} />
      </lineSegments>
    );
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial map={dotTex()} color="#d8d2c8" size={0.09} sizeAttenuation transparent opacity={0.9} depthWrite={false} alphaTest={0.02} />
    </points>
  );
};

// ---------- 地図の上の灰の雲：富士山から、風下の東へ扇状に広がる ----------
const softTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.6)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    t = new THREE.CanvasTexture(c);
    return t;
  };
})();
const BLOBS = (() => {
  const r = mulberry32(41);
  return Array.from({length: 360}).map(() => ({d: Math.pow(r(), 0.7), side: (r() - 0.5) * 2, s: 0.6 + r() * 0.8, sh: r(), ph: r() * 6}));
})();
// from：富士山（地図の座標）、to：風下の向き、reach：雲の先端までの距離（0〜1 × len）
export const AshCloud: React.FC<{from: V3; dir: V3; len: number; reach: number; f: number; width?: number}> = ({from, dir, len, reach, f, width = 0.35}) => {
  const d = new THREE.Vector3(...dir).normalize();
  const side = new THREE.Vector3(-d.z, 0, d.x);
  return (
    <group>
      {BLOBS.map((b, i) => {
        if (b.d > reach) return null;
        const along = b.d * len;
        const wide = along * width * b.side;
        const p = new THREE.Vector3(...from).addScaledVector(d, along).addScaledVector(side, wide);
        const size = (8 + along * 0.3) * b.s;
        const fade = Math.min(1, (reach - b.d) * 8);
        return (
          <sprite key={i} position={[p.x + Math.sin(f * 0.02 + b.ph) * 1.5, 3 + b.sh * 4, p.z]} scale={[size, size, 1]}>
            <spriteMaterial map={softTex()} color={'#' + new THREE.Color('#5a524c').lerp(new THREE.Color('#9a928a'), b.sh).getHexString()} transparent opacity={0.65 * fade} depthWrite={false} />
          </sprite>
        );
      })}
    </group>
  );
};
