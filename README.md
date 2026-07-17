<div align="center">

![SortLand — Sorting Algorithm Playground](public/og.png)

# SortLand

**目で見て、耳で聴いて、ソートアルゴリズムを好きになる。**

26種類のソートを、棒グラフとキャラクターで楽しく観察できるビジュアライザーです。

[デモを開く](https://kyoujyu88.github.io/SortLand/) · [搭載アルゴリズム](#搭載アルゴリズム) · [ローカル実行](#ローカル実行)

![Algorithms](https://img.shields.io/badge/algorithms-26-5fa9a3?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-33434a?style=flat-square&logo=next.js&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-df7c70?style=flat-square&logo=github)

</div>

## SortLandについて

アルゴリズムの説明を読むだけでなく、乱れた棒が少しずつ整っていく過程を実際に観察するための学習サイトです。25人の女の子と、ボゴソート担当のゴリラでソートを表現し、特徴的な操作や考え方が視覚的に伝わるよう設計しています。

### 主な機能

- **26種類のソート** — 基本、高速、非比較、個性派の4カテゴリ
- **リアルタイム可視化** — 比較中・交換中・配置中の要素を色分け
- **自由な実験** — 要素数 `n` と再生速度をその場で変更
- **耳でも観察** — 値に応じた軽やかなスチールドラム風の音と、完了時の上昇チャイム
- **細かな操作** — 一時停止、再開、1ステップ、シャッフル、リセット
- **実行メトリクス** — 比較回数、移動回数、経過時間、進行度を表示
- **レスポンシブ対応** — PC、タブレット、スマートフォンで利用可能

## 使い方

1. 左側のキャラクター一覧から観察したいソートを選びます。
2. `要素数`、`スピード`、`サウンド`を好みに合わせて調整します。
3. **スタート**を押すとソートが始まります。
4. 動きを詳しく見たいときは、一時停止して**1ステップ**ずつ進められます。

> [!TIP]
> 同じ並びで別のアルゴリズムへ切り替えると、処理の違いを比較しやすくなります。ストゥージソートは `n = 48`、ビーズソートは `n = 64`、ボゴソートは `n = 7` が観察上限です。ビトニックソートでは要素数を2の累乗から選びます。

## 搭載アルゴリズム

| カテゴリ | アルゴリズム |
| --- | --- |
| 基本 | Bubble / Selection / Insertion / Cocktail / Comb |
| 高速 | Merge / Quick / Heap / Shell / Tim / Intro / Bitonic / Tournament / Tree |
| 非比較 | Counting / Radix / Bucket / Bead |
| 個性派 | Gnome / Odd-Even / Cycle / Pancake / Strand / Stooge / Bogo / Circle |

各アルゴリズムには、平均・最悪計算量、追加メモリ、安定性、仕組みの解説を収録しています。

## ローカル実行

### 必要環境

- Node.js `22.13.0` 以上
- npm

### セットアップ

```bash
git clone https://github.com/kyoujyu88/SortLand.git
cd SortLand
npm ci
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動 |
| `npm test` | 全26アルゴリズムの正当性と回帰テストを実行 |
| `npm run build` | GitHub Pages向けの静的サイトを生成 |
| `npm run lint` | ソースコードを検査 |

## GitHub Pagesで公開

このリポジトリには [GitHub Actionsワークフロー](.github/workflows/deploy-pages.yml) が含まれています。

1. リポジトリの **Settings → Pages** を開きます。
2. **Build and deployment → Source** を **GitHub Actions** に設定します。
3. `main` ブランチへpushすると、テスト・静的ビルド・公開が自動実行されます。

Next.jsのベースパスはGitHub Actions上でリポジトリ名から自動設定されるため、プロジェクトページでも追加設定なしでアセットを読み込めます。

## プロジェクト構成

```text
app/
  SortLab.tsx       # 操作画面、再生制御、Web Audio
  globals.css       # レイアウトと親しみやすいカラーテーマ
lib/
  algorithms.ts     # キャラクター情報とアルゴリズム解説
  sorts.ts          # 26種類のソートと可視化操作列
public/
  sort-characters.webp
  sort-characters-new.webp
  og.png
tests/
  sorts.test.mjs    # 正当性・回帰テスト
```

## デザイン

キャラクターは全26体をSortLand専用に制作しています。各イラストの小物やポーズには、隣接交換、最小値選択、ピボット分割、ヒープ構造、ランダムシャッフル、比較ネットワーク、重力、トーナメント木など、それぞれのアルゴリズム固有の考え方を反映しています。
