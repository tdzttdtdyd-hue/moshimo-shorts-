import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Lights, Stage} from '../three/Stage';
import {House} from '../three/Props';
import {Forest, Grass, Mountains, Road, SkyDome, Terrain, TreeSpec} from '../three/Landscape';
import {Human, OUTFITS, runPose} from '../three/Human';
import {CameraRig} from '../lib/CameraRig';
import {mulberry32} from '../lib/rand';
import {C} from '../theme';
import {Flash, Vignette} from '../components/Overlay';

const SHORE = -7;
const deep = new THREE.Color('#0d4fa8');
const mid = new THREE.Color('#1d86d8');
const face = new THREE.Color('#3fb6e8');
const foam = new THREE.Color('#f4fbff');

const crestZ = (f: number) => -52 + f * 0.38;
const crestH = (f: number) => 3.5 + f * 0.08;

const Wave: React.FC<{f: number}> = ({f}) => {
  const base = useMemo(() => new THREE.PlaneGeometry(110, 90, 140, 110).rotateX(-Math.PI / 2).translate(0, 0, -45 + SHORE), []);
  const geo = useMemo(() => {
    const g = base.clone();
    const p = g.attributes.position;
    const zc = crestZ(f);
    const H = crestH(f);
    const cols = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const d = z - zc - Math.sin(x * 0.12) * 1.5 - Math.sin(x * 0.31 + 1) * 0.6;
      const w = d > 0 ? 3.0 : 9;
      const crest = H * Math.exp(-(d / w) * (d / w));
      const chop = 0.18 * Math.sin(x * 0.9 + f * 0.25) * Math.cos(z * 0.7 - f * 0.2) + 0.12 * Math.sin(x * 2.1 - z * 1.3 + f * 0.4);
      p.setY(i, crest + chop + 0.15);
      const k = Math.min(1, crest / H);
      const c = deep.clone().lerp(mid, Math.min(1, crest / 3));
      if (d > -1 && d < 3) c.lerp(face, Math.min(1, crest / H) * 0.7);
      if (k > 0.72 && d > -3) c.lerp(foam, Math.min(1, (k - 0.72) * 4));
      if (chop > 0.22) c.lerp(foam, 0.35);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }, [base, f]);
  return (
    <mesh geometry={geo}>
      <meshPhysicalMaterial vertexColors flatShading roughness={0.25} clearcoat={0.8} clearcoatRoughness={0.2} />
    </mesh>
  );
};

// 波頭から舞うしぶき
const Spray: React.FC<{f: number}> = ({f}) => {
  const pts = useMemo(() => {
    const r = mulberry32(4);
    return Array.from({length: 120}).map(() => ({x: (r() - 0.5) * 60, ph: r(), s: 0.15 + r() * 0.35}));
  }, []);
  const zc = crestZ(f), H = crestH(f);
  return (
    <group>
      {pts.map((p, i) => {
        const t = (f * 0.03 + p.ph) % 1;
        const z = zc + 1.5 + t * 3 + Math.sin(p.x * 0.12) * 1.5;
        return (
          <mesh key={i} position={[p.x, H * (0.9 + t * 0.25) - t * t * 2, z]} scale={p.s * (1 - t * 0.6)}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.85 * (1 - t)} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
};

const sandGrass = (_x: number, z: number, n: number) =>
  new THREE.Color(z < SHORE + 3.5 ? '#e6cf98' : '#78b955').lerp(new THREE.Color(z < SHORE + 3.5 ? '#d4b97c' : '#4f9440'), Math.max(0, -n * 2));

export const Scene04Tsunami: React.FC = () => {
  const f = useCurrentFrame();
  const town = useMemo(() => {
    const r = mulberry32(33);
    const h = [] as {x: number; z: number; w: string; roof: string; f: number}[];
    for (let x = -16; x <= 16; x += 2.4) for (const z of [SHORE + 4.5, SHORE + 8.5]) if (r() < 0.8) h.push({x: x + r() * 0.5, z: z + r() * 0.5, w: C.houseColors[Math.floor(r() * 5)], roof: C.roofColors[Math.floor(r() * 5)], f: r() < 0.3 ? 2 : 1});
    const trees: TreeSpec[] = [];
    for (let x = -24; x <= 24; x += 2.2) trees.push({x: x + r(), z: SHORE + 3.2 + r() * 0.5, s: 0.8 + r() * 0.4});
    return {h, trees};
  }, []);
  const runners = [
    {x: -1.6, z: SHORE + 10.5, o: 0, d: 0},
    {x: 0.9, z: SHORE + 12, o: 2, d: 3},
    {x: 2.4, z: SHORE + 10, o: 4, d: 6},
    {x: -3.2, z: SHORE + 11.5, o: 1, d: 9},
  ];
  const storm = interpolate(f, [0, 110], [0, 1], {extrapolateRight: 'clamp'});
  const bg = new THREE.Color('#cfe6f7').lerp(new THREE.Color('#6f7f98'), storm).getStyle();
  return (
    <AbsoluteFill>
      <Stage bg={bg} fog={[bg, 45, 120]}>
        <CameraRig
          keys={[
            {f: 0, pos: [3, 1.2, 9], look: [0, 1.8, -20], fov: 50},
            {f: 70, pos: [2.5, 0.9, 7.5], look: [0, 4.5, -18], fov: 56},
            {f: 120, pos: [1.5, 0.6, 6], look: [0, 9, -14], fov: 62},
          ]}
          shakes={[{from: 0, dur: 120, amp: 0.06}, {from: 85, dur: 35, amp: 0.25}]}
        />
        <SkyDome top={new THREE.Color('#3a7fcf').lerp(new THREE.Color('#3b4458'), storm).getStyle()} horizon={new THREE.Color('#e4f1fb').lerp(new THREE.Color('#8e99ad'), storm).getStyle()} />
        <Lights sun={[10, 16, 6]} shadowSize={20} intensity={2.4 - storm * 1.1} />
        <Mountains seed={12} radius={100} color="#7d93ad" height={16} arc={[Math.PI * 1.15, Math.PI * 1.85]} />
        <Wave f={f} />
        <Spray f={f} />
        <Terrain size={[110, 40]} seg={100} position={[0, 0, SHORE + 18]} amp={0.15} colorAt={sandGrass} flatten={() => 0.4} />
        <Road length={110} position={[0, 0, SHORE + 6.5]} sidewalk={false} />
        <Grass count={700} area={[-30, 30, SHORE + 8.5, SHORE + 11]} />
        {town.h.map((h, i) => (
          <House key={i} position={[h.x, 0, h.z]} rotation={[0, Math.PI, 0]} wall={h.w} roof={h.roof} h={h.f} />
        ))}
        <Forest trees={town.trees} seed={14} bend={(_t, i) => Math.sin(f * 0.3 + i) * 0.12} />
        {runners.map((r, i) => {
          const t = Math.max(0, f - r.d);
          return <Human key={i} position={[r.x, 0, r.z + t * 0.05]} rotation={[0, 0.12 * (i - 1.5), 0]} scale={0.85} outfit={OUTFITS[r.o]} p={runPose(t * 0.5 + i, 1)} />;
        })}
      </Stage>
      <Vignette strength={0.5} />
      <Flash at={112} dur={8} max={0.9} color="#d6efff" />
    </AbsoluteFill>
  );
};
