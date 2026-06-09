"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { basicExams } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Target,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from "lucide-react";

type Row = { exam_id: string; category: string; answered: number; correct: number };

const MIN_FOR_WEAK = 3; // 弱点判定に必要な最低解答数

function accuracyColor(acc: number): { text: string; bar: string; dot: string } {
  if (acc >= 70) return { text: "text-green-600", bar: "bg-green-500", dot: "🟢" };
  if (acc >= 40) return { text: "text-yellow-600", bar: "bg-yellow-500", dot: "🟡" };
  return { text: "text-red-600", bar: "bg-red-500", dot: "🔴" };
}

function studyHref(examId: string, category: string) {
  return `/exam/${examId}/study?category=${encodeURIComponent(category)}`;
}

export function HomeDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [todayAnswered, setTodayAnswered] = useState(0);
  const [todayCorrect, setTodayCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState<string>(basicExams[0].id);

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

      // 弱点分析（区分×中分類ごとの解答数・正答数）
      const { data: statData } = await supabase.rpc("get_weakness_stats");
      const r: Row[] = statData
        ? (statData as Row[]).map((x) => ({
            ...x,
            answered: Number(x.answered),
            correct: Number(x.correct),
          }))
        : [];
      setRows(r);

      // 解答数が最も多いメイン区分を初期選択に
      const basicIds = basicExams.map((e) => e.id);
      const byExam = basicIds
        .map((id) => ({
          id,
          answered: r.filter((x) => x.exam_id === id).reduce((s, x) => s + x.answered, 0),
        }))
        .sort((a, b) => b.answered - a.answered);
      if (byExam[0] && byExam[0].answered > 0) setActiveExam(byExam[0].id);

      // 今日（JST）の進捗
      const now = new Date();
      const jstOffset = 9 * 60 * 60 * 1000;
      const todayJST = new Date(
        Math.floor((now.getTime() + jstOffset) / (24 * 60 * 60 * 1000)) *
          (24 * 60 * 60 * 1000) -
          jstOffset
      );
      const { data: todayData } = await supabase
        .from("user_progress")
        .select("is_correct, answered_at")
        .eq("user_id", user.id)
        .gte("answered_at", todayJST.toISOString());
      setTodayAnswered(todayData?.length ?? 0);
      setTodayCorrect(todayData?.filter((x) => x.is_correct).length ?? 0);

      // 連続日数
      const { data: allData } = await supabase
        .from("user_progress")
        .select("answered_at")
        .eq("user_id", user.id)
        .order("answered_at", { ascending: false });
      let s = 0;
      if (allData && allData.length > 0) {
        const days = new Set(
          allData.map((x) => {
            const d = new Date(new Date(x.answered_at).getTime() + jstOffset);
            return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
          })
        );
        const checkDate = new Date(now.getTime() + jstOffset);
        const todayKey = `${checkDate.getUTCFullYear()}-${checkDate.getUTCMonth()}-${checkDate.getUTCDate()}`;
        if (!days.has(todayKey)) checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        while (true) {
          const key = `${checkDate.getUTCFullYear()}-${checkDate.getUTCMonth()}-${checkDate.getUTCDate()}`;
          if (days.has(key)) {
            s++;
            checkDate.setUTCDate(checkDate.getUTCDate() - 1);
          } else break;
        }
      }
      setStreak(s);
      setLoading(false);
    }
    load();
  }, []);

  const todayAccuracy = todayAnswered > 0 ? Math.round((todayCorrect / todayAnswered) * 100) : 0;

  // 選択中区分の集計
  const active = useMemo(() => {
    const exam = basicExams.find((e) => e.id === activeExam)!;
    const er = rows.filter((x) => x.exam_id === activeExam);
    const answered = er.reduce((s, x) => s + x.answered, 0);
    const correct = er.reduce((s, x) => s + x.correct, 0);
    const acc = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const cats = er
      .map((x) => ({
        category: x.category,
        answered: x.answered,
        correct: x.correct,
        acc: x.answered > 0 ? Math.round((x.correct / x.answered) * 100) : 0,
      }))
      .sort((a, b) => a.acc - b.acc);
    const weakest = cats.find((c) => c.answered >= MIN_FOR_WEAK) ?? cats[0] ?? null;
    return { exam, answered, correct, acc, cats, weakest };
  }, [rows, activeExam]);

  // 各メイン区分のミニ統計（タブ表示用）
  const tabStats = useMemo(() => {
    const map: Record<string, { answered: number; acc: number }> = {};
    for (const e of basicExams) {
      const er = rows.filter((x) => x.exam_id === e.id);
      const answered = er.reduce((s, x) => s + x.answered, 0);
      const correct = er.reduce((s, x) => s + x.correct, 0);
      map[e.id] = { answered, acc: answered > 0 ? Math.round((correct / answered) * 100) : 0 };
    }
    return map;
  }, [rows]);

  const statItems = [
    { icon: BookOpen, color: "text-indigo-500", value: loading ? "-" : todayAnswered, label: "解答数" },
    { icon: Target, color: "text-green-500", value: loading ? "-" : `${todayAccuracy}%`, label: "正解率" },
    { icon: TrendingUp, color: "text-orange-500", value: loading ? "-" : streak, label: "連続日数" },
  ];

  return (
    <div className="space-y-4">
      {/* ① 試験区分セレクタ（横並び・タップで分析を切替） */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {basicExams.map((e) => {
          const isActive = e.id === activeExam;
          const st = tabStats[e.id];
          return (
            <button
              key={e.id}
              onClick={() => setActiveExam(e.id)}
              className={`group relative rounded-2xl border p-3 md:p-4 text-left transition-all duration-200 ${
                isActive
                  ? `${e.borderColor} bg-white shadow-rich-lg -translate-y-0.5`
                  : "border-transparent bg-white/60 backdrop-blur-sm shadow-rich hover:bg-white/90"
              }`}
            >
              <div className="flex flex-col items-center text-center gap-1.5 md:flex-row md:text-left md:gap-2.5">
                <div
                  className={`bg-gradient-to-br ${e.color} rounded-xl w-9 h-9 md:w-11 md:h-11 flex items-center justify-center flex-shrink-0 shadow-md shadow-black/10 transition-transform ${
                    isActive ? "scale-105" : "group-hover:scale-105"
                  }`}
                >
                  <span className="text-white font-bold text-xs md:text-sm leading-none">{e.shortName}</span>
                </div>
                <div className="min-w-0 w-full">
                  <div className="font-bold text-gray-900 text-xs md:text-sm leading-tight truncate">
                    {e.name.replace("技術者試験", "").replace("試験", "")}
                  </div>
                  <div className="text-[10px] md:text-xs text-gray-400 leading-tight">
                    {loading ? "…" : st.answered > 0 ? `正答率 ${st.acc}%` : "未着手"}
                  </div>
                </div>
              </div>
              {isActive && (
                <span
                  className={`absolute -bottom-px left-4 right-4 h-0.5 rounded-full bg-gradient-to-r ${e.color}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ② 左：今日の進捗（コンパクト）／右：選択中区分の学習分析＋クイックスタート */}
      <div className="grid gap-4 md:grid-cols-3 items-start">
        {/* 左：今日の進捗 */}
        <div className="space-y-3 md:col-span-1">
          <div className="flex items-baseline gap-2 px-0.5">
            <h3 className="text-sm font-bold text-gray-700">今日の進捗</h3>
            <span className="text-xs text-gray-400">全区分合計</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {statItems.map((s) => (
              <Card key={s.label} className="border border-white/60 bg-white/80 backdrop-blur-sm rounded-xl shadow-rich">
                <CardContent className="p-2.5 text-center">
                  <div className="flex items-center justify-center mb-0.5">
                    <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  </div>
                  <div className="text-lg font-bold text-gray-900 leading-tight">{s.value}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="border border-white/60 bg-white/80 backdrop-blur-sm rounded-xl shadow-rich">
            <CardContent className="p-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-medium text-gray-700">今日の目標</span>
                <span className="text-xs text-gray-500">{loading ? "-" : todayAnswered} / 10問</span>
              </div>
              <Progress value={loading ? 0 : (todayAnswered / 10) * 100} className="h-2" />
            </CardContent>
          </Card>
          <Link
            href="/analysis"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all"
          >
            全区分まとめて分析
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 右：選択中区分の学習分析 */}
        <div className="md:col-span-2">
          <Card className="border border-gray-200/70 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich overflow-hidden">
            <CardContent className="p-4 md:p-5">
              {/* 見出し（区分名＋累計） */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`bg-gradient-to-br ${active.exam.color} rounded-xl w-11 h-11 flex items-center justify-center flex-shrink-0 shadow-md shadow-black/10`}
                >
                  <span className="text-white font-bold text-sm leading-none">{active.exam.shortName}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 leading-tight">{active.exam.name} の弱点分析</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {loading
                      ? "読み込み中…"
                      : active.answered > 0
                        ? `累計 ${active.answered}問・正答率 ${active.acc}%`
                        : "AIがあなたの弱点を可視化します"}
                  </div>
                </div>
                {!loading && active.answered > 0 && (
                  <div className={`text-2xl font-bold ${accuracyColor(active.acc).text}`}>{active.acc}%</div>
                )}
              </div>

              {/* 分析本体 */}
              {loading ? (
                <div className="py-10 text-center text-sm text-gray-400">読み込み中…</div>
              ) : active.answered === 0 ? (
                <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-6 text-center">
                  <Sparkles className="w-7 h-7 text-indigo-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">まだ解答記録がありません</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    数問解くだけで、分野ごとの正答率グラフと
                    <br className="hidden md:block" />
                    「重点的に対策すべき分野」が表示されます。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 重点対策（最弱点） */}
                  {active.weakest && active.weakest.answered >= MIN_FOR_WEAK && (
                    <Link
                      href={studyHref(active.exam.id, active.weakest.category)}
                      className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/70 px-3 py-2.5 hover:bg-red-50 transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span className="text-xs text-gray-500">重点対策</span>
                      <span className="font-semibold text-gray-900 text-sm truncate">{active.weakest.category}</span>
                      <span className="ml-auto flex items-center gap-1 text-sm font-bold text-red-600 flex-shrink-0">
                        {active.weakest.acc}%
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </Link>
                  )}

                  {/* ジャンル別 棒グラフ（弱点順） */}
                  <div className="space-y-2">
                    {active.cats.slice(0, 8).map((cat) => {
                      const cc = accuracyColor(cat.acc);
                      return (
                        <Link
                          key={cat.category}
                          href={studyHref(active.exam.id, cat.category)}
                          className="block rounded-lg p-1 -m-1 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm text-gray-700 leading-snug truncate">{cat.category}</span>
                            <span className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`text-sm font-semibold ${cc.text}`}>{cat.acc}%</span>
                              <span className="text-xs text-gray-400">
                                {cat.correct}/{cat.answered}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${cc.bar}`} style={{ width: `${cat.acc}%` }} />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ③ さっそく解く（クイックスタート） */}
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-400 mb-2">さっそく解く</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {active.weakest && active.weakest.answered >= MIN_FOR_WEAK ? (
                    <Link
                      href={studyHref(active.exam.id, active.weakest.category)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                      <Target className="w-4 h-4" />
                      弱点分野から解く
                    </Link>
                  ) : (
                    <Link
                      href={`/exam/${active.exam.id}/past`}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                      <BookOpen className="w-4 h-4" />
                      過去問を解く
                    </Link>
                  )}
                  <Link
                    href={`/exam/${active.exam.id}`}
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-rich hover:border-indigo-300 hover:text-indigo-600 transition-all"
                  >
                    {active.exam.name.replace("技術者試験", "").replace("試験", "")}のメニュー
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
