"use client";

// モック準拠の新ダッシュボード（フラット青）。既存 home-dashboard.tsx とは別ルートで「叩く」用。
// KPI・弱点横棒・AI大CTAは実データ。推移グラフ／最近の演習は現状サンプル（実データ接続は次工程）。

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { basicExams } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  LayoutDashboard,
  PenLine,
  FileText,
  BarChart3,
  Clock,
  Settings,
  Search,
  Bell,
  Bot,
  Sparkles,
  Target,
  ArrowRight,
  ChevronRight,
  Lock,
  Loader2,
} from "lucide-react";

// ===== フラット青パレット（モック準拠） =====
const C = {
  bg: "#F5F7FA",
  card: "#FFFFFF",
  ink: "#15202E",
  muted: "#677488",
  faint: "#9AA6B6",
  line: "#E7EBF1",
  line2: "#DDE3EC",
  brand: "#1D4ED8",
  brandDeep: "#163FB0",
  brandSoft: "#EAF0FE",
  good: "#0F8A5F",
  goodSoft: "#E3F4EC",
  warn: "#C2410C",
  warnSoft: "#FBEADF",
  bad: "#DC2626",
  badSoft: "#FBE9E9",
  std: "#8FA0B5",
  stdSoft: "#EDF1F6",
  dark: "#0E1B33",
};

type Row = { exam_id: string; category: string; answered: number; correct: number };
type Overview = { exam_id: string; total: number; ai: number };

const EXAM_TARGET: Record<string, number> = { ip: 600, fe: 600, ap: 800 };
const PASS_LINE = 65; // 合格可能性スコアの合格ライン（簡易）

// CBT(通年)＝ip/fe、固定日程＝ap。AP秋期日は暫定（設定で変更可にする予定）。
const EXAM_DATE: Record<string, string | null> = { ip: null, fe: null, ap: "2026-10-18" };

// 正答率→色分け（モック凡例: 要対策〜49 / あと一歩50-59 / 標準60-69 / 得意70+）
function band(acc: number) {
  if (acc >= 70) return { hex: C.good, soft: C.goodSoft, label: "得意" };
  if (acc >= 60) return { hex: C.std, soft: C.stdSoft, label: "標準" };
  if (acc >= 50) return { hex: C.warn, soft: C.warnSoft, label: "あと一歩" };
  return { hex: C.bad, soft: C.badSoft, label: "要対策" };
}

// 合格可能性スコア（簡易β）：正答率を主に、網羅度（解答数/目標）で割り引く
function passScore(acc: number, solved: number, target: number) {
  if (solved === 0) return 0;
  const cov = Math.min(1, solved / target);
  return Math.round(Math.min(100, acc * (0.7 + 0.3 * cov)));
}

function studyHref(examId: string, category: string) {
  return `/exam/${examId}/study?category=${encodeURIComponent(category)}`;
}

function fmtDate(dt: Date) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 連続学習日数（answered_days_jst の配列から）
function calcStreak(days: string[]): number {
  if (!days?.length) return 0;
  const set = new Set(days);
  const cur = new Date();
  if (!set.has(fmtDate(cur))) cur.setDate(cur.getDate() - 1); // 今日未回答でも継続扱い
  let s = 0;
  while (set.has(fmtDate(cur))) {
    s++;
    cur.setDate(cur.getDate() - 1);
  }
  return s;
}

// 直近7日に学習した日数
function thisWeekDays(days: string[]): number {
  if (!days?.length) return 0;
  const set = new Set(days);
  let n = 0;
  const cur = new Date();
  for (let i = 0; i < 7; i++) {
    if (set.has(fmtDate(cur))) n++;
    cur.setDate(cur.getDate() - 1);
  }
  return n;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  return diff >= 0 ? diff : null;
}

export default function DashboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [overview, setOverview] = useState<Overview[]>([]);
  const [answeredDays, setAnsweredDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState<string>(basicExams[0].id);
  const [isPremium, setIsPremium] = useState(false);
  const [name, setName] = useState<string>("");
  const [pmTab, setPmTab] = useState<"am" | "pm">("am");

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const meta = user.user_metadata ?? {};
      setName((meta.full_name as string) || (meta.name as string) || user.email?.split("@")[0] || "あなた");

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsPremium(
        sub?.status === "active" && (!sub.current_period_end || new Date(sub.current_period_end) > new Date())
      );

      const { data: statData } = await supabase.rpc("get_weakness_stats");
      setRows(
        statData
          ? (statData as Row[]).map((x) => ({ ...x, answered: Number(x.answered), correct: Number(x.correct) }))
          : []
      );

      const ovRes = await supabase.rpc("get_progress_overview");
      const ov = (ovRes.data as Overview[] | null) ?? [];
      setOverview(ov);

      const daysRes = await supabase.rpc("get_answered_days_jst");
      setAnsweredDays((daysRes.data as string[] | null) ?? []);

      // 解答が最も多い区分を初期選択に
      const byExam = basicExams
        .map((e) => ({ id: e.id, n: ov.find((o) => o.exam_id === e.id)?.total ?? 0 }))
        .sort((a, b) => b.n - a.n);
      if (byExam[0] && byExam[0].n > 0) setActiveExam(byExam[0].id);

      setLoading(false);
    })();
  }, []);

  const active = useMemo(() => {
    const exam = basicExams.find((e) => e.id === activeExam)!;
    const er = rows.filter((x) => x.exam_id === activeExam);
    const answered = er.reduce((s, x) => s + x.answered, 0);
    const correct = er.reduce((s, x) => s + x.correct, 0);
    const acc = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const cats = er
      .filter((x) => x.answered > 0)
      .map((x) => ({
        category: x.category,
        answered: x.answered,
        correct: x.correct,
        acc: Math.round((x.correct / x.answered) * 100),
      }))
      .sort((a, b) => a.acc - b.acc);
    const ov = overview.find((o) => o.exam_id === activeExam);
    const solved = ov?.total ?? 0;
    const target = EXAM_TARGET[activeExam] ?? 600;
    const score = passScore(acc, solved, target);
    return { exam, answered, correct, acc, cats, solved, target, score, top: cats[0] ?? null };
  }, [rows, overview, activeExam]);

  const streak = useMemo(() => calcStreak(answeredDays), [answeredDays]);
  const week = useMemo(() => thisWeekDays(answeredDays), [answeredDays]);
  const countdown = daysUntil(EXAM_DATE[activeExam]);
  const hasData = !loading && active.answered > 0;

  const NAV = [
    { icon: LayoutDashboard, label: "ダッシュボード", href: "/dashboard", active: true },
    { icon: PenLine, label: "午前演習", href: `/exam/${activeExam}` },
    {
      icon: FileText,
      label: "午後演習",
      href: activeExam === "ap" ? "/exam/ap/pm" : activeExam === "fe" ? "/exam/fe/b" : "/exam/ap/pm",
      pro: true,
    },
    { icon: BarChart3, label: "AI弱点分析", href: "/analysis" },
    { icon: Clock, label: "学習履歴", href: "#" },
  ];

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      <div className="grid min-h-screen" style={{ gridTemplateColumns: "236px 1fr" }}>
        {/* ===== Sidebar（モバイルは hidden） ===== */}
        <aside
          className="hidden md:flex flex-col sticky top-0 h-screen p-[18px_14px]"
          style={{ background: C.card, borderRight: `1px solid ${C.line}`, padding: "18px 14px" }}
        >
          <Link href="/" className="flex items-center gap-2.5 px-2 pb-[18px] pt-1.5">
            <span
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] font-bold text-lg text-white"
              style={{ background: C.brand, letterSpacing: "-1px" }}
            >
              ラ
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-bold">過去問演習ラボ</span>
              <span className="block text-[11px] font-normal" style={{ color: C.faint }}>
                AIと、最短で合格へ
              </span>
            </span>
          </Link>
          <nav className="mt-1.5 flex flex-col gap-0.5">
            {NAV.map((n) => (
              <Link
                key={n.label}
                href={n.href}
                className="flex items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors"
                style={
                  n.active
                    ? { background: C.brandSoft, color: C.brandDeep, fontWeight: 700 }
                    : { color: C.muted }
                }
              >
                <n.icon className="h-[18px] w-[18px]" />
                <span>{n.label}</span>
                {n.pro && (
                  <span
                    className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: C.brandSoft, color: C.brandDeep }}
                  >
                    Pro
                  </span>
                )}
              </Link>
            ))}
            <div className="px-3 pb-1.5 pt-3.5 text-[11px] font-bold tracking-wide" style={{ color: C.faint }}>
              アカウント
            </div>
            <Link
              href="/account"
              className="flex items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-sm font-medium"
              style={{ color: C.muted }}
            >
              <Settings className="h-[18px] w-[18px]" />
              設定
            </Link>
          </nav>
          {!isPremium && (
            <div className="mt-auto rounded-[14px] p-3.5 text-white" style={{ background: C.dark }}>
              <b className="text-[13px]">Pro で午後も最短合格</b>
              <p className="my-1 text-[11.5px]" style={{ color: "#A9B6CC" }}>
                記述AI採点・詳細弱点分析が使い放題
              </p>
              <Link
                href="/premium"
                className="mt-2.5 block w-full rounded-[9px] py-2.5 text-center text-[13px] font-bold text-white"
                style={{ background: C.brand }}
              >
                Proにアップグレード
              </Link>
            </div>
          )}
        </aside>

        {/* ===== Main ===== */}
        <div className="flex flex-col">
          {/* topbar */}
          <header
            className="sticky top-0 z-10 flex items-center gap-3.5 px-4 py-3.5 md:px-7"
            style={{ background: C.card, borderBottom: `1px solid ${C.line}` }}
          >
            <div
              className="flex max-w-[420px] flex-1 items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px]"
              style={{ background: C.bg, border: `1px solid ${C.line}`, color: C.faint }}
            >
              <Search className="h-4 w-4" />
              問題・分野を検索…
            </div>
            <div className="flex-1" />
            <button
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px]"
              style={{ border: `1px solid ${C.line}`, background: C.card, color: C.muted }}
              aria-label="通知"
            >
              <Bell className="h-[18px] w-[18px]" />
            </button>
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-sm font-bold"
                style={{ background: C.brandSoft, color: C.brandDeep }}
              >
                {(name || "あ").charAt(0)}
              </span>
              <span className="hidden text-[13px] font-medium sm:inline">{name || "あなた"}さん</span>
            </div>
          </header>

          <div className="w-full max-w-[1280px] px-4 py-6 md:px-7 md:pb-10">
            {/* page head */}
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold tracking-tight">こんにちは、{name || "あなた"}さん</h1>
                <p className="mt-0.5 text-[13.5px]" style={{ color: C.muted }}>
                  今日も合格に一歩近づきましょう。直近の学習からAIがおすすめを用意しました。
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex rounded-[11px] p-[3px]" style={{ background: C.card, border: `1px solid ${C.line2}` }}>
                  {basicExams.map((e) => {
                    const on = e.id === activeExam;
                    return (
                      <button
                        key={e.id}
                        onClick={() => setActiveExam(e.id)}
                        className="rounded-lg px-4 py-1.5 text-[13px] font-bold transition-colors"
                        style={on ? { background: C.brand, color: "#fff" } : { color: C.muted }}
                      >
                        {e.shortName}
                      </button>
                    );
                  })}
                </div>
                <div
                  className="flex items-center gap-2 rounded-[11px] px-3.5 py-2 text-white"
                  style={{ background: C.dark }}
                >
                  {countdown != null ? (
                    <div className="leading-tight">
                      <span className="text-[11px]" style={{ color: "#A9B6CC" }}>
                        本番まで
                      </span>
                      <br />
                      <b className="text-[18px]">あと{countdown}日</b>
                    </div>
                  ) : (
                    <div className="leading-tight">
                      <span className="text-[11px]" style={{ color: "#A9B6CC" }}>
                        受験方式
                      </span>
                      <br />
                      <b className="text-[14px]">通年（CBT）</b>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* KPI */}
            <div className="mb-[18px] grid grid-cols-2 gap-4 lg:grid-cols-4">
              {/* 合格可能性スコア */}
              <div className="rounded-[14px] p-[18px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="text-[12.5px] font-medium" style={{ color: C.muted }}>
                  合格可能性スコア
                </div>
                <div className="mt-2.5 flex items-center gap-3.5">
                  <div className="relative h-[78px] w-[78px] flex-none">
                    <svg viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#EDF1F6" strokeWidth="10" />
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        fill="none"
                        stroke={C.brand}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 34}
                        strokeDashoffset={2 * Math.PI * 34 * (1 - active.score / 100)}
                        transform="rotate(-90 40 40)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <b className="text-[23px] leading-none">{loading ? "–" : active.score}</b>
                      <span className="text-[9.5px]" style={{ color: C.muted }}>
                        / 100
                      </span>
                    </div>
                  </div>
                  <div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={
                        active.score >= PASS_LINE
                          ? { background: C.goodSoft, color: C.good }
                          : { background: C.warnSoft, color: C.warn }
                      }
                    >
                      {active.score >= PASS_LINE ? "合格圏" : "あと少し"}
                    </span>
                    <div className="mt-2 text-[12px]" style={{ color: C.muted }}>
                      合格ライン <b style={{ color: C.ink }}>{PASS_LINE}</b>
                    </div>
                  </div>
                </div>
              </div>

              {/* 連続学習日数 */}
              <div className="rounded-[14px] p-[18px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="text-[12.5px] font-medium" style={{ color: C.muted }}>
                  連続学習日数
                </div>
                <div className="mt-2.5 flex items-center gap-3.5">
                  <span
                    className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-xl text-[24px]"
                    style={{ background: C.warnSoft }}
                  >
                    🔥
                  </span>
                  <div>
                    <div className="text-[30px] font-bold leading-none tracking-tight">
                      {streak}
                      <small className="text-sm font-medium" style={{ color: C.muted }}>
                        {" "}
                        日
                      </small>
                    </div>
                    <div className="mt-2 text-[12px]" style={{ color: C.good }}>
                      今週 {week} / 7 日 達成
                    </div>
                  </div>
                </div>
              </div>

              {/* 累計演習数 */}
              <div className="rounded-[14px] p-[18px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="text-[12.5px] font-medium" style={{ color: C.muted }}>
                  累計演習数
                </div>
                <div className="mt-2.5 flex items-center gap-3.5">
                  <span
                    className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-xl"
                    style={{ background: C.brandSoft, color: C.brandDeep }}
                  >
                    <PenLine className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-[30px] font-bold leading-none tracking-tight">
                      {loading ? "–" : active.solved.toLocaleString()}
                      <small className="text-sm font-medium" style={{ color: C.muted }}>
                        {" "}
                        問
                      </small>
                    </div>
                    <div className="mt-2 text-[12px]" style={{ color: C.muted }}>
                      {active.exam.shortName} の累計
                    </div>
                  </div>
                </div>
              </div>

              {/* 平均正答率 */}
              <div className="rounded-[14px] p-[18px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="text-[12.5px] font-medium" style={{ color: C.muted }}>
                  平均正答率
                </div>
                <div className="mt-2.5 flex items-center gap-3.5">
                  <span
                    className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-xl text-[22px]"
                    style={{ background: C.goodSoft, color: C.good }}
                  >
                    ◎
                  </span>
                  <div>
                    <div className="text-[30px] font-bold leading-none tracking-tight">
                      {loading ? "–" : active.acc}
                      <small className="text-sm font-medium" style={{ color: C.muted }}>
                        {" "}
                        %
                      </small>
                    </div>
                    <div className="mt-2 text-[12px]" style={{ color: C.muted }}>
                      {active.answered.toLocaleString()}問で算出
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* next action */}
            <div
              className="mb-[18px] flex flex-col items-start gap-4 rounded-[14px] p-4 sm:flex-row sm:items-center sm:px-5"
              style={{ background: C.brandSoft, border: "1px solid #CFE0FB" }}
            >
              <span
                className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-xl text-white"
                style={{ background: C.brand }}
              >
                <Bot className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <div className="text-[11px] font-bold tracking-wide" style={{ color: C.brandDeep }}>
                  AIからの今日のおすすめ
                </div>
                {hasData && active.top ? (
                  <>
                    <div className="mt-0.5 text-[15px] font-bold">
                      弱点の <span style={{ color: C.bad }}>「{active.top.category}」</span> を重点演習しましょう
                    </div>
                    <div className="mt-0.5 text-[12.5px]" style={{ color: C.muted }}>
                      正答率 {active.top.acc}% 。集中演習で底上げが見込めます。
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-0.5 text-[15px] font-bold">まずは1問、解いてみましょう</div>
                    <div className="mt-0.5 text-[12.5px]" style={{ color: C.muted }}>
                      解くと、ここにAIがあなた専用のおすすめを表示します。
                    </div>
                  </>
                )}
              </div>
              <Link
                href={hasData && active.top ? studyHref(activeExam, active.top.category) : `/challenge/${activeExam}`}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-[11px] px-5 py-3 text-[13.5px] font-bold text-white"
                style={{ background: C.brand }}
              >
                {hasData && active.top ? `「${active.top.category}」を演習` : "まず解いてみる"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* two columns */}
            <div className="grid gap-[18px] lg:grid-cols-[1.35fr_1fr]">
              {/* weakness bars */}
              <div className="rounded-[14px] p-[18px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[15.5px] font-bold">AI弱点分析 — 分野別正答率</h2>
                  <div className="flex gap-1">
                    {(["am", "pm"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setPmTab(t)}
                        className="rounded-lg px-3 py-1.5 text-[12px] font-bold"
                        style={
                          pmTab === t
                            ? { background: C.dark, color: "#fff" }
                            : { background: C.card, color: C.muted, border: `1px solid ${C.line2}` }
                        }
                      >
                        {t === "am" ? "午前" : "午後"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-1 text-[11.5px]" style={{ color: C.faint }}>
                  正答率の低い分野から表示。クリックでその分野を演習できます。
                </div>

                {pmTab === "pm" ? (
                  <div
                    className="mt-4 flex flex-col items-center justify-center rounded-xl px-4 py-10 text-center"
                    style={{ background: C.bg, border: `1px dashed ${C.line2}` }}
                  >
                    <Lock className="mb-2 h-6 w-6" style={{ color: C.faint }} />
                    <p className="text-[13px] font-bold">午後（記述）の分析は Pro 機能です</p>
                    <Link href="/premium" className="mt-2 text-[12px] font-bold" style={{ color: C.brand }}>
                      Proを見る →
                    </Link>
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center gap-2 py-14" style={{ color: C.faint }}>
                    <Loader2 className="h-5 w-5 animate-spin" /> 読み込み中…
                  </div>
                ) : active.cats.length === 0 ? (
                  <div
                    className="mt-4 rounded-xl px-4 py-10 text-center"
                    style={{ background: C.bg, border: `1px dashed ${C.line2}` }}
                  >
                    <p className="text-[14px] font-bold">まだデータがありません</p>
                    <p className="mt-1 text-[12.5px]" style={{ color: C.muted }}>
                      何問か解くと、ここに分野別の弱点が表示されます。
                    </p>
                    <Link
                      href={`/challenge/${activeExam}`}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-[11px] px-5 py-2.5 text-[13px] font-bold text-white"
                      style={{ background: C.brand }}
                    >
                      まず解いてみる <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="mt-3.5 flex flex-col gap-3">
                      {active.cats.slice(0, 8).map((c) => {
                        const b = band(c.acc);
                        return (
                          <Link key={c.category} href={studyHref(activeExam, c.category)} className="group block">
                            <div className="mb-1.5 flex items-center justify-between text-[13px]">
                              <span className="flex items-center gap-2 font-medium">
                                <span className="h-[7px] w-[7px] rounded-full" style={{ background: b.hex }} />
                                {c.category}
                                <span
                                  className="ml-1 text-[11px] font-bold opacity-0 transition-opacity group-hover:opacity-100"
                                  style={{ color: C.brand }}
                                >
                                  演習する →
                                </span>
                              </span>
                              <span className="font-bold tabular-nums" style={{ color: b.hex }}>
                                {c.acc}%
                              </span>
                            </div>
                            <div className="h-[9px] overflow-hidden rounded-md" style={{ background: "#EDF1F6" }}>
                              <div className="h-full rounded-md" style={{ width: `${c.acc}%`, background: b.hex }} />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                    <div
                      className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t pt-3.5 text-[11.5px]"
                      style={{ color: C.muted, borderColor: C.line }}
                    >
                      {[
                        { c: C.bad, t: "要対策 (〜49%)" },
                        { c: C.warn, t: "あと一歩 (50〜59%)" },
                        { c: C.std, t: "標準 (60〜69%)" },
                        { c: C.good, t: "得意 (70%〜)" },
                      ].map((l) => (
                        <span key={l.t} className="flex items-center gap-1.5">
                          <i className="h-[9px] w-[9px] rounded-[3px]" style={{ background: l.c, display: "inline-block" }} />
                          {l.t}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* right: trend + history（現状サンプル） */}
              <div className="flex flex-col gap-[18px]">
                <div className="rounded-[14px] p-[18px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-[15.5px] font-bold">正答率の推移</h2>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: C.warnSoft, color: C.warn }}
                    >
                      サンプル
                    </span>
                  </div>
                  <svg viewBox="0 0 320 150" preserveAspectRatio="none" className="mt-2 h-[150px] w-full">
                    <line x1="0" y1="30" x2="320" y2="30" stroke="#EDF1F6" />
                    <line x1="0" y1="70" x2="320" y2="70" stroke="#EDF1F6" />
                    <line x1="0" y1="110" x2="320" y2="110" stroke="#EDF1F6" />
                    <polyline
                      fill="none"
                      stroke={C.brand}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points="6,108 50,100 94,92 138,95 182,82 226,72 270,66 314,58"
                    />
                    <polygon fill={C.brand} opacity="0.07" points="6,108 50,100 94,92 138,95 182,82 226,72 270,66 314,58 314,150 6,150" />
                    <circle cx="314" cy="58" r="4" fill={C.brand} />
                  </svg>
                  <div className="mt-2 text-[11px]" style={{ color: C.faint }}>
                    ※ 推移は実データ接続を次の工程で実装します（直近8週・サンプル表示）。
                  </div>
                </div>

                <div className="rounded-[14px] p-[18px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-[15.5px] font-bold">最近の演習</h2>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: C.warnSoft, color: C.warn }}
                    >
                      サンプル
                    </span>
                  </div>
                  <div className="mt-2">
                    {[
                      { tag: "午前", cat: "セキュリティ", sub: "8 / 10 問 正解", sc: "80%", scc: C.good, t: "今日 14:30" },
                      { tag: "午後", cat: "設問2 データベース", sub: "AI採点「正規化は的確。可用性の考慮が不足」", sc: "18/25", scc: C.ink, t: "昨日 22:10" },
                      { tag: "午前", cat: "ネットワーク", sub: "4 / 10 問 正解", sc: "40%", scc: C.bad, t: "昨日 08:00" },
                    ].map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 py-2.5"
                        style={{ borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}
                      >
                        <span
                          className="flex-none rounded-md px-2 py-0.5 text-[10.5px] font-bold"
                          style={
                            h.tag === "午前"
                              ? { background: C.brandSoft, color: C.brandDeep }
                              : { background: "#EEE9FB", color: "#5B3FB0" }
                          }
                        >
                          {h.tag}
                        </span>
                        <div className="min-w-0 flex-1">
                          <b className="text-[13px] font-medium">{h.cat}</b>
                          <p className="truncate text-[11.5px]" style={{ color: C.muted }}>
                            {h.sub}
                          </p>
                        </div>
                        <span className="flex-none text-[13.5px] font-bold tabular-nums" style={{ color: h.scc }}>
                          {h.sc}
                        </span>
                        <span className="w-[74px] flex-none text-right text-[11px]" style={{ color: C.faint }}>
                          {h.t}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-[11px]" style={{ color: C.faint }}>
              新ダッシュボード（試作・フラット青）。既存ダッシュボードは <Link href="/" className="underline">ホーム</Link> から利用できます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
