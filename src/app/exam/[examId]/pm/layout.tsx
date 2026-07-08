import type { Metadata } from "next";
import { getExam } from "@/lib/exams";

// 午後（記述式）ページのSEOメタ。「応用情報技術者試験 午後 過去問」系の検索を取る。
// page.tsx は "use client" のため、メタデータはこの layout で付与する。
export async function generateMetadata({
  params,
}: {
  params: Promise<{ examId: string }>;
}): Promise<Metadata> {
  const { examId } = await params;
  const exam = getExam(examId);
  if (!exam) return { title: "過去問演習ラボ" };
  const title =
    examId === "ap"
      ? "応用情報技術者試験 午後 過去問演習・AI採点"
      : `${exam.name} 午後 過去問演習`;
  const description =
    examId === "ap"
      ? "応用情報技術者試験 午後の本物の過去問を演習。自分で採点しづらい記述式の解答をAIが採点・講評します。令和3〜7年度に対応。"
      : `${exam.name}の午後問題を演習できます。`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/exam/${examId}/pm` },
    openGraph: { title, description, url: `/exam/${examId}/pm`, images: [{ url: "/og.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default function PmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
