"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { basicExams } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Target,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Zap,
} from "lucide-react";

type Row = { exam_id: string; category: string; answered: number; correct: number };

const MIN_FOR_WEAK = 3; // 弱点判定に必要な最低解答数

function accuracyColor(acc: number): { text: string; bar: string } {
  if (acc >= 70) return { text: "text-green-600", bar: "bg-green-500" };
  if (acc >= 40) return { text: "text-yellow-600", bar: "bg-yellow-500" };
  return { text: "text-red-600", bar: "bg-red-500" };
}

function studyHref(examId: string, category: string) {
  return `/exam/${examId}/study?category=${encodeURIComponent(category)}`;
}

// IPAシラバスの3大分類（系）。弱点分析は「系」でまとめ、その下に中分類を出す。
const SERIES = [
  { key: "strategy", label: "ストラテジ系" },
  { key: "management", label: "マネジメント系" },
  { key: "technology", label: "テクノロジ系" },
  { key: "other", label: "その他" },
] as const;

type SeriesKey = "strategy" | "management" | "technology" | "other";

// 中分類（23分類）→ 系 のマッピング
const SERIES_OF: Record<string, SeriesKey> = {
  // テクノロジ系
  基礎理論: "technology",
  アルゴリズムとプログラミング: "technology",
  コンピュータ構成要素: "technology",
  システム構成要素: "technology",
  ソフトウェア: "technology",
  ハードウェア: "technology",
  ユーザーインタフェース: "technology",
  情報メディア: "technology",
  データベース: "technology",
  ネットワーク: "technology",
  セキュリティ: "technology",
  システム開発技術: "technology",
  ソフトウェア開発管理技術: "technology",
  // マネジメント系
  プロジェクトマネジメント: "management",
  サービスマネジメント: "management",
  システム監査: "management",
  // ストラテジ系
  システム戦略: "strategy",
  システム企画: "strategy",
  経営戦略マネジメント: "strategy",
  技術戦略マネジメント: "strategy",
  ビジネスインダストリ: "strategy",
  企業活動: "strategy",
  法務: "strategy",
};

function seriesKeyOf(category: string): SeriesKey {
  return SERIES_OF[category] ?? "other";
}

export function HomeDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [todayAnswered, setTodayAnswered] = useState(0);
  const [todayCorrect, setTodayCorrect] = useState(0);
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

      setLoading(false);
    }
    load();
  }, []);

  const todayAccuracy = todayAnswered > 0 ? Math.round((todayCorrect / todayAnswered) * 100) : 0;

  // 選択中区分の集計（系→中分類の階層）
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

    // 系（大分類）でグルーピング。弱点（低正答率）順に並べる。
    const series = SERIES.map((s) => {
      const scats = cats.filter((c) => seriesKeyOf(c.category) === s.key);
      const a = scats.reduce((sum, c) => sum + c.answered, 0);
      const cor = scats.reduce((sum, c) => sum + c.correct, 0);
      return {
        key: s.key,
        label: s.label,
        answered: a,
        correct: cor,
        acc: a > 0 ? Math.round((cor / a) * 100) : 0,
        cats: scats,
      };
    })
      .filter((s) => s.answered > 0)
      .sort((a, b) => a.acc - b.acc);

    return { exam, answered, correct, acc, cats, weakest, series };
  }, [rows, activeExam]);

  return (
    <div className="space-y-4">
      {/* 今日の進捗（解答数・正解率のみ・スリム表示。連続日数/目標はヘッダーへ移動） */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm px-4 py-3 shadow-rich">
        <div className="flex items-center gap-5 md:gap-7">
          <span className="text-sm font-bold text-gray-500">
            今日の進捗 <span className="font-normal text-gray-400">全区分</span>
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span className="text-xl font-bold text-gray-900 leading-none">{loading ? "-" : todayAnswered}</span>
            <span className="text-xs text-gray-500">解答</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-green-500" />
            <span className="text-xl font-bold text-gray-900 leading-none">{loading ? "-" : `${todayAccuracy}%`}</span>
            <span className="text-xs text-gray-500">正解率</span>
          </span>
        </div>
        <Link
          href="/analysis"
          className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          全区分まとめて分析
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* ① 試験区分セレクタ（ガイド＋横並びタブ・タップで分析を切替） */}
      <div>
        <p className="px-0.5 mb-2 text-sm font-semibold text-gray-500">
          試験区分を選んで、AI弱点分析ダッシュボードを切り替え
        </p>
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {basicExams.map((e) => {
            const isActive = e.id === activeExam;
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
                <div className="flex flex-col items-center text-center gap-1.5 md:flex-row md:text-left md:gap-3">
                  <div
                    className={`bg-gradient-to-br ${e.color} rounded-xl w-10 h-10 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0 shadow-md shadow-black/10 transition-transform ${
                      isActive ? "scale-105" : "group-hover:scale-105"
                    }`}
                  >
                    <span className="text-white font-bold text-xs md:text-sm leading-none">{e.shortName}</span>
                  </div>
                  <div className="min-w-0 w-full font-bold text-gray-900 text-xs md:text-lg leading-tight truncate">
                    {e.name.replace("技術者試験", "").replace("試験", "")}
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
      </div>

      {/* ② 選択中区分の学習分析（全幅） */}
      <div className="space-y-3">
        {/* 見出し */}
        <div className="flex items-center gap-2.5 px-0.5">
          <h3 className="text-lg md:text-xl font-bold text-gray-700 leading-tight truncate">
            {active.exam.name} の弱点分析
          </h3>
          <span className="hidden sm:inline text-sm text-gray-400 flex-shrink-0">AIが弱点を可視化</span>
          {!loading && active.answered > 0 && (
            <span className={`ml-auto text-xl font-bold ${accuracyColor(active.acc).text} flex-shrink-0`}>
              {active.acc}%
            </span>
          )}
        </div>

        <Card className="border border-gray-200/70 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich overflow-hidden">
          <CardContent className="p-4 md:p-5">
            {/* 累計サマリ（解答済みのときのみ） */}
            {!loading && active.answered > 0 && (
              <div className="text-base text-gray-500 mb-3">
                累計 {active.answered}問・正答率 {active.acc}%
              </div>
            )}

            {/* 分析本体 */}
            {loading ? (
              <div className="py-10 text-center text-base text-gray-400">読み込み中…</div>
            ) : active.answered === 0 ? (
              <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-8 text-center">
                <Sparkles className="w-9 h-9 text-indigo-400 mx-auto mb-2.5" />
                <p className="text-lg font-semibold text-gray-700">まだ解答記録がありません</p>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                  数問解くだけで、系（ストラテジ／マネジメント／テクノロジ）ごとの正答率と、
                  <br className="hidden md:block" />
                  「重点的に対策すべき分野」が表示されます。
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 重点対策（最弱点の中分類） */}
                {active.weakest && active.weakest.answered >= MIN_FOR_WEAK && (
                  <Link
                    href={studyHref(active.exam.id, active.weakest.category)}
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/70 px-3.5 py-3 hover:bg-red-50 transition-colors"
                  >
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-gray-500">重点対策</span>
                    <span className="font-semibold text-gray-900 text-base truncate">{active.weakest.category}</span>
                    <span className="ml-auto flex items-center gap-1 text-base font-bold text-red-600 flex-shrink-0">
                      {active.weakest.acc}%
                      <ChevronRight className="w-5 h-5" />
                    </span>
                  </Link>
                )}

                {/* 系（大分類）→ 中分類の正答率 */}
                {active.series.map((s) => {
                  const sc = accuracyColor(s.acc);
                  return (
                    <div key={s.key}>
                      {/* 系ヘッダー（集計正答率） */}
                      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-gray-100">
                        <span className="text-base md:text-lg font-bold text-gray-800">{s.label}</span>
                        <span className="flex items-baseline gap-1.5 flex-shrink-0">
                          <span className={`text-lg font-bold ${sc.text}`}>{s.acc}%</span>
                          <span className="text-sm text-gray-400">
                            {s.correct}/{s.answered}
                          </span>
                        </span>
                      </div>
                      {/* 中分類（小項目）の正答率バー */}
                      <div className="space-y-2">
                        {s.cats.map((cat) => {
                          const cc = accuracyColor(cat.acc);
                          return (
                            <Link
                              key={cat.category}
                              href={studyHref(active.exam.id, cat.category)}
                              className="block rounded-lg p-1 -m-1 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-sm md:text-base text-gray-700 leading-snug truncate">
                                  {cat.category}
                                </span>
                                <span className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className={`text-sm md:text-base font-semibold ${cc.text}`}>{cat.acc}%</span>
                                  <span className="text-xs md:text-sm text-gray-400">
                                    {cat.correct}/{cat.answered}
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-gray-300" />
                                </span>
                              </div>
                              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${cc.bar}`} style={{ width: `${cat.acc}%` }} />
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ③ さっそく解く（クイックスタート：過去問 ＋ AI予想問題） */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="text-sm font-semibold text-gray-400 mb-2.5">さっそく解く</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 左：弱点があれば弱点優先、なければ過去問（メインCTA） */}
                {active.weakest && active.weakest.answered >= MIN_FOR_WEAK ? (
                  <Link
                    href={studyHref(active.exam.id, active.weakest.category)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-base font-bold text-white shadow-md shadow-indigo-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    <Target className="w-5 h-5" />
                    弱点分野から解く
                  </Link>
                ) : (
                  <Link
                    href={`/exam/${active.exam.id}/past`}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-base font-bold text-white shadow-md shadow-indigo-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    <BookOpen className="w-5 h-5" />
                    IPA公式の過去問を解く
                  </Link>
                )}
                {/* 右：AIが作る予想問題 */}
                <Link
                  href={`/exam/${active.exam.id}/ai`}
                  className="flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3.5 text-base font-bold text-amber-700 shadow-rich hover:bg-amber-100 hover:-translate-y-0.5 transition-all"
                >
                  <Zap className="w-5 h-5" />
                  AIが作る予想問題を解く
                </Link>
              </div>
              <Link
                href={`/exam/${active.exam.id}`}
                className="mt-2.5 flex items-center justify-center gap-1 text-sm font-semibold text-gray-400 hover:text-indigo-600 transition-colors"
              >
                すべての演習メニュー（年度別・出題範囲など）
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
