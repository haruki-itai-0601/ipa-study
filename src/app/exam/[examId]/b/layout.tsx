import type { Metadata } from "next";
import { getExam } from "@/lib/exams";

// 科目B（午後）ページのSEOメタ。「基本情報技術者試験 科目B(午後) 過去問」系の検索を取る。
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
    examId === "fe"
      ? "基本情報技術者試験 科目B（午後）過去問演習（無料）"
      : `${exam.name} 科目B 過去問演習（無料）`;
  const description =
    examId === "fe"
      ? "基本情報技術者試験 科目B（旧 午後）の公開過去問を無料で演習。アルゴリズムとプログラミング・情報セキュリティの出題に、独自解説つきで対策できます。"
      : `${exam.name}の科目B問題を無料で演習できます。`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/exam/${examId}/b` },
    openGraph: { title, description, url: `/exam/${examId}/b`, images: [{ url: "/og.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default function BLayout({ children }: { children: React.ReactNode }) {
  return children;
}
