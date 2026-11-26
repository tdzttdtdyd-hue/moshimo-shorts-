// 「もしも太陽が地球からどんどん離れていったら？」台本（バージョンAのテイスト・42秒）
// 想定：地球と太陽の距離が今の d 倍に。日差し ∝ 1/d²、平均気温 T = 288K ÷ √d（温室効果は今のまま）
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もしも太陽が', '地球からどんどん', '*離れて*いったら？'],
  top: 'もしも太陽が地球からどんどん*離れて*いったら？',
};
export const CLOCK_LABEL = '太陽までの距離';
export const tempAt = (d: number) => Math.round(288 / Math.sqrt(d) - 273.15);

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
export type SceneSpec = {id: string; duration: number; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]};

// 距離の表示を少しずつ進める
const steps = (vals: string[], from: number, step: number) => vals.map((v, i) => ({from: from + i * step, value: v}));

export const SCENES: SceneSpec[] = [
  {
    id: 's1_now',
    duration: 120,
    clock: {value: '1倍', from: 64},
    captions: [{from: 68, to: 120, lines: ['今の距離は、', '生き物に*ちょうどいい*']}],
    cards: [{from: 72, to: 120, label: '今の地球と太陽の距離', text: '約1億5,000万km', note: '光の速さで約8分20秒'}],
  },
  {
    id: 's2_snow',
    duration: 150,
    clock: {value: '1.1倍', seq: steps(['1.02倍', '1.05倍', '1.08倍', '1.1倍'], 0, 10)},
    assumption: '温室効果は今のまま',
    captions: [{from: 4, to: 150, lines: ['1.1倍、', '1年中が*雪景色*に']}],
    cards: [{from: 40, to: 150, label: '地球の平均気温', prefix: '約', fromValue: 15, value: tempAt(1.1), unit: '℃', badge: '今は約15℃', note: '日差しは今の約83%'}],
  },
  {
    id: 's3_ice',
    duration: 150,
    clock: {value: '1.5倍', seq: steps(['1.2倍', '1.3倍', '1.4倍', '1.5倍'], 0, 10)},
    assumption: '温室効果は今のまま',
    captions: [{from: 4, to: 150, lines: ['1.5倍（火星の距離）、', '海が*凍りはじめる*']}],
    cards: [{from: 40, to: 150, label: '地球の平均気温', prefix: '約', fromValue: tempAt(1.1), value: tempAt(1.5), unit: '℃', note: 'シベリアの真冬なみ'}],
    callouts: [{key: 'sea', tag: '海', text: '表面から凍っていく', from: 20, to: 146, dy: -200}],
  },
  {
    id: 's4_snowball',
    duration: 150,
    clock: {value: '2倍', seq: steps(['1.6倍', '1.8倍', '2倍'], 0, 12)},
    captions: [{from: 4, to: 150, lines: ['2倍、地球が', '*真っ白な雪玉*に']}],
    cards: [{from: 40, to: 150, label: '地球の平均気温', prefix: '約', fromValue: tempAt(1.5), value: tempAt(2), unit: '℃', note: '日差しは今の1/4'}],
  },
  {
    id: 's5_jupiter',
    duration: 180,
    clock: {value: '5.2倍', ff: '木星の距離まで早送り', seq: steps(['2.5倍', '3倍', '4倍', '5.2倍'], 0, 10)},
    captions: [{from: 4, to: 180, lines: ['5.2倍（木星の距離）、', '太陽が*小さな点*になる']}],
    cards: [{from: 48, to: 180, label: '地球の平均気温', prefix: '約', fromValue: tempAt(2), value: tempAt(5.2), unit: '℃', note: '日差しは約1/27 ・ 1年の長さは約12年'}],
  },
  {
    id: 's6_air',
    duration: 180,
    clock: {value: '約20倍', ff: '天王星の近くまで早送り', seq: steps(['8倍', '12倍', '16倍', '約20倍'], 0, 10)},
    captions: [{from: 4, to: 180, lines: ['約20倍、', '*空気が凍って*降ってくる']}],
    cards: [{from: 48, to: 180, label: '地球の平均気温', prefix: '約', fromValue: tempAt(5.2), value: -210, unit: '℃', note: '空気の大部分（窒素）が凍る温度'}],
    callouts: [{key: 'snow', tag: '雪', text: '正体は凍った空気', from: 30, to: 176, dy: -220}],
  },
  {
    id: 's7_pluto',
    duration: 180,
    clock: {value: '約40倍', ff: '冥王星の距離まで早送り', seq: steps(['25倍', '30倍', '35倍', '約40倍'], 0, 10)},
    captions: [{from: 4, to: 180, lines: ['約40倍（冥王星の距離）、', '太陽は*ただの明るい星*に']}],
    cards: [{from: 48, to: 180, label: '太陽の明るさ', text: '今の約1/1,600', note: 'それでも満月の約250倍 ・ 平均 約−227℃'}],
    callouts: [{key: 'star', tag: '太陽', text: 'ほかの星よりは明るい', from: 30, to: 176, dy: 200}],
  },
  {
    id: 's8_question',
    duration: 150,
    captions: [{from: 10, to: 150, lines: ['あなたは何倍まで', '*耐えられる*？']}],
    cards: [{from: 30, to: 150, label: 'コメントで教えてね', text: '◯倍まで', note: '例：1.1倍まで、2倍まで…'}],
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
export const DISCLAIMER = '※ 地球の軌道が大きくなっていく想定。温室効果は今のまま。数値は概算です。';
