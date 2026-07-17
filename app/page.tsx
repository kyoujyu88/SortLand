import type { Metadata } from "next";
import SortLab from "./SortLab";

export const metadata: Metadata = {
  title: "SortLand — ソートアルゴリズム可視化ラボ",
  description: "26種類のソートアルゴリズムを、棒グラフ・音・キャラクターと一緒に観察できる学習サイト。",
};

export default function Home() {
  return <SortLab />;
}
