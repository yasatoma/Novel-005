# normalize-images

高品質PNG原本（`Image-master/`）から、ゲーム配信用WebP（`Image/`）を生成する画像ビルドツールです。

## 基本方針

- 画像生成工程では原本PNGを作成し、リサイズ・WebP化は本ツールでまとめて行う
- 通常は Codex 等のCLI実行から作品単位で一括処理する
- 手動差し替え時は背景・キャラクターを1件だけ再生成できる
- `ALL` / `ALL_BG` / `ALL_CH` は対象の `Image/` 出力先を先に全クリアしてから再生成するため、原本から削除された古い画像が残らない
- 個別指定（`BG_029` / `CH_006` 等）は対象IDだけ削除して再生成する
- `Image-master/` の原本は変更しない
- 背景: 1920x1080へcoverリサイズ＋中央クロップ
- キャラクター: 2000x3000透明キャンバスへ配置
- WebP品質: 既定85（`--quality`で変更可）
- キャラクターのalphaはWebPで維持

## フォルダ構成

```text
<work_root>/
├─ Image-master/
│  ├─ Background/
│  │  └─ BG_001_*.png
│  ├─ Character/
│  │  └─ CH_001_*.png
│  └─ character_height_basis.json
└─ Image/
   ├─ Background/
   └─ Character/
```

## キャラクター身長比

身長計算の基準画像には `CH_XXX_通常.png` を使用します。
従来作品の互換性のため、通常画像がない場合は `CH_XXX_基本.png` を使用します。
両方ある場合は通常画像を優先します。出力ファイル名は各原本の名前を維持し、両方とも変換します。
どちらもない場合はエラーとし、他の表情から基準を推測しません。

一括処理では `Image-master/character_height_basis.json` を読みます。

```json
{
  "CH_001": 0.90,
  "CH_002": 0.93,
  "CH_003": 0.95,
  "CH_004": 0.99,
  "CH_005": 0.93,
  "CH_006": 1.03
}
```

値は基準人物高2500pxに掛ける身長比です。
別ファイルを使う場合は `--height-basis-file` で指定できます。

## CLI実行

### 作品内の全画像を一括生成（標準）

```bat
python tools\normalize-images\normalize_images.py C:\path\to\Resource\Novel-005
```

target_id省略時は `ALL` として処理します。

`ALL` 実行時は、最初に `Image/Background/` と `Image/Character/` の内容を全て削除してから再生成します。生成物フォルダを完全再構築するため、`Image-master/` から削除された旧画像も残りません。

### 背景だけ / キャラクターだけ

```bat
python tools\normalize-images\normalize_images.py C:\path\to\Resource\Novel-005 ALL_BG
python tools\normalize-images\normalize_images.py C:\path\to\Resource\Novel-005 ALL_CH
```

`ALL_BG` は `Image/Background/`、`ALL_CH` は `Image/Character/` をそれぞれ先に全クリアしてから再生成します。

### 1件だけ手動再生成

```bat
python tools\normalize-images\normalize_images.py C:\path\to\Resource\Novel-005 BG_029
python tools\normalize-images\normalize_images.py C:\path\to\Resource\Novel-005 CH_006 --height-basis 1.03
```

キャラクター単体指定では、`--height-basis` を省略すると身長比JSONを参照します。

## Codex等からの自動実行

`--json` を付けると通常ログを抑制し、最後に機械可読なJSONを1行だけ標準出力します。

```bat
python tools\normalize-images\normalize_images.py C:\path\to\Resource\Novel-005 ALL --json
```

成功例:

```json
{"success":true,"target":"ALL","quality":85,"backgrounds":{"targets":29,"files":34},"characters":{"targets":8,"files":21},"failed":[]}
```

一部失敗例:

```json
{"success":false,"target":"ALL","quality":85,"backgrounds":{"targets":29,"files":34},"characters":{"targets":7,"files":19},"failed":[{"target":"CH_006","message":"身長比が未設定です。..."}]}
```

## 終了コード

| code | 意味 |
|---:|---|
| 0 | 全件成功 |
| 1 | 対象処理の一部または単体処理が失敗 |
| 2 | 引数・オプション不備 |
| 3 | 作業ルート・設定等の入力不備 |

Codex等は **終了コードを先に確認し、必要に応じてJSONの `failed` を読む** 想定です。

## BAT

Windowsで手動利用する場合は同梱のBATも使用できます。

```bat
tools\normalize-images\normalize_images.bat C:\path\to\Resource\Novel-005
tools\normalize-images\normalize_images.bat C:\path\to\Resource\Novel-005 BG_029
```

BATはPython本体へ引数をそのまま渡す薄いラッパーです。

Engineを作品へコピーした後は、そのコピー内の `tools/normalize-images/` を使用してください。
