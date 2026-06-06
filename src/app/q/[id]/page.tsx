import { createClient } from "@supabase/supabase-js";
import { getExam, questionSource } from "@/lib/exams";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Lightbulb, ChevronRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const optionLabels: Record<string, string> = { a: "ア", b: "イ", c: "ウ", d: "エ" };

type Question = {
  id: string;
  exam_id: string;
  category: string;
  year: string;
  q_number: number | null;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "a" | "b" | "c" | "d";
  explanation: string;
};

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
  if (!q) return { title: "問題が見つかりません｜高度情報処理 過去問道場" };
  const exam = getExam(q.exam_id);
  const title = `【今日の1問】${exam?.name ?? ""} ${q.year}｜高度情報処理 過去問道場`;
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
  const options: Record<string, string> = {
    a: q.option_a,
    b: q.option_b,
    c: q.option_c,
    d: q.option_d,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <div className="text-sm text-gray-500">今日の1問</div>
            <div className="font-bold text-gray-900">{exam?.name ?? "過去問"}</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-4">
        {/* メタ */}
        <div className="flex flex-wrap items-center gap-2">
          {exam && (
            <Badge variant="secondary" className={`text-sm ${exam.textColor} ${exam.badgeBg}`}>
              {q.category}
            </Badge>
          )}
          <span className="text-sm text-gray-400">{q.year}</span>
        </div>

        {/* 問題 */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-base leading-relaxed text-gray-900">{q.question}</p>
          </CardContent>
        </Card>

        {/* 選択肢（正解をハイライト） */}
        <div className="space-y-3">
          {(Object.entries(options) as [string, string][]).map(([key, value]) => {
            const isCorrect = key === q.correct_answer;
            return (
              <div
                key={key}
                className={`w-full text-left border-2 rounded-xl p-4 ${
                  isCorrect ? "border-green-400 bg-green-50" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`font-bold text-base flex-shrink-0 w-6 ${isCorrect ? "text-green-600" : "text-gray-400"}`}>
                    {optionLabels[key]}
                  </span>
                  <span className="text-base text-gray-800 leading-relaxed">{value}</span>
                  {isCorrect && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-auto" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* 正解＋解説 */}
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-bold text-green-700 text-base">
                正解：{optionLabels[q.correct_answer]}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-base text-gray-700 leading-relaxed">{q.explanation}</p>
            </div>
            <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
              ※この解説はIPA公式の解答解説ではなく、本サービスが独自に作成したものです。
            </p>
          </CardContent>
        </Card>

        {/* 出典 */}
        <p className="text-xs text-gray-400">{questionSource(q.exam_id, q.year, q.q_number)}</p>

        {/* 演習への導線 */}
        <Link
          href={`/exam/${q.exam_id}/past`}
          className="block bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 hover:from-indigo-600 hover:to-indigo-700 transition-colors"
        >
          <div className="flex items-center gap-3 text-white">
            <BookOpen className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-bold">{exam?.name ?? ""}の対策をもっと</div>
              <div className="text-sm text-indigo-100">本物の過去問2,200問超を無料で演習</div>
            </div>
            <ChevronRight className="w-6 h-6 flex-shrink-0" />
          </div>
        </Link>

        <div className="text-center pt-2">
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold">
            高度情報処理 過去問道場トップへ →
          </Link>
        </div>
      </main>
    </div>
  );
}
