import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../three/Stage';
import {Earth, SpaceBackdrop, Stars, Sun} from '../three/Earth';
import {Human, OUTFITS, thinkPose} from '../three/Human';
import {House} from '../three/Props';
import {Forest} from '../three/Landscape';
import {CameraRig} from '../lib/CameraRig';
import {easeOut} from '../lib/anim';
import {fbm3} from '../lib/rand';
import {CalloutView, Flash, Vignette} from '../components/Overlay';
import {CamKey} from '../lib/CameraRig';
import {project} from '../lib/project';
import {CALLOUTS} from '../components/callouts';
import {SpaceLights} from './Scene01Hook';

const CUT_B = 70;
const CUT_C = 160;

// クレーターのある月
const Moon: React.FC<{position: [number, number, number]}> = ({position}) => {
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.7, 12);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      const n = fbm3(v.x * 3, v.y * 3, v.z * 3, 61, 4);
      const crater = Math.min(0, Math.abs(fbm3(v.x * 6, v.y * 6, v.z * 6, 62, 2)) - 0.12) * 0.3;
      v.multiplyScalar(0.7 * (1 + n * 0.03 + crater));
      p.setXYZ(i, v.x, v.y, v.z);
      c.set('#cfcac0').lerp(new THREE.Color('#8f8a82'), Math.max(0, n * 2.5));
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={position}>
      <meshStandardMaterial vertexColors flatShading roughness={1} />
    </mesh>
  );
};

const CAM_B: CamKey[] = [
  {f: CUT_B, pos: [-3, 4, 13], look: [1, -0.6, 0], fov: 46},
  {f: CUT_C, pos: [3, 3, 12.5], look: [1, -0.6, 0], fov: 46},
];

export const Scene09End: React.FC = () => {
  const f = useCurrentFrame();
  const cut = f < CUT_B ? 'A' : f < CUT_C ? 'B' : 'C';
  const moonA = 0.6 + (f - CUT_B) * 0.012;
  const moonPos: [number, number, number] = [Math.cos(moonA) * 6.5, -1.0, Math.sin(moonA) * -6.5 + 1];
  return (
    <AbsoluteFill>
      <Stage bg="#05071a" shadows={cut === 'C'}>
        {cut === 'A' && (
          <CameraRig
            keys={[
              {f: 0, pos: [0, 0.6, 8.5], look: [0, -1.2, 0], fov: 48},
              {f: CUT_B, pos: [1.2, 1.2, 11], look: [0, -1.0, 0], fov: 46},
            ]}
          />
        )}
        {cut === 'B' && (
          <CameraRig keys={CAM_B} />
        )}
        {cut === 'C' && (
          <CameraRig
            keys={[
              {f: CUT_C, pos: [0.4, 2.3, 4.2], look: [0, 1.6, 0], fov: 46, ease: easeOut},
              {f: 225, pos: [0, 2.5, 19], look: [0, 0.4, 0], fov: 42},
            ]}
          />
        )}
        <SpaceLights />
        {cut === 'C' && <directionalLight position={[6, 6, 8]} intensity={0.8} castShadow shadow-mapSize={[1024, 1024]} />}
        <SpaceBackdrop />
        <group rotation={[0, f * 0.002, 0]}>
          <Stars />
        </group>
        <Sun position={[70, 45, -90]} size={3} />
        {cut === 'A' && <Earth radius={3} spin={f * 0.012} tilt={0.3} position={[0, -2.4, 0]} />}
        {cut === 'B' && (
          <>
            <Earth radius={2.2} spin={f * 0.02} tilt={0.3} position={[0, -1.2, 0]} />
            <group position={[0, -1.2, 0]} rotation={[0, -moonA, 0]} scale={[2.75, 2.42, 2.42]}>
              <mesh>
                <sphereGeometry args={[1, 48, 48]} />
                <meshBasicMaterial color="#6fd3ff" transparent opacity={0.12} depthWrite={false} />
              </mesh>
            </group>
            <Moon position={moonPos} />
          </>
        )}
        {cut === 'C' && (
          <group>
            <Earth radius={2.2} spin={0} tilt={0} sunDir={[1, 0.2, 0.3]} heat={1} clouds={false} position={[0, -1.0, 0]} detail={48} />
            <Human position={[0, 1.22, 0]} rotation={[0, 0.15 + Math.sin(f * 0.1) * 0.1, 0]} scale={0.75} outfit={OUTFITS[1]} p={thinkPose(f)} />
            <group position={[1.0, 1.0, -0.3]} rotation={[0, 0, -0.5]}>
              <House scale={0.35} wall="#fff4e0" roof="#ff8a1f" />
            </group>
            <group position={[-1.0, 1.0, -0.2]} rotation={[0, 0, 0.45]}>
              <Forest trees={[{x: 0, z: 0, s: 0.4, type: 'pine'}]} seed={2} />
            </group>
          </group>
        )}
      </Stage>
      <Vignette strength={0.5} />
      <CalloutView {...project(CAM_B, f, moonPos)} {...CALLOUTS.moon} from={96} to={158} dy={-110} />
      <Flash at={CUT_B} dur={5} max={0.4} />
      <Flash at={CUT_C} dur={5} max={0.4} />
    </AbsoluteFill>
  );
};
