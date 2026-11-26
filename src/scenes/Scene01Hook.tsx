import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {Earth, SpaceBackdrop, Stars, Sun} from '../three/Earth';
import {Human, OUTFITS, flailPose, wavePose} from '../three/Human';
import {CameraRig} from '../lib/CameraRig';
import {easeOut, ramp} from '../lib/anim';
import {Flash, Vignette} from '../components/Overlay';

export const STOP = 32;
const R = 2.2;
const UP = new THREE.Vector3(0, 1, 0);

const spinAt = (f: number): number => {
  if (f < STOP) return 0.6 + f * 0.2 + Math.min(f, 10) * 0.01 * f;
  const t = f - STOP;
  const S = spinAt(STOP - 0.0001);
  return S + 0.05 * Math.exp(-t / 5) * Math.sin(t * 1.3);
};

const riders = [
  {lat: 0.62, off: 0.0, o: 1},
  {lat: 0.95, off: -0.45, o: 2},
  {lat: 0.85, off: 0.5, o: 3},
];

// 宇宙での共通ライティング（太陽光＋青いリムライト）
export const SpaceLights: React.FC<{sun?: [number, number, number]}> = ({sun = [8, 5, 7]}) => (
  <>
    <ambientLight intensity={0.12} />
    <hemisphereLight args={['#9fc8ff', '#0a1030', 0.35]} />
    <directionalLight position={sun} intensity={3.2} color="#fff4e2" />
    <directionalLight position={[-6, 2, -8]} intensity={0.9} color="#6f9bff" />
  </>
);

export const Scene01Hook: React.FC = () => {
  const f = useCurrentFrame();
  const S0 = spinAt(STOP - 0.0001);
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={false}>
        <CameraRig
          keys={[
            {f: 0, pos: [0, 2.5, 19], look: [0, 0.4, 0], fov: 42},
            {f: STOP, pos: [0.6, 1.5, 12], look: [0, 0.5, 0], fov: 44, ease: easeOut},
            {f: 75, pos: [-0.6, 1.8, 10.8], look: [0.7, 0.7, 0], fov: 46},
          ]}
          shakes={[{from: STOP, dur: 16, amp: 0.45}]}
        />
        <SpaceLights />
        <SpaceBackdrop />
        <group rotation={[0, f * 0.002, 0]}>
          <Stars />
        </group>
        <Sun position={[70, 45, -90]} size={3} />
        <Earth radius={R} spin={spinAt(f)} cloudSpin={spinAt(f) * 1.02} tilt={0.15} />
        {[0, 1, 2].map((i) => {
          const o = (1 - ramp(f, STOP - 2, STOP + 2)) * 0.3;
          if (o <= 0.01) return null;
          return (
            <mesh key={i} rotation={[Math.PI / 2 + 0.15 * i - 0.1, 0, f * 0.5 + i]} scale={R * (1.25 + i * 0.12)}>
              <torusGeometry args={[1, 0.006, 6, 96, Math.PI * 1.2]} />
              <meshBasicMaterial color="#cfe8ff" transparent opacity={o} />
            </mesh>
          );
        })}
        <group rotation={[0, 0, 0.15]}>
          {riders.map((r, i) => {
            const wa = (f < STOP ? spinAt(f) : S0) - S0 + r.off;
            const n = new THREE.Vector3(Math.cos(r.lat) * Math.sin(wa), Math.sin(r.lat), Math.cos(r.lat) * Math.cos(wa));
            const base = n.clone().multiplyScalar(R * 1.04);
            const q = new THREE.Quaternion().setFromUnitVectors(UP, n);
            let pos = base;
            let tumble = 0;
            if (f >= STOP) {
              const t = f - STOP;
              const dir = new THREE.Vector3(Math.cos(wa), 0, -Math.sin(wa)).multiplyScalar(0.17 + i * 0.03);
              pos = base.clone().add(dir.multiplyScalar(t)).add(n.clone().multiplyScalar(t * 0.06)).add(new THREE.Vector3(0, 0, t * 0.05));
              tumble = t * (0.22 + i * 0.07);
            }
            const e = new THREE.Euler().setFromQuaternion(q);
            return (
              <group key={i} position={pos.toArray()} rotation={[e.x, e.y, e.z - tumble]}>
                <Human scale={0.5} outfit={OUTFITS[r.o]} p={f >= STOP ? flailPose(f - STOP, i) : wavePose(f + i * 7, i % 2 === 0)} />
              </group>
            );
          })}
        </group>
      </Stage>
      <Vignette strength={0.5} />
      <Flash at={STOP} dur={7} max={0.5} />
    </AbsoluteFill>
  );
};
