// 「もしも富士山が噴火したら？」台本（バージョンA・作り込み版・60秒）
// 前提：内閣府・中央防災会議（2020年）の想定「宝永噴火（1707年）と同じ規模・西南西の風・雨」
//   ・鉄道：微量の降灰でも運行停止（首都圏7都県で停止の想定）
//   ・道路：雨の日は 約3cm の降灰で二輪駆動車が通行不能
//   ・電力：雨の日は 約0.3cm 以上の降灰で停電のおそれ
//   ・処理が必要な火山灰：約4.9億m³（東日本大震災の災害廃棄物の約10倍）
//   ・富士山から新宿まで 約95km、灰は噴火から2時間足らずで東京に届くとされる（報道）
//   ・宝永噴火は 約16日間 続いた
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もしも', '*富士山*が', '噴火したら？'],
  top: 'もしも*富士山*が噴火したら？',
};
export const CLOCK_LABEL = '噴火してから';

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
export type SceneSpec = {id: string; duration: number; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]};

export const ERUPT = 70; // 1場面目のこのフレームで噴火

export const SCENES: SceneSpec[] = [
  {
    id: 'f1_erupt',
    duration: 240,
    clock: {value: '3分', from: ERUPT, seq: [{from: 0, value: '0分'}, {from: ERUPT + 60, value: '1分'}, {from: ERUPT + 120, value: '3分'}]},
    captions: [
      {from: 20, to: ERUPT, lines: ['ある朝、富士山が…']},
      {from: ERUPT + 40, to: 240, lines: ['噴煙は、*1万m以上*の', '高さまで立ちのぼる']},
    ],
  },
  {
    id: 'f2_map',
    duration: 240,
    clock: {value: '約1時間', seq: [{from: 0, value: '10分'}, {from: 80, value: '30分'}, {from: 160, value: '約1時間'}]},
    captions: [{from: 6, to: 240, lines: ['西の風に乗って、灰は', '*東京へ*流れていく']}],
    cards: [{from: 24, to: 126, label: '富士山から東京まで', text: '約100km', note: '灰は2時間足らずで届くとされる'}],
    callouts: [
      {key: 'fuji', tag: '富士山', text: '噴火', from: 132, to: 236, dy: -230, dx: 60},
      {key: 'tokyo', tag: '東京', text: '約100km先', from: 140, to: 236, dy: -260, dx: -40},
    ],
  },
  {
    id: 'f3_dark',
    duration: 240,
    clock: {value: '約2時間'},
    captions: [
      {from: 10, to: 120, lines: ['昼なのに、', '*夜のように暗くなる*']},
      {from: 126, to: 240, lines: ['街に、*灰が降りはじめる*']},
    ],
  },
  {
    id: 'f4_train',
    duration: 210,
    clock: {value: '数時間'},
    captions: [{from: 10, to: 210, lines: ['線路に灰が積もり、', '*電車が止まる*']}],
    cards: [{from: 40, to: 150, label: '鉄道', text: 'わずかな灰で停止', note: '首都圏の多くの路線が止まる想定'}],
  },
  {
    id: 'f5_road',
    duration: 210,
    clock: {value: '翌日'},
    captions: [{from: 10, to: 210, lines: ['雨でぬれた灰はぬかるみに。', '*車が進めない*']}],
    cards: [{from: 50, to: 210, label: '雨でぬれた灰が 約3cm', text: '車が走れない', note: 'ふつうの車（二輪駆動）の場合'}],
  },
  {
    id: 'f6_blackout',
    duration: 210,
    clock: {value: '数日'},
    captions: [{from: 10, to: 210, lines: ['灰が電気の設備に積もり、', '*街の明かりが消える*']}],
    cards: [{from: 50, to: 210, label: '雨の日は 灰 約0.3cmで', text: '停電のおそれ'}],
  },
  {
    id: 'f7_cleanup',
    duration: 240,
    clock: {value: '約2週間', ff: '噴火は 約16日続く'},
    captions: [{from: 10, to: 240, lines: ['街じゅうが灰に埋もれ、', '*片付けは何か月も*']}],
    cards: [{from: 60, to: 240, label: '片付けが必要な灰', text: '約4.9億m³', note: '東日本大震災のがれきの 約10倍'}],
  },
  {
    id: 'f8_end',
    duration: 210,
    clock: {value: '約2週間'},
    captions: [
      {from: 10, to: 110, lines: ['富士山は、', '*いまも活火山*']},
      {from: 116, to: 210, lines: ['あなたの家には、', '*マスクとゴーグル*ある？']},
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
export const DISCLAIMER = '※ 国の想定（宝永噴火と同じ規模・西南西の風・雨）をもとにした概算です。';
