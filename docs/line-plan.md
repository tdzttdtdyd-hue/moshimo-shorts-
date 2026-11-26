# 企画書：もしも全人類が一列に並んだら？（バージョンAのテイスト・45秒）

- コンポジション：`LineShort`（`src/line/`）、1350 フレーム / 30fps / 1080×1920
- 出力：`out/line/line_final.mp4`（BGM＋効果音）、`bgm_only.wav`、`sfx_only.wav`、`video_noaudio.mp4`
- 書き出し：`COMP=LineShort OUT=out/line FINAL=line_final node scripts/render.mjs`
- 検証：`MIN_SEC=42 MAX_SEC=48 APP=verify/app-line.tsx CHECK=out/line/check node scripts/verify.mjs out/line/line_final.mp4`
- 締め：A案（一生かかっても最後尾にはたどり着けない）

## 前提と数値

世界人口 約82億人、1人分の幅 約45cm（肩幅＋すき間）→ 全長 約369万km

| 人数 | 長さ | 比較 |
|---|---|---|
| 1人 | 約45cm | — |
| 東京都 約1,400万人 | 約6,300km | 日本列島（北海道〜沖縄 約3,000km）の約2倍 |
| 日本 約1.24億人 | 約5.6万km | 地球1周（約40,075km）より長い |
| 全人類 約82億人 | 約369万km | 地球 約92周（日本の約66倍） |
| — | — | 月まで（約38.4万km）約4.8往復 |
| — | — | 光（秒速 約30万km）なら 約12秒 |
| — | — | 時速4kmで休まず歩いて 約105年（約92万時間） |
