"use client";

import { useState, useEffect } from "react";
import { getExam, questionSource, displayCategory } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { fetchAllRows } from "@/lib/supabase-fetch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, RotateCcw, CheckCircle, Lightbulb } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Question } from "@/components/quiz-runner";
import { BackToDashboard } from "@/components/back-to-dashboard";

const optionLabels: Record<string, string> = { a: "ア", b: "イ", c: "ウ", d: "エ" };

type StudyItem = Question & { wrong: boolean; attempted: boolean };

export default function StudyPage() {
  const params = useParams();
  const examId = params.examId as string;
  const exam = getExam(examId);

  const [category, setCategory] = useState<string>("");
  const [items, setItems] = useState<StudyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const cat = sp.get("category") ?? "";
    setCategory(cat);

    async function load() {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();

      // この分野の問題（1000行超でも全件取得）
      const qs = await fetchAllRows<Question>((from, to) =>
        supabase
          .from("questions")
          .select("*")
          .eq("exam_id", examId)
          .eq("type", "past")
          .eq("category", cat)
          .order("id")
          .range(from, to)
      );

      // この区分の解答履歴（正誤）
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const wrongIds = new Set<string>();
      const attemptedIds = new Set<string>();
      if (user) {
        const prog = await fetchAllRows<{ question_id: string; is_correct: boolean }>((from, to) =>
          supabase
            .from("user_progress")
            .select("question_id, is_correct")
            .eq("user_id", user.id)
            .eq("exam_id", examId)
            .order("answered_at", { ascending: false })
            .range(from, to)
        );
        prog.forEach((p) => {
          attemptedIds.add(p.question_id);
          if (!p.is_correct) wrongIds.add(p.question_id);
        });
        // 後で正解した問題は「間違えた」から除外
        prog.forEach((p) => {
          if (p.is_correct) wrongIds.delete(p.question_id);
        });
      }

      const list: StudyItem[] = (qs ?? []).map((q) => ({
        ...q,
        wrong: wrongIds.has(q.id),
        attempted: attemptedIds.has(q.id),
      }));
      // 並び順: 間違えた → 未着手 → 正解済み
      list.sort((a, b) => {
        const rank = (x: StudyItem) => (x.wrong ? 0 : !x.attempted ? 1 : 2);
        return rank(a) - rank(b);
      });
      setItems(list);
      setLoading(false);
    }
    load();
  }, [examId]);

  if (!exam) return null;

  const wrongCount = items.filter((i) => i.wrong).length;
  const total = items.length;

  return (
    <div className="min-h-screen">
      <header className="bg-white/70 backdrop-blur-xl border-b border-gray-200/70 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="min-w-0">
            <div className="text-sm text-gray-500">{exam.name}</div>
            <div className="font-bold text-gray-900 truncate">{displayCategory(examId, category)}</div>
          </div>
          <BackToDashboard className="ml-auto" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-5">
        {/* この分野をどうする？選択 */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">この分野を復習しましょう</h2>
          <p className="text-sm text-gray-500 mb-4">
            {wrongCount > 0
              ? `この分野で ${wrongCount}問 間違えています。解説で学ぶか、解き直すか選べます。`
              : "解説で要点を確認するか、問題を解いて力試しできます。"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* 解説で学ぶ（このページ） */}
            <div className="border-2 border-violet-300 bg-violet-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-violet-600 rounded-lg p-1.5">
                  <Lightbulb className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gray-900 text-sm">解説で学ぶ</span>
              </div>
              <p className="text-xs text-gray-500">下に解説を表示中</p>
            </div>
            {/* 解き直す */}
            <Link
              href={
                wrongCount > 0
                  ? `/exam/${examId}/past?mode=category&category=${encodeURIComponent(category)}&wrong=1`
                  : `/exam/${examId}/past?mode=category&category=${encodeURIComponent(category)}`
              }
              className="border-2 border-indigo-300 bg-white rounded-xl p-4 hover:bg-indigo-50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-indigo-600 rounded-lg p-1.5">
                  <RotateCcw className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gray-900 text-sm">
                  {wrongCount > 0 ? "間違えた問題を解く" : "問題を解く"}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {wrongCount > 0 ? "演習モード（誤答回答）へ →" : "演習モード（この分野を解く）へ →"}
              </p>
            </Link>
          </div>
        </div>

        {/* 解説フィード */}
        <div className="border-t border-gray-200 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-violet-500" />
            <h3 className="font-semibold text-gray-700">解説で学ぶ（{total}問）</h3>
          </div>

          {loading ? (
            <div className="text-center text-gray-400 py-12">読み込み中...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-gray-400 py-12">この分野の問題が見つかりませんでした。</div>
          ) : (
            <div className="space-y-4">
              {items.map((q) => (
                <Card key={q.id} className="border-0 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      {q.wrong && (
                        <Badge className="bg-red-100 text-red-700 text-xs">要復習</Badge>
                      )}
                      <span className="text-xs text-gray-400">{q.year}</span>
                    </div>

                    <p className="text-base leading-relaxed text-gray-900">{q.question}</p>

                    {/* 正解 */}
                    <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-green-700 mb-0.5">
                          正解 {optionLabels[q.correct_answer]}
                        </div>
                        <div className="text-sm text-gray-800">
                          {q[`option_${q.correct_answer}` as keyof Question] as string}
                        </div>
                      </div>
                    </div>

                    {/* 解説 */}
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>
                    </div>

                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      ※この解説はIPA公式の解答解説ではなく、本サービスが独自に作成したものです。
                    </p>

                    {/* 出典 */}
                    <p className="text-xs text-gray-400">{questionSource(examId, q.year, q.q_number)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
