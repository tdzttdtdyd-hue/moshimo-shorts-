import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {Earth, Stars} from '../three/Earth';
import {Character} from '../three/Character';
import {CameraRig} from '../lib/CameraRig';
import {easeOut, ramp} from '../lib/anim';
import {C} from '../theme';
import {Flash, Onomato, SpeedLines, Vignette} from '../components/Overlay';

export const STOP = 32;
const R = 2.2;
const UP = new THREE.Vector3(0, 1, 0);

const spinAt = (f: number): number => {
  if (f < STOP) return 0.6 + f * 0.2 + Math.min(f, 10) * 0.01 * f;
  const t = f - STOP;
  const S = spinAt(STOP - 0.0001);
  return S + 0.06 * Math.exp(-t / 5) * Math.sin(t * 1.3);
};

const riders = [
  {lat: 0.62, off: 0.0, color: C.bodyColors[0]},
  {lat: 0.95, off: -0.45, color: C.bodyColors[1]},
  {lat: 0.85, off: 0.5, color: C.bodyColors[2]},
];

export const Scene01Hook: React.FC = () => {
  const f = useCurrentFrame();
  const S0 = spinAt(STOP - 0.0001);
  return (
    <AbsoluteFill>
      <Stage bg={C.space}>
        <CameraRig
          keys={[
            {f: 0, pos: [0, 2.5, 19], look: [0, 0.4, 0], fov: 42},
            {f: STOP, pos: [0.6, 1.5, 12], look: [0, 0.5, 0], fov: 44, ease: easeOut},
            {f: 75, pos: [-0.6, 1.8, 10.8], look: [0.7, 0.7, 0], fov: 46},
          ]}
          shakes={[{from: STOP, dur: 16, amp: 0.45}]}
        />
        <ambientLight intensity={0.35} />
        <hemisphereLight args={['#bfe3ff', '#20306a', 0.9]} />
        <directionalLight position={[6, 6, 8]} intensity={2.6} color="#fff3e0" />
        <group rotation={[0, f * 0.002, 0]}>
          <Stars />
        </group>
        <Earth radius={R} spin={spinAt(f)} tilt={0.15} position={[0, 0, 0]} />
        {/* 高速回転を表す軌跡リング */}
        {[0, 1, 2].map((i) => {
          const o = (1 - ramp(f, STOP - 2, STOP + 2)) * 0.35;
          if (o <= 0.01) return null;
          return (
            <mesh key={i} rotation={[Math.PI / 2 + 0.15 * i - 0.1, 0, f * 0.5 + i]} scale={R * (1.2 + i * 0.12)}>
              <torusGeometry args={[1, 0.008, 6, 64, Math.PI * 1.2]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={o} />
            </mesh>
          );
        })}
        {/* 地球の上の住人：止まった瞬間に吹っ飛ぶ */}
        <group rotation={[0, 0, 0.15]}>
          {riders.map((r, i) => {
            const wa = (f < STOP ? spinAt(f) : S0) - S0 + r.off;
            const n = new THREE.Vector3(Math.cos(r.lat) * Math.sin(wa), Math.sin(r.lat), Math.cos(r.lat) * Math.cos(wa));
            const base = n.clone().multiplyScalar(R * 1.03);
            const q = new THREE.Quaternion().setFromUnitVectors(UP, n);
            let pos = base;
            let tumble = 0;
            if (f >= STOP) {
              const t = f - STOP;
              const dir = new THREE.Vector3(Math.cos(wa), 0, -Math.sin(wa)).multiplyScalar(0.17 + i * 0.03);
              pos = base.clone().add(dir.multiplyScalar(t)).add(n.clone().multiplyScalar(t * 0.06)).add(new THREE.Vector3(0, 0, t * 0.05));
              tumble = t * (0.25 + i * 0.07);
            }
            const e = new THREE.Euler().setFromQuaternion(q);
            return (
              <group key={i} position={pos.toArray()} rotation={[e.x, e.y, e.z - tumble]}>
                <Character
                  scale={0.48}
                  color={r.color}
                  expr={f >= STOP ? 'surprised' : 'happy'}
                  armL={f >= STOP ? 2.4 : 0.3 + Math.sin(f * 0.6 + i) * 0.4}
                  armR={f >= STOP ? 2.2 : 0.3}
                />
              </group>
            );
          })}
        </group>
      </Stage>
      <Vignette strength={0.5} />
      <SpeedLines from={STOP} to={STOP + 22} />
      <Flash at={STOP} dur={7} max={0.75} />
      <Onomato text="ピタッ！" at={STOP} dur={34} x={560} y={1270} rot={-9} size={170} />
    </AbsoluteFill>
  );
};
