import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {Earth, Stars} from '../three/Earth';
import {Character} from '../three/Character';
import {House, Tree} from '../three/Props';
import {CameraRig} from '../lib/CameraRig';
import {easeOut} from '../lib/anim';
import {C} from '../theme';
import {Flash, Vignette} from '../components/Overlay';

const CUT_B = 70;
const CUT_C = 160;

const Moon: React.FC<{position: [number, number, number]}> = ({position}) => (
  <mesh position={position}>
    <icosahedronGeometry args={[0.7, 1]} />
    <meshStandardMaterial color="#d9d6cf" flatShading />
  </mesh>
);

export const Scene09End: React.FC = () => {
  const f = useCurrentFrame();
  const cut = f < CUT_B ? 'A' : f < CUT_C ? 'B' : 'C';
  const moonA = 0.6 + (f - CUT_B) * 0.012;
  const moonPos: [number, number, number] = [Math.cos(moonA) * 6.5, 0.2, Math.sin(moonA) * -6.5 + 1];
  return (
    <AbsoluteFill>
      <Stage bg={C.space} shadows={cut === 'C'}>
        {cut === 'A' && (
          <CameraRig
            keys={[
              {f: 0, pos: [0, 0.6, 8.5], look: [0, -1.2, 0], fov: 48},
              {f: CUT_B, pos: [1.2, 1.2, 11], look: [0, -1.0, 0], fov: 46},
            ]}
          />
        )}
        {cut === 'B' && (
          <CameraRig
            keys={[
              {f: CUT_B, pos: [-3, 4, 13], look: [1, -0.6, 0], fov: 46},
              {f: CUT_C, pos: [3, 3, 12.5], look: [1, -0.6, 0], fov: 46},
            ]}
          />
        )}
        {cut === 'C' && (
          <CameraRig
            keys={[
              {f: CUT_C, pos: [0.4, 2.3, 4.2], look: [0, 1.6, 0], fov: 46, ease: easeOut},
              {f: 225, pos: [0, 2.5, 19], look: [0, 0.4, 0], fov: 42},
            ]}
          />
        )}
        <ambientLight intensity={0.35} />
        <hemisphereLight args={['#bfe3ff', '#20306a', 0.9]} />
        <directionalLight position={[6, 6, 8]} intensity={2.6} color="#fff3e0" castShadow />
        <group rotation={[0, f * 0.002, 0]}>
          <Stars />
        </group>
        {cut === 'A' && <Earth radius={3} spin={f * 0.012} tilt={0.3} position={[0, -2.4, 0]} />}
        {cut === 'B' && (
          <>
            <Earth radius={2.2} spin={f * 0.02} tilt={0.3} position={[0, -1.2, 0]} />
            {/* 月の引力による潮のふくらみ（ブレーキ役） */}
            <mesh position={[0, -1.2, 0]} rotation={[0, -moonA, 0]} scale={[2.75, 2.45, 2.45]}>
              <sphereGeometry args={[1, 32, 32]} />
              <meshBasicMaterial color="#6fd3ff" transparent opacity={0.18} depthWrite={false} />
            </mesh>
            <Moon position={[moonPos[0], moonPos[1] - 1.2, moonPos[2]]} />
          </>
        )}
        {cut === 'C' && (
          <group>
            {/* 半分が昼、半分が夜の小さな惑星に座るキャラ */}
            <Earth radius={2.2} spin={0} tilt={0} sunDir={[1, 0.2, 0.3]} heat={1} clouds={false} position={[0, -1.0, 0]} />
            <Character position={[0, 1.2, 0]} rotation={[0, 0.15 + Math.sin(f * 0.1) * 0.1, 0]} scale={0.6} color={C.bodyColors[0]} expr="think" armL={0.3} armR={2.0 + Math.sin(f * 0.3) * 0.15} breathe={f / 40} />
            <House position={[1.1, 0.9, -0.3]} rotation={[0, 0, -0.5]} scale={0.35} wall="#fff4e0" roof={C.orange} />
            <Tree position={[-1.0, 0.95, -0.2]} rotation={[0, 0, 0.45]} scale={0.4} color="#bfe6ff" />
            <mesh position={[0, -1, 0]}>
              <sphereGeometry args={[0.01, 4, 4]} />
              <meshBasicMaterial color={new THREE.Color('#000')} />
            </mesh>
          </group>
        )}
      </Stage>
      <Vignette strength={0.5} />
      <Flash at={CUT_B} dur={5} max={0.4} />
      <Flash at={CUT_C} dur={5} max={0.4} />
    </AbsoluteFill>
  );
};
