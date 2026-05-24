"use client";

import { useState } from "react";
import { exams } from "@/lib/exams";
import { Loader2 } from "lucide-react";

type GenerateStatus = "idle" | "loading" | "done" | "error";

interface ExamState {
  status: GenerateStatus;
  message: string;
}

const GENERATE_COUNT = 10;

export default function AdminPage() {
  const [states, setStates] = useState<Record<string, ExamState>>(() =>
    Object.fromEntries(exams.map((e) => [e.id, { status: "idle", message: "" }]))
  );

  const handleGenerate = async (examId: string, examShortName: string) => {
    setStates((prev) => ({
      ...prev,
      [examId]: { status: "loading", message: "" },
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

      setStates((prev) => ({
        ...prev,
        [examId]: {
          status: "done",
          message: `${examShortName}試験: ${data.saved_count}問生成完了`,
        },
      }));
    } catch (err) {
      setStates((prev) => ({
        ...prev,
        [examId]: {
          status: "error",
          message: err instanceof Error ? err.message : "エラーが発生しました",
        },
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">管理者ページ</h1>
        <p className="text-sm text-gray-500 mb-8">
          各試験の問題をAIで生成してDBに保存します（{GENERATE_COUNT}問/回）
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
                <div>
                  <div className="font-semibold text-gray-900">
                    {exam.shortName}
                  </div>
                  <div className="text-xs text-gray-500">{exam.name}</div>
                </div>

                <div className="flex items-center gap-3">
                  {state.status === "done" && (
                    <span className="text-sm text-green-600 font-medium">
                      {state.message}
                    </span>
                  )}
                  {state.status === "error" && (
                    <span className="text-sm text-red-600 font-medium">
                      {state.message}
                    </span>
                  )}

                  <button
                    onClick={() => handleGenerate(exam.id, exam.shortName)}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
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
