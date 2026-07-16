# SortLand

20種類のソートアルゴリズムを、棒グラフ・音・擬人化キャラクターで観察できる静的ウェブサイトです。

## できること

- 20種類のソートをキャラクター一覧から切り替え
- 要素数（n）と再生速度の変更
- 比較箇所・交換箇所・進行度・比較回数・移動回数の可視化
- Web Audio APIによる値に応じた効果音のON/OFF
- 一時停止、再開、1ステップ実行、シャッフル、リセット
- PC・タブレット・スマートフォン対応
- GitHub Pagesへの自動デプロイ

## ローカル実行

```bash
npm ci
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## GitHub Pagesで公開

GitHubのリポジトリ設定で **Settings → Pages → Source** を **GitHub Actions** に設定します。`main` ブランチへpushすると、`.github/workflows/deploy-pages.yml` がテスト・静的ビルド・公開を自動で行います。

## 実装アルゴリズム

Bubble / Selection / Insertion / Merge / Quick / Heap / Shell / Counting / Radix / Cocktail / Comb / Gnome / Odd-Even / Cycle / Pancake / Bucket / Tim / Strand / Stooge / Intro
