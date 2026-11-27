import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {CameraRig, CamKey, Shake} from '../lib/CameraRig';
import {V3} from '../lib/anim';
import {mulberry32} from '../lib/rand';
import {project} from '../lib/project';
import {Earth, SpaceBackdrop, Stars} from '../three/Earth';
import {House} from '../three/Props';
import {Road, StreetLamp} from '../three/Landscape';
import {CalloutView, Vignette} from './Overlay';
import {SCENES} from './script';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const LIN = (t: number) => t;
const sm = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};
const spec = (id: string) => SCENES.find((s) => s.id === id)!;
const CO = (id: string, key: string) => spec(id).callouts!.find((c) => c.key === key)!;

// ---------- 月の表面（クレーターと海のある手描きテクスチャ） ----------
const moonTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const W = 1024, H = 512;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#b9b7b1';
    g.fillRect(0, 0, W, H);
    const r = mulberry32(42);
    // 暗い「海」
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = H * 0.2 + r() * H * 0.6, rad = 30 + r() * 110;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(110,110,112,0.55)');
      gr.addColorStop(1, 'rgba(110,110,112,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(x, y, rad * 1.3, rad, 0, 0, Math.PI * 2);
      g.fill();
    }
    // クレーター
    for (let i = 0; i < 420; i++) {
      const x = r() * W, y = r() * H, rad = Math.pow(r(), 3) * 26 + 2;
      g.fillStyle = 'rgba(80,80,82,0.35)';
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(230,228,222,0.45)';
      g.lineWidth = Math.max(1, rad * 0.18);
      g.beginPath();
      g.arc(x - rad * 0.12, y - rad * 0.12, rad, Math.PI * 0.9, Math.PI * 1.9);
      g.stroke();
    }
    // 細かいざらつき
    const img = g.getImageData(0, 0, W, H);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (r() - 0.5) * 18;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();
// ひび割れ（透明の上に暗い線と赤い光）
const crackTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const W = 1024, H = 512;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d')!;
    const r = mulberry32(7);
    for (let k = 0; k < 18; k++) {
      let x = r() * W, y = H * 0.15 + r() * H * 0.7;
      g.beginPath();
      g.moveTo(x, y);
      for (let s = 0; s < 14; s++) {
        x += (r() - 0.3) * 60;
        y += (r() - 0.5) * 50;
        g.lineTo(x, y);
      }
      g.strokeStyle = 'rgba(255,120,60,0.9)';
      g.lineWidth = 7;
      g.stroke();
      g.strokeStyle = 'rgba(30,20,20,1)';
      g.lineWidth = 3;
      g.stroke();
    }
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();

// 夜空に浮かぶ月（光源の影響を受けない明るい満月）
const SkyMoon: React.FC<{pos: V3; radius: number; spin?: number}> = ({pos, radius, spin = 0}) => (
  <group position={pos}>
    <mesh rotation={[0.2, -1.6 + spin, 0]}>
      <sphereGeometry args={[radius, 64, 48]} />
      <meshBasicMaterial map={moonTex()} color="#fffaf0" />
    </mesh>
    <mesh>
      <sphereGeometry args={[radius * 1.18, 32, 24]} />
      <meshBasicMaterial color="#cfe0ff" transparent opacity={0.08} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  </group>
);

// ---------- 夜空（グラデーション）と星 ----------
const NightDome: React.FC<{top?: string; horizon?: string}> = ({top = '#060a1c', horizon = '#1d2c52'}) => {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(460, 48, 24);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const a = new THREE.Color(horizon), b = new THREE.Color(top), tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 460;
      tmp.copy(a).lerp(b, Math.min(1, Math.max(0, y * 2.2)));
      cols.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  }, [top, horizon]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
};
const SkyStars: React.FC<{rot?: number}> = ({rot = 0}) => {
  const geo = useMemo(() => {
    const r = mulberry32(11);
    const pts: number[] = [];
    for (let i = 0; i < 1400; i++) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const v = new THREE.Vector3(s * Math.cos(th), Math.abs(u) * 0.95 + 0.03, s * Math.sin(th)).normalize().multiplyScalar(420);
      pts.push(v.x, v.y, v.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <group rotation={[0, 0, 0]}>
      <group rotation={[0.55, 0, 0]}>
        <group rotation={[0, rot, 0]}>
          <points geometry={geo}>
            <pointsMaterial color="#dfe8ff" size={1.6} sizeAttenuation={false} transparent opacity={0.85} />
          </points>
        </group>
      </group>
    </group>
  );
};

// ---------- 海辺の街 ----------
const HOUSES = (() => {
  const r = mulberry32(5);
  const walls = ['#e9e1d2', '#d9c9b0', '#c9d3da', '#e3d2c2', '#d0c4b8', '#e6e6e0'];
  const roofs = ['#6b4a3a', '#4a5468', '#7a3e36', '#3e4a40', '#5a4a6a'];
  const out: {p: V3; ry: number; wall: string; roof: string; h: number}[] = [];
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 14; i++) {
      const x = -26 + i * 4 + (r() - 0.5) * 1.2;
      const z = 6.5 + row * 4.2 + (r() - 0.5) * 0.8;
      out.push({p: [x, 0, z], ry: (r() - 0.5) * 0.2, wall: walls[Math.floor(r() * walls.length)], roof: roofs[Math.floor(r() * roofs.length)], h: r() < 0.4 ? 2 : 1});
    }
  return out;
})();
const BOATS: V3[] = [
  [-8, 0, -14],
  [5, 0, -20],
  [14, 0, -11],
  [-17, 0, -24],
];

type TownProps = {
  f: number;
  water: number; // 海面の高さ（ふだん −0.6）
  moon?: {pos: V3; radius: number};
  starRot?: number;
  quake?: number; // 0..1 家の揺れ
  volcano?: number; // 0..1 噴火
  ring?: number; // 0..1 空の輪
  ringFrom?: CamKey;
};
const Town: React.FC<TownProps> = ({f, water, moon, starRot = 0, quake = 0, volcano = 0, ring = 0, ringFrom}) => {
  const light = moon ? Math.min(2.2, 0.5 + moon.radius / 60) : 0.4;
  const moonDir: V3 = moon ? [moon.pos[0] * 0.05, Math.max(2, moon.pos[1] * 0.05), moon.pos[2] * 0.05] : [0, 10, -10];
  return (
    <>
      <NightDome />
      <SkyStars rot={starRot} />
      {moon && <SkyMoon pos={moon.pos} radius={moon.radius} />}
      {ring > 0 && ringFrom && <SkyRing k={ring} cam={ringFrom} />}
      <hemisphereLight args={['#7a93d0', '#2a2e38', 1.0 + light * 0.25]} />
      <ambientLight intensity={0.12} />
      <directionalLight position={moonDir} intensity={light} color="#cfdcff" />
      <directionalLight position={[20, 8, 12]} intensity={0.8} color="#a9bce8" />
      {/* 陸（道路から奥の街）・浜・海底 */}
      <mesh position={[0, -0.5, 16]}>
        <boxGeometry args={[140, 1, 30]} />
        <meshStandardMaterial color="#3e4636" roughness={1} />
      </mesh>
      <mesh position={[0, -2.2, -2.6]} rotation={[-0.55, 0, 0]}>
        <boxGeometry args={[140, 0.6, 6.5]} />
        <meshStandardMaterial color="#8e8068" roughness={1} />
      </mesh>
      <mesh position={[0, -4.2, -70]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[400, 130, 40, 20]} />
        <meshStandardMaterial color="#9a8a6c" roughness={1} />
      </mesh>
      <SeabedRocks />
      {/* 堤防・道路・街灯 */}
      <mesh position={[0, -0.25, 0.4]}>
        <boxGeometry args={[140, 0.5, 1.0]} />
        <meshStandardMaterial color="#8d8c88" roughness={0.9} />
      </mesh>
      <Road length={140} width={3.2} position={[0, 0, 2.8]} />
      {Array.from({length: 12}).map((_, i) => (
        <StreetLamp key={i} position={[-30 + i * 5.4, 0, 0.9]} rotationY={Math.PI / 2} on />
      ))}
      {/* 桟橋 */}
      <group position={[6, 0, -4]}>
        <mesh position={[0, 0.25, -4]}>
          <boxGeometry args={[1.6, 0.18, 10]} />
          <meshStandardMaterial color="#6b5a46" roughness={0.9} />
        </mesh>
        {Array.from({length: 6}).map((_, i) => (
          <mesh key={i} position={[0.7 * (i % 2 ? 1 : -1), -2, -8.5 + Math.floor(i / 2) * 4]}>
            <cylinderGeometry args={[0.1, 0.1, 4.6, 6]} />
            <meshStandardMaterial color="#4a3e32" />
          </mesh>
        ))}
      </group>
      {HOUSES.map((h, i) => {
        const j = quake * 0.06 * Math.sin(f * 1.7 + i * 1.3);
        return <House key={i} position={h.p} rotation={[j * 0.5, Math.PI + h.ry, j]} wall={h.wall} roof={h.roof} h={h.h} lit={(i * 7) % 5 !== 0} scale={1.6} />;
      })}
      {BOATS.map((b, i) => (
        <Boat key={i} p={[b[0], Math.max(-4.15, water) + 0.05 + Math.sin(f * 0.08 + i) * 0.06, b[2]]} tilt={water < -4.1 ? 0.35 : Math.sin(f * 0.06 + i) * 0.05} />
      ))}
      {/* 海面 */}
      <mesh position={[0, water, -60]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[400, 200]} />
        <meshStandardMaterial color="#2c5f8e" roughness={0.18} metalness={0.25} transparent opacity={0.9} />
      </mesh>
      {/* 月の光の道 */}
      {moon && water > -3.9 && (
        <mesh position={[moon.pos[0] * 0.08, water + 0.02, -40]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2 + moon.radius * 0.08, 70]} />
          <meshBasicMaterial color="#dfe8ff" transparent opacity={0.16} depthWrite={false} />
        </mesh>
      )}
      {volcano > 0 && <Volcano f={f} k={volcano} />}
    </>
  );
};
const SeabedRocks: React.FC = () => {
  const items = useMemo(() => {
    const r = mulberry32(21);
    return Array.from({length: 70}).map(() => ({p: [(r() - 0.5) * 90, -4.1, -8 - r() * 50] as V3, s: 0.3 + r() * 1.1, ry: r() * 6}));
  }, []);
  return (
    <>
      {items.map((it, i) => (
        <mesh key={i} position={it.p} rotation={[0, it.ry, 0]} scale={[it.s, it.s * 0.6, it.s]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 3 ? '#57504a' : '#3f5a48'} roughness={1} flatShading />
        </mesh>
      ))}
    </>
  );
};
const Boat: React.FC<{p: V3; tilt: number}> = ({p, tilt}) => (
  <group position={p} rotation={[0, 0.4, tilt]}>
    <mesh position={[0, 0.2, 0]}>
      <boxGeometry args={[1.2, 0.5, 3.2]} />
      <meshStandardMaterial color="#e9e5dc" roughness={0.7} />
    </mesh>
    <mesh position={[0, 0.7, -0.3]}>
      <boxGeometry args={[0.9, 0.6, 1.0]} />
      <meshStandardMaterial color="#5a7a9a" roughness={0.7} />
    </mesh>
  </group>
);
// 遠くの火山（溶岩の光と噴煙）
const Volcano: React.FC<{f: number; k: number}> = ({f, k}) => {
  const smoke = Array.from({length: 22}).map((_, i) => {
    const ph = ((f * 0.7 + i * 9) % 100) / 100;
    return {p: [70 + Math.sin(i * 2.1) * 6 * ph, 34 + ph * 50, -150 + Math.cos(i * 1.3) * 5] as V3, s: 4 + ph * 14, o: (1 - ph) * 0.55 * k};
  });
  const lava = Array.from({length: 16}).map((_, i) => {
    const t = ((f * 1.1 + i * 7) % 40) / 40;
    const a = i * 2.4;
    return [70 + Math.cos(a) * t * 16, 34 + t * 20 - t * t * 26, -150 + Math.sin(a) * t * 8] as V3;
  });
  return (
    <group>
      <mesh position={[70, 15, -150]}>
        <coneGeometry args={[40, 38, 10, 1, true]} />
        <meshStandardMaterial color="#2a2624" roughness={1} flatShading />
      </mesh>
      <mesh position={[70, 33.5, -150]}>
        <sphereGeometry args={[5, 16, 12]} />
        <meshBasicMaterial color="#ff6a2a" transparent opacity={0.9 * k} />
      </mesh>
      <pointLight position={[70, 40, -140]} intensity={60 * k} distance={160} decay={1.2} color="#ff6a3a" />
      {lava.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[1.1, 8, 6]} />
          <meshBasicMaterial color="#ffb050" transparent opacity={k} />
        </mesh>
      ))}
      {smoke.map((s, i) => (
        <mesh key={i} position={s.p} scale={s.s}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#3a3436" transparent opacity={s.o} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};
// 地上から見た輪（空にかかる光の帯）
const ringTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = 4;
    const g = cv.getContext('2d')!;
    const r = mulberry32(3);
    for (let x = 0; x < 1024; x++) {
      const u = x / 1023;
      const edge = Math.min(1, u * 8, (1 - u) * 6);
      const band = 0.45 + 0.55 * Math.abs(Math.sin(u * 37 + r() * 0.6)) * (u > 0.62 && u < 0.67 ? 0.15 : 1);
      const a = edge * band;
      g.fillStyle = `rgba(${220 + r() * 30},${210 + r() * 30},${190 + r() * 30},${a})`;
      g.fillRect(x, 0, 1, 4);
    }
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();
// RingGeometry の UV を「内側 → 外側」に貼り直す
const ringGeo = (inner: number, outer: number, seg = 256) => {
  const g = new THREE.RingGeometry(inner, outer, seg, 1);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getY(i));
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  return g;
};
const SkyRing: React.FC<{k: number; cam: CamKey}> = ({k, cam}) => {
  const geo = useMemo(() => ringGeo(300, 450), []);
  // 視線の先・地平線の下に中心を置き、少し上を向けた大きな輪 → 空に弧がかかる
  const c = skyAt(cam.pos, cam.look, 0, 0, 300);
  const center = new THREE.Vector3(c[0], c[1] - 175, c[2]);
  const m = new THREE.Matrix4().lookAt(center, new THREE.Vector3(cam.pos[0], cam.pos[1], cam.pos[2]), new THREE.Vector3(0, 1, 0));
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  return (
    <mesh geometry={geo} position={center.toArray() as V3} quaternion={q}>
      <meshBasicMaterial map={ringTex()} transparent opacity={k} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
};

// 距離（今の何倍の近さか）から空の月の大きさ
const MOON_BASE = 8.5;
const skyMoonR = (dKm: number) => MOON_BASE * (384400 / dKm);
// 場面内で距離を少しずつ縮める
const distIn = (f: number, from: number, to: number, a = 0, b = 34) => from + (to - from) * sm((f - a) / (b - a));

const TownScene: React.FC<{cam: CamKey[]; shakes?: Shake[]} & TownProps> = ({cam, shakes, ...t}) => (
  <AbsoluteFill>
    <Stage bg="#060a1c" shadows={false}>
      <CameraRig keys={cam} shakes={shakes} />
      <Town {...t} />
    </Stage>
    <Vignette strength={0.45} />
  </AbsoluteFill>
);

// 空の中の位置：カメラから見て、視線の向き（水平）から yaw 度・仰角 elev 度の方向
const skyAt = (cam: V3, look: V3, elev: number, yaw = 0, dist = 360): V3 => {
  const fx = look[0] - cam[0], fz = look[2] - cam[2];
  const a = Math.atan2(fx, fz) + (yaw * Math.PI) / 180;
  const e = (elev * Math.PI) / 180;
  return [cam[0] + Math.sin(a) * Math.cos(e) * dist, cam[1] + Math.sin(e) * dist, cam[2] + Math.cos(a) * Math.cos(e) * dist];
};

// ---------- 1. いま ----------
const CAM_M1: CamKey[] = [
  {f: 0, pos: [12, 8.5, 26], look: [-4, 2.5, -24], fov: 55},
  {f: 150, pos: [9, 8, 23], look: [-4, 2.8, -24], fov: 55, ease: LIN},
];
export const M1: React.FC = () => {
  const f = useCurrentFrame();
  return <TownScene cam={CAM_M1} f={f} water={-0.6 + 0.05 * Math.sin(f * 0.05)} moon={{pos: skyAt(CAM_M1[0].pos, CAM_M1[0].look, 5), radius: skyMoonR(384400)}} starRot={f * 0.0004} />;
};

// ---------- 2. 半分の距離：潮が道路まで ----------
const CAM_M2: CamKey[] = [
  {f: 0, pos: [-10, 7, 24], look: [2, 1.0, -20], fov: 55},
  {f: 180, pos: [-7, 6.5, 21], look: [2, 1.2, -20], fov: 55, ease: LIN},
];
export const M2: React.FC = () => {
  const f = useCurrentFrame();
  const d = distIn(f, 384400, 192200);
  const water = interpolate(f, [24, 120], [-0.6, 0.45], {...clamp, easing: (x) => x * x * (3 - 2 * x)}) + 0.05 * Math.sin(f * 0.07);
  return <TownScene cam={CAM_M2} f={f} water={water} moon={{pos: skyAt(CAM_M2[0].pos, CAM_M2[0].look, 6), radius: skyMoonR(d)}} starRot={f * 0.0004} />;
};

// ---------- 3. 4分の1：沈んでは引く ----------
const CAM_M3: CamKey[] = [
  {f: 0, pos: [6, 13, 28], look: [-2, 0, -20], fov: 55},
  {f: 180, pos: [3, 13.5, 25], look: [-2, 0.3, -20], fov: 55, ease: LIN},
];
export const M3: React.FC = () => {
  const f = useCurrentFrame();
  const d = distIn(f, 192200, 96100);
  const water = interpolate(f, [0, 60, 150, 180], [0.45, 1.5, -4.7, -4.7], {...clamp, easing: (x) => x * x * (3 - 2 * x)});
  return <TownScene cam={CAM_M3} f={f} water={water} moon={{pos: skyAt(CAM_M3[0].pos, CAM_M3[0].look, -2), radius: skyMoonR(d)}} starRot={f * 0.0005} />;
};

// ---------- 4. 静止軌道：月が止まる（星だけが回る） ----------
const CAM_M4: CamKey[] = [
  {f: 0, pos: [10, 8, 25], look: [-3, 4, -24], fov: 58},
  {f: 180, pos: [8, 8, 23], look: [-3, 4.3, -24], fov: 58, ease: LIN},
];
export const M4: React.FC = () => {
  const f = useCurrentFrame();
  const d = distIn(f, 96100, 42200);
  // 星は1日分（早送り）回るが、月は同じ場所
  const starRot = interpolate(f, [30, 180], [0, Math.PI * 0.9], clamp);
  return <TownScene cam={CAM_M4} f={f} water={1.0 + 0.04 * Math.sin(f * 0.05)} moon={{pos: skyAt(CAM_M4[0].pos, CAM_M4[0].look, 9), radius: skyMoonR(d)}} starRot={starRot} />;
};

// ---------- 5. 2万km：西から昇る・地震と噴火 ----------
const CAM_M5: CamKey[] = [
  {f: 0, pos: [10, 8, 25], look: [-3, 4, -24], fov: 58},
  {f: 180, pos: [8, 8, 23], look: [-3, 4.5, -24], fov: 58, ease: LIN},
];
export const M5: React.FC = () => {
  const f = useCurrentFrame();
  const d = distIn(f, 42200, 20000, 0, 40);
  // 西（画面の左）の地平線から昇ってくる
  const rise = interpolate(f, [0, 180], [0, 1], clamp);
  const pos = skyAt(CAM_M5[0].pos, CAM_M5[0].look, -10 + rise * 24, 30 - rise * 22);
  const quake = interpolate(f, [40, 60], [0, 1], clamp);
  const water = 0.6 + 1.0 * Math.sin(f * 0.11) * quake;
  return (
    <AbsoluteFill>
      <TownScene cam={CAM_M5} shakes={[{from: 46, dur: 140, amp: 0.25}]} f={f} water={water} moon={{pos, radius: skyMoonR(d) * 0.85}} quake={quake} volcano={interpolate(f, [60, 90], [0, 1], clamp)} starRot={f * 0.002} />
      <WestLabel f={f} />
    </AbsoluteFill>
  );
};
const WestLabel: React.FC<{f: number}> = ({f}) => {
  const k = interpolate(f, [10, 20, 50, 60], [0, 1, 1, 0], clamp);
  if (k <= 0) return null;
  return (
    <div data-telop="callout" style={{position: 'absolute', left: 80, top: 1040, opacity: k, background: 'rgba(18,18,24,0.86)', border: '2px solid rgba(255,255,255,0.55)', borderRadius: 14, padding: '6px 18px', fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900, fontSize: 34, color: '#fff', whiteSpace: 'pre'}}>
      ← 西
    </div>
  );
};

// ---------- 宇宙：月が崩れて輪になる ----------
const ER = 2.3; // 地球の半径
const ORBIT = ER * (18000 / 6371); // ロッシュ限界の軌道半径
const MOON_R = ER * 0.273;
const EARTH_C: V3 = [0, -2.6, 0];
const orbitPos = (a: number, r = ORBIT, z = 0): V3 => [EARTH_C[0] + Math.sin(a) * r, EARTH_C[1] + Math.cos(a) * r, z];
const FRAGS = (() => {
  const r = mulberry32(99);
  return Array.from({length: 420}).map(() => {
    // 月の中の位置（表面寄り）
    const u = r() * 2 - 1, th = r() * Math.PI * 2, rr = Math.pow(r(), 0.35);
    const s = Math.sqrt(1 - u * u);
    return {
      local: [s * Math.cos(th) * rr, u * rr, s * Math.sin(th) * rr] as V3,
      size: 0.05 + Math.pow(r(), 2) * 0.13,
      spread: (r() - 0.5) * 2, // 軌道に沿った広がり
      rad: (r() - 0.5) * 2, // 軌道半径方向のずれ
      z: (r() - 0.5) * 2,
      start: r(),
      spin: r() * 6,
    };
  });
})();
const Fragments: React.FC<{f: number; p: number; around: number; base: number}> = ({f, p, around, base}) => (
  <>
    {FRAGS.map((fr, i) => {
      if (p < fr.start * 0.6) return null;
      const q = Math.min(1, (p - fr.start * 0.6) / 0.4);
      // 月の位置から軌道に沿って広がる（around=1 で一周）
      const a = base + fr.spread * (0.25 * q + around * Math.PI);
      const R = ORBIT + fr.rad * (0.3 + 0.9 * q + around * 0.8);
      const center = orbitPos(a, R, fr.z * (0.2 + 0.3 * q) * (1 - around * 0.7));
      const lp = fr.local.map((v) => v * MOON_R * (1 - q)) as V3;
      return (
        <mesh key={i} position={[center[0] + lp[0], center[1] + lp[1], center[2] + lp[2]]} rotation={[fr.spin + f * 0.03, fr.spin * 2, 0]} scale={fr.size * (1 - 0.3 * around)}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 4 ? '#a8a6a0' : '#7d7b77'} roughness={1} flatShading />
        </mesh>
      );
    })}
  </>
);
const SpaceLights: React.FC = () => (
  <>
    <ambientLight intensity={0.15} />
    <hemisphereLight args={['#9fc8ff', '#0a1030', 0.35]} />
    <directionalLight position={[10, 4, 8]} intensity={3.0} color="#fff4e2" />
  </>
);

const CAM_M6: CamKey[] = [
  {f: 0, pos: [3, 1.2, 18], look: [0, 0.8, 0], fov: 46},
  {f: 180, pos: [-2, 1.6, 16.5], look: [0, 0.9, 0], fov: 46, ease: LIN},
];
export const M6: React.FC = () => {
  const f = useCurrentFrame();
  const base = f * 0.0015;
  const mp = orbitPos(base);
  const crack = interpolate(f, [10, 60], [0, 1], clamp);
  const breakP = interpolate(f, [60, 175], [0, 1], clamp);
  const core = 1 - sm(breakP * 1.4);
  const co = CO('m6_break', 'roche');
  const pt = project(CAM_M6, f, mp);
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM_M6} shakes={[{from: 60, dur: 30, amp: 0.06}]} />
        <SpaceLights />
        <SpaceBackdrop />
        <Stars />
        <Earth radius={ER} real detail={110} spin={2.4 + f * 0.004} tilt={0.3} cloudOpacity={0.5} position={EARTH_C} />
        {/* ロッシュ限界の軌道（点線の円） */}
        <mesh position={EARTH_C}>
          <ringGeometry args={[ORBIT - 0.015, ORBIT + 0.015, 160]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.25 * (1 - breakP)} />
        </mesh>
        {core > 0.01 && (
          <group position={mp} scale={core}>
            <mesh rotation={[0, -1.2, 0]} scale={[1 + 0.08 * crack, 1, 1]}>
              <sphereGeometry args={[MOON_R, 64, 48]} />
              <meshStandardMaterial map={moonTex()} roughness={1} />
            </mesh>
            <mesh rotation={[0, -1.2, 0]} scale={[1.005 + 0.08 * crack, 1.005, 1.005]}>
              <sphereGeometry args={[MOON_R, 64, 48]} />
              <meshBasicMaterial map={crackTex()} transparent opacity={crack} depthWrite={false} />
            </mesh>
          </group>
        )}
        <Fragments f={f} p={breakP} around={0} base={base} />
      </Stage>
      <CalloutView x={pt.x} y={pt.y} tag={co.tag} text={co.text} from={co.from} to={co.to} dx={co.dx} dy={co.dy} />
    </AbsoluteFill>
  );
};

const CAM_M7: CamKey[] = [
  {f: 0, pos: [-2, 1.6, 16.5], look: [0, 0.9, 0], fov: 46},
  {f: 110, pos: [-6, 5.5, 13], look: [0, -1.2, 0], fov: 46},
  {f: 200, pos: [-9, 7.0, 11], look: [0, -1.8, 0], fov: 46, ease: LIN},
];
export const M7: React.FC = () => {
  const f = useCurrentFrame();
  const around = interpolate(f, [0, 150], [0, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 2)});
  const ringK = interpolate(f, [70, 170], [0, 1], clamp);
  const geo = useMemo(() => ringGeo(ORBIT * 0.8, ORBIT * 1.45), []);
  // 輪は地球の赤道面（傾き付き）に落ち着く
  const tiltK = sm(f / 140);
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig keys={CAM_M7} />
        <SpaceLights />
        <SpaceBackdrop />
        <Stars />
        <Earth radius={ER} real detail={110} spin={2.6 + f * 0.004} tilt={0.3} cloudOpacity={0.5} position={EARTH_C} />
        <group position={EARTH_C} rotation={[(-Math.PI / 2 + 0.25) * tiltK, 0, 0]}>
          <group position={[-EARTH_C[0], -EARTH_C[1], 0]}>
            <Fragments f={f + 180} p={1} around={around} base={0.27 + f * 0.004} />
          </group>
          <mesh geometry={geo}>
            <meshBasicMaterial map={ringTex()} transparent opacity={0.8 * ringK} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- 8. 地上から見上げる輪 ----------
const CAM_M8: CamKey[] = [
  {f: 0, pos: [5, 4, 22], look: [-2, 14, -30], fov: 60},
  {f: 130, pos: [3, 4.2, 20], look: [-2, 15, -30], fov: 60, ease: LIN},
];
export const M8: React.FC = () => {
  const f = useCurrentFrame();
  return <TownScene cam={CAM_M8} f={f} water={-0.6 + 0.04 * Math.sin(f * 0.05)} ring={1} ringFrom={CAM_M8[0]} starRot={f * 0.0005} />;
};
