// 「もしも1円玉が毎日2倍に増えていったら？」台本（バージョンAのテイスト・50秒）
// n日目の枚数 = 2^(n-1) 枚 = 金額（円）= 重さ（g）
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もしも1円玉が', '毎日*2倍*に', '増えていったら？'],
  top: 'もしも1円玉が毎日*2倍*に増えていったら？',
};
export const CLOCK_LABEL = '増えはじめて';
export const yenOn = (day: number) => 2 ** (day - 1);

export type Caption = {from: number; to: number; lines: string[]};
// jp：万・億・兆の単位で表示（数え上げも単位つきで進む）
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
export type SceneSpec = {id: string; duration: number; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]};

const days = (a: number, b: number, from: number, step: number) => Array.from({length: b - a + 1}).map((_, i) => ({from: from + i * step, value: `${a + i}日目`}));

export const SCENES: SceneSpec[] = [
  {
    id: 'c01_one',
    duration: 120,
    clock: {value: '1日目', from: 66},
    captions: [{from: 70, to: 120, lines: ['1日目、机の上に', '1円玉が1枚']}],
    cards: [{from: 74, to: 120, label: '1日目', value: 1, unit: '円', note: '1枚・重さ1g'}],
  },
  {
    id: 'c02_desk',
    duration: 150,
    clock: {value: '10日目', ff: '2〜10日目を早送り', seq: days(2, 10, 6, 9)},
    assumption: '毎日2倍に増える',
    captions: [{from: 4, to: 150, lines: ['毎日2倍に増えていく', '10日目でも、まだ*512円*']}],
    cards: [{from: 84, to: 150, label: '10日目', fromValue: 1, badge: '1日目の512倍', value: yenOn(10), unit: '円', note: 'ペットボトル飲料 約3本分'}],
  },
  {
    id: 'c03_room',
    duration: 150,
    clock: {value: '20日目', ff: '11〜20日目を早送り', seq: days(11, 20, 4, 6)},
    assumption: '毎日2倍に増える',
    captions: [{from: 4, to: 150, lines: ['20日目、', '床に*1円玉の山*ができる']}],
    cards: [{from: 70, to: 150, label: '20日目', fromValue: yenOn(10), jp: true, prefix: '約', badge: '10日目の1,024倍', value: yenOn(20), unit: '円', note: '重さ524kg ＝ 大人8人分'}],
    callouts: [{key: 'floor', tag: '床', text: '重さできしむ', from: 20, to: 68, dy: -180}],
  },
  {
    id: 'c04_tower',
    duration: 150,
    clock: {value: '25日目', ff: '21〜25日目を早送り', seq: days(21, 25, 4, 8)},
    assumption: '毎日2倍に増える',
    captions: [{from: 4, to: 150, lines: ['25日目、積み上げると', '*雲を突き抜ける*']}],
    cards: [{from: 60, to: 150, label: '25日目', fromValue: yenOn(20), jp: true, prefix: '約', badge: '20日目の32倍', value: yenOn(25), unit: '円', note: '積むと高さ約25km（エベレストの約3倍）'}],
  },
  {
    id: 'c05_trucks',
    duration: 180,
    clock: {value: '30日目', ff: '26〜30日目を早送り', seq: days(26, 30, 4, 8)},
    captions: [{from: 4, to: 180, lines: ['30日目、', 'トラック*54台分*']}],
    cards: [{from: 56, to: 180, label: '30日目', fromValue: yenOn(25), jp: true, prefix: '約', badge: '25日目の32倍', value: yenOn(30), unit: '円', note: '重さ537トン ＝ 10トントラック 約54台分'}],
    callouts: [{key: 'truck', tag: '荷台', text: '1円玉 約10トン', from: 14, to: 54, dy: 220}],
  },
  {
    id: 'c06_dome',
    duration: 180,
    clock: {value: '42日目', ff: '31〜42日目を早送り', seq: days(31, 42, 4, 4)},
    captions: [{from: 4, to: 180, lines: ['42日目、', 'ドーム球場が*満杯*に']}],
    cards: [{from: 60, to: 180, label: '42日目', fromValue: yenOn(30), jp: true, prefix: '約', badge: '30日目の4,096倍', value: yenOn(42), unit: '円', note: '東京ドーム 約1杯分'}],
    callouts: [{key: 'dome', tag: 'ドーム', text: '1円玉があふれ出す', from: 18, to: 58, dy: 260}],
  },
  {
    id: 'c07_alu',
    duration: 150,
    clock: {value: '47日目', ff: '43〜47日目を早送り', seq: days(43, 47, 4, 8)},
    captions: [{from: 4, to: 150, lines: ['47日目、世界の', 'アルミが*足りなくなる*']}],
    cards: [{from: 56, to: 150, label: '47日目', fromValue: yenOn(42), jp: true, prefix: '約', badge: '42日目の32倍', value: yenOn(47), unit: '円', note: '7,000万トン ＝ 世界のアルミ生産量 約1年分'}],
  },
  {
    id: 'c08_earth',
    duration: 180,
    clock: {value: '94日目', ff: '48〜94日目を早送り', seq: [{from: 0, value: '48日目'}, {from: 20, value: '60日目'}, {from: 40, value: '75日目'}, {from: 60, value: '94日目'}]},
    captions: [{from: 4, to: 180, lines: ['94日目、ついに', '*地球より重く*なる']}],
    cards: [{from: 76, to: 180, label: '94日目の1円玉の重さ', text: '地球より重い', note: '約9.9×10²⁴kg（地球は約6.0×10²⁴kg）'}],
    callouts: [{key: 'pile', tag: '1円玉の山', text: '金額は約9,903秭円', from: 34, to: 74, dy: 220}],
  },
  {
    id: 'c09_shop',
    duration: 240,
    captions: [
      {from: 6, to: 84, lines: ['地球より重い財産を持って', '買い物に行くと…']},
      {from: 88, to: 168, lines: ['1回に使える1円玉は', '^20枚まで^']},
      {from: 172, to: 240, lines: ['買えたのは', '*20円の駄菓子1個*でした']},
    ],
    cards: [{from: 92, to: 168, label: '1回の支払いで使える1円玉', text: '20枚まで', note: '法律（通貨法 第7条）で決まっている'}],
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
export const DISCLAIMER = '※ 数値は概算です。1円玉の山が自分の重さでつぶれるなどの物理は考えていません。';
