import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Lights, Stage} from '../three/Stage';
import {Car, House, WindStreaks} from '../three/Props';
import {CloudPuffs, Forest, Grass, Mountains, Road, SkyDome, StreetLamp, Terrain, TreeSpec, grassColor} from '../three/Landscape';
import {Human, OUTFITS, flailPose, walkPose} from '../three/Human';
import {CameraRig} from '../lib/CameraRig';
import {mulberry32} from '../lib/rand';
import {C} from '../theme';
import {Flash, SpeedLines, Vignette} from '../components/Overlay';

const HIT = 14;
const CUT = 60;

const fly = (f: number, k: number, rnd: number) => {
  const t = Math.max(0, f - HIT - rnd * 4);
  return {x: 0.16 * t + 0.003 * t * t * k, y: Math.max(0, 0.11 * t * (1 - t / 60)) * k, rot: t * 0.14 * (0.6 + rnd)};
};

const flat = (_x: number, z: number) => Math.min(1, Math.max(0.15, (Math.abs(z) - 9) / 12));
const ground = grassColor('#74b84f', '#4c943d', '#a3d46a');

export const Scene02Equator: React.FC = () => {
  const f = useCurrentFrame();
  const town = useMemo(() => {
    const r = mulberry32(7);
    const houses = [] as {x: number; z: number; w: string; roof: string; h: number}[];
    const trees = [] as TreeSpec[];
    for (let x = -26; x <= 132; x += 3.6) {
      for (const side of [-1, 1]) {
        const z = side * (4.4 + r() * 1.2);
        if (r() < 0.7) houses.push({x: x + r() * 0.6, z, w: C.houseColors[Math.floor(r() * 5)], roof: C.roofColors[Math.floor(r() * 5)], h: r() < 0.35 ? 2 : 1});
        else trees.push({x: x + r(), z: z * 1.05, s: 0.9 + r() * 0.5});
        // カメラ側（+z）には背の高い木を置かない
        if (side < 0) {
          trees.push({x: x + 1.8 + r(), z: -(8 + r() * 6), s: 1 + r() * 0.8});
          if (r() < 0.7) trees.push({x: x + r() * 3, z: -(14 + r() * 12), s: 1.2 + r()});
        }
      }
    }
    return {houses, trees};
  }, []);
  const people = useMemo(() => {
    const r = mulberry32(11);
    return Array.from({length: 9}).map((_, i) => ({x: -6 + i * 1.6 + r(), z: (r() < 0.5 ? -1 : 1) * (2.0 + r() * 0.5), o: i % 6, rnd: r(), dir: r() < 0.5 ? 1 : -1}));
  }, []);
  const inB = f >= CUT;
  const scroll = inB ? -(f - CUT) * 1.15 - 6 : 0;
  const bend = (_t: TreeSpec, i: number) => (f < HIT ? Math.sin(f * 0.1 + i) * 0.03 : Math.min(0.85, (f - HIT) * 0.07) + Math.sin(f * 0.9 + i) * 0.07);
  return (
    <AbsoluteFill>
      <Stage bg="#cfeaff" fog={['#d6ecff', 30, 110]}>
        {!inB ? (
          <CameraRig
            keys={[
              {f: 0, pos: [-7, 4.2, 11], look: [-1, 1.2, 0], fov: 46},
              {f: HIT, pos: [-4, 4.6, 10.5], look: [1, 1.2, 0], fov: 46},
              {f: CUT, pos: [6, 5.6, 11], look: [9, 1.4, 0], fov: 50},
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
        <SkyDome top="#2f7fd8" horizon="#d8efff" sunDir={[0.4, 0.5, -0.8]} />
        <Lights sun={[6, 14, 8]} shadowSize={18} />
        <group position={[scroll * 0.15, 0, 0]}>
          <Mountains seed={2} radius={95} color="#7f9fbf" height={18} />
          <CloudPuffs seed={3} count={9} drift={f * 0.02} />
        </group>
        <group position={[scroll, 0, 0]}>
          <Terrain size={[260, 120]} seg={130} position={[50, 0, 0]} amp={0.35} colorAt={ground} flatten={flat} />
          <Road length={260} position={[50, 0, 0]} />
          <Grass count={2600} area={[-30, 140, -14, 14]} keep={(_x, z) => Math.abs(z) > 3.4} sway={f < HIT ? 0 : 0.5} />
          {town.houses.map((h, i) => (
            <House key={i} position={[h.x, 0, h.z]} rotation={[0, h.z > 0 ? Math.PI : 0, 0]} wall={h.w} roof={h.roof} h={h.h} />
          ))}
          <Forest trees={town.trees} bend={bend} seed={5} />
          {Array.from({length: 18}).map((_, i) => (
            <StreetLamp key={i} position={[-20 + i * 9, 0, 2.3]} rotationY={Math.PI} />
          ))}
          {[-3, 5, 12].map((x, i) => {
            const m = fly(f, 0.8, i * 0.3);
            const drive = f < HIT ? f * 0.12 : HIT * 0.12;
            return <Car key={i} position={[x + drive + m.x, m.y, i % 2 ? 0.7 : -0.7]} rotation={[0, 0, -m.rot * 0.5]} color={C.roofColors[i + 1]} />;
          })}
        </group>
        {!inB &&
          people.map((p, i) => {
            const m = fly(f, 1, p.rnd);
            const walkX = f < HIT ? f * 0.03 * p.dir : HIT * 0.03 * p.dir;
            return (
              <Human
                key={i}
                position={[p.x + walkX + m.x, m.y, p.z]}
                rotation={[0, f < HIT ? (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : Math.PI / 2, -m.rot]}
                scale={0.95}
                outfit={OUTFITS[p.o]}
                p={f < HIT ? walkPose(f * 0.32 + i, 1) : flailPose(f - HIT, i)}
              />
            );
          })}
        {inB && (
          <>
            <Human position={[0.6, 0.6 + Math.sin(f * 0.3) * 0.15, 0.5]} rotation={[0.1, 0.25, -0.9 - Math.sin(f * 0.15) * 0.2]} scale={1.05} outfit={OUTFITS[people[4].o]} p={flailPose(f, 1)} />
            <Human position={[3.2, 1.6 + Math.sin(f * 0.25) * 0.2, -2.5]} rotation={[0, 0.8, -f * 0.12]} scale={0.95} outfit={OUTFITS[2]} p={flailPose(f, 3)} />
            <Human position={[-3.5, 0.5, -3]} rotation={[0.3, 0.9, -f * 0.09]} scale={0.95} outfit={OUTFITS[5]} p={flailPose(f, 5)} />
            <Car position={[5, 2.8, -5]} rotation={[f * 0.05, 0.4, -f * 0.08]} color={C.roofColors[2]} />
          </>
        )}
        {f >= HIT && <WindStreaks frame={f} count={70} speed={inB ? 2.2 : 1.6} area={[46, 7, 14]} center={[inB ? 0 : 6, 3, 0]} opacity={0.6} />}
      </Stage>
      <Vignette strength={0.35} />
      <SpeedLines from={CUT} to={135} count={40} />
      <Flash at={HIT} dur={6} max={0.5} />
      <Flash at={CUT} dur={5} max={0.6} />
    </AbsoluteFill>
  );
};
