import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const [repositoryOwner, repositoryName] = (process.env.GITHUB_REPOSITORY ?? "kyoujyu88/SortLand").split("/");
const siteUrl = `https://${repositoryOwner}.github.io/${repositoryName}/`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SortLand — ソートアルゴリズム可視化ラボ",
    template: "%s | SortLand",
  },
  description: "26種類のソートアルゴリズムを、棒グラフ・軽やかな音・個性豊かなキャラクターと一緒に観察できる学習サイト。",
  keywords: ["ソート", "アルゴリズム", "可視化", "プログラミング学習", "sorting visualizer"],
  icons: {
    icon: `${basePath}/favicon.png`,
    apple: `${basePath}/apple-touch-icon.png`,
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "SortLand",
    title: "SortLand — 26組のソートキャラクターと並び替えを観察しよう",
    description: "棒グラフ・音・キャラクターで、26種類のソートを楽しく比較。",
    url: siteUrl,
    images: [{ url: `${basePath}/og.png`, width: 1200, height: 630, alt: "SortLandのソートキャラクターと棒グラフ" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SortLand — ソートアルゴリズム可視化ラボ",
    description: "26種類のソートを、目で見て耳で聴いて理解しよう。",
    images: [`${basePath}/og.png`],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f1e8",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
