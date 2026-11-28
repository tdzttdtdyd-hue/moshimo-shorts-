// 「もしも気圧がどんどん上がっていったら？」台本（バージョンAのテイスト・45秒）
// 2気圧＝水深10m相当・水の沸点 約120℃（圧力鍋と同程度）
// 空気の抵抗・風の力は空気の濃さ（≒気圧）に比例／約4気圧（水深30m）から窒素酔い
// 約8気圧で酸素の分圧が 約1.7気圧 → 酸素中毒の危険／金星の地表 約92気圧
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もしも', '*気圧*が', 'どんどん上がっていったら？'],
  top: 'もしも*気圧*がどんどん上がっていったら？',
};
export const CLOCK_LABEL = '地上の気圧';

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
export type SceneSpec = {id: string; duration: number; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]};

export const SCENES: SceneSpec[] = [
  {id: 'q1_hook', duration: 150, clock: {value: '1気圧', from: 62}, captions: [{from: 70, to: 150, lines: ['空気の重さが、', '*どんどん増えていく*']}]},
  {id: 'q2_chips', duration: 150, clock: {value: '1.5気圧'}, captions: [{from: 6, to: 150, lines: ['富士山の上とは逆。', '*袋がしぼむ*']}]},
  {
    id: 'q3_boil',
    duration: 180,
    clock: {value: '2気圧'},
    captions: [
      {from: 6, to: 90, lines: ['水が沸く温度が、', '*約120℃*に上がる']},
      {from: 96, to: 180, lines: ['家じゅうが、', '*圧力鍋*の中']},
    ],
  },
  {
    id: 'q4_ball',
    duration: 180,
    clock: {value: '3気圧'},
    captions: [{from: 6, to: 180, lines: ['ホームランが、', '*出なくなる*']}],
    cards: [{from: 66, to: 118, label: '空気の抵抗', text: '約3倍'}],
  },
  {
    id: 'q5_narcosis',
    duration: 180,
    clock: {value: '4気圧'},
    captions: [{from: 6, to: 180, lines: ['街じゅうが、', '*ほろ酔い*']}],
    cards: [{from: 40, to: 180, label: '水深30mと同じ', text: '窒素酔い', note: 'お酒に酔ったような状態に'}],
  },
  {id: 'q6_oxygen', duration: 150, clock: {value: '8気圧'}, captions: [{from: 6, to: 150, lines: ['^酸素が、毒に^', '変わり始める']}]},
  {
    id: 'q7_venus',
    duration: 180,
    clock: {value: '92気圧', seq: [{from: 0, value: '20気圧'}, {from: 10, value: '50気圧'}, {from: 20, value: '92気圧'}]},
    captions: [{from: 6, to: 180, lines: ['地球の地上が、', '*金星と同じ*気圧に']}],
    cards: [{from: 50, to: 180, label: '地上の気圧', text: '92気圧', note: '金星の地表と同じ'}],
  },
  {
    id: 'q8_end',
    duration: 180,
    clock: {value: '1気圧', seq: [{from: 0, value: '92気圧'}, {from: 30, value: '1気圧'}]},
    captions: [
      {from: 6, to: 56, lines: ['気圧が戻った瞬間……']},
      {from: 60, to: 120, lines: ['世界中のポテチの袋が、', '*パン！*']},
      {from: 126, to: 180, lines: ['あなたは何気圧まで、', '*耐えられる？*']},
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
export const DISCLAIMER = '※ 気温や空気の成分は変わらないものとした概算です。';
