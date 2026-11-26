// テロップ文言と尺の正本。
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME_TITLE = {pre: 'もしも地球の', key: '自転', post: 'が突然止まったら？'};

// 自転停止の瞬間（動画全体のフレーム）
export const STOP_FRAME = 32;

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {
  from: number;
  to: number;
  label: string;
  prefix?: string;
  value?: number; // カウントアップする数値
  text?: string; // 数値以外の強調テキスト
  unit?: string;
  note?: string;
};
export type Clock = {
  value: string | 'tick'; // 'tick' は自転停止からの秒数をリアルタイムで表示
  ff?: string; // 早送りバッジ
  from?: number; // シーン内の表示開始フレーム
};
export type SceneSpec = {
  id: string;
  duration: number;
  clock?: Clock; // 「自転停止から +◯」（明朝体）
  assumption?: boolean; // 「想定」カード
  captions: Caption[]; // 画面下の字幕
  cards?: DataCard[]; // 中央のデータカード
};

export const SCENES: SceneSpec[] = [
  {
    id: 's01_hook',
    duration: 75,
    clock: {value: 'tick', from: 40},
    captions: [{from: 40, to: 75, lines: ['地球が、止まった']}],
  },
  {
    id: 's02_equator',
    duration: 135,
    clock: {value: 'tick'},
    assumption: true,
    captions: [{from: 4, to: 135, lines: ['地面は止まっても', '*人と空気*は動き続ける']}],
    cards: [{from: 58, to: 135, label: '赤道で吹き飛ばされる速さ', prefix: '時速', value: 1700, unit: 'km', note: '新幹線の約5倍'}],
  },
  {
    id: 's03_japan',
    duration: 105,
    clock: {value: 'tick'},
    assumption: true,
    captions: [{from: 3, to: 105, lines: ['日本も、暴風に飲まれる']}],
    cards: [{from: 14, to: 105, label: '東京（北緯35.7°）の風速', prefix: '時速', value: 1360, unit: 'km', note: '音速を超える'}],
  },
  {
    id: 's04_tsunami',
    duration: 120,
    clock: {value: '+10分', ff: '10分を早送り'},
    assumption: true,
    captions: [{from: 6, to: 120, lines: ['海も止まれず', '^巨大な津波^が陸へ']}],
  },
  {
    id: 's05_oceans',
    duration: 120,
    clock: {value: '+数年', ff: '数年を早送り'},
    captions: [{from: 4, to: 120, lines: ['遠心力がなくなり', '海が*北極・南極*へ']}],
    cards: [{from: 62, to: 120, label: '海が引いたあと', text: '赤道に巨大な大陸', note: '海は両極に集まる'}],
  },
  {
    id: 's06_daylength',
    duration: 120,
    clock: {value: '+数年'},
    captions: [{from: 4, to: 120, lines: ['1日の長さが、変わる']}],
    cards: [{from: 22, to: 120, label: '新しい「1日」の長さ', prefix: '約', value: 365, unit: '日', note: '昼が約半年、夜が約半年'}],
  },
  {
    id: 's07_extremes',
    duration: 90,
    clock: {value: '+数年'},
    captions: [
      {from: 3, to: 44, lines: ['昼側は、^灼熱^']},
      {from: 46, to: 90, lines: ['夜側は、~極寒~']},
    ],
  },
  {
    id: 's08_terminator',
    duration: 120,
    clock: {value: '+数年'},
    captions: [{from: 4, to: 120, lines: ['住める場所は', 'ほとんど残らない']}],
    cards: [{from: 24, to: 120, label: '人が住めるのは', text: '昼と夜の境目だけ'}],
  },
  {
    id: 's09_end',
    duration: 225,
    captions: [
      {from: 3, to: 70, lines: ['でも安心', '地球が急に止まることは', 'まずない']},
      {from: 72, to: 160, lines: ['実は自転は', '少しずつ*遅く*なっている']},
      {from: 162, to: 225, lines: ['あなたなら', '昼と夜、どっちに住む？']},
    ],
    cards: [{from: 88, to: 160, label: '1日の長さの変化', prefix: '100年で約', value: 2, unit: 'ミリ秒', note: '月の潮の力がブレーキに'}],
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
