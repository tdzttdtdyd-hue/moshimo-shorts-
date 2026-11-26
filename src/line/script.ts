// 「もしも全人類が一列に並んだら？」台本（バージョンAのテイスト・45秒）
// 1人分の幅 0.45m（肩幅＋すき間）、世界人口 約82億人 → 約369万km
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もしも', '全人類が', '*一列*に並んだら？'],
  top: 'もしも全人類が*一列*に並んだら？',
};
export const CLOCK_LABEL = '並んだ人数';
export const WIDTH_M = 0.45;
export const lengthKm = (people: number) => (people * WIDTH_M) / 1000;

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
export type SceneSpec = {id: string; duration: number; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]};

export const SCENES: SceneSpec[] = [
  {
    id: 'l1_one',
    duration: 120,
    clock: {value: '1人', from: 62},
    captions: [{from: 66, to: 120, lines: ['1人分の幅は、', '*約45cm*']}],
    cards: [{from: 70, to: 120, label: '1人分の幅', text: '約45cm', note: '肩幅＋となりとのすき間'}],
  },
  {
    id: 'l2_tokyo',
    duration: 150,
    clock: {value: '約1,400万人', seq: [{from: 0, value: '約100万人'}, {from: 12, value: '約500万人'}, {from: 24, value: '約1,400万人'}]},
    captions: [{from: 4, to: 150, lines: ['東京都の人だけで、', '日本列島の*約2倍*']}],
    cards: [{from: 40, to: 150, label: '東京都（約1,400万人）の列', prefix: '約', fromValue: 0, value: 6300, unit: 'km', note: '日本列島（約3,000km）の約2倍'}],
    callouts: [{key: 'tokyo', tag: '東京', text: '列のスタート', from: 10, to: 38, dy: 200}],
  },
  {
    id: 'l3_japan',
    duration: 150,
    clock: {value: '約1.2億人', seq: [{from: 0, value: '約3,000万人'}, {from: 12, value: '約7,000万人'}, {from: 24, value: '約1.2億人'}]},
    captions: [{from: 4, to: 150, lines: ['日本人だけで、', '地球を*1周以上*']}],
    cards: [{from: 40, to: 150, label: '日本（約1.24億人）の列', prefix: '約', jp: true, fromValue: 6300, value: 56000, unit: 'km', note: '地球1周（約4万km）より長い'}],
  },
  {
    id: 'l4_world',
    duration: 180,
    clock: {value: '約82億人', ff: '全人類まで早送り', seq: [{from: 0, value: '約5億人'}, {from: 10, value: '約20億人'}, {from: 20, value: '約50億人'}, {from: 30, value: '約82億人'}]},
    captions: [{from: 4, to: 180, lines: ['全人類なら、', '地球を*約92周*']}],
    cards: [{from: 46, to: 180, label: '全人類（約82億人）の列', prefix: '約', jp: true, fromValue: 56000, badge: '日本の約66倍', value: 3690000, unit: 'km', note: '地球 約92周ぶん'}],
  },
  {
    id: 'l5_moon',
    duration: 180,
    clock: {value: '約82億人'},
    captions: [{from: 4, to: 180, lines: ['月まで並べると、', '*約4.8往復*']}],
    cards: [{from: 40, to: 180, label: '月まで並べると', text: '約4.8往復', note: '月までの距離 約38.4万km'}],
    callouts: [{key: 'moon', tag: '月', text: '約38.4万km先', from: 12, to: 38, dy: 300, dx: 150}],
  },
  {
    id: 'l6_light',
    duration: 150,
    clock: {value: '約82億人'},
    captions: [{from: 4, to: 150, lines: ['光なら、', '端から端まで*約12秒*']}],
    cards: [{from: 30, to: 150, label: '光が列の端から端まで', prefix: '約', fromValue: 0, value: 12, unit: '秒', note: '光は1秒で約30万km進む'}],
  },
  {
    id: 'l7_walk',
    duration: 180,
    clock: {value: '約82億人'},
    captions: [{from: 4, to: 180, lines: ['歩くと、', '休まず*約105年*']}],
    cards: [{from: 40, to: 180, label: '列の横を歩いて端から端まで', prefix: '約', fromValue: 0, value: 105, unit: '年', note: '時速4kmで、寝ずに歩き続けた場合'}],
  },
  {
    id: 'l8_end',
    duration: 240,
    captions: [
      {from: 6, to: 110, lines: ['ある日、先頭の人が', '*最後尾*を目指して歩き出した…']},
      {from: 116, to: 240, lines: ['一生かかっても、', '^最後尾にはたどり着けない^']},
    ],
    callouts: [{key: 'sign', tag: '最後尾', text: 'この先 約369万km', from: 40, to: 110, dy: 220}],
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
export const DISCLAIMER = '※ 世界人口 約82億人、1人分の幅 約45cmで計算した概算です。';
