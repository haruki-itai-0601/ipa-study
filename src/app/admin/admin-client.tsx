"use client";

import { useState, useEffect } from "react";
import { exams } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

type Question = {
  id: string;
  exam_id: string;
  type: "past" | "ai";
  category: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "a" | "b" | "c" | "d";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  year: string | null;
};

type QuestionStat = {
  question_id: string;
  total_answers: number;
  correct_answers: number;
};

const difficultyLabel: Record<string, { label: string; color: string }> = {
  easy: { label: "易", color: "bg-green-100 text-green-700" },
  medium: { label: "中", color: "bg-yellow-100 text-yellow-700" },
  hard: { label: "難", color: "bg-red-100 text-red-700" },
};

const optionLabels: Record<string, string> = { a: "ア", b: "イ", c: "ウ", d: "エ" };

function AccuracyBadge({ total, correct }: { total: number; correct: number }) {
  if (total === 0) {
    return <span className="text-xs text-gray-300">未回答</span>;
  }
  const rate = Math.round((correct / total) * 100);
  const color =
    rate >= 70 ? "text-green-600 bg-green-50" :
    rate >= 40 ? "text-yellow-600 bg-yellow-50" :
                 "text-red-600 bg-red-50";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {rate}% ({correct}/{total})
    </span>
  );
}

export default function AdminClient() {
  const [selectedExamId, setSelectedExamId] = useState(exams[0].id);
  const [selectedType, setSelectedType] = useState<"past" | "ai">("past");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<Record<string, QuestionStat>>({});
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setExpandedId(null);
      const supabase = createSupabaseBrowserClient();

      const [{ data: qData }, { data: sData }] = await Promise.all([
        supabase
          .from("questions")
          .select("*")
          .eq("exam_id", selectedExamId)
          .eq("type", selectedType)
          .order("category")
          .order("created_at"),
        supabase.rpc("get_question_stats"),
      ]);

      setQuestions(qData ?? []);
      setStats(
        Object.fromEntries(
          (sData ?? []).map((s: QuestionStat) => [s.question_id, s])
        )
      );
      setLoading(false);
    }
    fetchData();
  }, [selectedExamId, selectedType]);

  // カテゴリごとにグループ化
  const grouped = questions.reduce<Record<string, Question[]>>((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {});

  const exam = exams.find((e) => e.id === selectedExamId)!;

  // 選択中の試験・種別の正解率サマリー
  const statsForCurrent = questions.map((q) => stats[q.id]).filter(Boolean);
  const totalAnswers = statsForCurrent.reduce((s, st) => s + Number(st.total_answers), 0);
  const totalCorrect = statsForCurrent.reduce((s, st) => s + Number(st.correct_answers), 0);
  const overallRate = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : null;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">管理画面 — 問題ブラウザ</h1>

        {/* 試験区分タブ */}
        <div className="flex flex-wrap gap-2 mb-4">
          {exams.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelectedExamId(e.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                selectedExamId === e.id
                  ? `bg-gradient-to-r ${e.color} text-white`
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {e.shortName}
            </button>
          ))}
        </div>

        {/* 種別タブ + サマリー */}
        <div className="flex items-center gap-3 mb-6">
          {(["past", "ai"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                selectedType === t
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t === "past" ? "📚 過去問" : "✨ AI予想問題"}
            </button>
          ))}
          {!loading && (
            <div className="ml-auto flex items-center gap-3 text-sm text-gray-500">
              <span>{questions.length} 問</span>
              {overallRate !== null && (
                <span className="flex items-center gap-1">
                  平均正解率
                  <span
                    className={`font-bold ${
                      overallRate >= 70 ? "text-green-600" :
                      overallRate >= 40 ? "text-yellow-600" : "text-red-600"
                    }`}
                  >
                    {overallRate}%
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* 問題一覧 */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            読み込み中...
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-20 text-gray-400">問題がありません</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, qs]) => {
              // カテゴリの正解率
              const catStats = qs.map((q) => stats[q.id]).filter(Boolean);
              const catTotal = catStats.reduce((s, st) => s + Number(st.total_answers), 0);
              const catCorrect = catStats.reduce((s, st) => s + Number(st.correct_answers), 0);
              const catRate = catTotal > 0 ? Math.round((catCorrect / catTotal) * 100) : null;

              return (
                <div key={category}>
                  {/* カテゴリヘッダー */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-bold ${exam.textColor}`}>{category}</span>
                    <span className="text-xs text-gray-400">{qs.length}問</span>
                    {catRate !== null && (
                      <span className={`text-xs font-semibold ml-1 ${
                        catRate >= 70 ? "text-green-600" :
                        catRate >= 40 ? "text-yellow-600" : "text-red-600"
                      }`}>
                        正解率 {catRate}%
                      </span>
                    )}
                  </div>

                  {/* 問題カード */}
                  <div className="space-y-2">
                    {qs.map((q, i) => {
                      const diff = difficultyLabel[q.difficulty] ?? { label: q.difficulty, color: "bg-gray-100 text-gray-600" };
                      const isExpanded = expandedId === q.id;
                      const st = stats[q.id];

                      return (
                        <div
                          key={q.id}
                          className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                        >
                          {/* 問題ヘッダー（クリックで展開） */}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : q.id)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-xs text-gray-400 flex-shrink-0 pt-0.5 w-5">
                                {i + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${diff.color}`}>
                                    {diff.label}
                                  </span>
                                  {q.year && (
                                    <span className="text-xs text-gray-400">{q.year}</span>
                                  )}
                                  <AccuracyBadge
                                    total={st ? Number(st.total_answers) : 0}
                                    correct={st ? Number(st.correct_answers) : 0}
                                  />
                                </div>
                                <p className="text-sm text-gray-800 leading-snug line-clamp-2">
                                  {q.question}
                                </p>
                              </div>
                              <span className="text-gray-300 flex-shrink-0">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </span>
                            </div>
                          </button>

                          {/* 展開: 選択肢・正解・解説 */}
                          {isExpanded && (
                            <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-3">
                              {/* 選択肢 */}
                              <div className="space-y-1.5">
                                {(["a", "b", "c", "d"] as const).map((key) => (
                                  <div
                                    key={key}
                                    className={`flex gap-2 text-sm rounded-lg px-3 py-2 ${
                                      key === q.correct_answer
                                        ? "bg-green-100 text-green-800 font-medium"
                                        : "bg-white text-gray-700"
                                    }`}
                                  >
                                    <span className="font-bold flex-shrink-0">
                                      {optionLabels[key]}
                                    </span>
                                    <span>{q[`option_${key}` as keyof Question] as string}</span>
                                    {key === q.correct_answer && (
                                      <span className="ml-auto flex-shrink-0 text-green-600 text-xs font-bold">✓ 正解</span>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* 解説 */}
                              <div className="text-sm text-gray-600 leading-relaxed bg-white rounded-lg px-3 py-2 border border-gray-100">
                                <span className="font-semibold text-gray-700">解説：</span>
                                {q.explanation}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
