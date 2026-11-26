// テロップ文言と尺の正本。*黄色* ^赤^ ~水色~ で強調。
export type Beat = {
  from: number; // シーン内フレーム
  to: number;
  lines: string[];
  size?: number;
};
export type NumberSpec = {
  from: number;
  to: number;
  prefix?: string;
  value?: number; // カウントアップする数値
  text?: string; // 数値ではない特大テキスト
  unit?: string;
  sub?: string;
  color?: string;
  size?: number;
};
export type SceneSpec = {
  id: string;
  duration: number;
  labels?: {text: string; from: number; to: number}[];
  beats: Beat[];
  numbers?: NumberSpec[];
};

export const SCENES: SceneSpec[] = [
  {
    id: 's01_hook',
    duration: 75,
    beats: [{from: 2, to: 75, lines: ['もしも地球の自転が', '^突然止まったら…？^'], size: 92}],
  },
  {
    id: 's02_equator',
    duration: 135,
    labels: [{text: '0秒後', from: 0, to: 135}],
    beats: [{from: 4, to: 135, lines: ['地面は止まっても', '*人と空気*は動き続ける']}],
    numbers: [{from: 58, to: 135, prefix: '時速 約', value: 1700, unit: 'km', sub: '新幹線の*約5倍*'}],
  },
  {
    id: 's03_japan',
    duration: 105,
    labels: [{text: '0秒後｜日本', from: 0, to: 105}],
    beats: [{from: 3, to: 105, lines: ['日本でも']}],
    numbers: [{from: 14, to: 105, prefix: '時速 約', value: 1360, unit: 'km', sub: '*音速*を超える暴風'}],
  },
  {
    id: 's04_tsunami',
    duration: 120,
    labels: [{text: '数分後', from: 0, to: 120}],
    beats: [{from: 6, to: 120, lines: ['海も止まれず', '^巨大な津波^が陸をおそう']}],
  },
  {
    id: 's05_oceans',
    duration: 120,
    labels: [{text: 'やがて', from: 0, to: 120}],
    beats: [{from: 4, to: 120, lines: ['遠心力がなくなり', '海が*北極・南極*へ']}],
    numbers: [{from: 62, to: 120, text: '赤道に巨大な大陸が出現', size: 76, color: '#FFE500'}],
  },
  {
    id: 's06_daylength',
    duration: 120,
    labels: [{text: 'そして', from: 0, to: 120}],
    beats: [{from: 4, to: 120, lines: ['1日の長さが…']}],
    numbers: [{from: 22, to: 120, prefix: '約', value: 365, unit: '日', sub: '昼が*約半年* 夜が~約半年~'}],
  },
  {
    id: 's07_extremes',
    duration: 90,
    labels: [{text: 'そして', from: 0, to: 90}],
    beats: [
      {from: 3, to: 44, lines: ['昼側は', '^灼熱の世界^'], size: 104},
      {from: 46, to: 90, lines: ['夜側は', '~極寒の世界~'], size: 104},
    ],
  },
  {
    id: 's08_terminator',
    duration: 120,
    labels: [{text: '新しい地球', from: 0, to: 120}],
    beats: [{from: 4, to: 120, lines: ['人が住めるのは']}],
    numbers: [{from: 24, to: 120, text: '昼と夜の\n境目だけ', size: 150, color: '#FFE500'}],
  },
  {
    id: 's09_end',
    duration: 225,
    labels: [{text: '実は…', from: 70, to: 160}],
    beats: [
      {from: 3, to: 70, lines: ['*でも安心*', '地球が急に止まることは', 'まずない'], size: 80},
      {from: 72, to: 160, lines: ['実は自転は', '少しずつ*遅く*なっている'], size: 80},
      {from: 162, to: 225, lines: ['あなたなら', '*昼と夜 どっちに住む？*'], size: 88},
    ],
    numbers: [{from: 88, to: 160, prefix: '100年で 約', value: 2, unit: 'ミリ秒', sub: '1日が長くなっている', size: 180}],
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
