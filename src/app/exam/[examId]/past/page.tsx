"use client";

import { useState, useEffect, useCallback } from "react";
import { getExam, sectionLabel, displayCategory, questionCategoriesFor, TRACK_SOURCES } from "@/lib/exams";
import { setActiveExamStorage } from "@/lib/streak";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { fetchAllRows, fetchByIdsChunked } from "@/lib/supabase-fetch";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ChevronRight,
  BookOpen,
  Shuffle,
  Layers,
  RotateCcw,
  Timer,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import QuizRunner, { type Question } from "@/components/quiz-runner";
import { BackToDashboard } from "@/components/back-to-dashboard";

type Mode = "year" | "random" | "category" | "wrong" | "exam" | "ai";

const RANDOM_COUNT = 20;
const CATEGORY_COUNT = 20;

// 年度ラベルを新しい順に並べるためのソートキー。
// 「令和8年度」（期なし・ITパスポートのCBT）、「平成23年度 特別」（震災特別試験）にも対応。
function yearSortKey(y: string): number {
  const m = y.match(/(令和|平成)(元|\d+)年度(?:\s*(春期|秋期|特別))?/);
  if (!m) return 0;
  const n = m[2] === "元" ? 1 : parseInt(m[2], 10);
  // 絶対年に変換（令和元=2019, 平成30=2018, 平成31=2019）して時系列で比較できるようにする
  const absYear = m[1] === "令和" ? 2018 + n : 1988 + n;
  // 同一年度内の時系列: 春期(4月) < 特別(夏) < 秋期(10月) < 期なし(通年＝年度代表として最新扱い)
  const season = m[3] === "春期" ? 1 : m[3] === "特別" ? 2 : m[3] === "秋期" ? 3 : 4;
  return absYear * 10 + season;
}

// 模試の制限時間（分）。IP=120分/100問・FE科目A=90分/60問・AP午前=150分/80問・午前Ⅰ=50分/30問・高度午前Ⅱ=40分/25問
const EXAM_MINUTES: Record<string, number> = { ip: 120, fe: 90, ap: 150, am1: 50 };
function examMinutes(examId: string): number {
  return EXAM_MINUTES[examId] ?? 40;
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
  { key: "year", title: "年度別（問1順）", desc: "年度を選んで問1から順に解く", icon: BookOpen, color: "border-indigo-200", iconBg: "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/30" },
  { key: "random", title: "ランダム", desc: `全年度から${RANDOM_COUNT}問をシャッフル出題`, icon: Shuffle, color: "border-sky-200", iconBg: "bg-gradient-to-br from-sky-500 to-sky-600 shadow-md shadow-sky-500/30" },
  { key: "category", title: "分野別", desc: "苦手な分野をまとめて演習", icon: Layers, color: "border-violet-200", iconBg: "bg-gradient-to-br from-violet-500 to-violet-600 shadow-md shadow-violet-500/30" },
  { key: "wrong", title: "誤答復習", desc: "過去に間違えた問題だけ再挑戦", icon: RotateCcw, color: "border-rose-200", iconBg: "bg-gradient-to-br from-rose-500 to-rose-600 shadow-md shadow-rose-500/30" },
  { key: "exam", title: "模試（タイマー）", desc: "年度を選んで本番形式・制限時間で挑戦", icon: Timer, color: "border-amber-200", iconBg: "bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/30" },
  { key: "ai", title: "AI予想問題", desc: "IPAシラバスからAIが生成した予想問題を解く", icon: Brain, color: "border-yellow-200", iconBg: "bg-gradient-to-br from-yellow-400 to-orange-400 shadow-md shadow-yellow-400/30" },
];

export default function PastExamPage() {
  const params = useParams();
  const router = useRouter();
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

  // 2027新試験は構成元試験の過去問を横断出題する（それ以外は自分のexam_idのみ）
  const isTrack = !!TRACK_SOURCES[examId];
  // 2027新試験は構成元試験の過去問を横断出題。?subject=a1 のときは
  // 科目A-1（共通知識）＝応用情報 午前＋高度 午前Ⅰ を出題ソースにする
  const isA1 = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("subject") === "a1";
  const srcIds = () => {
    // 科目A-1は「応用情報 午前」の過去問をそのまま使う（年度別・模試も応用情報の枠組みで成立させる）
    return isTrack && isA1() ? ["ap"] : TRACK_SOURCES[examId] ?? [examId];
  };
  const [subjectA1, setSubjectA1] = useState(false);

  // 年度選択画面に入るときに年度一覧を取得（target: 年度別演習 or 模試）
  const enterYearSelect = async (target: "year" | "exam") => {
    setYearTarget(target);
    setView("year");
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    // DB側で集計（1000行上限の影響を受けない）
    const { data } = isTrack
      ? await supabase.rpc("get_past_year_counts_multi", { p_exam_ids: srcIds() })
      : await supabase.rpc("get_past_year_counts", { p_exam_id: examId });
    if (data) {
      const counts: Record<string, number> = {};
      (data as { year: string; n: number }[]).forEach((r) => {
        counts[r.year] = r.n;
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
    // DB側で集計（1000行上限の影響を受けない）
    const { data } = isTrack
      ? await supabase.rpc("get_past_category_counts_multi", { p_exam_ids: srcIds() })
      : await supabase.rpc("get_past_category_counts", { p_exam_id: examId });
    if (data) {
      const list = (data as { category: string; n: number }[])
        .map((r) => ({ name: r.category, count: r.n }))
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
      .in("exam_id", srcIds())
      .eq("year", year)
      .eq("type", "past")
      .order("q_number");
    setLoading(false);
    startQuiz((data as Question[]) ?? [], "年度別演習", year);
  };

  // ランダム: 全年度からDB側で抽選してN問（1000行上限の影響を受けず、全問題が母集団になる）
  const startRandom = async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = isTrack
      ? await supabase.rpc("get_random_past_questions_multi", { p_exam_ids: srcIds(), p_count: RANDOM_COUNT })
      : await supabase.rpc("get_random_past_questions", { p_exam_id: examId, p_count: RANDOM_COUNT });
    setLoading(false);
    const picked = (data as Question[]) ?? [];
    startQuiz(picked, "ランダム演習", `${exam?.name} ・ ${picked.length}問`);
  };

  // 自分の誤答問題IDを全件取得（1000行超でもページングで取り切る）
  const fetchWrongIds = async (supabase: ReturnType<typeof createSupabaseBrowserClient>, userId: string) => {
    const prog = await fetchAllRows<{ question_id: string }>((from, to) =>
      supabase
        .from("user_progress")
        .select("question_id")
        .eq("user_id", userId)
        .eq("exam_id", examId)
        .eq("is_correct", false)
        .order("answered_at", { ascending: false })
        .range(from, to)
    );
    return [...new Set(prog.map((p) => p.question_id))];
  };

  // 分野別: 選んだカテゴリからシャッフルしてN問
  // カテゴリは「学習する」の統合分野名でも良い（questionCategoriesForで中分類に展開）
  const startCategory = async (category: string) => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const data = await fetchAllRows<Question>((from, to) =>
      supabase
        .from("questions")
        .select("*")
        .in("exam_id", srcIds())
        .eq("type", "past")
        .in("category", questionCategoriesFor(examId, category))
        .order("id")
        .range(from, to)
    );
    setLoading(false);
    const picked = shuffle(data).slice(0, CATEGORY_COUNT);
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
      wrongIds = await fetchWrongIds(supabase, user.id);
    }
    const data = await fetchAllRows<Question>((from, to) =>
      supabase
        .from("questions")
        .select("*")
        .in("exam_id", srcIds())
        .eq("type", "past")
        .in("category", questionCategoriesFor(examId, category))
        .order("id")
        .range(from, to)
    );
    setLoading(false);
    const set = new Set(wrongIds);
    const picked = shuffle(data.filter((q) => set.has(q.id)));
    startQuiz(picked, "誤答を解き直す", `${displayCategory(examId, category)} ・ 間違えた問題`);
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
    const ids = await fetchWrongIds(supabase, user.id);
    if (ids.length === 0) {
      setLoading(false);
      startQuiz([], "誤答復習");
      return;
    }
    // IDが多くてもチャンク分割で取り切る
    const data = await fetchByIdsChunked<Question>(
      (chunk) => supabase.from("questions").select("*").eq("type", "past").in("id", chunk),
      ids
    );
    setLoading(false);
    startQuiz(shuffle(data), "誤答復習", `${exam?.name} ・ 間違えた問題`);
  };

  // 模試: 選んだ年度を問1順・制限時間つき
  const startExamForYear = async (year: string) => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("questions")
      .select("*")
      .in("exam_id", srcIds())
      .eq("year", year)
      .eq("type", "past")
      .order("q_number");
    setLoading(false);
    // 制限時間は本番準拠（IP=120分/FE科目A=90分/AP午前=150分/午前Ⅰ=50分/高度午前Ⅱ=40分）
    // 科目A-1（応用情報 午前そのまま）は応用情報準拠の150分にする
    const timer = examMinutes(isTrack && isA1() ? "ap" : examId) * 60;
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
      case "ai":
        return router.push(`/exam/${examId}/ai`);
    }
  };

  // このページで見ている試験を「選択中の試験」として保存し、他ページへ引き継ぐ
  useEffect(() => {
    if (getExam(examId)) setActiveExamStorage(examId);
  }, [examId]);

  useEffect(() => {
    // 学習分析などから ?mode=category&category=... で来たら、その分野演習を直接開始
    const sp = new URLSearchParams(window.location.search);
    setSubjectA1(sp.get("subject") === "a1"); // 見出し表示用（出題ソースはsrcIds()が都度URLを読む）
    const modeParam = sp.get("mode");
    if (modeParam === "category" && sp.get("category")) {
      const cat = sp.get("category") as string;
      if (sp.get("wrong") === "1") {
        startCategoryWrong(cat);
      } else {
        startCategory(cat);
      }
    } else if (modeParam && ["year", "random", "category", "wrong", "exam", "ai"].includes(modeParam)) {
      // 学習ハブの「問題演習」カード等から ?mode=year|random|category|wrong|exam|ai で直接そのモードへ
      onSelectMode(modeParam as Mode);
    } else {
      setView("hub");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  // 見出し用の科目ラベル（A-1モードのときは共通知識と明記）
  const secLabel = isTrack && subjectA1 ? "科目A-1（共通知識）相当" : sectionLabel(examId);

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

  // 戻り先＝4モードハブ（学習・演習・復習）。ハブが無い高度区分のみ試験ページへ
  const hubHref = ["ip", "fe", "ap", "sc", "dm"].includes(examId) || isTrack ? `/learn/${examId}` : `/exam/${examId}`;
  const headerBack =
    view === "hub" ? (
      <Link href={hubHref} className="text-gray-400 hover:text-gray-600">
        <ArrowLeft className="w-6 h-6" />
      </Link>
    ) : (
      <button onClick={() => setView("hub")} className="text-gray-400 hover:text-gray-600">
        <ArrowLeft className="w-6 h-6" />
      </button>
    );

  return (
    <div className="min-h-screen">
      <header className="bg-white/70 backdrop-blur-xl border-b border-gray-200/70 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          {headerBack}
          <div>
            <div className="text-sm text-gray-500">{exam.name}</div>
            <div className="font-bold text-gray-900">{examId === "dm" ? "サンプル問題演習" : "過去問演習"}</div>
          </div>
          <BackToDashboard className="ml-auto" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        {/* ハブ: モード選択 */}
        {view === "hub" && (
          <>
            <h1 className="mb-6 text-center text-2xl font-bold text-gray-900 md:text-3xl">
              {exam.name}
              {secLabel ? ` ${secLabel}` : ""} {examId === "dm" ? "サンプル問題演習" : "過去問演習"}
            </h1>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">出題モードを選んでください</h2>
              <p className="text-sm text-gray-500">
                {examId === "dm"
                  ? "IPA公表のサンプル問題（科目A・3問）から出題されます"
                  : isTrack && subjectA1
                    ? "応用情報技術者試験 午前の本物の過去問（＝科目A-1の共通知識に相当）から出題されます"
                    : `本物のIPA過去問${secLabel ? `（${secLabel}）` : ""}から出題されます`}
              </p>
            </div>
            <div className="space-y-3">
              {/* 新試験の科目A-2（横断出題）では 年度別・模試・AI を非表示
                  （年度の意味が構成元ごとに異なる／タイマー基準未確定のため）。
                  科目A-1は応用情報 午前そのままなので年度別・模試も使える（AIのみ非表示） */}
              {MODES.filter((m) => {
                // DMはサンプル問題3問のみ収録のため、年度別・模試・AIは非表示
                if (examId === "dm") return ["random", "category", "wrong"].includes(m.key);
                if (!isTrack) return true;
                if (m.key === "ai") return false;
                if (["year", "exam"].includes(m.key)) return subjectA1;
                return true;
              }).map((m) => {
                const Icon = m.icon;
                const desc = examId === "dm" && m.key === "random" ? "サンプル問題3問をシャッフル出題" : m.desc;
                return (
                  <button
                    key={m.key}
                    onClick={() => onSelectMode(m.key)}
                    disabled={loading}
                    className={`group w-full text-left border rounded-2xl p-5 bg-white/85 backdrop-blur-sm shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 ${m.color} disabled:opacity-50`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${m.iconBg} rounded-xl p-2.5 flex-shrink-0 group-hover:scale-105 transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 text-base">{m.title}</div>
                        <div className="text-sm text-gray-500">{desc}</div>
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
                  ? `選んだ年度を本番形式・制限${examMinutes(examId)}分で出題します`
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
