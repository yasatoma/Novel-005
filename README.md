# 大地の碑文（Novel-005）

ChappyNovelEngine 1.0 を同梱した、単体で動作する静的ノベルゲームです。

## ローカル起動

```powershell
python -m http.server 8000
```

`http://localhost:8000/` を開きます。ブラウザのファイル直開きでは `fetch` が動作しません。

## 構成

- `engine/`: ChappyNovelEngine main の a6953205c205b71c5a929d1cd2b09fc73b9e02a1 を固定したコピー
- `content/`: Novel-005 のシナリオ、画像、CNEA音声、設定
- `tools/cnea-packer/`: 共通音声パッカー

完成本文は Google Drive `16_完成` の23ファイルから変換しています。原文の台詞・地の文は `content/scenario/main.txt` に格納し、元ファイルIDを章頭コメントに記録しています。

## 確認

```powershell
node tools/validate-content.mjs
```






