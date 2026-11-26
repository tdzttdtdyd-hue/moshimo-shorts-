import React, {useMemo} from 'react';
import * as THREE from 'three';
import {mulberry32, fbm3} from '../lib/rand';
import {V3} from '../lib/anim';

// ---------- テクスチャ ----------
const canvasTex = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D, r: () => number) => void, repeat?: [number, number], seed = 1) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, mulberry32(seed));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
};

// 1円玉の面（簡略化したデザイン：表＝若木と「日本国」「一円」、裏＝「1」）
const coinFace = (side: 'front' | 'back') =>
  canvasTex(512, 512, (ctx) => {
    const g = ctx.createRadialGradient(200, 180, 20, 256, 256, 256);
    g.addColorStop(0, '#f4f5f6');
    g.addColorStop(0.7, '#c9ccd1');
    g.addColorStop(1, '#a9adb3');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(90,95,102,0.55)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(256, 256, 236, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(95,100,108,0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (side === 'back') {
      ctx.font = "900 300px 'Noto Serif JP', serif";
      ctx.fillText('1', 256, 270);
    } else {
      // 若木（幹と葉）
      ctx.strokeStyle = 'rgba(95,100,108,0.8)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(256, 360);
      ctx.lineTo(256, 190);
      ctx.stroke();
      for (const [x, y, a] of [
        [210, 230, -0.6],
        [302, 230, 0.6],
        [205, 300, -0.5],
        [307, 300, 0.5],
        [256, 170, 0],
      ] as [number, number, number][]) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 26, 50, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.font = "700 56px 'Noto Serif JP', serif";
      ctx.fillText('日本国', 256, 96);
      ctx.fillText('一円', 256, 420);
    }
  });

// たくさんの1円玉が重なった表面（山・荷台・ドームを埋める用）
export const pileTex = (repeat: [number, number]) =>
  canvasTex(
    1024,
    1024,
    (ctx, r) => {
      ctx.fillStyle = '#8e9298';
      ctx.fillRect(0, 0, 1024, 1024);
      for (let i = 0; i < 2600; i++) {
        const x = r() * 1024, y = r() * 1024, rad = 16 + r() * 8;
        const sq = 0.35 + r() * 0.65; // 傾きで楕円に
        const ang = r() * Math.PI;
        const l = 58 + r() * 30;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.scale(1, sq);
        const g = ctx.createRadialGradient(-rad * 0.3, -rad * 0.3, 1, 0, 0, rad);
        g.addColorStop(0, `hsl(215, 6%, ${Math.min(96, l + 22)}%)`);
        g.addColorStop(1, `hsl(215, 6%, ${l - 14}%)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(70,74,80,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    },
    repeat,
    77,
  );

const woodTex = (repeat: [number, number], base = '#9b6a42') =>
  canvasTex(
    512,
    512,
    (ctx, r) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 160; i++) {
        ctx.strokeStyle = `rgba(60,35,18,${0.05 + r() * 0.12})`;
        ctx.lineWidth = 1 + r() * 3;
        ctx.beginPath();
        const y = r() * 512;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(170, y + (r() - 0.5) * 30, 340, y + (r() - 0.5) * 30, 512, y + (r() - 0.5) * 20);
        ctx.stroke();
      }
    },
    repeat,
    5,
  );

// ---------- 1円玉 ----------
export const COIN_R = 0.01; // 半径 1cm
export const COIN_T = 0.0015; // 厚さ 1.5mm
let coinMats: THREE.Material[] | null = null;
const getCoinMats = () => {
  if (coinMats) return coinMats;
  const edge = new THREE.MeshStandardMaterial({color: '#cfd3d8', metalness: 0.3, roughness: 0.35});
  const front = new THREE.MeshStandardMaterial({map: coinFace('front'), metalness: 0.25, roughness: 0.35});
  const back = new THREE.MeshStandardMaterial({map: coinFace('back'), metalness: 0.25, roughness: 0.35});
  coinMats = [edge, front, back];
  return coinMats;
};
export const Coin: React.FC<{position?: V3; rotation?: V3; scale?: number}> = ({position = [0, 0, 0], rotation = [0, 0, 0], scale = 1}) => {
  const mats = useMemo(() => getCoinMats(), []);
  return (
    <mesh position={position} rotation={rotation} scale={scale} material={mats} castShadow receiveShadow>
      <cylinderGeometry args={[COIN_R, COIN_R, COIN_T, 48]} />
    </mesh>
  );
};

// たくさんの1円玉（インスタンス化）。n 枚を指定の置き方で並べる
export const CoinField: React.FC<{n: number; place: (i: number, r: () => number) => {p: V3; r: V3}; seed?: number; scale?: number}> = ({n, place, seed = 1, scale = 1}) => {
  const geo = useMemo(() => new THREE.CylinderGeometry(COIN_R, COIN_R, COIN_T, 24), []);
  const mats = useMemo(() => getCoinMats(), []);
  const max = 1100;
  const tmp = new THREE.Object3D();
  return (
    <instancedMesh
      args={[geo, mats, max]}
      castShadow
      receiveShadow
      ref={(m) => {
        if (!m) return;
        const r = mulberry32(seed);
        for (let i = 0; i < max; i++) {
          const q = place(i, r);
          tmp.position.set(...q.p);
          tmp.rotation.set(...q.r);
          tmp.scale.setScalar(i < n ? scale : 0);
          tmp.updateMatrix();
          m.setMatrixAt(i, tmp.matrix);
        }
        m.instanceMatrix.needsUpdate = true;
      }}
    />
  );
};

// 1円玉の山（でこぼこの盛り上がり）
export const CoinHeap: React.FC<{position: V3; radius: number; height: number; seed?: number; rough?: number; repeat?: number}> = ({position, radius, height, seed = 1, rough = 0.12, repeat = 6}) => {
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(1, 64, 0, Math.PI * 2);
    const seg = new THREE.PlaneGeometry(2, 2, 80, 80);
    g.dispose();
    const p = seg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const d = Math.hypot(x, y);
      const k = Math.max(0, 1 - d);
      const h = Math.pow(k, 0.85) * (1 + rough * fbm3(x * 3, y * 3, seed, seed, 3));
      p.setZ(i, d >= 1 ? -0.02 : h);
    }
    seg.computeVertexNormals();
    seg.rotateX(-Math.PI / 2);
    return seg;
  }, [seed, rough]);
  const tex = useMemo(() => pileTex([repeat, repeat]), [repeat]);
  return (
    <mesh geometry={geo} position={position} scale={[radius, height, radius]} castShadow receiveShadow>
      <meshStandardMaterial map={tex} metalness={0.2} roughness={0.42} />
    </mesh>
  );
};

// ---------- 部屋と机 ----------
export const Room: React.FC<{floorCreak?: number}> = ({floorCreak = 0}) => {
  const floor = useMemo(() => woodTex([4, 4], '#a8794d'), []);
  const desk = useMemo(() => woodTex([1, 1], '#7a5233'), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, floorCreak * 0.01]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial map={floor} roughness={0.6} />
      </mesh>
      {[
        [0, 1.4, -3, 0],
        [-3, 1.4, 0, Math.PI / 2],
        [3, 1.4, 0, -Math.PI / 2],
      ].map(([x, y, z, ry], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, ry, 0]} receiveShadow>
          <planeGeometry args={[6, 2.8]} />
          <meshStandardMaterial color={i === 0 ? '#e8e2d6' : '#ddd6c9'} roughness={0.95} />
        </mesh>
      ))}
      {/* 窓 */}
      <mesh position={[-0.6, 1.6, -2.99]}>
        <planeGeometry args={[1.6, 1.1]} />
        <meshStandardMaterial color="#dff0fb" emissive="#e8f4ff" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[-0.6, 1.6, -2.98]}>
        <boxGeometry args={[0.04, 1.1, 0.02]} />
        <meshStandardMaterial color="#f4f4f2" />
      </mesh>
      {/* 机 */}
      <group position={[0.4, 0, -1.6]}>
        <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.04, 0.7]} />
          <meshStandardMaterial map={desk} roughness={0.5} />
        </mesh>
        {[
          [-0.65, -0.3],
          [0.65, -0.3],
          [-0.65, 0.3],
          [0.65, 0.3],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.36, z]} castShadow>
            <boxGeometry args={[0.04, 0.72, 0.04]} />
            <meshStandardMaterial color="#5c3d26" />
          </mesh>
        ))}
        {/* 本・ペン立て */}
        <mesh position={[-0.5, 0.79, -0.2]} rotation={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.22, 0.1, 0.3]} />
          <meshStandardMaterial color="#2f5d8a" />
        </mesh>
        <mesh position={[0.52, 0.8, -0.22]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.12, 16]} />
          <meshStandardMaterial color="#c0392b" />
        </mesh>
      </group>
    </group>
  );
};
export const DESK_TOP: V3 = [0.4, 0.742, -1.6];

// ---------- 1円玉の塔（積み上げた円柱。側面にギザの代わりに細い横縞） ----------
export const CoinTower: React.FC<{position: V3; height: number}> = ({position, height}) => {
  const tex = useMemo(
    () =>
      canvasTex(
        64,
        256,
        (ctx) => {
          for (let y = 0; y < 256; y += 4) {
            ctx.fillStyle = y % 8 ? '#c8ccd2' : '#9a9ea5';
            ctx.fillRect(0, y, 64, 4);
          }
        },
        [1, 400],
      ),
    [],
  );
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]} castShadow>
      <cylinderGeometry args={[0.35, 0.35, height, 32, 1, true]} />
      <meshStandardMaterial map={tex} metalness={0.3} roughness={0.35} />
    </mesh>
  );
};

// ---------- ダンプトラック（荷台に1円玉） ----------
export const Truck: React.FC<{position: V3; rotY?: number; color?: string; load?: number}> = ({position, rotY = 0, color = '#e8eef3', load = 1}) => {
  const tex = useMemo(() => pileTex([2, 1]), []);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* 荷台 */}
      <mesh position={[-1.0, 1.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.2, 1.2, 2.4]} />
        <meshStandardMaterial color="#d9a23a" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[-1.0, 1.96 + load * 0.25, 0]} scale={[2.5, load * 0.5, 1.12]} castShadow>
        <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial map={tex} metalness={0.2} roughness={0.42} />
      </mesh>
      {/* 運転席 */}
      <mesh position={[2.35, 1.35, 0]} castShadow>
        <boxGeometry args={[1.6, 2.0, 2.4]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[3.16, 1.75, 0]}>
        <boxGeometry args={[0.02, 0.8, 2.1]} />
        <meshStandardMaterial color="#1d2630" roughness={0.1} metalness={0.5} />
      </mesh>
      <mesh position={[0.8, 0.55, 0]}>
        <boxGeometry args={[6.4, 0.3, 2.0]} />
        <meshStandardMaterial color="#2a2c30" />
      </mesh>
      {[-2.6, -1.2, 2.4].map((x) =>
        [-1.05, 1.05].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.5, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.5, 0.36, 20]} />
            <meshStandardMaterial color="#1b1c1f" roughness={0.9} />
          </mesh>
        )),
      )}
    </group>
  );
};

// ---------- ドーム球場 ----------
export const Dome: React.FC<{fill: number}> = ({fill}) => {
  const tex = useMemo(() => pileTex([10, 10]), []);
  return (
    <group>
      {/* 外壁 */}
      <mesh position={[0, 8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[100, 102, 16, 64, 1, true]} />
        <meshStandardMaterial color="#e6e8ea" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* 屋根の膜（少し透けて中が見える） */}
      <mesh position={[0, 16, 0]} scale={[100, 30, 100]}>
        <sphereGeometry args={[1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f4f5f6" roughness={0.6} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* 中を満たす1円玉 */}
      <mesh position={[0, 0, 0]} scale={[99, Math.max(0.1, fill * 46), 99]}>
        <sphereGeometry args={[1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial map={tex} metalness={0.2} roughness={0.42} />
      </mesh>
      {/* 入口からあふれ出す */}
      {fill > 0.85 &&
        [0, 1.6, 3.4, 4.8].map((a, i) => (
          <CoinHeap key={i} position={[Math.cos(a) * 106, 0, Math.sin(a) * 106]} radius={14 * (fill - 0.8) * 5} height={7 * (fill - 0.8) * 5} seed={i + 3} repeat={8} />
        ))}
    </group>
  );
};

// ---------- 宇宙の天びん ----------
export const Balance: React.FC<{tilt: number; children: [React.ReactNode, React.ReactNode]}> = ({tilt, children}) => {
  const L = 7;
  return (
    <group>
      <mesh position={[0, -6, 0]}>
        <cylinderGeometry args={[0.18, 0.3, 10, 16]} />
        <meshStandardMaterial color="#c9a44a" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, -1, 0]}>
        <sphereGeometry args={[0.45, 24, 16]} />
        <meshStandardMaterial color="#c9a44a" metalness={0.8} roughness={0.3} />
      </mesh>
      <group position={[0, -1, 0]} rotation={[0, 0, tilt]}>
        <mesh>
          <boxGeometry args={[L * 2, 0.25, 0.25]} />
          <meshStandardMaterial color="#c9a44a" metalness={0.8} roughness={0.3} />
        </mesh>
        {[-1, 1].map((s, i) => (
          <group key={s} position={[s * L, 0, 0]} rotation={[0, 0, -tilt]}>
            {[-1, 1].map((k) => (
              <mesh key={k} position={[k * 1.2, -1.6, 0]} rotation={[0, 0, k * 0.35]}>
                <cylinderGeometry args={[0.03, 0.03, 3.4, 6]} />
                <meshStandardMaterial color="#c9a44a" metalness={0.8} roughness={0.3} />
              </mesh>
            ))}
            <mesh position={[0, -3.2, 0]}>
              <cylinderGeometry args={[2.2, 1.6, 0.25, 32]} />
              <meshStandardMaterial color="#c9a44a" metalness={0.8} roughness={0.3} />
            </mesh>
            <group position={[0, -3.1, 0]}>{children[i]}</group>
          </group>
        ))}
      </group>
    </group>
  );
};

// ---------- 駄菓子屋 ----------
export const CandyShop: React.FC = () => {
  const floor = useMemo(() => woodTex([3, 3], '#8a6440'), []);
  const r = mulberry32(14);
  const boxes = Array.from({length: 42}).map((_, i) => ({row: i % 3, col: Math.floor(i / 3), c: ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#ff7aa8'][Math.floor(r() * 7)], h: 0.12 + r() * 0.1}));
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial map={floor} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.5, -2.2]} receiveShadow>
        <planeGeometry args={[8, 3]} />
        <meshStandardMaterial color="#e6d9c2" roughness={0.95} />
      </mesh>
      {/* 棚と駄菓子 */}
      {[0.5, 0.95, 1.4].map((y, row) => (
        <group key={row}>
          <mesh position={[0, y, -2.0]} castShadow receiveShadow>
            <boxGeometry args={[4.6, 0.04, 0.4]} />
            <meshStandardMaterial color="#7a5233" />
          </mesh>
          {boxes
            .filter((b) => b.row === row)
            .map((b, i) => (
              <mesh key={i} position={[-2.1 + i * 0.32, y + b.h / 2 + 0.02, -2.0]} castShadow>
                <boxGeometry args={[0.26, b.h, 0.26]} />
                <meshStandardMaterial color={b.c} roughness={0.5} />
              </mesh>
            ))}
        </group>
      ))}
      {/* レジ台 */}
      <mesh position={[0, 0.45, -0.4]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.9, 0.7]} />
        <meshStandardMaterial color="#9b6a42" roughness={0.6} />
      </mesh>
      <mesh position={[0.6, 0.98, -0.45]} castShadow>
        <boxGeometry args={[0.4, 0.16, 0.3]} />
        <meshStandardMaterial color="#444a52" />
      </mesh>
    </group>
  );
};

// 店員が掲げる札
export const SignBoard: React.FC<{position: V3; rotation?: V3; scale?: number}> = ({position, rotation = [0, 0, 0], scale = 1}) => {
  const tex = useMemo(
    () =>
      canvasTex(512, 320, (ctx) => {
        ctx.fillStyle = '#fffdf6';
        ctx.fillRect(0, 0, 512, 320);
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 14;
        ctx.strokeRect(10, 10, 492, 300);
        ctx.fillStyle = '#c0392b';
        ctx.textAlign = 'center';
        ctx.font = "900 64px 'Noto Sans JP', sans-serif";
        ctx.fillText('1円玉は', 256, 120);
        ctx.font = "900 92px 'Noto Sans JP', sans-serif";
        ctx.fillText('20枚まで', 256, 240);
      }),
    [],
  );
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh castShadow>
        <boxGeometry args={[0.62, 0.395, 0.012]} />
        <meshStandardMaterial color="#d9d2c4" />
      </mesh>
      <mesh position={[0, 0, 0.007]}>
        <planeGeometry args={[0.6, 0.375]} />
        <meshStandardMaterial map={tex} roughness={0.8} />
      </mesh>
    </group>
  );
};
