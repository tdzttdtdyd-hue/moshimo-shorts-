// 「もしも1回ごとにスパイクの威力が2倍になっていったら？」台本（バージョンAのテイスト）
// 想定：威力＝球速。1本目 時速110km から 1本ごとに2倍。
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もしも1回ごとに', 'スパイクの威力が', '*2倍*になっていったら？'],
  top: 'もしもスパイクの威力が毎回*2倍*になったら？',
};

export const speedOf = (n: number) => 110 * 2 ** (n - 1);

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
export type SceneSpec = {
  id: string;
  duration: number;
  clock?: Clock;
  assumption?: string;
  captions: Caption[];
  cards?: DataCard[];
  callouts?: Callout[];
};

export const SCENES: SceneSpec[] = [
  {
    id: 'v01_first',
    duration: 105,
    clock: {value: '1本目', from: 66},
    captions: [{from: 70, to: 105, lines: ['1本目は、ふつうのスパイク']}],
    cards: [{from: 72, to: 105, label: '1本目の球速', prefix: '時速', value: speedOf(1), unit: 'km', note: '男子トップ選手の強打なみ'}],
  },
  {
    id: 'v02_dig',
    duration: 105,
    clock: {value: '2本目'},
    assumption: '1本ごとに球速が2倍',
    captions: [{from: 4, to: 105, lines: ['2本目、', 'レシーブが*弾き飛ばされる*']}],
    cards: [{from: 30, to: 105, label: '2本目の球速', prefix: '時速', value: speedOf(2), unit: 'km', note: 'プロ野球の最速球（約165km/h）より速い'}],
  },
  {
    id: 'v03_knock',
    duration: 105,
    clock: {value: '3本目'},
    assumption: '1本ごとに球速が2倍',
    captions: [{from: 4, to: 105, lines: ['3本目、', '受けた選手ごと*吹っ飛ぶ*']}],
    cards: [{from: 30, to: 105, label: '3本目の球速', prefix: '時速', value: speedOf(3), unit: 'km', note: '新幹線（約320km/h）より速い'}],
  },
  {
    id: 'v04_floor',
    duration: 105,
    clock: {value: '4本目'},
    assumption: '1本ごとに球速が2倍',
    captions: [{from: 4, to: 105, lines: ['4本目、', '体育館の*床に穴*があく']}],
    cards: [{from: 30, to: 105, label: '4本目の球速', prefix: '時速', value: speedOf(4), unit: 'km', note: '旅客機（約900km/h）なみ'}],
    callouts: [{key: 'hole', tag: '床', text: 'ボールがめり込む', from: 36, to: 100, dy: -170}],
  },
  {
    id: 'v05_sonic',
    duration: 120,
    clock: {value: '5本目'},
    captions: [{from: 4, to: 120, lines: ['5本目、', '^音の壁^を突破する']}],
    cards: [{from: 62, to: 120, label: '5本目の球速', prefix: '時速', value: speedOf(5), unit: 'km', note: '音速（約1,225km/h）を超え、衝撃波が出る'}],
    callouts: [{key: 'window', tag: '窓', text: '衝撃波で割れる', from: 32, to: 60, dy: 120}],
  },
  {
    id: 'v06_burn',
    duration: 150,
    clock: {value: '8本目', ff: '6〜8本目を早送り'},
    captions: [{from: 4, to: 150, lines: ['ボールが空気との摩擦で', '*赤く燃え*はじめる']}],
    cards: [{from: 56, to: 150, label: '8本目の球速', prefix: '時速', value: speedOf(8), unit: 'km', note: 'ライフル弾（約3,000km/h）の約5倍'}],
    callouts: [{key: 'ball', tag: 'ボール', text: '摩擦熱で赤く光る', from: 12, to: 54, dy: 260}],
  },
  {
    id: 'v07_orbit',
    duration: 180,
    clock: {value: '9本目'},
    assumption: '空気抵抗は無視',
    captions: [
      {from: 4, to: 84, lines: ['9本目、打ちそこねて', 'ボールが*宇宙*へ']},
      {from: 88, to: 180, lines: ['そのまま', '*地球を1周*しはじめる']},
    ],
    cards: [{from: 36, to: 94, label: '9本目の球速', prefix: '時速', value: speedOf(9), unit: 'km', note: '人工衛星（約28,000km/h）と同じ速さ'}],
    callouts: [{key: 'orbit', tag: 'ボール', text: '約90分で地球を1周', from: 98, to: 176, dy: -230}],
  },
  {
    id: 'v08_return',
    duration: 150,
    clock: {value: '9本目', ff: '90分を早送り'},
    captions: [
      {from: 4, to: 74, lines: ['約90分後、', 'ボールが戻ってきて…']},
      {from: 80, to: 150, lines: ['^自分のコート^に落ちた']},
    ],
    callouts: [{key: 'land', tag: 'ボール', text: '自分たちのコートに着地', from: 84, to: 146, dy: -200}],
  },
  {
    id: 'v09_point',
    duration: 180,
    captions: [
      {from: 6, to: 96, lines: ['判定は…']},
      {from: 100, to: 180, lines: ['最強のスパイクは、', '^ただの失点^でした']},
    ],
    cards: [{from: 30, to: 180, label: '判定', text: '相手チームに1点', note: 'そして、セットを落とした'}],
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
export const DISCLAIMER = '※ 物理法則をかなり単純化したシミュレーションです。数値は概算です。';
