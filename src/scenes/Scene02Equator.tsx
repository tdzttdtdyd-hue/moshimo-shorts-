import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Lights, Stage} from '../three/Stage';
import {Car, Ground, House, Tree, WindStreaks} from '../three/Props';
import {Character} from '../three/Character';
import {CameraRig} from '../lib/CameraRig';
import {mulberry32} from '../lib/rand';
import {C} from '../theme';
import {Flash, SpeedLines, Vignette} from '../components/Overlay';

const HIT = 14; // 地面が止まる瞬間
const CUT = 60; // 並走カットへ

// 慣性で吹き飛ぶ物体の変位
const fly = (f: number, k: number, rnd: number) => {
  const t = Math.max(0, f - HIT - rnd * 4);
  return {x: 0.16 * t + 0.003 * t * t * k, y: Math.max(0, 0.11 * t * (1 - t / 60)) * k, rot: t * 0.14 * (0.6 + rnd)};
};

export const Scene02Equator: React.FC = () => {
  const f = useCurrentFrame();
  const town = useMemo(() => {
    const r = mulberry32(7);
    const houses = [] as {x: number; z: number; w: string; roof: string; h: number}[];
    const trees = [] as {x: number; z: number; s: number}[];
    for (let x = -24; x <= 130; x += 4.2) {
      for (const z of [-3.6, 3.6]) {
        if (r() < 0.75)
          houses.push({x: x + r(), z: z + (z > 0 ? 1 : -1) * r() * 1.5, w: C.houseColors[Math.floor(r() * 5)], roof: C.roofColors[Math.floor(r() * 5)], h: 0.9 + r() * 0.7});
        else trees.push({x: x + r(), z: z * 1.2, s: 0.9 + r() * 0.5});
      }
      trees.push({x: x + 2, z: -8 - r() * 4, s: 1 + r()});
    }
    return {houses, trees};
  }, []);

  const people = useMemo(() => {
    const r = mulberry32(11);
    return Array.from({length: 9}).map((_, i) => ({x: -6 + i * 1.6 + r(), z: -1.6 + r() * 3.2, c: C.bodyColors[i % 6], rnd: r(), dir: r() < 0.5 ? 1 : -1}));
  }, []);

  const inB = f >= CUT;
  // 並走カットでは主人公の周りの世界を動かす（影の範囲を固定するため）
  const scroll = inB ? -(f - CUT) * 1.15 - 6 : 0;
  const hero = people[4];

  return (
    <AbsoluteFill>
      <Stage bg={C.sky} fog={[C.sky, 25, 70]}>
        {!inB ? (
          <CameraRig
            keys={[
              {f: 0, pos: [-7, 4.2, 11], look: [-1, 1.2, 0], fov: 46},
              {f: HIT, pos: [-4, 3.6, 10.5], look: [1, 1.3, 0], fov: 46},
              {f: CUT, pos: [6, 3.4, 10], look: [9, 2, 0], fov: 50},
            ]}
            shakes={[{from: HIT, dur: 20, amp: 0.35}]}
          />
        ) : (
          <CameraRig
            keys={[
              {f: CUT, pos: [-3.2, 3.4, 7.5], look: [0.6, 1.4, 0], fov: 50},
              {f: 135, pos: [-1.8, 3.0, 6.6], look: [0.8, 1.4, 0], fov: 52},
            ]}
            shakes={[{from: CUT, dur: 75, amp: 0.08}]}
          />
        )}
        <Lights sun={[6, 14, 8]} shadowSize={16} />
        <group position={[scroll, 0, 0]}>
          <Ground size={[200, 60]} seg={70} color={C.grass} amp={0.18} position={[50, 0, 0]} />
          <mesh position={[50, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[200, 2.6]} />
            <meshStandardMaterial color={C.road} flatShading />
          </mesh>
          {town.houses.map((h, i) => {
            // 屋根だけ吹き飛ぶ家もある
            return <House key={i} position={[h.x, 0, h.z]} wall={h.w} roof={h.roof} h={h.h} />;
          })}
          {town.trees.map((t, i) => {
            const bend = f < HIT ? 0 : Math.min(0.9, (f - HIT) * 0.08) + Math.sin(f * 0.9 + i) * 0.08;
            return <Tree key={i} position={[t.x, 0, t.z]} scale={t.s} bend={bend} />;
          })}
          {/* 道路の車（止まらず吹き飛ぶ） */}
          {[-3, 5, 12].map((x, i) => {
            const m = fly(f, 0.8, i * 0.3);
            const drive = f < HIT ? f * 0.12 : HIT * 0.12;
            return <Car key={i} position={[x + drive + m.x, m.y, i % 2 ? 0.6 : -0.6]} rotation={[0, 0, -m.rot * 0.5]} color={C.roofColors[i + 1]} />;
          })}
        </group>
        {!inB &&
          people.map((p, i) => {
            const m = fly(f, 1, p.rnd);
            const walkX = f < HIT ? f * 0.03 * p.dir : HIT * 0.03 * p.dir;
            return (
              <Character
                key={i}
                position={[p.x + walkX + m.x, m.y, p.z]}
                rotation={[0, f < HIT ? (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : Math.PI / 2, -m.rot]}
                scale={0.75}
                color={p.c}
                expr={f < HIT ? 'happy' : 'surprised'}
                walk={f * 0.35}
                walkAmp={f < HIT ? 0.6 : 0.9}
                armL={f < HIT ? 0.2 : 2.6}
                armR={f < HIT ? 0.2 : 2.6}
              />
            );
          })}
        {inB && (
          <>
            {/* 並走：吹き飛ばされる主人公と仲間 */}
            <Character
              position={[0.6, 1.2 + Math.sin(f * 0.3) * 0.15, 0.5]}
              rotation={[0.1, 0.25, -0.6 - Math.sin(f * 0.15) * 0.2]}
              scale={0.9}
              color={hero.c}
              expr="surprised"
              walk={f * 0.6}
              walkAmp={0.8}
              armL={2.5 + Math.sin(f * 0.8) * 0.3}
              armR={2.3 + Math.cos(f * 0.8) * 0.3}
            />
            <Character position={[3.2, 2.3 + Math.sin(f * 0.25) * 0.2, -2.5]} rotation={[0, 0.8, -f * 0.12]} scale={0.7} color={C.bodyColors[1]} expr="scared" armL={2.6} armR={2.0} />
            <Character position={[-3.5, 1.0, -3]} rotation={[0.3, 0.9, -f * 0.09]} scale={0.7} color={C.bodyColors[2]} expr="surprised" armL={2.2} armR={2.6} />
            <Car position={[5, 2.8, -5]} rotation={[f * 0.05, 0.4, -f * 0.08]} color={C.roofColors[2]} />
          </>
        )}
        {f >= HIT && <WindStreaks frame={f} count={70} speed={inB ? 2.2 : 1.6} area={[46, 7, 14]} center={[inB ? 0 : 6, 3, 0]} opacity={0.75} />}
      </Stage>
      <Vignette strength={0.35} />
      <SpeedLines from={CUT} to={135} count={40} />
      <Flash at={HIT} dur={6} max={0.5} />
      <Flash at={CUT} dur={5} max={0.6} />
    </AbsoluteFill>
  );
};
