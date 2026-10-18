# 大地の碑文（Novel-005）

![大地の碑文 タイトル](content/images/title/title.png)

> **遺跡探索 × サスペンス**  
> 眠っていたのは、古代の謎か。それとも――人間の殺意か。

## 🎮 プレイ

**[▶ ブラウザで『大地の碑文』をプレイ](https://yasatoma.github.io/Novel-005/)**

インストール不要。PC・スマートフォンのブラウザからプレイできます。

## 作品について

『大地の碑文』は、遺跡探索を題材にしたサスペンス・ノベルゲームです。

遺跡の調査中に発生する不可解な事件。  
怪異の存在を思わせる痕跡。  
探索が進むにつれ、その奥に隠された真相が少しずつ姿を現していきます。

## ゲーム情報

- ジャンル：遺跡探索サスペンス
- プレイ環境：PC / スマートフォン
- インストール：不要
- プレイ料金：無料

## 操作・セーブ

操作方法はゲーム内の「作品・操作について」から確認できます。

セーブデータはブラウザに保存されます。

## 制作

企画・制作：yasatoma

本作品は共通ノベルゲームエンジン **ChappyNovelEngine** を使用して制作しています。

---

## 開発情報

ChappyNovelEngine を同梱した、単体で動作する静的ノベルゲームです。

### ローカル起動

```powershell
python -m http.server 8000
```

`http://localhost:8000/` を開きます。ブラウザのファイル直開きでは `fetch` が動作しません。

### 構成

- `engine/`: ChappyNovelEngine のコピー
- `content/`: Novel-005 のシナリオ、WebP画像、CNEA音声、設定
- `tools/cnea-packer/`: 共通音声パッカー
- `tools/normalize-images/`: `Image-master/` のPNGから配信用WebPを再生成する共通ツール

完成本文は Google Drive `16_完成` の23ファイルから変換しています。原文の台詞・地の文は `content/scenario/main.txt` に格納し、元ファイルIDを章頭コメントに記録しています。

### 確認

```powershell
node tools/validate-content.mjs
```
