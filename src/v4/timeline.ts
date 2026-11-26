// 1カット構成の時間軸。動画のフレーム → シミュレーション内の時刻（秒）を区間ごとの再生倍率で決める。
import {FPS} from '../theme';

export const F = {
  STOP: 45, // 自転が止まる瞬間
  SLOW_END: 150, // スローモーション終了
  RT_END: 195, // 等速終了
  FF10_END: 240,
  TSUNAMI_END: 330, // 津波（×200）
  FF1_END: 480, // ×5万
  FF2_END: 600, // ×50万
  CRANE: 870, // 空へ上昇開始
  SPACE: 945, // 宇宙へ
  END: 1140,
};

// [開始, 終了, 倍率]
export const SEGMENTS: [number, number, number][] = [
  [F.STOP, F.SLOW_END, 0.25],
  [F.SLOW_END, F.RT_END, 1],
  [F.RT_END, F.FF10_END, 10],
  [F.FF10_END, F.TSUNAMI_END, 200],
  [F.TSUNAMI_END, F.FF1_END, 50000],
  [F.FF1_END, F.FF2_END, 500000],
  [F.FF2_END, F.END, 2200000],
];

// 自転停止からの経過秒（停止前は負）
export const simTime = (frame: number) => {
  if (frame < F.STOP) return (frame - F.STOP) / FPS;
  let t = 0;
  for (const [a, b, r] of SEGMENTS) {
    if (frame <= a) break;
    t += ((Math.min(frame, b) - a) / FPS) * r;
  }
  return t;
};

export const rateAt = (frame: number) => {
  if (frame < F.STOP) return 1;
  for (const [a, b, r] of SEGMENTS) if (frame >= a && frame < b) return r;
  return SEGMENTS[SEGMENTS.length - 1][2];
};

export const simDays = (frame: number) => simTime(frame) / 86400;

const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0');
export const formatClock = (sec: number) => {
  if (sec < 0) {
    const s = -sec;
    return `−${Math.floor(s / 60)}:${pad(s % 60)}.${pad((s * 1000) % 1000, 3)}`;
  }
  if (sec < 3600) return `${Math.floor(sec / 60)}:${pad(sec % 60)}.${pad((sec * 1000) % 1000, 3)}`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}:${pad((sec / 60) % 60)}:${pad(sec % 60)}`;
  const d = Math.floor(sec / 86400);
  return `${d}日 ${pad((sec / 3600) % 24)}:${pad((sec / 60) % 60)}`;
};

export const formatRate = (r: number) => {
  if (r < 1) return `×${r}`;
  if (r >= 10000) return `×${(r / 10000).toLocaleString('ja-JP', {maximumFractionDigits: 0})}万`;
  return `×${r.toLocaleString('ja-JP')}`;
};

// 東京（北緯35.7°）での太陽の向き。自転停止時刻を正午とし、太陽の時角は 365日で1周。
// ワールド座標：+x=西, -x=東, -z=南, +z=北, +y=上
export const LAT = (35.7 * Math.PI) / 180;
export const hourAngle = (frame: number) => ((Math.max(0, simDays(frame)) / 365) * Math.PI * 2);
export const sunDir = (frame: number): [number, number, number] => {
  const H = hourAngle(frame);
  const E = -Math.sin(H);
  const N = -Math.cos(H) * Math.sin(LAT);
  const U = Math.cos(H) * Math.cos(LAT);
  return [-E, U, N];
};
export const sunElevation = (frame: number) => Math.asin(Math.max(-1, Math.min(1, sunDir(frame)[1])));

// 0=昼, 1=夜 のなめらかな値（日没前後で切り替え）
export const nightK = (frame: number) => {
  const e = sunElevation(frame);
  return Math.max(0, Math.min(1, (0.08 - e) / 0.2));
};
export const skyState = (frame: number): 'day' | 'dusk' | 'night' => {
  const e = sunElevation(frame);
  if (e > 0.12) return 'day';
  if (e > -0.06) return 'dusk';
  return 'night';
};

// 雪の積もり具合（夜が続くほど増える）
export const snowK = (frame: number) => Math.max(0, Math.min(1, (frame - 720) / 140));
// 津波の水位
export const waterLevel = (frame: number) => {
  if (frame < F.FF10_END) return -1;
  if (frame < F.TSUNAMI_END) return -0.5 + ((frame - F.FF10_END) / (F.TSUNAMI_END - F.FF10_END)) * 3.2;
  // その後ゆっくり引いていく
  return Math.max(-1, 2.7 - ((frame - F.TSUNAMI_END) / 220) * 3.7);
};
