# バージョンの呼び方

以降、完成版を次の名前で呼ぶ。

| 呼び方 | 中身 | コミット | 動画 |
|---|---|---|---|
| **バージョンA** | テイスト変更前の完成版。9シーン構成・37秒（1110フレーム）。明朝体のテーマ／「自転停止から」の経過時間、半透明のデータカード、物を指す吹き出し、画面下の字幕、BGM＋効果音 | `058e975`（Render v3 video） | `git show 058e975:out/moshimo_final.mp4 > version_A.mp4` |
| **バージョンB** | テイスト変更後の完成版。東京に立つ一人称・1カット・38秒（1140フレーム）。ミリ秒まで進む時計と早送り倍率、風・空のバッジ、明朝体の語り、数値カード・表、注意書き、BGM＋効果音。地球パネルなし・電柱は風下へ・縦書き看板の長音記号を修正済み | `7b99fec`（Re-render: no globe panel…） | 現在の `out/moshimo_final.mp4` |

- バージョンAのソースを見るとき：`git checkout 058e975 -- src`（作業後は `git checkout HEAD -- src` で戻す）
- バージョンAを作り直す場合は、別ブランチやフォルダに分けて作業する

## そのほかの作品

| 作品 | テイスト | ソース | 出力 |
|---|---|---|---|
| もしも1回ごとにスパイクの威力が2倍になっていったら？（40秒） | バージョンA | `src/volley/`（コンポジション `VolleyShort`）、企画 `docs/volley-plan.md` | `out/volley/volley_final.mp4` |
| もしも1円玉が毎日2倍に増えていったら？（50秒） | バージョンA | `src/coin/`（コンポジション `CoinShort`）、企画 `docs/coin-plan.md` | `out/coin/coin_final.mp4` |
| もしも太陽が地球からどんどん離れていったら？（42秒） | バージョンA | `src/sun/`（コンポジション `SunShort`）、企画 `docs/sun-plan.md` | `out/sun/sun_final.mp4` |
| もしも全人類が一列に並んだら？（45秒） | バージョンA | `src/line/`（コンポジション `LineShort`）、企画 `docs/line-plan.md` | `out/line/line_final.mp4` |
| もし人類が全員、堀大輔の生活を送ったら（48秒） | バージョンA | `src/hori/`（コンポジション `HoriShort`） | `out/hori/hori_final.mp4` |
| もしも月が地球に少しずつ近づいてきたら？（46秒） | バージョンA | `src/moon/`（コンポジション `MoonShort`） | `out/moon/moon_final.mp4` |
| もしも地球が立方体だったら？（48秒） | バージョンA | `src/cube/`（コンポジション `CubeShort`） | `out/cube/cube_final.mp4` |
| もし全人類のスマホが1日なくなったら（46秒） | バージョンA | `src/phone/`（コンポジション `PhoneShort`） | `out/phone/phone_final.mp4` |
| もしも無人島にワープしたら？（60秒） | バージョンA | `src/island/`（コンポジション `IslandShort`） | `out/island/island_final.mp4` |

書き出し：`COMP=VolleyShort OUT=out/volley FINAL=volley_final node scripts/render.mjs`
検証：`APP=verify/app-volley.tsx CHECK=out/volley/check node scripts/verify.mjs out/volley/volley_final.mp4`

### 長尺・横向き（1920×1080）

| 作品 | テイスト | ソース | 出力 |
|---|---|---|---|
| もしも太陽が地球からどんどん離れていったら？ 長尺版（制作中：序章＋第1章 100秒） | バージョンA（横向き） | `src/sunlong/`（コンポジション `SunLong`） | `out/sunlong/sunlong_final.mp4`（git には入れない） |

書き出し：`COMP=SunLong OUT=out/sunlong FINAL=sunlong_final node scripts/render.mjs`
検証：`RES=1920x1080 MIN_SEC=95 MAX_SEC=105 APP=verify/app-sunlong.tsx CHECK=out/sunlong/check node scripts/verify.mjs out/sunlong/sunlong_final.mp4`
