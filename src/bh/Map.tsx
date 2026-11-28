// 日本付近の地図（Natural Earth 1:10m の海岸線）と、ブラックホールに引き込まれる地面
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {feature} from 'topojson-client';
import land10 from 'world-atlas/land-10m.json';
import {V3} from '../lib/anim';
import {mulberry32} from '../lib/rand';

export const TOKYO = {lon: 139.70, lat: 35.66}; // 渋谷あたり
export const FUJI = {lon: 138.73, lat: 35.36};
const KM_PER_DEG_LAT = 110.95;
const kmPerDegLon = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180);
// 経緯度 → 東京を原点にした平面（km）。x：東、z：南（three.js の手前）
export const toKm = (lon: number, lat: number): [number, number] => [(lon - TOKYO.lon) * kmPerDegLon(TOKYO.lat), -(lat - TOKYO.lat) * KM_PER_DEG_LAT];

// 主な都市（明かりの多さの目安。人口はおおよそ・万人）
export const CITIES: {name: string; lon: number; lat: number; pop: number}[] = [
  {name: '東京', lon: 139.70, lat: 35.68, pop: 1400},
  {name: '横浜', lon: 139.64, lat: 35.45, pop: 377},
  {name: '川崎', lon: 139.70, lat: 35.53, pop: 154},
  {name: 'さいたま', lon: 139.65, lat: 35.86, pop: 134},
  {name: '千葉', lon: 140.12, lat: 35.61, pop: 98},
  {name: '大阪', lon: 135.50, lat: 34.69, pop: 275},
  {name: '名古屋', lon: 136.91, lat: 35.18, pop: 232},
  {name: '札幌', lon: 141.35, lat: 43.06, pop: 197},
  {name: '福岡', lon: 130.40, lat: 33.59, pop: 161},
  {name: '神戸', lon: 135.19, lat: 34.69, pop: 151},
  {name: '京都', lon: 135.77, lat: 35.01, pop: 146},
  {name: '広島', lon: 132.46, lat: 34.39, pop: 119},
  {name: '仙台', lon: 140.87, lat: 38.27, pop: 109},
  {name: '北九州', lon: 130.88, lat: 33.88, pop: 93},
  {name: '静岡', lon: 138.38, lat: 34.98, pop: 68},
  {name: '浜松', lon: 137.73, lat: 34.71, pop: 79},
  {name: '新潟', lon: 139.04, lat: 37.92, pop: 78},
  {name: '熊本', lon: 130.71, lat: 32.80, pop: 73},
  {name: '岡山', lon: 133.92, lat: 34.66, pop: 72},
  {name: '鹿児島', lon: 130.56, lat: 31.60, pop: 59},
  {name: '宇都宮', lon: 139.88, lat: 36.56, pop: 52},
  {name: '前橋', lon: 139.06, lat: 36.39, pop: 33},
  {name: '水戸', lon: 140.47, lat: 36.37, pop: 27},
  {name: '甲府', lon: 138.57, lat: 35.66, pop: 19},
  {name: '長野', lon: 138.18, lat: 36.65, pop: 37},
  {name: '金沢', lon: 136.66, lat: 36.56, pop: 46},
];

type Bounds = {lon0: number; lon1: number; lat0: number; lat1: number};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let polysCache: number[][][][] | null = null;
const polys = () => {
  if (polysCache) return polysCache;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topo = land10 as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geo = feature(topo, topo.objects.land) as any;
  const out: number[][][][] = [];
  for (const f of geo.features ?? [geo]) {
    const g = f.geometry ?? f;
    if (g.type === 'Polygon') out.push(g.coordinates);
    else if (g.type === 'MultiPolygon') out.push(...g.coordinates);
  }
  // 日本付近だけ残す
  polysCache = out.filter((p) => p[0].some(([lon, lat]) => lon > 120 && lon < 155 && lat > 20 && lat < 50));
  return polysCache;
};

// 地図の画像：海・陸（標高っぽいむら）・海岸線・街明かり
const texCache: Record<string, {tex: THREE.CanvasTexture; land: Uint8ClampedArray; W: number; H: number}> = {};
export const mapTexture = (b: Bounds, W = 2048, H = 2048, night = 0.12) => {
  const key = `${b.lon0},${b.lon1},${b.lat0},${b.lat1},${W},${H},${night}`;
  if (texCache[key]) return texCache[key];
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  const X = (lon: number) => ((lon - b.lon0) / (b.lon1 - b.lon0)) * W;
  const Y = (lat: number) => ((b.lat1 - lat) / (b.lat1 - b.lat0)) * H;
  // 海
  const sea = g.createLinearGradient(0, 0, W, H);
  sea.addColorStop(0, '#0b2140');
  sea.addColorStop(1, '#0e2a4e');
  g.fillStyle = sea;
  g.fillRect(0, 0, W, H);
  // 陸
  const path = new Path2D();
  for (const poly of polys())
    for (const ring of poly) {
      ring.forEach(([lon, lat], i) => (i === 0 ? path.moveTo(X(lon), Y(lat)) : path.lineTo(X(lon), Y(lat))));
      path.closePath();
    }
  g.fillStyle = '#9a9070';
  g.fill(path, 'evenodd');
  // 陸の色むら（山っぽい暗い斑点）
  g.save();
  g.clip(path, 'evenodd');
  const r = mulberry32(5);
  for (let i = 0; i < 900; i++) {
    const x = r() * W, y = r() * H, rad = 6 + r() * 50;
    g.fillStyle = r() < 0.5 ? 'rgba(40,52,30,0.08)' : 'rgba(120,108,80,0.07)';
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  // 海岸線と浅瀬
  g.strokeStyle = 'rgba(120,170,210,0.35)';
  g.lineWidth = Math.max(2, W / 600);
  g.stroke(path);
  // 夜の暗さ
  g.fillStyle = `rgba(4,8,20,${night})`;
  g.fillRect(0, 0, W, H);
  // 街明かり（都市のまわりに、人口に応じて光の点）
  g.save();
  g.clip(path, 'evenodd');
  g.globalCompositeOperation = 'lighter';
  const pxPerKm = W / ((b.lon1 - b.lon0) * kmPerDegLon((b.lat0 + b.lat1) / 2));
  for (const c of CITIES) {
    // 都市の中心ほど密に、外側ほどまばらに。1点は小さく、色と明るさにむらをつける
    const spread = Math.sqrt(c.pop) * 1.1; // km
    const dens = Math.min(1, pxPerKm / 3);
    const n = Math.floor(Math.min(36000, c.pop * 22 * dens * dens + c.pop * 2));
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 1.6) * spread;
      const x = X(c.lon) + Math.cos(a) * d * pxPerKm, y = Y(c.lat) + Math.sin(a) * d * pxPerKm;
      const s = Math.max(1, pxPerKm * (0.025 + r() * 0.05));
      g.fillStyle = `rgba(255,${185 + r() * 55},${105 + r() * 70},${0.25 + r() * 0.55})`;
      g.fillRect(x, y, s, s);
    }
  }
  g.restore();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  // 陸かどうかの判定用
  const m = document.createElement('canvas');
  m.width = 512;
  m.height = 512;
  const mg = m.getContext('2d')!;
  mg.fillStyle = '#000';
  mg.fillRect(0, 0, 512, 512);
  mg.scale(512 / W, 512 / H);
  mg.fillStyle = '#fff';
  mg.fill(path, 'evenodd');
  const land = mg.getImageData(0, 0, 512, 512).data;
  texCache[key] = {tex, land, W: 512, H: 512};
  return texCache[key];
};
export const isLand = (b: Bounds, lon: number, lat: number) => {
  const t = mapTexture(b);
  if (!t) return false;
  const x = Math.floor(((lon - b.lon0) / (b.lon1 - b.lon0)) * t.W);
  const y = Math.floor(((b.lat1 - lat) / (b.lat1 - b.lat0)) * t.H);
  if (x < 0 || y < 0 || x >= t.W || y >= t.H) return false;
  return t.land[(y * t.W + x) * 4] > 127;
};

// 地面：落下にかかる時間（自由落下）を過ぎた場所から、ブラックホールへ引き込まれて消える
// unitKm：シーンの1単位が何kmか。t：ブラックホールが現れてからの時間（秒）
// 止まっている物が距離 r から中心まで落ちる時間：t = (π/2)·√(r³ / 2GM)（GM は地球の値）
const GM = 3.986e14;
export const fallTime = (rMeters: number) => 1.5708 * Math.sqrt((rMeters * rMeters * rMeters) / (2 * GM));
export const reachRadius = (t: number) => Math.pow(Math.max(0, t) / 1.5708, 2 / 3) * Math.cbrt(2 * GM); // m
export const pullAmount = (rMeters: number, t: number) => Math.min(1, Math.max(0, t / fallTime(Math.max(rMeters, 0.01))));

export const MapGround: React.FC<{b: Bounds; unitKm: number; t: number; seg?: number; bh?: V3; texSize?: number; night?: number}> = ({b, unitKm, t, seg = 220, bh = [0, 0, 0], texSize = 2048, night = 0.12}) => {
  const {tex} = mapTexture(b, texSize, texSize, night);
  const [x0, z0] = toKm(b.lon0, b.lat1);
  const [x1, z1] = toKm(b.lon1, b.lat0);
  const w = (x1 - x0) / unitKm, d = (z1 - z0) / unitKm;
  const geo = useMemo(() => {
    const gg = new THREE.PlaneGeometry(w, d, seg, seg).rotateX(-Math.PI / 2);
    gg.translate((x0 + x1) / 2 / unitKm, 0, (z0 + z1) / 2 / unitKm);
    return gg;
  }, [w, d, seg, x0, x1, z0, z1, unitKm]);
  const base = useMemo(() => (geo.attributes.position.array as Float32Array).slice(), [geo]);
  const g2 = useMemo(() => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      const rM = Math.hypot(x - bh[0], z - bh[2]) * unitKm * 1000;
      const a = pullAmount(rM, t);
      const e = a * a * a;
      // 引き込まれる直前は、穴のほうへ傾いて沈む
      const sink = Math.pow(a, 1.5) * (rM / 1000 / unitKm) * 0.35;
      p.setXYZ(i, x + (bh[0] - x) * e, -sink, z + (bh[2] - z) * e);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [geo, base, bh, t, unitKm]);
  return (
    <mesh geometry={g2}>
      <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.55} roughness={0.95} />
    </mesh>
  );
};
