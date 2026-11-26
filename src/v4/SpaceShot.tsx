import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {CameraRig, CamKey} from '../lib/CameraRig';
import {fbm3} from '../lib/rand';
import {HEIGHT, WIDTH} from '../theme';
import {Earth, SpaceBackdrop, Stars, Sun} from '../three/Earth';

// 宇宙から見た「止まった地球」：昼と夜の境目、夜側の街明かり、月
export const SPACE_CAM: CamKey[] = [
  {f: 0, pos: [0.5, 1.2, 7.2], look: [0, 0.2, 0], fov: 46},
  {f: 90, pos: [-1.2, 1.6, 9.5], look: [0.6, 0.2, 0], fov: 46},
  {f: 195, pos: [-0.5, 2.0, 12.5], look: [0.4, 0.0, 0], fov: 44},
];
export const MOON_POS = (f: number): [number, number, number] => {
  const a = 2.0 - f * 0.004;
  return [Math.cos(a) * 5.2 + 0.5, 1.6, Math.sin(a) * -3.5 - 1];
};
const SUN: [number, number, number] = [-9, 2, 4];
const TILT = 0.3, SPIN = 2.2;
// 地球ローカル座標での太陽の向き（街明かりを夜側に出すため）
const SUN_LOCAL = (() => {
  const v = new THREE.Vector3(...SUN).normalize();
  v.applyAxisAngle(new THREE.Vector3(0, 0, 1), -TILT);
  v.applyAxisAngle(new THREE.Vector3(0, 1, 0), -SPIN);
  return v.toArray() as [number, number, number];
})();

const Moon: React.FC<{position: [number, number, number]}> = ({position}) => {
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.55, 12);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      const n = fbm3(v.x * 3, v.y * 3, v.z * 3, 61, 4);
      const crater = Math.min(0, Math.abs(fbm3(v.x * 6, v.y * 6, v.z * 6, 62, 2)) - 0.12) * 0.3;
      v.multiplyScalar(0.55 * (1 + n * 0.03 + crater));
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

export const SpaceShot: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{antialias: true, preserveDrawingBuffer: true}} camera={{fov: 46, position: [0, 1, 8]}} style={{position: 'absolute', inset: 0, filter: 'saturate(0.82) contrast(1.05)'}}>
        <color attach="background" args={['#05071a']} />
        <CameraRig keys={SPACE_CAM} />
        <ambientLight intensity={0.08} />
        <hemisphereLight args={['#5a78d0', '#000010', 0.25]} />
        <directionalLight position={SUN} intensity={3.4} color="#fff0d8" />
        <SpaceBackdrop />
        <Stars />
        <Sun position={[SUN[0] * 12, SUN[1] * 12, SUN[2] * 12]} size={3} />
        <Earth radius={2.4} spin={SPIN} tilt={TILT} cityLights={SUN_LOCAL} cloudSpin={SPIN + f * 0.0015} position={[0, -0.6, 0]} />
        <Moon position={MOON_POS(f)} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
