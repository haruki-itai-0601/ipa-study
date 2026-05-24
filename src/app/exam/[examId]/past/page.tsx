"use client";

import { useState } from "react";
import { getExam } from "@/lib/exams";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// 仮の過去問データ
const dummyQuestions = [
  {
    id: "1",
    category: "リスク管理",
    year: "令和5年度",
    question:
      "プロジェクトのリスクマネジメントにおいて、リスクの定量的分析を行う目的として、最も適切なものはどれか。",
    options: {
      a: "リスクの発生確率と影響度を数値化し、プロジェクト目標への総合的な影響を評価する",
      b: "リスクの優先順位付けを行い、詳細な分析が必要なリスクを特定する",
      c: "リスクへの対応戦略を立案し、コンティンジェンシー計画を策定する",
      d: "リスクオーナーを決定し、各リスクの監視・管理責任を明確にする",
    },
    correctAnswer: "a",
    explanation:
      "定量的リスク分析の目的は、リスクの発生確率と影響度を数値化してプロジェクト全体への影響を定量的に評価することです。選択肢Bは定性的分析（優先順位付け）の目的、選択肢Cはリスク対応計画、選択肢Dはリスク監視の内容です。",
  },
  {
    id: "2",
    category: "スコープ管理",
    year: "令和4年度",
    question:
      "WBS（Work Breakdown Structure）を作成する主な目的として、最も適切なものはどれか。",
    options: {
      a: "プロジェクトの作業を階層的に分解し、成果物と作業の全体像を明確にする",
      b: "プロジェクトの進捗状況を可視化し、遅延を早期に発見する",
      c: "チームメンバーへの作業割り当てを行い、責任範囲を明確にする",
      d: "プロジェクトのコストを見積もり、予算を策定する",
    },
    correctAnswer: "a",
    explanation:
      "WBSの主な目的は、プロジェクトのスコープを管理可能な作業に階層的に分解し、成果物と必要な作業の全体像を明確にすることです。進捗管理はガントチャート、作業割り当てはRACI図、コスト見積もりはコスト管理プロセスで行います。",
  },
];

export default function PastExamPage() {
  const params = useParams();
  const examId = params.examId as string;
  const exam = getExam(examId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  const question = dummyQuestions[currentIndex];
  const isCorrect = selectedAnswer === question?.correctAnswer;
  const isLastQuestion = currentIndex === dummyQuestions.length - 1;

  const handleSelect = (key: string) => {
    if (isAnswered) return;
    setSelectedAnswer(key);
    setIsAnswered(true);
    setResults((prev) => [...prev, key === question.correctAnswer]);
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    setCurrentIndex((prev) => prev + 1);
  };

  if (!exam) return null;

  const optionLabels: Record<string, string> = { a: "A", b: "B", c: "C", d: "D" };
  const optionColors = (key: string) => {
    if (!isAnswered) return "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50";
    if (key === question.correctAnswer) return "border-green-400 bg-green-50";
    if (key === selectedAnswer && !isCorrect) return "border-red-400 bg-red-50";
    return "border-gray-200 bg-white opacity-60";
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
              <div className="font-bold text-gray-900">過去問演習</div>
            </div>
          </div>
          <div className="text-base font-semibold text-gray-500">
            {currentIndex + 1} / {dummyQuestions.length}
          </div>
        </div>
        {/* 進捗バー */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${((currentIndex + (isAnswered ? 1 : 0)) / dummyQuestions.length) * 100}%` }}
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
            <p className="text-base leading-relaxed text-gray-900">
              {question.question}
            </p>
          </CardContent>
        </Card>

        {/* 選択肢 */}
        <div className="space-y-3">
          {(Object.entries(question.options) as [string, string][]).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={isAnswered}
              className={`w-full text-left border-2 rounded-xl p-4 transition-all duration-200 ${optionColors(key)}`}
            >
              <div className="flex items-start gap-3">
                <span className={`font-bold text-base flex-shrink-0 w-6 ${
                  isAnswered && key === question.correctAnswer ? "text-green-600" :
                  isAnswered && key === selectedAnswer && !isCorrect ? "text-red-600" :
                  "text-gray-400"
                }`}>
                  {optionLabels[key]}
                </span>
                <span className="text-base text-gray-800 leading-relaxed">{value}</span>
                {isAnswered && key === question.correctAnswer && (
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
                  <><CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-700 text-base">正解！</span></>
                ) : (
                  <><XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-bold text-red-700 text-base">不正解</span>
                  <span className="text-sm text-red-500">正解は {optionLabels[question.correctAnswer]}</span></>
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
