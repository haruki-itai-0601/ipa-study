import { createClient } from "@supabase/supabase-js";
import { getExam } from "@/lib/exams";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SingleQuestion, { type SingleQ } from "@/components/single-question";
import { BackToDashboard } from "@/components/back-to-dashboard";

type Question = SingleQ;

// 問題内容は静的なので1日キャッシュ（ISR）。表示高速化＆1万ページのクロール効率向上
// 空配列を返すことで「初回アクセス時に生成→以降キャッシュ」になる（ビルド時は生成しない）
export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getQuestion(id: string): Promise<Question | null> {
  // UUID形式でなければ即無効
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) return null;
  const { data } = await sb().from("questions").select("*").eq("id", id).maybeSingle();
  return (data as Question) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const q = await getQuestion(id);
  if (!q) return { title: "問題が見つかりません｜過去問演習ラボ" };
  const exam = getExam(q.exam_id);
  const title = `【今日の1問】${exam?.name ?? ""} ${q.year}｜過去問演習ラボ`;
  const description = q.question.slice(0, 110);
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
  };
}

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await getQuestion(id);
  if (!q) notFound();
  const exam = getExam(q.exam_id);

  // 構造化データ（Quiz/Question）：1万ページのロングテールSEO＆AIの引用対象になりやすくする
  const opts: Record<string, string | null | undefined> = {
    a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d,
  };
  const correctText = opts[(q.correct_answer ?? "").toLowerCase()] ?? "";
  const suggested = (["a", "b", "c", "d"] as const)
    .filter((k) => opts[k])
    .map((k, i) => ({ "@type": "Answer", position: i, text: String(opts[k]) }));
  const quizLd = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    about: { "@type": "Thing", name: `${exam?.name ?? "情報処理技術者試験"} ${q.year}` },
    hasPart: {
      "@type": "Question",
      eduQuestionType: "Multiple choice",
      text: q.question,
      ...(suggested.length ? { suggestedAnswer: suggested } : {}),
      acceptedAnswer: {
        "@type": "Answer",
        text: correctText + (q.explanation ? `。${q.explanation}` : ""),
      },
    },
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(quizLd) }}
      />
      <header className="bg-white/70 backdrop-blur-xl border-b border-gray-200/70 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <div className="text-sm text-gray-500">今日の1問</div>
            <div className="font-bold text-gray-900">{exam?.name ?? "過去問"}</div>
          </div>
          <BackToDashboard className="ml-auto" />
        </div>
      </header>

      <SingleQuestion q={q} />
    </div>
  );
}
