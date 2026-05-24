"use client";

import { useState, useEffect, useCallback } from "react";
import { exams } from "@/lib/exams";
import { Loader2, RefreshCw } from "lucide-react";

type GenerateStatus = "idle" | "loading" | "done" | "error";

interface ExamState {
  status: GenerateStatus;
  message: string;
  count: number | null;
}

const GENERATE_COUNT = 5;

export default function AdminPage() {
  const [states, setStates] = useState<Record<string, ExamState>>(() =>
    Object.fromEntries(exams.map((e) => [e.id, { status: "idle", message: "", count: null }]))
  );
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

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

  const handleGenerate = async (examId: string, examShortName: string) => {
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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
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
        <p className="text-sm text-gray-500 mb-8">
          各試験のAI予想問題をDBに生成・保存します（{GENERATE_COUNT}問/回）
        </p>

        <div className="space-y-4">
          {exams.map((exam) => {
            const state = states[exam.id];
            const isLoading = state.status === "loading";

            return (
              <div
                key={exam.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{exam.shortName}　<span className="text-sm font-normal text-gray-500">{exam.name}</span></div>
                  <div className="text-sm text-gray-400 mt-0.5">
                    DB保存数：
                    {state.count === null ? (
                      <span className="text-gray-300">読込中...</span>
                    ) : (
                      <span className="font-semibold text-gray-700">{state.count}問</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
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
                    onClick={() => handleGenerate(exam.id, exam.shortName)}
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
