"use client";

import { useState, useEffect } from "react";
import { getExam } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Question {
  id: string;
  exam_id: string;
  category: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "a" | "b" | "c" | "d";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

export default function AIExamPage() {
  const params = useParams();
  const examId = params.examId as string;
  const exam = getExam(examId);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  useEffect(() => {
    if (!examId) return;

    const fetchQuestions = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(
          `/api/questions?exam_id=${encodeURIComponent(examId)}&type=ai&count=5`
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "問題の取得に失敗しました");
        }
        const data = await res.json();
        setQuestions(data.questions);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "問題の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [examId]);

  if (!exam) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
        <p className="text-base font-semibold text-gray-600">問題を生成中...</p>
        <p className="text-sm text-gray-400">AIがあなたのための問題を作成しています</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <XCircle className="w-10 h-10 text-red-500" />
        <p className="text-base font-semibold text-gray-700">エラーが発生しました</p>
        <p className="text-sm text-gray-500">{loadError}</p>
        <Link
          href={`/exam/${examId}`}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          試験ページに戻る
        </Link>
      </div>
    );
  }

  if (!isLoading && !loadError && questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="w-10 h-10 text-gray-300" />
        <p className="text-base font-semibold text-gray-700">問題を準備中です。しばらくお待ちください。</p>
        <Link
          href={`/exam/${examId}`}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          試験ページに戻る
        </Link>
      </div>
    );
  }

  const question = questions[currentIndex];
  if (!question) return null;

  const isCorrect = selectedAnswer === question.correct_answer;
  const isLastQuestion = currentIndex === questions.length - 1;

  const optionLabels: Record<string, string> = { a: "ア", b: "イ", c: "ウ", d: "エ" };

  const options: [string, string][] = [
    ["a", question.option_a],
    ["b", question.option_b],
    ["c", question.option_c],
    ["d", question.option_d],
  ];

  const optionColors = (key: string) => {
    if (!isAnswered) return "border-gray-200 bg-white hover:border-yellow-300 hover:bg-yellow-50";
    if (key === question.correct_answer) return "border-green-400 bg-green-50";
    if (key === selectedAnswer && !isCorrect) return "border-red-400 bg-red-50";
    return "border-gray-200 bg-white opacity-60";
  };

  const handleSelect = async (key: string) => {
    if (isAnswered) return;
    setSelectedAnswer(key);
    setIsAnswered(true);
    const correct = key === question.correct_answer;
    setResults((prev) => [...prev, correct]);

    // 進捗をSupabaseに記録
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_progress").insert({
          user_id: user.id,
          question_id: question.id,
          exam_id: examId,
          year: "AI生成",
          is_correct: correct,
        });
      }
    } catch {
      // 記録失敗しても演習は続ける
    }
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    setCurrentIndex((prev) => prev + 1);
  };

  const difficultyLabel: Record<string, string> = {
    easy: "易",
    medium: "中",
    hard: "難",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/exam/${examId}`} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <div className="text-sm text-gray-500">{exam.name}</div>
              <div className="font-bold text-gray-900">AI予想問題演習</div>
            </div>
          </div>
          <div className="text-base font-semibold text-gray-500">
            {currentIndex + 1} / {questions.length}
          </div>
        </div>
        {/* 進捗バー */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-yellow-500 transition-all duration-300"
            style={{ width: `${((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-4">

        {/* 問題メタ情報 */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm text-yellow-600 bg-yellow-100">
            {question.category}
          </Badge>
          <Badge variant="secondary" className="text-xs text-gray-500 bg-gray-100">
            難易度：{difficultyLabel[question.difficulty] ?? question.difficulty}
          </Badge>
          <span className="text-xs text-gray-400 ml-auto">AI生成問題</span>
        </div>

        {/* 問題文 */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-base leading-relaxed text-gray-900">
              {question.question}
            </p>
          </CardContent>
        </Card>

        {/* 選択肢 */}
        <div className="space-y-3">
          {options.map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={isAnswered}
              className={`w-full text-left border-2 rounded-xl p-4 transition-all duration-200 ${optionColors(key)}`}
            >
              <div className="flex items-start gap-3">
                <span className={`font-bold text-base flex-shrink-0 w-6 ${
                  isAnswered && key === question.correct_answer ? "text-green-600" :
                  isAnswered && key === selectedAnswer && !isCorrect ? "text-red-600" :
                  "text-gray-400"
                }`}>
                  {optionLabels[key]}
                </span>
                <span className="text-base text-gray-800 leading-relaxed">{value}</span>
                {isAnswered && key === question.correct_answer && (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-auto" />
                )}
                {isAnswered && key === selectedAnswer && !isCorrect && (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 ml-auto" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* 解説 */}
        {isAnswered && (
          <Card className={`border-0 shadow-sm ${isCorrect ? "bg-green-50" : "bg-red-50"}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                {isCorrect ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-green-700 text-base">正解！</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-bold text-red-700 text-base">不正解</span>
                    <span className="text-sm text-red-500">
                      正解は {optionLabels[question.correct_answer]}
                    </span>
                  </>
                )}
              </div>
              <p className="text-base text-gray-700 leading-relaxed">{question.explanation}</p>
            </CardContent>
          </Card>
        )}

        {/* 次へボタン */}
        {isAnswered && (
          <div className="flex justify-end">
            {isLastQuestion ? (
              <Link
                href={`/exam/${examId}`}
                className="flex items-center gap-2 bg-yellow-500 text-white px-6 py-3 rounded-xl font-semibold text-base hover:bg-yellow-600 transition-colors"
              >
                演習を終える
              </Link>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 bg-yellow-500 text-white px-6 py-3 rounded-xl font-semibold text-base hover:bg-yellow-600 transition-colors"
              >
                次の問題へ
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
