import type { Metadata } from "next";
import Link from "next/link";
import { basicExams, displayCategory, learnCategoryGroups } from "@/lib/exams";
import { ArrowRight, Brain } from "lucide-react";

// AI合格診断のシェア用着地ページ。/shindan/[examId]/r?s=40&w=セキュリティ
// Xカードにスコア入りのOGP画像（/api/og/shindan）を焼き込み、訪問者を診断本体へ誘導する。
// パラメータ次第で内容が変わるページなので検索インデックスはさせない。

const CATEGORY_WHITELIST = new Set<string>([
  ...basicExams.flatMap((e) => e.categories),
  ...Object.values(learnCategoryGroups).flatMap((groups) => groups.flatMap((g) => g.categories)),
]);

type Props = {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ s?: string; w?: string }>;
};

function parse(examId: string, s?: string, w?: string) {
  const exam = basicExams.find((e) => e.id === examId);
  const score = Math.max(0, Math.min(100, parseInt(s ?? "0", 10) || 0));
  const weak = w && CATEGORY_WHITELIST.has(w) ? w : "";
  const band = score >= 65 ? "合格圏" : score >= 40 ? "あと少し" : "要対策";
  return { exam, score, weak, band };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { examId } = await params;
  const sp = await searchParams;
  const { exam, score, weak, band } = parse(examId, sp.s, sp.w);
  const short = exam ? exam.name.replace("試験", "") : "";
  const title = `${short} AI合格診断の結果：スコア ${score}/100（${band}）`;
  const description = `${weak ? `最大の弱点は「${displayCategory(examId, weak)}」。` : ""}あなたも10問・約3分・登録不要で診断できます。`;
  const ogImage = `/api/og/shindan?e=${examId}&s=${score}${weak ? `&w=${encodeURIComponent(weak)}` : ""}`;
  return {
    title: { absolute: title },
    description,
    robots: { index: false },
    openGraph: { title, description, images: [ogImage] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function ShindanSharePage({ params, searchParams }: Props) {
  const { examId } = await params;
  const sp = await searchParams;
  const { exam, score, weak, band } = parse(examId, sp.s, sp.w);
  const bandColor = score >= 65 ? "#0F8A5F" : score >= 40 ? "#B45309" : "#BE123C";

  return (
    <div style={{ background: "#F5F7FA", color: "#15202E", minHeight: "100vh" }} className="flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-md py-10 text-center">
        <div className="rounded-3xl px-6 py-8 text-white" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
          <div className="text-[13px] font-bold text-white/85">{exam ? exam.name : "情報処理技術者試験"}・AI合格診断</div>
          <div className="mt-2 flex items-end justify-center gap-1">
            <span className="text-[60px] font-bold leading-none">{score}</span>
            <span className="mb-1.5 text-[19px] text-white/80">/100</span>
          </div>
          <span className="mt-3 inline-block rounded-full px-4 py-1.5 text-[14.5px] font-bold" style={{ background: "rgba(255,255,255,0.92)", color: bandColor }}>
            {band}
          </span>
          {weak && (
            <p className="mt-3 text-[13.5px] text-white/90">
              最大の弱点：「{displayCategory(examId, weak)}」
            </p>
          )}
        </div>
        <p className="mt-5 text-[14px] leading-relaxed" style={{ color: "#677488" }}>
          この結果は、本物の過去問10問によるAI診断です。
          <br />
          あなたの合格可能性と弱点も、3分でわかります。
        </p>
        <Link
          href={`/shindan/${exam ? examId : "fe"}`}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-[16px] font-bold text-white transition-transform hover:-translate-y-0.5"
          style={{ background: "#1D4ED8" }}
        >
          <Brain className="h-5 w-5" /> 自分も診断する（登録不要） <ArrowRight className="h-5 w-5" />
        </Link>
        <Link href="/" className="mt-4 inline-block text-[12.5px] font-bold" style={{ color: "#1D4ED8" }}>
          過去問演習ラボとは →
        </Link>
      </div>
    </div>
  );
}
