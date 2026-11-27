// 「もしも地球の自転が徐々に速くなったら？」台本（バージョンAのテイスト・45秒）
// 赤道の速さ：いま 時速 約1,670km（1日が半分なら2倍）
// 赤道で軽くなる割合 ＝ 0.35% ×（24時間 ÷ 1日の長さ）²
//   12時間：約1.4%（60kg → 約59.2kg）／6時間：約5.5%／3時間：約22%
// 1日 ≒ 84分（2π√(R/g)）で、赤道の遠心力が重力と同じになり、体重ゼロ
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もしも', '地球の自転が', '*徐々に速く*なったら？'],
  top: 'もしも地球の自転が*徐々に速く*なったら？',
};
export const CLOCK_LABEL = '1日の長さ';

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
export type SceneSpec = {id: string; duration: number; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]};

export const SCENES: SceneSpec[] = [
  {id: 's1_hook', duration: 150, clock: {value: '24時間', from: 62}, captions: [{from: 70, to: 150, lines: ['地球の回転が、', '*少しずつ速く*なっていく']}]},
  {
    id: 's2_day12',
    duration: 180,
    clock: {value: '12時間', seq: [{from: 0, value: '20時間'}, {from: 10, value: '16時間'}, {from: 20, value: '12時間'}]},
    captions: [{from: 6, to: 180, lines: ['6時間ごとに、', '*朝と夜*が来る']}],
    cards: [{from: 50, to: 180, label: '赤道の速さ', prefix: '時速 約', fromValue: 1670, value: 3340, unit: 'km', note: 'いまは 時速 約1,670km'}],
  },
  {
    id: 's3_scale',
    duration: 150,
    clock: {value: '12時間'},
    captions: [{from: 6, to: 150, lines: ['赤道限定、', '*ダイエット成功*']}],
    cards: [{from: 30, to: 150, label: '赤道で体重をはかると', text: '60kg → 約59.2kg', note: '遠心力で 約1.4%軽くなる'}],
  },
  {
    id: 's4_ocean',
    duration: 180,
    clock: {value: '6時間', seq: [{from: 0, value: '10時間'}, {from: 10, value: '8時間'}, {from: 20, value: '6時間'}]},
    captions: [{from: 6, to: 180, lines: ['海が、', '*赤道に集まってくる*']}],
    callouts: [
      {key: 'pole', tag: '北極', text: '海が浅く', from: 40, to: 170, dy: 140, dx: 230},
      {key: 'eq', tag: '赤道', text: '海がふくらむ', from: 60, to: 170, dy: -60, dx: -260},
    ],
  },
  {
    id: 's5_storm',
    duration: 180,
    clock: {value: '3時間', seq: [{from: 0, value: '5時間'}, {from: 10, value: '4時間'}, {from: 20, value: '3時間'}]},
    captions: [{from: 6, to: 180, lines: ['台風が、', '*どんどん巨大に*']}],
  },
  {
    id: 's6_jump',
    duration: 150,
    clock: {value: '3時間'},
    captions: [{from: 6, to: 150, lines: ['赤道では、', 'ジャンプが*高く*なる']}],
    cards: [{from: 40, to: 150, label: '赤道での体重', text: '約22%軽く'}],
  },
  {
    id: 's7_float',
    duration: 180,
    clock: {value: '約84分', seq: [{from: 0, value: '2時間'}, {from: 10, value: '約100分'}, {from: 20, value: '約84分'}]},
    captions: [{from: 6, to: 180, lines: ['赤道では、', '*重さがゼロ*に']}],
    cards: [{from: 40, to: 180, label: '赤道の遠心力が', text: '重力と同じ強さに', note: '人も車も海の水も、宇宙へ'}],
  },
  {
    id: 's8_end',
    duration: 180,
    clock: {value: '約84分'},
    captions: [
      {from: 6, to: 110, lines: ['北極の人だけ、', '*平和*']},
      {from: 116, to: 180, lines: ['あなたは何時間の1日なら、', '*生きていける？*']},
    ],
    callouts: [{key: 'me', tag: '北極の人', text: '1日が短い……', from: 30, to: 110, dy: -130, dx: 0}],
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
export const DISCLAIMER = '※ 地球の形は変わらないものとした概算です。';
