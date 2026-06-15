"use client";

import { useState, useEffect, useCallback } from "react";
import { getExam } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import PmGrader from "@/components/pm-grader";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  CheckCircle2,
  CircleDot,
  XCircle,
  Eye,
  PenLine,
} from "lucide-react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";

type PmQ = {
  id: string;
  year: string;
  q_number: number;
  title: string | null;
  field: string | null;
  required: boolean;
  pages: string[];
  answer_pages: string[];
};

type Result = "correct" | "partial" | "wrong";

const RESULT_LABEL: Record<Result, { label: string; icon: typeof CheckCircle2; chip: string }> = {
  correct: { label: "できた", icon: CheckCircle2, chip: "bg-green-100 text-green-700 border-green-300" },
  partial: { label: "部分的", icon: CircleDot, chip: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  wrong: { label: "できなかった", icon: XCircle, chip: "bg-red-100 text-red-700 border-red-300" },
};

// 年度を新しい順に並べるソートキー
function yearSortKey(y: string): number {
  const m = y.match(/(令和|平成)(元|\d+)年度(?:\s*(春期|秋期|特別))?/);
  if (!m) return 0;
  const n = m[2] === "元" ? 1 : parseInt(m[2], 10);
  const absYear = m[1] === "令和" ? 2018 + n : 1988 + n;
  const season = m[3] === "春期" ? 1 : m[3] === "特別" ? 2 : m[3] === "秋期" ? 3 : 4;
  return absYear * 10 + season;
}

export default function PmExamPage() {
  const params = useParams();
  const examId = params.examId as string;
  const exam = getExam(examId);

  const [view, setView] = useState<"years" | "list" | "viewer">("years");
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<{ year: string; count: number }[]>([]);
  const [year, setYear] = useState("");
  const [questions, setQuestions] = useState<PmQ[]>([]);
  const [current, setCurrent] = useState<PmQ | null>(null);
  const [results, setResults] = useState<Record<string, Result>>({}); // pm_question_id -> 最新の自己採点
  const [showAnswer, setShowAnswer] = useState(false);
  const [saving, setSaving] = useState(false);

  // 年度一覧＋自己採点の最新状態
  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.from("pm_questions").select("year").eq("exam_id", examId);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: { year: string }) => {
        counts[r.year] = (counts[r.year] || 0) + 1;
      });
      setYears(
        Object.entries(counts)
          .map(([y, c]) => ({ year: y, count: c }))
          .sort((a, b) => yearSortKey(b.year) - yearSortKey(a.year))
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: prog } = await supabase
          .from("pm_progress")
          .select("pm_question_id, result, answered_at")
          .eq("user_id", user.id)
          .order("answered_at", { ascending: false })
          .limit(1000);
        const latest: Record<string, Result> = {};
        (prog ?? []).forEach((p: { pm_question_id: string; result: Result }) => {
          if (!(p.pm_question_id in latest)) latest[p.pm_question_id] = p.result;
        });
        setResults(latest);
      }
      setLoading(false);
    }
    load();
  }, [examId]);

  const openYear = async (y: string) => {
    setYear(y);
    setView("list");
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("pm_questions")
      .select("*")
      .eq("exam_id", examId)
      .eq("year", y)
      .order("q_number");
    setQuestions((data as PmQ[]) ?? []);
    setLoading(false);
  };

  const openQuestion = (q: PmQ) => {
    setCurrent(q);
    setShowAnswer(false);
    setView("viewer");
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  const grade = async (result: Result) => {
    if (!current || saving) return;
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("pm_progress").insert({
          user_id: user.id,
          pm_question_id: current.id,
          result,
        });
      }
      setResults((prev) => ({ ...prev, [current.id]: result }));
    } finally {
      setSaving(false);
    }
  };

  const back = useCallback(() => {
    if (view === "viewer") {
      setView("list");
      setCurrent(null);
    } else if (view === "list") {
      setView("years");
    }
  }, [view]);

  if (!exam || examId !== "ap") return notFound();

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-gray-200/70 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          {view === "years" ? (
            <Link href={`/exam/${examId}`} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          ) : (
            <button onClick={back} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <div className="min-w-0">
            <div className="text-sm text-gray-500 truncate">
              {view === "viewer" && current ? `${year} ・ 問${current.q_number}` : exam.name}
            </div>
            <div className="font-bold text-gray-900 truncate">
              {view === "viewer" && current ? current.title || "午後問題" : "午後問題（記述式）"}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-4">
        {/* 年度選択 */}
        {view === "years" && (
          <>
            <div className="mb-2">
              <h2 className="text-lg font-bold text-gray-900 mb-1">年度を選んでください</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                本物のIPA午後問題（問1〜問11）を読んで解き、公式解答例で自己採点できます。
                本番は問1（情報セキュリティ）が必須＋問2〜問11から4問選択です。
              </p>
            </div>
            {loading ? (
              <div className="text-center text-gray-400 py-12">読み込み中...</div>
            ) : (
              <div className="space-y-3">
                {years.map((y) => (
                  <button
                    key={y.year}
                    onClick={() => openYear(y.year)}
                    className="group w-full text-left border border-indigo-200 rounded-2xl p-5 bg-white/85 backdrop-blur-sm shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        <span className="font-semibold text-gray-900">{y.year}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">{y.count}問</span>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* 大問一覧 */}
        {view === "list" && (
          <>
            <div className="mb-2">
              <h2 className="text-lg font-bold text-gray-900 mb-1">{year} の午後問題</h2>
              <p className="text-sm text-gray-500">
                問1は必須、問2〜問11から4問選択（本番形式）。解きたい問題を選んでください。
              </p>
            </div>
            {loading ? (
              <div className="text-center text-gray-400 py-12">読み込み中...</div>
            ) : (
              <div className="space-y-3">
                {questions.map((q) => {
                  const r = results[q.id];
                  const R = r ? RESULT_LABEL[r] : null;
                  return (
                    <button
                      key={q.id}
                      onClick={() => openQuestion(q)}
                      className="group w-full text-left border border-gray-200 rounded-2xl p-4 bg-white/85 backdrop-blur-sm shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/30">
                          <span className="text-white font-bold text-sm">問{q.q_number}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">
                              {q.field}
                            </span>
                            {q.required && (
                              <span className="text-xs font-semibold text-red-600 bg-red-50 rounded-full px-2 py-0.5">
                                必須
                              </span>
                            )}
                            {R && (
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold border rounded-full px-2 py-0.5 ${R.chip}`}>
                                <R.icon className="w-3 h-3" />
                                {R.label}
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-gray-900 leading-snug truncate">
                            {q.title || `問${q.q_number}`}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{q.pages.length}ページ</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 group-hover:text-indigo-400 transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* 問題ビューア */}
        {view === "viewer" && current && (
          <>
            {/* メタ */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-full px-3 py-1">
                {current.field}
              </span>
              {current.required && (
                <span className="text-sm font-semibold text-red-600 bg-red-50 rounded-full px-3 py-1">必須問題</span>
              )}
              <span className="text-sm text-gray-400">{year} 午後 問{current.q_number}</span>
            </div>

            {/* 問題ページ */}
            <div className="space-y-3">
              {current.pages.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt={`問${current.q_number} ${i + 1}ページ目`}
                  loading={i > 1 ? "lazy" : "eager"}
                  className="w-full h-auto rounded-xl border border-gray-200 bg-white shadow-sm"
                />
              ))}
            </div>

            <p className="text-xs text-gray-400">
              出典：IPA 応用情報技術者試験 {year} 午後 問{current.q_number}
            </p>

            {/* 設問の入力＋自動採点（設問データがある回＝令和7秋のみ表示） */}
            <PmGrader pmQuestionId={current.id} />

            {/* 解答例の開閉 */}
            {!showAnswer ? (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 text-center space-y-3">
                <p className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <PenLine className="w-4 h-4 text-indigo-500" />
                  まず自分の解答をノートやメモに書いてから、解答例を開きましょう
                </p>
                <button
                  onClick={() => setShowAnswer(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-base font-bold text-white shadow-md shadow-indigo-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <Eye className="w-5 h-5" />
                  公式解答例を見る
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-gray-700">公式解答例（IPA発表）</h3>
                  {current.answer_pages.map((src, i) => (
                    <img
                      key={src}
                      src={src}
                      alt={`問${current.q_number} 解答例 ${i + 1}ページ目`}
                      className="w-full h-auto rounded-xl border border-gray-200 bg-white shadow-sm"
                    />
                  ))}
                  <p className="text-xs text-gray-400">
                    ※解答例ページには前後の問題の解答が含まれる場合があります。「問{current.q_number}」の欄をご覧ください。
                  </p>
                </div>

                {/* 自己採点 */}
                <div className="rounded-2xl border border-gray-200 bg-white/85 backdrop-blur-sm shadow-rich p-5 space-y-3">
                  <h3 className="text-base font-bold text-gray-800 text-center">自己採点を記録しましょう</h3>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(Object.keys(RESULT_LABEL) as Result[]).map((key) => {
                      const R = RESULT_LABEL[key];
                      const active = results[current.id] === key;
                      return (
                        <button
                          key={key}
                          onClick={() => grade(key)}
                          disabled={saving}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3.5 font-bold transition-all disabled:opacity-60 ${
                            active
                              ? `${R.chip} border-current shadow-md -translate-y-0.5`
                              : "border-gray-200 bg-white text-gray-500 hover:border-indigo-300 hover:-translate-y-0.5"
                          }`}
                        >
                          <R.icon className="w-6 h-6" />
                          <span className="text-sm">{R.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {results[current.id] && (
                    <p className="text-center text-sm text-gray-500">
                      記録しました ✅（あとから押し直して更新できます）
                    </p>
                  )}
                </div>
              </>
            )}

            {/* 一覧へ戻る */}
            <div className="flex justify-center pt-2">
              <button
                onClick={back}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-rich hover:border-indigo-300 hover:text-indigo-700 hover:-translate-y-0.5 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                問題一覧に戻る
              </button>
            </div>

            {/* 下部固定の「解答・採点」バーに隠れないための余白 */}
            <div className="h-24" aria-hidden />
          </>
        )}
      </main>
    </div>
  );
}
