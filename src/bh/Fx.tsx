// 地図の上のブラックホールまわりの演出：
// 黒い穴（引き込まれて何もなくなった場所）・ふちの赤い光・吸い込まれる光の筋・地面のひび
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {V3} from '../lib/anim';
import {mulberry32} from '../lib/rand';

const glowTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.12, 'rgba(255,236,200,0.9)');
    gr.addColorStop(0.4, 'rgba(255,150,70,0.35)');
    gr.addColorStop(1, 'rgba(255,90,30,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();
export const Glow: React.FC<{p: V3; size: number; opacity?: number; color?: string}> = ({p, size, opacity = 1, color = '#ffffff'}) => (
  <sprite position={p} scale={[size, size, 1]}>
    <spriteMaterial map={glowTex()} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
  </sprite>
);

// 穴の見た目：中心は真っ黒、ふちは熱でぼんやり赤く光り、外へなめらかに消える
const pitTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.6, 'rgba(2,1,1,1)');
    gr.addColorStop(0.655, 'rgba(255,190,120,1)');
    gr.addColorStop(0.69, 'rgba(255,110,40,0.85)');
    gr.addColorStop(0.8, 'rgba(160,40,10,0.35)');
    gr.addColorStop(1, 'rgba(60,10,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();

// R：引き込まれた範囲の半径（シーンの単位）。f：フレーム（流れの動き用）
export const Abyss: React.FC<{bh: V3; R: number; f: number; cracks?: number; streaks?: number; seed?: number}> = ({bh, R, f, cracks = 0, streaks = 1, seed = 3}) => {
  const crackData = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({length: 46}).map(() => {
      const a = r() * Math.PI * 2;
      // ひびは、少しジグザグに外へのびる
      const pts: [number, number][] = [];
      let x = 0, ang = a;
      for (let i = 0; i < 9; i++) {
        pts.push([Math.cos(ang) * x, Math.sin(ang) * x]);
        x += 0.12 + r() * 0.1;
        ang += (r() - 0.5) * 0.22;
      }
      return {pts, len: 1.6 + r() * 2.2, w: 0.012 + r() * 0.018};
    });
  }, [seed]);
  const streakData = useMemo(() => {
    const r = mulberry32(seed + 9);
    return Array.from({length: 260}).map(() => ({a: r() * Math.PI * 2, r0: 1 + r() * 1.6, ph: r(), len: 0.05 + r() * 0.12, c: r() < 0.6 ? '#ffe2b0' : '#bcd8ff'}));
  }, [seed]);
  if (R <= 0) return null;
  return (
    <group position={bh}>
      {/* 何もなくなった場所（黒）と、ふちの赤い光（ゆらめく） */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, f * 0.01]} scale={1 + 0.01 * Math.sin(f * 0.4)}>
        <planeGeometry args={[R * 3.05, R * 3.05]} />
        <meshBasicMaterial map={pitTex()} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* 地面のひび：ふちから外へ */}
      {cracks > 0 &&
        crackData.map((c, i) => {
          const L = R * c.len * cracks;
          const segs = c.pts.length - 1;
          return (
            <group key={i}>
              {c.pts.slice(0, segs).map((p, k) => {
                const q = c.pts[k + 1];
                const ax = (p[0] / 1.5) * L, az = (p[1] / 1.5) * L;
                const bx = (q[0] / 1.5) * L, bz = (q[1] / 1.5) * L;
                const ox = Math.cos(Math.atan2(p[1], p[0])) * R, oz = Math.sin(Math.atan2(p[1], p[0])) * R;
                const mx = (ax + bx) / 2 + ox, mz = (az + bz) / 2 + oz;
                const len = Math.hypot(bx - ax, bz - az);
                if (len < 1e-6) return null;
                return (
                  <mesh key={k} position={[mx, 0.015, mz]} rotation={[-Math.PI / 2, 0, -Math.atan2(bz - az, bx - ax)]}>
                    <planeGeometry args={[len, R * c.w * (1 - k / segs) + 0.002]} />
                    <meshBasicMaterial color="#ff8a3a" transparent opacity={0.85 * (1 - k / (segs + 2))} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
                  </mesh>
                );
              })}
            </group>
          );
        })}
      {/* 吸い込まれる光の筋：外から中心へ、近づくほど速く */}
      {streaks > 0 &&
        streakData.map((s, i) => {
          const ph = (s.ph + f * 0.012) % 1;
          const rr = R * s.r0 * (1 - ph * ph);
          const ang = s.a + ph * 0.6;
          const x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
          const L = R * s.len * (0.5 + ph * 2);
          return (
            <mesh key={'s' + i} position={[x, 0.03 + R * 0.02 * (1 - ph), z]} rotation={[-Math.PI / 2, 0, -ang]}>
              <planeGeometry args={[L, R * 0.006 + 0.001]} />
              <meshBasicMaterial color={s.c} transparent opacity={streaks * Math.sin(ph * Math.PI) * 0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
          );
        })}
      <Glow p={[0, R * 0.03, 0]} size={R * 0.35} opacity={0.8} />
    </group>
  );
};
