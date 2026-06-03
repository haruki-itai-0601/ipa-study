"use client";

import { useState, useEffect } from "react";
import { exams, getExam } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronDown, TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";

type Row = { exam_id: string; category: string; answered: number; correct: number };

const MIN_FOR_WEAK = 3; // 弱点判定に必要な最低解答数

function accuracyColor(acc: number): { text: string; bar: string; dot: string } {
  if (acc >= 70) return { text: "text-green-600", bar: "bg-green-500", dot: "🟢" };
  if (acc >= 40) return { text: "text-yellow-600", bar: "bg-yellow-500", dot: "🟡" };
  return { text: "text-red-600", bar: "bg-red-500", dot: "🔴" };
}

export default function AnalysisPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.rpc("get_weakness_stats");
      if (data) {
        setRows(
          (data as Row[]).map((r) => ({
            ...r,
            answered: Number(r.answered),
            correct: Number(r.correct),
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  // 区分別に集計
  const perExam = exams.map((e) => {
    const er = rows.filter((r) => r.exam_id === e.id);
    const answered = er.reduce((s, r) => s + r.answered, 0);
    const correct = er.reduce((s, r) => s + r.correct, 0);
    const acc = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const cats = er
      .map((r) => ({
        category: r.category,
        answered: r.answered,
        correct: r.correct,
        acc: r.answered > 0 ? Math.round((r.correct / r.answered) * 100) : 0,
      }))
      .sort((a, b) => a.acc - b.acc);
    return { exam: e, answered, correct, acc, cats };
  });

  const totalAnswered = rows.reduce((s, r) => s + r.answered, 0);
  const totalCorrect = rows.reduce((s, r) => s + r.correct, 0);
  const totalAcc = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  // 全区分横断の弱点分野（最低解答数を満たすもののうち低正答率順）
  const weakCategories = rows
    .filter((r) => r.answered >= MIN_FOR_WEAK)
    .map((r) => ({
      exam_id: r.exam_id,
      category: r.category,
      answered: r.answered,
      acc: Math.round((r.correct / r.answered) * 100),
    }))
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <div className="text-sm text-gray-500">全区分まとめ</div>
            <div className="font-bold text-gray-900">学習分析</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-8">
        {loading ? (
          <div className="text-center text-gray-400 py-16">読み込み中...</div>
        ) : totalAnswered === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">まだ解答記録がありません。</p>
            <p className="text-sm text-gray-400 mt-1">過去問を解くと、ここに弱点分析が表示されます。</p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              演習を始める
            </Link>
          </div>
        ) : (
          <>
            {/* 全体サマリ */}
            <section>
              <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600">
                <CardContent className="p-6 text-white">
                  <div className="flex items-center gap-2 mb-2 text-indigo-100">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-sm font-semibold">全区分の累計</span>
                  </div>
                  <div className="flex items-end gap-6">
                    <div>
                      <div className="text-4xl font-bold">{totalAnswered}</div>
                      <div className="text-sm text-indigo-100">解答数</div>
                    </div>
                    <div>
                      <div className="text-4xl font-bold">{totalAcc}%</div>
                      <div className="text-sm text-indigo-100">正答率</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* 弱点分野 TOP */}
            {weakCategories.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-base font-semibold text-gray-700 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  重点的に対策したい分野
                </h2>
                <div className="space-y-2">
                  {weakCategories.map((w) => {
                    const c = accuracyColor(w.acc);
                    const ex = getExam(w.exam_id);
                    return (
                      <div
                        key={`${w.exam_id}-${w.category}`}
                        className="bg-white border border-gray-200 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="flex-shrink-0">{c.dot}</span>
                            <span className="font-semibold text-gray-900 leading-snug">{w.category}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0 mt-1">{ex?.shortName}</span>
                          </div>
                          <span className={`font-bold ${c.text} flex-shrink-0`}>{w.acc}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${c.bar}`} style={{ width: `${w.acc}%` }} />
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{w.answered}問 解答済み</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 区分横断ダッシュボード */}
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-3">区分ごとの進捗</h2>
              <div className="space-y-2">
                {perExam
                  .slice()
                  .sort((a, b) => b.answered - a.answered)
                  .map(({ exam, answered, acc, cats }) => {
                    const c = accuracyColor(acc);
                    const isOpen = expanded === exam.id;
                    return (
                      <div key={exam.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpanded(isOpen ? null : exam.id)}
                          disabled={answered === 0}
                          className="w-full text-left p-4 disabled:opacity-50"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`bg-gradient-to-br ${exam.color} rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0`}
                            >
                              <span className={`text-white font-bold leading-none whitespace-nowrap ${exam.shortName.length > 2 ? "text-[10px]" : "text-sm"}`}>
                                {exam.shortName}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-gray-900 truncate">{exam.name}</span>
                                {answered > 0 ? (
                                  <span className={`font-bold ${c.text} flex-shrink-0`}>{acc}%</span>
                                ) : (
                                  <span className="text-xs text-gray-400 flex-shrink-0">未着手</span>
                                )}
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                                <div className={`h-full ${c.bar}`} style={{ width: `${acc}%` }} />
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-gray-400">{answered}問 解答済み</span>
                                {answered > 0 && (
                                  <ChevronDown
                                    className={`w-4 h-4 text-gray-300 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </button>

                        {/* 分野別内訳 */}
                        {isOpen && cats.length > 0 && (
                          <div className="border-t border-gray-100 px-4 py-3 space-y-2 bg-gray-50">
                            {cats.map((cat) => {
                              const cc = accuracyColor(cat.acc);
                              return (
                                <div key={cat.category}>
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-sm text-gray-700 leading-snug">{cat.category}</span>
                                    <span className="flex items-center gap-2 flex-shrink-0">
                                      <span className={`text-sm font-semibold ${cc.text}`}>{cat.acc}%</span>
                                      <span className="text-xs text-gray-400">{cat.correct}/{cat.answered}</span>
                                    </span>
                                  </div>
                                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full ${cc.bar}`} style={{ width: `${cat.acc}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
