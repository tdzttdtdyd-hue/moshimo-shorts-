import React, {useMemo} from 'react';
import * as THREE from 'three';
import {mulberry32} from '../../lib/rand';
import {asphalt, facade, paving, signTex, vendingTex} from './textures';

// ワールド座標：+x=西, -x=東, -z=南（東京湾）, +z=北。大通りは z 方向に延びる
export const ROAD_HALF = 4;
export const WALK = 3.4; // 歩道幅
export const CROSS_Z = -36; // 交差点
export const BAY_Z = -128;
export const HOME = {x: -11.5, z: -8, h: 29.4}; // 「あなた」が避難するビル

export type Bldg = {x: number; z: number; w: number; d: number; h: number; seed: number; side: number; shop: boolean; sign?: number; home?: boolean};

const BASES = ['#d9d4c7', '#c9c2b4', '#e4e0d6', '#b9b2a6', '#cfd3d6', '#a89f93', '#d6cbb8', '#bfc5c9'];

export const useLayout = () =>
  useMemo(() => {
    const r = mulberry32(2024);
    const bldgs: Bldg[] = [];
    for (const side of [-1, 1]) {
      let z = 34;
      while (z > BAY_Z + 8) {
        const w = 7 + r() * 5;
        const zc = z - w / 2;
        const nearCross = Math.abs(zc - CROSS_Z) < 4 + w / 2;
        if (!nearCross) {
          const isHome = side < 0 && Math.abs(zc - HOME.z) < w / 2 + 0.5;
          const floors = isHome ? 9 : 3 + Math.floor(r() * 5);
          const d = 9 + r() * 4;
          bldgs.push({
            x: side * (ROAD_HALF + WALK + d / 2),
            z: isHome ? HOME.z : zc,
            w: isHome ? 10 : w - 0.4,
            d,
            h: isHome ? HOME.h : floors * 3.2 + 0.6,
            seed: Math.floor(r() * 1000),
            side,
            shop: r() < 0.75,
            sign: r() < 0.6 ? Math.floor(r() * 12) : undefined,
            home: isHome,
          });
          if (isHome) z = HOME.z - 5;
        }
        z -= w;
      }
    }
    // 周囲の街並み（インスタンス化）
    const filler: {x: number; z: number; w: number; d: number; h: number; c: number}[] = [];
    for (let x = -160; x <= 160; x += 13) {
      for (let z = -120; z <= 70; z += 13) {
        if (Math.abs(x) < 22 && z > BAY_Z && z < 50) continue;
        if (Math.abs(z - CROSS_Z) < 7 && Math.abs(x) < 70) continue;
        const dist = Math.hypot(x, z + 20);
        const far = dist / 160;
        // 屋上からの見晴らしを確保するため、近くは低め・遠くに高層ビル
        const h = dist < 95 ? 7 + r() * 17 : 10 + r() * (20 + far * 50) + (r() < 0.12 ? 45 : 0);
        filler.push({x: x + (r() - 0.5) * 4, z: z + (r() - 0.5) * 4, w: 7 + r() * 5, d: 7 + r() * 5, h, c: r()});
      }
    }
    return {bldgs, filler};
  }, []);

const roofMat = (snow: number) => new THREE.MeshStandardMaterial({color: new THREE.Color('#8f8c86').lerp(new THREE.Color('#f4f7fb'), snow), roughness: 0.95});

const Building: React.FC<{b: Bldg; night: number; snow: number}> = ({b, night, snow}) => {
  const mats = useMemo(() => {
    const floors = Math.round((b.h - 0.6) / 3.2);
    const st = {base: BASES[b.seed % BASES.length], frame: '#e8e8e6', glass: '#9fb3c4', floors, cols: Math.max(2, Math.round(b.w / 3)), balcony: b.seed % 3 === 0, shop: b.shop, tile: b.seed % 2 === 0};
    const front = facade(b.seed, st);
    const sideF = facade(b.seed + 1, {...st, cols: Math.max(2, Math.round(b.d / 3)), shop: false});
    const mk = (t: {map: THREE.Texture; emissive: THREE.Texture}) =>
      new THREE.MeshStandardMaterial({map: t.map, emissiveMap: t.emissive, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.85});
    const fm = mk(front);
    const sm = mk(sideF);
    const roof = roofMat(0);
    // BoxGeometry の面順：+x, -x, +y, -y, +z, -z
    const arr = b.side < 0 ? [fm, sm, roof, roof, sm, sm] : [sm, fm, roof, roof, sm, sm];
    return {arr, fm, sm, roof};
  }, [b]);
  mats.fm.emissiveIntensity = night * 1.15;
  mats.sm.emissiveIntensity = night * 1.0;
  mats.roof.color.set('#8f8c86').lerp(new THREE.Color('#f4f7fb'), snow);
  const signT = useMemo(() => (b.sign !== undefined ? signTex(b.sign, true) : null), [b.sign]);
  const faceX = b.side < 0 ? b.x + b.d / 2 : b.x - b.d / 2;
  return (
    <group>
      <mesh position={[b.x, b.h / 2, b.z]} material={mats.arr} castShadow receiveShadow>
        <boxGeometry args={[b.d, b.h, b.w]} />
      </mesh>
      {/* パラペット */}
      <mesh position={[b.x, b.h + 0.35, b.z]} castShadow>
        <boxGeometry args={[b.d + 0.2, 0.7, b.w + 0.2]} />
        <meshStandardMaterial color="#c9c6bf" roughness={0.9} />
      </mesh>
      <mesh position={[b.x, b.h + 0.36, b.z]}>
        <boxGeometry args={[b.d - 0.3, 0.72, b.w - 0.3]} />
        <primitive object={mats.roof} attach="material" />
      </mesh>
      {/* 屋上の室外機・給水塔 */}
      <mesh position={[b.x + 1.2, b.h + 1.1, b.z - 1]} castShadow>
        <boxGeometry args={[1.4, 0.9, 1.0]} />
        <meshStandardMaterial color="#d5d7d9" roughness={0.6} />
      </mesh>
      {b.seed % 2 === 0 && (
        <mesh position={[b.x - 1.5, b.h + 1.9, b.z + 1.5]} castShadow>
          <cylinderGeometry args={[0.9, 0.9, 1.6, 16]} />
          <meshStandardMaterial color="#c4c8cc" roughness={0.5} metalness={0.3} />
        </mesh>
      )}
      {/* 雪 */}
      {snow > 0.02 && !b.home && (
        <mesh position={[b.x, b.h + 0.72 + snow * 0.2, b.z]}>
          <boxGeometry args={[b.d - 0.3, snow * 0.4, b.w - 0.3]} />
          <meshStandardMaterial color={new THREE.Color('#f4f7fb').lerp(new THREE.Color('#8592b0'), night * 0.7)} roughness={1} />
        </mesh>
      )}
      {/* 袖看板 */}
      {signT && b.h > 8 && (
        <mesh position={[faceX + b.side * -0.9, Math.min(b.h - 2, 7.5), b.z + b.w * 0.3]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <boxGeometry args={[0.18, 4.2, 1.05]} />
          <meshStandardMaterial map={signT} emissiveMap={signT} emissive="#ffffff" emissiveIntensity={0.15 + night * 0.9} roughness={0.5} />
        </mesh>
      )}
      {/* 庇 */}
      {b.shop && (
        <mesh position={[faceX - b.side * 0.6, 3.1, b.z]} castShadow>
          <boxGeometry args={[1.2, 0.12, b.w * 0.9]} />
          <meshStandardMaterial color="#5d6166" roughness={0.6} />
        </mesh>
      )}
    </group>
  );
};

export const CityFiller: React.FC<{items: {x: number; z: number; w: number; d: number; h: number; c: number}[]; night: number; snow: number}> = ({items, night, snow}) => {
  const {geo, mat, mats, roof} = useMemo(() => {
    const t = facade(9, {base: '#cfcac0', frame: '#e3e3e0', glass: '#93a7b8', floors: 12, cols: 4, tile: true});
    t.map.repeat.set(1, 1);
    const m = new THREE.MeshStandardMaterial({map: t.map, emissiveMap: t.emissive, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.9});
    const g = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    // 屋上（天面）と底面は窓のないコンクリート。夜も光らない
    const top = new THREE.MeshStandardMaterial({map: paving([3, 3], '#9a978f'), roughness: 1});
    // BoxGeometry の面順：+x, -x, +y(屋上), -y(底面), +z, -z
    const mats = [m, m, top, top, m, m];
    return {geo: g, mat: m, mats, roof: new THREE.MeshStandardMaterial({color: '#c9d2e4', roughness: 1})};
  }, []);
  mat.emissiveIntensity = night * 0.9;
  const tmp = new THREE.Object3D();
  const c = new THREE.Color();
  return (
    <>
      <instancedMesh
        args={[geo, mats, items.length]}
        castShadow
        receiveShadow
        ref={(m) => {
          if (!m) return;
          items.forEach((it, i) => {
            tmp.position.set(it.x, 0, it.z);
            tmp.scale.set(it.w, it.h, it.d);
            tmp.updateMatrix();
            m.setMatrixAt(i, tmp.matrix);
            c.setHSL(0.08 + it.c * 0.08, 0.08 + it.c * 0.08, 0.72 + it.c * 0.18);
            m.setColorAt(i, c);
          });
          m.instanceMatrix.needsUpdate = true;
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
        }}
      />
      {snow > 0.02 && (
        <instancedMesh
          args={[geo, roof, items.length]}
          ref={(m) => {
            if (!m) return;
            items.forEach((it, i) => {
              tmp.position.set(it.x, it.h, it.z);
              tmp.scale.set(it.w, 0.4 * snow, it.d);
              tmp.updateMatrix();
              m.setMatrixAt(i, tmp.matrix);
            });
            m.instanceMatrix.needsUpdate = true;
          }}
        />
      )}
    </>
  );
};

export const Buildings: React.FC<{bldgs: Bldg[]; night: number; snow: number}> = ({bldgs, night, snow}) => (
  <>
    {bldgs.map((b, i) => (
      <Building key={i} b={b} night={night} snow={snow} />
    ))}
  </>
);

// 道路・歩道・交差点
export const Streets: React.FC<{snow: number}> = ({snow}) => {
  const mats = useMemo(() => {
    const a = new THREE.MeshStandardMaterial({map: asphalt([2, 40]), roughness: 0.95});
    const a2 = new THREE.MeshStandardMaterial({map: asphalt([30, 2]), roughness: 0.95});
    const p = new THREE.MeshStandardMaterial({map: paving([2, 50]), roughness: 0.95});
    const p2 = new THREE.MeshStandardMaterial({map: paving([60, 2]), roughness: 0.95});
    const ground = new THREE.MeshStandardMaterial({map: paving([80, 80], '#a9a59c'), roughness: 1});
    return {a, a2, p, p2, ground};
  }, []);
  const snowCover = snow > 0.02;
  const len = 175;
  const zc = (34 + BAY_Z) / 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -40]} receiveShadow material={mats.ground}>
        <planeGeometry args={[420, 340]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, zc]} receiveShadow material={mats.a}>
        <planeGeometry args={[ROAD_HALF * 2, len]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, CROSS_Z]} receiveShadow material={mats.a2}>
        <planeGeometry args={[150, 8]} />
      </mesh>
      {/* 白線 */}
      {Array.from({length: 26}).map((_, i) => {
        const z = 30 - i * 6;
        if (Math.abs(z - CROSS_Z) < 7) return null;
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, z]}>
            <planeGeometry args={[0.16, 3]} />
            <meshStandardMaterial color="#e9e7df" roughness={0.8} />
          </mesh>
        );
      })}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * (ROAD_HALF - 0.25), 0.02, zc]}>
          <planeGeometry args={[0.14, len]} />
          <meshStandardMaterial color="#e9e7df" roughness={0.8} />
        </mesh>
      ))}
      {/* 横断歩道 */}
      {[CROSS_Z + 5.2, CROSS_Z - 5.2].map((z) =>
        Array.from({length: 7}).map((_, i) => (
          <mesh key={`${z}-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-3.3 + i * 1.1, 0.02, z]}>
            <planeGeometry args={[0.55, 2.6]} />
            <meshStandardMaterial color="#efede6" roughness={0.8} />
          </mesh>
        )),
      )}
      {/* 歩道（縁石つき） */}
      {[-1, 1].map((s) => (
        <group key={s}>
          {[
            [34, CROSS_Z + 4],
            [CROSS_Z - 4, BAY_Z + 2],
          ].map(([z0, z1], k) => (
            <group key={k}>
              <mesh position={[s * (ROAD_HALF + WALK / 2), 0.08, (z0 + z1) / 2]} receiveShadow material={mats.p}>
                <boxGeometry args={[WALK, 0.16, Math.abs(z0 - z1)]} />
              </mesh>
              <mesh position={[s * (ROAD_HALF + 0.08), 0.1, (z0 + z1) / 2]} receiveShadow>
                <boxGeometry args={[0.16, 0.2, Math.abs(z0 - z1)]} />
                <meshStandardMaterial color="#9a978f" roughness={0.9} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {snowCover && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05 + snow * 0.05, -40]}>
          <planeGeometry args={[420, 340]} />
          <meshStandardMaterial color="#eef2f7" roughness={1} transparent opacity={Math.min(0.92, snow * 1.1)} />
        </mesh>
      )}
    </group>
  );
};

// 電柱と電線（傾き tilt で風圧を表現）
export const POLES = (() => {
  const out: {x: number; z: number}[] = [];
  for (const s of [-1, 1]) for (let z = 28; z > BAY_Z + 10; z -= 15) if (Math.abs(z - CROSS_Z) > 6) out.push({x: s * (ROAD_HALF + 0.55), z});
  return out;
})();

const wireGeo = (a: THREE.Vector3, b: THREE.Vector3, sag: number) => {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  return new THREE.TubeGeometry(curve, 16, 0.02, 4, false);
};

export const PolesAndWires: React.FC<{tilt: (i: number) => number; sag: number}> = ({tilt, sag}) => {
  const tops = POLES.map((p, i) => {
    const t = tilt(i);
    const h = 9;
    return {p, t, top: new THREE.Vector3(p.x - Math.sin(t) * h, Math.cos(t) * h, p.z)};
  });
  return (
    <group>
      {tops.map(({p, t}, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, 0, t]}>
          <mesh position={[0, 4.5, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.16, 9, 10]} />
            <meshStandardMaterial color="#a9a69e" roughness={0.9} />
          </mesh>
          <mesh position={[0, 8.4, 0]} castShadow>
            <boxGeometry args={[0.12, 0.12, 1.6]} />
            <meshStandardMaterial color="#6d6a64" />
          </mesh>
          <mesh position={[0, 6.6, 0.35]} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.8, 12]} />
            <meshStandardMaterial color="#8a8f93" metalness={0.3} roughness={0.5} />
          </mesh>
        </group>
      ))}
      {tops.map((a, i) => {
        const b = tops[i + 1];
        if (!b || Math.sign(a.p.x) !== Math.sign(b.p.x)) return null;
        return [-0.6, 0, 0.6].map((dz, k) => (
          <mesh key={`${i}-${k}`} geometry={wireGeo(a.top.clone().add(new THREE.Vector3(0, -0.6 + k * 0.05, dz)), b.top.clone().add(new THREE.Vector3(0, -0.6 + k * 0.05, dz)), 0.5 + sag + k * 0.15)}>
            <meshStandardMaterial color="#1e1f22" roughness={0.8} />
          </mesh>
        ));
      })}
    </group>
  );
};

export const VendingMachine: React.FC<{position: [number, number, number]; rotY: number; i: number; night: number}> = ({position, rotY, i, night}) => {
  const t = useMemo(() => vendingTex(i), [i]);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[1.0, 1.84, 0.75]} />
        <meshStandardMaterial color={i % 2 ? '#d8dde3' : '#c0392b'} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.92, 0.38]}>
        <planeGeometry args={[0.98, 1.8]} />
        <meshStandardMaterial map={t} emissiveMap={t} emissive="#ffffff" emissiveIntensity={0.25 + night * 1.2} roughness={0.4} />
      </mesh>
    </group>
  );
};

export const TrafficLight: React.FC<{position: [number, number, number]; rotY: number}> = ({position, rotY}) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <mesh position={[0, 2.8, 0]} castShadow>
      <cylinderGeometry args={[0.08, 0.1, 5.6, 10]} />
      <meshStandardMaterial color="#7d8186" metalness={0.4} roughness={0.5} />
    </mesh>
    <mesh position={[1.4, 5.2, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.05, 0.05, 2.8, 8]} />
      <meshStandardMaterial color="#7d8186" metalness={0.4} roughness={0.5} />
    </mesh>
    <mesh position={[2.6, 5.2, 0]}>
      <boxGeometry args={[1.3, 0.42, 0.3]} />
      <meshStandardMaterial color="#3b3f44" roughness={0.6} />
    </mesh>
    {[0, 1, 2].map((k) => (
      <mesh key={k} position={[2.2 + k * 0.4, 5.2, 0.16]}>
        <circleGeometry args={[0.13, 16]} />
        <meshStandardMaterial color={['#3fbf6b', '#f1c40f', '#e74c3c'][k]} emissive={['#3fbf6b', '#f1c40f', '#e74c3c'][k]} emissiveIntensity={k === 0 ? 1.4 : 0.05} />
      </mesh>
    ))}
  </group>
);
