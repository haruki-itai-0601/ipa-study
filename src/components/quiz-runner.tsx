"use client";

import { useState, useEffect, useRef } from "react";
import { getExam, questionSource } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, ChevronRight, Clock, RotateCcw } from "lucide-react";

export type Question = {
  id: string;
  category: string;
  year: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "a" | "b" | "c" | "d";
  explanation: string;
  q_number?: number | null;
  image_url?: string | null;
};

const optionLabels: Record<string, string> = { a: "ア", b: "イ", c: "ウ", d: "エ" };

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function QuizRunner({
  examId,
  questions,
  title,
  subtitle,
  onBack,
  timerSeconds,
}: {
  examId: string;
  questions: Question[];
  title: string;
  subtitle?: string;
  onBack: () => void;
  timerSeconds?: number;
}) {
  const exam = getExam(examId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(timerSeconds ?? null);

  // 模試タイマー（timerSeconds が指定されたときのみ作動）
  const finishedRef = useRef(false);
  useEffect(() => {
    if (timerSeconds == null) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          clearInterval(id);
          if (!finishedRef.current) {
            finishedRef.current = true;
            setFinished(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerSeconds]);

  if (!exam) return null;

  // 出題できる問題が無い
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="font-bold text-gray-900">{title}</div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 md:px-8 py-16 text-center">
          <p className="text-gray-500">出題できる問題がありません。</p>
          <button
            onClick={onBack}
            className="mt-6 inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            モード選択に戻る
          </button>
        </main>
      </div>
    );
  }

  // 完了画面（全問終了 or タイマー切れ）
  if (finished) {
    const correctCount = results.filter(Boolean).length;
    const answered = results.length;
    const accuracy = answered > 0 ? Math.round((correctCount / answered) * 100) : 0;
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="font-bold text-gray-900">{title}・結果</div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 md:px-8 py-10">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="text-sm text-gray-500 mb-2">{questions.length}問中</div>
              <div className="text-5xl font-bold text-gray-900 mb-1">
                {correctCount}
                <span className="text-2xl text-gray-400"> / {answered}</span>
              </div>
              <div className="text-lg font-semibold text-indigo-600 mb-6">正答率 {accuracy}%</div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-8">
                <div className="h-full bg-indigo-500" style={{ width: `${accuracy}%` }} />
              </div>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                モード選択に戻る
              </button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const question = questions[currentIndex];
  if (!question) return null;

  const options: Record<string, string> = {
    a: question.option_a,
    b: question.option_b,
    c: question.option_c,
    d: question.option_d,
  };

  const isCorrect = selectedAnswer === question.correct_answer;
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleSelect = async (key: string) => {
    if (isAnswered) return;
    setSelectedAnswer(key);
    setIsAnswered(true);
    const correct = key === question.correct_answer;
    setResults((prev) => [...prev, correct]);

    // 進捗をSupabaseに記録
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_progress").insert({
          user_id: user.id,
          question_id: question.id,
          exam_id: examId,
          year: question.year,
          is_correct: correct,
        });
      }
    } catch {
      // 記録失敗しても演習は続ける
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setFinished(true);
      return;
    }
    setSelectedAnswer(null);
    setIsAnswered(false);
    setCurrentIndex((prev) => prev + 1);
  };

  const optionColors = (key: string) => {
    if (!isAnswered) return "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50";
    if (key === question.correct_answer) return "border-green-400 bg-green-50";
    if (key === selectedAnswer && !isCorrect) return "border-red-400 bg-red-50";
    return "border-gray-200 bg-white opacity-60";
  };

  const lowTime = remaining != null && remaining <= 60;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <div className="text-sm text-gray-500">{subtitle ?? exam.name}</div>
              <div className="font-bold text-gray-900">{title}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {remaining != null && (
              <div
                className={`flex items-center gap-1 font-mono font-semibold ${
                  lowTime ? "text-red-600" : "text-gray-600"
                }`}
              >
                <Clock className="w-4 h-4" />
                {formatTime(remaining)}
              </div>
            )}
            <div className="text-base font-semibold text-gray-500">
              {currentIndex + 1} / {questions.length}
            </div>
          </div>
        </div>
        {/* 進捗バー */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{
              width: `${((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100}%`,
            }}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-4">
        {/* 問題メタ情報 */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={`text-sm ${exam.textColor} ${exam.badgeBg}`}>
            {question.category}
          </Badge>
          <span className="text-sm text-gray-400">{question.year}</span>
        </div>

        {/* 問題文（図問題は画像で表示。画像内に問題文・図・選択肢が含まれる） */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            {question.image_url ? (
              <img
                src={question.image_url}
                alt={`問題 ${question.q_number ?? ""}`}
                className="w-full h-auto rounded-md border border-gray-100"
              />
            ) : (
              <p className="text-base leading-relaxed text-gray-900">{question.question}</p>
            )}
          </CardContent>
        </Card>

        {/* 出典 */}
        <p className="text-xs text-gray-400">{questionSource(examId, question.year, question.q_number)}</p>

        {/* 選択肢 */}
        <div className="space-y-3">
          {(Object.entries(options) as [string, string][]).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={isAnswered}
              className={`w-full text-left border-2 rounded-xl p-4 transition-all duration-200 ${optionColors(key)}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`font-bold text-base flex-shrink-0 w-6 ${
                    isAnswered && key === question.correct_answer
                      ? "text-green-600"
                      : isAnswered && key === selectedAnswer && !isCorrect
                        ? "text-red-600"
                        : "text-gray-400"
                  }`}
                >
                  {optionLabels[key]}
                </span>
                {!question.image_url && (
                  <span className="text-base text-gray-800 leading-relaxed">{value}</span>
                )}
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
              <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
                ※この解説はIPA公式の解答解説ではなく、本サービスが独自に作成したものです。
              </p>
            </CardContent>
          </Card>
        )}

        {/* 次へボタン */}
        {isAnswered && (
          <div className="flex justify-end">
            <button
              onClick={handleNext}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold text-base hover:bg-indigo-700 transition-colors"
            >
              {isLastQuestion ? "結果を見る" : "次の問題へ"}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
