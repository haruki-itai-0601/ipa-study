import type { Metadata } from "next";
import { getExam, displayCategory } from "@/lib/exams";

// 分野別のパス型学習ページ。親layout（ハブ用メタ）のcanonicalを自ページに上書きする。
export async function generateMetadata({
  params,
}: {
  params: Promise<{ examId: string; category: string }>;
}): Promise<Metadata> {
  const { examId, category } = await params;
  const exam = getExam(examId);
  if (!exam) return { title: "過去問演習ラボ" };
  const cat = displayCategory(examId, decodeURIComponent(category));
  const title = `${cat}の学習パス｜${exam.name}`;
  const description = `${exam.name}「${cat}」分野のステップ学習。頻出用語を学びながら、本物の過去問のチェック問題で理解を確認できます（無料）。`;
  return {
    title,
    description,
    alternates: { canonical: `/learn/${examId}/${category}` },
    openGraph: { title, description, url: `/learn/${examId}/${category}` },
  };
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
