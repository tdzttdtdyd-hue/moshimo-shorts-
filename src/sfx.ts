// 効果音（すべて FFmpeg で合成。scripts/make-sfx.sh 参照）
// BGM を後から重ねるため全体を控えめに（ピーク -6dBFS 以下）
export const SFX_GAIN = 0.55;
export type SfxEvent = {scene: string; at: number; file: string; vol?: number; dur?: number};
export const SFX: SfxEvent[] = [
  {scene: 's01_hook', at: 0, file: 'whoosh', vol: 0.7, dur: 25},
  {scene: 's01_hook', at: 2, file: 'pop', vol: 0.6, dur: 10},
  {scene: 's01_hook', at: 32, file: 'boom', vol: 1, dur: 30},
  {scene: 's02_equator', at: 14, file: 'wind', vol: 0.8, dur: 75},
  {scene: 's02_equator', at: 60, file: 'whoosh', vol: 0.7, dur: 25},
  {scene: 's02_equator', at: 80, file: 'ding', vol: 0.7, dur: 25},
  {scene: 's03_japan', at: 3, file: 'pop', vol: 0.6, dur: 10},
  {scene: 's03_japan', at: 36, file: 'ding', vol: 0.6, dur: 25},
  {scene: 's03_japan', at: 37, file: 'boom', vol: 0.9, dur: 30},
  {scene: 's03_japan', at: 38, file: 'wind', vol: 0.7, dur: 67},
  {scene: 's04_tsunami', at: 0, file: 'rumble', vol: 0.9, dur: 120},
  {scene: 's05_oceans', at: 0, file: 'whoosh', vol: 0.6, dur: 25},
  {scene: 's05_oceans', at: 62, file: 'pop', vol: 0.6, dur: 10},
  {scene: 's06_daylength', at: 44, file: 'ding', vol: 0.7, dur: 25},
  {scene: 's07_extremes', at: 3, file: 'pop', vol: 0.6, dur: 10},
  {scene: 's07_extremes', at: 42, file: 'whoosh', vol: 0.8, dur: 25},
  {scene: 's07_extremes', at: 46, file: 'pop', vol: 0.6, dur: 10},
  {scene: 's08_terminator', at: 24, file: 'pop', vol: 0.7, dur: 10},
  {scene: 's09_end', at: 3, file: 'pop', vol: 0.5, dur: 10},
  {scene: 's09_end', at: 110, file: 'ding', vol: 0.7, dur: 25},
  {scene: 's09_end', at: 162, file: 'pop', vol: 0.6, dur: 10},
];

// v4（1カット構成）の効果音タイムライン（動画全体のフレーム）
export const SFX_V4: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 40, file: 'whoosh', vol: 0.7, dur: 25},
  {at: 45, file: 'boom', vol: 1, dur: 30},
  {at: 46, file: 'wind', vol: 0.9, dur: 75},
  {at: 63, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 134, file: 'ding', vol: 0.6, dur: 25},
  {at: 150, file: 'wind', vol: 0.8, dur: 75},
  {at: 195, file: 'ff', vol: 0.6, dur: 30},
  {at: 240, file: 'ff', vol: 0.6, dur: 30},
  {at: 242, file: 'rumble', vol: 0.9, dur: 120},
  {at: 330, file: 'ff', vol: 0.7, dur: 30},
  {at: 402, file: 'ding', vol: 0.6, dur: 25},
  {at: 480, file: 'ff', vol: 0.7, dur: 30},
  {at: 488, file: 'pop', vol: 0.5, dur: 10},
  {at: 600, file: 'ff', vol: 0.7, dur: 30},
  {at: 870, file: 'whoosh', vol: 0.8, dur: 25},
  {at: 900, file: 'whoosh', vol: 0.6, dur: 25},
  {at: 945, file: 'ding', vol: 0.5, dur: 25},
  {at: 1051, file: 'ding', vol: 0.6, dur: 25},
  {at: 1099, file: 'pop', vol: 0.5, dur: 10},
];

// バレー動画の効果音（動画全体のフレーム）
export const SFX_VOLLEY: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 56, file: 'hit', vol: 0.7, dur: 15},
  {at: 65, file: 'pop', vol: 0.5, dur: 10},
  {at: 105 + 26, file: 'hit', vol: 0.8, dur: 15},
  {at: 105 + 31, file: 'hit', vol: 0.6, dur: 15},
  {at: 210 + 26, file: 'hit', vol: 0.9, dur: 15},
  {at: 210 + 57, file: 'boom', vol: 0.6, dur: 30},
  {at: 315 + 26, file: 'hit', vol: 1, dur: 15},
  {at: 315 + 28, file: 'boom', vol: 0.9, dur: 30},
  {at: 420 + 28, file: 'boom', vol: 1, dur: 30},
  {at: 420 + 32, file: 'glass', vol: 0.8, dur: 40},
  {at: 420 + 84, file: 'ding', vol: 0.5, dur: 25},
  {at: 540, file: 'ff', vol: 0.6, dur: 30},
  {at: 540 + 25, file: 'boom', vol: 0.8, dur: 30},
  {at: 540 + 65, file: 'boom', vol: 0.9, dur: 30},
  {at: 540 + 105, file: 'boom', vol: 1, dur: 30},
  {at: 690 + 30, file: 'boom', vol: 1, dur: 30},
  {at: 690 + 62, file: 'whoosh', vol: 0.7, dur: 25},
  {at: 870, file: 'ff', vol: 0.6, dur: 30},
  {at: 870 + 76, file: 'whoosh', vol: 0.8, dur: 25},
  {at: 870 + 82, file: 'boom', vol: 0.8, dur: 30},
  {at: 1020 + 18, file: 'whistle', vol: 0.8, dur: 30},
  {at: 1020 + 97, file: 'ding', vol: 0.7, dur: 25},
];

// 1円玉動画の効果音（動画全体のフレーム）
export const SFX_COIN: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 10, file: 'coin', vol: 0.8, dur: 20},
  {at: 74, file: 'pop', vol: 0.5, dur: 10},
  {at: 126, file: 'coin', vol: 0.45, dur: 15},
  {at: 135, file: 'coin', vol: 0.49, dur: 15},
  {at: 144, file: 'coin', vol: 0.53, dur: 15},
  {at: 153, file: 'coin', vol: 0.5700000000000001, dur: 15},
  {at: 162, file: 'coin', vol: 0.61, dur: 15},
  {at: 171, file: 'coin', vol: 0.65, dur: 15},
  {at: 180, file: 'coin', vol: 0.69, dur: 15},
  {at: 189, file: 'coin', vol: 0.73, dur: 15},
  {at: 198, file: 'coin', vol: 0.77, dur: 15},
  {at: 226, file: 'ding', vol: 0.6, dur: 25},
  {at: 270, file: 'ff', vol: 0.5, dur: 30},
  {at: 300, file: 'coins', vol: 0.8, dur: 60},
  {at: 362, file: 'ding', vol: 0.6, dur: 25},
  {at: 420, file: 'ff', vol: 0.5, dur: 30},
  {at: 480, file: 'whoosh', vol: 0.7, dur: 25},
  {at: 502, file: 'ding', vol: 0.6, dur: 25},
  {at: 570, file: 'ff', vol: 0.5, dur: 30},
  {at: 590, file: 'rumble', vol: 0.5, dur: 120},
  {at: 648, file: 'ding', vol: 0.6, dur: 25},
  {at: 750, file: 'ff', vol: 0.5, dur: 30},
  {at: 790, file: 'coins', vol: 0.9, dur: 60},
  {at: 832, file: 'ding', vol: 0.6, dur: 25},
  {at: 930, file: 'ff', vol: 0.5, dur: 30},
  {at: 1008, file: 'ding', vol: 0.6, dur: 25},
  {at: 1080, file: 'ff', vol: 0.6, dur: 30},
  {at: 1170, file: 'boom', vol: 0.8, dur: 30},
  {at: 1280, file: 'coins', vol: 0.8, dur: 60},
  {at: 1350, file: 'pop', vol: 0.6, dur: 10},
  {at: 1432, file: 'coin', vol: 0.7, dur: 20},
];

// 太陽の動画の効果音（動画全体のフレーム）
export const SFX_SUN: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 70, file: 'whoosh', vol: 0.6, dur: 25},
  {at: 72, file: 'pop', vol: 0.5, dur: 10},
  {at: 120, file: 'wind', vol: 0.6, dur: 75},
  {at: 182, file: 'ding', vol: 0.5, dur: 25},
  {at: 270, file: 'ice', vol: 0.8, dur: 40},
  {at: 330, file: 'ice', vol: 0.6, dur: 40},
  {at: 332, file: 'ding', vol: 0.5, dur: 25},
  {at: 420, file: 'whoosh', vol: 0.6, dur: 25},
  {at: 482, file: 'ding', vol: 0.5, dur: 25},
  {at: 570, file: 'ff', vol: 0.5, dur: 30},
  {at: 640, file: 'ding', vol: 0.5, dur: 25},
  {at: 750, file: 'ff', vol: 0.5, dur: 30},
  {at: 760, file: 'wind', vol: 0.5, dur: 75},
  {at: 820, file: 'ding', vol: 0.5, dur: 25},
  {at: 930, file: 'ff', vol: 0.5, dur: 30},
  {at: 1000, file: 'ding', vol: 0.5, dur: 25},
  {at: 1140, file: 'pop', vol: 0.6, dur: 10},
];

// 全人類一列の動画の効果音（動画全体のフレーム）
export const SFX_LINE: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 70, file: 'pop', vol: 0.5, dur: 10},
  {at: 120, file: 'whoosh', vol: 0.6, dur: 25},
  {at: 182, file: 'ding', vol: 0.5, dur: 25},
  {at: 270, file: 'whoosh', vol: 0.6, dur: 25},
  {at: 332, file: 'ding', vol: 0.5, dur: 25},
  {at: 420, file: 'ff', vol: 0.6, dur: 30},
  {at: 488, file: 'ding', vol: 0.6, dur: 25},
  {at: 600, file: 'whoosh', vol: 0.6, dur: 25},
  {at: 662, file: 'ding', vol: 0.5, dur: 25},
  {at: 780, file: 'whoosh', vol: 0.7, dur: 25},
  {at: 832, file: 'ding', vol: 0.5, dur: 25},
  {at: 930, file: 'ff', vol: 0.5, dur: 30},
  {at: 992, file: 'ding', vol: 0.5, dur: 25},
  {at: 1226, file: 'pop', vol: 0.6, dur: 10},
];

// 長尺版（太陽）の効果音
export const SFX_SUNLONG: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 20, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 300, file: 'pop', vol: 0.5, dur: 10},
  {at: 740, file: 'pop', vol: 0.5, dur: 10},
  {at: 760, file: 'pop', vol: 0.5, dur: 10},
  {at: 930, file: 'pop', vol: 0.5, dur: 10},
  {at: 1196, file: 'whoosh', vol: 0.6, dur: 25},
  {at: 1210, file: 'ding', vol: 0.6, dur: 25},
  {at: 1600, file: 'pop', vol: 0.5, dur: 10},
  {at: 1830, file: 'pop', vol: 0.5, dur: 10},
  {at: 2050, file: 'pop', vol: 0.5, dur: 10},
  {at: 2250, file: 'wind', vol: 0.5, dur: 75},
  {at: 2280, file: 'pop', vol: 0.5, dur: 10},
  {at: 2300, file: 'ice', vol: 0.6, dur: 40},
  {at: 2700, file: 'whoosh', vol: 0.5, dur: 25},
];

// もし人類が全員、堀大輔の生活を送ったら
export const SFX_HORI: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 98, file: 'whoosh', vol: 0.7, dur: 25},
  {at: 112, file: 'hit', vol: 0.45, dur: 20},
  {at: 180, file: 'whoosh', vol: 0.7, dur: 25},
  {at: 194, file: 'hit', vol: 0.5, dur: 20},
  {at: 200, file: 'pop', vol: 0.5, dur: 10},
  ...[0, 1, 2, 3, 4, 5].map((i) => ({at: 315 + i * 40 + 2, file: 'ding', vol: 0.32, dur: 25})),
  {at: 465, file: 'pop', vol: 0.5, dur: 10},
  {at: 579, file: 'pop', vol: 0.5, dur: 10},
  {at: 671, file: 'rumble', vol: 0.5, dur: 60},
  {at: 806, file: 'pop', vol: 0.5, dur: 10},
  {at: 850, file: 'whoosh', vol: 0.6, dur: 25},
  {at: 983, file: 'ding', vol: 0.6, dur: 25},
  {at: 1040, file: 'whoosh', vol: 0.7, dur: 25},
  {at: 1073, file: 'boom', vol: 0.6, dur: 45},
  {at: 1074, file: 'hit', vol: 0.6, dur: 20},
  {at: 1160, file: 'pop', vol: 0.5, dur: 10},
  {at: 1264, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 1372, file: 'pop', vol: 0.5, dur: 10},
];

// もしも月が地球に少しずつ近づいてきたら
// 場面の開始：m1 0 / m2 150 / m3 330 / m4 510 / m5 690 / m6 870 / m7 1050 / m8 1250
export const SFX_MOON: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 66, file: 'pop', vol: 0.5, dur: 10},
  {at: 150, file: 'ff', vol: 0.55, dur: 30},
  {at: 194, file: 'ding', vol: 0.5, dur: 25},
  {at: 200, file: 'wind', vol: 0.35, dur: 90},
  {at: 330, file: 'whoosh', vol: 0.6, dur: 25},
  {at: 374, file: 'ding', vol: 0.5, dur: 25},
  {at: 400, file: 'rumble', vol: 0.4, dur: 90},
  {at: 510, file: 'whoosh', vol: 0.6, dur: 25},
  {at: 560, file: 'ding', vol: 0.5, dur: 25},
  {at: 690, file: 'whoosh', vol: 0.6, dur: 25},
  {at: 736, file: 'rumble', vol: 0.7, dur: 140},
  {at: 740, file: 'ding', vol: 0.5, dur: 25},
  {at: 750, file: 'boom', vol: 0.5, dur: 45},
  {at: 890, file: 'pop', vol: 0.5, dur: 10},
  {at: 930, file: 'glass', vol: 0.55, dur: 40},
  {at: 932, file: 'boom', vol: 0.6, dur: 45},
  {at: 1050, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 1080, file: 'ding', vol: 0.45, dur: 25},
  {at: 1260, file: 'pop', vol: 0.5, dur: 10},
];

// もしも地球が立方体だったら
// 場面の開始：c1 0 / c2 150 / c3 390 / c4 570 / c5 780 / c6 960 / c7 1110 / c8 1260
export const SFX_CUBE: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 55, file: 'rumble', vol: 0.5, dur: 75},
  {at: 120, file: 'hit', vol: 0.5, dur: 20},
  {at: 84, file: 'pop', vol: 0.5, dur: 10},
  {at: 150, file: 'wind', vol: 0.35, dur: 90},
  {at: 220, file: 'pop', vol: 0.45, dur: 10},
  {at: 390, file: 'whoosh', vol: 0.6, dur: 25},
  {at: 410, file: 'pop', vol: 0.45, dur: 10},
  {at: 440, file: 'ding', vol: 0.5, dur: 25},
  {at: 570, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 680, file: 'ding', vol: 0.5, dur: 25},
  {at: 780, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 960, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 980, file: 'pop', vol: 0.5, dur: 10},
  {at: 1110, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 1180, file: 'ding', vol: 0.6, dur: 25},
  {at: 1260, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 1376, file: 'pop', vol: 0.5, dur: 10},
];

// もし全人類のスマホが1日なくなったら
// 場面の開始：p1 0 / p2 150 / p3 330 / p4 495 / p5 675 / p6 855 / p7 1020 / p8 1200
export const SFX_PHONE: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 66, file: 'pop', vol: 0.45, dur: 10},
  {at: 100, file: 'whoosh', vol: 0.7, dur: 25},
  {at: 112, file: 'hit', vol: 0.45, dur: 20},
  ...[30, 48, 64, 84].map((t) => ({at: 150 + t + 7, file: 'ding', vol: 0.35, dur: 20})),
  {at: 330, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 360, file: 'pop', vol: 0.45, dur: 10},
  {at: 370, file: 'pop', vol: 0.45, dur: 10},
  {at: 495, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 675, file: 'whoosh', vol: 0.5, dur: 25},
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({at: 675 + 28 + i * 15, file: 'coin', vol: 0.4, dur: 20})),
  {at: 855, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 885, file: 'pop', vol: 0.5, dur: 10},
  {at: 1020, file: 'wind', vol: 0.3, dur: 120},
  {at: 1226, file: 'pop', vol: 0.4, dur: 10},
  {at: 1300, file: 'ding', vol: 0.5, dur: 25},
  {at: 1316, file: 'pop', vol: 0.5, dur: 10},
];

// もしも無人島にワープしたら
// 場面の開始：0 / 120 / 240 / 420 / 600 / 780 / 960 / 1110 / 1260 / 1410 / 1590
export const SFX_ISLAND: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 18, file: 'whoosh', vol: 0.7, dur: 25},
  {at: 40, file: 'hit', vol: 0.5, dur: 20},
  {at: 66, file: 'pop', vol: 0.45, dur: 10},
  {at: 140, file: 'pop', vol: 0.45, dur: 10},
  {at: 302, file: 'whoosh', vol: 0.4, dur: 25},
  {at: 280, file: 'ding', vol: 0.45, dur: 25},
  {at: 478, file: 'hit', vol: 0.55, dur: 20},
  {at: 560, file: 'ding', vol: 0.5, dur: 25},
  {at: 600, file: 'ff', vol: 0.5, dur: 30},
  {at: 860, file: 'wind', vol: 0.4, dur: 90},
  {at: 1000, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 1020, file: 'ding', vol: 0.6, dur: 25},
  {at: 1162, file: 'hit', vol: 0.5, dur: 20},
  {at: 1166, file: 'pop', vol: 0.45, dur: 10},
  {at: 1260, file: 'whoosh', vol: 0.45, dur: 25},
  {at: 1450, file: 'pop', vol: 0.45, dur: 10},
  {at: 1590, file: 'rumble', vol: 0.55, dur: 200},
  {at: 1674, file: 'pop', vol: 0.5, dur: 10},
  {at: 1746, file: 'ding', vol: 0.5, dur: 25},
];

// もしも1日だけペットと話せたら
// 場面の開始：0 / 180 / 360 / 540 / 720 / 900 / 1080 / 1290
export const SFX_PET: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 84, file: 'pop', vol: 0.5, dur: 10},
  {at: 186, file: 'pop', vol: 0.5, dur: 10},
  {at: 240, file: 'pop', vol: 0.5, dur: 10},
  {at: 390, file: 'pop', vol: 0.5, dur: 10},
  {at: 590, file: 'pop', vol: 0.5, dur: 10},
  {at: 740, file: 'pop', vol: 0.5, dur: 10},
  {at: 920, file: 'pop', vol: 0.5, dur: 10},
  {at: 1090, file: 'pop', vol: 0.5, dur: 10},
  {at: 1166, file: 'pop', vol: 0.5, dur: 10},
  {at: 1336, file: 'pop', vol: 0.5, dur: 10},
  {at: 550, file: 'whoosh', vol: 0.45, dur: 25},
  {at: 1190, file: 'whoosh', vol: 0.4, dur: 25},
  {at: 1320, file: 'ding', vol: 0.6, dur: 30},
  {at: 276, file: 'ding', vol: 0.4, dur: 25},
  {at: 430, file: 'ding', vol: 0.4, dur: 25},
  {at: 800, file: 'ding', vol: 0.4, dur: 25},
  {at: 980, file: 'ding', vol: 0.4, dur: 25},
];

// もし1日だけ男女が入れ替わったら
// 場面の開始：0 / 150 / 330 / 510 / 690 / 870 / 1020 / 1170
export const SFX_SWAP: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 64, file: 'whoosh', vol: 0.6, dur: 25},
  {at: 80, file: 'hit', vol: 0.45, dur: 20},
  {at: 94, file: 'pop', vol: 0.45, dur: 10},
  {at: 210, file: 'ding', vol: 0.45, dur: 25},
  {at: 260, file: 'pop', vol: 0.4, dur: 10},
  {at: 390, file: 'ding', vol: 0.45, dur: 25},
  {at: 458, file: 'pop', vol: 0.5, dur: 10},
  {at: 510, file: 'wind', vol: 0.35, dur: 120},
  {at: 750, file: 'ding', vol: 0.45, dur: 25},
  {at: 880, file: 'whoosh', vol: 0.4, dur: 25},
  {at: 1020, file: 'whoosh', vol: 0.4, dur: 25},
  {at: 1196, file: 'ding', vol: 0.6, dur: 30},
  {at: 1210, file: 'pop', vol: 0.45, dur: 10},
  {at: 1296, file: 'pop', vol: 0.45, dur: 10},
];

// もしも地球の自転が徐々に速くなったら
// 場面の開始：0 / 150 / 330 / 480 / 660 / 840 / 990 / 1170
export const SFX_SPIN: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 66, file: 'pop', vol: 0.45, dur: 10},
  {at: 90, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 150, file: 'ff', vol: 0.5, dur: 30},
  {at: 200, file: 'ding', vol: 0.45, dur: 25},
  {at: 360, file: 'pop', vol: 0.45, dur: 10},
  {at: 390, file: 'ding', vol: 0.5, dur: 25},
  {at: 480, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 520, file: 'pop', vol: 0.4, dur: 10},
  {at: 540, file: 'pop', vol: 0.4, dur: 10},
  {at: 660, file: 'wind', vol: 0.5, dur: 170},
  {at: 870, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 950, file: 'hit', vol: 0.4, dur: 20},
  {at: 1010, file: 'rumble', vol: 0.5, dur: 150},
  {at: 1030, file: 'ding', vol: 0.45, dur: 25},
  {at: 1200, file: 'pop', vol: 0.45, dur: 10},
  {at: 1286, file: 'pop', vol: 0.45, dur: 10},
];

// もしも気圧がどんどん上がっていったら
// 場面の開始：0 / 150 / 300 / 480 / 660 / 840 / 990 / 1170
export const SFX_PRESSURE: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 66, file: 'pop', vol: 0.45, dur: 10},
  {at: 170, file: 'whoosh', vol: 0.4, dur: 25},
  {at: 340, file: 'ding', vol: 0.45, dur: 25},
  {at: 516, file: 'hit', vol: 0.6, dur: 20},
  {at: 550, file: 'ding', vol: 0.45, dur: 25},
  {at: 700, file: 'ding', vol: 0.45, dur: 25},
  {at: 860, file: 'whoosh', vol: 0.4, dur: 25},
  {at: 1005, file: 'hit', vol: 0.4, dur: 20},
  {at: 1017, file: 'hit', vol: 0.4, dur: 20},
  {at: 1029, file: 'hit', vol: 0.4, dur: 20},
  {at: 1040, file: 'rumble', vol: 0.4, dur: 120},
  {at: 1200, file: 'whoosh', vol: 0.5, dur: 25},
  {at: 1228, file: 'boom', vol: 0.7, dur: 45},
  {at: 1230, file: 'glass', vol: 0.4, dur: 40},
  {at: 1296, file: 'pop', vol: 0.45, dur: 10},
];

// もし彼氏が別班だったら
// 場面の開始：0 / 270 / 540 / 810 / 1110 / 1410 / 1680 / 1950
export const SFX_BEPPAN: {at: number; file: string; vol?: number; dur?: number}[] = [
  {at: 66, file: 'pop', vol: 0.45, dur: 10},
  {at: 70, file: 'pop', vol: 0.35, dur: 10},
  {at: 196, file: 'hit', vol: 0.35, dur: 20},
  {at: 288, file: 'ding', vol: 0.4, dur: 25},
  {at: 320, file: 'pop', vol: 0.4, dur: 10},
  {at: 482, file: 'whoosh', vol: 0.6, dur: 25},
  {at: 560, file: 'pop', vol: 0.4, dur: 10},
  {at: 630, file: 'pop', vol: 0.4, dur: 10},
  {at: 960, file: 'hit', vol: 0.25, dur: 20},
  {at: 1004, file: 'hit', vol: 0.4, dur: 10},
  {at: 1015, file: 'hit', vol: 0.4, dur: 10},
  {at: 1000, file: 'pop', vol: 0.35, dur: 10},
  {at: 1430, file: 'pop', vol: 0.35, dur: 10},
  {at: 1474, file: 'pop', vol: 0.35, dur: 10},
  {at: 1518, file: 'pop', vol: 0.35, dur: 10},
  {at: 1562, file: 'pop', vol: 0.35, dur: 10},
  {at: 1606, file: 'pop', vol: 0.35, dur: 10},
  {at: 1738, file: 'hit', vol: 0.35, dur: 20},
  {at: 1750, file: 'pop', vol: 0.4, dur: 10},
  {at: 1970, file: 'pop', vol: 0.4, dur: 10},
  {at: 2042, file: 'boom', vol: 0.5, dur: 45},
  {at: 2100, file: 'pop', vol: 0.4, dur: 10},
  {at: 2192, file: 'ding', vol: 0.45, dur: 25},
  {at: 1134, file: 'pop', vol: 0.35, dur: 10},
  {at: 1162, file: 'pop', vol: 0.35, dur: 10},
  {at: 1190, file: 'pop', vol: 0.35, dur: 10},
  {at: 1218, file: 'pop', vol: 0.35, dur: 10},
  {at: 1260, file: 'ding', vol: 0.4, dur: 25},
  {at: 1278, file: 'ding', vol: 0.4, dur: 25},
  {at: 1346, file: 'pop', vol: 0.35, dur: 10},
];
