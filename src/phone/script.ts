// 「もし全人類のスマホが1日なくなったら」台本（バージョンAのテイスト・46秒）
// 世界のスマホ利用者 約49億人 × 1日のスマホ時間 約4時間 ≈ 約200億時間（概算）
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もし', '全人類の*スマホ*が', '1日なくなったら'],
  top: 'もし全人類の*スマホ*が1日なくなったら',
};
export const CLOCK_LABEL = '時刻';

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
export type SceneSpec = {id: string; duration: number; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]};

export const WAKE_AT = 100; // 1場面目で飛び起きるフレーム

export const SCENES: SceneSpec[] = [
  {
    id: 'p1_wake',
    duration: 150,
    clock: {value: '8:10', from: 62, seq: [{from: 0, value: '7:00'}, {from: WAKE_AT - 4, value: '8:10'}]},
    captions: [{from: WAKE_AT + 2, to: 150, lines: ['目覚ましが鳴らない。', '*全人類、寝坊*']}],
  },
  {
    id: 'p2_gate',
    duration: 180,
    clock: {value: '8:30'},
    captions: [{from: 6, to: 180, lines: ['改札も、地図も、', '乗り換え案内もない']}],
  },
  {
    id: 'p3_meet',
    duration: 165,
    clock: {value: '9:00'},
    captions: [{from: 6, to: 165, lines: ['待ち合わせが、', '*人類の難問*に戻った']}],
    callouts: [
      {key: 'a', tag: 'Aさん', text: 'どこ？', from: 30, to: 150, dy: -170, dx: -60},
      {key: 'b', tag: 'Bさん', text: 'どこ？', from: 40, to: 150, dy: -170, dx: 60},
    ],
  },
  {
    id: 'p4_train',
    duration: 180,
    clock: {value: '9:30'},
    captions: [{from: 6, to: 180, lines: ['会話が増える……', '*わけではなかった*']}],
  },
  {
    id: 'p5_pay',
    duration: 180,
    clock: {value: '12:00'},
    captions: [{from: 6, to: 180, lines: ['キャッシュレス生活、', '*小銭がない*']}],
  },
  {
    id: 'p6_earth',
    duration: 165,
    captions: [{from: 6, to: 165, lines: ['人類が手に入れた時間で、', 'したことは——']}],
    cards: [{from: 30, to: 165, label: '人類から消えたスマホ時間', prefix: '1日 約', fromValue: 0, value: 200, unit: '億時間', note: '約49億人 × 1日 約4時間'}],
  },
  {
    id: 'p7_sky',
    duration: 180,
    clock: {value: '17:30'},
    captions: [{from: 6, to: 180, lines: ['何年ぶりかに、', '*空を見た*']}],
  },
  {
    id: 'p8_end',
    duration: 180,
    clock: {value: '17:31'},
    captions: [
      {from: 40, to: 110, lines: ['でも、^撮れない^']},
      {from: 116, to: 180, lines: ['あなたは1日、', '*耐えられる？*']},
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
export const DISCLAIMER = '※ 利用者数・利用時間は世界全体の概算です。';
