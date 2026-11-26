import {Pose, pose, runPose, IDLE, Outfit} from '../three/Human';
import {V3} from '../lib/anim';

export const lerpPose = (a: Pose, b: Pose, t: number): Pose => {
  const k = Math.max(0, Math.min(1, t));
  const l = (x: number, y: number) => x + (y - x) * k;
  const l2 = (x: [number, number], y: [number, number]): [number, number] => [l(x[0], y[0]), l(x[1], y[1])];
  return {
    spine: l(a.spine, b.spine),
    twist: l(a.twist, b.twist),
    head: l(a.head, b.head),
    lSh: l2(a.lSh, b.lSh),
    rSh: l2(a.rSh, b.rSh),
    lEl: l(a.lEl, b.lEl),
    rEl: l(a.rEl, b.rEl),
    lHip: l2(a.lHip, b.lHip),
    rHip: l2(a.rHip, b.rHip),
    lKn: l(a.lKn, b.lKn),
    rKn: l(a.rKn, b.rKn),
  };
};
const seq = (t: number, keys: [number, Pose][]) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, pa] = keys[i];
    const [tb, pb] = keys[i + 1];
    if (t <= tb) {
      const u = (t - ta) / (tb - ta);
      return lerpPose(pa, pb, u * u * (3 - 2 * u));
    }
  }
  return keys[keys.length - 1][1];
};

// ---- スパイクの一連の動き（H = 打つ瞬間のフレーム）----
const CROUCH = pose({spine: 0.45, head: -0.2, lSh: [-1.1, 0.25], rSh: [-1.1, 0.25], lEl: 0.2, rEl: 0.2, lHip: [0.9, 0.05], rHip: [0.9, 0.05], lKn: 1.5, rKn: 1.5});
const RISE = pose({spine: -0.05, head: -0.3, lSh: [2.9, 0.15], rSh: [2.9, 0.15], lEl: 0.2, rEl: 0.3, lHip: [0.1, 0.05], rHip: [-0.05, 0.05], lKn: 0.2, rKn: 0.3});
const COCK = pose({spine: -0.3, twist: -0.35, head: -0.35, lSh: [2.5, 0.05], lEl: 0.15, rSh: [2.6, 0.55], rEl: 2.0, lHip: [0.35, 0.05], rHip: [-0.2, 0.08], lKn: 0.8, rKn: 0.5});
const SWING = pose({spine: 0.4, twist: 0.3, head: 0.1, lSh: [0.6, 0.25], lEl: 1.2, rSh: [1.1, 0.25], rEl: 0.1, lHip: [0.5, 0.05], rHip: [0.2, 0.05], lKn: 0.9, rKn: 0.7});
const LAND = pose({spine: 0.35, head: 0.1, lSh: [0.4, 0.3], rSh: [0.5, 0.3], lEl: 0.6, rEl: 0.6, lHip: [0.8, 0.06], rHip: [0.8, 0.06], lKn: 1.3, rKn: 1.3});

export const spiker = (f: number, H: number) => {
  // 助走 → 踏み切り → 空中 → 着地
  const t = f - H;
  const x0 = 6.2, xTake = 2.7, xLand = 1.9;
  let x = xTake, y = 0;
  let p: Pose;
  if (t < -24) {
    x = x0;
    p = IDLE;
  } else if (t < -12) {
    const u = (t + 24) / 12;
    x = x0 + (xTake - x0) * u;
    p = runPose(f * 0.6, 1);
  } else if (t < 14) {
    const u = (t + 12) / 26;
    x = xTake + (xLand - xTake) * u;
    y = Math.max(0, Math.sin(Math.PI * Math.min(1, (t + 10) / 24)) * 0.95) * (t > -10 ? 1 : 0);
    p = seq(t, [
      [-12, CROUCH],
      [-7, RISE],
      [-3, COCK],
      [0, COCK],
      [3, SWING],
      [12, LAND],
    ]);
  } else {
    x = xLand;
    p = seq(t, [
      [14, LAND],
      [30, IDLE],
    ]);
  }
  return {pos: [x, y, 0.6] as V3, p};
};

export const HIT_POINT: V3 = [1.95, 3.2, 0.6];

// セッター（-1.2 の位置からトス）
const SET = pose({spine: -0.05, head: -0.4, lSh: [2.7, 0.3], rSh: [2.7, 0.3], lEl: 1.3, rEl: 1.3, lKn: 0.5, rKn: 0.5, lHip: [0.3, 0.05], rHip: [0.3, 0.05]});
const SET_REL = pose({spine: -0.1, head: -0.5, lSh: [3.0, 0.15], rSh: [3.0, 0.15], lEl: 0.15, rEl: 0.15, lKn: 0.1, rKn: 0.1});
export const setter = (f: number, H: number) => {
  const t = f - H;
  return seq(t, [
    [-34, SET],
    [-26, SET_REL],
    [-14, IDLE],
  ]);
};
export const SETTER_POS: V3 = [0.9, 0, -1.6];

// トスされたボールの軌道（セッターの手 → 頂点 → 打点）
export const ballBeforeHit = (f: number, H: number): V3 => {
  const t = f - H;
  const t0 = -26;
  if (t < t0) return [SETTER_POS[0], 2.35, SETTER_POS[2]];
  const u = (t - t0) / -t0;
  const a: V3 = [SETTER_POS[0], 2.35, SETTER_POS[2]];
  const b = HIT_POINT;
  const apex = 4.6;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + 4 * (apex - (a[1] + b[1]) / 2) * u * (1 - u), a[2] + (b[2] - a[2]) * u];
};

// 打ったあとの直線軌道（travel フレームで target へ）
export const ballAfterHit = (f: number, H: number, target: V3, travel: number): V3 => {
  const u = Math.max(0, Math.min(1, (f - H) / travel));
  return [HIT_POINT[0] + (target[0] - HIT_POINT[0]) * u, HIT_POINT[1] + (target[1] - HIT_POINT[1]) * u, HIT_POINT[2] + (target[2] - HIT_POINT[2]) * u];
};

// ブロック（相手の前衛）
const BLOCK_UP = pose({spine: -0.05, head: -0.3, lSh: [3.0, 0.1], rSh: [3.0, 0.1], lEl: 0.05, rEl: 0.05, lKn: 0.2, rKn: 0.2});
const BLOCK_PREP = pose({spine: 0.25, lSh: [1.0, 0.2], rSh: [1.0, 0.2], lEl: 1.4, rEl: 1.4, lKn: 1.0, rKn: 1.0, lHip: [0.6, 0.05], rHip: [0.6, 0.05]});
export const blocker = (f: number, H: number) => {
  const t = f - H;
  const y = t > -8 && t < 14 ? Math.sin(Math.PI * ((t + 8) / 22)) * 0.75 : 0;
  const p = seq(t, [
    [-20, BLOCK_PREP],
    [-8, BLOCK_PREP],
    [-2, BLOCK_UP],
    [10, BLOCK_UP],
    [20, IDLE],
  ]);
  return {y, p};
};

// レシーブの構え
export const DIG = pose({spine: 0.55, head: -0.25, lSh: [1.25, -0.22], rSh: [1.25, -0.22], lEl: 0.05, rEl: 0.05, lHip: [1.0, 0.18], rHip: [1.0, 0.18], lKn: 1.4, rKn: 1.4});
// 弾かれて両腕が跳ね上がる
export const DIG_BLOWN = pose({spine: -0.4, head: -0.5, lSh: [2.9, 0.4], rSh: [2.9, 0.4], lEl: 0.3, rEl: 0.3, lHip: [0.4, 0.2], rHip: [0.3, 0.2], lKn: 0.9, rKn: 0.9});
// 耳をふさいでしゃがむ
export const COVER = pose({spine: 0.7, head: 0.5, lSh: [1.6, 0.9], rSh: [1.6, 0.9], lEl: 2.4, rEl: 2.4, lHip: [1.3, 0.2], rHip: [1.3, 0.2], lKn: 2.0, rKn: 2.0});
// 見上げる
export const LOOK_UP = pose({head: -0.6, spine: -0.1, lSh: [0.2, 0.15], rSh: [0.2, 0.15]});
// 頭を抱える（がっかり）
export const SLUMP = pose({spine: 0.5, head: 0.6, lSh: [1.9, 0.6], rSh: [1.9, 0.6], lEl: 2.3, rEl: 2.3, lKn: 0.3, rKn: 0.3});
// 喜ぶ（両手を突き上げる）
export const CHEER = (t: number) => pose({spine: -0.1, head: -0.3, lSh: [0.3, 2.7 + 0.15 * Math.sin(t * 0.5)], rSh: [0.3, 2.7 + 0.15 * Math.cos(t * 0.5)], lEl: 0.4, rEl: 0.4});
// 主審：笛を吹いてから、得点したチーム側へ腕を伸ばす
export const REF_WHISTLE = pose({rSh: [1.2, 0.1], rEl: 2.4, head: 0.05});
// 得点した相手チーム（-x 側）へ左腕を伸ばす（主審はコート側＝+z を向いている）
export const REF_POINT = pose({lSh: [0.2, 1.55], lEl: 0.05, rSh: [0, 0.1], head: -0.05});

export const RED: Outfit[] = [
  {shirt: '#c8322c', pants: '#1d1f26', skin: '#e3b08e', hair: '#1c1714', shoes: '#f2f2f2'},
  {shirt: '#c8322c', pants: '#1d1f26', skin: '#d6a27f', hair: '#2b211c', shoes: '#f2f2f2'},
  {shirt: '#f2f2f2', pants: '#1d1f26', skin: '#f0c9ae', hair: '#3a2a20', shoes: '#f2f2f2'},
];
export const BLUE: Outfit[] = [
  {shirt: '#2d5fa8', pants: '#f2f2f2', skin: '#e9b99a', hair: '#141110', shoes: '#2a2a30'},
  {shirt: '#2d5fa8', pants: '#f2f2f2', skin: '#b98161', hair: '#1c1714', shoes: '#2a2a30'},
  {shirt: '#2d5fa8', pants: '#f2f2f2', skin: '#f2d0b8', hair: '#5a3b26', shoes: '#2a2a30'},
  {shirt: '#f2c14e', pants: '#f2f2f2', skin: '#e3b08e', hair: '#2b211c', shoes: '#2a2a30'},
];
export const REF: Outfit = {shirt: '#f4f4f4', pants: '#1d1f26', skin: '#e3b08e', hair: '#4a4a4a', shoes: '#1d1f26'};
