"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { basicExams } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Target,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Zap,
} from "lucide-react";

type Row = { exam_id: string; category: string; answered: number; correct: number };
type Progress = { exam_id: string; year: string; is_correct: boolean; answered_at: string };

const MIN_FOR_WEAK = 3; // 弱点TOP判定に必要な最低解答数

// 合格に向けた「解くべき過去問」の目安（リサーチ準拠）
const EXAM_TARGET: Record<string, number> = { ip: 600, fe: 600, ap: 800 };
const EXAM_TARGET_NOTE: Record<string, string> = {
  ip: "合格目安：過去問 約6回分（600問）",
  fe: "合格目安：科目A 約10回分（600問）",
  ap: "合格目安：午前 約10回分（800問）",
};

function accuracyColor(acc: number): { text: string; bar: string } {
  if (acc >= 70) return { text: "text-green-600", bar: "bg-green-500" };
  if (acc >= 40) return { text: "text-yellow-600", bar: "bg-yellow-500" };
  return { text: "text-red-600", bar: "bg-red-500" };
}
function accHex(acc: number): string {
  if (acc >= 70) return "#16a34a";
  if (acc >= 40) return "#ca8a04";
  return "#dc2626";
}

function studyHref(examId: string, category: string) {
  return `/exam/${examId}/study?category=${encodeURIComponent(category)}`;
}

// IPAシラバスの3大分類（系）。中分類→系のマッピング。
const SERIES = [
  { key: "strategy", label: "ストラテジ系" },
  { key: "management", label: "マネジメント系" },
  { key: "technology", label: "テクノロジ系" },
  { key: "other", label: "その他" },
] as const;

type SeriesKey = "strategy" | "management" | "technology" | "other";

const SERIES_OF: Record<string, SeriesKey> = {
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
  プロジェクトマネジメント: "management",
  サービスマネジメント: "management",
  システム監査: "management",
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

type RadarItem = { label: string; acc: number; answered: number };

// 各系に属する中分類（全23分類・固定軸。未回答は「—」で表示する）
const SERIES_CATEGORIES: Record<SeriesKey, string[]> = {
  technology: [
    "基礎理論",
    "アルゴリズムとプログラミング",
    "コンピュータ構成要素",
    "システム構成要素",
    "ソフトウェア",
    "ハードウェア",
    "ユーザーインタフェース",
    "情報メディア",
    "データベース",
    "ネットワーク",
    "セキュリティ",
    "システム開発技術",
    "ソフトウェア開発管理技術",
  ],
  management: ["プロジェクトマネジメント", "サービスマネジメント", "システム監査"],
  strategy: [
    "システム戦略",
    "システム企画",
    "経営戦略マネジメント",
    "技術戦略マネジメント",
    "ビジネスインダストリ",
    "企業活動",
    "法務",
  ],
  other: [],
};

// レーダーの軸ラベルは長いと潰れるので短縮名を使う
const SHORT_LABEL: Record<string, string> = {
  アルゴリズムとプログラミング: "アルゴリズム",
  コンピュータ構成要素: "コンピュータ",
  システム構成要素: "システム構成",
  ユーザーインタフェース: "UI",
  ソフトウェア開発管理技術: "SW開発管理",
  システム開発技術: "開発技術",
  経営戦略マネジメント: "経営戦略",
  技術戦略マネジメント: "技術戦略",
  ビジネスインダストリ: "ビジネス",
  プロジェクトマネジメント: "PM",
  サービスマネジメント: "サービス",
  システム監査: "監査",
  情報メディア: "メディア",
};
function shortLabel(s: string) {
  return SHORT_LABEL[s] ?? s;
}

// 汎用レーダー（N軸・扁平対応 rx≠ry・未回答は「—」）
function Radar({
  items,
  w,
  h,
  cx,
  cy,
  rx,
  ry,
  maxW,
  labelFont = 12,
  valueFont = 13,
}: {
  items: RadarItem[];
  w: number;
  h: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  maxW: number;
  labelFont?: number;
  valueFont?: number;
}) {
  const n = items.length;
  const axes = items.map((v, i) => {
    const rad = ((-90 + (i * 360) / n) * Math.PI) / 180;
    return { ...v, cos: Math.cos(rad), sin: Math.sin(rad) };
  });
  const pt = (cos: number, sin: number, frac: number): [number, number] => [
    cx + rx * frac * cos,
    cy + ry * frac * sin,
  ];
  const ring = (frac: number) => axes.map((a) => pt(a.cos, a.sin, frac).join(",")).join(" ");
  const dataPoly = axes
    .map((a) => pt(a.cos, a.sin, Math.max(0.02, a.acc / 100)).join(","))
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full mx-auto" style={{ maxWidth: maxW, overflow: "visible" }}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="#e5e7eb" strokeWidth={1} />
      ))}
      {axes.map((a, i) => {
        const [x, y] = pt(a.cos, a.sin, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={1} />;
      })}
      <polygon points={dataPoly} fill="rgba(99,102,241,0.22)" stroke="#6366f1" strokeWidth={2} />
      {axes.map((a, i) => {
        const [x, y] = pt(a.cos, a.sin, Math.max(0.02, a.acc / 100));
        return <circle key={i} cx={x} cy={y} r={3.5} fill="#6366f1" />;
      })}
      {axes.map((a, i) => {
        const [lx, ly] = pt(a.cos, a.sin, 1.16);
        const anchor = Math.abs(a.cos) < 0.25 ? "middle" : a.cos > 0 ? "start" : "end";
        const dy = a.sin < -0.3 ? -3 : a.sin > 0.3 ? labelFont + 1 : 4;
        return (
          <g key={i}>
            <text x={lx} y={ly + dy} textAnchor={anchor} fontSize={labelFont} fontWeight="700" fill="#374151">
              {shortLabel(a.label)}
            </text>
            <text
              x={lx}
              y={ly + dy + valueFont + 3}
              textAnchor={anchor}
              fontSize={valueFont}
              fontWeight="700"
              fill={a.answered > 0 ? accHex(a.acc) : "#9ca3af"}
            >
              {a.answered > 0 ? `${a.acc}%` : "—"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function HomeDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState<string>(basicExams[0].id);
  const [showDetail, setShowDetail] = useState(false);
  const [goal, setGoal] = useState(10); // 今日の目標問題数（編集可・localStorage保存）

  // 保存済みの今日の目標を復元
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("dailyGoal");
      if (saved) {
        const n = parseInt(saved, 10);
        if (n >= 1) setGoal(n);
      }
    } catch {
      /* noop */
    }
  }, []);

  function updateGoal(v: string) {
    const n = Math.max(1, Math.min(500, parseInt(v || "0", 10) || 1));
    setGoal(n);
    try {
      window.localStorage.setItem("dailyGoal", String(n));
    } catch {
      /* noop */
    }
  }

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

      // 解答ログ（過去問/AIの判別・解答数・今日の進捗に使用）
      const { data: progData } = await supabase
        .from("user_progress")
        .select("exam_id, year, is_correct, answered_at")
        .eq("user_id", user.id);
      const p = (progData as Progress[] | null) ?? [];
      setProgress(p);

      // 解答数が最も多いメイン区分を初期選択に
      const basicIds = basicExams.map((e) => e.id);
      const byExam = basicIds
        .map((id) => ({ id, n: p.filter((x) => x.exam_id === id).length }))
        .sort((a, b) => b.n - a.n);
      if (byExam[0] && byExam[0].n > 0) setActiveExam(byExam[0].id);

      setLoading(false);
    }
    load();
  }, []);

  // 今日（JST）の進捗（全区分合計）
  const today = useMemo(() => {
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const dayMs = 24 * 60 * 60 * 1000;
    const startMs = Math.floor((now.getTime() + jstOffset) / dayMs) * dayMs - jstOffset;
    const todays = progress.filter((p) => new Date(p.answered_at).getTime() >= startMs);
    const answered = todays.length;
    const correct = todays.filter((p) => p.is_correct).length;
    return { answered, accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0 };
  }, [progress]);

  // 選択中区分の集計（系→中分類の階層 / レーダー / 弱点TOP3 / 過去問・AI比率）
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

    const bySeries = (key: SeriesKey) => {
      const sc = cats.filter((c) => seriesKeyOf(c.category) === key);
      const a = sc.reduce((s, c) => s + c.answered, 0);
      const cor = sc.reduce((s, c) => s + c.correct, 0);
      return { answered: a, correct: cor, acc: a > 0 ? Math.round((cor / a) * 100) : 0, cats: sc };
    };

    // 系（大分類）→中分類（詳細・折りたたみ用）
    const series = SERIES.map((s) => ({ key: s.key, label: s.label, ...bySeries(s.key) }))
      .filter((s) => s.answered > 0)
      .sort((a, b) => a.acc - b.acc);

    // メインレーダー：上=マネジメント / 右下=ストラテジ / 左下=テクノロジ
    const t = bySeries("technology");
    const m = bySeries("management");
    const st = bySeries("strategy");
    const radar: RadarItem[] = [
      { label: "マネジメント", acc: m.acc, answered: m.answered },
      { label: "ストラテジ", acc: st.acc, answered: st.answered },
      { label: "テクノロジ", acc: t.acc, answered: t.answered },
    ];

    // 系ごとの内訳レーダー（その系の全中分類を固定軸に。未回答は0/—）
    const catByName = new Map(cats.map((c) => [c.category, c]));
    const seriesRadars = (
      [
        { key: "technology" as SeriesKey, label: "テクノロジ系", d: t },
        { key: "management" as SeriesKey, label: "マネジメント系", d: m },
        { key: "strategy" as SeriesKey, label: "ストラテジ系", d: st },
      ]
    ).map((s) => ({
      key: s.key,
      label: s.label,
      acc: s.d.acc,
      answered: s.d.answered,
      items: SERIES_CATEGORIES[s.key].map((cat) => {
        const c = catByName.get(cat);
        return { label: cat, acc: c?.acc ?? 0, answered: c?.answered ?? 0 } as RadarItem;
      }),
    }));

    // 弱点TOP3（最低解答数を満たすもののうち低正答率順）
    const top3 = cats.filter((c) => c.answered >= MIN_FOR_WEAK).slice(0, 3);

    // 過去問 / AI の内訳 と 目標
    const exProg = progress.filter((p) => p.exam_id === activeExam);
    const solved = exProg.length;
    const aiSolved = exProg.filter((p) => p.year === "AI生成").length;
    const pastSolved = solved - aiSolved;
    const target = EXAM_TARGET[activeExam] ?? 600;

    return {
      exam,
      answered,
      acc,
      cats,
      series,
      radar,
      seriesRadars,
      top3,
      solved,
      aiSolved,
      pastSolved,
      target,
    };
  }, [rows, progress, activeExam]);

  const goalPct = Math.min(100, goal > 0 ? (today.answered / goal) * 100 : 0);
  const goalReached = today.answered >= goal;

  const hasData = !loading && active.answered > 0;
  const denom = Math.max(active.target, active.solved, 1);
  const pastPct = (active.pastSolved / denom) * 100;
  const aiPct = (active.aiSolved / denom) * 100;
  const remain = Math.max(0, active.target - active.solved);

  return (
    <div className="space-y-4">
      {/* 今日の目標（全区分・編集可・解いた数でバーが左いっぱいまで進む） */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm px-4 py-3 shadow-rich">
        <span className="text-sm font-bold text-gray-500 whitespace-nowrap">
          今日の目標 <span className="font-normal text-gray-400">全区分</span>
        </span>
        <span className="flex items-baseline gap-1 whitespace-nowrap">
          <span className={`text-xl font-bold leading-none ${goalReached ? "text-green-600" : "text-gray-900"}`}>
            {loading ? "-" : today.answered}
          </span>
          <span className="text-gray-300">/</span>
          <input
            type="number"
            min={1}
            max={500}
            value={goal}
            onChange={(e) => updateGoal(e.target.value)}
            aria-label="今日の目標問題数"
            className="w-12 rounded-md border border-gray-200 bg-white px-1 py-0.5 text-center text-base font-bold text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-xs text-gray-500">問</span>
        </span>
        <div className="order-last w-full md:order-none md:w-auto md:flex-1 min-w-[80px] h-3 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${goalReached ? "bg-green-500" : "bg-indigo-500"}`}
            style={{ width: `${goalPct}%` }}
          />
        </div>
        <Link
          href="/analysis"
          className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap ml-auto md:ml-0"
        >
          全区分分析
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 試験区分セレクタ（ガイド＋横並びタブ） */}
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

      {/* 選択中区分の学習分析（全幅） */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 px-0.5">
          <h3 className="text-lg md:text-xl font-bold text-gray-700 leading-tight truncate">
            {active.exam.name} の弱点分析
          </h3>
          <span className="hidden sm:inline text-sm text-gray-400 flex-shrink-0">AIが弱点を可視化</span>
          {hasData && (
            <span className={`ml-auto text-xl font-bold ${accuracyColor(active.acc).text} flex-shrink-0`}>
              {active.acc}%
            </span>
          )}
        </div>

        <Card className="border border-gray-200/70 bg-white/85 backdrop-blur-sm rounded-2xl shadow-rich overflow-hidden">
          <CardContent className="p-4 md:p-5 space-y-5">
            {/* ① 解いた問題数（過去問 / AI の内訳）＋ 目標 */}
            <div>
              <div className="flex items-end justify-between gap-2 mb-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm text-gray-500 whitespace-nowrap">解いた問題数</span>
                  <span className="text-2xl font-bold text-gray-900">{loading ? "-" : active.solved}</span>
                  <span className="text-sm text-gray-400 whitespace-nowrap">/ {active.target}問</span>
                </div>
                <span className="text-xs text-gray-400 text-right">{EXAM_TARGET_NOTE[active.exam.id]}</span>
              </div>
              <div className="h-3.5 w-full rounded-full bg-gray-100 overflow-hidden flex">
                <div className="h-full bg-indigo-500" style={{ width: `${pastPct}%` }} />
                <div className="h-full bg-amber-400" style={{ width: `${aiPct}%` }} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-gray-600">過去問 <b className="text-gray-800">{active.pastSolved}</b></span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-gray-600">AI予想 <b className="text-gray-800">{active.aiSolved}</b></span>
                </span>
                <span className="ml-auto text-gray-400">
                  {remain > 0 ? `目標まで あと${remain}問` : "目標達成 🎉"}
                </span>
              </div>
            </div>

            {/* 本体：データなし or レーダー＋弱点TOP3＋詳細 */}
            {loading ? (
              <div className="py-8 text-center text-base text-gray-400">読み込み中…</div>
            ) : !hasData ? (
              <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-8 text-center">
                <Sparkles className="w-9 h-9 text-indigo-400 mx-auto mb-2.5" />
                <p className="text-lg font-semibold text-gray-700">まだ解答記録がありません</p>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                  数問解くだけで、3系（ストラテジ／マネジメント／テクノロジ）のレーダーと、
                  <br className="hidden md:block" />
                  「対策すべき弱点TOP3」が表示されます。
                </p>
              </div>
            ) : (
              <>
                {/* ② 3系レーダー（扁平・横長） */}
                <div>
                  <div className="text-sm font-semibold text-gray-400 mb-1">系統別の到達度</div>
                  <Radar
                    items={active.radar}
                    w={460}
                    h={172}
                    cx={230}
                    cy={84}
                    rx={152}
                    ry={56}
                    maxW={520}
                    labelFont={15}
                    valueFont={16}
                  />
                </div>

                {/* ②-2 系ごとの内訳レーダー（中分類を固定軸に・未回答は「—」） */}
                <div>
                  <div className="text-sm font-semibold text-gray-400 mb-2">系統ごとの内訳（分野別）</div>
                  <div className="grid grid-cols-1 gap-3">
                    {active.seriesRadars.map((s) => {
                      const sc = accuracyColor(s.acc);
                      return (
                        <div key={s.key} className="rounded-xl border border-gray-200 bg-white p-3 md:p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-base font-bold text-gray-800">{s.label}</span>
                            <span className={`text-base font-bold ${s.answered > 0 ? sc.text : "text-gray-400"}`}>
                              {s.answered > 0 ? `${s.acc}%` : "—"}
                            </span>
                          </div>
                          <Radar
                            items={s.items}
                            w={420}
                            h={380}
                            cx={210}
                            cy={190}
                            rx={132}
                            ry={132}
                            maxW={460}
                            labelFont={13}
                            valueFont={13}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ③ 対策すべき弱点 TOP3 */}
                {active.top3.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-400 mb-2">対策すべき弱点 TOP3</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {active.top3.map((cat, i) => {
                        const cc = accuracyColor(cat.acc);
                        return (
                          <Link
                            key={cat.category}
                            href={studyHref(active.exam.id, cat.category)}
                            className="group rounded-xl border border-gray-200 bg-white p-3 shadow-rich hover:border-indigo-300 hover:-translate-y-0.5 transition-all"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                                {i + 1}
                              </span>
                              <span className={`text-lg font-bold ${cc.text}`}>{cat.acc}%</span>
                            </div>
                            <div className="font-semibold text-gray-900 text-sm leading-snug min-h-[2.5rem]">
                              {cat.category}
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1.5">
                              <div className={`h-full ${cc.bar}`} style={{ width: `${cat.acc}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-xs text-gray-400">{cat.correct}/{cat.answered}問 正解</span>
                              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-indigo-600">
                                解き直す<ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ④ 分野別の詳細（折りたたみ） */}
                <div>
                  <button
                    onClick={() => setShowDetail((v) => !v)}
                    className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <span>分野別の詳細（正答率）を{showDetail ? "閉じる" : "見る"}</span>
                    <ChevronDown className={`w-5 h-5 transition-transform ${showDetail ? "rotate-180" : ""}`} />
                  </button>

                  {showDetail && (
                    <div className="mt-3 space-y-4">
                      {active.series.map((s) => {
                        const sc = accuracyColor(s.acc);
                        return (
                          <div key={s.key}>
                            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-gray-100">
                              <span className="text-base font-bold text-gray-800">{s.label}</span>
                              <span className="flex items-baseline gap-1.5 flex-shrink-0">
                                <span className={`text-base font-bold ${sc.text}`}>{s.acc}%</span>
                                <span className="text-sm text-gray-400">{s.correct}/{s.answered}</span>
                              </span>
                            </div>
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
                                        <span className="text-xs md:text-sm text-gray-400">{cat.correct}/{cat.answered}</span>
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
                </div>
              </>
            )}

            {/* さっそく解く（過去問 ＋ AI予想問題） */}
            <div className="pt-4 border-t border-gray-100">
              <div className="text-sm font-semibold text-gray-400 mb-2.5">さっそく解く</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {active.top3.length > 0 ? (
                  <Link
                    href={studyHref(active.exam.id, active.top3[0].category)}
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
