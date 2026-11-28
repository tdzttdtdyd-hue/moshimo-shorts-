// ポテトチップスの袋：上下がギザギザに圧着された枕形。air で中の空気の量（厚み）が変わる
// air：1 ふつう / 0.3 しぼむ（しわが寄る）/ 1.5 パンパン
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {V3} from '../lib/anim';
import {mulberry32, noise3} from '../lib/rand';

const W = 0.24; // 幅（m）
const H = 0.34; // 高さ
const SEAL = 0.035; // 上下の圧着部分の高さ

const printTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 360;
    const g = cv.getContext('2d')!;
    const grd = g.createLinearGradient(0, 0, 0, 360);
    grd.addColorStop(0, '#f6cf52');
    grd.addColorStop(1, '#eab83a');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 360);
    // 圧着部分（ギザギザ）
    g.fillStyle = '#d9a52c';
    g.fillRect(0, 0, 256, 26);
    g.fillRect(0, 334, 256, 26);
    g.strokeStyle = 'rgba(120,80,20,0.5)';
    for (let x = 0; x < 256; x += 8) {
      g.beginPath();
      g.moveTo(x, 2);
      g.lineTo(x + 4, 24);
      g.moveTo(x, 336);
      g.lineTo(x + 4, 358);
      g.stroke();
    }
    // 帯とロゴ
    g.fillStyle = '#d8402f';
    g.beginPath();
    g.ellipse(128, 160, 110, 58, -0.12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = "900 54px 'Noto Sans JP', sans-serif";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('ポテト', 128, 150);
    g.font = "700 26px 'Noto Sans JP', sans-serif";
    g.fillText('うすしお', 128, 196);
    // チップスの写真っぽい楕円
    for (let i = 0; i < 6; i++) {
      g.fillStyle = i % 2 ? '#f2d27a' : '#e8c060';
      g.beginPath();
      g.ellipse(70 + i * 24, 270 + (i % 2) * 10, 26, 16, i, 0, Math.PI * 2);
      g.fill();
    }
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();

// 片面（front=+1 / back=−1）の形を作る
const sideGeo = (air: number, front: number, seed: number) => {
  const g = new THREE.PlaneGeometry(W, H, 24, 32);
  const p = g.attributes.position;
  const crumple = Math.max(0, 0.75 - air);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const u = (x / W) * 2; // −1..1
    const vy = Math.abs(y) / (H / 2); // 0..1（上下の端で1）
    const inner = Math.max(0, 1 - Math.max(0, vy - (1 - (SEAL * 2) / H)) / ((SEAL * 2) / H)); // 圧着部分では0
    const body = Math.max(0, 1 - vy * vy) * Math.pow(Math.max(0, 1 - u * u), 0.55);
    let z = 0.055 * air * body * Math.min(1, inner * 1.5);
    // しぼむと、しわ（細かいへこみ）が出る
    z -= crumple * 0.05 * Math.max(0, noise3(x * 30 + seed, y * 26, front * 3, 7)) * body;
    // 横幅は、ふくらむほど少し縮む
    const shrinkX = 1 - 0.06 * air * body;
    p.setXYZ(i, x * shrinkX, y, z * front);
  }
  g.computeVertexNormals();
  return g;
};

export const ChipBag: React.FC<{position?: V3; rotation?: V3; air?: number; seed?: number; torn?: boolean}> = ({position = [0, 0, 0], rotation = [0, 0, 0], air = 1, seed = 1, torn = false}) => {
  const q = Math.round(air * 40) / 40; // 形の作り直しを減らす
  const front = useMemo(() => sideGeo(q, 1, seed), [q, seed]);
  const back = useMemo(() => sideGeo(q, -1, seed + 5), [q, seed]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({map: printTex(), roughness: 0.32, metalness: 0.35, side: THREE.DoubleSide}), []);
  const backMat = useMemo(() => new THREE.MeshStandardMaterial({color: '#d9a838', roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide}), []);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={front} material={mat} />
      <mesh geometry={back} material={backMat} />
      {/* 破れた口：上の圧着部分がめくれる */}
      {torn && (
        <mesh position={[0, H / 2 - 0.005, 0.012]} rotation={[-0.9, 0, 0]}>
          <planeGeometry args={[W * 0.9, 0.05]} />
          <meshStandardMaterial color="#d9a52c" side={THREE.DoubleSide} roughness={0.4} metalness={0.3} />
        </mesh>
      )}
    </group>
  );
};

// チップス1枚：少し反った楕円
export const chipGeo = (() => {
  let g: THREE.BufferGeometry | null = null;
  return () => {
    if (g) return g;
    const s = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, 0.5);
    s.scale(0.035 / Math.sin(0.5), 0.02, 0.026 / Math.sin(0.5));
    g = s;
    return g;
  };
})();

// 袋から飛び出したチップスの動き（重力・はね返り・摩擦）。決まった手順で計算するので毎回同じ結果になる
export type ChipShot = {start: V3; vel: V3; spin: V3; floorY: number};
export const makeShots = (origin: V3, n: number, seed: number, floorY: number): ChipShot[] => {
  const r = mulberry32(seed);
  return Array.from({length: n}).map(() => ({
    start: [origin[0] + (r() - 0.5) * 0.1, origin[1] + 0.12, origin[2] + (r() - 0.5) * 0.04],
    vel: [(r() - 0.5) * 1.6, 0.8 + r() * 1.6, 0.4 + r() * 1.4],
    spin: [r() * 10, r() * 10, r() * 10],
    floorY,
  }));
};
export const chipAt = (c: ChipShot, t: number): {p: V3; rot: V3} => {
  const dt = 1 / 120;
  let x = c.start[0], y = c.start[1], z = c.start[2];
  let vx = c.vel[0], vy = c.vel[1], vz = c.vel[2];
  let rest = 0;
  const steps = Math.floor(Math.max(0, t) * 120);
  for (let i = 0; i < steps; i++) {
    vy -= 9.8 * dt;
    vx *= 0.995;
    vz *= 0.995;
    x += vx * dt;
    y += vy * dt;
    z += vz * dt;
    if (y < c.floorY) {
      y = c.floorY;
      vy = Math.abs(vy) > 0.4 ? -vy * 0.3 : 0;
      vx *= 0.6;
      vz *= 0.6;
      if (vy === 0) rest += dt;
    }
  }
  const spinT = Math.max(0, t - rest);
  return {p: [x, y, z], rot: y <= c.floorY + 0.001 ? [0, c.spin[1], 0] : [c.spin[0] * spinT, c.spin[1] * spinT, c.spin[2] * spinT]};
};
