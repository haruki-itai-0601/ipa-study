"use client";

import { useState, useEffect } from "react";
import { getExam } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, ChevronRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Question = {
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
};

const optionLabels: Record<string, string> = { a: "ア", b: "イ", c: "ウ", d: "エ" };

// 年度ラベルを新しい順に並べるためのソートキー（令和元年度や春期/秋期を正しく扱う）
function yearSortKey(y: string): number {
  const m = y.match(/令和(元|\d+)年度\s*(春期|秋期)/);
  if (!m) return 0;
  const yr = m[1] === "元" ? 1 : parseInt(m[1], 10);
  const season = m[2] === "秋期" ? 2 : 1; // 同一年度では秋期を新しい扱い
  return yr * 10 + season;
}

export default function PastExamPage() {
  const params = useParams();
  const examId = params.examId as string;
  const exam = getExam(examId);

  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [yearCounts, setYearCounts] = useState<Record<string, number>>({});
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  // 利用可能な年度を取得
  useEffect(() => {
    async function fetchYears() {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("questions")
        .select("year")
        .eq("exam_id", examId)
        .eq("type", "past");

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((q: { year: string }) => {
          counts[q.year] = (counts[q.year] || 0) + 1;
        });
        const years = Object.keys(counts).sort((a, b) => yearSortKey(b) - yearSortKey(a));
        setAvailableYears(years);
        setYearCounts(counts);
      }
      setLoading(false);
    }
    fetchYears();
  }, [examId]);

  // 年度選択後に問題を取得
  useEffect(() => {
    if (!selectedYear) return;

    async function fetchQuestions() {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("questions")
        .select("*")
        .eq("exam_id", examId)
        .eq("year", selectedYear)
        .eq("type", "past")
        .order("q_number");

      if (data) {
        setQuestions(data);
      }
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setResults([]);
      setLoading(false);
    }
    fetchQuestions();
  }, [examId, selectedYear]);

  if (!exam) return null;

  // 年度選択画面
  if (!selectedYear) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
            <Link href={`/exam/${examId}`} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <div className="text-sm text-gray-500">{exam.name}</div>
              <div className="font-bold text-gray-900">過去問演習</div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">年度を選んでください</h2>
            <p className="text-sm text-gray-500">本物のIPA過去問（午前{examId === "am1" ? "Ⅰ" : "Ⅱ"}）から出題されます</p>
          </div>

          {loading ? (
            <div className="text-center text-gray-400 py-12">読み込み中...</div>
          ) : availableYears.length === 0 ? (
            <div className="text-center text-gray-400 py-12">問題が見つかりませんでした</div>
          ) : (
            <div className="space-y-3">
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className="w-full text-left bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BookOpen className={`w-5 h-5 ${exam.textColor}`} />
                      <span className="font-semibold text-gray-900">{year}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">{yearCounts[year] ?? 0}問</span>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // 問題読み込み中
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">問題を読み込み中...</div>
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
      const { data: { user } } = await supabase.auth.getUser();
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
    setSelectedAnswer(null);
    setIsAnswered(false);
    setCurrentIndex((prev) => prev + 1);
  };

  const optionColors = (key: string) => {
    if (!isAnswered)
      return "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50";
    if (key === question.correct_answer) return "border-green-400 bg-green-50";
    if (key === selectedAnswer && !isCorrect) return "border-red-400 bg-red-50";
    return "border-gray-200 bg-white opacity-60";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedYear(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <div className="text-sm text-gray-500">{selectedYear}</div>
              <div className="font-bold text-gray-900">過去問演習</div>
            </div>
          </div>
          <div className="text-base font-semibold text-gray-500">
            {currentIndex + 1} / {questions.length}
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

        {/* 問題文 */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-base leading-relaxed text-gray-900">{question.question}</p>
          </CardContent>
        </Card>

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
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold text-base hover:bg-indigo-700 transition-colors"
              >
                演習を終える
              </Link>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold text-base hover:bg-indigo-700 transition-colors"
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
