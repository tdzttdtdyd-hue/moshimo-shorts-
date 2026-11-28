// 「もしも1日だけ心の声が全部聞こえたら」台本（バージョンAのテイスト・58秒）
// 口で言ったセリフ＝角のある白い吹き出し／心の声＝雲形・点線の吹き出し
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もしも1日だけ', '*心の声*が', '全部聞こえたら'],
  top: 'もしも1日だけ*心の声*が全部聞こえたら',
};
export const CLOCK_LABEL = '時刻';

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
// who：場面ごとの人物の名前（場面のプログラムで頭の位置を決める）
// at：吹き出しの置き場所（画面上の 中心x・上端y）。重ならないよう場面ごとに決めておく
export type Bubble = {who: string; kind: 'say' | 'think'; text: string; from: number; to: number; at: [number, number]};
export type SceneSpec = {id: string; duration: number; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]; bubbles?: Bubble[]};

export const SCENES: SceneSpec[] = [
  {
    id: 'h1_morning',
    duration: 240,
    clock: {value: '7:00', from: 62},
    captions: [{from: 66, to: 240, lines: ['今日だけ、', '*心の声が全部聞こえる*']}],
    bubbles: [
      {who: 'wife', kind: 'say', text: 'お弁当作ったよ♪', from: 96, to: 236, at: [330, 560]},
      {who: 'wife', kind: 'think', text: '……冷凍食品、\n詰めただけ', from: 132, to: 236, at: [640, 760]},
    ],
  },
  {
    id: 'h2_train',
    duration: 210,
    clock: {value: '8:30'},
    captions: [{from: 6, to: 210, lines: ['満員電車、', '*心の中も*大渋滞']}],
    bubbles: [
      {who: 'a', kind: 'think', text: '押すな', from: 20, to: 206, at: [250, 560]},
      {who: 'b', kind: 'think', text: '帰りたい', from: 44, to: 206, at: [690, 600]},
      {who: 'c', kind: 'think', text: '月曜つら', from: 68, to: 206, at: [260, 800]},
      {who: 'd', kind: 'think', text: 'あ、この人\nいい匂い', from: 92, to: 206, at: [690, 820]},
    ],
  },
  {
    id: 'h3_meeting',
    duration: 240,
    clock: {value: '10:00'},
    captions: [{from: 130, to: 240, lines: ['会議中、', '*誰も聞いていない*']}],
    bubbles: [
      {who: 'boss', kind: 'say', text: 'いい案だね！', from: 16, to: 120, at: [320, 560]},
      {who: 'boss', kind: 'think', text: '長い。\n早く終われ', from: 44, to: 120, at: [680, 600]},
      {who: 'p1', kind: 'think', text: '昼なに食べよう', from: 126, to: 236, at: [300, 600]},
      {who: 'p2', kind: 'think', text: '昼なに食べよう', from: 136, to: 236, at: [660, 720]},
      {who: 'p3', kind: 'think', text: '昼なに食べよう', from: 146, to: 236, at: [330, 860]},
    ],
  },
  {
    id: 'h4_lunch',
    duration: 180,
    clock: {value: '12:00'},
    captions: [{from: 110, to: 180, lines: ['後輩の、', '*本当の気持ち*']}],
    bubbles: [
      {who: 'junior', kind: 'say', text: '先輩のおごりなんて\n悪いですよ〜', from: 16, to: 176, at: [420, 560]},
      {who: 'junior', kind: 'think', text: '計画どおり', from: 60, to: 176, at: [680, 800]},
    ],
  },
  {
    id: 'h5_client',
    duration: 180,
    clock: {value: '15:00'},
    captions: [{from: 100, to: 180, lines: ['*前向きに検討*、の', '本当の意味']}],
    bubbles: [
      {who: 'client', kind: 'say', text: '前向きに\n検討します', from: 16, to: 176, at: [340, 580]},
      {who: 'client', kind: 'think', text: 'ない', from: 64, to: 176, at: [700, 640]},
    ],
  },
  {
    id: 'h6_store',
    duration: 180,
    clock: {value: '19:00'},
    captions: [{from: 110, to: 180, lines: ['たった1日で、', '*人間不信*']}],
    bubbles: [
      {who: 'clerk', kind: 'say', text: 'ありがとう\nございました', from: 16, to: 106, at: [330, 580]},
      {who: 'clerk', kind: 'think', text: '……あと2時間', from: 44, to: 106, at: [720, 580]},
    ],
  },
  {
    id: 'h7_home',
    duration: 210,
    clock: {value: '21:00'},
    captions: [{from: 120, to: 210, lines: ['でも、', '*言葉と心が同じ人*もいる']}],
    bubbles: [
      {who: 'wife', kind: 'say', text: 'おかえり。\n疲れた顔してるね', from: 16, to: 206, at: [380, 560]},
      {who: 'wife', kind: 'think', text: '……今日も、\nおつかれさま', from: 60, to: 206, at: [660, 780]},
    ],
  },
  {
    id: 'h8_child',
    duration: 300,
    clock: {value: '23:50'},
    captions: [
      {from: 150, to: 226, lines: ['一番聞きたかった声は、', '*ここにあった*']},
      {from: 232, to: 300, lines: ['あなたは誰の心の声が、', '*いちばん聞きたい？*']},
    ],
    bubbles: [{who: 'child', kind: 'think', text: 'パパ、だいすき', from: 66, to: 226, at: [460, 620]}],
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
export const DISCLAIMER = '※ フィクションです。';
