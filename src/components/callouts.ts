// 3D の物体を指す吹き出しの文言（フォント読み込み対象にするため一覧にしておく）
export const CALLOUTS = {
  ground: {tag: '地面', text: '自転と一緒に停止'},
  people: {tag: '人・車', text: '慣性で動き続ける'},
  tokyo: {tag: '東京', text: '高層ビル街に砂嵐'},
  pole: {tag: '街灯', text: '必死につかまる'},
  sea: {tag: '海', text: '慣性で陸へ押し寄せる'},
  equator: {tag: '赤道', text: '海が引いて陸地に'},
  pole_n: {tag: '北極', text: '海が集まる'},
  night: {tag: '夜側', text: '半年続く夜'},
  day: {tag: '昼側', text: '半年続く昼'},
  hot: {tag: '昼側', text: '太陽が沈まない'},
  cold: {tag: '夜側', text: '太陽が昇らない'},
  border: {tag: '境目', text: '昼と夜のあいだ'},
  moon: {tag: '月', text: '潮の満ち引きでブレーキ'},
};
export const CALLOUT_TEXT = Object.values(CALLOUTS)
  .map((c) => c.tag + c.text)
  .join('');
