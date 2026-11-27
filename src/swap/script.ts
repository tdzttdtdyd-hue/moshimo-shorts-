// 「もし1日だけ男女が入れ替わったら」台本（バージョンAのテイスト・45秒）
// 体の違いだけを数字で見せる（性格・能力の決めつけはしない）
// 平均身長：男性 約171cm・女性 約158cm／握力（30代）：男性 約46kg・女性 約28kg
// 声の高さ：男性 約120Hz・女性 約220Hz
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もし1日だけ', '*男女*が', '入れ替わったら'],
  top: 'もし1日だけ*男女*が入れ替わったら',
};
export const CLOCK_LABEL = '入れ替わってから';

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
export type SceneSpec = {id: string; duration: number; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]};

export const SCENES: SceneSpec[] = [
  {id: 'w1_wake', duration: 150, clock: {value: '0分', from: 62}, captions: [{from: 70, to: 150, lines: ['起きたら、', '*体が入れ替わっていた*']}]},
  {
    id: 'w2_height',
    duration: 180,
    clock: {value: '1時間'},
    captions: [{from: 6, to: 180, lines: ['いつもの棚に、', '*手が届かない*']}],
    cards: [{from: 60, to: 180, label: '平均身長の差', text: '約13cm', note: '男性 約171cm・女性 約158cm'}],
  },
  {
    id: 'w3_grip',
    duration: 180,
    clock: {value: '3時間'},
    captions: [{from: 6, to: 180, lines: ['いつもの力が、', '*出ない*']}],
    cards: [{from: 60, to: 180, label: '握力（30代の平均）', text: '男性 約46kg', note: '女性は 約28kg'}],
  },
  {
    id: 'w4_cold',
    duration: 180,
    clock: {value: '6時間'},
    captions: [{from: 6, to: 180, lines: ['筋肉が少ないと、', '*寒く感じやすい*']}],
  },
  {
    id: 'w5_voice',
    duration: 180,
    clock: {value: '9時間'},
    captions: [{from: 6, to: 180, lines: ['電話に出たら、', '「*どちら様ですか？*」']}],
    cards: [{from: 60, to: 180, label: '声の高さ', text: '約2倍ちがう', note: '男性 約120Hz・女性 約220Hz'}],
  },
  {id: 'w6_shoes', duration: 150, clock: {value: '12時間'}, captions: [{from: 6, to: 150, lines: ['いつもの靴が、', '*合わない*']}]},
  {id: 'w7_tired', duration: 150, clock: {value: '15時間'}, captions: [{from: 6, to: 150, lines: ['たった1日で、', '*お互いの大変さ*を知った']}]},
  {
    id: 'w8_end',
    duration: 180,
    clock: {value: '元に戻った', seq: [{from: 0, value: '17時間'}, {from: 30, value: '元に戻った'}]},
    captions: [
      {from: 40, to: 120, lines: ['「あの体で、', '*毎日がんばってたんだね*」']},
      {from: 126, to: 180, lines: ['あなたが入れ替わったら、', '最初に*何をする？*']},
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
export const DISCLAIMER = '※ 数値は日本の平均などの目安です。個人差があります。';
