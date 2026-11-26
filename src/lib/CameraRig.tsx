import {useThree} from '@react-three/fiber';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {easeIO, lerp3, V3} from './anim';
import {noise1} from './rand';

export type CamKey = {f: number; pos: V3; look: V3; fov?: number; ease?: (t: number) => number};
export type Shake = {from: number; dur: number; amp: number};

export const sampleCam = (keys: CamKey[], frame: number) => {
  let i = 0;
  while (i < keys.length - 2 && frame > keys[i + 1].f) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const span = Math.max(1, b.f - a.f);
  const raw = Math.max(0, Math.min(1, (frame - a.f) / span));
  const t = (b.ease ?? easeIO)(raw);
  return {
    pos: lerp3(a.pos, b.pos, t),
    look: lerp3(a.look, b.look, t),
    fov: (a.fov ?? 45) + ((b.fov ?? 45) - (a.fov ?? 45)) * t,
  };
};

// フレームから一意にカメラを決める（useFrame の delta は使わない）
export const CameraRig: React.FC<{keys: CamKey[]; shakes?: Shake[]; roll?: (f: number) => number; dollyZoom?: boolean}> = ({keys, shakes = [], roll}) => {
  const frame = useCurrentFrame();
  const {camera} = useThree();
  const {pos, look, fov} = sampleCam(keys, frame);
  let sx = 0, sy = 0;
  for (const s of shakes) {
    const t = frame - s.from;
    if (t >= 0 && t < s.dur) {
      const k = s.amp * Math.pow(1 - t / s.dur, 2);
      sx += noise1(frame * 0.9, 3) * k;
      sy += noise1(frame * 0.9, 7) * k;
    }
  }
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(pos[0] + sx, pos[1] + sy, pos[2]);
  cam.up.set(0, 1, 0);
  cam.lookAt(look[0] + sx * 0.5, look[1] + sy * 0.5, look[2]);
  if (roll) cam.rotateZ(roll(frame));
  cam.fov = fov;
  cam.near = 0.1;
  cam.far = 500;
  cam.updateProjectionMatrix();
  return null;
};
