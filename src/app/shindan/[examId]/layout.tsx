import type { Metadata } from "next";
import { basicExams } from "@/lib/exams";

// AI合格診断ランディングのメタデータ（試験別タイトル＋汎用OGPカード）。
export async function generateMetadata({
  params,
}: {
  params: Promise<{ examId: string }>;
}): Promise<Metadata> {
  const { examId } = await params;
  const exam = basicExams.find((e) => e.id === examId);
  if (!exam) return { title: "AI合格診断｜過去問演習ラボ" };
  const short = exam.name.replace("試験", "");
  const title = `${short} AI合格診断｜10問でAIが合格可能性と弱点を診断`;
  const description = `本物の${exam.name}過去問10問で、AIがあなたの合格可能性スコアと最初に潰すべき弱点を診断。登録不要・約3分。診断後はそのまま弱点対策の学習へ。`;
  const ogImage = `/api/og/shindan?e=${examId}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/shindan/${examId}` },
    openGraph: { title, description, images: [ogImage] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default function ShindanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
