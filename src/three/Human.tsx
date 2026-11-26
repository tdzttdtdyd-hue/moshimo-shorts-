import React from 'react';
import {V3} from '../lib/anim';

// 顔なし・等身大（約7.5頭身）の人型キャラクター。足元が y=0、身長 約1.75。
// 関節角（ラジアン）で姿勢を作る。感情は顔ではなくポーズで表現する。

export type Pose = {
  spine: number; // 前傾（+で前かがみ）
  twist: number; // 上半身のひねり
  head: number; // うなずき（+で下を向く）
  lSh: [number, number]; // [前方への振り上げ, 横への開き]
  rSh: [number, number];
  lEl: number; // 肘の曲げ
  rEl: number;
  lHip: [number, number]; // [前方への振り上げ, 横への開き]
  rHip: [number, number];
  lKn: number; // 膝の曲げ
  rKn: number;
};

export const IDLE: Pose = {spine: 0, twist: 0, head: 0, lSh: [0, 0.08], rSh: [0, 0.08], lEl: 0.15, rEl: 0.15, lHip: [0, 0.03], rHip: [0, 0.03], lKn: 0.02, rKn: 0.02};

export const pose = (p: Partial<Pose>): Pose => ({...IDLE, ...p});

export const walkPose = (ph: number, amp = 1): Pose => {
  const s = Math.sin(ph);
  return pose({
    spine: 0.04 * amp,
    lHip: [0.45 * s * amp, 0.03],
    rHip: [-0.45 * s * amp, 0.03],
    lKn: Math.max(0, -Math.sin(ph - 0.6)) * 0.8 * amp + 0.05,
    rKn: Math.max(0, Math.sin(ph - 0.6)) * 0.8 * amp + 0.05,
    lSh: [-0.4 * s * amp, 0.08],
    rSh: [0.4 * s * amp, 0.08],
    lEl: 0.25 + 0.2 * amp,
    rEl: 0.25 + 0.2 * amp,
  });
};

export const runPose = (ph: number, amp = 1): Pose => {
  const s = Math.sin(ph);
  return pose({
    spine: 0.28 * amp,
    head: -0.15,
    lHip: [0.85 * s * amp + 0.15, 0.04],
    rHip: [-0.85 * s * amp + 0.15, 0.04],
    lKn: (Math.max(0, -Math.sin(ph - 0.5)) * 1.6 + 0.2) * amp,
    rKn: (Math.max(0, Math.sin(ph - 0.5)) * 1.6 + 0.2) * amp,
    lSh: [-0.9 * s * amp, 0.12],
    rSh: [0.9 * s * amp, 0.12],
    lEl: 1.5,
    rEl: 1.5,
  });
};

// 吹き飛ばされて手足をばたつかせる
export const flailPose = (t: number, seed = 0): Pose => {
  const a = Math.sin(t * 0.9 + seed);
  const b = Math.cos(t * 1.1 + seed * 2);
  return pose({
    spine: -0.2 + 0.15 * a,
    head: -0.3,
    lSh: [2.2 + 0.5 * a, 0.9 + 0.3 * b],
    rSh: [2.0 - 0.5 * b, 1.0 + 0.3 * a],
    lEl: 0.5 + 0.4 * b,
    rEl: 0.6 + 0.4 * a,
    lHip: [0.6 + 0.5 * a, 0.25],
    rHip: [-0.3 - 0.5 * a, 0.2],
    lKn: 0.9 + 0.5 * b,
    rKn: 0.4 + 0.4 * a,
  });
};

// 驚いて両手を上げる
export const shockPose = (t: number): Pose =>
  pose({spine: -0.12, head: -0.2, lSh: [0.4, 2.3 + 0.08 * Math.sin(t)], rSh: [0.4, 2.3 + 0.08 * Math.cos(t)], lEl: 0.9, rEl: 0.9, lKn: 0.25, rKn: 0.25, lHip: [0.15, 0.1], rHip: [0.15, 0.1]});

// 両手でポールにつかまる（体は親グループで水平にする）
export const holdPose = (t: number, k: number): Pose =>
  pose({
    lSh: [3.0, 0.05],
    rSh: [3.0, -0.05],
    lEl: 0.1,
    rEl: 0.1,
    head: -0.1,
    lHip: [0.3 * Math.sin(t * 1.3) * k, 0.15 * k],
    rHip: [-0.3 * Math.sin(t * 1.3) * k, 0.15 * k],
    lKn: 0.3 + 0.3 * Math.sin(t * 1.7) * k,
    rKn: 0.3 + 0.3 * Math.cos(t * 1.7) * k,
  });

// 額の汗をぬぐう（暑さ）
export const hotPose = (t: number): Pose =>
  pose({spine: 0.22, head: 0.3, rSh: [1.6 + 0.15 * Math.sin(t * 0.3), 0.55], rEl: 2.3, lSh: [0.25, 0.2], lEl: 0.5, lKn: 0.18, rKn: 0.12, lHip: [0.12, 0.05]});

// 腕を抱えて縮こまる（寒さ）
export const coldPose = (t: number): Pose =>
  pose({spine: 0.18, head: 0.25, lSh: [0.9, -0.25], rSh: [0.9, -0.25], lEl: 2.0, rEl: 2.0, lKn: 0.2 + 0.03 * Math.sin(t * 2.5), rKn: 0.2, lHip: [0.15, -0.05], rHip: [0.15, -0.05]});

// 手を振る
export const wavePose = (t: number, right = true): Pose => {
  const w = Math.sin(t * 0.45) * 0.35;
  return right
    ? pose({rSh: [0.3, 2.5 + w], rEl: 0.5, lSh: [0, 0.12], head: -0.08})
    : pose({lSh: [0.3, 2.5 + w], lEl: 0.5, rSh: [0, 0.12], head: -0.08});
};

// あごに手を当てて考える
export const thinkPose = (t: number): Pose =>
  pose({head: 0.12 + 0.05 * Math.sin(t * 0.1), rSh: [1.0, 0.1], rEl: 2.45, lSh: [0.6, -0.15], lEl: 1.7, twist: 0.05 * Math.sin(t * 0.08)});

export type Outfit = {shirt: string; pants: string; skin?: string; hair?: string; shoes?: string};

export const OUTFITS: Outfit[] = [
  {shirt: '#e8eef5', pants: '#2f3e5c', skin: '#e9b99a', hair: '#2b211c'},
  {shirt: '#c94f4f', pants: '#3b3b44', skin: '#d6a27f', hair: '#1c1714'},
  {shirt: '#4f7fc9', pants: '#c8b79a', skin: '#f0c9ae', hair: '#5a3b26'},
  {shirt: '#f2c14e', pants: '#30343f', skin: '#b98161', hair: '#141110'},
  {shirt: '#5aa36e', pants: '#4a3f35', skin: '#e3b08e', hair: '#3a2a20'},
  {shirt: '#9b6fc9', pants: '#26303d', skin: '#f2d0b8', hair: '#8a5a2b'},
];

const SEG = 18;
const Mat: React.FC<{c: string; r?: number}> = ({c, r = 0.62}) => <meshStandardMaterial color={c} roughness={r} metalness={0} />;

// 円錐台のパーツ（先細りの手足用）
const Limb: React.FC<{len: number; r0: number; r1: number; color: string}> = ({len, r0, r1, color}) => (
  <group>
    <mesh position={[0, -len / 2, 0]} castShadow>
      <cylinderGeometry args={[r0, r1, len, SEG]} />
      <Mat c={color} />
    </mesh>
    <mesh position={[0, -len, 0]} castShadow>
      <sphereGeometry args={[r1, SEG, SEG / 2]} />
      <Mat c={color} />
    </mesh>
  </group>
);

type Props = {
  position?: V3;
  rotation?: V3;
  scale?: number;
  outfit?: Outfit;
  p?: Pose;
  tint?: string; // 凍結などで全身の色を上書き
};

export const Human: React.FC<Props> = ({position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, outfit = OUTFITS[0], p = IDLE, tint}) => {
  const skin = tint ?? outfit.skin ?? '#e9b99a';
  const shirt = tint ?? outfit.shirt;
  const pants = tint ?? outfit.pants;
  const shoes = tint ?? outfit.shoes ?? '#2a2a30';
  const hair = tint ?? outfit.hair ?? '#2b211c';

  const leg = (side: number, hip: [number, number], kn: number) => (
    <group position={[side * 0.095, 0.93, 0]} rotation={[-hip[0], 0, side * hip[1]]}>
      <Limb len={0.43} r0={0.082} r1={0.06} color={pants} />
      <group position={[0, -0.43, 0]} rotation={[kn, 0, 0]}>
        <Limb len={0.41} r0={0.058} r1={0.042} color={pants} />
        <mesh position={[0, -0.44, 0.06]} castShadow>
          <boxGeometry args={[0.1, 0.07, 0.25]} />
          <Mat c={shoes} r={0.4} />
        </mesh>
      </group>
    </group>
  );

  const arm = (side: number, sh: [number, number], el: number) => (
    <group position={[side * 0.215, 1.47, 0]} rotation={[-sh[0], 0, side * sh[1]]}>
      <mesh castShadow>
        <sphereGeometry args={[0.062, SEG, SEG / 2]} />
        <Mat c={shirt} />
      </mesh>
      <Limb len={0.29} r0={0.052} r1={0.042} color={shirt} />
      <group position={[0, -0.29, 0]} rotation={[-el, 0, 0]}>
        <Limb len={0.25} r0={0.038} r1={0.03} color={skin} />
        <mesh position={[0, -0.3, 0]} scale={[0.75, 1.15, 0.45]} castShadow>
          <sphereGeometry args={[0.055, SEG, SEG / 2]} />
          <Mat c={skin} />
        </mesh>
      </group>
    </group>
  );

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {leg(-1, p.lHip, p.lKn)}
      {leg(1, p.rHip, p.rKn)}
      {/* 骨盤 */}
      <mesh position={[0, 0.96, 0]} scale={[1, 0.7, 0.68]} castShadow>
        <sphereGeometry args={[0.165, SEG, SEG]} />
        <Mat c={pants} />
      </mesh>
      {/* 上半身（腰を支点に前傾・ひねり） */}
      <group position={[0, 0.98, 0]} rotation={[p.spine, p.twist, 0]}>
        <group position={[0, -0.98, 0]}>
          <mesh position={[0, 1.24, 0]} scale={[1, 1, 0.62]} castShadow>
            <cylinderGeometry args={[0.2, 0.155, 0.48, SEG]} />
            <Mat c={shirt} />
          </mesh>
          <mesh position={[0, 1.47, 0]} scale={[1.18, 0.42, 0.7]} castShadow>
            <sphereGeometry args={[0.175, SEG, SEG]} />
            <Mat c={shirt} />
          </mesh>
          {arm(-1, p.lSh, p.lEl)}
          {arm(1, p.rSh, p.rEl)}
          {/* 首と頭（顔は描かない） */}
          <group position={[0, 1.53, 0]} rotation={[p.head, 0, 0]}>
            <mesh position={[0, 0.05, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.052, 0.1, SEG]} />
              <Mat c={skin} />
            </mesh>
            <mesh position={[0, 0.2, 0.01]} scale={[0.92, 1.12, 1]} castShadow>
              <sphereGeometry args={[0.105, 24, 24]} />
              <Mat c={skin} r={0.7} />
            </mesh>
            <mesh position={[0, 0.225, -0.008]} scale={[0.97, 1.1, 1.02]} rotation={[-0.35, 0, 0]} castShadow>
              <sphereGeometry args={[0.108, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <Mat c={hair} r={0.85} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};
