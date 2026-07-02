import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IT用語集（ITパスポート・基本情報・応用情報 共通）｜過去問演習ラボ",
  description:
    "ITパスポート・基本情報技術者・応用情報技術者試験に出る重要用語を、一言定義でサッと引ける共通用語集。五十音索引・検索・試験レベル・分野の絞り込みに対応しています。",
};

export default function GlossaryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
