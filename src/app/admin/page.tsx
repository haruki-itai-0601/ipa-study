"use client";

import { useState, useEffect, useCallback } from "react";
import { exams } from "@/lib/exams";
import { Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

type GenerateStatus = "idle" | "loading" | "done" | "error";

interface ExamState {
  status: GenerateStatus;
  message: string;
  count: number | null;
}

interface Question {
  id: string;
  category: string;
  question: string;
  difficulty: "easy" | "medium" | "hard";
  correct_answer: string;
  created_at: string;
}

const GENERATE_COUNT = 5;

const difficultyLabel: Record<string, { label: string; color: string }> = {
  easy: { label: "易", color: "text-green-600 bg-green-50" },
  medium: { label: "中", color: "text-yellow-600 bg-yellow-50" },
  hard: { label: "難", color: "text-red-600 bg-red-50" },
};

export default function AdminPage() {
  const [states, setStates] = useState<Record<string, ExamState>>(() =>
    Object.fromEntries(exams.map((e) => [e.id, { status: "idle", message: "", count: null }]))
  );
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const [expandedExam, setExpandedExam] = useState<string | null>(null);
  const [questionsByExam, setQuestionsByExam] = useState<Record<string, Question[]>>({});
  const [loadingQuestions, setLoadingQuestions] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    setIsLoadingCounts(true);
    try {
      const results = await Promise.all(
        exams.map(async (exam) => {
          const res = await fetch(`/api/questions/count?exam_id=${exam.id}&type=ai`);
          const data = await res.json();
          return { id: exam.id, count: data.count ?? 0 };
        })
      );
      setStates((prev) => {
        const next = { ...prev };
        results.forEach(({ id, count }) => {
          next[id] = { ...next[id], count };
        });
        return next;
      });
    } finally {
      setIsLoadingCounts(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const fetchQuestions = async (examId: string) => {
    setLoadingQuestions(examId);
    try {
      const res = await fetch(`/api/questions?exam_id=${examId}&type=ai&all=true`);
      const data = await res.json();
      setQuestionsByExam((prev) => ({ ...prev, [examId]: data.questions ?? [] }));
    } finally {
      setLoadingQuestions(null);
    }
  };

  const handleToggleExpand = (examId: string) => {
    if (expandedExam === examId) {
      setExpandedExam(null);
    } else {
      setExpandedExam(examId);
      if (!questionsByExam[examId]) {
        fetchQuestions(examId);
      }
    }
  };

  const handleGenerate = async (examId: string) => {
    setStates((prev) => ({
      ...prev,
      [examId]: { ...prev[examId], status: "loading", message: "" },
    }));

    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam_id: examId, count: GENERATE_COUNT }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "問題の生成に失敗しました");
      }

      // 件数を再取得
      const countRes = await fetch(`/api/questions/count?exam_id=${examId}&type=ai`);
      const countData = await countRes.json();

      setStates((prev) => ({
        ...prev,
        [examId]: {
          status: "done",
          message: `${data.saved_count}問生成完了`,
          count: countData.count ?? prev[examId].count,
        },
      }));

      // 展開中なら問題一覧を再取得
      if (expandedExam === examId) {
        fetchQuestions(examId);
      } else {
        // キャッシュをクリアして次回展開時に再取得させる
        setQuestionsByExam((prev) => {
          const next = { ...prev };
          delete next[examId];
          return next;
        });
      }
    } catch (err) {
      setStates((prev) => ({
        ...prev,
        [examId]: {
          ...prev[examId],
          status: "error",
          message: err instanceof Error ? err.message : "エラーが発生しました",
        },
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="w-full px-0">
        <div className="flex items-center justify-between mb-2 px-6">
          <h1 className="text-2xl font-bold text-gray-900">管理者ページ</h1>
          <button
            onClick={fetchCounts}
            disabled={isLoadingCounts}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingCounts ? "animate-spin" : ""}`} />
            更新
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-8 px-6">
          各試験のAI予想問題をDBに生成・保存します（{GENERATE_COUNT}問/回）
        </p>

        <div className="space-y-4">
          {exams.map((exam) => {
            const state = states[exam.id];
            const isLoading = state.status === "loading";
            const isExpanded = expandedExam === exam.id;
            const questions = questionsByExam[exam.id] ?? [];
            const isLoadingQ = loadingQuestions === exam.id;

            return (
              <div
                key={exam.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* メインカード */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {exam.shortName}
                      <span className="text-sm font-normal text-gray-500">{exam.name}</span>
                    </div>
                    <div className="text-sm text-gray-400 mt-0.5">
                      DB保存数：
                      {state.count === null ? (
                        <span className="text-gray-300">読込中...</span>
                      ) : (
                        <span className="font-semibold text-gray-700">{state.count}問</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {state.status === "done" && (
                      <span className="text-sm text-green-600 font-medium">
                        ✅ {state.message}
                      </span>
                    )}
                    {state.status === "error" && (
                      <span className="text-sm text-red-600 font-medium">
                        ❌ {state.message}
                      </span>
                    )}

                    <button
                      onClick={() => handleGenerate(exam.id)}
                      disabled={isLoading}
                      className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        "問題生成"
                      )}
                    </button>

                    {/* 展開ボタン */}
                    {(state.count ?? 0) > 0 && (
                      <button
                        onClick={() => handleToggleExpand(exam.id)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="問題一覧を表示"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* 問題一覧（展開時） */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {isLoadingQ ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">読込中...</span>
                      </div>
                    ) : questions.length === 0 ? (
                      <div className="text-center py-6 text-sm text-gray-400">問題がありません</div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {/* ヘッダー */}
                        <div className="grid grid-cols-[2rem_3rem_1fr_3rem] gap-3 px-6 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          <div>#</div>
                          <div className="text-center">難易度</div>
                          <div>シラバス参照 / 問題文</div>
                          <div className="text-center">一致</div>
                        </div>
                        {questions.map((q, i) => {
                          const diff = difficultyLabel[q.difficulty] ?? { label: q.difficulty, color: "text-gray-500 bg-gray-50" };
                          // シラバスカテゴリと完全一致・部分一致を確認
                          const exactMatch = exam.categories.find((cat) => cat === q.category);
                          const partialMatch = !exactMatch && exam.categories.find((cat) =>
                            q.category.includes(cat) || cat.includes(q.category)
                          );
                          const isMatched = !!(exactMatch || partialMatch);
                          return (
                            <div
                              key={q.id}
                              className="grid grid-cols-[2rem_3rem_1fr_3rem] gap-3 px-6 py-3 items-start hover:bg-gray-50 transition-colors"
                            >
                              <div className="text-xs text-gray-400 pt-0.5">{i + 1}</div>
                              <div className="flex justify-center pt-0.5">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${diff.color}`}>
                                  {diff.label}
                                </span>
                              </div>
                              <div>
                                <div className={`text-xs font-semibold mb-0.5 ${exactMatch ? "text-green-600" : partialMatch ? "text-yellow-600" : "text-gray-500"}`}>
                                  {q.category}
                                </div>
                                <div className="text-sm text-gray-700 leading-snug line-clamp-2">{q.question}</div>
                              </div>
                              <div className="flex justify-center pt-0.5 text-base">
                                {exactMatch ? "✅" : partialMatch ? "🟡" : "❓"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
