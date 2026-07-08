import { getExam, examGroupLabel, sectionLabel } from "@/lib/exams";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, BookOpen, Zap, ArrowLeft, Target, TrendingUp, FileText, PenLine, Sparkles, ChevronRight, Mountain, BookA, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BackToDashboard } from "@/components/back-to-dashboard";

// 試験ごとの検索向けメタデータ（タイトル・説明）。
// 各ページを「ITパスポート専門」「応用情報専門」として検索エンジンに認識させるための要。
const META: Record<string, { title: string; description: string }> = {
  ip: {
    title: "ITパスポート過去問 全2,900問が無料｜AIで弱点分析｜過去問演習ラボ",
    description:
      "ITパスポートの本物の過去問2,900問を無料で演習。AIがあなたの弱点分野を自動で分析し、最短ルートで合格へ。スマホで快適に解ける過去問演習ラボ。",
  },
  fe: {
    title: "基本情報技術者 過去問（科目A）1,760問が無料｜AI弱点分析｜過去問演習ラボ",
    description:
      "基本情報技術者試験 科目Aの過去問1,760問を無料で演習。AIが分野ごとの弱点を分析して効率的に対策できる、スマホ対応の過去問演習ラボ。",
  },
  ap: {
    title: "応用情報 過去問＋午後記述AI採点｜午前2,640問が無料｜過去問演習ラボ",
    description:
      "応用情報技術者試験の午前過去問2,640問が無料。さらに自己採点が難しい午後（記述式）をAIが○△×＋講評で採点。令和3〜7年度に対応した過去問演習ラボ。",
  },
};

// 試験ごとのヒーロー（専門サイトの顔）コピー。
const LANDING: Record<string, { h1: string; lead: string; facts: string[] }> = {
  ip: {
    h1: "ITパスポート 過去問演習",
    lead: "本物の過去問2,900問が、すべて無料。AIがあなたの弱点分野を自動で見つけ、合格までの最短ルートを示します。",
    facts: ["過去問 2,900問", "すべて無料", "AIが弱点を分析"],
  },
  fe: {
    h1: "基本情報技術者 過去問演習",
    lead: "科目Aの本物の過去問1,760問が無料。AIが分野ごとの弱点を分析し、効率よく合格力を伸ばします。",
    facts: ["科目A 1,760問", "すべて無料", "AIが弱点を分析"],
  },
  ap: {
    h1: "応用情報 過去問＋午後の記述をAI採点",
    lead: "午前の過去問2,640問が無料。さらに、自分では採点しづらい午後（記述式）を、AIが○△×＋講評で採点。令和3〜7年度・981設問に対応しています。",
    facts: ["午前 2,640問 無料", "午後の記述をAI採点", "令和3〜7年度対応"],
  },
};

function metaOf(examId: string) {
  const exam = getExam(examId);
  return (
    META[examId] ?? {
      title: `${exam?.name ?? "過去問演習"}｜過去問演習ラボ`,
      description: `${exam?.name ?? ""}の過去問を演習。${exam?.description ?? ""}。AIによる弱点分析にも対応した過去問演習ラボ。`,
    }
  );
}

function landingOf(examId: string) {
  const exam = getExam(examId);
  return (
    LANDING[examId] ?? {
      h1: `${exam?.name ?? "過去問演習"}`,
      lead: `${exam?.description ?? "本物の過去問で本番対策"}。AIが弱点分野の分析もサポートします。`,
      facts: ["本物の過去問", "AIが弱点を分析"],
    }
  );
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
    alternates: { canonical: `/exam/${examId}` },
    openGraph: {
      title: m.title,
      description: m.description,
      url: `/exam/${examId}`,
      images: [{ url: "/og.png", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: m.title, description: m.description, images: ["/og.png"] },
  };
}

export default async function ExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const exam = getExam(examId);
  if (!exam) notFound();
  const sec = sectionLabel(examId);
  const m = metaOf(examId);
  const land = landingOf(examId);

  return (
    <div className="min-h-screen">
      {/* この試験ページの構造化データ（検索エンジンに「特定試験の講座ページ」と伝える） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Course",
            name: `${exam.name} 過去問演習`,
            description: m.description,
            url: `https://kakomon-labo.com/exam/${examId}`,
            provider: {
              "@type": "Organization",
              name: "過去問演習ラボ",
              url: "https://kakomon-labo.com",
            },
          }),
        }}
      />

      {/* ヘッダー */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-gray-200/70 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <div className={`bg-gradient-to-br ${exam.color} rounded-xl w-10 h-10 flex items-center justify-center`}>
              <span className={`text-white font-bold leading-none whitespace-nowrap ${exam.shortName.length > 2 ? "text-[10px]" : "text-sm"}`}>{exam.shortName}</span>
            </div>
            <div>
              <div className="text-sm text-gray-500">{examGroupLabel(examId)}</div>
              <div className="font-bold text-gray-900 text-lg">{exam.name}</div>
            </div>
          </div>
          <BackToDashboard className="ml-auto" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* 試験ごとの専用ヒーロー（専門サイトの顔） */}
        <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${exam.color} px-6 py-6 md:px-9 md:py-8 shadow-rich-lg`}>
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-12 left-1/4 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative text-white">
            <div className="text-xs md:text-sm font-medium text-white/85">
              {examGroupLabel(examId)}{sec ? ` ・ ${sec}` : ""}
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold leading-snug">{land.h1}</h1>
            <p className="mt-2 max-w-2xl text-sm md:text-base leading-relaxed text-white/90">{land.lead}</p>
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {land.facts.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs md:text-sm font-semibold text-white backdrop-blur-sm"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                href={`/exam/${examId}/past`}
                className={`inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm md:text-base font-bold ${exam.textColor} shadow-md shadow-black/15 hover:-translate-y-0.5 hover:shadow-lg transition-all`}
              >
                過去問を解く（無料）
                <ChevronRight className="w-5 h-5" />
              </Link>
              {examId === "ap" && (
                <Link
                  href={`/exam/${examId}/pm`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-5 py-2.5 text-sm md:text-base font-bold text-white ring-1 ring-inset ring-white/50 backdrop-blur-sm hover:bg-white/25 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  午後の記述をAI採点
                </Link>
              )}
              {examId === "fe" && (
                <Link
                  href={`/exam/${examId}/b`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-5 py-2.5 text-sm md:text-base font-bold text-white ring-1 ring-inset ring-white/50 backdrop-blur-sm hover:bg-white/25 transition-all"
                >
                  <FileText className="w-4 h-4" />
                  科目B（午後）を解く
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* 学習・復習する（用語・概念の学習と間違い復習。学習コンテンツがある試験のみ表示） */}
        {["ip", "fe", "ap"].includes(examId) && (
          <section>
            <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
              学習・復習する
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Link href={`/learn/${examId}`}>
                <Card className="group border border-sky-200 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl p-2.5 shadow-md shadow-sky-500/30 group-hover:scale-105 transition-transform">
                        <Mountain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">ステップで学習</div>
                        <div className="text-xs text-gray-500">山道を登りながら、学んで解いて進む</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href={`/learn/glossary?exam=${examId}`}>
                <Card className="group border border-teal-200 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl p-2.5 shadow-md shadow-teal-500/30 group-hover:scale-105 transition-transform">
                        <BookA className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">用語集</div>
                        <div className="text-xs text-gray-500">試験に出る用語を検索・確認</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href={`/learn/${examId}/review`}>
                <Card className="group border border-rose-200 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl p-2.5 shadow-md shadow-rose-500/30 group-hover:scale-105 transition-transform">
                        <RotateCcw className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">間違い復習</div>
                        <div className="text-xs text-gray-500">間違えた問題を解き直して克服</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>
        )}

        {/* 演習モード選択 */}
        <section>
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            演習する
          </h2>
          <div className={`grid grid-cols-1 gap-4 ${examId === "am1" ? "" : "md:grid-cols-2"}`}>

            {/* 過去問演習 */}
            <Link href={`/exam/${examId}/past`}>
              <Card className="group border border-indigo-200 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl p-2.5 shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg">過去問演習</div>
                      <div className="text-sm text-gray-500">IPA公式の本物の過去問{sec ? `（${sec}）` : ""}を解く</div>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      実際の試験問題で本番対策
                    </li>
                    <li className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      出題傾向をつかむ
                    </li>
                  </ul>
                  <div className="mt-4 text-xs text-gray-400">出典：IPA（独立行政法人情報処理推進機構）情報処理技術者試験・情報処理安全確保支援士試験</div>
                </CardContent>
              </Card>
            </Link>

            {/* AI予想問題演習（午前Ⅰは対象外） */}
            {examId !== "am1" && (
            <Link href={`/exam/${examId}/ai`}>
              <Card className="group border border-amber-200 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-2.5 shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg">AI予想問題演習</div>
                      <div className="text-sm text-gray-500">AIが生成した予想問題を解く</div>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      IPAシラバスをベースに無限生成
                    </li>
                    <li className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      苦手分野を重点的に対策
                    </li>
                  </ul>
                  <div className="mt-4 text-xs text-gray-400">IPAシラバスより作成したオリジナル予想問題</div>
                </CardContent>
              </Card>
            </Link>
            )}

          </div>

          {/* 午後問題（応用情報のみ・記述式。午前とは別枠で下に配置） */}
          {examId === "ap" && (
            <div className="mt-5">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-sm font-bold text-violet-700 whitespace-nowrap">午後問題（記述式）・AI採点</span>
                <span className="hidden sm:inline text-xs text-gray-400 whitespace-nowrap">この道場ならではの機能</span>
                <div className="flex-1 h-px bg-gradient-to-r from-violet-200 to-transparent" />
              </div>
              <Link href={`/exam/${examId}/pm`} className="block">
                <Card className="group border border-violet-200 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl p-2.5 shadow-md shadow-violet-500/30 group-hover:scale-105 transition-transform">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-lg">午後問題をAIが採点</span>
                          <span className="text-[10px] font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full px-2 py-0.5">NEW</span>
                        </div>
                        <div className="text-sm text-gray-500">本物の午後問題（記述式）に挑戦＝AIが採点</div>
                      </div>
                    </div>
                    <ul className="space-y-1.5 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-500 flex-shrink-0" />
                        記述の答案をAIが<span className="font-semibold text-gray-700">○△×＋講評</span>で採点
                      </li>
                      <li className="flex items-center gap-2">
                        <PenLine className="w-4 h-4 text-violet-500 flex-shrink-0" />
                        問1〜問11を本番の形式そのままで（令和3〜7年度）
                      </li>
                      <li className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-violet-500 flex-shrink-0" />
                        公式解答例つき。自分で採点しづらい記述まで対策
                      </li>
                    </ul>
                    <div className="mt-4 text-xs text-gray-400">出典：IPA（独立行政法人情報処理推進機構）応用情報技術者試験 午後問題・解答例</div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}

          {/* 科目B（基本情報のみ・午後相当。プログラミング＋情報セキュリティの多肢選択） */}
          {examId === "fe" && (
            <div className="mt-5">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-sm font-bold text-violet-700 whitespace-nowrap">科目B（午後）・プログラミング＆セキュリティ</span>
                <span className="hidden sm:inline text-xs text-gray-400 whitespace-nowrap">IPA公式問題で演習</span>
                <div className="flex-1 h-px bg-gradient-to-r from-violet-200 to-transparent" />
              </div>
              <Link href={`/exam/${examId}/b`} className="block">
                <Card className="group border border-violet-200 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl p-2.5 shadow-md shadow-violet-500/30 group-hover:scale-105 transition-transform">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-lg">科目Bを解く</span>
                          <span className="text-[10px] font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full px-2 py-0.5">NEW</span>
                        </div>
                        <div className="text-sm text-gray-500">擬似言語のアルゴリズム＋情報セキュリティ（多肢選択）</div>
                      </div>
                    </div>
                    <ul className="space-y-1.5 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-violet-500 flex-shrink-0" />
                        IPA公式のサンプル問題・公開問題で演習（無料）
                      </li>
                      <li className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-violet-500 flex-shrink-0" />
                        本番形式の多肢選択を自動採点
                      </li>
                    </ul>
                    <div className="mt-4 text-xs text-gray-400">出典：IPA（独立行政法人情報処理推進機構）基本情報技術者試験 科目B サンプル問題・公開問題</div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}
        </section>

        {/* 出題カテゴリ */}
        <section>
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            出題カテゴリ
          </h2>
          <div className="flex flex-wrap gap-2">
            {exam.categories.map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className={`text-sm px-3 py-1 ${exam.textColor} ${exam.badgeBg}`}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
