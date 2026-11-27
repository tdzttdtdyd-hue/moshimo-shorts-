// 「もしも1日だけペットと話せたら」台本（バージョンAのテイスト・50秒）
// 朝7時〜夜0時まで、猫が人間の言葉を話せる。
// 豆知識：猫の睡眠は1日 約12〜16時間／飼い主の声を聞き分けている（呼ばれても反応しないことが多い）
//         大人の猫が「ニャー」と鳴くのは、ほぼ人間に向けて／猫の6歳 ≒ 人間の約40歳
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もしも', '1日だけ*ペット*と', '話せたら'],
  top: 'もしも1日だけ*ペット*と話せたら',
};
export const CLOCK_LABEL = '話せる残り時間';
export const CAT_NAME = 'ミケ';

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
export type Bubble = {who: 'cat' | 'me'; text: string; from: number; to: number};
export type SceneSpec = {id: string; duration: number; time: string; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]; bubbles?: Bubble[]};

export const SCENES: SceneSpec[] = [
  {
    id: 'c1_wake',
    duration: 180,
    time: '7:00',
    clock: {value: '17時間', from: 62},
    captions: [{from: 70, to: 180, lines: ['話せるようになって、', '*最初の一言*']}],
    bubbles: [{who: 'cat', text: 'おい。ごはん', from: 84, to: 180}],
  },
  {
    id: 'c2_name',
    duration: 180,
    time: '8:00',
    clock: {value: '16時間'},
    captions: [{from: 6, to: 180, lines: ['名前を呼ばれても、', '*返事はしない*']}],
    bubbles: [
      {who: 'me', text: 'ミケ〜', from: 6, to: 54},
      {who: 'cat', text: '聞こえてるよ。\n返事しないだけ', from: 60, to: 180},
    ],
    cards: [{from: 96, to: 180, label: '猫は飼い主の声を', text: '聞き分けている', note: 'でも、呼ばれても反応しないことが多い'}],
  },
  {
    id: 'c3_nap',
    duration: 180,
    time: '12:00',
    clock: {value: '12時間'},
    captions: [{from: 6, to: 180, lines: ['昼は、ひたすら', '*寝る*']}],
    bubbles: [{who: 'cat', text: '寝るのが仕事なんで', from: 30, to: 180}],
    cards: [{from: 70, to: 180, label: '猫の睡眠', text: '1日 約12〜16時間'}],
  },
  {
    id: 'c4_keyboard',
    duration: 180,
    time: '15:00',
    clock: {value: '9時間'},
    captions: [{from: 6, to: 180, lines: ['仕事のじゃまをする理由は、', '*あったかいから*']}],
    bubbles: [{who: 'cat', text: 'ここが一番\nあったかい', from: 50, to: 180}],
  },
  {
    id: 'c5_meow',
    duration: 180,
    time: '18:00',
    clock: {value: '6時間'},
    captions: [{from: 6, to: 180, lines: ['ニャーは、', '*人間専用*の言葉']}],
    bubbles: [{who: 'cat', text: 'ニャーって鳴くの、\n人間にだけだから', from: 20, to: 180}],
    cards: [{from: 80, to: 180, label: '大人の猫が鳴くのは', text: 'ほぼ人間に向けて'}],
  },
  {
    id: 'c6_age',
    duration: 180,
    time: '21:00',
    clock: {value: '3時間'},
    captions: [{from: 6, to: 180, lines: ['見た目はかわいくても、', '*中身はおじさん*']}],
    bubbles: [{who: 'cat', text: 'ちなみに僕、\n人間でいうと40歳', from: 20, to: 180}],
    cards: [{from: 80, to: 180, label: '猫の6歳', text: '人間の約40歳'}],
  },
  {
    id: 'c7_thanks',
    duration: 210,
    time: '23:50',
    clock: {value: '10分'},
    captions: [{from: 100, to: 210, lines: ['照れかくしに、', '*ひざの上*へ']}],
    bubbles: [
      {who: 'me', text: 'いつもありがとう', from: 10, to: 80},
      {who: 'cat', text: '……べつに', from: 86, to: 160},
    ],
  },
  {
    id: 'c8_end',
    duration: 210,
    time: '0:00',
    clock: {value: '0分', seq: [{from: 0, value: '10秒'}, {from: 20, value: '5秒'}, {from: 36, value: '0分'}]},
    captions: [
      {from: 70, to: 140, lines: ['（*全部覚えてる*からな）']},
      {from: 146, to: 210, lines: ['あなたのペットは、', '*何て言う*と思う？']},
    ],
    bubbles: [{who: 'cat', text: 'ニャー', from: 46, to: 140}],
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
export const DISCLAIMER = '※ 猫の豆知識は一般的な傾向です。個体差があります。';
