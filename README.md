# moshimo-shorts-

3D「もしも」系 YouTube Shorts の制作リポジトリ（Remotion × Three.js）。

## 作品：もしも地球の自転が突然止まったら

- 1080×1920 / 30fps / 37秒（1110フレーム）
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
python3 scripts/make-bgm.py public/bgm/bgm.wav 37.0   # BGM を numpy で再生成
```

## 構成

```
src/script.ts        テロップ文言・尺（正本）
src/theme.ts         色・フォント・セーフエリア
src/scenes/          シーン 1〜9（Three.js）
src/three/Earth      地球（地形バイオーム・光沢のある海・雲・大気・夜景）、星空、太陽
src/three/Landscape  空・遠景の山・雲・木（インスタンス化）・草・道路・ビル・地形
src/three/Human      顔なし・等身大の人型キャラクターと関節ポーズ
src/three/Props      家・車・風の線
src/dev/             部品確認用のテスト用コンポジション（HumanTest / EarthTest）
src/components/      テロップ・数値カウンター・集中線など
src/lib/CameraRig    フレーム駆動のカメラワーク（キーフレーム＋シェイク）
scripts/             書き出し・検証・効果音生成
verify/              Playwright 検証用の Player ページ
```

フォント：テーマと経過時間は Noto Serif JP（明朝体）、その他は Noto Sans JP（ゴシック体）。どちらも SIL Open Font License で、`public/fonts/` に同梱。
