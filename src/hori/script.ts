// 「もし人類が全員、堀大輔の生活を送ったら」台本（バージョンAのテイスト・46秒）
// 設定：睡眠は1日30分（体内時計で飛び起きる）、眠気覚ましの風呂は1日6回。
// 計算：起きている時間 7時間 → 30分で 1日+6.5時間、80年で 約21.7年 ≈ 約22年
//       風呂 200L × 6回 × 81億人 × 365日 ≈ 3,550km³/年（世界の取水量 約4,000km³/年とほぼ同じ）
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もし人類が全員、', '*堀大輔*の生活を', '送ったら'],
  top: 'もし人類が全員、*堀大輔*の生活を送ったら',
};
export const CLOCK_LABEL = '時刻';

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
export type SceneSpec = {id: string; duration: number; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]};

// 入浴の時刻（3場面目）。1回あたり40フレーム
export const BATH_TIMES = ['1:00', '5:00', '9:00', '13:00', '17:00', '21:00'];
export const BATH_CYCLE = 40;

export const SCENES: SceneSpec[] = [
  {
    id: 'h1_wake',
    duration: 150,
    clock: {value: '0:30', from: 62, seq: [{from: 0, value: '0:00'}, {from: 98, value: '0:30'}]},
    captions: [{from: 104, to: 150, lines: ['目覚ましなし。', '体内時計で*30分*ぴったり']}],
  },
  {
    id: 'h2_all',
    duration: 165,
    clock: {value: '0:30'},
    assumption: '睡眠 1日30分',
    captions: [{from: 6, to: 165, lines: ['全人類*81億人*が、', '同じ体で*同時に*飛び起きる']}],
    cards: [{from: 50, to: 165, label: '1日の睡眠', text: '7時間 → 30分', note: '起きている時間が 1日+6時間30分'}],
  },
  {
    id: 'h3_bath',
    duration: 240,
    clock: {value: '21:00', seq: BATH_TIMES.map((v, i) => ({from: i * BATH_CYCLE, value: v}))},
    assumption: '睡眠 1日30分',
    captions: [{from: 6, to: 240, lines: ['眠気覚ましのお風呂は、', '*数時間おき*に1日*6回*']}],
    cards: [{from: 150, to: 240, label: '眠気覚ましのお風呂', text: '1日6回 × 81億人', note: '1回 約200Lのお湯'}],
  },
  {
    id: 'h4_water',
    duration: 195,
    assumption: '睡眠 1日30分',
    captions: [
      {from: 6, to: 110, lines: ['お風呂の水だけで、', '今、人類が1年に使う水と', '*ほぼ同じ量*']},
      {from: 116, to: 195, lines: ['眠気は覚めた。', '^水はなくなった。^']},
    ],
    cards: [{from: 24, to: 195, label: 'お風呂に使う水', prefix: '年間 約', fromValue: 0, value: 3500, unit: 'km³', note: '世界の水の使用量は 年間 約4,000km³'}],
  },
  {
    id: 'h5_phone',
    duration: 195,
    clock: {value: '2:00'},
    assumption: '睡眠 1日30分',
    captions: [
      {from: 6, to: 96, lines: ['アイコスを吸おうとして…', '*スマホ*を口に']},
      {from: 102, to: 195, lines: ['世界中で、', '*スマホを吸う人*が続出']},
    ],
  },
  {
    id: 'h6_gym',
    duration: 195,
    clock: {value: '3:00'},
    assumption: '睡眠 1日30分',
    captions: [
      {from: 6, to: 92, lines: ['深夜3時のジムに、', 'あるコメントが届く']},
      {from: 98, to: 195, lines: ['「寝たほうがいい」と言う人が、', '地球上から*1人もいなくなった*']},
    ],
  },
  {
    id: 'h7_end',
    duration: 300,
    captions: [
      {from: 6, to: 120, lines: ['起きている時間は、', '人生で*約22年*増えた。']},
      {from: 126, to: 226, lines: ['でも、仕事は', '^進まなくなった。^']},
      {from: 232, to: 300, lines: ['みんなは増えた時間で', '*何する？*']},
    ],
    cards: [{from: 20, to: 120, label: '人生で増える、起きている時間', text: '+約22年', note: '80年 × 1日6時間30分'}],
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
export const DISCLAIMER = '※ 本人のエピソードをもとにした架空の設定です。\n一般に、成人は7時間前後の睡眠が推奨されています。';
