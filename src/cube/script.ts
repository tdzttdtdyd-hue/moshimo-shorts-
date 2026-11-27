// 「もしも地球が立方体だったら？」台本（バージョンAのテイスト・46秒）
// いまの地球と同じ体積の立方体：一辺 a = (4/3·π·R³)^(1/3) ≈ 1.612R ≈ 10,270km（半分 h ≈ 5,135km）
// 中心からの距離：面の真ん中 5,135km / 辺の真ん中 7,262km / 角 8,894km
// → 面の真ん中から見た角の高さ ≈ 3,760km（エベレスト 8,849m の約420個分）
// 重力は中心に向かうので、辺の真ん中では地面に対して約45°傾く（角では約55°）
// 角の重力は（中心までの距離の2乗で大まかに）約1/3
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もしも', '地球が*立方体*', 'だったら？'],
  top: 'もしも地球が*立方体*だったら？',
};
export const CLOCK_LABEL = 'いる場所';

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
export type SceneSpec = {id: string; duration: number; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]};

export const SCENES: SceneSpec[] = [
  {
    id: 'c1_morph',
    duration: 150,
    captions: [{from: 70, to: 150, lines: ['いまの地球と*同じ体積*の', '立方体にしてみる']}],
    cards: [{from: 84, to: 150, label: '立方体の一辺', text: '約1万km', note: '東京からニューヨークくらい'}],
  },
  {
    id: 'c2_seas',
    duration: 180,
    captions: [{from: 6, to: 180, lines: ['海の水は流れ出し、', '6つの面の*真ん中*に集まる']}],
    callouts: [{key: 'sea', tag: '海', text: '面の真ん中にだけ', from: 70, to: 170, dy: 220, dx: 0}],
  },
  {
    id: 'c3_corner',
    duration: 180,
    captions: [{from: 6, to: 180, lines: ['空気も真ん中に集まり、', '辺と角は*宇宙*に突き出す']}],
    cards: [{from: 50, to: 180, label: '面の真ん中から見た角の高さ', prefix: '約', fromValue: 0, value: 3800, unit: 'km', note: 'エベレスト 約420個分'}],
    callouts: [{key: 'corner', tag: '角', text: '空気なし', from: 20, to: 48, dy: -170, dx: 120}],
  },
  {
    id: 'c4_slope',
    duration: 210,
    clock: {value: '面のはし', from: 0, seq: [{from: 0, value: '面の真ん中'}, {from: 70, value: '辺の近く'}]},
    captions: [{from: 6, to: 210, lines: ['見た目は平ら。', 'でも、ずっと*上り坂*']}],
    cards: [{from: 110, to: 210, label: '辺の近くの坂の傾き', prefix: '約', fromValue: 0, value: 45, unit: '°', note: '重力が斜めに引っ張るから'}],
  },
  {
    id: 'c5_edge',
    duration: 180,
    clock: {value: '辺の上'},
    captions: [{from: 6, to: 180, lines: ['辺の上は空気がなく、', '昼でも*星空*']}],
  },
  {
    id: 'c6_jump',
    duration: 150,
    clock: {value: '角の上'},
    captions: [{from: 6, to: 150, lines: ['角では重力が', '*約3分の1*に']}],
  },
  {
    id: 'c7_sunrise',
    duration: 150,
    captions: [{from: 6, to: 150, lines: ['面にいる全員に、', '*同時に*朝が来る']}],
  },
  {
    id: 'c8_end',
    duration: 180,
    clock: {value: '辺の上'},
    captions: [
      {from: 6, to: 110, lines: ['となりの国へ行くにも、', '^宇宙服^が必要']},
      {from: 116, to: 180, lines: ['あなたは、', '*どの面*に住みたい？']},
    ],
  },
];

export const TOTAL_FRAMES = SCENES.reduce((a, s) => a + s.duration, 0);
export const sceneStart = (id: string) => {
  let t = 0;
  for (const s of SCENES) {
    if (s.id === id) return t;
    t += s.duration;
  }
  throw new Error(id);
};
export const DISCLAIMER = '※ いまの地球と同じ体積の立方体で計算した概算です。';
