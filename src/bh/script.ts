// 「もしもブラックホールが東京に5秒間現れたら？」台本（オリジナル構成・64秒）
// 想定：地球と同じ重さ（6.0×10²⁴kg）のブラックホールが、渋谷あたりの交差点のまん中に5秒間だけ現れる
// 大きさ：シュワルツシルト半径 2GM/c² ≈ 8.9mm → 直径 約1.8cm（1円玉は2.0cm）
// 止まっている物が距離 r から中心まで落ちる時間：t = (π/2)·√(r³ / 2GM)
//   → t秒までに落ちきる範囲 r(t) = (t·2/π)^(2/3)·(2GM)^(1/3) ≈ 92.7km ×（t / 1.571）^(2/3)
//   0.002秒 ≈ 1.1km／0.1秒 ≈ 15km（東京23区とほぼ同じ広さ）／1.7秒 ≈ 98km（富士山まで約94km）／5秒 ≈ 200km
// 物の強さ・空気の抵抗・光の速さの影響は考えない概算
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もしも', '*ブラックホール*が', '東京に5秒間現れたら？'],
  top: 'もしも*ブラックホール*が東京に5秒間現れたら？',
};
export const CLOCK_LABEL = '';

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
export type SceneSpec = {id: string; duration: number; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]};

// 場面の長さ（フレーム）
export const D = {s1: 210, s2: 240, s3: 240, s4: 300, s5: 300, s6: 210, s7: 210, s8: 210};
export const APPEAR = 150; // 1場面目のこのフレームで現れる
export const VANISH_IN_S6 = 150; // 6場面目のこのフレームで消える

export const SCENES: SceneSpec[] = [
  {
    id: 's1_city',
    duration: D.s1,
    captions: [
      {from: 66, to: 146, lines: ['夜の東京。', '大きな交差点のまん中に…']},
      {from: 156, to: 210, lines: ['*1円玉くらい*の、黒い点が現れた']},
    ],
  },
  {
    id: 's2_coin',
    duration: D.s2,
    captions: [
      {from: 6, to: 118, lines: ['大きさは1円玉。でも重さは、', '*地球1個分*']},
      {from: 124, to: 240, lines: ['まわりの光が、', '*曲がって見える*']},
    ],
    cards: [{from: 24, to: 118, label: 'ブラックホールの直径', text: '約1.8cm', note: '地球と同じ重さが、この中に'}],
  },
  {
    id: 's3_spaghetti',
    duration: D.s3,
    captions: [
      {from: 6, to: 120, lines: ['人も車もビルも、', '*細長く伸びて*吸い込まれる']},
      {from: 126, to: 240, lines: ['まだ、*0.0001秒*もたっていない']},
    ],
  },
  {
    id: 's4_kanto',
    duration: D.s4,
    captions: [
      {from: 112, to: 200, lines: ['0.002秒で、', 'まわり*約1km*が消える']},
      {from: 206, to: 300, lines: ['0.1秒で、', '*東京23区*がまるごと']},
    ],
  },
  {
    id: 's5_japan',
    duration: D.s5,
    captions: [
      {from: 6, to: 160, lines: ['日本列島に、東京へ向かう', '*ひび*が走る']},
      {from: 166, to: 300, lines: ['1.7秒で、', '*富士山*まで飲みこまれる']},
    ],
  },
  {
    id: 's6_earth',
    duration: D.s6,
    captions: [
      {from: 6, to: 146, lines: ['5秒で、半径*約200km*。', '関東がまるごと消える']},
      {from: 160, to: 210, lines: ['そして、^消えた^']},
    ],
  },
  {
    id: 's7_after',
    duration: D.s7,
    captions: [
      {from: 6, to: 106, lines: ['落ちていた物どうしがぶつかり、', '*大爆発*']},
      {from: 112, to: 210, lines: ['たった5秒で、', '*関東が消えた*']},
    ],
  },
  {
    id: 's8_sky',
    duration: D.s8,
    captions: [
      {from: 6, to: 100, lines: ['夜空は、何日も', '*赤く光り*続ける']},
      {from: 106, to: 210, lines: ['次は何が5秒現れたら、', '*見てみたい？*']},
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
export const DISCLAIMER = '※ 地球と同じ重さのブラックホールを想定。物の強さや空気は考えない概算です。';

// ---------- 時間の進み方（全体のフレーム → 現れてからの本物の時間・秒） ----------
const S = {
  s1: 0,
  s2: D.s1,
  s3: D.s1 + D.s2,
  s4: D.s1 + D.s2 + D.s3,
  s5: D.s1 + D.s2 + D.s3 + D.s4,
  s6: D.s1 + D.s2 + D.s3 + D.s4 + D.s5,
  s7: D.s1 + D.s2 + D.s3 + D.s4 + D.s5 + D.s6,
  s8: D.s1 + D.s2 + D.s3 + D.s4 + D.s5 + D.s6 + D.s7,
};
export const START = S;
const expLerp = (a: number, b: number, u: number) => a * Math.pow(b / a, Math.max(0, Math.min(1, u)));
const lin = (a: number, b: number, u: number) => a + (b - a) * Math.max(0, Math.min(1, u));
export const realTime = (g: number): number => {
  if (g < S.s1 + APPEAR) return 0;
  // 10億倍スロー：1億分の1秒まで（吸い込まれる範囲は 約30cm）
  if (g < S.s2) return lin(0, 2e-9, (g - APPEAR) / (S.s2 - APPEAR));
  if (g < S.s3) return lin(2e-9, 1e-8, (g - S.s2) / D.s2);
  // 3場面目：1億分の1秒 → 0.00008秒（範囲は 約30cm → 約120m）
  if (g < S.s4) return expLerp(1e-8, 8e-5, (g - S.s3) / D.s3);
  if (g < S.s5) return g - S.s4 < 260 ? expLerp(8e-5, 0.1, (g - S.s4) / 260) : lin(0.1, 0.12, (g - S.s4 - 260) / 40);
  if (g < S.s6) return lin(0.12, 3, (g - S.s5) / D.s5);
  return lin(3, 5, (g - S.s6) / VANISH_IN_S6);
};
// 画面左上の表示
export const hud = (g: number): {label: string; value: string; slow: string} => {
  if (g < APPEAR) {
    const left = (APPEAR - g) / 30;
    return {label: '現れるまで', value: `${left.toFixed(2)}秒`, slow: '等速'};
  }
  if (g < S.s6 + VANISH_IN_S6) {
    const t = realTime(g);
    const value = t < 1e-6 ? `${t.toFixed(9)}秒` : t < 0.001 ? `${t.toFixed(6)}秒` : t < 1 ? `${t.toFixed(3)}秒` : `${t.toFixed(2)}秒`;
    const slow = g < S.s3 ? '10億倍スロー' : g < S.s4 ? '10万倍スロー' : g < S.s5 ? '100倍スロー' : g < S.s6 ? '3倍スロー' : '2倍スロー';
    return {label: '現れてからの本物の時間', value, slow};
  }
  if (g < S.s8) return {label: '消えたあと', value: g < S.s7 ? '数秒後' : '数十分後', slow: '早回し'};
  return {label: '消えたあと', value: '数時間後', slow: '早回し'};
};
// 引き込まれた範囲（m）
const GM2 = 2 * 3.986e14;
export const reachM = (t: number) => Math.pow(Math.max(0, t) / 1.5708, 2 / 3) * Math.cbrt(GM2);
export const fmtRange = (m: number) => (m < 1000 ? `約${Math.round(m)}m` : m < 10000 ? `約${(m / 1000).toFixed(1)}km` : `約${Math.round(m / 1000)}km`);
