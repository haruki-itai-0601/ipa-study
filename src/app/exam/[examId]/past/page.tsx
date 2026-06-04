"use client";

import { useState, useEffect, useCallback } from "react";
import { getExam } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ChevronRight,
  BookOpen,
  Shuffle,
  Layers,
  RotateCcw,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QuizRunner, { type Question } from "@/components/quiz-runner";

type Mode = "year" | "random" | "category" | "wrong" | "exam";

const RANDOM_COUNT = 20;
const CATEGORY_COUNT = 20;

// 年度ラベルを新しい順に並べるためのソートキー（令和元年度や春期/秋期を正しく扱う）
function yearSortKey(y: string): number {
  const m = y.match(/令和(元|\d+)年度\s*(春期|秋期)/);
  if (!m) return 0;
  const yr = m[1] === "元" ? 1 : parseInt(m[1], 10);
  const season = m[2] === "秋期" ? 2 : 1; // 同一年度では秋期を新しい扱い
  return yr * 10 + season;
}

// Fisher-Yates シャッフル
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MODES: {
  key: Mode;
  title: string;
  desc: string;
  icon: typeof BookOpen;
  color: string;
  iconBg: string;
}[] = [
  { key: "year", title: "年度別（問1順）", desc: "年度を選んで問1から順に解く", icon: BookOpen, color: "border-indigo-200 bg-indigo-50 hover:border-indigo-400", iconBg: "bg-indigo-600" },
  { key: "random", title: "ランダム", desc: `全年度から${RANDOM_COUNT}問をシャッフル出題`, icon: Shuffle, color: "border-sky-200 bg-sky-50 hover:border-sky-400", iconBg: "bg-sky-600" },
  { key: "category", title: "分野別", desc: "苦手な分野をまとめて演習", icon: Layers, color: "border-violet-200 bg-violet-50 hover:border-violet-400", iconBg: "bg-violet-600" },
  { key: "wrong", title: "誤答復習", desc: "過去に間違えた問題だけ再挑戦", icon: RotateCcw, color: "border-rose-200 bg-rose-50 hover:border-rose-400", iconBg: "bg-rose-600" },
  { key: "exam", title: "模試（タイマー）", desc: "年度を選んで本番形式・制限時間で挑戦", icon: Timer, color: "border-amber-200 bg-amber-50 hover:border-amber-400", iconBg: "bg-amber-600" },
];

export default function PastExamPage() {
  const params = useParams();
  const examId = params.examId as string;
  const exam = getExam(examId);

  // 画面: hub(モード選択) / year(年度選択) / category(分野選択) / quiz(演習)
  const [view, setView] = useState<"hub" | "year" | "category" | "quiz">("hub");
  const [loading, setLoading] = useState(false);
  // 年度選択画面が「年度別演習」用か「模試」用か
  const [yearTarget, setYearTarget] = useState<"year" | "exam">("year");

  // year/category 選択肢
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [yearCounts, setYearCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);

  // 演習データ
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizSubtitle, setQuizSubtitle] = useState<string | undefined>(undefined);
  const [quizTimer, setQuizTimer] = useState<number | undefined>(undefined);

  const backToHub = useCallback(() => {
    setView("hub");
    setQuizQuestions([]);
    setQuizTimer(undefined);
  }, []);

  const startQuiz = (questions: Question[], title: string, subtitle?: string, timer?: number) => {
    setQuizQuestions(questions);
    setQuizTitle(title);
    setQuizSubtitle(subtitle);
    setQuizTimer(timer);
    setView("quiz");
  };

  // 年度選択画面に入るときに年度一覧を取得（target: 年度別演習 or 模試）
  const enterYearSelect = async (target: "year" | "exam") => {
    setYearTarget(target);
    setView("year");
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
  };

  // 分野選択画面に入るときにカテゴリ一覧を取得
  const enterCategorySelect = async () => {
    setView("category");
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("questions")
      .select("category")
      .eq("exam_id", examId)
      .eq("type", "past");
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((q: { category: string }) => {
        counts[q.category] = (counts[q.category] || 0) + 1;
      });
      const list = Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      setCategories(list);
    }
    setLoading(false);
  };

  // 年度別: 選んだ年度を問1順で
  const startYear = async (year: string) => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("exam_id", examId)
      .eq("year", year)
      .eq("type", "past")
      .order("q_number");
    setLoading(false);
    startQuiz((data as Question[]) ?? [], "年度別演習", year);
  };

  // ランダム: 全年度からシャッフルしてN問
  const startRandom = async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("exam_id", examId)
      .eq("type", "past");
    setLoading(false);
    const picked = shuffle((data as Question[]) ?? []).slice(0, RANDOM_COUNT);
    startQuiz(picked, "ランダム演習", `${exam?.name} ・ ${picked.length}問`);
  };

  // 分野別: 選んだカテゴリからシャッフルしてN問
  const startCategory = async (category: string) => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("exam_id", examId)
      .eq("type", "past")
      .eq("category", category);
    setLoading(false);
    const picked = shuffle((data as Question[]) ?? []).slice(0, CATEGORY_COUNT);
    startQuiz(picked, "分野別演習", category);
  };

  // 分野別 × 誤答: その分野で間違えた問題だけ
  const startCategoryWrong = async (category: string) => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let wrongIds: string[] = [];
    if (user) {
      const { data: prog } = await supabase
        .from("user_progress")
        .select("question_id")
        .eq("exam_id", examId)
        .eq("is_correct", false);
      wrongIds = [...new Set((prog ?? []).map((p: { question_id: string }) => p.question_id))];
    }
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("exam_id", examId)
      .eq("type", "past")
      .eq("category", category);
    setLoading(false);
    const set = new Set(wrongIds);
    const picked = shuffle(((data as Question[]) ?? []).filter((q) => set.has(q.id)));
    startQuiz(picked, "誤答を解き直す", `${category} ・ 間違えた問題`);
  };

  // 誤答復習: 過去に間違えた問題だけ
  const startWrong = async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      startQuiz([], "誤答復習");
      return;
    }
    const { data: prog } = await supabase
      .from("user_progress")
      .select("question_id")
      .eq("exam_id", examId)
      .eq("is_correct", false);
    const ids = [...new Set((prog ?? []).map((p: { question_id: string }) => p.question_id))];
    if (ids.length === 0) {
      setLoading(false);
      startQuiz([], "誤答復習");
      return;
    }
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("type", "past")
      .in("id", ids);
    setLoading(false);
    startQuiz(shuffle((data as Question[]) ?? []), "誤答復習", `${exam?.name} ・ 間違えた問題`);
  };

  // 模試: 選んだ年度を問1順・制限時間つき
  const startExamForYear = async (year: string) => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("exam_id", examId)
      .eq("year", year)
      .eq("type", "past")
      .order("q_number");
    setLoading(false);
    // 午前Ⅰ=50分/30問、午前Ⅱ=40分/25問
    const timer = examId === "am1" ? 50 * 60 : 40 * 60;
    startQuiz((data as Question[]) ?? [], "模試", `${year} ・ 制限${timer / 60}分`, timer);
  };

  const onSelectMode = (mode: Mode) => {
    switch (mode) {
      case "year":
        return enterYearSelect("year");
      case "category":
        return enterCategorySelect();
      case "random":
        return startRandom();
      case "wrong":
        return startWrong();
      case "exam":
        return enterYearSelect("exam");
    }
  };

  useEffect(() => {
    // 学習分析などから ?mode=category&category=... で来たら、その分野演習を直接開始
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("mode") === "category" && sp.get("category")) {
      const cat = sp.get("category") as string;
      if (sp.get("wrong") === "1") {
        startCategoryWrong(cat);
      } else {
        startCategory(cat);
      }
    } else {
      setView("hub");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  if (!exam) return null;

  // 演習画面
  if (view === "quiz") {
    return (
      <QuizRunner
        examId={examId}
        questions={quizQuestions}
        title={quizTitle}
        subtitle={quizSubtitle}
        timerSeconds={quizTimer}
        onBack={backToHub}
      />
    );
  }

  const headerBack =
    view === "hub" ? (
      <Link href={`/exam/${examId}`} className="text-gray-400 hover:text-gray-600">
        <ArrowLeft className="w-6 h-6" />
      </Link>
    ) : (
      <button onClick={() => setView("hub")} className="text-gray-400 hover:text-gray-600">
        <ArrowLeft className="w-6 h-6" />
      </button>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          {headerBack}
          <div>
            <div className="text-sm text-gray-500">{exam.name}</div>
            <div className="font-bold text-gray-900">過去問演習</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        {/* ハブ: モード選択 */}
        {view === "hub" && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">出題モードを選んでください</h2>
              <p className="text-sm text-gray-500">本物のIPA過去問（午前{examId === "am1" ? "Ⅰ" : "Ⅱ"}）から出題されます</p>
            </div>
            <div className="space-y-3">
              {MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    onClick={() => onSelectMode(m.key)}
                    disabled={loading}
                    className={`w-full text-left border-2 rounded-xl p-5 transition-all duration-200 ${m.color} disabled:opacity-50`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${m.iconBg} rounded-xl p-2.5 flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 text-base">{m.title}</div>
                        <div className="text-sm text-gray-500">{m.desc}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
            {loading && <div className="text-center text-gray-400 py-6">準備中...</div>}
          </>
        )}

        {/* 年度選択 */}
        {view === "year" && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">年度を選んでください</h2>
              <p className="text-sm text-gray-500">
                {yearTarget === "exam"
                  ? `選んだ年度を本番形式・制限${examId === "am1" ? 50 : 40}分で出題します`
                  : "選んだ年度を問1から順に出題します"}
              </p>
            </div>
            {loading ? (
              <div className="text-center text-gray-400 py-12">読み込み中...</div>
            ) : (
              <div className="space-y-3">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => (yearTarget === "exam" ? startExamForYear(year) : startYear(year))}
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
          </>
        )}

        {/* 分野選択 */}
        {view === "category" && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">分野を選んでください</h2>
              <p className="text-sm text-gray-500">選んだ分野から最大{CATEGORY_COUNT}問をランダム出題</p>
            </div>
            {loading ? (
              <div className="text-center text-gray-400 py-12">読み込み中...</div>
            ) : (
              <div className="space-y-3">
                {categories.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => startCategory(c.name)}
                    className="w-full text-left bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-violet-300 hover:bg-violet-50 transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Layers className={`w-5 h-5 ${exam.textColor}`} />
                        <span className="font-semibold text-gray-900">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">{c.count}問</span>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-violet-400 transition-colors" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
