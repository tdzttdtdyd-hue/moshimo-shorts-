import React from 'react';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {HEIGHT, WIDTH} from '../theme';

// すべての 3D シーンの共通キャンバス
export const Stage: React.FC<{children: React.ReactNode; bg: string; fog?: [string, number, number]; shadows?: boolean}> = ({children, bg, fog, shadows = true}) => (
  <ThreeCanvas
    width={WIDTH}
    height={HEIGHT}
    shadows={shadows ? {type: THREE.PCFSoftShadowMap} : false}
    gl={{antialias: true, preserveDrawingBuffer: true}}
    camera={{fov: 45, position: [0, 5, 12], near: 0.1, far: 500}}
    style={{position: 'absolute', inset: 0}}
  >
    <color attach="background" args={[bg]} />
    {fog && <fog attach="fog" args={fog} />}
    {children}
  </ThreeCanvas>
);

export const Lights: React.FC<{sun?: [number, number, number]; intensity?: number; sky?: string; ground?: string; shadowSize?: number; color?: string; ambient?: number}> = ({
  sun = [8, 14, 6],
  intensity = 2.2,
  sky = '#cfe9ff',
  ground = '#a7d98a',
  shadowSize = 18,
  color = '#fff4e0',
  ambient = 0.25,
}) => (
  <>
    <hemisphereLight args={[sky, ground, 1.1]} />
    <ambientLight intensity={ambient} />
    <directionalLight
      position={sun}
      intensity={intensity}
      color={color}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-shadowSize}
      shadow-camera-right={shadowSize}
      shadow-camera-top={shadowSize}
      shadow-camera-bottom={-shadowSize}
      shadow-camera-far={80}
      shadow-bias={-0.0004}
      shadow-radius={4}
    />
  </>
);
