"use client";

import { useState } from "react";
import { getExam, questionSource } from "@/lib/exams";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Lightbulb, ChevronRight, BookOpen } from "lucide-react";
import Link from "next/link";
import ZoomableImage from "@/components/zoomable-image";

export type SingleQ = {
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
  image_url?: string | null;
};

const optionLabels: Record<string, string> = { a: "ア", b: "イ", c: "ウ", d: "エ" };

export default function SingleQuestion({ q }: { q: SingleQ }) {
  const exam = getExam(q.exam_id);
  const [selected, setSelected] = useState<string | null>(null);
  const isAnswered = selected !== null;
  const isCorrect = selected === q.correct_answer;

  const options: Record<string, string> = {
    a: q.option_a,
    b: q.option_b,
    c: q.option_c,
    d: q.option_d,
  };

  const optionColors = (key: string) => {
    if (!isAnswered) return "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer";
    if (key === q.correct_answer) return "border-green-400 bg-green-50";
    if (key === selected && !isCorrect) return "border-red-400 bg-red-50";
    return "border-gray-200 bg-white opacity-60";
  };

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-4">
      {/* メタ */}
      <div className="flex flex-wrap items-center gap-2">
        {exam && (
          <span className={`text-sm px-3 py-1 rounded-full ${exam.textColor} ${exam.badgeBg}`}>{q.category}</span>
        )}
        <span className="text-sm text-gray-400">{q.year}</span>
      </div>

      {/* 問題（図問題は画像で表示。画像内に問題文・図・選択肢が含まれる） */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          {q.image_url ? (
            <ZoomableImage
              src={q.image_url}
              alt={`問題 ${q.q_number ?? ""}`}
              className="w-full h-auto rounded-md border border-gray-100"
            />
          ) : (
            <p className="text-base leading-relaxed text-gray-900">{q.question}</p>
          )}
        </CardContent>
      </Card>

      {!isAnswered && <p className="text-sm text-gray-500">ア〜エから選んでみましょう👇</p>}

      {/* 選択肢 */}
      <div className="space-y-3">
        {(Object.entries(options) as [string, string][]).map(([key, value]) => (
          <button
            key={key}
            onClick={() => !isAnswered && setSelected(key)}
            disabled={isAnswered}
            className={`w-full text-left border-2 rounded-xl p-4 transition-all duration-200 ${optionColors(key)}`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`font-bold text-base flex-shrink-0 w-6 ${
                  isAnswered && key === q.correct_answer
                    ? "text-green-600"
                    : isAnswered && key === selected && !isCorrect
                      ? "text-red-600"
                      : "text-gray-400"
                }`}
              >
                {optionLabels[key]}
              </span>
              {!q.image_url && (
                <span className="text-base text-gray-800 leading-relaxed">{value}</span>
              )}
              {isAnswered && key === q.correct_answer && (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-auto" />
              )}
              {isAnswered && key === selected && !isCorrect && (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 ml-auto" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* 解説（解答後に表示） */}
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
                  <span className="text-sm text-red-500">正解は {optionLabels[q.correct_answer]}</span>
                </>
              )}
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
      )}

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
            <div className="text-sm text-indigo-100">本物の過去問1万問超を無料で演習</div>
          </div>
          <ChevronRight className="w-6 h-6 flex-shrink-0" />
        </div>
      </Link>

      <div className="text-center pt-2">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold">
          過去問演習ラボトップへ →
        </Link>
      </div>
    </main>
  );
}
