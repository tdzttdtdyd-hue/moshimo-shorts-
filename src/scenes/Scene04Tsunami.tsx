import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Lights, Stage} from '../three/Stage';
import {Ground, House, Tree} from '../three/Props';
import {Character} from '../three/Character';
import {CameraRig} from '../lib/CameraRig';
import {mulberry32} from '../lib/rand';
import {C} from '../theme';
import {Flash, Vignette} from '../components/Overlay';

const SHORE = -7;
const deep = new THREE.Color('#1c64d6');
const mid = new THREE.Color('#3aa0ff');
const foam = new THREE.Color('#f4fbff');

const Wave: React.FC<{f: number}> = ({f}) => {
  const base = useMemo(() => new THREE.PlaneGeometry(90, 80, 90, 70).rotateX(-Math.PI / 2).translate(0, 0, -40 + SHORE).toNonIndexed(), []);
  const geo = useMemo(() => {
    const g = base.clone();
    const p = g.attributes.position;
    const zc = -70 + f * 0.52;
    const H = 1.5 + f * 0.085;
    const cols = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const d = z - zc - Math.sin(x * 0.12) * 1.5;
      const w = d > 0 ? 3.2 : 9;
      const crest = H * Math.exp(-(d / w) * (d / w));
      const swell = 0.25 * Math.sin(x * 0.5 + f * 0.2) * Math.cos(z * 0.4 - f * 0.15);
      const y = crest + swell + 0.2;
      p.setY(i, y);
      const k = Math.min(1, crest / H);
      const c = deep.clone().lerp(mid, Math.min(1, crest / 3));
      if (k > 0.78 && d > -2.5) c.lerp(foam, Math.min(1, (k - 0.78) * 5));
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }, [base, f]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors flatShading roughness={0.35} />
    </mesh>
  );
};

export const Scene04Tsunami: React.FC = () => {
  const f = useCurrentFrame();
  const town = useMemo(() => {
    const r = mulberry32(33);
    const h = [] as {x: number; z: number; w: string; roof: string}[];
    for (let x = -14; x <= 14; x += 2.6) for (const z of [SHORE + 3, SHORE + 7]) if (r() < 0.8) h.push({x: x + r(), z: z + r(), w: C.houseColors[Math.floor(r() * 5)], roof: C.roofColors[Math.floor(r() * 5)]});
    return h;
  }, []);
  const runners = [
    {x: -1.6, z: SHORE + 9, c: C.bodyColors[0], d: 0},
    {x: 0.9, z: SHORE + 10.5, c: C.bodyColors[1], d: 3},
    {x: 2.4, z: SHORE + 8.5, c: C.bodyColors[4], d: 6},
  ];
  const sky = interpolate(f, [0, 110], [0, 1], {extrapolateRight: 'clamp'});
  const bg = new THREE.Color('#9fd8ff').lerp(new THREE.Color('#5a6d8f'), sky).getStyle();
  return (
    <AbsoluteFill>
      <Stage bg={bg} fog={[bg, 40, 110]}>
        <CameraRig
          keys={[
            {f: 0, pos: [3, 1.2, 9], look: [0, 1.8, -20], fov: 50},
            {f: 70, pos: [2.5, 0.9, 7.5], look: [0, 4.5, -18], fov: 56},
            {f: 120, pos: [1.5, 0.6, 6], look: [0, 9, -14], fov: 62},
          ]}
          shakes={[{from: 0, dur: 120, amp: 0.06}, {from: 85, dur: 35, amp: 0.25}]}
        />
        <Lights sun={[10, 16, 6]} shadowSize={18} intensity={2.4 - sky} />
        <Wave f={f} />
        <Ground size={[90, 30]} seg={50} position={[0, 0, SHORE + 15]} colorFn={(x, z) => new THREE.Color(z < SHORE + 2.5 ? C.sand : C.grass)} amp={0.2} />
        {town.map((h, i) => (
          <House key={i} position={[h.x, 0, h.z]} wall={h.w} roof={h.roof} />
        ))}
        {[-12, -8, 8, 12].map((x) => (
          <Tree key={x} position={[x, 0, SHORE + 2.5]} color="#3fbf6b" />
        ))}
        {runners.map((r, i) => {
          const t = Math.max(0, f - r.d);
          return (
            <Character
              key={i}
              position={[r.x, 0, r.z + t * 0.045]}
              rotation={[0.15, 0.15 * (i - 1), 0]}
              scale={0.65}
              color={r.c}
              expr="scared"
              walk={t * 0.55}
              walkAmp={0.9}
              armL={1.2 + Math.sin(t * 0.55) * 0.5}
              armR={1.2 - Math.sin(t * 0.55) * 0.5}
            />
          );
        })}
      </Stage>
      <Vignette strength={0.5} />
      <Flash at={112} dur={8} max={0.9} color="#d6efff" />
    </AbsoluteFill>
  );
};
