// v4（1カット・一人称）の台本。テロップだけで内容が分かるように書く。
// 語り（明朝体）の強調：^赤^ *オレンジ* ~水色~
import {F} from './timeline';

export const THEME_TITLE = {pre: 'もしも地球の', key: '自転', post: 'が突然止まったら？'};

export type Narr = {from: number; to: number; lines: string[]; note?: string};
export const NARRATION: Narr[] = [
  {from: 4, to: F.STOP, lines: ['いつもの東京。']},
  {from: F.STOP + 3, to: 140, lines: ['地面だけが、', '^止まった^。']},
  {from: 142, to: 238, lines: ['空気と街は、', '^時速1,360km^のまま。'], note: '赤道の自転速度 約1,674km/h × cos35.7° で計算'},
  {from: 244, to: 330, lines: ['海も止まれない。', '^津波^が街をのみこむ。']},
  {from: 336, to: 478, lines: ['太陽が、', 'ほとんど動かない。']},
  {from: 484, to: 598, lines: ['地球全体で、', '海が動き出す。']},
  {from: 604, to: 700, lines: ['約3か月後、', 'ようやく日が沈む。'], note: '自転が止まったのが正午だった場合'},
  {from: 706, to: 788, lines: ['そして、', '^半年続く夜^。']},
  {from: 794, to: 868, lines: ['人が住めるのは、', '*昼と夜の境目*だけ。']},
  {from: F.SPACE + 4, to: F.SPACE + 72, lines: ['でも安心。', '地球が急に止まることは、', 'まずない。']},
  {from: F.SPACE + 76, to: F.SPACE + 150, lines: ['実は自転は、', '少しずつ*遅く*なっている。']},
  {from: F.SPACE + 154, to: F.END, lines: ['あなたなら、', '昼と夜、どっちに住む？']},
];

export type Card = {from: number; to: number; label: string; prefix?: string; value?: number; unit?: string; note?: string};
export const CARDS: Card[] = [
  {from: 112, to: 200, label: '東京（北緯35.7°）の風速', prefix: '時速', value: 1360, unit: 'km', note: '音速（約1,225km/h）を超える'},
  {from: 380, to: 478, label: '新しい「1日」の長さ', prefix: '約', value: 365, unit: '日', note: '昼が約半年、夜が約半年'},
  {from: F.SPACE + 84, to: F.SPACE + 150, label: '1日の長さの変化', prefix: '100年で約', value: 2, unit: 'ミリ秒', note: '月の潮の力がブレーキに'},
];

// 表組みカード「そのころ、赤道では」
export const TABLE = {
  from: 486,
  to: 598,
  title: ['そのころ、', '赤道', 'では'],
  rows: [
    {k: '風', v: '時速 約1,700km', sub: '新幹線の約5倍'},
    {k: '海', v: '北極・南極へ移動', sub: '遠心力がなくなるため'},
    {k: '陸', v: '赤道に巨大な大陸', sub: '海が引いて海底が現れる'},
  ],
};

// 3D の物体を指す吹き出し
export const CALLOUT_TEXT = {
  sign: {tag: '看板', text: '時速1,360kmで飛ぶ'},
  pole: {tag: '電柱', text: '風圧で傾く'},
  car: {tag: '車', text: '横すべりで流される'},
  wave: {tag: '東京湾', text: '海水が街へ'},
  roof: {tag: '屋根', text: '雪が積もり続ける'},
  moon: {tag: '月', text: '潮の満ち引きでブレーキ'},
};

export const DISCLAIMER = '※ 実際には起こりえない状況のシミュレーションです。数値は概算です。';
