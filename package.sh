#!/bin/bash

# パッケージ名を指定
name="Creative_Helper"
version="0.0.7"

# ディレクトリの作成
mkdir -p ./package

# package フォルダ内にコピー
cp -r ./CreativeHelper-BP ./CreativeHelper-RP ./package

# ディレクトリの移動
cd ./package

# mcpackの作成
zip -r ${name}_${version}.zip ./*

# 名前の変更
mv ${name}_${version}.zip ${name}_${version}.mcaddon

# package フォルダの削除
rm -rf ./CreativeHelper-BP ./CreativeHelper-RP

echo
echo "Make package successful!"
echo
