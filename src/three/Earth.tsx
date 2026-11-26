import React, {useMemo} from 'react';
import * as THREE from 'three';
import {C} from '../theme';
import {V3} from '../lib/anim';
import {fbm3, mulberry32} from '../lib/rand';

type Props = {
  radius?: number;
  spin?: number; // Y 回転（ラジアン）
  tilt?: number;
  oceanShift?: number; // 0: 現在の海, 1: 海が両極に集まった状態
  sunDir?: V3; // 指定すると昼側=灼熱/夜側=氷 の色に
  heat?: number; // 0..1 灼熱/氷の強さ
  position?: V3;
  clouds?: boolean;
  detail?: number;
};

const col = (h: string) => new THREE.Color(h);
const P = {
  ocean: col(C.ocean),
  deep: col(C.oceanDeep),
  land: col(C.land),
  landDark: col(C.landDark),
  sand: col(C.sand),
  seabed: col(C.seabed),
  ice: col(C.ice),
  hot: col('#ff9440'),
  frost: col('#d6ecff'),
  green: col('#59c76b'),
};

const hAt = (n: THREE.Vector3) => fbm3(n.x * 1.7 + 4, n.y * 1.7, n.z * 1.7, 11, 4) - 0.03;

export const Earth: React.FC<Props> = ({radius = 2, spin = 0, tilt = 0.41, oceanShift = 0, sunDir, heat = 0, position = [0, 0, 0], clouds = true, detail = 4}) => {
  const base = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, detail);
    const p = g.attributes.position;
    const faces: {n: THREE.Vector3; h: number}[] = [];
    for (let i = 0; i < p.count; i += 3) {
      const n = new THREE.Vector3(
        (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3,
        (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3,
        (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3,
      ).normalize();
      const h = hAt(n);
      faces.push({n, h});
    }
    return {g, faces};
  }, [detail]);

  const shiftKey = Math.round(oceanShift * 60) / 60;
  const heatKey = Math.round(heat * 40) / 40;
  const sunKey = sunDir ? sunDir.map((v) => Math.round(v * 50) / 50).join(',') : '';

  const geo = useMemo(() => {
    const g = base.g.clone();
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const sd = sunDir ? new THREE.Vector3(...sunDir).normalize() : null;
    const tmp = new THREE.Color();
    base.faces.forEach(({n, h}, fi) => {
      const sinLat = Math.abs(n.y);
      // 自転停止で海面は 赤道で下がり、極で上がる
      const sea = shiftKey * (sinLat * 1.15 - 0.62);
      const isLand = h > sea;
      const wasLand = h > 0;
      let c: THREE.Color;
      let lift = 1;
      void isLand;
      if (isLand) {
        if (!wasLand) c = tmp.copy(P.seabed).lerp(P.sand, Math.min(1, (h - sea) * 2));
        else c = tmp.copy(h > 0.18 ? P.landDark : P.land);
        if (sinLat > 0.86 && shiftKey < 0.5) c = tmp.copy(P.ice);
      } else {
        c = tmp.copy(sea - h > 0.25 ? P.deep : P.ocean);
        if (sinLat > 0.9 && shiftKey < 0.5) c = tmp.copy(P.ice);
      }
      if (sd && heatKey > 0) {
        const d = n.dot(sd);
        if (d > 0.15) c = tmp.clone().lerp(P.hot, Math.min(1, (d - 0.15) * 2.2) * heatKey);
        else if (d < -0.12) c = tmp.clone().lerp(P.frost, Math.min(1, (-d - 0.12) * 2.6) * heatKey);
        else c = tmp.clone().lerp(P.green, 0.6 * heatKey);
      }
      for (let k = 0; k < 3; k++) {
        const vi = fi * 3 + k;
        const v = new THREE.Vector3(p.getX(vi), p.getY(vi), p.getZ(vi)).normalize();
        // 頂点ごとに高さを決めるので面の間に隙間ができない
        const vs = shiftKey * (Math.abs(v.y) * 1.15 - 0.62);
        lift = 1 + Math.min(0.045, Math.max(0, (hAt(v) - vs) * 0.07));
        v.multiplyScalar(lift);
        p.setXYZ(vi, v.x, v.y, v.z);
        cols.set([c.r, c.g, c.b], vi * 3);
      }
    });
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, shiftKey, heatKey, sunKey]);

  const cloudBits = useMemo(() => {
    const r = mulberry32(42);
    const out: {dir: THREE.Vector3; s: number; rot: number}[] = [];
    for (let i = 0; i < 14; i++) {
      const th = r() * Math.PI * 2;
      const ph = Math.acos(r() * 1.5 - 0.75);
      const d = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
      for (let k = 0; k < 3; k++) {
        const t = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.12);
        out.push({dir: d.clone().add(t).normalize(), s: 0.025 + r() * 0.03, rot: r() * 6});
      }
    }
    return out;
  }, []);

  return (
    <group position={position} rotation={[0, 0, tilt]} scale={radius}>
      <group rotation={[0, spin, 0]}>
        <mesh geometry={geo} castShadow receiveShadow>
          <meshStandardMaterial vertexColors flatShading roughness={0.8} />
        </mesh>
        {clouds &&
          cloudBits.map((c, i) => (
            <mesh key={i} position={c.dir.clone().multiplyScalar(1.075)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.dir)} scale={[c.s * 1.8, c.s * 0.5, c.s * 1.3]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#ffffff" flatShading roughness={1} transparent opacity={0.92} />
            </mesh>
          ))}
      </group>
      {/* 大気のふち */}
      <mesh scale={1.14}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color="#6fd3ff" transparent opacity={0.22} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

export const Stars: React.FC<{count?: number; radius?: number; seed?: number}> = ({count = 900, radius = 120, seed = 5}) => {
  const geo = useMemo(() => {
    const r = mulberry32(seed);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const th = r() * Math.PI * 2;
      const ph = Math.acos(r() * 2 - 1);
      const rr = radius * (0.7 + r() * 0.3);
      arr.set([rr * Math.sin(ph) * Math.cos(th), rr * Math.cos(ph), rr * Math.sin(ph) * Math.sin(th)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, [count, radius, seed]);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffffff" size={0.55} sizeAttenuation transparent opacity={0.9} />
    </points>
  );
};

export const Sun: React.FC<{position: V3; size?: number}> = ({position, size = 6}) => (
  <group position={position}>
    <mesh>
      <icosahedronGeometry args={[size, 2]} />
      <meshBasicMaterial color="#ffd24a" />
    </mesh>
    {[1.25, 1.6, 2.1].map((s, i) => (
      <mesh key={s} scale={s}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshBasicMaterial color={i === 0 ? '#ffb347' : '#ff8a3d'} transparent opacity={0.22 - i * 0.06} depthWrite={false} />
      </mesh>
    ))}
  </group>
);
