import * as THREE from 'three';
import {CamKey, sampleCam} from './CameraRig';
import {HEIGHT, WIDTH} from '../theme';

// CameraRig と同じキーフレームから 3D 座標を画面座標（px）へ変換する
const cam = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 500);
export const project = (keys: CamKey[], frame: number, world: [number, number, number]) => {
  const {pos, look, fov} = sampleCam(keys, frame);
  cam.position.set(...pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(...look);
  cam.fov = fov;
  cam.aspect = WIDTH / HEIGHT;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  const v = new THREE.Vector3(...world).project(cam);
  if (v.z > 1) return {x: NaN, y: NaN};
  return {x: ((v.x + 1) / 2) * WIDTH, y: ((1 - v.y) / 2) * HEIGHT};
};
