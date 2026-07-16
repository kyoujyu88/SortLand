import type { Metadata } from "next";
import SortLab from "./SortLab";

export const metadata: Metadata = {
  title: "SortLand — ソートアルゴリズム可視化ラボ",
  description: "20種類のソートアルゴリズムを、棒グラフ・音・擬人化キャラクターと一緒に観察できる学習サイト。",
};

export default function Home() {
  return <SortLab />;
}
