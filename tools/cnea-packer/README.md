# CNEA v1 packer

作品組立工程用の共通変換ツールです。OGG/MP3/WAVは再エンコードせず、CNEA v1の6 byteヘッダーを付与します。

## 入力

指定した作業ディレクトリの `audio_original/bgm/` と `audio_original/se/`。対応拡張子は `.ogg` / `.mp3` / `.wav`。

## 実行

```bat
tools\\cnea-packer\\convert_audio.bat C:\\path\\to\\work
```

または `node tools/cnea-packer/pack.mjs <workdir>`。

## 出力

`audio/bgm/B001.dat...` と `audio/se/S001.dat...` を、それぞれファイル名順で独立採番します。`audio/map.txt` はUTF-8 TSVで `type / original / packed` の対応を出力します。

変換がすべて成功してから既存の `audio/` を置換します。各カテゴリ最大999件です。
