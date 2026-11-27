// 「もしも無人島にワープしたら？」台本（バージョンAのテイスト・60秒）
// 3の法則：空気なしで約3分・水なしで約3日・食べ物なしで約3週間
// 海水の塩分 約3.5%（体液 約0.9% の約4倍）→ 飲むほど体の水が抜ける
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もしも', '*無人島*に', 'ワープしたら？'],
  top: 'もしも*無人島*にワープしたら？',
};
export const CLOCK_LABEL = 'ワープしてから';

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
export type SceneSpec = {id: string; duration: number; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]};

export const SCENES: SceneSpec[] = [
  {id: 'i01_warp', duration: 120, clock: {value: '0分', from: 62}, captions: [{from: 70, to: 120, lines: ['気がつくと、', '知らない*砂浜*に']}]},
  {
    id: 'i02_signal',
    duration: 120,
    clock: {value: '10分'},
    captions: [{from: 6, to: 120, lines: ['人も、電波も、', '*何もない*']}],
    callouts: [{key: 'phone', tag: 'スマホ', text: '圏外', from: 20, to: 110, dy: -200, dx: 120}],
  },
  {
    id: 'i03_sea',
    duration: 180,
    clock: {value: '3時間'},
    captions: [{from: 6, to: 180, lines: ['海の水は、', '^飲むほど^喉が渇く']}],
    cards: [{from: 40, to: 180, label: '海水の塩分', text: '約3.5%', note: '体の中の塩分の 約4倍'}],
  },
  {
    id: 'i04_coconut',
    duration: 180,
    clock: {value: '半日'},
    captions: [{from: 6, to: 180, lines: ['水なしで生きられるのは、', '*約3日*']}],
  },
  {
    id: 'i05_fire',
    duration: 180,
    clock: {value: '1日目の夜', ff: '30分早送り'},
    captions: [{from: 6, to: 180, lines: ['30分こすって、', '*煙だけ*']}],
  },
  {
    id: 'i06_sos',
    duration: 180,
    clock: {value: '3日目'},
    captions: [{from: 6, to: 180, lines: ['上空1万mからは、', '^見えない^']}],
  },
  {id: 'i07_fire2', duration: 150, clock: {value: '7日目'}, captions: [{from: 6, to: 150, lines: ['7日目、', 'ついに*火*がついた']}]},
  {id: 'i08_fish', duration: 150, clock: {value: '10日目'}, captions: [{from: 6, to: 150, lines: ['魚の取り方を', '*覚えた*']}]},
  {id: 'i09_hut', duration: 150, clock: {value: '14日目'}, captions: [{from: 6, to: 150, lines: ['雨水をためて、', '*水の心配がなくなった*']}]},
  {
    id: 'i10_day30',
    duration: 180,
    clock: {value: '30日目'},
    captions: [{from: 6, to: 180, lines: ['30日目。', '*ちょっと楽しくなってきた*']}],
    callouts: [{key: 'crab', tag: 'ペット', text: 'カニ', from: 40, to: 170, dy: -420, dx: 120}],
  },
  {
    id: 'i11_heli',
    duration: 210,
    clock: {value: '31日目'},
    captions: [
      {from: 6, to: 70, lines: ['ついに、*救助*が来た！']},
      {from: 76, to: 150, lines: ['島の暮らしに慣れすぎて、', '*救助をことわった*']},
      {from: 156, to: 210, lines: ['あなたなら、', '最初に*何をする？*']},
    ],
    callouts: [{key: 'say', tag: '本人', text: 'あと1週間！', from: 84, to: 150, dy: -170, dx: -100}],
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
export const DISCLAIMER = '※ 生きられる日数などは一般的な目安です。';
