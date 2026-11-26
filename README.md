# moshimo-shorts-

3D「もしも」系 YouTube Shorts の制作リポジトリ（Remotion × Three.js）。

## 作品：もしも地球の自転が突然止まったら

- 1080×1920 / 30fps / 38秒（1140フレーム）
- 東京に立つ「あなた」の一人称・1カット構成
- ナレーションなし。BGM（合成したやわらかいアンビエント曲）と効果音入り
- 企画・シーン表・数値の根拠：[`docs/plan.md`](docs/plan.md)
- 制作プロンプト：[`PROMPT.md`](PROMPT.md)

## 出力

| ファイル | 内容 |
|---|---|
| `out/moshimo_final.mp4` | 完成版（BGM＋効果音、H.264 / AAC） |
| `out/video_noaudio.mp4` | 音声なし版（音の差し替え用） |
| `out/bgm_only.wav` | BGM だけのステム |
| `out/sfx_only.wav` | 効果音だけのステム |
| `out/check/` | コンタクトシート・テロップ検証キャプチャ・検証レポート |

## コマンド

```bash
npm install
npm run studio        # Remotion Studio でプレビュー
npm run render        # out/ に書き出し（Remotion → FFmpeg）
npm run verify        # FFmpeg + Playwright で自動検証
bash scripts/make-sfx.sh   # 効果音を FFmpeg で再生成
python3 scripts/make-bgm.py public/bgm/bgm.wav 38.0   # BGM を numpy で再生成
```

## 構成

```
src/VideoV4.tsx          完成版のコンポジション（3D＋画面表示＋BGM/効果音）
src/v4/timeline.ts       時間軸：動画フレーム → 自転停止からの時刻・再生倍率・太陽の位置・雪・水位
src/v4/script.ts         語り（明朝体）・数値カード・表・吹き出しの文言（正本）
src/v4/TokyoShot.tsx     東京の一人称カメラ（歩く → スロー → 津波 → 屋上 → 夜 → 空へ）
src/v4/SpaceShot.tsx     宇宙から見た地球と月
src/v4/Hud.tsx           時計・状態バッジ・語り・カード・表・注意書き
src/v4/Callouts.tsx      3D の物体を指す吹き出し（カメラと同じ式で画面位置を計算）
src/v4/city/             街の生成（道路・ビル・電柱と電線・看板・自販機・信号）、飛散物・空・津波・雪、車
src/three/               地球・人型キャラクター・木などの共通部品
src/lib/                 カメラリグ・投影・乱数/ノイズ
scripts/                 書き出し・検証・効果音/BGM 生成
verify/                  Playwright 検証用の Player ページ
```

フォント：テーマと経過時間は Noto Serif JP（明朝体）、その他は Noto Sans JP（ゴシック体）。どちらも SIL Open Font License で、`public/fonts/` に同梱。
