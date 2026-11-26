import React, {useMemo} from 'react';
import * as THREE from 'three';
import {mulberry32, fbm3} from '../../lib/rand';
import {F, nightK, sunDir, waterLevel} from '../timeline';
import {BAY_Z} from './City';

// ---------- 吹き飛ぶもの（東＝-x 方向へ）。オーバーレイの吹き出しからも同じ式で位置を求める ----------
export type DebrisKind = 'sign' | 'bike' | 'cone' | 'box' | 'paper' | 'leaf' | 'glass' | 'umbrella' | 'can';
export type Debris = {kind: DebrisKind; x: number; y: number; z: number; delay: number; speed: number; lift: number; spin: number; s: number; c: number};

export const DEBRIS: Debris[] = (() => {
  const r = mulberry32(77);
  const out: Debris[] = [];
  const add = (kind: DebrisKind, n: number, f: () => Partial<Debris>) => {
    for (let i = 0; i < n; i++) out.push({kind, x: 0, y: 0, z: 0, delay: r() * 10, speed: 0.7 + r() * 0.6, lift: r(), spin: r() * 2 - 1, s: 1, c: r(), ...f()});
  };
  add('sign', 3, () => ({x: 6 + r() * 4, y: 3 + r() * 4, z: -4 - r() * 14, delay: 2 + r() * 4}));
  add('bike', 4, () => ({x: 4.6 + r() * 2.5, y: 0.5, z: 2 - r() * 18}));
  add('cone', 5, () => ({x: 3.6 + r(), y: 0.3, z: 4 - r() * 20}));
  add('box', 8, () => ({x: 4 + r() * 10, y: 0.4 + r() * 2, z: 6 - r() * 26, s: 0.4 + r() * 0.6}));
  add('can', 6, () => ({x: 2 + r() * 6, y: 0.2, z: 6 - r() * 10, s: 0.12}));
  add('umbrella', 3, () => ({x: 5 + r() * 2, y: 1.6, z: 4 - r() * 12}));
  add('paper', 40, () => ({x: -2 + r() * 14, y: 0.2 + r() * 5, z: 9 - r() * 30, s: 0.25 + r() * 0.2, delay: r() * 6}));
  add('leaf', 50, () => ({x: -2 + r() * 16, y: 1 + r() * 6, z: 9 - r() * 30, s: 0.12 + r() * 0.1, delay: r() * 6}));
  add('glass', 60, () => ({x: 7.2 + r() * 0.5, y: 3 + r() * 14, z: 4 - r() * 30, s: 0.12 + r() * 0.2, delay: 3 + r() * 8}));
  return out;
})();

// 停止からの「スロー映像上のフレーム」に換算（スロー区間は実時間の 1/4 で進む）
const sceneT = (frame: number) => {
  if (frame < F.STOP) return 0;
  if (frame < F.SLOW_END) return frame - F.STOP;
  return F.SLOW_END - F.STOP + (frame - F.SLOW_END) * 4;
};

export const debrisPos = (d: Debris, frame: number) => {
  const t = Math.max(0, sceneT(frame) - d.delay);
  const v = 0.0035 * t * t * d.speed;
  const dx = Math.min(v, t * 0.7 * d.speed);
  const heavy = d.kind === 'bike' || d.kind === 'cone' || d.kind === 'box';
  const dy = heavy ? Math.min(3, t * 0.04 * (0.5 + d.lift)) : Math.sin(Math.min(t, 60) * 0.05) * 3 * d.lift + (d.kind === 'glass' ? -Math.min(d.y - 0.1, t * t * 0.0025) : 0);
  return {x: d.x - dx, y: Math.max(0.1, d.y + dy), z: d.z + Math.sin(t * 0.08 + d.c * 6) * 0.6, rot: t * 0.12 * d.spin * (heavy ? 0.6 : 2), t};
};

const KIND_GEO: Record<DebrisKind, () => THREE.BufferGeometry> = {
  sign: () => new THREE.BoxGeometry(0.15, 2.4, 0.9),
  bike: () => new THREE.TorusGeometry(0.33, 0.03, 6, 16),
  cone: () => new THREE.ConeGeometry(0.2, 0.7, 10),
  box: () => new THREE.BoxGeometry(1, 0.8, 0.7),
  can: () => new THREE.CylinderGeometry(0.5, 0.5, 1.6, 10),
  umbrella: () => new THREE.ConeGeometry(0.55, 0.3, 12, 1, true),
  paper: () => new THREE.PlaneGeometry(1, 0.7),
  leaf: () => new THREE.PlaneGeometry(1, 0.6),
  glass: () => new THREE.PlaneGeometry(1, 1),
};
const KIND_COLOR = (d: Debris) =>
  ({
    sign: ['#c0392b', '#1f4e79', '#f1c40f'][Math.floor(d.c * 3)],
    bike: '#2b2d31',
    cone: '#ef6c1a',
    box: '#b98f5e',
    can: '#5d8aa8',
    umbrella: ['#2c3e50', '#c0392b', '#7f8c8d'][Math.floor(d.c * 3)],
    paper: '#f2efe6',
    leaf: ['#6b8e23', '#8aa339', '#a0752d'][Math.floor(d.c * 3)],
    glass: '#cfe6f2',
  })[d.kind];

export const DebrisField: React.FC<{frame: number}> = ({frame}) => {
  const geos = useMemo(() => Object.fromEntries(Object.entries(KIND_GEO).map(([k, f]) => [k, f()])) as Record<DebrisKind, THREE.BufferGeometry>, []);
  if (frame < F.STOP || frame > F.TSUNAMI_END) return null;
  return (
    <group>
      {DEBRIS.map((d, i) => {
        const p = debrisPos(d, frame);
        if (p.x < -90) return null;
        const glass = d.kind === 'glass';
        return (
          <group key={i} position={[p.x, p.y, p.z]} rotation={[p.rot * 0.7, p.rot, p.rot * 0.4]} scale={d.s}>
            <mesh geometry={geos[d.kind]} castShadow={!glass && d.kind !== 'paper' && d.kind !== 'leaf'}>
              {glass ? (
                <meshPhysicalMaterial color="#d6ecf7" transparent opacity={0.55} roughness={0.05} metalness={0.1} side={THREE.DoubleSide} />
              ) : (
                <meshStandardMaterial color={KIND_COLOR(d)} roughness={0.7} side={THREE.DoubleSide} />
              )}
            </mesh>
            {d.kind === 'bike' && (
              <>
                <mesh geometry={geos.bike} position={[0.95, 0, 0]} />
                <mesh position={[0.48, 0.25, 0]} rotation={[0, 0, 0.9]}>
                  <cylinderGeometry args={[0.025, 0.025, 1.0, 6]} />
                  <meshStandardMaterial color="#6d7378" metalness={0.5} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
};

// ---------- 空（太陽の高さで色が変わる）＋ 星 ----------
const C = (h: string) => new THREE.Color(h);
export const skyColors = (frame: number, storm: number) => {
  const el = Math.asin(Math.max(-1, Math.min(1, sunDir(frame)[1])));
  const day = Math.max(0, Math.min(1, el / 0.35));
  const dusk = Math.max(0, 1 - Math.abs(el - 0.02) / 0.14);
  const night = nightK(frame);
  const top = C('#5d8fc4').lerp(C('#0b1530'), night).lerp(C('#3a4a68'), dusk * 0.4);
  const hor = C('#c9d8e4').lerp(C('#e89a5c'), dusk * 0.85).lerp(C('#1b2540'), night);
  const dust = C('#b49a78');
  top.lerp(dust, storm * 0.55);
  hor.lerp(dust, storm * 0.7);
  return {top, hor, day, dusk, night};
};

export const Sky: React.FC<{frame: number; storm: number}> = ({frame, storm}) => {
  const q = Math.round(frame / 2) * 2;
  const geo = useMemo(() => new THREE.SphereGeometry(400, 48, 24), []);
  const colored = useMemo(() => {
    const {top, hor, dusk} = skyColors(q, storm);
    const sd = new THREE.Vector3(...sunDir(q)).normalize();
    const g = geo.clone();
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    const glow = C('#ffe3b0').lerp(C('#ff9a4a'), dusk);
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      c.copy(hor).lerp(top, Math.pow(Math.max(0, v.y), 0.6));
      if (v.y < 0) c.copy(hor).multiplyScalar(0.85);
      const s = Math.max(0, v.dot(sd));
      c.lerp(glow, Math.pow(s, 24) * 0.9 + Math.pow(s, 4) * 0.2 * (1 - storm));
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  }, [geo, q, storm]);
  const stars = useMemo(() => {
    const r = mulberry32(5);
    const arr: number[] = [];
    for (let i = 0; i < 1500; i++) {
      const th = r() * Math.PI * 2;
      const y = r();
      const rad = Math.sqrt(1 - y * y);
      arr.push(Math.cos(th) * rad * 380, y * 380, Math.sin(th) * rad * 380);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return g;
  }, []);
  const n = nightK(frame);
  const sd = sunDir(frame);
  return (
    <group>
      <mesh geometry={colored}>
        <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>
      {n > 0.05 && (
        <points geometry={stars}>
          <pointsMaterial color="#ffffff" size={1.3} sizeAttenuation transparent opacity={n * 0.9} fog={false} depthWrite={false} />
        </points>
      )}
      {sd[1] > -0.05 && (
        <mesh position={[sd[0] * 360, sd[1] * 360, sd[2] * 360]}>
          <sphereGeometry args={[9, 24, 24]} />
          <meshBasicMaterial color={sd[1] < 0.15 ? '#ffb070' : '#fff6e0'} fog={false} transparent opacity={1 - storm * 0.7} />
        </mesh>
      )}
    </group>
  );
};

// ---------- 雲（クレーンアップで突き抜ける層） ----------
export const CloudLayer: React.FC<{y: number; night: number}> = ({y, night}) => {
  const puffs = useMemo(() => {
    const r = mulberry32(31);
    return Array.from({length: 90}).map(() => ({x: (r() - 0.5) * 400, z: (r() - 0.5) * 400 - 40, s: 10 + r() * 22, dy: r() * 12}));
  }, []);
  const col = new THREE.Color('#f4f6f8').lerp(new THREE.Color('#2a3350'), night);
  return (
    <group>
      {puffs.map((p, i) => (
        <mesh key={i} position={[p.x, y + p.dy, p.z]} scale={[p.s * 1.6, p.s * 0.55, p.s]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color={col} roughness={1} emissive={col} emissiveIntensity={0.35} transparent opacity={0.92} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- 津波と浸水 ----------
export const Flood: React.FC<{frame: number}> = ({frame}) => {
  const base = useMemo(() => new THREE.PlaneGeometry(260, 200, 130, 100).rotateX(-Math.PI / 2).translate(0, 0, -50), []);
  const lvl = waterLevel(frame);
  const front = frame < F.FF10_END ? BAY_Z - 20 : frame < 300 ? BAY_Z + ((frame - F.FF10_END) / 60) * (BAY_Z * -1 + 40) : 80;
  const geo = useMemo(() => {
    const g = base.clone();
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const deep = C('#3f5a5e'), murky = C('#6e6a55'), foam = C('#e8ece6');
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const inBay = z < BAY_Z;
      const d = z - front;
      const bump = frame < 300 && frame >= F.FF10_END ? 3.2 * Math.exp(-((d / 5) * (d / 5))) * (d < 0 ? 1 : 0.6) : 0;
      const ripple = 0.12 * Math.sin(x * 0.7 + frame * 0.3) * Math.cos(z * 0.5 - frame * 0.2) + 0.06 * fbm3(x * 0.2, frame * 0.02, z * 0.2, 9, 2);
      let y = (inBay ? Math.max(lvl, -0.4) : lvl) + bump + ripple;
      if (!inBay && z > front + 4) y = -3;
      p.setY(i, y);
      c.copy(inBay ? deep : murky).lerp(deep, inBay ? 0 : 0.35);
      if (bump > 1.2 && d > -3) c.lerp(foam, Math.min(1, (bump - 1.2) / 1.5));
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }, [base, frame, lvl, front]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshPhysicalMaterial vertexColors roughness={0.18} clearcoat={0.8} clearcoatRoughness={0.25} flatShading />
    </mesh>
  );
};

// ---------- 雪 ----------
export const Snowfall: React.FC<{frame: number; k: number; center: [number, number, number]}> = ({frame, k, center}) => {
  const flakes = useMemo(() => {
    const r = mulberry32(12);
    return Array.from({length: 260}).map(() => ({x: (r() - 0.5) * 30, y: r() * 16, z: (r() - 0.5) * 30, s: 0.03 + r() * 0.05, ph: r() * 6}));
  }, []);
  if (k <= 0.01) return null;
  const n = Math.floor(flakes.length * Math.min(1, k * 1.5));
  return (
    <group position={center}>
      {flakes.slice(0, n).map((f, i) => (
        <mesh key={i} position={[f.x + Math.sin(frame * 0.05 + f.ph) * 0.5, (((f.y - frame * 0.05) % 16) + 16) % 16 - 8, f.z]} scale={f.s}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
};
