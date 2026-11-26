import React, {useMemo} from 'react';
import * as THREE from 'three';
import {mulberry32} from '../lib/rand';
import {V3} from '../lib/anim';

// 体育館：x 方向がコートの長辺（ネットは x=0）、+x が「自分たちのチーム」、-x が相手チーム。
export const COURT = {L: 9, W: 4.5}; // 半分の長さ・幅（18m × 9m）
export const NET_H = 2.43;
export const GYM = {x: 22, z: 15, h: 12};

const canvasTex = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
};

// 木の床（フローリング）＋コートライン
const floorTex = () =>
  canvasTex(2048, 1400, (ctx) => {
    const W = 2048, H = 1400;
    const r = mulberry32(8);
    // 板目
    const plankH = 18;
    for (let y = 0; y < H; y += plankH) {
      let x = -r() * 300;
      while (x < W) {
        const len = 180 + r() * 260;
        const l = 58 + r() * 10;
        ctx.fillStyle = `hsl(${30 + r() * 6}, ${48 + r() * 10}%, ${l}%)`;
        ctx.fillRect(x, y, len, plankH);
        ctx.fillStyle = 'rgba(80,45,20,0.18)';
        ctx.fillRect(x, y, 2, plankH);
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = `rgba(120,70,30,${0.05 + r() * 0.06})`;
          ctx.fillRect(x + r() * len, y + r() * plankH, 30 + r() * 80, 1.5);
        }
        x += len;
      }
      ctx.fillStyle = 'rgba(80,45,20,0.25)';
      ctx.fillRect(0, y, W, 1.5);
    }
    // コート（44m × 30m の床に 18m × 9m）
    const sx = W / (GYM.x * 2), sz = H / (GYM.z * 2);
    const X = (x: number) => W / 2 + x * sx, Z = (z: number) => H / 2 + z * sz;
    ctx.fillStyle = 'rgba(214,120,60,0.55)';
    ctx.fillRect(X(-COURT.L - 3), Z(-COURT.W - 3), (COURT.L + 3) * 2 * sx, (COURT.W + 3) * 2 * sz);
    ctx.fillStyle = 'rgba(70,120,190,0.55)';
    ctx.fillRect(X(-COURT.L), Z(-COURT.W), COURT.L * 2 * sx, COURT.W * 2 * sz);
    ctx.strokeStyle = '#f4f2ea';
    ctx.lineWidth = 0.05 * sx;
    ctx.strokeRect(X(-COURT.L), Z(-COURT.W), COURT.L * 2 * sx, COURT.W * 2 * sz);
    for (const x of [-3, 0, 3]) {
      ctx.beginPath();
      ctx.moveTo(X(x), Z(-COURT.W));
      ctx.lineTo(X(x), Z(COURT.W));
      ctx.stroke();
    }
  });

const wallTex = () =>
  canvasTex(
    512,
    256,
    (ctx) => {
      ctx.fillStyle = '#d9d6cf';
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#b9b5ac';
      ctx.fillRect(0, 190, 512, 66);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      for (let x = 0; x < 512; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 256);
        ctx.stroke();
      }
    },
    [10, 1],
  );

// 得点板
export const Scoreboard: React.FC<{us: number; them: number; position: V3; rotY?: number; flash?: number}> = ({us, them, position, rotY = 0, flash = 0}) => {
  const tex = useMemo(
    () =>
      canvasTex(640, 300, (ctx) => {
        ctx.fillStyle = '#15171c';
        ctx.fillRect(0, 0, 640, 300);
        ctx.font = "900 44px 'Noto Sans JP', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff8a6a';
        ctx.fillText('HOME', 160, 60);
        ctx.fillStyle = '#8fc3ff';
        ctx.fillText('GUEST', 480, 60);
        ctx.font = "900 170px 'Noto Sans JP', sans-serif";
        ctx.fillStyle = '#ffd25a';
        ctx.fillText(String(us), 160, 250);
        ctx.fillText(String(them), 480, 250);
        ctx.fillStyle = '#555';
        ctx.fillRect(318, 90, 4, 180);
      }),
    [us, them],
  );
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh>
        <boxGeometry args={[4.4, 2.2, 0.2]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <mesh position={[0, 0, 0.11]}>
        <planeGeometry args={[4.1, 1.92]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.9 + flash} />
      </mesh>
    </group>
  );
};

// ネット（揺れ shake で波打つ）
export const Net: React.FC<{shake?: number; t?: number}> = ({shake = 0, t = 0}) => {
  const tex = useMemo(
    () =>
      canvasTex(
        64,
        64,
        (ctx) => {
          ctx.clearRect(0, 0, 64, 64);
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = 3;
          ctx.strokeRect(0, 0, 64, 64);
        },
        [100, 10],
      ),
    [],
  );
  const geo = useMemo(() => new THREE.PlaneGeometry(10, 1, 40, 6), []);
  const g = useMemo(() => {
    const gg = geo.clone();
    if (shake > 0) {
      const p = gg.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        p.setZ(i, Math.sin(x * 1.2 + t * 0.9) * shake * Math.exp(-Math.abs(x) * 0.25));
      }
      gg.computeVertexNormals();
    }
    return gg;
  }, [geo, shake, t]);
  return (
    <group position={[0, NET_H - 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
      <mesh geometry={g}>
        <meshStandardMaterial map={tex} transparent alphaTest={0.3} side={THREE.DoubleSide} color="#222" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[10, 0.07, 0.02]} />
        <meshStandardMaterial color="#f4f4f4" />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* 支柱 */}
          <mesh position={[s * 5.6, -0.5 - (NET_H - 0.5) / 2 + 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, NET_H + 0.3, 12]} />
            <meshStandardMaterial color="#c8ccd2" metalness={0.6} roughness={0.35} />
          </mesh>
          {/* アンテナ（紅白） */}
          {Array.from({length: 9}).map((_, k) => (
            <mesh key={k} position={[s * 4.5, 0.55 + k * 0.1, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.1, 6]} />
              <meshStandardMaterial color={k % 2 ? '#ffffff' : '#d23f33'} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

// 体育館の建物（床・壁・高窓・天井の鉄骨・照明）。窓が割れる shatter 0..1
export const Gym: React.FC<{shatter?: number; hole?: boolean; wallHole?: boolean}> = ({shatter = 0, hole = false, wallHole = false}) => {
  const ft = useMemo(() => floorTex(), []);
  const wt = useMemo(() => wallTex(), []);
  const {x: GX, z: GZ, h: GH} = GYM;
  const windows = useMemo(() => {
    const out: {x: number; z: number; ry: number}[] = [];
    for (let x = -18; x <= 18; x += 4) {
      out.push({x, z: -GZ + 0.05, ry: 0});
      out.push({x, z: GZ - 0.05, ry: Math.PI});
    }
    return out;
  }, [GZ]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GX * 2, GZ * 2]} />
        <meshStandardMaterial map={ft} roughness={0.45} metalness={0.05} />
      </mesh>
      {/* 壁 */}
      {[
        [0, -GZ, 0, GX * 2],
        [0, GZ, Math.PI, GX * 2],
        [-GX, 0, Math.PI / 2, GZ * 2],
        [GX, 0, -Math.PI / 2, GZ * 2],
      ].map(([x, z, ry, w], i) =>
        wallHole && i === 3 ? (
          <group key={i}>
            {/* 自分たち側の奥の壁：ボールが抜けた穴（y 2.0〜4.4, z ±1.2） */}
            <mesh position={[x, GH / 2, z - (w / 4 + 0.6)]} rotation={[0, ry, 0]}>
              <planeGeometry args={[w / 2 - 1.2, GH]} />
              <meshStandardMaterial map={wt} roughness={0.9} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[x, GH / 2, z + (w / 4 + 0.6)]} rotation={[0, ry, 0]}>
              <planeGeometry args={[w / 2 - 1.2, GH]} />
              <meshStandardMaterial map={wt} roughness={0.9} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[x, 1.0, z]} rotation={[0, ry, 0]}>
              <planeGeometry args={[2.4, 2.0]} />
              <meshStandardMaterial map={wt} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[x, (GH + 4.4) / 2, z]} rotation={[0, ry, 0]}>
              <planeGeometry args={[2.4, GH - 4.4]} />
              <meshStandardMaterial map={wt} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ) : (
          <mesh key={i} position={[x, GH / 2, z]} rotation={[0, ry, 0]} receiveShadow>
            <planeGeometry args={[w, GH]} />
            <meshStandardMaterial map={wt} roughness={0.9} />
          </mesh>
        ),
      )}
      {/* 高窓 */}
      {windows.map((w, i) => {
        const broken = shatter > 0 && (i * 7) % 10 < shatter * 10;
        return (
          <group key={i} position={[w.x, 8.6, w.z]} rotation={[0, w.ry, 0]}>
            <mesh position={[0, 0, 0.02]}>
              <planeGeometry args={[3.2, 2.4]} />
              <meshStandardMaterial color={broken ? '#232a33' : '#bfe0f5'} emissive={broken ? '#000' : '#cfe8ff'} emissiveIntensity={broken ? 0 : 0.6} roughness={0.1} />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <boxGeometry args={[0.08, 2.4, 0.04]} />
              <meshStandardMaterial color="#7b8088" />
            </mesh>
          </group>
        );
      })}
      {/* 天井と鉄骨トラス */}
      <mesh position={[0, GH, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[GX * 2, GZ * 2]} />
        <meshStandardMaterial color="#8f939a" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({length: 9}).map((_, i) => (
        <group key={i} position={[-18 + i * 4.5, GH - 0.6, 0]}>
          <mesh>
            <boxGeometry args={[0.2, 0.2, GZ * 2]} />
            <meshStandardMaterial color="#5d636b" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.8, 0]}>
            <boxGeometry args={[0.14, 0.14, GZ * 2]} />
            <meshStandardMaterial color="#5d636b" metalness={0.5} roughness={0.5} />
          </mesh>
          {[-8, -3, 3, 8].map((z) => (
            <mesh key={z} position={[0, -1.0, z]}>
              <boxGeometry args={[0.8, 0.12, 0.8]} />
              <meshStandardMaterial color="#fffbea" emissive="#fff4d6" emissiveIntensity={1.6} />
            </mesh>
          ))}
        </group>
      ))}
      {/* 床の穴（4本目） */}
      {hole && (
        <group position={[-4.2, 0.012, 1.2]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.55, 24]} />
            <meshBasicMaterial color="#0d0b09" />
          </mesh>
          {Array.from({length: 10}).map((_, k) => {
            const a = (k / 10) * Math.PI * 2;
            return (
              <mesh key={k} position={[Math.cos(a) * 0.75, 0.04, Math.sin(a) * 0.75]} rotation={[-Math.PI / 2 + 0.3 * Math.sin(k), 0, a]}>
                <planeGeometry args={[0.5, 0.12]} />
                <meshStandardMaterial color="#b98455" />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};

// バレーボール（黄・青のパネル）。heat で赤熱、trail で残像
export const Ball: React.FC<{position: V3; spin?: number; heat?: number; scale?: number}> = ({position, spin = 0, heat = 0, scale = 1}) => {
  const tex = useMemo(
    () =>
      canvasTex(512, 256, (ctx) => {
        const cols = ['#f2c230', '#2f5fae', '#f4f4ef'];
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = cols[i % 3];
          ctx.beginPath();
          ctx.moveTo((i * 512) / 6 - 40, 0);
          ctx.bezierCurveTo((i * 512) / 6 + 40, 80, (i * 512) / 6 - 40, 176, (i * 512) / 6 + 40, 256);
          ctx.lineTo(((i + 1) * 512) / 6 + 40, 256);
          ctx.bezierCurveTo(((i + 1) * 512) / 6 - 40, 176, ((i + 1) * 512) / 6 + 40, 80, ((i + 1) * 512) / 6 - 40, 0);
          ctx.fill();
        }
      }),
    [],
  );
  return (
    <group position={position} scale={scale}>
      <mesh rotation={[spin, spin * 0.7, 0]} castShadow>
        <sphereGeometry args={[0.105, 32, 24]} />
        <meshStandardMaterial map={tex} roughness={0.55} emissive={new THREE.Color('#ff5a1a')} emissiveIntensity={heat * 2.5} />
      </mesh>
      {heat > 0.05 && (
        <mesh scale={1 + heat * 1.8}>
          <sphereGeometry args={[0.11, 16, 12]} />
          <meshBasicMaterial color="#ffb060" transparent opacity={0.35 * heat} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};

// 速い球の残像（start→end を細長い光の帯で）
export const Streak: React.FC<{from: V3; to: V3; color?: string; width?: number; opacity?: number}> = ({from, to, color = '#fff3c4', width = 0.08, opacity = 0.7}) => {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  if (len < 0.01) return null;
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return (
    <mesh position={mid.toArray()} quaternion={q}>
      <cylinderGeometry args={[width * 0.25, width, len, 12, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

// 衝撃波の円錐（音速突破）
export const ShockCone: React.FC<{position: V3; dir: V3; k: number}> = ({position, dir, k}) => {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize().negate());
  return (
    <mesh position={position} quaternion={q}>
      <coneGeometry args={[0.6 + k * 2.4, 1.4 + k * 4, 32, 1, true]} />
      <meshBasicMaterial color="#e8f3ff" transparent opacity={0.28 * (1 - k)} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
};
