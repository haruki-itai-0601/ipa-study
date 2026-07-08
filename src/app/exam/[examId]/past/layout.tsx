import type { Metadata } from "next";
import { getExam, sectionLabel } from "@/lib/exams";

// 午前系（過去問演習のモード選択）のSEOメタ。
// 「ITパスポート 過去問」「基本情報技術者試験 午前(科目A) 過去問」「応用情報 午前 過去問」等の検索を取る。
// page.tsx は "use client" のため、メタデータはこの layout で付与する。
function metaOf(examId: string): { title: string; description: string } {
  if (examId === "ip") {
    return {
      title: "ITパスポート試験 過去問演習｜年度別・分野別・模試（無料）",
      description:
        "ITパスポート試験の本物の過去問2,900問を無料で演習。年度別・ランダム・分野別・誤答復習・模試（タイマー）・AI予想問題の6モードで、スキマ時間に効率よく対策できます。",
    };
  }
  if (examId === "fe") {
    return {
      title: "基本情報技術者試験 科目A（午前）過去問演習｜年度別・分野別・模試（無料）",
      description:
        "基本情報技術者試験 科目A（旧 午前）の本物の過去問1,760問を無料で演習。年度別・ランダム・分野別・誤答復習・模試（タイマー）・AI予想問題の6モードで効率よく対策できます。",
    };
  }
  if (examId === "ap") {
    return {
      title: "応用情報技術者試験 午前 過去問演習｜年度別・分野別・模試（無料）",
      description:
        "応用情報技術者試験 午前の本物の過去問2,640問を無料で演習。年度別・ランダム・分野別・誤答復習・模試（タイマー）・AI予想問題の6モードで効率よく対策できます。",
    };
  }
  const exam = getExam(examId);
  const name = exam?.name ?? "情報処理技術者試験";
  const sec = sectionLabel(examId);
  return {
    title: `${name}${sec ? ` ${sec}` : ""} 過去問演習（無料）`,
    description: `${name}${sec ? `（${sec}）` : ""}の本物のIPA過去問を無料で演習。年度別・ランダム・分野別・誤答復習・模試から選べます。`,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examId: string }>;
}): Promise<Metadata> {
  const { examId } = await params;
  const exam = getExam(examId);
  if (!exam) return { title: "過去問演習ラボ" };
  const m = metaOf(examId);
  return {
    title: { absolute: m.title },
    description: m.description,
    alternates: { canonical: `/exam/${examId}/past` },
    openGraph: {
      title: m.title,
      description: m.description,
      url: `/exam/${examId}/past`,
      images: [{ url: "/og.png", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: m.title, description: m.description, images: ["/og.png"] },
  };
}

export default function PastLayout({ children }: { children: React.ReactNode }) {
  return children;
}
