// 長尺版「もしも太陽が地球からどんどん離れていったら？」（横長 1920×1080・バージョンAのテイスト）
// いまは 序章 + 第1章（100秒）。章を足していく前提で、場面は「開始フレーム・長さ」で並べる。
// 計算：日差し ∝ 1/d²、平均気温 T = 288K ÷ √d（温室効果は今のまま）、光の到達時間 = 500秒 × d、1年 = 365日 × d^1.5

export const LW = 1920;
export const LH = 1080;
export const FPS_L = 30;

export const THEME_L = {hook: ['もしも太陽が', '地球からどんどん*離れて*いったら？'], top: 'もしも太陽が地球からどんどん*離れて*いったら？'};

// 距離（今の何倍か）の時間変化
export const DIST_KEYS: [number, number][] = [
  [0, 1.0],
  [1380, 1.0],
  [1500, 1.05],
  [3000, 1.05],
];
export const distAt = (f: number) => {
  for (let i = 0; i < DIST_KEYS.length - 1; i++) {
    const [a, da] = DIST_KEYS[i], [b, db] = DIST_KEYS[i + 1];
    if (f <= b) {
      const u = Math.max(0, Math.min(1, (f - a) / (b - a)));
      const e = u * u * (3 - 2 * u);
      return da + (db - da) * e;
    }
  }
  return DIST_KEYS[DIST_KEYS.length - 1][1];
};
export const tempC = (d: number) => 288 / Math.sqrt(d) - 273.15;
export const sunPct = (d: number) => 100 / (d * d);
export const lightSec = (d: number) => 500 * d;
export const yearDays = (d: number) => 365.25 * Math.pow(d, 1.5);

export type Caption = {from: number; to: number; lines: string[]};
export type Card = {from: number; to: number; label: string; text: string; note?: string; x?: number; y?: number; w?: number};
export type Chapter = {from: number; to: number; num: string; title: string; sub?: string};
export type Shot = {id: string; from: number; dur: number};

export const SHOTS: Shot[] = [
  {id: 'p1_hook', from: 0, dur: 240},
  {id: 'p2_light', from: 240, dur: 300},
  {id: 'p3_zone', from: 540, dur: 360},
  {id: 'p4_rule', from: 900, dur: 300},
  {id: 'c1_title', from: 1200, dur: 150},
  {id: 'c1_light', from: 1350, dur: 450},
  {id: 'c1_city', from: 1800, dur: 450},
  {id: 'c1_ice', from: 2250, dur: 450},
  {id: 'c1_next', from: 2700, dur: 300},
];
export const TOTAL_L = 3000;

export const CHAPTERS: Chapter[] = [
  {from: 1200, to: 1360, num: '第1章', title: '最初の変化', sub: '太陽までの距離 1.05倍'},
];

export const CAPTIONS: Caption[] = [
  {from: 250, to: 530, lines: ['いま、地球と太陽は', '約1億5,000万km離れている']},
  {from: 550, to: 720, lines: ['この距離は、生き物にとって', '*ちょうどいい*']},
  {from: 724, to: 890, lines: ['近すぎる金星は^灼熱^、', '遠い火星は~極寒~']},
  {from: 910, to: 1060, lines: ['この動画では、地球の軌道が', '少しずつ大きくなっていくと考える']},
  {from: 1064, to: 1196, lines: ['では、太陽が', '*どんどん離れて*いったら…？']},
  {from: 1360, to: 1580, lines: ['まずは、たった*5%*', '遠ざかっただけで…']},
  {from: 1584, to: 1796, lines: ['太陽の光が届くまで、', '*約25秒*長くかかる']},
  {from: 1810, to: 2030, lines: ['日差しは約9%弱くなり、', '平均気温は*約7℃*下がる']},
  {from: 2034, to: 2246, lines: ['東京の真夏でも、', '*今の5月くらい*の気温に']},
  {from: 2260, to: 2480, lines: ['地球全体が、', '*約2万年前の氷河期*なみの寒さ']},
  {from: 2484, to: 2696, lines: ['山の氷河が広がり、', '北の海は一年中*凍る*ように']},
  {from: 2710, to: 2996, lines: ['でも、これはまだ*始まり*に過ぎない…']},
];

export const CARDS: Card[] = [
  {from: 300, to: 530, label: '地球と太陽の距離', text: '約1億5,000万km', note: '光の速さで 約8分20秒'},
  {from: 740, to: 890, label: '金星の平均気温', text: '約460℃', note: '太陽まで 地球の約0.7倍', x: 60, y: 130, w: 420},
  {from: 760, to: 890, label: '火星の平均気温', text: '約−63℃', note: '太陽まで 地球の約1.5倍', x: 60, y: 330, w: 420},
  {from: 930, to: 1196, label: 'この動画の計算', text: '気温 ＝ 288K ÷ √距離', note: '日差しは「距離の2乗」に反比例・温室効果は今のまま'},
  {from: 1600, to: 1796, label: '太陽の光が地球に届くまで', text: '8分20秒 → 約8分45秒', note: '距離が1.05倍になると、光の旅も1.05倍'},
  {from: 1830, to: 2030, label: '地球の平均気温', text: '約15℃ → 約8℃', note: '日差しは今の約91%'},
  {from: 2050, to: 2246, label: '東京の8月の平均気温', text: '約27℃ → 約20℃', note: '今の東京の5月とほぼ同じ'},
  {from: 2280, to: 2480, label: '最終氷期（約2万年前）', text: '今より約6℃寒い', note: 'この世界は、それよりさらに少し寒い'},
];

export const CALLOUTS_L = {
  sun: {tag: '太陽', text: '約1億5,000万km先'},
  venus: {tag: '金星', text: '熱すぎる'},
  mars: {tag: '火星', text: '寒すぎる'},
  zone: {tag: '緑の帯', text: '水が液体でいられる範囲'},
  thermo: {tag: '温度計', text: '真夏でも約20℃'},
  glacier: {tag: '氷河', text: '山から広がっていく'},
};

export const DISCLAIMER_L = '※ 地球の軌道が大きくなっていく想定。気温は 288K ÷ √距離（温室効果は今のまま）で計算した概算です。';
