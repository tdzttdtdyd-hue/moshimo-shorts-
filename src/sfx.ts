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
