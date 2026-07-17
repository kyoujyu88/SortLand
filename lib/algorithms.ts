export type AlgorithmCategory = "basic" | "fast" | "linear" | "unique";

export type Algorithm = {
  id: string;
  name: string;
  english: string;
  character: string;
  category: AlgorithmCategory;
  icon: number;
  accent: string;
  tagline: string;
  description: string;
  how: string;
  average: string;
  worst: string;
  memory: string;
  stable: boolean;
  maxN?: number;
  allowedN?: number[];
};

export const ALGORITHMS: Algorithm[] = [
  {
    id: "bubble", name: "バブルソート", english: "BUBBLE SORT", character: "バブル・ポップ",
    category: "basic", icon: 0, accent: "#5fa9b6", tagline: "となり同士を比べて、泡のように浮かせる。",
    description: "隣り合う2本を見比べ、順番が逆なら交換。大きな値が右端へ少しずつ浮かんでいきます。",
    how: "左から右へ何度も往復し、交換が一度も起きなくなるまで続けます。動きが分かりやすく、ソート入門にぴったりです。",
    average: "O(n²)", worst: "O(n²)", memory: "O(1)", stable: true,
  },
  {
    id: "selection", name: "選択ソート", english: "SELECTION SORT", character: "セレナ・スカウト",
    category: "basic", icon: 1, accent: "#d6a34a", tagline: "最小の一本を見つけて、先頭へ。",
    description: "未整理エリアをくまなく探し、その中でいちばん小さい値を選んで左端に置きます。",
    how: "探索と配置をきっちり分けるのが特徴。交換回数は少なめですが、比較は毎回最後まで行います。",
    average: "O(n²)", worst: "O(n²)", memory: "O(1)", stable: false,
  },
  {
    id: "insertion", name: "挿入ソート", english: "INSERTION SORT", character: "イリス・ブック",
    category: "basic", icon: 2, accent: "#718cb7", tagline: "一枚ずつ、正しいすき間へ差し込む。",
    description: "左側を常に整列済みに保ち、新しい値をトランプの手札のように適切な位置へ差し込みます。",
    how: "ほぼ整ったデータほど速いのが強み。小さな配列では実用アルゴリズムの仕上げ役にもなります。",
    average: "O(n²)", worst: "O(n²)", memory: "O(1)", stable: true,
  },
  {
    id: "merge", name: "マージソート", english: "MERGE SORT", character: "メル・ユナイト",
    category: "fast", icon: 3, accent: "#8a79aa", tagline: "分けて、整えて、ひとつに結ぶ。",
    description: "配列を半分ずつに分割し、整列済みの小さな列どうしを丁寧に結合していきます。",
    how: "入力の並びに左右されず安定した速さ。追加の作業領域と引き換えに、予測しやすい性能を得ます。",
    average: "O(n log n)", worst: "O(n log n)", memory: "O(n)", stable: true,
  },
  {
    id: "quick", name: "クイックソート", english: "QUICK SORT", character: "クイナ・スラッシュ",
    category: "fast", icon: 4, accent: "#d06c78", tagline: "基準を決めて、一気に左右へ切り分ける。",
    description: "ピボットを基準に小さい値と大きい値を左右へ分け、できた区間を再帰的に攻略します。",
    how: "平均的には非常に高速。ピボット選びによって動きも性能も大きく変わる、実戦派のソートです。",
    average: "O(n log n)", worst: "O(n²)", memory: "O(log n)", stable: false,
  },
  {
    id: "heap", name: "ヒープソート", english: "HEAP SORT", character: "ヒープ・クラウン",
    category: "fast", icon: 5, accent: "#b7834d", tagline: "山の頂点から、最大値を掘り出す。",
    description: "親が子より大きいヒープ構造を作り、頂点の最大値を末尾へ順番に運びます。",
    how: "最悪時も O(n log n) で、追加メモリもほぼ不要。棒が木構造を作るような独特の動きに注目です。",
    average: "O(n log n)", worst: "O(n log n)", memory: "O(1)", stable: false,
  },
  {
    id: "shell", name: "シェルソート", english: "SHELL SORT", character: "シェリー・ギア",
    category: "fast", icon: 6, accent: "#55a89e", tagline: "遠くを先に整えて、すき間を縮める。",
    description: "離れた要素どうしを挿入ソートし、間隔をだんだん狭めて全体を整えます。",
    how: "大きな乱れを早い段階で直せるため、単純な挿入ソートよりずっと軽快に進みます。",
    average: "約 O(n^1.5)", worst: "O(n²)", memory: "O(1)", stable: false,
  },
  {
    id: "counting", name: "計数ソート", english: "COUNTING SORT", character: "カウンタ・ミドリ",
    category: "linear", icon: 7, accent: "#76a56a", tagline: "比べずに数えて、順番を再構築。",
    description: "各値がいくつあるかを数え、値の小さい順に棒グラフを組み直します。",
    how: "値の範囲が狭い整数データなら比較ソートの壁を越える速さ。今回は 1〜n の棒と相性抜群です。",
    average: "O(n + k)", worst: "O(n + k)", memory: "O(k)", stable: true,
  },
  {
    id: "radix", name: "基数ソート", english: "RADIX SORT", character: "ラディ・ビート",
    category: "linear", icon: 8, accent: "#5b91ba", tagline: "一の位、十の位。桁ごとに整える。",
    description: "数値を一の位から順にグループ分けし、桁を重ねるたびに全体の順序を完成させます。",
    how: "値そのものを比較しない非比較ソート。桁数が少ない整数に対して大きな力を発揮します。",
    average: "O(d(n + k))", worst: "O(d(n + k))", memory: "O(n + k)", stable: true,
  },
  {
    id: "cocktail", name: "カクテルソート", english: "COCKTAIL SORT", character: "カクテル・リカ",
    category: "basic", icon: 9, accent: "#c9798d", tagline: "右へ、左へ。シェイクしながら往復。",
    description: "バブルソートを双方向にした手法。大きい値を右へ、小さい値を左へ同じ周回で運びます。",
    how: "一方向だけより両端の乱れを早く直せます。バーをシェイクするような往復運動が見どころです。",
    average: "O(n²)", worst: "O(n²)", memory: "O(1)", stable: true,
  },
  {
    id: "comb", name: "コムソート", english: "COMB SORT", character: "コーム・アン",
    category: "basic", icon: 10, accent: "#d48255", tagline: "大きな櫛から、細かな櫛へ。",
    description: "最初は遠く離れた棒を比較し、櫛の歯の間隔を縮めながらバブルソートへ近づきます。",
    how: "小さい値が右端に残る「カメ」を早めに救出。単純ながらバブルソートを巧みに改善します。",
    average: "約 O(n²/2^p)", worst: "O(n²)", memory: "O(1)", stable: false,
  },
  {
    id: "gnome", name: "ノームソート", english: "GNOME SORT", character: "ノノ・ガーデン",
    category: "unique", icon: 11, accent: "#c16e5b", tagline: "順番が違ったら、一歩戻って直す。",
    description: "隣が正しければ前進、逆なら交換して一歩後退。庭の鉢を並べ直す小人の発想です。",
    how: "コードはとても短く直感的。棒が行ったり来たりしながら、少しずつ前へ進む様子を楽しめます。",
    average: "O(n²)", worst: "O(n²)", memory: "O(1)", stable: true,
  },
  {
    id: "oddEven", name: "奇偶転置ソート", english: "ODD-EVEN SORT", character: "オッド＆イヴ",
    category: "unique", icon: 12, accent: "#8f7bb6", tagline: "奇数組と偶数組、交互に連携。",
    description: "奇数番目ペアと偶数番目ペアを交互に比較し、全ペアが落ち着くまで交換します。",
    how: "互いに重ならないペアは同時処理できるため、並列計算の考え方にもつながります。",
    average: "O(n²)", worst: "O(n²)", memory: "O(1)", stable: true,
  },
  {
    id: "cycle", name: "サイクルソート", english: "CYCLE SORT", character: "サイクラ・リング",
    category: "unique", icon: 13, accent: "#8aa65a", tagline: "置き場所を見抜き、最小回数で回す。",
    description: "各値の最終位置を数え上げ、閉じたサイクルを回転させるように直接配置します。",
    how: "書き込み回数が理論上最小なのが最大の個性。メモリへの書き込みが高価な場面で光ります。",
    average: "O(n²)", worst: "O(n²)", memory: "O(1)", stable: false,
  },
  {
    id: "pancake", name: "パンケーキソート", english: "PANCAKE SORT", character: "パンナ・フリップ",
    category: "unique", icon: 14, accent: "#d69a4f", tagline: "先頭からまとめて、くるっと裏返す。",
    description: "使える操作は先頭から任意位置までの反転だけ。最大値を表へ出してから末尾へ返します。",
    how: "フライ返し一枚で積み重ねを整えるパズル。大きく反転するドラマチックな動きを観察できます。",
    average: "O(n²)", worst: "O(n²)", memory: "O(1)", stable: false,
  },
  {
    id: "bucket", name: "バケットソート", english: "BUCKET SORT", character: "バケル・アクア",
    category: "linear", icon: 15, accent: "#62a8bf", tagline: "近い値を同じバケツへ集める。",
    description: "値の範囲を複数のバケツに分け、各バケツ内を整えてから順につなぎます。",
    how: "値が均等に散らばるデータほど高速。分布を利用して探索範囲を小さくする発想です。",
    average: "O(n + k)", worst: "O(n²)", memory: "O(n + k)", stable: true,
  },
  {
    id: "tim", name: "ティムソート", english: "TIMSORT", character: "ティマ・コンダクト",
    category: "fast", icon: 16, accent: "#a6855b", tagline: "小さく整え、巧みに合奏させる。",
    description: "挿入ソートとマージソートを組み合わせ、現実のデータに多い整った区間を活用します。",
    how: "Python や Java の標準機能にも採用された実用派。今回は固定長ランを作って順にマージします。",
    average: "O(n log n)", worst: "O(n log n)", memory: "O(n)", stable: true,
  },
  {
    id: "strand", name: "ストランドソート", english: "STRAND SORT", character: "ストラ・ブレイド",
    category: "unique", icon: 17, accent: "#8d92a8", tagline: "伸びる一本を抜き出し、編み合わせる。",
    description: "元の列から増加する一本のストランドを抜き取り、完成済みの列へマージしていきます。",
    how: "連結リストと好相性。すでに増加している部分が長いほど、一度に多くの値を運べます。",
    average: "O(n²)", worst: "O(n²)", memory: "O(n)", stable: true,
  },
  {
    id: "stooge", name: "ストゥージソート", english: "STOOGE SORT", character: "ストゥ・ベル",
    category: "unique", icon: 18, accent: "#c77b9c", tagline: "三分の二を、三度もおさらい。",
    description: "両端を整えたあと、前方2/3・後方2/3・前方2/3を再帰的にソートする珍手です。",
    how: "とても遅い教育・娯楽向けアルゴリズム。非効率さまで可視化するため、要素数は48に制限しています。",
    average: "O(n^2.709)", worst: "O(n^2.709)", memory: "O(log n)", stable: false, maxN: 48,
  },
  {
    id: "intro", name: "イントロソート", english: "INTROSORT", character: "イントラ・ガード",
    category: "fast", icon: 19, accent: "#607eae", tagline: "速さを攻めて、深追いしたら守りへ。",
    description: "クイックソートを軸に、再帰が深すぎるとヒープ、小区間では挿入へ切り替えます。",
    how: "平均の速さと最悪時の保証を両立するハイブリッド。状況に応じて三つの武器を使い分けます。",
    average: "O(n log n)", worst: "O(n log n)", memory: "O(log n)", stable: false,
  },
  {
    id: "bogo", name: "ボゴソート", english: "BOGO SORT", character: "ボゴ・ゴリラ",
    category: "unique", icon: 20, accent: "#c98645", tagline: "サイコロ任せで、当たりの並びを引くまで混ぜる。",
    description: "並びが整っているか確かめ、違っていたら全体をランダムにシャッフル。理屈より運で正解を待つ、究極のネタ系ソートです。",
    how: "シャッフル一回を一つのステップとして観察します。ブラウザを守るため要素数は7まで。規定回数で当たりを引けない場合だけ、挿入ソートが最後のひと押しを担当します。",
    average: "O(n · n!)", worst: "上限なし", memory: "O(n)", stable: false, maxN: 7,
  },
  {
    id: "bitonic", name: "ビトニックソート", english: "BITONIC SORT", character: "ビトニカ・ピーク",
    category: "fast", icon: 21, accent: "#6676a8", tagline: "上り坂と下り坂を作り、頂点から一気にそろえる。",
    description: "増加列と減少列を組み合わせたビトニック列を作り、規則正しい比較ネットワークで昇順へ変換します。",
    how: "比較する相手が段階ごとに決まっているため、左右対称の波が何度も走ります。標準形に合わせ、要素数は2の累乗から選びます。",
    average: "O(n log² n)", worst: "O(n log² n)", memory: "O(1)", stable: false,
    maxN: 128, allowedN: [8, 16, 32, 64, 128],
  },
  {
    id: "circle", name: "サークルソート", english: "CIRCLE SORT", character: "サーラ・リング",
    category: "unique", icon: 22, accent: "#c97878", tagline: "外側の二人から、円を縮めるように比べる。",
    description: "列の両端をペアにして内側へ進み、左右の大小が逆なら交換。半分ずつ再帰し、交換がなくなるまで円を描くように繰り返します。",
    how: "端と端、次の端と次の端という対称的な比較が見どころです。比較回数の厳密な一般評価は研究途上ですが、独特の反復模様を観察できます。",
    average: "未確定", worst: "未確定", memory: "O(log n)", stable: false,
  },
  {
    id: "bead", name: "ビーズソート", english: "BEAD SORT", character: "ビーディ・ドロップ",
    category: "linear", icon: 23, accent: "#4f9d96", tagline: "ビーズを落として、重力に順番を任せる。",
    description: "値をビーズの本数として並べ、同じ桁のビーズを重力方向へ落下。積み上がった高さを読み取ると、小さい順に整います。",
    how: "低い段からビーズが一粒ずつ落ち、棒の高さが階段状に育ちます。正の整数専用で操作量も増えやすいため、要素数は64までです。",
    average: "O(n · m)", worst: "O(n · m)", memory: "O(n)", stable: false, maxN: 64,
  },
  {
    id: "tournament", name: "トーナメントソート", english: "TOURNAMENT SORT", character: "トーナ・ウィナー",
    category: "fast", icon: 24, accent: "#708c52", tagline: "一対一の勝負を重ね、最小値を勝者にする。",
    description: "値をトーナメント表で比較し、各試合の小さい値を上へ進めます。優勝者を取り出したら、その経路だけを再試合します。",
    how: "最初に全員で勝ち抜き戦を作り、以後は優勝者がいた枝だけを更新。比較の流れが木の根元へ集まる様子を追えます。",
    average: "O(n log n)", worst: "O(n log n)", memory: "O(n)", stable: false,
  },
  {
    id: "tree", name: "ツリーソート", english: "TREE SORT", character: "ツリィ・リーフ",
    category: "fast", icon: 25, accent: "#668455", tagline: "枝へ値を預け、左から順番に読み取る。",
    description: "小さい値を左、大きい値を右へ入れて二分探索木を構築。左の枝、根、右の枝の順にたどって整列結果を取り出します。",
    how: "入力順に枝が伸び、最後は左端から右端へ読み上げます。偏った入力では木も偏るため、最悪時には二乗時間になります。",
    average: "O(n log n)", worst: "O(n²)", memory: "O(n)", stable: false,
  },
];

export const CATEGORY_LABELS: Record<"all" | AlgorithmCategory, string> = {
  all: "すべて",
  basic: "基本",
  fast: "高速",
  linear: "非比較",
  unique: "個性派",
};
