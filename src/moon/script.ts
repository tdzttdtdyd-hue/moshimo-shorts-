// 「もしも月が地球に少しずつ近づいてきたら？」台本（バージョンAのテイスト・46秒）
// 距離は地球の中心から月の中心まで。いま 約38.4万km。
// 見かけの大きさ ∝ 1/距離、潮の力 ∝ 1/距離³、公転周期 ∝ 距離^1.5（いま 約27.3日）
//   1/2（19.2万km）: 大きさ2倍・潮8倍・ひと月 約9.7日
//   1/4（9.6万km） : 大きさ4倍・潮64倍・ひと月 約3.4日
//   4.2万km（静止軌道）: 公転 約24時間 → 空で止まって見える・潮 約760倍
//   2万km : 公転 約7.8時間（自転より速い）→ 西から昇る・潮 約7,100倍
//   1.8万km（ロッシュ限界）: 潮の力で月が崩れる
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もしも', '月が地球に', '*少しずつ近づいて*きたら？'],
  top: 'もしも月が地球に*少しずつ近づいて*きたら？',
};
export const CLOCK_LABEL = '月までの距離';

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
export type SceneSpec = {id: string; duration: number; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]};

export const SCENES: SceneSpec[] = [
  {
    id: 'm1_now',
    duration: 150,
    clock: {value: '約38万km', from: 62},
    captions: [{from: 68, to: 150, lines: ['いま、月までの距離は', '*約38万km*']}],
  },
  {
    id: 'm2_half',
    duration: 180,
    clock: {value: '約19万km', ff: '距離が半分に', seq: [{from: 0, value: '約30万km'}, {from: 10, value: '約25万km'}, {from: 20, value: '約19万km'}]},
    captions: [{from: 6, to: 180, lines: ['月が*2倍*の大きさに。', '潮が道路まで上がってくる']}],
    cards: [{from: 44, to: 180, label: '潮の満ち引きの力', fromValue: 1, value: 8, unit: '倍', note: '月の見かけの大きさは 2倍'}],
  },
  {
    id: 'm3_quarter',
    duration: 180,
    clock: {value: '約9.6万km', seq: [{from: 0, value: '約15万km'}, {from: 10, value: '約12万km'}, {from: 20, value: '約9.6万km'}]},
    captions: [{from: 6, to: 180, lines: ['毎日、街の1階が沈み、', '潮が引くと*海の底*が見える']}],
    cards: [{from: 44, to: 180, label: '潮の満ち引きの力', fromValue: 8, value: 64, unit: '倍', badge: 'ひと月が 約3日半に', note: '月が地球を1周する時間も短くなる'}],
  },
  {
    id: 'm4_geo',
    duration: 180,
    clock: {value: '約4.2万km', ff: '1日を早送り', seq: [{from: 0, value: '約7万km'}, {from: 10, value: '約5.5万km'}, {from: 20, value: '約4.2万km'}]},
    captions: [{from: 6, to: 180, lines: ['月が、空の同じ場所で', '*動かなくなった*']}],
    cards: [{from: 50, to: 180, label: '月が地球を1周する時間', text: '約24時間', note: '地球の自転とちょうど同じ速さ'}],
  },
  {
    id: 'm5_west',
    duration: 180,
    clock: {value: '約2万km', seq: [{from: 0, value: '約3.5万km'}, {from: 10, value: '約2.8万km'}, {from: 20, value: '約2万km'}]},
    captions: [{from: 6, to: 180, lines: ['月が*西から*昇り、', '地震と火山が止まらない']}],
    cards: [{from: 50, to: 180, label: '潮の満ち引きの力', prefix: '約', fromValue: 64, value: 7100, unit: '倍', note: '地面まで引っ張られて揺れる'}],
  },
  {
    id: 'm6_break',
    duration: 180,
    clock: {value: '約1.8万km'},
    captions: [{from: 6, to: 180, lines: ['地球の引力に耐えきれず、', '月が^崩れ始めた^']}],
    callouts: [{key: 'roche', tag: 'ロッシュ限界', text: '約1.8万km', from: 20, to: 80, dy: 230, dx: 120}],
  },
  {
    id: 'm7_ring',
    duration: 200,
    captions: [{from: 30, to: 200, lines: ['月は消えた。', 'かわりに、地球に*輪*ができた']}],
  },
  {
    id: 'm8_end',
    duration: 130,
    captions: [{from: 10, to: 130, lines: ['お月見は、', 'これから*何を見る？*']}],
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
export const DISCLAIMER = '※ 月がゆっくり近づく想定の概算です。距離は地球と月の中心どうし。';
