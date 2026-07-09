import type { Metadata } from "next";
import { getExam } from "@/lib/exams";

// 間違えた問題の復習＝個人の解答履歴に依存するページのため検索インデックス対象外にする。
export async function generateMetadata({
  params,
}: {
  params: Promise<{ examId: string }>;
}): Promise<Metadata> {
  const { examId } = await params;
  const exam = getExam(examId);
  return {
    title: `${exam?.name ?? ""} 間違えた問題の復習`,
    robots: { index: false, follow: true },
    alternates: { canonical: `/learn/${examId}/review` },
  };
}

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
