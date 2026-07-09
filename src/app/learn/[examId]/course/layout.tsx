import type { Metadata } from "next";
import { getExam } from "@/lib/exams";

// ステップで学習（分野一覧）。親layoutのハブ用メタ（canonical含む）を正しく上書きする。
export async function generateMetadata({
  params,
}: {
  params: Promise<{ examId: string }>;
}): Promise<Metadata> {
  const { examId } = await params;
  const exam = getExam(examId);
  if (!exam) return { title: "過去問演習ラボ" };
  const title = `${exam.name} ステップで学習（分野一覧）`;
  const description = `${exam.name}の分野別ステップ学習。用語を学んだら、その場で本物の過去問に挑戦。学習→演習の繰り返しで合格に近づけます（無料）。`;
  return {
    title,
    description,
    alternates: { canonical: `/learn/${examId}/course` },
    openGraph: { title, description, url: `/learn/${examId}/course` },
  };
}

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
