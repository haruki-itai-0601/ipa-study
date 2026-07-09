import type { Metadata } from "next";
import { getExam } from "@/lib/exams";

// 学習ハブ（/learn/[examId]）のSEOメタ。
// 現行試験は「学習ハブ」として /exam 系（過去問の顔ページ）とキーワードを食い合わない設計。
// 2027年新試験は /exam/[id] が /learn へリダイレクトされるため、ここが検索の入口になる。
// page.tsx は "use client" のため、メタデータはこの layout で付与する。
const META: Record<string, { title: string; description: string }> = {
  ip: {
    title: "ITパスポート試験の学習ハブ｜ステップ学習・過去問演習・復習・用語集（無料）",
    description:
      "ITパスポート試験対策の学習ハブ。分野別のステップ学習、本物の過去問2,900問の演習、間違えた問題の復習、用語集を無料で使えます。",
  },
  fe: {
    title: "基本情報技術者試験の学習ハブ｜ステップ学習・科目A/科目B演習・復習（無料）",
    description:
      "基本情報技術者試験対策の学習ハブ。分野別のステップ学習、科目Aの本物の過去問1,760問と科目B対策、間違えた問題の復習、用語集を無料で使えます。",
  },
  ap: {
    title: "応用情報技術者試験の学習ハブ｜ステップ学習・過去問演習・復習（無料）",
    description:
      "応用情報技術者試験対策の学習ハブ。分野別のステップ学習、午前の本物の過去問2,640問の演習、間違えた問題の復習、用語集を無料で使えます。",
  },
  sc: {
    title: "情報処理安全確保支援士試験の学習ハブ｜午前Ⅰ・午前Ⅱ過去問演習・復習（無料）",
    description:
      "情報処理安全確保支援士試験（登録セキスペ）対策の学習ハブ。午前Ⅰ（高度共通）720問と午前Ⅱ（専門）の本物の過去問を無料で演習できます。",
  },
  dm: {
    title: "データマネジメント試験（仮称）対策｜IPAサンプル問題を無料で演習【2027年開始の新試験】",
    description:
      "2027年開始予定の新試験「データマネジメント試験（仮称）」の対策ページ。IPA公表の科目Aサンプル問題を無料で演習できます。シラバス公開後はAI予想問題・学習コンテンツも提供予定。",
  },
  "pd-m": {
    title: "プロフェッショナルデジタルスキル（マネジメント）試験（仮称）対策｜過去問演習【2027年新試験】",
    description:
      "2027年開始予定の「プロフェッショナルデジタルスキル（マネジメント）試験（仮称）」の対策ページ。構成元のITストラテジスト・プロジェクトマネージャ・ITサービスマネージャ・システム監査技術者の本物の過去問で科目A対策ができます。",
  },
  "pd-d": {
    title: "プロフェッショナルデジタルスキル（データ・AI）試験（仮称）対策｜過去問演習【2027年新試験】",
    description:
      "2027年開始予定の「プロフェッショナルデジタルスキル（データ・AI）試験（仮称）」の対策ページ。構成元のデータベーススペシャリストの本物の過去問で科目A対策ができます。AI・データ分析の新領域はシラバス公開後に対応予定。",
  },
  "pd-s": {
    title: "プロフェッショナルデジタルスキル（システム）試験（仮称）対策｜過去問演習【2027年新試験】",
    description:
      "2027年開始予定の「プロフェッショナルデジタルスキル（システム）試験（仮称）」の対策ページ。構成元のシステムアーキテクト・ネットワークスペシャリスト・エンベデッドシステムスペシャリストの本物の過去問で科目A対策ができます。",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examId: string }>;
}): Promise<Metadata> {
  const { examId } = await params;
  const exam = getExam(examId);
  if (!exam) return { title: "過去問演習ラボ" };
  const m = META[examId] ?? {
    title: `${exam.name}の学習ハブ｜学習・演習・復習（無料）`,
    description: `${exam.name}のステップ学習・過去問演習・間違えた問題の復習・用語集をまとめた学習ハブです。無料で始められます。`,
  };
  return {
    title: { absolute: m.title },
    description: m.description,
    alternates: { canonical: `/learn/${examId}` },
    openGraph: {
      title: m.title,
      description: m.description,
      url: `/learn/${examId}`,
      images: [{ url: "/og.png", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: m.title, description: m.description, images: ["/og.png"] },
  };
}

export default function LearnHubLayout({ children }: { children: React.ReactNode }) {
  return children;
}
