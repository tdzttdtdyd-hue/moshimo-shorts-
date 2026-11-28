// 歩く人の共通処理：位置は道に沿って進み、向きは進む方向、足の動きは進んだ距離に合わせる（足が滑らない）
// walkPose の1周期（2π）で約 1.5m 進む（脚の長さ 約0.86m・振り幅 約0.45rad）
import {V3} from '../lib/anim';

export const STRIDE = 1.5;

export type Lane = {
  x: number; // 道の横位置
  z0: number; // スタート位置
  dir: 1 | -1; // +z（手前）へ / −z（奥）へ
  speed: number; // m/秒
  wobble?: number; // 千鳥足の横ゆれ（m）
  zMin?: number; // この範囲を出たら反対側から出直す（画面の外で入れ替える）
  zMax?: number;
};

export const walkAlong = (lane: Lane, f: number, fps = 30): {pos: V3; ry: number; phase: number} => {
  const zMin = lane.zMin ?? -45;
  const zMax = lane.zMax ?? 14;
  const span = zMax - zMin;
  const dist = (lane.speed * f) / fps;
  let z = lane.z0 + lane.dir * dist;
  z = ((((z - zMin) % span) + span) % span) + zMin;
  const w = lane.wobble ?? 0;
  const k = 1.3;
  const wx = w * Math.sin(dist * k + lane.x * 3);
  const dx = w * k * Math.cos(dist * k + lane.x * 3); // 進んだ距離あたりの横ずれ
  // 体の正面（+z）を進行方向へ向ける
  const ry = Math.atan2(dx, lane.dir);
  return {pos: [lane.x + wx, 0, z], ry, phase: (dist / STRIDE) * Math.PI * 2};
};
