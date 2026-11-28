// 「もし彼氏が別班だったら」台本（バージョンAのテイスト・76秒）
// スパイもののあるあるで作るオリジナルの話（ドラマの登場人物・名前・決めゼリフは使わない）
// 字幕の強調：*オレンジ* ^赤^ ~水色~

export const THEME = {
  hook: ['もし', '*彼氏*が', '別班だったら'],
  top: 'もし*彼氏*が別班だったら',
};
export const CLOCK_LABEL = '付き合って';

export type Caption = {from: number; to: number; lines: string[]};
export type DataCard = {from: number; to: number; label: string; prefix?: string; value?: number; fromValue?: number; jp?: boolean; badge?: string; text?: string; unit?: string; note?: string};
export type Clock = {value: string; ff?: string; from?: number; seq?: {from: number; value: string}[]};
export type Callout = {key: string; tag: string; text: string; from: number; to: number; dx?: number; dy?: number};
// who：him（彼）・her（彼女）／kind：say（セリフ）・think（心の声）
export type Bubble = {who: 'him' | 'her'; kind: 'say' | 'think'; text: string; from: number; to: number};
export type SceneSpec = {id: string; duration: number; clock?: Clock; assumption?: string; captions: Caption[]; cards?: DataCard[]; callouts?: Callout[]; bubbles?: Bubble[]};

export const SCENES: SceneSpec[] = [
  {
    id: 'b1_day1',
    duration: 270,
    clock: {value: '1日目', from: 62},
    bubbles: [{who: 'her', kind: 'think', text: '大企業勤めの、\n自慢のハイスペ彼氏', from: 70, to: 170}],
    captions: [{from: 176, to: 270, lines: ['やさしくて、', '*ちょっと抜けてる*彼']}],
  },
  {
    id: 'b2_day30',
    duration: 270,
    clock: {value: '30日目'},
    bubbles: [{who: 'him', kind: 'say', text: 'ごめん、急に出張に\n行かないといけなくなった', from: 50, to: 140}],
    captions: [{from: 150, to: 270, lines: ['デート中に、', '*一瞬で消える*']}],
  },
  {
    id: 'b3_day60',
    duration: 270,
    clock: {value: '60日目'},
    bubbles: [
      {who: 'her', kind: 'say', text: 'どこ行ってたの？', from: 20, to: 80},
      {who: 'him', kind: 'say', text: '……言えない', from: 90, to: 160},
    ],
    captions: [{from: 170, to: 270, lines: ['出張先は、いつも*言えない*。', 'お土産は、*謎の置物*']}],
  },
  {
    id: 'b4_day90',
    duration: 300,
    clock: {value: '90日目'},
    bubbles: [{who: 'her', kind: 'think', text: '……何を\nお願いしてるの？', from: 190, to: 290}],
    captions: [{from: 20, to: 180, lines: ['毎朝かかさず、', '*大きな神社に参拝*']}],
  },
  {
    id: 'b5_day120',
    duration: 300,
    clock: {value: '120日目'},
    bubbles: [{who: 'her', kind: 'think', text: '……生きてるよね？', from: 236, to: 300}],
    captions: [
      {from: 20, to: 140, lines: ['出張中、メッセージは', '*既読にならない*']},
      {from: 146, to: 230, lines: ['電話も、', '*まったくつながらない*']},
    ],
  },
  {
    id: 'b6_day180',
    duration: 270,
    clock: {value: '180日目'},
    bubbles: [
      {who: 'him', kind: 'say', text: 'Copy that.', from: 20, to: 60},
      {who: 'him', kind: 'say', text: '明白了。', from: 64, to: 104},
      {who: 'him', kind: 'say', text: 'Понял.', from: 108, to: 148},
      {who: 'him', kind: 'say', text: "D'accord.", from: 152, to: 192},
      {who: 'him', kind: 'say', text: 'Entendido.', from: 196, to: 236},
    ],
    captions: [{from: 30, to: 270, lines: ['寝言が、', '*5か国語*']}],
  },
  {
    id: 'b7_day365',
    duration: 270,
    clock: {value: '365日目'},
    bubbles: [{who: 'him', kind: 'say', text: '1年間の記録。\n全部あるよ', from: 70, to: 170}],
    captions: [{from: 176, to: 270, lines: ['記念日を、', '*一度も忘れない*']}],
  },
  {
    id: 'b8_end',
    duration: 330,
    clock: {value: '365日目'},
    bubbles: [
      {who: 'her', kind: 'say', text: 'じつはね……', from: 20, to: 90},
      {who: 'him', kind: 'say', text: '……え？', from: 150, to: 200},
    ],
    captions: [
      {from: 130, to: 236, lines: ['彼女も、', '*ただ者じゃなかった*']},
      {from: 242, to: 330, lines: ['あなたの恋人、', '*怪しいところ*ある？']},
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
export const DISCLAIMER = '※ フィクションです。実在の組織・人物とは関係ありません。';
